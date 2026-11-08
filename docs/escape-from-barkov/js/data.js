/* Escape from Barkov — game data. Everyone is a tree. Currency: Rubarks (₽). */
'use strict';
window.G = window.G || {};
G.VERSION = 'V1.0.0';

/* ---------------- ammo ---------------- */
// dmg: flesh damage, pen: penetration power, spd: muzzle velocity m/s, ad: armor damage %, frag: fragment chance, pellets
const AMMO = {
  a918_p:   { name: '9x18 Sap P',      cal: '9x18',  dmg: 50, pen: 5,  spd: 300, ad: 15, price: 45 },
  a918_pbm: { name: '9x18 Sap PBM',    cal: '9x18',  dmg: 40, pen: 28, spd: 519, ad: 30, price: 420 },
  a919_pst: { name: '9x19 Pst Knot',   cal: '9x19',  dmg: 50, pen: 20, spd: 457, ad: 30, price: 120 },
  a919_ap:  { name: '9x19 AP 6.3',     cal: '9x19',  dmg: 52, pen: 30, spd: 392, ad: 46, price: 700 },
  a545_ps:  { name: '5.45 Splinter PS', cal: '545',  dmg: 53, pen: 28, spd: 890, ad: 34, price: 140 },
  a545_bp:  { name: '5.45 Splinter BP', cal: '545',  dmg: 48, pen: 45, spd: 890, ad: 46, price: 650 },
  a545_bs:  { name: '5.45 Splinter BS', cal: '545',  dmg: 43, pen: 54, spd: 830, ad: 57, price: 1300 },
  a762_ps:  { name: '7.62x39 Knot PS', cal: '762x39', dmg: 57, pen: 35, spd: 700, ad: 52, price: 170 },
  a762_bp:  { name: '7.62x39 Knot BP', cal: '762x39', dmg: 58, pen: 47, spd: 730, ad: 63, price: 900 },
  a556_m855:{ name: '5.56 Acorn M855', cal: '556',  dmg: 54, pen: 31, spd: 922, ad: 49, price: 240 },
  a556_m995:{ name: '5.56 Acorn M995', cal: '556',  dmg: 42, pen: 53, spd: 1013, ad: 58, price: 1400 },
  a762r_lps:{ name: '7.62x54R Root LPS', cal: '762r', dmg: 81, pen: 42, spd: 853, ad: 78, price: 420 },
  a762r_snb:{ name: '7.62x54R Root SNB', cal: '762r', dmg: 75, pen: 62, spd: 875, ad: 87, price: 2200 },
  a12_buck: { name: '12ga Seed Buckshot', cal: '12ga', dmg: 37, pen: 1, spd: 415, ad: 26, pellets: 8, price: 60 },
  a12_slug: { name: '12ga Pith Slug',  cal: '12ga', dmg: 140, pen: 26, spd: 410, ad: 50, price: 380 },
  a12_ap20: { name: '12ga AP-20 Slug', cal: '12ga', dmg: 164, pen: 37, spd: 510, ad: 65, price: 1500 },
};
G.AMMO = AMMO;

/* ---------------- items ---------------- */
// type, w,h, price (base trader value), wt (kg), col (icon colour)
const I = {};
const def = (id, o) => { I[id] = Object.assign({ id, w: 1, h: 1, wt: .1, price: 1000, col: '#5a5a48' }, o); };

// money
def('rub', { type: 'money', name: 'Rubarks', short: '₽', stack: 500000, price: 1, wt: 0, col: '#4e6b3a' });

// ammo stacks
for (const k in AMMO) def(k, { type: 'ammo', name: AMMO[k].name, short: AMMO[k].name.split(' ').slice(-1)[0].replace('Buckshot', 'BUCK').toUpperCase().slice(0, 6), stack: 60, price: AMMO[k].price, wt: .012, col: '#6d5a2c', cal: AMMO[k].cal });

// magazines (cap, cal, fits weapon-mag-type)
def('pm_mag',   { type: 'mag', name: 'PineMakarov 8-rd mag', short: 'PM 8', cap: 8, cal: '9x18', mt: 'pm', h: 1, price: 1200, wt: .09 });
def('gl_mag',   { type: 'mag', name: 'Gnarlock 17-rd mag', short: 'GL 17', cap: 17, cal: '9x19', mt: 'gl', price: 3000, wt: .08 });
def('mp_mag',   { type: 'mag', name: 'MP-Fir 30-rd mag', short: 'MPF 30', cap: 30, cal: '9x19', mt: 'mp', h: 2, price: 4500, wt: .13 });
def('ak545_30', { type: 'mag', name: 'Bark-74 30-rd mag', short: '545 30', cap: 30, cal: '545', mt: 'ak545', h: 2, price: 3200, wt: .23 });
def('ak545_45', { type: 'mag', name: 'Bark-74 45-rd mag', short: '545 45', cap: 45, cal: '545', mt: 'ak545', h: 2, price: 9800, wt: .32 });
def('akm_30',   { type: 'mag', name: 'AK-Moss 30-rd mag', short: '762 30', cap: 30, cal: '762x39', mt: 'akm', h: 2, price: 3500, wt: .33 });
def('rpk_75',   { type: 'mag', name: 'Root 75-rd drum', short: 'DRUM 75', cap: 75, cal: '762x39', mt: 'akm', w: 2, h: 2, price: 38000, wt: 1.1 });
def('stanag_30',{ type: 'mag', name: 'Acorn STANAG 30-rd', short: '556 30', cap: 30, cal: '556', mt: 'stanag', h: 2, price: 4200, wt: .12 });
def('svd_10',   { type: 'mag', name: 'SVDwood 10-rd mag', short: 'SVD 10', cap: 10, cal: '762r', mt: 'svd', price: 6000, wt: .2 });

