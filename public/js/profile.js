/**
 * Employee Self-Service Profile & Salary History Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  await loadEmployeeProfile();
});

async function loadEmployeeProfile() {
  try {
    const userRes = await api.get('/api/auth/me');
    const user = userRes.user;
    const emp = userRes.employee;

    if (!emp) {
      document.getElementById('profileContent').innerHTML = `
        <div class="empty-state">
          <div class="empty-title">Administrator Account</div>
          <div class="empty-desc">You are logged in as an Administrator without an employee record. Employee self-service features are for staff accounts.</div>
        </div>
      `;
      return;
    }

    renderProfileCard(emp);
    await loadSalaryHistory(emp.id);
  } catch (err) {
    Toast.error('Failed to load profile details: ' + err.message);
  }
}

function renderProfileCard(emp) {
  document.getElementById('profileFullName').textContent = emp.full_name;
  document.getElementById('profileCode').textContent = emp.employee_code;
  document.getElementById('profileEmail').textContent = emp.email;
  document.getElementById('profilePhone').textContent = emp.phone;
  document.getElementById('profileDepartment').textContent = emp.department_name;
  document.getElementById('profileDesignation').textContent = emp.designation_title;
  document.getElementById('profileJoiningDate').textContent = formatDate(emp.joining_date);
  document.getElementById('profileStatus').textContent = emp.status;

  // Masked Banking info
  document.getElementById('profileBankName').textContent = emp.bank_name || 'N/A';
  document.getElementById('profileBankAccount').textContent = emp.masked_bank_account;
  document.getElementById('profileIfsc').textContent = emp.bank_ifsc || 'N/A';
  document.getElementById('profilePan').textContent = emp.pan_number || 'N/A';
}

async function loadSalaryHistory(employeeId) {
  const tbody = document.getElementById('salaryHistoryTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="spinner"></div></td></tr>';
  }

  try {
    const res = await api.get(`/api/payslips/history/${employeeId}`);
    renderSalaryHistory(res.data);
  } catch (err) {
    Toast.error('Failed to load salary history: ' + err.message);
  }
}

function renderSalaryHistory(records) {
  const tbody = document.getElementById('salaryHistoryTableBody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-title">No payslips available yet</div><div class="empty-desc">Your finalized payslips will appear here once processed by HR.</div></td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${getMonthName(r.month)} ${r.year}</strong></td>
      <td>${escapeHtml(r.payslip_number)}</td>
      <td>${r.present_days} / ${r.working_days} days</td>
      <td>₹${Number(r.gross_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="color:var(--color-danger);">₹${Number(r.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="font-weight:700; color:var(--color-primary);">₹${Number(r.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>
        <a href="/api/payslips/${r.id}/download" class="btn btn-sm btn-primary" title="Download Official Payslip PDF">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Download PDF
        </a>
      </td>
    </tr>
  `).join('');
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
