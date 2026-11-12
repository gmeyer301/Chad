'use strict';
/* GARDEN TIME — online multiplayer (PeerJS: the host's browser runs the world, friends join with a 4-letter code) */
const NET = { solo: true, isHost: true, peer: null, conns: new Map(), hostConn: null, code: '', myPlot: 0, plots: {}, gsnaps: {}, tick: 0, gdT: 0 };
const MAX_PLAYERS = 6;
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const genCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
const PEER_OPTS = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
function myId() { return NET.solo || !NET.peer ? 'me' : NET.peer.id; }
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  if (!window.RTCPeerConnection) return Promise.reject(new Error('Online play is blocked here. Play online at ' + GH_URL));
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error("Couldn't load multiplayer. Check your internet and try again.")); document.head.appendChild(s); });
}
function openPeer(id) {
  return new Promise((res, rej) => {
    const p = id ? new Peer(id, PEER_OPTS) : new Peer(PEER_OPTS);
    const to = setTimeout(() => { try { p.destroy(); } catch (e) { } rej(new Error("Couldn't reach the multiplayer server. Try again.")); }, 12000);
    p.on('open', () => { clearTimeout(to); res(p); });
    p.on('error', e => { clearTimeout(to); try { p.destroy(); } catch (er) { } rej(new Error(e.type === 'unavailable-id' ? 'TAKEN' : 'Multiplayer error (' + (e.type || '?') + ')')); });
  });
}

/* ---------- HOST ---------- */
async function netHost() {
  await loadPeerJS();
  let code = genCode(), tries = 0;
  for (;;) { try { NET.peer = await openPeer('gardentime-' + code.toLowerCase()); break; } catch (e) { if (e.message === 'TAKEN' && tries++ < 4) { code = genCode(); continue; } throw e; } }
  NET.solo = false; NET.isHost = true; NET.code = code; NET.myPlot = 0;
  NET.peer.on('connection', c => {
    c.on('data', d => hostOnData(c, d));
    const drop = () => hostDrop(c.peer); c.on('close', drop); c.on('error', drop);
  });
  NET.peer.on('disconnected', () => { try { NET.peer.reconnect(); } catch (e) { } });
}
function hostOnData(c, d) {
  if (!d || typeof d !== 'object') return;
  const id = c.peer;
  if (d.t === 'hello') {
    if (NET.conns.size >= MAX_PLAYERS - 1) { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); return; }
    const used = new Set([NET.myPlot].concat(Object.values(NET.plots)));
    let plot = -1; for (let i = 0; i < PLOTS.length; i++) if (!used.has(i)) { plot = i; break; }
    if (plot < 0) { c.send({ t: 'full' }); return; }
    removeBotAt(plot); NET.plots[id] = plot; NET.conns.set(id, c);
    const r = addRemote(id, String(d.n || 'Crab').slice(0, 16), d.c || '#ff7a3a', plot, false);
    c.send({ t: 'welcome', plot, world: worldState() });
    netChat('[SYSTEM] ' + r.n + ' joined the garden!', '#9be37a', true);
    return;
  }
  if (!NET.conns.has(id)) return;
  const r = G.remotes[id];
  if (d.t === 'st' && r) Object.assign(r.tgt, d.p);
  else if (d.t === 'gd') { NET.gsnaps[id] = d.g; applySnap(id, NET.plots[id], d.g, 'player'); }
  else if (d.t === 'chat') { const text = String(d.text || '').slice(0, 160); showChat(r ? r.n : '?', text, r ? r.c : '#fff'); broadcast({ t: 'chat', n: r ? r.n : '?', c: r ? r.c : '#fff', text }, id); botsHear(id, r ? r.n : '?', text); }
  else if (d.t === 'act' && d.a) routeAct(d.a, id);
}
function hostDrop(id) {
  if (!NET.conns.has(id)) return; NET.conns.delete(id);
  const r = G.remotes[id]; if (r) { netChat('[SYSTEM] ' + r.n + ' left.', '#ffb0b0', true); removeRemote(id); }
  const plot = NET.plots[id]; delete NET.plots[id]; delete NET.gsnaps[id];
  if (plot != null) { const used = new Set(G.bots.map(b => b.name)); addBot(plot, BOT_NAMES.find(n => !used.has(n)) || 'Crab' + rndi(10, 99)); }
}
function broadcast(msg, except) { NET.conns.forEach((c, id) => { if (id !== except && c.open) try { c.send(msg); } catch (e) { } }); }
function worldState() { return { w: G.weather, wt: G.wtLeft, stock: G.stock, rid: G.rid, ri: G.restockIn, boss: bossState() }; }
function bossState() { const B = G.boss; if (!B) return null; return { alive: B.alive, dead: B.dead, hp: B.hp, max: B.max, x: +B.x.toFixed(2), y: +B.y.toFixed(2), z: +B.z.toFixed(2), parts: B.parts, phase: B.phase }; }
function netBroadcastWorld() { if (!NET.solo && NET.isHost) broadcast({ t: 'world', ...worldState() }); }
function gardenSnap(g) { return g.plants.map(p => { const d = PLANT[p.id]; return [p.u, p.id, Math.round(p.x * 10), Math.round(p.z * 10), Math.round(Math.min(1, p.gp / d.g) * 100), p.f.map(f => [Math.round(Math.min(1, f.fp / d.fr) * 100), Math.round(f.w * 100), f.m.join('|')])]; }); }

