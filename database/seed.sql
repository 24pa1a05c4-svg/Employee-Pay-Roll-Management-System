-- =============================================================================
-- Employee Payroll Management System - Realistic Fictional Seed Data
-- =============================================================================

USE `payroll_management_db`;

-- -----------------------------------------------------------------------------
-- 1. Departments
-- -----------------------------------------------------------------------------
INSERT INTO `departments` (`id`, `name`, `code`, `description`) VALUES
(1, 'Engineering & Technology', 'ENG', 'Software engineering, DevOps, infrastructure, and QA operations'),
(2, 'Human Resources', 'HR', 'Employee engagement, recruitment, talent acquisition, and payroll administration'),
(3, 'Finance & Accounts', 'FIN', 'Corporate financial planning, budgeting, accounting, and compliance'),
(4, 'Sales & Marketing', 'MKT', 'Client acquisition, enterprise sales, brand marketing, and growth'),
(5, 'Customer Support', 'SUP', 'Customer success, 24/7 technical helpdesk, and client solutions');

-- -----------------------------------------------------------------------------
-- 2. Designations
-- -----------------------------------------------------------------------------
INSERT INTO `designations` (`id`, `department_id`, `title`, `code`, `description`) VALUES
(1, 1, 'Lead Software Architect', 'ENG-LSA', 'Technical architecture, design patterns, and engineering mentorship'),
(2, 1, 'Senior Full Stack Developer', 'ENG-SDE2', 'End-to-end web architecture, backend APIs, and frontend integration'),
(3, 1, 'Junior Software Engineer', 'ENG-SDE1', 'Feature development, bug fixes, and unit test automation'),
(4, 2, 'Senior HR Manager', 'HR-MGR', 'People operations, organizational culture, and policy enforcement'),
(5, 2, 'HR Executive', 'HR-EXEC', 'Onboarding, attendance tracking, and employee queries'),
(6, 3, 'Finance Manager', 'FIN-MGR', 'Financial reporting, audits, statutory compliance, and payroll approval'),
(7, 3, 'Senior Accountant', 'FIN-ACC', 'Taxation, accounts payable/receivable, and ledger management'),
(8, 4, 'Enterprise Sales Lead', 'MKT-SLD', 'B2B client engagement, enterprise contracts, and revenue targets'),
(9, 4, 'Digital Marketing Strategist', 'MKT-MKT', 'SEO, content marketing, and inbound campaign analytics'),
(10, 5, 'Customer Success Specialist', 'SUP-CSS', 'Client escalation handling, customer satisfaction, and SLA tracking');

-- -----------------------------------------------------------------------------
-- 3. Users (Passwords hashed with bcrypt: Admin@123, Hr@123, Emp@123)
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `role`, `is_active`) VALUES
(1, 'admin', 'admin@technova.example.com', '$2b$10$xUpzwEc3YLXLJT.nDyy8vuuZSVsRu3lhiWes4JOV5Y8NaNKAQcBsa', 'admin', 1),
(2, 'hr_manager', 'hr@technova.example.com', '$2b$10$xIhxWrkvpGFsWLvNv1KQJuntZo76HK7RyGprPhzP82nsNac18dxIO', 'admin', 1),
(3, 'rajesh.k', 'rajesh.k@technova.example.com', '$2b$10$crcLtrX0aPD7EZfdIhRq/.S2gFQGzmRpSPXVNea9TrpPZpaFOoWJe', 'employee', 1),
(4, 'priya.s', 'priya.s@technova.example.com', '$2b$10$crcLtrX0aPD7EZfdIhRq/.S2gFQGzmRpSPXVNea9TrpPZpaFOoWJe', 'employee', 1),
(5, 'amit.v', 'amit.v@technova.example.com', '$2b$10$crcLtrX0aPD7EZfdIhRq/.S2gFQGzmRpSPXVNea9TrpPZpaFOoWJe', 'employee', 1),
(6, 'sneha.p', 'sneha.p@technova.example.com', '$2b$10$crcLtrX0aPD7EZfdIhRq/.S2gFQGzmRpSPXVNea9TrpPZpaFOoWJe', 'employee', 1),
(7, 'vikram.m', 'vikram.m@technova.example.com', '$2b$10$crcLtrX0aPD7EZfdIhRq/.S2gFQGzmRpSPXVNea9TrpPZpaFOoWJe', 'employee', 1),
(8, 'ananya.r', 'ananya.r@technova.example.com', '$2b$10$crcLtrX0aPD7EZfdIhRq/.S2gFQGzmRpSPXVNea9TrpPZpaFOoWJe', 'employee', 1);

