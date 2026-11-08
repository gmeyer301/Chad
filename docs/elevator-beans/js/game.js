'use strict';
/* Elevator Beans: player, host rules, rendering, HUD, menus */
const HL = { bag: [], last: '' };
function newG() { return { ph: 'lobby', t: 0, tot: 1, tt: 0, fl: 0, fid: 'lobby', sd: 1, nf: '', built: 1, hz: 3, done: 0, pr: 0, nd: 0, i: [], e: [], x: {}, rid: 0, rw: null, ov: null }; }
let G = newG();
const ME = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, gr: false, stam: 100, inj: 0, exh: false, climb: false, cw: null, wn: [0, 1], wall: null, alive: true, ghost: false, rag: 0, carry: -1, carryT: 0, air: 100, water: 100, spray: false, sees: [], lastRid: -1, koSeq: 0, boomSeq: 0, noDrain: 0, hitCD: 0, landV: 0, spd: 0, hoseAcc: {}, hoseT: 0, airTick: 0 };
const CAM = { yaw: Math.PI, pitch: .32, dist: 5.6, shake: 0 };
const BUILT = { fid: '', sd: -1 };
const UI = { title: true, menu: null, preview: false, introUntil: 0, overShown: -1, pauseOpen: false };
let myBean, itemMeshes = [], entMeshes = [], potatoMesh = null, lastT = 0, clock = 0;
const OTHERS = new Map();
const PARTS = [];

/* ---------------- input ---------------- */
const KEYS = {}; let PRESSED = {};
const MOUSE = { l: 0, any: 0 };
const TOUCH = { x: 0, y: 0, run: 0, spray: 0, jumpP: 0, grabP: 0, on: false };
const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
addEventListener('keydown', e => {
  if (typing(e)) return; if (!KEYS[e.code]) PRESSED[e.code] = 1; KEYS[e.code] = 1;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if ((e.code === 'Escape' || e.code === 'KeyP') && !UI.title) togglePause();
  audioInit();
});
addEventListener('keyup', e => { KEYS[e.code] = 0; });
addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = 0; MOUSE.l = MOUSE.any = 0; });
function lockPointer() { try { const c = $('#c'); if (document.pointerLockElement !== c && c.requestPointerLock) { const p = c.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } } catch (e) { } }
function initInput() {
  const c = $('#c');
  c.addEventListener('mousedown', e => { audioInit(); if (UI.title || UI.menu) return; MOUSE.any = 1; if (e.button === 0) MOUSE.l = 1; lockPointer(); });
  addEventListener('mouseup', e => { if (e.button === 0) MOUSE.l = 0; MOUSE.any = 0; });
  addEventListener('mousemove', e => { if (UI.title || UI.menu) return; if (document.pointerLockElement === c || MOUSE.any) look(e.movementX || 0, e.movementY || 0); });
  c.addEventListener('contextmenu', e => e.preventDefault());
  // touch: left half = stick, right half = look
  if (matchMedia('(pointer:coarse)').matches) { TOUCH.on = true; document.body.classList.add('touch'); }
  let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
  c.addEventListener('touchstart', e => { audioInit(); for (const t of e.changedTouches) { if (t.clientX < innerWidth * .45 && stickId === null) { stickId = t.identifier; sx = t.clientX; sy = t.clientY; showStick(sx, sy, 0, 0); } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; } } e.preventDefault(); }, { passive: false });
  c.addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === stickId) { const dx = clamp((t.clientX - sx) / 55, -1, 1), dy = clamp((t.clientY - sy) / 55, -1, 1); TOUCH.x = dx; TOUCH.y = -dy; showStick(sx, sy, dx, dy); } else if (t.identifier === lookId) { look((t.clientX - lx) * 1.6, (t.clientY - ly) * 1.6); lx = t.clientX; ly = t.clientY; } } e.preventDefault(); }, { passive: false });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === stickId) { stickId = null; TOUCH.x = TOUCH.y = 0; $('#stick').hidden = true; } if (t.identifier === lookId) lookId = null; } };
  c.addEventListener('touchend', end); c.addEventListener('touchcancel', end);
  const hold = (id, k) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); audioInit(); TOUCH[k] = k === 'run' ? (TOUCH.run ? 0 : 1) : 1; if (k === 'run') b.classList.toggle('on', !!TOUCH.run); }, { passive: false }); if (k !== 'run') b.addEventListener('touchend', e => { e.preventDefault(); if (k === 'spray') TOUCH.spray = 0; }, { passive: false }); };
  hold('#tJump', 'jumpP'); hold('#tGrab', 'grabP'); hold('#tRun', 'run'); hold('#tSpray', 'spray');
  $('#tPause').addEventListener('click', () => togglePause());
}
function showStick(x, y, dx, dy) { const s = $('#stick'); s.hidden = false; s.style.left = (x - 50) + 'px'; s.style.top = (y - 50) + 'px'; $('#stickK').style.transform = `translate(${dx * 30}px,${dy * 30}px)`; }
function look(dx, dy) { CAM.yaw -= dx * .0028 * P.sens; CAM.pitch = clamp(CAM.pitch + dy * .0028 * P.sens * (P.invert ? -1 : 1), -.6, 1.25); }

