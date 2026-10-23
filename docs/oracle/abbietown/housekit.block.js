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
 const win = (x, y, z, w = .9, h = 1.1, side = 0) => { if (side) b(.12, h, w, WIN, x, y, z); else { b(w + .3, h + .3, .1, TRIM, x, y - .15, z - .01); b(w, h, .16, WIN, x, y, z); b(.07, h, .2, TRIM, x, y, z + .02); b(w, .07, .2, TRIM, x, y + h / 2 - .05, z + .02); if (tier > 0) { b(.22, h, .12, DOOR, x - w / 2 - .22, y - .15, z); b(.22, h, .12, DOOR, x + w / 2 + .22, y - .15, z); } } };
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

// ---- the Gingerbread House (a walk from the home yard), the sealed bunker door behind it, and Launch ----
function candyBits(g, b, cyl, cone) {}
function buildGingerbread(g) { // front is +z; muffin shop in gingerbread, icing and gumdrops
 const B = (w, h, d, c, x, y, z, ry = 0) => { const m = new THREE.Mesh(boxGeo, hkM(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
 const Cy = (r, h, c, x, y, z, rx = 0) => { const m = new THREE.Mesh(HK.cyl, hkM(c)); m.scale.set(r, h, r); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); return m; };
 const Ball = (r, c, x, y, z) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), hkM(c)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
 const W = 9, D = 7, H = 4.2;
 B(W, H, D, '#b5763a', 0, 0, 0); B(W + .4, .35, D + .4, '#8a5428', 0, 0, 0); // walls and a darker base
 const roof = new THREE.Mesh(gableGeo, hkM('#f7ede0')); roof.scale.set(D * 1.15, 3.2, W * 1.12); roof.position.set(0, H, 0); roof.rotation.y = Math.PI / 2; roof.castShadow = true; g.add(roof);
 for (const s of [-1, 1]) { B(W * 1.12, .22, .3, '#ffffff', 0, H + .05, s * (D * .575)); for (let i = 0; i < 9; i++) Ball(.22, '#ffffff', -W * .5 + i * W / 8, H - .2, s * D * .575); } // white icing on the eaves with drips
 const gum = ['#e5484d', '#f4c542', '#4caf7a', '#4a90e2', '#e87ac7'];
 for (let i = 0; i < 12; i++) Ball(.3, gum[i % 5], -W * .5 + (i % 6) * W / 5 + .3, H + 1 + (i < 6 ? .5 : 1.2), (i < 6 ? 1 : -1) * (D * .3)); // gumdrops on the roof
 B(1.3, 2.3, .25, '#6a3a2a', 0, 0, D / 2 + .05); Ball(.12, '#f4c542', .4, 1.1, D / 2 + .25); // door with a round knob
 for (const s of [-1, 1]) { B(1.3, 1.3, .2, '#ffd1e0', s * 2.8, 1.3, D / 2 + .05); B(1.5, .16, .3, '#ffffff', s * 2.8, 1.2, D / 2 + .08); B(.16, 1.5, .3, '#ffffff', s * 2.8, 1.25, D / 2 + .08); }
 for (const s of [-1, 1]) { Cy(.12, 3, '#ffffff', s * 1.5, 0, D / 2 + 1.6); for (let k = 0; k < 4; k++) B(.26, .3, .26, '#e5484d', s * 1.5, .3 + k * .7, D / 2 + 1.6); } // candy-cane posts
 const ch = Cy(.7, 2.2, '#8a5428', W * .3, H + 1.1, -D * .2); Ball(.55, '#f2a7c3', W * .3, H + 3.5, -D * .2); // chimney with a frosting puff
 // the muffin sign: a post and a swinging board with a muffin on it
 Cy(.08, 3.4, '#6a4a2e', -5.6, 0, D / 2 + 2.5); B(2.4, 1.5, .18, '#fff3d6', -5.6, 2.2, D / 2 + 2.5); Cy(.5, .5, '#e8b46a', -5.6, 2.5, D / 2 + 2.62, Math.PI / 2); const top = new THREE.Mesh(new THREE.SphereGeometry(.6, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), hkM('#c47a3a')); top.position.set(-5.6, 2.9, D / 2 + 2.62); g.add(top); Ball(.14, '#e5484d', -5.6, 3.55, D / 2 + 2.62);
 // lollipop trees either side
 for (const [x, z, c] of [[-W * .62, D * .1, '#e87ac7'], [W * .62, D * .3, '#4aa3e2'], [W * .66, -D * .3, '#f4c542']]) { Cy(.1, 2.6, '#ffffff', x, 0, z); const l = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .3, 14), hkM(c)); l.scale.set(1.2, 1, 1.2); l.rotation.x = Math.PI / 2; l.position.set(x, 3.4, z); g.add(l); Ball(.2, '#ffffff', x, 3.4, z + .2); }
 // a carrot cake and a birthday cake in the window, so you know what is inside
 Cy(.5, .55, '#f08a3c', 2.8, 0.85, D / 2 + .3); Cy(.52, .12, '#ffffff', 2.8, 1.4, D / 2 + .3); Cy(.5, .55, '#f7a8c4', -2.8, .85, D / 2 + .3); Ball(.07, '#4a90e2', -2.8, 1.65, D / 2 + .3);
}
function buildBunker(g) { // a grassy mound, a concrete frame and a round vault-style door, sealed with planks: not built yet
 const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hkM('#6f9a4a')); mound.scale.set(10, 6, 9); mound.castShadow = mound.receiveShadow = true; g.add(mound);
 const B = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(boxGeo, hkM(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
 B(5.4, 4.6, 1.2, '#9a9a94', 0, 0, 7.2); B(5.4, .4, 2, '#8a8a84', 0, 0, 8.2); // the concrete frame and apron
 const door = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, .5, 20), hkM('#56625f')); door.rotation.x = Math.PI / 2; door.position.set(0, 2.5, 7.9); door.castShadow = true; g.add(door);
 const hub = new THREE.Mesh(new THREE.TorusGeometry(.7, .14, 6, 14), hkM('#d9d2a0')); hub.position.set(0, 2.5, 8.2); g.add(hub);
 for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B(.28, .28, .22, '#8a948f', Math.cos(a) * 1.55, 2.5 + Math.sin(a) * 1.55 - .14, 8.1); }
 B(5, .34, .1, '#f4c542', 0, .55, 7.85); B(.3, 3.6, .1, '#f4c542', -2.3, .5, 7.85); B(.3, 3.6, .1, '#f4c542', 2.3, .5, 7.85); // hazard-yellow trim
 const p1 = B(4.6, .34, .2, '#8a6a3a', 0, 1.2, 8.35); p1.rotation.z = .5; const p2 = B(4.6, .34, .2, '#8a6a3a', 0, 1.2, 8.4); p2.rotation.z = -.5; // sealing planks
 B(.1, 2.2, .1, '#6a4a2e', 2.9, 0, 9.4); const lamp = new THREE.Mesh(new THREE.IcosahedronGeometry(.28, 0), new THREE.MeshStandardMaterial({color: '#ffcf70', emissive: '#ffb030', emissiveIntensity: 1.2})); lamp.position.set(2.9, 2.3, 9.4); g.add(lamp);
}
