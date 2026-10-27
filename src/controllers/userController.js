/**
 * User Account Management Controller
 */
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const employeeModel = require('../models/employeeModel');
const auditModel = require('../models/auditModel');
const db = require('../config/db');

const userController = {
  async getUsers(req, res, next) {
    try {
      const users = await userModel.getAll();
      res.json({
        success: true,
        data: users
      });
    } catch (err) {
      next(err);
    }
  },

  async createUser(req, res, next) {
    try {
      const { username, email, password, role = 'employee', employee_id } = req.body;

      const existing = await userModel.findByUsernameOrEmail(username.trim());
      if (existing) {
        return res.status(400).json({ success: false, message: 'Username is already taken.' });
      }

      const existingEmail = await userModel.findByUsernameOrEmail(email.trim());
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email is already registered.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const userId = await userModel.create({
        username: username.trim(),
        email: email.trim(),
        password_hash: hash,
        role,
        is_active: 1
      });

      // Link to employee if provided
      if (employee_id) {
        await db.execute('UPDATE employees SET user_id = ? WHERE id = ?', [userId, parseInt(employee_id, 10)]);
      }

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'CREATE_USER',
        entity_type: 'users',
        entity_id: userId,
        details: `Created user account '${username}' with role '${role}'`,
        ip_address: req.ip
      });

      res.status(201).json({
        success: true,
        message: `User account '${username}' created successfully.`,
        userId
      });
    } catch (err) {
      next(err);
    }
  },

  async toggleActive(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Prevent deactivating own account
      if (req.session.user.id === id) {
        return res.status(400).json({ success: false, message: 'You cannot deactivate your own administrative account.' });
      }

      const newStatus = user.is_active ? 0 : 1;
      await db.execute('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'TOGGLE_USER_STATUS',
        entity_type: 'users',
        entity_id: id,
        details: `Set user '${user.username}' active status to ${newStatus}`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `User '${user.username}' is now ${newStatus ? 'active' : 'inactive'}.`
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { new_password } = req.body;

      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      }

      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const hash = await bcrypt.hash(new_password, 10);
      await userModel.updatePassword(id, hash);

      await auditModel.logAction({
        user_id: req.session.user.id,
        action: 'RESET_PASSWORD',
        entity_type: 'users',
        entity_id: id,
        details: `Reset password for user '${user.username}'`,
        ip_address: req.ip
      });

      res.json({
        success: true,
        message: `Password for '${user.username}' has been updated successfully.`
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = userController;