// weapons. rv/rh recoil (deg per shot), disp (deg spread), ergo, rpm, modes, slot, mt (mag type) or internal:cap
def('pm', { type: 'weapon', name: 'PineMakarov pistol', short: 'PM', w: 2, h: 1, price: 9000, wt: .73, cal: '9x18', mt: 'pm', rpm: 450, modes: ['semi'], rv: 2.0, rh: .7, disp: .55, ergo: 70, cls: 'pistol', slot: 'holster', rail: false, vel: .9, col: '#3c3a36', len: .18 });
def('gnarlock', { type: 'weapon', name: 'Gnarlock 17 pistol', short: 'GNARLOCK', w: 2, h: 1, price: 26000, wt: .7, cal: '9x19', mt: 'gl', rpm: 600, modes: ['semi'], rv: 1.8, rh: .6, disp: .4, ergo: 80, cls: 'pistol', slot: 'holster', rail: true, vel: .95, col: '#2a2b2a', len: .2 });
def('goldgnarl', { type: 'weapon', name: 'Golden Gnarlock (Old Gnarl\'s)', short: 'GOLD GL', w: 2, h: 1, price: 140000, wt: .8, cal: '9x19', mt: 'gl', rpm: 600, modes: ['semi'], rv: 1.7, rh: .55, disp: .35, ergo: 82, cls: 'pistol', slot: 'holster', rail: true, vel: .95, col: '#c9a227', len: .2 });
def('mpfir', { type: 'weapon', name: 'MP-Fir submachine gun', short: 'MP-FIR', w: 3, h: 2, price: 42000, wt: 2.6, cal: '9x19', mt: 'mp', rpm: 800, modes: ['auto', 'semi'], rv: .55, rh: .35, disp: .3, ergo: 65, cls: 'smg', slot: 'primary', rail: true, vel: 1.05, col: '#2d2e2c', len: .55 });
def('twig133', { type: 'weapon', name: 'Twig-133 pump shotgun', short: 'TWIG-133', w: 5, h: 1, price: 16000, wt: 3.4, cal: '12ga', internal: 6, pump: true, rpm: 60, modes: ['semi'], rv: 5.5, rh: 1.6, disp: 1.8, ergo: 50, cls: 'shotgun', slot: 'primary', rail: false, vel: 1, col: '#4b3524', len: 1.0 });
def('sticks', { type: 'weapon', name: 'Stick-S carbine', short: 'STICK-S', w: 5, h: 1, price: 21000, wt: 3.8, cal: '762x39', internal: 10, rpm: 400, modes: ['semi'], rv: 1.7, rh: .6, disp: .14, ergo: 40, cls: 'rifle', slot: 'primary', rail: false, vel: 1, col: '#5a3a22', len: 1.0 });
def('mossin', { type: 'weapon', name: 'Mossin bolt-action rifle', short: 'MOSSIN', w: 6, h: 1, price: 24000, wt: 4.0, cal: '762r', internal: 5, bolt: true, rpm: 40, modes: ['semi'], rv: 4.8, rh: 1.2, disp: .06, ergo: 32, cls: 'rifle', slot: 'primary', rail: true, vel: 1.02, col: '#6a4425', len: 1.25 });
def('bark74u', { type: 'weapon', name: 'Bark-74U carbine', short: 'BARK-74U', w: 3, h: 2, price: 30000, wt: 2.7, cal: '545', mt: 'ak545', rpm: 650, modes: ['auto', 'semi'], rv: 1.15, rh: .55, disp: .22, ergo: 45, cls: 'rifle', slot: 'primary', rail: true, vel: .8, col: '#3d2f22', len: .65 });
def('bark74', { type: 'weapon', name: 'Bark-74N assault rifle', short: 'BARK-74N', w: 4, h: 2, price: 46000, wt: 3.4, cal: '545', mt: 'ak545', rpm: 650, modes: ['auto', 'semi'], rv: .95, rh: .45, disp: .12, ergo: 42, cls: 'rifle', slot: 'primary', rail: true, vel: 1, col: '#3d2f22', len: .9 });
def('akmoss', { type: 'weapon', name: 'AK-Moss assault rifle', short: 'AK-MOSS', w: 4, h: 2, price: 52000, wt: 3.6, cal: '762x39', mt: 'akm', rpm: 600, modes: ['auto', 'semi'], rv: 1.35, rh: .7, disp: .14, ergo: 40, cls: 'rifle', slot: 'primary', rail: true, vel: 1, col: '#4a3626', len: .9 });
def('m4acorn', { type: 'weapon', name: 'M4-Acorn assault rifle', short: 'M4-ACORN', w: 4, h: 2, price: 78000, wt: 3.1, cal: '556', mt: 'stanag', rpm: 800, modes: ['auto', 'semi'], rv: .8, rh: .4, disp: .1, ergo: 55, cls: 'rifle', slot: 'primary', rail: true, vel: 1, col: '#25272a', len: .85 });
def('svdwood', { type: 'weapon', name: 'SVDwood marksman rifle', short: 'SVDWOOD', w: 6, h: 2, price: 88000, wt: 4.4, cal: '762r', mt: 'svd', rpm: 300, modes: ['semi'], rv: 2.6, rh: .8, disp: .05, ergo: 30, cls: 'rifle', slot: 'primary', rail: true, vel: 1.03, col: '#5d3c22', len: 1.22 });
def('rpkroot', { type: 'weapon', name: 'RPK-Root machine gun', short: 'RPK-ROOT', w: 5, h: 2, price: 115000, wt: 5.0, cal: '762x39', mt: 'akm', rpm: 650, modes: ['auto', 'semi'], rv: 1.0, rh: .55, disp: .12, ergo: 28, cls: 'rifle', slot: 'primary', rail: true, vel: 1.05, col: '#3a2c20', len: 1.05 });

