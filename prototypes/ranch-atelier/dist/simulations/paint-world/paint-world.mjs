// Paint the world (AW-STUDY-0049). Playing the Paint card rains paint from the sky onto the board; each splat stays for one
// in-game day; strange plants grow from it (sprout, grow, bloom) and stay after the paint is gone.
//   const world = createPaintWorld({scene, heightAt, unit: .1, camera})   heightAt(x, z) in METRES, returns metres (the lab's)
//   world.play({colours, at: {x, z}, count, spread}, clock)                clock = {day, hour}; at/spread in render units
//   world.update(dt, clock, {daylight})                                     every frame; all growth derives from the clock
//   world.warm(renderer, camera)                                            compiles the one splat program and the plant material
//   world.snapshot() / world.restore(snap) / world.save(key) / world.load(key)
// Time is the day clock only (hours = day*24 + hour), so pausing the game pauses growth and jumping the time of day
// advances it. Nothing here edits a tile or a shared material, so a card play is a few hundred triangles of new work.
import * as T from 'three';
import {createSplatPool} from './paint-splat.mjs';
import {makePlant, PLANT_IDS, PAINT_COLOURS, SPECIES} from './alien-plants.mjs';

export const PAINT_IDS = PLANT_IDS;
export const hoursOf = clock => clock.day * 24 + clock.hour;
export const PLANT_GROW_HOURS = 12, PLANT_LIFE_HOURS = 72, PAINT_LIFE_HOURS = 24;
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
export const daylightAt = h => { const x = ((h % 24) + 24) % 24, s = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); }; return s(5.5, 8, x) * (1 - s(18, 20.5, x)); };

