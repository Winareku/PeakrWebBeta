var App = App || {};
App.ui = App.ui || {};

App.ui.Toast = (() => {
  const MAX_TOASTS = 3;
  const queue = [];

  function show(msg) {
    const stack = App.ui.$('toast-stack');
    if (queue.length >= MAX_TOASTS) dismiss(queue[0]);

    const el = document.createElement('div');
    el.className = 'toast-item';
    el.innerHTML =
      `<span class="toast-msg">${msg}</span>` +
      `<button class="toast-close" title="Cerrar"><span class="material-symbols-outlined">close</span></button>`;

    el.querySelector('.toast-close').addEventListener('click', () => dismiss(el));
    stack.appendChild(el);
    queue.push(el);

    setTimeout(() => dismiss(el), 3500);
  }

  function dismiss(el) {
    if (!el || !el.parentElement) return;
    const idx = queue.indexOf(el);
    if (idx !== -1) queue.splice(idx, 1);
    el.classList.add('fade-out');
    setTimeout(() => { if (el.parentElement) el.remove(); }, 280);
  }

  return { show };
})();