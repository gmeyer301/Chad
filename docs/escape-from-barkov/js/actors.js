/* Escape from Barkov — tree-folk models, hitboxes, ballistics/damage, loadouts, loot, AI */
'use strict';
(() => {
const I = G.ITEMS, A = G.AMMO;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/* ---------------- looks per faction ---------------- */
G.LOOKS = {
  BARK: { leaf: 0xc8642a, bark: 0x6a4a30, size: 1, armorCol: 0x8a7a5a },
  ROOT: { leaf: 0x2f6a2a, bark: 0x5a4030, size: 1, armorCol: 0x4a5a3a },
  sapling: { leaf: 0x8fc04a, bark: 0x9a8a70, size: .92, armorCol: 0x6a6a5a },
  raider: { leaf: 0x6a1e1e, bark: 0x3a2a22, size: 1.03, armorCol: 0x2a2a2a },
  gnarl: { leaf: 0xd4a017, bark: 0x3a2818, size: 1.15, armorCol: 0x5a4a2a, gold: true },
  guard: { leaf: 0x7a5a2a, bark: 0x4a3424, size: 1.06, armorCol: 0x3a3a2a },
  chipper: { leaf: 0x5a5a5a, bark: 0x2a2420, size: 1.22, armorCol: 0x333333, mask: true },
};

/* ---------------- gun mesh (shared by viewmodel and third-person) ---------------- */
G.gunMesh = (it, scale = 1) => {
  const d = I[it.id]; const g = new THREE.Group(); const L = d.len || .8;
  const mk = (w, h, l, col, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), new THREE.MeshLambertMaterial({ color: col })); m.position.set(x, y, z); g.add(m); return m; };
  const body = new THREE.Color(d.col || '#333').getHex(); const wood = 0x6a4426, dark = 0x1c1c1a;
  if (d.cls === 'pistol') { mk(.035, .05, .19, body, 0, .03, -.07); mk(.03, .1, .045, dark, 0, -.035, 0); mk(.008, .012, .01, dark, 0, .06, -.15); }
  else {
    const woody = ['sticks', 'mossin', 'svdwood', 'twig133', 'akmoss', 'bark74', 'rpkroot'].includes(d.id);
    mk(.05, .08, L * .32, body, 0, 0, -L * .18); // receiver
    mk(.022, .022, L * .48, dark, 0, .015, -L * .58); // barrel
    mk(.046, .05, L * .22, woody ? wood : 0x26261f, 0, -.005, -L * .4); // handguard
    if (d.id !== 'bark74u' && d.id !== 'mpfir') mk(.04, .07, L * .26, woody ? wood : 0x22221f, 0, -.02, L * .12); // stock
    else mk(.02, .04, L * .2, dark, 0, 0, L * .08);
    mk(.035, .09, .04, dark, 0, -.07, -L * .02); // grip
    if (d.mt) { const mg = mk(.03, .13, .05, 0x2a261e, 0, -.09, -L * .16); mg.rotation.x = d.mt === 'ak545' || d.mt === 'akm' ? .35 : .1; if (it.mag && I[it.mag.id].cap > 60) { mg.scale.set(2.2, .8, 2.2); } g.userData.mag = mg; if (!it.mag) mg.visible = false; }
    if (d.internal && d.cls === 'shotgun') mk(.03, .03, L * .4, dark, 0, -.03, -L * .52);
    // iron sights
    if (!it.mods || !it.mods.sight) { mk(.006, .03, .006, dark, 0, .055, -L * .78); mk(.03, .02, .008, dark, 0, .05, -L * .05); }
  }
  // mods
  if (it.mods && it.mods.sight) { const md = I[it.mods.sight.id]; if (md.zoom > 1) { const s = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .2, 10), new THREE.MeshLambertMaterial({ color: 0x151515 })); s.rotation.x = Math.PI / 2; s.position.set(0, .085, -L * .2); g.add(s); } else { mk(.035, .035, .06, 0x161616, 0, .07, -L * .2); } g.userData.sightH = md.zoom > 1 ? .085 : .075; }
  else g.userData.sightH = d.cls === 'pistol' ? .065 : .058;
  if (it.mods && it.mods.muzzle) mk(.032, .032, .17, 0x111111, 0, .015, -L * .82 - .08);
  g.userData.len = L; g.userData.muzzle = d.cls === 'pistol' ? -.17 : -(L * .82 + (it.mods && it.mods.muzzle ? .17 : 0));
  g.scale.setScalar(scale);
  return g;
};

