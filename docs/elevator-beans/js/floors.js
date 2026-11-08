'use strict';
/* Elevator Beans: every floor the elevator can stop at.
   build() must only use the seeded R() so every player builds the same floor. */
function ground(g, x0, x1, z0, z1, color, y = 0, o = {}) { return box(g, (x0 + x1) / 2, y - 1, (z0 + z1) / 2, x1 - x0, 1, z1 - z0, color, Object.assign({ noShadow: 1 }, o)); }
function walls(g, x0, x1, z0, z1, h, color) {
  box(g, x0 - .25, 0, (z0 + z1) / 2, .5, h, z1 - z0, color); box(g, x1 + .25, 0, (z0 + z1) / 2, .5, h, z1 - z0, color);
  box(g, (x0 + x1) / 2, 0, z1 + .25, x1 - x0 + 1, h, .5, color);
  if (x0 < -8.1) box(g, (x0 - 8.1) / 2, 0, 2.45, -8.1 - x0, h, .3, color); if (x1 > 8.1) box(g, (x1 + 8.1) / 2, 0, 2.45, x1 - 8.1, h, .3, color);
}
function plant(g, x, z, s = 1) { box(g, x, 0, z, .8 * s, .8 * s, .8 * s, '#8a5a3c'); deco(g, mesh(geo('leafball', () => new THREE.IcosahedronGeometry(1, 0)), mat('#3f8f4f', { flatShading: true }), x, 1.5 * s, z, .9 * s, 1.1 * s, .9 * s)); }
function textPlane(text, w, h, bg, fg, font) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lines = text.split('\n'); const fs = Math.min(c.height / lines.length * .62, 90); x.font = (font || '400 ' + fs + 'px Bungee, Impact, sans-serif');
  lines.forEach((l, i) => x.fillText(l, 256, c.height / (lines.length + 1) * (i + 1)));
  const m = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) }); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}
function zoneMark(g, z, color) { deco(g, mesh(BOX(), mat(color, { transparent: true, opacity: .35 }), (z.x0 + z.x1) / 2, .02, (z.z0 + z.z1) / 2, z.x1 - z.x0, .04, z.z1 - z.z0)); }
const CAB_ZONE = { x0: -2.1, x1: 2.1, z0: -2.1, z1: 2.3, cab: 1 };
const inZone = (z, x, y, zz) => z && x > z.x0 && x < z.x1 && zz > z.z0 && zz < z.z1 && (!z.cab || y < 3);

