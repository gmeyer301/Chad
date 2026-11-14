'use strict';
/* game: the run (days + quota), the local TV-head player, filming, uploading, shop, events */
const QUOTA0 = 4000;
const G = { mode: 'title', phase: 'surface', day: 1, quota: QUOTA0, qn: 1, views: 0, money: 0, mapType: 'facility', seed: 1, lever: 0, leverSide: 'surf', diveT: 0, spawnT: 60, sandbox: false };
const P = { id: 'me', name: 'TV', color: '#4a7ad8', x: 0, z: -8, y: 0, vy: 0, yaw: 0, pitch: 0, hp: 100, alive: true, area: 'surf', cr: false, stam: 100, o2: 300, o2Bonus: 0, camUp: false, rec: false, film: 120, filmBonus: 0, slot: 0, inv: [null, null, null], carry: [], flash: false, flashPro: false, grabBy: null, kx: 0, kz: 0, thrown: false, thrownBy: '', noise: 0, noiseT: 0, score: 0, clips: {}, stepD: 0, onGround: true, hurtFlash: 0, spec: 0, deathT: 0 };
const ACT = new Map();
const EVENTS = []; // things worth filming (explosions, BSOD, gate)
const O2_BASE = 300, FILM_BASE = 120;
const SHOP = [
  { k: 'med', n: 'Med Kit', p: 80, d: 'Heals 50 HP. Goes in an item slot.', slot: true, ic: '✚' },
  { k: 'shock', n: 'Shock Stick', p: 150, d: 'Zap a monster in front of you to stun it for 4s. 3 uses.', slot: true, uses: 3, ic: '⚡' },
  { k: 'horn', n: 'Air Horn', p: 40, d: 'VERY loud. Every Ear on the map will hear it. Funny though.', slot: true, uses: 5, ic: '📯' },
  { k: 'film', n: 'Extra Film', p: 100, d: '+60 seconds of camera film for your next dive.', ic: '🎞' },
  { k: 'o2', n: 'Oxygen Tank', p: 90, d: '+90 seconds of oxygen for your next dive.', ic: '🫧' },
  { k: 'flash', n: 'Flashlight Pro', p: 200, d: 'A brighter flashlight that reaches further. Yours forever.', ic: '🔦' },
];
const COLORS = ['#4a7ad8', '#d83a7a', '#e8a020', '#3ac06a', '#8a5cff', '#e84a3a', '#2fc3d3', '#f0f0f0'];
const hexI = c => parseInt(String(c).replace('#', ''), 16) || 0x4a7ad8;
const nameOf = id => id === myId() ? P.name : (PLAYERS.get(id) || {}).n || (BOTS.find(b => b.id === id) || {}).name || 'Someone';

/* ---------------- game state sync ---------------- */
function gameState() { return { phase: G.phase, day: G.day, quota: G.quota, qn: G.qn, views: G.views, money: G.money, mapType: G.mapType, seed: G.seed, lever: G.lever, leverSide: G.leverSide, sandbox: G.sandbox }; }
function applyGame(g) { if (!g) return; Object.assign(G, g); drawQuota(); UI.refresh(); }
function pushGame() { drawQuota(); UI.refresh(); if (!NET.solo && NET.isHost) broadcast({ t: 'game', g: gameState() }); }
function sysChat(text, color = '#ffd23d') { netEvent({ t: 'chat', n: '', c: color, text }); }

/* ---------------- other players ---------------- */
function addPlayer(id, n, c, f) {
  removePlayer(id);
  const M = makeTV(hexI(c), f || presetFace('smile')); const tag = textSprite(n, '#fff', null, 0.3); tag.position.y = 2.45; M.g.add(tag);
  W.s.add(M.g);
  const pl = { id, n, c, f, M, x: 0, z: 0, y: 0, yw: 0, tg: { x: 0, z: -8, y: 0, yw: 0, pt: 0, ar: 'surf', al: 1 }, grab: null, hurtT: 0 };
  PLAYERS.set(id, pl); return pl;
}
function removePlayer(id) { const p = PLAYERS.get(id); if (!p) return; W.s.remove(p.M.g); PLAYERS.delete(id); }
function setPlayerFace(id, f) { const p = PLAYERS.get(id); if (p) { p.f = f; setTVFace(p.M, f); } }
function updatePlayers(dt) {
  PLAYERS.forEach(p => {
    const t = p.tg, k = Math.min(1, dt * 12), ox = p.x, oz = p.z;
    if (Math.hypot(t.x - p.x, t.z - p.z) > 20) { p.x = t.x; p.z = t.z; }
    p.x += (t.x - p.x) * k; p.z += (t.z - p.z) * k; p.y += ((t.y || 0) - p.y) * k; p.yw += angDiff(p.yw, t.yw || 0) * k;
    p.M.g.position.set(p.x, p.y, p.z); p.M.g.rotation.y = p.yw; p.M.g.visible = t.ar === P.area;
    animTV(p.M, Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-3), dt, { cr: t.cr, cam: t.cam, rec: t.rec, pitch: t.pt, dead: !t.al, grab: t.gr, item: t.it });
    if (p.hurtT > 0) p.hurtT -= dt;
  });
}
function myState() { return { x: +P.x.toFixed(2), z: +P.z.toFixed(2), y: +P.y.toFixed(2), yw: +P.yaw.toFixed(2), pt: +P.pitch.toFixed(2), cr: P.cr ? 1 : 0, cam: P.camUp || P.slot === 0 ? 1 : 0, rec: P.rec ? 1 : 0, ar: P.area, al: P.alive ? 1 : 0, hp: Math.round(P.hp), nz: P.noise, gr: P.grabBy ? 1 : 0, it: P.slot > 0 && P.inv[P.slot - 1] ? 1 : 0 }; }

