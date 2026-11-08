/* Escape from Barkov — menus and the grid inventory */
'use strict';
(() => {
const I = G.ITEMS;
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
G.$ = $; G.h = h;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
G.esc = esc;

/* ---------- toasts / modals ---------- */
G.toast = (msg, kind = '') => { const t = h('div', 'toast ' + kind, esc(msg)); $('#toasts').appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200); };
G.modal = (title, body, btns = [{ t: 'OK' }]) => new Promise(res => {
  const m = h('div', 'modal-bg'); const box = h('div', 'modal'); box.appendChild(h('h3', '', esc(title)));
  const b = h('div', 'modal-body'); if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body); box.appendChild(b);
  const row = h('div', 'modal-btns'); btns.forEach(o => { const x = h('button', 'btn ' + (o.c || ''), esc(o.t)); x.onclick = () => { m.remove(); res(o.v !== undefined ? o.v : o.t); }; row.appendChild(x); });
  box.appendChild(row); m.appendChild(box); document.body.appendChild(m);
});
G.confirm = async (title, txt) => (await G.modal(title, txt, [{ t: 'Cancel', v: false }, { t: 'Confirm', v: true, c: 'gold' }])) === true;

/* ---------- item icons (procedural) ---------- */
const iconCache = {};
G.icon = (id, rot) => {
  const k = id + (rot ? 'r' : ''); if (iconCache[k]) return iconCache[k];
  const d = I[id]; const S = 64; const W = d.w * S, H = d.h * S;
  const c = document.createElement('canvas'); c.width = rot ? H : W; c.height = rot ? W : H; const x = c.getContext('2d');
  if (rot) { x.translate(H, 0); x.rotate(Math.PI / 2); }
  drawIcon(x, d, W, H);
  return iconCache[k] = c.toDataURL();
};
function drawIcon(x, d, W, H) {
  const col = d.col || '#666'; x.lineJoin = 'round'; x.lineCap = 'round';
  const shade = (c, a) => { x.fillStyle = c; x.globalAlpha = a; };
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  const fillS = (c) => { x.fillStyle = c; x.fill(); x.globalAlpha = .55; x.strokeStyle = '#000'; x.lineWidth = 2; x.stroke(); x.globalAlpha = 1; };
  const t = d.type;
  if (t === 'weapon') {
    const cy = H * .42, L = W * .92, o = W * .04;
    const pistol = d.cls === 'pistol';
    if (pistol) { rr(o, cy - 10, L * .9, 18, 4); fillS(col); rr(o + L * .5, cy + 4, 14, H * .45, 4); fillS('#2b2620'); return; }
    // stock
    if (d.id !== 'bark74u' && d.id !== 'mpfir') { x.beginPath(); x.moveTo(o, cy - 6); x.lineTo(o + L * .24, cy - 4); x.lineTo(o + L * .24, cy + 10); x.lineTo(o, cy + 20); x.closePath(); fillS(d.cls === 'shotgun' || d.id === 'sticks' || d.id === 'mossin' || d.id === 'svdwood' ? '#7a4f2a' : '#2a2724'); }
    rr(o + L * .22, cy - 9, L * .34, 18, 3); fillS(col); // receiver
    rr(o + L * .56, cy - 5, L * .42, 8, 2); fillS('#1d1d1b'); // barrel
    rr(o + L * .5, cy + 1, L * .2, 9, 3); fillS(d.cls === 'rifle' && d.id !== 'm4acorn' ? '#7a4f2a' : '#2a2a28'); // handguard
    rr(o + L * .3, cy + 6, 11, H * .3, 3); fillS('#262420'); // grip
    if (d.mt) { x.beginPath(); x.moveTo(o + L * .42, cy + 8); x.quadraticCurveTo(o + L * .45, cy + H * .35, o + L * .5, cy + H * .45); x.lineTo(o + L * .55, cy + H * .42); x.quadraticCurveTo(o + L * .5, cy + H * .3, o + L * .5, cy + 8); x.closePath(); fillS('#3a3328'); }
    if (d.internal) { rr(o + L * .5, cy + 8, L * .35, 7, 3); fillS('#2a2a28'); }
    return;
  }
  if (t === 'mag') { x.beginPath(); const cx = W / 2; x.moveTo(cx - 10, 6); x.lineTo(cx + 10, 6); x.quadraticCurveTo(cx + 14, H * .6, cx + 22, H - 8); x.lineTo(cx, H - 6); x.quadraticCurveTo(cx - 6, H * .6, cx - 10, 6); fillS(d.cap > 40 ? '#2f2a22' : '#3a3328'); return; }
  if (t === 'ammo') { for (let i = 0; i < 3; i++) { const bx = 14 + i * 13, by = 14 + i * 3; rr(bx, by + 10, 9, 30, 2); fillS(d.cal === '12ga' ? '#a8322a' : '#b8913a'); x.beginPath(); x.moveTo(bx, by + 11); x.quadraticCurveTo(bx + 4.5, by - 4, bx + 9, by + 11); fillS(d.cal === '12ga' ? '#c9a64a' : '#8a5a2a'); } return; }
  if (t === 'money') { for (let i = 0; i < 3; i++) { rr(8 + i * 3, 16 + i * 6, 44, 24, 3); fillS(['#3f5e34', '#4e7040', '#5c8250'][i]); } x.fillStyle = '#d8e8b8'; x.font = 'bold 16px sans-serif'; x.fillText('₽', 26, 46); return; }
  if (t === 'med') {
    rr(8, H * .2, W - 16, H * .62, 6); fillS(col);
    x.fillStyle = d.stim || d.pain ? '#1d3a1d' : '#fff'; x.globalAlpha = .9;
    if (d.pain || d.stim) { rr(W / 2 - 4, H * .3, 8, H * .4, 3); x.fill(); } else { x.fillRect(W / 2 - 4, H / 2 - 13, 8, 26); x.fillRect(W / 2 - 13, H / 2 - 4, 26, 8); }
    x.globalAlpha = 1; return;
  }
  if (t === 'food') { if (d.h > 1) { rr(W / 2 - 13, 18, 26, H - 26, 8); fillS(col); rr(W / 2 - 6, 6, 12, 14, 3); fillS('#ddd'); } else { rr(12, 16, W - 24, H - 28, 6); fillS(col); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(12, 26, W - 24, 10); } return; }
  if (t === 'armor' || (t === 'rig' && d.cls)) { x.beginPath(); x.moveTo(W * .25, H * .1); x.lineTo(W * .4, H * .2); x.lineTo(W * .6, H * .2); x.lineTo(W * .75, H * .1); x.lineTo(W * .9, H * .3); x.lineTo(W * .85, H * .92); x.lineTo(W * .15, H * .92); x.lineTo(W * .1, H * .3); x.closePath(); fillS(col); rr(W * .3, H * .4, W * .4, H * .3, 6); fillS('rgba(0,0,0,.25)'); return; }
  if (t === 'helmet') { x.beginPath(); x.arc(W / 2, H * .62, W * .38, Math.PI, 0); x.lineTo(W * .92, H * .7); x.lineTo(W * .08, H * .7); x.closePath(); fillS(col); if (d.face) { rr(W * .2, H * .55, W * .6, H * .3, 6); fillS('rgba(90,120,90,.7)'); } return; }
  if (t === 'rig') { x.beginPath(); x.moveTo(W * .2, H * .1); x.lineTo(W * .8, H * .1); x.lineTo(W * .88, H * .85); x.lineTo(W * .12, H * .85); x.closePath(); fillS(col); for (let i = 0; i < 3; i++) { rr(W * (.18 + i * .22), H * .4, W * .18, H * .38, 4); fillS('rgba(0,0,0,.28)'); } return; }
  if (t === 'backpack' || t === 'secure') { rr(W * .15, H * .15, W * .7, H * .78, 14); fillS(col); rr(W * .25, H * .5, W * .5, H * .32, 8); fillS('rgba(0,0,0,.25)'); if (t === 'secure') { x.fillStyle = '#9fbf5a'; x.beginPath(); x.ellipse(W / 2, H * .35, 8, 12, 0, 0, 7); x.fill(); } return; }
  if (t === 'grenade') { x.beginPath(); x.ellipse(W / 2, H / 2 + 4, 16, 22, 0, 0, 7); fillS('#6b4a28'); for (let i = 0; i < 4; i++) { x.strokeStyle = '#3a2814'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 14, H / 2 - 10 + i * 8); x.lineTo(W / 2 + 14, H / 2 - 6 + i * 8); x.stroke(); } rr(W / 2 - 4, 6, 8, 10, 2); fillS('#555'); return; }
  if (t === 'key') { x.beginPath(); x.arc(20, H / 2, 11, 0, 7); x.strokeStyle = col; x.lineWidth = 6; x.stroke(); x.fillStyle = col; x.fillRect(30, H / 2 - 3, 26, 6); x.fillRect(48, H / 2, 4, 10); x.fillRect(40, H / 2, 4, 7); return; }
  if (t === 'mod') { if (d.slot === 'sight') { rr(10, H * .35, W - 20, H * .3, 8); fillS(col); x.beginPath(); x.arc(W - 16, H / 2, 6, 0, 7); x.fillStyle = d.zoom > 1 ? '#5a8aa8' : '#c33'; x.fill(); } else { rr(6, H * .38, W - 12, H * .24, 6); fillS(col); } return; }
  // barter: generic
  if (d.id === 'acorn_gold') { x.beginPath(); x.ellipse(W / 2, H / 2 + 5, 15, 18, 0, 0, 7); fillS('#e8b923'); x.beginPath(); x.ellipse(W / 2, H / 2 - 10, 18, 8, 0, 0, 7); fillS('#8a6a22'); return; }
  if (d.id === 'lumen') { x.beginPath(); x.moveTo(W / 2, 6); x.lineTo(W - 14, H / 2); x.lineTo(W / 2, H - 6); x.lineTo(14, H / 2); x.closePath(); fillS('#7ae0ff'); return; }
  rr(W * .14, H * .18, W * .72, H * .64, 8); fillS(col); x.fillStyle = 'rgba(255,255,255,.15)'; x.fillRect(W * .2, H * .25, W * .3, H * .12);
}

