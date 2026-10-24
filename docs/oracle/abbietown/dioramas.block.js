// ---------- Winchester, MA: seven hexes in three zones (AW-STUDY-0042; Evan 2026-10-23 4:31 PM: "7 hex, 3 zones, each zone more detailed") ----------
// One board of seven flat-top hexes (a centre and its six neighbours), laid out as the real town lies: the same bearings, one
// shared squeeze, so the heights meet across every edge and a tile placed beside the board (the Moon, the Ranch) can take its
// edge from AbbieTown.board.heightAt. Each hex is a hand-modelled miniature with one job; each zone keeps its own look.
const DIO_R = 105, DIO_N = 66, DIO_ORIGIN = [land.W + 3600, land.D / 2]; // hex circumradius, lattice rings, where the board's middle is (map metres)
const BOARD = {name: 'Winchester, MA', centre: [4376, 2020], side: 760, vex: 2.7}, R3 = Math.sqrt(3);
const ZONE_LOOK = {
 downtown: {bg: '#f3dcbd', sun: '#ffd49a', sunI: 2.7, sunDir: [-520, 520, 620], sky: '#ffe9cf', gnd: '#8a6a4a', hemiI: 1.05, grass: ['#7fa14f', '#a8b45e'], soil: '#8a5a3a', fov: 32, dist: 250, azimuth: 205, lowPitch: 20, highPitch: 54, mood: 'a late-afternoon square, brass and brick', wash: 'downtown'},
 'anis-side': {bg: '#cfe8f1', sun: '#eef4ff', sunI: 2.0, sunDir: [420, 900, -380], sky: '#dff1ff', gnd: '#4d6a5c', hemiI: 1.3, grass: ['#64a07c', '#8bb86a'], soil: '#5d6b4a', fov: 48, dist: 330, azimuth: 150, lowPitch: 30, highPitch: 70, mood: 'a cool bright morning by the pond, wide and airy', wash: 'anis-side'},
 'abbie-daddy-side': {bg: '#f6c4ad', sun: '#ff9d6a', sunI: 2.9, sunDir: [-800, 360, 120], sky: '#ffd5c2', gnd: '#7a4a5a', hemiI: 1.0, grass: ['#c2a447', '#d98a45'], soil: '#7a4a3a', fov: 40, dist: 300, azimuth: 235, lowPitch: 38, highPitch: 78, mood: 'a sunset hill, almost a board seen from above', wash: 'abbie-daddy-side'},
};
// bearing = where the hex lies from the middle one (clockwise from north, as the real town); zone = which third it belongs to
const DIOS = [
 {id: 'downtown', n: 'H1', zone: 'downtown', name: 'Downtown', bearing: null, pin: '⛪', heroes: ['highschool', 'common', 'cafe', 'bakery', 'comellas', 'hoagies', 'noticeboard', 'skatepark'], look: ZONE_LOOK.downtown},
 {id: 'depot-river', n: 'H2', zone: 'downtown', name: 'Depot and River', bearing: 180, heroes: ['depot', 'railyard', 'mill'], houses: 24, look: {...ZONE_LOOK.downtown, bg: '#ead7bd', mood: 'trains and a river, mill-brown and warm', dist: 240, azimuth: 190}},
 {id: 'reservoir-hills', n: 'H3', zone: 'downtown', name: 'Reservoir Hills', bearing: 120, heroes: ['dock', 'lookout'], houses: 18, walls: 1, look: {...ZONE_LOOK.downtown, bg: '#d6e4e8', sun: '#fff0d6', sunI: 2.4, sky: '#e2f0ff', grass: ['#6f9a58', '#98b068'], mood: 'a clear afternoon above the big water', fov: 38, dist: 300, azimuth: 215, lowPitch: 28, highPitch: 62}},
 {id: 'neighbourhood', n: 'H4', zone: 'anis-side', name: 'Neighbourhood Streets', bearing: 240, heroes: ['trailhead'], houses: 120, walls: 1, look: {...ZONE_LOOK['anis-side'], mood: 'quiet streets, three kinds of house', dist: 300, azimuth: 160}},
 {id: 'anis-side', n: 'H5', zone: 'anis-side', name: "Ani's side", bearing: 300, pin: '\u{1F986}', heroes: ['horn', 'ani', 'aniTree', 'launch'], houses: 40, look: ZONE_LOOK['anis-side']},
 {id: 'abbie-daddy-side', n: 'H6', zone: 'abbie-daddy-side', name: "Abbie and Daddy's side", bearing: 0, pin: '\u{1F3E1}', heroes: ['home', 'abbieTree', 'muraco', 'leonard'], houses: 28, look: ZONE_LOOK['abbie-daddy-side']},
 {id: 'gingerbread-hill', n: 'H7', zone: 'abbie-daddy-side', name: 'Gingerbread Hill', bearing: 60, heroes: ['gingerbread', 'bunker'], houses: 8, walls: 1, look: {...ZONE_LOOK['abbie-daddy-side'], bg: '#f4bfc6', mood: 'sugar-pink sunset on the hill, a pond below', azimuth: 225}},
];
const tileOff = d => d.bearing == null ? {x: 0, y: 0} : {x: Math.sin(d.bearing * Math.PI / 180) * DIO_R * R3, y: Math.cos(d.bearing * Math.PI / 180) * DIO_R * R3}; // local metres, north up
// places that are not in the town's own list yet: where they really are (map metres)
const EXTRA = {highschool: [4376, 2020], noticeboard: [4404, 1996], skatepark: [4452, 2030], depot: [4106, 939], railyard: [4296, 504], mill: [4216, 864], dock: [5904, 1174], lookout: [5670, 1270], trailhead: [3396, 1222], launch: [3760, 2860], gingerbread: [5636, 2265], bunker: [5700, 2250], bakery: [4350, 2040], abbieTree: [4740, 3600], aniTree: [3350, 2860]};
// hero places: model scale on the tile, footprint radius for the layout, and how the place sits (shop = hugs the street, fixed = where it really is, rail = beside the line, keepRot = its own builder turns it)
const HERO = {cafe: {sc: .85, r: 12, shop: 1}, bakery: {sc: .85, r: 12, shop: 1}, comellas: {sc: .85, r: 12, shop: 1}, hoagies: {sc: .85, r: 12, shop: 1}, lab: {sc: .85, r: 12, shop: 1}, common: {sc: .55, r: 19}, ginn: {sc: .5, r: 21},
 muraco: {sc: .5, r: 21}, leonard: {sc: .5, r: 29}, horn: {sc: .6, r: 16, fixed: 1, keepRot: 1}, home: {sc: .8, r: 22}, ani: {sc: .8, r: 22},
 highschool: {sc: .62, r: 20, fixed: 1}, depot: {sc: .75, r: 22, rail: 1}, railyard: {sc: .62, r: 20, rail: 1}, mill: {sc: .8, r: 15}, dock: {sc: .8, r: 7, fixed: 1, keepRot: 1, shore: 1}, lookout: {sc: .8, r: 8, fixed: 1},
 trailhead: {sc: .8, r: 6}, noticeboard: {sc: .8, r: 5}, skatepark: {sc: .8, r: 17, shop: 1}, launch: {sc: .75, r: 20}, abbieTree: {sc: .6, r: 17}, aniTree: {sc: .6, r: 17}, gingerbread: {sc: 1, r: 17, fixed: 1}, bunker: {sc: 1, r: 14, fixed: 1, behind: 'gingerbread'}};
const realLayer = scene.children.filter(c => !c.isLight && c.type !== 'Object3D'); // the whole real-land map (terrain, water, roads, houses, islands): everything in the scene before the board exists
const dioGroup = new THREE.Group(); dioGroup.position.set(X(DIO_ORIGIN[0]), 0, Z(DIO_ORIGIN[1])); scene.add(dioGroup); dioGroup.visible = false;
const SQUARE = /*SQUARE*/null; const dioHouses = {}, dioObs = {}, dioRoads = {}, dioSpots = {}, dioTiles = {}, stageFrames = [], scenes = {}; let lockOrbit = false;
const dioTile = {}; // id -> {cx, cy (map metres of the tile's middle), group, ...}
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const inHex = (x, y, R) => { const ax = Math.abs(x), ay = Math.abs(y); return ay <= R * R3 / 2 && ax <= R - ay / R3; }; // flat-top, corners east and west

