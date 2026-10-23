// AW-STUDY-0037 Character Studio: the "next characters", built as engineered parts from a recipe, not image-to-3D.
// Concept art: Midjourney grids on branch character-studio-mj, tools/midjourney/outputs/character-studio/ (provenance.json
// in each folder). Each character is the wooden mannequin's 30 named parts with its own proportions, shapes and
// clothes, so rigMannequin parents it to the same 20 bones and it plays every move. Accessories (hats, packs, swords)
// ride on the part they belong to.
//   CHARACTERS                      {id: {name, height (m), ref (concept picture), face}}
//   buildCharacter(T, id)           -> {scene, J}: a Group of named meshes and its own rest joints (rest-joints.json form)
// Units are the mannequin's (8 to a figure); the character faces +Z, x is the figure's left.
// Materials are named by what they are (skin, jacket, suit, boots, hair...), the shading roles the looks read.

export const CHARACTERS = {
 adventurer: {name: 'Clay adventurer', short: 'Adventurer', height: 1.15, face: true,
  ref: 'tools/midjourney/outputs/character-studio/1-claymation-adventurer/grid-1.png'},
 inventor: {name: 'Plasticine inventor', short: 'Inventor', height: 1.85, face: true,
  ref: 'tools/midjourney/outputs/character-studio/2-plasticine-inventor/grid-3.png'},
 stickman: {name: 'Stick man', short: 'Stick man', height: 1.7, face: true,
  ref: 'tools/midjourney/outputs/character-studio/3-stick-man/grid-2.png'},
 hero: {name: '80s action hero', short: 'Hero', height: 1.95, face: true,
  ref: 'tools/midjourney/outputs/character-studio/4-80s-action-hero/grid-3.png'},
};

// rest joints from proportions (same A-pose as the mannequin: arms 22 degrees off the body)
function joints(p) {
 const A = 22 * Math.PI / 180, sx = Math.sin(A), sy = -Math.cos(A);
 const hy = p.ankle + p.shin + p.thigh, wy = hy + p.belly, ny = wy + p.chest, cy = ny + p.head;
 const J = {hc: [0, hy, 0], waist: [0, wy, -.04], neck: [0, ny, 0], crown: [0, cy, .05]};
 for (const [s, x] of [['R', -1], ['L', 1]]) {
  J['h' + s] = [x * p.hipX, hy, 0]; J['k' + s] = [x * p.hipX, hy - p.thigh, .02]; J['a' + s] = [x * p.hipX, p.ankle, 0];
  J['t' + s] = [x * p.hipX, p.ankle * .3, p.foot];
  const sh = [x * p.shX, ny - p.shDrop, -.02], e = [sh[0] + x * sx * p.upper, sh[1] + sy * p.upper, -.02];
  const w = [e[0] + x * sx * p.fore, e[1] + sy * p.fore, -.02], f = [w[0] + x * sx * p.hand, w[1] + sy * p.hand, -.02];
  Object.assign(J, {['s' + s]: sh, ['e' + s]: e, ['w' + s]: w, ['f' + s]: f});
 }
 return J;
}
const PROPORTIONS = {
 // squat and round: short legs, a big head under a big hat
 adventurer: {ankle: .3, shin: .85, thigh: .85, hipX: .42, belly: 1.05, chest: 1.15, head: 2.2, shX: .95, shDrop: .35, upper: .9, fore: .8, hand: .42, foot: .75},
 // tall and thin, long legs, a long neck
 inventor: {ankle: .15, shin: 2.3, thigh: 2.15, hipX: .28, belly: 1.3, chest: 1.5, head: 1.55, shX: .62, shDrop: .3, upper: 1.45, fore: 1.35, hand: .55, foot: .95},
 stickman: {ankle: .1, shin: 2.1, thigh: 2.0, hipX: .2, belly: 1.4, chest: 1.4, head: 1.25, shX: .25, shDrop: .25, upper: 1.35, fore: 1.3, hand: .35, foot: .45},
 // the hero: broad shoulders, a V torso, a small head
 hero: {ankle: .15, shin: 2.0, thigh: 2.05, hipX: .38, belly: 1.3, chest: 1.75, head: 1.15, shX: 1.05, shDrop: .3, upper: 1.35, fore: 1.3, hand: .6, foot: .8},
};

