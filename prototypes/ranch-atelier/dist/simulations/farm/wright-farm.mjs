// AW-STUDY-0059 The Farm: an explorable farm for the kids, inspired by a real community farm in Winchester (a red barn, a farm stand,
// goats and hens and bees, a pond, trails), never a map of it and with no addresses. More animals than the real one: cows, horses,
// goats, sheep, pigs, alpacas, hens, ducks, rabbits, a dog and a cat, all living in their pens and wandering, looking at you,
// coming to the fence, scattering when you rush them, and pleased when you tap them.
// Everything the model library already had is reused (barns, house, stand, coop, shelters, trough, hay, hives, trees, tractor and the
// animals); only what it lacked is built here (pig, alpaca, rabbit, duck, fences, pond, pumpkins, scarecrow, greenhouse, signs).
//
//   const farm = await buildFarm({heightAt, onCollect, onTap})     the tile's contents, in the tile's own frame (x east, z south)
//   farm.root                       add it to the scene where the tile should stand
//   farm.update(dt, visitors)       every frame; visitors [{x, z}] in the tile's frame (the camera's look-at point, the buggy)
//   farm.tap(raycaster)             a tap: pets an animal or picks something up; returns what happened or null
//   mountFarm(AbbieTown, townCtx)   puts the tile on the Winchester board's open slot (see the bottom)
// World layer: buildings, props, animals, plants. Presentation layer: hearts, the sparkle on things you can pick up (userData.presentation).
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigLivestock} from '../livestock-animation.mjs?motion=3';
import {makePig, makeAlpaca, makeRabbit, makeDuck, Critter, voice} from './critters.mjs';
import * as L from './farm-layout.mjs';

const {R, R3, SC, PLACES, PENS, MODELS, FREE, POND, LANE, TRAIL} = L;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const mat = (name, color, o = {}) => Object.assign(new T.MeshStandardMaterial({color, flatShading: true, roughness: .9, ...o}), {name});
const MAT = {
 post: mat('fence post', '#8a5f3a'), rail: mat('fence rail', '#b98a58'), gate: mat('gate wood', '#a9703a'), gravel: '#cdbd9c', dirt: '#a98259', mud: '#7a5638', soil: '#6b4a30',
 water: mat('pond water', '#5db3c8', {transparent: true, opacity: .86, roughness: .15, metalness: 0}), reed: mat('reed', '#7aa24a'), cattail: mat('cattail head', '#6b4528'),
 pumpkin: mat('pumpkin', '#ee8a2e'), vine: mat('pumpkin vine', '#5f8f3a'), stem: mat('pumpkin stem', '#6b7a2a'), egg: mat('egg', '#fbf6e8', {roughness: .5}), apple: mat('apple', '#d93a3a', {roughness: .5}), jar: mat('honey jar', '#f2b12a', {roughness: .3}),
 glass: mat('greenhouse glass', '#bfe6e0', {transparent: true, opacity: .32, roughness: .1}), frame: mat('greenhouse frame', '#f4f1e8'), hat: mat('scarecrow hat', '#c9a35a'), shirt: mat('scarecrow shirt', '#d65a3a'), cloth: mat('scarecrow patch', '#4b78c8'),
 sign: mat('painted sign board', '#f4ead2'), signPost: mat('sign post', '#7b5230'), rock: mat('stone', '#a7a39a'), hut: mat('pig house wood', '#c0623a'), hutRoof: mat('pig house roof', '#7b3a2a'), hutDoor: mat('pig house door', '#3a2a22')
};
const bx = (w, h, d, m, x = 0, y = 0, z = 0, name) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; if (name) o.name = name; return o; };
const cyl = (r0, r1, h, m, x = 0, y = 0, z = 0, seg = 7, name) => { const o = new T.Mesh(new T.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); o.castShadow = true; if (name) o.name = name; return o; };
const ico = (r, m, x = 0, y = 0, z = 0, name, d = 1) => { const o = new T.Mesh(new T.IcosahedronGeometry(r, d), m); o.position.set(x, y, z); o.castShadow = true; if (name) o.name = name; return o; };
const sc = (...p) => [p[0], -p[1]]; // layout (x east, y north) to the tile's scene frame (x, z)

