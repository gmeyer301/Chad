'use strict';
/* the 15 monsters of the Signal World: models, animation and AI (AI runs on the host) */
const MON = new Map();
const PROJ = []; // fireballs + bullets (host simulates, everyone renders)
let MON_ALERT = null; // Ron's alarm {x,z,t}
const DS = THREE.DoubleSide;
const hemi = (r, left) => new THREE.SphereGeometry(r, 16, 12, left ? -Math.PI / 2 : Math.PI / 2, Math.PI);

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); return t; }
let _peanutTex, _quiltTex, _staticTex, _compTex, _bsodTex;
function peanutTex() {
  return _peanutTex || (_peanutTex = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#e2c2a6'; x.fillRect(0, 0, w, h); x.strokeStyle = '#111'; x.lineWidth = 5;
    for (let i = -4; i < 9; i++) { x.beginPath(); x.moveTo(i * 44, 0); x.lineTo(i * 44 + 160, h); x.stroke(); x.beginPath(); x.moveTo(i * 44 + 160, 0); x.lineTo(i * 44, h); x.stroke(); }
    x.fillStyle = '#050505';
    for (const [cx, cy, rx, ry] of [[100, 60, 16, 40], [130, 70, 14, 46], [150, 50, 12, 34], [118, 120, 10, 22], [140, 128, 9, 20]]) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0.1, 0, 7); x.fill(); }
    for (let i = 0; i < 9; i++) { const dx = 20 + i * 27 + (i % 2) * 8; x.fillRect(dx, 180 + (i % 3) * 8, 7 + (i % 3) * 3, 80); x.beginPath(); x.arc(dx + 5, 255, 8, 0, 7); x.fill(); }
    x.fillStyle = '#fff'; x.beginPath(); x.arc(150, 46, 5, 0, 7); x.fill(); x.fillStyle = '#000'; x.beginPath(); x.arc(150, 46, 2, 0, 7); x.fill();
  }));
}
function quiltTex() {
  return _quiltTex || (_quiltTex = canvasTex(128, 128, (x) => {
    const cols = ['#c0392b', '#f3e5c8', '#2e5a9a', '#e8b04a', '#7a3a8a'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = cols[(i * 3 + j * 2) % 5]; x.fillRect(i * 32, j * 32, 32, 32); }
    x.strokeStyle = '#fff'; x.setLineDash([3, 3]); x.lineWidth = 1.5; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 128); x.stroke(); x.beginPath(); x.moveTo(0, i * 32); x.lineTo(128, i * 32); x.stroke(); }
    x.setLineDash([]); x.fillStyle = '#000'; for (const ex of [44, 84]) { x.beginPath(); x.ellipse(ex, 50, 9, 13, 0, 0, 7); x.fill(); }
  }));
}
function staticTex() { return _staticTex || (_staticTex = canvasTex(64, 48, (x) => { const d = x.createImageData(64, 48); for (let k = 0; k < d.data.length; k += 4) { const v = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = v; d.data[k + 3] = 255; } x.putImageData(d, 0, 0); })); }
function compTex() { return _compTex || (_compTex = canvasTex(128, 96, (x) => { x.fillStyle = '#0a1a0a'; x.fillRect(0, 0, 128, 96); x.fillStyle = '#3aff6a'; x.font = 'bold 22px monospace'; x.fillText('0  0', 30, 40); x.fillText('\\____/', 22, 72); x.font = '10px monospace'; x.fillText('C:\\> HELLO.EXE', 4, 92); })); }
function bsodTex() { return _bsodTex || (_bsodTex = canvasTex(128, 96, (x) => { x.fillStyle = '#1a5fd0'; x.fillRect(0, 0, 128, 96); x.fillStyle = '#fff'; x.font = 'bold 36px Arial'; x.fillText(':(', 10, 44); x.font = '9px Arial'; x.fillText('SIGNAL_CORRUPTED', 10, 70); })); }

