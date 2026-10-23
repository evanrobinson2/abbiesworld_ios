// Procedural toy models for every card, champion and unit. Built from primitives so the whole set shares one hand:
// chunky, flat-shaded, painted-wood colours. Part and material names say what they are.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/jsm/utils/BufferGeometryUtils.js';
import { CARDS, champById } from './data.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.78, metalness: opts.metal ?? 0, flatShading: opts.flat ?? true,
      emissive: opts.glow ? new THREE.Color(opts.glow) : 0x000000, emissiveIntensity: opts.glow ? (opts.gi ?? 1.4) : 0, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 }));
  }
  return matCache.get(key);
}

function add(g, geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.set(x, y, z);
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.s) m.scale.setScalar(opts.s);
  if (opts.sv) m.scale.set(...opts.sv);
  m.castShadow = !opts.noShadow; m.receiveShadow = true;
  if (opts.name) m.name = opts.name;
  g.add(m);
  return m;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt, rb, h, n = 10) => new THREE.CylinderGeometry(rt, rb, h, n);
const cone = (r, h, n = 10) => new THREE.ConeGeometry(r, h, n);
const ball = (r, n = 10) => new THREE.SphereGeometry(r, n, Math.max(6, n - 2));
const torus = (r, t, n = 12) => new THREE.TorusGeometry(r, t, 6, n);

const C = {
  wood: '#a8743f', darkWood: '#7a5230', stone: '#b9b2a6', darkStone: '#8d877d', roofRed: '#c4553f', roofBlue: '#3f6fb8',
  white: '#f3eee2', gold: '#f2c14e', brass: '#d9a441', copper: '#c46a2f', teal: '#36b3a8', leaf: '#5fa043', darkLeaf: '#3d7a2e',
  skin: '#f1c9a0', iron: '#7f8790', glass: '#ffe9a3', fire: '#ff8a2a', fire2: '#ffd45a', water: '#4fa9d9', moss: '#7fa64a', cream: '#efe2c2',
};

function roofed(g, w, d, h, wallColor, roofColor, y0 = 0) {
  add(g, box(w, h, d), wallColor, 0, y0 + h / 2, 0, { name: 'wall' });
  const roof = new THREE.CylinderGeometry(0.0001, Math.max(w, d) * 0.78, h * 0.8, 4);
  const r = add(g, roof, roofColor, 0, y0 + h + h * 0.4, 0, { ry: Math.PI / 4, name: 'roof' });
  r.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
  add(g, box(0.28, 0.42, 0.04), C.darkWood, 0, y0 + 0.21, d / 2 + 0.01, { name: 'door' });
  return g;
}
function crenel(g, w, d, y, color) {
  const n = Math.max(2, Math.round(w / 0.32));
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n);
    if (k % 2 === 0) { add(g, box(w / n, 0.18, 0.14), color, x, y, d / 2 - 0.07); add(g, box(w / n, 0.18, 0.14), color, x, y, -d / 2 + 0.07); }
  }
  for (let k = 0; k < n; k++) {
    const z = -d / 2 + (k + 0.5) * (d / n);
    if (k % 2 === 0) { add(g, box(0.14, 0.18, d / n), color, w / 2 - 0.07, y, z); add(g, box(0.14, 0.18, d / n), color, -w / 2 + 0.07, y, z); }
  }
}
function flame(g, x, y, z, s = 1) {
  add(g, cone(0.16 * s, 0.42 * s, 7), C.fire, x, y + 0.2 * s, z, { glow: C.fire, gi: 1.6, name: 'flame' });
  add(g, cone(0.09 * s, 0.28 * s, 6), C.fire2, x, y + 0.2 * s, z + 0.02, { glow: C.fire2, gi: 2, name: 'flame-core' });
}
function banner(g, x, z, color, h = 1.3) {
  add(g, cyl(0.025, 0.025, h, 5), C.darkWood, x, h / 2, z, { name: 'pole' });
  add(g, box(0.34, 0.24, 0.02), color, x + 0.18, h - 0.16, z, { name: 'flag' });
}

