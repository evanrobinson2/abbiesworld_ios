// The Headland (AW-STUDY-0033): a new founding place for Abbie's World, made by process, not drawn.
// Land: a limestone ridge runs out into the sea as a headland; a river valley lies west of it and opens into a bay.
// Rain soaks into the limestone and comes out as a spring where the limestone meets the valley clay. The land then
// drains, cuts its channels and is read for what it offers (soil, shelter, floods, a spring above the valley).
// Founders arrive by boat and choose the place that costs them the least walking each day and is safe: above the
// floods they can see, above the storm line, on ground that can see the sea approach, with fields close by.
// Every number is in ASSUMPTIONS; the story is the run's event log. Deterministic for a seed; no three.js, no DOM.

export const ASSUMPTIONS = {
 N: 128, cell: 25,          // 3.2 km region on a 25 m grid
 walk: 6,                   // Tobler hiking function peak, km/h
 runoff: .4,                // metres of rain a year that leave as surface flow
 recharge: .3,              // metres a year that soak into limestone and feed the spring
 upland: 38e6,              // m2 of hills north of the map draining into the river
 limestone: 30,             // metres of ridge uplift above which the rock is limestone
 party: 40,                 // founding party, by boat
 waterTrips: 6, fieldTrips: 1, boatShare: .5, // daily trips per household
 fieldsNeed: 24,            // hectares of good soil the party needs within reach
 watch: 1800,               // metres: a site must see the calm water (eye 2 m up) to watch boats come and go
 storm: 2.5                 // metres: the storm line on open shore
};
const A = ASSUMPTIONS;

export function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export function noise2(r) {
 const P = new Float32Array(65536); for (let i = 0; i < P.length; i++) P[i] = r();
 const at = (x, y) => P[(x & 255) * 256 + (y & 255)], f = t => t * t * (3 - 2 * t);
 const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = f(x - xi), v = f(y - yi);
  return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v) + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v; };
 return (x, y) => { let s = 0, a = .5, k = 1; for (let o = 0; o < 5; o++) { s += a * n(x * k + o * 17, y * k + o * 31); a *= .5; k *= 2; } return s / .97; };
}
export class Heap {
 constructor() { this.k = []; this.v = []; }
 push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
 pop() { const k = this.k, v = this.v, top = v[0]; this.key = k[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= k.length) break; if (c + 1 < k.length && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; }
 get size() { return this.k.length; }
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

// ---------- Land ----------
export function makeHeadland(seed = 3) {
 const N = A.N, r = rng(seed), fbm = noise2(r), h = new Float32Array(N * N), lime = new Float32Array(N * N);
 const ridgeX = .66 + .06 * r(), lean = .06 + .06 * r(), valleyX = .3 + .06 * r(), ix = Math.round(N * valleyX);
 for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const u = x / N, v = y / N;
  let e = 150 * (.74 - v) + 26 * (fbm(x / 28, y / 28) - .5) + 8 * (fbm(x / 7 + 40, y / 7) - .5);
  const rx = ridgeX - lean * v, up = 105 * Math.exp(-(((u - rx) / .085) ** 2)) * (.5 + .5 * (1 - v)) * (v < 1 ? 1 : 0);
  e += up + 40 * Math.max(0, v - .55) * Math.exp(-(((u - rx) / .07) ** 2)) * 3;            // the headland keeps its height out to sea
  e -= 38 * Math.exp(-(((u - valleyX - .04 * Math.sin(v * 6)) / .11) ** 2)) * (1 - .3 * v); // the river valley
  e += 46 * Math.exp(-((u / .14) ** 2)) * (1 - v);                                           // western hills
  e -= 14 * Math.exp(-(((x - ix) / 6) ** 2)) * Math.max(0, 1 - v * 2.5);                    // where the river enters
  h[y * N + x] = e; lime[y * N + x] = up;
 }
 const L = { seed, N, h, lime, inflow: ix };
 drain(L); carve(L); drain(L); describe(L);
 return L;
}
function drain(L) {
 const { N, h } = L, seen = new Uint8Array(N * N), q = new Heap();
 for (let i = 0; i < N * N; i++) if (h[i] < 0 || Math.floor(i / N) === N - 1) { seen[i] = 1; q.push(h[i], i); }
 while (q.size) { const c = q.pop(), cx = c % N, cy = (c / N) | 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const n = y * N + x; if (seen[n]) continue; seen[n] = 1; if (h[n] <= h[c] + 1e-3) h[n] = h[c] + 1e-3; q.push(h[n], n); } }
 const to = new Int32Array(N * N).fill(-1), order = Array.from({ length: N * N }, (_, i) => i).sort((a, b) => h[b] - h[a]);
 for (let c = 0; c < N * N; c++) { if (h[c] < 0) continue; const cx = c % N, cy = (c / N) | 0; let best = -1, drop = 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const n = y * N + x, d = (h[c] - h[n]) / (k < 4 ? 1 : Math.SQRT2); if (d > drop) { drop = d; best = n; } } to[c] = best; }
 const area = new Float64Array(N * N).fill(A.cell * A.cell); area[L.inflow] += A.upland;
 for (const c of order) if (to[c] >= 0) area[to[c]] += area[c];
 Object.assign(L, { to, area, order });
}
// Stream power, once: channels cut in proportion to the water they carry.
function carve(L) { const { N, h, area } = L; for (let i = 0; i < N * N; i++) if (h[i] > 0) h[i] -= Math.min(7, .012 * Math.pow(area[i] / 625, .42)); }

