var App = App || {};

(async function() {
  await App.storage.load();
  App.elo.updateThresholds();
  App.ui.Ranking.render();

  document.getElementById('fab-export-ranking')?.addEventListener('click', exportRankingAsHTML);
})();

async function exportRankingAsHTML() {
  const songs = [...App.state.db.songs].sort((a, b) => b.points - a.points);
  const top = songs.slice(0, 3);
  const rest = songs.slice(3);

  let mainCSS = '';
  try {
    const cssLink = document.querySelector('link[rel="stylesheet"]');
    if (cssLink) {
      const response = await fetch(cssLink.href);
      mainCSS = await response.text();
    }
  } catch (e) {
    console.warn('No se pudo cargar style.css');
  }
  const inlineStyle = document.querySelector('style')?.textContent || '';

  const podiumHTML = buildPodiumHTML(top);
  const listHTML = buildListHTML(rest);

  const fullHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
  <title>Peakr – Ranking</title>
  <link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">
  <style>
    ${mainCSS}
    ${inlineStyle}
    .ranking-edit-btn, .podium-edit-btn { display: none !important; }
    .fab-export-ranking { display: none !important; }

    /* ===== Podium fluido ===== */
    .podium {
      flex-direction: row;
      align-items: flex-end;
      justify-content: center;
      gap: 2vw;
    }

    .podium-card {
      flex: 1 1 0;
      min-width: 0;
      max-width: 100%;
      border: 3px solid transparent;
      height: auto !important;
      aspect-ratio: 1 / 1;
      border-radius: var(--r-lg);
      overflow: hidden;
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      box-shadow: inset 0 0 0 1px var(--bg-color);
    }

    .podium-card.rank-1 {
      flex-grow: 1.4;
      order: 2;
      border-color: var(--tier-s);
      border-width: 4px;
    }
    .podium-card.rank-2 {
      flex-grow: 1.15;
      order: 1;
      border-color: #C0C0C0;
    }
    .podium-card.rank-3 {
      flex-grow: 0.9;
      order: 3;
      border-color: #CD7F32;
    }

    @media screen and (min-width: 1200px) {
      .podium-card.rank-1 { max-width: 420px; }
      .podium-card.rank-2 { max-width: 350px; }
      .podium-card.rank-3 { max-width: 300px; }
    }

    /* ===== Móvil ===== */
    @media screen and (max-width: 768px) {
      .podium {
        flex-direction: column !important;
        align-items: center !important;
        gap: 16px !important;
      }
      .podium-card {
        width: calc(100% - 32px) !important;
        max-width: 500px !important;
        flex-grow: 0 !important;
        aspect-ratio: 4 / 3;
        border-radius: var(--r-lg);
      }
      .podium-card.rank-1 { order: 1 !important; }
      .podium-card.rank-2 { order: 2 !important; }
      .podium-card.rank-3 { order: 3 !important; }
      .podium-watermark {
        font-size: 5rem !important;
      }
      .ranking-item {
        min-height: 130px !important;
      }
    }
  </style>
</head>
<body style="background: #121212; color: #E6E1E5; font-family: Roboto, sans-serif; overflow-x: hidden;">
  <header class="header-m3">
    <h1>Peakr – Ranking</h1>
  </header>
  <div class="ranking-full-container" style="display:flex; flex-direction:column; gap:32px; padding:32px; max-width:1200px; margin:0 auto; width:100%;">
    <div class="podium-column" style="width:100%; display:flex; justify-content:center;">
      <div class="podium" style="flex-direction:row; align-items:flex-end; justify-content:center; gap:24px;">
        ${podiumHTML}
      </div>
    </div>
    <div class="list-column" style="width:100%; min-width:0;">
      <div class="ranking-list" style="display:flex; flex-direction:column; gap:8px;">
        ${listHTML}
      </div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ranking-peakr.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (App.ui && App.ui.Toast) {
    App.ui.Toast.show('📁 Ranking descargado');
  }
}

