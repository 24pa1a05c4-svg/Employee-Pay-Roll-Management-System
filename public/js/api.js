/**
 * Centralized API Client with automatic CSRF management and session check
 */
const api = (function () {
  let csrfToken = null;

  async function fetchCsrfToken() {
    try {
      const res = await fetch('/api/csrf-token');
      if (res.ok) {
        const data = await res.json();
        csrfToken = data.csrfToken;
      }
    } catch (err) {
      console.warn('Failed to prefetch CSRF token:', err.message);
    }
  }

  async function request(url, options = {}) {
    if (!csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
      await fetchCsrfToken();
    }

    const headers = {
      'Accept': 'application/json',
      ...(options.headers || {})
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle session expiration
    if (response.status === 401 && !url.includes('/api/auth/login')) {
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = '/login.html?expired=1';
      }
    }

    // Try parsing JSON
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMsg = (typeof data === 'object' && data.message) ? data.message : 'An error occurred';
      const err = new Error(errorMsg);
      err.response = response;
      err.data = data;
      throw err;
    }

    return data;
  }

  return {
    get: (url, opts) => request(url, { ...opts, method: 'GET' }),
    post: (url, body, opts) => request(url, { ...opts, method: 'POST', body }),
    put: (url, body, opts) => request(url, { ...opts, method: 'PUT', body }),
    patch: (url, body, opts) => request(url, { ...opts, method: 'PATCH', body }),
    delete: (url, opts) => request(url, { ...opts, method: 'DELETE' }),
    fetchCsrfToken
  };
})();

// Prefetch CSRF token on load
document.addEventListener('DOMContentLoaded', () => {
  api.fetchCsrfToken();
});

window.api = api;
