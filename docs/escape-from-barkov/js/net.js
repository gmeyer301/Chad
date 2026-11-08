/* Escape from Barkov — squads & multiplayer raids (PeerJS, the squad leader's browser relays) */
'use strict';
(() => {
const $ = G.$, h = G.h, I = G.ITEMS;
const N = G.NET = { lobby: null, isHost: false, code: '', members: new Map(), myId: null, mode: 'coop', cfg: null, conns: new Map(), hostConn: null, peer: null };
const PEER_OPTS = { config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };
const GH_URL = 'https://gmeyer301.github.io/Chad/escape-from-barkov/';
function loadPeer() { if (window.Peer) return Promise.resolve(); return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'; s.onload = res; s.onerror = () => rej(new Error('Couldn\'t load the multiplayer system. Check your internet.')); document.head.appendChild(s); }); }
const genCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
const me = () => ({ id: N.myId, name: G.S.name, lvl: G.level(), fac: G.S.faction, ready: false, host: N.isHost, inRaid: false });

/* ---------- transport ---------- */
function rawSend(c, m) { try { if (c && c.open) c.send(m); } catch (e) { } }
// broadcast to everyone else
N.send = (m) => { m.f = N.myId; if (N.isHost) N.conns.forEach(c => rawSend(c, m)); else rawSend(N.hostConn, m); };
N.sendTo = (to, m) => { m.f = N.myId; m.to = to; if (N.isHost) rawSend(N.conns.get(to), m); else rawSend(N.hostConn, m); };
function onMsg(m, fromConn) {
  if (!m || typeof m !== 'object') return;
  if (N.isHost && fromConn) { m.f = fromConn.peer; // relay
    if (m.to) { if (m.to !== N.myId) { rawSend(N.conns.get(m.to), m); return; } }
    else N.conns.forEach((c, id) => { if (id !== fromConn.peer) rawSend(c, m); });
  }
  handle(m);
}

async function open(code, host) {
  await loadPeer();
  const hid = 'barkov-' + code.toLowerCase();
  const peer = await new Promise((res, rej) => { const p = host ? new Peer(hid, PEER_OPTS) : new Peer(PEER_OPTS); const to = setTimeout(() => { try { p.destroy(); } catch (e) { } rej(new Error('Couldn\'t reach the multiplayer server. Try again.')); }, 12000);
    p.on('open', () => { clearTimeout(to); res(p); }); p.on('error', e => { clearTimeout(to); try { p.destroy(); } catch (er) { } rej(new Error(e.type === 'unavailable-id' ? 'TAKEN' : 'Multiplayer error (' + e.type + ')')); }); });
  N.peer = peer; N.myId = peer.id; N.isHost = host; N.code = code;
  peer.on('error', e => { if (e.type === 'peer-unavailable') return; if (['network', 'server-error', 'socket-error'].includes(e.type)) try { peer.reconnect(); } catch (er) { } });
  peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { } });
  if (host) {
    peer.on('connection', c => {
      c.on('open', () => { if (N.conns.size >= 5) { rawSend(c, { t: 'full' }); setTimeout(() => c.close(), 500); return; } N.conns.set(c.peer, c); });
      c.on('data', d => onMsg(d, c));
      const drop = () => { N.conns.delete(c.peer); const m = N.members.get(c.peer); N.members.delete(c.peer); if (m) G.toast(m.name + ' left the squad'); if (G.R && G.R.remotes.has(c.peer)) remoteGone(c.peer, true); roster(); };
      c.on('close', drop); c.on('error', drop);
    });
    N.members.set(N.myId, me());
  } else {
    const c = peer.connect(hid, { reliable: true }); N.hostConn = c;
    await new Promise((res, rej) => { const to = setTimeout(() => { try { peer.destroy(); } catch (e) { } rej(new Error('No squad found with code ' + code)); }, 12000);
      c.on('open', () => { clearTimeout(to); res(); }); peer.on('error', e => { if (e.type === 'peer-unavailable') { clearTimeout(to); try { peer.destroy(); } catch (er) { } rej(new Error('No squad found with code ' + code)); } }); });
    c.on('data', d => onMsg(d, null));
    c.on('close', () => { if (!N.lobby) return; G.toast('Lost connection to the squad leader', 'bad'); hostLost(); });
    N.send({ t: 'hello', m: me() });
  }
  N.lobby = true;
}
function hostLost() { const inRaid = G.R && G.R.running && !G.R.over; leave(true); if (inRaid) G.abortRaid('The squad leader disconnected. The raid was called off and your gear is safe.'); else if ($('#menu').classList.contains('on') || $('#prep').classList.contains('on')) G.menu(); }
function leave(silent) { try { N.peer && N.peer.destroy(); } catch (e) { } N.lobby = null; N.peer = null; N.conns.clear(); N.hostConn = null; N.members.clear(); N.cfg = null; N.isHost = false; if (!silent) G.toast('Left the squad'); }
N.leave = () => { leave(); G.menu('squad'); };
function roster() { if (!N.isHost) return; const ms = [...N.members.values()]; N.send({ t: 'roster', ms, mode: N.mode, cfg: N.cfg }); refreshUI(); }
function refreshUI() { if ($('#menu').classList.contains('on') && G.MENU.tab === 'squad') G.menu('squad'); if ($('#prep').classList.contains('on') && G.PREP.step === 'go') G.drawPrep(); if ($('#menu').classList.contains('on')) { const t = document.querySelector('.tab[data-t=squad]'); if (t) t.textContent = 'SQUAD ●'; } }

