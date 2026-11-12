'use strict';
/* GARDEN TIME — core game: player, gardens, growing, harvesting, pets, weather, boss */
const SAVE_KEY = 'gardentime_save_v1';
const TG_EVENT = true; // Thanksgiving update is live
const MAX_PLANTS = 50;
const G = {
  t: 0, mode: 'title', keys: {}, cam: { yaw: 0, pitch: 0.42, dist: 11 }, held: null,
  gardens: [], bots: [], remotes: {}, wild: [], petObjs: [], weather: null, wtLeft: 0, nextWeatherIn: 120,
  stock: null, rid: 0, restockIn: 300, boss: null, hearts: 5, uid: 1, chatLog: [], carrying: null,
  speedMult: 1, fly: false, big: false, defT: 0, growT: 0, mutT: 0, saveT: 0, sendT: 0,
};
let S = null; // saved data

function defaultSave() {
  return { v: 1, money: 0, seeds: { beginous: 1 }, gear: { shovel: 1 }, gearUses: {}, plants: [], sprinklers: [], pets: [], backpack: [],
    tgUnlocked: false, cornFed: 0, tut: 0, name: '', stats: { harvested: 0, earned: 0, sold: 0 }, bought: { rid: -1, c: {} }, last: Date.now(), adminTok: '' };
}
function loadSave() {
  try { const j = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (j && j.v === 1) { S = Object.assign(defaultSave(), j); return; } } catch (e) { }
  S = defaultSave();
}
function save() {
  if (!S || !G.myGarden) return;
  S.plants = G.myGarden.plants.map(p => ({ u: p.u, id: p.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), gp: +p.gp.toFixed(1), f: p.f.map(f => ({ fp: +f.fp.toFixed(1), w: +f.w.toFixed(2), m: f.m })) }));
  S.last = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
}

/* ---------- gardens ---------- */
function newFruit(d) {
  let w = d.w * (0.7 + Math.pow(Math.random(), 2) * 0.9); if (Math.random() < 0.02) w *= 2.5;
  const m = []; const r = Math.random(); if (r < 0.002) m.push('Rainbow'); else if (r < 0.017) m.push('Golden');
  return { fp: 0, w, m };
}
function makeGarden(plot, owner, kind) {
  const g = { plot, owner, kind, plants: [], sprinklers: [], group: new THREE.Group() };
  g.group.position.set(PLOTS[plot].x, 0.15, PLOTS[plot].z); W.s.add(g.group);
  return g;
}
function destroyGarden(g) { W.s.remove(g.group); g.plants.forEach(p => { p.mesh = null; }); }
function addPlant(g, id, x, z, gp) {
  const d = PLANT[id]; const p = { u: G.uid++, id, x, z, gp: gp || 0, f: [] };
  for (let i = 0; i < d.fc; i++) { const f = newFruit(d); f.fp = Math.random() * d.fr * 0.3; p.f.push(f); }
  g.plants.push(p); buildPlantMesh(g, p); return p;
}
function buildPlantMesh(g, p) {
  const d = PLANT[p.id]; if (p.mesh) g.group.remove(p.mesh);
  const m = makePlant(d); m.position.set(p.x, 0, p.z); m.rotation.y = (p.u * 2.399) % 6.28;
  g.group.add(m); p.mesh = m; p.fm = []; p.fkeys = [];
  const spots = m.userData.spots;
  for (let i = 0; i < p.f.length; i++) p.fm.push(null);
  return m;
}
function fruitColor(d, f) {
  let c = new THREE.Color(d.c[1]); const mm = f.m.filter(x => MUTATIONS[x]);
  if (mm.length) { const top = mm.reduce((a, b) => MUTATIONS[b].m > MUTATIONS[a].m ? b : a); const mc = MUTATIONS[top].c; if (mc !== 'rainbow') c.lerp(new THREE.Color(mc), top === 'Golden' ? 0.75 : 0.5); }
  return '#' + c.getHexString();
}
function updatePlantVisual(g, p, dt) {
  const d = PLANT[p.id]; const m = p.mesh; if (!m) return;
  const gr = Math.min(1, p.gp / d.g);
  const sc = 0.18 + 0.82 * gr; m.scale.setScalar(sc * (m.userData.fruitScale ? 1 : 1));
  const spots = m.userData.spots; const mature = gr >= 1;
  for (let i = 0; i < p.f.length; i++) {
    const f = p.f[i]; const sp = spots[i % spots.length];
    const key = f.m.join(',') + '|' + (d.c[1]);
    if (!mature) { if (p.fm[i]) { m.remove(p.fm[i]); p.fm[i] = null; } continue; }
    if (!p.fm[i] || p.fkeys[i] !== key) {
      if (p.fm[i]) m.remove(p.fm[i]);
      const fruit = makeFruit(d.fs, fruitColor(d, f), d.c[2]); fruit.position.copy(sp);
      if (i >= spots.length) fruit.position.add(new THREE.Vector3(Math.cos(i) * 0.25, -0.15, Math.sin(i) * 0.25));
      if (f.m.includes('Frozen')) { const ice = box('#bfefff', 0, 0, 0, 0.45, 0.45, 0.45, { transparent: true, opacity: 0.35 }); fruit.add(ice); }
      if (f.m.includes('Rainbow')) fruit.userData.rainbow = 1;
      m.add(fruit); p.fm[i] = fruit; p.fkeys[i] = key;
    }
    const fr = p.fm[i]; const k = Math.min(1, f.fp / d.fr);
    const fs = 1.4 * (m.userData.fruitScale || 1) * (0.3 + 0.7 * k) * Math.pow(f.w / d.w, 0.33);
    fr.scale.setScalar(fs / sc * Math.min(1, 1 / Math.max(0.6, sc)));
    if (k >= 1) { fr.position.y = spots[i % spots.length].y + Math.sin(G.t * 2 + i) * 0.03; }
    if (fr.userData.rainbow) fr.traverse(o => { if (o.isMesh) { o.material = mat('#' + new THREE.Color().setHSL((G.t * 0.3 + i * 0.1) % 1, 1, 0.55).getHexString()); } });
    if (fr.userData.glitch || m.userData.glitch) fr.visible = Math.random() > 0.04;
  }
  // animated plants
  if (m.userData.head && d.k === 'sunflower') m.userData.head.rotation.z += dt * 0.5;
}
function growGarden(g, dt, mult) {
  g.plants.forEach(p => {
    const d = PLANT[p.id]; let mul = mult;
    g.sprinklers.forEach(s => { if (Math.hypot(s.x - p.x, s.z - p.z) < 5) mul *= 1.5; });
    if (p.gp < d.g) { p.gp += dt * mul; return; }
    p.f.forEach(f => { if (f.fp < d.fr) f.fp += dt * mul; });
  });
}
function ripeCount(p) { const d = PLANT[p.id]; if (p.gp < d.g) return 0; return p.f.filter(f => f.fp >= d.fr).length; }
function harvestPlant(g, p, toBackpack) {
  const d = PLANT[p.id]; const out = [];
  p.f.forEach((f, i) => { if (p.gp >= d.g && f.fp >= d.fr) { out.push({ id: p.id, w: +f.w.toFixed(2), m: f.m.slice() }); p.f[i] = newFruit(d); } });
  return out;
}
function plantAt(g, x, z, rad) { let best = null, bd = rad || 2.2; g.plants.forEach(p => { const dd = Math.hypot(p.x - x, p.z - z); if (dd < bd) { bd = dd; best = p; } }); return best; }
function localXZ(g, wx, wz) { return { x: wx - PLOTS[g.plot].x, z: wz - PLOTS[g.plot].z }; }
function canPlantHere(g, lx, lz) {
  if (Math.abs(lx) > PLOT_W / 2 - 0.8 || Math.abs(lz) > PLOT_D / 2 - 0.8) return false;
  if (g.plants.length >= MAX_PLANTS) return false;
  return !g.plants.some(p => Math.hypot(p.x - lx, p.z - lz) < 1.5);
}