/* ---------------- host rules ---------------- */
const dOf = () => Math.max(0, G.fl - 1);
function playersList() {
  const L0 = [{ u: MY_UID, x: ME.x, y: ME.y, z: ME.z, al: ME.alive && !ME.ghost, s: ME.sees, n: P.name }];
  remotePeers().forEach(p => { const pr = p.presence, pp = pr.p || [0, 0, 0]; L0.push({ u: pr.u, x: pp[0], y: pp[1], z: pp[2], al: !!(pr.f & 1) && !(pr.f & 2), s: pr.s || [], n: pr.n }); });
  return L0;
}
function hostAct(u, a) {
  const kind = a[1], r = a.slice(2);
  if (kind === 'pick') { const it = G.i[r[0]]; if (it && it[3] === 0 && (G.ph === 'play' || G.ph === 'ret')) { it[3] = 1; it[4] = u; } }
  else if (kind === 'drop') {
    const it = G.i[r[0]]; if (!it || it[3] !== 1 || it[4] !== u) return;
    it[0] = r2(+r[1] || 0); it[1] = r2(+r[2] || 0); it[2] = r2(+r[3] || 0); it[3] = 0; it[4] = '';
    if (L && L.zone && G.ph === 'play' && inZone(L.zone, it[0], it[1], it[2])) { it[3] = 2; G.pr++; }
  }
  else if (kind === 'hose') { const f = G.x.f; if (f && f[r[0]] > 0 && G.ph === 'play') f[r[0]] = Math.max(0, f[r[0]] - clamp(+r[1] || 0, 0, 25)); }
  else if (kind === 'start' && u === MY_UID) startRun();
}
function pickFloor() { if (!HL.bag.length) { HL.bag = FLOOR_IDS.slice().sort(() => Math.random() - .5); if (HL.bag[HL.bag.length - 1] === HL.last) HL.bag.unshift(HL.bag.pop()); } return HL.last = HL.bag.pop(); }
function startRun(from) {
  if (G.ph !== 'lobby') return; const c = from || 1; G.hz = from && P.run ? P.run.hz : 3; G.rw = null; HL.bag = [];
  P.stats.runs++; save(); startRide(c);
}
function startRide(n) {
  G.fl = n; G.nf = pickFloor(); G.built = 0; G.ph = 'ride'; G.t = G.tot = 5; G.rid++; G.done = 0; G.pr = 0; G.nd = 0; G.e = []; G.i = []; G.x = {}; G.tt = 0;
  if (n > 1) { P.run = { fl: n, hz: G.hz }; save(); }
}
function hostFinish(ok) { G.done = ok ? 1 : 0; if (!ok) G.hz--; G.ph = 'ret'; G.t = G.tot = ok ? 15 : 11; }
function hostTick(dt) {
  G.t -= dt; G.tt = r2(G.tt + dt);
  const PL = playersList();
  if (G.ph === 'ride') {
    if (!G.built && G.t < 3.6) { G.fid = G.nf; G.sd = Math.floor(Math.random() * 1e9); G.built = 1; syncFloor(); FL[G.fid].init(G, L, dOf(), PL.length); }
    if (G.t <= 0) { G.ph = 'play'; G.t = G.tot = FL[G.fid].time(dOf()); }
  } else if (G.ph === 'play' || G.ph === 'ret') {
    const F = FL[G.fid]; if (F.tick) F.tick(G, L, dt, dOf(), PL);
    hostItems(dt, PL);
    if (G.ph === 'play') {
      if (!F.survive && G.nd > 0 && G.pr >= G.nd) hostFinish(1);
      else if (G.t <= 0) hostFinish(F.survive ? PL.some(p => p.al) : 0);
      else if (PL.length && PL.every(p => !p.al)) { hostFinish(0); G.t = 3; }
    } else if (G.t <= 0) {
      const inside = PL.filter(p => p.al && inCabin(p.x, p.y, p.z)).map(p => p.u);
      if (!inside.length || G.hz <= 0) { G.ov = { fl: G.fl, why: !inside.length ? 'Nobody made it back into the elevator.' : 'The elevator ran out of hearts.', rid: G.rid + 1 }; G.ph = 'over'; G.t = 7; G.rid++; P.run = null; save(); }
      else { G.rw = { h: G.done ? FL[G.fid].hat : null, u: inside, fl: G.fl, fid: G.fid, rid: G.rid + 1 }; startRide(G.fl + 1); }
    }
  } else if (G.ph === 'over' && G.t <= 0) toLobby();
}
function toLobby() { const rid = G.rid + 1; G = newG(); G.rid = rid; }
function hostItems(dt, PL) {
  const ids = new Set(PL.map(p => p.u));
  G.i.forEach((it, k) => {
    const def = L.items[k]; if (!def) return;
    if (it[3] === 1 && (!ids.has(it[4]) || !PL.find(p => p.u === it[4]).al)) { const p = PL.find(q => q.u === it[4]); if (p) { it[0] = r2(p.x); it[1] = r2(p.y); it[2] = r2(p.z); } it[3] = 0; it[4] = ''; }
    if (it[3] !== 0) return;
    if (!CARRY_KINDS[def.kind]) { if (G.ph === 'play') for (const p of PL) if (p.al && Math.hypot(p.x - it[0], p.z - it[2]) < 1.4 && p.y > it[1] - 1.2 && p.y < it[1] + 2.2) { it[3] = 2; G.pr++; break; } return; }
    const gy = groundBelow(it[0], it[2], it[1]);
    if (gy < -50 || it[1] < (L.killY || -25)) { it[0] = def.x; it[1] = def.y; it[2] = def.z; }
    else if (it[1] > gy + .01) it[1] = r2(Math.max(gy, it[1] - 12 * dt));
  });
}
function applyHostState(g) { if (g === HL.lastG) return; HL.lastG = g; const tt = G.tt; G = JSON.parse(JSON.stringify(g)); if (Math.abs((G.tt || 0) - tt) < .3) G.tt = tt; }

/* ---------------- floor sync ---------------- */
function syncFloor() {
  if (BUILT.fid === G.fid && BUILT.sd === G.sd) return;
  BUILT.fid = G.fid; BUILT.sd = G.sd; clearFloor();
  L = FL[G.fid].build(FLOOR_GRP, rng(G.sd), dOf(), Math.max(1, remotePeers().length + 1));
  L.items = L.items || []; setEnv(L.env);
  itemMeshes.forEach(m => scene.remove(m)); entMeshes.forEach(m => m && scene.remove(m)); entMeshes = [];
  itemMeshes = L.items.map((it, k) => { const m = itemModel(it.kind, k); m.position.set(it.x, it.y, it.z); scene.add(m); return m; });
  ME.koSeq = 0; ME.boomSeq = 0; ME.carry = -1; ME.water = 100; ME.air = 100;
  if (G.fid !== 'lobby') { UI.introUntil = performance.now() + 9000; showIntro(); }
}