/* ---------- lobby actions ---------- */
N.setReady = (ready, char, cfg) => {
  const m = N.members.get(N.myId); if (m) { m.ready = ready; m.char = char; }
  if (N.isHost) { if (cfg) { N.cfg = cfg; N.send({ t: 'prep', cfg }); } roster(); }
  else N.send({ t: 'ready', ready, char });
};
N.startRaid = (map, night) => {
  const seed = Math.floor(Math.random() * 1e9); const ids = [...N.members.keys()];
  const nsp = G.MAPS_META[map]; const spawns = {}; const base = Math.floor(Math.random() * 8);
  ids.forEach((id, i) => spawns[id] = N.mode === 'pvp' ? base + i * 3 : base);
  const msg = { t: 'start', seed, map, night, pvp: N.mode === 'pvp', spawns, ids };
  N.send(msg); handle(Object.assign({ f: N.myId }, msg));
};
function handle(m) {
  const R = G.R;
  switch (m.t) {
    case 'hello': if (N.isHost) { N.members.set(m.f, Object.assign(m.m, { id: m.f })); G.toast(m.m.name + ' joined the squad'); roster(); if (N.cfg) N.sendTo(m.f, { t: 'prep', cfg: N.cfg }); } break;
    case 'full': G.toast('That squad is full (5 max)', 'bad'); leave(true); G.menu('squad'); break;
    case 'roster': N.members = new Map(m.ms.map(x => [x.id, x])); N.mode = m.mode; N.cfg = m.cfg; refreshUI(); break;
    case 'ready': if (N.isHost) { const x = N.members.get(m.f); if (x) { x.ready = m.ready; x.char = m.char; } roster(); } break;
    case 'prep': N.cfg = m.cfg; if (!N.isHost && !(G.R && G.R.running)) { G.toast('Squad leader picked ' + G.MAPS_META[m.cfg.map].name + (m.cfg.night ? ' (night)' : '')); if (!$('#prep').classList.contains('on')) G.raidPrep(true); else G.drawPrep(); } break;
    case 'chat': G.toast((N.members.get(m.f) || {}).name + ': ' + m.txt); break;
    case 'start': {
      const mine = N.members.get(N.myId); const scav = mine && mine.char === 'scav';
      N.members.forEach(x => { x.ready = false; x.inRaid = true; });
      G.PREP.ready = false;
      G.goRaid({ map: m.map, night: m.night, seed: m.seed, scav, pvp: m.pvp, host: N.isHost, myId: N.myId, spawnIdx: m.spawns[N.myId], squadSpawn: !m.pvp, team: m.pvp ? N.myId : 'squad', net: raidHooks(), allSpawns: Object.values(m.spawns), delay: 1200 });
      break;
    }
    /* ---- in-raid ---- */
    case 'st': if (R && R.running) { G.remoteUpsert(R, m.f, m.s); } break;
    case 'shot': if (R && R.running) { const sh = R.actors.find(a => a.id === (m.sid || m.f)); if (!sh) break; const am = G.AMMO[m.a]; const fake = { ch: m.a, id: weaponForCal(am.cal), mods: m.s ? { muzzle: { id: 'supp_rifle' } } : {} }; G.fireRound(R, sh, fake, { x: m.o[0], y: m.o[1], z: m.o[2] }, m.d, false, m.e || 0); } break;
    case 'hitP': if (R && R.running && m.to === N.myId) G.localHitFromNet(R, m.part, m.ammo, m.from || m.f); break;
    case 'hitAI': if (R && R.running && N.isHost) G.aiHitFromNet(R, m.id, m.part, m.ammo, m.f); break;
    case 'noise': if (R && R.running && N.isHost) { const src = R.actors.find(a => a.id === m.f); G.noise(R, { x: m.p[0], y: 0, z: m.p[1] }, m.r, src); } break;
    case 'door': if (R && R.running) { const d = R.W.doors[m.i]; if (d) { if (m.u) { d.unlocked = true; d.key = null; } G.setDoor(R.W, d, m.o); } } break;
    case 'aiSpawn': if (R && R.running && !N.isHost) { const a = G.newAI(R, m.k, m.p[0], m.p[1], null, m.eq, m.id); a.name = m.n; a.net = true; } break;
    case 'ai': if (R && R.running && !N.isHost) m.l.forEach(s => { const a = R.actors.find(x => x.id === s[0]); if (!a || !a.alive) return; a.nt = s; }); break;
    case 'aiDie': if (R && R.running && !N.isHost) G.creditKillFromNet(R, m.id, m.k, m.part); break;
    case 'voice': if (R && R.running) { const a = R.actors.find(x => x.id === m.id); if (a) G.AU.voice(a.pos, a.fac === 'pmc' ? 'pmc' : 'scav'); } break;
    case 'pdead': if (R && R.running) { const a = R.remotes.get(m.f); if (a && a.alive) { a.alive = false; a.dead = true; a.fallDir = 1; a.eq = m.eq; if (a.model) G.dressModel(a.model, a.eq); R.loots.push({ id: 'B' + m.f, kind: 'body', name: a.name, pos: a.pos.clone(), eq: a.eq, actor: a }); if (m.k === N.myId) G.creditKillFromNet(R, m.f, m.k, m.part); } } break;
    case 'loot': if (R && R.running) lootApply(R, m); break;
    case 'nade': if (R && R.running) G.spawnNadeNet(R, m.p, m.v, m.fu, m.f); break;
    case 'done': { const x = N.members.get(m.f); if (x) x.inRaid = false; if (R && R.running && m.st === 'survived') remoteGone(m.f, false); if (N.isHost) roster(); if (R && R.lingering && !N.othersInRaid()) { const w = $('#res-wait'); if (w) w.textContent = 'Everyone is out.'; } break; }
  }
}
function weaponForCal(cal) { return { '9x18': 'pm', '9x19': 'mpfir', '545': 'bark74', '556': 'm4acorn', '762x39': 'akmoss', '762r': 'mossin', '12ga': 'twig133', frag: 'pm' }[cal] || 'pm'; }
function remoteGone(id, disconnected) { const R = G.R; const a = R.remotes.get(id); if (!a) return; if (a.alive && a.model) { R.scene.remove(a.model.root); a.alive = false; R.actors.splice(R.actors.indexOf(a), 1); } R.remotes.delete(id); }
function lootApply(R, m) {
  let c = R.loots.find(x => x.id === m.c);
  if (!c && m.k === 'ground') { c = { id: m.c, kind: 'ground', name: 'Ground', pos: new THREE.Vector3(m.p[0], 0, m.p[1]), grid: G.grid(8, 8) }; R.loots.push(c); }
  if (!c) return;
  const unk = new Set(); const coll = c.grid ? [c.grid] : G.eqGrids(c.eq); coll.forEach(g => g.items.forEach(e => G.itemsDeep(e.it).forEach(x => { if (x.unk) unk.add(x.u); })));
  const mark = it => G.itemsDeep(it).forEach(x => { if (unk.has(x.u)) x.unk = true; });
  if (c.grid) { c.grid.w = m.d.w; c.grid.h = m.d.h; c.grid.items = m.d.items; c.grid.items.forEach(e => mark(e.it)); }
  else if (c.eq) { Object.keys(m.d).forEach(k => { c.eq[k] = m.d[k]; }); G.eqGrids(c.eq).forEach(g => g.items.forEach(e => mark(e.it))); ['primary', 'secondary', 'holster', 'helmet', 'armor', 'rig', 'backpack'].forEach(s => c.eq[s] && mark(c.eq[s])); if (c.actor && c.actor.model) G.dressModel(c.actor.model, c.eq); }
  if (c.kind === 'ground') G.pileMeshNet(R, c);
  if (c.kind === 'cont' && c.type === 'loose' && c.mesh) c.mesh.visible = c.grid.items.length > 0;
  if (R.invOpen && R.lootOpen === c) G.renderInv();
}
const strip = o => { const c = G.clone(o); const walk = it => G.itemsDeep(it).forEach(x => delete x.unk); if (c.items) c.items.forEach(e => walk(e.it)); else Object.values(c).forEach(v => { if (v && v.u) walk(v); else if (v && v.items) v.items.forEach(e => walk(e.it)); }); return c; };

