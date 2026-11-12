'use strict';
/* GARDEN TIME — bots: crab AI that farms, sells, steals, fights + a chat brain that actually replies */
const PERSONAS = ['hype', 'chill', 'grumpy', 'nerd', 'silly'];

function setupBots() {
  const used = new Set([NET.myPlot || 0].concat(Object.values(NET.plots || {})));
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < PLOTS.length; i++) { if (used.has(i)) continue; addBot(i, names.pop()); }
}
function addBot(plot, name) {
  const pers = PERSONAS[G.bots.length % PERSONAS.length];
  const tier = Math.random();
  const maxPrice = tier < 0.3 ? 500 : tier < 0.6 ? 20000 : tier < 0.85 ? 1e6 : 3e7;
  const b = { name, plot, pers, color: randomColor(), x: PLOTS[plot].x + rnd(-6, 6), z: PLOTS[plot].z + rnd(-4, 4), y: 0, vy: 0, rot: 0, vx: 0, vz: 0,
    money: Math.round(rnd(0.3, 3) * maxPrice), backpack: [], goal: null, think: rnd(0.5, 2), chatCd: 0, giveCd: 0, mem: {}, recent: [], hearts: 5,
    fav: { plant: pick(PLANTS.filter(d => !d.noShop && d.p > 0)).n, pet: pick(PETS.filter(p => !p.aao)).n, color: pick(['red', 'blue', 'green', 'purple', 'orange', 'pink', 'teal', 'gold']) },
    stealCd: rnd(60, 200), pinchCd: 0, mood: rnd(0.4, 1) };
  b.mesh = makeCrab(b.color); W.s.add(b.mesh);
  b.tag = textSprite(name + ' 🤖', '#d8f0ff', null, 0.42); b.tag.position.y = 1.7; b.mesh.add(b.tag);
  b.bubble = null;
  const g = makeGarden(plot, name, 'bot'); G.gardens.push(g); b.garden = g;
  const pool = PLANTS.filter(d => !d.noShop && d.p <= maxPrice && !d.tg || (d.tg && d.p <= maxPrice / 3 && !d.noShop));
  const n = rndi(6, 16);
  for (let i = 0; i < n; i++) { let x, z, t = 0; do { x = rnd(-PLOT_W / 2 + 1, PLOT_W / 2 - 1); z = rnd(-PLOT_D / 2 + 1, PLOT_D / 2 - 1); t++; } while (!canPlantHere(g, x, z) && t < 30); if (t >= 30) break; const d = weightedPick(pool); const p = addPlant(g, d.id, x, z, d.g * rnd(0.3, 1.5)); }
  if (Math.random() < 0.25) { const dd = PLANTS.filter(d => d.def && !d.noShop && d.p <= maxPrice * 2); if (dd.length) { const d = pick(dd); addPlant(g, d.id, rnd(-3, 3), PLOTS[plot].face * (PLOT_D / 2 - 1.5), d.g * 2); } }
  plotSign(plot, name, '#3a5a8a');
  G.bots.push(b); return b;
}
function removeBotAt(plot) {
  const i = G.bots.findIndex(b => b.plot === plot); if (i < 0) return;
  const b = G.bots[i]; W.s.remove(b.mesh); destroyGarden(b.garden); G.gardens.splice(G.gardens.indexOf(b.garden), 1); G.bots.splice(i, 1);
  botSay(b, pick(['gtg bye!', 'ok my mom is calling me, cya', 'leaving to touch grass 🌱', 'peace out crabs']));
}

