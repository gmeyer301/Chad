'use strict';
/* UI: title screen, HUD, viewfinder, panels (shop, terminal, monster book, upload), chat, pause, touch */
const $ = id => document.getElementById(id);
const CONTROLS = [['WASD', 'move'], ['Mouse', 'look'], ['Shift', 'run'], ['C / Ctrl', 'crouch (quiet)'], ['Space', 'jump'], ['E', 'use / pick up'], ['F / Right-click', 'raise camera'], ['Click', 'record / use item'], ['1-4', 'camera / items'], ['Q', 'flashlight'], ['H', 'air horn'], ['T / Enter', 'chat'], ['Esc / P', 'pause']];
const UI = {
  shakeAmt: 0, bannerT: 0, gainT: 0, gainV: 0, staticT: 0, panel: null, chatOpen: false, paused: false,
  init() {
    $('ver').textContent = VERSION;
    const nm = $('nameIn'); nm.value = LS.getItem('sl_name') || ''; nm.oninput = () => LS.setItem('sl_name', nm.value.trim() || 'TV Head');
    const cs = $('colors'); const cur = LS.getItem('sl_color') || COLORS[0]; LS.setItem('sl_color', cur);
    COLORS.forEach(c => { const b = document.createElement('button'); b.className = 'chip' + (c === cur ? ' on' : ''); b.style.background = c; b.setAttribute('aria-label', 'color ' + c); b.onclick = () => { LS.setItem('sl_color', c); cs.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); }; cs.appendChild(b); });
    const bs = $('botsSel'); const nb = LS.getItem('sl_bots') ?? '3';
    [0, 1, 2, 3, 4].forEach(n => { const b = document.createElement('button'); b.className = 'btn sm' + (String(n) === String(nb) ? ' on' : ''); b.textContent = n; b.style.minWidth = '44px'; if (String(n) === String(nb)) b.style.background = 'var(--teal)', b.style.color = '#001a14'; b.onclick = () => { LS.setItem('sl_bots', n); bs.querySelectorAll('button').forEach(x => { x.style.background = ''; x.style.color = ''; }); b.style.background = 'var(--teal)'; b.style.color = '#001a14'; }; bs.appendChild(b); });
    $('facePrev').src = myFace();
    $('bFace').onclick = () => this.openFace();
    $('bSolo').onclick = () => { initAudio(); NET.solo = true; NET.isHost = true; startGame('solo'); };
    $('bHost').onclick = async () => { initAudio(); this.tmsg('Opening an online lobby…'); try { await netHost(); startGame('host'); } catch (e) { this.tmsg(e.message); } };
    $('bJoin').onclick = async () => { initAudio(); this.tmsg('Joining…'); try { NET.isHost = false; const w = await netJoin($('codeIn').value); startGame('join'); applyWelcome(w); } catch (e) { NET.isHost = true; NET.solo = true; this.tmsg(e.message); } };
    $('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('bJoin').click(); });
    $('bHow').onclick = () => this.open('howP'); $('bBook').onclick = () => this.openBook();
    document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => this.close());
    const ctl = CONTROLS.map(([k, v]) => '<div><b>' + k + '</b> — ' + v + '</div>').join(''); $('ctlList').innerHTML = ctl; $('ctlList2').innerHTML = ctl;
    $('sens').value = IN.sens; $('sens').oninput = e => { IN.sens = +e.target.value; LS.setItem('sl_sens', IN.sens); };
    $('pResume').onclick = () => this.unpause(); $('pHow').onclick = () => { this.paused = false; $('pause').classList.remove('show'); this.open('howP'); };
    $('pFace').onclick = () => { this.paused = false; $('pause').classList.remove('show'); this.openFace(); };
    $('pLeave').onclick = () => location.reload();
    $('pSand').onclick = () => { netAct({ t: 'sandbox', on: !G.sandbox }); setTimeout(() => this.refreshPause(), 50); };
    $('spawnBtns').innerHTML = MTYPES.map(t => '<button class="btn sm" data-sp="' + t + '">' + MDEF[t].n + '</button>').join('');
    $('spawnBtns').onclick = e => { const b = e.target.closest('[data-sp]'); if (!b) return; if (G.phase !== 'dive') { this.toast('Go into the Signal World first'); return; } netAct({ t: 'spawn', type: b.dataset.sp }); };
    const ci = $('chatIn'); ci.addEventListener('keydown', e => { if (e.key === 'Enter') { const t = ci.value.trim(); if (t) { netAct({ t: 'chat', text: t }); P.noiseT = 1.5; } this.closeChat(); e.preventDefault(); } else if (e.key === 'Escape') this.closeChat(); e.stopPropagation(); });
    W.r.domElement.addEventListener('click', () => { if (G.mode === 'play' && !this.blocking()) lockPointer(); });
    document.addEventListener('pointerlockchange', () => { if (G.mode === 'play' && !IN.locked && !IS_TOUCH && !this.blocking()) this.pause(); });
    $('hot').addEventListener('click', e => { const s = e.target.closest('.slot'); if (s) IN.pr.add('Digit' + (+s.dataset.i + 1)); });
    $('hot').addEventListener('touchstart', e => { const s = e.target.closest('.slot'); if (s) { e.preventDefault(); IN.pr.add('Digit' + (+s.dataset.i + 1)); } }, { passive: false });
    this.noiseCtx = $('noise').getContext('2d');
  },
  tmsg(t) { $('tmsg').textContent = t; },
  enterGame(mode) {
    $('title').classList.add('hide'); $('hud').classList.remove('hide'); document.body.classList.add('playing');
    if (!NET.solo) { $('lobby').classList.remove('hide'); }
    $('hostOpts').style.display = NET.isHost ? '' : 'none';
    this.refresh(); this.banner(mode === 'join' ? 'Joined the lobby! Stand in the Signal Bell outside when the host pulls the lever.' : 'Welcome to SIGNAL LOST HQ. Walk into the Signal Bell outside and pull the lever!', '#2fe3c5');
    if (IS_TOUCH) this.toast('Left stick = move, drag right side = look');
  },
  // --- panels ---
  open(id) { this.close(true); this.panel = id; $(id).classList.add('show'); unlockPointer(); },
  close(silent) { if (this.panel) $(this.panel).classList.remove('show'); this.panel = null; if (!silent && G.mode === 'play') lockPointer(); },
  syncPad() { document.body.classList.toggle('panelopen', !!this.panel || this.paused || $('faceEd').classList.contains('show')); },
  blocking() { return !!this.panel || this.chatOpen || this.paused || $('faceEd').classList.contains('show'); },
  isTyping() { return this.chatOpen; },
  onTypingKey() { },
  openFace() {
    openFaceEditor(url => { $('facePrev').src = url; if (G.mode === 'play') { netAct({ t: 'face', f: url }); this.toast('New face saved!'); lockPointer(); } });
    unlockPointer();
  },
  openShop() {
    this.open('shop'); $('shopMoney').textContent = '$' + fmt(G.money);
    $('shopGrid').innerHTML = SHOP.map(s => '<div class="card"><h3>' + s.ic + ' ' + s.n + '</h3><p>' + s.d + '</p><div class="row" style="justify-content:space-between"><span class="price">$' + s.p + '</span><button class="btn sm" data-buy="' + s.k + '"' + (G.money < s.p ? ' disabled style="opacity:.5"' : '') + '>Buy</button></div></div>').join('');
    $('shopGrid').onclick = e => { const b = e.target.closest('[data-buy]'); if (!b || b.disabled) return; netAct({ t: 'buy', k: b.dataset.buy }); setTimeout(() => { if (this.panel === 'shop') this.openShop(); }, 250); };
  },
  openTerminal() {
    this.open('term'); const canPick = NET.isHost && G.phase === 'surface';
    $('termNote').textContent = canPick ? 'Pick where the Signal Bell goes today. Day ' + Math.min(G.day, 3) + ' of 3.' : (NET.isHost ? 'Your team is already in the Signal World.' : 'Only the host can pick the map.');
    $('termGrid').innerHTML = MAP_KEYS.map(k => '<div class="card' + (G.mapType === k ? ' on' : '') + '"><h3>' + MAPS[k].n + '</h3><p>' + MAPS[k].d + '</p>' + (canPick ? '<button class="btn sm" data-map="' + k + '">' + (G.mapType === k ? '✓ Selected' : 'Select') + '</button>' : '') + '</div>').join('');
    $('termGrid').onclick = e => { const b = e.target.closest('[data-map]'); if (!b) return; netAct({ t: 'map', k: b.dataset.map }); setTimeout(() => this.openTerminal(), 60); };
  },
  openBook(sel) {
    this.open('bookP'); sel = sel || this.bookSel || 'man'; this.bookSel = sel;
    $('bookList').innerHTML = MTYPES.map(t => '<button data-b="' + t + '" class="' + (t === sel ? 'on' : '') + '">' + (MDEF[t].boss ? '👑 ' : MDEF[t].rare ? '✨ ' : '') + MDEF[t].n + '</button>').join('');
    const D = MDEF[sel];
    $('bookPage').innerHTML = '<h3 style="margin:0 0 6px;font-size:22px">' + D.n + '</h3>' + (D.art ? '<img src="art/' + D.art + '.jpg" alt="' + D.n + ' concept art"><p style="font-size:12px;color:#8a9">Concept art by s0meTh1ng.MP4</p>' : '') + '<p>' + D.d + '</p><p>Views when filmed: <b class="price">' + D.v + '/sec</b> (×3 while attacking)</p>';
    $('bookList').onclick = e => { const b = e.target.closest('[data-b]'); if (b) this.openBook(b.dataset.b); };
  },
  showUpload(d) {
    this.open('upP'); $('upTitle').textContent = d.title; $('upViews').textContent = '0 views';
    $('upHl').innerHTML = '<p style="margin:8px 0 4px;color:#9fd">Best moments:</p>' + d.hl.map(([k, v]) => '<div class="hl"><span>' + k + '</span><b>+' + fmt(v) + '</b></div>').join('');
    $('upCm').innerHTML = '<p style="margin:10px 0 0;color:#9fd">Comments:</p>' + d.cm.map(c => '<div class="cm">@' + pick(['spooky_fan', 'tvlover99', 'xX_static_Xx', 'grandma', 'n00b', 'ghostbuster4', 'notabot']) + ': ' + c.replace(/</g, '&lt;') + '</div>').join('');
    let t = 0; const iv = setInterval(() => { t = Math.min(1, t + 0.04); $('upViews').textContent = fmt(d.views * t) + ' views'; if (t >= 1) clearInterval(iv); }, 30);
  },
  gameOver(e) { this.open('overP'); $('overTxt').textContent = 'You got ' + fmt(e.views) + ' / ' + fmt(e.quota) + ' views on quota #' + e.qn + '.'; sfx('death'); },
  fatal(msg) { this.open('fatal'); $('fatalTxt').textContent = msg; },
  pause() { if (this.paused) return; this.paused = true; this.refreshPause(); $('pause').classList.add('show'); },
  unpause() { this.paused = false; $('pause').classList.remove('show'); lockPointer(); },
  refreshPause() { $('pSand').textContent = 'Sandbox: ' + (G.sandbox ? 'ON' : 'OFF'); $('spawnBtns').style.display = G.sandbox ? '' : 'none'; },
  // --- chat ---
  openChat() { this.chatOpen = true; const c = $('chatIn'); c.classList.remove('hide'); c.value = ''; unlockPointer(); setTimeout(() => c.focus(), 0); },
  closeChat() { this.chatOpen = false; const c = $('chatIn'); c.blur(); c.classList.add('hide'); if (G.mode === 'play') lockPointer(); },
  addChat(n, text, c) {
    const d = document.createElement('div'); d.innerHTML = (n ? '<b style="color:' + (c || '#fff') + '">' + String(n).replace(/</g, '&lt;') + ':</b> ' : '<i style="color:' + (c || '#ffd23d') + '">') + String(text).replace(/</g, '&lt;') + (n ? '' : '</i>');
    const box = $('chat'); box.appendChild(d); while (box.children.length > 7) box.firstChild.remove();
    setTimeout(() => d.style.opacity = '0.35', 9000);
  },
  // --- feedback ---
  toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; const b = $('toasts'); b.appendChild(d); while (b.children.length > 5) b.firstChild.remove(); setTimeout(() => d.remove(), 4500); },
  banner(t, c = '#fff') { const b = $('banner'); b.textContent = t; b.style.color = c; b.style.opacity = 1; this.bannerT = 4.5; },
  shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); },
  flashStatic() { this.staticT = 0.8; },
  signalOverlay(on) { $('sig').classList.toggle('on', on); this.sigOn = on; },
  viewGain(v) { this.gainV += v; this.gainT = 1.6; },
  spectate(name) { const s = $('spec'); if (name === false) { s.classList.add('hide'); return; } s.classList.remove('hide'); s.innerHTML = 'YOU ARE DEAD' + (name ? '<br><small>spectating ' + String(name).replace(/</g, '&lt;') + ' — tap / click to switch</small>' : '<br><small>waiting for the bell…</small>'); },
  refresh() {
    if (G.mode !== 'play') return;
    $('quota').innerHTML = 'QUOTA #' + G.qn + ' · Day ' + Math.min(G.day, 3) + '/3<br>Views <b>' + fmt(G.views) + '</b> / ' + fmt(G.quota) + '<br>$' + fmt(G.money) + ' · ' + (G.phase === 'dive' ? MAPS[G.mapType].n : 'Safe world');
    if (!NET.solo) { $('lobby').innerHTML = 'LOBBY CODE<br><big>' + NET.code + '</big><br>' + (PLAYERS.size + 1) + ' player' + (PLAYERS.size ? 's' : '') + (BOTS.length || BOTV.length ? ' + ' + (BOTS.length || BOTV.length) + ' bots' : ''); }
    const slots = [{ ic: '📹', n: 'Camera' }].concat(P.inv.map(it => it ? { ic: SHOP.find(s => s.k === it.k).ic, u: it.uses } : null));
    $('hot').innerHTML = slots.map((s, i) => '<div class="slot' + (P.slot === i ? ' on' : '') + '" data-i="' + i + '"><small>' + (i + 1) + '</small>' + (s ? s.ic : '') + (s && s.u > 1 ? '<em>×' + s.u + '</em>' : '') + '</div>').join('');
  },
  hud(inter) {
    if (G.mode !== 'play') return;
    const bar = (id, v, max, txt) => { const e = $(id); e.firstElementChild.style.width = clamp(v / max * 100, 0, 100) + '%'; if (txt != null) e.lastElementChild.textContent = txt; };
    bar('bHp', P.hp, 100, 'HP ' + Math.max(0, Math.ceil(P.hp))); bar('bSt', P.stam, 100);
    const sig = P.area === 'sig';
    $('bO2').classList.toggle('hide', !sig); if (sig) { bar('bO2', P.o2, O2_BASE + 90, 'OXYGEN ' + Math.floor(P.o2 / 60) + ':' + String(Math.floor(P.o2 % 60)).padStart(2, '0')); $('bO2').classList.toggle('warn', P.o2 < 45); }
    bar('bFilm', P.film, FILM_BASE + 60, 'FILM ' + Math.ceil(P.film) + 's' + (P.score > 1 ? ' · ' + fmt(P.score) + ' views on tape' : ''));
    const pr = $('prompt'); if (inter && !this.blocking()) { pr.classList.remove('hide'); pr.innerHTML = '<kbd>' + (IS_TOUCH ? 'USE' : 'E') + '</kbd>' + inter.label(); } else pr.classList.add('hide');
    const lv = $('lever'); if (G.lever > 0) { lv.classList.remove('hide'); lv.textContent = (G.leverSide === 'sig' ? '🔔 BELL GOING UP IN ' : '🔔 BELL DIVING IN ') + Math.ceil(G.lever) + (G.leverSide === 'sig' && P.area === 'sig' ? ' — GET INSIDE!' : ''); } else lv.classList.add('hide');
    const c = $('carry'); if (P.carry.length) { c.classList.remove('hide'); c.textContent = '🎒 ' + P.carry.map(t => ARTIFACTS[t].n).join(', ') + ' ($' + P.carry.reduce((s, t) => s + ARTIFACTS[t].v, 0) + ')'; } else c.classList.add('hide');
    const vf = $('vf'); const up = P.camUp && P.alive; vf.classList.toggle('hide', !up); $('cross').classList.toggle('hide', up);
    if (up) { $('vfRec').classList.toggle('rec', P.rec); $('vfT').textContent = P.rec ? 'REC' : 'STBY'; $('vfFilm').innerHTML = 'FILM ' + Math.ceil(P.film) + 's<br>' + (P.area === 'sig' ? '📶 SIGNAL' : 'NO MONSTERS HERE'); }
    $('hurt').style.opacity = Math.max(0, P.hurtFlash) + (P.alive && P.hp < 30 ? 0.25 + Math.sin(W.t * 6) * 0.1 : 0);
  },
  keys() {
    if (pressedChat()) this.openChat();
    if (pressed('KeyP') || pressed('Escape')) { if (this.panel) this.close(); else if (this.paused) this.unpause(); else if (!this.blocking()) { this.pause(); unlockPointer(); } }
    if (pressed('Tab') && !this.blocking()) this.openBook();
  },
  tick(dt) {
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) $('banner').style.opacity = 0; }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.5); this.syncPad();
    if (this.gainT > 0) { this.gainT -= dt; $('vfGain').style.opacity = 1; $('vfGain').textContent = '+' + fmt(this.gainV) + ' views'; if (this.gainT <= 0) { $('vfGain').style.opacity = 0; this.gainV = 0; } }
    if (this.staticT > 0) this.staticT -= dt;
    const nOp = (this.staticT > 0 ? this.staticT : 0) + (this.sigOn && G.mode === 'play' ? 0.07 : 0) + (P.grabBy ? 0.25 : 0);
    const n = $('noise'); n.style.opacity = nOp;
    if (nOp > 0.01) { const x = this.noiseCtx, d = x.createImageData(160, 90); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = v * 0.8; d.data[i + 1] = v; d.data[i + 2] = v * 0.95; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); }
  },
};
function pressedChat() { return !UI.chatOpen && !UI.panel && !UI.paused && (pressed('KeyT') || pressed('Enter')); }
