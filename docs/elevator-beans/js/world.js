'use strict';
/* Elevator Beans: 3D scene, collision, the elevator itself */
let renderer, scene, camera, hemi, sun, flash;
const SOL = []; // colliders: {x0,x1,y0,y1,z0,z1, climb, kill, off}
let FLOOR_GRP = null, L = null; // current floor group + layout
const CAB = { open: 1, grp: null, doors: [], doorSol: null, disp: null, dispCtx: null, dispTex: null, shown: '' };
const PR = .38, PH = 1.95, GRAV = 24;

function initScene() {
  const cv = $('#c');
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: P.gfx > 0, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, P.gfx > 1 ? 2 : 1.5));
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.shadowMap.enabled = P.gfx > 0; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, 1, .1, 400);
  hemi = new THREE.HemisphereLight('#ffffff', '#555566', .8); scene.add(hemi);
  sun = new THREE.DirectionalLight('#ffffff', .8); sun.position.set(10, 20, 6); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); const sc = sun.shadow.camera; sc.left = sc.bottom = -22; sc.right = sc.top = 22; sc.near = 1; sc.far = 80;
  scene.add(sun, sun.target);
  flash = new THREE.SpotLight('#fff4d6', 0, 30, .5, .5, 1); scene.add(flash, flash.target);
  buildCabin();
  const rs = () => { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.clearViewOffset(); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  window.addEventListener('resize', rs); rs();
}

/* ---- building helpers (y = bottom) ---- */
function solid(x0, x1, y0, y1, z0, z1, o) { const s = Object.assign({ x0, x1, y0, y1, z0, z1 }, o || {}); SOL.push(s); return s; }
function box(grp, x, y, z, w, h, d, color, o = {}) {
  let m = null;
  if (!o.invis) { m = mesh(BOX(), o.mat || mat(color, o.mo), x, y + h / 2, z, w, h, d); m.castShadow = !o.noShadow && h > .3; m.receiveShadow = true; grp.add(m); }
  if (o.nocol) return { mesh: m };
  const s = solid(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2, { climb: !!o.climb, kill: !!o.kill, mesh: m, floor: !o.cab });
  return s;
}
function deco(grp, o) { grp.add(o); return o; }
function clearFloor() {
  if (FLOOR_GRP) { scene.remove(FLOOR_GRP); FLOOR_GRP.traverse(o => { if (o.geometry && !Object.values(GEO).includes(o.geometry) && o.geometry !== BOX()) o.geometry.dispose(); }); }
  for (let i = SOL.length - 1; i >= 0; i--) if (SOL[i].floor) SOL.splice(i, 1);
  FLOOR_GRP = new THREE.Group(); scene.add(FLOOR_GRP);
}
function setEnv(e) {
  scene.background = new THREE.Color(e.bg); scene.fog = new THREE.Fog(e.fog || e.bg, e.near || 30, e.far || 120);
  hemi.color.set(e.sky || '#ffffff'); hemi.groundColor.set(e.gnd || '#555566'); hemi.intensity = e.hi != null ? e.hi : .8;
  sun.intensity = e.si != null ? e.si : .8; sun.color.set(e.sc || '#ffffff');
}

