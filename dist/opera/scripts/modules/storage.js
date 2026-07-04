var App = App || {};
App.storage = {
  async load() {
    const result = await chrome.storage.local.get(['musicDB']);
    if (result && result.musicDB && Array.isArray(result.musicDB.songs)) {
      App.state.db = result.musicDB;
      console.log('[Storage] Datos cargados, canciones:', App.state.db.songs.length);
    } else {
      console.log('[Storage] No se encontraron datos previos');
    }
  },

  async save() {
    await chrome.storage.local.set({ musicDB: App.state.db });
    console.log('[Storage] Guardado exitoso');
  },

  async clear() {
    await chrome.storage.local.remove('musicDB');
  }
};