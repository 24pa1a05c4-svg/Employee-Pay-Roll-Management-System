/**
 * Secure Session Configuration
 * Uses express-session with FileStore for session persistence
 */
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');

const sessionConfig = {
  store: new FileStore({
    path: path.join(__dirname, '../../sessions'),
    ttl: 24 * 60 * 60, // 24 hours
    retries: 2,
    logFn: () => {} // Silence verbose file store logs
  }),
  name: 'payroll.sid',
  secret: process.env.SESSION_SECRET || 'fallback_payroll_management_secret_key_98234710',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevents client-side JS from reading cookie (anti-XSS)
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    sameSite: 'lax', // Protects against cross-site request forgery
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

module.exports = sessionConfig;
