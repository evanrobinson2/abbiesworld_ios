// Kart mode, the track stencil (AW-STUDY-0055). Pure functions, no three.js, so the same code runs in the page and in node tests.
// Board metres: x east, y north, the middle hex at (0, 0), hex side = board.hexSide. A board is the AbbieTown.board shape
// (hexes[{id}], heightAt(x, y), tileAt(x, y), optional slots / centreOf); the hex city thread owns the real one and kart mode only
// reads it. The track is a decal on that ground: it follows heightAt exactly, so the town's terrain stays the only terrain.
import {hexCentre} from '../effect-hunt/effects.mjs';

export const R3 = Math.sqrt(3);
const ZONES = {downtown: 'downtown', 'depot-river': 'downtown', 'reservoir-hills': 'downtown', neighbourhood: 'anis-side', 'anis-side': 'anis-side', 'abbie-daddy-side': 'abbie-daddy-side', 'gingerbread-hill': 'abbie-daddy-side'};
export const polar = (R, bearing, k = R3) => ({x: Math.sin(bearing * Math.PI / 180) * R * k, y: Math.cos(bearing * Math.PI / 180) * R * k});
export const inHex = (x, y, R) => { const ax = Math.abs(x), ay = Math.abs(y); return ay <= R * R3 / 2 && ax <= R - ay / R3; }; // flat-top, corners east and west
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const seeded = (seed = 7) => { let s = (seed >>> 0) % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
export const hashOf = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };

// The twelve slots touching the seven hexes, exactly as the town lays them out (board.slots when the board offers them).
export function boardSlots(R) {
 const o = [];
 for (let b = 0; b < 360; b += 60) { const a = polar(R, b), c = polar(R, b + 60); o.push({id: 'slot-' + b, x: a.x * 2, y: a.y * 2}, {id: 'slot-' + b + '-' + (b + 60) % 360, x: a.x + c.x, y: a.y + c.y}); }
 return o;
}

// What the track sees of a board: the seven hexes with their middles, plus any tiles placed in slots (extraIds). The key changes
// whenever the set of tiles changes, which is what makes the track rebuild itself.
export function layoutOf(board, extraIds = [], {width = TRACK.width} = {}) {
 const R = board.hexSide || 105, centre = id => (board.centreOf || hexCentre)(id);
 const hexes = board.hexes.map(h => ({id: h.id, zone: h.zone || ZONES[h.id] || 'new', ...centre(h.id)}));
 const slots = board.slots || boardSlots(R), placed = [];
 for (const id of [...extraIds].sort()) { const sl = slots.find(p => p.id === id); if (sl && !hexes.some(h => h.slot === id)) { const hx = {id: 'tile:' + id, slot: id, zone: 'new', extra: true, x: sl.x, y: sl.y}; hexes.push(hx); placed.push(hx); } }
 const obstacles = board.obstaclesNear ? board.obstaclesNear(0, 0, 1e5) : []; // the town's houses and trees: the track threads between them
 const L = {R, hexes, placed, width, obstacles, key: hexes.map(h => h.id).sort().join('|') + '@' + width + '#' + obstacles.length, heightAt: board.heightAt, board};
 L.hexAt = (x, y) => { for (const h of hexes) if (inHex(x - h.x, y - h.y, R)) return h; return null; };
 L.onBoard = (x, y) => !!L.hexAt(x, y);
 return L;
}

const sub = (a, b) => ({x: a.x - b.x, y: a.y - b.y}), add = (a, b) => ({x: a.x + b.x, y: a.y + b.y}), mul = (a, k) => ({x: a.x * k, y: a.y * k});
const len = a => Math.hypot(a.x, a.y), unit = a => { const l = len(a) || 1; return {x: a.x / l, y: a.y / l}; }, perp = a => ({x: -a.y, y: a.x});
const mid = (a, b) => mul(add(a, b), .5);

