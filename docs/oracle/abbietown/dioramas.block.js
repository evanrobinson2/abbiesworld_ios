// ---------- the three dioramas: Downtown, Ani's side, Abbie and Daddy's side (AW-STUDY-0042, Evan 2026-10-23 2:43 PM) ----------
// "three distinct dioramas indicative of the actual regions, but diorama and cartoon scale." Each is a hex tile of the
// real land (heights, lakes, main roads, the real mix of houses) squeezed to a fifth of a mile across, with the real
// places pushed together and built big. Each has its own look and its own pulled-back camera. The three sit as the three
// regions of the seven-hex structure, beyond the east edge of the real town.
const DIO_R = 105, DIO_N = 44, DIO_ORIGIN = [land.W + 3600, land.D / 2]; // tile circumradius, lattice rings, where the trio's middle is (map metres)
const DIOS = [
 {id: 'downtown', name: 'Downtown', bearing: 180, centre: [4340, 1640], R: 900, vex: 2.4, pin: '⛪', heroes: ['common', 'cafe', 'comellas', 'hoagies', 'lab', 'ginn'],
  look: {bg: '#f3dcbd', sun: '#ffd49a', sunI: 2.7, sunDir: [-520, 520, 620], sky: '#ffe9cf', gnd: '#8a6a4a', hemiI: 1.05, grass: ['#7fa14f', '#a8b45e'], soil: '#8a5a3a', fov: 32, dist: 250, azimuth: 205, lowPitch: 20, highPitch: 54,
   mood: 'a late-afternoon square, brass and brick'}},
 {id: 'anis-side', name: "Ani's side", bearing: 300, centre: [3180, 3020], R: 820, vex: 3.4, pin: '\u{1F986}', heroes: ['horn', 'ani'],
  look: {bg: '#cfe8f1', sun: '#eef4ff', sunI: 2.0, sunDir: [420, 900, -380], sky: '#dff1ff', gnd: '#4d6a5c', hemiI: 1.3, grass: ['#64a07c', '#8bb86a'], soil: '#5d6b4a', fov: 48, dist: 330, azimuth: 150, lowPitch: 30, highPitch: 70,
   mood: 'a cool bright morning by the pond, wide and airy'}},
 {id: 'abbie-daddy-side', name: "Abbie and Daddy's side", bearing: 60, centre: [4930, 3440], R: 820, vex: 2.8, pin: '\u{1F3E1}', heroes: ['home', 'muraco', 'leonard'],
  look: {bg: '#f6c4ad', sun: '#ff9d6a', sunI: 2.9, sunDir: [-800, 360, 120], sky: '#ffd5c2', gnd: '#7a4a5a', hemiI: 1.0, grass: ['#c2a447', '#d98a45'], soil: '#7a4a3a', fov: 40, dist: 300, azimuth: 235, lowPitch: 38, highPitch: 78,
   mood: 'a sunset hill, almost a board seen from above'}},
];
// hero places: model scale on the tile, footprint radius for the layout, and whether the place hugs the street
const HERO = {cafe: {sc: .85, r: 12, shop: 1}, comellas: {sc: .85, r: 12, shop: 1}, hoagies: {sc: .85, r: 12, shop: 1}, lab: {sc: .85, r: 12, shop: 1}, common: {sc: .55, r: 19}, ginn: {sc: .5, r: 21},
 muraco: {sc: .5, r: 21}, leonard: {sc: .5, r: 29}, horn: {sc: .6, r: 16, fixed: 1}, home: {sc: .8, r: 22}, ani: {sc: .8, r: 22}};
const dioGroup = new THREE.Group(); dioGroup.position.set(X(DIO_ORIGIN[0]), 0, Z(DIO_ORIGIN[1])); scene.add(dioGroup); dioGroup.visible = false;
const dioSpots = {}, dioTiles = {}, stageFrames = [], scenes = {}; let lockOrbit = false;
const dioTile = {}; // id -> {cx, cy (map metres of the tile's middle), group, ...}
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const inHex = (x, y, R) => { const a = 30 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), u = x * ca + y * sa, v = -x * sa + y * ca, ax = Math.abs(u), ay = Math.abs(v); return ay <= R * Math.sqrt(3) / 2 && ax <= R - ay / Math.sqrt(3); };

