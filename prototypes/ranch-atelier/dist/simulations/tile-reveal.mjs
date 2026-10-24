import * as T from 'three';
import {rollTile} from './tile-drop-impact.mjs?v=2';
import {sfx as catalogSfx} from './catalog-sfx.mjs';
// AW-STUDY-0025 Tile pull and print, the landing (docs/oracle/tile-print/TILE_PRINT_STUDY.md).
// Evan, 2026-10-23: the tile rolls like a die; then "just literally drop" every piece with gravity, and "once everything
// has fallen, rolled.. each piece in random rapid sequence hovers wobbles re-orients, and then shoots into its normal
// place. this needs to be absolutely crisp", and "all of these should take 1.5 seconds tops".
// landTile(group) = rollTile (the bare slab rolls in) + a reveal (the standing things drop, settle, hover and shoot home).
// Presentation only: every node is put back on its exact stored transform when the reveal ends, so nothing in the
// world, the simulation or picking ever sees a moved piece afterwards.

const BUDGET = 1.5;                   // seconds from the end of the roll to everything home
const G = 30, BOUNCE = .34, MAX_PARTS = 150;
const HOV = .1, WOB = .14, SHOOT = .07, DROP_SPREAD = .18, SETTLE_CAP = .62;
const COVER_ROLES = /groundcover|meadow|grass|flower|crop|plain/;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = {out: t => 1 - (1 - t) ** 3, inout: t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2, back: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2};
const rnd = (a, b) => a + Math.random() * (b - a);
const AXES = [new T.Vector3(1, 0, 0), new T.Vector3(-1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, -1, 0), new T.Vector3(0, 0, 1), new T.Vector3(0, 0, -1)];
const DOWN = new T.Vector3(0, -1, 0);
const _q = new T.Quaternion(), _v = new T.Vector3(), _c = new T.Vector3(), _t = new T.Vector3();

// The reveal's voice, from the sound catalogue. Quiet; one tick per few pieces.
const sfx = {last: 0, bounce() { const n = performance.now(); if (n - this.last < 50) return; this.last = n; catalogSfx('click-3', {gain: .3, rate: .9 + Math.random() * .3}); },
 tick(i) { catalogSfx('tick', {gain: .5, rate: 1 + (i % 12) * .03}); }, chord() { catalogSfx('magic-chime', {gain: .7}); }};

// Which things on a drawn tile are loose pieces, which stay, which grow in. Read from the drawn tile itself
// (composer.draw): ground slabs and yard pads stay put; each standing asset group, tree crown, trunk and so on is a
// piece; ground cover grows in. Never reaches into life or any node whose own transform is not the identity.
function collect(group) {
 group.updateMatrixWorld(true);
 const inv = new T.Matrix4().copy(group.matrixWorld).invert(), parts = [], cover = [], seen = new Set();
 const boxOf = node => new T.Box3().setFromObject(node).applyMatrix4(inv);
 const roleOf = m => { const mm = Array.isArray(m) ? m[0] : m; return String(mm?.userData?.dorfRole || mm?.userData?.seasonRole || mm?.name || ''); };
 const identity = n => n.position.lengthSq() < 1e-8 && n.quaternion.angleTo(_q.identity()) < 1e-6 && Math.abs(n.scale.x - 1) + Math.abs(n.scale.y - 1) + Math.abs(n.scale.z - 1) < 1e-6;
 const add = (node, list) => {
  if (seen.has(node)) return; seen.add(node);
  const b = boxOf(node); if (b.isEmpty()) return;
  const size = b.getSize(new T.Vector3()), centre = b.getCenter(new T.Vector3());
  list.push({node, c: centre, half: size.clone().multiplyScalar(.5), pos0: node.position.clone(), quat0: node.quaternion.clone(), scale0: node.scale.clone(), vis0: node.visible});
 };
 for (const top of group.children) {
  if (top.userData?.presentation || top.isLine || top.isLight || top.visible === false) continue;
  const roles = new Set(); let meshes = 0; top.traverse(x => { if (x.isMesh) { meshes++; roles.add(roleOf(x.material)); } });
  if (!meshes) continue;
  if ([...roles].every(r => r === 'ground' || r === 'stone-ground')) continue;                 // slabs and yard pads stay
  if (top.isMesh || top.position.lengthSq() > 1e-8 || !identity(top)) { add(top, parts); continue; }
  for (const m of top.children) {                                                          // a baked cluster: its meshes are the pieces
   if (!m.isMesh && !m.children.length) continue;
   let hasMesh = false; m.traverse(x => { if (x.isMesh) hasMesh = true; }); if (!hasMesh) continue;
   const r = roleOf(m.isMesh ? m.material : (() => { let f; m.traverse(x => { if (!f && x.isMesh) f = x.material; }); return f; })());
   add(m, m.isInstancedMesh || COVER_ROLES.test(r) || r === 'ground' ? cover : parts);
  }
 }
 // too many loose pieces for a 1.5 s show: the smallest become ground cover
 if (parts.length > MAX_PARTS) { parts.sort((a, b) => b.half.lengthSq() - a.half.lengthSq()); cover.push(...parts.splice(MAX_PARTS)); }
 return {parts, cover};
}

