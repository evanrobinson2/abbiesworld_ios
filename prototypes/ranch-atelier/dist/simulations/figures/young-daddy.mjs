// Young Daddy, hero low poly (AW-STUDY-0034 on the looks Evan set at 09:58Z): a blond mop and never a hat, a white tee,
// red shorts, tube socks and white sneakers. Built with figure-kit (one skinned surface per material, welded normals,
// UVs, thin-part glow), so the storybook light and the pixel pass have real form to work on.
// Contract shared with the school jump (AW-STUDY-0032): faces +Z, 1.35 m tall.
// const kid = makeYoungDaddy(T); scene.add(kid.group); kid.update(dt, {walk, hands: [l, r], feet: [l, r], throw,
//   shield, carry, crouch, look, lookUp, effort, lean});  kid.arms[i].hand is an Object3D at the palm.
import {skeleton, ik2, roleMaterial, storybookLook} from '../figure-kit.mjs';
import {buildHuman, humanMaterials, CHILD_BONES, CHILD_NAMES} from './human.mjs';

export const YOUNG_DADDY_LOOK = {
 skin: '#f0c29b', blush: '#f2ab98', eyes: '#5b3d24',
 shirt: '#f2ede4', shirtName: 'white t-shirt', sleeve: .42,
 bottoms: '#c8322e', bottomsName: 'red shorts', bottomsKind: 'shorts',
 socks: '#f4f1ea', sockStripe: '#c8322e', shoes: '#f6f6f2', shoesName: 'white sneakers', sole: '#c9c2b6',
 hair: '#e3c46a', hairName: 'blond mop', hairStyle: 'mop', brow: .42, seed: 23,
};
// Joints in metres, figure space, left side (+X); the right mirrors. A 1.35 m child, a big storybook head.
export const YOUNG_DADDY_JOINTS = {
 s: 1, hips: [0, .70, 0], spine: [0, .82, 0], chest: [0, .95, 0], neck: [0, 1.065, 0], head: [0, 1.11, 0],
 headC: [0, 1.225, .005], headR: [.132, .128, .126],
 shoulder: [.165, 1.025, 0], elbow: [.19, .815, -.012], wrist: [.21, .62, .008], handEnd: [.214, .535, .016],
 hip: [.075, .665, 0], knee: [.08, .385, .01], ankle: [.08, .085, -.005], toe: [.08, .02, .1],
};

