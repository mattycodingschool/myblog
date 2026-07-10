/* center each dock glyph exactly: square viewBox around its measured bounds */
document.querySelectorAll('#links svg').forEach(s => {
  const b = s.getBBox();
  const sw = parseFloat(s.getAttribute('stroke-width')) || 0;
  const size = (Math.max(b.width, b.height) + sw) * 1.02;
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  s.setAttribute('viewBox', `${cx - size / 2} ${cy - size / 2} ${size} ${size}`);
});

/* hovering a dock tile washes the visuals in that brand's color;
   two stacked layers crossfade so tile-to-tile hops blend smoothly */
/* phones: render at 1x — 2x device pixels on a mobile GPU is what makes the
   whole site (home pattern and butterchurn both) drop frames */
const IS_MOBILE = matchMedia('(pointer: coarse)').matches;
const RENDER_DPR = IS_MOBILE ? 1 : Math.min(devicePixelRatio, 2);

const tintLayers = [...document.querySelectorAll('.tintlayer')];
let tintFront = 0, tintCurrent = null;
const TINTS = {
  instagram: 'radial-gradient(circle at 28% 110%, #feda75 0%, #fa7e1e 28%, #d62976 58%, #962fbf 85%, #4f5bd5 100%)',
  linkedin: 'linear-gradient(160deg, #0a66c2, #4d94e8 44%, #dce9fb 52%, #0a4faf 61%, #063a8a)',
  email: 'linear-gradient(180deg, #40d4e8, #19c9fb 50%, #7fe8d8)',
  info: 'linear-gradient(160deg, #f6d77b, #eda63b 42%, #fdeec2 52%, #b97a1e 64%, #8a5a12)',
};
document.querySelectorAll('#links a').forEach(a => {
  const g = TINTS[a.getAttribute('aria-label')];
  if (!g) return;
  const show = () => {
    if (tintCurrent !== g) {
      tintFront = 1 - tintFront;
      tintLayers[tintFront].style.background = g;
      tintCurrent = g;
    }
    tintLayers[tintFront].style.opacity = '0.95';
    tintLayers[1 - tintFront].style.opacity = '0';
  };
  const hide = () => {
    tintLayers.forEach(l => l.style.opacity = '0');
  };
  a.addEventListener('mouseenter', show);
  a.addEventListener('mouseleave', hide);
  a.addEventListener('touchstart', show, { passive: true });
  a.addEventListener('touchend', hide);
  a.addEventListener('touchcancel', hide);
});

/* email never appears in the HTML source; assembled here so scrapers parsing
   markup don't find it. click copies; mailto only as clipboard fallback */
{
  const emailA = document.querySelector('#links a[aria-label="email"]');
  const tip = document.createElement('span');
  tip.className = 'copytip';
  tip.textContent = 'copied';
  emailA.appendChild(tip);
  const addr = ['matty', 'berman'].join('_') + String.fromCharCode(64) + ['brown', 'edu'].join('.');
  let tipTimer;
  emailA.addEventListener('click', e => {
    e.preventDefault();
    const done = () => {
      tip.classList.add('show');
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => tip.classList.remove('show'), 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(done, () => { location.href = 'mailto:' + addr; });
    } else {
      location.href = 'mailto:' + addr;
    }
  });
}

/* the back rooms: the "i" tile dives through the pattern into three
   side-by-side screens, each running one of the starred milkdrop presets on
   a butterchurn canvas. moving between screens slides the card sideways and
   melts one preset into the next — no zooming once inside. */
const infoEl = document.getElementById('info');
const panels = [...infoEl.querySelectorAll('.panel')];
const LAST = panels.length - 1;
let infoOpen = false;
let calm = 0, calmT = 0;
let transBusy = false;

const bcCanvas = document.getElementById('bc');
const roomPresets = window.ROOM_PRESETS;

