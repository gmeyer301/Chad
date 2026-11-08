/* Escape from Barkov — the raid: player, weapons, ballistics, looting, extraction, HUD */
'use strict';
(() => {
const I = G.ITEMS, A = G.AMMO; const $ = G.$, h = G.h;
A.frag = { name: 'Fragment', cal: 'frag', dmg: 26, pen: 16, spd: 520, ad: 15 };
A.stick = { name: 'Sharpened stick', cal: 'melee', dmg: 32, pen: 4, spd: 0, ad: 5 };
let renderer = null;
const KEYS = {}; const MOUSE = { dx: 0, dy: 0, l: false, r: false };
const TOUCH = { mx: 0, mz: 0, on: false };

/* ---------- renderer ---------- */
function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: G.S.settings.gfx !== 'low', powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.autoClear = false;
  $('#game').appendChild(renderer.domElement); G.renderer = renderer;
  return renderer;
}
function resize() { if (!renderer || !G.R) return; const w = innerWidth, hh = innerHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, G.S.settings.gfx === 'high' ? 2 : G.S.settings.gfx === 'low' ? .75 : 1.25)); renderer.setSize(w, hh); G.R.cam.aspect = w / hh; G.R.cam.updateProjectionMatrix(); G.R.vmCam.aspect = w / hh; G.R.vmCam.updateProjectionMatrix(); }
window.addEventListener('resize', resize);

/* ================= START RAID ================= */
G.startRaid = (cfg) => {
  const S = G.S; G.AU.init();
  const R = G.R = { cfg, t: 0, actors: [], proj: [], nades: [], fx: [], loots: [], aiSeq: 0, night: !!cfg.night, pvp: !!cfg.pvp, isHost: cfg.host !== false, net: cfg.net || null, kills: [], xp: { kills: 0, loot: 0, heal: 0, explore: 0, survive: 0 }, found: 0, binds: {}, over: false, startReal: Date.now(), seed: cfg.seed || Math.floor(Math.random() * 1e9), remotes: new Map() };
  const rr = G.rng(R.seed);
  // world
  const scene = R.scene = new THREE.Scene(); const W = R.W = G.buildWorld(cfg.map); scene.add(W.group);
  setupLights(R);
  const cam = R.cam = new THREE.PerspectiveCamera(S.settings.fov, innerWidth / innerHeight, .05, 900); scene.add(cam);
  R.vmScene = new THREE.Scene(); R.vmCam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .01, 10);
  R.vmScene.add(new THREE.HemisphereLight(0xffffff, 0x404030, R.night ? .35 : W.indoor ? .5 : .9)); const vd = new THREE.DirectionalLight(0xffffff, R.night ? .2 : .6); vd.position.set(.5, 1, .3); R.vmScene.add(vd);
  // flashlight
  R.flashlight = new THREE.SpotLight(0xfff2d0, 0, 45, .42, .5, 1.3); R.flashlight.castShadow = false; cam.add(R.flashlight); cam.add(R.flashlight.target); R.flashlight.position.set(.15, -.1, 0); R.flashlight.target.position.set(0, 0, -5);
  R.muzzleLight = new THREE.PointLight(0xffc070, 0, 8, 2); scene.add(R.muzzleLight);
  // loot containers (identical on every peer: seeded)
  W.loot.forEach((L, i) => { const lr = G.rng(R.seed + i * 7919); const c = { id: 'L' + i, kind: 'cont', type: L.type, name: G.LOOT_NAMES[L.type], pos: new THREE.Vector3(L.x, L.y, L.z), grid: G.genLoot(L.type, lr, L.rich), searchMul: (G.LOOT[L.type].search || 1) }; if (L.type === 'loose' && !c.grid.items.length) return; R.loots.push(c); lootMesh(R, c); });
  // extracts
  const isScav = !!cfg.scav; const er = G.rng(R.seed + 99);
  R.extracts = W.extracts.filter(e => e.who === (isScav ? 'scav' : 'pmc')).filter(e => e.kind !== 'chance' || er() < e.chance);
  R.extracts.forEach(e => extractMarker(R, e));
  // the player
  const eq = R.eq = isScav ? G.genLoadout('sapling') : G.clone(S.eq);
  if (isScav) { eq.secure = null; G.allEqItems(eq).forEach(it => it.fir = false); }
  R.startUids = new Set(G.allEqItems(eq).map(it => it.u));
  const me = R.me = G.newActor(R, { id: cfg.myId || 'me', fac: 'player', name: isScav ? G.aiName('sapling') : S.name, eq, look: isScav ? 'sapling' : S.faction, noModel: true, isMe: true, team: cfg.team || 'me', scav: isScav });
  me.health = isScav ? G.newHealth() : G.clone(S.health); G.PARTS.forEach(k => { const p = me.health.p[k]; p.bl = 0; p.hb = 0; });
  me.hyd = isScav ? 80 : S.health.hyd; me.en = isScav ? 80 : S.health.en;
  me.stam = 100; me.vy = 0; me.wslot = eq.primary ? 'primary' : eq.secondary ? 'secondary' : eq.holster ? 'holster' : null; me.busy = null; me.pain = 0; me.painkill = 0; me.stim = 0; me.lean = 0; me.crouch = false; me.ads = 0; me.recoil = { p: 0, y: 0, vk: 0 }; me.light = false; me.ground = 0; me.cycleT = 0; me.lastShot = 0; me.trig = false; me.eyeH = 1.62;
  me.weapon = me.wslot ? eq[me.wslot] : null;
  // spawn point
  const sp = cfg.spawn || (() => { const list = isScav ? W.spawns.scav : W.spawns.pmc; return list[Math.floor((cfg.spawnIdx != null ? cfg.spawnIdx : Math.random() * list.length)) % list.length]; })();
  const p0 = G.randomFree(W, sp[0], sp[1], cfg.squadSpawn ? 4 : 2); me.pos.set(p0[0], 0, p0[1]);
  me.yaw = Math.atan2(me.pos.x, me.pos.z); // face the map centre
  R.timeLeft = W.meta.time * 60 * (isScav ? (.45 + Math.random() * .4) : 1); R.totalTime = R.timeLeft;
  if (isScav) S.scavAt = Date.now() + 8 * 60000;
  // AI (host only)
  if (cfg.allSpawns) cfg.spawnPts = cfg.allSpawns.map(i => W.spawns.pmc[i % W.spawns.pmc.length]);
  if (R.isHost) spawnAI(R, rr, cfg);
  R.waveT = 240 + rr() * 120;
  buildViewmodel(R);
  // mark save as in-raid (closing the tab = MIA)
  S.inRaid = { map: cfg.map, scav: isScav, at: Date.now() }; S.stats.raids++; G.save();
  // HUD + input
  G.show('raid'); getRenderer(); resize(); hudInit(R);
  G.AU.ambient(R.night, W.indoor);
  banner(R);
  R.last = performance.now(); R.running = true; requestAnimationFrame(loop);
  lockPointer();
  return R;
};

function setupLights(R) {
  const W = R.W, sc = R.scene, sun = W.sun; const night = R.night;
  const fogCol = night ? 0x05070a : sun.fog[0];
  sc.fog = new THREE.Fog(fogCol, night ? 4 : sun.fog[1], night ? (W.indoor ? 40 : 75) : sun.fog[2]);
  sc.background = new THREE.Color(fogCol);
  const hemi = new THREE.HemisphereLight(night ? 0x223044 : sun.amb[0], night ? 0x080a08 : sun.amb[1], night ? .16 : sun.amb[2]); sc.add(hemi);
  const dl = new THREE.DirectionalLight(night ? 0x8090c0 : sun.day[0], night ? .12 : sun.day[1]); dl.position.set(60, 100, 40);
  const gfx = G.S.settings.gfx;
  if (gfx !== 'low' && !W.indoor) { dl.castShadow = true; const s = gfx === 'high' ? 2048 : 1024; dl.shadow.mapSize.set(s, s); const c = dl.shadow.camera; c.left = c.bottom = -55; c.right = c.top = 55; c.near = 10; c.far = 260; dl.shadow.bias = -.0006; dl.shadow.normalBias = .03; }
  sc.add(dl); sc.add(dl.target); R.sun = dl;
  // sky dome
  if (!W.indoor) {
    const g = new THREE.SphereGeometry(600, 24, 12); const top = new THREE.Color(night ? 0x02030a : 0x6a8fb8), bot = new THREE.Color(fogCol);
    const cols = []; const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const k = G.clamp(pos.getY(i) / 300, 0, 1); const c = bot.clone().lerp(top, Math.pow(k, .6)); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); sc.add(sky); R.sky = sky;
    if (night) { const sg = new THREE.BufferGeometry(); const sp = []; for (let i = 0; i < 600; i++) { const a = Math.random() * 6.28, b = Math.random() * 1.2 + .15; sp.push(Math.cos(a) * Math.cos(b) * 550, Math.sin(b) * 550, Math.sin(a) * Math.cos(b) * 550); } sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); const st = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false, fog: false })); sky.add(st); }
  }
  // lamps
  const maxL = G.S.settings.gfx === 'low' ? 3 : 8;
  W.lights.slice(0, maxL).forEach(l => { const pl = new THREE.PointLight(l.col, l.int * (night ? 1.2 : 1), l.dist, 2); pl.position.set(l.x, l.y, l.z); sc.add(pl); const bulb = new THREE.Mesh(new THREE.SphereGeometry(.15, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe8b0 })); bulb.position.copy(pl.position); sc.add(bulb); });
}

/* ---------- loot visuals ---------- */
const LOOT_LOOK = { jacket: [.5, .7, .25, 0x5a5a3a], medbag: [.5, .35, .3, 0xa03a2a], weaponbox: [1.6, .45, .55, 0x3d4a2c], ammobox: [.6, .4, .4, 0x4b5a2a], toolbox: [.6, .3, .3, 0xb03a2a], crate: [1, .8, .8, 0x8a6a40], safe: [.6, .7, .6, 0x3a3a3a], pc: [.25, .5, .5, 0x2a2a2a], ration: [.8, .5, .5, 0x6a7a4a], filecab: [.5, 1.3, .6, 0x5a6a6a], armor: [1.2, 1.7, .5, 0x4a4a3a], loose: [.3, .15, .3, 0xc0a060] };
function lootMesh(R, c) {
  const L = LOOT_LOOK[c.type] || [.5, .5, .5, 0x888888]; const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.BoxGeometry(L[0], L[1], L[2]), new THREE.MeshLambertMaterial({ color: L[3] })); m.position.y = L[1] / 2; m.castShadow = true; m.receiveShadow = true; g.add(m);
  if (c.type === 'jacket') { m.rotation.z = .2; m.scale.y = .4; m.position.y = .1; }
  if (c.type === 'loose') { const it = c.grid.items[0] && c.grid.items[0].it; if (it) m.material.color.set(I[it.id].col || '#aa8'); }
  if (c.type === 'safe') { const d = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .05, 10), new THREE.MeshLambertMaterial({ color: 0xc0a050 })); d.rotation.x = Math.PI / 2; d.position.set(0, L[1] / 2, -L[2] / 2 - .02); g.add(d); }
  g.position.copy(c.pos); R.scene.add(g); c.mesh = g;
}
function extractMarker(R, e) {
  // a smoke-flare post marks every extract (still have to know which ones are yours)
  const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.4, 5), new THREE.MeshLambertMaterial({ color: 0x9a9a9a })); pole.position.y = 1.2; g.add(pole);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(.9, .45, .04), new THREE.MeshLambertMaterial({ color: 0x2f6a2a, emissive: 0x0a2a0a })); sign.position.y = 2.3; g.add(sign);
  g.position.set(e.x, 0, e.z); R.scene.add(g);
}