/* ---------- player ---------- */
function randomColor() { const c = new THREE.Color().setHSL(Math.random(), 0.75 + Math.random() * 0.2, 0.5 + Math.random() * 0.08); return '#' + c.getHexString(); }
function spawnMe(plot) {
  const me = G.me = { x: PLOTS[plot].x, z: PLOTS[plot].z + PLOTS[plot].face * (PLOT_D / 2 + 3), y: 0, vy: 0, rot: 0, vx: 0, vz: 0, plot, color: G.myColor || randomColor(), pinch: 0, stun: 0, onGround: true };
  me.mesh = makeCrab(me.color); W.s.add(me.mesh);
  me.tag = textSprite(S.name || 'You', '#ffffff', null, 0.45); me.tag.position.y = 1.7; me.mesh.add(me.tag);
  G.cam.yaw = PLOTS[plot].face > 0 ? 0 : Math.PI;
}
function crabColliders(nx, nz, ox, oz) {
  // map bounds
  const d = Math.hypot(nx, nz); if (d > MAP_R) { nx *= MAP_R / d; nz *= MAP_R / d; }
  // stalls
  for (const k of ['seed', 'sell', 'gear', 'tg']) { if (k === 'tg' && !W.stalls.tg.visible) continue; const s = SPOTS[k]; if (Math.abs(nx - s.x) < 2.9 && Math.abs(nz - (s.z - 1.5)) < 1.25) { if (Math.abs(ox - s.x) >= 2.9) nx = ox; else nz = oz; } }
  { const c = SPOTS.corn; const dd = Math.hypot(nx - c.x, nz - (c.z - 0.5)); if (dd < 2.6) { const a = Math.atan2(nz - (c.z - 0.5), nx - c.x); nx = c.x + Math.cos(a) * 2.6; nz = c.z - 0.5 + Math.sin(a) * 2.6; } }
  // plot fences: block crossing except through the entrance
  for (let i = 0; i < PLOTS.length; i++) {
    const p = PLOTS[i]; const wasIn = inPlot(i, ox, oz, 0.3), isIn = inPlot(i, nx, nz, 0.3);
    if (wasIn !== isIn) { const gate = Math.abs(nx - p.x) < 1.9 && Math.sign(nz - p.z) === p.face; if (!gate) { nx = ox; nz = oz; } }
  }
  return [nx, nz];
}
function updateMe(dt) {
  const me = G.me; if (!me) return;
  let ix = 0, iz = 0;
  if (G.keys.KeyW || G.keys.ArrowUp) iz -= 1; if (G.keys.KeyS || G.keys.ArrowDown) iz += 1;
  if (G.keys.KeyA || G.keys.ArrowLeft) ix -= 1; if (G.keys.KeyD || G.keys.ArrowRight) ix += 1;
  if (UI.joy) { ix += UI.joy.x; iz += UI.joy.y; }
  const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
  if (UI.modalOpen && UI.modalOpen()) { ix = 0; iz = 0; }
  const cy = Math.cos(G.cam.yaw), sy = Math.sin(G.cam.yaw);
  const mx = ix * cy + iz * sy, mz = -ix * sy + iz * cy;
  let spd = 7.5 * G.speedMult * (hasPet('cola') && G.colaRush > 0 ? 1.35 : 1);
  if (me.stun > 0) { me.stun -= dt; spd = 0; }
  me.vx += (mx * spd - me.vx) * Math.min(1, dt * 10); me.vz += (mz * spd - me.vz) * Math.min(1, dt * 10);
  const ox = me.x, oz = me.z; let nx = me.x + me.vx * dt, nz = me.z + me.vz * dt;
  if (me.kb) { nx += me.kb.x * dt; nz += me.kb.z * dt; me.kb.x *= 1 - dt * 3; me.kb.z *= 1 - dt * 3; if (Math.hypot(me.kb.x, me.kb.z) < 0.3) me.kb = null; }
  [nx, nz] = crabColliders(nx, nz, ox, oz); me.x = nx; me.z = nz;
  // jump / float / fly
  const float = (hasPet('balloon') || G.fly) && (G.keys.Space || UI.jumpHeld);
  if ((G.keys.Space || UI.jumpHeld) && me.onGround) { me.vy = 8; me.onGround = false; }
  me.vy -= (float ? (G.fly ? -6 : 4) : 22) * dt; if (G.fly && !(G.keys.Space || UI.jumpHeld)) me.vy = Math.max(me.vy, -4);
  me.y += me.vy * dt; if (me.y <= 0) { me.y = 0; me.vy = 0; me.onGround = true; } if (me.y > 40) { me.y = 40; me.vy = 0; }
  const sp = Math.hypot(me.vx, me.vz);
  if (sp > 0.3) { const target = Math.atan2(me.vx, me.vz) + Math.PI / 2; let dr = target - me.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); me.rot += dr * Math.min(1, dt * 10); }
  me.mesh.position.set(me.x, me.y + 0.02, me.z); me.mesh.rotation.y = me.rot; me.mesh.scale.setScalar(G.big ? 2.5 : 1);
  if (me.pinch > 0) me.pinch -= dt;
  animCrab(me.mesh, sp / 7.5, dt, me.pinch);
}
function updateCamera(dt) {
  const me = G.me; if (!me) return; const c = G.cam;
  const tx = me.x, ty = me.y + 1.2 * (G.big ? 2 : 1), tz = me.z;
  const cx = tx + Math.sin(c.yaw) * Math.cos(c.pitch) * c.dist, cz = tz + Math.cos(c.yaw) * Math.cos(c.pitch) * c.dist, cyy = ty + Math.sin(c.pitch) * c.dist;
  W.cam.position.lerp(new THREE.Vector3(cx, Math.max(0.8, cyy), cz), Math.min(1, dt * 12)); W.cam.lookAt(tx, ty, tz);
  W.sun.position.set(me.x + 30, 50, me.z + 20); W.sun.target.position.set(me.x, 0, me.z);
}

