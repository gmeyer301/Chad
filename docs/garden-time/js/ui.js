'use strict';
/* GARDEN TIME — UI: title, HUD, hotbar, shops, backpack, pets, chat, admin panel */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const UI = { joy: null, jumpHeld: false, muted: false, shopOpen: null, cur: null };

/* ---------- title ---------- */
UI.initTitle = function () {
  $('ver').textContent = VER;
  $('nameIn').value = S.name || '';
  const go = async (mode) => {
    const n = $('nameIn').value.trim().slice(0, 16) || ('Crab' + rndi(100, 999)); S.name = n; save0();
    $('titleMsg').textContent = mode === 'solo' ? '' : 'Connecting...';
    try {
      if (mode === 'host') await netHost();
      if (mode === 'join') await netJoin($('codeIn').value);
      $('title').style.display = 'none'; startGame();
      if (mode === 'host') UI.banner('🌐 Your lobby code is ' + NET.code + ' — tell your friends!', '#9be37a');
    } catch (e) { $('titleMsg').textContent = e.message || String(e); }
  };
  $('btnSolo').onclick = () => go('solo'); $('btnHost').onclick = () => go('host'); $('btnJoin').onclick = () => go('join');
  $('codeIn').onkeydown = e => { if (e.key === 'Enter') go('join'); };
};
function save0() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } }

UI.enterGame = function () {
  $('hud').style.display = 'block'; UI.refreshMoney(); UI.refreshHotbar(); UI.refreshHearts(); UI.tutorial();
  $('lobby').textContent = NET.solo ? '🤖 Solo + Bots' : (NET.isHost ? '🌐 Lobby ' : '🌐 In ') + (NET.code || '');
  $('bAdmin').style.display = isAdmin() ? '' : 'none';
  bindInput();
  UI.addChat('', 'Welcome to GARDEN TIME ' + VER + '! Chat with the bots — they actually reply 🦀', '#9be37a');
};
UI.fatal = function (msg) { $('fatal').style.display = 'flex'; $('fatalMsg').textContent = msg; };

