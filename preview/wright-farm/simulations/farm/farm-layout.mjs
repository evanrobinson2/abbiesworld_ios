// AW-STUDY-0059 The Farm: where everything stands on the farm tile. Inspired by a real community farm in Winchester (its barns, its
// farm stand, its goats, hens, bees and trails), never a map of it. Plain data, no three.js, so it runs in node tests and the page.
// Frame: x east, y north, metres on the hex (flat-top, corners east and west, circumradius R), the town's own frame. The tile sits on
// the board's open slot between Ani's side and Abbie and Daddy's side; its south and south-east edges touch those two hexes, so the lane
// comes in from the south edge.
export const R = 105, R3 = Math.sqrt(3), SC = 2.2; // SC: model scale, so a cow is about the size of a small car and a barn stands taller than a town house
export const SLOT = 'slot-300-0';
export const inHex = (x, y, r = R) => { const ax = Math.abs(x), ay = Math.abs(y); return ay <= r * R3 / 2 && ax <= r - ay / R3; };

// How much room each kind of animal gets (square metres of pen per head). One visible table; pens are sized from it.
export const ROOM = {cow: 110, horse: 130, goat: 42, sheep: 36, pig: 48, alpaca: 70};

// Models we reuse (served by the Ranch site). front: the angle the model's door or face looks, in radians from +z, so `face` can turn it.
export const MODELS = {
 barn: {url: '/models/ranch-barn-shelter-charming/model.glb', sc: SC * 1.15},
 allSeasons: {url: '/models/ranch-horse-shelter-charming/model.glb', sc: SC * 1.05},
 house: {url: '/models/ranch-family-home-charming/model.glb', sc: SC},
 stand: {url: '/models/ranch-feed-store-charming/model.glb', sc: SC * 1.1},
 coop: {url: '/models/ranch-chicken-coop-charming/model.glb', sc: SC},
 goatHouse: {url: '/models/ranch-goat-shelter-charming/model.glb', sc: SC},
 potting: {url: '/models/ranch-potting-bench-charming/model.glb', sc: SC},
 gardenBeds: {url: '/simulation-assets/buildings/kitchen-garden-complete.glb', sc: SC * 1.2},
 compost: {url: '/models/ranch-compost-bay-charming/model.glb', sc: SC},
 apple: {url: '/models/ranch-apple-tree-charming/model.glb', sc: SC * .9},
 tree: {url: '/models/ranch-tree-standing-charming/model.glb', sc: SC * 1.3},
 hayRack: {url: '/models/ranch-hay-rack-charming/model.glb', sc: SC},
 trough: {url: '/models/ranch-water-trough-charming/model.glb', sc: SC},
 sunflower: {url: '/models/ranch-sunflower-charming/model.glb', sc: SC},
 coneflower: {url: '/models/ranch-coneflower-charming/model.glb', sc: SC},
 waterPoint: {url: '/models/ranch-water-point-charming/model.glb', sc: SC * .8},
 edging: {url: '/models/ranch-stone-edging-charming/model.glb', sc: SC},
 tractor: {url: '/simulation-assets/generated/kit-farm-tractor.glb', sc: SC * 1.1},
 hay: {url: '/simulation-assets/generated/kit-hay-bale-stack.glb', sc: SC},
 barrow: {url: '/simulation-assets/generated/kit-wheelbarrow-with-pumpkins.glb', sc: SC},
 hive: {url: '/simulation-assets/generated/kit-beehive-box-on-stand.glb', sc: SC},
 well: {url: '/simulation-assets/generated/kit-stone-well-with-roof-and-bucket.glb', sc: SC * 1.1},
 barrel: {url: '/simulation-assets/atelier/rain-barrel.glb', sc: SC, lift: .45},
 crates: {url: '/simulation-assets/atelier/crate-stack.glb', sc: SC},
 sheep: {url: '/tile-game-assets/bronze-age-world/upland-pasture/outputs/assets/UP-006.glb', sc: SC * 1.15},
 dog: {url: '/domestic-assets/UP-007.glb', sc: SC * 1.2},
 cat: {url: '/domestic-assets/GF-171.glb', sc: SC * 1.3},
 cow: {url: '/simulation-assets/organics/cow-idle.glb', sc: SC},
 goat: {url: '/simulation-assets/organics/goat-idle.glb', sc: SC},
 chicken: {url: '/simulation-assets/organics/chicken-idle.glb', sc: SC},
 horse: {url: '/simulation-assets/organics/horse-idle.glb', sc: SC}
};