/* ---------- AI spawning (host) ---------- */
function spawnAI(R, rr, cfg) {
  const W = R.W; const players = () => R.actors.filter(a => a.fac === 'player');
  const farFromPlayers = (x, z, d) => players().every(p => Math.hypot(p.pos.x - x, p.pos.z - z) > d) && (cfg.spawnPts || []).every(p => Math.hypot(p[0] - x, p[1] - z) > d);
  W.zones.forEach(zn => { const n = Math.round(zn.n * (.55 + rr() * .6)); for (let i = 0; i < n; i++) { const p = G.randomFree(W, zn.x, zn.z, zn.r, rr); if (!farFromPlayers(p[0], p[1], 30)) continue; R.addAI('sapling', p[0], p[1], zn); } });
  if (W.boss && rr() < W.boss.chance * (cfg.bossBoost ? 2 : 1)) { const b = W.boss; const p = G.randomFree(W, b.x, b.z, 4, rr); R.addAI(b.kind, p[0], p[1], { x: b.x, z: b.z, r: 10 }); for (let i = 0; i < b.guards; i++) { const q = G.randomFree(W, b.x, b.z, 8, rr); R.addAI('guard', q[0], q[1], { x: b.x, z: b.z, r: 12 }); } }
  if (W.raiders && rr() < W.raiders.chance) for (let i = 0; i < W.raiders.n; i++) { const q = G.randomFree(W, W.raiders.x, W.raiders.z, 6, rr); R.addAI('raider', q[0], q[1], { x: W.raiders.x, z: W.raiders.z, r: 10 }); }
  const nb = { sawmill: 3, deadwood: 4, pulp: 2 }[W.map] || 2; const sps = W.spawns.pmc.slice().sort(() => rr() - .5);
  let k = 0; for (const sp of sps) { if (k >= nb) break; if (!farFromPlayers(sp[0], sp[1], 70)) continue; const p = G.randomFree(W, sp[0], sp[1], 3, rr); R.addAI('pmc', p[0], p[1], G.pick(W.zones)); k++; }
}
G.R_addAI = null;
function addAI(R, kind, x, z, zone, eq, id) { const a = G.newAI(R, kind, x, z, zone, eq, id); if (R.net && R.isHost) R.net.aiSpawn(a); return a; }

/* ================= VIEWMODEL ================= */
function buildViewmodel(R) {
  const me = R.me; if (R.vm) R.vmScene.remove(R.vm);
  const vm = new THREE.Group(); R.vm = vm; R.vmScene.add(vm);
  const w = me.weapon;
  if (w) { const gm = G.gunMesh(w, 1); vm.add(gm); R.vmGun = gm; }
  else { R.vmGun = null; const st = new THREE.Mesh(new THREE.CylinderGeometry(.008, .02, .5, 5), new THREE.MeshLambertMaterial({ map: G.textures().bark, color: 0x8a6a3a })); st.position.set(.12, -.12, -.4); st.rotation.x = -1.4; vm.add(st); }
  R.vmBase = w && I[w.id].cls === 'pistol' ? [.11, -.12, -.3] : [.12, -.13, -.25];
  R.vmAds = w ? [0, -(R.vmGun.userData.sightH), I[w.id].cls === 'pistol' ? -.32 : -.2] : R.vmBase;
  updateSightHud(R);
}
function updateSightHud(R) { const w = R.me.weapon; const s = w && w.mods && w.mods.sight ? I[w.mods.sight.id] : null; R.sightZoom = s ? s.zoom : 1; R.dot = s && s.zoom === 1 ? (s.id === 'holo' ? 'holo' : 'dot') : null; }

/* ================= INPUT ================= */
function lockPointer() { const c = renderer && renderer.domElement; if (!c || G.isTouch) return; try { c.requestPointerLock(); } catch (e) { } }
G.isTouch = matchMedia('(pointer:coarse)').matches;
document.addEventListener('keydown', e => {
  const R = G.R; if (!R || !R.running) return; if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Tab') { e.preventDefault(); toggleInv(); return; }
  if (e.code === 'Escape') { if (R.invOpen) { toggleInv(false); return; } return; }
  if (R.invOpen && e.code !== 'KeyR' && e.code !== 'Space') { if (/Digit[4-7]/.test(e.code)) return; }
  KEYS[e.code] = true; if (R.invOpen) return;
  const me = R.me; if (!me.alive) return;
  switch (e.code) {
    case 'KeyC': me.crouch = !me.crouch; break;
    case 'KeyR': reloadPress(R); break;
    case 'KeyB': toggleMode(R); break;
    case 'KeyL': magCheck(R); break;
    case 'KeyT': if (e.altKey) chamberCheck(R); else { me.light = !me.light; G.AU.click(null, 3000, .2); } break;
    case 'KeyF': interact(R); break;
    case 'KeyO': showExtracts(R); break;
    case 'KeyG': throwNade(R); break;
    case 'KeyV': melee(R); break;
    case 'KeyK': me.inspectT = 2.5; break;
    case 'Digit1': switchW(R, 'primary'); break; case 'Digit2': switchW(R, 'secondary'); break; case 'Digit3': switchW(R, 'holster'); break;
    case 'Digit4': case 'Digit5': case 'Digit6': case 'Digit7': quickUse(R, +e.code.slice(5)); break;
  }
});
document.addEventListener('keyup', e => { KEYS[e.code] = false; });
document.addEventListener('mousemove', e => { if (G.R && G.R.running && document.pointerLockElement) { MOUSE.dx += e.movementX; MOUSE.dy += e.movementY; } });
document.addEventListener('mousedown', e => { const R = G.R; if (!R || !R.running || R.invOpen || R.over) return; if (!document.pointerLockElement && !G.isTouch) { if (e.target.closest('#game')) lockPointer(); return; } if (e.button === 0) MOUSE.l = true; if (e.button === 2) MOUSE.r = !MOUSE.r || true; });
document.addEventListener('mouseup', e => { if (e.button === 0) MOUSE.l = false; if (e.button === 2) MOUSE.r = false; });
document.addEventListener('contextmenu', e => { if (G.R && G.R.running && !G.R.invOpen) e.preventDefault(); });
document.addEventListener('wheel', e => { const R = G.R; if (R && R.running && !R.invOpen) { R.me.walkMul = G.clamp((R.me.walkMul || 1) - Math.sign(e.deltaY) * .1, .3, 1); toastHud('Walk speed ' + Math.round(R.me.walkMul * 100) + '%'); } }, { passive: true });

/* ================= MAIN LOOP ================= */
function loop(now) {
  const R = G.R; if (!R || !R.running) return;
  requestAnimationFrame(loop);
  let dt = Math.min(.05, (now - R.last) / 1000); R.last = now; R.t += dt; R.fpsA = (R.fpsA || 60) * .95 + (1 / Math.max(dt, .001)) * .05;
  if (!R.over) { R.timeLeft -= dt; if (R.timeLeft <= 0 && R.me.alive) finish(R, 'mia'); }
  if (!R.over && R.me.alive) playerTick(R, dt);
  if (R.isHost) {
    for (const a of R.actors) if (a.ai) G.aiTick(R, a, dt);
    R.waveT -= dt; if (R.waveT <= 0) { R.waveT = 200 + Math.random() * 160; const alive = R.actors.filter(a => a.ai && a.alive).length; if (alive < 24) { const zn = G.pick(R.W.zones); const ok = R.actors.filter(a => a.fac === 'player').every(p => Math.hypot(p.pos.x - zn.x, p.pos.z - zn.z) > 50); if (ok) for (let i = 0; i < 2; i++) { const p = G.randomFree(R.W, zn.x, zn.z, zn.r); R.addAI('sapling', p[0], p[1], zn); } } }
  }
  for (const [, ra] of R.remotes) remoteTick(R, ra, dt);
  projTick(R, dt); nadeTick(R, dt); fxTick(R, dt); doorTick(R, dt);
  for (const a of R.actors) if (a.model) G.poseModel(a, dt, R.t);
  if (R.net) R.net.tick(dt);
  G.AU.ambTick(dt);
  render(R, dt);
  hudTick(R, dt);
}
G.R_loopAlive = () => G.R && G.R.running;

