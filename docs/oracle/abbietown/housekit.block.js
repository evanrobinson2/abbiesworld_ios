// ---- the house kit: 9 low-poly house types in 3 wealth tiers, set on the same footprints as the real mix ----
// tier 0 = modest (cape, bungalow, triple-decker), 1 = family (colonial, split-level, farmhouse), 2 = grand (victorian, tudor, estate).
// Local frame: front is +z, the ridge runs along x, y = 0 is the ground. Shared geometry and cached materials keep it light.
const HK = {mats: {}, cyl: new THREE.CylinderGeometry(1, 1, 1, 10).translate(0, .5, 0), cone: new THREE.ConeGeometry(1, 1, 10).translate(0, .5, 0)};
const hkM = c => HK.mats[c] ||= new THREE.MeshStandardMaterial({color: c, roughness: .85, flatShading: true});
const HOUSE_TYPES = [['cape', 'bungalow', 'tripledecker'], ['colonial', 'splitlevel', 'farmhouse'], ['victorian', 'tudor', 'estate']];
function houseTier(h) { const a = h.w * h.d; return a < 105 ? 0 : a < 175 ? 1 : 2; } // real footprint decides the wealth tier
function houseType(h, hash) { const tier = houseTier(h), ty = HOUSE_TYPES[tier]; return {tier, type: ty[Math.floor(hash * ty.length) % ty.length]}; }
function buildHouse(type, tier, W, D, H, wall, roofc, hash) {
 const g = new THREE.Group(), WIN = '#bfe0ea', TRIM = '#f4efe4', DOOR = ['#a33a2e', '#2f5d62', '#3a3f6b', '#7a4a2a'][Math.floor(hash * 4) % 4], DARK = '#4b3a2c';
 const b = (w, h, d, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(boxGeo, hkM(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; g.add(m); return m; };
 const roof = (w, rh, d, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(gableGeo, hkM(c)); m.scale.set(d, rh, w); m.position.set(x, y, z); m.rotation.y = Math.PI / 2 + ry; m.castShadow = true; g.add(m); return m; }; // ridge along x
 const cylM = (r, h, c, x, y, z) => { const m = new THREE.Mesh(HK.cyl, hkM(c)); m.scale.set(r, h, r); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
 const cone = (r, h, c, x, y, z) => { const m = new THREE.Mesh(HK.cone, hkM(c)); m.scale.set(r, h, r); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
 const win = (x, y, z, w = .9, h = 1.1, side = 0) => { if (side) b(.12, h, w, WIN, x, y, z); else { b(w + .3, h + .3, .1, TRIM, x, y - .15, z - .01); b(w, h, .16, WIN, x, y, z); } };
 const door = (x, z) => { b(1.1, 1.9, .2, DOOR, x, 0, z); b(.12, .12, .24, '#d8b24a', x + .35, .95, z); };
 const chimney = (x, z, hh, c = '#8a4a36') => b(.6, hh, .6, c, x, 0, z);
 const row = (n, y, z, span, w, hgt) => { for (let i = 0; i < n; i++) win(n === 1 ? 0 : -span / 2 + span * i / (n - 1), y, z, w, hgt); };
 const front = D / 2, rh = Math.min(W, D) * .36;
 if (type === 'cape') { // 1.5 storeys: steep roof, two dormers, centre door
  const h1 = H * .62; b(W, h1, D, wall, 0, 0, 0); roof(W * 1.08, rh * 1.0, D * 1.1, roofc, 0, h1, 0);
  for (const s of [-1, 1]) { b(1.8, 1.5, 1.6, wall, s * W * .24, h1 + .4, front * .35); roof(2.2, 1, 2, roofc, s * W * .24, h1 + 1.9, front * .35); win(s * W * .24, h1 + .7, front * .35 + .82, .8, .9); }
  door(0, front); row(2, 1.1, front, W * .62, .9, 1.1); chimney(W * .3, -D * .1, h1 + rh * 1.0 + 1.2);
 } else if (type === 'bungalow') { // low, long porch
  const h1 = H * .6; b(W, h1, D, wall, 0, 0, 0); roof(W * 1.12, rh * .6, D * 1.18, roofc, 0, h1, 0);
  b(W * .92, .18, 2.4, roofc, 0, h1 * .7, front + 1.2); for (const s of [-1, 1]) b(.22, h1 * .7, .22, TRIM, s * W * .42, 0, front + 2.2); b(W * .92, .3, 2.4, '#b7ad9c', 0, 0, front + 1.2);
  door(0, front); row(2, 1, front, W * .66, .9, 1); chimney(-W * .3, 0, h1 + rh * .6 + .8, '#9a8f84');
 } else if (type === 'tripledecker') { // three flats, stacked porches
  const h1 = H * 1.45; b(W * .86, h1, D, wall, 0, 0, 0); b(W * .92, .35, D * 1.04, TRIM, 0, h1, 0);
  for (let f = 0; f < 3; f++) { const y = f * h1 / 3; b(W * .8, .12, 1.7, TRIM, 0, y + .1, front + .85); b(W * .8, .6, .08, DARK, 0, y + .22, front + 1.65); row(2, y + 1.2, front, W * .5, .9, 1.1); }
  door(0, front); chimney(W * .3, -D * .1, h1 + 1.4, '#8a4a36');
 } else if (type === 'colonial') { // symmetric five-bay with a little portico
  b(W, H, D, wall, 0, 0, 0); roof(W * 1.06, rh * 1.1, D * 1.06, roofc, 0, H, 0);
  row(3, H * .66, front, W * .72, .9, 1.1); row(2, 1.1, front, W * .62, .9, 1.2); door(0, front);
  b(2.3, .2, 1.6, TRIM, 0, 2.15, front + .8); roof(2.4, .8, 1.6, TRIM, 0, 2.3, front + .8); for (const s of [-1, 1]) b(.16, 2.1, .16, TRIM, s * .95, 0, front + 1.5);
  chimney(-W * .38, 0, H + rh * 1.2); chimney(W * .38, 0, H + rh * 1.2);
 } else if (type === 'splitlevel') { // two blocks at different heights, garage door
  b(W * .62, H * 1.08, D, wall, -W * .19, 0, 0); roof(W * .66, rh * .9, D * 1.05, roofc, -W * .19, H * 1.08, 0);
  b(W * .42, H * .66, D * .9, wall, W * .3, 0, -D * .03); roof(W * .46, rh * .55, D * .95, roofc, W * .3, H * .66, -D * .03);
  b(W * .3, H * .5, .12, '#d8d3c6', W * .3, 0, front * .9 + .02); door(-W * .2, front); row(2, H * .65, front, W * .36, .9, 1); win(W * .3, .9, front * .9, 1, .9); chimney(-W * .42, -D * .1, H * 1.08 + rh * .9);
 } else if (type === 'farmhouse') { // an L with a wraparound porch
  b(W * .7, H, D * .9, wall, -W * .12, 0, 0); roof(W * .74, rh * 1.0, D * .94, roofc, -W * .12, H, 0);
  b(W * .38, H * .78, D * .62, wall, W * .3, 0, -D * .18); roof(W * .42, rh * .9, D * .66, roofc, W * .3, H * .78, -D * .18);
  b(W * .8, .16, 2, roofc, -W * .12, H * .46, front + .9); b(W * .8, .3, 2, '#b7ad9c', -W * .12, 0, front + .9); for (let i = 0; i < 4; i++) b(.2, H * .46, .2, TRIM, -W * .46 + i * W * .22, 0, front + 1.8);
  door(-W * .12, front * .9); row(2, 1.1, front * .9, W * .5, .9, 1.1); row(2, H * .62, front * .9, W * .5, .9, 1); chimney(W * .2, -D * .25, H + rh);
 } else if (type === 'victorian') { // corner turret, gable front, gingerbread trim
  b(W, H * 1.15, D, wall, 0, 0, 0); roof(W * 1.06, rh * 1.2, D * 1.06, roofc, 0, H * 1.15, 0);
  roof(W * .5, rh * 1.1, 3, roofc, -W * .12, H * 1.15 - .2, front + .6, Math.PI / 2); b(W * .5, H * .4, .3, wall, -W * .12, H * .75, front + .1);
  const tx = W * .4; cylM(1.7, H * 1.5, wall, tx, 0, front - .6); cone(2.1, H * .9, '#6a4a5e', tx, H * 1.5, front - .6); win(tx, H * .55, front + 1.1, .7, 1); win(tx, H * 1.1, front + 1.1, .7, .9);
  b(W * .8, .16, 2.2, TRIM, -W * .1, 2.2, front + 1.1); b(W * .8, .3, 2.2, '#b7ad9c', -W * .1, 0, front + 1.1); for (let i = 0; i < 4; i++) b(.18, 2.2, .18, TRIM, -W * .45 + i * W * .22, 0, front + 2.1);
  door(-W * .1, front); row(2, H * .8, front, W * .4, .9, 1.1); chimney(W * .1, -D * .2, H * 1.15 + rh * 1.1 + .6, '#7a3a2a');
 } else if (type === 'tudor') { // brick or stucco with half-timbering and a cross gable
  b(W, H * 1.1, D, wall, 0, 0, 0); roof(W * 1.04, rh * 1.1, D * 1.05, roofc, 0, H * 1.1, 0);
  roof(W * .42, rh * 1.2, 2.6, roofc, W * .2, H * 1.1 - .3, front + .7, Math.PI / 2); b(W * .42, H * 1.1, .3, wall, W * .2, 0, front + .05);
  for (let i = 0; i < 6; i++) b(.14, H * 1.1, .12, DARK, -W * .46 + i * W * .18, 0, front + .08); b(W, .14, .12, DARK, 0, H * .55, front + .08); b(W * .42, .14, .12, DARK, W * .2, H * .55, front + .4);
  door(-W * .22, front); win(-W * .22 + 2, 1.2, front, 1, 1.1); win(W * .2, 1.2, front + .42, .9, 1.1); win(W * .2, H * .8, front + .42, .9, 1);
  chimney(-W * .3, front * .5, H * 1.1 + rh * 1.1 + 1.4, '#7a3a2a');
 } else { // estate: centre block, two wings, portico, garage
  b(W * .5, H * 1.15, D, wall, 0, 0, 0); roof(W * .54, rh * 1.1, D * 1.04, roofc, 0, H * 1.15, 0);
  b(W * .3, H * .82, D * .85, wall, -W * .4, 0, -D * .04); roof(W * .34, rh * .9, D * .9, roofc, -W * .4, H * .82, -D * .04);
  b(W * .26, H * .66, D * .7, wall, W * .41, 0, -D * .08); roof(W * .3, rh * .7, D * .75, roofc, W * .41, H * .66, -D * .08); b(W * .2, H * .5, .12, '#d8d3c6', W * .41, 0, front * .7 + .02);
  row(3, H * .8, front, W * .36, .9, 1.1); row(2, 1.2, front, W * .3, .9, 1.3); door(0, front);
  b(3.2, .24, 2.2, TRIM, 0, 2.6, front + 1.1); roof(3.3, 1.1, 2.2, TRIM, 0, 2.8, front + 1.1); for (const s of [-1, 1]) cylM(.2, 2.6, TRIM, s * 1.3, 0, front + 2);
  for (const s of [-1, 1]) chimney(s * W * .24, 0, H * 1.15 + rh * 1.3, '#7a3a2a');
 }
 // the yard: tier 1 gets a picket fence, tier 2 a low stone wall and hedge; tier >= 1 a driveway; every house a mailbox
 const fz = front + 4.2 + tier * .8, fw = W * 1.05;
 if (tier === 1) { b(fw, .14, .1, TRIM, 0, .55, fz); for (let i = 0; i <= 10; i++) b(.12, .8, .1, TRIM, -fw / 2 + i * fw / 10, 0, fz); }
 if (tier === 2) { b(fw, .9, .5, '#9a9488', 0, 0, fz); b(fw * .9, 1.1, .9, '#4f7a3a', 0, 0, fz - 1.6); b(2.6, 1.4, .8, '#8a8478', -fw * .5, 0, fz); b(2.6, 1.4, .8, '#8a8478', fw * .5, 0, fz); }
 if (tier > 0) b(2.6, .06, fz - front + 1, '#8c887f', W * .32, 0, front + (fz - front) / 2);
 b(.1, .8, .1, DARK, W * .62, 0, fz + .6); b(.4, .3, .6, '#c84a3a', W * .62, .8, fz + .6);
 return g;
}