function describe(L) {
 const { N, h, area, to, lime } = L, n = N * N, C = A.cell;
 const Q = new Float32Array(n), river = new Uint8Array(n), slope = new Float32Array(n);
 for (let i = 0; i < n; i++) { Q[i] = area[i] * A.runoff / 31557600; if (h[i] >= 0 && Q[i] > .2) river[i] = 1; }
 for (let i = 0; i < n; i++) { const x = i % N, y = (i / N) | 0; const hx = h[Math.min(N - 1, x + 1) + y * N] - h[Math.max(0, x - 1) + y * N], hy = h[x + Math.min(N - 1, y + 1) * N] - h[x + Math.max(0, y - 1) * N]; slope[i] = Math.hypot(hx, hy) / (2 * C); }
 // Height above the nearest drainage (HAND): follow the water down until it reaches a channel.
 const above = new Float32Array(n).fill(0), chan = new Int32Array(n).fill(-1);
 for (let k = L.order.length - 1; k >= 0; k--) { const c = L.order[k]; if (h[c] < 0) { chan[c] = c; continue; } if (river[c]) chan[c] = c; else if (to[c] >= 0) chan[c] = chan[to[c]]; }
 for (let i = 0; i < n; i++) if (h[i] >= 0 && chan[i] >= 0) above[i] = h[i] - Math.max(0, h[chan[i]]);
 // The biggest flood the founders could have seen (about twenty years): stage above the channel by discharge.
 const flood = i => chan[i] >= 0 && river[chan[i]] ? .45 * Math.pow(8 * Q[chan[i]], .4) + .6 : 0;
 // Rock: limestone where the ridge rose. The spring is where limestone gives way to the valley clay, at the
 // contact cell that gathers the most limestone above it (rain that soaked in comes out at the lowest contact).
 const isLime = i => lime[i] > A.limestone && h[i] > 0;
 // Groundwater runs along the base of the limestone (its surface minus its thickness) and comes out where the base
 // meets the clay: a contact spring. Each limestone cell passes its soaked-in rain down the base's steepest slope.
 const base = i => h[i] - (lime[i] - A.limestone), gw = new Float64Array(n), exitTo = new Int32Array(n).fill(-1);
 const limeCells = []; for (let i = 0; i < n; i++) if (isLime(i)) limeCells.push(i);
 limeCells.sort((a, b) => base(b) - base(a));
 const springs = new Map();
 for (const c of limeCells) {
  gw[c] += C * C; const cx = c % N, cy = (c / N) | 0; let best = -1, drop = 0;
  for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const m = y * N + x, bm = isLime(m) ? base(m) : h[m]; const d = (base(c) - bm) / (k < 4 ? 1 : Math.SQRT2); if (d > drop) { drop = d; best = m; } }
  if (best < 0) continue;
  if (isLime(best)) gw[best] += gw[c]; else if (h[best] > 0 && !river[best]) springs.set(best, (springs.get(best) || 0) + gw[c]);
 }
 let spring = null; for (const [cell, a] of springs) if (h[cell] > 12 && (!spring || a > spring.area)) spring = { cell, area: a };
 if (spring) { spring.h = h[spring.cell]; spring.lps = spring.area * A.recharge / 31557600 * 1000; spring.x = spring.cell % N; spring.y = (spring.cell / N) | 0; }
 // Soil and cover. 0 sea, 1 forest, 2 meadow, 3 rock, 4 shore, 5 river, 6 scrub (limestone maquis)
 const cover = new Uint8Array(n), soil = new Uint8Array(n); // soil 0 none, 1 thin, 2 terra rossa, 3 alluvial, 4 clay bank
 for (let i = 0; i < n; i++) {
  if (h[i] < 0) { cover[i] = 0; continue; } if (river[i]) { cover[i] = 5; continue; }
  const s = slope[i];
  cover[i] = h[i] < 1.5 ? 4 : s > .45 ? 3 : isLime(i) ? 6 : (above[i] < 3) ? 2 : 1;
  soil[i] = s > .45 ? 0 : (above[i] < 2.5 && s < .04) ? 4 : (above[i] < 7 && s < .08) ? 3 : isLime(i) ? (s < .3 ? 2 : 1) : (s < .15 ? 2 : 1);
 }
 // Sheltered water: shore sea cells where most of 16 rays of 1 km hit land.
 const shelter = new Float32Array(n);
 for (let i = 0; i < n; i++) { if (h[i] >= 0) continue; const x0 = i % N, y0 = (i / N) | 0; let coast = false; for (let k = 0; k < 8; k++) { const x = x0 + DX[k], y = y0 + DY[k]; if (x >= 0 && y >= 0 && x < N && y < N && h[y * N + x] >= 0) coast = true; } if (!coast) continue; let hit = 0; for (let a = 0; a < 16; a++) { const ang = a * Math.PI / 8; for (let s = 1; s <= 40; s++) { const x = Math.round(x0 + Math.cos(ang) * s), y = Math.round(y0 + Math.sin(ang) * s); if (x < 0 || y < 0 || x >= N || y >= N) break; if (h[y * N + x] >= 0) { hit++; break; } } } shelter[i] = hit / 16; }
 // Prominence: how far a place stands above the ground around it (300 m), the watch it keeps over the sea.
 const prom = new Float32Array(n), R = Math.round(300 / C);
 for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (h[i] < 0) continue; let s = 0, c = 0; for (let dy = -R; dy <= R; dy += 2) for (let dx = -R; dx <= R; dx += 2) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= N || yy >= N || dx * dx + dy * dy > R * R) continue; s += Math.max(0, h[yy * N + xx]); c++; } prom[i] = h[i] - s / c; }
 Object.assign(L, { Q, river, slope, above, chan, flood, cover, soil, shelter, prom, spring, isLime });
}
export const meetsBrief = L => !!L.spring && L.spring.lps > 4 && L.spring.h > 25 && Math.max(...L.shelter) > .5 && L.river.some(Boolean);
export function findHeadland(seed = 3, tries = 60) { for (let k = 0; k < tries; k++) { const L = makeHeadland(seed + k * 7919); if (meetsBrief(L)) { L.tries = k + 1; return L; } } throw Error('No headland in ' + tries + ' tries has a spring, a river and a sheltered bay'); }

