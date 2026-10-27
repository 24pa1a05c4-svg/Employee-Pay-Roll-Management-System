/**
 * Secure Session Configuration
 * Uses express-session with FileStore for session persistence
 */
const session = require('express-session');
const path = require('path');

let store;
// In serverless / memory store mode or test mode
if (process.env.SESSION_STORE === 'memory' || process.env.NODE_ENV === 'test') {
  store = new session.MemoryStore();
} else {
  try {
    const FileStore = require('session-file-store')(session);
    store = new FileStore({
      path: path.join(__dirname, '../../sessions'),
      ttl: 24 * 60 * 60, // 24 hours
      retries: 5,
      factor: 1,
      minTimeout: 50,
      maxTimeout: 250,
      reapInterval: -1, // Disable automatic reaping to avoid file lock collisions
      logFn: () => {}
    });
  } catch {
    store = new session.MemoryStore();
  }
}

const sessionConfig = {
  store,
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
