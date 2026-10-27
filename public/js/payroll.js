/**
 * Payroll Processing & Workflow Management Script
 */
let currentPreviewData = null;
let activeRunId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  setupMonthYearSelectors();
  await loadPayrollRuns();
  setupPayrollEvents();

  // Check URL query parameters for direct run view
  const urlParams = new URLSearchParams(window.location.search);
  const runId = urlParams.get('runId');
  if (runId) {
    viewRunDetails(parseInt(runId, 10));
  }
});

function setupMonthYearSelectors() {
  const monthSelect = document.getElementById('payrollMonth');
  const yearSelect = document.getElementById('payrollYear');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (monthSelect) monthSelect.value = currentMonth;
  if (yearSelect) {
    yearSelect.innerHTML = '';
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === currentYear) opt.selected = true;
      yearSelect.appendChild(opt);
    }
  }
}

async function loadPayrollRuns() {
  const tbody = document.getElementById('payrollRunsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding:2rem;"><div class="spinner"></div></td></tr>';
  }

  try {
    const res = await api.get('/api/payroll/runs');
    renderPayrollRuns(res.data);
  } catch (err) {
    Toast.error('Failed to load payroll runs: ' + err.message);
  }
}

function renderPayrollRuns(runs) {
  const tbody = document.getElementById('payrollRunsTableBody');
  if (!tbody) return;

  if (!runs || runs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-title">No payroll runs found</div><div class="empty-desc">Select a month and year above to calculate and process payroll.</div></td></tr>';
    return;
  }

  tbody.innerHTML = runs.map(r => `
    <tr>
      <td><strong>${getMonthName(r.month)} ${r.year}</strong></td>
      <td>${formatDate(r.run_date)}</td>
      <td>${r.employee_count} Employees</td>
      <td>₹${Number(r.total_gross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>₹${Number(r.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td style="font-weight:700; color:var(--color-primary);">₹${Number(r.total_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${getStatusBadgeClass(r.status)}">${escapeHtml(r.status)}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewRunDetails(${r.id})">Manage</button>
      </td>
    </tr>
  `).join('');
}

async function previewPayroll() {
  const month = document.getElementById('payrollMonth').value;
  const year = document.getElementById('payrollYear').value;
  const workingDays = document.getElementById('payrollWorkingDays').value || '';

  const previewBox = document.getElementById('payrollPreviewContainer');
  const previewBtn = document.getElementById('previewPayrollBtn');

  previewBtn.disabled = true;
  previewBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Calculating...';

  try {
    const query = new URLSearchParams({ month, year, working_days: workingDays });
    const res = await api.get(`/api/payroll/preview?${query.toString()}`);
    currentPreviewData = res;

    renderPayrollPreview(res);
    previewBox.style.display = 'block';
    previewBox.scrollIntoView({ behavior: 'smooth' });
    Toast.info(`Payroll calculation preview generated for ${getMonthName(month)} ${year}`);
  } catch (err) {
    Toast.error(err.message || 'Failed to preview payroll.');
    previewBox.style.display = 'none';
  } finally {
    previewBtn.disabled = false;
    previewBtn.innerHTML = 'Preview Payroll';
  }
}

