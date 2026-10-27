/**
 * Authentication and Role Authorization Middleware
 */

/**
 * Require active logged-in user session
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in to proceed.'
      });
    }
    return res.redirect('/login.html');
  }
  next();
}

/**
 * Require specific user role(s), e.g. 'admin'
 * @param  {...string} roles 
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }
      return res.redirect('/login.html');
    }

    const userRole = req.session.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to perform this action.'
      });
    }

    next();
  };
}

/**
 * Require that an employee can only access their own record, unless user is admin
 */
function requireSelfOrAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const user = req.session.user;
  if (user.role === 'admin') {
    return next();
  }

  // If employee, check if target employeeId belongs to this user
  const requestedEmployeeId = parseInt(req.params.id || req.params.employeeId || req.query.employeeId, 10);
  if (!user.employee_id || user.employee_id !== requestedEmployeeId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Employees can only view their own profile and records.'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireRole,
  requireSelfOrAdmin
};
