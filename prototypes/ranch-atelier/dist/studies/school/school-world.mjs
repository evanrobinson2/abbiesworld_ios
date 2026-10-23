import {mergeGeometries} from '/vendor/utils/BufferGeometryUtils.js';
import {worldUV, canvasTex, seeded, normalFromHeight} from '/simulations/lowpoly-kit.mjs';

// The school at dusk (AW-STUDY-0032), built to Evan's key art: a long, low, fictional brick school with ribbon
// windows, a cream metal fascia and downspouts, raking golden light and long purple shadows, a street of '80s
// houses, maples turning, power lines, and station wagons whose headlights sweep the brick.
// Gameplay layout (blocks, roof levels, the climbing faces) is unchanged from AW-STUDY-0026 so every rule still holds.
// Everything here is world layer. Static pieces are merged by material, so the whole town is a few dozen draw calls.

export const H = 7, GYM = 9.5, CANOPY = 4.6;
export const RECT = {A: [-7, 5, -3.5, 3.5, H], B: [1, 7, -7, -3.5, H], C: [0, 8, 3.5, 9, GYM], D: [-10, -7, -5, -1, 5], E: [5, 7.6, -1, 3.5, CANOPY]};
export const BLOCKERS = [
 [-4.4, -3.8, -3, 1.6, 1.6, 'brick barrier wall'], [-.6, 1.6, -1.8, 1.4, 1.5, 'big air handler'],
 [1.4, 3.4, 5.2, 7, 1, 'gym unit'], [5, 7, 5.6, 8, 1, 'gym unit'],
];
export const ROAD_X = -19, LANES = [-18.1, -19.9];
export const FASCIA = .2; // how far the roof's metal fascia stands out from the brick

