// The Winchester decorator: dresses the seven-hex board from the model library by role, not from a hand-picked list
// (Evan, 2026-10-24: "if you did again, you might add several hundred more assets and types"). Drafted.
//   dressTown(window.AbbieTown, THREE, {seed})      once the board is built; resolves {placed, types, drawCalls}
// props-catalogue.json is the library, role-tagged (tools/town-props/build_catalogue.py): street, shop, yard, garden, farm, park,
// road, water. Rules, not coordinates: each role is placed where the land and the town say it belongs, and a thing is
// skipped if it would sit inside a building, under a tree, on a road, outside its hex or on another thing.
//   street  lamps, benches, bins and boxes along the kerbs, thick on Main Street and thinning in the neighbourhoods
//   shop    market stalls, tables and baskets on the pavement in front of every shop
//   yard    two to five bits of everyday life round each house; garden and farm things where that hex lives that way
//   park    trees, benches, a fountain and swings round the Common
//   road    toy cars parked along the kerb
// water edge things (boats, quays, reeds) wait for a water query on the board; they are tagged and not yet placed.
// Performance: every model type is one InstancedMesh per mesh for the whole board, parented to the board's group, so a few
// hundred things cost a few hundred draw calls, not thousands. Models arrive after the town is playable.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const MAX_THINGS = 1500, SCALE = .9; // the catalogue's sizes are real-world feel; the board is a toy table, so everything sits a little smaller than its tag
const rngOf = seed => { let s = seed >>> 0 || 1; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; };
const hashOf = str => { let h = 2166136261; for (const c of String(str)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const KNOWN = ['downtown', 'depot-river', 'reservoir-hills', 'neighbourhood', 'anis-side', 'abbie-daddy-side', 'gingerbread-hill'];

export async function dressTown(town, T, {seed = 24, dry = false} = {}) {
 const tiles = town?.stage?.tiles, board = town?.board; if (!tiles || !board || !T) return null;
 const catalogue = await (await fetch('/simulations/abbietown/props-catalogue.json')).json();
 const byRole = {}; for (const m of catalogue) for (const r of m.roles) (byRole[r] ||= []).push(m);
 const pick = (role, rnd, prefer) => { const pool = byRole[role]; if (!pool?.length) return null; const p2 = prefer ? pool.filter(prefer) : pool; const l = p2.length ? p2 : pool; return l[Math.floor(rnd() * l.length)]; };
 const roads = board.roadSpawns(12), roadAt = (bx, by, r) => roads.some(p => Math.hypot(p.x - bx, p.y - by) < (p.width || 6) / 2 + r + .8);
 const taken = new Map(), cell = 6, key = (x, y) => Math.floor(x / cell) + ',' + Math.floor(y / cell); // board-wide spatial hash of placed things
 const plans = [], R = board.hexSide * .86;

 // a place is free when it is inside its hex and clear of buildings, trees, roads and other things (street = in front of shops, buildings ignored)
 const why = {}, no = k => (why[k] = (why[k] || 0) + 1, false);
 function free(tileId, lx, lz, r, {street = false, onRoad = false} = {}) {
  const g = tiles[tileId].group.position, bx = g.x + lx, by = -(g.z + lz);
  if (Math.hypot(lx, lz) > R) return no('hex');
  const hit = board.obstaclesNear(bx, by, r + 7).find(o => Math.hypot(o.x - bx, o.y - by) < (o.kind === 'tree' ? o.r + r * .4 + 1.3 : street ? 0 : o.r * .7 + r * .6)); if (hit) return no(hit.kind);
  if (!onRoad && roadAt(bx, by, r)) return no('road');
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of taken.get(key(bx + i * cell, by + j * cell)) || []) if (Math.hypot(p.x - bx, p.y - by) < p.r + r) return no('prop');
  return true;
 }
 function put(tileId, m, lx, lz, yaw, opts = {}) {
  if (!m || !tiles[tileId] || plans.length >= MAX_THINGS) return false; const r = m.size * SCALE * (opts.footprint ?? .36);
  if (!free(tileId, lx, lz, r, opts)) return false;
  const g = tiles[tileId].group.position, bx = g.x + lx, by = -(g.z + lz), k = key(bx, by); (taken.get(k) || taken.set(k, []).get(k)).push({x: bx, y: by, r});
  plans.push({m, tileId, lx, lz, yaw, k: opts.scale ?? 1}); return true;
 }
 const front = (f, d, lat = 0) => [Math.sin(f) * d + Math.cos(f) * lat, Math.cos(f) * d - Math.sin(f) * lat]; // d out of a front that faces f, lat to its right
 const isLamp = o => /lamp|NS03|RC 017|RC 022/i.test(o.name), isBench = o => /bench|NS08|RC 023/i.test(o.name);

 // ---- street: along every kerb, thickest downtown
 const density = {downtown: 1, 'depot-river': .8, 'reservoir-hills': .5, neighbourhood: .8, 'anis-side': .8, 'abbie-daddy-side': .8, 'gingerbread-hill': .5};
 board.roadSpawns(18).forEach((p, n) => {
  if (!KNOWN.includes(p.hex)) return; const rnd = rngOf(hashOf(p.hex + n + seed)); if (rnd() > (density[p.hex] ?? .3)) return;
  const g = tiles[p.hex].group.position, side = rnd() < .5 ? -1 : 1, off = (p.width || 6) / 2 + 3.4 + rnd() * 1.4, h = p.heading;
  put(p.hex, pick('street', rnd, o => rnd() < .5 ? isLamp(o) : true), p.x - g.x + Math.sin(h) * off * side, -(p.y + g.z) + Math.cos(h) * off * side, Math.atan2(-Math.sin(h) * side, -Math.cos(h) * side), {street: true});
 });
 // ---- toy cars along the kerb, downtown and the depot
 board.roadSpawns(70).filter(p => p.hex === 'downtown' || p.hex === 'depot-river').forEach((p, i) => {
  const rnd = rngOf(hashOf('car' + i + seed)); if (rnd() > .55) return; const g = tiles[p.hex].group.position, h = p.heading, side = (i % 2 ? 1 : -1) * ((p.width || 6) / 2 + 1.6);
  put(p.hex, pick('road', rnd), p.x - g.x + Math.sin(h) * side, -(p.y + g.z) + Math.cos(h) * side, Math.atan2(Math.cos(h), -Math.sin(h)), {onRoad: true, street: true, footprint: .3});
 });
 // ---- shop fronts: a market on the pavement in front of each shop, and a bench and lamp either side
 for (const [name, spot] of Object.entries(tiles.downtown?.spots || {})) {
  if (!['cafe', 'bakery', 'comellas', 'hoagies'].includes(name)) continue;
  const f = spot.facing || 0, rnd = rngOf(hashOf(name + seed));
  for (let t = 0; t < 110; t++) { const [dx, dz] = front(f, 8 + rnd() * 8, (rnd() - .5) * 30); put('downtown', pick('shop', rnd), spot.x + dx, spot.z + dz, f + (rnd() - .5) * .8, {street: true}); }
  for (const lat of [-12, 12]) { const [dx, dz] = front(f, 10.5, lat); put('downtown', pick('street', rnd, lat < 0 ? isBench : isLamp), spot.x + dx, spot.z + dz, f + (lat < 0 ? Math.PI : 0), {street: true}); }
 }
 // ---- yards: everyday life round every house, in the way that hex lives
 const lives = {'anis-side': ['yard', 'garden', 'garden'], neighbourhood: ['yard', 'garden', 'yard'], 'abbie-daddy-side': ['yard', 'farm', 'farm', 'garden'], 'gingerbread-hill': ['yard', 'garden'], downtown: ['yard', 'yard', 'shop'], 'depot-river': ['yard', 'yard'], 'reservoir-hills': ['yard', 'garden']};
 for (const hex of KNOWN) (tiles[hex]?.houses || []).forEach((h, i) => {
  const rnd = rngOf(hashOf(hex + i + seed)), roles = lives[hex] || ['yard'], count = 6 + Math.floor(rnd() * 8);
  for (let t = 0, got = 0; t < 70 && got < count; t++) { const a = rnd() * Math.PI * 2, d = 6 + rnd() * 11; if (put(hex, pick(roles[Math.floor(rnd() * roles.length)], rnd), h.x + Math.sin(a) * d, h.z + Math.cos(a) * d, rnd() * Math.PI * 2)) got++; }
 });
 // ---- the Common: trees, benches, a fountain, swings
 const cm = tiles.downtown?.spots?.common;
 if (cm) { const rnd = rngOf(hashOf('common' + seed)), fountain = (byRole.park || []).find(o => o.name === 'RC 026'); let placedFountain = false;
  for (let t = 0; t < 160; t++) { const a = rnd() * Math.PI * 2, d = 8 + rnd() * 42, m = !placedFountain && t > 4 ? fountain : pick('park', rnd); if (put('downtown', m, cm.x + Math.sin(a) * d, cm.z + Math.cos(a) * d, rnd() * Math.PI * 2) && m === fountain) placedFountain = true; } }

 if (dry) return {placed: plans.length, why, byRole: plans.reduce((a, p) => (a[p.m.roles[0]] = (a[p.m.roles[0]] || 0) + 1, a), {})};
 // ---- build: one InstancedMesh per mesh of each model, in the board's own frame
 const loader = new GLTFLoader(), byModel = new Map(); for (const p of plans) (byModel.get(p.m.id) || byModel.set(p.m.id, []).get(p.m.id)).push(p);
 const parent = tiles.downtown.group.parent, made = []; let drawCalls = 0;
 const mat = new T.Matrix4(), place = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0), v = new T.Vector3(), s = new T.Vector3();
 const merge = geos => { // concatenate geometries that share attributes (position, normal, uv, colour)
  const names = ['position', 'normal', 'uv', 'color'].filter(n => geos.every(g => g.attributes[n])); if (!names.length || !geos.every(g => g.attributes.position)) return null;
  const out = new T.BufferGeometry(); let vcount = 0, icount = 0; for (const g of geos) { vcount += g.attributes.position.count; icount += g.index ? g.index.count : g.attributes.position.count; }
  for (const n of names) { const a = geos[0].attributes[n], arr = new a.array.constructor(vcount * a.itemSize); let o = 0; for (const g of geos) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; } out.setAttribute(n, new T.BufferAttribute(arr, a.itemSize, a.normalized)); }
  const idx = new Uint32Array(icount); let io = 0, vo = 0; for (const g of geos) { const c = g.attributes.position.count; if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo; else for (let i = 0; i < c; i++) idx[io++] = vo + i; vo += c; }
  out.setIndex(new T.BufferAttribute(idx, 1)); return out; };
 async function build([, list]) {
  const m = list[0].m, gltf = await new Promise(res => loader.load(m.glb, res, undefined, () => res(null))); if (!gltf) return;
  gltf.scene.updateMatrixWorld(true); const box = new T.Box3().setFromObject(gltf.scene), size = box.getSize(new T.Vector3()), k = m.size * SCALE / Math.max(size.x, size.y, size.z, .001);
  const base = new T.Matrix4().makeScale(k, k, k).multiply(new T.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2)); // centred, standing on y = 0
  const groups = new Map(); // meshes of one material become one geometry, so a model costs a draw call per material, not per part
  gltf.scene.traverse(o => { if (!o.isMesh || !o.geometry.attributes.position) return; const g = o.geometry.clone().applyMatrix4(base.clone().multiply(o.matrixWorld)); if (!g.attributes.normal) g.computeVertexNormals(); (groups.get(o.material) || groups.set(o.material, []).get(o.material)).push(g); });
  for (const [material, geos] of groups) { const geometry = merge(geos); if (!geometry) continue;
   const im = new T.InstancedMesh(geometry, material, list.length);
   list.forEach((p, i) => { const tg = tiles[p.tileId]; q.setFromAxisAngle(up, p.yaw); v.set(p.lx, tg.hf(p.lx, -p.lz), p.lz); s.setScalar(p.k);
    place.compose(v, q, s); mat.copy(tg.group.matrix).multiply(place); im.setMatrixAt(i, mat); });
   im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.castShadow = m.size * SCALE > 2.4; im.receiveShadow = true; im.name = 'library-' + m.name; parent.add(im); made.push(im); drawCalls++; }
 }
 const queue = [...byModel]; await Promise.all(Array.from({length: 6}, async () => { for (let e; (e = queue.shift());) await build(e); }));
 town.props = {placed: plans.length, types: byModel.size, drawCalls, meshes: made};
 return {placed: plans.length, types: byModel.size, drawCalls};
}
