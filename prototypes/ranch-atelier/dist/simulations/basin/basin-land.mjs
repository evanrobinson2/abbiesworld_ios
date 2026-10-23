// The Basin: a lush green Colorado mountain basin that pours out onto a big lake. Land from process, not a drawing:
// tectonic uplift raises a ring of peaks open on the lake side, rain falls everywhere, and repeated rounds of
// priority-flood drainage, stream-power incision and hillslope creep cut the valleys, the main river and the tarns.
// Vegetation follows elevation, slope and wetness. Deterministic for a seed; no three.js and no DOM (runs in node).

export const ASSUMPTIONS = {
 cell: 25,              // metres per grid cell
 N: 257,                // 6.4 km square: the basin and its rim
 lake: 0,               // lake surface elevation, metres; heights are relative to it
 floor: 40,             // basin floor rise from the lake shore to the head of the valley, metres
 relief: 880,           // peak height above the lake, metres (a Colorado basin is ~800-1200 m deep)
 rim: [1500, 3400],     // basin radius where the mountains start and reach full height, metres
 farShore: -9000,       // where the far side of the lake rises (z, metres)
 shore: -1250,          // where the valley meets the lake (z, metres; the lake lies toward -z)
 rounds: 36,            // erosion rounds
 incision: .0022,       // stream power coefficient K in E = K A^0.5 S
 creep: .16,            // extra hillslope shedding per round on slopes steeper than talus
 soil: .22,             // linear soil creep per round: rounds off the gullies between channels
 talus: .62,            // slope (rise/run) above which rock sheds
 river: 1.1e6,          // contributing area, m^2, where a stream shows as open water
 treeline: 620,         // metres above the lake where spruce gives way to tundra
 snowline: 820          // metres above the lake where snow lies on gentle ground
};
const A = ASSUMPTIONS;

function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export function noise(seed) {
 const r = rng(seed), P = new Float32Array(65536); for (let i = 0; i < P.length; i++) P[i] = r();
 const at = (x, y) => P[(x & 255) * 256 + (y & 255)], f = t => t * t * (3 - 2 * t);
 const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = f(x - xi), v = f(y - yi);
  return at(xi, yi) * (1 - u) * (1 - v) + at(xi + 1, yi) * u * (1 - v) + at(xi, yi + 1) * (1 - u) * v + at(xi + 1, yi + 1) * u * v; };
 const fbm = (x, y, o = 5) => { let s = 0, a = .5, k = 1, t = 0; for (let i = 0; i < o; i++) { s += a * n(x * k + i * 17.3, y * k + i * 31.7); t += a; a *= .5; k *= 2.03; } return s / t; };
 const ridged = (x, y, o = 5) => { let s = 0, a = .5, k = 1, t = 0; for (let i = 0; i < o; i++) { const v = 1 - Math.abs(2 * n(x * k + i * 11.1, y * k + i * 7.7) - 1); s += a * v * v; t += a; a *= .5; k *= 2.1; } return s / t; };
 return { fbm, ridged };
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Tectonic uplift before any water runs: also used, unchanged, for the far mountains beyond the map.
export function uplift(seed) {
 const { fbm, ridged } = noise(seed);
 return (x, z) => {
  const cz = 450, r = Math.hypot(x, (z - cz) / 1.12), ang = Math.atan2(x, -(z - cz));     // ang 0 points at the lake
  const gap = smooth(.45, 1.15, Math.abs(ang + .35 * (fbm(r / 900, 3.3, 2) - .5)));       // the rim opens onto the lake
  const wob = 380 * (fbm(x / 1500 + 9, z / 1500 + 4, 3) - .5), shoreLine = A.shore + 260 * (fbm(x / 700 + 5, 1.7, 3) - .5);
  const lake = smooth(shoreLine + 120, shoreLine - 650, z) * (1 - smooth(.95, 1.55, Math.abs(ang)));  // the lake fans out north
  const far = smooth(A.farShore, A.farShore - 2500, z);                                     // the far shore
  const ring = Math.max(smooth(A.rim[0] + wob, A.rim[1] + wob, r) * (.25 + .75 * gap) * (1 - lake), far);
  const crag = .74 + .26 * ridged(x / 1100, z / 1100, 5);
  let h = A.relief * ring * crag * (.8 + .4 * fbm(x / 2600 + 2, z / 2600 + 7, 3));
  h += A.floor * Math.max(0, Math.min(1, (z - A.shore) / 2600)) + 12 * (fbm(x / 320, z / 320, 4) - .5);  // the valley floor tilts to the lake
  h -= lake * (1 - far) * (7 + 55 * smooth(shoreLine, shoreLine - 2400, z));                // the lake bed
  return h;
 };
}

