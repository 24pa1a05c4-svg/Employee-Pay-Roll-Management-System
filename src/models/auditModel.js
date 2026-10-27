/**
 * Audit Log Model
 * Tracks administrative actions, approvals, finalizations, and logins
 */
const db = require('../config/db');

const auditModel = {
  async logAction({ user_id = null, action, entity_type, entity_id = null, details = null, ip_address = null }) {
    try {
      const sql = `
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [result] = await db.execute(sql, [
        user_id, action, entity_type, entity_id, details, ip_address
      ]);
      return result.insertId;
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
      return null;
    }
  },

  async findRecent(limit = 20) {
    const sql = `
      SELECT al.*, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT ?
    `;
    const [rows] = await db.query(sql, [Number(limit)]);
    return rows;
  }
};

module.exports = auditModel;