/* Tune the three info-room presets.
   The preset archive stores both compiled equations and their editable source,
   so keep the two representations in sync. */
{
  const firstPhase = (Math.random() * Math.PI * 2).toFixed(6);
  const first = roomPresets[0];
  first.frame_eqs_str = first.frame_eqs_str
    .replace("a['cthr']=0.9999;", "a['cthr']=2;")
    .replace(/a\['is_beat'\]=[^;]+;/, "a['is_beat']=0;")
    .replace("a['q21']=a['beat'];", "a['q21']=a['avg'];")
    .replace("a['atime']=(a['atime']+a['vol']);", "a['atime']=(a['atime']+Math.min(a['vol'], (1.15+div(Math.floor(randint(1000)),5000))));")
    .replace("Math.sin((a['atime']*0.006))", `Math.sin(((a['atime']*0.006)+${firstPhase}))`)
    .replace("Math.cos((a['atime']*0.00613828348))", `Math.cos(((a['atime']*0.00613828348)+${firstPhase}))`)
    .replace("Math.sin((a['atime']*0.00598593455))", `Math.sin(((a['atime']*0.00598593455)+${firstPhase}))`);
  first.presetParts.perFrame = first.presetParts.perFrame
    .replace('cthr=.9999;', 'cthr=2;')
    .replace(/is_beat = [^;]+;/, 'is_beat = 0;')
    .replace('q21 = beat;', 'q21 = avg;')
    .replace('atime=atime+vol;', 'atime=atime+min(vol,1.15+rand(1000)/5000);')
    .replace('q11=.4+sin(atime*.006        )*.4;', `q11=.4+sin(atime*.006+${firstPhase})*.4;`)
    .replace('q12=.4+cos(atime*.00613828348)*.4;', `q12=.4+cos(atime*.00613828348+${firstPhase})*.4;`)
    .replace('q13=.4+sin(atime*.00598593455)*.4;', `q13=.4+sin(atime*.00598593455+${firstPhase})*.4;`);

  const third = roomPresets[2];
  [third.baseVals, third.presetParts.baseVals].forEach(v => {
    v.warpanimspeed = 0.2;
  });
  third.frame_eqs_str = third.frame_eqs_str
    .replace("a['chng']=Math.sin((a['time']*0.5));", "a['chng']=Math.sin((a['time']*0.15));")
    .replace("a['v']=1;", "a['v']=0.35;");
  third.presetParts.perFrame = third.presetParts.perFrame
    .replace('chng=sin(time*.5);', 'chng=sin(time*.15);')
    .replace('v = 1;', 'v = .35;');
  third.shapes[0].frame_eqs_str = third.shapes[0].frame_eqs_str
    .replace("a['frametest']=equal(mod(a['frame'],2), 0);", "a['frametest']=1;")
    .replace("Math.tan((a['time']*3.14))", "Math.tan((a['time']*0.7))")
    .replace("Math.sin((a['time']*3.14))", "Math.sin((a['time']*0.7))");
  third.shapes[1].frame_eqs_str = third.shapes[1].frame_eqs_str
    .replace("a['frametest']=equal(mod(a['frame'],2), 0);", "a['frametest']=1;")
    .replace("Math.sin((a['time']*2))", "Math.sin((a['time']*0.45))")
    .replace("Math.tan((a['time']*2))", "Math.tan((a['time']*0.45))");
  third.presetParts.shapes[0].frame_eqs_str = third.presetParts.shapes[0].frame_eqs_str
    .replace('frametest = equal(frame%2, 0);', 'frametest = 1;')
    .replace('tan(time*3.14)', 'tan(time*.7)')
    .replace('sin(time*3.14)', 'sin(time*.7)');
  third.presetParts.shapes[1].frame_eqs_str = third.presetParts.shapes[1].frame_eqs_str
    .replace('frametest = equal(frame%2, 0);', 'frametest = 1;')
    .replace('sin(time*2)', 'sin(time*.45)')
    .replace('tan(time*2)', 'tan(time*.45)');
}

/* Exit through a fading, drifting version of slide 3 itself. This preserves
   the preset-melt texture without briefly exposing slide 1 on the way home. */
const room3ExitPreset = JSON.parse(JSON.stringify(roomPresets[2]));
[room3ExitPreset.baseVals, room3ExitPreset.presetParts.baseVals].forEach(v => {
  v.decay = 0.94;
  v.zoom = 1.018;
  v.echo_zoom = 1.025;
  v.warp = 0.08;
  v.warpanimspeed = 0.32;
  v.wave_a = 0.0002;
});
room3ExitPreset.shapes[2].init_eqs_str += " a['exit_grow']=0; a['exit_center']=0;";
room3ExitPreset.shapes[2].frame_eqs_str += " a['exit_grow']=Math.min(1,(a['exit_grow']+(1/(Math.max(a['fps'],1)*1.5)))); a['exit_center']=Math.min(1,(a['exit_center']+(1/(Math.max(a['fps'],1)*4)))); a['rad']=(((1-a['exit_grow'])*a['rad'])+a['exit_grow']); a['x']=(((1-a['exit_center'])*a['x'])+(a['exit_center']*0.5)); a['y']=(((1-a['exit_center'])*a['y'])+(a['exit_center']*0.5));";
room3ExitPreset.presetParts.shapes[2].init_eqs_str += '\nexit_grow=0; exit_center=0;';
room3ExitPreset.presetParts.shapes[2].frame_eqs_str += '\nexit_grow=min(1,exit_grow+1/max(fps,1)/1.5);\nexit_center=min(1,exit_center+1/max(fps,1)/4);\nrad=(1-exit_grow)*rad+exit_grow;\nx=(1-exit_center)*x+exit_center*.5;\ny=(1-exit_center)*y+exit_center*.5;';

/* silent fake groove: rendered once offline, looped into butterchurn's
   analyser — never routed to the speakers */
