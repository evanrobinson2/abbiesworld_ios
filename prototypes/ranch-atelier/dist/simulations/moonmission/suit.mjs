// AW-STUDY-0036 the Moon Mission space suit, hi-fi low poly (Evan, 20:11Z: "the suit is great but it has to be done really well").
// Engineered from named parts, not a blob: layered fabric panels, ring seals at every joint, a hard torso plate with a control
// panel, a life-support pack with tanks and hoses, a helmet with a gold-tint visor and collar ring, gloves and boots with trim.
// Every part and material is named by what it is (suit_fabric, suit_trim, suit_metal, visor_glass), the game reads the names.
// Built in metres for a 1.8 m adult, then scaled by `h`. White suit, colour trim per hero (Abbie pink, Ani purple, Daddy blue).
import * as THREE from 'three';

const M = {};
function mats(trim, skin) {
 const key = trim + ':' + skin; if (M[key]) return M[key];
 const std = (name, o) => Object.assign(new THREE.MeshStandardMaterial({flatShading: true, ...o}), {name});
 return M[key] = {
  fabric: std('suit_fabric', {color: 0xf3f4f8, roughness: .82, metalness: 0}),
  fabric2: std('suit_fabric_shade', {color: 0xdfe3ec, roughness: .85, metalness: 0}),
  seam: std('suit_seam', {color: 0x8a92a6, roughness: .7}),
  trim: std('suit_trim', {color: trim, roughness: .55, metalness: .05}),
  metal: std('suit_metal', {color: 0xc9d0dc, roughness: .5, metalness: .35}),
  dark: std('suit_rubber', {color: 0x2a2f3a, roughness: .9}),
  visor: new THREE.MeshPhysicalMaterial({name: 'visor_glass', color: 0x1d2a44, roughness: .08, metalness: .9, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x1a3a66, emissiveIntensity: .25, flatShading: false}),
  face: std('skin', {color: skin, roughness: .8}),
  lamp: new THREE.MeshBasicMaterial({name: 'suit_lamp', color: 0xfff2b0}),
  led: new THREE.MeshBasicMaterial({name: 'suit_led', color: 0x6fe3a5}),
 };
}
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };
const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const ring = (r, t, seg = 12) => { const g = new THREE.TorusGeometry(r, t, 5, seg); g.rotateX(Math.PI / 2); return g; };

function limb(m, len, r0, r1, joint = true) { // a limb segment with a panel band and a sealed joint ring at the top
 const g = new THREE.Group(); g.add(mesh(cyl(r0, r1, len, 10), m.fabric, 0, -len / 2, 0), mesh(cyl(r0 * 1.04, r0 * 1.04, len * .12, 10), m.fabric2, 0, -len * .3, 0));
 if (joint) g.add(mesh(ring(r0 * 1.02, r0 * .16), m.seam, 0, 0, 0)); return g;
}

