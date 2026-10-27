
/**
 * Database Connection Module
 * Uses mysql2/promise connection pool with parameterized queries
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payroll_management_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  decimalNumbers: true,
  timezone: '+05:30'
};

let pool = null;
let isConnected = false;

function getPool() {
  if (!pool) {
    pool = mysql.createPool(poolConfig);
  }

  return pool;
}

async function query(sql, params = []) {
  try {
    return await getPool().query(sql, params);
  } catch (err) {
    console.error('[DB QUERY FAILED]', {
      code: err.code,
      message: err.message,
      sql: sql.replace(/\s+/g, ' ').trim().slice(0, 100),
      host: poolConfig.host,
      user: poolConfig.user,
      database: poolConfig.database
    });

    throw err;
  }
}

async function execute(sql, params = []) {
  return await getPool().execute(sql, params);
}

async function getConnection() {
  return await getPool().getConnection();
}

async function testConnection() {
  try {
    await getPool().query('SELECT 1 AS connected');
    isConnected = true;
    return true;
  } catch (err) {
    isConnected = false;
    console.error('[DB CONNECTION FAILED]', err.code, err.message);
    return false;
  }
}

module.exports = {
  getPool,
  query,
  execute,
  getConnection,
  testConnection,
  poolConfig
};
