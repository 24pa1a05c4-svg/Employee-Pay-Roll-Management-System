/**
 * Rate Limiting Middleware
 * Protects login and sensitive administrative operations against brute force
 */
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 attempts per IP in window
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Max 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: 'Too many requests. Please slow down.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

module.exports = {
  loginLimiter,
  apiLimiter
};