/* ---------- movement ---------- */
function botWaypoint(b, tx, tz) {
  // route through garden entrances so bots don't walk through fences
  const inB = inAnyPlot(b.x, b.z, 0.3), inT = inAnyPlot(tx, tz, 0.3);
  if (inB >= 0 && inB !== inT) { const p = PLOTS[inB]; const ex = p.x, ez = p.z + p.face * (PLOT_D / 2 - 0.5); if (Math.hypot(b.x - ex, b.z - ez) < 1) b.exiting = inB; if (b.exiting !== inB || Math.abs(b.x - p.x) > 2) return [ex, ez]; return [ex, p.z + p.face * (PLOT_D / 2 + 2.5)]; }
  if (inB < 0) b.exiting = -1;
  if (inT >= 0 && inB !== inT) { const p = PLOTS[inT]; const ox = p.x, oz = p.z + p.face * (PLOT_D / 2 + 2); if (Math.abs(b.x - p.x) < 1.5 && Math.sign(b.z - p.z) === p.face && Math.abs(b.z - oz) < 1.5) b.entering = inT; if (b.entering !== inT || Math.abs(b.x - p.x) > 2) { if (Math.abs(b.x - p.x) > 2) b.entering = -1; return [ox, oz]; } return [p.x, p.z + p.face * (PLOT_D / 2 - 1)]; }
  b.entering = -1;
  return [tx, tz];
}
function botMoveTo(b, tx, tz, dt, spd) {
  const [wx, wz] = botWaypoint(b, tx, tz);
  const dx = wx - b.x, dz = wz - b.z, d = Math.hypot(dx, dz);
  if (d < 0.4 && wx === tx && wz === tz) { b.vx *= 0.8; b.vz *= 0.8; return true; }
  const s = spd || 6; b.vx += (dx / d * s - b.vx) * Math.min(1, dt * 8); b.vz += (dz / d * s - b.vz) * Math.min(1, dt * 8);
  return Math.hypot(tx - b.x, tz - b.z) < 0.6;
}
function updateBots(dt) {
  if (!NET.isHost) return;
  G.bots.forEach(b => {
    b.think -= dt; b.chatCd -= dt; b.giveCd -= dt; b.stealCd -= dt; b.pinchCd -= dt;
    if (b.think <= 0 && !b.goal) { b.think = rnd(0.5, 1.5); b.goal = botChooseGoal(b); }
    const ox = b.x, oz = b.z;
    if (b.goal) botDoGoal(b, dt); else { b.vx *= 0.85; b.vz *= 0.85; }
    let nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
    if (b.kb) { nx += b.kb.x * dt; nz += b.kb.z * dt; b.kb.x *= 1 - dt * 3; b.kb.z *= 1 - dt * 3; if (Math.hypot(b.kb.x, b.kb.z) < 0.3) b.kb = null; }
    [nx, nz] = crabColliders(nx, nz, ox, oz); b.x = nx; b.z = nz;
    b.vy -= 22 * dt; b.y += b.vy * dt; if (b.y < 0) { b.y = 0; b.vy = 0; }
    const sp = Math.hypot(b.vx, b.vz); if (sp > 0.3) { const t = Math.atan2(b.vx, b.vz) + Math.PI / 2; let dr = Math.atan2(Math.sin(t - b.rot), Math.cos(t - b.rot)); b.rot += dr * Math.min(1, dt * 8); }
    if (b.spin > 0) { b.spin -= dt; b.rot += dt * 10; }
    b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.y = b.rot; if (b.pinchT > 0) b.pinchT -= dt; animCrab(b.mesh, sp / 7, dt, b.pinchT || 0);
    if (b.bubble) { b.bubbleT -= dt; if (b.bubbleT <= 0) { b.mesh.remove(b.bubble); b.bubble = null; } }
  });
  // idle chatter
  G.idleChat = (G.idleChat || rnd(20, 40)) - dt;
  if (G.idleChat <= 0 && G.bots.length) { G.idleChat = rnd(30, 70); const b = pick(G.bots); const line = idleLine(b); botSay(b, line); if (Math.random() < 0.45 && G.bots.length > 1) { const o = pick(G.bots.filter(x => x !== b)); setTimeout(() => botReplyTo(o, b.name, b.name, line, 1), rnd(1800, 4000)); } }
}
function botChooseGoal(b) {
  const g = b.garden;
  if (b.follow) return { t: 'follow' };
  if (G.boss && G.boss.alive && Math.random() < 0.9) return { t: 'boss' };
  if (G.boss && G.boss.dead && G.boss.parts.includes(b.name) && !b.claimed) return { t: 'claim' };
  const ripe = g.plants.filter(p => ripeCount(p));
  if (b.backpack.length >= rndi(8, 20) || (b.backpack.length && Math.random() < 0.08)) return { t: 'sell', x: SPOTS.sell.x + rnd(-1.5, 1.5), z: SPOTS.sell.z + 1.5 };
  if (ripe.length && Math.random() < 0.75) { const p = pick(ripe); return { t: 'harvest', p, x: PLOTS[b.plot].x + p.x + 0.8, z: PLOTS[b.plot].z + p.z + 0.8 }; }
  if (b.stealCd <= 0 && (b.pers === 'grumpy' || b.pers === 'silly' || Math.random() < 0.3)) {
    b.stealCd = rnd(90, 240);
    const targets = G.gardens.filter(x => x !== g && x.plants.some(p => ripeCount(p)));
    if (targets.length) { const tg = pick(targets); const p = pick(tg.plants.filter(p => ripeCount(p))); return { t: 'steal', g: tg, p, x: PLOTS[tg.plot].x + p.x + 0.7, z: PLOTS[tg.plot].z + p.z + 0.7, tm: 25 }; }
  }
  const aff = G.stock ? Object.keys(G.stock.seed).map(id => PLANT[id]).filter(d => d.p <= b.money && d.p > 0) : [];
  if (aff.length && g.plants.length < 34 && Math.random() < 0.5) { const d = aff.sort((a, c) => c.p - a.p)[Math.min(aff.length - 1, rndi(0, 2))]; return { t: 'buy', d, x: SPOTS.seed.x + rnd(-1.5, 1.5), z: SPOTS.seed.z + 1.5 }; }
  if (b.backpack.some(f => f.m.includes('Thankful')) && Math.random() < 0.4) return { t: 'corn', x: SPOTS.corn.x + 2.5, z: SPOTS.corn.z + 2 };
  if (Math.random() < 0.35) { const a = rnd(0, 6.28), r = rnd(5, MAP_R - 8); return { t: 'wander', x: Math.cos(a) * r, z: Math.sin(a) * r, tm: 15 }; }
  return { t: 'idle', tm: rnd(2, 6), x: PLOTS[b.plot].x + rnd(-7, 7), z: PLOTS[b.plot].z + rnd(-4, 4) };
}
function botDoGoal(b, dt) {
  const go = b.goal; if (go.tm != null) { go.tm -= dt; if (go.tm <= 0) { b.goal = null; return; } }
  switch (go.t) {
    case 'follow': {
      const tgt = crabById(b.follow); if (!tgt) { b.follow = null; b.goal = null; return; }
      const a = Math.atan2(b.x - tgt.x, b.z - tgt.z); if (Math.hypot(b.x - tgt.x, b.z - tgt.z) > 3) botMoveTo(b, tgt.x + Math.sin(a) * 2.5, tgt.z + Math.cos(a) * 2.5, dt, 8); else { b.vx *= 0.8; b.vz *= 0.8; b.goal = null; b.think = 0.3; }
      break;
    }
    case 'boss': {
      const B = G.boss; if (!B || !B.alive) { b.goal = null; return; }
      const near = Math.hypot(B.x - b.x, B.z - b.z) < 4.5;
      if (!near) botMoveTo(b, B.x + rnd(-2, 2), B.z + rnd(-2, 2), dt, 7); else { b.vx *= 0.8; b.vz *= 0.8; }
      if (near && B.y < 4.5 && b.pinchCd <= 0) { b.pinchCd = rnd(0.7, 1.2); b.pinchT = 0.4; bossDamage(b.name, 1); }
      if (Math.random() < dt * 0.3) b.goal = null; break;
    }
    case 'claim': { if (!G.boss || !G.boss.dead) { b.goal = null; return; } if (botMoveTo(b, G.boss.x + 2, G.boss.z, dt)) { b.claimed = true; b.goal = null; if (Math.random() < 0.1) { botSay(b, pick(['NO WAY I GOT THE SCARECROW BLOSSOM 🌾🌾', 'scarecrow blossom secured 😎'])); addPlant(b.garden, 'scarecrow', rnd(-6, 6), rnd(-4, 4), 0); } else botSay(b, pick(['no scarecrow for me 😭', 'rip 10% chance hates me', 'only got feathers lol'])); } break; }
    case 'harvest': if (botMoveTo(b, go.x, go.z, dt)) { const got = harvestPlant(b.garden, go.p); b.backpack.push(...got); b.pinchT = 0.4; b.goal = null; const mutd = got.find(f => f.m.length > 1 || (f.m.length && MUTATIONS[f.m[0]].m >= 20)); if (mutd && Math.random() < 0.6) botSay(b, pick(['YO my ' + PLANT[go.p.id].n + ' is ' + mutd.m.join(' + ') + '!!', 'just harvested a ' + mutd.m.join(' ') + ' ' + PLANT[go.p.id].n + ' 😤', mutd.m[0] + ' ' + PLANT[go.p.id].n + ' lets gooo'])); } break;
    case 'sell': if (botMoveTo(b, go.x, go.z, dt)) { let t = 0; b.backpack.forEach(f => t += fruitValue(f, PLANT[f.id])); b.money += t; if (t > 0 && Math.random() < 0.25) botSay(b, pick(['sold for ' + fmt(t) + ' 💰', 'ka-ching ' + fmt(t), fmt(t) + ' in the bank'])); b.backpack = []; b.goal = null; } break;
    case 'buy': if (botMoveTo(b, go.x, go.z, dt)) { if (b.money >= go.d.p) { b.money -= go.d.p; b.goal = { t: 'plant', d: go.d, x: PLOTS[b.plot].x + rnd(-PLOT_W / 2 + 1.5, PLOT_W / 2 - 1.5), z: PLOTS[b.plot].z + rnd(-PLOT_D / 2 + 1.5, PLOT_D / 2 - 1.5) }; if (['Prismatic', '???', 'House', 'PAIN', 'Secret'].includes(go.d.r)) botSay(b, 'I JUST BOUGHT A ' + go.d.n.toUpperCase() + '!!! 🤯'); } else b.goal = null; } break;
    case 'plant': if (botMoveTo(b, go.x, go.z, dt)) { const L = localXZ(b.garden, b.x, b.z); if (canPlantHere(b.garden, L.x, L.z)) addPlant(b.garden, go.d.id, L.x, L.z, 0); b.goal = null; } break;
    case 'steal': {
      const tg = go.g; if (!G.gardens.includes(tg) || !tg.plants.includes(go.p) || !ripeCount(go.p)) { b.goal = null; return; }
      if (botMoveTo(b, go.x, go.z, dt, 6.5)) {
        b.goal = null; b.pinchT = 0.4;
        if (tg === G.myGarden) { const got = harvestPlant(tg, go.p).slice(0, 1); if (got.length) { b.backpack.push(got[0]); toast('😠 ' + b.name + ' stole your ' + PLANT[go.p.id].n + '! Get Defence Plants!'); botSay(b, pick(['hehe thanks for the ' + PLANT[go.p.id].n, 'yoink 🦀', 'finders keepers!!'])); } }
        else if (tg.kind === 'bot') { const got = harvestPlant(tg, go.p).slice(0, 1); if (got.length) b.backpack.push(got[0]); const v = G.bots.find(x => x.garden === tg); if (v && Math.random() < 0.6) setTimeout(() => botSay(v, pick(['HEY ' + b.name + ' GIVE THAT BACK', b.name + ' just robbed me 😭', 'bro ' + b.name + ' really stole my ' + PLANT[go.p.id].n])), 1500); }
        else { netAct({ t: 'steal', to: tg.owner, plot: tg.plot, u: go.p.u, by: b.name, bot: 1 }); }
      }
      break;
    }
    case 'corn': if (botMoveTo(b, go.x, go.z, dt)) { b.backpack = b.backpack.filter(f => !f.m.includes('Thankful')); b.goal = null; if (Math.random() < 0.5) botSay(b, 'fed the cornucopia 🌽 it said thank you (it did not)'); } break;
    case 'goto': case 'wander': if (botMoveTo(b, go.x, go.z, dt)) b.goal = null; break;
    case 'idle': botMoveTo(b, go.x, go.z, dt, 2.5); break;
  }
}
function crabById(id) {
  if (id === myId()) return G.me ? { x: G.me.x, z: G.me.z } : null;
  if (G.remotes[id]) return G.remotes[id];
  const b = G.bots.find(x => x.name === id); return b || null;
}

