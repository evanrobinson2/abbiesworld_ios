// Alien plants that grow from the paint (AW-STUDY-0049 "Paint the world", Tab 2 production assets).
// Evan, 2026-10-23: "then you can make exotic alien plants grow from them". Five species, one per paint colour. Each is
// low-poly, flat shaded and vertex coloured, built from named parts (see assets/paint-world/plants/notes.json for the
// recipe and the roles): `stem` (stalk, leaves), `head` (the thing that opens) and `glow` (the parts that light up at
// night). Three growth stages: sprout (two seed leaves), grow (stalk and a closed bud), bloom (the head opens and glows).
// Geometry is built once per species and shared; each plant owns three meshes and a cloned glow material, so growing
// never compiles a shader or rebuilds geometry (the fern, which uncurls, rewrites one small position buffer instead).
//
//   SPECIES                           colour id -> {name, blurb, build}
//   makePlant(colourId, seed) -> P    P.group, P.pose(stage 0..1, seconds, night 0..1), P.dispose()
//   stageName(stage)                  'sprout' | 'grow' | 'bloom'
// Units are metres of plant (1 = a person's belt); the caller scales to the world (0.1 render units per metre).
import * as T from 'three';
import {mergeGeometries} from '../vendor/utils/BufferGeometryUtils.js';

const col = new T.Color(), M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), V = new T.Vector3(), S = new T.Vector3();
const ease = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const clamp01 = x => Math.min(1, Math.max(0, x));
export const stageName = s => s < .33 ? 'sprout' : s < .66 ? 'grow' : 'bloom';

// One part: a cloned primitive, placed, tinted with a vertex colour, flat (non-indexed) so parts merge.
function part(geo, hex, o = {}) {
 const g = (geo.index ? geo.toNonIndexed() : geo.clone());
 g.deleteAttribute('uv');
 E.set(o.rx || 0, o.ry || 0, o.rz || 0); Q.setFromEuler(E);
 S.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1);
 M4.compose(V.set(o.x || 0, o.y || 0, o.z || 0), Q, S); g.applyMatrix4(M4);
 const n = g.attributes.position.count, c = new Float32Array(n * 3); col.set(hex);
 for (let i = 0; i < n; i++) { const k = o.shade ? 1 - o.shade * (g.attributes.position.getY(i) < (o.y || 0) ? 1 : 0) : 1; c[i * 3] = col.r * k; c[i * 3 + 1] = col.g * k; c[i * 3 + 2] = col.b * k; }
 g.setAttribute('color', new T.BufferAttribute(c, 3));
 return g;
}
const merge = list => list.length ? mergeGeometries(list, false) : new T.BufferGeometry();
// A soft additive halo around every glow part, so lit parts bloom in the dark (made from the glow parts' own bounds).
function halo(list, scale = 2.6) {
 const out = [], box = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3();
 for (const g of list) { g.computeBoundingBox(); box.copy(g.boundingBox); box.getCenter(c); box.getSize(sz); out.push(part(new T.IcosahedronGeometry(1, 1), '#ffffff', {x: c.x, y: c.y, z: c.z, s: Math.max(.05, Math.max(sz.x, sz.y, sz.z) * .5 * scale)})); }
 return merge(out);
}
const cone = (r0, r1, h, seg = 6) => new T.CylinderGeometry(r1, r0, h, seg, 1).translate(0, h / 2, 0);
const ball = (r, d = 1) => new T.IcosahedronGeometry(r, d);
const bell = (r, seg = 9, rings = 4) => new T.SphereGeometry(r, seg, rings, 0, Math.PI * 2, 0, Math.PI / 2);
// Two seed leaves every species shows as a sprout; they stay as low leaves on the grown plant.
const seedLeaves = (hex, size = .32) => [-1, 1].map(k => part(ball(.5, 0), hex, {x: k * size * .55, y: size * .25, sx: size * .9, sy: size * .26, sz: size * .5, rz: k * .5}));