// ---------- Surfaces: painted canvases with normal maps, sized in metres. ----------
function brickSurface(T) {
 const W = 512, Hh = 512, cols = 6, rows = 16, bw = W / cols, bh = Hh / rows, r = seeded(11);
 const hc = Object.assign(document.createElement('canvas'), {width: W, height: Hh}), hg = hc.getContext('2d');
 const map = canvasTex(T, W, Hh, g => {
  g.fillStyle = '#c9b6a2'; g.fillRect(0, 0, W, Hh); hg.fillStyle = '#000'; hg.fillRect(0, 0, W, Hh);
  for (let y = 0; y < rows; y++) for (let k = -1; k <= cols; k++) {
   const x = k * bw + (y % 2) * bw / 2, flash = r() < .12, l = 36 + r() * 10 - (flash ? 9 : 0), h = 10 + r() * 9, s = 52 + r() * 14;
   g.fillStyle = `hsl(${h},${s}%,${l}%)`; g.fillRect(x + 3, y * bh + 3, bw - 6, bh - 6);
   const gr = g.createLinearGradient(0, y * bh, 0, (y + 1) * bh); gr.addColorStop(0, 'rgba(255,220,190,.10)'); gr.addColorStop(1, 'rgba(40,10,0,.16)'); g.fillStyle = gr; g.fillRect(x + 3, y * bh + 3, bw - 6, bh - 6);
   for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${r() < .5 ? '30,10,5' : '255,210,170'},${.06 + r() * .08})`; g.fillRect(x + 4 + r() * (bw - 10), y * bh + 4 + r() * (bh - 10), 2 + r() * 4, 2); }
   hg.fillStyle = `rgb(${200 + r() * 55 | 0},0,0)`; hg.fillRect(x + 3, y * bh + 3, bw - 6, bh - 6);
  }
 });
 return {map, normalMap: normalFromHeight(T, hc, 3), size: [1.8, 1.6]};
}
function noiseSurface(T, base, speck, {size = 2, n = 2600, w = 256, lines = null, seed = 3, streak = false} = {}) {
 const r = seeded(seed), hc = Object.assign(document.createElement('canvas'), {width: w, height: w}), hg = hc.getContext('2d');
 hg.fillStyle = '#808080'; hg.fillRect(0, 0, w, w);
 const map = canvasTex(T, w, w, g => {
  g.fillStyle = base; g.fillRect(0, 0, w, w);
  for (let i = 0; i < n; i++) { const x = r() * w, y = r() * w, c = speck[i % speck.length], s = streak ? 1 + r() * 2 : 1 + r() * 2.4;
   g.fillStyle = c; g.globalAlpha = .25 + r() * .5; g.fillRect(x, y, s, streak ? s * 4 : s); hg.fillStyle = r() < .5 ? '#a0a0a0' : '#606060'; hg.fillRect(x, y, s, s); }
  g.globalAlpha = 1; if (lines) lines(g, w);
 });
 return {map, normalMap: normalFromHeight(T, hc, 1.2), size: [size, size]};
}

export function schoolMaterials(T) {
 const brick = brickSurface(T);
 const gravel = noiseSurface(T, '#7d7486', ['#9b93a3', '#5d5566', '#b2a9b5', '#6e6578'], {size: 2.4, n: 5000, seed: 5});
 const concrete = noiseSurface(T, '#b3a9a4', ['#c8bfba', '#9a908c', '#a59a96'], {size: 3, n: 1800, seed: 9, lines: (g, w) => { g.fillStyle = 'rgba(70,55,55,.35)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, w); }});
 const yard = noiseSurface(T, '#9d9399', ['#b0a6ab', '#857c82', '#a2989d'], {size: 4, n: 2400, seed: 13, lines: (g, w) => { g.fillStyle = 'rgba(60,50,55,.25)'; g.fillRect(0, 0, w, 2); }});
 const asphalt = noiseSurface(T, '#46424f', ['#5a5664', '#34313c', '#6a6573'], {size: 4, n: 4200, seed: 17});
 const grass = noiseSurface(T, '#6b7a3c', ['#86924a', '#55632f', '#9a9a4a', '#7a6a32'], {size: 3, n: 4200, seed: 19, streak: true});
 const field = noiseSurface(T, '#6f8a3e', ['#86a04c', '#5d7634', '#93a855'], {size: 5, n: 3000, seed: 23, streak: true, lines: (g, w) => { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, w / 2, w); }});
 const siding = noiseSurface(T, '#ffffff', ['#f2f2f2'], {size: 1.2, n: 50, seed: 29, lines: (g, w) => { for (let y = 0; y < w; y += w / 6) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, y + 3, w, 2); } }});
 const shingle = noiseSurface(T, '#5a4650', ['#6a5560', '#4a3842', '#725a64'], {size: 1.6, n: 900, seed: 31, lines: (g, w) => { g.fillStyle = 'rgba(20,10,15,.45)'; for (let y = 0; y < w; y += w / 8) { g.fillRect(0, y, w, 2); for (let x = (y / (w / 8)) % 2 * w / 12; x < w; x += w / 6) g.fillRect(x, y, 2, w / 8); } }});
 const louvre = noiseSurface(T, '#b7bcc2', ['#c9ced3', '#9ea4ab'], {size: .8, n: 300, seed: 37, lines: (g, w) => { for (let y = 0; y < w; y += 12) { g.fillStyle = 'rgba(30,35,45,.5)'; g.fillRect(0, y, w, 4); } }});
 const fascia = noiseSurface(T, '#68727f', ['#77818e', '#5b6471', '#707a87'], {size: 1.2, n: 400, seed: 41, lines: (g, w) => { g.fillStyle = 'rgba(20,25,35,.3)'; g.fillRect(0, 0, 3, w); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 2, w, 3); }});
 const room = canvasTex(T, 256, 128, (g, w, h) => { // a classroom glimpsed through the glass: warm ceiling light, a board, chairs
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffe7b0'); gr.addColorStop(.55, '#e9a868'); gr.addColorStop(1, '#6a3a2a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#3d5a48'; g.fillRect(30, 26, 120, 40); g.fillStyle = '#7a5a3a'; for (let x = 20; x < w; x += 46) { g.fillRect(x, 92, 26, 6); g.fillRect(x + 4, 98, 3, 22); g.fillRect(x + 19, 98, 3, 22); }
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 4, w, 4);
 });
 // chain-link: wire diamonds, 6 cm across, cut out with an alpha map so the fence reads as wire, not a sheet
 const chainLink = canvasTex(T, 64, 64, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, w); g.strokeStyle = '#fff'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, w / 2); g.lineTo(w / 2, 0); g.lineTo(w, w / 2); g.lineTo(w / 2, w); g.closePath(); g.stroke(); }, {srgb: false});
 chainLink.repeat.set(16, 16); // the fence UVs are in metres
 const m = (o) => new T.MeshStandardMaterial(o);
 const tex = (s, o) => m({map: s.map, normalMap: s.normalMap, ...o});
 return {
  brick: tex(brick, {roughness: .88, normalScale: new T.Vector2(.8, .8), name: 'brick wall'}),
  gravel: tex(gravel, {roughness: 1, name: 'tar and gravel roof'}),
  concrete: tex(concrete, {roughness: .95, name: 'poured concrete'}),
  yard: tex(yard, {roughness: 1, name: 'schoolyard concrete'}),
  asphalt: tex(asphalt, {roughness: .95, name: 'street asphalt'}),
  grass: tex(grass, {roughness: 1, name: 'lawn grass'}),
  field: tex(field, {roughness: 1, name: 'playing field grass'}),
  siding: (c) => tex(siding, {color: c, roughness: .85, name: 'house siding'}),
  shingle: tex(shingle, {roughness: 1, name: 'asphalt shingles'}),
  louvre: tex(louvre, {roughness: .45, metalness: .6, name: 'air handler louvres'}),
  fascia: tex(fascia, {roughness: .55, metalness: .25, name: 'slate metal roof edge'}),
  soffit: m({color: '#8e8274', roughness: .8, name: 'fascia soffit'}),
  sill: m({color: '#d4cbbf', roughness: .9, name: 'concrete sill'}),
  alu: m({color: '#c9ced3', roughness: .35, metalness: .85, name: 'aluminium window frame'}),
  glass: m({color: '#1d2433', roughness: .08, metalness: .4, emissiveMap: room, emissive: '#ffd59a', emissiveIntensity: .12, name: 'classroom window'}),
  houseGlass: m({color: '#1d2433', roughness: .1, metalness: .4, emissive: '#ffc77a', emissiveIntensity: .1, name: 'house window'}),
  door: m({color: '#2f7f86', roughness: .55, metalness: .25, name: 'painted steel door'}),
  frame: m({color: '#245c62', roughness: .5, metalness: .3, name: 'door frame'}),
  brass: m({color: '#d8b04a', roughness: .28, metalness: .9, name: 'brass knob'}),
  steel: m({color: '#9aa3ab', roughness: .38, metalness: .8, name: 'galvanised steel'}),
  pipe: m({color: '#d9d1c0', roughness: .45, metalness: .35, name: 'drainpipe'}),
  conduit: m({color: '#8a969d', roughness: .38, metalness: .75, name: 'electrical conduit'}),
  phone: m({color: '#59646b', roughness: .5, metalness: .5, name: 'telephone junction box'}),
  hvac: m({color: '#c2c6cb', roughness: .45, metalness: .55, name: 'rooftop air handler'}),
  dark: m({color: '#2c2f38', roughness: .7, name: 'fan grille'}),
  wood: m({color: '#5a3f2e', roughness: .9, name: 'pole wood'}),
  bark: m({color: '#4a362b', roughness: 1, name: 'tree bark'}),
  leaf: [m({color: '#d5622f', roughness: 1, flatShading: true, name: 'maple leaves orange'}), m({color: '#b8352b', roughness: 1, flatShading: true, name: 'maple leaves red'}), m({color: '#e09a35', roughness: 1, flatShading: true, name: 'maple leaves gold'})],
  spruce: m({color: '#3f5a3a', roughness: 1, flatShading: true, name: 'spruce needles'}),
  trim: m({color: '#f1ebe0', roughness: .7, name: 'house trim'}),
  paint: m({color: '#f1e6b0', roughness: .9, name: 'road paint'}),
  play: m({color: '#c8452f', roughness: .6, metalness: .2, name: 'playground paint'}),
  white: m({color: '#f2efe8', roughness: .9, name: 'white line paint'}),
  chain: m({color: '#b8c0c6', roughness: .45, metalness: .75, alphaMap: chainLink, alphaTest: .5, name: 'chain-link fence', side: T.DoubleSide}),
  lampPost: m({color: '#5a5a62', roughness: .5, metalness: .6, name: 'street lamp post'}),
  lampGlow: m({color: '#fff3c8', emissive: '#ffd27a', emissiveIntensity: 0, name: 'street lamp'}),
  wallLamp: m({color: '#fff6dc', emissive: '#ffcf80', emissiveIntensity: .3, name: 'wall lamp lens'}),
  sign: m({color: '#e9e0cf', roughness: .8, name: 'painted sign board'}),
  signInk: m({color: '#2f5c8a', roughness: .8, name: 'painted bell'}),
  hoop: m({color: '#e06a2a', roughness: .5, metalness: .4, name: 'basketball hoop'}),
  backboard: m({color: '#f4f1ea', roughness: .6, name: 'backboard'}),
  skylight: new T.MeshPhysicalMaterial({color: '#cfe0ea', roughness: .15, transmission: 0, transparent: true, opacity: .75, emissive: '#ffd59a', emissiveIntensity: .05, name: 'acrylic skylight'}),
  powerLine: new T.MeshBasicMaterial({color: '#2a2230', name: 'power line'}),
 };
}

// ---------- Geometry buckets: everything static is placed in world space and merged per material. ----------
function buckets(T, M) {
 const b = new Map();
 const uvSize = {brick: [1.8, 1.6], gravel: [2.4, 2.4], concrete: [3, 3], yard: [4, 4], asphalt: [4, 4], grass: [3, 3], field: [5, 5], shingle: [1.6, 1.6], louvre: [.8, .8], fascia: [1.2, 1.2]};
 function add(key, geo, x = 0, y = 0, z = 0, rot = null) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (rot) g.applyQuaternion(rot); g.translate(x, y, z);
  const [su, sv] = uvSize[key] || [1, 1]; worldUV(T, g, su, sv);
  for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
  if (!b.has(key)) b.set(key, []); b.get(key).push(g); return g;
 }
 function build(scene, mats, {noShadow = []} = {}) {
  const out = {};
  for (const [key, list] of b) {
   const mat = typeof mats[key] === 'function' ? null : mats[key]; if (!mat) continue;
   const mesh = new T.Mesh(mergeGeometries(list), mat); mesh.name = mat.name; mesh.castShadow = !noShadow.includes(key); mesh.receiveShadow = true; scene.add(mesh); out[key] = mesh;
  }
  b.clear(); return out;
 }
 return {add, build};
}
const box = (T, w, h, d) => new T.BoxGeometry(w, h, d);
const q = (T, x, y, z) => new T.Quaternion().setFromEuler(new T.Euler(x, y, z));

// A ribbon of classroom windows along one face. dir: the outward normal of the face ('+x', '-x', '+z', '-z').
function windowRow(T, B, face, from, to, y0, y1, {step = 1.8, w = 1.4} = {}) {
 const [axis, c, sgn] = face; // axis 'x' means the face is perpendicular to x at coordinate c, outward sign sgn
 const h = y1 - y0;
 for (let s = from + step / 2; s + w / 2 <= to + .01; s += step) {
  const at = (along, out, yy, geoW, geoH, geoD, key) => {
   if (axis === 'x') B.add(key, box(T, geoD, geoH, geoW), c + sgn * out, yy, along);
   else B.add(key, box(T, geoW, geoH, geoD), along, yy, c + sgn * out);
  };
  at(s, -.02, y0 + h / 2, w, h, .06, 'glass');
  for (const dx of [-w / 2, -w / 6, w / 6, w / 2]) at(s + dx, .03, y0 + h / 2, .06, h + .04, .07, 'alu');
  for (const yy of [y0, y0 + h * .68, y1]) at(s, .03, yy, w + .06, .06, .07, 'alu');
  at(s, .07, y0 - .07, w + .24, .08, .16, 'sill');
  at(s, .025, y1 + .1, w + .2, .16, .06, 'sill');
 }
}

export function buildSchool(T, scene, M = schoolMaterials(T)) {
 const B = buckets(T, M), occluders = [];
 // ---- the blocks: brick walls on a concrete base, a metal fascia that overhangs, gravel roofs ----
 for (const [k, [x0, x1, z0, z1, h]] of Object.entries(RECT)) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  if (k === 'E') { // entrance canopy: a concrete slab with a fascia band, on steel posts
   B.add('concrete', box(T, w, .22, d), cx, h - .11, cz);
   B.add('fascia', box(T, w + .12, .32, .1), cx, h - .05, z0 - .05); B.add('fascia', box(T, w + .12, .32, .1), cx, h - .05, z1 + .05); B.add('fascia', box(T, .1, .32, d + .1), x1 + .05, h - .05, cz);
   for (const [px, pz] of [[x1 - .2, z0 + .2], [x1 - .2, z1 - .2]]) B.add('steel', new T.CylinderGeometry(.09, .09, h - .2, 10), px, (h - .2) / 2, pz);
   continue;
  }
  B.add('brick', box(T, w, h, d), cx, h / 2, cz);
  B.add('concrete', box(T, w + .08, .3, d + .08), cx, .15, cz);
  const F = FASCIA, fh = .34; // a thin slate metal roof edge, as in the key art
  B.add('fascia', box(T, w + 2 * F, fh, F + .04), cx, h - fh / 2 + .14, z0 - F / 2); B.add('fascia', box(T, w + 2 * F, fh, F + .04), cx, h - fh / 2 + .14, z1 + F / 2);
  B.add('fascia', box(T, F + .04, fh, d), x0 - F / 2, h - fh / 2 + .14, cz); B.add('fascia', box(T, F + .04, fh, d), x1 + F / 2, h - fh / 2 + .14, cz);
  B.add('soffit', box(T, w + 2 * F, .04, d + 2 * F), cx, h - fh + .16, cz);
  B.add('gravel', box(T, w, .06, d), cx, h + .03, cz);
  if (k === 'C') { // the gym: brick piers and a band of high windows
   for (let x = x0 + 1; x < x1 - .5; x += 2) { B.add('brick', box(T, .5, h - .4, .14), x, (h - .4) / 2, z1 + .07); B.add('brick', box(T, .5, h - .4, .14), x, (h - .4) / 2, z0 - .07); }
   windowRow(T, B, ['z', z1, 1], x0 + .2, x1, 6.6, 8.2, {step: 2, w: 1.3});
   windowRow(T, B, ['x', x1, 1], z0 + .2, z1, 6.6, 8.2, {step: 2, w: 1.3});
  } else if (k !== 'D') { // two bands of classroom windows on the long faces; the climbing face stays blank brick
   for (const [y0, y1] of [[1.1, 2.7], [4.1, 5.7]]) {
    if (k === 'A') windowRow(T, B, ['z', z0, -1], x0 + 1.4, x1 - .2, y0, y1), windowRow(T, B, ['z', z1, 1], x0 + 1.4, x1 - .2, y0, y1);
    if (k === 'B') windowRow(T, B, ['x', x1, 1], z0 + .2, z1, y0, y1), windowRow(T, B, ['z', z0, -1], x0 + .2, x1 - .2, y0, y1);
   }
   B.add('concrete', box(T, w + .04, .22, d + .04), cx, 3.4, cz); // the floor band between the storeys
  } else { windowRow(T, B, ['z', z0, -1], x0 + .2, x1 - .2, 1.2, 2.6, {step: 1.5, w: 1.1}); windowRow(T, B, ['x', x0, -1], z0 + .2, z1 - .2, 1.2, 2.6, {step: 1.5, w: 1.1}); } // the low wing faces the street
 }
 // the front doors under the canopy: glass double doors in an aluminium frame
 B.add('alu', box(T, .12, 2.5, 2.2), 5.03, 1.25, 1.2); B.add('glass', box(T, .14, 2.3, 1.9), 5.04, 1.15, 1.2);
 // ---- rooftop: the two big barriers (Evan, 09:36Z) and the gym units, plus skylights, drains and vent stacks ----
 for (const [x0, x1, z0, z1, hh, name] of BLOCKERS) {
  const base = x0 > -.1 && z0 >= 3.5 ? GYM : H, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
  if (name.includes('wall')) { B.add('brick', box(T, w, hh, d), cx, base + hh / 2, cz); B.add('concrete', box(T, w + .12, .12, d + .12), cx, base + hh + .06, cz); continue; }
  B.add('concrete', box(T, w + .2, .14, d + .2), cx, base + .07, cz);
  B.add('hvac', box(T, w, hh - .14, d), cx, base + .14 + (hh - .14) / 2, cz);
  B.add('louvre', box(T, w + .01, (hh - .14) * .6, d * .7), cx, base + .14 + (hh - .14) * .45, cz);
  B.add('louvre', box(T, w * .7, (hh - .14) * .6, d + .01), cx, base + .14 + (hh - .14) * .45, cz);
  B.add('dark', new T.CylinderGeometry(Math.min(w, d) * .32, Math.min(w, d) * .32, .08, 16), cx, base + hh + .04, cz);
  B.add('steel', new T.CylinderGeometry(Math.min(w, d) * .36, Math.min(w, d) * .36, .04, 16), cx, base + hh + .01, cz);
  B.add('hvac', box(T, .5, .5, .9), cx - w / 2 - .25, base + .25, cz); // duct into the roof
 }
 const skyGeo = new T.SphereGeometry(.42, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
 for (const [x, z] of [[-5.5, -1.2], [-1.8, 2.2], [0, -2.6], [3.5, 1.5], [4, -6]]) { B.add('concrete', box(T, .95, .14, .95), x, H + .07, z); B.add('skylight', skyGeo.clone().scale(1, .55, 1), x, H + .14, z); }
 for (const [x, z, y] of [[-2.6, -2.8, H], [2.2, 2.6, H], [3.6, -5.2, H], [6.5, 4.2, GYM]]) { B.add('steel', new T.CylinderGeometry(.06, .06, .5, 8), x, y + .25, z); B.add('steel', new T.CylinderGeometry(.09, .09, .04, 8), x, y + .5, z); }
 // ---- the north-west climbing face ----
 B.add('brick', box(T, .14, H, 1.5), -7.07, H / 2, 1.0 + 2.25); // a shallow pilaster beside the door bay
 B.add('frame', box(T, .08, 2.32, 1.26), -7.04, 1.16, 1.0); B.add('door', box(T, .06, 2.12, 1.02), -7.07, 1.06, 1.0);
 B.add('concrete', box(T, .5, .12, 1.6), -7.25, .06, 1.0); // the step
 B.add('steel', box(T, .1, .05, 1.3), -7.08, 2.3, 1.0); // drip cap over the door
 // ---- ground: lawns, the schoolyard, the field, the parking lot, sidewalk, curb and street ----
 const plane = (key, w, d, x, z, y) => B.add(key, new T.PlaneGeometry(w, d).rotateX(-Math.PI / 2), x, y, z);
 plane('grass', 220, 220, 0, 0, -.02);
 plane('yard', 40, 20, 2, -17, .005); plane('yard', 16, 34, 16, -4, .006);
 plane('field', 36, 44, 42, -12, .003);
 plane('asphalt', 6.4, 8, -12.6, 5.2, .007); plane('asphalt', 6.5, 3, -10.2, 1.0, .007);
 for (let z = 1.8; z < 9.4; z += 1.6) plane('white', 3, .08, -13.9, z, .013);
 plane('concrete', 2.2, 220, -16.4, 0, .1); B.add('concrete', box(T, .16, .14, 220), -17.5, .05, 0); // sidewalk and curb
 B.add('concrete', box(T, .16, .14, 220), -20.6, .05, 0); plane('concrete', 2.2, 220, -21.8, 0, .1);
 plane('asphalt', 3.0, 220, ROAD_X, 0, .01);
 for (let z = -100; z < 100; z += 4) plane('paint', .12, 2, ROAD_X, z, .02);
 for (const x of [-17.3, -20.7]) plane('white', .1, 220, x, 0, .02);
 // goals on the field, a hoop in the yard, a bike rack, the school sign (no name: a painted bell)
 for (const [x, z] of [[42, -28], [42, 4]]) { for (const dx of [-1.6, 1.6]) B.add('white', new T.CylinderGeometry(.06, .06, 2, 8), x + dx, 1, z); B.add('white', box(T, 3.3, .08, .08), x, 2, z); }
 B.add('steel', new T.CylinderGeometry(.06, .06, 3, 8), 10, 1.5, -18); B.add('backboard', box(T, 1.2, .8, .05), 10, 3, -17.6); B.add('hoop', new T.TorusGeometry(.23, .02, 6, 16), 10, 2.8, -17.3, q(T, Math.PI / 2, 0, 0));
 for (let i = 0; i < 5; i++) B.add('steel', new T.TorusGeometry(.35, .025, 6, 12, Math.PI), -9.6, 0, -6.4 + i * .5, q(T, 0, Math.PI / 2, 0));
 B.add('brick', box(T, .4, 1.1, 2.4), -14.6, .55, -10.5); B.add('sign', box(T, .1, .7, 1.9), -14.81, .75, -10.5); B.add('signInk', new T.CircleGeometry(.18, 12), -14.87, .78, -10.5, q(T, 0, -Math.PI / 2, 0));
 // chain-link along the yard
 for (let x = -6; x <= 22; x += 2.5) B.add('steel', new T.CylinderGeometry(.03, .03, 1.8, 6), x, .9, -27);
 B.add('chain', new T.PlaneGeometry(28, 1.8), 8, .9, -27); B.add('steel', new T.CylinderGeometry(.025, .025, 28, 6), 8, 1.8, -27, q(T, 0, 0, Math.PI / 2));
 // ---- across the street: '80s houses with gables, porches and warm windows ----
 const sidingColors = ['#d8c49e', '#a7b8c8', '#e2d1ae', '#bfa9bf', '#b9c7a5'];
 for (let i = 0; i < 9; i++) {
  const z = -36 + i * 9, x = -29, w = 6, d = 6.4, wall = 3.2;
  const key = 'siding' + (i % 5); M[key] = M[key] || M.siding(sidingColors[i % 5]);
  B.add(key, box(T, d, wall, w), x, wall / 2, z);
  const roof = new T.CylinderGeometry(.01, 4.4, 2, 4, 1).rotateY(Math.PI / 4).scale(.75, 1, 1.02);
  B.add('shingle', roof, x, wall + 1, z);
  B.add('brick', box(T, .7, 2, .7), x + 1.4, wall + 1.6, z + 1.6);
  for (const dz of [-1.6, 1.6]) { B.add('houseGlass', box(T, .06, 1.1, 1.1), x + d / 2 + .02, 1.8, z + dz); B.add('trim', box(T, .08, 1.24, 1.24), x + d / 2 + .01, 1.8, z + dz); }
  B.add('frame', box(T, .07, 2, .9), x + d / 2 + .02, 1, z); // front door
  B.add('trim', box(T, 1.6, .12, 3.6), x + d / 2 + .8, 2.6, z); for (const dz of [-1.6, 1.6]) B.add('trim', box(T, .12, 2.6, .12), x + d / 2 + 1.5, 1.3, z + dz);
  B.add('concrete', box(T, 1.6, .2, 3.6), x + d / 2 + .8, .1, z);
  plane('concrete', 5.2, 1.2, x + d / 2 + 4, z, .03);
 }
 // ---- what makes it a school from the street: the boiler chimney, the flagpole, the playground, hopscotch, a fence ----
 B.add('brick', box(T, 1.3, 13.5, 1.3), 8.75, 6.75, 7.2); B.add('concrete', box(T, 1.5, .25, 1.5), 8.75, 13.6, 7.2); B.add('dark', box(T, .8, .1, .8), 8.75, 13.76, 7.2);
 for (const y of [4.5, 9]) B.add('concrete', box(T, 1.36, .14, 1.36), 8.75, y, 7.2);
 B.add('concrete', box(T, 1, .3, 1), -15.2, .15, -7.6); B.add('alu', new T.CylinderGeometry(.045, .07, 9, 10), -15.2, 4.5, -7.6); B.add('brass', new T.SphereGeometry(.11, 10, 8), -15.2, 9.05, -7.6);
 const sw = [4, -21]; // swing set: an A-frame each end, a top bar, three swings on chains
 for (const dx of [-2.2, 2.2]) for (const dz of [-.8, .8]) B.add('play', new T.CylinderGeometry(.05, .05, 2.75, 8), sw[0] + dx, 1.3, sw[1] + dz * .55, q(T, dz > 0 ? .3 : -.3, 0, 0));
 B.add('play', new T.CylinderGeometry(.06, .06, 4.5, 8), sw[0], 2.6, sw[1], q(T, 0, 0, Math.PI / 2));
 for (const dx of [-1.3, 0, 1.3]) { for (const s2 of [-.22, .22]) B.add('steel', new T.CylinderGeometry(.012, .012, 2.05, 4), sw[0] + dx + s2, 1.57, sw[1]); B.add('dark', box(T, .5, .05, .22), sw[0] + dx, .55, sw[1]); }
 const sl = [11, -22.5]; // the slide: a ladder, a platform, a shiny chute
 for (const dz of [-.3, .3]) B.add('play', new T.CylinderGeometry(.04, .04, 2.2, 8), sl[0] - 1.2, 1.1, sl[1] + dz);
 for (let y = .35; y < 2; y += .35) B.add('steel', new T.CylinderGeometry(.02, .02, .6, 6), sl[0] - 1.2, y, sl[1], q(T, Math.PI / 2, 0, 0));
 B.add('play', box(T, .7, .08, .8), sl[0] - .9, 2.1, sl[1]); B.add('alu', box(T, 3.2, .05, .6), sl[0] + .6, 1.1, sl[1], q(T, 0, 0, -.62));
 for (const [x, z] of [[-1, -13], [-1, -12.3], [-1.35, -11.6], [-.65, -11.6], [-1, -10.9], [-1.35, -10.2], [-.65, -10.2], [-1, -9.5]]) { // hopscotch in chalk
  for (const [w, d, dx, dz] of [[.62, .04, 0, -.31], [.62, .04, 0, .31], [.04, .62, -.31, 0], [.04, .62, .31, 0]]) plane('white', w, d, x + dx, z + dz, .012);
 }
 for (let x = -7.2; x >= -11.4; x -= 2.1) B.add('steel', new T.CylinderGeometry(.03, .03, 1.8, 6), x, .9, 4.6); // a chain-link run off the wall, like the key art
 B.add('chain', new T.PlaneGeometry(4.2, 1.8), -9.3, .9, 4.6); B.add('steel', new T.CylinderGeometry(.025, .025, 4.2, 6), -9.3, 1.8, 4.6, q(T, 0, 0, Math.PI / 2));
 const meshes = B.build(scene, M, {noShadow: ['paint', 'white', 'chain', 'glass', 'houseGlass', 'grass', 'yard', 'field', 'asphalt']});
 for (const k of ['brick', 'fascia', 'hvac', 'concrete', 'soffit']) if (meshes[k]) occluders.push(meshes[k]);
 meshes.grass.receiveShadow = meshes.yard.receiveShadow = meshes.asphalt.receiveShadow = true;
 // the flag is its own mesh, so the breeze can move it
 const flagTex = canvasTex(T, 192, 100, (g, w, h) => { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4efe6' : '#b4262e'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#2d3a6b'; g.fillRect(0, 0, w * .42, h * 7 / 13); g.fillStyle = '#f4efe6'; for (let y = 6; y < h * 7 / 13 - 3; y += 8) for (let x = 6 + (y / 8 % 2) * 4; x < w * .42 - 3; x += 9) g.fillRect(x, y, 2, 2); });
 const flag = new T.Mesh(new T.PlaneGeometry(1.5, .8, 12, 4).translate(.75, 0, 0), new T.MeshStandardMaterial({map: flagTex, side: T.DoubleSide, roughness: .9, name: 'flag cloth'}));
 flag.position.set(-15.2, 8.5, -7.6); flag.castShadow = true; flag.name = 'flag'; scene.add(flag);
 return {M, meshes, occluders, flag};
}

// ---------- Trees, grass tufts and fallen leaves (instanced). ----------
export function plantTrees(T, scene, M, list) {
 const r = seeded(43), B = buckets(T, M);
 for (const [x, z, s = 1, conifer = false] of list) {
  B.add('bark', new T.CylinderGeometry(.1 * s, .17 * s, 2.2 * s, 7), x, 1.1 * s, z);
  if (conifer) { for (let i = 0; i < 4; i++) B.add('spruce', new T.ConeGeometry((1.5 - i * .3) * s, 1.6 * s, 8), x, (1.6 + i * .9) * s, z); continue; }
  for (const [bx, bz, by] of [[.6, .2, 1.9], [-.5, -.3, 2.1], [.1, -.6, 2.3]]) { const br = new T.CylinderGeometry(.04 * s, .07 * s, 1.1 * s, 5); const qq = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(bx, .9, bz).normalize()); B.add('bark', br, x + bx * .4 * s, by * s, z + bz * .4 * s, qq); }
  const n = 6 + (r() * 3 | 0);
  for (let i = 0; i < n; i++) {
   const a = i / n * Math.PI * 2 + r(), rad = (.6 + r() * .7) * s, g = new T.IcosahedronGeometry((.75 + r() * .45) * s, 1);
   const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) * (1 + (r() - .5) * .25), p.getY(k) * (.85 + (r() - .5) * .2), p.getZ(k) * (1 + (r() - .5) * .25));
   g.computeVertexNormals();
   B.add('leaf' + (i + (x * 7 | 0)) % 3, g, x + Math.cos(a) * rad, (2.9 + r() * 1.1) * s, z + Math.sin(a) * rad);
  }
  B.add('leaf' + ((x | 0) & 1), new T.IcosahedronGeometry(.95 * s, 1), x, 3.9 * s, z);
 }
 const mats = {...M, leaf0: M.leaf[0], leaf1: M.leaf[1], leaf2: M.leaf[2]};
 return B.build(scene, mats);
}
export function scatter(T, scene, {count = 2600, area = (r) => null, geo, mat, scale = [1, 1], colors = null, seed = 47, tilt = .3}) {
 const r = seeded(seed), m = new T.InstancedMesh(geo, mat, count), o = new T.Object3D(), c = new T.Color(); let n = 0;
 for (let i = 0; i < count * 6 && n < count; i++) {
  const p = area(r); if (!p) continue;
  o.position.set(p[0], p[1] || 0, p[2]); o.rotation.set((r() - .5) * tilt, r() * Math.PI * 2, (r() - .5) * tilt); o.scale.setScalar(scale[0] + r() * (scale[1] - scale[0])); o.updateMatrix(); m.setMatrixAt(n, o.matrix);
  if (colors) m.setColorAt(n, c.set(colors[(r() * colors.length) | 0])); n++;
 }
 m.count = n; m.receiveShadow = true; m.castShadow = false; scene.add(m); return m;
}

// ---------- The sky: a painted dusk dome, sun low in the west, streaks of pink cloud. ----------
export function duskSky(T, scene) {
 const u = {sunDir: {value: new T.Vector3(-.85, .12, .5).normalize()}, night: {value: 0}};
 const mat = new T.ShaderMaterial({uniforms: u, side: T.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform vec3 sunDir; uniform float night; varying vec3 vDir;
   float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
   float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
   void main(){
    float y = clamp(vDir.y, -.2, 1.);
    vec3 horizon = mix(vec3(1.,.56,.3), vec3(.55,.3,.36), night), mid = mix(vec3(.88,.44,.42), vec3(.25,.2,.38), night), zen = mix(vec3(.3,.31,.6), vec3(.07,.07,.17), night);
    vec3 c = mix(horizon, mid, smoothstep(0., .18, y)); c = mix(c, zen, smoothstep(.15, .7, y));
    float s = max(0., dot(normalize(vDir), sunDir));
    c += vec3(1.,.62,.3) * (pow(s, 8.) * .55 + pow(s, 400.) * 3.) * (1. - night * .8);
    vec2 cp = vDir.xz / max(.08, vDir.y + .12) * 1.4; float cl = n(cp * vec2(.6, 2.2)) * .6 + n(cp * vec2(1.3, 4.)) * .4;
    cl = smoothstep(.55, .85, cl) * smoothstep(.02, .12, y) * (1. - smoothstep(.3, .55, y));
    c = mix(c, mix(vec3(1.,.62,.6), vec3(.35,.25,.38), night) + vec3(.25,.12,.05) * pow(s, 3.), cl * .7);
    if (y < 0.) c = mix(c, horizon * .8, smoothstep(0., -.2, y));
    gl_FragColor = vec4(c, 1.);
    #include <colorspace_fragment>
   }`});
 const dome = new T.Mesh(new T.SphereGeometry(180, 32, 16), mat); dome.name = 'dusk sky'; dome.frustumCulled = false; dome.renderOrder = -1; scene.add(dome);
 return {dome, uniforms: u};
}

