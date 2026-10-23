// 3D face and body for the face kit (AW-STUDY-0039). One toy character, three ways to show a feeling:
// - 'rig': bone face (eyeballs, lids and brows are jointed parts) + blendshapes (the mouth is one mesh with morph
//   targets for jaw, wide, pucker, smile and frown) + decals (blush, tears, sweat, eye sparkle)
// - 'painted': the face is a texture redrawn from the swap sheet (drawFace2D), like cut-out and LEGO games
// - 'faceless': a blank wooden head; the body says it all (chest, shoulders, lean, head, arms)
// The body always acts, whatever the face mode. Everything here is world layer: a face is part of the character.
import {drawFace2D} from './face-kit.mjs';

// Arm poses as joint angles: fwd swings the upper arm forward, out lifts it sideways, bend folds the elbow forward,
// twist turns the forearm in (-) or out (+). One side's numbers; the other side mirrors. L/R entries for asymmetry.
export const ARM_POSES = {
 rest: {fwd: .05, out: .14, bend: .25, twist: 0}, up: {fwd: .25, out: 2.55, bend: .3, twist: 0},
 belly: {fwd: .55, out: .35, bend: 1.55, twist: -.4}, droop: {fwd: -.05, out: .05, bend: .05, twist: 0},
 cross: {fwd: .85, out: .2, bend: 1.95, twist: -.55}, out: {fwd: .45, out: .95, bend: .65, twist: .2},
 clutch: {fwd: .7, out: .12, bend: 2.15, twist: -.45}, push: {fwd: 1.25, out: .3, bend: .35, twist: 0},
 chin: {L: {fwd: .55, out: .12, bend: 1.7, twist: -.6}, R: {fwd: .75, out: .25, bend: 2.45, twist: -.2}},
 hips: {fwd: -.05, out: .8, bend: .3, twist: -1.55}, behind: {fwd: -.5, out: .18, bend: .35, twist: -.7},
 fists: {fwd: .55, out: .3, bend: 1.8, twist: -.2}, rub: {fwd: .8, out: .1, bend: 1.75, twist: -.5},
 hug: {fwd: .9, out: .2, bend: 1.9, twist: -.6}, shrug: {fwd: .3, out: .2, bend: 1.45, twist: .95},
};

const ease = (c, t, dt, r) => c + (t - c) * (1 - Math.exp(-dt * r));

