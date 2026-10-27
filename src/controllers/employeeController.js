/**
 * Employee Controller
 * Complete CRUD, search, filter, pagination, and soft deactivation
 */
const employeeModel = require('../models/employeeModel');
const salaryModel = require('../models/salaryModel');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const { generateEmployeeCode } = require('../utils/helpers');

const employeeController = {
  async getEmployees(req, res, next) {
    try {
      const { search = '', departmentId = null, status = '', page = 1, limit = 10 } = req.query;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;

      const [employees, total] = await Promise.all([
        employeeModel.findAll({
          search,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          status,
          page: pageNum,
          limit: limitNum
        }),
        employeeModel.countAll({
          search,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          status
        })
      ]);

      const totalPages = Math.ceil(total / limitNum) || 1;

      res.json({
        success: true,
        data: employees,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async getEmployeeById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const user = req.session.user;

      // Role authorization: Employee can only view their own record
      if (user.role === 'employee' && user.employee_id !== id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only allowed to view your own employee profile.'
        });
      }

      const employee = await employeeModel.findById(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found.'
        });
      }

      // If requested by an admin who needs to edit banking details, allow full account, otherwise masked
      if (user.role !== 'admin') {
        delete employee.bank_account_number; // Never send unmasked bank account to non-admin
      }

      const salaryStructure = await salaryModel.findByEmployeeId(id);

      res.json({
        success: true,
        employee,
        salaryStructure
      });
    } catch (err) {
      next(err);
    }
  },

  async createEmployee(req, res, next) {
    try {
      const {
        first_name, last_name, email, phone, date_of_birth, gender,
        address, joining_date, department_id, designation_id,
        basic_salary, bank_name, bank_account_number, bank_ifsc, pan_number,
        create_user_account, username, password
      } = req.body;

      // Unique email check
      const existingEmail = await employeeModel.findByEmail(email.trim());
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'An employee with this email address already exists.'
        });
      }

      // Generate next employee code
      const seq = await employeeModel.getNextSequence();
      const employee_code = generateEmployeeCode(seq);

      let userId = null;
      if (create_user_account && username && password) {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(password, 10);
        userId = await userModel.create({
          username: username.trim(),
          email: email.trim(),
          password_hash: hash,
          role: 'employee',
          is_active: 1
        });
      }

      const employeeId = await employeeModel.create({
        user_id: userId,
        employee_code,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date_of_birth: date_of_birth || null,
        gender: gender || 'Other',
        address: address || null,
        joining_date,
        department_id: parseInt(department_id, 10),
        designation_id: parseInt(designation_id, 10),
        status: 'Active',
        basic_salary: parseFloat(basic_salary) || 0.00,
        bank_name: bank_name || null,
        bank_account_number: bank_account_number || null,
        bank_ifsc: bank_ifsc || null,
        pan_number: pan_number || null
      });

      // Automatically initialize default salary structure for new employee
      await salaryModel.upsert(employeeId, {
        basic_salary: parseFloat(basic_salary) || 0.00,
        hra_type: 'percentage',
        hra_value: 40.00,
        other_allowances: 0.00,
        overtime_hourly_rate: 0.00,
        pf_applicable: 1,
        pf_rate: 12.00,
        pt_applicable: 1,
        pt_amount: 200.00,
        tds_rate: 5.00
      });

      // Audit log
      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'CREATE_EMPLOYEE',
        entity_type: 'employees',
        entity_id: employeeId,
        details: `Created employee ${first_name} ${last_name} (${employee_code})`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        message: `Employee ${first_name} ${last_name} created successfully with ID ${employee_code}.`,
        employeeId,
        employeeCode: employee_code
      });
    } catch (err) {
      next(err);
    }
  },

  async updateEmployee(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const {
        first_name, last_name, email, phone, date_of_birth, gender,
        address, joining_date, department_id, designation_id, status,
        basic_salary, bank_name, bank_account_number, bank_ifsc, pan_number
      } = req.body;

      const employee = await employeeModel.findById(id);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }

      // Unique email check if email is changed
      if (email && email.trim() !== employee.email) {
        const existingEmail = await employeeModel.findByEmail(email.trim());
        if (existingEmail && existingEmail.id !== id) {
          return res.status(400).json({
            success: false,
            message: 'An employee with this email address already exists.'
          });
        }
      }

      // If bank account is masked or empty in update, keep the original
      const finalBankAccount = (bank_account_number && !bank_account_number.includes('•'))
        ? bank_account_number
        : employee.bank_account_number;

      await employeeModel.update(id, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        date_of_birth: date_of_birth || null,
        gender: gender || 'Other',
        address: address || null,
        joining_date,
        department_id: parseInt(department_id, 10),
        designation_id: parseInt(designation_id, 10),
        status: status || 'Active',
        basic_salary: parseFloat(basic_salary) || employee.basic_salary,
        bank_name: bank_name || employee.bank_name,
        bank_account_number: finalBankAccount,
        bank_ifsc: bank_ifsc || employee.bank_ifsc,
        pan_number: pan_number || employee.pan_number
      });

      // Update basic salary in salary structure if changed
      if (basic_salary && parseFloat(basic_salary) !== parseFloat(employee.basic_salary)) {
        const currentSalary = await salaryModel.findByEmployeeId(id);
        if (currentSalary) {
          await salaryModel.upsert(id, {
            ...currentSalary,
            basic_salary: parseFloat(basic_salary)
          });
        }
      }

      // Audit log
      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'UPDATE_EMPLOYEE',
        entity_type: 'employees',
        entity_id: id,
        details: `Updated details for employee ${employee.employee_code}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Employee details updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Deactivate employee instead of permanent deletion to preserve historical payroll records
   */
  async deactivateEmployee(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status = 'Inactive', reason = '' } = req.body;

      const employee = await employeeModel.findById(id);
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found.' });
      }

      await employeeModel.deactivate(id, status);

      // Also deactivate corresponding user login account if linked
      if (employee.user_id) {
        await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [employee.user_id]);
      }

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'DEACTIVATE_EMPLOYEE',
        entity_type: 'employees',
        entity_id: id,
        details: `Employee ${employee.employee_code} status set to ${status}. Reason: ${reason || 'N/A'}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Employee ${employee.full_name} (${employee.employee_code}) has been ${status.toLowerCase()}. All historical payroll records remain preserved.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = employeeController;
