// Papercraft construction grammar for three.js.
// A port of the rules in tools/paper-warrior/paper.py: the look comes from geometry (facets, folds,
// hems, shingled plates), never from a shader pretending to be paper.
//   facet(geo, crumple)    crumple shared vertices along their normal by a fraction of the local edge
//   tint(geo, amount)      give every flat facet its own slight shade, so folds read under any light
//   plate(w, h, fold)      a card with a centre fold and real thickness
//   strip(points, w)       a hemmed strip that follows a path (helmet ridges, belts, wagon hoops)
//   pleats(w, h, n, depth) a zig-zag sheet (cloaks, tunics, wagon covers, tents)
//   mat(color)             matte paper material, flat shaded, vertex-tinted
import * as THREE from "three";
import { mergeVertices } from "/vendor/utils/BufferGeometryUtils.js";

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const mats = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.92, metalness: 0, flatShading: true, vertexColors: true, side: THREE.DoubleSide, ...opts,
    }));
  }
  return mats.get(key);
}

function meanEdge(geo) {
  const p = geo.attributes.position, idx = geo.index;
  if (!idx) return 0.1;
  let sum = 0, n = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(p, idx.getX(i)); b.fromBufferAttribute(p, idx.getX(i + 1));
    sum += a.distanceTo(b); n++;
  }
  return n ? sum / n : 0.1;
}

export function facet(geo, crumple = 0.12, seed = 1) {
  geo.deleteAttribute("normal"); geo.deleteAttribute("uv");
  let g = mergeVertices(geo, 1e-4);
  g.computeVertexNormals();
  const L = meanEdge(g), r = rng(seed), p = g.attributes.position, nr = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const k = (r() - 0.5) * 2 * crumple * L;
    p.setXYZ(i, p.getX(i) + nr.getX(i) * k, p.getY(i) + nr.getY(i) * k, p.getZ(i) + nr.getZ(i) * k);
  }
  g = g.toNonIndexed();
  g.computeVertexNormals();
  return g;
}

export function tint(geo, amount = 0.08, seed = 2) {
  if (geo.index) geo = geo.toNonIndexed();
  const r = rng(seed), n = geo.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 3) {
    const v = 1 - amount + r() * amount * 2;
    for (let j = 0; j < 3 && i + j < n; j++) c.set([v, v, v * 0.99], (i + j) * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return geo;
}

export function paper(geo, color, { crumple = 0.1, shade = 0.08, seed = 1, ...opts } = {}) {
  const g = tint(crumple > 0 ? facet(geo, crumple, seed) : (geo.index ? geo.toNonIndexed() : geo), shade, seed + 7);
  if (crumple <= 0) g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(color, opts));
  m.castShadow = m.receiveShadow = true;
  return m;
}

// A card w x h with a fold along its long axis, lifted by `fold` (fraction of width), and `thick` paper.
export function plateGeo(w, h, fold = 0.15, thick = 0.006) {
  const f = w * fold, hw = w / 2, hh = h / 2, t = thick;
  const v = [
    [-hw, -hh, 0], [0, -hh, f], [hw, -hh, 0], [-hw, hh, 0], [0, hh, f], [hw, hh, 0],
  ];
  const pos = [];
  const quad = (a, b, c, d) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const off = (p, k) => [p[0], p[1], p[2] - k];
  quad(v[0], v[1], v[4], v[3]); quad(v[1], v[2], v[5], v[4]);
  quad(off(v[3], t), off(v[4], t), off(v[1], t), off(v[0], t)); quad(off(v[4], t), off(v[5], t), off(v[2], t), off(v[1], t));
  // hem edges
  for (const [a, b] of [[0, 1], [1, 2], [5, 4], [4, 3], [3, 0], [2, 5]]) quad(v[a], off(v[a], t), off(v[b], t), v[b]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
export function plate(w, h, color, fold = 0.15, opts = {}) {
  return paper(plateGeo(w, h, fold), color, { crumple: 0, ...opts });
}

// Hemmed strip that follows a list of points, width w, normal hint `up`.
export function strip(points, w, color, { up = new THREE.Vector3(0, 1, 0), thick = 0.01, ...opts } = {}) {
  const pos = [], half = w / 2;
  const side = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    side.push(new THREE.Vector3().crossVectors(t, up).normalize().multiplyScalar(half));
  }
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1], s0 = side[i], s1 = side[i + 1];
    const A = p0.clone().add(s0), B = p0.clone().sub(s0), C = p1.clone().sub(s1), D = p1.clone().add(s1);
    const lift = up.clone().multiplyScalar(thick);
    const q = (a, b, c, d) => pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...d.toArray());
    q(A.clone().add(lift), B.clone().add(lift), C.clone().add(lift), D.clone().add(lift));
    q(A, D, C, B);
    q(A, A.clone().add(lift), D.clone().add(lift), D);
    q(B, C, C.clone().add(lift), B.clone().add(lift));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return paper(g, color, { crumple: 0, ...opts });
}

// Zig-zag pleated sheet in the XY plane hanging down from y=0, width w, height h, n pleats.
export function pleatsGeo(w, h, n = 8, depth = 0.05, flare = 0) {
  const pos = [];
  const x = (i, y) => (-w / 2 + (w * i) / n) * (1 + flare * (-y / h));
  for (let i = 0; i < n; i++) {
    const z0 = i % 2 ? depth : 0, z1 = i % 2 ? 0 : depth;
    const a = [x(i, 0), 0, z0], b = [x(i + 1, 0), 0, z1], c = [x(i + 1, -h), -h, z1 * 1.4], d = [x(i, -h), -h, z0 * 1.4];
    pos.push(...a, ...d, ...c, ...a, ...c, ...b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
}
export function pleats(w, h, color, n = 8, depth = 0.05, flare = 0, opts = {}) {
  return paper(pleatsGeo(w, h, n, depth, flare), color, { crumple: 0, ...opts });
}

// Low-poly tapered prism (limbs, posts, logs).
export function prism(rTop, rBot, h, color, sides = 6, opts = {}) {
  return paper(new THREE.CylinderGeometry(rTop, rBot, h, sides, 1), color, { crumple: 0.05, ...opts });
}
export function block(w, h, d, color, opts = {}) {
  return paper(new THREE.BoxGeometry(w, h, d, 2, 2, 2), color, { crumple: 0.06, ...opts });
}

// Ink creases: thin dark lines on the hard folds, the way printed papercraft shows its scores.
export function creases(mesh, angle = 28, color = 0x2a2420, opacity = 0.35) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, angle),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  mesh.add(e);
  return mesh;
}
