// The demo's stage is the real Winchester, MA: the seven-hex board on /town (studies/abbietown), driven through
// window.AbbieTown (board, stage, spots). One Winchester, not a copy: this file only adds what the demo flow needs on top of it:
// a studio set high above the board for the opening tour, the café roof's launch pad and toy rocket, the Ranch and Moon tiles
// a player places beside the seven hexes, little flags over open missions, and a padlock for "Show me where".
// Board metres: east and north of the middle hex. The scene's metres: x east, z = -north, inside `stage.dioGroup`.
// Placed tiles take their edge from board.heightAt (defined beyond the seven hexes), so they conform to Winchester's topography.
import {presentation} from '../presentation-layer.mjs';

const R3 = Math.sqrt(3), R = 105;                 // the board's hex circumradius (AbbieTown.board.hexSide)
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const sleep = s => new Promise(r => setTimeout(r, s * 1000));
const ease = t => t < 0 ? 0 : t > 1 ? 1 - 0 : 1 - Math.pow(1 - t, 3), bounce = t => t >= 1 ? 1 : 1 + Math.sin(t * 9) * Math.exp(-t * 5) * (1 - t) * 1.2;
// distance inside a flat-top hex (corners east and west) from its nearest edge; negative outside
const inset = (x, y, r = R) => Math.min(r * R3 / 2 - Math.abs(y), (r - Math.abs(x) - Math.abs(y) / R3) * R3 / 2);

const RELIEF = {
 ranch: (x, y) => 9 * Math.sin(x * .035 + 1) * Math.cos(y * .03) + 5 * Math.sin(x * .06 + y * .05),
 moon: (x, y) => { let h = 1.5 * Math.sin(x * .07); for (const [dx, dy, r, d] of [[-28, 20, 24, 14], [34, -26, 16, 9], [8, 46, 12, 6], [-44, -36, 10, 5], [50, 40, 9, 4]]) { const q = Math.hypot(x - dx, y - dy); h -= d * Math.exp(-(q * q) / (r * r)) - .35 * d * Math.exp(-((q - r) ** 2) / 30); } return h; }
};