/* ---------- interactions ---------- */
function nearSpot(k, r) { const s = SPOTS[k]; return Math.hypot(G.me.x - s.x, G.me.z - s.z) < (r || 3.4); }
function findInteract() {
  const me = G.me; if (!me) return null; const my = G.myGarden;
  const held = G.held;
  const inMine = inPlot(my.plot, me.x, me.z, 0);
  const L = localXZ(my, me.x, me.z);
  if (G.boss && G.boss.alive && Math.hypot(G.boss.x - me.x, G.boss.z - me.z) < 5.5 && G.boss.y < 4.5) return { label: '🦀 PINCH Lord Crow!', c: '#ff3b3b', fn: pinchBoss };
  if (G.boss && G.boss.dead && Math.hypot(G.boss.x - me.x, G.boss.z - me.z) < 5 && (G.boss.parts || []).includes(myId()) && !G.boss.claimed) return { label: '🌾 Claim from Lord Crow', c: '#ff8c1a', fn: claimBoss };
  if (G.carrying) { if (inMine && canPlantHere(my, L.x, L.z)) return { label: '🧤 Place ' + PLANT[G.carrying.id].n, c: '#9be37a', fn: placeCarried }; return { label: '🧤 Carrying ' + PLANT[G.carrying.id].n + ' (go to a free spot)', c: '#888', fn: null }; }
  if (held && held.t === 'seed' && inMine) { if (canPlantHere(my, L.x, L.z)) return { label: '🌱 Plant ' + PLANT[held.id].n, c: '#9be37a', fn: () => plantHeld(L) }; }
  if (held && held.t === 'gear' && inMine) {
    const p = plantAt(my, L.x, L.z, 2.6);
    if (held.id === 'sprinkler') return { label: '💦 Place Sprinkler', c: '#6fb7ff', fn: () => placeSprinkler(L) };
    if (p) {
      const n = PLANT[p.id].n;
      if (held.id === 'shovel') return { label: '🪏 Dig up ' + n, c: '#d9822b', fn: () => shovelPlant(p) };
      if (held.id === 'wateringcan') return { label: '🚿 Water ' + n, c: '#6fb7ff', fn: () => waterPlant(p) };
      if (held.id === 'mover') return { label: '🧤 Pick up ' + n, c: '#9be37a', fn: () => pickUpPlant(p) };
    }
  }
  if (held && held.t === 'gear' && held.id === 'egg') { const tgt = eggTarget(); if (tgt) return { label: '🥚 Throw Egg at ' + PLANT[tgt.p.id].n, c: '#fff3a0', fn: () => throwEgg(tgt) }; }
  if (held && held.t === 'gear' && held.id === 'treat') return { label: '🦴 Feed a pet', c: '#ffcf8a', fn: () => UI.openPets(true) };
  // harvest own
  if (inMine) { const p = plantAt(my, L.x, L.z, 2.4); if (p && ripeCount(p)) return { label: '🧺 Harvest ' + PLANT[p.id].n + ' (' + ripeCount(p) + ')', c: '#ffe14d', fn: () => harvestMine(p), plant: p }; }
  // steal from other gardens
  const og = G.gardens.find(g => g !== my && inPlot(g.plot, me.x, me.z, 0));
  if (og) { const l = localXZ(og, me.x, me.z); const p = plantAt(og, l.x, l.z, 2.2); if (p && ripeCount(p)) return { label: '🤫 Steal ' + PLANT[p.id].n, c: '#b46bff', fn: () => stealFrom(og, p) }; }
  if (nearSpot('seed')) return { label: '🌱 Seed Shop', c: '#4fbf3f', fn: () => UI.openShop('seed') };
  if (nearSpot('gear')) return { label: '🧰 Gear Shop', c: '#3f8fff', fn: () => UI.openShop('gear') };
  if (nearSpot('sell')) return { label: '💰 Sell Fruits', c: '#ffcf1f', fn: () => UI.openSell() };
  if (nearSpot('tg') && S.tgUnlocked) return { label: '🦃 Thanksgiving Shop', c: '#ff8c1a', fn: () => UI.openShop('tg') };
  if (nearSpot('tg') && !S.tgUnlocked) return { label: '🔒 Feed the Cornucopia to unlock', c: '#888', fn: null };
  if (nearSpot('corn', 4.2)) return { label: '🌽 Feed Cornucopia (' + S.backpack.filter(f => f.m.includes('Thankful')).length + ' Thankful)', c: '#ff8c1a', fn: feedCornucopia };
  const wa = G.wild.find(a => Math.hypot(a.x - me.x, a.z - me.z) < 2.6);
  if (wa) { const P = PET[wa.id]; return { label: '🐾 Buy ' + P.n + ' ' + fmt(P.p), c: '#ff9ae8', fn: () => buyWild(wa) }; }
  return null;
}
function plantHeld(L) {
  const id = G.held.id; if (!S.seeds[id]) return;
  S.seeds[id]--; if (!S.seeds[id]) { delete S.seeds[id]; G.held = null; }
  const p = addPlant(G.myGarden, id, L.x, L.z, 0); fxBurst(G.me.x, 0.4, G.me.z, '#7a4f2a', 10, 3);
  sfx('plant'); UI.refreshHotbar(); tutorialEvent('plant'); sendGarden(true);
  if (PLANT[id].def) toast('🛡️ ' + PLANT[id].n + ' will defend your garden once grown!');
}
function harvestMine(p) {
  const got = harvestPlant(G.myGarden, p);
  if (!got.length) return;
  const room = 300 - S.backpack.length; if (room <= 0) { toast('🎒 Backpack full! Go sell your fruits.'); return; }
  got.slice(0, room).forEach(f => S.backpack.push(f));
  S.stats.harvested += got.length;
  const d = PLANT[p.id]; const v = got.reduce((a, f) => a + fruitValue(f, d), 0);
  fxText(G.me.x, 2.2, G.me.z, '+' + got.length + ' ' + d.n + ' (' + fmt(v) + ')', '#ffe14d'); sfx('pop');
  me_pinch(); tutorialEvent('harvest'); UI.refreshMoney(); sendGarden(true);
  const best = got.find(f => f.m.length); if (best) toast('✨ ' + d.n + ' [' + best.m.join(', ') + '] worth ' + fmt(fruitValue(best, d)));
}
function me_pinch() { G.me.pinch = 0.4; }
function stealFrom(og, p) {
  if (og.kind === 'bot') {
    if (!NET.isHost) { netAct({ t: 'steal', to: 'host', plot: og.plot, u: p.u }); return; }
    const got = harvestPlant(og, p).slice(0, 1); if (!got.length) return;
    S.backpack.push(got[0]); toast('🤫 You stole a ' + PLANT[p.id].n + ' from ' + og.owner + '!'); sfx('pop'); me_pinch();
    const bot = G.bots.find(b => b.plot === og.plot); if (bot) botNotice(bot, 'stolen', S.name);
  } else {
    netAct({ t: 'steal', to: og.owner, plot: og.plot, u: p.u, by: S.name }); me_pinch();
  }
}
function shovelPlant(p) {
  const g = G.myGarden; g.group.remove(p.mesh); g.plants.splice(g.plants.indexOf(p), 1); fxBurst(G.me.x, 0.4, G.me.z, '#7a4f2a', 14, 4); toast('🪏 Dug up ' + PLANT[p.id].n); sendGarden(true);
}
function useGear(id) { if (GEARD[id].uses) { S.gearUses[id] = (S.gearUses[id] || GEARD[id].uses) - 1; if (S.gearUses[id] <= 0) { delete S.gearUses[id]; S.gear[id]--; if (!S.gear[id]) { delete S.gear[id]; G.held = null; } } } else { S.gear[id]--; if (!S.gear[id]) { delete S.gear[id]; G.held = null; } } UI.refreshHotbar(); }
function waterPlant(p) { const d = PLANT[p.id]; if (p.gp < d.g) p.gp += 10; else p.f.forEach(f => f.fp += 10); fxBurst(PLOTS[G.myGarden.plot].x + p.x, 1, PLOTS[G.myGarden.plot].z + p.z, '#6fb7ff', 12, 3); useGear('wateringcan'); sfx('water'); }
function placeSprinkler(L) { const g = G.myGarden; const s = { x: L.x, z: L.z, until: Date.now() + 300000 }; S.sprinklers.push(s); addSprinklerMesh(g, s); useGear('sprinkler'); toast('💦 Sprinkler placed! (5 min)'); }
function addSprinklerMesh(g, s) { const m = new THREE.Group(); m.add(cyl('#8a9aaa', 0, 0.3, 0, 0.08, 0.6)); m.add(cyl('#3f8fff', 0, 0.65, 0, 0.25, 0.1)); m.position.set(s.x, 0, s.z); g.group.add(m); s.mesh = m; g.sprinklers.push(s); }
function pickUpPlant(p) { const g = G.myGarden; g.group.remove(p.mesh); g.plants.splice(g.plants.indexOf(p), 1); G.carrying = p; useGear('mover'); toast('🧤 Picked up ' + PLANT[p.id].n + '. Walk to a free spot and place it.'); }
function placeCarried() { const g = G.myGarden; const L = localXZ(g, G.me.x, G.me.z); const p = G.carrying; p.x = L.x; p.z = L.z; g.plants.push(p); buildPlantMesh(g, p); G.carrying = null; sfx('plant'); sendGarden(true); }
function eggTarget() {
  let best = null, bd = 7;
  G.gardens.forEach(g => g.plants.forEach(p => { const wx = PLOTS[g.plot].x + p.x, wz = PLOTS[g.plot].z + p.z; const d = Math.hypot(wx - G.me.x, wz - G.me.z); if (d < bd) { bd = d; best = { g, p, wx, wz }; } }));
  return best;
}
function throwEgg(t) {
  useGear('egg'); me_pinch(); sfx('throw');
  fxProjectile(new THREE.Vector3(G.me.x, 1, G.me.z), new THREE.Vector3(t.wx, 1, t.wz), '#fffbe8', 0.18, () => {
    fxBurst(t.wx, 1, t.wz, '#fff3a0', 16, 4); sfx('splat');
    if (t.g === G.myGarden || (t.g.kind === 'bot' && NET.isHost)) eggPlant(t.g, t.p);
    else netAct({ t: 'egg', to: t.g.kind === 'bot' ? 'host' : t.g.owner, plot: t.g.plot, u: t.p.u });
  }, 16);
}
function eggPlant(g, p) { const d = PLANT[p.id]; if (p.gp < d.g) p.gp = Math.min(d.g, p.gp + 25); p.f.forEach(f => { f.fp += 15; if (!f.m.includes('Pranked')) f.m.push('Pranked'); }); }
function feedCornucopia() {
  const th = S.backpack.filter(f => f.m.includes('Thankful'));
  if (!th.length) { toast('🌽 The Cornucopia only eats Thankful fruits! They come from Turkey Rain 🦃'); return; }
  S.backpack = S.backpack.filter(f => !f.m.includes('Thankful'));
  const before = S.cornFed; S.cornFed += th.length * (hasPet('turkey') ? 2 : 1);
  fxBurst(SPOTS.corn.x, 2, SPOTS.corn.z, '#ff8c1a', 24, 5); sfx('chomp');
  if (!S.tgUnlocked && S.cornFed >= CORNUCOPIA_GOAL) { S.tgUnlocked = true; showTG(); UI.banner('🦃 THANKSGIVING SHOP UNLOCKED! 🦃', '#ff8c1a'); sfx('fanfare'); }
  else if (!S.tgUnlocked) toast('🌽 Cornucopia ' + Math.min(S.cornFed, CORNUCOPIA_GOAL) + '/' + CORNUCOPIA_GOAL + ' Thankful fruits');
  else { const gifts = Math.floor(S.cornFed / 5) - Math.floor(before / 5); for (let i = 0; i < gifts; i++) { const tgp = PLANTS.filter(d => d.tg && !d.noShop && d.p <= 9000); const d = weightedPick(tgp); S.seeds[d.id] = (S.seeds[d.id] || 0) + 1; toast('🎁 The Cornucopia gave you a ' + d.n + ' seed!'); } if (!gifts) toast('🌽 Yum! ' + (5 - S.cornFed % 5) + ' more for a gift'); }
  UI.refreshHotbar();
}
function weightedPick(arr) { const ws = arr.map(d => 1 / Math.sqrt(d.p + 10)); let r = Math.random() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { r -= ws[i]; if (r <= 0) return arr[i]; } return arr[0]; }
function showTG() { W.stalls.tg.visible = true; W.tgKeeper.visible = true; }