// weapon mods
def('reddot', { type: 'mod', slot: 'sight', name: 'Firefly red dot sight', short: 'DOT', price: 14000, wt: .15, zoom: 1, col: '#2a2a2a' });
def('holo', { type: 'mod', slot: 'sight', name: 'Glowworm holo sight', short: 'HOLO', price: 26000, wt: .3, zoom: 1, col: '#202a22' });
def('scope4', { type: 'mod', slot: 'sight', name: 'Owl-Eye 4x scope', short: '4X', w: 2, price: 42000, wt: .5, zoom: 4, col: '#1d1d1d' });
def('supp_rifle', { type: 'mod', slot: 'muzzle', name: 'Hush-Bark rifle suppressor', short: 'SUP', w: 2, price: 38000, wt: .45, fits: ['545', '556', '762x39'], col: '#1f1f1f' });
def('supp_pist', { type: 'mod', slot: 'muzzle', name: 'Whisperleaf 9mm suppressor', short: 'SUP9', price: 18000, wt: .2, fits: ['9x19'], col: '#1f1f1f' });

// armor: cls (class 1-6), dur, zones
def('pith_vest', { type: 'armor', name: 'Pith soft body armor', short: 'PITH', w: 3, h: 3, cls: 2, dur: 50, zones: ['thorax', 'stomach'], price: 18000, wt: 2.5, sp: .01, col: '#5e6b4a' });
def('moss3m', { type: 'armor', name: 'Moss-3M body armor', short: 'MOSS-3M', w: 3, h: 3, cls: 3, dur: 40, zones: ['thorax', 'stomach'], price: 26000, wt: 4.6, sp: .03, col: '#4b5a3c' });
def('heartwood', { type: 'armor', name: 'Heartwood Trooper armor', short: 'TROOPER', w: 3, h: 3, cls: 4, dur: 70, zones: ['thorax', 'stomach'], price: 68000, wt: 7.5, sp: .05, col: '#59492f' });
def('ironbark', { type: 'armor', name: 'Ironbark Korund armor', short: 'IRONBARK', w: 3, h: 3, cls: 5, dur: 60, zones: ['thorax', 'stomach'], price: 185000, wt: 11.7, sp: .08, col: '#3c3c3c' });
def('petrified', { type: 'armor', name: 'Petrified Slick plate carrier', short: 'SLICK', w: 3, h: 3, cls: 6, dur: 65, zones: ['thorax'], price: 390000, wt: 8.9, sp: .04, col: '#2d2a26' });
def('rig_armored', { type: 'rig', name: 'Barkplate armored rig', short: 'BARKPLATE', w: 3, h: 3, cls: 4, dur: 45, zones: ['thorax'], grid: [4, 2], price: 92000, wt: 7.9, sp: .05, col: '#4e4a35' });
// helmets
def('acorn_cap', { type: 'helmet', name: 'Acorn Cap SSh helmet', short: 'ACORN', w: 2, h: 2, cls: 3, dur: 30, price: 16000, wt: 1.5, col: '#5b6e3e' });
def('shell_helm', { type: 'helmet', name: 'Shell Helm', short: 'SHELL', w: 2, h: 2, cls: 4, dur: 35, price: 46000, wt: 1.3, col: '#3f4d38' });
def('oak_bucket', { type: 'helmet', name: 'Bucket of Oak (face shield)', short: 'BUCKET', w: 2, h: 2, cls: 5, dur: 45, face: true, price: 230000, wt: 4.0, col: '#556043' });
// rigs
def('rig_twine', { type: 'rig', name: 'Twine chest rig', short: 'TWINE', w: 2, h: 2, grid: [4, 2], price: 8000, wt: .5, col: '#6a5a3c' });
def('rig_band', { type: 'rig', name: 'Bandolier tactical rig', short: 'BANDO', w: 3, h: 2, grid: [5, 2], price: 23000, wt: .9, col: '#4c573a' });
def('rig_alpha', { type: 'rig', name: 'Sap-Alpha chest rig', short: 'ALPHA', w: 3, h: 3, grid: [6, 2], price: 46000, wt: 1.1, col: '#3b4530' });
// backpacks
def('bag_sack', { type: 'backpack', name: 'Burlap sack', short: 'SACK', w: 3, h: 3, grid: [3, 3], price: 9000, wt: .4, col: '#8a7350' });
def('bag_day', { type: 'backpack', name: 'Leaf daypack', short: 'DAYPACK', w: 4, h: 4, grid: [4, 4], price: 23000, wt: .7, col: '#5c7346' });
def('bag_pilgrim', { type: 'backpack', name: 'Pilgrim\'s Hollow backpack', short: 'PILGRIM', w: 5, h: 5, grid: [5, 6], price: 72000, wt: 1.9, col: '#4e5537' });
def('bag_trunk', { type: 'backpack', name: 'Raid Trunk backpack', short: 'TRUNK', w: 5, h: 6, grid: [6, 7], price: 145000, wt: 2.6, col: '#3e4a33' });
// secure containers
def('seed_pod', { type: 'secure', name: 'Seed Pod secure container', short: 'POD', w: 2, h: 2, grid: [2, 2], price: 0, wt: .5, col: '#2f3a28', noSell: true });
def('seed_pod_b', { type: 'secure', name: 'Seed Pod Beta secure container', short: 'POD β', w: 3, h: 2, grid: [3, 2], price: 0, wt: .5, col: '#2c3a33', noSell: true });
def('seed_pod_g', { type: 'secure', name: 'Seed Pod Gamma secure container', short: 'POD γ', w: 3, h: 3, grid: [3, 3], price: 0, wt: .5, col: '#33303d', noSell: true });

