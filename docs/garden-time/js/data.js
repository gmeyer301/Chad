'use strict';
/* GARDEN TIME — game data (plants, pets, gear, weather, mutations)
   Idea: s0meTh1ng.MP4 / Henry & Claude.AI */
const VER = 'V1.0.0';
const GH_URL = 'https://gmeyer301.github.io/Chad/garden-time/';

const RARITY = {
  Common:    { c: '#c9c9c9', stock: 1.0,   amt: [3, 8] },
  Rare:      { c: '#3d8bff', stock: 0.7,   amt: [2, 5] },
  Epic:      { c: '#b44dff', stock: 0.45,  amt: [1, 4] },
  Legendary: { c: '#ffd23d', stock: 0.3,   amt: [1, 3] },
  Mythic:    { c: '#ff4da6', stock: 0.16,  amt: [1, 2] },
  Divine:    { c: '#ff8c1a', stock: 0.08,  amt: [1, 2] },
  Prismatic: { c: 'rainbow', stock: 0.04,  amt: [1, 1] },
  '???':     { c: '#111111', stock: 0.02,  amt: [1, 1] },
  House:     { c: '#a0673a', stock: 0.012, amt: [1, 1] },
  PAIN:      { c: '#8b0000', stock: 0.006, amt: [1, 1] },
  Secret:    { c: '#7dff5a', stock: 0.003, amt: [1, 1] },
  Boss:      { c: '#ff3b3b', stock: 0,     amt: [0, 0] },
  AAO:       { c: '#00ffcc', stock: 0,     amt: [0, 0] },
  Free:      { c: '#9be37a', stock: 1,     amt: [99, 99] },
};

