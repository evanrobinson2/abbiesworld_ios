import {loft, limb, bone, ik2} from './lowpoly-kit.mjs';

// Young Daddy, nine (AW-STUDY-0032; Evan: "blond mop, never a hat"; his picture: white tee, red shorts, white sneakers).
// A hero low-poly kid, 1.35 m, facing +z, feet on y = 0. Arms and legs are two-bone reaches (shoulder, elbow, hand;
// hip, knee, ankle), so one rig climbs, walks, throws, shields his eyes and hangs: the game hands it targets.
//   const kid = makeYoungDaddy(T); scene.add(kid.group);
//   kid.update(dt, {walk, hands: [l, r] | null, feet: [l, r] | null, throw, shield, look})  (targets in kid space)

export function youngDaddyMaterials(T) {
 return {
  skin: new T.MeshStandardMaterial({color: '#f1c39c', roughness: .7, name: 'skin'}),
  cheek: new T.MeshStandardMaterial({color: '#f09a86', roughness: .8, transparent: true, opacity: .55, name: 'rosy cheeks'}),
  tee: new T.MeshStandardMaterial({color: '#f4efe6', roughness: .85, name: 'white t-shirt'}),
  shorts: new T.MeshStandardMaterial({color: '#c8322e', roughness: .8, name: 'red shorts'}),
  sock: new T.MeshStandardMaterial({color: '#f6f3ec', roughness: .95, name: 'tube sock'}),
  stripe: new T.MeshStandardMaterial({color: '#c8322e', roughness: .9, name: 'tube sock stripe'}),
  shoe: new T.MeshStandardMaterial({color: '#f7f6f1', roughness: .6, name: 'white sneaker'}),
  sole: new T.MeshStandardMaterial({color: '#d9c7a4', roughness: .9, name: 'gum sole'}),
  hair: new T.MeshStandardMaterial({color: '#e3c46a', roughness: .75, flatShading: true, name: 'blond mop hair'}),
  brow: new T.MeshStandardMaterial({color: '#b8913f', roughness: .8, name: 'eyebrow'}),
  white: new T.MeshStandardMaterial({color: '#fbf8f2', roughness: .3, name: 'eye white'}),
  iris: new T.MeshStandardMaterial({color: '#5b3d24', roughness: .2, name: 'brown eye'}),
  pupil: new T.MeshStandardMaterial({color: '#0b0706', roughness: .1, name: 'pupil'}),
  lip: new T.MeshStandardMaterial({color: '#a4524a', roughness: .6, name: 'mouth'}),
 };
}

// AW-STUDY-0034: makeYoungDaddy now builds the hero figure from figure-kit (same contract: update(dt, pose), arms[i].hand,
// head, hit). The lowpoly-kit build below stays as makeYoungDaddyLoft for comparison.
export {makeYoungDaddy} from './figures/young-daddy.mjs';

