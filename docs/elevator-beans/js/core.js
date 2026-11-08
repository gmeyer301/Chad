'use strict';
/* Elevator Beans: core helpers, save data, sound, bean + hat models */
const VER = '1.0.0';
const GH_URL = 'https://gmeyer301.github.io/Chad/elevator-beans/';
const MAX_PLAYERS = 5;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const uidGen = () => Math.random().toString(36).slice(2, 8);
const MY_UID = uidGen();
function angDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

/* ---------- hats ---------- */
const HATS = [
  { id: 'none', name: 'No Hat', how: 'Always yours' },
  { id: 'beanie', name: 'Scout Beanie', how: 'Always yours' },
  { id: 'hardhat', name: "Mover's Hard Hat", how: 'Survive Moving Day', floor: 'moving' },
  { id: 'firehelm', name: 'Fire Helmet', how: 'Survive Bean Rescue', floor: 'fire' },
  { id: 'fishbowl', name: 'Fishbowl Helmet', how: 'Survive Deep Sea Salvage', floor: 'sea' },
  { id: 'guardcap', name: 'Night Guard Cap', how: 'Survive Night Shift', floor: 'mall' },
  { id: 'potato', name: 'Potato Hat', how: 'Survive Hot Potato Volcano', floor: 'potato' },
  { id: 'bag', name: 'Grocery Bag', how: 'Survive Cart Chaos', floor: 'grocery' },
  { id: 'chef', name: 'Giant Chef Hat', how: "Survive the Giant's Kitchen", floor: 'kitchen' },
  { id: 'banana', name: 'Banana Hat', how: 'Survive the Jungle Floor', floor: 'jungle' },
  { id: 'halo', name: 'Void Halo', how: 'Survive The Void', floor: 'void' },
  { id: 'tophat', name: 'Heist Top Hat', how: 'Survive the Casino Heist', floor: 'heist' },
  { id: 'crown', name: 'Elevator Crown', how: 'Reach floor 10 in one run' },
];
const HAT_BY = Object.fromEntries(HATS.map(h => [h.id, h]));
const COLORS = ['#f2a541', '#e4572e', '#3fa7d6', '#59cd90', '#ee6c9b', '#a77dc2', '#f3d34a', '#8d6e63', '#e9e4da', '#4a5a8c'];

/* ---------- save data ---------- */
const SAVE_KEY = 'elevator-beans-v1';
function defProfile() {
  return { name: 'Bean' + Math.floor(Math.random() * 900 + 100), color: Math.floor(Math.random() * 8), hat: 'beanie',
    hats: { none: 1, beanie: 1 }, stats: { runs: 0, floors: 0, best: 0, ko: 0, hats: 0 }, beat: {}, run: null,
    sens: 1, invert: 0, gfx: 1, vol: 0.7, seenHelp: 0, skin: Math.floor(Math.random() * 8) };
}
let P = defProfile();
function loadProfile(obj) {
  const d = defProfile(); const p = Object.assign(d, obj || {});
  p.hats = Object.assign(d.hats, (obj && obj.hats) || {}); p.stats = Object.assign(defProfile().stats, (obj && obj.stats) || {});
  p.beat = (obj && obj.beat) || {}; if (!HAT_BY[p.hat] || !p.hats[p.hat]) p.hat = 'beanie';
  p.color = clamp(p.color | 0, 0, COLORS.length - 1); p.skin = clamp(p.skin | 0, 0, SKINS.length - 1); p.name = String(p.name || 'Bean').slice(0, 16);
  return p;
}
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s) P = loadProfile(s); } catch (e) { }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) { } }
function exportSave() { return 'EB1.' + btoa(unescape(encodeURIComponent(JSON.stringify(P)))); }
function importSave(code) {
  code = String(code || '').trim(); if (!code.startsWith('EB1.')) throw new Error('That is not an Elevator Beans save code. It should start with EB1.');
  let o; try { o = JSON.parse(decodeURIComponent(escape(atob(code.slice(4))))); } catch (e) { throw new Error('That save code is broken or cut off. Copy the whole thing and try again.'); }
  P = loadProfile(o); save();
}