export function createPaintWorld({scene, heightAt, unit = .1, camera, wash = .6, plantScale = 2, maxPlants = 30}) {
 const root = new T.Group(); root.name = 'paint-world'; scene.add(root);
 const pool = createSplatPool({size: 14}); root.add(pool.root);
 const plantRoot = new T.Group(); plantRoot.name = 'paint-plants'; root.add(plantRoot);
 const dropRoot = new T.Group(); dropRoot.name = 'paint-drops'; root.add(dropRoot);
 const hAt = (x, z) => heightAt(x / unit, z / unit) * unit;
 let real = 0, now = 0, balls = [], plants = [], seedCounter = 1 + Math.floor(Math.random() * 9000);

 // ---- the sky drops: a pooled teardrop that stretches as it falls, plus tiny flung droplets on landing
 const tear = new T.LatheGeometry([[0, .5], [.12, .26], [.2, .0], [.17, -.12], [.09, -.2], [0, -.22]].map(([x, y]) => new T.Vector2(x, y)), 8);
 const dropMats = {}, dropMat = id => dropMats[id] ??= Object.assign(new T.MeshStandardMaterial({color: PAINT_COLOURS[id].paint, emissive: PAINT_COLOURS[id].paint, emissiveIntensity: .35, roughness: .25, flatShading: true}), {name: 'paint-drop-' + id});
 const bit = new T.IcosahedronGeometry(.5, 0);
 const dropPool = [], bitPool = [];
 const take = (list, make) => list.find(o => !o.busy) || (list.length < 80 ? (list.push(make()), list[list.length - 1]) : list[0]);
 const makeDrop = () => { const m = new T.Mesh(tear, dropMat('pink')); m.visible = false; m.raycast = () => {}; dropRoot.add(m); return {mesh: m, busy: false}; };
 const makeBit = () => { const m = new T.Mesh(bit, dropMat('pink')); m.visible = false; m.raycast = () => {}; dropRoot.add(m); return {mesh: m, busy: false}; };
 for (let i = 0; i < 8; i++) dropPool.push(makeDrop());
 for (let i = 0; i < 24; i++) bitPool.push(makeBit());

 function landed(d, clock) {
  const birth = hoursOf(clock), r = rng(d.seed * 977 + 11), n = Math.max(2, Math.min(9, Math.round((4 + Math.floor(r() * 3)) * Math.pow(d.R / .95, 1.3))));
  pool.spawn({x: d.x, z: d.z, R: d.R, colour: d.colour, seed: d.seed, birth, landed: real, heightAt: hAt});
  for (let i = 0; i < n; i++) { // plants sit inside the paint, spread by the golden angle so they never crowd
   const a = i * 2.39996 + r() * .4, rr = Math.sqrt((i + .6) / n) * d.R * .6;
   addPlant({x: d.x + Math.cos(a) * rr, z: d.z + Math.sin(a) * rr, colour: d.colour, seed: d.seed + i * 31, birth: birth + .3 + r() * 1.5, ry: r() * 6.28, sc: .8 + r() * .5});
  }
  const y0 = hAt(d.x, d.z);
  for (let i = 0; i < 6; i++) { const b = take(bitPool, makeBit); b.busy = true; b.mesh.material = dropMat(d.colour); b.mesh.visible = true; const a = r() * 6.28, sp = .5 + r() * .8; Object.assign(b, {vx: Math.cos(a) * sp * unit * 6, vz: Math.sin(a) * sp * unit * 6, vy: (1.2 + r()) * unit * 8, t: 0, s: .05 + r() * .06, base: y0}); b.mesh.position.set(d.x, y0 + .03, d.z); }
 }
 function addPlant(o) {
  if (plants.length >= maxPlants) removePlant(plants.reduce((a, b) => (a.birth <= b.birth ? a : b)));
  const P = makePlant(o.colour, o.seed);
  P.group.scale.setScalar(unit * plantScale * (o.sc || 1)); P.group.rotation.y = o.ry || 0; P.group.position.set(o.x, hAt(o.x, o.z), o.z); P.group.visible = false;
  plantRoot.add(P.group); const rec = {...o, P}; plants.push(rec); return rec;
 }
 function removePlant(p) { p.P.group.removeFromParent(); p.P.dispose(); plants = plants.filter(q => q !== p); }

 return {
  root, pool, plants: () => plants, unit,
  // Card play: `count` drops fall around `at`, coloured in turn from `colours`, staggered, and splat where they land.
  play({colours = PLANT_IDS.slice(0, 2), at = {x: 0, z: 0}, count = 4, spread = 1.6, R = [.75, 1.15]} = {}, clock = {day: 1, hour: 12}) {
   const r = rng(seedCounter++ * 7919 + 13); let made = 0;
   for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + r() * 1.1, rr = spread * (.25 + .75 * Math.sqrt(r())), x = at.x + Math.cos(a) * rr, z = at.z + Math.sin(a) * rr;
    if (!Number.isFinite(hAt(x, z))) continue;
    const colour = colours[i % colours.length], d = take(dropPool, makeDrop); d.busy = true; d.mesh.material = dropMat(colour);
    Object.assign(d, {x, z, colour, R: R[0] + r() * (R[1] - R[0]), seed: 1 + Math.floor(r() * 99999), delay: i * .22 + r() * .12, t: 0, fall: .75 + r() * .3, top: 6, clock: {...clock}});
    d.mesh.visible = false; made++;
   }
   return made;
  },
  // A thrown splat ball (the card's reward): leaves a hand at (x, z) with horizontal velocity (vx, vz) in render units per
  // second, arcs under gravity and splats where it comes down, sized by R. Inertia carries it; nothing steers it.
  launch({x, z, vx = 0, vz = 0, colour = 'pink', R = .95, lift = .45, vy = 1.1} = {}, clock = {day: 1, hour: 12}) {
   const b = {x, z, vx, vz, vy, y: hAt(x, z) + lift, colour, R, seed: 1 + Math.floor(Math.random() * 99999), clock: {...clock}, mesh: new T.Mesh(bit, dropMat(colour))};
   b.mesh.scale.setScalar(.14 + .12 * R); b.mesh.raycast = () => {}; dropRoot.add(b.mesh); balls.push(b); return b;
  },
  update(dt, clock, {daylight} = {}) {
   real += dt; now = hoursOf(clock);
   const day = daylight ?? daylightAt(clock.hour);
   for (const d of dropPool) {
    if (!d.busy) continue;
    d.t += dt; if (d.t < d.delay) continue;
    const u = Math.min(1, (d.t - d.delay) / d.fall), y = hAt(d.x, d.z) + d.top * (1 - u * u);
    d.mesh.visible = true; d.mesh.position.set(d.x, y, d.z);
    const stretch = 1 + u * 1.1, w = unit * 7 * (.7 + .3 * Math.min(1, u * 4)); d.mesh.scale.set(w / Math.sqrt(stretch), w * stretch, w / Math.sqrt(stretch));
    if (u >= 1) { d.busy = false; d.mesh.visible = false; landed(d, d.clock); }
   }
   for (const b of balls.slice()) {
    b.vy -= unit * 60 * dt; b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    const g = hAt(b.x, b.z); b.mesh.position.set(b.x, b.y, b.z); b.mesh.rotation.x += dt * 6;
    const sp = Math.hypot(b.vx, b.vz, b.vy); b.mesh.scale.set(1, 1, 1).multiplyScalar(.14 + .12 * b.R).multiply(new T.Vector3(1 / (1 + sp * .04), 1 + sp * .08, 1 / (1 + sp * .04)));
    if (b.y <= g + .01 || b.y < -5) { b.mesh.removeFromParent(); balls = balls.filter(q => q !== b); if (Number.isFinite(g)) landed({x: b.x, z: b.z, colour: b.colour, R: b.R, seed: b.seed}, b.clock); }
   }
   for (const b of bitPool) {
    if (!b.busy) continue;
    b.t += dt; b.vy -= unit * 40 * dt; const p = b.mesh.position; p.x += b.vx * dt; p.z += b.vz * dt; p.y += b.vy * dt;
    b.mesh.scale.setScalar(b.s * Math.max(.001, 1 - b.t / .9));
    if (b.t > .9 || p.y < b.base) { b.busy = false; b.mesh.visible = false; }
   }
   pool.update(now, real, camera, day, wash);

   for (const p of plants.slice()) {
    const age = now - p.birth;
    if (age > PLANT_LIFE_HOURS) { removePlant(p); continue; }
    p.P.group.visible = age > 0; if (age <= 0) continue;
    // in the last 4 hours of its life a plant sinks back into the soil
    const sink = Math.min(1, Math.max(0, (PLANT_LIFE_HOURS - age) / 4));
    p.P.group.scale.setScalar(unit * plantScale * (p.sc || 1) * (.2 + .8 * sink));
    p.P.pose(Math.min(1, age / PLANT_GROW_HOURS), real, 1 - day);
   }
  },
  // Compile the one splat program and the plant materials before the first card is played (no hitch on the first drop).
  warm(renderer, cam = camera) {
   pool.spawn({x: 9999, z: 9999, R: .1, colour: 'pink', seed: 1, birth: now, landed: -9, heightAt: () => 0});
   const dummy = makePlant(PLANT_IDS[0], 1); dummy.group.position.set(9999, 0, 9999); plantRoot.add(dummy.group); dummy.pose(1, 0, 0);
   const d = take(dropPool, makeDrop); d.mesh.visible = true; d.mesh.position.set(9999, 0, 9999);
   try { renderer.compile(root, cam); } catch (e) { console.warn('paint warm failed', e); }
   d.mesh.visible = false; dummy.group.removeFromParent(); dummy.dispose(); pool.hideAll();
  },
  snapshot() { return {v: 1, splats: pool.live().map(({x, z, R, colour, seed, birth}) => ({x, z, R, colour, seed, birth})), plants: plants.map(({x, z, colour, seed, birth, ry, sc}) => ({x, z, colour, seed, birth, ry, sc}))}; },
  restore(s) {
   if (!s || s.v !== 1) return false;
   this.clear();
   for (const o of s.splats || []) pool.spawn({...o, landed: real - 9, heightAt: hAt});
   for (const o of s.plants || []) addPlant(o);
   return true;
  },
  save(key) { try { localStorage.setItem('paint-world:' + key, JSON.stringify(this.snapshot())); } catch {} },
  load(key) { try { return this.restore(JSON.parse(localStorage.getItem('paint-world:' + key))); } catch { return false; } },
  clear() { pool.hideAll(); for (const b of balls) b.mesh.removeFromParent(); balls = []; for (const p of plants.slice()) removePlant(p); },
  setWash(w) { wash = w; },
  summary: () => ({splats: pool.live().length, plants: plants.length, stages: plants.map(p => +p.P.stage.toFixed(2))}),
  dispose() { this.clear(); pool.dispose(); root.removeFromParent(); }
 };
}
export {SPECIES, PAINT_COLOURS};
