'use strict';
/* GARDEN TIME — 3D models (crabs, plants, fruits, pets, buildings, boss) */
const MATS = {};
function mat(c, o) {
  const key = c + (o ? JSON.stringify(o) : '');
  if (MATS[key]) return MATS[key];
  const m = new THREE.MeshLambertMaterial(Object.assign({ color: new THREE.Color(c) }, o || {}));
  MATS[key] = m; return m;
}
const GEO = {};
function geo(key, f) { return GEO[key] || (GEO[key] = f()); }
const SPH = () => geo('sph', () => new THREE.SphereGeometry(1, 14, 10));
const SPHL = () => geo('sphl', () => new THREE.SphereGeometry(1, 8, 6));
const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 10));
const CONE = () => geo('cone', () => new THREE.ConeGeometry(1, 1, 10));
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const TOR = () => geo('tor', () => new THREE.TorusGeometry(1, 0.3, 8, 16));

function mesh(g, m, x, y, z, sx, sy, sz) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x || 0, y || 0, z || 0);
  if (sx != null) o.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz);
  o.castShadow = true;
  return o;
}
function sph(c, x, y, z, sx, sy, sz, o) { return mesh(SPH(), mat(c, o), x, y, z, sx, sy, sz); }
function cyl(c, x, y, z, r, h, o) { return mesh(CYL(), mat(c, o), x, y, z, r, h, r); }
function cone(c, x, y, z, r, h, o) { return mesh(CONE(), mat(c, o), x, y, z, r, h, r); }
function box(c, x, y, z, sx, sy, sz, o) { return mesh(BOX(), mat(c, o), x, y, z, sx, sy, sz); }
function RX(o, a) { o.rotation.x = a; return o; }
function shade(c, k) { const col = new THREE.Color(c); col.multiplyScalar(k); col.r = Math.min(1, col.r); col.g = Math.min(1, col.g); col.b = Math.min(1, col.b); return '#' + col.getHexString(); }

/* ---------- text sprites ---------- */
function textSprite(text, color, bg, size) {
  const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
  const fs = 44; ctx.font = 'bold ' + fs + 'px Fredoka, Arial Rounded MT Bold, Arial, sans-serif';
  const w = Math.ceil(ctx.measureText(text).width) + 30; cv.width = w; cv.height = 64;
  ctx.font = 'bold ' + fs + 'px Fredoka, Arial Rounded MT Bold, Arial, sans-serif';
  if (bg) { ctx.fillStyle = bg; roundRect(ctx, 0, 4, w, 56, 18); ctx.fill(); }
  ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeText(text, w / 2, 33); ctx.fillStyle = color || '#fff'; ctx.fillText(text, w / 2, 33);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const s = size || 0.5; sp.scale.set(s * w / 64, s, 1); sp.renderOrder = 10;
  return sp;
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function signBoard(text, bg, fg, w) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const ctx = cv.getContext('2d');
  ctx.fillStyle = bg; roundRect(ctx, 4, 4, 504, 120, 26); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
  ctx.font = 'bold 64px Fredoka, Arial Rounded MT Bold, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.strokeText(text, 256, 68); ctx.fillStyle = fg || '#fff'; ctx.fillText(text, 256, 68);
  const tex = new THREE.CanvasTexture(cv);
  const pg = new THREE.PlaneGeometry(w || 4, (w || 4) / 4), mm = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const m = new THREE.Group(); m.add(new THREE.Mesh(pg, mm)); const back = new THREE.Mesh(pg, mm); back.rotation.y = Math.PI; back.position.z = -0.01; m.add(back);
  return m;
}

/* ---------- CRAB ---------- */
function makeCrab(color, scale) {
  const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
  const c = color, dk = shade(color, 0.72), lt = shade(color, 1.18);
  body.add(sph(c, 0, 0.55, 0, 0.62, 0.36, 0.5));
  body.add(sph(dk, 0, 0.66, -0.05, 0.5, 0.24, 0.38));
  for (let i = -2; i <= 2; i++) body.add(sph(lt, i * 0.17, 0.82, 0.05 - Math.abs(i) * 0.03, 0.07, 0.05, 0.07)); // shell bumps
  // eyes on stalks
  const eyes = [];
  [-0.17, 0.17].forEach(x => {
    const st = new THREE.Group(); st.position.set(x, 0.75, 0.32);
    st.add(cyl(c, 0, 0.13, 0, 0.04, 0.26));
    st.add(sph('#ffffff', 0, 0.3, 0, 0.11));
    const pu = sph('#111', 0, 0.31, 0.08, 0.055); st.add(pu);
    body.add(st); eyes.push(st);
  });
  // mouth
  body.add(box('#3a1010', 0, 0.5, 0.48, 0.18, 0.03, 0.03));
  // legs
  const legs = [];
  [-1, 1].forEach(s => {
    for (let i = 0; i < 3; i++) {
      const lg = new THREE.Group(); lg.position.set(s * 0.5, 0.5, -0.22 + i * 0.2);
      const up = cyl(c, s * 0.18, 0.05, 0, 0.045, 0.4); up.rotation.z = s * 1.1; lg.add(up);
      const lo = cyl(dk, s * 0.38, -0.18, 0, 0.035, 0.42); lo.rotation.z = -s * 0.35; lg.add(lo);
      lg.userData = { s, i }; body.add(lg); legs.push(lg);
    }
  });
  // claws
  const claws = [];
  [-1, 1].forEach(s => {
    const cl = new THREE.Group(); cl.position.set(s * 0.48, 0.6, 0.32);
    const arm = cyl(c, s * 0.12, 0.05, 0.12, 0.06, 0.34); arm.rotation.x = 1.1; arm.rotation.z = s * 0.4; cl.add(arm);
    const pin = new THREE.Group(); pin.position.set(s * 0.2, 0.12, 0.34);
    pin.add(sph(lt, 0, 0, 0, 0.17, 0.13, 0.2));
    const top = sph(lt, 0, 0.06, 0.18, 0.08, 0.05, 0.16); pin.add(top);
    const bot = sph(dk, 0, -0.05, 0.16, 0.07, 0.04, 0.13); pin.add(bot);
    cl.add(pin); cl.userData = { s, top, bot }; body.add(cl); claws.push(cl);
  });
  g.userData = { body, legs, claws, eyes, t: Math.random() * 10 };
  if (scale) g.scale.setScalar(scale);
  return g;
}
function animCrab(g, speed, dt, pinch) {
  const u = g.userData; u.t += dt * (4 + speed * 9);
  const moving = speed > 0.05;
  u.legs.forEach(l => { const ph = u.t + l.userData.i * 2.1 + (l.userData.s > 0 ? Math.PI : 0); l.rotation.z = moving ? Math.sin(ph) * 0.35 : 0; l.rotation.x = moving ? Math.cos(ph) * 0.25 : 0; });
  u.body.position.y = moving ? Math.abs(Math.sin(u.t * 2)) * 0.05 : Math.sin(u.t * 0.4) * 0.01;
  u.claws.forEach((cl, i) => {
    const sn = pinch > 0 ? Math.abs(Math.sin(pinch * 25 + i)) : (0.5 + 0.5 * Math.sin(u.t * 0.7 + i * 2)) * 0.4;
    cl.userData.top.rotation.x = -sn * 0.6; cl.userData.bot.rotation.x = sn * 0.4;
    cl.rotation.x = pinch > 0 ? -0.5 : Math.sin(u.t * 0.5 + i) * 0.08;
  });
  u.eyes.forEach((e, i) => { e.rotation.z = Math.sin(u.t * 0.6 + i) * 0.12; });
}
function setCrabColor(g, color) {
  // rebuild materials by color
  const old = g.userData; g.traverse(o => { if (o.isMesh && o.material && !o.userData.keep) { /* keep it simple: recolor via HSL shift */ } });
  return old;
}

