var App = App || {};
App.ui.Ranking = (() => {
  function render() {
    const podiumEl = App.ui.$("podium-container");
    const listEl = App.ui.$("list-container");

    if (App.state.db.songs.length === 0) {
      podiumEl.innerHTML = "";
      listEl.innerHTML =
        '<p style="text-align:center;color:var(--text-sec);padding:48px 0">No hay canciones aún</p>';
      return;
    }

    const sorted = [...App.state.db.songs].sort((a, b) => b.points - a.points);

    renderPodium(podiumEl, sorted.slice(0, 3));

    listEl.innerHTML = "";
    sorted.slice(3).forEach((song, i) => {
      const tier = App.elo.getTier(song.points);
      const item = document.createElement("div");
      item.className = "ranking-item";

      item.innerHTML = `<div class="ranking-left-card" style="background-image: url('${App.ui.escHtml(song.imgUrl || App.state.DEFAULT_IMG)}')">
          <div class="ranking-left-overlay" style="background: linear-gradient(to right, ${tier.colorHex} 0%, transparent 70%), rgba(0,0,0,0.5);"></div>
          <div class="ranking-position">#${i + 4}</div>
          <div class="ranking-text-overlay">
            <strong>${App.ui.escHtml(song.display)}</strong>
            <span>${App.ui.escHtml(song.artist)}</span>
          </div>
          <button class="ranking-edit-btn" title="Editar"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="ranking-right-badge">
          <span class="ranking-tier-letter">${tier.id}</span>
          <div class="ranking-points">${song.points}</div>
        </div>`;

      const leftCard = item.querySelector(".ranking-left-card");
      leftCard.addEventListener("click", () => {
        if (song.link) window.open(song.link, "_blank");
      });

      const editBtn = item.querySelector(".ranking-edit-btn");
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        App.ui.Modal.openEditModal(song.id);
      });

      const strong = item.querySelector("strong");
      strong.addEventListener("click", (e) => {
        e.stopPropagation();
        if (song.link) window.open(song.link, "_blank");
      });

      listEl.appendChild(item);
    });
  }

  function renderPodium(container, top) {
    container.innerHTML = "";
    if (top.length === 0) return;

    // Slots visuales: 2º izq, 1º centro, 3º der
    let slots;
    if (top.length === 1) {
      slots = [{ song: top[0], rank: 1 }];
    } else if (top.length === 2) {
      slots = [
        { song: top[1], rank: 2 },
        { song: top[0], rank: 1 },
      ];
    } else {
      slots = [
        { song: top[1], rank: 2 },
        { song: top[0], rank: 1 },
        { song: top[2], rank: 3 },
      ];
    }

    slots.forEach((slot) => {
      const imgSrc = slot.song.imgUrl || App.state.DEFAULT_IMG;
      const el = document.createElement("div");
      el.className = `podium-card rank-${slot.rank}`;
      el.style.backgroundImage = `url('${App.ui.escHtml(imgSrc)}')`;

      // Footer con el nombre y puntos (estilo lista)
      el.innerHTML = `
        <span class="podium-watermark">${slot.rank}</span>
        <div class="podium-footer">
          <div class="podium-name">${App.ui.escHtml(slot.song.display)}</div>
          <div class="podium-pts">${slot.song.points} pts</div>
        </div>
        <button class="podium-edit-btn" title="Editar"><span class="material-symbols-outlined">edit</span></button>
      `;

      // Clic en la tarjeta → video (si tiene link)
      el.addEventListener("click", () => {
        if (slot.song.link) window.open(slot.song.link, "_blank");
      });

      const editBtn = el.querySelector(".podium-edit-btn");
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        App.ui.Modal.openEditModal(slot.song.id);
      });

      container.appendChild(el);
    });
  }

  return { render };
})();