-- -----------------------------------------------------------------------------
-- 4. Employees (Fictional profile and banking details masked)
-- -----------------------------------------------------------------------------
INSERT INTO `employees` (`id`, `user_id`, `employee_code`, `first_name`, `last_name`, `email`, `phone`, `date_of_birth`, `gender`, `address`, `joining_date`, `department_id`, `designation_id`, `status`, `basic_salary`, `bank_name`, `bank_account_number`, `bank_ifsc`, `pan_number`) VALUES
(1, 3, 'EMP-2024-001', 'Rajesh', 'Kumar', 'rajesh.k@technova.example.com', '+91 98765 43210', '1990-05-15', 'Male', 'Flat 402, Green Towers, Madhapur, Hyderabad', '2024-01-10', 1, 1, 'Active', 85000.00, 'HDFC Bank', '50100234567891', 'HDFC0001234', 'ABCDE1234F'),
(2, 4, 'EMP-2024-002', 'Priya', 'Sharma', 'priya.s@technova.example.com', '+91 98765 43211', '1994-08-22', 'Female', 'Villa 12, Rainbow Meadows, Gachibowli, Hyderabad', '2024-02-01', 1, 2, 'Active', 60000.00, 'State Bank of India', '30291827364501', 'SBIN0004567', 'BCDEF2345G'),
(3, 5, 'EMP-2024-003', 'Amit', 'Verma', 'amit.v@technova.example.com', '+91 98765 43212', '1998-11-04', 'Male', 'Plot 88, Jubilee Enclave, Kondapur, Hyderabad', '2024-04-15', 1, 3, 'Active', 35000.00, 'ICICI Bank', '10293847561029', 'ICIC0007890', 'CDEFG3456H'),
(4, 6, 'EMP-2024-004', 'Sneha', 'Patel', 'sneha.p@technova.example.com', '+91 98765 43213', '1992-03-30', 'Female', 'B-304, Royal Palms, Banjara Hills, Hyderabad', '2024-01-15', 2, 5, 'Active', 42000.00, 'Axis Bank', '91827364501928', 'UTIB0002345', 'DEFGH4567I'),
(5, 7, 'EMP-2024-005', 'Vikram', 'Mehta', 'vikram.m@technova.example.com', '+91 98765 43214', '1988-07-19', 'Male', 'H.No 3-4-12, Srinagar Colony, Hyderabad', '2024-03-01', 3, 7, 'Active', 55000.00, 'Kotak Mahindra Bank', '82736450192837', 'KKBK0001289', 'EFGHI5678J'),
(6, 8, 'EMP-2024-006', 'Ananya', 'Reddy', 'ananya.r@technova.example.com', '+91 98765 43215', '1995-12-08', 'Female', 'D-101, Lake Breeze Apartments, Miyapur, Hyderabad', '2024-05-02', 4, 9, 'Active', 48000.00, 'HDFC Bank', '50100987654321', 'HDFC0001234', 'FGHIJ6789K'),
(7, NULL, 'EMP-2024-007', 'Rahul', 'Deshmukh', 'rahul.d@technova.example.com', '+91 98765 43216', '1991-09-14', 'Male', 'Row House 5, Hill Ridge Springs, Gachibowli, Hyderabad', '2024-06-01', 4, 8, 'Active', 70000.00, 'State Bank of India', '30291122334455', 'SBIN0004567', 'GHIJK7890L'),
(8, NULL, 'EMP-2024-008', 'Pooja', 'Nair', 'pooja.n@technova.example.com', '+91 98765 43217', '1997-04-18', 'Female', 'Flat 201, Maple Leaf Residency, Kukatpally, Hyderabad', '2024-07-15', 5, 10, 'Active', 32000.00, 'Axis Bank', '91827001122334', 'UTIB0002345', 'HIJKL8901M');