// meds. res=resource; heal hp/s; stops: bleed types; time = use seconds
def('bandage', { type: 'med', name: 'Fern bandage', short: 'BANDAGE', price: 2400, wt: .05, res: 1, stops: ['light'], time: 3, col: '#c8c2b0' });
def('tourniquet', { type: 'med', name: 'Twine tourniquet', short: 'TOURNI', price: 3200, wt: .05, res: 1, stops: ['heavy'], time: 4, col: '#7d2a22' });
def('splint', { type: 'med', name: 'Branch splint', short: 'SPLINT', price: 4200, wt: .1, res: 1, fixes: 'fracture', time: 5, col: '#9b7b4a' });
def('aisap', { type: 'med', name: 'AI-Sap medkit', short: 'AI-SAP', price: 3600, wt: .2, res: 100, heal: 1, time: 2, col: '#b33a2a' });
def('sapwa', { type: 'med', name: 'Sapwa first aid kit', short: 'SAPWA', h: 2, price: 15000, wt: .6, res: 400, heal: 1, stops: ['light', 'heavy'], bleedCost: { light: 45, heavy: 175 }, time: 3, col: '#c0392b' });
def('ifak', { type: 'med', name: 'Ranger IFAK', short: 'IFAK', price: 17000, wt: .3, res: 300, heal: 1, stops: ['light', 'heavy'], bleedCost: { light: 30, heavy: 210 }, time: 3, col: '#56632e' });
def('cms', { type: 'med', name: 'Bark Surgery Kit', short: 'SURGERY', w: 2, price: 32000, wt: .8, res: 5, surgery: true, time: 12, col: '#2f6b5a' });
def('painkill', { type: 'med', name: 'Sapalgin painkillers', short: 'SAPALGIN', price: 6200, wt: .05, res: 4, pain: 95, time: 2, col: '#f0e6c8' });
def('resinshot', { type: 'med', name: 'Resin Shot injector', short: 'RESIN', price: 19000, wt: .05, res: 1, pain: 300, time: 1.5, col: '#d0a24a' });
def('chloroboost', { type: 'med', name: 'Chlorophyll Booster stim', short: 'BOOST', price: 48000, wt: .05, res: 1, stim: true, time: 1.5, col: '#4cd16a' });
// food & drink
def('sapwater', { type: 'food', name: 'Bottle of sap water', short: 'WATER', h: 2, price: 6000, wt: .6, hyd: 60, en: 0, time: 4, col: '#8bbfd8' });
def('maple', { type: 'food', name: 'Maple juice', short: 'MAPLE', h: 2, price: 8500, wt: .5, hyd: 45, en: 15, time: 4, col: '#c77a2c' });
def('chips', { type: 'food', name: 'Wood chips snack', short: 'CHIPS', price: 2600, wt: .1, hyd: -5, en: 25, time: 3, col: '#c9a26b' });
def('stew', { type: 'food', name: 'Can of beetle stew', short: 'STEW', price: 9200, wt: .5, hyd: -10, en: 60, time: 5, col: '#7a7a6a' });
def('moonshine', { type: 'food', name: 'Pine moonshine', short: 'SHINE', h: 2, price: 62000, wt: 1.1, hyd: -20, en: 0, pain: 200, time: 5, col: '#cfe6c2' });
// grenade
def('pinenade', { type: 'grenade', name: 'Pine grenade', short: 'PINE', price: 12500, wt: .6, col: '#4d5d2c' });
// barter & valuables
const barter = (id, name, short, price, o = {}) => def(id, Object.assign({ type: 'barter', name, short, price }, o));
barter('screws', 'Rusty screws', 'SCREWS', 4200, { col: '#7a6a58', wt: .1 });
barter('vines', 'Copper vines', 'VINES', 7800, { col: '#b46a3a', wt: .2 });
barter('ducttape', 'Duct sap tape', 'TAPE', 9500, { col: '#8c8c8c', wt: .2 });
barter('gunpowder', 'Sapdust gunpowder', 'POWDER', 14000, { col: '#555', wt: .4 });
barter('lighter', 'Ember lighter', 'LIGHTER', 2400, { col: '#c33', wt: .05 });
barter('fertilizer', 'Fertilizer bag', 'FERT', 22000, { w: 2, h: 2, col: '#6f6a3e', wt: 4 });
barter('sapcan', 'Sap canister', 'SAP CAN', 26000, { w: 2, h: 2, col: '#a47b2a', wt: 5 });
barter('battery', 'Tractor battery', 'BATTERY', 32000, { w: 2, h: 2, col: '#2f2f2f', wt: 6 });
barter('sundial', 'Pocket sundial (gold)', 'SUNDIAL', 34000, { col: '#d4af37', wt: .1 });
barter('goldchain', 'Gold vine chain', 'CHAIN', 28000, { col: '#d4af37', wt: .1 });
barter('acorn_gold', 'Golden Acorn', '0.2 ACORN', 125000, { col: '#e8b923', wt: .05 });
barter('photocard', 'Photosynthesis card', 'GPU', 155000, { w: 2, col: '#295c3a', wt: .7 });
barter('lumen', 'Lumen crystal (LEDX)', 'LUMEN', 420000, { col: '#7ae0ff', wt: .1 });
barter('analyzer', 'Leaf analyzer', 'ANALYZER', 21000, { h: 2, col: '#4a6a7a', wt: .5 });
barter('flashdrive', 'Seed drive', 'DRIVE', 36000, { col: '#3a3a6a', wt: .02 });
barter('beetlejar', 'Bark beetle in a jar', 'BEETLE', 18000, { col: '#4c3a20', wt: .3 });
barter('intel', 'Intelligence folder', 'INTEL', 95000, { col: '#c9b27a', wt: .3 });
barter('teapot', 'Old teapot', 'TEAPOT', 8000, { w: 2, h: 2, col: '#8a8f80', wt: 1 });
barter('bolts', 'Bolts', 'BOLTS', 5600, { col: '#6a6a6a', wt: .2 });
barter('wires', 'Bundle of roots (wires)', 'ROOTS', 6800, { col: '#5a4030', wt: .2 });
// keys
def('key_office', { type: 'key', name: 'Sawmill office key', short: 'OFFICE', price: 26000, wt: .02, uses: 25, col: '#c9b84a' });
def('key_cellar', { type: 'key', name: 'Gnarl\'s cellar key', short: 'CELLAR', price: 62000, wt: .02, uses: 15, col: '#a87a3a' });
def('key_control', { type: 'key', name: 'Pulp control room key', short: 'CONTROL', price: 41000, wt: .02, uses: 25, col: '#8a9a5a' });
def('key_bunker', { type: 'key', name: 'Deadwood bunker key', short: 'BUNKER', price: 48000, wt: .02, uses: 20, col: '#6a7a8a' });
G.ITEMS = I;