// Plans the loop. The outer six hexes make the ring; the middle hex (Main Street) becomes a dirt shortcut that cuts across;
// every new tile in a slot becomes a bulge or a hairpin on the ring. So the track re-draws itself whenever the board changes.
export function planLoop(L) {
 const R = L.R, ring = L.hexes.filter(h => !h.extra && h.id !== 'downtown').map(h => ({...h, a: Math.atan2(h.x, h.y)})).sort((p, q) => p.a - q.a);
 const mids = ring.map((h, i) => mid(h, ring[(i + 1) % ring.length]));
 const extras = L.hexes.filter(h => h.extra), used = new Set(), n = ring.length;
 const between = i => extras.find(e => !used.has(e.id) && /slot-\d+-\d+/.test(e.slot) && len(sub(e, mids[i])) < R * 1.8 && len(sub(e, ring[i])) < R * 2.1 && len(sub(e, ring[(i + 1) % n])) < R * 2.1);
 const corner = i => extras.find(e => !used.has(e.id) && /^slot-\d+$/.test(e.slot) && len(sub(e, ring[i])) < R * 1.9);
 const pts = [], gates = [];
 ring.forEach((h, i) => {
  const out = unit(h), swing = (i % 2 ? -1 : 1) * R * .26, c = add(h, mul(out, swing)), sp = corner(i);
  const next = ring[(i + 1) % n], tan = unit(sub(next, ring[(i + n - 1) % n]));
  if (sp) {
   used.add(sp.id);
   pts.push(add(add(h, mul(out, R * .5)), mul(tan, -R * .4)), add(add(sp, mul(out, -R * .1)), mul(tan, -R * .36)), add(sp, mul(out, R * .42)), add(add(sp, mul(out, -R * .1)), mul(tan, R * .36)), add(add(h, mul(out, R * .5)), mul(tan, R * .4)));
   gates.push({i, at: add(h, mul(out, R * .5)), hex: h.id});
  } else { pts.push(c); gates.push({i, at: c, hex: h.id}); }
  const bt = between(i);
  if (bt) {
   used.add(bt.id);
   const m = mids[i], d = sub(bt, m), t = unit(sub(next, h));
   pts.push(add(add(m, mul(d, .5)), mul(t, -R * .5)), add(bt, mul(t, -R * .15)), add(add(m, mul(d, .5)), mul(t, R * .5)));
  } else pts.push(mids[i]);
 });
 const shortcut = [gates[0].at, {x: 0, y: 0}, gates[3 % n].at];
 return {ring: ring.map(h => h.id), points: pts, gates, shortcut, spurs: extras.filter(e => used.has(e.id)).map(e => e.slot), unused: extras.filter(e => !used.has(e.id)).map(e => e.slot)};
}

// Centripetal-ish Catmull-Rom through the points, sampled every `step` metres. Returns [{x, y, tx, ty, s}] and total length.
export function sampleCurve(points, closed, step = 3) {
 const n = points.length, P = i => closed ? points[(i % n + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
 const raw = [], segs = closed ? n : n - 1;
 for (let i = 0; i < segs; i++) {
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2), chord = len(sub(p2, p1)), k = Math.max(4, Math.ceil(chord / 1.5));
  for (let j = 0; j < k; j++) {
   const t = j / k, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
   raw.push({x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y)});
  }
 }
 if (!closed) raw.push({...points[n - 1]});
 const out = []; let s = 0, next = 0;
 for (let i = 0; i < raw.length; i++) {
  const a = raw[i], b = raw[closed ? (i + 1) % raw.length : Math.min(i + 1, raw.length - 1)];
  if (i > 0) s += len(sub(a, raw[i - 1]));
  if (s >= next || i === 0) { const t = unit(sub(b, a)); out.push({x: a.x, y: a.y, tx: t.x, ty: t.y, s}); next = s + step; }
 }
 const total = s + (closed ? len(sub(raw[0], raw[raw.length - 1])) : 0);
 return {samples: out, length: total, closed};
}

