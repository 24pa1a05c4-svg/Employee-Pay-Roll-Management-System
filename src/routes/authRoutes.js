/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const { getCsrfToken } = require('../middleware/csrf');

// Login route with rate limiting & validation
router.post(
  '/login',
  loginLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username or email is required.'),
    body('password').notEmpty().withMessage('Password is required.')
  ],
  validate,
  authController.login
);

// Logout
router.post('/logout', requireAuth, authController.logout);

// Current user profile
router.get('/me', requireAuth, authController.getCurrentUser);

// Get CSRF Token
router.get('/csrf-token', getCsrfToken);

module.exports = router;
