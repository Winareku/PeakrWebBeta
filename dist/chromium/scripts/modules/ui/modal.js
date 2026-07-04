var App = App || {};
App.ui.Modal = (() => {
  const getDeezerSwitch = () => App.ui.$('toggle-deezer');

  function setDeezerFields(visible) {
    App.ui.$('deezer-fields')?.classList.toggle('hidden', !visible);
  }

  function openAddModal() {
    App.state.editingId = null;
    App.ui.$('modal-title').textContent    = 'Añadir elemento';
    App.ui.$('edit-display').value         = '';
    App.ui.$('edit-artist').value          = '';
    App.ui.$('edit-link').value            = '';
    App.ui.$('edit-img').value             = '';
    // Campos Deezer
    App.ui.$('edit-search-title').value    = '';
    App.ui.$('edit-search-artist').value   = '';
    getDeezerSwitch().checked              = false;
    setDeezerFields(false);
    App.ui.$('btn-save-modal').textContent = 'Añadir';
    App.ui.$('btn-delete-modal').classList.add('hidden');
    App.ui.$('modal-overlay').classList.remove('hidden');
    setTimeout(() => App.ui.$('edit-display').focus(), 50);
  }

  function openEditModal(id) {
    const song = App.state.db.songs.find(s => s.id === id);
    if (!song) return;
    App.state.editingId = id;
    App.ui.$('modal-title').textContent    = 'Editar elemento';
    App.ui.$('edit-display').value         = song.display  || '';
    App.ui.$('edit-artist').value          = song.artist   || '';
    App.ui.$('edit-link').value            = song.link     || '';
    App.ui.$('edit-img').value             = song.imgUrl   || '';
    // Campos Deezer
    App.ui.$('edit-search-title').value    = song.searchTitle   || '';
    App.ui.$('edit-search-artist').value   = song.searchArtist  || '';
    const useDeezer = song.useDeezer === true;
    getDeezerSwitch().checked = useDeezer;
    setDeezerFields(useDeezer);
    App.ui.$('btn-save-modal').textContent = 'Guardar';
    App.ui.$('btn-delete-modal').classList.remove('hidden');
    App.ui.$('modal-overlay').classList.remove('hidden');
    setTimeout(() => App.ui.$('edit-display').focus(), 50);
  }

  function closeModal() {
    App.ui.$('modal-overlay').classList.add('hidden');
    App.state.editingId = null;
  }

  async function saveModal() {
    const display = App.ui.$('edit-display').value.trim();
    const artist  = App.ui.$('edit-artist').value.trim();
    const link    = App.ui.$('edit-link').value.trim();
    const imgUrl  = App.ui.$('edit-img').value.trim();

    // Campos Deezer
    const useDeezer = getDeezerSwitch().checked;
    let searchTitle = App.ui.$('edit-search-title').value.trim();
    let searchArtist = App.ui.$('edit-search-artist').value.trim();

    if (useDeezer) {
      if (!searchTitle) searchTitle = display;
      if (!searchArtist) searchArtist = artist;
    } else {
      searchTitle = '';
      searchArtist = '';
    }

    if (!display) {
      App.ui.Toast.show('❗ El nombre de la canción es obligatorio');
      App.ui.$('edit-display').focus();
      return;
    }

    if (App.state.editingId) {
      const song = App.state.db.songs.find(s => s.id === App.state.editingId);
      if (song) {
        song.display = display;
        song.artist  = artist;
        song.link    = link;
        song.imgUrl  = imgUrl;
        song.useDeezer = useDeezer;
        song.searchTitle = searchTitle;
        song.searchArtist = searchArtist;
        
        // NUEVO: si el duelo actual muestra esta canción, actualizar la referencia en currentMatch
        App.state.currentMatch.forEach(matchSong => {
          if (matchSong.id === song.id) {
            matchSong.display = display;
            matchSong.artist  = artist;
            matchSong.link    = link;
            matchSong.imgUrl  = imgUrl;
            matchSong.useDeezer = useDeezer;
            matchSong.searchTitle = searchTitle;
            matchSong.searchArtist = searchArtist;
          }
        });
      }
      App.ui.Toast.show('✅ Canción actualizada');
    } else {
      App.state.db.songs.push({
        id:           crypto.randomUUID(),
        display,
        artist,
        points:       1200,
        competitions: 0,
        link,
        imgUrl,
        useDeezer,
        searchTitle,
        searchArtist
      });
      App.ui.Toast.show(`🎵 "${display}" añadida (${App.state.db.songs.length} total)`);
    }

    closeModal();
    await App.storage.save();
    App.refreshActiveView();
  }

  // NUEVO: botón para usar la URL de la pestaña activa
  function useCurrentPageUrl() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url) {
        App.ui.$('edit-link').value = tabs[0].url;
      }
    });
  }

  async function deleteCurrentSong() {
    if (!App.state.editingId) return;

    const song = App.state.db.songs.find(s => s.id === App.state.editingId);
    if (!song) return;

    // BUG FIX: si la canción está en el duelo actual, limpiar currentMatch
    if (App.state.currentMatch.some(s => s.id === App.state.editingId)) {
      App.state.currentMatch = [];
    }

    App.state.db.songs = App.state.db.songs.filter(s => s.id !== App.state.editingId);
    App.ui.Toast.show(`🗑️ "${song.display}" eliminada`);

    closeModal();
    await App.storage.save();
    App.refreshActiveView();
  }

  function setup() {
    App.ui.$('btn-save-modal').addEventListener('click', saveModal);
    App.ui.$('btn-cancel-modal').addEventListener('click', closeModal);
    App.ui.$('btn-delete-modal').addEventListener('click', deleteCurrentSong);

    // NUEVO: botón de “usar página actual”
    App.ui.$('btn-current-page')?.addEventListener('click', useCurrentPageUrl);

    // NUEVO: Listener para el switch de Deezer
    getDeezerSwitch()?.addEventListener('change', (e) => {
      setDeezerFields(e.target.checked);
    });

    App.ui.$('modal-overlay').addEventListener('click', (e) => {
      if (e.target === App.ui.$('modal-overlay')) closeModal();
    });

    ['edit-display','edit-artist','edit-link','edit-img'].forEach(id => {
      App.ui.$(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  saveModal();
        if (e.key === 'Escape') closeModal();
      });
    });

    // Botones que abren el modal de añadir
    App.ui.$('btn-add-first')?.addEventListener('click', openAddModal);
    App.ui.$('btn-add-header')?.addEventListener('click', openAddModal);
    App.ui.$('fab-add-ranking')?.addEventListener('click', openAddModal);

    // Confirmación de borrado total
    App.ui.$('btn-reset')?.addEventListener('click', () => {
      App.ui.$('confirm-overlay').classList.remove('hidden');
    });
    App.ui.$('btn-cancel-confirm')?.addEventListener('click', () => {
      App.ui.$('confirm-overlay').classList.add('hidden');
    });
    App.ui.$('confirm-overlay')?.addEventListener('click', (e) => {
      if (e.target === App.ui.$('confirm-overlay')) {
        App.ui.$('confirm-overlay').classList.add('hidden');
      }
    });
    App.ui.$('btn-confirm-delete')?.addEventListener('click', async () => {
      App.state.db = { songs: [] };
      App.state.currentMatch = [];   // BUG FIX: limpiar duelo actual
      await App.storage.clear();
      App.ui.$('confirm-overlay').classList.add('hidden');
      App.ui.Toast.show('🗑️ Todos los datos borrados');
      App.refreshActiveView();
    });

    // NUEVO: cerrar cualquier modal con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!App.ui.$('modal-overlay').classList.contains('hidden')) {
          closeModal();
        } else if (App.ui.$('confirm-overlay') && !App.ui.$('confirm-overlay').classList.contains('hidden')) {
          App.ui.$('confirm-overlay').classList.add('hidden');
        } else if (App.ui.$('import-confirm-overlay') && !App.ui.$('import-confirm-overlay').classList.contains('hidden')) {
          App.ui.$('import-confirm-overlay').classList.add('hidden');
        }
      }
    });
  }

  return { setup, openAddModal, openEditModal };
})();