-- -----------------------------------------------------------------------------
-- 5. Salary Structures
-- Calculation assumptions:
-- HRA: 40% of Basic
-- Other Allowances: Fixed stipend/special allowance
-- Overtime Hourly Rate: Calculated / configured
-- PF: 12% of Basic (Standard Indian statutory PF rule)
-- PT: ₹200 / month (Standard professional tax)
-- TDS: 5.00% demo rate on taxable earnings
-- -----------------------------------------------------------------------------
INSERT INTO `salary_structures` (`id`, `employee_id`, `basic_salary`, `hra_type`, `hra_value`, `other_allowances`, `overtime_hourly_rate`, `pf_applicable`, `pf_rate`, `pt_applicable`, `pt_amount`, `tds_rate`) VALUES
(1, 1, 85000.00, 'percentage', 40.00, 15000.00, 500.00, 1, 12.00, 1, 200.00, 5.00),
(2, 2, 60000.00, 'percentage', 40.00, 10000.00, 350.00, 1, 12.00, 1, 200.00, 5.00),
(3, 3, 35000.00, 'percentage', 40.00, 6000.00, 200.00, 1, 12.00, 1, 200.00, 5.00),
(4, 4, 42000.00, 'percentage', 40.00, 8000.00, 250.00, 1, 12.00, 1, 200.00, 5.00),
(5, 5, 55000.00, 'percentage', 40.00, 9000.00, 300.00, 1, 12.00, 1, 200.00, 5.00),
(6, 6, 48000.00, 'percentage', 40.00, 8500.00, 280.00, 1, 12.00, 1, 200.00, 5.00),
(7, 7, 70000.00, 'percentage', 40.00, 12000.00, 400.00, 1, 12.00, 1, 200.00, 5.00),
(8, 8, 32000.00, 'percentage', 40.00, 5000.00, 180.00, 1, 12.00, 1, 200.00, 5.00);

