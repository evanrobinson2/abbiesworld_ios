// bub, the black lab (AW-STUDY-0034 on Evan's look, 09:58Z): deep chest and a tuck-up, a broad head with a stop and a
// square muzzle, soft drop ears the sun glows through, an otter tail, a red collar with a brass tag. One skinned coat
// with welded normals and a fur bump, so a black dog reads by its rim and sheen instead of disappearing.
// Contract shared with the school jump (AW-STUDY-0032): faces +X.
// const dog = makeBlackLab(T); dog.update(dt, {speed, sit, wag, pant, look, lookUp}); dog.bark();
import {skeleton, figureBuilder, roleMaterial, storybookLook, furBump} from '../figure-kit.mjs';

export const BLACK_LAB_LOOK = {coat: '#1b1a1f', eye: '#5a3a20', nose: '#0d0c0e', collar: '#d83a3a', tag: '#c9a24a', tongue: '#df7482'};

const BONES = [
 ['pelvis', null, -.2, .47, 0], ['spine', 'pelvis', -.02, .47, 0], ['chest', 'spine', .16, .48, 0], ['neck', 'chest', .27, .53, 0],
 ['head', 'neck', .37, .66, 0], ['jaw', 'head', .43, .62, 0], ['ear.L', 'head', .40, .72, .075], ['ear.R', 'head', .40, .72, -.075],
 ['tail1', 'pelvis', -.29, .5, 0], ['tail2', 'tail1', -.39, .475, 0], ['tail3', 'tail2', -.48, .43, 0],
 ...[[1, 'L'], [-1, 'R']].flatMap(([k, s]) => [
  [`fUpper.${s}`, 'chest', .19, .42, k * .08], [`fLower.${s}`, `fUpper.${s}`, .2, .25, k * .08], [`fPaw.${s}`, `fLower.${s}`, .205, .06, k * .08],
  [`bThigh.${s}`, 'pelvis', -.22, .44, k * .08], [`bShin.${s}`, `bThigh.${s}`, -.17, .26, k * .08], [`bHock.${s}`, `bShin.${s}`, -.26, .13, k * .08], [`bPaw.${s}`, `bHock.${s}`, -.25, .045, k * .08],
 ]),
];

