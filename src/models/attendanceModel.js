/**
 * Attendance Model
 * Handles daily attendance logging, duplicate prevention, and monthly summaries
 */
const db = require('../config/db');

const attendanceModel = {
  async findByEmployeeAndDate(employeeId, date) {
    const sql = `
      SELECT a.*, CONCAT(e.first_name, ' ', e.last_name) AS employee_name
      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      WHERE a.employee_id = ? AND a.attendance_date = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [employeeId, date]);
    return rows[0] || null;
  },

  async recordAttendance({ employee_id, attendance_date, status = 'Present', overtime_hours = 0, remarks = null }) {
    // Duplicate check
    const existing = await this.findByEmployeeAndDate(employee_id, attendance_date);
    if (existing) {
      const err = new Error(`Attendance for this employee on ${attendance_date} has already been recorded.`);
      err.code = 'DUPLICATE_ATTENDANCE';
      throw err;
    }

    const sql = `
      INSERT INTO attendance (employee_id, attendance_date, status, overtime_hours, remarks)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [employee_id, attendance_date, status, overtime_hours, remarks]);
    return result.insertId;
  },

  async updateAttendance(id, { status, overtime_hours, remarks }) {
    const sql = `
      UPDATE attendance 
      SET status = ?, overtime_hours = ?, remarks = ?
      WHERE id = ?
    `;
    const [result] = await db.execute(sql, [status, overtime_hours, remarks, id]);
    return result.affectedRows > 0;
  },

  async findAll({ employeeId = null, departmentId = null, startDate = null, endDate = null, limit = 50, offset = 0 } = {}) {
    let whereClauses = [];
    let params = [];

    if (employeeId) {
      whereClauses.push('a.employee_id = ?');
      params.push(employeeId);
    }

    if (departmentId) {
      whereClauses.push('e.department_id = ?');
      params.push(departmentId);
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
      SELECT a.id, a.employee_id, a.attendance_date, a.status, a.overtime_hours, a.remarks,
             e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             d.name AS department_name
      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      INNER JOIN departments d ON d.id = e.department_id
      ${whereSql}
      ORDER BY a.attendance_date DESC, a.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async countAll({ employeeId = null, departmentId = null, startDate = null, endDate = null } = {}) {
    let whereClauses = [];
    let params = [];

    if (employeeId) {
      whereClauses.push('a.employee_id = ?');
      params.push(employeeId);
    }

    if (departmentId) {
      whereClauses.push('e.department_id = ?');
      params.push(departmentId);
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
      SELECT COUNT(*) AS total
      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      ${whereSql}
    `;
    const [rows] = await db.query(sql, params);
    return rows[0] ? rows[0].total : 0;
  },

  /**
   * Aggregate monthly attendance breakdown for an employee used by the payroll engine
   */
  async getMonthlySummary(employeeId, month, year) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 1. Attendance statuses
    const sqlAtt = `
      SELECT 
        COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present_count,
        COUNT(CASE WHEN status = 'Half Day' THEN 1 END) AS half_day_count,
        COUNT(CASE WHEN status = 'Absent' THEN 1 END) AS absent_count,
        COUNT(CASE WHEN status = 'On Leave' THEN 1 END) AS on_leave_count,
        COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours
      FROM attendance
      WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?
    `;
    const [attRows] = await db.query(sqlAtt, [employeeId, startDate, endDate]);
    const att = attRows[0] || {};

    // 2. Approved leave requests overlapping with this month
    const sqlLeaves = `
      SELECT leave_type, SUM(days_count) AS total_leave_days
      FROM leave_requests
      WHERE employee_id = ? AND status = 'Approved'
        AND start_date <= ? AND end_date >= ?
      GROUP BY leave_type
    `;
    const [leaveRows] = await db.query(sqlLeaves, [employeeId, endDate, startDate]);

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    leaveRows.forEach(row => {
      if (row.leave_type === 'Unpaid') {
        unpaidLeaveDays += Number(row.total_leave_days || 0);
      } else {
        paidLeaveDays += Number(row.total_leave_days || 0);
      }
    });

    const presentDays = Number(att.present_count || 0) + (Number(att.half_day_count || 0) * 0.5);

    return {
      present_days: presentDays,
      absent_days: Number(att.absent_count || 0),
      half_day_count: Number(att.half_day_count || 0),
      paid_leave_days: paidLeaveDays,
      unpaid_leave_days: unpaidLeaveDays,
      overtime_hours: Number(att.total_overtime_hours || 0)
    };
  }
};

module.exports = attendanceModel;