/* ---------------- my bean ---------------- */
function teleportIn() {
  if (!(ME.alive && !ME.ghost && inCabin(ME.x, ME.y, ME.z))) { ME.x = rnd(-1.4, 1.4); ME.z = rnd(-1.4, 1); ME.y = 0; }
  Object.assign(ME, { alive: true, ghost: false, rag: 0, inj: 0, stam: 100, exh: false, climb: false, carry: -1, vx: 0, vy: 0, vz: 0, air: 100, water: 100 });
  setGhost(myBean, false);
}
function ko(msg, launch) {
  if (!ME.alive) return; ME.alive = false; ME.rag = 2.4; ME.climb = false; ME.vy = launch ? 13 : 3; ME.vx = launch ? rnd(-4, 4) : ME.vx; ME.vz = launch ? rnd(-4, 4) : ME.vz;
  dropCarry(); P.stats.ko++; save(); SFX.ko(); toast(msg + ' You are a ghost until the next floor.', 'bad'); flashScreen();
}
function hurt(dmg, msg, kx = 0, kz = 0) {
  if (ME.hitCD > 0 || !ME.alive) return; ME.hitCD = 1.3; ME.inj = Math.min(100, ME.inj + dmg); ME.rag = .9; ME.climb = false;
  ME.vx = kx * 9; ME.vz = kz * 9; ME.vy = 6; dropCarry(); SFX.hurt(); flashScreen(); CAM.shake = .4;
  if (ME.inj >= 100) ko(msg); else toast(msg, 'bad');
}
function dropCarry() { if (ME.carry < 0) return; const k = ME.carry; ME.carry = -1; myAct('drop', k, ME.x + Math.sin(ME.yaw) * .9, ME.y + .1, ME.z + Math.cos(ME.yaw) * .9); SFX.drop(); }
function probeClimb() {
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw); let best = null, bd = .25;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const t = { x: ME.x + dx * .35, y: ME.y + .05, z: ME.z + dz * .35 };
    const s = SOL.find(q => !q.off && q.climb && overlaps(t, q)); if (!s) continue;
    const facing = dx * fx + dz * fz, mv = dx * ME.vx + dz * ME.vz;
    const score = Math.max(facing, mv > .5 ? .6 : -1); if (score > bd) { bd = score; best = { s, wn: [-dx, -dz] }; }
  }
  return best;
}
function climbAround(s) { // shuffle out and over an overhang (ledge, countertop, roof edge)
  const wn = ME.wn; let nx = ME.x, nz = ME.z;
  if (wn[0] === 1) nx = s.x1 + PR + .002; else if (wn[0] === -1) nx = s.x0 - PR - .002; else if (wn[1] === 1) nz = s.z1 + PR + .002; else nz = s.z0 - PR - .002;
  if (Math.hypot(nx - ME.x, nz - ME.z) > 3.2) return;
  const t = { x: nx, y: ME.y + .02, z: nz }; if (SOL.some(q => !q.off && overlaps(t, q))) return;
  ME.x = nx; ME.z = nz; ME.cw = s;
}
function playerUpdate(dt) {
  ME.hitCD = Math.max(0, ME.hitCD - dt);
  const water = !!(L && L.water);
  if (ME.ghost) {
    const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw);
    const iz = (KEYS.KeyW ? 1 : 0) - (KEYS.KeyS ? 1 : 0) + TOUCH.y, ix = (KEYS.KeyD ? 1 : 0) - (KEYS.KeyA ? 1 : 0) + TOUCH.x;
    const sp = UI.menu ? 0 : 9; ME.x += (fx * iz + rx * ix) * sp * dt; ME.z += (fz * iz + rz * ix) * sp * dt;
    ME.y = clamp(ME.y + ((KEYS.Space || TOUCH.jumpP ? 1 : 0) - (KEYS.ShiftLeft || KEYS.ShiftRight ? 1 : 0)) * sp * dt, -3, 40);
    if (iz || ix) ME.yaw = Math.atan2(fx * iz + rx * ix, fz * iz + rz * ix); ME.spd = Math.hypot(iz, ix) * 4; ME.gr = false; return;
  }
  if (!ME.alive) {
    ME.rag -= dt; ME.vy -= GRAV * dt; ME.vx *= .98; ME.vz *= .98; ME.gr = false; moveAxis(ME, 'x', ME.vx * dt); moveAxis(ME, 'z', ME.vz * dt); moveAxis(ME, 'y', ME.vy * dt);
    if (ME.gr) { ME.vx *= .8; ME.vz *= .8; }
    if (ME.rag <= 0 || ME.y < -40) { ME.ghost = true; ME.y = Math.max(ME.y, 2); setGhost(myBean, true); } return;
  }
  // input
  let ix = (KEYS.KeyD ? 1 : 0) - (KEYS.KeyA ? 1 : 0) + TOUCH.x, iz = (KEYS.KeyW ? 1 : 0) - (KEYS.KeyS ? 1 : 0) + TOUCH.y;
  if (KEYS.ArrowLeft) CAM.yaw += dt * 2.4; if (KEYS.ArrowRight) CAM.yaw -= dt * 2.4; if (KEYS.ArrowUp) iz += 1; if (KEYS.ArrowDown) iz -= 1;
  const busy = UI.menu || UI.title || ME.rag > 0; if (busy) ix = iz = 0;
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = Math.cos(CAM.yaw), rz = -Math.sin(CAM.yaw);
  let mx = fx * iz + rx * ix, mz = fz * iz + rz * ix; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const moving = ml > .1, kind = ME.carry >= 0 && L.items[ME.carry] ? L.items[ME.carry].kind : null, heavy = kind && HEAVY[kind];
  const runKey = (KEYS.ShiftLeft || KEYS.ShiftRight || TOUCH.run) && !busy;
  const sprint = runKey && moving && !ME.exh && !ME.climb;
  const jumpP = !busy && (PRESSED.Space || TOUCH.jumpP);
  let drain = 0;
  ME.rag = Math.max(0, ME.rag - dt);
  if (ME.climb) {
    const cw = ME.cw, wn = ME.wn, tx = -wn[1], tz = wn[0];
    if (jumpP) { ME.climb = false; if (!ME.exh && ME.stam > 4) { ME.vy = 7.5; ME.vx = wn[0] * 5; ME.vz = wn[1] * 5; ME.stam -= 10; SFX.jump(); } }
    else {
      const up = ME.exh ? -1.2 : iz * 3.1, lat = (mx * tx + mz * tz) * 2.4;
      drain = (moving ? 15 : 7) * (kind ? (heavy ? 2.2 : 1.6) : 1);
      ME.wall = null; ME.gr = false;
      ME.vy = up; ME.ceil = null; moveAxis(ME, 'y', up * dt); if (ME.ceil && iz > 0) climbAround(ME.ceil); const tc = { x: ME.x - ME.wn[0] * .08, y: ME.y + .08, z: ME.z - ME.wn[1] * .08 }, press = SOL.some(q => !q.off && (q.climb || q === ME.cw) && overlaps(tc, q)) ? 0 : 1.2; moveAxis(ME, 'x', (tx * lat - ME.wn[0] * press) * dt); moveAxis(ME, 'z', (tz * lat - ME.wn[1] * press) * dt);
      if (iz > 0 && ME.y > cw.y1 - 1.0) { // pull up over the top
        const ox = ME.x, oy = ME.y, oz = ME.z; ME.y = cw.y1 + .02; ME.x -= wn[0] * .95; ME.z -= wn[1] * .95;
        if (SOL.some(s => !s.off && overlaps(ME, s))) { ME.x = ox; ME.y = oy; ME.z = oz; } else { ME.climb = false; ME.vy = 0; ME.vx = ME.vz = 0; SFX.grab(); }
      }
      if (ME.climb) { // still touching a climbable wall?
        const t = { x: ME.x - ME.wn[0] * .08, y: ME.y + .08, z: ME.z - ME.wn[1] * .08 }, w = SOL.find(q => !q.off && (q.climb || q === ME.cw) && overlaps(t, q));
        if (w) ME.cw = w; else ME.climb = false;
      }
      if (ME.gr && iz < 0) ME.climb = false;
      if (ME.stam <= 0) { ME.climb = false; ME.exh = true; }
    }
    if (moving || ME.climb) ME.yaw = Math.atan2(-ME.wn[0], -ME.wn[1]);
  }
  if (!ME.climb) {
    const pc = jumpP ? probeClimb() : null;
    if (pc && ME.stam > 8 && !ME.exh) {
      ME.climb = true; ME.cw = pc.s; ME.wn = pc.wn; ME.vy = 0; ME.vx = ME.vz = 0; SFX.grab();
      if (pc.wn[0] === -1) ME.x = pc.s.x0 - PR - .002; else if (pc.wn[0] === 1) ME.x = pc.s.x1 + PR + .002; else if (pc.wn[1] === -1) ME.z = pc.s.z0 - PR - .002; else ME.z = pc.s.z1 + PR + .002;
    }
    else {
      let speed = water ? 4.4 : (sprint ? 8.6 : 5.4); if (kind) speed *= heavy ? .55 : .85; if (ME.inj > 60) speed *= .85;
      if (ME.rag > 0) speed = 0;
      const acc = ME.gr ? 14 : (water ? 6 : 4.5);
      if (ME.rag <= 0) { ME.vx = lerp(ME.vx, mx * speed, Math.min(1, dt * acc)); ME.vz = lerp(ME.vz, mz * speed, Math.min(1, dt * acc)); }
      else { ME.vx *= .97; ME.vz *= .97; }
      if (water) {
        ME.vy -= 7 * dt; if (!busy && (KEYS.Space || TOUCH.jumpP)) { ME.vy = Math.min(4.8, ME.vy + 16 * dt); drain += 5; }
        ME.vy = Math.max(ME.vy, -4.5); if (ME.y > 16 && ME.vy > 0) ME.vy = 0;
      } else {
        if (jumpP && ME.gr && !ME.exh && ME.stam > 0) { ME.vy = kind ? 7.4 : 8.7; ME.stam -= heavy ? 18 : 12; ME.noDrain = 0; SFX.jump(); }
        ME.vy -= GRAV * dt; ME.vy = Math.max(ME.vy, -40);
      }
      if (sprint) drain += 16; if (kind && moving) drain += heavy ? 6 : 2.5;
      ME.wall = null; moveAxis(ME, 'x', ME.vx * dt); moveAxis(ME, 'z', ME.vz * dt);
      const wasGr = ME.gr; ME.gr = false; ME.landV = 0; moveAxis(ME, 'y', ME.vy * dt);
      if (ME.gr && !wasGr && ME.landV > 6) {
        SFX.land(); if (!water && ME.landV > 16.5) { const dmg = Math.round((ME.landV - 16.5) * 6); ME.inj = Math.min(100, ME.inj + dmg); ME.rag = ME.landV > 21 ? 1 : 0; toast('Ouch! Fall damage.', 'bad'); flashScreen(); if (ME.inj >= 100) ko('You fell too far!'); }
      }
      if (moving && ME.rag <= 0) ME.yaw = Math.atan2(mx, mz);
    }
  }
  // spray hose (fire floor)
  ME.spray = G.fid === 'fire' && (G.ph === 'play' || G.ph === 'ret') && !busy && !ME.climb && ME.water > 0 && (MOUSE.l || KEYS.KeyF || TOUCH.spray);
  if (G.fid === 'fire' && L.hydrants) { if (L.hydrants.some(([x, z]) => Math.hypot(ME.x - x, ME.z - z) < 2.6)) ME.water = Math.min(100, ME.water + 70 * dt); }
  if (ME.spray) {
    ME.yaw = CAM.yaw + Math.PI; ME.water = Math.max(0, ME.water - 20 * dt);
    const f = G.x.f || []; L.fires.forEach(([x, y, z], i) => { if (!(f[i] > 0)) return; const dx = x - ME.x, dz = z - ME.z, dist = Math.hypot(dx, dz), dy = y - ME.y; if (dist > 7.5 || dy < -2 || dy > 4.2) return; if (Math.abs(angDiff(Math.atan2(dx, dz), ME.yaw)) < .5 || dist < 1.5) ME.hoseAcc[i] = (ME.hoseAcc[i] || 0) + 38 * dt; });
    if (Math.random() < dt * 8) SFX.spray();
  }
  ME.hoseT -= dt; if (ME.hoseT <= 0) { ME.hoseT = .2; Object.keys(ME.hoseAcc).forEach(i => { if (ME.hoseAcc[i] > .5) myAct('hose', +i, r1(ME.hoseAcc[i])); }); ME.hoseAcc = {}; }
  // stamina, PEAK style
  const inside = inCabin(ME.x, ME.y, ME.z);
  if (drain > 0) { ME.stam -= drain * dt; ME.noDrain = 0; } else ME.noDrain += dt;
  if (ME.noDrain > .6 && (ME.gr || water)) ME.stam += 30 * dt;
  if (inside) ME.inj = Math.max(0, ME.inj - 8 * dt);
  const smax = 100 - ME.inj; ME.stam = clamp(ME.stam, 0, smax);
  if (ME.stam <= 0.01) ME.exh = true; if (ME.exh && ME.stam >= Math.min(30, smax * .8)) ME.exh = false;
  // air underwater
  if (water) {
    const vent = L.vents.some(([x, z]) => Math.hypot(ME.x - x, ME.z - z) < 2.6);
    if (inside || vent) ME.air = Math.min(100, ME.air + 45 * dt); else ME.air = Math.max(0, ME.air - (3.6 + dOf() * .3) * dt);
    if (ME.air <= 0) { ME.airTick -= dt; if (ME.airTick <= 0) { ME.airTick = 1; ME.inj = Math.min(100, ME.inj + 12); SFX.hurt(); if (ME.inj >= 100) ko('You ran out of air!'); } }
  }
  // carrying
  if (ME.carry >= 0) { ME.carryT += dt; const it = G.i[ME.carry]; if (!it || ((it[3] !== 1 || it[4] !== MY_UID) && ME.carryT > 1.2)) ME.carry = -1; }
  ME.spd = Math.hypot(ME.vx, ME.vz);
  // falling out of the world / lava
  if (L && L.lavaY != null && ME.y < L.lavaY) ko('You fell in the lava!', true);
  if (ME.y < (L && L.killY != null ? L.killY : -25)) ko('You fell into the abyss!');
}
function interact() {
  if (G.ph === 'lobby' && inCabin(ME.x, ME.y, ME.z) && Math.hypot(ME.x - 1.2, ME.z + 2) < 1.7) { if (NET.isHost) { CAB.btn.position.z = -2.12; SFX.click(); myAct('start'); } else toast('Only the host can press the button.'); return; }
  if (!ME.alive || ME.ghost || ME.climb) return;
  if (ME.carry >= 0) { dropCarry(); return; }
  const k = nearestItem(); if (k >= 0) { myAct('pick', k); ME.carry = k; ME.carryT = 0; SFX.pick(); }
}
function nearestItem() {
  let best = -1, bd = 2.2; if (!(G.ph === 'play' || G.ph === 'ret')) return -1;
  G.i.forEach((it, k) => { const def = L.items[k]; if (!def || it[3] !== 0 || !CARRY_KINDS[def.kind]) return; const d = Math.hypot(it[0] - ME.x, it[2] - ME.z); if (d < bd && Math.abs(it[1] - ME.y) < 2.2) { bd = d; best = k; } });
  return best;
}
const ITEM_NAME = { box: 'box', couch: 'couch (heavy)', fuse: 'fuse', chest: 'treasure chest (heavy)', crumb: 'cookie crumb', groc: 'groceries', cash: 'cash bag', gold: 'gold bar (heavy)' };

