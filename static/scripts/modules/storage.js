/**
 * storage.js – Módulo de persistencia multiusuario para Peakr Web
 * ===============================================================
 * Envía el usuario actual en la cabecera 'X-User' en cada petición fetch.
 */

var App = App || {};

App.storage = (function () {

  const API_URL = '/api/songs';

  // ── Helpers internos ────────────────────────────────────────────

  async function _get() {
    const username = localStorage.getItem('peakr_user') || 'default';
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'X-User': username
      },
    });
    if (!res.ok) throw new Error(`[Storage] GET falló: ${res.status}`);
    return res.json();
  }

  async function _post(data) {
    const username = localStorage.getItem('peakr_user') || 'default';
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-User': username
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`[Storage] POST falló: ${res.status}`);
    return res.json();
  }

  async function _delete() {
    const username = localStorage.getItem('peakr_user') || 'default';
    const res = await fetch(API_URL, { 
      method: 'DELETE',
      headers: {
        'X-User': username
      }
    });
    if (!res.ok) throw new Error(`[Storage] DELETE falló: ${res.status}`);
    return res.json();
  }

  // ── API pública (Mantiene compatibilidad estructural) ───────────

  async function load() {
    try {
      const data = await _get();
      if (data && Array.isArray(data.songs)) {
        App.state.db = data;
        console.log('[Storage] Datos cargados para usuario actual. Canciones:', App.state.db.songs.length);
      } else {
        console.log('[Storage] Respuesta inesperada del servidor:', data);
      }
    } catch (e) {
      console.error('[Storage] Error al cargar datos:', e);
    }
  }

  async function save() {
    try {
      const result = await _post(App.state.db);
      console.log('[Storage] Guardado exitoso en servidor:', result.saved);
    } catch (e) {
      console.error('[Storage] Error al guardar datos:', e);
    }
  }

  async function clear() {
    try {
      await _delete();
      App.state.db = { songs: [] };
      console.log('[Storage] Base de datos del usuario limpiada.');
    } catch (e) {
      console.error('[Storage] Error al borrar datos:', e);
    }
  }

  return {
    load: load,
    save: save,
    clear: clear
  };

})();