/* ---------- inventory model helpers ---------- */
const SLOT_ACCEPT = {
  primary: d => d.type === 'weapon' && d.slot === 'primary', secondary: d => d.type === 'weapon' && d.slot === 'primary', holster: d => d.type === 'weapon' && d.slot === 'holster',
  helmet: d => d.type === 'helmet', armor: d => d.type === 'armor', rig: d => d.type === 'rig', backpack: d => d.type === 'backpack', secure: d => d.type === 'secure',
};
const SLOT_NAMES = { primary: 'On sling', secondary: 'On back', holster: 'Holster', helmet: 'Headwear', armor: 'Body armor', rig: 'Tactical rig', backpack: 'Backpack', secure: 'Secure container' };
G.SLOT_ACCEPT = SLOT_ACCEPT;

// a "src" describes where an item currently lives so it can be removed
function removeFrom(src) {
  if (src.k === 'grid') return !!G.gridRemove(src.g, src.it);
  if (src.k === 'slot') { if (src.eq[src.slot] !== src.it) return false; src.eq[src.slot] = null; return true; }
  if (src.k === 'mod') { if (src.w.mods[src.slot] !== src.it) return false; src.w.mods[src.slot] = null; return true; }
  if (src.k === 'wmag') { if (src.w.mag !== src.it) return false; src.w.mag = null; return true; }
  return false;
}
function restore(src, e) {
  if (src.k === 'grid') src.g.items.push(e || { it: src.it, x: src.x, y: src.y, r: src.r });
  else if (src.k === 'slot') src.eq[src.slot] = src.it;
  else if (src.k === 'mod') src.w.mods[src.slot] = src.it;
  else if (src.k === 'wmag') src.w.mag = src.it;
}
G.removeFrom = removeFrom;

// drop ammo into a magazine / internal weapon; returns rounds loaded
G.loadAmmo = (target, stack, max = 999) => {
  const d = I[target.id]; const ad = I[stack.id];
  const cap = d.type === 'mag' ? d.cap : d.internal; const cal = d.cal;
  if (ad.type !== 'ammo' || ad.cal !== cal || !cap) return 0;
  const n = Math.min(cap - target.rounds.length, stack.n, max); for (let i = 0; i < n; i++) target.rounds.push(stack.id);
  stack.n -= n; return n;
};
G.unloadRounds = (holder, g) => { // put rounds back as stacks into grid g (or give to stash)
  const counts = {}; holder.rounds.forEach(a => counts[a] = (counts[a] || 0) + 1); holder.rounds = [];
  if (holder.ch) { counts[holder.ch] = (counts[holder.ch] || 0) + 1; holder.ch = null; }
  const left = [];
  for (const a in counts) { let n = counts[a]; while (n > 0) { const k = Math.min(n, 60); const st = G.mk(a, { n: k, fir: holder.fir }); n -= k; if (!g || !G.gridAdd(g, st)) left.push(st); } }
  return left;
};

