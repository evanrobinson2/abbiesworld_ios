// The figures as they were before AW-STUDY-0034, copied unchanged from the school jump (round 3, main c3797ff) so the
// study can show them beside the new ones under the same camera and light. Not used by any game.
import * as T from 'three';
const M = {
 ball: new T.MeshStandardMaterial({color: '#d7f04a', roughness: .9, emissive: '#7a8a10', emissiveIntensity: .25, name: 'tennis ball felt'}),
 skin: new T.MeshStandardMaterial({color: '#f0c29b', roughness: .8, name: 'skin'}),
 jacket: new T.MeshStandardMaterial({color: '#f2ede4', roughness: .8, name: 'white t-shirt'}),
 shorts: new T.MeshStandardMaterial({color: '#c8322e', roughness: .8, name: 'red shorts'}),
 sock: new T.MeshStandardMaterial({color: '#f4f1ea', roughness: 1, name: 'tube sock'}),
 sneaker: new T.MeshStandardMaterial({color: '#f6f6f2', roughness: .7, name: 'white sneaker'}),
 sole: new T.MeshStandardMaterial({color: '#c9c2b6', roughness: .9, name: 'sneaker sole'}),
 eye: new T.MeshStandardMaterial({color: '#20160f', roughness: .3, name: 'eye'}),
 nose: new T.MeshStandardMaterial({color: '#0a0a0a', roughness: .3, name: 'dog nose'}),
 hair: new T.MeshStandardMaterial({color: '#e9c86b', roughness: .9, flatShading: true, name: 'blond mop hair'}),
 fur: new T.MeshStandardMaterial({color: '#1d1b20', roughness: .55, name: 'black lab coat'}),
 furDark: new T.MeshStandardMaterial({color: '#0e0d10', roughness: .6, name: 'dog ears'}),
 collar: new T.MeshStandardMaterial({color: '#d83a3a', roughness: .6, name: 'dog collar'}),
};
export function makeKid() {
 // Young Daddy, hero low poly (Evan, 09:58Z): a blond mop and never a hat, white tee, red shorts, white sneakers.
 // Legs and arms hang from pivots at the hip and shoulder so they swing like limbs, not like batons.
 const g = new T.Group(); g.name = 'kid';
 const add = (geo, mat, x, y, z, name, parent = g) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.name = name; parent.add(m); return m; };
 const pivot = (x, y, z, name) => { const o = new T.Group(); o.position.set(x, y, z); o.name = name; g.add(o); return o; };
 const legs = [-.085, .085].map((x, i) => {
  const hip = pivot(x, .43, 0, i ? 'right hip' : 'left hip');
  add(new T.CylinderGeometry(.058, .048, .36, 7), M.skin, 0, -.2, 0, 'leg', hip);
  add(new T.CylinderGeometry(.06, .06, .05, 7), M.sock, 0, -.37, 0, 'sock', hip);
  add(new T.BoxGeometry(.11, .075, .19), M.sneaker, 0, -.41, .03, 'white sneaker', hip);
  add(new T.BoxGeometry(.115, .025, .2), M.sole, 0, -.445, .03, 'sneaker sole', hip);
  return hip;
 });
 add(new T.CylinderGeometry(.175, .165, .2, 10), M.shorts, 0, .47, 0, 'red shorts');
 const body = add(new T.CapsuleGeometry(.165, .26, 3, 10), M.jacket, 0, .69, 0, 'white t-shirt');
 add(new T.CylinderGeometry(.05, .055, .07, 8), M.skin, 0, .93, 0, 'neck');
 const head = add(new T.SphereGeometry(.155, 14, 10), M.skin, 0, 1.06, 0, 'head'); head.scale.set(1, 1.05, .98);
 for (const x of [-.055, .055]) add(new T.SphereGeometry(.018, 6, 4), M.eye, x, 1.08, .14, 'eye');
 add(new T.SphereGeometry(.022, 6, 4), M.skin, 0, 1.04, .155, 'nose');
 for (const x of [-.155, .155]) add(new T.SphereGeometry(.035, 6, 4), M.skin, x, 1.06, 0, 'ear');
 // the mop: overlapping tufts, heavier at the back, a fringe over the brow
 const tufts = [[0, 1.17, -.02, .17], [-.09, 1.14, .04, .1], [.09, 1.15, .03, .1], [-.11, 1.1, -.08, .1], [.11, 1.1, -.08, .1], [0, 1.1, -.12, .13], [-.05, 1.13, .11, .08], [.06, 1.12, .12, .08], [-.13, 1.04, -.03, .07], [.13, 1.04, -.03, .07]];
 tufts.forEach(([x, y, z, r], i) => { const t = add(new T.IcosahedronGeometry(r, 0), M.hair, x, y, z, 'blond mop'); t.scale.y = .7; t.rotation.set(i * .7, i * 1.3, 0); });
 const shoulder = (x, name) => pivot(x, .84, 0, name);
 const arm = shoulder(.2, 'throwing arm');
 add(new T.CylinderGeometry(.065, .06, .1, 8), M.jacket, 0, -.03, 0, 'sleeve', arm);
 add(new T.CylinderGeometry(.045, .04, .3, 7), M.skin, 0, -.2, 0, 'arm', arm); add(new T.SphereGeometry(.05, 7, 5), M.skin, 0, -.37, 0, 'hand', arm);
 const off = shoulder(-.2, 'other arm');
 add(new T.CylinderGeometry(.065, .06, .1, 8), M.jacket, 0, -.03, 0, 'sleeve', off);
 add(new T.CylinderGeometry(.045, .04, .3, 7), M.skin, 0, -.2, 0, 'arm', off); add(new T.SphereGeometry(.05, 7, 5), M.skin, 0, -.37, 0, 'hand', off);
 const carry = []; for (let i = 0; i < 3; i++) { const b = new T.Mesh(new T.SphereGeometry(.07, 8, 6), M.ball); b.position.set((i - 1) * .12, .7 + (i === 1 ? .09 : 0), .2); b.visible = false; b.name = 'carried ball'; g.add(b); carry.push(b); }
 g.userData = {legs, carry, arm, off, body}; return g;
}
export function makeDog() {
 // bub, a black lab (Evan, 09:58Z): deep chest, broad head, soft drop ears, an otter tail, a red collar.
 const g = new T.Group(); g.name = 'dog';
 const add = (geo, mat, x, y, z, parent = g) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
 const torso = add(new T.CapsuleGeometry(.19, .42, 4, 10), M.fur, 0, .44, 0); torso.rotation.z = Math.PI / 2; torso.scale.set(1.05, 1, .92);
 add(new T.SphereGeometry(.2, 10, 8), M.fur, .2, .45, 0).scale.set(1, 1.1, .95); // chest
 const neck = add(new T.CylinderGeometry(.1, .14, .2, 8), M.fur, .36, .58, 0); neck.rotation.z = -.7;
 const head = add(new T.BoxGeometry(.24, .2, .22), M.fur, .48, .68, 0);
 add(new T.BoxGeometry(.17, .11, .14), M.fur, .64, .63, 0); // muzzle
 add(new T.SphereGeometry(.03, 6, 4), M.nose, .73, .66, 0);
 for (const z of [-.06, .06]) add(new T.SphereGeometry(.018, 6, 4), M.eye, .6, .72, z);
 add(new T.TorusGeometry(.12, .025, 6, 14), M.collar, .38, .56, 0).rotation.y = Math.PI / 2;
 for (const z of [-.12, .12]) { const e = add(new T.BoxGeometry(.05, .17, .1), M.furDark, .45, .64, z); e.rotation.x = z > 0 ? .35 : -.35; }
 const legs = [[.2, .1], [.2, -.1], [-.24, .1], [-.24, -.1]].map(([x, z]) => {
  const hip = new T.Group(); hip.position.set(x, .36, z); g.add(hip);
  add(new T.CylinderGeometry(.055, .045, .3, 7), M.fur, 0, -.17, 0, hip); add(new T.BoxGeometry(.08, .04, .09), M.fur, .02, -.33, 0, hip);
  return hip;
 });
 const tail = add(new T.CylinderGeometry(.045, .018, .4, 7), M.fur, -.46, .52, 0); tail.rotation.z = -1.05; // a lab's otter tail
 const mouth = new T.Object3D(); mouth.position.set(.7, .58, 0); g.add(mouth);
 const hit = new T.Mesh(new T.SphereGeometry(1.2, 8, 6), new T.MeshBasicMaterial({visible: false})); hit.position.y = .5; g.add(hit);
 g.userData = {head, tail, hit, legs, mouth}; g.scale.setScalar(1.3); return g;
}