/* ---------------- models ---------------- */
const BUILD = {
  man() {
    const g = new THREE.Group(), k = sigMat(0x050505); const body = piv(0, 0, 0, g);
    const legL = limb(0.95, 0.09, k, body, -0.15, 0.95, 0), legR = limb(0.95, 0.09, k, body, 0.15, 0.95, 0);
    sp(0.3, k, 0, 1.35, 0, body, 1, 1.5, 0.75); cy(0.05, 0.08, 0.32, k, 0, 1.86, 0, body);
    const head = sp(0.34, k, 0, 2.18, 0, body, 1, 1.12, 1);
    const armL = limb(1.08, 0.065, k, body, -0.34, 1.72, 0), armR = limb(1.08, 0.065, k, body, 0.34, 1.72, 0);
    return { g, body, legL, legR, armL, armR, head };
  },
  yeti() {
    const g = new THREE.Group(), fur = sigMat(0xe8ecf0), face = sigMat(0x8ab0d0), blk = sigMat(0x0a0a10);
    sp(1, fur, 0, 1.9, 0, g, 1.1, 1.25, 0.9); sp(0.7, sigMat(0xd0d6dc), 0, 1.7, -0.45, g, 1, 1.1, 0.5);
    const head = piv(0, 3.15, -0.1, g); sp(0.62, fur, 0, 0, 0, head); sp(0.42, face, 0, -0.05, -0.38, head, 1, 1, 0.5);
    sp(0.08, blk, -0.15, 0.08, -0.6, head); sp(0.08, blk, 0.15, 0.08, -0.6, head); sp(0.16, sigMat(0x300010), 0, -0.2, -0.56, head, 1.4, 0.6, 0.6);
    cn(0.06, 0.12, sigMat(0xffffff), -0.08, -0.13, -0.6, head).rotation.x = Math.PI; cn(0.06, 0.12, sigMat(0xffffff), 0.08, -0.13, -0.6, head).rotation.x = Math.PI;
    const armL = limb(1.8, 0.27, fur, g, -1.15, 2.7, 0), armR = limb(1.8, 0.27, fur, g, 1.15, 2.7, 0);
    sp(0.38, face, 0, -1.9, 0, armL); sp(0.38, face, 0, -1.9, 0, armR);
    const legL = limb(1.0, 0.36, fur, g, -0.5, 1.0, 0), legR = limb(1.0, 0.36, fur, g, 0.5, 1.0, 0);
    sp(0.4, face, 0, -1.0, -0.15, legL, 1, 0.5, 1.3); sp(0.4, face, 0, -1.0, -0.15, legR, 1, 0.5, 1.3);
    return { g, head, armL, armR, legL, legR };
  },
  bear() {
    const g = new THREE.Group(), brown = sigMat(0x7a5a48), pink = sigMat(0xe8c0a8), maroon = sigMat(0x5a1a2a, { side: DS }), teeth = sigMat(0xfff0b0), blk = sigMat(0x080808);
    const S = piv(0, 0, 0, g); S.scale.setScalar(1.15); const hinges = [];
    for (const s of [-1, 1]) {
      const hg = piv(0, 0, 0.62, S), hf = piv(0, 0, -0.62, hg); hinges.push(hg);
      mk(hemi(0.62, s < 0), brown, 0, 1.25, 0, hf); mk(hemi(0.46, s < 0), brown, 0, 0.55, 0, hf);
      const d1 = mk(new THREE.CircleGeometry(0.6, 18), maroon, s * 0.005, 1.25, 0, hf); d1.rotation.y = Math.PI / 2;
      const d2 = mk(new THREE.CircleGeometry(0.44, 18), maroon, s * 0.005, 0.55, 0, hf); d2.rotation.y = Math.PI / 2;
      for (let k = 0; k < 8; k++) { const y = 0.2 + k * 0.21, z = -0.22 - Math.sin(k / 7 * Math.PI) * 0.18; const t = cn(0.07, 0.2, teeth, -s * 0.06, y, z, hf, 5); t.rotation.z = s < 0 ? -Math.PI / 2 : Math.PI / 2; }
      sp(0.2, brown, s * 0.47, 1.76, 0.05, hf); sp(0.12, pink, s * 0.47, 1.76, -0.08, hf, 1, 1, 0.4);
      const eye = sp(0.17, s < 0 ? sigMat(0x5a3010) : sigMat(0x1a1a6a), s * 0.26, 1.38, -0.52, hf, 1, 1, 0.35);
      for (const [ox, oy] of [[-0.06, 0.05], [0.06, 0.05], [-0.06, -0.05], [0.06, -0.05]]) sp(0.035, blk, s * 0.26 + ox, 1.38 + oy, -0.58, hf);
      sp(0.2, pink, s * 0.1, 1.08, -0.53, hf, 1, 0.7, 0.6); sp(0.065, blk, s * 0.03, 1.2, -0.66, hf);
      for (let q = 0; q < 3; q++) sp(0.018, blk, s * (0.1 + q * 0.04), 1.05 - q * 0.02, -0.65, hf);
      sp(0.17, pink, s * 0.42, 0.62, -0.22, hf); sp(0.2, pink, s * 0.24, 0.12, -0.28, hf, 1, 0.8, 1.2);
    }
    const drool = piv(0, 0.9, -0.55, S); for (let k = 0; k < 3; k++) cy(0.025, 0.012, 0.9 + k * 0.3, sigMat(0x8ab8ff, { em: 0x2a4a80 }), (k - 1) * 0.06, -0.4 - k * 0.1, 0, drool, 5); drool.visible = false;
    return { g, S, hinges, drool, open: 0 };
  },
  peanut() {
    const g = new THREE.Group(), pm = sigMat(0xffffff, { map: peanutTex() }), blk = sigMat(0x060606);
    const body = piv(0, 0, 0, g);
    sp(0.72, pm, 0, 1.05, 0, body, 1, 1.05, 0.92); sp(0.56, pm, 0.05, 1.85, -0.02, body, 1, 1.15, 0.9).rotation.y = 0.6;
    const legL = limb(0.6, 0.17, blk, body, -0.3, 0.5, 0), legR = limb(0.6, 0.17, blk, body, 0.3, 0.5, 0);
    sp(0.25, blk, -0.05, -0.6, -0.1, legL, 1.2, 0.6, 1.5); sp(0.25, blk, 0.05, -0.6, -0.1, legR, 1.2, 0.6, 1.5);
    const wL = cn(0.28, 1.9, blk, -0.72, 1.0, 0.1, body, 6); wL.rotation.z = -0.25; const wR = cn(0.28, 1.9, blk, 0.72, 1.0, 0.1, body, 6); wR.rotation.z = 0.25;
    wL.rotation.x = wR.rotation.x = Math.PI;
    body.rotation.z = 0.08;
    return { g, body, legL, legR, wL, wR };
  },
  ear() {
    const g = new THREE.Group(), pink = sigMat(0xe0a890), dp = sigMat(0x9a4a44), blk = sigMat(0x121212);
    sp(0.36, blk, 0, 1.0, 0, g, 1.2, 0.8, 1.4);
    const ear = piv(0, 1.85, 0, g);
    sp(0.72, pink, 0, 0, 0, ear, 0.3, 1, 0.72);
    const rim = mk(new THREE.TorusGeometry(0.56, 0.14, 8, 18, Math.PI * 1.55), pink, 0, 0.02, 0, ear); rim.rotation.y = Math.PI / 2; rim.rotation.x = 0.5;
    sp(0.2, dp, 0.17, -0.08, 0.05, ear, 0.5, 1, 0.9); sp(0.11, sigMat(0x2a0a0a), 0.2, -0.12, 0.05, ear, 0.4, 0.8, 0.8);
    sp(0.24, pink, 0, -0.72, 0.12, ear, 0.45, 0.8, 0.8);
    const legs = [];
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
      const up = piv(s * 0.32, 1.0, -0.42 + k * 0.28, g); up.rotation.z = s * 1.0; up.rotation.y = (k - 1.5) * 0.35 * s;
      cy(0.045, 0.04, 0.8, blk, 0, 0.4, 0, up, 5);
      const lo = piv(0, 0.8, 0, up); lo.rotation.z = -s * 2.2; cy(0.04, 0.015, 1.15, blk, 0, 0.57, 0, lo, 5);
      legs.push({ up, s, k });
    }
    return { g, ear, legs };
  },
  jerry() {
    const g = new THREE.Group(), shell = sigMat(0x3a7a3a), skin = sigMat(0x7ac060), blk = sigMat(0x080808);
    const sh = mk(new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0.2, 0, g); sh.scale.set(1, 0.8, 1.2);
    for (let i = 0; i < 6; i++) sp(0.13, sigMat(0x1f4a1f), Math.cos(i) * 0.3, 0.45 + (i % 2) * 0.05, Math.sin(i) * 0.36, g, 1, 0.3, 1);
    cy(0.5, 0.5, 0.08, sigMat(0xd8c890), 0, 0.2, 0, g, 14).scale.z = 1.2;
    const head = piv(0, 0.3, -0.62, g); sp(0.17, skin, 0, 0, -0.08, head); sp(0.04, blk, -0.08, 0.06, -0.2, head); sp(0.04, blk, 0.08, 0.06, -0.2, head);
    const legs = [[-0.38, -0.4], [0.38, -0.4], [-0.38, 0.4], [0.38, 0.4]].map(([x, z]) => sp(0.13, skin, x, 0.12, z, g, 1, 0.7, 1.2));
    cn(0.06, 0.2, skin, 0, 0.18, 0.66, g).rotation.x = Math.PI / 2;
    const light = sp(0.07, new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0, 0.62, 0, g);
    cy(0.02, 0.02, 0.15, blk, 0.12, 0.62, 0.05, g, 5);
    return { g, head, legs, light };
  },
  lizard() {
    const g = new THREE.Group(), skin = sigMat(0x5a7a3a), belly = sigMat(0xb0a060), spk = sigMat(0x3a2a1a), mouth = sigMat(0xff6a10, { em: 0xff4000 }), eye = sigMat(0xffe020, { em: 0xa08000 });
    sp(1, skin, 0, 1.0, 0, g, 0.95, 0.65, 2.0); sp(0.8, belly, 0, 0.75, 0, g, 0.95, 0.4, 1.9);
    for (let i = 0; i < 6; i++) cn(0.14, 0.45, spk, 0, 1.65 - Math.abs(i - 2.5) * 0.05, -1.4 + i * 0.55, g, 5);
    const head = piv(0, 1.3, -2.0, g); sp(0.55, skin, 0, 0, -0.35, head, 0.9, 0.6, 1.3);
    sp(0.09, eye, -0.33, 0.18, -0.45, head); sp(0.09, eye, 0.33, 0.18, -0.45, head);
    const jaw = piv(0, -0.12, -0.05, head); sp(0.45, skin, 0, -0.12, -0.42, jaw, 0.8, 0.3, 1.2);
    const glow = sp(0.3, mouth, 0, -0.06, -0.55, head, 0.75, 0.25, 1.1);
    const tail = []; let par = g, z = 1.9;
    for (let i = 0; i < 5; i++) { const p = piv(0, i === 0 ? 0.95 : 0, i === 0 ? 1.9 : 0.75, par); sp(0.38 - i * 0.065, skin, 0, 0, 0.38, p, 1, 0.8, 1.6); tail.push(p); par = p; }
    const legs = [];
    for (const [x, zz] of [[-0.8, -1.1], [0.8, -1.1], [-0.8, 1.1], [0.8, 1.1]]) { const l = piv(x, 0.9, zz, g); const u = cy(0.18, 0.15, 1.0, skin, x < 0 ? -0.35 : 0.35, -0.2, 0, l, 7); u.rotation.z = x < 0 ? -1.0 : 1.0; cy(0.15, 0.12, 0.8, skin, x < 0 ? -0.75 : 0.75, -0.55, 0, l, 7); sp(0.2, skin, x < 0 ? -0.78 : 0.78, -0.9, -0.1, l, 1, 0.4, 1.4); legs.push(l); }
    return { g, head, jaw, glow, tail, legs };
  },
  turret() {
    const g = new THREE.Group(), metal = sigMat(0x8a9098), dark = sigMat(0x2a2e34);
    const head = piv(0, 1.65, 0, g); bx(1.0, 0.7, 0.95, metal, 0, 0, 0, head); bx(0.8, 0.12, 0.8, dark, 0, 0.4, 0, head);
    for (const s of [-1, 1]) cy(0.08, 0.08, 0.9, dark, s * 0.25, -0.05, -0.85, head, 8).rotation.x = Math.PI / 2;
    const eye = sp(0.13, sigMat(0xff2020, { em: 0xff0000 }), 0, 0.12, -0.48, head);
    const laser = bx(0.03, 0.03, 22, new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.6 }), 0, 0.12, -11.5, head); laser.visible = false;
    const flash = sp(0.22, new THREE.MeshBasicMaterial({ color: 0xffe080 }), 0, -0.05, -1.35, head); flash.visible = false;
    cy(0.02, 0.02, 0.6, dark, 0.35, 0.65, 0.3, head, 4);
    const legs = [];
    for (const [x, z] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) { const up = piv(x, 1.4, z, g); up.rotation.z = x < 0 ? 0.7 : -0.7; cy(0.07, 0.06, 0.8, metal, 0, -0.4, 0, up, 6); const lo = piv(0, -0.8, 0, up); lo.rotation.z = x < 0 ? -1.2 : 1.2; cy(0.06, 0.03, 1.05, dark, 0, -0.52, 0, lo, 6); legs.push(up); }
    return { g, head, laser, flash, legs, eye };
  },
  vacuum() {
    const g = new THREE.Group(), red = sigMat(0xc83a3a), grey = sigMat(0x777c82), dark = sigMat(0x1e1e1e), glow = sigMat(0x80ffee, { em: 0x40c0b0 });
    const body = piv(0, 0, 0, g); body.scale.setScalar(1.35);
    bx(1.2, 0.35, 1.0, grey, 0, 0.27, 0, body); bx(1.1, 0.12, 0.08, glow, 0, 0.14, -0.52, body);
    for (const [x, z] of [[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]]) cy(0.13, 0.13, 0.1, dark, x, 0.13, z, body, 10).rotation.z = Math.PI / 2;
    cy(0.38, 0.44, 1.5, red, 0, 1.2, 0.15, body, 12); sp(0.38, sigMat(0x4a4a7a), 0, 1.45, 0.42, body, 1, 1.3, 0.6);
    sp(0.07, sigMat(0xff1010, { em: 0xff0000 }), -0.14, 1.5, -0.24, body); sp(0.07, sigMat(0xff1010, { em: 0xff0000 }), 0.14, 1.5, -0.24, body);
    bx(0.3, 0.05, 0.04, dark, 0, 1.25, -0.37, body);
    cy(0.05, 0.05, 1.0, grey, 0, 2.4, 0.2, body, 6); bx(0.5, 0.1, 0.12, dark, 0, 2.92, 0.2, body);
    const ring = mk(new THREE.TorusGeometry(0.45, 0.04, 6, 16), glow, 0, 0.3, -0.75, body);
    return { g, body, ring };
  },
  turkey() {
    const g = new THREE.Group(), br = sigMat(0x5a3a22), dk = sigMat(0x2a160c), red = sigMat(0xc01818, { em: 0x400000 }), beak = sigMat(0xd8a020), eye = sigMat(0xff2020, { em: 0xff0000 }), leg = sigMat(0xc08030);
    sp(0.8, br, 0, 1.15, 0, g, 1, 0.95, 1.1);
    const fan = piv(0, 1.4, 0.65, g); fan.rotation.x = -0.35;
    for (let i = 0; i < 9; i++) { const a = -1.15 + i * 0.29; const f = piv(0, 0, 0, fan); f.rotation.z = a; bx(0.32, 1.5, 0.05, i % 2 ? dk : br, 0, 0.75, 0, f); bx(0.3, 0.25, 0.06, sigMat(0xd8702a), 0, 1.45, 0, f); }
    for (const s of [-1, 1]) sp(0.5, dk, s * 0.7, 1.15, 0.1, g, 0.3, 0.7, 1);
    cy(0.13, 0.2, 0.75, br, 0, 1.75, -0.55, g, 8).rotation.x = -0.4;
    const head = piv(0, 2.1, -0.75, g); sp(0.23, sigMat(0xc8a090), 0, 0, 0, head);
    sp(0.06, eye, -0.12, 0.06, -0.17, head); sp(0.06, eye, 0.12, 0.06, -0.17, head);
    cn(0.08, 0.25, beak, 0, -0.03, -0.3, head).rotation.x = -Math.PI / 2;
    sp(0.08, red, 0.03, -0.2, -0.22, head, 0.7, 1.6, 0.7);
    for (const s of [-1, 1]) { const h = cn(0.06, 0.32, sigMat(0x111111), s * 0.13, 0.25, 0, head); h.rotation.z = -s * 0.4; }
    const tp = piv(0, -0.04, -0.36, head); const tongue = bx(0.09, 0.05, 1, sigMat(0xff6a8a, { em: 0x401020 }), 0, 0, -0.5, tp); tp.scale.z = 0.01;
    const tip = sp(0.12, sigMat(0xff4a7a), 0, 0, -1, tp, 1, 0.6, 0.06);
    const legL = limb(0.65, 0.05, leg, g, -0.3, 0.65, 0), legR = limb(0.65, 0.05, leg, g, 0.3, 0.65, 0);
    return { g, head, tp, legL, legR, fan };
  },
  ron() {
    const g = new THREE.Group(), red = sigMat(0xe02020), blue = sigMat(0x2a60e0), yel = sigMat(0xffd020), blk = sigMat(0x111111);
    sp(0.28, red, 0, 0, 0, g, 0.9, 1, 1.3);
    const head = piv(0, 0.25, -0.28, g); sp(0.2, red, 0, 0, 0, head); sp(0.06, sigMat(0xffffff), -0.12, 0.05, -0.1, head); sp(0.06, sigMat(0xffffff), 0.12, 0.05, -0.1, head); sp(0.03, blk, -0.15, 0.05, -0.13, head); sp(0.03, blk, 0.15, 0.05, -0.13, head);
    const bk = cn(0.08, 0.22, blk, 0, -0.06, -0.22, head); bk.rotation.x = -2.2;
    const wings = [];
    for (const s of [-1, 1]) { const w = piv(s * 0.2, 0.05, 0, g); bx(0.55, 0.05, 0.38, red, s * 0.28, 0, 0, w); bx(0.3, 0.05, 0.36, blue, s * 0.65, 0, 0.02, w); bx(0.2, 0.05, 0.3, yel, s * 0.86, 0, 0.04, w); wings.push(w); }
    bx(0.12, 0.04, 0.6, blue, -0.05, -0.05, 0.6, g); bx(0.12, 0.04, 0.55, yel, 0.07, -0.05, 0.58, g);
    return { g, head, wings };
  },
  hijack(face) { const M = makeTV(0x4a8a3a, face || presetFace('evil', '#ff3050', '#120006'), { sig: true, glitch: true, casing: 0x2a2a30 }); return Object.assign(M, { hj: true }); },
  computer() {
    const g = new THREE.Group(), blob = sigMat(0x3a2a5a), blob2 = sigMat(0x5a3a8a), beige = sigMat(0xd8d0b8), grey = sigMat(0x6a6a70);
    const real = piv(0, 0, 0, g);
    sp(0.8, blob, 0, 0.7, 0, real, 1.1, 0.85, 1.1);
    for (let i = 0; i < 7; i++) sp(0.3 + (i % 3) * 0.08, blob2, Math.cos(i * 0.9) * 0.75, 0.3 + (i % 2) * 0.5, Math.sin(i * 0.9) * 0.75, real);
    const head = piv(0, 1.55, -0.1, real); bx(0.95, 0.75, 0.75, beige, 0, 0.3, 0, head); bx(0.6, 0.15, 0.4, beige, 0, -0.1, 0.2, head);
    const scr = mk(new THREE.PlaneGeometry(0.75, 0.55), new THREE.MeshBasicMaterial({ map: compTex() }), 0, 0.32, -0.38, head); scr.rotation.y = Math.PI;
    for (const [x, y, z, ry] of [[-0.55, 1.2, 0.6, 0.5], [0.55, 1.25, 0.6, -0.5], [0, 1.55, 0.75, 0]]) { const tv = piv(x, y, z, real); tv.rotation.y = ry; bx(0.48, 0.38, 0.38, grey, 0, 0, 0, tv); const s = mk(new THREE.PlaneGeometry(0.38, 0.28), new THREE.MeshBasicMaterial({ map: staticTex() }), 0, 0, 0.195, tv); }
    const fake = makeArtifact(0); g.add(fake);
    return { g, real, head, scr, fake };
  },
  blanket() {
    const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(2.6, 2.2, 10, 8);
    const m = sigMat(0xffffff, { map: quiltTex(), side: DS });
    const mesh = new THREE.Mesh(geo, m); mesh.rotation.x = -Math.PI / 2; g.add(mesh);
    return { g, mesh, base: Float32Array.from(geo.attributes.position.array) };
  },
  sniff() {
    const g = new THREE.Group(), skin = sigMat(0xc89a8a), dk = sigMat(0x6a3a3a), nost = sigMat(0x150303);
    const legL = limb(2.2, 0.32, skin, g, -0.45, 2.2, 0), legR = limb(2.2, 0.32, skin, g, 0.45, 2.2, 0);
    sp(0.35, dk, 0, -2.2, -0.2, legL, 1, 0.5, 1.5); sp(0.35, dk, 0, -2.2, -0.2, legR, 1, 0.5, 1.5);
    sp(0.95, skin, 0, 3.05, 0, g, 1, 1.25, 0.7);
    const armL = limb(2.5, 0.2, skin, g, -1.0, 3.85, 0), armR = limb(2.5, 0.2, skin, g, 1.0, 3.85, 0);
    sp(0.32, dk, 0, -2.55, 0, armL); sp(0.32, dk, 0, -2.55, 0, armR);
    cy(0.25, 0.3, 0.4, skin, 0, 4.25, 0, g, 8);
    const nose = piv(0, 4.55, 0, g);
    sp(0.6, skin, 0, 0.55, -0.1, nose, 0.8, 1.35, 0.9); sp(0.62, skin, 0, -0.1, -0.45, nose); sp(0.32, skin, -0.45, -0.25, -0.3, nose); sp(0.32, skin, 0.45, -0.25, -0.3, nose);
    sp(0.17, nost, -0.2, -0.38, -0.72, nose, 1, 0.6, 1); sp(0.17, nost, 0.2, -0.38, -0.72, nose, 1, 0.6, 1);
    return { g, legL, legR, armL, armR, nose };
  },
};

