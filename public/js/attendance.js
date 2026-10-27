/**
 * Attendance Management Script
 */
let currentAttPage = 1;
const attPageSize = 25;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  await loadFilterDropdowns();
  await loadAttendance();
  setupAttendanceEvents();
});

async function loadFilterDropdowns() {
  try {
    const [deptRes, empRes] = await Promise.all([
      api.get('/api/departments'),
      api.get('/api/employees?limit=200')
    ]);

    const filterDept = document.getElementById('filterAttDept');
    const markEmpSelect = document.getElementById('markAttEmployee');

    if (filterDept) {
      filterDept.innerHTML = '<option value="">All Departments</option>' +
        (deptRes.data || []).map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    }

    if (markEmpSelect) {
      markEmpSelect.innerHTML = '<option value="">Select Employee</option>' +
        (empRes.data || []).map(e => `<option value="${e.id}">${escapeHtml(e.full_name)} (${escapeHtml(e.employee_code)})</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load filter dropdowns:', err);
  }
}

async function loadAttendance() {
  const departmentId = document.getElementById('filterAttDept')?.value || '';
  const startDate = document.getElementById('filterAttStartDate')?.value || '';
  const endDate = document.getElementById('filterAttEndDate')?.value || '';

  const tbody = document.getElementById('attendanceTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:2rem;"><div class="spinner"></div></td></tr>';
  }

  try {
    const query = new URLSearchParams({
      departmentId,
      startDate,
      endDate,
      page: currentAttPage,
      limit: attPageSize
    });

    const res = await api.get(`/api/attendance?${query.toString()}`);
    renderAttendanceTable(res.data);
    renderAttendancePagination(res.pagination);
  } catch (err) {
    Toast.error('Failed to load attendance: ' + err.message);
  }
}

function renderAttendanceTable(records) {
  const tbody = document.getElementById('attendanceTableBody');
  if (!tbody) return;

  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-title">No attendance records found</div><div class="empty-desc">Select a different date range or record attendance for today.</div></td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td>${formatDate(r.attendance_date)}</td>
      <td>
        <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(r.employee_name)}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(r.employee_code)}</div>
      </td>
      <td>${escapeHtml(r.department_name)}</td>
      <td><span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td>${Number(r.overtime_hours) > 0 ? `<strong>${r.overtime_hours} hrs</strong>` : '-'}</td>
      <td style="color:var(--color-text-muted); font-size:0.85rem;">${escapeHtml(r.remarks || '-')}</td>
    </tr>
  `).join('');
}

function renderAttendancePagination(pagination) {
  const container = document.getElementById('attPaginationControls');
  const infoEl = document.getElementById('attPaginationInfo');

  if (infoEl) {
    infoEl.textContent = pagination.total > 0
      ? `Showing page ${pagination.page} of ${pagination.totalPages} (${pagination.total} records)`
      : '0 records';
  }

  if (container) {
    if (pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = `
      <button class="page-btn" ${pagination.page === 1 ? 'disabled' : ''} onclick="goToAttPage(${pagination.page - 1})">Previous</button>
      <span style="font-size:0.85rem; padding:0 0.5rem;">Page ${pagination.page} / ${pagination.totalPages}</span>
      <button class="page-btn" ${pagination.page === pagination.totalPages ? 'disabled' : ''} onclick="goToAttPage(${pagination.page + 1})">Next</button>
    `;
  }
}

function goToAttPage(page) {
  currentAttPage = page;
  loadAttendance();
}

function setupAttendanceEvents() {
  const filterDept = document.getElementById('filterAttDept');
  const startDate = document.getElementById('filterAttStartDate');
  const endDate = document.getElementById('filterAttEndDate');
  const markForm = document.getElementById('markAttendanceForm');

  if (filterDept) filterDept.addEventListener('change', () => { currentAttPage = 1; loadAttendance(); });
  if (startDate) startDate.addEventListener('change', () => { currentAttPage = 1; loadAttendance(); });
  if (endDate) endDate.addEventListener('change', () => { currentAttPage = 1; loadAttendance(); });

  if (markForm) {
    markForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        employee_id: document.getElementById('markAttEmployee').value,
        attendance_date: document.getElementById('markAttDate').value,
        status: document.getElementById('markAttStatus').value,
        overtime_hours: parseFloat(document.getElementById('markAttOvertime').value) || 0,
        remarks: document.getElementById('markAttRemarks').value.trim()
      };

      const btn = document.getElementById('saveAttendanceBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await api.post('/api/attendance', payload);
        Toast.success(res.message);
        Modal.close('markAttendanceModal');
        await loadAttendance();
      } catch (err) {
        Toast.error(err.message || 'Failed to record attendance.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Record Attendance';
      }
    });
  }
}

function openMarkAttendanceModal() {
  const form = document.getElementById('markAttendanceForm');
  if (form) form.reset();

  const today = new Date().toISOString().substring(0, 10);
  document.getElementById('markAttDate').value = today;

  Modal.open('markAttendanceModal');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Present': return 'badge-success';
    case 'Half Day': return 'badge-warning';
    case 'Absent': return 'badge-danger';
    case 'On Leave': return 'badge-info';
    default: return 'badge-neutral';
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.openMarkAttendanceModal = openMarkAttendanceModal;
window.goToAttPage = goToAttPage;
