// Kart mode, scenery you can crash into (AW-STUDY-0055). Low-poly props, named by what they are. 'hard' ones bounce you (a bench, a
// tree, a parked car); 'soft' ones burst when you hit them fast (cones, crates, fences, hay) and come back after a while.
// Everything is world layer: the town's characters can see a smashed fence and react to it. Scene metres: x east, z south.
import * as T from 'three';
import {seeded} from './track.mjs';

export const PROP_SCALE = 1.7; // toy-sized town: scenery a bit bigger than life, like the vehicles
const mats = new Map();
const M = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new T.MeshStandardMaterial({color: c, roughness: .8, flatShading: true, ...o})); return mats.get(k); };
const add = (g, geo, mat, x, y, z, name) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (name) m.name = name; g.add(m); return m; };
const box = (w, h, d) => new T.BoxGeometry(w, h, d), cyl = (a, b, h, n = 8) => new T.CylinderGeometry(a, b, h, n), ico = (r, d = 1) => new T.IcosahedronGeometry(r, d);

// ---------- props: low-poly, named by what they are ----------
export function makeProp(kind, seed = 0) {
 const g = new T.Group(); g.name = kind; const r = seeded(seed + 3), pick = a => a[Math.floor(r() * a.length)];
 switch (kind) {
  case 'tree': { const c = pick(['#4f9c52', '#6bb257', '#e29a3d', '#d8693c']); add(g, cyl(.22, .32, 2.2, 6), M('#7a5238'), 0, 1.1, 0, 'trunk'); add(g, ico(1.5 + r() * .4), M(c), 0, 3.2, 0, 'canopy'); add(g, ico(1.0), M(c), .7, 4.1, .2, 'canopy top'); break; }
  case 'bench': add(g, box(1.8, .12, .6), M('#9b6b3d'), 0, .5, 0, 'seat wood'); add(g, box(1.8, .5, .1), M('#9b6b3d'), 0, .85, -.25, 'back wood'); for (const s of [-.8, .8]) add(g, box(.1, .5, .5), M('#3b3b46'), s, .25, 0, 'bench leg'); break;
  case 'lamp': add(g, cyl(.08, .1, 4.2, 6), M('#2b2b33'), 0, 2.1, 0, 'lamp post'); add(g, ico(.32, 1), M('#fff3b8', {emissive: '#ffe38a', emissiveIntensity: .8}), 0, 4.3, 0, 'lamp bulb'); break;
  case 'bollard': add(g, cyl(.22, .26, 1.1, 8), M('#ef5148'), 0, .55, 0, 'bollard red'); add(g, cyl(.23, .23, .2, 8), M('#fff'), 0, .75, 0, 'bollard band'); break;
  case 'cone': add(g, box(.7, .08, .7), M('#2b2b33'), 0, .04, 0, 'cone base'); add(g, new T.ConeGeometry(.28, .85, 8), M('#ff7a1a'), 0, .5, 0, 'cone orange'); add(g, cyl(.17, .2, .12, 8), M('#fff'), 0, .48, 0, 'cone band'); break;
  case 'crate': add(g, box(1.3, 1.1, 1.3), M('#c99b5b'), 0, .55, 0, 'crate wood'); add(g, box(1.34, .12, .2), M('#9b6b3d'), 0, .55, .62, 'crate slat'); add(g, box(.2, 1.12, 1.34), M('#9b6b3d'), 0, .55, 0, 'crate slat'); break;
  case 'parked': { const c = pick(['#5ec4ff', '#ffd23e', '#ff7eb6', '#9be37d', '#e9483c']); add(g, box(2.0, .7, 4.2), M(c), 0, .75, 0, 'car body'); add(g, box(1.7, .6, 2.1), M(c), 0, 1.35, -.2, 'car cabin'); add(g, box(1.6, .45, 1.8), M('#cfeaff', {roughness: .1}), 0, 1.4, -.2, 'car glass'); for (const [x, z] of [[-.95, 1.3], [.95, 1.3], [-.95, -1.3], [.95, -1.3]]) { const w = add(g, cyl(.42, .42, .3, 10), M('#222'), x, .42, z, 'car wheel'); w.rotation.z = Math.PI / 2; } break; }
  case 'mailbox': add(g, cyl(.06, .06, 1.2, 6), M('#7a5238'), 0, .6, 0, 'post'); add(g, box(.5, .42, .8), M('#4a78e0'), 0, 1.3, 0, 'mailbox blue'); add(g, box(.05, .3, .12), M('#e9483c'), .3, 1.5, 0, 'flag red'); break;
  case 'fence': for (let i = -3; i <= 3; i++) add(g, box(.18, 1.1, .1), M('#fff7e8'), i * .45, .55, 0, 'picket white'); add(g, box(3.2, .12, .08), M('#fff7e8'), 0, .8, -.06, 'fence rail'); break;
  case 'bin': add(g, cyl(.45, .38, 1.0, 8), M('#4a8f6a'), 0, .5, 0, 'bin green'); add(g, cyl(.5, .5, .12, 8), M('#2b6a4a'), 0, 1.05, 0, 'bin lid'); break;
  case 'hedge': add(g, box(3.4, 1.4, 1.2), M('#3f8a48'), 0, .7, 0, 'hedge green'); add(g, ico(.8), M('#4aa055'), -1, 1.4, 0, 'hedge tuft'); add(g, ico(.7), M('#4aa055'), 1.1, 1.3, 0, 'hedge tuft'); break;
  case 'reeds': for (let i = 0; i < 9; i++) add(g, cyl(.03, .05, 1.6 + r(), 4), M('#b6a34e'), (r() - .5) * 1.8, .8, (r() - .5) * 1.8, 'reed'); break;
  case 'hay': { const b = add(g, cyl(.8, .8, 1.3, 10), M('#e3be5c'), 0, .8, 0, 'hay bale'); b.rotation.z = Math.PI / 2; add(g, cyl(.82, .82, .08, 10), M('#c99a3b'), 0, .8, 0, 'hay twine').rotation.z = Math.PI / 2; break; }
  case 'scarecrow': add(g, cyl(.05, .05, 2.2, 5), M('#7a5238'), 0, 1.1, 0, 'pole'); add(g, box(1.6, .1, .1), M('#7a5238'), 0, 1.6, 0, 'arms pole'); add(g, box(.7, .8, .3), M('#e9a43c'), 0, 1.4, 0, 'shirt'); add(g, ico(.28), M('#f1d28a'), 0, 2.1, 0, 'head straw'); add(g, cyl(.42, .42, .06, 10), M('#7a4a2a'), 0, 2.32, 0, 'hat brim'); add(g, cyl(.22, .26, .3, 8), M('#7a4a2a'), 0, 2.5, 0, 'hat'); break;
  case 'rock': add(g, ico(1.2 + r() * .3, 0), M('#9a9aa6'), 0, .7, 0, 'rock grey').scale.y = .75; break;
  case 'pumpkin': { const p = add(g, ico(.55), M('#ff8a1e'), 0, .45, 0, 'pumpkin orange'); p.scale.y = .8; add(g, cyl(.06, .08, .3, 5), M('#4a7a3a'), 0, .95, 0, 'stem'); break; }
  case 'puddle': { const p = add(g, new T.CircleGeometry(1, 16), M('#6fb7ff', {roughness: .1, metalness: .2, transparent: true, opacity: .8}), 0, .06, 0, 'puddle water'); p.rotation.x = -Math.PI / 2; p.castShadow = false; break; }
  case 'fountain': add(g, cyl(3.4, 3.6, .9, 14), M('#cfc8b8'), 0, .45, 0, 'basin stone'); add(g, cyl(3, 3, .7, 14), M('#7cc8ff', {roughness: .1, transparent: true, opacity: .85}), 0, .62, 0, 'basin water'); add(g, cyl(.4, .6, 2.2, 8), M('#cfc8b8'), 0, 1.6, 0, 'spout stone'); add(g, ico(.8), M('#9fdcff', {transparent: true, opacity: .8}), 0, 3.0, 0, 'spout water'); break;
  default: add(g, box(1, 1, 1), M('#ff00ff'), 0, .5, 0);
 }
 return g;
}