// ---------- Walking ----------
export function stepSeconds(L, a, b, diag) {
 const h = L.h; if (h[b] < 0) return Infinity;
 const d = A.cell * (diag ? Math.SQRT2 : 1), s = (h[b] - h[a]) / d;
 let t = d / (A.walk * Math.exp(-3.5 * Math.abs(s + .05)) / 3.6);
 if (L.cover[b] === 1 || L.cover[b] === 6) t *= 1.5;  // forest and maquis without a path
 if (L.river[b]) t += L.Q[b] > 1.5 ? Infinity : 90;   // wade a ford; deep water stops walkers
 return t;
}
export function walkField(L, sources) {
 const N = A.N, dist = new Float32Array(N * N).fill(Infinity), q = new Heap();
 for (const s of sources) { dist[s] = 0; q.push(0, s); }
 while (q.size) { const c = q.pop(), dc = dist[c]; if (q.key > dc) continue; const cx = c % N, cy = (c / N) | 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const m = y * N + x, nd = dc + stepSeconds(L, c, m, k >= 4); if (nd < dist[m]) { dist[m] = nd; q.push(nd, m); } } }
 return dist;
}

// ---------- Founding: where the party settles ----------
const mins = s => Math.round(s / 60);
const WHY = { steep: 'too steep to build on', flood: 'under the drift line of floods', storm: 'below the storm line', soil: 'too far from enough good soil', blind: 'out of sight of the bay' };
// Line of sight from a person standing at a (eye 2 m) to the water at b, over the land between.
export function sees(L, a, b) {
 const N = L.N, ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0, d = Math.hypot(bx - ax, by - ay);
 if (d * A.cell > A.watch) return false;
 const ha = L.h[a] + 2, hb = Math.max(0, L.h[b]);
 for (let t = 1; t < d; t++) { const f = t / d, x = Math.round(ax + (bx - ax) * f), y = Math.round(ay + (by - ay) * f); if (L.h[y * N + x] > ha + (hb - ha) * f + .5) return false; }
 return true;
}
export function chooseSite(L) {
 const { N, h } = L, n = N * N, log = [], C = A.cell;
 const sp = L.spring;
 log.push(`The land: a limestone ridge runs ${Math.round(N * C / 1000 * 10) / 10} km down to the sea and out as a headland. West of it a river carries ${L.Q[L.chan[L.inflow]] ? '' : ''}${round(maxRiverQ(L), 1)} m³ a second into a bay.`);
 log.push(`Rain soaks into the limestone and comes out as a spring ${Math.round(sp.h)} m above the sea, giving ${round(sp.lps, 1)} litres a second (${Math.round(sp.lps * 86.4)} m³ a day).`);
 // Landing: the most sheltered water, then the beach behind it.
 let bay = -1; for (let i = 0; i < n; i++) if (L.shelter[i] > (bay < 0 ? 0 : L.shelter[bay])) bay = i;
 let beach = -1, bd = 1e9; for (let i = 0; i < n; i++) { if (h[i] < 0 || L.river[i]) continue; const d = Math.hypot(i % N - bay % N, ((i / N) | 0) - ((bay / N) | 0)); if (d < bd) { bd = d; beach = i; } }
 log.push(`A party of ${A.party} comes by boat and lands on the beach behind the calmest water (sheltered on ${Math.round(L.shelter[bay] * 16)} of 16 sides).`);
 const water = [], fields = [];
 for (let i = 0; i < n; i++) { if (L.river[i] && L.Q[i] < 6) water.push(i); if (L.soil[i] >= 2 && L.soil[i] <= 3 && L.slope[i] < .12) fields.push(i); }
 water.push(sp.cell);
 const toWater = walkField(L, water), toBoat = walkField(L, [beach]);
 // Fields: walking time to reach enough good soil (the nearest fieldsNeed hectares), measured as a radius in time.
 const perHa = 10000 / (C * C), needCells = Math.ceil(A.fieldsNeed * perHa);
 const toField = walkField(L, fields);
 const reach = fieldReach(L, fields, needCells);
 const cands = [];
 for (let i = 0; i < n; i++) {
  if (h[i] < 0 || L.river[i]) continue;
  const why = [];
  if (L.slope[i] > .12) why.push('steep');
  if (L.above[i] < L.flood(i)) why.push('flood');
  if (h[i] < A.storm) why.push('storm');
  if (!(reach[i] < 1200)) why.push('soil');
  if (!why.length && !sees(L, i, bay)) why.push('blind');
  const cost = 2 * (A.waterTrips * toWater[i] + A.fieldTrips * Math.max(toField[i], reach[i] * .5) + A.boatShare * toBoat[i]);
  if (!isFinite(cost)) continue;
  cands.push({ i, cost, why });
 }
 cands.sort((a, b) => a.cost - b.cost);
 const site = cands.find(c => !c.why.length);
 const beat = []; const seen = new Set();
 for (const c of cands) { if (c === site) break; const k = c.why[0]; if (seen.has(k)) continue; seen.add(k); beat.push(c); }
 const where = c => describePlace(L, c.i);
 for (const b of beat.slice(0, 3)) log.push(`They pass over ${where(b)}: ${mins(b.cost)} minutes of walking a day per household, but it is ${b.why.map(w => WHY[w]).join(' and ')}${b.why[0] === 'flood' ? ` (floods there reach ${round(L.flood(b.i), 1)} m above the river)` : ''}.`);
 const s = site.i;
 log.push(`They settle ${where(site)}, ${Math.round(h[s])} m above the sea and ${round(L.above[s], 1)} m above the river, where each household walks ${mins(site.cost)} minutes a day for water, fields and boats.`);
 log.push(`The spring stands ${Math.round(sp.h - h[s])} m above the settlement, ${round(Math.hypot(sp.x - s % N, sp.y - ((s / N) | 0)) * C / 1000, 1)} km away: a channel could one day bring its water down by gravity.`);
 return { site: s, x: s % N, y: (s / N) | 0, cost: site.cost, beach, bay, toWater, toField, toBoat, log, beat };
}
function fieldReach(L, fields, needCells) {
 // For each cell, the walking time within which needCells of good soil lie. A cheap estimate: the time to the
 // needCells-th nearest field cell by straight distance, converted with flat walking speed and a 1.3 detour factor.
 const { N } = L, out = new Float32Array(N * N).fill(Infinity), C = A.cell, v = A.walk / 3.6 * Math.exp(-3.5 * .05);
 const grid = new Uint8Array(N * N); for (const f of fields) grid[f] = 1;
 const sum = new Int32Array((N + 1) * (N + 1));
 for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) sum[(y + 1) * (N + 1) + x + 1] = grid[y * N + x] + sum[y * (N + 1) + x + 1] + sum[(y + 1) * (N + 1) + x] - sum[y * (N + 1) + x];
 const box = (x0, y0, x1, y1) => { x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(N, x1); y1 = Math.min(N, y1); return sum[y1 * (N + 1) + x1] - sum[y0 * (N + 1) + x1] - sum[y1 * (N + 1) + x0] + sum[y0 * (N + 1) + x0]; };
 for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { if (L.h[y * N + x] < 0) continue; for (let r = 1; r < 40; r++) if (box(x - r, y - r, x + r + 1, y + r + 1) * .785 >= needCells) { out[y * N + x] = r * C * 1.3 / v; break; } }
 return out;
}
function maxRiverQ(L) { let q = 0; for (let i = 0; i < L.N * L.N; i++) if (L.river[i] && L.h[i] >= 0) q = Math.max(q, L.Q[i]); return q; }
export const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
export function describePlace(L, i) {
 const c = L.cover[i], s = L.soil[i];
 if (c === 4) return 'the beach';
 if (L.above[i] < 3 && s >= 3) return 'the river flat';
 if (L.isLime(i)) return 'the ridge';
 if (L.prom[i] > 6) return 'a knoll above the bay';
 if (L.slope[i] < .05) return 'the valley floor';
 return 'the valley side';
}
export function foundHeadland(seed = 3) { const L = findHeadland(seed); return { land: L, founding: chooseSite(L) }; }
