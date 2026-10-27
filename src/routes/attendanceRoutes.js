/**
 * Attendance Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validator');

const attendanceValidation = [
  body('employee_id').isInt({ min: 1 }).withMessage('Valid employee must be selected.'),
  body('attendance_date').isDate().withMessage('Valid attendance date (YYYY-MM-DD) is required.'),
  body('status').isIn(['Present', 'Absent', 'Half Day', 'On Leave']).withMessage('Valid status is required.'),
  body('overtime_hours').optional().isFloat({ min: 0, max: 24 }).withMessage('Overtime hours must be between 0 and 24.')
];

// View attendance (Employee views own; Admin views all)
router.get('/', requireAuth, attendanceController.getAttendance);

// Record attendance (Admin only)
router.post('/', requireAuth, requireRole('admin'), attendanceValidation, validate, attendanceController.recordAttendance);

// Update attendance (Admin only)
router.put('/:id', requireAuth, requireRole('admin'), [
  body('status').isIn(['Present', 'Absent', 'Half Day', 'On Leave']).withMessage('Valid status is required.'),
  body('overtime_hours').optional().isFloat({ min: 0, max: 24 })
], validate, attendanceController.updateAttendance);

// Get monthly summary
router.get('/summary/:employeeId', requireAuth, attendanceController.getMonthlySummary);

module.exports = router;