/* ---------------- definitions ---------------- */
// v = views per second while filmed. atk = states that count as "scary moment" (x3 views)
const MDEF = {
  man: { n: 'Man', v: 60, r: 0.4, d: 'A black humanoid figure. Sneaks up behind you, grabs you and runs away at like mach 10 (not literally). Freezes if you look at it.', art: 'man', atk: ['grab'] },
  yeti: { n: 'Yeti', v: 70, r: 0.9, d: 'A huge Yeti. Grabs you and throws you at a wall.', atk: ['grab', 'throw', 'chase'] },
  bear: { n: 'Bear', v: 65, r: 0.55, d: 'A cute teddy bear… until it splits open and reveals a huge monstrous mouth.', art: 'bear', atk: ['open', 'lunge', 'bite'] },
  peanut: { n: 'Peanut', v: 55, r: 0.6, d: 'A distorted peanut. Slowly chases you… until it CHARGES.', art: 'peanut', atk: ['wind', 'charge'] },
  ear: { n: 'Ear', v: 55, r: 0.6, d: 'A blind ear on spider legs. It hears you walking, running and talking. Crouch to sneak past.', atk: ['hunt', 'bite'] },
  jerry: { n: 'Jerry', v: 45, r: 0.45, d: 'A turtle. If you touch it… you explode. Do NOT touch Jerry.', atk: ['arm', 'boom'] },
  lizard: { n: 'Lizard', v: 70, r: 0.9, d: 'A huge lizard that spits fireballs.', atk: ['fire'] },
  turret: { n: 'Turret', v: 55, r: 0.6, d: 'A walking turret. Red laser = run.', atk: ['aim', 'shoot'] },
  vacuum: { n: 'Vacuum', v: 45, r: 0.7, d: 'A vacuum that sucks up objects on the ground (and tries to suck up you).', atk: ['suck'] },
  turkey: { n: 'Turkey', v: 70, r: 0.7, d: 'A demonic turkey with a huge tongue that stretches out to grab players.', atk: ['tongue', 'pull', 'peck'] },
  ron: { n: 'Ron', v: 45, r: 0.3, d: 'A red parrot. If it sees you it SQUAWKS and alerts every other monster.', atk: ['alert'] },
  hijack: { n: 'Hijack', v: 65, r: 0.4, d: 'A player who got infected with a virus. If it kills you, you become a Hijack too.', atk: ['chase', 'hit'] },
  computer: { n: 'Computer', v: 70, r: 0.7, d: 'A mimic. A blob with a computer for a head and TVs on its back. It disguises itself as loot.', atk: ['reveal', 'chase', 'bite'] },
  blanket: { n: 'Blanket', v: 600, r: 0.5, d: '1 in 3000 chance to spawn. A flying blanket that dive bombs you. Film it for MASSIVE views.', atk: ['dive'], rare: true },
  sniff: { n: 'Sniff', v: 420, r: 0.9, d: 'BOSS. Only appears if a Hijack and a Computer run into each other in the SERVER ROOM. Blue screen of death… the gates open… a giant with a nose for a head walks out. Super deadly. Gives LOTS of views.', atk: ['hunt', 'grab', 'sniff'], boss: true },
};
const MTYPES = Object.keys(MDEF);
const SPAWN_POOL = ['man', 'yeti', 'bear', 'peanut', 'ear', 'jerry', 'lizard', 'turret', 'vacuum', 'turkey', 'ron', 'hijack', 'computer'];
const SPAWN_W = { hijack: 1.4, computer: 1.4, jerry: 0.8, ron: 0.9 };
function rollMonster() {
  if (Math.random() < 1 / 3000) return 'blanket';
  const tot = SPAWN_POOL.reduce((s, t) => s + (SPAWN_W[t] || 1), 0); let r = Math.random() * tot;
  for (const t of SPAWN_POOL) { r -= SPAWN_W[t] || 1; if (r <= 0) return t; } return 'man';
}