/* ---------------- hazards (checked on my own bean) ---------------- */
function hazards() {
  if (!ME.alive || ME.ghost || inCabin(ME.x, ME.y, ME.z) || !(G.ph === 'play' || G.ph === 'ret')) return;
  for (const e of G.e) {
    const dx = ME.x - e[1], dz = ME.z - e[3], d2 = Math.hypot(dx, dz), n = d2 || 1;
    switch (e[0]) {
      case 'tire': if (d2 < 1.25 && ME.y < 1.5) hurt(25, 'A runaway tire got you!', 0, -1); break;
      case 'cart': if (d2 < 1.45 && ME.y < 1.5) hurt(22, 'Flattened by a shopping cart!', dx / n, dz / n); break;
      case 'eel': if (Math.hypot(dx, ME.y + .8 - e[2], dz) < 1.5) { SFX.bite(); hurt(30, 'The eel bit you!', dx / n, dz / n); } break;
      case 'man': if (d2 < 1.05 && ME.y < 2.2) ko('A mannequin grabbed you!'); break;
      case 'coco': if (e[5] <= 0 && e[5] > -.35 && d2 < 1.35 && Math.abs(ME.y - e[2]) < 2.2) hurt(35, 'Bonk! A coconut!', dx / n, dz / n); break;
      case 'hand': if (e[5] <= 0 && e[5] > -.3 && d2 < 2.4 && ME.y >= e[2] - .5 && ME.y - e[2] < 1.8) hurt(65, 'SMASHED by the giant!', dx / n, dz / n); break;
      case 'laser': {
        const ex = e[1] + Math.sin(e[4]) * e[5], ez = e[3] + Math.cos(e[4]) * e[5], sx = ex - e[1], sz = ez - e[3];
        const t = clamp(((ME.x - e[1]) * sx + (ME.z - e[3]) * sz) / (sx * sx + sz * sz), 0, 1), px = e[1] + sx * t, pz = e[3] + sz * t;
        const hitH = e[6] ? true : (ME.y < e[2] + .08 && ME.y + PH > e[2] - .08);
        if (t > .08 && Math.hypot(ME.x - px, ME.z - pz) < PR + .1 && hitH) hurt(35, 'Zapped by a laser!', (ME.x - px) / (Math.hypot(ME.x - px, ME.z - pz) || 1), (ME.z - pz) / (Math.hypot(ME.x - px, ME.z - pz) || 1));
        break;
      }
    }
  }
  // fire hurts if you stand in it
  if (G.fid === 'fire' && G.x.f) L.fires.forEach(([x, y, z], i) => { if (G.x.f[i] > 0 && Math.hypot(ME.x - x, ME.z - z) < 1.1 && Math.abs(ME.y - y) < 1.2) hurt(18, 'Hot hot hot!', ME.x - x, ME.z - z); });
}
function potatoEvents() {
  if (G.fid !== 'potato' || !G.x) return;
  (G.x.ko || []).forEach(([id, seq]) => { if (seq > ME.koSeq) { ME.koSeq = Math.max(ME.koSeq, seq); if (id === MY_UID) ko('The hot potato exploded on you!', true); } });
  const b = G.x.boom; if (b && b[2] > ME.boomSeq) { ME.boomSeq = b[2]; explode(b[0], .5, b[1]); }
}
function mallSight() {
  ME.sees = []; if (G.fid !== 'mall' || !ME.alive || ME.ghost) return;
  const cf = new THREE.Vector3(); camera.getWorldDirection(cf); const cp = camera.position;
  G.e.forEach((e, i) => {
    if (e[0] !== 'man') return; const dx = e[1] - cp.x, dy = 1.4 - cp.y, dz = e[3] - cp.z, d = Math.hypot(dx, dy, dz); if (d > 26) return;
    if ((dx * cf.x + dy * cf.y + dz * cf.z) / d < .72) return;
    for (let s = .8; s < d - .8; s += .6) if (insideSolid(cp.x + dx / d * s, cp.y + dy / d * s, cp.z + dz / d * s, 0)) return;
    ME.sees.push(i);
  });
}