/* ---------- drag & drop ---------- */
const DR = { on: false };
let invCtx = null; // { eq, extra grids (stash/loot), inRaid, rerender }
G.invCtx = () => invCtx;
function startDrag(ev, it, src, el) {
  if (ev.button === 2) return;
  if (invCtx && invCtx.locked && invCtx.locked(it, src)) return;
  const sx = ev.clientX, sy = ev.clientY; let started = false; const rect = el.getBoundingClientRect();
  const offX = sx - rect.left, offY = sy - rect.top; const pid = ev.pointerId;
  const move = e => {
    if (e.pointerId !== pid) return;
    if (!started) { if (Math.hypot(e.clientX - sx, e.clientY - sy) < 6) return; started = true; DR.on = true; DR.it = it; DR.src = src; DR.r = !!src.r; DR.ghost = makeGhost(it, DR.r); document.body.appendChild(DR.ghost); el.classList.add('dragging'); }
    DR.x = e.clientX; DR.y = e.clientY; DR.offX = Math.min(offX, 24); DR.offY = Math.min(offY, 24);
    DR.ghost.style.left = (e.clientX - DR.offX) + 'px'; DR.ghost.style.top = (e.clientY - DR.offY) + 'px'; highlight();
  };
  const up = e => {
    if (e.pointerId !== pid) return;
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    if (!started) return; DR.on = false; el.classList.remove('dragging'); DR.ghost.remove(); clearHi();
    doDrop(e.clientX, e.clientY);
  };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
function makeGhost(it, r) { const g = h('div', 'ghost'); const [w, hh] = G.size(it, r); const cs = cell(); g.style.width = w * cs + 'px'; g.style.height = hh * cs + 'px'; g.innerHTML = `<img src="${G.icon(it.id, r)}">`; return g; }
const cell = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cell')) || 48;
window.addEventListener('keydown', e => { if (DR.on && (e.code === 'KeyR' || e.code === 'Space')) { e.preventDefault(); DR.r = !DR.r; const ng = makeGhost(DR.it, DR.r); ng.style.left = DR.ghost.style.left; ng.style.top = DR.ghost.style.top; DR.ghost.replaceWith(ng); DR.ghost = ng; highlight(); } });
G.rotateDrag = () => { if (DR.on) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR' })); };
function targetAt(x, y) {
  DR.ghost && (DR.ghost.style.display = 'none'); const el = document.elementFromPoint(x, y); DR.ghost && (DR.ghost.style.display = '');
  if (!el) return null;
  const itEl = el.closest('.item'); const gEl = el.closest('.grid'); const sEl = el.closest('.slot'); const mEl = el.closest('.modslot'); const gr = el.closest('.ground-drop');
  if (gr) return { k: 'ground' };
  if (mEl) return { k: 'mod', el: mEl };
  if (itEl && itEl._it && itEl._it !== DR.it) { const t = { k: 'item', el: itEl, it: itEl._it, src: itEl._src }; if (gEl && gEl._g) { t.g = gEl._g; t.gEl = gEl; } return t; }
  if (sEl) return { k: 'slot', el: sEl };
  if (gEl && gEl._g) return { k: 'grid', el: gEl, g: gEl._g };
  return null;
}
function gridPos(gEl, x, y) { const r = gEl.getBoundingClientRect(); const cs = cell(); return { gx: Math.round((x - DR.offX - r.left) / cs), gy: Math.round((y - DR.offY - r.top) / cs) }; }
function clearHi() { document.querySelectorAll('.hi-ok,.hi-bad').forEach(e => e.classList.remove('hi-ok', 'hi-bad')); document.querySelectorAll('.drop-shadow').forEach(e => e.remove()); }
function highlight() {
  clearHi(); const t = targetAt(DR.x, DR.y); if (!t) return;
  if (t.k === 'grid') {
    const { gx, gy } = gridPos(t.el, DR.x, DR.y); const [w, hh] = G.size(DR.it, DR.r); const ok = G.gridFits(t.g, gx, gy, w, hh, DR.it) && G.canHold(t.g, DR.it) && !gridInsideItem(t.g, DR.it);
    const s = h('div', 'drop-shadow ' + (ok ? 'ok' : 'bad')); const cs = cell(); Object.assign(s.style, { left: gx * cs + 'px', top: gy * cs + 'px', width: w * cs + 'px', height: hh * cs + 'px' }); t.el.appendChild(s);
  } else if (t.k === 'slot') t.el.classList.add(SLOT_ACCEPT[t.el.dataset.slot] && SLOT_ACCEPT[t.el.dataset.slot](I[DR.it.id]) && !t.el._eq[t.el.dataset.slot] ? 'hi-ok' : 'hi-bad');
  else if (t.k === 'item' || t.k === 'mod') (t.el).classList.add(canCombine(DR.it, t) ? 'hi-ok' : 'hi-bad');
  else if (t.k === 'ground') document.querySelector('.ground-drop').classList.add('hi-ok');
}
function gridInsideItem(g, it) { return it.grid && (it.grid === g || G.itemsDeep(it).some(x => x.grid === g)); }
function canCombine(it, t) {
  const d = I[it.id];
  if (t.k === 'mod') { const w = t.el._w; const s = t.el.dataset.mod; return d.type === 'mod' && d.slot === s && !w.mods[s] && modFits(w, it); }
  const td = I[t.it.id];
  if (d.stack && it.id === t.it.id && t.it.n < d.stack) return true;
  if (d.type === 'ammo' && (td.type === 'mag' || (td.type === 'weapon' && td.internal)) && td.cal === d.cal) return true;
  if (d.type === 'mag' && td.type === 'weapon' && td.mt === d.mt) return true;
  if (d.type === 'mod' && td.type === 'weapon' && td.rail !== false && modFits(t.it, it) && !t.it.mods[d.slot]) return true;
  if (t.it.grid && G.canHold(t.it.grid, it) && it !== t.it && !G.contains(it, t.it) && G.gridFind(t.it.grid, it)) return true;
  return false;
}
function modFits(w, m) { const wd = I[w.id], md = I[m.id]; if (md.slot === 'sight') return wd.rail !== false; if (md.slot === 'muzzle') return (md.fits || []).includes(wd.cal) && wd.cls !== 'shotgun'; return false; }
G.modFits = modFits;
function doDrop(x, y) {
  const t = targetAt(x, y); const it = DR.it, src = DR.src; if (!t) return;
  const d = I[it.id];
  if (invCtx && invCtx.canMove && !invCtx.canMove(it, src, t)) return;
  const done = () => { invCtx && invCtx.onChange && invCtx.onChange(); G.renderInv(); };
  if (t.k === 'ground') { if (!invCtx || !invCtx.dropGround) return; if (!removeFrom(src)) return; invCtx.dropGround(it); return done(); }
  if (t.k === 'grid') {
    const { gx, gy } = gridPos(t.el, x, y); const [w, hh] = G.size(it, DR.r);
    if (!G.canHold(t.g, it) || gridInsideItem(t.g, it)) return G.toast('Can\'t put that there', 'bad');
    if (!G.gridFits(t.g, gx, gy, w, hh, it)) return;
    const oldE = src.k === 'grid' ? src.g.items.find(e => e.it === it) : null;
    if (!removeFrom(src)) return; G.gridPut(t.g, it, gx, gy, DR.r); return done();
  }
  if (t.k === 'slot') {
    const s = t.el.dataset.slot, eq = t.el._eq; if (!SLOT_ACCEPT[s](d) || eq[s]) return;
    if (invCtx && invCtx.inRaid && s === 'secure') return G.toast('Can\'t swap the secure container in raid', 'bad');
    if (!removeFrom(src)) return; eq[s] = it; G.setFir && 0; return done();
  }
  if (t.k === 'mod') { const w = t.el._w, s = t.el.dataset.mod; if (d.type !== 'mod' || d.slot !== s || w.mods[s] || !modFits(w, it)) return; if (!removeFrom(src)) return; w.mods[s] = it; return done(); }
  if (t.k === 'item') {
    const tg = t.it, td = I[tg.id];
    if (d.stack && it.id === tg.id) { const n = Math.min(d.stack - tg.n, it.n); if (n <= 0) return; tg.n += n; it.n -= n; if (it.n <= 0) removeFrom(src); return done(); }
    if (d.type === 'ammo' && (td.type === 'mag' || (td.type === 'weapon' && td.internal)) && td.cal === d.cal) {
      const n = G.loadAmmo(tg, it); if (!n) return; if (it.n <= 0) removeFrom(src);
      if (invCtx && invCtx.onLoad) invCtx.onLoad(n); return done();
    }
    if (d.type === 'mag' && td.type === 'weapon' && td.mt === d.mt) {
      const old = tg.mag; if (!removeFrom(src)) return; tg.mag = it;
      if (old) { if (src.k === 'grid' && G.gridFits(src.g, src.x, src.y, ...G.size(old, src.r), null)) G.gridPut(src.g, old, src.x, src.y, src.r); else if (!placeAnywhere(old)) { tg.mag = old; restore(src); G.toast('No room for the old magazine', 'bad'); } }
      return done();
    }
    if (d.type === 'mod' && td.type === 'weapon' && modFits(tg, it) && !tg.mods[d.slot]) { if (!removeFrom(src)) return; tg.mods[d.slot] = it; return done(); }
    if (tg.grid && it !== tg && !G.contains(it, tg) && G.canHold(tg.grid, it)) {
      const s = G.gridFind(tg.grid, it); if (!s) return G.toast('Not enough space', 'bad');
      if (!removeFrom(src)) return; G.gridPut(tg.grid, it, s.x, s.y, s.r); return done();
    }
    // fall back to grid placement under the pointer if the target item is in a grid
    if (t.g) { const { gx, gy } = gridPos(t.gEl, x, y); const [w, hh] = G.size(it, DR.r); if (G.canHold(t.g, it) && G.gridFits(t.g, gx, gy, w, hh, it) && !gridInsideItem(t.g, it)) { if (!removeFrom(src)) return; G.gridPut(t.g, it, gx, gy, DR.r); return done(); } }
  }
}
function placeAnywhere(it) { if (!invCtx) return false; for (const g of invCtx.grids()) if (G.canHold(g, it) && G.gridAdd(g, it)) return true; return false; }
G.placeAnywhere = placeAnywhere;

/* ---------- rendering ---------- */
function itemEl(it, src, x, y, r) {
  const d = I[it.id]; const cs = cell(); const [w, hh] = G.size(it, r);
  const e = h('div', 'item t-' + d.type); e._it = it; e._src = src;
  if (x != null) Object.assign(e.style, { left: x * cs + 'px', top: y * cs + 'px', width: w * cs + 'px', height: hh * cs + 'px' });
  if (it.unk) { e.classList.add('unk'); e.innerHTML = '<span class="q">?</span>'; return e; }
  let badge = '';
  if (d.stack) badge = d.type === 'money' ? G.fmt(it.n) : it.n;
  else if (d.type === 'mag') badge = it.rounds.length + '/' + d.cap;
  else if (d.type === 'weapon') { const n = (it.mag ? it.mag.rounds.length : it.rounds ? it.rounds.length : 0) + (it.ch ? 1 : 0); badge = it.mag || d.internal ? n : '—'; }
  else if (d.dur) badge = Math.round(it.dur) + '/' + d.dur;
  else if (d.res > 1) badge = Math.round(it.res) + '/' + d.res;
  else if (d.uses) badge = it.uses + '/' + d.uses;
  e.innerHTML = `<img src="${G.icon(it.id, r)}" draggable="false"><span class="nm">${esc(d.short)}</span>${badge !== '' ? `<span class="bd">${badge}</span>` : ''}${it.fir ? '<span class="fir" title="Found in raid">✔</span>' : ''}${it.ins ? '<span class="ins" title="Insured">⛨</span>' : ''}${(it.mods && (it.mods.sight || it.mods.muzzle)) ? '<span class="mod">◈</span>' : ''}`;
  e.title = d.name;
  e.addEventListener('pointerdown', ev => { if (ev.button === 0) startDrag(ev, it, src, e); });
  e.addEventListener('contextmenu', ev => { ev.preventDefault(); ctxMenu(ev.clientX, ev.clientY, it, src); });
  e.addEventListener('dblclick', () => { if (it.grid) openWin(it); else inspect(it); });
  let lp; e.addEventListener('touchstart', ev => { const t = ev.touches[0]; lp = setTimeout(() => ctxMenu(t.clientX, t.clientY, it, src), 550); }, { passive: true });
  e.addEventListener('touchmove', () => clearTimeout(lp), { passive: true }); e.addEventListener('touchend', () => clearTimeout(lp));
  return e;
}
G.gridEl = (g, title) => {
  const cs = cell(); const wrap = h('div', 'gridwrap'); if (title) wrap.appendChild(h('div', 'gtitle', title));
  const el = h('div', 'grid'); el._g = g; el.style.width = g.w * cs + 'px'; el.style.height = g.h * cs + 'px';
  g.items.forEach(e => el.appendChild(itemEl(e.it, { k: 'grid', g, it: e.it, x: e.x, y: e.y, r: e.r }, e.x, e.y, e.r)));
  wrap.appendChild(el); return wrap;
};
function slotEl(eq, s, label) {
  const el = h('div', 'slot s-' + s); el.dataset.slot = s; el._eq = eq; el.appendChild(h('div', 'slab', label || SLOT_NAMES[s]));
  const it = eq[s];
  if (it) { const ie = itemEl(it, { k: 'slot', eq, slot: s, it }); ie.classList.add('inslot'); el.appendChild(ie); }
  return el;
}
G.slotEl = slotEl;
// equipment panel + container grids for an eq object
G.eqPanel = (eq, opts = {}) => {
  const p = h('div', 'eqpanel');
  const top = h('div', 'eqtop');
  const col1 = h('div', 'eqcol'); ['helmet', 'armor', 'rig', 'backpack'].forEach(s => col1.appendChild(slotEl(eq, s)));
  const col2 = h('div', 'eqcol wide'); ['primary', 'secondary', 'holster'].forEach(s => { const se = slotEl(eq, s); se.classList.add('wslot'); col2.appendChild(se); });
  top.appendChild(col1); top.appendChild(col2); p.appendChild(top);
  return p;
};
G.contPanel = (eq, opts = {}) => {
  const p = h('div', 'contpanel');
  if (eq.rig) p.appendChild(G.gridEl(eq.rig.grid, 'TACTICAL RIG — ' + I[eq.rig.id].short));
  if (eq.pockets) p.appendChild(G.gridEl(eq.pockets, 'POCKETS'));
  if (eq.backpack) p.appendChild(G.gridEl(eq.backpack.grid, 'BACKPACK — ' + I[eq.backpack.id].short));
  if (eq.secure && !opts.noSecure) { const sw = G.gridEl(eq.secure.grid, 'SECURE CONTAINER — ' + I[eq.secure.id].short); eq.secure.grid.secure = true; p.appendChild(sw); }
  return p;
};
G.eqGrids = eq => [eq.rig && eq.rig.grid, eq.pockets, eq.backpack && eq.backpack.grid, eq.secure && eq.secure.grid].filter(Boolean);

/* container windows (double-click a backpack in the stash) */
const wins = [];
function openWin(it) { if (wins.includes(it)) return; wins.push(it); G.renderInv(); }
function renderWins(root) {
  for (let i = wins.length - 1; i >= 0; i--) if (!invCtx || !invCtx.alive || !invCtx.alive(wins[i])) wins.splice(i, 1);
  wins.forEach((it, i) => {
    const w = h('div', 'cwin'); w.style.left = (220 + i * 30) + 'px'; w.style.top = (120 + i * 30) + 'px';
    const hd = h('div', 'cwin-h', esc(I[it.id].name) + '<b>✕</b>'); hd.querySelector('b').onclick = () => { wins.splice(wins.indexOf(it), 1); G.renderInv(); };
    w.appendChild(hd); w.appendChild(G.gridEl(it.grid)); root.appendChild(w);
    let dx, dy; hd.onpointerdown = e => { dx = e.clientX - w.offsetLeft; dy = e.clientY - w.offsetTop; const mv = ev => { w.style.left = ev.clientX - dx + 'px'; w.style.top = ev.clientY - dy + 'px'; }; const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); }; window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); };
  });
}