/* ---------------- create / remove ---------------- */
let _mid = 0;
function createMon(id, type, x, z, face) {
  const M = BUILD[type](face); const m = { id, type, x, z, y: 0, rot: Math.random() * 6, st: 'idle', stT: 0, spd: 0, e: 0, M, d: {}, cd: 2, think: 0, path: null, pathT: 0, grab: null, nx: x, nz: z, ny: 0, nrot: 0, face, flyH: 0 };
  m.nrot = m.rot; if (type === 'computer') m.st = 'hide';
  if (type === 'ron') m.y = 3; if (type === 'blanket') m.y = 3.5;
  M.g.position.set(x, m.y, z); MAP.group.add(M.g); MON.set(id, m); return m;
}
function spawnMon(type, x, z, face) { // host only
  const id = 'm' + (++_mid) + '_' + Math.floor(Math.random() * 1e4);
  const m = createMon(id, type, x, z, face);
  netEvent({ t: 'mspawn', id, type, x, z, face: face || null });
  return m;
}
function removeMon(id) { const m = MON.get(id); if (!m) return; if (m.M.g.parent) m.M.g.parent.remove(m.M.g); MON.delete(id); }
function clearMons() { MON.forEach((m, id) => removeMon(id)); PROJ.length = 0; projMeshes.forEach(p => W.s.remove(p)); projMeshes.length = 0; MON_ALERT = null; }