// ---- units: the little figures that fight ------------------------------------------------------------------------
// Each shape is two merged geometries: `body` (painted in the team colour per instance) and `detail` (fixed colours).
function painted(geo, color) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  geo.deleteAttribute('uv');
  return geo;
}
function placed(geo, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(s, s, s));
  return geo.applyMatrix4(m);
}
export function unitGeometry(shape) {
  const body = [], detail = [];
  if (shape === 'pawn') {
    body.push(placed(painted(cyl(0.13, 0.22, 0.42, 8), '#ffffff'), 0, 0.21, 0));
    detail.push(placed(painted(ball(0.14, 8), C.skin), 0, 0.55, 0));
    body.push(placed(painted(cyl(0.15, 0.15, 0.06, 8), '#ffffff'), 0, 0.64, 0));
    detail.push(placed(painted(cyl(0.018, 0.018, 0.9, 4), C.darkWood), 0.2, 0.45, 0.05, 0.2, 0, 0));
    detail.push(placed(painted(cone(0.05, 0.14, 4), C.iron), 0.2, 0.92, 0.14, 0.2, 0, 0));
  } else if (shape === 'ranged') {
    body.push(placed(painted(cyl(0.12, 0.2, 0.4, 8), '#ffffff'), 0, 0.2, 0));
    detail.push(placed(painted(ball(0.13, 8), C.skin), 0, 0.51, 0));
    body.push(placed(painted(cone(0.16, 0.3, 8), '#ffffff'), 0, 0.72, 0));
    detail.push(placed(painted(torus(0.16, 0.02, 10), C.darkWood), 0.17, 0.4, 0.1, 0, 1.4, 0, 1));
  } else if (shape === 'brute') {
    body.push(placed(painted(box(0.5, 0.46, 0.38), '#ffffff'), 0, 0.27, 0));
    detail.push(placed(painted(ball(0.16, 8), C.skin), 0, 0.64, 0));
    body.push(placed(painted(cyl(0.17, 0.17, 0.08, 8), '#ffffff'), 0, 0.76, 0));
    detail.push(placed(painted(cyl(0.22, 0.22, 0.05, 10), C.iron), 0.0, 0.33, 0.24, Math.PI / 2, 0, 0));
    detail.push(placed(painted(ball(0.05, 6), C.brass), 0.0, 0.33, 0.28));
  } else if (shape === 'tiny') {
    body.push(placed(painted(ball(0.17, 8), '#ffffff'), 0, 0.17, 0));
    body.push(placed(painted(cone(0.08, 0.2, 6), '#ffffff'), 0, 0.38, 0));
    detail.push(placed(painted(ball(0.035, 5), '#2b2b2b'), -0.06, 0.22, 0.14));
    detail.push(placed(painted(ball(0.035, 5), '#2b2b2b'), 0.06, 0.22, 0.14));
  }
  return { body: mergeGeometries(body), detail: mergeGeometries(detail) };
}

// ---- champions -----------------------------------------------------------------------------------------------------
export function championFigure(champId, scale = 1) {
  const ch = champById(champId), g = new THREE.Group(), L = ch.look;
  add(g, cone(0.5, 1.2, 12), L.robe, 0, 0.6, 0, { name: 'robe' });
  add(g, cyl(0.36, 0.42, 0.1, 12), L.trim, 0, 0.32, 0, { name: 'robe-trim' });
  add(g, cyl(0.17, 0.2, 0.12, 10), L.trim, 0, 1.12, 0, { name: 'collar' });
  add(g, ball(0.3, 12), C.skin, 0, 1.38, 0, { name: 'head' });
  add(g, ball(0.04, 5), '#2b2b2b', -0.1, 1.42, 0.27, { name: 'eye' });
  add(g, ball(0.04, 5), '#2b2b2b', 0.1, 1.42, 0.27, { name: 'eye' });
  add(g, ball(0.09, 6), L.robe, 0.42, 0.85, 0.08, { name: 'hand' });
  if (L.hat === 'lantern') {
    add(g, cone(0.34, 0.5, 10), '#2e4f86', 0, 1.78, 0, { name: 'hood' });
    add(g, cyl(0.03, 0.03, 1.7, 5), C.darkWood, 0.48, 0.95, 0.1, { name: 'staff' });
    add(g, box(0.18, 0.22, 0.18), C.glass, 0.48, 1.86, 0.1, { glow: C.glass, gi: 1.8, name: 'lantern' });
    add(g, cone(0.14, 0.14, 4), C.brass, 0.48, 2.04, 0.1, { ry: Math.PI / 4, name: 'lantern-cap' });
  } else if (L.hat === 'leaf') {
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; add(g, ball(0.12, 6), k % 2 ? C.leaf : C.darkLeaf, Math.sin(a) * 0.27, 1.6, Math.cos(a) * 0.27, { sv: [1, 0.6, 1.4], name: 'leaf-wreath' }); }
    add(g, ball(0.08, 6), '#e2577a', 0.2, 1.68, 0.18, { name: 'flower' });
    add(g, cyl(0.04, 0.05, 1.6, 6), C.darkWood, 0.48, 0.9, 0.1, { rz: 0.08, name: 'crook' });
    add(g, ball(0.12, 6), C.leaf, 0.52, 1.75, 0.1, { name: 'crook-leaves' });
  } else if (L.hat === 'tricorn') {
    add(g, cyl(0.42, 0.42, 0.08, 3), '#3a2a1c', 0, 1.64, 0, { ry: Math.PI, name: 'tricorn-brim' });
    add(g, cyl(0.2, 0.26, 0.24, 10), '#3a2a1c', 0, 1.76, 0, { name: 'tricorn-crown' });
    add(g, ball(0.06, 6), C.gold, 0, 1.78, 0.24, { name: 'badge' });
    add(g, cyl(0.12, 0.12, 0.04, 14), C.gold, 0.46, 0.86, 0.14, { rx: Math.PI / 2, name: 'coin' });
  } else if (L.hat === 'flame') {
    flame(g, -0.12, 1.55, 0, 1.3); flame(g, 0.14, 1.55, -0.04, 1.1); flame(g, 0, 1.62, -0.1, 1.5);
    add(g, box(0.16, 0.2, 0.16), C.glass, 0.48, 0.92, 0.12, { glow: C.fire, gi: 1.5, name: 'ember-lamp' });
  } else if (L.hat === 'helm') {
    add(g, ball(0.33, 10), C.iron, 0, 1.5, 0, { sv: [1, 0.75, 1], metal: 0.3, name: 'helm' });
    add(g, box(0.5, 0.06, 0.06), C.iron, 0, 1.4, 0.28, { name: 'helm-brow' });
    add(g, ball(0.16, 6), C.moss, 0.1, 1.72, -0.05, { sv: [1.3, 0.5, 1], name: 'moss-tuft' });
    add(g, box(0.1, 0.9, 0.1), C.darkStone, 0.5, 0.75, 0.1, { name: 'hammer-handle' });
    add(g, box(0.34, 0.24, 0.24), C.stone, 0.5, 1.24, 0.1, { name: 'hammer-head' });
  }
  g.scale.setScalar(scale);
  return g;
}

