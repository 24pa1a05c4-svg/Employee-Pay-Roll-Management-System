# TechNova Enterprise Employee Payroll Management System

A production-grade, full-stack **Employee Payroll Management System** developed with **Node.js, Express.js, MySQL (mysql2), and Vanilla JavaScript**. Designed with an MVC architecture, strict role-based access control (RBAC), decimal-safe financial calculation engines (`Decimal.js`), A4 PDF payslip generation (`PDFKit`), interactive dashboard analytics (`Chart.js`), formula-injection-safe CSV reporting, and comprehensive automated test suites (`Jest`).

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Architecture & Folder Structure](#architecture--folder-structure)
5. [Prerequisites](#prerequisites)
6. [Environment Configuration](#environment-configuration)
7. [Database Setup & Seeding](#database-setup--seeding)
8. [Installation & Running the Application](#installation--running-the-application)
9. [Initial Admin Setup & Demo Accounts](#initial-admin-setup--demo-accounts)
10. [Automated Testing Suite](#automated-testing-suite)
11. [Payroll & Statutory Tax Calculation Engine](#payroll--statutory-tax-calculation-engine)
12. [Security Architecture](#security-architecture)
13. [Screenshots & UI Walkthrough](#screenshots--ui-walkthrough)
14. [Limitations & Future Enhancements](#limitations--future-enhancements)

---

## 1. Project Overview

The **TechNova Employee Payroll Management System** provides automated compensation processing, attendance tracking, leave governance, and statutory tax compliance for medium to large enterprises.

### Core Objectives:
- **Financial Precision**: Zero floating-point arithmetic errors using `Decimal.js` for all earnings, tax slabs, and loss-of-pay deductions.
- **Strict Role-Based Isolation**: Employees can only inspect their own attendance, leave, salary structure, and payslips; administrative workflows (payroll approval, salary configuration, employee management) require elevated privileges.
- **Audit-Logged Payroll Workflow**: 4-state lifecycle (`Draft` &rarr; `Pending Approval` &rarr; `Approved` &rarr; `Finalized`). Finalized records are immutable and can only be corrected through an authorized reversal workflow with mandatory audit trail logging.
- **No Heavy Framework Overhead**: Built without React, Angular, or TypeScript, making it accessible, maintainable, and ideal for demonstrations, educational evaluations (e.g., B.Tech CSE Capstone), and corporate HR operations.

---

## 2. Key Features

### Role-Based Access Control
- **Administrator / HR Manager**:
  - Full employee lifecycle management (creation, profile view, editing, soft deactivation).
  - Department and designation management with live employee count and deletion protection.
  - Salary structure configuration (HRA %, basic pay, other allowances, PF %, PT, demo TDS %, overtime rates).
  - Attendance recording with duplicate-day prevention.
  - Leave approval or rejection workflow.
  - Monthly payroll generation, review, approval, and finalization.
  - Company-wide payroll analytics and formula-safe CSV exports.
  - User account administration and audit trail logs.
- **Employee**:
  - View personal profile and current salary structure.
  - Submit leave requests with automatic date-overlap validation.
  - View personal attendance history and monthly working-day summaries.
  - View historical salary records and download official A4 PDF payslips.

### Enterprise Payroll Lifecycle
1. **Selection**: Choose payroll month and year.
2. **Dynamic Aggregation**: Automatically compiles attendance, overtime hours, and approved unpaid leave (LWP) days.
3. **Calculation**: Evaluates Basic, HRA, Other Allowances, Overtime, Performance Bonus, PF (12%), PT (₹200), and TDS.
4. **Draft & Preview**: HR reviews line-item totals before approval.
5. **Approval**: Administrative approval locks the run.
6. **Finalization & Payslips**: Atomic database transactions commit historical snapshots and generate unique payslips (`PAY-YYYYMM-XXXX`).
7. **Reversal Workflow**: Immutability safeguard with required textual justification and audit log.

### Attendance & Leave Management
- Daily status logging: `Present`, `Absent`, `Half Day`, `On Leave`.
- Duplicate attendance prevention for identical employee and date.
- Leave types: `Paid`, `Casual`, `Sick`, `Unpaid`, `Maternity`, `Paternity`.
- Interval overlap prevention: `(new_start <= existing_end AND new_end >= existing_start)`.
- Loss of Pay (LWP) deduction: `(Basic Salary / Working Days) * Unpaid Days`.

### PDF Payslip Generation
- Standard A4 layout generated with `PDFKit`.
- Features company header, employee metadata, masked bank account details (`••••••••1234`), itemized earnings and deductions table, net salary in Indian Rupees (`₹`), statutory disclaimer, and dual authorization signature blocks.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern custom design system, Navy/Blue/White palette), Vanilla JavaScript (ES6+ modular controllers) |
| **Backend** | Node.js (v18+ or v24), Express.js (v5) |
| **Database** | MySQL 8.0+ / MariaDB via `mysql2/promise` connection pool |
| **Financial Math** | `decimal.js` (20-digit precision, half-up rounding) |
| **Authentication** | `express-session` with `session-file-store`, `bcryptjs` password hashing |
| **Security** | `helmet` (CSP, HSTS), Custom Double-Submit CSRF, `express-rate-limit`, `express-validator` |
| **PDF Generation** | `PDFKit` (Vector PDF document streaming) |
| **Charts** | `Chart.js` (Expense trends and department headcount distribution) |
| **Testing** | `Jest` (v30), `supertest` |

---

## 4. Architecture & Folder Structure

```
Employee Pay Roll Management System/
├── .env                          # Local environment variables
├── .env.example                  # Template configuration file
├── .gitignore                    # Git exclusions
├── package.json                  # Dependencies and scripts
├── server.js                     # Main application entry point
├── database/
│   ├── schema.sql                # 11 normalized tables with foreign keys and indexes
│   ├── seed.sql                  # Comprehensive realistic fictional test data
│   ├── init.js                   # Node script to execute schema.sql via mysql2
│   └── seed.js                   # Node script to execute seed.sql via mysql2
├── scripts/
│   └── create-admin.js           # CLI utility for initial admin account setup
├── public/                       # Frontend UI assets
│   ├── 404.html                  # Custom 404 error page
│   ├── login.html                # Enterprise login portal
│   ├── dashboard.html            # Metrics, statistics cards, and Chart.js graphs
│   ├── employees.html            # Employee CRUD, search, filter, and pagination
│   ├── departments.html          # Department & designation management
│   ├── attendance.html           # Daily attendance logging & filterable records
│   ├── leave.html                # Leave applications and admin review workflow
│   ├── payroll.html              # 4-stage payroll processing & payslips
│   ├── reports.html              # Analytical reporting & CSV exports
│   ├── profile.html              # Personal profile & payslip downloads
│   ├── css/
│   │   ├── variables.css         # Design tokens, color palette, typography
│   │   ├── base.css              # Reset, typography, utility classes
│   │   ├── layout.css            # Sidebar, top navigation bar, responsive grid
│   │   ├── components.css        # Cards, badges, buttons, modals, toasts
│   │   └── pages.css             # Page-specific responsive stylesheets
│   ├── js/
│   │   ├── api.js                # Centralized fetch wrapper with CSRF automation
│   │   ├── app.js                # Global sidebar, header, active route, profile
│   │   ├── toast.js              # Accessible toast notifications
│   │   ├── modal.js              # Reusable modal dialog controller
│   │   ├── auth.js               # Client authentication logic
│   │   ├── dashboard.js          # Dashboard analytics & Chart.js rendering
│   │   ├── employees.js          # Employee CRUD modal & pagination handlers
│   │   ├── departments.js        # Department & designation CRUD
│   │   ├── attendance.js         # Attendance modal, table, and date filters
│   │   ├── leave.js              # Leave submission & admin approval logic
│   │   ├── payroll.js            # Payroll calculation preview, approval & payslips
│   │   ├── reports.js            # Filterable reports & formula-safe CSV export
│   │   └── profile.js            # Profile rendering & personal payslip table
│   └── images/
│       ├── logo.svg              # TechNova branding vector logo
│       └── favicon.svg           # Application favicon
├── src/
│   ├── config/
│   │   ├── db.js                 # mysql2/promise connection pool
│   │   └── session.js            # express-session file store configuration
│   ├── controllers/              # Express request/response controllers
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── employeeController.js
│   │   ├── departmentController.js
│   │   ├── designationController.js
│   │   ├── attendanceController.js
│   │   ├── leaveController.js
│   │   ├── salaryController.js
│   │   ├── payrollController.js
│   │   ├── payslipController.js
│   │   ├── reportController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js               # requireAuth, requireRole, requireSelfOrAdmin
│   │   ├── csrf.js               # Double-submit CSRF protection middleware
│   │   ├── rateLimiter.js        # Brute-force and API rate limiters
│   │   ├── validator.js          # express-validator error formatter
│   │   └── errorHandler.js       # Centralized 404 & 500 error handlers
│   ├── models/                   # Parameterized SQL database abstraction models
│   │   ├── userModel.js
│   │   ├── employeeModel.js
│   │   ├── departmentModel.js
│   │   ├── designationModel.js
│   │   ├── attendanceModel.js
│   │   ├── leaveModel.js
│   │   ├── salaryModel.js
│   │   ├── payrollModel.js
│   │   └── auditModel.js
│   ├── routes/                   # Modular API routers
│   ├── services/
│   │   ├── payrollCalculationService.js # Decimal.js payroll computation engine
│   │   ├── payslipPdfService.js         # PDFKit payslip layout builder
│   │   └── csvExportService.js          # CWE-1236 safe CSV export engine
│   └── utils/
│       ├── currency.js           # Indian Rupee (₹) and Decimal.js formatters
│       ├── dateUtils.js          # DD/MM/YYYY Indian date utilities
│       └── helpers.js            # Bank masking, CSV escaping, reference generator
└── tests/
    ├── salaryCalculation.test.js # Financial engine unit tests
    ├── attendanceAndLeave.test.js# Duplicate attendance & leave overlap tests
    ├── authAndPayslip.test.js    # RBAC & payslip isolation tests
    ├── payrollWorkflow.test.js   # Lifecycle transitions & immutability tests
    ├── validation.test.js        # Express-validator schema tests
    ├── payslipPdf.test.js        # PDFKit stream generation test
    └── apiRoutes.test.js         # Supertest integration tests
```

---

## 5. Prerequisites

Before running the application, ensure the following are installed on your host system:
1. **Node.js**: v18.0.0 or later (v20+ recommended). Check via `node -v`.
2. **npm**: v9.0.0 or later. Check via `npm -v`.
3. **MySQL Server**: v8.0 or MariaDB 10.5+. Ensure the MySQL service is started (e.g., via MySQL Workbench, XAMPP, Docker, or native Windows Services).

---

## 6. Environment Configuration

Copy the sample environment file to `.env`:
```powershell
cp .env.example .env
```

Review and adjust the credentials in `.env` to match your local MySQL configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=payroll_management_db

# Session Secret (Change in production)
SESSION_SECRET=e7b4a2c910df483a9082bc71e3d48fa09e32

# Company Details for Payslips & Reports
COMPANY_NAME=TechNova Solutions Pvt. Ltd.
COMPANY_ADDRESS=Plot 42, Hitech City, Madhapur, Hyderabad, Telangana - 500081
COMPANY_EMAIL=payroll@technova.example.com
COMPANY_PHONE=+91 40 4567 8900
COMPANY_WEBSITE=www.technova.example.com
```

---

## 7. Database Setup & Seeding

The application includes automated Node scripts that communicate directly with MySQL using `mysql2/promise`.

### Step 1: Initialize Database Schema
Creates the database `payroll_management_db` and builds all 11 normalized tables, constraints, foreign keys, and indexes:
```powershell
npm run db:init
```

### Step 2: Seed Realistic Demo Data
Populates 5 departments, 10 designations, 8 active employees, full salary structures, 30 days of attendance, leave records, 2 finalized monthly payroll runs (August & September 2026), and 1 draft run (October 2026):
```powershell
npm run db:seed
```

---

## 8. Installation & Running the Application

### 1. Install Dependencies
```powershell
npm install
```

### 2. Start the Server
- **Production Mode**:
  ```powershell
  npm start
  ```
- **Development Mode** (with automatic reload on file changes):
  ```powershell
  npm run dev
  ```

### 3. Open in Browser
Navigate to:
```
http://localhost:3000
```
Unauthenticated requests are automatically routed to `http://localhost:3000/login.html`.

---

## 9. Initial Admin Setup & Demo Accounts

### Secure Admin Creation Tool (CLI)
In accordance with production security standards, there is **no public registration endpoint**. To create or reset an administrator account:
```powershell
node scripts/create-admin.js <username> <email> <password>
```
*Example:*
```powershell
node scripts/create-admin.js admin admin@technova.example.com Admin@123
```

### Pre-Seeded Demo Accounts (Available after running `npm run db:seed`):

| Role | Username | Password | Notes |
|---|---|---|---|
| **System Administrator** | `admin` | `Admin@123` | Full access to all modules, settings, and finalization |
| **HR Manager** | `hr_manager` | `Hr@123` | Full employee, attendance, leave, and payroll processing access |
| **Employee (Engineering)** | `rajesh.k` | `Emp@123` | Rajesh Kumar (Sr. Software Engineer, Basic: ₹75,000) |
| **Employee (Engineering)** | `priya.s` | `Emp@123` | Priya Sharma (DevOps Engineer, Basic: ₹68,000) |
| **Employee (Marketing)** | `vikram.m` | `Emp@123` | Vikram Malhotra (Marketing Lead, Basic: ₹62,000) |
| **Employee (Finance)** | `ananya.i` | `Emp@123` | Ananya Iyer (Financial Analyst, Basic: ₹58,000) |

---

## 10. Automated Testing Suite

The project includes unit and integration tests built with **Jest** and **Supertest**. The tests validate all business formulas, edge cases, date boundaries, and security rules.

### Run All Tests:
```powershell
npm test
```

### Test Coverage Highlights:
- **`tests/salaryCalculation.test.js`**:
  - Exact Decimal.js addition of Basic, HRA (40%), Allowances, Bonus, Overtime.
  - Loss-of-Pay (LWP) deduction formula: `(Basic / Working Days) * Unpaid Days`.
  - Statutory PF (12% of basic), Professional Tax (₹200), and TDS (5% on taxable gross minus PF).
  - Indian Rupee currency formatting (`₹70,100.00`).
  - Net salary zero-flooring when deductions exceed gross earnings.
- **`tests/attendanceAndLeave.test.js`**:
  - Duplicate attendance prevention for identical employee and date.
  - Overlapping leave interval detection: `(start <= existing_end AND end >= existing_start)`.
  - Inclusive calendar days computation and working-day calculations.
- **`tests/authAndPayslip.test.js`**:
  - Bcrypt password hashing and verification.
  - Sensitive bank account masking (showing only last 4 digits).
  - CSV formula injection sanitization (CWE-1236 protection).
  - RBAC middleware (`requireAuth`, `requireRole`, `requireSelfOrAdmin`).
  - Strict tenant isolation: prevents employee A from accessing employee B's payslip or salary history.
- **`tests/payrollWorkflow.test.js`**:
  - Duplicate payroll run prevention for identical month & year.
  - Complete status lifecycle: `Draft` &rarr; `Pending Approval` &rarr; `Approved` &rarr; `Finalized`.
  - Finalized records immutability enforcement.
  - Authorized reversal workflow requiring minimum 10-character justification with audit trail logging.
- **`tests/validation.test.js`**:
  - Input validation schemas for employees, leave requests, and salary structures.
  - Inverted date validation (end date before start date).
- **`tests/payslipPdf.test.js`**:
  - Stream and buffer generation via `PDFKit` verifying standard `%PDF-` document headers.
- **`tests/apiRoutes.test.js`**:
  - HTTP integration tests verifying CSRF token issuance, unauthenticated 401 redirects, and custom 404 handler.

---

## 11. Payroll & Statutory Tax Calculation Engine

### 1. Calculation Formulas

#### Gross Earnings
$$\text{Gross Salary} = \text{Basic Salary} + \text{HRA} + \text{Other Allowances} + \text{Bonus} + \text{Overtime Earnings}$$

- **Basic Salary**: Base fixed monthly compensation.
- **HRA (House Rent Allowance)**: Configurable as a percentage of Basic (default: 40%) or fixed monthly amount.
- **Other Allowances**: Conveyance, medical, and special allowances.
- **Overtime Earnings**: $\text{Overtime Hours} \times \text{Configured Hourly Rate}$.
- **Performance Bonus**: Discretionary monthly/quarterly addition.

#### Statutory Deductions
$$\text{Total Deductions} = \text{PF} + \text{PT} + \text{TDS} + \text{Unpaid Leave (LWP)} + \text{Other Deductions}$$

- **Provident Fund (PF)**: $12\%$ of Basic Salary (if configured as applicable).
- **Professional Tax (PT)**: ₹200.00 standard state monthly tax.
- **Tax Deducted at Source (TDS)**: Configurable demo assumption rate (e.g., $5\%$) applied on $(\text{Gross} - \text{PF})$.
  > *Disclaimer*: Statutory and tax rates provided in this system are demo assumptions and can be configured per employee. This application does not claim legal tax advisory compliance.
- **Unpaid Leave (LWP) Deduction**:
  $$\text{LWP Deduction} = \left(\frac{\text{Basic Salary}}{\text{Working Days in Month}}\right) \times \text{Approved Unpaid Leave Days}$$

#### Net Salary Payable
$$\text{Net Salary} = \max(0, \text{Gross Salary} - \text{Total Deductions})$$

### 2. Concrete Example

**Employee**: Senior Software Engineer (Rajesh Kumar)  
**Month**: October 2026 (30 working days)  
**Attendance**: 21 Present Days, 1 Paid Leave Day, 2 Unpaid Leave Days, 4 Overtime Hours (@ ₹300/hr)

1. **Earnings**:
   - Basic Salary: ₹75,000.00
   - HRA (40% of Basic): ₹30,000.00
   - Other Allowances: ₹10,000.00
   - Overtime (4 hrs @ ₹300/hr): ₹1,200.00
   - Performance Bonus: ₹0.00
   - **Gross Salary**: ₹75,000 + ₹30,000 + ₹10,000 + ₹1,200 = **₹1,16,200.00**

2. **Deductions**:
   - Provident Fund (12% of Basic): ₹9,000.00
   - Professional Tax: ₹200.00
   - Unpaid Leave (2 days LWP): $(₹75,000 / 30) \times 2$ = ₹5,000.00
   - Taxable Base: ₹1,16,200 - ₹9,000 = ₹1,07,200.00
   - Demo TDS (5% of ₹1,07,200): ₹5,360.00
   - **Total Deductions**: ₹9,000 + ₹200 + ₹5,000 + ₹5,360 = **₹19,560.00**

3. **Net Salary Payable**:
   - Net = ₹1,16,200.00 - ₹19,560.00 = **₹96,640.00**

---

## 12. Security Architecture

- **Password Security**: Passwords hashed with `bcryptjs` (salt rounds: 10). Plain-text passwords are never logged or stored.
- **Parameterized SQL Queries**: All database queries in `src/models/` use `mysql2/promise` prepared statements with `?` placeholders, eliminating SQL Injection vulnerabilities.
- **CSRF Defense**: Double-submit CSRF cookie & header pattern (`X-CSRF-Token`). Validated on all state-changing HTTP verbs (`POST`, `PUT`, `DELETE`).
- **XSS & Content Security**: `Helmet` sets strict HTTP headers, restricting script execution sources and style origins.
- **CWE-1236 (Spreadsheet Formula Injection Prevention)**: In CSV report exports, all fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with a single apostrophe (`'`) and double-quoted.
- **Sensitive Data Masking**: Bank account numbers are masked in API responses, showing only the terminal 4 digits (`••••••••1234`).
- **Session Security**: Sessions stored server-side via `session-file-store` with `httpOnly`, `sameSite: 'lax'`, and configurable `secure` flags.

---

## 13. Screenshots & UI Walkthrough

*(Screenshots can be captured when running the UI on `http://localhost:3000`)*

### 1. Enterprise Login Portal
![Login Screen](public/images/logo.svg)  
*Clean two-column design featuring branding, platform highlights, quick demo credential buttons, and brute-force rate-limiting.*

### 2. HR & Payroll Overview Dashboard
- High-level metric cards: Total Active Employees, Department Count, Current Month Payroll Expense, and Pending Leave Requests.
- Monthly payroll expenditure bar chart and department headcount doughnut chart rendered with `Chart.js`.
- Quick-action shortcuts and recent payroll activity tables.

### 3. Employee Management
- Searchable, department-filtered, and paginated employee list.
- Add/Edit modal capturing contact details, joining date, department, designation, and masked banking credentials.
- Soft deactivation preserving payroll history.

### 4. Attendance & Leave Tracker
- Daily attendance logging with employee auto-complete and duplicate-day prevention.
- Employee leave application modal with date-overlap prevention.
- HR review interface to approve or reject leave with admin remarks.

### 5. Monthly Payroll Processing
- Month/Year selector with live status badge (`Draft`, `Pending Approval`, `Approved`, `Finalized`).
- Recalculate, review preview modal with itemized earnings and deductions.
- Finalization dialog and direct A4 PDF payslip download.

### 6. Analytical Reports
- Date-filtered payroll summaries, department-wise expenditure, and attendance records.
- Instant CSV export with formula injection protection.

---

## 14. Limitations & Future Enhancements

1. **Biometric Hardware Integration**: Currently, attendance is recorded via the web portal. Future versions could integrate with biometric fingerprint/face recognition devices via Webhooks.
2. **Multi-Currency Support**: Currently operates with Indian Rupees (`₹`). Future versions can introduce multi-currency conversion for multinational remote employees.
3. **Email Notification Pipeline**: Integration with Nodemailer / AWS SES to email payslips automatically upon finalization.
4. **Custom Tax Regimes**: Support for both Old and New Indian Income Tax Regimes with configurable 80C/80D investment declaration proofs.

---

**Developed for Enterprise HR Operations and Academic Demonstration.**  
*TechNova Solutions Pvt. Ltd. &copy; 2026. All Rights Reserved.*
