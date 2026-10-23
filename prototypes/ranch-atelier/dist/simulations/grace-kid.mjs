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
  o.material = new T.MeshStandardMaterial({color: 0xffffff, vertexColors: true, roughness: .9, flatShading: true, name: 'kid clothes and skin'});
  o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
 });
 // Hair and face details ride the head bone. Coordinates are in the 1.83 m source bind pose, facing +Z.
 const head = rig.getObjectByName('DEF-head');
 const hairM = new T.MeshStandardMaterial({color: PAL.hair, roughness: .85, flatShading: true, name: 'hair brown'});
 const dark = new T.MeshStandardMaterial({color: '#2a1d14', roughness: .5, name: 'eye dark'});
 const bit = (geo, mat, pos, scale, rot) => { const m = new T.Mesh(geo, mat); m.position.set(...pos); if (scale) m.scale.set(...scale); if (rot) m.rotation.set(...rot); m.castShadow = true; rig.add(m); rig.updateMatrixWorld(true); head.attach(m); return m; };
 if (head) {
  bit(new T.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * .56), hairM, [0, 1.758, -.012], [.094, .088, .095]); // the cap of hair
  bit(new T.SphereGeometry(1, 8, 6), hairM, [0, 1.755, -.1], [.05, .05, .05]);                                     // the hair tie
  bit(new T.CylinderGeometry(.035, .012, .2, 8), hairM, [0, 1.66, -.13], null, [.35, 0, 0]);                       // the ponytail
  bit(new T.BoxGeometry(.13, .03, .03), hairM, [0, 1.775, .085], null, [.3, 0, 0]);                                  // the fringe
  for (const x of [-.032, .032]) bit(new T.SphereGeometry(1, 8, 6), dark, [x, 1.712, .112], [.014, .016, .008]);
 }
 const bounds = new T.Box3().setFromObject(rig), h = bounds.max.y - bounds.min.y;
 const group = new T.Group(); group.name = 'kid'; group.add(rig);
 rig.scale.setScalar(KID_HEIGHT / h * 1.0); rig.position.y = -bounds.min.y * rig.scale.y;
 const headScale = 1.28; // children's heads are big for their bodies
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
 const update = dt => { mixer.update(dt); if (head) head.scale.setScalar(headScale); };
 play('idle', 0);
 group.userData = {rig, head, play, update, mixer, actions, height: KID_HEIGHT};
 return group;
}
