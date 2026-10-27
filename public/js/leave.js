/**
 * Leave Management Script
 */
let currentLeavePage = 1;
const leavePageSize = 25;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  await loadLeaveDropdowns();
  await loadLeaveRequests();
  setupLeaveEvents();
});

async function loadLeaveDropdowns() {
  try {
    const user = App.getCurrentUser();
    if (user && user.role === 'admin') {
      const empRes = await api.get('/api/employees?limit=200');
      const select = document.getElementById('applyLeaveEmployee');
      if (select) {
        select.innerHTML = '<option value="">Select Employee</option>' +
          (empRes.data || []).map(e => `<option value="${e.id}">${escapeHtml(e.full_name)} (${escapeHtml(e.employee_code)})</option>`).join('');
      }
    } else {
      const group = document.getElementById('applyLeaveEmployeeGroup');
      if (group) group.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to load leave dropdowns:', err);
  }
}

async function loadLeaveRequests() {
  const status = document.getElementById('filterLeaveStatus')?.value || '';
  const tbody = document.getElementById('leaveTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding:2rem;"><div class="spinner"></div></td></tr>';
  }

  try {
    const query = new URLSearchParams({
      status,
      page: currentLeavePage,
      limit: leavePageSize
    });

    const res = await api.get(`/api/leaves?${query.toString()}`);
    renderLeaveTable(res.data);
  } catch (err) {
    Toast.error('Failed to load leave requests: ' + err.message);
  }
}

function renderLeaveTable(requests) {
  const tbody = document.getElementById('leaveTableBody');
  if (!tbody) return;

  const user = App.getCurrentUser();
  const isAdmin = user && user.role === 'admin';

  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-title">No leave requests found</div><div class="empty-desc">No leave applications match the selected criteria.</div></td></tr>';
    return;
  }

  tbody.innerHTML = requests.map(r => `
    <tr>
      <td>
        <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(r.employee_name)}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(r.employee_code)}</div>
      </td>
      <td><strong>${escapeHtml(r.leave_type)}</strong></td>
      <td>
        <div>${formatDate(r.start_date)} to ${formatDate(r.end_date)}</div>
        <div style="font-size:0.75rem; color:var(--color-text-muted); font-weight:600;">${r.days_count} day(s)</div>
      </td>
      <td style="max-width:240px; font-size:0.85rem; color:var(--color-text-main);">${escapeHtml(r.reason)}</td>
      <td><span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td style="font-size:0.8rem; color:var(--color-text-muted);">
        ${r.reviewed_at ? `${formatDate(r.reviewed_at)} by ${escapeHtml(r.reviewer_name || 'Admin')}` : '-'}
        ${r.admin_remarks ? `<div style="font-style:italic; margin-top:2px;">"${escapeHtml(r.admin_remarks)}"</div>` : ''}
      </td>
      <td>
        ${isAdmin && r.status === 'Pending' ? `
          <button class="btn btn-sm btn-primary" onclick="openReviewModal(${r.id}, '${escapeHtml(r.employee_name)}', '${r.days_count} days ${r.leave_type}')">
            Review
          </button>
        ` : `
          <span style="font-size:0.8rem; color:var(--color-text-muted);">-</span>
        `}
      </td>
    </tr>
  `).join('');
}

function setupLeaveEvents() {
  const filterStatus = document.getElementById('filterLeaveStatus');
  const applyForm = document.getElementById('applyLeaveForm');
  const reviewForm = document.getElementById('reviewLeaveForm');

  if (filterStatus) filterStatus.addEventListener('change', () => { currentLeavePage = 1; loadLeaveRequests(); });

  if (applyForm) {
    applyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = App.getCurrentUser();
      const payload = {
        leave_type: document.getElementById('applyLeaveType').value,
        start_date: document.getElementById('applyLeaveStartDate').value,
        end_date: document.getElementById('applyLeaveEndDate').value,
        reason: document.getElementById('applyLeaveReason').value.trim()
      };

      if (user && user.role === 'admin') {
        payload.employee_id = document.getElementById('applyLeaveEmployee').value;
      }

      const btn = document.getElementById('submitLeaveBtn');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        const res = await api.post('/api/leaves', payload);
        Toast.success(res.message);
        Modal.close('applyLeaveModal');
        await loadLeaveRequests();
      } catch (err) {
        Toast.error(err.message || 'Failed to submit leave request.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Submit Leave Request';
      }
    });
  }

  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('reviewLeaveId').value;
      const status = document.getElementById('reviewLeaveStatus').value;
      const admin_remarks = document.getElementById('reviewLeaveRemarks').value.trim();

      const btn = document.getElementById('saveReviewBtn');
      btn.disabled = true;
      btn.textContent = 'Saving...';

      try {
        const res = await api.patch(`/api/leaves/${id}/review`, { status, admin_remarks });
        Toast.success(res.message);
        Modal.close('reviewLeaveModal');
        await loadLeaveRequests();
      } catch (err) {
        Toast.error(err.message || 'Failed to update leave request.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Save Decision';
      }
    });
  }
}

function openApplyLeaveModal() {
  const form = document.getElementById('applyLeaveForm');
  if (form) form.reset();
  Modal.open('applyLeaveModal');
}

function openReviewModal(id, employeeName, details) {
  document.getElementById('reviewLeaveForm').reset();
  document.getElementById('reviewLeaveId').value = id;
  document.getElementById('reviewLeaveInfo').textContent = `${employeeName} - ${details}`;
  Modal.open('reviewLeaveModal');
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Approved': return 'badge-success';
    case 'Pending': return 'badge-warning';
    case 'Rejected': return 'badge-danger';
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

window.openApplyLeaveModal = openApplyLeaveModal;
window.openReviewModal = openReviewModal;
