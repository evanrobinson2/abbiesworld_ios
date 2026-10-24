// AW-STUDY-0054 round 2: the garage. Six original toy cars for the coaster, hi-fi low poly: a side silhouette extruded
// across the car with a bevel, chrome rims, tinted glass, glowing lamps and painted decals. None copies a toy brand's
// car, name or logo. Every car shares one frame: forward is -Z, the track surface is y = 0, wheels sit on it.
//   const car = buildCar(T, CARS[i]);  car.userData = {wheels, eye, def, paint(colour), inCar(on)}
// The first-person seat lives in each car's def (eye: [y, z]); inCar(true) hides what would sit on your nose.

export const CARS = [
  {id: 'buggy', name: 'Sunny Buggy', body: '#ffcf3a', trim: '#1fb6c9', decal: 'stripe', len: 1.5, w: .78, wheelR: .21, eye: [.84, .12], open: true,
    profile: [[-.75, .16], [-.75, .36], [-.42, .44], [-.08, .46], [.2, .52], [.58, .54], [.75, .44], [.75, .16]], cage: true, wing: true},
  {id: 'comet', name: 'Comet', body: '#7a4dff', trim: '#ffb020', decal: 'flame', len: 1.6, w: .8, wheelR: .2, eye: [.86, .2],
    profile: [[-.8, .14], [-.8, .34], [-.45, .4], [-.18, .44], [-.02, .7], [.4, .72], [.62, .5], [.8, .46], [.8, .14]], blower: true, pipes: true},
  {id: 'shark', name: 'Shark', body: '#16b8b0', trim: '#ffffff', decal: 'teeth', len: 1.7, w: .76, wheelR: .19, eye: [.78, .22],
    profile: [[-.85, .12], [-.85, .2], [-.3, .38], [.02, .48], [.1, .64], [.42, .66], [.66, .5], [.85, .5], [.85, .12]], fin: true, wing: true},
  {id: 'rocket', name: 'Rocket Wagon', body: '#ff4f4f', trim: '#f4ece0', decal: 'stars', len: 1.7, w: .8, wheelR: .2, eye: [.9, .1],
    profile: [[-.85, .14], [-.85, .36], [-.5, .42], [-.28, .48], [-.14, .76], [.7, .78], [.85, .66], [.85, .14]], rocket: true},
  {id: 'cart', name: 'Shopping Cart', body: '#d8dee6', trim: '#ff3b5c', decal: 'none', len: 1.45, w: .86, wheelR: .14, eye: [1.05, .22], cart: true},
  {id: 'monster', name: 'Monster Mini', body: '#9be84c', trim: '#2a2f3a', decal: 'check', len: 1.5, w: .9, wheelR: .32, eye: [1.16, .1], lift: .22,
    profile: [[-.72, .3], [-.72, .5], [-.4, .56], [-.2, .58], [-.08, .86], [.44, .88], [.62, .62], [.72, .58], [.72, .3]], bar: true},
];

const decalCache = new Map();
function decal(T, kind, base, trim) {
  const key = kind + base + trim; if (decalCache.has(key)) return decalCache.get(key);
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 64); g.fillStyle = trim;
  if (kind === 'stripe') { g.fillRect(0, 26, 256, 12); g.fillRect(0, 42, 256, 4); }
  if (kind === 'flame') { for (let i = 0; i < 6; i++) { g.beginPath(); const y = 18 + (i % 3) * 12; g.moveTo(0, y - 6); g.quadraticCurveTo(60 + i * 20, y - 14, 110 + i * 22, y); g.quadraticCurveTo(60 + i * 18, y + 10, 0, y + 8); g.fill(); } g.fillStyle = '#ffe56a'; for (let i = 0; i < 4; i++) { g.beginPath(); const y = 22 + i * 8; g.moveTo(0, y - 3); g.quadraticCurveTo(40 + i * 15, y - 6, 70 + i * 16, y); g.quadraticCurveTo(40, y + 5, 0, y + 4); g.fill(); } }
  if (kind === 'teeth') { g.fillStyle = '#ffffff'; g.fillRect(0, 44, 256, 20); g.fillStyle = base; for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x + 8, 58); g.lineTo(x + 16, 44); g.fill(); } g.fillStyle = '#1a2a3a'; g.beginPath(); g.arc(212, 26, 7, 0, 7); g.fill(); }
  if (kind === 'stars') { g.font = '22px serif'; for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#ffe14a' : trim; star(g, 18 + i * 36, 30 + (i % 2) * 8, 10, 4.2); } }
  if (kind === 'check') { for (let x = 0; x < 256; x += 16) for (let y = 40; y < 64; y += 12) if (((x / 16) + (y - 40) / 12) % 2 < 1) g.fillRect(x, y, 16, 12); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; decalCache.set(key, t); return t;
  function star(g, x, y, R, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, k = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k); } g.closePath(); g.fill(); }
}

