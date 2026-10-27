
/**
 * Database Connection Module
 * Uses mysql2/promise connection pool with parameterized queries
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

function buildPoolConfig() {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'payroll_management_db',
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        decimalNumbers: true,
        timezone: '+05:30',
        ssl: isRemote ? { rejectUnauthorized: false } : undefined
      };
    } catch (e) {
      console.warn('[DB] Failed to parse DATABASE_URL, using individual variables.');
    }
  }

  const host = process.env.DB_HOST || 'localhost';
  const isRemote = host !== 'localhost' && host !== '127.0.0.1';
  const useSsl = process.env.DB_SSL === 'true' || (isRemote && process.env.DB_SSL !== 'false');

  return {
    host,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_management_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: '+05:30',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  };
}

const poolConfig = buildPoolConfig();

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