/* ---------------- tree model: just a tree, with its gun floating beside it ---------------- */
G.LOOKS.BARK.kind = 'oak'; G.LOOKS.ROOT.kind = 'pine'; G.LOOKS.sapling.kind = 'young'; G.LOOKS.raider.kind = 'oak'; G.LOOKS.gnarl.kind = 'gnarled'; G.LOOKS.guard.kind = 'oak'; G.LOOKS.chipper.kind = 'dead';
G.treeModel = (lookKey) => {
  const lk = G.LOOKS[lookKey] || G.LOOKS.sapling; const T = G.textures();
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const barkM = new THREE.MeshLambertMaterial({ map: T.bark, color: lk.bark });
  const leafM = new THREE.MeshLambertMaterial({ map: T.leaves, color: lk.leaf });
  const mesh = (geo, mat, x, y, z, p = body) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  const kind = lk.kind || 'oak';
  // trunk + a few root flares at the base
  const trunkH = kind === 'young' ? 1.6 : 1.7;
  const tr = mesh(new THREE.CylinderGeometry(kind === 'young' ? .11 : .15, kind === 'gnarled' ? .3 : .22, trunkH, 9), barkM, 0, trunkH / 2, 0);
  if (kind === 'gnarled') tr.rotation.z = .06;
  for (let i = 0; i < 4; i++) { const r = mesh(new THREE.ConeGeometry(.07, .35, 5), barkM, Math.cos(i * 1.57) * .2, .1, Math.sin(i * 1.57) * .2); r.rotation.set(Math.sin(i * 1.57) * 1.2, 0, -Math.cos(i * 1.57) * 1.2); }
  const crown = new THREE.Group(); crown.position.y = trunkH - .15; body.add(crown);
  if (kind === 'pine') {
    for (let k = 0; k < 4; k++) mesh(new THREE.ConeGeometry(.62 - k * .12, .55, 8), leafM, 0, .05 + k * .3, 0, crown);
  } else if (kind === 'dead') {
    for (let k = 0; k < 6; k++) { const br = mesh(new THREE.CylinderGeometry(.02, .05, .7, 5), barkM, 0, .25, 0, crown); br.rotation.set(Math.cos(k) * .9, k, Math.sin(k * 1.7) * .9); }
    for (let k = 0; k < 2; k++) mesh(new THREE.IcosahedronGeometry(.18, 0), leafM, (k - .5) * .4, .5, 0, crown);
  } else {
    const n = kind === 'young' ? 4 : kind === 'gnarled' ? 9 : 7; const sp = kind === 'young' ? .3 : .5;
    for (let i = 0; i < n; i++) { const c = mesh(new THREE.IcosahedronGeometry((kind === 'young' ? .24 : .32) + Math.random() * .14, 1), leafM, (Math.random() - .5) * sp * 1.6, .15 + Math.random() * sp, (Math.random() - .5) * sp * 1.6, crown); c.rotation.set(Math.random(), Math.random(), Math.random()); }
  }
  const gear = new THREE.Group(); body.add(gear);
  const parts = { root, body, crown, gear, barkM, leafM, lk };
  root.scale.setScalar(lk.size);
  return parts;
};
// trees wear nothing
G.dressModel = (P, eq) => { const w = eq && (eq.primary || eq.secondary || eq.holster); if ((w && w.u) === P.gunU) return; G.modelGun(P, w); if (P.dead && P.gun) { P.gun.position.y = .08; P.gun.rotation.z = 1.5; } };
G.modelGun = (P, it) => {
  if (P.gun) { P.gun.parent && P.gun.parent.remove(P.gun); P.gun = null; }
  P.gunU = it && it.u; if (!it) return; const gm = G.gunMesh(it, 1.15); const holder = new THREE.Group(); holder.position.set(.42, 1.3, -.05); holder.add(gm); P.root.add(holder); P.gun = holder; gm.traverse(o => o.castShadow = true);
};

/* ---------------- hitboxes ---------------- */
// returns parts as boxes in world space: [part, min[], max[]]
G.hitboxes = (a) => {
  const s = (a.size || 1); const cr = a.crouchK != null ? a.crouchK : 0; const hy = 1 - cr * .35;
  const x = a.pos.x, y = a.pos.y, z = a.pos.z; const fx = -Math.sin(a.yaw), fz = -Math.cos(a.yaw); const rx = -fz, rz = fx; // right vector
  const lean = a.leanO || 0; const lx = rx * lean, lz = rz * lean;
  const B = (part, cx, cy, cz, hw, hh, hd) => [part, [cx - hw, cy - hh, cz - hd], [cx + hw, cy + hh, cz + hd]];
  const out = [];
  out.push(B('head', x + lx * 1.4, y + 1.66 * s * hy, z + lz * 1.4, .13 * s, .14 * s, .13 * s));
  out.push(B('thorax', x + lx, y + 1.33 * s * hy, z + lz, .2 * s, .18 * s, .2 * s));
  out.push(B('stomach', x + lx * .6, y + 1.0 * s * hy, z + lz * .6, .19 * s, .15 * s, .19 * s));
  out.push(B('larm', x - rx * .3 * s + fx * .15 + lx, y + 1.25 * s * hy, z - rz * .3 * s + fz * .15 + lz, .07 * s, .22 * s, .07 * s));
  out.push(B('rarm', x + rx * .3 * s + fx * .15 + lx, y + 1.25 * s * hy, z + rz * .3 * s + fz * .15 + lz, .07 * s, .22 * s, .07 * s));
  out.push(B('lleg', x - rx * .11 * s, y + .42 * s * hy, z - rz * .11 * s, .09 * s, .42 * s * hy, .09 * s));
  out.push(B('rleg', x + rx * .11 * s, y + .42 * s * hy, z + rz * .11 * s, .09 * s, .42 * s * hy, .09 * s));
  return out;
};
G.segHitActor = (a, o, d, len) => {
  const dx = a.pos.x - o[0], dz = a.pos.z - o[2]; const tc = dx * d[0] + dz * d[2]; // quick reject
  if (tc < -1.5 || tc > len + 1.5) return null;
  const px = o[0] + d[0] * tc - a.pos.x, pz = o[2] + d[2] * tc - a.pos.z; if (px * px + pz * pz > 2.5) return null;
  let best = null;
  for (const [part, mn, mx] of G.hitboxes(a)) { const t = G.rayBox(o, d, { min: mn, max: mx }, len); if (t >= 0 && (!best || t < best.t)) best = { t, part }; }
  return best;
};