/* ---------- selling / buying ---------- */
function sellFruits(list) {
  let total = 0; list.forEach(f => { total += fruitValue(f, PLANT[f.id]); });
  S.backpack = S.backpack.filter(f => !list.includes(f));
  S.money += total; S.stats.earned += total; S.stats.sold += list.length;
  if (total > 0) { fxText(G.me.x, 2.4, G.me.z, '+' + fmt(total), '#7dff5a'); sfx('cash'); tutorialEvent('sell'); }
  UI.refreshMoney(); return total;
}
function buySeed(id, shop) {
  const d = PLANT[id]; const left = stockLeft(id, shop); if (left <= 0) return toast('Out of stock! Wait for the restock.');
  if (S.money < d.p) return toast('💸 Not enough money!'), sfx('no');
  S.money -= d.p; S.seeds[id] = (S.seeds[id] || 0) + 1; S.bought.c[id] = (S.bought.c[id] || 0) + 1;
  sfx('buy'); UI.refreshMoney(); UI.refreshHotbar(); tutorialEvent('buy:' + id);
  if (['Prismatic', '???', 'House', 'PAIN', 'Secret'].includes(d.r)) { netChat('[SYSTEM] ' + S.name + ' bought a ' + d.r + ' ' + d.n + '!', '#ffd23d', true); }
}
function stockLeft(id, shop) {
  if (id === 'beginous') return 99;
  const st = G.stock && (shop === 'tg' ? G.stock.tg : G.stock.seed); if (!st || !st[id]) return 0;
  if (S.bought.rid !== G.rid) S.bought = { rid: G.rid, c: {} };
  return st[id] - (S.bought.c[id] || 0);
}
function buyGear(id) {
  const g = GEARD[id]; if (S.money < g.p) return toast('💸 Not enough money!'), sfx('no');
  S.money -= g.p; S.gear[id] = (S.gear[id] || 0) + 1; if (g.uses && !S.gearUses[id]) S.gearUses[id] = g.uses; sfx('buy'); UI.refreshMoney(); UI.refreshHotbar();
}
function makeStock(forceSecret) {
  const seed = {}, tg = {};
  PLANTS.forEach(d => {
    if (d.noShop || d.id === 'beginous') return; const R = RARITY[d.r];
    let ch = R.stock; if (d.id === 'chipstack' && forceSecret) ch = 1;
    if (Math.random() < ch) (d.tg ? tg : seed)[d.id] = rndi(R.amt[0], R.amt[1]);
  });
  if (!Object.keys(tg).length) tg.crowplant = 3;
  seed.carrot = Math.max(seed.carrot || 0, 3);
  return { seed, tg };
}
function doRestock(forceSecret) {
  G.stock = makeStock(forceSecret); G.rid++; G.restockIn = 300;
  if (G.stock.seed.chipstack) { UI.banner('🟩 A SECRET SEED APPEARED IN THE SHOP!! 🟩', '#7dff5a'); netChat('[SYSTEM] A SECRET seed is in the Seed Shop right now!!', '#7dff5a', true); }
  onRestock();
  if (NET.isHost && !NET.solo) netBroadcastWorld();
}
function onRestock() { if (UI.shopOpen) UI.renderShop(); toast('🛒 The shops restocked!'); }

