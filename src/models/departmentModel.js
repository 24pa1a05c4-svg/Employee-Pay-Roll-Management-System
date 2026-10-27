/**
 * Department Model
 * Manages departments, employee count metrics, and deletion protection
 */
const db = require('../config/db');

const departmentModel = {
  async findAllWithCount() {
    const sql = `
      SELECT d.id, d.name, d.code, d.description, d.created_at,
             COUNT(e.id) AS employee_count,
             COUNT(CASE WHEN e.status = 'Active' THEN 1 END) AS active_employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      GROUP BY d.id
      ORDER BY d.name ASC
    `;
    const [rows] = await db.query(sql);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT d.*, COUNT(e.id) AS employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id
      WHERE d.id = ?
      GROUP BY d.id
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async findByNameOrCode(name, code, excludeId = null) {
    let sql = 'SELECT * FROM departments WHERE (name = ? OR code = ?)';
    let params = [name, code];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  },

  async create({ name, code, description }) {
    const sql = 'INSERT INTO departments (name, code, description) VALUES (?, ?, ?)';
    const [result] = await db.execute(sql, [name, code, description || null]);
    return result.insertId;
  },

  async update(id, { name, code, description }) {
    const sql = 'UPDATE departments SET name = ?, code = ?, description = ? WHERE id = ?';
    const [result] = await db.execute(sql, [name, code, description || null, id]);
    return result.affectedRows > 0;
  },

  async getEmployeeCount(departmentId) {
    const sql = 'SELECT COUNT(*) as count FROM employees WHERE department_id = ?';
    const [rows] = await db.query(sql, [departmentId]);
    return rows[0] ? rows[0].count : 0;
  },

  async delete(id) {
    // Check if referenced by employees
    const count = await this.getEmployeeCount(id);
    if (count > 0) {
      const err = new Error(`Cannot delete department: It is currently referenced by ${count} employee(s). Please reassign them first.`);
      err.code = 'DEPARTMENT_HAS_EMPLOYEES';
      throw err;
    }

    // Check if referenced by designations
    const [desigRows] = await db.query('SELECT COUNT(*) as count FROM designations WHERE department_id = ?', [id]);
    if (desigRows[0] && desigRows[0].count > 0) {
      const err = new Error(`Cannot delete department: It has ${desigRows[0].count} designation(s) associated with it.`);
      err.code = 'DEPARTMENT_HAS_DESIGNATIONS';
      throw err;
    }

    const sql = 'DELETE FROM departments WHERE id = ?';
    const [result] = await db.execute(sql, [id]);
    return result.affectedRows > 0;
  }
};

module.exports = departmentModel;
