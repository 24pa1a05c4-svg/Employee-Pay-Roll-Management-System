/**
 * Validation Middleware Wrapper
 * Collects express-validator errors and formats them into a clean JSON response
 */
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMap = {};
    errors.array().forEach(err => {
      if (!errorMap[err.path]) {
        errorMap[err.path] = err.msg;
      }
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please correct the highlighted errors.',
      errors: errorMap,
      errorList: errors.array().map(e => e.msg)
    });
  }
  next();
}

module.exports = {
  validate
};
