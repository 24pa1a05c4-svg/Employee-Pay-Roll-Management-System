/**
 * Payslip Routes
 */
const express = require('express');
const router = express.Router();
const payslipController = require('../controllers/payslipController');
const { requireAuth, requireSelfOrAdmin } = require('../middleware/auth');

// Get JSON payslip data
router.get('/:id', requireAuth, payslipController.getPayslipData);

// Download PDF payslip (A4 format)
router.get('/:id/download', requireAuth, payslipController.downloadPayslipPdf);

// Get salary history for an employee (Self or Admin)
router.get('/history/:employeeId', requireAuth, requireSelfOrAdmin, payslipController.getEmployeeSalaryHistory);

module.exports = router;