// Buildings and props: {id, m: MODELS key, x, y, face (look toward this point) or rot, r: footprint radius for the layout, name}.
const YARD = [0, -4];
export const PLACES = [
 {id: 'barn', m: 'barn', x: -32, y: 12, face: YARD, r: 11, name: 'The old red barn', spot: 'barn'},
 {id: 'allSeasons', m: 'allSeasons', x: 34, y: 16, face: YARD, r: 11, name: 'The all-seasons barn'},
 {id: 'house', m: 'house', x: 2, y: 50, face: [2, 0], r: 11, name: 'The farmhouse'},
 {id: 'stand', m: 'stand', x: 33, y: -34, face: [0, -34], r: 6, name: 'The farm stand', spot: 'farm'},
 {id: 'well', m: 'well', x: 0, y: -4, rot: 0, r: 4, name: 'The yard well'},
 {id: 'tractor', m: 'tractor', x: -20, y: -26, rot: .5, r: 5, name: 'The old tractor'},
 {id: 'hay1', m: 'hay', x: -48, y: 2, rot: 1.2, r: 3.5, name: 'Hay bales'},
 {id: 'hay2', m: 'hay', x: -52, y: 10, rot: .2, r: 3.5, name: 'Hay bales'},
 {id: 'crates', m: 'crates', x: 25, y: -39, rot: .3, r: 2.5, name: 'Egg and apple crates'},
 {id: 'barrow', m: 'barrow', x: 40, y: -28, rot: 2.2, r: 3, name: 'Wheelbarrow of pumpkins'},
 {id: 'barrel', m: 'barrel', x: 14, y: 44, rot: 0, r: 2, name: 'Rain barrel'},
 {id: 'coop', m: 'coop', x: -64, y: 24, face: [-40, 10], r: 8, name: 'The henhouse'},
 {id: 'goatHouse', m: 'goatHouse', x: 60, y: 60, face: [54, 50], r: 7, name: 'The goat house'},
 {id: 'potting', m: 'potting', x: -22, y: -46, face: [-40, -40], r: 4, name: 'The potting bench'},
 {id: 'compost', m: 'compost', x: -22, y: -58, face: [-40, -50], r: 4, name: 'The compost bay'},
 {id: 'beds1', m: 'gardenBeds', x: -46, y: -34, rot: 0, r: 5.5, name: 'Vegetable beds'},
 {id: 'beds2', m: 'gardenBeds', x: -46, y: -50, rot: 0, r: 5.5, name: 'Vegetable beds'},
 {id: 'beds3', m: 'gardenBeds', x: -60, y: -42, rot: Math.PI / 2, r: 5.5, name: 'Vegetable beds'},
 {id: 'pumpkinPatch', m: null, x: 42, y: 72, r: 12, name: 'The pumpkin patch'},
 {id: 'hive1', m: 'hive', x: -14, y: 66, rot: .3, r: 2.5, name: 'Beehive'},
 {id: 'hive2', m: 'hive', x: -9, y: 70, rot: -.2, r: 2.5, name: 'Beehive'},
 {id: 'hive3', m: 'hive', x: -19, y: 71, rot: .6, r: 2.5, name: 'Beehive'},
 {id: 'troughCows', m: 'trough', x: 62, y: 12, rot: 0, r: 3, name: 'Water trough'},
 {id: 'rackCows', m: 'hayRack', x: 74, y: 8, rot: -Math.PI / 2, r: 3, name: 'Hay rack'},
 {id: 'troughGoats', m: 'trough', x: 58, y: 45, rot: 0, r: 3, name: 'Water trough'},
 {id: 'troughPigs', m: 'trough', x: 42, y: -58, rot: 0, r: 3, name: 'Pig trough'},
 {id: 'troughSheep', m: 'trough', x: -30, y: -72, rot: 0, r: 3, name: 'Water trough'},
 {id: 'troughAlpacas', m: 'trough', x: -56, y: 56, rot: Math.PI / 2, r: 3, name: 'Water trough'},
 {id: 'waterPoint', m: 'waterPoint', x: 18, y: -6, rot: .4, r: 3, name: 'The hand pump'}
];

