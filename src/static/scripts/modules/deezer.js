/**
 * deezer.js – Módulo de integración con Deezer para Peakr Web
 * =============================================================
 * En la versión web, las peticiones a api.deezer.com son bloqueadas
 * por CORS cuando se hacen desde el navegador. Este módulo redirige
 * las llamadas al proxy de Flask (/api/deezer/search) que hace la
 * petición servidor-a-servidor y devuelve la respuesta limpia.
 *
 * La firma del método fetchPreview es idéntica al original para
 * mantener compatibilidad con el resto de la aplicación.
 */

var App = App || {};

App.deezer = {
  /**
   * Busca un preview de 30s en Deezer para la canción dada.
   * La petición se enruta por el proxy Flask para evitar CORS.
   *
   * @param {string} artist  – Nombre del artista
   * @param {string} title   – Título de la canción
   * @returns {Promise<string|null>} URL del MP3 o null si no se encuentra.
   */
  async fetchPreview(artist, title) {
    // Misma query que el original, pero apuntando al proxy local
    const query = `artist:"${artist}" track:"${title}"`;
    const url   = `/api/deezer/search?q=${encodeURIComponent(query)}&limit=1`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();

      if (data && Array.isArray(data.data) && data.data.length > 0) {
        return data.data[0].preview || null;
      }
    } catch (e) {
      console.warn('[Deezer] Error en proxy de preview:', e);
    }

    return null;
  },
};
