/**
 * Leave Request Model
 * Handles leave applications, overlapping date validation, and admin review
 */
const db = require('../config/db');

const leaveModel = {
  async findOverlapping(employeeId, startDate, endDate, excludeId = null) {
    let sql = `
      SELECT id, leave_type, start_date, end_date, status
      FROM leave_requests
      WHERE employee_id = ?
        AND status IN ('Pending', 'Approved')
        AND (start_date <= ? AND end_date >= ?)
    `;
    let params = [employeeId, endDate, startDate];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.query(sql, params);
    return rows;
  },

  async create({ employee_id, leave_type, start_date, end_date, days_count, reason }) {
    // Overlap validation check
    const overlaps = await this.findOverlapping(employee_id, start_date, end_date);
    if (overlaps.length > 0) {
      const err = new Error(`An existing ${overlaps[0].status.toLowerCase()} leave request overlaps with the selected date range (${start_date} to ${end_date}).`);
      err.code = 'OVERLAPPING_LEAVE';
      throw err;
    }

    const sql = `
      INSERT INTO leave_requests (
        employee_id, leave_type, start_date, end_date, days_count, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `;
    const [result] = await db.execute(sql, [
      employee_id, leave_type, start_date, end_date, days_count, reason
    ]);
    return result.insertId;
  },

  async findById(id) {
    const sql = `
      SELECT lr.*, 
             e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             e.email AS employee_email, d.name AS department_name,
             u.username AS reviewer_name
      FROM leave_requests lr
      INNER JOIN employees e ON e.id = lr.employee_id
      INNER JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = lr.reviewed_by
      WHERE lr.id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async findAll({ employeeId = null, departmentId = null, status = '', startDate = null, endDate = null, limit = 50, offset = 0 } = {}) {
    let whereClauses = [];
    let params = [];

    if (employeeId) {
      whereClauses.push('lr.employee_id = ?');
      params.push(employeeId);
    }

    if (departmentId) {
      whereClauses.push('e.department_id = ?');
      params.push(departmentId);
    }

    if (status) {
      whereClauses.push('lr.status = ?');
      params.push(status);
    }

    if (startDate) {
      whereClauses.push('lr.start_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('lr.end_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const sql = `
      SELECT lr.id, lr.employee_id, lr.leave_type, lr.start_date, lr.end_date,
             lr.days_count, lr.reason, lr.status, lr.admin_remarks, lr.reviewed_at,
             lr.created_at,
             e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             d.name AS department_name,
             u.username AS reviewer_name
      FROM leave_requests lr
      INNER JOIN employees e ON e.id = lr.employee_id
      INNER JOIN departments d ON d.id = e.department_id
      LEFT JOIN users u ON u.id = lr.reviewed_by
      ${whereSql}
      ORDER BY lr.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async countAll({ employeeId = null, departmentId = null, status = '', startDate = null, endDate = null } = {}) {
    let whereClauses = [];
    let params = [];

    if (employeeId) {
      whereClauses.push('lr.employee_id = ?');
      params.push(employeeId);
    }

    if (departmentId) {
      whereClauses.push('e.department_id = ?');
      params.push(departmentId);
    }

    if (status) {
      whereClauses.push('lr.status = ?');
      params.push(status);
    }

    if (startDate) {
      whereClauses.push('lr.start_date >= ?');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('lr.end_date <= ?');
      params.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `
      SELECT COUNT(*) AS total
      FROM leave_requests lr
      INNER JOIN employees e ON e.id = lr.employee_id
      ${whereSql}
    `;
    const [rows] = await db.query(sql, params);
    return rows[0] ? rows[0].total : 0;
  },

  async updateStatus(id, { status, admin_remarks, reviewed_by }) {
    const sql = `
      UPDATE leave_requests
      SET status = ?, admin_remarks = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?
    `;
    const [result] = await db.execute(sql, [status, admin_remarks || null, reviewed_by, id]);
    return result.affectedRows > 0;
  }
};

module.exports = leaveModel;
