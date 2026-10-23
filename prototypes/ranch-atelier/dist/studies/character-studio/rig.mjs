// AW-STUDY-0037 Character Studio: one humanoid skeleton, one way of writing poses, any body.
// The bone names are the brute fight's (AW-STUDY-0027), so the Meshy brutes and the wooden mannequin share every move.
//   rigMannequin(T, gltfScene, joints)  wooden mannequin: 30 rigid parts parented to bones built from rest-joints.json
//   rigSkinned(T, gltfScene)            any glTF with these bone names (the brutes): learns its rest pose and arm angles
//   applyPose(T, rig, pose)             pose = {bone: [x, y, z] degrees, root: [x, y, z] hip heights, turn: [x, y, z]}
// How to read a pose (the character faces +Z, x is the figure's left, y up): every bone's numbers are a turn about the
// character's own axes, measured from the rest A-pose. +x swings a hanging limb back and tips a raised one forward, so
// a leg or arm raised forward is negative x and a knee bend is positive x; +y turns toward the figure's left; +z tips
// the left arm out. Right-side bones are written exactly like the left (arm out is +z on both); the rig mirrors them.
export const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head',
 'clavicle_L', 'upperarm_L', 'forearm_L', 'hand_L', 'clavicle_R', 'upperarm_R', 'forearm_R', 'hand_R',
 'thigh_L', 'shin_L', 'foot_L', 'thigh_R', 'shin_R', 'foot_R'];
export const PARENT = {hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck',
 clavicle_L: 'chest', upperarm_L: 'clavicle_L', forearm_L: 'upperarm_L', hand_L: 'forearm_L',
 clavicle_R: 'chest', upperarm_R: 'clavicle_R', forearm_R: 'upperarm_R', hand_R: 'forearm_R',
 thigh_L: 'hips', shin_L: 'thigh_L', foot_L: 'shin_L', thigh_R: 'hips', shin_R: 'thigh_R', foot_R: 'shin_R'};
// which joint each limb bone points at, in rest-joints.json names (side letter appended)
const AIM = {upperarm: ['s', 'e'], forearm: ['e', 'w'], hand: ['w', 'f'], thigh: ['h', 'k'], shin: ['k', 'a'], foot: ['a', 't']};
// the mannequin's 30 parts, by bone (README: tools/figure-practice/)
const PARTS = {hips: ['pelvis', 'hip_R', 'hip_L'], spine: ['abdomen'], chest: ['waist_joint', 'chest', 'shoulder_R', 'shoulder_L'],
 neck: ['neck'], head: ['head'], upperarm: ['upper_arm'], forearm: ['elbow', 'forearm'], hand: ['wrist', 'hand'],
 thigh: ['thigh'], shin: ['knee', 'shin'], foot: ['ankle', 'foot']};

const side = b => b.endsWith('_R') ? 'R' : b.endsWith('_L') ? 'L' : '';
const stem = b => b.replace(/_[LR]$/, '');

// canonical rest directions, from the mannequin's joints (character space)
export function canonDirs(T, J) {
 const v = k => new T.Vector3(...J[k]), out = {};
 for (const s of ['L', 'R']) for (const [b, [a, c]] of Object.entries(AIM)) out[`${b}_${s}`] = v(c + s).sub(v(a + s)).normalize();
 return out;
}

export function rigMannequin(T, scene, J) {
 const v = k => new T.Vector3(...J[k]);
 const at = {root: new T.Vector3(), hips: v('hc'), spine: v('hc').lerp(v('waist'), .02), chest: v('waist'), neck: v('neck'),
  head: v('neck').lerp(v('crown'), .12)};
 for (const s of ['L', 'R']) {
  at[`clavicle_${s}`] = v('neck').lerp(v('s' + s), .25).setY(J['s' + s][1] - .1);
  at[`upperarm_${s}`] = v('s' + s); at[`forearm_${s}`] = v('e' + s); at[`hand_${s}`] = v('w' + s);
  at[`thigh_${s}`] = v('h' + s); at[`shin_${s}`] = v('k' + s); at[`foot_${s}`] = v('a' + s);
 }
 const bones = {};
 for (const b of BONES) {
  const bone = new T.Bone(); bone.name = b; bones[b] = bone;
  bone.position.copy(at[b]).sub(PARENT[b] ? at[PARENT[b]] : new T.Vector3());
  if (PARENT[b]) bones[PARENT[b]].add(bone);
 }
 const holder = new T.Group(); holder.name = 'mannequin';
 holder.add(bones.root); holder.updateMatrixWorld(true); scene.updateMatrixWorld(true);
 const byName = {}; scene.traverse(o => { if (o.isMesh) byName[o.name] = o; });
 for (const b of BONES) {
  const s = side(b), names = PARTS[stem(b)] || PARTS[b] || [];
  for (const n of names) { const m = byName[s ? `${n}_${s}` : n]; if (m) bones[b].attach(m); }
 }
 return finishRig(T, holder, bones, {canon: canonDirs(T, J), hipY: J.hc[1], height: J.crown[1], rigid: true});
}