function makeGroove() {
  const bpm = 122, bars = 4, spb = 60 / bpm, len = bars * 4 * spb, sr = 44100;
  const off = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
  const out = off.createGain(); out.gain.value = 0.9; out.connect(off.destination);
  const noiseBuf = off.createBuffer(1, sr, sr);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const bassNotes = [55, 55, 65.4, 49];
  for (let b = 0; b < bars * 4; b++) {
    const t = b * spb;
    const o = off.createOscillator(), g = off.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    for (let h = 0; h < 2; h++) {
      const ht = t + spb / 2 * h + spb / 4;
      const n = off.createBufferSource(); n.buffer = noiseBuf;
      const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
      const ng = off.createGain();
      ng.gain.setValueAtTime(0.25, ht);
      ng.gain.exponentialRampToValueAtTime(0.001, ht + 0.05);
      n.connect(hp); hp.connect(ng); ng.connect(out); n.start(ht); n.stop(ht + 0.06);
    }
    const bo = off.createOscillator(), bg = off.createGain();
    bo.type = 'sawtooth';
    bo.frequency.value = bassNotes[Math.floor(b / 4) % 4];
    bg.gain.setValueAtTime(0.28, t + spb / 2);
    bg.gain.exponentialRampToValueAtTime(0.001, t + spb);
    bo.connect(bg); bg.connect(out); bo.start(t + spb / 2); bo.stop(t + spb);
  }
  return off.startRendering();
}

let bcViz = null, bcActx = null, bcTap = null, bcActive = false, bcReady = null;
let bcPrimeFrames = 0;
function ensureBc() {
  if (bcReady) return bcReady;
  bcReady = (async () => {
    bcActx = new (window.AudioContext || window.webkitAudioContext)();
    const BC = window.butterchurn.default || window.butterchurn;
    sizeBcCanvas();
    bcViz = BC.createVisualizer(bcActx, bcCanvas, {
      width: bcCanvas.width, height: bcCanvas.height,
      pixelRatio: 1,
    });
    const buf = await makeGroove();
    const src = bcActx.createBufferSource();
    src.buffer = buf; src.loop = true;
    bcTap = bcActx.createGain();
    bcTap.gain.value = 0.12;
    src.connect(bcTap);
    bcViz.connectAudio(bcTap);
    src.start();
    /* warm every preset once during setup so mid-melt loadPreset calls hit
       the driver's shader cache instead of compiling at the click */
    const warm = p => { bcViz.loadPreset(p, 0); return new Promise(r => setTimeout(r, 120)); };
    await warm(roomPresets[1]);
    await warm(roomPresets[2]);
    await warm(room3ExitPreset);
    bcViz.loadPreset(roomPresets[0], 0);
    shownRoom = 0;
  })();
  return bcReady;
}
/* phones run room 1's sim on a square buffer center-cropped by the canvas
   (object-fit: cover); the other rooms — and desktop — keep the native
   aspect, since the square costs ~2x the pixels */
function sizeBcCanvas(room) {
  const w = bcCanvas.clientWidth, h = bcCanvas.clientHeight;
  const square = IS_MOBILE && room === 1;
  const S = Math.max(w, h);
  bcCanvas.width = (square ? S : w) * RENDER_DPR;
  bcCanvas.height = (square ? S : h) * RENDER_DPR;
}
function fitBufferTo(room) {
  const w = bcCanvas.width, h = bcCanvas.height;
  sizeBcCanvas(room);
  if (bcViz && (bcCanvas.width !== w || bcCanvas.height !== h)) {
    bcViz.setRendererSize(bcCanvas.width, bcCanvas.height);
  }
}
addEventListener('resize', () => {
  if (!bcViz) return;
  sizeBcCanvas(shownRoom);
  bcViz.setRendererSize(bcCanvas.width, bcCanvas.height);
});

/* pos renders, goal follows input; landing on a new screen melts the preset */
let pos = 0, goal = 0, shownRoom = -1;
const slideW = () => Math.max(innerWidth * 0.92, 420);
function meltTo(i) {
  if (!bcViz || i === shownRoom) return;
  fitBufferTo(i);
  bcViz.loadPreset(roomPresets[i], shownRoom < 0 ? 0 : 2.7);
  bcCanvas.classList.remove('room-0', 'room-1', 'room-2');
  bcCanvas.classList.add(`room-${i}`);
  shownRoom = i;
}

/* Build and compile the info visualizer immediately, as part of page startup:
   the cost hides inside the initial load instead of any interaction. The
   AudioContext starts suspended (browsers log a benign console note) and is
   resumed by the info click; the groove never reaches the speakers. */
ensureBc().catch(() => {});
/* debounced melt: hopping quickly through a slide melts straight to the one
   you land on, instead of stacking two preset loads mid-animation */