/* ---------------- actors (everyone monsters can hurt; host) ---------------- */
function buildACT() {
  ACT.clear();
  if (P.area === 'sig') ACT.set(myId(), { id: myId(), me: true, x: P.x, z: P.z, y: P.y, yaw: P.yaw, alive: P.alive, cr: P.cr, noise: P.noise, grab: P.grabBy && MON.has(P.grabBy) ? P.grabBy : null, name: P.name, face: myFace() });
  PLAYERS.forEach((p, id) => { const t = p.tg; if (t.ar !== 'sig') return; if (p.grab && !MON.has(p.grab)) p.grab = null; ACT.set(id, { id, x: t.x, z: t.z, y: t.y || 0, yaw: t.yw || 0, alive: !!t.al, cr: !!t.cr, noise: p.noiseT > 0 ? 3 : t.nz || 0, grab: p.grab, name: p.n, face: p.f }); if (p.noiseT > 0) p.noiseT -= 1 / 60; });
  BOTS.forEach(b => { if (b.area !== 'sig') return; if (b.grabBy && !MON.has(b.grabBy)) b.grabBy = null; ACT.set(b.id, { id: b.id, bot: true, ref: b, x: b.x, z: b.z, y: b.y, yaw: b.yaw, alive: b.alive, cr: false, noise: b.noise, grab: b.grabBy, name: b.name, face: b.faceUrl }); });
}
function hurtActor(a, dmg, kx, kz, ky, cause) {
  if (!a || !a.alive) return;
  if (dmg > 0) netEvent({ t: 'snd', n: 'hurt', x: a.x, z: a.z, v: 0.8 });
  if (a.me) localHurt(dmg, kx, kz, ky, cause, false);
  else if (a.bot) botHurt(a.ref, dmg, kx, kz, ky, cause, false);
  else { sendTo(a.id, { t: 'hurt', dmg, kx, kz, ky, cause }); const p = PLAYERS.get(a.id); if (p) p.hurtT = 0.6; }
}
function grabActor(a, m) {
  a.grab = m.id;
  if (a.me) { P.grabBy = m.id; P.rec = P.rec; sfx('grab'); }
  else if (a.bot) { a.ref.grabBy = m.id; botSay(a.ref, pick(['HELP', 'AAAAAA', 'NOOO', 'put me DOWN', 'film this!!'])); }
  else { const p = PLAYERS.get(a.id); if (p) p.grab = m.id; sendTo(a.id, { t: 'grab', mid: m.id }); }
}
function releaseActor(a, kx, kz, ky, dmg, cause, thrown) {
  a.grab = null;
  if (a.me) { P.grabBy = null; localHurt(dmg, kx, kz, ky, cause, thrown); }
  else if (a.bot) { a.ref.grabBy = null; botHurt(a.ref, dmg, kx, kz, ky, cause, thrown); }
  else { const p = PLAYERS.get(a.id); if (p) p.grab = null; sendTo(a.id, { t: 'rel', dmg, kx, kz, ky, cause, thrown }); }
}
function pushActor(a, vx, vz, dt) {
  if (a.me) { P.x += vx * dt; P.z += vz * dt; }
  else if (a.bot) { a.ref.x += vx * dt; a.ref.z += vz * dt; }
  else { const v = NET.pushAcc.get(a.id) || [0, 0]; v[0] += vx * dt; v[1] += vz * dt; NET.pushAcc.set(a.id, v); }
}

/* ---------------- local damage / death ---------------- */
function localHurt(dmg, kx, kz, ky, cause, thrown) {
  if (!P.alive) return;
  P.kx = kx || 0; P.kz = kz || 0; if (ky) { P.vy = ky; P.onGround = false; } P.thrown = !!thrown; P.thrownBy = cause || '';
  if (dmg > 0) { P.hp -= dmg; P.hurtFlash = 1; sfx('hurt'); UI.shake(Math.min(1, dmg / 40)); }
  if (P.hp <= 0) die(cause || 'something');
}
function die(cause) {
  if (!P.alive) return;
  P.alive = false; P.hp = 0; P.rec = false; P.camUp = false; P.grabBy = null; P.deathT = 0;
  const lost = P.score; P.score = 0; P.clips = {}; P.carry = [];
  sfx('death'); UI.banner('YOU DIED — killed by ' + cause + (lost > 1 ? '. Your footage was lost.' : ''), '#ff3b3b');
  netAct({ t: 'dead', cause, x: P.x, z: P.z });
}
function respawnHome() { P.alive = true; P.hp = 100; P.area = 'surf'; P.x = SURF.spawn.x + rnd(-2, 2); P.z = SURF.spawn.z + rnd(-1, 1); P.y = 0; P.vy = 0; P.kx = P.kz = 0; P.grabBy = null; P.yaw = 0; P.camUp = false; P.rec = false; }

