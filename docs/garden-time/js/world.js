'use strict';
/* GARDEN TIME — world: scene, map, plots, weather visuals */
const W = {};
const PLOT_W = 20, PLOT_D = 13;
const PLOTS = [
  { x: -26, z: -24, face: 1 }, { x: 0, z: -24, face: 1 }, { x: 26, z: -24, face: 1 },
  { x: -26, z: 24, face: -1 }, { x: 0, z: 24, face: -1 }, { x: 26, z: 24, face: -1 },
];
const SPOTS = {
  gear: { x: -22, z: -3, n: 'Gear Shop' }, seed: { x: -9, z: -3, n: 'Seed Shop' },
  corn: { x: 0, z: 3, n: 'Cornucopia' }, sell: { x: 9, z: -3, n: 'Sell Stand' },
  tg: { x: 22, z: -3, n: 'Thanksgiving Shop' },
};
const MAP_R = 62;

function initWorld(canvas) {
  const lowEnd = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.hardwareConcurrency || 4) <= 4;
  W.lowEnd = lowEnd;
  const r = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  W.r = r;
  const s = new THREE.Scene(); W.s = s;
  s.background = new THREE.Color(0x8fd3ff); s.fog = new THREE.Fog(0xbfe6ff, 60, 150);
  W.cam = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
  W.hemi = new THREE.HemisphereLight(0xffffff, 0x5a8a3a, 0.62); s.add(W.hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 0.85); sun.position.set(30, 50, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(lowEnd ? 1024 : 2048, lowEnd ? 1024 : 2048);
  const sc = sun.shadow.camera; sc.left = -35; sc.right = 35; sc.top = 35; sc.bottom = -35; sc.near = 1; sc.far = 140; sun.shadow.bias = -0.0008;
  s.add(sun); s.add(sun.target); W.sun = sun;
  W.amb = new THREE.AmbientLight(0xffffff, 0.15); s.add(W.amb);

  // ground
  const gg = new THREE.PlaneGeometry(260, 260, 60, 60); gg.rotateX(-Math.PI / 2);
  const cols = []; const pos = gg.attributes.position; const cA = new THREE.Color('#62b848'), cB = new THREE.Color('#4f9f3a'), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i); const d = Math.hypot(x, z);
    if (d > MAP_R + 8) pos.setY(i, Math.min(14, (d - MAP_R - 8) * 0.35) + Math.sin(x * 0.2) * Math.cos(z * 0.17) * 1.2);
    tmp.copy(cA).lerp(cB, 0.5 + 0.5 * Math.sin(x * 0.31 + z * 0.17) * Math.cos(z * 0.23));
    cols.push(tmp.r, tmp.g, tmp.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); gg.computeVertexNormals();
  W.groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const ground = new THREE.Mesh(gg, W.groundMat); ground.receiveShadow = true; s.add(ground); W.ground = ground;

  // path strip
  const path = new THREE.Mesh(new THREE.PlaneGeometry(64, 10), mat('#d9c08a')); path.rotation.x = -Math.PI / 2; path.position.set(0, 0.02, 0); path.receiveShadow = true; s.add(path);
  [-1, 1].forEach(sd => { for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 8), mat('#d9c08a')); p.rotation.x = -Math.PI / 2; p.position.set(PLOTS[i].x, 0.021, sd * 8.5); s.add(p); } });

  // plots
  W.plotGroups = PLOTS.map((p, i) => {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); s.add(g);
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(PLOT_W, 0.3, PLOT_D), mat('#7a4f2a')); dirt.position.y = 0.0; dirt.receiveShadow = true; g.add(dirt);
    for (let k = 0; k < 6; k++) { const row = new THREE.Mesh(new THREE.BoxGeometry(PLOT_W - 1, 0.06, 0.25), mat('#6a4220')); row.position.set(0, 0.17, -PLOT_D / 2 + 1.5 + k * 2); row.receiveShadow = true; g.add(row); }
    // fence
    const fenceC = '#e8d8b0';
    for (let k = 0; k <= 10; k++) { const fx = -PLOT_W / 2 - 0.5 + k * (PLOT_W + 1) / 10; [-1, 1].forEach(sd => { if (sd === p.face && Math.abs(fx) < 2) return; g.add(box(fenceC, fx, 0.45, sd * (PLOT_D / 2 + 0.5), 0.15, 0.9, 0.15)); }); }
    for (let k = 0; k <= 7; k++) { const fz = -PLOT_D / 2 - 0.5 + k * (PLOT_D + 1) / 7; [-1, 1].forEach(sd => g.add(box(fenceC, sd * (PLOT_W / 2 + 0.5), 0.45, fz, 0.15, 0.9, 0.15))); }
    [-1, 1].forEach(sd => { g.add(box(fenceC, 0, 0.65, sd * (PLOT_D / 2 + 0.5), PLOT_W + 1, 0.1, 0.08)); g.add(box(fenceC, sd * (PLOT_W / 2 + 0.5), 0.65, 0, 0.08, 0.1, PLOT_D + 1)); });
    // gap in fence at entrance (cover with arch)
    const arch = new THREE.Group(); arch.position.set(0, 0, p.face * (PLOT_D / 2 + 0.5));
    arch.add(cyl('#7a4f2a', -2, 1.5, 0, 0.12, 3)); arch.add(cyl('#7a4f2a', 2, 1.5, 0, 0.12, 3)); g.add(arch);
    const sign = new THREE.Group(); sign.position.set(0, 3.2, p.face * (PLOT_D / 2 + 0.5)); g.add(sign);
    g.userData = { sign, arch, i };
    return g;
  });
  // remove the fence segment overlapping entrance: (fence top bar crosses entrance; fine, it's a low rail you step over visually) -> replace by two halves
  W.plotGroups.forEach((g, i) => {
    const p = PLOTS[i];
    g.children.filter(c => c.isMesh && Math.abs(c.position.z - p.face * (PLOT_D / 2 + 0.5)) < 0.01 && c.scale.x > PLOT_W).forEach(c => { c.scale.x = PLOT_W / 2 - 1.5; c.position.x = -(PLOT_W / 4 + 0.75); const c2 = c.clone(); c2.position.x = PLOT_W / 4 + 0.75; g.add(c2); });
  });

  // stalls
  W.stalls = {};
  W.stalls.seed = makeStall('SEEDS', '#4fbf3f', '#ffffff', '#2f8f2f');
  W.stalls.sell = makeStall('SELL', '#ffcf1f', '#ffffff', '#c08a10');
  W.stalls.gear = makeStall('GEAR', '#3f8fff', '#ffffff', '#1f5fbf');
  W.stalls.tg = makeStall('THANKS!', '#ff8c1a', '#7a3a1a', '#a04a10');
  ['seed', 'sell', 'gear', 'tg'].forEach(k => { const st = W.stalls[k]; st.position.set(SPOTS[k].x, 0, SPOTS[k].z - 1.5); s.add(st); });
  W.stalls.tg.visible = false;
  // shopkeeper crabs
  W.keepers = [];
  [['seed', '#ff7a3a'], ['sell', '#ff3a6a'], ['gear', '#3a9aff'], ['tg', '#c0501f']].forEach(([k, c]) => { const kc = makeCrab(c, 1.1); kc.position.set(SPOTS[k].x, 1.15, SPOTS[k].z - 1.9); s.add(kc); W.keepers.push(kc); if (k === 'tg') { kc.visible = false; W.tgKeeper = kc; } });
  // little crates of produce on stalls
  ['#ff3b2f', '#ff8a1f', '#ffe14d', '#8a3cff'].forEach((c, i) => { const cr = box('#a0703f', SPOTS.seed.x - 1.8 + i * 1.2, 1.3, SPOTS.seed.z - 0.9, 0.9, 0.35, 0.7); s.add(cr); for (let j = 0; j < 3; j++) s.add(sph(c, SPOTS.seed.x - 2.1 + i * 1.2 + j * 0.28, 1.55, SPOTS.seed.z - 0.9, 0.16)); });
  // cornucopia
  W.corn = makeCornucopia(); W.corn.position.set(SPOTS.corn.x, 0, SPOTS.corn.z - 0.5); W.corn.rotation.y = -0.5; s.add(W.corn);

  // decorations
  const decor = new THREE.Group(); s.add(decor);
  const rng = mulberry(1234);
  for (let i = 0; i < 70; i++) {
    const a = rng() * 6.28, d = MAP_R - 4 + rng() * 22; const x = Math.cos(a) * d, z = Math.sin(a) * d;
    const t = new THREE.Group(); t.position.set(x, 0, z); const sc = 1.4 + rng() * 1.6; t.scale.setScalar(sc);
    t.add(cyl('#7a4f2a', 0, 1, 0, 0.25, 2)); t.add(sph(rng() < 0.5 ? '#3f9f3f' : '#2f8f3f', 0, 2.6, 0, 1.3)); t.add(sph('#4faf4f', 0.5, 2.2, 0.3, 0.9)); decor.add(t);
  }
  for (let i = 0; i < 160; i++) {
    const x = (rng() - 0.5) * 2 * MAP_R, z = (rng() - 0.5) * 2 * MAP_R; if (Math.abs(z) < 7 && Math.abs(x) < 34) continue; if (inAnyPlot(x, z, 2)) continue; if (Math.hypot(x, z) > MAP_R) continue;
    const k = rng();
    if (k < 0.55) { const c = ['#ff6fa8', '#ffe14d', '#ffffff', '#b46bff', '#ff8a3a'][Math.floor(rng() * 5)]; decor.add(cyl('#3f9f3f', x, 0.2, z, 0.02, 0.4)); decor.add(sph(c, x, 0.42, z, 0.1)); }
    else if (k < 0.8) { decor.add(sph('#4faf3f', x, 0.15, z, 0.35 + rng() * 0.3, 0.25, 0.35)); }
    else { const rk = sph('#9a9a9a', x, 0.1, z, 0.3 + rng() * 0.5, 0.25, 0.35); decor.add(rk); }
  }
  // clouds
  W.clouds = new THREE.Group(); s.add(W.clouds);
  for (let i = 0; i < 14; i++) { const c = new THREE.Group(); const x = (rng() - 0.5) * 220, z = (rng() - 0.5) * 220; c.position.set(x, 38 + rng() * 15, z); for (let j = 0; j < 4; j++) { const m = sph('#ffffff', j * 3 - 4, rng() * 1.5, rng() * 2, 3 + rng() * 2, 2, 3); m.castShadow = false; c.add(m); } W.clouds.add(c); }

  W.weatherGroup = new THREE.Group(); s.add(W.weatherGroup);
  W.fx = []; // transient effects
  window.addEventListener('resize', resizeWorld); resizeWorld();
}
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function resizeWorld() { const w = innerWidth, h = innerHeight; W.r.setSize(w, h, false); W.cam.aspect = w / h; W.cam.updateProjectionMatrix(); }
function inPlot(i, x, z, pad) { const p = PLOTS[i]; pad = pad || 0; return Math.abs(x - p.x) < PLOT_W / 2 + pad && Math.abs(z - p.z) < PLOT_D / 2 + pad; }
function inAnyPlot(x, z, pad) { for (let i = 0; i < PLOTS.length; i++) if (inPlot(i, x, z, pad)) return i; return -1; }
function plotSign(i, name, color) {
  const sg = W.plotGroups[i].userData.sign; while (sg.children.length) sg.remove(sg.children[0]);
  const b = signBoard(name || 'Empty', color || '#5a3a1a', '#fff', 4.2); sg.add(b); if (PLOTS[i].face < 0) b.rotation.y = Math.PI;
}

