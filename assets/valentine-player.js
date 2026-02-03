/**
 * Valentine Music Player - Persistent across pages
 * Guarda el estado de reproducción en localStorage
 */

(function() {
  'use strict';

  // Configuración
  const STORAGE_KEY = 'valentine_music_state';
  const UPDATE_INTERVAL = 500; // ms para guardar posición

  // Estado global
  let audio = null;
  let updateTimer = null;
  let currentTrack = null;

  // Obtener botón de música
  const songBtn = document.getElementById('songBtn');
  if (!songBtn) return; // No hay botón en esta página

  // Inicializar
  init();

  function init() {
    // Obtener track de la página actual
    const trackAttr = document.body.getAttribute('data-track');
    if (!trackAttr) return;

    currentTrack = trackAttr;

    // Cargar estado guardado
    const savedState = loadState();

    // Crear o reutilizar audio
    audio = new Audio(currentTrack);
    audio.loop = true;
    audio.volume = 0.5;

    // Si hay estado guardado y es el mismo track
    if (savedState && savedState.track === currentTrack) {
      audio.currentTime = savedState.position || 0;
      
      if (savedState.playing) {
        // Intentar reproducir automáticamente
        playAudio();
      }
    }

    // Actualizar botón
    updateButton();

    // Event listeners
    songBtn.addEventListener('click', togglePlay);
    audio.addEventListener('play', () => {
      updateButton();
      startPositionTracking();
    });
    audio.addEventListener('pause', () => {
      updateButton();
      stopPositionTracking();
    });

    // Guardar estado antes de salir de la página
    window.addEventListener('beforeunload', saveStateBeforeLeave);
    window.addEventListener('pagehide', saveStateBeforeLeave);
  }

  function togglePlay() {
    if (!audio) return;

    if (audio.paused) {
      playAudio();
    } else {
      pauseAudio();
    }
  }

  function playAudio() {
    if (!audio) return;

    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          saveState(true);
        })
        .catch(error => {
          console.log('Autoplay prevented:', error);
          // El navegador bloqueó el autoplay, el usuario debe dar click
        });
    }
  }

  function pauseAudio() {
    if (!audio) return;
    audio.pause();
    saveState(false);
  }

  function updateButton() {
    if (!audio || !songBtn) return;

    if (audio.paused) {
      songBtn.textContent = '🎶 Song ▶';
      songBtn.setAttribute('aria-label', 'Play music');
    } else {
      songBtn.textContent = '🎵 Song ⏸';
      songBtn.setAttribute('aria-label', 'Pause music');
    }
  }

  function startPositionTracking() {
    // Guardar posición cada 500ms mientras reproduce
    updateTimer = setInterval(() => {
      if (audio && !audio.paused) {
        saveState(true);
      }
    }, UPDATE_INTERVAL);
  }

  function stopPositionTracking() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  function saveState(isPlaying) {
    if (!audio || !currentTrack) return;

    const state = {
      track: currentTrack,
      position: audio.currentTime,
      playing: isPlaying,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save music state:', e);
    }
  }

  function saveStateBeforeLeave() {
    if (audio && !audio.paused) {
      saveState(true);
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const state = JSON.parse(saved);
      
      // Ignorar estados muy viejos (más de 1 hora)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return state;
    } catch (e) {
      console.warn('Could not load music state:', e);
      return null;
    }
  }

  // Limpiar al cerrar completamente
  window.addEventListener('unload', () => {
    stopPositionTracking();
  });

})();