/* ---------- speaking ---------- */
function botSay(b, text) {
  text = styleText(b, text);
  if (b.bubble) b.mesh.remove(b.bubble);
  const short = text.length > 42 ? text.slice(0, 40) + '…' : text;
  b.bubble = textSprite(short, '#222', 'rgba(255,255,255,.92)', 0.38); b.bubble.position.y = 2.35; b.mesh.add(b.bubble); b.bubbleT = 5;
  netChat(text, b.color, false, b.name + ' 🤖');
  b.recent.push(text.toLowerCase()); if (b.recent.length > 16) b.recent.shift();
}
function styleText(b, t) {
  if (t.startsWith('[')) return t;
  switch (b.pers) {
    case 'hype': if (Math.random() < 0.35) t = t.replace(/!*$/, '!!'); if (Math.random() < 0.3) t += ' ' + pick(['🔥', '😤', '💯', '🚀', '🦀']); break;
    case 'chill': t = t.toLowerCase().replace(/!+/g, ''); if (Math.random() < 0.25) t += pick([' ngl', ' fr', ' lol', ' tbh']); break;
    case 'grumpy': t = t.toLowerCase().replace(/!+/g, '.'); if (Math.random() < 0.15) t = pick(['ugh, ', 'whatever. ', 'hmph. ']) + t; break;
    case 'nerd': if (Math.random() < 0.15) t = pick(['Technically, ', 'Statistically, ', 'Fun fact: ']) + t.charAt(0).toLowerCase() + t.slice(1); break;
    case 'silly': if (Math.random() < 0.3) t += ' ' + pick(['*clicks claws*', 'pinch pinch 🦀', '🦀🦀', '*scuttles sideways*']); break;
  }
  return t;
}
function botNotice(b, what, who) {
  if (b.chatCd > 0) return; b.chatCd = 4;
  if (what === 'stolen') botSay(b, pick(['HEY ' + who + '!! that was MY fruit 😠', who + ' you thief 😭', 'did ' + who + ' just steal from me??', 'ok ' + who + ' i saw that.']));
  if (what === 'defended') botSay(b, pick(['ow!! ' + who + ' has defence plants 😭', 'why did ' + who + "'s plant just yeet me", 'ok ' + who + "'s garden is a fortress", 'that pea hurt bro']));
}
function botsReactWeather(name) {
  if (!NET.isHost || !G.bots.length) return; const b = pick(G.bots); const wd = WEATHERS[name];
  const lines = { Rain: ['rain!! everything gets Wet 💧', 'RAIN. wet fruits go brrr', 'if it rains long enough wet turns into Drenched btw'], Blizzard: ['BLIZZARD ❄️ frosty fruits incoming', "it's so cold my claws are frozen", 'frosty can turn into Frozen if you wait!'], Thunder: ['THUNDER ⚡ pray for Shocked fruits', 'shocked is x50 btw!!', 'lightning please hit my garden pls pls'], 'Fish Rain': ['why is it raining FISH 🐟', 'F I S H', 'a fish just hit me in the face'], Volcano: ['THE VOLCANO IS ERUPTING 🌋', 'my fruits are gonna get Burnt lol', 'meteors!! hide your crops'], 'Turkey Rain': ['TURKEY RAIN 🦃 feed the cornucopia with Thankful fruits!', 'gobble gobble it is raining turkeys', 'lord crow might come during turkey rain... be ready'] };
  const l = lines[name] || [wd.aao ? 'ADMIN ABUSE!! ' + name.toUpperCase() + ' ' + wd.icon : name + ' ' + wd.icon, 'henry is cooking 👀 ' + name + '?!', 'thank you admin for ' + name + ' 🙏', 'my fruits are gonna be ' + wd.mut + '!!'];
  setTimeout(() => botSay(b, pick(l)), rnd(800, 2500));
  if (wd.aao && G.bots.length > 1) { const c = pick(G.bots.filter(x => x !== b)); setTimeout(() => botSay(c, pick(['ADMIN ABUSE LETS GOOOO', 'W admin', '' + wd.mut + ' mutation is so good', 'this is the best day of my crab life'])), rnd(2500, 4500)); }
}
function botsReactBoss() { const L = ['LORD CROW!! everyone pinch him when he lands!', 'GET HIM 🦀🦀🦀', 'i am NOT getting dive bombed again', 'pinch him when he swoops down!!', 'scarecrow blossom here i come'].sort(() => Math.random() - 0.5); G.bots.forEach((b, i) => { if (i < 3) setTimeout(() => botSay(b, L[i]), 900 + i * 1400); }); }
function botsBossDefeated() { const L = ['WE DID IT', 'gg lord crow', 'go claim by his body!! 10% chance for scarecrow', 'easy'].sort(() => Math.random() - 0.5); G.bots.forEach((b, i) => { if (i < 2) setTimeout(() => botSay(b, L[i]), 800 + i * 1300); b.claimed = false; }); }
function idleLine(b) {
  const best = b.garden.plants.slice().sort((x, y) => PLANT[y.id].p - PLANT[x.id].p)[0];
  const st = G.stock ? Object.keys(G.stock.seed).map(id => PLANT[id]).sort((a, c) => c.p - a.p)[0] : null;
  const opts = [
    best ? 'my ' + PLANT[best.id].n + ' is looking thicc today' : 'my garden is empty help',
    st ? 'yo the seed shop has ' + st.n + ' rn' : 'shop is mid today',
    'restock in ' + Math.ceil(G.restockIn) + ' seconds',
    'anyone wanna trade? i got ' + fmt(b.money),
    'does anyone have a ' + b.fav.pet + '? i want one so bad',
    'favorite plant? mine is ' + b.fav.plant,
    G.weather ? 'this ' + G.weather + ' is crazy' : 'i hope it rains soon',
    'who has the best garden here',
    'imagine pulling the ' + pick(['Lantern Tree', 'Bean Stalk', 'Sour Cream & Onion Stack', 'Cabinet Vine']) + ' lol',
    'pinch pinch 🦀', 'i walk sideways and i am proud',
    "how do people afford a $5B inch worm",
    'tip: feed thankful fruits to the cornucopia to unlock the thanksgiving shop',
    'defence plants are so op, nobody can steal from me',
  ];
  return pick(opts.filter(o => !b.recent.includes(o.toLowerCase())).concat(['lol']));
}

