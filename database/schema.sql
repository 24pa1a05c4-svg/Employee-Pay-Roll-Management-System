-- =============================================================================
-- Employee Payroll Management System - Database Schema
-- Compatible with MySQL 8.0+ / MariaDB 10.5+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `payroll_management_db` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `payroll_management_db`;

-- Disable foreign key checks during schema creation/resets
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `payroll_record_items`;
DROP TABLE IF EXISTS `payroll_records`;
DROP TABLE IF EXISTS `payroll_runs`;
DROP TABLE IF EXISTS `leave_requests`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `salary_structures`;
DROP TABLE IF EXISTS `employees`;
DROP TABLE IF EXISTS `designations`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. Users Table (Authentication & Role Authorization)
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Departments Table
-- -----------------------------------------------------------------------------
CREATE TABLE `departments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Designations Table
-- -----------------------------------------------------------------------------
CREATE TABLE `designations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `department_id` INT NOT NULL,
  `title` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_designation_dept` FOREIGN KEY (`department_id`) 
    REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY `unique_dept_designation` (`department_id`, `title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Employees Table
-- -----------------------------------------------------------------------------
CREATE TABLE `employees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNIQUE NULL,
  `employee_code` VARCHAR(30) NOT NULL UNIQUE,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL,
  `date_of_birth` DATE NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Other',
  `address` TEXT NULL,
  `joining_date` DATE NOT NULL,
  `department_id` INT NOT NULL,
  `designation_id` INT NOT NULL,
  `status` ENUM('Active', 'Inactive', 'Terminated') NOT NULL DEFAULT 'Active',
  `basic_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `bank_name` VARCHAR(100) NULL,
  `bank_account_number` VARCHAR(50) NULL,
  `bank_ifsc` VARCHAR(20) NULL,
  `pan_number` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_emp_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_dept` FOREIGN KEY (`department_id`) 
    REFERENCES `departments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_emp_desig` FOREIGN KEY (`designation_id`) 
    REFERENCES `designations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX `idx_emp_code` (`employee_code`),
  INDEX `idx_emp_status` (`status`),
  INDEX `idx_emp_dept` (`department_id`),
  INDEX `idx_emp_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Salary Structures Table (Configurable formula and policy components)
-- -----------------------------------------------------------------------------
CREATE TABLE `salary_structures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL UNIQUE,
  `basic_salary` DECIMAL(12, 2) NOT NULL,
  `hra_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `hra_value` DECIMAL(10, 2) NOT NULL DEFAULT 40.00, -- e.g. 40% of basic
  `other_allowances` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `overtime_hourly_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `pf_applicable` TINYINT(1) NOT NULL DEFAULT 1,
  `pf_rate` DECIMAL(5, 2) NOT NULL DEFAULT 12.00, -- 12% of basic
  `pt_applicable` TINYINT(1) NOT NULL DEFAULT 1,
  `pt_amount` DECIMAL(10, 2) NOT NULL DEFAULT 200.00, -- Fixed ₹200/month
  `tds_rate` DECIMAL(5, 2) NOT NULL DEFAULT 5.00, -- Demo 5% tax deduction assumption
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_salary_emp` FOREIGN KEY (`employee_id`) 
    REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Attendance Table
-- -----------------------------------------------------------------------------
CREATE TABLE `attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `attendance_date` DATE NOT NULL,
  `status` ENUM('Present', 'Absent', 'Half Day', 'On Leave') NOT NULL DEFAULT 'Present',
  `overtime_hours` DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
  `remarks` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_att_emp` FOREIGN KEY (`employee_id`) 
    REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `unique_emp_date` (`employee_id`, `attendance_date`),
  INDEX `idx_att_date` (`attendance_date`),
  INDEX `idx_att_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Leave Requests Table
-- -----------------------------------------------------------------------------
CREATE TABLE `leave_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `leave_type` ENUM('Casual', 'Sick', 'Paid', 'Unpaid') NOT NULL DEFAULT 'Casual',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `days_count` INT NOT NULL DEFAULT 1,
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  `admin_remarks` TEXT NULL,
  `reviewed_by` INT NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_leave_emp` FOREIGN KEY (`employee_id`) 
    REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_leave_reviewer` FOREIGN KEY (`reviewed_by`) 
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_leave_emp` (`employee_id`),
  INDEX `idx_leave_status` (`status`),
  INDEX `idx_leave_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Payroll Runs Table (Batch monthly runs with approval stages)
-- -----------------------------------------------------------------------------
CREATE TABLE `payroll_runs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `run_date` DATE NOT NULL,
  `working_days` INT NOT NULL DEFAULT 30,
  `status` ENUM('Draft', 'Pending Approval', 'Approved', 'Finalized') NOT NULL DEFAULT 'Draft',
  `total_gross` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_deductions` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_net` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `employee_count` INT NOT NULL DEFAULT 0,
  `created_by` INT NULL,
  `approved_by` INT NULL,
  `finalized_by` INT NULL,
  `finalized_at` DATETIME NULL,
  `reversal_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_payroll_creator` FOREIGN KEY (`created_by`) 
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_approver` FOREIGN KEY (`approved_by`) 
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_payroll_finalizer` FOREIGN KEY (`finalized_by`) 
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  UNIQUE KEY `unique_payroll_period` (`month`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Payroll Records Table (Calculated per-employee snapshot)
-- -----------------------------------------------------------------------------
CREATE TABLE `payroll_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payroll_run_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `employee_code` VARCHAR(30) NOT NULL,
  `employee_name` VARCHAR(100) NOT NULL,
  `department_name` VARCHAR(100) NOT NULL,
  `designation_title` VARCHAR(100) NOT NULL,
  `working_days` INT NOT NULL DEFAULT 30,
  `present_days` DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
  `paid_leave_days` DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
  `unpaid_leave_days` DECIMAL(4, 1) NOT NULL DEFAULT 0.0,
  `basic_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `gross_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_deductions` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `net_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('Pending', 'Paid') NOT NULL DEFAULT 'Pending',
  `payslip_number` VARCHAR(50) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_precord_run` FOREIGN KEY (`payroll_run_id`) 
    REFERENCES `payroll_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_precord_emp` FOREIGN KEY (`employee_id`) 
    REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  UNIQUE KEY `unique_run_emp` (`payroll_run_id`, `employee_id`),
  INDEX `idx_precord_payslip` (`payslip_number`),
  INDEX `idx_precord_emp` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Payroll Record Items Table (Line-item historical breakdown)
-- -----------------------------------------------------------------------------
CREATE TABLE `payroll_record_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payroll_record_id` INT NOT NULL,
  `item_type` ENUM('Earning', 'Deduction') NOT NULL,
  `item_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `is_taxable` TINYINT(1) NOT NULL DEFAULT 1,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pitem_record` FOREIGN KEY (`payroll_record_id`) 
    REFERENCES `payroll_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_pitem_type` (`item_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Audit Logs Table (Administrative and payroll activities)
-- -----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) 
    REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
