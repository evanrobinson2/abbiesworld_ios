// City founding simulation (docs/oracle/city/FOUNDING.md). Land first: terrain, drainage, two rivers and the sea.
// Then people: a founding party with needs (water, food, fuel, safety) chooses the least-effort site, and the town
// grows year by year from food, births, deaths, migration, paths worn by walking, and shared works built when the
// need is measured. The story is this run's event log: every sentence is a fact the simulation produced.
// Deterministic for a seed. No three.js and no DOM, so it runs headless (node) and in the browser.

export const ASSUMPTIONS = {
 cell: 20,                  // metres per grid cell; the region is N x cell metres square
 N: 160,                    // 3.2 km region: the town and the land that feeds it
 walk: 6,                   // Tobler hiking function peak, km/h
 grainPerPerson: 250,       // kg of grain a person eats in a year
 grainYield: 600,           // kg per hectare per year after seed, on good alluvial soil
 fallow: 1.5,               // three-field rotation: a third lies fallow
 clearPerHousehold: 0.4,    // hectares of forest a household can clear in a year
 fishFeeds: 10,             // people one fishing household feeds
 householdSize: 5,          // pre-industrial household
 birth: .038, death: .028,  // crude rates per person per year
 party: 30,                 // founding party
 runoff: .45,               // metres of rain that becomes river flow per year
 upland: [70e6, 42e6]       // m2 of hills beyond the map that drain into the two rivers
};
const A = ASSUMPTIONS;