/* ---------------- effects ---------------- */
function particle(x, y, z, vx, vy, vz, color, life, size = .12, grav = 12) {
  let p = PARTS.find(q => q.life <= 0);
  if (!p) { if (PARTS.length > 160) return; p = { m: mesh(BOX(), mat('#fff'), 0, 0, 0) }; scene.add(p.m); PARTS.push(p); }
  Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, grav }); p.m.material = mat(color); p.m.scale.setScalar(size); p.m.visible = true;
}
function tickParticles(dt) { PARTS.forEach(p => { if (p.life <= 0) return; p.life -= dt; p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.m.position.set(p.x, p.y, p.z); p.m.rotation.x += dt * 5; if (p.life <= 0) p.m.visible = false; }); }
function explode(x, y, z) { SFX.boom(); CAM.shake = Math.max(CAM.shake, Math.hypot(ME.x - x, ME.z - z) < 10 ? .8 : .3); for (let i = 0; i < 40; i++) particle(x, y + 1, z, rnd(-7, 7), rnd(3, 12), rnd(-7, 7), ['#ffb703', '#fb5607', '#6b4a2b', '#ffd166'][i % 4], rnd(.6, 1.2), rnd(.15, .35)); }
function flashScreen() { const f = $('#hurt'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }

/* ---------------- rendering ---------------- */
function beanOf(uid) { if (uid === MY_UID) return myBean; const o = OTHERS.get(uid); return o ? o.b : null; }
function updateOthers(dt) {
  const seen = new Set();
  remotePeers().forEach(p => {
    const pr = p.presence, u = pr.u; seen.add(u); let o = OTHERS.get(u);
    if (!o) { o = { b: makeBean(COLORS[pr.c | 0] || '#fff', pr.ht), x: 0, y: 0, z: 0, yaw: 0, spd: 0, name: '' }; scene.add(o.b); OTHERS.set(u, o); const pp = pr.p || [0, 0, 0]; o.x = pp[0]; o.y = pp[1]; o.z = pp[2]; }
    const pp = pr.p || [0, 0, 0, 0]; const ox = o.x, oz = o.z;
    o.x = lerp(o.x, pp[0], Math.min(1, dt * 12)); o.y = lerp(o.y, pp[1], Math.min(1, dt * 12)); o.z = lerp(o.z, pp[2], Math.min(1, dt * 12));
    o.yaw += angDiff(o.yaw, pp[3] || 0) * Math.min(1, dt * 10); o.spd = lerp(o.spd, Math.hypot(o.x - ox, o.z - oz) / Math.max(dt, .001), .2);
    o.b.position.set(o.x, o.y, o.z); o.b.rotation.y = o.yaw;
    setBeanHat(o.b, HAT_BY[pr.ht] ? pr.ht : 'none'); setBeanColor(o.b, COLORS[pr.c | 0] || '#fff', SKINS[pr.k | 0] || SKINS[0]);
    const f = pr.f | 0; setGhost(o.b, !!(f & 2));
    animBean(o.b, { spd: o.spd, air: !!(f & 32), climb: !!(f & 4), carry: pr.ca >= 0, rag: !!(f & 16) || !(f & 1) && !(f & 2), spray: !!(f & 8), dt });
    if (f & 8) sprayParticles(o.x, o.y, o.z, o.yaw);
    const nm = String(pr.n || 'Bean').slice(0, 16); if (o.name !== nm) { if (o.tag) o.b.remove(o.tag); o.tag = nameSprite(nm); o.tag.position.y = 2.75; o.b.add(o.tag); o.name = nm; }
  });
  OTHERS.forEach((o, u) => { if (!seen.has(u)) { scene.remove(o.b); OTHERS.delete(u); } });
}
function sprayParticles(x, y, z, yaw) { if (Math.random() < .6) particle(x + Math.sin(yaw) * .6, y + 1.2, z + Math.cos(yaw) * .6, Math.sin(yaw) * 11 + rnd(-1, 1), rnd(2, 4.5), Math.cos(yaw) * 11 + rnd(-1, 1), '#9ad7ff', .6, .1, 14); }
function renderItems(dt, t) {
  itemMeshes.forEach((m, k) => {
    const it = G.i[k], def = L.items[k]; if (!it) { m.visible = false; return; }
    if (it[3] === 2) { m.visible = false; return; } m.visible = true;
    if (it[3] === 1) { const b = beanOf(it[4]); if (b) { m.position.set(b.position.x, b.position.y + 2.2, b.position.z); m.rotation.y = b.rotation.y; } return; }
    m.position.x = lerp(m.position.x, it[0], Math.min(1, dt * 12)); m.position.y = lerp(m.position.y, it[1], Math.min(1, dt * 12)); m.position.z = lerp(m.position.z, it[2], Math.min(1, dt * 12));
    if (!CARRY_KINDS[def.kind]) { m.rotation.y = t * 1.6 + k; m.position.y = it[1] + Math.sin(t * 2.5 + k) * .2; }
  });
}
function renderEnts(dt, t) {
  for (let k = entMeshes.length - 1; k >= G.e.length; k--) { if (entMeshes[k]) scene.remove(entMeshes[k]); entMeshes.length = k; }
  G.e.forEach((e, k) => {
    let m = entMeshes[k]; if (!m || m.userData.type !== e[0]) { if (m) scene.remove(m); m = entModel(e[0], e); m.userData.type = e[0]; m.position.set(e[1], e[2], e[3]); scene.add(m); entMeshes[k] = m; }
    const k1 = Math.min(1, dt * 12), ox = m.position.x, oz = m.position.z;
    m.position.x = lerp(m.position.x, e[1], k1); m.position.z = lerp(m.position.z, e[3], k1);
    if (e[0] === 'laser') { m.position.y = 0; m.rotation.y += angDiff(m.rotation.y, e[4]) * k1; const l = m.userData.l, tall = e[6]; l.scale.set(.14, tall ? 3 : .14, e[5]); l.position.set(0, tall ? 1.6 : e[2], e[5] / 2); return; }
    m.position.y = lerp(m.position.y, e[2], k1); m.rotation.y += angDiff(m.rotation.y, e[4] || 0) * Math.min(1, dt * 8);
    if (e[0] === 'tire') m.userData.spin.rotation.x -= dt * 14;
    else if (e[0] === 'eel') m.children.forEach((c, i) => { if (i < 7) c.position.x = Math.sin(t * 6 - i * .8) * .25 * (i / 7); });
    else if (e[0] === 'bot') { animBean(m.userData.bean, { spd: Math.hypot(m.position.x - ox, m.position.z - oz) / Math.max(dt, .001), air: false, rag: !e[6], dt }); setGhost(m.userData.bean, !e[6] && e[2] < -1); }
    else if (e[0] === 'coco') { m.userData.c.position.y = Math.max(0, e[5]) * 10 + .45; const s = clamp(1.4 - e[5] * .5, .4, 1.4); m.userData.sh.scale.set(s, s, s); if (e[5] <= 0 && !m.userData.hit) { m.userData.hit = 1; SFX.land(); } }
    else if (e[0] === 'hand') { const a = e[5]; m.userData.h.position.y = a > 0 ? 3 + a * 5 : a > -.6 ? .45 : .45 + (-.6 - a) * 9; const s = clamp(2.6 - Math.max(0, a) * .9, 1.2, 2.6); m.userData.sh.scale.set(s, s, s); if (a <= 0 && !m.userData.hit) { m.userData.hit = 1; SFX.slam(); if (Math.hypot(ME.x - e[1], ME.z - e[3]) < 12) CAM.shake = .5; } }
  });
}
function renderPotato(t) {
  const b = G.fid === 'potato' && G.x && G.x.b; if (!b) { if (potatoMesh) potatoMesh.visible = false; return; }
  if (!potatoMesh) { potatoMesh = new THREE.Group(); const p = buildHat('potato'); p.scale.setScalar(1.3); potatoMesh.add(p); potatoMesh.add(mesh(geo('fuse', () => new THREE.CylinderGeometry(.03, .03, .4, 6)), mat('#333'), 0, .65, 0)); const sp = mesh(geo('spark', () => new THREE.SphereGeometry(.09, 8, 6)), mat('#ffd166', { emissive: '#ffaa00', emissiveIntensity: 1 }), 0, .9, 0); potatoMesh.add(sp); potatoMesh.userData.sp = sp; scene.add(potatoMesh); }
  let x, y, z; if (b[0][0] === 'b' && b[0].length < 4) { const m = entMeshes[+b[0].slice(1)]; if (!m) return; x = m.position.x; y = m.position.y; z = m.position.z; } else { const bb = beanOf(b[0]); if (!bb) return; x = bb.position.x; y = bb.position.y; z = bb.position.z; }
  potatoMesh.visible = true; const sh = b[1] < 3 ? Math.sin(t * 50) * .08 : 0; potatoMesh.position.set(x + sh, y + 2.75, z); potatoMesh.rotation.y = t * 3;
  potatoMesh.userData.sp.scale.setScalar(1 + Math.sin(t * 30) * .4); if (Math.random() < .3) particle(x, y + 3.7, z, rnd(-1, 1), rnd(1, 3), rnd(-1, 1), '#ffd166', .3, .06, 2);
  if (b[1] < 3 && Math.floor(t * 4) !== HL.tk) { HL.tk = Math.floor(t * 4); SFX.tick(); }
}
function updateCamera(dt) {
  const tx = myBean.position.x, ty = myBean.position.y + 1.7, tz = myBean.position.z;
  const wantOff = UI.title && innerWidth > innerHeight * 1.1 && innerWidth > 760;
  if (wantOff !== !!(camera.view && camera.view.enabled)) { if (wantOff) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * .2, 0, innerWidth, innerHeight); else camera.clearViewOffset(); }
  if (UI.title || UI.preview) { const a = clock * .25 + (UI.preview ? 0 : 0); const yaw = myBean.rotation.y + (UI.title ? Math.sin(a) * .6 + .5 : .35); camera.position.set(tx + Math.sin(yaw) * 4.2, ty + .3, tz + Math.cos(yaw) * 4.2); camera.lookAt(tx, ty - .15, tz); return; }
  const cp = Math.cos(CAM.pitch), dx = Math.sin(CAM.yaw) * cp, dy = Math.sin(CAM.pitch), dz = Math.cos(CAM.yaw) * cp;
  let dist = CAM.dist; for (let s = .3; s < CAM.dist; s += .2) { if (insideSolid(tx + dx * s, ty + dy * s, tz + dz * s, .15)) { dist = Math.max(.6, s - .25); break; } }
  camera.position.set(tx + dx * dist, ty + dy * dist, tz + dz * dist);
  if (CAM.shake > 0) { CAM.shake = Math.max(0, CAM.shake - dt); camera.position.x += rnd(-1, 1) * CAM.shake * .3; camera.position.y += rnd(-1, 1) * CAM.shake * .3; }
  if (G.ph === 'ride' && inCabin(tx, ty - 1.5, tz)) camera.position.y += Math.sin(clock * 40) * .015;
  camera.lookAt(tx, ty, tz);
  sun.position.set(tx + 12, ty + 22, tz + 8); sun.target.position.set(tx, ty, tz);
}
function doorsAndDisplay(dt) {
  let tgt = 1; if (G.ph === 'ride' || G.ph === 'over') tgt = 0; else if (G.ph === 'ret' && G.t < 3) tgt = 0;
  const sp = G.ph === 'ret' ? .34 : .9; const o = CAB.open; const n = o < tgt ? Math.min(tgt, o + dt * sp) : Math.max(tgt, o - dt * sp);
  if (n !== o && (o === 1 || o === 0)) SFX.door(); if (n === 1 && o < 1 && G.ph === 'play') SFX.ding(); setDoors(n);
  CAB.btn.position.z = lerp(CAB.btn.position.z, -2.08, dt * 5);
  let txt = G.fl ? String(G.fl) : 'L'; if (G.ph === 'ride') txt = (G.t > G.tot / 2 && G.fl > 1) ? String(G.fl - 1) : (G.t > G.tot / 2 ? 'L' : String(G.fl)); if (G.ph === 'over') txt = '--';
  drawDisplay(txt, G.ph === 'ride' ? 1 : 0);
}
function renderMe(dt) {
  myBean.position.set(ME.x, ME.y, ME.z); myBean.rotation.y += angDiff(myBean.rotation.y, ME.yaw) * Math.min(1, dt * 14);
  setBeanHat(myBean, P.hat); setBeanColor(myBean, COLORS[P.color], SKINS[P.skin]);
  animBean(myBean, { spd: ME.ghost ? 0 : ME.spd, air: !ME.gr && !ME.climb && !ME.ghost, climb: ME.climb, carry: ME.carry >= 0, rag: !ME.ghost && (ME.rag > 0 && !ME.gr ? true : ME.rag > .2 || !ME.alive), spray: ME.spray, dt });
  if (ME.spray) sprayParticles(ME.x, ME.y, ME.z, ME.yaw);
  // flashlight in the dark mall
  if (L && L.dark && ME.alive) { const cf = new THREE.Vector3(); camera.getWorldDirection(cf); flash.intensity = 2.4; flash.position.set(ME.x, ME.y + 1.6, ME.z); flash.target.position.set(ME.x + cf.x * 10, ME.y + 1.4 + cf.y * 10, ME.z + cf.z * 10); }
  else flash.intensity = 0;
}