/* ---------- pets ---------- */
function hasPet(id) { return S && S.pets.some(p => p.eq && p.id === id); }
function petCd(p) { return PET[p.id].cd * Math.max(0.3, 1 - 0.045 * (p.lvl - 1)); }
function rebuildPetObjs() {
  G.petObjs.forEach(o => W.s.remove(o.mesh)); G.petObjs = [];
  S.pets.filter(p => p.eq).forEach((p, i) => { const m = makePet(p.id); m.scale.setScalar(0.85); W.s.add(m); G.petObjs.push({ p, mesh: m, x: G.me.x, z: G.me.z, t: p.t || petCd(p) * Math.random(), i }); });
}
function updatePets(dt) {
  G.petObjs.forEach((o, i) => {
    const a = G.me.rot + Math.PI + (i - 1) * 0.9; const tx = G.me.x + Math.sin(a) * 2.2, tz = G.me.z + Math.cos(a) * 2.2;
    const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz); const mv = d > 0.3;
    if (mv) { o.x += dx * Math.min(1, dt * 4); o.z += dz * Math.min(1, dt * 4); o.mesh.rotation.y = Math.atan2(dx, dz); }
    const fly = o.mesh.userData.fly; o.mesh.position.set(o.x, (fly ? 0.6 + Math.sin(G.t * 2 + i) * 0.2 : 0) + G.me.y * 0.8, o.z); animPet(o.mesh, mv, dt);
    const P = PET[o.p.id]; if (!P.cd) return;
    o.t -= dt; if (o.t <= 0) { o.t = petCd(o.p); petAbility(o); }
  });
  if (G.colaRush > 0) G.colaRush -= dt;
}
function randomMyFruit(ripeOnly) {
  const list = []; G.myGarden.plants.forEach(p => { const d = PLANT[p.id]; if (p.gp < d.g) return; p.f.forEach(f => { if (!ripeOnly || f.fp >= d.fr * 0.5) list.push({ p, f }); }); });
  return list.length ? pick(list) : null;
}
function addMut(f, m) { if (!f.m.includes(m)) f.m.push(m); }
function petAbility(o) {
  const id = o.p.id; const P = PET[id]; let msg = '';
  const fx = (c) => fxBurst(o.x, 1, o.z, c, 14, 3);
  switch (id) {
    case 'dog': { const pool = PLANTS.filter(d => !d.noShop && !d.tg && d.p > 0 && d.p <= 20000); const d = weightedPick(pool); S.seeds[d.id] = (S.seeds[d.id] || 0) + 1; msg = 'dug up a ' + d.n + ' seed!'; fx('#7a4f2a'); UI.refreshHotbar(); break; }
    case 'raccoon': { const bg = G.gardens.filter(g => g.kind === 'bot' && g.plants.some(p => ripeCount(p))); if (!bg.length) return; const g = pick(bg); const p = pick(g.plants.filter(p => ripeCount(p))); const got = NET.isHost ? harvestPlant(g, p).slice(0, 1) : [{ id: p.id, w: PLANT[p.id].w, m: [] }]; if (!got.length) return; S.backpack.push(got[0]); msg = 'snuck a ' + PLANT[p.id].n + ' from ' + g.owner + "'s garden 🦝"; fx('#7a7a82'); break; }
    case 'crow': { const r = randomMyFruit(); if (!r) return; addMut(r.f, 'Thankful'); msg = 'pecked a ' + PLANT[r.p.id].n + ' → Thankful!'; fx('#222'); break; }
    case 'turkey': { for (let k = 0; k < 2; k++) { const r = randomMyFruit(); if (r) addMut(r.f, 'Thankful'); } msg = 'GOBBLE! 2 fruits are now Thankful 🦃'; fx('#c0501f'); break; }
    case 'cola': { G.colaRush = 20; G.myGarden.plants.forEach(p => { const d = PLANT[p.id]; if (p.gp < d.g) p.gp += 30; else p.f.forEach(f => f.fp += 30); }); msg = 'SUGAR RUSH! Speed up + plants skipped 30s 🥤'; fx('#1f4fbf'); break; }
    case 'bee': { const r = randomMyFruit(); if (!r) return; addMut(r.f, 'Pollinated'); msg = 'pollinated a ' + PLANT[r.p.id].n + ' 🐝'; fx('#ffcf1f'); break; }
    case 'polarbear': { const r = randomMyFruit(); if (!r) return; const fr = Math.random() < 0.3 || r.f.m.includes('Frosty'); if (fr) { r.f.m = r.f.m.filter(x => x !== 'Frosty'); addMut(r.f, 'Frozen'); } else addMut(r.f, 'Frosty'); msg = 'breathed on a ' + PLANT[r.p.id].n + ' → ' + (fr ? 'Frozen' : 'Frosty') + ' 🐻‍❄️'; fx('#cfefff'); break; }
    case 'platypus': { S.gear.egg = (S.gear.egg || 0) + 1; let extra = ''; if (Math.random() < 0.25) { const r = randomMyFruit(); if (r) { addMut(r.f, 'Shocked'); extra = ' + ⚡ Shocked a ' + PLANT[r.p.id].n; } } msg = 'laid an Egg 🥚' + extra; fx('#6a8fb0'); UI.refreshHotbar(); break; }
    case 'inchworm': { const r = randomMyFruit(); if (!r) return; const k = rnd(1.5, 2.5); r.f.w *= k; msg = 'measured a ' + PLANT[r.p.id].n + ' → ' + k.toFixed(1) + 'x heavier 📏'; fx('#8fdf4f'); break; }
    case 'balloon': { const r = randomMyFruit(); if (!r) return; addMut(r.f, 'Floaty'); msg = 'made a ' + PLANT[r.p.id].n + ' Floaty 🎈'; fx('#ff4d6d'); break; }
  }
  if (msg) toast('🐾 ' + P.n + ' (Lv' + o.p.lvl + ') ' + msg);
}
function buyWild(a) {
  const P = PET[a.id]; if (S.money < P.p) return toast('💸 You need ' + fmt(P.p) + ' to adopt the ' + P.n), sfx('no');
  S.money -= P.p; const np = { u: G.uid++, id: a.id, lvl: 1, eq: S.pets.filter(p => p.eq).length < 3 };
  S.pets.push(np); W.s.remove(a.mesh); G.wild.splice(G.wild.indexOf(a), 1);
  toast('🐾 You adopted a ' + P.n + '! ' + P.ab); sfx('fanfare'); UI.refreshMoney(); rebuildPetObjs();
}
function givePet(id) { S.pets.push({ u: G.uid++, id, lvl: 1, eq: S.pets.filter(p => p.eq).length < 3 }); rebuildPetObjs(); }
function feedTreat(pu) { const p = S.pets.find(x => x.u === pu); if (!p || !S.gear.treat) return; if (p.lvl >= 20) return toast('Max level!'); S.gear.treat--; if (!S.gear.treat) { delete S.gear.treat; if (G.held && G.held.id === 'treat') G.held = null; } p.lvl++; toast('🦴 ' + PET[p.id].n + ' is now level ' + p.lvl + '! Cooldown ' + Math.round(petCd(p)) + 's'); sfx('fanfare'); UI.refreshHotbar(); }
/* wild animals wandering */
function wildPool() { return PETS.filter(p => !p.aao && (!p.tg || TG_EVENT)); }
function spawnWild(id) {
  if (!id) { const pool = wildPool(); const ws = pool.map(p => 1 / Math.pow(p.p, 0.35)); let r = Math.random() * ws.reduce((a, b) => a + b, 0); id = pool[0].id; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { id = pool[i].id; break; } } }
  let x, z, tries = 0; do { x = rnd(-MAP_R + 5, MAP_R - 5); z = rnd(-MAP_R + 5, MAP_R - 5); tries++; } while ((inAnyPlot(x, z, 3) >= 0 || Math.abs(z) < 9 || Math.hypot(x, z) > MAP_R - 4) && tries < 40);
  const m = makePet(id); const tag = textSprite(PET[id].n + ' ' + fmt(PET[id].p), '#ffd6f5', 'rgba(0,0,0,.35)', 0.35); tag.position.y = 1.6; m.add(tag);
  W.s.add(m); const a = { id, x, z, tx: x, tz: z, mesh: m, wait: rnd(0, 3), life: rnd(160, 320) }; G.wild.push(a); return a;
}
function updateWild(dt) {
  while (G.wild.length < 7) spawnWild();
  if (G.weather === 'Backrooms' && !G.wild.some(a => a.id === 'balloon') && Math.random() < dt * 0.2) { spawnWild('balloon'); toast('🎈 A Ballon appeared in the Backrooms...'); }
  for (let i = G.wild.length - 1; i >= 0; i--) {
    const a = G.wild[i]; a.life -= dt;
    if (a.life <= 0 || (a.id === 'balloon' && G.weather !== 'Backrooms')) { W.s.remove(a.mesh); G.wild.splice(i, 1); continue; }
    const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { a.wait -= dt; if (a.wait <= 0) { a.tx = clamp(a.x + rnd(-10, 10), -MAP_R + 4, MAP_R - 4); a.tz = clamp(a.z + rnd(-10, 10), -MAP_R + 4, MAP_R - 4); if (inAnyPlot(a.tx, a.tz, 2) >= 0 || Math.abs(a.tz) < 8) { a.tx = a.x; a.tz = a.z; } a.wait = rnd(1, 5); } animPet(a.mesh, false, dt); }
    else { a.x += dx / d * 2 * dt; a.z += dz / d * 2 * dt; a.mesh.rotation.y = Math.atan2(dx, dz); animPet(a.mesh, true, dt); }
    a.mesh.position.set(a.x, a.mesh.userData.fly ? 0.5 + Math.sin(G.t * 2 + i) * 0.2 : 0, a.z);
  }
}

