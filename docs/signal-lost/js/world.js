'use strict';
/* worlds: the safe world (spawn house + Signal Bell) and the 5 Signal World maps */
const INTER = []; // interactables {area,x,z,y,r,label(),act(),key}
const SURF = { group: null, bell: null, spawn: { x: 0, z: -8 } };
const MAP = { group: null, type: null };
const MAPS = {
  facility: { n: 'The Facility', H: 4.2, wall: 0x6d7378, floor: 0x3a3f44, ceil: 0x24272b, dw: 2.6, loops: 0.25, open: 0.2, d: 'Abandoned research labs. Crates, pipes and blinking warning lights.' },
  shop: { n: 'The Shop', H: 5, wall: 0xd2cbb6, floor: 0x8f8f88, ceil: 0x55554f, dw: 3, loops: 0.55, open: 0.75, d: 'A dead supermarket that never closes. Aisles everywhere.' },
  city: { n: 'The City', H: 0, wall: 0x44464c, floor: 0x26272b, ceil: 0, dw: 3, loops: 0, open: 0, d: 'Empty streets, flickering lamps and buildings that watch you.' },
  halls: { n: 'The Halls', H: 3.1, wall: 0x8c9170, floor: 0x55432f, ceil: 0x6a6c55, dw: 3, loops: 0.12, open: 0, d: 'Endless narrow hallways. Lockers. Doors that go nowhere.' },
  bar: { n: 'The Bar', H: 3.6, wall: 0x5a2a24, floor: 0x3c2516, ceil: 0x1f130e, dw: 2.4, loops: 0.3, open: 0.25, d: 'Neon lights, sticky floors and a jukebox that plays static.' },
};
const MAP_KEYS = Object.keys(MAPS);
const GN = 7, CS = 8, HALF = GN * CS / 2; // 7x7 cells of 8m = 56m square
const ccx = i => SIG_X + (i - 3) * CS, ccz = j => (j - 3) * CS;