/* ---------- CLIENT ---------- */
async function netJoin(code) {
  code = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); if (code.length !== 4) throw new Error('Lobby codes are 4 letters.');
  await loadPeerJS();
  NET.peer = await openPeer(null);
  const c = NET.peer.connect('gardentime-' + code.toLowerCase(), { reliable: true }); NET.hostConn = c;
  await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('No garden found with code ' + code + '. Make sure the host is still playing.')), 12000);
    c.on('open', () => { G.myColor = randomColor(); c.send({ t: 'hello', n: S.name, c: G.myColor }); });
    c.on('data', d => { if (d && d.t === 'welcome') { clearTimeout(to); NET.myPlot = d.plot; applyWorld(d.world, true); res(); } else if (d && d.t === 'full') { clearTimeout(to); rej(new Error('That garden is full (6/6).')); } else clientOnData(d); });
    NET.peer.on('error', e => { if (e.type === 'peer-unavailable') { clearTimeout(to); rej(new Error('No garden found with code ' + code + '.')); } });
  });
  NET.solo = false; NET.isHost = false; NET.code = code;
  c.on('close', () => { if (G.mode === 'play') { save(); UI.fatal('Lost connection to the host. Your progress is saved.'); } });
}
function clientOnData(d) {
  if (!d || typeof d !== 'object' || G.mode !== 'play') { if (d && d.t === 'world') applyWorld(d, false); return; }
  if (d.t === 'ps') {
    const seen = new Set();
    Object.entries(d.p).forEach(([id, p]) => { if (id === myId()) return; seen.add(id); const r = G.remotes[id] || addRemote(id, p.n, p.c, p.pl, false); Object.assign(r.tgt, p); });
    (d.b || []).forEach(b => { const id = 'bot:' + b.n; seen.add(id); const r = G.remotes[id] || addRemote(id, b.n, b.c, b.pl, true); Object.assign(r.tgt, b); if (b.say && b.say !== r.lastSay) { r.lastSay = b.say; remoteBubble(r, b.say); } });
    Object.keys(G.remotes).forEach(id => { if (!seen.has(id)) removeRemote(id); });
    if (d.boss !== undefined) applyBoss(d.boss);
  } else if (d.t === 'gds') {
    Object.entries(d.g).forEach(([owner, snap]) => { if (owner === myId()) return; const r = G.remotes[owner]; if (r) applySnap(owner, r.plot, snap, r.bot ? 'bot' : 'player'); });
  } else if (d.t === 'world') applyWorld(d, false);
  else if (d.t === 'chat') showChat(d.n, d.text, d.c);
  else if (d.t === 'act') handleAct(d.a);
}
function applyWorld(w, first) {
  if (!w) return;
  if (w.stock) { const changed = G.rid !== w.rid; G.stock = w.stock; G.rid = w.rid; G.restockIn = w.ri; if (changed && !first && G.mode === 'play') onRestock(); }
  if (w.w !== G.weather) { if (w.w) { if (G.mode === 'play') startWeather(w.w, w.wt); else { G.weather = w.w; G.wtLeft = w.wt; } } else if (G.mode === 'play') endWeather(); else G.weather = null; }
  else G.wtLeft = w.wt;
  if (w.boss !== undefined && G.mode === 'play') applyBoss(w.boss);
}
function applyBoss(b) {
  if (!b) { if (G.boss) G.boss = null; return; }
  const was = G.boss; if (!was && b.alive) { UI.banner('🐦‍⬛ THE LORD CROW HAS ARRIVED! PINCH HIM! 🐦‍⬛', '#ff3b3b'); sfx('boss'); }
  if (was && was.alive && b.dead) { UI.banner('🏆 THE LORD CROW HAS FALLEN! CLAIM YOUR REWARD! 🏆', '#ffd23d'); }
  G.boss = Object.assign(was || {}, b);
}