const PAL = {
 pink:   {paint: '#ff3fa4', deep: '#c2186f', stem: '#2fae8b', leaf: '#47d3a1', head: '#ff6ec0', rim: '#ffd1ea', glow: '#fff0a8'},
 teal:   {paint: '#16d6c0', deep: '#0b8f86', stem: '#1b8f7d', leaf: '#38d6bd', head: '#8cf0e0', rim: '#d8fff7', glow: '#b6fff0'},
 lime:   {paint: '#9be22c', deep: '#5a9a10', stem: '#5b9a1d', leaf: '#8fd23a', head: '#e8ff5c', rim: '#f6ffb0', glow: '#fffbb0'},
 violet: {paint: '#8a5cff', deep: '#5530c8', stem: '#d8c6ff', leaf: '#6e48e0', head: '#9a6cff', rim: '#4c2aa8', glow: '#ffe9a8'},
 sun:    {paint: '#ffb824', deep: '#e57d0a', stem: '#c47a14', leaf: '#ffcf55', head: '#ffd84a', rim: '#fff3b0', glow: '#ffffff'}
};
export const PAINT_COLOURS = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, {paint: v.paint, deep: v.deep}]));

// ---- Species. Each returns {stem, head, glow, stemH, pose(p, s, g, b, t, night)} (geometry only; makePlant adds meshes).
const SPECIES = {
 pink: {name: 'Jelly Bloom', blurb: 'A bell flower that hangs glowing tendrils and bobs like a jellyfish.', build() {
  const p = PAL.pink, stem = [], head = [], glow = [];
  for (let i = 0; i < 3; i++) stem.push(part(cone(.1 - i * .02, .085 - i * .02, .55, 6), p.stem, {y: i * .5, rz: (i ? .12 : 0), x: i * .02}));
  stem.push(...seedLeaves(p.leaf, .5));
  head.push(part(bell(.62, 10, 5), p.head, {y: 0, sy: .7}), part(new T.CylinderGeometry(.62, .62, .07, 10), p.rim, {y: .01}));
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, L = .55 + (i % 3) * .18; head.push(part(cone(.04, .01, L, 4), p.head, {x: Math.cos(a) * .52, z: Math.sin(a) * .52, y: -L, rz: 0})); glow.push(part(ball(.065, 1), p.glow, {x: Math.cos(a) * .52, z: Math.sin(a) * .52, y: -L})); }
  for (let i = 0; i < 4; i++) glow.push(part(ball(.06, 0), p.glow, {x: Math.cos(i * 1.6) * .22, y: .38 + (i % 2) * .08, z: Math.sin(i * 1.6) * .22}));
  return {stem: merge(stem), head: merge(head), glow: merge(glow), halo: halo(glow), stemH: 1.55,
   pose(m, s, g, b, t) { m.head.rotation.z = Math.sin(t * 1.3) * .08 * b; m.head.position.y += Math.sin(t * 1.7) * .05 * b; }};
 }},
 teal: {name: 'Spiral Fern', blurb: 'Five fronds that start as tight curls and uncurl as they grow.', fern: true, build() {
  const p = PAL.teal, FR = 5, SEG = 14, stem = [], glow = [];
  stem.push(...seedLeaves(p.leaf, .4));
  for (let i = 0; i < 4; i++) glow.push(part(ball(.05, 0), p.glow, {x: (i - 1.5) * .12, y: .1, z: 0}));
  const pos = new Float32Array(FR * SEG * 8 * 9), colr = new Float32Array(pos.length);
  const c1 = new T.Color(p.stem), c2 = new T.Color(p.head), c3 = new T.Color(p.leaf);
  for (let f = 0; f < FR; f++) for (let s = 0; s < SEG; s++) for (let k = 0; k < 8; k++) for (let v = 0; v < 3; v++) {
   const o = ((f * SEG + s) * 8 + k) * 9 + v * 3, c = k < 6 ? (s % 2 ? c1 : c3) : c2, u = s / SEG, sh = 1 - u * .25;
   colr[o] = c.r * sh; colr[o + 1] = c.g * sh; colr[o + 2] = c.b * sh;
  }
  const head = new T.BufferGeometry(); head.setAttribute('position', new T.BufferAttribute(pos, 3)); head.setAttribute('color', new T.BufferAttribute(colr, 3));
  head.userData.curl = true;
  // curl 1 = a tight spiral, 0 = an open arch. Called when the growth stage moves; writes the one position buffer.
  function setCurl(geo, curl, size) {
   const P = geo.attributes.position.array;
   for (let f = 0; f < FR; f++) {
    const az = f / FR * Math.PI * 2 + .3, dx = Math.cos(az), dz = Math.sin(az), turn = (.55 + 2.25 * curl) * Math.PI, len = (1.5 + (f % 2) * .35) * size;
    let y = 0, r = 0, phi = .12 + (f % 2) * .1;
    const pts = [[0, 0, (.09 * size)]];
    for (let s = 1; s <= SEG; s++) { const u = s / SEG, ds = len / SEG * (1.15 - u * .6); phi += turn / SEG * (.4 + u * 1.6); r += Math.sin(phi) * ds; y += Math.cos(phi) * ds; pts.push([r, y, (.09 * size) * (1 - u * .85)]); }
    for (let s = 0; s < SEG; s++) {
     const [r0, y0, w0] = pts[s], [r1, y1, w1] = pts[s + 1];
     const A0 = [dx * r0, y0 + .02, dz * r0], A1 = [dx * r1, y1 + .02, dz * r1];
     const nx = -dz, nz = dx;
     const ring = (a, w) => [[a[0] + nx * w, a[1], a[2] + nz * w], [a[0] - nx * w * .5, a[1] + w * .8, a[2] - nz * w * .5], [a[0] - nx * w * .5, a[1] - w * .8, a[2] - nz * w * .5]];
     const R0 = ring(A0, w0), R1 = ring(A1, w1);
     const tris = [];
     for (let e = 0; e < 3; e++) { const e2 = (e + 1) % 3; tris.push([R0[e], R1[e], R1[e2]], [R0[e], R1[e2], R0[e2]]); }
     const lw = (.2 + .18 * Math.sin(u(s, SEG) * 3.1)) * size * (1 - s / SEG * .5);
     tris.push([A0, A1, [A0[0] + nx * lw, A0[1] + lw * .25, A0[2] + nz * lw]], [A0, A1, [A0[0] - nx * lw, A0[1] + lw * .25, A0[2] - nz * lw]]);
     for (let k = 0; k < 8; k++) for (let v = 0; v < 3; v++) { const o = ((f * SEG + s) * 8 + k) * 9 + v * 3; P[o] = tris[k][v][0]; P[o + 1] = tris[k][v][1]; P[o + 2] = tris[k][v][2]; }
    }
   }
   geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere();
  }
  function u(s, n) { return s / n; }
  return {stem: merge(stem), head, glow: merge(glow), halo: halo(glow), stemH: .05, fernCurl: setCurl,
   pose(m, s, g, b, t) { m.head.position.y = 0; m.head.rotation.y = Math.sin(t * .6) * .06; }};
 }},
 lime: {name: 'Pom Reed', blurb: 'Tall reeds that bow in the wind, each tipped with a fuzzy pom that lights up.', build() {
  const p = PAL.lime, stem = [], head = [], glow = [];
  stem.push(...seedLeaves(p.leaf, .42));
  const H = [2.1, 1.7, 2.4, 1.5, 1.9];
  H.forEach((h, i) => { const a = i / H.length * Math.PI * 2, lean = .1 + (i % 2) * .08, x = Math.cos(a) * .22, z = Math.sin(a) * .22;
   stem.push(part(cone(.07, .035, h, 5), p.stem, {x, z, rz: -Math.cos(a) * lean, rx: Math.sin(a) * lean}));
   const tx = x + Math.cos(a) * Math.sin(lean) * h, tz = z + Math.sin(a) * Math.sin(lean) * h, ty = Math.cos(lean) * h;
   head.push(part(ball(.26 + (i % 2) * .05, 1), p.head, {x: tx, y: ty, z: tz})); glow.push(part(ball(.1, 0), p.glow, {x: tx, y: ty + .02, z: tz})); });
  return {stem: merge(stem), head: merge(head), glow: merge(glow), halo: halo(glow), stemH: 0, headFollowsStem: true,
   pose(m, s, g, b, t) { m.stem.rotation.z = Math.sin(t * .9) * .05 * g; m.head.rotation.z = m.stem.rotation.z; }};
 }},
 violet: {name: 'Glowcap', blurb: 'A cluster of mushroom caps, freckled with lights that pulse after dark.', build() {
  const p = PAL.violet, stem = [], head = [], glow = [];
  stem.push(...seedLeaves(p.leaf, .4));
  stem.push(part(cone(.2, .13, .9, 7), p.stem, {}), part(cone(.12, .08, .6, 6), p.stem, {x: .42, z: .1, rz: -.2}), part(bell(.28, 8, 4), p.head, {x: .52, y: .55, z: .14, rz: -.2}),
   part(cone(.1, .07, .45, 6), p.stem, {x: -.38, z: -.12, rz: .22}), part(bell(.22, 8, 4), p.head, {x: -.46, y: .42, z: -.14, rz: .22}));
  head.push(part(bell(.78, 11, 5), p.head, {sy: .62}), part(new T.CylinderGeometry(.74, .6, .08, 11), p.rim, {y: -.02}));
  for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = .18 + (i % 3) * .17, y = Math.sqrt(Math.max(0, .78 * .78 - rr * rr)) * .62; glow.push(part(ball(.075, 0), p.glow, {x: Math.cos(a) * rr, y: y + .01, z: Math.sin(a) * rr, sy: .6})); }
  return {stem: merge(stem), head: merge(head), glow: merge(glow), halo: halo(glow), stemH: .9,
   pose(m, s, g, b, t, night) { m.head.scale.y *= 1 + Math.sin(t * 2.2) * .04 * b; }};
 }},
 sun: {name: 'Star Spire', blurb: 'A twisting spire of star-shaped discs that turn slowly and shed tiny glowing pods.', build() {
  const p = PAL.sun, stem = [], head = [], glow = [];
  stem.push(...seedLeaves(p.leaf, .4));
  for (let i = 0; i < 3; i++) stem.push(part(cone(.19 - i * .03, .16 - i * .03, .52, 5), p.stem, {y: i * .5, ry: i * .6}));
  const star = (R, r, n = 5) => { const sh = new T.Shape(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr = i % 2 ? r : R; i ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(rr, 0); } sh.closePath(); return new T.ExtrudeGeometry(sh, {depth: .07, bevelEnabled: false}).rotateX(-Math.PI / 2); };
  [[.85, .4], [.7, .33], [.55, .26], [.4, .19]].forEach(([R, r], i) => head.push(part(star(R, r), i % 2 ? p.head : p.leaf, {y: i * .17, ry: i * .63})));
  head.push(part(cone(.07, .01, .42, 5), p.rim, {y: .55}));
  glow.push(part(ball(.15, 1), p.glow, {y: 1.02}));
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; glow.push(part(ball(.06, 0), p.glow, {x: Math.cos(a) * 1, y: .15 + (i % 2) * .2, z: Math.sin(a) * 1})); }
  return {stem: merge(stem), head: merge(head), glow: merge(glow), halo: halo(glow), stemH: 1.45,
   pose(m, s, g, b, t) { m.head.rotation.y = t * (.25 + .9 * b); m.glow.rotation.y = m.head.rotation.y; }};
 }}
};
export {SPECIES};
export const PLANT_IDS = Object.keys(SPECIES);