function renderPayrollPreview(data) {
  document.getElementById('previewPeriodText').textContent = `${getMonthName(data.month)} ${data.year}`;
  document.getElementById('previewEmployeeCount').textContent = `${data.employeeCount} Employees`;
  document.getElementById('previewWorkingDays').textContent = `${data.workingDays} Days`;
  document.getElementById('previewTotalGross').textContent = `₹${Number(data.totalGross).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('previewTotalDeductions').textContent = `₹${Number(data.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById('previewTotalNet').textContent = `₹${Number(data.totalNet).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const tbody = document.getElementById('previewTableBody');
  if (tbody) {
    tbody.innerHTML = data.records.map((rec, index) => `
      <tr>
        <td>
          <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(rec.employee_name)}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(rec.employee_code)}</div>
        </td>
        <td>${escapeHtml(rec.department_name)}</td>
        <td>${rec.presentDays} / ${rec.workingDays}</td>
        <td>
          ${rec.unpaidLeaveDays > 0 ? `<span class="badge badge-danger">${rec.unpaidLeaveDays} LWP</span>` : '-'}
        </td>
        <td>₹${Number(rec.basicSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>₹${Number(rec.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="color:var(--color-danger);">₹${Number(rec.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="font-weight:700; color:var(--color-primary);">₹${Number(rec.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="showPreviewItemBreakdown(${index})">Details</button>
        </td>
      </tr>
    `).join('');
  }
}

function showPreviewItemBreakdown(index) {
  if (!currentPreviewData || !currentPreviewData.records[index]) return;
  const rec = currentPreviewData.records[index];

  const modalBody = document.getElementById('payrollBreakdownBody');
  document.getElementById('payrollBreakdownTitle').textContent = `Salary Breakdown: ${rec.employee_name} (${rec.employee_code})`;

  const earnings = (rec.lineItems || []).filter(i => i.item_type === 'Earning');
  const deductions = (rec.lineItems || []).filter(i => i.item_type === 'Deduction');

  modalBody.innerHTML = `
    <div class="calc-breakdown-box">
      <div class="breakdown-col">
        <h4>Earnings</h4>
        ${earnings.map(e => `
          <div class="breakdown-row">
            <span>${escapeHtml(e.item_name)} <small style="color:var(--color-text-muted);">(${escapeHtml(e.description || '')})</small></span>
            <strong>₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        `).join('')}
        <div class="breakdown-row breakdown-total">
          <span>Gross Earnings</span>
          <strong style="color:var(--color-primary);">₹${Number(rec.grossSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
      <div class="breakdown-col">
        <h4>Deductions</h4>
        ${deductions.map(d => `
          <div class="breakdown-row">
            <span>${escapeHtml(d.item_name)} <small style="color:var(--color-text-muted);">(${escapeHtml(d.description || '')})</small></span>
            <strong style="color:var(--color-danger);">₹${Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        `).join('')}
        <div class="breakdown-row breakdown-total">
          <span>Total Deductions</span>
          <strong style="color:var(--color-danger);">₹${Number(rec.totalDeductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>
    </div>
    <div style="background:#EFF6FF; border:1px solid #BFDBFE; padding:1rem; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:600; color:var(--color-primary);">Net Payable Salary</span>
      <span style="font-size:1.3rem; font-weight:800; color:var(--color-accent);">₹${Number(rec.netSalary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    </div>
  `;

  Modal.open('payrollBreakdownModal');
}

async function saveDraftPayroll() {
  if (!currentPreviewData) {
    Toast.error('Please generate a preview first.');
    return;
  }

  const btn = document.getElementById('saveDraftBtn');
  btn.disabled = true;
  btn.textContent = 'Saving Draft...';

  try {
    const payload = {
      month: currentPreviewData.month,
      year: currentPreviewData.year,
      working_days: currentPreviewData.workingDays
    };

    const res = await api.post('/api/payroll/process', payload);
    Toast.success(res.message);
    await loadPayrollRuns();
    viewRunDetails(res.runId);
  } catch (err) {
    Toast.error(err.message || 'Failed to save payroll run.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Process & Save Draft';
  }
}

async function viewRunDetails(runId) {
  activeRunId = runId;
  const container = document.getElementById('payrollDetailsContainer');
  container.style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth' });

  const runHeader = document.getElementById('runDetailsHeader');
  runHeader.innerHTML = '<div class="spinner"></div> Loading run details...';

  try {
    const res = await api.get(`/api/payroll/runs/${runId}`);
    const run = res.run;
    const records = res.records;

    renderRunDetails(run, records);
  } catch (err) {
    Toast.error('Failed to load run details: ' + err.message);
  }
}

function renderRunDetails(run, records) {
  const runHeader = document.getElementById('runDetailsHeader');
  const actionButtons = document.getElementById('runActionButtons');

  runHeader.innerHTML = `
    <div>
      <h3 style="font-size:1.4rem; color:var(--color-primary);">
        Payroll Run: ${getMonthName(run.month)} ${run.year}
      </h3>
      <div style="font-size:0.85rem; color:var(--color-text-muted); margin-top:0.25rem;">
        Status: <span class="badge ${getStatusBadgeClass(run.status)}">${escapeHtml(run.status)}</span>
        | Working Days: ${run.working_days} | Employees: ${run.employee_count}
      </div>
      ${run.reversal_notes ? `
        <div style="background:#FFFBEB; border:1px solid #FCD34D; color:#92400E; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.8rem; margin-top:0.5rem;">
          <strong>Audit Notes:</strong> ${escapeHtml(run.reversal_notes)}
        </div>
      ` : ''}
    </div>
    <div style="text-align:right;">
      <div style="font-size:0.8rem; color:var(--color-text-muted);">Total Net Disbursed</div>
      <div style="font-size:1.6rem; font-weight:800; color:var(--color-primary);">
        ₹${Number(run.total_net).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>
  `;

  // Render Action Buttons based on status
  let buttonsHtml = '';
  if (run.status === 'Draft') {
    buttonsHtml = `
      <button class="btn btn-warning" onclick="changeRunStatus(${run.id}, 'Pending Approval')">Submit for Approval</button>
    `;
  } else if (run.status === 'Pending Approval') {
    buttonsHtml = `
      <button class="btn btn-outline" onclick="changeRunStatus(${run.id}, 'Draft')">Reject to Draft</button>
      <button class="btn btn-success" onclick="changeRunStatus(${run.id}, 'Approved')">Approve Payroll</button>
    `;
  } else if (run.status === 'Approved') {
    buttonsHtml = `
      <button class="btn btn-accent" onclick="changeRunStatus(${run.id}, 'Finalized')">Finalize & Lock Payroll</button>
    `;
  } else if (run.status === 'Finalized') {
    buttonsHtml = `
      <button class="btn btn-outline" style="color:var(--color-danger); border-color:#FECACA;" onclick="openReversalModal(${run.id}, '${getMonthName(run.month)} ${run.year}')">
        Reverse / Adjust Payroll
      </button>
    `;
  }

  actionButtons.innerHTML = buttonsHtml;

  // Render records table
  const tbody = document.getElementById('runRecordsTableBody');
  if (tbody) {
    tbody.innerHTML = records.map(rec => `
      <tr>
        <td><strong>${escapeHtml(rec.payslip_number)}</strong></td>
        <td>
          <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(rec.employee_name)}</div>
          <div style="font-size:0.75rem; color:var(--color-text-muted);">${escapeHtml(rec.employee_code)}</div>
        </td>
        <td>${escapeHtml(rec.department_name)}</td>
        <td>₹${Number(rec.basic_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>₹${Number(rec.gross_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="color:var(--color-danger);">₹${Number(rec.total_deductions).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="font-weight:700; color:var(--color-primary);">₹${Number(rec.net_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td>
          <a href="/api/payslips/${rec.id}/download" class="btn btn-sm btn-outline" title="Download PDF Payslip">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            PDF
          </a>
        </td>
      </tr>
    `).join('');
  }
}

async function changeRunStatus(runId, status) {
  if (!confirm(`Are you sure you want to change payroll status to '${status}'?`)) return;

  try {
    const res = await api.patch(`/api/payroll/runs/${runId}/status`, { status });
    Toast.success(res.message);
    await loadPayrollRuns();
    viewRunDetails(runId);
  } catch (err) {
    Toast.error(err.message || 'Failed to update payroll status.');
  }
}

function openReversalModal(runId, periodText) {
  document.getElementById('reversalRunId').value = runId;
  document.getElementById('reversalPeriodText').textContent = periodText;
  document.getElementById('reversalReason').value = '';
  Modal.open('reversalModal');
}

async function handleReversalSubmit() {
  const id = document.getElementById('reversalRunId').value;
  const reason = document.getElementById('reversalReason').value.trim();

  if (!reason || reason.length < 5) {
    Toast.error('Please provide a detailed audit reason (min 5 characters) for reversing finalized payroll.');
    return;
  }

  try {
    const res = await api.post(`/api/payroll/runs/${id}/reverse`, { reason });
    Toast.success(res.message);
    Modal.close('reversalModal');
    await loadPayrollRuns();
    viewRunDetails(id);
  } catch (err) {
    Toast.error(err.message || 'Failed to reverse payroll.');
  }
}

function setupPayrollEvents() {
  const previewBtn = document.getElementById('previewPayrollBtn');
  const saveDraftBtn = document.getElementById('saveDraftBtn');

  if (previewBtn) previewBtn.addEventListener('click', previewPayroll);
  if (saveDraftBtn) saveDraftBtn.addEventListener('click', saveDraftPayroll);
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

window.previewPayroll = previewPayroll;
window.saveDraftPayroll = saveDraftPayroll;
window.viewRunDetails = viewRunDetails;
window.changeRunStatus = changeRunStatus;
window.showPreviewItemBreakdown = showPreviewItemBreakdown;
window.openReversalModal = openReversalModal;
window.handleReversalSubmit = handleReversalSubmit;
