/**
 * Attendance Controller
 * Manages daily attendance, duplicate prevention, and employee-scoped lookups
 */
const attendanceModel = require('../models/attendanceModel');
const employeeModel = require('../models/employeeModel');
const auditModel = require('../models/auditModel');
const { formatDateISO } = require('../utils/dateUtils');

const attendanceController = {
  async getAttendance(req, res, next) {
    try {
      const user = req.session.user;
      let { employeeId, departmentId, startDate, endDate, page = 1, limit = 50 } = req.query;

      // Role authorization: Employee can only view their own attendance records
      if (user.role === 'employee') {
        employeeId = user.employee_id;
      }

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 50;
      const offset = (pageNum - 1) * limitNum;

      const [attendanceList, total] = await Promise.all([
        attendanceModel.findAll({
          employeeId: employeeId ? parseInt(employeeId, 10) : null,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          startDate: startDate ? formatDateISO(startDate) : null,
          endDate: endDate ? formatDateISO(endDate) : null,
          limit: limitNum,
          offset
        }),
        attendanceModel.countAll({
          employeeId: employeeId ? parseInt(employeeId, 10) : null,
          departmentId: departmentId ? parseInt(departmentId, 10) : null,
          startDate: startDate ? formatDateISO(startDate) : null,
          endDate: endDate ? formatDateISO(endDate) : null
        })
      ]);

      res.json({
        success: true,
        data: attendanceList,
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

  async recordAttendance(req, res, next) {
    try {
      const { employee_id, attendance_date, status = 'Present', overtime_hours = 0, remarks } = req.body;

      const employee = await employeeModel.findById(parseInt(employee_id, 10));
      if (!employee) {
        return res.status(400).json({ success: false, message: 'Invalid employee selected.' });
      }

      // Check if employee is active
      if (employee.status !== 'Active') {
        return res.status(400).json({
          success: false,
          message: `Cannot record attendance: Employee is currently ${employee.status}.`
        });
      }

      try {
        const id = await attendanceModel.recordAttendance({
          employee_id: parseInt(employee_id, 10),
          attendance_date: formatDateISO(attendance_date),
          status,
          overtime_hours: parseFloat(overtime_hours) || 0,
          remarks: remarks ? remarks.trim() : null
        });

        await auditModel.logAction({
          user_id: req.session.user.id,
          action: 'RECORD_ATTENDANCE',
          entity_type: 'attendance',
          entity_id: id,
          details: `Recorded '${status}' for ${employee.employee_code} on ${attendance_date}`,
          ip_address: req.ip
        });

        res.status(201).json({
          success: true,
          message: `Attendance for ${employee.full_name} on ${attendance_date} recorded successfully as '${status}'.`,
          attendanceId: id
        });
      } catch (attErr) {
        if (attErr.code === 'DUPLICATE_ATTENDANCE' || attErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            success: false,
            message: `Attendance for ${employee.full_name} on ${attendance_date} has already been recorded. Use edit to update.`
          });
        }
        throw attErr;
      }
    } catch (err) {
      next(err);
    }
  },

  async updateAttendance(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { status, overtime_hours = 0, remarks } = req.body;

      await attendanceModel.updateAttendance(id, {
        status,
        overtime_hours: parseFloat(overtime_hours) || 0,
        remarks: remarks ? remarks.trim() : null
      });

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'UPDATE_ATTENDANCE',
        entity_type: 'attendance',
        entity_id: id,
        details: `Updated attendance record #${id} to '${status}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Attendance record updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  async getMonthlySummary(req, res, next) {
    try {
      const user = req.session.user;
      let employeeId = parseInt(req.params.employeeId, 10);
      const { month, year } = req.query;

      if (user.role === 'employee') {
        employeeId = user.employee_id;
      }

      const summary = await attendanceModel.getMonthlySummary(
        employeeId,
        parseInt(month, 10),
        parseInt(year, 10)
      );

      res.json({
        success: true,
        summary
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = attendanceController;
