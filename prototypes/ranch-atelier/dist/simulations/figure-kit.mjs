// AW-STUDY-0034, Low-Poly Figure Fidelity: the shared kit for hero-level low-poly figures.
// Why: the memory-place figures were stacks of spheres, boxes and cylinders, flat shaded, with no UVs and one colour
// each, so the storybook look (soft wrap light, rim, skin that glows where it is thin) had nothing to work with: every
// primitive lit as its own lump, seams showed, and the pixel pass turned the facets into noise. Here a figure is a
// few lofted surfaces (rings along a path, like a sculptor's armature), skinned to bones so joints bend without gaps,
// with welded normals that keep a chosen amount of facet, UVs in metres for real cloth, hair and rubber, a per-vertex
// "thin" value (ears, nose, fingers) for the skin glow, and one material per role, named for what it is.
//
// const B = figureBuilder(T, bones);                       // bones: {name: T.Bone} already in their bind pose
// B.loft('skin', [{p: [x, y, z], r: [rx, rz], b: 'shin.L'}, ...], {n: 8, cap1: true});
// const meshes = B.build({skin: material, ...});            // one SkinnedMesh per role, bound to the bones
// storybookLook(T, material, {skin: 1})                     // rim and skin glow on any MeshStandardMaterial

const TAU = Math.PI * 2;

// Bones from a flat spec [[name, parent, x, y, z], ...] in figure space (absolute bind positions). Every bone starts
// with no rotation, so its local axes match the figure's: thigh.rotation.x swings a leg, as the old hip pivots did.
export function skeleton(T, spec) {
 const bones = {}, abs = {}, list = [];
 for (const [name, parent, x, y, z] of spec) {
  const b = new T.Bone(); b.name = name; abs[name] = [x, y, z];
  if (parent) { const a = abs[parent]; b.position.set(x - a[0], y - a[1], z - a[2]); bones[parent].add(b); } else b.position.set(x, y, z);
  bones[name] = b; list.push(b);
 }
 return {bones, list, root: list[0]};
}