/* ---------- sound (all made in code) ---------- */
const AU = { ctx: null, master: null };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); AU.master = AU.ctx.createGain(); AU.master.gain.value = P.vol; AU.master.connect(AU.ctx.destination); } catch (e) { }
}
function setVol(v) { P.vol = v; if (AU.master) AU.master.gain.value = v; }
function tone(f, d, type = 'sine', v = .2, slide = 0, delay = 0) {
  if (!AU.ctx) return; const t = AU.ctx.currentTime + delay;
  const o = AU.ctx.createOscillator(), g = AU.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + .03);
}
let _nbuf = null;
function noise(d, v = .3, freq = 900, delay = 0) {
  if (!AU.ctx) return; const c = AU.ctx;
  if (!_nbuf) { _nbuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const a = _nbuf.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = _nbuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = freq; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t); s.stop(t + d + .03);
}
const SFX = {
  jump: () => tone(260, .16, 'square', .05, 260),
  land: () => noise(.08, .12, 400),
  grab: () => tone(180, .08, 'triangle', .1, -40),
  pick: () => { tone(520, .08, 'square', .06); tone(780, .1, 'square', .05, 0, .06); },
  drop: () => tone(300, .12, 'triangle', .1, -120),
  score: () => { tone(660, .1, 'square', .07); tone(880, .1, 'square', .07, 0, .08); tone(1320, .2, 'square', .06, 0, .16); },
  ding: () => { tone(1318, 1.1, 'sine', .22); tone(1046, 1.4, 'sine', .2, 0, .32); },
  hurt: () => { tone(220, .25, 'sawtooth', .1, -120); noise(.15, .15, 600); },
  ko: () => { tone(400, .6, 'sawtooth', .12, -340); noise(.4, .2, 500); },
  boom: () => { noise(1.1, .55, 260); tone(90, .8, 'sine', .4, -50); },
  door: () => noise(.9, .07, 220),
  spray: () => noise(.12, .05, 2400),
  hat: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, 'triangle', .12, 0, i * .09)); tone(1568, .8, 'sine', .1, 0, .4); },
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, .4, 'triangle', .12, 0, i * .22)),
  click: () => tone(900, .04, 'square', .04),
  bite: () => { tone(140, .2, 'sawtooth', .14, -60); noise(.12, .2, 1200); },
  slam: () => { noise(.5, .5, 180); tone(60, .5, 'sine', .4, -20); },
  splash: () => noise(.3, .15, 1600),
  tick: () => tone(1200, .03, 'square', .03),
};
function rideMusic() { // a little bossa elevator tune, about 4 seconds
  if (!AU.ctx) return;
  const ch = [[261.6, 329.6, 392, 493.9], [220, 261.6, 329.6, 392], [293.7, 349.2, 440, 523.3], [196, 246.9, 293.7, 349.2]];
  ch.forEach((c, i) => { c.forEach(f => tone(f, .95, 'triangle', .035, 0, i * 1)); tone(c[0] / 2, .5, 'sine', .08, 0, i * 1); tone(c[0] / 2 * 1.5, .3, 'sine', .05, 0, i * 1 + .5); tone(c[3] * 2, .25, 'sine', .03, 0, i * 1 + .75); });
}