/* ---------- FRUITS ---------- */
function makeFruit(shape, color, extra) {
  const g = new THREE.Group(); const c = color; const dk = shade(c, 0.7);
  const leaf = '#3faa3f';
  switch (shape) {
    case 'carrot': { const m = cone(c, 0, -0.25, 0, 0.14, 0.55); m.rotation.x = Math.PI; g.add(m); g.add(cone(leaf, 0, 0.12, 0, 0.08, 0.2)); break; }
    case 'onion': { g.add(sph(c, 0, 0, 0, 0.28, 0.25, 0.28)); g.add(cone(c, 0, 0.27, 0, 0.08, 0.18)); g.add(cone(leaf, 0, 0.42, 0, 0.04, 0.25)); break; }
    case 'berry': { const m = cone(c, 0, 0, 0, 0.14, 0.26); m.rotation.x = Math.PI; g.add(m); g.add(cone(leaf, 0, 0.14, 0, 0.1, 0.05)); break; }
    case 'pumpkin': { for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(sph(i % 2 ? c : dk, Math.cos(a) * 0.14, 0, Math.sin(a) * 0.14, 0.2, 0.26, 0.2)); } g.add(cyl('#5a3a1a', 0, 0.28, 0, 0.04, 0.14)); break; }
    case 'melon': { g.add(sph(c, 0, 0, 0, 0.42, 0.34, 0.34)); for (let i = 0; i < 4; i++) { const s = sph(extra || dk, 0, 0, 0, 0.425, 0.345, 0.07); s.rotation.x = i * 0.8; g.add(s); } break; }
    case 'apple': case 'caramel': { g.add(sph(c, 0, 0, 0, 0.18, 0.17, 0.18)); g.add(cyl('#5a3a1a', 0, 0.18, 0, 0.015, 0.08)); if (shape === 'caramel') { g.add(sph('#e8202a', 0, -0.06, 0, 0.17, 0.12, 0.17)); g.add(cyl('#d9c09a', 0, 0.28, 0, 0.015, 0.3)); } else g.add(sph(leaf, 0.05, 0.2, 0, 0.06, 0.02, 0.04)); break; }
    case 'egg': g.add(sph(c, 0, 0, 0, 0.16, 0.22, 0.16)); break;
    case 'banana': { for (let i = 0; i < 3; i++) { const b = cyl(c, (i - 1) * 0.08, -0.15, 0, 0.05, 0.36); b.rotation.z = (i - 1) * 0.3; b.rotation.x = 0.3; g.add(b); } g.add(cyl('#6a5a2a', 0, 0.05, 0, 0.04, 0.1)); break; }
    case 'pepper': { g.add(sph(c, 0, 0, 0, 0.18, 0.22, 0.18)); g.add(cyl(leaf, 0, 0.22, 0, 0.03, 0.1)); break; }
    case 'grapes': { for (let i = 0; i < 9; i++) { const lv = Math.floor(i / 3); g.add(sph(c, (i % 3 - 1) * 0.09 * (1 - lv * 0.2), -lv * 0.1, (i % 2) * 0.05, 0.07)); } break; }
    case 'pineapple': { g.add(sph(c, 0, 0, 0, 0.2, 0.3, 0.2)); for (let i = 0; i < 5; i++) { const l = cone(leaf, Math.cos(i) * 0.05, 0.38, Math.sin(i) * 0.05, 0.05, 0.25); l.rotation.z = Math.cos(i * 1.3) * 0.4; g.add(l); } break; }
    case 'claw': { g.add(sph(c, 0, 0, 0, 0.16, 0.12, 0.2)); g.add(sph(c, 0, 0.06, 0.18, 0.07, 0.05, 0.14)); g.add(sph(shade(c, .8), 0, -0.05, 0.16, 0.06, 0.04, 0.11)); break; }
    case 'pea': g.add(sph(c, 0, 0, 0, 0.13)); break;
    case 'dragon': { g.add(sph(c, 0, 0, 0, 0.2, 0.25, 0.2)); for (let i = 0; i < 6; i++) { const s = cone('#9fdf4f', Math.cos(i) * 0.17, Math.sin(i * 2) * 0.1, Math.sin(i) * 0.17, 0.05, 0.12); s.rotation.z = -Math.cos(i); s.rotation.x = Math.sin(i); g.add(s); } break; }
    case 'rose': { for (let i = 0; i < 7; i++) { const a = i * 2.4; g.add(sph(i < 2 ? dk : c, Math.cos(a) * 0.06 * (i / 3), i * 0.012, Math.sin(a) * 0.06 * (i / 3), 0.13 - i * 0.008, 0.1, 0.13 - i * 0.008)); } break; }
    case 'star': { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const s = cone(c, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0, 0.07, 0.2); s.rotation.z = a - Math.PI / 2; g.add(s); } g.add(sph(c, 0, 0, 0, 0.1, 0.1, 0.06)); break; }
    case 'cherry': { g.add(sph(c, -0.07, 0, 0, 0.09)); g.add(sph(c, 0.08, -0.02, 0, 0.09)); const s1 = cyl('#3a6a2a', -0.03, 0.12, 0, 0.012, 0.25); s1.rotation.z = -0.3; g.add(s1); const s2 = cyl('#3a6a2a', 0.04, 0.11, 0, 0.012, 0.25); s2.rotation.z = 0.3; g.add(s2); break; }
    case 'flowerbud': { g.add(sph(c, 0, 0, 0, 0.12, 0.15, 0.12)); g.add(sph('#fff07a', 0, 0.12, 0, 0.05)); break; }
    case 'shroom': { g.add(cyl('#f2e6d0', 0, -0.08, 0, 0.06, 0.16)); g.add(sph(c, 0, 0.04, 0, 0.18, 0.11, 0.18)); g.add(sph('#ffffff', 0.08, 0.11, 0.05, 0.03)); g.add(sph('#ffffff', -0.07, 0.1, -0.06, 0.035)); break; }
    case 'shoot': { g.add(cone(c, 0, 0, 0, 0.09, 0.4)); break; }
    case 'trap': { g.add(sph('#7fdf4f', 0, 0, 0, 0.15, 0.08, 0.17)); g.add(sph(c, 0, 0.02, 0, 0.12, 0.05, 0.14)); break; }
    case 'seedhead': { g.add(sph('#5a3a1a', 0, 0, 0, 0.17, 0.17, 0.06)); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28; g.add(sph(c, Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0, 0.07, 0.07, 0.025)); } break; }
    case 'flame': { g.add(sph(c, 0, 0, 0, 0.14, 0.14, 0.14, { emissive: new THREE.Color(c), emissiveIntensity: 0.6 })); g.add(cone('#ffd21f', 0, 0.16, 0, 0.09, 0.25, { emissive: new THREE.Color('#ffaa00'), emissiveIntensity: 0.8 })); break; }
    case 'bean': { const b = sph(c, 0, 0, 0, 0.09, 0.26, 0.09); b.rotation.z = 0.4; g.add(b); break; }
    case 'soul': { g.add(sph(c, 0, 0, 0, 0.16, 0.2, 0.16, { emissive: new THREE.Color(c), emissiveIntensity: 0.9, transparent: true, opacity: 0.75 })); g.add(sph('#103030', -0.05, 0.04, 0.13, 0.025)); g.add(sph('#103030', 0.05, 0.04, 0.13, 0.025)); break; }
    case 'head': { g.add(sph(c, 0, 0, 0, 0.2, 0.24, 0.2)); g.add(sph('#ffffff', -0.07, 0.04, 0.16, 0.045)); g.add(sph('#ffffff', 0.07, 0.04, 0.16, 0.045)); g.add(sph('#111', -0.07, 0.04, 0.2, 0.02)); g.add(sph('#111', 0.07, 0.04, 0.2, 0.02)); g.add(box('#5a2a2a', 0, -0.1, 0.18, 0.1, 0.025, 0.02)); g.add(sph('#4a3020', 0, 0.16, -0.02, 0.19, 0.1, 0.19)); break; }
    case 'pillow': { g.add(sph(c, 0, 0, 0, 0.3, 0.1, 0.22)); g.add(sph('#ffffff', 0, 0.02, 0, 0.26, 0.09, 0.18)); break; }
    case 'cabinet': { g.add(box(c, 0, 0, 0, 0.32, 0.4, 0.22)); g.add(box(shade(c, .8), -0.07, 0, 0.112, 0.13, 0.34, 0.01)); g.add(box(shade(c, .8), 0.07, 0, 0.112, 0.13, 0.34, 0.01)); g.add(sph('#ffd23d', -0.02, 0, 0.13, 0.02)); g.add(sph('#ffd23d', 0.02, 0, 0.13, 0.02)); break; }
    case 'lantern': { g.add(box('#2a2a2a', 0, 0.16, 0, 0.18, 0.04, 0.18)); g.add(box(c, 0, 0, 0, 0.16, 0.26, 0.16, { emissive: new THREE.Color(c), emissiveIntensity: 1 })); g.add(box('#2a2a2a', 0, -0.15, 0, 0.18, 0.04, 0.18)); g.add(TOR_MESH('#2a2a2a', 0, 0.23, 0, 0.05)); break; }
    case 'chip': { const ch = sph(c, 0, 0, 0, 0.2, 0.03, 0.15); ch.rotation.z = 0.3; g.add(ch); g.add(sph('#7fbf5f', 0.04, 0.025, 0.02, 0.02, 0.01, 0.02)); break; }
    case 'feather': { const f = sph(c, 0, 0, 0, 0.05, 0.28, 0.12); f.rotation.z = 0.3; g.add(f); g.add(cyl('#bbbbbb', 0.05, -0.25, 0, 0.01, 0.15)); break; }
    case 'corn': { g.add(cyl(c, 0, 0, 0, 0.09, 0.4)); g.add(cone(c, 0, 0.25, 0, 0.09, 0.12)); const h = cone('#9fd05a', 0.06, -0.05, 0, 0.07, 0.45); h.rotation.z = 0.2; g.add(h); break; }
    case 'grain': { for (let i = 0; i < 5; i++) g.add(sph(c, 0, i * 0.06 - 0.12, (i % 2) * 0.03, 0.04, 0.05, 0.04)); g.add(cyl('#c8a040', 0, -0.25, 0, 0.012, 0.25)); break; }
    case 'squash': { g.add(sph(c, 0, 0, 0, 0.2, 0.3, 0.2)); g.add(sph(c, 0, -0.18, 0, 0.26, 0.2, 0.26)); g.add(cyl('#5a3a1a', 0, 0.3, 0, 0.03, 0.1)); break; }
    case 'honey': { for (let i = 0; i < 7; i++) { const a = i / 6 * 6.28; const r = i ? 0.1 : 0; const h = mesh(geo('hex', () => new THREE.CylinderGeometry(1, 1, 1, 6)), mat(c, { emissive: new THREE.Color('#ffaa00'), emissiveIntensity: .25 }), Math.cos(a) * r, Math.sin(a) * r, 0, 0.055, 0.06, 0.055); h.rotation.x = Math.PI / 2; g.add(h); } break; }
    case 'nectar': { g.add(sph(c, 0, 0, 0, 0.12, 0.18, 0.12, { transparent: true, opacity: 0.8 })); break; }
    case 'pie': { g.add(cyl(c, 0, 0, 0, 0.22, 0.08)); g.add(cyl('#c87a2a', 0, 0.045, 0, 0.18, 0.01)); g.add(sph('#ffffff', 0, 0.07, 0, 0.06, 0.03, 0.06)); break; }
    case 'syrup': { g.add(cyl(c, 0, 0, 0, 0.1, 0.24, { transparent: true, opacity: 0.85 })); g.add(cyl('#dddddd', 0, 0.15, 0, 0.04, 0.08)); g.add(TOR_MESH('#dddddd', 0.1, 0.03, 0, 0.05)); break; }
    case 'drumstick': { const m = sph(c, 0, 0, 0, 0.13, 0.2, 0.13); g.add(m); g.add(cyl('#f4ead8', 0, 0.22, 0, 0.03, 0.16)); g.add(sph('#f4ead8', 0.03, 0.31, 0, 0.04)); g.add(sph('#f4ead8', -0.03, 0.31, 0, 0.04)); break; }
    case 'strawhat': { g.add(cyl(c, 0, 0, 0, 0.25, 0.03)); g.add(cyl(c, 0, 0.08, 0, 0.13, 0.15)); g.add(cyl('#c0301f', 0, 0.04, 0, 0.135, 0.04)); break; }
    case 'balloon': { g.add(sph(c, 0, 0.1, 0, 0.18, 0.22, 0.18, { emissive: new THREE.Color(c), emissiveIntensity: .15 })); g.add(cone(c, 0, -0.14, 0, 0.04, 0.06)); g.add(cyl('#eeeeee', 0, -0.35, 0, 0.006, 0.4)); break; }
    case 'taco': { const t = mesh(geo('taco', () => new THREE.CylinderGeometry(1, 1, 1, 14, 1, true, 0, Math.PI)), mat(c, { side: THREE.DoubleSide }), 0, 0, 0, 0.18, 0.32, 0.18); t.rotation.z = Math.PI / 2; g.add(t); g.add(sph('#4fbf3f', 0, 0.08, 0, 0.14, 0.05, 0.08)); g.add(sph('#8a4a2a', 0, 0.04, 0, 0.13, 0.06, 0.07)); g.add(sph('#e8202a', 0.05, 0.1, 0, 0.03)); break; }
    case 'trashbag': { g.add(sph(c, 0, 0, 0, 0.22, 0.26, 0.22)); g.add(cone(c, 0, 0.3, 0, 0.06, 0.12)); g.add(sph('#ffcc00', 0, 0.24, 0, 0.05, 0.02, 0.05)); break; }
    case 'glitchpea': { g.add(sph(c, 0, 0, 0, 0.17, 0.17, 0.17, { emissive: new THREE.Color('#3fff3f'), emissiveIntensity: .4, transparent: true, opacity: .85 })); g.add(RX(cyl(c, 0, 0, 0.18, 0.07, 0.12), Math.PI / 2)); g.add(sph('#000', -0.07, 0.07, 0.13, 0.03)); g.add(sph('#000', 0.07, 0.07, 0.13, 0.03)); g.userData.glitch = 1; break; }
    case 'tomato': default: g.add(sph(c, 0, 0, 0, 0.16, 0.15, 0.16)); if (shape === 'sphere') g.add(cone(leaf, 0, 0.15, 0, 0.06, 0.04)); break;
  }
  return g;
}
function TOR_MESH(c, x, y, z, s) { return mesh(TOR(), mat(c), x, y, z, s, s, s); }

