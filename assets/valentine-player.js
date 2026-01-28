/* assets/valentine-player.js (v4) */
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

  function writeState(patch = {}) {
    try {
      const current = loadState();
      const next = { ...current, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      state = next;
    } catch {}
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;

    audio.addEventListener("play", () => updateButtons());
    audio.addEventListener("pause", () => updateButtons());

    audio.addEventListener("timeupdate", () => {
      // guarda tiempo frecuentemente
      if ((audio.currentTime | 0) % 2 === 0) {
        writeState({
          time: audio.currentTime || 0,
          playing: !audio.paused,
          volume: audio.volume
        });
      }
    });

    return audio;
  }

  function getTrackFromPage() {
    return document.body?.dataset?.track || null;
  }

  function updateButtons() {
    const isPlaying = audio && !audio.paused;
    buttons.forEach((btn) => {
      btn.textContent = isPlaying ? "🎶 Song ⏸" : "🎶 Song ▶";
      btn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    });
  }

  async function tryAutoResume() {
    const a = ensureAudio();
    if (!state?.playing) return; // ✅ solo reanuda si venía sonando

    try {
      await a.play();
      updateButtons();
      writeState({ playing: true, time: a.currentTime || state.time || 0 });
    } catch {
      updateButtons();
    }
  }

  async function toggle() {
    const a = ensureAudio();

    if (a.paused) {
      // ✅ Si NO venía sonando (playing=false), empezamos desde 0
      // Esto arregla tu problema de "primera vez arranca por la mitad".
      if (!state?.playing) {
        try { a.currentTime = 0; } catch {}
        writeState({ time: 0 });
      }

      // marca inmediatamente playing=true (para que al navegar intente continuar)
      writeState({ playing: true });

      try {
        await a.play();
      } catch {
        // iOS puede bloquear autoplay; al próximo tap reintenta
      }
    } else {
      a.pause();
      writeState({ playing: false, time: a.currentTime || 0 });
    }

    updateButtons();
  }

  function bindButtons() {
    buttons = Array.from(document.querySelectorAll("#songBtn, [data-song-btn]"));
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggle();
      });
    });
    updateButtons();
  }

  function saveOnExit() {
    if (!audio) return;
    writeState({
      time: audio.currentTime || 0,
      playing: !audio.paused,
      volume: audio.volume
    });
  }

  function init() {
    state = loadState();
    const a = ensureAudio();

    const pageTrack = getTrackFromPage();
    const trackToUse = pageTrack || state.track || defaultState.track;

    // Si cambió la canción, reset completo
    if (state.track !== trackToUse) {
      writeState({ track: trackToUse, time: 0, playing: false });
    }

    a.src = trackToUse;
    a.load();

    // ✅ Importante:
    // Solo restauramos el tiempo si "venía sonando".
    if (state.playing) {
      const t = Number(state.time || 0);
      if (Number.isFinite(t) && t > 0) {
        setTimeout(() => {
          try { a.currentTime = t; } catch {}
        }, 0);
      }
    } else {
      // si no venía sonando, dejamos todo en 0
      writeState({ time: 0 });
    }

    bindButtons();

    // intenta continuar si estaba en play
    tryAutoResume();

    // iOS-friendly
    window.addEventListener("pagehide", saveOnExit);
    window.addEventListener("beforeunload", saveOnExit);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveOnExit();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