function applyPose(pt, p, q, s = 1) {
 const n = pt.node;
 _v.copy(pt.pos0).sub(pt.c).multiplyScalar(s).applyQuaternion(q).add(p); n.position.copy(_v);
 n.quaternion.copy(q).multiply(pt.quat0); n.scale.copy(pt.scale0).multiplyScalar(s);
}
function growCover(pt, s) {                                    // uniform growth out of the ground, about the bottom centre of its box
 const n = pt.node, bx = pt.c.x, by = pt.c.y - pt.half.y, bz = pt.c.z;
 // the box centre and pos0 are in the parent's space, so scaling about (bx,by,bz) keeps the base planted
 n.scale.copy(pt.scale0).multiplyScalar(s); n.position.set(bx + (pt.pos0.x - bx) * s, by + (pt.pos0.y - by) * s, bz + (pt.pos0.z - bz) * s);
}
function lowest(pt) {
 let lo = 1e9, lx = 0, lz = 0;
 for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { _c.set(sx * pt.half.x, sy * pt.half.y, sz * pt.half.z).applyQuaternion(pt.q); if (_c.y < lo) { lo = _c.y; lx = _c.x; lz = _c.z; } }
 return {y: lo, x: lx, z: lz};
}
function faceDown(pt, h) {
 let best = null, bd = -2;
 for (const a of AXES) { _t.copy(a).applyQuaternion(pt.q); if (-_t.y > bd) { bd = -_t.y; best = _t.clone(); } }
 pt.q.slerp(new T.Quaternion().setFromUnitVectors(best, DOWN).multiply(pt.q), 1 - Math.exp(-h * 34));
}
function stepPart(pt, h, ctxs) {
 if (!pt.live || pt.rest) return;
 pt.v.y -= G * h; pt.p.addScaledVector(pt.v, h);
 _q.set(pt.w.x * h / 2, pt.w.y * h / 2, pt.w.z * h / 2, 0).multiply(pt.q); pt.q.set(pt.q.x + _q.x, pt.q.y + _q.y, pt.q.z + _q.z, pt.q.w + _q.w).normalize();
 const r = Math.hypot(pt.p.x, pt.p.z);
 if (r > ctxs.rin) { const f = ctxs.rin / r; pt.p.x *= f; pt.p.z *= f; if (pt.v.x * pt.p.x + pt.v.z * pt.p.z > 0) { pt.v.x *= -.3; pt.v.z *= -.3; } }
 const fl = pt.floor, c = lowest(pt), pen = fl - (pt.p.y + c.y);
 if (pen > 0) {
  pt.p.y += pen;
  if (pt.v.y < 0) {
   const vy = -pt.v.y, j = vy * 1.3 / (pt.r * pt.r) * .09;
   pt.w.x += -c.z * j; pt.w.z += c.x * j; pt.v.y = vy * BOUNCE; if (pt.v.y < 1.2) pt.v.y = 0; else sfx.bounce(); pt.v.x *= .82; pt.v.z *= .82;
  }
  pt.v.x *= 1 - 2.6 * h; pt.v.z *= 1 - 2.6 * h; pt.w.multiplyScalar(1 - 2.2 * h);
  if (pt.v.lengthSq() < .25 && pt.w.lengthSq() < 3) { faceDown(pt, h); pt.w.multiplyScalar(1 - 6 * h); pt.still += h; if (pt.still > .05) { pt.rest = true; pt.v.set(0, 0, 0); pt.w.set(0, 0, 0); } } else pt.still = 0;
 } else pt.still = 0;
}
function physics(parts, dt, ctxs) {
 const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
 for (const pt of parts) if (pt.live && !pt.rest) pt.floor = ctxs.floorAt(pt.p.x, pt.p.z);
 for (let s = 0; s < n; s++) for (const pt of parts) stepPart(pt, h, ctxs);
}
const settled = (parts, t, cap) => t > cap || parts.every(p => !p.live || p.rest);

