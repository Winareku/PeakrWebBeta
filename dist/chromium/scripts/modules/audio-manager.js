var App = App || {};

App.audio = (() => {
  let audio = null;               // instancia única de Audio
  let currentTrackId = null;      // id de la canción en reproducción
  let listeners = [];             // callbacks (songId, isPlaying) para actualizar botones

  function getAudio() {
    if (!audio) {
      audio = new Audio();
      audio.preload = 'none';
      audio.addEventListener('ended', () => {
        notify(currentTrackId, false);
        currentTrackId = null;
        URL.revokeObjectURL(audio.src);   // liberar memoria
        audio.removeAttribute('src');
      });
    }
    return audio;
  }

  function notify(songId, isPlaying) {
    listeners.forEach(fn => {
      try { fn(songId, isPlaying); } catch (e) {}
    });
  }

  /**
   * Alterna play/pausa para una canción.
   * @param {string} songId - id de la canción
   * @param {string} previewUrl - URL del MP3 de 30s
   */
  function togglePlay(songId, previewUrl) {
    const player = getAudio();

    if (currentTrackId === songId) {
      if (!player.paused) {
        player.pause();
        notify(songId, false);
      } else {
        player.play().catch(() => {});
        notify(songId, true);
      }
      return;
    }

    // Detener el anterior
    player.pause();
    if (player.src) {
      URL.revokeObjectURL(player.src);   // Limpia blob anterior
      player.removeAttribute('src');
    }

    // Descargar y convertir a Blob (evita bloqueos de CORS)
    fetch(previewUrl)
      .then(response => response.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        player.src = blobUrl;
        currentTrackId = songId;
        return player.play();
      })
      .then(() => {
        notify(songId, true);
      })
      .catch(err => {
        console.warn('[Audio] Error al reproducir:', err);
        notify(songId, false);
        currentTrackId = null;
        if (player.src) {
          URL.revokeObjectURL(player.src);
          player.removeAttribute('src');
        }
      });

    // Notificar al anterior que dejó de sonar
    if (currentTrackId !== songId) {
      notify(currentTrackId, false);
    }
  }

  /** Devuelve true si el id dado es el que está sonando */
  function isPlaying(songId) {
    if (!audio) return false;
    return currentTrackId === songId && !audio.paused;
  }

  /** Añade un callback que recibe (songId, isPlaying) cada vez que cambia el estado */
  function onStateChange(fn) {
    listeners.push(fn);
  }

  /** Limpia todo (al cambiar de vista, pero no es necesario en side panel) */
  function reset() {
    if (audio) {
      audio.pause();
      if (audio.src) {
        URL.revokeObjectURL(audio.src);
        audio.removeAttribute('src');
      }
      currentTrackId = null;
    }
  }

  return { togglePlay, isPlaying, onStateChange, reset };
})();