/* ---------- materials ---------- */
const MATS = {};
function mat(c, o) { const k = c + (o ? JSON.stringify(o) : ''); return MATS[k] || (MATS[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); }
const GEO = {};
function geo(k, f) { return GEO[k] || (GEO[k] = f()); }
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
function mesh(g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; }

/* ---------- hats ---------- */
function buildHat(id) {
  const g = new THREE.Group(); const S = (r, w = 14, h = 10, ps, pl, ts, tl) => new THREE.SphereGeometry(r, w, h, ps, pl, ts, tl);
  switch (id) {
    case 'beanie': {
      g.add(mesh(geo('beanieT', () => S(.47, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat('#c8553d'), 0, -.2, 0, 1, .8, 1));
      g.add(mesh(geo('beanieR', () => new THREE.TorusGeometry(.45, .07, 8, 20)), mat('#f2e3c6'), 0, -.2, 0).rotateX(Math.PI / 2));
      g.add(mesh(geo('pom', () => S(.13)), mat('#f2e3c6'), 0, .2, 0)); break;
    }
    case 'hardhat': {
      g.add(mesh(geo('hhT', () => S(.48, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat('#f5c518'), 0, -.15, 0));
      g.add(mesh(geo('hhB', () => new THREE.CylinderGeometry(.62, .62, .05, 20)), mat('#f5c518'), 0, -.14, .06));
      g.add(mesh(BOX(), mat('#e0ae0b'), 0, .2, 0, .12, .1, .8)); break;
    }
    case 'firehelm': {
      g.add(mesh(geo('hhT', () => S(.48, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat('#d62828'), 0, -.15, 0));
      g.add(mesh(geo('fhB', () => new THREE.CylinderGeometry(.6, .7, .05, 20)), mat('#b11f1f'), 0, -.14, -.12));
      g.add(mesh(BOX(), mat('#f6c344'), 0, .02, .46, .3, .3, .05)); break;
    }
    case 'fishbowl': {
      g.add(mesh(geo('bowl', () => S(.72, 18, 14)), mat('#bfe9ff', { transparent: true, opacity: .28 }), 0, -.45, 0));
      g.add(mesh(geo('bowlR', () => new THREE.TorusGeometry(.5, .06, 8, 20)), mat('#8a8f99'), 0, -.95, 0).rotateX(Math.PI / 2));
      g.add(mesh(geo('bub', () => S(.06, 8, 6)), mat('#ffffff', { transparent: true, opacity: .6 }), .3, .1, .3));
      g.add(mesh(geo('bub', () => S(.06, 8, 6)), mat('#ffffff', { transparent: true, opacity: .6 }), .38, .3, .2)); break;
    }
    case 'guardcap': {
      g.add(mesh(geo('capT', () => new THREE.CylinderGeometry(.45, .47, .28, 18)), mat('#1f2a44'), 0, -.02, 0));
      g.add(mesh(geo('capV', () => new THREE.CylinderGeometry(.34, .34, .04, 16, 1, false, -Math.PI / 2, Math.PI)), mat('#111827'), 0, -.12, .32));
      g.add(mesh(BOX(), mat('#e9c46a'), 0, .02, .46, .14, .14, .03)); break;
    }
    case 'potato': {
      const pg = geo('potato', () => { const q = new THREE.IcosahedronGeometry(.42, 1); const p = q.attributes.position; const R = rng(7); for (let i = 0; i < p.count; i++) { const k = .85 + R() * .3; p.setXYZ(i, p.getX(i) * k * 1.25, p.getY(i) * k * .8, p.getZ(i) * k); } q.computeVertexNormals(); return q; });
      const pm = mesh(pg, mat('#b5835a', { flatShading: true }), 0, .08, 0); pm.rotation.z = .3; g.add(pm);
      [[.2, .2, .3], [-.25, .1, .3], [.05, .3, -.2]].forEach(([x, y, z]) => g.add(mesh(geo('pspot', () => S(.05, 6, 4)), mat('#6b4a2b'), x, y, z)));
      g.add(mesh(geo('sprout', () => new THREE.ConeGeometry(.05, .2, 6)), mat('#7cb342'), .1, .42, 0)); break;
    }
    case 'bag': {
      g.add(mesh(BOX(), mat('#c79a5b'), 0, .12, 0, .78, .55, .62));
      g.add(mesh(BOX(), mat('#a87d42'), 0, .4, 0, .8, .04, .64));
      g.add(mesh(geo('leaf', () => S(.2, 8, 6)), mat('#6abf4b'), .15, .48, .05, 1, 1.4, .5));
      g.add(mesh(geo('baguette', () => new THREE.CylinderGeometry(.08, .08, .7, 8)), mat('#e1b56c'), -.18, .55, 0).rotateZ(.4)); break;
    }
    case 'chef': {
      g.add(mesh(geo('chefB', () => new THREE.CylinderGeometry(.42, .44, .45, 18)), mat('#f8f8f4'), 0, .08, 0));
      g.add(mesh(geo('chefT', () => S(.55, 14, 10)), mat('#ffffff'), 0, .5, 0, 1, .65, 1)); break;
    }
    case 'banana': {
      const b = mesh(geo('ban', () => new THREE.TorusGeometry(.42, .13, 8, 16, Math.PI * .9)), mat('#f7d43e'), 0, -.05, 0); b.rotation.z = Math.PI * .05; g.add(b);
      g.add(mesh(BOX(), mat('#5b4321'), -.4, .02, 0, .08, .12, .08)); break;
    }
    case 'halo': {
      const h = mesh(geo('halo', () => new THREE.TorusGeometry(.38, .06, 8, 24)), mat('#c9b6ff', { emissive: '#7c5cff', emissiveIntensity: .9 }), 0, .35, 0); h.rotation.x = Math.PI / 2; h.userData.spin = 1; g.add(h); break;
    }
    case 'tophat': {
      g.add(mesh(geo('thB', () => new THREE.CylinderGeometry(.6, .6, .05, 20)), mat('#16161a'), 0, -.12, 0));
      g.add(mesh(geo('thT', () => new THREE.CylinderGeometry(.36, .38, .7, 18)), mat('#16161a'), 0, .22, 0));
      g.add(mesh(geo('thBand', () => new THREE.CylinderGeometry(.39, .39, .12, 18)), mat('#d4a72c'), 0, -.04, 0)); break;
    }
    case 'crown': {
      g.add(mesh(geo('crB', () => new THREE.CylinderGeometry(.4, .4, .25, 10, 1, true)), mat('#f2c230', { side: THREE.DoubleSide }), 0, -.02, 0));
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.add(mesh(geo('crS', () => new THREE.ConeGeometry(.09, .25, 4)), mat('#f2c230'), Math.sin(a) * .36, .22, Math.cos(a) * .36)); }
      g.add(mesh(geo('gem', () => new THREE.OctahedronGeometry(.07)), mat('#e63946', { emissive: '#7a0b14' }), 0, 0, .41)); break;
    }
  }
  return g;
}

/* ---------- player model: a little humanoid scout (original design) ---------- */
const SKINS = ['#ffb3b3', '#ffd1a1', '#fff1a6', '#bff2b6', '#a9e3f5', '#b9c3ff', '#dcbcff', '#ffbfe6', '#2b2b2f'];
const SKIN_NAMES = ['Pastel red', 'Pastel orange', 'Pastel yellow', 'Pastel green', 'Pastel sky', 'Pastel blue', 'Pastel purple', 'Pastel pink', 'Black'];
const PANTS = '#3e4a3d';
function makeBean(color, hatId, ghostly, skin) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const m = new THREE.MeshLambertMaterial({ color }), sk = new THREE.MeshLambertMaterial({ color: skin || SKINS[0] }), pm = mat(PANTS), fm = new THREE.MeshLambertMaterial({ color: '#1b1b1f' });
  const sh = o => { o.castShadow = true; return o; };
  // legs + boots (swing from the hips)
  const legs = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * .13, .8, 0);
    pv.add(sh(mesh(geo('leg', () => new THREE.CylinderGeometry(.1, .09, .62, 10)), pm, 0, -.33, 0)));
    pv.add(sh(mesh(BOX(), mat('#5a3a22'), 0, -.7, .05, .19, .16, .32)));
    body.add(pv); legs.push(pv);
  }
  // hips, belt, torso, shoulders
  body.add(sh(mesh(BOX(), pm, 0, .82, 0, .46, .2, .3)));
  body.add(mesh(BOX(), mat('#6b4423'), 0, .93, 0, .5, .07, .32));
  body.add(mesh(BOX(), mat('#d9b44a'), 0, .93, .165, .09, .07, .02));
  body.add(sh(mesh(geo('torso', () => new THREE.CylinderGeometry(.27, .24, .52, 14)), m, 0, 1.17, 0, 1, 1, .8)));
  body.add(sh(mesh(geo('shoulder', () => new THREE.SphereGeometry(.27, 14, 10)), m, 0, 1.4, 0, 1.05, .45, .8)));
  // scout neckerchief
  body.add(mesh(geo('kerch', () => new THREE.TorusGeometry(.15, .045, 6, 16)), mat('#d64545'), 0, 1.47, 0).rotateX(Math.PI / 2));
  body.add(mesh(geo('kerchT', () => new THREE.ConeGeometry(.1, .2, 4)), mat('#d64545'), 0, 1.36, .2).rotateX(Math.PI));
  // head + face
  body.add(sh(mesh(geo('neck', () => new THREE.CylinderGeometry(.09, .1, .14, 10)), sk, 0, 1.5, 0)));
  body.add(sh(mesh(geo('head', () => new THREE.SphereGeometry(.34, 18, 14)), sk, 0, 1.78, 0, 1, .98, .95)));
  for (const s of [-1, 1]) {
    body.add(mesh(geo('ear', () => new THREE.SphereGeometry(.07, 8, 6)), sk, s * .33, 1.78, 0, .6, 1, 1));
    body.add(mesh(geo('eye', () => new THREE.SphereGeometry(.045, 8, 8)), fm, s * .11, 1.82, .31, 1, 1.5, .6));
    body.add(mesh(geo('blush', () => new THREE.SphereGeometry(.045, 8, 6)), mat('#f28b82'), s * .19, 1.73, .28, 1.3, .7, .4));
  }
  body.add(mesh(geo('smile', () => new THREE.TorusGeometry(.05, .013, 6, 10, Math.PI)), fm, 0, 1.71, .325).rotateZ(Math.PI));
  // backpack with bedroll
  body.add(sh(mesh(BOX(), mat('#7a5c3e'), 0, 1.12, -.34, .44, .5, .22)));
  body.add(mesh(BOX(), mat('#5e452d'), 0, 1.3, -.355, .46, .16, .24));
  body.add(mesh(geo('roll', () => new THREE.CylinderGeometry(.09, .09, .5, 10)), mat('#4f7c6a'), 0, 1.44, -.36).rotateZ(Math.PI / 2));
  // arms (sleeve + hand)
  const arms = [];
  for (const s of [-1, 1]) {
    const pv = new THREE.Group(); pv.position.set(s * .33, 1.38, 0);
    pv.add(sh(mesh(geo('arm', () => new THREE.CylinderGeometry(.085, .075, .48, 8)), m, 0, -.24, 0)));
    pv.add(sh(mesh(geo('hand', () => new THREE.SphereGeometry(.095, 10, 8)), sk, 0, -.53, 0)));
    body.add(pv); arms.push(pv);
  }
  const holder = new THREE.Group(); holder.position.y = 2.135; holder.scale.setScalar(.755); body.add(holder);
  g.userData = { body, arms, legs, holder, m, sk, fm, hatId: null, t: Math.random() * 10, rag: 0, lean: 0 };
  setBeanHat(g, hatId); setBeanColor(g, color, skin || SKINS[0]); if (ghostly) setGhost(g, true);
  return g;
}
function setBeanHat(b, id) { const u = b.userData; if (u.hatId === id) return; u.holder.clear(); u.hatId = id; if (id && id !== 'none') u.holder.add(buildHat(id)); }
function setBeanColor(b, c, skin) { const u = b.userData; u.m.color.set(c); if (skin && u.skin !== skin) { u.skin = skin; u.sk.color.set(skin); u.fm.color.set(skin === '#2b2b2f' ? '#f5efe3' : '#1b1b1f'); } }
function setGhost(b, on) {
  if (b.userData.ghost === on) return; b.userData.ghost = on;
  b.traverse(o => { if (o.isMesh) { if (on) { if (!o.userData.om) o.userData.om = o.material; o.material = o.userData.om.clone(); o.material.transparent = true; o.material.opacity = .32; o.material.depthWrite = false; } else if (o.userData.om) { o.material = o.userData.om; } } });
}
/* s: {spd, air, climb, carry, rag, spray, dt} */
function animBean(b, s) {
  const u = b.userData, dt = s.dt, k = Math.min(s.spd / 6, 1); u.t += dt * (3 + Math.min(s.spd, 9) * 1.3);
  const sm = r => Math.min(1, dt * r);
  u.lean = lerp(u.lean, s.climb ? 0 : clamp(s.spd * .025, 0, .22), sm(8));
  u.rag = lerp(u.rag, s.rag ? 1 : 0, sm(7));
  u.body.rotation.x = lerp(u.lean, -Math.PI / 2, u.rag);
  u.body.rotation.z = s.rag ? Math.sin(u.t * .5) * .15 * u.rag : 0;
  u.body.position.y = s.air || s.rag ? u.rag * .3 : Math.abs(Math.sin(u.t)) * .06 * k;
  const [L, R] = u.arms, [LL, RL] = u.legs; let lx, rx, lz = -.12, rz = .12, llx, rlx;
  const sw = Math.sin(u.t);
  if (s.climb) { lx = -2.8 + sw * .45; rx = -2.8 - sw * .45; lz = -.25; rz = .25; llx = -.6 - sw * .5; rlx = -.6 + sw * .5; }
  else if (s.air) { lx = rx = -.5; lz = -2.0 - Math.sin(u.t * 3) * .3; rz = 2.0 + Math.sin(u.t * 3) * .3; llx = -.7; rlx = .25; }
  else { lx = sw * 1.0 * k; rx = -sw * 1.0 * k; llx = -sw * .9 * k; rlx = sw * .9 * k; }
  if (s.carry) { lx = rx = -2.95; lz = -.15; rz = .15; }
  if (s.spray) rx = -1.5;
  if (s.rag) { lz = -1.5 + Math.sin(u.t * 2) * .4; rz = 1.5 - Math.sin(u.t * 2) * .4; llx = -.3 + Math.sin(u.t) * .3; rlx = .2; }
  const a = sm(14);
  L.rotation.x = lerp(L.rotation.x, lx, a); R.rotation.x = lerp(R.rotation.x, rx, a); L.rotation.z = lerp(L.rotation.z, lz, a); R.rotation.z = lerp(R.rotation.z, rz, a);
  LL.rotation.x = lerp(LL.rotation.x, llx, a); RL.rotation.x = lerp(RL.rotation.x, rlx, a);
  const h = u.holder.children[0]; if (h) h.children.forEach(c => { if (c.userData.spin) c.rotation.z += dt * 2; });
}
function nameSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = '800 30px Nunito, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const w = Math.min(250, x.measureText(text).width + 30); x.fillStyle = 'rgba(20,22,28,.72)'; x.beginPath(); x.roundRect ? x.roundRect(128 - w / 2, 10, w, 44, 22) : x.rect(128 - w / 2, 10, w, 44); x.fill();
  x.fillStyle = color || '#fff'; x.fillText(text, 128, 33);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true })); sp.scale.set(2, .5, 1); sp.renderOrder = 5; return sp;
}