export async function buildFarm({heightAt, onCollect = () => {}, onTap = () => {}, hour = () => 12, seed = 5, quality = 1} = {}) {
 const root = new T.Group(); root.name = 'The Farm';
 const rnd = L.rng(seed), ready = [];
 const hex = (x, y, r = R) => L.inHex(x, y, r);
 // the ground: the tile's own height with level pads under the buildings, the yard, the parking and a sunk pond
 const edgeFade = (x, y) => { const nE = Math.max(Math.abs(y) * 2 / (R * R3), (Math.abs(x) + Math.abs(y) / R3) / R); return 1 - smooth((nE - .82) / .18); };
 const pads = [...PLACES.filter(p => p.m).map(p => ({x: p.x, y: p.y, r: p.r + 3})), {x: 0, y: -4, r: 14}, {x: L.PARKING.x, y: L.PARKING.y, r: 8}, ...PENS.map(p => ({x: p.cx, y: p.cy, r: 0, rect: p}))];
 const base = heightAt;
 const padH = new Map(); for (const p of pads) padH.set(p, base(p.x, p.y));
 const pondY = base(POND.cx, POND.cy) - .5;
 const pondDepth = (x, y) => { const d = Math.hypot((x - POND.cx) / POND.rx, (y - POND.cy) / POND.ry); return 1 - smooth((d - .55) / .55); };
 const hf = (x, y) => {
  let h = base(x, y); const f = edgeFade(x, y);
  if (f > 0) {
   for (const p of pads) {
    if (p.rect) { const dx = Math.abs(x - p.rect.cx) - p.rect.w / 2, dy = Math.abs(y - p.rect.cy) - p.rect.h / 2, d = Math.max(dx, dy); if (d < 5) h += (padH.get(p) - h) * smooth(1 - Math.max(0, d) / 5) * f * .85; continue; }
    const d = Math.hypot(x - p.x, y - p.y); if (d < p.r + 8) h += (padH.get(p) - h) * smooth(1 - Math.max(0, d - p.r) / 8) * f;
   }
   const pd = pondDepth(x, y); if (pd > 0) h += (pondY - 1.4 - h) * pd * f * .95 + 0 * pd;
  }
  return h;
 };
 const hz = (x, z) => hf(x, -z); // by the scene frame
 const inPond = (x, y, g = 0) => Math.hypot((x - POND.cx) / (POND.rx + g), (y - POND.cy) / (POND.ry + g)) < 1;
 const waterY = (x, z) => pondY + .02;

 // ---- the ground mesh
 const N = Math.round(66 * quality), step = R / N, key = (q, r) => q + ',' + r, map = new Map(), verts = [], idx = [];
 const trailD = (x, y) => { let b = 1e9; for (let i = 1; i < TRAIL.length; i++) { const [ax, ay] = TRAIL[i - 1], [bx2, by] = TRAIL[i], dx = bx2 - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); b = Math.min(b, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return b; };
 const laneD = (x, y) => { let b = 1e9; for (let i = 1; i < LANE.length; i++) { const [ax, ay] = LANE[i - 1], [bx2, by] = LANE[i], dx = bx2 - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); b = Math.min(b, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return b; };
 const g0 = new T.Color('#86ad52'), g1 = new T.Color('#a9bd62'), gp = new T.Color('#8fbb5a'), cc = new T.Color(), cGravel = new T.Color(MAT.gravel), cDirt = new T.Color(MAT.dirt), cMud = new T.Color(MAT.mud), cSoil = new T.Color(MAT.soil), cMeadow = new T.Color('#c9d36a'), cSand = new T.Color('#d8c590');
 const colourAt = (x, y, h) => {
  const t = .5 + .5 * Math.sin(x * .21) * Math.cos(y * .17); cc.copy(g0).lerp(g1, t * .6);
  const ld = laneD(x, y); if (ld < 3.4) cc.copy(cGravel).lerp(cDirt, .25 * t); else if (ld < 4.6) cc.lerp(cGravel, 1 - (ld - 3.4) / 1.2);
  const yd = Math.hypot(x, y + 4); if (yd < 17) cc.lerp(cGravel, smooth(1 - (yd - 12) / 5)); if (yd < 12) cc.copy(cGravel).lerp(cDirt, .2 * t);
  const td = trailD(x, y); if (td < 1.3) cc.lerp(cDirt, .9); else if (td < 2.2) cc.lerp(cDirt, (1 - (td - 1.3) / .9) * .9);
  for (const p of PENS) { if (L.inPen(p, x, y, -1.5)) { if (p.species === 'pig') cc.lerp(cMud, .55 + .2 * t); else if (p.species === 'goat') cc.lerp(cDirt, .3); else cc.lerp(gp, .6); } }
  const pk = L.PARKING; if (Math.abs(x - pk.x) < pk.w / 2 && Math.abs(y - pk.y) < pk.h / 2) cc.copy(cGravel);
  if (Math.hypot(x - 42, y - 72) < 12) cc.lerp(cSoil, .6);
  if (Math.hypot(x - L.MEADOW.cx, y - L.MEADOW.cy) < L.MEADOW.r) cc.lerp(cMeadow, .5);
  for (const b of PLACES) if (b.m === 'gardenBeds' && Math.hypot(x - b.x, y - b.y) < 7.5) cc.lerp(cSoil, .7);
  const pd = pondDepth(x, y); if (pd > 0) cc.lerp(cSand, Math.min(1, pd * 1.4));
  return cc;
 };
 for (let q = -N; q <= N; q++) for (let r = Math.max(-N, -q - N); r <= Math.min(N, -q + N); r++) { const x = (q + r / 2) * step, y = r * R3 / 2 * step; map.set(key(q, r), verts.length); verts.push({x, y, h: hf(x, y)}); }
 for (let q = -N - 1; q <= N; q++) for (let r = -N - 1; r <= N; r++) { const v = (a, b) => map.get(key(a, b)); const A = v(q, r), B = v(q + 1, r), C = v(q, r + 1), D = v(q + 1, r + 1);
  if (A !== undefined && B !== undefined && C !== undefined) idx.push(A, B, C); if (B !== undefined && C !== undefined && D !== undefined) idx.push(B, D, C); }
 { const pos = new Float32Array(verts.length * 3), col = new Float32Array(verts.length * 3);
  verts.forEach((v, i) => { pos.set([v.x, v.h, -v.y], i * 3); const c = colourAt(v.x, v.y, v.h); col.set([c.r, c.g, c.b], i * 3); });
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const ground = new T.Mesh(geo, new T.MeshStandardMaterial({vertexColors: true, roughness: .95, flatShading: true})); ground.name = 'farm ground'; ground.receiveShadow = true; root.add(ground);
  // the tile's edge: soil down to a plinth, like every Abbie's World tile
  const used = new Map(); for (let i = 0; i < idx.length; i += 3) for (let k = 0; k < 3; k++) { const a = idx[i + k], b = idx[i + (k + 1) % 3], kk = a < b ? a + '_' + b : b + '_' + a; used.set(kk, (used.get(kk) || 0) + 1); }
  const sv = []; for (const [kk, n] of used) if (n === 1) { const [a, b] = kk.split('_').map(Number), A = verts[a], B = verts[b]; sv.push(A.x, A.h, -A.y, B.x, B.h, -B.y, B.x, -4, -B.y, A.x, A.h, -A.y, B.x, -4, -B.y, A.x, -4, -A.y); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sv, 3)); sg.computeVertexNormals();
  const skirt = new T.Mesh(sg, new T.MeshStandardMaterial({color: '#6b5a3a', roughness: 1, side: T.DoubleSide, flatShading: true})); skirt.name = 'farm soil edge'; root.add(skirt);
  const plinth = new T.Mesh(new T.CylinderGeometry(R * 1.02, R * 1.02, 3.2, 6), mat('plinth', '#3a3340')); plinth.rotation.y = Math.PI / 6; plinth.position.y = -5.6; plinth.name = 'farm plinth'; root.add(plinth); }

 // ---- pond
 { const g = new T.Group(); g.name = 'duck pond';
  const w = new T.Mesh(new T.CircleGeometry(1, 28), MAT.water); w.rotation.x = -Math.PI / 2; w.scale.set(POND.rx * 1.02, POND.ry * 1.02, 1); w.position.set(POND.cx, waterY(POND.cx, -POND.cy), -POND.cy); w.name = 'pond water'; w.renderOrder = 2; g.add(w);
  const reeds = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.28 + rnd() * .2, rr = 1.04 + rnd() * .12, x = POND.cx + Math.cos(a) * POND.rx * rr, y = POND.cy + Math.sin(a) * POND.ry * rr; if (!hex(x, y, R * .93) || (a > 3.6 && a < 5.0 && rnd() < .5)) continue;
   const h = 2.2 + rnd() * 1.6, rg = new T.Group(); rg.add(cyl(.05, .07, h, MAT.reed, 0, h / 2, 0, 4, 'reed')); if (rnd() < .6) rg.add(cyl(.17, .17, .75, MAT.cattail, 0, h - .3, 0, 5, 'cattail')); rg.position.set(x, hf(x, y), -y); rg.rotation.z = (rnd() - .5) * .15; g.add(rg); reeds.push(rg); }
  // two lily pads that bob
  for (let i = 0; i < 4; i++) { const p = new T.Mesh(new T.CylinderGeometry(.7, .7, .05, 7), mat('lily pad', '#58a05a')); p.position.set(POND.cx + (rnd() - .5) * POND.rx, waterY(0, 0) + .06, -(POND.cy + (rnd() - .5) * POND.ry)); g.add(p); }
  root.add(g); }

 // ---- fences: post and rail, with a gate gap where each pen opens
 const fences = new T.Group(); fences.name = 'fences'; root.add(fences);
 const fenceRun = (a, b, gap) => { // a, b in layout metres; gap = [t0, t1] along the run left open
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 3)), out = [];
  for (let i = 0; i < n; i++) { const t0 = i / n, t1 = (i + 1) / n; if (gap && t1 > gap[0] && t0 < gap[1]) continue; out.push([a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]); }
  return out;
 };
 const segs = []; const posts = [];
 for (const p of PENS) {
  const x0 = p.cx - p.w / 2, x1 = p.cx + p.w / 2, y0 = p.cy - p.h / 2, y1 = p.cy + p.h / 2, gw = 6;
  const side = (a, b, id) => { const len = Math.hypot(b[0] - a[0], b[1] - a[1]), g = p.gate === id ? [.5 - gw / len / 2, .5 + gw / len / 2] : null; for (const s of fenceRun(a, b, g)) segs.push(s); if (g) { const m = [a[0] + (b[0] - a[0]) * g[0], a[1] + (b[1] - a[1]) * g[0]], m2 = [a[0] + (b[0] - a[0]) * g[1], a[1] + (b[1] - a[1]) * g[1]]; posts.push(m, m2); p.gatePts = [m, m2]; } };
  side([x0, y0], [x1, y0], 's'); side([x1, y0], [x1, y1], 'e'); side([x1, y1], [x0, y1], 'n'); side([x0, y1], [x0, y0], 'w');
 }
 // a low fence around the vegetable beds and the chicken run
 for (const c of [{x: -53, y: -42, w: 38, h: 34, gate: null}]) { const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2, y0 = c.y - c.h / 2, y1 = c.y + c.h / 2; for (const s of [...fenceRun([x0, y0], [x1, y0]), ...fenceRun([x1, y0], [x1, y1], [.38, .6]), ...fenceRun([x1, y1], [x0, y1]), ...fenceRun([x0, y1], [x0, y0])]) segs.push(s); posts.push([x1, y0 + (y1 - y0) * .38], [x1, y0 + (y1 - y0) * .6]); }
 { const postGeo = new T.BoxGeometry(.32, 1.9, .32), railGeo = new T.BoxGeometry(1, .22, .16);
  const post = new T.InstancedMesh(postGeo, MAT.post, segs.length * 2 + posts.length + 8), rail = new T.InstancedMesh(railGeo, MAT.rail, segs.length * 2); post.name = 'fence posts'; rail.name = 'fence rails';
  const m = new T.Matrix4(), q = new T.Quaternion(), s1 = new T.Vector3(1, 1, 1), p1 = new T.Vector3(); let pi = 0, ri = 0;
  const addPost = (x, y) => { p1.set(x, hf(x, y) + .95, -y); m.compose(p1, q.identity(), s1); post.setMatrixAt(pi++, m); };
  for (const s of segs) { const [ax, ay, bx2, by] = s, len = Math.hypot(bx2 - ax, by - ay), yaw = -Math.atan2(by - ay, bx2 - ax); addPost(ax, ay); addPost(bx2, by);
   for (const hgt of [.7, 1.4]) { const mx = (ax + bx2) / 2, my = (ay + by) / 2; q.setFromEuler(new T.Euler(0, yaw, 0)); p1.set(mx, (hf(ax, ay) + hf(bx2, by)) / 2 + hgt, -my); m.compose(p1, q, new T.Vector3(len, 1, 1)); rail.setMatrixAt(ri++, m); } q.identity(); }
  for (const [x, y] of posts) { q.identity(); addPost(x, y); }
  post.count = pi; rail.count = ri; post.castShadow = rail.castShadow = true; fences.add(post, rail); }
 // gates: two leaves, open a little, so you can see where to go in