let meltQueued = -1, meltTimer = null;
function requestMelt(i) {
  if (i === shownRoom || i === meltQueued) return;
  meltQueued = i;
  clearTimeout(meltTimer);
  meltTimer = setTimeout(() => {
    const want = meltQueued;
    meltQueued = -1;
    if (infoOpen && want === Math.max(0, Math.min(LAST, Math.round(goal)))) meltTo(want);
  }, 220);
}
function updateScreens(dt) {
  pos += (goal - pos) * Math.min(1, dt * 5);
  const W = slideW();
  panels.forEach((p, i) => {
    const d = i - pos;
    const k = Math.min(1, Math.abs(d));
    p.style.transform = `translateX(calc(-50% + ${d * W}px)) rotateY(${-d * 8}deg) scale(${1 - 0.08 * k})`;
    const op = Math.max(0, 1 - Math.abs(d) * 1.15);
    p.style.opacity = op;
    p.style.visibility = op <= 0.01 ? 'hidden' : 'visible';
    p.style.pointerEvents = infoOpen && op > 0.6 ? 'auto' : 'none';
  });
  if (bcActive && infoOpen) requestMelt(Math.max(0, Math.min(LAST, Math.round(goal))));
}

/* Enter and leave through the single visualizer canvas. */
function openInfo() {
  if (transBusy || infoOpen) return;
  transBusy = true;
  document.body.classList.add('info-open');
  startHomeDive(1100);
  if (bcActx) bcActx.resume();
  ensureBc().then(() => {
    bcActx.resume();
    if (bcTap) {
      const t = bcActx.currentTime;
      bcTap.gain.cancelScheduledValues(t);
      bcTap.gain.setValueAtTime(0.12, t);
      bcTap.gain.linearRampToValueAtTime(1, t + 2.4);
    }
    if (shownRoom !== 0) {
      fitBufferTo(0);
      bcViz.loadPreset(roomPresets[0], 0);
      shownRoom = 0;
    }
    bcCanvas.classList.remove('room-1', 'room-2');
    bcCanvas.classList.add('room-0');
    bcActive = true;
    bcCanvas.classList.remove('closing');
    bcCanvas.classList.add('on', 'entering');
    setTimeout(() => bcCanvas.classList.remove('entering'), 1150);
    setTimeout(() => {
      pos = 0; goal = 0;
      infoOpen = true;
      calmT = 1;
      infoEl.classList.add('open');
      infoEl.setAttribute('aria-hidden', 'false');
      transBusy = false;
    }, 1100);
  });
}
function closeInfo() {
  if (transBusy || !infoOpen) return;
  transBusy = true;
  const returningFromLast = shownRoom === LAST;
  infoOpen = false;
  calmT = 0;
  infoEl.classList.remove('open');
  infoEl.setAttribute('aria-hidden', 'true');
  panels.forEach(p => p.style.pointerEvents = 'none');
  if (bcViz && returningFromLast) {
    bcViz.loadPreset(room3ExitPreset, 2.5);
    shownRoom = -1;
  } else if (bcViz && shownRoom !== 0) {
    fitBufferTo(0);
    bcViz.loadPreset(roomPresets[0], 1.8);
    shownRoom = 0;
  }
  const beginCanvasFade = () => {
    if (returningFromLast) bcCanvas.classList.add('quick-return');
    bcCanvas.classList.add('closing');
    bcCanvas.classList.remove('on');
  };
  if (returningFromLast) setTimeout(beginCanvasFade, 1500);
  else beginCanvasFade();
  /* the dock and title only fade back in once the dissolve has finished */
  setTimeout(() => {
    bcActive = false;
    bcCanvas.classList.remove('closing', 'quick-return');
    if (bcTap) {
      bcTap.gain.cancelScheduledValues(bcActx.currentTime);
      bcTap.gain.value = 0.12;
    }
    if (bcActx) bcActx.suspend();
    document.body.classList.remove('info-open');
    transBusy = false;
  }, returningFromLast ? 2500 : 2000);
}
document.querySelector('#links a[aria-label="info"]').addEventListener('click', e => {
  e.preventDefault();
  openInfo();
});
document.getElementById('infoClose').addEventListener('click', closeInfo);
addEventListener('keydown', e => {
  if (!infoOpen) return;
  if (e.key === 'Escape') closeInfo();
  if (e.key === 'ArrowRight') goal = Math.min(LAST, Math.round(goal) + 1);
  if (e.key === 'ArrowLeft') goal = Math.max(0, Math.round(goal) - 1);
});