/* ---------------- HUD ---------------- */
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
let hudKey = '';
function hud() {
  const F = FL[G.fid] || FL.lobby;
  let led = G.fl ? String(G.fl) : 'L', name = F.name, goal = '', time = '';
  if (G.ph === 'lobby') { name = 'Lobby'; goal = NET.isHost ? 'Walk into the elevator and press the big red button (E) to start' : 'Waiting for the host to press the button'; }
  else if (G.ph === 'ride') { name = 'Going up...'; goal = 'Floor ' + G.fl + ' coming up'; }
  else if (G.ph === 'play') { goal = F.goal ? F.goal(G) : ''; time = fmt(G.t); }
  else if (G.ph === 'ret') { goal = (G.done ? 'FLOOR CLEARED! ' : "TIME'S UP! ") + 'Get in the elevator before the doors close!'; time = fmt(G.t); }
  else if (G.ph === 'over') { name = 'Out of order'; goal = 'The elevator broke down'; }
  $('#led').textContent = led; $('#flName').textContent = name; $('#flGoal').textContent = goal; $('#flTime').textContent = time;
  $('#flTime').classList.toggle('urgent', (G.ph === 'ret' || G.ph === 'play') && G.t < 10);
  $('#hearts').innerHTML = G.ph === 'lobby' ? '' : Array.from({ length: 3 }, (_, i) => `<span class="ht${i < G.hz ? '' : ' off'}">♥</span>`).join('');
  $('#codeTag').hidden = NET.solo; if (!NET.solo) $('#codeTxt').textContent = NET.code;
  // stamina bar
  const smax = 100 - ME.inj; $('#stamFill').style.width = clamp(ME.stam, 0, 100) + '%'; $('#stamInj').style.width = ME.inj + '%';
  $('#stam').classList.toggle('exh', ME.exh); $('#stam').classList.toggle('low', ME.stam < 25);
  $('#stam').hidden = ME.ghost || !ME.alive;
  $('#airBar').hidden = !(L && L.water) || ME.ghost; $('#airFill').style.width = ME.air + '%';
  $('#waterBar').hidden = G.fid !== 'fire' || ME.ghost; $('#waterFill').style.width = ME.water + '%';
  $('#ghostTag').hidden = !ME.ghost;
  // prompt
  let pr = '';
  if (!UI.title && !UI.menu) {
    if (G.ph === 'lobby' && inCabin(ME.x, ME.y, ME.z) && Math.hypot(ME.x - 1.2, ME.z + 2) < 1.7) pr = NET.isHost ? 'E  Start the elevator' : 'Only the host can start';
    else if (ME.alive && !ME.ghost && ME.carry < 0) { const k = nearestItem(); if (k >= 0) pr = 'E  Pick up ' + (ITEM_NAME[L.items[k].kind] || 'item'); }
    else if (ME.carry >= 0) pr = 'E  Drop';
    if (!pr && ME.alive && !ME.climb && !ME.ghost && probeClimbHint()) pr = 'SPACE  Grab the wall';
    if (ME.climb) pr = 'W/S  Climb   SPACE  Leap off';
    if (G.fid === 'fire' && ME.water <= 0 && !pr) pr = 'Out of water! Refill at a red hydrant';
    if (L && L.water && ME.air < 30 && !pr) pr = 'Low air! Get to a bubble vent or the elevator';
  }
  if (TOUCH.on) pr = pr.replace(/^E /, 'GRAB').replace(/^SPACE /, 'JUMP').replace(/W\/S/, 'Stick').replace('SPACE', 'JUMP');
  $('#prompt').textContent = pr; $('#prompt').hidden = !pr;
  $('#tSpray').hidden = G.fid !== 'fire';
  // player list
  const rows = [{ n: P.name, c: P.color, ht: P.hat, al: ME.alive, gh: ME.ghost, me: 1, host: NET.isHost }];
  remotePeers().forEach(p => { const q = p.presence; rows.push({ n: q.n, c: q.c, ht: q.ht, al: q.f & 1, gh: q.f & 2, host: q.h }); });
  const key = JSON.stringify(rows); if (key !== hudKey) { hudKey = key;
    $('#plist').innerHTML = rows.map(r => `<li class="${r.gh || !r.al ? 'dead' : ''}"><i style="background:${COLORS[r.c | 0] || '#fff'}"></i><b></b><small>${r.gh ? 'ghost' : (HAT_BY[r.ht] || HAT_BY.none).name}${r.host ? ' · host' : ''}</small></li>`).join('');
    [...$('#plist').querySelectorAll('b')].forEach((b, i) => b.textContent = String(rows[i].n || 'Bean').slice(0, 16) + (rows[i].me ? ' (you)' : ''));
  }
  $('#intro').hidden = !(performance.now() < UI.introUntil && (G.ph === 'ride' || G.ph === 'play'));
  if (G.ph === 'play' && G.t < G.tot - 5 && performance.now() < UI.introUntil) UI.introUntil = 0;
}
function probeClimbHint() { const pc = probeClimb(); return pc && ME.stam > 8; }
function showIntro() {
  const F = FL[G.fid]; if (!F || !F.hat) return; const h = HAT_BY[F.hat];
  $('#inNum').textContent = 'FLOOR ' + G.fl; $('#inName').textContent = F.name; $('#inBlurb').textContent = F.blurb;
  $('#inHat').textContent = 'Survive it to earn the ' + h.name + (P.hats[F.hat] ? ' (you already have it)' : '');
}
let toastT = 0;
function toast(msg, cls) { const d = document.createElement('div'); d.className = 'toast' + (cls ? ' ' + cls : ''); d.textContent = msg; $('#toasts').appendChild(d); setTimeout(() => d.classList.add('out'), 3200); setTimeout(() => d.remove(), 3700); while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove(); }