/* ---------- CHAT BRAIN ---------- */
const STOP = new Set('the a an i you me my your is are was were be to of and or in on at it its this that what whats how do does did can could would should will just so ok okay like im u ur yo hey hi hello lol bro dude please pls plz for with have has got get not no yes yeah yea from about any some there here who why when where which they them he she we us our'.split(' '));
const ALIAS = { pepsi: 'cola', soda: 'cola', 'pea shooter': 'peashooter', peashooter: 'peashooter', venus: 'venus', 'fly trap': 'venus', lmht: 'lmht', 'lost man': 'lmht', lays: 'chipstack', chips: 'chipstack', 'sour cream': 'chipstack', melon: 'watermelon', 'water melon': 'watermelon', strawberry: 'strawberry', strawberries: 'strawberry', grapes: 'grape', sunflower: 'sunflower', 'sun flower': 'sunflower', beanstalk: 'beanstalk', 'bean stalk': 'beanstalk', 'caramel apple': 'caramelapple', 'carmal apple': 'caramelapple', maple: 'maple', pitcher: 'pitcher', scarecrow: 'scarecrow', turkey: 'turkey', crow: 'crow', racoon: 'raccoon', raccoon: 'raccoon', 'polar bear': 'polarbear', 'inch worm': 'inchworm', inchworm: 'inchworm', ballon: 'balloon', balloon: 'balloon', egg: 'egg', treats: 'treat', treat: 'treat', sprinkler: 'sprinkler', 'plant mover': 'mover', 'watering can': 'wateringcan', shovel: 'shovel', 'elder carrot': 'eldercarrot', 'soul stalk': 'soulstalk', 'burning bud': 'burningbud', 'pillow bush': 'pillow', 'cabinet vine': 'cabinet', 'lantern tree': 'lantern', 'crab grass': 'crabgrass', 'dragon fruit': 'dragonfruit', 'bell pepper': 'bellpepper', 'honey comb': 'honeycactus', 'pumpkin pie': 'pumpkinpie', 'turkey blossom': 'turkeyblossom', 'party tree': 'partytree', taco: 'taco', 'trash can': 'trashcan', glitcher: 'glitcher', bbq: 'bbqbush', 'moon melon': 'moonmelon', 'star fruit': 'starfruit', 'sweet potato': 'sweetpotato' };
function findThing(t) {
  for (const [k, v] of Object.entries(ALIAS).sort((a, b) => b[0].length - a[0].length)) if (t.includes(k)) return thingById(v, k);
  for (const d of PLANTS.slice().sort((a, b) => b.n.length - a.n.length)) if (t.includes(d.n.toLowerCase())) return { kind: 'plant', d };
  for (const p of PETS) if (t.includes(p.n.toLowerCase())) return { kind: 'pet', d: p };
  for (const g of GEAR) if (t.includes(g.n.toLowerCase())) return { kind: 'gear', d: g };
  for (const m of Object.keys(MUTATIONS)) if (t.includes(m.toLowerCase())) return { kind: 'mut', d: { n: m, ...MUTATIONS[m] } };
  for (const w of Object.keys(WEATHERS)) if (t.includes(w.toLowerCase())) return { kind: 'weather', d: { n: w, ...WEATHERS[w] } };
  return null;
}
function thingById(id, word) {
  if (word === 'turkey' || word === 'crow') { /* could be pet or plant */ return { kind: 'pet', d: PET[id] }; }
  if (PLANT[id]) return { kind: 'plant', d: PLANT[id] }; if (PET[id]) return { kind: 'pet', d: PET[id] }; if (GEARD[id]) return { kind: 'gear', d: GEARD[id] }; return null;
}
function describeThing(th) {
  const d = th.d;
  if (th.kind === 'plant') { const where = d.r === 'AAO' ? 'only the admin can give that one (admin abuse only)' : d.r === 'Boss' ? 'you only get it by beating the Lord Crow (10% chance)' : d.tg ? 'its in the thanksgiving shop' : d.id === 'beginous' ? "it's free!" : 'its in the seed shop when it restocks'; return d.n + ' is ' + d.r + (d.p ? ', costs ' + fmt(d.p) : '') + '. ' + where + (d.def ? '. its a DEFENCE plant too 🛡️' : ''); }
  if (th.kind === 'pet') return 'the ' + d.n + ' costs ' + fmt(d.p) + '. ability: ' + d.ab.toLowerCase() + (d.aao ? ' (only spawns in the backrooms, admin only)' : d.tg ? ' (thanksgiving only)' : '. find one wandering around the map!');
  if (th.kind === 'gear') return d.n + (d.p ? ' is ' + fmt(d.p) + ' at the gear shop' : ' is free') + ' — ' + d.d.toLowerCase();
  if (th.kind === 'mut') return d.n + ' mutation multiplies fruit value by x' + d.m + '!';
  if (th.kind === 'weather') return d.n + ' gives fruits the ' + d.mut + ' mutation (x' + MUTATIONS[d.mut].m + ')' + (d.evo ? ' and it can evolve into ' + d.evo[1] + '!' : '') + (d.aao ? '. only the admin can start it tho' : '');
  return '';
}
function keyword(t) { const ws = t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)); return ws.length ? ws[ws.length - 1] : null; }
function fresh(b, opts) { const o = opts.filter(x => !b.recent.includes(x.toLowerCase())); return pick(o.length ? o : opts); }