export function figureBuilder(T, bones) {
 const names = Object.keys(bones), index = Object.fromEntries(names.map((n, i) => [n, i]));
 const root = Object.values(bones).find(b => !(b.parent && b.parent.isBone));
 root.updateWorldMatrix(true, true);
 const parts = [];
 const at = name => { const v = new T.Vector3(); bones[name].getWorldPosition(v); return [v.x, v.y, v.z]; };
 const weights = b => {
  // 'bone' | [['a', .6], ['b', .4]] -> four indices and weights
  const list = typeof b === 'string' ? [[b, 1]] : b, idx = [0, 0, 0, 0], w = [0, 0, 0, 0];
  let sum = 0; list.slice(0, 4).forEach(([n, x], k) => { if (!(n in index)) throw new Error('figure-kit: no bone ' + n); idx[k] = index[n]; w[k] = x; sum += x; });
  return {idx, w: w.map(x => x / (sum || 1))};
 };
 const V = (a) => new T.Vector3(a[0], a[1], a[2]);

 // A lofted surface: rings along a path. Each ring is {p, r: [rx, rz], k (2 = ellipse, higher is boxier), b (bone or
 // blend), s (optional (theta) => [sx, sz, dy] shaping), glow (0..1, how thin)}. rx runs across the path, rz along the
 // reference axis (default +Z, the figure's front; +Y for things that lie along the ground, like a dog or a shoe).
 // Caps close an end with a rounded tip that follows the path on. uv is in metres, so cloth textures keep their scale.
 function loft(role, rings, o = {}) {
  const n = o.n || 8, facet = o.facet ?? 0, ref = V(o.ref || [0, 0, 1]), rot = o.rot || 0;
  const R = rings.map(g => ({...g, p: V(g.p), r: Array.isArray(g.r) ? g.r : [g.r, g.r]}));
  const cap = (end) => {
   const a = end ? R[R.length - 1] : R[0], b = end ? R[R.length - 2] : R[1], t = a.p.clone().sub(b.p).normalize();
   const len = (o.capLen ?? .6) * Math.min(a.r[0], a.r[1]);
   const mid = {...a, p: a.p.clone().addScaledVector(t, len * .62), r: [a.r[0] * .74, a.r[1] * .74]};
   const tip = {...a, p: a.p.clone().addScaledVector(t, len), r: [0, 0]};
   return end ? [mid, tip] : [tip, mid];
  };
  const all = [...(o.cap0 ? cap(false) : []), ...R, ...(o.cap1 ? cap(true) : [])];
  const pos = [], uv = [], si = [], sw = [], thin = [], ring = [];
  let prevA = null, vLen = 0, circ = 0;
  for (const g of all) circ += Math.PI * (g.r[0] + g.r[1]); circ /= all.length;
  all.forEach((g, i) => {
   const p0 = all[Math.max(0, i - 1)].p, p1 = all[Math.min(all.length - 1, i + 1)].p, t = p1.clone().sub(p0).normalize();
   let a = ref.clone().addScaledVector(t, -ref.dot(t));
   if (a.lengthSq() < 1e-6) a = prevA ? prevA.clone() : new T.Vector3(1, 0, 0); a.normalize(); prevA = a;
   const side = new T.Vector3().crossVectors(t, a), e = 2 / (g.k || 2);
   if (i) vLen += g.p.distanceTo(all[i - 1].p);
   const {idx, w} = weights(g.b || o.b);
   const th = g.glow ?? o.glow ?? Math.max(0, Math.min(1, 1 - Math.min(g.r[0], g.r[1]) / (o.thinR || .035)));
   for (let j = 0; j <= n; j++) {
    const q = TAU * j / n + rot, c = Math.cos(q), s = Math.sin(q);
    const sh = g.s ? g.s(q % TAU) : [1, 1, 0];
    const x = Math.sign(c) * Math.abs(c) ** e * g.r[0] * sh[0], z = Math.sign(s) * Math.abs(s) ** e * g.r[1] * sh[1];
    const v = g.p.clone().addScaledVector(side, x).addScaledVector(a, z); v.y += sh[2] || 0;
    pos.push(v.x, v.y, v.z); uv.push(circ * j / n, vLen); si.push(...idx); sw.push(...w); thin.push(th);
   }
   ring.push(g.p);
  });
  // triangles; flip the winding once if the first real quad faces inwards
  const idx = [], W = n + 1, rows = all.length;
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < n; j++) { const a = i * W + j, b = a + W; idx.push(a, b, b + 1, a, b + 1, a + 1); }
  // vote over every quad: does its normal point away from the path?
  const P = k => V(pos.slice(k * 3, k * 3 + 3)); let vote = 0;
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < n; j++) {
   const A = i * W + j, nrm = new T.Vector3().crossVectors(P(A + W).sub(P(A)), P(A + W + 1).sub(P(A)));
   if (nrm.lengthSq() > 1e-16) vote += Math.sign(nrm.dot(P(A).add(P(A + W + 1)).multiplyScalar(.5).sub(ring[i].clone().add(ring[i + 1]).multiplyScalar(.5))));
  }
  if (vote < 0) for (let k = 0; k < idx.length; k += 3) { const x = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = x; }
  const part = {role, pos, uv, si, sw, thin, idx, facet, color: o.color || null, name: o.name || role};
  if (o.euler) { // turn a rigid bit about its own centre
   const e = new T.Euler(...o.euler), c = o.pivot ? V(o.pivot) : rings.reduce((s, g) => s.add(V(g.p)), new T.Vector3()).multiplyScalar(1 / rings.length), v = new T.Vector3();
   for (let k = 0; k < pos.length; k += 3) { v.set(pos[k], pos[k + 1], pos[k + 2]).sub(c).applyEuler(e).add(c); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z; }
  }
  parts.push(part); return part;
 }

 // An ellipsoid (eyes, noses, paws, ears): a loft of rings stacked along its local Y.
 function blob(role, c, r, b, o = {}) {
  const rows = o.rows || 6, rings = [];
  for (let i = 1; i < rows; i++) { const a = Math.PI * i / rows, y = -Math.cos(a) * r[1]; rings.push({p: [c[0], c[1] + y, c[2]], r: [Math.sin(a) * r[0], Math.sin(a) * r[2]], b, glow: o.glow}); }
  return loft(role, rings, {n: o.n || 10, ref: [0, 0, 1], cap0: true, cap1: true, capLen: o.capLen ?? 1.0, facet: o.facet, euler: o.euler, pivot: c, color: o.color, name: o.name, glow: o.glow});
 }

 // A lock or tube along a curve (hair locks, tails, ears, brows): radii taper from r0 to r1 along the points.
 function lock(role, pts, r0, r1, b, o = {}) {
  const k = pts.length - 1, rings = pts.map((p, i) => { const t = i / k, r = r0 + (r1 - r0) * t; return {p, r: Array.isArray(r0) ? [r0[0] + (r1[0] - r0[0]) * t, r0[1] + (r1[1] - r0[1]) * t] : [r, r], b: Array.isArray(b) && typeof b[0] === 'string' ? b[Math.min(b.length - 1, Math.round(t * (b.length - 1)))] : b}; });
  return loft(role, rings, {n: o.n || 6, cap0: o.cap0 ?? true, cap1: o.cap1 ?? true, ref: o.ref, facet: o.facet, glow: o.glow, capLen: o.capLen, name: o.name, color: o.color, k: o.k});
 }

 // Paint a soft colour patch onto parts of a role (blush on cheeks, a chest blaze): vertex colours, no extra geometry.
 function paint(role, centre, radius, hex) {
  const c = new T.Color(hex), p = V(centre);
  for (const part of parts) if (part.role === role) {
   part.paint ||= []; part.paint.push({p, radius, c});
  }
 }

 function build(materials, {crease = 50} = {}) {
  const roles = [...new Set(parts.map(p => p.role))], out = {}, cosC = Math.cos(crease * Math.PI / 180);
  const sk = new T.Skeleton(names.map(n => bones[n]));
  for (const role of roles) {
   const list = parts.filter(p => p.role === role);
   // expand to triangles (each corner its own vertex), then weld normals by position within the crease angle
   const P = [], U = [], SI = [], SW = [], TH = [], C = [], F = [], FN = [];
   const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), col = new T.Color();
   for (const part of list) {
    for (let k = 0; k < part.idx.length; k += 3) {
     const tri = [part.idx[k], part.idx[k + 1], part.idx[k + 2]];
     a.fromArray(part.pos, tri[0] * 3); b.fromArray(part.pos, tri[1] * 3); c.fromArray(part.pos, tri[2] * 3);
     const fn = new T.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)); // area-weighted
     for (const v of tri) {
      P.push(part.pos[v * 3], part.pos[v * 3 + 1], part.pos[v * 3 + 2]); U.push(part.uv[v * 2], part.uv[v * 2 + 1]);
      for (let q = 0; q < 4; q++) { SI.push(part.si[v * 4 + q]); SW.push(part.sw[v * 4 + q]); }
      TH.push(part.thin[v]); F.push(part.facet); FN.push(fn);
      col.set(part.color || '#ffffff');
      if (part.paint) for (const s of part.paint) { const d = a.fromArray(part.pos, v * 3).distanceTo(s.p); if (d < s.radius) col.lerp(s.c, (1 - d / s.radius) ** 1.5); }
      C.push(col.r, col.g, col.b);
     }
    }
   }
   const count = P.length / 3, key = i => `${Math.round(P[i * 3] * 2e4)},${Math.round(P[i * 3 + 1] * 2e4)},${Math.round(P[i * 3 + 2] * 2e4)}`;
   const groups = new Map(); for (let i = 0; i < count; i++) { const k = key(i); groups.has(k) ? groups.get(k).push(i) : groups.set(k, [i]); }
   const N = new Float32Array(count * 3), s = new T.Vector3(), mine = new T.Vector3(), other = new T.Vector3();
   for (const g of groups.values()) for (const i of g) {
    mine.copy(FN[i]).normalize(); s.set(0, 0, 0);
    for (const j of g) { other.copy(FN[j]).normalize(); if (other.dot(mine) >= cosC) s.add(FN[j]); }
    if (s.lengthSq() < 1e-20) s.copy(mine); s.normalize();
    if (F[i] > 0 && mine.lengthSq() > 0) s.lerp(mine, F[i]).normalize();
    N[i * 3] = s.x; N[i * 3 + 1] = s.y; N[i * 3 + 2] = s.z;
   }
   const g = new T.BufferGeometry();
   g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3));
   g.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
   g.setAttribute('skinIndex', new T.Uint16BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(SW, 4));
   g.setAttribute('thin', new T.Float32BufferAttribute(TH, 1));
   g.computeBoundingSphere();
   const mat = materials[role] || new T.MeshStandardMaterial({color: '#cccccc', name: role});
   mat.vertexColors = true;
   const m = new T.SkinnedMesh(g, mat); m.name = mat.name || role; m.castShadow = m.receiveShadow = true; m.frustumCulled = false;
   out[role] = m;
  }
  for (const m of Object.values(out)) { root.parent?.add(m); m.bind(sk, new T.Matrix4()); }
  return {meshes: out, skeleton: sk, triangles: Object.values(out).reduce((s, m) => s + m.geometry.attributes.position.count / 3, 0)};
 }
 return {loft, blob, lock, paint, build, at, bones, parts};
}