/* ---------------- traders ---------------- */
// ll: loyalty level needed; offers: [itemId, price multiplier vs base | fixed, ll, opts]
G.TRADERS = {
  pinecone: { name: 'Pinecone', role: 'Weapons & insurance', buyMult: .5, col: '#7a5a2a', glyph: '🌲', buys: ['weapon', 'mag', 'ammo', 'grenade', 'barter', 'key'],
    blurb: 'An old pine who stockpiled half the oblast\'s armoury. Sells Barkovian iron. Insures your gear for a price.',
    offers: [['pm', 1, 1], ['pm_mag', 1, 1], ['a918_p', 1, 1], ['a918_pbm', 1.2, 2], ['twig133', 1, 1], ['a12_buck', 1, 1], ['a12_slug', 1.1, 2], ['a12_ap20', 1.3, 3],
      ['sticks', 1, 1], ['a762_ps', 1, 1], ['a762_bp', 1.25, 3], ['bark74u', 1, 1], ['bark74', 1, 2], ['ak545_30', 1, 1], ['ak545_45', 1.1, 3], ['a545_ps', 1, 1], ['a545_bp', 1.2, 2], ['a545_bs', 1.4, 4],
      ['akmoss', 1, 2], ['akm_30', 1, 2], ['mossin', 1, 1], ['a762r_lps', 1.1, 2], ['a762r_snb', 1.4, 4], ['pinenade', 1, 2], ['rpkroot', 1.3, 4], ['rpk_75', 1.2, 4]] },
  chloro: { name: 'Dr. Chlorophyll', role: 'Medicine, food, healing', buyMult: .62, col: '#2f7a4a', glyph: '🌿',
    blurb: 'A willow who used to run the clinic. Patches up your bark — out of raid — for a fee. Buys medicine and valuables.',
    buys: ['med', 'food', 'barter'], offers: [['bandage', 1, 1], ['tourniquet', 1, 1], ['splint', 1, 1], ['aisap', 1, 1], ['painkill', 1, 1], ['sapwa', 1.05, 2], ['ifak', 1.1, 2], ['cms', 1.1, 3], ['resinshot', 1.2, 3], ['chloroboost', 1.3, 4],
      ['sapwater', 1, 1], ['chips', 1, 1], ['maple', 1, 2], ['stew', 1, 2]] },
  mossman: { name: 'Mossman', role: 'Armour, rigs, packs', buyMult: .56, col: '#5a6a3a', glyph: '🪵',
    blurb: 'Grows his own fabric. Will dress you for the woods and take your torn gear off your branches.',
    buys: ['armor', 'helmet', 'rig', 'backpack', 'barter'], offers: [['pith_vest', 1, 1], ['acorn_cap', 1, 1], ['rig_twine', 1, 1], ['bag_sack', 1, 1], ['bag_day', 1, 1], ['moss3m', 1, 2], ['rig_band', 1, 2], ['shell_helm', 1.05, 2],
      ['heartwood', 1.05, 3], ['bag_pilgrim', 1.05, 3], ['rig_alpha', 1.1, 3], ['ironbark', 1.15, 4], ['bag_trunk', 1.1, 4], ['rig_armored', 1.1, 4]] },
  birch: { name: 'Birchkeeper', role: 'Western weapons', buyMult: .58, col: '#c8c2b0', glyph: '🌳',
    blurb: 'A pale birch with a blue helmet and very few morals. Western guns, sights and suppressors.',
    buys: ['weapon', 'mod', 'mag', 'barter'], offers: [['gnarlock', 1, 1], ['gl_mag', 1, 1], ['a919_pst', 1, 1], ['mpfir', 1, 1], ['mp_mag', 1, 1], ['reddot', 1, 1], ['a919_ap', 1.2, 2], ['holo', 1, 2],
      ['m4acorn', 1.05, 2], ['stanag_30', 1, 2], ['a556_m855', 1, 2], ['supp_pist', 1, 2], ['scope4', 1.05, 3], ['supp_rifle', 1.1, 3], ['a556_m995', 1.35, 4]] },
  gearwood: { name: 'Gearwood', role: 'Mods & tech', buyMult: .64, col: '#4a5a6a', glyph: '⚙️',
    blurb: 'An oak with a bolt through his trunk. Tinkerer. Pays best for electronics and parts.',
    buys: ['barter', 'mod', 'key'], offers: [['screws', 1.1, 1], ['vines', 1.1, 1], ['ducttape', 1.1, 2], ['reddot', 1, 1], ['svdwood', 1.05, 3], ['svd_10', 1, 3], ['gunpowder', 1.2, 2], ['analyzer', 1.3, 2]] },
  stump: { name: 'The Stump', role: 'Buys anything', buyMult: .4, col: '#5a4a3a', glyph: '🪓',
    blurb: 'He was cut down years ago. Doesn\'t care what you sell him. Doesn\'t pay much either.', buys: 'all', offers: [] },
};
G.LL_REQ = [null, { lvl: 1, spent: 0, rep: 0 }, { lvl: 5, spent: 150000, rep: .2 }, { lvl: 12, spent: 600000, rep: .35 }, { lvl: 20, spent: 1500000, rep: .5 }];

