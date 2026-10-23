// AW-STUDY-0054: the skate park the toy-car coaster is built in, and the six stand-in hexes around it (until the Winchester
// board mounts the real neighbours). Everything is low-poly primitives with named parts. Positions are metres; the park's
// centre is HEX_C and its hex has circumradius HEX_R, pointy along z, like the town's tiles.
export const HEX_C = [-27, -52], HEX_R = 88;
const PI = Math.PI;

export function worldKit(T) {
  const mats = new Map();
  const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!mats.has(k)) mats.set(k, new T.MeshStandardMaterial({color: c, roughness: .8, flatShading: true, ...o})); return mats.get(k); };
  const add = (parent, geo, c, x = 0, y = 0, z = 0, name = '', o = {}) => { const m = new T.Mesh(geo, c.isMaterial ? c : mat(c, o)); m.position.set(x, y, z); if (name) m.name = name; m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const box = (parent, w, h, d, c, x, y, z, name, o) => add(parent, new T.BoxGeometry(w, h, d), c, x, y + h / 2, z, name, o);
  return {mat, add, box};
}

// a concave quarter pipe: flat run L, then a curve of radius h up to a vertical lip. Extruded along z for width w.
function quarterGeo(T, L, h, w) {
  const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(L, 0);
  for (let i = 0; i <= 8; i++) { const a = -PI / 2 + i / 8 * PI / 2; s.lineTo(L + h * Math.cos(a), h + h * Math.sin(a)); }
  s.lineTo(L + h, 0); s.lineTo(0, 0);
  const g = new T.ExtrudeGeometry(s, {depth: w, bevelEnabled: false}); g.translate(0, 0, -w / 2); return g;
}
const wedgeGeo = (T, l, h, w) => { const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(l, 0); s.lineTo(l, h); s.closePath(); const g = new T.ExtrudeGeometry(s, {depth: w, bevelEnabled: false}); g.translate(-l / 2, 0, -w / 2); return g; };