/* ================= PLAYER ================= */
function weightOf(eq) { let w = 0; ['primary', 'secondary', 'holster', 'helmet', 'armor', 'rig', 'backpack'].forEach(s => { if (eq[s]) w += G.weight(eq[s]); }); eq.pockets.items.forEach(e => w += G.weight(e.it)); return w; }
function playerTick(R, dt) {
  const me = R.me, W = R.W, st = G.S.settings;
  // look
  const sens = .0022 * st.sens * (me.ads > .5 ? (R.sightZoom > 1 ? .3 : .7) : 1);
  if (!R.invOpen) { me.yaw -= MOUSE.dx * sens; me.pitch -= MOUSE.dy * sens * (st.invertY ? -1 : 1); }
  MOUSE.dx = MOUSE.dy = 0;
  me.pitch = G.clamp(me.pitch, -1.45, 1.45);
  // stance
  const ceil = G.ceilingAbove(W, me.pos, .3, me.pos.y);
  if (!me.crouch && ceil - me.pos.y < 1.75) me.crouch = true;
  me.crouchK += ((me.crouch ? 1 : 0) - me.crouchK) * Math.min(1, dt * 8);
  const leanT = R.invOpen ? 0 : (KEYS.KeyQ ? -1 : 0) + (KEYS.KeyE ? 1 : 0); me.lean += (leanT - me.lean) * Math.min(1, dt * 7); me.leanO = me.lean * .32;
  // health-driven modifiers
  const H = me.health.p; const legBad = (H.lleg.hp <= 0 || H.rleg.hp <= 0 || H.lleg.fr || H.rleg.fr) && me.painkill <= 0;
  const armBad = (H.larm.hp <= 0 || H.rarm.hp <= 0 || H.larm.fr || H.rarm.fr);
  const wt = weightOf(R.eq); const strK = 1 + G.skillLvl('strength') * .01; const over = Math.max(0, wt - 32 * strK), crit = wt > 62 * strK;
  // movement
  let mx = 0, mz = 0; if (!R.invOpen) { if (KEYS.KeyW) mz -= 1; if (KEYS.KeyS) mz += 1; if (KEYS.KeyA) mx -= 1; if (KEYS.KeyD) mx += 1; }
  if (TOUCH.on) { mx += TOUCH.mx; mz += TOUCH.mz; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const wantSprint = (KEYS.ShiftLeft || TOUCH.sprint) && mz < 0 && me.stam > 0 && !legBad && !crit && !me.busyNoSprint && me.ads < .3;
  if (wantSprint && me.crouch) me.crouch = false;
  const sprint = wantSprint && ml > .1; me.sprinting = sprint;
  let spd = (sprint ? 5.4 : 3.1 * (me.walkMul || 1)) * (me.crouchK > .5 ? .5 : 1) * (me.ads > .5 ? .65 : 1) * (legBad ? .6 : 1) * (1 - Math.min(.45, over * .012)) * (crit ? .6 : 1);
  if (me.busy && me.busy.slow) spd *= .55;
  const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
  const wx = (fx * -mz + rx * mx) * spd, wz = (fz * -mz + rz * mx) * spd;
  const onGround = me.pos.y <= me.ground + .01;
  const acc = (onGround ? 9 : 1.5) / (1 + wt / 45);
  me.vel.x += (wx - me.vel.x) * Math.min(1, dt * acc); me.vel.z += (wz - me.vel.z) * Math.min(1, dt * acc);
  me.pos.x += me.vel.x * dt; me.pos.z += me.vel.z * dt;
  if (KEYS.Space && onGround && me.stam > 10 && !R.invOpen && !crit) { me.vy = 4.1 * (legBad ? .6 : 1); me.stam -= 14; KEYS.Space = false; G.skillXP('strength', .4 + wt / 60); if (me.crouch) me.crouch = false; }
  me.vy -= 9.8 * dt; me.pos.y += me.vy * dt;
  me.ground = G.collide(W, me.pos, .32, me.pos.y, me.crouchK > .5 ? 1.1 : 1.72);
  if (me.pos.y <= me.ground) { if (me.vy < -7.5) { const d = (-me.vy - 7) * 18; G.damagePart(me, 'lleg', d); G.damagePart(me, 'rleg', d); if (Math.random() < .5) H.lleg.fr = 1; dmgFlash(R, .6); G.AU.hit(null, 'flesh'); } me.pos.y = me.ground; me.vy = 0; }
  if (me.pos.y + 1.7 > ceil && me.vy > 0) me.vy = 0;
  const hs = Math.hypot(me.vel.x, me.vel.z); me.moving = hs;
  // stamina
  const endK = 1 - G.skillLvl('endurance') * .008;
  if (sprint) { me.stam -= dt * 11 * endK * (1 + over * .02); G.skillXP('endurance', dt * .6); if (me.stam <= 0) { me.stam = 0; me.exhaust = 3; G.AU.breath(); } }
  else { me.exhaust = Math.max(0, (me.exhaust || 0) - dt); if (!me.exhaust) me.stam = Math.min(100, me.stam + dt * (hs > .5 ? 4 : 8) * (me.stim > 0 ? 2 : 1) * (1 + G.skillLvl('endurance') * .01)); }
  // footsteps & noise
  if (onGround && hs > .4) { me.stepT -= hs * dt; if (me.stepT <= 0) { me.stepT = sprint ? 1.9 : 1.5; const covert = 1 - G.skillLvl('covert') * .01; const loud = (sprint ? 1 : me.crouchK > .5 ? .25 : .55) * (hs / 3) * covert; const surf = G.surfaceAt(W, me.pos.x, me.pos.z); G.AU.step({ x: me.pos.x, y: me.pos.y, z: me.pos.z }, Math.min(.5, loud * .6), surf); G.noise(R, me.pos, (sprint ? 32 : me.crouchK > .5 ? 6 : 16) * covert, me); if (me.crouchK > .5) G.skillXP('covert', .2); } }
  // survival drain
  const met = 1 - G.skillLvl('metabolism') * .008;
  me.hyd = Math.max(0, me.hyd - dt * .028 * met * (sprint ? 1.6 : 1)); me.en = Math.max(0, me.en - dt * .02 * met * (sprint ? 1.4 : 1));
  if (me.hyd <= 0 || me.en <= 0) { me.starveT = (me.starveT || 0) + dt; if (me.starveT > 4) { me.starveT = 0; const r = G.damagePart(me, 'stomach', me.hyd <= 0 ? 3 : 1.5, { bleed: false }); if (r.kill) die(R, null, me.hyd <= 0 ? 'dehydration' : 'exhaustion'); } }
  // bleeding
  let bleed = 0; G.PARTS.forEach(k => { const p = H[k]; if (p.hb) bleed += 1.9; else if (p.bl) bleed += .65; });
  if (bleed) { me.bleedAcc = (me.bleedAcc || 0) + bleed * dt; if (me.bleedAcc >= 1) { const b = me.bleedAcc; me.bleedAcc = 0; const parts = G.PARTS.filter(k => H[k].bl || H[k].hb); const r = G.damagePart(me, parts[0], b, { bleed: false }); if (r.kill || !me.alive) die(R, null, 'bleeding'); } if (Math.random() < dt * .7) bloodDrop(R, me.pos); }
  // effects timers
  me.painkill = Math.max(0, me.painkill - dt); me.stim = Math.max(0, me.stim - dt); me.pain = Math.max(0, me.pain - dt * 4);
  if (me.stim > 0) G.PARTS.forEach(k => { if (H[k].hp > 0) H[k].hp = Math.min(H[k].max, H[k].hp + dt * .5); });
  me.armBad = armBad;
  // busy actions
  if (me.busy) { me.busy.t -= dt; if (me.busy.t <= 0) { const b = me.busy; me.busy = null; b.done && b.done(); } }
  me.cycleT = Math.max(0, me.cycleT - dt);
  if (me.cycleT <= 0 && me.needCycle) { me.needCycle = false; const w = me.weapon; if (w && !w.ch && w.rounds && w.rounds.length) w.ch = w.rounds.pop(); else if (w && !w.ch && w.mag && w.mag.rounds.length) w.ch = w.mag.rounds.pop(); }
  // ADS
  const wantAds = (MOUSE.r || TOUCH.ads) && !sprint && !R.invOpen && me.weapon && !me.busy;
  const ergo = me.weapon ? I[me.weapon.id].ergo : 50; me.ads += ((wantAds ? 1 : 0) - me.ads) * Math.min(1, dt * (3 + ergo / 12) * (armBad ? .6 : 1));
  // firing
  if (!R.invOpen && (MOUSE.l || TOUCH.fire)) tryFire(R); else me.trig = false;
  // interaction prompt + extracts + visits
  me.interact = findInteract(R); extractTick(R, dt); visitTick(R);
  // light
  R.flashlight.intensity = me.light ? 2.2 : 0; me.lightOn = me.light;
  // skill tick: vitality when bleeding
  if (bleed) G.skillXP('vitality', dt * .2);
}
G.noise = (R, pos, rad, src) => {
  if (!R.isHost) { if (R.net && src === R.me) R.net.noise(pos, rad); }
  for (const a of R.actors) { if (!a.ai || !a.alive || a.ai.st === 'combat') continue; if (src && !G.hostile(a, src)) continue; const d = Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z); if (d < rad) { a.ai.st = 'alert'; a.ai.heard = [pos.x + (Math.random() - .5) * d * .2, pos.z + (Math.random() - .5) * d * .2]; a.ai.path = null; } }
};

/* ---------- weapons ---------- */
function curW(R) { return R.me.weapon; }
function tryFire(R) {
  const me = R.me, w = curW(R);
  if (!w) { if (!me.trig) { me.trig = true; melee(R); } return; }
  if (me.busy && !me.busy.interruptible) return;
  if (me.busy && me.busy.interruptible) me.busy = null;
  if (me.sprinting) return; if (me.switchT > 0) return;
  const d = I[w.id]; const auto = w.mode === 'auto';
  if (me.trig && !auto) return;
  const iv = 60 / d.rpm; if (R.t - me.lastShot < iv) return;
  if (me.needCycle || me.cycleT > 0) { me.trig = true; return; }
  if (!w.ch) { if (!me.trig) { G.AU.click(null, 1800, .35); toastHud(''); } me.trig = true; return; }
  me.trig = true; me.lastShot = R.t;
  // muzzle origin & direction (camera)
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(R.cam.quaternion);
  const spreadDeg = d.disp * (me.ads > .6 ? 1 : 4.5 + (me.moving > 1 ? 2 : 0)) * (me.armBad ? 1.8 : 1) * ((me.pain > 0 && me.painkill <= 0) ? 1.4 : 1);
  const e = spreadDeg * Math.PI / 180;
  const o = R.cam.position.clone().add(dir.clone().multiplyScalar(.3));
  const ammo = w.ch;
  G.fireRound(R, me, w, { x: o.x, y: o.y, z: o.z }, [dir.x, dir.y, dir.z], true, e);
  if (R.net) R.net.shot({ o: [o.x, o.y, o.z], d: [dir.x, dir.y, dir.z], a: ammo, s: w.mods && w.mods.muzzle ? 1 : 0, e });
  // recoil
  const rk = (1 - G.skillLvl('recoil') * .006) * (me.crouchK > .5 ? .8 : 1) * (me.armBad ? 1.6 : 1) * (w.mods && w.mods.muzzle ? .9 : 1);
  const rv = d.rv * Math.PI / 180 * rk; const rh = d.rh * Math.PI / 180 * rk;
  me.recoil.p += rv * (me.ads > .6 ? 1 : 1.25); me.recoil.y += (Math.random() - .5) * 2 * rh; me.recoil.vk = Math.min(.08, me.recoil.vk + .02 + rv * .4);
  G.skillXP('recoil', .15);
  if (d.bolt || d.pump) { me.needCycle = true; me.cycleT = d.bolt ? 1.1 : .55; setTimeout(() => G.AU.bolt(null), d.bolt ? 300 : 150); }
}
G.fireRound = (R, shooter, w, o, dir, auth, extraE = 0) => {
  const d = I[w.id]; const ammo = w.ch; if (!ammo) return; w.ch = null;
  if (!d.bolt && !d.pump) { if (w.mag && w.mag.rounds.length) w.ch = w.mag.rounds.pop(); else if (w.rounds && w.rounds.length) w.ch = w.rounds.pop(); }
  const am = A[ammo]; const supp = !!(w.mods && w.mods.muzzle);
  const n = am.pellets || 1; const vel = am.spd * (d.vel || 1);
  for (let i = 0; i < n; i++) {
    let dx = dir[0], dy = dir[1], dz = dir[2];
    const e = extraE + (n > 1 ? .045 : 0);
    if (e) { dx += (Math.random() - .5) * 2 * e; dy += (Math.random() - .5) * 2 * e; dz += (Math.random() - .5) * 2 * e; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l; }
    R.proj.push({ p: [o.x, o.y, o.z], v: [dx * vel, dy * vel, dz * vel], ammo, owner: shooter, auth, life: 2.2, trav: 0 });
  }
  if (R.net && R.isHost && shooter.ai) R.net.shot({ o: [o.x, o.y, o.z], d: dir, a: ammo, s: supp ? 1 : 0, e: extraE }, shooter.id);
  G.AU.shot(shooter.isMe ? null : { x: o.x, y: o.y, z: o.z }, d.cal, supp);
  if (!shooter.isMe || true) muzzleFlash(R, o, supp, shooter.isMe);
  if (R.isHost || shooter.isMe) G.noise(R, o, supp ? 45 : 170, shooter);
};
function reloadPress(R) {
  const me = R.me, w = curW(R); if (!w || me.busy) return; const d = I[w.id];
  const now = R.t; const dbl = now - (me.lastR || 0) < .35; me.lastR = now;
  const grids = [R.eq.rig && R.eq.rig.grid, R.eq.pockets].filter(Boolean);
  if (d.internal) {
    // load one round at a time from rig/pockets/backpack ammo of the right calibre
    if (w.rounds.length >= d.internal) { if (!w.ch && w.rounds.length) { w.ch = w.rounds.pop(); G.AU.bolt(null); } return; }
    const loadOne = () => {
      const all = grids.concat(R.eq.backpack ? [R.eq.backpack.grid] : []); let st = null, sg = null;
      for (const g of all) { const e = g.items.find(e => I[e.it.id].type === 'ammo' && I[e.it.id].cal === d.cal); if (e) { st = e.it; sg = g; break; } }
      if (!st) { toastHud('No ammo'); return; }
      me.busy = { t: .55 * (me.armBad ? 1.5 : 1), interruptible: true, slow: true, done: () => { if (!st.n) return; w.rounds.push(st.id); st.n--; if (st.n <= 0) G.gridRemove(sg, st); G.AU.reload(null, 1); if (!w.ch && !me.needCycle) { w.ch = w.rounds.pop(); } if (w.rounds.length < d.internal && (KEYS.KeyR || me.contLoad)) loadOne(); else me.contLoad = false; } };
    };
    me.contLoad = true; loadOne(); return;
  }
  // magazine weapons: find fullest compatible mag in rig/pockets
  let best = null, bg = null; for (const g of grids) for (const e of g.items) { const md = I[e.it.id]; if (md.type === 'mag' && md.mt === d.mt && e.it.rounds.length && (!best || e.it.rounds.length > best.rounds.length)) { best = e.it; bg = g; } }
  if (!best) { if (!w.ch && w.mag && w.mag.rounds.length) { me.busy = { t: .6, done: () => { w.ch = w.mag.rounds.pop(); G.AU.bolt(null); } }; return; } toastHud('No magazines in rig or pockets'); return; }
  const t = (dbl ? 1.4 : 2.4) * (me.armBad ? 1.5 : 1) * (1 - I[w.id].ergo / 300) + (w.ch ? 0 : .5);
  G.AU.reload(null, 0);
  me.busy = { t, slow: true, done: () => {
    if (!G.gridRemove(bg, best)) return; const old = w.mag; w.mag = best;
    if (old) { if (dbl) dropGround(R, old); else { const g2 = G.gridFind(bg, old) ? bg : null; if (g2) G.gridAdd(g2, old); else if (!G.placeAnywhere || !placeOnMe(R, old)) dropGround(R, old); } }
    if (!w.ch && w.mag.rounds.length) w.ch = w.mag.rounds.pop();
    G.AU.reload(null, 1); buildViewmodel(R);
  } };
}
function placeOnMe(R, it) { for (const g of [R.eq.rig && R.eq.rig.grid, R.eq.pockets, R.eq.backpack && R.eq.backpack.grid].filter(Boolean)) if (G.canHold(g, it) && G.gridAdd(g, it)) return true; return false; }
function toggleMode(R) { const w = curW(R); if (!w) return; const m = I[w.id].modes; const i = m.indexOf(w.mode); w.mode = m[(i + 1) % m.length]; G.AU.click(null, 1500, .3); toastHud(w.mode === 'auto' ? 'Full auto' : 'Single fire'); }
function magCheck(R) {
  const me = R.me, w = curW(R); if (!w || me.busy) return; const d = I[w.id];
  me.busy = { t: 1.2, done: () => {
    const n = w.mag ? w.mag.rounds.length : w.rounds ? w.rounds.length : 0; const cap = w.mag ? I[w.mag.id].cap : d.internal || 1;
    if (!w.mag && !d.internal) return toastHud('No magazine');
    const f = n / cap; const lvl = G.skillLvl('recoil');
    const txt = lvl > 20 || cap <= 10 ? n + ' rounds' : n === 0 ? 'Empty' : f > .9 ? 'Full' : f > .65 ? 'Almost full' : f > .4 ? 'About half' : f > .15 ? 'Less than half' : 'Almost empty';
    toastHud(txt, 2.5);
  } };
}
function chamberCheck(R) { const me = R.me, w = curW(R); if (!w || me.busy) return; me.busy = { t: .9, done: () => toastHud(w.ch ? 'Round chambered: ' + A[w.ch].name : 'Chamber empty', 2.5) }; }
function switchW(R, slot) {
  const me = R.me; if (me.busy) return; const it = R.eq[slot]; if (!it || me.wslot === slot) return;
  me.wslot = slot; me.weapon = it; me.switchT = .6 + (100 - I[it.id].ergo) / 160; buildViewmodel(R); G.AU.reload(null, 0);
  if (R.net) R.net.equip();
}
function quickUse(R, k) {
  const uid = R.binds[k]; if (!uid) return toastHud('Nothing bound to ' + k);
  const f = findOnMe(R, uid); if (!f) return toastHud('Item not found');
  if (I[f.it.id].type === 'grenade') return throwNade(R, f);
  G.raidUse(f.it, f.src);
}
function findOnMe(R, uid) { for (const g of G.eqGrids(R.eq)) { const e = g.items.find(e => e.it.u === uid); if (e) return { it: e.it, src: { k: 'grid', g, it: e.it, x: e.x, y: e.y, r: e.r } }; } return null; }