/* ---------- raid hooks (used by raid.js) ---------- */
function raidHooks() {
  let stT = 0, aiT = 0, eqT = 0;
  return {
    tick(dt) {
      const R = G.R; if (!R) return; stT -= dt; aiT -= dt; eqT -= dt;
      if (stT <= 0 && R.me.alive && !R.over) { stT = 1 / 15; const me = R.me; const s = { p: [+me.pos.x.toFixed(2), +me.pos.y.toFixed(2), +me.pos.z.toFixed(2)], y: +me.yaw.toFixed(3), pi: +me.pitch.toFixed(3), c: +me.crouchK.toFixed(2), l: +me.leanO.toFixed(2), m: +me.moving.toFixed(1), li: me.light ? 1 : 0, w: me.weapon ? me.weapon.id : null, n: me.name, lk: me.scav ? 'sapling' : G.S.faction, tm: R.cfg.team, sc: me.scav ? 1 : 0 };
        if (eqT <= 0) { eqT = 2; s.eqv = ['helmet', 'armor', 'rig', 'backpack'].map(k => R.eq[k] ? R.eq[k].id : '').join(','); }
        N.send({ t: 'st', s }); }
      if (N.isHost && aiT <= 0) { aiT = .1; const l = R.actors.filter(a => a.ai && a.alive).map(a => [a.id, +a.pos.x.toFixed(2), +a.pos.y.toFixed(2), +a.pos.z.toFixed(2), +a.yaw.toFixed(2), +a.pitch.toFixed(2), +a.crouchK.toFixed(2), +a.moving.toFixed(1)]); if (l.length) N.send({ t: 'ai', l }); }
      if (!N.isHost) R.actors.forEach(a => { if (!a.ai || !a.nt || !a.alive) return; const s = a.nt; const k = Math.min(1, dt * 10); a.pos.x += (s[1] - a.pos.x) * k; a.pos.y += (s[2] - a.pos.y) * k; a.pos.z += (s[3] - a.pos.z) * k; let d = ((s[4] - a.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; a.yaw += d * k; a.pitch = s[5]; a.crouchK = s[6]; a.moving = s[7]; });
    },
    shot(o, sid) { N.send(Object.assign({ t: 'shot', sid }, o)); },
    hitP(id, part, ammo, owner) { N.sendTo(id, { t: 'hitP', part, ammo, from: owner ? owner.id : null }); },
    hitAI(id, part, ammo) { N.sendTo(G.R && N.isHost ? N.myId : hostId(), { t: 'hitAI', id, part, ammo }); },
    noise(p, r) { N.sendTo(hostId(), { t: 'noise', p: [p.x, p.z], r }); },
    door(d) { N.send({ t: 'door', i: d.i, o: d.open, u: d.unlocked ? 1 : 0 }); },
    voice(a) { N.send({ t: 'voice', id: a.id }); },
    aiSpawn(a) { N.send({ t: 'aiSpawn', id: a.id, k: a.fac, n: a.name, p: [a.pos.x, a.pos.z], eq: strip(a.eq) }); },
    aiDie(a, killer, part) { N.send({ t: 'aiDie', id: a.id, k: killer ? killer.id : null, part }); },
    pdead(me, eq) { const e = strip(eq); e.secure = null; const k = me.killedBy || me.lastAttacker; N.send({ t: 'pdead', eq: e, k: k ? k.id : null, part: G.R.deathCause && G.R.deathCause.cause }); },
    lootSet(c) { const d = c.grid ? strip(c.grid) : strip(c.eq); if (c.eq) d.secure = null; N.send({ t: 'loot', c: c.id, k: c.kind, p: [c.pos.x, c.pos.z], d }); },
    nade(n) { N.send({ t: 'nade', p: [n.p.x, n.p.y, n.p.z], v: [n.v.x, n.v.y, n.v.z], fu: n.fuse }); },
    equip() { },
    done(st) { const m = N.members.get(N.myId); if (m) m.inRaid = false; N.send({ t: 'done', st }); },
    othersInRaid() { return [...N.members.values()].some(x => x.id !== N.myId && x.inRaid); },
  };
}
function hostId() { return N.isHost ? N.myId : (N.hostConn && N.hostConn.peer); }
N.afterRaid = () => { N.members.forEach(x => { if (x.id === N.myId) x.inRaid = false; }); };

G.abortRaid = (msg) => {
  const R = G.R; if (!R) return; R.over = true; if (document.exitPointerLock) document.exitPointerLock();
  G.S.inRaid = null; G.S.stats.raids = Math.max(0, G.S.stats.raids - 1); G.save(); G.stopRaid(); G.R = null; $('#raidinv').classList.remove('on');
  G.show('menu'); G.menu('main'); G.modal('Raid cancelled', msg);
};

/* ---------- squad tab UI ---------- */
G.squadUI = (b) => {
  const wrap = h('div', 'squad'); b.appendChild(wrap);
  const inClaude = /claude\.ai|claudeusercontent|anthropic/.test(location.hostname);
  if (!N.lobby) {
    wrap.innerHTML = `<h2>SQUAD</h2><p>Raid together with up to 4 friends. One player creates a squad and shares the code. Everyone needs their own copy of the game open — progress stays on each player's device.</p>
     ${inClaude ? `<p class="warn">Multiplayer works best from the GitHub version: <a href="${GH_URL}" target="_blank">${GH_URL}</a></p>` : ''}
     <div class="sq-row"><button class="btn gold" id="sq-make">CREATE SQUAD</button></div>
     <div class="sq-row"><input class="inp" id="sq-code" maxlength="5" placeholder="CODE" style="text-transform:uppercase;width:120px"><button class="btn" id="sq-join">JOIN</button></div><p id="sq-err" class="bad"></p>`;
    $('#sq-make').onclick = async () => { $('#sq-err').textContent = 'Creating…'; for (let i = 0; i < 3; i++) { try { await open(genCode(), true); G.menu('squad'); return; } catch (e) { if (e.message !== 'TAKEN') { $('#sq-err').textContent = e.message; return; } } } };
    $('#sq-join').onclick = async () => { const c = $('#sq-code').value.trim().toUpperCase(); if (c.length < 4) return; $('#sq-err').textContent = 'Joining…'; try { await open(c, false); G.toast('Joined squad ' + c); setTimeout(() => G.menu('squad'), 400); } catch (e) { $('#sq-err').textContent = e.message; } };
    return;
  }
  wrap.innerHTML = `<h2>SQUAD <span class="code">${N.code}</span></h2><p class="dim">Share this code with friends. ${N.isHost ? 'You are the squad leader — you choose the raid.' : 'The squad leader picks the raid; you\'ll be pulled into the raid setup.'}</p>
   <div class="sq-mode">${N.isHost ? `<button class="btn ${N.mode === 'coop' ? 'gold' : ''}" data-m="coop">CO-OP (spawn together)</button><button class="btn ${N.mode === 'pvp' ? 'gold' : ''}" data-m="pvp">PvP (every tree for itself)</button>` : `<b>Mode: ${N.mode === 'pvp' ? 'PvP' : 'Co-op'}</b>`}</div>
   <div class="sq-list">${[...N.members.values()].map(x => `<div class="sq-m"><b>${G.esc(x.name)}</b> <small>lvl ${x.lvl} · ${x.fac}${x.host ? ' · LEADER' : ''}</small> <span>${x.inRaid ? 'IN RAID' : x.ready ? 'READY' : ''}</span></div>`).join('')}</div>
   <div class="sq-row">${N.isHost ? '<button class="btn big gold" id="sq-go">PICK RAID</button>' : ''}<button class="btn red" id="sq-leave">LEAVE SQUAD</button></div>
   <p class="dim">Friendly fire is on. Each player brings and keeps their own gear.</p>`;
  wrap.querySelectorAll('[data-m]').forEach(x => x.onclick = () => { N.mode = x.dataset.m; roster(); });
  if ($('#sq-go')) $('#sq-go').onclick = () => G.raidPrep();
  $('#sq-leave').onclick = () => N.leave();
};
})();