/* ---------------- events (run on every computer) ---------------- */
function recordEvent(name, x, y, z, v) { EVENTS.push({ name, x, y, z, v, t: W.t, done: false }); if (EVENTS.length > 20) EVENTS.shift(); }
function vol(x, z, range = 32) { if (P.area !== 'sig' && x > SIG_X / 2) return 0; return clamp(1 - Math.hypot(x - P.x, z - P.z) / range, 0, 1); }
function handleEvent(e) {
  if (!e) return;
  switch (e.t) {
    case 'mspawn': if (!MON.has(e.id) && MAP.group) createMon(e.id, e.type, e.x, e.z, e.face); if (e.type === 'blanket') UI.banner('A 1 in 3000 BLANKET has spawned!! FILM IT!', '#ff5ec4'); if (e.type === 'sniff') UI.banner('S N I F F   H A S   A W A K E N E D', '#ff3b3b'); break;
    case 'mdel': removeMon(e.id); break;
    case 'snd': sfx(e.n, vol(e.x, e.z) * (e.v || 1)); break;
    case 'boom': fxExplosion(e.x, 0.6, e.z, 3.5); sfx('explode', vol(e.x, e.z, 50)); recordEvent('Jerry exploding', e.x, 1, e.z, 500); break;
    case 'puff': fxPuff(e.x, e.y, e.z, e.c || 0xffffff); break;
    case 'suck': removeArtifact(e.id); fxPuff(e.x, 0.3, e.z, 0x80ffee, 5, 0.2); sfx('vac', vol(e.x, e.z)); break;
    case 'pick': { const a = removeArtifact(e.id); if (a && e.by === myId()) { P.carry.push(a.type); sfx('pickup'); UI.toast('Picked up ' + ARTIFACTS[a.type].n + ' — bring it back up to sell it!'); } else if (a && e.by && e.by.startsWith('bot:')) { const b = BOTS.find(x => x.id === e.by); if (b) b.carry.push(a.type); } break; }
    case 'alert': if (P.area === 'sig') UI.toast('🦜 RON SQUAWKED! Every monster knows where you are!'); break;
    case 'bsod': if (MAP.screens) drawScreens(true); sfx('bsod', P.area === 'sig' ? 1 : 0); if (P.area === 'sig') UI.banner('Something happened in the SERVER ROOM…', '#4aa3ff'); if (MAP.room) recordEvent('the Blue Screen of Death', MAP.room.cx, 1.5, MAP.room.cz, 900); break;
    case 'gate': openGate(); sfx('gate', P.area === 'sig' ? 1 : 0); if (MAP.room) recordEvent('the huge gates opening', MAP.room.cx, 2.5, MAP.room.z1, 1000); break;
    case 'chat': UI.addChat(e.n, e.text, e.c); break;
    case 'dive': onDive(e); break;
    case 'ascend': onAscend(e); break;
    case 'lever': sfx('lever'); { const b = G.leverSide === 'sig' ? MAP.bell : SURF.bell; if (b) { b.lever.rotation.x = -0.6; setTimeout(() => b.lever.rotation.x = 0.6, 900); } } break;
    case 'hurt': localHurt(e.dmg, e.kx, e.kz, e.ky, e.cause, false); break;
    case 'grab': P.grabBy = e.mid; sfx('grab'); break;
    case 'rel': P.grabBy = null; localHurt(e.dmg, e.kx, e.kz, e.ky, e.cause, e.thrown); break;
    case 'push': P.x += e.dx; P.z += e.dz; break;
    case 'got': giveItem(e.k); break;
    case 'upres': UI.toast('📺 ' + (e.n || 'Someone') + '\'s video got ' + fmt(e.views) + ' views!'); drawTV('up', e); break;
    case 'face': setPlayerFace(e.id, e.f); break;
    case 'quota': UI.banner('QUOTA MET! ' + fmt(e.views) + ' / ' + fmt(e.quota) + ' views. New quota incoming…', '#5ee36a'); sfx('ding'); break;
    case 'over': UI.gameOver(e); break;
    case 'toast': UI.toast(e.text); break;
    case 'boomx': break;
  }
}

