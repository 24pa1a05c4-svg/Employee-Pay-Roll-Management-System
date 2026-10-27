/**
 * Authentication Controller
 * Handles user login, logout, session management, and current profile retrieval
 */
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const employeeModel = require('../models/employeeModel');
const auditModel = require('../models/auditModel');

const authController = {
  async login(req, res, next) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both username/email and password.'
        });
      }

      const user = await userModel.findByUsernameOrEmail(username.trim());
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.'
        });
      }

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'This account has been deactivated. Please contact your system administrator.'
        });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password.'
        });
      }

      // If user is an employee, retrieve their employee profile
      let employeeProfile = null;
      if (user.role === 'employee') {
        employeeProfile = await employeeModel.findByUserId(user.id);
      }

      // Regenerate session to prevent session fixation attacks
      req.session.regenerate(async (err) => {
        if (err) return next(err);

        req.session.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          employee_id: employeeProfile ? employeeProfile.id : null,
          employee_code: employeeProfile ? employeeProfile.employee_code : null,
          employee_name: employeeProfile ? employeeProfile.full_name : user.username
        };

        // Update last login
        await userModel.updateLastLogin(user.id);

        // Audit log
        await auditModel.logAction({
          user_id: user.id,
          action: 'USER_LOGIN',
          entity_type: 'users',
          entity_id: user.id,
          details: `User '${user.username}' logged in successfully with role '${user.role}'`,
          ip_address: req.ip
        });

        res.json({
          success: true,
          message: 'Login successful.',
          user: req.session.user
        });
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      const user = req.session?.user;
      if (user) {
        await auditModel.logAction({
          user_id: user.id,
          action: 'USER_LOGOUT',
          entity_type: 'users',
          entity_id: user.id,
          details: `User '${user.username}' logged out`,
          ip_address: req.ip
        });
      }

      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.json({
          success: true,
          message: 'Logged out successfully.'
        });
      });
    } catch (err) {
      next(err);
    }
  },

  async getCurrentUser(req, res, next) {
    try {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated.'
        });
      }

      let employee = null;
      if (req.session.user.employee_id) {
        employee = await employeeModel.findById(req.session.user.employee_id);
      }

      res.json({
        success: true,
        user: req.session.user,
        employee,
        csrfToken: req.session.csrfToken
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = authController;