/* =================== SAFE WORLD (spawn) =================== */
function buildSurface() {
  const g = SURF.group = new THREE.Group(); W.s.add(g); const B = new Batch(); const A = 'surf';
  const grass = mat(0x5aa04a), dirt = mat(0x9a7a50), wood = mat(0xa8784a), wall = mat(0xe8dcc4), roof = mat(0xa83a2a), trim = mat(0x6a4426);
  B.box(grass, 0, -0.1, 0, 220, 0.2, 220);
  B.box(dirt, 0, 0.01, 1, 2.6, 0.02, 14);
  // house: x -9..9, z -16..-4, door in front (z=-4)
  B.box(wood, 0, 0.02, -10, 18, 0.06, 12);
  const H = 3.4;
  const wallBox = (x0, z0, x1, z1) => { B.box(wall, (x0 + x1) / 2, H / 2, (z0 + z1) / 2, Math.abs(x1 - x0) || 0.3, H, Math.abs(z1 - z0) || 0.3); addCol(A, x0 - 0.15, z0 - 0.15, x1 + 0.15, z1 + 0.15, H); };
  wallBox(-9, -16, 9, -16); wallBox(-9, -16, -9, -4); wallBox(9, -16, 9, -4); wallBox(-9, -4, -1.3, -4); wallBox(1.3, -4, 9, -4);
  B.box(wall, 0, H - 0.4, -4, 2.6, 0.8, 0.3);
  for (const s of [-1, 1]) B.box(roof, s * 4.7, H + 1.3, -10, 10.2, 0.25, 13.2, 0, 0, s * 0.5);
  B.box(roof, 0, H + 2.55, -10, 0.4, 0.3, 13.2);
  B.box(wall, 0, H + 0.6, -3.9, 9, 1.2, 0.2); B.box(wall, 0, H + 0.6, -16.1, 9, 1.2, 0.2);
  for (const x of [-6, 6]) { B.box(mat(0xbfe6ff, { em: 0x3a5a6a }), x, 1.8, -3.95, 2, 1.2, 0.1); B.box(trim, x, 1.8, -3.9, 2.2, 0.1, 0.14); }
  B.box(mat(0x8a2a3a), 0, 0.05, -9.5, 6, 0.04, 4); // rug
  // couch + TV (upload)
  B.box(mat(0x3a5a8a), 0, 0.35, -10.8, 3.4, 0.7, 1); B.box(mat(0x3a5a8a), 0, 0.85, -10.35, 3.4, 0.9, 0.3); addCol(A, -1.7, -11.3, 1.7, -10.2, 0.75);
  B.box(trim, 0, 0.4, -15.2, 3, 0.8, 1); addCol(A, -1.5, -15.8, 1.5, -14.7, 0.8);
  B.box(mat(0x2a2a30), 0, 1.45, -15.2, 2.2, 1.3, 1.1);
  SURF.tvCanvas = document.createElement('canvas'); SURF.tvCanvas.width = 320; SURF.tvCanvas.height = 192;
  SURF.tvTex = new THREE.CanvasTexture(SURF.tvCanvas);
  const tvs = mk(new THREE.PlaneGeometry(1.9, 1.05), new THREE.MeshBasicMaterial({ map: SURF.tvTex }), 0, 1.45, -14.62, g);
  drawTV('idle');
  // quota board
  SURF.qCanvas = document.createElement('canvas'); SURF.qCanvas.width = 320; SURF.qCanvas.height = 200; SURF.qTex = new THREE.CanvasTexture(SURF.qCanvas);
  B.box(trim, -5, 1.8, -15.85, 3.2, 2.1, 0.08);
  mk(new THREE.PlaneGeometry(3, 1.9), new THREE.MeshBasicMaterial({ map: SURF.qTex }), -5, 1.8, -15.79, g);
  // mirror (face editor) on the left wall
  B.box(trim, -8.85, 1.6, -8, 0.1, 2.2, 1.4); B.box(mat(0xcfefff, { em: 0x56707a }), -8.78, 1.6, -8, 0.05, 2, 1.2);
  // terminal (pick a map) on the right wall
  B.box(trim, 8.2, 0.45, -12.5, 1.2, 0.9, 2.2); addCol(A, 7.6, -13.6, 8.8, -11.4, 0.9);
  B.box(mat(0xd8d4c8), 8.3, 1.25, -12.5, 0.6, 0.6, 0.7); B.box(mat(0x2fe3a5, { em: 0x1a8a60 }), 7.99, 1.27, -12.5, 0.02, 0.45, 0.55);
  B.box(mat(0x222222), 7.9, 0.93, -12.5, 0.35, 0.04, 0.8);
  // shop vending machine
  B.box(mat(0xd83a3a), 8.3, 1.1, -6.5, 1.1, 2.2, 1.4); B.box(mat(0xbfe6ff, { em: 0x4a6a7a }), 7.73, 1.3, -6.5, 0.04, 1.4, 1.0); addCol(A, 7.7, -7.2, 8.9, -5.8, 2.2);
  // bestiary bookshelf
  B.box(trim, -8.5, 1.1, -13.5, 0.7, 2.2, 2); addCol(A, -8.9, -14.5, -8.1, -12.5, 2.2);
  for (let i = 0; i < 18; i++) B.box(mat(pick([0xc0392b, 0x2e86c1, 0x27ae60, 0xf1c40f, 0x8e44ad])), -8.2, 0.45 + (i % 3) * 0.7, -14.3 + Math.floor(i / 3) * 0.3, 0.3, 0.45, 0.22);
  // bed + plant + lamp
  B.box(mat(0x6a4426), -6.5, 0.3, -5.6, 2.2, 0.6, 1.6); B.box(mat(0xffffff), -6.5, 0.65, -5.6, 2, 0.15, 1.5); B.box(mat(0x4a8ad8), -6.1, 0.72, -5.6, 1.2, 0.08, 1.52); addCol(A, -7.6, -6.4, -5.4, -4.8, 0.7);
  B.cyl(mat(0x9a5a3a), 5.5, 0.3, -5, 0.3, 0.6); B.add(SPH, mat(0x3a8a3a), 5.5, 0.95, -5, 0.5, 0.6, 0.5);
  // yard: fence, trees, sign
  for (let i = -30; i <= 30; i += 2) for (const [x, z] of [[i, -30], [i, 30], [-30, i], [30, i]]) B.box(mat(0xe8e0d0), x, 0.6, z, 0.2, 1.2, 0.2);
  for (const [x0, z0, x1, z1] of [[-30, -30, 30, -30], [-30, 30, 30, 30], [-30, -30, -30, 30], [30, -30, 30, 30]]) { B.box(mat(0xe8e0d0), (x0 + x1) / 2, 0.9, (z0 + z1) / 2, Math.abs(x1 - x0) || 0.1, 0.12, Math.abs(z1 - z0) || 0.1); addCol(A, x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, 1.3); }
  const tr = seeded(42);
  for (let i = 0; i < 26; i++) { let x, z; do { x = tr.range(-28, 28); z = tr.range(-28, 28); } while (Math.abs(x) < 12 && z < 0 || Math.hypot(x, z - 10) < 7 || Math.abs(x) < 3); B.cyl(mat(0x6a4a2a), x, 1, z, 0.25, 2); B.add(new THREE.ConeGeometry(1.4, 3.2, 8), mat(0x2f7a3a), x, 3.2, z, 1, 1, 1); addCol(A, x - 0.35, z - 0.35, x + 0.35, z + 0.35, 4); }
  for (let i = 0; i < 40; i++) { const x = tr.range(-27, 27), z = tr.range(-2, 27); if (Math.abs(x) < 2) continue; B.add(SPH, mat(pick([0xff5a7a, 0xffe14a, 0xffffff, 0x8a5cff])), x, 0.12, z, 0.12, 0.12, 0.12); }
  B.build(g);
  const sgn = textSprite('SIGNAL LOST HQ', '#2fe3c5', 'rgba(0,0,0,.6)', 0.6); sgn.position.set(0, H + 3.4, -3.8); g.add(sgn);
  SURF.bell = makeBell(A, 0, 12, Math.PI, g);
  const lab = (t, x, y, z) => { const s = textSprite(t, '#fff', 'rgba(0,0,0,.55)', 0.22); s.position.set(x, y, z); g.add(s); };
  lab('UPLOAD (TV)', 0, 2.5, -15); lab('MIRROR: EDIT FACE', -8.5, 2.95, -8); lab('MAP TERMINAL', 7.9, 1.9, -12.5); lab('SIGNAL MART', 7.6, 2.5, -6.5); lab('MONSTER BOOK', -8.2, 2.45, -13.5); lab('QUOTA', -5, 3.05, -15.7);
  INTER.push(
    { area: A, x: 0, z: -14.3, r: 2.6, label: () => 'Upload footage to ScreamTube', act: () => doUpload() },
    { area: A, x: -8.4, z: -8, r: 2.2, label: () => 'Edit your TV face', act: () => UI.openFace() },
    { area: A, x: 7.6, z: -12.5, r: 2.2, label: () => NET.isHost ? 'Pick today\'s map' : 'View map (host picks)', act: () => UI.openTerminal() },
    { area: A, x: 7.4, z: -6.5, r: 2.2, label: () => 'Shop at Signal Mart', act: () => UI.openShop() },
    { area: A, x: -7.9, z: -13.5, r: 2.2, label: () => 'Read the Monster Book', act: () => UI.openBook() },
    { area: A, x: SURF.bell.lx, z: SURF.bell.lz, r: 1.8, label: () => G.lever > 0 ? 'Bell is leaving…' : (G.phase === 'dive' ? 'Your team is in the Signal World' : 'Pull lever: dive into the Signal World'), act: () => netAct({ t: 'lever' }) },
  );
  drawQuota();
}
function drawTV(kind, data) {
  const c = SURF.tvCanvas; if (!c) return; const x = c.getContext('2d'); const w = c.width, h = c.height;
  x.fillStyle = '#0e0e12'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#e8242c'; x.fillRect(0, 0, w, 30); x.fillStyle = '#fff'; x.font = 'bold 20px Arial'; x.fillText('▶ ScreamTube', 10, 22);
  x.font = 'bold 16px Arial';
  if (kind === 'idle') { x.fillStyle = '#ddd'; x.fillText('Press E to upload your footage', 18, 80); x.fillStyle = '#9aa'; x.fillText('Film monsters. Get views.', 18, 110); x.fillText('Make quota or else.', 18, 135); }
  else if (kind === 'up') { x.fillStyle = '#fff'; x.fillText(data.title.slice(0, 30), 12, 60); x.fillStyle = '#ffd23d'; x.font = 'bold 30px Arial'; x.fillText(fmt(data.views) + ' views', 12, 105); x.font = '14px Arial'; x.fillStyle = '#9ad'; (data.cm || []).slice(0, 3).forEach((m, i) => x.fillText(m.slice(0, 40), 12, 135 + i * 18)); }
  if (SURF.tvTex) SURF.tvTex.needsUpdate = true;
}
function drawQuota() {
  const c = SURF.qCanvas; if (!c) return; const x = c.getContext('2d');
  x.fillStyle = '#f4f4ee'; x.fillRect(0, 0, 320, 200); x.fillStyle = '#c0392b'; x.font = 'bold 24px "Comic Sans MS", cursive'; x.fillText('QUOTA #' + G.qn, 14, 34);
  x.fillStyle = '#222'; x.font = 'bold 20px "Comic Sans MS", cursive';
  x.fillText('Views: ' + fmt(G.views) + ' / ' + fmt(G.quota), 14, 72);
  x.fillText('Day ' + Math.min(G.day, 3) + ' of 3', 14, 104); x.fillText('Money: $' + fmt(G.money), 14, 136);
  x.fillStyle = G.views >= G.quota ? '#27ae60' : '#555'; x.fillText(G.views >= G.quota ? 'QUOTA MET!' : 'Map: ' + MAPS[G.mapType].n, 14, 170);
  if (SURF.qTex) SURF.qTex.needsUpdate = true;
}