/* ---------- medical in raid ---------- */
G.raidUse = (it, src) => {
  const R = G.R; const me = R.me; const d = I[it.id]; const H = me.health.p;
  if (me.busy) return toastHud('Busy');
  const pick = (f) => { const ks = ['thorax', 'head', 'stomach', 'larm', 'rarm', 'lleg', 'rleg'].filter(f); return ks[0]; };
  let part = null;
  if (d.type === 'med') {
    if (d.surgery) { part = pick(k => H[k].hp <= 0 && k !== 'head' && k !== 'thorax'); if (!part) return toastHud('No destroyed limbs'); }
    else if (d.fixes) { part = pick(k => H[k].fr); if (!part) return toastHud('No fractures'); }
    else if (d.stops && !d.heal) { part = pick(k => d.stops.includes('heavy') ? H[k].hb : H[k].bl); if (!part) return toastHud(d.stops.includes('heavy') ? 'No heavy bleeding' : 'No light bleeding'); }
    else if (d.heal) { part = pick(k => H[k].hb || H[k].bl) || pick(k => H[k].hp > 0 && H[k].hp < H[k].max); if (!part) return toastHud('Nothing to heal'); }
  }
  if (R.invOpen) toggleInv(false);
  const t = d.time * (me.armBad ? 1.3 : 1);
  me.busy = { t, slow: true, med: d.short, done: () => {
    if (!stillHave(R, it)) return;
    const rm = () => { const s2 = srcOf(R, it); if (s2) G.removeFrom(s2); };
    const consume = (n = 1) => { if (it.res != null && d.res > 1) { it.res -= n; if (it.res <= 0) rm(); } else rm(); };
    if (d.type === 'food') { me.hyd = G.clamp(me.hyd + d.hyd, 0, 100); me.en = G.clamp(me.en + d.en, 0, 100); if (d.pain) me.painkill = Math.max(me.painkill, d.pain); G.skillXP('metabolism', 2); consume(); }
    else if (d.surgery) { H[part].hp = 1; H[part].max = Math.max(10, Math.round(H[part].max * .8)); H[part].fr = 0; consume(); }
    else if (d.fixes) { H[part].fr = 0; consume(); }
    else if (d.pain && !d.heal) { me.painkill = Math.max(me.painkill, d.pain); consume(); }
    else if (d.stim) { me.stim = 120; me.stam = 100; me.painkill = Math.max(me.painkill, 60); consume(); }
    else if (d.stops && !d.heal) { if (d.stops.includes('heavy')) H[part].hb = 0; else H[part].bl = 0; consume(); }
    else if (d.heal) {
      // stop bleeds first (if the kit can), then heal
      for (const k of G.PARTS) { if (H[k].hb && d.stops && d.stops.includes('heavy') && it.res >= d.bleedCost.heavy) { H[k].hb = 0; it.res -= d.bleedCost.heavy; } if (H[k].bl && d.stops && it.res >= d.bleedCost.light) { H[k].bl = 0; it.res -= d.bleedCost.light; } }
      let pool = Math.min(it.res, d.id === 'aisap' ? 50 : 150); const order = ['head', 'thorax', 'stomach', 'larm', 'rarm', 'lleg', 'rleg'];
      for (const k of order) { if (pool <= 0) break; const p = H[k]; if (p.hp <= 0 || p.hp >= p.max) continue; const t2 = Math.min(pool, p.max - p.hp); p.hp += t2; pool -= t2; it.res -= t2; R.xp.heal += t2 * .4; }
      if (it.res <= .5) rm();
    }
    toastHud('Used ' + d.short);
  } };
};
function stillHave(R, it) { return !!srcOf(R, it); }
function srcOf(R, it) { for (const g of G.eqGrids(R.eq)) { const e = g.items.find(e => e.it === it); if (e) return { k: 'grid', g, it, x: e.x, y: e.y, r: e.r }; } return null; }

/* ---------- projectiles ---------- */
function projTick(R, dt) {
  const W = R.W; const me = R.me;
  for (let i = R.proj.length - 1; i >= 0; i--) {
    const P = R.proj[i]; P.life -= dt; if (P.life <= 0) { R.proj.splice(i, 1); continue; }
    const o = P.p; const nv = [P.v[0], P.v[1] - 9.81 * dt, P.v[2]];
    const step = [nv[0] * dt, nv[1] * dt, nv[2] * dt]; const len = Math.hypot(...step); const d = [step[0] / len, step[1] / len, step[2] / len];
    const wh = G.rayWorld(W, o, d, len, 'solid'); let tW = wh ? wh.t : len + 1;
    let hitA = null, tA = tW;
    for (const a of R.actors) { if (a === P.owner || !a.alive) continue; const hh = G.segHitActor(a, o, d, Math.min(len, tA)); if (hh && hh.t < tA) { tA = hh.t; hitA = { a, part: hh.part }; } }
    // supersonic crack near the player
    if (P.owner !== me && me.alive && !P.cracked) { const cx = me.pos.x - o[0], cz = me.pos.z - o[2]; const tc = cx * d[0] + cz * d[2]; if (tc > 0 && tc < len) { const px = o[0] + d[0] * tc - me.pos.x, pz = o[2] + d[2] * tc - me.pos.z; if (px * px + pz * pz < 9) { P.cracked = true; G.AU.crack({ x: me.pos.x + px, y: me.pos.y + 1.5, z: me.pos.z + pz }); R.suppress = Math.min(1, (R.suppress || 0) + .35); } } }
    if (hitA) {
      const hp = [o[0] + d[0] * tA, o[1] + d[1] * tA, o[2] + d[2] * tA];
      bloodPuff(R, hp); if (P.auth) G.hitActor(R, hitA.a, hitA.part, P.ammo, P.owner, P.penMul);
      R.proj.splice(i, 1); continue;
    }
    if (wh) { const hp = [o[0] + d[0] * tW, o[1] + d[1] * tW, o[2] + d[2] * tW]; impact(R, hp, wh.b, d); R.proj.splice(i, 1); continue; }
    P.p = [o[0] + step[0], o[1] + step[1], o[2] + step[2]]; P.v = nv; P.trav += len;
  }
}
G.hitActor = (R, a, part, ammo, owner, penMul) => {
  if (a.isMe) { localHit(R, part, ammo, owner); return; }
  if (a.remote) { R.net && R.net.hitP(a.id, part, ammo, owner); return; }
  if (!R.isHost) { R.net && R.net.hitAI(a.id, part, ammo); G.AU.hit(a.pos, 'flesh'); return; }
  aiHit(R, a, part, ammo, owner);
};
function aiHit(R, a, part, ammo, owner) {
  if (!a.alive) return;
  const res = G.applyBullet(a, part, ammo, { src: owner });
  G.AU.hit({ x: a.pos.x, y: a.pos.y + 1.2, z: a.pos.z }, part === 'head' ? 'head' : res.armor && !res.pen ? 'armor' : 'flesh');
  if (a.ai && owner) { if (a.fac === 'sapling' && owner.fac === 'player' && owner.scav) { (a.ai.angry = a.angry = a.angry || new Set()).add(owner.id); R.actors.forEach(f => { if (f.fac === 'sapling' && Math.hypot(f.pos.x - a.pos.x, f.pos.z - a.pos.z) < 30) (f.angry = f.angry || new Set()).add(owner.id); }); } if (a.ai.st !== 'combat') { a.ai.st = 'alert'; a.ai.heard = [owner.pos.x, owner.pos.z]; a.ai.path = null; a.yaw = Math.atan2(-(owner.pos.x - a.pos.x), -(owner.pos.z - a.pos.z)); } a.ai.errK = Math.min(1, a.ai.errK + .3); }
  if (!a.alive) R.onDeath(a, owner, part);
}
G.aiHitFromNet = (R, id, part, ammo, ownerId) => { const a = R.actors.find(x => x.id === id); if (!a) return; const owner = R.actors.find(x => x.id === ownerId) || null; aiHit(R, a, part, ammo, owner); };
function localHit(R, part, ammo, owner) {
  const me = R.me; if (!me.alive || R.over) return;
  const res = G.applyBullet(me, part, ammo, { src: owner });
  G.AU.hit(null, part === 'head' ? 'head' : res.armor && !res.pen ? 'armor' : 'flesh');
  dmgFlash(R, Math.min(1, res.dmg / 40)); R.shake = Math.min(1, (R.shake || 0) + res.dmg / 50);
  if (part === 'head') G.AU.tinnitus(res.pen ? 4 : 2);
  G.skillXP('vitality', res.dmg * .05);
  if (owner) { me.lastAttacker = owner; }
  if (!me.alive) die(R, owner, part);
}
G.localHitFromNet = (R, part, ammo, ownerId) => { const owner = R.actors.find(x => x.id === ownerId) || null; localHit(R, part, ammo, owner); };

