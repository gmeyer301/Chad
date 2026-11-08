/* Escape from Barkov — core: utilities, items, grids, save, economy, health */
'use strict';
(() => {
const I = G.ITEMS;
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
G.lerp = (a, b, t) => a + (b - a) * t;
G.rand = (a, b) => a + Math.random() * (b - a);
G.ri = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
G.pick = arr => arr[Math.floor(Math.random() * arr.length)];
G.now = () => Date.now();
G.fmt = n => Math.round(n).toLocaleString('en-US');
G.rub = n => G.fmt(n) + ' ₽';
G.mmss = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
// seeded RNG
G.rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
G.wpick = (r, list) => { let t = 0; list.forEach(e => t += e[1]); let x = r() * t; for (const e of list) { x -= e[1]; if (x <= 0) return e[0]; } return list[list.length - 1][0]; };

let uidc = 0;
G.uid = () => (Date.now() % 1e8).toString(36) + (uidc++).toString(36) + Math.floor(Math.random() * 1296).toString(36);

/* ---------- item instances ---------- */
G.mk = (id, o = {}) => {
  const d = I[id]; if (!d) { console.warn('no item', id); return null; }
  const it = { u: G.uid(), id };
  if (d.stack) it.n = o.n != null ? o.n : (d.type === 'money' ? 1000 : d.stack);
  if (d.type === 'mag') it.rounds = [];
  if (d.type === 'weapon') { it.mode = d.modes[0]; it.mods = {}; it.ch = null; if (d.internal) it.rounds = []; else it.mag = null; }
  if (d.dur) it.dur = d.dur;
  if (d.grid) it.grid = G.grid(d.grid[0], d.grid[1], { ot: d.type, secure: d.type === 'secure' });
  if (d.res) it.res = d.res;
  if (d.uses) it.uses = d.uses;
  Object.assign(it, o);
  return it;
};
G.def = it => I[it.id];
G.clone = o => JSON.parse(JSON.stringify(o));
G.reuid = it => { it.u = G.uid(); if (it.mag) G.reuid(it.mag); if (it.mods) Object.values(it.mods).forEach(m => m && G.reuid(m)); if (it.grid) it.grid.items.forEach(e => G.reuid(e.it)); return it; };
G.size = (it, r) => { const d = I[it.id]; return r ? [d.h, d.w] : [d.w, d.h]; };
G.label = it => { const d = I[it.id]; if (d.stack) return d.short; return d.short; };
G.weight = it => {
  const d = I[it.id]; let w = d.wt * (d.stack ? (d.type === 'money' ? 0 : it.n) : 1);
  if (it.rounds) w += it.rounds.length * .012;
  if (it.mag) w += G.weight(it.mag);
  if (it.mods) Object.values(it.mods).forEach(m => { if (m) w += G.weight(m); });
  if (it.grid) it.grid.items.forEach(e => w += G.weight(e.it));
  return w;
};
G.value = it => {
  const d = I[it.id]; let v = d.price * (d.stack ? it.n : 1);
  if (d.dur && it.dur != null) v *= .3 + .7 * it.dur / d.dur;
  if (d.res && d.res > 1 && it.res != null) v *= .2 + .8 * it.res / d.res;
  if (it.rounds) it.rounds.forEach(a => v += G.AMMO[a].price);
  if (it.mag) v += G.value(it.mag);
  if (it.mods) Object.values(it.mods).forEach(m => { if (m) v += G.value(m); });
  if (it.grid) it.grid.items.forEach(e => v += G.value(e.it));
  return v;
};
G.itemsDeep = (it, out = []) => { out.push(it); if (it.mag) G.itemsDeep(it.mag, out); if (it.mods) Object.values(it.mods).forEach(m => m && G.itemsDeep(m, out)); if (it.grid) it.grid.items.forEach(e => G.itemsDeep(e.it, out)); return out; };
G.setFir = (it, v) => G.itemsDeep(it).forEach(x => x.fir = v);

/* ---------- grids ---------- */
G.grid = (w, h, o = {}) => Object.assign({ w, h, items: [] }, o);
G.gridFits = (g, x, y, w, h, ignore) => {
  if (x < 0 || y < 0 || x + w > g.w || y + h > g.h) return false;
  if (g.cell1 && (w > 1 || h > 1)) return false;
  for (const e of g.items) { if (e === ignore || e.it === ignore) continue; const [ew, eh] = G.size(e.it, e.r); if (x < e.x + ew && x + w > e.x && y < e.y + eh && y + h > e.y) return false; }
  return true;
};
G.gridAt = (g, x, y) => g.items.find(e => { const [w, h] = G.size(e.it, e.r); return x >= e.x && x < e.x + w && y >= e.y && y < e.y + h; });
G.gridFind = (g, it) => {
  for (const r of [false, true]) { const [w, h] = G.size(it, r); if (r && w === h) continue;
    for (let y = 0; y <= g.h - h; y++) for (let x = 0; x <= g.w - w; x++) if (G.gridFits(g, x, y, w, h)) return { x, y, r }; }
  return null;
};
G.gridPut = (g, it, x, y, r) => { const e = { it, x, y, r: !!r }; g.items.push(e); return e; };
G.gridRemove = (g, it) => { const i = g.items.findIndex(e => e.it === it || e.it.u === it.u); if (i >= 0) return g.items.splice(i, 1)[0]; return null; };
// try to merge a stack into existing stacks then place leftovers
G.gridAdd = (g, it, mergeOnly) => {
  const d = I[it.id];
  if (d.stack) for (const e of g.items) { if (e.it.id === it.id && e.it.n < d.stack && !!e.it.fir === !!it.fir) { const t = Math.min(d.stack - e.it.n, it.n); e.it.n += t; it.n -= t; if (it.n <= 0) return true; } }
  if (mergeOnly) return false;
  const s = G.gridFind(g, it); if (!s) return false; G.gridPut(g, it, s.x, s.y, s.r); return true;
};
G.gridSort = g => {
  const its = g.items.map(e => e.it); g.items = [];
  its.sort((a, b) => { const [aw, ah] = G.size(a), [bw, bh] = G.size(b); return (bw * bh - aw * ah) || (I[a.id].type < I[b.id].type ? -1 : 1) || (a.id < b.id ? -1 : 1); });
  const fail = []; its.forEach(it => { const s = G.gridFind(g, it); if (s) G.gridPut(g, it, s.x, s.y, s.r); else fail.push(it); });
  return fail;
};
// is `inner` an ancestor container of `target`? (prevents putting a backpack inside itself)
G.contains = (outer, inner) => G.itemsDeep(outer).some(x => x !== outer && x.u === inner.u);
G.canHold = (g, it) => {
  const d = I[it.id];
  if (g.secure && ['backpack', 'rig', 'secure', 'weapon', 'armor', 'helmet'].includes(d.type)) return false;
  if (g.ot && ['backpack', 'secure'].includes(d.type)) return false;
  if (g.ot === 'rig' && d.type === 'rig') return false;
  return true;
};

/* ---------- health ---------- */
G.PARTS = ['head', 'thorax', 'stomach', 'larm', 'rarm', 'lleg', 'rleg'];
G.PART_NAMES = { head: 'Head', thorax: 'Thorax', stomach: 'Stomach', larm: 'Left arm', rarm: 'Right arm', lleg: 'Left leg', rleg: 'Right leg' };
G.PART_MAX = { head: 35, thorax: 85, stomach: 70, larm: 60, rarm: 60, lleg: 65, rleg: 65 };
G.newHealth = () => { const h = { p: {}, hyd: 100, en: 100 }; G.PARTS.forEach(k => h.p[k] = { hp: G.PART_MAX[k], max: G.PART_MAX[k], bl: 0, hb: 0, fr: 0 }); return h; };
G.totalHP = h => G.PARTS.reduce((s, k) => s + h.p[k].hp, 0);
G.maxHP = h => G.PARTS.reduce((s, k) => s + h.p[k].max, 0);

/* ---------- save ---------- */
const KEY = 'barkov-save-v1';
G.newSave = () => {
  const S = {
    v: 1, name: 'Sprout' + G.ri(100, 999), faction: 'BARK', xp: 0, created: Date.now(),
    stash: G.grid(10, G.STASH_ROWS[1]), eq: G.newEq(), health: G.newHealth(),
    skills: {}, stats: { raids: 0, survived: 0, kia: 0, mia: 0, runs: 0, kills: { sapling: 0, pmc: 0, raider: 0, boss: 0, player: 0 }, deaths: 0, earned: 0, streak: 0 },
    traders: {}, tasks: {}, hideout: { stash: 1 }, builds: {}, crafts: [], farm: { at: 0, stored: 0 }, mail: [], scavAt: 0, inRaid: null,
    settings: { sens: 1, fov: 75, vol: .8, music: .4, gfx: 'med', invertY: false, showFps: false }, flea: null, lastTick: Date.now(), seenIntro: false,
  };
  Object.keys(G.SKILLS).forEach(k => S.skills[k] = 0);
  Object.keys(G.TRADERS).forEach(k => S.traders[k] = { rep: 0, spent: 0 });
  G.TASKS.forEach(t => S.tasks[t.id] = { st: 'avail', prog: 0, aux: {} });
  // starter kit (like a standard edition stash)
  const add = (id, o) => G.gridAdd(S.stash, G.mk(id, o));
  const ak = G.mk('bark74u'); ak.mag = G.mk('ak545_30', { rounds: Array(30).fill('a545_ps') }); ak.ch = null;
  S.eq.primary = ak;
  const pm = G.mk('pm'); pm.mag = G.mk('pm_mag', { rounds: Array(8).fill('a918_p') }); S.eq.holster = pm;
  S.eq.armor = G.mk('pith_vest'); S.eq.rig = G.mk('rig_twine'); S.eq.backpack = G.mk('bag_sack'); S.eq.helmet = null;
  G.gridAdd(S.eq.rig.grid, G.mk('ak545_30', { rounds: Array(30).fill('a545_ps') }));
  G.gridAdd(S.eq.rig.grid, G.mk('ak545_30', { rounds: Array(30).fill('a545_ps') }));
  G.gridAdd(S.eq.rig.grid, G.mk('pm_mag', { rounds: Array(8).fill('a918_p') }));
  G.gridAdd(S.eq.pockets, G.mk('bandage')); G.gridAdd(S.eq.pockets, G.mk('aisap')); G.gridAdd(S.eq.pockets, G.mk('tourniquet'));
  G.gridAdd(S.eq.secure.grid, G.mk('painkill'));
  add('rub', { n: 500000 }); add('rub', { n: 150000 });
  add('twig133'); add('a12_buck', { n: 60 }); add('a12_buck', { n: 60 });
  add('pm'); add('pm_mag'); add('pm_mag'); add('a918_p', { n: 60 }); add('a918_p', { n: 60 });
  add('sticks'); add('a762_ps', { n: 60 }); add('a762_ps', { n: 60 });
  add('ak545_30'); add('a545_ps', { n: 60 }); add('a545_ps', { n: 60 }); add('a545_ps', { n: 60 });
  add('moss3m'); add('acorn_cap'); add('rig_twine'); add('bag_day');
  ['bandage', 'bandage', 'aisap', 'aisap', 'splint', 'sapwa', 'painkill', 'sapwater', 'sapwater', 'chips', 'stew', 'pinenade'].forEach(id => add(id));
  return S;
};
G.newEq = () => ({ primary: null, secondary: null, holster: null, helmet: null, armor: null, rig: null, backpack: null, pockets: G.grid(4, 1, { cell1: true }), secure: G.mk('seed_pod') });
G.save = () => { try { G.S.lastTick = Date.now(); localStorage.setItem(KEY, JSON.stringify(G.S)); } catch (e) { console.warn(e); } };
G.load = () => {
  let S = null; try { const t = localStorage.getItem(KEY); if (t) S = JSON.parse(t); } catch (e) { }
  if (!S) { S = G.newSave(); G.S = S; G.save(); return S; }
  // migrations / defaults
  const def = G.newSave();
  for (const k in def) if (S[k] == null && k !== 'inRaid' && k !== 'flea') S[k] = def[k];
  for (const k in def.settings) if (S.settings[k] == null) S.settings[k] = def.settings[k];
  G.TASKS.forEach(t => { if (!S.tasks[t.id]) S.tasks[t.id] = { st: 'avail', prog: 0, aux: {} }; });
  Object.keys(G.TRADERS).forEach(k => { if (!S.traders[k]) S.traders[k] = { rep: 0, spent: 0 }; });
  G.S = S; return S;
};
G.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(G.S))));
G.importSave = txt => { const S = JSON.parse(decodeURIComponent(escape(atob(txt.trim())))); if (!S || !S.stash || !S.eq) throw new Error('Not a Barkov save'); localStorage.setItem(KEY, JSON.stringify(S)); G.load(); };
G.wipe = () => { localStorage.removeItem(KEY); G.load(); };