/* ---------- transient FX ---------- */
function fxBurst(x, y, z, color, n, spd, life) {
  const g = new THREE.Group(); g.position.set(x, y, z); W.s.add(g);
  const parts = [];
  for (let i = 0; i < (n || 12); i++) { const m = sph(color, 0, 0, 0, 0.08 + Math.random() * 0.08); m.castShadow = false; g.add(m); parts.push({ m, v: new THREE.Vector3(rnd(-1, 1), rnd(0.5, 1.6), rnd(-1, 1)).multiplyScalar(spd || 4) }); }
  W.fx.push({ g, parts, t: 0, life: life || 0.8 });
}
function fxText(x, y, z, text, color) {
  const sp = textSprite(text, color || '#ffe14d', null, 0.6); sp.position.set(x, y, z); W.s.add(sp);
  W.fx.push({ g: sp, t: 0, life: 1.4, rise: 1 });
}
function fxProjectile(from, to, color, size, onHit, speed) {
  const m = sph(color, from.x, from.y, from.z, size || 0.15); m.castShadow = false; W.s.add(m);
  W.fx.push({ g: m, t: 0, life: 9, proj: { from: from.clone(), to: to.clone(), dur: from.distanceTo(to) / (speed || 18), onHit } });
}
function fxBolt(x, z) {
  const pts = []; let px = x, pz = z; for (let y = 40; y >= 0; y -= 4) { pts.push(new THREE.Vector3(px, y, pz)); px += rnd(-1.5, 1.5); pz += rnd(-1.5, 1.5); }
  pts[pts.length - 1].set(x, 0.5, z);
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfff7a0 })); W.s.add(l);
  W.fx.push({ g: l, t: 0, life: 0.35 });
  fxBurst(x, 0.6, z, '#fff35a', 14, 6, 0.5);
}
function updateFx(dt) {
  for (let i = W.fx.length - 1; i >= 0; i--) {
    const f = W.fx[i]; f.t += dt;
    if (f.parts) f.parts.forEach(p => { p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt); p.m.scale.multiplyScalar(1 - dt * 1.2); });
    if (f.rise) { f.g.position.y += dt * 1.2; f.g.material.opacity = 1 - f.t / f.life; }
    if (f.proj) { const k = Math.min(1, f.t / f.proj.dur); f.g.position.lerpVectors(f.proj.from, f.proj.to, k); f.g.position.y += Math.sin(k * Math.PI) * 1.2; if (k >= 1) { f.t = f.life; if (f.proj.onHit) f.proj.onHit(); } }
    if (f.t >= f.life) { W.s.remove(f.g); W.fx.splice(i, 1); }
  }
}