// Pens: fenced paddocks sized from the ROOM table. kind 'rect' {cx, cy, w, h}, gate: which side the gate is on ('n','s','e','w').
const pen = (id, species, count, cx, cy, ratio, gate) => { const area = Math.max(count * ROOM[species] * 1.5, 260), h = Math.sqrt(area / ratio), w = h * ratio; return {id, species, count, cx, cy, w: +w.toFixed(1), h: +h.toFixed(1), gate}; };
export const PENS = [
 pen('cows', 'cow', 5, 64, -2, .6, 'w'), // cows and horses share the big east pasture
 pen('goats', 'goat', 5, 54, 50, 1.15, 's'),
 pen('pigs', 'pig', 3, 38, -62, 1.3, 'n'),
 pen('sheep', 'sheep', 5, -36, -72, 2.2, 'n'),
 pen('alpacas', 'alpaca', 2, -52, 52, 1, 'e')
];
export const HORSES = {pen: 'cows', count: 2};
// Where animals live outside a pen: free-range hens, ducks on the pond, rabbits in the garden, the dog and cat everywhere.
export const FREE = {
 chickens: {count: 9, cx: -56, cy: 14, r: 20},
 ducks: {count: 6, cx: -70, cy: -10},
 rabbits: {count: 4, cx: -44, cy: -42, r: 12},
 dog: {count: 1}, cat: {count: 1}
};
export const POND = {cx: -70, cy: -10, rx: 17, ry: 11};
export const GATE = {x: 0, y: -R * R3 / 2}; // where the lane meets the tile edge
export const LANE = [[0, -90], [0, -70], [3, -46], [2, -26], [0, -4]]; // gravel from the south edge to the well
export const TRAIL = [[-82, -12], [-86, 20], [-76, 46], [-62, 72], [-30, 84], [8, 84], [40, 82], [68, 70], [80, 38], [84, 4], [78, -30], [70, -54], [56, -72], [30, -84], [6, -86]];
export const PARKING = {x: 16, y: -66, w: 18, h: 8}; // the buggy parks here (kart mode)
export const ORCHARD = {cx: 22, cy: 72, n: 8};
export const MEADOW = {cx: -22, cy: 78, r: 12}; // pick-your-own flowers

// Things to pick up (walk-up taps, and the buggy driving over them in kart mode). id, kind, x, y.
export const PICKUPS = [
 ...[[-66, 20], [-60, 28], [-70, 30]].map((p, i) => ({id: 'egg' + i, kind: 'egg', x: p[0], y: p[1]})),
 ...[[34, 66], [44, 78], [52, 68], [38, 80]].map((p, i) => ({id: 'pumpkin' + i, kind: 'pumpkin', x: p[0], y: p[1]})),
 ...[[14, 66], [24, 76], [30, 64]].map((p, i) => ({id: 'apple' + i, kind: 'apple', x: p[0], y: p[1]})),
 {id: 'honey0', kind: 'honey', x: -12, y: 60}
];

// Everything that takes ground, for keeping trees and flowers out of the way.
export function footprints() {
 const out = PLACES.map(p => ({x: p.x, y: p.y, r: p.r + 1.5}));
 for (const p of PENS) out.push({x: p.cx, y: p.cy, r: Math.hypot(p.w, p.h) / 2 + 2, rect: p});
 out.push({x: POND.cx, y: POND.cy, r: POND.rx + 3});
 out.push({x: PARKING.x, y: PARKING.y, r: 11});
 return out;
}
export const nearLane = (x, y, w = 6) => { for (let i = 1; i < LANE.length; i++) { const [ax, ay] = LANE[i - 1], [bx, by] = LANE[i], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); if (Math.hypot(x - ax - dx * t, y - ay - dy * t) < w) return true; } return false; };
export const inPen = (p, x, y, pad = 0) => Math.abs(x - p.cx) < p.w / 2 - pad && Math.abs(y - p.cy) < p.h / 2 - pad;
export const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// Trees on the rim, the woods the trail runs through: every spot outside the working farm and inside the tile.
export function woods(seed = 11, n = 70) {
 const r = rng(seed), fp = footprints(), out = []; let guard = 0;
 while (out.length < n && guard++ < 4000) {
  const x = (r() - .5) * 2 * R, y = (r() - .5) * 2 * R * R3 / 2; if (!inHex(x, y, R * .93)) continue;
  const edge = Math.max(Math.abs(y) * 2 / (R * R3), (Math.abs(x) + Math.abs(y) / R3) / R); if (edge < .72) continue; // only on the rim
  if (fp.some(f => Math.hypot(f.x - x, f.y - y) < f.r + 4) || nearLane(x, y, 8)) continue;
  if (TRAIL.some(([tx, ty]) => Math.hypot(tx - x, ty - y) < 7)) continue;
  if (out.some(t => Math.hypot(t.x - x, t.y - y) < 9)) continue;
  out.push({x, y, s: .8 + r() * .7, rot: r() * 6.28});
 }
 return out;
}