export function makeYoungDaddyLoft(T, {mats = youngDaddyMaterials(T)} = {}) {
 const M = mats, v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
 const group = new T.Group(); group.name = 'kid';
 const mesh = (geo, mat, name, parent = group, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
 const torso = new T.Group(); torso.name = 'torso'; group.add(torso);
 // shorts and tee, lofted up the body
 mesh(loft(T, [{x: 0, y: .6, ry: .118, rz: .088}, {x: 0, y: .68, ry: .13, rz: .095}, {x: 0, y: .76, ry: .12, rz: .088}, {x: 0, y: .8, ry: .11, rz: .08}], {seg: 12}), M.shorts, 'red shorts', torso);
 const tee = mesh(loft(T, [{x: 0, y: .72, ry: .133, rz: .1}, {x: 0, y: .76, ry: .128, rz: .096}, {x: 0, y: .86, ry: .122, rz: .09}, {x: 0, y: .96, ry: .135, rz: .095}, {x: 0, y: 1.04, ry: .148, rz: .092}, {x: 0, y: 1.09, ry: .11, rz: .07}, {x: 0, y: 1.11, ry: .055, rz: .05}], {seg: 12}), M.tee, 'white t-shirt', torso);
 mesh(new T.CylinderGeometry(.045, .05, .1, 8), M.skin, 'neck', torso, 0, 1.13, 0);
 // the head: big for a kid, a round face, a blond mop that falls over the brow; never a hat
 const head = new T.Group(); head.name = 'head'; head.position.set(0, 1.14, 0); torso.add(head);
 mesh(new T.SphereGeometry(1, 16, 12), M.skin, 'head', head, 0, .11, 0).scale.set(.112, .128, .118);
 mesh(new T.SphereGeometry(1, 10, 8), M.skin, 'chin and cheeks', head, 0, .06, .035).scale.set(.09, .07, .085);
 for (const s of [-1, 1]) {
  mesh(new T.SphereGeometry(1, 8, 6), M.skin, 'ear', head, .11 * s, .1, -.005).scale.set(.02, .034, .025);
  const eye = mesh(new T.SphereGeometry(1, 10, 8), M.white, 'eye', head, .041 * s, .117, .1); eye.scale.set(.021, .024, .012);
  mesh(new T.SphereGeometry(.0135, 10, 8), M.iris, 'brown eye', head, .041 * s, .114, .109);
  mesh(new T.SphereGeometry(.0072, 8, 6), M.pupil, 'pupil', head, .041 * s, .114, .1205);
  mesh(new T.SphereGeometry(.0028, 6, 4), M.white, 'eye shine', head, .041 * s + .004, .119, .1235);
  const br = mesh(new T.BoxGeometry(.034, .007, .01), M.brow, 'eyebrow', head, .042 * s, .146, .106); br.rotation.z = -.15 * s;
  mesh(new T.SphereGeometry(1, 8, 6), M.cheek, 'rosy cheek', head, .066 * s, .082, .086).scale.set(.022, .014, .01);
 }
 mesh(new T.SphereGeometry(1, 8, 6), M.skin, 'nose', head, 0, .093, .118).scale.set(.016, .018, .016);
 const mouth = mesh(new T.TorusGeometry(.022, .0045, 4, 10, Math.PI), M.lip, 'smile', head, 0, .066, .108); mouth.rotation.z = Math.PI;
 // the mop: a crown over the skull, then tufts all round, heavier at the back and a fringe over the brow
 const crown = mesh(new T.SphereGeometry(1, 12, 9, 0, Math.PI * 2, 0, Math.PI * .62), M.hair, 'blond mop', head, 0, .118, -.018); crown.scale.set(.13, .15, .136); crown.rotation.x = -.42;
 // strands fall from the crown: down over the ears and the nape, a shaggy fringe to the eyebrows
 const tuftGeo = new T.ConeGeometry(.036, .1, 5).translate(0, -.05, 0).rotateX(Math.PI);
 for (let i = 0; i < 26; i++) {
  const a = i / 26 * Math.PI * 2 + (i % 2) * .08, c = Math.cos(a), front = c > .6;
  const r = front ? .118 : .128, y = front ? .2 : .19 - (c < -.3 ? .03 : 0);
  const t = mesh(tuftGeo, M.hair, 'blond mop', head, Math.sin(a) * r, y, c * r);
  const out = v3(Math.sin(a), 0, c), dir = out.clone().multiplyScalar(front ? .55 : .35).add(v3(0, -1, 0)).normalize();
  t.quaternion.setFromUnitVectors(v3(0, -1, 0), dir); t.scale.set(1.1, front ? .55 + (i % 3) * .1 : .9 + (i % 3) * .2, .8);
 }
 for (const [x, y, z, s] of [[0, .238, .01, 1.3], [-.05, .225, -.045, 1.15], [.055, .228, -.03, 1.15], [0, .215, -.085, 1.2], [.03, .225, .06, 1]]) { const t = mesh(new T.IcosahedronGeometry(.058, 1), M.hair, 'blond mop', head, x, y, z); t.scale.set(s, .5, s); t.rotation.y = x * 20; }

 // limbs: [upper, lower, end piece]; hands are mittens with a thumb; shoes are '80s white high-tops with a gum sole
 const arm = s => {
  const a = {s, root: v3(.165 * s, 1.04, 0), upper: limb(T, M.skin, .043, .04, 8, 'upper arm'), lower: limb(T, M.skin, .037, .032, 8, 'forearm'), sleeve: limb(T, M.tee, .062, .058, 9, 'sleeve'), hand: new T.Group()};
  mesh(new T.SphereGeometry(1, 9, 7), M.skin, 'hand', a.hand, 0, -.04, 0).scale.set(.034, .05, .024);
  a.elbow = mesh(new T.SphereGeometry(.039, 8, 6), M.skin, 'elbow');
  mesh(new T.CapsuleGeometry(.012, .025, 3, 6), M.skin, 'thumb', a.hand, .022 * s, -.025, .016).rotation.z = .5 * s;
  a.hand.name = 'hand'; group.add(a.upper, a.lower, a.sleeve, a.hand); a.target = v3(.2 * s, .62, .02); a.cur = a.target.clone(); return a;
 };
 const leg = s => {
  const l = {s, root: v3(.072 * s, .66, 0), upper: limb(T, M.skin, .058, .048, 8, 'thigh'), lower: limb(T, M.skin, .045, .036, 8, 'shin'), cuff: limb(T, M.shorts, .078, .074, 10, 'shorts leg'), sock: limb(T, M.sock, .041, .039, 8, 'tube sock'), shoe: new T.Group()};
  mesh(new T.BoxGeometry(.085, .07, .18).translate(0, .035, .035), M.shoe, 'white sneaker', l.shoe);
  mesh(new T.BoxGeometry(.09, .022, .19).translate(0, .011, .035), M.sole, 'gum sole', l.shoe);
  mesh(new T.BoxGeometry(.088, .02, .09).translate(0, .05, .02), M.stripe, 'sneaker stripe', l.shoe).scale.x = 1.02;
  mesh(new T.CylinderGeometry(.045, .045, .08, 9).translate(0, .09, -.01), M.shoe, 'high-top collar', l.shoe);
  for (const k of [0, 1]) { const r = new T.Mesh(new T.TorusGeometry(.042, .006, 4, 12), M.stripe); r.name = 'sock stripe'; r.rotation.x = Math.PI / 2; l.sock.add(r); r.position.y = .45 + k * .25; }
  l.knee = mesh(new T.SphereGeometry(.05, 8, 6), M.skin, 'knee'); l.shoe.name = 'shoe'; group.add(l.upper, l.lower, l.cuff, l.sock, l.shoe); l.target = v3(.075 * s, .0, 0); l.cur = l.target.clone(); return l;
 };
 const arms = [arm(-1), arm(1)], legs = [leg(-1), leg(1)];
 const hit = new T.Mesh(new T.CapsuleGeometry(.3, .8, 2, 6), new T.MeshBasicMaterial({visible: false})); hit.position.y = .7; hit.name = 'kid tap target'; group.add(hit);
 const st = {t: 0, walk: 0, phase: 0, blink: 0};

 // pose: {walk: speed m/s, hands: [l, r] kid-space targets (or null), feet: same, throw: 0..1 (wind-up and release),
 // shield: 0..1 (arm over the eyes), crouch: 0..1, look: yaw, effort: 0..1 (shaking arms), lean: forward tilt}
 function update(dt, pose = {}) {
  st.t += dt; const walk = pose.walk || 0; st.walk += (walk - st.walk) * Math.min(1, dt * 8);
  st.phase += dt * (2.4 + st.walk * 1.6) * (st.walk > .05 ? 1 : 0);
  const crouch = pose.crouch || 0, bob = st.walk > .05 ? Math.abs(Math.sin(st.phase * Math.PI)) * .03 : Math.sin(st.t * 2) * .004;
  torso.position.y = bob - crouch * .12; torso.rotation.x = (pose.lean || 0) + st.walk * .06 + crouch * .2;
  head.rotation.set(-crouch * .1 + (pose.lookUp || 0), pose.look || 0, 0);
  st.blink -= dt; const blink = st.blink < .12; if (st.blink < 0) st.blink = 2 + Math.random() * 3;
  head.children.filter(c => c.name === 'eye').forEach(e => e.scale.y = blink ? .004 : .024);
  const sw = Math.sin(st.phase * Math.PI), k = Math.min(1, st.walk / 1.5);
  const shake = (pose.effort || 0) * .012;
  arms.forEach((a, i) => {
   let t = pose.hands?.[i];
   if (!t) {
    t = v3(.2 * a.s, .6 + torso.position.y, .02 - sw * a.s * .18 * k);
    if (i === 1 && pose.throw) { const w = pose.throw; t = w < .5 ? v3(.17, 1.3, -.2) : v3(.12, 1.2 - (w - .5) * .6, .45); }
    if (i === 1 && pose.shield) t.lerp(v3(.04, 1.3 + torso.position.y, .2), pose.shield);
    if (pose.carry) t = v3(.1 * a.s, .82, .22);
   }
   a.cur.lerp(t, Math.min(1, dt * (pose.hands ? 18 : 10))); const tg = a.cur.clone(); if (shake) tg.x += Math.sin(st.t * 47 + i) * shake;
   const root = a.root.clone(); root.y += torso.position.y;
   const {joint, end} = ik2(T, root, tg, .23, .21, v3(a.s * .7, -.6, -.5));
   bone(T, a.upper, root, joint); bone(T, a.lower, joint, end); a.elbow.position.copy(joint); bone(T, a.sleeve, root, root.clone().lerp(joint, .45));
   a.hand.position.copy(end); a.hand.quaternion.setFromUnitVectors(v3(0, -1, 0), end.clone().sub(joint).normalize());
  });
  legs.forEach((l, i) => {
   let t = pose.feet?.[i];
   if (!t) { const ph = st.phase * Math.PI + i * Math.PI; t = v3(.075 * l.s, Math.max(0, Math.sin(ph)) * .1 * k, Math.cos(ph) * .2 * k); }
   l.cur.lerp(t, Math.min(1, dt * 16));
   const root = l.root.clone(); root.y += torso.position.y;
   const ankle = l.cur.clone().add(v3(0, .075, -.02));
   const {joint, end} = ik2(T, root, ankle, .31, .3, v3(l.s * .25, 0, 1));
   bone(T, l.upper, root, joint); bone(T, l.lower, joint, end); l.knee.position.copy(joint); bone(T, l.cuff, root.clone().add(v3(0, .06, 0)), root.clone().lerp(joint, .38));
   bone(T, l.sock, end.clone().lerp(joint, .02), end.clone().lerp(joint, .32));
   l.shoe.position.copy(end).add(v3(0, -.075, 0)); l.shoe.rotation.set(pose.feet ? -.6 : 0, 0, 0);
  });
 }
 update(0);
 return {group, update, head, hit, arms, legs, materials: M};
}