// ---------- Materials with real surface: UV textures drawn on a canvas (stripes, knit, hair strands, rubber). ----------
const texCache = new Map();
export function canvasTexture(T, key, size, draw, repeat = [1, 1]) {
 const id = key + repeat.join('x');
 if (texCache.has(id)) return texCache.get(id);
 const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), {width: size, height: size});
 draw(cv.getContext('2d'), size);
 const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4;
 texCache.set(id, t); return t;
}
const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
// stripes run round the body: period in metres along the part's length
export function stripes(T, a, b, period = .05, share = .5) {
 const t = canvasTexture(T, 'stripes' + a + b + share, 64, (g, s) => { g.fillStyle = a; g.fillRect(0, 0, s, s); g.fillStyle = b; g.fillRect(0, 0, s, s * share); }, [1, 1 / period]);
 t.colorSpace = T.SRGBColorSpace; return t;
}
export function knitBump(T, cell = .004) {
 return canvasTexture(T, 'knit', 64, (g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += 8) for (let x = 0; x < s; x += 8) { g.fillStyle = '#a4a4a4'; g.beginPath(); g.ellipse(x + 2, y + 4, 2, 3.4, .5, 0, TAU); g.ellipse(x + 6, y + 4, 2, 3.4, -.5, 0, TAU); g.fill(); }
 }, [1 / (cell * 8), 1 / (cell * 8)]);
}
export function denimBump(T) {
 return canvasTexture(T, 'denim', 64, (g, s) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s); g.strokeStyle = '#a8a8a8'; g.lineWidth = 2;
  for (let k = -s; k < s * 2; k += 5) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + s, s); g.stroke(); }
 }, [12, 12]);
}
export function strandBump(T) {
 return canvasTexture(T, 'strands', 128, (g, s) => {
  g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, s, s);
  for (let k = 0; k < 90; k++) { const x = rnd() * s, l = .5 + rnd() * .5; g.fillStyle = rnd() > .5 ? '#a9a9a9' : '#555'; g.fillRect(x, 0, 1 + rnd() * 1.5, s * l); g.fillRect(x, s * l, 1, s); }
 }, [6, 2]);
}
export function furBump(T) {
 return canvasTexture(T, 'fur', 128, (g, s) => {
  g.fillStyle = '#7f7f7f'; g.fillRect(0, 0, s, s);
  for (let k = 0; k < 900; k++) { const x = rnd() * s, y = rnd() * s; g.strokeStyle = rnd() > .5 ? '#9a9a9a' : '#606060'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y + 4 + rnd() * 3); g.stroke(); }
 }, [10, 10]);
}
export function rubberBump(T) {
 return canvasTexture(T, 'rubber', 32, (g, s) => { g.fillStyle = '#808080'; g.fillRect(0, 0, s, s); g.fillStyle = '#9a9a9a'; for (let y = 0; y < s; y += 4) g.fillRect(0, y, s, 1.5); }, [30, 30]);
}

