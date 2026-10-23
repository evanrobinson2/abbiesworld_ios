import {loft, limb, bone, ik2} from './lowpoly-kit.mjs';

// Bub, a black Labrador (AW-STUDY-0032; the family cast's look: coat #1b1a1a, brown eyes, red collar with a brass tag).
// A hero low-poly dog at real size (0.58 m at the shoulder), facing +x, feet on y = 0. The body is lofted (deep chest,
// tucked loin, broad otter-tailed rump), the head is a broad skull with a stop, a square muzzle and soft drop ears.
// Legs are two-bone reaches to feet that are planted by a gait, so walking, trotting, galloping and sitting all keep
// paws on the ground. A sheen on the coat catches the dusk light the way a lab's coat does.
//   const bub = makeBlackLab(T); scene.add(bub.group);
//   bub.update(dt, {speed, sit, wag, pant, look}); bub.bark(); bub.mouth (Object3D for a ball); bub.hit (tap target)

export function blackLabMaterials(T) {
 return {
  coat: new T.MeshPhysicalMaterial({color: '#1c1a1f', roughness: .55, sheen: .7, sheenColor: new T.Color('#4c4c62'), sheenRoughness: .5, name: 'black lab coat'}),
  pad: new T.MeshStandardMaterial({color: '#0d0c0f', roughness: .35, name: 'dog nose and paw pads'}),
  eye: new T.MeshStandardMaterial({color: '#6b4a2a', roughness: .15, name: 'dog eye'}),
  pupil: new T.MeshStandardMaterial({color: '#050405', roughness: .1, name: 'dog pupil'}),
  mouth: new T.MeshStandardMaterial({color: '#3a1e24', roughness: .6, name: 'dog mouth'}),
  tongue: new T.MeshStandardMaterial({color: '#d86f7c', roughness: .45, name: 'dog tongue'}),
  collar: new T.MeshStandardMaterial({color: '#c0392b', roughness: .55, name: 'red collar'}),
  tag: new T.MeshStandardMaterial({color: '#d8b04a', roughness: .3, metalness: .9, name: 'brass dog tag'}),
 };
}