function buildDiorama(d, ti) {
 const out = new THREE.Group(), tileC = {x: Math.sin(d.bearing * Math.PI / 180) * DIO_R, y: Math.cos(d.bearing * Math.PI / 180) * DIO_R}; // local metres, north up
 out.position.set(tileC.x, 0, -tileC.y); dioGroup.add(out);
 const scl = d.R / DIO_R, vk = DIO_R / d.R * d.vex, L = d.look, real = (px, py) => [d.centre[0] + px * scl, d.centre[1] + py * scl];
 // 1 the land, squeezed: heights from the real contours, lakes where the real lakes are
 const lvlAt = (px, py) => { const [rx, ry] = real(px, py), w = land.waterAt(rx, ry); return w; };
 let hmin = Infinity; for (let i = 0; i < 400; i++) { const a = i * 2.4, r = Math.sqrt(i / 400) * DIO_R, [rx, ry] = real(Math.cos(a) * r, Math.sin(a) * r); hmin = Math.min(hmin, isNaN(land.waterAt(rx, ry)) ? land.heightAt(rx, ry) : land.waterAt(rx, ry)); }
 const raw0 = (px, py) => { const [rx, ry] = real(px, py), w = land.waterAt(rx, ry); return isNaN(w) ? (land.heightAt(rx, ry) - hmin) * vk + 3.2 : (w - hmin) * vk + 3.2 - 2.6; };
 const waterY = (px, py) => { const [rx, ry] = real(px, py), w = land.waterAt(rx, ry); return isNaN(w) ? NaN : (w - hmin) * vk + 3.2 + .05; };
 // 2 the roads of the tile (main roads, real; scaled), clipped to the hex
 const roads = [];
 for (const r of town.roads) { let run = []; for (const [x, y] of r.p) { const px = (x - d.centre[0]) / scl, py = (y - d.centre[1]) / scl; if (inHex(px, py, DIO_R * .97)) run.push([px, py]); else { if (run.length > 1) roads.push({c: r.c, p: run}); run = []; } } if (run.length > 1) roads.push({c: r.c, p: run}); }
 const roadPts = []; for (const r of roads) for (let i = 1; i < r.p.length; i++) { const [ax, ay] = r.p[i - 1], [bx, by] = r.p[i], l = Math.hypot(bx - ax, by - ay); for (let t = 0; t < l; t += 3) roadPts.push({x: ax + (bx - ax) * t / l, y: ay + (by - ay) * t / l, w: r.c <= 3 ? 5.4 : 4.2, tx: (bx - ax) / l, ty: (by - ay) / l}); }
 const nearRoad = (x, y) => { let b = null, bd = 1e9; for (const p of roadPts) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < bd) { bd = dd; b = p; } } return b && {...b, d: bd}; };
 // 3 the places, pushed together: start where they really are, then keep them apart and off the street
 const heroes = d.heroes.map(id => { const s = town.spots.find(p => p.id === id), H = HERO[id]; return {id, s, H, x: (s.x - d.centre[0]) / scl, y: (s.y - d.centre[1]) / scl, r: H.r}; });
 { const main = (() => { // Main Street: the busiest main road nearest the common, for the shops to line up along
   const c = heroes.find(h => h.id === 'common'); if (!c) return null; let best = null; for (const r of roads) if (r.c <= 3) for (const p of r.p) { const dd = Math.hypot(p[0] - c.x, p[1] - c.y); if (!best || dd < best.d) best = {d: dd, road: r}; } return best && best.road; })();
  if (main) { const pts = main.p, along = (t) => { let run = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (t <= run + l || i === pts.length - 1) { const k = Math.min(1, (t - run) / l); return {x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, tx: (pts[i][0] - pts[i - 1][0]) / l, ty: (pts[i][1] - pts[i - 1][1]) / l}; } run += l; } };
   let total = 0; for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
   const c = heroes.find(h => h.id === 'common'); let t0 = total / 2, bd = 1e9; for (let t = 0; t < total; t += 2) { const a = along(t), dd = Math.hypot(a.x - c.x, a.y - c.y); if (dd < bd) { bd = dd; t0 = t; } }
   [['cafe', 1, -14], ['comellas', 1, 8], ['hoagies', -1, -14], ['lab', -1, 8]].forEach(([id, side, off]) => { const h = heroes.find(q => q.id === id); if (!h) return; const a = along(Math.max(10, Math.min(total - 10, t0 + off + 22))); h.x = a.x - a.ty * side * 12; h.y = a.y + a.tx * side * 12; h.shop = {tx: a.tx, ty: a.ty, side}; h.pinned = true; });
   if (c) { const a = along(t0), side = -1; c.x = a.x - a.ty * side * 40; c.y = a.y + a.tx * side * 40; } } }
 for (let it = 0; it < 120; it++) for (const a of heroes) { if (a.H.fixed || a.pinned) continue;
  for (const b of heroes) if (a !== b) { const dx = a.x - b.x, dy = a.y - b.y, dd = Math.hypot(dx, dy) || .01, need = a.r + b.r + 5; if (dd < need) { const k = (need - dd) / (b.H.fixed || b.pinned ? 1 : 2); a.x += dx / dd * k; a.y += dy / dd * k; } }
  const nr = nearRoad(a.x, a.y); if (nr && !a.shop && nr.d < a.r + nr.w / 2 + 2) { const k = a.r + nr.w / 2 + 2 - nr.d, dx = a.x - nr.x, dy = a.y - nr.y, dd = Math.hypot(dx, dy) || 1; a.x += dx / dd * k * .5; a.y += dy / dd * k * .5; }
  const e = Math.hypot(a.x, a.y), lim = DIO_R * .74 - a.r * .3; if (e > lim) { a.x *= lim / e; a.y *= lim / e; } }
 // plateau heights: each place sits on a level pad cut into the squeezed land
 const pads = heroes.map(h => ({h, ph: Math.max(raw0(h.x, h.y), (isNaN(waterY(h.x, h.y)) ? 0 : waterY(h.x, h.y)) + .6, 3.5)}));
 const hf = (px, py) => { let h = raw0(px, py); for (const p of pads) { const dd = Math.hypot(px - p.h.x, py - p.h.y), edge = p.h.r + 5; if (dd < edge + 9) h += (p.ph - h) * smooth(1 - (dd - edge) / 9); } return h; };
 // 4 the ground: a hex of triangles
 const verts = [], idx = [], key = (q, r) => q + ',' + r, map = new Map(), step = DIO_R / DIO_N;
 for (let q = -DIO_N; q <= DIO_N; q++) for (let r = Math.max(-DIO_N, -q - DIO_N); r <= Math.min(DIO_N, -q + DIO_N); r++) { const lx = (q + r / 2) * step, ly = r * Math.sqrt(3) / 2 * step, a = 30 * Math.PI / 180, px = lx * Math.cos(a) - ly * Math.sin(a), py = lx * Math.sin(a) + ly * Math.cos(a); map.set(key(q, r), verts.length); verts.push({px, py, h: hf(px, py), w: waterY(px, py)}); }
 for (const k of map.keys()) { const [q, r] = k.split(',').map(Number), v = (a, b) => map.get(key(a, b)); const A = v(q, r), B = v(q + 1, r), C = v(q, r + 1), D = v(q + 1, r + 1);
  if (A !== undefined && B !== undefined && C !== undefined) idx.push(A, B, C); if (B !== undefined && C !== undefined && D !== undefined) idx.push(B, D, C); }
 const pos = new Float32Array(verts.length * 3), cols = new Float32Array(verts.length * 3), c0 = new THREE.Color(L.grass[0]), c1 = new THREE.Color(L.grass[1]), cw = new THREE.Color('#d8c590'), cc = new THREE.Color();
 verts.forEach((v, i) => { pos.set([v.px, v.h, -v.py], i * 3); const wet = !isNaN(v.w), t = .5 + .5 * Math.sin(v.px * .21) * Math.cos(v.py * .17); cc.copy(c0).lerp(c1, Math.max(0, Math.min(1, (v.h - 3) / 22 * .6 + t * .4))); if (wet) cc.copy(cw); cols.set([cc.r, cc.g, cc.b], i * 3); });
 const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); geo.setIndex(idx); geo.computeVertexNormals();
 const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({vertexColors: true, roughness: .95, flatShading: true})); ground.receiveShadow = true; out.add(ground);
 // the water: where all three corners are under a real lake
 { const wi = []; for (let i = 0; i < idx.length; i += 3) if ([0, 1, 2].every(k => !isNaN(verts[idx[i + k]].w))) wi.push(idx[i], idx[i + 1], idx[i + 2]); if (wi.length) { const wp = new Float32Array(verts.length * 3); verts.forEach((v, i) => wp.set([v.px, isNaN(v.w) ? v.h : v.w, -v.py], i * 3)); const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wp, 3)); wg.setIndex(wi); wg.computeVertexNormals(); const wm = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({color: '#3f9ac0', roughness: .15, metalness: .1, transparent: true, opacity: .86})); wm.receiveShadow = true; out.add(wm); } }
 // the tile's edge: soil down to a plinth, as every Abbie's World tile
 { const used = new Map(); for (let i = 0; i < idx.length; i += 3) for (let k = 0; k < 3; k++) { const a = idx[i + k], b = idx[i + (k + 1) % 3], kk = a < b ? a + '_' + b : b + '_' + a; used.set(kk, (used.get(kk) || 0) + 1); }
  const sv = []; for (const [kk, n] of used) if (n === 1) { const [a, b] = kk.split('_').map(Number), A = verts[a], B = verts[b]; sv.push(A.px, A.h, -A.py, B.px, B.h, -B.py, B.px, -4, -B.py, A.px, A.h, -A.py, B.px, -4, -B.py, A.px, -4, -A.py); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3)); sg.computeVertexNormals(); const sm = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({color: L.soil, roughness: 1, side: THREE.DoubleSide, flatShading: true})); out.add(sm);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(DIO_R * 1.02, DIO_R * 1.02, 3.2, 6), M('#3a3340')); plinth.position.y = -5.6; out.add(plinth); }
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
  BUILD[h.id]?.(g, s); const local = new THREE.Group(); local.add(g); local.scale.setScalar(h.H.sc); local.position.set(h.x, p.ph, -h.y); out.add(local);
  if (h.id !== 'horn') { const nr = nearRoad(h.x, h.y); local.rotation.y = h.shop ? Math.atan2(h.shop.ty * h.shop.side, h.shop.tx * h.shop.side) : nr && nr.d < 60 ? Math.atan2(nr.x - h.x, -(nr.y - h.y)) : (h.s.face || 0); }
  (dioSpots[d.id] ||= {})[h.id] = {x: h.x, z: -h.y, y: p.ph, facing: local.rotation.y}; if (h.id === 'cafe') { dioCafes.push(cafe); } }
 G = realG; cafe = realCafe;
 // 7 houses of the real mix, thinned and set along the streets
 const taken = [...pads.map(p => ({x: p.h.x, y: p.h.y, r: p.h.r + 6}))], mine = [];
 for (const h of town.houses.slice().sort((a, b) => Math.hypot(a.x - d.centre[0], a.y - d.centre[1]) - Math.hypot(b.x - d.centre[0], b.y - d.centre[1]))) {
  const px = (h.x - d.centre[0]) / scl, py = (h.y - d.centre[1]) / scl; if (!inHex(px, py, DIO_R * .88)) continue; const wy = waterY(px, py); if (!isNaN(wy)) continue;
  const nr = nearRoad(px, py); if (nr && nr.d < nr.w / 2 + 4.6) continue; if (taken.some(t => Math.hypot(t.x - px, t.y - py) < (t.r || 9.5))) continue; if (h.fam === 'shop' && d.id !== 'downtown') continue;
  taken.push({x: px, y: py, r: 9.5}); mine.push({...h, px, py, hz: hf(px, py)}); if (mine.length > 70) break; }
 { const yaw = h => Math.atan2(h.fx, -h.fy), HS = .66, grp = new THREE.Group(); out.add(grp);
  for (const fam of Object.keys(BODY)) { const list = mine.filter(h => h.fam === fam); if (list.length) grp.add(inst(boxGeo, BODY[fam], list, h => { v3.set(h.px, h.hz - .3, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS, (h.h + .3) * HS, h.d * HS); col.set(h.wall); })); }
  const gab = mine.filter(h => h.roof === 'gable' || h.roof === 'steep'), hip = mine.filter(h => h.roof === 'hip'), flat = mine.filter(h => h.roof === 'flat');
  grp.add(inst(gableGeo, roofMat, gab, h => { v3.set(h.px, h.hz + h.h * HS, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS * 1.06, h.d * .5 * h.pitch * 1.1 * HS, h.d * HS * 1.1); col.set(h.roofc); }));
  grp.add(inst(hipGeo, roofMat, hip, h => { v3.set(h.px, h.hz + h.h * HS, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS * 1.08, h.d * .5 * h.pitch * 1.4 * HS, h.d * HS * 1.08); col.set(h.roofc); }));
  grp.add(inst(boxGeo, roofMat, flat, h => { v3.set(h.px, h.hz + h.h * HS, -h.py); q.setFromEuler(e.set(0, yaw(h), 0)); sc.set(h.w * HS * 1.03, .6, h.d * HS * 1.03); col.set(h.fam === 'shop' ? '#d9cbb0' : h.roofc); }));
  const chim = mine.filter(h => h.chimney); grp.add(inst(boxGeo, plainMat, chim, h => { const a = yaw(h), o = h.w * HS * .32; v3.set(h.px + Math.cos(a) * o, h.hz + h.h * HS, -h.py - Math.sin(a) * o); q.setFromEuler(e.set(0, a, 0)); sc.set(.9, h.d * HS * .5 * h.pitch + 1.8, .9); col.set('#8a4a36'); })); }
 // 8 trees, thinned, in the zone's colours
 { const T = [], spots = taken.slice(); for (const t of town.trees) { const px = (t.x - d.centre[0]) / scl, py = (t.y - d.centre[1]) / scl; if (!inHex(px, py, DIO_R * .94) || !isNaN(waterY(px, py))) continue; const nr = nearRoad(px, py); if (nr && nr.d < nr.w / 2 + 2) continue;
   if (spots.some(o => Math.hypot(o.x - px, o.y - py) < (o.tree ? 5 : (o.r || 8) * .8))) continue; spots.push({x: px, y: py, tree: 1}); T.push({...t, px, py, hz: hf(px, py)}); if (T.length > 150) break; }
  const grp = new THREE.Group(), broad = T.filter(t => t.kind !== 'pine'), pine = T.filter(t => t.kind === 'pine'), tint = new THREE.Color(L.grass[1]);
  grp.add(inst(trunkGeo, plainMat, broad, t => { v3.set(t.px, t.hz, -t.py); q.identity(); sc.set(.7 * t.s, 2.6 * t.s, .7 * t.s); col.set('#6b4f36'); }));
  grp.add(inst(crownGeo, leafMat, broad, t => { v3.set(t.px, t.hz + 3.6 * t.s, -t.py); q.setFromEuler(e.set(t.px % 1, t.py % 3, 0)); sc.set(2.6 * t.s, 2.9 * t.s, 2.6 * t.s); col.set(t.c); }));
  grp.add(inst(pineGeo, leafMat, pine, t => { v3.set(t.px, t.hz + .4, -t.py); q.identity(); sc.set(1.9 * t.s, 8 * t.s, 1.9 * t.s); col.set(t.c); })); out.add(grp); }
 // 9 what only this place has
 DRESS[d.id]?.(out, {hf, pads, roads, nearRoad, waterY, mainR, verts, taken});
 return {group: out, hf, pads, tile: tileC, roads, verts};
}
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
 'anis-side'(out, c) { // the hill by Horn Pond: the highest ground of the tile, with a cairn, a flag and a bench to look out from
  let best = null; for (const v of c.verts) if (isNaN(v.w) && Math.hypot(v.px, v.py) < DIO_R * .8 && !c.pads.some(p => Math.hypot(v.px - p.h.x, v.py - p.h.y) < p.h.r + 10) && (!best || v.h > best.h)) best = v;
  if (!best) return; const g = new THREE.Group(); g.position.set(best.px, best.h, -best.py); out.add(g);
  for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.9 - i * .08, 0), M(['#9a9a96', '#b3afa6', '#8b8984'][i % 3], {flatShading: true})); r.position.set(Math.cos(i * 1.2) * (i < 4 ? 1.4 : .4), i < 4 ? .5 : 1.4, Math.sin(i * 1.2) * (i < 4 ? 1.4 : .4)); g.add(r); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 5, 5), M('#e8e8e8')); pole.position.y = 3.6; const flag = new THREE.Mesh(boxGeo, M('#2f9ac4')); flag.scale.set(2, 1.1, .08); flag.position.set(1, 5.6, 0); g.add(pole, flag);
  const bench = new THREE.Mesh(boxGeo, M('#6a4a2e')); bench.scale.set(2.4, .25, .7); bench.position.set(-3, .3, 1.5); g.add(bench);
  const hill = out.userData; hill.summit = {x: best.px, y: best.py, h: best.h};
 },
 'abbie-daddy-side'(out, c) { // the road to Launch: a signpost and a small rocket at the north edge of the tile
  const top = c.verts.reduce((b, v) => (v.py > b.py && Math.abs(v.px) < 30 && v.py < DIO_R * .75 && isNaN(v.w) ? v : b), {py: -1e9}); if (top.py < -1e8) return; const g = new THREE.Group(); g.position.set(top.px, top.h, -top.py); out.add(g); (dioSpots['abbie-daddy-side'] ||= {}).launch = {x: top.px, z: -top.py, y: top.h, facing: 0};
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, .5, 14), M('#b8b2a8')); pad.position.y = .25; const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 14), M('#f49ac2')); body.position.y = 3.5; const nose = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2.6, 14), M('#f49ac2')); nose.position.y = 7.8;
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(boxGeo, M('#c84a3a')); f.scale.set(.2, 2, 1.6); f.position.set(Math.cos(i * 2.1) * 1.5, 1.6, Math.sin(i * 2.1) * 1.5); f.rotation.y = -i * 2.1; g.add(f); } g.add(pad, body, nose);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 2.6, 5), M('#6a4a2e')), arrow = new THREE.Mesh(boxGeo, M('#e8643c')); post.position.set(-6, 1.3, 4); arrow.scale.set(2.2, .7, .1); arrow.position.set(-6, 2.6, 4); arrow.rotation.y = -.3; g.add(post, arrow);
 },
};

