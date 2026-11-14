'use strict';
/* models: TV-head players, the Signal Bell, artifacts, effects */
const SPH = new THREE.SphereGeometry(1, 14, 10);
function mk(geo, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (p) p.add(o); return o; }
function bx(w, h, d, m, x, y, z, p) { const o = mk(UNIT_BOX, m, x, y, z, p); o.scale.set(w, h, d); return o; }
function sp(r, m, x, y, z, p, sx = 1, sy = 1, sz = 1) { const o = mk(SPH, m, x, y, z, p); o.scale.set(r * sx, r * sy, r * sz); return o; }
function cy(rt, rb, h, m, x, y, z, p, seg = 10) { return mk(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, p); }
function cn(r, h, m, x, y, z, p, seg = 8) { return mk(new THREE.ConeGeometry(r, h, seg), m, x, y, z, p); }
function piv(x, y, z, p) { const g = new THREE.Group(); g.position.set(x, y, z); if (p) p.add(g); return g; }
function limb(len, r, m, p, x, y, z) { const g = piv(x, y, z, p); cy(r, r * 0.85, len, m, 0, -len / 2, 0, g, 7); return g; }

/* ---------------- TV head player ---------------- */
function makeTV(color, faceUrl, o = {}) {
  const M = o.sig ? sigMat : mat;
  const g = new THREE.Group(); const body = M(color), dark = M(0x24242a), casing = M(o.casing || 0x3d3f47), shoe = M(0x111114), skin = M(0x2a2a30);
  const root = piv(0, 0, 0, g);
  const legL = piv(-0.15, 0.68, 0, root), legR = piv(0.15, 0.68, 0, root);
  for (const L of [legL, legR]) { bx(0.22, 0.62, 0.25, dark, 0, -0.31, 0, L); bx(0.24, 0.1, 0.34, shoe, 0, -0.63, -0.04, L); }
  bx(0.6, 0.72, 0.36, body, 0, 1.03, 0, root);
  bx(0.62, 0.09, 0.38, dark, 0, 0.71, 0, root);
  bx(0.2, 0.2, 0.05, M(0xffffff), 0.14, 1.18, -0.19, root).material = M(0xdddddd);
  const armL = piv(-0.38, 1.32, 0, root), armR = piv(0.38, 1.32, 0, root);
  for (const A of [armL, armR]) { bx(0.17, 0.58, 0.2, body, 0, -0.27, 0, A); sp(0.1, skin, 0, -0.6, 0, A); }
  const head = piv(0, 1.4, 0, root);
  cy(0.09, 0.12, 0.1, dark, 0, 0.03, 0, head);
  bx(0.82, 0.6, 0.56, casing, 0, 0.36, 0, head);
  bx(0.7, 0.5, 0.04, M(0x0d0d10), 0, 0.37, -0.27, head);
  const smat = new THREE.MeshBasicMaterial({ map: faceTex(faceUrl, o.glitch), color: 0xffffff });
  const screen = mk(new THREE.PlaneGeometry(0.64, 0.46), smat, 0, 0.37, -0.293, head); screen.rotation.y = Math.PI;
  for (const s of [-1, 1]) { const a = piv(s * 0.12, 0.66, 0.05, head); a.rotation.z = -s * 0.5; cy(0.015, 0.015, 0.45, dark, 0, 0.22, 0, a, 5); sp(0.035, M(0xc0c0c8), 0, 0.46, 0, a); }
  cy(0.035, 0.035, 0.04, M(0x777777), 0.43, 0.48, -0.1, head).rotation.z = Math.PI / 2;
  cy(0.035, 0.035, 0.04, M(0x777777), 0.43, 0.34, -0.1, head).rotation.z = Math.PI / 2;
  const cam = piv(0, -0.6, -0.1, armR);
  bx(0.14, 0.17, 0.3, M(0x1a1a1a), 0, 0, -0.05, cam); cy(0.06, 0.07, 0.08, M(0x333333), 0, 0, -0.23, cam).rotation.x = Math.PI / 2;
  bx(0.05, 0.12, 0.14, M(0xffd23d), -0.09, 0.02, 0, cam);
  const rec = sp(0.025, basic(0xff2020), 0.05, 0.1, -0.18, cam); cam.visible = false;
  const item = piv(0, -0.62, -0.08, armL);
  return { g, root, legL, legR, armL, armR, head, screen, cam, rec, item, t: 0, dead: 0, color };
}
function setTVFace(M, url, glitch) { M.screen.material.map = faceTex(url, glitch); M.screen.material.needsUpdate = true; }
function animTV(M, spd, dt, s) {
  M.t += dt * Math.min(spd, 7) * 2.3;
  const amt = Math.min(1, spd / 3) * 0.75, sw = Math.sin(M.t) * amt;
  M.dead = lerp(M.dead, s.dead ? 1 : 0, Math.min(1, dt * 6));
  M.root.rotation.x = -M.dead * Math.PI / 2; M.root.position.y = M.dead * 0.22 + (s.cr && !s.dead ? -0.28 : 0);
  M.root.scale.y = s.cr && !s.dead ? 0.85 : 1;
  if (s.grab) { const f = Math.sin(W.t * 18); M.legL.rotation.x = f * 0.7; M.legR.rotation.x = -f * 0.7; M.armL.rotation.x = -2.6 + f * 0.4; M.armR.rotation.x = -2.6 - f * 0.4; }
  else {
    M.legL.rotation.x = sw; M.legR.rotation.x = -sw; M.armL.rotation.x = s.item ? -0.9 : -sw * 0.8;
    M.armR.rotation.x = s.cam ? -1.35 - (s.pitch || 0) * 0.6 : sw * 0.8;
  }
  M.head.rotation.x = s.dead ? 0 : clamp(-(s.pitch || 0) * 0.6, -0.5, 0.5);
  M.cam.visible = !!s.cam || !!s.hold; M.rec.visible = !!s.rec && (W.t % 1 < 0.6);
}