/* context menu */
function ctxMenu(x, y, it, src) {
  closeCtx(); if (it.unk) return; const d = I[it.id]; const m = h('div', 'ctx'); m.id = 'ctx';
  const add = (t, f) => { const b = h('div', 'ci', t); b.onclick = () => { closeCtx(); f(); }; m.appendChild(b); };
  add('Inspect', () => inspect(it));
  if (it.grid) add('Open', () => openWin(it));
  if ((d.type === 'med' || d.type === 'food') && invCtx && invCtx.use) add('Use', () => invCtx.use(it, src));
  if (d.type === 'mag' && it.rounds.length) add('Unload ammo', () => { const g = src.k === 'grid' ? src.g : null; const left = G.unloadRounds(it, g); left.forEach(l => placeAnywhere(l) || (invCtx && invCtx.dropGround ? invCtx.dropGround(l) : G.give(l))); refresh(); });
  if (d.type === 'mag' || (d.type === 'weapon' && d.internal)) { const stacks = allVisible().filter(x => I[x.id].type === 'ammo' && I[x.id].cal === d.cal); const kinds = [...new Set(stacks.map(s => s.id))]; kinds.forEach(k => add('Load ' + I[k].name, () => { let n = 0; for (const s of stacks.filter(s => s.id === k)) { n += G.loadAmmo(it, s); if (s.n <= 0) removeStack(s); } if (invCtx && invCtx.onLoad) invCtx.onLoad(n); refresh(); })); }
  if (d.type === 'weapon') {
    if (it.mag) add('Remove magazine', () => { const mg = it.mag; it.mag = null; if (!placeAnywhere(mg)) { it.mag = mg; G.toast('No space', 'bad'); } refresh(); });
    if (d.internal && it.rounds.length) add('Unload rounds', () => { G.unloadRounds(it, null).forEach(l => placeAnywhere(l) || G.give(l)); refresh(); });
    if (d.rail !== false || true) add('Modify…', () => modWin(it));
  }
  if (d.stack && it.n > 1) add('Split stack', async () => { const n = Math.floor(it.n / 2); const ns = G.mk(it.id, { n, fir: it.fir }); if (placeAnywhere(ns)) { it.n -= n; } else G.toast('No space', 'bad'); refresh(); });
  if (invCtx && invCtx.bind && (d.type === 'med' || d.type === 'food' || d.type === 'grenade')) [4, 5, 6, 7].forEach(k => add('Bind to ' + k, () => invCtx.bind(k, it)));
  if (invCtx && invCtx.sellHere) add('Sell to ' + invCtx.sellHere.name, () => invCtx.sellHere.sell(it, src));
  if (invCtx && invCtx.dropGround) add('Drop', () => { if (removeFrom(src)) { invCtx.dropGround(it); refresh(); } });
  if (!invCtx || !invCtx.inRaid) add('<span class="bad">Discard</span>', async () => { if (await G.confirm('Discard', 'Destroy ' + esc(d.name) + '? This cannot be undone.')) { removeFrom(src); refresh(); } });
  document.body.appendChild(m); const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 6) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 6) + 'px';
}
function closeCtx() { const c = $('#ctx'); if (c) c.remove(); }
window.addEventListener('pointerdown', e => { if (!e.target.closest('#ctx')) closeCtx(); });
function refresh() { invCtx && invCtx.onChange && invCtx.onChange(); G.renderInv(); }
function allVisible() { if (!invCtx) return []; const out = []; invCtx.grids().forEach(g => g.items.forEach(e => out.push(e.it))); return out; }
function removeStack(s) { for (const g of invCtx.grids()) if (G.gridRemove(g, s)) return; }
function modWin(w) {
  const body = h('div', 'modwin'); const wd = I[w.id];
  const render = () => {
    body.innerHTML = `<div class="mw-name">${esc(wd.name)}</div>`;
    const row = h('div', 'mw-row');
    ['sight', 'muzzle'].forEach(s => {
      const ok = s === 'sight' ? wd.rail !== false : wd.cls !== 'shotgun' && wd.cal !== '9x18' && wd.cal !== '762r';
      const box = h('div', 'modslot' + (ok ? '' : ' na')); box.dataset.mod = s; box._w = w; box.appendChild(h('div', 'slab', s === 'sight' ? 'SIGHT' : 'MUZZLE'));
      if (w.mods[s]) { const ie = itemEl(w.mods[s], { k: 'mod', w, slot: s, it: w.mods[s] }); ie.classList.add('inslot'); box.appendChild(ie); }
      if (!ok) box.appendChild(h('div', 'na-t', 'Not available'));
      row.appendChild(box);
    });
    body.appendChild(row);
    const cands = allVisible().filter(x => I[x.id].type === 'mod' && G.modFits(w, x));
    const lst = h('div', 'mw-list'); lst.appendChild(h('div', 'gtitle', 'COMPATIBLE MODS IN YOUR STASH/GEAR — click to attach'));
    cands.forEach(m => { const b = h('button', 'btn sm', esc(I[m.id].name)); b.onclick = () => { const s = I[m.id].slot; if (w.mods[s]) { const old = w.mods[s]; w.mods[s] = null; if (!placeAnywhere(old)) { w.mods[s] = old; return G.toast('No space', 'bad'); } } removeStack(m); w.mods[s] = m; refresh(); render(); }; lst.appendChild(b); });
    if (!cands.length) lst.appendChild(h('div', 'dim', 'None. Buy sights from Birchkeeper or Gearwood.'));
    ['sight', 'muzzle'].forEach(s => { if (w.mods[s]) { const b = h('button', 'btn sm', 'Detach ' + esc(I[w.mods[s].id].short)); b.onclick = () => { const old = w.mods[s]; w.mods[s] = null; if (!placeAnywhere(old)) { w.mods[s] = old; G.toast('No space', 'bad'); } refresh(); render(); }; lst.appendChild(b); } });
    body.appendChild(lst);
  };
  render(); G.modal('Weapon modding', body, [{ t: 'Done' }]);
}
function inspect(it) {
  const d = I[it.id]; const rows = [];
  const r = (k, v) => rows.push(`<tr><td>${k}</td><td>${v}</td></tr>`);
  r('Type', d.type); r('Size', d.w + 'x' + d.h); r('Weight', G.weight(it).toFixed(2) + ' kg'); r('Value', G.rub(G.value(it)));
  if (d.type === 'weapon') { r('Caliber', d.cal); r('Fire rate', d.rpm + ' rpm'); r('Modes', d.modes.join(', ')); r('Recoil', Math.round(d.rv * 60)); r('Ergonomics', d.ergo); r('Feeds', d.internal ? 'internal ' + d.internal + ' rounds' : 'magazine'); if (it.mag) r('Magazine', I[it.mag.id].short + ' (' + it.mag.rounds.length + ')'); }
  if (d.type === 'ammo') { const a = G.AMMO[it.id]; r('Damage', a.dmg + (a.pellets ? ' x' + a.pellets : '')); r('Penetration', a.pen); r('Armor damage', a.ad + '%'); r('Velocity', a.spd + ' m/s'); }
  if (d.cls) { r('Armor class', d.cls); r('Durability', Math.round(it.dur) + '/' + d.dur); if (d.zones) r('Protects', d.zones.join(', ')); if (d.face) r('Face', 'protected'); }
  if (d.grid) r('Capacity', d.grid[0] + 'x' + d.grid[1]);
  if (d.type === 'mag') { r('Capacity', d.cap); r('Caliber', d.cal); }
  if (d.type === 'med') { if (d.heal) r('Heals', 'up to ' + Math.round(it.res) + ' HP'); if (d.stops) r('Stops', d.stops.join(' & ') + ' bleeding'); if (d.fixes) r('Fixes', 'fractures'); if (d.surgery) r('Restores', 'a destroyed limb (uses ' + it.res + ')'); if (d.pain) r('Painkiller', d.pain + ' s'); if (d.stim) r('Effect', '+stamina, regeneration'); }
  if (d.type === 'food') { r('Hydration', d.hyd); r('Energy', d.en); }
  if (it.fir) r('Status', '✔ Found in raid');
  G.modal(d.name, `<div class="insp"><img src="${G.icon(it.id)}"><table>${rows.join('')}</table></div>`);
}
G.inspect = inspect;