/* k = model kind, c = colors [main, fruit, extra], fs = fruit shape, def = defence type, tg = thanksgiving */
const PLANTS = [
  { id: 'beginous', n: 'Beginous', r: 'Free', p: 0, k: 'sprout', c: ['#5fd35f', '#ffe066'], fs: 'sphere', fc: 3, g: 10, fr: 12, v: 4 },
  { id: 'carrot', n: 'Carrot', r: 'Common', p: 10, k: 'crop', c: ['#3fae3f', '#ff8a1f'], fs: 'carrot' },
  { id: 'tomato', n: 'Tomato', r: 'Common', p: 20, k: 'bush', c: ['#3c9a3c', '#ff3b2f'], fs: 'sphere', extra: 1 },
  { id: 'strawberry', n: 'Strawberries', r: 'Common', p: 30, k: 'bush', c: ['#2f8f2f', '#ff2d4b'], fs: 'berry' },
  { id: 'pumpkin', n: 'Pumpkin', r: 'Common', p: 50, k: 'ground', c: ['#3f8f2f', '#ff8c1a'], fs: 'pumpkin' },
  { id: 'watermelon', n: 'Water Melon', r: 'Rare', p: 100, k: 'ground', c: ['#2f7f2f', '#2f9e44', '#ff4d6d'], fs: 'melon' },
  { id: 'blueberry', n: 'Blueberry', r: 'Rare', p: 200, k: 'bush', c: ['#2f6f3f', '#4d6bff'], fs: 'sphere', extra: 1 },
  { id: 'apple', n: 'Apple Tree', r: 'Rare', p: 350, k: 'tree', c: ['#3faa3f', '#e8202a'], fs: 'apple' },
  { id: 'mango', n: 'Mango Tree', r: 'Epic', p: 500, k: 'tree', c: ['#2f8f3f', '#ffb21f'], fs: 'egg' },
  { id: 'banana', n: 'Banana Tree', r: 'Epic', p: 1000, k: 'palm', c: ['#3faa3f', '#ffe14d'], fs: 'banana' },
  { id: 'bellpepper', n: 'Bell Pepper', r: 'Epic', p: 3000, k: 'bush', c: ['#2f8f2f', '#ff3030'], fs: 'pepper' },
  { id: 'grape', n: 'Grape', r: 'Legendary', p: 5000, k: 'vine', c: ['#3f8f3f', '#8a3cff'], fs: 'grapes' },
  { id: 'pineapple', n: 'Pineapple', r: 'Legendary', p: 8000, k: 'pineapple', c: ['#2f8f4f', '#ffc21f'], fs: 'pineapple' },
  { id: 'crabgrass', n: 'Crab Grass', r: 'Legendary', p: 11000, k: 'crabgrass', c: ['#4fcf4f', '#ff5a3c'], fs: 'claw', extra: 1 },
  { id: 'peashooter', n: 'Pea Shooter', r: 'Legendary', p: 15000, k: 'peashooter', c: ['#3fcf3f', '#7dff5a'], fs: 'pea', def: 'pea' },
  { id: 'dragonfruit', n: 'Dragon Fruit', r: 'Mythic', p: 20000, k: 'cactus', c: ['#3faa5f', '#ff3fa8'], fs: 'dragon' },
  { id: 'rose', n: 'Rose', r: 'Mythic', p: 75000, k: 'rose', c: ['#2f7f2f', '#e0103a'], fs: 'rose' },
  { id: 'starfruit', n: 'Star Fruit', r: 'Mythic', p: 150000, k: 'tree', c: ['#4fbf4f', '#ffef3d'], fs: 'star', extra: 1 },
  { id: 'cherry', n: 'Cherry', r: 'Mythic', p: 250000, k: 'tree', c: ['#ff9ad5', '#c4002f'], fs: 'cherry' },
  { id: 'orange', n: 'Orange', r: 'Mythic', p: 850000, k: 'tree', c: ['#2f9f3f', '#ff8c00'], fs: 'sphere' },
  { id: 'cactus', n: 'Cactus', r: 'Divine', p: 1000000, k: 'cactus', c: ['#2faa4f', '#ff5fb0'], fs: 'flowerbud' },
  { id: 'mushroom', n: 'Mushroom', r: 'Divine', p: 1250000, k: 'mushroom', c: ['#f2e6d0', '#e8202a'], fs: 'shroom' },
  { id: 'kiwi', n: 'Kiwi', r: 'Divine', p: 2650000, k: 'vine', c: ['#3f8f3f', '#8a6a3a'], fs: 'egg' },
  { id: 'bamboo', n: 'Bamboo', r: 'Divine', p: 4000000, k: 'bamboo', c: ['#7fcf3f', '#a6e05a'], fs: 'shoot' },
  { id: 'venus', n: 'Venus Fly Trap', r: 'Prismatic', p: 6500000, k: 'venus', c: ['#5fcf3f', '#ff3f5f'], fs: 'trap', def: 'snap' },
  { id: 'sunflower', n: 'Sun Flower', r: 'Prismatic', p: 10000000, k: 'sunflower', c: ['#3faa3f', '#ffd21f'], fs: 'seedhead' },
  { id: 'burningbud', n: 'Burning Bud', r: 'Prismatic', p: 15000000, k: 'flower', c: ['#3f3f3f', '#ff5a1f'], fs: 'flame' },
  { id: 'moonmelon', n: 'Moon Melon', r: 'Prismatic', p: 22000000, k: 'ground', c: ['#4a4a8f', '#d8e4ff', '#9fb0ff'], fs: 'melon', extra: 1 },
  { id: 'beanstalk', n: 'Bean Stalk', r: 'Prismatic', p: 30000000, k: 'beanstalk', c: ['#3fbf3f', '#7fdf4f'], fs: 'bean' },
  { id: 'eldercarrot', n: 'Elder Carrot', r: '???', p: 50000000, k: 'crop', c: ['#6a8f6a', '#c06a1f'], fs: 'carrot', big: 1 },
  { id: 'onion', n: 'Onion', r: '???', p: 100000000, k: 'crop', c: ['#5faf3f', '#c98fff'], fs: 'onion', big: 1 },
  { id: 'soulstalk', n: 'Soul Stalk', r: '???', p: 350000000, k: 'soulstalk', c: ['#4fffe0', '#bffff4'], fs: 'soul' },
  { id: 'lmht', n: 'Lost Man Head Tree', r: '???', p: 650000000, k: 'tree', c: ['#4a5a3a', '#e8c09a'], fs: 'head', dark: 1 },
  { id: 'pillow', n: 'Pillow Bush', r: 'House', p: 1e9, k: 'bush', c: ['#6f9f6f', '#f4f0ff'], fs: 'pillow' },
  { id: 'cabinet', n: 'Cabinet Vine', r: 'House', p: 1.5e9, k: 'vine', c: ['#5f7f3f', '#9a6a3a'], fs: 'cabinet' },
  { id: 'lantern', n: 'Lantern Tree', r: 'PAIN', p: 3e9, k: 'tree', c: ['#2a2a2a', '#ffb43a'], fs: 'lantern', dark: 1 },
  { id: 'chipstack', n: 'Sour Cream & Onion Stack', r: 'Secret', p: 1e12, k: 'chipstack', c: ['#3fae4f', '#ffe39a'], fs: 'chip' },
  // Thanksgiving shop
  { id: 'crowplant', n: 'Crow Plant', r: 'Common', p: 100, k: 'crowplant', c: ['#3f6f2f', '#222222'], fs: 'feather', tg: 1 },
  { id: 'corn', n: 'Corn', r: 'Rare', p: 200, k: 'corn', c: ['#6fbf3f', '#ffd53d'], fs: 'corn', tg: 1 },
  { id: 'cranberry', n: 'Cranberry', r: 'Rare', p: 300, k: 'bush', c: ['#3f6f3f', '#b3002d'], fs: 'sphere', tg: 1, extra: 1 },
  { id: 'wheat', n: 'Wheat', r: 'Rare', p: 500, k: 'wheat', c: ['#d9b44a', '#e8c868'], fs: 'grain', tg: 1 },
  { id: 'squash', n: 'Squash', r: 'Rare', p: 700, k: 'ground', c: ['#4f8f2f', '#f5c242'], fs: 'squash', tg: 1 },
  { id: 'honeycactus', n: 'Honey Comb Cactus', r: 'Legendary', p: 2000, k: 'cactus', c: ['#c8a020', '#ffb000'], fs: 'honey', tg: 1 },
  { id: 'sweetpotato', n: 'Sweet Potato', r: 'Legendary', p: 2500, k: 'crop', c: ['#4f8f3f', '#c0503a'], fs: 'egg', tg: 1, extra: 1 },
  { id: 'pitcher', n: 'Pitcher Plant', r: 'Legendary', p: 3500, k: 'pitcher', c: ['#7faf3f', '#c03f6f'], fs: 'nectar', def: 'suck', tg: 1 },
  { id: 'pumpkinpie', n: 'Pumpkin Pie Vine', r: 'Mythic', p: 5000, k: 'vine', c: ['#4f7f2f', '#d9822b'], fs: 'pie', tg: 1 },
  { id: 'caramelapple', n: 'Caramel Apple Tree', r: 'Divine', p: 7500, k: 'tree', c: ['#4f9f3f', '#c87a2a'], fs: 'caramel', tg: 1 },
  { id: 'maple', n: 'Maple Syrup Tree', r: 'Prismatic', p: 9000, k: 'tree', c: ['#e0502a', '#8a4a1a'], fs: 'syrup', tg: 1 },
  { id: 'turkeyblossom', n: 'Turkey Blossom', r: '???', p: 11000, k: 'flower', c: ['#6f4f2f', '#c0501f'], fs: 'drumstick', tg: 1 },
  { id: 'scarecrow', n: 'Scarecrow Blossom', r: 'Boss', p: 50000, k: 'scarecrow', c: ['#d9b44a', '#ff8c1a'], fs: 'strawhat', tg: 1, noShop: 1 },
  // Admin Abuse Only
  { id: 'partytree', n: 'Party Tree', r: 'AAO', p: 5e9, k: 'tree', c: ['#ff6fd8', '#ff3f3f'], fs: 'balloon', noShop: 1 },
  { id: 'taco', n: 'Taco Plant', r: 'AAO', p: 6e9, k: 'bush', c: ['#3faa3f', '#f2c14e'], fs: 'taco', noShop: 1 },
  { id: 'trashcan', n: 'Trash Can', r: 'AAO', p: 7e9, k: 'trashcan', c: ['#7a8a8a', '#1a1a1a'], fs: 'trashbag', noShop: 1 },
  { id: 'bbqbush', n: 'BBQ Chips Bush', r: 'AAO', p: 8e9, k: 'bush', c: ['#5f8f3f', '#b5541f'], fs: 'chip', noShop: 1 },
  { id: 'glitcher', n: 'Glitcher Plant', r: 'AAO', p: 9e9, k: 'glitcher', c: ['#e8d36a', '#3fcf3f'], fs: 'glitchpea', def: 'glitch', noShop: 1 },
];
const PLANT = {}; PLANTS.forEach(d => { PLANT[d.id] = d; });
// fill in grow time, regrow time, fruit count, fruit value
PLANTS.forEach(d => {
  const lp = Math.log10(d.p + 1);
  if (d.g == null) d.g = Math.round(15 + 26 * lp);
  if (d.fr == null) d.fr = Math.round(10 + 11 * lp);
  if (d.fc == null) d.fc = { tree: 5, palm: 4, bush: 5, vine: 4, ground: 2, crop: 1, sprout: 3 }[d.k] || 3;
  if (d.v == null) {
    const vm = 0.55 * Math.pow(Math.max(d.p, 10) / 10, -0.05);
    let v = d.p * vm; if (d.fc === 1) v *= 2.6; if (d.fc === 2) v *= 1.6; if (d.tg) v *= 1.4;
    d.v = Math.max(4, Math.round(v));
  }
  d.w = d.big ? 6 : (d.k === 'ground' ? 4 : d.k === 'tree' ? 1.2 : 0.6); // base weight kg
});