/* ---------------- the Signal Bell (the real-world elevator) ---------------- */
function makeBell(area, x, z, rot, parent) {
  const g = piv(x, 0, z, parent); g.rotation.y = rot;
  const metal = mat(0xd49a1f), dark = mat(0x5a3d12), glass = mat(0x9fe6ff, { em: 0x2a6070 });
  cy(2.6, 2.6, 0.25, mat(0x7a5a1a), 0, 0.12, 0, g, 24);
  const gap = 1.25; // door gap (radians) facing +z
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 3.3, 28, 1, true, gap / 2, Math.PI * 2 - gap), mat(0xd49a1f, { side: THREE.DoubleSide }));
  wall.position.y = 1.85; g.add(wall);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.55, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc58a18, { side: THREE.DoubleSide })); dome.position.y = 3.45; g.add(dome);
  for (let i = 0; i < 6; i++) { const a = gap / 2 + 0.5 + i * (Math.PI * 2 - gap - 1) / 5; const p = sp(0.32, glass, Math.sin(a) * 2.5, 2.3, Math.cos(a) * 2.5, g, 1, 1, 0.3); p.rotation.y = a; }
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; if (Math.abs(angDiff(a, 0)) < gap / 2) continue; sp(0.06, dark, Math.sin(a) * 2.53, 0.35, Math.cos(a) * 2.53, g); sp(0.06, dark, Math.sin(a) * 2.53, 3.35, Math.cos(a) * 2.53, g); }
  sp(0.25, basic(0xfff1b0), 0, 3.6, 0, g);
  // lever
  bx(0.3, 1.1, 0.3, mat(0x3a3a3a), 0, 0.65, -1.6, g);
  const lev = piv(0, 1.2, -1.6, g); bx(0.08, 0.7, 0.08, mat(0x999999), 0, 0.35, 0, lev); sp(0.11, mat(0xe02020), 0, 0.72, 0, lev); lev.rotation.x = 0.6;
  const sign = textSprite('SIGNAL BELL', '#ffd23d', 'rgba(20,14,4,.85)', 0.45); sign.position.set(0, 4.4, 0); g.add(sign);
  if (area === 'sig') { const L = new THREE.PointLight(0xffd890, 1.1, 14, 1.6); L.position.set(0, 2.8, 0); g.add(L); }
  // colliders around the ring (not the door)
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2; if (Math.abs(angDiff(a, 0)) < gap / 2 + 0.05) continue;
    const wa = a + rot; const cx = x + Math.sin(wa) * 2.55, cz = z + Math.cos(wa) * 2.55; addCol(area, cx - 0.42, cz - 0.42, cx + 0.42, cz + 0.42, 4, 'bell');
  }
  const lx = x + Math.sin(rot + Math.PI) * 1.6, lz = z + Math.cos(rot + Math.PI) * 1.6;
  addCol(area, lx - 0.18, lz - 0.18, lx + 0.18, lz + 0.18, 1.2, 'lever');
  return { g, lever: lev, x, z, rot, lx, lz };
}