/* ---------------- tasks ---------------- */
// type: kill (who, map?, night?), fetch (items, fir), extract (map, n), visit (map, spot), survive (n)
G.TASKS = [
  { id: 't1', trader: 'pinecone', name: 'Debut of the Branch', desc: 'Some saplings have been squatting near the sawmill. Thin the brush.', obj: { type: 'kill', who: 'sapling', n: 5 }, reward: { rub: 25000, xp: 1700, rep: .06, items: [['a545_ps', 60]] } },
  { id: 't2', trader: 'pinecone', name: 'Search Mission', desc: 'Go to the Sawmill and come back with your bark intact.', obj: { type: 'extract', map: 'sawmill', n: 1 }, reward: { rub: 18000, xp: 1200, rep: .05 } },
  { id: 't3', trader: 'chloro', name: 'Shortage', desc: 'The clinic has run dry. Bring me three bottles of sap water found in raid.', obj: { type: 'fetch', item: 'sapwater', n: 3, fir: true }, reward: { rub: 30000, xp: 2500, rep: .07, items: [['bandage', 2], ['aisap', 2]] } },
  { id: 't4', trader: 'mossman', name: 'Dressed for the Woods', desc: 'I need an Acorn Cap helmet found in raid. Inspect the stitching, you know.', obj: { type: 'fetch', item: 'acorn_cap', n: 1, fir: true }, reward: { rub: 35000, xp: 2800, rep: .08, items: [['rig_band', 1]] }, after: 't2' },
  { id: 't5', trader: 'birch', name: 'Fishing Gear', desc: 'Mark the old boat dock on Deadwood lake. Just go there and look at it.', obj: { type: 'visit', map: 'deadwood', spot: 'dock' }, reward: { rub: 40000, xp: 3600, rep: .08, items: [['reddot', 1]] } },
  { id: 't6', trader: 'pinecone', name: 'Shooter Born in Spring', desc: 'Rival operators are clear-cutting my supply lines. Take down three PMCs.', obj: { type: 'kill', who: 'pmc', n: 3 }, reward: { rub: 75000, xp: 6000, rep: .1, items: [['a545_bp', 120]] }, after: 't1', lvl: 4 },
  { id: 't7', trader: 'chloro', name: 'Painkiller', desc: 'Four packs of Sapalgin, found in raid.', obj: { type: 'fetch', item: 'painkill', n: 4, fir: true }, reward: { rub: 45000, xp: 4000, rep: .08, items: [['sapwa', 1]] }, after: 't3' },
  { id: 't8', trader: 'gearwood', name: 'Tinker', desc: 'Copper vines and rusty screws, found in raid. Four of each.', obj: { type: 'multi', items: [['vines', 4], ['screws', 4]], fir: true }, reward: { rub: 50000, xp: 4500, rep: .1, items: [['scope4', 1]] }, lvl: 3 },
  { id: 't9', trader: 'mossman', name: 'Hot Pulp', desc: 'Survive the Pulp Factory twice. Bring back what you can carry.', obj: { type: 'extract', map: 'pulp', n: 2 }, reward: { rub: 60000, xp: 5000, rep: .1, items: [['heartwood', 1]] }, after: 't4' },
  { id: 't10', trader: 'birch', name: 'Night Shift', desc: 'Saplings get brave in the dark. Kill eight of them in night raids.', obj: { type: 'kill', who: 'sapling', n: 8, night: true }, reward: { rub: 85000, xp: 7000, rep: .1, items: [['supp_rifle', 1]] }, after: 't5', lvl: 6 },
  { id: 't11', trader: 'pinecone', name: 'The Lumber Baron', desc: 'Old Gnarl runs the Sawmill dorms with his Knotheads. Cut him down.', obj: { type: 'kill', who: 'gnarl', n: 1 }, reward: { rub: 200000, xp: 15000, rep: .15, items: [['a545_bs', 120]] }, after: 't6', lvl: 10 },
  { id: 't12', trader: 'mossman', name: 'Sawdust Survivor', desc: 'Survive five raids. Any map, any way.', obj: { type: 'survive', n: 5 }, reward: { rub: 70000, xp: 6000, rep: .1, items: [['bag_pilgrim', 1]] } },
  { id: 't13', trader: 'gearwood', name: 'Golden Harvest', desc: 'Bring me two Golden Acorns found in raid and I\'ll grow you a better seed pod.', obj: { type: 'fetch', item: 'acorn_gold', n: 2, fir: true }, reward: { rub: 0, xp: 12000, rep: .15, unlockPod: 'seed_pod_b' }, after: 't8', lvl: 8 },
  { id: 't14', trader: 'pinecone', name: 'Woodchipper Down', desc: 'The thing in the Pulp Factory chews through trees. Stop it.', obj: { type: 'kill', who: 'chipper', n: 1 }, reward: { rub: 250000, xp: 20000, rep: .15, items: [['ironbark', 1]] }, after: 't11', lvl: 12 },
  { id: 't15', trader: 'chloro', name: 'Clinical Trial', desc: 'A Lumen crystal, found in raid. Yes, really.', obj: { type: 'fetch', item: 'lumen', n: 1, fir: true }, reward: { rub: 150000, xp: 14000, rep: .15, items: [['chloroboost', 2]] }, after: 't7', lvl: 10 },
  { id: 't16', trader: 'birch', name: 'Rotwood Problem', desc: 'Raiders have taken the Deadwood bunker. Kill six Rotwood raiders.', obj: { type: 'kill', who: 'raider', n: 6 }, reward: { rub: 160000, xp: 15000, rep: .15, items: [['m4acorn', 1]] }, after: 't10', lvl: 12 },
  { id: 't17', trader: 'gearwood', name: 'The Last Seed', desc: 'Finish every other task. Then I\'ll give you the Gamma pod.', obj: { type: 'alltasks' }, reward: { rub: 500000, xp: 40000, rep: .2, unlockPod: 'seed_pod_g' }, after: 't13', lvl: 20 },
];

