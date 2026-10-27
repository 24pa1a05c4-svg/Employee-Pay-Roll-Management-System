/**
 * Employee Management Page Script
 */
let currentPage = 1;
const pageSize = 10;
let departmentsList = [];
let designationsList = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  await loadDepartmentsAndDesignations();
  await loadEmployees();
  setupEventListeners();
});

async function loadDepartmentsAndDesignations() {
  try {
    const [deptRes, desigRes] = await Promise.all([
      api.get('/api/departments'),
      api.get('/api/designations')
    ]);

    departmentsList = deptRes.data || [];
    designationsList = desigRes.data || [];

    // Populate department filter select
    const filterDept = document.getElementById('filterDepartment');
    const formDept = document.getElementById('empDepartment');

    if (filterDept) {
      filterDept.innerHTML = '<option value="">All Departments</option>' +
        departmentsList.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    }

    if (formDept) {
      formDept.innerHTML = '<option value="">Select Department</option>' +
        departmentsList.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load departments/designations:', err);
  }
}

function updateDesignationOptions(deptId, targetSelectId = 'empDesignation', selectedDesigId = null) {
  const select = document.getElementById(targetSelectId);
  if (!select) return;

  const filtered = deptId 
    ? designationsList.filter(d => d.department_id === parseInt(deptId, 10))
    : designationsList;

  select.innerHTML = '<option value="">Select Designation</option>' +
    filtered.map(d => `<option value="${d.id}" ${d.id === parseInt(selectedDesigId, 10) ? 'selected' : ''}>${escapeHtml(d.title)}</option>`).join('');
}

async function loadEmployees() {
  const search = document.getElementById('searchEmployee')?.value.trim() || '';
  const departmentId = document.getElementById('filterDepartment')?.value || '';
  const status = document.getElementById('filterStatus')?.value || '';

  const tbody = document.getElementById('employeeTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding:2rem;"><div class="spinner"></div><div class="empty-desc" style="margin-top:0.5rem;">Loading employees...</div></td></tr>';
  }

  try {
    const query = new URLSearchParams({
      search,
      departmentId,
      status,
      page: currentPage,
      limit: pageSize
    });

    const res = await api.get(`/api/employees?${query.toString()}`);
    renderEmployeeTable(res.data);
    renderPagination(res.pagination);
  } catch (err) {
    Toast.error('Failed to load employees: ' + err.message);
  }
}

function renderEmployeeTable(employees) {
  const tbody = document.getElementById('employeeTableBody');
  if (!tbody) return;

  if (!employees || employees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <div class="empty-title">No employees found</div>
            <div class="empty-desc">Try adjusting your search criteria or add a new employee record.</div>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = employees.map(emp => `
    <tr>
      <td><strong>${escapeHtml(emp.employee_code)}</strong></td>
      <td>
        <div style="font-weight:600; color:var(--color-primary);">${escapeHtml(emp.full_name)}</div>
        <div style="font-size:0.78rem; color:var(--color-text-muted);">${escapeHtml(emp.email)}</div>
      </td>
      <td>${escapeHtml(emp.department_name)}</td>
      <td>${escapeHtml(emp.designation_title)}</td>
      <td><strong>₹${Number(emp.basic_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
      <td><span class="badge ${getStatusBadgeClass(emp.status)}">${escapeHtml(emp.status)}</span></td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn btn-sm btn-outline" onclick="viewEmployee(${emp.id})" title="View Details">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </button>
          <button class="btn btn-sm btn-outline" onclick="editEmployee(${emp.id})" title="Edit">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </button>
          ${emp.status === 'Active' ? `
            <button class="btn btn-sm btn-outline" style="color:var(--color-danger); border-color:#FECACA;" onclick="confirmDeactivate(${emp.id}, '${escapeHtml(emp.full_name)}')" title="Deactivate">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </button>
          ` : `
            <button class="btn btn-sm btn-outline" style="color:var(--color-success); border-color:#A7F3D0;" onclick="reactivateEmployee(${emp.id})" title="Activate">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderPagination(pagination) {
  const container = document.getElementById('paginationControls');
  const infoEl = document.getElementById('paginationInfo');

  if (infoEl) {
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    infoEl.textContent = pagination.total > 0 
      ? `Showing ${start} - ${end} of ${pagination.total} employees`
      : '0 employees';
  }

  if (container) {
    if (pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let buttons = `
      <button class="page-btn" ${pagination.page === 1 ? 'disabled' : ''} onclick="goToPage(${pagination.page - 1})">Previous</button>
    `;

    for (let i = 1; i <= pagination.totalPages; i++) {
      if (i === 1 || i === pagination.totalPages || (i >= pagination.page - 1 && i <= pagination.page + 1)) {
        buttons += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
      } else if (i === pagination.page - 2 || i === pagination.page + 2) {
        buttons += `<span style="padding:0 0.25rem;">...</span>`;
      }
    }

    buttons += `
      <button class="page-btn" ${pagination.page === pagination.totalPages ? 'disabled' : ''} onclick="goToPage(${pagination.page + 1})">Next</button>
    `;

    container.innerHTML = buttons;
  }
}

function goToPage(page) {
  currentPage = page;
  loadEmployees();
}

function setupEventListeners() {
  const searchInput = document.getElementById('searchEmployee');
  const filterDept = document.getElementById('filterDepartment');
  const filterStatus = document.getElementById('filterStatus');
  const empDeptSelect = document.getElementById('empDepartment');
  const employeeForm = document.getElementById('employeeForm');

  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentPage = 1;
        loadEmployees();
      }, 350);
    });
  }

  if (filterDept) {
    filterDept.addEventListener('change', () => {
      currentPage = 1;
      loadEmployees();
    });
  }

  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentPage = 1;
      loadEmployees();
    });
  }

  if (empDeptSelect) {
    empDeptSelect.addEventListener('change', (e) => {
      updateDesignationOptions(e.target.value, 'empDesignation');
    });
  }

  // Toggle user account fields in add modal
  const createUserCheck = document.getElementById('createUserAccount');
  const userFields = document.getElementById('userAccountFields');
  if (createUserCheck && userFields) {
    createUserCheck.addEventListener('change', (e) => {
      userFields.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  if (employeeForm) {
    employeeForm.addEventListener('submit', handleEmployeeFormSubmit);
  }
}

function openAddEmployeeModal() {
  const form = document.getElementById('employeeForm');
  if (form) form.reset();

  document.getElementById('empId').value = '';
  document.getElementById('employeeModalTitle').textContent = 'Add New Employee';
  document.getElementById('createUserGroup').style.display = 'block';
  document.getElementById('userAccountFields').style.display = 'none';

  updateDesignationOptions(null, 'empDesignation');
  Modal.open('employeeModal');
}

async function editEmployee(id) {
  try {
    const res = await api.get(`/api/employees/${id}`);
    const emp = res.employee;

    document.getElementById('empId').value = emp.id;
    document.getElementById('employeeModalTitle').textContent = `Edit Employee: ${emp.full_name} (${emp.employee_code})`;
    document.getElementById('empFirstName').value = emp.first_name || '';
    document.getElementById('empLastName').value = emp.last_name || '';
    document.getElementById('empEmail').value = emp.email || '';
    document.getElementById('empPhone').value = emp.phone || '';
    document.getElementById('empDob').value = emp.date_of_birth ? emp.date_of_birth.substring(0, 10) : '';
    document.getElementById('empGender').value = emp.gender || 'Other';
    document.getElementById('empJoiningDate').value = emp.joining_date ? emp.joining_date.substring(0, 10) : '';
    document.getElementById('empDepartment').value = emp.department_id || '';
    document.getElementById('empBasicSalary').value = emp.basic_salary || '';
    document.getElementById('empBankName').value = emp.bank_name || '';
    document.getElementById('empBankAccount').value = emp.bank_account_number || '';
    document.getElementById('empBankIfsc').value = emp.bank_ifsc || '';
    document.getElementById('empPan').value = emp.pan_number || '';
    document.getElementById('empAddress').value = emp.address || '';

    // Update designation dropdown
    updateDesignationOptions(emp.department_id, 'empDesignation', emp.designation_id);

    // Hide user account creation fields in edit mode
    document.getElementById('createUserGroup').style.display = 'none';
    document.getElementById('userAccountFields').style.display = 'none';

    Modal.open('employeeModal');
  } catch (err) {
    Toast.error('Failed to load employee details: ' + err.message);
  }
}

async function handleEmployeeFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('empId').value;
  const isEdit = Boolean(id);

  const payload = {
    first_name: document.getElementById('empFirstName').value.trim(),
    last_name: document.getElementById('empLastName').value.trim(),
    email: document.getElementById('empEmail').value.trim(),
    phone: document.getElementById('empPhone').value.trim(),
    date_of_birth: document.getElementById('empDob').value || null,
    gender: document.getElementById('empGender').value,
    joining_date: document.getElementById('empJoiningDate').value,
    department_id: document.getElementById('empDepartment').value,
    designation_id: document.getElementById('empDesignation').value,
    basic_salary: parseFloat(document.getElementById('empBasicSalary').value) || 0,
    bank_name: document.getElementById('empBankName').value.trim() || null,
    bank_account_number: document.getElementById('empBankAccount').value.trim() || null,
    bank_ifsc: document.getElementById('empBankIfsc').value.trim() || null,
    pan_number: document.getElementById('empPan').value.trim() || null,
    address: document.getElementById('empAddress').value.trim() || null
  };

  if (!isEdit) {
    const createUserCheck = document.getElementById('createUserAccount');
    if (createUserCheck && createUserCheck.checked) {
      payload.create_user_account = true;
      payload.username = document.getElementById('accUsername').value.trim();
      payload.password = document.getElementById('accPassword').value;
    }
  }

  const submitBtn = document.getElementById('saveEmployeeBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    if (isEdit) {
      await api.put(`/api/employees/${id}`, payload);
      Toast.success('Employee updated successfully.');
    } else {
      const res = await api.post('/api/employees', payload);
      Toast.success(`Employee added successfully with ID ${res.employeeCode}`);
    }

    Modal.close('employeeModal');
    loadEmployees();
  } catch (err) {
    Toast.error(err.message || 'Failed to save employee.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Employee';
  }
}

async function viewEmployee(id) {
  try {
    const res = await api.get(`/api/employees/${id}`);
    const emp = res.employee;
    const salary = res.salaryStructure;

    const modalBody = document.getElementById('viewEmployeeDetailsBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="display:flex; align-items:center; gap:1.25rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--color-border);">
        <div class="user-avatar" style="width:52px; height:52px; font-size:1.3rem;">
          ${emp.full_name.split(' ').map(n=>n[0]).join('').substring(0, 2)}
        </div>
        <div>
          <h3 style="font-size:1.25rem; color:var(--color-primary);">${escapeHtml(emp.full_name)}</h3>
          <div style="color:var(--color-text-muted); font-size:0.85rem;">${escapeHtml(emp.employee_code)} | ${escapeHtml(emp.department_name)} - ${escapeHtml(emp.designation_title)}</div>
        </div>
      </div>

      <div class="calc-breakdown-box" style="margin:0 0 1.5rem 0;">
        <div class="breakdown-col">
          <h4>Profile Details</h4>
          <div class="breakdown-row"><span>Email:</span><strong>${escapeHtml(emp.email)}</strong></div>
          <div class="breakdown-row"><span>Phone:</span><strong>${escapeHtml(emp.phone)}</strong></div>
          <div class="breakdown-row"><span>Date of Birth:</span><strong>${formatDate(emp.date_of_birth)}</strong></div>
          <div class="breakdown-row"><span>Gender:</span><strong>${escapeHtml(emp.gender)}</strong></div>
          <div class="breakdown-row"><span>Joining Date:</span><strong>${formatDate(emp.joining_date)}</strong></div>
          <div class="breakdown-row"><span>Status:</span><span class="badge ${getStatusBadgeClass(emp.status)}">${escapeHtml(emp.status)}</span></div>
        </div>
        <div class="breakdown-col">
          <h4>Banking Details (Masked)</h4>
          <div class="breakdown-row"><span>Bank Name:</span><strong>${escapeHtml(emp.bank_name || 'N/A')}</strong></div>
          <div class="breakdown-row"><span>Account No:</span><strong>${escapeHtml(emp.masked_bank_account)}</strong></div>
          <div class="breakdown-row"><span>IFSC Code:</span><strong>${escapeHtml(emp.bank_ifsc || 'N/A')}</strong></div>
          <div class="breakdown-row"><span>PAN Number:</span><strong>${escapeHtml(emp.pan_number || 'N/A')}</strong></div>
        </div>
      </div>

      ${salary ? `
        <div class="card" style="margin-top:1rem;">
          <div class="card-header" style="padding:0.75rem 1rem;">
            <div class="card-title" style="font-size:0.95rem;">Configured Salary Structure</div>
          </div>
          <div class="card-body" style="padding:1rem;">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem; font-size:0.85rem;">
              <div>Basic Salary: <strong>₹${Number(salary.basic_salary).toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></div>
              <div>HRA: <strong>${salary.hra_type === 'percentage' ? salary.hra_value + '%' : '₹' + salary.hra_value}</strong></div>
              <div>Other Allowances: <strong>₹${Number(salary.other_allowances).toLocaleString('en-IN', {minimumFractionDigits:2})}</strong></div>
              <div>PF Applicable: <strong>${salary.pf_applicable ? salary.pf_rate + '%' : 'No'}</strong></div>
              <div>PT Amount: <strong>₹${salary.pt_amount}</strong></div>
              <div>TDS Rate: <strong>${salary.tds_rate}%</strong></div>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    Modal.open('viewEmployeeModal');
  } catch (err) {
    Toast.error('Failed to view employee details: ' + err.message);
  }
}

function confirmDeactivate(id, name) {
  document.getElementById('deactivateEmpId').value = id;
  document.getElementById('deactivateEmpName').textContent = name;
  Modal.open('deactivateModal');
}

async function handleDeactivateSubmit() {
  const id = document.getElementById('deactivateEmpId').value;
  const status = document.getElementById('deactivateStatus').value;
  const reason = document.getElementById('deactivateReason').value.trim();

  try {
    const res = await api.patch(`/api/employees/${id}/deactivate`, { status, reason });
    Toast.success(res.message);
    Modal.close('deactivateModal');
    loadEmployees();
  } catch (err) {
    Toast.error('Deactivation failed: ' + err.message);
  }
}

async function reactivateEmployee(id) {
  if (!confirm('Reactivate this employee back to Active status?')) return;
  try {
    const res = await api.patch(`/api/employees/${id}/deactivate`, { status: 'Active' });
    Toast.success(res.message);
    loadEmployees();
  } catch (err) {
    Toast.error('Activation failed: ' + err.message);
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Active': return 'badge-success';
    case 'Inactive': return 'badge-warning';
    case 'Terminated': return 'badge-danger';
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

window.openAddEmployeeModal = openAddEmployeeModal;
window.editEmployee = editEmployee;
window.viewEmployee = viewEmployee;
window.confirmDeactivate = confirmDeactivate;
window.handleDeactivateSubmit = handleDeactivateSubmit;
window.reactivateEmployee = reactivateEmployee;
window.goToPage = goToPage;