/* ---------- death / bodies ---------- */
function onDeath(R, a, killer, part) {
  if (a.dead) return; a.dead = true; a.alive = false; a.fallDir = Math.random() < .5 ? 1 : -1;
  if (a.model) { a.model.root.traverse(o => o.castShadow = false); }
  // body loot
  const eq = a.eq; eq.secure = null;
  const body = { id: 'B' + a.id, kind: 'body', name: a.name, pos: a.pos.clone(), eq, actor: a };
  R.loots.push(body);
  if (R.net && R.isHost) R.net.aiDie(a, killer, part);
  creditKill(R, a, killer && killer.id, part);
}
function creditKill(R, a, killerId, part) {
  if (!killerId || killerId !== R.me.id) return;
  const map = { sapling: 'sapling', pmc: 'pmc', raider: 'raider', guard: 'guard', gnarl: 'gnarl', chipper: 'chipper', player: 'player' };
  const who = map[a.fac] || a.fac; const dist = Math.hypot(a.pos.x - R.me.pos.x, a.pos.z - R.me.pos.z);
  const xp = { sapling: 80, pmc: 350, raider: 260, guard: 300, gnarl: 1500, chipper: 1500, player: 500 }[who] || 80;
  const hx = part === 'head' ? 1.4 : 1; R.xp.kills += Math.round(xp * hx * (dist > 80 ? 1.3 : 1));
  R.kills.push({ name: a.name, who, part, dist: Math.round(dist), wpn: R.me.weapon ? I[R.me.weapon.id].short : 'STICK' });
  if (!R.me.scav || who !== 'sapling') { const k = G.S.stats.kills; const key = who === 'player' ? 'player' : (who === 'gnarl' || who === 'chipper') ? 'boss' : who === 'guard' ? 'raider' : who; k[key] = (k[key] || 0) + 1; }
  if (!R.me.scav) G.taskEvent({ type: 'kill', who, map: R.W.map, night: R.night });
  else if (who !== 'sapling') G.taskEvent({ type: 'kill', who, map: R.W.map, night: R.night });
  if (part === 'head') toastHud('');
}
G.creditKillFromNet = (R, aId, killerId, part) => { const a = R.actors.find(x => x.id === aId); if (!a) return; if (!a.dead) { a.dead = true; a.alive = false; a.fallDir = 1; const eq = a.eq; eq.secure = null; R.loots.push({ id: 'B' + a.id, kind: 'body', name: a.name, pos: a.pos.clone(), eq, actor: a }); } creditKill(R, a, killerId, part); };
function die(R, killer, cause) {
  const me = R.me; if (R.over) return; me.alive = false; R.deathCause = { killer: killer ? killer.name : null, kfac: killer ? killer.fac : null, cause };
  if (R.net) R.net.pdead(me, R.eq);
  // leave a body for others
  R.loots.push({ id: 'B' + me.id, kind: 'body', name: me.name, pos: me.pos.clone(), eq: R.eq });
  R.deathT = 0; setTimeout(() => finish(R, 'kia'), 2600);
}

/* ---------- grenades ---------- */
function throwNade(R, found) {
  const me = R.me; if (me.busy) return;
  const f = found || (() => { for (const g of [R.eq.rig && R.eq.rig.grid, R.eq.pockets].filter(Boolean)) { const e = g.items.find(e => I[e.it.id].type === 'grenade'); if (e) return { it: e.it, src: { k: 'grid', g, it: e.it } }; } return null; })();
  if (!f) return toastHud('No grenades in rig or pockets');
  G.AU.pin(null);
  me.busy = { t: .7, done: () => {
    if (!G.removeFrom(f.src)) return;
    const dir = new THREE.Vector3(0, .18, -1).applyQuaternion(R.cam.quaternion).normalize(); const sp = 14 * (1 + G.skillLvl('strength') * .005);
    const n = spawnNade(R, R.cam.position.clone().add(dir.clone().multiplyScalar(.4)), dir.multiplyScalar(sp), 3.6, me, true);
    if (R.net) R.net.nade(n);
  } };
}
function spawnNade(R, p, v, fuse, owner, auth) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(.06, 6, 5), new THREE.MeshLambertMaterial({ color: 0x5a4020 })); m.position.copy(p); R.scene.add(m);
  const n = { p: p.clone(), v: v.clone(), fuse, owner, auth, m }; R.nades.push(n); return n;
}
G.spawnNadeNet = (R, p, v, fuse, ownerId) => spawnNade(R, new THREE.Vector3(...p), new THREE.Vector3(...v), fuse, R.actors.find(a => a.id === ownerId), false);
function nadeTick(R, dt) {
  for (let i = R.nades.length - 1; i >= 0; i--) {
    const n = R.nades[i]; n.fuse -= dt; n.v.y -= 9.8 * dt; const st = n.v.clone().multiplyScalar(dt); const L = st.length();
    if (L > 0) { const d = st.clone().normalize(); const h = G.rayWorld(R.W, [n.p.x, n.p.y, n.p.z], [d.x, d.y, d.z], L + .06, 'solid');
      if (h) { const hp = n.p.clone().add(d.clone().multiplyScalar(Math.max(0, h.t - .05))); n.p.copy(hp); const nrm = h.b ? boxNormal(h.b, [hp.x, hp.y, hp.z]) : [0, 1, 0]; const vn = n.v.x * nrm[0] + n.v.y * nrm[1] + n.v.z * nrm[2]; n.v.x -= 1.6 * vn * nrm[0]; n.v.y -= 1.6 * vn * nrm[1]; n.v.z -= 1.6 * vn * nrm[2]; n.v.multiplyScalar(.45); if (Math.abs(vn) > 2) G.AU.click(n.p, 900, .2); }
      else n.p.add(st); }
    if (n.p.y < .06) { n.p.y = .06; n.v.y = Math.abs(n.v.y) * .3; n.v.x *= .7; n.v.z *= .7; }
    n.m.position.copy(n.p);
    if (n.fuse <= 0) { R.scene.remove(n.m); R.nades.splice(i, 1); explode(R, n); }
  }
}
function explode(R, n) {
  G.AU.boom(n.p); R.muzzleLight.position.copy(n.p); R.muzzleLight.intensity = 8; R.muzzleLight.distance = 25; R.mlT = .15;
  for (let i = 0; i < 14; i++) smoke(R, [n.p.x + (Math.random() - .5), n.p.y + Math.random(), n.p.z + (Math.random() - .5)], 0x6a6050, 1.6);
  G.noise(R, n.p, 120, n.owner);
  const dm = Math.hypot(R.me.pos.x - n.p.x, R.me.pos.z - n.p.z); if (dm < 25) R.shake = Math.min(1.5, (R.shake || 0) + (25 - dm) / 15);
  if (!n.auth) return;
  for (let i = 0; i < 46; i++) { const th = Math.random() * 6.283, ph = Math.acos(Math.random() * 1.6 - .6); const d = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)]; R.proj.push({ p: [n.p.x, n.p.y + .15, n.p.z], v: d.map(x => x * 520), ammo: 'frag', owner: { id: n.owner ? n.owner.id : 'x', fac: 'nade', pos: n.p }, auth: true, life: .12 }); }
  for (const a of R.actors) { if (!a.alive) continue; const d = a.pos.distanceTo(n.p); if (d < 4 && G.los(R.W, [n.p.x, n.p.y + .3, n.p.z], [a.pos.x, a.pos.y + 1, a.pos.z])) { const dmg = 70 * (1 - d / 4); if (a.isMe) { G.damagePart(a, 'stomach', dmg * .5); G.damagePart(a, 'lleg', dmg * .3); G.damagePart(a, 'rleg', dmg * .3); dmgFlash(R, 1); if (!a.alive) die(R, n.owner, 'grenade'); } else if (a.remote) { R.net && R.net.hitP(a.id, 'stomach', 'frag', n.owner); } else if (R.isHost) { G.damagePart(a, 'stomach', dmg * .5); G.damagePart(a, 'lleg', dmg * .3); if (!a.alive) R.onDeath(a, n.owner, 'stomach'); } } }
}

/* ---------- melee ---------- */
function melee(R) {
  const me = R.me; if (me.busy || me.meleeT > R.t) return; me.meleeT = R.t + .8; me.swing = .35;
  const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(R.cam.quaternion); const o = R.cam.position;
  let best = null, bt = 1.7; for (const a of R.actors) { if (a === me || !a.alive) continue; const hh = G.segHitActor(a, [o.x, o.y, o.z], [dir.x, dir.y, dir.z], bt); if (hh && hh.t < bt) { bt = hh.t; best = { a, part: hh.part }; } }
  G.AU.click(null, 600, .3);
  if (best) G.hitActor(R, best.a, best.part, 'stick', me);
}

/* ---------- FX ---------- */
const spriteMats = {};
function sprite(R, pos, col, size, life, vy = 0, op = .9) {
  let m = spriteMats[col]; if (!m) m = spriteMats[col] = new THREE.SpriteMaterial({ color: col, transparent: true, opacity: op, depthWrite: false });
  const s = new THREE.Sprite(m.clone()); s.position.set(pos[0], pos[1], pos[2]); s.scale.setScalar(size); R.scene.add(s); R.fx.push({ s, life, max: life, vy, grow: size * .8 });
}
function smoke(R, p, col = 0x8a8a7a, sz = .5) { sprite(R, p, col, sz, 1.2 + Math.random(), .4, .5); }
function bloodPuff(R, p) { sprite(R, p, 0x5a7a2a, .25, .35, 0, .9); sprite(R, p, 0x3a2a14, .15, .5, -.5); }
function bloodDrop(R, pos) { decal(R, [pos.x + (Math.random() - .5) * .4, .03, pos.z + (Math.random() - .5) * .4], [0, 1, 0], 0x4a6a20, .25); }
function boxNormal(b, p) { const ds = [[Math.abs(p[0] - b.min[0]), [-1, 0, 0]], [Math.abs(p[0] - b.max[0]), [1, 0, 0]], [Math.abs(p[1] - b.min[1]), [0, -1, 0]], [Math.abs(p[1] - b.max[1]), [0, 1, 0]], [Math.abs(p[2] - b.min[2]), [0, 0, -1]], [Math.abs(p[2] - b.max[2]), [0, 0, 1]]]; ds.sort((a, c) => a[0] - c[0]); return ds[0][1]; }
const decalGeo = new THREE.PlaneGeometry(1, 1);
function decal(R, p, n, col, size) {
  const m = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.scale.setScalar(size); m.position.set(p[0] + n[0] * .01, p[1] + n[1] * .01, p[2] + n[2] * .01); m.lookAt(p[0] + n[0], p[1] + n[1], p[2] + n[2]); R.scene.add(m);
  (R.decals = R.decals || []).push(m); if (R.decals.length > 90) { const o = R.decals.shift(); R.scene.remove(o); o.material.dispose(); }
}
function impact(R, p, b, d) {
  const n = b ? boxNormal(b, p) : [0, 1, 0]; const surf = b ? b.surf : 'dirt';
  decal(R, p, n, 0x111111, .05); sprite(R, [p[0] + n[0] * .05, p[1] + n[1] * .05, p[2] + n[2] * .05], surf === 'wood' ? 0x8a6a40 : surf === 'metal' ? 0xffd080 : 0x9a9080, .18, .3, .3);
  const dd = Math.hypot(p[0] - R.me.pos.x, p[2] - R.me.pos.z); if (dd < 40) G.AU.hit({ x: p[0], y: p[1], z: p[2] }, surf === 'metal' ? 'metal' : surf === 'wood' ? 'wood' : 'dirt');
}
function muzzleFlash(R, o, supp, mine) {
  if (supp) return; R.muzzleLight.position.set(o.x, o.y, o.z); R.muzzleLight.intensity = mine ? 2.5 : 3.5; R.muzzleLight.distance = 9; R.mlT = .05;
  if (!mine) sprite(R, [o.x, o.y, o.z], 0xffc060, .35, .05);
  else R.vmFlash = .05;
}
function fxTick(R, dt) {
  for (let i = R.fx.length - 1; i >= 0; i--) { const f = R.fx[i]; f.life -= dt; if (f.life <= 0) { R.scene.remove(f.s); f.s.material.dispose(); R.fx.splice(i, 1); continue; } f.s.position.y += f.vy * dt; f.s.material.opacity = Math.min(.9, f.life / f.max); f.s.scale.addScalar(f.grow * dt); }
  if (R.mlT > 0) { R.mlT -= dt; if (R.mlT <= 0) R.muzzleLight.intensity = 0; }
}
function doorTick(R, dt) { for (const d of R.W.doors) if (d.ang !== d.target) { const s = Math.sign(d.target - d.ang); d.ang += s * dt * 4; if (Math.sign(d.target - d.ang) !== s) d.ang = d.target; d.pivot.rotation.y = d.ang; } }

