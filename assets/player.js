// assets/player.js
(() => {
  const KEY_ON = "lily_audio_on";
  const KEY_VOL = "lily_audio_vol";

  function fadeTo(audio, targetVol, ms=600){
    const start = audio.volume;
    const steps = 20;
    const stepMs = ms / steps;
    let i = 0;
    const t = setInterval(() => {
      i++;
      const v = start + (targetVol - start) * (i / steps);
      audio.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) clearInterval(t);
    }, stepMs);
  }

  // Create audio once per page
  const audio = document.createElement("audio");
  audio.loop = true;
  audio.preload = "auto";
  audio.id = "bgSong";
  audio.style.display = "none";
  document.body.appendChild(audio);

  // Default volume
  const savedVol = parseFloat(localStorage.getItem(KEY_VOL) || "0.55");
  audio.volume = Number.isNaN(savedVol) ? 0.55 : savedVol;

  // Expose API
  window.LilyPlayer = {
    setTrack: async (src) => {
      // If same track, do nothing
      if (audio.getAttribute("data-src") === src) return;

      // Fade out current (if playing)
      if (!audio.paused) fadeTo(audio, 0, 450);

      // Switch track
      audio.src = src;
      audio.setAttribute("data-src", src);
      audio.currentTime = 0;

      // If user had music ON, start and fade in
      if (localStorage.getItem(KEY_ON) === "1") {
        try {
          await audio.play();
          audio.volume = 0;
          fadeTo(audio, savedVol, 650);
        } catch (e) {
          // autoplay blocked until user click
        }
      }
    },

    play: async () => {
      try {
        await audio.play();
        localStorage.setItem(KEY_ON, "1");
      } catch (e) {}
    },

    pause: () => {
      fadeTo(audio, 0, 350);
      setTimeout(() => audio.pause(), 360);
      localStorage.setItem(KEY_ON, "0");
    },

    toggle: async () => {
      if (audio.paused) return window.LilyPlayer.play();
      return window.LilyPlayer.pause();
    },

    setVolume: (v) => {
      const vol = Math.max(0, Math.min(1, v));
      audio.volume = vol;
      localStorage.setItem(KEY_VOL, String(vol));
    }
  };
})();