for (const p of PENS) if (p.gatePts) { const [a, b] = p.gatePts, g = new T.Group(); g.name = 'gate ' + p.id; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  [[a, 0, .55], [b, Math.PI, -.55]].forEach(([pt, base, open]) => { const piv = new T.Group(); piv.position.set(pt[0], hf(pt[0], pt[1]), -pt[1]); piv.rotation.y = -(ang + base) + open; const lf = bx(L * .5, 1.25, .12, MAT.gate, L * .25, .9, 0, 'gate leaf'); piv.add(lf); g.add(piv); }); fences.add(g); }

 // ---- reused models
 const loader = new GLTFLoader(), cache = new Map();
 const load = url => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url).catch(e => { console.warn('farm model', url, e.message); return null; })); return cache.get(url); };
 const inst = async (key, o = {}) => { const m = MODELS[key], gl = await load(m.url); if (!gl) return null; const g = gl.scene.clone(true); g.traverse(c => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });
  const wrap = new T.Group(); wrap.add(g); const b = new T.Box3().setFromObject(g); g.position.y = -b.min.y + (m.lift || 0) / (m.sc || 1); wrap.scale.setScalar((o.sc || 1) * m.sc); wrap.userData.size = b.getSize(new T.Vector3()).multiplyScalar(m.sc); return wrap; };
 const put = (obj, x, y, o = {}) => { obj.position.set(x, hf(x, y) + (o.dy || 0), -y); if (o.face) obj.rotation.y = Math.atan2(o.face[0] - x, -(o.face[1] - y)) + (o.yaw || 0); else obj.rotation.y = o.rot || 0; root.add(obj); return obj; };
 const spots = {};
 const placed = [];
 for (const p of PLACES) { if (!p.m) continue; ready.push(inst(p.m).then(o => { if (!o) return; o.name = p.name; put(o, p.x, p.y, p); placed.push(o); if (p.spot) spots[p.spot] = o; })); }
 // trees: an orchard of apples, and the woods on the rim
 const orchard = []; for (let i = 0; i < L.ORCHARD.n; i++) { const col = i % 4, row = Math.floor(i / 4); orchard.push([L.ORCHARD.cx + (col - 1.5) * 11 + (row ? 5 : 0), L.ORCHARD.cy + (row - .5) * 11]); }
 for (const [x, y] of orchard) ready.push(inst('apple', {sc: .9 + rnd() * .25}).then(o => { if (o) { o.name = 'apple tree'; put(o, x, y, {rot: rnd() * 6}); } }));
 for (const t of L.woods(seed + 6, Math.round(34 * quality))) ready.push(inst('tree', {sc: t.s * .85}).then(o => { if (o) { o.name = 'tree'; put(o, t.x, t.y, {rot: t.rot}); } }));
 // flowers: a row of sunflowers by the stand, pick-your-own coneflowers in the meadow
 for (let i = 0; i < 7; i++) { const x = 36 + i * 3.2, y = -46 + Math.sin(i) * .8; ready.push(inst('sunflower', {sc: .8 + rnd() * .3}).then(o => { if (o) { o.name = 'sunflower'; put(o, x, y, {rot: rnd() * 6}); } })); }
 for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * L.MEADOW.r, x = L.MEADOW.cx + Math.cos(a) * r, y = L.MEADOW.cy + Math.sin(a) * r; if (!hex(x, y, R * .9)) continue; ready.push(inst(i % 3 ? 'coneflower' : 'sunflower', {sc: .55 + rnd() * .3}).then(o => { if (o) { o.name = 'flower'; put(o, x, y, {rot: rnd() * 6}); } })); }
 // stone edging along the farm stand's flower bed
 for (let i = 0; i < 4; i++) ready.push(inst('edging').then(o => { if (o) { o.name = 'flower edging'; put(o, 30 + i * 2.8, -41, {rot: 0}); } }));

 // ---- built here: pumpkin patch, scarecrow, greenhouse, pig house, signs, rocks for the goats
 { const g = new T.Group(); g.name = 'pumpkin patch'; const pk = PLACES.find(p => p.id === 'pumpkinPatch');
  for (let i = 0; i < 22; i++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 10.5, x = pk.x + Math.cos(a) * r, y = pk.y + Math.sin(a) * r; if (!hex(x, y, R * .92)) continue; const s = .8 + rnd() * .7, p = new T.Group();
   const body = ico(1.15 * s, MAT.pumpkin, 0, 1.0 * s, 0, 'pumpkin'); body.scale.y = .78; p.add(body, cyl(.14 * s, .2 * s, .7 * s, MAT.stem, 0, 1.95 * s, 0, 5, 'pumpkin stem')); for (let k = 0; k < 6; k++) { const rib = ico(.18 * s, MAT.pumpkin, Math.cos(k * 1.05) * 1.05 * s, 1.0 * s, Math.sin(k * 1.05) * 1.05 * s, 'pumpkin rib', 0); rib.scale.set(.4, 1.3, .4); rib.rotation.y = -k * 1.05; p.add(rib); }
   p.position.set(x, hf(x, y), -y); p.rotation.y = rnd() * 6; g.add(p); }
  for (let i = 0; i < 12; i++) { const a = rnd() * 6.28, r = rnd() * 11, x = pk.x + Math.cos(a) * r, y = pk.y + Math.sin(a) * r, l = ico(.9, MAT.vine, x, hf(x, y) + .25, -y, 'pumpkin leaf', 0); l.scale.set(1, .15, 1.2); g.add(l); }
  root.add(g); }
 { const g = new T.Group(); g.name = 'scarecrow'; g.add(cyl(.18, .22, 6, MAT.post, 0, 3, 0, 5, 'scarecrow pole'), bx(5, .3, .3, MAT.post, 0, 4.6, 0, 'scarecrow arms'), cyl(1.1, 1.3, 2.4, MAT.shirt, 0, 4.1, 0, 7, 'scarecrow shirt'), bx(.8, .8, .2, MAT.cloth, .3, 4.2, .85, 'scarecrow patch'),
  ico(.95, MAT.pumpkin, 0, 5.9, 0, 'scarecrow head'), cyl(1.6, 1.6, .15, MAT.hat, 0, 6.65, 0, 8, 'scarecrow hat brim'), cyl(.8, 1.0, 1.1, MAT.hat, 0, 7.2, 0, 8, 'scarecrow hat'),
  ...[.4, -.4].map((z, i) => ico(.12, mat('eye', '#2a1f1a'), .85, 6.0, z, 'scarecrow eye', 0)));
  g.position.set(-62, hf(-62, -52), 52); g.rotation.y = .6; root.add(g); }
 { const g = new T.Group(); g.name = 'greenhouse'; const w = 10, d = 7, h = 4.4; // a glass house for seedlings
  g.add(bx(w, h, d, MAT.glass, 0, h / 2, 0, 'greenhouse glass walls')); const roof = new T.Mesh(new T.CylinderGeometry(d / 2, d / 2, w, 3, 1, false, 0, Math.PI * 2), MAT.glass); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI; roof.position.y = h + .6; roof.scale.set(.65, 1, 1); g.add(roof);
  for (const x of [-w / 2, -w / 4, 0, w / 4, w / 2]) g.add(bx(.2, h, .2, MAT.frame, x, h / 2, d / 2, 'greenhouse frame'), bx(.2, h, .2, MAT.frame, x, h / 2, -d / 2, 'greenhouse frame'));
  g.add(bx(w, .2, .2, MAT.frame, 0, h, d / 2, 'greenhouse frame'), bx(w, .2, .2, MAT.frame, 0, h, -d / 2, 'greenhouse frame'));
  for (let i = 0; i < 5; i++) g.add(ico(.7, mat('seedling', '#6fb05a'), -3.5 + i * 1.8, .9, -1.4 + (i % 2) * 2.8, 'seedling', 0));
  g.add(bx(8, .5, 1.4, mat('potting table', '#a9703a'), 0, .7, -1.6, 'greenhouse bench'));
  g.position.set(-24, hf(-24, -68), 68); g.rotation.y = .3; root.add(g); }
 { const pigPen = PENS.find(p => p.id === 'pigs'), g = new T.Group(); g.name = 'pig house'; g.add(bx(5.2, 2.6, 4.4, MAT.hut, 0, 1.3, 0, 'pig house walls'), bx(1.8, 1.9, .2, MAT.hutDoor, 0, 1.0, 2.25, 'pig house door'));
  const roof = new T.Mesh(new T.CylinderGeometry(3.3, 3.3, 5.4, 3), MAT.hutRoof); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI; roof.position.y = 3.1; roof.scale.set(.62, 1, 1.15); roof.rotation.order = 'YXZ'; g.add(roof);
  g.position.set(pigPen.cx - 4, hf(pigPen.cx - 4, pigPen.cy + 2), -(pigPen.cy + 2)); g.rotation.y = Math.PI * .5 + .3; root.add(g); }
 { const gp = PENS.find(p => p.id === 'goats'); for (let i = 0; i < 5; i++) { const x = gp.cx - 5 + (i % 3) * 3.4, y = gp.cy - 2 + Math.floor(i / 3) * 3.2, r = ico(.9 + (i % 3) * .35, MAT.rock, x, hf(x, y) + .3 + (i % 3) * .2, -y, 'goat rock', 1); r.scale.y = .8; r.rotation.y = i; root.add(r); } } // stones to climb on, and a plank bridge between two
 // signs: painted pictures, no words (an egg, a carrot, a honey jar)
 const signTex = kind => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#f4ead2'; x.fillRect(0, 0, 128, 128); x.lineWidth = 6; x.strokeStyle = '#7b5230'; x.strokeRect(4, 4, 120, 120);
  if (kind === 'egg') { x.fillStyle = '#fff'; x.strokeStyle = '#6b5a44'; x.beginPath(); x.ellipse(64, 66, 26, 34, 0, 0, 7); x.fill(); x.stroke(); }
  if (kind === 'carrot') { x.fillStyle = '#f08a2e'; x.beginPath(); x.moveTo(40, 40); x.lineTo(88, 40); x.lineTo(64, 108); x.fill(); x.fillStyle = '#5faa4a'; for (const dx of [-14, 0, 14]) { x.beginPath(); x.ellipse(64 + dx, 28, 7, 16, dx / 30, 0, 7); x.fill(); } }
  if (kind === 'honey') { x.fillStyle = '#f2b12a'; x.strokeStyle = '#6b5a44'; x.fillRect(38, 48, 52, 52); x.strokeRect(38, 48, 52, 52); x.fillStyle = '#8a5f3a'; x.fillRect(34, 38, 60, 14); x.fillStyle = '#6b5a44'; for (let i = 0; i < 3; i++) x.fillRect(46 + i * 14, 64, 6, 22); }
  if (kind === 'trail') { x.fillStyle = '#6b8a3a'; x.beginPath(); x.moveTo(64, 20); x.lineTo(96, 100); x.lineTo(32, 100); x.fill(); x.fillStyle = '#7b5230'; x.fillRect(58, 100, 12, 12); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; };
 const sign = (kind, x, y, rot) => { const g = new T.Group(); g.name = 'sign ' + kind; g.add(cyl(.18, .22, 3.8, MAT.signPost, 0, 1.9, 0, 5, 'sign post'), new T.Mesh(new T.BoxGeometry(2.8, 2.8, .18), [MAT.sign, MAT.sign, MAT.sign, MAT.sign, new T.MeshStandardMaterial({map: signTex(kind), roughness: .8}), MAT.sign])); g.children[1].position.y = 3.5; g.children[1].castShadow = true; g.position.set(x, hf(x, y), -y); g.rotation.y = rot; root.add(g); return g; };
 sign('egg', 28, -22, .4); sign('carrot', 40, -40, -.5); sign('honey', -6, 58, .2); sign('trail', -4, -78, 0);
 { const bell = new T.Group(); bell.name = 'farm bell'; bell.add(cyl(.2, .2, 5, MAT.signPost, 0, 2.5, 0, 5, 'bell post'), bx(2.2, .25, .25, MAT.signPost, 0, 5, 0, 'bell beam'), cyl(.25, .85, 1.1, mat('bell brass', '#d9a93a', {metalness: .5, roughness: .4}), 0, 4.2, 0, 8, 'bell')); bell.position.set(7, hf(7, -14), 14); root.add(bell); }

 // ---- things to pick up: eggs in the henhouse straw, pumpkins, windfall apples, a honey jar by the hives
 const pickups = [];
 const mkPick = p => { const g = new T.Group(); g.name = p.kind; let body;
  if (p.kind === 'egg') { body = ico(.55, MAT.egg, 0, .55, 0, 'egg'); body.scale.y = 1.3; }
  else if (p.kind === 'pumpkin') { body = ico(1.5, MAT.pumpkin, 0, 1.2, 0, 'pumpkin'); body.scale.y = .78; g.add(cyl(.18, .24, .8, MAT.stem, 0, 2.2, 0, 5, 'pumpkin stem')); }
  else if (p.kind === 'apple') body = ico(.75, MAT.apple, 0, .75, 0, 'apple');
  else { body = cyl(.6, .6, 1.2, MAT.jar, 0, .8, 0, 8, 'honey jar'); g.add(cyl(.66, .66, .3, mat('jar lid', '#8a5f3a'), 0, 1.5, 0, 8, 'honey jar lid')); }
  g.add(body); const sp = new T.Mesh(new T.RingGeometry(.9, 1.15, 20), new T.MeshBasicMaterial({color: '#fff3a8', transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false})); sp.rotation.x = -Math.PI / 2; sp.position.y = .08; sp.userData.presentation = true; sp.name = 'pickup glint'; g.add(sp);
  g.position.set(p.x, hf(p.x, p.y), -p.y); g.userData = {pickup: p, glint: sp}; root.add(g); return g; };
 for (const p of L.PICKUPS) { const g = mkPick(p); pickups.push(g); }

 // ---- bees and butterflies
 const bees = (() => { const n = 40, pos = new Float32Array(n * 3), geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); const pts = new T.Points(geo, new T.PointsMaterial({color: '#2a1f12', size: .5, sizeAttenuation: true})); pts.name = 'bees'; pts.frustumCulled = false; root.add(pts);
  const hives = PLACES.filter(p => p.id.startsWith('hive')); return {pts, update(t) { for (let i = 0; i < n; i++) { const h = hives[i % hives.length], a = t * (1 + (i % 5) * .3) + i * 2.1, r = 1.5 + (i % 7) * .5; pos[i * 3] = h.x + Math.cos(a) * r; pos[i * 3 + 1] = hf(h.x, h.y) + 2.6 + Math.sin(a * 2.3 + i) * .8; pos[i * 3 + 2] = -(h.y + Math.sin(a) * r); } geo.attributes.position.needsUpdate = true; }}; })();
 const flies = []; for (let i = 0; i < 6; i++) { const g = new T.Group(); const wm = mat('butterfly wing', ['#f2b63a', '#e8587a', '#6fa8e8', '#f6f0d8'][i % 4], {side: T.DoubleSide}); const w1 = new T.Mesh(new T.CircleGeometry(.5, 5), wm), w2 = w1.clone(); w1.position.x = .45; w2.position.x = -.45; const a1 = new T.Group(), a2 = new T.Group(); a1.add(w1); a2.add(w2); w1.rotation.x = w2.rotation.x = -Math.PI / 2; g.add(a1, a2); g.userData = {a1, a2, ph: i * 1.7, cx: L.MEADOW.cx + (i - 3) * 3, cy: L.MEADOW.cy}; root.add(g); flies.push(g); }

 // ---- the animals
 const critters = [], byObj = new Map();
 const penHome = p => ({inside: (x, z, r) => Math.abs(x - p.cx) < p.w / 2 - r - .6 && Math.abs(-z - p.cy) < p.h / 2 - r - .6, pick: rng => [p.cx + (rng() - .5) * (p.w - 5), -(p.cy + (rng() - .5) * (p.h - 5))]});
 const discHome = (cx, cy, r) => ({inside: (x, z, rr) => Math.hypot(x - cx, -z - cy) < r - rr, pick: rng => { const a = rng() * 6.28, d = Math.sqrt(rng()) * r * .9; return [cx + Math.cos(a) * d, -(cy + Math.sin(a) * d)]; }});
 const rimHome = {inside: (x, z, r) => hex(x, -z, R * .78) && !inPond(x, -z, 1), pick: rng => { for (let i = 0; i < 20; i++) { const x = (rng() - .5) * R * 1.5, y = (rng() - .5) * R * 1.3; if (hex(x, y, R * .74)) return [x, -y]; } return [0, 10]; }};
 const pondHome = {inside: (x, z) => inPond(x, -z, 5), pick: rng => { const a = rng() * 6.28, d = Math.sqrt(rng()); return [POND.cx + Math.cos(a) * POND.rx * d * 1.1, -(POND.cy + Math.sin(a) * POND.ry * d * 1.1)]; }};
 const addCritter = (c, o) => { c.penId = PENS.find(p => L.inPen(p, c.obj.position.x, -c.obj.position.z))?.id || null; c.obj.name = c.name; root.add(c.obj); critters.push(c); c.obj.traverse(m => { m.userData.critter = c; }); return c; };
 const authored = async (kind, pen, i, o = {}) => { const m = MODELS[kind], gl = await load(m.url); if (!gl) return; const model = gl.scene.clone(true); model.traverse(c => { if (c.isMesh) c.castShadow = true; });
  const wrapper = new T.Group(); wrapper.add(model); const k = (o.size || 1) * m.sc; wrapper.scale.setScalar(k); const b = new T.Box3().setFromObject(wrapper); model.position.y -= b.min.y / k;
  let rig = null; try { rig = rigLivestock(wrapper, kind); } catch (e) { console.warn('rig', kind, e.message); }
  const obj = new T.Group(); obj.add(wrapper); const home = pen === 'free' ? discHome(FREE.chickens.cx, FREE.chickens.cy, FREE.chickens.r) : penHome(PENS.find(p => p.id === pen)); const [x, z] = home.pick(rnd); obj.position.set(x, hz(x, z), z);
  addCritter(new Critter({obj, kind, home, speed: o.speed || 1.6, radius: o.radius || 1.4 * (o.size || 1), rig, seed: i + 1, name: (o.label || kind) + ' ' + (i + 1)})); };
 const staticAnimal = async (kind, pen, i, o = {}) => { const m = MODELS[kind], gl = await load(m.url); if (!gl) return; const model = gl.scene.clone(true); model.traverse(c => { if (c.isMesh) c.castShadow = true; }); const wrap = new T.Group(); wrap.add(model); const k = (o.size || 1) * m.sc; wrap.scale.setScalar(k); const b = new T.Box3().setFromObject(wrap); model.position.y -= b.min.y / k; model.rotation.y = o.yaw || 0;
  const obj = new T.Group(); obj.add(wrap); const home = o.home || penHome(PENS.find(p => p.id === pen)); const [x, z] = home.pick(rnd); obj.position.set(x, hz(x, z), z);
  const state = {ph: i * 2}; addCritter(new Critter({obj, kind, home, speed: o.speed || 1.4, radius: o.radius || 1.4 * (o.size || 1), seed: i + 1, name: (o.label || kind) + ' ' + (i + 1), step: (dt, moving, sp) => { state.ph += dt * (moving ? 9 : 1.4); wrap.position.y = moving ? Math.abs(Math.sin(state.ph)) * .18 * k : 0; wrap.rotation.z = moving ? Math.sin(state.ph) * .05 : 0; }})); };
 const proc = (maker, kind, pen, i, o = {}) => { const m = maker(o.tone); const wrap = new T.Group(); wrap.add(m.group); wrap.scale.setScalar((o.size || 1) * SC); const obj = new T.Group(); obj.add(wrap); const home = o.home || penHome(PENS.find(p => p.id === pen)); const [x, z] = home.pick(rnd); obj.position.set(x, hz(x, z), z);
  addCritter(new Critter({obj, kind, home, speed: o.speed || 1.5, radius: (o.radius || 1.1) * (o.size || 1), seed: i + 1, name: (o.label || kind) + ' ' + (i + 1), floats: !!o.floats, step: (dt, mv, sp, fl) => m.step(dt, mv, sp, fl), lift: 0})); return m; };
 const cowPen = PENS.find(p => p.id === 'cows');
 for (let i = 0; i < 3; i++) ready.push(authored('cow', 'cows', i, {speed: 1.2, radius: 2.2, label: ['Buttercup', 'Daisy', 'Clover'][i]}));
 for (let i = 0; i < 2; i++) ready.push(authored('horse', 'cows', i, {speed: 2.2, radius: 2.4, label: ['Biscuit', 'Pepper'][i]}));
 for (let i = 0; i < 5; i++) ready.push(authored('goat', 'goats', i, {speed: 1.8, radius: 1.1, size: i > 3 ? .62 : 1, label: i > 3 ? 'goat kid' : 'goat'}));
 for (let i = 0; i < 9; i++) ready.push(authored('chicken', 'free', i, {speed: 1.5, radius: .6, label: 'hen'}));
 for (let i = 0; i < 5; i++) ready.push(staticAnimal('sheep', 'sheep', i, {speed: 1.2, radius: 1.3, size: i > 3 ? .6 : 1, label: i > 3 ? 'lamb' : 'sheep'}));
 ready.push(staticAnimal('dog', null, 0, {home: rimHome, speed: 3.4, radius: 1.2, label: 'farm dog'}), staticAnimal('cat', null, 0, {home: rimHome, speed: 1.6, radius: .7, label: 'farm cat'}));
 for (let i = 0; i < 4; i++) proc(makeRabbit, 'rabbit', null, i, {home: discHome(FREE.rabbits.cx, FREE.rabbits.cy, 13), speed: 3, radius: .5, size: SC / SC * 1.1, tone: ['#b9b2a6', '#f1ece2', '#8a7a68', '#c9b896'][i], label: 'rabbit'});
 for (let i = 0; i < 6; i++) proc(makeDuck, 'duck', null, i, {home: i < 4 ? pondHome : discHome(POND.cx + 6, POND.cy - 8, 14), speed: 1.3, radius: .8, size: i > 4 ? .6 : 1, floats: i < 4, label: i > 4 ? 'duckling' : 'duck', ...(i % 3 === 0 ? {} : {})});
 for (let i = 0; i < 3; i++) proc(makePig, 'pig', 'pigs', i, {speed: 1.5, radius: 1.5, size: 1, label: 'pig'});
 for (let i = 0; i < 2; i++) proc(makePig, 'pig', 'pigs', 3 + i, {speed: 2.2, radius: .9, size: .5, tone: '#f4b8c4', label: 'piglet'});
 for (let i = 0; i < 2; i++) proc(makeAlpaca, 'alpaca', 'alpacas', i, {speed: 1.4, radius: 1.5, tone: ['#efe3cb', '#b99a78'][i], label: 'alpaca'});
 // ducks that swim sit on the water
 // hens go to bed at night (the coop is their home); everything else is awake or dozes where it stands
 const tmpV = new T.Vector3();
 const env = {hf: hz, waterY, visitors: [], blocked: (x, z, r, c) => {
  const y = -z; for (const p of PLACES) if (p.m && Math.hypot(x - p.x, y - p.y) < p.r + r - 1) return true;
  for (const p of PENS) if (!(c && c.penId === p.id) && L.inPen(p, x, y, -(r + .5))) return true; // other animals' pens are shut
  if (c && c.kind !== 'duck' && c.kind !== 'dog' && inPond(x, y, r * .5)) return true;
  return false; }};
 // ---- update, tap
 let time = 0;
 const update = (dt, visitors = []) => {
  time += dt; env.visitors = visitors; const night = hour() >= 21 || hour() < 5.5;
  for (const c of critters) { c.obj.visible = !(night && c.kind === 'chicken'); if (c.obj.visible) c.update(dt, env); }
  bees.update(time);
  for (const f of flies) { const u = f.userData, a = time * .5 + u.ph; f.position.set(u.cx + Math.cos(a) * 9 + Math.sin(a * 2.7) * 2, hf(u.cx, u.cy) + 4 + Math.sin(a * 1.9) * 1.4, -(u.cy + Math.sin(a * .8) * 7)); f.rotation.y = a; const fl = Math.sin(time * 14 + u.ph) * .8; u.a1.rotation.z = fl; u.a2.rotation.z = -fl; }
  for (const p of pickups) { if (!p.visible) continue; const u = p.userData; u.glint.scale.setScalar(1 + .15 * Math.sin(time * 3 + p.position.x)); u.glint.material.opacity = .45 + .35 * Math.sin(time * 3 + p.position.x); }
 };
 // the buggy (or the camera's look point) drives over something: pick it up
 const collectNear = (x, z, radius = 3.2) => { const got = []; for (const p of pickups) { if (!p.visible) continue; if (Math.hypot(p.position.x - x, p.position.z - z) < radius) { p.visible = false; got.push(p.userData.pickup); const ev = {did: 'collect', item: p.userData.pickup.kind, id: p.userData.pickup.id}; voice(p.userData.pickup.kind === 'egg' ? 'chicken' : 'rabbit', .3); onCollect(ev); } } return got; };
 const tap = ray => {
  const objs = [...critters.filter(c => c.obj.visible).map(c => c.obj), ...pickups.filter(p => p.visible)]; const hit = ray.intersectObjects(objs, true)[0]; if (!hit) return null;
  let o = hit.object; while (o && !o.userData.critter && !o.userData.pickup) o = o.parent;
  if (!o) return null; if (o.userData.pickup) { const p = o.userData.pickup; o.visible = false; voice(p.kind === 'egg' ? 'chicken' : 'duck', .4); const ev = {did: 'collect', item: p.kind, id: p.id}; onCollect(ev); return ev; }
  const ev = o.userData.critter.tap(env); onTap({...ev, name: o.userData.critter.name}); return ev;
 };
 const restock = () => { for (const p of pickups) p.visible = true; }; // the next day: eggs are laid, apples fall, pumpkins ripen again
 const data = {spots, placed, critters, pickups, pens: PENS, hz, hf, env, collectNear, restock, bees, counts: () => critters.reduce((o, c) => (o[c.kind] = (o[c.kind] || 0) + 1, o), {})};
 const done = Promise.all(ready).then(() => data);
 return {root, update, tap, hf, hz, ready: done, ...data, dispose() { root.removeFromParent(); }};
}

