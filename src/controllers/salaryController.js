/**
 * Salary Structure Controller
 * Manages compensation structures, HRA, PF, PT, and TDS configuration
 */
const salaryModel = require('../models/salaryModel');
const employeeModel = require('../models/employeeModel');
const auditModel = require('../models/auditModel');

const salaryController = {
  async getSalaryStructure(req, res, next) {
    try {
      const user = req.session.user;
      const employeeId = parseInt(req.params.employeeId, 10);

      // Role authorization
      if (user.role === 'employee' && user.employee_id !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own salary structure.'
        });
      }

      const structure = await salaryModel.findByEmployeeId(employeeId);
      if (!structure) {
        return res.status(404).json({
          success: false,
          message: 'Salary structure not found for this employee.'
        });
      }

      res.json({
        success: true,
        data: structure
      });
    } catch (err) {
      next(err);
    }
  },

  async updateSalaryStructure(req, res, next) {
    try {
      const employeeId = parseInt(req.params.employeeId, 10);
      const {
        basic_salary, hra_type, hra_value, other_allowances,
        overtime_hourly_rate, pf_applicable, pf_rate,
        pt_applicable, pt_amount, tds_rate
      } = req.body;

      const employee = await employeeModel.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }

      const id = await salaryModel.upsert(employeeId, {
        basic_salary: parseFloat(basic_salary) || employee.basic_salary,
        hra_type: hra_type || 'percentage',
        hra_value: parseFloat(hra_value) || 40.00,
        other_allowances: parseFloat(other_allowances) || 0.00,
        overtime_hourly_rate: parseFloat(overtime_hourly_rate) || 0.00,
        pf_applicable: pf_applicable !== undefined ? Boolean(pf_applicable) : true,
        pf_rate: parseFloat(pf_rate) || 12.00,
        pt_applicable: pt_applicable !== undefined ? Boolean(pt_applicable) : true,
        pt_amount: parseFloat(pt_amount) || 200.00,
        tds_rate: parseFloat(tds_rate) || 5.00
      });

      // Update employee basic salary table too
      if (basic_salary && parseFloat(basic_salary) !== parseFloat(employee.basic_salary)) {
        await employeeModel.update(employeeId, {
          ...employee,
          basic_salary: parseFloat(basic_salary)
        });
      }

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'UPDATE_SALARY_STRUCTURE',
        entity_type: 'salary_structures',
        entity_id: id,
        details: `Updated salary structure for employee ${employee.employee_code}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Salary structure for ${employee.full_name} (${employee.employee_code}) updated successfully.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = salaryController;