let snapTimer = null;
infoEl.addEventListener('wheel', e => {
  e.preventDefault();
  if (!infoOpen) return;
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  goal = Math.max(-0.12, Math.min(LAST + 0.12, goal + d * 0.0022));
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => { goal = Math.max(0, Math.min(LAST, Math.round(goal))); }, 160);
}, { passive: false });
let dragX = null, dragMoved = 0, dragStartedRoom = 0;
infoEl.addEventListener('pointerdown', e => {
  dragX = e.clientX;
  dragMoved = 0;
  dragStartedRoom = Math.round(goal);
  infoEl.classList.add('dragging');
});
addEventListener('pointermove', e => {
  if (dragX === null || !infoOpen) return;
  dragMoved += Math.abs(dragX - e.clientX);
  goal = Math.max(-0.12, Math.min(LAST + 0.12, goal + (dragX - e.clientX) / slideW() * 1.4));
  dragX = e.clientX;
});
addEventListener('pointerup', () => {
  if (dragX === null) return;
  const shouldGoHome = infoOpen && dragStartedRoom === LAST && goal > LAST + 0.075;
  dragX = null;
  infoEl.classList.remove('dragging');
  if (shouldGoHome) {
    goal = LAST;
    closeInfo();
    return;
  }
  goal = Math.max(0, Math.min(LAST, Math.round(goal)));
});
/* a click (not a drag) advances a screen; clicking past the last one heads home */
infoEl.addEventListener('click', e => {
  if (!infoOpen || dragMoved > 8) return;
  if (e.target.closest('.homebtn') || e.target.closest('#infoClose')) return;
  const next = Math.round(goal) + 1;
  if (next > LAST) closeInfo();
  else goal = next;
});

/* like the email: the birthdate never appears as a literal, so the age
   can't be scraped from the source */
{
  const y = 2e3 + 0b111, mo = 0x3, d = 0b1101;
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) age--;
  document.querySelectorAll('.age').forEach(el => el.textContent = age);
}

const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });

const SIM = 1024; /* internal square sim buffer, like milkdrop's canvas */

function shader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s);
  return s;
}
function program(vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.bindAttribLocation(p, 1, 'aCol');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw gl.getProgramInfoLog(p);
  return p;
}

const QUAD_VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

/* ---- warp: the preset's warp_1..warp_18, verbatim math ---- */
const WARP_FS = `#version 300 es
precision highp float;
uniform sampler2D uMain;
uniform float uQ27;
uniform float uQ32;
uniform mat2 uQa;      /* rotation by rott */
uniform float uRand;   /* rand_frame */
in vec2 vUv;
out vec4 frag;

/* stand-in for milkdrop's noise_lq texture */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
vec3 noiseTex(vec2 uv) {
  vec2 p = floor(uv * 256.0);
  return vec3(hash(p), hash(p + 19.7), hash(p + 41.3));
}

void main() {
  vec2 uv = vUv;
  vec2 uv1 = vec2(uv.x - 0.5, uv.y - 0.5);

  vec3 noiseVal = 0.03 * noiseTex(uv * 0.3 + 0.01 * uRand);
  vec3 Feedback = textureLod(uMain, uv, 5.0).rgb;

  vec2 zz = uv1 * ${SIM}.0 * 0.015 * uQ27;
  zz = uQa * zz;

  vec2 h1 = clamp(tan(zz), -20.0, 20.0);

  uv += h1 * (1.0 / ${SIM}.0) * 8.0;

  vec3 crisp = texture(uMain, uv).rgb;

  frag = vec4(uQ32 * crisp + noiseVal * (1.0 - Feedback) - 0.02, 1.0);
}`;

/* ---- warp B: the back room's pattern — woven caustics with a slow inward pull
   (hand-rolled stand-in until a second .milk preset gets converted) ---- */
/* ---- comp: the preset's comp_1..comp_10 ---- */
const COMP_FS = `#version 300 es
precision highp float;
uniform sampler2D uMain;
uniform float uAspect;   /* canvas w/h — keeps the square sim square (cover) */
uniform vec2 uCursor;    /* smoothed, asymptotically-bounded cursor in uv space */
uniform float uDive;     /* 0..1..0 while flying through the pattern */
in vec2 vUv;
out vec4 frag;
void main() {
  vec2 uv = vUv;
  /* drag the central glow toward the cursor; gaussian falloff keeps the pull
     localized to the middle so the edges stay put */
  vec2 d = uv - vec2(0.5);
  float fall = exp(-dot(d, d) * 12.0);
  uv -= 0.16 * (uCursor - vec2(0.5)) * fall;
  /* dive: zoom hard into the center so it reads as flying through the ball */
  uv = 0.5 + (uv - 0.5) * (1.0 - 0.96 * pow(uDive, 1.5));
  if (uAspect >= 1.0) uv.y = (uv.y - 0.5) / uAspect + 0.5;
  else                uv.x = (uv.x - 0.5) * uAspect + 0.5;
  vec3 crisp = texture(uMain, uv).rgb;
  vec3 blur = textureLod(uMain, uv - 0.01 * crisp.xy, 5.0).rgb;
  vec3 ret1 = crisp + clamp(3.0 * (blur - vec3(0.13, 0.12, 0.10)), 0.0, 1.0);
  /* dive: dim the whole frame as the zoom deepens so full-zoom is never blinding;
     darkest exactly at the pattern swap, then it brightens back out */
  frag = vec4(ret1 * 1.3 * (1.0 - uDive), 1.0);
}`;