function buildDiorama(d, ti) {
 const out = new THREE.Group(), tileC = tileOff(d); // local metres, north up
 out.position.set(tileC.x, 0, -tileC.y); dioGroup.add(out);
 const scl = BOARD.side / DIO_R; d.centre = [BOARD.centre[0] + tileC.x * scl, BOARD.centre[1] + tileC.y * scl];
 const vk = boardVk, L = d.look, real = (px, py) => [d.centre[0] + px * scl, d.centre[1] + py * scl], hmin = boardHmin; // one squeeze for every hex, so heights meet at the edges
 // 1 the land, squeezed: heights from the real contours, lakes where the real lakes are
 const lvlAt = (px, py) => { const [rx, ry] = real(px, py), w = land.waterAt(rx, ry); return w; };
 const raw0 = (px, py) => { const [rx, ry] = real(px, py), w = land.waterAt(rx, ry); return isNaN(w) ? (land.heightAt(rx, ry) - hmin) * vk + 3.2 : (w - hmin) * vk + 3.2 - 2.6; };
 const waterY = (px, py) => { const [rx, ry] = real(px, py), w = land.waterAt(rx, ry); return isNaN(w) ? NaN : (w - hmin) * vk + 3.2 + .05; };
 // 2 the roads of the tile (main roads, real; scaled), clipped to the hex
 const roads = [];
 for (const r of town.roads) { let run = []; for (const [x, y] of r.p) { const px = (x - d.centre[0]) / scl, py = (y - d.centre[1]) / scl; if (inHex(px, py, DIO_R * .97)) run.push([px, py]); else { if (run.length > 1) roads.push({c: r.c, p: run}); run = []; } } if (run.length > 1) roads.push({c: r.c, p: run}); }
 dioRoads[d.id] = roads;
 const roadPts = []; for (const r of roads) for (let i = 1; i < r.p.length; i++) { const [ax, ay] = r.p[i - 1], [bx, by] = r.p[i], l = Math.hypot(bx - ax, by - ay); for (let t = 0; t < l; t += 3) roadPts.push({x: ax + (bx - ax) * t / l, y: ay + (by - ay) * t / l, w: r.c <= 3 ? 5.4 : 4.2, tx: (bx - ax) / l, ty: (by - ay) / l}); }
 const nearRoad = (x, y) => { let b = null, bd = 1e9; for (const p of roadPts) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < bd) { bd = dd; b = p; } } return b && {...b, d: bd}; };
 // 3 the places, pushed together: start where they really are, then keep them apart and off the street
 const heroes = d.heroes.map(id => { const s = town.spots.find(p => p.id === id) || {id, x: EXTRA[id][0], y: EXTRA[id][1], z: land.heightAt(EXTRA[id][0], EXTRA[id][1]), face: 0}, H = HERO[id]; return {id, s, H, x: (s.x - d.centre[0]) / scl, y: (s.y - d.centre[1]) / scl, r: H.r}; });
 { const main = (() => { // Main Street: the busiest main road nearest the common, for the shops to line up along
   const c = heroes.find(h => h.id === 'common'); if (!c) return null; let best = null; for (const r of roads) if (r.c <= 3) for (const p of r.p) { const dd = Math.hypot(p[0] - c.x, p[1] - c.y); if (!best || dd < best.d) best = {d: dd, road: r}; } return best && best.road; })();
  if (main) { const pts = main.p, along = (t) => { let run = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (t <= run + l || i === pts.length - 1) { const k = (t - run) / l; return {x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, tx: (pts[i][0] - pts[i - 1][0]) / l, ty: (pts[i][1] - pts[i - 1][1]) / l}; } run += l; } };
   let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
   const c = heroes.find(h => h.id === 'common'); let t0 = total / 2, bd = 1e9; for (let t = 0; t < total; t += 2) { const a = along(t), dd = Math.hypot(a.x - c.x, a.y - c.y); if (dd < bd) { bd = dd; t0 = t; } }
   const school = heroes.find(h => h.id === 'highschool'), put = sh => { [['cafe', 1, -14], ['bakery', 1, 30], ['comellas', 1, 8], ['hoagies', -1, -14], ['skatepark', 1, -48]].forEach(([id, side, off]) => { const h = heroes.find(q => q.id === id); if (!h) return; const a = along(t0 + sh + off + 22), lat = id === 'skatepark' ? 22 : 12; h.x = a.x - a.ty * side * lat; h.y = a.y + a.tx * side * lat; h.shop = {tx: a.tx, ty: a.ty, side}; h.pinned = true; });
    if (c) { const a = along(t0 + sh), side = -1; c.x = a.x - a.ty * side * 40; c.y = a.y + a.tx * side * 40; } };
   let sh = 0; put(sh); // the high school stands at the middle where the zones meet: slide the shop row down the street until it clears
   if (school) for (; sh < 90; sh += 4) { put(sh); if (heroes.every(h => !h.shop || Math.hypot(h.x - school.x, h.y - school.y) > school.r + h.r + 3)) break; } } }
 for (let it = 0; it < 120; it++) for (const a of heroes) { if (a.H.fixed || a.pinned) continue;
  for (const b of heroes) if (a !== b) { const dx = a.x - b.x, dy = a.y - b.y, dd = Math.hypot(dx, dy) || .01, need = a.r + b.r + 5; if (dd < need) { const k = (need - dd) / (b.H.fixed || b.pinned ? 1 : 2); a.x += dx / dd * k; a.y += dy / dd * k; } }
  const nr = nearRoad(a.x, a.y); if (nr && !a.shop && nr.d < a.r + nr.w / 2 + 2) { const k = a.r + nr.w / 2 + 2 - nr.d, dx = a.x - nr.x, dy = a.y - nr.y, dd = Math.hypot(dx, dy) || 1; a.x += dx / dd * k * .5; a.y += dy / dd * k * .5; }
  const e = Math.hypot(a.x, a.y), lim = DIO_R * .74 - a.r * .3; if (e > lim) { a.x *= lim / e; a.y *= lim / e; } }
 const faceOf = h => { if (h.shop) return Math.atan2(h.shop.ty * h.shop.side, h.shop.tx * h.shop.side); const nr = nearRoad(h.x, h.y); return nr && nr.d < 60 ? Math.atan2(nr.x - h.x, -(nr.y - h.y)) : (h.s.face || 0); };
 const nearWater = (x, y, from = 3, to = 90) => { for (let r = from; r < to; r += 3) for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!isNaN(waterY(px, py))) return {x: px, y: py, r}; } return null; };
 for (const h of heroes) if (h.H.shore) { const wp = nearWater(h.x, h.y, 0); if (wp && wp.r < h.r + 8) { const dx = h.x - wp.x, dy = h.y - wp.y, dl = Math.hypot(dx, dy) || 1, k = h.r + 8 - wp.r; h.x += dx / dl * k; h.y += dy / dl * k; } } // the dock's pad stays on the bank, the pier runs out over the water
 for (const h of heroes) if (h.H.behind) { const m = heroes.find(q => q.id === h.H.behind); if (m) { const f = faceOf(m); h.x = m.x - Math.sin(f) * 15; h.y = m.y + Math.cos(f) * 15; h.rot = f; } } // the bunker door is behind the Gingerbread House
 // plateau heights: each place sits on a level pad cut into the squeezed land
 const pads = heroes.map(h => ({h, ph: Math.max(raw0(h.x, h.y), (isNaN(waterY(h.x, h.y)) ? 0 : waterY(h.x, h.y)) + .6, 3.5)}));
 const hf = (px, py) => { let h = raw0(px, py); const nE = Math.max(Math.abs(py) * 2 / (DIO_R * R3), (Math.abs(px) + Math.abs(py) / R3) / DIO_R), fade = 1 - smooth((nE - .82) / .18); // pads fade out toward the hex edge so neighbouring hexes meet at the same height
  if (fade > 0) for (const p of pads) { const dd = Math.hypot(px - p.h.x, py - p.h.y), edge = p.h.r + 5; if (dd < edge + 9) h += (p.ph - h) * smooth(1 - (dd - edge) / 9) * fade; } return h; };
 // 4 the ground: a hex of triangles
 const verts = [], idx = [], key = (q, r) => q + ',' + r, map = new Map(), step = DIO_R / DIO_N;
 for (let q = -DIO_N; q <= DIO_N; q++) for (let r = Math.max(-DIO_N, -q - DIO_N); r <= Math.min(DIO_N, -q + DIO_N); r++) { const lx = (q + r / 2) * step, ly = r * Math.sqrt(3) / 2 * step, px = lx, py = ly; map.set(key(q, r), verts.length); verts.push({px, py, h: hf(px, py), w: waterY(px, py)}); }
 // one pass over the lattice, one cell past the corner, so the triangles along the lower-left side are not dropped
 for (let q = -DIO_N - 1; q <= DIO_N; q++) for (let r = -DIO_N - 1; r <= DIO_N; r++) { const v = (a, b) => map.get(key(a, b)); const A = v(q, r), B = v(q + 1, r), C = v(q, r + 1), D = v(q + 1, r + 1);
  if (A !== undefined && B !== undefined && C !== undefined) idx.push(A, B, C); if (B !== undefined && C !== undefined && D !== undefined) idx.push(B, D, C); }
 const pos = new Float32Array(verts.length * 3), cols = new Float32Array(verts.length * 3), c0 = new THREE.Color(L.grass[0]), c1 = new THREE.Color(L.grass[1]), cw = new THREE.Color('#d8c590'), cc = new THREE.Color();
 verts.forEach((v, i) => { pos.set([v.px, v.h, -v.py], i * 3); const wet = !isNaN(v.w), t = .5 + .5 * Math.sin(v.px * .21) * Math.cos(v.py * .17); cc.copy(c0).lerp(c1, Math.max(0, Math.min(1, (v.h - 3) / 22 * .6 + t * .4))); if (wet && v.h < v.w + .5) cc.copy(cw); cols.set([cc.r, cc.g, cc.b], i * 3); });
 const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.setIndex(idx); geo.computeVertexNormals();
 const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .95, flatShading: true})); ground.receiveShadow = true; out.add(ground);
 // the water: any triangle that touches a real lake; depth drives colour, foam and opacity, ripples and glints move with time
 { const wi = []; for (let i = 0; i < idx.length; i += 3) if ([0, 1, 2].some(k => !isNaN(verts[idx[i + k]].w))) wi.push(idx[i], idx[i + 1], idx[i + 2]);
  if (wi.length) { const wp = new Float32Array(verts.length * 3), dp = new Float32Array(verts.length); verts.forEach((v, i) => { const wet = !isNaN(v.w); wp.set([v.px, wet ? v.w : v.h + .02, -v.py], i * 3); dp[i] = wet ? Math.max(0, v.w - v.h) : 0; });
   const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3)); wg.setAttribute('depth', new THREE.BufferAttribute(dp, 1)); wg.setIndex(wi); wg.computeVertexNormals(); const wm = new THREE.Mesh(wg, waterMaterial()); wm.receiveShadow = true; wm.renderOrder = 2; out.add(wm); } }
 // the tile's edge: soil down to a plinth, as every Abbie's World tile
 { const used = new Map(); for (let i = 0; i < idx.length; i += 3) for (let k = 0; k < 3; k++) { const a = idx[i + k], b = idx[i + (k + 1) % 3], kk = a < b ? a + '_' + b : b + '_' + a; used.set(kk, (used.get(kk) || 0) + 1); }
  const sv = []; for (const [kk, n] of used) if (n === 1) { const [a, b] = kk.split('_').map(Number), A = verts[a], B = verts[b]; sv.push(A.px, A.h, -A.py, B.px, B.h, -B.py, B.px, -4, -B.py, A.px, A.h, -A.py, B.px, -4, -B.py, A.px, -4, -A.py); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3)); sg.computeVertexNormals(); const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({color: L.soil, roughness: 1, side: THREE.DoubleSide, flatShading: true})); out.add(sm);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(DIO_R * 1.02, DIO_R * 1.02, 3.2, 6), M('#3a3340')); plinth.rotation.y = Math.PI / 6; plinth.position.y = -5.6; out.add(plinth); }
 // 5 ribbons: streets, with brick pavements downtown
 const dr = (pts, w, lift) => { const Lp = []; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], l = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(l / 3)); for (let k = i === 1 ? 0 : 1; k <= n; k++) Lp.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
  const v = [], ix = []; for (let k = 0; k < Lp.length; k++) { const a = Lp[Math.max(0, k - 1)], b = Lp[Math.min(Lp.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2, [x, y] = Lp[k], h = hf(x, y) + lift; v.push(x + nx, h, -(y + ny), x - nx, h, -(y - ny)); if (k) { const o = (k - 1) * 2; ix.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(ix); g.computeVertexNormals(); return g; };
 const addRibbons = (list, w, lift, color, rough = .9) => { if (!list.length) return; const m = new THREE.Mesh(merge(list.map(p => dr(p, w, lift))), M(color, {roughness: rough})); m.receiveShadow = true; out.add(m); };
 const mainR = roads.filter(r => r.c <= 3).map(r => r.p), smallR = roads.filter(r => r.c === 4).map(r => r.p);
 const lanesIn = []; for (const l of town.lanes) { let run = []; for (const [x, y] of l.p) { const px = (x - d.centre[0]) / scl, py = (y - d.centre[1]) / scl; if (inHex(px, py, DIO_R * .9)) run.push([px, py]); else { if (run.length > 1) lanesIn.push(run); run = []; } } if (run.length > 1) lanesIn.push(run); }
 if (d.id === 'downtown') addRibbons(mainR, 9.4, .22, '#b5654a'); // brick pavements either side of Main Street
 addRibbons(mainR, 5.6, .32, d.id === 'downtown' ? '#7b7468' : '#66686c'); addRibbons(smallR, 4.2, .3, '#6a6c6f'); addRibbons(lanesIn, 3.4, .28, '#6a6c6f');
 const railIn = []; for (const r of land.raw.rail) { let run = []; for (const [x, y] of r) { const px = (x - d.centre[0]) / scl, py = (y - d.centre[1]) / scl; if (inHex(px, py, DIO_R * .97)) run.push([px, py]); else { if (run.length > 1) railIn.push(run); run = []; } } if (run.length > 1) railIn.push(run); }
 addRibbons(railIn, 3.6, .36, '#8b7f72', 1); addRibbons(railIn, 1.1, .5, '#4a4440', .5);
 // 6 the places themselves, built at cartoon size on their pads
 const realG = G, realCafe = cafe;
 for (const p of pads) { const h = p.h, g = new THREE.Group(), s = {...h.s, z: 0, flat: true}; G = {heightAt: () => 0, raw: {water: [{n: 'Horn Pond', lvl: ((land.raw.water.filter(w => /horn pond/i.test(w.n)).map(w => w.lvl)[0] ?? hmin) - hmin) * vk + 3.2 - p.ph}]}};
  if (h.H.shore) { const wp = nearWater(h.x, h.y, 0); if (wp) { let sx = 0, sy = 0, n = 0; for (let r = 4; r < 70; r += 4) for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, px = h.x + Math.cos(a) * r, py = h.y + Math.sin(a) * r; if (!isNaN(waterY(px, py))) { sx += px - h.x; sy += py - h.y; n++; } } s.drop = p.ph - waterY(wp.x, wp.y); g.rotation.y = n > 6 ? Math.atan2(-sx, sy) : Math.atan2(-(wp.x - h.x), wp.y - h.y); } } // out over the middle of the nearest water // face the water, and say how far it lies below the pad
  BUILD[h.id]?.(g, s); const local = new THREE.Group(); local.add(g); local.scale.setScalar(h.H.sc); local.position.set(h.x, p.ph, -h.y); out.add(local);
  if (!h.H.keepRot) { let rot = h.rot ?? faceOf(h); if (h.H.rail) { let b = null, bd = 1e9; for (const run of railIn) for (let i = 1; i < run.length; i++) { const mx = (run[i][0] + run[i - 1][0]) / 2, my = (run[i][1] + run[i - 1][1]) / 2, dd = Math.hypot(mx - h.x, my - h.y); if (dd < bd) { bd = dd; b = Math.atan2(run[i][1] - run[i - 1][1], run[i][0] - run[i - 1][0]); } } if (b != null) rot = b; } local.rotation.y = rot; } // beside the line: its long side runs along the nearest rail
  (dioSpots[d.id] ||= {})[h.id] = {x: h.x, z: -h.y, y: p.ph, facing: local.rotation.y, g: local}; if (h.id === 'cafe') { dioCafes.push(cafe); } }
 G = realG; cafe = realCafe;
 // 7 houses of the real mix, thinned and set along the streets
 const taken = [...pads.map(p => ({x: p.h.x, y: p.h.y, r: p.h.r + 6}))], mine = [];
 let cds = null; if (d.id === 'anis-side') { const an = pads.find(p => p.h.id === 'ani'); if (an) { let best = null;
   for (const r of [44, 52, 38]) for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12, px = an.h.x + Math.cos(a) * r, py = an.h.y + Math.sin(a) * r; if (!inHex(px, py, DIO_R * .7) || !isNaN(waterY(px, py))) continue;
    let bad = false; for (let q = 0; q < 12; q++) { const ex = px + Math.cos(q * .52) * 24, ey = py + Math.sin(q * .52) * 24; if (!isNaN(waterY(ex, ey)) || !inHex(ex, ey, DIO_R * .9)) bad = true; } if (bad) continue;
    if (pads.some(p => p !== an && Math.hypot(p.h.x - px, p.h.y - py) < p.h.r + 26)) continue; const nr = nearRoad(px, py); if (!nr || nr.d > 70) continue; const hs = Math.abs(hf(px + 20, py) - hf(px - 20, py)) + Math.abs(hf(px, py + 20) - hf(px, py - 20)); const sc0 = nr.d + hs * 3; if (!best || sc0 < best.s) best = {px, py, s: sc0, nr}; }
   if (best) { cds = {px: best.px, py: best.py, nr: best.nr}; taken.push({x: best.px, y: best.py, r: 30}); } } }
 if (d.id === 'downtown') { // the town square: the real outline of the buildings around the common (public footprints, shapes only), shrunk to cartoon scale
  const cp = pads.find(p => p.h.id === 'common'); if (cp) { const K = .21, grp = new THREE.Group(), WALL = ['#b5604a', '#d9c9a4', '#c9c0ae', '#e0c070', '#a9735a', '#cfd6cf'], ROOF = ['#5a4a40', '#6b5648', '#4a4f55'];
   SQUARE.buildings.forEach((b, i) => { const sh = new THREE.Shape(b.p.map(([x, y]) => new THREE.Vector2(x * K, y * K))), hgt = b.a > 1500 ? 7 : 3.4 + (i * 37 % 10) / 5, hs = (i * 53 % 17) / 17;
    const gx = cp.h.x + b.p.reduce((s, p) => s + p[0], 0) / b.p.length * K, gy = cp.h.y + b.p.reduce((s, p) => s + p[1], 0) / b.p.length * K; if (!inHex(gx, gy, DIO_R * .9) || pads.some(q => q !== cp && Math.hypot(gx - q.h.x, gy - q.h.y) < q.h.r + 3)) return;
    const geo = new THREE.ExtrudeGeometry(sh, {depth: hgt, bevelEnabled: false}).rotateX(-Math.PI / 2), m = new THREE.Mesh(geo, hkM(WALL[i % WALL.length])), cap = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth: .5, bevelEnabled: false}).rotateX(-Math.PI / 2), hkM(ROOF[i % ROOF.length]));
    const ey = hf(gx, gy); for (const o of [m, cap]) { o.position.set(cp.h.x, ey - .3, -cp.h.y); o.castShadow = o.receiveShadow = true; } cap.position.y = ey - .3 + hgt; grp.add(m, cap); taken.push({x: gx, y: gy, r: Math.sqrt(b.a) * K * .5 + 3}); });
   out.add(grp); } }
 for (const h of town.houses.slice().sort((a, b) => Math.hypot(a.x - d.centre[0], a.y - d.centre[1]) - Math.hypot(b.x - d.centre[0], b.y - d.centre[1]))) {
  const px = (h.x - d.centre[0]) / scl, py = (h.y - d.centre[1]) / scl; if (!inHex(px, py, DIO_R * .88)) continue; const wy = waterY(px, py); if (!isNaN(wy)) continue;
  const nr = nearRoad(px, py); if (nr && nr.d < nr.w / 2 + 4.6) continue; if (taken.some(t => Math.hypot(t.x - px, t.y - py) < (t.r || 9.5))) continue; if (h.fam === 'shop' && d.id !== 'downtown') continue;
  taken.push({x: px, y: py, r: 9.5}); mine.push({...h, px, py, hz: hf(px, py)}); if (mine.length > (d.houses ?? 70)) break; }
 { const yaw = h => Math.atan2(h.fx, -h.fy), HS = .66, grp = new THREE.Group(); out.add(grp);
  const kit = mine.filter(h => h.fam !== 'shop'); // the real mix, rebuilt as the nine-type kit; shops stay as the instanced blocks
  kit.forEach((h, i) => { const hs = Math.abs(Math.sin(h.px * 12.9 + h.py * 78.2)) , {tier, type} = houseType(h, hs), g = buildHouse(type, tier, h.w * HS, h.d * HS, Math.max(4.2, h.h * HS), h.wall, h.roofc, hs); g.position.set(h.px, h.hz - .2, -h.py); g.rotation.y = yaw(h); grp.add(g); (dioHouses[d.id] ||= []).push({x: h.px, z: -h.py, y: h.hz, type, tier, yaw: yaw(h)}); });
  mine.splice(0, mine.length, ...mine.filter(h => h.fam === 'shop'));
  for (const fam of Object.keys(BODY)) { const list = mine.filter(h => h.fam === fam); if (list.length) grp.add(inst(boxGeo, BODY[fam], list, h => { v3.set(h.px, h.hz - .3, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS, (h.h + .3) * HS, h.d * HS); col.set(h.wall); })); }
  const gab = mine.filter(h => h.roof === 'gable' || h.roof === 'steep'), hip = mine.filter(h => h.roof === 'hip'), flat = mine.filter(h => h.roof === 'flat');
  grp.add(inst(gableGeo, roofMat, gab, h => { v3.set(h.px, h.hz + h.h * HS, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS * 1.06, h.d * .5 * h.pitch * 1.1 * HS, h.d * HS * 1.1); col.set(h.roofc); }));
  grp.add(inst(hipGeo, roofMat, hip, h => { v3.set(h.px, h.hz + h.h * HS, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS * 1.08, h.d * .5 * h.pitch * 1.4 * HS, h.d * HS * 1.08); col.set(h.roofc); }));
  grp.add(inst(boxGeo, roofMat, flat, h => { v3.set(h.px, h.hz + h.h * HS, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS * 1.03, .6, h.d * HS * 1.03); col.set(h.fam === 'shop' ? '#d9cbb0' : h.roofc); }));
  const chim = mine.filter(h => h.chimney); grp.add(inst(boxGeo, plainMat, chim, h => { const a = yaw(h), o = h.w * HS * .32; v3.set(h.px + Math.cos(a) * o, h.hz + h.h * HS, -h.py - Math.sin(a) * o); q.setFromEuler(e.set(0, a, 0)); sc.set(.9, h.d * HS * .5 * h.pitch + 1.8, .9); col.set('#8a4a36'); })); }
 // 8 trees, thinned, in the zone's colours
 { const T = [], spots = taken.slice(); for (const t of town.trees) { const px = (t.x - d.centre[0]) / scl, py = (t.y - d.centre[1]) / scl; if (!inHex(px, py, DIO_R * .94) || !isNaN(waterY(px, py))) continue; const nr = nearRoad(px, py); if (nr && nr.d < nr.w / 2 + 2) continue;
   if (spots.some(o => Math.hypot(o.x - px, o.y - py) < (o.tree ? 3.2 : (o.r || 8) * .8))) continue; spots.push({x: px, y: py, tree: 1}); T.push({...t, px, py, hz: hf(px, py)}); if (T.length > 520) break; } dioObs[d.id] = spots;
  const grp = new THREE.Group(), broad = T.filter(t => t.kind !== 'pine'), pine = T.filter(t => t.kind === 'pine'), tint = new THREE.Color(L.grass[1]);
  grp.add(inst(TREE_HI.trunk, plainMat, broad, t => { v3.set(t.px, t.hz, -t.py); q.identity(); sc.set(.7 * t.s, 2.6 * t.s, .7 * t.s); col.set('#6b4f36'); }));
  grp.add(inst(TREE_HI.crown, leafMat, broad, t => { v3.set(t.px, t.hz + 3.6 * t.s, -t.py); q.setFromEuler(e.set(t.px % 1, t.py % 3, 0)); sc.set(2.6 * t.s, 2.9 * t.s, 2.6 * t.s); col.set(t.c); }));
  grp.add(inst(TREE_HI.pine, leafMat, pine, t => { v3.set(t.px, t.hz + .4, -t.py); q.identity(); sc.set(1.9 * t.s, 8 * t.s, 1.9 * t.s); col.set(t.c); })); out.add(grp); }
 { const poles = [], heads = []; for (const r of mainR) walk(r, 30, (x, y, tx, ty) => { if (!inHex(x, y, DIO_R * .9) || !isNaN(waterY(x, y))) return; const s = poles.length % 2 ? 1 : -1, px = x - ty * s * 4.2, py = y + tx * s * 4.2; if (taken.some(t => Math.hypot(t.x - px, t.y - py) < (t.r || 6) * .5)) return; poles.push({px, py, hz: hf(px, py)}); });
  const lg = new THREE.Group(), pm = new THREE.MeshStandardMaterial({color: '#2f3a3a', roughness: .6}), hm = new THREE.MeshStandardMaterial({color: '#ffe3a0', emissive: '#ffcf70', emissiveIntensity: .9});
  lg.add(inst(HK.cyl, pm, poles, p => { v3.set(p.px, p.hz, -p.py); q.identity(); sc.set(.12, 3.8, .12); col.set('#ffffff'); }), inst(new THREE.IcosahedronGeometry(1, 1), hm, poles, p => { v3.set(p.px, p.hz + 4, -p.py); q.identity(); sc.set(.42, .5, .42); col.set('#ffffff'); }), inst(boxGeo, pm, poles, p => { v3.set(p.px, p.hz + 3.7, -p.py); q.identity(); sc.set(.6, .1, .6); col.set('#ffffff'); })); out.add(lg); }
 // 9 what only this place has
 decorate(out, {houses: dioHouses[d.id], hf, nearRoad, waterY, verts, taken, walls: d.walls, laneLines: lanesIn.concat(smallR)});
 DRESS[d.id]?.(out, {hf, pads, roads, nearRoad, waterY, mainR, verts, taken, cds, lanes: lanesIn.concat(smallR)});
 return {group: out, hf, pads, tile: tileC, roads, verts};
}

