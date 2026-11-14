'use strict';
/* TV faces: draw or type your own face. Faces are tiny 160x120 PNGs shared with everyone in the lobby. */
const FW = 160, FH = 120;
const FACE = { url: null };
const _ftex = new Map();
function newFaceCanvas() { const c = document.createElement('canvas'); c.width = FW; c.height = FH; return c; }
function faceTex(url, glitch) {
  const key = (glitch ? 'g' : '') + url; if (_ftex.has(key)) return _ftex.get(key);
  const c = newFaceCanvas(), x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, FW, FH);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter;
  const img = new Image();
  img.onload = () => { x.drawImage(img, 0, 0, FW, FH); if (glitch) glitchify(x); t.needsUpdate = true; };
  img.src = url; _ftex.set(key, t); return t;
}
function glitchify(x) {
  const r = seeded(7);
  for (let i = 0; i < 14; i++) { const y = r.int(0, FH - 8), h = r.int(2, 9), dx = r.int(-24, 24); const d = x.getImageData(0, y, FW, h); x.putImageData(d, dx, y); }
  x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(255,0,40,.35)'; x.fillRect(0, 0, FW, FH); x.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 6; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,255,220,.45)' : 'rgba(255,0,80,.5)'; x.fillRect(0, r.int(0, FH), FW, r.int(1, 4)); }
  x.fillStyle = '#ff2050'; x.font = 'bold 18px monospace'; x.textAlign = 'center'; x.fillText('V1RUS', FW / 2, FH - 10);
}
// faces for bots / defaults
const PRESETS = ['smile', 'wow', 'dead', 'happy', 'evil', 'hi', 'heart', 'uwu', 'cool', 'cry', 'what', 'sus'];
function presetFace(kind, fg = '#ffffff', bg = '#0d1a24') {
  const c = newFaceCanvas(), x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, FW, FH);
  x.strokeStyle = fg; x.fillStyle = fg; x.lineWidth = 7; x.lineCap = 'round'; x.lineJoin = 'round';
  const eye = (cx, cy, r = 9) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  const arc = (cx, cy, r, a0, a1) => { x.beginPath(); x.arc(cx, cy, r, a0, a1); x.stroke(); };
  const line = (a, b, c2, d) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); };
  const txt = (t, s = 54) => { x.font = 'bold ' + s + 'px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, FW / 2, FH / 2 + 3); };
  switch (kind) {
    case 'smile': eye(55, 45); eye(105, 45); arc(80, 62, 30, 0.25, Math.PI - 0.25); break;
    case 'wow': eye(55, 42, 12); eye(105, 42, 12); x.beginPath(); x.ellipse(80, 84, 12, 16, 0, 0, 7); x.stroke(); break;
    case 'dead': line(42, 32, 66, 56); line(66, 32, 42, 56); line(94, 32, 118, 56); line(118, 32, 94, 56); line(55, 88, 105, 88); break;
    case 'happy': arc(55, 52, 13, Math.PI + 0.3, -0.3); arc(105, 52, 13, Math.PI + 0.3, -0.3); arc(80, 66, 26, 0.2, Math.PI - 0.2); break;
    case 'evil': line(40, 32, 68, 46); line(120, 32, 92, 46); eye(56, 52, 7); eye(104, 52, 7); arc(80, 60, 30, 0.35, Math.PI - 0.35); break;
    case 'hi': txt('HI!', 60); break;
    case 'heart': for (const cx of [52, 108]) { x.beginPath(); x.moveTo(cx, 58); x.bezierCurveTo(cx - 22, 40, cx - 10, 22, cx, 36); x.bezierCurveTo(cx + 10, 22, cx + 22, 40, cx, 58); x.fill(); } arc(80, 70, 22, 0.3, Math.PI - 0.3); break;
    case 'uwu': txt('uwu', 50); break;
    case 'cool': x.fillRect(30, 34, 46, 20); x.fillRect(84, 34, 46, 20); x.fillRect(70, 38, 20, 6); line(60, 88, 100, 82); break;
    case 'cry': eye(55, 45); eye(105, 45); arc(80, 100, 24, Math.PI + 0.4, -0.4); x.fillStyle = '#5cc8ff'; x.fillRect(50, 56, 8, 30); x.fillRect(100, 56, 8, 30); break;
    case 'what': txt('?', 90); break;
    case 'sus': eye(58, 48, 7); eye(108, 48, 7); line(40, 34, 70, 38); line(56, 86, 104, 80); break;
  }
  return c.toDataURL('image/png');
}
function myFace() {
  if (FACE.url) return FACE.url;
  const s = LS.getItem('sl_face'); FACE.url = s || presetFace('smile', '#ffffff', '#123044'); return FACE.url;
}

