/* assets/valentine-player.js (v5) */
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
  let banner = null;

  function isIOS() {
    const ua = navigator.userAgent || "";
    return /iPhone|iPad|iPod/i.test(ua);
  }

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

    audio.addEventListener("play", () => {
      hideBanner();
      updateButtons();
    });
    audio.addEventListener("pause", () => updateButtons());

    audio.addEventListener("timeupdate", () => {
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

  function showBanner() {
    if (!isIOS()) return;
    if (banner) return;

    banner = document.createElement("button");
    banner.type = "button";
    banner.textContent = "Tap Song to continue 💗";
    banner.setAttribute("aria-label", "Tap to continue music");

    banner.style.position = "fixed";
    banner.style.left = "50%";
    banner.style.top = "14px";
    banner.style.transform = "translateX(-50%)";
    banner.style.zIndex = "99999";
    banner.style.padding = "10px 14px";
    banner.style.borderRadius = "999px";
    banner.style.border = "2px solid rgba(179,21,90,.25)";
    banner.style.background = "rgba(255,255,255,.92)";
    banner.style.color = "rgba(179,21,90,.95)";
    banner.style.fontWeight = "900";
    banner.style.boxShadow = "0 14px 30px rgba(179,21,90,.12)";
    banner.style.backdropFilter = "blur(10px)";
    banner.style.cursor = "pointer";
    banner.style.webkitTapHighlightColor = "transparent";

    banner.addEventListener("click", (e) => {
      e.preventDefault();
      // click = user gesture; iOS will allow play
      toggle(true);
    });

    document.body.appendChild(banner);
  }

  function hideBanner() {
    if (!banner) return;
    banner.remove();
    banner = null;
  }

  async function tryAutoResume() {
    const a = ensureAudio();
    if (!state?.playing) return; // solo si venía sonando

    try {
      await a.play();
      hideBanner();
      updateButtons();
      writeState({ playing: true, time: a.currentTime || state.time || 0 });
    } catch {
      // iOS puede bloquear
      updateButtons();
      showBanner();
    }
  }

  async function toggle(forcePlay = false) {
    const a = ensureAudio();

    if (a.paused || forcePlay) {
      // ✅ si NO venía sonando, arranca desde 0
      if (!state?.playing) {
        try { a.currentTime = 0; } catch {}
        writeState({ time: 0 });
      }

      // marcar playing true antes del play
      writeState({ playing: true });

      try {
        await a.play();
        hideBanner();
      } catch {
        // si iOS bloquea, mostrar banner
        showBanner();
      }
    } else {
      a.pause();
      writeState({ playing: false, time: a.currentTime || 0 });
      hideBanner();
    }

    updateButtons();
  }

  function bindButtons() {
    buttons = Array.from(document.querySelectorAll("#songBtn, [data-song-btn]"));
    buttons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        toggle(false);
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
    a.volume = state.volume ?? defaultState.volume;

    const pageTrack = getTrackFromPage();
    const trackToUse = pageTrack || state.track || defaultState.track;

    if (state.track !== trackToUse) {
      writeState({ track: trackToUse, time: 0, playing: false });
    }

    a.src = trackToUse;
    a.load();

    // ✅ solo restaurar tiempo si venía sonando
    if (state.playing) {
      const t = Number(state.time || 0);
      if (Number.isFinite(t) && t > 0) {
        setTimeout(() => {
          try { a.currentTime = t; } catch {}
        }, 0);
      }
    } else {
      writeState({ time: 0 });
    }

    bindButtons();
    tryAutoResume();

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