function stripMesh(pts, width, color, yAt) { // a flat road strip along points {x, z}, laid on the ground by yAt(x, z)
 const pos = [], idx = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1, nx = -tz / l * width / 2, nz = tx / l * width / 2;
  pos.push(pts[i].x + nx, yAt(pts[i].x + nx, pts[i].z + nz), pts[i].z + nz, pts[i].x - nx, yAt(pts[i].x - nx, pts[i].z - nz), pts[i].z - nz); if (i) { const k = i * 2; idx.push(k - 2, k + 1, k - 1, k - 2, k, k + 1); } }
 const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const m = new THREE.Mesh(g, hkM(color)); m.receiveShadow = true; return m; }

const waterU = {uWT: {value: 0}}; // water time, advanced in dioFrame
function waterMaterial() { // shallow turquoise to deep blue by depth, a foam line on the shore, drifting ripples and glints
 const m = new THREE.MeshStandardMaterial({color: '#3f9ac0', roughness: .12, metalness: .12, transparent: true, depthWrite: false});
 m.onBeforeCompile = sh => { sh.uniforms.uWT = waterU.uWT;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float depth; varying float vDepth; varying vec3 vWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvDepth = depth; vWP = (modelMatrix * vec4(position, 1.0)).xyz;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWT; varying float vDepth; varying vec3 vWP;')
   .replace('#include <color_fragment>', `#include <color_fragment>
    float dd = clamp(vDepth / 3.2, 0.0, 1.0);
    vec3 shallow = vec3(0.56, 0.86, 0.80), mid = vec3(0.25, 0.60, 0.76), deep = vec3(0.10, 0.34, 0.55);
    vec3 wc = mix(shallow, mid, smoothstep(0.0, 0.45, dd)); wc = mix(wc, deep, smoothstep(0.4, 1.0, dd));
    float rip = sin(vWP.x * 1.3 + uWT * 1.1) * sin(vWP.z * 1.1 - uWT * .9) + sin((vWP.x + vWP.z) * 2.3 + uWT * 1.7) * .5;
    float foam = (1.0 - smoothstep(0.05, 0.55 + rip * .12, vDepth)) * (0.7 + 0.3 * sin(vWP.x * 3.0 + vWP.z * 2.0 + uWT * 2.0));
    diffuseColor.rgb = mix(wc, vec3(0.97, 0.99, 1.0), clamp(foam, 0.0, 1.0));
    diffuseColor.a = mix(0.42, 0.93, smoothstep(0.0, 0.5, dd)) + foam * .3;`)
   .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
    normal = normalize(normal + vec3(sin(vWP.x * 2.1 + uWT * 1.3) * .09, 0.0, cos(vWP.z * 1.9 - uWT * 1.1) * .09));`)
   .replace('#include <opaque_fragment>', `float gl = pow(max(0.0, sin(vWP.x * 5.0 + uWT * 2.2) * sin(vWP.z * 4.6 - uWT * 1.8)), 9.0) * .28; outgoingLight += vec3(gl);
    #include <opaque_fragment>`); };
 return m; }

// hi-fi low-poly trees: lumpy multi-blob crowns, tiered pines, tapered trunks (shared by every tile)
const TREE_HI = (() => { const jit = (g, k) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + .13 * Math.sin(x * 5.1 + k) * Math.cos(z * 4.3 + y * 3.7 + k); p.setXYZ(i, x * n, y * n, z * n); } g.computeVertexNormals(); return g; };
 const blob = (x, y, z, r, k) => jit(new THREE.IcosahedronGeometry(r, 1), k).translate(x, y, z), cone = (r, h, y) => new THREE.ConeGeometry(r, h, 10).translate(0, y + h / 2, 0);
 return {crown: merge([blob(0, 0, 0, 1, 0), blob(.68, -.22, .2, .72, 2), blob(-.62, -.3, -.28, .76, 4), blob(.1, .55, -.42, .62, 6), blob(-.15, .4, .5, .55, 8)]),
  pine: merge([cone(1, .42, 0), cone(.8, .38, .26), cone(.6, .34, .5), cone(.38, .3, .72)]), trunk: new THREE.CylinderGeometry(.16, .3, 1, 8).translate(0, .5, 0)}; })();
