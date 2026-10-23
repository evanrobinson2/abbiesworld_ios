// AW-STUDY-0042 Abbie's Town. A small, charming town grown on real land: the terrain, lakes, brooks, railway and main
// roads of Winchester, Massachusetts at true scale (land.json, from MassGIS public data by
// docs/oracle/abbietown/tools/extract_land.py), with Evan's places where they really are. Everything else is grown,
// not traced: lanes sprout from the main roads where the real town is dense, and houses take the real style mix of
// that hectare, fewer and chunkier as the charm goes up. Headless and deterministic; the page draws what this returns.

export const ASSUMPTIONS = {
 lotAsBuilt: 24, lotCharming: 42,   // metres of frontage per house along a street, real town to charming town
 scaleCharming: 1.45,               // a charming house is this much bigger in each direction
 setback: 7,                        // front of the house to the edge of the street, metres
 laneEvery: 150, laneEveryCharming: 230, // metres along a main road between lanes, where the land behind is built up
 laneMin: 70, laneMax: 230,          // lane length, metres; a lane stops at water, a road, a steep bank or the edge
 steep: .2,                          // a slope over 20% is too steep for a house or a lane
 denseHa: 4,                         // real buildings in a hectare before it grows houses at all
 laneHa: 7,                          // and before a lane is worth cutting into it
 shopHa: .18,                        // share of shops in a hectare that makes it the centre
 woodsHa: 0,                         // an empty hectare outside water and fields grows woods
 woodsFill: .32,                     // share of woods cells that get a tree (per 20 m cell)
 streetTrees: 26,                    // metres between street trees on main roads
 seed: 42,
};

export const STYLES = {
 // footprint w (along the street) x d, wall height, roof: gable / steep / hip / flat. Colours: New England clapboard.
 colonial: {w: 11, d: 8, h: 6.2, roof: 'gable', pitch: .55, walls: ['#f4f1e8', '#e9e4d4', '#c9d6dc', '#f0e2b0', '#a9b9c4', '#ece6dc'], trim: '#ffffff', roofs: ['#3e4448', '#4b4e52', '#5a4a40']},
 cape: {w: 10, d: 7.5, h: 3.4, roof: 'steep', pitch: .95, walls: ['#f2efe6', '#d9cdb6', '#b9c9b0', '#e4c9a8', '#c4ccd4'], trim: '#ffffff', roofs: ['#40464a', '#5b5048']},
 ranch: {w: 15, d: 8.5, h: 3.2, roof: 'hip', pitch: .35, walls: ['#e6dccb', '#c8b79c', '#d6d9cf', '#b6a58c'], trim: '#f6f2ea', roofs: ['#4a4744', '#6a5a4c']},
 victorian: {w: 9.5, d: 12, h: 7.4, roof: 'steep', pitch: 1.1, walls: ['#7b9a8c', '#c97b5a', '#e2c36a', '#8c6c94', '#5f7f9b', '#b8546a'], trim: '#f7f0dc', roofs: ['#3b3a3f', '#5a3f3a']},
 multi: {w: 9, d: 15, h: 9.2, roof: 'flat', pitch: .1, walls: ['#d8d2c4', '#9eb0b8', '#c6a888', '#e8dfc8'], trim: '#ffffff', roofs: ['#4a4c50']},
 shop: {w: 13, d: 15, h: 7.8, roof: 'flat', pitch: .1, walls: ['#a8553f', '#9a4a3a', '#b86848', '#c9b79a', '#7d4a3a'], trim: '#f1e7d0', roofs: ['#3c3a38']},
};

