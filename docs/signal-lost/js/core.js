'use strict';
/* SIGNAL LOST — a Content Warning fangame by s0meTh1ng.MP4 / Henry & Claude.AI
   core: helpers, renderer, the SIGNAL texture shader, colliders, input, sounds */
const VERSION = 'V1.0.0';
const LS = { getItem(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, setItem(k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };
const GH_URL = 'https://gmeyer301.github.io/Chad/signal-lost/';
const SIG_X = 1000; // the Signal World is built 1000m east of the safe world
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { const d = b - a; return Math.atan2(Math.sin(d), Math.cos(d)); };
const fmt = n => Math.round(n).toLocaleString('en-US');
const areaOf = x => x > SIG_X / 2 ? 'sig' : 'surf';
function seeded(seed) { let s = seed >>> 0; const r = () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; r.range = (a, b) => a + r() * (b - a); r.int = (a, b) => Math.floor(r.range(a, b + 1)); r.pick = a => a[Math.floor(r() * a.length)]; r.chance = p => r() < p; return r; }

/* ---------------- renderer ---------------- */
const W = { t: 0 };
function initRenderer() {
  W.r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  W.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  document.getElementById('game').appendChild(W.r.domElement);
  W.s = new THREE.Scene();
  W.cam = new THREE.PerspectiveCamera(74, 16 / 9, 0.05, 320);
  W.cam.rotation.order = 'YXZ';
  W.s.add(W.cam);
  W.amb = new THREE.AmbientLight(0xffffff, 0.45); W.s.add(W.amb);
  W.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a4a32, 0.65); W.s.add(W.hemi);
  W.sun = new THREE.DirectionalLight(0xfff1d6, 0.85); W.sun.position.set(30, 60, 20); W.s.add(W.sun);
  W.flash = new THREE.SpotLight(0xfff4dc, 0, 26, 0.5, 0.5, 1.3);
  W.flash.position.set(0.25, -0.15, 0.1); W.cam.add(W.flash); W.flash.target.position.set(0, -0.05, -1); W.cam.add(W.flash.target);
  W.s.fog = new THREE.FogExp2(0x9fd0ff, 0.008);
  window.addEventListener('resize', resize); resize();
}
function resize() {
  const el = document.getElementById('game'); const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
  W.r.setSize(w, h, false); W.cam.aspect = w / h; W.cam.updateProjectionMatrix();
}
function setLook(area) {
  if (area === 'sig') {
    W.s.background = new THREE.Color(0x040807); W.s.fog.color.set(0x050908); W.s.fog.density = 0.07;
    W.amb.color.set(0x9fe6d0); W.amb.intensity = 0.33; W.hemi.intensity = 0.22; W.sun.intensity = 0;
  } else {
    W.s.background = new THREE.Color(0x8fc9f5); W.s.fog.color.set(0x9fd0ff); W.s.fog.density = 0.008;
    W.amb.color.set(0xffffff); W.amb.intensity = 0.45; W.hemi.intensity = 0.65; W.sun.intensity = 0.85;
  }
}

/* ---------------- the SIGNAL texture ----------------
   Everything in the Signal World (maps, monsters, artifacts) uses this:
   scanlines that crawl, flickering static, glitch bands and a teal signal tint.
   The safe world (spawn) and players use normal materials. */
const SIG = { uTime: { value: 0 } };
const _mc = new Map();
function sigMat(color, o = {}) {
  const key = 's' + color + '|' + (o.em || 0) + '|' + (o.side || 0) + '|' + (o.op || 1) + '|' + (o.map ? o.map.uuid : '');
  if (!o.fresh && _mc.has(key)) return _mc.get(key);
  const m = new THREE.MeshLambertMaterial({ color, emissive: o.em || 0, side: o.side || THREE.FrontSide, transparent: !!o.op, opacity: o.op || 1, map: o.map || null });
  m.onBeforeCompile = sh => {
    sh.uniforms.uTime = SIG.uTime;
    sh.vertexShader = 'varying vec3 vSigP;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  vec4 sigp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  sigp = instanceMatrix * sigp;
  #endif
  vSigP = (modelMatrix * sigp).xyz;`);
    sh.fragmentShader = 'uniform float uTime;\nvarying vec3 vSigP;\nfloat sgh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
  {
    vec3 sp = vSigP; float t = uTime;
    vec3 c = gl_FragColor.rgb;
    float lum = dot(c, vec3(0.3,0.59,0.11));
    float scan = 0.8 + 0.2*sin(sp.y*36.0 - t*6.0 + sp.x*0.5);
    float nz = sgh(floor(sp.xz*7.0 + sp.y*6.0) + floor(t*16.0));
    float band = step(0.982, sgh(vec2(floor(sp.y*2.2 + t*1.4), floor(t*7.0))));
    float roll = smoothstep(0.0, 0.08, abs(fract(sp.y*0.12 - t*0.25) - 0.5));
    c *= scan * (0.75 + 0.25*roll);
    c += (nz - 0.5) * 0.09 * (0.25 + lum);
    c = mix(c, vec3(c.g*0.85, c.g*1.05 + c.r*0.1, c.b*1.1 + c.g*0.1), 0.22);
    c += band * vec3(0.06, 0.2, 0.17) * (0.4 + lum);
    gl_FragColor.rgb = c;
  }`);
  };
  m.customProgramCacheKey = () => 'signal';
  if (!o.fresh) _mc.set(key, m);
  return m;
}
function mat(color, o = {}) {
  const key = 'n' + color + '|' + (o.em || 0) + '|' + (o.side || 0) + '|' + (o.op || 1);
  if (_mc.has(key)) return _mc.get(key);
  const m = new THREE.MeshLambertMaterial({ color, emissive: o.em || 0, side: o.side || THREE.FrontSide, transparent: !!o.op, opacity: o.op || 1 });
  _mc.set(key, m); return m;
}
function basic(color, o = {}) { return new THREE.MeshBasicMaterial(Object.assign({ color }, o)); }