export function createStage(frame) {
 const win = frame.contentWindow, A = win.AbbieTown, st = A.stage, T = st.THREE, board = A.board;
 const M = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .85, ...o});
 const doc = frame.contentDocument, canvas = doc.getElementById('c'), dio = st.dioGroup, cam = st.camera, ctl = st.controls;
 const fx = [], time = {t: 0}, dust = [];
 const heightAt = (px, py) => board.heightAt(px, py);
 const L = (px, py) => new T.Vector3(px, heightAt(px, py), -py);   // board metres to dioGroup-local

 // ---- anchors: the town's own spots, as objects other things can hang on and fly to ----
 const spots = {};
 for (const name of ['cafe', 'cafeRoof', 'lab', 'school', 'noticeboard', 'common']) {
  const t = st.tiles.downtown, sp = t.spots[name]; if (!sp) continue;
  const a = new T.Object3D(); a.position.set(t.group.position.x + sp.x, sp.y, t.group.position.z + sp.z); a.rotation.y = sp.facing || 0; dio.add(a); spots[name] = a;
 }

 // ---- tiles placed beside Winchester ----
 const tiles = new Map(), taken = new Set(), slotOf = id => board.slots.find(s => s.id === id);
 const free = () => board.slots.filter(s => !taken.has(s.id));
 function tileTexture(kind, seed) {
  const N = 1024, c = Object.assign(document.createElement('canvas'), {width: N, height: N}), g = c.getContext('2d'), rand = rnd(seed);
  g.fillStyle = kind === 'moon' ? '#a2a2ae' : '#9ccb62'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) { const x = rand() * N, y = rand() * N, v = rand(); g.fillStyle = kind === 'moon' ? (v < .5 ? '#8f8f9b' : '#b4b4c0') : (v < .5 ? '#8bbd55' : '#b0d97c'); g.globalAlpha = .4; g.beginPath(); g.arc(x, y, 5 + rand() * 14, 0, 7); g.fill(); }
  g.globalAlpha = 1;
  if (kind === 'moon') for (let i = 0; i < 26; i++) { const x = rand() * N, y = rand() * N, r = 10 + rand() * 40; g.fillStyle = '#80808d'; g.globalAlpha = .55; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#cdcdd8'; g.lineWidth = 3; g.stroke(); }
  if (kind === 'ranch') { g.globalAlpha = .9; g.strokeStyle = '#c9b48a'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(N * .1, N * .8); g.bezierCurveTo(N * .35, N * .55, N * .6, N * .75, N * .9, N * .3); g.stroke(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
 }
 function hexMesh(kind, cx, cy) { // flat-top hex, circumradius R, centre (cx, cy) in board metres
  const N = 28, pos = [], uv = [], idx = [], rings = [[0]], rel = RELIEF[kind];
  const h = (x, y) => heightAt(cx + x, cy + y) + rel(x, y) * smooth(0, 26, inset(x, y));
  const add = (x, y) => { pos.push(cx + x, h(x, y), -(cy + y)); uv.push((x + R) / (2 * R), (y + R) / (2 * R)); return pos.length / 3 - 1; };
  const corner = k => [R * Math.cos(k * Math.PI / 3), R * Math.sin(k * Math.PI / 3)];
  add(0, 0);
  for (let n = 1; n <= N; n++) { const row = []; for (let s = 0; s < 6; s++) { const a = corner(s), b = corner(s + 1); for (let t = 0; t < n; t++) { const f = t / n; row.push(add((a[0] + (b[0] - a[0]) * f) * n / N, (a[1] + (b[1] - a[1]) * f) * n / N)); } } rings.push(row); }
  for (let n = 1; n <= N; n++) for (let s = 0; s < 6; s++) for (let t = 0; t < n; t++) {
   const o = rings[n], i = rings[n - 1], a = o[s * n + t], b = o[(s * n + t + 1) % (6 * n)], ci = n === 1 ? i[0] : i[(s * (n - 1) + t) % (6 * (n - 1))];
   idx.push(a, b, ci); if (n > 1 && t < n - 1) idx.push(ci, b, i[(s * (n - 1) + t + 1) % (6 * (n - 1))]);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const top = new T.Mesh(g, M('#ffffff', {map: tileTexture(kind, Math.abs(cx * 7 + cy) | 1), roughness: .95})); top.name = `${kind} tile top`;
  const rim = rings[N], base = -14, sk = [], si = [];
  rim.forEach((v, i) => { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]; sk.push(x, y, z, x, base, z); if (i) { const k = (i - 1) * 2; si.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
  { const k = (rim.length - 1) * 2; si.push(k, k + 1, 0, k + 1, 1, 0); }
  const sg = new T.BufferGeometry(); sg.setAttribute('position', new T.Float32BufferAttribute(sk, 3)); sg.setIndex(si); sg.computeVertexNormals();
  const skirt = new T.Mesh(sg, M(kind === 'moon' ? '#5d5d68' : '#6b4a32', {side: T.DoubleSide, roughness: 1})); skirt.name = `${kind} tile soil`;
  const grp = new T.Group(), anchor = new T.Object3D(); anchor.position.set(cx, h(0, 0), -cy); grp.add(top, skirt, anchor); grp.userData = {kind, cx, cy, h, anchor}; return grp;
 }
 const k = 2.6; // props are drawn a little bigger than life so they read from the board view
 const box = (w, h, d, c) => new T.Mesh(new T.BoxGeometry(w, h, d), M(c));
 function house(w, d, h, wall, roof) { const g = new T.Group(), b = box(w, h, d, wall), r = new T.Mesh(new T.ConeGeometry(Math.max(w, d) * .78, h * .6, 4), M(roof)); b.position.y = h / 2; r.position.y = h * 1.3; r.rotation.y = Math.PI / 4; if (w > d) r.scale.set(1, 1, d / w); else r.scale.set(w / d, 1, 1); g.add(b, r); g.scale.setScalar(k); return g; }
 function tree(s = 1, c = '#4f9a4a') { const g = new T.Group(), t = new T.Mesh(new T.CylinderGeometry(.12 * s, .17 * s, .9 * s, 6), M('#6b4a32')), l = new T.Mesh(new T.IcosahedronGeometry(.8 * s, 0), M(c)); t.position.y = .45 * s; l.position.y = 1.4 * s; g.add(t, l); g.scale.setScalar(k); return g; }
 function props(g, kind) {
  const {cx, cy, h} = g.userData, rand = rnd(cx * 13 + 5), at = (o, x, y) => { o.position.set(cx + x, heightAt(cx + x, cy + y) + (h(x, y) - heightAt(cx + x, cy + y)), -(cy + y)); g.add(o); return o; };
  if (kind === 'ranch') {
   at(house(4.4, 3.4, 3, '#b8402f', '#5b2a22'), -22, -8); at(box(2, 5, 2, '#d8d2c4'), -14, -14);
   for (let i = 0; i < 16; i++) { const s = new T.Mesh(new T.SphereGeometry(.5 * k, 10, 8), M('#f4f1e8')); s.scale.y = .8; at(s, 6 + rand() * 40, 4 + rand() * 30).translateY(.4 * k); }
   for (let i = 0; i < 40; i++) { const a = rand() * 6.283, r = 20 + rand() * 70, x = Math.cos(a) * r, y = Math.sin(a) * r; if (inset(x, y) < 12 || Math.hypot(x + 22, y + 8) < 14) continue; at(tree(.9 + rand() * .8), x, y); }
  } else {
   const dome = new T.Mesh(new T.SphereGeometry(2.4 * k, 22, 12, 0, 7, 0, Math.PI / 2), M('#dfe9f2', {transparent: true, opacity: .6, roughness: .1})); at(dome, -20, 4);
   const kiosk = box(1.4 * k, 1.2 * k, 1.2 * k, '#ffc94a'); at(kiosk, 30, 18).translateY(.6 * k); const ch = new T.Mesh(new T.ConeGeometry(.5 * k, .4 * k, 3), M('#ffd95a')); at(ch, 30, 18).translateY(1.4 * k);
   const pole = new T.Mesh(new T.CylinderGeometry(.08 * k, .08 * k, 2.6 * k, 6), M('#ddd')), fl = box(.9 * k, .5 * k, .05, '#ff7eb6'); at(pole, 4, -36).translateY(1.3 * k); at(fl, 4 + .5 * k, -36).translateY(2.6 * k);
   for (let i = 0; i < 24; i++) { const x = (rand() - .5) * 170, y = (rand() - .5) * 150; if (inset(x, y) < 12) continue; const r = new T.Mesh(new T.DodecahedronGeometry((.3 + rand() * .6) * k, 0), M('#7d7d8a')); at(r, x, y).translateY(.2 * k); }
  }
 }
 function place(kind, slotId) {
  const s = slotOf(slotId); taken.add(slotId); clearPadlock();
  const g = hexMesh(kind, s.x, s.y); props(g, kind); dio.add(g); tiles.set(slotId, g); g.userData.slot = slotId;
  const t0 = time.t; g.position.y = 140;
  fx.push(() => { const t = (time.t - t0) / .9; if (t >= 1) { g.position.y = 0; puff(s.x, g.userData.h(0, 0), -s.y); puff(s.x + 30, g.userData.h(0, 0), -s.y + 30); return false; } g.position.y = 140 * (1 - t * t) * Math.abs(Math.cos(t * 5)) * (1 - t); return true; });
  return g;
 }
 function puff(x, y, z) { for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.SphereGeometry(4, 8, 6), new T.MeshBasicMaterial({color: '#f4eadb', transparent: true, opacity: .8})); m.position.set(x, y + 3, z); m.userData = {v: [(Math.random() - .5) * 60, Math.random() * 24 + 8, (Math.random() - .5) * 60], life: 0}; presentation(m, {purpose: 'dust puff'}); dio.add(m); dust.push(m); } }

 // open slots on the presentation layer: outlines, the one under the pointer filled
 const slotGroup = new T.Group(); dio.add(slotGroup);
 function showSlots(on, hover = null) {
  slotGroup.clear(); if (!on) return;
  for (const s of free()) { const hot = hover === s.id, shape = new T.Shape(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; shape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * .94, Math.sin(a) * R * .94); } shape.closePath();
   const hole = new T.Path(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; hole[i ? 'lineTo' : 'moveTo'](Math.cos(a) * R * .8, Math.sin(a) * R * .8); } hole.closePath(); if (!hot) shape.holes.push(hole);
   const m = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshBasicMaterial({color: hot ? '#fff1c4' : '#ffffff', transparent: true, opacity: hot ? .55 : .9, depthWrite: false, side: T.DoubleSide, toneMapped: false}));
   m.rotation.x = Math.PI / 2; m.scale.y = -1; m.position.set(s.x, heightAt(s.x, s.y) + 3, -s.y); m.userData.slot = s.id; presentation(m, {purpose: 'open tile slot'}); slotGroup.add(m); }
 }
 const ray = new T.Raycaster(), ndc = new T.Vector2();
 function slotAt(ev) { const b = canvas.getBoundingClientRect(); ndc.set((ev.clientX - b.left) / b.width * 2 - 1, -((ev.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ndc, cam); ray.layers.enable(31); const h = ray.intersectObjects(slotGroup.children, false)[0]; return h ? h.object.userData.slot : null; }


 // ---- the halo: a ring on the ground and a beam of light into the sky over the selected mission's place (presentation layer) ----
 let haloObj = null;
 function halo(at, {beam = 260} = {}) {
  haloObj?.parent?.remove(haloObj); haloObj = null; if (!at) return;
  const g = new T.Group(), ring = new T.Mesh(new T.RingGeometry(14, 19, 48), new T.MeshBasicMaterial({color: '#fff1a8', transparent: true, opacity: .9, side: T.DoubleSide, depthWrite: false, toneMapped: false}));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .6;
  const col = new T.Mesh(new T.CylinderGeometry(3, 3, beam, 20, 1, true), new T.MeshBasicMaterial({color: '#fff1a8', transparent: true, opacity: .32, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false}));
  col.position.y = beam / 2; g.add(ring, col); presentation(g, {purpose: 'selected mission halo'});
  const p = at.getWorldPosition(new T.Vector3()); dio.worldToLocal(p); g.position.copy(p); dio.add(g); haloObj = g; const t0 = time.t;
  fx.push(() => { if (!g.parent) return false; const s = 1 + Math.sin((time.t - t0) * 3) * .08; ring.scale.set(s, s, 1); col.material.opacity = .26 + Math.sin((time.t - t0) * 4) * .08; return true; });
 }
 // ---- flags over open missions, the padlock ----
 const flags = {};
 function flag(name, on, colour = '#ffd95a') {
  flags[name]?.parent?.remove(flags[name]); delete flags[name]; if (!on || !spots[name]) return;
  const g = new T.Group(), pole = new T.Mesh(new T.CylinderGeometry(.25, .25, 9, 6), new T.MeshBasicMaterial({color: '#f4f1e8'})), cl = new T.Mesh(new T.PlaneGeometry(5, 3), new T.MeshBasicMaterial({color: colour, side: T.DoubleSide}));
  pole.position.y = 4.5; cl.position.set(2.5, 7.5, 0); g.add(pole, cl); g.position.y = name === 'cafe' ? 14 : name === 'lab' ? 10 : 8; presentation(g, {purpose: 'open mission flag'}); spots[name].add(g); flags[name] = g;
 }
 let padlockModel = null, padlockObj = null;
 async function padlock(slotId) { // the loader is imported in the town's own realm, so it shares the town's three.js
  if (!padlockModel) { const {GLTFLoader} = await new win.Function('return import("three/addons/loaders/GLTFLoader.js")')(); padlockModel = (await new GLTFLoader().loadAsync('/models/padlock/padlock.glb')).scene; }
  clearPadlock(); const s = slotOf(slotId), p = padlockObj = presentation(padlockModel.clone(), {purpose: 'locked place'}); p.scale.setScalar(26); dio.add(p);
  const y0 = heightAt(s.x, s.y), t0 = time.t; fx.push(() => { if (!p.parent) return false; const q = Math.min(1, (time.t - t0) / .7); p.position.set(s.x, y0 + 12 + 90 * (1 - q * q) + Math.abs(Math.sin(q * 6)) * (1 - q) * 14, -s.y); p.rotation.y += .01; return true; }); return p;
 }
 function clearPadlock() { padlockObj?.parent?.remove(padlockObj); padlockObj = null; }

 // The Moon Mission's rocket (moonmission/world3d.mjs), drawn with the town's three.js: two copies of three can't share geometry.
 function rocket(scale = 1) {
  const g = new T.Group(), pink = '#ff7eb6', white = '#f6f7fb', cyl = (a, b, h, c) => new T.Mesh(new T.CylinderGeometry(a, b, h, 14), M(c)), at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  g.add(at(cyl(1.2, 1.5, 7, white), 0, 4.5, 0), at(new T.Mesh(new T.ConeGeometry(1.2, 2.6, 14), M(pink)), 0, 9.3, 0), at(cyl(1.52, 1.52, .5, pink), 0, 1.6, 0), at(cyl(1.3, 1.4, .3, pink), 0, 6.2, 0), at(new T.Mesh(new T.CircleGeometry(.5, 14), new T.MeshBasicMaterial({color: '#7fb4ff'})), 0, 6.9, 1.24));
  for (let i = 0; i < 4; i++) { const f = box(.2, 2.4, 1.6, pink), a = i * Math.PI / 2; f.position.set(Math.sin(a) * 1.7, 1.4, Math.cos(a) * 1.7); f.rotation.y = a; g.add(f); }
  g.scale.setScalar(scale); return g;
 }
 // ---- the café roof: a launch pad that unfolds like a satellite, and a toy rocket ----
 let pad = null;
 // The spot's roof height is only an estimate: ray-cast down over the building to find the real flat roof, and centre the pad on it.
 function findRoof() {
  dio.updateMatrixWorld(true); const a = spots.cafeRoof, w = wp(a), rc = new T.Raycaster(), hits = [];
  for (let ix = -8; ix <= 8; ix += 2) for (let iz = -8; iz <= 8; iz += 2) { rc.set(new T.Vector3(w.x + ix, w.y + 40, w.z + iz), new T.Vector3(0, -1, 0)); const h = rc.intersectObject(dio, true)[0]; if (h && h.point.y > w.y - 4 && h.point.y < w.y + 30) hits.push(h.point); }
  if (!hits.length) return;
  const top = hits.map(p => p.y).sort((x, y) => x - y)[Math.floor(hits.length * .6)], flat = hits.filter(p => Math.abs(p.y - top) < .6), c = flat.reduce((s, p) => s.add(p), new T.Vector3()).multiplyScalar(1 / flat.length);
  a.parent.worldToLocal(c); a.position.copy(c);
 }
 function buildPad() {
  if (pad) return pad;
  findRoof();
  const g = new T.Group(), core = new T.Mesh(new T.CylinderGeometry(1.6, 2, 1, 20), M('#8d949c', {metalness: .6, roughness: .35})), panels = [];
  for (let i = 0; i < 4; i++) { const hinge = new T.Group(), p = box(5.6, .3, 4.4, i % 2 ? '#e8edf3' : '#ff7eb6'); p.position.x = 2.8; const l = new T.Mesh(new T.SphereGeometry(.34, 8, 6), new T.MeshBasicMaterial({color: '#ffe36b'})); l.position.set(2.6, .3, 0); p.add(l); hinge.add(p); hinge.rotation.y = i * Math.PI / 2; hinge.position.y = .6; g.add(hinge); panels.push(hinge); }
  const toy = rocket(.22); toy.position.y = 1; toy.visible = false; g.add(core, toy); g.userData = {panels, toy};
  g.scale.setScalar(.01); g.visible = false; spots.cafeRoof.add(g); return (pad = g);
 }
 const padUnfold = (dur = 3.6) => { const g = buildPad(), {panels} = g.userData; g.visible = true; const t0 = time.t;
  return new Promise(res => fx.push(() => { const t = (time.t - t0) / dur, up = ease(t / .35), open = ease((t - .3) / .6); g.scale.setScalar(.01 + up * .99);
   panels.forEach((h, i) => { h.children[0].position.x = 2.8 * open + .3; h.rotation.z = (1 - open) * 1.5 * (i % 2 ? 1 : -1); h.children[0].scale.x = .3 + open * .7; h.position.y = .6 + (1 - open) * 1.4; });
   if (t >= 1) { res(); return false; } return true; })); };
 const toyRocket = (dur = 1.4) => { const g = buildPad(), toy = g.userData.toy; toy.visible = true; const t0 = time.t; return new Promise(res => fx.push(() => { const t = (time.t - t0) / dur; toy.scale.setScalar(.22 * bounce(Math.min(1, t)) * Math.min(1, t * 3)); if (t >= 1) { res(); return false; } return true; })); };
 function growSpray(dur = 3) {
  const g = buildPad(), toy = g.userData.toy, t0 = time.t, mist = [], top = new T.Vector3();
  for (let i = 0; i < 40; i++) { const m = new T.Mesh(new T.SphereGeometry(.45, 6, 5), new T.MeshBasicMaterial({color: '#8dff9f', transparent: true, opacity: .8})); presentation(m, {purpose: 'grow spray'}); m.userData = {a: Math.random() * 6.283, h: Math.random()}; dio.add(m); mist.push(m); }
  return new Promise(res => fx.push(() => {
   const t = (time.t - t0) / dur, grow = ease((t - .35) / .5); toy.scale.setScalar(.22 + grow * .9 * (1 + Math.sin(grow * 9) * .06 * (1 - grow))); toy.getWorldPosition(top); dio.worldToLocal(top);
   mist.forEach(m => { const u = m.userData, ph = (t * 1.5 + u.h) % 1; m.position.set(top.x + Math.cos(u.a + t * 3) * (1 + ph * 3.5), top.y + 4 - ph * 4, top.z + Math.sin(u.a + t * 3) * (1 + ph * 3.5)); m.material.opacity = t < 1 ? (1 - ph) * .8 * (t < .85 ? 1 : (1 - t) / .15) : 0; });
   if (t >= 1) { mist.forEach(m => m.parent?.remove(m)); res(); return false; } return true; }));
 }

 // ---- the studio, high above the board, and the stand-in heroes ----
 const studio = new T.Group(); studio.position.set(dio.position.x, 1500, 0); st.scene.add(studio); const STUDIO = new T.Vector3(dio.position.x, 1500, 0);
 { const floor = new T.Mesh(new T.CylinderGeometry(16, 16, .6, 48), M('#f1e8d8')); floor.position.y = -.3;
  const back = new T.Mesh(new T.CylinderGeometry(17, 17, 12, 48, 1, true, 3.6, 3.0), M('#7c6cd8', {side: T.BackSide, roughness: 1})); back.position.y = 5.7;
  const stripe = new T.Mesh(new T.CylinderGeometry(16.9, 16.9, 1.2, 48, 1, true, 3.6, 3.0), M('#ff9ac6', {side: T.BackSide, roughness: 1})); stripe.position.y = 3;
  const sofa = box(5, 1.2, 1.8, '#ff9ac6'); sofa.position.set(-9, .6, -9); sofa.rotation.y = .5;
  const lamp = new T.Mesh(new T.CylinderGeometry(.1, .1, 4, 8), M('#333')); lamp.position.set(9, 2, -8); const shade = new T.Mesh(new T.ConeGeometry(.9, 1.1, 14, 1, true), M('#ffe6a0', {emissive: '#ffcf70', emissiveIntensity: .8, side: T.DoubleSide})); shade.position.set(9, 4.2, -8);
  const light = new T.PointLight('#fff3dc', 3e3, 80, 1.6); light.position.set(0, 14, 16); studio.add(floor, back, stripe, sofa, lamp, shade, light); }
 function kid(colour, hair, skin, style) { // cartoon stand-ins for the Meshy heroes, never drawn from photos
  const g = new T.Group(), body = new T.Mesh(new T.CapsuleGeometry(.7, 1.1, 6, 14), M(colour)), head = new T.Mesh(new T.SphereGeometry(.85, 20, 16), M(skin)); body.position.y = 1.5; head.position.y = 3.15;
  const hr = new T.Mesh(new T.SphereGeometry(.92, 20, 14, 0, 6.3, 0, style === 'long' ? 1.9 : 1.35), M(hair)); hr.position.y = 3.2; hr.rotation.x = -.15;
  const eyes = [-.3, .3].map(x => { const e = new T.Mesh(new T.SphereGeometry(.09, 8, 6), M('#2a1d17')); e.position.set(x, 3.2, .78); return e; });
  const legs = [-.3, .3].map(x => { const l = new T.Mesh(new T.CapsuleGeometry(.2, .7, 4, 8), M('#3a3f7a')); l.position.set(x, .55, 0); return l; });
  const arms = [-.95, .95].map(x => { const a = new T.Mesh(new T.CapsuleGeometry(.17, .8, 4, 8), M(colour)); a.position.set(x, 1.7, 0); return a; });
  g.add(body, head, hr, ...eyes, ...legs, ...arms); g.userData = {legs, arms, head}; g.name = 'stand-in hero'; return g;
 }
 const heroes = {abbie: kid('#ff7eb6', '#7a4a2a', '#f2c9a5', 'long'), ani: kid('#b18cff', '#4a2c20', '#b07a52', 'long')};
 heroes.abbie.scale.setScalar(.82); heroes.ani.scale.setScalar(.95); for (const h of Object.values(heroes)) { h.visible = false; studio.add(h); }
 function walkIn() { const t0 = time.t; heroes.abbie.visible = heroes.ani.visible = true; const from = [[-22, 20], [-14, 24]], to = [[-3.2, 4], [3, 3.6]];
  return new Promise(res => fx.push(() => { const t = (time.t - t0) / 2.4, e = ease(t);
   [heroes.abbie, heroes.ani].forEach((h, i) => { const [fx0, fz] = from[i], [tx, tz] = to[i]; h.position.set(fx0 + (tx - fx0) * e, 0, fz + (tz - fz) * e); h.rotation.y = Math.atan2(tx - fx0, tz - fz) * (1 - e) + e * (i ? -.35 : .35);
    const sw = Math.sin(time.t * 12 + i) * (1 - e) * .8; h.userData.legs[0].rotation.x = sw; h.userData.legs[1].rotation.x = -sw; h.userData.arms[0].rotation.x = -sw; h.userData.arms[1].rotation.x = sw; h.position.y = Math.abs(Math.sin(time.t * 12 + i)) * .12 * (1 - e); });
   if (t >= 1) { res(); return false; } return true; })); }
 fx.push(() => { if (heroes.abbie.visible) { const t = time.t; heroes.abbie.rotation.z = Math.sin(t * 2) * .03; heroes.ani.rotation.z = Math.sin(t * 2 + 1) * .03; heroes.abbie.userData.head.rotation.z = Math.sin(t * 1.3) * .06; } return true; });

 // ---- camera: the town's own fly (1.6 s) ----
 const FLY = 1.6, deg = r => r * 180 / Math.PI;
 const home = {target: new T.Vector3(dio.position.x, 0, 0), dist: 950, pitch: 1.0, yaw: 0}; // the whole seven-hex board
 // an instant cut: put the camera at the end of the flight first, so the town's own fly has nowhere to go
 function jump(v) {
  const t = !v.target ? ctl.target.clone() : v.target.isVector3 ? v.target.clone() : new T.Vector3(...v.target), d = v.dist ?? home.dist, p = v.pitch ?? home.pitch, az = Math.PI - (v.yaw ?? home.yaw), h = Math.cos(p) * d;
  cam.position.set(t.x + Math.sin(az) * h, t.y + Math.sin(p) * d, t.z - Math.cos(az) * h); ctl.target.copy(t); ctl.update(); st.flyTo(t, {dist: d, pitch: deg(p), azimuth: deg(az)});
 }
 // views take a target in world metres, a distance, a yaw and a pitch in radians (yaw 0 looks north from the south)
 function flyTo(v) {
  const t = !v.target ? ctl.target.clone() : v.target.isVector3 ? v.target.clone() : new T.Vector3(...v.target); st.flyTo(t, {dist: v.dist ?? home.dist, pitch: deg(v.pitch ?? home.pitch), azimuth: 180 - deg(v.yaw ?? home.yaw)}); return sleep(FLY);
 }
 const W = p => new T.Vector3().copy(p).add(dio.position), wp = o => o.getWorldPosition(new T.Vector3());
 const VIEWS = {studio: {target: [STUDIO.x, STUDIO.y + 2.4, STUDIO.z + 3], dist: 30, yaw: 0, pitch: .12}, board: home, school: {target: null, dist: 220, yaw: .3, pitch: .5}};
 const zoneAt = {downtown: [0, 0], ani: null, abbie: null};
 function zoneView(id) {
  const names = {downtown: ['downtown', 'depot-river'], ani: ['neighbourhood', 'anis-side'], abbie: ['abbie-daddy-side', 'gingerbread-hill'], school: ['downtown']}[id];
  const ps = names.map(n => st.tiles[n].centre), c = ps.reduce((a, p) => a.add(p), new T.Vector3()).multiplyScalar(1 / ps.length);
  const yaw = Math.atan2(c.x - dio.position.x, -(c.z - dio.position.z)) * .4 + .2;
  return flyTo({target: [c.x, 10, c.z], dist: id === 'school' ? 230 : 480, yaw, pitch: .62});
 }
 const cafeView = () => { const p = wp(spots.cafe); return flyTo({target: [p.x, p.y + 6, p.z], dist: 70, yaw: -1.3, pitch: .4}); };
 const roofView = () => { findRoof(); const p = wp(spots.cafeRoof); return flyTo({target: [p.x, p.y, p.z], dist: 46, yaw: -1.3, pitch: .5}); };
 const tileView = slotId => { const s = slotOf(slotId); return flyTo({target: [dio.position.x + s.x, 20, -s.y], dist: 430, yaw: .5, pitch: .6}); };
 const noticeView = () => { const p = wp(spots.noticeboard); return flyTo({target: [p.x, p.y + 4, p.z], dist: 110, yaw: -1.2, pitch: .45}); };

 // ---- the loop (its own, beside the town's) and the small things the flow needs ----
 let last = performance.now(), running = true;
 (function loop(now) { if (!running) return; const dt = Math.min(.05, (now - last) / 1000); last = now; time.t += dt;
  for (let i = fx.length - 1; i >= 0; i--) if (fx[i](dt) === false) fx.splice(i, 1);
  for (let i = dust.length - 1; i >= 0; i--) { const m = dust[i], u = m.userData; u.life += dt; m.position.x += u.v[0] * dt; m.position.y += u.v[1] * dt; m.position.z += u.v[2] * dt; m.scale.setScalar(1 + u.life * 2); m.material.opacity = Math.max(0, .8 - u.life * 1.1); if (u.life > .8) { m.parent?.remove(m); dust.splice(i, 1); } }
  (win.requestAnimationFrame || requestAnimationFrame)(loop); })(last);
 let shift = 0, shiftTo = 0;
 fx.push(dt => { if (shift !== shiftTo) { shift += (shiftTo - shift) * Math.min(1, dt * 3); if (Math.abs(shift - shiftTo) < .001) shift = shiftTo; const w = canvas.clientWidth, h = canvas.clientHeight; if (shift) cam.setViewOffset(w, h, shift * w, 0, w, h); else cam.clearViewOffset(); cam.updateProjectionMatrix(); } return true; });
 st.hideChrome(true); doc.querySelectorAll('.pl-door').forEach(e => { e.style.display = 'none'; });

 return {
  T, canvas, scene: st.scene, state: {time}, spots, VIEWS, tiles, flyTo, jump, nearestFree: () => free().sort((a, b) => cam.position.distanceTo(new T.Vector3(dio.position.x + a.x, 0, -a.y)) - cam.position.distanceTo(new T.Vector3(dio.position.x + b.x, 0, -b.y)))[0],
  lookAt: (obj, dist = 170) => { const p = wp(obj); return flyTo({target: [p.x, p.y, p.z], dist, yaw: -.6, pitch: .7}); },
  spotView: (name, dist = 60) => { const p = wp(spots[name]); return flyTo({target: [p.x, p.y + 4, p.z], dist, yaw: -1.2, pitch: .42}); }, zoneView, cafeView, roofView, tileView, noticeView, walkIn, padUnfold, toyRocket, growSpray,
  place, halo, showSlots, slotAt, free, has: kind => [...tiles.values()].some(t => t.userData.kind === kind), flag, padlock, clearPadlock,
  project(o) { const v = wp(o).project(cam), b = canvas.getBoundingClientRect(); return [(v.x + 1) / 2 * b.width + b.left, (1 - v.y) / 2 * b.height + b.top]; },
  shift: f => { shiftTo = f; }, lock: on => { ctl.enabled = !on; }, setSky: c => st.setLook?.({bg: c}), tiltShift: () => {},
  slotCentre: id => { const s = slotOf(id); return [s.x, s.y]; }, stop() { running = false; }
 };
}
