/**
 * Reports Controller
 * Generates analytical reports and secure formula-injection-safe CSV exports
 */
const db = require('../config/db');
const { generateCsv } = require('../services/csvExportService');
const { getMonthName, formatDateIndian } = require('../utils/dateUtils');
const { formatCurrency } = require('../utils/currency');

const reportController = {
  /**
   * 1. Monthly Payroll Summary Report
   */
  async getMonthlyPayrollSummary(req, res, next) {
    try {
      const { year = new Date().getFullYear(), exportCsv } = req.query;

      const sql = `
        SELECT pr.id, pr.month, pr.year, pr.status, pr.run_date,
               pr.working_days, pr.employee_count,
               pr.total_gross, pr.total_deductions, pr.total_net,
               u.username AS finalized_by_user
        FROM payroll_runs pr
        LEFT JOIN users u ON u.id = pr.finalized_by
        WHERE pr.year = ?
        ORDER BY pr.month ASC
      `;
      const [rows] = await db.query(sql, [parseInt(year, 10)]);

      const formattedRows = rows.map(r => ({
        ...r,
        month_name: getMonthName(r.month),
        formatted_gross: formatCurrency(r.total_gross),
        formatted_deductions: formatCurrency(r.total_deductions),
        formatted_net: formatCurrency(r.total_net),
        run_date_indian: formatDateIndian(r.run_date)
      }));

      if (exportCsv === 'true') {
        const headers = ['Month', 'Year', 'Status', 'Employees', 'Working Days', 'Total Gross (INR)', 'Total Deductions (INR)', 'Total Net (INR)', 'Run Date'];
        const keys = ['month_name', 'year', 'status', 'employee_count', 'working_days', 'total_gross', 'total_deductions', 'total_net', 'run_date_indian'];
        const csv = generateCsv(headers, keys, formattedRows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="Monthly_Payroll_Summary_${year}.csv"`);
        return res.send(csv);
      }

      res.json({ success: true, year: parseInt(year, 10), data: formattedRows });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 2. Department-Wise Payroll Expenditure Report
   */
  async getDepartmentExpenditure(req, res, next) {
    try {
      const { month, year, exportCsv } = req.query;
      let whereClauses = ["prun.status = 'Finalized'"];
      let params = [];

      if (month) {
        whereClauses.push('prun.month = ?');
        params.push(parseInt(month, 10));
      }
      if (year) {
        whereClauses.push('prun.year = ?');
        params.push(parseInt(year, 10));
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const sql = `
        SELECT pr.department_name,
               COUNT(pr.id) AS employee_count,
               SUM(pr.basic_salary) AS total_basic,
               SUM(pr.gross_salary) AS total_gross,
               SUM(pr.total_deductions) AS total_deductions,
               SUM(pr.net_salary) AS total_net
        FROM payroll_records pr
        INNER JOIN payroll_runs prun ON prun.id = pr.payroll_run_id
        ${whereSql}
        GROUP BY pr.department_name
        ORDER BY total_net DESC
      `;
      const [rows] = await db.query(sql, params);

      const formattedRows = rows.map(r => ({
        ...r,
        formatted_basic: formatCurrency(r.total_basic),
        formatted_gross: formatCurrency(r.total_gross),
        formatted_deductions: formatCurrency(r.total_deductions),
        formatted_net: formatCurrency(r.total_net)
      }));

      if (exportCsv === 'true') {
        const headers = ['Department', 'Employees Paid', 'Total Basic (INR)', 'Total Gross (INR)', 'Total Deductions (INR)', 'Total Net Paid (INR)'];
        const keys = ['department_name', 'employee_count', 'total_basic', 'total_gross', 'total_deductions', 'total_net'];
        const csv = generateCsv(headers, keys, formattedRows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Department_Payroll_Expenditure.csv"');
        return res.send(csv);
      }

      res.json({ success: true, data: formattedRows });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 3. Attendance Summary Report
   */
  async getAttendanceSummary(req, res, next) {
    try {
      const { departmentId, startDate, endDate, exportCsv } = req.query;
      let whereClauses = [];
      let params = [];

      if (departmentId) {
        whereClauses.push('e.department_id = ?');
        params.push(parseInt(departmentId, 10));
      }
      if (startDate) {
        whereClauses.push('a.attendance_date >= ?');
        params.push(startDate);
      }
      if (endDate) {
        whereClauses.push('a.attendance_date <= ?');
        params.push(endDate);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const sql = `
        SELECT e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
               d.name AS department_name,
               COUNT(CASE WHEN a.status = 'Present' THEN 1 END) AS present_count,
               COUNT(CASE WHEN a.status = 'Half Day' THEN 1 END) AS half_day_count,
               COUNT(CASE WHEN a.status = 'Absent' THEN 1 END) AS absent_count,
               COUNT(CASE WHEN a.status = 'On Leave' THEN 1 END) AS leave_count,
               COALESCE(SUM(a.overtime_hours), 0) AS total_overtime_hours
        FROM employees e
        INNER JOIN departments d ON d.id = e.department_id
        LEFT JOIN attendance a ON a.employee_id = e.id
        ${whereSql}
        GROUP BY e.id
        ORDER BY d.name ASC, employee_name ASC
      `;
      const [rows] = await db.query(sql, params);

      if (exportCsv === 'true') {
        const headers = ['Employee Code', 'Employee Name', 'Department', 'Present Days', 'Half Days', 'Absent Days', 'Leave Days', 'Overtime Hours'];
        const keys = ['employee_code', 'employee_name', 'department_name', 'present_count', 'half_day_count', 'absent_count', 'leave_count', 'total_overtime_hours'];
        const csv = generateCsv(headers, keys, rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Attendance_Summary_Report.csv"');
        return res.send(csv);
      }

      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  },

  /**
   * 4. Deductions Summary Report
   */
  async getDeductionsSummary(req, res, next) {
    try {
      const { month, year, exportCsv } = req.query;
      let whereClauses = ["pri.item_type = 'Deduction'", "prun.status = 'Finalized'"];
      let params = [];

      if (month) {
        whereClauses.push('prun.month = ?');
        params.push(parseInt(month, 10));
      }
      if (year) {
        whereClauses.push('prun.year = ?');
        params.push(parseInt(year, 10));
      }

      const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

      const sql = `
        SELECT pri.item_name,
               COUNT(pri.id) AS occurrences,
               SUM(pri.amount) AS total_deducted
        FROM payroll_record_items pri
        INNER JOIN payroll_records pr ON pr.id = pri.payroll_record_id
        INNER JOIN payroll_runs prun ON prun.id = pr.payroll_run_id
        ${whereSql}
        GROUP BY pri.item_name
        ORDER BY total_deducted DESC
      `;
      const [rows] = await db.query(sql, params);

      const formattedRows = rows.map(r => ({
        ...r,
        formatted_total: formatCurrency(r.total_deducted)
      }));

      if (exportCsv === 'true') {
        const headers = ['Deduction Component', 'Employees Count', 'Total Amount (INR)'];
        const keys = ['item_name', 'occurrences', 'total_deducted'];
        const csv = generateCsv(headers, keys, formattedRows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="Payroll_Deductions_Summary.csv"');
        return res.send(csv);
      }

      res.json({ success: true, data: formattedRows });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = reportController;