/* ---------- weather ---------- */
function startWeather(name, dur, byAdmin) {
  G.weather = name; G.wtLeft = dur || WEATHERS[name].dur; setWeatherVisual(name);
  UI.banner(WEATHERS[name].icon + ' ' + name.toUpperCase() + (WEATHERS[name].aao ? ' (ADMIN ABUSE!)' : '') + ' ' + WEATHERS[name].icon, '#fff');
  sfx('weather'); botsReactWeather(name);
  if (name === 'Turkey Rain' && NET.isHost && Math.random() < 0.35) setTimeout(() => spawnBoss(), 6000);
}
function endWeather() { G.weather = null; G.wtLeft = 0; setWeatherVisual(null); }
function allGardensForMut() { return NET.isHost ? G.gardens.filter(g => g === G.myGarden || g.kind === 'bot') : [G.myGarden]; }
function updateWeather(dt) {
  if (NET.isHost) {
    if (G.weather) { G.wtLeft -= dt; if (G.wtLeft <= 0) { endWeather(); netBroadcastWorld(); } }
    else { G.nextWeatherIn -= dt; if (G.nextWeatherIn <= 0) { G.nextWeatherIn = rnd(150, 280); const pool = NATURAL_WEATHER.concat(TG_EVENT ? ['Turkey Rain', 'Turkey Rain'] : []); startWeather(pick(pool)); netBroadcastWorld(); } }
    G.restockIn -= dt; if (G.restockIn <= 0) doRestock(Math.random() < RARITY.Secret.stock);
  } else { if (G.weather) G.wtLeft = Math.max(0, G.wtLeft - dt); G.restockIn = Math.max(0, G.restockIn - dt); }
  if (!G.weather) return;
  const wd = WEATHERS[G.weather];
  G.mutT += dt; if (G.mutT < 1) return; G.mutT = 0;
  const gardens = allGardensForMut();
  if (wd.chance) gardens.forEach(g => g.plants.forEach(p => { const d = PLANT[p.id]; if (p.gp < d.g) return; p.f.forEach(f => { if (f.fp < d.fr * 0.5) return; if (Math.random() < wd.chance * (g.sprinklers.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 5) && G.weather === 'Rain' ? 2 : 1)) applyWeatherMut(f, wd); }); }));
  if (G.weather === 'Thunder' && NET.isHost && Math.random() < 0.3) { const g = pick(G.gardens); const x = PLOTS[g.plot].x + rnd(-9, 9), z = PLOTS[g.plot].z + rnd(-6, 6); strike(x, z); netAct({ t: 'strike', to: 'all', x, z }); }
  if (G.weather === 'Volcano' && NET.isHost && Math.random() < 0.35) { const g = pick(G.gardens); const x = PLOTS[g.plot].x + rnd(-9, 9), z = PLOTS[g.plot].z + rnd(-6, 6); meteor(x, z); netAct({ t: 'meteor', to: 'all', x, z }); }
}
function applyWeatherMut(f, wd) {
  if (wd.evo) { const [a, b] = wd.evo; if (f.m.includes(b)) return; if (f.m.includes(a)) { f.m = f.m.filter(x => x !== a); f.m.push(b); return; } f.m.push(a); return; }
  addMut(f, wd.mut);
}
function strike(x, z) {
  fxBolt(x, z); sfx('thunder'); flash();
  [G.myGarden].concat(NET.isHost ? G.gardens.filter(g => g.kind === 'bot') : []).forEach(g => g.plants.forEach(p => { const wx = PLOTS[g.plot].x + p.x, wz = PLOTS[g.plot].z + p.z; if (Math.hypot(wx - x, wz - z) < 2.5) { const d = PLANT[p.id]; p.f.forEach(f => { if (p.gp >= d.g && f.fp >= d.fr * 0.5) addMut(f, 'Shocked'); }); } }));
  if (G.me && Math.hypot(G.me.x - x, G.me.z - z) < 2) { G.me.kb = { x: rnd(-8, 8), z: rnd(-8, 8) }; G.me.vy = 7; toast('⚡ ZAP!'); }
}
function meteor(x, z) {
  const from = new THREE.Vector3(0, 40, -95);
  fxProjectile(from, new THREE.Vector3(x, 0.3, z), '#ff5a00', 0.7, () => {
    fxBurst(x, 0.5, z, '#ff7a1a', 22, 6, 1); sfx('boom');
    [G.myGarden].concat(NET.isHost ? G.gardens.filter(g => g.kind === 'bot') : []).forEach(g => g.plants.forEach(p => { const wx = PLOTS[g.plot].x + p.x, wz = PLOTS[g.plot].z + p.z; if (Math.hypot(wx - x, wz - z) < 3) { const d = PLANT[p.id]; p.f.forEach(f => { if (p.gp >= d.g && f.fp >= d.fr * 0.5) addMut(f, 'Burnt'); }); } }));
  }, 30);
}
function flash() { const el = document.getElementById('flash'); el.style.opacity = 0.8; setTimeout(() => el.style.opacity = 0, 90); }

