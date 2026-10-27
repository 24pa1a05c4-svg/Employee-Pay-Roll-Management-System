/**
 * CSRF Protection Middleware
 * Validates X-CSRF-Token header or _csrf body parameter on state-changing requests
 */
const crypto = require('crypto');

function csrfProtection(req, res, next) {
  // Ensure session has a CSRF token
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  // Safe read-only HTTP methods do not require CSRF token validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Bypass for testing if explicitly enabled
  if (process.env.NODE_ENV === 'test' && req.headers['x-bypass-csrf'] === 'true') {
    return next();
  }

  // Check header and body
  const clientToken = req.headers['x-csrf-token'] || req.body?._csrf;

  if (!clientToken || clientToken !== req.session.csrfToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Please refresh the page and try again.'
    });
  }

  next();
}

/**
 * Route handler to get or refresh current CSRF token
 */
function getCsrfToken(req, res) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.json({
    success: true,
    csrfToken: req.session.csrfToken
  });
}

module.exports = {
  csrfProtection,
  getCsrfToken
};
