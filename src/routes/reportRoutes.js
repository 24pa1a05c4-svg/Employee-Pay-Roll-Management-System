/**
 * Reports Routes
 */
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/monthly-payroll', requireAuth, requireRole('admin'), reportController.getMonthlyPayrollSummary);
router.get('/department-expenditure', requireAuth, requireRole('admin'), reportController.getDepartmentExpenditure);
router.get('/attendance-summary', requireAuth, requireRole('admin'), reportController.getAttendanceSummary);
router.get('/deductions-summary', requireAuth, requireRole('admin'), reportController.getDeductionsSummary);

module.exports = router;