/* ---------- PLANTS ----------
   returns group with userData.spots = array of Vector3 where fruits hang */
function makePlant(d) {
  const g = new THREE.Group(); const spots = []; const [c0, c1, c2] = d.c; const leaf = c0, dk = shade(c0, 0.75);
  const S = (x, y, z) => spots.push(new THREE.Vector3(x, y, z));
  switch (d.k) {
    case 'sprout': {
      g.add(cyl('#4a9a3a', 0, 0.35, 0, 0.05, 0.7));
      for (let i = 0; i < 4; i++) { const l = sph(leaf, Math.cos(i * 1.57) * 0.25, 0.55, Math.sin(i * 1.57) * 0.25, 0.25, 0.05, 0.12); l.rotation.y = -i * 1.57; g.add(l); }
      g.add(sph('#ffffff', 0, 0.8, 0, 0.12)); S(0.3, 0.75, 0); S(-0.25, 0.7, 0.2); S(0, 0.72, -0.3); break;
    }
    case 'crop': {
      const s = d.big ? 1.8 : 1;
      for (let i = 0; i < 6; i++) { const l = cone(leaf, Math.cos(i) * 0.08 * s, 0.35 * s, Math.sin(i) * 0.08 * s, 0.08 * s, 0.7 * s); l.rotation.z = Math.cos(i) * 0.4; l.rotation.x = Math.sin(i) * 0.4; g.add(l); }
      S(0, 0.08 * s, 0); g.userData.fruitScale = s * 1.2; break;
    }
    case 'bush': {
      const n = 5; for (let i = 0; i < n; i++) { const a = i / n * 6.28; g.add(sph(i % 2 ? leaf : dk, Math.cos(a) * 0.35, 0.55 + (i % 2) * 0.1, Math.sin(a) * 0.35, 0.45)); }
      g.add(sph(leaf, 0, 0.85, 0, 0.45));
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.3; S(Math.cos(a) * 0.72, 0.5 + (i % 3) * 0.2, Math.sin(a) * 0.72); }
      break;
    }
    case 'ground': {
      for (let i = 0; i < 5; i++) { const a = i * 1.3; const v = cyl(leaf, Math.cos(a) * 0.5, 0.06, Math.sin(a) * 0.5, 0.05, 1.1); v.rotation.z = Math.PI / 2; v.rotation.y = -a; g.add(v); g.add(sph(dk, Math.cos(a) * 0.8, 0.15, Math.sin(a) * 0.8, 0.25, 0.08, 0.25)); }
      S(0.4, 0.3, 0.3); S(-0.5, 0.3, -0.2); S(0.1, 0.3, -0.6); break;
    }
    case 'tree': case 'palm': {
      const trunk = d.dark ? '#3a2a20' : '#7a4f2a';
      if (d.k === 'palm') {
        for (let i = 0; i < 6; i++) g.add(cyl(i % 2 ? trunk : shade(trunk, 1.15), Math.sin(i * 0.5) * 0.06, 0.3 + i * 0.4, 0, 0.18 - i * 0.012, 0.42));
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const f = sph(leaf, Math.cos(a) * 0.8, 2.55, Math.sin(a) * 0.8, 0.9, 0.06, 0.25); f.rotation.y = -a; f.rotation.z = 0.35 * Math.cos(a); f.rotation.x = 0.35 * Math.sin(a); g.add(f); }
        for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; S(Math.cos(a) * 0.3, 2.25, Math.sin(a) * 0.3); }
      } else {
        g.add(cyl(trunk, 0, 0.9, 0, 0.2, 1.8));
        const b1 = cyl(trunk, 0.3, 1.6, 0, 0.08, 0.7); b1.rotation.z = -0.7; g.add(b1);
        const cc = [[0, 2.3, 0, 1.0], [0.7, 2.0, 0.2, 0.7], [-0.6, 2.05, -0.2, 0.75], [0.1, 2.0, 0.65, 0.7], [-0.1, 2.1, -0.7, 0.7], [0, 2.9, 0, 0.7]];
        cc.forEach((q, i) => g.add(sph(i % 2 ? leaf : dk, q[0], q[1], q[2], q[3])));
        if (d.id === 'cherry') cc.forEach(q => g.add(sph('#ffd6ec', q[0] * 1.2, q[1] + 0.3, q[2] * 1.2, 0.18)));
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; S(Math.cos(a) * 1.05, 1.75 + (i % 3) * 0.35, Math.sin(a) * 1.05); }
      }
      break;
    }
    case 'vine': {
      [-0.5, 0.5].forEach(x => g.add(cyl('#8a6a3a', x, 1.0, 0, 0.05, 2.0)));
      g.add(box('#8a6a3a', 0, 2.0, 0, 1.2, 0.08, 0.08)); g.add(box('#8a6a3a', 0, 1.2, 0, 1.1, 0.05, 0.05));
      for (let i = 0; i < 9; i++) g.add(sph(i % 2 ? leaf : dk, -0.55 + (i % 3) * 0.55, 0.5 + Math.floor(i / 3) * 0.6, 0.05, 0.3, 0.26, 0.15));
      for (let i = 0; i < 5; i++) S(-0.45 + i * 0.22, 1.75 - (i % 2) * 0.55, 0.22);
      break;
    }
    case 'pineapple': {
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; const l = cone(leaf, Math.cos(a) * 0.25, 0.3, Math.sin(a) * 0.25, 0.08, 0.8); l.rotation.z = Math.cos(a) * 0.9; l.rotation.x = -Math.sin(a) * 0.9; g.add(l); }
      S(0, 0.45, 0); g.userData.fruitScale = 1.6; break;
    }
    case 'crabgrass': {
      for (let i = 0; i < 14; i++) { const a = i * 2.3; const r = 0.1 + (i % 4) * 0.12; const b = cone(leaf, Math.cos(a) * r, 0.35, Math.sin(a) * r, 0.05, 0.7 + (i % 3) * 0.2); b.rotation.z = Math.cos(a) * 0.3; g.add(b); }
      S(0.3, 0.75, 0); S(-0.3, 0.7, 0.1); S(0, 0.8, -0.3); S(0.1, 0.85, 0.3); break;
    }
    case 'peashooter': {
      g.add(cyl('#3f9f3f', 0, 0.45, 0, 0.07, 0.9));
      for (let i = 0; i < 3; i++) { const l = sph(leaf, Math.cos(i * 2.1) * 0.3, 0.05, Math.sin(i * 2.1) * 0.3, 0.3, 0.04, 0.15); l.rotation.y = -i * 2.1; g.add(l); }
      // original design: an open pea pod turret with a leafy hood
      const head = new THREE.Group(); head.position.y = 1.0;
      head.add(sph('#2f8f2f', 0, 0, 0, 0.42, 0.22, 0.28));
      head.add(sph(c1, -0.18, 0.08, 0.05, 0.13)); head.add(sph(c1, 0.0, 0.1, 0.07, 0.14)); head.add(sph(c1, 0.18, 0.08, 0.05, 0.13));
      const barrel = cyl('#2f8f2f', 0, 0, 0.35, 0.12, 0.3); barrel.rotation.x = Math.PI / 2; head.add(barrel);
      head.add(cone('#4fbf3f', 0, 0.25, -0.1, 0.25, 0.3));
      g.add(head); g.userData.head = head;
      S(-0.35, 0.6, 0.2); S(0.35, 0.55, -0.1); break;
    }
    case 'cactus': {
      const cc = d.id === 'honeycactus' ? '#c8a020' : leaf;
      g.add(cyl(cc, 0, 0.7, 0, 0.25, 1.4)); g.add(sph(cc, 0, 1.4, 0, 0.25));
      const a1 = cyl(cc, 0.42, 0.85, 0, 0.13, 0.55); g.add(a1); g.add(sph(cc, 0.42, 1.12, 0, 0.13)); const c1b = cyl(cc, 0.25, 0.6, 0, 0.1, 0.36); c1b.rotation.z = Math.PI / 2; g.add(c1b);
      const a2 = cyl(cc, -0.42, 0.65, 0, 0.12, 0.45); g.add(a2); g.add(sph(cc, -0.42, 0.88, 0, 0.12)); const c2b = cyl(cc, -0.25, 0.45, 0, 0.09, 0.36); c2b.rotation.z = Math.PI / 2; g.add(c2b);
      for (let i = 0; i < 10; i++) g.add(box('#f4f4d0', Math.cos(i) * 0.26, 0.3 + i * 0.11, Math.sin(i) * 0.26, 0.02, 0.02, 0.1));
      S(0, 1.68, 0); S(0.42, 1.3, 0); S(-0.42, 1.05, 0); S(0.2, 1.0, 0.25); break;
    }
    case 'rose': {
      for (let i = 0; i < 3; i++) { const s = cyl('#2f6f2f', (i - 1) * 0.25, 0.55, 0, 0.035, 1.1); s.rotation.z = (i - 1) * 0.2; g.add(s); g.add(sph(leaf, (i - 1) * 0.3, 0.6, 0.1, 0.12, 0.03, 0.07)); g.add(cone('#3a7a2a', (i - 1) * 0.2, 0.4, 0.04, 0.02, 0.06)); }
      S(-0.35, 1.15, 0); S(0, 1.2, 0); S(0.35, 1.15, 0); g.userData.fruitScale = 1.4; break;
    }
    case 'mushroom': {
      for (let i = 0; i < 3; i++) { const a = i * 2.1; g.add(cyl('#f2e6d0', Math.cos(a) * 0.35, 0.3 + i * 0.1, Math.sin(a) * 0.35, 0.08, 0.6 + i * 0.2)); g.add(sph(c1, Math.cos(a) * 0.35, 0.65 + i * 0.2, Math.sin(a) * 0.35, 0.35 - i * 0.05, 0.2, 0.35 - i * 0.05)); }
      S(0, 0.2, 0.35); S(0.3, 0.2, -0.3); S(-0.4, 0.2, 0); break;
    }
    case 'bamboo': {
      for (let i = 0; i < 5; i++) { const x = Math.cos(i * 1.7) * 0.3, z = Math.sin(i * 1.7) * 0.3, h = 2 + (i % 3) * 0.6; for (let j = 0; j < 5; j++) { g.add(cyl(j % 2 ? leaf : '#9fdf5a', x, j * h / 5 + h / 10, z, 0.08, h / 5 - 0.02)); } g.add(sph('#4faf2f', x + 0.15, h, z, 0.2, 0.04, 0.08)); }
      S(0.4, 0.15, 0.2); S(-0.4, 0.15, -0.1); S(0, 0.15, -0.45); break;
    }
    case 'venus': {
      g.add(cyl('#3f9f3f', 0, 0.5, 0, 0.06, 1.0));
      for (let i = 0; i < 4; i++) { const l = sph(leaf, Math.cos(i * 1.6) * 0.35, 0.06, Math.sin(i * 1.6) * 0.35, 0.35, 0.04, 0.15); l.rotation.y = -i * 1.6; g.add(l); }
      const head = new THREE.Group(); head.position.y = 1.05;
      const top = new THREE.Group(), bot = new THREE.Group();
      top.add(sph(leaf, 0, 0.05, 0.2, 0.36, 0.12, 0.3)); top.add(sph(c1, 0, 0.0, 0.2, 0.32, 0.06, 0.26));
      bot.add(sph(leaf, 0, -0.05, 0.2, 0.36, 0.12, 0.3)); bot.add(sph(c1, 0, 0.0, 0.2, 0.32, 0.06, 0.26));
      for (let i = 0; i < 7; i++) { const tx = -0.3 + i * 0.1; top.add(RX(cone('#ffffff', tx, -0.08, 0.42, 0.025, 0.1), Math.PI)); bot.add(cone('#ffffff', tx, 0.08, 0.42, 0.025, 0.1)); }
      head.add(top); head.add(bot); g.add(head); g.userData.head = head; g.userData.jaw = [top, bot];
      S(-0.4, 0.5, 0.1); S(0.4, 0.45, -0.1); break;
    }
    case 'sunflower': {
      g.add(cyl('#3f9f3f', 0, 1.1, 0, 0.07, 2.2));
      for (let i = 0; i < 4; i++) { const l = sph(leaf, (i % 2 ? 0.25 : -0.25), 0.6 + i * 0.35, 0, 0.3, 0.04, 0.15); g.add(l); }
      const head = new THREE.Group(); head.position.set(0, 2.3, 0.1); head.rotation.x = -0.3;
      head.add(sph('#5a3a1a', 0, 0, 0, 0.42, 0.42, 0.12));
      for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; const p = sph(c1, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0, 0.17, 0.08, 0.03); p.rotation.z = a; head.add(p); }
      g.add(head); g.userData.head = head;
      S(-0.35, 1.2, 0.15); S(0.35, 1.5, 0.15); S(0, 0.8, 0.3); break;
    }
    case 'flower': {
      g.add(cyl(dk, 0, 0.6, 0, 0.06, 1.2));
      for (let i = 0; i < 3; i++) { const l = sph(leaf, (i % 2 ? 0.2 : -0.2), 0.35 + i * 0.25, 0, 0.22, 0.04, 0.1); g.add(l); }
      const pc = d.id === 'turkeyblossom' ? ['#c0501f', '#e0a020', '#6a3a1a', '#d02f1f'] : ['#ff5a1f', '#ffaa1f', '#ff2f1f'];
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; const p = sph(pc[i % pc.length], Math.cos(a) * 0.25, 1.3, Math.sin(a) * 0.25, 0.18, 0.05, 0.1, d.id === 'burningbud' ? { emissive: new THREE.Color('#ff3f00'), emissiveIntensity: .5 } : null); p.rotation.y = -a; g.add(p); }
      g.add(sph(d.id === 'burningbud' ? '#ffd21f' : '#6a3a1a', 0, 1.33, 0, 0.13, 0.08, 0.13));
      S(0, 1.55, 0); S(-0.3, 0.9, 0.1); S(0.3, 0.7, 0.1); break;
    }
    case 'beanstalk': {
      for (let i = 0; i < 14; i++) { const a = i * 0.7; const s = cyl(i % 2 ? leaf : '#2faa2f', Math.cos(a) * 0.15, 0.2 + i * 0.28, Math.sin(a) * 0.15, 0.13 - i * 0.004, 0.32); s.rotation.z = Math.cos(a) * 0.2; g.add(s); if (i % 2) g.add(sph(c1, Math.cos(a) * 0.45, 0.3 + i * 0.28, Math.sin(a) * 0.45, 0.25, 0.04, 0.14)); }
      g.add(sph('#ffffff', 0, 4.2, 0, 0.5, 0.25, 0.5)); g.add(sph('#ffffff', 0.35, 4.25, 0.1, 0.35, 0.2, 0.35)); // cloud
      for (let i = 0; i < 5; i++) { const a = i * 1.4; S(Math.cos(a) * 0.4, 1 + i * 0.6, Math.sin(a) * 0.4); }
      break;
    }
    case 'soulstalk': {
      const gm = { emissive: new THREE.Color(c0), emissiveIntensity: .7, transparent: true, opacity: .8 };
      for (let i = 0; i < 10; i++) { const s = cyl(c0, Math.sin(i * 0.8) * 0.15, 0.15 + i * 0.3, 0, 0.09, 0.32, gm); g.add(s); }
      for (let i = 0; i < 5; i++) g.add(sph(c1, Math.cos(i * 1.3) * 0.4, 0.8 + i * 0.5, Math.sin(i * 1.3) * 0.4, 0.06, 0.06, 0.06, gm));
      for (let i = 0; i < 4; i++) { const a = i * 1.6; S(Math.cos(a) * 0.45, 1.2 + i * 0.5, Math.sin(a) * 0.45); }
      break;
    }
    case 'chipstack': {
      g.add(cyl(c0, 0, 0.9, 0, 0.42, 1.8)); g.add(cyl('#2f8f3f', 0, 1.82, 0, 0.44, 0.08)); g.add(cyl('#d0d0d0', 0, 0.03, 0, 0.43, 0.06));
      g.add(cyl('#ffffff', 0, 1.1, 0, 0.425, 0.5)); // label band (no logo)
      for (let i = 0; i < 6; i++) { const ch = sph(c1, 0, 1.95 + i * 0.07, 0, 0.36, 0.035, 0.3); ch.rotation.z = Math.sin(i) * 0.1; g.add(ch); }
      for (let i = 0; i < 6; i++) { const l = sph('#3faa3f', Math.cos(i) * 0.6, 0.06, Math.sin(i) * 0.6, 0.3, 0.04, 0.12); l.rotation.y = -i; g.add(l); }
      S(0.6, 1.4, 0); S(-0.6, 1.0, 0.2); S(0, 2.5, 0); S(0.3, 0.7, -0.6); break;
    }
    case 'crowplant': {
      g.add(cyl('#3f5f2f', 0, 0.5, 0, 0.06, 1.0));
      const head = new THREE.Group(); head.position.y = 1.15; head.add(sph('#222', 0, 0, 0, 0.25, 0.22, 0.28)); head.add(RX(cone('#e0a020', 0, -0.02, 0.32, 0.06, 0.18), Math.PI / 2));
      head.add(sph('#ffd21f', -0.1, 0.07, 0.2, 0.04)); head.add(sph('#ffd21f', 0.1, 0.07, 0.2, 0.04));
      for (let i = 0; i < 5; i++) { const f = sph('#222', 0, -0.25, 0, 0.06, 0.25, 0.12); f.rotation.z = (i - 2) * 0.5; f.position.set((i - 2) * 0.12, -0.2, -0.05); head.add(f); }
      g.add(head); S(-0.3, 0.7, 0.1); S(0.3, 0.6, 0.1); S(0, 0.8, -0.3); break;
    }
    case 'corn': case 'wheat': {
      const n = d.k === 'corn' ? 4 : 9;
      for (let i = 0; i < n; i++) { const a = i * 2.4, r = 0.15 + (i % 3) * 0.13; const h = d.k === 'corn' ? 2.0 : 1.2; g.add(cyl(leaf, Math.cos(a) * r, h / 2, Math.sin(a) * r, 0.04, h)); const l = sph(d.k === 'corn' ? '#5faf3f' : c1, Math.cos(a) * r, h * 0.55, Math.sin(a) * r, 0.04, 0.4, 0.08); l.rotation.z = 0.6; g.add(l); if (d.k === 'wheat') g.add(sph(c1, Math.cos(a) * r, h + 0.1, Math.sin(a) * r, 0.05, 0.16, 0.05)); }
      if (d.k === 'corn') { S(0.2, 1.1, 0.15); S(-0.2, 1.2, -0.1); S(0, 1.0, 0.3); S(0.1, 1.3, -0.3); }
      else { S(0.3, 1.0, 0); S(-0.3, 0.9, 0.1); S(0, 1.1, -0.3); }
      break;
    }
    case 'pitcher': {
      for (let i = 0; i < 3; i++) { const a = i * 2.1; const p = new THREE.Group(); p.position.set(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35);
        p.add(mesh(geo('pitch', () => new THREE.CylinderGeometry(1, 0.6, 1, 12, 1, true)), mat(c0, { side: THREE.DoubleSide }), 0, 0.5 + i * 0.1, 0, 0.18, 1.0 + i * 0.2, 0.18));
        p.add(TOR_MESH(c1, 0, 1.0 + i * 0.2, 0, 0.17)); const lid = sph(c1, 0.05, 1.18 + i * 0.2, -0.1, 0.18, 0.03, 0.15); lid.rotation.x = -0.5; p.add(lid);
        g.add(p); }
      g.userData.head = g.children[0];
      S(0, 0.4, 0.1); S(0.3, 0.3, -0.3); S(-0.35, 0.35, 0.1); break;
    }
    case 'scarecrow': {
      g.add(cyl('#7a4f2a', 0, 0.9, 0, 0.06, 1.8)); const arm = cyl('#7a4f2a', 0, 1.3, 0, 0.05, 1.4); arm.rotation.z = Math.PI / 2; g.add(arm);
      g.add(box('#3f6fbf', 0, 1.15, 0, 0.6, 0.6, 0.3)); g.add(sph('#e8c868', 0, 1.7, 0, 0.25)); g.add(cyl('#d9b44a', 0, 1.88, 0, 0.4, 0.04)); g.add(cyl('#d9b44a', 0, 2.0, 0, 0.18, 0.22));
      g.add(sph('#111', -0.08, 1.74, 0.22, 0.035)); g.add(sph('#111', 0.08, 1.74, 0.22, 0.035)); g.add(RX(cone('#ff8c1a', 0, 1.66, 0.28, 0.04, 0.12), Math.PI / 2));
      for (let i = 0; i < 6; i++) g.add(cone('#e8c868', -0.7 + (i % 2) * 1.4, 1.25, 0, 0.04, 0.2));
      S(-0.6, 1.0, 0.1); S(0.6, 1.0, 0.1); S(0, 0.5, 0.25); break;
    }
    case 'trashcan': {
      g.add(cyl(c0, 0, 0.5, 0, 0.4, 1.0)); for (let i = 0; i < 6; i++) g.add(box(shade(c0, 0.85), Math.cos(i) * 0.4, 0.5, Math.sin(i) * 0.4, 0.04, 0.9, 0.04));
      const lid = cyl('#8a9a9a', 0.2, 1.1, 0, 0.44, 0.06); lid.rotation.z = 0.5; g.add(lid); g.add(sph('#1a1a1a', 0, 1.0, 0, 0.36, 0.15, 0.36));
      g.add(sph('#4a7a3a', -0.5, 0.15, 0.2, 0.15)); g.add(box('#d0d0d0', 0.5, 0.05, 0.2, 0.2, 0.1, 0.1));
      S(0, 1.25, 0); S(0.5, 0.3, 0.3); S(-0.5, 0.3, -0.3); break;
    }
    case 'glitcher': {
      // stop sign stem, traffic cones, chairs and tables as growing spots
      g.add(cyl('#9a9a9a', 0, 1.0, 0, 0.04, 2.0));
      const sign = mesh(geo('oct', () => new THREE.CylinderGeometry(1, 1, 1, 8)), mat('#d0202a'), 0, 2.15, 0, 0.35, 0.05, 0.35); sign.rotation.x = Math.PI / 2; sign.rotation.y = Math.PI / 8; g.add(sign);
      g.add(box('#ffffff', 0, 2.15, 0.03, 0.4, 0.08, 0.01));
      [[-0.6, 0.4], [0.6, -0.3]].forEach(([x, z]) => { g.add(cone('#ff7a1a', x, 0.3, z, 0.18, 0.6)); g.add(cyl('#ffffff', x, 0.35, z, 0.12, 0.07)); g.add(box('#ff7a1a', x, 0.02, z, 0.4, 0.04, 0.4)); });
      // table
      g.add(box('#c8b07a', 0.5, 0.6, 0.5, 0.6, 0.05, 0.6)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box('#8a7a5a', 0.5 + a * 0.25, 0.3, 0.5 + b * 0.25, 0.04, 0.6, 0.04)));
      // chair
      g.add(box('#b0a070', -0.5, 0.35, -0.5, 0.35, 0.04, 0.35)); g.add(box('#b0a070', -0.5, 0.55, -0.67, 0.35, 0.4, 0.04)); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(box('#8a7a5a', -0.5 + a * 0.15, 0.17, -0.5 + b * 0.15, 0.03, 0.34, 0.03)));
      S(0.5, 0.82, 0.5); S(-0.5, 0.55, -0.45); S(0, 2.5, 0); S(-0.6, 0.8, 0.4); g.userData.glitch = 1;
      break;
    }
    default: g.add(sph(leaf, 0, 0.4, 0, 0.4)); S(0, 0.8, 0);
  }
  g.userData.spots = spots; g.userData.kind = d.k;
  return g;
}

