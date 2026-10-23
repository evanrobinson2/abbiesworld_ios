import * as T from 'three';
import {GLTFLoader} from '/sandbox2-runtime/vendor/loaders/GLTFLoader.js';
import {clone} from '/character-skeleton-utils.mjs';

// The girl who goes down to Grace's basement (AW-STUDY-0024). Built on Quaternius's rigged mannequin (CC0,
// animation-study-assets/): every limb in all its parts (upper arm, forearm, hand, thigh, shin, foot) with real walk,
// sit and reach clips. Recoloured in vertex colours by bone, the way character-variants.mjs does it: a red and cream
// striped shirt, jeans, white sneakers, brown hair with a ponytail. Child proportions: about 1.18 m, a larger head.
// const kid = await loadGraceKid(); scene.add(kid.group); kid.play('walk'); kid.update(dt)
export const KID_HEIGHT = 1.18;
const URL_GLTF = '/animation-study-assets/AnimationLibrary_Godot_Standard.gltf';
const PAL = {skin: '#e9b993', shirt: '#b8363a', stripe: '#efe2c4', jeans: '#3d5d8c', shoe: '#f1ede6', sole: '#c0392b', hair: '#5b3620'};
const CLIPS = {idle: 'Idle_Loop', walk: 'Walk_Loop', sitDown: 'Sitting_Enter', sit: 'Sitting_Idle_Loop', standUp: 'Sitting_Exit', reach: 'Interact', pickUp: 'PickUp_Table', crouch: 'Crouch_Idle_Loop', talk: 'Idle_Talking_Loop'};

// Reshape the adult mannequin into a child in its bind pose: limbs and torso pulled in towards their bones, and the
// adult head folded into the middle of the skull so the built child's head (below) covers it. Each vertex moves by
// the blend of its bone weights, so joints stay closed.
const SEG = {upper_arm: ['forearm', .74], forearm: ['hand', .78], thigh: ['shin', .82], shin: ['foot', .84], neck: ['head', .7],
 hips: ['spine001', .86], spine001: ['spine002', .82], spine002: ['spine003', .76], spine003: ['neck', .7], shoulder: ['upper_arm', .7]};
function childShape(mesh) {
 const bones = mesh.skeleton.bones, at = bones.map((b, i) => new T.Vector3().setFromMatrixPosition(new T.Matrix4().copy(mesh.skeleton.boneInverses[i]).invert()));
 const byName = Object.fromEntries(bones.map((b, i) => [b.name, i]));
 const pull = bones.map(b => { const m = /^DEF-([a-z_]+?\d*)(L|R)?$/.exec(b.name); const key = m && m[1]; if (key === 'head') return {head: true};
  const seg = SEG[key]; if (!seg) return null; const tail = byName['DEF-' + seg[0] + (m[2] || '')]; return tail === undefined ? null : {tail, f: seg[1]}; });
 const g = mesh.geometry, p = g.attributes.position, j = g.attributes.skinIndex, w = g.attributes.skinWeight, v = new T.Vector3(), d = new T.Vector3(), a = new T.Vector3(), q = new T.Vector3();
 const headC = new T.Vector3(0, 1.68, .01);
 for (let i = 0; i < p.count; i++) {
  v.fromBufferAttribute(p, i); d.set(0, 0, 0);
  for (let k = 0; k < 4; k++) {
   const wt = w.getComponent(i, k), bi = j.getComponent(i, k), r = pull[bi]; if (!wt || !r) continue;
   if (r.head) { d.addScaledVector(q.copy(headC).sub(v).multiplyScalar(.75), wt); continue; }
   a.copy(at[r.tail]).sub(at[bi]); const t = T.MathUtils.clamp(q.copy(v).sub(at[bi]).dot(a) / a.lengthSq(), 0, 1);
   const onLine = q.copy(at[bi]).addScaledVector(a, t); d.addScaledVector(onLine.sub(v).multiplyScalar(1 - r.f), wt);
  }
  p.setXYZ(i, v.x + d.x, v.y + d.y, v.z + d.z);
 }
 p.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
}