let wireTex = null;
function wire(T) {
  if (wireTex) return wireTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = '#ffffff'; g.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke(); }
  wireTex = new T.CanvasTexture(c); wireTex.wrapS = wireTex.wrapT = T.RepeatWrapping; wireTex.repeat.set(4, 3); return wireTex;
}

export function buildCar(T, def) {
  const car = new T.Group(); car.name = 'toy car ' + def.id;
  const M = (name, c, o = {}) => Object.assign(new T.MeshStandardMaterial({color: c, roughness: .35, flatShading: true, ...o}), {name});
  const paint = M('paint body', def.body, {roughness: .28, metalness: .15}), trim = M('paint trim', def.trim, {roughness: .35}),
    chrome = M('metal chrome', '#eef3f8', {metalness: .9, roughness: .18}), tyreM = M('rubber tyre', '#1e2228', {roughness: .85}),
    glass = M('glass tinted', '#26405a', {roughness: .08, metalness: .3, transparent: true, opacity: .72}), lampM = M('light headlamp', '#fff8d8', {emissive: '#fff0b0', emissiveIntensity: 1.6}),
    tailM = M('light tail lamp', '#ff3040', {emissive: '#ff2030', emissiveIntensity: 1.2}), dark = M('plastic dark', '#2a2f3a', {roughness: .6});
  const add = (geo, mat, name, x = 0, y = 0, z = 0, parent = car) => { const m = new T.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const lift = def.lift || 0, R = def.wheelR, W = def.w, L = def.len;
  const wheels = [], hideInCar = [];
  // wheels: tread tyre, chrome rim, a hub cap in the trim colour
  const wz = L / 2 - Math.max(.22, R * 1.05);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = new T.Group(); w.name = 'wheel'; w.position.set(sx * (W / 2 + .02), R, sz * wz); car.add(w); wheels.push(w);
    const tyre = add(new T.CylinderGeometry(R, R, R * .9, 14), tyreM, 'tyre', 0, 0, 0, w); tyre.rotation.z = Math.PI / 2;
    const tread = add(new T.TorusGeometry(R * .96, R * .1, 4, 14), tyreM, 'tread', sx * R * .3, 0, 0, w); tread.rotation.y = Math.PI / 2;
    const rim = add(new T.CylinderGeometry(R * .62, R * .62, R * .92, 10), chrome, 'rim', 0, 0, 0, w); rim.rotation.z = Math.PI / 2;
    const cap = add(new T.CylinderGeometry(R * .26, R * .26, R * .96, 6), trim, 'hub cap', 0, 0, 0, w); cap.rotation.z = Math.PI / 2;
  }
  if (def.cart) buildCart(); else buildBody();
  function buildBody() {
    const s = new T.Shape(); def.profile.forEach(([x, y], i) => i ? s.lineTo(x, y + lift) : s.moveTo(x, y + lift)); s.closePath();
    const g = new T.ExtrudeGeometry(s, {depth: W - .1, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2, curveSegments: 4});
    g.translate(0, 0, -(W - .1) / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); // shape x becomes the car's z: negative is the nose
    const body = add(g, paint, 'body'); body.userData.paint = true;
    // side decals: a plane on each flank with the car's own art
    if (def.decal !== 'none') for (const sx of [-1, 1]) { const d = add(new T.PlaneGeometry(L * .8, .2), M('decal ' + def.decal, '#fff', {map: decal(T, def.decal, def.body, def.trim), roughness: .3, flatShading: false, polygonOffset: true, polygonOffsetFactor: -2}), 'side decal', sx * (W / 2 + .001), .3 + lift, 0); d.rotation.y = sx * Math.PI / 2; if (sx < 0) d.scale.x = -1; d.userData.paint = 'decal'; }
    // glass: the canopy band where the profile rises
    const top = def.profile.filter(p => p[1] > .6); if (top.length >= 2) { const z0 = top[0][0], z1 = top[top.length - 1][0], gy = Math.max(...top.map(p => p[1])) - .1 + lift;
      for (const sx of [-1, 1]) { const p = add(new T.PlaneGeometry(Math.abs(z1 - z0) * .8, .16), glass, 'side window', sx * (W / 2 + .002), gy, (z0 + z1) / 2); p.rotation.y = sx * Math.PI / 2; }
      const ws = add(new T.PlaneGeometry(W * .8, .2), glass, 'windshield', 0, gy, Math.min(z0, z1) - .05); ws.rotation.x = .5; hideInCar.push(ws); }
    // lamps
    const nose = Math.min(...def.profile.map(p => p[0])), tail = Math.max(...def.profile.map(p => p[0]));
    for (const sx of [-1, 1]) { add(new T.SphereGeometry(.06, 8, 6), lampM, 'headlamp', sx * W * .32, .32 + lift, nose - .03); add(new T.BoxGeometry(.12, .05, .03), tailM, 'tail lamp', sx * W * .32, .34 + lift, tail + .04); }
    add(new T.BoxGeometry(W * .7, .08, .05), chrome, 'front bumper', 0, .2 + lift, nose - .05); add(new T.BoxGeometry(W * .7, .08, .05), chrome, 'rear bumper', 0, .2 + lift, tail + .05);
    if (def.wing) { const y = Math.max(...def.profile.filter(p => p[0] > .4).map(p => p[1])) + .22 + lift; const wg = add(new T.BoxGeometry(W + .12, .05, .2), trim, 'wing', 0, y, tail - .1); for (const sx of [-1, 1]) add(new T.BoxGeometry(.04, .2, .08), chrome, 'wing post', sx * W * .3, y - .1, tail - .1); hideInCar.push(wg); }
    if (def.cage) { const c = []; for (const sx of [-1, 1]) c.push(add(new T.CylinderGeometry(.025, .025, .5, 6), chrome, 'roll bar', sx * .28, .78, .32)); const t = add(new T.CylinderGeometry(.025, .025, .58, 6), chrome, 'roll bar', 0, 1.03, .32); t.rotation.z = Math.PI / 2; }
    if (def.blower) { add(new T.BoxGeometry(.26, .16, .3), chrome, 'blower', 0, .56 + lift, -.42); add(new T.BoxGeometry(.3, .05, .34), dark, 'blower scoop', 0, .66 + lift, -.42); }
    if (def.pipes) for (const sx of [-1, 1]) { const p = add(new T.CylinderGeometry(.035, .035, .7, 8), chrome, 'side pipe', sx * (W / 2 + .06), .18, -.05); p.rotation.x = Math.PI / 2; }
    if (def.fin) { const fs = new T.Shape(); fs.moveTo(0, 0); fs.lineTo(.4, 0); fs.lineTo(.32, .36); fs.closePath(); const fg = new T.ExtrudeGeometry(fs, {depth: .04, bevelEnabled: false}); fg.translate(0, 0, -.02); fg.rotateY(-Math.PI / 2); const f = add(fg, paint, 'shark fin', 0, .62 + lift, .65); f.userData.paint = true; hideInCar.push(f); }
    if (def.rocket) { const r = add(new T.CylinderGeometry(.13, .16, .62, 10), chrome, 'rocket booster', 0, .9 + lift, .3); r.rotation.x = Math.PI / 2; add(new T.ConeGeometry(.13, .22, 10), trim, 'booster nose', 0, .9 + lift, -.11).rotation.x = -Math.PI / 2;
      const fl = add(new T.ConeGeometry(.1, .4, 8), M('booster flame', '#ffb020', {emissive: '#ff7a14', emissiveIntensity: 2, transparent: true, opacity: .85}), 'booster flame', 0, .9 + lift, .82); fl.rotation.x = Math.PI / 2; car.userData.flame = fl; }
    if (def.bar) { for (const sx of [-1, 1]) add(new T.BoxGeometry(.06, .32, .06), dark, 'light bar post', sx * .3, 1.02 + lift, -.1); add(new T.BoxGeometry(.7, .08, .1), dark, 'light bar', 0, 1.2 + lift, -.1); for (let i = 0; i < 4; i++) add(new T.SphereGeometry(.04, 6, 4), lampM, 'roof lamp', -.24 + i * .16, 1.2 + lift, -.16); add(new T.BoxGeometry(W + .1, .12, L * .9), dark, 'chassis', 0, .3, 0); }
    // a steering wheel and a dash for the driver's seat
    const sw = add(new T.TorusGeometry(.09, .018, 5, 12), M('plastic wheel', def.trim), 'steering wheel', 0, def.eye[0] - .3, def.eye[1] - .32); sw.rotation.x = -.9;
  }
  function buildCart() {
    // the shopping cart: a chrome frame and wire basket on four racing casters, a red handle, a pennant on a whip
    const h0 = .32, bw = W, bl = L * .82, bh = .5;
    const basket = new T.Group(); basket.name = 'basket'; basket.position.y = h0; car.add(basket);
    const wm = M('metal wire basket', '#e8eef5', {map: wire(T), alphaMap: wire(T), transparent: true, alphaTest: .4, side: T.DoubleSide, metalness: .8, roughness: .25});
    const panel = (w, h, x, y, z, ry, name, low) => { const p = add(new T.PlaneGeometry(w, h), wm, name, x, y, z, basket); p.rotation.y = ry; if (low) p.scale.y = low; return p; };
    panel(bl, bh, -bw / 2, bh / 2, 0, Math.PI / 2, 'basket side'); panel(bl, bh, bw / 2, bh / 2, 0, Math.PI / 2, 'basket side');
    const front = panel(bw, bh * .55, 0, bh * .275, -bl / 2, 0, 'basket front'); panel(bw, bh, 0, bh / 2, bl / 2, 0, 'basket back');
    const floor = add(new T.PlaneGeometry(bw, bl), wm, 'basket floor', 0, .01, 0, basket); floor.rotation.x = -Math.PI / 2;
    for (const [x, z] of [[-bw / 2, -bl / 2], [bw / 2, -bl / 2], [-bw / 2, bl / 2], [bw / 2, bl / 2]]) add(new T.CylinderGeometry(.02, .02, bh, 6), chrome, 'basket post', x, bh / 2, z, basket);
    for (const z of [-bl / 2, bl / 2]) { const r = add(new T.CylinderGeometry(.022, .022, bw, 6), chrome, 'basket rim', 0, z < 0 ? bh * .55 : bh, z, basket); r.rotation.z = Math.PI / 2; }
    for (const x of [-bw / 2, bw / 2]) { const r = add(new T.CylinderGeometry(.022, .022, bl, 6), chrome, 'basket rim', x, bh, 0, basket); r.rotation.x = Math.PI / 2; }
    for (const x of [-bw / 2 + .05, bw / 2 - .05]) { const r = add(new T.CylinderGeometry(.03, .03, L, 6), chrome, 'frame rail', x, .2, 0); r.rotation.x = Math.PI / 2; }
    const hd = add(new T.CylinderGeometry(.04, .04, bw + .1, 8), M('plastic handle red', def.trim, {roughness: .4}), 'handle', 0, h0 + bh + .14, bl / 2 + .18); hd.rotation.z = Math.PI / 2; hideInCar.push(hd);
    for (const sx of [-1, 1]) { const p = add(new T.CylinderGeometry(.02, .02, .3, 6), chrome, 'handle post', sx * bw / 2, h0 + bh + .02, bl / 2 + .1); p.rotation.x = -.6; hideInCar.push(p); }
    const whip = add(new T.CylinderGeometry(.008, .008, 1.1, 4), M('whip white', '#ffffff'), 'flag whip', bw / 2 - .05, h0 + bh + .5, bl / 2 - .05);
    const flag = add(new T.PlaneGeometry(.26, .16), M('pennant', def.trim, {side: T.DoubleSide}), 'pennant', bw / 2 + .08, h0 + bh + .98, bl / 2 - .05); flag.rotation.y = Math.PI / 2; car.userData.flag = flag;
    const seat = add(new T.BoxGeometry(bw * .9, .06, .3), M('plastic seat', def.trim), 'kid seat', 0, h0 + .26, bl / 2 - .2); seat.userData.paint = 'seat';
    for (const sx of [-1, 1]) add(new T.SphereGeometry(.05, 8, 6), lampM, 'headlamp', sx * bw * .3, h0 + .1, -bl / 2 - .03);
    car.userData.basketPaint = wm;
  }
  car.userData.wheels = wheels;
  car.userData.def = def;
  car.userData.eye = new T.Vector3(0, def.eye[0], def.eye[1]);
  car.userData.paint = c => { car.traverse(m => { if (m.isMesh && m.userData.paint === true) m.material.color.set(c); }); if (car.userData.basketPaint) car.userData.basketPaint.color.set(c); };
  car.userData.inCar = on => { hideInCar.forEach(m => { m.visible = !on; }); };
  // the paint is per car: clone the shared body material so repainting one car leaves the others alone
  car.traverse(m => { if (m.isMesh && m.userData.paint === true) m.material = m.material.clone(); });
  return car;
}
