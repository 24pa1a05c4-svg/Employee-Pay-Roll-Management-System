/**
 * Salary Structure Model
 * Manages per-employee configurable earnings formulas and statutory deduction rates
 */
const db = require('../config/db');

const salaryModel = {
  async findByEmployeeId(employeeId) {
    const sql = `
      SELECT ss.*,
             e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
             d.name AS department_name, des.title AS designation_title
      FROM salary_structures ss
      INNER JOIN employees e ON e.id = ss.employee_id
      INNER JOIN departments d ON d.id = e.department_id
      INNER JOIN designations des ON des.id = e.designation_id
      WHERE ss.employee_id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [employeeId]);
    return rows[0] || null;
  },

  async upsert(employeeId, data) {
    const existing = await this.findByEmployeeId(employeeId);
    if (existing) {
      const sql = `
        UPDATE salary_structures SET
          basic_salary = ?,
          hra_type = ?,
          hra_value = ?,
          other_allowances = ?,
          overtime_hourly_rate = ?,
          pf_applicable = ?,
          pf_rate = ?,
          pt_applicable = ?,
          pt_amount = ?,
          tds_rate = ?
        WHERE employee_id = ?
      `;
      const params = [
        data.basic_salary,
        data.hra_type || 'percentage',
        data.hra_value || 40.00,
        data.other_allowances || 0.00,
        data.overtime_hourly_rate || 0.00,
        data.pf_applicable !== undefined ? (data.pf_applicable ? 1 : 0) : 1,
        data.pf_rate || 12.00,
        data.pt_applicable !== undefined ? (data.pt_applicable ? 1 : 0) : 1,
        data.pt_amount || 200.00,
        data.tds_rate || 5.00,
        employeeId
      ];
      await db.execute(sql, params);
      return existing.id;
    } else {
      const sql = `
        INSERT INTO salary_structures (
          employee_id, basic_salary, hra_type, hra_value, other_allowances,
          overtime_hourly_rate, pf_applicable, pf_rate, pt_applicable,
          pt_amount, tds_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const params = [
        employeeId,
        data.basic_salary,
        data.hra_type || 'percentage',
        data.hra_value || 40.00,
        data.other_allowances || 0.00,
        data.overtime_hourly_rate || 0.00,
        data.pf_applicable !== undefined ? (data.pf_applicable ? 1 : 0) : 1,
        data.pf_rate || 12.00,
        data.pt_applicable !== undefined ? (data.pt_applicable ? 1 : 0) : 1,
        data.pt_amount || 200.00,
        data.tds_rate || 5.00
      ];
      const [result] = await db.execute(sql, params);
      return result.insertId;
    }
  }
};

module.exports = salaryModel;