/* ---- shapes: milkdrop n-gon fan with center/edge colors ---- */
const SHAPE_VS = `#version 300 es
in vec2 aPos;
in vec4 aCol;
out vec4 vCol;
void main() {
  vCol = aCol;
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}`;
const SHAPE_FS = `#version 300 es
precision highp float;
in vec4 vCol;
out vec4 frag;
void main() { frag = vCol; }`;

const warpProg = program(QUAD_VS, WARP_FS);
const compProg = program(QUAD_VS, COMP_FS);
const shapeProg = program(SHAPE_VS, SHAPE_FS);

/* fullscreen quad */
const quadVao = gl.createVertexArray();
gl.bindVertexArray(quadVao);
const qb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, qb);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

/* shape buffer (dynamic fan: capacity for up to an SEG-gon — center + SEG+1 rim verts) */
const SEG = 60;
const shapeVao = gl.createVertexArray();
gl.bindVertexArray(shapeVao);
const sb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, sb);
gl.bufferData(gl.ARRAY_BUFFER, (SEG + 2) * 6 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);

/* ping-pong feedback targets (mipmapped so GetBlur1 works) */
function target() {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, SIM, SIM, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); /* bTexWrap=1 */
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.generateMipmap(gl.TEXTURE_2D);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb };
}
let A = target(), B = target();

/* wave 0 line strip (the preset's main feeder) */
const WAVE_N = 480;
const waveVao = gl.createVertexArray();
gl.bindVertexArray(waveVao);
const wb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, wb);
gl.bufferData(gl.ARRAY_BUFFER, WAVE_N * 6 * 4, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
const waveData = new Float32Array(WAVE_N * 6);

/* the "music" is fully hardcoded: a deterministic groove, no audio anywhere */

/* ---------- synthesized "music" + the preset's per_frame vars ---------- */
const BPM = 118;
let avg = 0, peak = 0, t0 = 0, index = 0, p1 = 0, p2 = 0;
function hsv(h, s, v) {
  h = (h % 1 + 1) % 1;
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), tt = v * (1 - (1 - f) * s);
  const r = [v, q, p, p, tt, v][i % 6];
  const g = [tt, v, v, q, p, p][i % 6];
  const b = [p, p, tt, v, v, q][i % 6];
  return [r, g, b];
}
/* two counter-rotating wheels. hue 0=red 0.16=yellow 0.33=green 0.66=blue 0.83=purple.
   balls climb (red→yellow→green→blue→purple); middle descends (purple→…→red). */
/* per-load randomization so no two reloads open on the exact same frame */
const SEED = Math.random();
const T0 = SEED * 137;      /* random point in the motion cycle → shapes start elsewhere */
let hueBalls = SEED;        /* random palette rotation; both wheels shift together */
let hueMid = SEED + 0.5;    /* keeps the counter-rotating 0.5 offset */
function ballCol(offset) { return hsv(hueBalls + offset, 0.85, 1.0); }
function midCol(offset) { return hsv(hueMid + offset, 0.85, 1.0); }
let rott = Math.PI, rotFrom = Math.PI, rotTo = Math.PI, rotElapsed = 1e9, q27 = 6.5;
let lastBeatPhase = 0;

function frac(x) { return x - Math.floor(x); }

function music(t, dt, fps) {
  /* a fake groove: sharp pulse each beat, wobbling section energy */
  /* hardcoded groove: kicks on the beat, offbeat mids, ticking highs, slow swells */
  const phase = t * BPM / 60;
  const kick = Math.exp(-6.0 * frac(phase));
  const off  = Math.exp(-7.0 * frac(phase + 0.5));
  const tick = Math.exp(-9.0 * frac(phase * 2));
  const swell = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.067 + 1.3);
  const bass = 0.45 + 0.75 * kick + 0.18 * swell;
  const mid  = 0.45 + 0.40 * off + 0.12 * Math.sin(t * 1.9 + 0.8) + 0.08 * swell;
  const treb = 0.40 + 0.28 * tick + 0.12 * swell;

  const dec_med = Math.pow(0.9, 30 / fps);
  const dec_slow = Math.pow(0.99, 30 / fps);
  const beat = Math.max(bass, mid, treb);
  avg = avg * dec_slow + beat * (1 - dec_slow);
  const newBar = frac(phase) < lastBeatPhase;
  lastBeatPhase = frac(phase);
  const is_beat = (newBar && beat > 0.3 && t > t0 + 0.2) ? 1 : 0;
  if (is_beat) t0 = t;
  peak = is_beat ? beat : peak * dec_med;
  index = (index + is_beat) % 8;

  /* tile frequency (zoom) held constant — no per-beat zoom in/out */
  q27 = 6.5;

  /* every 8 beats, half-turn the grid (disco ↔ square, skipping the spiral stops).
     ease-out over 6 beats then hold still for the last 2, so each turn fully
     settles before the next begins */
  if (is_beat && index === 0) { rotFrom = rotTo; rotTo += Math.PI; rotElapsed = 0; }
  rotElapsed += dt;
  const rp = Math.min(rotElapsed / (6 * 60 / BPM), 1.0);
  rott = rotFrom + (rotTo - rotFrom) * (1.0 - (1.0 - rp) * (1.0 - rp));

  return {
    q20: avg, q21: beat, q22: peak, q24: is_beat,
    q26: bass + mid + treb, q28: t * 0.35, q32: 0.996,
  };
}

