// Fish Launcher
(function() {
  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');

  var W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', function() {
    resize();
    if (state !== 'menu') initLevel();
    else { makeStars(); makeIce(); }
  });
  resize();

  var GRAVITY = 0.35;
  function GROUND_Y() { return H * 0.82; }
  function SLING_X() { return W * 0.14; }
  function SLING_Y() { return GROUND_Y() - 90; }
  var FISH_R = 18;
  var PENGUIN_W = 46;
  var PENGUIN_H = 64;
  var BIG_SCALE = 1.8;   // big penguin size multiplier
  var BIG_POINTS = 3;    // big penguin points multiplier
  var BOMB_RADIUS = 160; // explosion chain radius (px)
  var FISH_BOMB_RADIUS = 120; // bomb-fish explosion radius (px)
  var MAX_DRAG = 110;

  var state = 'menu';
  var level = 1;
  var score = 0;
  var fishLeft = 0;
  var fishQueue = [];    // ordered list of fish types for this level: 'normal'|'split'|'bomb'
  var menuPage = 'main';   // 'main' | 'levels'
  var menuHover = -1;      // hovered level index in level-select
  var fishes = [];       // all active fish in flight (split can produce multiple)
  var penguins = [];
  var obstacles = [];    // static blocking obstacles for the current level
  var particles = [];
  var stars = [];
  var iceBlocks = [];
  var msgTimer = 0;
  var msgText = '';
  var dragging = false;
  var dragX = 0, dragY = 0;

  // ── Audio ─────────────────────────────────────────────────────────────
  var audioCtx = null;
  var musicOn = true;
  var masterGain = null;
  var musicNodes = [];   // oscillators / interval ids to stop on mute
  var musicStarted = false;

  function ensureAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = musicOn ? 0.22 : 0;
    masterGain.connect(audioCtx.destination);
  }

  // play a short one-shot tone (sfx)
  function playTone(freq, type, duration, vol, detune) {
    if (!audioCtx) return;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    g.connect(masterGain);
    var o = audioCtx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    o.connect(g);
    o.start();
    o.stop(audioCtx.currentTime + duration);
  }

  function sfxLaunch() {
    if (!audioCtx || !musicOn) return;
    playTone(220, 'sawtooth', 0.18, 0.4);
    playTone(330, 'square',   0.12, 0.25, 10);
  }
  function sfxHit() {
    if (!audioCtx || !musicOn) return;
    playTone(180, 'square',   0.08, 0.5);
    playTone(90,  'square',   0.14, 0.4);
  }
  function sfxExplode() {
    if (!audioCtx || !musicOn) return;
    // noise burst via rapid frequency sweep
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.55, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    g.connect(masterGain);
    var o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(120, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.45);
    o.connect(g);
    o.start(); o.stop(audioCtx.currentTime + 0.45);
  }
  function sfxWin() {
    if (!audioCtx || !musicOn) return;
    var notes = [523, 659, 784, 1047];
    for (var i = 0; i < notes.length; i++) {
      (function(n, delay) {
        setTimeout(function() { playTone(n, 'square', 0.28, 0.35); }, delay);
      })(notes[i], i * 110);
    }
  }
  function sfxDead() {
    if (!audioCtx || !musicOn) return;
    var notes = [330, 262, 220, 165];
    for (var i = 0; i < notes.length; i++) {
      (function(n, delay) {
        setTimeout(function() { playTone(n, 'triangle', 0.32, 0.3); }, delay);
      })(notes[i], i * 120);
    }
  }

  // ── Chiptune background music ─────────────────────────────────────────
  // 4 melodic sections that rotate so the tune never feels like a short loop.
  // Frequencies in Hz, 0 = rest. Each section is 16 8th-note steps.
  var SECTIONS = [
    // A – main jolly theme (C major pentatonic)
    { mel: [523,659,784,880, 784,659,523,0,  659,784,880,1047, 880,784,659,0],
      bass:[131,131,196,196, 131,131,175,175, 131,131,196,196,  131,175,131,0],
      label:'A' },
    // B – bridge (goes higher, more energetic)
    { mel: [1047,880,784,659, 880,1047,1175,0, 1047,880,784,659, 784,659,587,0],
      bass:[196,196,131,131,  175,175,262,262,  196,196,131,131,  175,131,196,0],
      label:'B' },
    // C – low groove (drops an octave, laid-back)
    { mel: [392,440,523,440, 392,330,392,0,  440,523,587,523, 440,392,330,0],
      bass:[98, 98, 131,131, 110,110,131,131, 98, 98, 131,131, 110,98, 110,0],
      label:'C' },
    // D – fill / turnaround (fast rising run)
    { mel: [523,587,659,698, 784,880,988,1047, 988,880,784,698, 659,587,523,0],
      bass:[131,175,196,220, 262,262,196,131,  175,175,131,131, 196,175,131,0],
      label:'D' }
  ];
  // Song order: A A B A C A D A  – repeats
  var SONG_ORDER = [0, 0, 1, 0, 2, 0, 3, 0];
  var songPos = 0;       // index into SONG_ORDER
  var sectionStep = 0;   // step within the current section (0-15)
  var musicInterval = null;

  function startMusic() {
    if (!audioCtx || musicInterval) return;
    musicStarted = true;
    var bpm = 148;
    var step = (60 / bpm) * 1000 / 2; // 8th-note duration in ms

    var beatCount = 0;
    musicInterval = setInterval(function() {
      if (!musicOn) return;

      var sec = SECTIONS[SONG_ORDER[songPos % SONG_ORDER.length]];
      var si  = sectionStep % sec.mel.length;

      // ── melody ──
      var mFreq = sec.mel[si];
      if (mFreq > 0) playTone(mFreq, 'square', 0.16, 0.26);

      // ── bass (every 2 steps) ──
      if (beatCount % 2 === 0) {
        var bFreq = sec.bass[Math.floor(si / 2) % sec.bass.length];
        if (bFreq > 0) playTone(bFreq, 'triangle', 0.30, 0.36);
      }

      // ── hi-hat on even steps ──
      if (beatCount % 2 === 0) {
        playTone(8000, 'square', 0.025, 0.14);
      }

      // ── kick on beats 0 & 8 of each section ──
      if (si === 0 || si === 8) {
        var kg = audioCtx.createGain();
        kg.gain.setValueAtTime(0.55, audioCtx.currentTime);
        kg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
        kg.connect(masterGain);
        var ko = audioCtx.createOscillator();
        ko.type = 'sine';
        ko.frequency.setValueAtTime(155, audioCtx.currentTime);
        ko.frequency.exponentialRampToValueAtTime(38, audioCtx.currentTime + 0.22);
        ko.connect(kg);
        ko.start(); ko.stop(audioCtx.currentTime + 0.22);
      }

      // ── snare on beats 4 & 12 ──
      if (si === 4 || si === 12) {
        var sg = audioCtx.createGain();
        sg.gain.setValueAtTime(0.28, audioCtx.currentTime);
        sg.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
        sg.connect(masterGain);
        var so = audioCtx.createOscillator();
        so.type = 'sawtooth';
        so.frequency.value = 180;
        so.connect(sg);
        so.start(); so.stop(audioCtx.currentTime + 0.12);
      }

      // advance step counter
      sectionStep++;
      if (sectionStep >= sec.mel.length) {
        sectionStep = 0;
        songPos++;
      }
      beatCount++;
    }, step);
  }

  function stopMusic() {
    if (musicInterval) { clearInterval(musicInterval); musicInterval = null; }
  }

  function toggleMusic() {
    musicOn = !musicOn;
    if (masterGain) masterGain.gain.value = musicOn ? 0.22 : 0;
    if (musicOn) startMusic();
    else stopMusic();
  }

  function initAudio() {
    ensureAudio();
    if (!musicStarted) startMusic();
  }

  var LEVELS = [
    // 1 – warm-up
    { fish: 5, penguins: [{ xf: 0.60, stack: 1 }, { xf: 0.72, stack: 1 }, { xf: 0.84, stack: 1 }] },
    // 2
    { fish: 5, penguins: [{ xf: 0.58, stack: 2 }, { xf: 0.72, stack: 1 }, { xf: 0.84, stack: 2 }] },
    // 3
    { fish: 6, penguins: [{ xf: 0.55, stack: 1 }, { xf: 0.64, stack: 2 }, { xf: 0.73, stack: 2 }, { xf: 0.84, stack: 1 }] },
    // 4
    { fish: 6, penguins: [{ xf: 0.56, stack: 3 }, { xf: 0.68, stack: 2, big: true }, { xf: 0.80, stack: 3, bomber: true }] },
    // 5 – first obstacle: one wall between sling and penguins
    { fish: 7, penguins: [{ xf: 0.54, stack: 2 }, { xf: 0.63, stack: 3, bomber: true }, { xf: 0.72, stack: 2, big: true }, { xf: 0.81, stack: 3 }, { xf: 0.90, stack: 1 }],
      obstacles: [{ type: 'wall', xf: 0.42, yf: 0.55, w: 18, h: 140 }] },
    // 6 – wall + bumper
    { fish: 6, penguins: [{ xf: 0.52, stack: 1, big: true }, { xf: 0.60, stack: 1 }, { xf: 0.67, stack: 1, bomber: true }, { xf: 0.74, stack: 1 }, { xf: 0.81, stack: 1 }, { xf: 0.88, stack: 1, big: true }],
      obstacles: [{ type: 'wall', xf: 0.38, yf: 0.52, w: 18, h: 120 }, { type: 'bumper', xf: 0.55, yf: 0.45, r: 28 }] },
    // 7 – two bumpers
    { fish: 7, penguins: [{ xf: 0.56, stack: 1, bomber: true }, { xf: 0.64, stack: 2 }, { xf: 0.72, stack: 3, big: true }, { xf: 0.80, stack: 2 }, { xf: 0.88, stack: 1, bomber: true }],
      obstacles: [{ type: 'bumper', xf: 0.44, yf: 0.50, r: 28 }, { type: 'bumper', xf: 0.60, yf: 0.38, r: 26 }] },
    // 8 – two walls creating a gap to aim through
    { fish: 6, penguins: [{ xf: 0.57, stack: 3, bomber: true }, { xf: 0.72, stack: 3, big: true }, { xf: 0.87, stack: 3 }],
      obstacles: [{ type: 'wall', xf: 0.40, yf: 0.44, w: 18, h: 100 }, { type: 'wall', xf: 0.40, yf: 0.72, w: 18, h: 80 }] },
    // 9 – wall + two bumpers
    { fish: 8, penguins: [{ xf: 0.52, stack: 3, big: true }, { xf: 0.60, stack: 1 }, { xf: 0.68, stack: 4, bomber: true }, { xf: 0.76, stack: 1 }, { xf: 0.84, stack: 3, big: true }, { xf: 0.91, stack: 2 }],
      obstacles: [{ type: 'bumper', xf: 0.44, yf: 0.42, r: 30 }, { type: 'bumper', xf: 0.60, yf: 0.58, r: 28 }, { type: 'wall', xf: 0.36, yf: 0.58, w: 16, h: 90 }] },
    // 10 – two walls + a bumper mid-air
    { fish: 8, penguins: [{ xf: 0.54, stack: 4, big: true }, { xf: 0.63, stack: 2, bomber: true }, { xf: 0.72, stack: 4 }, { xf: 0.81, stack: 2, bomber: true }, { xf: 0.90, stack: 4, big: true }],
      obstacles: [{ type: 'wall', xf: 0.38, yf: 0.48, w: 18, h: 110 }, { type: 'bumper', xf: 0.50, yf: 0.35, r: 28 }, { type: 'bumper', xf: 0.62, yf: 0.55, r: 26 }] },
    // 11
    { fish: 7, penguins: [{ xf: 0.50, stack: 1, bomber: true }, { xf: 0.57, stack: 1, big: true }, { xf: 0.63, stack: 1 }, { xf: 0.70, stack: 1, big: true }, { xf: 0.76, stack: 1, bomber: true }, { xf: 0.83, stack: 1, big: true }, { xf: 0.90, stack: 1 }],
      obstacles: [{ type: 'bumper', xf: 0.42, yf: 0.46, r: 30 }, { type: 'wall', xf: 0.46, yf: 0.50, w: 18, h: 130 }, { type: 'bumper', xf: 0.60, yf: 0.36, r: 26 }] },
    // 12
    { fish: 8, penguins: [{ xf: 0.56, stack: 4, big: true }, { xf: 0.65, stack: 3, bomber: true }, { xf: 0.73, stack: 2 }, { xf: 0.81, stack: 3, bomber: true }, { xf: 0.89, stack: 4, big: true }],
      obstacles: [{ type: 'bumper', xf: 0.42, yf: 0.40, r: 32 }, { type: 'bumper', xf: 0.54, yf: 0.58, r: 28 }, { type: 'wall', xf: 0.35, yf: 0.55, w: 18, h: 100 }, { type: 'bumper', xf: 0.65, yf: 0.32, r: 24 }] },
    // 13
    { fish: 9, penguins: [{ xf: 0.50, stack: 2, bomber: true }, { xf: 0.57, stack: 4, big: true }, { xf: 0.64, stack: 2, bomber: true }, { xf: 0.71, stack: 4, big: true }, { xf: 0.78, stack: 2, bomber: true }, { xf: 0.85, stack: 4, big: true }, { xf: 0.92, stack: 2 }],
      obstacles: [{ type: 'wall', xf: 0.38, yf: 0.46, w: 18, h: 120 }, { type: 'wall', xf: 0.38, yf: 0.74, w: 18, h: 60 }, { type: 'bumper', xf: 0.56, yf: 0.38, r: 28 }, { type: 'bumper', xf: 0.48, yf: 0.56, r: 26 }] },
    // 14
    { fish: 8, penguins: [{ xf: 0.57, stack: 5, big: true }, { xf: 0.68, stack: 3, bomber: true }, { xf: 0.78, stack: 5, big: true }, { xf: 0.89, stack: 3, bomber: true }],
      obstacles: [{ type: 'bumper', xf: 0.44, yf: 0.44, r: 32 }, { type: 'bumper', xf: 0.50, yf: 0.34, r: 30 }, { type: 'wall', xf: 0.36, yf: 0.52, w: 20, h: 90 }, { type: 'bumper', xf: 0.62, yf: 0.50, r: 28 }] },
    // 15
    { fish: 9, penguins: [{ xf: 0.50, stack: 3, big: true }, { xf: 0.57, stack: 1, bomber: true }, { xf: 0.63, stack: 4 }, { xf: 0.70, stack: 2, big: true }, { xf: 0.76, stack: 4, bomber: true }, { xf: 0.82, stack: 1 }, { xf: 0.88, stack: 3, big: true }, { xf: 0.94, stack: 2 }],
      obstacles: [{ type: 'wall', xf: 0.34, yf: 0.50, w: 20, h: 110 }, { type: 'bumper', xf: 0.44, yf: 0.36, r: 28 }, { type: 'bumper', xf: 0.52, yf: 0.56, r: 26 }, { type: 'bumper', xf: 0.63, yf: 0.34, r: 26 }, { type: 'wall', xf: 0.44, yf: 0.70, w: 16, h: 70 }] },
    // 16
    { fish: 8, penguins: [{ xf: 0.57, stack: 6, big: true }, { xf: 0.72, stack: 6, bomber: true }, { xf: 0.87, stack: 6, big: true }],
      obstacles: [{ type: 'bumper', xf: 0.40, yf: 0.38, r: 32 }, { type: 'wall', xf: 0.36, yf: 0.60, w: 20, h: 100 }, { type: 'bumper', xf: 0.50, yf: 0.52, r: 30 }, { type: 'bumper', xf: 0.60, yf: 0.30, r: 28 }, { type: 'wall', xf: 0.36, yf: 0.70, w: 18, h: 60 }] },
    // 17
    { fish: 9, penguins: [{ xf: 0.52, stack: 1, bomber: true }, { xf: 0.59, stack: 2, big: true }, { xf: 0.66, stack: 3, bomber: true }, { xf: 0.73, stack: 4, big: true }, { xf: 0.80, stack: 5 }, { xf: 0.87, stack: 6, big: true }],
      obstacles: [{ type: 'wall', xf: 0.38, yf: 0.44, w: 18, h: 140 }, { type: 'bumper', xf: 0.46, yf: 0.40, r: 30 }, { type: 'bumper', xf: 0.55, yf: 0.32, r: 30 }, { type: 'wall', xf: 0.34, yf: 0.72, w: 18, h: 60 }, { type: 'bumper', xf: 0.64, yf: 0.52, r: 26 }] },
    // 18
    { fish: 10, penguins: [{ xf: 0.50, stack: 4, big: true }, { xf: 0.57, stack: 5, bomber: true }, { xf: 0.63, stack: 3, big: true }, { xf: 0.70, stack: 5, bomber: true }, { xf: 0.76, stack: 4, big: true }, { xf: 0.83, stack: 5, bomber: true }, { xf: 0.89, stack: 3, big: true }, { xf: 0.95, stack: 4 }],
      obstacles: [{ type: 'wall', xf: 0.36, yf: 0.46, w: 20, h: 120 }, { type: 'bumper', xf: 0.44, yf: 0.34, r: 32 }, { type: 'bumper', xf: 0.44, yf: 0.56, r: 28 }, { type: 'bumper', xf: 0.55, yf: 0.28, r: 26 }, { type: 'bumper', xf: 0.62, yf: 0.50, r: 26 }, { type: 'wall', xf: 0.33, yf: 0.72, w: 16, h: 60 }] },
    // 19
    { fish: 10, penguins: [{ xf: 0.52, stack: 6, big: true }, { xf: 0.60, stack: 2, bomber: true }, { xf: 0.67, stack: 6, big: true }, { xf: 0.74, stack: 2, bomber: true }, { xf: 0.81, stack: 6, big: true }, { xf: 0.88, stack: 2, bomber: true }, { xf: 0.94, stack: 6, big: true }],
      obstacles: [{ type: 'wall', xf: 0.38, yf: 0.42, w: 20, h: 110 }, { type: 'bumper', xf: 0.44, yf: 0.38, r: 32 }, { type: 'bumper', xf: 0.48, yf: 0.30, r: 32 }, { type: 'wall', xf: 0.34, yf: 0.70, w: 18, h: 60 }, { type: 'bumper', xf: 0.60, yf: 0.54, r: 28 }, { type: 'bumper', xf: 0.66, yf: 0.28, r: 28 }] },
    // 20 – grand finale
    { fish: 11, penguins: [{ xf: 0.50, stack: 5, big: true }, { xf: 0.56, stack: 7, bomber: true }, { xf: 0.62, stack: 3, big: true }, { xf: 0.68, stack: 6, bomber: true }, { xf: 0.74, stack: 4, big: true }, { xf: 0.80, stack: 6, bomber: true }, { xf: 0.86, stack: 3, big: true }, { xf: 0.92, stack: 7, bomber: true }, { xf: 0.97, stack: 5, big: true }],
      obstacles: [{ type: 'wall', xf: 0.36, yf: 0.44, w: 22, h: 130 }, { type: 'bumper', xf: 0.42, yf: 0.36, r: 34 }, { type: 'bumper', xf: 0.46, yf: 0.30, r: 34 }, { type: 'wall', xf: 0.33, yf: 0.72, w: 18, h: 60 }, { type: 'bumper', xf: 0.56, yf: 0.52, r: 30 }, { type: 'bumper', xf: 0.62, yf: 0.26, r: 30 }, { type: 'bumper', xf: 0.70, yf: 0.44, r: 26 }] }
  ];

  function makeStars() {
    stars = [];
    for (var i = 0; i < 120; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.6 + 0.4, t: Math.random() * Math.PI * 2 });
    }
  }

  function makeIce() {
    iceBlocks = [];
    for (var i = 0; i < 7; i++) {
      var t = (i + 0.5) / 7;
      iceBlocks.push({ x: t * W * 0.7 + W * 0.22, y: GROUND_Y() - 14, w: 60 + Math.random() * 60, h: 16 + Math.random() * 10 });
    }
  }

  function makePenguins(ld) {
    penguins = [];
    for (var i = 0; i < ld.penguins.length; i++) {
      var pd = ld.penguins[i];
      var sc = pd.big ? BIG_SCALE : 1;
      var pw = PENGUIN_W * sc;
      var ph = PENGUIN_H * sc;
      for (var s = 0; s < pd.stack; s++) {
        penguins.push({
          x: pd.xf * W,
          y: GROUND_Y() - ph / 2 - s * (ph + 4),
          stack: s,
          groupId: i,
          big: !!pd.big,
          bomber: !!pd.bomber,
          scale: sc,
          alive: true, hitTimer: 0, fuseT: 0, vx: 0, vy: 0, bouncing: false, angle: 0,
          runaway: false, runDir: 1, waddleT: 0
        });
      }
    }
  }

  function makeFishQueue(ld) {
    fishQueue = [];
    var total = ld.fish;
    if (level < 10) {
      // all normal below level 10
      for (var i = 0; i < total; i++) fishQueue.push('normal');
    } else {
      // from level 10: inject one split + one bomb, rest normal
      // higher levels get more specials
      var specials = Math.min(Math.floor((level - 9) / 2) + 1, Math.floor(total / 2));
      var splits = Math.ceil(specials / 2);
      var bombs  = Math.floor(specials / 2);
      var normals = total - splits - bombs;
      var pool = [];
      for (var i = 0; i < splits;  i++) pool.push('split');
      for (var i = 0; i < bombs;   i++) pool.push('bomb');
      for (var i = 0; i < normals; i++) pool.push('normal');
      // shuffle so specials appear throughout
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      fishQueue = pool;
    }
  }

  function makeObstacles(ld) {
    obstacles = [];
    if (!ld.obstacles) return;
    for (var i = 0; i < ld.obstacles.length; i++) {
      var od = ld.obstacles[i];
      obstacles.push({
        type: od.type,
        x: od.xf * W,
        y: od.yf * H,
        w: od.w || 18,
        h: od.h || 100,
        r: od.r || 28,
        angle: 0,       // for bumper spin
        flashTimer: 0   // flash on hit
      });
    }
  }

  function initLevel() {
    var ld = LEVELS[(level - 1) % LEVELS.length];
    fishLeft = ld.fish;
    fishes = [];
    if (state !== 'menu') state = 'aim';
    particles = [];
    dragging = false;
    makePenguins(ld);
    makeFishQueue(ld);
    makeObstacles(ld);
    makeIce();
    msgTimer = 0;
  }

  function launchFish(ox, oy, tx, ty) {
    var speedScale = W / 1280;
    var vx = (ox - tx) * 0.38 * speedScale;
    var vy = (oy - ty) * 0.38 * speedScale;
    var type = fishQueue.length > 0 ? fishQueue.shift() : 'normal';
    var f = { x: ox, y: oy, vx: vx, vy: vy, angle: 0, trail: [], alive: true,
              type: type, splitDone: false, splitTimer: 0 };
    f.angle = Math.atan2(f.vy, f.vx);
    fishes.push(f);
    fishLeft--;
  }

  // Spawn two extra sub-fish when a split fish divides
  function doSplit(f) {
    f.splitDone = true;
    spawnParticles(f.x, f.y, '#cc88ff', 14);
    spawnParticles(f.x, f.y, '#ffffff', 8);
    var speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    var baseAngle = Math.atan2(f.vy, f.vx);
    var offsets = [-0.38, 0.38];  // radians above/below
    for (var i = 0; i < offsets.length; i++) {
      var a = baseAngle + offsets[i];
      var sub = { x: f.x, y: f.y,
                  vx: Math.cos(a) * speed * 0.88,
                  vy: Math.sin(a) * speed * 0.88,
                  angle: a, trail: [], alive: true,
                  type: 'sub', splitDone: true, splitTimer: 0 };
      fishes.push(sub);
    }
    // main fish continues straight, slightly slower
    f.vx *= 0.88;
    f.vy *= 0.88;
  }

  // Explode a bomb-fish at position, knocking all penguins in FISH_BOMB_RADIUS
  function explodeFishBomb(f) {
    spawnParticles(f.x, f.y, '#ff2200', 35);
    spawnParticles(f.x, f.y, '#ff8800', 25);
    spawnParticles(f.x, f.y, '#ffee00', 20);
    spawnParticles(f.x, f.y, '#ffffff', 15);
    for (var i = 0; i < penguins.length; i++) {
      var p = penguins[i];
      if (!p.alive || p.bouncing) continue;
      var dx = p.x - f.x, dy = p.y - f.y;
      if (dx * dx + dy * dy < FISH_BOMB_RADIUS * FISH_BOMB_RADIUS) {
        p.bouncing = true;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (dx / dist) * 11;
        p.vy = (dy / dist) * 11 - 5;
        var pts = 100 * (p.stack + 1) * (p.big ? BIG_POINTS : 1);
        score += pts;
        spawnParticles(p.x, p.y, '#ff6600', 14);
        if (p.bomber) explode(p);
      }
    }
  }

  function spawnParticles(x, y, col, n) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var spd = 2 + Math.random() * 5;
      particles.push({ x: x, y: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3, life: 1, decay: 0.025 + Math.random() * 0.03, r: 4 + Math.random() * 5, col: col });
    }
  }

  function explode(bomber) {
    spawnParticles(bomber.x, bomber.y, '#ff6600', 30);
    spawnParticles(bomber.x, bomber.y, '#ffdd00', 20);
    spawnParticles(bomber.x, bomber.y, '#ffffff', 15);
    for (var i = 0; i < penguins.length; i++) {
      var p = penguins[i];
      if (!p.alive || p.bouncing || p === bomber) continue;
      var dx = p.x - bomber.x, dy = p.y - bomber.y;
      if (dx * dx + dy * dy < BOMB_RADIUS * BOMB_RADIUS) {
        p.bouncing = true;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx = (dx / dist) * 9;
        p.vy = (dy / dist) * 9 - 5;
        var pts = 100 * (p.stack + 1) * (p.big ? BIG_POINTS : 1);
        score += pts;
        spawnParticles(p.x, p.y, '#ff9900', 12);
        if (p.bomber) explode(p);
      }
    }
  }

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    var nx = Math.max(rx - rw / 2, Math.min(cx, rx + rw / 2));
    var ny = Math.max(ry - rh / 2, Math.min(cy, ry + rh / 2));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function update() {
    var gy = GROUND_Y();
    for (var i = 0; i < stars.length; i++) stars[i].t += 0.04;
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (var i = 0; i < penguins.length; i++) {
      var p = penguins[i];
      if (!p.bouncing) {
        // runaway waddle + jump movement
        if (p.runaway) {
          p.waddleT += 0.22;
          var gy2 = GROUND_Y() - (PENGUIN_H * p.scale) / 2;
          var speed = 2.2 * p.scale;
          p.x += p.runDir * speed;
          // apply gravity when airborne
          p.jumpVy = (p.jumpVy || 0) + GRAVITY;
          p.y += p.jumpVy;
          // land on ground
          if (p.y >= gy2) {
            p.y = gy2;
            p.jumpVy = 0;
            p.jumpTimer = (p.jumpTimer || 0) + 1;
            // jump every ~55 steps
            if (p.jumpTimer % 55 === 0) {
              p.jumpVy = -8.5 * p.scale;
            }
          }
          // bounce off screen edges
          if (p.x < W * 0.05) p.runDir = 1;
          if (p.x > W * 0.97) p.runDir = -1;
        }
        continue;
      }
      p.x += p.vx; p.y += p.vy; p.vy += GRAVITY * 1.2; p.angle += p.vx * 0.05;
      if (p.y > H + PENGUIN_H) p.alive = false;
    }
    // animate obstacles even while aiming
    for (var oi = 0; oi < obstacles.length; oi++) {
      obstacles[oi].angle += 0.025;
      if (obstacles[oi].flashTimer > 0) obstacles[oi].flashTimer--;
    }
    if (state !== 'flying') return;

    var anyAlive = false;
    for (var fi = fishes.length - 1; fi >= 0; fi--) {
      var f = fishes[fi];
      if (!f.alive) { fishes.splice(fi, 1); continue; }
      anyAlive = true;

      // trail
      f.trail.push({ x: f.x, y: f.y });
      if (f.trail.length > 18) f.trail.shift();

      // physics
      f.vy += GRAVITY;
      f.vx *= 0.995;
      f.x += f.vx;
      f.y += f.vy;
      f.angle = Math.atan2(f.vy, f.vx);

      // split timer: split when close to apex (vy near 0) or after 28 frames
      if (f.type === 'split' && !f.splitDone) {
        f.splitTimer++;
        if (f.splitTimer >= 28 || Math.abs(f.vy) < 1.2) {
          doSplit(f);
        }
      }

      // ground hit
      if (f.y + FISH_R > gy) {
        if (f.type === 'bomb') explodeFishBomb(f);
        else spawnParticles(f.x, gy, '#7bcaec', 8);
        f.alive = false;
        continue;
      }
      // out of bounds
      if (f.x > W + 80 || f.y < -300) { f.alive = false; continue; }

      // ── obstacle collision ────────────────────────────────────────────
      var blockedByObstacle = false;
      for (var oi = 0; oi < obstacles.length; oi++) {
        var ob = obstacles[oi];

        if (ob.type === 'wall') {
          // axis-aligned rectangle collision
          if (circleRect(f.x, f.y, FISH_R, ob.x, ob.y, ob.w, ob.h)) {
            ob.flashTimer = 10;
            spawnParticles(f.x, f.y, '#88ccff', 6);
            // reflect horizontally off the wall face
            f.vx = -f.vx * 0.6;
            f.vy *= 0.75;
            // push fish out of wall
            var wallLeft = ob.x - ob.w / 2, wallRight = ob.x + ob.w / 2;
            if (f.x < ob.x) f.x = wallLeft - FISH_R - 1;
            else f.x = wallRight + FISH_R + 1;
            blockedByObstacle = true;
          }
        } else if (ob.type === 'bumper') {
          var bdx = f.x - ob.x, bdy = f.y - ob.y;
          var bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bdist < ob.r + FISH_R) {
            ob.flashTimer = 10;
            spawnParticles(f.x, f.y, '#ffdd44', 8);
            // reflect velocity away from bumper centre, boost speed slightly
            var bn = bdist || 1;
            var nx2 = bdx / bn, ny2 = bdy / bn;
            var dot = f.vx * nx2 + f.vy * ny2;
            f.vx = (f.vx - 2 * dot * nx2) * 1.1;
            f.vy = (f.vy - 2 * dot * ny2) * 1.1;
            // push out of bumper
            var overlap = ob.r + FISH_R - bdist + 1;
            f.x += nx2 * overlap;
            f.y += ny2 * overlap;
            blockedByObstacle = true;
          }
        }
        if (blockedByObstacle && !f.alive) break;
      }
      if (!f.alive) continue;

      // penguin collision
      var hit = false;
      for (var i = 0; i < penguins.length; i++) {
        var p = penguins[i];
        if (!p.alive || p.bouncing) continue;
        var pw = PENGUIN_W * p.scale, ph = PENGUIN_H * p.scale;
        if (circleRect(f.x, f.y, FISH_R, p.x, p.y, pw, ph)) {
          if (f.type === 'bomb') {
            // bomb fish: big explosion, doesn't "hit" just the one penguin
            explodeFishBomb(f);
            f.alive = false;
          } else {
            p.bouncing = true;
            p.vx = f.vx * 0.5 + (Math.random() - 0.5) * 4;
            p.vy = f.vy * 0.4 - 3;
            if (p.bomber) {
              explode(p);
              sfxExplode();
            } else {
              var pts = 100 * (p.stack + 1) * (p.big ? BIG_POINTS : 1);
              score += pts;
              spawnParticles(p.x, p.y, p.big ? '#ffd700' : '#fff', p.big ? 22 : 14);
              spawnParticles(p.x, p.y, '#f5c518', 8);
              sfxHit();
            }
            p.hitTimer = 12;
            f.vx *= 0.35;
            f.vy *= -0.15;
            // check if this was the last alive penguin in its group
            var gid = p.groupId;
            var groupSurvivors = penguins.filter(function(q) {
              return q.alive && !q.bouncing && q !== p && q.groupId === gid;
            });
            if (groupSurvivors.length === 1) {
              // exactly one remains – make it run away
              var survivor = groupSurvivors[0];
              survivor.runaway = true;
              survivor.runDir = (survivor.x > W * 0.5) ? 1 : -1;
            }
          }
          hit = true;
          break;
        }
      }
    }

    if (fishes.length === 0) afterThrow();
  }

  function afterThrow() {
    var alive = penguins.filter(function(p) { return p.alive && !p.bouncing; });
    if (alive.length === 0) {
      state = 'win';
      msgText = level < LEVELS.length ? 'Level ' + level + ' Clear!' : 'You beat all levels!';
      msgTimer = 240;
      sfxWin();
    } else if (fishLeft === 0) {
      state = 'dead';
      msgText = 'Out of fish! ' + alive.length + ' escaped';
      msgTimer = 240;
      sfxDead();
    } else {
      state = 'aim';
    }
  }

  // ── Background themes – one per level (cycles if > 20 levels) ──────────
  var BG_THEMES = [
    // 1  Arctic night – original
    { sky: ['#0a1628','#1a3a5c','#0d2240'], ground: ['#dff4ff','#f0fbff'], ice: '#a8dff5', iceStroke: '#7bcaec', scene: 'moon' },
    // 2  Deep ocean blue
    { sky: ['#020c1a','#03245c','#051840'], ground: ['#b8e0ff','#d6f0ff'], ice: '#7acef5', iceStroke: '#4ab0e8', scene: 'moon' },
    // 3  Dusk purple
    { sky: ['#1a0a2e','#3d1a6e','#5c2d8a'], ground: ['#e8d4ff','#f4eaff'], ice: '#c8aaee', iceStroke: '#9966cc', scene: 'moon' },
    // 4  Northern lights green
    { sky: ['#021208','#043d18','#052b10'], ground: ['#c8f0d8','#e4f8ec'], ice: '#80dba8', iceStroke: '#3db870', scene: 'aurora_green' },
    // 5  Northern lights teal
    { sky: ['#020e18','#033040','#041e28'], ground: ['#b8eae0','#d4f5ef'], ice: '#66ccbb', iceStroke: '#22aa99', scene: 'aurora_teal' },
    // 6  Sunrise orange
    { sky: ['#1a0800','#7a2e00','#e85c00'], ground: ['#ffe4c8','#fff4e8'], ice: '#ffbf80', iceStroke: '#e88040', scene: 'sun' },
    // 7  Golden sunset
    { sky: ['#0d0500','#5c2800','#c86400'], ground: ['#ffe0a0','#fff4d0'], ice: '#ffc84a', iceStroke: '#e0a020', scene: 'sun' },
    // 8  Pink sky
    { sky: ['#1a0818','#7a1a60','#cc3399'], ground: ['#ffd4ee','#ffecf6'], ice: '#f09ad8', iceStroke: '#cc44aa', scene: 'moon' },
    // 9  Stormy grey
    { sky: ['#0a0a0a','#1e1e1e','#2e2e3a'], ground: ['#c8c8d4','#e0e0ea'], ice: '#9898a8', iceStroke: '#6666aa', scene: 'clouds' },
    // 10 Blizzard white-blue
    { sky: ['#3a5878','#6894b8','#aaced8'], ground: ['#f4fcff','#ffffff'], ice: '#cce8f8', iceStroke: '#88bbd8', scene: 'snow' },
    // 11 Midnight indigo
    { sky: ['#04040f','#0c0c3a','#14145a'], ground: ['#c0c0e0','#dcdcf8'], ice: '#8888cc', iceStroke: '#4444aa', scene: 'moon' },
    // 12 Volcano red
    { sky: ['#1a0000','#5a0800','#c81400'], ground: ['#ffa080','#ffd0b0'], ice: '#ff6644', iceStroke: '#cc2200', scene: 'lava' },
    // 13 Desert gold
    { sky: ['#1a0c00','#6e3800','#d07800'], ground: ['#f0d080','#fff0b0'], ice: '#e8b840', iceStroke: '#c08020', scene: 'sun' },
    // 14 Tropical cyan
    { sky: ['#001a28','#005c80','#00aad4'], ground: ['#a0f0e0','#d4fff8'], ice: '#40ddc8', iceStroke: '#00b8a8', scene: 'sun' },
    // 15 Forest night
    { sky: ['#020c04','#082808','#103010'], ground: ['#80c880','#b4e8b4'], ice: '#44aa44', iceStroke: '#228822', scene: 'moon' },
    // 16 Blood moon
    { sky: ['#140004','#3a0010','#700020'], ground: ['#e8a0a0','#ffd4d4'], ice: '#cc5566', iceStroke: '#aa2233', scene: 'blood_moon' },
    // 17 Electric storm
    { sky: ['#020208','#0a0a2a','#181848'], ground: ['#b0b0d8','#d8d8f8'], ice: '#6868c8', iceStroke: '#3030aa', scene: 'lightning' },
    // 18 Candy pink
    { sky: ['#1a0018','#660050','#cc0088'], ground: ['#ffc0f0','#ffe4f8'], ice: '#ff80d8', iceStroke: '#ee00aa', scene: 'moon' },
    // 19 Cosmic purple
    { sky: ['#080010','#20003a','#400080'], ground: ['#d0b0ff','#ecd8ff'], ice: '#aa66ff', iceStroke: '#7722ee', scene: 'aurora_purple' },
    // 20 Galaxy finale
    { sky: ['#000008','#080018','#100028'], ground: ['#c8c0f0','#e8e0ff'], ice: '#8870ee', iceStroke: '#5522cc', scene: 'galaxy' },
  ];

  function getBgTheme() {
    return BG_THEMES[(level - 1) % BG_THEMES.length];
  }

  function drawBg() {
    var th = getBgTheme();
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    th.sky[0]);
    grad.addColorStop(0.75, th.sky[1]);
    grad.addColorStop(1,    th.sky[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    var sc = th.scene;

    // Aurora effects
    if (sc === 'aurora_green' || sc === 'aurora_teal' || sc === 'aurora_purple') {
      var aCol = sc === 'aurora_green' ? ['rgba(0,255,120,', 'rgba(0,200,80,'] :
                 sc === 'aurora_teal'  ? ['rgba(0,220,200,', 'rgba(0,160,180,'] :
                                         ['rgba(160,80,255,', 'rgba(100,40,200,'];
      for (var a = 0; a < 5; a++) {
        ctx.save();
        ctx.globalAlpha = 0.18 + 0.08 * Math.sin(Date.now() * 0.0008 + a * 1.2);
        var ag = ctx.createLinearGradient(0, H * 0.05, 0, H * 0.55);
        ag.addColorStop(0, aCol[0] + '0)');
        ag.addColorStop(0.4, aCol[0] + '1)');
        ag.addColorStop(1, aCol[1] + '0)');
        ctx.fillStyle = ag;
        ctx.beginPath();
        var waveX = W * (0.1 + a * 0.2 + 0.05 * Math.sin(Date.now() * 0.0005 + a));
        ctx.ellipse(waveX, H * 0.3, W * 0.12, H * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Galaxy: extra tiny stars + nebula blobs
    if (sc === 'galaxy') {
      ctx.save();
      for (var g = 0; g < 6; g++) {
        ctx.globalAlpha = 0.07 + 0.04 * Math.sin(Date.now() * 0.0003 + g);
        var gg = ctx.createRadialGradient(W*(0.15+g*0.14), H*(0.1+g*0.08), 0, W*(0.15+g*0.14), H*(0.1+g*0.08), W*0.18);
        var nebCols = ['#aa44ff','#4488ff','#ff44aa','#44ffcc','#ffaa44','#88ff44'];
        gg.addColorStop(0, nebCols[g]);
        gg.addColorStop(1, 'transparent');
        ctx.fillStyle = gg;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }

    // Clouds (stormy)
    if (sc === 'clouds') {
      ctx.save();
      ctx.fillStyle = 'rgba(80,80,100,0.35)';
      var cloudSeeds = [0.15, 0.38, 0.60, 0.80];
      for (var ci = 0; ci < cloudSeeds.length; ci++) {
        var cx2 = W * cloudSeeds[ci];
        var cy2 = H * (0.15 + ci * 0.06);
        ctx.beginPath(); ctx.ellipse(cx2, cy2, 90, 32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx2 + 60, cy2 + 8, 70, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx2 - 50, cy2 + 4, 60, 22, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    // Blowing snow
    if (sc === 'snow') {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (var si = 0; si < stars.length; si++) {
        var ss = stars[si];
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(ss.t);
        ctx.beginPath();
        ctx.arc((ss.x * W + Date.now() * 0.03) % W, ss.y * H, ss.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Lava glow on horizon
    if (sc === 'lava') {
      ctx.save();
      var lg = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.82);
      lg.addColorStop(0, 'rgba(255,100,0,0)');
      lg.addColorStop(1, 'rgba(255,60,0,0.45)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, H * 0.6, W, H * 0.22);
      ctx.restore();
    }

    // Lightning bolt (random flash)
    if (sc === 'lightning' && Math.random() < 0.007) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180,180,255,0.9)';
      ctx.lineWidth = 2;
      var lx = W * (0.3 + Math.random() * 0.5), ly = 0;
      ctx.beginPath(); ctx.moveTo(lx, ly);
      for (var li = 0; li < 6; li++) { lx += (Math.random() - 0.5) * 60; ly += H * 0.12; ctx.lineTo(lx, ly); }
      ctx.stroke();
      ctx.restore();
    }

    // Sun
    if (sc === 'sun') {
      ctx.save();
      ctx.shadowColor = '#ffdd44';
      ctx.shadowBlur = 50;
      ctx.fillStyle = '#ffe040';
      ctx.beginPath();
      ctx.arc(W * 0.85, H * 0.12, 34, 0, Math.PI * 2);
      ctx.fill();
      // rays
      ctx.strokeStyle = 'rgba(255,220,40,0.4)';
      ctx.lineWidth = 3;
      for (var ri = 0; ri < 8; ri++) {
        var ra = ri * Math.PI / 4 + Date.now() * 0.0003;
        ctx.beginPath();
        ctx.moveTo(W*0.85 + Math.cos(ra)*40, H*0.12 + Math.sin(ra)*40);
        ctx.lineTo(W*0.85 + Math.cos(ra)*62, H*0.12 + Math.sin(ra)*62);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Moon (normal or blood)
    if (sc === 'moon' || sc === 'blood_moon') {
      ctx.save();
      var moonCol = sc === 'blood_moon' ? '#ff4422' : '#fffde0';
      var moonGlow = sc === 'blood_moon' ? '#ff2200' : '#fffde0';
      ctx.shadowColor = moonGlow;
      ctx.shadowBlur = sc === 'blood_moon' ? 60 : 40;
      ctx.fillStyle = moonCol;
      ctx.beginPath();
      ctx.arc(W * 0.85, H * 0.12, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = th.sky[1];
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(W * 0.85 + 12, H * 0.12 - 6, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Stars (all non-snow themes)
    if (sc !== 'sun' && sc !== 'snow') {
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.t);
        ctx.fillStyle = sc === 'galaxy' ? (i % 3 === 0 ? '#ffeeaa' : i % 3 === 1 ? '#aaeeff' : '#ffaaee') : '#fff';
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawGround() {
    var th = getBgTheme();
    var gy = GROUND_Y();
    ctx.fillStyle = th.ground[0];
    ctx.fillRect(0, gy, W, H - gy);
    ctx.beginPath();
    ctx.moveTo(0, gy);
    for (var x = 0; x <= W; x += 40) {
      ctx.lineTo(x, gy + Math.sin(x * 0.05) * 5 + Math.cos(x * 0.13) * 3);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fillStyle = th.ground[1];
    ctx.fill();

    for (var i = 0; i < iceBlocks.length; i++) {
      var b = iceBlocks[i];
      ctx.fillStyle = th.ice;
      ctx.strokeStyle = th.iceStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(b.x - b.w / 2, b.y - b.h, b.w, b.h, 6);
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawSling() {
    var sx = SLING_X(), sy = SLING_Y();
    ctx.strokeStyle = '#7c4b18'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy + 80); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.strokeStyle = '#a0612a'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(sx, sy + 10); ctx.lineTo(sx - 22, sy - 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy + 10); ctx.lineTo(sx + 22, sy - 28); ctx.stroke();
    ctx.strokeStyle = '#c8a23a'; ctx.lineWidth = 3;
    if (dragging) {
      ctx.beginPath(); ctx.moveTo(sx - 22, sy - 28); ctx.lineTo(dragX, dragY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 22, sy - 28); ctx.lineTo(dragX, dragY); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(sx - 22, sy - 28); ctx.lineTo(sx + 22, sy - 28); ctx.stroke();
    }
  }

  function drawFish(x, y, angle, scale, alpha, type) {
    if (scale === undefined) scale = 1;
    if (alpha === undefined) alpha = 1;
    if (type === undefined) type = 'normal';
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    var r = FISH_R;

    // colour scheme by type
    var bodyCol, strokeCol, tailCol, finCol;
    if (type === 'split' || type === 'sub') {
      bodyCol = '#b44fff'; strokeCol = '#7722bb'; tailCol = '#9933dd'; finCol = '#dd88ff';
    } else if (type === 'bomb') {
      bodyCol = '#cc2200'; strokeCol = '#660000'; tailCol = '#991100'; finCol = '#ff4422';
    } else {
      bodyCol = '#f5a623'; strokeCol = '#c47d0a'; tailCol = '#e8930f'; finCol = '#f5b83a';
    }

    ctx.fillStyle = bodyCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = tailCol;
    ctx.beginPath(); ctx.moveTo(-r * 1.4, 0); ctx.lineTo(-r * 2.2, -r * 0.9); ctx.lineTo(-r * 2.2, r * 0.9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = finCol;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.6); ctx.lineTo(r * 0.6, -r * 1.3); ctx.lineTo(r * 0.8, -r * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.1, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(r * 0.88, -r * 0.12, r * 0.14, 0, Math.PI * 2); ctx.fill();

    // split fish: purple sparkle aura
    if ((type === 'split') || (type === 'sub')) {
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(Date.now() * 0.015);
      ctx.strokeStyle = '#ee88ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 2.0, r * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // bomb fish: red glow + fuse
    if (type === 'bomb') {
      ctx.globalAlpha = 0.45 + 0.3 * Math.sin(Date.now() * 0.02);
      ctx.strokeStyle = '#ff4400';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 2.1, r * 1.2, 0, 0, Math.PI * 2); ctx.stroke();
      // fuse spark on tail
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffdd00';
      ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(-r * 2.2, 0, r * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  function drawPenguin(p) {
    if (!p.alive) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.bouncing) ctx.rotate(p.angle);
    if (p.runaway) {
      var airborne = p.jumpVy && p.jumpVy < 0;
      // stretch tall in air, squash wide on ground
      var sx = airborne ? 0.85 : 1.08;
      var sy = airborne ? 1.15 : 0.92;
      ctx.scale(sx, sy);
      ctx.rotate(Math.sin(p.waddleT * 2) * 0.18 * p.runDir);
    }
    // apply big scale
    ctx.scale(p.scale, p.scale);
    var w = PENGUIN_W, h = PENGUIN_H;
    if (!p.bouncing) {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(0, h / 2 + 4, w * 0.55, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    // body
    ctx.fillStyle = p.big ? '#2a2050' : '#1a1a2e';
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    // belly
    ctx.fillStyle = p.big ? '#fffbe6' : '#f0f8ff';
    ctx.beginPath(); ctx.ellipse(0, h * 0.06, w * 0.28, h * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    // head
    ctx.fillStyle = p.big ? '#2a2050' : '#1a1a2e';
    ctx.beginPath(); ctx.arc(0, -h / 2 + 14, 18, 0, Math.PI * 2); ctx.fill();
    // face patch
    ctx.fillStyle = p.big ? '#fffbe6' : '#f0f8ff';
    ctx.beginPath(); ctx.ellipse(0, -h / 2 + 16, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    // eyes
    var eyes = [[-5, -h / 2 + 10], [5, -h / 2 + 10]];
    for (var i = 0; i < eyes.length; i++) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(eyes[i][0], eyes[i][1], 5, 0, Math.PI * 2); ctx.fill();
      if (p.runaway) {
        // wide scared eyes – oval whites, tiny pupils
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(eyes[i][0], eyes[i][1], 6, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(eyes[i][0], eyes[i][1] + 2, 2, 0, Math.PI * 2); ctx.fill();
        // eyebrow slant (scared)
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        var bx = eyes[i][0], by = eyes[i][1] - 8;
        var slant = i === 0 ? 1 : -1;
        ctx.moveTo(bx - 4, by + slant * 2); ctx.lineTo(bx + 4, by - slant * 2); ctx.stroke();
      } else {
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(eyes[i][0] + 1, eyes[i][1] + 1, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // sweat drop when running away
    if (p.runaway) {
      ctx.fillStyle = 'rgba(100,180,255,0.85)';
      var sx = 14, sy = -h / 2 + 8;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 8);
      ctx.bezierCurveTo(sx + 5, sy - 2, sx + 5, sy + 5, sx, sy + 5);
      ctx.bezierCurveTo(sx - 5, sy + 5, sx - 5, sy - 2, sx, sy - 8);
      ctx.fill();
    }
    // beak
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.moveTo(-5, -h / 2 + 19); ctx.lineTo(0, -h / 2 + 26); ctx.lineTo(5, -h / 2 + 19); ctx.closePath(); ctx.fill();
    // feet
    if (!p.bouncing) {
      ctx.fillStyle = '#f5a623';
      if (p.runaway && p.jumpVy && p.jumpVy < -1) {
        // kick feet up while airborne – alternate legs
        var kick = Math.sin(p.waddleT * 3) * 0.7;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(-8, h / 2 - 10, 9, 5, 0.2 + kick, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, h / 2 - 10, 9, 5, -0.2 - kick, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.ellipse(-8, h / 2, 9, 5, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, h / 2, 9, 5, -0.2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // bomber hat + fuse
    if (p.bomber) {
      p.fuseT = (p.fuseT || 0) + 0.18;
      var hy = -h / 2 - 6;
      // bomb sphere
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, hy - 8, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // orange glow ring
      var grd = ctx.createRadialGradient(0, hy - 8, 4, 0, hy - 8, 13);
      grd.addColorStop(0, 'rgba(255,120,0,0.0)');
      grd.addColorStop(1, 'rgba(255,80,0,0.35)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, hy - 8, 13, 0, Math.PI * 2); ctx.fill();
      // fuse rope
      ctx.strokeStyle = '#cc8800';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(5, hy - 19);
      ctx.bezierCurveTo(14, hy - 30, 8, hy - 38, 12, hy - 44);
      ctx.stroke();
      // fuse spark (animated)
      var spark = Math.sin(p.fuseT * 3);
      ctx.fillStyle = 'rgba(255,' + Math.round(180 + spark * 75) + ',0,1)';
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(12 + spark * 2, hy - 44 + spark * 2, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // "BOOM!" label
      ctx.fillStyle = '#ff4400';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2.5;
      ctx.strokeText('BOOM!', 0, hy - 50);
      ctx.fillText('BOOM!', 0, hy - 50);
    }
    // crown for big penguins
    if (p.big) {
      var cy = -h / 2 + 2;
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-12, cy);
      ctx.lineTo(-12, cy - 14);
      ctx.lineTo(-6, cy - 8);
      ctx.lineTo(0, cy - 18);
      ctx.lineTo(6, cy - 8);
      ctx.lineTo(12, cy - 14);
      ctx.lineTo(12, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // crown gems
      ctx.fillStyle = '#ff4444';
      ctx.beginPath(); ctx.arc(0, cy - 16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#44aaff';
      ctx.beginPath(); ctx.arc(-9, cy - 11, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(9, cy - 11, 2, 0, Math.PI * 2); ctx.fill();
      // x3 label above crown
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold ' + Math.round(14 / p.scale) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3 / p.scale;
      ctx.strokeText('x3', 0, cy - 22);
      ctx.fillText('x3', 0, cy - 22);
    }
    // hit flash
    if (p.hitTimer > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (p.hitTimer / 12 * 0.6) + ')';
      ctx.beginPath(); ctx.ellipse(0, 0, w / 2 + 4, h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill();
      p.hitTimer--;
    }
    ctx.restore();
  }

  function drawTrail() {
    for (var fi = 0; fi < fishes.length; fi++) {
      var f = fishes[fi];
      if (!f.alive || f.trail.length < 2) continue;
      var trailCol = f.type === 'bomb' ? '#ff4400' : f.type === 'split' || f.type === 'sub' ? '#cc66ff' : '#f5a623';
      for (var i = 1; i < f.trail.length; i++) {
        var t = i / f.trail.length;
        ctx.globalAlpha = t * 0.5;
        ctx.strokeStyle = trailCol;
        ctx.lineWidth = t * 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.trail[i - 1].x, f.trail[i - 1].y);
        ctx.lineTo(f.trail[i].x, f.trail[i].y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawObstacles() {
    var t = Date.now() * 0.001;
    for (var oi = 0; oi < obstacles.length; oi++) {
      var ob = obstacles[oi];
      var flash = ob.flashTimer > 0;
      ctx.save();
      ctx.translate(ob.x, ob.y);

      if (ob.type === 'wall') {
        // ── Ice wall ────────────────────────────────────────────────────
        var hw = ob.w / 2, hh = ob.h / 2;
        // glow
        ctx.shadowColor = flash ? '#ffffff' : '#88ddff';
        ctx.shadowBlur = flash ? 28 : 12;
        // gradient fill
        var wg = ctx.createLinearGradient(-hw, -hh, hw, hh);
        wg.addColorStop(0, flash ? '#ffffff' : '#cceeff');
        wg.addColorStop(0.5, flash ? '#aaddff' : '#88ccee');
        wg.addColorStop(1, flash ? '#88ccff' : '#4499bb');
        ctx.fillStyle = wg;
        ctx.beginPath(); ctx.roundRect(-hw, -hh, ob.w, ob.h, 6); ctx.fill();
        // ice shine lines
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-hw + 4, -hh + 8); ctx.lineTo(-hw + 4, hh - 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-hw + 9, -hh + 12); ctx.lineTo(-hw + 9, hh - 12); ctx.stroke();
        // border
        ctx.strokeStyle = flash ? '#ffffff' : '#66bbdd';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-hw, -hh, ob.w, ob.h, 6); ctx.stroke();

      } else if (ob.type === 'bumper') {
        // ── Spinning bumper ─────────────────────────────────────────────
        ctx.rotate(ob.angle);
        var r2 = ob.r;
        // outer glow ring
        ctx.shadowColor = flash ? '#ffffff' : '#ffdd00';
        ctx.shadowBlur = flash ? 30 : 18;
        var bg2 = ctx.createRadialGradient(0, 0, r2 * 0.2, 0, 0, r2);
        bg2.addColorStop(0, flash ? '#ffffff' : '#ffe060');
        bg2.addColorStop(0.6, flash ? '#ffcc44' : '#ff9900');
        bg2.addColorStop(1, flash ? '#ff8800' : '#cc4400');
        ctx.fillStyle = bg2;
        ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.fill();
        // spinning spokes
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        for (var sp = 0; sp < 6; sp++) {
          var sa = sp * Math.PI / 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(sa) * r2 * 0.25, Math.sin(sa) * r2 * 0.25);
          ctx.lineTo(Math.cos(sa) * r2 * 0.88, Math.sin(sa) * r2 * 0.88);
          ctx.stroke();
        }
        // centre dot
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, r2 * 0.18, 0, Math.PI * 2); ctx.fill();
        // outer border
        ctx.strokeStyle = flash ? '#ffffff' : '#ffcc00';
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.stroke();

      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  function drawHUD() {
    // ── Score (top-left) ─────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(12, 10, 180, 46, 12); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⭐ ' + score, 24, 44);

    // ── Level (top-right) ────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.roundRect(W - 152, 10, 140, 46, 12); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Lvl ' + level, W - 24, 44);

    // ── Mute button (below level pill) ───────────────────────────────────
    ctx.fillStyle = musicOn ? 'rgba(0,180,80,0.55)' : 'rgba(180,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(W - 120, 64, 108, 34, 10); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(musicOn ? '🔊 Music  [K]' : '🔇 Muted  [K]', W - 66, 86);

    // ── Fish counter pill (top-center) ───────────────────────────────────
    var shown = Math.min(fishLeft, 8);
    var iconGap = 38;
    var pillW = Math.max(120, shown * iconGap + 40);
    var pillH = 60;
    var pillX = W / 2;
    var pillY = 14;

    var lowFish = fishLeft <= 2;
    ctx.shadowColor = lowFish ? '#ff4400' : '#f5a623';
    ctx.shadowBlur = lowFish ? 24 : 14;
    var pillGrad = ctx.createLinearGradient(pillX - pillW/2, pillY, pillX - pillW/2, pillY + pillH);
    if (lowFish) {
      pillGrad.addColorStop(0, '#7a1800'); pillGrad.addColorStop(1, '#3a0800');
    } else {
      pillGrad.addColorStop(0, '#7a3e00'); pillGrad.addColorStop(1, '#3a1a00');
    }
    ctx.fillStyle = pillGrad;
    ctx.beginPath(); ctx.roundRect(pillX - pillW/2, pillY, pillW, pillH, 16); ctx.fill();
    ctx.strokeStyle = lowFish ? '#ff6622' : '#f5a623';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.roundRect(pillX - pillW/2, pillY, pillW, pillH, 16); ctx.stroke();
    ctx.shadowBlur = 0;

    if (fishLeft === 0 && fishes.length === 0) {
      ctx.fillStyle = '#ff5500';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NO FISH LEFT!', pillX, pillY + pillH / 2 + 8);
    } else {
      // draw each queued fish icon with its type colour
      var iconStartX = pillX - (shown - 1) * iconGap / 2;
      for (var fi = 0; fi < shown; fi++) {
        var qType = fi < fishQueue.length ? fishQueue[fi] : 'normal';
        drawFish(iconStartX + fi * iconGap, pillY + pillH / 2, 0, 0.72, 1, qType);
      }
      if (fishLeft > 8) {
        ctx.fillStyle = '#ffe0a0';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('+' + (fishLeft - 8), pillX + (shown - 1) * iconGap / 2 + 26, pillY + pillH / 2 + 6);
      }
    }

    // ── Legend (bottom-left) ─────────────────────────────────────────────
    ctx.shadowBlur = 0;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('👑 = x3 points', 16, H - 16);
    ctx.fillStyle = 'rgba(255,180,0,0.85)';
    ctx.fillText('💣 = chain explosion', 16, H - 36);
    if (level >= 5) {
      ctx.fillStyle = 'rgba(150,220,255,0.9)';
      ctx.fillText('🟦 = ice wall (deflects)', 16, H - 56);
      ctx.fillStyle = 'rgba(255,220,50,0.9)';
      ctx.fillText('🟡 = bumper (bounces)', 16, H - 76);
    }
    if (level >= 10) {
      ctx.fillStyle = 'rgba(200,100,255,0.9)';
      ctx.fillText('🟣 = splits into 3', 16, H - 96);
      ctx.fillStyle = 'rgba(255,80,0,0.9)';
      ctx.fillText('🔴 = bomb fish (area)', 16, H - 116);
    }

    ctx.restore();
  }

  function drawGuide() {
    if (!dragging) return;
    var sx = SLING_X(), sy = SLING_Y() - 24;
    var speedScale = W / 1280;
    var dx = (sx - dragX) * 0.38 * speedScale;
    var dy = (sy - dragY) * 0.38 * speedScale;
    var px = sx, py = sy, pvx = dx, pvy = dy;
    var nextType = fishQueue.length > 0 ? fishQueue[0] : 'normal';

    // colours per fish type – solid bright core + glow colour
    var coreCol, glowCol;
    if (nextType === 'bomb') {
      coreCol = 'rgba(255,100,30,0.95)';
      glowCol = 'rgba(255,60,0,0.35)';
    } else if (nextType === 'split') {
      coreCol = 'rgba(220,130,255,0.95)';
      glowCol = 'rgba(180,80,255,0.35)';
    } else {
      coreCol = 'rgba(255,255,255,0.90)';
      glowCol = 'rgba(200,230,255,0.28)';
    }

    // simulate trajectory once, collect points
    var pts = [];
    var ppx = sx, ppy = sy, ppvx = dx, ppvy = dy;
    for (var i = 0; i < 90; i++) {
      ppvy += GRAVITY; ppvx *= 0.995; ppx += ppvx; ppy += ppvy;
      pts.push({ x: ppx, y: ppy });
      if (ppy > GROUND_Y()) break;
    }

    // pass 1 – thick soft glow
    ctx.save();
    ctx.shadowColor = nextType === 'bomb' ? '#ff4400' : nextType === 'split' ? '#cc44ff' : '#aaddff';
    ctx.shadowBlur = 14;
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = glowCol;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();

    // pass 2 – bright core line
    ctx.save();
    ctx.setLineDash([6, 10]);
    ctx.strokeStyle = coreCol;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (var i = 0; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();

    // pass 3 – bright dots at every 3rd point
    ctx.save();
    ctx.shadowColor = nextType === 'bomb' ? '#ff6600' : nextType === 'split' ? '#dd88ff' : '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = coreCol;
    for (var i = 2; i < pts.length; i += 5) {
      var r = 4.5 - (i / pts.length) * 2.5;
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, Math.max(1.5, r), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    ctx.setLineDash([]);
  }

  function drawMsg() {
    if (msgTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, msgTimer / 30);
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.roundRect(W / 2 - 290, H / 2 - 80, 580, 160, 20);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 38px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msgText, W / 2, H / 2 - 10);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#adf';
    if (state === 'win') ctx.fillText(level < LEVELS.length ? 'Click to continue' : 'Click to play again', W / 2, H / 2 + 30);
    if (state === 'dead') ctx.fillText('Click to retry', W / 2, H / 2 + 30);
    ctx.fillStyle = 'rgba(180,220,255,0.55)';
    ctx.font = '15px sans-serif';
    ctx.fillText('Press M for Main Menu', W / 2, H / 2 + 58);
    ctx.restore();
    msgTimer--;
  }

  // ── Menu penguin mascot ─────────────────────────────────────────────────
  function drawMenuPenguin(x, y, sc, crown) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    var w = PENGUIN_W, h = PENGUIN_H;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, h/2+5, w*0.6, 9, 0, 0, Math.PI*2); ctx.fill();
    // body
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
    // belly
    ctx.fillStyle = '#f0f8ff';
    ctx.beginPath(); ctx.ellipse(0, h*0.06, w*0.28, h*0.32, 0, 0, Math.PI*2); ctx.fill();
    // head
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(0, -h/2+14, 18, 0, Math.PI*2); ctx.fill();
    // face
    ctx.fillStyle = '#f0f8ff';
    ctx.beginPath(); ctx.ellipse(0, -h/2+16, 10, 12, 0, 0, Math.PI*2); ctx.fill();
    // eyes
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -h/2+10, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -h/2+10, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-4, -h/2+11, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6, -h/2+11, 2.5, 0, Math.PI*2); ctx.fill();
    // beak
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.moveTo(-5,-h/2+19); ctx.lineTo(0,-h/2+26); ctx.lineTo(5,-h/2+19); ctx.closePath(); ctx.fill();
    // feet
    ctx.fillStyle = '#f5a623';
    ctx.beginPath(); ctx.ellipse(-8, h/2, 9, 5, 0.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8, h/2, 9, 5, -0.2, 0, Math.PI*2); ctx.fill();
    // big crown
    if (crown) {
      var cy = -h/2+2;
      ctx.fillStyle = '#ffd700'; ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-16,cy); ctx.lineTo(-16,cy-18); ctx.lineTo(-8,cy-10);
      ctx.lineTo(0,cy-24); ctx.lineTo(8,cy-10); ctx.lineTo(16,cy-18); ctx.lineTo(16,cy);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ff4444'; ctx.beginPath(); ctx.arc(0,cy-21,4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#44aaff'; ctx.beginPath(); ctx.arc(-12,cy-14,3,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(12,cy-14,3,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  function drawMenu() {
    // animated arctic background
    var t = Date.now() * 0.001;
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#020c1a'); grad.addColorStop(0.6, '#0a2040'); grad.addColorStop(1, '#0d2a50');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    // aurora ribbons
    for (var a = 0; a < 4; a++) {
      ctx.save();
      ctx.globalAlpha = 0.14 + 0.06 * Math.sin(t * 0.7 + a * 1.3);
      var ag = ctx.createLinearGradient(0, H*0.05, 0, H*0.5);
      ag.addColorStop(0, 'rgba(0,255,180,0)');
      ag.addColorStop(0.4, 'rgba(0,200,255,1)');
      ag.addColorStop(1, 'rgba(0,100,200,0)');
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.ellipse(W*(0.15 + a*0.22 + 0.04*Math.sin(t*0.4+a)), H*0.28, W*0.13, H*0.24, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // stars
    ctx.save();
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      ctx.globalAlpha = 0.4 + 0.5 * Math.sin(s.t + t);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H * 0.7, s.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;

    // ground
    ctx.fillStyle = '#1a4a6e'; ctx.fillRect(0, H*0.82, W, H*0.18);
    ctx.fillStyle = '#1e5280';
    ctx.beginPath(); ctx.moveTo(0, H*0.82);
    for (var x = 0; x <= W; x += 40) ctx.lineTo(x, H*0.82 + Math.sin(x*0.05)*5 + Math.cos(x*0.13)*3);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

    if (menuPage === 'main') {
      // ── MAIN PAGE ──────────────────────────────────────────────────────

      // mascot penguins (left & right of title, gently bobbing)
      var bob = Math.sin(t * 1.4) * 8;
      drawMenuPenguin(W*0.26, H*0.38 + bob, 2.4, false);
      drawMenuPenguin(W*0.74, H*0.38 - bob, 2.4, true);

      // Title shadow + glow
      ctx.save();
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00ccff';
      ctx.shadowBlur = 32;
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold ' + Math.round(W * 0.072) + 'px sans-serif';
      ctx.fillText('KING PENGUIN', W/2, H*0.22);
      ctx.shadowBlur = 0;
      // white outline stroke
      ctx.strokeStyle = '#003355';
      ctx.lineWidth = 6;
      ctx.strokeText('KING PENGUIN', W/2, H*0.22);
      // fill white
      ctx.fillStyle = '#ffffff';
      ctx.fillText('KING PENGUIN', W/2, H*0.22);
      // subtitle
      ctx.font = 'bold ' + Math.round(W * 0.025) + 'px sans-serif';
      ctx.fillStyle = '#a0ddf0';
      ctx.letterSpacing = '4px';
      ctx.fillText('FISH LAUNCHER', W/2, H*0.22 + Math.round(W * 0.038));
      ctx.restore();

      // ── PLAY button ───────────────────────────────────────────────────
      var btnW = Math.min(280, W*0.32), btnH = 64, btnX = W/2, btnY = H*0.54;
      ctx.save();
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 20;
      var btnGrad = ctx.createLinearGradient(btnX-btnW/2, btnY-btnH/2, btnX-btnW/2, btnY+btnH/2);
      btnGrad.addColorStop(0, '#00cc88'); btnGrad.addColorStop(1, '#008855');
      ctx.fillStyle = btnGrad;
      ctx.beginPath(); ctx.roundRect(btnX-btnW/2, btnY-btnH/2, btnW, btnH, 16); ctx.fill();
      ctx.strokeStyle = '#00ffaa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(btnX-btnW/2, btnY-btnH/2, btnW, btnH, 16); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(btnH*0.44) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▶  PLAY', btnX, btnY + Math.round(btnH*0.18));
      ctx.restore();

      // ── SELECT LEVEL button ──────────────────────────────────────────
      var btn2Y = btnY + btnH + 22;
      ctx.save();
      ctx.shadowColor = '#4488ff';
      ctx.shadowBlur = 16;
      var b2Grad = ctx.createLinearGradient(btnX-btnW/2, btn2Y-btnH/2, btnX-btnW/2, btn2Y+btnH/2);
      b2Grad.addColorStop(0, '#2255cc'); b2Grad.addColorStop(1, '#112288');
      ctx.fillStyle = b2Grad;
      ctx.beginPath(); ctx.roundRect(btnX-btnW/2, btn2Y-btnH/2, btnW, btnH, 16); ctx.fill();
      ctx.strokeStyle = '#88aaff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(btnX-btnW/2, btn2Y-btnH/2, btnW, btnH, 16); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(btnH*0.38) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('☰  SELECT LEVEL', btnX, btn2Y + Math.round(btnH*0.18));
      ctx.restore();

      // ── Legend strip ─────────────────────────────────────────────────
      ctx.save();
      ctx.font = Math.round(W*0.016) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,220,255,0.7)';
      ctx.fillText('👑 = x3 points   💣 = chain explosion', W/2, H*0.83);
      ctx.fillStyle = 'rgba(200,150,255,0.7)';
      ctx.fillText('🟣 = splits into 3   🔴 = bomb fish  (from level 10)', W/2, H*0.87);
      ctx.fillStyle = 'rgba(150,220,255,0.65)';
      ctx.fillText('🟦 ice wall · 🟡 bumper  (from level 5)', W/2, H*0.91);
      ctx.restore();

      // ── Credit ───────────────────────────────────────────────────────
      ctx.save();
      ctx.font = Math.round(W*0.017) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,220,255,0.55)';
      ctx.fillText('Created by Nathan Forest', W/2, H - 18);
      ctx.restore();

    } else {
      // ── LEVEL SELECT PAGE ──────────────────────────────────────────────

      // title
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold ' + Math.round(W*0.042) + 'px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 18;
      ctx.fillText('SELECT LEVEL', W/2, H*0.11);
      ctx.shadowBlur = 0;
      ctx.restore();

      // grid: 5 cols × 4 rows
      var cols = 5, rows = 4;
      var gridW = Math.min(W*0.72, 600);
      var cellSize = Math.floor(gridW / cols);
      var cellH = Math.min(cellSize * 0.82, 80);
      var startX = W/2 - gridW/2;
      var startY = H*0.18;
      var gap = 12;

      for (var li = 0; li < LEVELS.length; li++) {
        var col = li % cols, row = Math.floor(li / cols);
        var cx3 = startX + col * (cellSize) + cellSize/2;
        var cy3 = startY + row * (cellH + gap) + cellH/2;
        var isHov = (menuHover === li);

        ctx.save();
        ctx.shadowColor = isHov ? '#00ffcc' : '#0044aa';
        ctx.shadowBlur = isHov ? 20 : 8;
        var cg = ctx.createLinearGradient(cx3-cellSize*0.42, cy3-cellH*0.48, cx3-cellSize*0.42, cy3+cellH*0.48);
        if (isHov) { cg.addColorStop(0,'#004488'); cg.addColorStop(1,'#002255'); }
        else        { cg.addColorStop(0,'#002244'); cg.addColorStop(1,'#001133'); }
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.roundRect(cx3-cellSize*0.42, cy3-cellH*0.48, cellSize*0.84, cellH*0.96, 12); ctx.fill();
        ctx.strokeStyle = isHov ? '#00ffcc' : '#1155aa';
        ctx.lineWidth = isHov ? 2.5 : 1.5;
        ctx.beginPath(); ctx.roundRect(cx3-cellSize*0.42, cy3-cellH*0.48, cellSize*0.84, cellH*0.96, 12); ctx.stroke();
        ctx.shadowBlur = 0;

        // level number
        ctx.fillStyle = isHov ? '#00ffcc' : '#aaddff';
        ctx.font = 'bold ' + Math.round(cellH*0.42) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(li + 1, cx3, cy3 + Math.round(cellH*0.17));

        // badges
        var ld2 = LEVELS[li];
        var hasBig = ld2.penguins.some(function(p){ return p.big; });
        var hasBomb = ld2.penguins.some(function(p){ return p.bomber; });
        ctx.font = Math.round(cellH*0.28) + 'px sans-serif';
        var badge = hasBomb ? '💣' : hasBig ? '👑' : '';
        if (badge) ctx.fillText(badge, cx3, cy3 - Math.round(cellH*0.24));

        ctx.restore();
      }

      // back button
      var bkW = Math.min(200, W*0.22), bkH = 50;
      var bkX = W/2, bkY = H*0.9;
      ctx.save();
      ctx.shadowColor = '#ff6644'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#aa3322';
      ctx.beginPath(); ctx.roundRect(bkX-bkW/2, bkY-bkH/2, bkW, bkH, 14); ctx.fill();
      ctx.strokeStyle = '#ff8866'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bkX-bkW/2, bkY-bkH/2, bkW, bkH, 14); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(bkH*0.42) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('← BACK', bkX, bkY + Math.round(bkH*0.18));
      ctx.restore();

      // credit bottom
      ctx.save();
      ctx.font = Math.round(W*0.015) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(180,220,255,0.45)';
      ctx.fillText('Created by Nathan Forest', W/2, H - 14);
      ctx.restore();
    }
  }

  function draw() {
    if (state === 'menu') { drawMenu(); return; }
    drawBg();
    drawGround();
    drawObstacles();
    drawSling();
    drawTrail();
    drawParticles();
    for (var i = 0; i < penguins.length; i++) drawPenguin(penguins[i]);
    // draw all active fish in flight
    for (var fi = 0; fi < fishes.length; fi++) {
      var f = fishes[fi];
      if (f.alive) drawFish(f.x, f.y, f.angle, 1, 1, f.type);
    }
    // next fish waiting on sling
    if (state === 'aim' && !dragging && fishLeft > 0) {
      var nextType = fishQueue.length > 0 ? fishQueue[0] : 'normal';
      drawFish(SLING_X(), SLING_Y() - 24, 0, 1, 1, nextType);
    }
    // fish being dragged
    if (dragging && fishLeft > 0) {
      var nextType = fishQueue.length > 0 ? fishQueue[0] : 'normal';
      drawFish(dragX, dragY, Math.atan2(SLING_Y() - 24 - dragY, SLING_X() - dragX) + Math.PI, 1, 1, nextType);
    }
    drawGuide();
    drawHUD();
    drawMsg();
  }

  function loop() { update(); draw(); requestAnimationFrame(loop); }

  function getPos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  function clamp(x, y) {
    var sx = SLING_X(), sy = SLING_Y();
    var dx = x - sx, dy = y - sy;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > MAX_DRAG) { return { x: sx + dx * MAX_DRAG / d, y: sy + dy * MAX_DRAG / d }; }
    return { x: x, y: y };
  }

  canvas.addEventListener('mousemove', function(e) {
    if (state === 'menu' && menuPage === 'levels') {
      var pt = getPos(e);
      var cols = 5;
      var gridW = Math.min(W*0.72, 600);
      var cellSize = Math.floor(gridW / cols);
      var cellH = Math.min(cellSize * 0.82, 80);
      var startX = W/2 - gridW/2;
      var startY = H*0.18;
      var gap = 12;
      menuHover = -1;
      for (var li = 0; li < LEVELS.length; li++) {
        var col = li % cols, row = Math.floor(li / cols);
        var cx3 = startX + col * cellSize + cellSize/2;
        var cy3 = startY + row * (cellH + gap) + cellH/2;
        if (pt.x >= cx3 - cellSize*0.42 && pt.x <= cx3 + cellSize*0.42 &&
            pt.y >= cy3 - cellH*0.48  && pt.y <= cy3 + cellH*0.48) {
          menuHover = li; break;
        }
      }
      return;
    }
    if (!dragging) return;
    var pt = getPos(e); var c = clamp(pt.x, pt.y);
    dragX = c.x; dragY = c.y;
  });

  canvas.addEventListener('mousedown', function(e) {
    initAudio();
    // mute button hit test (always active, top-right)
    var pt0 = getPos(e);
    if (state !== 'menu' && pt0.x >= W - 120 && pt0.x <= W - 12 && pt0.y >= 64 && pt0.y <= 98) {
      toggleMusic(); return;
    }
    if (state === 'menu') {
      var pt = getPos(e);
      if (menuPage === 'main') {
        var btnW = Math.min(280, W*0.32), btnH = 64, btnX = W/2;
        var btnY = H*0.54;
        var btn2Y = btnY + btnH + 22;
        // PLAY button
        if (pt.x >= btnX-btnW/2 && pt.x <= btnX+btnW/2 && pt.y >= btnY-btnH/2 && pt.y <= btnY+btnH/2) {
          level = 1; score = 0; menuPage = 'main'; state = 'aim'; initLevel(); return;
        }
        // SELECT LEVEL button
        if (pt.x >= btnX-btnW/2 && pt.x <= btnX+btnW/2 && pt.y >= btn2Y-btnH/2 && pt.y <= btn2Y+btnH/2) {
          menuPage = 'levels'; menuHover = -1; return;
        }
      } else {
        // level select: check cell hits
        var cols = 5;
        var gridW = Math.min(W*0.72, 600);
        var cellSize = Math.floor(gridW / cols);
        var cellH = Math.min(cellSize * 0.82, 80);
        var startX = W/2 - gridW/2;
        var startY = H*0.18;
        var gap = 12;
        for (var li = 0; li < LEVELS.length; li++) {
          var col = li % cols, row = Math.floor(li / cols);
          var cx3 = startX + col * cellSize + cellSize/2;
          var cy3 = startY + row * (cellH + gap) + cellH/2;
          if (pt.x >= cx3-cellSize*0.42 && pt.x <= cx3+cellSize*0.42 &&
              pt.y >= cy3-cellH*0.48    && pt.y <= cy3+cellH*0.48) {
            level = li + 1; score = 0; menuPage = 'main'; menuHover = -1; state = 'aim'; initLevel(); return;
          }
        }
        // BACK button
        var bkW = Math.min(200, W*0.22), bkH = 50, bkX = W/2, bkY = H*0.9;
        if (pt.x >= bkX-bkW/2 && pt.x <= bkX+bkW/2 && pt.y >= bkY-bkH/2 && pt.y <= bkY+bkH/2) {
          menuPage = 'main'; menuHover = -1; return;
        }
      }
      return;
    }
    if ((state === 'win' || state === 'dead') && msgTimer < 200) {
      if (state === 'win') { if (level >= LEVELS.length) { level = 1; score = 0; } else { level++; score += fishLeft * 200; } }
      initLevel(); return;
    }
    if (state !== 'aim' || fishLeft <= 0) return;
    var pt = getPos(e); var c = clamp(pt.x, pt.y);
    dragging = true; dragX = c.x; dragY = c.y;
  });

  canvas.addEventListener('mouseup', function(e) {
    if (!dragging) return;
    dragging = false;
    if (state !== 'aim') return;
    var sx = SLING_X(), sy = SLING_Y() - 24;
    var d = Math.sqrt((dragX - sx) * (dragX - sx) + (dragY - sy) * (dragY - sy));
    if (d < 10) return;
    launchFish(sx, sy, dragX, dragY);
    sfxLaunch();
    state = 'flying';
  });

  canvas.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.changedTouches[0]; canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY })); }, { passive: false });
  canvas.addEventListener('touchmove', function(e) { e.preventDefault(); var t = e.changedTouches[0]; canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY })); }, { passive: false });
  canvas.addEventListener('touchend', function(e) { e.preventDefault(); var t = e.changedTouches[0]; canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: t.clientX, clientY: t.clientY })); }, { passive: false });

  window.addEventListener('keydown', function(e) {
    if (e.key === 'm' || e.key === 'M') {
      state = 'menu'; menuPage = 'main'; menuHover = -1; dragging = false;
    }
    if (e.key === 'k' || e.key === 'K') {
      toggleMusic();
    }
  });

  makeStars();
  initLevel();
  loop();
}());