export function makeFaceCharacter(T, {skin = '#f2c6a0', hair = '#6b4630', shirt = '#5aa7a0', pants = '#3f4f78', wood = '#c89a62', iris = '#5a3b26'} = {}) {
 const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .62, ...o});
 const M = {skin: mat(skin, {roughness: .55}), hair: mat(hair, {roughness: .8}), shirt: mat(shirt, {roughness: .85}), pants: mat(pants, {roughness: .9}),
  wood: mat(wood, {roughness: .5}), white: mat('#fbf8f2', {roughness: .4, emissive: '#3a3633'}), iris: mat(iris, {roughness: .3}), pupil: mat('#120c09', {roughness: .2}),
  lip: mat('#c8746c', {roughness: .5}), shoe: mat('#3a2c26', {roughness: .7})};
 const cap = (r, len, m) => { const g = new T.CapsuleGeometry(r, len, 6, 14); g.translate(0, -len / 2 - r * .6, 0); const me = new T.Mesh(g, m); me.castShadow = true; return me; };
 const joint = (parent, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };

 const root = new T.Group(); root.name = 'face-study-toy';
 const hips = joint(root, 0, .54, 0);
 const pelvis = new T.Mesh(new T.SphereGeometry(.12, 20, 14), M.pants); pelvis.scale.set(1.15, .7, .85); hips.add(pelvis); pelvis.castShadow = true;
 const spine = joint(hips, 0, .04, 0);
 const torso = new T.Mesh(new T.CapsuleGeometry(.12, .16, 6, 16), M.shirt); torso.position.y = .14; torso.scale.set(1.1, 1, .8); torso.castShadow = true; spine.add(torso);
 const chest = joint(spine, 0, .22, 0);
 const neck = joint(chest, 0, .09, 0);
 const neckM = new T.Mesh(new T.CylinderGeometry(.04, .045, .08, 12), M.skin); neckM.position.y = .02; neck.add(neckM);
 const head = joint(neck, 0, .07, 0);
 const R = .2; // head radius; a toy head is big so the face reads
 const headM = new T.Mesh(new T.SphereGeometry(R, 48, 36), M.skin); headM.position.y = R * .95; headM.scale.set(1, 1.04, .97); headM.castShadow = true; head.add(headM);
 const faceRoot = new T.Group(); faceRoot.position.copy(headM.position); head.add(faceRoot);
 const woodHead = new T.Mesh(new T.SphereGeometry(R, 40, 30), M.wood); woodHead.position.copy(headM.position); woodHead.scale.set(.92, 1.12, .95); woodHead.castShadow = true; head.add(woodHead);

 // hair: a cap and a tuft, generic (this toy is nobody in the family)
 const hairCap = new T.Mesh(new T.SphereGeometry(R * 1.04, 40, 20, 0, Math.PI * 2, 0, Math.PI * .42), M.hair); hairCap.rotation.x = -.32; faceRoot.add(hairCap);
 const tuft = new T.Mesh(new T.SphereGeometry(.05, 12, 10), M.hair); tuft.position.set(.03, R * 1.02, .06); tuft.scale.set(1.4, .6, 1); faceRoot.add(tuft);
 const ears = [-1, 1].map(s => { const e = new T.Mesh(new T.SphereGeometry(.035, 12, 10), M.skin); e.position.set(s * R * .98, -.01, -.01); e.scale.set(.6, 1, .9); faceRoot.add(e); return e; });
 const nose = new T.Mesh(new T.SphereGeometry(.026, 14, 10), M.skin); nose.position.set(0, -.04, R * .98); nose.scale.set(1, .8, .9); faceRoot.add(nose);

 // a point on the head surface by angles (u around, v up) and a frame facing out of it
 const onHead = (u, v, lift = 0) => { const r = R + lift; return new T.Vector3(r * Math.sin(u) * Math.cos(v), r * Math.sin(v) * 1.04, r * Math.cos(u) * Math.cos(v) * .97); };
 const socket = (u, v, lift = 0) => { const g = new T.Group(); const p = onHead(u, v, lift); g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2)); faceRoot.add(g); return g; };

 // ---- the rig face
 const rig = new T.Group(); faceRoot.add(rig);
 const eyes = [1, -1].map(side => { // side 1 = character's left (+x)
  const so = socket(side * .36, .06, -.012); rig.add(so); const er = .052;
  const ball = new T.Group(); so.add(ball);
  const white = new T.Mesh(new T.SphereGeometry(er, 24, 18), M.white); ball.add(white);
  const irisM = new T.Mesh(new T.SphereGeometry(er * .55, 18, 12), M.iris); irisM.position.z = er * .86; irisM.scale.z = .4; ball.add(irisM);
  const pupilM = new T.Mesh(new T.SphereGeometry(er * .3, 14, 10), M.pupil); pupilM.position.z = er * .97; pupilM.scale.z = .35; ball.add(pupilM);
  const glint = new T.Mesh(new T.SphereGeometry(er * .13, 10, 8), new T.MeshBasicMaterial({color: '#fff'})); glint.position.set(er * .25, er * .3, er * .93); so.add(glint);
  const lidG = new T.SphereGeometry(er * 1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const upper = new T.Mesh(lidG, new T.MeshStandardMaterial({color: new T.Color(skin).multiplyScalar(.9), roughness: .6, side: T.DoubleSide}));
  const lower = new T.Mesh(new T.SphereGeometry(er * 1.1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), upper.material);
  const lids = new T.Group(); so.add(lids); const up = new T.Group(), lo = new T.Group(); lids.add(up, lo);
  // the lids' hinge runs across the eye; the hemisphere opens toward the face's front
  upper.rotation.x = Math.PI / 2; up.add(upper); lower.rotation.x = Math.PI / 2; lo.add(lower);
  const lash = new T.Mesh(new T.TorusGeometry(er * 1.12, .006, 6, 24, Math.PI), M.pupil); lash.rotation.z = Math.PI; // the lid edge's front half once the lid opens up.add(lash);
  const brow = new T.Mesh(new T.CapsuleGeometry(.012, .07, 4, 10), M.hair); brow.rotation.z = Math.PI / 2;
  const browJ = socket(side * .33, .3, .004); rig.add(browJ); browJ.add(brow);
  return {side, so, ball, glint, up, lo, lids, browJ, browBase: browJ.position.clone()};
 });

 // blendshape mouth: a lip ring and a mouth cavity, each with morph targets built from the same lip-loop recipe
 const N = 14;
 const loop = (p, inner) => { // returns 2N points (upper lip left->right, lower lip right->left) in mouth space
  const hw = .055 * (1 + .45 * p.wide - .5 * p.pucker) * (inner ? .84 : 1), corner = .02 * p.smile - .022 * p.frown;
  const up = .007 + .004 * p.jaw + .006 * p.pucker - .004 * p.smile - (inner ? .0062 : 0);
  const lo = -.008 - .052 * p.jaw - .01 * p.pucker - .006 * p.smile * (1 + 2 * p.jaw) + (inner ? .0062 : 0);
  const ex = 1.7 - .9 * p.pucker, pts = [];
  for (let i = 0; i <= N; i++) { const t = -1 + 2 * i / N; pts.push([t * hw, corner + (up - corner) * (1 - Math.abs(t) ** ex)]); }
  for (let i = N - 1; i > 0; i--) { const t = -1 + 2 * i / N; pts.push([t * hw, corner + (lo - corner) * (1 - Math.abs(t) ** ex)]); }
  return pts;
 };
 const curve = (x, y) => -(x * x) * 3.2 - (y * y) * 1.2; // follow the head's roundness
 const P0 = {jaw: 0, wide: 0, pucker: 0, smile: 0, frown: 0}, TARGETS = ['jaw', 'wide', 'pucker', 'smile', 'frown'];
 function morphMesh(build, material) {
  const pos = build(P0); const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos.positions, 3));
  g.setIndex(pos.index); if (pos.colors) g.setAttribute('color', new T.Float32BufferAttribute(pos.colors, 3));
  g.morphAttributes.position = TARGETS.map(k => { const q = build({...P0, [k]: 1}).positions; return new T.Float32BufferAttribute(q.map((v, i) => v - pos.positions[i]), 3); });
  g.morphTargetsRelative = true; g.computeVertexNormals(); const m = new T.Mesh(g, material); m.morphTargetInfluences = TARGETS.map(() => 0); return m;
 }
 const ring = p => { const o = loop(p, false), n = loop(p, true), positions = [], index = [];
  for (const [x, y] of o) positions.push(x, y, curve(x, y) + .003); for (const [x, y] of n) positions.push(x, y, curve(x, y) + .0035);
  const L = o.length; for (let i = 0; i < L; i++) { const j = (i + 1) % L; index.push(i, j, L + i, j, L + j, L + i); } return {positions, index}; };
 const cavity = p => { const n = loop(p, true), positions = [0, 0, curve(0, 0) + .001], colors = [.2, .05, .06], index = [];
  const lowY = Math.min(...n.map(q => q[1]));
  n.forEach(([x, y], i) => { positions.push(x, y, curve(x, y) + .0012); const tongue = i > N ? .7 : 0; colors.push(.22 + tongue * .6, .06 + tongue * .25, .08 + tongue * .25); void lowY; });
  for (let i = 0; i < n.length; i++) index.push(0, 1 + i, 1 + (i + 1) % n.length); return {positions, index, colors}; };
 const mouth = socket(0, -.36, 0); rig.add(mouth);
 const lipM = morphMesh(ring, new T.MeshStandardMaterial({color: '#c8746c', roughness: .45, side: T.DoubleSide}));
 const cavM = morphMesh(cavity, new T.MeshBasicMaterial({vertexColors: true, side: T.DoubleSide}));
 const teeth = new T.Mesh(new T.BoxGeometry(.06, .012, .004), M.white); teeth.position.set(0, .001, -.0005);
 mouth.add(cavM, teeth, lipM);

 // decals: blush, a tear on each side, a sweat drop
 const decal = (c, r, o = .0) => new T.Mesh(new T.CircleGeometry(r, 24), new T.MeshBasicMaterial({color: c, transparent: true, opacity: o, depthWrite: false}));
 const blush = [1, -1].map(s => { const so = socket(s * .52, -.17, .003); rig.add(so); const d = decal('#ff7f8f', .045); d.scale.y = .62; so.add(d); return d; });
 const dropMat = new T.MeshStandardMaterial({color: '#8fd0ff', roughness: .05, transparent: true, opacity: 0});
 const tears = [1, -1].map(s => { const d = new T.Mesh(new T.SphereGeometry(.012, 10, 8), dropMat); d.scale.y = 1.5; rig.add(d); return {d, s}; });
 const sweat = new T.Mesh(new T.SphereGeometry(.018, 12, 10), dropMat.clone()); sweat.scale.y = 1.5; rig.add(sweat);

 // ---- the painted face: a front shell of the head with a canvas texture redrawn from the swap sheet
 const can = document.createElement('canvas'); can.width = can.height = 512; const ctx = can.getContext('2d');
 const tex = new T.CanvasTexture(can); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
 const shell = new T.Mesh(new T.SphereGeometry(R * 1.004, 48, 32, Math.PI / 2 - 1, 2, Math.PI / 2 - 1, 2), new T.MeshStandardMaterial({map: tex, transparent: true, roughness: .55, depthWrite: false}));
 shell.scale.set(1, 1.04, .97); faceRoot.add(shell);

 // ---- limbs
 const arms = [1, -1].map(side => {
  const sh = joint(chest, side * .15, .06, 0); const up = cap(.038, .14, M.shirt); sh.add(up);
  const el = joint(sh, 0, -.2, 0); const fo = cap(.033, .13, M.skin); el.add(fo);
  const hand = new T.Mesh(new T.SphereGeometry(.04, 14, 10), M.skin); hand.position.y = -.21; hand.scale.set(.9, 1.1, .7); el.add(hand);
  return {side, sh, el, cur: {...ARM_POSES.rest}};
 });
 const legs = [1, -1].map(side => {
  const th = joint(hips, side * .065, -.02, 0); const tm = cap(.05, .16, M.pants); th.add(tm);
  const kn = joint(th, 0, -.25, 0); const sm = cap(.042, .15, M.pants); kn.add(sm);
  const foot = new T.Mesh(new T.SphereGeometry(.05, 14, 10), M.shoe); foot.position.set(0, -.25, .03); foot.scale.set(.85, .55, 1.4); kn.add(foot);
  return {th, kn};
 });

 let mode = 'rig', lastPaint = -1;
 function setMode(m) {
  mode = m; rig.visible = m === 'rig'; shell.visible = m === 'painted';
  const faceless = m === 'faceless'; woodHead.visible = faceless; headM.visible = !faceless; hairCap.visible = tuft.visible = nose.visible = !faceless;
  ears.forEach(e => e.visible = !faceless);
  for (const o of [torso, pelvis]) o.material = faceless ? M.wood : (o === torso ? M.shirt : M.pants);
  for (const a of arms) a.sh.traverse(o => { if (o.isMesh) o.material = faceless ? M.wood : (o.geometry.type === 'CapsuleGeometry' && o.parent === a.sh ? M.shirt : M.skin); });
  for (const l of legs) l.th.traverse(o => { if (o.isMesh) o.material = faceless ? M.wood : (o.geometry.type === 'SphereGeometry' ? M.shoe : M.pants); });
  neckM.material = faceless ? M.wood : M.skin;
 }
 setMode('rig');

 // Apply a FaceDriver state. bodyGain lets the far camera push the body harder too.
 function update(S, dt, {bodyGain = 1} = {}) {
  const t = S.time || 0, bg = bodyGain;
  // body: breathing, idle bounce, lean, chest, shoulders, head
  const bounce = S.bounce ?? .3;
  hips.position.y = .54 + Math.abs(Math.sin(t * Math.PI * (1 + bounce * 1.6))) * .012 * bounce * bg - Math.max(0, -S.chest) * .015;
  spine.rotation.x = (S.lean * .28 - Math.max(0, -S.chest) * .18) * bg; chest.rotation.x = -Math.max(0, S.chest) * .12 * bg;
  torso.scale.set(1.1 + S.chest * .04 * bg, 1 + S.breath * .012, .8 + S.chest * .06 * bg);
  head.rotation.set(-S.nod * .38 * bg, S.turn * .55 * bg, -S.tilt * .32 * bg);
  neck.rotation.x = -S.nod * .1 * bg;
  for (const L of legs) { const k = Math.max(0, -S.lean) * .1; L.th.rotation.x = -k - .04; L.kn.rotation.x = k * 2 + .08; }
  // arms ease to the pose; a few poses move (rubbing hands, laughing, waving cheer)
  for (const a of arms) {
   const P = ARM_POSES[S.arms] || ARM_POSES.rest, p = P.L ? (a.side > 0 ? P.L : P.R) : P;
   for (const k of ['fwd', 'out', 'bend', 'twist']) a.cur[k] = ease(a.cur[k], p[k], dt, 6);
   let wob = 0; if (S.arms === 'rub') wob = Math.sin(t * 9 + a.side) * .12; if (S.arms === 'up') wob = Math.sin(t * 7 + a.side * 1.5) * .18; if (S.arms === 'belly') wob = Math.sin(t * 14) * .06;
   a.sh.position.y = .06 + S.shoulders * .035 * bg;
   a.sh.rotation.set(-(a.cur.fwd + wob * .5) * bg ** .5, 0, a.side * (a.cur.out + (S.arms === 'up' ? wob : 0)));
   a.el.rotation.set(-(a.cur.bend + wob), 0, a.side * a.cur.twist);
  }
  if (mode === 'rig') {
   for (const e of eyes) {
    const k = e.side > 0 ? 'L' : 'R', lid = (S['lid' + k] ?? .78) * (1 - (S.blink || 0)), sq = S['squint' + k] ?? 0, bIn = S['browIn' + k] ?? 0, bUp = S['browUp' + k] ?? 0;
    e.ball.rotation.set(-(S.eyeY ?? 0) * .4, (S.eyeX ?? 0) * .5, 0);
    const ps = S.pupil ?? 1; e.ball.children[2].scale.set(ps ** .6, ps ** .6, .4);
    e.up.rotation.x = .03 - Math.min(1.08, lid) * 2.5; // shut covers the front; wide folds back under the brow
    e.lo.rotation.x = -.67 - sq * 1.1 * (1 - (S.blink || 0) * .5);
    e.lids.rotation.z = -e.side * bIn * .28;
    e.glint.scale.setScalar(.8 + (S.sparkle || 0) * 1.1);
    e.browJ.position.copy(e.browBase); e.browJ.translateY(bUp * .028 + bIn * .006); e.browJ.rotation.z = e.side * bIn * .42 + e.side * .05;
   }
   const sm = ((S.smileL ?? 0) + (S.smileR ?? 0)) / 2;
   const infl = [S.mouthJaw ?? S.jaw, S.mouthWide ?? S.wide, S.mouthPucker ?? S.pucker, Math.max(0, sm), Math.max(0, -sm)];
   infl[0] *= 1 - (S.press || 0);
   lipM.morphTargetInfluences.splice(0, 5, ...infl); cavM.morphTargetInfluences.splice(0, 5, ...infl);
   mouth.rotation.z = ((S.smileL ?? 0) - (S.smileR ?? 0)) * .12; // a lopsided smile tips the mouth
   teeth.visible = infl[0] > .12 || (S.teeth || 0) > .3; teeth.position.y = .004 + infl[0] * .002 - sm * .002;
   blush.forEach(b => b.material.opacity = Math.min(1, S.blush || 0) * .6);
   for (const {d, s} of tears) { const ph = (t * .5 + (s > 0 ? 0 : .5)) % 1; d.position.copy(onHead(s * .4, -.02 - ph * .3, .006)); }
   dropMat.opacity = Math.min(1, S.tear || 0) * .85;
   sweat.material.opacity = Math.min(1, S.sweat || 0) * .9; sweat.position.copy(onHead(.62, .42 - ((t * .3) % 1) * .2, .006));
  } else if (mode === 'painted' && t - lastPaint > 1 / 30) {
   lastPaint = t; drawFace2D(ctx, S, {head: false, swap: true, skin, hair, iris, scale: 1.12}); tex.needsUpdate = true;
  }
 }
 // head-top point in world space, for a spatial bubble
 const headTop = (v = new T.Vector3()) => headM.getWorldPosition(v).add(new T.Vector3(0, R * 1.5, 0));
 return {root, head: headM, update, setMode, get mode() { return mode; }, headTop, headRadius: R};
}