// ---------------------------------------------------------------------------------------------------------------------------
// The tile on the Winchester board: the open slot between Ani's side and Abbie and Daddy's side, north-north-west of the middle,
// where the real farm lies. Mounts the way Paint the World does: the town keeps the renderer, camera and light.
export async function mountFarm(AT, {camera, canvas, controls} = {}) {
 const stage = AT?.stage; if (!stage || !AT.board) return null;
 const {THREE, dioGroup, tiles} = stage, slot = AT.board.slots.find(s => s.id === L.SLOT); if (!slot) return null;
 const boardH = AT.board.heightAt, raw = (x, y) => boardH(slot.x + x, slot.y + y);
 const flat = (() => { let s = 0, n = 0; for (let a = 0; a < 12; a++) for (const r of [15, 40, 65]) { s += raw(Math.cos(a / 12 * 6.28) * r, Math.sin(a / 12 * 6.28) * r); n++; } return Math.max(4, s / n); })();
 const base = (x, y) => { const f = 1 - smooth((Math.max(Math.abs(y) * 2 / (R * R3), (Math.abs(x) + Math.abs(y) / R3) / R) - .82) / .18), r = raw(x, y); return r + (flat + (r - flat) * .3 - r) * f; };
 const events = [];
 const farm = await buildFarm({heightAt: base, hour: () => window.__farmHour ?? 12, onCollect: ev => report(ev), onTap: ev => report(ev)});
 const group = farm.root; group.position.set(slot.x, 0, -slot.y); dioGroup.add(group);
 const center = new THREE.Vector3(slot.x, 0, -slot.y).add(dioGroup.position);
 // the town's tile record, so paint, quests, the kart and the camera can see the farm like any hex
 const stand = PLACES.find(p => p.id === 'stand'), standSpot = {x: stand.x, z: -stand.y, y: farm.hf(stand.x, stand.y), facing: 0, g: farm.spots.farm || new THREE.Group()};
 if (!farm.spots.farm) { const ph = new THREE.Group(); ph.add(new THREE.Mesh(new THREE.BoxGeometry(9, 5, 9), new THREE.MeshBasicMaterial({visible: false}))); ph.position.set(stand.x, farm.hf(stand.x, stand.y), -stand.y); group.add(ph); standSpot.g = ph; }
 tiles.farm = {hf: (px, py) => farm.hf(px, py), group, centre: center.clone(), spots: {farm: standSpot, barn: {x: -32, z: -12, y: farm.hf(-32, 12), facing: 0, g: farm.spots.barn || standSpot.g}}, houses: []};
 const FOOD = {egg: ['Fresh egg', '🥚', 'Still warm.'], pumpkin: ['Pumpkin', '🎃', 'Heavy and round.'], apple: ['Apple', '🍎', 'Crunchy.'], honey: ['Jar of honey', '🍯', 'The bees made this.']};
 let report = ev => { if (ev.did === 'collect') { const f = FOOD[ev.item]; if (f) window.AbbieInventory?.add({id: ev.item, name: f[0], icon: f[1], from: 'The Farm', thought: f[2]}); ev = {...ev, at: 'farm'}; } import('../quests.mjs?v=1').then(q => q.report(ev)).catch(() => {}); };
 // a place to go: the farm's own scene, and a card in the hand
 const look = {bg: '#dcecc8', sun: '#fff0cf', sunI: 2.5, sunDir: [-520, 700, 540], sky: '#e6f3ff', gnd: '#6a7a46', hemiI: 1.15, grass: ['#86ad52', '#a9bd62'], soil: '#6b5a3a', fov: 40, dist: 200, azimuth: 205, lowPitch: 28, highPitch: 62, mood: 'a bright morning on the farm, bells and bleating', wash: 'anis-side'};
 try { AT.registerScene?.({id: 'dio-farm', region: 'farm', anchor: [0, 0], look, bounds: R}); } catch (e) { console.warn('farm scene', e); }
 const visit = () => stage.flyTo(center.clone().setY(center.y + 8), {dist: 190, pitch: 46, azimuth: 205});
 if (!AT.board.hexes.some(h => h.id === 'farm')) AT.board.hexes.push({id: 'farm', n: 'H8', zone: 'anis-side', name: 'The Farm', farm: true});
 addEventListener('aw-tile-card', e => { if (e.detail?.id === 'farm') { e.preventDefault(); visit(); } });
 // taps
 const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let down = null; const cv = canvas || stage.renderer.domElement, cam = camera || stage.camera, ctl = controls || stage.controls;
 cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
 cv.addEventListener('pointerup', e => { if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !dioGroup.visible) return; const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam); farm.tap(ray); });
 // the visitors the animals notice: where the camera looks (when it is over the farm), and the buggy
 const v3 = new THREE.Vector3(); let here = false;
 stage.frame(dt => {
  const on = dioGroup.visible; group.visible = on; if (!on) return; dt = Math.min(dt || .016, .05);
  const t = ctl.target, lx = t.x - dioGroup.position.x - group.position.x, lz = t.z - dioGroup.position.z - group.position.z, close = cam.position.distanceTo(t) < 330 && Math.hypot(lx, lz) < R * 1.4;
  const vis = []; if (close) vis.push({x: lx, z: lz});
  const d = window.__effectHunt?.driver?.s; if (d) { const bx = d.x - dioGroup.position.x - group.position.x, bz = d.z - dioGroup.position.z - group.position.z; if (Math.hypot(bx, bz) < R * 1.5) { vis.push({x: bx, z: bz}); farm.collectNear(bx, bz, 3.6); } }
  farm.update(dt, vis);
  const nowHere = close && Math.hypot(lx, lz) < 60; if (nowHere !== here) { here = nowHere; if (here) report({did: 'visit', at: 'farm'}); }
 });
 const api = {farm, visit, slot, report: ev => report(ev), setReport: fn => { report = fn; }, hour: h => { window.__farmHour = h; }};
 AT.farm = api;
 addEventListener('aw-world-clock', e => { window.__farmHour = e.detail?.hour ?? 12; });
 return api;
}
