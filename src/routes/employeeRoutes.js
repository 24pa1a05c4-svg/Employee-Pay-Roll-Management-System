/**
 * Employee Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const employeeController = require('../controllers/employeeController');
const { requireAuth, requireRole, requireSelfOrAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const employeeValidation = [
  body('first_name').trim().notEmpty().withMessage('First name is required.').isLength({ max: 50 }),
  body('last_name').trim().notEmpty().withMessage('Last name is required.').isLength({ max: 50 }),
  body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('Phone number is required.').isLength({ min: 10, max: 20 }),
  body('joining_date').isDate().withMessage('A valid joining date (YYYY-MM-DD) is required.'),
  body('department_id').isInt({ min: 1 }).withMessage('A valid department must be selected.'),
  body('designation_id').isInt({ min: 1 }).withMessage('A valid designation must be selected.'),
  body('basic_salary').isFloat({ min: 0 }).withMessage('Basic salary must be a positive number.')
];

// List employees (Admin only)
router.get('/', requireAuth, requireRole('admin'), employeeController.getEmployees);

// Get employee by ID (Self or Admin)
router.get('/:id', requireAuth, requireSelfOrAdmin, employeeController.getEmployeeById);

// Create employee (Admin only)
router.post('/', requireAuth, requireRole('admin'), employeeValidation, validate, employeeController.createEmployee);

// Update employee (Admin only)
router.put('/:id', requireAuth, requireRole('admin'), employeeValidation, validate, employeeController.updateEmployee);

// Soft deactivate employee (Admin only)
router.patch(
  '/:id/deactivate',
  requireAuth,
  requireRole('admin'),
  [
    body('status').isIn(['Inactive', 'Terminated', 'Active']).withMessage('Invalid status specified.')
  ],
  validate,
  employeeController.deactivateEmployee
);

module.exports = router;