/* ---------- PETS ---------- */
function quad(body, head, legC, opt) {
  const g = new THREE.Group(); const o = opt || {};
  const bs = o.bs || [0.35, 0.28, 0.5];
  g.add(sph(body, 0, o.by || 0.45, 0, bs[0], bs[1], bs[2]));
  const h = new THREE.Group(); h.position.set(0, (o.by || 0.45) + (o.hy || 0.2), bs[2] * 0.95); g.add(h);
  h.add(sph(head, 0, 0, 0, o.hs || 0.24));
  h.add(sph('#ffffff', -0.09, 0.07, 0.18, 0.06)); h.add(sph('#ffffff', 0.09, 0.07, 0.18, 0.06));
  h.add(sph('#111', -0.09, 0.07, 0.23, 0.03)); h.add(sph('#111', 0.09, 0.07, 0.23, 0.03));
  const legs = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const l = cyl(legC, a * bs[0] * 0.6, 0.15, b * bs[2] * 0.55, 0.07, 0.3); g.add(l); legs.push(l); });
  g.userData.legs = legs; g.userData.head = h; return g;
}
function makePet(id) {
  const P = PET[id]; let g;
  switch (id) {
    case 'dog': g = quad('#c8894a', '#d89a5a', '#b07a3a'); g.userData.head.add(sph('#7a4a2a', -0.2, 0.05, 0, 0.08, 0.16, 0.06)); g.userData.head.add(sph('#7a4a2a', 0.2, 0.05, 0, 0.08, 0.16, 0.06)); g.userData.head.add(sph('#222', 0, -0.03, 0.25, 0.05)); g.add(RX(cyl('#c8894a', 0, 0.6, -0.55, 0.04, 0.3), -0.6)); break;
    case 'turtle': g = quad('#3f9f5f', '#8fcf6f', '#8fcf6f', { bs: [0.4, 0.22, 0.45], by: 0.32, hy: 0.0, hs: 0.17 }); g.add(sph('#2f6f3f', 0, 0.42, 0, 0.45, 0.28, 0.5)); for (let i = 0; i < 5; i++) g.add(sph('#4faf5f', Math.cos(i * 1.25) * 0.22, 0.6, Math.sin(i * 1.25) * 0.25, 0.1, 0.05, 0.1)); break;
    case 'raccoon': g = quad('#7a7a82', '#8a8a92', '#4a4a52'); g.userData.head.add(box('#222', 0, 0.07, 0.2, 0.34, 0.08, 0.04)); g.userData.head.add(cone('#5a5a62', -0.15, 0.22, 0, 0.07, 0.14)); g.userData.head.add(cone('#5a5a62', 0.15, 0.22, 0, 0.07, 0.14)); for (let i = 0; i < 5; i++) { const t = sph(i % 2 ? '#333' : '#9a9aa2', 0, 0.5 + i * 0.02, -0.55 - i * 0.12, 0.1, 0.1, 0.08); g.add(t); } break;
    case 'crow': g = new THREE.Group(); g.add(sph('#1f1f26', 0, 0.45, 0, 0.25, 0.25, 0.35)); { const h = new THREE.Group(); h.position.set(0, 0.7, 0.25); h.add(sph('#1f1f26', 0, 0, 0, 0.18)); h.add(sph('#ffd21f', -0.08, 0.05, 0.14, 0.04)); h.add(sph('#ffd21f', 0.08, 0.05, 0.14, 0.04)); const b = cone('#3a3a3a', 0, -0.02, 0.24, 0.05, 0.16); b.rotation.x = Math.PI / 2; h.add(b); g.add(h); g.userData.head = h; } [-1, 1].forEach(s => { const w = sph('#15151a', s * 0.25, 0.48, 0, 0.06, 0.2, 0.3); g.add(w); }); g.add(cyl('#d0a020', -0.08, 0.12, 0, 0.02, 0.25)); g.add(cyl('#d0a020', 0.08, 0.12, 0, 0.02, 0.25)); g.userData.legs = []; break;
    case 'turkey': g = new THREE.Group(); g.add(sph('#8a5a2f', 0, 0.5, 0, 0.32, 0.32, 0.36)); for (let i = 0; i < 7; i++) { const a = -1.2 + i * 0.4; const f = sph(['#c0501f', '#e0a020', '#6a3a1a'][i % 3], Math.sin(a) * 0.4, 0.75 + Math.cos(a) * 0.3, -0.3, 0.12, 0.35, 0.04); f.rotation.z = -a; g.add(f); } { const h = new THREE.Group(); h.position.set(0, 0.85, 0.3); h.add(sph('#c8a080', 0, 0, 0, 0.13)); h.add(sph('#111', -0.05, 0.04, 0.1, 0.025)); h.add(sph('#111', 0.05, 0.04, 0.1, 0.025)); const b = cone('#e0a020', 0, 0, 0.15, 0.04, 0.1); b.rotation.x = Math.PI / 2; h.add(b); h.add(sph('#d0202a', 0.03, -0.08, 0.12, 0.03, 0.07, 0.03)); g.add(h); g.userData.head = h; } g.add(cyl('#e0a020', -0.1, 0.12, 0, 0.025, 0.25)); g.add(cyl('#e0a020', 0.1, 0.12, 0, 0.025, 0.25)); g.userData.legs = []; break;
    case 'cola': { // sideways soda bottle with object-show arms & legs (no logo)
      g = new THREE.Group(); const b = new THREE.Group(); b.rotation.z = Math.PI / 2; b.position.y = 0.55;
      b.add(cyl('#1f4fbf', 0, 0, 0, 0.22, 0.6, { transparent: true, opacity: 0.92 })); b.add(cone('#1f4fbf', 0, 0.4, 0, 0.22, 0.25, { transparent: true, opacity: 0.92 })); b.add(cyl('#1f4fbf', 0, 0.58, 0, 0.08, 0.12)); b.add(cyl('#d0202a', 0, 0.66, 0, 0.09, 0.05)); b.add(cyl('#ffffff', 0, 0, 0, 0.225, 0.18)); b.add(sph('#d0202a', 0, 0, 0.21, 0.08, 0.08, 0.02));
      g.add(b); g.add(sph('#ffffff', -0.08, 0.68, 0.2, 0.06)); g.add(sph('#ffffff', 0.08, 0.68, 0.2, 0.06)); g.add(sph('#111', -0.08, 0.68, 0.25, 0.03)); g.add(sph('#111', 0.08, 0.68, 0.25, 0.03)); g.add(box('#111', 0, 0.56, 0.22, 0.1, 0.02, 0.01));
      const legs = []; [-0.12, 0.12].forEach(x => { const l = cyl('#111', x, 0.17, 0, 0.02, 0.34); g.add(l); legs.push(l); g.add(sph('#111', x, 0.02, 0.04, 0.05, 0.03, 0.08)); }); [-1, 1].forEach(s => { const a = cyl('#111', s * 0.32, 0.55, 0, 0.018, 0.3); a.rotation.z = s * 0.8; g.add(a); });
      g.userData.legs = legs; break; }
    case 'bee': g = new THREE.Group(); g.add(sph('#ffcf1f', 0, 0.6, 0, 0.2, 0.2, 0.28)); for (let i = 0; i < 3; i++) g.add(sph('#222', 0, 0.6, -0.12 + i * 0.1, 0.205, 0.205, 0.03)); { const h = new THREE.Group(); h.position.set(0, 0.65, 0.28); h.add(sph('#222', 0, 0, 0, 0.13)); h.add(sph('#ffffff', -0.05, 0.03, 0.1, 0.035)); h.add(sph('#ffffff', 0.05, 0.03, 0.1, 0.035)); h.add(cyl('#222', -0.05, 0.15, 0, 0.01, 0.15)); h.add(cyl('#222', 0.05, 0.15, 0, 0.01, 0.15)); g.add(h); g.userData.head = h; } { const w1 = sph('#e8f6ff', -0.18, 0.82, 0, 0.18, 0.02, 0.1, { transparent: true, opacity: .7 }); const w2 = sph('#e8f6ff', 0.18, 0.82, 0, 0.18, 0.02, 0.1, { transparent: true, opacity: .7 }); g.add(w1); g.add(w2); g.userData.wings = [w1, w2]; } g.add(RX(cone('#222', 0, 0.6, -0.33, 0.04, 0.1), -Math.PI / 2)); g.userData.legs = []; g.userData.fly = 1; break;
    case 'polarbear': g = quad('#f4f8ff', '#ffffff', '#e8eef8', { bs: [0.42, 0.34, 0.6], by: 0.5, hs: 0.26 }); g.userData.head.add(sph('#e8eef8', -0.17, 0.2, 0, 0.07)); g.userData.head.add(sph('#e8eef8', 0.17, 0.2, 0, 0.07)); g.userData.head.add(sph('#222', 0, -0.03, 0.26, 0.05)); break;
    case 'platypus': g = quad('#6a8fb0', '#7a9fc0', '#4a6f90', { bs: [0.3, 0.2, 0.45], by: 0.3, hy: 0.05, hs: 0.18 }); { const bill = sph('#3a3a3a', 0, -0.03, 0.25, 0.14, 0.04, 0.16); g.userData.head.add(bill); g.add(sph('#4a6f90', 0, 0.3, -0.55, 0.18, 0.05, 0.22)); } break;
    case 'inchworm': g = new THREE.Group(); for (let i = 0; i < 7; i++) g.add(sph(i % 2 ? '#8fdf4f' : '#7fcf3f', 0, 0.15 + Math.sin(i / 6 * Math.PI) * 0.35, -0.45 + i * 0.13, 0.11)); { const h = new THREE.Group(); h.position.set(0, 0.2, 0.5); h.add(sph('#9fef5f', 0, 0, 0, 0.14)); h.add(sph('#ffffff', -0.05, 0.05, 0.11, 0.04)); h.add(sph('#ffffff', 0.05, 0.05, 0.11, 0.04)); h.add(sph('#111', -0.05, 0.05, 0.14, 0.02)); h.add(sph('#111', 0.05, 0.05, 0.14, 0.02)); h.add(box('#ffd23d', 0, 0.18, 0, 0.04, 0.02, 0.3)); g.add(h); g.userData.head = h; } g.userData.legs = []; g.userData.worm = 1; break;
    case 'balloon': g = new THREE.Group(); g.add(sph('#ff4d6d', 0, 1.0, 0, 0.32, 0.38, 0.32, { emissive: new THREE.Color('#ff4d6d'), emissiveIntensity: 0.2 })); g.add(cone('#ff4d6d', 0, 0.6, 0, 0.06, 0.08)); g.add(cyl('#eeeeee', 0, 0.3, 0, 0.008, 0.6)); g.add(sph('#ffffff', -0.1, 1.07, 0.27, 0.05)); g.add(sph('#ffffff', 0.1, 1.07, 0.27, 0.05)); g.add(sph('#111', -0.1, 1.07, 0.31, 0.025)); g.add(sph('#111', 0.1, 1.07, 0.31, 0.025)); g.userData.legs = []; g.userData.fly = 1; break;
    default: g = quad(P.c, P.c, P.c);
  }
  g.userData.id = id; g.userData.t = Math.random() * 6;
  return g;
}
function animPet(g, moving, dt) {
  const u = g.userData; u.t += dt * (moving ? 10 : 2);
  (u.legs || []).forEach((l, i) => { l.rotation.x = moving ? Math.sin(u.t + i * Math.PI) * 0.5 : 0; });
  if (u.head) u.head.rotation.y = Math.sin(u.t * 0.3) * 0.25;
  if (u.wings) u.wings.forEach((w, i) => { w.rotation.z = Math.sin(u.t * 6) * 0.6 * (i ? 1 : -1); });
  if (u.worm) g.children.forEach((c, i) => { if (i < 7) c.position.y = 0.15 + Math.abs(Math.sin(u.t * 0.5 + i * 0.4)) * 0.3; });
}