-- -----------------------------------------------------------------------------
-- 6. Leave Requests
-- -----------------------------------------------------------------------------
INSERT INTO `leave_requests` (`id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `days_count`, `reason`, `status`, `admin_remarks`, `reviewed_by`, `reviewed_at`) VALUES
(1, 1, 'Casual', '2026-09-12', '2026-09-13', 2, 'Family function in hometown', 'Approved', 'Approved as per casual leave quota', 1, '2026-09-10 14:30:00'),
(2, 2, 'Sick', '2026-09-20', '2026-09-21', 2, 'Viral fever and doctor consultation', 'Approved', 'Medical prescription submitted', 2, '2026-09-20 10:00:00'),
(3, 3, 'Unpaid', '2026-09-25', '2026-09-26', 2, 'Personal urgent matters beyond casual leave', 'Approved', 'Unpaid leave approved. Will be deducted from September payroll', 1, '2026-09-24 16:45:00'),
(4, 4, 'Casual', '2026-10-14', '2026-10-15', 2, 'Attending family wedding ceremony', 'Approved', 'Approved by HR', 2, '2026-10-12 11:20:00'),
(5, 5, 'Sick', '2026-10-22', '2026-10-22', 1, 'Severe migraine', 'Approved', 'Approved', 1, '2026-10-22 09:15:00'),
(6, 6, 'Casual', '2026-10-28', '2026-10-29', 2, 'Personal vacation travel', 'Pending', NULL, NULL, NULL),
(7, 2, 'Casual', '2026-11-05', '2026-11-06', 2, 'Attending technical conference', 'Pending', NULL, NULL, NULL);

-- -----------------------------------------------------------------------------
-- 7. Attendance Records (Sample for September & October 2026)
-- -----------------------------------------------------------------------------
INSERT INTO `attendance` (`employee_id`, `attendance_date`, `status`, `overtime_hours`, `remarks`) VALUES
(1, '2026-09-01', 'Present', 0.00, 'On time'),
(1, '2026-09-02', 'Present', 2.00, 'Release deployment support'),
(1, '2026-09-12', 'On Leave', 0.00, 'Approved Casual Leave'),
(1, '2026-09-13', 'On Leave', 0.00, 'Approved Casual Leave'),
(2, '2026-09-01', 'Present', 0.00, 'On time'),
(2, '2026-09-20', 'On Leave', 0.00, 'Approved Sick Leave'),
(2, '2026-09-21', 'On Leave', 0.00, 'Approved Sick Leave'),
(3, '2026-09-01', 'Present', 0.00, 'On time'),
(3, '2026-09-25', 'On Leave', 0.00, 'Approved Unpaid Leave'),
(3, '2026-09-26', 'On Leave', 0.00, 'Approved Unpaid Leave'),
(4, '2026-09-01', 'Present', 0.00, 'On time'),
(5, '2026-09-01', 'Present', 0.00, 'On time'),
(6, '2026-09-01', 'Present', 0.00, 'On time'),
(7, '2026-09-01', 'Present', 0.00, 'On time'),
(8, '2026-09-01', 'Present', 0.00, 'On time');

-- -----------------------------------------------------------------------------
-- 8. Payroll Runs (August 2026 Finalized, September 2026 Finalized, October 2026 Draft)
-- -----------------------------------------------------------------------------
INSERT INTO `payroll_runs` (`id`, `month`, `year`, `run_date`, `working_days`, `status`, `total_gross`, `total_deductions`, `total_net`, `employee_count`, `created_by`, `approved_by`, `finalized_by`, `finalized_at`) VALUES
(1, 8, 2026, '2026-08-31', 30, 'Finalized', 607700.00, 102450.00, 505250.00, 8, 1, 1, 1, '2026-08-31 18:00:00'),
(2, 9, 2026, '2026-09-30', 30, 'Finalized', 608700.00, 104516.67, 504183.33, 8, 1, 2, 1, '2026-09-30 19:30:00'),
(3, 10, 2026, '2026-10-26', 30, 'Draft', 607700.00, 102450.00, 505250.00, 8, 1, NULL, NULL, NULL);

-- -----------------------------------------------------------------------------
-- 9. Payroll Records for Run 2 (September 2026)
-- Note: Employee 3 had 2 days of unpaid leave (deduction: 35000/30 * 2 = ₹2333.33)
-- -----------------------------------------------------------------------------
INSERT INTO `payroll_records` (`id`, `payroll_run_id`, `employee_id`, `employee_code`, `employee_name`, `department_name`, `designation_title`, `working_days`, `present_days`, `paid_leave_days`, `unpaid_leave_days`, `basic_salary`, `gross_salary`, `total_deductions`, `net_salary`, `payment_status`, `payslip_number`) VALUES
(1, 2, 1, 'EMP-2024-001', 'Rajesh Kumar', 'Engineering & Technology', 'Lead Software Architect', 30, 28.0, 2.0, 0.0, 85000.00, 135000.00, 17150.00, 117850.00, 'Paid', 'PAY-202609-001'),
(2, 2, 2, 'EMP-2024-002', 'Priya Sharma', 'Engineering & Technology', 'Senior Full Stack Developer', 30, 28.0, 2.0, 0.0, 60000.00, 94000.00, 12100.00, 81900.00, 'Paid', 'PAY-202609-002'),
(3, 2, 3, 'EMP-2024-003', 'Amit Verma', 'Engineering & Technology', 'Junior Software Engineer', 30, 28.0, 0.0, 2.0, 35000.00, 55000.00, 9283.33, 45716.67, 'Paid', 'PAY-202609-003'),
(4, 2, 4, 'EMP-2024-004', 'Sneha Patel', 'Human Resources', 'HR Executive', 30, 30.0, 0.0, 0.0, 42000.00, 66800.00, 8580.00, 58220.00, 'Paid', 'PAY-202609-004'),
(5, 2, 5, 'EMP-2024-005', 'Vikram Mehta', 'Finance & Accounts', 'Senior Accountant', 30, 30.0, 0.0, 0.0, 55000.00, 86000.00, 11100.00, 74900.00, 'Paid', 'PAY-202609-005'),
(6, 2, 6, 'EMP-2024-006', 'Ananya Reddy', 'Sales & Marketing', 'Digital Marketing Strategist', 30, 30.0, 0.0, 0.0, 48000.00, 75700.00, 9745.00, 65955.00, 'Paid', 'PAY-202609-006'),
(7, 2, 7, 'EMP-2024-007', 'Rahul Deshmukh', 'Sales & Marketing', 'Enterprise Sales Lead', 30, 30.0, 0.0, 0.0, 70000.00, 110000.00, 14100.00, 95900.00, 'Paid', 'PAY-202609-007'),
(8, 2, 8, 'EMP-2024-008', 'Pooja Nair', 'Customer Support', 'Customer Success Specialist', 30, 30.0, 0.0, 0.0, 32000.00, 49800.00, 6530.00, 43270.00, 'Paid', 'PAY-202609-008');

-- -----------------------------------------------------------------------------
-- 10. Payroll Record Items for Record 1 (Rajesh Kumar - September 2026)
-- -----------------------------------------------------------------------------
INSERT INTO `payroll_record_items` (`payroll_record_id`, `item_type`, `item_name`, `amount`, `is_taxable`, `description`) VALUES
(1, 'Earning', 'Basic Salary', 85000.00, 1, 'Monthly fixed basic pay'),
(1, 'Earning', 'House Rent Allowance (HRA)', 34000.00, 1, '40% of Basic Salary'),
(1, 'Earning', 'Other Allowances', 15000.00, 1, 'Special and conveyance allowances'),
(1, 'Earning', 'Overtime Pay', 1000.00, 1, '2.0 hours overtime @ ₹500/hr'),
(1, 'Deduction', 'Provident Fund (PF)', 10200.00, 0, '12% of Basic Salary'),
(1, 'Deduction', 'Professional Tax (PT)', 200.00, 0, 'Standard state professional tax'),
(1, 'Deduction', 'Tax Deducted at Source (TDS)', 6750.00, 0, '5% demo income tax assumption');

-- Payroll Record Items for Record 3 (Amit Verma - with Unpaid Leave deduction)
INSERT INTO `payroll_record_items` (`payroll_record_id`, `item_type`, `item_name`, `amount`, `is_taxable`, `description`) VALUES
(3, 'Earning', 'Basic Salary', 35000.00, 1, 'Monthly fixed basic pay'),
(3, 'Earning', 'House Rent Allowance (HRA)', 14000.00, 1, '40% of Basic Salary'),
(3, 'Earning', 'Other Allowances', 6000.00, 1, 'Special allowance'),
(3, 'Deduction', 'Provident Fund (PF)', 4200.00, 0, '12% of Basic Salary'),
(3, 'Deduction', 'Professional Tax (PT)', 200.00, 0, 'Standard state professional tax'),
(3, 'Deduction', 'Tax Deducted at Source (TDS)', 2550.00, 0, '5% demo income tax deduction'),
(3, 'Deduction', 'Unpaid Leave (LWP)', 2333.33, 0, '2 days unpaid leave deduction (Basic/30 * 2)');

-- -----------------------------------------------------------------------------
-- 11. Audit Logs
-- -----------------------------------------------------------------------------
INSERT INTO `audit_logs` (`user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`) VALUES
(1, 'USER_LOGIN', 'users', 1, 'Admin user logged in successfully', '127.0.0.1'),
(1, 'CREATE_EMPLOYEE', 'employees', 1, 'Created employee record for Rajesh Kumar (EMP-2024-001)', '127.0.0.1'),
(1, 'FINALIZE_PAYROLL', 'payroll_runs', 2, 'Finalized payroll run for period 09/2026. 8 employees paid.', '127.0.0.1'),
(2, 'APPROVE_LEAVE', 'leave_requests', 2, 'Approved 2 days sick leave for Priya Sharma', '127.0.0.1');