function buildPodiumHTML(top) {
  const rankColors = {
    1: { gradient: 'linear-gradient(transparent 30%, rgba(255,215,0,0.45))', border: '4px solid var(--tier-s)', order: 2 },
    2: { gradient: 'linear-gradient(transparent 30%, rgba(192,192,192,0.45))', border: '3px solid #C0C0C0', order: 1 },
    3: { gradient: 'linear-gradient(transparent 30%, rgba(205,127,50,0.45))', border: '3px solid #CD7F32', order: 3 }
  };

  let slots = [];
  if (top.length === 1) slots = [{ song: top[0], rank: 1 }];
  else if (top.length === 2) slots = [{ song: top[1], rank: 2 }, { song: top[0], rank: 1 }];
  else slots = [{ song: top[1], rank: 2 }, { song: top[0], rank: 1 }, { song: top[2], rank: 3 }];

  return slots.map(slot => {
    const imgSrc = slot.song.imgUrl || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=400&auto=format&fit=crop';
    const styleColors = rankColors[slot.rank];
    const link = slot.song.link || '';

    const inner = `
      <span class="podium-watermark">${slot.rank}</span>
      <div class="podium-footer">
        <div class="podium-name">${escHtml(slot.song.display)}</div>
        <div class="podium-pts">${slot.song.points} pts</div>
      </div>
    `;

    const glowMap = {
      1: '0 8px 28px rgba(255,215,0,0.3)',
      2: '0 8px 28px rgba(192,192,192,0.2)',
      3: '0 8px 28px rgba(205,127,50,0.2)'
    };

    const cardStyle = [
      `--podium-gradient:${styleColors.gradient}`,
      `background-image:url('${safeUrl(imgSrc)}')`,
      `background-size:cover`,
      `background-position:center`,
      `border:${styleColors.border}`,
      `box-shadow:inset 0 0 0 1px #121212, ${glowMap[slot.rank]}`,
      `order:${styleColors.order}`,
      `display:flex`,
      `flex-direction:column`,
      `justify-content:flex-end`,
      `text-decoration:none`,
      `color:inherit`,
      `overflow:hidden`,
      `position:relative`,
      `border-radius:24px`
    ].join(';');

    if (link) {
      return `<a href="${escHtml(link)}" target="_blank" rel="noopener" class="podium-card rank-${slot.rank}" style="${cardStyle}">${inner}</a>`;
    } else {
      return `<div class="podium-card rank-${slot.rank}" style="${cardStyle}">${inner}</div>`;
    }
  }).join('');
}

function buildListHTML(songs) {
  return songs.map((song, i) => {
    const tier = App.elo.getTier(song.points);
    const imgSrc = song.imgUrl || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=400&auto=format&fit=crop';

    const leftCardStyle = [
      `background-image:url('${safeUrl(imgSrc)}')`,
      'display:block',
      'text-decoration:none',
      'color:inherit',
      'flex:1',
      'position:relative',
      'background-size:cover',
      'background-position:center',
      `border-radius:var(--r-md) 0 0 var(--r-md)`,
      'overflow:hidden',
      'cursor:pointer',
      'min-height:150px'
    ].join(';');

    const overlayStyle = `background: linear-gradient(to right, ${tier.colorHex} 0%, transparent 70%), rgba(0,0,0,0.5)`;

    const leftInner = `
      <div class="ranking-left-overlay" style="${overlayStyle}; position:absolute; inset:0; pointer-events:none;"></div>
      <div class="ranking-position">#${i + 4}</div>
      <div class="ranking-text-overlay">
        <strong>${escHtml(song.display)}</strong>
        <span>${escHtml(song.artist)}</span>
      </div>
    `;

    const rightBadge = `
      <div class="ranking-right-badge">
        <span class="ranking-tier-letter">${tier.id}</span>
        <div class="ranking-points">${song.points}</div>
      </div>
    `;

    const itemStyle = 'display:flex; align-items:stretch; overflow:hidden; border-radius:var(--r-md); min-height:150px;';

    if (song.link) {
      return `<div class="ranking-item" style="${itemStyle}">
        <a href="${escHtml(song.link)}" target="_blank" rel="noopener" class="ranking-left-card" style="${leftCardStyle}">
          ${leftInner}
        </a>
        ${rightBadge}
      </div>`;
    } else {
      return `<div class="ranking-item" style="${itemStyle}">
        <div class="ranking-left-card" style="${leftCardStyle}">
          ${leftInner}
        </div>
        ${rightBadge}
      </div>`;
    }
  }).join('');
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeUrl(url) {
  return String(url).replace(/'/g, "\\'");
}