function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function noise2(r) {
 const P = new Float32Array(65536); for (let i = 0; i < P.length; i++) P[i] = r();
 const at = (x, y) => P[(x & 255) * 256 + (y & 255)], f = t => t * t * (3 - 2 * t);
 const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = f(x - xi), v = f(y - yi);
  return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v) + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v; };
 return (x, y) => { let s = 0, a = .5, k = 1; for (let o = 0; o < 5; o++) { s += a * n(x * k + o * 17, y * k + o * 31); a *= .5; k *= 2; } return s / .97; };
}
class Heap {
 constructor() { this.k = []; this.v = []; }
 push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
 pop() { const k = this.k, v = this.v, top = v[0]; this.key = k[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= k.length) break; if (c + 1 < k.length && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; }
 get size() { return this.k.length; }
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

// ---------- Land ----------
export function makeLand(seed) {
 const N = A.N, r = rng(seed), fbm = noise2(r), h = new Float32Array(N * N);
 const ridge = N * (.42 + .16 * r()), inflow = [Math.round(ridge - N * (.2 + .06 * r())), Math.round(ridge + N * (.2 + .06 * r()))];
 for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const v = y / N, u = (x - ridge) / N;
  let e = 60 * (.82 - v) + 24 * (fbm(x / 34, y / 34) - .5) + 9 * (fbm(x / 9 + 40, y / 9) - .5);
  e += 34 * Math.max(0, 1 - v / .48) * Math.exp(-(((x - ridge) / (N * .1)) ** 2)); // the hills between the two rivers
  e += 240 * u * u * Math.min(1, v * 1.6);                                       // the valleys funnel toward one estuary
  for (const ix of inflow) e -= 14 * Math.exp(-(((x - ix) / 7) ** 2)) * Math.max(0, 1 - v * 2.2); // where the rivers enter
  h[y * N + x] = e;
 }
 const land = { seed, N, h, inflow, ridge };
 drain(land); carve(land); drain(land); describe(land);
 return land;
}
// Priority flood from the sea: fill pits so every cell drains, then steepest descent and flow accumulation.
function drain(L) {
 const { N, h } = L, seen = new Uint8Array(N * N), q = new Heap();
 for (let i = 0; i < N * N; i++) if (h[i] < 0 || Math.floor(i / N) === N - 1) { seen[i] = 1; q.push(h[i], i); }
 while (q.size) { const c = q.pop(), cx = c % N, cy = (c / N) | 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const n = y * N + x; if (seen[n]) continue; seen[n] = 1; if (h[n] <= h[c] + 1e-3) h[n] = h[c] + 1e-3; q.push(h[n], n); } }
 const to = new Int32Array(N * N).fill(-1), order = Array.from({ length: N * N }, (_, i) => i).sort((a, b) => h[b] - h[a]);
 for (let c = 0; c < N * N; c++) { if (h[c] < 0) continue; const cx = c % N, cy = (c / N) | 0; let best = -1, drop = 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const n = y * N + x, d = (h[c] - h[n]) / (k < 4 ? 1 : Math.SQRT2); if (d > drop) { drop = d; best = n; } } to[c] = best; }
 const area = new Float64Array(N * N).fill(A.cell * A.cell);
 L.inflow.forEach((ix, i) => { area[ix] += A.upland[i]; });
 for (const c of order) if (to[c] >= 0) area[to[c]] += area[c];
 Object.assign(L, { to, area, order });
}
// Stream power, once: channels cut into the land in proportion to the water they carry.
function carve(L) { const { N, h, area } = L; for (let i = 0; i < N * N; i++) if (h[i] > 0) h[i] -= Math.min(6, .012 * Math.pow(area[i] / 400, .42)); }
function describe(L) {
 const { N, h, area, to } = L, n = N * N, cellA = A.cell * A.cell;
 const Q = new Float32Array(n), river = new Uint8Array(n), slope = new Float32Array(n);
 for (let i = 0; i < n; i++) { Q[i] = area[i] * A.runoff / 31557600; if (h[i] >= 0 && Q[i] > .25) river[i] = 1; }
 for (let i = 0; i < n; i++) { const x = i % N, y = (i / N) | 0; const hx = h[Math.min(N - 1, x + 1) + y * N] - h[Math.max(0, x - 1) + y * N], hy = h[x + Math.min(N - 1, y + 1) * N] - h[x + Math.max(0, y - 1) * N]; slope[i] = Math.hypot(hx, hy) / (2 * A.cell); }
 // Hydraulic geometry (Leopold and Maddock): width and depth grow with discharge.
 const width = i => 7 * Math.sqrt(Q[i]), depth = i => .4 * Math.pow(Q[i], .35);
 // Brackish reach: river cells within 600 m (along the channel) of the sea and less than 2 m above it.
 const toSea = new Float32Array(n).fill(Infinity);
 for (let k = L.order.length - 1; k >= 0; k--) { const c = L.order[k]; if (h[c] < 0) toSea[c] = 0; else if (to[c] >= 0) toSea[c] = toSea[to[c]] + A.cell; }
 const brackish = new Uint8Array(n); for (let i = 0; i < n; i++) if (river[i] && toSea[i] < 600 && h[i] < 2) brackish[i] = 1;
 // Height above the nearest channel, the measure a flood is judged by.
 const near = new Int32Array(n).fill(-1), q = []; for (let i = 0; i < n; i++) if (river[i]) { near[i] = i; q.push(i); }
 for (let qi = 0; qi < q.length; qi++) { const c = q[qi], cx = c % N, cy = (c / N) | 0; for (let k = 0; k < 4; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const m = y * N + x; if (near[m] < 0 && h[m] >= 0) { near[m] = near[c]; q.push(m); } } }
 const above = new Float32Array(n).fill(99), riverDist = new Float32Array(n).fill(9999);
 for (let i = 0; i < n; i++) if (near[i] >= 0) { above[i] = h[i] - h[near[i]]; riverDist[i] = Math.hypot(i % N - near[i] % N, ((i / N) | 0) - ((near[i] / N) | 0)) * A.cell; }
 // Land cover: wet meadow on the floodplain, forest elsewhere, bare rock on steep ground, shingle at the shore.
 const cover = new Uint8Array(n); // 0 sea, 1 forest, 2 meadow, 3 rock, 4 shore, 5 river, 6 field
 const fertile = new Float32Array(n);
 for (let i = 0; i < n; i++) {
  if (h[i] < 0) { cover[i] = 0; continue; } if (river[i]) { cover[i] = 5; continue; }
  cover[i] = h[i] < 1.2 ? 4 : slope[i] > .35 ? 3 : (above[i] < 3 && riverDist[i] < 260) ? 2 : 1;
  if (slope[i] < .09 && cover[i] !== 4 && cover[i] !== 3) fertile[i] = (above[i] < 5 && riverDist[i] < 320) ? 1 : slope[i] < .05 ? .7 : .5;
 }
 // Sheltered water: sea cells next to land, where most of 16 rays of 1 km hit land within reach.
 const shelter = new Float32Array(n);
 for (let i = 0; i < n; i++) { if (h[i] >= 0) continue; const x0 = i % N, y0 = (i / N) | 0; let coast = false; for (let k = 0; k < 8; k++) { const x = x0 + DX[k], y = y0 + DY[k]; if (x >= 0 && y >= 0 && x < N && y < N && h[y * N + x] >= 0) coast = true; } if (!coast) continue; let hit = 0; for (let a = 0; a < 16; a++) { const ang = a * Math.PI / 8; for (let s = 1; s <= 50; s++) { const x = Math.round(x0 + Math.cos(ang) * s), y = Math.round(y0 + Math.sin(ang) * s); if (x < 0 || y < 0 || x >= N) break; if (y >= N) break; if (h[y * N + x] >= 0) { hit++; break; } } } shelter[i] = hit / 16; }
 Object.assign(L, { Q, river, slope, width, depth, brackish, toSea, above, riverDist, cover, fertile, shelter });
 L.confluence = findConfluence(L);
}
function findConfluence(L) {
 const { N, river, to, Q, toSea } = L, n = N * N, big = new Float32Array(n);
 // A confluence: a river cell fed by two channels that each carry at least a third of a cubic metre a second.
 const donors = Array.from({ length: n }, () => []);
 for (let i = 0; i < n; i++) if (river[i] && to[i] >= 0) donors[to[i]].push(i);
 let best = null;
 for (let i = 0; i < n; i++) { const d = donors[i].filter(j => Q[j] > .33).sort((a, b) => Q[b] - Q[a]); if (d.length < 2) continue; const score = Q[d[1]]; if (!best || score > best.score) best = { cell: i, score, arms: [d[0], d[1]], Q: Q[i], toSea: toSea[i] }; }
 return best;
}
// The brief: two rivers that meet, and the sea close below the meeting.
export const meetsBrief = L => !!L.confluence && L.confluence.score > .4 && L.confluence.toSea > 200 && L.confluence.toSea < 1600;
export function findLand(seed, tries = 80) { for (let k = 0; k < tries; k++) { const L = makeLand(seed + k * 7919); if (meetsBrief(L)) { L.tries = k + 1; return L; } } throw Error('No land in ' + tries + ' tries has two rivers meeting near the sea'); }