/* instanced boxes / cylinders (keeps draw calls low on iPads) */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);
class Batch {
  constructor() { this.m = new Map(); }
  add(geo, mt, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
    const k = geo.uuid + mt.uuid; if (!this.m.has(k)) this.m.set(k, { geo, mt, list: [] });
    this.m.get(k).list.push([x, y, z, sx, sy, sz, ry, rx, rz]);
  }
  box(mt, x, y, z, sx, sy, sz, ry, rx, rz) { this.add(UNIT_BOX, mt, x, y, z, sx, sy, sz, ry, rx, rz); }
  cyl(mt, x, y, z, r, h, ry, rx, rz) { this.add(UNIT_CYL, mt, x, y, z, r * 2, h, r * 2, ry, rx, rz); }
  build(group) {
    const o = new THREE.Object3D();
    this.m.forEach(({ geo, mt, list }) => {
      const im = new THREE.InstancedMesh(geo, mt, list.length);
      list.forEach((a, i) => { o.position.set(a[0], a[1], a[2]); o.scale.set(a[3], a[4], a[5]); o.rotation.set(a[7] || 0, a[6] || 0, a[8] || 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
      im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; group.add(im);
    });
    this.m.clear();
  }
}

/* ---------------- colliders (2D boxes, per area) ---------------- */
const COLS = { surf: mkCols(), sig: mkCols() };
function mkCols() { return { list: [], grid: new Map() }; }
function addCol(area, x0, z0, x1, z1, h = 4, tag) {
  const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, on: true, tag };
  const C = COLS[area]; C.list.push(b);
  for (let gx = Math.floor(b.x0 / 4); gx <= Math.floor(b.x1 / 4); gx++) for (let gz = Math.floor(b.z0 / 4); gz <= Math.floor(b.z1 / 4); gz++) {
    const k = gx * 100003 + gz; let a = C.grid.get(k); if (!a) C.grid.set(k, a = []); a.push(b);
  }
  return b;
}
function clearCols(area) { COLS[area] = mkCols(); }
const _seen = new Set();
// pushes a circle out of walls. returns hit speed info via flags
function collide(area, p, rad) {
  const C = COLS[area]; let hit = false; _seen.clear();
  const gx0 = Math.floor((p.x - rad) / 4), gx1 = Math.floor((p.x + rad) / 4), gz0 = Math.floor((p.z - rad) / 4), gz1 = Math.floor((p.z + rad) / 4);
  for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
    const a = C.grid.get(gx * 100003 + gz); if (!a) continue;
    for (let i = 0; i < a.length; i++) {
      const b = a[i]; if (!b.on || _seen.has(b)) continue; _seen.add(b);
      if ((p.y || 0) > b.h - 0.05) continue; // standing on top of it
      if (p.x + rad < b.x0 || p.x - rad > b.x1 || p.z + rad < b.z0 || p.z - rad > b.z1) continue;
      const cx = clamp(p.x, b.x0, b.x1), cz = clamp(p.z, b.z0, b.z1);
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 > rad * rad) continue;
      if (d2 < 1e-8) {
        const l = p.x - b.x0, r = b.x1 - p.x, t = p.z - b.z0, bt = b.z1 - p.z, m = Math.min(l, r, t, bt);
        if (m === l) p.x = b.x0 - rad; else if (m === r) p.x = b.x1 + rad; else if (m === t) p.z = b.z0 - rad; else p.z = b.z1 + rad;
      } else { const d = Math.sqrt(d2); p.x = cx + dx / d * rad; p.z = cz + dz / d * rad; }
      hit = true;
    }
  }
  return hit;
}
// height of the tallest walkable top under a point (tables, counters, crates you jumped on)
function groundAt(area, x, z, y) {
  const C = COLS[area]; const a = C.grid.get(Math.floor(x / 4) * 100003 + Math.floor(z / 4)); let g = 0;
  if (a) for (const b of a) if (b.on && b.h <= 1.3 && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y >= b.h - 0.3) g = Math.max(g, b.h);
  return g;
}