/* ---- the elevator: always at the origin, door faces +z ---- */
function buildCabin() {
  const g = new THREE.Group(); CAB.grp = g; scene.add(g);
  const wall = mat('#c9c2b4'), trim = mat('#b08d57'), dark = mat('#3a3d44');
  const o = { cab: true };
  box(g, 0, -.3, 0, 4.6, .3, 4.6, null, Object.assign({ mat: mat('#5b4a3f') }, o));                 // floor
  box(g, 0, 3.3, 0, 4.6, .3, 4.6, null, Object.assign({ mat: wall }, o));                         // ceiling
  box(g, 0, 0, -2.3, 4.6, 3.3, .3, null, Object.assign({ mat: wall }, o));                        // back
  box(g, -2.3, 0, 0, .3, 3.3, 4.6, null, Object.assign({ mat: wall }, o));
  box(g, 2.3, 0, 0, .3, 3.3, 4.6, null, Object.assign({ mat: wall }, o));
  // facade wall with the door hole (wide, so every floor gets a "wall of elevator")
  box(g, -4.6, -.3, 2.45, 7, 6.3, .3, null, Object.assign({ mat: dark }, o));
  box(g, 4.6, -.3, 2.45, 7, 6.3, .3, null, Object.assign({ mat: dark }, o));
  box(g, 0, 2.8, 2.45, 2.2, 3.2, .3, null, Object.assign({ mat: dark }, o));
  box(g, 0, 2.8, 2.62, 2.5, .12, .06, null, { mat: trim, nocol: 1 });
  [-1.15, 1.15].forEach(x => box(g, x, 0, 2.62, .12, 2.9, .06, null, { mat: trim, nocol: 1 }));
  // handrail + carpet + light
  box(g, 0, 1, -2.08, 3.8, .08, .1, null, { mat: trim, nocol: 1 });
  box(g, 0, .001, 0, 3.6, .02, 3.6, null, { mat: mat('#7d2e2e'), nocol: 1, noShadow: 1 });
  box(g, 0, 3.27, 0, 1.6, .04, 1.6, null, { mat: mat('#fff7e0', { emissive: '#fff1c7', emissiveIntensity: 1 }), nocol: 1, noShadow: 1 });
  const lamp = new THREE.PointLight('#ffe9b8', .9, 8); lamp.position.set(0, 3, 0); g.add(lamp);
  // big red start button on the back wall
  const bp = mesh(BOX(), mat('#d9cfbd'), 1.2, 1.35, -2.13, .5, .8, .05); g.add(bp);
  const btn = mesh(geo('btn', () => new THREE.CylinderGeometry(.16, .16, .1, 18)), mat('#e63946', { emissive: '#5a0d12' }), 1.2, 1.45, -2.08); btn.rotation.x = Math.PI / 2; g.add(btn); CAB.btn = btn;
  // doors
  for (const s of [-1, 1]) { const d = mesh(BOX(), mat('#9aa3ad'), s * .55, 1.45, 2.4, 1.1, 2.9, .12); d.castShadow = true; g.add(d); CAB.doors.push(d); }
  CAB.doorSol = solid(-1.1, 1.1, 0, 2.9, 2.3, 2.6, { cab: true, off: false });
  // floor display above the door, outside and inside
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; CAB.dispCtx = c.getContext('2d'); CAB.dispTex = new THREE.CanvasTexture(c);
  const dm = new THREE.MeshBasicMaterial({ map: CAB.dispTex });
  const d1 = mesh(geo('disp', () => new THREE.PlaneGeometry(1, 1)), dm, 0, 3.4, 2.62, 1.3, .5, 1); g.add(d1);
  const d2 = mesh(geo('disp', () => new THREE.PlaneGeometry(1, 1)), dm, 0, 3.0, 2.12, 1.1, .42, 1); d2.rotation.y = Math.PI; g.add(d2);
  drawDisplay('L', 0);
}
function drawDisplay(txt, dir) {
  const key = txt + '|' + dir; if (CAB.shown === key) return; CAB.shown = key;
  const x = CAB.dispCtx; x.fillStyle = '#120b08'; x.fillRect(0, 0, 256, 96);
  x.fillStyle = '#ff6a3d'; x.shadowColor = '#ff6a3d'; x.shadowBlur = 14; x.font = '64px "Share Tech Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(txt, 150, 52);
  if (dir) { x.beginPath(); x.moveTo(52, 22); x.lineTo(78, 56); x.lineTo(26, 56); x.closePath(); x.fill(); x.fillRect(44, 56, 16, 20); }
  x.shadowBlur = 0; CAB.dispTex.needsUpdate = true;
}
function setDoors(open) {
  CAB.open = open; CAB.doors[0].position.x = -.55 - open * 1.05; CAB.doors[1].position.x = .55 + open * 1.05;
  CAB.doorSol.off = open > .55;
}
const inCabin = (x, y, z) => Math.abs(x) < 2.15 && z > -2.15 && z < 2.35 && y > -1 && y < 3.3;

/* ---- movement + collision ---- */
function overlaps(o, s) { return !(o.y + PH <= s.y0 + .001 || o.y >= s.y1 - .001 || o.x + PR <= s.x0 || o.x - PR >= s.x1 || o.z + PR <= s.z0 || o.z - PR >= s.z1); }
function moveAxis(o, ax, d) {
  if (!d) return; o[ax] += d;
  for (const s of SOL) {
    if (s.off || !overlaps(o, s)) continue;
    if (ax === 'y') {
      if (d < 0) { o.y = s.y1; if (o.vy < 0) { o.landV = -o.vy; o.vy = 0; } o.gr = true; o.ground = s; } else { o.y = s.y0 - PH; if (o.vy > 0) o.vy = 0; o.ceil = s; }
    } else {
      const up = s.y1 - o.y;
      if (o.gr && up > 0 && up <= .5 && !o.climb && !blockedAt(o, s.y1)) { o.y = s.y1; continue; } // step up
      if (ax === 'x') { o.x = d > 0 ? s.x0 - PR : s.x1 + PR; o.wall = s; o.wn = [d > 0 ? -1 : 1, 0]; }
      else { o.z = d > 0 ? s.z0 - PR : s.z1 + PR; o.wall = s; o.wn = [0, d > 0 ? -1 : 1]; }
    }
  }
}
function blockedAt(o, y) { const t = { x: o.x, y: y + .01, z: o.z }; return SOL.some(s => !s.off && overlaps(t, s)); }
function groundBelow(x, z, y) { let best = -999; for (const s of SOL) { if (s.off || s.kill) continue; if (x > s.x0 && x < s.x1 && z > s.z0 && z < s.z1 && s.y1 <= y + .15 && s.y1 > best) best = s.y1; } return best; }
function insideSolid(x, y, z, pad = .12) { for (const s of SOL) { if (s.off) continue; if (x > s.x0 - pad && x < s.x1 + pad && y > s.y0 - pad && y < s.y1 + pad && z > s.z0 - pad && z < s.z1 + pad) return true; } return false; }