const built = new Map(), mats = {};
function species(id) { if (!built.has(id)) built.set(id, SPECIES[id].build()); return built.get(id); }
// Materials are created once; glow gets a clone per plant (its own pulse), which shares the compiled program.
function bodyMat() { return mats.body ??= Object.assign(new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: .78, metalness: 0, side: T.DoubleSide}), {name: 'alien-plant-body'}); }
function haloTemplate() { return mats.halo ??= Object.assign(new T.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending}), {name: 'alien-plant-halo'}); }
function glowTemplate() { return mats.glow ??= Object.assign(new T.MeshStandardMaterial({vertexColors: true, flatShading: true, roughness: .4, emissive: '#ffffff', emissiveIntensity: .5, emissiveMap: null}), {name: 'alien-plant-glow'}); }

export function makePlant(id, seed = 1) {
  const sp = species(id), group = new T.Group(); group.name = 'alien-plant-' + id;
  const wobble = ((seed * 9301 + 49297) % 233280) / 233280;
  // The fern owns its head geometry (it uncurls), everything else shares the species geometry.
  const headGeo = sp.fernCurl ? sp.head.clone() : sp.head, glowMat = glowTemplate().clone();
  glowMat.emissive.set(PAL[id].glow);
  const haloMat = haloTemplate().clone(); haloMat.color.set(PAL[id].glow);
  const stem = new T.Mesh(sp.stem, bodyMat()), headG = new T.Group(), head = new T.Mesh(headGeo, bodyMat()), glow = new T.Mesh(sp.glow, glowMat), haloMesh = new T.Mesh(sp.halo, haloMat); haloMesh.name = 'glow-halo'; haloMesh.raycast = () => {}; haloMesh.renderOrder = 3;
  stem.name = 'stalk'; head.name = 'head'; glow.name = 'glow-parts';
  for (const m of [stem, head, glow]) { m.castShadow = true; m.frustumCulled = !sp.fernCurl; }
  headG.add(head, glow, haloMesh); group.add(stem, headG);
  const m = {stem, head: headG, glow: headG};
  const P = {id, group, seed, stage: -1, _curl: -1,
   pose(s, t = 0, night = 0) {
    const g = ease(s / .62), b = ease((s - .6) / .38), sprout = ease(s / .2);
    const tt = t + wobble * 20;
    stem.scale.set(.5 + .5 * g, Math.max(.02, sprout * (.22 + .78 * g)), .5 + .5 * g);
    if (sp.headFollowsStem) { // reed: the poms ride the tips of the stalks, so the head scales with the stalk
     const k = .35 + .65 * b; headG.position.set(0, 0, 0); headG.scale.set(Math.max(.001, stem.scale.x * k), Math.max(.001, stem.scale.y), Math.max(.001, stem.scale.z * k));
    } else {
     headG.position.set(0, sp.stemH * stem.scale.y, 0);
     headG.scale.setScalar(Math.max(.001, ease((s - .28) / .3) * .42 + b * .58));
    }
    headG.visible = s > .27; glow.visible = b > .02 || s > .5;
    glowMat.emissiveIntensity = (.3 + 2.4 * night) * (.35 + .65 * b);
    const pulse = .85 + .15 * Math.sin(tt * 2.4 + wobble * 6); haloMat.opacity = night > .05 ? Math.min(.55, .6 * night * (.25 + .75 * b) * pulse) : 0; haloMesh.visible = haloMat.opacity > .01;
    if (sp.fernCurl) { const curl = 1 - ease((s - .22) / .6), c = Math.round(curl * 60) / 60, size = .25 + .75 * ease(s / .5); if (c !== P._curl || Math.abs(size - (P._size || 0)) > .01) { sp.fernCurl(headGeo, c, size); P._curl = c; P._size = size; } headG.visible = s > .12; }
    sp.pose(m, s, g, b, tt, night);
    P.stage = s;
   },
   dispose() { glowMat.dispose(); haloMat.dispose(); if (sp.fernCurl) headGeo.dispose(); }};
  if (sp.fernCurl) sp.fernCurl(headGeo, 1, .25);
  P.pose(0);
  return P;
}
