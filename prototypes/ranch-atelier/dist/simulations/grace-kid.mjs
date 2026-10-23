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
// Round 2's girl (the mannequin reshaped in place, flat shaded, vertex colours), kept for the before/after study.
export async function loadGraceKidRound2(url = URL_GLTF) {
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
 // The points that touch the ground (ankles and balls of the feet) with their resting heights, so the scene can keep
 // every foot on top of whatever step is under it.
 group.updateMatrixWorld(true);
 const feet = ['DEF-footL', 'DEF-footR', 'DEF-toeL', 'DEF-toeR'].map(n => rig.getObjectByName(n)).filter(Boolean)
  .map(bone => ({bone, rest: bone.getWorldPosition(new T.Vector3()).y}));
 group.userData = {rig, head, play, update, mixer, actions, height: KID_HEIGHT, feet};
 return group;
}

// ---------- Round 3 (AW-STUDY-0034, figure fidelity): the same rig and the same clips, a new body. ----------
// The skeleton itself is reshaped into a child (shorter limbs, narrower shoulders, about 1.18 m), the clips keep only
// their rotations (and the hips' travel, rescaled), and the body is built over it with figure-kit and the shared
// child recipe: one skinned surface per material, a striped knit shirt with real UVs, jeans, sneakers, a ponytail.
// Same API as before: group.userData = {rig, head, play, update, mixer, actions, height, feet}.
import {buildHuman, humanMaterials} from './figures/human.mjs';
export const GRACE_GIRL_LOOK = {
 skin: PAL.skin, blush: '#ec9a86', eyes: '#3a2416',
 shirt: PAL.shirt, shirtStripe: PAL.stripe, stripePeriod: .05, shirtName: 'red and cream striped shirt', sleeve: .5,
 bottoms: PAL.jeans, bottomsName: 'jeans', bottomsKind: 'jeans', shoes: PAL.shoe, shoesName: 'white sneakers', sole: PAL.sole,
 hair: PAL.hair, hairName: 'brown hair', hairStyle: 'ponytail', brow: .55, tie: PAL.sole, seed: 5,
};
const SHRINK = {'DEF-shin': .9, 'DEF-foot': .9, 'DEF-forearm': .9, 'DEF-hand': .9, 'DEF-upper_arm': .85, 'DEF-head': .7, 'DEF-neck': .9, 'DEF-thigh': .92};
export async function loadGraceKid(url = URL_GLTF, look = GRACE_GIRL_LOOK) {
 cache ||= new GLTFLoader().loadAsync(url);
 const gltf = await cache;
 const src = gltf.scene.getObjectByName('Rig') || gltf.scene;
 const rig = clone(src), group = new T.Group(); group.name = 'kid'; group.add(rig); group.updateMatrixWorld(true);
 const old = []; rig.traverse(o => { if (o.isSkinnedMesh) old.push(o); });
 const adult = new T.Box3(); old.forEach(o => adult.expandByObject(o));
 old.forEach(o => o.parent.remove(o));
 // child proportions: every offset shrinks to the child's height; a bone's offset is its parent's length, so limbs
 // and the neck shrink a little more
 const k = KID_HEIGHT / (adult.max.y - adult.min.y) * 1.03, bones = {};
 rig.traverse(o => { if (!o.isBone) return; bones[o.name] = o; o.position.multiplyScalar(k * (SHRINK[o.name.replace(/(L|R)$/, '')] || 1)); });
 bones['DEF-hips'].position.multiplyScalar(SHRINK['DEF-thigh'] * .98);
 // the clips: rotations only, except the hips' travel, rescaled to the shorter legs
 const mixer = new T.AnimationMixer(rig), actions = {};
 for (const [key, name] of Object.entries(CLIPS)) {
  const clip = gltf.animations.find(a => a.name === name); if (!clip) continue;
  const c = clip.clone(); c.tracks = c.tracks.filter(t => !/\.scale$/.test(t.name) && (!/\.position$/.test(t.name) || /DEF-hips\.position$/.test(t.name))).map(t => t.clone());
  for (const t of c.tracks) if (/DEF-hips\.position$/.test(t.name)) for (let i = 0; i < t.values.length; i += 3) {
   t.values[i] *= k * SHRINK['DEF-thigh'] * .98; t.values[i + 1] *= k * SHRINK['DEF-thigh'] * .98; t.values[i + 2] *= k * SHRINK['DEF-thigh'] * .98;
   if (key === 'walk') { t.values[i] = 0; t.values[i + 2] = 0; }
  }
  actions[key] = mixer.clipAction(c);
  if (/sitDown|standUp|reach|pickUp/.test(key)) { actions[key].setLoop(T.LoopOnce); actions[key].clampWhenFinished = true; }
 }
 // build the body in her idle pose, so the face, shoulders and sleeves are shaped where she spends her time
 actions.idle?.play(); mixer.update(0);
 group.updateMatrixWorld(true);
 const W = n => bones[n].getWorldPosition(new T.Vector3()).toArray();
 const Ls = W('DEF-upper_armL')[0] > 0 ? 'L' : 'R', side = s => (s === 'L' ? Ls : Ls === 'L' ? 'R' : 'L');
 const toe = W(`DEF-toe${Ls}`), foot = W(`DEF-foot${Ls}`), mid = W(`DEF-f_middle03${Ls}`), hand = W(`DEF-hand${Ls}`), head = W('DEF-head');
 const s = KID_HEIGHT / 1.35;
 const J = {
  s, hips: W('DEF-hips'), spine: W('DEF-spine002'), chest: W('DEF-spine003'), neck: W('DEF-neck'), head,
  headC: [0, head[1] + .1 * s, head[2] + .008], headR: [.132 * s * 1.06, .128 * s * 1.06, .126 * s * 1.06],
  shoulder: W(`DEF-upper_arm${Ls}`), elbow: W(`DEF-forearm${Ls}`), wrist: hand, handEnd: mid.map((v, i) => v + (v - hand[i]) * .15),
  hip: W(`DEF-thigh${Ls}`), knee: W(`DEF-shin${Ls}`), ankle: foot, toe: [toe[0], .02, toe[2] + (toe[2] - foot[2]) * .45],
 };
 const N = {hips: 'DEF-hips', spine: 'DEF-spine002', chest: 'DEF-spine003', neck: 'DEF-neck', head: 'DEF-head',
  upperArm: S => `DEF-upper_arm${side(S)}`, foreArm: S => `DEF-forearm${side(S)}`, hand: S => `DEF-hand${side(S)}`,
  thigh: S => `DEF-thigh${side(S)}`, shin: S => `DEF-shin${side(S)}`, foot: S => `DEF-foot${side(S)}`, toe: S => `DEF-toe${side(S)}`};
 const materials = humanMaterials(T, look);
 const built = buildHuman(T, bones, J, N, look).build(materials);
 let current = null;
 const play = (key, fade = .25, speed = 1) => {
  const a = actions[key]; if (!a || a === current) return a;
  a.reset(); a.setEffectiveTimeScale(speed); a.play(); if (current) current.crossFadeTo(a, fade, false); current = a; return a;
 };
 const update = dt => mixer.update(dt);
 current = actions.idle || null;
 // stand her on the floor: the lowest sole point at rest
 const low = Math.min(...['L', 'R'].map(S => W(`DEF-foot${S}`)[1])) - .085 * s; rig.position.y -= low;
 group.updateMatrixWorld(true);
 const feet = ['DEF-footL', 'DEF-footR', 'DEF-toeL', 'DEF-toeR'].map(n => bones[n]).filter(Boolean).map(bone => ({bone, rest: bone.getWorldPosition(new T.Vector3()).y}));
 group.userData = {rig, head: bones['DEF-head'], play, update, mixer, actions, height: KID_HEIGHT, feet, materials, triangles: built.triangles, meshes: built.meshes};
 return group;
}