// ---------- Movement ----------
// Seconds to step from a to b: Tobler's hiking speed, slower in forest without a path, a wade across a ford,
// a bridge where one stands, faster on worn paths. The sea and deep or brackish channels stop walkers.
function stepCost(T, a, b, diag) {
 const L = T.land, h = L.h; if (h[b] < 0) return Infinity;
 const d = A.cell * (diag ? Math.SQRT2 : 1), s = (h[b] - h[a]) / d;
 let v = A.walk * Math.exp(-3.5 * Math.abs(s + .05)) / 3.6;
 const worn = T.traffic[b];
 if (L.cover[b] === 1 && worn < 6) v *= .6;
 v *= 1 + .6 * Math.min(1, worn / 30);
 let t = d / v;
 if (L.river[b] && !T.bridge[b]) { if (L.brackish[b] || L.depth(b) > .9) return Infinity; t += 90; }
 return t;
}
function dijkstra(T, sources, limit = Infinity) {
 const N = A.N, dist = new Float32Array(N * N).fill(Infinity), q = new Heap();
 for (const s of sources) { dist[s] = 0; q.push(0, s); }
 while (q.size) { const c = q.pop(), dc = dist[c]; if (q.key > dc) continue; if (dc > limit) break; const cx = c % N, cy = (c / N) | 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const m = y * N + x, nd = dc + stepCost(T, c, m, k >= 4); if (nd < dist[m]) { dist[m] = nd; q.push(nd, m); } } }
 return dist;
}
let G, P, S, stamp = 0;
function route(T, from, goal) {
 const N = A.N; if (!G) { G = new Float32Array(N * N); P = new Int32Array(N * N); S = new Uint32Array(N * N); } stamp++;
 const q = new Heap(), gx = goal % N, gy = (goal / N) | 0, vmax = 1.7, g = c => S[c] === stamp ? G[c] : Infinity;
 const hgt = c => Math.hypot(c % N - gx, ((c / N) | 0) - gy) * A.cell / vmax;
 G[from] = 0; S[from] = stamp; P[from] = -1; q.push(hgt(from), from); let steps = 0, found = false;
 while (q.size && steps++ < 30000) { const c = q.pop(); if (c === goal) { found = true; break; } if (q.key > G[c] + hgt(c) + 1e-3) continue; const gc = G[c], cx = c % N, cy = (c / N) | 0; for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const m = y * N + x, nd = gc + stepCost(T, c, m, k >= 4); if (nd < g(m)) { G[m] = nd; S[m] = stamp; P[m] = c; q.push(nd + hgt(m), m); } } }
 if (!found) return null; const path = [goal]; while (path[path.length - 1] !== from) path.push(P[path[path.length - 1]]); return path.reverse();
}