// Spatial hash of samples for nearest-point queries.
export function indexSamples(samples, cell = 12) {
 const map = new Map(), key = (cx, cy) => cx * 73856093 ^ cy * 19349663;
 samples.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell)); (map.get(k) || map.set(k, []).get(k)).push(i); });
 return (x, y, reach = 2) => {
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell); let best = -1, bd = Infinity;
  for (let a = -reach; a <= reach; a++) for (let b = -reach; b <= reach; b++) for (const i of map.get(key(cx + a, cy + b)) || []) { const d = (samples[i].x - x) ** 2 + (samples[i].y - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return best < 0 ? null : {i: best, d: Math.sqrt(bd)};
 };
}

export const TRACK = {width: 16, shortcutWidth: 9};

// ---- threading between obstacles (houses and trees from board.obstaclesNear)
const OC = 24, okey = (x, y) => Math.floor(x / OC) * 100003 + Math.floor(y / OC);
function obstacleGrid(list) { const g = new Map(); for (const o of list) { const k = okey(o.x, o.y); (g.get(k) || g.set(k, []).get(k)).push(o); } return g; }
function near(g, x, y, reach) { const out = [], c = Math.ceil(reach / OC) + 1; for (let a = -c; a <= c; a++) for (let b = -c; b <= c; b++) for (const o of g.get(okey(x + a * OC, y + b * OC)) || []) out.push(o); return out; }
function relax(pts, closed, width, grid, L) {
 const n = pts.length, P = pts.map(p => ({...p})), keep = closed ? [] : [0, n - 1];
 for (let it = 0; it < 40; it++) for (let i = 0; i < n; i++) {
  if (keep.includes(i)) continue; const p = P[i], was = {x: p.x, y: p.y};
  for (const o of near(grid, p.x, p.y, 14 + width)) { const d = Math.hypot(p.x - o.x, p.y - o.y), need = o.r + width / 2 + 1.5; if (d < need) { const k = (need - d) * .6 / (d || 1); p.x += (p.x - o.x) * k + (d ? 0 : .5); p.y += (p.y - o.y) * k; } }
  const a = P[(i + n - 1) % n], b = P[(i + 1) % n]; p.x += ((a.x + b.x) / 2 - p.x) * .2; p.y += ((a.y + b.y) / 2 - p.y) * .2;
  if (!L.onBoard(p.x, p.y)) { p.x = was.x; p.y = was.y; }
 }
 return P;
}