/* chat arrives (host only processes bot replies) */
function botsHear(fromId, fromName, text) {
  if (!NET.isHost || !G.bots.length) return;
  const t = text.toLowerCase();
  let addressed = G.bots.filter(b => t.includes(b.name.toLowerCase()) || t.includes(b.name.toLowerCase().slice(0, 5)));
  const toAll = /\b(everyone|every1|guys|bots|yall|y'all|all of you|anyone|anybody)\b/.test(t);
  let responders;
  if (addressed.length) responders = addressed;
  else if (toAll) responders = G.bots.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(G.bots.length, /^\s*(hi|hello|hey|yo|sup|wsg|bye|gg)\b/.test(t) ? rndi(2, 3) : rndi(1, 2)));
  else {
    // the closest bot or the last bot who talked to this person replies
    const me = crabById(fromId); const last = G.bots.find(b => b.lastTalk === fromId && G.t - b.lastTalkT < 40);
    const near = me ? G.bots.slice().sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0] : pick(G.bots);
    responders = [last || (Math.random() < 0.7 ? near : pick(G.bots))];
    if (/^(hi|hello|hey|yo|sup|wsg|hola)\b/.test(t) && G.bots.length > 1 && Math.random() < 0.6) responders.push(pick(G.bots.filter(b => b !== responders[0])));
  }
  responders.forEach((b, i) => { b.lastTalk = fromId; b.lastTalkT = G.t; setTimeout(() => botReplyTo(b, fromId, fromName, text, 0), rnd(1100, 2600) + i * rnd(900, 1800) + Math.min(2500, text.length * 25)); });
}
async function botReplyTo(b, fromId, fromName, text, depth) {
  if (!G.bots.includes(b)) return;
  let reply = null;
  if (!depth && window.claude && typeof window.claude.complete === 'function' && !G.aiBusy) {
    G.aiBusy = true;
    try { reply = await aiReply(b, fromName, text); } catch (e) { reply = null; }
    G.aiBusy = false;
  }
  if (!reply) reply = brain(b, fromId, fromName, text, depth);
  if (!reply) return;
  // don't let several bots say the same thing
  const norm = x => x.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
  G.botLines = (G.botLines || []).filter(l => G.t - l.t < 15);
  const dup = G.botLines.find(l => l.n === norm(reply) && l.b !== b.name);
  if (dup) { if (Math.random() < 0.5) return; reply = pick(['^ what ' + dup.b + ' said', 'yeah ' + dup.b + ' is right', 'ya that', 'true', 'facts']); }
  G.botLines.push({ n: norm(reply), b: b.name, t: G.t });
  botSay(b, reply);
}
async function aiReply(b, fromName, text) {
  const best = b.garden.plants.slice().sort((x, y) => PLANT[y.id].p - PLANT[x.id].p).slice(0, 3).map(p => PLANT[p.id].n).join(', ');
  const p = `You are "${b.name}", a crab player in the Roblox-style game "Garden Time" (like Grow a Garden but everyone is a crab). Personality: ${b.pers}. You have ${fmt(b.money)} and your best plants are ${best || 'nothing yet'}. Weather: ${G.weather || 'clear'}. Favorite plant: ${b.fav.plant}. Henry (s0meTh1ng.MP4) made the game and is the only admin. Reply to ${fromName}, who said: "${text.slice(0, 200)}". Write ONE short in-game chat message (max 18 words), casual kid-friendly game chat, no quotes, no name prefix.`;
  const r = await Promise.race([window.claude.complete(p), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 7000))]);
  const s = String(r || '').trim().split('\n')[0].replace(/^["']|["']$/g, '').slice(0, 140);
  return s.length > 1 ? s : null;
}
function brain(b, fromId, who, text, depth) {
  const t = ' ' + text.toLowerCase().replace(/[’']/g, "'") + ' ';
  const m = b.mem[who] || (b.mem[who] = { n: 0, rude: 0, nice: 0 }); m.n++;
  const isQ = /\?\s*$/.test(text.trim()) || /^\s*(what|how|why|when|where|who|which|can|do|does|is|are|should|will|would|could)\b/.test(t.trim());
  const g = b.garden; const best = g.plants.slice().sort((x, y) => PLANT[y.id].p - PLANT[x.id].p)[0];
  const th = findThing(t);
  const asker = crabById(fromId);
  // pending question follow-ups
  if (m.pending && /\b(yes|yeah|yea|sure|ok|okay|yep|bet|deal|k)\b/.test(t)) { const p = m.pending; m.pending = null; return p(); }
  if (m.pending && /\b(no|nah|nope|naw)\b/.test(t)) { m.pending = null; return fresh(b, ['ok fair', 'your loss 😤', 'alr', 'k then']); }
  m.pending = null;
  // insults / niceness
  if (/\b(noob|trash|bad|stupid|dumb|idiot|loser|ugly|worst|suck|sucks|cringe|bozo)\b/.test(t) && !/not (bad|trash)/.test(t)) {
    m.rude++;
    if (b.pers === 'grumpy') return fresh(b, ['says the crab with ' + (S && who === S.name ? fmt(S.money) : 'no money'), 'ok and?', 'cry about it', 'i have a ' + (best ? PLANT[best.id].n : 'garden') + ', what do you have']);
    return fresh(b, ['hey thats not very crabby of you 😢', "ok that hurt my shell", m.rude > 2 ? "ok i'm ignoring you now 🙄" : 'nuh uh', 'rude 😤 i will remember that', 'ur just mad my ' + (best ? PLANT[best.id].n : 'garden') + ' is better']);
  }
  if (/\b(nice|cool|awesome|amazing|love|best|goat|pog|w|good job|gj|gg|thank|thanks|ty)\b/.test(t) && (!isQ || /\b(thank|thanks|ty)\b/.test(t))) {
    m.nice++;
    if (/\b(thank|thanks|ty)\b/.test(t)) return fresh(b, ['np!', 'anytime 🦀', 'ur welcome', 'no problem ' + who]);
    if (/\b(garden|plants?)\b/.test(t)) return fresh(b, ['thank you!! the ' + (best ? PLANT[best.id].n : 'dirt') + ' took forever', 'ty i worked hard on it', 'yours is cool too ' + who]);
    if (/\bgg\b/.test(t)) return fresh(b, ['gg!', 'ggs', 'gg wp']);
  }
  // actions
  if (/\b(follow me|come with me|follow)\b/.test(t)) { b.follow = fromId; b.goal = null; return fresh(b, ['ok following you 🦀', 'lead the way ' + who, 'right behind you', 'sideways walking activated']); }
  if (/\b(stop following|stop|go away|leave me alone|unfollow)\b/.test(t)) { if (b.follow) { b.follow = null; b.goal = null; return fresh(b, ['ok ok im going', 'fine 😔', 'stopped']); } if (/go away|leave me alone/.test(t)) { b.goal = { t: 'goto', x: PLOTS[b.plot].x, z: PLOTS[b.plot].z }; return fresh(b, ['fine 😢', 'ok bye', 'rude but ok']); } }
  if (/\b(come here|come to me|over here|cmere)\b/.test(t) && asker) { b.goal = { t: 'goto', x: asker.x + 1.5, z: asker.z + 1.5, tm: 20 }; return fresh(b, ['coming!', 'omw 🦀', 'scuttling over']); }
  if (/\b(jump)\b/.test(t)) { b.vy = 9; return fresh(b, ['boing', '*jumps*', 'how high??']); }
  if (/\b(dance|spin)\b/.test(t)) { b.spin = 2.5; return fresh(b, ['💃🦀', '*crab rave intensifies*', 'look at me go']); }
  if (/\b(fight|kill|attack|help)\b/.test(t) && /\b(crow|boss)\b/.test(t)) { if (G.boss && G.boss.alive) { b.goal = { t: 'boss' }; return fresh(b, ['ON IT', 'pinch mode activated', 'lets get him!!']); } return fresh(b, ['the lord crow isnt here rn. he shows up sometimes during turkey rain', 'no boss rn, wait for turkey rain 🦃']); }
  const goSpot = t.match(/\bgo to (the )?(seed|sell|gear|shop|cornucopia|corn|thanksgiving)/);
  if (goSpot) { const k = { seed: 'seed', shop: 'seed', sell: 'sell', gear: 'gear', cornucopia: 'corn', corn: 'corn', thanksgiving: 'tg' }[goSpot[2]]; b.goal = { t: 'goto', x: SPOTS[k].x, z: SPOTS[k].z + 2 }; return fresh(b, ['ok going to the ' + SPOTS[k].n.toLowerCase(), 'omw to ' + SPOTS[k].n.toLowerCase()]); }
  if (/\b(give|gimme|donate|spare|can i have|can i get|lend)\b/.test(t) && /(money|cash|\$|coins|bucks|dollars|rich)/.test(t)) {
    if (b.giveCd > 0) return fresh(b, ['i literally just gave money away, wait a bit', 'my wallet needs a break', 'ask me later']);
    if (m.rude > m.nice) return fresh(b, ['after what you said? no 😤', 'be nicer first lol']);
    if (b.money < 50 || Math.random() < (b.pers === 'grumpy' ? 0.6 : 0.25)) return fresh(b, ['nah im saving up for a ' + b.fav.plant, 'no way im broke', 'get ur own money 😂', 'how about you grow some carrots']);
    const amt = Math.max(10, Math.round(Math.min(b.money * 0.06, rnd(50, 400) * Math.max(1, Math.log10(b.money + 1) - 1))));
    b.money -= amt; b.giveCd = 60; giveMoneyTo(fromId, amt, b.name);
    return fresh(b, ['here, ' + fmt(amt) + ' 💸 dont spend it all on carrots', 'fine take ' + fmt(amt), 'sent you ' + fmt(amt) + ', you owe me', fmt(amt) + ' for you, be grateful 😤']);
  }
  if (/\b(give|gimme|can i have|trade)\b/.test(t) && th && th.kind === 'plant') {
    const f = b.backpack.find(x => x.id === th.d.id);
    if (/trade/.test(t)) { const mine = best ? PLANT[best.id].n : 'carrot'; m.pending = () => 'lol jk i would never trade my ' + mine; return 'hmm... my ' + mine + ' for your ' + th.d.n + '? deal?'; }
    if (f && b.giveCd <= 0) { b.backpack.splice(b.backpack.indexOf(f), 1); b.giveCd = 45; giveFruitTo(fromId, f, b.name); return fresh(b, ['ok here, one ' + th.d.n + ' 🎁', 'sent you a ' + th.d.n + ' (check your backpack)']); }
    return fresh(b, ["i don't have any " + th.d.n + ' fruits rn', 'no ' + th.d.n + ' sorry 😔', describeThing(th)]);
  }
  if (/\btrade\b/.test(t)) { const mine = best ? PLANT[best.id].n : 'carrot'; m.pending = () => { if (b.giveCd > 0) return 'actually nvm lol'; const f = b.backpack[0]; if (f) { b.backpack.shift(); giveFruitTo(fromId, f, b.name); b.giveCd = 45; return 'ok sent you a ' + PLANT[f.id].n + '. trust me bro you will pay me back'; } return 'oh wait my backpack is empty 💀'; }; return fresh(b, ['sure, want one of my fruits? (yes/no)', 'i could give you a fruit if you want, yes?']); }
  // knowledge
  if (th && /(how much|price|cost|worth|how many|what is|whats|what's|what does|tell me about|is it good|rarity|rare|where)/.test(t)) return describeThing(th) + (b.pers === 'nerd' && th.kind === 'plant' ? ' Each fruit sells for about ' + fmt(th.d.v) + ' base.' : '');
  if (th && th.kind === 'plant' && /\b(have|got|own)\b/.test(t) && /\byou\b/.test(t)) { const has = g.plants.some(p => p.id === th.d.id); return has ? fresh(b, ['yep i have ' + th.d.n + ' in my garden 😎', 'yeah come look!']) : fresh(b, ['nope 😭', 'i wish', 'not yet, saving up']); }
  if (/\b(stock|restock|shop have|in the shop|whats in shop)\b/.test(t)) { const st = G.stock ? Object.keys(G.stock.seed).map(id => PLANT[id]).sort((a, c) => c.p - a.p) : []; return 'shop has ' + (st.slice(0, 3).map(d => d.n).join(', ') || 'nothing good') + '. restock in ' + Math.ceil(G.restockIn) + 's'; }
  if (/\bweather\b/.test(t) || /\b(when|is it).*(rain|snow)/.test(t)) return G.weather ? 'its ' + G.weather + ' rn! fruits are getting ' + WEATHERS[G.weather].mut : fresh(b, ['no weather right now. weather happens every few minutes', 'clear skies. boring', 'nothing yet, i want thunder for shocked fruits']);
  if (/(how).*(money|rich|cash|earn|make)/.test(t) || /\b(tips|advice|what should i (buy|do|plant)|help me)\b/.test(t)) {
    const mm = who === S.name ? S.money : null;
    const aff = G.stock ? Object.keys(G.stock.seed).map(id => PLANT[id]).filter(d => mm == null || d.p <= mm).sort((a, c) => c.p - a.p) : [];
    return fresh(b, [aff.length ? 'buy ' + aff[0].n + (mm != null ? ', you can afford it' : '') + '. the more expensive the seed the more its fruits are worth' : 'grow carrots and strawberries and sell sell sell', 'harvest during weather!! mutations multiply value. shocked is x50', 'get defence plants so bots cant steal from you (pea shooter, venus fly trap)', 'get a turtle pet, plants grow faster', 'feed thankful fruits to the cornucopia to unlock the thanksgiving shop']);
  }
  if (/\b(cornucopia|thanksgiving|thankful)\b/.test(t)) return 'feed the big cornucopia ' + CORNUCOPIA_GOAL + ' Thankful fruits to unlock the Thanksgiving shop. you get Thankful from Turkey Rain 🦃';
  if (/\b(lord crow|boss)\b/.test(t)) return G.boss && G.boss.alive ? 'HE IS HERE pinch him when he swoops down!!' : 'the lord crow has a 35% chance to show up during turkey rain. beat him for a 10% chance at the Scarecrow Blossom';
  if (/\bdefen[cs]e\b/.test(t)) return 'defence plants: Pea Shooter, Venus Fly Trap, Pitcher Plant, and the Glitcher (admin only). they yeet anyone who walks in your garden';
  if (/\b(where).*(shop|sell|seed|gear|cornucopia)/.test(t)) return 'everything is in the middle! seeds, gear, sell stand, and the big cornucopia';
  if (/\badmin\b/.test(t)) return fresh(b, ['only henry is admin. he can do admin abuse events 👑', 'henry pls do backrooms event 🙏', 'admin abuse when?? 👀']);
  if (/\b(who made|creator|who created|dev|developer)\b/.test(t)) return 'Henry made it (s0meTh1ng.MP4) with Claude 🦀';
  if (/\b(are you|r u|you a|ur a)\b.*\b(bot|ai|real|human|robot|npc)\b/.test(t)) return fresh(b, ['beep boop... jk. or am i 🤖', 'i am 100% a real crab', 'yes im a bot but im a smart bot', 'a bot? i prefer "crab-ficial intelligence"', 'idk are YOU a bot 🤨']);
  if (/\b(your name|ur name|who are you)\b/.test(t)) return fresh(b, ["i'm " + b.name + '!', b.name + ', nice to meet you ' + who]);
  if (/\bwho\b.*\bbest garden\b/.test(t)) { const rich = G.bots.slice().sort((x, y) => y.garden.plants.length - x.garden.plants.length)[0]; return rich === b ? 'me obviously 😎' : fresh(b, [rich.name + ' has the most plants ngl', 'probably ' + rich.name + ', but mine is cooler']); }
  if (/\b(how much money|how rich|your money|ur money|net worth)\b/.test(t)) return fresh(b, ['i have ' + fmt(b.money), fmt(b.money) + ' and counting', 'like ' + fmt(b.money) + ', dont tell anyone']);
  if (/\b(best|rarest|favorite|favourite|fav)\b.*\b(plant|seed|crop)\b/.test(t)) return /your|ur|you/.test(t) && /best|rarest/.test(t) ? 'my best plant is ' + (best ? PLANT[best.id].n + ' (' + PLANT[best.id].r + ')' : 'nothing lol') : 'my favorite plant is ' + b.fav.plant;
  if (/\b(favorite|favourite|fav)\b.*\bpet\b/.test(t)) return 'i want a ' + b.fav.pet + ' so bad';
  if (/\b(favorite|favourite|fav)\b.*\bcolou?r\b/.test(t)) return b.fav.color + '! even tho im a different color lol';
  if (/\b(joke|funny)\b/.test(t)) return fresh(b, ['why did the crab never share? because hes shellfish 🦀', "what do you call a crab that plays baseball? a pinch hitter", 'why are carrots good for your eyes? ever seen a crab with glasses?', 'how does a crab call friends? on its shell phone 📱', 'what did the farmer crab say? lettuce turnip the beet']);
  if (/\b(how are you|how r u|hru|wyd|what are you doing|whatcha doing|sup)\b/.test(t)) {
    const gl = b.goal ? b.goal.t : 'idle'; const doing = { harvest: 'harvesting', sell: 'about to sell', buy: 'going to buy seeds', plant: 'planting stuff', steal: 'uhh nothing 👀', wander: 'just walking around', boss: 'FIGHTING THE CROW', follow: 'following you lol', idle: 'chilling in my garden', goto: 'walking', corn: 'feeding the cornucopia', claim: 'claiming my reward' }[gl] || 'chilling';
    return fresh(b, ['good! ' + doing, doing + ', you?', 'im ' + doing + ' 🦀', b.mood > 0.7 ? 'great! my ' + (best ? PLANT[best.id].n : 'garden') + ' is growing' : 'kinda tired, ' + doing]);
  }
  if (/^\s*(hi|hello|hey|yo|sup|wsg|hola|howdy|hai|hii+|heyy+)\b/.test(t)) return fresh(b, ['hi ' + who + '!', 'yo ' + who + ' 👋', 'hey! welcome to garden time', 'hello fellow crab', 'sup ' + who, 'heyy ' + who + ', nice color']);
  if (/\b(bye|cya|gtg|goodbye|see ya)\b/.test(t)) return fresh(b, ['bye ' + who + '!', 'cya 🦀', 'noooo dont leave', 'see ya, come back soon']);
  if (/\b(lol|lmao|haha|xd|😂|🤣)\b/.test(t) || /😂|🤣/.test(t)) return fresh(b, ['lol', '😂😂', 'LMAO', 'haha ikr', 'xD']);
  if (/\b(sorry|my bad|mb)\b/.test(t)) { m.rude = Math.max(0, m.rude - 1); return fresh(b, ['its ok', 'all good', 'forgiven 🦀']); }
  if (th) return fresh(b, [describeThing(th), 'oh the ' + th.d.n + '? ' + describeThing(th), th.kind === 'plant' ? (g.plants.some(p => p.id === th.d.id) ? 'i have ' + th.d.n + '!' : 'i really want ' + th.d.n) : describeThing(th)]);
  if (/\b(want to|wanna|lets|let's)\b.*\b(play|race|be friends|friends)\b/.test(t)) { if (/friend/.test(t)) return fresh(b, ['sure we can be friends 🤝', 'friends! 🦀🤝🦀']); m.pending = () => { b.follow = fromId; return 'ok lets go, im following you'; }; return 'sure! want me to follow you?'; }
  if (/\b(yes|yeah|yep|ok|okay|sure)\b/.test(t) && t.trim().split(' ').length <= 2) return fresh(b, ['ok', 'cool', 'bet', 'alright 👍']);
  if (/\b(no|nah|nope)\b/.test(t) && t.trim().split(' ').length <= 2) return fresh(b, ['ok then', 'why not?', 'fair']);
  // generic question answer
  const kw = keyword(t);
  if (isQ) {
    if (/^\s*(is|are|can|should|will|do|does|would|could)\b/.test(t.trim())) return fresh(b, ['yes definitely', 'hmm probably not', 'maybe? idk', 'i think so', 'ask henry lol', 'no but yes', 'only if it rains', 'yeah 100%']) + (kw && Math.random() < 0.5 ? ' (' + kw + ' is a tough one)' : '');
    return fresh(b, kw ? ['idk much about ' + kw + ' tbh', 'good question, ' + kw + '... no clue', 'hmm ' + kw + '? maybe ask at the shop', 'what do YOU think about ' + kw + '?'] : ['idk', 'no idea lol', 'good question', 'hmm let me think... no']);
  }
  if (depth > 1) return null;
  return fresh(b, kw ? [kw + '? interesting', 'wait what do you mean ' + kw, 'lol ' + kw, 'ok but have you seen my ' + (best ? PLANT[best.id].n : 'garden') + '?', 'real', kw + ' is crazy', 'true true'] : ['real', 'true', 'fr', 'ok', 'lol', 'hmm', 'interesting 🤔']);
}
function giveMoneyTo(id, amt, from) {
  if (id === myId()) { S.money += amt; UI.refreshMoney(); toast('💸 ' + from + ' gave you ' + fmt(amt)); }
  else if (G.bots.find(b => b.name === id)) G.bots.find(b => b.name === id).money += amt;
  else netAct({ t: 'gift', to: id, money: amt, src: from });
}
function giveFruitTo(id, f, from) {
  if (id === myId()) { S.backpack.push(f); toast('🎁 ' + from + ' gave you a ' + PLANT[f.id].n + '!'); }
  else if (G.bots.find(b => b.name === id)) G.bots.find(b => b.name === id).backpack.push(f);
  else netAct({ t: 'gift', to: id, fruit: f, src: from });
}
