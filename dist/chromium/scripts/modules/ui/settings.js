var App = App || {};
App.ui.Settings = (() => {
  let pendingFile = null;

  function setup() {
    App.ui.$('btn-export')?.addEventListener('click', doExport);
    App.ui.$('btn-export-header')?.addEventListener('click', doExport);
    App.ui.$('file-import')?.addEventListener('change', mostrarConfirmacionImport);
    App.ui.$('file-import-header')?.addEventListener('change', mostrarConfirmacionImport);

    App.ui.$('btn-cancel-import')?.addEventListener('click', cancelarImportacion);
    App.ui.$('btn-confirm-import')?.addEventListener('click', ejecutarImportacion);
    App.ui.$('import-confirm-overlay')?.addEventListener('click', (e) => {
      if (e.target === App.ui.$('import-confirm-overlay')) cancelarImportacion();
    });
  }

  function doExport() {
    const blob = new Blob([JSON.stringify(App.state.db, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: 'music_ranker_backup.json' });
    App.ui.Toast.show('📁 Exportando backup…');
  }

  function mostrarConfirmacionImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    pendingFile = file;
    App.ui.$('import-confirm-overlay').classList.remove('hidden');
    e.target.value = '';
  }

  function cancelarImportacion() {
    pendingFile = null;
    App.ui.$('import-confirm-overlay').classList.add('hidden');
  }

  async function ejecutarImportacion() {
    if (!pendingFile) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!imported || !Array.isArray(imported.songs)) throw new Error('invalid');
        
        imported.songs.forEach(song => {
          if (typeof song.useDeezer === 'undefined') {
            song.useDeezer = false;
          }
        });

        App.state.db = imported;
        App.state.currentMatch = [];   // BUG FIX: descartar duelo actual
        await App.storage.save();
        App.ui.Toast.show(`✅ ${App.state.db.songs.length} canciones importadas`);
        App.refreshActiveView();
      } catch (err) {
        App.ui.Toast.show('❌ Archivo JSON inválido');
      } finally {
        cancelarImportacion();
      }
    };
    reader.readAsText(pendingFile);
    pendingFile = null;
  }

  return { setup };
})();