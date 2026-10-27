/**
 * Payslip Controller
 * Manages payslip viewing and PDF streaming with strict employee-level access control
 */
const payrollModel = require('../models/payrollModel');
const { createPayslipPdf } = require('../services/payslipPdfService');

const payslipController = {
  /**
   * Get structured JSON data for a payslip record
   */
  async getPayslipData(req, res, next) {
    try {
      const recordId = parseInt(req.params.id, 10);
      const user = req.session.user;

      const record = await payrollModel.findRecordById(recordId);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Payslip record not found.' });
      }

      // Strict role check: Employee can only view their own payslip
      if (user.role === 'employee' && user.employee_id !== record.employee_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view another employee\'s payslip.'
        });
      }

      const lineItems = await payrollModel.findRecordItems(recordId);

      res.json({
        success: true,
        data: {
          ...record,
          lineItems
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Generate and stream PDF payslip
   */
  async downloadPayslipPdf(req, res, next) {
    try {
      const recordId = parseInt(req.params.id, 10);
      const user = req.session.user;

      const record = await payrollModel.findRecordById(recordId);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Payslip record not found.' });
      }

      // Strict role check: Employee can only download their own payslip
      if (user.role === 'employee' && user.employee_id !== record.employee_id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to download this payslip.'
        });
      }

      const lineItems = await payrollModel.findRecordItems(recordId);

      const companyInfo = {
        name: process.env.COMPANY_NAME || 'TechNova Solutions Pvt. Ltd.',
        address: process.env.COMPANY_ADDRESS || 'Plot 42, Hitech City, Madhapur, Hyderabad, Telangana - 500081',
        email: process.env.COMPANY_EMAIL || 'payroll@technova.example.com',
        phone: process.env.COMPANY_PHONE || '+91 40 4567 8900'
      };

      const pdfDoc = createPayslipPdf({ ...record, lineItems }, companyInfo);

      const filename = `Payslip_${record.payslip_number}_${record.employee_code}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      pdfDoc.pipe(res);
      pdfDoc.end();
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get salary history for current employee or selected employee (admin)
   */
  async getEmployeeSalaryHistory(req, res, next) {
    try {
      const user = req.session.user;
      let employeeId = parseInt(req.params.employeeId || req.query.employeeId, 10);

      if (user.role === 'employee') {
        employeeId = user.employee_id;
      }

      if (!employeeId) {
        return res.status(400).json({ success: false, message: 'Employee ID is required.' });
      }

      // If user is employee and tries to query another employee
      if (user.role === 'employee' && user.employee_id !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own salary history.'
        });
      }

      const history = await payrollModel.findEmployeeSalaryHistory(employeeId);

      res.json({
        success: true,
        data: history
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = payslipController;
