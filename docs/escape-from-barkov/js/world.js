/* Escape from Barkov — textures, world geometry, collision, navigation, maps */
'use strict';
(() => {
G.MAPS_META = {
  sawmill: { name: 'Sawmill', time: 40, desc: 'A lumber mill, its yard, the workers\' dorms and the rail line. Medium size, mixed ranges. Old Gnarl and his Knotheads run the dorms.', players: '6–9', diff: 'Medium', size: 260 },
  deadwood: { name: 'Deadwood', time: 45, desc: 'Dense old-growth forest around a black lake. A logging camp, a crashed cargo plane and a raider-held bunker. Long sightlines, nowhere to hide from sound.', players: '8–12', diff: 'Hard', size: 340 },
  pulp: { name: 'Pulp Factory', time: 20, desc: 'A dark, cramped paper pulp plant. Close quarters, loud, fast. Something in here grinds trees into mulch.', players: '4–6', diff: 'Very hard', size: 130 },
};

/* ---------- procedural textures ---------- */
const TX = {};
function canv(n = 256) { const c = document.createElement('canvas'); c.width = c.height = n; return [c, c.getContext('2d')]; }
function speck(x, n, cols, a = .25, sz = 2) { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = a * Math.random(); const s = 1 + Math.random() * sz; x.fillRect(Math.random() * 256, Math.random() * 256, s, s); } x.globalAlpha = 1; }
function mkTex(c, rep = 1) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; }
G.textures = () => {
  if (TX.done) return TX;
  let c, x;
  // grass / forest floor
  [c, x] = canv(); x.fillStyle = '#4a5530'; x.fillRect(0, 0, 256, 256); speck(x, 9000, ['#5d6b3a', '#3a4426', '#6a6a3a', '#2f3820', '#7a7048'], .5, 3);
  for (let i = 0; i < 400; i++) { x.strokeStyle = Math.random() < .5 ? '#6f7d40' : '#39432a'; x.globalAlpha = .5; x.beginPath(); const px = Math.random() * 256, py = Math.random() * 256; x.moveTo(px, py); x.lineTo(px + Math.random() * 4 - 2, py - 4 - Math.random() * 6); x.stroke(); } x.globalAlpha = 1;
  TX.grass = mkTex(c);
  [c, x] = canv(); x.fillStyle = '#5c5040'; x.fillRect(0, 0, 256, 256); speck(x, 9000, ['#6e6250', '#4a4034', '#7a6e5a', '#3c342a'], .6, 3); TX.dirt = mkTex(c);
  [c, x] = canv(); x.fillStyle = '#3a3a38'; x.fillRect(0, 0, 256, 256); speck(x, 12000, ['#444', '#2e2e2c', '#505050', '#262624'], .6, 2); x.fillStyle = '#c9b24a'; x.globalAlpha = .6; x.fillRect(124, 0, 8, 100); x.fillRect(124, 150, 8, 100); x.globalAlpha = 1; TX.asphalt = mkTex(c);
  // concrete
  [c, x] = canv(); x.fillStyle = '#8a8a82'; x.fillRect(0, 0, 256, 256); speck(x, 8000, ['#979790', '#7a7a72', '#6e6e66', '#a0a098'], .5, 2);
  for (let i = 0; i < 12; i++) { const g = x.createRadialGradient(Math.random() * 256, Math.random() * 256, 2, Math.random() * 256, Math.random() * 256, 60); g.addColorStop(0, 'rgba(60,55,40,.25)'); g.addColorStop(1, 'rgba(60,55,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
  x.strokeStyle = 'rgba(40,40,40,.4)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 128); x.strokeRect(0, 128, 256, 128); TX.concrete = mkTex(c);
  // planks
  [c, x] = canv(); for (let i = 0; i < 8; i++) { const b = 70 + Math.random() * 30; x.fillStyle = `rgb(${b + 40},${b + 15},${b - 20})`; x.fillRect(0, i * 32, 256, 32); for (let k = 0; k < 40; k++) { x.strokeStyle = 'rgba(40,25,10,.25)'; x.beginPath(); const yy = i * 32 + Math.random() * 32; x.moveTo(0, yy); x.bezierCurveTo(80, yy + 3, 160, yy - 3, 256, yy); x.stroke(); } x.fillStyle = 'rgba(20,10,0,.6)'; x.fillRect(0, i * 32, 256, 2); x.fillRect(Math.random() * 256, i * 32, 2, 32); }
  TX.planks = mkTex(c);
  // corrugated metal
  [c, x] = canv(); for (let i = 0; i < 32; i++) { const b = i % 2 ? 108 : 128; x.fillStyle = `rgb(${b - 10},${b},${b + 8})`; x.fillRect(i * 8, 0, 8, 256); } speck(x, 3000, ['#7a5a3a', '#5a4030'], .35, 4);
  for (let i = 0; i < 10; i++) { x.fillStyle = 'rgba(110,60,30,.25)'; x.fillRect(Math.random() * 256, Math.random() * 256, 6 + Math.random() * 20, 40 + Math.random() * 120); } TX.metal = mkTex(c);
  // brick
  [c, x] = canv(); x.fillStyle = '#6a6058'; x.fillRect(0, 0, 256, 256); for (let r = 0; r < 16; r++) for (let k = 0; k < 5; k++) { const v = 90 + Math.random() * 40; x.fillStyle = `rgb(${v + 40},${v * .55},${v * .45})`; x.fillRect(k * 56 + (r % 2) * 28 - 28, r * 16 + 1, 53, 14); } TX.brick = mkTex(c);
  // bark
  [c, x] = canv(); x.fillStyle = '#4a3422'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 90; i++) { x.strokeStyle = Math.random() < .5 ? '#2c1d12' : '#6a4c32'; x.lineWidth = 1 + Math.random() * 4; x.globalAlpha = .7; x.beginPath(); let px = Math.random() * 256; x.moveTo(px, 0); for (let y = 0; y <= 256; y += 32) { px += Math.random() * 10 - 5; x.lineTo(px, y); } x.stroke(); } x.globalAlpha = 1; TX.bark = mkTex(c);
  // leaves
  [c, x] = canv(); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 700; i++) { const v = 150 + Math.random() * 105; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.ellipse(Math.random() * 256, Math.random() * 256, 4 + Math.random() * 6, 2 + Math.random() * 3, Math.random() * 3, 0, 7); x.fill(); } TX.leaves = mkTex(c);
  // roof
  [c, x] = canv(); for (let i = 0; i < 16; i++) { const b = i % 2 ? 50 : 62; x.fillStyle = `rgb(${b},${b - 4},${b - 6})`; x.fillRect(i * 16, 0, 16, 256); } speck(x, 2000, ['#3a2a20'], .4, 5); TX.roof = mkTex(c);
  // tiles / linoleum
  [c, x] = canv(); x.fillStyle = '#6e6a58'; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++) { x.fillStyle = (i + k) % 2 ? '#7a7662' : '#625e4e'; x.fillRect(i * 32 + 1, k * 32 + 1, 30, 30); } speck(x, 3000, ['#4a4638', '#88846e'], .4, 2); TX.tiles = mkTex(c);
  // water
  [c, x] = canv(); x.fillStyle = '#1d2a28'; x.fillRect(0, 0, 256, 256); speck(x, 3000, ['#2a3c38', '#14201e', '#3a5048'], .5, 6); TX.water = mkTex(c);
  // painted plaster
  [c, x] = canv(); x.fillStyle = '#9a9478'; x.fillRect(0, 0, 256, 256); speck(x, 6000, ['#a8a286', '#8a846a', '#7a7058'], .45, 3); x.fillStyle = '#5a6a4a'; x.fillRect(0, 170, 256, 86); speck(x, 1000, ['#4a5a3a'], .4, 3); TX.plaster = mkTex(c);
  TX.done = true; return TX;
};