/* ---------------- host: acts from players ---------------- */
function hostAct(a, from) {
  const area = from === myId() ? P.area : (PLAYERS.get(from) || { tg: {} }).tg.ar;
  switch (a.t) {
    case 'lever': {
      if (G.lever > 0) return;
      if (G.phase === 'surface' && area === 'surf') {
        if (G.day > 3) {
          if (G.views >= G.quota) { netEvent({ t: 'quota', views: G.views, quota: G.quota }); G.qn++; G.quota = Math.round(G.quota * 1.7 / 500) * 500; G.day = 1; G.views = 0; }
          else { netEvent({ t: 'over', views: G.views, quota: G.quota, qn: G.qn }); G.qn = 1; G.quota = QUOTA0; G.day = 1; G.views = 0; G.money = 0; pushGame(); return; }
        }
        G.lever = 5; G.leverSide = 'surf'; netEvent({ t: 'lever' }); pushGame();
      } else if (G.phase === 'dive' && area === 'sig') { G.lever = 10; G.leverSide = 'sig'; netEvent({ t: 'lever' }); pushGame(); }
      break;
    }
    case 'pick': if (G.phase === 'dive' && MAP.artifacts.some(x => x.id === a.id)) netEvent({ t: 'pick', id: a.id, by: from }); break;
    case 'poke': { const m = MON.get(a.id); if (m && m.st === 'hide') { setSt(m, 'reveal'); m.tgt = from; netEvent({ t: 'snd', n: 'static', x: m.x, z: m.z }); } break; }
    case 'map': if (from === myId() && MAPS[a.k] && G.phase === 'surface') { G.mapType = a.k; pushGame(); } break;
    case 'buy': { const it = SHOP.find(s => s.k === a.k); if (!it) return; if (G.money < it.p) { sendTo(from, { t: 'toast', text: 'Not enough money! (need $' + it.p + ')' }); return; } G.money -= it.p; sendTo(from, { t: 'got', k: it.k }); pushGame(); break; }
    case 'up': { const v = Math.max(0, Math.min(2e6, +a.views || 0)); G.views += v; G.money += Math.round(v / 8); netEvent({ t: 'upres', n: nameOf(from), views: v, title: String(a.title || '').slice(0, 60), cm: (a.cm || []).slice(0, 3) }); pushGame(); break; }
    case 'sell': { const v = Math.max(0, Math.min(5000, +a.v || 0)); if (!v) return; G.money += v; netEvent({ t: 'toast', text: '💰 ' + nameOf(from) + ' sold ' + a.n + ' artifact' + (a.n > 1 ? 's' : '') + ' for $' + v }); pushGame(); break; }
    case 'dead': { sysChat('☠ ' + nameOf(from) + ' was killed by ' + a.cause, '#ff8080'); if (/hijack/i.test(a.cause) && G.phase === 'dive') { const f = from === myId() ? myFace() : (PLAYERS.get(from) || {}).f; setTimeout(() => { if (G.phase === 'dive') { spawnMon('hijack', a.x, a.z, f); sysChat('🦠 ' + nameOf(from) + ' got infected… they are a HIJACK now', '#ff3b3b'); } }, 1500); } break; }
    case 'chat': { const text = String(a.text || '').slice(0, 140); if (!text) return; const p = PLAYERS.get(from); netEvent({ t: 'chat', n: nameOf(from), c: from === myId() ? P.color : (p ? p.c : '#fff'), text }); if (p) p.noiseT = 1.5; botsHear(text, nameOf(from)); break; }
    case 'honk': netEvent({ t: 'snd', n: 'horn', x: a.x, z: a.z, v: 1 }); { const p = PLAYERS.get(from); if (p) p.noiseT = 3; } break;
    case 'shock': { const m = MON.get(a.id); if (!m) return; m.stun = 4; netEvent({ t: 'snd', n: 'zap', x: m.x, z: m.z }); netEvent({ t: 'puff', x: m.x, y: 1.2, z: m.z, c: 0x80c0ff }); break; }
    case 'face': { const p = PLAYERS.get(from); if (p) { p.f = a.f; setTVFace(p.M, a.f); broadcast({ t: 'ev', e: { t: 'face', id: from, f: a.f } }, from); } break; }
    case 'spawn': if (from === myId() && G.sandbox && G.phase === 'dive' && MDEF[a.type]) { const [fx, fz] = fwd(P.yaw); let x = P.x + fx * 6, z = P.z + fz * 6; if (!navFree(x, z)) { const s = randomSpot(P, 4); x = s.x; z = s.z; } spawnMon(a.type, x, z, a.type === 'hijack' ? myFace() : null); } break;
    case 'sandbox': if (from === myId()) { G.sandbox = !!a.on; pushGame(); } break;
  }
}

