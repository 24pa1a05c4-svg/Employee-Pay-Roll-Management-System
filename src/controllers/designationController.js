/**
 * Designation Controller
 * Handles designations per department
 */
const designationModel = require('../models/designationModel');
const departmentModel = require('../models/departmentModel');
const auditModel = require('../models/auditModel');

const designationController = {
  async getDesignations(req, res, next) {
    try {
      const { departmentId } = req.query;
      const deptId = departmentId ? parseInt(departmentId, 10) : null;
      const designations = await designationModel.findAll(deptId);
      res.json({
        success: true,
        data: designations
      });
    } catch (err) {
      next(err);
    }
  },

  async getDesignationById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const designation = await designationModel.findById(id);
      if (!designation) {
        return res.status(404).json({ success: false, message: 'Designation not found.' });
      }
      res.json({ success: true, designation });
    } catch (err) {
      next(err);
    }
  },

  async createDesignation(req, res, next) {
    try {
      const { department_id, title, code, description } = req.body;

      const dept = await departmentModel.findById(parseInt(department_id, 10));
      if (!dept) {
        return res.status(400).json({ success: false, message: 'Invalid department selected.' });
      }

      const id = await designationModel.create({
        department_id: parseInt(department_id, 10),
        title: title.trim(),
        code: code.trim().toUpperCase(),
        description: description ? description.trim() : null
      });

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'CREATE_DESIGNATION',
        entity_type: 'designations',
        entity_id: id,
        details: `Created designation '${title}' (${code}) for department '${dept.name}'`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        message: `Designation '${title}' created successfully.`,
        designationId: id
      });
    } catch (err) {
      next(err);
    }
  },

  async updateDesignation(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { department_id, title, code, description } = req.body;

      const designation = await designationModel.findById(id);
      if (!designation) {
        return res.status(404).json({ success: false, message: 'Designation not found.' });
      }

      await designationModel.update(id, {
        department_id: parseInt(department_id, 10),
        title: title.trim(),
        code: code.trim().toUpperCase(),
        description: description ? description.trim() : null
      });

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'UPDATE_DESIGNATION',
        entity_type: 'designations',
        entity_id: id,
        details: `Updated designation '${title}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: 'Designation updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteDesignation(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const designation = await designationModel.findById(id);
      if (!designation) {
        return res.status(404).json({ success: false, message: 'Designation not found.' });
      }

      try {
        await designationModel.delete(id);
      } catch (deletionErr) {
        return res.status(400).json({
          success: false,
          message: deletionErr.message
        });
      }

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'DELETE_DESIGNATION',
        entity_type: 'designations',
        entity_id: id,
        details: `Deleted designation '${designation.title}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Designation '${designation.title}' deleted successfully.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = designationController;
