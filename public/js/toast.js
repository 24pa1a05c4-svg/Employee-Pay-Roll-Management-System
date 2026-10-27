/**
 * Toast Notification Module
 */
const Toast = (function () {
  let container = null;

  function ensureContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 4000) {
    const parent = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    switch (type) {
      case 'success':
        iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
        break;
      case 'error':
        iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
        break;
      case 'warning':
        iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
        break;
      default:
        iconSvg = '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-message" style="flex:1;">${escapeHtml(message)}</span>
    `;

    parent.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    success: (msg, d) => show(msg, 'success', d),
    error: (msg, d) => show(msg, 'error', d),
    warning: (msg, d) => show(msg, 'warning', d),
    info: (msg, d) => show(msg, 'info', d)
  };
})();

window.Toast = Toast;
