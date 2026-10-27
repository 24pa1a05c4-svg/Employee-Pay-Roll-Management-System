/**
 * Analytical Reports & CSV Export Script
 */
let currentActiveTab = 'monthly';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  setupReportTabs();
  setupReportYears();
  await loadReport();
});

function setupReportYears() {
  const currentYear = new Date().getFullYear();
  const yearSelects = document.querySelectorAll('.report-year-select');
  yearSelects.forEach(select => {
    select.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', loadReport);
  });
}

function setupReportTabs() {
  const tabs = document.querySelectorAll('.report-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentActiveTab = tab.getAttribute('data-tab');

      // Hide all panes
      document.querySelectorAll('.report-pane').forEach(p => p.style.display = 'none');
      const activePane = document.getElementById(`pane-${currentActiveTab}`);
      if (activePane) activePane.style.display = 'block';

      loadReport();
    });
  });
}

async function loadReport() {
  switch (currentActiveTab) {
    case 'monthly':
      await loadMonthlyReport();
      break;
    case 'department':
      await loadDepartmentReport();
      break;
    case 'attendance':
      await loadAttendanceReport();
      break;
    case 'deductions':
      await loadDeductionsReport();
      break;
  }
}

async function loadMonthlyReport() {
  const year = document.getElementById('monthlyYearSelect')?.value || new Date().getFullYear();
  const tbody = document.getElementById('monthlyReportTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="spinner"></div></td></tr>';

  try {
    const res = await api.get(`/api/reports/monthly-payroll?year=${year}`);
    renderMonthlyReport(res.data);
  } catch (err) {
    Toast.error('Failed to load monthly payroll report: ' + err.message);
  }
}

function renderMonthlyReport(rows) {
  const tbody = document.getElementById('monthlyReportTableBody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-title">No payroll records for this year</div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${r.month_name} ${r.year}</strong></td>
      <td>${r.employee_count}</td>
      <td>${r.working_days} days</td>
      <td>${r.formatted_gross}</td>
      <td style="color:var(--color-danger);">${r.formatted_deductions}</td>
      <td style="font-weight:700; color:var(--color-primary);">${r.formatted_net}</td>
      <td><span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span></td>
    </tr>
  `).join('');
}

async function loadDepartmentReport() {
  const year = document.getElementById('deptYearSelect')?.value || new Date().getFullYear();
  const tbody = document.getElementById('deptReportTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="spinner"></div></td></tr>';

  try {
    const res = await api.get(`/api/reports/department-expenditure?year=${year}`);
    renderDepartmentReport(res.data);
  } catch (err) {
    Toast.error('Failed to load department expenditure report: ' + err.message);
  }
}

function renderDepartmentReport(rows) {
  const tbody = document.getElementById('deptReportTableBody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-title">No finalized department payrolls recorded</div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-weight:600; color:var(--color-primary);">${escapeHtml(r.department_name)}</td>
      <td>${r.employee_count}</td>
      <td>${r.formatted_gross}</td>
      <td style="color:var(--color-danger);">${r.formatted_deductions}</td>
      <td style="font-weight:700; color:var(--color-accent);">${r.formatted_net}</td>
    </tr>
  `).join('');
}

async function loadAttendanceReport() {
  const tbody = document.getElementById('attendanceReportTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="spinner"></div></td></tr>';

  try {
    const res = await api.get('/api/reports/attendance-summary');
    renderAttendanceReport(res.data);
  } catch (err) {
    Toast.error('Failed to load attendance report: ' + err.message);
  }
}

function renderAttendanceReport(rows) {
  const tbody = document.getElementById('attendanceReportTableBody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-title">No attendance records found</div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <div style="font-weight:600;">${escapeHtml(r.employee_name)}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(r.employee_code)}</div>
      </td>
      <td>${escapeHtml(r.department_name)}</td>
      <td><span class="badge badge-success">${r.present_count} Present</span></td>
      <td>${r.half_day_count > 0 ? `<span class="badge badge-warning">${r.half_day_count} Half Days</span>` : '0'}</td>
      <td>${r.leave_count > 0 ? `<span class="badge badge-info">${r.leave_count} On Leave</span>` : '0'}</td>
      <td><strong>${r.total_overtime_hours} hrs</strong></td>
    </tr>
  `).join('');
}

async function loadDeductionsReport() {
  const year = document.getElementById('deductYearSelect')?.value || new Date().getFullYear();
  const tbody = document.getElementById('deductReportTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><div class="spinner"></div></td></tr>';

  try {
    const res = await api.get(`/api/reports/deductions-summary?year=${year}`);
    renderDeductionsReport(res.data);
  } catch (err) {
    Toast.error('Failed to load deductions report: ' + err.message);
  }
}

function renderDeductionsReport(rows) {
  const tbody = document.getElementById('deductReportTableBody');
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state"><div class="empty-title">No deductions found for selected period</div></td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td style="font-weight:600; color:var(--color-primary);">${escapeHtml(r.item_name)}</td>
      <td>${r.occurrences} records</td>
      <td style="font-weight:700; color:var(--color-danger);">${r.formatted_total}</td>
    </tr>
  `).join('');
}

function exportActiveReportCsv() {
  let url = '';
  switch (currentActiveTab) {
    case 'monthly':
      const mYear = document.getElementById('monthlyYearSelect')?.value || new Date().getFullYear();
      url = `/api/reports/monthly-payroll?year=${mYear}&exportCsv=true`;
      break;
    case 'department':
      const dYear = document.getElementById('deptYearSelect')?.value || new Date().getFullYear();
      url = `/api/reports/department-expenditure?year=${dYear}&exportCsv=true`;
      break;
    case 'attendance':
      url = `/api/reports/attendance-summary?exportCsv=true`;
      break;
    case 'deductions':
      const deYear = document.getElementById('deductYearSelect')?.value || new Date().getFullYear();
      url = `/api/reports/deductions-summary?year=${deYear}&exportCsv=true`;
      break;
  }

  if (url) {
    window.location.href = url;
    Toast.success('Exporting CSV with formula injection sanitization...');
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Draft': return 'badge-neutral';
    case 'Pending Approval': return 'badge-warning';
    case 'Approved': return 'badge-info';
    case 'Finalized': return 'badge-success';
    default: return 'badge-neutral';
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.exportActiveReportCsv = exportActiveReportCsv;
window.loadReport = loadReport;