/* ---------- materials ---------- */
const MATS = {};
G.mat = (name) => {
  if (MATS[name]) return MATS[name]; const T = G.textures(); let m;
  const L = (o) => new THREE.MeshLambertMaterial(o);
  switch (name) {
    case 'grass': m = L({ map: T.grass }); break;
    case 'dirt': m = L({ map: T.dirt }); break;
    case 'asphalt': m = L({ map: T.asphalt }); break;
    case 'concrete': m = L({ map: T.concrete }); break;
    case 'planks': m = L({ map: T.planks }); break;
    case 'planksDark': m = L({ map: T.planks, color: 0x8a7a6a }); break;
    case 'metal': m = L({ map: T.metal }); break;
    case 'metalBlue': m = L({ map: T.metal, color: 0x7a90a8 }); break;
    case 'metalRed': m = L({ map: T.metal, color: 0xb06a50 }); break;
    case 'metalGreen': m = L({ map: T.metal, color: 0x7a9a6a }); break;
    case 'brick': m = L({ map: T.brick }); break;
    case 'bark': m = L({ map: T.bark }); break;
    case 'roof': m = L({ map: T.roof }); break;
    case 'tiles': m = L({ map: T.tiles }); break;
    case 'plaster': m = L({ map: T.plaster }); break;
    case 'water': m = new THREE.MeshPhongMaterial({ map: T.water, shininess: 90, specular: 0x667777, transparent: true, opacity: .92 }); break;
    case 'logs': m = L({ map: T.bark, color: 0xb09070 }); break;
    case 'dark': m = L({ color: 0x2a2a28 }); break;
    case 'rust': m = L({ map: T.metal, color: 0x9a5a3a }); break;
    case 'rock': m = L({ map: T.concrete, color: 0x7a786a }); break;
    default: m = L({ color: 0x888888 });
  }
  return MATS[name] = m;
};

/* ---------- world container ---------- */
G.newWorld = (mapId) => {
  const W = { map: mapId, meta: G.MAPS_META[mapId], boxes: [], hash: new Map(), HC: 6, batches: {}, loot: [], doors: [], spawns: { pmc: [], scav: [] }, extracts: [], zones: [], boss: null, visits: [], lights: [], props: [], trees: [], bushes: [], rocks: [], indoor: false, half: G.MAPS_META[mapId].size / 2 };
  W.group = new THREE.Group(); return W;
};
function hashAdd(W, i) { const b = W.boxes[i]; const H = W.HC; for (let cx = Math.floor(b.min[0] / H); cx <= Math.floor(b.max[0] / H); cx++) for (let cz = Math.floor(b.min[2] / H); cz <= Math.floor(b.max[2] / H); cz++) { const k = cx * 10007 + cz; let a = W.hash.get(k); if (!a) W.hash.set(k, a = []); a.push(i); } }
G.boxesNear = (W, x, z, r) => { const H = W.HC, out = new Set(); for (let cx = Math.floor((x - r) / H); cx <= Math.floor((x + r) / H); cx++) for (let cz = Math.floor((z - r) / H); cz <= Math.floor((z + r) / H); cz++) { const a = W.hash.get(cx * 10007 + cz); if (a) a.forEach(i => out.add(i)); } return out; };

// batched textured boxes with world-space UVs
function batch(W, mat) { let b = W.batches[mat]; if (!b) b = W.batches[mat] = { p: [], n: [], u: [], i: [], mat }; return b; }
function pushBox(b, x0, y0, z0, x1, y1, z1, s, noBottom) {
  const F = [
    [[1, 0, 0], [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], (p) => [p[2], p[1]]],
    [[-1, 0, 0], [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], (p) => [p[2], p[1]]],
    [[0, 1, 0], [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], (p) => [p[0], p[2]]],
    [[0, -1, 0], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], (p) => [p[0], p[2]]],
    [[0, 0, 1], [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], (p) => [p[0], p[1]]],
    [[0, 0, -1], [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], (p) => [p[0], p[1]]],
  ];
  F.forEach(([n, vs, uv], fi) => {
    if (noBottom && fi === 3) return;
    const base = b.p.length / 3; vs.forEach(v => { b.p.push(v[0], v[1], v[2]); b.n.push(n[0], n[1], n[2]); const t = uv(v); b.u.push(t[0] / s, t[1] / s); });
    b.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });
}
G.buildBatches = W => {
  for (const k in W.batches) {
    const b = W.batches[k]; if (!b.p.length) continue; const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2)); g.setIndex(b.i);
    g.computeBoundingSphere(); const m = new THREE.Mesh(g, G.mat(b.mat)); m.castShadow = k !== 'grass' && k !== 'water' && k !== 'asphalt' && k !== 'dirt'; m.receiveShadow = true; W.group.add(m);
  }
  W.batches = {};
};