export function makeYoungDaddy(T, {look = YOUNG_DADDY_LOOK, joints = YOUNG_DADDY_JOINTS} = {}) {
 const group = new T.Group(); group.name = 'kid';
 const {bones, root} = skeleton(T, CHILD_BONES(joints)); group.add(root);
 const materials = humanMaterials(T, look);
 const built = buildHuman(T, bones, joints, CHILD_NAMES, look).build(materials);
 const hide = new T.MeshBasicMaterial({visible: false});
 const hit = new T.Mesh(new T.CylinderGeometry(.3, .3, 1.4, 8), hide); hit.position.y = .7; hit.name = 'kid hit'; group.add(hit);
 const side = ['L', 'R'];
 const arms = side.map((S, i) => {
  const upper = bones[`upperArm.${S}`], palm = new T.Mesh(new T.SphereGeometry(.07, 6, 4), hide); palm.name = 'hand';
  palm.position.set(0, (joints.handEnd[1] - joints.wrist[1]) * .5, (joints.handEnd[2] - joints.wrist[2]) * .5); bones[`hand.${S}`].add(palm);
  return Object.assign(upper, {hand: palm, upper, fore: bones[`foreArm.${S}`], wrist: bones[`hand.${S}`]});
 });
 const legs = side.map(S => Object.assign(bones[`thigh.${S}`], {thigh: bones[`thigh.${S}`], shin: bones[`shin.${S}`], foot: bones[`foot.${S}`]}));
 // three tennis balls held against the chest when carrying
 const ballM = storybookLook(T, roleMaterial(T, 'tennis ball felt', {color: '#d7f04a', roughness: .9, emissive: '#7a8a10', emissiveIntensity: .25, sheen: .6}));
 const carry = [-1, 0, 1].map(k => { const b = new T.Mesh(new T.SphereGeometry(.07, 12, 8), ballM); b.name = 'carried ball'; b.position.set(k * .1, -.06 + (k ? 0 : .08), .17); b.visible = false; bones.chest.add(b); return b; });

 const rest = Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, b.position.clone()]));
 const state = {t: 0, phase: 0, triangles: built.triangles};
 const v = new T.Vector3(), w = new T.Vector3(), pole = new T.Vector3();
 function update(dt, pose = {}) {
  const P = {walk: 0, hands: [null, null], feet: [null, null], throw: 0, shield: 0, carry: false, crouch: 0, look: 0, lookUp: 0, effort: 0, lean: 0, ...pose};
  state.t += dt; const walk = Math.min(1, Math.max(0, P.walk)); if (walk > .01) state.phase += dt * (5 + 6 * walk);
  const ph = state.phase, t = state.t, cr = P.crouch;
  for (const [k, b] of Object.entries(bones)) { b.quaternion.identity(); b.position.copy(rest[k]); }
  const breath = Math.sin(t * 2.1) * .012, shake = () => (Math.random() - .5) * .06 * P.effort;
  bones.hips.position.y = rest.hips.y - cr * .2 - Math.abs(Math.sin(ph)) * .025 * walk;
  bones.spine.rotation.x = P.lean * .6 + breath + cr * .25; bones.chest.rotation.x = P.lean * .4 - breath * .5;
  bones.hips.rotation.y = Math.sin(ph) * .08 * walk; bones.chest.rotation.y = -Math.sin(ph) * .12 * walk;
  bones.neck.rotation.set(-P.lookUp * .2, P.look * .35, 0); bones.head.rotation.set(-P.lookUp * .5 - breath * .5, P.look * .5, 0);
  side.forEach((S, i) => {
   const k = i ? -1 : 1, s = Math.sin(ph + (i ? Math.PI : 0));
   bones[`thigh.${S}`].rotation.x = s * .55 * walk - cr * 1.2; bones[`shin.${S}`].rotation.x = Math.max(0, Math.sin(ph + (i ? Math.PI : 0) + 1.3)) * .95 * walk + cr * 2.1;
   bones[`foot.${S}`].rotation.x = -cr * .9;
   const up = bones[`upperArm.${S}`], fo = bones[`foreArm.${S}`];
   up.rotation.set(-s * .45 * walk + shake(), 0, k * .07 + shake()); fo.rotation.x = -.2 - .25 * walk;
   if (P.carry) { up.rotation.set(-.45, 0, -k * .2); fo.rotation.set(-1.35, 0, 0); }
  });
  carry.forEach(b => b.visible = !!P.carry);
  if (P.throw > 0) { // wind up over the shoulder, then whip forward
   const th = P.throw, up = bones['upperArm.R'], rx = th < .4 ? -2.8 * th / .4 : -2.8 + 1.9 * (th - .4) / .6;
   up.rotation.set(rx, 0, -.15); bones['foreArm.R'].rotation.x = th < .4 ? -1.2 * th / .4 : -1.2 + 1.0 * (th - .4) / .6;
   bones.chest.rotation.y += -.45 * Math.sin(th * Math.PI);
  }
  group.updateMatrixWorld(true);
  const hands = [...(P.hands || [null, null])], feet = P.feet || [null, null];
  if (P.shield > 0 && !hands[1]) { // the right arm comes up over the eyes against the headlights
   const eyes = v.set(-.03, joints.headC[1] + .03, .2), now = arms[1].wrist.getWorldPosition(w); group.worldToLocal(now);
   hands[1] = now.lerp(eyes, P.shield).clone();
  }
  side.forEach((S, i) => {
   const k = i ? -1 : 1;
   if (hands[i]) { const tg = group.localToWorld(v.copy(hands[i])); pole.set(k * .55, joints.shoulder[1] - .35, -.35); group.localToWorld(pole); ik2(T, bones[`upperArm.${S}`], bones[`foreArm.${S}`], bones[`hand.${S}`], tg, pole); }
   if (feet[i]) { const tg = group.localToWorld(v.copy(feet[i])); pole.set(k * .1, joints.knee[1], .6); group.localToWorld(pole); ik2(T, bones[`thigh.${S}`], bones[`shin.${S}`], bones[`foot.${S}`], tg, pole); }
  });
 }
 update(0);
 return {group, update, head: bones.head, hit, arms, legs, materials, bones, carry, state, meshes: built.meshes};
}