/* =================== SIGNAL WORLD maps =================== */
function clearMap() {
  if (MAP.group) { W.s.remove(MAP.group); MAP.group.traverse(o => { if (o.geometry && o.geometry.dispose && o.geometry !== UNIT_BOX && o.geometry !== UNIT_CYL && o.geometry !== SPH) o.geometry.dispose(); }); }
  MAP.group = null; MAP.type = null; clearCols('sig');
  for (let i = INTER.length - 1; i >= 0; i--) if (INTER[i].area === 'sig') INTER.splice(i, 1);
}
function buildMap(type, seed) {
  clearMap();
  const r = seeded(seed), D = MAPS[type], A = 'sig';
  const g = MAP.group = new THREE.Group(); W.s.add(g);
  const B = new Batch();
  Object.assign(MAP, { type, seed, artifacts: [], screens: [], spots: [], gateOpen: false });
  const M = { wall: sigMat(D.wall), floor: sigMat(D.floor), ceil: sigMat(D.ceil), trim: sigMat(0x2a2a2a), dark: sigMat(0x151515) };
  const H = D.H || 6, T = 0.3;
  const city = type === 'city', halls = type === 'halls';
  // special room (Sniff's server room) sits on the south edge; the bell sits on the north edge
  const si = city ? r.pick([0, 2, 4, 6]) : r.pick([0, 1, 2, 4, 5, 6]);
  const bi = 3, bj = city ? 1 : 0;
  MAP.room = { i: si, j: GN - 1, x0: ccx(si) - 4, x1: ccx(si) + 4, z0: ccz(GN - 1) - 4, z1: ccz(GN - 1) + 4, cx: ccx(si), cz: ccz(GN - 1) };
  // ---- maze connections ----
  const con = []; for (let i = 0; i < GN; i++) { con[i] = []; for (let j = 0; j < GN; j++) con[i][j] = { e: false, s: false }; }
  const setC = (i, j, ni, nj) => { if (ni === i + 1) con[i][j].e = true; else if (ni === i - 1) con[ni][j].e = true; else if (nj === j + 1) con[i][j].s = true; else con[i][nj].s = true; };
  const hasC = (i, j, d) => d === 'e' ? i < GN - 1 && con[i][j].e : d === 'w' ? i > 0 && con[i - 1][j].e : d === 's' ? j < GN - 1 && con[i][j].s : j > 0 && con[i][j - 1].s;
  if (!city) {
    const vis = new Set([bi + ',' + bj]), st = [[bi, bj]];
    while (st.length) {
      const [i, j] = st[st.length - 1]; const nb = [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < GN && b < GN && !vis.has(a + ',' + b));
      if (!nb.length) { st.pop(); continue; } const [a, b] = r.pick(nb); setC(i, j, a, b); vis.add(a + ',' + b); st.push([a, b]);
    }
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) { if (i < GN - 1 && r.chance(D.loops)) con[i][j].e = true; if (j < GN - 1 && r.chance(D.loops)) con[i][j].s = true; }
    con[si][GN - 2].s = true; // special room always reachable from the north
  }
  const openE = []; // edges with no wall at all
  // ---- floors / ceilings ----
  B.box(M.floor, SIG_X, -0.1, 0, GN * CS + 1, 0.2, GN * CS + 1);
  if (D.ceil) B.box(M.ceil, SIG_X, H + 0.1, 0, GN * CS + 1, 0.2, GN * CS + 1);
  // ---- wall helpers ----
  const wallX = (z, x0, x1, gaps, h = H, m = M.wall) => { // wall running along x at z
    let cur = x0; const gs = gaps.slice().sort((a, b) => a[0] - b[0]);
    for (const [ga, gb] of gs.concat([[x1, x1]])) { if (ga - cur > 0.05) { B.box(m, (cur + ga) / 2, h / 2, z, ga - cur, h, T); addCol(A, cur, z - T / 2, ga, z + T / 2, h); } cur = Math.max(cur, gb); }
  };
  const wallZ = (x, z0, z1, gaps, h = H, m = M.wall) => {
    let cur = z0; const gs = gaps.slice().sort((a, b) => a[0] - b[0]);
    for (const [ga, gb] of gs.concat([[z1, z1]])) { if (ga - cur > 0.05) { B.box(m, x, h / 2, (cur + ga) / 2, T, h, ga - cur); addCol(A, x - T / 2, cur, x + T / 2, ga, h); } cur = Math.max(cur, gb); }
  };
  const solid = (x0, z0, x1, z1, h, m) => { B.box(m, (x0 + x1) / 2, h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0); addCol(A, x0, z0, x1, z1, h); };
  const W0 = SIG_X - HALF, W1 = SIG_X + HALF, Z0 = -HALF, Z1 = HALF;
  const dw = D.dw / 2, R = MAP.room;
  // outer boundary (south edge has the gate gap in the special room)
  const bh = city ? 7 : H;
  wallX(Z0, W0, W1, [], bh); wallZ(W0, Z0, Z1, [], bh); wallZ(W1, Z0, Z1, [], bh);
  wallX(Z1, W0, W1, [[R.cx - 2.2, R.cx + 2.2]], bh);
  const isRoomCell = (i, j) => (i === si && j === GN - 1) || (i === bi && j === bj);

  if (city) buildCity(r, B, M, A, solid, wallX, wallZ, si);
  else if (halls) {
    const hw = 1.5;
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
      const cx = ccx(i), cz = ccz(j);
      if (isRoomCell(i, j)) { // a real room with doors
        const gn = hasC(i, j, 'n') ? [[cx - hw, cx + hw]] : [], gs2 = hasC(i, j, 's') ? [[cx - hw, cx + hw]] : [];
        if (j > 0) wallX(cz - 4, cx - 4, cx + 4, gn); if (j < GN - 1) wallX(cz + 4, cx - 4, cx + 4, gs2);
        if (i > 0) wallZ(cx - 4, cz - 4, cz + 4, hasC(i, j, 'w') ? [[cz - hw, cz + hw]] : []); if (i < GN - 1) wallZ(cx + 4, cz - 4, cz + 4, hasC(i, j, 'e') ? [[cz - hw, cz + hw]] : []);
        continue;
      }
      const blk = sigMat(D.wall);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x0 = cx + sx * hw, x1 = cx + sx * 4, z0 = cz + sz * hw, z1 = cz + sz * 4; solid(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), H, blk); hallDeco(r, B, cx, cz, sx, sz, hw); }
      if (!hasC(i, j, 'n')) solid(cx - hw, cz - 4, cx + hw, cz - hw, H, blk);
      if (!hasC(i, j, 's')) solid(cx - hw, cz + hw, cx + hw, cz + 4, H, blk);
      if (!hasC(i, j, 'w')) solid(cx - 4, cz - hw, cx - hw, cz + hw, H, blk);
      if (!hasC(i, j, 'e')) solid(cx + hw, cz - hw, cx + 4, cz + hw, H, blk);
      if (r.chance(0.7)) B.box(sigMat(0xfff6c8, { em: 0xb0a070 }), cx, H - 0.02, cz, 1.2, 0.05, 0.5);
    }
  } else {
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
      const cx = ccx(i), cz = ccz(j);
      if (i < GN - 1) { // east edge
        if (con[i][j].e) { if (!isRoomCell(i, j) && !isRoomCell(i + 1, j) && r.chance(D.open)) openE.push([i, j, 'e']); else wallZ(cx + 4, cz - 4, cz + 4, [[cz - dw, cz + dw]]); }
        else wallZ(cx + 4, cz - 4, cz + 4, []);
      }
      if (j < GN - 1) {
        if (con[i][j].s) { if (!isRoomCell(i, j) && !isRoomCell(i, j + 1) && r.chance(D.open)) openE.push([i, j, 's']); else wallX(cz + 4, cx - 4, cx + 4, [[cx - dw, cx + dw]]); }
        else wallX(cz + 4, cx - 4, cx + 4, []);
      }
    }
    for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) { if (isRoomCell(i, j)) continue; cellProps(type, r, B, M, A, ccx(i), ccz(j), solid); }
  }
  // ---- special room: SERVER ROOM + Sniff's chamber + gate ----
  buildSpecial(r, B, A, solid, wallX, wallZ, H);
  // ---- the bell ----
  B.build(g);
  MAP.bell = makeBell(A, ccx(bi), ccz(bj) - (city ? 0 : 0.5), 0, g);
  INTER.push({ area: A, x: MAP.bell.lx, z: MAP.bell.lz, r: 1.8, label: () => G.lever > 0 ? 'Bell leaving in ' + Math.ceil(G.lever) + '…' : 'Pull lever: go back up', act: () => netAct({ t: 'lever' }) });
  const tag = textSprite(D.n.toUpperCase(), '#2fe3c5', 'rgba(0,0,0,.6)', 0.5); tag.position.set(ccx(bi), 5.2, ccz(bj) + 3); g.add(tag);
  // ---- nav grid + walkable spots ----
  buildNav();
  const spots = []; let tries = 0;
  while (spots.length < 160 && tries++ < 6000) { const x = r.range(W0 + 1, W1 - 1), z = r.range(Z0 + 1, Z1 - 1); if (navFree(x, z, 1)) spots.push({ x, z }); }
  MAP.spots = spots;
  // ---- artifacts ----
  let id = 0; const bx0 = MAP.bell.x, bz0 = MAP.bell.z;
  for (const s of spots) { if (MAP.artifacts.length >= 11) break; if (Math.hypot(s.x - bx0, s.z - bz0) < 8 || inRoom(s.x, s.z)) continue; if (MAP.artifacts.some(a => Math.hypot(a.x - s.x, a.z - s.z) < 6)) continue; const type2 = r.int(0, ARTIFACTS.length - 1); addArtifact('a' + (id++), type2, s.x, s.z); }
  return MAP;
}
function addArtifact(id, type, x, z) {
  const m = makeArtifact(type); m.position.set(x, 0, z); m.rotation.y = Math.random() * 6; MAP.group.add(m);
  const a = { id, type, x, z, m }; MAP.artifacts.push(a);
  INTER.push({ area: 'sig', x, z, r: 1.6, art: a, label: () => 'Pick up ' + ARTIFACTS[type].n + ' ($' + ARTIFACTS[type].v + ')', act: () => netAct({ t: 'pick', id }) });
  return a;
}
function removeArtifact(id) {
  const i = MAP.artifacts.findIndex(a => a.id === id); if (i < 0) return null; const a = MAP.artifacts[i];
  MAP.group.remove(a.m); MAP.artifacts.splice(i, 1); const k = INTER.findIndex(t => t.art === a); if (k >= 0) INTER.splice(k, 1); return a;
}
const inRoom = (x, z) => MAP.room && x > MAP.room.x0 && x < MAP.room.x1 && z > MAP.room.z0 && z < MAP.room.z1;