/* ---------------- damage model ---------------- */
// apply a bullet to an actor. returns {dmg, pen, armor, kill, part}
G.applyBullet = (a, part, ammoId, opts = {}) => {
  const am = A[ammoId]; const H = a.health; let dmg = am.dmg * (opts.mult || 1); const pen = am.pen * (opts.penMult || 1);
  let armorHit = null; let face = part === 'head' && Math.random() < .35;
  // which armour covers the part?
  let arm = null;
  if (part === 'head' && a.eq.helmet && (!face || I[a.eq.helmet.id].face)) arm = a.eq.helmet;
  if ((part === 'thorax' || part === 'stomach')) { for (const it of [a.eq.armor, a.eq.rig]) { if (it && I[it.id].cls && I[it.id].zones.includes(part) && it.dur > 0) { arm = it; break; } } }
  let penetrated = true;
  if (arm && arm.dur > 0) {
    const d = I[arm.id]; const df = arm.dur / d.dur; const eff = d.cls * 10 * (.55 + .45 * df);
    const x = pen - eff; const ch = x >= 10 ? 1 : x <= -15 ? .02 : G.clamp(.5 + x / 24, .02, 1);
    penetrated = Math.random() < ch;
    const ad = am.ad / 100; const loss = G.clamp(pen / (d.cls * 10), .35, 1.6) * ad * (penetrated ? 3.2 : 4.5);
    arm.dur = Math.max(0, arm.dur - loss);
    armorHit = arm;
    if (penetrated) dmg *= G.clamp(1 - (d.cls * 10 - pen) / 220, .6, 1); else dmg = dmg * .22 * (1 + pen / 120); // blunt trauma
  }
  const res = G.damagePart(a, part, dmg, { bleed: penetrated, src: opts.src });
  res.pen = penetrated; res.armor = armorHit; res.part = part; res.face = face;
  return res;
};
G.damagePart = (a, part, dmg, o = {}) => {
  const H = a.health; const p = H.p[part]; let kill = false;
  if (p.hp > 0) {
    const nh = p.hp - dmg;
    if (nh <= 0) { if (part === 'head' || part === 'thorax') { p.hp = 0; kill = true; } else { p.hp = 0; spread(a, -nh * (part === 'stomach' ? 1.5 : .7)); } }
    else p.hp = nh;
  } else {
    if (part === 'head' || part === 'thorax') kill = true; else spread(a, dmg * (part === 'stomach' ? 1.5 : .7));
  }
  if (!kill && (H.p.head.hp <= 0 || H.p.thorax.hp <= 0)) kill = true;
  // effects
  if (o.bleed !== false && dmg > 6 && part !== 'head') {
    const vit = a.isMe ? G.skillLvl('vitality') * .006 : 0;
    if (Math.random() < G.clamp(dmg / 85, .1, .55) - vit) p.bl = 1;
    if (dmg > 32 && Math.random() < G.clamp((dmg - 30) / 120, .05, .3) - vit) p.hb = 1;
  }
  if (o.bleed !== false && (part.endsWith('arm') || part.endsWith('leg')) && dmg > 25 && Math.random() < .25) p.fr = 1;
  if (a.isMe && dmg > 4) { a.pain = Math.max(a.pain || 0, 20 + dmg); }
  if (kill) { a.alive = false; a.killedBy = o.src; }
  return { dmg, kill };
};
function spread(a, d) {
  const H = a.health; const live = G.PARTS.filter(k => H.p[k].hp > 0); if (!live.length) { a.alive = false; return; }
  const each = d / live.length; live.forEach(k => { H.p[k].hp -= each; if (H.p[k].hp <= 0) { H.p[k].hp = 0; if (k === 'head' || k === 'thorax') a.alive = false; } });
}

/* ---------------- loot tables ---------------- */
const LOOT = {
  jacket: { g: [2, 2], n: [0, 2], t: [['rub', 20], ['lighter', 8], ['chips', 8], ['painkill', 5], ['bandage', 7], ['screws', 6], ['sundial', 2], ['key_office', 2], ['key_cellar', 1], ['key_control', 1.5], ['key_bunker', 1], ['flashdrive', 2], ['goldchain', 2], ['a545_ps', 3], ['a918_p', 3]] },
  medbag: { g: [2, 2], n: [1, 3], t: [['bandage', 20], ['aisap', 16], ['painkill', 10], ['splint', 10], ['tourniquet', 10], ['sapwa', 5], ['ifak', 4], ['cms', 2], ['resinshot', 2], ['chloroboost', .7]] },
  weaponbox: { g: [5, 3], n: [1, 3], t: [['pm', 10], ['sticks', 8], ['twig133', 8], ['mossin', 6], ['bark74u', 6], ['mpfir', 4], ['akmoss', 3], ['bark74', 3], ['gnarlock', 4], ['m4acorn', 1.2], ['svdwood', .6], ['pm_mag', 6], ['ak545_30', 7], ['akm_30', 5], ['mp_mag', 4], ['stanag_30', 3], ['gl_mag', 3], ['reddot', 3], ['holo', 1.5], ['scope4', 1], ['supp_pist', 1], ['supp_rifle', .6], ['pinenade', 4]] },
  ammobox: { g: [3, 3], n: [1, 4], t: [['a918_p', 10], ['a918_pbm', 3], ['a919_pst', 8], ['a919_ap', 2], ['a545_ps', 10], ['a545_bp', 3], ['a545_bs', .8], ['a762_ps', 9], ['a762_bp', 2], ['a556_m855', 4], ['a556_m995', .7], ['a762r_lps', 6], ['a762r_snb', .8], ['a12_buck', 9], ['a12_slug', 4], ['a12_ap20', 1], ['pinenade', 3]] },
  toolbox: { g: [3, 3], n: [1, 3], t: [['screws', 14], ['vines', 10], ['ducttape', 8], ['bolts', 12], ['wires', 10], ['gunpowder', 5], ['battery', 2], ['sapcan', 2], ['analyzer', 2]] },
  crate: { g: [4, 4], n: [1, 4], t: [['chips', 6], ['stew', 4], ['sapwater', 6], ['screws', 6], ['bolts', 6], ['wires', 4], ['fertilizer', 3], ['teapot', 3], ['a545_ps', 4], ['a12_buck', 4], ['a762_ps', 3], ['bag_sack', 2], ['rig_twine', 2], ['beetlejar', 3], ['sapcan', 2], ['battery', 1.5], ['moonshine', .6]] },
  safe: { g: [2, 2], n: [1, 3], t: [['rub', 30], ['sundial', 10], ['goldchain', 10], ['acorn_gold', 5], ['intel', 3], ['lumen', .6], ['flashdrive', 6]], search: 2.5 },
  pc: { g: [2, 2], n: [0, 2], t: [['flashdrive', 10], ['vines', 10], ['wires', 10], ['photocard', 1.5], ['analyzer', 2]] },
  ration: { g: [3, 2], n: [1, 3], t: [['sapwater', 12], ['chips', 12], ['stew', 7], ['maple', 6], ['moonshine', .8]] },
  filecab: { g: [3, 3], n: [0, 3], t: [['rub', 12], ['intel', 2], ['flashdrive', 5], ['key_office', 3], ['key_control', 2], ['key_cellar', 1], ['key_bunker', 1.5], ['lighter', 6], ['analyzer', 2]] },
  armor: { g: [5, 5], n: [1, 2], t: [['pith_vest', 8], ['moss3m', 6], ['acorn_cap', 8], ['shell_helm', 3], ['heartwood', 2], ['rig_twine', 6], ['rig_band', 4], ['rig_alpha', 1.5], ['bag_sack', 4], ['bag_day', 4], ['bag_pilgrim', 1.5], ['ironbark', .4]] },
  loose: { g: [3, 2], n: [1, 1], t: [['sapwater', 5], ['bandage', 5], ['screws', 5], ['vines', 4], ['lighter', 4], ['sundial', 2], ['acorn_gold', 1], ['flashdrive', 3], ['a545_ps', 3], ['painkill', 4], ['beetlejar', 3], ['intel', .6], ['lumen', .2]] },
};
G.LOOT = LOOT;
const LOOT_NAMES = { jacket: 'Jacket', medbag: 'Medbag', weaponbox: 'Weapon box', ammobox: 'Ammo crate', toolbox: 'Toolbox', crate: 'Wooden crate', safe: 'Safe', pc: 'PC block', ration: 'Ration crate', filecab: 'Filing cabinet', armor: 'Gear rack', loose: 'Loose loot', body: 'Body', ground: 'Ground' };
G.LOOT_NAMES = LOOT_NAMES;
G.genLoot = (type, r, rich) => {
  const T = LOOT[type]; const g = G.grid(T.g[0], T.g[1]); let n = Math.floor(T.n[0] + r() * (T.n[1] - T.n[0] + 1)); if (rich) n += 1;
  for (let i = 0; i < n; i++) {
    let id = G.wpick(r, T.t); if (rich && r() < .4) id = G.wpick(r, T.t.filter(e => I[e[0]].price > 15000).concat([['acorn_gold', .5]]));
    const d = I[id]; let it;
    if (d.type === 'money') it = G.mk('rub', { n: Math.round((type === 'safe' ? 15000 + r() * 70000 : 800 + r() * 9000) / 100) * 100 });
    else if (d.type === 'ammo') it = G.mk(id, { n: 10 + Math.floor(r() * 50) });
    else { it = G.mk(id); if (d.type === 'mag') { const am = Object.keys(A).filter(k => A[k].cal === d.cal); const a = am[Math.floor(r() * Math.min(2, am.length))]; const k = Math.floor(r() * d.cap * .8); for (let j = 0; j < k; j++) it.rounds.push(a); } if (d.dur) it.dur = Math.round(d.dur * (.4 + r() * .6)); if (d.res > 1) it.res = Math.round(d.res * (.4 + r() * .6)); if (d.uses) it.uses = 1 + Math.floor(r() * d.uses); }
    it.fir = true; it.unk = true;
    if (!G.gridAdd(g, it)) { /* grid full */ }
  }
  return g;
};