/* ---------------- host: days, dives, quota ---------------- */
function hostGame(dt) {
  if (G.lever > 0) { G.lever -= dt; if (G.lever <= 0) { G.lever = 0; if (G.leverSide === 'surf' && G.phase === 'surface') startDive(); else if (G.leverSide === 'sig' && G.phase === 'dive') startAscend(); } }
  if (G.phase === 'dive') {
    G.diveT += dt; G.spawnT -= dt;
    if (G.spawnT <= 0) { G.spawnT = 70; if (MON.size < 12) spawnRandom(); }
    if (G.diveT > 4 && G.lever <= 0) { let alive = 0; ACT.forEach(a => { if (a.alive) alive++; }); if (!alive) { G.lever = 3; G.leverSide = 'sig'; netEvent({ t: 'toast', text: 'Everyone is gone… the bell is heading back up.' }); pushGame(); } }
  }
}
function spawnRandom() { const t = rollMonster(); const s = randomSpot(MAP.bell, 18); spawnMon(t, s.x, s.z); }
function startDive() {
  const bx = SURF.bell.x, bz = SURF.bell.z, who = [];
  if (P.area === 'surf' && P.alive && Math.hypot(P.x - bx, P.z - bz) < 2.5) who.push(myId());
  PLAYERS.forEach((p, id) => { if (p.tg.ar === 'surf' && Math.hypot(p.tg.x - bx, p.tg.z - bz) < 2.5) who.push(id); });
  if (!who.length) { netEvent({ t: 'toast', text: 'Nobody was inside the bell! Stand inside it when the lever is pulled.' }); return; }
  BOTS.forEach(b => { if (b.alive) who.push(b.id); });
  G.phase = 'dive'; G.seed = rndi(1, 2e9); G.diveT = 0; G.spawnT = 55; SNIFF.done = false; SNIFF.t = -1; _mid = 0;
  netEvent({ t: 'dive', map: G.mapType, seed: G.seed, who, day: G.day });
  const n = Math.min(10, 3 + G.day + G.qn - 1); for (let i = 0; i < n; i++) spawnRandom();
  pushGame();
}
function startAscend() {
  const bx = MAP.bell.x, bz = MAP.bell.z, who = [], inB = (x, z) => Math.hypot(x - bx, z - bz) < 2.6;
  if (P.area === 'sig' && P.alive && inB(P.x, P.z)) who.push(myId());
  PLAYERS.forEach((p, id) => { if (p.tg.ar === 'sig' && p.tg.al && inB(p.tg.x, p.tg.z)) who.push(id); });
  BOTS.forEach(b => { if (b.area === 'sig' && b.alive && inB(b.x, b.z)) who.push(b.id); });
  G.phase = 'surface'; G.day++; G.lever = 0;
  netEvent({ t: 'ascend', who, day: G.day });
  pushGame();
}
function onDive(e) {
  clearMons(); buildMap(e.map, e.seed); MAP.group.visible = false; G.phase = 'dive'; EVENTS.length = 0;
  if (e.who.includes(myId())) {
    const b = MAP.bell; P.x = b.x + rnd(-1, 1); P.z = b.z + rnd(-0.5, 1); P.y = 0; P.area = 'sig'; P.yaw = Math.PI; P.kx = P.kz = 0;
    P.o2 = O2_BASE + P.o2Bonus; P.o2Bonus = 0; P.film = FILM_BASE + P.filmBonus; P.filmBonus = 0;
    sfx('bell'); sfx('static'); UI.flashStatic(); UI.banner(MAPS[e.map].n.toUpperCase() + ' — Day ' + e.day + '. Film monsters. Get back to the bell before your oxygen runs out!', '#2fe3c5');
  } else UI.banner('Your team dove into ' + MAPS[e.map].n + ' without you. Wait for the bell.', '#ffd23d');
  if (NET.isHost) BOTS.forEach(b => { if (e.who.includes(b.id)) botToSig(b); });
}
function onAscend(e) {
  if (P.area === 'sig') {
    if (P.alive && e.who.includes(myId())) {
      if (P.carry.length) { const v = P.carry.reduce((s, t) => s + ARTIFACTS[t].v, 0); netAct({ t: 'sell', v, n: P.carry.length }); P.carry = []; }
      P.area = 'surf'; P.x = SURF.bell.x + rnd(-1, 1); P.z = SURF.bell.z + rnd(-1, 1); P.y = 0; P.yaw = 0; P.rec = false; P.camUp = false; P.grabBy = null;
      UI.banner(P.score > 1 ? 'You made it back! Go upload your footage at the TV 📺' : 'You made it back… but you didn\'t film anything.', '#5ee36a');
    } else {
      if (P.alive) { P.score = 0; P.clips = {}; P.carry = []; UI.banner('The bell left without you. Signal lost. (footage lost)', '#ff3b3b'); }
      respawnHome();
    }
    sfx('bell'); UI.flashStatic();
  }
  G.phase = 'surface'; clearMons(); clearMap(); EVENTS.length = 0;
  if (NET.isHost) BOTS.forEach(b => botToSurf(b, e.who.includes(b.id)));
  if (G.day > 3) setTimeout(() => UI.banner('That was the last day! Upload your footage, then pull the bell lever to see if you made quota.', '#ffd23d'), 3200);
}

/* ---------------- items ---------------- */
function giveItem(k) {
  const it = SHOP.find(s => s.k === k); if (!it) return; sfx('buy');
  if (k === 'film') { P.filmBonus += 60; UI.toast('+60s of film for your next dive'); }
  else if (k === 'o2') { P.o2Bonus += 90; UI.toast('+90s of oxygen for your next dive'); }
  else if (k === 'flash') { P.flashPro = true; UI.toast('Flashlight Pro equipped! (press Q)'); }
  else { const i = P.inv.indexOf(null); if (i < 0) { UI.toast('Your item slots are full — it fell on the floor and broke. Oops.'); return; } P.inv[i] = { k, uses: it.uses || 1 }; UI.toast(it.n + ' is in slot ' + (i + 2)); }
  UI.refresh();
}
function useItem() {
  const s = P.slot - 1, it = P.inv[s]; if (!it) return;
  if (it.k === 'med') { if (P.hp >= 100) { UI.toast('You are already at full health'); return; } P.hp = Math.min(100, P.hp + 50); sfx('heal'); it.uses = 0; }
  else if (it.k === 'shock') { const [fx, fz] = fwd(P.yaw); let best = null, bd = 3.2; MON.forEach(m => { const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < bd && ((m.x - P.x) * fx + (m.z - P.z) * fz) / (d || 1) > 0.4) { bd = d; best = m; } }); sfx('zap'); if (best) { netAct({ t: 'shock', id: best.id }); it.uses--; UI.toast('⚡ Zapped the ' + MDEF[best.type].n + '!'); } else UI.toast('Nothing to zap (get closer)'); }
  else if (it.k === 'horn') { sfx('horn'); P.noiseT = 3; it.uses--; netAct({ t: 'honk', x: P.x, z: P.z }); }
  if (it.uses <= 0) P.inv[s] = null; UI.refresh();
}