/* ---------------- animation (everyone) ---------------- */
function animMon(m, dt) {
  const M = m.M, t = W.t, sp2 = m.spd || 0;
  M.g.position.set(m.x, m.y, m.z); M.g.rotation.y = m.rot;
  m.walk = (m.walk || 0) + dt * Math.min(sp2, 10) * 2.2; const sw = Math.sin(m.walk) * Math.min(1, sp2 / 2);
  switch (m.type) {
    case 'man': { const run = m.st === 'grab'; M.body.rotation.x = run ? 0.5 : 0.18; M.legL.rotation.x = sw * (run ? 1.2 : 0.7); M.legR.rotation.x = -sw * (run ? 1.2 : 0.7); M.armL.rotation.x = run ? -1.4 : -sw * 0.6; M.armR.rotation.x = run ? -1.4 : sw * 0.6; M.head.rotation.z = m.st === 'freeze' ? 0.25 : Math.sin(t * 0.7) * 0.08; break; }
    case 'yeti': { M.legL.rotation.x = sw * 0.6; M.legR.rotation.x = -sw * 0.6; const g = m.st === 'grab'; M.armL.rotation.x = g ? -2.2 : -sw * 0.5; M.armR.rotation.x = g ? -2.2 : sw * 0.5; if (m.st === 'throw') { M.armL.rotation.x = M.armR.rotation.x = -2.8 + m.stT * 3; } M.head.rotation.x = m.st === 'chase' ? 0.2 : 0; break; }
    case 'bear': { const o = ['open', 'lunge', 'bite'].includes(m.st) ? 1 : 0; M.open = lerp(M.open, o, Math.min(1, dt * 8)); M.hinges[0].rotation.y = M.open * 0.9; M.hinges[1].rotation.y = -M.open * 0.9; M.drool.visible = M.open > 0.5; M.S.position.y = Math.abs(Math.sin(m.walk)) * 0.08 * Math.min(1, sp2); M.S.rotation.z = Math.sin(m.walk) * 0.08 * Math.min(1, sp2); M.S.scale.setScalar(1.15 + M.open * 0.35); break; }
    case 'peanut': { M.legL.rotation.x = sw; M.legR.rotation.x = -sw; M.body.rotation.x = m.st === 'charge' ? 0.5 : m.st === 'wind' ? -0.3 : 0.05; const wob = 1 + Math.sin(t * 9) * 0.03; M.body.scale.set(wob, 2 - wob, wob); M.wL.rotation.z = -0.25 + Math.sin(t * 3) * 0.1; M.wR.rotation.z = 0.25 - Math.sin(t * 3) * 0.1; if (m.st === 'stun') M.body.rotation.z = Math.sin(t * 20) * 0.2; break; }
    case 'ear': { M.legs.forEach((l, i) => { l.up.rotation.x = Math.sin(m.walk * 1.5 + i * 1.3) * 0.35 * Math.min(1, sp2); }); M.ear.rotation.z = m.st === 'listen' ? Math.sin(t * 14) * 0.15 : Math.sin(t * 2) * 0.05; M.ear.rotation.y = m.st === 'hunt' ? Math.sin(t * 6) * 0.2 : 0; break; }
    case 'jerry': { M.legs.forEach((l, i) => l.position.y = 0.12 + Math.max(0, Math.sin(m.walk * 2 + i * 1.6)) * 0.06); M.light.visible = (t * (m.st === 'arm' ? 8 : 1.5)) % 1 < 0.5; M.head.position.z = -0.62 + Math.sin(t * 2) * 0.03; break; }
    case 'lizard': { M.legs.forEach((l, i) => l.rotation.x = Math.sin(m.walk + i * 1.6) * 0.4 * Math.min(1, sp2)); M.tail.forEach((p, i) => p.rotation.y = Math.sin(t * 2.5 - i * 0.6) * 0.25); const f = m.st === 'fire'; M.jaw.rotation.x = lerp(M.jaw.rotation.x, f ? 0.55 : 0.05, Math.min(1, dt * 10)); M.glow.scale.y = f ? 0.45 : 0.22; break; }
    case 'turret': { M.legs.forEach((l, i) => l.rotation.x = Math.sin(m.walk * 1.4 + i * 1.57) * 0.3 * Math.min(1, sp2)); M.laser.visible = m.st === 'aim' || m.st === 'shoot'; M.flash.visible = m.st === 'shoot' && (t * 16) % 1 < 0.4; M.head.rotation.x = m.e || 0; break; }
    case 'vacuum': { const s = m.st === 'suck'; M.ring.rotation.z += dt * (s ? 20 : 3); M.ring.scale.setScalar(s ? 1 + Math.sin(t * 20) * 0.1 : 1); M.body.position.y = Math.abs(Math.sin(m.walk * 1.5)) * 0.04; M.body.rotation.z = s ? Math.sin(t * 30) * 0.03 : 0; break; }
    case 'turkey': { M.legL.rotation.x = sw * 0.8; M.legR.rotation.x = -sw * 0.8; M.tp.scale.z = Math.max(0.01, m.e || 0); M.head.rotation.x = m.st === 'peck' ? Math.sin(t * 25) * 0.4 + 0.3 : 0; M.fan.rotation.x = -0.35 + Math.sin(t * 3) * 0.05; M.g.position.y = m.y + Math.abs(Math.sin(m.walk)) * 0.06; break; }
    case 'ron': { const f = Math.sin(t * (m.st === 'alert' ? 30 : 16)); M.wings[0].rotation.z = f * 0.7; M.wings[1].rotation.z = -f * 0.7; M.head.rotation.x = m.st === 'alert' ? Math.sin(t * 20) * 0.3 : 0; break; }
    case 'hijack': { animTV(M, sp2, dt, { pitch: 0 }); M.screen.material.color.setHex(m.st === 'bsod' ? 0x3060ff : (Math.random() < 0.08 ? 0x40ffd0 : 0xffffff)); if (m.st === 'chase') M.root.rotation.z = Math.sin(t * 25) * 0.05; break; }
    case 'computer': {
      const hide = m.st === 'hide'; M.real.visible = !hide; M.fake.visible = hide;
      const s = m.st === 'reveal' ? Math.min(1, 0.2 + m.stT * 1.6) : 1; M.real.scale.set(s * (1 + Math.sin(t * 5) * 0.04), s * (1 - Math.sin(t * 5) * 0.04), s);
      M.scr.material.map = m.st === 'bsod' ? bsodTex() : compTex(); M.head.rotation.z = Math.sin(t * 3) * 0.1; break;
    }
    case 'blanket': {
      const p = M.mesh.geometry.attributes.position, b = M.base;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1]; p.array[i * 3 + 2] = Math.sin(x * 2 + t * 7) * 0.18 + Math.sin(y * 3 + t * 5) * 0.12; }
      p.needsUpdate = true; M.mesh.rotation.x = -Math.PI / 2 + (m.st === 'dive' ? 0.9 : 0.15); break;
    }
    case 'sniff': { M.legL.rotation.x = sw * 0.5; M.legR.rotation.x = -sw * 0.5; const g = m.st === 'grab'; M.armL.rotation.x = g ? -1.7 : -sw * 0.4; M.armR.rotation.x = g ? -1.7 : sw * 0.4; const sn = m.st === 'sniff'; M.nose.rotation.x = sn ? -0.4 + Math.sin(t * 12) * 0.1 : 0; M.nose.scale.setScalar(sn ? 1 + Math.sin(t * 14) * 0.08 : 1); break; }
  }
}

/* ---------------- AI helpers (host) ---------------- */
function setSt(m, st) { if (m.st !== st) { m.st = st; m.stT = 0; } }
function mFace(m, x, z, dt, rate = 7) { const a = Math.atan2(-(x - m.x), -(z - m.z)); m.rot += angDiff(m.rot, a) * Math.min(1, dt * rate); }
function mStep(m, dx, dz, spd, dt) { const p = { x: m.x + dx * spd * dt, z: m.z + dz * spd * dt, y: 0 }; const hit = collide('sig', p, Math.min(0.45, MDEF[m.type].r)); m.x = p.x; m.z = p.z; m.spd = spd; return hit; }
function mGo(m, tx, tz, spd, dt) {
  m.pathT -= dt;
  if (!m.path || m.pathT <= 0 || !m.goal || Math.hypot(m.goal.x - tx, m.goal.z - tz) > 1.5) { m.path = findPath(m.x, m.z, tx, tz); m.pathT = 0.7 + Math.random() * 0.5; m.goal = { x: tx, z: tz }; }
  if (!m.path || !m.path.length) { m.spd = 0; return false; }
  const p = m.path[0]; const dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz);
  if (d < 0.35) { m.path.shift(); if (!m.path.length) { m.spd = 0; return false; } return true; }
  mFace(m, p.x, p.z, dt); mStep(m, dx / d, dz / d, spd, dt); return true;
}
function mWander(m, dt, spd) {
  if (MON_ALERT && MON_ALERT.t > 0 && m.type !== 'ron' && Math.hypot(MON_ALERT.x - m.x, MON_ALERT.z - m.z) < 45) { if (mGo(m, MON_ALERT.x, MON_ALERT.z, spd * 1.8, dt)) return; }
  m.d.wt = (m.d.wt || 0) - dt;
  if (!m.d.w || m.d.wt <= 0 || Math.hypot(m.d.w.x - m.x, m.d.w.z - m.z) < 0.8) {
    const toRoom = (m.type === 'hijack' || m.type === 'computer') && Math.random() < 0.45;
    m.d.w = toRoom ? { x: MAP.room.cx + rnd(-1.5, 1.5), z: MAP.room.cz + rnd(-1.5, 1.5) } : randomSpot(); m.d.wt = rnd(8, 16);
  }
  if (!mGo(m, m.d.w.x, m.d.w.z, spd, dt)) m.d.wt = 0;
}
const fwd = r => [-Math.sin(r), -Math.cos(r)];
function nearestActor(m, range, needLos = true, filter) {
  let best = null, bd = range;
  ACT.forEach(a => { if (!a.alive || a.grab || (filter && !filter(a))) return; const d = Math.hypot(a.x - m.x, a.z - m.z); if (d < bd && (!needLos || los(m.x, m.z, a.x, a.z))) { bd = d; best = a; } });
  return best;
}
function think(m, dt, fn) { m.think -= dt; if (m.think <= 0) { m.think = 0.2 + Math.random() * 0.05; fn(); } }
function tgtOf(m) { const a = m.tgt && ACT.get(m.tgt); return a && a.alive ? a : null; }
function snd(n, x, z, vol = 1) { netEvent({ t: 'snd', n, x, z, v: vol }); }

