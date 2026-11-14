'use strict';
/* bots: TV-head teammates so you can play alone (or fill up a lobby). The host runs them. */
const BOTS = [], BOTV = [];
const BOT_NAMES = ['Static Steve', 'Remote Randy', 'Channel 5', 'Antenna Annie', 'Pixel Pete', 'Glitchy', 'Couch Potato', 'Rewind Rita'];
const BOT_FACES = [['smile', '#ffffff', '#123044'], ['wow', '#ffe14a', '#2a1036'], ['cool', '#5ee36a', '#0b0b0b'], ['uwu', '#ff5ec4', '#20202a'], ['happy', '#2fd3c5', '#103a22'], ['what', '#ff9a2e', '#0b0b0b'], ['sus', '#ffffff', '#3a1010'], ['heart', '#ff3b3b', '#1a1a2a']];
const BOT_COLORS = ['#e8a020', '#3ac06a', '#8a5cff', '#e84a3a', '#2fc3d3', '#d83a7a', '#f0f0f0', '#4a7ad8'];
const LINES = {
  idle: ['anyone else hear that', 'this place gives me the creeps', 'I think I saw something', 'my antenna is tingling', 'stay close guys', 'is my face on straight?', 'we need more views', 'lol', 'who farted', 'I miss the couch'],
  scared: ['RUN', 'AAAAAAA', 'NOPE NOPE NOPE', 'GET THE CAMERA ON IT', 'BEHIND YOU', 'IT SAW ME', 'mommy', 'why is it so FAST'],
  surf: ['ready when you are', 'pull the lever!', 'I call shotgun in the bell', 'did we make quota?', 'nice couch', 'upload the footage!!'],
  reply: ['fr', 'true', 'lmao', 'ok', 'say less', 'I agree with whatever that was', 'huh?', 'bro what', 'W', 'no u'],
  back: ['wait for meeee', 'NOOO the bell', 'guys?? GUYS??'],
};
const botList = () => NET.isHost ? BOTS : BOTV;
function botFaceUrl(i) { const f = BOT_FACES[i % BOT_FACES.length]; return presetFace(f[0], f[1], f[2]); }
function makeBotModel(b) { const M = makeTV(hexI(b.color), b.faceUrl); const tag = textSprite(b.name + ' 🤖', '#d8f0ff', null, 0.28); tag.position.y = 2.45; M.g.add(tag); W.s.add(M.g); return M; }
function clearBots() { BOTS.forEach(b => W.s.remove(b.M.g)); BOTS.length = 0; BOTV.forEach(b => W.s.remove(b.M.g)); BOTV.length = 0; }
function spawnBots(n) {
  clearBots();
  for (let i = 0; i < n; i++) {
    const b = { id: 'bot:' + i, i, name: BOT_NAMES[i], color: BOT_COLORS[i], faceUrl: botFaceUrl(i), x: rnd(-6, 6), z: rnd(-12, -6), y: 0, vy: 0, yaw: rnd(0, 6), hp: 100, alive: true, area: 'surf', grabBy: null, kx: 0, kz: 0, noise: 1, carry: [], path: null, pathT: 0, goal: null, wt: 0, w: null, think: 0, flee: null, sayT: rnd(8, 20), say: '', sayN: 0, spd: 0 };
    b.M = makeBotModel(b); BOTS.push(b);
  }
}
function botState(b) { return [b.id, b.name, b.color, b.i, +b.x.toFixed(2), +b.z.toFixed(2), +b.y.toFixed(2), +b.yaw.toFixed(2), b.area, b.alive ? 1 : 0, b.grabBy ? 1 : 0, b.sayN, b.say]; }
function botSay(b, text, chat) {
  b.say = text; b.sayN++; showBubble(b, text); if (chat) netEvent({ t: 'chat', n: b.name + ' 🤖', c: b.color, text });
}
function showBubble(b, text) { if (b.bub) b.M.g.remove(b.bub); b.bub = textSprite(text.length > 34 ? text.slice(0, 32) + '…' : text, '#111', 'rgba(255,255,255,.92)', 0.26); b.bub.position.y = 2.85; b.M.g.add(b.bub); b.bubT = 4; }
function botsHear(text, from) {
  const t = text.toLowerCase(); const named = BOTS.find(b => t.includes(b.name.toLowerCase().split(' ')[0].toLowerCase()));
  const b = named || (Math.random() < 0.35 ? pick(BOTS) : null); if (!b || !b.alive) return;
  setTimeout(() => { if (b.alive) botSay(b, /\?$/.test(t) ? pick(['yes', 'no', 'maybe', 'idk ask the parrot', 'definitely', 'absolutely not']) : pick(LINES.reply), true); }, rnd(800, 2000));
}