/* ---------- remote players ---------- */
G.remoteUpsert = (R, id, st) => {
  let a = R.remotes.get(id);
  if (!a) { a = G.newActor(R, { id, fac: 'player', name: st.n || 'Operator', eq: st.eq || G.newEq(), look: st.lk || 'BARK', remote: true, team: st.tm, scav: st.sc }); a.target = new THREE.Vector3(st.p[0], st.p[1], st.p[2]); a.pos.copy(a.target); R.remotes.set(id, a); }
  if (!a.alive) return a;
  a.target.set(st.p[0], st.p[1], st.p[2]); a.tyaw = st.y; a.pitch = st.pi; a.crouchK = st.c; a.leanO = st.l || 0; a.moving = st.m; a.light = st.li; a.team = st.tm;
  if (st.w && st.w !== a.wid) { a.wid = st.w; a.weapon = G.mk(st.w); if (a.model) G.modelGun(a.model, a.weapon); }
  return a;
};
function remoteTick(R, a, dt) { if (!a.alive || !a.target) return; a.pos.lerp(a.target, Math.min(1, dt * 12)); if (a.tyaw != null) { let d = ((a.tyaw - a.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; a.yaw += d * Math.min(1, dt * 12); } }

/* ---------- interaction ---------- */
function findInteract(R) {
  const me = R.me; const o = R.cam.position; const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(R.cam.quaternion);
  let best = null, bd = 2.3;
  const consider = (p, obj, kind, rad = .6) => { const v = new THREE.Vector3(p.x - o.x, p.y - o.y, p.z - o.z); const d = v.length(); if (d > 2.6) return; const t = v.dot(dir); if (t < 0) return; const off = v.clone().sub(dir.clone().multiplyScalar(t)).length(); if (off > rad + d * .12) return; if (t < bd) { if (!G.los(R.W, [o.x, o.y, o.z], [p.x, p.y + .05, p.z]) && kind !== 'door') return; bd = t; best = { kind, obj }; } };
  for (const c of R.loots) { const p = c.kind === 'body' ? { x: c.pos.x, y: c.pos.y + .3, z: c.pos.z } : { x: c.pos.x, y: c.pos.y + .3, z: c.pos.z }; consider(p, c, 'loot', c.kind === 'body' ? .9 : .55); }
  for (const d of R.W.doors) consider({ x: d.x, y: 1.1, z: d.z }, d, 'door', .8);
  for (const e of R.extracts) if (e.kind === 'pay' && !e.paid) consider({ x: e.x, y: 1, z: e.z }, e, 'pay', 1.2);
  return best;
}
function interact(R) {
  const it = R.me.interact; if (!it) return;
  if (it.kind === 'loot') { R.lootOpen = it.obj; toggleInv(true); }
  if (it.kind === 'door') {
    const d = it.obj;
    if (d.key && !d.unlocked) { const k = G.allEqItems(R.eq).find(x => x.id === d.key); if (!k) { toastHud('Locked — needs ' + I[d.key].name); G.AU.click(d.pivot.position, 900, .3); return; } R.me.busy = { t: 1.5, done: () => { d.unlocked = true; d.key = null; k.uses = (k.uses || 1) - 1; if (k.uses <= 0) { const s = srcOf(R, k); if (s) G.removeFrom(s); } G.setDoor(R.W, d, true); R.net && R.net.door(d); toastHud('Unlocked'); } }; return; }
    G.setDoor(R.W, d, !d.open); G.AU.click({ x: d.x, y: 1, z: d.z }, d.open ? 500 : 700, .4); R.net && R.net.door(d);
  }
  if (it.kind === 'pay') { const e = it.obj; const have = rubOnMe(R); if (have < e.cost) return toastHud('Need ' + G.rub(e.cost) + ' on you'); takeRub(R, e.cost); e.paid = true; toastHud('Paid. Driver leaves in 20 seconds — stay close.'); e.time = 20; }
}
function rubOnMe(R) { return G.allEqItems(R.eq).filter(x => x.id === 'rub').reduce((s, x) => s + x.n, 0); }
function takeRub(R, n) { for (const g of G.eqGrids(R.eq)) for (const e of [...g.items]) { if (n <= 0) return; if (e.it.id === 'rub') { const t = Math.min(e.it.n, n); e.it.n -= t; n -= t; if (e.it.n <= 0) G.gridRemove(g, e.it); } } }

/* ---------- ground drops ---------- */
function dropGround(R, it) {
  const p = R.me.pos; let pile = R.loots.find(c => c.kind === 'ground' && c.pos.distanceTo(p) < 1.5);
  if (!pile) { pile = { id: 'G' + R.me.id + '_' + (R.pileSeq = (R.pileSeq || 0) + 1), kind: 'ground', name: 'Ground', pos: new THREE.Vector3(p.x - Math.sin(R.me.yaw) * .6, 0, p.z - Math.cos(R.me.yaw) * .6), grid: G.grid(8, 8) }; R.loots.push(pile); pileMesh(R, pile); }
  if (!G.gridAdd(pile.grid, it)) { pile.grid.h += 4; G.gridAdd(pile.grid, it); }
  if (R.net) R.net.lootSet(pile);
  pileMesh(R, pile);
}
function pileMesh(R, c) { if (c.mesh) R.scene.remove(c.mesh); const g = new THREE.Group(); c.grid.items.slice(0, 6).forEach((e, i) => { const d = I[e.it.id]; const m = new THREE.Mesh(new THREE.BoxGeometry(.12 * d.w + .05, .08, .12 * d.h + .05), new THREE.MeshLambertMaterial({ color: new THREE.Color(d.col || '#887').getHex() })); m.position.set((i % 3) * .2 - .2, .04 + Math.floor(i / 3) * .08, Math.floor(i / 3) * .15); m.rotation.y = i; g.add(m); }); g.position.copy(c.pos); R.scene.add(g); c.mesh = g; }
G.pileMeshNet = (R, c) => pileMesh(R, c);

/* ---------- extraction ---------- */
function extractTick(R, dt) {
  const me = R.me; let inE = null;
  for (const e of R.extracts) if (Math.hypot(me.pos.x - e.x, me.pos.z - e.z) < e.r) { inE = e; break; }
  const el = $('#extprog');
  if (!inE) { R.exT = 0; el.style.display = 'none'; return; }
  let block = null;
  if (inE.kind === 'nobag' && R.eq.backpack) block = 'Requirement: no backpack';
  if (inE.kind === 'pay' && !inE.paid) block = 'Requirement: pay ' + G.rub(inE.cost) + ' (look at the sign and press F)';
  if (inE.kind === 'key' && !G.allEqItems(R.eq).some(x => x.id === inE.key)) block = 'Requirement: ' + I[inE.key].name;
  el.style.display = 'block';
  if (block) { el.innerHTML = `<b>${G.esc(inE.name)}</b><br><span class="bad">${block}</span>`; R.exT = 0; return; }
  R.exT = (R.exT || 0) + dt; const left = inE.time - R.exT;
  if (Math.floor(left * 2) !== R.exBeep) { R.exBeep = Math.floor(left * 2); if (R.exBeep % 2 === 0) G.AU.extractBeep(); }
  el.innerHTML = `<b>EXTRACTION: ${G.esc(inE.name)}</b><br><span class="big">${Math.max(0, left).toFixed(1)}</span>`;
  if (left <= 0) { R.extractedAt = inE.name; finish(R, 'survived'); }
}
function visitTick(R) { for (const v of R.W.visits) { if (v.done) continue; if (Math.hypot(R.me.pos.x - v.x, R.me.pos.z - v.z) < v.r) { v.done = true; const d = G.taskEvent({ type: 'visit', map: R.W.map, spot: v.spot }); if (d.length) toastHud('Location marked: ' + v.name, 3); } } }
function showExtracts(R) {
  const el = $('#extlist'); const list = R.extracts.map(e => `<div>${G.esc(e.name)}${e.kind === 'pay' ? ' <small>(pay ' + G.rub(e.cost) + ')</small>' : e.kind === 'nobag' ? ' <small>(no backpack)</small>' : e.kind === 'key' ? ' <small>(key)</small>' : ''}</div>`).join('');
  el.innerHTML = `<div class="t">${G.mmss(R.timeLeft)}</div><div class="l">${list || 'No extracts'}</div>`; el.classList.add('on'); clearTimeout(R.extT); R.extT = setTimeout(() => el.classList.remove('on'), 4000);
}

/* ================= RENDER ================= */
function render(R, dt) {
  const me = R.me, cam = R.cam, st = G.S.settings;
  // camera
  const eye = 1.62 - me.crouchK * .58; const rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
  const bob = me.moving > .5 && me.pos.y <= me.ground + .01 ? Math.sin(R.t * (me.sprinting ? 13 : 9)) * (me.sprinting ? .05 : .025) * (1 - me.ads * .8) : 0;
  // recoil recovery
  me.recoil.p *= Math.exp(-dt * 7.5); me.recoil.y *= Math.exp(-dt * 7); me.recoil.vk *= Math.exp(-dt * 12);
  if (me.lastShot && R.t - me.lastShot < .02) { me.pitch += me.recoil.p * .05; }
  // pain tremor / suppression / shake
  R.shake = Math.max(0, (R.shake || 0) - dt * 2); R.suppress = Math.max(0, (R.suppress || 0) - dt * .6);
  const trem = ((me.pain > 0 && me.painkill <= 0) ? .004 : 0) + (me.armBad ? .003 : 0) + R.shake * .02 + R.suppress * .004 + (me.stam < 15 ? .004 : 0);
  const sway = me.ads > .5 ? .0025 * (1 + (100 - me.stam) / 60) : 0;
  const sx = Math.sin(R.t * 1.3) * sway + (Math.random() - .5) * trem, sy = Math.sin(R.t * 2.1) * sway * .7 + (Math.random() - .5) * trem;
  if (me.alive) {
    cam.position.set(me.pos.x + rx * me.leanO, me.pos.y + eye + bob - Math.abs(me.leanO) * .15, me.pos.z + rz * me.leanO);
    cam.rotation.set(0, 0, 0, 'YXZ'); cam.rotation.order = 'YXZ';
    cam.rotation.y = me.yaw + me.recoil.y + sx; cam.rotation.x = me.pitch + me.recoil.p + sy; cam.rotation.z = -me.lean * .18;
  } else { R.deathT = (R.deathT || 0) + dt; cam.position.y = Math.max(me.pos.y + .25, cam.position.y - dt * 1.2); cam.rotation.z = Math.min(1.2, (cam.rotation.z || 0) + dt * .7); }
  const zoom = me.ads > .5 && R.sightZoom > 1 ? R.sightZoom : 1;
  const tf = st.fov / (1 + me.ads * (zoom > 1 ? zoom - 1 : .18));
  if (Math.abs(cam.fov - tf) > .05) { cam.fov = tf; cam.updateProjectionMatrix(); }
  // sun follows player for shadow coverage
  if (R.sun) { R.sun.position.set(me.pos.x + 60, 100, me.pos.z + 40); R.sun.target.position.set(me.pos.x, 0, me.pos.z); }
  if (R.sky) R.sky.position.set(cam.position.x, 0, cam.position.z);
  G.AU.listen(cam.position, new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion));
  // viewmodel
  if (R.vm) {
    const k = me.ads; const b = R.vmBase, a = R.vmAds; const vm = R.vm;
    const run = me.sprinting ? 1 : 0; R.vmRun = (R.vmRun || 0) + (run - (R.vmRun || 0)) * Math.min(1, dt * 8);
    const busy = me.busy ? 1 : 0; R.vmBusy = (R.vmBusy || 0) + (busy - (R.vmBusy || 0)) * Math.min(1, dt * 8);
    me.switchT = Math.max(0, (me.switchT || 0) - dt); const sw = me.switchT > 0 ? Math.min(1, me.switchT * 2) : 0;
    const insp = me.inspectT > 0 ? (me.inspectT -= dt, Math.sin(Math.min(1, (2.5 - me.inspectT) / .4) * Math.PI / 2) * (me.inspectT < .4 ? me.inspectT / .4 : 1)) : 0;
    vm.position.set(G.lerp(b[0], a[0], k) + bob * .3 + R.vmRun * .05, G.lerp(b[1], a[1], k) + bob * .5 - R.vmBusy * .15 - sw * .3 - R.vmRun * .04, G.lerp(b[2], a[2], k) + me.recoil.vk);
    vm.rotation.set(me.recoil.vk * 2 - R.vmRun * .5 - insp * .3, R.vmRun * .6 + insp * .9, (me.swing > 0 ? (me.swing -= dt, me.swing * 2) : 0) + insp * .4);
    if (R.vmGun && R.vmGun.userData.mag) R.vmGun.userData.mag.visible = !!(me.weapon && me.weapon.mag);
    R.vm.visible = me.alive && !(zoom > 1 && me.ads > .9);
  }
  renderer.clear(); renderer.render(R.scene, cam); renderer.clearDepth(); if (R.vm && R.vm.visible) renderer.render(R.vmScene, R.vmCam);
}

/* ================= HUD ================= */
function hudInit(R) {
  $('#hud').innerHTML = `<div id="prompt"></div><div id="hudmsg"></div><div id="status"></div><div id="stam"><i></i></div><div id="wpninfo"></div><div id="extlist"></div><div id="dot"></div><div id="scope"></div><div id="fx-dmg"></div><div id="fx-low"></div><div id="fps"></div><div id="banner"></div><div id="extprog"></div><div id="busybar"><i></i><span></span></div><div id="deathscr"></div>`;
  if (G.isTouch) touchInit(R);
}
function banner(R) { const el = $('#banner'); const now = new Date(); const hh = R.night ? 1 + Math.floor(Math.random() * 3) : 9 + Math.floor(Math.random() * 7); el.innerHTML = `<div class="b1">${R.W.meta.name.toUpperCase()}</div><div class="b2">${String(hh).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} · ${R.night ? 'NIGHT' : 'DAY'} · ${R.me.scav ? 'SAPLING' : 'PMC'} · ${G.mmss(R.timeLeft)}</div>`; el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 5000); }
let hudMsgT = null;
function toastHud(t, s = 1.6) { const el = $('#hudmsg'); if (!el) return; if (!t) return; el.textContent = t; el.classList.add('on'); clearTimeout(hudMsgT); hudMsgT = setTimeout(() => el.classList.remove('on'), s * 1000); }
G.toastHud = toastHud;
function dmgFlash(R, k) { const el = $('#fx-dmg'); el.style.opacity = Math.min(.7, .2 + k * .5); setTimeout(() => el.style.opacity = 0, 120); }
function hudTick(R, dt) {
  const me = R.me; R.hudT = (R.hudT || 0) - dt; const H = me.health.p;
  const pr = $('#prompt');
  if (me.interact && me.alive && !R.invOpen) { const i = me.interact; pr.style.display = 'block'; pr.innerHTML = i.kind === 'loot' ? `<b>F</b> ${i.obj.kind === 'body' ? 'Search body — ' + G.esc(i.obj.name) : G.esc(i.obj.name)}` : i.kind === 'door' ? `<b>F</b> ${i.obj.key && !i.obj.unlocked ? 'Unlock (' + I[i.obj.key].short + ')' : i.obj.open ? 'Close door' : 'Open door'}` : `<b>F</b> Pay ${G.rub(i.obj.cost)}`; }
  else pr.style.display = 'none';
  const dot = $('#dot'); dot.className = me.ads > .85 && R.dot ? 'on ' + R.dot : '';
  $('#scope').classList.toggle('on', me.ads > .85 && R.sightZoom > 1);
  const sb = $('#stam'); sb.style.opacity = me.stam < 99 ? 1 : 0; sb.firstChild.style.width = me.stam + '%';
  const bb = $('#busybar'); if (me.busy && me.busy.med) { bb.style.display = 'block'; bb.lastChild.textContent = me.busy.med; } else bb.style.display = 'none';
  if (R.hudT <= 0) {
    R.hudT = .25;
    const icons = []; if (G.PARTS.some(k => H[k].hb)) icons.push('<i class="ic hb" title="Heavy bleeding">HB</i>'); if (G.PARTS.some(k => H[k].bl)) icons.push('<i class="ic bl" title="Light bleeding">LB</i>'); if (G.PARTS.some(k => H[k].fr)) icons.push('<i class="ic fr" title="Fracture">FR</i>');
    if (me.pain > 0 && me.painkill <= 0) icons.push('<i class="ic pn">PAIN</i>'); if (me.painkill > 0) icons.push('<i class="ic pk">PK</i>'); if (me.hyd < 20) icons.push('<i class="ic hy">WATER</i>'); if (me.en < 20) icons.push('<i class="ic en">FOOD</i>');
    if (weightOf(R.eq) > 32 * (1 + G.skillLvl('strength') * .01)) icons.push('<i class="ic ow">OVERWEIGHT</i>'); if (me.stim > 0) icons.push('<i class="ic st">STIM</i>');
    $('#status').innerHTML = icons.join('') + `<span class="stance">${me.crouchK > .5 ? 'CROUCH' : 'STAND'}${me.walkMul && me.walkMul < 1 ? ' ' + Math.round(me.walkMul * 100) + '%' : ''}</span>`;
    const low = G.totalHP(me.health) / G.maxHP(me.health); $('#fx-low').style.opacity = low < .45 ? (1 - low / .45) * .8 : 0;
    if (low < .3 && me.alive && Math.random() < .5) G.AU.heart();
    const f = $('#fps'); f.style.display = G.S.settings.showFps ? 'block' : 'none'; f.textContent = Math.round(R.fpsA) + ' fps · ' + R.actors.filter(a => a.ai && a.alive).length + ' ai';
    $('#wpninfo').innerHTML = me.weapon ? `${I[me.weapon.id].short} <small>${me.weapon.mode === 'auto' ? 'AUTO' : 'SEMI'}</small>` : 'STICK';
  }
}

