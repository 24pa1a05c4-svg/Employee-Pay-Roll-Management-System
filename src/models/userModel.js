/**
 * User Model
 * Manages administrative and employee system accounts
 */
const db = require('../config/db');

const userModel = {
  async findByUsernameOrEmail(identifier) {
    const sql = `
      SELECT id, username, email, password_hash, role, is_active, last_login, created_at
      FROM users
      WHERE username = ? OR email = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [identifier, identifier]);
    return rows[0] || null;
  },

  async findById(id) {
    const sql = `
      SELECT id, username, email, role, is_active, last_login, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  },

  async create({ username, email, password_hash, role = 'employee', is_active = 1 }) {
    const sql = `
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(sql, [username, email, password_hash, role, is_active]);
    return result.insertId;
  },

  async updatePassword(id, password_hash) {
    const sql = 'UPDATE users SET password_hash = ? WHERE id = ?';
    const [result] = await db.execute(sql, [password_hash, id]);
    return result.affectedRows > 0;
  },

  async updateLastLogin(id) {
    const sql = 'UPDATE users SET last_login = NOW() WHERE id = ?';
    await db.execute(sql, [id]);
  },

  async getAll() {
    const sql = `
      SELECT u.id, u.username, u.email, u.role, u.is_active, u.last_login, u.created_at,
             e.id AS employee_id, e.employee_code, e.first_name, e.last_name
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      ORDER BY u.created_at DESC
    `;
    const [rows] = await db.query(sql);
    return rows;
  }
};

module.exports = userModel;