class Heap {
 constructor() { this.k = []; this.v = []; }
 push(key, val) { const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val); while (i) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; } k[i] = key; v[i] = val; }
 pop() { const k = this.k, v = this.v, top = v[0]; const lk = k.pop(), lv = v.pop(); if (k.length) { let i = 0; for (;;) { let c = 2 * i + 1; if (c >= k.length) break; if (c + 1 < k.length && k[c + 1] < k[c]) c++; if (k[c] >= lk) break; k[i] = k[c]; v[i] = v[c]; i = c; } k[i] = lk; v[i] = lv; } return top; }
 get size() { return this.k.length; }
}
const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DL = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

// Priority flood from the lake and the map edge: the filled surface tells where water ponds (tarns, the lake),
// then steepest descent over the filled surface and flow accumulation give every cell its river.
function drain(N, h, cell) {
 const fill = Float32Array.from(h), seen = new Uint8Array(N * N), q = new Heap(), order = new Int32Array(N * N); let n = 0;
 for (let i = 0; i < N * N; i++) { const x = i % N, y = (i / N) | 0; if (h[i] < A.lake || x === 0 || y === 0 || x === N - 1 || y === N - 1) { seen[i] = 1; if (fill[i] < A.lake && h[i] < A.lake) fill[i] = A.lake; q.push(fill[i], i); } }
 const to = new Int32Array(N * N).fill(-1);
 while (q.size) { const c = q.pop(); order[n++] = c; const cx = c % N, cy = (c / N) | 0;
  for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const j = y * N + x; if (seen[j]) continue; seen[j] = 1; if (fill[j] <= fill[c]) fill[j] = fill[c] + 1e-4; to[j] = c; q.push(fill[j], j); } }
 // Downhill on the filled surface: prefer the steepest real drop, fall back to the flood parent across flats.
 for (let c = 0; c < N * N; c++) { if (to[c] < 0) continue; const cx = c % N, cy = (c / N) | 0; let best = to[c], drop = 0;
  for (let k = 0; k < 8; k++) { const x = cx + DX[k], y = cy + DY[k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const j = y * N + x, d = (fill[c] - fill[j]) / DL[k]; if (d > drop) { drop = d; best = j; } } to[c] = best; }
 const area = new Float64Array(N * N).fill(cell * cell);
 for (let i = n - 1; i >= 0; i--) { const c = order[i]; if (to[c] >= 0) area[to[c]] += area[c]; }
 return { fill, to, area, order };
}