// Reflections: the same dusk sky, prefiltered, so paint, chrome and glass pick up the sunset.
export function duskEnvironment(T, renderer) {
 const s = new T.Scene(); duskSky(T, s); const pm = new T.PMREMGenerator(renderer); const tex = pm.fromScene(s, .04).texture; pm.dispose(); return tex;
}

// ---------- Power lines and street lamps. ----------
export function streetFurniture(T, scene, M) {
 const B = buckets(T, M), lamps = [];
 const poles = [-75, -45, -15, 15, 45]; // never in front of the climbing wall
 for (const z of poles) { B.add('wood', new T.CylinderGeometry(.11, .15, 11, 8), -15.4, 5.5, z); B.add('wood', box(T, .14, .14, 2.4), -15.4, 10.3, z); B.add('dark', new T.CylinderGeometry(.18, .18, .6, 8), -15.4, 9.4, z + .3); }
 const sag = (a, b) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * .9; pts.push(p); } return pts; };
 for (let i = 0; i < poles.length - 1; i++) for (const dz of [-1, 0, 1]) {
  const c = new T.CatmullRomCurve3(sag(new T.Vector3(-15.4 + dz * .9, 10.4, poles[i]), new T.Vector3(-15.4 + dz * .9, 10.4, poles[i + 1])));
  const line = new T.Mesh(new T.TubeGeometry(c, 12, .014, 3), M.powerLine); line.name = 'power line'; scene.add(line);
 }
 for (const z of [-24, -6, 12]) {
  B.add('lampPost', new T.CylinderGeometry(.06, .09, 6, 8), -16.2, 3, z);
  B.add('lampPost', new T.CylinderGeometry(.04, .04, 1.6, 6), -16.9, 5.9, z, q(T, 0, 0, Math.PI / 2 - .2));
  const head = new T.Mesh(new T.SphereGeometry(.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.4, .5, .8), M.lampGlow); head.rotation.x = Math.PI; head.position.set(-17.7, 6.05, z); head.name = 'street lamp'; scene.add(head);
  const p = new T.PointLight('#ffcf8a', 0, 12, 1.6); p.position.set(-17.7, 5.8, z); scene.add(p); lamps.push(p);
 }
 B.build(scene, M);
 return {lamps};
}