/* ---------- level, skills ---------- */
G.level = (xp = G.S.xp) => { let l = 1; while (l < 60 && xp >= G.xpFor(l + 1)) l++; return l; };
G.skillLvl = k => Math.min(51, Math.floor(Math.sqrt((G.S.skills[k] || 0) / 10)));
G.skillXP = (k, v) => { if (!G.S) return; G.S.skills[k] = (G.S.skills[k] || 0) + v; };

/* ---------- money ---------- */
G.allStashItems = () => { const out = []; G.S.stash.items.forEach(e => G.itemsDeep(e.it, out)); return out; };
G.money = () => G.S.stash.items.reduce((s, e) => s + (e.it.id === 'rub' ? e.it.n : 0), 0);
G.pay = amt => {
  if (G.money() < amt) return false;
  const stacks = G.S.stash.items.filter(e => e.it.id === 'rub').sort((a, b) => a.it.n - b.it.n);
  for (const e of stacks) { const t = Math.min(e.it.n, amt); e.it.n -= t; amt -= t; if (e.it.n <= 0) G.gridRemove(G.S.stash, e.it); if (amt <= 0) break; }
  return true;
};
// put an item into the stash, else into mail
G.give = (it, from = 'System') => {
  const d = I[it.id];
  if (d.stack) { let left = it.n; while (left > 0) { const n = Math.min(left, d.stack); const p = G.mk(it.id, { n, fir: it.fir }); left -= n; if (!G.gridAdd(G.S.stash, p)) G.mailItem(from, p); } return; }
  if (!G.gridAdd(G.S.stash, it)) G.mailItem(from, it);
};
G.giveRub = n => G.give(G.mk('rub', { n: Math.round(n) }));
G.mailItem = (from, it) => { G.S.mail.push({ id: G.uid(), from, text: 'Your stash is full. Collect this when you have space.', items: [it], at: Date.now() }); };
G.mailMsg = (from, text, items = [], at = Date.now()) => G.S.mail.push({ id: G.uid(), from, text, items, at });

