'use strict';
/* online multiplayer (PeerJS): the host's browser runs the monsters, bots and days. Friends join with a 4-letter code. */
const NET = { solo: true, isHost: true, peer: null, conns: new Map(), hostConn: null, code: '', tick: 0, gameT: 0, pushAcc: new Map() };
const MAX_PLAYERS = 6;
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const genCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
const PEER_OPTS = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
const PLAYERS = new Map(); // other real players {id,n,c,f,...state, M}
function myId() { return NET.solo || !NET.peer ? 'me' : NET.peer.id; }
function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  if (!window.RTCPeerConnection) return Promise.reject(new Error('Online play is blocked in this preview. Play online at ' + GH_URL));
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error("Couldn't load multiplayer. Online play works at " + GH_URL)); document.head.appendChild(s); });
}
function openPeer(id) {
  return new Promise((res, rej) => {
    let p; try { p = id ? new Peer(id, PEER_OPTS) : new Peer(PEER_OPTS); } catch (e) { rej(new Error('Online play is blocked here. Play online at ' + GH_URL)); return; }
    const to = setTimeout(() => { try { p.destroy(); } catch (e) { } rej(new Error("Couldn't reach the multiplayer server. Try again.")); }, 12000);
    p.on('open', () => { clearTimeout(to); res(p); });
    p.on('error', e => { clearTimeout(to); try { p.destroy(); } catch (er) { } rej(new Error(e.type === 'unavailable-id' ? 'TAKEN' : 'Multiplayer error (' + (e.type || '?') + ')')); });
  });
}

/* ---------- HOST ---------- */
async function netHost() {
  await loadPeerJS();
  let code = genCode(), tries = 0;
  for (; ;) { try { NET.peer = await openPeer('signallost-' + code.toLowerCase()); break; } catch (e) { if (e.message === 'TAKEN' && tries++ < 4) { code = genCode(); continue; } throw e; } }
  NET.solo = false; NET.isHost = true; NET.code = code;
  NET.peer.on('connection', c => {
    c.on('data', d => hostOnData(c, d));
    const drop = () => hostDrop(c.peer); c.on('close', drop); c.on('error', drop);
  });
  NET.peer.on('disconnected', () => { try { NET.peer.reconnect(); } catch (e) { } });
}
function hostOnData(c, d) {
  if (!d || typeof d !== 'object') return; const id = c.peer;
  if (d.t === 'hello') {
    if (NET.conns.size >= MAX_PLAYERS - 1) { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); return; }
    NET.conns.set(id, c);
    const pl = addPlayer(id, String(d.n || 'TV').slice(0, 16), d.c || '#4a7ad8', String(d.f || ''));
    const roster = {}; roster[myId()] = { n: P.name, c: P.color, f: myFace() }; PLAYERS.forEach((p, k) => { if (k !== id) roster[k] = { n: p.n, c: p.c, f: p.f }; });
    c.send({ t: 'welcome', game: gameState(), roster, arts: G.phase === 'dive' && MAP.artifacts ? MAP.artifacts.map(a => [a.id, a.type, a.x, a.z]) : null, mons: G.phase === 'dive' ? [...MON.values()].map(m => [m.id, m.type, m.x, m.z, m.face || null]) : null, gate: MAP.gateOpen || false });
    broadcast({ t: 'pj', id, n: pl.n, c: pl.c, f: pl.f }, id);
    sysChat(pl.n + ' joined the lobby!', '#9be37a');
    return;
  }
  if (!NET.conns.has(id)) return;
  const pl = PLAYERS.get(id);
  if (d.t === 'st' && pl) Object.assign(pl.tg, d.p);
  else if (d.t === 'act' && d.a) hostAct(d.a, id);
}
function hostDrop(id) {
  if (!NET.conns.has(id)) return; NET.conns.delete(id);
  const p = PLAYERS.get(id); if (p) { sysChat(p.n + ' left.', '#ffb0b0'); removePlayer(id); }
  broadcast({ t: 'pl', id });
}
function broadcast(msg, except) { NET.conns.forEach((c, id) => { if (id !== except && c.open) try { c.send(msg); } catch (e) { } }); }
function sendTo(id, msg) { if (id === myId()) { handleEvent(msg); return; } const c = NET.conns.get(id); if (c && c.open) try { c.send(msg); } catch (e) { } }
// host: apply an event here and send it to everyone
function netEvent(ev) { handleEvent(ev); if (!NET.solo) broadcast({ t: 'ev', e: ev }); }