// ---- cards ---------------------------------------------------------------------------------------------------------
function figureGroup(g, shape, color, spots) {
  const { body, detail } = unitGeometry(shape);
  for (const [x, z, ry] of spots) {
    const b = new THREE.Mesh(body, new THREE.MeshStandardMaterial({ color, vertexColors: true, flatShading: true, roughness: 0.8 }));
    const d = new THREE.Mesh(detail, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 }));
    for (const m of [b, d]) { m.position.set(x, 0.12, z); m.rotation.y = ry || 0; m.castShadow = true; g.add(m); }
  }
}
function troopCamp(g, card, color, accent) {
  add(g, cyl(0.85, 0.95, 0.12, 14), '#cdb98f', 0, 0.06, 0, { name: 'yard' });
  const tent = add(g, cone(0.5, 0.75, 4), color, -0.42, 0.5, -0.38, { ry: Math.PI / 4, name: 'tent' });
  add(g, cone(0.12, 0.14, 4), accent, -0.42, 0.93, -0.38, { ry: Math.PI / 4, name: 'tent-top' });
  banner(g, 0.62, -0.5, accent, 1.25);
  const u = card.unit;
  figureGroup(g, u.shape, color, u.shape === 'tiny' ? [[0.1, 0.25], [0.4, 0.05], [-0.2, 0.45], [0.45, 0.45], [0.1, -0.15]] : u.shape === 'brute' ? [[0.15, 0.25], [0.5, -0.05]] : [[0.05, 0.3], [0.45, 0.1], [0.3, 0.5]]);
}