export function buildCharacter(T, id) {
 const J = joints(PROPORTIONS[id]), P = k => new T.Vector3(...J[k]), scene = new T.Group(), mats = {};
 scene.name = id;
 const mat = (name, color, o = {}) => mats[name] ||= Object.assign(new T.MeshStandardMaterial({color, roughness: o.rough ?? .7, metalness: 0,
  flatShading: !!o.flat}), {name}, {userData: {own: true}});
 const UP = new T.Vector3(0, 1, 0);
 const mesh = (name, geo, m, parent = scene) => { const o = new T.Mesh(geo, m); o.name = name; parent.add(o); return o; };
 // a limb piece from a to b: tapered from r0 to r1, swelling by bulge in the middle
 const seg = (name, a, b, r0, r1, m, {bulge = 0, radial = 12, parent} = {}) => {
  const d = b.clone().sub(a), len = d.length(), g = new T.CylinderGeometry(r1, r0, len, radial, 6);
  if (bulge) { const v = g.attributes.position; for (let i = 0; i < v.count; i++) { const t = v.getY(i) / len + .5, f = 1 + bulge * Math.sin(Math.PI * t); v.setX(i, v.getX(i) * f); v.setZ(i, v.getZ(i) * f); } g.computeVertexNormals(); }
  const o = mesh(name, g, m, parent); o.position.copy(a).add(b).multiplyScalar(.5); o.quaternion.setFromUnitVectors(UP, d.normalize()); return o;
 };
 const ball = (name, p, r, m, parent) => { const o = mesh(name, new T.SphereGeometry(r, 16, 12), m, parent); o.position.copy(p); return o; };
 const blob = (name, p, [rx, ry, rz], m, {parent, rot} = {}) => {
  const o = mesh(name, new T.SphereGeometry(1, 20, 14), m, parent); o.position.copy(p); o.scale.set(rx, ry, rz); if (rot) o.rotation.set(...rot); return o;
 };
 const ring = (name, p, r, tube, m, parent) => { const o = mesh(name, new T.TorusGeometry(r, tube, 8, 24), m, parent); o.position.copy(p); o.rotation.x = Math.PI / 2; return o; };
 const box = (name, p, [x, y, z], m, parent) => { const o = mesh(name, new T.BoxGeometry(x, y, z), m, parent); o.position.copy(p); return o; };
 // accessories are positioned in character space, then hung on their part (rigMannequin moves the part, they follow)
 const hang = (part, o) => { part.updateMatrixWorld(true); o.updateMatrixWorld(true); part.attach(o); return o; };
 const mid = (a, b, t = .5) => P(a).lerp(P(b), t);
 const S = ['L', 'R'];
 const eyes = (head, at, {r, gap, pupil = .45, white = '#fbfaf5', look = 0}) => {
  for (const x of [-1, 1]) {
   const e = ball('eye', at.clone().add(new T.Vector3(x * gap, 0, 0)), r, mat('eye_white', white, {rough: .3}));
   ball('pupil', new T.Vector3(x * gap + look * r * .3, at.y, at.z + r * .78), r * pupil, mat('eye_pupil', '#15121a', {rough: .3}), e).position.set(look * r * .25, 0, r * .72);
   hang(head, e);
  }
 };

 if (id === 'adventurer') {
  const jacket = mat('jacket_clay', '#e8457f', {rough: .85}), teal = mat('trim_clay', '#1f9e9a', {rough: .85}), shorts = mat('shorts_clay', '#f2c230', {rough: .85});
  const face = mat('skin_clay', '#eba78e', {rough: .8}), boots = mat('boots_clay', '#178a8a', {rough: .85}), pack = mat('pack_clay', '#9c8f74', {rough: .9});
  const sole = mat('sole_clay', '#8a6448', {rough: .9}), sock = mat('sock_clay', '#f3ead8', {rough: .9}), strap = mat('strap_clay', '#f2c230', {rough: .85});
  blob('pelvis', P('hc').add(new T.Vector3(0, .1, 0)), [.82, .55, .66], shorts);
  seg('abdomen', P('hc'), P('waist'), 1.0, 1.05, jacket, {bulge: .08});
  blob('chest', mid('waist', 'neck', .45), [1.08, .85, .86], jacket);
  ring('waist_joint', P('hc').add(new T.Vector3(0, .25, 0)), .98, .14, teal);
  seg('neck', P('neck').add(new T.Vector3(0, -.3, 0)), P('neck').add(new T.Vector3(0, .25, 0)), .55, .5, teal);
  const head = blob('head', P('neck').add(new T.Vector3(0, .95, .05)), [.95, 1.0, .9], face);
  eyes(head, P('neck').add(new T.Vector3(0, 1.12, .72)), {r: .36, gap: .36, pupil: .45});
  hang(head, blob('nose', P('neck').add(new T.Vector3(.05, .82, .95)), [.2, .17, .17], jacket));
  const hat = mat('hat_clay', '#f2c230', {rough: .85}), hatTop = mat('hat_crown_clay', '#1f9e9a', {rough: .85});
  const brim = mesh('hat_brim', new T.CylinderGeometry(1.45, 1.5, .12, 24), hat); brim.position.copy(P('neck').add(new T.Vector3(0, 1.62, .05)));
  const crownH = mesh('hat_crown', new T.SphereGeometry(.85, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hatTop); crownH.position.copy(P('neck').add(new T.Vector3(0, 1.66, .02)));
  const band = ring('hat_band', P('neck').add(new T.Vector3(0, 1.7, .02)), .86, .1, hat);
  for (const o of [brim, crownH, band]) hang(head, o);
  const chest = scene.getObjectByName('chest');
  const bag = hang(chest, box('backpack', mid('waist', 'neck', .45).add(new T.Vector3(0, 0, -.98)), [1.2, .95, .4], pack));
  hang(bag, blob('backpack_flap', mid('waist', 'neck', .62).add(new T.Vector3(0, 0, -1.12)), [.62, .3, .18], pack));
  // the puffy hood bunched round the neck, and the pack's yellow strap tied at the front
  hang(chest, blob('hood', P('neck').add(new T.Vector3(0, -.05, -.2)), [1.05, .55, .85], jacket));
  hang(chest, blob('hood_back', P('neck').add(new T.Vector3(0, .55, -.62)), [.85, .75, .35], jacket));
  hang(chest, ring('strap', P('neck').add(new T.Vector3(0, -.45, .1)), .95, .08, strap));
  for (const s of S) {
   ball('hip_' + s, P('h' + s), .3, shorts);
   seg('thigh_' + s, P('h' + s), P('k' + s).add(new T.Vector3(0, .15, 0)), .48, .46, shorts);
   ball('knee_' + s, P('k' + s), .2, face);
   seg('shin_' + s, P('k' + s), P('a' + s), .19, .18, face);
   hang(scene.getObjectByName('shin_' + s), ring('sock', P('a' + s).add(new T.Vector3(0, .32, 0)), .2, .08, sock));
   ball('ankle_' + s, P('a' + s).add(new T.Vector3(0, .1, 0)), .3, boots);
   const foot = blob('foot_' + s, P('a' + s).add(new T.Vector3(0, -.08, .25)), [.38, .26, .55], boots);
   hang(foot, blob('sole', P('a' + s).add(new T.Vector3(0, -.24, .27)), [.4, .09, .58], sole));
   ball('shoulder_' + s, P('s' + s), .44, jacket);
   seg('upper_arm_' + s, P('s' + s), P('e' + s), .46, .4, jacket, {bulge: .14});
   ball('elbow_' + s, P('e' + s), .33, jacket);
   seg('forearm_' + s, P('e' + s), P('w' + s), .4, .36, jacket, {bulge: .1});
   ball('wrist_' + s, P('w' + s), .2, face);
   blob('hand_' + s, mid('w' + s, 'f' + s, .6), [.24, .32, .2], face);
  }
 } else if (id === 'inventor') {
  const knit = mat('sweater_knit', '#5f7a48', {rough: .95}), cord = mat('trousers_corduroy', '#8a5a34', {rough: .95});
  const skin = mat('skin_plasticine', '#e8b48e', {rough: .75}), hair = mat('hair_plasticine', '#1c1814', {rough: .9}), shoes = mat('boots_shoes', '#3d3d3a', {rough: .8});
  blob('pelvis', P('hc').add(new T.Vector3(0, .05, 0)), [.5, .4, .38], cord);
  seg('abdomen', P('hc').add(new T.Vector3(0, -.35, 0)), P('waist'), .66, .6, knit, {bulge: .06});
  ring('waist_joint', P('hc').add(new T.Vector3(0, -.3, 0)), .64, .16, knit);
  blob('chest', mid('waist', 'neck', .5), [.76, .95, .55], knit);
  seg('neck', P('neck').add(new T.Vector3(0, -.35, 0)), P('neck').add(new T.Vector3(0, .5, 0)), .16, .16, skin);
  hang(scene.getObjectByName('chest'), ring('turtleneck', P('neck').add(new T.Vector3(0, -.12, 0)), .3, .16, knit));
  const head = blob('head', P('neck').add(new T.Vector3(0, .95, .05)), [.5, .62, .55], skin);
  hang(head, blob('nose', P('neck').add(new T.Vector3(0, .98, .62)), [.15, .17, .26], skin));
  eyes(head, P('neck').add(new T.Vector3(0, 1.22, .43)), {r: .15, gap: .19, pupil: .5});
  for (const x of [-1, 1]) {
   hang(head, blob('ear', P('neck').add(new T.Vector3(x * .52, 1.0, 0)), [.1, .2, .14], skin));
   hang(head, blob('brow', P('neck').add(new T.Vector3(x * .2, 1.4, .5)), [.14, .04, .05], hair, {rot: [0, 0, -x * .2]}));
  }
  hang(head, blob('mouth', P('neck').add(new T.Vector3(0, .7, .46)), [.3, .1, .1], mat('mouth', '#5a1f22')));
  hang(head, box('teeth', P('neck').add(new T.Vector3(0, .72, .53)), [.42, .08, .06], mat('teeth', '#f6f1e2', {rough: .4})));
  for (const [x, y, z, r] of [[0, 1.55, 0, .42], [-.3, 1.45, -.1, .3], [.3, 1.48, -.08, .3], [0, 1.4, -.35, .38], [-.15, 1.62, .2, .22], [.18, 1.6, .18, .22]])
   hang(head, blob('hair', P('neck').add(new T.Vector3(x, y, z)), [r, r * .8, r], hair));
  for (const s of S) {
   ball('hip_' + s, P('h' + s), .26, cord);
   seg('thigh_' + s, P('h' + s), P('k' + s), .3, .25, cord);
   ball('knee_' + s, P('k' + s), .23, cord);
   seg('shin_' + s, P('k' + s), P('a' + s).add(new T.Vector3(0, .1, 0)), .24, .26, cord);
   ball('ankle_' + s, P('a' + s).add(new T.Vector3(0, .12, 0)), .2, cord);
   hang(scene.getObjectByName('shin_' + s), ring('cuff', P('a' + s).add(new T.Vector3(0, .2, 0)), .26, .07, cord));
   blob('foot_' + s, P('a' + s).add(new T.Vector3(0, -.03, .35)), [.27, .17, .55], shoes);
   ball('shoulder_' + s, P('s' + s), .3, knit);
   seg('upper_arm_' + s, P('s' + s), P('e' + s), .27, .23, knit);
   ball('elbow_' + s, P('e' + s), .22, knit);
   seg('forearm_' + s, P('e' + s), P('w' + s), .23, .21, knit);
   hang(scene.getObjectByName('forearm_' + s), ring('sleeve_cuff', P('w' + s).add(new T.Vector3(0, .12, 0)), .2, .07, knit));
   ball('wrist_' + s, P('w' + s), .12, skin);
   blob('hand_' + s, mid('w' + s, 'f' + s, .55), [.2, .34, .13], skin);
  }
 } else if (id === 'stickman') {
  // ink lines and a paper head; a twig sword and a ragged leaf scarf, as in the picture
  const ink = mat('ink_line', '#16131c', {rough: .6}), paper = mat('paper_head', '#f8f5ec', {rough: .9}), r = .07;
  ball('pelvis', P('hc'), r * 1.4, ink);
  seg('abdomen', P('hc'), P('waist'), r, r, ink);
  seg('chest', P('waist'), P('neck').add(new T.Vector3(0, -.15, 0)), r, r, ink);
  seg('neck', P('neck').add(new T.Vector3(0, -.2, 0)), P('neck').add(new T.Vector3(0, .3, 0)), r, r, ink);
  const head = ball('head', P('neck').add(new T.Vector3(0, .78, 0)), .5, paper);
  const line = mesh('head_line', new T.TorusGeometry(.5, .045, 8, 40), ink); line.position.copy(P('neck').add(new T.Vector3(0, .78, 0)));
  hang(head, line);
  for (const x of [-1, 1]) hang(head, ball('eye_dot', P('neck').add(new T.Vector3(x * .14, .85, .46)), .05, ink));
  hang(head, seg('mouth_line', P('neck').add(new T.Vector3(-.08, .6, .47)), P('neck').add(new T.Vector3(.1, .62, .46)), .02, .02, ink));
  hang(head, seg('sprig', P('neck').add(new T.Vector3(0, 1.2, 0)), P('neck').add(new T.Vector3(.08, 1.45, 0)), .03, .015, ink));
  const leaf = mat('scarf_paper', '#ece8dc', {rough: .9, flat: true}), chestO = scene.getObjectByName('chest');
  hang(chestO, ring('scarf_knot', P('neck').add(new T.Vector3(0, -.05, 0)), .14, .05, ink));
  const cape = new T.BufferGeometry(), N = P('neck'), pts = [];
  for (const [x, y, z] of [[-.2, -.1, -.12], [.2, -.1, -.12], [-.7, -3.2, -.75], [-.25, -2.7, -.6], [.15, -3.5, -.85], [.6, -2.9, -.7]]) pts.push(N.x + x, N.y + y, N.z + z);
  cape.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); cape.setIndex([0, 2, 3, 0, 3, 1, 1, 3, 4, 1, 4, 5]); cape.computeVertexNormals();
  const capeM = mesh('scarf_cape', cape, Object.assign(leaf, {side: T.DoubleSide}));
  hang(chestO, capeM);
  hang(capeM, new T.LineSegments(new T.EdgesGeometry(cape, 1), new T.LineBasicMaterial({color: '#16131c'})));
  for (const s of S) {
   ball('hip_' + s, P('hc'), r, ink);
   seg('thigh_' + s, P('hc'), P('k' + s), r, r, ink);
   ball('knee_' + s, P('k' + s), r, ink);
   seg('shin_' + s, P('k' + s), P('a' + s), r, r, ink);
   ball('ankle_' + s, P('a' + s), r, ink);
   seg('foot_' + s, P('a' + s), P('t' + s), r, r * .9, ink);
   ball('shoulder_' + s, P('s' + s), r, ink);
   seg('upper_arm_' + s, P('s' + s), P('e' + s), r, r, ink);
   ball('elbow_' + s, P('e' + s), r, ink);
   seg('forearm_' + s, P('e' + s), P('w' + s), r, r, ink);
   ball('wrist_' + s, P('w' + s), r, ink);
   seg('hand_' + s, P('w' + s), P('f' + s), r, r * .8, ink);
  }
  // the sketched sword: a paper blade with an ink edge, point up, held low as in the picture
  const handR = scene.getObjectByName('hand_R'), grip = P('fR');
  hang(handR, seg('sword_grip', grip.clone().add(new T.Vector3(0, -.3, 0)), grip.clone().add(new T.Vector3(0, .25, 0)), .05, .05, ink));
  hang(handR, seg('sword_guard', grip.clone().add(new T.Vector3(-.3, .25, 0)), grip.clone().add(new T.Vector3(.3, .25, 0)), .04, .04, ink));
  const blade = box('sword_blade', grip.clone().add(new T.Vector3(0, 1.75, 0)), [.22, 3.0, .03], leaf);
  hang(blade, box('sword_edge', grip.clone().add(new T.Vector3(0, 1.75, 0)), [.26, 3.04, .015], ink));
  hang(handR, blade);
 } else if (id === 'hero') {
  const suit = mat('suit_red', '#d32630', {rough: .45}), navy = mat('suit_navy', '#1d2f6b', {rough: .45}), gold = mat('suit_gold', '#f5c22b', {rough: .4});
  const skin = mat('skin', '#e2a987', {rough: .65}), hair = mat('hair', '#16151d', {rough: .6});
  blob('pelvis', P('hc').add(new T.Vector3(0, .1, 0)), [.72, .5, .5], suit);
  seg('abdomen', P('hc'), P('waist'), .64, .82, suit, {bulge: .04});
  // the belt rides the hips, not the chest, so it stays put when he bends
  ring('waist_joint', P('hc').add(new T.Vector3(0, .32, 0)), .6, .06, suit);
  const pelvis = scene.getObjectByName('pelvis');
  hang(pelvis, ring('belt', P('hc').add(new T.Vector3(0, .32, 0)), .7, .14, gold));
  // the V: a tapered chest wide at the shoulders, two pecs and a back, so it reads as muscle and not a ball
  const chest = seg('chest', P('waist').add(new T.Vector3(0, -.1, 0)), P('neck').add(new T.Vector3(0, -.15, 0)), .8, 1.15, suit, {radial: 16});
  chest.scale.z = .62;
  // one flat chest plate (two round pecs read as the wrong thing at a distance)
  hang(chest, blob('chest_plate', mid('waist', 'neck', .7).add(new T.Vector3(0, 0, .3)), [.95, .42, .22], suit));
  hang(chest, blob('back', mid('waist', 'neck', .6).add(new T.Vector3(0, 0, -.38)), [1.0, .7, .3], suit));
  hang(chest, blob('trapezius', P('neck').add(new T.Vector3(0, -.25, -.05)), [.9, .25, .45], suit));
  for (const x of [-1, 1]) hang(chest, blob('side_panel', mid('waist', 'neck', .45).add(new T.Vector3(x * .82, 0, 0)), [.26, .85, .42], navy));
  seg('neck', P('neck').add(new T.Vector3(0, -.3, 0)), P('neck').add(new T.Vector3(0, .35, 0)), .38, .34, skin);
  const head = blob('head', P('neck').add(new T.Vector3(0, .72, .05)), [.46, .6, .52], skin);
  hang(head, blob('jaw', P('neck').add(new T.Vector3(0, .42, .18)), [.36, .2, .3], skin));
  hang(head, blob('hair', P('neck').add(new T.Vector3(0, 1.02, -.06)), [.52, .38, .56], hair));
  hang(head, blob('hair_back', P('neck').add(new T.Vector3(0, .78, -.3)), [.46, .4, .28], hair));
  hang(head, blob('hair_quiff', P('neck').add(new T.Vector3(.08, 1.2, .3)), [.34, .2, .28], hair, {rot: [-.4, 0, .25]}));
  eyes(head, P('neck').add(new T.Vector3(0, .82, .44)), {r: .075, gap: .17, pupil: .6, white: '#ffffff'});
  for (const x of [-1, 1]) hang(head, blob('brow', P('neck').add(new T.Vector3(x * .17, .95, .48)), [.12, .035, .035], hair, {rot: [0, 0, x * .25]}));
  for (const s of S) {
   ball('hip_' + s, P('h' + s), .4, navy);
   seg('thigh_' + s, P('h' + s), P('k' + s), .5, .36, suit, {bulge: .1});
   ball('knee_' + s, P('k' + s), .33, suit);
   seg('shin_' + s, P('k' + s), P('a' + s), .36, .26, suit, {bulge: .08});
   hang(scene.getObjectByName('shin_' + s), seg('boot', P('k' + s).lerp(P('a' + s), .12), P('a' + s), .4, .3, gold));
   hang(scene.getObjectByName('thigh_' + s), seg('leg_stripe', P('h' + s).add(new T.Vector3((s === 'L' ? 1 : -1) * .3, 0, 0)), P('k' + s).add(new T.Vector3((s === 'L' ? 1 : -1) * .22, 0, 0)), .22, .16, navy));
   ball('ankle_' + s, P('a' + s), .27, gold);
   blob('foot_' + s, P('a' + s).add(new T.Vector3(0, -.06, .28)), [.28, .2, .5], gold);
   blob('shoulder_' + s, P('s' + s).add(new T.Vector3(0, .02, 0)), [.42, .36, .4], navy);
   seg('upper_arm_' + s, P('s' + s), P('e' + s), .36, .3, navy, {bulge: .18});
   ball('elbow_' + s, P('e' + s), .33, navy);
   seg('forearm_' + s, P('e' + s), P('w' + s), .32, .26, navy, {bulge: .1});
   hang(scene.getObjectByName('forearm_' + s), seg('glove', P('e' + s).lerp(P('w' + s), .45), P('w' + s), .36, .29, gold));
   ball('wrist_' + s, P('w' + s), .28, gold);
   blob('hand_' + s, mid('w' + s, 'f' + s, .55), [.3, .38, .26], gold);
  }
 }
 scene.updateMatrixWorld(true);
 return {scene, J};
}
