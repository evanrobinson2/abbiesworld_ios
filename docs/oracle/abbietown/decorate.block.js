// ---------- the procedural decorator (AW-STUDY-0042, Evan 2026-10-23 4:31 PM: "procedurally decorate") ----------
// Runs once per hex after the houses and trees are down. Everything is instanced and seeded by position, so a hex always
// decorates the same way. It reads the ground and the water, never the placement of places: fences, hedges, beds and mailboxes
// go with the kit houses; reeds, lily pads and stones go with the water; walls follow the lanes; flowers and rocks fill the grass.
const dRnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const FLOWERS = ['#f6d04a', '#f08ab0', '#ffffff', '#b99af0', '#f28a4a', '#8fc8f2'];
function decorate(out, c) {
 const grp = new THREE.Group(); out.add(grp);
 const houses = c.houses || [], posts = [], rails = [], hedges = [], beds = [], bushes = [], boxes = [], walls = [], rocks = [], reeds = [], pads = [], meadow = [];
 const clear = (x, y, r = 0) => !c.taken.some(t => Math.hypot(t.x - x, t.y - y) < (t.r || 8) * .8 + r);
 houses.forEach((h, i) => {
  const w = 9 + h.tier * 2.2, dp = 8, ca = Math.cos(h.yaw), sa = Math.sin(h.yaw), to = (lx, lz) => [h.x + lx * ca + lz * sa, h.z - lx * sa + lz * ca]; // house frame (+z is the front) to tile (x, z)
  const lift = (lx, lz) => { const [x, z] = to(lx, lz); return {x, z, y: c.hf(x, -z)}; };
  const nr = c.nearRoad(h.x, -h.z); if (nr && nr.d < dp * .5 + 5.5) return; // the house stands right on the street: no yard to fence
  const zf = dp / 2 + 3.4, stone = h.tier === 2, n = Math.ceil((w + 3) / 1.5);
  for (let k = 0; k <= n; k++) { const lx = -w / 2 - 1.5 + k * ((w + 3) / n); if (Math.abs(lx) < 1.6) continue; const p = lift(lx, zf); (stone ? walls : posts).push({...p, yaw: h.yaw, s: stone ? 1.6 : 1}); }
  for (const sd of [-1, 1]) { const a = lift(sd * (w / 2 + 1.5), zf), b = lift(sd * 1.6, zf); rails.push({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (stone ? .5 : .75), z: (a.z + b.z) / 2, len: Math.hypot(a.x - b.x, a.z - b.z), yaw: h.yaw, stone}); }
  if (h.tier >= 1 || i % 2) for (const [lx, lz] of [[-w / 2 - 2.4, 0], [w / 2 + 2.4, 0], [0, -dp / 2 - 2.6]]) { const horiz = lz !== 0; for (let k = -2; k <= 2; k++) { const p = lift(lx + (horiz ? k * 2.1 : 0), lz + (horiz ? 0 : k * 2.1)); hedges.push({...p, s: .9 + dRnd(i * 7 + k) * .3}); } }
  for (let k = 0; k < 7; k++) { const p = lift((dRnd(i * 11 + k) - .5) * w * .9, dp / 2 + 1.5 + dRnd(i * 5 + k) * 1.2); beds.push({...p, c: FLOWERS[(i + k) % FLOWERS.length]}); }
  for (const sd of [-1, 1]) bushes.push({...lift(sd * (w / 2 + .4), dp / 2 + .2), s: .9 + dRnd(i + sd) * .5});
  const m = lift(w / 2 + 2.2, zf + 1.4); boxes.push({...m, yaw: h.yaw});
 });
 // the water's edge: reeds on the dry side, lily pads in the shallows
 const cell = 3, wet = new Map(), key = (x, y) => Math.round(x / cell) + ',' + Math.round(y / cell); for (const v of c.verts) if (!isNaN(v.w)) wet.set(key(v.px, v.py), v);
 const nearWet = v => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const w = wet.get(Math.round(v.px / cell + a) + ',' + Math.round(v.py / cell + b)); if (w) return true; } return false; };
 c.verts.forEach((v, i) => {
  if (Math.hypot(v.px, v.py) > DIO_R * .93) return;
  if (!isNaN(v.w)) { const dep = v.w - v.h; if (dep > .15 && dep < 1.6 && dRnd(i) < .12) pads.push({x: v.px, y: v.w + .07, z: -v.py, s: .55 + dRnd(i + 3) * .5, f: dRnd(i + 9) < .25}); return; }
  if (nearWet(v)) { if (dRnd(i + 1) < .5) for (let k = 0; k < 3; k++) reeds.push({x: v.px + (dRnd(i * 3 + k) - .5) * 2.2, y: v.h, z: -v.py + (dRnd(i * 5 + k) - .5) * 2.2, s: .8 + dRnd(i * 9 + k) * .9, cat: k === 0}); return; }
  if (!clear(v.px, v.py, 1)) return; const nr = c.nearRoad(v.px, v.py); if (nr && nr.d < nr.w / 2 + 2) return;
  const r = dRnd(i * 1.7 + 4);
  if (r < .045) meadow.push({x: v.px + dRnd(i) * 2 - 1, y: v.h, z: -v.py + dRnd(i + 5) * 2 - 1, c: FLOWERS[i % FLOWERS.length], s: .22 + dRnd(i + 2) * .16});
  else if (r > .985 && v.h > 5) rocks.push({x: v.px, y: v.h, z: -v.py, s: .6 + dRnd(i + 8) * 1.1, r: dRnd(i + 6) * 6});
 });
 // stone walls along the lanes of the quieter hexes
 if (c.walls) for (const poly of c.laneLines) walk(poly, 1.3, (x, y, tx, ty) => { for (const sd of [-1, 1]) { const k = Math.floor(x * 3 + y * 5 + sd * 11); if (dRnd(k) < .6) continue; const px = x - ty * sd * 3.6, py = y + tx * sd * 3.6; if (!inHex(px, py, DIO_R * .9) || !isNaN(c.waterY(px, py)) || !clear(px, py)) continue; const nr = c.nearRoad(px, py); if (nr && nr.d < nr.w / 2 + .5) continue; walls.push({x: px, y: c.hf(px, py), z: -py, yaw: Math.atan2(ty, tx), s: .7 + dRnd(k + 2) * .5, long: true}); } });
 // clumps of extra trees on open grass, so a hillside is never bare: noise picks the groves, the hash picks the trees
 const grove = [], AUT = ['#d9842f', '#e8b932', '#c8452a', '#8a9a3a', '#6a8a3a', '#e0a23a']; c.verts.forEach((v, i) => { if (grove.length >= 260 || !isNaN(v.w) || Math.hypot(v.px, v.py) > DIO_R * .92) return; const n = Math.sin(v.px * .045 + 1.3) * Math.cos(v.py * .05 + .4) + Math.sin(v.px * .11 + v.py * .07 + 2) * .6; if (n < .55 || dRnd(i * 2.3 + 9) > .16 || !clear(v.px, v.py, 2.6)) return; const nr = c.nearRoad(v.px, v.py); if (nr && nr.d < nr.w / 2 + 2.2) return; if (grove.some(t => Math.hypot(t.x - v.px, t.y - v.py) < 3.4)) return; grove.push({x: v.px, y: v.py, hz: v.h, s: .8 + dRnd(i + 4) * .7, pine: dRnd(i + 7) < .35, c: AUT[i % AUT.length]}); });
 const A = (list, geo, mat, fn) => { if (list.length) grp.add(inst(geo, mat, list, fn)); };
 A(posts, boxGeo, plainMat, p => { v3.set(p.x, p.y, p.z); q.setFromEuler(e.set(0, p.yaw, 0)); sc.set(.28, 1.1, .28); col.set('#f1ede0'); });
 A(rails, boxGeo, plainMat, r => { v3.set(r.x, r.y, r.z); q.setFromEuler(e.set(0, r.yaw + Math.PI / 2, 0)); sc.set(r.stone ? .9 : .16, r.stone ? .8 : .18, r.len); col.set(r.stone ? '#a8a49c' : '#f1ede0'); });
 A(walls, boxGeo, plainMat, w => { v3.set(w.x, w.y, w.z); q.setFromEuler(e.set(0, w.yaw || 0, 0)); sc.set(w.long ? 1.5 : .9, (w.s || 1) * .75, w.long ? .75 : .9); col.set(['#a8a49c', '#97938b', '#b3afa6'][Math.floor(w.s * 7) % 3]); });
 A(hedges, TREE_HI.crown, leafMat, b => { v3.set(b.x, b.y + .55, b.z); q.identity(); sc.set(1.3 * b.s, .85 * b.s, 1.3 * b.s); col.set('#4f8a3e'); });
 A(bushes, TREE_HI.crown, leafMat, b => { v3.set(b.x, b.y + .6, b.z); q.identity(); sc.set(.95 * b.s, .75 * b.s, .95 * b.s); col.set('#5f9a46'); });
 A(beds, new THREE.IcosahedronGeometry(1, 0), plainMat, b => { v3.set(b.x, b.y + .2, b.z); q.identity(); sc.set(.34, .26, .34); col.set(b.c); });
 A(meadow, new THREE.IcosahedronGeometry(1, 0), plainMat, b => { v3.set(b.x, b.y + .3, b.z); q.identity(); sc.set(b.s, b.s, b.s); col.set(b.c); });
 A(boxes, boxGeo, plainMat, b => { v3.set(b.x, b.y + 1.1, b.z); q.setFromEuler(e.set(0, b.yaw, 0)); sc.set(.55, .5, .8); col.set('#2e5fa8'); });
 A(boxes, HK.cyl, plainMat, b => { v3.set(b.x, b.y, b.z); q.identity(); sc.set(.08, 1.1, .08); col.set('#5a4636'); });
 A(rocks, new THREE.DodecahedronGeometry(1, 0), plainMat, r => { v3.set(r.x, r.y + r.s * .3, r.z); q.setFromEuler(e.set(r.r, r.r * 2, 0)); sc.set(r.s, r.s * .7, r.s * .9); col.set(['#9a9a96', '#b3afa6', '#8b8984'][Math.floor(r.r) % 3]); });
 A(reeds, HK.cone, plainMat, r => { v3.set(r.x, r.y, r.z); q.identity(); sc.set(.12, 1.7 * r.s, .12); col.set('#8aa04a'); });
 A(reeds.filter(r => r.cat), HK.cyl, plainMat, r => { v3.set(r.x, r.y + 1.5 * r.s, r.z); q.identity(); sc.set(.12, .5, .12); col.set('#6a4a2e'); });
 A(pads, HK.cyl, plainMat, p => { v3.set(p.x, p.y, p.z); q.identity(); sc.set(.7 * p.s, .05, .7 * p.s); col.set(p.f ? '#e87aa4' : '#4f9a4a'); });
 A(grove.filter(t => !t.pine), TREE_HI.trunk, plainMat, t => { v3.set(t.x, t.hz, -t.y); q.identity(); sc.set(.7 * t.s, 2.6 * t.s, .7 * t.s); col.set('#6b4f36'); });
 A(grove.filter(t => !t.pine), TREE_HI.crown, leafMat, t => { v3.set(t.x, t.hz + 3.6 * t.s, -t.y); q.setFromEuler(e.set(t.x % 1, t.y % 3, 0)); sc.set(2.6 * t.s, 2.9 * t.s, 2.6 * t.s); col.set(t.c); });
 A(grove.filter(t => t.pine), TREE_HI.pine, leafMat, t => { v3.set(t.x, t.hz + .4, -t.y); q.identity(); sc.set(1.9 * t.s, 8 * t.s, 1.9 * t.s); col.set('#2f5a3a'); });
 return grp;
}
