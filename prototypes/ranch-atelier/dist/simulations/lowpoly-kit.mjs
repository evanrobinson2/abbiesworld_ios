// Low-poly hero kit (AW-STUDY-0032): the small shared pieces the school jump's people, dog and buildings are built from,
// so the next minigame composes them instead of retyping boxes.
//   loft(T, stations)      a smooth body along a centre line (dog torsos, necks, heads, a kid's torso)
//   limb(T, mat, r0, r1)   a unit segment you stretch between two points with bone()
//   ik2(...)               two-bone reach: shoulder, elbow, hand (or hip, knee, foot)
//   worldUV(T, geo, size)     box-projected UVs in metres, so brick and gravel line up across every wall
//   canvasTex(...)         a canvas texture with repeat and colour space set
// All of it is world layer: no labels, no helpers.

const _a = {}, tmp = T => _a.v || (_a.v = new T.Vector3());

// stations: [{x, y, ry, rz}] in the x-y plane (z is the side axis). ry is the radius in that plane across the centre line,
// rz the half-width. Ends close with a fan. Optional seg (around), and per-station z offset.
export function loft(T, stations, {seg = 10, closeStart = true, closeEnd = true} = {}) {
 const pos = [], idx = [], side = new T.Vector3(0, 0, 1), c = new T.Vector3(), t = new T.Vector3(), u = new T.Vector3();
 const n = stations.length;
 stations.forEach((s, i) => {
  const a = stations[Math.max(0, i - 1)], b = stations[Math.min(n - 1, i + 1)];
  t.set(b.x - a.x, b.y - a.y, 0).normalize(); u.crossVectors(side, t).normalize();
  c.set(s.x, s.y, s.z || 0);
  for (let k = 0; k < seg; k++) {
   const ang = k / seg * Math.PI * 2, cy = Math.cos(ang), sz = Math.sin(ang);
   pos.push(c.x + u.x * s.ry * cy, c.y + u.y * s.ry * cy, c.z + s.rz * sz);
  }
 });
 for (let i = 0; i < n - 1; i++) for (let k = 0; k < seg; k++) {
  const a = i * seg + k, b = i * seg + (k + 1) % seg, cc = a + seg, d = b + seg;
  idx.push(a, cc, b, b, cc, d);
 }
 const cap = (i, flip) => { const s = stations[i], ci = pos.length / 3; pos.push(s.x, s.y, s.z || 0);
  for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg; flip ? idx.push(ci, a, b) : idx.push(ci, b, a); } };
 if (closeStart) cap(0, true); if (closeEnd) cap(n - 1, false);
 const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
 return g;
}

// A unit-length tapered segment along +y (0 to 1). Put it between two points with bone(); thickness never stretches.
export function limb(T, mat, r0, r1, seg = 8, name = 'limb') {
 const g = new T.CylinderGeometry(r1, r0, 1, seg, 1).translate(0, .5, 0);
 const m = new T.Mesh(g, mat); m.name = name; m.castShadow = true; return m;
}
export function bone(T, mesh, a, b) {
 const v = tmp(T).subVectors(b, a), L = v.length();
 mesh.position.copy(a); if (L < 1e-5) return; mesh.quaternion.setFromUnitVectors(Y(T), v.multiplyScalar(1 / L)); mesh.scale.set(1, L, 1);
}
const Y = T => _a.y || (_a.y = new T.Vector3(0, 1, 0));

// Two-bone reach. root and target are points in one space; pole is a direction the middle joint bends toward.
// Returns {joint, end} (new vectors). The end stops short when the target is out of reach, so limbs never stretch.
export function ik2(T, root, target, a, b, pole) {
 const dir = new T.Vector3().subVectors(target, root); let d = dir.length();
 if (d < 1e-4) dir.set(0, -1, 0), d = 1e-4; dir.multiplyScalar(1 / d);
 d = Math.min(d, a + b - 1e-4); d = Math.max(d, Math.abs(a - b) + 1e-4);
 const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
 const perp = pole.clone().addScaledVector(dir, -pole.dot(dir)); if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1); perp.normalize();
 const joint = root.clone().addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA);
 return {joint, end: root.clone().addScaledVector(dir, d)};
}

// Box-projected UVs in metres for geometry already in world space: walls get (along, up), floors get (x, z).
export function worldUV(T, geo, size = 1, sizeY = size) {
 const p = geo.attributes.position, n = geo.attributes.normal, uv = new Float32Array(p.count * 2);
 for (let i = 0; i < p.count; i++) {
  const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
  let u, v; if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
  uv[i * 2] = u / size; uv[i * 2 + 1] = v / sizeY;
 }
 geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
 return geo;
}

export function canvasTex(T, w, h, draw, {repeat = null, srgb = true, nearest = false} = {}) {
 const c = Object.assign(document.createElement('canvas'), {width: w, height: h}), g = c.getContext('2d'); draw(g, w, h);
 const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.colorSpace = T.SRGBColorSpace;
 if (repeat) t.repeat.set(...repeat); t.anisotropy = 4; if (nearest) t.magFilter = T.NearestFilter; return t;
}

// A seeded random, so every build of a model is the same model.
export function seeded(seed = 7) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// Height canvas to normal map (sobel), for mortar lines, gravel and shingles.
export function normalFromHeight(T, hc, strength = 2) {
 const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data;
 const c = Object.assign(document.createElement('canvas'), {width: w, height: h}), g = c.getContext('2d'), out = g.createImageData(w, h);
 const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
 for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
  out.data[i] = (-dx / l * .5 + .5) * 255; out.data[i + 1] = (dy / l * .5 + .5) * 255; out.data[i + 2] = (1 / l * .5 + .5) * 255; out.data[i + 3] = 255;
 }
 g.putImageData(out, 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
}
