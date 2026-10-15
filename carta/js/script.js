/* =========================================================
   Carta virtual romántica — lógica
   ========================================================= */
'use strict';

/* ✏️ Escribe aquí su nombre. Aparece en el título, en el sobre y bajo la foto.
   Si lo dejas vacío (''), dirá "Para ti" y "Bonita". */
const NOMBRE = 'Rosa';

/* 🎵 true = la canción empieza sola al tocar el corazón del sobre.
   false = solo suena si ella toca el botón "Nuestra canción". */
const MUSICA_AL_ABRIR = true;

(() => {
  // ---------- Referencias ----------
  const $ = (sel) => document.querySelector(sel);

  const stage       = $('#stage');
  const scene       = $('#scene');
  const envelope    = $('#envelope');
  const seal        = $('#seal');
  const letterView  = $('#letterView');
  const flip        = $('#flip');
  const letterCard  = $('#letterCard');
  const letterBack  = $('#letterBack');
  const polaroid    = $('#polaroid');
  const heartsLayer = $('#heartsLayer');
  const sparklesBox = $('#sparkles');
  const toastEl     = $('#toast');

  // Barra inferior (pantalla del sobre)
  const btnMusic  = $('#btnMusic');
  const btnToggle = $('#btnToggle');
  const btnReread = $('#btnReread');
  const btnShare  = $('#btnShare');

  // Botones de la carta abierta
  const lvMusic     = $('#lvMusic');
  const lvMusicIcon = $('#lvMusicIcon');
  const lvShare     = $('#lvShare');
  const btnNext     = $('#btnNext');
  const btnBack     = $('#btnBack');
  const btnSave     = $('#btnSave');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmall = window.innerWidth < 600;

  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.8 8.1 3 4 7 4c2.1 0 3.6 1.1 5 3 1.4-1.9 2.9-3 5-3 4 0 6.2 4.1 4.6 7.7C19.5 16.4 12 21 12 21z"/></svg>';

  const COLORS = ['#f4a9bb', '#e57a92', '#d9576b', '#f9cdd8', '#ff7aa0'];

  const ICONS = {
    music: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    pause: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    open:  '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9l9 6 9-6"/></svg>',
    close: '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    playFill:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pauseFill: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/></svg>'
  };

  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const wait = (ms) => (reduceMotion ? 0 : ms);
  const scrollMode = reduceMotion ? 'auto' : 'smooth';

  // Estados: 'closed' | 'opening' | 'open' | 'closing'
  let state = 'closed';
  let musicHintShown = false;

  // ---------- Nombre (NOMBRE o ?para=Nombre en el enlace) ----------
  const params = new URLSearchParams(window.location.search);
  const nombre = (params.get('para') || NOMBRE || '').trim().slice(0, 30);
  if (nombre) {
    $('#coverName').textContent = 'Para ti, ' + nombre;
    $('#envTo').textContent = 'Para: ' + nombre;
    $('#photoCaption').textContent = nombre;
    $('#polaroid img').alt = 'Foto de ' + nombre;
  }

  // Orden de aparición progresiva del texto de la carta
  letterCard.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--i', i));

  // ---------- Aviso (toast) ----------
  let toastTimer = null;
  function showToast(message, ms = 3000) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  // ---------- Brillos de fondo ----------
  function createSparkles() {
    const count = isSmall ? 14 : 24;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle' + (Math.random() < 0.4 ? ' star' : '');
      s.style.left = rand(0, 100) + '%';
      s.style.top = rand(0, 100) + '%';
      s.style.setProperty('--s', rand(4, 11).toFixed(1) + 'px');
      s.style.setProperty('--d', rand(2.5, 5.5).toFixed(2) + 's');
      s.style.setProperty('--delay', rand(0, 6).toFixed(2) + 's');
      frag.appendChild(s);
    }
    sparklesBox.appendChild(frag);
  }

  // ---------- Corazones y pétalos flotando (suaves y limitados) ----------
  const MAX_FLOATERS = isSmall ? 6 : 10;
  let floaters = 0;
  let floatTimer = null;

  function spawnFloater() {
    if (document.hidden || floaters >= MAX_FLOATERS) return;

    const el = document.createElement('span');

    if (Math.random() < 0.35) {
      el.className = 'petal';
      el.style.setProperty('--size', rand(10, 18).toFixed(1) + 'px');
      el.style.setProperty('--dur', rand(13, 19).toFixed(1) + 's');
      el.style.setProperty('--drift', rand(-60, 60).toFixed(0) + 'px');
      el.style.setProperty('--o', rand(0.5, 0.85).toFixed(2));
    } else {
      el.className = 'float-heart';
      el.innerHTML = HEART_SVG;
      el.style.color = pick(COLORS);
      el.style.setProperty('--size', rand(12, 26).toFixed(1) + 'px');
      el.style.setProperty('--dur', rand(10, 16).toFixed(1) + 's');
      el.style.setProperty('--drift', rand(-50, 50).toFixed(0) + 'px');
      el.style.setProperty('--rot', rand(-25, 25).toFixed(0) + 'deg');
      el.style.setProperty('--o', rand(0.35, 0.7).toFixed(2));
    }

    el.style.left = rand(2, 96) + '%';
    floaters++;
    el.addEventListener('animationend', () => {
      el.remove();
      floaters--;
    }, { once: true });

    heartsLayer.appendChild(el);
  }

  function startFloating() {
    if (reduceMotion || floatTimer) return;
    spawnFloater();
    floatTimer = setInterval(spawnFloater, 1700);
  }

  // ---------- Explosión de corazones ----------
  function burstHearts(x, y, count = 14) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'burst-heart';
      el.innerHTML = HEART_SVG;
      const angle = (Math.PI * 2 * i) / count + rand(-0.2, 0.2);
      const dist = rand(70, 150);
      el.style.color = pick(COLORS);
      el.style.setProperty('--x', x + 'px');
      el.style.setProperty('--y', y + 'px');
      el.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(0) + 'px');
      el.style.setProperty('--dy', (Math.sin(angle) * dist - 30).toFixed(0) + 'px');
      el.style.setProperty('--size', rand(14, 24).toFixed(0) + 'px');
      el.style.animationDelay = rand(0, 0.15).toFixed(2) + 's';
      el.addEventListener('animationend', () => el.remove(), { once: true });
      document.body.appendChild(el);
    }
  }

  // ---------- Abrir / cerrar carta ----------
  function openLetter() {
    if (state !== 'closed') return;
    state = 'opening';
    updateControls();

    const r = seal.getBoundingClientRect();
    burstHearts(r.left + r.width / 2, r.top + r.height / 2);

    // La canción empieza junto con la apertura (el toque permite reproducir sonido)
    if (MUSICA_AL_ABRIR && !musicPlaying) toggleMusic();

    // 1) Se abre la solapa y sube el papel
    scene.classList.add('open');
    stage.classList.add('is-open');
    seal.setAttribute('aria-expanded', 'true');

    // 2) Se va el sobre y aparece la carta con la foto
    setTimeout(() => {
      stage.classList.add('leaving');
      setTimeout(() => {
        stage.hidden = true;
        stage.classList.remove('leaving');
        showLetterView();
      }, wait(500));
    }, wait(1300));
  }

  function showLetterView() {
    setFlipped(false);
    letterView.hidden = false;
    document.body.classList.add('reading');
    fitToScreen();
    window.scrollTo({ top: 0, behavior: 'auto' });
    playEntrance();

    state = 'open';
    updateControls();

    if (!musicHintShown && !musicPlaying) {
      musicHintShown = true;
      setTimeout(() => {
        if (!musicPlaying && state === 'open') showToast('Toca "Nuestra canción" 🎵 para leerla con música', 3800);
      }, 2600);
    }
  }

  // ---------- Ajustar la carta para que se vea completa en la pantalla ----------
  const lvLayout = $('.lv-layout');
  const FIT_MIN_WIDTH = 901; // en celulares se lee deslizando, sin achicar
  const FIT_PADDING = 84;    // espacio de arriba (64px) + abajo (20px)

  function fitToScreen() {
    lvLayout.style.zoom = '';
    lvLayout.style.width = '';
    if (letterView.hidden || window.innerWidth < FIT_MIN_WIDTH) return;

    const availW = window.innerWidth - 40;
    const availH = window.innerHeight - FIT_PADDING;
    if (lvLayout.offsetHeight <= availH) return; // ya entra completa

    // Prueba varios anchos y se queda con el que deja la letra más grande
    // (más ancho = menos líneas = menos alto, pero hay que achicar más a lo ancho).
    let best = { scale: 0, width: 0 };
    for (let w = 900; w <= 1700; w += 50) {
      lvLayout.style.width = w + 'px';
      const scale = Math.min(1, availH / lvLayout.offsetHeight, availW / w);
      if (scale > best.scale) best = { scale, width: w };
    }

    lvLayout.style.width = best.width + 'px';
    lvLayout.style.zoom = best.scale.toFixed(3);
  }

  let fitTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitToScreen, 120);
  });

  // Recalcular cuando terminen de cargar las letras
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitToScreen);
  }

  function playEntrance() {
    letterView.classList.remove('play');
    void letterView.offsetWidth; // reinicia las animaciones
    letterView.classList.add('play');
  }

  function closeLetter() {
    if (state !== 'open') return;
    state = 'closing';
    updateControls();

    // 1) Se desvanece la carta
    letterView.classList.add('leaving');

    setTimeout(() => {
      letterView.hidden = true;
      letterView.classList.remove('leaving', 'play');
      setFlipped(false);
      document.body.classList.remove('reading');

      // 2) Vuelve el sobre (abierto) y se cierra suavemente
      stage.hidden = false;
      stage.classList.add('entering');
      window.scrollTo({ top: 0, behavior: 'auto' });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scene.classList.remove('open');
          stage.classList.remove('is-open');
          seal.setAttribute('aria-expanded', 'false');
        });
      });

      setTimeout(() => {
        stage.classList.remove('entering');
        state = 'closed';
        updateControls();
        seal.focus({ preventScroll: true });
      }, wait(1300));
    }, wait(500));
  }

  function toggleLetter() {
    if (state === 'closed') openLetter();
    else if (state === 'open') closeLetter();
  }

  function rereadLetter() {
    if (state === 'closed') {
      openLetter();
      return;
    }
    if (state !== 'open') return;
    setFlipped(false);
    window.scrollTo({ top: 0, behavior: scrollMode });
    setTimeout(playEntrance, wait(300));
  }

  // ---------- Voltear la carta (frente / P.D.) ----------
  function setFlipped(showBack) {
    flip.classList.toggle('flipped', showBack);
    letterCard.inert = showBack;
    letterBack.inert = !showBack;
    letterCard.setAttribute('aria-hidden', String(showBack));
    letterBack.setAttribute('aria-hidden', String(!showBack));
  }

  function showBackSide() {
    setFlipped(true);
    flip.scrollIntoView({ behavior: scrollMode, block: 'center' });
    setTimeout(() => btnBack.focus({ preventScroll: true }), wait(900));
  }

  function showFrontSide() {
    setFlipped(false);
    flip.scrollIntoView({ behavior: scrollMode, block: 'start' });
    setTimeout(() => btnNext.focus({ preventScroll: true }), wait(900));
  }

  function updateControls() {
    const busy = state === 'opening' || state === 'closing';
    const isOpen = state === 'open' || state === 'closing';

    btnToggle.disabled = busy;
    btnReread.disabled = busy;

    const label = isOpen ? 'Cerrar carta' : 'Abrir carta';
    btnToggle.innerHTML = (isOpen ? ICONS.close : ICONS.open) + '<span class="label">' + label + '</span>';
    btnToggle.setAttribute('aria-label', label);
  }

  // ---------- Música ----------
  // Si colocas un archivo "musica.mp3" en la carpeta carta/audio, se usará ese.
  // Si no existe, se genera una melodía suave tipo "caja musical" con Web Audio.
  const MUSIC_FILE = 'carta/audio/musica.mp3';
  const audio = new Audio();
  audio.loop = true;
  audio.volume = 0.55;
  audio.preload = 'auto';
  audio.src = MUSIC_FILE;

  let musicSource = null; // 'file' | 'synth'
  let musicPlaying = false;

  const MusicBox = (() => {
    let ctx = null;
    let master = null;
    let echoIn = null;
    let timer = null;
    let nextTime = 0;
    let step = 0;
    let playing = false;

    const BPM = 76;
    const STEP = 60 / BPM / 2; // corcheas
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

    // Do – Lam – Fa – Sol
    const CHORDS = [
      [48, 55, 60, 64],
      [45, 52, 57, 60],
      [41, 48, 53, 57],
      [43, 50, 55, 59]
    ];
    const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
    const MELODY = [
      [64, null, 67, null, 72, null, 71, 72],
      [69, null, null, null, 67, null, 64, null],
      [65, null, 69, null, 72, null, 74, 72],
      [71, null, null, null, 67, null, null, null],
      [64, null, 67, null, 72, null, 76, null],
      [74, null, 72, null, 69, null, 72, null],
      [77, null, 76, null, 74, null, 72, null],
      [74, null, 71, null, 67, null, null, null]
    ];

    function init() {
      if (ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;

      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);

      // Eco suave
      echoIn = ctx.createGain();
      echoIn.gain.value = 0.3;
      const delay = ctx.createDelay(2);
      delay.delayTime.value = STEP * 3;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.35;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 2200;

      echoIn.connect(delay);
      delay.connect(lowpass);
      lowpass.connect(feedback);
      feedback.connect(delay);
      lowpass.connect(master);
      return true;
    }

    function voice(freq, t, dur, type, gain, attack = 0.01) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(master);
      g.connect(echoIn);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    function schedule() {
      while (nextTime < ctx.currentTime + 0.3) {
        const bar = Math.floor(step / 8) % MELODY.length;
        const s = step % 8;
        const chord = CHORDS[bar % CHORDS.length];

        voice(mtof(chord[ARP[s]]), nextTime, STEP * 2.2, 'triangle', 0.05);

        if (s === 0) {
          voice(mtof(chord[0] - 12), nextTime, STEP * 7, 'sine', 0.09, 0.05);
        }

        const note = MELODY[bar][s];
        if (note) {
          voice(mtof(note), nextTime, STEP * 3, 'sine', 0.12);
          voice(mtof(note + 12), nextTime, STEP * 1.5, 'triangle', 0.025);
        }

        nextTime += STEP;
        step++;
      }
    }

    // Debe llamarse dentro del clic del usuario (requisito de los navegadores)
    function unlock() {
      if (!init()) return false;
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }

    function play() {
      if (!unlock()) return false;
      if (playing) return true;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.6, now + 1.5);
      nextTime = now + 0.1;
      schedule();
      timer = setInterval(schedule, 100);
      playing = true;
      return true;
    }

    function pause() {
      if (!ctx || !playing) return;
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.6);
      clearInterval(timer);
      timer = null;
      playing = false;
      setTimeout(() => {
        if (!playing) ctx.suspend();
      }, 800);
    }

    return { unlock, play, pause };
  })();

  async function playMusic() {
    if (musicSource !== 'file') MusicBox.unlock();

    if (musicSource !== 'synth' && !audio.error) {
      try {
        await audio.play();
        musicSource = 'file';
        return true;
      } catch (err) {
        // No hay archivo de música o no se pudo reproducir: usamos la melodía generada
      }
    }

    musicSource = 'synth';
    return MusicBox.play();
  }

  function pauseMusic() {
    if (musicSource === 'file') audio.pause();
    else MusicBox.pause();
  }

  async function toggleMusic() {
    if (musicPlaying) {
      pauseMusic();
      musicPlaying = false;
    } else {
      musicPlaying = await playMusic();
      if (!musicPlaying) showToast('Tu navegador no permite reproducir música 😢');
    }
    updateMusicButtons();
  }

  function updateMusicButtons() {
    // Botón de la barra inferior
    const label = musicPlaying ? 'Pausar' : 'Música';
    btnMusic.classList.toggle('active', musicPlaying);
    btnMusic.setAttribute('aria-pressed', String(musicPlaying));
    btnMusic.setAttribute('aria-label', musicPlaying ? 'Pausar música' : 'Reproducir música');
    btnMusic.innerHTML = (musicPlaying ? ICONS.pause : ICONS.music) + '<span class="label">' + label + '</span>';

    // Tarjeta "Nuestra canción"
    lvMusic.classList.toggle('playing', musicPlaying);
    lvMusic.setAttribute('aria-pressed', String(musicPlaying));
    lvMusic.setAttribute('aria-label', musicPlaying ? 'Pausar nuestra canción' : 'Reproducir nuestra canción');
    lvMusicIcon.innerHTML = musicPlaying ? ICONS.pauseFill : ICONS.playFill;
  }

  // ---------- Compartir ----------
  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) { /* se intenta el método alternativo */ }

    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    ta.remove();
    return ok;
  }

  async function shareLetter() {
    if (window.location.protocol === 'file:') {
      showToast('Esta carta está abierta desde tu computadora. Para enviársela, primero súbela a internet (Netlify o GitHub Pages) 💌', 5200);
      return;
    }

    const url = window.location.href.split('#')[0];
    const data = {
      title: 'Tengo algo especial para ti ❤️',
      text: 'Te escribí algo especial 💌',
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    if (await copyText(url)) {
      showToast('¡Enlace copiado! Ya puedes enviárselo 💗');
    } else {
      window.prompt('Copia este enlace:', url);
    }
  }

  // ---------- Eventos ----------
  seal.addEventListener('click', (e) => {
    e.stopPropagation();
    openLetter();
  });
  envelope.addEventListener('click', openLetter);

  // Tocar la foto suelta corazones
  polaroid.addEventListener('click', () => {
    const r = polaroid.getBoundingClientRect();
    burstHearts(r.left + r.width / 2, r.top + r.height / 2, 16);
  });

  // Tocar la carta (fuera de los botones) la guarda en su sobre
  letterCard.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (window.getSelection().toString()) return; // no cerrar si está seleccionando texto
    closeLetter();
  });

  btnNext.addEventListener('click', showBackSide);
  btnBack.addEventListener('click', showFrontSide);
  btnSave.addEventListener('click', closeLetter);

  btnToggle.addEventListener('click', toggleLetter);
  btnReread.addEventListener('click', rereadLetter);
  btnMusic.addEventListener('click', toggleMusic);
  lvMusic.addEventListener('click', toggleMusic);
  btnShare.addEventListener('click', shareLetter);
  lvShare.addEventListener('click', shareLetter);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || state !== 'open') return;
    if (flip.classList.contains('flipped')) showFrontSide();
    else closeLetter();
  });

  // ---------- Inicio ----------
  createSparkles();
  startFloating();
  updateControls();
  updateMusicButtons();
})();