/* ---------- defence plants ---------- */
function intruders(g) {
  const out = [];
  const consider = (id, x, z, kind) => { if (inPlot(g.plot, x, z, 0.5)) out.push({ id, x, z, kind }); };
  G.bots.forEach(b => { if (b.plot !== g.plot) consider(b.name, b.x, b.z, 'bot'); });
  Object.entries(G.remotes).forEach(([id, r]) => { if (r.plot !== g.plot) consider(id, r.x, r.z, 'player'); });
  if (g !== G.myGarden && G.me) consider(myId(), G.me.x, G.me.z, 'me');
  return out;
}
function updateDefence(dt) {
  G.defT -= dt; if (G.defT > 0) return; G.defT = 0.35;
  const mine = [G.myGarden].concat(NET.isHost ? G.gardens.filter(g => g.kind === 'bot') : []);
  mine.forEach(g => {
    const defs = g.plants.filter(p => PLANT[p.id].def && p.gp >= PLANT[p.id].g); if (!defs.length) return;
    const ints = intruders(g); if (!ints.length) return;
    defs.forEach(p => {
      p.cd = (p.cd || 0) - 0.35; if (p.cd > 0) return;
      const px = PLOTS[g.plot].x + p.x, pz = PLOTS[g.plot].z + p.z;
      const tgt = ints.filter(t => Math.hypot(t.x - px, t.z - pz) < 9).sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz))[0];
      if (!tgt) return; p.cd = 1.6;
      const type = PLANT[p.id].def; const ang = Math.atan2(tgt.x - px, tgt.z - pz);
      if (p.mesh && p.mesh.userData.head) p.mesh.userData.head.rotation.y = ang - p.mesh.rotation.y;
      const push = (k, up) => hitIntruder(tgt, Math.sin(ang) * k, Math.cos(ang) * k, up, g, type);
      if (type === 'pea') { sfx('pew'); fxProjectile(new THREE.Vector3(px, 1.1, pz), new THREE.Vector3(tgt.x, 0.8, tgt.z), '#7dff5a', 0.16, () => push(12, 4), 22); }
      else if (type === 'snap') { if (Math.hypot(tgt.x - px, tgt.z - pz) > 4.5) { p.cd = 0.3; return; } sfx('chomp'); if (p.mesh) { const j = p.mesh.userData.jaw; if (j) { j[0].rotation.x = -0.5; setTimeout(() => j[0].rotation.x = 0, 250); } } push(18, 12); }
      else if (type === 'suck') { if (Math.hypot(tgt.x - px, tgt.z - pz) > 6) { p.cd = 0.3; return; } sfx('slurp'); fxBurst(px, 1, pz, '#c03f6f', 10, 3); push(-6, 2); setTimeout(() => push(20, 9), 600); }
      else if (type === 'glitch') { sfx('glitch'); fxBurst(tgt.x, 1, tgt.z, '#3fff3f', 20, 5); hitIntruder(tgt, 0, 0, 0, g, 'glitch'); }
    });
  });
}
function hitIntruder(t, kx, kz, up, g, type) {
  if (t.kind === 'me') { applyKnock(kx, kz, up, type, g.owner); return; }
  if (t.kind === 'bot') { const b = G.bots.find(b => b.name === t.id); if (b) { if (type === 'glitch') { b.x = rnd(-50, 50); b.z = rnd(40, 55) * (Math.random() < .5 ? 1 : -1); } else { b.kb = { x: kx, z: kz }; b.vy = up; } b.stealing = null; botNotice(b, 'defended', g.owner); } return; }
  netAct({ t: 'knock', to: t.id, kx, kz, up, type, owner: g.owner });
}
function applyKnock(kx, kz, up, type, owner) {
  const me = G.me; if (!me) return;
  if (type === 'glitch') { me.x = rnd(-50, 50); me.z = rnd(40, 55) * (Math.random() < .5 ? 1 : -1); toast('📛 G̷L̴I̵T̸C̷H̶E̵D̷ out of ' + owner + "'s garden!"); flash(); return; }
  me.kb = { x: kx, z: kz }; me.vy = up; me.onGround = false; me.stun = 0.4; toast('🛡️ ' + owner + "'s defence plants got you!");
}

/* ---------- LORD CROW BOSS (host simulates) ---------- */
function spawnBoss() {
  if (G.boss && (G.boss.alive || G.boss.dead)) return;
  const n = 1 + Object.keys(G.remotes).length + G.bots.length;
  G.boss = { alive: true, hp: 70 + n * 30, max: 70 + n * 30, x: 0, y: 14, z: -10, t: 0, phase: 'circle', target: null, parts: [], dmg: {} };
  ensureBossMesh(); UI.banner('🐦‍⬛ THE LORD CROW HAS ARRIVED! PINCH HIM! 🐦‍⬛', '#ff3b3b'); sfx('boss'); botsReactBoss();
  netBroadcastWorld();
}
function ensureBossMesh() { if (!G.bossMesh) { G.bossMesh = makeLordCrow(); W.s.add(G.bossMesh); } G.bossMesh.visible = true; }
function updateBoss(dt) {
  const B = G.boss; if (!B) { if (G.bossMesh) G.bossMesh.visible = false; return; }
  ensureBossMesh(); const m = G.bossMesh;
  if (B.alive && NET.isHost) {
    B.t += dt;
    if (B.phase === 'circle') {
      const a = B.t * 0.35; const tx = Math.cos(a) * 18, tz = Math.sin(a) * 14; B.x += (tx - B.x) * dt; B.z += (tz - B.z) * dt; B.y += (9 - B.y) * dt;
      if (B.t > 5) { const crabs = allCrabs(); if (crabs.length) { B.target = pick(crabs); B.phase = 'dive'; B.t = 0; } }
      if (Math.random() < dt * 0.25) { const crabs = allCrabs(); crabs.slice(0, 4).forEach(c => { const tx = c.x, tz = c.z; fxProjectile(new THREE.Vector3(B.x, B.y, B.z), new THREE.Vector3(tx, 0.5, tz), '#111', 0.25, () => featherHit(tx, tz), 18); netAct({ t: 'feather', to: 'all', fx: B.x, fy: B.y, fz: B.z, x: tx, z: tz }); }); }
    } else if (B.phase === 'dive') {
      const T = B.target; B.x += (T.x - B.x) * dt * 2.5; B.z += (T.z - B.z) * dt * 2.5; B.y += (1.6 - B.y) * dt * 3;
      if (B.t > 1.1) { crabHitAt(B.x, B.z, 3); B.phase = 'grounded'; B.t = 0; fxBurst(B.x, 0.5, B.z, '#333', 18, 5); sfx('boom'); }
    } else if (B.phase === 'grounded') { B.y = 1.6 + Math.sin(B.t * 8) * 0.1; if (B.t > 3.6) { B.phase = 'circle'; B.t = 0; } }
    if (B.hp <= 0) { B.alive = false; B.dead = true; B.y = 0.8; B.deadT = 90; UI.banner('🏆 THE LORD CROW HAS FALLEN! CLAIM YOUR REWARD! 🏆', '#ffd23d'); sfx('fanfare'); botsBossDefeated(); netBroadcastWorld(); }
  }
  if (B.dead && NET.isHost) { B.deadT -= dt; if (B.deadT <= 0) { G.boss = null; netBroadcastWorld(); } }
  m.position.set(B.x, B.y, B.z);
  const u = m.userData; u.t += dt;
  if (B.alive) { u.wings.forEach((w, i) => w.rotation.z = Math.sin(u.t * (B.phase === 'grounded' ? 3 : 8)) * 0.5 * (i ? -1 : 1)); const crabs = allCrabs(); const c = crabs.length ? crabs.reduce((a, b) => Math.hypot(a.x - B.x, a.z - B.z) < Math.hypot(b.x - B.x, b.z - B.z) ? a : b) : null; if (c) m.rotation.y = Math.atan2(c.x - B.x, c.z - B.z); m.rotation.z = 0; }
  else { m.rotation.z = Math.PI / 2; m.position.y = 0.9; }
  UI.bossBar(B);
}
function allCrabs() { const a = []; if (G.me) a.push({ id: myId(), x: G.me.x, z: G.me.z, kind: 'me' }); G.bots.forEach(b => a.push({ id: b.name, x: b.x, z: b.z, kind: 'bot' })); Object.entries(G.remotes).forEach(([id, r]) => a.push({ id, x: r.x, z: r.z, kind: 'player' })); return a; }
function crabHitAt(x, z, r) { allCrabs().forEach(c => { if (Math.hypot(c.x - x, c.z - z) < r) { const a = Math.atan2(c.x - x, c.z - z); if (c.kind === 'me') hurtMe(Math.sin(a) * 14, Math.cos(a) * 14); else if (c.kind === 'bot') { const b = G.bots.find(b => b.name === c.id); if (b) { b.kb = { x: Math.sin(a) * 14, z: Math.cos(a) * 14 }; b.vy = 8; } } else netAct({ t: 'hurt', to: c.id, kx: Math.sin(a) * 14, kz: Math.cos(a) * 14 }); } }); }
function featherHit(x, z) { if (G.me && Math.hypot(G.me.x - x, G.me.z - z) < 1.6) hurtMe(rnd(-5, 5), rnd(-5, 5)); fxBurst(x, 0.4, z, '#222', 6, 2); }
function hurtMe(kx, kz) {
  const me = G.me; me.kb = { x: kx, z: kz }; me.vy = 8; me.onGround = false; me.stun = 0.5; G.hearts--; sfx('hurt'); flash();
  if (G.hearts <= 0) { G.hearts = 5; const p = PLOTS[me.plot]; me.x = p.x; me.z = p.z + p.face * (PLOT_D / 2 + 3); toast('💫 You got knocked out! Back to your garden.'); }
  UI.refreshHearts();
}
function pinchBoss() {
  me_pinch(); sfx('pinch'); fxBurst(G.boss.x, G.boss.y, G.boss.z, '#ff3b3b', 8, 4);
  if (NET.isHost) bossDamage(myId(), 2); else netAct({ t: 'hit', to: 'host', id: myId() });
}
function bossDamage(id, n) { const B = G.boss; if (!B || !B.alive) return; B.hp -= n; if (!B.parts.includes(id)) B.parts.push(id); }
function claimBoss() {
  const B = G.boss; B.claimed = true;
  if (Math.random() < 0.1) { S.seeds.scarecrow = (S.seeds.scarecrow || 0) + 1; UI.banner('🌾 YOU GOT THE SCARECROW BLOSSOM!! 🌾', '#ff3b3b'); sfx('fanfare'); netChat('[SYSTEM] ' + S.name + ' claimed a SCARECROW BLOSSOM from the Lord Crow!', '#ff3b3b', true); UI.refreshHotbar(); }
  else { const bonus = 5000 + Math.floor(Math.random() * 20000); S.money += bonus; toast('😔 No Scarecrow Blossom this time (10% chance)... but you got ' + fmt(bonus) + ' and Thankful feathers!'); UI.refreshMoney(); }
}