/* ---------------- rewards + game over (my own save) ---------------- */
function onRid() {
  if (G.rid === ME.lastRid) return; const first = ME.lastRid === -1; ME.lastRid = G.rid;
  if (first && G.ph !== 'lobby') { ME.ghost = true; ME.alive = false; setGhost(myBean, true); ME.x = 0; ME.y = 2; ME.z = 6; return; } // joined mid-floor
  if (G.ph === 'ride' || G.ph === 'lobby') teleportIn();
  const rw = G.rw;
  if (rw && rw.rid === G.rid && rw.u.includes(MY_UID)) {
    P.stats.floors++; P.stats.best = Math.max(P.stats.best, rw.fl);
    if (rw.h) { P.beat[rw.fid] = (P.beat[rw.fid] || 0) + 1; awardHat(rw.h); }
    if (rw.fl >= 10) awardHat('crown');
    save();
  } else if (rw && rw.rid === G.rid && G.ph === 'ride') toast("You didn't make it back in time. No hat this floor.", 'bad');
  if (G.ph === 'over' && G.ov && UI.overShown !== G.rid) { UI.overShown = G.rid; P.stats.best = Math.max(P.stats.best, G.ov.fl - 1); save(); showOver(); }
  if (G.ph === 'lobby') { $('#over').hidden = true; }
}
function awardHat(id) {
  const h = HAT_BY[id]; if (!h) return;
  if (P.hats[id]) { toast('Floor survived! (You already own the ' + h.name + ')'); return; }
  P.hats[id] = 1; P.stats.hats = Object.keys(P.hats).length - 2; save(); SFX.hat();
  $('#hcName').textContent = h.name; $('#hatCard').hidden = false; $('#hatCard').dataset.id = id;
  clearTimeout(HL.hcT); HL.hcT = setTimeout(() => $('#hatCard').hidden = true, 7000);
}
function showOver() {
  SFX.lose(); const o = G.ov || { fl: G.fl };
  $('#ovFloor').textContent = Math.max(0, o.fl - 1); $('#ovWhy').textContent = o.why || ''; $('#ovBest').textContent = P.stats.best; $('#over').hidden = false;
  setTimeout(() => $('#over').hidden = true, 6800);
}