/* ---------- the inventory screen renderer ---------- */
// ctx: { root, build(root) } — G.renderInv rebuilds using the active ctx
G.setInv = ctx => { invCtx = ctx; wins.length = 0; };
G.renderInv = () => { if (!invCtx || !invCtx.root) return; const sx = [...invCtx.root.querySelectorAll('.scroll')].map(e => e.scrollTop); invCtx.root.innerHTML = ''; invCtx.build(invCtx.root); renderWins(invCtx.root); [...invCtx.root.querySelectorAll('.scroll')].forEach((e, i) => { if (sx[i] != null) e.scrollTop = sx[i]; }); };

/* ================= MENU SCREENS ================= */
const M = G.MENU = { tab: 'main' };
G.show = id => { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id)); };
G.menu = (tab) => {
  if (tab) M.tab = tab; G.show('menu'); G.hideoutTick(); G.save();
  const S = G.S; const top = $('#topbar');
  const lvl = G.level(); const nx = G.xpFor(lvl + 1), cur = G.xpFor(lvl);
  top.innerHTML = `<div class="logo">ESCAPE FROM <b>BARKOV</b></div>
  <div class="tabs">${[['main', 'MAIN'], ['char', 'CHARACTER'], ['traders', 'TRADERS'], ['flea', 'ROOT MARKET'], ['tasks', 'TASKS'], ['hideout', 'HIDEOUT'], ['mail', 'MESSAGES' + (S.mail.length ? ' (' + S.mail.length + ')' : '')], ['squad', 'SQUAD' + (G.NET && G.NET.lobby ? ' ●' : '')], ['settings', 'SETTINGS']].map(([k, t]) => `<button class="tab ${M.tab === k ? 'on' : ''}" data-t="${k}">${t}</button>`).join('')}</div>
  <div class="who"><span class="lv">${lvl}</span><div><div>${esc(S.name)} <small>${S.faction}</small></div><div class="xpb"><i style="width:${Math.min(100, (S.xp - cur) / (nx - cur) * 100)}%"></i></div></div><div class="mny">${G.rub(G.money())}</div></div>`;
  top.querySelectorAll('.tab').forEach(b => b.onclick = () => G.menu(b.dataset.t));
  const body = $('#menubody'); body.innerHTML = ''; G.setInv(null);
  ({ main: mainTab, char: charTab, traders: tradersTab, flea: fleaTab, tasks: tasksTab, hideout: hideoutTab, mail: mailTab, squad: squadTab, settings: settingsTab }[M.tab] || mainTab)(body);
};

function mainTab(b) {
  const S = G.S; const scavCd = Math.max(0, (S.scavAt - Date.now()) / 1000);
  b.innerHTML = `<div class="main">
   <div class="hero"><h1>ESCAPE FROM <span>BARKOV</span></h1><p>The Barkov oblast has been cut off. Everyone who stayed has taken root. Get in, loot, get out — or become mulch.</p>
   <button class="btn big gold" id="go">ESCAPE FROM BARKOV</button>
   <div class="ver">${G.VERSION} · s0meTh1ng.MP4 / Henry &amp; Claude.AI</div></div>
   <div class="side">
     <div class="card"><h4>OPERATOR</h4><div class="stat"><span>Health</span><b class="${G.totalHP(S.health) < G.maxHP(S.health) ? 'warn' : ''}">${Math.round(G.totalHP(S.health))}/${G.maxHP(S.health)}</b></div>
     <div class="stat"><span>Energy / Water</span><b>${Math.round(S.health.en)} / ${Math.round(S.health.hyd)}</b></div>
     <div class="stat"><span>Raids / Survived</span><b>${S.stats.raids} / ${S.stats.survived}</b></div>
     <div class="stat"><span>Kills</span><b>${Object.values(S.stats.kills).reduce((a, b) => a + b, 0)}</b></div>
     <div class="stat"><span>Sapling (scav) run</span><b>${scavCd > 0 ? G.mmss(scavCd) : 'READY'}</b></div>
     ${G.totalHP(S.health) < G.maxHP(S.health) ? `<button class="btn sm" id="heal">Heal at Dr. Chlorophyll — ${G.rub(G.healCost())}</button>` : ''}</div>
     <div class="card tips"><h4>FIELD NOTES</h4><ul>
       <li>Die and you lose everything you brought — except your <b>Seed Pod</b> secure container.</li>
       <li>Ammo is not shown on screen. Press <b>L</b> to check your mag.</li>
       <li>Press <b>O</b> to see your extracts and raid time. Extracts are different every raid.</li>
       <li>Body armor only stops what it can. Penetration beats armor class.</li>
       <li>Bleeding kills. Bandage (light) / tourniquet (heavy). Splint fractures.</li>
       <li>Only <b>found in raid ✔</b> items can be sold on the Root Market or handed in for tasks.</li>
     </ul></div>
   </div></div>`;
  $('#go').onclick = () => G.raidPrep();
  const hb = $('#heal'); if (hb) hb.onclick = () => { const c = G.healCost(); if (!G.pay(c)) return G.toast('Not enough Rubarks', 'bad'); G.healFull(); G.toast('Patched up'); G.menu(); };
}

function stashCtx(root, extra = {}) {
  const S = G.S;
  return Object.assign({
    root, eq: S.eq, inRaid: false,
    grids: () => [S.stash, ...G.eqGrids(S.eq)].concat(wins.map(w => w.grid)),
    alive: it => { const all = []; S.stash.items.forEach(e => G.itemsDeep(e.it, all)); Object.values(S.eq).forEach(v => { if (v && v.u) G.itemsDeep(v, all); else if (v && v.items) v.items.forEach(e => G.itemsDeep(e.it, all)); }); return all.includes(it); },
    use: (it, src) => useOutOfRaid(it, src),
    onChange: () => { G.save(); const m = $('.who .mny'); if (m) m.textContent = G.rub(G.money()); },
  }, extra);
}
function useOutOfRaid(it, src) {
  const d = I[it.id]; const H = G.S.health;
  if (d.type === 'food') { H.hyd = G.clamp(H.hyd + d.hyd, 0, 100); H.en = G.clamp(H.en + d.en, 0, 100); G.removeFrom(src); }
  else if (d.heal) { let pool = Math.min(it.res, 1000); G.PARTS.forEach(k => { const p = H.p[k]; if (p.hp > 0 && p.hp < p.max) { const t = Math.min(pool, p.max - p.hp); p.hp += t; pool -= t; it.res -= t; } }); if (it.res <= 0) G.removeFrom(src); }
  else if (d.surgery) { const k = G.PARTS.find(k => H.p[k].hp <= 0); if (!k) return G.toast('Nothing to operate on'); H.p[k].hp = 1; H.p[k].max = Math.round(G.PART_MAX[k] * .8); it.res--; if (it.res <= 0) G.removeFrom(src); }
  else return G.toast('Use that in raid');
  G.toast('Used ' + d.short); G.save(); G.renderInv();
}

