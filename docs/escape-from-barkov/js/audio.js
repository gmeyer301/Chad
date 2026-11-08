/* Escape from Barkov — synthesized positional audio */
'use strict';
(() => {
const AU = G.AU = { ctx: null, ok: false };
let ctx, master, noiseBuf, amb = null, listener;
AU.init = () => {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  AU.ctx = ctx; master = ctx.createGain(); master.gain.value = G.S ? G.S.settings.vol : .8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; master.connect(comp); comp.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  listener = ctx.listener; AU.ok = true;
};
AU.setVol = v => { if (master) master.gain.value = v; };
AU.listen = (p, fwd) => {
  if (!ctx) return; const L = listener;
  if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
  else { L.setPosition(p.x, p.y, p.z); L.setOrientation(fwd.x, fwd.y, fwd.z, 0, 1, 0); }
  AU.lp = p;
};
// output node for a world position (null = non-positional / own sounds)
function out(pos, vol = 1, far = 1) {
  const g = ctx.createGain(); g.gain.value = vol;
  if (!pos) { g.connect(master); return g; }
  const pn = ctx.createPanner(); pn.panningModel = 'equalpower'; pn.distanceModel = 'inverse'; pn.refDistance = 6 * far; pn.maxDistance = 1000; pn.rolloffFactor = 1.1;
  if (pn.positionX) { pn.positionX.value = pos.x; pn.positionY.value = pos.y; pn.positionZ.value = pos.z; } else pn.setPosition(pos.x, pos.y, pos.z);
  // distant sounds lose highs
  let dist = AU.lp ? Math.hypot(pos.x - AU.lp.x, pos.y - AU.lp.y, pos.z - AU.lp.z) : 0;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = G.clamp(18000 / (1 + dist / 25), 500, 18000);
  g.connect(lp); lp.connect(pn); pn.connect(master); return g;
}
function noise(dst, t0, dur, f1, f2, q = 1, type = 'bandpass', a = 1, decay = 4) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = .8 + Math.random() * .4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f1, t0); f.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur); f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(a, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dst); s.start(t0, Math.random()); s.stop(t0 + dur + .05);
}
function tone(dst, t0, dur, f1, f2, type = 'sine', a = .5) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(a, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + .05);
}
const CALS = { '9x18': [2600, .7], '9x19': [2900, .8], '545': [3600, 1.1], '556': [3800, 1.1], '762x39': [3000, 1.25], '762r': [2600, 1.6], '12ga': [1800, 1.5] };
AU.shot = (pos, cal, supp) => {
  if (!AU.ok) return; const t = ctx.currentTime; const [fr, pw] = CALS[cal] || [3000, 1];
  const o = out(pos, supp ? .25 : .9 * pw, supp ? .4 : 3);
  if (supp) { noise(o, t, .12, 2200, 500, .8, 'bandpass', .9); tone(o, t, .08, 300, 90, 'triangle', .4); return; }
  noise(o, t, .05, 9000, 3000, .5, 'highpass', 1.2);
  noise(o, t, .35 * pw, fr, 180, .7, 'lowpass', 1.3);
  tone(o, t, .2 * pw, 140, 40, 'sine', .9);
  // tail / echo
  noise(o, t + .06, .9 * pw, 900, 120, .5, 'lowpass', .25);
};
AU.click = (pos, f = 2200, a = .25) => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, a); noise(o, t, .03, f, f * .7, 4, 'bandpass', 1); };
AU.reload = (pos, stage) => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, .35); if (stage === 0) { noise(o, t, .05, 1500, 900, 3); noise(o, t + .08, .04, 2500, 1500, 4); } else { noise(o, t, .04, 3000, 2000, 5); tone(o, t, .05, 900, 600, 'square', .08); } };
AU.bolt = pos => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, .4); noise(o, t, .06, 1800, 1200, 3); noise(o, t + .16, .07, 2600, 1600, 3); };
AU.step = (pos, loud, surface) => {
  if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, loud, .7);
  if (surface === 'wood') { tone(o, t, .07, 180, 90, 'triangle', .5); noise(o, t, .06, 700, 300, 2, 'bandpass', .6); }
  else if (surface === 'metal') { tone(o, t, .12, 420, 380, 'square', .08); noise(o, t, .06, 2000, 900, 3, 'bandpass', .5); }
  else if (surface === 'concrete') noise(o, t, .06, 1600, 700, 1.5, 'bandpass', .7);
  else noise(o, t, .09, 900, 300, .8, 'bandpass', .9);
};
AU.hit = (pos, kind) => {
  if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, .6, .8);
  if (kind === 'armor') { tone(o, t, .25, 2400, 1900, 'square', .07); noise(o, t, .05, 4000, 2000, 3, 'bandpass', .6); }
  else if (kind === 'flesh') { noise(o, t, .1, 600, 200, 1, 'lowpass', 1); tone(o, t, .12, 120, 60, 'sine', .7); }
  else if (kind === 'head') { tone(o, t, .3, 1100, 700, 'triangle', .3); noise(o, t, .08, 900, 300, 1, 'lowpass', 1); }
  else if (kind === 'wood') noise(o, t, .08, 1200, 400, 2, 'bandpass', .6);
  else if (kind === 'metal') { tone(o, t, .2, 1700 + Math.random() * 800, 1400, 'triangle', .1); noise(o, t, .04, 5000, 3000, 2, 'bandpass', .4); }
  else noise(o, t, .07, 2500, 600, 1, 'bandpass', .5);
};
AU.crack = pos => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, .5, .3); noise(o, t, .03, 7000, 4000, 2, 'highpass', 1); };
AU.boom = pos => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, 1.8, 4); noise(o, t, 1.6, 1200, 40, .5, 'lowpass', 1.5); tone(o, t, .6, 80, 25, 'sine', 1.2); };
AU.pin = pos => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, .4); tone(o, t, .05, 3200, 3000, 'square', .05); noise(o, t + .05, .05, 4000, 2000, 5); };
AU.voice = (pos, kind, pitch = 1) => {
  // tree creak "words"
  if (!AU.ok) return; const t = ctx.currentTime; const o = out(pos, .55, 1.2);
  const base = (kind === 'boss' ? 55 : kind === 'pmc' ? 90 : 120) * pitch; const n = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const t0 = t + i * .18; const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(base * (1 + Math.random() * .4), t0); osc.frequency.linearRampToValueAtTime(base * (.7 + Math.random() * .6), t0 + .16);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 700; f.Q.value = 3;
    const g = ctx.createGain(); g.gain.setValueAtTime(.001, t0); g.gain.linearRampToValueAtTime(.5, t0 + .03); g.gain.exponentialRampToValueAtTime(.001, t0 + .17);
    osc.connect(f); f.connect(g); g.connect(o); osc.start(t0); osc.stop(t0 + .2);
  }
};
AU.ui = (f = 900) => { if (!AU.ok) return; const t = ctx.currentTime; tone(out(null, .15), t, .05, f, f * .8, 'square', .15); };
AU.extractBeep = () => { if (!AU.ok) return; const t = ctx.currentTime; tone(out(null, .3), t, .12, 1200, 1200, 'sine', .3); };
AU.breath = () => { if (!AU.ok) return; const t = ctx.currentTime; noise(out(null, .25), t, .7, 1200, 500, .7, 'bandpass', .5); };
AU.heart = () => { if (!AU.ok) return; const t = ctx.currentTime; const o = out(null, .4); tone(o, t, .12, 60, 40, 'sine', .9); tone(o, t + .22, .12, 55, 38, 'sine', .7); };
AU.tinnitus = (dur = 3) => { if (!AU.ok) return; const t = ctx.currentTime; const o = ctx.createOscillator(); o.frequency.value = 4200; const g = ctx.createGain(); g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur); };
AU.ambient = (night, indoor) => {
  if (!AU.ok) return; AU.stopAmbient();
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = indoor ? 220 : 420;
  const g = ctx.createGain(); g.gain.value = indoor ? .05 : .09; s.connect(f); f.connect(g); g.connect(master); s.start();
  const lfo = ctx.createOscillator(); lfo.frequency.value = .07; const lg = ctx.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  amb = { s, lfo, night, indoor, t: 0 };
};
AU.ambTick = dt => {
  if (!amb || !AU.ok) return; amb.t -= dt; if (amb.t > 0) return; amb.t = 1 + Math.random() * 4;
  const t = ctx.currentTime; const o = out(null, .06);
  if (amb.indoor) { if (Math.random() < .3) tone(o, t, 1.5, 55, 50, 'sine', .4); return; }
  if (amb.night) { for (let i = 0; i < 6; i++) tone(o, t + i * .07, .04, 4300, 4200, 'sine', .3); }
  else { const f0 = 2500 + Math.random() * 2000; for (let i = 0; i < 2 + Math.random() * 3; i++) tone(o, t + i * .13, .1, f0, f0 * (1.2 + Math.random() * .4), 'sine', .25); }
};
AU.stopAmbient = () => { if (amb) { try { amb.s.stop(); amb.lfo.stop(); } catch (e) { } amb = null; } };
})();