/* ---------- LORD CROW (boss) ---------- */
function makeLordCrow() {
  const g = new THREE.Group(); const s = 3.2;
  const body = new THREE.Group(); body.scale.setScalar(s); g.add(body);
  body.add(sph('#15151c', 0, 0, 0, 0.5, 0.45, 0.75));
  const h = new THREE.Group(); h.position.set(0, 0.45, 0.6); body.add(h);
  h.add(sph('#15151c', 0, 0, 0, 0.32));
  h.add(sph('#ff2020', -0.13, 0.08, 0.25, 0.07, 0.07, 0.04, { emissive: new THREE.Color('#ff0000'), emissiveIntensity: 1 })); h.add(sph('#ff2020', 0.13, 0.08, 0.25, 0.07, 0.07, 0.04, { emissive: new THREE.Color('#ff0000'), emissiveIntensity: 1 }));
  const bk = cone('#444', 0, -0.05, 0.42, 0.09, 0.3); bk.rotation.x = Math.PI / 2; h.add(bk);
  // crown
  h.add(cyl('#ffd23d', 0, 0.3, 0, 0.17, 0.1, { emissive: new THREE.Color('#aa8800'), emissiveIntensity: .3 })); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; h.add(cone('#ffd23d', Math.cos(a) * 0.15, 0.42, Math.sin(a) * 0.15, 0.04, 0.14)); }
  const wings = [];
  [-1, 1].forEach(sd => { const w = new THREE.Group(); w.position.set(sd * 0.4, 0.1, 0); for (let i = 0; i < 4; i++) w.add(sph('#0d0d12', sd * (0.4 + i * 0.3), -i * 0.05, -i * 0.08, 0.3, 0.05, 0.3 - i * 0.04)); body.add(w); wings.push(w); });
  for (let i = 0; i < 5; i++) { const t = sph('#0d0d12', (i - 2) * 0.12, 0, -0.85, 0.08, 0.04, 0.35); t.rotation.y = (i - 2) * 0.2; body.add(t); }
  [-0.15, 0.15].forEach(x => { body.add(cyl('#c09020', x, -0.55, 0, 0.04, 0.3)); });
  g.userData = { wings, head: h, t: 0 };
  return g;
}

