/* assets/valentine-player.js */
(() => {
  const STORAGE_KEY = "valentine_player_v1";

  const defaultState = {
    track: "/assets/cancionmenu.mp3",
    time: 0,
    playing: false,
    volume: 0.9
  };

  let audio = null;
  let state = null;
  let buttons = [];

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return { ...defaultState, ...(saved || {}) };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState() {
    if (!audio || !state) return;
    try {
      const toSave = {
        track: state.track,
        time: audio.currentTime || 0,
        playing: !audio.paused,
        volume: audio.volume
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;

    audio.addEventListener("timeupdate", () => {
      // guarda suave cada cierto tiempo
      if ((audio.currentTime | 0) % 2 === 0) saveState();
    });

    audio.addEventListener("play", () => updateButtons());
    audio.addEventListener("pause", () => updateButtons());

    return audio;
  }

  function getTrackFromPage() {
    // Puedes setearlo por página con: <body data-track="/assets/cancionmenu.mp3">
    const fromBody = document.body?.dataset?.track;
    return fromBody || null;
  }

  function setTrack(trackUrl) {
    const a = ensureAudio();
    if (!trackUrl) return;

    if (state.track !== trackUrl) {
      // cambiar pista sin perder UX
      state.track = trackUrl;
      const wasPlaying = !a.paused;

      a.src = trackUrl;
      a.load();

      // si cambiaste canción, empieza desde 0
      a.currentTime = 0;

      saveState();
      if (wasPlaying) {
        a.play().catch(() => {});
      }
    }
  }

  function updateButtons() {
    const isPlaying = audio && !audio.paused;
    buttons.forEach((btn) => {
      btn.textContent = isPlaying ? "🎶 Song ⏸" : "🎶 Song ▶";
      btn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    });
  }

  async function toggle() {
    const a = ensureAudio();
    try {
      if (a.paused) {
        await a.play();
      } else {
        a.pause();
      }
    } catch {
      // si el navegador bloquea play, el botón quedará en ▶
    }
    updateButtons();
    saveState();
  }

  function bindButtons() {
    // soporta: id="songBtn" o data-song-btn
    buttons = Array.from(document.querySelectorAll("#songBtn, [data-song-btn]"));

    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggle();
      });
    });

    updateButtons();
  }

  function init() {
    state = loadState();

    const a = ensureAudio();
    a.volume = state.volume ?? defaultState.volume;

    // Track: prioridad a lo que diga la página, si no, lo guardado
    const pageTrack = getTrackFromPage();
    const trackToUse = pageTrack || state.track || defaultState.track;
    state.track = trackToUse;

    a.src = trackToUse;
    a.load();

    // restaurar tiempo (solo si es la misma canción)
    const safeTime = Number(state.time || 0);
    if (Number.isFinite(safeTime) && safeTime > 0) {
      // esperar un tick para poder setear currentTime sin problemas
      setTimeout(() => {
        try { a.currentTime = safeTime; } catch {}
      }, 0);
    }

    bindButtons();

    // intentar seguir reproduciendo si estaba sonando
    if (state.playing) {
      a.play().then(() => {
        updateButtons();
      }).catch(() => {
        // iOS a veces bloquea autoplay después de navegación
        updateButtons();
      });
    }

    // guarda estado al salir / cambiar pestaña
    window.addEventListener("beforeunload", saveState);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveState();
    });
  }

  window.ValentinePlayer = {
    init,
    toggle,
    setTrack
  };

  // auto init cuando cargue el DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