/* ---------------- AI loadouts ---------------- */
const ammoFor = (cal, tier) => { const l = Object.keys(A).filter(k => A[k].cal === cal).sort((a, b) => A[a].pen - A[b].pen); return l[Math.min(l.length - 1, Math.max(0, tier))]; };
const magFor = mt => Object.keys(I).find(k => I[k].type === 'mag' && I[k].mt === mt && I[k].cap <= 45);
G.armWeapon = (w, tier, r = Math.random) => {
  const d = I[w.id]; const a = ammoFor(d.cal, tier);
  if (d.mt) { w.mag = G.mk(magFor(d.mt)); w.mag.rounds = Array(I[w.mag.id].cap).fill(a); w.ch = a; w.mag.rounds.pop(); }
  else { w.rounds = Array(d.internal).fill(a); w.ch = w.rounds.pop(); }
  return a;
};
G.genLoadout = (kind, r = Math.random) => {
  const eq = G.newEq(); eq.secure = null; const P = (p) => r() < p;
  const tierW = { sapling: 0, pmc: 1, raider: 1, guard: 1, gnarl: 2, chipper: 1 }[kind] || 0;
  let wpn, holster = null, tier = tierW;
  if (kind === 'sapling') { wpn = G.pick(['pm', 'twig133', 'twig133', 'sticks', 'sticks', 'mossin', 'bark74u', 'akmoss', 'mpfir']); tier = r() < .15 ? 1 : 0; }
  if (kind === 'pmc') { wpn = G.pick(['bark74', 'akmoss', 'm4acorn', 'mpfir', 'bark74u', 'svdwood', 'm4acorn']); tier = r() < .5 ? 1 : 2; holster = r() < .5 ? 'gnarlock' : 'pm'; }
  if (kind === 'raider') { wpn = G.pick(['bark74', 'akmoss', 'm4acorn', 'rpkroot']); tier = 2; holster = 'gnarlock'; }
  if (kind === 'guard') { wpn = G.pick(['twig133', 'akmoss', 'bark74']); tier = 2; }
  if (kind === 'gnarl') { wpn = null; holster = 'goldgnarl'; tier = 1; }
  if (kind === 'chipper') { wpn = 'rpkroot'; tier = 1; }
  if (wpn) { const w = G.mk(wpn); if (I[wpn].rail !== false && (kind !== 'sapling' || P(.15))) { if (P(kind === 'sapling' ? .5 : .6)) w.mods.sight = G.mk(G.pick(['reddot', 'holo', kind === 'pmc' && P(.3) ? 'scope4' : 'reddot'])); } if (kind === 'raider' && I[wpn].cal !== '762r' && P(.4) && I[wpn].cls !== 'shotgun') w.mods.muzzle = G.mk(I[wpn].cal === '9x19' ? 'supp_pist' : 'supp_rifle'); G.armWeapon(w, tier, r); eq.primary = w; if (wpn === 'rpkroot' && kind === 'chipper') { w.mag = G.mk('rpk_75'); w.mag.rounds = Array(74).fill(ammoFor('762x39', 1)); } }
  if (holster) { const h = G.mk(holster); G.armWeapon(h, tier, r); eq.holster = h; }
  const arm = { sapling: [[null, 6], ['pith_vest', 2], ['moss3m', 1]], pmc: [['moss3m', 2], ['heartwood', 4], ['ironbark', 1.5], ['rig_armored', 1.5], ['petrified', .4]], raider: [['heartwood', 2], ['ironbark', 3], ['petrified', 1]], guard: [['heartwood', 3], ['ironbark', 2]], gnarl: [['pith_vest', 1]], chipper: [['petrified', 1]] }[kind];
  const a = G.wpick(r, arm); if (a) { const it = G.mk(a); it.dur = Math.round(I[a].dur * (.6 + r() * .4)); if (I[a].type === 'rig') eq.rig = it; else eq.armor = it; }
  const hel = { sapling: [[null, 6], ['acorn_cap', 1.5]], pmc: [[null, 1], ['acorn_cap', 1], ['shell_helm', 3], ['oak_bucket', .4]], raider: [['shell_helm', 2], ['oak_bucket', 1]], guard: [['shell_helm', 2], ['acorn_cap', 1]], gnarl: [[null, 1]], chipper: [['oak_bucket', 1]] }[kind];
  const hh = G.wpick(r, hel); if (hh) eq.helmet = G.mk(hh);
  if (!eq.rig) eq.rig = G.mk(kind === 'sapling' ? G.pick(['rig_twine', 'rig_twine', 'rig_band']) : G.pick(['rig_band', 'rig_alpha']));
  if (kind !== 'gnarl' && kind !== 'chipper' && P(kind === 'sapling' ? .55 : .8)) eq.backpack = G.mk(kind === 'sapling' ? G.pick(['bag_sack', 'bag_day']) : G.pick(['bag_day', 'bag_pilgrim', 'bag_trunk']));
  // spare mags/ammo in rig, meds
  const w = eq.primary || eq.holster; const wd = I[w.id];
  if (wd.mt) for (let i = 0; i < (kind === 'sapling' ? 1 : 2); i++) { const m = G.mk(I[w.mag.id].cap > 60 ? magFor(wd.mt) : w.mag.id); m.rounds = Array(Math.floor(I[m.id].cap * (.4 + r() * .6))).fill(w.mag.rounds[0] || w.ch); G.gridAdd(eq.rig.grid, m); }
  else G.gridAdd(eq.rig.grid, G.mk(w.ch || ammoFor(wd.cal, 0), { n: 10 + Math.floor(r() * 20) }));
  if (P(.6)) G.gridAdd(eq.pockets, G.mk(G.pick(['bandage', 'aisap', 'painkill'])));
  if (kind !== 'sapling' && P(.7)) G.gridAdd(eq.rig.grid, G.mk(G.pick(['sapwa', 'ifak', 'aisap'])));
  if (P(kind === 'sapling' ? .1 : .3)) G.gridAdd(eq.rig.grid, G.mk('pinenade'));
  if (eq.backpack) { const n = Math.floor(r() * 4); for (let i = 0; i < n; i++) { const id = G.wpick(r, LOOT.crate.t.concat(LOOT.loose.t)); const d = I[id]; G.gridAdd(eq.backpack.grid, d.stack ? G.mk(id, { n: d.type === 'money' ? 2000 + Math.floor(r() * 20000) : 20 + Math.floor(r() * 30) }) : G.mk(id)); } }
  if (P(.4)) G.gridAdd(eq.pockets, G.mk('rub', { n: Math.round((500 + r() * (kind === 'sapling' ? 6000 : 25000)) / 100) * 100 }));
  if (kind === 'gnarl') { G.gridAdd(eq.pockets, G.mk('key_cellar')); G.gridAdd(eq.pockets, G.mk('acorn_gold')); G.gridAdd(eq.pockets, G.mk('goldchain')); eq.backpack = G.mk('bag_day'); G.gridAdd(eq.backpack.grid, G.mk('intel')); G.gridAdd(eq.backpack.grid, G.mk('rub', { n: 150000 })); }
  if (kind === 'chipper') { G.gridAdd(eq.rig.grid, G.mk('acorn_gold')); G.gridAdd(eq.rig.grid, G.mk('key_control')); G.gridAdd(eq.pockets, G.mk('chloroboost')); }
  G.allEqItems(eq).forEach(it => it.fir = true);
  return eq;
};
G.allEqItems = eq => { const out = []; ['primary', 'secondary', 'holster', 'helmet', 'armor', 'rig', 'backpack', 'secure'].forEach(s => eq[s] && G.itemsDeep(eq[s], out)); if (eq.pockets) eq.pockets.items.forEach(e => G.itemsDeep(e.it, out)); return out; };