// The reveal. `ground` = floorAt(x, z): the tile's surface height in the group's own frame.
export function revealTile(group, {parts, cover, floorAt, hexRadius, reducedMotion = false, onDone}) {
 const N = parts.length, ctxs = {floorAt, rin: hexRadius * .9};
 let t = 0, done = false, asmAt = null, order = [], arrived = 0, lastAt = 0, chimed = false, coverAt = null;
 const STEP = Math.min(.012, .42 / Math.max(1, N));
 const restore = () => { for (const pt of parts) { pt.node.position.copy(pt.pos0); pt.node.quaternion.copy(pt.quat0); pt.node.scale.copy(pt.scale0); pt.node.visible = pt.vis0; } for (const pt of cover) { pt.node.position.copy(pt.pos0); pt.node.quaternion.copy(pt.quat0); pt.node.scale.copy(pt.scale0); pt.node.visible = pt.vis0; } };
 const finish = () => { if (done) return; done = true; restore(); onDone?.(); };
 for (const pt of parts) {
  pt.p = pt.c.clone(); pt.q = new T.Quaternion(); pt.v = new T.Vector3(); pt.w = new T.Vector3(); pt.live = false; pt.rest = false; pt.still = 0; pt.started = false; pt.arrived = false; pt.floor = 0; pt.at = 0;
  pt.r = Math.max(.05, pt.half.length()); pt.ax = new T.Vector3(rnd(-1, 1), 0, rnd(-1, 1)).normalize(); pt.p0 = new T.Vector3(); pt.q0 = new T.Quaternion(); pt.hov = new T.Vector3(); pt.drop = rnd(0, DROP_SPREAD);
  const a = Math.atan2(pt.c.z, pt.c.x), rr = Math.min(hexRadius * .85, Math.hypot(pt.c.x, pt.c.z) * rnd(.55, 1) + rnd(0, .5));
  pt.spawn = new T.Vector3(Math.cos(a) * rr + rnd(-.3, .3), 0, Math.sin(a) * rr + rnd(-.3, .3));
  pt.spawnY = rnd(1.2, 2.1);
  pt.node.visible = false;
 }
 for (const pt of cover) { pt.node.visible = false; pt.delay = rnd(0, .22); }
 function assemble(a) {
  order.forEach((idx, i) => {
   const pt = parts[idx], u = a - i * STEP; if (u < 0) return;
   if (!pt.started) { pt.started = true; pt.rest = true; pt.p0.copy(pt.p); pt.q0.copy(pt.q); pt.hov.set(pt.p.x, Math.max(pt.p.y, pt.c.y) + .9 + pt.r * .6, pt.p.z); }
   let s = 1;
   if (u < HOV) { pt.p.lerpVectors(pt.p0, pt.hov, ease.out(u / HOV)); pt.q.copy(pt.q0); }
   else if (u < HOV + WOB) { const k = (u - HOV) / WOB; pt.p.copy(pt.hov); pt.p.y += Math.sin(k * Math.PI * 2) * .045; pt.q.copy(pt.q0).slerp(_q.identity(), ease.inout(k)); const wob = new T.Quaternion().setFromAxisAngle(pt.ax, .42 * Math.sin(k * Math.PI * 3) * (1 - k)); pt.q.premultiply(wob); }
   else if (u < HOV + WOB + SHOOT) { const k = (u - HOV - WOB) / SHOOT; pt.p.lerpVectors(pt.hov, pt.c, k * k * k); pt.q.identity(); s = 1 + .08 * k; }
   else { pt.p.copy(pt.c); pt.q.identity(); if (!pt.arrived) { pt.arrived = true; pt.at = a; arrived++; lastAt = t; if (arrived % 6 === 1) sfx.tick(arrived); } const d = Math.max(0, 1 - (a - pt.at) / .1); s = 1 + .1 * d; }
   pt.scaleNow = s;
  });
 }
 function update(dt) {
  if (done) return;
  t += Math.max(0, Math.min(dt, .05));
  for (const pt of parts) if (!pt.live && !pt.started && t >= pt.drop) { pt.live = true; const fy = floorAt(pt.spawn.x, pt.spawn.z); pt.p.set(pt.spawn.x, fy + pt.spawnY + pt.half.y, pt.spawn.z); pt.q.setFromEuler(new T.Euler(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3))); pt.v.set(rnd(-.2, .2), rnd(-1, 0), rnd(-.2, .2)); pt.w.set(rnd(-4, 4), rnd(-4, 4), rnd(-4, 4)); }
  physics(parts, Math.max(1e-4, dt), ctxs);
  if (asmAt == null && t > .3 && settled(parts, t, SETTLE_CAP)) { asmAt = t + .02; order = parts.map((_, i) => i).sort(() => Math.random() - .5); coverAt = asmAt + .12; }
  if (asmAt != null) assemble(t - asmAt);
  for (const pt of parts) { if (pt.started && pt.scaleNow && pt.scaleNow !== 1) { applyPose(pt, pt.p, pt.q, pt.scaleNow); pt.node.visible = true; } else if (pt.live) { pt.node.visible = true; applyPose(pt, pt.p, pt.q); } }
  if (coverAt != null) for (const pt of cover) { const u = clamp((t - coverAt - pt.delay) / .3); pt.node.visible = u > 0; if (u > 0) growCover(pt, Math.max(.001, ease.back(u))); }
  const allHome = N === 0 || (arrived >= N && t - lastAt > .1);
  const coverDone = coverAt == null ? N === 0 : t - coverAt > .55;
  if (allHome && coverDone && !chimed) { chimed = true; sfx.chord(); finish(); return; }
  if (t > BUDGET + .1) finish();
 }
 return {update, finish, get done() { return done; }, get time() { return t; }};
}

