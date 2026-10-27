/**
 * User Account Management Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const userValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3 to 50 characters.'),
  body('email').trim().isEmail().withMessage('Valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['admin', 'employee']).withMessage('Role must be admin or employee.')
];

router.get('/', requireAuth, requireRole('admin'), userController.getUsers);
router.post('/', requireAuth, requireRole('admin'), userValidation, validate, userController.createUser);
router.patch('/:id/toggle-active', requireAuth, requireRole('admin'), userController.toggleActive);
router.post(
  '/:id/reset-password',
  requireAuth,
  requireRole('admin'),
  [
    body('new_password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
  ],
  validate,
  userController.resetPassword
);

module.exports = router;