const dioCafes = [];

// ---- what only each place has ----
const walk = (poly, every, fn) => { let carry = 0; for (let i = 1; i < poly.length; i++) { const [ax, ay] = poly[i - 1], [bx, by] = poly[i], l = Math.hypot(bx - ax, by - ay), tx = (bx - ax) / l, ty = (by - ay) / l; for (let t = carry; t < l; t += every) fn(ax + tx * t, ay + ty * t, tx, ty); carry = ((carry - l) % every + every) % every; } };
const DRESS = {
 downtown(out, c) { // Main Street from the photograph: lamps, yellow trees in pits, a red call box, a blue mailbox, a bench, a crosswalk, parked cars
  const g = new THREE.Group(); out.add(g);
  const put = (m, x, y, yaw = 0, h = 0) => { m.position.set(x, c.hf(x, y) + h, -y); m.rotation.y = yaw; g.add(m); return m; };
  const lampM = M('#2b2f33'), glow = M('#ffe2a0', {emissive: '#ffcf70', emissiveIntensity: .8});
  for (const poly of c.mainR) walk(poly, 17, (x, y, tx, ty) => { for (const side of [1, -1]) { const px = x - ty * side * 5.6, py = y + tx * side * 5.6; if (!inHex(px, py, DIO_R * .9)) continue; const lp = new THREE.Group(); const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 3.6, 6), lampM); post.position.y = 1.8; const bulb = new THREE.Mesh(new THREE.SphereGeometry(.38, 8, 6), glow); bulb.position.y = 3.8; lp.add(post, bulb); put(lp, px, py); } });
  const shop = c.pads.find(p => p.h.shop); if (!shop) return;
  const a = shop.h.shop, s = a.side, tx = a.tx, ty = a.ty, nx = -ty, ny = tx, mid = {x: shop.h.x - nx * s * 12, y: shop.h.y - ny * s * 12};
  const pt = (u, v) => [mid.x + tx * u + nx * v, mid.y + ty * u + ny * v], along = Math.atan2(ty, tx), towardStreet = Math.atan2(ty * s, tx * s);
  for (let k = -3; k <= 3; k++) { const b = new THREE.Mesh(boxGeo, M('#f3efe2')); b.scale.set(3, .06, .5); put(b, ...pt(32, k * 0.95), along, .36); } // the painted crosswalk
  const box1 = new THREE.Group(), post = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, 2.2, 6), M('#2a2a2e')), head = new THREE.Mesh(boxGeo, M('#c8322c')); post.position.y = 1.1; head.scale.set(.6, .8, .5); head.position.y = 2.5; box1.add(post, head); put(box1, ...pt(-7, s * 5.4)); // red fire-alarm call box on an iron post
  const mail = new THREE.Mesh(boxGeo, M('#2e5fa8')); mail.scale.set(.9, 1.2, .8); put(mail, ...pt(14, s * 5.4), along, .6); // blue mailbox
  const bench = new THREE.Group(), seat = new THREE.Mesh(boxGeo, M('#6a4a2e')), back = new THREE.Mesh(boxGeo, M('#6a4a2e')); seat.scale.set(2.4, .22, .7); seat.position.y = .6; back.scale.set(2.4, .7, .14); back.position.set(0, 1, -.3); bench.add(seat, back); put(bench, ...pt(-16, s * 5.4), towardStreet);
  for (let k = 0; k < 4; k++) { const car = new THREE.Group(), body = new THREE.Mesh(boxGeo, M(['#b9322c', '#2f5d8a', '#e8e2d0', '#3b6f4a'][k])), cab = new THREE.Mesh(boxGeo, M('#9fb7c6')); body.scale.set(3.6, .9, 1.6); body.position.y = .7; cab.scale.set(1.8, .7, 1.4); cab.position.set(-.2, 1.4, 0); car.add(body, cab); put(car, ...pt(-20 + k * 11, s * 1.9), along); }
  for (let k = 0; k < 7; k++) for (const side of [1, -1]) { const tr = new THREE.Group(), tk = new THREE.Mesh(new THREE.CylinderGeometry(.18, .25, 2.2, 6), M('#6b4f36')), cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 0), M('#e8b932', {flatShading: true})), pit = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .12, 8), M('#4a3f36')); tk.position.y = 1.1; cr.position.y = 3.4; pit.position.y = .06; tr.add(pit, tk, cr); put(tr, ...pt(-33 + k * 11, side * 6.4)); }
 },
 'anis-side'(out, c) { // her cul de sac: a ring road round a green, six houses facing in, a short road out to the street; then the hill by Horn Pond
  if (c.cds) { const {px, py, nr} = c.cds, cy = c.hf(px, py) + .15, g = new THREE.Group(); g.position.set(px, 0, -py); out.add(g);
   const ring = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2; ring.push({x: Math.cos(a) * 11, z: Math.sin(a) * 11}); }
   g.add(stripMesh(ring, 4.2, '#5e5a58', (x, z) => c.hf(px + x, py - z) + .15)); const island = new THREE.Mesh(HK.cyl, hkM('#6fa34a')); island.scale.set(7.5, .5, 7.5); island.position.set(0, cy - .1, 0); island.receiveShadow = true; g.add(island);
   const tr = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), hkM('#d9842f')); tr.position.set(0, cy + 4, 0); tr.castShadow = true; const tk = new THREE.Mesh(HK.cyl, hkM('#6b4f36')); tk.scale.set(.35, 3, .35); tk.position.set(0, cy, 0); g.add(tk, tr);
   const dx = nr.x - px, dy = nr.y - py, dl = Math.hypot(dx, dy) || 1, stem = [], n = Math.max(2, Math.ceil(dl / 6)); for (let i = 0; i <= n; i++) { const t = i / n, x = dx * t * (1 - 11 / dl) + dx / dl * 11, y = dy * t * (1 - 11 / dl) + dy / dl * 11; stem.push({x, z: -y}); }
   g.add(stripMesh(stem, 4.2, '#5e5a58', (x, z) => c.hf(px + x, py - z) + .15));
   const stemAng = Math.atan2(-dy, dx), types = ['colonial', 'cape', 'splitlevel', 'farmhouse', 'colonial', 'cape']; let hi = 0;
   for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; if (Math.abs(((a - stemAng + Math.PI * 3) % (Math.PI * 2)) - Math.PI) > Math.PI - .5) continue; const hx = Math.cos(a) * 20, hz = Math.sin(a) * 20, tp = types[hi++ % types.length], wide = 8.5 + (hi % 3), hh = new THREE.Group();
    hh.add(buildHouse(tp, tp === 'cape' ? 0 : 1, wide, 7, 4.4, ['#e5d8b8', '#c9d6c8', '#e8c9b0', '#d6dbe2', '#e0cf9a'][hi % 5], ['#5a4a40', '#4a4f55', '#6b4a3a'][hi % 3], (hi * .37) % 1)); hh.position.set(hx, c.hf(px + hx, py - hz) - .2, hz); hh.rotation.y = Math.atan2(-hx, -hz); g.add(hh); }
   (dioSpots['anis-side'] ||= {}).culdesac = {x: px, z: -py, y: cy, facing: 0}; }
  // the hill by Horn Pond: the highest ground of the tile, with a cairn, a flag and a bench to look out from
  let best = null; for (const v of c.verts) if (isNaN(v.w) && Math.hypot(v.px, v.py) < DIO_R * .8 && !c.pads.some(p => Math.hypot(v.px - p.h.x, v.py - p.h.y) < p.h.r + 10) && (!best || v.h > best.h)) best = v;
  if (!best) return; const g = new THREE.Group(); g.position.set(best.px, best.h, -best.py); out.add(g);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.9 - i * .08, 0), M(['#9a9a96', '#b3afa6', '#8b8984'][i % 3], {flatShading: true})); r.position.set(Math.cos(i * 1.2) * (i < 4 ? 1.4 : .4), i < 4 ? .5 : 1.4, Math.sin(i * 1.2) * (i < 4 ? 1.4 : .4)); g.add(r); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 5, 5), M('#e8e8e8')); pole.position.y = 3.6; const flag = new THREE.Mesh(boxGeo, M('#2f9ac4')); flag.scale.set(2, 1.1, .08); flag.position.set(1, 5.6, 0); g.add(pole, flag);
  const bench = new THREE.Mesh(boxGeo, M('#6a4a2e')); bench.scale.set(2.4, .25, .7); bench.position.set(-3, .3, 1.5); g.add(bench);
  const hill = out.userData; hill.summit = {x: best.px, y: best.py, h: best.h};
 },
 'gingerbread-hill'(out, c) { // a path of round candies from the shop to the road, lollipop trees along it
  const gb = c.pads.find(p => p.h.id === 'gingerbread'); if (!gb) return; const hx = gb.h.x, hy = gb.h.y, nr = c.nearRoad(hx, hy), cand = ['#f2a7c3', '#f7e08a', '#a9e0c4', '#f6b97a'];
  if (nr) for (let i = 1; i < 12; i++) { const t = i / 12, px = hx + (nr.x - hx) * t, py = hy + (nr.y - hy) * t; if (Math.hypot(px - hx, py - hy) < gb.h.r + 1 || !isNaN(c.waterY(px, py))) continue; const st = new THREE.Mesh(HK.cyl, hkM(cand[i % 4])); st.scale.set(.9, .18, .9); st.position.set(px, c.hf(px, py) + .06, -py); st.receiveShadow = true; out.add(st); }
  for (let i = 0; i < 9; i++) { const a = i * 2.4 + .5, r = 26 + (i % 3) * 7, px = hx + Math.cos(a) * r, py = hy + Math.sin(a) * r; if (!inHex(px, py, DIO_R * .85) || !isNaN(c.waterY(px, py)) || c.pads.some(p => Math.hypot(p.h.x - px, p.h.y - py) < p.h.r + 2)) continue; const nr2 = c.nearRoad(px, py); if (nr2 && nr2.d < 5) continue;
   const y = c.hf(px, py), stick = new THREE.Mesh(HK.cyl, hkM('#f4efe4')); stick.scale.set(.12, 3.2, .12); stick.position.set(px, y, -py); const top = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), hkM(['#e8537a', '#f2a53a', '#6fc4a8', '#a07ae0'][i % 4])); top.scale.y = .35; top.rotation.x = Math.PI / 2; top.position.set(px, y + 3.6, -py); top.rotation.set(Math.PI / 2, 0, 0); top.scale.set(1, 1, .3); top.castShadow = true; out.add(stick, top); }
 },
 'reservoir-hills'(out, c) { // the trail: switchbacks from the dock up to the lookout
  const a = c.pads.find(p => p.h.id === 'dock'), b = c.pads.find(p => p.h.id === 'lookout'); if (!a || !b) return; const pts = [], n = 28, dx = b.h.x - a.h.x, dy = b.h.y - a.h.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI * 4) * 11 * Math.sin(t * Math.PI), px = a.h.x + dx * t + nx * w, py = a.h.y + dy * t + ny * w; pts.push({x: px, z: -py}); }
  out.add(stripMesh(pts, 2.4, '#b59a6a', (x, z) => c.hf(x, -z) + .1));
  for (let i = 3; i < n; i += 5) { const p = pts[i], lg = new THREE.Mesh(HK.cyl, hkM('#6a4a2e')); lg.scale.set(.35, 2.4, .35); lg.rotation.z = Math.PI / 2; lg.position.set(p.x + 1.9, c.hf(p.x, -p.z) + .4, p.z); out.add(lg); }
 },
};

