/**
 * Login & Authentication Page Script
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorBox = document.getElementById('errorBox');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  // Check if redirected due to session expiration
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === '1') {
    if (errorBox) {
      errorBox.textContent = 'Your session has expired. Please log in again to continue.';
      errorBox.style.display = 'block';
    }
  }

  // Demo credential pills quick-fill
  document.querySelectorAll('.demo-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const u = pill.getAttribute('data-username');
      const p = pill.getAttribute('data-password');
      if (usernameInput) usernameInput.value = u;
      if (passwordInput) passwordInput.value = p;
      if (errorBox) errorBox.style.display = 'none';
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (!username || !password) {
        showError('Please enter both username/email and password.');
        return;
      }

      setLoading(true);
      if (errorBox) errorBox.style.display = 'none';

      try {
        const response = await api.post('/api/auth/login', { username, password });
        Toast.success('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 600);
      } catch (err) {
        setLoading(false);
        showError(err.message || 'Login failed. Please verify your credentials.');
      }
    });
  }

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = 'block';
    } else {
      Toast.error(msg);
    }
  }

  function setLoading(loading) {
    if (!loginBtn) return;
    if (loading) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;"></span> Signing in...';
    } else {
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Sign In to Dashboard';
    }
  }
});