const BUILDERS = {
  lighthouse(g, ch) {
    add(g, cyl(0.85, 0.95, 0.2, 14), C.stone, 0, 0.1, 0, { name: 'foundation' });
    const bands = 5;
    for (let k = 0; k < bands; k++) add(g, cyl(0.5 - k * 0.045, 0.54 - k * 0.045, 0.42, 12), k % 2 ? ch.color : C.white, 0, 0.41 + k * 0.42, 0, { name: 'tower-band' });
    add(g, cyl(0.42, 0.38, 0.08, 12), C.darkWood, 0, 2.3, 0, { name: 'gallery' });
    add(g, cyl(0.26, 0.26, 0.38, 8), C.glass, 0, 2.53, 0, { glow: '#ffe28a', gi: 2.2, name: 'lamp' });
    add(g, cone(0.34, 0.4, 8), ch.color, 0, 2.92, 0, { name: 'cap' });
    add(g, box(0.2, 0.32, 0.04), C.darkWood, 0, 0.36, 0.5, { name: 'door' });
  },
  elder_stump(g) {
    add(g, cyl(0.78, 0.92, 0.95, 12), C.darkWood, 0, 0.48, 0, { name: 'stump' });
    add(g, cyl(0.7, 0.7, 0.04, 12), '#d8b07a', 0, 0.97, 0, { name: 'rings' });
    add(g, torus(0.4, 0.03, 16), '#b58a52', 0, 0.99, 0, { rx: Math.PI / 2, name: 'ring' });
    for (const [x, z, s] of [[-0.3, 0.2, 1.1], [0.32, -0.1, 0.9], [0, -0.35, 0.8]]) {
      add(g, cyl(0.03, 0.04, 0.5 * s, 5), C.darkLeaf, x, 1.2, z, { name: 'shoot' });
      add(g, ball(0.2 * s, 7), C.leaf, x, 1.45 + 0.1 * s, z, { name: 'shoot-leaves' });
    }
    for (const a of [0, 1.7, 3.4, 5]) add(g, box(0.18, 0.18, 0.6), C.darkWood, Math.sin(a) * 0.85, 0.12, Math.cos(a) * 0.85, { ry: a, name: 'root' });
    add(g, ball(0.28, 6), C.moss, 0.6, 0.6, 0.35, { sv: [1, 0.5, 1], name: 'moss' });
  },
  mint(g, ch) {
    roofed(g, 1.3, 1.1, 0.95, ch.color, '#2b8f86');
    add(g, box(0.22, 0.6, 0.22), C.darkStone, 0.42, 1.8, -0.25, { name: 'chimney' });
    add(g, cyl(0.34, 0.34, 0.08, 18), C.gold, 0, 0.62, 0.6, { rx: Math.PI / 2, metal: 0.5, rough: 0.35, name: 'coin-sign' });
    add(g, box(0.2, 0.06, 0.02), '#a8781f', 0, 0.62, 0.65, { name: 'coin-mark' });
    for (const [x, z] of [[-0.75, 0.55], [-0.62, 0.72], [0.8, 0.6]]) add(g, cyl(0.12, 0.12, 0.05, 12), C.gold, x, 0.05, z, { metal: 0.4, name: 'coin-pile' });
  },
  pyre(g, ch) {
    add(g, cyl(0.75, 0.85, 0.3, 8), C.darkStone, 0, 0.15, 0, { name: 'plinth' });
    add(g, cyl(0.3, 0.42, 0.9, 8), C.stone, 0, 0.75, 0, { name: 'pillar' });
    add(g, cyl(0.62, 0.32, 0.4, 10), '#5b4a42', 0, 1.38, 0, { name: 'brazier' });
    flame(g, 0, 1.55, 0, 2.2); flame(g, -0.2, 1.5, 0.1, 1.4); flame(g, 0.22, 1.5, -0.08, 1.5);
    for (const a of [0.7, 2.4, 4.0, 5.6]) { const x = Math.sin(a) * 0.7, z = Math.cos(a) * 0.7; add(g, cyl(0.05, 0.05, 0.8, 5), C.darkWood, x, 0.6, z, { name: 'lamp-post' }); add(g, box(0.14, 0.16, 0.14), C.glass, x, 1.05, z, { glow: C.fire, gi: 1.6, name: 'lamp' }); }
  },
  stone_keep(g) {
    add(g, box(1.4, 1.2, 1.4), C.stone, 0, 0.6, 0, { name: 'keep' });
    crenel(g, 1.4, 1.4, 1.29, C.stone);
    add(g, box(0.6, 0.7, 0.6), C.darkStone, 0, 1.55, 0, { name: 'turret' });
    crenel(g, 0.6, 0.6, 1.98, C.darkStone);
    banner(g, 0, 0, '#7d8a8f', 2.6);
    add(g, box(0.36, 0.5, 0.05), C.darkWood, 0, 0.25, 0.71, { name: 'gate' });
    add(g, ball(0.3, 6), C.moss, -0.6, 1.25, 0.6, { sv: [1, 0.35, 0.6], name: 'moss' });
  },
  watchtower(g, ch) {
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) add(g, box(0.12, 1.9, 0.12), C.wood, x, 0.95, z, { name: 'post' });
    add(g, box(1.05, 0.1, 1.05), C.darkWood, 0, 1.9, 0, { name: 'platform' });
    add(g, box(0.9, 0.25, 0.9), C.wood, 0, 2.08, 0, { name: 'rail' });
    const r = add(g, cone(0.8, 0.6, 4), ch.color, 0, 2.6, 0, { ry: Math.PI / 4, name: 'roof' });
    add(g, box(0.9, 0.08, 0.08), C.darkWood, 0, 1.0, 0.4, { rz: 0.9, name: 'brace' });
  },
  beehive(g) {
    add(g, cyl(0.06, 0.08, 0.7, 6), C.darkWood, 0, 0.35, 0, { name: 'post' });
    for (let k = 0; k < 4; k++) add(g, torus(0.42 - k * 0.08, 0.11, 14), '#e0b44a', 0, 0.8 + k * 0.17, 0, { rx: Math.PI / 2, name: 'skep-coil' });
    add(g, ball(0.16, 8), '#e0b44a', 0, 1.42, 0, { name: 'skep-top' });
    add(g, ball(0.09, 6), '#3a2a1c', 0, 0.85, 0.38, { name: 'skep-door' });
    for (const [x, y, z] of [[0.6, 1.3, 0.2], [-0.5, 1.1, 0.4], [0.3, 1.6, -0.4]]) add(g, ball(0.06, 5), '#f2c14e', x, y, z, { sv: [1.4, 1, 1], name: 'bee' });
    for (const [x, z] of [[-0.6, -0.4], [0.6, -0.5], [0.5, 0.6]]) add(g, ball(0.12, 6), '#e2577a', x, 0.12, z, { name: 'flower' });
  },
  spring_cannon(g, ch) {
    add(g, cyl(0.6, 0.7, 0.25, 10), C.darkStone, 0, 0.12, 0, { name: 'base' });
    for (let k = 0; k < 5; k++) add(g, torus(0.28, 0.05, 10), C.iron, 0, 0.32 + k * 0.1, 0, { rx: Math.PI / 2, metal: 0.4, name: 'spring' });
    add(g, cyl(0.24, 0.3, 1.1, 12), ch.color, 0, 1.05, 0.1, { rx: -0.6, metal: 0.4, rough: 0.4, name: 'barrel' });
    add(g, torus(0.24, 0.05, 12), C.brass, 0, 1.38, -0.12, { rx: -0.6 + Math.PI / 2, name: 'muzzle' });
    for (const [x, z] of [[0.6, 0.5], [0.75, 0.3], [0.68, 0.7]]) add(g, ball(0.12, 7), '#3a3a3a', x, 0.12, z, { name: 'shot' });
  },
  flame_spout(g) {
    add(g, cyl(0.6, 0.72, 0.3, 8), C.darkStone, 0, 0.15, 0, { name: 'base' });
    add(g, cyl(0.25, 0.32, 1.2, 8), '#6b5a52', 0, 0.9, 0, { name: 'spout' });
    add(g, cyl(0.36, 0.25, 0.25, 8), '#4a3c36', 0, 1.6, 0, { name: 'nozzle' });
    flame(g, 0, 1.72, 0, 1.8);
    add(g, cyl(0.12, 0.12, 0.7, 6), C.copper, 0.45, 0.45, 0, { rz: 0.4, name: 'fuel-pipe' });
  },
  smithy(g, ch) {
    roofed(g, 1.2, 1.0, 0.8, C.stone, ch.color);
    add(g, box(0.5, 0.25, 0.25), C.iron, 0.55, 0.32, 0.7, { metal: 0.5, name: 'anvil' });
    add(g, box(0.25, 0.2, 0.2), C.darkStone, 0.55, 0.1, 0.7, { name: 'anvil-block' });
    add(g, box(0.4, 0.4, 0.4), '#5b4a42', -0.55, 0.2, 0.7, { name: 'forge' });
    add(g, box(0.26, 0.12, 0.05), C.fire, -0.55, 0.22, 0.91, { glow: C.fire, gi: 2, name: 'forge-glow' });
    add(g, box(0.18, 0.7, 0.18), C.darkStone, -0.4, 1.4, -0.2, { name: 'chimney' });
  },
  bakery(g, ch) {
    roofed(g, 1.2, 1.0, 0.75, C.cream, '#c98a4b');
    add(g, ball(0.42, 10), '#c7a07a', 0.62, 0.22, 0.55, { sv: [1, 0.75, 1], name: 'oven' });
    add(g, box(0.2, 0.16, 0.05), C.fire, 0.62, 0.2, 0.92, { glow: C.fire, gi: 1.8, name: 'oven-mouth' });
    for (const [x, z] of [[-0.55, 0.7], [-0.32, 0.75]]) add(g, ball(0.12, 7), '#d9a25a', x, 0.12, z, { sv: [1.5, 0.8, 1], name: 'loaf' });
    add(g, cyl(0.05, 0.05, 0.4, 5), C.darkStone, 0.35, 1.5, -0.2, { name: 'chimney' });
  },
  mushroom_ring(g) {
    add(g, cyl(0.85, 0.85, 0.06, 16), '#6e9b48', 0, 0.03, 0, { name: 'moss-bed' });
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, x = Math.sin(a) * 0.62, z = Math.cos(a) * 0.62, s = 0.8 + (k % 3) * 0.2;
      add(g, cyl(0.06 * s, 0.08 * s, 0.32 * s, 6), C.cream, x, 0.16 * s, z, { name: 'stem' });
      add(g, ball(0.18 * s, 8), k % 2 ? '#d6453a' : '#c9693a', x, 0.33 * s, z, { sv: [1, 0.55, 1], name: 'cap' });
    }
    add(g, cyl(0.12, 0.16, 0.6, 6), C.cream, 0, 0.3, 0, { name: 'stem' });
    add(g, ball(0.38, 10), '#d6453a', 0, 0.62, 0, { sv: [1, 0.55, 1], name: 'cap' });
    for (const [x, z] of [[0.15, 0.2], [-0.18, -0.05], [0.05, -0.22]]) add(g, ball(0.05, 5), C.white, x, 0.74, z, { name: 'spot' });
  },
  rain_pond(g) {
    add(g, cyl(0.85, 0.9, 0.12, 16), C.stone, 0, 0.06, 0, { name: 'rim' });
    add(g, cyl(0.72, 0.72, 0.14, 16), C.water, 0, 0.08, 0, { rough: 0.15, name: 'water' });
    for (const [x, z] of [[0.3, 0.2], [-0.25, -0.3]]) add(g, cyl(0.14, 0.14, 0.02, 8), C.leaf, x, 0.16, z, { name: 'lily-pad' });
    for (const [x, y] of [[-0.25, 1.6], [0.1, 1.72], [0.35, 1.58]]) add(g, ball(0.28, 8), C.white, x, y, 0, { name: 'cloud' });
    for (const x of [-0.25, 0.05, 0.3]) add(g, cyl(0.015, 0.015, 0.25, 4), '#9fd3f2', x, 1.15, 0.05, { name: 'raindrop' });
  },
  vault(g, ch) {
    add(g, box(1.3, 0.9, 1.1), C.darkStone, 0, 0.45, 0, { name: 'vault' });
    add(g, box(1.4, 0.15, 1.2), C.stone, 0, 0.97, 0, { name: 'lid' });
    add(g, cyl(0.36, 0.36, 0.08, 16), C.brass, 0, 0.48, 0.56, { rx: Math.PI / 2, metal: 0.5, rough: 0.35, name: 'round-door' });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; add(g, box(0.05, 0.22, 0.04), C.iron, Math.sin(a) * 0.14, 0.48 + Math.cos(a) * 0.14, 0.62, { rz: -a, name: 'spoke' }); }
    add(g, cyl(0.15, 0.15, 0.06, 12), C.gold, -0.4, 1.08, 0.2, { name: 'coin-stack' });
    add(g, cyl(0.15, 0.15, 0.06, 12), C.gold, -0.4, 1.14, 0.2, { name: 'coin-stack' });
  },
  oilworks(g, ch) {
    add(g, cyl(0.42, 0.42, 1.0, 12), C.copper, -0.3, 0.5, -0.2, { metal: 0.4, rough: 0.45, name: 'tank' });
    add(g, ball(0.42, 12), C.copper, -0.3, 1.0, -0.2, { sv: [1, 0.4, 1], metal: 0.4, name: 'tank-dome' });
    add(g, cyl(0.07, 0.07, 1.0, 6), C.teal, 0.25, 1.0, -0.2, { rz: Math.PI / 2, name: 'pipe' });
    add(g, cyl(0.07, 0.07, 1.0, 6), C.teal, 0.72, 0.5, -0.2, { name: 'pipe' });
    for (const [x, z] of [[0.4, 0.5], [0.0, 0.62], [0.72, 0.25]]) add(g, cyl(0.17, 0.17, 0.42, 10), '#4a3c36', x, 0.21, z, { name: 'barrel' });
    add(g, torus(0.2, 0.04, 12), C.brass, 0.25, 1.28, 0.2, { name: 'gear' });
  },
  lucky_penny(g) {
    add(g, cyl(0.62, 0.62, 0.12, 24), C.gold, 0, 0.9, 0, { rx: Math.PI / 2, metal: 0.6, rough: 0.3, name: 'penny' });
    add(g, torus(0.5, 0.04, 24), '#c8962e', 0, 0.9, 0.07, { name: 'penny-rim' });
    add(g, box(0.1, 0.5, 0.04), '#c8962e', 0, 0.9, 0.08, { name: 'mark' });
    add(g, ball(0.1, 5), C.leaf, 0.3, 1.25, 0.1, { name: 'clover' });
  },
  cinderlings() {}, ash_knights() {},
  kiln(g) {
    add(g, ball(0.75, 12), '#b0644a', 0, 0.2, 0, { sv: [1, 1.1, 1], name: 'kiln-dome' });
    add(g, box(0.4, 0.36, 0.2), '#2b1a14', 0, 0.3, 0.68, { name: 'kiln-mouth' });
    add(g, box(0.3, 0.24, 0.05), C.fire, 0, 0.28, 0.78, { glow: C.fire, gi: 2.2, name: 'kiln-glow' });
    add(g, cyl(0.12, 0.16, 0.6, 8), '#8a4a36', 0.25, 1.1, -0.2, { name: 'flue' });
    flame(g, 0.25, 1.38, -0.2, 0.8);
  },
  ember_shrine(g) {
    add(g, box(0.9, 0.2, 0.9), C.darkStone, 0, 0.1, 0, { name: 'step' });
    add(g, cyl(0.12, 0.3, 1.5, 4), '#5b4a42', 0, 0.95, 0, { ry: Math.PI / 4, name: 'obelisk' });
    add(g, ball(0.22, 8), C.fire, 0, 1.92, 0, { glow: C.fire, gi: 2.4, name: 'ember' });
    for (const a of [0, 2.1, 4.2]) add(g, ball(0.06, 5), C.fire2, Math.sin(a) * 0.45, 1.5, Math.cos(a) * 0.45, { glow: C.fire2, gi: 2, name: 'spark' });
  },
  spark(g) {
    add(g, new THREE.OctahedronGeometry(0.5, 0), C.fire, 0, 0.95, 0, { glow: C.fire, gi: 1.8, sv: [0.7, 1.3, 0.7], name: 'spark-crystal' });
    add(g, new THREE.OctahedronGeometry(0.22, 0), C.fire2, 0.42, 0.5, 0.1, { glow: C.fire2, gi: 2, name: 'spark-shard' });
    add(g, new THREE.OctahedronGeometry(0.16, 0), C.fire2, -0.4, 0.6, -0.1, { glow: C.fire2, gi: 2, name: 'spark-shard' });
  },
  ballista(g, ch) {
    add(g, box(1.2, 0.3, 1.2), C.darkStone, 0, 0.15, 0, { name: 'platform' });
    add(g, cyl(0.15, 0.2, 0.5, 6), C.darkWood, 0, 0.55, 0, { name: 'pivot' });
    add(g, box(0.22, 0.18, 1.5), C.wood, 0, 0.88, 0, { rx: -0.15, name: 'stock' });
    add(g, box(1.5, 0.12, 0.14), C.darkWood, 0, 0.95, -0.45, { name: 'bow' });
    add(g, cyl(0.03, 0.03, 1.6, 4), C.iron, 0, 1.0, 0, { rx: Math.PI / 2 - 0.15, name: 'bolt' });
    add(g, cone(0.07, 0.2, 4), C.iron, 0, 1.12, -0.82, { rx: -Math.PI / 2 - 0.15, name: 'bolt-head' });
  },
  quarry(g) {
    add(g, cyl(0.85, 0.9, 0.08, 10), '#a99a86', 0, 0.04, 0, { name: 'gravel' });
    for (const [x, y, z, s] of [[-0.35, 0.25, -0.2, 0.5], [0.3, 0.2, -0.35, 0.4], [-0.05, 0.62, -0.3, 0.32]]) add(g, new THREE.DodecahedronGeometry(s, 0), C.stone, x, y, z, { name: 'boulder' });
    for (const [x, z] of [[0.45, 0.4], [0.1, 0.5]]) add(g, box(0.36, 0.26, 0.26), '#d0c7b8', x, 0.13, z, { name: 'cut-block' });
    add(g, box(0.06, 0.7, 0.06), C.darkWood, -0.5, 0.4, 0.45, { rz: 0.5, name: 'pick-handle' });
    add(g, box(0.45, 0.08, 0.08), C.iron, -0.66, 0.72, 0.45, { rz: 0.5, name: 'pick-head' });
  },
  rampart(g) {
    add(g, box(1.8, 0.75, 0.55), C.stone, 0, 0.38, -0.2, { name: 'wall' });
    for (let k = 0; k < 4; k++) add(g, box(0.28, 0.22, 0.55), C.stone, -0.75 + k * 0.5, 0.86, -0.2, { name: 'merlon' });
    add(g, box(0.5, 1.2, 0.6), C.darkStone, -0.9, 0.6, -0.2, { name: 'end-tower' });
    add(g, box(0.5, 1.2, 0.6), C.darkStone, 0.9, 0.6, -0.2, { name: 'end-tower' });
    add(g, ball(0.25, 6), C.moss, 0.3, 0.78, 0.08, { sv: [1.4, 0.4, 0.5], name: 'moss' });
  },
  masonry(g) {
    add(g, box(0.9, 0.35, 0.45), '#d0c7b8', 0, 0.3, 0, { name: 'brick' });
    add(g, box(0.9, 0.35, 0.45), '#bfb5a4', 0.25, 0.66, 0, { name: 'brick' });
    add(g, box(0.1, 1.1, 0.1), C.darkWood, -0.35, 1.1, 0.3, { rz: -0.6, name: 'hammer-handle' });
    add(g, box(0.5, 0.26, 0.26), C.iron, -0.02, 1.55, 0.3, { rz: -0.6, metal: 0.4, name: 'hammer-head' });
  },
  overgrowth(g) {
    add(g, cyl(0.32, 0.38, 0.4, 8), '#b0644a', 0, 0.2, 0, { name: 'pot' });
    for (let k = 0; k < 6; k++) { const a = k * 1.1; add(g, cyl(0.03, 0.04, 0.9 + k * 0.08, 5), C.darkLeaf, Math.sin(a) * 0.12, 0.8, Math.cos(a) * 0.12, { rx: Math.cos(a) * 0.4, rz: -Math.sin(a) * 0.4, name: 'vine' }); }
    for (let k = 0; k < 7; k++) { const a = k * 0.9; add(g, ball(0.17, 6), k % 2 ? C.leaf : C.darkLeaf, Math.sin(a) * 0.38, 1.0 + (k % 3) * 0.22, Math.cos(a) * 0.38, { sv: [1, 0.6, 1.4], name: 'leaf' }); }
    add(g, ball(0.1, 6), '#e2577a', 0.15, 1.5, 0.2, { name: 'bloom' });
  },
  brass_banner(g, ch) {
    add(g, cyl(0.04, 0.04, 2.0, 6), C.brass, 0, 1.0, 0, { metal: 0.5, name: 'pole' });
    add(g, ball(0.08, 6), C.gold, 0, 2.04, 0, { name: 'finial' });
    add(g, box(0.9, 0.08, 0.06), C.brass, 0.4, 1.86, 0, { name: 'crossbar' });
    add(g, box(0.8, 1.0, 0.03), ch.color, 0.4, 1.32, 0, { name: 'cloth' });
    add(g, cone(0.4, 0.3, 3), ch.color, 0.4, 0.68, 0, { rx: Math.PI, sv: [1, 1, 0.08], name: 'cloth-tail' });
    add(g, ball(0.16, 8), C.gold, 0.4, 1.35, 0.03, { sv: [1, 1, 0.3], name: 'emblem' });
  },
  wayshrine(g) {
    add(g, box(1.0, 0.2, 1.0), C.stone, 0, 0.1, 0, { name: 'step' });
    for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) add(g, cyl(0.07, 0.08, 1.0, 6), C.white, x, 0.7, z, { name: 'column' });
    add(g, cone(0.75, 0.45, 4), '#7b5bd6', 0, 1.42, 0, { ry: Math.PI / 4, name: 'roof' });
    add(g, new THREE.OctahedronGeometry(0.18, 0), '#b9a4ff', 0, 0.7, 0, { glow: '#9d84ff', gi: 2, name: 'crystal' });
  },
  storm_bell(g) {
    add(g, box(1.1, 0.2, 0.6), C.darkStone, 0, 0.1, 0, { name: 'base' });
    add(g, box(0.14, 1.6, 0.14), C.stone, -0.45, 0.9, 0, { name: 'arch-post' });
    add(g, box(0.14, 1.6, 0.14), C.stone, 0.45, 0.9, 0, { name: 'arch-post' });
    add(g, box(1.1, 0.16, 0.2), C.stone, 0, 1.75, 0, { name: 'arch-beam' });
    add(g, cyl(0.12, 0.34, 0.5, 12), C.brass, 0, 1.38, 0, { metal: 0.6, rough: 0.3, name: 'bell' });
    add(g, new THREE.OctahedronGeometry(0.1, 0), '#9fe3ff', 0, 1.05, 0, { glow: '#7fd6ff', gi: 2.5, name: 'spark' });
  },
};

