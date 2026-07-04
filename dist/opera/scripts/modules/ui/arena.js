var App = App || {};
App.ui.Arena = (() => {
  let animating = false;
  let currentCardElements = null;  // { el1, el2, score1, score2 }

  function refresh() {
    const emptyState   = App.ui.$('empty-state');
    const arenaWrapper = App.ui.$('arena-wrapper');
    const fab          = App.ui.$('fab-add');

    if (App.state.db.songs.length < 2) {
      emptyState.classList.remove('hidden');
      arenaWrapper.classList.add('hidden');
      if (fab) fab.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      arenaWrapper.classList.remove('hidden');
      if (fab) fab.classList.remove('hidden');
      startNewMatch(false);
    }
  }

  function pickMatch() {
    const songs = App.state.db.songs;
    if (songs.length < 2) return null;

    const newbies = songs.filter(s => (s.competitions || 0) < 5);
    let songA = (newbies.length > 0 && Math.random() < 0.6)
      ? newbies[Math.floor(Math.random() * newbies.length)]
      : songs[Math.floor(Math.random() * songs.length)];

    const others = songs.filter(s => s.id !== songA.id);
    let songB;
    if (Math.random() < 0.5) {
      others.sort((a, b) => Math.abs(a.points - songA.points) - Math.abs(b.points - songA.points));
      songB = others[0];
    } else {
      songB = others[Math.floor(Math.random() * others.length)];
    }
    return [songA, songB];
  }

  async function startNewMatch(withAnimation = false) {
    const match = pickMatch();
    if (!match) return;

    App.state.currentMatch = match;
    await hydratePreviews(match);

    // Si el match sigue siendo el mismo (no se canceló)
    if (App.state.currentMatch === match) {
      render(withAnimation);
    }
  }

  async function hydratePreviews(match) {
    const promises = match.map(async (song) => {
      if (song.useDeezer && !song.previewUrl) {
        const url = await App.deezer.fetchPreview(song.searchArtist || song.artist, song.searchTitle || song.display);
        if (url) {
          // Validar que la URL es accesible (head request)
          try {
            const test = await fetch(url, { method: 'HEAD', mode: 'cors' });
            if (test.ok) {
              song.previewUrl = url;
            } else {
              song.previewUrl = null;
            }
          } catch {
            song.previewUrl = null;
          }
        }
      }
    });
    await Promise.all(promises);
  }

  let stateListenerRegistered = false;

  function updatePreviewButtons() {
    document.querySelectorAll('.preview-btn').forEach(btn => {
      const id = btn.dataset.songId;
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.textContent = App.audio.isPlaying(id) ? 'stop' : 'play_arrow';
      }
    });
  }

  function ensureStateListener() {
    if (stateListenerRegistered) return;
    App.audio.onStateChange(() => {
      updatePreviewButtons();
    });
    stateListenerRegistered = true;
  }

  function render(slideIn = false) {
    // Actualizar umbrales y defensa de integridad
    App.elo.updateThresholds();

    if (App.state.currentMatch.length !== 2 ||
        !App.state.db.songs.some(s => s.id === App.state.currentMatch[0].id) ||
        !App.state.db.songs.some(s => s.id === App.state.currentMatch[1].id)) {
      App.state.currentMatch = [];
      startNewMatch(false);
      return;
    }

    const container = App.ui.$('arena-cards');
    container.innerHTML = '';

    // Placa VS interactiva
    const vsBadge = document.createElement('div');
    vsBadge.className = 'vs-badge';
    vsBadge.innerHTML = `
      <span class="vs-text">VS</span>
      <span class="vs-dice material-symbols-outlined">casino</span>
    `;
    vsBadge.title = 'Saltar este duelo';
    vsBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      skipMatch();
    });
    container.appendChild(vsBadge);

    App.state.currentMatch.forEach((song, idx) => {
      const bgUrl = song.imgUrl || App.state.DEFAULT_IMG;
      const tier  = App.elo.getTier(song.points);

      const card = document.createElement('div');
      card.className = 'battle-card';
      card.style.backgroundImage = `url('${bgUrl}')`;

      // Capa de oscurecimiento
      const scrim = document.createElement('div');
      scrim.className = 'card-scrim';
      card.appendChild(scrim);

      // Nombre y artista (arriba izquierda)
      const titleArea = document.createElement('div');
      titleArea.className = 'card-title-area';
      titleArea.innerHTML = `
        <div class="card-song">${App.ui.escHtml(song.display)}</div>
        <div class="card-artist">${App.ui.escHtml(song.artist)}</div>
      `;
      card.appendChild(titleArea);

      // Badge de tier y puntos (abajo derecha) CON SPAN SEPARADO PARA PUNTOS
      const badge = document.createElement('div');
      badge.className = 'tier-badge';
      badge.style.background = `${tier.colorHex}99`;
      badge.style.color = '#fff';
      badge.innerHTML = `${tier.id} · <span class="points-value">${song.points}</span> pts`;
      card.appendChild(badge);

      // Botones de acción (editar y enlace)
      const actions = document.createElement('div');
      actions.className = 'card-actions';
      if (song.link) {
        const linkBtn = document.createElement('button');
        linkBtn.className = 'action-link';
        linkBtn.title = 'Abrir link';
        linkBtn.innerHTML = '<span class="material-symbols-outlined">open_in_new</span>';
        linkBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.tabs.create({ url: song.link });
        });
        actions.appendChild(linkBtn);
      }
      const editBtn = document.createElement('button');
      editBtn.className = 'action-edit';
      editBtn.title = 'Editar';
      editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.ui.Modal.openEditModal(song.id);
      });
      actions.appendChild(editBtn);
      card.appendChild(actions);

      // Botón de preview SI existe
      if (song.useDeezer && song.previewUrl) {
        const previewBtn = document.createElement('button');
        previewBtn.className = 'preview-btn';
        previewBtn.dataset.songId = song.id;
        previewBtn.title = 'Escuchar 30s';
        previewBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
        previewBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          App.audio.togglePlay(song.id, song.previewUrl);
        });
        card.appendChild(previewBtn);
        ensureStateListener();
      }

      // Click en la carta → votar
      card.addEventListener('click', () => processVote(idx));

      container.appendChild(card);
    });

    // Guardar referencias de las cartas y sus puntos
    const cards = container.querySelectorAll('.battle-card');
    if (cards.length === 2) {
      currentCardElements = {
        el1: cards[0],
        el2: cards[1],
        score1: cards[0].querySelector('.points-value'),
        score2: cards[1].querySelector('.points-value')
      };
    }

    // Aplicar animaciones de entrada si es necesario
    if (slideIn && cards.length === 2) {
      cards[0].classList.add('slide-in-top');
      cards[1].classList.add('slide-in-bottom');
      const wrapper = App.ui.$('arena-wrapper');
      let finished = 0;
      const onEnd = () => {
        finished++;
        if (finished === 2) {
          wrapper.classList.remove('arena-animating');
          animating = false;
          cards[0].removeEventListener('animationend', onEnd);
          cards[1].removeEventListener('animationend', onEnd);
          // Limpiar clases de animación
          cards[0].classList.remove('slide-in-top');
          cards[1].classList.remove('slide-in-bottom');
        }
      };
      cards[0].addEventListener('animationend', onEnd);
      cards[1].addEventListener('animationend', onEnd);
    } else {
      animating = false;
      App.ui.$('arena-wrapper').classList.remove('arena-animating');
    }

    updatePreviewButtons();
  }

  function skipMatch() {
    if (animating) return;
    App.audio?.reset();
    animateSlideOut(true).then(() => {
      startNewMatch(true);
    });
  }

  async function animateSlideOut(fast = false) {
    if (!currentCardElements || animating) return;
    animating = true;
    const wrapper = App.ui.$('arena-wrapper');
    wrapper.classList.add('arena-animating');
    return new Promise(resolve => {
      const cards = [currentCardElements.el1, currentCardElements.el2];
      cards[0].classList.add('slide-out-top');
      cards[1].classList.add('slide-out-bottom');
      if (fast) {
        cards[0].classList.add('fast');
        cards[1].classList.add('fast');
      }
      let done = 0;
      const onEnd = (e) => {
        if (e.target === cards[0] || e.target === cards[1]) {
          done++;
          if (done === 2) {
            cards[0].removeEventListener('animationend', onEnd);
            cards[1].removeEventListener('animationend', onEnd);
            
            // Ocultar antes de remover la clase para evitar el parpadeo (flash)
            cards[0].style.opacity = '0';
            cards[1].style.opacity = '0';
            
            wrapper.classList.remove('arena-animating');
            cards[0].classList.remove('slide-out-top', 'fast');
            cards[1].classList.remove('slide-out-bottom', 'fast');
            resolve();
          }
        }
      };
      cards[0].addEventListener('animationend', onEnd);
      cards[1].addEventListener('animationend', onEnd);
    });
  }

  /* ─── Animación de puntos ──────────────────────────────── */
  function animateScore(element, start, end) {
    return new Promise(resolve => {
      const duration = 600;
      const startTime = performance.now();
      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.round(start + (end - start) * progress);
        element.textContent = current;
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(update);
    });
  }

  function showChangeOverlay(card, text, positive) {
    const overlay = document.createElement('div');
    overlay.className = `change-overlay ${positive ? 'positive' : 'negative'}`;
    overlay.textContent = text;
    card.appendChild(overlay);
    // Guardar referencia para borrar después
    card._changeOverlay = overlay;
  }

  function hideChangeOverlays() {
    if (!currentCardElements) return;
    [currentCardElements.el1, currentCardElements.el2].forEach(card => {
      if (card._changeOverlay) {
        card._changeOverlay.remove();
        card._changeOverlay = null;
      }
    });
  }

  /* ─── Procesar voto con animación ────────────────────── */
  async function processVote(winnerIdx) {
    if (animating) return;
    animating = true;
    const wrapper = App.ui.$('arena-wrapper');
    wrapper.classList.add('arena-animating');
    App.audio?.reset();

    const winner = App.state.currentMatch[winnerIdx];
    const loser  = App.state.currentMatch[winnerIdx === 0 ? 1 : 0];

    const dbWinner = App.state.db.songs.find(s => s.id === winner.id);
    const dbLoser  = App.state.db.songs.find(s => s.id === loser.id);
    if (!dbWinner || !dbLoser) {
      animating = false;
      wrapper.classList.remove('arena-animating');
      startNewMatch(false);
      return;
    }

    const oldWTier = App.elo.getTier(dbWinner.points).id;
    const oldLTier = App.elo.getTier(dbLoser.points).id;

    const result = App.elo.calculate(dbWinner.points, dbLoser.points);
    const changeW = result.newWinner - dbWinner.points;
    const changeL = result.newLoser - dbLoser.points;

    // Añadir glints de color
    if (currentCardElements) {
      const cardW = winnerIdx === 0 ? currentCardElements.el1 : currentCardElements.el2;
      const cardL = winnerIdx === 0 ? currentCardElements.el2 : currentCardElements.el1;

      cardW.querySelector('.win-glint, .lose-glint')?.remove();
      cardL.querySelector('.win-glint, .lose-glint')?.remove();

      const winGlint = document.createElement('div');
      winGlint.className = 'win-glint';
      cardW.appendChild(winGlint);

      const loseGlint = document.createElement('div');
      loseGlint.className = 'lose-glint';
      cardL.appendChild(loseGlint);
    }

    // Mostrar overlays de cambio + animar puntuaciones
    if (currentCardElements) {
      const cardW = winnerIdx === 0 ? currentCardElements.el1 : currentCardElements.el2;
      const cardL = winnerIdx === 0 ? currentCardElements.el2 : currentCardElements.el1;
      showChangeOverlay(cardW, changeW > 0 ? `+${changeW}` : `${changeW}`, changeW > 0);
      showChangeOverlay(cardL, changeL > 0 ? `+${changeL}` : `${changeL}`, changeL > 0);

      const scoreW = winnerIdx === 0 ? currentCardElements.score1 : currentCardElements.score2;
      const scoreL = winnerIdx === 0 ? currentCardElements.score2 : currentCardElements.score1;
      await Promise.all([
        animateScore(scoreW, dbWinner.points, result.newWinner),
        animateScore(scoreL, dbLoser.points, result.newLoser)
      ]);

      hideChangeOverlays();
    }

    // Revelar tier nuevo
    if (currentCardElements) {
      const cardW = winnerIdx === 0 ? currentCardElements.el1 : currentCardElements.el2;
      const cardL = winnerIdx === 0 ? currentCardElements.el2 : currentCardElements.el1;
      const newWTier = App.elo.getTier(result.newWinner);
      const newLTier = App.elo.getTier(result.newLoser);

      [cardW, cardL].forEach((card, idx) => {
        const tierObj = idx === 0 ? newWTier : newLTier;
        const reveal = document.createElement('div');
        reveal.className = 'tier-reveal';
        reveal.style.color = tierObj.colorHex;
        reveal.textContent = tierObj.id;
        card.appendChild(reveal);
      });

      // Esperar un poco para que se aprecie la letra
      await new Promise(r => setTimeout(r, 1400));
    }

    // Slide-out y actualizar DB
    await animateSlideOut();

    dbWinner.points = result.newWinner;
    dbLoser.points = result.newLoser;
    dbWinner.competitions = (dbWinner.competitions || 0) + 1;
    dbLoser.competitions = (dbLoser.competitions || 0) + 1;

    await App.storage.save();

    const newWTier = App.elo.getTier(dbWinner.points);
    const newLTier = App.elo.getTier(dbLoser.points);
    if (newWTier.id !== oldWTier) App.ui.Toast.show(`🚀 ${dbWinner.display} ascendió a ${newWTier.name}!`);
    if (newLTier.id !== oldLTier) App.ui.Toast.show(`📉 ${dbLoser.display} bajó a ${newLTier.name}`);

    startNewMatch(true);
  }

  return { refresh, render };
})();