/* ---------------- filming ---------------- */
function filmTick(dt) {
  if (!P.rec) return;
  P.film -= dt; if (P.film <= 0) { P.film = 0; P.rec = false; sfx('recOff'); UI.toast('Out of film!'); return; }
  P.ft = (P.ft || 0) + dt; if (P.ft < 0.25) return; const step = P.ft; P.ft = 0;
  if (P.area !== 'sig') return;
  const cp = Math.cos(P.pitch), fx = -Math.sin(P.yaw) * cp, fy = Math.sin(P.pitch), fz = -Math.cos(P.yaw) * cp;
  const ex = P.x, ey = P.y + (P.cr ? 1.0 : 1.55), ez = P.z; let gain = 0;
  const inView = (x, y, z, maxD = 28, cone = 0.8) => { const dx = x - ex, dy = y - ey, dz = z - ez, d = Math.hypot(dx, dy, dz); if (d > maxD || d < 0.2) return 0; if ((dx * fx + dy * fy + dz * fz) / d < cone) return 0; if (!los(ex, ez, x, z)) return 0; return d; };
  const add = (key, v) => { P.clips[key] = (P.clips[key] || 0) + v; gain += v; };
  MON.forEach(m => {
    if (m.type === 'computer' && m.st === 'hide') return; const D = MDEF[m.type];
    const h = { yeti: 2.2, sniff: 3.5, lizard: 1, jerry: 0.3, ron: 0, blanket: 0 }[m.type] ?? 1.1;
    const d = inView(m.x, m.y + h, m.z); if (!d) return;
    const scary = D.atk.includes(m.st); add(D.n + (scary ? ' attacking' : ''), D.v * step * clamp(1.3 - d / 30, 0.3, 1.2) * (scary ? 3 : 1));
  });
  const others = [];
  PLAYERS.forEach(p => { if (p.tg.ar === 'sig') others.push({ x: p.x, y: p.y, z: p.z, al: p.tg.al, gr: p.tg.gr, n: p.n }); });
  botList().forEach(b => { if (b.area === 'sig') others.push({ x: b.x, y: b.y, z: b.z, al: b.alive, gr: b.gr, n: b.name }); });
  others.forEach(o => { const d = inView(o.x, (o.y || 0) + 1.2, o.z, 18); if (!d) return; if (o.gr) add('teammate getting grabbed', 45 * step); else if (!o.al) add('a dead body', 12 * step); else add('vlogging with friends', 4 * step); });
  EVENTS.forEach(ev => { if (ev.done || W.t - ev.t > 2.5) return; if (inView(ev.x, ev.y, ev.z, 40, 0.7)) { ev.done = true; add(ev.name, ev.v); UI.toast('🎬 You filmed ' + ev.name + '! +' + fmt(ev.v)); } });
  if (gain > 0) { P.score += gain; UI.viewGain(gain); }
}
const TITLES = ['IS REAL (NOT CLICKBAIT)', 'CAUGHT ON CAMERA', 'ATTACKED MY FRIENDS', 'at 3AM (gone wrong)', 'SCARIEST FOOTAGE EVER', 'chased us 😱', 'we should NOT have gone here', 'REACTION'];
const COMMENTS = ['first', 'this is so fake lol', '{m} looks so real omg', 'who else is watching at 3am', 'bro screamed 💀', 'the {m} part had me crying', 'I would have run SO fast', 'subscribed!!', 'camera work 10/10', 'why did he go TOWARD the {m}', 'NOT the {m} 😭', 'part 2 when'];
function doUpload() {
  if (P.score < 1) { UI.toast('No footage! Film monsters in the Signal World first (F = camera, click = record).'); return; }
  const views = Math.round(P.score * rnd(0.9, 1.25));
  const hl = Object.entries(P.clips).sort((a, b) => b[1] - a[1]); const top = (hl[0] || ['nothing'])[0].replace(' attacking', '');
  const title = (top + ' ' + pick(TITLES)).toUpperCase().slice(0, 60);
  const cm = []; const pool = COMMENTS.slice(); for (let i = 0; i < 3; i++) cm.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].replace(/\{m\}/g, top));
  UI.showUpload({ views, title, hl: hl.slice(0, 6), cm });
  netAct({ t: 'up', views, title, cm }); P.score = 0; P.clips = {}; sfx('ding');
}