function charTab(b) {
  const S = G.S;
  const wrap = h('div', 'invscreen'); b.appendChild(wrap);
  G.setInv(stashCtx(wrap, {
    build: root => {
      const left = h('div', 'inv-left'); left.appendChild(healthPanel(S.health)); left.appendChild(G.eqPanel(S.eq));
      const st = h('div', 'statsmini'); let wt = 0; Object.entries(S.eq).forEach(([k, v]) => { if (v && v.u) wt += G.weight(v); else if (v && v.items) v.items.forEach(e => wt += G.weight(e.it)); });
      st.innerHTML = `Weight: <b>${wt.toFixed(1)} kg</b> · Gear value: <b>${G.rub(Object.values(S.eq).reduce((s, v) => s + (v && v.u ? G.value(v) : v && v.items ? v.items.reduce((a, e) => a + G.value(e.it), 0) : 0), 0))}</b>`;
      left.appendChild(st);
      const mid = h('div', 'inv-mid scroll'); mid.appendChild(G.contPanel(S.eq));
      const right = h('div', 'inv-right');
      const bar = h('div', 'stashbar'); bar.innerHTML = `<b>STASH</b> <span>${G.rub(G.money())}</span>`; const sb = h('button', 'btn sm', 'Sort'); sb.onclick = () => { const f = G.gridSort(S.stash); f.forEach(x => G.mailItem('Stash', x)); G.save(); G.renderInv(); }; bar.appendChild(sb);
      right.appendChild(bar); const sc = h('div', 'scroll stashscroll'); sc.appendChild(G.gridEl(S.stash)); right.appendChild(sc);
      root.appendChild(left); root.appendChild(mid); root.appendChild(right);
    }
  }));
  G.renderInv();
}

function healthPanel(H, opts = {}) {
  const p = h('div', 'health');
  const part = k => { const q = H.p[k]; const f = q.hp / q.max; const c = q.hp <= 0 ? 'dead' : f < .35 ? 'low' : f < .7 ? 'mid' : 'ok'; return `<div class="hp ${c} hp-${k}" data-part="${k}"><span>${G.PART_NAMES[k].toUpperCase()}</span><b>${Math.ceil(q.hp)}/${q.max}</b>${q.bl ? '<i class="ef bl">LB</i>' : ''}${q.hb ? '<i class="ef hb">HB</i>' : ''}${q.fr ? '<i class="ef fr">FR</i>' : ''}</div>`; };
  p.innerHTML = `<div class="body">${G.PARTS.map(part).join('')}</div><div class="hp-tot">HP ${Math.ceil(G.totalHP(H))}/${G.maxHP(H)} · ⚡${Math.round(H.en)} · 💧${Math.round(H.hyd)}${opts.extra || ''}</div>`;
  return p;
}
G.healthPanel = healthPanel;

/* ----- traders ----- */
function tradersTab(b) {
  const S = G.S; M.trader = M.trader || 'pinecone'; M.tmode = M.tmode || 'buy';
  const wrap = h('div', 'traders'); b.appendChild(wrap);
  const list = h('div', 'tlist');
  Object.entries(G.TRADERS).forEach(([k, T]) => { const c = h('div', 'tcard' + (M.trader === k ? ' on' : '')); c.innerHTML = `<div class="tport" style="background:${T.col}">${T.glyph}</div><div><b>${T.name}</b><small>${T.role}</small><small>LL${G.ll(k)}</small></div>`; c.onclick = () => { M.trader = k; G.menu(); }; list.appendChild(c); });
  wrap.appendChild(list);
  const T = G.TRADERS[M.trader]; const ll = G.ll(M.trader); const tr = S.traders[M.trader];
  const main = h('div', 'tmain');
  const nx = G.LL_REQ[ll + 1];
  main.innerHTML = `<div class="thead"><div class="tport big" style="background:${T.col}">${T.glyph}</div><div><h2>${T.name}</h2><p>${T.blurb}</p>
   <div class="llrow">Loyalty <b>LL${ll}</b> · Rep ${tr.rep.toFixed(2)} · Spent ${G.rub(tr.spent)}${nx ? ` · <span class="dim">Next: lvl ${nx.lvl}, rep ${nx.rep}, spent ${G.rub(nx.spent)}</span>` : ''}</div></div></div>`;
  const modes = h('div', 'subtabs'); [['buy', 'BUY'], ['sell', 'SELL']].concat(M.trader === 'pinecone' ? [['ins', 'INSURE']] : []).concat(M.trader === 'chloro' ? [['heal', 'HEAL']] : []).forEach(([k, t]) => { if (k === 'buy' && !T.offers.length) return; const x = h('button', 'tab' + (M.tmode === k ? ' on' : ''), t); x.onclick = () => { M.tmode = k; G.menu(); }; modes.appendChild(x); });
  if (!T.offers.length && M.tmode === 'buy') M.tmode = 'sell';
  main.appendChild(modes);
  const area = h('div', 'tarea'); main.appendChild(area); wrap.appendChild(main);
  if (M.tmode === 'buy') {
    const grid = h('div', 'offers scroll');
    T.offers.forEach(([id, mult, need]) => {
      const d = I[id]; const price = G.buyPrice(M.trader, id, mult); const locked = need > ll;
      const o = h('div', 'offer' + (locked ? ' locked' : ''));
      const qty = d.stack ? (d.type === 'ammo' ? 60 : 1) : 1;
      o.innerHTML = `<div class="oimg" style="aspect-ratio:${d.w}/${d.h}"><img src="${G.icon(id)}"></div><div class="oname">${esc(d.name)}</div><div class="oprice">${G.rub(price * qty)}${d.stack && d.type === 'ammo' ? ' <small>/60</small>' : ''}</div>${locked ? `<div class="olock">LL${need}</div>` : ''}`;
      if (!locked) o.onclick = async () => {
        let n = 1;
        if (d.type === 'ammo') { const v = await G.modal('Buy ' + d.name, `<label>Rounds: <input id="qty" type="number" min="1" max="600" value="60" class="inp"></label><p class="dim">${G.rub(price)} per round</p>`, [{ t: 'Cancel', v: 0 }, { t: 'Buy', v: 1, c: 'gold' }]); if (!v) return; n = G.clamp(parseInt(lastQty) || 60, 1, 600); }
        const cost = price * (d.type === 'ammo' ? n : 1);
        if (!G.pay(cost)) return G.toast('Not enough Rubarks', 'bad');
        tr.spent += cost;
        if (d.type === 'ammo') G.give(G.mk(id, { n })); else { const it = G.mk(id); if (d.type === 'weapon' && d.mt) { const mgId = Object.keys(I).find(k => I[k].type === 'mag' && I[k].mt === d.mt); it.mag = G.mk(mgId); } G.give(it); }
        G.toast('Bought ' + d.short); G.menu();
      };
      grid.appendChild(o);
    });
    area.appendChild(grid);
  } else if (M.tmode === 'sell') {
    const inv = h('div', 'invscreen sell'); area.appendChild(inv);
    G.setInv(stashCtx(inv, {
      sellHere: { name: T.name, sell: (it, src) => sellIt(it, src) },
      build: root => {
        const r = h('div', 'inv-right wide'); const bar = h('div', 'stashbar'); bar.innerHTML = `<b>STASH</b> — right-click → Sell, or drag onto the sell box`; r.appendChild(bar);
        const sc = h('div', 'scroll stashscroll'); sc.appendChild(G.gridEl(S.stash)); r.appendChild(sc);
        const box = h('div', 'sellbox'); box.innerHTML = `<b>SELL TO ${T.name.toUpperCase()}</b><p class="dim">${T.buys === 'all' ? 'Buys anything' : 'Buys: ' + (T.buys || ['weapon', 'mag', 'ammo', 'grenade']).join(', ')}</p><div class="grid sellgrid ground-drop">DROP HERE</div>`;
        root.appendChild(r); root.appendChild(box);
      },
      dropGround: it => { /* dropped onto sell box */ sellPending(it); },
    }));
    const sellPending = it => { const p = G.sellPrice(M.trader, it); if (!p) { G.toast(T.name + ' won\'t buy that', 'bad'); G.give(it); return; } G.giveRub(p); G.toast('Sold for ' + G.rub(p)); G.S.stats.earned += p; G.save(); };
    const sellIt = (it, src) => { const p = G.sellPrice(M.trader, it); if (!p) return G.toast(T.name + ' won\'t buy that', 'bad'); G.removeFrom(src); G.giveRub(p); G.toast('Sold for ' + G.rub(p)); G.save(); G.renderInv(); };
    G.renderInv();
  } else if (M.tmode === 'ins') {
    area.innerHTML = `<p>Insure gear before a raid from the raid preparation screen. Insured items that aren't picked up by someone else come back to you by message about <b>15 minutes</b> after you die (65% chance each). Cost: 14% of the item's value.</p>`;
  } else if (M.tmode === 'heal') {
    const c = G.healCost(); area.appendChild(healthPanel(S.health));
    const bt = h('button', 'btn gold', c ? 'Full treatment — ' + G.rub(c) : 'You are healthy'); bt.disabled = !c; bt.onclick = () => { if (!G.pay(c)) return G.toast('Not enough Rubarks', 'bad'); G.healFull(); S.traders.chloro.spent += c; G.toast('Fully healed'); G.menu(); }; area.appendChild(bt);
  }
}
let lastQty = 60; document.addEventListener('input', e => { if (e.target.id === 'qty') lastQty = e.target.value; });