/* ---------------- menus ---------------- */
function openMenu(id) { closeMenus(); UI.menu = id; $('#' + id).hidden = false; if (document.pointerLockElement) document.exitPointerLock(); if (id === 'ward') { UI.preview = true; renderWard(); } if (id === 'settings') renderSettings(); }
function closeMenus() { ['ward', 'settings', 'pause', 'help'].forEach(id => $('#' + id).hidden = true); UI.menu = null; UI.preview = false; if (UI.title) $('#title').hidden = false; }
function togglePause() { if (UI.menu) { closeMenus(); if (UI.title) $('#title').hidden = false; return; } openMenu('pause'); }
function renderWard() {
  $('#nameIn').value = P.name;
  $('#skins').innerHTML = SKINS.map((c, i) => `<button class="sw${i === P.skin ? ' on' : ''}" style="background:${c}" data-i="${i}" aria-label="${SKIN_NAMES[i]} skin" title="${SKIN_NAMES[i]}"></button>`).join('');
  $('#swatches').innerHTML = COLORS.map((c, i) => `<button class="sw${i === P.color ? ' on' : ''}" style="background:${c}" data-i="${i}" aria-label="Bean color ${i + 1}"></button>`).join('');
  $('#hatGrid').innerHTML = HATS.map(h => `<button class="hat${P.hats[h.id] ? '' : ' locked'}${P.hat === h.id ? ' on' : ''}" data-id="${h.id}"><b>${P.hats[h.id] ? h.name : '???'}</b><small>${P.hats[h.id] ? (P.hat === h.id ? 'Wearing' : 'Tap to wear') : h.how}</small></button>`).join('');
  const s = P.stats; $('#stats').innerHTML = `<div><b>${s.best}</b><small>best floor</small></div><div><b>${s.floors}</b><small>floors survived</small></div><div><b>${Object.keys(P.hats).length - 1}/${HATS.length - 1}</b><small>hats</small></div><div><b>${s.runs}</b><small>runs</small></div><div><b>${s.ko}</b><small>times KO'd</small></div>`;
}
function renderSettings() {
  $('#sens').value = P.sens; $('#vol').value = P.vol; $('#inv').checked = !!P.invert; $('#gfx').value = P.gfx; $('#saveOut').value = ''; $('#saveMsg').textContent = '';
}
function wireMenus() {
  const go = async (mode) => {
    audioInit(); $('#titleErr').textContent = '';
    if (mode === 'join') { const code = $('#joinIn').value.trim(); if (!code) { $('#titleErr').textContent = 'Type the 4-letter code from the host first.'; return; } }
    $('#busy').hidden = false; $('#busyTxt').textContent = mode === 'host' ? 'Opening a lobby...' : mode === 'join' ? 'Joining...' : 'Starting...';
    try {
      await netLeave(); G = newG(); ME.lastRid = -1; HL.bag = [];
      if (mode === 'host') await netHost(); else if (mode === 'join') await netJoin($('#joinIn').value);
      syncFloor(); teleportIn(); onRid();
      UI.title = false; $('#title').hidden = true; $('#hud').hidden = false; CAM.yaw = Math.PI; CAM.pitch = .3;
      if (!P.seenHelp) { P.seenHelp = 1; save(); openMenu('help'); }
      if (mode === 'host') toast('Lobby open! Share the code ' + NET.code + ' with up to 4 friends.');
      if (mode === 'cont' && P.run) { startRunFrom(P.run.fl); }
    } catch (e) { $('#titleErr').textContent = e.message || String(e); await netLeave(); }
    $('#busy').hidden = true;
  };
  $('#bSolo').onclick = () => go('solo'); $('#bHost').onclick = () => go('host'); $('#bJoin').onclick = () => go('join');
  $('#bCont').onclick = () => go('cont');
  $('#joinIn').addEventListener('keydown', e => { if (e.key === 'Enter') go('join'); });
  $('#bWard').onclick = () => { $('#title').hidden = true; openMenu('ward'); };
  $('#bSet').onclick = () => { $('#title').hidden = true; openMenu('settings'); };
  $('#bHelp').onclick = () => { $('#title').hidden = true; openMenu('help'); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { closeMenus(); SFX.click(); });
  $('#pResume').onclick = () => closeMenus(); $('#pWard').onclick = () => openMenu('ward'); $('#pSet').onclick = () => openMenu('settings'); $('#pHelp').onclick = () => openMenu('help');
  $('#pLeave').onclick = () => leaveToTitle();
  $('#swatches').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; P.color = +b.dataset.i; save(); renderWard(); SFX.click(); };
  $('#skins').onclick = e => { const b = e.target.closest('.sw'); if (!b) return; P.skin = +b.dataset.i; save(); renderWard(); SFX.click(); };
  $('#hatGrid').onclick = e => { const b = e.target.closest('.hat'); if (!b) return; const id = b.dataset.id; if (!P.hats[id]) { toast(HAT_BY[id].how + ' to unlock this hat.'); return; } P.hat = id; save(); renderWard(); SFX.click(); };
  $('#nameIn').addEventListener('input', () => { P.name = $('#nameIn').value.replace(/[^\w .'-]/g, '').slice(0, 16) || 'Bean'; save(); });
  $('#sens').oninput = () => { P.sens = +$('#sens').value; save(); };
  $('#vol').oninput = () => { setVol(+$('#vol').value); save(); };
  $('#inv').onchange = () => { P.invert = $('#inv').checked ? 1 : 0; save(); };
  $('#gfx').onchange = () => { P.gfx = +$('#gfx').value; save(); renderer.shadowMap.enabled = P.gfx > 0; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); $('#saveMsg').textContent = 'Graphics updated. Reload for the full change.'; };
  $('#bExport').onclick = () => { const code = exportSave(); $('#saveOut').value = code; $('#saveOut').select(); try { navigator.clipboard.writeText(code).then(() => $('#saveMsg').textContent = 'Save code copied. Paste it on another device to bring your hats along.', () => $('#saveMsg').textContent = 'Select the code above and copy it.'); } catch (e) { $('#saveMsg').textContent = 'Select the code above and copy it.'; } };
  $('#bImport').onclick = () => { try { importSave($('#saveOut').value); $('#saveMsg').textContent = 'Save loaded! Welcome back, ' + P.name + '.'; renderSettings(); syncTitle(); } catch (e) { $('#saveMsg').textContent = e.message; } };
  let resetArm = 0; $('#bReset').onclick = () => { if (!resetArm) { resetArm = 1; $('#bReset').textContent = 'Tap again to erase everything'; setTimeout(() => { resetArm = 0; $('#bReset').textContent = 'Erase save'; }, 3000); return; } P = defProfile(); save(); resetArm = 0; $('#bReset').textContent = 'Erase save'; $('#saveMsg').textContent = 'Save erased.'; syncTitle(); };
  $('#hcWear').onclick = () => { P.hat = $('#hatCard').dataset.id; save(); $('#hatCard').hidden = true; SFX.click(); };
  $('#codeTag').onclick = () => { try { navigator.clipboard.writeText(NET.code).then(() => toast('Lobby code copied: ' + NET.code), () => toast('Lobby code: ' + NET.code)); } catch (e) { toast('Lobby code: ' + NET.code); } };
}
function startRunFrom(fl) { if (NET.isHost && G.ph === 'lobby') { startRun(fl); } }
function titlePose() { ME.x = 0; ME.y = 0; ME.z = 7; ME.yaw = 0; myBean && (myBean.rotation.y = 0); }
async function leaveToTitle() { await netLeave(); G = newG(); ME.lastRid = -1; syncFloor(); teleportIn(); onRid(); titlePose(); closeMenus(); UI.title = true; $('#title').hidden = false; $('#hud').hidden = true; syncTitle(); }
function onNetLost(msg) { if (NET.solo) return; leaveToTitle().then(() => { $('#titleErr').textContent = msg; }); }
function syncTitle() {
  $('#ver').textContent = 'V' + VER; $('#bCont').hidden = !P.run; if (P.run) $('#bCont').textContent = 'Continue run · Floor ' + P.run.fl;
  $('#titleBest').textContent = P.stats.best ? 'Best floor: ' + P.stats.best + ' · Hats: ' + (Object.keys(P.hats).length - 1) + '/' + (HATS.length - 1) : 'Survive floors, collect hats.';
}

/* ---------------- main loop ---------------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, Math.max(0, (now - lastT) / 1000) || .016); lastT = now; clock += dt;
  try { step(dt); } catch (e) { console.error(e); }
  PRESSED = {}; TOUCH.jumpP = 0; TOUCH.grabP = 0;
}
function step(dt) {
  netTick(dt);
  if (NET.isHost) hostTick(dt); else G.tt = (G.tt || 0) + dt;
  syncFloor(); onRid();
  if ((PRESSED.KeyE || TOUCH.grabP) && !UI.menu && !UI.title) interact();
  playerUpdate(dt); hazards(); potatoEvents();
  const F = FL[G.fid]; if (F && F.client && L) F.client(dt, clock);
  doorsAndDisplay(dt); renderMe(dt); updateOthers(dt); renderItems(dt, clock); renderEnts(dt, clock); renderPotato(clock); tickParticles(dt);
  updateCamera(dt); mallSight();
  if (!UI.title) hud();
  renderer.render(scene, camera);
}
function boot() {
  try { initScene(); } catch (e) { $('#busy').hidden = false; $('#busyTxt').textContent = "Your browser couldn't start 3D graphics (WebGL). Try another browser or turn on hardware acceleration."; return; }
  myBean = makeBean(COLORS[P.color], P.hat); scene.add(myBean);
  initInput(); wireMenus(); syncTitle();
  syncFloor(); teleportIn(); titlePose();
  requestAnimationFrame(t => { lastT = t; frame(t); });
  if ('serviceWorker' in navigator && !IN_CLAUDE && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
}
if (window.THREE) boot(); else { $('#busy').hidden = false; $('#busyTxt').textContent = "Couldn't load the 3D engine. Check your internet connection and reload."; }