function hallDeco(r, B, cx, cz, sx, sz, hw) {
  // lockers / doors on the faces of corridor blocks
  const fx = cx + sx * hw, fz = cz + sz * hw;
  if (r.chance(0.5)) for (let k = 0; k < 3; k++) B.box(sigMat(0x3a5a8a), fx + sx * 0.01, 0.95, cz + sz * (hw + 0.45 + k * 0.82), 0.06, 1.9, 0.75);
  else B.box(sigMat(0x6a4426), fx + sx * 0.01, 1.05, cz + sz * 2.6, 0.06, 2.1, 1.0);
  if (r.chance(0.5)) B.box(sigMat(0x6a4426), cx + sx * 2.6, 1.05, fz + sz * 0.01, 1.0, 2.1, 0.06);
  else for (let k = 0; k < 3; k++) B.box(sigMat(0x8a3a3a), cx + sx * (hw + 0.45 + k * 0.82), 0.95, fz + sz * 0.01, 0.75, 1.9, 0.06);
}
function cellProps(type, r, B, M, A, cx, cz, solid) {
  const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const lamp = sigMat(0xfff6d8, { em: 0xa09880 });
  if (type === 'facility') {
    if (r.chance(0.6)) B.box(lamp, cx, MAPS.facility.H - 0.03, cz, 1.6, 0.06, 0.4);
    B.box(sigMat(0x4a5560), cx - 3.75, 3.3, cz, 0.18, 0.18, 8); // pipe
    for (const [sx, sz] of quads) {
      if (!r.chance(0.55)) continue; const x = cx + sx * 2.6, z = cz + sz * 2.6, k = r.int(0, 4);
      if (k === 0) { solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6, 1.2, sigMat(0x8a6a3a)); if (r.chance(0.5)) B.box(sigMat(0x7a5a2a), x + 0.1, 1.65, z, 0.9, 0.9, 0.9, 0.3); }
      else if (k === 1) { solid(x - 1, z - 0.45, x + 1, z + 0.45, 0.9, sigMat(0xd8dde0)); B.box(sigMat(0x2fe3a5, { em: 0x1a6a50 }), x - 0.4, 1.05, z, 0.2, 0.3, 0.2); B.box(sigMat(0xff4a4a, { em: 0x6a1a1a }), x + 0.4, 1.0, z, 0.15, 0.2, 0.15); }
      else if (k === 2) { B.cyl(sigMat(0x2a6a3a), x, 0.55, z, 0.42, 1.1); solid(x - 0.42, z - 0.42, x + 0.42, z + 0.42, 1.1, M.trim); }
      else if (k === 3) { solid(x - 0.5, z - 0.8, x + 0.5, z + 0.8, 2.2, sigMat(0x30343a)); for (let q = 0; q < 6; q++) B.box(sigMat(r.chance(0.5) ? 0x2fe35a : 0xff3a3a, { em: 0x3a3a3a }), x - sx * 0.51, 0.4 + q * 0.3, z, 0.02, 0.06, 0.06); }
      else { B.box(sigMat(0xe8c020), x, 0.01, z, 1.8, 0.02, 1.8); B.box(sigMat(0x111111), x, 0.012, z, 1.2, 0.02, 1.2); }
    }
    if (r.chance(0.35)) B.box(sigMat(0xff2020, { em: 0xaa0000 }), cx + 3.8, 3.4, cz + 2, 0.1, 0.25, 0.25);
  } else if (type === 'shop') {
    B.box(lamp, cx, MAPS.shop.H - 0.03, cz - 2, 3, 0.06, 0.5); B.box(lamp, cx, MAPS.shop.H - 0.03, cz + 2, 3, 0.06, 0.5);
    for (const [sx, sz] of quads) {
      const x = cx + sx * 2.6, z = cz + sz * 2.6; const k = r.int(0, 5);
      if (k <= 2) { // shelf
        solid(x - 0.45, z - 1.1, x + 0.45, z + 1.1, 2.0, sigMat(0x8a8f96));
        for (let lv = 0; lv < 3; lv++) for (let q = 0; q < 4; q++) if (r.chance(0.8)) for (const s of [-1, 1]) B.box(sigMat(r.pick([0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xe67e22, 0x9b59b6, 0xffffff])), x + s * 0.47, 0.35 + lv * 0.6, z - 0.8 + q * 0.53, 0.08, 0.36, 0.4);
      } else if (k === 3) { solid(x - 0.5, z - 1, x + 0.5, z + 1, 1.0, sigMat(0xf0f4f8)); B.box(sigMat(0x8fe0ff, { em: 0x2a6a80 }), x, 1.01, z, 0.85, 0.02, 1.8); }
      else if (k === 4) { solid(x - 0.4, z - 0.7, x + 0.4, z + 0.7, 1.0, sigMat(0x3a3a40)); B.box(sigMat(0x111111), x, 1.05, z - 0.3, 0.3, 0.1, 0.3); }
      else { B.box(sigMat(0x999999), x, 0.5, z, 0.6, 0.06, 0.9); B.box(sigMat(0x999999), x, 0.75, z + 0.45, 0.6, 0.5, 0.04); }
    }
    if (r.chance(0.5)) { const s = r.pick(['AISLE ' + r.int(1, 99), 'SALE!!', 'NO EXIT', 'FRESH', 'HELP']); const sg = textSprite(s, '#ff4040', 'rgba(255,255,255,.85)', 0.35); sg.position.set(cx, 4.2, cz); MAP.group.add(sg); }
  } else if (type === 'bar') {
    B.box(sigMat(0xff4ac0, { em: 0xa02070 }), cx - 3.8, 2.6, cz + r.range(-2, 2), 0.06, 0.3, 1.6);
    if (r.chance(0.5)) B.box(sigMat(0x4af0ff, { em: 0x1a8090 }), cx + r.range(-2, 2), 2.7, cz - 3.8, 1.4, 0.25, 0.06);
    B.box(sigMat(0xffc070, { em: 0x705020 }), cx, MAPS.bar.H - 0.2, cz, 0.3, 0.3, 0.3);
    for (const [sx, sz] of quads) {
      if (!r.chance(0.7)) continue; const x = cx + sx * 2.6, z = cz + sz * 2.6, k = r.int(0, 4);
      if (k === 0 || k === 1) { B.cyl(sigMat(0x5a3a22), x, 0.75, z, 0.5, 0.06); B.cyl(sigMat(0x222222), x, 0.37, z, 0.06, 0.74); solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0.78, M.dark); for (let q = 0; q < 3; q++) { const a = q * 2.1; B.cyl(sigMat(0xaa2a2a), x + Math.cos(a) * 0.85, 0.45, z + Math.sin(a) * 0.85, 0.2, 0.08); B.cyl(sigMat(0x222222), x + Math.cos(a) * 0.85, 0.22, z + Math.sin(a) * 0.85, 0.04, 0.44); } if (r.chance(0.6)) B.cyl(sigMat(0x2a8a3a, { em: 0x103a18 }), x + 0.15, 0.9, z, 0.05, 0.25); }
      else if (k === 2) { solid(x - 0.65, z - 1.1, x + 0.65, z + 1.1, 0.85, sigMat(0x5a3a22)); B.box(sigMat(0x1f7a3a), x, 0.86, z, 1.1, 0.02, 1.9); }
      else if (k === 3) { solid(x - 1.1, z - 0.4, x + 1.1, z + 0.4, 1.1, sigMat(0x6a3a1a)); for (let q = 0; q < 6; q++) B.cyl(sigMat(r.pick([0x2a8a3a, 0x8a5a1a, 0xb0d0ff]), { em: 0x202020 }), x - 0.9 + q * 0.36, 1.25, z, 0.05, 0.3); }
      else { solid(x - 0.4, z - 0.35, x + 0.4, z + 0.35, 1.6, sigMat(0x8a2a8a)); B.box(sigMat(0xffd23d, { em: 0x806010 }), x, 1.2, z - sz * 0.36, 0.6, 0.4, 0.02); }
    }
  }
}
function buildCity(r, B, M, A, solid, wallX, wallZ, si) {
  const road = sigMat(0x232327), side = sigMat(0x55565c), line = sigMat(0xd8c040, { em: 0x403810 });
  const win = [sigMat(0xffe08a, { em: 0x907040 }), sigMat(0x7ad8ff, { em: 0x306070 }), sigMat(0x202428)];
  for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) {
    const cx = ccx(i), cz = ccz(j);
    if (i % 2 === 0 && j % 2 === 0) {
      B.box(side, cx, 0.06, cz, 8, 0.12, 8);
      if (i === si && j === GN - 1) continue; // special room building is built later
      const h = r.range(7, 22), w = 6.4; solid(cx - w / 2, cz - w / 2, cx + w / 2, cz + w / 2, h, sigMat(r.pick([0x4a4e58, 0x5a4a44, 0x3e4a44, 0x50505a])));
      for (let y = 1.8; y < h - 0.5; y += 2.2) for (const s of [-1, 1]) for (let q = -2; q <= 2; q++) { const m = r.chance(0.3) ? r.pick(win.slice(0, 2)) : win[2]; B.box(m, cx + q * 1.2, y, cz + s * (w / 2 + 0.01), 0.7, 1.0, 0.04); B.box(m, cx + s * (w / 2 + 0.01), y, cz + q * 1.2, 0.04, 1.0, 0.7); }
      if (r.chance(0.5)) { const lx = cx + 3.6, lz = cz + 3.6; B.cyl(sigMat(0x30343a), lx, 2.2, lz, 0.08, 4.4); B.box(sigMat(0xfff0c0, { em: 0xd0b060 }), lx - 0.4, 4.4, lz - 0.4, 0.5, 0.15, 0.3); addCol(A, lx - 0.12, lz - 0.12, lx + 0.12, lz + 0.12, 4.4); }
    } else {
      B.box(road, cx, 0.02, cz, 8, 0.04, 8);
      if (i % 2 === 1 && j % 2 === 0) for (let q = -3; q <= 3; q += 2) B.box(line, cx, 0.045, cz + q, 0.15, 0.01, 1);
      if (j % 2 === 1 && i % 2 === 0) for (let q = -3; q <= 3; q += 2) B.box(line, cx + q, 0.045, cz, 1, 0.01, 0.15);
      if ((i % 2) !== (j % 2) && r.chance(0.55)) { // parked car
        const along = i % 2 === 1; const off = r.pick([-2.4, 2.4]); const x = cx + (along ? off : r.range(-2, 2)), z = cz + (along ? r.range(-2, 2) : off);
        const cw = along ? 1.8 : 3.8, cd = along ? 3.8 : 1.8; const col = r.pick([0xb03030, 0x3060b0, 0xe0e0e0, 0x303030, 0xd0a020]);
        solid(x - cw / 2, z - cd / 2, x + cw / 2, z + cd / 2, 1.0, sigMat(col)); B.box(sigMat(col), x, 1.25, z, along ? 1.6 : 2, 0.55, along ? 2 : 1.6); B.box(sigMat(0x9fd0ff, { em: 0x203040 }), x, 1.27, z, along ? 1.62 : 1.7, 0.4, along ? 1.7 : 1.62);
      }
      if ((i % 2) !== (j % 2) && r.chance(0.3)) { const x = cx + r.range(-3, 3), z = cz + r.range(-3, 3); if (Math.abs(x - cx) > 1.2 || Math.abs(z - cz) > 1.2) solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0.9, sigMat(r.pick([0x2a5a2a, 0xc03030, 0x3a3a3a]))); }
    }
  }
}
function buildSpecial(r, B, A, solid, wallX, wallZ, H) {
  const R = MAP.room, city = MAP.type === 'city', h = city ? 5 : H;
  const floor = sigMat(0x14203a), rack = sigMat(0x101418);
  B.box(floor, R.cx, 0.02, R.cz, 7.8, 0.04, 7.8);
  if (city) { // a hollow building with a door to the north road
    wallX(R.z0, R.x0, R.x1, [[R.cx - 1.5, R.cx + 1.5]], h, sigMat(0x3a3f4a)); wallZ(R.x0, R.z0, R.z1, [], h, sigMat(0x3a3f4a)); wallZ(R.x1, R.z0, R.z1, [], h, sigMat(0x3a3f4a));
    B.box(sigMat(0x3a3f4a), R.cx, h + 0.1, R.cz, 8.3, 0.2, 8.3);
    B.box(sigMat(0x3a3f4a), R.cx, h + 3, R.cz, 8, 6, 8);
  }
  for (const s of [-1, 1]) for (let q = 0; q < 3; q++) {
    const x = R.cx + s * 3.2, z = R.cz - 2.6 + q * 1.5; solid(x - 0.4, z - 0.55, x + 0.4, z + 0.55, 2.3, rack);
    for (let k = 0; k < 7; k++) B.box(sigMat(r.chance(0.6) ? 0x2fe3ff : 0x2fe35a, { em: 0x1a7a8a }), x - s * 0.41, 0.3 + k * 0.28, z + r.range(-0.3, 0.3), 0.02, 0.05, 0.08);
  }
  // screens that go blue when Hijack + Computer collide in here
  const mkScreen = (x, y, z, ry, w, hh) => { const c = document.createElement('canvas'); c.width = 256; c.height = 160; const t = new THREE.CanvasTexture(c); const s = mk(new THREE.PlaneGeometry(w, hh), new THREE.MeshBasicMaterial({ map: t }), x, y, z, MAP.group); s.rotation.y = ry; MAP.screens.push({ c, t }); };
  mkScreen(R.cx - 3.84, 2.6, R.cz + 1.6, Math.PI / 2, 2.2, 1.3); mkScreen(R.cx + 3.84, 2.6, R.cz + 1.6, -Math.PI / 2, 2.2, 1.3);
  mkScreen(R.cx, Math.min(h - 0.9, 3.4), R.z1 - 0.2, Math.PI, 3.6, 1.6);
  drawScreens(false);
  const tag = textSprite('SERVER ROOM', '#4aa3ff', 'rgba(0,0,0,.7)', 0.35); tag.position.set(R.cx, Math.min(h - 0.4, 3.6), R.z0 + 0.6); MAP.group.add(tag);
  // Sniff's chamber beyond the gate (outside the south wall)
  const cz0 = HALF, cz1 = HALF + 9, ch = 7, cw = sigMat(0x2a1414);
  B.box(sigMat(0x1a0c0c), R.cx, -0.1, (cz0 + cz1) / 2, 9, 0.2, 9.4);
  wallZ(R.cx - 4.5, cz0, cz1, [], ch, cw); wallZ(R.cx + 4.5, cz0, cz1, [], ch, cw); wallX(cz1, R.cx - 4.5, R.cx + 4.5, [], ch, cw);
  B.box(cw, R.cx, ch + 0.1, (cz0 + cz1) / 2, 9.2, 0.2, 9.4);
  B.box(sigMat(0xff2020, { em: 0x801010 }), R.cx, ch - 0.2, (cz0 + cz1) / 2, 0.4, 0.2, 0.4);
  MAP.chamber = { x: R.cx, z: (cz0 + cz1) / 2 + 1 };
  // the huge gate
  const gate = new THREE.Group(); gate.position.set(R.cx, 0, HALF); MAP.group.add(gate);
  const gm = sigMat(0x5a5a62);
  for (let k = -2; k <= 2; k++) bx(0.22, 5.6, 0.25, gm, k * 0.95, 2.8, 0, gate);
  for (let y = 0.6; y < 5.6; y += 1.2) bx(4.4, 0.18, 0.3, gm, 0, y, 0, gate);
  bx(4.6, 0.35, 0.5, sigMat(0xd8c020), 0, 5.8, 0, gate);
  MAP.gateMesh = gate; MAP.gateCol = addCol(A, R.cx - 2.2, HALF - 0.3, R.cx + 2.2, HALF + 0.3, 6, 'gate');
}
function drawScreens(bsod) {
  MAP.screens.forEach(({ c, t }, i) => {
    const x = c.getContext('2d');
    if (bsod) { x.fillStyle = '#1a5fd0'; x.fillRect(0, 0, 256, 160); x.fillStyle = '#fff'; x.font = 'bold 54px Arial'; x.fillText(':(', 18, 64); x.font = '13px Arial'; x.fillText('Your signal ran into a problem and', 18, 92); x.fillText('needs to restart. Something is coming.', 18, 108); x.font = 'bold 12px monospace'; x.fillText('STOP CODE: SNIFF_DETECTED', 18, 138); }
    else { const d = x.createImageData(256, 160); for (let k = 0; k < d.data.length; k += 4) { const v = Math.random() * 120; d.data[k] = v * 0.6; d.data[k + 1] = v; d.data[k + 2] = v; d.data[k + 3] = 255; } x.putImageData(d, 0, 0); x.fillStyle = '#2fe3c5'; x.font = 'bold 26px monospace'; x.fillText('NO SIGNAL', 56, 88); }
    t.needsUpdate = true;
  });
}
function openGate() {
  if (MAP.gateOpen || !MAP.gateCol) return; MAP.gateOpen = true; MAP.gateCol.on = false; navRect(MAP.gateCol, false);
  fxAdd({ t: 0, life: 4, up(dt) { this.t += dt; if (MAP.gateMesh) MAP.gateMesh.position.y = Math.min(6, this.t * 1.6); }, end() { } });
}