/* ---------- traders ---------- */
G.ll = tid => {
  const t = G.S.traders[tid]; const lvl = G.level(); let ll = 1;
  for (let i = 2; i <= 4; i++) { const r = G.LL_REQ[i]; if (lvl >= r.lvl && t.spent >= r.spent && t.rep >= r.rep) ll = i; else break; }
  return ll;
};
G.buyPrice = (tid, id, mult) => { const d = I[id]; const disc = 1 - .04 * (G.ll(tid) - 1); return Math.max(1, Math.round(d.price * mult * disc * (tid === 'birch' ? 1.08 : 1))); };
G.sellPrice = (tid, it) => {
  const T = G.TRADERS[tid]; const d = I[it.id];
  if (d.noSell || d.type === 'money') return 0;
  if (T.buys && T.buys !== 'all') { const types = G.itemsDeep(it).map(x => I[x.id].type); if (!T.buys.includes(d.type)) return 0; }
  return Math.max(1, Math.round(G.value(it) * T.buyMult * (1 + .02 * (G.ll(tid) - 1))));
};

/* ---------- flea market ---------- */
G.fleaPrices = () => {
  const S = G.S; const slot = Math.floor(Date.now() / 600000);
  if (!S.flea || S.flea.slot !== slot) {
    const r = G.rng(slot * 7919 + 13); const p = {};
    for (const id in I) { const d = I[id]; if (d.type === 'money' || d.noSell) continue; p[id] = Math.round(d.price * (1.08 + r() * .35)); }
    S.flea = { slot, p };
  }
  return S.flea.p;
};
G.FLEA_LVL = 5;