const MUTATIONS = {
  Wet: { m: 2, c: '#6fb7ff' }, Drenched: { m: 5, c: '#1f5fd0' },
  Frosty: { m: 2, c: '#cfefff' }, Frozen: { m: 10, c: '#8fd8ff' },
  Shocked: { m: 50, c: '#fff35a' }, 'F I S H': { m: 8, c: '#ff9f43' },
  Burnt: { m: 4, c: '#3a2a20' }, 'Other worldly': { m: 40, c: '#5aff7a' },
  Shattered: { m: 100, c: '#b46bff' }, 'No clipped': { m: 60, c: '#e8d36a' },
  Wonderful: { m: 50, c: '#fff6c8' }, Demonic: { m: 50, c: '#ff2020' },
  Fancy: { m: 30, c: '#ffd700' }, Thankful: { m: 6, c: '#ff8c1a' },
  Pranked: { m: 3, c: '#fff3a0' }, Pollinated: { m: 3, c: '#ffc83d' },
  Floaty: { m: 15, c: '#ff9ae8' }, Golden: { m: 20, c: '#ffcc00' }, Rainbow: { m: 50, c: 'rainbow' },
};

/* weather: aao = admin abuse only, tg = thanksgiving only */
const WEATHERS = {
  Rain: { mut: 'Wet', evo: ['Wet', 'Drenched'], chance: 0.012, sky: 0x7d8a99, fog: 0x7d8a99, dur: 80, icon: '🌧️' },
  Blizzard: { mut: 'Frosty', evo: ['Frosty', 'Frozen'], chance: 0.01, sky: 0xc9d6e3, fog: 0xdfe8f0, dur: 75, icon: '❄️' },
  Thunder: { mut: 'Shocked', chance: 0, sky: 0x3a3f4f, fog: 0x3a3f4f, dur: 70, icon: '⚡' },
  'Fish Rain': { mut: 'F I S H', chance: 0.008, sky: 0x6fa0c8, fog: 0x8fb5d6, dur: 60, icon: '🐟' },
  Volcano: { mut: 'Burnt', chance: 0, sky: 0x7a3a2a, fog: 0x9a4a3a, dur: 70, icon: '🌋' },
  'Turkey Rain': { mut: 'Thankful', chance: 0.012, sky: 0xd99a5a, fog: 0xe0b07a, dur: 80, icon: '🦃', tg: 1 },
  'Space Ship': { mut: 'Other worldly', chance: 0.02, sky: 0x101830, fog: 0x1a2440, dur: 60, icon: '🛸', aao: 1 },
  'Universe Shatter': { mut: 'Shattered', chance: 0.015, sky: 0x2a0a3f, fog: 0x3a1050, dur: 55, icon: '💥', aao: 1 },
  Backrooms: { mut: 'No clipped', chance: 0.02, sky: 0xc9b458, fog: 0xc9b458, dur: 70, icon: '🟨', aao: 1 },
  Heven: { mut: 'Wonderful', chance: 0.02, sky: 0xfff6d8, fog: 0xfffbe8, dur: 60, icon: '😇', aao: 1 },
  Hell: { mut: 'Demonic', chance: 0.02, sky: 0x4a0a05, fog: 0x6a1005, dur: 60, icon: '😈', aao: 1 },
  Hotel: { mut: 'Fancy', chance: 0.02, sky: 0x5a1a2a, fog: 0x5a1a2a, dur: 60, icon: '🏨', aao: 1 },
};
const NATURAL_WEATHER = ['Rain', 'Rain', 'Blizzard', 'Thunder', 'Fish Rain', 'Volcano'];

