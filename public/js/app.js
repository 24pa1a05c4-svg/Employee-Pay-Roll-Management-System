/**
 * Shared App Shell Logic
 * Handles sidebar toggling, user state, navigation highlighting, and role-based menu display
 */
const App = (function () {
  let currentUser = null;

  async function init() {
    setupSidebar();
    await checkAuth();
    highlightActiveNav();
  }

  async function checkAuth() {
    try {
      const data = await api.get('/api/auth/me');
      currentUser = data.user;
      renderUserInfo(currentUser, data.employee);
      adjustNavForRole(currentUser.role);
    } catch (err) {
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html';
      }
    }
  }

  function renderUserInfo(user, employee) {
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');

    const displayName = employee ? employee.full_name : user.username;
    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Administrator' : 'Employee';
    if (avatarEl) {
      const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'U';
    }
  }

  function adjustNavForRole(role) {
    const adminNavItems = document.querySelectorAll('.nav-admin-only');
    const employeeNavItems = document.querySelectorAll('.nav-employee-only');

    if (role === 'admin') {
      adminNavItems.forEach(el => el.style.display = '');
      employeeNavItems.forEach(el => el.style.display = 'none');
    } else {
      adminNavItems.forEach(el => el.style.display = 'none');
      employeeNavItems.forEach(el => el.style.display = '');
    }
  }

  function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar) return;

    // Restore desktop collapsed preference
    const isCollapsed = localStorage.getItem('payroll_sidebar_collapsed') === 'true';
    if (isCollapsed && window.innerWidth > 992) {
      sidebar.classList.add('collapsed');
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (window.innerWidth <= 992) {
          sidebar.classList.toggle('mobile-open');
          if (overlay) overlay.classList.toggle('active');
        } else {
          sidebar.classList.toggle('collapsed');
          localStorage.setItem('payroll_sidebar_collapsed', sidebar.classList.contains('collapsed'));
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }
  }

  function highlightActiveNav() {
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.includes(currentPath)) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  async function handleLogout() {
    if (!confirm('Are you sure you want to log out of the Employee Payroll Management System?')) {
      return;
    }

    try {
      await api.post('/api/auth/logout');
      Toast.success('Logged out successfully.');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 500);
    } catch (err) {
      Toast.error('Logout failed: ' + err.message);
    }
  }

  return {
    init,
    checkAuth,
    handleLogout,
    getCurrentUser: () => currentUser
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.pathname.includes('login.html')) {
    App.init();
  }
});

window.App = App;
