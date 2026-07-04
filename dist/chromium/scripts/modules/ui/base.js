var App = App || {};
App.ui = App.ui || {};

App.ui.$ = (id) => document.getElementById(id);

App.ui.escHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

App.ui.DEFAULT_IMG = App.state.DEFAULT_IMG; // acceso rápido