/* ----- flea market ----- */
function fleaTab(b) {
  const S = G.S; const lvl = G.level();
  if (lvl < G.FLEA_LVL) { b.innerHTML = `<div class="center-msg"><h2>ROOT MARKET</h2><p>The root network opens to operators level ${G.FLEA_LVL}+. You are level ${lvl}.</p></div>`; return; }
  M.fmode = M.fmode || 'buy'; M.fq = M.fq || '';
  const prices = G.fleaPrices();
  const wrap = h('div', 'flea'); b.appendChild(wrap);
  const head = h('div', 'subtabs'); [['buy', 'BROWSE'], ['sell', 'SELL (found in raid only)']].forEach(([k, t]) => { const x = h('button', 'tab' + (M.fmode === k ? ' on' : ''), t); x.onclick = () => { M.fmode = k; G.menu(); }; head.appendChild(x); });
  wrap.appendChild(head);
  if (M.fmode === 'buy') {
    const s = h('input', 'inp'); s.placeholder = 'Search items…'; s.value = M.fq; wrap.appendChild(s);
    const list = h('div', 'flist scroll'); wrap.appendChild(list);
    const draw = () => {
      list.innerHTML = ''; const q = M.fq.toLowerCase();
      Object.keys(prices).filter(id => !q || I[id].name.toLowerCase().includes(q)).sort((a, b) => I[a].type < I[b].type ? -1 : 1).slice(0, 120).forEach(id => {
        const d = I[id]; const p = prices[id]; const r = h('div', 'frow');
        r.innerHTML = `<img src="${G.icon(id)}"><span class="fn">${esc(d.name)}</span><span class="ft">${d.type}</span><span class="fp">${G.rub(p)}${d.type === 'ammo' ? ' /rd' : ''}</span>`;
        const bt = h('button', 'btn sm', 'Buy'); bt.onclick = () => { const n = d.type === 'ammo' ? 60 : 1; const cost = p * n; if (!G.pay(cost)) return G.toast('Not enough Rubarks', 'bad'); G.give(d.stack ? G.mk(id, { n }) : G.mk(id)); G.toast('Bought ' + d.short); G.save(); G.menu(); };
        r.appendChild(bt); list.appendChild(r);
      });
    };
    s.oninput = () => { M.fq = s.value; draw(); }; draw();
  } else {
    const inv = h('div', 'invscreen sell'); wrap.appendChild(inv);
    const sell = (it, src) => { if (!G.itemsDeep(it).every(x => x.fir) && !it.fir) return G.toast('Only found-in-raid items can be listed', 'bad'); if (it.grid && it.grid.items.length) return G.toast('Empty it first', 'bad'); const d = I[it.id]; const p = Math.round((prices[it.id] || d.price) * (d.stack ? it.n : 1) * (d.dur ? .3 + .7 * it.dur / d.dur : 1) * .93); const fee = Math.round(p * .05); G.removeFrom(src); G.giveRub(p - fee); G.toast('Sold for ' + G.rub(p - fee) + ' (fee ' + G.rub(fee) + ')'); G.save(); G.renderInv(); };
    G.setInv(stashCtx(inv, { sellHere: { name: 'Root Market', sell }, build: root => { const r = h('div', 'inv-right wide'); r.appendChild(h('div', 'stashbar', '<b>STASH</b> — right-click a ✔ item → Sell to Root Market (93% of market price, 5% fee)')); const sc = h('div', 'scroll stashscroll'); sc.appendChild(G.gridEl(S.stash)); r.appendChild(sc); root.appendChild(r); } }));
    G.renderInv();
  }
}

/* ----- tasks ----- */
function tasksTab(b) {
  const S = G.S; const wrap = h('div', 'tasks scroll'); b.appendChild(wrap);
  const groups = { active: [], avail: [], locked: [], done: [] };
  G.TASKS.forEach(t => { const st = S.tasks[t.id].st; if (st === 'done') groups.done.push(t); else if (st === 'active') groups.active.push(t); else if (G.taskAvail(t)) groups.avail.push(t); else groups.locked.push(t); });
  const objTxt = t => { const o = t.obj; const p = S.tasks[t.id].prog;
    if (o.type === 'kill') return `Kill ${({ sapling: 'Saplings (scavs)', pmc: 'PMCs', raider: 'Rotwood raiders', gnarl: 'Old Gnarl', chipper: 'The Woodchipper' })[o.who]}${o.night ? ' at night' : ''}: ${p}/${o.n}`;
    if (o.type === 'extract') return `Survive and extract from ${G.MAPS_META[o.map].name}: ${p}/${o.n}`;
    if (o.type === 'survive') return `Survive raids: ${p}/${o.n}`;
    if (o.type === 'visit') return `Locate the spot on ${G.MAPS_META[o.map].name}: ${p ? 'done' : 'not yet'}`;
    if (o.type === 'fetch') return `Hand over ${o.n}× ${I[o.item].name}${o.fir ? ' (found in raid)' : ''}: have ${G.countStash(o.item, o.fir)}`;
    if (o.type === 'multi') return o.items.map(([id, n]) => `${n}× ${I[id].name} (have ${G.countStash(id, o.fir)})`).join(', ') + (o.fir ? ' — found in raid' : '');
    if (o.type === 'alltasks') return 'Complete every other task';
  };
  const rew = r => [r.rub ? G.rub(r.rub) : '', r.xp ? r.xp + ' XP' : '', r.rep ? '+' + r.rep + ' rep' : '', ...(r.items || []).map(([id, n]) => (n > 1 ? n + '× ' : '') + I[id].short), r.unlockPod ? I[r.unlockPod].name : ''].filter(Boolean).join(' · ');
  const card = (t, kind) => {
    const c = h('div', 'task ' + kind); const T = G.TRADERS[t.trader];
    c.innerHTML = `<div class="tk-h"><span class="tport sm" style="background:${T.col}">${T.glyph}</span><b>${esc(t.name)}</b><small>${T.name}${t.lvl ? ' · lvl ' + t.lvl : ''}</small></div><p>${esc(t.desc)}</p><div class="tk-o">▸ ${objTxt(t)}</div><div class="tk-r">Reward: ${rew(t.reward)}</div>`;
    if (kind === 'avail') { const x = h('button', 'btn sm gold', 'Accept'); x.onclick = () => { S.tasks[t.id].st = 'active'; G.save(); G.menu(); }; c.appendChild(x); }
    if (kind === 'active') { const ready = G.taskReady(t); const x = h('button', 'btn sm ' + (ready ? 'gold' : ''), t.obj.type === 'fetch' || t.obj.type === 'multi' ? 'Hand over & complete' : 'Complete'); x.disabled = !ready; x.onclick = () => { G.completeTask(t); G.toast('Task complete: ' + t.name); G.save(); G.menu(); }; c.appendChild(x); }
    return c;
  };
  [['active', 'ACTIVE'], ['avail', 'AVAILABLE'], ['locked', 'LOCKED'], ['done', 'COMPLETED']].forEach(([k, t]) => { if (!groups[k].length) return; wrap.appendChild(h('h3', 'sec', t)); groups[k].forEach(x => wrap.appendChild(card(x, k))); });
}