/* ---------- HUD ---------- */
UI.refreshMoney = function () { $('money').textContent = fmt(S.money); };
UI.refreshHearts = function () { $('hearts').textContent = G.boss && G.boss.alive ? '❤️'.repeat(G.hearts) + '🖤'.repeat(5 - G.hearts) : ''; };
UI.toast = function (msg) {
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; $('toasts').appendChild(d);
  setTimeout(() => d.classList.add('out'), 3600); setTimeout(() => d.remove(), 4200);
  while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
};
UI.banner = function (txt, color) { const b = $('banner'); b.textContent = txt; b.style.color = color || '#fff'; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); };
UI.tutorial = function () { const t = $('tut'); if (S.tut < TUT.length) { t.style.display = 'block'; t.textContent = TUT[S.tut].txt; } else t.style.display = 'none'; };
UI.bossBar = function (B) {
  const bb = $('bossbar');
  if (!B || (!B.alive && !B.dead)) { bb.style.display = 'none'; return; }
  bb.style.display = 'block'; $('bossfill').style.width = Math.max(0, B.hp / B.max * 100) + '%';
  $('bossname').textContent = B.alive ? '🐦‍⬛ LORD CROW  ' + Math.max(0, Math.ceil(B.hp)) + '/' + B.max + (B.phase === 'grounded' ? '  — HE LANDED, PINCH HIM!' : '') : '🏆 Lord Crow defeated! Go to his body to claim.';
  UI.refreshHearts();
};
function mmss(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
UI.frame = function (dt) {
  // weather + restock
  if (G.weather) { const wd = WEATHERS[G.weather]; $('weatherBar').style.display = 'block'; $('weatherBar').textContent = wd.icon + ' ' + G.weather + ' ' + mmss(G.wtLeft) + ' → ' + wd.mut; }
  else $('weatherBar').style.display = 'none';
  $('restock').textContent = '🛒 Restock ' + mmss(G.restockIn);
  // action prompt
  const it = findInteract(); UI.cur = it; const a = $('act');
  if (it) { a.style.display = 'flex'; a.textContent = it.label; a.style.background = it.c; a.classList.toggle('dis', !it.fn); } else a.style.display = 'none';
  // plant info label
  UI.infoT = (UI.infoT || 0) - dt; if (UI.infoT <= 0) { UI.infoT = 0.15; plantInfo(); }
  if (UI.shopOpen) { const r = $('shopRestock'); if (r) r.textContent = 'Restock in ' + mmss(G.restockIn); }
};
function plantInfo() {
  const el = $('info'); const me = G.me; let best = null, bd = 4;
  G.gardens.forEach(g => g.plants.forEach(p => { const wx = PLOTS[g.plot].x + p.x, wz = PLOTS[g.plot].z + p.z; const d = Math.hypot(wx - me.x, wz - me.z); if (d < bd) { bd = d; best = { g, p, wx, wz }; } }));
  if (!best) { el.style.display = 'none'; return; }
  const { p, g } = best; const d = PLANT[p.id]; const gr = Math.min(1, p.gp / d.g);
  const ripe = p.f.filter(f => gr >= 1 && f.fp >= d.fr); const val = ripe.reduce((a, f) => a + fruitValue(f, d), 0);
  const muts = [...new Set(p.f.flatMap(f => f.m))];
  const v = new THREE.Vector3(best.wx, (d.k === 'tree' || d.k === 'palm' || d.k === 'beanstalk' ? 3.6 : 2) * Math.max(0.4, gr), best.wz).project(W.cam);
  if (v.z > 1) { el.style.display = 'none'; return; }
  el.style.display = 'block'; el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px';
  const owner = g === G.myGarden ? '' : '<div class="own">' + esc(g.kind === 'bot' ? g.owner + ' 🤖' : (G.remotes[g.owner] ? G.remotes[g.owner].n : g.owner)) + "'s</div>";
  el.innerHTML = owner + '<b style="color:' + rcss(d.r) + '">' + esc(d.n) + '</b> <span class="r" style="color:' + rcss(d.r) + '">' + d.r + '</span>' + (d.def ? ' 🛡️' : '') +
    '<div>' + (gr < 1 ? '🌱 Growing ' + Math.floor(gr * 100) + '% (' + mmss(d.g - p.gp) + ')' : ripe.length ? '🍎 ' + ripe.length + ' ripe · ' + fmt(val) : '⏳ fruits growing...') + '</div>' +
    (muts.length ? '<div class="muts">' + muts.map(m => '<span style="color:' + (MUTATIONS[m].c === 'rainbow' ? '#ff9ae8' : MUTATIONS[m].c) + '">' + esc(m) + '</span>').join(' ') + '</div>' : '');
}
function rcss(r) { const c = rarCol(r); return c === 'rainbow' ? '#ff9ae8' : c === '#111111' ? '#cfcfcf' : c; }
function rlabel(r) { return '<span class="rar rar-' + r.replace(/\W/g, 'X') + '" style="color:' + rcss(r) + '">' + r + '</span>'; }

/* ---------- hotbar ---------- */
UI.hotItems = function () {
  const items = Object.keys(S.seeds).filter(id => S.seeds[id] > 0 && PLANT[id]).sort((a, b) => PLANT[a].p - PLANT[b].p).map(id => ({ t: 'seed', id, n: S.seeds[id] }));
  Object.keys(S.gear).filter(id => S.gear[id] > 0 && GEARD[id]).forEach(id => items.push({ t: 'gear', id, n: S.gear[id] }));
  return items;
};
UI.refreshHotbar = function () {
  const hb = $('hotbar'); const items = UI.hotItems(); hb.innerHTML = '';
  if (G.held && !items.some(i => i.t === G.held.t && i.id === G.held.id)) G.held = null;
  items.forEach((it, i) => {
    const b = document.createElement('button'); b.className = 'slot' + (G.held && G.held.t === it.t && G.held.id === it.id ? ' sel' : '');
    if (it.t === 'seed') { const d = PLANT[it.id]; b.style.borderColor = rcss(d.r); b.innerHTML = '<i>' + (i + 1 <= 9 ? i + 1 : '') + '</i><span class="ic">🌱</span><span class="nm">' + esc(d.n) + '</span><span class="ct">x' + it.n + '</span>'; }
    else { const g = GEARD[it.id]; const uses = g.uses ? ' (' + (S.gearUses[it.id] || g.uses) + ')' : ''; b.innerHTML = '<i>' + (i + 1 <= 9 ? i + 1 : '') + '</i><span class="ic">' + g.icon + '</span><span class="nm">' + g.n + uses + '</span>' + (g.free ? '' : '<span class="ct">x' + it.n + '</span>'); }
    b.onclick = () => selectSlot(i); hb.appendChild(b);
  });
  const fb = document.createElement('button'); fb.className = 'slot bag'; fb.innerHTML = '<span class="ic">🎒</span><span class="nm">Fruits</span><span class="ct">' + S.backpack.length + '</span>'; fb.onclick = () => UI.openBag(); hb.appendChild(fb);
};
function selectSlot(i) { const it = UI.hotItems()[i]; if (!it) return; if (G.held && G.held.t === it.t && G.held.id === it.id) G.held = null; else G.held = { t: it.t, id: it.id }; UI.refreshHotbar(); }

/* ---------- modal helpers ---------- */
UI.modalOpen = () => $('modal').style.display === 'flex';
function openModal(title, html, cls) { $('modal').style.display = 'flex'; $('mTitle').innerHTML = title; $('mBody').innerHTML = html; $('mBox').className = cls || ''; }
function closeModal() { $('modal').style.display = 'none'; UI.shopOpen = null; UI.refreshHotbar(); }

/* ---------- shops ---------- */
UI.openShop = function (kind) { UI.shopOpen = kind; UI.renderShop(); };
UI.renderShop = function () {
  const k = UI.shopOpen; if (!k) return;
  if (k === 'gear') {
    openModal('🧰 GEAR SHOP <span class="money">' + fmt(S.money) + '</span>', GEAR.filter(g => !g.free).map(g => '<div class="row"><span class="ic">' + g.icon + '</span><div class="grow"><b>' + g.n + '</b><small>' + esc(g.d) + '</small></div><button class="buy" data-g="' + g.id + '">' + fmt(g.p) + '</button></div>').join(''), 'shop gear');
    $('mBody').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { buyGear(b.dataset.g); UI.renderShop(); });
    return;
  }
  const list = PLANTS.filter(d => !d.noShop && (k === 'tg' ? d.tg : !d.tg)).filter(d => d.id !== 'chipstack' || stockLeft('chipstack', k) > 0 || S.seeds.chipstack);
  const rows = list.map(d => {
    const left = stockLeft(d.id, k); const out = left <= 0;
    return '<div class="row ' + (out ? 'out' : '') + (d.id === 'chipstack' ? ' secret' : '') + '"><span class="dot" style="background:' + rcss(d.r) + '"></span><div class="grow"><b>' + esc(d.n) + '</b> ' + rlabel(d.r) + (d.def ? ' <span class="def">🛡️ DEFENCE</span>' : '') +
      '<small>' + (out ? 'NO STOCK' : 'Stock x' + (left > 90 ? '∞' : left)) + ' · fruit ~' + fmt(d.v) + '</small></div><button class="buy" data-s="' + d.id + '" ' + (out ? 'disabled' : '') + '>' + (d.p ? fmt(d.p) : 'FREE') + '</button></div>';
  }).join('');
  openModal((k === 'tg' ? '🦃 THANKSGIVING SHOP' : '🌱 SEED SHOP') + ' <span class="money">' + fmt(S.money) + '</span>', '<div id="shopRestock" class="sub">Restock in ' + mmss(G.restockIn) + '</div>' + rows, 'shop ' + k);
  $('mBody').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { if (b.dataset.s === 'beginous') { S.seeds.beginous = (S.seeds.beginous || 0) + 1; sfx('buy'); UI.refreshHotbar(); } else buySeed(b.dataset.s, k); UI.renderShop(); });
};
UI.openSell = function () {
  const groups = {}; S.backpack.forEach(f => { const key = f.id + '|' + f.m.slice().sort().join(','); (groups[key] = groups[key] || []).push(f); });
  const total = S.backpack.reduce((a, f) => a + fruitValue(f, PLANT[f.id]), 0);
  const rows = Object.entries(groups).sort((a, b) => fruitValue(b[1][0], PLANT[b[1][0].id]) - fruitValue(a[1][0], PLANT[a[1][0].id])).map(([key, fs]) => {
    const d = PLANT[fs[0].id]; const v = fs.reduce((a, f) => a + fruitValue(f, d), 0);
    return '<div class="row"><span class="dot" style="background:' + rcss(d.r) + '"></span><div class="grow"><b>' + fs.length + 'x ' + esc(d.n) + '</b>' + (fs[0].m.length ? '<small class="muts">' + fs[0].m.map(esc).join(' + ') + '</small>' : '<small>' + (fs.reduce((a, f) => a + f.w, 0) / fs.length).toFixed(2) + 'kg avg</small>') + '</div><button class="buy" data-k="' + esc(key) + '">' + fmt(v) + '</button></div>';
  }).join('');
  openModal('💰 SELL STAND', (S.backpack.length ? '<button id="sellAll" class="big">SELL ALL (' + S.backpack.length + ') for ' + fmt(total) + '</button>' : '<p class="sub">Your backpack is empty. Harvest fruits from your garden first!</p>') + rows, 'shop sell');
  const sa = $('sellAll'); if (sa) sa.onclick = () => { sellFruits(S.backpack.slice()); UI.openSell(); UI.refreshHotbar(); };
  $('mBody').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sellFruits(groups[b.dataset.k]); UI.openSell(); UI.refreshHotbar(); });
};
UI.openBag = function () {
  const fr = S.backpack.length ? S.backpack.slice().sort((a, b) => fruitValue(b, PLANT[b.id]) - fruitValue(a, PLANT[a.id])).slice(0, 80).map(f => { const d = PLANT[f.id]; return '<div class="row"><span class="dot" style="background:' + rcss(d.r) + '"></span><div class="grow"><b>' + esc(d.n) + '</b> <small>' + f.w.toFixed(2) + 'kg' + (f.m.length ? ' · <span class="muts">' + f.m.map(esc).join(' + ') + '</span>' : '') + '</small></div><span class="val">' + fmt(fruitValue(f, d)) + '</span></div>'; }).join('') : '<p class="sub">No fruits yet.</p>';
  const sd = UI.hotItems().map(it => it.t === 'seed' ? '<div class="row"><span class="dot" style="background:' + rcss(PLANT[it.id].r) + '"></span><div class="grow"><b>' + esc(PLANT[it.id].n) + ' seed</b> ' + rlabel(PLANT[it.id].r) + '</div><span class="val">x' + it.n + '</span></div>' : '<div class="row"><span class="ic">' + GEARD[it.id].icon + '</span><div class="grow"><b>' + GEARD[it.id].n + '</b><small>' + esc(GEARD[it.id].d) + '</small></div><span class="val">x' + it.n + '</span></div>').join('');
  openModal('🎒 BACKPACK <span class="money">' + fmt(S.money) + '</span>', '<h4>Fruits (' + S.backpack.length + '/300)</h4>' + fr + '<h4>Seeds & Gear</h4>' + sd + '<h4>Stats</h4><p class="sub">Harvested ' + S.stats.harvested + ' · Sold ' + S.stats.sold + ' · Earned ' + fmt(S.stats.earned) + ' · Cornucopia ' + S.cornFed + '</p>', 'shop');
};
UI.openPets = function (feeding) {
  const eq = S.pets.filter(p => p.eq).length;
  const rows = S.pets.map(p => { const P = PET[p.id]; return '<div class="row"><span class="dot" style="background:' + P.c + '"></span><div class="grow"><b>' + P.n + ' · Lv' + p.lvl + '</b><small>' + esc(P.ab) + (P.cd ? ' · every ' + Math.round(petCd(p)) + 's' : '') + '</small></div>' + (S.gear.treat ? '<button class="buy alt" data-f="' + p.u + '">🦴 Treat</button>' : '') + '<button class="buy ' + (p.eq ? 'on' : '') + '" data-e="' + p.u + '">' + (p.eq ? 'Equipped' : 'Equip') + '</button></div>'; }).join('') || '<p class="sub">No pets yet! Animals wander around the map — walk up to one to adopt it.</p>';
  const guide = PETS.filter(p => !p.aao).map(p => '<div class="mini"><b>' + p.n + '</b> ' + fmt(p.p) + (p.tg ? ' 🦃' : '') + '</div>').join('');
  openModal('🐾 PETS (' + eq + '/3 equipped)', (feeding ? '<p class="sub">Pick a pet to give a Treat to (levels up + shorter cooldown)</p>' : '') + rows + '<h4>Wild animals you can find</h4><div class="minis">' + guide + '<div class="mini"><b>Ballon</b> 🎈 Backrooms only</div></div>', 'shop');
  $('mBody').querySelectorAll('[data-e]').forEach(b => b.onclick = () => { const p = S.pets.find(x => x.u == b.dataset.e); if (!p.eq && S.pets.filter(x => x.eq).length >= 3) return toast('Only 3 pets can be equipped!'); p.eq = !p.eq; rebuildPetObjs(); UI.openPets(feeding); });
  $('mBody').querySelectorAll('[data-f]').forEach(b => b.onclick = () => { feedTreat(+b.dataset.f); UI.openPets(feeding); });
};
UI.openMenu = function () {
  openModal('⚙️ MENU', '<div class="menu">' +
    '<p class="sub">' + (NET.solo ? 'Playing solo with bots.' : 'Lobby code: <b class="code">' + NET.code + '</b> — friends tap JOIN and type it.') + '</p>' +
    '<button id="mHelp" class="big">❓ How to play</button>' +
    '<button id="mMute" class="big">' + (UI.muted ? '🔇 Sound: OFF' : '🔊 Sound: ON') + '</button>' +
    (isAdmin() ? '<button id="mAdmin" class="big gold">👑 Admin Panel</button>' : '<button id="mLogin" class="big">🔑 Admin login</button>') +
    '<button id="mSave" class="big">💾 Save now</button>' +
    '<button id="mReset" class="big red">🗑️ Reset my save</button>' +
    '<p class="sub">GARDEN TIME ' + VER + '<br>Idea: s0meTh1ng.MP4 / Henry & Claude.AI</p></div>', 'shop');
  $('mHelp').onclick = UI.openHelp; $('mMute').onclick = () => { UI.muted = !UI.muted; UI.openMenu(); }; $('mSave').onclick = () => { save(); toast('💾 Saved!'); };
  $('mReset').onclick = () => { openModal('🗑️ RESET SAVE?', '<p class="sub">This deletes ALL your Garden Time progress on this device. You cannot undo it.</p><button id="rYes" class="big red">Yes, delete everything</button><button id="rNo" class="big">No, keep my garden</button>', 'shop'); $('rYes').onclick = () => { G.mode = 'reset'; localStorage.removeItem(SAVE_KEY); S = null; location.reload(); }; $('rNo').onclick = closeModal; };
  if ($('mAdmin')) $('mAdmin').onclick = UI.openAdmin; if ($('mLogin')) $('mLogin').onclick = adminLogin;
};
UI.openHelp = function () {
  openModal('❓ HOW TO PLAY', '<div class="help"><p>🦀 You are a crab with a garden. <b>Plant seeds</b>, wait for them to grow, <b>harvest</b> fruits and <b>sell</b> them at the Sell Stand.</p>' +
    '<p>🌱 Seed Shop restocks every 5 minutes. Rarer seeds = way more money. There is a <b>SECRET</b> seed that almost never shows up…</p>' +
    '<p>🌧️ <b>Weather</b> gives fruits mutations that multiply their value: Rain → Wet → Drenched, Blizzard → Frosty → Frozen, Thunder → Shocked (x50!), Fish Rain → F I S H, Volcano → Burnt.</p>' +
    '<p>🦃 <b>Thanksgiving:</b> Turkey Rain makes fruits Thankful. Feed ' + CORNUCOPIA_GOAL + ' Thankful fruits to the big Cornucopia to unlock the Thanksgiving Shop. Lord Crow has a 35% chance to appear during Turkey Rain — pinch him when he lands! 10% chance for the Scarecrow Blossom.</p>' +
    '<p>🛡️ <b>Defence plants</b> (Pea Shooter, Venus Fly Trap, Pitcher Plant) knock away anyone who walks into your garden. Bots WILL try to steal your fruits!</p>' +
    '<p>🐾 Animals wander the map — walk up to adopt them. Each pet has a special ability. Treats level them up.</p>' +
    '<p>🎮 <b>Controls:</b> WASD / joystick to move, drag to look, E / big button to interact, Space to jump, 1-9 hotbar, Enter to chat.</p></div>', 'shop');
};

