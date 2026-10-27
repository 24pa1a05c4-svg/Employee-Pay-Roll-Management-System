/**
 * Leave Controller
 * Manages leave requests, date validation, overlap prevention, and admin approvals
 */
const leaveModel = require('../models/leaveModel');
const employeeModel = require('../models/employeeModel');
const auditModel = require('../models/auditModel');
const { formatDateISO } = require('../utils/dateUtils');

const leaveController = {
  async getLeaveRequests(req, res, next) {
    try {
      const user = req.session.user;
      let { employeeId, departmentId, status, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Role authorization: Employees can only view their own leave requests
      if (user.role === 'employee') {
        employeeId = user.employee_id;
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const offset = (pageNum - 1) * limitNum;

      const [leaveRequests, total] = await Promise.all([
        leaveModel.findAll({
          employeeId: employeeId ? parseInt(employeeId, 10) : null,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          status,
          startDate: startDate ? formatDateISO(startDate) : null,
          endDate: endDate ? formatDateISO(endDate) : null,
          limit: limitNum,
          offset
        }),
        leaveModel.countAll({
          employeeId: employeeId ? parseInt(employeeId, 10) : null,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          status,
          startDate: startDate ? formatDateISO(startDate) : null,
          endDate: endDate ? formatDateISO(endDate) : null
        })
      ]);

      res.json({
        success: true,
        data: leaveRequests,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async createLeaveRequest(req, res, next) {
    try {
      const user = req.session.user;
      let { employee_id, leave_type, start_date, end_date, reason } = req.body;

      // If user is employee, force employee_id to be their own
      if (user.role === 'employee') {
        employee_id = user.employee_id;
      }

      if (!employee_id) {
        return res.status(400).json({ success: false, message: 'Employee ID is required.' });
      }

      const employee = await employeeModel.findById(parseInt(employee_id, 10));
      if (!employee) {
        return res.status(400).json({ success: false, message: 'Invalid employee.' });
      }

      // Date validation
      const start = new Date(start_date);
      const end = new Date(end_date);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid start or end date.' });
      }

      if (end < start) {
        return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
      }

      // Calculate days count
      const diffTime = Math.abs(end - start);
      const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      try {
        const id = await leaveModel.create({
          employee_id: parseInt(employee_id, 10),
          leave_type,
          start_date: formatDateISO(start_date),
          end_date: formatDateISO(end_date),
          days_count: daysCount,
          reason: reason ? reason.trim() : ''
        });

        await auditModel.logAction({
          user_id: user.id,
          action: 'APPLY_LEAVE',
          entity_type: 'leave_requests',
          entity_id: id,
          details: `Leave requested (${leave_type}, ${daysCount} days: ${start_date} to ${end_date}) for ${employee.employee_code}`,
          ip_address: req.ip
        });

        res.status(201).json({
          success: true,
          message: 'Leave request submitted successfully and is awaiting review.',
          leaveId: id,
          daysCount
        });
      } catch (leaveErr) {
        if (leaveErr.code === 'OVERLAPPING_LEAVE') {
          return res.status(409).json({
            success: false,
            message: leaveErr.message
          });
        }
        throw leaveErr;
      }
    } catch (err) {
      next(err);
    }
  },

  async reviewLeaveRequest(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, admin_remarks } = req.body;

      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be either Approved or Rejected.'
        });
      }

      const leave = await leaveModel.findById(id);
      if (!leave) {
        return res.status(404).json({ success: false, message: 'Leave request not found.' });
      }

      await leaveModel.updateStatus(id, {
        status,
        admin_remarks: admin_remarks ? admin_remarks.trim() : null,
        reviewed_by: req.session.user.id
      });

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: status === 'Approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
        entity_type: 'leave_requests',
        entity_id: id,
        details: `Leave request #${id} ${status} by Admin`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Leave request #${id} has been marked as ${status}.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = leaveController;