/* ---------- builder ---------- */
G.builder = (W, seed) => {
  const r = G.rng(seed); const B = { r };
  // add a box. opts: solid, opaque, mat, uv, surf, visible
  B.box = (x0, y0, z0, x1, y1, z1, mat, o = {}) => {
    if (x0 > x1) [x0, x1] = [x1, x0]; if (z0 > z1) [z0, z1] = [z1, z0]; if (y0 > y1) [y0, y1] = [y1, y0];
    if (mat && o.visible !== false) pushBox(batch(W, mat), x0, y0, z0, x1, y1, z1, o.uv || 2.5, y0 <= .01);
    const solid = o.solid !== false, opaque = o.opaque !== false;
    if (solid || opaque) { const i = W.boxes.length; W.boxes.push({ min: [x0, y0, z0], max: [x1, y1, z1], solid, opaque, surf: o.surf || surfOf(mat), door: o.door || null, nav: o.nav !== false }); hashAdd(W, i); return i; }
    return -1;
  };
  B.ground = (mat = 'grass', uv = 6) => { const h = W.half + 60; pushBox(batch(W, mat), -h, -1, -h, h, 0, h, uv, true); };
  B.flat = (x0, z0, x1, z1, mat, y = .02, uv = 4) => pushBox(batch(W, mat), Math.min(x0, x1), 0, Math.min(z0, z1), Math.max(x0, x1), y, Math.max(z0, z1), uv, true);
  // wall along x (z fixed) from x0..x1 with gaps [{at, w, h, door?, key?, win?}]
  B.wallX = (x0, x1, z, h, t, mat, gaps = [], y0 = 0) => { wallSeg(x0, x1, z, h, t, mat, gaps, 'x', y0); };
  B.wallZ = (z0, z1, x, h, t, mat, gaps = [], y0 = 0) => { wallSeg(z0, z1, x, h, t, mat, gaps, 'z', y0); };
  function wallSeg(a0, a1, c, h, t, mat, gaps, ax, y0) {
    gaps = gaps.slice().sort((p, q) => p.at - q.at); let cur = a0;
    const add = (p0, p1, yy0, yy1) => { if (p1 - p0 < .01 || yy1 - yy0 < .01) return; if (ax === 'x') B.box(p0, yy0, c - t / 2, p1, yy1, c + t / 2, mat); else B.box(c - t / 2, yy0, p0, c + t / 2, yy1, p1, mat); };
    for (const g of gaps) {
      const g0 = a0 + g.at - g.w / 2, g1 = a0 + g.at + g.w / 2; add(cur, g0, y0, y0 + h);
      if (g.win) { add(g0, g1, y0, y0 + (g.sill || 1)); add(g0, g1, y0 + (g.top || 2.1), y0 + h); }
      else { const gh = g.h || 2.2; add(g0, g1, y0 + gh, y0 + h); if (g.door) B.door(ax, (g0 + g1) / 2, c, g.w, gh, g.key, g.open, mat === 'metal' || g.metal); }
      cur = g1;
    }
    add(cur, a1, y0, y0 + h);
  }
  // a hinged door in a gap
  B.door = (ax, a, c, w, h, key, open, metal) => {
    const x = ax === 'x' ? a : c, z = ax === 'x' ? c : a; const t = .08;
    const bi = B.box(ax === 'x' ? x - w / 2 : x - t, 0, ax === 'x' ? z - t : z - w / 2, ax === 'x' ? x + w / 2 : x + t, h, ax === 'x' ? z + t : z + w / 2, null, { surf: metal ? 'metal' : 'wood' });
    const pivot = new THREE.Group(); pivot.position.set(ax === 'x' ? x - w / 2 : x, 0, ax === 'x' ? z : z - w / 2);
    const geo = new THREE.BoxGeometry(ax === 'x' ? w : t * 1.5, h, ax === 'x' ? t * 1.5 : w); geo.translate(ax === 'x' ? w / 2 : 0, h / 2, ax === 'x' ? 0 : w / 2);
    const mesh = new THREE.Mesh(geo, metal ? G.mat('metalBlue') : G.mat(key ? 'planksDark' : 'planks')); mesh.castShadow = true; pivot.add(mesh);
    if (key) { const lk = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, .2), new THREE.MeshLambertMaterial({ color: 0xc9a227 })); lk.position.set(ax === 'x' ? w * .85 : 0, 1, ax === 'x' ? 0 : w * .85); pivot.add(lk); }
    W.group.add(pivot);
    const d = { i: W.doors.length, bi, pivot, ax, x, z, w, key: key || null, open: false, ang: 0, target: 0 };
    W.boxes[bi].door = d; W.doors.push(d);
    if (open && !key) G.setDoor(W, d, true, true);
    return d;
  };
  // building with 4 walls + floor + roof. doors/wins: {s:'n'|'s'|'e'|'w', at, w, ...}
  B.building = (x, z, w, d, h, o = {}) => {
    const t = o.t || .3, wall = o.wall || 'concrete', x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
    const gs = s => (o.gaps || []).filter(g => g.s === s);
    B.wallX(x0, x1, z0, h, t, wall, gs('n')); B.wallX(x0, x1, z1, h, t, wall, gs('s'));
    B.wallZ(z0 + t / 2, z1 - t / 2, x0, h, t, wall, gs('w')); B.wallZ(z0 + t / 2, z1 - t / 2, x1, h, t, wall, gs('e'));
    if (o.floor !== false) B.flat(x0, z0, x1, z1, o.floor || 'planks', .03, 3);
    if (o.roof !== false) B.box(x0 - .3, h, z0 - .3, x1 + .3, h + .25, z1 + .3, o.roof || 'roof', { solid: true, opaque: true, nav: false });
    return { x0, x1, z0, z1 };
  };
  B.crate = (x, z, s = 1, mat = 'planks', y = 0) => B.box(x - s / 2, y, z - s / 2, x + s / 2, y + s, z + s / 2, mat, { uv: 1.5 });
  B.logs = (x, z, len, ax = 'x', n = 3) => { for (let i = 0; i < n; i++) { const hh = .6 * (i + 1); if (ax === 'x') B.box(x - len / 2, 0, z - 1.2 + i * .3, x + len / 2, hh, z + 1.2 - i * .3, 'logs', { uv: 1.2 }); else B.box(x - 1.2 + i * .3, 0, z - len / 2, x + 1.2 - i * .3, hh, z + len / 2, 'logs', { uv: 1.2 }); } };
  B.planks = (x, z, w, d, h) => B.box(x - w / 2, 0, z - d / 2, x + w / 2, h, z + d / 2, 'planks', { uv: 1.5 });
  B.container = (x, z, ax = 'x', mat = 'metalRed') => { // shipping container, open at one end
    const L = 12, Wd = 2.4, H = 2.6, t = .1;
    if (ax === 'x') { B.box(x - L / 2, 0, z - Wd / 2, x + L / 2, H, z - Wd / 2 + t, mat); B.box(x - L / 2, 0, z + Wd / 2 - t, x + L / 2, H, z + Wd / 2, mat); B.box(x - L / 2, 0, z - Wd / 2, x - L / 2 + t, H, z + Wd / 2, mat); B.box(x - L / 2, H - t, z - Wd / 2, x + L / 2, H, z + Wd / 2, mat, { nav: false }); }
    else { B.box(x - Wd / 2, 0, z - L / 2, x - Wd / 2 + t, H, z + L / 2, mat); B.box(x + Wd / 2 - t, 0, z - L / 2, x + Wd / 2, H, z + L / 2, mat); B.box(x - Wd / 2, 0, z - L / 2, x + Wd / 2, H, z - L / 2 + t, mat); B.box(x - Wd / 2, H - t, z - L / 2, x + Wd / 2, H, z + L / 2, mat, { nav: false }); }
  };
  B.car = (x, z, ax = 'x', mat = 'metalBlue') => { const L = 4.4, Wd = 1.8; if (ax === 'x') { B.box(x - L / 2, .3, z - Wd / 2, x + L / 2, 1.0, z + Wd / 2, mat, { uv: 1 }); B.box(x - L / 4, 1.0, z - Wd / 2 + .1, x + L / 4, 1.5, z + Wd / 2 - .1, 'dark'); } else { B.box(x - Wd / 2, .3, z - L / 2, x + Wd / 2, 1.0, z + L / 2, mat, { uv: 1 }); B.box(x - Wd / 2 + .1, 1.0, z - L / 4, x + Wd / 2 - .1, 1.5, z + L / 4, 'dark'); } };
  B.truck = (x, z, ax = 'x') => { if (ax === 'x') { B.box(x - 4, .4, z - 1.2, x + 2, 2.8, z + 1.2, 'metalGreen'); B.box(x + 2, .4, z - 1.2, x + 4.2, 2.4, z + 1.2, 'metalGreen'); } else { B.box(x - 1.2, .4, z - 4, x + 1.2, 2.8, z + 2, 'metalGreen'); B.box(x - 1.2, .4, z + 2, x + 1.2, 2.4, z + 4.2, 'metalGreen'); } };
  B.fence = (x0, z0, x1, z1, h = 2.2, mat = 'planksDark', gaps) => { if (Math.abs(z1 - z0) < .01) B.wallX(Math.min(x0, x1), Math.max(x0, x1), z0, h, .12, mat, gaps); else B.wallZ(Math.min(z0, z1), Math.max(z0, z1), x0, h, .12, mat, gaps); };
  B.tree = (x, z, s = 1) => { W.trees.push([x, z, s]); B.box(x - .32 * s, 0, z - .32 * s, x + .32 * s, 6 * s, z + .32 * s, null, { surf: 'wood' }); };
  B.bush = (x, z, s = 1) => { W.bushes.push([x, z, s]); B.box(x - .9 * s, 0, z - .9 * s, x + .9 * s, 1.4 * s, z + .9 * s, null, { solid: false, opaque: true, nav: true }); };
  B.rock = (x, z, s = 1) => { W.rocks.push([x, z, s]); B.box(x - .9 * s, 0, z - .9 * s, x + .9 * s, 1.3 * s, z + .9 * s, null, { surf: 'concrete' }); };
  B.forest = (x0, z0, x1, z1, n, keepOut = []) => { for (let i = 0; i < n; i++) { const x = G.lerp(x0, x1, r()), z = G.lerp(z0, z1, r()); if (keepOut.some(k => Math.abs(x - k[0]) < k[2] && Math.abs(z - k[1]) < k[3])) continue; if (r() < .78) B.tree(x, z, .8 + r() * .7); else if (r() < .7) B.bush(x, z, .7 + r() * .6); else B.rock(x, z, .6 + r()); } };
  B.loot = (x, y, z, type, o = {}) => { W.loot.push(Object.assign({ x, y, z, type }, o)); };
  B.extract = (name, x, z, rad, o = {}) => W.extracts.push(Object.assign({ name, x, z, r: rad, kind: 'always', who: 'pmc', time: 7 }, o));
  B.lamp = (x, y, z, int = 1.2, dist = 18, col = 0xffd9a0) => W.lights.push({ x, y, z, int, dist, col });
  return B;
};
function surfOf(m) { if (!m) return 'dirt'; if (m.startsWith('metal') || m === 'rust') return 'metal'; if (m.startsWith('plank') || m === 'logs') return 'wood'; if (m === 'concrete' || m === 'brick' || m === 'tiles' || m === 'plaster' || m === 'asphalt') return 'concrete'; return 'dirt'; }

G.setDoor = (W, d, open, instant) => {
  d.open = open; d.target = open ? (d.ax === 'x' ? -Math.PI / 2 : Math.PI / 2) : 0; if (instant) { d.ang = d.target; d.pivot.rotation.y = d.ang; }
  const b = W.boxes[d.bi]; b.solid = !open; b.opaque = !open;
  if (W.nav) G.navDoor(W, d);
};