// ---- the view: each region has its own opinion about the pulled-back view (palette, light, lens, tilt, distance) ----
// The pitch-by-zoom curve is the open-land camera's (simulations/land-camera.mjs, AW-STUDY-0018), tuned for each region.
const ORDER_DIO = ['dio-trio', ...DIOS.map(d => 'dio-' + d.id)];
let boardHmin = 0; const boardVk = DIO_R / BOARD.side * BOARD.vex; // one squeeze for the whole board: heights on neighbouring hexes meet at the edge
const boardRaw = (px, py) => { const x = BOARD.centre[0] + px * BOARD.side / DIO_R, y = BOARD.centre[1] + py * BOARD.side / DIO_R, w = land.waterAt(x, y); return isNaN(w) ? (land.heightAt(x, y) - boardHmin) * boardVk + 3.2 : (w - boardHmin) * boardVk + 3.2 - 2.6; }; // ground height anywhere on the board's plane (board metres east, north), beyond its seven hexes too
const BOARD_SLOTS = (() => { const u = b => ({x: Math.sin(b * Math.PI / 180) * DIO_R * R3, y: Math.cos(b * Math.PI / 180) * DIO_R * R3}), o = []; for (let b = 0; b < 360; b += 60) { const a = u(b), c = u(b + 60); o.push({id: 'slot-' + b, x: a.x * 2, y: a.y * 2}, {id: 'slot-' + b + '-' + (b + 60) % 360, x: a.x + c.x, y: a.y + c.y}); } return o; })(); // the twelve hexes touching the seven: room for a Moon tile, a Ranch tile and more
const LOOK_REAL = {bg: '#cfe2ea', sun: '#fff0d6', sunI: 2.4, sunDir: [-600, 900, 400], sky: '#e6f1ff', gnd: '#7a6a4a', hemiI: 1.15, fov: 42, wash: 'real'};
const LOOK_TRIO = {bg: '#ebdccb', sun: '#fff1d8', sunI: 2.4, sunDir: [-500, 900, 500], sky: '#f2efe6', gnd: '#7a6a4a', hemiI: 1.1, fov: 36, dist: 860, azimuth: 180, lowPitch: 34, highPitch: 70, wash: 'trio'};
let viewDio = false, look = LOOK_REAL, dragging = false; const dioC = new THREE.Color(), dioV = new THREE.Vector3(), rad = a => a * Math.PI / 180;
const pitchFor = (dist, L) => rad(L.lowPitch + (L.highPitch - L.lowPitch) * Math.pow(Math.max(0, Math.min(1, Math.log(dist / 40) / Math.log(1100 / 40))), .8));
canvas.addEventListener('pointerdown', () => { dragging = true; }); addEventListener('pointerup', () => { dragging = false; });
function setupDioramas() {
 { let m = Infinity; for (let gx = -BOARD.side * 2; gx <= BOARD.side * 2; gx += 70) for (let gy = -BOARD.side * 2; gy <= BOARD.side * 2; gy += 70) { const x = BOARD.centre[0] + gx, y = BOARD.centre[1] + gy; if (!hexOf(x, y)) continue; const w = land.waterAt(x, y); m = Math.min(m, isNaN(w) ? land.heightAt(x, y) : w); } boardHmin = m; }
 { const P = [[3760, 2860], [4000, 3080], [4450, 3300], [4700, 3500], [5000, 3480], [5300, 3250], [5606, 2295]], L = []; // the Launch Road: a car road from Launch, across the north of Abbie's hex, to Gingerbread Hill
  for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 60); for (let k = i === 1 ? 0 : 1; k <= n; k++) L.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); } town.roads.push({c: 4, p: L, launchRoad: true}); }
 const DV = DIOS.map(buildDiorama);
 DIOS.forEach((d, i) => { const v = DV[i]; dioTiles[d.id] = {hf: v.hf, group: v.group, centre: v.group.position.clone().add(dioGroup.position), spots: dioSpots[d.id] || {}, houses: dioHouses[d.id] || []}; });
 const alias = (to, from, id) => { const A = dioTiles[to], B = dioTiles[from], sp = B.spots[id]; if (!sp) return; A.spots[id] = {...sp, x: sp.x + B.group.position.x - A.group.position.x, z: sp.z + B.group.position.z - A.group.position.z}; }; // the same place, named from the old home tile (the Moon Mission looks it up there)
 alias('abbie-daddy-side', 'gingerbread-hill', 'gingerbread'); alias('abbie-daddy-side', 'gingerbread-hill', 'bunker'); alias('abbie-daddy-side', 'anis-side', 'launch');
 { const T = dioTiles.downtown.spots; if (T.highschool) T.school = {...T.highschool}; if (T.cafe) T.cafeRoof = {...T.cafe, y: T.cafe.y + 7}; } // names the demo flow looks up: the school at the middle, the café's flat roof
 DIOS.forEach((d, i) => { const t = DV[i].tile; spotByID['dio-' + d.id] = {id: 'dio-' + d.id, name: d.name, line: d.look.mood[0].toUpperCase() + d.look.mood.slice(1) + '.', x: DIO_ORIGIN[0] + t.x, y: DIO_ORIGIN[1] + t.y, z: 10}; ICON['dio-' + d.id] = d.pin || ''; });
 spotByID['dio-trio'] = {id: 'dio-trio', name: BOARD.name, line: 'Seven hexes in three places: Downtown, Ani’s side, and Abbie and Daddy’s side.', x: DIO_ORIGIN[0], y: DIO_ORIGIN[1], z: 6}; ICON['dio-trio'] = '⬡';
}
function visitDio(id) {
 const s = spotByID[id], L = id === 'dio-trio' ? LOOK_TRIO : DIOS.find(d => 'dio-' + d.id === id).look; shown = id; current = ORDER_DIO.indexOf(id); look = L;
 const tgt = new THREE.Vector3(X(s.x), s.z, Z(s.y)), pitch = pitchFor(L.dist, L), az = rad(L.azimuth), h = Math.cos(pitch) * L.dist;
 fly = {at: clock.elapsedTime, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(tgt.x + Math.sin(az) * h, tgt.y + Math.sin(pitch) * L.dist, tgt.z - Math.cos(az) * h), t1: tgt};
 clearTimeout(visitDio.t); if (id === 'dio-trio') { bubble.style.opacity = 0; return; } // Evan: no callout card on the whole board
 bubble.innerHTML = `<b>${s.name}</b>${s.line}`; bubble.style.opacity = 1; visitDio.t = setTimeout(() => { bubble.style.opacity = 0; }, 7000);
}
function setView(on) {
 viewDio = on; dioGroup.visible = on; for (const o of realLayer) { if (on) { if (o.userData.realVis === undefined) o.userData.realVis = o.visible; o.visible = false; } else if (o.userData.realVis !== undefined) { o.visible = o.userData.realVis; delete o.userData.realVis; } } // Evan: only the seven-hex Winchester board shows; the old map comes back only if the board view is switched off bubble.classList.toggle('dock', on); bubble.onclick = () => { bubble.style.opacity = 0; }; document.getElementById('dio').setAttribute('aria-pressed', on); document.querySelector('.hud').classList.toggle('dio', on);
 controls.minDistance = on ? 20 : 30; controls.maxDistance = on ? 1400 : 14000;
 if (on) visitDio('dio-trio'); else { look = LOOK_REAL; home(); }
}
document.getElementById('dio').onclick = () => setView(!viewDio);
// ---- the sky: a soft gradient behind the board, driven by the world clock (time of day, season, weather). It is the sky of the
// fiction, drawn first and behind everything, so it can never cover the world. Evan 2026-10-23: "at least try for a simple background".
const SKY_SEASON = {Spring: {top: '#6bb4e6', hor: '#e9f2e0'}, Summer: {top: '#4f9fe0', hor: '#e6f1f7'}, Autumn: {top: '#74a6d2', hor: '#f5dcb8'}, Winter: {top: '#a9bccd', hor: '#eef0f2'}};
const SKY_NIGHT = {top: '#0d1530', hor: '#2a3558'}, SKY_DUSK = '#f0a58a';
const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
 depthTest: false, depthWrite: false, toneMapped: false,
 uniforms: {uTop: {value: new THREE.Color(SKY_SEASON.Autumn.top)}, uHor: {value: new THREE.Color(SKY_SEASON.Autumn.hor)}, uGnd: {value: new THREE.Color('#cfe2ea')}, uCloud: {value: 0.5}, uT: {value: 0}, uInv: {value: new THREE.Matrix4()}, uCam: {value: new THREE.Matrix4()}},
 vertexShader: 'varying vec2 vN; void main(){ vN = position.xy; gl_Position = vec4(position.xy, 1.0, 1.0); }',
 fragmentShader: `varying vec2 vN; uniform vec3 uTop, uHor, uGnd; uniform float uCloud, uT; uniform mat4 uInv, uCam;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
  void main(){
   vec4 v = uInv * vec4(vN, -1.0, 1.0); vec3 d = normalize((uCam * vec4(v.xyz / v.w, 0.0)).xyz);
   float up = smoothstep(-0.03, 0.3, d.y);
   vec3 c = mix(uHor, uTop, up);
   c = mix(c, uGnd, 0.35 * smoothstep(0.1, -0.5, d.y));
   c = mix(c, uTop, 0.3 * (vN.y * 0.5 + 0.5)); // always a little lighter toward the top of the screen, even looking straight down
   float cl = smoothstep(0.55, 0.8, n(vec2(atan(d.x, d.z) * 2.2 + uT * 0.004, d.y * 14.0)) * 0.65 + n(vec2(atan(d.x, d.z) * 5.0 - uT * 0.006, d.y * 30.0)) * 0.35) * smoothstep(0.03, 0.1, d.y) * (1.0 - smoothstep(0.22, 0.5, d.y));
   c = mix(c, mix(uHor, vec3(1.0), 0.6), cl * uCloud);
   gl_FragColor = vec4(c, 1.0);
  }`}));