// Nothing to take apart (a city or moon tile, a tile of one slab): the contents grow in, staggered, in well under a second.
function growIn(group, {onDone}) {
 const nodes = []; for (const top of group.children) { if (top.isLine || top.isLight || !top.visible) continue; top.updateMatrixWorld(true); nodes.push({node: top, p0: top.position.clone(), s0: top.scale.clone(), d: rnd(0, .3)}); }
 let t = 0, done = false; const finish = () => { if (done) return; done = true; for (const n of nodes) { n.node.scale.copy(n.s0); n.node.position.copy(n.p0); n.node.visible = true; } onDone?.(); };
 for (const n of nodes) n.node.scale.multiplyScalar(.001);
 return {update(dt) { if (done) return; t += dt; for (const n of nodes) { const u = clamp((t - n.d) / .35); n.node.scale.copy(n.s0).multiplyScalar(Math.max(.001, ease.back(u))); } if (t > .75) finish(); }, finish, get done() { return done; }};
}

// The landing: same contract as rollTile (update, finish, done, impacted, progress, impactIn).
export function landTile(group, {reducedMotion = false, onImpact, lift, floorAt} = {}) {
 let sets = null;
 try { if (!reducedMotion) sets = collect(group); } catch { sets = null; }
 const bare = sets && (sets.parts.length >= 3 || sets.cover.length >= 3);
 let hexRadius = 4; try { const g = new T.Box3().setFromObject(group), s = g.getSize(new T.Vector3()); hexRadius = Math.max(1, Math.min(s.x, s.z) / 2); } catch { /* keep default */ }
 const surface = floorAt ? (x, z) => floorAt(x, z) : () => Math.min(...(sets?.parts.map(p => p.c.y - p.half.y) || [0]));
 if (bare) { for (const pt of sets.parts) pt.node.visible = false; for (const pt of sets.cover) pt.node.visible = false; }   // the bare slab is what rolls
 const roll = rollTile(group, {reducedMotion, onImpact, lift});
 let reveal = null, finished = false;
 const begin = () => { if (reveal || !bare) return; reveal = sets.parts.length >= 3 ? revealTile(group, {...sets, floorAt: surface, hexRadius, reducedMotion}) : growIn(group, {onDone: () => {}}); };
 const restoreAll = () => { if (!sets) return; for (const pt of [...sets.parts, ...sets.cover]) { pt.node.position.copy(pt.pos0); pt.node.quaternion.copy(pt.quat0); pt.node.scale.copy(pt.scale0); pt.node.visible = pt.vis0; } };
 return {
  update(dt) {
   if (finished) return;
   if (!roll.done) { roll.update(dt); if (!roll.done) return; begin(); if (!reveal) { finished = true; return; } return; }
   if (!reveal) { finished = true; return; }
   reveal.update(dt); if (reveal.done) finished = true;
  },
  finish() { roll.finish(); reveal?.finish(); restoreAll(); finished = true; },
  get done() { return finished || (roll.done && !bare); },
  get impacted() { return roll.impacted; },
  get progress() { return finished ? 1 : roll.done ? Math.min(1, .55 + .45 * ((reveal?.time || 0) / BUDGET)) : roll.progress * .55; },
  impactIn: () => roll.impactIn()
 };
}