export function suit(id, {trim = 0xff7eb6, skin = 0xe0b08c, h = 1.8, childHead = 1, face = true} = {}) {
 const m = mats(trim, skin), root = new THREE.Group(); root.name = 'suit_' + id; const k = h / 1.8;
 const body = new THREE.Group(); body.name = 'body'; root.add(body);
 // torso: tapered fabric shell, hard chest plate with a control panel, waist and hip rings
 body.add(mesh(cyl(.25, .21, .56, 10), m.fabric, 0, 1.18, 0));
 body.add(mesh(box(.34, .28, .1), m.metal, 0, 1.28, .2));                                    // chest plate
 body.add(mesh(box(.3, .06, .02), m.trim, 0, 1.38, .255));                                   // trim bar on the plate
 [-.08, 0, .08].forEach((x, i) => body.add(mesh(box(.04, .04, .02), i === 1 ? m.led : m.trim, x, 1.26, .255))); // control buttons
 body.add(mesh(ring(.215, .03), m.seam, 0, .92, 0), mesh(ring(.235, .025), m.trim, 0, .96, 0)); // waist seam + trim ring
 body.add(mesh(cyl(.22, .2, .16, 10), m.fabric2, 0, .82, 0));                               // hip
 body.add(mesh(box(.5, .02, .02), m.seam, 0, 1.28, .18));
 // neck ring and helmet
 body.add(mesh(cyl(.17, .19, .07, 12), m.metal, 0, 1.5, 0), mesh(ring(.165, .02), m.trim, 0, 1.535, 0));
 const head = new THREE.Group(); head.name = 'helmet'; head.position.y = 1.68; head.scale.setScalar(childHead); body.add(head);
 if (face) head.add(mesh(new THREE.IcosahedronGeometry(.115, 1), m.face, 0, 0, .02));
 head.add(mesh(new THREE.SphereGeometry(.24, 16, 12), new THREE.MeshStandardMaterial({name: 'helmet_shell', color: 0xf3f4f8, roughness: .5, flatShading: true, transparent: true, opacity: .16}), 0, 0, 0));
 const v = new THREE.SphereGeometry(.245, 18, 12, Math.PI * .04, Math.PI * .92, Math.PI * .22, Math.PI * .56); head.add(mesh(v, m.visor, 0, 0, 0));          // the visor: the front only
 head.add(mesh(ring(.2, .03, 14), m.metal, 0, -.13, 0), mesh(ring(.19, .014), m.trim, 0, -.1, 0));                                                   // collar and trim ring
 [-1, 1].forEach(s => { head.add(mesh(cyl(.035, .04, .06, 6), m.metal, s * .245, 0, 0)); head.add(mesh(box(.05, .05, .08), m.lamp, s * .22, .17, .1)); }); // ear pods, helmet lamps
 head.add(mesh(box(.3, .04, .02), m.trim, 0, .2, .17));                                       // brow trim
 // life support pack: shell, two tanks, hoses, status lights
 const pack = new THREE.Group(); pack.name = 'life_support'; pack.position.set(0, 1.2, -.23); body.add(pack);
 pack.add(mesh(box(.38, .5, .2), m.fabric2, 0, 0, 0), mesh(box(.4, .06, .22), m.trim, 0, .2, 0));
 [-.1, .1].forEach(x => pack.add(mesh(cyl(.06, .06, .42, 8), m.metal, x, -.02, -.12), mesh(cyl(.062, .062, .05, 8), m.trim, x, .12, -.12)));
 [-.1, .1].forEach((x, i) => pack.add(mesh(box(.035, .035, .02), i ? m.led : m.trim, x * .6, .12, .105)));
 body.add(mesh(new THREE.TorusGeometry(.14, .018, 5, 10, Math.PI), m.dark, -.14, 1.36, -.02), mesh(new THREE.TorusGeometry(.14, .018, 5, 10, Math.PI), m.dark, .14, 1.36, -.02)); // hoses over the shoulders
 // arms: shoulder ring, upper arm, elbow seal, forearm, glove with cuff
 [-1, 1].forEach(s => {
  const arm = new THREE.Group(); arm.name = s < 0 ? 'arm_L' : 'arm_R'; arm.position.set(s * .34, 1.38, 0); arm.rotation.z = s * .1; body.add(arm);
  arm.add(mesh(new THREE.SphereGeometry(.105, 8, 6), m.fabric2, 0, 0, 0), mesh(ring(.1, .018), m.trim, 0, -.02, 0));
  const up = limb(m, .3, .085, .075); arm.add(up); const el = new THREE.Group(); el.position.y = -.3; arm.add(el); el.add(mesh(ring(.078, .02), m.seam));
  const fo = limb(m, .28, .075, .06, false); el.add(fo); el.add(mesh(cyl(.078, .078, .03, 10), m.trim, 0, -.12, 0));
  const hand = new THREE.Group(); hand.position.y = -.3; el.add(hand); hand.add(mesh(ring(.065, .018), m.metal), mesh(box(.085, .1, .06), m.fabric, 0, -.07, 0), mesh(box(.02, .06, .05), m.fabric, s * .05, -.07, .01), mesh(box(.09, .02, .065), m.dark, 0, -.12, 0));
  if (s > 0) arm.add(mesh(new THREE.CircleGeometry(.05, 10), new THREE.MeshBasicMaterial({color: trim}), .09, -.1, .075)); // mission patch on the right shoulder
 });
 // legs: thigh, knee seal, shin, boot with trim stripe and dark sole
 [-1, 1].forEach(s => {
  const leg = new THREE.Group(); leg.name = s < 0 ? 'leg_L' : 'leg_R'; leg.position.set(s * .11, .76, 0); body.add(leg);
  leg.add(limb(m, .38, .1, .085));
  const kn = new THREE.Group(); kn.position.y = -.38; leg.add(kn); kn.add(mesh(ring(.088, .022), m.seam), mesh(box(.09, .07, .05), m.metal, 0, 0, .085));
  kn.add(limb(m, .36, .085, .07, false), mesh(cyl(.088, .088, .03, 10), m.trim, 0, -.1, 0));
  const boot = new THREE.Group(); boot.position.y = -.36; kn.add(boot); boot.add(mesh(ring(.075, .018), m.metal), mesh(box(.14, .1, .26), m.fabric, 0, -.06, .04), mesh(box(.15, .05, .27), m.dark, 0, -.115, .04), mesh(box(.145, .02, .27), m.trim, 0, -.085, .04));
 });
 body.position.y = -.02; root.scale.setScalar(k);
 root.userData.parts = {body, head, pack}; return root;
}
export const SUIT_TRIM = {daddy: 0x6f9bff, abbie: 0xff7eb6, ani: 0xb18cff};
