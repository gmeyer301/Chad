/* Escape from Barkov — raid preparation, loading, boot */
'use strict';
(() => {
const I = G.ITEMS; const $ = G.$, h = G.h;
const P = G.PREP = { step: 'char', char: 'pmc', map: 'sawmill', night: false };

G.raidPrep = (fromNet) => {
  const N = G.NET; G.AU.init();
  if (N && N.lobby && !N.isHost && !fromNet) { G.toast('Waiting for the squad leader to pick a raid'); }
  if (N && N.lobby && N.cfg) { P.map = N.cfg.map; P.night = N.cfg.night; }
  P.step = 'char'; P.ready = false; drawPrep();
};
function drawPrep() {
  const S = G.S; const el = $('#prep'); G.show('prep'); el.innerHTML = '';
  const N = G.NET; const inSquad = !!(N && N.lobby); const host = !inSquad || N.isHost;
  const head = h('div', 'prep-head'); head.innerHTML = `<button class="btn sm" id="pp-back">◂ BACK</button><div class="steps">${['char', 'map', 'ins', 'go'].map((s, i) => `<span class="${P.step === s ? 'on' : ''}">${i + 1}. ${['CHARACTER', 'LOCATION', 'INSURANCE', 'READY'][i]}</span>`).join('')}</div>${inSquad ? `<div class="sq">SQUAD ${N.code} · ${N.members.size} players · ${N.mode === 'pvp' ? 'PvP' : 'Co-op'}</div>` : ''}`;
  el.appendChild(head); const body = h('div', 'prep-body'); el.appendChild(body);
  $('#pp-back').onclick = () => { if (P.step === 'char') { if (inSquad && P.ready) N.setReady(false); G.menu('main'); } else { P.step = { map: 'char', ins: 'map', go: P.char === 'pmc' ? 'ins' : 'map' }[P.step]; drawPrep(); } };
  if (P.step === 'char') {
    const cd = Math.max(0, (S.scavAt - Date.now()) / 1000);
    const pv = Object.values(S.eq).reduce((s, v) => s + (v && v.u ? G.value(v) : v && v.items ? v.items.reduce((a, e) => a + G.value(e.it), 0) : 0), 0);
    const hp = G.totalHP(S.health), mx = G.maxHP(S.health);
    body.innerHTML = `<div class="chars">
     <div class="charcard ${P.char === 'pmc' ? 'on' : ''}" data-c="pmc"><div class="cc-art pmc"></div><h3>PMC — ${G.esc(S.name)}</h3><p>Your operator. Brings your gear; loses it all on death (except the Seed Pod).</p><div class="stat"><span>Gear value</span><b>${G.rub(pv)}</b></div><div class="stat"><span>Health</span><b class="${hp < mx * .6 ? 'bad' : ''}">${Math.round(hp)}/${mx}</b></div><div class="stat"><span>Energy / Water</span><b>${Math.round(S.health.en)} / ${Math.round(S.health.hyd)}</b></div></div>
     <div class="charcard ${P.char === 'scav' ? 'on' : ''} ${cd > 0 ? 'dis' : ''}" data-c="scav"><div class="cc-art scav"></div><h3>SAPLING (scav)</h3><p>A random sapling with random junk gear. Joins mid-raid. Other saplings leave you alone — unless you shoot them. Nothing to lose.</p><div class="stat"><span>Available</span><b>${cd > 0 ? 'in ' + G.mmss(cd) : 'NOW'}</b></div></div></div>`;
    body.querySelectorAll('.charcard').forEach(c => c.onclick = () => { if (c.classList.contains('dis')) return G.toast('Your sapling is still regrowing', 'bad'); P.char = c.dataset.c; drawPrep(); });
    const nx = h('button', 'btn big gold', 'NEXT'); nx.onclick = () => { if (P.char === 'pmc' && hp < mx * .35 && !confirm('Your operator is badly hurt. Raid anyway?')) return; P.step = 'map'; drawPrep(); }; body.appendChild(nx);
  } else if (P.step === 'map') {
    const maps = h('div', 'maps');
    Object.entries(G.MAPS_META).forEach(([k, m]) => { const c = h('div', 'mapcard ' + (P.map === k ? 'on' : '') + (host ? '' : ' locked')); c.innerHTML = `<div class="mc-art ${k}"></div><h3>${m.name}</h3><p>${m.desc}</p><div class="stat"><span>Raid time</span><b>${m.time} min</b></div><div class="stat"><span>Difficulty</span><b>${m.diff}</b></div>`; c.onclick = () => { if (!host) return G.toast('The squad leader picks the location'); P.map = k; drawPrep(); }; maps.appendChild(c); });
    body.appendChild(maps);
    const tod = h('div', 'tod'); tod.innerHTML = `<button class="btn ${!P.night ? 'gold' : ''}" data-n="0">☀ DAY</button><button class="btn ${P.night ? 'gold' : ''}" data-n="1">☾ NIGHT</button><span class="dim">Night: darker, AI see less — so do you. Press T for your firefly light.</span>`;
    tod.querySelectorAll('button').forEach(b => b.onclick = () => { if (!host) return; P.night = b.dataset.n === '1'; drawPrep(); }); body.appendChild(tod);
    const nx = h('button', 'btn big gold', 'NEXT'); nx.onclick = () => { P.step = P.char === 'pmc' ? 'ins' : 'go'; drawPrep(); }; body.appendChild(nx);
  } else if (P.step === 'ins') {
    const items = ['primary', 'secondary', 'holster', 'helmet', 'armor', 'rig', 'backpack'].map(s => S.eq[s]).filter(Boolean);
    const box = h('div', 'ins'); box.innerHTML = `<p>Pinecone will insure your gear. If it isn't looted, it comes back by message ~15 minutes after you die (65% chance each). Contents aren't insured.</p>`;
    let total = 0;
    items.forEach(it => { const c = G.insureCost(it); const row = h('label', 'insrow'); row.innerHTML = `<input type="checkbox" ${it.ins ? 'checked disabled' : ''}><img src="${G.icon(it.id)}"><span>${G.esc(I[it.id].name)}</span><b>${it.ins ? 'INSURED' : G.rub(c)}</b>`; row.querySelector('input')._it = it; box.appendChild(row); if (!it.ins) total += c; });
    if (!items.length) box.appendChild(h('p', 'dim', 'You\'re going in naked. Bold.'));
    const bt = h('button', 'btn gold', 'Insure selected'); bt.onclick = () => { const sel = [...box.querySelectorAll('input:checked:not(:disabled)')].map(x => x._it); const c = sel.reduce((s, it) => s + G.insureCost(it), 0); if (!sel.length) return; if (!G.pay(c)) return G.toast('Not enough Rubarks', 'bad'); sel.forEach(it => it.ins = true); G.save(); drawPrep(); };
    const all = h('button', 'btn', 'Select all'); all.onclick = () => box.querySelectorAll('input:not(:disabled)').forEach(x => x.checked = true);
    box.appendChild(all); box.appendChild(bt); body.appendChild(box);
    const nx = h('button', 'btn big gold', 'NEXT'); nx.onclick = () => { P.step = 'go'; drawPrep(); }; body.appendChild(nx);
  } else if (P.step === 'go') {
    const m = G.MAPS_META[P.map];
    body.innerHTML = `<div class="gocard"><h2>${m.name.toUpperCase()}</h2><p>${P.night ? 'NIGHT' : 'DAY'} · ${P.char === 'pmc' ? 'PMC' : 'SAPLING'} · ${m.time} min</p><ul class="dim"><li>Your extracts are only revealed in raid (press <b>O</b>).</li><li>Survive and extract to keep what you find.</li><li>Tab = inventory · F = interact · L = check mag</li></ul></div>`;
    if (inSquad) {
      const list = h('div', 'squadlist'); N.members.forEach(mm => list.appendChild(h('div', '', `${mm.ready ? '✔' : '…'} ${G.esc(mm.name)} <small>lvl ${mm.lvl}${mm.host ? ' · leader' : ''}</small>`))); body.appendChild(list);
      const b = h('button', 'btn big gold', P.ready ? (host ? 'START RAID' : 'WAITING FOR LEADER…') : 'READY');
      b.onclick = () => { if (!P.ready) { P.ready = true; N.setReady(true, P.char, host ? { map: P.map, night: P.night } : null); drawPrep(); } else if (host) { if (![...N.members.values()].every(x => x.ready)) return G.toast('Not everyone is ready', 'bad'); N.startRaid(P.map, P.night); } };
      body.appendChild(b);
    } else { const b = h('button', 'btn big gold', 'READY'); b.onclick = () => goRaid({ map: P.map, night: P.night, scav: P.char === 'scav' }); body.appendChild(b); }
  }
}
G.drawPrep = drawPrep;

// loading screen then start
const goRaid = G.goRaid = (cfg) => {
  const el = $('#loading'); G.show('loading');
  const m = G.MAPS_META[cfg.map];
  el.innerHTML = `<div class="ld"><h2>${m.name.toUpperCase()}</h2><div class="ldbar"><i></i></div><p class="dim">${G.pick(['Roots are listening. Walk slow.', 'Thorax and head. Everything else is a delay.', 'A Seed Pod is the only pocket death can\'t empty.', 'Checking your mag with L is free. Running dry isn\'t.', 'Saplings travel in groups. One shot means three more are coming.', 'Bleeding out is the most common cause of death in Barkov.', 'Penetration beats armor class. Buy better ammo before better armor.'])}</p></div>`;
  let k = 0; const bar = el.querySelector('i'); const iv = setInterval(() => { k = Math.min(95, k + 7 + Math.random() * 10); bar.style.width = k + '%'; }, 120);
  setTimeout(() => { try { G.startRaid(cfg); } catch (e) { console.error(e); G.toast('Raid failed to load: ' + e.message, 'bad'); G.S.inRaid = null; G.save(); G.menu('main'); } clearInterval(iv); }, cfg.delay || 900);
};

/* ---------- boot ---------- */
G.boot = () => {
  G.load(); const S = G.S;
  // tab closed during a raid = missing in action
  if (S.inRaid) {
    const was = S.inRaid; S.inRaid = null;
    if (!was.scav) { const sec = S.eq.secure; const ne = G.newEq(); if (sec) ne.secure = sec; S.eq = ne; S.stats.mia++; G.PARTS.forEach(k => { const p = S.health.p[k]; p.hp = Math.round(p.max * .4); }); }
    G.save(); setTimeout(() => G.modal('MISSING IN ACTION', `You left a raid on ${G.MAPS_META[was.map] ? G.MAPS_META[was.map].name : 'Barkov'} before extracting. ${was.scav ? 'Your sapling is gone.' : 'Your gear is gone — except your Seed Pod.'}`), 400);
  }
  G.hideoutTick(); G.save();
  setInterval(() => { if (!G.R) { G.hideoutTick(); if (Math.random() < .2) G.save(); } }, 5000);
  const t = $('#title'); G.show('title');
  t.innerHTML = `<div class="tt"><div class="tt-logo">ESCAPE FROM<br><b>BARKOV</b></div><div class="tt-sub">everyone is trees</div><button class="btn big gold" id="tt-go">ENTER</button><div class="ver">${G.VERSION} · s0meTh1ng.MP4 / Henry &amp; Claude.AI</div></div>`;
  $('#tt-go').onclick = () => { G.AU.init(); G.AU.ui(); G.menu('main'); if (!S.seenIntro) { S.seenIntro = true; G.save(); G.modal('Welcome to Barkov', `<p>This is a hardcore extraction shooter. Everyone — you included — is a tree.</p><ul><li>Gear up in <b>CHARACTER</b>. Drag items between your stash and slots. Right-click for options. Press R while dragging to rotate.</li><li>Press <b>ESCAPE FROM BARKOV</b> to raid. Find loot, then reach one of <b>your</b> extracts (press O in raid).</li><li>Die and you lose everything you brought, except the <b>Seed Pod</b> secure container.</li><li>No crosshair. No ammo counter. Press <b>L</b> to check your mag. Aim with right mouse.</li><li>Your progress saves automatically on this device.</li></ul>`, [{ t: 'Let\'s go', c: 'gold' }]); } };
  // global buttons
  document.addEventListener('click', e => { if (e.target.closest('.btn,.tab')) G.AU.ui(); });
};
window.addEventListener('beforeunload', () => { if (G.S && !G.R) G.save(); });
})();
