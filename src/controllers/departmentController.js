/**
 * Department Controller
 * Handles department management, employee counts, and safe deletion prevention
 */
const departmentModel = require('../models/departmentModel');
const auditModel = require('../models/auditModel');

const departmentController = {
  async getDepartments(req, res, next) {
    try {
      const departments = await departmentModel.findAllWithCount();
      res.json({
        success: true,
        data: departments
      });
    } catch (err) {
      next(err);
    }
  },

  async getDepartmentById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const department = await departmentModel.findById(id);
      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }
      res.json({ success: true, department });
    } catch (err) {
      next(err);
    }
  },

  async createDepartment(req, res, next) {
    try {
      const { name, code, description } = req.body;

      const existing = await departmentModel.findByNameOrCode(name.trim(), code.trim());
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'A department with this name or code already exists.'
        });
      }

      const id = await departmentModel.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description ? description.trim() : null
      });

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'CREATE_DEPARTMENT',
        entity_type: 'departments',
        entity_id: id,
        details: `Created department '${name}' (${code})`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        message: `Department '${name}' created successfully.`,
        departmentId: id
      });
    } catch (err) {
      next(err);
    }
  },

  async updateDepartment(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, code, description } = req.body;

      const department = await departmentModel.findById(id);
      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      const existing = await departmentModel.findByNameOrCode(name.trim(), code.trim(), id);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another department with this name or code already exists.'
        });
      }

      await departmentModel.update(id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description ? description.trim() : null
      });

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'UPDATE_DEPARTMENT',
        entity_type: 'departments',
        entity_id: id,
        details: `Updated department '${name}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Department updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteDepartment(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const department = await departmentModel.findById(id);
      if (!department) {
        return res.status(404).json({ success: false, message: 'Department not found.' });
      }

      try {
        await departmentModel.delete(id);
      } catch (deletionErr) {
        return res.status(400).json({
          success: false,
          message: deletionErr.message
        });
      }

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'DELETE_DEPARTMENT',
        entity_type: 'departments',
        entity_id: id,
        details: `Deleted department '${department.name}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Department '${department.name}' deleted successfully.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = departmentController;