export function makeBlackLab(T, {mats = blackLabMaterials(T)} = {}) {
 const M = mats, v3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
 const group = new T.Group(); group.name = 'dog';
 const mesh = (geo, mat, name, parent, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
 // the body pivots at the hind hips, so sitting tips the chest up
 const HIP = v3(-.3, .47, 0), body = new T.Group(); body.name = 'dog body'; body.position.copy(HIP); group.add(body);
 const torsoGeo = loft(T, [
  {x: -.47, y: .54, ry: .04, rz: .04}, {x: -.445, y: .53, ry: .12, rz: .115}, {x: -.37, y: .51, ry: .165, rz: .15}, {x: -.25, y: .49, ry: .165, rz: .145},
  {x: -.1, y: .475, ry: .155, rz: .14}, {x: .04, y: .47, ry: .18, rz: .155}, {x: .16, y: .46, ry: .205, rz: .16}, {x: .26, y: .48, ry: .19, rz: .15},
  {x: .33, y: .55, ry: .145, rz: .125}, {x: .38, y: .64, ry: .11, rz: .1}, {x: .42, y: .72, ry: .095, rz: .09}, {x: .44, y: .77, ry: .075, rz: .075},
 ], {seg: 12}).translate(-HIP.x, -HIP.y, 0);
 const torso = mesh(torsoGeo, M.coat, 'deep chest and body', body);
 const collar = mesh(new T.TorusGeometry(.102, .014, 6, 18), M.collar, 'red collar', body, .385 - HIP.x, .655 - HIP.y, 0);
 collar.quaternion.setFromUnitVectors(v3(0, 0, 1), v3(.45, .9, 0).normalize()); // round the neck, along its slope
 mesh(new T.CylinderGeometry(.02, .02, .006, 10), M.tag, 'brass dog tag', body, .47 - HIP.x, .6 - HIP.y, 0).rotation.x = Math.PI / 2;

 // head: a broad skull, a clear stop and a square muzzle; the jaw opens to pant and bark
 const head = new T.Group(); head.name = 'dog head'; head.position.set(.44 - HIP.x, .76 - HIP.y, 0); body.add(head);
 mesh(loft(T, [
  {x: -.03, y: .06, ry: .03, rz: .03}, {x: -.01, y: .065, ry: .085, rz: .08}, {x: .04, y: .07, ry: .1, rz: .096}, {x: .09, y: .068, ry: .09, rz: .09},
  {x: .125, y: .058, ry: .072, rz: .074}, {x: .15, y: .036, ry: .058, rz: .062}, {x: .2, y: .032, ry: .054, rz: .058}, {x: .235, y: .03, ry: .048, rz: .052}, {x: .25, y: .03, ry: .02, rz: .025},
 ], {seg: 12}), M.coat, 'broad head and muzzle', head);
 mesh(new T.SphereGeometry(1, 10, 8), M.pad, 'dog nose', head, .248, .052, 0).scale.set(.022, .024, .034);
 for (const z of [-1, 1]) {
  const e = mesh(new T.SphereGeometry(.0135, 10, 8), M.eye, 'dog eye', head, .123, .09, .056 * z); mesh(new T.SphereGeometry(.0075, 6, 5), M.pupil, 'dog pupil', e, .007, .002, .004 * z);
  mesh(new T.SphereGeometry(1, 8, 6), M.coat, 'brow', head, .118, .106, .05 * z).scale.set(.024, .013, .022);
 }
 const ears = [-1, 1].map(z => { // soft drop ears that swing as he moves
  const p = new T.Group(); p.name = 'ear pivot'; p.position.set(.055, .135, .082 * z); head.add(p);
  const e = mesh(new T.SphereGeometry(1, 9, 7), M.coat, 'drop ear', p, .012, -.07, .018 * z); e.scale.set(.052, .08, .014); e.rotation.x = -.18 * z;
  return p;
 });
 const jaw = new T.Group(); jaw.name = 'jaw'; jaw.position.set(.11, -.002, 0); head.add(jaw);
 mesh(loft(T, [{x: -.01, y: 0, ry: .022, rz: .045}, {x: .05, y: -.002, ry: .026, rz: .046}, {x: .11, y: .002, ry: .018, rz: .038}, {x: .125, y: .004, ry: .008, rz: .022}], {seg: 10}), M.coat, 'lower jaw', jaw);
 mesh(new T.BoxGeometry(.11, .012, .07), M.mouth, 'mouth', jaw, .06, .018, 0);
 const tongue = mesh(new T.BoxGeometry(.08, .01, .048), M.tongue, 'tongue', jaw, .09, .022, 0);
 const mouth = new T.Object3D(); mouth.name = 'mouth'; mouth.position.set(.13, .03, 0); jaw.add(mouth);

 // otter tail: thick at the root, tapering, carried low; wags from the root
 const tail = []; { let parent = body, at = v3(-.45 - HIP.x, .53 - HIP.y, 0);
  for (let i = 0; i < 4; i++) { const p = new T.Group(); p.position.copy(at); parent.add(p); const L = .1; mesh(new T.CylinderGeometry(.04 - i * .009, .043 - i * .009, L, 8).rotateZ(Math.PI / 2).translate(-L / 2, 0, 0), M.coat, 'otter tail', p); tail.push(p); parent = p; at = v3(-L, 0, 0); } }

 // legs: two-bone reaches from shoulder and hip to the wrist or hock, then the pastern or metatarsal to the paw
 const L = {
  front: {a: .25, b: .21, r: [.066, .046, .038, .03], root: v3(.21, .52, 0), home: .22, pole: v3(-1, 0, 0), lift: .1},
  hind: {a: .26, b: .21, r: [.092, .055, .046, .032], root: v3(-.3, .53, 0), home: -.33, pole: v3(1, 0, 0), lift: .09},
 };
 const legs = [];
 for (const [kind, spec] of Object.entries(L)) for (const z of [-1, 1]) {
  const zz = (kind === 'front' ? .09 : .088) * z;
  const leg = {kind, z: zz, spec, upper: limb(T, M.coat, spec.r[0], spec.r[1], 8, kind === 'front' ? 'upper foreleg' : 'thigh'), lower: limb(T, M.coat, spec.r[2] * 1.05, spec.r[2], 7, kind === 'front' ? 'forearm' : 'shin'),
   foot: limb(T, M.coat, spec.r[3], spec.r[3] * .9, 6, kind === 'front' ? 'pastern' : 'metatarsal'), paw: null, joint: mesh(new T.SphereGeometry(spec.r[1] * 1.05, 8, 6), M.coat, 'joint', group),
   pos: v3(spec.home, 0, zz), side: z, phase: 0};
  leg.paw = mesh(new T.SphereGeometry(1, 9, 6), M.coat, 'paw', group); leg.paw.scale.set(.05, .028, .042);
  group.add(leg.upper, leg.lower, leg.foot); legs.push(leg);
 }
 const hit = new T.Mesh(new T.SphereGeometry(.75, 8, 6), new T.MeshBasicMaterial({visible: false})); hit.position.set(0, .45, 0); hit.name = 'dog tap target'; group.add(hit);

 // gait offsets per leg [front left, front right, hind left, hind right]
 const GAITS = {walk: {duty: .64, off: [.25, .75, 0, .5]}, trot: {duty: .5, off: [0, .5, .5, 0]}, gallop: {duty: .4, off: [.55, .45, 0, .1]}};
 const st = {t: 0, cycle: 0, sit: 0, bark: 0, pant: 0, wag: 0, speed: 0, earV: [0, 0], look: 0, lookUp: 0, breath: 0};
 const tmpP = v3(), q = new T.Quaternion();

 function update(dt, {speed = 0, sit = 0, wag = .5, pant = false, look = 0, lookUp = 0} = {}) {
  st.t += dt; st.speed += (speed - st.speed) * Math.min(1, dt * 6); const s = st.speed;
  st.sit += (sit - st.sit) * Math.min(1, dt * 4); st.wag += (wag - st.wag) * Math.min(1, dt * 3);
  st.pant += ((pant || s > 2.5 ? 1 : 0) - st.pant) * Math.min(1, dt * 3); st.bark = Math.max(0, st.bark - dt);
  st.look += (look - st.look) * Math.min(1, dt * 5); st.lookUp += (lookUp - st.lookUp) * Math.min(1, dt * 5);
  const gait = s < 1.6 ? GAITS.walk : s < 3.6 ? GAITS.trot : GAITS.gallop, gal = s >= 3.6 ? 1 : 0;
  const freq = s < 1.6 ? .8 + s * .7 : s < 3.6 ? 1.6 + s * .25 : 2.4 + s * .12, stride = s / Math.max(.1, freq), moving = Math.min(1, s / .25);
  st.cycle = (st.cycle + dt * freq * (moving > .02 ? 1 : 0)) % 1;
  // body: bounce, gallop pitch, breathing, sitting tip
  const w = st.sit, bounce = moving * (gal ? .035 * Math.sin(st.cycle * Math.PI * 2) : .012 * Math.sin(st.cycle * Math.PI * 4));
  body.position.set(HIP.x - .02 * w, HIP.y - .2 * w + bounce, 0);
  body.rotation.z = .62 * w + gal * moving * .1 * Math.sin(st.cycle * Math.PI * 2 + 1);
  st.breath += dt * (st.pant > .5 ? 14 : 3); const br = Math.sin(st.breath) * (st.pant > .5 ? .025 : .012);
  torso.scale.set(1, 1 + br, 1 + br);
  // head: look left or right, look up when a ball flies or he barks
  const barkK = Math.sin(Math.min(1, st.bark / .35) * Math.PI);
  head.rotation.set(0, st.look * .8, -.12 + st.lookUp * .5 + barkK * .25 - w * .45 + moving * (gal ? .15 : .05) * Math.sin(st.cycle * Math.PI * 4));
  jaw.rotation.z = -(st.pant * (.22 + .06 * Math.sin(st.breath)) + barkK * .5);
  tongue.visible = st.pant > .2; tongue.position.x = .1 + st.pant * .03; tongue.rotation.z = -st.pant * .4;
  ears.forEach((e, i) => { const k = i ? 1 : -1; st.earV[i] = Math.sin(st.t * (5 + s) + i) * (.05 + moving * .12) + barkK * .3; e.rotation.set(k * (.1 + st.earV[i] * .5), 0, .15 + st.earV[i]); });
  // tail: an otter tail carried low, wagging from the root
  const wagA = (.25 + .55 * st.wag) * Math.sin(st.t * (6 + 10 * st.wag)), droop = -.5 + .25 * st.wag - w * .4;
  tail.forEach((p, i) => p.rotation.set(0, wagA * (i ? .35 : 1), (i ? .12 : droop)));
  // legs
  group.updateMatrix(); body.updateMatrix();
  legs.forEach((leg, li) => {
   const spec = leg.spec, front = leg.kind === 'front';
   const root = spec.root.clone().sub(HIP).applyEuler(body.rotation).add(body.position); root.z = leg.z * .8;
   const p = (st.cycle + gait.off[li]) % 1, duty = gait.duty;
   let fx = spec.home, fy = 0;
   if (moving > .02) {
    if (p < duty) fx += stride * (.5 - p / duty) * .5; else { const k = (p - duty) / (1 - duty); fx += stride * (-.5 + k) * .5; fy = spec.lift * Math.sin(k * Math.PI) * (gal ? 1.4 : 1); }
    fx = spec.home + (fx - spec.home) * moving; fy *= moving;
   }
   if (!front) fx += (.1) * w; // sitting: hind paws come forward under him
   leg.pos.set(fx, fy, leg.z);
   // the wrist (front) or hock (hind) sits above and behind the paw; sitting lays the hind metatarsal flat
   const wrist = front ? leg.pos.clone().add(v3(.01, .075 + fy * .2, 0)) : leg.pos.clone().add(v3(-.045 - .1 * w, .13 - .1 * w, 0));
   const {joint, end} = ik2(T, root, wrist, spec.a, spec.b, front ? v3(-1, -.2, 0) : v3(1, -.4 + w, 0));
   bone(T, leg.upper, root, joint); bone(T, leg.lower, joint, end); bone(T, leg.foot, end, leg.pos.clone().add(v3(front ? .01 : 0, .025, 0)));
   leg.joint.position.copy(joint);
   leg.paw.position.copy(leg.pos).add(v3(.018, .02, 0)); leg.paw.rotation.z = fy ? -.4 : 0;
  });
 }
 update(0);
 return {group, update, bark() { st.bark = .35; }, mouth, hit, head, tail, state: st, materials: M};
}