export function buildWorld(T) {
  const K = worldKit(T), {mat, add, box} = K;
  const root = new T.Group(); root.name = 'skate park world';
  const [cx, cz] = HEX_C;
  const hexGeo = (r, h) => { const g = new T.CylinderGeometry(r, r, h, 6); return g; };

  // ---- the board: the skate-park hex plus six stand-ins ----
  const board = new T.Group(); board.name = 'tile board'; root.add(board);
  const dirs = [...Array(6)].map((_, k) => { const a = (k * 60 + 30) * PI / 180; return [Math.sin(a), Math.cos(a)]; });
  const TILE = [
    {name: 'school hex (stand-in)', c: '#8fc46a', kind: 'school'}, {name: 'downtown hex (stand-in)', c: '#a9b4a0', kind: 'town'}, {name: 'houses hex (stand-in)', c: '#8fc46a', kind: 'houses'},
    {name: 'ponds hex (stand-in)', c: '#8fc46a', kind: 'pond'}, {name: 'woods hex (stand-in)', c: '#6fb35a', kind: 'woods'}, {name: 'fields hex (stand-in)', c: '#b9cf6a', kind: 'fields'},
  ];
  const slab = (x, z, top, name) => { const g = new T.Group(); g.name = name; g.position.set(x, 0, z); board.add(g); add(g, hexGeo(HEX_R - .6, 10), top, 0, -5.1, 0, 'tile top'); add(g, hexGeo(HEX_R, 16), '#6b5446', 0, -13, 0, 'tile earth'); return g; };
  // skate-park hex: concrete heart, grass rim
  const park = slab(cx, cz, '#79b45e', 'skate park hex');
  add(park, new T.CylinderGeometry(HEX_R - 9, HEX_R - 9, .5, 6), '#cfc7bb', 0, -.25, 0, 'concrete slab');
  const ring = add(park, new T.TorusGeometry(HEX_R - 1.8, .8, 4, 6), '#ffd45a', 0, .4, 0, 'park edge glow', {emissive: '#ffb020', emissiveIntensity: .8}); ring.rotation.x = PI / 2; ring.rotation.z = PI / 6; ring.userData.presentation = true; ring.castShadow = false;
  root.userData.parkRing = ring;
  const neigh = [];
  TILE.forEach((t, i) => {
    const d = dirs[i], g = slab(cx + d[0] * Math.sqrt(3) * HEX_R, cz + d[1] * Math.sqrt(3) * HEX_R, t.c, t.name); neigh.push(g);
    const rnd = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(7 + i * 31);
    const tree = (x, z, s = 1) => { add(g, new T.CylinderGeometry(.35 * s, .5 * s, 2.4 * s, 5), '#7a5238', x, 1.2 * s, z, 'tree trunk'); add(g, new T.ConeGeometry(2.4 * s, 5.5 * s, 6), i % 2 ? '#3f9a52' : '#4faa4a', x, 4.4 * s, z, 'tree crown'); };
    const house = (x, z, c, r = 0) => { const h = new T.Group(); h.position.set(x, 0, z); h.rotation.y = r; g.add(h); box(h, 7, 4.4, 6, c, 0, 0, 0, 'house wall'); add(h, new T.ConeGeometry(5.4, 3, 4), '#c8553d', 0, 5.9, 0, 'house roof').rotation.y = PI / 4; box(h, 1.2, 2.2, .2, '#ffe9a8', 0, 0, 3.05, 'door', {emissive: '#ffcf70', emissiveIntensity: .35}); };
    if (t.kind === 'school') { box(g, 46, 9, 14, '#b4533e', 0, 0, 0, 'school brick'); box(g, 46, 1, 15, '#e8dfd2', 0, 9, 0, 'school roof edge'); box(g, 10, 14, 10, '#b4533e', 0, 0, 0, 'school tower'); add(g, new T.ConeGeometry(7.5, 6, 4), '#6f7f93', 0, 17, 0, 'school spire').rotation.y = PI / 4; box(g, 2.2, 2.2, .2, '#fff', 0, 9, 7.1, 'clock'); box(g, 60, .3, 18, '#7a8f6a', 0, 0, 24, 'field'); }
    else if (t.kind === 'town') { for (let k = 0; k < 7; k++) box(g, 9 + rnd() * 5, 8 + rnd() * 12, 9, ['#e9c46a', '#f4a261', '#9ec9d8', '#e76f51', '#bfa6d8'][k % 5], -34 + k * 11, 0, -10 + (k % 2) * 6, 'downtown building'); box(g, 80, .3, 8, '#5b5f66', 0, 0, 8, 'main street'); }
    else if (t.kind === 'houses') { for (let k = 0; k < 8; k++) house(-30 + (k % 4) * 19, -16 + Math.floor(k / 4) * 32, ['#f6d5a0', '#bcd9e0', '#e8b4bc', '#d9e4a8'][k % 4], rnd() > .5 ? 0 : PI); for (let k = 0; k < 10; k++) tree(-48 + rnd() * 96, -40 + rnd() * 80, .8); }
    else if (t.kind === 'pond') { add(g, new T.CylinderGeometry(26, 26, .4, 12), '#55b8d9', 0, .3, 0, 'pond water', {roughness: .2, metalness: .1}); for (let k = 0; k < 9; k++) { const a = k / 9 * PI * 2; tree(Math.sin(a) * 34, Math.cos(a) * 34, .9); } }
    else if (t.kind === 'woods') { for (let k = 0; k < 34; k++) tree(-52 + rnd() * 104, -50 + rnd() * 100, .8 + rnd() * .7); }
    else { for (let k = 0; k < 6; k++) box(g, 70, .2, 10, k % 2 ? '#d7c25a' : '#a9c75a', 0, 0, -40 + k * 16, 'field strip'); box(g, 9, 6, 9, '#c8553d', 30, 0, 30, 'barn'); }
  });

  // ---- the skate park proper: features sit east (x > 8), west (x < -62) and south (z > 6) of the coaster's footprint ----
  const sp = new T.Group(); sp.name = 'skate park'; sp.position.y = -.4; root.add(sp); // features are modelled at y 0.4 on the slab; the group sinks them to the slab's top at y 0
  const concrete = '#d9d2c6', paint = ['#ff5d8f', '#ffcf3a', '#3ad1e0', '#9be84c', '#c58bff'];
  // painted lines and big dots on the concrete (flat decals)
  for (let k = 0; k < 14; k++) { const m = add(sp, new T.CircleGeometry(2 + (k % 3), 14), paint[k % 5], -85 + (k * 37) % 120 + 10, .43, -105 + (k * 53) % 125, 'paint dot'); m.rotation.x = -PI / 2; m.castShadow = false; m.material = mat(paint[k % 5], {roughness: 1}); }
  const qp = (x, z, rot, L = 4, h = 3, w = 9, c = concrete) => { const m = add(sp, quarterGeo(T, L, h, w), c, x, .4, z, 'quarter pipe'); m.rotation.y = rot; return m; };
  // half-pipe: two quarter pipes face to face, with coping
  qp(24, -62, 0, 6, 3.4, 12); qp(24, -62, PI, 6, 3.4, 12, '#cfc7bb');
  for (const dx of [9.4, -9.4]) add(sp, new T.CylinderGeometry(.14, .14, 12, 6), '#b8bec6', 24 + dx, 3.8, -62, 'coping').rotation.x = PI / 2;
  // bank + funbox
  const fb = new T.Group(); fb.name = 'funbox'; fb.position.set(26, .4, -34); sp.add(fb);
  box(fb, 8, 1.4, 8, '#e0b84a', 0, 0, 0, 'funbox top'); const wl = add(fb, wedgeGeo(T, 5, 1.4, 8), '#d9d2c6', -6.5, 0, 0, 'funbox ramp'); const wr = add(fb, wedgeGeo(T, 5, 1.4, 8), '#d9d2c6', 6.5, 0, 0, 'funbox ramp'); wr.rotation.y = PI;
  // stairs + rail
  for (let k = 0; k < 5; k++) box(sp, 8, .5 * (k + 1), 1.4, concrete, 30, .4, -14 + k * 1.4, 'stair');
  add(sp, new T.CylinderGeometry(.09, .09, 8, 6), '#ff8a1f', 34.4, 1.9, -11, 'handrail').rotation.x = PI / 2 - .3;
  // west side: a bowl-ish kicker row and bleachers
  for (let k = 0; k < 3; k++) qp(-80 + k * 2, -40 - k * 22, PI / 2 + .2 * k, 3, 2 + k * .4, 7);
  const bl = new T.Group(); bl.name = 'bleachers'; bl.position.set(-78, .4, -84); bl.rotation.y = PI / 2; sp.add(bl);
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) box(bl, 2.1, .5 + r * .5, 1.5, paint[(r + k) % 5], -6.3 + k * 2.2, 0, r * 1.5, 'bleacher seat');
  // south: the base camp at the foot of the start tower
  box(sp, 7, 3.2, 5, '#3ad1e0', -12, .4, 14, 'pit stall'); box(sp, 8.2, .4, 6, '#ff5d8f', -12, 3.6, 14, 'pit stall roof');
  for (let k = 0; k < 4; k++) { const c = ['#ffcf3a', '#1fb6c9', '#ff5d8f', '#7bd24a'][k]; const b = new T.Group(); b.name = 'paint bucket ' + k; b.position.set(-4 + k * 2.6, .4, 7); sp.add(b); add(b, new T.CylinderGeometry(.75, .62, 1.1, 9), '#c9ced6', 0, .55, 0, 'bucket'); add(b, new T.CylinderGeometry(.66, .66, .1, 9), c, 0, 1.08, 0, 'bucket paint', {roughness: .3}); b.userData.paint = c; (root.userData.buckets ||= []).push(b); }
  // traffic cones in a slalom
  for (let k = 0; k < 8; k++) { add(sp, new T.ConeGeometry(.5, 1.3, 7), '#ff7a14', 14 + k * 3.2, 1, 4 + Math.sin(k) * 3, 'cone'); }
  // trees round the rim, light poles
  const lights = [];
  for (let k = 0; k < 26; k++) { const a = k / 26 * PI * 2, r = HEX_R - 5; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (Math.abs(x * .5 + z * .86) < 0) continue;
    add(sp, new T.CylinderGeometry(.4, .55, 3, 5), '#7a5238', cx + x, 1.5, cz + z, 'tree trunk'); add(sp, new T.ConeGeometry(3, 7, 6), k % 3 ? '#3f9a52' : '#e08a3a', cx + x, 6, cz + z, 'tree crown'); }
  for (const [x, z] of [[18, -6], [-70, -10], [20, -100], [-72, -100], [-30, 10]]) { add(sp, new T.CylinderGeometry(.18, .22, 9, 6), '#4a4f58', x, 4.5, z, 'light pole'); const b = add(sp, new T.SphereGeometry(.55, 8, 6), '#fff0b8', x, 9.2, z, 'lamp', {emissive: '#ffdf8a', emissiveIntensity: 1.1}); b.castShadow = false; lights.push(b); }
  // chain-link fence on two sides (a thin lattice of posts and rails)
  for (let k = 0; k < 16; k++) { box(sp, .18, 2.6, .18, '#9aa3ad', -88 + k * 8, .4, 8, 'fence post'); }
  box(sp, 124, .12, .12, '#9aa3ad', -26, 2.8, 8, 'fence rail'); box(sp, 124, .12, .12, '#9aa3ad', -26, 1.2, 8, 'fence rail');

  // ---- decoration: bunting, balloons, pinwheel, giant toy blocks ----
  const bunting = (a, b, sag = 3, n = 18) => {
    const pos = [], col = [], c = new T.Color();
    for (let i = 0; i < n; i++) { const f0 = i / n, f1 = (i + .6) / n, P = f => ({x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f - Math.sin(f * PI) * sag, z: a[2] + (b[2] - a[2]) * f});
      const p0 = P(f0), p1 = P(f1), mx = (p0.x + p1.x) / 2, mz = (p0.z + p1.z) / 2, my = (p0.y + p1.y) / 2 - 1.2; c.set(paint[i % 5]);
      for (const q of [p0, {x: mx, y: my, z: mz}, p1]) { pos.push(q.x, q.y, q.z); col.push(c.r, c.g, c.b); } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({vertexColors: true, side: T.DoubleSide, roughness: .9, name: 'bunting flags'})); m.name = 'bunting'; root.add(m);
    const l = new T.Line(new T.BufferGeometry().setFromPoints([...Array(21)].map((_, i) => { const f = i / 20; return new T.Vector3(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f - Math.sin(f * PI) * sag, a[2] + (b[2] - a[2]) * f); })), new T.LineBasicMaterial({color: '#fff6e5'})); root.add(l);
  };
  const pole = (x, z, h, c) => add(root, new T.CylinderGeometry(.2, .26, h, 6), c, x, h / 2, z, 'bunting pole');
  const BP = [[12, 12], [-52, 12], [40, -42], [-78, -42], [14, -104], [-60, -104]];
  BP.forEach(([x, z], i) => pole(x, z, 14, paint[i % 5]));
  bunting([12, 14, 12], [-52, 14, 12], 3.2, 22); bunting([12, 14, 12], [40, 14, -42], 3, 22); bunting([-52, 14, 12], [-78, 14, -42], 3, 22); bunting([40, 14, -42], [14, 14, -104], 3, 22); bunting([-78, 14, -42], [-60, 14, -104], 3, 22); bunting([14, 14, -104], [-60, 14, -104], 3.2, 22);
  const balloons = [];
  const cluster = (x, y, z, n = 7) => { const g = new T.Group(); g.name = 'balloon cluster'; g.position.set(x, y, z); root.add(g); for (let i = 0; i < n; i++) { const a = i * 2.4, r = .6 + (i % 3) * .5, bx = Math.cos(a) * r, bz = Math.sin(a) * r, by = 3 + (i % 4) * .55; add(g, new T.SphereGeometry(.85, 8, 6), paint[i % 5], bx, by, bz, 'balloon', {roughness: .25, metalness: .05}).scale.y = 1.2; add(g, new T.CylinderGeometry(.015, .015, by, 3), '#fff', bx / 2, by / 2, bz / 2, 'balloon string').castShadow = false; } balloons.push(g); return g; };
  [[-4, 0, -9], [8, 0, -48], [-33, 0, -60], [-60, 0, -80], [-50, 0, -108], [12, 0, -98], [-2, 18, 2]].forEach(([x, y, z]) => cluster(x, y, z));
  // pinwheel
  const pw = new T.Group(); pw.name = 'pinwheel'; pw.position.set(-62, 11, -62); root.add(pw); add(root, new T.CylinderGeometry(.16, .2, 11, 6), '#ffffff', -62, 5.5, -62, 'pinwheel pole');
  for (let k = 0; k < 4; k++) { const b = add(pw, new T.BoxGeometry(4.2, 4.2, .12), paint[k], 0, 0, 0, 'pinwheel vane'); b.geometry = new T.ShapeGeometry((() => { const s = new T.Shape(); s.moveTo(0, 0); s.lineTo(4.2, 0); s.lineTo(4.2, 4.2); s.closePath(); return s; })()); b.rotation.z = k * PI / 2; b.material = mat(paint[k], {side: T.DoubleSide}); }
  root.userData.pinwheel = pw;
  // giant toy blocks
  const blocks = [[-70, -108, 0, 4, '#ff5d8f'], [-65.5, -108, .4, 3.4, '#3ad1e0'], [-68, -108, .2, 2.8, '#ffcf3a'], [20, -20, .5, 3.4, '#9be84c'], [23, -18, .1, 2.6, '#c58bff']];
  blocks.forEach(([x, z, r, s, c], i) => { const b = box(root, s, s, s, c, x, i === 2 ? 3.4 : 0, z, 'toy block'); b.rotation.y = r; });

  root.userData.balloons = balloons; root.userData.lights = lights; root.userData.paint = paint;
  return root;
}