/* ---------- tutorial ---------- */
const TUT = [
  { txt: '👋 Welcome to GARDEN TIME! You are a crab 🦀. Walk to YOUR garden (the one with your name on the sign).', ev: 'inplot' },
  { txt: '🌱 Pick the Beginous seed in your hotbar, then tap PLANT inside your garden.', ev: 'plant' },
  { txt: '⏳ Nice! Wait for it to grow fruits, then walk up and HARVEST them.', ev: 'harvest' },
  { txt: '💰 Take your fruits to the SELL stand in the middle of the map.', ev: 'sell' },
  { txt: '🥕 Now buy a Carrot seed from the SEED shop and keep growing! Tutorial done 🎉', ev: 'buy:carrot' },
];
function tutorialEvent(ev) { if (S.tut >= TUT.length) return; const ix = TUT.findIndex((t, i) => i >= S.tut && t.ev === ev); if (ix >= 0) { S.tut = ix + 1; if (S.tut === TUT.length) { S.money += 50; toast('🎉 Tutorial complete! +$50'); UI.refreshMoney(); } UI.tutorial(); } }

/* ---------- main loop ---------- */
let lastT = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(); let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; G.t += dt;
  if (G.mode !== 'play') { if (G.mode === 'title') titleSpin(dt); W.r.render(W.s, W.cam); return; }
  updateMe(dt); updateCamera(dt);
  // growing
  G.growT += dt; if (G.growT >= 0.25) { const gt = G.growT; G.growT = 0;
    growGarden(G.myGarden, gt, hasPet('turtle') ? 1.15 : 1);
    if (NET.isHost) G.gardens.forEach(g => { if (g.kind === 'bot') growGarden(g, gt, 1); });
    S.sprinklers = S.sprinklers.filter(s => { if (Date.now() > s.until) { G.myGarden.group.remove(s.mesh); G.myGarden.sprinklers.splice(G.myGarden.sprinklers.indexOf(s), 1); return false; } return true; });
    if (S.tut === 0 && inPlot(G.me.plot, G.me.x, G.me.z, 0)) tutorialEvent('inplot');
  }
  const vr = 34 * 34;
  G.gardens.forEach(g => g.plants.forEach(p => { const wx = PLOTS[g.plot].x + p.x - G.me.x, wz = PLOTS[g.plot].z + p.z - G.me.z; if (wx * wx + wz * wz < vr || G.t % 1 < dt) updatePlantVisual(g, p, dt); }));
  updatePets(dt); updateWild(dt); updateWeather(dt); updateDefence(dt); updateBoss(dt);
  updateBots(dt); updateRemotes(dt); updateFx(dt); updateWeatherVisual(dt, G.me);
  W.keepers.forEach(k => animCrab(k, 0, dt, 0));
  netTick(dt);
  G.saveT += dt; if (G.saveT > 8) { G.saveT = 0; save(); }
  UI.frame(dt);
  W.r.render(W.s, W.cam);
}
function titleSpin(dt) { const a = G.t * 0.08; W.cam.position.set(Math.sin(a) * 48, 22, Math.cos(a) * 48); W.cam.lookAt(0, 0, 0); updateWeatherVisual(dt, { x: 0, z: 0 }); }

function startGame() {
  G.mode = 'play'; document.body.classList.add('playing');
  const myPlot = NET.myPlot || 0;
  G.myGarden = makeGarden(myPlot, S.name, 'me'); G.gardens.push(G.myGarden);
  // load saved plants + offline growth
  const off = Math.min(12 * 3600, Math.max(0, (Date.now() - (S.last || Date.now())) / 1000));
  S.plants.forEach(sp => { if (!PLANT[sp.id]) return; const p = { u: G.uid++, id: sp.id, x: sp.x, z: sp.z, gp: sp.gp, f: sp.f.map(f => ({ fp: f.fp, w: f.w, m: f.m || [] })) }; const d = PLANT[p.id]; while (p.f.length < d.fc) p.f.push(newFruit(d)); G.myGarden.plants.push(p); buildPlantMesh(G.myGarden, p); });
  if (off > 5) { growGarden(G.myGarden, off, 1); if (off > 60) setTimeout(() => toast('🌙 Your garden grew for ' + Math.round(off / 60) + ' min while you were away!'), 1500); }
  S.sprinklers.forEach(s => addSprinklerMesh(G.myGarden, s));
  plotSign(myPlot, S.name, '#2f7f2f');
  spawnMe(myPlot); rebuildPetObjs();
  if (S.tgUnlocked) showTG();
  if (NET.isHost) { G.stock = makeStock(false); G.rid = 1; setupBots(); }
  UI.enterGame();
  setInterval(() => sendGarden(false), 2000);
}
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

/* ---------- sound (tiny synth) ---------- */
let AC = null;
function sfx(k) {
  if (UI.muted) return;
  try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const t = AC.currentTime; const o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
  const P = { pop: [600, 900, 0.08, 'sine'], plant: [220, 160, 0.12, 'triangle'], cash: [800, 1400, 0.15, 'square'], buy: [500, 800, 0.1, 'triangle'], no: [200, 120, 0.15, 'sawtooth'], fanfare: [500, 1000, 0.4, 'triangle'], weather: [300, 500, 0.5, 'sine'], thunder: [80, 40, 0.5, 'sawtooth'], boom: [120, 40, 0.4, 'sawtooth'], pew: [900, 300, 0.1, 'square'], chomp: [300, 150, 0.12, 'square'], slurp: [200, 600, 0.25, 'sine'], glitch: [100, 1500, 0.2, 'square'], hurt: [400, 100, 0.2, 'sawtooth'], pinch: [1200, 700, 0.06, 'square'], boss: [100, 60, 0.9, 'sawtooth'], water: [700, 500, 0.15, 'sine'], throw: [400, 700, 0.1, 'sine'], splat: [200, 80, 0.12, 'triangle'], chat: [700, 760, 0.05, 'sine'] }[k] || [440, 440, 0.1, 'sine'];
  o.type = P[3]; o.frequency.setValueAtTime(P[0], t); o.frequency.exponentialRampToValueAtTime(P[1], t + P[2]);
  g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + P[2] + 0.05); o.start(t); o.stop(t + P[2] + 0.06);
}
function toast(msg) { UI.toast(msg); }