/* ---------------- the face editor ---------------- */
const FE = { mode: 'draw', tool: 'brush', size: 6, color: '#ffffff', bg: '#123044', undo: [], drawing: false, lx: 0, ly: 0, text: '', tcol: '#ffffff', font: 0, onSave: null };
const FE_COLORS = ['#ffffff', '#000000', '#ff3b3b', '#ff9a2e', '#ffe14a', '#5ee36a', '#2fd3c5', '#4aa3ff', '#8a5cff', '#ff5ec4', '#8b5a2b', '#9aa0a6'];
const FE_FONTS = ['bold %spx "Courier New", monospace', 'bold %spx Impact, "Arial Black", sans-serif', 'bold %spx "Comic Sans MS", "Chalkboard SE", cursive', 'bold %spx Georgia, serif'];
function openFaceEditor(onSave) {
  FE.onSave = onSave || null;
  const p = document.getElementById('faceEd'); p.classList.add('show');
  const c = document.getElementById('fc'), x = c.getContext('2d');
  const img = new Image(); img.onload = () => { x.drawImage(img, 0, 0, FW, FH); FE.undo = []; }; img.src = myFace();
  feRenderPalette(); feMode('draw');
}
function feCtx() { return document.getElementById('fc').getContext('2d'); }
function fePush() { const x = feCtx(); FE.undo.push(x.getImageData(0, 0, FW, FH)); if (FE.undo.length > 25) FE.undo.shift(); }
function feUndo() { const d = FE.undo.pop(); if (d) feCtx().putImageData(d, 0, 0); }
function feClear() { fePush(); const x = feCtx(); x.fillStyle = FE.bg; x.fillRect(0, 0, FW, FH); }
function feMode(m) {
  FE.mode = m; document.querySelectorAll('#faceEd .tab').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  document.getElementById('feDraw').style.display = m === 'draw' ? '' : 'none';
  document.getElementById('feType').style.display = m === 'type' ? '' : 'none';
  if (m === 'type') feTypeRender();
}
function feRenderPalette() {
  const mk = (id, cur, set) => { const el = document.getElementById(id); el.innerHTML = ''; FE_COLORS.forEach(col => { const b = document.createElement('button'); b.className = 'sw' + (col === cur() ? ' on' : ''); b.style.background = col; b.onclick = () => { set(col); feRenderPalette(); if (FE.mode === 'type') feTypeRender(); }; el.appendChild(b); }); };
  mk('fePal', () => FE.color, c => { FE.color = c; if (FE.tool === 'eraser') FE.tool = 'brush'; feTools(); });
  mk('feBg', () => FE.bg, c => { FE.bg = c; });
  mk('feTPal', () => FE.tcol, c => { FE.tcol = c; });
  mk('feTBg', () => FE.bg, c => { FE.bg = c; });
  feTools();
}
function feTools() { document.querySelectorAll('#feDraw [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === FE.tool)); document.querySelectorAll('#feDraw [data-size]').forEach(b => b.classList.toggle('on', +b.dataset.size === FE.size)); }
function fePos(e) { const c = document.getElementById('fc'), r = c.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return [(t.clientX - r.left) / r.width * FW, (t.clientY - r.top) / r.height * FH]; }
function feStroke(x0, y0, x1, y1) {
  const x = feCtx(); x.strokeStyle = FE.tool === 'eraser' ? FE.bg : FE.color; x.lineWidth = FE.size; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1 + 0.01, y1); x.stroke();
}
function feFill(px, py) {
  const x = feCtx(), d = x.getImageData(0, 0, FW, FH), a = d.data; px |= 0; py |= 0;
  const i0 = (py * FW + px) * 4, tr = a[i0], tg = a[i0 + 1], tb = a[i0 + 2];
  const hex = FE.color.replace('#', ''); const nr = parseInt(hex.slice(0, 2), 16), ng = parseInt(hex.slice(2, 4), 16), nb = parseInt(hex.slice(4, 6), 16);
  if (Math.abs(tr - nr) + Math.abs(tg - ng) + Math.abs(tb - nb) < 6) return;
  const same = i => Math.abs(a[i] - tr) + Math.abs(a[i + 1] - tg) + Math.abs(a[i + 2] - tb) < 60;
  const st = [[px, py]], seen = new Uint8Array(FW * FH);
  while (st.length) {
    const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= FW || cy >= FH) continue; const k = cy * FW + cx; if (seen[k]) continue; seen[k] = 1;
    const i = k * 4; if (!same(i)) continue; a[i] = nr; a[i + 1] = ng; a[i + 2] = nb; a[i + 3] = 255;
    st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  x.putImageData(d, 0, 0);
}
function feTypeRender() {
  const x = feCtx(); x.fillStyle = FE.bg; x.fillRect(0, 0, FW, FH);
  const text = (document.getElementById('ftext').value || '').slice(0, 30); if (!text) return;
  const words = text.split(/\s+/); let size = 64, lines = [];
  for (; size > 10; size -= 2) {
    x.font = FE_FONTS[FE.font].replace('%s', size); lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > FW - 12 && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    if (lines.length * size * 1.05 <= FH - 10 && lines.every(l => x.measureText(l).width <= FW - 10)) break;
  }
  x.fillStyle = FE.tcol; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => x.fillText(l, FW / 2, FH / 2 + (i - (lines.length - 1) / 2) * size * 1.05 + 2));
}
function feSave() {
  const url = document.getElementById('fc').toDataURL('image/png');
  FACE.url = url; try { LS.setItem('sl_face', url); } catch (e) { }
  document.getElementById('faceEd').classList.remove('show');
  if (FE.onSave) FE.onSave(url);
}
function feRandom() { fePush(); const url = presetFace(pick(PRESETS), pick(FE_COLORS.filter(c => c !== '#000000')), pick(['#123044', '#0b0b0b', '#2a1036', '#103a22', '#3a1010', '#20202a'])); const img = new Image(); img.onload = () => feCtx().drawImage(img, 0, 0); img.src = url; }
function initFaceEditor() {
  const c = document.getElementById('fc');
  const down = e => { if (FE.mode !== 'draw') return; e.preventDefault(); const [px, py] = fePos(e); fePush(); if (FE.tool === 'fill') { feFill(px, py); return; } FE.drawing = true; FE.lx = px; FE.ly = py; feStroke(px, py, px, py); };
  const move = e => { if (!FE.drawing) return; e.preventDefault(); const [px, py] = fePos(e); feStroke(FE.lx, FE.ly, px, py); FE.lx = px; FE.ly = py; };
  const up = () => { FE.drawing = false; };
  c.addEventListener('mousedown', down); addEventListener('mousemove', move); addEventListener('mouseup', up);
  c.addEventListener('touchstart', down, { passive: false }); c.addEventListener('touchmove', move, { passive: false }); c.addEventListener('touchend', up);
  document.querySelectorAll('#faceEd .tab').forEach(b => b.onclick = () => feMode(b.dataset.m));
  document.querySelectorAll('#feDraw [data-tool]').forEach(b => b.onclick = () => { FE.tool = b.dataset.tool; feTools(); });
  document.querySelectorAll('#feDraw [data-size]').forEach(b => b.onclick = () => { FE.size = +b.dataset.size; feTools(); });
  document.getElementById('ftext').addEventListener('input', feTypeRender);
  document.getElementById('ffont').onclick = () => { FE.font = (FE.font + 1) % FE_FONTS.length; feTypeRender(); };
  document.getElementById('feUndo').onclick = feUndo; document.getElementById('feClear').onclick = feClear;
  document.getElementById('feRand').onclick = feRandom; document.getElementById('feSave').onclick = feSave;
  document.getElementById('feCancel').onclick = () => document.getElementById('faceEd').classList.remove('show');
}
