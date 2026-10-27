/**
 * Payroll Controller
 * Orchestrates monthly payroll calculation, preview, approval workflow, and finalization
 */
const payrollModel = require('../models/payrollModel');
const employeeModel = require('../models/employeeModel');
const salaryModel = require('../models/salaryModel');
const attendanceModel = require('../models/attendanceModel');
const auditModel = require('../models/auditModel');
const { calculateEmployeePayroll } = require('../services/payrollCalculationService');
const { Decimal, toDecimalString } = require('../utils/currency');
const { formatDateISO, calculateDefaultWorkingDays } = require('../utils/dateUtils');

const payrollController = {
  async getPayrollRuns(req, res, next) {
    try {
      const runs = await payrollModel.findAllRuns();
      res.json({
        success: true,
        data: runs
      });
    } catch (err) {
      next(err);
    }
  },

  async getPayrollRunById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await payrollModel.findRunById(id);
      if (!run) {
        return res.status(404).json({ success: false, message: 'Payroll run not found.' });
      }

      const records = await payrollModel.findRecordsByRunId(id);

      res.json({
        success: true,
        run,
        records
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Preview Payroll Calculation for a given month and year
   * Computes earnings, deductions, overtime, and unpaid leave without saving yet
   */
  async previewPayroll(req, res, next) {
    try {
      const { month, year, working_days } = req.query;

      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      if (!m || !y || m < 1 || m > 12) {
        return res.status(400).json({ success: false, message: 'Valid month (1-12) and year are required.' });
      }

      // Check if already finalized
      const existingRun = await payrollModel.findRunByMonthYear(m, y);
      if (existingRun && existingRun.status === 'Finalized') {
        return res.status(400).json({
          success: false,
          message: `Payroll for ${m}/${y} is already Finalized. To make changes, use the authorized Reversal workflow.`,
          isFinalized: true
        });
      }

      const workingDays = working_days ? parseInt(working_days, 10) : calculateDefaultWorkingDays(m, y);

      // Load all active employees
      const employees = await employeeModel.findAll({ status: 'Active', limit: 1000, page: 1 });
      if (employees.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active employees found to process payroll.'
        });
      }

      let totalGross = new Decimal(0);
      let totalDeductions = new Decimal(0);
      let totalNet = new Decimal(0);
      const previewRecords = [];

      for (const emp of employees) {
        // Fetch salary structure
        let salaryStructure = await salaryModel.findByEmployeeId(emp.id);
        if (!salaryStructure) {
          // Fallback to employee basic salary
          salaryStructure = {
            basic_salary: emp.basic_salary,
            hra_type: 'percentage',
            hra_value: 40.00,
            other_allowances: 0.00,
            overtime_hourly_rate: 0.00,
            pf_applicable: 1,
            pf_rate: 12.00,
            pt_applicable: 1,
            pt_amount: 200.00,
            tds_rate: 5.00
          };
        }

        // Fetch monthly attendance breakdown
        const attendanceSummary = await attendanceModel.getMonthlySummary(emp.id, m, y);

        // Calculate payroll with decimal safety
        const calculation = calculateEmployeePayroll(salaryStructure, attendanceSummary, { workingDays });

        totalGross = totalGross.plus(new Decimal(calculation.grossSalary));
        totalDeductions = totalDeductions.plus(new Decimal(calculation.totalDeductions));
        totalNet = totalNet.plus(new Decimal(calculation.netSalary));

        previewRecords.push({
          employee_id: emp.id,
          employee_code: emp.employee_code,
          employee_name: emp.full_name,
          department_name: emp.department_name,
          designation_title: emp.designation_title,
          ...calculation
        });
      }

      res.json({
        success: true,
        month: m,
        year: y,
        workingDays,
        employeeCount: previewRecords.length,
        totalGross: toDecimalString(totalGross),
        totalDeductions: toDecimalString(totalDeductions),
        totalNet: toDecimalString(totalNet),
        records: previewRecords,
        existingStatus: existingRun ? existingRun.status : null
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Save draft payroll run (calculates and persists records with line items)
   */
  async processDraftPayroll(req, res, next) {
    try {
      const { month, year, working_days, run_date } = req.body;

      const m = parseInt(month, 10);
      const y = parseInt(year, 10);

      if (!m || !y || m < 1 || m > 12) {
        return res.status(400).json({ success: false, message: 'Valid month (1-12) and year are required.' });
      }

      const workingDays = working_days ? parseInt(working_days, 10) : calculateDefaultWorkingDays(m, y);
      const payrollRunDate = run_date ? formatDateISO(run_date) : formatDateISO(new Date());

      // Load all active employees
      const employees = await employeeModel.findAll({ status: 'Active', limit: 1000, page: 1 });
      if (employees.length === 0) {
        return res.status(400).json({ success: false, message: 'No active employees found to process.' });
      }

      let totalGross = new Decimal(0);
      let totalDeductions = new Decimal(0);
      let totalNet = new Decimal(0);
      const calculatedRecords = [];

      for (const emp of employees) {
        let salaryStructure = await salaryModel.findByEmployeeId(emp.id);
        if (!salaryStructure) {
          salaryStructure = {
            basic_salary: emp.basic_salary,
            hra_type: 'percentage',
            hra_value: 40.00,
            other_allowances: 0.00,
            overtime_hourly_rate: 0.00,
            pf_applicable: 1,
            pf_rate: 12.00,
            pt_applicable: 1,
            pt_amount: 200.00,
            tds_rate: 5.00
          };
        }

        const attendanceSummary = await attendanceModel.getMonthlySummary(emp.id, m, y);
        const calc = calculateEmployeePayroll(salaryStructure, attendanceSummary, { workingDays });

        totalGross = totalGross.plus(new Decimal(calc.grossSalary));
        totalDeductions = totalDeductions.plus(new Decimal(calc.totalDeductions));
        totalNet = totalNet.plus(new Decimal(calc.netSalary));

        calculatedRecords.push({
          employee_id: emp.id,
          employee_code: emp.employee_code,
          employee_name: emp.full_name,
          department_name: emp.department_name,
          designation_title: emp.designation_title,
          ...calc
        });
      }

      const runId = await payrollModel.saveDraftPayroll(
        {
          month: m,
          year: y,
          run_date: payrollRunDate,
          working_days: workingDays,
          total_gross: toDecimalString(totalGross),
          total_deductions: toDecimalString(totalDeductions),
          total_net: toDecimalString(totalNet),
          user_id: req.session.user.id
        },
        calculatedRecords
      );

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'CREATE_PAYROLL_DRAFT',
        entity_type: 'payroll_runs',
        entity_id: runId,
        details: `Saved draft payroll for ${m}/${y} (${calculatedRecords.length} employees, Net: ₹${toDecimalString(totalNet)})`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        message: `Payroll draft for ${m}/${y} generated and saved successfully.`,
        runId
      });
    } catch (err) {
      if (err.code === 'PAYROLL_ALREADY_FINALIZED') {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * Update Payroll Status (Draft -> Pending Approval -> Approved -> Finalized)
   */
  async updateStatus(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, notes } = req.body;

      const allowedStatuses = ['Draft', 'Pending Approval', 'Approved', 'Finalized'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid payroll status specified.' });
      }

      await payrollModel.updateStatus(id, status, req.session.user.id, notes);

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: `PAYROLL_${status.toUpperCase().replace(/\s+/g, '_')}`,
        entity_type: 'payroll_runs',
        entity_id: id,
        details: `Payroll run #${id} status updated to '${status}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Payroll run #${id} has been marked as '${status}'.`
      });
    } catch (err) {
      if (err.code === 'IMMUTABLE_FINALIZED_RECORD') {
        return res.status(400).json({ success: false, message: err.message });
      }
      next(err);
    }
  },

  /**
   * Authorized Reversal / Adjustment workflow for Finalized Payroll
   */
  async reversePayroll(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { reason } = req.body;

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({
          success: false,
          message: 'An audit explanation/reason (minimum 5 characters) is required for payroll reversal.'
        });
      }

      await payrollModel.reversePayroll(id, req.session.user.id, reason.trim());

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'PAYROLL_REVERSAL',
        entity_type: 'payroll_runs',
        entity_id: id,
        details: `Reversed payroll run #${id} back to Draft. Reason: ${reason.trim()}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Payroll run #${id} reversed to Draft status. Adjustments can now be made.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = payrollController;