/* ----- hideout ----- */
function hideoutTab(b) {
  const S = G.S; G.hideoutTick(); const wrap = h('div', 'hideout scroll'); b.appendChild(wrap);
  wrap.appendChild(h('p', 'dim', 'Your hideout is a hollowed-out stump under the old sawmill. Build modules with Rubarks and items from your stash.'));
  const mods = h('div', 'hmods'); wrap.appendChild(mods);
  Object.entries(G.HIDEOUT).forEach(([k, m]) => {
    const lvl = G.modLvl(k); const next = m.levels[lvl]; const b2 = S.builds[k];
    const c = h('div', 'hmod'); c.innerHTML = `<div class="hm-h"><b>${m.name}</b><span>LEVEL ${lvl}</span></div><p class="dim">${m.desc}</p>${lvl ? `<p>✔ ${m.levels[lvl - 1].txt}</p>` : ''}`;
    if (b2) c.appendChild(h('div', 'hm-b', `Building level ${b2.lvl}… ${G.mmss((b2.doneAt - Date.now()) / 1000)}`));
    else if (next) {
      const req = next.req; const lines = []; let ok = true;
      if (req.rub) { const y = G.money() >= req.rub; ok = ok && y; lines.push(`<li class="${y ? 'y' : 'n'}">${G.rub(req.rub)}</li>`); }
      (req.items || []).forEach(([id, n]) => { const have = G.countStash(id); const y = have >= n; ok = ok && y; lines.push(`<li class="${y ? 'y' : 'n'}">${n}× ${I[id].name} (${have})</li>`); });
      if (req.lvl) { const y = G.level() >= req.lvl; ok = ok && y; lines.push(`<li class="${y ? 'y' : 'n'}">Operator level ${req.lvl}</li>`); }
      Object.entries(req.mods || {}).forEach(([mm, l]) => { const y = G.modLvl(mm) >= l; ok = ok && y; lines.push(`<li class="${y ? 'y' : 'n'}">${G.HIDEOUT[mm].name} level ${l}</li>`); });
      if (k !== 'generator' && k !== 'stash' && lvl > 0 && !G.modLvl('generator')) { ok = false; lines.push('<li class="n">Generator</li>'); }
      c.innerHTML += `<div class="hm-n">Level ${lvl + 1}: ${next.txt}</div><ul class="req">${lines.join('')}</ul>`;
      const bt = h('button', 'btn sm ' + (ok ? 'gold' : ''), 'Build (' + G.mmss(next.time) + ')'); bt.disabled = !ok;
      bt.onclick = () => { if (req.rub && !G.pay(req.rub)) return; (req.items || []).forEach(([id, n]) => G.takeStash(id, n)); S.builds[k] = { lvl: lvl + 1, doneAt: Date.now() + next.time * 1000 * (G.modLvl('generator') >= 2 ? .85 : 1) }; G.save(); G.menu(); };
      c.appendChild(bt);
    } else c.appendChild(h('div', 'hm-n', 'Max level'));
    if (k === 'farm' && lvl > 0) { const fb = h('button', 'btn sm gold', `Collect Golden Acorns (${S.farm.stored})`); fb.disabled = !S.farm.stored; fb.onclick = () => { for (let i = 0; i < S.farm.stored; i++) G.give(G.mk('acorn_gold', { fir: true })); S.farm.stored = 0; G.save(); G.menu(); }; c.appendChild(fb); }
    // crafts
    const crafts = G.CRAFTS.map((cr, i) => [cr, i]).filter(([cr]) => cr.mod === k);
    if (crafts.length && lvl > 0) {
      const cl = h('div', 'crafts'); cl.appendChild(h('div', 'gtitle', 'CRAFTING'));
      crafts.forEach(([cr, i]) => {
        const run = S.crafts.find(x => x.i === i); const can = cr.lvl <= lvl && cr.in.every(([id, n]) => G.countStash(id) >= n);
        const row = h('div', 'craft'); row.innerHTML = `<span>${cr.in.map(([id, n]) => n + '× ' + I[id].short).join(' + ')} → <b>${cr.out[1]}× ${I[cr.out[0]].short}</b> <small>${G.mmss(cr.time)}${cr.lvl > lvl ? ' · needs L' + cr.lvl : ''}</small></span>`;
        if (run) { if (Date.now() >= run.doneAt) { const x = h('button', 'btn sm gold', 'Collect'); x.onclick = () => { const d = I[cr.out[0]]; if (d.stack) G.give(G.mk(cr.out[0], { n: cr.out[1], fir: true })); else for (let j = 0; j < cr.out[1]; j++) G.give(G.mk(cr.out[0], { fir: true })); S.crafts.splice(S.crafts.indexOf(run), 1); G.save(); G.menu(); }; row.appendChild(x); } else row.appendChild(h('span', 'dim', G.mmss((run.doneAt - Date.now()) / 1000))); }
        else { const x = h('button', 'btn sm', 'Craft'); x.disabled = !can; x.onclick = () => { cr.in.forEach(([id, n]) => G.takeStash(id, n)); S.crafts.push({ i, doneAt: Date.now() + cr.time * 1000 }); G.save(); G.menu(); }; row.appendChild(x); }
        cl.appendChild(row);
      });
      c.appendChild(cl);
    }
    mods.appendChild(c);
  });
  clearTimeout(M.ht); M.ht = setTimeout(() => { if (M.tab === 'hideout' && $('#menu').classList.contains('on')) G.menu(); }, 5000);
}

/* ----- mail ----- */
function mailTab(b) {
  const S = G.S; const wrap = h('div', 'mail scroll'); b.appendChild(wrap);
  if (!S.mail.length) wrap.appendChild(h('p', 'dim', 'No messages.'));
  [...S.mail].reverse().forEach(m => {
    const ready = Date.now() >= m.at; const c = h('div', 'msg');
    c.innerHTML = `<b>${esc(m.from)}</b> <small>${new Date(m.at).toLocaleTimeString()}</small><p>${esc(ready ? m.text : 'Arriving in ' + G.mmss((m.at - Date.now()) / 1000))}</p><div class="mitems">${ready ? m.items.map(it => `<img title="${esc(I[it.id].name)}" src="${G.icon(it.id)}">`).join('') : ''}</div>`;
    if (ready) { const x = h('button', 'btn sm gold', m.items.length ? 'Receive all' : 'Dismiss'); x.onclick = () => { const left = []; m.items.forEach(it => { if (I[it.id].stack ? !G.gridAdd(S.stash, it) : !G.gridAdd(S.stash, it)) left.push(it); }); if (left.length) { m.items = left; G.toast('Stash full', 'bad'); } else S.mail.splice(S.mail.indexOf(m), 1); G.save(); G.menu(); }; c.appendChild(x); }
    wrap.appendChild(c);
  });
}

/* ----- settings ----- */
function settingsTab(b) {
  const S = G.S, st = S.settings;
  b.innerHTML = `<div class="settings scroll">
   <h3 class="sec">OPERATOR</h3><label>Name <input class="inp" id="s-name" maxlength="16" value="${esc(S.name)}"></label>
   <label>Faction <select class="inp" id="s-fac"><option ${S.faction === 'BARK' ? 'selected' : ''}>BARK</option><option ${S.faction === 'ROOT' ? 'selected' : ''}>ROOT</option></select></label>
   <h3 class="sec">CONTROLS</h3><label>Mouse sensitivity <input type="range" id="s-sens" min=".2" max="3" step=".05" value="${st.sens}"><b>${st.sens}</b></label>
   <label><input type="checkbox" id="s-inv" ${st.invertY ? 'checked' : ''}> Invert mouse Y</label>
   <h3 class="sec">VIDEO</h3><label>Field of view <input type="range" id="s-fov" min="50" max="90" step="1" value="${st.fov}"><b>${st.fov}</b></label>
   <label>Graphics <select class="inp" id="s-gfx">${['low', 'med', 'high'].map(g => `<option ${st.gfx === g ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
   <label><input type="checkbox" id="s-fps" ${st.showFps ? 'checked' : ''}> Show FPS</label>
   <h3 class="sec">AUDIO</h3><label>Volume <input type="range" id="s-vol" min="0" max="1" step=".05" value="${st.vol}"></label>
   <h3 class="sec">KEYS</h3><p class="dim keys">WASD move · Shift sprint · C crouch · Space jump · Q/E lean · Mouse1 fire · Mouse2 aim · R reload (double-tap: fast drop-mag reload) · B fire mode · L check mag · T flashlight · F interact/search · Tab inventory · O extracts &amp; time · 1/2/3 weapons · 4–7 quick slots · G grenade · V melee · Alt+T check chamber · K inspect weapon</p>
   <h3 class="sec">SAVE</h3><p class="dim">Progress saves automatically on this device. Use a save code to move it to another device.</p>
   <button class="btn sm" id="s-exp">Copy save code</button> <button class="btn sm" id="s-imp">Load save code</button> <button class="btn sm red" id="s-wipe">WIPE (restart from zero)</button>
  </div>`;
  const on = (id, f) => $(id).addEventListener('input', f);
  on('#s-name', e => { S.name = e.target.value.trim() || 'Sprout'; G.save(); });
  on('#s-fac', e => { S.faction = e.target.value; G.save(); });
  on('#s-sens', e => { st.sens = +e.target.value; e.target.nextElementSibling.textContent = st.sens; G.save(); });
  on('#s-fov', e => { st.fov = +e.target.value; e.target.nextElementSibling.textContent = st.fov; G.save(); });
  on('#s-gfx', e => { st.gfx = e.target.value; G.save(); });
  on('#s-vol', e => { st.vol = +e.target.value; G.AU && G.AU.setVol(st.vol); G.save(); });
  on('#s-inv', e => { st.invertY = e.target.checked; G.save(); });
  on('#s-fps', e => { st.showFps = e.target.checked; G.save(); });
  $('#s-exp').onclick = async () => { const c = G.exportSave(); try { await navigator.clipboard.writeText(c); G.toast('Save code copied'); } catch (e) { G.modal('Save code', `<textarea class="inp" style="width:100%;height:160px">${c}</textarea>`); } };
  $('#s-imp').onclick = async () => { const ta = h('textarea', 'inp'); ta.style.cssText = 'width:100%;height:160px'; ta.placeholder = 'Paste save code'; const v = await G.modal('Load save code', ta, [{ t: 'Cancel', v: 0 }, { t: 'Load', v: 1, c: 'gold' }]); if (!v) return; try { G.importSave(ta.value); G.toast('Save loaded'); G.menu('main'); } catch (er) { G.toast('That code didn\'t work', 'bad'); } };
  $('#s-wipe').onclick = async () => { if (await G.confirm('WIPE', 'Delete all progress and start a fresh character? Tarkov veterans call this "the wipe".')) { G.wipe(); G.menu('main'); } };
}

/* ----- squad (multiplayer) ----- */
function squadTab(b) { G.squadUI ? G.squadUI(b) : b.appendChild(h('p', '', 'Multiplayer not loaded.')); }
})();