export function cardModel(id) {
  const card = CARDS[id], g = new THREE.Group();
  g.name = id;
  const ch = champById(card.champ) || { color: '#8a6bd6', accent: '#f2c14e' };
  if (card.type === 'troop') {
    troopCamp(g, card, ch.color, ch.accent);
    if (id === 'mercenaries') add(g, cyl(0.18, 0.18, 0.12, 12), C.gold, 0.55, 0.12, 0.55, { name: 'coin-pile' });
  } else if (BUILDERS[id]) BUILDERS[id](g, ch);
  return g;
}

// Small markers that sit over a plot to show charms on it.
export function charmMarker(key) {
  const g = new THREE.Group();
  if (key === 'hp') { add(g, box(0.24, 0.3, 0.02), '#d9a441', 0, 0, 0, { glow: '#d9a441', gi: 0.4, name: 'charm-banner' }); }
  else if (key === 'dmg') add(g, new THREE.OctahedronGeometry(0.15, 0), C.fire, 0, 0, 0, { glow: C.fire, gi: 1.5, name: 'charm-spark' });
  else add(g, cyl(0.14, 0.14, 0.04, 14), C.gold, 0, 0, 0, { rx: Math.PI / 2, glow: C.gold, gi: 0.4, name: 'charm-penny' });
  return g;
}