/* ---------- tasks ---------- */
G.taskAvail = t => { const S = G.S; if (t.lvl && G.level() < t.lvl) return false; if (t.after && S.tasks[t.after].st !== 'done') return false; return true; };
G.taskEvent = (ev) => {
  // ev: {type:'kill', who, map, night} | {type:'extract', map} | {type:'visit', map, spot} | {type:'survive'}
  const S = G.S; const done = [];
  G.TASKS.forEach(t => {
    const st = S.tasks[t.id]; if (st.st !== 'active') return; const o = t.obj;
    if (o.type !== ev.type) return;
    if (o.type === 'kill') { if (o.who !== ev.who && !(o.who === 'pmc' && ev.who === 'player')) return; if (o.map && o.map !== ev.map) return; if (o.night && !ev.night) return; st.prog = Math.min(o.n, st.prog + 1); }
    if (o.type === 'extract') { if (o.map !== ev.map) return; st.prog = Math.min(o.n, st.prog + 1); }
    if (o.type === 'survive') st.prog = Math.min(o.n, st.prog + 1);
    if (o.type === 'visit') { if (o.map !== ev.map || o.spot !== ev.spot) return; st.prog = 1; }
    done.push(t);
  });
  return done;
};
G.taskReady = t => {
  const st = G.S.tasks[t.id]; const o = t.obj;
  if (o.type === 'kill' || o.type === 'extract' || o.type === 'survive') return st.prog >= o.n;
  if (o.type === 'visit') return st.prog >= 1;
  if (o.type === 'fetch') return G.countStash(o.item, o.fir) >= o.n;
  if (o.type === 'multi') return o.items.every(([id, n]) => G.countStash(id, o.fir) >= n);
  if (o.type === 'alltasks') return G.TASKS.every(x => x.id === t.id || G.S.tasks[x.id].st === 'done');
  return false;
};
G.countStash = (id, fir) => G.S.stash.items.reduce((s, e) => s + G.itemsDeep(e.it).filter(x => x.id === id && (!fir || x.fir)).reduce((a, x) => a + (x.n || 1), 0), 0);
// take n of an item from stash (top-level entries and nested)
G.takeStash = (id, n, fir) => {
  const take = (g) => {
    for (const e of [...g.items]) {
      if (n <= 0) return;
      const it = e.it;
      if (it.grid) take(it.grid);
      if (it.id === id && (!fir || it.fir)) { if (it.n != null) { const t = Math.min(it.n, n); it.n -= t; n -= t; if (it.n <= 0) G.gridRemove(g, it); } else { G.gridRemove(g, it); n--; } }
    }
  };
  take(G.S.stash); return n <= 0;
};
G.completeTask = t => {
  const S = G.S; const o = t.obj;
  if (o.type === 'fetch') G.takeStash(o.item, o.n, o.fir);
  if (o.type === 'multi') o.items.forEach(([id, n]) => G.takeStash(id, n, o.fir));
  S.tasks[t.id].st = 'done';
  const r = t.reward; if (r.rub) G.giveRub(r.rub); if (r.xp) S.xp += r.xp; if (r.rep) S.traders[t.trader].rep += r.rep;
  (r.items || []).forEach(([id, n]) => { const d = I[id]; if (d.stack) G.give(G.mk(id, { n })); else for (let i = 0; i < n; i++) G.give(G.mk(id)); });
  if (r.unlockPod) { const old = S.eq.secure; const np = G.mk(r.unlockPod); if (old) old.grid.items.forEach(e => G.gridAdd(np.grid, e.it) || G.give(e.it)); S.eq.secure = np; }
};