// ---------- The station wagon: an '80s family wagon from a lofted side profile, woodgrain sides, chrome, square lamps. ----------
export function makeWagon(T, color = '#7a3a34') {
 const g = new T.Group(); g.name = 'station wagon';
 const paint = new T.MeshStandardMaterial({color, roughness: .32, metalness: .5, name: 'car paint'});
 const chrome = new T.MeshStandardMaterial({color: '#eeeef2', roughness: .12, metalness: 1, name: 'chrome trim'});
 const glass = new T.MeshStandardMaterial({color: '#1c2230', roughness: .06, metalness: .5, name: 'car glass'});
 const wood = new T.MeshStandardMaterial({color: '#8a5a33', roughness: .55, name: 'woodgrain side panel'});
 const dark = new T.MeshStandardMaterial({color: '#202024', roughness: .6, name: 'tyre and trim'});
 const add = (geo, mat, x, y, z, name) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; m.name = name; g.add(m); return m; };
 // side profile, nose at +x; extruded across the car's width
 const s = new T.Shape(); const P = [[2.45, .28], [2.52, .5], [2.48, .78], [1.2, .86], [.95, .92], [-2.38, .94], [-2.46, .55], [-2.4, .28]];
 s.moveTo(...P[0]); P.slice(1).forEach(p => s.lineTo(...p));
 s.lineTo(-1.15, .28); s.absarc(-1.5, .28, .42, 0, Math.PI, false); s.lineTo(1.15, .28); s.absarc(1.5, .28, .42, 0, Math.PI, false); s.lineTo(2.45, .28);
 const body = new T.ExtrudeGeometry(s, {depth: 1.84, bevelEnabled: true, bevelSize: .05, bevelThickness: .06, bevelSegments: 2, curveSegments: 6}); body.translate(0, 0, -.92);
 add(body, paint, 0, 0, 0, 'car body');
 // the greenhouse: a long glass band under a flat roof, with A, B, C and D pillars standing just proud of it
 const gs = new T.Shape(); gs.moveTo(.95, .9); gs.lineTo(.36, 1.36); gs.lineTo(-2.2, 1.38); gs.lineTo(-2.34, .92); gs.lineTo(.95, .9);
 const glassGeo = new T.ExtrudeGeometry(gs, {depth: 1.76, bevelEnabled: false}); glassGeo.translate(0, 0, -.88); add(glassGeo, glass, 0, 0, 0, 'car glass');
 add(new T.BoxGeometry(2.7, .07, 1.86), paint, -.92, 1.4, 0, 'car roof');
 for (const x of [-.5, -1.4]) add(new T.BoxGeometry(.12, .48, 1.84), paint, x, 1.15, 0, 'pillar');
 add(new T.BoxGeometry(.16, .5, 1.84), paint, -2.27, 1.15, 0, 'D pillar').rotation.z = .25;
 for (const z of [-.9, .9]) add(new T.BoxGeometry(.08, .62, .07), paint, .66, 1.13, z, 'A pillar').rotation.z = .87;
 for (const z of [-1, 1]) {
  add(new T.BoxGeometry(3.7, .34, .02), wood, -.35, .62, z * .985, 'woodgrain side panel');
  add(new T.BoxGeometry(3.75, .03, .03), chrome, -.35, .8, z * .99, 'chrome trim'); add(new T.BoxGeometry(3.75, .03, .03), chrome, -.35, .44, z * .99, 'chrome trim');
  add(new T.BoxGeometry(2.6, .05, .05), chrome, -.9, 1.48, z * .72, 'roof rack rail');
 }
 for (const x of [-.3, -1.6]) add(new T.BoxGeometry(.05, .05, 1.5), chrome, x, 1.49, 0, 'roof rack bar');
 for (const x of [2.58, -2.52]) add(new T.BoxGeometry(.1, .16, 1.96), chrome, x, .36, 0, 'chrome bumper');
 add(new T.BoxGeometry(.05, .22, 1.0), dark, 2.53, .66, 0, 'grille');
 for (const [x, z] of [[1.5, .92], [1.5, -.92], [-1.5, .92], [-1.5, -.92]]) {
  const w = add(new T.CylinderGeometry(.36, .36, .24, 14), dark, x, .32, z, 'tyre'); w.rotation.x = Math.PI / 2;
  const hub = add(new T.CylinderGeometry(.2, .2, .25, 10), chrome, x, .32, z, 'hubcap'); hub.rotation.x = Math.PI / 2;
 }
 const lampMat = new T.MeshStandardMaterial({color: '#fff6d8', emissive: '#fff1b8', emissiveIntensity: 3, name: 'headlamp'});
 const tailMat = new T.MeshStandardMaterial({color: '#7a1010', emissive: '#ff2a2a', emissiveIntensity: .6, name: 'tail lamp'});
 for (const z of [-.66, .66]) { add(new T.BoxGeometry(.06, .18, .34), lampMat, 2.54, .66, z, 'headlamp'); add(new T.BoxGeometry(.06, .5, .16), tailMat, -2.5, .72, z * 1.2, 'tail lamp'); }
 return {group: g, paint, lampMat, tailMat};
}