// The obstacle layer. `track.props` become meshes and colliders; `near(x, z)` is what the driver asks every step (scene metres).
export function createObstacles({scene, world, toScene, fromScene, base = null, onSmash = () => {}}) {
 const root = new T.Group(); root.name = 'kart props'; scene.add(root);
 const grid = new Map(), K = 24, key = (x, z) => Math.floor(x / K) + ',' + Math.floor(z / K);
 let props = [];
 const near = (x, z) => {
  const out = [], cx = Math.floor(x / K), cz = Math.floor(z / K);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of grid.get((cx + i) + ',' + (cz + j)) || []) if (!o.dead && !o.puddle) out.push(o);
  if (base) for (const o of base(x, z)) if (!api.baseFilter || api.baseFilter(o)) out.push(o);
  return out;
 };
 const puddleAt = (x, z) => { const cx = Math.floor(x / K), cz = Math.floor(z / K); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const o of grid.get((cx + i) + ',' + (cz + j)) || []) if (o.puddle && Math.hypot(o.x - x, o.z - z) < o.r + 1) return o; return null; };
 function mount(track) {
  root.clear(); grid.clear(); props = [];
  track.props.forEach((p, i) => {
   const m = makeProp(p.kind, i), q = toScene(p.x, p.y), y = world.heightAt(q.x, q.z);
   m.position.set(q.x, y, q.z); m.rotation.y = p.rot; m.scale.setScalar(PROP_SCALE); root.add(m);
   const o = {x: q.x, z: q.z, r: p.r * PROP_SCALE, soft: !!p.soft, puddle: !!p.puddle, kind: p.kind, obj: m, home: m.position.clone(), rot: p.rot, dead: false, age: 0, v: new T.Vector3(), spin: 0,
    hit(speed, s) { if (this.dead || this.puddle) return; this.dead = true; this.age = 0; this.v.set((s?.vx ?? 0) * .9 + (Math.random() - .5) * 6, 6 + speed * .25, (s?.vz ?? 0) * .9 + (Math.random() - .5) * 6); this.spin = (Math.random() - .5) * 18; onSmash(this, speed); }};
   (grid.get(key(q.x, q.z)) || grid.set(key(q.x, q.z), []).get(key(q.x, q.z))).push(o); props.push(o);
  });
 }
 function update(dt) { // tumbling bits, then they blink out and the prop comes back
  for (const o of props) {
   if (!o.dead) continue; o.age += dt; const m = o.obj;
   if (o.age < 2) { o.v.y -= 26 * dt; m.position.addScaledVector(o.v, dt); const gy = world.heightAt(m.position.x, m.position.z); if (m.position.y < gy) { m.position.y = gy; o.v.y *= -.35; o.v.x *= .7; o.v.z *= .7; } m.rotation.x += o.spin * dt; m.rotation.z += o.spin * .6 * dt; }
   else if (o.age < 12) m.visible = o.age < 2.8 && Math.floor(o.age * 10) % 2 === 0;
   else { o.dead = false; m.visible = true; m.position.copy(o.home); m.rotation.set(0, o.rot, 0); }
  }
 }
 const api = {root, near, puddleAt, mount, update, baseFilter: null, get props() { return props; }, dispose() { root.removeFromParent(); }};
 return api;
}
