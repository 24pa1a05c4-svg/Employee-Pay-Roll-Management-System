/**
 * Leave Request Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const leaveController = require('../controllers/leaveController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const leaveValidation = [
  body('leave_type').isIn(['Casual', 'Sick', 'Paid', 'Unpaid']).withMessage('Valid leave type is required.'),
  body('start_date').isDate().withMessage('Valid start date (YYYY-MM-DD) is required.'),
  body('end_date').isDate().withMessage('Valid end date (YYYY-MM-DD) is required.'),
  body('reason').trim().notEmpty().withMessage('Reason for leave is required.').isLength({ min: 5, max: 500 })
];

// View leave requests
router.get('/', requireAuth, leaveController.getLeaveRequests);

// Apply for leave (Employee or Admin)
router.post('/', requireAuth, leaveValidation, validate, leaveController.createLeaveRequest);

// Review / Approve / Reject leave (Admin only)
router.patch(
  '/:id/review',
  requireAuth,
  requireRole('admin'),
  [
    body('status').isIn(['Approved', 'Rejected']).withMessage('Status must be Approved or Rejected.'),
    body('admin_remarks').optional().trim()
  ],
  validate,
  leaveController.reviewLeaveRequest
);

module.exports = router;
