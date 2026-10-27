/**
 * Centralized Error Handling Middleware
 */

function notFoundHandler(req, res, next) {
  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({
      success: false,
      message: `Resource not found: ${req.method} ${req.originalUrl}`
    });
  }
  res.status(404).sendFile(require('path').join(__dirname, '../../public/404.html'));
}

function errorHandler(err, req, res, next) {
  // If response headers were already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error internally for debugging
  console.error('[SERVER ERROR]', err);

  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';

  const response = {
    success: false,
    message: err.message || 'Internal Server Error'
  };

  if (err.code) {
    response.code = err.code;
  }

  // Only include stack trace in development
  if (isDev) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