/* ---------- shape drawing (fan: center color -> edge color) ---------- */
const shapeData = new Float32Array((SEG + 2) * 6);
function drawShape(x, y, rad, c1, a1, c2, a2, sides) {
  /* regular n-gon fan (center color → edge color); sides sets the shape */
  shapeData.set([x, y, c1[0], c1[1], c1[2], a1], 0);
  for (let k = 0; k <= sides; k++) {
    const ang = (k / sides) * Math.PI * 2 + Math.PI / 4;
    shapeData.set([x + Math.cos(ang) * rad, y + Math.sin(ang) * rad, c2[0], c2[1], c2[2], a2], (k + 1) * 6);
  }
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, shapeData);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, sides + 2);
}

/* ---------- main loop ---------- */
function warpUniforms(p) {
  return {
    uMain: gl.getUniformLocation(p, 'uMain'),
    uQ27: gl.getUniformLocation(p, 'uQ27'),
    uQ32: gl.getUniformLocation(p, 'uQ32'),
    uQa: gl.getUniformLocation(p, 'uQa'),
    uRand: gl.getUniformLocation(p, 'uRand'),
  };
}
const uWarp = warpUniforms(warpProg);
const uComp = { uMain: gl.getUniformLocation(compProg, 'uMain'), uAspect: gl.getUniformLocation(compProg, 'uAspect'), uCursor: gl.getUniformLocation(compProg, 'uCursor'), uDive: gl.getUniformLocation(compProg, 'uDive') };

/* cursor tracking: target from pointer, smoothed each frame; uv space has y up */
let mouseTX = 0.5, mouseTY = 0.5, curX = 0.5, curY = 0.5;
addEventListener('pointermove', e => {
  mouseTX = e.clientX / innerWidth;
  mouseTY = 1 - e.clientY / innerHeight;
});

function resize() {
  canvas.width = innerWidth * RENDER_DPR;
  canvas.height = innerHeight * RENDER_DPR;
}
resize();
addEventListener('resize', resize);

let last = performance.now();
let start = last;
let homeDiveStart = -1, homeDiveDuration = 1;

