var App = App || {};
App.ui = App.ui || {};

App.ui.Maturity = (() => {
  const OBJETIVO_PARTIDAS = 20;

  function calcularMadurez() {
    const songs = App.state.db.songs;
    if (songs.length === 0) return 0;

    const sumaMadurez = songs.reduce((acc, song) => {
      const partidas = song.competitions || 0;
      return acc + Math.min(1, partidas / OBJETIVO_PARTIDAS);
    }, 0);

    return Math.round((sumaMadurez / songs.length) * 100);
  }

  function render() {
    const porcentaje = calcularMadurez();
    const fill = App.ui.$('maturity-fill');
    const label = App.ui.$('maturity-label');
    if (!fill || !label) return;

    fill.style.width = `${porcentaje}%`;

    // Color según porcentaje
    let color;
    if (porcentaje < 30) {
      color = '#F2B8B8'; // rojo suave (error token)
    } else if (porcentaje < 70) {
      color = '#FFD966'; // amarillo
    } else {
      color = '#77DD77'; // verde
    }
    fill.style.background = color;

    label.textContent = `Madurez: ${porcentaje}%`;
  }

  return { render };
})();