/* ---------- hideout ---------- */
G.modLvl = m => G.S.hideout[m] || 0;
G.hideoutTick = () => {
  const S = G.S; const now = Date.now();
  for (const m in S.builds) { const b = S.builds[m]; if (now >= b.doneAt) { S.hideout[m] = b.lvl; delete S.builds[m]; if (m === 'stash') S.stash.h = Math.max(S.stash.h, G.STASH_ROWS[b.lvl]); G.toast && G.toast(G.HIDEOUT[m].name + ' level ' + b.lvl + ' built'); } }
  // farm
  const fl = G.modLvl('farm');
  if (fl > 0) { const per = fl >= 2 ? 1200000 : 2400000, max = fl >= 2 ? 5 : 3; if (!S.farm.at) S.farm.at = now; while (now - S.farm.at >= per && S.farm.stored < max) { S.farm.at += per; S.farm.stored++; } if (S.farm.stored >= max) S.farm.at = now; }
  // out-of-raid regen (only when not in raid)
  if (!S.inRaid) {
    const dt = Math.min(3600, (now - (S.lastTick || now)) / 1000); const h = S.health;
    const med = [1, 2, 4][G.modLvl('medstation')] || 1, nut = G.modLvl('nutrition') ? 3 : 1;
    let pool = dt * .06 * med; // hp per second spread
    G.PARTS.forEach(k => { const p = h.p[k]; p.bl = 0; p.hb = 0; if (p.hp < p.max && pool > 0) { const t = Math.min(p.max - p.hp, pool / 2); p.hp += t; pool -= t / 2; } });
    if (G.PARTS.every(k => h.p[k].hp >= h.p[k].max)) G.PARTS.forEach(k => h.p[k].fr = 0);
    h.hyd = Math.min(100, h.hyd + dt * .02 * nut); h.en = Math.min(100, h.en + dt * .02 * nut);
  }
  S.lastTick = now;
};
G.healCost = () => { const h = G.S.health; let c = 0; G.PARTS.forEach(k => { const p = h.p[k]; c += (p.max - p.hp) * 70; if (p.hp <= 0) c += 12000; if (p.fr) c += 3000; }); c += (100 - h.hyd) * 50 + (100 - h.en) * 50; return Math.round(c); };
G.healFull = () => { const h = G.S.health; G.PARTS.forEach(k => { const p = h.p[k]; p.hp = p.max; p.bl = p.hb = p.fr = 0; }); h.hyd = 100; h.en = 100; };

/* ---------- insurance ---------- */
G.insureCost = it => Math.max(500, Math.round(G.value(it) * .14));
})();