function startHomeDive(durationMs) {
  homeDiveStart = performance.now();
  homeDiveDuration = durationMs;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
  const fps = 1 / dt;
  last = now;
  const t = (now - start) / 1000 + T0;

  const q = music(t, dt, fps);
  /* while the back room is open the groove settles: hues drift slower,
     the wave and feeders dim, beat flashes pause */
  calm += (calmT - calm) * Math.min(1, dt * 2.5);
  if (infoOpen || calm > 0.01) updateScreens(dt);
  if (bcActive && bcViz) bcViz.render();
  else if (bcViz && bcPrimeFrames < 20) {
    bcViz.render();
    bcPrimeFrames++;
  }
  /* the back room canvas is opaque once fully open: skip the entire home
     sim below while it's covered, so only one full-screen sim ever runs.
     it resumes the moment closeInfo flips infoOpen off, under the fade */
  if (infoOpen && !transBusy) return;
  hueBalls -= dt * 0.05 * (1 - 0.7 * calm); /* reverse: red→purple→blue→green→yellow */
  hueMid += dt * 0.05 * (1 - 0.7 * calm);   /* blue→purple→red→yellow→green */

  /* --- warp pass: B <- warp(A) --- */
  gl.bindFramebuffer(gl.FRAMEBUFFER, B.fb);
  gl.viewport(0, 0, SIM, SIM);
  gl.disable(gl.BLEND);
  gl.useProgram(warpProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, A.tex);
  gl.uniform1i(uWarp.uMain, 0);
  gl.uniform1f(uWarp.uQ27, q27);
  gl.uniform1f(uWarp.uQ32, q.q32);
  const c = Math.cos(rott), s = Math.sin(rott);
  gl.uniformMatrix2fv(uWarp.uQa, false, [c, s, -s, c]);
  gl.uniform1f(uWarp.uRand, Math.floor(t * 60) % 1024);
  gl.bindVertexArray(quadVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  /* --- shapes drawn into the feedback buffer --- */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(shapeProg);
  gl.bindVertexArray(shapeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, sb);

  /* wave 0: the preset's blocky waveform scribble — additive, the real "FULL" feeder */
  {
    let v1 = 0, v2 = 0;
    let xi = 0, yi = 0;
    const wa = Math.min(q.q21 * 0.2, 0.26) * (1 - 0.75 * calm);
    const wc = midCol(0.0); /* the counter-rotating middle color */
    for (let i = 0; i < WAVE_N; i++) {
      /* fake stereo waveform: carrier + wobble + a kick-coupled thump */
      v1 = 0.45 * Math.sin(i * 0.19 + t * 5.3) * Math.sin(i * 0.011 + t * 0.7)
         + 0.25 * q.q21 * Math.sin(i * 0.05 + t * 2.2);
      v2 = 0.45 * Math.sin(i * 0.23 + t * 4.1 + 2.0) * Math.sin(i * 0.013 + t * 0.9)
         + 0.25 * q.q21 * Math.sin(i * 0.045 + t * 1.8 + 1.0);
      const k1 = (i * 100 / WAVE_N * 4.8) % 8 | 0;
      const k2 = k1 === 0 ? 1 : 0;
      xi = k2 ? v1 : xi;
      yi = k2 ? yi : v2;
      waveData.set([0.5 + xi / 2, 0.5 + yi / 2, 0.4 + 0.6 * wc[0], 0.4 + 0.6 * wc[1], 0.4 + 0.6 * wc[2], wa], i * 6);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE); /* bAdditive=1 */
    gl.useProgram(shapeProg);
    gl.bindVertexArray(waveVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, wb);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, waveData);
    gl.drawArrays(gl.LINE_STRIP, 0, WAVE_N);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindVertexArray(shapeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
  }

  /* shape 0: the wandering teal square — held on-canvas so the loop is always fed */
  const trel = t / 2 + q.q20;
  const sx = 0.5 + 0.42 * Math.sin(trel * 2);
  const sy = 0.5 + 0.42 * Math.cos(trel * 1.3 + q.q28 / 3);
  const a0 = Math.min(q.q26 / 4 + 0.2, 1) * (1 - 0.6 * calm);
  const c1 = ballCol(0.0);
  drawShape(sx, sy, 0.048958, c1, a0,
    [0.45 + 0.55 * c1[0], 0.45 + 0.55 * c1[1], 0.45 + 0.55 * c1[2]], a0, 4);

  /* second feeder ~1/3 around the wheel so it's a different color from the first */
  const sx2 = 0.5 + 0.42 * Math.sin(trel * 1.4 + Math.PI);
  const sy2 = 0.5 + 0.42 * Math.cos(trel * 0.9 + 1.1);
  const c2 = ballCol(0.83);
  drawShape(sx2, sy2, 0.042, c2, a0 * 0.8,
    [0.4 + 0.6 * c2[0], 0.4 + 0.6 * c2[1], 0.4 + 0.6 * c2[2]], a0 * 0.8, 60);

  /* shape 2: the beat flash, random spot + random hue */
  if (q.q24 && calm < 0.5) {
    const a2 = Math.min(q.q21 / 2, 0.9);
    drawShape(
      Math.random(), Math.random(),
      a2 * a2 / 3,
      ballCol(0.15 + Math.random() * 0.7), a2,
      [1, 1, 1], 0, 60
    );
  }
  gl.disable(gl.BLEND);

  /* rebuild mips so GetBlur1 (textureLod) sees fresh data */
  gl.bindTexture(gl.TEXTURE_2D, B.tex);
  gl.generateMipmap(gl.TEXTURE_2D);

  /* --- comp pass to screen --- */
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(compProg);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, B.tex);
  gl.uniform1i(uComp.uMain, 0);
  gl.uniform1f(uComp.uAspect, canvas.width / canvas.height);
  let homeDive = 0;
  if (homeDiveStart >= 0) {
    const p = Math.min(1, (now - homeDiveStart) / homeDiveDuration);
    homeDive = Math.sin(Math.PI * p);
    if (p >= 1) homeDiveStart = -1;
  }
  gl.uniform1f(uComp.uDive, homeDive);
  /* ease toward the cursor, then squash the offset through tanh so it saturates
     near the edges — the middle leans over but never stretches all the way out */
  curX += (mouseTX - curX) * Math.min(1, dt * 8);
  curY += (mouseTY - curY) * Math.min(1, dt * 8);
  gl.uniform2f(uComp.uCursor,
    0.5 + 0.5 * Math.tanh(2.2 * (curX - 0.5)),
    0.5 + 0.5 * Math.tanh(2.2 * (curY - 0.5)));
  gl.bindVertexArray(quadVao);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  /* swap */
  const tmp = A; A = B; B = tmp;
}
requestAnimationFrame(frame);