// Evan's places (2026-10-23 13:58Z and 14:03Z). Positions where they really are, from MassGIS (schools, open space)
// or, where the public data has no name for them, placed in the town centre: say so on the page and ask him.
export const SPOTS = [
 {id: 'cafe', name: 'The coffee shop', becomes: "Abbie's", at: 'centre', line: 'After Abbie signs in, it becomes her coffee shop. The register key opens the basement.', coins: 10, key: true, where: 'guess'},
 {id: 'comellas', name: "Comella's", at: 'centre', line: 'Pizza by the slice, a booth by the window.', coins: 1, where: 'guess'},
 {id: 'hoagies', name: 'Frozen Hoagies', at: 'centre', line: 'Daddy’s sub shop, frozen in time.', coins: 1, where: 'guess'},
 {id: 'muraco', name: 'Muraco', at: 'muraco', line: 'The school jump lives here: the roof, the drainpipe and the coin.', coins: 1, where: 'data'},
 {id: 'leonard', name: 'Leonard Field', at: 'leonard', line: 'The field and the little beach on the pond.', coins: 1, where: 'data'},
 {id: 'ginn', name: 'Ginn Field', at: 'ginn', line: 'The train park, by the lakes.', coins: 1, where: 'data'},
 {id: 'horn', name: 'Horn Pond', at: 'horn', line: 'The long walk round the pond.', coins: 1, where: 'data'},
 {id: 'common', name: 'The town common', at: 'common', line: 'The middle of everything: the church, the flag, the pond.', coins: 0, where: 'data'},
];
// Off the map: roads out of town lead to them, and they show on the horizon.
export const BEYOND = [
 {id: 'launch', name: 'Launch', dir: [0.15, 1], line: 'Up the road north, past the edge of the map.'},
 {id: 'nova', name: 'New Nova', dir: [0.55, -1], line: 'The bright city past the lakes, off the map.'},
];

export function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const lerp = (a, b, t) => a + (b - a) * t;

function b64(str) {
 if (typeof atob === 'function') { const bin = atob(str), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
 const b = Buffer.from(str, 'base64'); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

// The land: heights in metres above sea level at true scale, water, brooks, railway, main roads.
export function makeLand(raw) {
 const {nx, ny, cell} = raw, H = new Float32Array(nx * ny), dm = new Int16Array(b64(raw.h));
 for (let i = 0; i < H.length; i++) H[i] = dm[i] / 10;
 const W = nx * cell, D = ny * cell;
 function heightAt(x, y) {
  const fx = Math.min(nx - 1.001, Math.max(0, x / cell - .5)), fy = Math.min(ny - 1.001, Math.max(0, y / cell - .5));
  const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, a = H[j * nx + i], b = H[j * nx + i + 1], c = H[(j + 1) * nx + i], d = H[(j + 1) * nx + i + 1];
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
 }
 const slopeAt = (x, y) => { const e = 10; return Math.hypot(heightAt(x + e, y) - heightAt(x - e, y), heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e); };
 // water raster on the same grid (point in polygon by scanline), with each cell's water level
 const wet = new Float32Array(nx * ny).fill(NaN);
 for (const w of raw.water) {
  const r = w.ring; let y0 = Infinity, y1 = -Infinity; for (const p of r) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let j = Math.max(0, Math.floor(y0 / cell)); j <= Math.min(ny - 1, Math.ceil(y1 / cell)); j++) {
   const y = (j + .5) * cell, xs = [];
   for (let k = 0, m = r.length - 1; k < r.length; m = k++) { const [ax, ay] = r[m], [bx, by] = r[k]; if ((ay > y) !== (by > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax)); }
   xs.sort((a, b) => a - b);
   for (let q = 0; q + 1 < xs.length; q += 2) for (let i = Math.max(0, Math.ceil(xs[q] / cell - .5)); i <= Math.min(nx - 1, Math.floor(xs[q + 1] / cell - .5)); i++) wet[j * nx + i] = w.lvl;
  }
 }
 const waterAt = (x, y) => { const i = Math.floor(x / cell), j = Math.floor(y / cell); return i < 0 || j < 0 || i >= nx || j >= ny ? NaN : wet[j * nx + i]; };
 const dc = raw.dc, dnx = raw.dnx, dny = raw.dny;
 const hect = (x, y) => { const i = Math.floor(x / dc), j = Math.floor(y / dc); if (i < 0 || j < 0 || i >= dnx || j >= dny) return null; const k = j * dnx + i; return {n: raw.dens[k], mix: raw.mix[k], era: raw.era[k]}; };
 return {raw, nx, ny, cell, W, D, H, heightAt, slopeAt, waterAt, hect, fam: raw.fam};
}

// Spatial hash of things already placed, so lots never overlap streets, water or each other.
function grid(size) {
 const m = new Map(), key = (i, j) => i * 73856093 ^ j * 19349663;
 return {
  add(x, y, r, tag) { for (let i = Math.floor((x - r) / size); i <= Math.floor((x + r) / size); i++) for (let j = Math.floor((y - r) / size); j <= Math.floor((y + r) / size); j++) { const k = key(i, j); (m.get(k) || m.set(k, []).get(k)).push({x, y, r, tag}); } },
  hit(x, y, r, ignore) { for (let i = Math.floor((x - r) / size); i <= Math.floor((x + r) / size); i++) for (let j = Math.floor((y - r) / size); j <= Math.floor((y + r) / size); j++) for (const o of m.get(key(i, j)) || []) if (o.tag !== ignore && Math.hypot(o.x - x, o.y - y) < o.r + r) return o; return null; },
 };
}

function pick(mix, fam, r) {
 // a hectare's real style mix, read as odds (garages are not in the mix; civic buildings come from the places)
 const odds = fam.map((f, i) => f === 'civic' ? 0 : mix[i]), sum = odds.reduce((a, b) => a + b, 0);
 if (!sum) return 'colonial';
 let t = r() * sum; for (let i = 0; i < odds.length; i++) if ((t -= odds[i]) < 0) return fam[i];
 return 'colonial';
}

const polyLen = p => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; };
function along(p, d) { // point and unit direction at distance d along a polyline
 for (let i = 1; i < p.length; i++) { const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1], l = Math.hypot(dx, dy); if (d <= l || i === p.length - 1) { const t = l ? Math.min(1, d / l) : 0; return {x: p[i - 1][0] + dx * t, y: p[i - 1][1] + dy * t, tx: l ? dx / l : 1, ty: l ? dy / l : 0}; } d -= l; }
 return {x: p[0][0], y: p[0][1], tx: 1, ty: 0};
}
function nearestOn(roads, x, y, maxC = 4) {
 let best = null;
 for (const r of roads) { if (r.c > maxC) continue; const p = r.p; for (let i = 1; i < p.length; i++) { const [ax, ay] = p[i - 1], [bx, by] = p[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)); const qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(qx - x, qy - y); if (!best || d < best.d) { const l = Math.sqrt(l2); best = {d, x: qx, y: qy, tx: dx / l, ty: dy / l, road: r}; } } }
 return best;
}

