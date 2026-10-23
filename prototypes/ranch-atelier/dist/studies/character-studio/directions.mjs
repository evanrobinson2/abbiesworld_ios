// AW-STUDY-0037 Character Studio: four art directions for the same rig and the same 50 moves.
//   DIRECTIONS                         the four, plus "studio" (the wood or Meshy paint as built)
//   dress(T, actor, id, frame)         restyles one actor (frame: shared {value} drawing counter); returns
//                                      {update(camera, drawing), undress(), fps, stage}
// A direction is more than a material: it sets how many drawings a second the move gets (clay is shot on twos),
// what the stage looks like, and what the body is made of (the stick man has no body, only its bones).
//   clay      Whimsical claymation: bright plasticine, thumbprints, "boiling" surface, googly eyes, 12 drawings a second
//   village   Plasticine village (the Aardman look): muted knitwear and corduroy colours, deeper thumbprints, big
//             eyes under a heavy brow, warm lamp light, 12 a second
//   stick     Stick man: ink bones on paper, a round head, every drawing a little different (line boil), 12 a second
//   comic     1980s cartoon action / hero shooter: hard two-tone cel, thick ink, saturated suit colours, strong rim
export const DIRECTIONS = [
 {id: 'studio', name: 'As built', short: 'As built'},
 {id: 'clay', name: 'Claymation', short: 'Clay'},
 {id: 'village', name: 'Plasticine village', short: 'Village'},
 {id: 'stick', name: 'Stick man', short: 'Stick'},
 {id: 'comic', name: '80s action cartoon', short: '80s action'},
];

// part -> colour, by direction (mannequin part names; skinned bodies take the 'body' colour)
const PALETTES = {
 clay: {torso: '#ff7aa8', pelvis: '#6f5bd6', arm: '#ffc94a', leg: '#4fc6b8', head: '#ffd9b3', joint: '#ff9a5c', foot: '#6f5bd6', hand: '#ffd9b3', body: '#ffb08a'},
 village: {torso: '#3f7a4e', pelvis: '#7a5a3a', arm: '#3f7a4e', leg: '#7a5a3a', head: '#f0c4a0', joint: '#5f8f62', foot: '#3a2a22', hand: '#f0c4a0', body: '#d8a07a'},
 comic: {torso: '#1f4fd8', pelvis: '#d81f3a', arm: '#d81f3a', leg: '#1f4fd8', head: '#ffcc33', joint: '#ffcc33', foot: '#d81f3a', hand: '#ffcc33', body: '#e8a05a'},
};
const ROLE = n => /head|neck/.test(n) ? 'head' : /chest|abdomen|waist/.test(n) ? 'torso' : /pelvis|hip_/.test(n) ? 'pelvis'
 : /hand|wrist/.test(n) ? 'hand' : /foot|ankle/.test(n) ? 'foot' : /elbow|knee|shoulder/.test(n) ? 'joint'
 : /arm/.test(n) ? 'arm' : /thigh|shin/.test(n) ? 'leg' : 'body';

const STAGES = {
 studio: {sky: ['#f6d9b8', '#f3ecdf'], floor: '#e9cfae', rim: '#c98f6a', sun: '#fff1dc', sunI: 2.6, hemi: ['#dfe9ff', '#b9906a', 1.1], shadow: true},
 clay: {sky: ['#bfe8ff', '#fff3d6'], floor: '#9fd67a', rim: '#ff9a5c', sun: '#fff6e8', sunI: 2.4, hemi: ['#e8f4ff', '#c8a070', 1.3], shadow: true},
 village: {sky: ['#d9c7a6', '#efe4cc'], floor: '#b98d5e', rim: '#7a5a3a', sun: '#ffd9a0', sunI: 3, hemi: ['#f3e3c4', '#5a4030', .9], shadow: true},
 stick: {sky: ['#fbfaf6', '#fbfaf6'], floor: '#f4f1e8', rim: '#d8d2c2', sun: '#ffffff', sunI: 1.5, hemi: ['#ffffff', '#ffffff', 1.4], shadow: false},
 comic: {sky: ['#ffd23f', '#ff7a3d'], floor: '#2a2440', rim: '#ffd23f', sun: '#ffffff', sunI: 3.2, hemi: ['#9ad8ff', '#3a1f5a', 1], shadow: true},
};