/* ---------- scenery instancing (trees, bushes, rocks) ---------- */
G.buildScenery = (W) => {
  const T = G.textures(); const dummy = new THREE.Object3D();
  if (W.trees.length) {
    const trunkG = new THREE.CylinderGeometry(.22, .36, 6, 7); trunkG.translate(0, 3, 0);
    const trunk = new THREE.InstancedMesh(trunkG, G.mat('bark'), W.trees.length); trunk.castShadow = true; trunk.receiveShadow = true;
    const crownG = new THREE.IcosahedronGeometry(1, 1); const crownM = new THREE.MeshLambertMaterial({ map: T.leaves, color: 0x4a6a2a });
    const n2 = W.trees.length * 3; const crown = new THREE.InstancedMesh(crownG, crownM, n2); crown.castShadow = true; crown.receiveShadow = true;
    const r = G.rng(99); let ci = 0; const col = new THREE.Color();
    W.trees.forEach(([x, z, s], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(0, r() * 6, 0); dummy.scale.set(s, s * (.9 + r() * .4), s); dummy.updateMatrix(); trunk.setMatrixAt(i, dummy.matrix);
      const pine = r() < .5;
      for (let k = 0; k < 3; k++) {
        if (pine) { dummy.position.set(x, (3 + k * 1.5) * s, z); dummy.scale.set((2.2 - k * .6) * s, 1.4 * s, (2.2 - k * .6) * s); }
        else { dummy.position.set(x + (r() - .5) * 1.6 * s, (5 + r() * 1.5) * s, z + (r() - .5) * 1.6 * s); dummy.scale.setScalar((1.6 + r()) * s); }
        dummy.rotation.set(r(), r() * 6, r()); dummy.updateMatrix(); crown.setMatrixAt(ci, dummy.matrix);
        col.setHSL(.22 + r() * .08, .45, .25 + r() * .12); if (crown.setColorAt) crown.setColorAt(ci, col); ci++;
      }
    });
    trunk.instanceMatrix.needsUpdate = true; crown.instanceMatrix.needsUpdate = true; if (crown.instanceColor) crown.instanceColor.needsUpdate = true;
    W.group.add(trunk); W.group.add(crown);
  }
  if (W.bushes.length) {
    const g = new THREE.IcosahedronGeometry(1, 1); const m = new THREE.MeshLambertMaterial({ map: T.leaves, color: 0x3e5a26 });
    const im = new THREE.InstancedMesh(g, m, W.bushes.length); im.castShadow = true; im.receiveShadow = true; const r = G.rng(77);
    W.bushes.forEach(([x, z, s], i) => { dummy.position.set(x, .6 * s, z); dummy.rotation.set(r(), r() * 6, 0); dummy.scale.set(1.1 * s, .85 * s, 1.1 * s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.instanceMatrix.needsUpdate = true; W.group.add(im);
  }
  if (W.rocks.length) {
    const g = new THREE.DodecahedronGeometry(1, 0); const im = new THREE.InstancedMesh(g, G.mat('rock'), W.rocks.length); im.castShadow = true; im.receiveShadow = true; const r = G.rng(55);
    W.rocks.forEach(([x, z, s], i) => { dummy.position.set(x, .45 * s, z); dummy.rotation.set(r(), r() * 6, r()); dummy.scale.set(1.1 * s, .8 * s, 1.1 * s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    im.instanceMatrix.needsUpdate = true; W.group.add(im);
  }
};

/* ---------- navigation grid (1 m) ---------- */
G.buildNav = W => {
  const res = 1, half = W.half; const n = Math.ceil(half * 2 / res);
  W.nav = { res, n, o: -half, b: new Uint8Array(n * n) };
  W.boxes.forEach(b => G.navMarkBox(W, b, true));
  W.doors.forEach(d => G.navDoor(W, d));
  // borders
  for (let i = 0; i < n; i++) { W.nav.b[i] = W.nav.b[(n - 1) * n + i] = W.nav.b[i * n] = W.nav.b[i * n + n - 1] = 1; }
};
G.navMarkBox = (W, b, initial) => {
  const N = W.nav; const pad = .35;
  const x0 = Math.floor((b.min[0] - pad - N.o) / N.res), x1 = Math.floor((b.max[0] + pad - N.o) / N.res), z0 = Math.floor((b.min[2] - pad - N.o) / N.res), z1 = Math.floor((b.max[2] + pad - N.o) / N.res);
  const blocks = b.solid && b.nav && b.min[1] < 1.6 && b.max[1] > .45;
  if (initial && !blocks && !b.door) return;
  for (let x = Math.max(0, x0); x <= Math.min(N.n - 1, x1); x++) for (let z = Math.max(0, z0); z <= Math.min(N.n - 1, z1); z++) {
    if (b.door) { N.b[z * N.n + x] = b.door.key && !b.door.open ? 1 : (initial ? N.b[z * N.n + x] : 0); continue; }
    if (blocks) N.b[z * N.n + x] = 1;
  }
};
G.navDoor = (W, d) => {
  const N = W.nav; const free = !d.key || d.open; const v = free ? 0 : 1;
  for (let a = -d.w / 2 + .15; a <= d.w / 2 - .15; a += .25) for (let p = -1.2; p <= 1.2; p += .25) {
    const x = d.ax === 'x' ? d.x + a : d.x + p, z = d.ax === 'x' ? d.z + p : d.z + a; const cx = Math.floor((x - N.o) / N.res), cz = Math.floor((z - N.o) / N.res);
    if (cx < 0 || cz < 0 || cx >= N.n || cz >= N.n) continue;
    if (free) N.b[cz * N.n + cx] = 0; else if (Math.abs(p) < .4) N.b[cz * N.n + cx] = 1;
  }
};
G.navCell = (W, x, z) => { const N = W.nav; return [Math.floor((x - N.o) / N.res), Math.floor((z - N.o) / N.res)]; };
G.navFree = (W, cx, cz) => { const N = W.nav; return cx >= 0 && cz >= 0 && cx < N.n && cz < N.n && !N.b[cz * N.n + cx]; };
// A* with binary heap; returns array of [x,z] world waypoints
G.path = (W, sx, sz, tx, tz, maxIt = 6000) => {
  const N = W.nav; let [ax, az] = G.navCell(W, sx, sz), [bx, bz] = G.navCell(W, tx, tz);
  const near = (cx, cz) => { if (G.navFree(W, cx, cz)) return [cx, cz]; for (let r = 1; r < 4; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (G.navFree(W, cx + dx, cz + dz)) return [cx + dx, cz + dz]; return null; };
  const a = near(ax, az), b = near(bx, bz); if (!a || !b) return null;[ax, az] = a;[bx, bz] = b;
  const n = N.n, start = az * n + ax, goal = bz * n + bx;
  const g = new Map(), came = new Map(), heap = [];
  const push = (k, f) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break;[heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const hh = k => { const x = k % n, z = (k / n) | 0; const dx = Math.abs(x - bx), dz = Math.abs(z - bz); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); };
  g.set(start, 0); push(start, hh(start)); let it = 0; let found = false;
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length && it++ < maxIt) {
    const [, k] = pop(); if (k === goal) { found = true; break; }
    const x = k % n, z = (k / n) | 0; const gk = g.get(k);
    for (const [dx, dz, c] of D) {
      const nx = x + dx, nz = z + dz; if (!G.navFree(W, nx, nz)) continue;
      if (dx && dz && (!G.navFree(W, x + dx, z) || !G.navFree(W, x, z + dz))) continue;
      const nk = nz * n + nx, ng = gk + c; if (g.has(nk) && g.get(nk) <= ng) continue;
      g.set(nk, ng); came.set(nk, k); push(nk, ng + hh(nk));
    }
  }
  if (!found) return null;
  const pts = []; let k = goal; while (k !== start && k != null) { pts.push(k); k = came.get(k); } pts.reverse();
  // string pulling: keep corners only
  const toW = k => [(k % n) * N.res + N.o + N.res / 2, ((k / n) | 0) * N.res + N.o + N.res / 2];
  const out = []; let last = [sx, sz];
  for (let i = 0; i < pts.length; i++) { const p = toW(pts[i]); const nxt = pts[i + 1] != null ? toW(pts[i + 1]) : null; if (!nxt || !G.navLine(W, last[0], last[1], nxt[0], nxt[1])) { out.push(p); last = p; } }
  return out;
};
G.navLine = (W, x0, z0, x1, z1) => { const d = Math.hypot(x1 - x0, z1 - z0); const st = Math.ceil(d / .4); for (let i = 1; i <= st; i++) { const t = i / st; const [cx, cz] = G.navCell(W, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); if (!G.navFree(W, cx, cz)) return false; } return true; };
G.randomFree = (W, x, z, r, rr = Math.random) => { for (let i = 0; i < 40; i++) { const a = rr() * 6.283, d = rr() * r; const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d; const [cx, cz] = G.navCell(W, px, pz); if (G.navFree(W, cx, cz) && G.navFree(W, cx + 1, cz) && G.navFree(W, cx, cz + 1)) return [px, pz]; } return [x, z]; };

/* ---------- ray casting vs boxes (2D DDA over hash, 3D slab test) ---------- */
G.rayBox = (o, d, b, tmax) => {
  let t0 = 0, t1 = tmax;
  for (let a = 0; a < 3; a++) { const inv = 1 / (d[a] || 1e-9); let ta = (b.min[a] - o[a]) * inv, tb = (b.max[a] - o[a]) * inv; if (ta > tb) { const s = ta; ta = tb; tb = s; } if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return -1; }
  return t0;
};
// mode: 'solid' (bullets/movement) or 'opaque' (vision). returns {t, b} or null
G.rayWorld = (W, o, d, tmax, mode = 'solid') => {
  const H = W.HC; let cx = Math.floor(o[0] / H), cz = Math.floor(o[2] / H);
  const sx = d[0] > 0 ? 1 : -1, sz = d[2] > 0 ? 1 : -1;
  const tdx = Math.abs(H / (d[0] || 1e-9)), tdz = Math.abs(H / (d[2] || 1e-9));
  let tx = ((sx > 0 ? (cx + 1) * H : cx * H) - o[0]) / (d[0] || 1e-9), tz = ((sz > 0 ? (cz + 1) * H : cz * H) - o[2]) / (d[2] || 1e-9);
  if (!isFinite(tx)) tx = 1e9; if (!isFinite(tz)) tz = 1e9;
  let best = null, bt = tmax; const seen = new Set(); let tcell = 0;
  for (let step = 0; step < 400; step++) {
    const a = W.hash.get(cx * 10007 + cz);
    if (a) for (const i of a) { if (seen.has(i)) continue; seen.add(i); const b = W.boxes[i]; if (mode === 'solid' ? !b.solid : !b.opaque) continue; const t = G.rayBox(o, d, b, bt); if (t >= 0 && t < bt) { bt = t; best = b; } }
    tcell = Math.min(tx, tz); if (best && bt <= tcell) break; if (tcell > tmax) break;
    if (tx < tz) { tx += tdx; cx += sx; } else { tz += tdz; cz += sz; }
  }
  if (o[1] + d[1] * bt < 0 && d[1] < 0) { const tg = -o[1] / d[1]; if (tg < bt) return { t: tg, b: null, ground: true }; }
  return best ? { t: bt, b: best } : (d[1] < 0 ? (() => { const tg = -o[1] / d[1]; return tg < tmax ? { t: tg, b: null, ground: true } : null; })() : null);
};
G.los = (W, a, b) => { const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const L = Math.hypot(...d); if (L < .01) return true; d[0] /= L; d[1] /= L; d[2] /= L; const h = G.rayWorld(W, a, d, L, 'opaque'); return !h || h.t >= L - .05; };

/* ---------- circle-vs-box collision for movers ---------- */
G.collide = (W, p, rad, feet, height, vy) => {
  // returns ground height under p; pushes p out of boxes
  let ground = 0; const near = G.boxesNear(W, p.x, p.z, rad + 1);
  for (let pass = 0; pass < 2; pass++) for (const i of near) {
    const b = W.boxes[i]; if (!b.solid) continue;
    if (b.max[1] <= feet + .42) { // can step onto it
      if (p.x + rad * .6 > b.min[0] && p.x - rad * .6 < b.max[0] && p.z + rad * .6 > b.min[2] && p.z - rad * .6 < b.max[2]) ground = Math.max(ground, b.max[1]);
      continue;
    }
    if (b.min[1] >= feet + height) continue;
    const cx = G.clamp(p.x, b.min[0], b.max[0]), cz = G.clamp(p.z, b.min[2], b.max[2]);
    let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= rad * rad) continue;
    if (d2 < 1e-8) { // centre inside box: push out shortest axis
      const pl = [p.x - b.min[0], b.max[0] - p.x, p.z - b.min[2], b.max[2] - p.z]; const m = Math.min(...pl); const k = pl.indexOf(m);
      if (k === 0) p.x = b.min[0] - rad; else if (k === 1) p.x = b.max[0] + rad; else if (k === 2) p.z = b.min[2] - rad; else p.z = b.max[2] + rad; continue;
    }
    const d = Math.sqrt(d2); const push = rad - d; p.x += dx / d * push; p.z += dz / d * push;
  }
  const lim = W.half - 1; p.x = G.clamp(p.x, -lim, lim); p.z = G.clamp(p.z, -lim, lim);
  return ground;
};
G.ceilingAbove = (W, p, rad, feet) => { let c = 99; for (const i of G.boxesNear(W, p.x, p.z, rad)) { const b = W.boxes[i]; if (!b.solid) continue; if (p.x + rad > b.min[0] && p.x - rad < b.max[0] && p.z + rad > b.min[2] && p.z - rad < b.max[2] && b.min[1] > feet + .3) c = Math.min(c, b.min[1]); } return c; };
G.surfaceAt = (W, x, z) => { for (const i of G.boxesNear(W, x, z, .2)) { const b = W.boxes[i]; if (x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2] && b.max[1] > 2) return 'concrete'; } return W.surfAt ? W.surfAt(x, z) : 'dirt'; };

/* ================== MAPS ================== */
G.MAPS = {};

/* ---------- SAWMILL ---------- */
G.MAPS.sawmill = W => {
  const B = G.builder(W, 1234); const r = B.r;
  B.ground('grass', 7);
  W.surfAt = (x, z) => (Math.abs(z - 40) < 5 || Math.abs(x - 30) < 4) ? 'concrete' : 'dirt';
  // roads
  B.flat(-130, 35, 130, 45, 'asphalt', .025, 10); B.flat(26, -130, 34, 35, 'asphalt', .024, 10);
  B.flat(-60, -95, 40, -25, 'dirt', .015, 6); B.flat(-40, 75, 80, 95, 'dirt', .015, 6);
  // ---- Sawmill hall (centre) ----
  const hx = 0, hz = 0, hw = 48, hd = 22, hh = 8;
  B.building(hx, hz, hw, hd, hh, { wall: 'metal', floor: 'concrete', gaps: [{ s: 'w', at: hd / 2, w: 6, h: 5 }, { s: 'e', at: hd / 2, w: 6, h: 5 }, { s: 's', at: 10, w: 1.4, door: true, open: true }, { s: 's', at: 38, w: 1.4, door: true }, { s: 'n', at: 6, w: 1.4, door: true, open: true }, { s: 's', at: 24, w: 2, win: true, sill: 1.6, top: 3 }, { s: 'n', at: 30, w: 2, win: true, sill: 1.6, top: 3 }] });
  // machines
  for (let i = 0; i < 3; i++) { B.box(-16 + i * 12, 0, -2.5, -10 + i * 12, 1.1, 2.5, 'metalGreen', { uv: 1 }); B.box(-14 + i * 12, 1.1, -.2, -12 + i * 12, 2.2, .2, 'metal'); }
  B.box(-22, 0, 6, 22, .9, 7.2, 'rust', { uv: 1 }); // conveyor
  B.planks(-18, -7, 4, 2, 1.5); B.planks(16, -7, 4, 2, 2.2); B.planks(18, 8.5, 3, 2, 1.2); B.crate(-20, 8.5, 1.2); B.crate(-18.6, 8.5, 1); B.crate(10, -8, 1.4);
  B.loot(-18, 1.5, -7, 'crate'); B.loot(10, 1.4, -8, 'toolbox'); B.loot(18, 1.2, 8.5, 'ammobox'); B.loot(-4, 1.1, 0, 'loose'); B.loot(20, 0, -3, 'weaponbox'); B.loot(-21, 0, 0, 'ration');
  // office block north of hall
  const ox = -12, oz = -17;
  B.building(ox, oz, 20, 10, 3.2, { wall: 'plaster', floor: 'tiles', gaps: [{ s: 's', at: 4, w: 1.2, door: true, open: true }, { s: 'n', at: 3, w: 1.6, win: true }, { s: 'n', at: 10, w: 1.6, win: true }, { s: 'n', at: 17, w: 1.6, win: true }, { s: 'w', at: 5, w: 1.2, door: true }] });
  B.wallZ(oz - 5, oz + 5, ox - 2, 3.2, .2, 'plaster', [{ at: 7.5, w: 1.1, door: true, open: true }]);
  B.wallZ(oz - 5, oz + 5, ox + 4, 3.2, .2, 'plaster', [{ at: 7.5, w: 1.1, door: true, key: 'key_office' }]);
  B.box(ox - 8, 0, oz - 4, ox - 5, .8, oz - 3, 'planksDark'); B.loot(ox - 6.5, .8, oz - 3.5, 'pc'); B.loot(ox - 9, 0, oz + 2, 'filecab'); B.loot(ox - 4, 0, oz - 4, 'jacket');
  B.box(ox, 0, oz - 4.2, ox + 3, .8, oz - 3.2, 'planksDark'); B.loot(ox + 1.5, .8, oz - 3.7, 'pc'); B.loot(ox + 1, 0, oz + 3.5, 'medbag');
  B.box(ox + 6, 0, oz - 4.3, ox + 9.5, .8, oz - 3.2, 'planksDark'); B.loot(ox + 9, 0, oz + 3.5, 'safe'); B.loot(ox + 7.5, .8, oz - 3.7, 'pc'); B.loot(ox + 5, 0, oz + 3.8, 'filecab', { rich: true }); B.loot(ox + 8, .8, oz - 3.6, 'loose', { rich: true });
  // ---- lumber yard (north) ----
  for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) { const x = -55 + i * 18 + r() * 3, z = -40 - k * 18 + r() * 3; if (r() < .7) B.logs(x, z, 10 + r() * 4, r() < .5 ? 'x' : 'z', 2 + Math.floor(r() * 2)); else B.planks(x, z, 6, 3, 1.4 + r() * 1.2); }
  B.truck(-30, -70, 'x'); B.truck(5, -35, 'z'); B.loot(-26, 0, -67.5, 'toolbox'); B.loot(-40, 0, -52, 'crate'); B.loot(-5, 0, -80, 'crate'); B.loot(15, 0, -58, 'loose');
  B.building(-50, -88, 10, 6, 3, { wall: 'planks', gaps: [{ s: 's', at: 5, w: 1.3, door: true, open: true }, { s: 'e', at: 3, w: 1.2, win: true }] }); B.loot(-53, 0, -90, 'toolbox'); B.loot(-47, 0, -90, 'jacket');
  // ---- warehouses (east) ----
  [[75, -30], [75, 10]].forEach(([x, z], i) => {
    B.building(x, z, 30, 16, 7, { wall: i ? 'metalBlue' : 'metal', floor: 'concrete', gaps: [{ s: 'w', at: 8, w: 5, h: 4.5 }, { s: 'e', at: 8, w: 1.4, door: true }, { s: 's', at: 22, w: 1.4, door: true, open: true }, { s: 'n', at: 8, w: 1.4, door: true }] });
    for (let k = 0; k < 4; k++) { B.box(x - 10 + k * 6, 0, z - 6.5, x - 6 + k * 6, 2.6, z - 5.5, 'planksDark', { uv: 1 }); B.loot(x - 8 + k * 6, 0, z - 5, k % 2 ? 'crate' : 'ration'); }
    B.crate(x + 8, z + 4, 1.4); B.crate(x + 9.5, z + 4, 1.2); B.crate(x + 8.7, z + 4, 1, 'planks', 1.4); B.loot(x + 10, 0, z + 6, i ? 'weaponbox' : 'ammobox'); B.loot(x - 10, 0, z + 5, 'armor'); B.loot(x, 0, z + 2, 'loose');
  });
  for (let i = 0; i < 6; i++) B.container(58 + (i % 2) * 28, -8 + Math.floor(i / 2) * 4 - 4, 'x', ['metalRed', 'metalBlue', 'metalGreen'][i % 3]);
  B.loot(52.5, 0, -12, 'crate'); B.loot(80, 0, -4, 'toolbox');
  B.building(100, 48, 12, 8, 4, { wall: 'brick', gaps: [{ s: 'w', at: 4, w: 1.3, door: true, open: true }, { s: 'n', at: 6, w: 2, win: true }] }); B.loot(103, 0, 50, 'medbag'); B.loot(97, 0, 46, 'jacket'); B.loot(104, 0, 45, 'pc');
  // ---- dorms (west) — Old Gnarl ----
  const dx = -75, dz = -10;
  B.building(dx, dz, 36, 12, 3.4, { wall: 'brick', floor: 'planks', gaps: [{ s: 'e', at: 6, w: 1.4, door: true, open: true }, { s: 'w', at: 6, w: 1.4, door: true }, ...[3, 9, 15, 21, 27, 33].flatMap(a => [{ s: 'n', at: a, w: 1.4, win: true }, { s: 's', at: a, w: 1.4, win: true }])] });
  B.wallX(dx - 18, dx + 18, dz - 1.5, 3.4, .2, 'plaster', [3, 9, 15, 21, 27, 33].map((a, i) => ({ at: a, w: 1.1, door: true, open: r() < .6, key: i === 5 ? 'key_cellar' : null })));
  B.wallX(dx - 18, dx + 18, dz + 1.5, 3.4, .2, 'plaster', [3, 9, 15, 21, 27, 33].map(a => ({ at: a, w: 1.1, door: true, open: r() < .6 })));
  for (let i = 0; i < 6; i++) { const cx = dx - 18 + 6 * i; B.wallZ(dz - 6, dz - 1.5, cx, 3.4, .2, 'plaster'); B.wallZ(dz + 1.5, dz + 6, cx, 3.4, .2, 'plaster'); B.box(cx + .5, 0, dz - 5.6, cx + 2.4, .5, dz - 3.6, 'planksDark'); B.box(cx + .5, 0, dz + 3.6, cx + 2.4, .5, dz + 5.6, 'planksDark'); B.loot(cx + 4.5, 0, dz - 5.2, i === 5 ? 'safe' : G.pick(['jacket', 'ration', 'medbag', 'crate'])); B.loot(cx + 4.5, 0, dz + 5.2, G.pick(['jacket', 'filecab', 'ration', 'loose'])); }
  B.loot(dx + 16, 0, dz - 4, 'weaponbox', { rich: true }); B.loot(dx + 13.5, .5, dz - 4.6, 'loose', { rich: true });
  W.boss = { kind: 'gnarl', x: dx, z: dz, chance: .4, guards: 3 };
  // ---- gas station (NE) ----
  B.building(70, -88, 12, 8, 3.2, { wall: 'plaster', floor: 'tiles', gaps: [{ s: 's', at: 6, w: 1.6, door: true, open: true }, { s: 's', at: 2.5, w: 2.2, win: true }, { s: 's', at: 9.5, w: 2.2, win: true }] });
  B.box(65, 0, -91, 69, 1, -90, 'planksDark'); B.loot(67, 1, -90.5, 'ration'); B.loot(72, 0, -91, 'medbag'); B.loot(74.5, 0, -86, 'jacket');
  B.box(58, 4, -80, 82, 4.3, -72, 'roof', { solid: true, nav: false }); [[60, -78], [80, -78], [60, -74], [80, -74]].forEach(([x, z]) => B.box(x - .2, 0, z - .2, x + .2, 4, z + .2, 'metal'));
  [[65, -76], [75, -76]].forEach(([x, z]) => B.box(x - .4, 0, z - .6, x + .4, 1.6, z + .6, 'metalRed'));
  B.car(70, -66, 'x'); B.loot(62, 0, -66, 'loose');
  // ---- trailers (SW) ----
  for (let i = 0; i < 5; i++) { const x = -105 + (i % 3) * 16, z = 60 + Math.floor(i / 3) * 18; B.building(x, z, 9, 4, 2.6, { wall: i % 2 ? 'metalBlue' : 'metal', floor: 'planks', gaps: [{ s: 's', at: 2, w: 1, door: true, open: r() < .7 }, { s: 'n', at: 6, w: 1.2, win: true }] }); B.loot(x + 3, 0, z - 1, G.pick(['jacket', 'ration', 'medbag', 'crate', 'pc'])); }
  B.car(-70, 80, 'z', 'rust'); B.car(-115, 90, 'x', 'metalRed');
  // ---- railway (south) ----
  for (let x = -128; x < 128; x += 4) B.box(x, 0, 84, x + 3.6, .12, 85.8, 'planksDark', { solid: false, opaque: false });
  B.box(-128, .12, 84.3, 128, .25, 84.45, 'metal', { solid: false, opaque: false }); B.box(-128, .12, 85.35, 128, .25, 85.5, 'metal', { solid: false, opaque: false });
  [-90, -60, -20, 25, 60].forEach((x, i) => { B.container(x, 89, 'x', ['rust', 'metalGreen', 'metalBlue'][i % 3]); if (i % 2) B.loot(x + 3, 0, 89, 'crate'); });
  B.loot(-55, 0, 89, 'weaponbox'); B.loot(28, 0, 89, 'toolbox');
  // perimeter + scatter
  const keep = [[0, 0, 32, 20], [-12, -17, 14, 9], [-10, -60, 55, 40], [75, -10, 26, 34], [100, 48, 10, 8], [-75, -10, 22, 10], [70, -80, 16, 16], [-90, 70, 25, 20], [0, 87, 130, 8], [0, 40, 140, 7], [30, -40, 6, 90]];
  B.forest(-130, -130, 130, -100, 160, keep); B.forest(-130, 100, 130, 130, 160, keep); B.forest(-130, -100, -105, 100, 140, keep); B.forest(108, -100, 130, 100, 120, keep);
  B.forest(-100, -100, 100, 100, 120, keep);
  for (let i = 0; i < 30; i++) { const x = (r() - .5) * 220, z = (r() - .5) * 220; if (keep.some(k => Math.abs(x - k[0]) < k[2] && Math.abs(z - k[1]) < k[3])) continue; if (r() < .5) { B.crate(x, z, 1 + r() * .4); if (r() < .4) B.loot(x, 1.2, z, 'loose'); } else B.bush(x, z, 1); }
  // spawns / extracts / AI zones
  W.spawns.pmc = [[-115, -60], [118, -20], [-100, 105], [90, 112], [0, -122], [-122, 30], [115, 75], [-60, -118]];
  W.spawns.scav = [[-30, 30], [40, 60], [-40, -30], [50, -50], [-90, 40], [90, 30]];
  B.extract('Rail Bridge', 120, 92, 5, { who: 'pmc' }); B.extract('Old Logging Road', -122, -112, 5, { kind: 'chance', chance: .7 });
  B.extract('Car to Barkov', 50, 41, 3.5, { kind: 'pay', cost: 7000 }); B.extract('Drainage Pipe', -30, 124, 3, { kind: 'nobag' }); B.extract('Gas Station Gate', 95, -110, 4, { kind: 'chance', chance: .5 });
  B.extract('Crossroads', 124, 40, 5, { who: 'scav' }); B.extract('Back Gate', -124, 20, 5, { who: 'scav' }); B.extract('Rail Bridge', 120, 92, 5, { who: 'scav' });
  W.zones = [{ x: 0, z: 0, r: 18, n: 4 }, { x: -75, z: -10, r: 14, n: 3 }, { x: 75, z: -10, r: 26, n: 3 }, { x: -10, z: -60, r: 30, n: 3 }, { x: 70, z: -82, r: 12, n: 2 }, { x: -90, z: 70, r: 18, n: 2 }, { x: 0, z: 87, r: 50, n: 2 }];
  W.sun = { day: [0xfff0d0, 1.05], amb: [0xbfd0e0, 0x4a4030, .55], fog: [0xb8c4c0, 30, 260] };
};

/* ---------- DEADWOOD ---------- */
G.MAPS.deadwood = W => {
  const B = G.builder(W, 4321); const r = B.r;
  B.ground('grass', 7); W.surfAt = () => 'dirt';
  // lake
  const lx = 0, lz = -95, lr = 42;
  const wg = new THREE.CircleGeometry(lr, 40); wg.rotateX(-Math.PI / 2); const wm = new THREE.Mesh(wg, G.mat('water')); wm.position.set(lx, .06, lz); W.group.add(wm);
  for (let a = 0; a < 40; a++) { const t = a / 40 * 6.283; const x = lx + Math.cos(t) * (lr - 1), z = lz + Math.sin(t) * (lr - 1); if (Math.abs(x) < 5 && z > lz) continue; B.box(x - 3, -1, z - 3, x + 3, 1.2, z + 3, null, { solid: true, opaque: false }); }
  for (let x = lx - lr + 3; x < lx + lr - 3; x += 6) for (let z = lz - lr + 3; z < lz + lr - 3; z += 6) if (Math.hypot(x - lx, z - lz) < lr - 4 && !(Math.abs(x) < 6 && z > lz + lr - 20)) B.box(x - 3, -1, z - 3, x + 3, 1.2, z + 3, null, { solid: true, opaque: false });
  // dock (visit point)
  B.box(-2, 0, lz + lr - 16, 2, .35, lz + lr + 2, 'planksDark', { opaque: false }); B.box(-4, 0, lz + lr - 20, -2, 1.2, lz + lr - 3, null, { opaque: false }); B.box(2, 0, lz + lr - 20, 4, 1.2, lz + lr - 3, null, { opaque: false }); B.box(-4, 0, lz + lr - 20, 4, 1.2, lz + lr - 16, null, { opaque: false });
  W.visits.push({ spot: 'dock', x: 0, z: lz + lr - 6, r: 5, name: 'Boat dock' });
  B.loot(1.2, .35, lz + lr - 14, 'loose', { rich: true });
  // logging camp
  const cx = -60, cz = 40;
  [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, -16]].forEach(([dx, dz], i) => { B.building(cx + dx, cz + dz, 8, 6, 3, { wall: 'planks', floor: 'planks', roof: 'roof', gaps: [{ s: dz < 0 ? 's' : 'n', at: 4, w: 1.2, door: true, open: r() < .6 }, { s: 'e', at: 3, w: 1.2, win: true }, { s: 'w', at: 3, w: 1.2, win: true }] }); B.loot(cx + dx - 2.5, 0, cz + dz + (dz < 0 ? -1.8 : 1.8), G.pick(['jacket', 'ration', 'crate'])); B.loot(cx + dx + 2.5, 0, cz + dz + (dz < 0 ? -1.8 : 1.8), G.pick(['medbag', 'toolbox', 'ammobox', 'filecab'])); });
  B.logs(cx + 18, cz, 12, 'z', 3); B.logs(cx - 20, cz + 2, 10, 'z', 2); B.box(cx - 1, 0, cz - 1, cx + 1, .3, cz + 1, 'rock'); B.truck(cx + 4, cz + 22, 'x'); B.loot(cx + 2, 0, cz + 22, 'weaponbox');
  // bunker (raiders)
  const bx = 85, bz = 80;
  B.building(bx, bz, 20, 14, 3.4, { wall: 'concrete', floor: 'concrete', gaps: [{ s: 'w', at: 7, w: 1.6, door: true, metal: true, open: true }, { s: 'n', at: 4, w: 1.2, win: true, sill: 2, top: 2.6 }] });
  B.wallZ(bz - 7, bz + 7, bx + 3, 3.4, .3, 'concrete', [{ at: 4, w: 1.2, door: true, key: 'key_bunker', metal: true }]); B.wallX(bx - 10, bx + 3, bz + 1, 3.4, .3, 'concrete', [{ at: 6, w: 1.2, door: true, open: true, metal: true }]);
  B.loot(bx + 6, 0, bz - 5, 'weaponbox', { rich: true }); B.loot(bx + 8.5, 0, bz + 5, 'safe'); B.loot(bx + 8.5, 0, bz - 2, 'armor', { rich: true }); B.loot(bx + 5, 0, bz + 5.5, 'pc');
  B.loot(bx - 8, 0, bz - 5.5, 'ammobox'); B.loot(bx - 8, 0, bz + 5.5, 'medbag'); B.loot(bx - 3, 0, bz + 5.5, 'ration'); B.crate(bx - 4, bz - 5, 1.3); B.crate(bx - 6, bz - 5, 1.1);
  for (let i = 0; i < 6; i++) B.box(bx - 14 + i * .2, 0, bz - 10 + i * 4, bx - 13 + i * .2, 1.1, bz - 8 + i * 4, 'planksDark'); // sandbags-ish
  W.raiders = { x: bx, z: bz, chance: .55, n: 4 };
  // crash site
  const px = -90, pz = -70;
  B.box(px - 14, 0, pz - 2.2, px + 10, 4, pz + 2.2, 'metal', { uv: 3 }); B.box(px - 3, 2.6, pz - 14, px + 1, 3.2, pz + 14, 'metal', { nav: false }); B.box(px + 8, 0, pz - 6, px + 12, 3, pz - 2, 'rust');
  [[px - 18, pz + 6], [px + 14, pz + 8], [px - 6, pz + 9], [px + 3, pz - 9]].forEach(([x, z], i) => { B.crate(x, z, 1.4, 'metalGreen'); B.loot(x, 1.4, z, i % 2 ? 'crate' : 'ammobox'); });
  B.loot(px - 16, 0, pz + 3, 'weaponbox', { rich: true }); B.loot(px + 13, 0, pz - 4, 'pc', { rich: true }); B.loot(px - 4, 0, pz + 3, 'loose', { rich: true });
  // old shed (east)
  B.building(110, -40, 12, 8, 4, { wall: 'metal', floor: 'concrete', gaps: [{ s: 'w', at: 4, w: 3, h: 3 }, { s: 'e', at: 4, w: 1.2, win: true }] }); B.loot(113, 0, -42.5, 'toolbox'); B.loot(107, 0, -37, 'crate'); B.loot(114, 0, -37, 'jacket');
  // hunter towers
  [[40, 0], [-30, -10], [130, 60], [-130, 100]].forEach(([x, z]) => { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => B.box(x + a * 1.2 - .12, 0, z + b * 1.2 - .12, x + a * 1.2 + .12, 4, z + b * 1.2 + .12, 'planksDark')); B.box(x - 1.5, 4, z - 1.5, x + 1.5, 4.2, z + 1.5, 'planks', { nav: false }); });
  // roads
  B.flat(-170, 115, 170, 123, 'dirt', .015, 6); B.flat(-64, 60, -56, 123, 'dirt', .016, 6); B.flat(80, -120, 88, 123, 'dirt', .016, 6);
  const keep = [[-60, 40, 26, 30], [85, 80, 18, 14], [-90, -70, 22, 16], [110, -40, 10, 8], [0, -95, 48, 48], [0, 119, 175, 6], [-60, 92, 5, 34], [84, 0, 5, 125], [40, 0, 3, 3], [-30, -10, 3, 3], [130, 60, 3, 3], [-130, 100, 3, 3]];
  B.forest(-170, -170, 170, 170, 1100, keep);
  W.spawns.pmc = [[-160, -160], [160, -150], [-160, 60], [150, 20], [-20, 160], [60, -160], [-150, -20], [130, 150]];
  W.spawns.scav = [[-60, 0], [40, 40], [100, -80], [-20, 60], [-110, -120], [20, -20]];
  B.extract('Bridge to Pine Ridge', -165, 119, 5); B.extract('Hunter\'s Path', 165, -110, 5); B.extract('Logging Truck', 160, 119, 4, { kind: 'chance', chance: .6 });
  B.extract('Cliff Descent', -40, 166, 3, { kind: 'nobag' }); B.extract('Lakeside Boat', 0, -50 + 4, 3, { kind: 'pay', cost: 12000 });
  B.extract('Sapling Road', 0, 166, 5, { who: 'scav' }); B.extract('Bridge to Pine Ridge', -165, 119, 5, { who: 'scav' }); B.extract('Old Shed', 115, -48, 4, { who: 'scav' });
  W.zones = [{ x: -60, z: 40, r: 22, n: 5 }, { x: -90, z: -70, r: 16, n: 3 }, { x: 0, z: -48, r: 15, n: 2 }, { x: 110, z: -40, r: 12, n: 2 }, { x: 40, z: 60, r: 60, n: 2 }, { x: -100, z: 120, r: 30, n: 2 }];
  W.sun = { day: [0xffe8c8, .95], amb: [0xa8c0c8, 0x3a4028, .5], fog: [0x9aa89a, 20, 190] };
};

/* ---------- PULP FACTORY ---------- */
G.MAPS.pulp = W => {
  const B = G.builder(W, 777); const r = B.r; W.indoor = true;
  B.ground('dirt', 6); W.surfAt = () => 'concrete';
  const X0 = -45, X1 = 45, Z0 = -35, Z1 = 35, H = 7;
  B.flat(X0, Z0, X1, Z1, 'concrete', .03, 5);
  B.wallX(X0, X1, Z0, H, .6, 'brick', [{ at: 20, w: 3, h: 3.5, door: true, metal: true, open: true }, { at: 70, w: 1.4, door: true, metal: true }]);
  B.wallX(X0, X1, Z1, H, .6, 'brick', [{ at: 45, w: 4, h: 4, door: true, metal: true }, { at: 10, w: 1.4, door: true, metal: true, key: 'key_control' }]);
  B.wallZ(Z0, Z1, X0, H, .6, 'brick', [{ at: 35, w: 1.4, door: true, metal: true, open: true }]); B.wallZ(Z0, Z1, X1, H, .6, 'brick', [{ at: 20, w: 1.4, door: true, metal: true }]);
  B.box(X0, H, Z0, X1, H + .4, Z1, 'roof', { nav: false });
  // main hall vs. corridors
  B.wallX(X0, 10, -8, H, .4, 'concrete', [{ at: 12, w: 2.4, h: 3 }, { at: 40, w: 1.3, door: true, metal: true, open: true }]);
  B.wallZ(-8, Z1, 10, H, .4, 'concrete', [{ at: 8, w: 2.4, h: 3 }, { at: 30, w: 1.3, door: true, metal: true }]);
  B.wallX(10, X1, 5, H, .4, 'concrete', [{ at: 18, w: 3, h: 3 }]);
  // tanks & vats in main hall
  [[-30, 10], [-18, 10], [-30, 24], [-18, 24]].forEach(([x, z]) => { B.box(x - 3, 0, z - 3, x + 3, 5.5, z + 3, 'rust', { uv: 2 }); B.box(x - 1, 5.5, z - 1, x + 1, H, z + 1, 'metal', { nav: false }); });
  B.box(-8, 0, 2, -2, 1.4, 30, 'metalGreen', { uv: 1.5 }); // conveyor
  B.box(-42, 0, -2, -36, 2.5, 2, 'planksDark'); B.loot(-40, 2.5, 0, 'loose'); B.loot(-24, 0, 17, 'toolbox'); B.loot(-12, 0, 32, 'crate'); B.loot(-36, 0, 32, 'ammobox'); B.loot(-5, 1.4, 16, 'loose');
  // offices (south-west strip behind z<-8)
  for (let i = 0; i < 5; i++) { const x = X0 + 2 + i * 10; B.wallZ(Z0 + .3, -8, x + 9, 3.4, .2, 'plaster', i < 4 ? [{ at: 20, w: 1.1, door: true, open: r() < .6 }] : []); B.loot(x + 3, 0, Z0 + 2, G.pick(['filecab', 'pc', 'jacket', 'medbag'])); B.loot(x + 6, 0, -12, G.pick(['ration', 'jacket', 'crate'])); B.box(x + 2, 0, Z0 + 4, x + 6, .8, Z0 + 5.2, 'planksDark'); }
  B.box(X0, 3.4, Z0, 10, 3.6, -8, 'concrete', { nav: false }); // office ceiling
  // warehouse (north-east)
  for (let i = 0; i < 4; i++) { B.box(14 + i * 7, 0, 10, 18 + i * 7, 3.2, 12, 'planksDark'); B.box(14 + i * 7, 0, 24, 18 + i * 7, 3.2, 26, 'planksDark'); B.loot(16 + i * 7, 0, 13, G.pick(['crate', 'ration', 'ammobox', 'armor'])); B.loot(16 + i * 7, 0, 27, G.pick(['crate', 'toolbox', 'weaponbox'])); }
  B.crate(40, 30, 1.5); B.crate(38, 31, 1.2); B.loot(41, 1.5, 30, 'loose', { rich: true });
  // control room (east-south, locked from outside courtyard + inside)
  B.wallX(10, X1, -14, H, .3, 'concrete', [{ at: 6, w: 1.3, door: true, metal: true, key: 'key_control' }]);
  B.loot(30, 0, -30, 'safe'); B.loot(40, 0, -30, 'pc', { rich: true }); B.loot(22, 0, -31, 'weaponbox', { rich: true }); B.loot(42, 0, -18, 'medbag', { rich: true });
  B.box(26, 0, -24, 38, 1, -22, 'metalBlue');
  // pipes overhead
  for (let x = X0 + 2; x < X1; x += 9) B.box(x, 5.2, Z0 + 1, x + .5, 5.7, Z1 - 1, 'rust', { nav: false, solid: false, opaque: false });
  // courtyard outside (fenced)
  B.fence(X0 - 15, Z0 - 15, X1 + 15, Z0 - 15, 3, 'metal'); B.fence(X0 - 15, Z1 + 15, X1 + 15, Z1 + 15, 3, 'metal'); B.fence(X0 - 15, Z0 - 15, X0 - 15, Z1 + 15, 3, 'metal'); B.fence(X1 + 15, Z0 - 15, X1 + 15, Z1 + 15, 3, 'metal');
  B.truck(-30, -44, 'x'); B.container(25, 44, 'x', 'rust'); B.loot(-26, 0, -44, 'crate'); B.loot(20, 0, 44, 'toolbox');
  // lamps
  [[-24, 17], [0, 17], [-20, -2], [28, 18], [28, -6], [30, -26], [-20, -26], [36, 30]].forEach(([x, z]) => B.lamp(x, 6, z, 1.1, 22));
  W.spawns.pmc = [[-55, -45], [55, -45], [-55, 45], [55, 45], [0, -48]]; W.spawns.scav = [[-30, -20], [20, 20], [-20, 30], [30, -2]];
  B.extract('Gate 3', -48, -48, 4); B.extract('Med Tent Gate', 0, 48, 4, { kind: 'key', key: 'key_control' }); B.extract('Cellar Hatch', 56, 0, 3, { kind: 'chance', chance: .5 });
  B.extract('Camera Bunker Door', 52, -48, 4, { who: 'scav' }); B.extract('Gate 3', -48, -48, 4, { who: 'scav' });
  W.zones = [{ x: -20, z: 15, r: 18, n: 4 }, { x: -20, z: -22, r: 15, n: 2 }, { x: 28, z: 18, r: 12, n: 2 }, { x: 0, z: -45, r: 20, n: 1 }];
  W.boss = { kind: 'chipper', x: -20, z: 15, chance: .4, guards: 0 };
  W.sun = { day: [0xd8d0c0, .35], amb: [0x707a80, 0x2a2620, .45], fog: [0x2a2a26, 8, 70] };
};

/* ---------- build ---------- */
G.buildWorld = (mapId) => {
  const W = G.newWorld(mapId); G.MAPS[mapId](W);
  G.buildBatches(W); G.buildScenery(W); G.buildNav(W);
  return W;
};
})();