/* pets: cd = ability cooldown (s) */
const PETS = [
  { id: 'dog', n: 'Dog', p: 1000, c: '#c8894a', cd: 90, ab: 'Digs up a random seed for you' },
  { id: 'turtle', n: 'Turtle', p: 5000, c: '#3f9f5f', cd: 0, ab: 'Your plants grow 15% faster' },
  { id: 'raccoon', n: 'Racoon', p: 15000, c: '#7a7a82', cd: 120, ab: 'Sneaks a fruit from a bot garden for you' },
  { id: 'crow', n: 'Crow', p: 35000, c: '#1f1f26', cd: 80, ab: 'Pecks a fruit and makes it Thankful', tg: 1 },
  { id: 'turkey', n: 'Turkey', p: 100000, c: '#8a5a2f', cd: 100, ab: 'Gobbles: 2 fruits become Thankful + Cornucopia gives double', tg: 1 },
  { id: 'cola', n: 'Fizzy Cola', p: 500000, c: '#1f4fbf', cd: 90, ab: 'Sugar Rush: +35% speed and plants skip 30s of growing' },
  { id: 'bee', n: 'Bee', p: 1000000, c: '#ffcf1f', cd: 60, ab: 'Pollinates a fruit (Pollinated x3)' },
  { id: 'polarbear', n: 'Polar Bear', p: 5000000, c: '#f4f8ff', cd: 80, ab: 'Breathes cold: a fruit becomes Frosty or Frozen' },
  { id: 'platypus', n: 'Platypus', p: 10000000, c: '#6a8fb0', cd: 70, ab: 'Lays an Egg gear + electric bill: fruit can get Shocked' },
  { id: 'inchworm', n: 'Inch Worm', p: 5e9, c: '#8fdf4f', cd: 45, ab: 'Measures a fruit and makes it 1.5–2.5x heavier' },
  { id: 'balloon', n: 'Ballon', p: 1e9, c: '#ff4d6d', cd: 60, ab: 'Lets you float (hold jump) + makes a fruit Floaty', aao: 1 },
];
const PET = {}; PETS.forEach(p => { PET[p.id] = p; });