// the start tower (platform at the top of the drop) and the finish arch with balloons
export function buildGates(T, trk) {
  const {mat, add, box} = worldKit(T);
  const g = new T.Group(); g.name = 'start and finish';
  const p0 = trk.S[0].p, y0 = p0.y;
  // tower: four legs, a platform, a rail, stairs
  for (const [x, z] of [[-2.3, 2.6], [2.3, 2.6], [-2.3, -6.4], [2.3, -6.4]]) add(g, new T.CylinderGeometry(.22, .3, y0 - .3, 6), '#1fb6c9', p0.x + x, (y0 - .3) / 2 + .1, p0.z + z, 'tower leg');
  box(g, 5.4, .35, 10.8, '#ffcf3a', p0.x, y0 - .55, p0.z - 1.8, 'tower platform');
  for (let k = 0; k < 3; k++) { box(g, .12, 1.1, .12, '#fff6e5', p0.x - 2.55, y0 - .2, p0.z + 2.9 - k * 4.4, 'tower rail post'); box(g, .12, 1.1, .12, '#fff6e5', p0.x + 2.55, y0 - .2, p0.z + 2.9 - k * 4.4, 'tower rail post'); }
  const gate = new T.Group(); gate.name = 'start gate'; gate.position.set(p0.x, y0, p0.z - 6.2); g.add(gate);
  box(gate, .3, 3.2, .3, '#ff5d8f', -1.6, 0, 0, 'gate post'); box(gate, .3, 3.2, .3, '#ff5d8f', 1.6, 0, 0, 'gate post'); box(gate, 3.5, .6, .4, '#ff5d8f', 0, 3.1, 0, 'gate beam');
  const lamps = [0, 1, 2].map(i => add(gate, new T.SphereGeometry(.38, 10, 8), '#222', (i - 1) * 1.0, 3.45, .25, 'countdown lamp ' + i, {emissive: '#000', emissiveIntensity: 1.6}));
  // finish arch: chequered banner, balloon arch
  const fin = trk.S.find(s => s.s >= trk.marks.finish.s0 + 6).p;
  const fa = new T.Group(); fa.name = 'finish arch'; fa.position.set(fin.x, fin.y, fin.z); fa.rotation.y = Math.PI; g.add(fa);
  box(fa, .3, 5, .3, '#9be84c', -2.4, 0, 0, 'arch post'); box(fa, .3, 5, .3, '#9be84c', 2.4, 0, 0, 'arch post');
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32; const c2 = cv.getContext('2d'); for (let x = 0; x < 16; x++) for (let y = 0; y < 4; y++) { c2.fillStyle = (x + y) % 2 ? '#fff' : '#222'; c2.fillRect(x * 8, y * 8, 8, 8); }
  const tex = new T.CanvasTexture(cv); tex.magFilter = T.NearestFilter; tex.colorSpace = T.SRGBColorSpace;
  add(g, new T.BoxGeometry(5.2, 1.1, .2), new T.MeshStandardMaterial({map: tex, roughness: .8, name: 'chequered banner'}), 0, 0, 0, 'finish banner').position.set(fin.x, fin.y + 4.7, fin.z);
  return {group: g, lamps, finish: fin};
}