// Builds the whole track in slices so it can run in the background. Drive it with runLazily(). The result is plain data: samples,
// surfaceAt, props, ramps, gates. Nothing here draws; kart.mjs turns it into meshes.
export function* buildTrack(L) {
 const seed = hashOf(L.key), r = seeded(seed), t0 = Date.now(), W = L.width ?? TRACK.width;
 const plan = planLoop(L); yield 'planned';
 let main = sampleCurve(plan.points, true, 3), cut = sampleCurve(plan.shortcut, false, 3);
 if (L.obstacles.length) { // thread the road between the town's houses: push points off anything in the lane, then re-fit the curve
  const grid = obstacleGrid(L.obstacles);
  main = sampleCurve(relax(main.samples.filter((_, i) => i % 2 === 0).map(p => ({x: p.x, y: p.y})), true, W, grid, L), true, 3);
  cut = sampleCurve(relax(cut.samples.filter((_, i) => i % 2 === 0 || i === cut.samples.length - 1).map(p => ({x: p.x, y: p.y})), false, TRACK.shortcutWidth, grid, L), false, 3);
 }
 yield 'curve';
 const nearMain = indexSamples(main.samples), nearCut = indexSamples(cut.samples); yield 'indexed';
 const surfaceAt = (x, y) => {
  if (!L.onBoard(x, y)) return 'void';
  const a = nearMain(x, y, 3); if (a && a.d <= W / 2) return 'road';
  const b = nearCut(x, y, 3); if (b && b.d <= TRACK.shortcutWidth / 2) return 'dirt';
  return a && a.d < W / 2 + 3 ? 'verge' : 'grass';
 };
 // scenery along the lane, a dressing per zone, with a few things in the lane to dodge or smash. 'hard' bounces you; 'soft' bursts.
 const KINDS = {
  downtown: [['bench', 1.4, 'hard'], ['lamp', .5, 'hard'], ['bollard', .5, 'soft'], ['cone', .6, 'soft'], ['crate', 1.1, 'soft'], ['parked', 2.2, 'hard']],
  'anis-side': [['mailbox', .5, 'soft'], ['fence', 1.6, 'soft'], ['bin', .7, 'soft'], ['hedge', 2, 'hard'], ['tree', 1.1, 'hard'], ['reeds', 1.2, 'soft']],
  'abbie-daddy-side': [['hay', 1.6, 'soft'], ['tree', 1.1, 'hard'], ['scarecrow', .7, 'soft'], ['fence', 1.6, 'soft'], ['rock', 1.4, 'hard'], ['pumpkin', .7, 'soft']],
  new: [['cone', .6, 'soft'], ['crate', 1.1, 'soft'], ['rock', 1.4, 'hard'], ['hay', 1.6, 'soft']],
 };
const og = L.obstacles.length ? obstacleGrid(L.obstacles) : null, grid2 = p => og && near(og, p.x, p.y, 12).some(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + W / 2 + 8);
 const props = [], LANE = [['cone', .6, 'soft'], ['crate', 1.1, 'soft'], ['puddle', 3, 'puddle'], ['hay', 1.6, 'soft'], ['cone', .6, 'soft']];
 for (let i = 6; i < main.samples.length; i += 5) {
  const p = main.samples[i], hex = L.hexAt(p.x, p.y); if (!hex) continue;
  if (L.obstacles.length && grid2(p)) continue;
  const kinds = KINDS[hex.zone] || KINDS.new, nx = -p.ty, ny = p.tx, side = r() < .5 ? -1 : 1, off = W / 2 + 2.5 + r() * 9, [kind, rad, hard] = kinds[Math.floor(r() * kinds.length)];
  props.push({kind, r: rad, hard: hard === 'hard', soft: hard === 'soft', x: p.x + nx * off * side, y: p.y + ny * off * side, rot: r() * 6.28, hex: hex.id});
  if (r() < .26 && p.s > 30) { const lane = (r() - .5) * (W - 6), k = LANE[Math.floor(r() * LANE.length)]; props.push({kind: k[0], r: k[1], hard: false, soft: k[2] === 'soft', puddle: k[2] === 'puddle', x: p.x + nx * lane, y: p.y + ny * lane, rot: r() * 6.28, hex: hex.id, inLane: true}); }
  if (i % 40 === 6) yield 'props';
 }
 props.push({kind: 'fountain', r: 3.4, hard: true, soft: false, x: 14, y: 12, rot: 0, hex: 'downtown'}); // the town square: bounce off it
 // ramps and boost pads: one of each on the shortcut, four more round the ring
 const ramps = [], at = (c, f) => c.samples[Math.floor(c.samples.length * f) % c.samples.length], rp = (p, pad) => ({x: p.x, y: p.y, tx: p.tx, ty: p.ty, pad, cool: 0});
 ramps.push(rp(at(cut, .3), false), rp(at(cut, .72), true));
 for (let k = 1; k <= 4; k++) ramps.push(rp(at(main, k / 5), k % 2 === 1));
 yield 'ramps';
 const gateSamples = plan.gates.map(g => { const i = nearMain(g.at.x, g.at.y, 4); return {...g, s: i ? main.samples[i.i].s : 0, idx: i ? i.i : 0}; });
 const start = main.samples[Math.max(0, gateSamples[0].idx - 8)];
 return {key: L.key, L, plan, main, cut, surfaceAt, nearMain, nearCut, props, ramps, gates: gateSamples, start, width: W, shortcutWidth: TRACK.shortcutWidth, ms: Date.now() - t0};
}

// Drives a generator in time-boxed slices (the lazy background build). Returns a promise.
export function runLazily(gen, {budget = 6, schedule = f => (typeof requestIdleCallback === 'function' ? requestIdleCallback(f, {timeout: 200}) : setTimeout(f, 0)), now = () => Date.now()} = {}) {
 return new Promise(resolve => {
  const tick = () => { const t = now(); let step; do { step = gen.next(); if (step.done) return resolve(step.value); } while (now() - t < budget); schedule(tick); };
  schedule(tick);
 });
}
