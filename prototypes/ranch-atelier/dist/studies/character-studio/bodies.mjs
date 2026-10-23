// AW-STUDY-0037 Character Studio: the bodies that wear the moves, and the actor that plays a move on one of them.
//   BODIES                            the cast list (wooden mannequin, smooth mannequin, the Midjourney characters built
//                                     from a recipe in characters.mjs, the two Meshy brutes)
//   loadBody(T, loader, id, base)     -> actor {object, rig, play(move, t)}; object is its height (1.8 m), feet on y = 0
// The actor keeps the lowest foot on the floor every frame, so crouches, kneels and falls land without hand-tuned
// heights; a move's root y is then added on top as lift (jumps, swimming, hanging from a ledge).
import {rigMannequin, rigSkinned, applyPose} from './rig.mjs';
import {NEUTRAL} from './moves.mjs';
import {CHARACTERS, buildCharacter} from './characters.mjs';

// hidden: off the cast for now. The brutes come back once the Meshy retexture and proper skin weights land (Evan,
// 14:12Z: the auto-weighted 3k mesh tears at the shoulder and its paint was projected, not UV-mapped).
// The Quaternius rig (CC0, animation-study-assets/) and the figure-kit children (AW-STUDY-0034) are tested, properly
// weighted bodies from elsewhere in the game; their bones are renamed onto ours.
const QUATERNIUS = {'DEF-hips': 'hips', 'DEF-spine.001': 'spine', 'DEF-spine.003': 'chest', 'DEF-neck': 'neck', 'DEF-head': 'head'};
const FIGURE = {hips: 'hips', spine: 'spine', chest: 'chest', neck: 'neck', head: 'head'};
for (const s of ['L', 'R']) {
 Object.assign(QUATERNIUS, {[`DEF-shoulder.${s}`]: `clavicle_${s}`, [`DEF-upper_arm.${s}`]: `upperarm_${s}`, [`DEF-forearm.${s}`]: `forearm_${s}`,
  [`DEF-hand.${s}`]: `hand_${s}`, [`DEF-thigh.${s}`]: `thigh_${s}`, [`DEF-shin.${s}`]: `shin_${s}`, [`DEF-foot.${s}`]: `foot_${s}`});
 Object.assign(FIGURE, {[`upperArm.${s}`]: `upperarm_${s}`, [`foreArm.${s}`]: `forearm_${s}`, [`hand.${s}`]: `hand_${s}`,
  [`thigh.${s}`]: `thigh_${s}`, [`shin.${s}`]: `shin_${s}`, [`foot.${s}`]: `foot_${s}`});
}
const QUATERNIUS_URL = '/animation-study-assets/AnimationLibrary_Godot_Standard.gltf';
export const BODIES = [
 {id: 'mannequin', name: 'Wooden mannequin', short: 'Wood', url: 'models/mannequin.glb', kind: 'rigid'},
 {id: 'smooth', name: 'Smooth mannequin', short: 'Smooth', url: 'models/mannequin-smooth.glb', kind: 'rigid'},
 {id: 'game', name: 'Game mannequin (Quaternius)', short: 'Game', url: QUATERNIUS_URL, kind: 'skinned', alias: QUATERNIUS, height: 1.8},
 {id: 'daddy', name: 'Young Daddy', short: 'Young Daddy', kind: 'skinned', alias: FIGURE, height: 1.35, face: true,
  make: async T => (await import('/simulations/figures/young-daddy.mjs')).makeYoungDaddy(T).group},
 {id: 'girl', name: 'The girl from Grace\'s basement', short: 'Girl', kind: 'skinned', alias: QUATERNIUS, height: 1.18, face: true,
  make: async () => (await import('/simulations/grace-kid.mjs')).loadGraceKid()},
 ...Object.entries(CHARACTERS).map(([id, c]) => ({id, name: c.name, short: c.short, kind: 'recipe', height: c.height, ref: c.ref, face: c.face, hidden: true})),
 {id: 'red', name: 'Red brute (Meshy)', short: 'Red brute', url: '../brute-fight/red/fighter.glb', kind: 'skinned', hidden: true},
 {id: 'blue', name: 'Blue brute (Meshy)', short: 'Blue brute', url: '../brute-fight/blue/fighter.glb', kind: 'skinned', hidden: true},
];
const HEIGHT = 1.8;
let jointsP = null;

export async function loadBody(T, loader, id, base = import.meta.url) {
 const b = BODIES.find(x => x.id === id) || BODIES[0];
 jointsP ||= fetch(new URL('models/rest-joints.json', base)).then(r => r.json());
 let J, scene;
 if (b.kind === 'recipe') ({scene, J} = buildCharacter(T, b.id));
 else if (b.make) [J, scene] = await Promise.all([jointsP, b.make(T)]);
 else { let gltf; [J, gltf] = await Promise.all([jointsP, loader.loadAsync(new URL(b.url, base).href)]); scene = gltf.scene; }
 scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
 const rig = b.kind !== 'skinned' ? rigMannequin(T, scene, J) : rigSkinned(T, scene, J, b.alias);
 const object = new T.Group(), pivot = new T.Group();
 object.name = b.id; object.add(pivot); pivot.add(rig.holder);
 const s = (b.height || HEIGHT) / rig.height; pivot.scale.setScalar(s);
 // the lowest point of the body: ankles, plus knees, hands, hips, chest and head padded by how thick they are
 // (fractions of hip height), so a roll, a flip or a fall rests on the floor instead of sinking through it
 const PAD = {foot_L: 0, foot_R: 0, shin_L: .05, shin_R: .05, hand_L: .02, hand_R: .02, hips: .1, chest: .12, head: .2};
 const ankle = () => {
  object.updateMatrixWorld(true);
  const inv = new T.Matrix4().copy(object.matrixWorld).invert(), v = new T.Vector3();
  let low = Infinity;
  for (const [b, pad] of Object.entries(PAD)) if (rig.bones[b]) low = Math.min(low, rig.bones[b].getWorldPosition(v).applyMatrix4(inv).y - pad * rig.hipY * s);
  return low;
 };
 applyPose(T, rig, NEUTRAL);
 const restAnkle = ankle() - pivot.position.y;
 const actor = {object, rig, body: b, scale: s, hip: rig.hipY * s,
  pose(p) {
   applyPose(T, rig, p);
   pivot.position.y = 0;
   pivot.position.y = restAnkle - ankle() + (p.root ? p.root[1] * rig.hipY * s : 0);
  },
  play(move, t) { const p = move.fn(t); this.pose(p); return p; }};
 return actor;
}