// clay surface: thumbprint dents (3D value noise on the body's own surface) and boil (the surface shifts each drawing)
const NOISE = `
float cHash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
 return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
  mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }`;
function clayMaterial(T, color, U, {rough = .78, bump = .55, scale = 9} = {}) {
 const m = new T.MeshStandardMaterial({color, roughness: rough, metalness: 0});
 m.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, U, {uBump: {value: bump}, uScale: {value: scale}});
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vClayP;\nuniform float uBoil, uFrame, uScale;' + NOISE)
   .replace('#include <begin_vertex>', `#include <begin_vertex>
    vClayP = position * uScale * 3.;
    transformed += normal * uBoil * (cNoise(position * uScale * 1.5 + uFrame * 7.13) - .5);`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vClayP;\nuniform float uBump, uFrame;' + NOISE)
   .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
    { vec3 q = vClayP + uFrame * .0; float a = cNoise(q), b = cNoise(q * 2.3 + 11.), c = cNoise(q * .7 + 23.);
      float print = smoothstep(.55, .8, cNoise(q * .45 + 5.)); // thumbprint patches
      normal = normalize(normal + uBump * (vec3(a, b, c) - .5) * (.35 + print)); }`)
   .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (cNoise(vClayP * 3.) - .5) * .25, .3, 1.);');
 };
 m.customProgramCacheKey = () => 'clay';
 return m;
}

function celMaterial(T, color) {
 // two hard bands, a cool shadow and a hot rim: the cartoon look without post-processing
 const m = new T.MeshToonMaterial({color, gradientMap: celRamp(T)});
 m.onBeforeCompile = sh => {
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
   { vec3 V = normalize(vViewPosition); float fr = pow(1. - abs(dot(normalize(normal), V)), 3.);
     outgoingLight += vec3(1., .85, .55) * smoothstep(.35, .55, fr) * .8; }
   #include <opaque_fragment>`);
 };
 return m;
}
let ramp;
function celRamp(T) {
 if (ramp) return ramp;
 ramp = new T.DataTexture(new Uint8Array([70, 70, 70, 255, 255, 255, 255, 255]), 2, 1);
 ramp.minFilter = ramp.magFilter = T.NearestFilter; ramp.needsUpdate = true;
 return ramp;
}

