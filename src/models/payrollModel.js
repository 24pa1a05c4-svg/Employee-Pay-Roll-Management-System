/**
 * Payroll Model
 * Manages payroll runs, employee records, line item snapshots, and transaction-safe finalization.
 */
const db = require('../config/db');
const { generatePayslipNumber } = require('../utils/helpers');

const payrollModel = {
  async findRunByMonthYear(month, year) {
    const sql = `
      SELECT pr.*, 
             u1.username AS creator_name,
             u2.username AS approver_name,
             u3.username AS finalizer_name
      FROM payroll_runs pr
      LEFT JOIN users u1 ON u1.id = pr.created_by
      LEFT JOIN users u2 ON u2.id = pr.approved_by
      LEFT JOIN users u3 ON u3.id = pr.finalized_by
      WHERE pr.month = ? AND pr.year = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [month, year]);
    return rows[0] || null;
  },

  async findRunById(id) {
    const sql = `
      SELECT pr.*, 
             u1.username AS creator_name,
             u2.username AS approver_name,
             u3.username AS finalizer_name
      FROM payroll_runs pr
      LEFT JOIN users u1 ON u1.id = pr.created_by
      LEFT JOIN users u2 ON u2.id = pr.approved_by
      LEFT JOIN users u3 ON u3.id = pr.finalized_by
      WHERE pr.id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async findAllRuns() {
    const sql = `
      SELECT pr.*, 
             u1.username AS creator_name,
             u2.username AS approver_name,
             u3.username AS finalizer_name
      FROM payroll_runs pr
      LEFT JOIN users u1 ON u1.id = pr.created_by
      LEFT JOIN users u2 ON u2.id = pr.approved_by
      LEFT JOIN users u3 ON u3.id = pr.finalized_by
      ORDER BY pr.year DESC, pr.month DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  },

  async findRecordsByRunId(runId) {
    const sql = `
      SELECT pr.*, e.phone, e.email, e.bank_name, e.bank_account_number, e.bank_ifsc, e.pan_number
      FROM payroll_records pr
      INNER JOIN employees e ON e.id = pr.employee_id
      WHERE pr.payroll_run_id = ?
      ORDER BY pr.employee_name ASC
    `;
    const [rows] = await db.query(sql, [runId]);
    return rows;
  },

  async findRecordById(recordId) {
    const sql = `
      SELECT pr.*, 
             prun.month, prun.year, prun.status AS run_status,
             e.phone, e.email, e.bank_name, e.bank_account_number, e.bank_ifsc, e.pan_number
      FROM payroll_records pr
      INNER JOIN payroll_runs prun ON prun.id = pr.payroll_run_id
      INNER JOIN employees e ON e.id = pr.employee_id
      WHERE pr.id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [recordId]);
    return rows[0] || null;
  },

  async findRecordByEmployeeAndPeriod(employeeId, month, year) {
    const sql = `
      SELECT pr.*, prun.month, prun.year, prun.status AS run_status
      FROM payroll_records pr
      INNER JOIN payroll_runs prun ON prun.id = pr.payroll_run_id
      WHERE pr.employee_id = ? AND prun.month = ? AND prun.year = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [employeeId, month, year]);
    return rows[0] || null;
  },

  async findEmployeeSalaryHistory(employeeId) {
    const sql = `
      SELECT pr.*, prun.month, prun.year, prun.run_date, prun.status AS run_status
      FROM payroll_records pr
      INNER JOIN payroll_runs prun ON prun.id = pr.payroll_run_id
      WHERE pr.employee_id = ? AND prun.status = 'Finalized'
      ORDER BY prun.year DESC, prun.month DESC
    `;
    const [rows] = await db.query(sql, [employeeId]);
    return rows;
  },

  async findRecordItems(recordId) {
    const sql = `
      SELECT * FROM payroll_record_items
      WHERE payroll_record_id = ?
      ORDER BY item_type DESC, id ASC
    `;
    const [rows] = await db.query(sql, [recordId]);
    return rows;
  },

  /**
   * Save or update draft payroll run with calculated records and line items
   */
  async saveDraftPayroll(runData, records) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      let runId;
      const existingRun = await this.findRunByMonthYear(runData.month, runData.year);

      if (existingRun) {
        if (existingRun.status === 'Finalized') {
          const err = new Error(`Payroll for ${runData.month}/${runData.year} is already Finalized and cannot be overwritten.`);
          err.code = 'PAYROLL_ALREADY_FINALIZED';
          throw err;
        }
        runId = existingRun.id;

        // Update run header
        const updateRunSql = `
          UPDATE payroll_runs SET
            working_days = ?, status = 'Draft', total_gross = ?,
            total_deductions = ?, total_net = ?, employee_count = ?,
            run_date = ?
          WHERE id = ?
        `;
        await conn.execute(updateRunSql, [
          runData.working_days, runData.total_gross, runData.total_deductions,
          runData.total_net, records.length, runData.run_date, runId
        ]);

        // Delete old records (they will cascade delete payroll_record_items)
        await conn.execute('DELETE FROM payroll_records WHERE payroll_run_id = ?', [runId]);
      } else {
        // Insert new run
        const insertRunSql = `
          INSERT INTO payroll_runs (
            month, year, run_date, working_days, status, total_gross,
            total_deductions, total_net, employee_count, created_by
          ) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?, ?, ?)
        `;
        const [runResult] = await conn.execute(insertRunSql, [
          runData.month, runData.year, runData.run_date, runData.working_days,
          runData.total_gross, runData.total_deductions, runData.total_net,
          records.length, runData.user_id
        ]);
        runId = runResult.insertId;
      }

      // Insert employee records and their line items
      for (const rec of records) {
        const payslipNum = generatePayslipNumber(runData.year, runData.month, rec.employee_id);
        const insertRecSql = `
          INSERT INTO payroll_records (
            payroll_run_id, employee_id, employee_code, employee_name,
            department_name, designation_title, working_days, present_days,
            paid_leave_days, unpaid_leave_days, basic_salary, gross_salary,
            total_deductions, net_salary, payment_status, payslip_number
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        `;
        const [recResult] = await conn.execute(insertRecSql, [
          runId, rec.employee_id, rec.employee_code, rec.employee_name,
          rec.department_name, rec.designation_title, rec.workingDays,
          rec.presentDays, rec.paidLeaveDays, rec.unpaidLeaveDays,
          rec.basicSalary, rec.grossSalary, rec.totalDeductions,
          rec.netSalary, payslipNum
        ]);
        const recordId = recResult.insertId;

        // Insert line items
        if (rec.lineItems && rec.lineItems.length > 0) {
          for (const item of rec.lineItems) {
            const insertItemSql = `
              INSERT INTO payroll_record_items (
                payroll_record_id, item_type, item_name, amount, is_taxable, description
              ) VALUES (?, ?, ?, ?, ?, ?)
            `;
            await conn.execute(insertItemSql, [
              recordId, item.item_type, item.item_name, item.amount,
              item.is_taxable !== undefined ? item.is_taxable : 1,
              item.description || null
            ]);
          }
        }
      }

      await conn.commit();
      return runId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Update payroll status with role authorization and audit tracking
   */
  async updateStatus(runId, status, userId, notes = null) {
    const run = await this.findRunById(runId);
    if (!run) {
      throw new Error('Payroll run not found.');
    }

    if (run.status === 'Finalized' && status !== 'Draft') {
      const err = new Error('Cannot change status of an already Finalized payroll run. Use Reversal instead.');
      err.code = 'IMMUTABLE_FINALIZED_RECORD';
      throw err;
    }

    let sql = 'UPDATE payroll_runs SET status = ?';
    let params = [status];

    if (status === 'Approved') {
      sql += ', approved_by = ?';
      params.push(userId);
    } else if (status === 'Finalized') {
      sql += ', finalized_by = ?, finalized_at = NOW()';
      params.push(userId);
    }

    if (notes) {
      sql += ', reversal_notes = ?';
      params.push(notes);
    }

    sql += ' WHERE id = ?';
    params.push(runId);

    const [result] = await db.execute(sql, params);
    return result.affectedRows > 0;
  },

  /**
   * Authorized Reversal / Adjustment workflow for Finalized Payroll
   * Reverts status to 'Draft' so modifications can be reviewed, with a permanent audit trail.
   */
  async reversePayroll(runId, userId, reversalNotes) {
    const run = await this.findRunById(runId);
    if (!run) {
      throw new Error('Payroll run not found.');
    }

    const note = `[REVERSAL by User #${userId} at ${new Date().toISOString()}]: ${reversalNotes}`;
    const sql = `
      UPDATE payroll_runs 
      SET status = 'Draft', reversal_notes = CONCAT(COALESCE(reversal_notes, ''), '\n', ?), finalized_at = NULL
      WHERE id = ?
    `;
    const [result] = await db.execute(sql, [note, runId]);
    return result.affectedRows > 0;
  }
};

module.exports = payrollModel;
