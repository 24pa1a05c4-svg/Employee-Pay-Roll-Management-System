/**
 * Accessible Modal Manager
 */
const Modal = (function () {
  function open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus on first input
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  function close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Setup click-outside backdrop and escape key listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        close(activeModal.id);
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      const modal = e.target.closest('.modal');
      if (modal) {
        close(modal.id);
      }
    }
  });

  return {
    open,
    close
  };
})();

window.Modal = Modal;