export function makeBasin(seed = 7) {
 const t0 = Date.now(), N = A.N, cell = A.cell, half = (N - 1) * cell / 2, h = new Float32Array(N * N), U = uplift(seed);
 const X = i => (i % N) * cell - half, Z = i => ((i / N) | 0) * cell - half;
 for (let i = 0; i < N * N; i++) h[i] = U(X(i), Z(i));
 // Erosion fades out at the map edge so the detailed land meets the far mountains without a seam.
 const keep = new Float32Array(N * N); for (let i = 0; i < N * N; i++) { const x = i % N, y = (i / N) | 0, e = Math.min(x, y, N - 1 - x, N - 1 - y); keep[i] = smooth(2, 14, e); }
 let D;
 for (let round = 0; round < A.rounds; round++) {
  D = drain(N, h, cell);
  for (let c = 0; c < N * N; c++) { const d = D.to[c]; if (d < 0 || h[c] < A.lake) continue; const k = Math.abs(d - c) === 1 || Math.abs(d - c) === N ? 1 : Math.SQRT2;
   const s = Math.max(0, (h[c] - h[d]) / (cell * k)), cut = keep[c] * Math.min(25, A.incision * Math.sqrt(D.area[c]) * s * cell);
   h[c] = Math.max(h[d] + .02 * k, h[c] - cut); }                            // a channel never cuts below the water it drains into
  const next = Float32Array.from(h);
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const c = y * N + x; if (h[c] < A.lake) continue;
   let flux = 0, soil = 0; for (let k = 0; k < 4; k++) { const j = (y + DY[k]) * N + x + DX[k], dh = h[j] - h[c], s = dh / cell; soil += dh; if (Math.abs(s) > A.talus * .5) flux += (s - Math.sign(s) * A.talus * .5) * cell; }
   next[c] += keep[c] * (A.creep * flux + A.soil * soil) * .25; }
  h.set(next);
 }
 D = drain(N, h, cell);
 // Water: the lake below its level, tarns where the filled surface stands above the ground, rivers by catchment.
 const water = new Float32Array(N * N).fill(-1e9), wet = new Float32Array(N * N), slope = new Float32Array(N * N);
 let rivers = 0, tarns = 0;
 for (let c = 0; c < N * N; c++) {
  const x = c % N, y = (c / N) | 0;
  const gx = (h[y * N + Math.min(N - 1, x + 1)] - h[y * N + Math.max(0, x - 1)]) / (2 * cell), gz = (h[Math.min(N - 1, y + 1) * N + x] - h[Math.max(0, y - 1) * N + x]) / (2 * cell);
  slope[c] = Math.hypot(gx, gz);
  if (h[c] < A.lake) { water[c] = A.lake; continue; }
  const pond = D.fill[c] - h[c]; if (pond > 2.5 && D.fill[c] > A.lake + 5) { water[c] = D.fill[c]; tarns++; continue; }
  if (D.area[c] > A.river) { const depth = Math.min(3, .6 + 1.2 * Math.log10(D.area[c] / A.river + 1)); h[c] -= depth; water[c] = h[c] + depth * .8; rivers++; }
 }
 for (let c = 0; c < N * N; c++) wet[c] = Math.min(1, Math.log10(D.area[c] / (cell * cell)) / 3.4);
 // Where the river leaves the valley and the main stem.
 let mouth = -1; for (let c = 0; c < N * N; c++) if (water[c] > -1e8 && h[c] >= A.lake && D.to[c] >= 0 && h[D.to[c]] < A.lake && (mouth < 0 || D.area[c] > D.area[mouth])) mouth = c;
 // A camp: flat valley floor, a short walk from the river, the lake in view down the valley.
 let site = -1, best = -Infinity;
 for (let c = 0; c < N * N; c++) { if (water[c] > -1e8 || h[c] < 3 || h[c] > 120) continue; const x = X(c), z = Z(c);
  let flat = 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const j = c + dy * N + dx; if (j >= 0 && j < N * N) flat = Math.max(flat, slope[j]); }
  let river = 1e9; for (let dy = -16; dy <= 16; dy += 2) for (let dx = -16; dx <= 16; dx += 2) { const j = c + dy * N + dx; if (j >= 0 && j < N * N && water[j] > -1e8 && h[j] >= A.lake) river = Math.min(river, Math.hypot(dx, dy) * cell); }
  const toShore = z - A.shore, score = -flat * 40 - Math.abs(river - 180) / 60 - Math.abs(toShore - 1300) / 300 - Math.abs(x) / 900;
  if (score > best) { best = score; site = c; } }
 const lakeArea = [...water].filter((w, i) => w === A.lake && h[i] < A.lake).length * cell * cell;
 return { seed, N, cell, half, h, water, wet, slope, area: D.area, to: D.to, mouth, site, siteXZ: [X(site), Z(site)], siteHeight: h[site],
  uplift: U, ms: Date.now() - t0,
  facts: { rivers, tarns, lakeKm2: +(lakeArea / 1e6).toFixed(1), peak: Math.round(Math.max(...h)), mouthFlowKm2: mouth >= 0 ? +(D.area[mouth] / 1e6).toFixed(1) : 0 } };
}

// Ground cover by elevation, slope and wetness: the colours the view paints and where the trees grow.
export function cover(L, c) {
 const e = L.h[c] - A.lake, s = L.slope[c], w = L.wet[c];
 if (L.water[c] > -1e8) return 'water';
 if (s > 1.05) return e > A.treeline ? 'rock' : 'cliff';
 if (e > A.snowline && s < .8) return 'snow';
 if (e > A.treeline + 90) return 'scree';
 if (e > A.treeline) return 'tundra';
 if (e < 2.5) return 'shore';
 if (w > .62 && e < 160) return 'willow';
 if (e < 90 && s < .14) return 'meadow';
 return e < 280 && s < .55 && w > .2 ? 'aspen' : 'spruce';
}