/* ---------------- AI ---------------- */
const NAMES = ['Oakley', 'Birchwood', 'Twiggy', 'Mapleton', 'Sprucey', 'Ashford', 'Elmo', 'Rowan', 'Hazel', 'Cedric', 'Willow', 'Alder', 'Larch', 'Hemlock', 'Yew', 'Sequoia', 'Linden', 'Juniper', 'Poplar', 'Sycamore', 'Acorn', 'Knotty', 'Barkley', 'Stumpy', 'Branchy', 'Rooty'];
G.aiName = (kind, r = Math.random) => {
  const n = NAMES[Math.floor(r() * NAMES.length)];
  if (kind === 'pmc') return G.pick(['xX_', '', '', 'TTV_', '']) + n + (r() < .6 ? '_' + Math.floor(r() * 99) : '');
  if (kind === 'gnarl') return 'Old Gnarl'; if (kind === 'chipper') return 'The Woodchipper'; if (kind === 'guard') return 'Knothead ' + n;
  if (kind === 'raider') return 'Rotwood ' + n;
  return n + ' ' + G.pick(['Saplingov', 'Sproutsky', 'Shrubenko', 'Twigovich', 'Leafin', 'Mossov']);
};
// faction hostility
G.hostile = (a, b) => {
  if (a === b || !a.alive || !b.alive) return false;
  const fa = a.fac, fb = b.fac;
  if (fa === 'player' || fb === 'player') {
    const p = fa === 'player' ? a : b, o = fa === 'player' ? b : a;
    if (o.fac === 'player') return G.R && G.R.pvp && p.team !== o.team;
    if (p.scav && o.fac === 'sapling') return !!(o.angry && o.angry.has(p.id)) || !!p.scavRat; // player-scav is friendly to saplings unless they shoot them
    return true;
  }
  if (fa === fb) return false;
  if ((fa === 'sapling' && (fb === 'gnarl' || fb === 'guard')) || (fb === 'sapling' && (fa === 'gnarl' || fa === 'guard'))) return false;
  if ((fa === 'gnarl' && fb === 'guard') || (fa === 'guard' && fb === 'gnarl')) return false;
  if (fa === 'pmc' && fb === 'pmc') return a.team !== b.team;
  return true;
};
G.AI_SKILL = {
  sapling: { err: 6, min: 1.6, react: .9, range: 85, hp: 1, spd: 1, burst: 3, agg: .4 },
  pmc: { err: 3.5, min: .6, react: .45, range: 140, hp: 1, spd: 1.1, burst: 4, agg: .8 },
  raider: { err: 3, min: .5, react: .4, range: 130, hp: 1, spd: 1.05, burst: 5, agg: .9 },
  guard: { err: 3, min: .55, react: .45, range: 110, hp: 1.2, spd: 1, burst: 5, agg: .9 },
  gnarl: { err: 2.6, min: .5, react: .4, range: 90, hp: 1.6, spd: .9, burst: 3, agg: .5 },
  chipper: { err: 3.2, min: .7, react: .35, range: 100, hp: 1.8, spd: 1.15, burst: 12, agg: 1 },
};

