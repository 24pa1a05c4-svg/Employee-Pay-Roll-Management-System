/**
 * Salary Structure Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const salaryController = require('../controllers/salaryController');
const { requireAuth, requireRole, requireSelfOrAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const salaryValidation = [
  body('basic_salary').isFloat({ min: 0 }).withMessage('Basic salary must be a positive number.'),
  body('hra_type').isIn(['percentage', 'fixed']).withMessage('HRA type must be percentage or fixed.'),
  body('hra_value').isFloat({ min: 0 }).withMessage('HRA value must be a positive number.'),
  body('other_allowances').optional().isFloat({ min: 0 }).withMessage('Other allowances must be non-negative.'),
  body('overtime_hourly_rate').optional().isFloat({ min: 0 }).withMessage('Overtime hourly rate must be non-negative.'),
  body('pf_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('PF rate must be between 0 and 100%.'),
  body('pt_amount').optional().isFloat({ min: 0 }).withMessage('Professional tax must be non-negative.'),
  body('tds_rate').optional().isFloat({ min: 0, max: 100 }).withMessage('TDS rate must be between 0 and 100%.')
];

// View salary structure (Self or Admin)
router.get('/:employeeId', requireAuth, requireSelfOrAdmin, salaryController.getSalaryStructure);

// Update salary structure (Admin only)
router.put('/:employeeId', requireAuth, requireRole('admin'), salaryValidation, validate, salaryController.updateSalaryStructure);

module.exports = router;