/* ---------- chat ---------- */
UI.addChat = function (name, text, color) {
  const log = $('chatLog'); const d = document.createElement('div'); d.className = 'cl';
  d.innerHTML = (name ? '<b style="color:' + esc(color || '#fff') + '">' + esc(name) + ':</b> ' : '<i style="color:' + esc(color || '#ccc') + '">') + esc(text) + (name ? '' : '</i>');
  log.appendChild(d); while (log.children.length > 60) log.firstChild.remove(); log.scrollTop = 1e9;
  d.dataset.t = Date.now(); if (name && name !== S.name) sfx('chat');
};
function sendChatInput() {
  const t = $('chatIn').value.trim(); if (!t) return; $('chatIn').value = '';
  if (t === '/admin') { adminLogin(); return; }
  netChat(t);
  if (G.me) { if (G.me.bubble) G.me.mesh.remove(G.me.bubble); G.me.bubble = textSprite(t.length > 42 ? t.slice(0, 40) + '…' : t, '#222', 'rgba(255,255,255,.92)', 0.38); G.me.bubble.position.y = 2.35; G.me.mesh.add(G.me.bubble); const bb = G.me.bubble; setTimeout(() => { if (G.me.bubble === bb) { G.me.mesh.remove(bb); G.me.bubble = null; } }, 5000); }
}

