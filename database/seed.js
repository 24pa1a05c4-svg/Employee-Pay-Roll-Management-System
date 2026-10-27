/**
 * Database Seed Script
 * Reads and executes database/seed.sql using mysql2
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function seedDatabase() {
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
        database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'payroll_management_db',
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
      database: process.env.DB_NAME || 'payroll_management_db',
      multipleStatements: true,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined
    };
  }

  console.log(`Connecting to MySQL at ${config.host}:${config.port}/${config.database}...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ Successfully connected to MySQL database.');

    const seedPath = path.join(__dirname, 'seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log('Executing database/seed.sql...');
    await connection.query(sql);

    console.log('✓ Realistic demo seed data inserted successfully!');
    console.log('✓ Seeded departments, designations, users, employees, salary structures, leave, attendance, payroll runs & payslips.');
  } catch (err) {
    console.error('✗ Database seeding failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('\nNOTE: MySQL server is not running or unreachable on port ' + config.port + '.');
      console.error('Please verify your MySQL server status and .env configuration.');
    }
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