/* ---------------- host bot brain ---------------- */
function botGo(b, tx, tz, spd, dt) {
  if (b.area === 'surf') { const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz); if (d < 0.3) { b.spd = 0; return false; } b.yaw += angDiff(b.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 8); b.x += dx / d * spd * dt; b.z += dz / d * spd * dt; b.spd = spd; collide('surf', b, 0.32); return true; }
  b.pathT -= dt;
  if (!b.path || b.pathT <= 0 || !b.goal || Math.hypot(b.goal.x - tx, b.goal.z - tz) > 1.5) { b.path = findPath(b.x, b.z, tx, tz); b.pathT = 0.8 + Math.random() * 0.4; b.goal = { x: tx, z: tz }; }
  if (!b.path || !b.path.length) { b.spd = 0; return false; }
  const p = b.path[0], dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
  if (d < 0.35) { b.path.shift(); return b.path.length > 0; }
  b.yaw += angDiff(b.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 8);
  b.x += dx / d * spd * dt; b.z += dz / d * spd * dt; b.spd = spd; collide('sig', b, 0.32); return true;
}
function hostBots(dt) {
  BOTS.forEach(b => {
    if (b.bubT > 0) { b.bubT -= dt; if (b.bubT <= 0 && b.bub) { b.M.g.remove(b.bub); b.bub = null; } }
    b.spd = 0; b.noise = 1;
    if (!b.alive) { botAnim(b, dt); return; }
    if (b.grabBy) { const m = MON.get(b.grabBy); if (!m) b.grabBy = null; else { const gp = grabPoint(m); b.x = gp.x; b.z = gp.z; b.y = gp.y; botAnim(b, dt); return; } }
    // knockback + gravity
    const kd = Math.exp(-dt * 4); b.kx *= kd; b.kz *= kd; const fast = Math.hypot(b.kx, b.kz);
    b.x += b.kx * dt; b.z += b.kz * dt; b.vy -= 16 * dt; b.y = Math.max(0, b.y + b.vy * dt); if (b.y <= 0) b.vy = 0;
    if (fast > 0.5) { const hit = collide(b.area, b, 0.32); if (hit && b.thrown && fast > 7) { b.thrown = false; b.kx = b.kz = 0; botHurt(b, 18, 0, 0, 0, 'a wall', false); } }
    if (!b.alive) return;
    if (G.mode !== 'play') { botSurf(b, dt); botAnim(b, dt); return; }
    if (b.area === 'surf') botSurf(b, dt); else botSig(b, dt);
    b.sayT -= dt; if (b.sayT <= 0) { b.sayT = rnd(14, 30); botSay(b, pick(b.area === 'sig' ? LINES.idle : LINES.surf)); }
    botAnim(b, dt);
  });
}
function botAnim(b, dt) {
  b.M.g.position.set(b.x, b.y, b.z); b.M.g.rotation.y = b.yaw; b.M.g.visible = G.mode !== 'play' ? b.area === 'surf' : b.area === P.area;
  animTV(b.M, b.spd, dt, { dead: !b.alive, grab: !!b.grabBy, cam: b.area === 'sig' && b.alive, rec: b.area === 'sig' && b.alive, pitch: 0 });
}
const SURF_SPOTS = [[0, -9.5], [-3, -12], [4, -9], [-6, -7], [6, 0], [-8, 4], [8, 6], [0, 4], [-12, -2], [12, -6], [3, -13]];
function botSurf(b, dt) {
  if (G.mode === 'play' && G.lever > 0 && G.leverSide === 'surf') {
    const inHouse = b.z < -3.6 && Math.abs(b.x) < 9;
    if (inHouse && Math.abs(b.x) > 0.8) botGo(b, 0, -5, 4.2, dt);
    else if (inHouse) botGo(b, 0, -2.5, 4.2, dt);
    else botGo(b, SURF.bell.x + Math.cos(b.i * 2) * 1.1, SURF.bell.z + Math.sin(b.i * 2) * 1.1, 4.2, dt);
    return;
  }
  b.wt -= dt;
  if (!b.w || b.wt <= 0) { b.w = pick(SURF_SPOTS); b.wt = rnd(5, 12); }
  const [tx, tz] = b.w, inHouse = b.z < -3.6 && Math.abs(b.x) < 9, tIn = tz < -4;
  if (inHouse !== tIn && Math.abs(b.x) > 0.9 && Math.abs(b.z + 4) < 3) botGo(b, 0, b.z, 2, dt);
  else if (inHouse !== tIn) botGo(b, 0, tIn ? -6 : -1.5, 2, dt);
  else botGo(b, tx, tz, 2, dt);
}
function botSig(b, dt) {
  if (G.lever > 0 && G.leverSide === 'sig') { botGo(b, MAP.bell.x + Math.cos(b.i * 2) * 0.9, MAP.bell.z + Math.sin(b.i * 2) * 0.9, 5.5, dt); b.noise = 2; return; }
  b.think -= dt;
  if (b.think <= 0) {
    b.think = 0.3;
    let danger = null, dd = 1e9;
    MON.forEach(m => { const d = Math.hypot(m.x - b.x, m.z - b.z); const scary = MDEF[m.type].atk.includes(m.st) || m.type === 'jerry' && d < 2.5 || m.type === 'sniff'; if (scary && d < (m.type === 'sniff' ? 14 : 8) && d < dd && !(m.type === 'computer' && m.st === 'hide')) { dd = d; danger = m; } });
    if (danger && (!b.flee || b.fleeT <= 0)) {
      let best = null, bs = -1; for (let k = 0; k < 12; k++) { const s = pick(MAP.spots); const dm = Math.hypot(s.x - danger.x, s.z - danger.z), db = Math.hypot(s.x - b.x, s.z - b.z); if (db < 16 && dm - db * 0.3 > bs) { bs = dm - db * 0.3; best = s; } }
      b.flee = best; b.fleeT = 2.5; if (Math.random() < 0.3) botSay(b, pick(LINES.scared));
    }
    // leader = nearest alive real player in the signal world
    let lead = null, ld = 1e9; ACT.forEach(a => { if (a.bot || !a.alive) return; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < ld) { ld = d; lead = a; } });
    b.lead = lead;
    if (!lead && MAP.artifacts.length && !b.art) { let ba = null, bd = 12; MAP.artifacts.forEach(t => { const d = Math.hypot(t.x - b.x, t.z - b.z); if (d < bd) { bd = d; ba = t; } }); b.art = ba; }
  }
  if (b.fleeT > 0) { b.fleeT -= dt; if (b.flee) { botGo(b, b.flee.x, b.flee.z, 5.6, dt); b.noise = 2; return; } }
  if (b.art) { if (!MAP.artifacts.includes(b.art)) b.art = null; else { botGo(b, b.art.x, b.art.z, 3.4, dt); if (Math.hypot(b.art.x - b.x, b.art.z - b.z) < 1.1) { if (b.carry.length < 3) netEvent({ t: 'pick', id: b.art.id, by: b.id }); b.art = null; } return; } }
  const L = b.lead;
  if (L) {
    const d = Math.hypot(L.x - b.x, L.z - b.z);
    if (d > 4.5) { const off = b.i * 1.3; botGo(b, L.x + Math.cos(off) * 1.8, L.z + Math.sin(off) * 1.8, d > 10 ? 5.2 : 3.6, dt); if (d > 10) b.noise = 2; }
    else { b.yaw += angDiff(b.yaw, Math.atan2(-(L.x - b.x), -(L.z - b.z)) + Math.sin(W.t * 0.5 + b.i) * 1.5) * Math.min(1, dt * 2); b.noise = 0; }
  } else {
    b.wt -= dt; if (!b.w || b.wt <= 0) { const s = randomSpot(); b.w = [s.x, s.z]; b.wt = rnd(6, 12); }
    if (!botGo(b, b.w[0], b.w[1], 2.6, dt)) b.wt = 0;
  }
}
function botHurt(b, dmg, kx, kz, ky, cause, thrown) {
  if (!b.alive) return; b.kx = kx || 0; b.kz = kz || 0; if (ky) b.vy = ky; b.thrown = !!thrown;
  if (dmg > 0) { b.hp -= dmg; if (b.hp > 0 && Math.random() < 0.5) botSay(b, pick(['OW', 'ouch!!', 'that HURT', 'medic!', 'I\'m fine I\'m fine'])); }
  if (b.hp <= 0) {
    b.alive = false; b.hp = 0; b.grabBy = null; b.carry = [];
    sysChat('☠ ' + b.name + ' 🤖 was killed by ' + cause, '#ff8080');
    if (/hijack/i.test(cause || '') && G.phase === 'dive') setTimeout(() => { if (G.phase === 'dive') { spawnMon('hijack', b.x, b.z, b.faceUrl); sysChat('🦠 ' + b.name + ' got infected… they are a HIJACK now', '#ff3b3b'); } }, 1500);
  }
}
function botToSig(b) { b.area = 'sig'; b.x = MAP.bell.x + rnd(-1, 1); b.z = MAP.bell.z + rnd(-0.6, 1); b.y = 0; b.path = null; b.w = null; b.art = null; b.carry = []; b.kx = b.kz = 0; b.grabBy = null; b.yaw = Math.PI; }
function botToSurf(b, made) {
  if (b.area !== 'sig') return;
  if (made && b.alive) { if (b.carry.length) { const v = b.carry.reduce((s, t) => s + ARTIFACTS[t].v, 0); G.money += v; netEvent({ t: 'toast', text: '💰 ' + b.name + ' sold ' + b.carry.length + ' artifact(s) for $' + v }); pushGame(); } b.x = SURF.bell.x + rnd(-1.5, 1.5); b.z = SURF.bell.z + rnd(-1.5, 1.5); }
  else { if (b.alive) botSay(b, pick(LINES.back), true); b.x = rnd(-5, 5); b.z = rnd(-12, -7); }
  b.area = 'surf'; b.alive = true; b.hp = 100; b.grabBy = null; b.carry = []; b.y = 0; b.w = null;
}