/* ---------------- artifacts (valuables lying around the Signal World) ---------------- */
const ARTIFACTS = [
  { n: 'Old VHS Tape', v: 45, c: 0x151515 }, { n: 'Creepy Doll', v: 90, c: 0xf0c8b0 }, { n: 'Rubber Duck', v: 35, c: 0xffd800 },
  { n: 'Broken Phone', v: 60, c: 0x30343a }, { n: 'Gold Remote', v: 160, c: 0xffc830 }, { n: 'Cursed Plushie', v: 120, c: 0x8a5cff },
  { n: 'Signal Crystal', v: 220, c: 0x2fe3c5 }, { n: 'Cassette', v: 40, c: 0xe84a4a }
];
function makeArtifact(type) {
  const d = ARTIFACTS[type], g = new THREE.Group(); const m = sigMat(d.c, { em: new THREE.Color(d.c).multiplyScalar(0.25).getHex() });
  switch (type) {
    case 0: bx(0.36, 0.08, 0.2, m, 0, 0.04, 0, g); bx(0.2, 0.085, 0.1, sigMat(0xeeeeee), 0, 0.045, 0, g); break;
    case 1: sp(0.12, m, 0, 0.36, 0, g); cn(0.16, 0.3, sigMat(0x6a1a2a), 0, 0.15, 0, g); sp(0.025, sigMat(0x000000), -0.04, 0.38, -0.11, g); sp(0.025, sigMat(0x000000), 0.04, 0.38, -0.11, g); break;
    case 2: sp(0.15, m, 0, 0.13, 0, g, 1.2, 0.9, 1); sp(0.09, m, 0, 0.28, -0.1, g); cn(0.04, 0.1, sigMat(0xff8a00), 0, 0.27, -0.21, g).rotation.x = -Math.PI / 2; break;
    case 3: bx(0.16, 0.03, 0.3, m, 0, 0.015, 0, g); bx(0.14, 0.032, 0.25, sigMat(0x2266aa, { em: 0x113355 }), 0, 0.02, 0, g); break;
    case 4: bx(0.12, 0.05, 0.36, m, 0, 0.025, 0, g); for (let i = 0; i < 4; i++) sp(0.018, sigMat(0xaa0000), 0, 0.055, -0.1 + i * 0.06, g); break;
    case 5: sp(0.16, m, 0, 0.16, 0, g); sp(0.11, m, 0, 0.36, 0, g); sp(0.05, m, -0.08, 0.46, 0, g); sp(0.05, m, 0.08, 0.46, 0, g); sp(0.022, sigMat(0xff0000, { em: 0xff0000 }), -0.04, 0.38, -0.1, g); break;
    case 6: cn(0.12, 0.45, m, 0, 0.22, 0, g, 6); cn(0.08, 0.3, m, 0.12, 0.15, 0.05, g, 6).rotation.z = -0.4; break;
    case 7: bx(0.3, 0.05, 0.2, m, 0, 0.025, 0, g); sp(0.035, sigMat(0xffffff), -0.06, 0.05, 0, g); sp(0.035, sigMat(0xffffff), 0.06, 0.05, 0, g); break;
  }
  const glint = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xbffff0, transparent: true, opacity: 0.8, depthWrite: false })); glint.scale.set(0.12, 0.12, 1); glint.position.y = 0.5; g.add(glint); g.userData.glint = glint;
  return g;
}

/* ---------------- effects ---------------- */
const FX = [];
function fxAdd(o) { FX.push(o); return o; }
function fxExplosion(x, y, z, size = 4) {
  const ball = sp(1, new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.95, depthWrite: false }), x, y, z, W.s);
  const ring = sp(1, new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.6, depthWrite: false }), x, y, z, W.s);
  const L = new THREE.PointLight(0xff9a30, 4, size * 5); L.position.set(x, y + 1, z); W.s.add(L);
  fxAdd({ t: 0, life: 0.9, up(dt) { this.t += dt; const k = this.t / this.life; ball.scale.setScalar(size * (0.3 + k * 1.1)); ball.material.opacity = 0.95 * (1 - k); ring.scale.setScalar(size * (0.2 + k * 1.6)); ring.material.opacity = 0.6 * (1 - k); L.intensity = 4 * (1 - k); }, end() { W.s.remove(ball, ring, L); } });
  for (let i = 0; i < 14; i++) { const d = sp(0.15, new THREE.MeshBasicMaterial({ color: pick([0x333333, 0xff6a00, 0x222222]) }), x, y, z, W.s); const v = [rnd(-7, 7), rnd(3, 10), rnd(-7, 7)]; fxAdd({ t: 0, life: 1.2, up(dt) { this.t += dt; v[1] -= 18 * dt; d.position.x += v[0] * dt; d.position.y = Math.max(0.1, d.position.y + v[1] * dt); d.position.z += v[2] * dt; }, end() { W.s.remove(d); } }); }
}
function fxPuff(x, y, z, color = 0xffffff, n = 6, size = 0.3) {
  for (let i = 0; i < n; i++) { const d = sp(size, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false }), x, y, z, W.s); const v = [rnd(-1.5, 1.5), rnd(0.5, 2.5), rnd(-1.5, 1.5)]; fxAdd({ t: 0, life: 0.7, up(dt) { this.t += dt; d.position.x += v[0] * dt; d.position.y += v[1] * dt; d.position.z += v[2] * dt; d.material.opacity = 0.7 * (1 - this.t / this.life); }, end() { W.s.remove(d); } }); }
}
function fxText(text, x, y, z, color = '#fff') { const s = textSprite(text, color, null, 0.5); s.position.set(x, y, z); W.s.add(s); fxAdd({ t: 0, life: 1.6, up(dt) { this.t += dt; s.position.y += dt * 0.8; s.material.opacity = 1 - this.t / this.life; }, end() { W.s.remove(s); } }); }
function updateFx(dt) { for (let i = FX.length - 1; i >= 0; i--) { const f = FX[i]; f.up(dt); if (f.t >= f.life) { f.end(); FX.splice(i, 1); } } }
