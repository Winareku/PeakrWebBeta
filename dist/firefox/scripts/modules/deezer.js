var App = App || {};

App.deezer = {
  /**
   * Busca un preview de 30s en Deezer para la canción dada.
   * @param {string} artist
   * @param {string} title
   * @returns {Promise<string|null>} URL del MP3 o null si no se encuentra.
   */
  async fetchPreview(artist, title) {
    const query = `artist:"${artist}" track:"${title}"`;
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data.data && data.data.length > 0) {
        return data.data[0].preview || null;
      }
    } catch (e) {
      console.warn('[Deezer] Error fetching preview:', e);
    }
    return null;
  }
};