/* ---------------- input ---------------- */
const IN = { k: {}, pr: new Set(), dx: 0, dy: 0, jx: 0, jy: 0, sens: +(LS.getItem('sl_sens') || 1), locked: false };
const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
addEventListener('keydown', e => {
  if (typing()) { if (e.code === 'Escape' || e.code === 'Enter') { if (window.UI && UI.onTypingKey) UI.onTypingKey(e); } return; }
  if (!IN.k[e.code]) IN.pr.add(e.code); IN.k[e.code] = true;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { IN.k[e.code] = false; });
addEventListener('blur', () => { IN.k = {}; });
addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('.panel,.btn,button,input,#chatbox,#pad')) return; IN.pr.add('M' + e.button); IN.k['M' + e.button] = true; });
addEventListener('mouseup', e => { IN.k['M' + e.button] = false; });
addEventListener('contextmenu', e => { if (!e.target.closest || !e.target.closest('input')) e.preventDefault(); });
addEventListener('wheel', e => { if (IN.locked) IN.pr.add(e.deltaY > 0 ? 'WheelDown' : 'WheelUp'); }, { passive: true });
document.addEventListener('pointerlockchange', () => { IN.locked = document.pointerLockElement === W.r.domElement; });
addEventListener('mousemove', e => { if (IN.locked) { IN.dx += e.movementX; IN.dy += e.movementY; } });
const pressed = c => IN.pr.has(c);
const held = c => !!IN.k[c];
function lockPointer() { if (IS_TOUCH) return; try { const p = W.r.domElement.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function unlockPointer() { try { document.exitPointerLock(); } catch (e) { } }
const IS_TOUCH = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);

/* touch: left joystick, drag right side to look, buttons */
function initTouch() {
  if (!IS_TOUCH) return;
  document.body.classList.add('touch');
  const joy = document.getElementById('joy'), knob = document.getElementById('jk');
  let jid = null, jcx = 0, jcy = 0, lid = null, lx = 0, ly = 0;
  const game = document.getElementById('game');
  joy.addEventListener('touchstart', e => { const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); jcx = r.left + r.width / 2; jcy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
  game.addEventListener('touchstart', e => { for (const t of e.changedTouches) if (lid === null && t.clientX > innerWidth * 0.35) { lid = t.identifier; lx = t.clientX; ly = t.clientY; } }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === jid) { const r = joy.getBoundingClientRect(); let dx = (t.clientX - jcx) / (r.width / 2), dy = (t.clientY - jcy) / (r.height / 2); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } IN.jx = dx; IN.jy = dy; knob.style.left = (30 + dx * 30) + '%'; knob.style.top = (30 + dy * 30) + '%'; }
      else if (t.identifier === lid) { IN.dx += (t.clientX - lx) * 2.2; IN.dy += (t.clientY - ly) * 2.2; lx = t.clientX; ly = t.clientY; }
    }
  }, { passive: true });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; IN.jx = IN.jy = 0; knob.style.left = knob.style.top = '30%'; } if (t.identifier === lid) lid = null; } };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  document.querySelectorAll('#pad [data-k]').forEach(b => {
    const k = b.dataset.k, tog = b.dataset.tog;
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); if (tog) { IN.k[k] = !IN.k[k]; b.classList.toggle('on', IN.k[k]); } else { IN.k[k] = true; } IN.pr.add(k); b.classList.add('dn'); }, { passive: false });
    b.addEventListener('touchend', e => { e.preventDefault(); if (!tog) IN.k[k] = false; b.classList.remove('dn'); }, { passive: false });
  });
}

