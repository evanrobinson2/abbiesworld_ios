// ---------- the places Winchester, MA adds to the town's own set (AW-STUDY-0042, seven hexes) ----------
// Same builder shape as BUILD in the template: (g, s) fills a group at the place's origin; y = 0 is the pad. They are built
// at cartoon size and scaled by HERO[id].sc on their tile. Shapes only: no real names, signs or addresses.
const trainCar = (g, x, z, body, roof) => { box(g, 9, 3.6, 3.4, body, x, 1.1, z); box(g, 9.4, .5, 3.8, roof, x, 4.7, z); for (let i = -1; i <= 1; i++) box(g, 1.3, 1.2, .2, '#cfe6f2', x + i * 2.7, 2.6, z + 1.72); for (const k of [-3, 3]) { cyl(g, .8, .8, .4, '#2a2a2e', x + k, .1, z + 1.5, 10).rotation.x = Math.PI / 2; cyl(g, .8, .8, .4, '#2a2a2e', x + k, .1, z - 1.5, 10).rotation.x = Math.PI / 2; } };
const engine = (g, x, z, body) => { const b = cyl(g, 1.7, 1.7, 8, body, x, 0, z, 14); b.rotation.z = Math.PI / 2; b.position.set(x, 3.2, z); box(g, 3.6, 4.6, 3.6, '#2a2a2e', x - 4.4, 1.2, z); box(g, 4, .5, 4, '#3a3a40', x - 4.4, 5.8, z); cyl(g, .5, .8, 2.2, '#2a2a2e', x + 2.6, 4.7, z, 8); const dome = new THREE.Mesh(new THREE.SphereGeometry(.9, 10, 6), hkM('#c8a24a')); dome.position.set(x - .2, 5.2, z); g.add(dome); for (const k of [-2.8, 0, 2.8]) { cyl(g, 1.1, 1.1, .4, '#2a2a2e', x + k, .1, z + 1.7, 12).rotation.x = Math.PI / 2; cyl(g, 1.1, 1.1, .4, '#2a2a2e', x + k, .1, z - 1.7, 12).rotation.x = Math.PI / 2; } const lamp = box(g, .8, .8, .8, '#ffe9a0', x + 4.3, 3.2, z); lamp.material = hkM('#ffe9a0'); };
const track = (g, z, len, x0 = 0) => { box(g, len, .3, .35, '#7a7570', x0, .3, z - 1.1); box(g, len, .3, .35, '#7a7570', x0, .3, z + 1.1); for (let i = 0; i < len / 2.2; i++) box(g, .7, .2, 3.4, '#5a4636', x0 - len / 2 + i * 2.2 + 1.1, .1, z); };
const windowsRow = (g, n, gap, y, z, w = 1.6, h = 2.2, c = '#3a5468', x0 = 0) => { for (let i = 0; i < n; i++) box(g, w, h, .3, c, x0 + (i - (n - 1) / 2) * gap, y, z); };
const blob = (g, r, c, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), hkM(c)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
const stairs = (g, x0, z0, ang, r, y0, y1, n, c) => { for (let i = 0; i < n; i++) { const a = ang + i * .42, y = y0 + (y1 - y0) * i / n; box(g, 3.4, .4, 1.5, c, x0 + Math.cos(a) * r, y, z0 + Math.sin(a) * r, -a); } };
// the two treehouses from the iPad game's art (Abbie's pink blossom tree with a unicorn balloon, Ani's violet tree with a moon balloon and a slide)
function buildTreehouse(g, K) {
 const bark = K.bark, wood = K.wood, roof = K.roof, roof2 = K.roof2, wall = K.wall, glow = '#ffe3a0';
 cyl(g, 5.2, 8, 12, bark, 0, 0, 0, 10); cyl(g, 4, 5.2, 16, bark, 0, 12, 0, 10); for (let i = 0; i < 5; i++) { const a = i * 1.26; box(g, 2.6, 3.4, 5, bark, Math.cos(a) * 7, 0, Math.sin(a) * 7, -a); }
 const deck = (y, rr, c = K.deck) => { cyl(g, rr, rr, .7, c, 0, y, 0, 16); cyl(g, rr + .35, rr + .35, .25, K.trim, 0, y + .7, 0, 16); };
 const cabin = (x, y, z, w, d, h, ry, r1) => { const q = new THREE.Group(); q.position.set(x, y, z); q.rotation.y = ry; q.scale.setScalar(1.3); g.add(q); box(q, w, h, d, wall, 0, 0, 0); gable(q, w + 2, 3.4, d + 2, r1, 0, h, 0); box(q, w + 2.4, .5, d + 2.4, K.trim, 0, h - .1, 0); box(q, 2.4, 3.4, .3, K.door, w * .2, 0, d / 2 + .1); for (const wx of [-w * .28, w * .02]) { box(q, 2, 2.6, .3, glow, wx, h * .35, d / 2 + .1); box(q, 2.4, .35, .4, K.trim, wx, h * .35 + 2.7, d / 2 + .12); box(q, .25, 2.6, .35, K.trim, wx, h * .35, d / 2 + .15); } for (const sx of [-1, 1]) box(q, .3, 2.4, 2.2, glow, sx * (w / 2 + .1), h * .4, 0); return q; };
 K.build(g, {deck, cabin, blob, stairs});
 // the canopy: a few big soft crowns, with little ones drifting off it
 for (const [x, y, z, r, sy] of K.crowns) blob(g, r, K.leaf[0], x, y, z, 1, sy, 1);
 K.crowns.forEach(([x, y, z, r], i) => blob(g, r * .55, K.leaf[1 + i % (K.leaf.length - 1)], x + r * .5, y + r * .45, z - r * .3, 1, .8, 1));
 for (let i = 0; i < K.charms; i++) { const a = i * 2.4, rr = 13 + (i % 3) * 3, y = 22 + (i % 4) * 2; cyl(g, .05, .05, 3 + i % 3, '#d8d0c8', Math.cos(a) * rr, y - 3 - i % 3, Math.sin(a) * rr, 4); const c = new THREE.Mesh(new THREE.OctahedronGeometry(.9, 0), hkM(K.charm[i % K.charm.length])); c.position.set(Math.cos(a) * rr, y - 4 - i % 3, Math.sin(a) * rr); g.add(c); }
 // stones and flowers at the roots, and a path
 for (let i = 0; i < 9; i++) { const a = i * .7 + .3; blob(g, 1.5, K.stone[i % 3], Math.cos(a) * 15, .7, Math.sin(a) * 13 + 1, 1, .65, 1); }
 for (let i = 0; i < 7; i++) { const a = i * .9; cyl(g, .12, .12, 1.4, '#5f9a46', Math.cos(a) * 11, 0, Math.sin(a) * 10 + 2, 4); blob(g, .8, K.flower, Math.cos(a) * 11, 1.5, Math.sin(a) * 10 + 2, 1, .6, 1); }
 for (let i = 0; i < 6; i++) box(g, 2.6, .2, 2.2, K.path, -3 + i * 2.2, .1, 14 + i * 1.8, .2 + i * .1);
 // the little ground-floor door in the trunk with its round roof
 box(g, 6, 5, 4, wall, -7, 0, 6.5, .5); gable(g, 7.6, 2.6, 5.6, roof2, -7, 5, 6.5).rotation.y = .5; box(g, 1.7, 3.2, .3, K.door, -6.3, 0, 8.7, .5);
 K.sky(g);
}
Object.assign(BUILD, {
 highschool(g) { // the school where the three zones meet: a long brick front, two wings, a clock tower, flag and front steps
  const brick = '#a8563e', trim = '#e6dccb';
  box(g, 54, 11, 18, brick, 0, 0, 0); box(g, 55, .8, 19, trim, 0, 11, 0); box(g, 16, 9, 24, brick, -30, 0, 2); box(g, 16, 9, 24, brick, 30, 0, 2); box(g, 17, .8, 25, trim, -30, 9, 2); box(g, 17, .8, 25, trim, 30, 9, 2);
  gable(g, 54, 4, 17, '#4a4f55', 0, 11.8, 0); box(g, 14, 20, 12, brick, 0, 0, 7); box(g, 15, .8, 13, trim, 0, 20, 7);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(8, 9, 4), hkM('#3c4246')); spire.rotation.y = Math.PI / 4; spire.position.set(0, 25.3, 7); spire.castShadow = true; g.add(spire);
  const clock = cyl(g, 3, 3, .5, '#f6f3ec', 0, 0, 0, 24); clock.rotation.x = Math.PI / 2; clock.position.set(0, 16, 13.2); box(g, .3, 2.3, .15, '#2a2a2e', 0, 16.8, 13.5); box(g, 1.7, .3, .15, '#2a2a2e', .7, 16, 13.5);
  windowsRow(g, 10, 4.6, 3, 9.2, 2, 2.6); windowsRow(g, 10, 4.6, 7, 9.2, 2, 2.6); for (const sx of [-30, 30]) windowsRow(g, 4, 4.8, 3, 14.2, 2, 2.6, '#3a5468', sx);
  box(g, 6, .8, 3, '#d8cfc0', 0, 0, 14.5); box(g, 8, .5, 2, '#d8cfc0', 0, 0, 16); box(g, 3, 5, .3, '#5a4a40', 0, 0, 13.2);
  cyl(g, .2, .2, 16, '#e8e8e8', 17, 0, 22, 6); box(g, 4, 2.4, .1, '#b8323a', 19, 13.4, 22); box(g, 8, .4, 2.4, '#7a5a3a', -16, .4, 22);
 },
 depot(g) { // the station: a brick depot house, a long platform beside the line, a stopped train, benches and lamps
  box(g, 46, .9, 7, '#bdb5a4', 0, 0, 5.5); box(g, 20, 7, 8, '#9a5a40', 0, 0, 11.5); gable(g, 22, 3.4, 9, '#4a4a50', 0, 7, 11.5); box(g, 24, .5, 5, '#4a4a50', 0, 5, 7.4);
  for (const x of [-9, -3, 3, 9]) cyl(g, .22, .22, 4.8, '#3a3a40', x, .9, 5.2, 6);
  windowsRow(g, 4, 4.4, 2.5, 15.6, 1.8, 2.4); box(g, 3, 4, .3, '#5a4a40', 0, 0, 15.6);
  const clock = cyl(g, 1.5, 1.5, .4, '#f6f3ec', 0, 0, 0, 20); clock.rotation.x = Math.PI / 2; clock.position.set(0, 9.6, 12);
  track(g, 0, 50); track(g, -6, 50); engine(g, -8, 0, '#2f5d8a'); trainCar(g, 3, 0, '#b8323a', '#4a4f55'); trainCar(g, 12.5, 0, '#e8b23a', '#4a4f55');
  for (const x of [-14, 14]) { box(g, 2.4, .25, .8, '#6a4a2e', x, .9 + .5, 7); box(g, 2.4, .7, .14, '#6a4a2e', x, 1.8, 6.6); }
  for (const x of [-18, 18]) { cyl(g, .12, .12, 4, '#2b2f33', x, .9, 3.2, 6); const l = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 6), hkM('#ffe3a0')); l.position.set(x, 5.2, 3.2); g.add(l); }
 },
 railyard(g) { // sidings: three tracks, a short train waiting, a water tower, an engine shed and a signal
  for (const z of [-7, 0, 7]) track(g, z, 54);
  engine(g, -14, -7, '#2a6fb0'); trainCar(g, -3, -7, '#8a6a46', '#3a3a40'); trainCar(g, 17, 0, '#2f8a3e', '#3a3a40'); trainCar(g, 7.5, 0, '#c8a24a', '#3a3a40');
  box(g, 14, 6, 9, '#8a4a36', -6, 0, 15); gable(g, 15, 3, 10, '#3c4246', -6, 6, 15); box(g, 5, 4.4, .3, '#2a2a2e', -6, 0, 10.3);
  for (const [x, z] of [[14, 13], [20, 13], [14, 19], [20, 19]]) cyl(g, .3, .3, 9, '#5a4636', x, 0, z, 6); cyl(g, 4.2, 4.2, 5, '#7a5a3a', 17, 9, 16, 14); const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.6, 14), hkM('#3c4246')); roof.position.set(17, 15.3, 16); roof.castShadow = true; g.add(roof);
  cyl(g, .12, .12, 6, '#2b2f33', 26, 0, -4, 6); box(g, .5, 1.5, .4, '#2a2a2e', 26, 6, -4); const red = new THREE.Mesh(new THREE.SphereGeometry(.28, 8, 6), hkM('#ff4a3a')); red.position.set(26, 6.9, -3.7); g.add(red);
  for (let i = 0; i < 5; i++) box(g, 1.6, 1.6, 1.6, ['#8a6a46', '#a8563e', '#6a7a8a'][i % 3], -22 + i * 1.8, 0, 20 - (i % 2) * 1.8);
 },
 mill(g) { // a brick mill on the river: tall gabled block, chimney, a waterwheel, a footbridge
  box(g, 24, 15, 14, '#a8563e', 0, 0, 0); gable(g, 25, 6, 15, '#4a4f55', 0, 15, 0); box(g, 12, 9, 10, '#b86a4c', 16, 0, 2); gable(g, 13, 3.4, 11, '#4a4f55', 16, 9, 2);
  cyl(g, 1.1, 1.5, 24, '#8a4a36', -9, 0, -4, 8); for (let i = 0; i < 3; i++) windowsRow(g, 5, 4.2, 4 + i * 3.6, 7.2, 1.8, 2.2, '#2f4a5c'); box(g, 4, 5, .3, '#5a4a40', 0, 0, 7.2);
  const wheel = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(4.4, .35, 6, 18), hkM('#6a4a2e')); wheel.add(rim); for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(boxGeo, hkM('#6a4a2e')); sp.scale.set(.4, 4.2, .4); sp.rotation.z = i * Math.PI / 8; sp.position.y = -2.1 * Math.cos(i * Math.PI / 8) * 0; wheel.add(sp); } wheel.position.set(-12.4, 4.6, 0); wheel.rotation.y = Math.PI / 2; g.add(wheel); g.userData.wheel = wheel;
  box(g, 16, .5, 3, '#7a5a3a', 5, 1.2, -14); for (const x of [-2, 12]) for (const z of [-15.2, -12.8]) box(g, .3, 1.6, .3, '#6a4a2e', x, 1.2, z);
 },
 dock(g, s) { // the reservoir dock: a pier out over the water, two rowboats, a boathouse, a life ring
  const drop = Math.max(.6, s.drop ?? .8);
  box(g, 3.6, .45, 46, '#9a7a52', 0, 0, -26); for (let i = 0; i < 8; i++) box(g, .5, drop + .5, .5, '#5a4636', i % 2 ? 1.6 : -1.6, -drop, -8 - Math.floor(i / 2) * 11);
  box(g, 9, 5, 7, '#b84a3a', 9, 0, 6); gable(g, 10, 2.6, 8, '#4a4f55', 9, 5, 6); box(g, 2.4, 3.4, .3, '#5a4a40', 9, 0, 9.6);
  for (const [x, z, c] of [[-4.2, -30, '#e8e2d0'], [4.2, -38, '#3a7ad8']]) { const boat = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 3.6, 4, 8), hkM(c)); boat.rotation.z = Math.PI / 2; boat.rotation.y = .1; boat.scale.set(1, 1, .7); boat.position.set(x, -drop + .35, z); boat.castShadow = true; g.add(boat); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.7, .25, 6, 14), hkM('#e8532a')); ring.position.set(1.7, 1.4, -5); g.add(ring); cyl(g, .12, .12, 1.8, '#5a4636', 1.7, 0, -5, 6);
 },
 lookout(g) { // the highest ground: a cairn, a flag, a bench and a telescope for the view back to the square
  for (let i = 0; i < 7; i++) { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5 - i * .1, 0), hkM(['#9a9a96', '#b3afa6', '#8b8984'][i % 3])); r.position.set(Math.cos(i * 1.2) * (i < 5 ? 2.4 : .6), i < 5 ? .8 : 2.2, Math.sin(i * 1.2) * (i < 5 ? 2.4 : .6)); r.castShadow = true; g.add(r); }
  cyl(g, .1, .1, 8, '#e8e8e8', 0, 2, 0, 5); box(g, 3.2, 1.8, .1, '#2f9ac4', 1.7, 8, 0); box(g, 4, .35, 1.1, '#6a4a2e', -5, .6, 3); box(g, 4, 1, .2, '#6a4a2e', -5, 1.2, 3.5);
  cyl(g, .12, .12, 2.4, '#2b2f33', 5, 0, 3, 6); const tube = new THREE.Mesh(new THREE.CylinderGeometry(.3, .4, 2, 8), hkM('#c8a24a')); tube.rotation.z = 1.1; tube.position.set(5, 2.8, 3); g.add(tube);
 },
 trailhead(g) { // a trail sign with a painted map, a bench, a bin
  cyl(g, .22, .22, 4, '#6a4a2e', -1.6, 0, 0, 6); cyl(g, .22, .22, 4, '#6a4a2e', 1.6, 0, 0, 6); box(g, 4.4, 2.6, .3, '#e4d8bc', 0, 1.6, 0); box(g, 3.6, 1.2, .1, '#6fa34a', 0, 2.1, .2); box(g, 2.8, .12, .12, '#3a7ad8', 0, 1.9, .26);
  box(g, 3.2, .3, .9, '#6a4a2e', 5, .7, 1.4); box(g, 3.2, .8, .16, '#6a4a2e', 5, 1.1, .9); cyl(g, .6, .5, 1.3, '#3a6f4a', -5, 0, 1.4, 8);
 },
 launch(g) { // Launch: a rocket on its pad, a gantry, a small hangar apron and a sign (it moved here from the old island)
  const Cy = (r0, r1, h, c, x, y, z) => cyl(g, r0, r1, h, c, x, y, z, 14), B = (w, h, d, c, x, y, z) => box(g, w, h, d, c, x, y, z);
  Cy(11, 11.4, .5, '#8a8f8c', 0, 0, 0); Cy(7, 7.4, .6, '#b8b2a8', 0, .5, 0); Cy(1.6, 1.6, 10, '#f49ac2', 0, 1.1, 0); const nose = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.6, 14), hkM('#f49ac2')); nose.position.set(0, 12.9, 0); nose.castShadow = true; g.add(nose);
  for (let i = 0; i < 3; i++) { const a = i * 2.094, f = B(.3, 3.2, 2.6, '#c84a3a', Math.cos(a) * 2.2, 2.1, Math.sin(a) * 2.2); f.rotation.y = -a; } Cy(.35, .35, 12, '#9aa3a6', 5, .5, 2); B(.4, .4, 3.4, '#9aa3a6', 5, 12.1, .4);
  B(14, .6, 5, '#7a7a76', 0, .1, 15); for (let i = -2; i <= 2; i++) B(.5, .1, 2.4, '#f4efe4', i * 2.4, .75, 15); B(5, 1.6, .25, '#f4efe4', -10, 2.4, 11); Cy(.1, .1, 2.4, '#6a4a2e', -10, 0, 11);
 },
 noticeboard(g) { // the cork board in the square by the school: two posts, a little roof, pinned notes
  cyl(g, .22, .22, 4.6, '#6a4a2e', -2.4, 0, 0, 6); cyl(g, .22, .22, 4.6, '#6a4a2e', 2.4, 0, 0, 6); box(g, 6.2, 3.2, .3, '#b88a52', 0, 1.2, 0); box(g, 6.8, .4, 1.6, '#5a4636', 0, 4.4, 0);
  [[-1.8, 2.8, '#f6d04a'], [0, 3.2, '#f08ab0'], [1.8, 2.6, '#8fc8f2'], [-.6, 1.8, '#ffffff'], [1.2, 1.7, '#b99af0']].forEach(([x, y, c], i) => box(g, 1.3, 1, .08, c, x, y, .22).rotation.z = (i - 2) * .06);
 },
 skatepark(g) { // the skate park by the high school: a concrete slab, a shallow bowl, quarter-pipes, a rail, a low fence and a bench
  box(g, 40, .5, 30, '#b9b6ae', 0, 0, 0); cyl(g, 7.5, 7.5, .1, '#8f8c85', -9, .5, -3, 20); cyl(g, 5, 5, .12, '#a6a39b', -9, .5, -3, 20);
  for (const [x, z, ry] of [[12, -11, 0], [12, 11, Math.PI]]) { const q = box(g, 12, 3, 1.2, '#8f8c85', x, .5, z, ry); q.rotation.x = z < 0 ? -.45 : .45; box(g, 12, .3, 3, '#a6a39b', x, 2.4, z + (z < 0 ? -1.2 : 1.2)); }
  box(g, 10, .35, .35, '#c8452a', 4, 1.5, 0); for (const x of [-1, 9]) box(g, .3, 1.5, .3, '#4a4a50', x, .5, 0); box(g, 6, .9, 3, '#e8b23a', -14, .5, 11); box(g, 3.4, 1.4, 3.4, '#5a8ad8', 16, .5, 0).rotation.y = .4;
  for (let i = 0; i < 12; i++) box(g, .2, 1.6, .2, '#4a4a50', -20 + i * 3.64, .5, -15); box(g, 40, .15, .15, '#4a4a50', 0, 1.9, -15); box(g, 4, .3, 1, '#6a4a2e', -14, 1, 16); box(g, 4, .8, .18, '#6a4a2e', -14, 1.4, 16.5);
 },
 abbieTree(g) { buildTreehouse(g, {
  bark: '#a85a4e', wood: '#d9a98c', roof: '#f08aa8', roof2: '#f2a0b8', wall: '#f6e2c4', trim: '#fbe7ee', door: '#d96a8a', deck: '#e87a9a', leaf: ['#ee7a92', '#f4a0b4', '#e4627f', '#f8b8c8'], stone: ['#c8a8d8', '#d8b8e0', '#b898c8'], flower: '#f06a8a', path: '#f4c8d4', charm: ['#f8b8e0', '#fbd0ec', '#d8a0f0'], charms: 9,
  crowns: [[-8, 44, -6, 11, .75], [7, 42, -4, 9, .8], [-20, 30, -6, 6, .8], [18, 30, -10, 5.5, .8]],
  build(g, k) { k.deck(13, 14); k.cabin(-2, 13.9, -2, 10, 8, 7, .3, '#f08aa8'); k.cabin(7, 13.9, 5, 8, 7, 6, -.6, '#f4a0b8'); k.deck(25, 9); k.cabin(0, 25.9, 0, 8, 7, 6, .5, '#ee7a92'); k.deck(8, 6.5); k.cabin(-14, 8.9, 7, 5, 5, 4.4, .2, '#f2a0b8'); box(g, 9, .6, 1.6, '#c8826a', -9, 8.3, 5, .35); k.stairs(g, 0, 0, .3, 9.4, 1, 13, 18, '#c8826a'); },
  sky(g) { const b = new THREE.Group(); b.position.set(20, 40, -4); g.add(b); blob(b, 4.6, '#fdf2f8', 0, 0, 0, 1.3, .9, .9); blob(b, 2.4, '#fdf2f8', -5.4, 1.6, 0, 1, 1, 1); const h = new THREE.Mesh(new THREE.ConeGeometry(.9, 4, 8), hkM('#fbe9a8')); h.position.set(-6, 5.2, 0); h.rotation.z = .35; b.add(h); for (const sx of [-1, 1]) blob(b, .5, '#f06a8a', -5.6, 1.9, sx * 1.9, 1, 1, 1); blob(b, 1.7, '#f4a0c4', 1.5, 3.6, 0, 1.6, 1, .7); for (let i = 0; i < 4; i++) { const r = box(b, .25, 14, 1.2, '#f8c8d8', 2 + i * 1.2, -14, 0); r.rotation.z = .12 + i * .04; } }}); },
 aniTree(g) { buildTreehouse(g, {
  bark: '#7a5a4a', wood: '#a88868', roof: '#6a50b0', roof2: '#7a60c0', wall: '#f0d8a8', trim: '#c8a8e0', door: '#6a50a8', deck: '#b89890', leaf: ['#5a3c8a', '#7a58b0', '#4a2e78', '#8a68c0'], stone: ['#c0a8d8', '#a890c8', '#d0b8e8'], flower: '#a070e0', path: '#d8c8e8', charm: ['#c8a0f0', '#e8d0ff', '#a080e0'], charms: 12,
  crowns: [[-8, 46, -6, 11, .75], [7, 45, -6, 10, .8], [-20, 33, -6, 6, .8], [20, 33, -8, 5.5, .8]],
  build(g, k) { k.deck(10, 14); k.cabin(-5, 10.9, -2, 11, 8, 7.4, .3, '#6a50b0'); k.deck(21, 12); k.cabin(6, 21.9, 1, 9, 8, 6.4, -.5, '#7a60c0'); k.deck(31, 8); k.cabin(0, 31.9, 0, 8, 7, 5.6, .4, '#5a44a0'); k.cabin(-14, 8, 6, 5, 5, 4, .2, '#7a60c0'); k.stairs(g, 0, 0, 1.2, 9.4, 1, 10, 14, '#a88868'); k.stairs(g, 0, 0, 3.2, 8.4, 11, 21, 14, '#a88868'); k.stairs(g, 0, 0, 5.2, 7.4, 22, 31, 12, '#a88868');
   const sl = new THREE.Mesh(new THREE.TorusGeometry(8, 1.8, 8, 16, 3.6), hkM('#c8a8e8')); sl.position.set(10, 8.2, 2); sl.rotation.x = Math.PI / 2; sl.rotation.z = 1.6; g.add(sl); cyl(g, .3, .3, 8, '#8a7aa8', 16, 8, -2, 5); },
  sky(g) { const m = new THREE.Mesh(new THREE.TorusGeometry(3.6, 1.1, 8, 20, 4.5), hkM('#c8a8f0')); m.position.set(18, 44, 0); m.rotation.z = 2.2; g.add(m); cyl(g, .06, .06, 14, '#d8d0e0', 18, 30, 0, 4); for (let i = 0; i < 6; i++) { const a = i * 1.1, l = new THREE.Mesh(new THREE.SphereGeometry(.9, 8, 6), hkM('#ffe3a0')); l.position.set(Math.cos(a) * 15, 20 + (i % 3) * 2, Math.sin(a) * 15); g.add(l); } }}); },
 gingerbread(g) { buildGingerbread(g); },
 bunker(g) { buildBunker(g); },
});