/* ---------- item + hazard models ---------- */
function itemModel(kind, k) {
  const g = new THREE.Group();
  switch (kind) {
    case 'box': g.add(mesh(BOX(), mat('#c69a63'), 0, .35, 0, .8, .7, .8)); g.add(mesh(BOX(), mat('#e8d3a8'), 0, .71, 0, .82, .03, .2)); break;
    case 'couch': g.add(mesh(BOX(), mat('#5d7ea6'), 0, .3, 0, 1.6, .5, .7)); g.add(mesh(BOX(), mat('#4b6a90'), 0, .7, -.28, 1.6, .5, .18)); break;
    case 'fuse': g.add(mesh(geo('fuseC', () => new THREE.CylinderGeometry(.15, .15, .6, 10)), mat('#ffe066', { emissive: '#a07800' }), 0, .35, 0).rotateZ(Math.PI / 2)); g.add(mesh(BOX(), mat('#666'), -.33, .35, 0, .08, .34, .34)); g.add(mesh(BOX(), mat('#666'), .33, .35, 0, .08, .34, .34)); break;
    case 'chest': g.add(mesh(BOX(), mat('#8b5a2b'), 0, .3, 0, .9, .6, .6)); g.add(mesh(BOX(), mat('#e0b83a', { emissive: '#4a3600' }), 0, .62, 0, .92, .1, .62)); break;
    case 'crumb': g.add(mesh(geo('cookie', () => new THREE.CylinderGeometry(.55, .55, .25, 12)), mat('#c98a4b'), 0, .15, 0)); [[.2, .1], [-.2, .15], [0, -.25]].forEach(([x, z]) => g.add(mesh(BOX(), mat('#4a2c1a'), x, .29, z, .12, .05, .12))); break;
    case 'groc': {
      const t = k % 3; if (t === 0) g.add(mesh(BOX(), mat(['#e63946', '#f4a261', '#2a9d8f'][k % 3]), 0, .45, 0, .6, .9, .25));
      else if (t === 1) g.add(mesh(geo('can', () => new THREE.CylinderGeometry(.25, .25, .6, 12)), mat('#d8dde3'), 0, .3, 0));
      else g.add(mesh(geo('melon', () => new THREE.SphereGeometry(.4, 12, 10)), mat('#5aa547'), 0, .4, 0, 1.2, 1, 1));
      break;
    }
    case 'cash': g.add(mesh(geo('bag', () => new THREE.SphereGeometry(.4, 10, 8)), mat('#cdbb8a'), 0, .4, 0, 1, 1.1, 1)); g.add(mesh(BOX(), mat('#2f8f46'), 0, .45, .38, .3, .3, .02)); break;
    case 'gold': g.add(mesh(BOX(), mat('#f2c230', { emissive: '#5a4000' }), 0, .2, 0, .9, .4, .45)); break;
    case 'banana': { const b = mesh(geo('ban', () => new THREE.TorusGeometry(.42, .13, 8, 16, Math.PI * .9)), mat('#f7d43e', { emissive: '#5a4400' }), 0, .6, 0); g.add(b); break; }
    case 'orb': g.add(mesh(geo('orb', () => new THREE.IcosahedronGeometry(.6, 1)), mat('#d9c9ff', { emissive: '#8f6bff', emissiveIntensity: 1, flatShading: true }), 0, 1, 0)); break;
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
const CARRY_KINDS = { box: 1, couch: 1, fuse: 1, chest: 1, crumb: 1, groc: 1, cash: 1, gold: 1 };
const HEAVY = { couch: 1, chest: 1, gold: 1 };
function entModel(type, e) {
  const g = new THREE.Group();
  switch (type) {
    case 'tire': { const t = mesh(geo('tire', () => new THREE.TorusGeometry(.55, .28, 10, 20)), mat('#222326'), 0, .83, 0); t.rotation.y = Math.PI / 2; g.add(t); g.userData.spin = t; break; }
    case 'cart': {
      const w = mat('#b7c0c9'); g.add(mesh(BOX(), mat('#b7c0c9', { transparent: true, opacity: .55 }), 0, 1, 0, 1.1, .8, 1.6)); g.add(mesh(BOX(), w, 0, .55, 0, 1.1, .08, 1.6));
      g.add(mesh(BOX(), mat('#e63946'), 0, 1.45, -.85, 1.1, .08, .08));
      for (const [x, z] of [[-.45, -.65], [.45, -.65], [-.45, .65], [.45, .65]]) g.add(mesh(geo('wheel', () => new THREE.SphereGeometry(.12, 8, 6)), mat('#222'), x, .12, z)); break;
    }
    case 'eel': { for (let i = 0; i < 7; i++) g.add(mesh(geo('eelS', () => new THREE.SphereGeometry(.4, 10, 8)), mat(i ? '#2f4f3a' : '#3b6a4a'), 0, 0, -i * .55, 1 - i * .1, 1 - i * .1, 1)); g.add(mesh(geo('eelE', () => new THREE.SphereGeometry(.08, 6, 6)), mat('#ffe14d', { emissive: '#ffe14d' }), .2, .15, .3)); g.add(mesh(geo('eelE', () => new THREE.SphereGeometry(.08, 6, 6)), mat('#ffe14d', { emissive: '#ffe14d' }), -.2, .15, .3)); break; }
    case 'man': {
      const m = mat('#e9e2d3'); g.add(mesh(geo('manB', () => new THREE.CylinderGeometry(.35, .3, 1.5, 12)), m, 0, 1.05, 0)); g.add(mesh(geo('manH', () => new THREE.SphereGeometry(.3, 12, 10)), m, 0, 2.05, 0, 1, 1.15, 1));
      g.add(mesh(BOX(), m, .55, 1.5, .25, .14, .14, .8)); g.add(mesh(BOX(), m, -.55, 1.5, .25, .14, .14, .8)); g.add(mesh(BOX(), mat('#2a2a2a'), 0, .03, 0, .7, .06, .7)); break;
    }
    case 'bot': { const b = makeBean(COLORS[(e && e[5]) || 0], 'beanie'); g.add(b); g.userData.bean = b; break; }
    case 'coco': {
      const sh = mesh(geo('ring', () => new THREE.CircleGeometry(1, 20)), mat('#000', { transparent: true, opacity: .35, depthWrite: false }), 0, .05, 0); sh.rotation.x = -Math.PI / 2; g.add(sh); g.userData.sh = sh;
      const c = mesh(geo('coco', () => new THREE.SphereGeometry(.45, 10, 8)), mat('#5b3a1e'), 0, 10, 0); g.add(c); g.userData.c = c; break;
    }
    case 'hand': {
      const sh = mesh(geo('ring', () => new THREE.CircleGeometry(1, 20)), mat('#000', { transparent: true, opacity: .35, depthWrite: false }), 0, .06, 0); sh.rotation.x = -Math.PI / 2; g.add(sh); g.userData.sh = sh;
      const h = new THREE.Group(), sk = mat('#f0c6a0'); h.add(mesh(BOX(), sk, 0, 0, 0, 3, .8, 3)); for (let i = 0; i < 4; i++) h.add(mesh(BOX(), sk, -1.1 + i * .74, 0, 2.4, .6, .7, 2)); h.add(mesh(BOX(), sk, 1.9, 0, .4, 1.2, .7, .6));
      h.add(mesh(BOX(), mat('#f7f7f2'), 0, .2, -2.2, 3.4, 1.2, 1.6)); g.add(h); g.userData.h = h; break;
    }
    case 'laser': {
      const tall = e && e[6]; const lm = mesh(BOX(), mat('#ff2b3a', { emissive: '#ff2b3a', emissiveIntensity: 1, transparent: true, opacity: .85 }), 0, 0, 0, 1, tall ? 3 : .14, .14); g.add(lm); g.userData.l = lm;
      g.add(mesh(geo('lpost', () => new THREE.CylinderGeometry(.25, .3, .9, 10)), mat('#2b2b33'), 0, .45, 0)); break;
    }
  }
  g.traverse(o => { if (o.isMesh && type !== 'coco' && type !== 'hand') o.castShadow = true; });
  return g;
}

/* ---------- floors ---------- */
const FL = {};
const fetchGoal = noun => G => (G.pr || 0) + ' / ' + G.nd + ' ' + noun;
function pickSpots(R, spots, n) { const a = spots.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
function initFetch(G, L, nd) { G.i = L.items.map(it => [r2(it.x), r2(it.y), r2(it.z), 0, '']); G.nd = Math.min(nd, L.items.length); }

FL.lobby = {
  id: 'lobby', name: 'Lobby', time: () => 0,
  build(g) {
    const L = { env: { bg: '#241d26', near: 25, far: 70, sky: '#ffe7c4', gnd: '#3b2a2a', hi: .75, si: .45, sc: '#ffd9a0' }, items: [] };
    ground(g, -12, 12, 2.6, 30, '#6b2f36'); walls(g, -12, 12, 2.6, 30, 7, '#3c3340');
    for (let x = -10; x <= 10; x += 4) for (let z = 5; z <= 28; z += 4) deco(g, mesh(BOX(), mat('#7a3740'), x, .005, z, 1.6, .01, 1.6));
    box(g, 6, 0, 10, 4, 1.2, 1.4, '#7a5536'); box(g, 6, 1.2, 10, 4.3, .12, 1.7, '#b08d57'); // desk
    plant(g, -10.5, 4.5); plant(g, 10.5, 4.5); plant(g, -10.5, 28); plant(g, 10.5, 28);
    // practice rock with a flag on top
    box(g, -7.5, 0, 20, 4, 6, 4, '#7d7468', { climb: 1 });
    deco(g, mesh(geo('pole', () => new THREE.CylinderGeometry(.05, .05, 2, 6)), mat('#ddd'), -7.5, 7, 20)); deco(g, mesh(BOX(), mat('#e63946'), -7, 7.6, 20, .9, .5, .04));
    const sign = textPlane('ELEVATOR\nBEANS', 9, 3.4, '#1b1720', '#f2c14e'); sign.position.set(0, 4.3, 29.7); sign.rotation.y = Math.PI; g.add(sign);
    const tip = textPlane('PRACTICE ROCK\nSPACE TO GRAB\nW TO CLIMB', 3.6, 2, '#2b2530', '#f4efe6', '400 46px Bungee, Impact, sans-serif'); tip.position.set(-7.5, 2.5, 17.98); tip.rotation.y = Math.PI; g.add(tip);
    const tip2 = textPlane('YOUR HATS', 3, .8, '#2b2530', '#f2c14e'); tip2.position.set(11.7, 3.4, 16); tip2.rotation.y = -Math.PI / 2; g.add(tip2);
    // hat pedestals for every hat you own
    HATS.filter(h => h.id !== 'none').forEach((h, i) => {
      const z = 6 + i * 1.9; box(g, 10.6, 0, z, 1, 1, 1, '#d9cfbd');
      if (P.hats[h.id]) { const hm = buildHat(h.id); hm.position.set(10.6, 1.35, z); hm.rotation.y = -Math.PI / 2; g.add(hm); }
      else deco(g, mesh(BOX(), mat('#4a4450'), 10.6, 1.25, z, .4, .4, .4));
    });
    const pl = new THREE.PointLight('#ffcf8a', .8, 30); pl.position.set(0, 6, 15); g.add(pl);
    return L;
  },
};

FL.moving = {
  id: 'moving', name: 'Moving Day', hat: 'hardhat', blurb: 'Load the moving truck. Watch out for runaway tires and the cliff edge!', time: d => Math.max(80, 130 - d * 4),
  goal: fetchGoal('boxes in the truck'),
  build(g, R) {
    const L = { env: { bg: '#9fd3f5', near: 40, far: 150, sky: '#dff3ff', gnd: '#7b6a4f', hi: .75, si: .95 }, killY: -18 };
    ground(g, -7, 7, 2.6, 72, '#585a60'); ground(g, -8.1, -7, 2.6, 72, '#8f8a7d');
    for (let z = 8; z < 70; z += 5) deco(g, mesh(BOX(), mat('#f2e6b8'), 0, .01, z, .25, .02, 2.2));
    // cliff wall on the left with climbing ledges
    box(g, -10, 0, 37, 4, 9, 70, '#8a7d6b', { climb: 1 });
    for (let i = 0; i < 6; i++) { const z = 10 + i * 10 + R() * 4, y = i % 2 ? 6 : 3; box(g, -7.6, y - .3, z, 1.4, .3, 3, '#776b5b', { climb: 1 }); }
    // guard posts on the drop side + far mountains
    for (let z = 6; z < 70; z += 6) box(g, 7.2, 0, z, .3, .7, .3, '#e8e2d0');
    for (let i = 0; i < 6; i++) deco(g, mesh(geo('mtn', () => new THREE.ConeGeometry(1, 1, 5)), mat('#8fa9b8', { flatShading: true }), 40 + R() * 30, -20, 10 + i * 18, 14 + R() * 10, 30 + R() * 25, 14));
    // the truck
    box(g, 4.2, 0, 13, 4.6, 1, 6, '#e4572e'); box(g, 4.2, 1, 10.4, 4.6, 2.8, .3, '#e4572e'); box(g, 2.05, 1, 13, .3, 2.8, 6, '#e4572e'); box(g, 6.35, 1, 13, .3, 2.8, 6, '#e4572e');
    box(g, 4.2, 0, 8.4, 4, 2.6, 2.6, '#c8462a'); deco(g, mesh(BOX(), mat('#9bd1ff'), 4.2, 1.9, 7.1, 3.4, .9, .05));
    for (const [x, z] of [[2, 8.5], [6.4, 8.5], [2, 14.5], [6.4, 14.5]]) deco(g, mesh(geo('tw', () => new THREE.CylinderGeometry(.55, .55, .4, 14)), mat('#222'), x, .55, z).rotateZ(Math.PI / 2));
    L.zone = { x0: 2.2, x1: 6.2, z0: 10.6, z1: 16 }; zoneMark(g, { x0: 2.3, x1: 6.1, z0: 10.7, z1: 15.9 }, '#ffe066');
    const spots = []; for (let i = 0; i < 14; i++) spots.push({ x: -5 + R() * 9, y: 0, z: 20 + R() * 48, kind: 'box' });
    SOL.filter(q => q.floor && Math.abs(q.x0 + 8.3) < .01).forEach(q => spots.push({ x: -7.7, y: q.y1, z: (q.z0 + q.z1) / 2, kind: 'box' }));
    L.items = pickSpots(R, spots, 12); L.items.push({ x: 0, y: 0, z: 40 + R() * 20, kind: 'couch' });
    return L;
  },
  init(G, L, d, np) { initFetch(G, L, 5 + Math.floor(np / 2) + Math.floor(d / 2)); G.x = { tt: 2 }; },
  tick(G, L, dt, d) {
    G.x.tt -= dt; if (G.x.tt <= 0 && G.e.length < 6) { G.x.tt = Math.max(1.3, 3.4 - d * .15); G.e.push(['tire', r1(-5 + Math.random() * 10), 0, 70, 0, 9 + d * .4]); }
    G.e.forEach(e => e[3] -= e[5] * dt); G.e = G.e.filter(e => e[3] > 18);
  },
};

FL.fire = {
  id: 'fire', name: 'Bean Rescue', hat: 'firehelm', blurb: 'Put out every fire. Hold click to spray, refill at the red hydrants. Climb houses to reach roof fires.', time: d => Math.max(75, 115 - d * 3),
  goal: G => (G.x.f || []).filter(h => h > 0).length + ' fires left',
  build(g, R) {
    const L = { env: { bg: '#f0b27a', near: 35, far: 110, sky: '#ffd9b0', gnd: '#6b4b3a', hi: .8, si: .85, sc: '#ffc48a' }, items: [], fires: [], hydrants: [[0, 9], [0, 34]] };
    ground(g, -22, 22, 2.6, 46, '#8e8b85'); walls(g, -22, 22, 2.6, 46, 3, '#b9775a');
    const cols = ['#e9c46a', '#8ecae6', '#f4a261', '#c3b1e1'];
    [[-11, 15], [11, 15], [-11, 33], [11, 33]].forEach(([x, z], i) => {
      box(g, x, 0, z, 8, 5, 8, cols[i], { climb: 1 }); box(g, x, 5, z, 8.6, .4, 8.6, '#6d4c41');
      deco(g, mesh(BOX(), mat('#5b3b2a'), x + (x < 0 ? 4.02 : -4.02), 1.1, z, .05, 2.2, 1.4));
      for (const dz of [-2.2, 2.2]) deco(g, mesh(BOX(), mat('#3d5a80'), x + (x < 0 ? 4.02 : -4.02), 2.8, z + dz, .05, 1, 1.1));
      L.fires.push([x + R() * 4 - 2, 5.4, z + R() * 4 - 2]);
      L.fires.push([x + (x < 0 ? 4.6 : -4.6), 0, z + R() * 6 - 3]);
      L.fires.push([x + R() * 6 - 3, 0, z + (z < 24 ? -4.6 : 4.6)]);
      L.fires.push([x + (x < 0 ? 4.2 : -4.2), 2.3, z + (R() < .5 ? -2.2 : 2.2)]);
    });
    L.hydrants.forEach(([x, z]) => { box(g, x, 0, z, .7, 1.1, .7, '#d62828'); deco(g, mesh(geo('hydT', () => new THREE.SphereGeometry(.4, 10, 8)), mat('#d62828'), x, 1.15, z)); });
    for (let i = 0; i < 6; i++) plant(g, -18 + R() * 36, 21 + R() * 6, 1.3);
    L.flames = L.fires.map(([x, y, z]) => { const fg = new THREE.Group(); fg.position.set(x, y, z); for (let k = 0; k < 4; k++) fg.add(mesh(geo('flame', () => new THREE.ConeGeometry(.5, 1.4, 6)), mat(k % 2 ? '#ffb703' : '#fb5607', { emissive: k % 2 ? '#ff8800' : '#ff3b00', emissiveIntensity: .9 }), (k % 2 - .5) * .5, .7, (k > 1 ? .3 : -.3))); g.add(fg); return fg; });
    return L;
  },
  init(G, L, d) { const n = Math.min(L.fires.length, 6 + Math.min(d, 6)); const idx = pickSpots(Math.random, L.fires.map((f, i) => i), n); G.x = { f: L.fires.map((f, i) => idx.includes(i) ? 100 : 0), sp: 7 }; G.nd = 0; },
  tick(G, L, dt, d) {
    const f = G.x.f; G.x.sp -= dt;
    if (G.x.sp <= 0) { G.x.sp = Math.max(4, 8 - d * .5); const lit = f.filter(h => h > 0).length, out = f.map((h, i) => h <= 0 ? i : -1).filter(i => i >= 0); if (lit > 0 && out.length) f[out[Math.floor(Math.random() * out.length)]] = 60; }
    if (f.every(h => h <= 0)) G.pr = G.nd = 1;
  },
  client(dt, t) { const f = (G.x && G.x.f) || []; L.flames.forEach((fg, i) => { const h = f[i] || 0; fg.visible = h > 0; if (h > 0) { const s = .4 + h / 100 * .8; fg.scale.set(s, s * (1 + Math.sin(t * 13 + i) * .15), s); fg.rotation.y = t * 2 + i; } }); },
};

FL.sea = {
  id: 'sea', name: 'Deep Sea Salvage', hat: 'fishbowl', blurb: 'Bring the treasure back to the elevator. Space swims up. Watch your air: refill at bubble vents or in the elevator. Avoid the eel!', time: d => Math.max(85, 125 - d * 3),
  goal: fetchGoal('treasures in the elevator'),
  build(g, R) {
    const L = { env: { bg: '#0b4a6e', fog: '#0b4a6e', near: 4, far: 42, sky: '#7fd3ff', gnd: '#20384a', hi: .9, si: .5, sc: '#9fe3ff' }, water: 1, vents: [], zone: CAB_ZONE, killY: -20 };
    ground(g, -26, 26, 2.6, 58, '#d8c38f'); walls(g, -26, 26, 2.6, 58, 18, '#2c5d73');
    // shipwreck
    const hull = '#6b4a33'; box(g, -6, 0, 38, .6, 4.5, 12, hull, { climb: 1 }); box(g, 6, 0, 38, .6, 4.5, 12, hull, { climb: 1 }); box(g, 0, 0, 44.3, 12.6, 4.5, .6, hull, { climb: 1 });
    box(g, -3.5, 0, 31.7, 5, 3.5, .6, hull, { climb: 1 }); box(g, 0, 4.5, 41, 12.6, .4, 7, hull); box(g, 3, 4.9, 41, .5, 8, .5, '#4e3524');
    for (let i = 0; i < 9; i++) { const s = 1.5 + R() * 3; box(g, -22 + R() * 44, 0, 8 + R() * 46, s * 1.4, s, s, '#556b75', { climb: 1 }); }
    for (let i = 0; i < 40; i++) deco(g, mesh(BOX(), mat('#3f8f5a'), -24 + R() * 48, 2, 6 + R() * 50, .2, 3 + R() * 6, .2));
    [[-14, 22], [14, 30], [0, 52]].forEach(([x, z]) => { L.vents.push([x, z]); box(g, x, 0, z, 1.4, .5, 1.4, '#3b3f45'); const bub = new THREE.Group(); for (let i = 0; i < 10; i++) bub.add(mesh(geo('bub', () => new THREE.SphereGeometry(.06, 8, 6)), mat('#ffffff', { transparent: true, opacity: .6 }), (R() - .5) * .6, i * 1.2, (R() - .5) * .6, 3, 3, 3)); bub.position.set(x, .5, z); g.add(bub); bub.userData.bub = 1; });
    const spots = [{ x: 0, y: 0, z: 38 }, { x: -3, y: 0, z: 41 }, { x: 3, y: 4.9, z: 40 }, { x: -2, y: 4.9, z: 42 }];
    for (let i = 0; i < 10; i++) spots.push({ x: -20 + R() * 40, y: 0, z: 12 + R() * 42 });
    L.items = pickSpots(R, spots, 10).map(s => Object.assign(s, { kind: 'chest' }));
    return L;
  },
  init(G, L, d, np) { initFetch(G, L, 4 + Math.floor(np / 2) + Math.floor(d / 3)); G.e = []; const n = 1 + Math.min(2, Math.floor(d / 3)); for (let i = 0; i < n; i++) G.e.push(['eel', r1(-10 + i * 20), 3, 30 + i * 8, 0, 0]); G.x = {}; },
  tick(G, L, dt, d, PL) {
    G.e.forEach(e => {
      let tx = 0, ty = 3, tz = 30, best = 18; e[5] = Math.max(0, e[5] - dt);
      PL.forEach(p => { if (!p.al || inCabin(p.x, p.y, p.z)) return; const dd = Math.hypot(p.x - e[1], p.y - e[2], p.z - e[3]); if (dd < best) { best = dd; tx = p.x; ty = p.y + .8; tz = p.z; } });
      if (best >= 18) { const t = G.tt * .3 + e[1]; tx = Math.sin(t) * 15; tz = 30 + Math.cos(t * .7) * 18; ty = 3 + Math.sin(t * 2) * 2; }
      if (best < 1.3 && e[5] <= 0) e[5] = 3;
      let sp = (4 + d * .25) * (e[5] > 0 ? -.8 : 1); const dx = tx - e[1], dy = ty - e[2], dz = tz - e[3], m = Math.hypot(dx, dy, dz) || 1;
      e[1] = r2(clamp(e[1] + dx / m * sp * dt, -24, 24)); e[2] = r2(clamp(e[2] + dy / m * sp * dt, .5, 15)); e[3] = r2(clamp(e[3] + dz / m * sp * dt, 6, 56)); e[4] = r2(Math.atan2(dx, dz) + (e[5] > 0 ? Math.PI : 0));
    });
  },
  client(dt, t) { FLOOR_GRP.children.forEach(c => { if (c.userData.bub) c.children.forEach((b, i) => { b.position.y = (t * 2 + i * 1.2) % 12; }); }); },
};

FL.mall = {
  id: 'mall', name: 'Night Shift', hat: 'guardcap', blurb: 'The mall power is out. Find the fuses and bring them to the fuse box by the elevator. Mannequins only move when NOBODY is looking at them.', time: d => Math.max(85, 120 - d * 3),
  goal: fetchGoal('fuses in the fuse box'),
  build(g, R) {
    const L = { env: { bg: '#040507', near: 6, far: 34, sky: '#5a6a8a', gnd: '#05060a', hi: .14, si: 0 }, dark: 1 };
    ground(g, -24, 24, 2.6, 52, '#2d2f36'); walls(g, -24, 24, 2.6, 52, 7, '#1d1f26');
    deco(g, mesh(BOX(), mat('#101117'), 0, 7.05, 27, 50, .1, 52));
    // shops on both sides with doorways
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      const z = 9 + i * 11, x = s * 17;
      box(g, s * 10.5, 0, z - 3.6, .4, 5, 3.6, '#3a3d4a'); box(g, s * 10.5, 0, z + 3.6, .4, 5, 3.6, '#3a3d4a'); box(g, s * 10.5, 3.6, z, .4, 1.4, 3.6, '#3a3d4a');
      box(g, x, 0, z + 5.3, 13, 5, .4, '#2b2e38');
      box(g, x + s * 2, 0, z, 2, 1.1, 3, '#4b3f35');
      const sg = textPlane(['SOCKS', 'PRETZEL', 'TOYS', 'PHONES', 'SHOES', 'CANDLES', 'GAMES', 'HATS'][i * 2 + (s > 0 ? 1 : 0)], 3.4, .8, '#120d14', ['#ff4fa3', '#4ff0ff', '#ffe14f', '#7dff6a'][i]); sg.position.set(s * 10.25, 5.4, z); sg.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(sg);
    }
    for (let i = 0; i < 4; i++) { box(g, 0, 0, 12 + i * 10, 3, 1, 1.2, '#4a4a55'); plant(g, 0, 16.5 + i * 10, .9); }
    const ex = textPlane('EXIT', 1.6, .6, '#06210f', '#3dff7a'); ex.position.set(0, 5.6, 51.7); ex.rotation.y = Math.PI; g.add(ex);
    box(g, -3.2, 1.2, 2.75, 1.6, 1.8, .3, '#555a66'); const fb = textPlane('FUSE BOX', 1.5, .4, '#222', '#ffe066'); fb.position.set(-3.2, 3.3, 2.92); g.add(fb);
    L.zone = { x0: -5.5, x1: -1, z0: 2.6, z1: 6 }; zoneMark(g, L.zone, '#ffe066');
    const spots = []; for (let i = 0; i < 4; i++) for (const s of [-1, 1]) spots.push({ x: s * (14 + R() * 6), y: 0, z: 7 + i * 11 + R() * 4 }); for (let i = 0; i < 4; i++) spots.push({ x: -6 + R() * 12, y: 0, z: 20 + R() * 28 });
    L.items = pickSpots(R, spots, 9).map(s => Object.assign(s, { kind: 'fuse' }));
    L.manSpots = pickSpots(R, spots.map(s => [s.x + 1.5, s.z + 1.5]), 8);
    for (let i = 0; i < 3; i++) { const pl = new THREE.PointLight('#5a7cff', .5, 12); pl.position.set(-10 + i * 10, 5, 20 + i * 10); g.add(pl); }
    return L;
  },
  init(G, L, d, np) { initFetch(G, L, 4 + Math.floor(np / 2) + Math.floor(d / 3)); G.e = L.manSpots.slice(0, 3 + Math.min(4, Math.floor(d / 2))).map(([x, z]) => ['man', r1(x), 0, r1(z), 0]); G.x = {}; },
  tick(G, L, dt, d, PL) {
    const seen = new Set(); PL.forEach(p => { if (p.al) (p.s || []).forEach(i => seen.add(i)); });
    G.e.forEach((e, i) => {
      if (seen.has(i)) return; let best = 1e9, tx = e[1], tz = e[3];
      PL.forEach(p => { if (!p.al || inCabin(p.x, p.y, p.z)) return; const dd = Math.hypot(p.x - e[1], p.z - e[3]); if (dd < best) { best = dd; tx = p.x; tz = p.z; } });
      if (best > 1e8) return; const sp = (3.2 + d * .2) * dt, dx = tx - e[1], dz = tz - e[3], m = Math.hypot(dx, dz) || 1;
      const nx = e[1] + dx / m * sp, nz = e[3] + dz / m * sp;
      if (!insideSolid(nx, 1, e[3], -.1)) e[1] = r2(nx); if (!insideSolid(e[1], 1, nz, -.1)) e[3] = r2(nz); e[4] = r2(Math.atan2(dx, dz));
    });
  },
};

FL.potato = {
  id: 'potato', name: 'Hot Potato Volcano', hat: 'potato', survive: 1, blurb: "Don't be holding the hot potato when it blows! Touch someone to pass it. The tiles are sinking into the lava.", time: d => 60,
  goal: G => 'Survive! Potato: ' + (G.x.b ? Math.max(0, G.x.b[1]).toFixed(0) + 's' : '...'),
  build(g, R) {
    const L = { env: { bg: '#3a120c', fog: '#5a1a0c', near: 20, far: 70, sky: '#ff9a5a', gnd: '#ff4400', hi: .85, si: .7, sc: '#ffb07a' }, lavaY: -.9, tiles: [] };
    deco(g, mesh(BOX(), mat('#ff5a1f', { emissive: '#ff3300', emissiveIntensity: .8 }), 0, -1.2, 20, 80, .2, 60));
    for (let i = 0; i < 4; i++) deco(g, mesh(geo('mtn', () => new THREE.ConeGeometry(1, 1, 5)), mat('#3b2a26', { flatShading: true }), -30 + i * 20, 8, 46 + R() * 6, 14, 24 + R() * 10, 12));
    box(g, 0, -1.2, 3.6, 4.6, 1.2, 2.2, '#4a3c39');
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      const x = -9.6 + c * 3.2, z = 6.3 + r * 3.2, s = box(g, x, -1.2, z, 3.05, 1.2, 3.05, (r + c) % 2 ? '#6a5650' : '#5a4844');
      L.tiles.push({ s, x, z, safe: r === 0 && Math.abs(x) < 2 });
    }
    return L;
  },
  init(G, L, d, np) {
    G.nd = 0; G.x = { s: L.tiles.map(() => 0), b: null, bc: 1.5, sk: 4, ko: [], kc: 0 }; G.e = [];
    const nb = Math.max(2, 4 - np); for (let i = 0; i < nb; i++) G.e.push(['bot', r1(-6 + i * 4), 0, r1(12 + Math.random() * 6), 0, (i + 3) % COLORS.length, 1]);
    HL.tw = {};
  },
  tick(G, L, dt, d, PL) {
    const X = G.x, tiles = L.tiles;
    // sink tiles
    X.sk -= dt; if (X.sk <= 0) { X.sk = Math.max(1.4, 3.6 - d * .2); const c = tiles.map((t, i) => (!t.safe && X.s[i] === 0) ? i : -1).filter(i => i >= 0); if (c.length > 6) { const i = c[Math.floor(Math.random() * c.length)]; X.s[i] = 2; HL.tw[i] = 1.8; } }
    Object.keys(HL.tw).forEach(i => { HL.tw[i] -= dt; if (HL.tw[i] <= 0) { X.s[i] = 1; delete HL.tw[i]; } });
    // bots
    const live = []; PL.forEach(p => { if (p.al) live.push({ id: p.u, x: p.x, z: p.z }); }); G.e.forEach((e, i) => { if (e[6]) live.push({ id: 'b' + i, x: e[1], z: e[3] }); });
    const holder = X.b && live.find(q => q.id === X.b[0]);
    G.e.forEach((e, i) => {
      if (!e[6]) return; const me = 'b' + i; let tx = e[1], tz = e[3];
      if (X.b && X.b[0] === me) { let best = 1e9; live.forEach(q => { if (q.id === me) return; const dd = Math.hypot(q.x - e[1], q.z - e[3]); if (dd < best) { best = dd; tx = q.x; tz = q.z; } }); }
      else if (holder) { tx = e[1] + (e[1] - holder.x) * 2; tz = e[3] + (e[3] - holder.z) * 2; }
      else { tx = Math.sin(G.tt * .5 + i) * 6; tz = 13 + Math.cos(G.tt * .4 + i) * 5; }
      // stay on solid tiles
      const ti = n => { const c = Math.round((n.x + 9.6) / 3.2), r = Math.round((n.z - 6.3) / 3.2); return (c >= 0 && c < 7 && r >= 0 && r < 6) ? r * 7 + c : -1; };
      const dx = tx - e[1], dz = tz - e[3], m = Math.hypot(dx, dz) || 1, sp = (X.b && X.b[0] === me ? 5.6 : 4.6) * dt;
      const nx = clamp(e[1] + dx / m * sp, -10.5, 10.5), nz = clamp(e[3] + dz / m * sp, 5, 21.5), k = ti({ x: nx, z: nz });
      if (k >= 0 && X.s[k] !== 1) { e[1] = r2(nx); e[3] = r2(nz); } else { e[1] = r2(e[1] - dz / m * sp * .7); e[3] = r2(e[3] + dx / m * sp * .7); }
      e[4] = r2(Math.atan2(dx, dz));
      const kk = ti({ x: e[1], z: e[3] }); if (kk >= 0 && X.s[kk] === 1) { e[6] = 0; X.ko.push(['b' + i, ++X.kc]); }
    });
    G.e.forEach(e => { if (!e[6]) e[2] = r2(Math.max(-3, e[2] - dt * 3)); });
    // the potato
    if (!X.b) { X.bc -= dt; const pool = live.filter(q => !G.e.some((e, i) => 'b' + i === q.id && !e[6])); if (X.bc <= 0 && pool.length > 1) X.b = [pool[Math.floor(Math.random() * pool.length)].id, Math.max(7, 13 - d * .5) + Math.random() * 5, 1]; }
    else {
      X.b[1] = r2(X.b[1] - dt); X.b[2] = Math.max(0, X.b[2] - dt);
      const h = live.find(q => q.id === X.b[0]);
      if (!h) X.b = null;
      else if (X.b[1] <= 0) { X.ko.push([h.id, ++X.kc]); const bi = h.id[0] === 'b' ? +h.id.slice(1) : -1; if (bi >= 0 && G.e[bi]) { G.e[bi][6] = 0; } X.boom = [r1(h.x), r1(h.z), X.kc]; X.b = null; X.bc = 2.5; }
      else if (X.b[2] <= 0) { const o = live.find(q => q.id !== h.id && Math.hypot(q.x - h.x, q.z - h.z) < 1.35); if (o) { X.b = [o.id, X.b[1], .9]; X.pass = (X.pass || 0) + 1; } }
    }
    if (X.ko.length > 8) X.ko = X.ko.slice(-8);
  },
  client(dt, t) {
    const s = (G.x && G.x.s) || []; L.tiles.forEach((tl, i) => {
      const st = s[i] || 0; tl.s.off = st === 1; const m = tl.s.mesh; if (!m) return;
      const ty = st === 1 ? -4 : -.6; m.position.y = lerp(m.position.y, ty, Math.min(1, dt * 3)) + (st === 2 ? Math.sin(t * 40) * .03 : 0);
      m.material = st === 2 ? mat('#c2410c', { emissive: '#7a1d00' }) : mat((Math.round((tl.x + 9.6) / 3.2) + Math.round((tl.z - 6.3) / 3.2)) % 2 ? '#6a5650' : '#5a4844');
    });
  },
};

FL.grocery = {
  id: 'grocery', name: 'Cart Chaos', hat: 'bag', blurb: 'Grab groceries off the giant shelves and bring them to the checkout. Runaway carts will flatten you!', time: d => Math.max(80, 120 - d * 3),
  goal: fetchGoal('groceries at checkout'),
  build(g, R) {
    const L = { env: { bg: '#e9f1ef', near: 30, far: 90, sky: '#ffffff', gnd: '#a8b5b2', hi: .95, si: .5 } };
    ground(g, -22, 22, 2.6, 52, '#dfe5e4'); walls(g, -22, 22, 2.6, 52, 8, '#9ec5bd');
    for (let x = -20; x <= 20; x += 2) for (let z = 4; z < 52; z += 2) if ((x + z) % 4 === 0) deco(g, mesh(BOX(), mat('#cfd8d6'), x, .005, z, 2, .01, 2));
    const sc = ['#e76f51', '#2a9d8f', '#e9c46a', '#8ab17d', '#f4a261'];
    [-16, -8, 0, 8, 16].forEach((x, i) => { box(g, x, 0, 30, 2.4, 5, 32, '#cfd3d6', { climb: 1 }); for (let y = 1.2; y < 5; y += 1.3) for (const s of [-1, 1]) deco(g, mesh(BOX(), mat(sc[(i + Math.floor(y)) % 5]), x + s * 1.21, y, 30, .05, .8, 31)); });
    box(g, -6, 0, 6.5, 3.5, 1.1, 1.4, '#3d405b'); box(g, 6, 0, 6.5, 3.5, 1.1, 1.4, '#3d405b');
    const sg = textPlane('CHECKOUT', 4, .8, '#e63946', '#fff'); sg.position.set(0, 3.6, 2.8); g.add(sg);
    L.zone = { x0: -3.5, x1: 3.5, z0: 3.2, z1: 9 }; zoneMark(g, L.zone, '#e63946');
    const spots = []; [-16, -8, 0, 8, 16].forEach(x => { for (let i = 0; i < 3; i++) spots.push({ x: x - .5 + R(), y: 5, z: 17 + R() * 26 }); });
    for (let i = 0; i < 6; i++) spots.push({ x: [-12, -4, 4, 12][i % 4] + R() * 2 - 1, y: 0, z: 14 + R() * 32 });
    L.items = pickSpots(R, spots, 13).map((s, k) => Object.assign(s, { kind: 'groc' }));
    L.aisles = [-12, -4, 4, 12];
    return L;
  },
  init(G, L, d, np) { initFetch(G, L, 6 + Math.floor(np / 2) + Math.floor(d / 2)); G.e = L.aisles.slice(0, 2 + Math.min(2, Math.floor(d / 2))).map((x, i) => ['cart', x, 0, 14 + i * 9, 0, i % 2 ? 1 : -1]); if (d >= 4) G.e.push(['cart', 0, 0, 10, Math.PI / 2, 1, 1]); G.x = {}; },
  tick(G, L, dt, d) {
    const sp = 6.5 + d * .35; G.e.forEach(e => {
      if (e[6]) { e[1] = r2(e[1] + e[5] * sp * dt); if (Math.abs(e[1]) > 19) { e[5] *= -1; e[1] = r2(clamp(e[1], -19, 19)); } e[4] = e[5] > 0 ? Math.PI / 2 : -Math.PI / 2; }
      else { e[3] = r2(e[3] + e[5] * sp * dt); if (e[3] > 47 || e[3] < 12) { e[5] *= -1; e[3] = r2(clamp(e[3], 12, 47)); } e[4] = e[5] > 0 ? 0 : Math.PI; }
    });
  },
};

FL.kitchen = {
  id: 'kitchen', name: "Giant's Kitchen", hat: 'chef', blurb: "You're tiny. Climb the giant cabinets and table to grab cookie crumbs, then bring them to the plate. The giant's hand slams down on counters!", time: d => Math.max(95, 140 - d * 3),
  goal: fetchGoal('crumbs on the plate'),
  build(g, R) {
    const L = { env: { bg: '#f6e6c8', near: 40, far: 120, sky: '#fff6e0', gnd: '#b08a5a', hi: .85, si: .7 }, killY: -20 };
    ground(g, -24, 24, 2.6, 44, '#e4d2b0'); walls(g, -24, 24, 2.6, 44, 34, '#f3dfb6');
    for (let x = -22; x <= 22; x += 4) for (let z = 5; z < 44; z += 4) if (((x + z) / 4) % 2 === 0) deco(g, mesh(BOX(), mat('#d6c098'), x, .005, z, 4, .01, 4));
    // lower cabinets + counter along the back
    box(g, -6, 0, 38.5, 36, 9, 10, '#a86b3c', { climb: 1 }); box(g, -6, 9, 38, 37, .8, 11, '#e9e4da');
    for (let x = -21; x <= 9; x += 6) deco(g, mesh(BOX(), mat('#8c5730'), x, 4.5, 33.45, 4.6, 7.5, .1));
    // fridge
    box(g, 18, 0, 36, 10, 19, 12, '#dfe7ea', { climb: 1 }); deco(g, mesh(BOX(), mat('#9aa7ad'), 13.2, 10, 30.4, .3, 4, .4));
    // table with flush legs
    box(g, -8, 0, 13.4, 1.2, 7, 1.2, '#7a4f2f', { climb: 1 }); box(g, 6, 0, 13.4, 1.2, 7, 1.2, '#7a4f2f', { climb: 1 }); box(g, -8, 0, 20.6, 1.2, 7, 1.2, '#7a4f2f', { climb: 1 }); box(g, 6, 0, 20.6, 1.2, 7, 1.2, '#7a4f2f', { climb: 1 });
    box(g, -1, 7, 17, 15.2, .8, 8.4, '#9b6a43', { climb: 1 });
    // book stairs up to the counter
    const bc = ['#3d5a80', '#ee6c4d', '#98c1d9', '#293241', '#e0fbfc', '#c44536', '#457b9d'];
    for (let i = 0; i < 7; i++) box(g, -19 + i * 1.6, 0, 31, 1.6, 1.2 * (i + 1), 3, bc[i]);
    // a mug and a cereal box on the counter
    box(g, 0, 9.8, 37, 3, 4, 3, '#e76f51', { climb: 1 }); box(g, -14, 9.8, 39, 5, 9, 2, '#f4d35e', { climb: 1 });
    deco(g, mesh(geo('plate', () => new THREE.CylinderGeometry(3.2, 2.8, .2, 24)), mat('#ffffff'), 0, .1, 6.2));
    L.zone = { x0: -3.2, x1: 3.2, z0: 3.2, z1: 9.2 };
    L.items = pickSpots(R, [{ x: -10, y: 9.8, z: 36 }, { x: 4, y: 9.8, z: 36.5 }, { x: -20, y: 9.8, z: 36 }, { x: 8, y: 9.8, z: 40 }, { x: 18, y: 19, z: 36 }, { x: 16, y: 19, z: 39 }, { x: -5, y: 7.8, z: 16 }, { x: 3, y: 7.8, z: 18 }, { x: 0, y: 13.8, z: 37 }, { x: -14, y: 18.8, z: 39 }, { x: -3, y: 9.8, z: 41 }], 9).map(s => Object.assign(s, { kind: 'crumb' }));
    return L;
  },
  init(G, L, d, np) { initFetch(G, L, 4 + Math.floor(np / 2) + Math.floor(d / 3)); G.e = []; G.x = { hs: 5 }; },
  tick(G, L, dt, d, PL) {
    G.x.hs -= dt;
    if (G.x.hs <= 0) { G.x.hs = Math.max(2.2, 5 - d * .3); const up = PL.filter(p => p.al && p.y > 5); const tg = up.length ? up[Math.floor(Math.random() * up.length)] : null;
      if (tg) G.e.push(['hand', r1(tg.x + rnd(-1, 1)), r1(groundBelow(tg.x, tg.z, tg.y + .5)), r1(tg.z + rnd(-1, 1)), r2(Math.random() * 6), 1.5]); }
    G.e.forEach(e => e[5] = r2(e[5] - dt)); G.e = G.e.filter(e => e[5] > -1.6);
  },
};

FL.jungle = {
  id: 'jungle', name: 'Jungle Floor', hat: 'banana', blurb: 'Collect the golden bananas. Most are up high, so climb the giant trees and cliffs. Coconuts fall where you stand!', time: d => Math.max(85, 120 - d * 3),
  goal: fetchGoal('golden bananas'),
  build(g, R) {
    const L = { env: { bg: '#a7d8a0', fog: '#bfe3b4', near: 25, far: 90, sky: '#eaffd8', gnd: '#3d6b2f', hi: .8, si: .9, sc: '#fff2c6' }, killY: -20 };
    ground(g, -26, 26, 2.6, 58, '#5f9e4a'); walls(g, -26, 26, 2.6, 58, 10, '#4a7a3c');
    const spots = [];
    [[-14, 18], [12, 22], [-6, 38], [16, 44], [-18, 48]].forEach(([x, z]) => {
      const h = 13 + R() * 5; box(g, x, 0, z, 3, h, 3, '#6b4a2b', { climb: 1 });
      deco(g, mesh(geo('canopy', () => new THREE.IcosahedronGeometry(1, 0)), mat('#2f7d32', { flatShading: true }), x, h + 1.5, z, 5, 3, 5));
      for (let k = 0; k < 3; k++) { const y = 4 + k * 4.2, s = k % 2 ? 1 : -1; box(g, x + s * 2.6, y, z, 2.6, .5, 2.2, '#5a3d22'); spots.push({ x: x + s * 3, y: y + .5, z }); }
      spots.push({ x, y: h, z });
    });
    for (let i = 0; i < 4; i++) { const x = -18 + i * 12 + R() * 4, z = 28 + R() * 6; for (let k = 0; k < 3; k++) box(g, x + k * 1.5, 0, z, 4 - k, 3 + k * 3, 4 - k, '#7b7364', { climb: 1 }); spots.push({ x: x + 3, y: 9, z }); }
    for (let i = 0; i < 14; i++) deco(g, mesh(geo('bush', () => new THREE.IcosahedronGeometry(1, 0)), mat('#3f8f4f', { flatShading: true }), -24 + R() * 48, .5, 6 + R() * 50, 1.5, 1, 1.5));
    for (let i = 0; i < 3; i++) spots.push({ x: -15 + R() * 30, y: 0, z: 10 + R() * 40 });
    L.items = pickSpots(R, spots, 11).map(s => Object.assign(s, { kind: 'banana' }));
    return L;
  },
  init(G, L, d, np) { G.i = L.items.map(it => [r2(it.x), r2(it.y), r2(it.z), 0, '']); G.nd = Math.min(L.items.length, 6 + Math.floor(np / 2) + Math.floor(d / 2)); G.e = []; G.x = { cs: 3 }; },
  tick(G, L, dt, d, PL) {
    G.x.cs -= dt;
    if (G.x.cs <= 0) { G.x.cs = Math.max(.8, 2.4 - d * .15); const al = PL.filter(p => p.al && !inCabin(p.x, p.y, p.z)); if (al.length) { const p = al[Math.floor(Math.random() * al.length)]; const x = p.x + rnd(-1.5, 1.5), z = p.z + rnd(-1.5, 1.5); G.e.push(['coco', r1(x), r1(groundBelow(x, z, p.y + 1)), r1(z), 0, 1.4]); } }
    G.e.forEach(e => e[5] = r2(e[5] - dt)); G.e = G.e.filter(e => e[5] > -.5);
  },
};

FL.void = {
  id: 'void', name: 'The Void', hat: 'halo', blurb: 'Hop across the floating platforms to touch the orb, then get everyone back. Purple platforms blink out!', time: d => Math.max(70, 95 - d * 2),
  goal: G => G.pr ? 'Orb touched! Get back to the elevator!' : 'Touch the orb at the end',
  build(g, R, d) {
    const L = { env: { bg: '#07040f', fog: '#140a2a', near: 20, far: 80, sky: '#b9a3ff', gnd: '#1a0f33', hi: .7, si: .5, sc: '#d0c2ff' }, killY: -16, plats: [] };
    box(g, 0, -1, 4.6, 5, 1, 4, '#3a3456');
    let x = 0, y = 0, z = 6.6;
    const n = 15 + Math.min(5, d);
    for (let i = 0; i < n; i++) {
      const gap = 1.8 + R() * 1.3, w = 2.4 + R() * 1.2; z += gap + w / 2; x = clamp(x + (R() - .5) * 5, -9, 9); y = clamp(y + (R() - .45) * 1.6, -2, 4);
      const blink = i > 1 && i < n - 1 && R() < .4 + Math.min(.3, d * .05);
      const s = box(g, x, y - .6, z, w, .6, w, blink ? '#8b5cf6' : '#4b4470'); L.plats.push({ s, blink, k: i, col: blink ? '#8b5cf6' : '#4b4470' }); z += w / 2;
    }
    z += 3.5; box(g, x, y - 1, z, 5, 1, 5, '#4b4470'); L.items = [{ x, y, z, kind: 'orb' }];
    const st = new THREE.BufferGeometry(), pts = []; for (let i = 0; i < 500; i++) pts.push((R() - .5) * 200, (R() - .5) * 120, z / 2 + (R() - .5) * 200);
    st.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.add(new THREE.Points(st, new THREE.PointsMaterial({ color: '#ffffff', size: .4 })));
    return L;
  },
  init(G, L) { G.i = L.items.map(it => [r2(it.x), r2(it.y), r2(it.z), 0, '']); G.nd = 1; G.e = []; G.x = {}; },
  tick() { },
  phase(p) { return ((G.tt || 0) * .8 + p.k * .53) % 3; },
  client(dt, t) { L.plats.forEach(p => { if (!p.blink) return; const ph = FL.void.phase(p); p.s.off = ph > 2.1; if (p.s.mesh) { p.s.mesh.visible = !p.s.off; p.s.mesh.material = (ph > 1.5 && Math.sin(t * 30) > 0) ? mat('#f0e6ff', { emissive: '#8b5cf6' }) : mat(p.col); } }); },
};

FL.heist = {
  id: 'heist', name: 'Casino Heist', hat: 'tophat', blurb: 'Rob the casino vault! Carry cash and gold into the elevator. Jump over the low lasers and dodge the tall ones.', time: d => Math.max(85, 120 - d * 3),
  goal: fetchGoal('loot in the elevator'),
  build(g, R) {
    const L = { env: { bg: '#120a14', near: 18, far: 60, sky: '#ffb3e6', gnd: '#2a0f20', hi: .55, si: .25, sc: '#ff9ad5' }, zone: CAB_ZONE };
    ground(g, -22, 22, 2.6, 52, '#5a1426'); walls(g, -22, 22, 2.6, 52, 8, '#2a1a2e');
    for (let i = 0; i < 6; i++) { const x = (i % 2 ? 1 : -1) * (7 + R() * 8), z = 10 + i * 4.5; box(g, x, 0, z, 3.4, 1, 2, '#1f6b3a'); box(g, x, 0, z, 3.8, .9, 2.4, '#5c3a1e', { nocol: 1 }); }
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) { const sm = box(g, s * 20.5, 0, 8 + k * 3, 1.6, 2.4, 1.6, '#3b2f63'); deco(g, mesh(BOX(), mat('#ffe14f', { emissive: '#ffb800', emissiveIntensity: .8 }), s * 19.68, 1.6, 8 + k * 3, .05, .7, 1)); }
    // vault
    box(g, -12, 0, 40, 20, 6, 1, '#8a8f99'); box(g, 12, 0, 40, 20, 6, 1, '#8a8f99'); deco(g, mesh(geo('vd', () => new THREE.CylinderGeometry(2, 2, .4, 20)), mat('#c7ccd4'), 4.5, 2, 40.6).rotateX(Math.PI / 2));
    const vs = textPlane('VAULT', 3, .8, '#111', '#ffe14f'); vs.position.set(0, 6.6, 39.45); vs.rotation.y = Math.PI; g.add(vs);
    const spots = []; for (let i = 0; i < 8; i++) spots.push({ x: -18 + R() * 36, y: 0, z: 42 + R() * 8, kind: i % 3 ? 'cash' : 'gold' });
    for (let i = 0; i < 5; i++) spots.push({ x: -18 + R() * 36, y: 0, z: 14 + R() * 22, kind: 'cash' });
    L.items = pickSpots(R, spots, 11);
    L.lasers = [[0, 22, 6, 0], [0, 36, 7, 1], [-11, 30, 5, 0], [11, 30, 5, 1], [-8, 46, 5, 0], [8, 46, 5, 0], [0, 14, 4, 1]];
    const nl = new THREE.PointLight('#ff4fa3', .7, 30); nl.position.set(0, 6, 25); g.add(nl);
    return L;
  },
  init(G, L, d, np) { initFetch(G, L, 5 + Math.floor(np / 2) + Math.floor(d / 2)); G.e = L.lasers.slice(0, 4 + Math.min(3, Math.floor(d / 2))).map(([x, z, len, tall], i) => ['laser', x, tall ? .1 : .5, z, i, len, tall]); G.x = {}; },
  tick(G, L, dt, d) { G.e.forEach((e, i) => { e[4] = r2((e[4] + dt * (.7 + d * .06) * (i % 2 ? -1 : 1)) % (Math.PI * 2)); }); },
};

const FLOOR_IDS = ['moving', 'fire', 'sea', 'mall', 'potato', 'grocery', 'kitchen', 'jungle', 'void', 'heist'];