export function makeBlackLab(T, {look = BLACK_LAB_LOOK} = {}) {
 const group = new T.Group(); group.name = 'dog';
 const {bones, root} = skeleton(T, BONES); group.add(root);
 const B = figureBuilder(T, bones);
 const M = {
  fur: roleMaterial(T, 'black lab coat', {color: look.coat, roughness: .45, bump: furBump(T), bumpScale: 2, sheen: .55}),
  nose: roleMaterial(T, 'dog nose', {color: look.nose, roughness: .3}),
  eye: roleMaterial(T, 'dog eyes', {color: look.eye, roughness: .2}),
  shine: roleMaterial(T, 'eye shine', {color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .8}),
  collar: roleMaterial(T, 'dog collar', {color: look.collar, roughness: .55}),
  tag: roleMaterial(T, 'brass tag', {color: look.tag, roughness: .3, metalness: .85}),
  tongue: roleMaterial(T, 'dog tongue', {color: look.tongue, roughness: .4, skin: 1}),
 };
 for (const m of Object.values(M)) storybookLook(T, m, m === M.fur ? {rim: .5} : {});
 const ref = [0, 1, 0];
 // body, neck and the back of the head in one surface
 B.loft('fur', [
  {p: [-.32, .485, 0], r: [.085, .09], b: 'pelvis'}, {p: [-.26, .475, 0], r: [.115, .125], b: 'pelvis'},
  {p: [-.15, .475, 0], r: [.11, .112], b: [['pelvis', .6], ['spine', .4]]}, {p: [-.04, .465, 0], r: [.118, .13], b: 'spine'},
  {p: [.07, .45, 0], r: [.128, .155], b: [['spine', .5], ['chest', .5]]}, {p: [.16, .455, 0], r: [.13, .16], b: 'chest'},
  {p: [.245, .5, 0], r: [.108, .125], b: [['chest', .6], ['neck', .4]]}, {p: [.3, .565, 0], r: [.088, .097], b: 'neck'},
  {p: [.35, .625, 0], r: [.08, .085], b: [['neck', .5], ['head', .5]]},
 ], {n: 14, ref, cap0: true, capLen: .7, facet: .12});
 // the head: broad skull, a stop, a square muzzle
 B.loft('fur', [
  {p: [.315, .68, 0], r: [.07, .07], b: 'head'}, {p: [.35, .69, 0], r: [.094, .088], b: 'head'}, {p: [.40, .69, 0], r: [.1, .09], b: 'head'},
  {p: [.445, .682, 0], r: [.085, .08], b: 'head'}, {p: [.48, .66, 0], r: [.062, .058], k: 2.4, b: 'head'}, {p: [.53, .65, 0], r: [.058, .05], k: 2.6, b: 'head'},
  {p: [.572, .65, 0], r: [.052, .044], k: 2.6, b: 'head'},
 ], {n: 12, ref, cap0: true, cap1: true, capLen: .6, facet: .14});
 B.loft('fur', [{p: [.445, .618, 0], r: [.048, .028], b: 'jaw'}, {p: [.52, .603, 0], r: [.044, .024], k: 2.4, b: 'jaw'}, {p: [.56, .607, 0], r: [.034, .019], b: 'jaw'}], {n: 10, ref, cap0: true, cap1: true, capLen: .8, facet: .14});
 B.blob('tongue', [.53, .607, 0], [.028, .007, .021], 'jaw', {n: 8, rows: 4});
 B.blob('nose', [.588, .66, 0], [.02, .019, .03], 'head', {n: 10, rows: 5, facet: .2});
 for (const k of [1, -1]) {
  B.blob('eye', [.457, .705, k * .053], [.013, .016, .012], 'head', {n: 8, rows: 5});
  B.blob('shine', [.466, .711, k * .058], [.004, .004, .004], 'head', {n: 6, rows: 3});
  B.blob('fur', [.45, .724, k * .048], [.022, .011, .02], 'head', {n: 8, rows: 4, facet: .2}); // brow
  // drop ears, thin enough to glow when the sun is behind them
  B.loft('fur', [
   {p: [.395, .728, k * .078], r: [.012, .042], b: `ear.${k > 0 ? 'L' : 'R'}`}, {p: [.412, .675, k * .102], r: [.013, .052], b: `ear.${k > 0 ? 'L' : 'R'}`},
   {p: [.428, .61, k * .1], r: [.011, .04], b: `ear.${k > 0 ? 'L' : 'R'}`},
  ], {n: 8, ref: [1, 0, 0], cap0: true, cap1: true, capLen: 1.6, glow: 1, facet: .1});
  const s = k > 0 ? 'L' : 'R', z = k * .08;
  B.loft('fur', [
   {p: [.18, .48, z * .6], r: .056, b: 'chest'}, {p: [.19, .41, z], r: .052, b: [['chest', .3], [`fUpper.${s}`, .7]]}, {p: [.2, .3, z], r: [.044, .046], b: `fUpper.${s}`},
   {p: [.2, .25, z], r: .037, b: [[`fUpper.${s}`, .5], [`fLower.${s}`, .5]]}, {p: [.203, .13, z], r: .029, b: `fLower.${s}`}, {p: [.207, .055, z], r: .03, b: [[`fLower.${s}`, .5], [`fPaw.${s}`, .5]]},
  ], {n: 9, ref: [1, 0, 0], facet: .1});
  B.blob('fur', [.225, .03, z], [.046, .027, .035], `fPaw.${s}`, {n: 9, rows: 5, facet: .15});
  B.loft('fur', [
   {p: [-.23, .5, z * .45], r: .07, b: 'pelvis'}, {p: [-.21, .39, z * .9], r: .07, b: [['pelvis', .3], [`bThigh.${s}`, .7]]}, {p: [-.17, .28, z], r: .05, b: [[`bThigh.${s}`, .5], [`bShin.${s}`, .5]]},
   {p: [-.21, .2, z], r: .04, b: `bShin.${s}`}, {p: [-.26, .13, z], r: .031, b: [[`bShin.${s}`, .5], [`bHock.${s}`, .5]]}, {p: [-.252, .055, z], r: .03, b: [[`bHock.${s}`, .5], [`bPaw.${s}`, .5]]},
  ], {n: 9, ref: [1, 0, 0], facet: .1});
  B.blob('fur', [-.232, .03, z], [.046, .027, .035], `bPaw.${s}`, {n: 9, rows: 5, facet: .15});
 }
 B.lock('fur', [[-.29, .5, 0], [-.38, .47, 0], [-.46, .41, 0], [-.52, .33, 0]], .046, .013, ['tail1', 'tail2', 'tail3', 'tail3'], {n: 8, ref, cap0: false, facet: .1});
 B.loft('collar', [{p: [.275, .535, 0], r: [.097, .108], b: 'neck'}, {p: [.3, .565, 0], r: [.094, .104], b: 'neck'}], {n: 16, ref});
 B.blob('tag', [.31, .45, 0], [.016, .018, .006], 'neck', {n: 8, rows: 4});
 const built = B.build(M);
 const tongue = built.meshes.tongue;
 const hit = new T.Mesh(new T.SphereGeometry(1.2, 8, 6), new T.MeshBasicMaterial({visible: false})); hit.position.y = .5; hit.name = 'dog hit'; group.add(hit);
 const mouth = new T.Object3D(); mouth.name = 'mouth'; mouth.position.set(.12, -.01, 0); bones.jaw.add(mouth);

 const rest = Object.fromEntries(Object.entries(bones).map(([k, b]) => [k, b.position.clone()]));
 const state = {t: 0, phase: 0, gait: 'stand', barkT: 0, triangles: built.triangles};
 const GAITS = {walk: [0, .5, .75, .25], trot: [0, .5, .5, 0], gallop: [0, .1, .55, .65]}; // FL FR BL BR
 function update(dt, s = {}) {
  const P = {speed: 0, sit: 0, wag: .3, pant: false, look: 0, lookUp: 0, ...s};
  state.t += dt; state.barkT = Math.max(0, state.barkT - dt);
  const sp = Math.max(0, P.speed), gait = sp < .05 ? 'stand' : sp < 1.6 ? 'walk' : sp < 3.5 ? 'trot' : 'gallop'; state.gait = gait;
  state.phase += dt * (gait === 'stand' ? 0 : .8 + sp * .55);
  for (const [k, b] of Object.entries(bones)) { b.quaternion.identity(); b.position.copy(rest[k]); }
  const t = state.t, amp = Math.min(.62, .22 + sp * .1), off = GAITS[gait] || [0, 0, 0, 0], sit = P.sit;
  ['fUpper.L', 'fUpper.R', 'bThigh.L', 'bThigh.R'].forEach((name, i) => {
   if (gait === 'stand') return;
   const p = (state.phase + off[i]) * Math.PI * 2, sw = Math.sin(p) * amp, lift = Math.max(0, Math.cos(p)) * amp;
   const S = name.slice(-1);
   bones[name].rotation.z = sw;
   if (i < 2) bones[`fLower.${S}`].rotation.z = -lift * 1.5; else { bones[`bShin.${S}`].rotation.z = lift * .9; bones[`bHock.${S}`].rotation.z = -lift * 1.1; }
  });
  bones.pelvis.position.y = rest.pelvis.y - (gait === 'stand' ? 0 : Math.abs(Math.sin(state.phase * Math.PI * 2)) * .012) - sit * .17;
  bones.pelvis.rotation.z = sit * .55; bones.spine.rotation.z = sit * .1;
  for (const S of ['L', 'R']) {
   bones[`fUpper.${S}`].rotation.z += -sit * .62;
   bones[`bThigh.${S}`].rotation.z += sit * .95; bones[`bShin.${S}`].rotation.z += -sit * 2.2; bones[`bHock.${S}`].rotation.z += sit * 1.55;
  }
  const breath = Math.sin(t * (P.pant ? 9 : 2)) * (P.pant ? .02 : .01);
  bones.chest.scale.setScalar(1); bones.spine.rotation.x = breath * .3;
  bones.neck.rotation.set(0, P.look * .5, P.lookUp * .25 - sit * .35);
  bones.head.rotation.set(0, P.look * .4, P.lookUp * .55 + Math.sin(state.phase * Math.PI * 4) * .03 + (state.barkT > 0 ? .15 * Math.sin(state.barkT * 30) : 0));
  const wag = P.wag;
  bones.tail1.rotation.set(0, Math.sin(t * 15) * .55 * wag, .2 + wag * .25 - sit * .9); bones.tail2.rotation.set(0, Math.sin(t * 15 - .7) * .45 * wag, -.1);
  bones.tail3.rotation.set(0, Math.sin(t * 15 - 1.4) * .35 * wag, -.1);
  const open = state.barkT > 0 ? .35 * Math.min(1, state.barkT * 8) : P.pant ? .2 + .06 * Math.sin(t * 18) : 0;
  bones.jaw.rotation.z = -open; tongue.visible = !!P.pant || state.barkT > 0;
  for (const S of ['L', 'R']) bones[`ear.${S}`].rotation.x = (S === 'L' ? 1 : -1) * (Math.sin(t * 3) * .03 + (gait !== 'stand' ? Math.sin(state.phase * Math.PI * 4) * .12 : 0));
 }
 const bark = () => { state.barkT = .3; };
 update(0);
 return {group, update, bark, mouth, hit, head: bones.head, tail: bones.tail1, state, materials: M, bones, meshes: built.meshes};
}