/* ---------- remotes (other players + bots seen by a client) ---------- */
function addRemote(id, n, c, plot, bot) {
  const r = { id, n, c, plot, bot, x: PLOTS[plot] ? PLOTS[plot].x : 0, z: PLOTS[plot] ? PLOTS[plot].z : 0, y: 0, r: 0, tgt: { x: 0, z: 0, y: 0, r: 0 }, mesh: makeCrab(c) };
  r.tgt.x = r.x; r.tgt.z = r.z;
  const tag = textSprite(n + (bot ? ' 🤖' : ''), bot ? '#d8f0ff' : '#ffffff', null, 0.42); tag.position.y = 1.7; r.mesh.add(tag);
  W.s.add(r.mesh); G.remotes[id] = r; if (plot != null && !bot) plotSign(plot, n, '#7a3a8a'); else if (plot != null) plotSign(plot, n, '#3a5a8a');
  return r;
}
function removeRemote(id) {
  const r = G.remotes[id]; if (!r) return; W.s.remove(r.mesh); delete G.remotes[id];
  const g = G.gardens.find(x => x.owner === id); if (g) { destroyGarden(g); G.gardens.splice(G.gardens.indexOf(g), 1); }
}
function remoteBubble(r, text) { if (r.bubble) r.mesh.remove(r.bubble); r.bubble = textSprite(text.length > 42 ? text.slice(0, 40) + '…' : text, '#222', 'rgba(255,255,255,.92)', 0.38); r.bubble.position.y = 2.35; r.mesh.add(r.bubble); r.bubbleT = 5; }
function updateRemotes(dt) {
  Object.values(G.remotes).forEach(r => {
    const t = r.tgt; const ox = r.x, oz = r.z;
    r.x += (t.x - r.x) * Math.min(1, dt * 10); r.z += (t.z - r.z) * Math.min(1, dt * 10); r.y += ((t.y || 0) - r.y) * Math.min(1, dt * 10);
    let dr = (t.r || 0) - r.r; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); r.r += dr * Math.min(1, dt * 10);
    if (t.pl != null && t.pl !== r.plot) r.plot = t.pl;
    r.mesh.position.set(r.x, r.y, r.z); r.mesh.rotation.y = r.r; r.mesh.scale.setScalar(t.big ? 2.5 : 1);
    animCrab(r.mesh, Math.hypot(r.x - ox, r.z - oz) / dt / 7, dt, t.pin || 0);
    if (r.bubble) { r.bubbleT -= dt; if (r.bubbleT <= 0) { r.mesh.remove(r.bubble); r.bubble = null; } }
  });
}
function applySnap(owner, plot, snap, kind) {
  if (plot == null || !Array.isArray(snap)) return;
  let g = G.gardens.find(x => x.owner === owner);
  if (!g) { g = makeGarden(plot, owner, kind); G.gardens.push(g); }
  const seen = new Set();
  snap.forEach(([u, id, x10, z10, gf, fr]) => {
    const d = PLANT[id]; if (!d) return; seen.add(u);
    let p = g.plants.find(q => q.u === u);
    if (!p) { p = { u, id, x: x10 / 10, z: z10 / 10, gp: 0, f: [] }; g.plants.push(p); fr.forEach(() => p.f.push({ fp: 0, w: d.w, m: [] })); buildPlantMesh(g, p); }
    if (p.x !== x10 / 10 || p.z !== z10 / 10) { p.x = x10 / 10; p.z = z10 / 10; p.mesh.position.set(p.x, 0, p.z); }
    p.gp = gf / 100 * d.g;
    fr.forEach((f, i) => { if (!p.f[i]) p.f[i] = { fp: 0, w: d.w, m: [] }; p.f[i].fp = f[0] / 100 * d.fr; p.f[i].w = f[1] / 100; p.f[i].m = f[2] ? f[2].split('|') : []; });
  });
  for (let i = g.plants.length - 1; i >= 0; i--) if (!seen.has(g.plants[i].u)) { g.group.remove(g.plants[i].mesh); g.plants.splice(i, 1); }
}