// ---- the view: each region has its own opinion about the pulled-back view (palette, light, lens, tilt, distance) ----
// The pitch-by-zoom curve is the open-land camera's (simulations/land-camera.mjs, AW-STUDY-0018), tuned for each region.
const ORDER_DIO = ['dio-trio', 'dio-downtown', 'dio-anis-side', 'dio-abbie-daddy-side'];
const LOOK_REAL = {bg: '#cfe2ea', sun: '#fff0d6', sunI: 2.4, sunDir: [-600, 900, 400], sky: '#e6f1ff', gnd: '#7a6a4a', hemiI: 1.15, fov: 42};
const LOOK_TRIO = {bg: '#ebdccb', sun: '#fff1d8', sunI: 2.4, sunDir: [-500, 900, 500], sky: '#f2efe6', gnd: '#7a6a4a', hemiI: 1.1, fov: 36, dist: 560, azimuth: 180, lowPitch: 34, highPitch: 70};
let viewDio = false, look = LOOK_REAL, dragging = false; const dioC = new THREE.Color(), dioV = new THREE.Vector3(), rad = a => a * Math.PI / 180;
const pitchFor = (dist, L) => rad(L.lowPitch + (L.highPitch - L.lowPitch) * Math.pow(Math.max(0, Math.min(1, Math.log(dist / 40) / Math.log(760 / 40))), .8));
canvas.addEventListener('pointerdown', () => { dragging = true; }); addEventListener('pointerup', () => { dragging = false; });
function setupDioramas() {
 const DV = DIOS.map(buildDiorama);
 DIOS.forEach((d, i) => { const v = DV[i]; dioTiles[d.id] = {group: v.group, centre: v.group.position.clone().add(dioGroup.position), spots: dioSpots[d.id] || {}}; });
 DIOS.forEach((d, i) => { const t = DV[i].tile; spotByID['dio-' + d.id] = {id: 'dio-' + d.id, name: d.name, line: d.look.mood[0].toUpperCase() + d.look.mood.slice(1) + '.', x: DIO_ORIGIN[0] + t.x, y: DIO_ORIGIN[1] + t.y, z: 10}; ICON['dio-' + d.id] = d.pin; });
 spotByID['dio-trio'] = {id: 'dio-trio', name: 'Three regions', line: "Downtown, Ani's side, and Abbie and Daddy's side, small enough to hold.", x: DIO_ORIGIN[0], y: DIO_ORIGIN[1], z: 6}; ICON['dio-trio'] = '⬡';
}
function visitDio(id) {
 const s = spotByID[id], L = id === 'dio-trio' ? LOOK_TRIO : DIOS.find(d => 'dio-' + d.id === id).look; shown = id; current = ORDER_DIO.indexOf(id); look = L;
 const tgt = new THREE.Vector3(X(s.x), s.z, Z(s.y)), pitch = pitchFor(L.dist, L), az = rad(L.azimuth), h = Math.cos(pitch) * L.dist;
 fly = {at: clock.elapsedTime, p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(tgt.x + Math.sin(az) * h, tgt.y + Math.sin(pitch) * L.dist, tgt.z - Math.cos(az) * h), t1: tgt};
 bubble.innerHTML = `<b>${s.name}</b>${s.line}`; bubble.style.opacity = 1;
}
function setView(on) {
 viewDio = on; dioGroup.visible = on; document.getElementById('dio').setAttribute('aria-pressed', on); document.querySelector('.hud').classList.toggle('dio', on);
 controls.minDistance = on ? 20 : 30; controls.maxDistance = on ? 760 : 14000;
 if (on) visitDio('dio-trio'); else { look = LOOK_REAL; home(); }
}
document.getElementById('dio').onclick = () => setView(!viewDio);
function dioFrame(dt, t) {
 const k = 1 - Math.exp(-dt * 3.5), L = look;
 scene.background.lerp(dioC.set(L.bg), k); hemi.color.lerp(dioC.set(L.sky), k); hemi.groundColor.lerp(dioC.set(L.gnd), k); sun.color.lerp(dioC.set(L.sun), k);
 sun.intensity += (L.sunI - sun.intensity) * k; hemi.intensity += (L.hemiI - hemi.intensity) * k; sunDir.lerp(dioV.set(...L.sunDir), k);
 if (Math.abs(camera.fov - L.fov) > .05) { camera.fov += (L.fov - camera.fov) * k; camera.updateProjectionMatrix(); }
 if (viewDio && !fly && !dragging && L.lowPitch) { // the zone's tilt follows the zoom: close and low, far and high
  const tg = controls.target, dist = camera.position.distanceTo(tg), cur = Math.asin(Math.max(-1, Math.min(1, (camera.position.y - tg.y) / dist))), want = pitchFor(dist, L);
  if (Math.abs(want - cur) > .003) { const p = cur + (want - cur) * .05, hx = camera.position.x - tg.x, hz = camera.position.z - tg.z, hl = Math.hypot(hx, hz) || 1; camera.position.set(tg.x + hx / hl * Math.cos(p) * dist, tg.y + Math.sin(p) * dist, tg.z + hz / hl * Math.cos(p) * dist); } }
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
  setLook: l => { look = {...look, ...l}; }, hideChrome: on => { document.querySelector('.hud').style.display = on ? 'none' : ''; bubble.style.opacity = on ? 0 : bubble.style.opacity; }};
 // the named scenes: the café curb, the homes, and Launch sit on their tiles
 const at = (tile, hero, extra = {}) => { const sp = dioTiles[tile]?.spots[hero]; if (!sp) return; registerScene({id: extra.id, region: tile, anchor: [sp.x, sp.z], y: sp.y, facing: sp.facing, bounds: extra.bounds || 30}); };
 at('downtown', 'cafe', {id: 'cafe-curb'}); at('abbie-daddy-side', 'home', {id: 'abbie-kitchen'}); at('abbie-daddy-side', 'home', {id: 'treehouse'}); at('anis-side', 'ani', {id: 'anis-kitchen'}); at('abbie-daddy-side', 'launch', {id: 'launch-pad'}); at('downtown', 'lab', {id: 'lab-door'}); at('abbie-daddy-side', 'muraco', {id: 'school-door'});
 for (const d of DIOS) { const t = dioTiles[d.id]; scenes['dio-' + d.id] = {id: 'dio-' + d.id, region: d.id, anchor: [0, 0], world: t.centre.clone(), bounds: DIO_R}; }
 Object.assign(window.AbbieTown, {entrances: ENTRANCES, backUrl, go: (gate, st) => { const e = ENTRANCES[gate]; if (!e || !available(gate, st)) return false; if (e.kind === 'stage') { window.dispatchEvent(new CustomEvent('abbietown:enter', {detail: {gate, scene: e.scene, module: e.module}})); return enterScene(e.scene); } location.href = e.url; return true; }, stage, scenes, enterScene, exitScene, registerScene, mount: mountScene});
 { const at = new URLSearchParams(location.search).get('at'), e = at && ENTRANCES[at]; // coming back from a game: land at the gate you left by
   if (e && scenes[e.scene]) { setView(true); setTimeout(() => enterScene(e.scene, {dist: 70}), 60); } }
 return stage;
}

