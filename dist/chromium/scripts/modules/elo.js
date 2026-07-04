var App = App || {};
App.elo = {
  K: 32,

  // Umbrales dinámicos (se recalculan con updateThresholds)
  thresholds: { A: Infinity, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity },

  /**
   * Recalcula los umbrales basándose en la distribución actual de puntos.
   * Debe llamarse cada vez que la base de datos cambie (carga, importación, votación, etc.)
   * Se llama automáticamente desde los renders de ranking y arena.
   */
  updateThresholds() {
    const songs = App.state.db.songs;
    if (songs.length === 0) {
      this.thresholds = { A: Infinity, B: Infinity, C: Infinity, D: Infinity, E: Infinity, F: Infinity };
      return;
    }
    const sorted = songs.map(s => s.points).sort((a, b) => a - b);
    const n = sorted.length;

    // Cálculo de percentiles (índices en array ascendente)
    const p90 = sorted[Math.min(n - 1, Math.floor(0.9 * n))] ?? Infinity; // límite superior de A
    const p70 = sorted[Math.min(n - 1, Math.floor(0.7 * n))] ?? Infinity; // límite superior de B
    const p40 = sorted[Math.min(n - 1, Math.floor(0.4 * n))] ?? Infinity; // límite superior de C
    const p20 = sorted[Math.min(n - 1, Math.floor(0.2 * n))] ?? Infinity; // límite superior de D
    const p5  = sorted[Math.min(n - 1, Math.floor(0.05 * n))] ?? Infinity; // límite superior de E
    // F es el resto (< p5)

    this.thresholds = {
      A: p90,   // >= p90 → A
      B: p70,   // >= p70 y < p90 → B
      C: p40,   // >= p40 y < p70 → C
      D: p20,   // >= p20 y < p40 → D
      E: p5,    // >= p5  y < p20 → E
      F: -Infinity // < p5 → F (nunca se alcanza porque p5 es el mínimo si n>0, pero dejamos -∞ para el caso vacío)
    };
  },

  getTier(points) {
    const t = this.thresholds;
    if (points >= t.A) return { id: 'A', color: 'var(--tier-a)', colorHex: '#5DA8CC', name: 'Tier A' };
    if (points >= t.B) return { id: 'B', color: 'var(--tier-b)', colorHex: '#6B9E6B', name: 'Tier B' };
    if (points >= t.C) return { id: 'C', color: 'var(--tier-c)', colorHex: '#C0C0C0', name: 'Tier C' };
    if (points >= t.D) return { id: 'D', color: 'var(--tier-b)', colorHex: '#D2B48C', name: 'Tier D' }; // usamos colores reasignados, puedes cambiarlos
    if (points >= t.E) return { id: 'E', color: 'var(--tier-b)', colorHex: '#CD853F', name: 'Tier E' };
    return { id: 'F', color: 'var(--tier-c)', colorHex: '#A0522D', name: 'Tier F' };
  },

  calculate(winnerElo, loserElo) {
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser  = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    // K dinámico: base 32, pero si la sorpresa es grande (expectedWinner < 0.3) se escala hasta 80
    const surpriseFactor = 1.0 - expectedWinner;  // 0 si gana el favorito, 1 si gana el muy débil
    const K = Math.round(32 + 48 * surpriseFactor);   // oscila entre 32 y 80

    return {
      newWinner: Math.round(winnerElo + K * (1 - expectedWinner)),
      newLoser:  Math.round(loserElo  + K * (0 - expectedLoser)),
      change:    Math.round(K * (1 - expectedWinner))
    };
  }
};