// app.js – Inicialización de Peakr Web con Control Multiusuario y Modo Rápido
// ============================================================================

var App = App || {};

// ── Módulo del Temporizador para el Modo Rápido ─────────────────────────────
App.fastModeTimer = {
  intervalId: null,
  startTime: null,
  duration: 5000, // 5 segundos de límite
  callback: null,

  start: function (onCompleteCallback) {
    this.stop();
    if (onCompleteCallback) this.callback = onCompleteCallback;

    // Si no estamos en la arena actualmente, no iniciar nada
    if (!document.getElementById("view-arena").classList.contains("active")) return;

    const container = document.getElementById("timer-bar-container");
    const bar = document.getElementById("timer-bar");
    if (!container || !bar) return;

    container.classList.add("active");
    container.style.display = "block";
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, this.duration - elapsed);
      const percentage = (remaining / this.duration) * 100;

      // Encoge la barra horizontalmente de derecha a izquierda
      bar.style.transform = `scaleX(${percentage / 100})`;

      // Cambio cromático dinámico: Verde -> Naranja -> Rojo
      if (percentage > 50) {
        bar.style.backgroundColor = "#4CAF50";
      } else if (percentage > 20) {
        bar.style.backgroundColor = "#FF9800";
      } else {
        bar.style.backgroundColor = "#F44336";
      }

      if (remaining <= 0) {
        this.stop();
        if (typeof this.callback === "function") {
          this.callback();
        }
      }
    }, 16);
  },

  stop: function () {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    const container = document.getElementById("timer-bar-container");
    const bar = document.getElementById("timer-bar");
    if (container) {
      container.classList.remove("active");
      container.style.display = "none";
    }
    if (bar) {
      bar.style.transform = "scaleX(1)";
      bar.style.backgroundColor = "#4CAF50";
    }
  },
};

// ── Controlador de Vistas del Ciclo de Vida ─────────────────────────────────
App.refreshActiveView = function () {
  const isArenaActive = App.ui.$("view-arena").classList.contains("active");
  const isFastModeEnabled = localStorage.getItem("peakr_fastmode") === "true";

  if (isArenaActive) {
    if (
      App.state.currentMatch.length === 2 &&
      App.state.db.songs.some((s) => s.id === App.state.currentMatch[0].id) &&
      App.state.db.songs.some((s) => s.id === App.state.currentMatch[1].id)
    ) {
      App.ui.Arena.render();

      // Si el Modo Rápido está encendido, arranca el conteo sincronizado
      if (isFastModeEnabled) {
        App.fastModeTimer.start(() => {
          if (App.ui.Arena && typeof App.ui.Arena.skipMatch === "function") {
            App.ui.Arena.skipMatch();
          }
        });
      } else {
        App.fastModeTimer.stop();
      }
    } else {
      App.fastModeTimer.stop();
      App.ui.Arena.refresh();
    }
  } else {
    // SI NO ESTAMOS EN LA ARENA: Apaga el temporizador y oculta la barra visualmente
    if (App.fastModeTimer) {
      App.fastModeTimer.stop();
      const container = document.getElementById("timer-bar-container");
      if (container) {
        container.classList.remove("active");
        container.style.display = "none";
      }
    }

    if (App.ui.$("view-ranking").classList.contains("active")) {
      App.ui.Ranking.render();
    } else if (App.ui.$("view-settings").classList.contains("active")) {
      App.ui.Maturity.render();
    }
  }
};

async function init() {
  console.log("[App] Verificando sesión en Peakr...");

  const loginScreen = document.getElementById("view-login");
  const appHeader = document.querySelector(".header-m3");
  const appContent = document.getElementById("app-content");

  const btnLogin = document.getElementById("btn-login-submit");
  const inputUsername = document.getElementById("login-username");
  const btnFastMode = document.getElementById("btn-fast-mode");

  // ── Controlador de Autenticación Visual ───────────────────────
  function checkAuth() {
    const user = localStorage.getItem("peakr_user");
    if (!user) {
      if (loginScreen) loginScreen.classList.remove("hidden-login");
      if (appHeader) appHeader.classList.add("hidden-login");
      if (appContent) appContent.classList.add("hidden-login");
      return false;
    } else {
      if (loginScreen) loginScreen.classList.add("hidden-login");
      if (appHeader) appHeader.classList.remove("hidden-login");
      if (appContent) appContent.classList.remove("hidden-login");
      return true;
    }
  }

  // ── Inicialización del Botón de Modo Rápido ────────────────────
  if (btnFastMode) {
    // CORRECCIÓN: Forzamos a que siempre inicie desactivado por defecto
    localStorage.setItem("peakr_fastmode", "false");
    btnFastMode.classList.remove("active");

    btnFastMode.onclick = () => {
      const isEnabled = localStorage.getItem("peakr_fastmode") === "true";
      if (!isEnabled) {
        localStorage.setItem("peakr_fastmode", "true");
        btnFastMode.classList.add("active");
      } else {
        localStorage.setItem("peakr_fastmode", "false");
        btnFastMode.classList.remove("active");
      }
      // Re-evalúa la vista para arrancar o frenar el contador inmediatamente
      App.refreshActiveView();
    };
  }

  // Interceptor Crítico de Seguridad: Detiene el contador solo en clics válidos
  // y evita que los clics en el fondo de la Arena cancelen el temporizador.
  const arenaView = document.getElementById("view-arena");
  if (arenaView) {
    arenaView.addEventListener(
      "click",
      (e) => {
        const target = e.target instanceof Element ? e.target : e.target.parentElement;
        if (!target) return;

        const isValidClick =
          target.closest(".battle-card") ||
          target.closest(".vs-badge") ||
          target.closest(".preview-btn") ||
          target.closest(".action-link") ||
          target.closest(".action-edit");

        if (!isValidClick) return;
        App.fastModeTimer.stop();
      },
      true,
    );
  }

  // ── Eventos de Login ──────────────────────────────────────────
  if (btnLogin && inputUsername) {
    const performLogin = async () => {
      const username = inputUsername.value.trim();
      if (username) {
        localStorage.setItem("peakr_user", username);
        if (checkAuth()) {
          console.log(`[App] Sesión iniciada como: ${username}`);
          try {
            await App.storage.load();
            setupMainAppComponents();
            App.refreshActiveView();
          } catch (e) {
            console.error("[App] Error al inicializar post-login:", e);
          }
        }
      }
    };

    btnLogin.onclick = performLogin;
    inputUsername.onkeyup = (e) => {
      if (e.key === "Enter") performLogin();
    };
  }

  // ── Inicialización de componentes internos ────────────────────
  function setupMainAppComponents() {
    App.ui.Modal.setup();
    App.ui.Navigation.setup();
    App.ui.Settings.setup();

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
      btnLogout.onclick = () => {
        console.log("[App] Cerrando sesión y limpiando memoria...");
        App.fastModeTimer.stop();
        localStorage.removeItem("peakr_user");
        App.state.db = { songs: [] };
        App.state.currentMatch = [];
        window.location.reload();
      };
    }
  }

  // ── Flujo de Arranque Principal ───────────────────────────────
  if (checkAuth()) {
    try {
      await App.storage.load();
    } catch (e) {
      console.error("[App] Error al cargar la biblioteca inicial:", e);
    }
    setupMainAppComponents();
    App.refreshActiveView();
  }
}

document.addEventListener("DOMContentLoaded", init);