/* ---------------- hideout ---------------- */
G.HIDEOUT = {
  generator: { name: 'Sap Generator', desc: 'Powers the hideout. Needed by most modules.', levels: [
    { req: { rub: 40000, items: [['sapcan', 1]] }, time: 60, txt: 'Powers modules.' },
    { req: { rub: 150000, items: [['battery', 2], ['vines', 3]], lvl: 8 }, time: 180, txt: 'Better power: crafts 15% faster.' }] },
  medstation: { name: 'Medstation', desc: 'Heals you between raids.', levels: [
    { req: { rub: 30000, items: [['bandage', 2], ['aisap', 2]], mods: { generator: 1 } }, time: 60, txt: 'Out-of-raid healing x2. Unlocks med crafts.' },
    { req: { rub: 120000, items: [['sapwa', 2], ['analyzer', 1]], lvl: 6 }, time: 180, txt: 'Out-of-raid healing x4.' }] },
  nutrition: { name: 'Nutrition Unit', desc: 'Restores energy and hydration between raids.', levels: [
    { req: { rub: 25000, items: [['sapwater', 2]], mods: { generator: 1 } }, time: 60, txt: 'Food/water regen x3. Unlocks food crafts.' }] },
  workbench: { name: 'Workbench', desc: 'Craft ammunition.', levels: [
    { req: { rub: 60000, items: [['screws', 3], ['vines', 2]], mods: { generator: 1 } }, time: 90, txt: 'Unlocks ammo crafts.' },
    { req: { rub: 200000, items: [['gunpowder', 2], ['ducttape', 2]], lvl: 10 }, time: 240, txt: 'Unlocks AP ammo crafts.' }] },
  stash: { name: 'Stash', desc: 'Bigger stash.', levels: [
    { req: { rub: 0 }, time: 0, txt: '10x28 stash.' },
    { req: { rub: 250000, lvl: 5 }, time: 120, txt: '10x40 stash.' },
    { req: { rub: 700000, items: [['acorn_gold', 1]], lvl: 15 }, time: 300, txt: '10x56 stash.' }] },
  farm: { name: 'Acorn Farm', desc: 'Grows Golden Acorns using Photosynthesis cards.', levels: [
    { req: { rub: 150000, items: [['photocard', 1]], mods: { generator: 1 }, lvl: 10 }, time: 300, txt: '1 Golden Acorn every 40 min (max 3).' },
    { req: { rub: 300000, items: [['photocard', 2]], lvl: 15 }, time: 600, txt: '1 Golden Acorn every 20 min (max 5).' }] },
};
G.STASH_ROWS = [28, 28, 40, 56];
G.CRAFTS = [
  { mod: 'workbench', lvl: 1, in: [['gunpowder', 1]], out: ['a545_ps', 120], time: 240 },
  { mod: 'workbench', lvl: 1, in: [['gunpowder', 1], ['bolts', 1]], out: ['a762_ps', 100], time: 240 },
  { mod: 'workbench', lvl: 1, in: [['screws', 2]], out: ['a12_slug', 30], time: 180 },
  { mod: 'workbench', lvl: 2, in: [['gunpowder', 2], ['vines', 1]], out: ['a545_bp', 120], time: 420 },
  { mod: 'workbench', lvl: 2, in: [['gunpowder', 2], ['screws', 2]], out: ['a762r_snb', 40], time: 480 },
  { mod: 'medstation', lvl: 1, in: [['aisap', 2], ['bandage', 1]], out: ['sapwa', 1], time: 300 },
  { mod: 'medstation', lvl: 1, in: [['lighter', 1], ['beetlejar', 1]], out: ['painkill', 2], time: 240 },
  { mod: 'medstation', lvl: 2, in: [['analyzer', 1], ['ducttape', 1]], out: ['cms', 1], time: 480 },
  { mod: 'nutrition', lvl: 1, in: [['sapwater', 2]], out: ['maple', 1], time: 180 },
  { mod: 'nutrition', lvl: 1, in: [['fertilizer', 1]], out: ['moonshine', 1], time: 900 },
];

/* ---------------- levels / skills ---------------- */
G.xpFor = l => l <= 1 ? 0 : Math.round(1000 * Math.pow(l - 1, 1.9));
G.SKILLS = {
  endurance: 'Endurance — more stamina, faster recovery',
  strength: 'Strength — carry more, throw further',
  vitality: 'Vitality — fewer bleeds and fractures',
  metabolism: 'Metabolism — slower energy/hydration drain',
  recoil: 'Recoil control — less recoil',
  search: 'Search — search containers faster',
  covert: 'Covert movement — quieter footsteps',
};