// ---------- People ----------
const mins = s => Math.round(s / 60), m = c => c * A.cell;
export function found(L, { maxYears = 400, target = 1000, onYear } = {}) {
 const N = A.N, n = N * N, r = rng(L.seed ^ 0x5eed), log = [];
 const baseCover = L.cover.slice(), T = { land: L, traffic: new Float32Array(n), bridge: new Uint8Array(n) };
 const say = (year, kind, text, at) => log.push({ year, kind, text, at });
 const gumbel = () => -Math.log(-Math.log(Math.max(1e-9, r())));
 const floodRise = () => Math.max(.3, .6 + .55 * gumbel()); // metres above the channel in the year's biggest flood
 const surge = () => Math.max(.3, .9 + .45 * gumbel());                   // metres the sea rises in the year's worst storm
 // What the founders can see: drift lines from roughly the last twenty years of floods and storms.
 let knownFlood = 0, knownSurge = 0; for (let k = 0; k < 20; k++) { knownFlood = Math.max(knownFlood, floodRise()); knownSurge = Math.max(knownSurge, surge()); }
 const C = L.confluence;
 say(0, 'land', `Two rivers come down from the hills beyond the map, carrying about ${L.Q[C.arms[0]].toFixed(1)} and ${L.Q[C.arms[1]].toFixed(1)} cubic metres of water a second. They meet ${Math.round(C.toSea)} m above the sea, and below the meeting the water turns brackish.`, C.cell);

 // Where the party lands: the beach beside the most sheltered water.
 let landing = -1, bestShelter = 0;
 for (let i = 0; i < n; i++) if (L.shelter[i] > bestShelter) { const x = i % N, y = (i / N) | 0; for (let k = 0; k < 8; k++) { const xx = x + DX[k], yy = y + DY[k]; const j = yy * N + xx; if (xx >= 0 && yy >= 0 && xx < N && yy < N && L.h[j] >= 0 && !L.river[j]) { bestShelter = L.shelter[i]; landing = j; } } }
 say(0, 'arrival', `A party of ${A.party} people comes by boat and lands on the beach behind the most sheltered water on the coast: land blocks ${Math.round(bestShelter * 16)} of 16 directions there.`, landing);

 // Daily walking each place would cost a household: water six round trips a day, the fields once,
 // firewood every other day, and the boats once for the half of households who fish.
 const isWater = i => L.river[i] && !L.brackish[i];
 const sourcesOf = f => { const s = []; for (let i = 0; i < n; i++) if (f(i)) s.push(i); return s; };
 let tWater = dijkstra(T, sourcesOf(isWater)), tField = dijkstra(T, sourcesOf(i => L.fertile[i] >= .7)), tWood = dijkstra(T, sourcesOf(i => L.cover[i] === 1));
 const boatSea = i => L.h[i] < 0 && L.shelter[i] >= .5, tBoat = dijkstra(T, sourcesOf(i => { if (L.h[i] < 0) return false; const x = i % N, y = (i / N) | 0; for (let k = 0; k < 8; k++) { const xx = x + DX[k], yy = y + DY[k]; if (xx >= 0 && yy >= 0 && xx < N && yy < N && boatSea(yy * N + xx)) return true; } return false; }));
 const sat = new Float64Array((N + 1) * (N + 1)); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) sat[(y + 1) * (N + 1) + x + 1] = L.fertile[y * N + x] * .04 + sat[y * (N + 1) + x + 1] + sat[(y + 1) * (N + 1) + x] - sat[y * (N + 1) + x];
 const fertileHaNear = (i, rad = 30) => { const x = i % N, y = (i / N) | 0, x0 = Math.max(0, x - rad), y0 = Math.max(0, y - rad), x1 = Math.min(N, x + rad + 1), y1 = Math.min(N, y + rad + 1); return sat[y1 * (N + 1) + x1] - sat[y0 * (N + 1) + x1] - sat[y1 * (N + 1) + x0] + sat[y0 * (N + 1) + x0]; };
 const needHa = p => p * A.grainPerPerson / A.grainYield * A.fallow;
 const effort = i => 2 * (6 * tWater[i] + tField[i] + tWood[i] / 2 + tBoat[i] / 2);
 const unsafe = i => L.above[i] < knownFlood + .5 ? 'flood' : L.h[i] < knownSurge + .5 ? 'storm' : L.slope[i] > .12 ? 'steep' : fertileHaNear(i) < needHa(A.party) ? 'no fields' : null;
 let site = -1, siteCost = Infinity;
 const reach = dijkstra(T, [landing], 3600);
 for (let i = 0; i < n; i++) { if (reach[i] === Infinity || L.h[i] < 0 || L.river[i] || unsafe(i)) continue; const e = effort(i); if (e < siteCost) { siteCost = e; site = i; } }
 if (site < 0) throw Error('No safe site within an hour of the landing');
 // The places they passed over, each for a measured reason.
 const passed = []; const best = (filter) => { let b = -1, c = Infinity; for (let i = 0; i < n; i++) { if (reach[i] === Infinity || L.h[i] < 0 || L.river[i] || !filter(i)) continue; const e = effort(i); if (e < c) { c = e; b = i; } } return b; };
 const low = best(i => unsafe(i) === 'flood'), shore = best(i => unsafe(i) === 'storm');
 if (low >= 0) passed.push(`the meadow by the rivers would cost only ${mins(effort(low))} minutes of walking a day, but drift lines show floods ${knownFlood.toFixed(1)} m above the channel and it sits ${Math.max(0, L.above[low]).toFixed(1)} m above`);
 if (shore >= 0) passed.push(`the beach rises only ${L.h[shore].toFixed(1)} m above the sea, and storms have thrown driftwood ${knownSurge.toFixed(1)} m up it`);
 say(0, 'founding', `They settle ${m(Math.round(Math.hypot(site % N - C.cell % N, ((site / N) | 0) - ((C.cell / N) | 0))))} m from where the rivers meet, ${L.above[site].toFixed(1)} m above the channel. Each household walks about ${mins(siteCost)} minutes a day there: ${[['fresh water', tWater[site]], ['good soil', tField[site]], ['firewood', tWood[site]], ['the boats', tBoat[site]]].map(([w, t]) => mins(t) ? `${mins(t)} min to ${w}` : `${w} at the door`).join(', ')}. ${passed.length ? `They passed over ${passed.length === 1 ? 'one place' : 'two places'}: ${passed.join('; ')}.` : ''}`, site);

 // ---- State ----
 let people = A.party, year = 0;
 const houses = [], owner = new Int32Array(n).fill(-1), fieldYear = new Int16Array(n).fill(-1), clearing = new Float32Array(n);
 const households = [];
 const works = {}; const crossings = new Float32Array(n);
 const center = () => { let x = 0, y = 0, k = 0; for (const h of houses) if (h.gone == null) { x += h.cell % N; y += (h.cell / N) | 0; k++; } return k ? Math.round(y / k) * N + Math.round(x / k) : site; };
 const perCell = new Uint8Array(n);
 let fishCapacity = 0;
 const homeSafe = i => !(L.h[i] < 0 || L.river[i] || L.slope[i] > .14 || L.above[i] < knownFlood + .5 || L.h[i] < knownSurge + .5 || (works.mill === i));
 let tMarket = null;
 function newHousehold(size) {
  const c = center(), cx = c % N, cy = (c / N) | 0, cap = people > 600 ? 4 : people > 300 ? 3 : 2;
  let pick = -1, cost = Infinity;
  for (let y = Math.max(0, cy - 30); y < Math.min(N, cy + 31); y++) for (let x = Math.max(0, cx - 30); x < Math.min(N, cx + 31); x++) {
   const i = y * N + x; if (perCell[i] >= cap || !homeSafe(i)) continue;
   // Least effort, plus the pull of neighbours and of worn paths (people build where people walk).
   let e = 2 * (6 * tWater[i] + tField[i] * .6 + tWood[i] / 3) + Math.hypot(x - cx, y - cy) * A.cell * 1.2 - Math.min(400, T.traffic[i] * 25);
   if (tMarket) e += tMarket[i] * 2;
   if (owner[i] >= 0) e += 300; // building on a field costs its harvest
   if (e < cost) { cost = e; pick = i; }
  }
  if (pick < 0) return null;
  const hh = { id: households.length, size, home: pick, fields: [], fisher: false };
  if (owner[pick] >= 0) { const o = households[owner[pick]]; o.fields = o.fields.filter(f => f !== pick); o.tried = -99; owner[pick] = -1; L.cover[pick] = 2; }
  households.push(hh); perCell[pick]++; houses.push({ cell: pick, built: year, hh: hh.id }); hh.house = houses.length - 1;
  return hh;
 }
 function claimFields(hh) {
  let need = needHa(hh.size) - hh.fields.reduce((s, f) => s + .04 * L.fertile[f], 0); if (need <= 0 || year - (hh.tried ?? -99) < 15) return;
  hh.tried = year; const d = dijkstra(T, [hh.home], 720), cand = []; // fields within a 12-minute walk
  for (let i = 0; i < n; i++) if (d[i] < Infinity && L.fertile[i] > 0 && owner[i] < 0 && perCell[i] === 0 && !L.river[i]) cand.push(i);
  cand.sort((a, b) => d[a] / L.fertile[a] - d[b] / L.fertile[b]);
  let labour = A.clearPerHousehold;
  for (const i of cand) { if (need <= 0) break; if (L.cover[i] === 1) { if (labour <= 0) continue; labour -= .04; } owner[i] = hh.id; fieldYear[i] = year; L.cover[i] = 6; hh.fields.push(i); need -= .04 * L.fertile[i]; }
  if (need > needHa(hh.size) / 2 && fishers < fishCapacity) { hh.fisher = true; fishers++; for (const f of hh.fields) { owner[f] = -1; L.cover[f] = 2; } hh.fields = []; }
 }
 let fishers = 0;
 for (let k = 0; k < Math.round(A.party / A.householdSize); k++) claimFields(newHousehold(A.householdSize));

 fishCapacity = (() => { let s = 0; for (let i = 0; i < n; i++) if (boatSea(i)) s++; return Math.round(s / 6); })();
 const snapshots = [];
 const trafficSnap = () => { const t = new Uint8Array(n); for (let i = 0; i < n; i++) t[i] = Math.min(255, T.traffic[i] * 4); return t; };
 const firsts = new Set();
 const once = (key, yr, kind, text, at) => { if (firsts.has(key)) return; firsts.add(key); say(yr, kind, text, at); };
 let peakFlood = knownFlood; const history = [];

 while (year < maxYears && people < target) {
  year++;
  // Food: grain from fields, fish from the boats, and once there is a market and roads out, food from neighbours.
  const live = households.filter(h => !h.gone);
  const grain = live.reduce((s, h) => s + h.fields.reduce((t, f) => t + .04 * L.fertile[f], 0), 0) * A.grainYield / A.fallow;
  fishers = live.filter(h => h.fisher).length;
  const imports = works.market ? Math.min(.35 * people, (works.roadsOut || 0) * 120 + (works.quay ? 150 : 0)) : 0;
  const fed = grain / A.grainPerPerson + fishers * A.fishFeeds + imports, ratio = fed / people;
  if (ratio < .9) once('hunger', year, 'hunger', `A hungry year: the fields and boats feed ${Math.round(fed)} of ${Math.round(people)} people. The town clears more forest.`, center());
  const births = people * A.birth * Math.min(1.1, ratio), deaths = people * (A.death + (ratio < 1 ? .12 * (1 - ratio) : 0));
  const pull = 1 + (works.bridge ? .5 : 0) + (works.market ? 1 : 0) + (works.quay ? .5 : 0) + (works.roadsOut || 0) * .3;
  const migrants = ratio > 1.05 ? people * .006 * pull * Math.min(2, ratio - .95) * 4 : 0;
  people = Math.max(10, people + births - deaths + migrants);

  // Households: new families need homes, and every family needs its fields.
  const want = Math.ceil(people / A.householdSize);
  while (households.filter(h => !h.gone).length < want) { if (!newHousehold(A.householdSize)) break; }
  for (const hh of households) if (!hh.gone && !hh.fisher) claimFields(hh);
  if (fishers >= 1) once('fish', year, 'work', `The first family takes to the boats instead of the fields: the sheltered water is ${mins(tBoat[households.find(h => h.fisher).home])} minutes from their door.`, households.find(h => h.fisher).home);

  // Walking: a sample of the year's trips. Feet wear paths, and paths draw more feet.
  for (let i = 0; i < n; i++) T.traffic[i] *= .93;
  const tripCount = Math.min(60, 12 + people / 25);
  let crossTrips = 0;
  const edgeCells = [Math.floor(N / 2), (N / 2 | 0) * N, (N / 2 | 0) * N + N - 1];
  for (let k = 0; k < tripCount; k++) {
   const hh = live[Math.floor(r() * live.length)]; if (!hh) break;
   let goal; const roll = r();
   if (works.market && roll < .3) goal = works.market;
   else if (works.market && roll < .42) goal = edgeCells[Math.floor(r() * 3)];
   else if (hh.fisher) goal = works.quay ?? landing;
   else if (hh.fields.length && roll < .85) goal = hh.fields[Math.floor(r() * hh.fields.length)];
   else { let b = -1, bt = Infinity; for (const w of (works.wells || [])) { const t = Math.hypot(w % N - hh.home % N, ((w / N) | 0) - ((hh.home / N) | 0)); if (t < bt) { bt = t; b = w; } } goal = b >= 0 && bt < 12 ? b : null; if (goal == null) { let best = -1, bd = Infinity; const hx = hh.home % N, hy = (hh.home / N) | 0; for (let y = Math.max(0, hy - 25); y < Math.min(N, hy + 25); y++) for (let x = Math.max(0, hx - 25); x < Math.min(N, hx + 25); x++) { const i = y * N + x; if (isWater(i)) { const d = Math.hypot(x - hx, y - hy); if (d < bd) { bd = d; best = i; } } } goal = best; } }
   if (goal == null || goal < 0 || goal === hh.home) continue;
   const path = route(T, hh.home, goal); if (!path) continue;
   let wet = false; for (const c of path) { T.traffic[c] += 1; if (L.river[c] && !T.bridge[c]) { crossings[c] += 1; wet = true; } } if (wet) crossTrips++;
  }
  for (let i = 0; i < n; i++) crossings[i] *= .9;

  // Shared works, built when the need is measured and there are enough hands.
  if (!works.wells && people >= 60) { const c = center(), wait = mins(tWater[c]); if (wait >= 3 && L.above[c] < 14) { works.wells = [c]; tWater = dijkstra(T, [...sourcesOf(isWater), c]); say(year, 'work', `With ${Math.round(people)} people, the walk to the river for water has become ${wait} minutes each way from the middle of the settlement. They dig a well there, ${L.above[c].toFixed(1)} m above the river level, where the water table is close.`, c); } }
  // Real trips: each household walks out and back about twice a day, some 700 trips a year.
  const wades = Math.round(crossTrips / tripCount * live.length * 700);
  if (wades > 0) once('ford', year, 'work', `Families start farming across the river. They wade the ford about ${wades} times a year.`, null);
  if (!works.bridge && people >= 120 && wades >= 5000) { let b = -1, bc = 0; for (let i = 0; i < n; i++) if (L.river[i]) { let s = 0; for (let k = 0; k < 8; k++) s += crossings[i + DX[k] + DY[k] * N] || 0; if (s + crossings[i] > bc) { bc = s + crossings[i]; b = i; } } if (b >= 0) { let pick = b, w = Infinity; const bx = b % N, by = (b / N) | 0; for (let y = by - 4; y <= by + 4; y++) for (let x = bx - 4; x <= bx + 4; x++) { const i = y * N + x; if (x >= 0 && y >= 0 && x < N && y < N && L.river[i] && !L.brackish[i] && L.width(i) < w) { w = L.width(i); pick = i; } } works.bridge = pick; T.bridge[pick] = 1; for (let k = 0; k < 8; k++) { const x = pick % N + DX[k], y = ((pick / N) | 0) + DY[k]; const j = y * N + x; if (L.river[j]) T.bridge[j] = 1; } say(year, 'work', `People now wade the river about ${wades} times a year, and the ford closes in every flood. They bridge the river where it is narrowest nearby: ${L.width(pick).toFixed(0)} m across.`, pick); } }
  if (!works.quay && fishers >= 6) { works.quay = landing; say(year, 'work', `${fishers} families now fish. They build a stone quay at the landing beach so the boats can tie up in bad weather.`, landing); }
  if (!works.mill && people >= 200) { let pick = -1, kw = 0; const c = center(), cx = c % N, cy = (c / N) | 0; for (let i = 0; i < n; i++) { if (!L.river[i] || L.brackish[i] || Math.hypot(i % N - cx, ((i / N) | 0) - cy) > 60) continue; let j = i, k = 0; while (k < 4 && L.to[j] >= 0) { j = L.to[j]; k++; } const head = L.h[i] - L.h[j], p = 1000 * 9.81 * L.Q[i] * head * .6 / 1000; if (p > kw) { kw = p; pick = i; } } if (pick >= 0 && kw > 1.5) { works.mill = pick; say(year, 'work', `Grinding grain by hand takes hours a day for ${Math.round(people)} people. A mill goes in where the river drops ${(L.h[pick] - L.h[(() => { let j = pick; for (let k = 0; k < 4 && L.to[j] >= 0; k++) j = L.to[j]; return j; })()]).toFixed(1)} m over 80 m: about ${kw.toFixed(0)} kW of water power.`, pick); } }
  if (!works.market && people >= 250) { const c = center(), cx = c % N, cy = (c / N) | 0; let pick = c, t = 0; for (let y = cy - 15; y <= cy + 15; y++) for (let x = cx - 15; x <= cx + 15; x++) { const i = y * N + x; if (x >= 0 && y >= 0 && x < N && y < N && !L.river[i] && L.h[i] > 0 && T.traffic[i] > t && L.slope[i] < .08) { t = T.traffic[i]; pick = i; } } works.market = pick; tMarket = dijkstra(T, [pick]); say(year, 'work', `${Math.round(people)} people now trade among themselves. The market forms where the most walking paths cross, ${m(Math.round(Math.hypot(pick % N - cx, ((pick / N) | 0) - cy)))} m from the middle of town. Houses start to face it.`, pick); }
  if (works.market && !works.bell && people >= 350) { const mk = works.market, mx = mk % N, my = (mk / N) | 0; let pick = mk, hgt = -1; for (let y = my - 12; y <= my + 12; y++) for (let x = mx - 12; x <= mx + 12; x++) { const i = y * N + x; if (x >= 0 && y >= 0 && x < N && y < N && L.h[i] > hgt && !L.river[i] && perCell[i] < 2) { hgt = L.h[i]; pick = i; } } works.bell = pick; say(year, 'work', `The town is too big to call across. A bell tower goes up on the highest ground near the market, ${(L.h[pick] - L.h[mk]).toFixed(0)} m above it, so the bell carries to every field.`, pick); }
  if (works.market) { const out = edgeCells.filter(e => { let c = e, k = 0; const ex = e % N, ey = (e / N) | 0; for (let y = Math.max(0, ey - 3); y <= Math.min(N - 1, ey + 3); y++) for (let x = Math.max(0, ex - 3); x <= Math.min(N - 1, ex + 3); x++) if (T.traffic[y * N + x] > 4) k++; return k > 0; }).length; if (out > (works.roadsOut || 0)) { works.roadsOut = out; say(year, 'trade', `Traders' feet have worn a road out to ${out === 1 ? 'one edge' : out + ' edges'} of the map, where neighbouring land would be. Food comes in that way.`, null); } }
  if (!works.school && people >= 600) { works.school = works.market; say(year, 'work', `There are about ${Math.round(people * .15)} children of school age. The town opens a school by the market.`, works.market); }

  // Floods and storms. When one tops the drift line the founders read, houses below it flood and those families rebuild higher.
  const rise = floodRise(), storm = surge();
  if (rise > peakFlood + .2 || storm > knownSurge + .2) {
   const wet = houses.filter(h => h.gone == null && (L.above[h.cell] < rise || L.h[h.cell] < storm));
   if (wet.length) {
    for (const h of wet) { h.gone = year; perCell[h.cell]--; const hh = households[h.hh]; hh.gone = true; }
    knownFlood = Math.max(knownFlood, rise); knownSurge = Math.max(knownSurge, storm);
    for (const h of wet) { const hh = newHousehold(households[h.hh].size); if (hh) { hh.fields = households[h.hh].fields; for (const f of hh.fields) owner[f] = hh.id; hh.fisher = households[h.hh].fisher; } }
    say(year, 'flood', rise > storm ? `The biggest flood anyone has seen: the river rises ${rise.toFixed(1)} m, above the old drift line. ${wet.length} house${wet.length > 1 ? 's' : ''} on the low ground flood${wet.length > 1 ? '' : 's'}. The families rebuild higher, and nobody builds below ${rise.toFixed(1)} m again.` : `A storm drives the sea ${storm.toFixed(1)} m up the beach. ${wet.length} house${wet.length > 1 ? 's' : ''} by the shore ${wet.length > 1 ? 'are' : 'is'} lost and rebuilt further back.`, wet[0].cell);
   } else if (rise > peakFlood + .2) say(year, 'flood', `A great flood: the river rises ${rise.toFixed(1)} m. Every house stands above it, because the founders read the drift lines.`, C.cell);
   peakFlood = Math.max(peakFlood, rise);
  }
  for (const [p, label] of [[100, 'a hundred'], [500, 'five hundred']]) if (people >= p) once('pop' + p, year, 'people', `The town reaches ${label} people in ${live.length} households.`, center());
  if (year % 5 === 0 || people >= target) snapshots.push({ year, people: Math.round(people), traffic: trafficSnap(), works: JSON.parse(JSON.stringify(works)) });
  history.push(Math.round(people));
  onYear?.(year, people);
 }
 const c = center();
 say(year, 'people', people >= target ? `Year ${year}: the town passes a thousand people, ${households.filter(h => !h.gone).length} households in ${houses.filter(h => h.gone == null).length} houses.` : `After ${year} years the town holds ${Math.round(people)} people; the land and trade cannot feed more.`, c);
 const roads = []; for (let i = 0; i < n; i++) if (T.traffic[i] > 8) roads.push(i);
 return { history, baseCover, land: L, seed: L.seed, years: year, people: Math.round(people), houses, fieldYear, works, log, snapshots, center: c, landing, site, roads, traffic: trafficSnap(), knownFlood, knownSurge, fishers };
}

export function simulateCity(seed = 1) { const land = findLand(seed); return found(land); }