// The viewer for the study page: ?m=school (the school in its lot) or ?m=wagon.
export function buildSchoolViewer(T, scene, which, {camera, controls, sun}) {
 scene.background = null; duskSky(T, scene); scene.fog = new T.Fog('#e8a07a', 60, 200);
 if (which === 'wagon') {
  const w = makeWagon(T); scene.add(w.group); camera.position.set(4.5, 2.2, 5); controls.target.set(0, .7, 0);
  Object.assign(sun.shadow.camera, {left: -4, right: 4, top: 4, bottom: -4}); return {model: w.group, update() {}};
 }
 const {M} = buildSchool(T, scene); streetFurniture(T, scene, M);
 plantTrees(T, scene, M, [[-13.5, -8, 1.1], [-12.5, 11, 1.3], [-4, 12, 1], [26, -9, 1.2, true], [14, 13, 1.1], [9, 12.5, 1], [-26, 9, 1.1, true]]);
 sun.position.set(-34, 12, 26); Object.assign(sun.shadow.camera, {left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120}); sun.intensity = 3; sun.shadow.camera.updateProjectionMatrix();
 camera.position.set(-26, 16, -18); controls.target.set(0, 3, 0); camera.far = 400; camera.updateProjectionMatrix();
 return {model: null, update() {}};
}