// A role material: MeshStandardMaterial named for what it is, with its role and skin glow for the storybook look.
export function roleMaterial(T, name, o = {}) {
 const m = new T.MeshStandardMaterial({color: o.color || '#ffffff', roughness: o.roughness ?? .8, metalness: o.metalness ?? 0, name,
  map: o.map || null, bumpMap: o.bump || null, bumpScale: o.bumpScale ?? 1.2, emissive: o.emissive || '#000000', emissiveIntensity: o.emissiveIntensity ?? 1});
 m.userData = {role: o.role || name, skin: o.skin || 0, sheen: o.sheen || 0};
 return m;
}

// The storybook look on an ordinary MeshStandardMaterial (so it works on skinned figures, which the clay
// ShaderMaterial of AW-STUDY-0028 can't skin): a warm rim on the sun side, a red band where light meets shadow on
// skin, and light leaking through thin parts (ears, noses, fingers) when the sun is behind. `amount` 0 turns it off.
export function storybookLook(T, mat, o = {}) {
 const U = {uSkin: {value: o.skin ?? mat.userData?.skin ?? 0}, uRimAmt: {value: o.rim ?? 1}, uSheen: {value: o.sheen ?? mat.userData?.sheen ?? 0}, uLook: {value: o.amount ?? 1}, uRimCol: {value: new T.Color(o.rimColor || '#ffd08a')}};
 mat.userData.look = U;
 mat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, U);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float thin;\nvarying float vThin;')
   .replace('#include <begin_vertex>', '#include <begin_vertex>\nvThin = thin;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vThin;\nuniform float uSkin, uRimAmt, uSheen, uLook;\nuniform vec3 uRimCol;')
   .replace('#include <opaque_fragment>', `
 #if NUM_DIR_LIGHTS > 0
 {
  vec3 Ls = directionalLights[0].direction, Lc = directionalLights[0].color, Vv = normalize(vViewPosition);
  float nl = dot(normal, Ls), nv = max(dot(normal, Vv), 0.0);
  vec3 blood = vec3(1.0, .38, .26);
  float term = smoothstep(-.5, 0., nl) * (1. - smoothstep(0., .55, nl));
  outgoingLight += uLook * uSkin * diffuseColor.rgb * blood * Lc * term * .1;
  float back = pow(clamp(dot(-Vv, Ls), 0., 1.), 2.5) * (.25 + .75 * vThin);
  outgoingLight += uLook * uSkin * blood * Lc * back * vThin * .4;
  outgoingLight += uLook * uSkin * diffuseColor.rgb * blood * .015;
  float f = pow(1. - nv, 3.), side = smoothstep(-.4, .5, nl + .25);
  outgoingLight += uLook * uRimAmt * uRimCol * Lc * f * side * .22;
  outgoingLight += uLook * uSheen * diffuseColor.rgb * Lc * pow(1. - nv, 2.) * .35;
 }
 #endif
 #include <opaque_fragment>`);
 };
 mat.customProgramCacheKey = () => 'storybook' + (mat.userData.skin > 0 ? 's' : '');
 mat.needsUpdate = true; return mat;
}