/* ---------------- sound (all synthesized, no files) ---------------- */
const AU = { ctx: null, master: null, amb: null };
function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.6; AU.master.connect(AU.ctx.destination);
    const len = AU.ctx.sampleRate * 2, buf = AU.ctx.createBuffer(1, len, AU.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = buf;
    // ambient static + drone for the Signal World
    const src = AU.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = AU.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.6;
    AU.amb = AU.ctx.createGain(); AU.amb.gain.value = 0; src.connect(f); f.connect(AU.amb); AU.amb.connect(AU.master); src.start();
    const o = AU.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 46; const lf = AU.ctx.createBiquadFilter(); lf.type = 'lowpass'; lf.frequency.value = 140;
    AU.drone = AU.ctx.createGain(); AU.drone.gain.value = 0; o.connect(lf); lf.connect(AU.drone); AU.drone.connect(AU.master); o.start();
  } catch (e) { AU.ctx = null; }
}
function setAmbience(area) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime;
  AU.amb.gain.setTargetAtTime(area === 'sig' ? 0.025 : 0, t, 0.5); AU.drone.gain.setTargetAtTime(area === 'sig' ? 0.07 : 0, t, 0.8);
}
function tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime + delay;
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, freq = 1000, q = 1, type = 'bandpass', delay = 0, slideTo = 0) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime + delay;
  const s = AU.ctx.createBufferSource(); s.buffer = AU.noise; const f = AU.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = AU.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
}
// v = volume 0..1 (callers pass distance falloff)
function sfx(n, v = 1) {
  if (!AU.ctx || v < 0.02) return;
  switch (n) {
    case 'step': noise(0.07, 0.05 * v, 500, 1.5); break;
    case 'jump': noise(0.1, 0.06 * v, 800); break;
    case 'land': noise(0.12, 0.1 * v, 300); break;
    case 'beep': tone(880, 0.08, 'square', 0.08 * v); break;
    case 'recOn': tone(1320, 0.07, 'square', 0.08 * v); tone(1760, 0.09, 'square', 0.08 * v, 0, 0.08); break;
    case 'recOff': tone(1320, 0.07, 'square', 0.08 * v); tone(880, 0.12, 'square', 0.08 * v, 0, 0.08); break;
    case 'click': tone(1800, 0.03, 'square', 0.05 * v); break;
    case 'static': noise(0.6, 0.18 * v, 3000, 0.3); break;
    case 'squawk': for (let i = 0; i < 3; i++) tone(1400 + i * 120, 0.12, 'sawtooth', 0.15 * v, 900, i * 0.14); break;
    case 'roar': tone(110, 1.0, 'sawtooth', 0.25 * v, -60); noise(1.0, 0.25 * v, 300, 0.7); break;
    case 'growl': tone(70, 0.6, 'sawtooth', 0.2 * v, 20); noise(0.6, 0.12 * v, 200, 2); break;
    case 'explode': noise(1.4, 0.55 * v, 400, 0.4, 'lowpass', 0, 60); tone(60, 0.9, 'sine', 0.4 * v, -30); break;
    case 'fire': noise(0.5, 0.22 * v, 900, 0.6, 'bandpass', 0, 300); break;
    case 'shoot': noise(0.08, 0.25 * v, 2200, 0.8); tone(300, 0.06, 'square', 0.1 * v, -200); break;
    case 'bite': noise(0.15, 0.3 * v, 700, 2); tone(160, 0.15, 'square', 0.2 * v, -80); break;
    case 'hurt': tone(220, 0.25, 'sawtooth', 0.2 * v, -120); noise(0.2, 0.15 * v, 900); break;
    case 'grab': noise(0.3, 0.25 * v, 500, 1, 'bandpass', 0, 1500); tone(90, 0.3, 'square', 0.15 * v, 50); break;
    case 'whoosh': noise(0.6, 0.25 * v, 600, 0.8, 'bandpass', 0, 2600); break;
    case 'vac': noise(0.5, 0.12 * v, 1200, 0.5); break;
    case 'gobble': for (let i = 0; i < 5; i++) tone(260 + Math.random() * 120, 0.07, 'square', 0.14 * v, -60, i * 0.07); break;
    case 'tongue': tone(500, 0.25, 'sine', 0.2 * v, -300); break;
    case 'bsod': tone(523, 0.5, 'sine', 0.2); tone(659, 0.5, 'sine', 0.2, 0, 0.05); tone(784, 0.8, 'sine', 0.2, 0, 0.1); noise(0.8, 0.3, 4000, 0.3); break;
    case 'gate': tone(55, 3, 'sawtooth', 0.25, 10); noise(3, 0.2, 200, 0.5); break;
    case 'sniff': for (let i = 0; i < 3; i++) noise(0.18, 0.4 * v, 1800, 1.2, 'bandpass', i * 0.22); break;
    case 'stomp': tone(45, 0.4, 'sine', 0.4 * v, -20); noise(0.3, 0.2 * v, 150); break;
    case 'pickup': tone(660, 0.07, 'triangle', 0.15 * v); tone(990, 0.1, 'triangle', 0.15 * v, 0, 0.06); break;
    case 'buy': tone(880, 0.08, 'triangle', 0.18); tone(1320, 0.14, 'triangle', 0.18, 0, 0.08); break;
    case 'horn': tone(392, 0.9, 'sawtooth', 0.3 * v); tone(396, 0.9, 'sawtooth', 0.3 * v); break;
    case 'lever': tone(200, 0.15, 'square', 0.15); noise(0.2, 0.2, 400); break;
    case 'bell': tone(660, 1.4, 'sine', 0.2); tone(990, 1.2, 'sine', 0.1, 0, 0.02); break;
    case 'ding': tone(1046, 0.25, 'triangle', 0.2); tone(1568, 0.4, 'triangle', 0.2, 0, 0.12); break;
    case 'zap': noise(0.25, 0.3 * v, 5000, 1); tone(1600, 0.2, 'square', 0.12 * v, -1200); break;
    case 'heal': tone(523, 0.12, 'triangle', 0.15); tone(784, 0.2, 'triangle', 0.15, 0, 0.1); break;
    case 'beepbeep': tone(1200, 0.06, 'square', 0.1 * v); tone(1200, 0.06, 'square', 0.1 * v, 0, 0.12); break;
    case 'flap': noise(0.12, 0.12 * v, 700, 1); break;
    case 'death': tone(300, 1.2, 'sawtooth', 0.25, -250); noise(1.2, 0.2, 2000, 0.4); break;
  }
}

/* ---------------- text sprites (name tags, bubbles) ---------------- */
function textSprite(text, color = '#fff', bg = null, scale = 0.4) {
  const c = document.createElement('canvas'), x = c.getContext('2d'); const fs = 44;
  x.font = 'bold ' + fs + 'px "Courier New", monospace'; const w = Math.ceil(x.measureText(text).width) + 28;
  c.width = w; c.height = fs + 22; x.font = 'bold ' + fs + 'px "Courier New", monospace';
  if (bg) { x.fillStyle = bg; x.beginPath(); if (x.roundRect) x.roundRect(0, 0, w, c.height, 14); else x.rect(0, 0, w, c.height); x.fill(); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.75)';
  if (!bg) x.strokeText(text, w / 2, c.height / 2 + 2); x.fillStyle = color; x.fillText(text, w / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true }));
  s.scale.set(scale * w / c.height, scale, 1); return s;
}