// AI tick (host only). R = raid
G.aiTick = (R, a, dt) => {
  const W = R.W; const sk = G.AI_SKILL[a.fac]; const ai = a.ai; const now = R.t;
  if (!a.alive) return;
  ai.think -= dt; ai.fireCd -= dt; ai.reload -= dt; ai.voiceCd -= dt; ai.doorCd -= dt;
  const eye = [a.pos.x, a.pos.y + 1.6 * (a.size || 1) * (1 - a.crouchK * .35), a.pos.z];
  // perception
  if (ai.think <= 0) {
    ai.think = .18 + Math.random() * .08;
    let best = null, bd = 1e9;
    for (const o of R.actors) {
      if (o === a || !G.hostile(a, o)) continue;
      const dx = o.pos.x - a.pos.x, dz = o.pos.z - a.pos.z; const d = Math.hypot(dx, dz);
      let range = sk.range * (R.night ? (o.light ? .9 : .38) : 1) * (W.indoor ? .7 : 1); if (o.crouchK > .5) range *= .8;
      if (d > range) continue;
      const ang = Math.atan2(-dx, -dz); let da = Math.abs(((ang - a.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      const fov = ai.st === 'combat' ? 2.6 : 1.15; if (da > fov && d > 4) continue;
      const tgt = [o.pos.x, o.pos.y + 1.3 * (o.crouchK > .5 ? .7 : 1), o.pos.z]; const tgh = [o.pos.x, o.pos.y + 1.65 * (o.crouchK > .5 ? .7 : 1), o.pos.z];
      if (!G.los(W, eye, tgt) && !G.los(W, eye, tgh)) continue;
      if (d < bd) { bd = d; best = o; }
    }
    if (best) {
      if (ai.target !== best) { ai.target = best; ai.seenT = 0; ai.errK = 1; ai.react = sk.react * (.7 + Math.random() * .7) + bd / 140; if (ai.voiceCd <= 0) { G.AU && G.AU.voice(a.pos, a.fac === 'pmc' ? 'pmc' : (a.fac === 'gnarl' || a.fac === 'chipper') ? 'boss' : 'scav'); ai.voiceCd = 6 + Math.random() * 6; R.net && R.net.voice(a); } }
      ai.vis = true; ai.last = [best.pos.x, best.pos.z]; ai.lastT = now; ai.st = 'combat';
      // alert friends
      if (!ai.called) { ai.called = true; R.actors.forEach(f => { if (f.ai && f !== a && !G.hostile(a, f) && f.fac === a.fac && Math.hypot(f.pos.x - a.pos.x, f.pos.z - a.pos.z) < 40 && f.ai.st !== 'combat') { f.ai.st = 'alert'; f.ai.heard = [best.pos.x, best.pos.z]; f.ai.path = null; } }); }
    } else { ai.vis = false; if (ai.target && (!ai.target.alive || now - ai.lastT > 25)) { ai.target = null; ai.st = 'patrol'; ai.path = null; ai.called = false; } }
  }
  const T = ai.target;
  // health management
  const hp = G.totalHP(a.health) / G.maxHP(a.health);
  if (hp < .45 && !ai.vis && ai.heals > 0 && !ai.healing) { ai.healing = 5; ai.heals--; }
  if (ai.healing) { ai.healing -= dt; if (ai.healing <= 0) { ai.healing = 0; G.PARTS.forEach(k => { const p = a.health.p[k]; if (p.hp > 0) p.hp = Math.min(p.max, p.hp + p.max * .4); p.hb = 0; p.bl = 0; }); } }
  let moveTo = null, run = false, wantCrouch = 0;
  if (ai.st === 'combat' && T) {
    const dx = T.pos.x - a.pos.x, dz = T.pos.z - a.pos.z, d = Math.hypot(dx, dz);
    const desired = Math.atan2(-dx, -dz);
    if (ai.vis) {
      ai.seenT += dt; a.yaw = turn(a.yaw, desired, dt * 7); const tp = (T.pos.y + (T.crouchK > .5 ? .9 : 1.3)) - eye[1]; a.pitch = Math.atan2(tp, d);
      ai.errK = Math.max(0, ai.errK - dt * (.35 + (sk.min < 1 ? .25 : 0)));
      if (ai.seenT > ai.react && ai.reload <= 0 && !ai.healing) aiFire(R, a, T, d, sk);
      // reposition: strafe / push / hold
      ai.strafeT -= dt; if (ai.strafeT <= 0) { ai.strafeT = 1 + Math.random() * 2; ai.strafe = Math.random() < .35 ? 0 : (Math.random() < .5 ? -1 : 1); ai.crouch = Math.random() < (d > 25 ? .5 : .2); }
      if (ai.strafe) { const rx = Math.cos(a.yaw), rz = -Math.sin(a.yaw); moveTo = [a.pos.x + rx * ai.strafe * 2, a.pos.z + rz * ai.strafe * 2]; }
      if (d > 60 && Math.random() < sk.agg * dt * .3) { ai.st = 'push'; }
      wantCrouch = ai.crouch && !ai.strafe ? 1 : 0;
    } else {
      // lost sight: push to last known position (aggressive) or hold angle
      if (now - ai.lastT > 1.5 + (1 - sk.agg) * 5) { if (!ai.path || ai.pathGoal !== 'last') { ai.path = G.path(W, a.pos.x, a.pos.z, ai.last[0], ai.last[1]); ai.pathGoal = 'last'; } run = sk.agg > .6; if (!ai.path || !ai.path.length) { ai.st = 'search'; ai.searchT = 12; ai.path = null; } }
      else { a.yaw = turn(a.yaw, Math.atan2(-(ai.last[0] - a.pos.x), -(ai.last[1] - a.pos.z)), dt * 4); }
    }
    if (hp < .3 && !ai.fled && ai.vis && d < 40) { ai.fled = true; const away = [a.pos.x - dx / d * 15, a.pos.z - dz / d * 15]; const f = G.randomFree(W, away[0], away[1], 6); ai.path = G.path(W, a.pos.x, a.pos.z, f[0], f[1]); ai.pathGoal = 'flee'; run = true; }
  } else if (ai.st === 'push' && T) { if (!ai.path) { ai.path = G.path(W, a.pos.x, a.pos.z, T.pos.x, T.pos.z); ai.pathGoal = 'push'; } run = true; if (!ai.path || !ai.path.length) { ai.st = 'combat'; ai.path = null; } }
  else if (ai.st === 'alert') {
    if (!ai.path || ai.pathGoal !== 'heard') { ai.path = G.path(W, a.pos.x, a.pos.z, ai.heard[0], ai.heard[1]); ai.pathGoal = 'heard'; if (!ai.path) ai.st = 'patrol'; }
    run = Math.random() < .5 * sk.agg; if (ai.path && !ai.path.length) { ai.st = 'search'; ai.searchT = 8; ai.path = null; }
  } else if (ai.st === 'search') { ai.searchT -= dt; a.yaw += dt * .9; if (ai.searchT <= 0) { ai.st = 'patrol'; ai.path = null; } }
  else { // patrol
    ai.idle -= dt;
    if (!ai.path && ai.idle <= 0) {
      const z = ai.zone; let p;
      if (a.fac === 'pmc' && Math.random() < .7) { const zz = G.pick(W.zones); p = G.randomFree(W, zz.x, zz.z, zz.r); }
      else p = G.randomFree(W, z.x, z.z, z.r);
      ai.path = G.path(W, a.pos.x, a.pos.z, p[0], p[1]); ai.pathGoal = 'patrol'; ai.idle = 3 + Math.random() * 8;
    }
    if (ai.voiceCd <= 0 && Math.random() < dt * .03) { G.AU && G.AU.voice(a.pos, a.fac === 'pmc' ? 'pmc' : 'scav', .8 + Math.random() * .4); ai.voiceCd = 15; }
  }
  // follow path
  if (ai.path && ai.path.length) {
    const [px, pz] = ai.path[0]; const dx = px - a.pos.x, dz = pz - a.pos.z; const d = Math.hypot(dx, dz);
    if (d < .5) ai.path.shift(); else moveTo = [px, pz];
    if (!ai.path.length) ai.path = (ai.st === 'combat' && ai.pathGoal === 'last') ? [] : null;
  }
  // open doors in the way
  if (moveTo && ai.doorCd <= 0) { ai.doorCd = .4; for (const dr of W.doors) { if (!dr.open && !dr.key && Math.hypot(dr.x - a.pos.x, dr.z - a.pos.z) < 1.6) { G.setDoor(W, dr, true); R.net && R.net.door(dr); } } }
  // movement
  a.crouchK += ((wantCrouch ? 1 : 0) - a.crouchK) * Math.min(1, dt * 5);
  let speed = 0;
  if (moveTo) {
    const dx = moveTo[0] - a.pos.x, dz = moveTo[1] - a.pos.z; const d = Math.hypot(dx, dz) || 1;
    speed = (run ? 4.6 : ai.st === 'patrol' ? 1.9 : 2.8) * sk.spd * (a.crouchK > .5 ? .55 : 1);
    const lp = a.health.p.lleg, rp = a.health.p.rleg; if (lp.hp <= 0 || rp.hp <= 0 || lp.fr || rp.fr) speed *= .6;
    const ox = a.pos.x, oz = a.pos.z;
    a.pos.x += dx / d * speed * dt; a.pos.z += dz / d * speed * dt;
    if (!(ai.st === 'combat' && ai.vis)) a.yaw = turn(a.yaw, Math.atan2(-dx, -dz), dt * 6);
    G.collide(W, a.pos, .35, a.pos.y, 1.7);
    const moved = Math.hypot(a.pos.x - ox, a.pos.z - oz); if (moved < speed * dt * .2) { ai.stuck = (ai.stuck || 0) + dt; if (ai.stuck > 1.5) { ai.path = null; ai.stuck = 0; ai.idle = 0; } } else ai.stuck = 0;
    a.stepT -= moved; if (a.stepT <= 0) { a.stepT = 1.6; if (G.AU) G.AU.step({ x: a.pos.x, y: a.pos.y, z: a.pos.z }, run ? .8 : .45, G.surfaceAt(W, a.pos.x, a.pos.z)); }
  }
  a.moving = speed;
  // bleeding
  bleedTick(a, dt);
};
function turn(cur, target, k) { let d = ((target - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI; return cur + G.clamp(d, -k, k); }
function bleedTick(a, dt) {
  let dmg = 0; G.PARTS.forEach(k => { const p = a.health.p[k]; if (p.hb) dmg += 2.2 * dt; else if (p.bl) dmg += .7 * dt; });
  if (dmg > 0) { const r = G.damagePart(a, 'stomach', dmg, { bleed: false }); if (r.kill) G.R && G.R.onDeath(a, null, 'bleeding'); }
}
G.bleedTick = bleedTick;
function aiFire(R, a, T, d, sk) {
  const w = a.weapon; if (!w || a.ai.fireCd > 0) return; const wd = I[w.id];
  const hasAmmo = w.ch || (w.mag && w.mag.rounds.length) || (w.rounds && w.rounds.length);
  if (!w.ch) { if (w.mag && w.mag.rounds.length) w.ch = w.mag.rounds.pop(); else if (w.rounds && w.rounds.length) w.ch = w.rounds.pop(); else { // reload from infinite reserve
      a.ai.reload = wd.internal ? 3.5 : 2.6; const am = a.ai.ammo; if (w.mag) w.mag.rounds = Array(I[w.mag.id].cap).fill(am); else w.rounds = Array(wd.internal).fill(am); if (G.AU) G.AU.reload(a.pos, 0); return; } }
  // burst control
  if (a.ai.burstLeft <= 0) { a.ai.burstLeft = wd.modes.includes('auto') ? 1 + Math.floor(Math.random() * sk.burst * (d < 25 ? 1.5 : .6)) : 1; a.ai.fireCd = .25 + Math.random() * .5 + (d > 60 ? .5 : 0); return; }
  a.ai.burstLeft--;
  const err = (sk.min + (sk.err - sk.min) * a.ai.errK) * (1 + d / 120) * (T.moving > 3 ? 1.5 : 1) * (R.night ? 1.3 : 1);
  // aim point: mostly thorax, sometimes head
  const aimY = T.pos.y + (T.crouchK > .5 ? .9 : (Math.random() < (a.fac === 'pmc' || a.fac === 'raider' ? .2 : .08) ? 1.62 : 1.25));
  const eye = { x: a.pos.x, y: a.pos.y + 1.45 * (a.size || 1) * (1 - a.crouchK * .35), z: a.pos.z };
  const dx = T.pos.x - eye.x, dy = aimY - eye.y, dz = T.pos.z - eye.z; const L = Math.hypot(dx, dy, dz);
  const e = err * Math.PI / 180;
  let dir = [dx / L + (Math.random() - .5) * e * 2, dy / L + (Math.random() - .5) * e * 1.6 + (L > 50 ? (L / 900) * .5 : 0), dz / L + (Math.random() - .5) * e * 2];
  const dl = Math.hypot(...dir); dir = dir.map(v => v / dl);
  G.fireRound(R, a, w, eye, dir, true);
  a.ai.fireCd = 60 / wd.rpm * (wd.modes.includes('auto') ? 1 : 1.6 + Math.random()) * (wd.bolt || wd.pump ? 1.6 : 1);
}
G.newAI = (R, kind, x, z, zone, eq, id) => {
  const r = Math.random; const a = G.newActor(R, { id: id || ('ai' + (R.aiSeq++)), fac: kind, name: G.aiName(kind), eq: eq || G.genLoadout(kind), look: kind === 'pmc' ? G.pick(['BARK', 'ROOT']) : kind });
  a.pos.set(x, 0, z); a.yaw = r() * 6.28; a.team = kind === 'pmc' ? 'bot' + a.id : kind;
  const sk = G.AI_SKILL[kind]; G.PARTS.forEach(k => { a.health.p[k].hp = a.health.p[k].max = Math.round(G.PART_MAX[k] * sk.hp); });
  a.ai = { st: 'patrol', zone: zone || { x, z, r: 15 }, think: Math.random(), fireCd: 0, reload: 0, idle: Math.random() * 4, voiceCd: 5 + Math.random() * 10, doorCd: 0, strafeT: 0, burstLeft: 0, errK: 1, heals: kind === 'sapling' ? 1 : 2, ammo: null };
  a.weapon = a.eq.primary || a.eq.holster; a.ai.ammo = a.weapon ? (a.weapon.ch || (a.weapon.mag && a.weapon.mag.rounds[0]) || (a.weapon.rounds && a.weapon.rounds[0])) : null;
  return a;
};
// shared actor constructor (player, AI, remote)
G.newActor = (R, o) => {
  const a = Object.assign({ pos: V3(), vel: V3(), yaw: 0, pitch: 0, alive: true, crouchK: 0, leanO: 0, health: G.newHealth(), stepT: 1, size: 1, moving: 0 }, o);
  a.size = (G.LOOKS[o.look] || G.LOOKS.sapling).size;
  if (R.scene && !o.noModel) { a.model = G.treeModel(o.look || o.fac, a.eq); R.scene.add(a.model.root); G.modelGun(a.model, a.eq.primary || a.eq.holster); }
  R.actors.push(a); return a;
};
G.poseModel = (a, dt, t) => {
  const M = a.model; if (!M) return;
  M.root.position.copy(a.pos); M.root.rotation.y = a.yaw;
  if (!a.alive) { // timber!
    M.dead = true;
    a.deadT = (a.deadT || 0) + dt; const k = Math.min(1, a.deadT * a.deadT * 3); M.body.rotation.x = k * 1.52 * (a.fallDir || 1);
    if (M.gun) { M.gun.position.y = Math.max(.08, M.gun.position.y - dt * 3); M.gun.rotation.z = Math.min(1.5, M.gun.rotation.z + dt * 4); }
    return;
  }
  const mv = Math.min(1, a.moving / 3);
  // the whole tree waddles and sways as it moves; squats down when crouched
  M.body.position.y = Math.abs(Math.sin(t * (a.moving > 3.5 ? 10 : 6.5) + a.pos.x)) * .07 * mv - a.crouchK * .45;
  M.body.rotation.z = Math.sin(t * (a.moving > 3.5 ? 5 : 3.25) + a.pos.x) * .07 * mv - (a.leanO || 0) * .6;
  M.body.rotation.x = -mv * .06;
  M.body.scale.y = 1 - a.crouchK * .25;
  M.crown.rotation.y = Math.sin(t * .8 + a.pos.z) * .15; M.crown.rotation.z = Math.sin(t * 1.3 + a.pos.x) * .04;
  if (M.gun) { M.gun.position.y = 1.3 - a.crouchK * .5 + Math.sin(t * 2.2 + a.pos.z) * .03; M.gun.position.x = .42 + (a.leanO || 0) * .6; M.gun.rotation.x = a.pitch; }
};
})();