export const roadWidth = c => c <= 1 ? 22 : c === 2 ? 14 : c === 3 ? 11 : 9;

// Grow the town. charm 0 = as dense as the real town, 1 = Abbie's town: fewer, chunkier houses on more generous lots.
export function growTown(land, {charm = 1, seed = ASSUMPTIONS.seed} = {}) {
 const A = ASSUMPTIONS, r = rng(seed), occ = grid(24), raw = land.raw;
 const lot = lerp(A.lotAsBuilt, A.lotCharming, charm), scale = lerp(1, A.scaleCharming, charm), laneEvery = lerp(A.laneEvery, A.laneEveryCharming, charm);
 const roads = raw.roads.filter(x => x.c <= 4).map(x => ({c: x.c, p: x.p, w: roadWidth(x.c)}));
 for (const rd of roads) { const L = polyLen(rd.p); for (let d = 0; d <= L; d += 6) { const a = along(rd.p, d); occ.add(a.x, a.y, rd.w / 2 + 1, 'road'); } }
 for (const rl of raw.rail) { const L = polyLen(rl); for (let d = 0; d <= L; d += 6) { const a = along(rl, d); occ.add(a.x, a.y, 9, 'rail'); } }
 const out = {houses: [], lanes: [], trees: [], roads, rail: raw.rail, spots: [], beyond: [], coins: [], charm, lot, scale};
 const okGround = (x, y, rad) => x > rad && y > rad && x < land.W - rad && y < land.D - rad && isNaN(land.waterAt(x, y)) && land.slopeAt(x, y) < A.steep
  && [[rad, 0], [-rad, 0], [0, rad], [0, -rad]].every(([dx, dy]) => isNaN(land.waterAt(x + dx, y + dy)));

 // the places first, so nothing grows over them
 const centre = nearestOn(roads, ...raw.spots.common);
 const horn = raw.water.filter(w => /horn pond/i.test(w.n)).sort((a, b) => b.a - a.a)[0];
 function hornShore() { // the shore point of Horn Pond nearest the town centre, stepped back onto dry land
  let best = null; for (const p of horn.ring) { const d = Math.hypot(p[0] - centre.x, p[1] - centre.y); if (!best || d < best.d) best = {d, x: p[0], y: p[1]}; }
  const dx = centre.x - best.x, dy = centre.y - best.y, l = Math.hypot(dx, dy); return [best.x + dx / l * 30, best.y + dy / l * 30, best.x, best.y];
 }
 let lots = null;
 for (const s of SPOTS) {
  let x, y, face = 0, toward = null;
  if (s.at === 'centre') { // the nearest free lot on a main street by the common
   if (!lots) { lots = []; const [cx, cy] = raw.spots.common;
    for (const rd of roads) { const L = polyLen(rd.p); for (let d = 12; d < L - 12; d += 24) { const a = along(rd.p, d); if (Math.hypot(a.x - cx, a.y - cy) > 260) continue;
     for (const side of [1, -1]) { const qx = a.x - a.ty * side * (rd.w / 2 + 9), qy = a.y + a.tx * side * (rd.w / 2 + 9), dc = Math.hypot(qx - cx, qy - cy);
      if (dc > 42 && isNaN(land.waterAt(qx, qy)) && !occ.hit(qx, qy, 6, 'spot') && !occ.hit(qx, qy, 6, 'house')) lots.push({x: qx, y: qy, dc, face: Math.atan2(a.ty, a.tx) + (side > 0 ? 0 : Math.PI)}); } } }
    lots.sort((p, q) => p.dc - q.dc); }
   const lot = lots.find(l => !out.spots.some(o => Math.hypot(o.x - l.x, o.y - l.y) < 28) && !occ.hit(l.x, l.y, 7, 'road'));
   ({x, y, face} = lot);
  } else if (s.at === 'horn') { const h = hornShore(); [x, y] = h; toward = [h[2], h[3]]; }
  else [x, y] = raw.spots[s.at];
  const spot = {...s, x, y, z: land.heightAt(x, y), face, toward, radius: s.at === 'centre' ? 11 : s.id === 'common' ? 32 : 40};
  out.spots.push(spot); occ.add(x, y, spot.radius, 'spot');
  for (let k = 0; k < s.coins; k++) out.coins.push({spot: s.id, x: x + Math.cos(k * 2.4) * (k ? 3 + k : 0), y: y + Math.sin(k * 2.4) * (k ? 3 + k : 0), hidden: s.id === 'cafe' && k > 0});
 }
 // off the map: the main road that leaves the map most nearly in that direction
 for (const b of BEYOND) {
  const [ux, uy] = b.dir, l = Math.hypot(ux, uy); let best = null;
  for (const rd of roads) for (const p of [rd.p[0], rd.p[rd.p.length - 1]]) { const edge = Math.min(p[0], p[1], land.W - p[0], land.D - p[1]); if (edge > 30) continue; const dx = p[0] - centre.x, dy = p[1] - centre.y, s = (dx * ux + dy * uy) / l / Math.hypot(dx, dy); if (!best || s > best.s) best = {s, x: p[0], y: p[1]}; }
  out.beyond.push({...b, x: best.x, y: best.y, z: land.heightAt(best.x, best.y)});
 }

 const sizeOf = fam => fam === 'shop' ? lerp(1, 1.12, charm) : scale;
 // a house at x,y whose front door faces (fx, fy), towards its street
 function placeHouse(x, y, fx, fy, fam) {
  const S = STYLES[fam], s = sizeOf(fam) * (fam === 'shop' ? 1 : lerp(.95, 1.05, r()));
  const w = S.w * s, d = S.d * s, rad = fam === 'shop' ? Math.min(w, d) * .5 : Math.max(w, d) * .5;
  if (!okGround(x, y, rad) || occ.hit(x, y, rad, null)) return false;
  occ.add(x, y, rad, 'house');
  const tx = -fy, ty = fx; // along the street
  const z = Math.min(...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([u, v]) => land.heightAt(x + tx * u * w / 2 + fx * v * d / 2, y + ty * u * w / 2 + fy * v * d / 2)));
  const pal = k => S[k][Math.floor(r() * S[k].length)];
  const h = {x, y, z, fx, fy, fam, w, d, h: S.h * s * (fam === 'multi' ? lerp(.8, 1.15, r()) : 1), roof: S.roof, pitch: S.pitch, wall: pal('walls'), roofc: pal('roofs'), trim: S.trim,
   chimney: fam !== 'shop' && fam !== 'multi' && r() < .7, porch: (fam === 'colonial' || fam === 'victorian') && r() < .5};
  out.houses.push(h);
  for (let k = 0; k < (fam === 'shop' ? 0 : 1 + (r() < .6)); k++) { // a yard tree or two behind the house
   const back = d * .5 + 5 + r() * 9, sideways = (r() - .5) * w, qx = x - fx * back + tx * sideways, qy = y - fy * back + ty * sideways;
   if (okGround(qx, qy, 2) && !occ.hit(qx, qy, 2.5, null)) { out.trees.push(tree(qx, qy)); occ.add(qx, qy, 2.5, 'tree'); }
  }
  return true;
 }
 function tree(x, y, wild = false) {
  const kinds = ['maple', 'maple', 'oak', 'pine', 'birch'], kind = wild ? (r() < .45 ? 'pine' : kinds[Math.floor(r() * 4)]) : kinds[Math.floor(r() * kinds.length)];
  const fall = ['#d9542b', '#e8892f', '#f0b43c', '#b8452c', '#8f9a3e', '#c9672e'];
  return {x, y, z: land.heightAt(x, y), kind, s: lerp(.8, 1.3, r()) * lerp(1, 1.25, charm), c: kind === 'pine' ? '#2f5a3a' : kind === 'birch' ? '#e6c04a' : fall[Math.floor(r() * fall.length)]};
 }
 // houses along one side of a street polyline, facing it
 function frontage(p, halfW, side, minHa, lane) {
  const L = polyLen(p);
  for (let d = lot / 2 + r() * lot * .3; d < L - 4; d += lot * lerp(.85, 1.15, r())) {
   const a = along(p, d), nx = -a.ty * side, ny = a.tx * side;
   const ha = land.hect(a.x + nx * 20, a.y + ny * 20);
   if (!ha || ha.n < minHa) continue;
   const shopShare = ha.mix[land.fam.indexOf('shop')] / Math.max(1, ha.n);
   let fam = shopShare >= A.shopHa && !lane ? 'shop' : pick(ha.mix, land.fam, r);
   if (fam === 'shop' && (lane || shopShare < A.shopHa / 2)) fam = 'colonial';
   const off = halfW + (fam === 'shop' ? 2.5 : A.setback) + STYLES[fam].d * sizeOf(fam) / 2;
   placeHouse(a.x + nx * off, a.y + ny * off, -nx, -ny, fam);
  }
 }
 // lanes: cut from a main road into a built-up hectare behind it, ending in a turning circle
 for (const rd of roads) {
  const L = polyLen(rd.p);
  for (let d = laneEvery * r(); d < L; d += laneEvery * lerp(.8, 1.2, r())) {
   const a = along(rd.p, d);
   for (const side of [1, -1]) {
    let x = a.x - a.ty * side * (rd.w / 2 + 1), y = a.y + a.tx * side * (rd.w / 2 + 1), dx = -a.ty * side, dy = a.tx * side;
    const ha = land.hect(x + dx * 60, y + dy * 60); if (!ha || ha.n < A.laneHa) continue;
    const pts = [[x, y]], len = lerp(A.laneMin, A.laneMax, r()), bend = (r() - .5) * .016;
    let ok = true;
    for (let s = 0; s < len; s += 10) {
     const c = Math.cos(bend * 10), sn = Math.sin(bend * 10); [dx, dy] = [dx * c - dy * sn, dx * sn + dy * c];
     const nx2 = x + dx * 10, ny2 = y + dy * 10, z0 = land.heightAt(x, y), z1 = land.heightAt(nx2, ny2);
     if (Math.abs(z1 - z0) / 10 > A.steep * .8 || !isNaN(land.waterAt(nx2, ny2)) || (s > 20 && occ.hit(nx2, ny2, 5, null)) || nx2 < 10 || ny2 < 10 || nx2 > land.W - 10 || ny2 > land.D - 10) { ok = s > 50; break; }
     x = nx2; y = ny2; pts.push([x, y]);
    }
    if (!ok || pts.length < 6) continue;
    const lane = {p: pts, w: 7, end: pts[pts.length - 1]};
    for (let k = 2; k < pts.length; k++) occ.add(pts[k][0], pts[k][1], 4.5, 'lane');
    occ.add(lane.end[0], lane.end[1], 9, 'lane');
    out.lanes.push(lane);
   }
  }
 }
 for (const lane of out.lanes) for (const side of [1, -1]) frontage(lane.p.slice(1), lane.w / 2, side, A.denseHa, true);
 for (const rd of roads) if (rd.c >= 2) for (const side of [1, -1]) frontage(rd.p, rd.w / 2, side, A.denseHa, false);
 // street trees on the main roads, then the woods where nobody built
 for (const rd of roads) { if (rd.c <= 1) continue; const L = polyLen(rd.p); for (let d = 8; d < L; d += A.streetTrees * lerp(.8, 1.3, r())) { const a = along(rd.p, d), side = r() < .5 ? 1 : -1, x = a.x - a.ty * side * (rd.w / 2 + 3), y = a.y + a.tx * side * (rd.w / 2 + 3); if (okGround(x, y, 1) && !occ.hit(x, y, 2, null)) { out.trees.push(tree(x, y)); occ.add(x, y, 2, 'tree'); } } }
 const c = land.cell;
 for (let j = 0; j < land.ny; j++) for (let i = 0; i < land.nx; i++) {
  const x = (i + .2 + r() * .6) * c, y = (j + .2 + r() * .6) * c, ha = land.hect(x, y);
  if (!ha || ha.n > A.woodsHa || r() > A.woodsFill * (1 - charm * .25)) continue;
  if (okGround(x, y, 3) && !occ.hit(x, y, 4, null)) out.trees.push({...tree(x, y, true), wild: true});
 }
 return out;
}
function projectOn(p, x, y) { let best = Infinity, at = 0, run = 0; for (let i = 1; i < p.length; i++) { const [ax, ay] = p[i - 1], [bx, by] = p[i], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (l * l))), d = Math.hypot(ax + dx * t - x, ay + dy * t - y); if (d < best) { best = d; at = run + t * l; } run += l; } return at; }

export function summary(land, town) {
 const fam = {}; for (const h of town.houses) fam[h.fam] = (fam[h.fam] || 0) + 1;
 const laneM = town.lanes.reduce((s, l) => s + polyLen(l.p), 0), roadM = town.roads.reduce((s, r) => s + polyLen(r.p), 0);
 const real = land.raw.stats, realBuildings = Object.entries(real.buildings).filter(([k]) => k !== 'garage').reduce((s, [, v]) => s + v, 0);
 const ends = new Map(); for (const r of town.roads) for (const p of [r.p[0], r.p[r.p.length - 1]]) { const k = Math.round(p[0] / 5) + ',' + Math.round(p[1] / 5); ends.set(k, (ends.get(k) || 0) + 1); }
 const junctions = [...ends.values()].filter(n => n >= 2).length + town.lanes.length;
 return {houses: town.houses.length, fam, junctions, trees: town.trees.length, lanes: town.lanes.length, laneKm: laneM / 1000, roadKm: roadM / 1000, realBuildings,
  realStreetKm: Object.values(real.roads_m).reduce((a, b) => a + b, 0) / 1000, sizeKm: [land.W / 1000, land.D / 1000], hmin: real.hmin, hmax: real.hmax, coins: town.coins.length};
}
