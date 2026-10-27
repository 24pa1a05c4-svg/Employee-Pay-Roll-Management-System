/**
 * Database Initialization Script
 * Reads and executes database/schema.sql using mysql2
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function initializeDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

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
