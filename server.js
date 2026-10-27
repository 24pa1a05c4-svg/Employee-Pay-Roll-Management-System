/**
 * Employee Payroll Management System - Application Server
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const sessionConfig = require('./src/config/session');
const { csrfProtection, getCsrfToken } = require('./src/middleware/csrf');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const employeeRoutes = require('./src/routes/employeeRoutes');
const departmentRoutes = require('./src/routes/departmentRoutes');
const designationRoutes = require('./src/routes/designationRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const leaveRoutes = require('./src/routes/leaveRoutes');
const salaryRoutes = require('./src/routes/salaryRoutes');
const payrollRoutes = require('./src/routes/payrollRoutes');
const payslipRoutes = require('./src/routes/payslipRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const userRoutes = require('./src/routes/userRoutes');

const app = express();

// Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // For inline vanilla JS modules & UI events
          'https://cdn.jsdelivr.net' // For Chart.js
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Body and Cookie Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session Management
app.use(session(sessionConfig));

// General API Rate Limiting
app.use('/api/', apiLimiter);

// CSRF Protection
app.use(csrfProtection);

// CSRF Token direct endpoint
app.get('/api/csrf-token', getCsrfToken);

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);

// Root redirect to dashboard/login
app.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard.html');
  }
  return res.redirect('/login.html');
});

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Listen only when not required as a test module
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Employee Payroll Management System is running!`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });
}

module.exports = app;