/* ---------------- AI per monster (host) ---------------- */
const AI = {
  man(m, dt) {
    if (m.st === 'grab') {
      if (!m.d.run) m.d.run = randomSpot(m, 22);
      const ok = mGo(m, m.d.run.x, m.d.run.z, 13, dt);
      if (m.stT > 2.8 || !ok) { const a = ACT.get(m.grab); const [fx, fz] = fwd(m.rot); if (a) releaseActor(a, fx * 9, fz * 9, 4, 30, 'the Man'); m.grab = null; m.d.run = null; setSt(m, 'idle'); m.cd = 12; }
      return;
    }
    m.cd -= dt; think(m, dt, () => { const a = nearestActor(m, 32); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (a && m.cd <= 0) {
      const [fx, fz] = fwd(a.yaw); const dx = m.x - a.x, dz = m.z - a.z, d = Math.hypot(dx, dz) || 1;
      const looking = (fx * dx + fz * dz) / d > 0.6 && d > 1.6;
      if (looking) { setSt(m, 'freeze'); m.spd = 0; return; }
      setSt(m, 'stalk'); mGo(m, a.x - fx * 0.9, a.z - fz * 0.9, 4.8, dt);
      if (d < 1.3) { setSt(m, 'grab'); m.grab = a.id; grabActor(a, m); snd('grab', m.x, m.z); }
    } else { setSt(m, 'idle'); mWander(m, dt, 1.4); }
  },
  yeti(m, dt) {
    if (m.st === 'grab') { m.spd = 0; if (m.stT > 1.0) { const a = ACT.get(m.grab); const [fx, fz] = fwd(m.rot); if (a) releaseActor(a, fx * 17, fz * 17, 6, 12, 'the Yeti', true); m.grab = null; setSt(m, 'throw'); m.cd = 5; snd('roar', m.x, m.z); } return; }
    if (m.st === 'throw') { if (m.stT > 0.7) setSt(m, 'idle'); return; }
    m.cd -= dt; think(m, dt, () => { const a = nearestActor(m, 22); if (a && !m.tgt) snd('roar', m.x, m.z, 0.7); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (a) { setSt(m, 'chase'); mGo(m, a.x, a.z, 4.3, dt); if (Math.hypot(a.x - m.x, a.z - m.z) < 2 && m.cd <= 0) { setSt(m, 'grab'); m.grab = a.id; grabActor(a, m); snd('grab', m.x, m.z); } }
    else { setSt(m, 'idle'); mWander(m, dt, 1.6); }
  },
  bear(m, dt) {
    m.cd -= dt;
    if (m.st === 'open') { m.spd = 0; const a = tgtOf(m); if (a) mFace(m, a.x, a.z, dt); if (m.stT > 0.75) setSt(m, 'lunge'); return; }
    if (m.st === 'lunge') { const a = tgtOf(m); if (!a || m.stT > 4.5) { setSt(m, 'close'); return; } mGo(m, a.x, a.z, 6.2, dt); if (Math.hypot(a.x - m.x, a.z - m.z) < 1.4) { const [fx, fz] = fwd(m.rot); hurtActor(a, 45, fx * 7, fz * 7, 3, 'the Bear'); setSt(m, 'bite'); snd('bite', m.x, m.z); } return; }
    if (m.st === 'bite') { m.spd = 0; if (m.stT > 0.6) setSt(m, 'close'); return; }
    if (m.st === 'close') { m.spd = 0; if (m.stT > 1) { setSt(m, 'idle'); m.cd = 7; } return; }
    think(m, dt, () => { const a = nearestActor(m, 7.5); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (a && m.cd <= 0) { setSt(m, 'open'); snd('growl', m.x, m.z); }
    else { setSt(m, 'idle'); mWander(m, dt, 1.0); }
  },
  peanut(m, dt) {
    m.cd -= dt;
    if (m.st === 'wind') { m.spd = 0; const a = tgtOf(m); if (a) mFace(m, a.x, a.z, dt, 12); if (m.stT > 0.8) { setSt(m, 'charge'); snd('whoosh', m.x, m.z); } return; }
    if (m.st === 'charge') {
      const [fx, fz] = fwd(m.rot); const hit = mStep(m, fx, fz, 13, dt);
      ACT.forEach(a => { if (a.alive && !a.grab && Math.hypot(a.x - m.x, a.z - m.z) < 1.3) { hurtActor(a, 40, fx * 10, fz * 10, 4, 'the Peanut'); m.stT = 9; } });
      if (hit || m.stT > 1.4) { setSt(m, hit ? 'stun' : 'idle'); m.cd = 5; if (hit) snd('land', m.x, m.z); }
      return;
    }
    if (m.st === 'stun') { m.spd = 0; if (m.stT > 1.6) setSt(m, 'idle'); return; }
    think(m, dt, () => { const a = nearestActor(m, 36, false); m.tgt = a ? a.id : null; m.d.see = a && los(m.x, m.z, a.x, a.z); });
    const a = tgtOf(m);
    if (a) { const d = Math.hypot(a.x - m.x, a.z - m.z); setSt(m, 'chase'); mGo(m, a.x, a.z, 1.7, dt); if (d < 11 && m.d.see && m.cd <= 0) setSt(m, 'wind'); }
    else { setSt(m, 'idle'); mWander(m, dt, 1.2); }
  },
  ear(m, dt) {
    m.cd -= dt;
    think(m, dt, () => {
      let best = null, bd = 1e9; ACT.forEach(a => { if (!a.alive || a.grab) return; const rad = [0, 9, 20, 45][a.noise || 0]; const d = Math.hypot(a.x - m.x, a.z - m.z); if (d < rad && d < bd) { bd = d; best = a; } });
      if (best) { m.d.heard = { x: best.x, z: best.z }; if (m.st !== 'hunt') snd('growl', m.x, m.z, 0.5); setSt(m, 'hunt'); }
    });
    if (m.st === 'hunt') {
      if (!m.d.heard || !mGo(m, m.d.heard.x, m.d.heard.z, 3.9, dt) || Math.hypot(m.d.heard.x - m.x, m.d.heard.z - m.z) < 0.6) { m.d.heard = null; setSt(m, 'listen'); }
      ACT.forEach(a => { if (a.alive && !a.grab && m.cd <= 0 && Math.hypot(a.x - m.x, a.z - m.z) < 1.3) { const [fx, fz] = fwd(m.rot); hurtActor(a, 30, fx * 5, fz * 5, 2, 'the Ear'); m.cd = 2; snd('bite', m.x, m.z); } });
      return;
    }
    if (m.st === 'listen') { m.spd = 0; if (m.stT > 1.6) setSt(m, 'idle'); return; }
    mWander(m, dt, 1.3);
  },
  jerry(m, dt) {
    let close = 99; ACT.forEach(a => { if (a.alive) close = Math.min(close, Math.hypot(a.x - m.x, a.z - m.z)); });
    if (close < 1.05) { // BOOM
      netEvent({ t: 'boom', x: m.x, z: m.z });
      ACT.forEach(a => { const d = Math.hypot(a.x - m.x, a.z - m.z); if (a.alive && d < 4.6) { const k = 1 - d / 4.6; const dx = (a.x - m.x) / (d || 1), dz = (a.z - m.z) / (d || 1); hurtActor(a, Math.round(20 + k * 100), dx * 14 * k, dz * 14 * k, 6 * k + 2, 'Jerry (they touched Jerry)'); } });
      m.dead = true; return;
    }
    setSt(m, close < 3.5 ? 'arm' : 'idle'); mWander(m, dt, 0.7);
  },
  lizard(m, dt) {
    m.cd -= dt;
    think(m, dt, () => { const a = nearestActor(m, 24); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (m.st === 'fire') { m.spd = 0; if (a) mFace(m, a.x, a.z, dt); if (m.stT > 0.45) setSt(m, a ? 'aim' : 'idle'); return; }
    if (a) {
      const d = Math.hypot(a.x - m.x, a.z - m.z); setSt(m, 'aim'); mFace(m, a.x, a.z, dt);
      if (d > 11) mGo(m, a.x, a.z, 2.6, dt); else m.spd = 0;
      if (m.cd <= 0 && Math.abs(angDiff(m.rot, Math.atan2(-(a.x - m.x), -(a.z - m.z)))) < 0.4) {
        const [fx, fz] = fwd(m.rot); const sx = m.x + fx * 2.6, sz = m.z + fz * 2.6, dd = Math.hypot(a.x - sx, a.z - sz) || 1;
        addProj('fire', sx, 1.2, sz, (a.x - sx) / dd * 13, ((a.y || 0) + 1 - 1.2) / dd * 13, (a.z - sz) / dd * 13, 25, 'the Lizard'); m.cd = 1.7; setSt(m, 'fire'); snd('fire', m.x, m.z);
      }
    } else { setSt(m, 'idle'); mWander(m, dt, 1.4); }
  },
  turret(m, dt) {
    m.cd -= dt;
    think(m, dt, () => { const a = nearestActor(m, 26); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (m.st === 'aim') { m.spd = 0; if (a) mFace(m, a.x, a.z, dt, 4); if (m.stT > 1.1) { setSt(m, 'shoot'); m.d.n = 0; } return; }
    if (m.st === 'shoot') {
      m.spd = 0; if (a) mFace(m, a.x, a.z, dt, 3); m.d.st = (m.d.st || 0) - dt;
      if (m.d.st <= 0 && m.d.n < 6) { m.d.st = 0.13; m.d.n++; const [fx, fz] = fwd(m.rot + rnd(-0.05, 0.05)); addProj('bullet', m.x + fx * 1.4, 1.6, m.z + fz * 1.4, fx * 32, -0.6, fz * 32, 9, 'the Turret'); snd('shoot', m.x, m.z); }
      if (m.d.n >= 6 && m.stT > 1) { setSt(m, 'walk'); m.cd = 2.2; } return;
    }
    if (a && m.cd <= 0) { setSt(m, 'aim'); snd('beepbeep', m.x, m.z); }
    else { setSt(m, 'walk'); mWander(m, dt, 1.5); }
  },
  vacuum(m, dt) {
    m.cd -= dt; let pulling = false; const [fx, fz] = fwd(m.rot);
    ACT.forEach(a => { if (!a.alive || a.grab) return; const dx = m.x - a.x, dz = m.z - a.z, d = Math.hypot(dx, dz); if (d < 6.5 && d > 0.1 && (-fx * dx - fz * dz) / d > 0.4) { pulling = true; pushActor(a, dx / d * 3.2, dz / d * 3.2, dt); if (d < 1.5 && m.cd <= 0) { hurtActor(a, 9, -dx / d * 3, -dz / d * 3, 1, 'the Vacuum'); m.cd = 0.6; } } });
    think(m, dt, () => {
      let best = null, bd = 25; MAP.artifacts.forEach(t => { const d = Math.hypot(t.x - m.x, t.z - m.z); if (d < bd) { bd = d; best = t; } }); m.d.art = best;
      if (best && bd < 2.6) { netEvent({ t: 'suck', id: best.id, x: best.x, z: best.z }); m.d.art = null; }
      const a = nearestActor(m, 12); m.tgt = a ? a.id : null;
    });
    setSt(m, pulling ? 'suck' : 'idle');
    const a = tgtOf(m);
    if (a) mGo(m, a.x, a.z, 2.0, dt); else if (m.d.art) mGo(m, m.d.art.x, m.d.art.z, 2.0, dt); else mWander(m, dt, 1.6);
  },
  turkey(m, dt) {
    m.cd -= dt; const [fx, fz] = fwd(m.rot);
    if (m.st === 'tongue') {
      m.spd = 0; m.e += dt * 22; const a = tgtOf(m);
      if (a) { const tx = m.x + fx * (m.e + 0.8), tz = m.z + fz * (m.e + 0.8); if (Math.hypot(a.x - tx, a.z - tz) < 1.2 && !a.grab) { m.grab = a.id; grabActor(a, m); setSt(m, 'pull'); snd('tongue', m.x, m.z); return; } }
      if (m.e > 10) setSt(m, 'retract'); return;
    }
    if (m.st === 'pull') { m.spd = 0; m.e = Math.max(0.6, m.e - dt * 7); if (m.e <= 0.7) setSt(m, 'peck'); return; }
    if (m.st === 'peck') { m.spd = 0; if (m.stT > 0.8) { const a = ACT.get(m.grab); if (a) releaseActor(a, fx * 6, fz * 6, 3, 35, 'the Turkey'); m.grab = null; m.e = 0; setSt(m, 'idle'); m.cd = 5; snd('gobble', m.x, m.z); } return; }
    if (m.st === 'retract') { m.spd = 0; m.e = Math.max(0, m.e - dt * 20); if (m.e <= 0) { setSt(m, 'idle'); m.cd = 3; } return; }
    think(m, dt, () => { const a = nearestActor(m, 16); if (a && !m.tgt) snd('gobble', m.x, m.z, 0.7); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (a) { const d = Math.hypot(a.x - m.x, a.z - m.z); setSt(m, 'chase'); mGo(m, a.x, a.z, 2.4, dt); if (d < 10 && m.cd <= 0 && los(m.x, m.z, a.x, a.z)) { mFace(m, a.x, a.z, 1); m.e = 0; setSt(m, 'tongue'); } }
    else { setSt(m, 'idle'); mWander(m, dt, 1.5); }
  },
  ron(m, dt) {
    m.cd -= dt; m.y = lerp(m.y, Math.min(3.2, (MAPS[MAP.type].H || 6) - 0.7), dt * 2);
    if (m.st === 'alert') { m.spd = 0; const a = tgtOf(m); if (a) { mFace(m, a.x, a.z, dt); MON_ALERT = { x: a.x, z: a.z, t: 10 }; } if (m.stT > 1.6) { setSt(m, 'idle'); m.cd = 12; m.d.w = randomSpot(m, 15); } return; }
    think(m, dt, () => { const a = nearestActor(m, 20); m.tgt = a ? a.id : null; });
    if (tgtOf(m) && m.cd <= 0) { setSt(m, 'alert'); snd('squawk', m.x, m.z); netEvent({ t: 'alert' }); return; }
    setSt(m, 'idle'); mWander(m, dt, 4);
  },
  hijack(m, dt) {
    m.cd -= dt;
    if (m.st === 'bsod') { m.spd = 0; if (m.stT > 6) setSt(m, 'idle'); return; }
    think(m, dt, () => { const a = nearestActor(m, 13); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (a) { setSt(m, 'chase'); mGo(m, a.x, a.z, 5.0, dt); if (Math.hypot(a.x - m.x, a.z - m.z) < 1.2 && m.cd <= 0) { const [fx, fz] = fwd(m.rot); hurtActor(a, 28, fx * 6, fz * 6, 2, 'a Hijack', m); m.cd = 1.5; snd('hit', m.x, m.z); } }
    else { setSt(m, 'idle'); mWander(m, dt, 2.6); }
  },
  computer(m, dt) {
    m.cd -= dt;
    if (m.st === 'bsod') { m.spd = 0; if (m.stT > 6) setSt(m, 'idle'); return; }
    if (m.st === 'hide') { m.spd = 0; if (m.stT > 4 && nearestActor(m, 2.2, false)) { setSt(m, 'reveal'); snd('static', m.x, m.z); } else if (m.stT > 35) setSt(m, 'idle'); return; }
    if (m.st === 'reveal') { m.spd = 0; if (m.stT > 0.6) { const a = nearestActor(m, 15); m.tgt = a ? a.id : null; setSt(m, 'chase'); } return; }
    if (m.st === 'chase') {
      const a = tgtOf(m); if (!a || m.stT > 9) { setSt(m, 'idle'); m.d.w = null; return; }
      mGo(m, a.x, a.z, 3.9, dt); if (Math.hypot(a.x - m.x, a.z - m.z) < 1.4 && m.cd <= 0) { const [fx, fz] = fwd(m.rot); hurtActor(a, 35, fx * 6, fz * 6, 3, 'the Computer'); m.cd = 1.5; snd('bite', m.x, m.z); }
      return;
    }
    // idle: wander somewhere new then disguise again
    mWander(m, dt, 2.2); if (m.stT > rnd(10, 14) && !nearestActor(m, 8)) { setSt(m, 'hide'); m.d.w = null; }
  },
  blanket(m, dt) {
    m.cd -= dt; const top = Math.min(4, (MAPS[MAP.type].H || 6) - 0.6);
    if (m.st === 'dive') {
      const v = m.d.v; m.x += v[0] * dt; m.z += v[2] * dt; m.y = Math.max(0.5, m.y + v[1] * dt); m.spd = 15; collide('sig', m, 0.4);
      ACT.forEach(a => { if (a.alive && !a.grab && Math.hypot(a.x - m.x, a.z - m.z) < 1.5 && m.y < 2.2) { hurtActor(a, 50, v[0] * 0.6, v[2] * 0.6, 4, 'the Blanket'); m.stT = 9; } });
      if (m.stT > 1.3 || m.y <= 0.55) { setSt(m, 'rise'); m.cd = 3; } return;
    }
    if (m.st === 'rise') { m.y = lerp(m.y, top, dt * 2); mWander(m, dt, 3); if (m.stT > 1.4) setSt(m, 'idle'); return; }
    m.y = lerp(m.y, top, dt * 2);
    think(m, dt, () => { const a = nearestActor(m, 18); m.tgt = a ? a.id : null; });
    const a = tgtOf(m);
    if (a && m.cd <= 0) { const dx = a.x - m.x, dz = a.z - m.z, dy = 1 - m.y, d = Math.hypot(dx, dy, dz) || 1; m.d.v = [dx / d * 15, dy / d * 15, dz / d * 15]; mFace(m, a.x, a.z, 1); setSt(m, 'dive'); snd('whoosh', m.x, m.z); }
    else { setSt(m, 'idle'); mWander(m, dt, 3.2); }
  },
  sniff(m, dt) {
    m.cd -= dt; m.d.sn = (m.d.sn || 7) - dt;
    if (m.st === 'emerge') { mGo(m, MAP.room.cx, MAP.room.cz - 1, 2.2, dt); if (m.stT > 5) setSt(m, 'hunt'); return; }
    if (m.st === 'grab') { m.spd = 0; if (m.stT > 1.3) { const a = ACT.get(m.grab); const [fx, fz] = fwd(m.rot); if (a) releaseActor(a, fx * 12, fz * 12, 5, 85, 'SNIFF', true); m.grab = null; setSt(m, 'hunt'); m.cd = 3; snd('roar', m.x, m.z); } return; }
    if (m.st === 'sniff') { m.spd = 0; if (m.stT > 1.6) { setSt(m, 'hunt'); m.d.sn = rnd(6, 9); } return; }
    if (m.d.sn <= 0) { setSt(m, 'sniff'); snd('sniff', m.x, m.z); return; }
    think(m, dt, () => { const a = nearestActor(m, 200, false); m.tgt = a ? a.id : null; });
    const a = tgtOf(m); setSt(m, 'hunt');
    if (a) { mGo(m, a.x, a.z, 3.7, dt); m.d.stp = (m.d.stp || 0) - dt; if (m.d.stp <= 0) { m.d.stp = 0.7; snd('stomp', m.x, m.z, 0.6); } if (Math.hypot(a.x - m.x, a.z - m.z) < 2.3 && m.cd <= 0) { setSt(m, 'grab'); m.grab = a.id; grabActor(a, m); snd('grab', m.x, m.z); } }
    else mWander(m, dt, 2);
  },
};
// where a grabbed player is held
function grabPoint(m) {
  const [fx, fz] = fwd(m.rot);
  switch (m.type) {
    case 'man': return { x: m.x + fx * 0.6, z: m.z + fz * 0.6, y: 0.5 };
    case 'yeti': return { x: m.x + fx * 1.4, z: m.z + fz * 1.4, y: 2.3 };
    case 'turkey': return { x: m.x + fx * ((m.e || 0) + 0.9), z: m.z + fz * ((m.e || 0) + 0.9), y: 0.6 };
    case 'sniff': return { x: m.x + fx * 1.6, z: m.z + fz * 1.6, y: 3.2 };
    default: return { x: m.x + fx, z: m.z + fz, y: 0.5 };
  }
}

/* ---------------- host monster tick ---------------- */
const SNIFF = { done: false, t: -1 };
function hostMonsters(dt) {
  if (MON_ALERT) { MON_ALERT.t -= dt; if (MON_ALERT.t <= 0) MON_ALERT = null; }
  MON.forEach(m => {
    m.stT += dt; const before = m.st;
    if (m.stun > 0) { m.stun -= dt; m.spd = 0; if (m.grab) { const a = ACT.get(m.grab); if (a) releaseActor(a, 0, 0, 2, 0, ''); m.grab = null; } return; }
    try { AI[m.type](m, dt); } catch (e) { console.warn('AI error', m.type, e); m.st = 'idle'; }
    if (m.type !== 'blanket' && m.type !== 'ron') m.y = 0;
    if (m.grab) { const a = ACT.get(m.grab); if (!a || !a.alive) m.grab = null; }
  });
  MON.forEach((m, id) => { if (m.dead) { removeMon(id); netEvent({ t: 'mdel', id }); } });
  // SNIFF event: a Hijack + a Computer run into each other in the SERVER ROOM
  if (!SNIFF.done) {
    const hs = [...MON.values()].filter(m => m.type === 'hijack' && inRoom(m.x, m.z)), cs = [...MON.values()].filter(m => m.type === 'computer' && m.st !== 'hide' && inRoom(m.x, m.z));
    for (const h of hs) for (const c of cs) if (Math.hypot(h.x - c.x, h.z - c.z) < 1.8) { SNIFF.done = true; SNIFF.t = 0; setSt(h, 'bsod'); setSt(c, 'bsod'); netEvent({ t: 'bsod' }); break; }
  } else if (SNIFF.t >= 0) {
    SNIFF.t += dt;
    if (SNIFF.t > 3.5 && !MAP.gateOpen) netEvent({ t: 'gate' });
    if (SNIFF.t > 6.5) { SNIFF.t = -1; const s = spawnMon('sniff', MAP.chamber.x, MAP.chamber.z); s.rot = Math.PI; setSt(s, 'emerge'); }
  }
  hostProj(dt);
}

/* ---------------- projectiles ---------------- */
let _pid = 0; const projMeshes = [];
function addProj(kind, x, y, z, vx, vy, vz, dmg, cause) { PROJ.push({ id: ++_pid, kind, x, y, z, vx, vy, vz, dmg, cause, life: 3 }); }
function hostProj(dt) {
  for (let i = PROJ.length - 1; i >= 0; i--) {
    const p = PROJ[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.life -= dt; let dead = p.life <= 0 || p.y < 0;
    const k = navIdx(p.x, p.z); if (k < 0 || NAV.tall[k]) dead = true;
    ACT.forEach(a => { if (dead || !a.alive) return; if (Math.hypot(a.x - p.x, a.z - p.z) < 0.6 && p.y > (a.y || 0) - 0.2 && p.y < (a.y || 0) + 2) { hurtActor(a, p.dmg, p.vx * 0.25, p.vz * 0.25, 2, p.cause); dead = true; } });
    if (dead) { if (p.kind === 'fire') netEvent({ t: 'puff', x: p.x, y: Math.max(0.3, p.y), z: p.z, c: 0xff7a20 }); PROJ.splice(i, 1); }
  }
}
function renderProj(list) {
  while (projMeshes.length < list.length) { const m = sp(1, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, -50, 0, W.s); projMeshes.push(m); }
  projMeshes.forEach((m, i) => { const p = list[i]; if (!p) { m.visible = false; return; } m.visible = true; m.position.set(p.x, p.y, p.z); const fire = p.kind === 'fire'; m.material.color.setHex(fire ? (Math.random() < 0.5 ? 0xff6a10 : 0xffc040) : 0xfff080); m.scale.setScalar(fire ? 0.35 + Math.random() * 0.08 : 0.07); });
}
