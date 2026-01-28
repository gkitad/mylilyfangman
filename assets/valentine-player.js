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
  let resumeBanner = null;

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
      if ((audio.currentTime | 0) % 2 === 0) saveState();
    });

    audio.addEventListener("play", () => {
      hideBanner();
      updateButtons();
    });

    audio.addEventListener("pause", () => {
      updateButtons();
    });

    return audio;
  }

  function getTrackFromPage() {
    const fromBody = document.body?.dataset?.track;
    return fromBody || null;
  }

  function updateButtons() {
    const isPlaying = audio && !audio.paused;
    buttons.forEach((btn) => {
      btn.textContent = isPlaying ? "🎶 Song ⏸" : "🎶 Song ▶";
      btn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    });
  }

  async function tryPlay() {
    const a = ensureAudio();
    try {
      await a.play();
      updateButtons();
      saveState();
      hideBanner();
      return true;
    } catch {
      updateButtons();
      saveState();
      // iOS often blocks this after navigation
      if (isIOS()) showBanner();
      return false;
    }
  }

  async function toggle() {
    const a = ensureAudio();
    try {
      if (a.paused) {
        await a.play();
        hideBanner();
      } else {
        a.pause();
      }
    } catch {}
    updateButtons();
    saveState();
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

  function showBanner() {
    if (resumeBanner) return;

    resumeBanner = document.createElement("button");
    resumeBanner.type = "button";
    resumeBanner.textContent = "Tap Song to continue 💗";
    resumeBanner.setAttribute("aria-label", "Tap to continue music");

    resumeBanner.style.position = "fixed";
    resumeBanner.style.left = "50%";
    resumeBanner.style.top = "14px";
    resumeBanner.style.transform = "translateX(-50%)";
    resumeBanner.style.zIndex = "99999";
    resumeBanner.style.padding = "10px 14px";
    resumeBanner.style.borderRadius = "999px";
    resumeBanner.style.border = "2px solid rgba(179,21,90,.25)";
    resumeBanner.style.background = "rgba(255,255,255,.92)";
    resumeBanner.style.color = "rgba(179,21,90,.95)";
    resumeBanner.style.fontWeight = "900";
    resumeBanner.style.boxShadow = "0 14px 30px rgba(179,21,90,.12)";
    resumeBanner.style.backdropFilter = "blur(10px)";
    resumeBanner.style.cursor = "pointer";
    resumeBanner.style.webkitTapHighlightColor = "transparent";

    resumeBanner.addEventListener("click", (e) => {
      e.preventDefault();
      // this click counts as a user gesture -> iOS will allow play
      tryPlay();
    });

    document.body.appendChild(resumeBanner);
  }

  function hideBanner() {
    if (!resumeBanner) return;
    resumeBanner.remove();
    resumeBanner = null;
  }

  function init() {
    state = loadState();
    const a = ensureAudio();

    a.volume = state.volume ?? defaultState.volume;

    const pageTrack = getTrackFromPage();
    const trackToUse = pageTrack || state.track || defaultState.track;
    state.track = trackToUse;

    a.src = trackToUse;
    a.load();

    const safeTime = Number(state.time || 0);
    if (Number.isFinite(safeTime) && safeTime > 0) {
      setTimeout(() => {
        try { a.currentTime = safeTime; } catch {}
      }, 0);
    }

    bindButtons();

    if (state.playing) {
      // try to keep playing across pages; iOS may block -> show banner
      tryPlay();
    }

    window.addEventListener("beforeunload", saveState);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveState();
    });
  }

  window.ValentinePlayer = {
    init,
    toggle
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