/* ---------------- client: bots seen from the host ---------------- */
function syncBotViews(list) {
  const seen = new Set();
  list.forEach(([id, name, color, i, x, z, y, yw, ar, al, gr, sayN, say]) => {
    seen.add(id); let v = BOTV.find(q => q.id === id);
    if (!v) { v = { id, name, color, i, faceUrl: botFaceUrl(i), x, z, y, yaw: yw, sayN: 0 }; v.M = makeBotModel(v); BOTV.push(v); }
    Object.assign(v, { tx: x, tz: z, ty: y, tyw: yw, area: ar, alive: !!al, gr: !!gr });
    if (sayN !== v.sayN) { v.sayN = sayN; if (say) showBubble(v, say); }
  });
  for (let k = BOTV.length - 1; k >= 0; k--) if (!seen.has(BOTV[k].id)) { W.s.remove(BOTV[k].M.g); BOTV.splice(k, 1); }
}
function updateBotViews(dt) {
  BOTV.forEach(v => {
    const k = Math.min(1, dt * 12), ox = v.x, oz = v.z; if (Math.hypot(v.tx - v.x, v.tz - v.z) > 20) { v.x = v.tx; v.z = v.tz; }
    v.x += (v.tx - v.x) * k; v.z += (v.tz - v.z) * k; v.y += (v.ty - v.y) * k; v.yaw += angDiff(v.yaw, v.tyw) * k;
    v.M.g.position.set(v.x, v.y, v.z); v.M.g.rotation.y = v.yaw; v.M.g.visible = v.area === P.area;
    animTV(v.M, Math.hypot(v.x - ox, v.z - oz) / Math.max(dt, 1e-3), dt, { dead: !v.alive, grab: v.gr, cam: v.area === 'sig' && v.alive, rec: v.area === 'sig' && v.alive });
    if (v.bubT > 0) { v.bubT -= dt; if (v.bubT <= 0 && v.bub) { v.M.g.remove(v.bub); v.bub = null; } }
  });
}