/* ---------- BUILDINGS ---------- */
function makeStall(name, roofA, roofB, signC) {
  const g = new THREE.Group();
  g.add(box('#a0703f', 0, 0.55, 0, 5, 1.1, 1.6)); g.add(box('#c08a50', 0, 1.12, 0.1, 5.2, 0.1, 1.9));
  [[-2.4, -0.7], [2.4, -0.7], [-2.4, 0.7], [2.4, 0.7]].forEach(([x, z]) => g.add(cyl('#7a4f2a', x, 1.7, z, 0.1, 3.4)));
  for (let i = 0; i < 8; i++) { const r = box(i % 2 ? roofA : roofB, -2.45 + i * 0.7, 3.5, 0, 0.7, 0.12, 2.6); r.rotation.x = 0.12; g.add(r); }
  for (let i = 0; i < 8; i++) g.add(RX(cone(i % 2 ? roofA : roofB, -2.45 + i * 0.7, 3.15, 1.35, 0.35, 0.4), Math.PI));
  const sign = signBoard(name, signC || '#3a7a2a', '#fff', 4.4); sign.position.set(0, 4.25, 0.3); g.add(sign);
  const sign2 = sign.clone(); sign2.rotation.y = Math.PI; sign2.position.z = 0.28; g.add(sign2);
  g.add(box('#7a4f2a', 0, 4.25, 0.29, 4.5, 1.15, 0.04));
  return g;
}
function makeCornucopia() {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.9, 0), new THREE.Vector3(-1.4, 1.2, -0.2), new THREE.Vector3(-2.6, 2.1, -0.4), new THREE.Vector3(-3.1, 3.4, -0.4), new THREE.Vector3(-2.7, 4.1, -0.3)]);
  const N = 22;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1); const p = curve.getPoint(t); const tan = curve.getTangent(t);
    const r = 1.25 * (1 - t) + 0.08;
    const tor = mesh(TOR(), mat(i % 2 ? '#b8823a' : '#9a6a2a'), p.x, p.y, p.z, r, r, r * 1.2);
    tor.lookAt(p.clone().add(tan)); g.add(tor);
  }
  const fill = [['#ff8c1a', 0.45], ['#e8202a', 0.3], ['#ffd53d', 0.3], ['#8a3cff', 0.25], ['#4fbf3f', 0.28], ['#c0503a', 0.3]];
  for (let i = 0; i < 14; i++) { const f = fill[i % fill.length]; const a = i * 1.3; g.add(sph(f[0], 0.4 + Math.cos(a) * 0.6 + (i > 7 ? 0.9 : 0), 0.35 + (i % 3) * 0.25, Math.sin(a) * 0.8, f[1])); }
  g.add(cyl('#7a4f2a', 0, 0.12, 0, 2.4, 0.24));
  const sign = signBoard('CORNUCOPIA', '#c0501f', '#fff', 4); sign.position.set(0, 5.6, 0); g.add(sign);
  return g;
}
