/**
 * Designation Model
 * Manages designations per department and checks referential integrity
 */
const db = require('../config/db');

const designationModel = {
  async findAll(departmentId = null) {
    let sql = `
      SELECT des.id, des.department_id, des.title, des.code, des.description, des.created_at,
             d.name AS department_name,
             COUNT(e.id) AS employee_count
      FROM designations des
      INNER JOIN departments d ON d.id = des.department_id
      LEFT JOIN employees e ON e.designation_id = des.id
    `;
    let params = [];

    if (departmentId) {
      sql += ' WHERE des.department_id = ?';
      params.push(departmentId);
    }

    sql += ' GROUP BY des.id ORDER BY d.name ASC, des.title ASC';
    const [rows] = await db.query(sql, params);
    return rows;
  },

  async findById(id) {
    const sql = `
      SELECT des.*, d.name AS department_name,
             COUNT(e.id) AS employee_count
      FROM designations des
      INNER JOIN departments d ON d.id = des.department_id
      LEFT JOIN employees e ON e.designation_id = des.id
      WHERE des.id = ?
      GROUP BY des.id
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ department_id, title, code, description }) {
    const sql = 'INSERT INTO designations (department_id, title, code, description) VALUES (?, ?, ?, ?)';
    const [result] = await db.execute(sql, [department_id, title, code, description || null]);
    return result.insertId;
  },

  async update(id, { department_id, title, code, description }) {
    const sql = 'UPDATE designations SET department_id = ?, title = ?, code = ?, description = ? WHERE id = ?';
    const [result] = await db.execute(sql, [department_id, title, code, description || null, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [empRows] = await db.query('SELECT COUNT(*) as count FROM employees WHERE designation_id = ?', [id]);
    if (empRows[0] && empRows[0].count > 0) {
      const err = new Error(`Cannot delete designation: It is currently assigned to ${empRows[0].count} employee(s).`);
      err.code = 'DESIGNATION_HAS_EMPLOYEES';
      throw err;
    }

    const sql = 'DELETE FROM designations WHERE id = ?';
    const [result] = await db.execute(sql, [id]);
    return result.affectedRows > 0;
  }
};

module.exports = designationModel;
