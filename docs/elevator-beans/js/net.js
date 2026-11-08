'use strict';
/* Elevator Beans: online lobbies (up to 5 beans).
   On GitHub Pages the host's browser is the hub (PeerJS). Inside claude.ai the built-in room is used. */
const NET = { solo: true, isHost: true, room: null, code: '', acts: [], seq: 0, seen: {}, hostSeenAt: 0, sendT: 0, lastPres: '' };
const IN_CLAUDE = !!(window.claude && window.claude.use);
const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const genCode = () => Array.from({ length: 4 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join('');
async function getRoomCap() { try { if (!IN_CLAUDE) return null; return await window.claude.use('room'); } catch (e) { return null; } }

function loadPeerJS() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = () => res(); s.onerror = () => rej(new Error("Couldn't load the multiplayer system. Check your internet and try again.")); document.head.appendChild(s); });
}
const PEER_OPTS = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
const NO_LOBBY = code => 'No lobby found with code ' + code + '. Check the code and make sure the host is still in the game.';
async function p2pRoom(code, host) {
  await loadPeerJS();
  const hid = 'elevatorbeans-' + code.toLowerCase();
  const R = { myId: null, myPres: {}, others: new Map(), conns: new Map(), hostConn: null, cbs: [], errCbs: [], prev: new Map(), closed: false };
  const peer = await new Promise((res, rej) => {
    const p = host ? new Peer(hid, PEER_OPTS) : new Peer(PEER_OPTS);
    const to = setTimeout(() => { try { p.destroy(); } catch (e) { } rej(new Error("Couldn't reach the multiplayer server. Try again in a moment.")); }, 12000);
    p.on('open', () => { clearTimeout(to); res(p); });
    p.on('error', e => { clearTimeout(to); try { p.destroy(); } catch (er) { } rej(new Error(e.type === 'unavailable-id' ? 'TAKEN' : 'Multiplayer error (' + (e.type || 'unknown') + '). Try again.')); });
  });
  R.peer = peer; R.myId = peer.id;
  R.peers = () => [{ peer: R.myId, sameTab: true, isMe: true, kind: 'viewer', presence: R.myPres }, ...[...R.others.entries()].map(([k, v]) => ({ peer: k, sameTab: false, isMe: false, kind: 'viewer', presence: v }))];
  const emit = () => { const ps = R.peers(); const ids = new Set(ps.map(p => p.peer)); const joined = ps.filter(p => !R.prev.has(p.peer)); const left = [...R.prev.values()].filter(p => !ids.has(p.peer)); R.prev = new Map(ps.map(p => [p.peer, p])); if (joined.length || left.length) R.cbs.forEach(cb => { try { cb({ peers: ps, joined, left, updated: [] }); } catch (e) { } }); };
  R.onPeers = (cb, err) => { R.cbs.push(cb); if (err) R.errCbs.push(err); setTimeout(emit, 0); return () => { }; };
  R.fail = msg => { if (R.closed) return; R.errCbs.forEach(f => f({ code: 'upstream_error', message: msg })); };
  peer.on('error', e => { if (R.closed || e.type === 'peer-unavailable') return; if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') { try { peer.reconnect(); } catch (er) { } } });
  if (host) {
    peer.on('connection', c => {
      c.on('open', () => { if (R.conns.size >= MAX_PLAYERS - 1) { try { c.send({ t: 'full' }); } catch (e) { } setTimeout(() => c.close(), 600); return; } R.conns.set(c.peer, c); });
      c.on('data', d => { if (d && d.t === 'p' && d.pr && typeof d.pr === 'object' && R.conns.has(c.peer)) R.others.set(c.peer, d.pr); });
      const drop = () => { R.conns.delete(c.peer); R.others.delete(c.peer); emit(); }; c.on('close', drop); c.on('error', drop);
    });
    peer.on('disconnected', () => { if (!R.closed) try { peer.reconnect(); } catch (e) { } });
    R.bcast = setInterval(() => { const all = {}; all[R.myId] = R.myPres; R.others.forEach((v, k) => all[k] = v); R.conns.forEach(c => { if (c.open) try { c.send({ t: 'all', all }); } catch (e) { } }); emit(); }, 70);
  } else {
    const c = peer.connect(hid, { reliable: true }); R.hostConn = c;
    await new Promise((res, rej) => {
      const to = setTimeout(() => { R.closed = true; try { peer.destroy(); } catch (e) { } rej(new Error(NO_LOBBY(code))); }, 12000);
      c.on('open', () => { clearTimeout(to); res(); });
      peer.on('error', e => { if (e.type === 'peer-unavailable') { clearTimeout(to); R.closed = true; try { peer.destroy(); } catch (er) { } rej(new Error(NO_LOBBY(code))); } });
    });
    c.on('data', d => { if (!d) return; if (d.t === 'full') { R.full = true; return; } if (d.t === 'all' && d.all) { R.others.clear(); Object.entries(d.all).forEach(([k, v]) => { if (k !== R.myId && v) R.others.set(k, v); }); emit(); } });
    c.on('close', () => { R.others.clear(); emit(); R.fail('Lost connection to the host.'); });
  }
  R.presence = async patch => { Object.keys(patch).forEach(k => { if (patch[k] === null) delete R.myPres[k]; else R.myPres[k] = patch[k]; }); if (!host && R.hostConn && R.hostConn.open) { try { R.hostConn.send({ t: 'p', pr: R.myPres }); } catch (e) { } } };
  R.leave = async () => { R.closed = true; clearInterval(R.bcast); try { peer.destroy(); } catch (e) { } };
  R.connected = () => !peer.disconnected;
  return R;
}
const CLAUDE_MP_MSG = "Live rooms on claude.ai only connect people in the same Claude organization, so friends on their own accounts can't join here. Play the GitHub version with friends instead: " + GH_URL;
function hookRoom() {
  NET.room.onPeers(ch => {
    ch.joined.forEach(p => { if (!p.sameTab && p.presence && p.presence.n) toast(p.presence.n + ' joined the elevator'); });
    ch.left.forEach(p => { if (!p.sameTab) toast(((p.presence && p.presence.n) || 'Someone') + ' left'); });
  }, e => onNetLost((e && e.message) || 'Lost connection to the lobby.'));
}
async function netHost() {
  let code = genCode();
  if (IN_CLAUDE) { const lobby = await getRoomCap(); if (!lobby) throw new Error(CLAUDE_MP_MSG); NET.room = await lobby.join('eb-' + code.toLowerCase()); }
  else { let tries = 0; for (;;) { try { NET.room = await p2pRoom(code, true); break; } catch (e) { if (e.message === 'TAKEN' && tries++ < 4) { code = genCode(); continue; } throw e; } } }
  NET.solo = false; NET.isHost = true; NET.code = code; NET.seen = {}; hookRoom(); sendPresence(true);
}
async function netJoin(code) {
  code = code.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); if (code.length !== 4) throw new Error('Lobby codes are 4 letters.');
  if (IN_CLAUDE) { const lobby = await getRoomCap(); if (!lobby) throw new Error(CLAUDE_MP_MSG); try { NET.room = await lobby.join('eb-' + code.toLowerCase()); } catch (e) { throw new Error(CLAUDE_MP_MSG); } }
  else NET.room = await p2pRoom(code, false);
  NET.solo = false; NET.isHost = false; NET.code = code; hookRoom(); sendPresence(true);
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (NET.room.full) { await netLeave(); throw new Error('That elevator is full (5/5).'); }
    const h = NET.room.peers().find(p => !p.sameTab && p.presence && p.presence.h === 1);
    if (h) { NET.hostSeenAt = performance.now(); if (NET.room.peers().filter(p => p.presence && p.presence.u).length > MAX_PLAYERS) { await netLeave(); throw new Error('That elevator is full (5/5).'); } return; }
  }
  await netLeave(); throw new Error(IN_CLAUDE ? CLAUDE_MP_MSG : NO_LOBBY(code));
}
async function netLeave() { if (NET.room) { try { await NET.room.leave(); } catch (e) { } } NET.room = null; NET.solo = true; NET.isHost = true; NET.code = ''; NET.acts = []; NET.seen = {}; }
/* actions I did that the host must apply (picking things up, spraying, etc.) */
function myAct(...a) {
  NET.seq++; const act = [NET.seq, ...a];
  if (NET.isHost) hostAct(MY_UID, act);
  else { NET.acts.push(act); if (NET.acts.length > 14) NET.acts.shift(); }
}
function remotePeers() { if (!NET.room) return []; return NET.room.peers().filter(p => !p.sameTab && p.kind === 'viewer' && p.presence && p.presence.u && p.presence.u !== MY_UID); }
function sendPresence(force) {
  if (!NET.room) return;
  const pr = { u: MY_UID, h: NET.isHost ? 1 : 0, n: P.name, c: P.color, k: P.skin, ht: P.hat, p: [r2(ME.x), r2(ME.y), r2(ME.z), r2(ME.yaw)],
    f: (ME.alive ? 1 : 0) | (ME.ghost ? 2 : 0) | (ME.climb ? 4 : 0) | (ME.spray ? 8 : 0) | (ME.rag > 0 ? 16 : 0) | (ME.gr ? 0 : 32), ca: ME.carry, a: NET.acts };
  if (ME.sees && ME.sees.length) pr.s = ME.sees;
  if (NET.isHost) pr.g = G;
  const s = JSON.stringify(pr); if (!force && s === NET.lastPres) return; NET.lastPres = s;
  NET.room.presence(pr).catch(e => { if (e && e.code === 'invalid_argument' && pr.g) { pr.g = Object.assign({}, G, { e: G.e.slice(0, 8), i: G.i.slice(0, 10) }); NET.room.presence(pr).catch(() => { }); } });
}
function netTick(dt) {
  if (NET.solo || !NET.room) return;
  NET.sendT -= dt; if (NET.sendT <= 0) { NET.sendT = .05; sendPresence(); }
  const ps = remotePeers();
  if (NET.isHost) {
    ps.forEach(p => { const pr = p.presence, u = pr.u; const seen = NET.seen[u] || 0; let mx = seen; (pr.a || []).forEach(a => { if (Array.isArray(a) && a[0] > seen) { hostAct(u, a); mx = Math.max(mx, a[0]); } }); NET.seen[u] = mx; });
  } else {
    const h = ps.find(p => p.presence.h === 1);
    if (h && h.presence.g) { NET.hostSeenAt = performance.now(); applyHostState(h.presence.g); }
    else if (performance.now() - NET.hostSeenAt > 9000) onNetLost('The host left, so the elevator shut down.');
  }
}
