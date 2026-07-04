var App = App || {};
App.ui.Navigation = (() => {
  const views = {
    arena:    { navId: 'nav-arena',    viewId: 'view-arena' },
    ranking:  { navId: 'nav-ranking',  viewId: 'view-ranking' },
    settings: { navId: 'nav-settings', viewId: 'view-settings' }
  };

  function setup() {
    Object.values(views).forEach(cfg => {
      const btn = App.ui.$(cfg.navId);
      if (btn) {
        btn.addEventListener('click', () => switchTo(cfg.viewId));
      }
    });
  }

  function switchTo(viewId) {
    // Desactivar todos los botones y vistas
    Object.values(views).forEach(cfg => {
      App.ui.$(cfg.navId)?.classList.remove('active');
      App.ui.$(cfg.viewId)?.classList.remove('active');
    });

    // Si salimos de la arena, detener cualquier preview
    if (viewId !== 'view-arena') {
      App.audio?.reset();
    }

    // Activar el botón correspondiente
    const activeCfg = Object.values(views).find(c => c.viewId === viewId);
    if (activeCfg && App.ui.$(activeCfg.navId)) {
      App.ui.$(activeCfg.navId).classList.add('active');
    }
    App.ui.$(viewId)?.classList.add('active');

    // Refrescar contenido según la vista
    if (viewId === 'view-ranking')  App.ui.Ranking.render();
    if (viewId === 'view-arena')    App.refreshActiveView();
    if (viewId === 'view-settings') App.ui.Maturity.render();
  }

  return { setup, switchTo };
})();