/* ---------- WEATHER VISUALS ---------- */
const SKY_DEFAULT = 0x8fd3ff, FOG_DEFAULT = 0xbfe6ff;
function setWeatherVisual(name) {
  const g = W.weatherGroup; while (g.children.length) g.remove(g.children[0]);
  W.wv = { name, t: 0, items: [] };
  const wd = name ? WEATHERS[name] : null;
  const sky = new THREE.Color(wd ? wd.sky : SKY_DEFAULT), fog = new THREE.Color(wd ? wd.fog : FOG_DEFAULT);
  W.skyTarget = sky; W.fogTarget = fog;
  W.fogFar = name === 'Backrooms' ? 70 : name === 'Blizzard' ? 85 : 150;
  W.hemiTarget = name === 'Hell' ? 0xff6a4a : name === 'Backrooms' ? 0xfff0a0 : name === 'Heven' ? 0xfff8e0 : name === 'Space Ship' ? 0x8fa0ff : 0xffffff;
  W.groundTint = name === 'Hell' ? '#c04030' : name === 'Backrooms' ? '#d9c070' : name === 'Blizzard' ? '#f0f6ff' : name === 'Heven' ? '#fff6d0' : name === 'Hotel' ? '#a02a3a' : null;
  W.groundMat.color.set(W.groundTint || '#ffffff');
  document.body.dataset.weather = name || '';
  if (!name) return;
  const N = W.lowEnd ? 500 : 1100;
  const mkPoints = (color, size, spread, h) => {
    const geom = new THREE.BufferGeometry(); const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { arr[i * 3] = rnd(-spread, spread); arr[i * 3 + 1] = rnd(0, h); arr[i * 3 + 2] = rnd(-spread, spread); }
    geom.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const p = new THREE.Points(geom, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.85, depthWrite: false })); g.add(p); return p;
  };
  if (name === 'Rain' || name === 'Thunder') W.wv.pts = mkPoints(0x9fc8ff, 0.18, 40, 30), W.wv.fall = 28;
  if (name === 'Blizzard') W.wv.pts = mkPoints(0xffffff, 0.35, 40, 30), W.wv.fall = 5, W.wv.sway = 1;
  if (name === 'Hell') W.wv.pts = mkPoints(0xff7a1a, 0.3, 40, 30), W.wv.fall = -4;
  if (name === 'Heven') W.wv.pts = mkPoints(0xfff3a0, 0.3, 40, 30), W.wv.fall = 1.5, W.wv.sway = 1;
  if (name === 'Universe Shatter') W.wv.pts = mkPoints(0xd08aff, 0.4, 40, 30), W.wv.fall = 0.8, W.wv.sway = 1;
  if (name === 'Fish Rain' || name === 'Turkey Rain') {
    for (let i = 0; i < 26; i++) { const m = name === 'Fish Rain' ? makeFish() : makeMiniTurkey(); m.position.set(rnd(-35, 35), rnd(5, 40), rnd(-35, 35)); g.add(m); W.wv.items.push({ m, v: rnd(8, 14), land: 0 }); }
  }
  if (name === 'Volcano') {
    const v = new THREE.Group(); v.position.set(0, 0, -95);
    v.add(mesh(geo('volc', () => new THREE.CylinderGeometry(6, 28, 30, 18)), mat('#4a2a1f'), 0, 15, 0));
    v.add(mesh(geo('lava', () => new THREE.CylinderGeometry(6.2, 6.2, 1, 18)), mat('#ff4a00', { emissive: new THREE.Color('#ff3000'), emissiveIntensity: 1 }), 0, 30, 0));
    g.add(v); W.wv.volcano = v; W.wv.meteorT = 0;
  }
  if (name === 'Space Ship') {
    const u = new THREE.Group(); u.add(sph('#b0b8c8', 0, 0, 0, 6, 1.2, 6)); u.add(sph('#7fffd0', 0, 1, 0, 2.6, 1.8, 2.6, { transparent: true, opacity: .7, emissive: new THREE.Color('#3fffa0'), emissiveIntensity: .5 }));
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; u.add(sph(i % 2 ? '#ff3fd0' : '#3fffd0', Math.cos(a) * 5.2, -0.3, Math.sin(a) * 5.2, 0.35, 0.35, 0.35, { emissive: new THREE.Color(i % 2 ? '#ff3fd0' : '#3fffd0'), emissiveIntensity: 1 })); }
    const beam = mesh(geo('beam', () => new THREE.CylinderGeometry(1.5, 6, 18, 18, 1, true)), new THREE.MeshBasicMaterial({ color: 0x7fffb0, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }), 0, -9, 0); beam.castShadow = false; u.add(beam);
    u.position.set(0, 20, 0); g.add(u); W.wv.ufo = u;
  }
  if (name === 'Universe Shatter') {
    for (let i = 0; i < 30; i++) { const t = mesh(geo('shard', () => new THREE.TetrahedronGeometry(1)), mat(pick(['#b46bff', '#ff6bd5', '#6b8bff', '#ffffff']), { emissive: new THREE.Color('#6a2aff'), emissiveIntensity: .5 }), rnd(-60, 60), rnd(10, 40), rnd(-60, 60), rnd(1, 4)); g.add(t); W.wv.items.push({ m: t, spin: rnd(-1, 1) }); }
  }
  if (name === 'Backrooms') {
    const wallM = mat('#d9c46a'); const r = mulberry(77);
    for (let i = 0; i < 40; i++) { const x = (r() - 0.5) * 120, z = (r() - 0.5) * 120; if (inAnyPlot(x, z, 3) >= 0 || (Math.abs(z) < 8 && Math.abs(x) < 34)) continue; const w = mesh(BOX(), wallM, x, 4, z, r() < 0.5 ? 12 : 0.6, 8, r() < 0.5 ? 0.6 : 12); g.add(w); }
    for (let i = 0; i < 16; i++) { const l = mesh(BOX(), new THREE.MeshBasicMaterial({ color: 0xfffbe0 }), rnd(-50, 50), 14, rnd(-50, 50), 3, 0.2, 1); l.castShadow = false; g.add(l); }
  }
  if (name === 'Heven') {
    for (let i = 0; i < 12; i++) { const c = new THREE.Group(); c.position.set(rnd(-55, 55), rnd(2, 8), rnd(-55, 55)); if (inAnyPlot(c.position.x, c.position.z, 2) >= 0) continue; for (let j = 0; j < 4; j++) c.add(sph('#ffffff', j * 1.5 - 2, 0, rnd(-1, 1), 1.6, 0.9, 1.4)); g.add(c); W.wv.items.push({ m: c, bob: rnd(0, 6) }); }
    const halo = mesh(TOR(), mat('#ffe680', { emissive: new THREE.Color('#ffd040'), emissiveIntensity: 1 }), 0, 30, 0, 12, 12, 12); halo.rotation.x = Math.PI / 2; g.add(halo); W.wv.halo = halo;
  }
  if (name === 'Hell') {
    for (let i = 0; i < 18; i++) { const x = rnd(-58, 58), z = rnd(-58, 58); if (inAnyPlot(x, z, 2) >= 0 || (Math.abs(z) < 8)) continue; g.add(mesh(geo('pool', () => new THREE.CylinderGeometry(1, 1, 0.1, 14)), mat('#ff4a00', { emissive: new THREE.Color('#ff2000'), emissiveIntensity: 1 }), x, 0.06, z, rnd(1.5, 4), 1, rnd(1.5, 4))); }
    for (let i = 0; i < 10; i++) { const x = rnd(-60, 60), z = rnd(-60, 60); if (inAnyPlot(x, z, 2) >= 0 || Math.abs(z) < 8) continue; g.add(cone('#3a0a05', x, 3, z, 1, 6)); }
  }
  if (name === 'Hotel') {
    g.add(mesh(new THREE.PlaneGeometry(64, 6), mat('#b0102a'), 0, 0.04, 0)).children; g.children[g.children.length - 1].rotation.x = -Math.PI / 2;
    for (let i = 0; i < 8; i++) { const ch = new THREE.Group(); ch.position.set(-42 + i * 12, 16, i % 2 ? -10 : 10); ch.add(cyl('#ffd23d', 0, 2, 0, 0.05, 4)); ch.add(mesh(TOR(), mat('#ffd23d', { emissive: new THREE.Color('#aa8800'), emissiveIntensity: .5 }), 0, 0, 0, 1.6, 1.6, 1.6)); ch.children[1].rotation.x = Math.PI / 2; for (let j = 0; j < 8; j++) { const a = j / 8 * 6.28; ch.add(sph('#fff6c8', Math.cos(a) * 1.6, 0.4, Math.sin(a) * 1.6, 0.25, 0.25, 0.25, { emissive: new THREE.Color('#ffe080'), emissiveIntensity: 1 })); } g.add(ch); W.wv.items.push({ m: ch, spin: 0.3 }); }
    for (let i = 0; i < 14; i++) { const x = -60 + i * 9.2; [-1, 1].forEach(sd => { const z = sd * 48; g.add(cyl('#f2e6c8', x, 5, z, 0.8, 10)); g.add(box('#ffd23d', x, 10.2, z, 2, 0.5, 2)); }); }
  }
}
function makeFish() { const g = new THREE.Group(); const c = pick(['#ff9f43', '#4fa8ff', '#ffd23d', '#ff6fa8']); g.add(sph(c, 0, 0, 0, 0.35, 0.22, 0.12)); const t = cone(c, -0.45, 0, 0, 0.18, 0.3); t.rotation.z = Math.PI / 2; g.add(t); g.add(sph('#111', 0.22, 0.06, 0.1, 0.04)); g.scale.setScalar(1.5); return g; }
function makeMiniTurkey() { const p = makePet('turkey'); p.scale.setScalar(0.8); return p; }