sky.frustumCulled = false; sky.renderOrder = -1000; sky.name = 'sky'; scene.add(sky);
const skyC = {top: new THREE.Color(), hor: new THREE.Color(), a: new THREE.Color(), dusk: new THREE.Color(SKY_DUSK)}; let skyClock = {daylight: 1, season: 'Autumn', weather: 'Clear', hour: 12};
addEventListener('aw-world-clock', e => { skyClock = e.detail; });
function skyFrame(t) {
 const s = SKY_SEASON[skyClock.season] || SKY_SEASON.Autumn, day = Math.min(1, skyClock.daylight * 2.2); // full sky once the sun is well up
 skyC.top.set(SKY_NIGHT.top).lerp(skyC.a.set(s.top), day); skyC.hor.set(SKY_NIGHT.hor).lerp(skyC.a.set(s.hor), day);
 const glow = Math.max(0, 1 - Math.abs(skyClock.daylight - 0.18) / 0.18) * 0.8; skyC.hor.lerp(skyC.dusk, glow); // dawn and dusk warm the horizon
 const grey = skyClock.weather === 'Rain' ? 0.6 : skyClock.weather === 'Cloudy' ? 0.35 : 0; if (grey) { skyC.top.lerp(skyC.a.set('#8d98a6'), grey * day); skyC.hor.lerp(skyC.a.set('#c9cfd6'), grey * day); }
 const u = sky.material.uniforms; u.uTop.value.copy(skyC.top); u.uHor.value.copy(skyC.hor); u.uGnd.value.copy(scene.background).lerp(skyC.a.set(SKY_NIGHT.hor), 1 - day);
 u.uCloud.value = skyClock.weather === 'Clear' ? 0.55 : 0.9; u.uT.value = t; u.uInv.value.copy(camera.projectionMatrixInverse); u.uCam.value.copy(camera.matrixWorld);
}
function dioFrame(dt, t) {
 skyFrame(t);
 waterU.uWT.value = t;
 const k = 1 - Math.exp(-dt * 3.5), L = window.AbbieTown?.lookFilter?.(look) || look; // lookFilter: a mode (Halloween) grades the zone's look without owning it
 if (WC.zone !== (L.wash || 'off')) WC.setZone(L.wash || 'off'); // each zone's opinion about its own distance
 scene.background.lerp(dioC.set(L.bg), k); hemi.color.lerp(dioC.set(L.sky), k); hemi.groundColor.lerp(dioC.set(L.gnd), k); sun.color.lerp(dioC.set(L.sun), k);
 sun.intensity += (L.sunI - sun.intensity) * k; hemi.intensity += (L.hemiI - hemi.intensity) * k; sunDir.lerp(dioV.set(...L.sunDir), k);
 if (Math.abs(camera.fov - L.fov) > .05) { camera.fov += (L.fov - camera.fov) * k; camera.updateProjectionMatrix(); }
 for (const c of dioCafes) c.key.rotation.y = t;
 for (const f of stageFrames) f(dt, t);
}