const GEAR = [
  { id: 'shovel', n: 'Shovel', p: 0, d: 'Dig up a plant from your garden', icon: '🪏', free: 1 },
  { id: 'wateringcan', n: 'Watering Can', p: 500, d: 'Water a plant: skips 10s of growing (10 uses)', icon: '🚿', uses: 10 },
  { id: 'sprinkler', n: 'Sprinkler', p: 20000, d: 'Place in garden: plants nearby grow 50% faster and get Wet (5 min)', icon: '💦' },
  { id: 'mover', n: 'Plant Mover', p: 8000, d: 'Pick up a plant and place it somewhere else (5 uses)', icon: '🧤', uses: 5 },
  { id: 'egg', n: 'Egg', p: 2000, d: 'Throw at a plant: grows faster + fruits get Pranked', icon: '🥚' },
  { id: 'treat', n: 'Treats', p: 15000, d: 'Give to a pet: levels it up + shorter ability cooldown', icon: '🦴' },
];
const GEARD = {}; GEAR.forEach(g => { GEARD[g.id] = g; });

const BOT_NAMES = ['ShellShock', 'PinchPotato', 'Crabby_Patty', 'SideStepSam', 'ClawdiaRose', 'BubbleBeard', 'SnipSnap99', 'CrustyKing', 'ToastyToes', 'MrKrabcake', 'SandyClaws', 'Lil_Pincher'];
const CORNUCOPIA_GOAL = 15;

function fmt(n) {
  n = Math.floor(n); const neg = n < 0; n = Math.abs(n);
  const u = [[1e15, 'Qd'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, s] of u) if (n >= v) return (neg ? '-' : '') + '$' + (n / v).toFixed(n / v < 10 ? 2 : n / v < 100 ? 1 : 0).replace(/\.0+$/, '') + s;
  return (neg ? '-' : '') + '$' + n.toLocaleString();
}
function rarCol(r) { return RARITY[r] ? RARITY[r].c : '#fff'; }
function fruitValue(f, d) {
  let mult = 1; (f.m || []).forEach(m => { if (MUTATIONS[m]) mult += MUTATIONS[m].m - 1; });
  const wf = Math.pow(f.w / d.w, 2);
  return Math.max(1, Math.round(d.v * wf * mult));
}
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
