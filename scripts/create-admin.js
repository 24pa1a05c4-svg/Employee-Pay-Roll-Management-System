/**
 * CLI Tool: Create Initial Administrator Account
 * Usage: node scripts/create-admin.js <username> <email> <password>
 * Example: node scripts/create-admin.js superadmin admin@technova.example.com StrongPass@2026
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const args = process.argv.slice(2);
  const username = args[0] || 'admin';
  const email = args[1] || 'admin@technova.example.com';
  const password = args[2] || 'Admin@123';

  if (!username || !email || !password) {
    console.log('Usage: node scripts/create-admin.js <username> <email> <password>');
    process.exit(1);
  }

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'payroll_management_db'
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [existing] = await connection.execute(
      'SELECT id, username FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      console.log(`User '${username}' or '${email}' already exists. Updating credentials...`);
      await connection.execute(
        'UPDATE users SET password_hash = ?, role = "admin", is_active = 1 WHERE username = ? OR email = ?',
        [passwordHash, username, email]
      );
      console.log(`✓ Admin user '${username}' successfully updated with role 'admin'.`);
    } else {
      await connection.execute(
        'INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, "admin", 1)',
        [username, email, passwordHash]
      );
      console.log(`✓ Admin user '${username}' successfully created with role 'admin'.`);
    }

    console.log('\nLogin Details:');
    console.log(`Username / Email: ${username} (${email})`);
    console.log(`Role: admin`);
  } catch (err) {
    console.error('✗ Error creating admin user:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createAdmin();
