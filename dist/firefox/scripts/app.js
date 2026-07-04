// app.js – Inicialización de toda la extensión
var App = App || {};

App.refreshActiveView = function () {
  if (App.ui.$('view-arena').classList.contains('active')) {
    // Si hay un duelo activo y válido, solo re-renderizamos, no empezamos uno nuevo
    if (App.state.currentMatch.length === 2 &&
        App.state.db.songs.some(s => s.id === App.state.currentMatch[0].id) &&
        App.state.db.songs.some(s => s.id === App.state.currentMatch[1].id)) {
      App.ui.Arena.render();
    } else {
      App.ui.Arena.refresh();  // si no hay duelo válido, reiniciamos
    }
  } else if (App.ui.$('view-ranking').classList.contains('active')) {
    App.ui.Ranking.render();
  } else if (App.ui.$('view-settings').classList.contains('active')) {
    App.ui.Maturity.render();
  }
};

async function init() {
  console.log('[App] Iniciando Relayouter...');
  try {
    await App.storage.load();
  } catch (e) {
    console.error('[App] Error al cargar datos:', e);
  }

  App.ui.Modal.setup();
  App.ui.Navigation.setup();
  App.ui.Settings.setup();

  document.getElementById('fab-open-ranking')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'ranking-full.html' });
  });

  console.log('[App] Listeners instalados.');
  App.ui.Arena.refresh();
  console.log('[App] Listo.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}