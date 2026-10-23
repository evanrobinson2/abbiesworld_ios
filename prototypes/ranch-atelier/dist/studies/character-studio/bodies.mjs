// AW-STUDY-0037 Character Studio: the bodies that wear the moves, and the actor that plays a move on one of them.
//   BODIES                            the cast list (wooden mannequin, smooth mannequin, the two Meshy brutes)
//   loadBody(T, loader, id, base)     -> actor {object, rig, play(move, t)}; object is 1.8 m tall, feet on y = 0
// The actor keeps the lowest foot on the floor every frame, so crouches, kneels and falls land without hand-tuned
// heights; a move's root y is then added on top as lift (jumps, swimming, hanging from a ledge).
import {rigMannequin, rigSkinned, applyPose} from './rig.mjs';
import {NEUTRAL} from './moves.mjs';

export const BODIES = [
 {id: 'mannequin', name: 'Wooden mannequin', url: 'models/mannequin.glb', kind: 'rigid'},
 {id: 'smooth', name: 'Smooth mannequin', url: 'models/mannequin-smooth.glb', kind: 'rigid'},
 {id: 'red', name: 'Red brute (Meshy)', url: '../brute-fight/red/fighter.glb', kind: 'skinned'},
 {id: 'blue', name: 'Blue brute (Meshy)', url: '../brute-fight/blue/fighter.glb', kind: 'skinned'},
];
const HEIGHT = 1.8;
let jointsP = null;

export async function loadBody(T, loader, id, base = import.meta.url) {
 const b = BODIES.find(x => x.id === id) || BODIES[0];
 jointsP ||= fetch(new URL('models/rest-joints.json', base)).then(r => r.json());
 const [J, gltf] = await Promise.all([jointsP, loader.loadAsync(new URL(b.url, base).href)]);
 const scene = gltf.scene;
 scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
 const rig = b.kind === 'rigid' ? rigMannequin(T, scene, J) : rigSkinned(T, scene, J);
 const object = new T.Group(), pivot = new T.Group();
 object.name = b.id; object.add(pivot); pivot.add(rig.holder);
 const s = HEIGHT / rig.height; pivot.scale.setScalar(s);
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