/* ================= RAID INVENTORY ================= */
function toggleInv(force) {
  const R = G.R; const open = force != null ? force : !R.invOpen; if (!R.me.alive || R.over) return;
  R.invOpen = open; const el = $('#raidinv');
  if (open) { if (document.exitPointerLock) document.exitPointerLock(); el.classList.add('on'); MOUSE.l = MOUSE.r = false; buildRaidInv(R); R.searchT = 0; R.searchLoop = setInterval(() => searchTick(R), 100); }
  else { el.classList.remove('on'); G.setInv(null); R.lootOpen = null; clearInterval(R.searchLoop); lockPointer(); buildViewmodel(R); if (R.net) R.net.equip(); }
}
G.toggleRaidInv = toggleInv;
function buildRaidInv(R) {
  const root = $('#raidinv'); root.innerHTML = '';
  const wrap = h('div', 'invscreen raid'); root.appendChild(wrap);
  const close = h('button', 'btn sm invclose', 'Close (Tab)'); close.onclick = () => toggleInv(false); root.appendChild(close);
  G.setInv({
    root: wrap, inRaid: true, eq: R.eq,
    grids: () => { const g = G.eqGrids(R.eq); const L = R.lootOpen; if (L) { if (L.grid) g.push(L.grid); if (L.eq) g.push(...G.eqGrids(L.eq)); } return g; },
    alive: () => true,
    use: (it, src) => G.raidUse(it, src),
    bind: (k, it) => { R.binds[k] = it.u; G.toast('Bound ' + I[it.id].short + ' to ' + k); },
    dropGround: it => { dropGround(R, it); },
    onLoad: n => { R.me.busy = { t: n * .32, slow: true, med: 'Loading ammo' }; },
    onChange: () => { const L = R.lootOpen; if (L && R.net) R.net.lootSet(L); if (L && L.kind === 'ground') pileMesh(R, L); if (L && L.kind === 'body' && L.actor && L.actor.model) G.dressModel(L.actor.model, L.eq); if (L && L.kind === 'cont' && L.type === 'loose' && L.mesh) L.mesh.visible = L.grid.items.length > 0; R.me.weapon = R.eq[R.me.wslot] || null; if (!R.me.weapon) { R.me.wslot = ['primary', 'secondary', 'holster'].find(s => R.eq[s]) || null; R.me.weapon = R.me.wslot ? R.eq[R.me.wslot] : null; } },
    build: r2 => {
      const left = h('div', 'inv-left'); left.appendChild(G.healthPanel(R.me.health, { extra: ` · ${weightOf(R.eq).toFixed(1)} kg` })); left.appendChild(G.eqPanel(R.eq));
      const bd = h('div', 'binds'); bd.innerHTML = 'Quick slots: ' + [4, 5, 6, 7].map(k => `<b>${k}</b> ${R.binds[k] ? (findOnMe(R, R.binds[k]) ? I[findOnMe(R, R.binds[k]).it.id].short : '—') : '—'}`).join(' · '); left.appendChild(bd);
      const mid = h('div', 'inv-mid scroll'); mid.appendChild(G.contPanel(R.eq));
      const right = h('div', 'inv-right scroll');
      const L = R.lootOpen;
      if (L) {
        right.appendChild(h('div', 'stashbar', `<b>${G.esc(L.kind === 'body' ? 'BODY — ' + L.name : L.name.toUpperCase())}</b>`));
        if (L.kind === 'body') { right.appendChild(G.eqPanel(L.eq)); right.appendChild(G.contPanel(L.eq, { noSecure: true })); }
        else right.appendChild(G.gridEl(L.grid));
      } else right.appendChild(h('div', 'dim pad', 'Look at a container or body and press F to search it.'));
      const gd = h('div', 'ground-drop', 'DROP ON GROUND'); right.appendChild(gd);
      r2.appendChild(left); r2.appendChild(mid); r2.appendChild(right);
    },
  });
  G.renderInv();
}
function searchTick(R) {
  const L = R.lootOpen; if (!L || !R.invOpen) return; R.searchT += .1;
  const grids = L.grid ? [L.grid] : G.eqGrids(L.eq);
  const unk = []; grids.forEach(g => g.items.forEach(e => { if (e.it.unk) unk.push(e); })); if (!unk.length) return;
  unk.sort((a, b) => a.y - b.y || a.x - b.x);
  const need = (.7 + Math.random() * .6) * (L.searchMul || 1) * (1 - G.skillLvl('search') * .01);
  if (R.searchT >= need) { R.searchT = 0; delete unk[0].it.unk; R.xp.loot += 4; R.found++; G.skillXP('search', 1); G.renderInv(); }
}