let cache = null;
export async function loadGraceKid(url = URL_GLTF) {
 cache ||= new GLTFLoader().loadAsync(url);
 const gltf = await cache;
 const src = gltf.scene.getObjectByName('Rig') || gltf.scene;
 const rig = clone(src); rig.updateMatrixWorld(true);
 rig.traverse(o => {
  if (!o.isSkinnedMesh) return;
  o.geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
  const g = o.geometry, p = g.attributes.position, j = g.attributes.skinIndex, w = g.attributes.skinWeight, colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) {
   let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { x += p.getX(i + k) / 3; y += p.getY(i + k) / 3; z += p.getZ(i + k) / 3; }
   let slot = 0; for (let k = 1; k < 4; k++) if (w.getComponent(i, k) > w.getComponent(i, slot)) slot = k;
   const bone = o.skeleton.bones[j.getComponent(i, slot)]?.name || '';
   let color = Math.floor(y / .07) % 2 ? PAL.stripe : PAL.shirt; // the stripes run round the body
   if (/head|neck|hand|thumb|f_/.test(bone)) color = PAL.skin;
   else if (/toe/.test(bone) || (/foot/.test(bone) && y < .035)) color = y < .03 ? PAL.sole : PAL.shoe;
   else if (/foot/.test(bone)) color = PAL.shoe;
   else if (/thigh|shin|hips/.test(bone) || y < .99) color = PAL.jeans;
   else if (/forearm/.test(bone) && Math.abs(x) > .5) color = PAL.skin; // short sleeves end at the elbow
   const c = new T.Color(color); for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  g.setAttribute('color', new T.BufferAttribute(colors, 3));
  childShape(o);
  o.material = new T.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: .9, flatShading: true, name: 'kid clothes and skin'});
  o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
 });
 // A child's head, built here and riding the head bone: the mannequin's adult head is folded away inside it (see
 // childShape). Round skull, big eyes, button nose, cheeks, ears, a hair cap with bangs and a high ponytail.
 // Coordinates are in the 1.83 m source bind pose, facing +Z; the head bone sits at y 1.569.
 const head = rig.getObjectByName('DEF-head');
 const M = (name, color, rough = .8) => new T.MeshStandardMaterial({color, roughness: rough, flatShading: true, name});
 const skinM = M('skin', PAL.skin), hairM = M('hair brown', PAL.hair, .7), dark = M('eye dark', '#241810', .35), white = M('eye white', '#fbf7ee', .4);
 const cheekM = M('cheek blush', '#e79a86'), mouthM = M('mouth', '#9c3b3b', .6), tieM = M('hair tie red', PAL.sole, .6);
 const ball = (seg = 14) => new T.SphereGeometry(1, seg, Math.round(seg * .75));
 const HC = [0, 1.66, .01], HS = 1.16; // the whole head grows about its middle: children's heads are big for their bodies
 const bit = (name, geo, mat, pos, scale, rot) => { const m = new T.Mesh(geo, mat); m.name = name; m.position.set(...pos.map((v, i) => HC[i] + (v - HC[i]) * HS)); m.scale.set(...(scale || [1, 1, 1]).map(v => v * HS)); if (rot) m.rotation.set(...rot); m.castShadow = true; rig.add(m); rig.updateMatrixWorld(true); head.attach(m); return m; };
 if (head) {
  const C = [0, 1.715, .012];
  bit('head', ball(18), skinM, C, [.128, .152, .138]);
  bit('jaw', ball(12), skinM, [0, 1.64, .03], [.1, .07, .1]);
  for (const sx of [-1, 1]) {
   bit('ear', ball(8), skinM, [sx * .128, 1.70, .0], [.022, .036, .026]);
   bit('eye white', ball(10), white, [sx * .048, 1.715, .128], [.03, .034, .016]);
   bit('eye', ball(10), dark, [sx * .048, 1.712, .139], [.021, .025, .01]);
   bit('eye shine', ball(6), white, [sx * .042, 1.722, .148], [.006, .006, .004]);
   bit('eyebrow', new T.BoxGeometry(.045, .009, .01), hairM, [sx * .05, 1.765, .135], null, [0, 0, sx * -.12]);
   bit('cheek', ball(8), cheekM, [sx * .078, 1.67, .112], [.024, .016, .01]);
  }
  bit('nose', ball(8), skinM, [0, 1.683, .148], [.016, .014, .014]);
  bit('mouth', new T.TorusGeometry(.022, .005, 4, 10, Math.PI), mouthM, [0, 1.647, .128], null, [0, 0, Math.PI]);
  // Hair: a cap over the top and back, bangs across the forehead, a red tie and a swinging ponytail.
  bit('hair cap', new T.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * .58), hairM, [0, 1.722, -.004], [.138, .162, .15], [-.38, 0, 0]);
  for (let k = -2; k <= 2; k++) bit('bangs', ball(8), hairM, [k * .042, 1.80 - Math.abs(k) * .01, .118 - Math.abs(k) * .018], [.035, .03, .022], [0, 0, k * .15]);
  bit('hair tie', new T.TorusGeometry(.024, .011, 6, 10), tieM, [0, 1.80, -.135], null, [.9, 0, 0]);
  bit('ponytail', new T.CylinderGeometry(.03, .014, .2, 8), hairM, [0, 1.71, -.17], null, [.32, 0, 0]);
  bit('ponytail tip', ball(8), hairM, [0, 1.615, -.2], [.022, .03, .022]);
 }
 const bounds = new T.Box3().setFromObject(rig), h = bounds.max.y - bounds.min.y;
 const group = new T.Group(); group.name = 'kid'; group.add(rig);
 rig.scale.setScalar(KID_HEIGHT / h * 1.0); rig.position.y = -bounds.min.y * rig.scale.y;
 const mixer = new T.AnimationMixer(rig), actions = {};
 for (const [k, name] of Object.entries(CLIPS)) {
  const clip = gltf.animations.find(a => a.name === name); if (!clip) continue;
  // Drop the hips' travel so walking stays where the scene puts her; keep its bob.
  const c = clip.clone(); c.tracks = c.tracks.filter(t => !/\.scale$/.test(t.name));
  for (const t of c.tracks) if (/DEF-hips\.position$|root\.position$/.test(t.name) && k === 'walk') for (let i = 0; i < t.values.length; i += 3) { t.values[i] = 0; t.values[i + 2] = 0; }
  actions[k] = mixer.clipAction(c);
  if (/sitDown|standUp|reach|pickUp/.test(k)) { actions[k].setLoop(T.LoopOnce); actions[k].clampWhenFinished = true; }
 }
 let current = null;
 const play = (k, fade = .25, speed = 1) => {
  const a = actions[k]; if (!a || a === current) return a;
  a.reset(); a.setEffectiveTimeScale(speed); a.play(); if (current) current.crossFadeTo(a, fade, false); current = a; return a;
 };
 const update = dt => mixer.update(dt);
 play('idle', 0);
 group.userData = {rig, head, play, update, mixer, actions, height: KID_HEIGHT};
 return group;
}