/* ---------- input ---------- */
function bindInput() {
  addEventListener('keydown', e => {
    if (document.activeElement === $('chatIn')) { if (e.key === 'Enter') { sendChatInput(); $('chatIn').blur(); } if (e.key === 'Escape') $('chatIn').blur(); return; }
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Enter') { $('chat').classList.add('open'); $('chatIn').focus(); e.preventDefault(); return; }
    G.keys[e.code] = true;
    if (e.code === 'KeyE' && UI.cur && UI.cur.fn && !UI.modalOpen()) UI.cur.fn();
    if (e.code === 'KeyB') UI.openBag(); if (e.code === 'KeyP') UI.openPets();
    const n = parseInt(e.key); if (n >= 1 && n <= 9) selectSlot(n - 1);
    if (e.code === 'Space') e.preventDefault();
  });
  addEventListener('keyup', e => { G.keys[e.code] = false; });
  $('act').onclick = () => { if (UI.cur && UI.cur.fn) UI.cur.fn(); };
  const jb = $('jump'); jb.addEventListener('pointerdown', e => { UI.jumpHeld = true; e.preventDefault(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => jb.addEventListener(ev, () => UI.jumpHeld = false));
  $('mClose').onclick = closeModal; $('modal').onclick = e => { if (e.target === $('modal')) closeModal(); };
  $('bBag').onclick = () => UI.openBag(); $('bPets').onclick = () => UI.openPets(); $('bMenu').onclick = () => UI.openMenu(); $('bAdmin').onclick = () => UI.openAdmin();
  $('bChat').onclick = () => { $('chat').classList.toggle('open'); if ($('chat').classList.contains('open')) $('chatIn').focus(); };
  $('chatSend').onclick = () => sendChatInput();
  // camera drag + joystick
  const cv = $('c'); let drag = null; const joyEl = $('joy'), jk = $('jk'); let joyId = null, joyC = null;
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.42 && e.clientY > innerHeight * 0.45 && joyId === null) { joyId = e.pointerId; joyC = { x: e.clientX, y: e.clientY }; joyEl.style.display = 'block'; joyEl.style.left = (e.clientX - 60) + 'px'; joyEl.style.top = (e.clientY - 60) + 'px'; UI.joy = { x: 0, y: 0 }; return; }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove', e => {
    if (e.pointerId === joyId) { let dx = e.clientX - joyC.x, dy = e.clientY - joyC.y; const l = Math.hypot(dx, dy); if (l > 50) { dx *= 50 / l; dy *= 50 / l; } jk.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; UI.joy = { x: dx / 50, y: dy / 50 }; return; }
    if (drag && drag.id === e.pointerId) { G.cam.yaw -= (e.clientX - drag.x) * 0.006; G.cam.pitch = clamp(G.cam.pitch + (e.clientY - drag.y) * 0.004, 0.08, 1.35); drag.x = e.clientX; drag.y = e.clientY; }
  });
  const up = e => { if (e.pointerId === joyId) { joyId = null; UI.joy = null; joyEl.style.display = 'none'; jk.style.transform = ''; } if (drag && drag.id === e.pointerId) drag = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { G.cam.dist = clamp(G.cam.dist + e.deltaY * 0.01, 4, 30); e.preventDefault(); }, { passive: false });
  $('zIn').onclick = () => G.cam.dist = clamp(G.cam.dist - 2.5, 4, 30); $('zOut').onclick = () => G.cam.dist = clamp(G.cam.dist + 2.5, 4, 30);
}