/* ---------------- local player ---------------- */
function getInteract() {
  if (!P.alive) return null; let best = null, bd = 1e9; const [fx, fz] = fwd(P.yaw);
  for (const it of INTER) {
    if (it.area !== P.area) continue; const dx = it.x - P.x, dz = it.z - P.z, d = Math.hypot(dx, dz);
    if (d > it.r) continue; const dot = d < 0.8 ? 1 : (dx * fx + dz * fz) / d; if (dot < 0.25) continue; if (d < bd) { bd = d; best = it; }
  }
  if (P.area === 'sig') MON.forEach(m => { if (m.type !== 'computer' || m.st !== 'hide') return; const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < 1.8 && d < bd) { bd = d; best = { label: () => 'Pick up Old VHS Tape ($45)', act: () => netAct({ t: 'poke', id: m.id }) }; } });
  return best;
}
function updatePlayer(dt) {
  const ui = UI.blocking();
  if (!ui) { P.yaw -= IN.dx * 0.0022 * IN.sens; P.pitch = clamp(P.pitch - IN.dy * 0.0022 * IN.sens, -1.45, 1.45); }
  if (P.hurtFlash > 0) P.hurtFlash -= dt * 2;
  if (!P.alive) { P.deathT += dt; if (pressed('M0') || pressed('KeyE') || pressed('Space')) P.spec++; return; }
  // keys
  if (!ui) {
    if (pressed('KeyF') || pressed('M2')) { P.slot = 0; P.camUp = !P.camUp; if (!P.camUp && P.rec) { P.rec = false; sfx('recOff'); } sfx('click'); }
    for (let i = 1; i <= 4; i++) if (pressed('Digit' + i)) { P.slot = i - 1; if (i > 1) { P.camUp = false; if (P.rec) { P.rec = false; sfx('recOff'); } } sfx('click'); }
    if (pressed('WheelDown') || pressed('WheelUp')) { P.slot = (P.slot + (pressed('WheelDown') ? 1 : 3)) % 4; if (P.slot) { P.camUp = false; P.rec = false; } }
    if (pressed('M0')) {
      if (P.slot === 0) { if (!P.camUp) { P.camUp = true; sfx('click'); } else if (P.film > 0) { P.rec = !P.rec; sfx(P.rec ? 'recOn' : 'recOff'); if (P.rec && P.area !== 'sig') UI.toast('Nothing to film up here… dive into the Signal World!'); } else UI.toast('Out of film! Buy Extra Film at Signal Mart.'); }
      else useItem();
    }
    if (pressed('KeyQ')) { P.flash = !P.flash; sfx('click'); }
    if (pressed('KeyE')) { const it = getInteract(); if (it) it.act(); }
    if (pressed('KeyH') && P.inv.some(x => x && x.k === 'horn')) { P.slot = P.inv.findIndex(x => x && x.k === 'horn') + 1; useItem(); }
  }
  if (P.grabBy) {
    const m = MON.get(P.grabBy);
    if (!m) P.grabBy = null; else { const gp = grabPoint(m); P.x = gp.x; P.z = gp.z; P.y = gp.y; P.vy = 0; P.cr = false; P.noise = 2; return; }
  }
  // movement
  let mx = 0, mz = 0;
  if (!ui) { mx = (held('KeyD') || held('ArrowRight') ? 1 : 0) - (held('KeyA') || held('ArrowLeft') ? 1 : 0) + IN.jx; mz = (held('KeyS') || held('ArrowDown') ? 1 : 0) - (held('KeyW') || held('ArrowUp') ? 1 : 0) + IN.jy; }
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  P.cr = !ui && (held('KeyC') || held('ControlLeft'));
  const moving = ml > 0.1;
  const sprint = !ui && moving && !P.cr && held('ShiftLeft') && P.stam > 0;
  P.stam = clamp(P.stam + (sprint ? -22 : 14) * dt, 0, 100);
  const spd = (P.cr ? 1.8 : sprint ? 6.2 : 3.6) * (P.area === 'surf' ? 1.1 : 1);
  const sy = Math.sin(P.yaw), cyw = Math.cos(P.yaw);
  const vx = (-sy * -mz + cyw * mx) * spd, vz = (-cyw * -mz - sy * mx) * spd;
  const kd = Math.exp(-dt * (P.onGround ? 4 : 1.2)); P.kx *= kd; P.kz *= kd;
  const ox = P.x, oz = P.z;
  P.x += (vx + P.kx) * dt; P.z += (vz + P.kz) * dt;
  P.vy -= 16 * dt; P.y += P.vy * dt;
  const gr = groundAt(P.area, P.x, P.z, P.y);
  if (P.y <= gr) { if (P.vy < -8) sfx('land', 0.8); P.y = gr; P.vy = 0; P.onGround = true; } else P.onGround = P.y - gr < 0.05;
  if (!ui && pressed('Space') && P.onGround && !P.cr) { P.vy = 5.4; P.onGround = false; sfx('jump'); }
  const fast = Math.hypot(P.kx, P.kz);
  const hit = collide(P.area, P, 0.32);
  if (hit && P.thrown && fast > 7) { P.thrown = false; P.kx = P.kz = 0; UI.shake(1); sfx('land'); localHurt(18, 0, 0, 0, 'a wall (thrown by ' + P.thrownBy + ')', false); }
  if (fast < 2) P.thrown = false;
  if (P.y < -6) { P.y = 2; P.vy = 0; }
  const moved = Math.hypot(P.x - ox, P.z - oz); P.stepD += moved;
  if (P.stepD > (sprint ? 2.2 : 1.6) && P.onGround) { P.stepD = 0; sfx('step', P.cr ? 0.3 : sprint ? 1.2 : 0.8); }
  if (P.noiseT > 0) P.noiseT -= dt;
  P.noise = P.noiseT > 0 ? 3 : !moving || P.cr ? 0 : sprint ? 2 : 1;
  // oxygen
  if (P.area === 'sig') { P.o2 -= dt; if (P.o2 <= 0) { P.o2 = 0; die('running out of oxygen'); } }
}
function spectateTarget() {
  const list = []; PLAYERS.forEach(p => { if (p.tg.ar === 'sig' && p.tg.al) list.push(p); }); botList().forEach(b => { if (b.area === 'sig' && b.alive) list.push(b); });
  if (!list.length) return null; return list[((P.spec % list.length) + list.length) % list.length];
}
function updateCamera(dt) {
  const fov = P.camUp ? 58 : 74; if (Math.abs(W.cam.fov - fov) > 0.1) { W.cam.fov = lerp(W.cam.fov, fov, Math.min(1, dt * 10)); W.cam.updateProjectionMatrix(); }
  if (!P.alive && P.area === 'sig') {
    const t = spectateTarget(); const cx = t ? t.x : P.x, cz = t ? t.z : P.z;
    const yaw = P.yaw, d = 4; W.cam.position.set(cx + Math.sin(yaw) * d, 2.6 + Math.max(-1, P.pitch * -2), cz + Math.cos(yaw) * d); W.cam.lookAt(cx, 1.3, cz);
    UI.spectate(t ? t.n || t.name : null);
    return;
  }
  UI.spectate(false);
  const shake = UI.shakeAmt || 0;
  W.cam.position.set(P.x + (Math.random() - 0.5) * shake * 0.12, P.y + (P.cr ? 1.0 : 1.55) + (Math.random() - 0.5) * shake * 0.12, P.z);
  W.cam.rotation.set(P.pitch, P.yaw, 0);
  W.flash.intensity = P.flash && P.alive ? (P.flashPro ? 2.4 : 1.4) : 0; W.flash.distance = P.flashPro ? 36 : 24; W.flash.angle = P.flashPro ? 0.62 : 0.5;
  VM.update(dt);
}
/* first-person viewmodel (camcorder / item in hand) */
const VM = {
  g: null,
  init() {
    const g = this.g = new THREE.Group(); W.cam.add(g); g.position.set(0.34, -0.32, -0.6);
    this.cam = piv(0, 0, 0, g); bx(0.16, 0.19, 0.36, mat(0x1a1a1a), 0, 0, 0, this.cam); cy(0.07, 0.08, 0.1, mat(0x333333), 0, 0.01, -0.22, this.cam).rotation.x = Math.PI / 2; bx(0.06, 0.14, 0.17, mat(0xffd23d), -0.11, 0.02, 0.03, this.cam); this.rl = sp(0.025, basic(0xff2020), 0.06, 0.11, -0.12, this.cam);
    this.items = {}; const mk2 = (k, f) => { const p = piv(0, 0, 0, g); f(p); p.visible = false; this.items[k] = p; };
    mk2('med', p => { bx(0.26, 0.2, 0.1, mat(0xffffff), 0, 0, 0, p); bx(0.16, 0.05, 0.11, mat(0xe02020), 0, 0, 0, p); bx(0.05, 0.16, 0.11, mat(0xe02020), 0, 0, 0, p); });
    mk2('shock', p => { cy(0.03, 0.03, 0.5, mat(0x333333), 0, 0.05, -0.1, p).rotation.x = -1.2; sp(0.05, basic(0x80c0ff), 0, 0.15, -0.35, p); });
    mk2('horn', p => { cy(0.05, 0.05, 0.16, mat(0xe02020), 0, 0, 0, p); cn(0.09, 0.2, mat(0xdddddd), 0, 0, -0.17, p).rotation.x = -Math.PI / 2; });
  },
  update(dt) {
    if (!this.g) return; const sw = Math.sin(W.t * 7) * (P.noise ? 0.012 : 0.003);
    this.g.visible = P.alive && !P.camUp; this.g.position.y = -0.32 + sw;
    this.cam.visible = P.slot === 0; this.rl.visible = P.rec && W.t % 1 < 0.6;
    const it = P.slot > 0 ? P.inv[P.slot - 1] : null; Object.entries(this.items).forEach(([k, p]) => p.visible = !!it && it.k === k);
  },
};