/* ================= FINISH ================= */
function finish(R, status) {
  if (R.over) return; R.over = true; const S = G.S; const me = R.me;
  if (R.invOpen) { R.invOpen = false; $('#raidinv').classList.remove('on'); clearInterval(R.searchLoop); }
  if (document.exitPointerLock) document.exitPointerLock();
  const dur = (Date.now() - R.startReal) / 1000;
  let xp = R.xp.kills + Math.round(R.xp.loot) + Math.round(R.xp.heal) + Math.round(dur / 60 * 10);
  if (status === 'survived') { const run = dur < 300 && xp < 200; if (run) status = 'runthrough'; }
  if (status === 'survived') xp = Math.round(xp * 1.3) + 400;
  // carry results into the save
  const res = { status, map: R.W.meta.name, dur, xp, kills: R.kills, killer: R.deathCause, extract: R.extractedAt, scav: me.scav, lost: 0, gained: 0 };
  const startVal = R.startVal != null ? R.startVal : 0;
  if (!me.scav) {
    if (status === 'survived' || status === 'runthrough') {
      if (status === 'runthrough') G.allEqItems(R.eq).forEach(it => { if (!R.startUids.has(it.u)) it.fir = false; });
      G.allEqItems(R.eq).forEach(it => { delete it.unk; });
      S.eq = R.eq; S.stats.survived++; S.stats.streak++;
      S.health = G.clone(me.health); S.health.hyd = me.hyd; S.health.en = me.en; G.PARTS.forEach(k => { S.health.p[k].bl = 0; S.health.p[k].hb = 0; });
      G.taskEvent({ type: 'extract', map: R.W.map }); G.taskEvent({ type: 'survive' });
      res.gained = G.allEqItems(R.eq).filter(it => !R.startUids.has(it.u)).reduce((s, it) => s + (I[it.id].price * (it.n || 1)), 0);
    } else {
      // dead or MIA: lose everything but the secure container. insurance claims.
      const lostTop = ['primary', 'secondary', 'holster', 'helmet', 'armor', 'rig', 'backpack'].map(s => R.eq[s]).filter(Boolean);
      res.lost = lostTop.reduce((s, it) => s + G.value(it), 0) + R.eq.pockets.items.reduce((s, e) => s + G.value(e.it), 0);
      const back = []; lostTop.forEach(it => { if (it.ins && Math.random() < .65) { const c = G.clone(it); if (c.grid) c.grid.items = []; c.mag = null; c.ch = null; if (c.rounds) c.rounds = []; c.ins = false; G.setFir(c, false); back.push(c); } });
      if (back.length) G.mailMsg('Pinecone', 'Insurance return. Nobody found these in the bushes. Lucky you.', back, Date.now() + 15 * 60000);
      const sec = R.eq.secure || S.eq.secure; const ne = G.newEq(); if (sec) { ne.secure = sec; G.itemsDeep(sec).forEach(x => delete x.unk); }
      S.eq = ne; status === 'kia' ? S.stats.kia++ : S.stats.mia++; S.stats.deaths++; S.stats.streak = 0;
      G.PARTS.forEach(k => { const p = S.health.p[k]; p.max = G.PART_MAX[k]; p.hp = Math.round(p.max * .4); p.bl = p.hb = p.fr = 0; }); S.health.hyd = 45; S.health.en = 45;
    }
  } else {
    if (status === 'survived' || status === 'runthrough') {
      const its = []; ['primary', 'secondary', 'holster', 'helmet', 'armor', 'rig', 'backpack'].forEach(s => R.eq[s] && its.push(R.eq[s])); R.eq.pockets.items.forEach(e => its.push(e.it));
      its.forEach(it => { G.itemsDeep(it).forEach(x => { delete x.unk; if (status === 'runthrough' && !R.startUids.has(x.u)) x.fir = false; }); });
      // Sapling gear itself isn't "found in raid"
      its.forEach(it => { if (R.startUids.has(it.u)) G.itemsDeep(it).forEach(x => { if (R.startUids.has(x.u)) x.fir = false; }); });
      G.mailMsg('Sapling run', 'Everything your sapling carried out.', its); S.stats.survived++;
      G.taskEvent({ type: 'extract', map: R.W.map }); G.taskEvent({ type: 'survive' });
    } else { status === 'kia' ? S.stats.kia++ : S.stats.mia++; }
  }
  S.xp += xp; S.inRaid = null; G.save();
  R.results = res;
  if (R.net) R.net.done(status);
  showResults(R, res);
  // stop the world unless we host a squad still in raid
  if (R.net && R.isHost && R.net.othersInRaid()) { R.lingering = true; } else stopRaid(R);
}
G.finishRaid = (st) => G.R && finish(G.R, st);
function stopRaid(R) {
  R.running = false; G.AU.stopAmbient();
  try { R.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose && m.dispose()); } }); } catch (e) { }
  if (renderer) renderer.renderLists && renderer.renderLists.dispose();
}
G.stopRaid = () => G.R && stopRaid(G.R);
function showResults(R, res) {
  const el = $('#results'); const S = G.S;
  const title = { survived: 'SURVIVED', runthrough: 'RUN THROUGH', kia: 'KILLED IN ACTION', mia: 'MISSING IN ACTION' }[res.status];
  const cls = res.status === 'survived' ? 'ok' : res.status === 'runthrough' ? 'mid' : 'bad';
  const kd = res.killer ? (res.killer.killer ? `Killed by <b>${G.esc(res.killer.killer)}</b>${res.killer.cause ? ' · ' + (G.PART_NAMES[res.killer.cause] || res.killer.cause) : ''}` : `Died of <b>${G.esc(res.killer.cause)}</b>`) : '';
  el.innerHTML = `<div class="res-box"><h1 class="${cls}">${title}</h1><div class="res-sub">${G.esc(res.map)} · ${G.mmss(res.dur)} in raid${res.extract ? ' · via ' + G.esc(res.extract) : ''}</div>${kd ? `<div class="res-k">${kd}</div>` : ''}
   ${res.status === 'runthrough' ? '<p class="dim">Short raid with little experience earned: newly found items lost their found-in-raid status.</p>' : ''}
   ${res.status === 'kia' || res.status === 'mia' ? (res.scav ? '<p class="dim">Your sapling is mulch. No loss to your PMC.</p>' : `<p class="dim">Lost gear worth ~${G.rub(res.lost)}. Your Seed Pod kept its contents.</p>`) : ''}
   <h3>EXPERIENCE <b>+${G.fmt(res.xp)}</b></h3>
   <div class="res-kills">${res.kills.length ? res.kills.map(k => `<div>${G.esc(k.name)} <small>${k.who}</small> <span>${G.PART_NAMES[k.part] || k.part} · ${k.dist} m · ${G.esc(k.wpn)}</span></div>`).join('') : '<div class="dim">No kills</div>'}</div>
   <div id="res-wait" class="dim"></div>
   <button class="btn big gold" id="res-next">CONTINUE</button></div>`;
  el.classList.add('on');
  $('#res-next').onclick = () => { el.classList.remove('on'); if (R.lingering) { R.lingering = false; stopRaid(R); } G.R = null; G.show('menu'); G.menu('main'); if (G.NET) G.NET.afterRaid && G.NET.afterRaid(); };
  if (res.scav && (res.status === 'survived' || res.status === 'runthrough')) $('#res-wait').textContent = 'Your sapling\'s loot was sent to Messages.';
}

/* ---------- touch controls ---------- */
function touchInit(R) {
  const t = $('#touch'); t.classList.add('on');
  t.innerHTML = `<div id="tjoy"><i></i></div><div id="tlook"></div><div class="tbtns"><b data-k="fire" class="big">FIRE</b><b data-k="ads">AIM</b><b data-k="KeyR">R</b><b data-k="KeyC">C</b><b data-k="Space">JMP</b><b data-k="KeyF">F</b><b data-k="Tab">INV</b><b data-k="KeyO">O</b><b data-k="KeyL">L</b><b data-k="KeyB">B</b><b data-k="Digit1">1</b><b data-k="Digit3">3</b><b data-k="sprint">RUN</b></div>`;
  const joy = $('#tjoy'), knob = joy.firstChild; let jid = null, jx = 0, jy = 0;
  joy.addEventListener('touchstart', e => { const tt = e.changedTouches[0]; jid = tt.identifier; const r = joy.getBoundingClientRect(); jx = r.left + r.width / 2; jy = r.top + r.height / 2; TOUCH.on = true; e.preventDefault(); }, { passive: false });
  const look = $('#tlook'); let lid = null, lx = 0, ly = 0;
  look.addEventListener('touchstart', e => { const tt = e.changedTouches[0]; lid = tt.identifier; lx = tt.clientX; ly = tt.clientY; e.preventDefault(); }, { passive: false });
  window.addEventListener('touchmove', e => { for (const tt of e.changedTouches) { if (tt.identifier === jid) { const dx = (tt.clientX - jx) / 50, dy = (tt.clientY - jy) / 50; const l = Math.min(1, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx); TOUCH.mx = Math.cos(a) * l; TOUCH.mz = Math.sin(a) * l; knob.style.transform = `translate(${TOUCH.mx * 35}px,${TOUCH.mz * 35}px)`; } if (tt.identifier === lid) { MOUSE.dx += (tt.clientX - lx) * 1.6; MOUSE.dy += (tt.clientY - ly) * 1.6; lx = tt.clientX; ly = tt.clientY; } } }, { passive: true });
  window.addEventListener('touchend', e => { for (const tt of e.changedTouches) { if (tt.identifier === jid) { jid = null; TOUCH.mx = TOUCH.mz = 0; knob.style.transform = ''; } if (tt.identifier === lid) lid = null; } });
  t.querySelectorAll('.tbtns b').forEach(b => { const k = b.dataset.k;
    b.addEventListener('touchstart', e => { e.preventDefault(); if (k === 'fire') TOUCH.fire = true; else if (k === 'ads') TOUCH.ads = !TOUCH.ads; else if (k === 'sprint') TOUCH.sprint = !TOUCH.sprint; else document.dispatchEvent(new KeyboardEvent('keydown', { code: k })); }, { passive: false });
    b.addEventListener('touchend', e => { if (k === 'fire') TOUCH.fire = false; else if (k !== 'ads' && k !== 'sprint') document.dispatchEvent(new KeyboardEvent('keyup', { code: k })); });
  });
}

// wire R methods
const _start = G.startRaid;
G.startRaid = cfg => { const R = _start(cfg); return R; };
Object.defineProperty(G, 'R', { get() { return G._R; }, set(v) { G._R = v; if (v) { v.addAI = (kind, x, z, zone, eq, id) => addAI(v, kind, x, z, zone, eq, id); v.onDeath = (a, killer, part) => onDeath(v, a, killer, part); v.finish = st => finish(v, st); v.dropGround = it => dropGround(v, it); } } });
})();
