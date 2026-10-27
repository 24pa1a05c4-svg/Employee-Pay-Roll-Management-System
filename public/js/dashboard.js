/**
 * Dashboard Page Script
 * Renders statistical metrics and interactive Chart.js visualizations
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  await loadDashboard();
});

let expenseChartInstance = null;
let deptChartInstance = null;

async function loadDashboard() {
  try {
    const data = await api.get('/api/dashboard/stats');

    if (data.role === 'admin') {
      renderAdminDashboard(data);
    } else {
      renderEmployeeDashboard(data);
    }
  } catch (err) {
    Toast.error('Failed to load dashboard metrics: ' + err.message);
  }
}

function renderAdminDashboard(data) {
  // Show admin sections, hide employee-specific sections
  const adminSection = document.getElementById('adminDashboardSection');
  const employeeSection = document.getElementById('employeeDashboardSection');
  if (adminSection) adminSection.style.display = 'block';
  if (employeeSection) employeeSection.style.display = 'none';

  // Stat cards
  const activeEmpEl = document.getElementById('statActiveEmployees');
  const deptCountEl = document.getElementById('statDepartments');
  const payrollTotalEl = document.getElementById('statPayrollTotal');
  const payrollPeriodEl = document.getElementById('statPayrollPeriod');
  const pendingLeavesEl = document.getElementById('statPendingLeaves');
  const payrollStatusEl = document.getElementById('statPayrollStatus');

  if (activeEmpEl) activeEmpEl.textContent = data.stats.totalActiveEmployees;
  if (deptCountEl) deptCountEl.textContent = data.stats.departmentCount;
  if (payrollTotalEl) payrollTotalEl.textContent = data.stats.latestPayrollTotal;
  if (payrollPeriodEl) payrollPeriodEl.textContent = `Period: ${data.stats.latestPayrollPeriod}`;
  if (pendingLeavesEl) pendingLeavesEl.textContent = data.stats.pendingLeaveCount;
  if (payrollStatusEl) payrollStatusEl.textContent = data.stats.currentPayrollStatus;

  // Render Charts
  renderExpenseChart(data.charts.expenseChart);
  renderDepartmentChart(data.charts.deptDistribution);

  // Render Recent Tables
  renderRecentEmployees(data.recentEmployees);
  renderRecentPayroll(data.recentPayrollRuns);
}

function renderEmployeeDashboard(data) {
  const adminSection = document.getElementById('adminDashboardSection');
  const employeeSection = document.getElementById('employeeDashboardSection');
  if (adminSection) adminSection.style.display = 'none';
  if (employeeSection) employeeSection.style.display = 'block';

  const salaryEl = document.getElementById('empStatLatestSalary');
  const periodEl = document.getElementById('empStatSalaryPeriod');
  const leavesEl = document.getElementById('empStatPendingLeaves');
  const presentEl = document.getElementById('empStatMonthPresent');
  const absentEl = document.getElementById('empStatMonthAbsent');
  const downloadBtn = document.getElementById('empDownloadLatestPayslipBtn');

  if (salaryEl) salaryEl.textContent = data.stats.latestNetSalary;
  if (periodEl) periodEl.textContent = `Period: ${data.stats.latestPayslipMonth}`;
  if (leavesEl) leavesEl.textContent = data.stats.pendingLeaves;
  if (presentEl) presentEl.textContent = data.stats.monthPresent;
  if (absentEl) absentEl.textContent = data.stats.monthAbsent;

  if (downloadBtn) {
    if (data.stats.latestPayslipId) {
      downloadBtn.href = `/api/payslips/${data.stats.latestPayslipId}/download`;
      downloadBtn.style.display = 'inline-flex';
    } else {
      downloadBtn.style.display = 'none';
    }
  }

  // Render recent employee leaves
  const tbody = document.getElementById('empRecentLeavesBody');
  if (tbody) {
    if (!data.recentLeaves || data.recentLeaves.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:2rem;"><div class="empty-desc">No recent leave requests found.</div></td></tr>';
      return;
    }
    tbody.innerHTML = data.recentLeaves.map(l => `
      <tr>
        <td><strong>${escapeHtml(l.leave_type)}</strong></td>
        <td>${formatDate(l.start_date)} to ${formatDate(l.end_date)}</td>
        <td>${l.days_count} day(s)</td>
        <td><span class="badge ${getStatusBadgeClass(l.status)}">${escapeHtml(l.status)}</span></td>
        <td>${formatDate(l.created_at)}</td>
      </tr>
    `).join('');
  }
}

function renderExpenseChart(chartData) {
  const ctx = document.getElementById('expenseChart');
  if (!ctx || !window.Chart) return;

  if (expenseChartInstance) {
    expenseChartInstance.destroy();
  }

  expenseChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Net Pay (INR)',
          data: chartData.netPay,
          backgroundColor: '#2563EB',
          borderRadius: 6
        },
        {
          label: 'Deductions (INR)',
          data: chartData.deductions,
          backgroundColor: '#F59E0B',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.dataset.label}: ₹${context.raw.toLocaleString('en-IN')}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => '₹' + (value >= 100000 ? (value / 100000).toFixed(1) + 'L' : (value / 1000).toFixed(0) + 'k')
          }
        }
      }
    }
  });
}

function renderDepartmentChart(chartData) {
  const ctx = document.getElementById('deptChart');
  if (!ctx || !window.Chart) return;

  if (deptChartInstance) {
    deptChartInstance.destroy();
  }

  deptChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.counts,
        backgroundColor: [
          '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD'
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '65%'
    }
  });
}

function renderRecentEmployees(employees) {
  const tbody = document.getElementById('recentEmployeesBody');
  if (!tbody) return;

  if (!employees || employees.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state" style="padding:2rem;"><div class="empty-desc">No recent employee records.</div></td></tr>';
    return;
  }

  tbody.innerHTML = employees.map(emp => `
    <tr>
      <td>
        <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(emp.full_name)}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(emp.employee_code)}</div>
      </td>
      <td>${escapeHtml(emp.department_name)}</td>
      <td>${escapeHtml(emp.designation_title)}</td>
      <td><span class="badge ${getStatusBadgeClass(emp.status)}">${escapeHtml(emp.status)}</span></td>
    </tr>
  `).join('');
}

function renderRecentPayroll(runs) {
  const tbody = document.getElementById('recentPayrollBody');
  if (!tbody) return;

  if (!runs || runs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:2rem;"><div class="empty-desc">No payroll runs found.</div></td></tr>';
    return;
  }

  tbody.innerHTML = runs.map(r => `
    <tr>
      <td><strong>${getMonthName(r.month)} ${r.year}</strong></td>
      <td>${r.employee_count} Employees</td>
      <td style="font-weight:600; color:var(--color-primary);">₹${Number(r.total_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td>
        <a href="/payroll.html?runId=${r.id}" class="btn btn-sm btn-outline">View Details</a>
      </td>
    </tr>
  `).join('');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Active':
    case 'Approved':
    case 'Finalized':
    case 'Paid':
    case 'Present':
      return 'badge-success';
    case 'Pending':
    case 'Pending Approval':
    case 'Draft':
    case 'Half Day':
      return 'badge-warning';
    case 'Inactive':
    case 'Terminated':
    case 'Rejected':
    case 'Absent':
      return 'badge-danger';
    default:
      return 'badge-info';
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function getMonthName(m) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[m - 1] || '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