function inkShell(T, mesh, w, color = '#14101c') {
 const mat = new T.MeshBasicMaterial({color, side: T.BackSide});
 mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normal * ${w.toFixed(4)};`); };
 const h = mesh.isSkinnedMesh ? new T.SkinnedMesh(mesh.geometry, mat) : new T.Mesh(mesh.geometry, mat);
 if (mesh.isSkinnedMesh) h.bind(mesh.skeleton, mesh.bindMatrix);
 h.userData.ink = true; h.castShadow = false; h.frustumCulled = false; h.raycast = () => {};
 mesh.add(h); return h;
}

// googly eyes on the front of the head (presentation-free: they are part of the character, in the world)
function eyes(T, actor, {size = .045, gap = .05, up = .55, brow = false, pupil = .5} = {}) {
 const head = actor.rig.bones.head, s = actor.object.scale.x || 1;
 const H = 1.8, g = new T.Group();
 const white = new T.MeshStandardMaterial({color: '#fbfaf5', roughness: .35}), black = new T.MeshStandardMaterial({color: '#141018', roughness: .3});
 // the head bone sits low in the neck; the eyes go a head-height up and to the front of the face
 const toLocal = v => head.worldToLocal(actor.object.localToWorld(v.clone()));
 actor.object.updateMatrixWorld(true);
 const hp = actor.object.worldToLocal(head.getWorldPosition(new T.Vector3()));
 const scaleW = head.getWorldScale(new T.Vector3()).x / (actor.object.getWorldScale(new T.Vector3()).x);
 for (const sx of [-1, 1]) {
  const e = new T.Mesh(new T.SphereGeometry(size * H, 20, 14), white), p = new T.Mesh(new T.SphereGeometry(size * H * pupil, 14, 10), black);
  p.position.set(0, 0, size * H * .72); e.add(p); e.castShadow = true;
  const at = new T.Vector3(sx * gap * H, hp.y + up * .12 * H, hp.z + .05 * H);
  e.position.copy(toLocal(at)); e.scale.setScalar(1 / scaleW);
  if (brow) {
   const b = new T.Mesh(new T.CapsuleGeometry(size * H * .35, size * H * 1.4, 4, 8), black);
   b.rotation.z = Math.PI / 2 + sx * .15; b.position.set(0, size * H * 1.15, size * H * .4); e.add(b);
  }
  g.add(e);
 }
 head.add(g);
 return g;
}

// the stick man: capsules along the bones, a ring for a head, redrawn each frame from the skeleton
function stickFigure(T, actor) {
 const ink = new T.MeshBasicMaterial({color: '#1a1622'}), g = new T.Group(), segs = [], R = .028;
 const B = actor.rig.bones;
 const pairs = [['hips', 'neck'], ['neck', 'head'], ['upperarm_L', 'forearm_L'], ['forearm_L', 'hand_L'], ['upperarm_R', 'forearm_R'], ['forearm_R', 'hand_R'],
  ['thigh_L', 'shin_L'], ['shin_L', 'foot_L'], ['thigh_R', 'shin_R'], ['shin_R', 'foot_R'], ['upperarm_L', 'upperarm_R'], ['thigh_L', 'thigh_R'],
  ['hand_L', '+hand_L'], ['hand_R', '+hand_R'], ['foot_L', '+foot_L'], ['foot_R', '+foot_R']];
 const geo = new T.CylinderGeometry(R, R, 1, 8, 1), cap = new T.SphereGeometry(R, 10, 8);
 for (const p of pairs) { const m = new T.Mesh(geo, ink); g.add(m); segs.push([p, m]); }
 const joints = ['neck', 'upperarm_L', 'upperarm_R', 'forearm_L', 'forearm_R', 'hand_L', 'hand_R', 'thigh_L', 'thigh_R', 'shin_L', 'shin_R', 'foot_L', 'foot_R', 'hips']
  .map(b => { const m = new T.Mesh(cap, ink); g.add(m); return [b, m]; });
 const ring = new T.Mesh(new T.TorusGeometry(.105, R * .9, 8, 40), ink); g.add(ring);
 const face = new T.Mesh(new T.CircleGeometry(.1, 32), new T.MeshBasicMaterial({color: '#fbfaf6'})); ring.add(face); face.position.z = -.002;
 // where the hand and toe tips are, from the rest pose: the wrist/ankle plus a little along the limb
 const tips = {};
 const v = new T.Vector3(), w = new T.Vector3(), up = new T.Vector3(0, 1, 0);
 const pos = b => {
  if (b[0] === '+') {
   const n = b.slice(1), wp = B[n].getWorldPosition(new T.Vector3());
   if (n.startsWith('hand')) return wp.add(wp.clone().sub(B[n.replace('hand', 'forearm')].getWorldPosition(new T.Vector3())).multiplyScalar(.45));
   const fwd = new T.Vector3(0, 0, 1).applyQuaternion(B.hips.getWorldQuaternion(new T.Quaternion()));
   const shin = wp.clone().sub(B[n.replace('foot', 'shin')].getWorldPosition(new T.Vector3())).normalize();
   return wp.add(fwd.sub(shin.multiplyScalar(fwd.dot(shin))).normalize().multiplyScalar(.13)).add(shin.multiplyScalar(-.0));
  }
  if (b === 'head') return B.neck.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .1, 0).applyQuaternion(B.head.getWorldQuaternion(new T.Quaternion())));
  return B[b].getWorldPosition(new T.Vector3());
 };
 let frame = 0;
 return {group: g, update(camera, f) {
  if (f === frame) return; frame = f;
  const jit = () => (Math.sin(f * 12.9898 + segs.length) * 43758.5453 % 1) * .006;
  for (const [[a, b], m] of segs) {
   pos(a).toArray([]); v.copy(pos(a)); w.copy(pos(b));
   v.x += jit(); w.y += jit();
   m.position.copy(v).add(w).multiplyScalar(.5); const d = w.sub(v); m.scale.set(1, Math.max(d.length(), .001), 1);
   m.quaternion.setFromUnitVectors(up, d.normalize());
  }
  for (const [b, m] of joints) m.position.copy(pos(b));
  const neck = pos('neck'), hd = new T.Vector3(0, 1, 0).applyQuaternion(B.head.getWorldQuaternion(new T.Quaternion()));
  ring.position.copy(neck).addScaledVector(hd, .12);
  ring.quaternion.copy(camera.quaternion);
 }};
}

export function dress(T, actor, id, frame) {
 // sizes in the body's own units (the mannequin is 8 units tall, the brutes about 2)
 const h = actor.rig.height, U = {uFrame: frame, uBoil: {value: .0035 * h}}, k = 8.07 / h;
 const undo = [], meshes = [];
 actor.object.traverse(o => { if (o.isMesh && !o.userData.ink && !o.userData.dress) meshes.push(o); });
 const out = {fps: 0, stage: STAGES[id] || STAGES.studio, update() {}, undress() { for (const f of undo.reverse()) f(); }};
 const swap = (o, m) => { const old = o.material; o.material = m; undo.push(() => { o.material = old; }); };
 const add = (parent, child) => { child.userData.dress = true; parent.add(child); undo.push(() => parent.remove(child)); };
 if (id === 'clay' || id === 'village') {
  const pal = PALETTES[id];
  for (const o of meshes) {
   const role = ROLE(o.name), base = o.material?.map && id === 'village' ? null : pal[role] || pal.body;
   const m = clayMaterial(T, base || '#ffffff', U, id === 'village' ? {rough: .9, bump: .8, scale: 7 * k} : {rough: .7, bump: .5, scale: 9 * k});
   if (o.material?.map && o.isSkinnedMesh) { m.map = o.material.map; m.color.set(id === 'clay' ? '#ffe2d0' : '#f2dcc4'); }
   swap(o, m);
  }
  const e = eyes(T, actor, id === 'village' ? {size: .03, gap: .03, up: .5, brow: true, pupil: .42} : {size: .027, gap: .032, up: .45, pupil: .55});
  e.userData.dress = true; undo.push(() => e.parent?.remove(e));
  out.fps = 12;
 } else if (id === 'comic') {
  for (const o of meshes) {
   const m = celMaterial(T, PALETTES.comic[ROLE(o.name)] || PALETTES.comic.body);
   if (o.material?.map && o.isSkinnedMesh) { m.map = o.material.map; m.color.set('#ffffff'); }
   swap(o, m);
   const hull = inkShell(T, o, .006 * h); undo.push(() => o.remove(hull));
  }
 } else if (id === 'stick') {
  for (const o of meshes) { const was = o.visible; o.visible = false; undo.push(() => { o.visible = was; }); }
  const st = stickFigure(T, actor);
  const scene = actor.object.parent; scene.add(st.group); undo.push(() => st.group.parent?.remove(st.group));
  out.update = (camera, f) => st.update(camera, f);
  out.fps = 12;
 }
 return out;
}
