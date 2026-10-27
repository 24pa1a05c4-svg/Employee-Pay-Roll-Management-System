/**
 * Database Initialization Script
 * Reads and executes database/schema.sql using mysql2
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
  let config;

  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
      config = {
        host: parsed.hostname,
        port: parseInt(parsed.port || '3306', 10),
        user: decodeURIComponent(parsed.username || 'root'),
        password: decodeURIComponent(parsed.password || ''),
        multipleStatements: true,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined
      };
    } catch {
      // fallback
    }
  }

  if (!config) {
    const host = process.env.DB_HOST || 'localhost';
    const isRemote = host !== 'localhost' && host !== '127.0.0.1';
    const useSsl = process.env.DB_SSL === 'true' || (isRemote && process.env.DB_SSL !== 'false');
    config = {
      host,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    };
  }

  console.log(`Connecting to MySQL at ${config.host}:${config.port} as '${config.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Successfully connected to MySQL server.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database/schema.sql...');
    await connection.query(sql);

    console.log('✓ Database schema created successfully!');
    console.log(`✓ Database: ${process.env.DB_NAME || 'payroll_management_db'}`);
  } catch (err) {
    console.error('✗ Database initialization failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('\nNOTE: MySQL server is not running or unreachable on port ' + config.port + '.');
      console.error('Please ensure MySQL service is started, or check your .env settings.');
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
