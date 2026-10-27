/**
 * Payroll Routes
 */
const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const payrollController = require('../controllers/payrollController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

// List payroll runs (Admin only)
router.get('/runs', requireAuth, requireRole('admin'), payrollController.getPayrollRuns);

// Get payroll run details (Admin only)
router.get('/runs/:id', requireAuth, requireRole('admin'), payrollController.getPayrollRunById);

// Preview payroll calculation before saving (Admin only)
router.get(
  '/preview',
  requireAuth,
  requireRole('admin'),
  [
    query('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required.'),
    query('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required.')
  ],
  validate,
  payrollController.previewPayroll
);

// Process and save draft payroll run (Admin only)
router.post(
  '/process',
  requireAuth,
  requireRole('admin'),
  [
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required.'),
    body('year').isInt({ min: 2000, max: 2100 }).withMessage('Valid year is required.'),
    body('working_days').optional().isInt({ min: 1, max: 31 })
  ],
  validate,
  payrollController.processDraftPayroll
);

// Update payroll status (Draft -> Pending Approval -> Approved -> Finalized) (Admin only)
router.patch(
  '/runs/:id/status',
  requireAuth,
  requireRole('admin'),
  [
    body('status').isIn(['Draft', 'Pending Approval', 'Approved', 'Finalized']).withMessage('Invalid status.')
  ],
  validate,
  payrollController.updateStatus
);

// Reversal workflow for Finalized payroll runs (Admin only)
router.post(
  '/runs/:id/reverse',
  requireAuth,
  requireRole('admin'),
  [
    body('reason').trim().isLength({ min: 5 }).withMessage('Detailed reversal reason (min 5 chars) is required.')
  ],
  validate,
  payrollController.reversePayroll
);

module.exports = router;