/* ---------- per-frame networking ---------- */
function netTick(dt) {
  if (NET.solo) return;
  NET.tick += dt; if (NET.tick < 0.1) return; NET.tick = 0;
  const me = G.me; const st = { n: S.name, c: me.color, x: +me.x.toFixed(2), z: +me.z.toFixed(2), y: +me.y.toFixed(2), r: +me.rot.toFixed(2), pin: me.pinch > 0 ? 0.3 : 0, pl: NET.myPlot, big: G.big ? 1 : 0 };
  if (NET.isHost) {
    const p = {}; p[myId()] = st;
    Object.values(G.remotes).forEach(r => { if (!r.bot) p[r.id] = { n: r.n, c: r.tgt.c || r.c, x: r.tgt.x, z: r.tgt.z, y: r.tgt.y, r: r.tgt.r, pin: r.tgt.pin, pl: r.plot, big: r.tgt.big }; });
    const b = G.bots.map(x => ({ n: x.name, c: x.color, x: +x.x.toFixed(2), z: +x.z.toFixed(2), y: +x.y.toFixed(2), r: +x.rot.toFixed(2), pin: x.pinchT > 0 ? 0.3 : 0, pl: x.plot, say: x.bubble ? x.recent[x.recent.length - 1] : '' }));
    broadcast({ t: 'ps', p, b, boss: bossState() });
    NET.gdT += 0.1; if (NET.gdT >= 2) { NET.gdT = 0; const gs = {}; gs[myId()] = gardenSnap(G.myGarden); G.bots.forEach(x => gs['bot:' + x.name] = gardenSnap(x.garden)); Object.assign(gs, NET.gsnaps); broadcast({ t: 'gds', g: gs }); }
  } else if (NET.hostConn && NET.hostConn.open) {
    // color is sent each tick so others see my random color
    NET.hostConn.send({ t: 'st', p: st });
  }
}
function sendGarden(now) { if (NET.solo || NET.isHost || !NET.hostConn || !NET.hostConn.open || !G.myGarden) return; NET.hostConn.send({ t: 'gd', g: gardenSnap(G.myGarden) }); }

/* ---------- chat ---------- */
function netChat(text, color, system, nameOverride) {
  const name = nameOverride || (system ? '' : S.name); const c = color || (G.me ? G.me.color : '#fff');
  showChat(name, text, c);
  if (NET.solo) { if (!system && !nameOverride) botsHear(myId(), S.name, text); return; }
  if (NET.isHost) { broadcast({ t: 'chat', n: name, c, text }); if (!system && !nameOverride) botsHear(myId(), S.name, text); }
  else if (!system) NET.hostConn && NET.hostConn.open && NET.hostConn.send({ t: 'chat', text });
}
function showChat(name, text, color) { UI.addChat(name, text, color); }

