/**
 * Employee Model
 * Manages employee master data, search, filtering, pagination, and soft deactivation.
 */
const db = require('../config/db');
const { maskBankAccount } = require('../utils/helpers');

const employeeModel = {
  async findAll({ search = '', departmentId = null, status = '', page = 1, limit = 10 } = {}) {
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (departmentId) {
      whereClauses.push('e.department_id = ?');
      params.push(departmentId);
    }

    if (status) {
      whereClauses.push('e.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (Math.max(1, page) - 1) * limit;

    const sql = `
      SELECT e.id, e.user_id, e.employee_code, e.first_name, e.last_name,
             CONCAT(e.first_name, ' ', e.last_name) AS full_name,
             e.email, e.phone, e.date_of_birth, e.gender, e.address,
             e.joining_date, e.department_id, e.designation_id, e.status,
             e.basic_salary, e.bank_name, e.bank_account_number, e.bank_ifsc, e.pan_number,
             d.name AS department_name, des.title AS designation_title,
             u.username AS account_username
      FROM employees e
      INNER JOIN departments d ON d.id = e.department_id
      INNER JOIN designations des ON des.id = e.designation_id
      LEFT JOIN users u ON u.id = e.user_id
      ${whereSql}
      ORDER BY e.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(Number(limit), Number(offset));
    const [rows] = await db.query(sql, params);

    return rows.map(emp => ({
      ...emp,
      masked_bank_account: maskBankAccount(emp.bank_account_number)
    }));
  },

  async countAll({ search = '', departmentId = null, status = '' } = {}) {
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (departmentId) {
      whereClauses.push('e.department_id = ?');
      params.push(departmentId);
    }

    if (status) {
      whereClauses.push('e.status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) AS total FROM employees e ${whereSql}`;
    const [rows] = await db.query(sql, params);
    return rows[0] ? rows[0].total : 0;
  },

  async findById(id) {
    const sql = `
      SELECT e.*, 
             CONCAT(e.first_name, ' ', e.last_name) AS full_name,
             d.name AS department_name, des.title AS designation_title,
             u.username AS account_username, u.role AS account_role
      FROM employees e
      INNER JOIN departments d ON d.id = e.department_id
      INNER JOIN designations des ON des.id = e.designation_id
      LEFT JOIN users u ON u.id = e.user_id
      WHERE e.id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [id]);
    if (!rows[0]) return null;

    const emp = rows[0];
    return {
      ...emp,
      masked_bank_account: maskBankAccount(emp.bank_account_number)
    };
  },

  async findByCode(code) {
    const sql = 'SELECT * FROM employees WHERE employee_code = ? LIMIT 1';
    const [rows] = await db.query(sql, [code]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const sql = 'SELECT * FROM employees WHERE email = ? LIMIT 1';
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
  },

  async findByUserId(userId) {
    const sql = `
      SELECT e.*, 
             CONCAT(e.first_name, ' ', e.last_name) AS full_name,
             d.name AS department_name, des.title AS designation_title
      FROM employees e
      INNER JOIN departments d ON d.id = e.department_id
      INNER JOIN designations des ON des.id = e.designation_id
      WHERE e.user_id = ?
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [userId]);
    if (!rows[0]) return null;
    return {
      ...rows[0],
      masked_bank_account: maskBankAccount(rows[0].bank_account_number)
    };
  },

  async getNextSequence() {
    const sql = 'SELECT COUNT(*) AS count FROM employees';
    const [rows] = await db.query(sql);
    return (rows[0] ? rows[0].count : 0) + 1;
  },

  async create(data) {
    const sql = `
      INSERT INTO employees (
        user_id, employee_code, first_name, last_name, email, phone,
        date_of_birth, gender, address, joining_date, department_id,
        designation_id, status, basic_salary, bank_name,
        bank_account_number, bank_ifsc, pan_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.user_id || null,
      data.employee_code,
      data.first_name,
      data.last_name,
      data.email,
      data.phone,
      data.date_of_birth || null,
      data.gender || 'Other',
      data.address || null,
      data.joining_date,
      data.department_id,
      data.designation_id,
      data.status || 'Active',
      data.basic_salary || 0.00,
      data.bank_name || null,
      data.bank_account_number || null,
      data.bank_ifsc || null,
      data.pan_number || null
    ];
    const [result] = await db.execute(sql, params);
    return result.insertId;
  },

  async update(id, data) {
    const sql = `
      UPDATE employees SET
        first_name = ?, last_name = ?, email = ?, phone = ?,
        date_of_birth = ?, gender = ?, address = ?, joining_date = ?,
        department_id = ?, designation_id = ?, status = ?, basic_salary = ?,
        bank_name = ?, bank_account_number = ?, bank_ifsc = ?, pan_number = ?
      WHERE id = ?
    `;
    const params = [
      data.first_name,
      data.last_name,
      data.email,
      data.phone,
      data.date_of_birth || null,
      data.gender || 'Other',
      data.address || null,
      data.joining_date,
      data.department_id,
      data.designation_id,
      data.status || 'Active',
      data.basic_salary || 0.00,
      data.bank_name || null,
      data.bank_account_number || null,
      data.bank_ifsc || null,
      data.pan_number || null,
      id
    ];
    const [result] = await db.execute(sql, params);
    return result.affectedRows > 0;
  },

  /**
   * Soft deactivate employee to preserve full historical payroll integrity
   */
  async deactivate(id, status = 'Inactive') {
    const sql = 'UPDATE employees SET status = ? WHERE id = ?';
    const [result] = await db.execute(sql, [status, id]);
    return result.affectedRows > 0;
  }
};

module.exports = employeeModel;