/* ---------- CLIENT ---------- */
async function netJoin(code) {
  code = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); if (code.length !== 4) throw new Error('Lobby codes are 4 letters.');
  initMe(); await loadPeerJS();
  NET.peer = await openPeer(null);
  const c = NET.peer.connect('signallost-' + code.toLowerCase(), { reliable: true }); NET.hostConn = c;
  const w = await new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('No lobby found with code ' + code + '. Make sure the host is still playing.')), 12000);
    c.on('open', () => c.send({ t: 'hello', n: P.name, c: P.color, f: myFace() }));
    c.on('data', d => { if (d && d.t === 'welcome') { clearTimeout(to); res(d); } else if (d && d.t === 'full') { clearTimeout(to); rej(new Error('That lobby is full (6/6).')); } else if (G.mode === 'play') clientOnData(d); });
    NET.peer.on('error', e => { if (e.type === 'peer-unavailable') { clearTimeout(to); rej(new Error('No lobby found with code ' + code + '.')); } });
  });
  NET.solo = false; NET.isHost = false; NET.code = code;
  c.on('close', () => { if (G.mode === 'play') UI.fatal('Lost connection to the host.'); });
  return w;
}
function applyWelcome(w) {
  Object.entries(w.roster || {}).forEach(([id, p]) => addPlayer(id, p.n, p.c, p.f));
  applyGame(w.game, true);
  if (w.game.phase === 'dive') {
    buildMap(w.game.mapType, w.game.seed);
    MAP.artifacts.slice().forEach(a => { if (!w.arts || !w.arts.some(x => x[0] === a.id)) removeArtifact(a.id); });
    (w.mons || []).forEach(([id, type, x, z, face]) => createMon(id, type, x, z, face));
    if (w.gate) openGate();
    UI.banner('Your team is in the Signal World. Wait here for the bell!', '#2fe3c5');
  }
}
function clientOnData(d) {
  if (!d || typeof d !== 'object') return;
  switch (d.t) {
    case 'ps': applyPS(d); break;
    case 'ms': applyMS(d); break;
    case 'ev': handleEvent(d.e); break;
    case 'game': applyGame(d.g); break;
    case 'pj': if (d.id !== myId()) addPlayer(d.id, d.n, d.c, d.f); break;
    case 'pl': removePlayer(d.id); break;
    default: handleEvent(d); // targeted events (hurt, grab, rel, push, got…)
  }
}
function netAct(a) {
  if (NET.solo || NET.isHost) { hostAct(a, myId()); return; }
  if (NET.hostConn && NET.hostConn.open) NET.hostConn.send({ t: 'act', a });
}

/* ---------- per-frame sync ---------- */
function netTick(dt) {
  if (NET.solo) return;
  NET.tick += dt; if (NET.tick < 0.1) return; NET.tick = 0;
  const st = myState();
  if (NET.isHost) {
    const p = {}; p[myId()] = st; PLAYERS.forEach((pl, id) => p[id] = pl.tg);
    broadcast({ t: 'ps', p, b: BOTS.map(botState) });
    if (G.phase === 'dive') broadcast({ t: 'ms', m: [...MON.values()].map(m => [m.id, MTYPES.indexOf(m.type), +m.x.toFixed(2), +m.z.toFixed(2), +m.y.toFixed(2), +m.rot.toFixed(2), m.st, +(m.e || 0).toFixed(2)]), j: PROJ.map(q => [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2), q.kind === 'fire' ? 1 : 0]) });
    NET.pushAcc.forEach((v, id) => { if (Math.abs(v[0]) + Math.abs(v[1]) > 0.001) sendTo(id, { t: 'push', dx: v[0], dz: v[1] }); }); NET.pushAcc.clear();
    NET.gameT += 0.1; if (NET.gameT > 2) { NET.gameT = 0; broadcast({ t: 'game', g: gameState() }); }
  } else if (NET.hostConn && NET.hostConn.open) NET.hostConn.send({ t: 'st', p: st });
}
function applyPS(d) {
  Object.entries(d.p || {}).forEach(([id, s]) => { if (id === myId()) return; const pl = PLAYERS.get(id); if (pl) Object.assign(pl.tg, s); });
  syncBotViews(d.b || []);
}
function applyMS(d) {
  if (G.phase !== 'dive' || !MAP.group) return;
  const seen = new Set();
  d.m.forEach(([id, ti, x, z, y, rot, st, e]) => {
    seen.add(id); let m = MON.get(id); if (!m) m = createMon(id, MTYPES[ti], x, z, null);
    m.nx = x; m.nz = z; m.ny = y; m.nrot = rot; if (m.st !== st) { m.st = st; m.stT = 0; } m.e = e;
  });
  MON.forEach((m, id) => { if (!seen.has(id)) removeMon(id); });
  NET.proj = d.j || [];
}
function interpMons(dt) {
  MON.forEach(m => {
    const ox = m.x, oz = m.z, k = Math.min(1, dt * 10);
    m.x += (m.nx - m.x) * k; m.z += (m.nz - m.z) * k; m.y += (m.ny - m.y) * k; m.rot += angDiff(m.rot, m.nrot) * k; m.stT += dt;
    m.spd = lerp(m.spd || 0, Math.hypot(m.x - ox, m.z - oz) / Math.max(dt, 1e-3), Math.min(1, dt * 6));
  });
  renderProj((NET.proj || []).map(([x, y, z, k]) => ({ x, y, z, kind: k ? 'fire' : 'bullet' })));
}