/* ---------- actions between players ---------- */
function netAct(a) {
  a.from = myId(); a.fromName = S.name;
  if (NET.solo) { if (a.to !== 'all') handleAct(a); return; }
  if (NET.isHost) { routeAct(a, null); return; }
  NET.hostConn && NET.hostConn.open && NET.hostConn.send({ t: 'act', a });
}
function routeAct(a, fromConn) {
  if (fromConn) a.from = fromConn;
  if (a.to === 'all') { if (fromConn) handleAct(a); broadcast({ t: 'act', a }, fromConn); return; }
  if (a.to === 'host' || a.to === myId() || a.to === S.name || String(a.to).startsWith('bot:') || G.bots.some(b => b.name === a.to)) { handleAct(a); return; }
  const c = NET.conns.get(a.to); if (c && c.open) c.send({ t: 'act', a });
}
function handleAct(a) {
  const fromName = a.fromName || (G.remotes[a.from] && G.remotes[a.from].n) || a.from;
  switch (a.t) {
    case 'steal': {
      let g = G.gardens.find(x => x.plot === a.plot && (x === G.myGarden || x.kind === 'bot'));
      if (!g || (g !== G.myGarden && !NET.isHost)) return;
      const p = g.plants.find(q => q.u === a.u); if (!p || !ripeCount(p)) return;
      const got = harvestPlant(g, p).slice(0, 1); if (!got.length) return;
      if (g === G.myGarden) toast('😠 ' + (a.by || fromName) + ' stole your ' + PLANT[p.id].n + '! Get Defence Plants!');
      else { const b = G.bots.find(x => x.garden === g); if (b) botNotice(b, 'stolen', a.by || fromName); }
      if (!a.bot) netAct({ t: 'gift', to: a.from, fruit: got[0], src: g === G.myGarden ? S.name : g.owner, stolen: 1 });
      else { const thief = G.bots.find(x => x.name === a.by); if (thief) thief.backpack.push(got[0]); }
      sendGarden(true); break;
    }
    case 'gift': {
      if (a.admin && !(a.tok && checkTokSync(a.tok))) return;
      const toBot = String(a.to).startsWith('bot:') ? a.to.slice(4) : (G.bots.some(b => b.name === a.to) ? a.to : null);
      if (toBot) { const b = G.bots.find(x => x.name === toBot); if (b) { if (a.money) b.money += a.money; if (a.fruit) b.backpack.push(a.fruit); if (a.admin && a.money) setTimeout(() => botSay(b, pick(['THANK YOU HENRY 🙏', 'admin gave me ' + fmt(a.money) + '!!!', 'W ADMIN'])), 1200); } return; }
      if (a.money) { S.money += a.money; toast((a.admin ? '👑 ' : '💸 ') + (a.src || fromName) + ' gave you ' + fmt(a.money)); UI.refreshMoney(); }
      if (a.fruit) { S.backpack.push(a.fruit); toast(a.stolen ? '🤫 You stole a ' + PLANT[a.fruit.id].n + '!' : '🎁 ' + (a.src || fromName) + ' gave you a ' + PLANT[a.fruit.id].n); }
      if (a.seed && PLANT[a.seed]) { S.seeds[a.seed] = (S.seeds[a.seed] || 0) + (a.n || 1); toast('👑 Admin gave you ' + (a.n || 1) + 'x ' + PLANT[a.seed].n + ' seed!'); UI.refreshHotbar(); }
      if (a.pet && PET[a.pet]) { givePet(a.pet); toast('👑 Admin gave you a ' + PET[a.pet].n + '!'); }
      if (a.gear && GEARD[a.gear]) { S.gear[a.gear] = (S.gear[a.gear] || 0) + (a.n || 1); if (GEARD[a.gear].uses && !S.gearUses[a.gear]) S.gearUses[a.gear] = GEARD[a.gear].uses; UI.refreshHotbar(); toast('👑 Admin gave you ' + GEARD[a.gear].n); }
      break;
    }
    case 'knock': {
      if (String(a.to).startsWith('bot:')) { const b = G.bots.find(x => x.name === a.to.slice(4)); if (b) { if (a.type === 'glitch') { b.x = rnd(-50, 50); b.z = 50; } else { b.kb = { x: a.kx, z: a.kz }; b.vy = a.up; } b.goal = null; botNotice(b, 'defended', fromName); } return; }
      applyKnock(a.kx, a.kz, a.up, a.type, fromName); break;
    }
    case 'egg': { const g = G.gardens.find(x => x.plot === a.plot && (x === G.myGarden || x.kind === 'bot')); if (!g) return; const p = g.plants.find(q => q.u === a.u); if (p) { eggPlant(g, p); if (g === G.myGarden) toast('🥚 ' + fromName + ' egged your ' + PLANT[p.id].n + '! (it grew faster + Pranked)'); } break; }
    case 'strike': if (!NET.isHost) strike(a.x, a.z); break;
    case 'meteor': if (!NET.isHost) meteor(a.x, a.z); break;
    case 'feather': if (!NET.isHost) fxProjectile(new THREE.Vector3(a.fx, a.fy, a.fz), new THREE.Vector3(a.x, 0.5, a.z), '#111', 0.25, () => featherHit(a.x, a.z), 18); break;
    case 'hit': if (NET.isHost) bossDamage(a.id || a.from, 2); break;
    case 'hurt': hurtMe(a.kx, a.kz); break;
    case 'admin': if (NET.isHost && a.tok && checkTokSync(a.tok)) runAdminWorld(a); break;
    case 'announce': if (a.tok && checkTokSync(a.tok)) UI.banner('👑 ' + a.text, '#ffd23d'); break;
    case 'grow': if (a.tok && checkTokSync(a.tok)) { G.myGarden.plants.forEach(p => { const d = PLANT[p.id]; p.gp = d.g; p.f.forEach(f => f.fp = d.fr); }); toast('👑 Admin grew your whole garden!'); } break;
  }
}