/* =================== nav grid + A* (monsters & bots walk with this) =================== */
const NAV = { res: 0.5, x0: 0, z0: 0, w: 0, h: 0, block: null, tall: null };
function buildNav() {
  NAV.x0 = SIG_X - HALF - 1; NAV.z0 = -HALF - 1; NAV.w = Math.ceil((GN * CS + 2) / NAV.res); NAV.h = Math.ceil((GN * CS + 12) / NAV.res);
  NAV.block = new Uint8Array(NAV.w * NAV.h); NAV.tall = new Uint8Array(NAV.w * NAV.h);
  for (const b of COLS.sig.list) if (b.on) navRect(b, true);
}
function navRect(b, on) {
  const m = 0.35, rs = NAV.res;
  const ix0 = Math.max(0, Math.floor((b.x0 - m - NAV.x0) / rs)), ix1 = Math.min(NAV.w - 1, Math.floor((b.x1 + m - NAV.x0) / rs));
  const iz0 = Math.max(0, Math.floor((b.z0 - m - NAV.z0) / rs)), iz1 = Math.min(NAV.h - 1, Math.floor((b.z1 + m - NAV.z0) / rs));
  for (let x = ix0; x <= ix1; x++) for (let z = iz0; z <= iz1; z++) { const k = z * NAV.w + x; NAV.block[k] = on ? 1 : 0; }
  if (b.h > 1.4) { // sight blockers (no margin)
    const jx0 = Math.max(0, Math.floor((b.x0 - NAV.x0) / rs)), jx1 = Math.min(NAV.w - 1, Math.floor((b.x1 - NAV.x0) / rs));
    const jz0 = Math.max(0, Math.floor((b.z0 - NAV.z0) / rs)), jz1 = Math.min(NAV.h - 1, Math.floor((b.z1 - NAV.z0) / rs));
    for (let x = jx0; x <= jx1; x++) for (let z = jz0; z <= jz1; z++) NAV.tall[z * NAV.w + x] = on ? 1 : 0;
  }
  if (!on) for (const c of COLS.sig.list) if (c.on && c !== b && c.x1 > b.x0 - 1 && c.x0 < b.x1 + 1 && c.z1 > b.z0 - 1 && c.z0 < b.z1 + 1) navRect(c, true);
}
const navIdx = (x, z) => { const ix = Math.floor((x - NAV.x0) / NAV.res), iz = Math.floor((z - NAV.z0) / NAV.res); if (ix < 0 || iz < 0 || ix >= NAV.w || iz >= NAV.h) return -1; return iz * NAV.w + ix; };
function navFree(x, z, rad = 0) { if (!NAV.block) return false; for (let dx = -rad; dx <= rad; dx += 0.5) for (let dz = -rad; dz <= rad; dz += 0.5) { const k = navIdx(x + dx, z + dz); if (k < 0 || NAV.block[k]) return false; } return true; }
// line of sight (walls/tall stuff only)
function los(ax, az, bx2, bz2) {
  if (!NAV.tall) return true; const d = Math.hypot(bx2 - ax, bz2 - az), n = Math.ceil(d / 0.35);
  for (let i = 1; i < n; i++) { const t = i / n, k = navIdx(ax + (bx2 - ax) * t, az + (bz2 - az) * t); if (k < 0 || NAV.tall[k]) return false; }
  return true;
}
function walkLine(ax, az, bx2, bz2) { const d = Math.hypot(bx2 - ax, bz2 - az), n = Math.ceil(d / 0.3); for (let i = 1; i <= n; i++) { const t = i / n, k = navIdx(ax + (bx2 - ax) * t, az + (bz2 - az) * t); if (k < 0 || NAV.block[k]) return false; } return true; }
let _heap = null, _g = null, _came = null, _closed = null, _stamp = 0;
function nearestFree(k) {
  if (k >= 0 && !NAV.block[k]) return k; const ix = k % NAV.w, iz = (k / NAV.w) | 0;
  for (let r = 1; r < 8; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { const x = ix + dx, z = iz + dz; if (x < 0 || z < 0 || x >= NAV.w || z >= NAV.h) continue; const q = z * NAV.w + x; if (!NAV.block[q]) return q; }
  return -1;
}
function findPath(sx, sz, tx, tz, maxN = 9000) {
  if (!NAV.block) return null; const N = NAV.w * NAV.h;
  if (!_g || _g.length !== N) { _g = new Float32Array(N); _came = new Int32Array(N); _closed = new Uint32Array(N); _heap = []; }
  let s = navIdx(sx, sz), t = navIdx(tx, tz); if (s < 0 || t < 0) return null; s = nearestFree(s); t = nearestFree(t); if (s < 0 || t < 0) return null;
  if (walkLine(sx, sz, tx, tz)) return [{ x: tx, z: tz }];
  _stamp++; const open = _heap; open.length = 0; const W2 = NAV.w;
  const tx_ = t % W2, tz_ = (t / W2) | 0; const hfn = k => { const dx = Math.abs(k % W2 - tx_), dz = Math.abs(((k / W2) | 0) - tz_); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const push = (k, f) => { open.push([f, k]); let i = open.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (open[p][0] <= open[i][0]) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
  const pop = () => { const top = open[0], last = open.pop(); if (open.length) { open[0] = last; let i = 0; for (; ;) { const l = i * 2 + 1, r2 = l + 1; let m = i; if (l < open.length && open[l][0] < open[m][0]) m = l; if (r2 < open.length && open[r2][0] < open[m][0]) m = r2; if (m === i) break; [open[m], open[i]] = [open[i], open[m]]; i = m; } } return top; };
  const gs = new Map(); gs.set(s, 0); _came[s] = -1; push(s, hfn(s)); let n = 0, found = false;
  while (open.length && n++ < maxN) {
    const [, k] = pop(); if (_closed[k] === _stamp) continue; _closed[k] = _stamp; if (k === t) { found = true; break; }
    const x = k % W2, z = (k / W2) | 0, gk = gs.get(k);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue; const nx = x + dx, nz = z + dz; if (nx < 0 || nz < 0 || nx >= W2 || nz >= NAV.h) continue;
      const q = nz * W2 + nx; if (NAV.block[q] || _closed[q] === _stamp) continue;
      if (dx && dz && (NAV.block[z * W2 + nx] || NAV.block[nz * W2 + x])) continue;
      const ng = gk + (dx && dz ? 1.414 : 1); const old = gs.get(q); if (old !== undefined && old <= ng) continue;
      gs.set(q, ng); _came[q] = k; push(q, ng + hfn(q));
    }
  }
  if (!found) return null;
  const cells = []; for (let k = t; k !== -1; k = _came[k]) cells.push(k); cells.reverse();
  const pts = cells.map(k => ({ x: NAV.x0 + (k % W2 + 0.5) * NAV.res, z: NAV.z0 + (((k / W2) | 0) + 0.5) * NAV.res }));
  // string-pull
  const out = []; let a = { x: sx, z: sz }, i = 0;
  while (i < pts.length - 1) { let j = Math.min(pts.length - 1, i + 40); while (j > i + 1 && !walkLine(a.x, a.z, pts[j].x, pts[j].z)) j--; out.push(pts[j]); a = pts[j]; i = j; }
  if (!out.length) out.push(pts[pts.length - 1]);
  out[out.length - 1] = navFree(tx, tz) ? { x: tx, z: tz } : out[out.length - 1];
  return out;
}
function randomSpot(minDistFrom, minD = 0) { const S = MAP.spots; for (let k = 0; k < 40; k++) { const s = pick(S); if (!minDistFrom || Math.hypot(s.x - minDistFrom.x, s.z - minDistFrom.z) >= minD) return s; } return pick(S); }