/* ---------- ADMIN (Henry only) ---------- */
const ADMIN_TOK_HASH = 'd669e7bf78d007eb7b210fc947edf4213e372f491f9abb482a7a141caf74c499';
function sha256(ascii) {
  const rr = (v, a) => (v >>> a) | (v << (32 - a)); const mp = Math.pow, mw = mp(2, 32); let result = '';
  const words = [], bitLen = ascii.length * 8; const hash = [], k = []; let pc = 0; const isC = {};
  for (let c = 2; pc < 64; c++) { if (!isC[c]) { for (let i = 0; i < 313; i += c) isC[i] = c; hash[pc] = (mp(c, .5) * mw) | 0; k[pc++] = (mp(c, 1 / 3) * mw) | 0; } }
  ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) { const j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
  words[words.length] = ((bitLen / mw) | 0); words[words.length] = bitLen;
  let H = hash.slice(0, 8);
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16); const oh = H; H = H.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]; const a = H[0], e = H[4];
      const t1 = H[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & H[5]) ^ ((~e) & H[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & H[1]) ^ (a & H[2]) ^ (H[1] & H[2]));
      H = [(t1 + t2) | 0].concat(H); H[4] = (H[4] + t1) | 0; H.length = 8;
    }
    for (let i = 0; i < 8; i++) H[i] = (H[i] + oh[i]) | 0;
  }
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) { const b = (H[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
  return result;
}
function utf8(s) { return unescape(encodeURIComponent(s)); }
function checkTokSync(tok) { return typeof tok === 'string' && sha256(tok) === ADMIN_TOK_HASH; }
function isAdmin() { return S && checkTokSync(S.adminTok); }
function adminLogin() {
  openModal('🔑 ADMIN LOGIN', '<div class="admin"><p class="sub">Only the game owner knows this.</p><div class="line"><input id="aPw" type="password" placeholder="Admin password" style="flex:1"><button class="buy" id="aPwB">Enter</button></div></div>', 'shop admin');
  const tryPw = () => {
    const pw = $('aPw').value; if (!pw) return;
    const tok = sha256(utf8('gt-tok:' + pw));
    if (checkTokSync(tok)) { S.adminTok = tok; save0(); $('bAdmin').style.display = ''; toast('👑 Welcome back, Admin!'); sfx('fanfare'); UI.openAdmin(); }
    else { toast('❌ Wrong password'); sfx('no'); $('aPw').value = ''; }
  };
  $('aPwB').onclick = tryPw; $('aPw').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') tryPw(); }; setTimeout(() => { const el = $('aPw'); if (el) el.focus(); }, 50);
}
function adminTargets() {
  const t = [['me', 'Me (' + S.name + ')'], ['allp', 'Everyone (players)'], ['allb', 'All bots']];
  Object.values(G.remotes).forEach(r => t.push([r.bot ? 'bot:' + r.n : r.id, r.n + (r.bot ? ' 🤖' : '')]));
  G.bots.forEach(b => t.push(['bot:' + b.name, b.name + ' 🤖']));
  return t.map(([v, n]) => '<option value="' + esc(v) + '">' + esc(n) + '</option>').join('');
}
function adminGive(target, gift) {
  const tok = S.adminTok; const list = [];
  if (target === 'allp') { list.push('me'); Object.values(G.remotes).forEach(r => { if (!r.bot) list.push(r.id); }); }
  else if (target === 'allb') { G.bots.forEach(b => list.push('bot:' + b.name)); Object.values(G.remotes).forEach(r => { if (r.bot) list.push('bot:' + r.n); }); }
  else list.push(target);
  list.forEach(to => {
    if (to === 'me') { if (gift.money) { S.money += gift.money; UI.refreshMoney(); } if (gift.seed) { S.seeds[gift.seed] = (S.seeds[gift.seed] || 0) + gift.n; } if (gift.pet) givePet(gift.pet); if (gift.gear) { S.gear[gift.gear] = (S.gear[gift.gear] || 0) + gift.n; if (GEARD[gift.gear].uses && !S.gearUses[gift.gear]) S.gearUses[gift.gear] = GEARD[gift.gear].uses; } UI.refreshHotbar(); return; }
    netAct(Object.assign({ t: 'gift', to, admin: 1, tok, src: 'Admin ' + S.name }, gift));
  });
  toast('👑 Given to ' + (target === 'me' ? 'you' : target === 'allp' ? 'everyone' : target === 'allb' ? 'all bots' : target.replace('bot:', '')));
}
function adminWorld(cmd, extra) {
  const a = Object.assign({ t: 'admin', to: 'host', cmd, tok: S.adminTok }, extra || {});
  if (NET.isHost) runAdminWorld(a); else netAct(a);
}
function runAdminWorld(a) {
  if (a.cmd === 'weather' && WEATHERS[a.w]) { startWeather(a.w, a.dur || WEATHERS[a.w].dur); }
  if (a.cmd === 'stopweather') endWeather();
  if (a.cmd === 'boss') { if (G.boss && !G.boss.alive) G.boss = null; spawnBoss(); }
  if (a.cmd === 'killboss' && G.boss && G.boss.alive) G.boss.hp = 0;
  if (a.cmd === 'restock') doRestock(!!a.secret);
  netBroadcastWorld();
}
UI.openAdmin = function () {
  if (!isAdmin()) return adminLogin();
  const plantOpts = Object.entries(PLANTS.reduce((acc, d) => { (acc[d.r] = acc[d.r] || []).push(d); return acc; }, {})).map(([r, ds]) => '<optgroup label="' + r + '">' + ds.map(d => '<option value="' + d.id + '">' + esc(d.n) + '</option>').join('') + '</optgroup>').join('');
  const W8 = Object.keys(WEATHERS).map(w => '<button class="chip' + (WEATHERS[w].aao ? ' aao' : '') + '" data-w="' + esc(w) + '">' + WEATHERS[w].icon + ' ' + esc(w) + '</button>').join('');
  openModal('👑 ADMIN ABUSE', '<div class="admin">' +
    '<label>Target <select id="aT">' + adminTargets() + '</select></label>' +
    '<h4>💰 Money</h4><div class="line"><input id="aM" type="text" value="1M" style="width:110px"><button class="chip" data-m="1000">1K</button><button class="chip" data-m="1e6">1M</button><button class="chip" data-m="1e9">1B</button><button class="chip" data-m="1e12">1T</button><button id="aGiveM" class="buy">Give $</button></div>' +
    '<h4>🌦️ Weather events</h4><div class="chips">' + W8 + '<button class="chip red" id="aStopW">⛔ Stop weather</button></div>' +
    '<h4>🪄 Summon</h4><div class="chips"><button class="chip" id="aBoss">🐦‍⬛ Lord Crow</button><button class="chip" id="aKill">💀 Kill Lord Crow</button><button class="chip" id="aRe">🛒 Restock</button><button class="chip gold" id="aSec">🟩 Restock + SECRET seed</button><button class="chip" id="aTG">🦃 Unlock TG shop</button></div>' +
    '<div class="line">Wild animal <select id="aWild">' + PETS.map(p => '<option value="' + p.id + '">' + p.n + '</option>').join('') + '</select><button class="buy" id="aWildB">Summon next to me</button></div>' +
    '<h4>🌱 Give seeds</h4><div class="line"><select id="aS">' + plantOpts + '</select><input id="aSn" type="number" value="1" min="1" style="width:60px"><button class="buy" id="aSB">Give</button></div>' +
    '<h4>🐾 Give pet</h4><div class="line"><select id="aP">' + PETS.map(p => '<option value="' + p.id + '">' + p.n + '</option>').join('') + '</select><button class="buy" id="aPB">Give</button></div>' +
    '<h4>🧰 Give gear</h4><div class="line"><select id="aG">' + GEAR.map(g => '<option value="' + g.id + '">' + g.n + '</option>').join('') + '</select><input id="aGn" type="number" value="5" min="1" style="width:60px"><button class="buy" id="aGB">Give</button></div>' +
    '<h4>😎 Fun</h4><div class="chips"><button class="chip" id="aGrow">🌳 Grow target garden</button><button class="chip" id="aFly">' + (G.fly ? '🕊️ Fly ON' : '🕊️ Fly OFF') + '</button><button class="chip" id="aSpd">' + (G.speedMult > 1 ? '⚡ Speed x3 ON' : '⚡ Speed x3 OFF') + '</button><button class="chip" id="aBig">' + (G.big ? '🦀 GIANT ON' : '🦀 GIANT OFF') + '</button></div>' +
    '<div class="line"><input id="aAnn" type="text" placeholder="Announcement to everyone" style="flex:1"><button class="buy" id="aAnnB">Announce</button></div>' +
    '</div>', 'shop admin');
  const tgt = () => $('aT').value;
  const parseMoney = s => { s = String(s).trim().toUpperCase().replace(/[$,]/g, ''); const m = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, QD: 1e15 }; const mm = s.match(/^([\d.]+)\s*(K|M|B|T|QD)?$/); return mm ? Math.round(parseFloat(mm[1]) * (m[mm[2]] || 1)) : 0; };
  $('mBody').querySelectorAll('[data-m]').forEach(b => b.onclick = () => $('aM').value = fmt(+b.dataset.m).replace('$', ''));
  $('aGiveM').onclick = () => { const v = parseMoney($('aM').value); if (v > 0) adminGive(tgt(), { money: v }); };
  $('mBody').querySelectorAll('[data-w]').forEach(b => b.onclick = () => { adminWorld('weather', { w: b.dataset.w }); closeModal(); });
  $('aStopW').onclick = () => adminWorld('stopweather');
  $('aBoss').onclick = () => { adminWorld('boss'); closeModal(); }; $('aKill').onclick = () => adminWorld('killboss');
  $('aRe').onclick = () => adminWorld('restock'); $('aSec').onclick = () => adminWorld('restock', { secret: 1 });
  $('aTG').onclick = () => { S.tgUnlocked = true; showTG(); toast('🦃 Thanksgiving shop unlocked'); };
  $('aWildB').onclick = () => { const a = spawnWild($('aWild').value); a.x = G.me.x + 3; a.z = G.me.z + 3; a.tx = a.x; a.tz = a.z; a.life = 600; toast('🐾 Summoned a ' + PET[a.id].n); };
  $('aSB').onclick = () => adminGive(tgt(), { seed: $('aS').value, n: Math.max(1, +$('aSn').value || 1) });
  $('aPB').onclick = () => adminGive(tgt(), { pet: $('aP').value });
  $('aGB').onclick = () => adminGive(tgt(), { gear: $('aG').value, n: Math.max(1, +$('aGn').value || 1) });
  $('aGrow').onclick = () => { const t = tgt(); if (t === 'me') { G.myGarden.plants.forEach(p => { const d = PLANT[p.id]; p.gp = d.g; p.f.forEach(f => f.fp = d.fr); }); toast('🌳 Grown!'); } else if (t.startsWith('bot:') || t === 'allb') { const bs = t === 'allb' ? G.bots : G.bots.filter(b => 'bot:' + b.name === t); bs.forEach(b => b.garden.plants.forEach(p => { const d = PLANT[p.id]; p.gp = d.g; p.f.forEach(f => f.fp = d.fr); })); toast(NET.isHost ? '🌳 Grown!' : 'Only the host can grow bot gardens'); } else { const ids = t === 'allp' ? Object.values(G.remotes).filter(r => !r.bot).map(r => r.id) : [t]; ids.forEach(id => netAct({ t: 'grow', to: id, tok: S.adminTok })); if (t === 'allp') G.myGarden.plants.forEach(p => { const d = PLANT[p.id]; p.gp = d.g; p.f.forEach(f => f.fp = d.fr); }); toast('🌳 Grown!'); } };
  $('aFly').onclick = () => { G.fly = !G.fly; UI.openAdmin(); }; $('aSpd').onclick = () => { G.speedMult = G.speedMult > 1 ? 1 : 3; UI.openAdmin(); }; $('aBig').onclick = () => { G.big = !G.big; UI.openAdmin(); };
  $('aAnnB').onclick = () => { const t = $('aAnn').value.trim(); if (!t) return; UI.banner('👑 ' + t, '#ffd23d'); netAct({ t: 'announce', to: 'all', text: t, tok: S.adminTok }); netChat('[ADMIN] ' + t, '#ffd23d', true); $('aAnn').value = ''; };
};