// ---------- Two-bone IK: a (shoulder or hip) -> b (elbow or knee) -> c (wrist or ankle), reaching for a world point,
// bending towards a world pole. Works on any Object3D chain, bones or pivots.
const _A = {}, _q = {};
export function ik2(T, a, b, c, target, pole) {
 const v = k => (_A[k] ||= new T.Vector3()), q = k => (_q[k] ||= new T.Quaternion());
 const A = a.getWorldPosition(v('A')), B = b.getWorldPosition(v('B')), C = c.getWorldPosition(v('C'));
 const l1 = A.distanceTo(B), l2 = B.distanceTo(C), dir = v('d').copy(target).sub(A), d = Math.min(Math.max(dir.length(), 1e-4), (l1 + l2) * .999);
 dir.normalize();
 const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
 const pp = v('p').copy(pole).sub(A); pp.addScaledVector(dir, -pp.dot(dir)); if (pp.lengthSq() < 1e-8) pp.set(0, 0, 1); pp.normalize();
 const Bd = v('Bd').copy(A).addScaledVector(dir, l1 * cosA).addScaledVector(pp, l1 * sinA);
 const turn = (bone, from, to, pivot) => {
  const r = q('r').setFromUnitVectors(v('f').copy(from).sub(pivot).normalize(), v('t').copy(to).sub(pivot).normalize());
  const w = bone.getWorldQuaternion(q('w')), pw = bone.parent.getWorldQuaternion(q('pw'));
  bone.quaternion.copy(pw.invert().multiply(r.multiply(w))); bone.updateMatrixWorld(true);
 };
 turn(a, B, Bd, A);
 const B2 = b.getWorldPosition(v('B2')), C2 = c.getWorldPosition(v('C2')), Tg = v('Tg').copy(A).addScaledVector(dir, d);
 turn(b, C2, Tg, B2);
}