// ---- the stage: what other studies (the Moon Mission, the café) mount on. No developer chrome, it only adds to the world layer.
const farGroup = new THREE.Group(); farGroup.position.set(X(land.W + 20000), 0, 0); scene.add(farGroup); // off-map scenes (Launch, orbit, Moon) live out here
function enterScene(id, o = {}) {
 const sc0 = scenes[id]; if (!sc0) return false; if (!viewDio && sc0.region) setView(true);
 const base = sc0.look || (sc0.region ? DIOS.find(d => d.id === sc0.region).look : LOOK_REAL);
 look = {...base, ...(o.look || {}), ...(o.fov ? {fov: o.fov} : {})}; if (o.pitch != null) look.lowPitch = look.highPitch = o.pitch;
 const dist = o.dist || look.dist || 120, pitch = o.pitch != null ? rad(o.pitch) : (look.lowPitch ? pitchFor(dist, look) : rad(50)), az = rad(o.azimuth ?? look.azimuth ?? 180), h = Math.cos(pitch) * dist;
 const tgt = new THREE.Vector3(sc0.world.x, sc0.world.y, sc0.world.z);
 fly = {at: clock.elapsedTime, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(tgt.x + Math.sin(az) * h, tgt.y + Math.sin(pitch) * dist, tgt.z - Math.cos(az) * h), t1: tgt};
 lockOrbit = !!o.lock; controls.enabled = !o.lock; shown = null; window.dispatchEvent(new CustomEvent('abbietown:scene-enter', {detail: {id}})); return true;
}
function exitScene() { lockOrbit = false; controls.enabled = true; window.dispatchEvent(new CustomEvent('abbietown:scene-exit', {detail: {}})); }
function registerScene(r) { // off-map or custom: {id, region:null, anchor:[x,z], facing, bounds, look}
 const off = r.region ? dioTiles[r.region].group.position.clone().add(dioGroup.position) : farGroup.position.clone();
 scenes[r.id] = {...r, world: new THREE.Vector3(off.x + (r.anchor?.[0] || 0), r.y || 0, off.z + (r.anchor?.[1] || 0))}; return scenes[r.id];
}
function mountScene(id, o = {}) {
 const sc0 = scenes[id] || registerScene({id, region: null}), group = new THREE.Group(); group.position.copy(sc0.region ? new THREE.Vector3(0, 0, 0) : farGroup.position);
 (sc0.region ? dioGroup : scene).add(group); const fn = o.onFrame ? (dt, t) => o.onFrame(dt, t) : null; if (fn) stageFrames.push(fn);
 return {group, setMood: m => { look = {...look, ...(m === 'dark' ? {bg: '#10151f', sunI: .5, hemiI: .45, sky: '#26324a'} : {})}; if (m === 'light') look = sc0.look || look; },
  dispose() { group.parent?.remove(group); const i = stageFrames.indexOf(fn); if (i >= 0) stageFrames.splice(i, 1); o.onExit?.(); }};
}
function setupStage() {
 const stage = {THREE, scene, camera, controls, renderer, clock, dioGroup, farGroup, tiles: dioTiles, scenes,
  frame: fn => { stageFrames.push(fn); return () => { const i = stageFrames.indexOf(fn); if (i >= 0) stageFrames.splice(i, 1); }; },
  flyTo: (target, o = {}) => { const v = target.isVector3 ? target : new THREE.Vector3(target.x, target.y || 0, target.z); const dist = o.dist || 120, pitch = rad(o.pitch ?? 50), az = rad(o.azimuth ?? 180), h = Math.cos(pitch) * dist; fly = {at: clock.elapsedTime, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(v.x + Math.sin(az) * h, v.y + Math.sin(pitch) * dist, v.z - Math.cos(az) * h), t1: v.clone()}; },
  setLook: l => { look = {...look, ...l}; }, hideChrome: on => { document.querySelectorAll('.hud').forEach(h => { h.style.display = on ? 'none' : ''; }); /* the toolbar and the year bar */ bubble.style.opacity = on ? 0 : bubble.style.opacity; }};
 const ground = (wx, wz) => { for (const d of DIOS) { const t = dioTiles[d.id], px = wx - t.group.position.x - dioGroup.position.x, py = -(wz - t.group.position.z - dioGroup.position.z); if (inHex(px, py, DIO_R)) return t.hf(px, py) + dioGroup.position.y; } return 0; };
 stage.ground = ground;
 for (const t of Object.values(dioTiles)) for (const sp of Object.values(t.spots)) { const f = sp.facing || 0, ox = Math.sin(f), oz = Math.cos(f); sp.out = {dirX: ox, dirZ: oz}; sp.street = {dirX: oz, dirZ: -ox}; const cx = sp.x + ox * 8.5, cz = sp.z + oz * 8.5; sp.curb = {x: cx, y: t.hf(cx, -cz), z: cz}; }
 // the named scenes: the café curb, the homes, and Launch sit on their tiles
 const at = (tile, hero, extra = {}) => { const sp = dioTiles[tile]?.spots[hero]; if (!sp) return; registerScene({id: extra.id, region: tile, anchor: [sp.x, sp.z], y: sp.y, facing: sp.facing, bounds: extra.bounds || 30}); };
 at('downtown', 'cafe', {id: 'cafe-curb'}); at('downtown', 'bakery', {id: 'bakery-curb'}); at('abbie-daddy-side', 'home', {id: 'abbie-kitchen'}); at('abbie-daddy-side', 'abbieTree', {id: 'treehouse'}); at('anis-side', 'aniTree', {id: 'ani-treehouse'}); at('anis-side', 'ani', {id: 'anis-kitchen'}); at('anis-side', 'launch', {id: 'launch-pad'}); at('downtown', 'skatepark', {id: 'skate-park', bounds: 26}); at('abbie-daddy-side', 'muraco', {id: 'school-door'});
 for (const d of DIOS) { const t = dioTiles[d.id]; scenes['dio-' + d.id] = {id: 'dio-' + d.id, region: d.id, anchor: [0, 0], world: t.centre.clone(), bounds: DIO_R}; }
 // for the cart in the Effect Hunt: what stands near a point (board metres east/north of the middle hex), and where a car may start on a street
 const obstaclesNear = (x, y, r) => { const out = []; for (const d of DIOS) { const o = tileOff(d); for (const t of dioObs[d.id] || []) { const bx = o.x + t.x, by = o.y + t.y, rr = t.tree ? 1.6 : (t.r || 8) * .8; if (Math.hypot(bx - x, by - y) < r + rr) out.push({x: bx, y: by, r: rr, kind: t.tree ? 'tree' : 'building', hex: d.id}); } } return out; };
 const roadSpawns = (every = 30) => { const out = []; for (const d of DIOS) { const o = tileOff(d); for (const rd of dioRoads[d.id] || []) { if (rd.c > 4) continue; let run = 0, next = every / 2; for (let i = 1; i < rd.p.length; i++) { const [ax, ay] = rd.p[i - 1], [bx, by] = rd.p[i], l = Math.hypot(bx - ax, by - ay); while (next <= run + l) { const k = (next - run) / l, px = ax + (bx - ax) * k, py = ay + (by - ay) * k; if (inHex(px, py, DIO_R * .85)) out.push({hex: d.id, x: o.x + px, y: o.y + py, heading: Math.atan2(by - ay, bx - ax), width: rd.c <= 3 ? 5.4 : 4.2}); next += every; } run += l; } } } return out; };
 const board = {name: BOARD.name, hexSide: DIO_R, hexes: DIOS.map(d => ({id: d.id, n: d.n, zone: d.zone, name: d.name})), slots: BOARD_SLOTS, heightAt: boardRaw, obstaclesNear, roadSpawns, tileAt: (px, py) => DIOS.find(d => { const o = tileOff(d); return inHex(px - o.x, py - o.y, DIO_R); })?.id || null}; // board metres east and north of the middle hex
 Object.assign(window.AbbieTown, {board, entrances: ENTRANCES, backUrl, go: (gate, st) => { const e = ENTRANCES[gate]; if (!e || !available(gate, st)) return false; if (e.kind === 'stage') { window.dispatchEvent(new CustomEvent('abbietown:enter', {detail: {gate, scene: e.scene, module: e.module}})); return enterScene(e.scene); } location.href = e.url; return true; }, stage, scenes, enterScene, exitScene, registerScene, mount: mountScene});
 // a generic place for a new tile card: put its group on an open slot and register it like any hex (the same record the Farm builds by hand). group is in tile-local metres (x east, z = -north), hf(px, py) is its own ground height, spots are {x, z, y, facing, g}
 window.AbbieTown.placeTile = (slotId, {id, name, zone = 'board', group, hf, spots = {}, houses = [], scene = null} = {}) => {
  const slot = board.slots.find(q => q.id === slotId); if (!slot || !id || !group || slot.tile || stage.tiles[id] || Object.values(stage.tiles).some(t => t.group && t.group.position && Math.hypot(t.group.position.x - slot.x, t.group.position.z + slot.y) < 1)) return null; // a slot a tile already stands on (the Farm builds its own) is taken
  group.position.set(slot.x, 0, -slot.y); stage.dioGroup.add(group); slot.tile = id;
  const centre = new THREE.Vector3(slot.x, 0, -slot.y).add(stage.dioGroup.position);
  stage.tiles[id] = {hf: hf || ((px, py) => boardRaw(slot.x + px, slot.y + py)), group, centre, spots, houses, slot: slotId};
  if (!board.hexes.some(h => h.id === id)) board.hexes.push({id, n: 'H' + (board.hexes.length + 1), zone, name: name || id});
  if (scene) { try { registerScene({id: scene.id || 'dio-' + id, region: id, anchor: [0, 0], bounds: DIO_R, ...scene}); } catch (e) { console.warn('tile scene', e); } }
  window.dispatchEvent(new CustomEvent('abbietown:tile-placed', {detail: {id, slot: slotId, x: slot.x, y: slot.y}}));
  return stage.tiles[id];
 };
 { const at = new URLSearchParams(location.search).get('at'), e = at && ENTRANCES[at]; // coming back from a game: land at the gate you left by
   if (e && scenes[e.scene]) { setView(true); setTimeout(() => enterScene(e.scene, {dist: 70}), 60); } }
 return stage;
}