/* ---------------- main loop ---------------- */
let _last = performance.now(), _hudT = 0;
function frame(now) { requestAnimationFrame(frame); step(now); }
// keeps the host's world running when its tab is in the background (browsers pause animation frames there)
setInterval(() => { const now = performance.now(); if (now - _last > 300 && G.mode === 'play') { let t = _last; const end = Math.min(now, _last + 1000); while (end - t > 1) { t = Math.min(end, t + 50); step(t, true); } _last = now; } }, 250);
function step(now, bg) {
  const dt = Math.min(0.05, (now - _last) / 1000); _last = now; W.t += dt; SIG.uTime.value = W.t;
  try {
    if (G.mode === 'play') {
      UI.keys(); updatePlayer(dt);
      const area = P.area;
      if (W._area !== area) { W._area = area; setLook(area); setAmbience(area); UI.signalOverlay(area === 'sig'); }
      if (SURF.group) SURF.group.visible = area === 'surf';
      if (MAP.group) MAP.group.visible = area === 'sig';
      if (NET.isHost) { buildACT(); if (G.phase === 'dive') { hostMonsters(dt); renderProj(PROJ); } hostBots(dt); hostGame(dt); }
      else { interpMons(dt); updateBotViews(dt); if (G.lever > 0) G.lever = Math.max(0, G.lever - dt); }
      MON.forEach(m => animMon(m, dt));
      if (MAP.artifacts) MAP.artifacts.forEach(a => { const s = a.m.userData.glint; if (s) { s.material.opacity = 0.4 + Math.sin(W.t * 4 + a.x) * 0.4; } });
      updatePlayers(dt); filmTick(dt); updateCamera(dt); netTick(dt);
      _hudT -= dt; if (_hudT <= 0) { _hudT = 0.1; UI.hud(getInteract()); }
    } else titleCam(dt);
    updateFx(dt); UI.tick(dt);
  } catch (e) { console.error(e); }
  if (!bg) W.r.render(W.s, W.cam);
  IN.pr.clear(); IN.dx = 0; IN.dy = 0;
}
function titleCam(dt) {
  const a = W.t * 0.08; W.cam.position.set(Math.sin(a) * 26, 9, Math.cos(a) * 26 - 2); W.cam.lookAt(0, 1.5, -2);
  BOTS.length && hostBots(dt);
}

/* ---------------- start ---------------- */
function initMe() { P.name = (LS.getItem('sl_name') || 'TV Head').slice(0, 16); P.color = LS.getItem('sl_color') || pick(COLORS); }
function startGame(mode) {
  initMe();
  G.mode = 'play'; P.id = myId(); respawnHome(); P.yaw = Math.PI; P.z = -6;
  if (NET.isHost) { const nb = +(LS.getItem('sl_bots') ?? 3); spawnBots(nb); pushGame(); } else spawnBots(0);
  UI.enterGame(mode);
  lockPointer();
}
function boot() {
  initRenderer(); initTouch(); initFaceEditor(); UI.init();
  buildSurface(); VM.init(); setLook('surf'); W._area = 'surf';
  spawnBots(3, true);
  requestAnimationFrame(frame);
}