function updateWeatherVisual(dt, focus) {
  const wv = W.wv; const s = W.s;
  // sky blend
  if (W.skyTarget) { s.background.lerp(W.skyTarget, Math.min(1, dt * 1.5)); s.fog.color.lerp(W.fogTarget, Math.min(1, dt * 1.5)); s.fog.far += ((W.fogFar || 150) - s.fog.far) * Math.min(1, dt); W.hemi.color.lerp(new THREE.Color(W.hemiTarget || 0xffffff), Math.min(1, dt)); }
  W.clouds.children.forEach(c => { c.position.x += dt * 1.2; if (c.position.x > 120) c.position.x = -120; });
  if (!wv || !wv.name) return;
  wv.t += dt; W.weatherGroup.position.set(0, 0, 0);
  if (wv.pts) {
    const a = wv.pts.geometry.attributes.position; wv.pts.position.set(focus.x, 0, focus.z);
    for (let i = 0; i < a.count; i++) {
      let y = a.getY(i) - wv.fall * dt; if (y < 0) y += 30; if (y > 30) y -= 30; a.setY(i, y);
      if (wv.sway) a.setX(i, a.getX(i) + Math.sin(wv.t + i) * dt * 0.6);
    }
    a.needsUpdate = true;
  }
  wv.items.forEach(it => {
    if (it.v != null) { // falling fish / turkeys
      if (!it.land) { it.m.position.y -= it.v * dt; it.m.rotation.z += dt * 3; if (it.m.position.y <= 0.3) { it.land = rnd(2, 4); it.m.position.y = 0.3; } }
      else { it.land -= dt; it.m.rotation.x = Math.sin(wv.t * 20) * 0.4; if (it.land <= 0) { it.land = 0; it.m.position.set(focus.x + rnd(-35, 35), rnd(25, 45), focus.z + rnd(-35, 35)); } }
    }
    if (it.spin) { it.m.rotation.y += it.spin * dt; it.m.rotation.x += it.spin * dt * 0.5; }
    if (it.bob != null) it.m.position.y += Math.sin(wv.t + it.bob) * dt * 0.5;
  });
  if (wv.ufo) { wv.ufo.position.x = Math.sin(wv.t * 0.25) * 30; wv.ufo.position.z = Math.cos(wv.t * 0.18) * 24; wv.ufo.rotation.y += dt; }
  if (wv.halo) wv.halo.rotation.z += dt * 0.2;
  if (wv.volcano) wv.volcano.children[1].material.emissiveIntensity = 0.7 + Math.sin(wv.t * 6) * 0.3;
}
