/**
 * Department & Designation Management Script
 */
document.addEventListener('DOMContentLoaded', async () => {
  if (window.location.pathname.includes('login.html')) return;
  await loadDepartments();
  await loadDesignations();
  setupDepartmentForms();
});

let cachedDepartments = [];

async function loadDepartments() {
  const tbody = document.getElementById('departmentsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:2rem;"><div class="spinner"></div></td></tr>';
  }

  try {
    const res = await api.get('/api/departments');
    cachedDepartments = res.data || [];
    renderDepartments(cachedDepartments);
    populateDepartmentDropdowns();
  } catch (err) {
    Toast.error('Failed to load departments: ' + err.message);
  }
}

function renderDepartments(departments) {
  const tbody = document.getElementById('departmentsTableBody');
  if (!tbody) return;

  if (!departments || departments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-title">No departments found</div></td></tr>';
    return;
  }

  tbody.innerHTML = departments.map(d => `
    <tr>
      <td><strong>${escapeHtml(d.code)}</strong></td>
      <td style="font-weight:600; color:var(--color-primary);">${escapeHtml(d.name)}</td>
      <td style="color:var(--color-text-muted); font-size:0.85rem;">${escapeHtml(d.description || '-')}</td>
      <td>
        <span class="badge ${d.employee_count > 0 ? 'badge-info' : 'badge-neutral'}">
          ${d.employee_count} employee(s)
        </span>
      </td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn btn-sm btn-outline" onclick="editDepartment(${d.id})" title="Edit">Edit</button>
          <button class="btn btn-sm btn-outline" style="color:var(--color-danger); border-color:#FECACA;" onclick="deleteDepartment(${d.id}, '${escapeHtml(d.name)}')" title="Delete">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function loadDesignations() {
  const tbody = document.getElementById('designationsTableBody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:2rem;"><div class="spinner"></div></td></tr>';
  }

  try {
    const res = await api.get('/api/designations');
    renderDesignations(res.data);
  } catch (err) {
    Toast.error('Failed to load designations: ' + err.message);
  }
}

function renderDesignations(designations) {
  const tbody = document.getElementById('designationsTableBody');
  if (!tbody) return;

  if (!designations || designations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-title">No designations found</div></td></tr>';
    return;
  }

  tbody.innerHTML = designations.map(d => `
    <tr>
      <td><strong>${escapeHtml(d.code)}</strong></td>
      <td style="font-weight:600; color:var(--color-primary);">${escapeHtml(d.title)}</td>
      <td>${escapeHtml(d.department_name)}</td>
      <td>
        <span class="badge ${d.employee_count > 0 ? 'badge-info' : 'badge-neutral'}">
          ${d.employee_count} employee(s)
        </span>
      </td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn btn-sm btn-outline" onclick="editDesignation(${d.id})" title="Edit">Edit</button>
          <button class="btn btn-sm btn-outline" style="color:var(--color-danger); border-color:#FECACA;" onclick="deleteDesignation(${d.id}, '${escapeHtml(d.title)}')" title="Delete">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function populateDepartmentDropdowns() {
  const desigDeptSelect = document.getElementById('desigDepartment');
  if (desigDeptSelect) {
    desigDeptSelect.innerHTML = '<option value="">Select Department</option>' +
      cachedDepartments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }
}

function setupDepartmentForms() {
  const deptForm = document.getElementById('deptForm');
  const desigForm = document.getElementById('desigForm');

  if (deptForm) {
    deptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('deptId').value;
      const isEdit = Boolean(id);

      const payload = {
        name: document.getElementById('deptName').value.trim(),
        code: document.getElementById('deptCode').value.trim(),
        description: document.getElementById('deptDesc').value.trim()
      };

      try {
        if (isEdit) {
          await api.put(`/api/departments/${id}`, payload);
          Toast.success('Department updated successfully.');
        } else {
          await api.post('/api/departments', payload);
          Toast.success('Department created successfully.');
        }

        Modal.close('deptModal');
        await loadDepartments();
      } catch (err) {
        Toast.error(err.message || 'Failed to save department.');
      }
    });
  }

  if (desigForm) {
    desigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('desigId').value;
      const isEdit = Boolean(id);

      const payload = {
        department_id: document.getElementById('desigDepartment').value,
        title: document.getElementById('desigTitle').value.trim(),
        code: document.getElementById('desigCode').value.trim(),
        description: document.getElementById('desigDesc').value.trim()
      };

      try {
        if (isEdit) {
          await api.put(`/api/designations/${id}`, payload);
          Toast.success('Designation updated successfully.');
        } else {
          await api.post('/api/designations', payload);
          Toast.success('Designation created successfully.');
        }

        Modal.close('desigModal');
        await loadDesignations();
      } catch (err) {
        Toast.error(err.message || 'Failed to save designation.');
      }
    });
  }
}

function openAddDeptModal() {
  document.getElementById('deptForm').reset();
  document.getElementById('deptId').value = '';
  document.getElementById('deptModalTitle').textContent = 'Add Department';
  Modal.open('deptModal');
}

async function editDepartment(id) {
  try {
    const res = await api.get(`/api/departments/${id}`);
    const d = res.department;
    document.getElementById('deptId').value = d.id;
    document.getElementById('deptName').value = d.name;
    document.getElementById('deptCode').value = d.code;
    document.getElementById('deptDesc').value = d.description || '';
    document.getElementById('deptModalTitle').textContent = 'Edit Department';
    Modal.open('deptModal');
  } catch (err) {
    Toast.error('Failed to load department: ' + err.message);
  }
}

async function deleteDepartment(id, name) {
  if (!confirm(`Are you sure you want to delete department '${name}'?\nThis will fail if employees or designations are assigned to it.`)) {
    return;
  }

  try {
    const res = await api.delete(`/api/departments/${id}`);
    Toast.success(res.message);
    await loadDepartments();
  } catch (err) {
    Toast.error(err.message || 'Cannot delete department.');
  }
}

function openAddDesigModal() {
  document.getElementById('desigForm').reset();
  document.getElementById('desigId').value = '';
  document.getElementById('desigModalTitle').textContent = 'Add Designation';
  Modal.open('desigModal');
}

async function editDesignation(id) {
  try {
    const res = await api.get(`/api/designations/${id}`);
    const d = res.designation;
    document.getElementById('desigId').value = d.id;
    document.getElementById('desigDepartment').value = d.department_id;
    document.getElementById('desigTitle').value = d.title;
    document.getElementById('desigCode').value = d.code;
    document.getElementById('desigDesc').value = d.description || '';
    document.getElementById('desigModalTitle').textContent = 'Edit Designation';
    Modal.open('desigModal');
  } catch (err) {
    Toast.error('Failed to load designation: ' + err.message);
  }
}

async function deleteDesignation(id, title) {
  if (!confirm(`Are you sure you want to delete designation '${title}'?\nThis will fail if employees are assigned to it.`)) {
    return;
  }

  try {
    const res = await api.delete(`/api/designations/${id}`);
    Toast.success(res.message);
    await loadDesignations();
  } catch (err) {
    Toast.error(err.message || 'Cannot delete designation.');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.openAddDeptModal = openAddDeptModal;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;
window.openAddDesigModal = openAddDesigModal;
window.editDesignation = editDesignation;
window.deleteDesignation = deleteDesignation;