export function rigSkinned(T, scene, J) {
 scene.updateMatrixWorld(true);
 const bones = {};
 scene.traverse(o => { if (o.isBone && BONES.includes(o.name) && !bones[o.name]) bones[o.name] = o; });
 const box = new T.Box3().setFromObject(scene);
 return finishRig(T, scene, bones, {canon: canonDirs(T, J), hipY: bones.hips.getWorldPosition(new T.Vector3()).y - box.min.y,
  height: box.max.y - box.min.y});
}

// rest pose in character space; a per-limb correction turns each limb onto the mannequin's A-pose so every move reads
// the same on every body (a brute in a wider A-pose would otherwise wave his arms higher)
function finishRig(T, holder, bones, {canon, hipY, height, rigid}) {
 holder.updateMatrixWorld(true);
 const inv = holder.getWorldQuaternion(new T.Quaternion()).invert(), rest = {}, corr = {};
 for (const [b, bone] of Object.entries(bones)) {
  const wq = inv.clone().multiply(bone.getWorldQuaternion(new T.Quaternion()));
  rest[b] = {q: bone.quaternion.clone(), wq, pos: bone.position.clone()};
  const pw = bone.parent ? inv.clone().multiply(bone.parent.getWorldQuaternion(new T.Quaternion())) : new T.Quaternion();
  rest[b].pwq = pw;
 }
 for (const b of Object.keys(bones)) {
  corr[b] = new T.Quaternion();
  const want = canon[b], child = Object.keys(PARENT).find(c => PARENT[c] === b && bones[c]);
  if (!want || rigid) continue;
  const p0 = bones[b].getWorldPosition(new T.Vector3());
  let dir;
  if (child) dir = bones[child].getWorldPosition(new T.Vector3()).sub(p0);
  else dir = new T.Vector3(0, 1, 0).applyQuaternion(bones[b].getWorldQuaternion(new T.Quaternion()));
  dir.applyQuaternion(inv).normalize();
  // a foot points forward and down; only correct it if it is badly off
  corr[b].setFromUnitVectors(dir, want);
 }
 const hipsWorld = bones.hips.parent ? inv.clone().multiply(bones.hips.parent.getWorldQuaternion(new T.Quaternion())) : new T.Quaternion();
 return {T, holder, bones, rest, corr, hipY, height, hipsParentInv: hipsWorld.invert(), _q: new T.Quaternion(), _e: new T.Euler()};
}

const D2R = Math.PI / 180;
// world rotation of each bone = (pose turn chain) * correction * rest; local = parent^-1 * world
export function applyPose(T, rig, pose = {}) {
 const {bones, rest, corr} = rig, W = {}, Dw = {};
 const e = rig._e, turn = pose.turn || [0, 0, 0];
 const base = new T.Quaternion().setFromEuler(e.set(turn[0] * D2R, turn[1] * D2R, turn[2] * D2R, 'YXZ'));
 for (const b of BONES) {
  const bone = bones[b]; if (!bone) continue;
  const r = pose[b], s = side(b) === 'R' ? -1 : 1;
  const d = new T.Quaternion();
  if (r) d.setFromEuler(e.set(r[0] * D2R, s * r[1] * D2R, s * r[2] * D2R, 'XYZ'));
  const par = PARENT[b];
  Dw[b] = (par && Dw[par] ? Dw[par].clone() : base.clone()).multiply(d);
  if (b === 'root') Dw[b] = base.clone().multiply(d);
  W[b] = Dw[b].clone().multiply(corr[b]).multiply(rest[b].wq);
  const pw = par && W[par] ? W[par] : rest[b].pwq; // the root's own parent never turns
  bone.quaternion.copy(pw.clone().invert().multiply(W[b]));
 }
 const o = pose.root || [0, 0, 0], hips = bones.hips;
 const off = new T.Vector3(o[0], 0, o[2]).multiplyScalar(rig.hipY); // y is lift; the stage adds it after grounding the feet
 // offset is in character space; bring it into the hips' parent space (scale too, for skinned rigs exported in cm)
 const ps = hips.parent ? hips.parent.getWorldScale(new T.Vector3()) : new T.Vector3(1, 1, 1);
 const hs = rig.holder.getWorldScale(new T.Vector3());
 off.applyQuaternion(rig.hipsParentInv).divide(ps).multiply(hs);
 hips.position.copy(rest.hips.pos).add(off);
}

// world-space ground fix: lowest foot sole stays on the floor unless the move leaves the ground on purpose
export function footY(T, rig) {
 const a = rig.bones.foot_L.getWorldPosition(new T.Vector3()).y, b = rig.bones.foot_R.getWorldPosition(new T.Vector3()).y;
 return Math.min(a, b);
}
