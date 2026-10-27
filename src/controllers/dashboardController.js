/**
 * Dashboard Controller
 * Aggregates high-level statistical cards, Chart.js metrics, and recent activities
 */
const db = require('../config/db');
const { getMonthName } = require('../utils/dateUtils');
const { formatCurrency } = require('../utils/currency');

const dashboardController = {
  async getStats(req, res, next) {
    try {
      const user = req.session.user;

      if (user.role === 'admin') {
        // 1. Total Active Employees
        const [empRows] = await db.query(
          "SELECT COUNT(*) AS total_active FROM employees WHERE status = 'Active'"
        );
        const totalActiveEmployees = empRows[0] ? empRows[0].total_active : 0;

        // 2. Department Count
        const [deptRows] = await db.query('SELECT COUNT(*) AS total_depts FROM departments');
        const departmentCount = deptRows[0] ? deptRows[0].total_depts : 0;

        // 3. Current Month Payroll Total
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const [currPayRows] = await db.query(
          'SELECT status, total_net, total_gross FROM payroll_runs WHERE month = ? AND year = ? LIMIT 1',
          [currentMonth, currentYear]
        );
        const currentPayroll = currPayRows[0] || null;

        // Fallback to previous month if current month is not run yet
        let latestPayrollTotal = 0;
        let latestPayrollPeriod = 'None';
        if (currentPayroll) {
          latestPayrollTotal = currentPayroll.total_net;
          latestPayrollPeriod = `${getMonthName(currentMonth)} ${currentYear}`;
        } else {
          const [lastRun] = await db.query(
            'SELECT month, year, total_net FROM payroll_runs ORDER BY year DESC, month DESC LIMIT 1'
          );
          if (lastRun[0]) {
            latestPayrollTotal = lastRun[0].total_net;
            latestPayrollPeriod = `${getMonthName(lastRun[0].month)} ${lastRun[0].year}`;
          }
        }

        // 4. Pending Leave Requests Count
        const [leaveRows] = await db.query(
          "SELECT COUNT(*) AS pending_leaves FROM leave_requests WHERE status = 'Pending'"
        );
        const pendingLeaveCount = leaveRows[0] ? leaveRows[0].pending_leaves : 0;

        // 5. Monthly Payroll Expense Chart (Last 6 Months)
        const [chartRuns] = await db.query(`
          SELECT month, year, total_net, total_gross, total_deductions
          FROM payroll_runs
          WHERE status = 'Finalized'
          ORDER BY year DESC, month DESC
          LIMIT 6
        `);
        const expenseChartData = {
          labels: chartRuns.reverse().map(r => `${getMonthName(r.month).substring(0, 3)} ${r.year}`),
          netPay: chartRuns.map(r => Number(r.total_net)),
          grossPay: chartRuns.map(r => Number(r.total_gross)),
          deductions: chartRuns.map(r => Number(r.total_deductions))
        };

        // 6. Department Distribution Chart
        const [deptDistRows] = await db.query(`
          SELECT d.name, COUNT(e.id) AS count
          FROM departments d
          LEFT JOIN employees e ON e.department_id = d.id AND e.status = 'Active'
          GROUP BY d.id
          HAVING count > 0
          ORDER BY count DESC
        `);
        const deptDistribution = {
          labels: deptDistRows.map(r => r.name),
          counts: deptDistRows.map(r => Number(r.count))
        };

        // 7. Recent Employee Additions
        const [recentEmployees] = await db.query(`
          SELECT e.id, e.employee_code, CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                 d.name AS department_name, des.title AS designation_title,
                 e.joining_date, e.status
          FROM employees e
          INNER JOIN departments d ON d.id = e.department_id
          INNER JOIN designations des ON des.id = e.designation_id
          ORDER BY e.created_at DESC
          LIMIT 5
        `);

        // 8. Recent Payroll Runs
        const [recentPayrollRuns] = await db.query(`
          SELECT pr.id, pr.month, pr.year, pr.status, pr.total_net, pr.employee_count, pr.run_date
          FROM payroll_runs pr
          ORDER BY pr.year DESC, pr.month DESC
          LIMIT 5
        `);

        return res.json({
          success: true,
          role: 'admin',
          stats: {
            totalActiveEmployees,
            departmentCount,
            currentPayrollStatus: currentPayroll ? currentPayroll.status : 'Not Started',
            latestPayrollTotal: formatCurrency(latestPayrollTotal),
            latestPayrollPeriod,
            pendingLeaveCount
          },
          charts: {
            expenseChart: expenseChartData,
            deptDistribution
          },
          recentEmployees,
          recentPayrollRuns
        });
      } else {
        // Employee Dashboard Metrics
        const employeeId = user.employee_id;
        if (!employeeId) {
          return res.json({
            success: true,
            role: 'employee',
            message: 'No associated employee record found.'
          });
        }

        // Employee's own pending leaves
        const [empLeaveRows] = await db.query(
          "SELECT COUNT(*) AS pending_leaves FROM leave_requests WHERE employee_id = ? AND status = 'Pending'",
          [employeeId]
        );

        // Employee's latest payslip
        const [latestPayslipRows] = await db.query(`
          SELECT pr.*, prun.month, prun.year
          FROM payroll_records pr
          INNER JOIN payroll_runs prun ON prun.id = pr.payroll_run_id
          WHERE pr.employee_id = ? AND prun.status = 'Finalized'
          ORDER BY prun.year DESC, prun.month DESC
          LIMIT 1
        `, [employeeId]);

        // Employee recent leave requests
        const [recentLeaves] = await db.query(`
          SELECT id, leave_type, start_date, end_date, days_count, status, created_at
          FROM leave_requests
          WHERE employee_id = ?
          ORDER BY created_at DESC
          LIMIT 5
        `, [employeeId]);

        // Attendance stats this month
        const now = new Date();
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const [empAttRows] = await db.query(`
          SELECT 
            COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present_count,
            COUNT(CASE WHEN status = 'Half Day' THEN 1 END) AS half_day_count,
            COUNT(CASE WHEN status = 'Absent' THEN 1 END) AS absent_count,
            COUNT(CASE WHEN status = 'On Leave' THEN 1 END) AS on_leave_count
          FROM attendance
          WHERE employee_id = ? AND attendance_date >= ?
        `, [employeeId, startOfMonth]);

        return res.json({
          success: true,
          role: 'employee',
          stats: {
            pendingLeaves: empLeaveRows[0] ? empLeaveRows[0].pending_leaves : 0,
            latestNetSalary: latestPayslipRows[0] ? formatCurrency(latestPayslipRows[0].net_salary) : '₹0.00',
            latestPayslipMonth: latestPayslipRows[0] ? `${getMonthName(latestPayslipRows[0].month)} ${latestPayslipRows[0].year}` : 'N/A',
            latestPayslipId: latestPayslipRows[0] ? latestPayslipRows[0].id : null,
            monthPresent: empAttRows[0] ? empAttRows[0].present_count : 0,
            monthAbsent: empAttRows[0] ? empAttRows[0].absent_count : 0
          },
          recentLeaves
        });
      }
    } catch (err) {
      next(err);
    }
  }
};

module.exports = dashboardController;
