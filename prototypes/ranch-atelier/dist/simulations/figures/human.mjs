// AW-STUDY-0034: one recipe for a stylized child's body, built with figure-kit on any skeleton that gives it joint
// positions and bone names (our own axis-aligned bones for young Daddy, the Quaternius CC0 rig for the girl in Grace's
// basement). Faces +Z, left is +X. The look decides clothes, hair and colours; the joints decide the proportions.
import {figureBuilder, roleMaterial, storybookLook, stripes, knitBump, denimBump, strandBump, rubberBump, canvasTexture} from '../figure-kit.mjs';

const L = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const mx = (p) => [-p[0], p[1], p[2]];
const up = (j, dy, dz = 0) => [j[0], j[1] + dy, j[2] + dz];
const rng = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// The look of each part as a material, named for what it is (the game reads names as shading roles).
export function humanMaterials(T, look) {
 const M = {};
 M.skin = roleMaterial(T, 'skin', {color: look.skin, roughness: .62, skin: 1});
 const shirtMap = look.shirtStripe ? stripes(T, look.shirt, look.shirtStripe, look.stripePeriod || .045, .45) : null;
 M.shirt = roleMaterial(T, look.shirtName, {color: shirtMap ? '#ffffff' : look.shirt, map: shirtMap, bump: knitBump(T), bumpScale: .9, roughness: .9, sheen: .4});
 M.bottoms = roleMaterial(T, look.bottomsName, {color: look.bottoms, bump: look.bottomsKind === 'jeans' ? denimBump(T) : knitBump(T), bumpScale: 1.1, roughness: .92, sheen: .3});
 if (look.socks) M.socks = roleMaterial(T, 'tube socks', {map: sockTexture(T, look.socks, look.sockStripe), roughness: .95, bump: knitBump(T), sheen: .4});
 M.shoes = roleMaterial(T, look.shoesName || 'white sneakers', {color: look.shoes, roughness: .55, bump: rubberBump(T), bumpScale: .4});
 M.soles = roleMaterial(T, 'sneaker soles', {color: look.sole, roughness: .8, bump: rubberBump(T), bumpScale: 1.5});
 M.hair = roleMaterial(T, look.hairName, {color: look.hair, roughness: .55, bump: strandBump(T), bumpScale: 1.6, sheen: .5});
 M.eye = roleMaterial(T, 'eyes', {color: look.eyes, roughness: .25});
 M.shine = roleMaterial(T, 'eye shine', {color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .8, roughness: .2});
 M.mouth = roleMaterial(T, 'mouth', {color: '#8e3b36', roughness: .6, skin: .5});
 if (look.tie) M.tie = roleMaterial(T, 'hair tie', {color: look.tie, roughness: .5});
 for (const m of Object.values(M)) storybookLook(T, m);
 return M;
}
function sockTexture(T, base, stripe) {
 const t = canvasTexture(T, 'sock' + base + stripe, 64, (g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s); if (!stripe) return;
  g.fillStyle = stripe; g.fillRect(0, s * .62, s, s * .1); g.fillRect(0, s * .80, s, s * .1);
 }, [1, 1 / .13]);
 t.wrapT = T.ClampToEdgeWrapping; t.repeat.set(1, 1 / .13); t.colorSpace = T.SRGBColorSpace; return t;
}

// J: joints in figure space (left side; the right mirrors it). N: bone names. look: clothes and hair.
export function buildHuman(T, bones, J, N, look) {
 const B = figureBuilder(T, bones), s = J.s || 1, side = [[1, 'L'], [-1, 'R']];
 const sd = (p, k) => (k > 0 ? p : mx(p));
 const hc = J.headC, hr = J.headR;

 // ---- head: one surface from chin to crown, with a narrower chin and a fuller back of the skull
 const headRings = [[-.9, .40, .40, .035], [-.72, .70, .70, .025], [-.48, .88, .88, .012], [-.18, .985, .975, 0], [.15, 1, 1, -.005], [.45, .94, .95, -.01], [.72, .74, .78, -.012], [.9, .46, .5, -.01]];
 B.loft('skin', headRings.map(([f, ax, az, dz]) => ({p: [hc[0], hc[1] + f * hr[1], hc[2] + dz * hr[2] * 2], r: [ax * hr[0], az * hr[2]], b: N.head})), {n: 16, cap0: true, cap1: true, capLen: .3, facet: .12, glow: 0});
 const surfZ = (x, dy) => hc[2] + hr[2] * Math.sqrt(Math.max(0, 1 - (x / hr[0]) ** 2 - (dy / hr[1]) ** 2));
 const eyeY = hc[1] - .08 * hr[1], eyeX = .37 * hr[0];
 for (const [k] of side) {
  const ez = surfZ(eyeX, eyeY - hc[1]);
  B.blob('eye', [k * eyeX, eyeY, ez - .006], [.021 * s, .027 * s, .012 * s], N.head, {n: 10, rows: 5});
  B.blob('shine', [k * eyeX - .006 * s, eyeY + .01 * s, ez + .004], [.0065 * s, .0065 * s, .004 * s], N.head, {n: 6, rows: 3});
  B.lock('hair', [[k * (eyeX - .025 * s), eyeY + .043 * s, surfZ(eyeX - .025 * s, eyeY + .043 * s - hc[1]) - .002], [k * eyeX, eyeY + .05 * s, surfZ(eyeX, eyeY + .05 * s - hc[1]) + .001], [k * (eyeX + .027 * s), eyeY + .044 * s, surfZ(eyeX + .027 * s, eyeY + .044 * s - hc[1]) - .003]], .0075 * s, .005 * s, N.head, {n: 5, facet: .2});
  // ears, thin enough for the sun to glow through
  B.blob('skin', [k * hr[0] * .97, eyeY + .005, hc[2] - .01], [.02 * s, .036 * s, .027 * s], N.head, {n: 8, rows: 5, glow: 1, euler: [0, k * .35, 0]});
  B.paint('skin', [k * .6 * hr[0], eyeY - .05 * s, surfZ(.6 * hr[0], eyeY - .05 * s - hc[1])], .032 * s, look.blush);
 }
 const noseY = eyeY - .045 * s;
 B.blob('skin', [0, noseY, surfZ(0, noseY - hc[1]) + .004], [.017 * s, .014 * s, .016 * s], N.head, {n: 8, rows: 5, glow: .85});
 const mY = eyeY - .086 * s, mw = .022 * s;
 B.lock('mouth', [[-mw, mY + .005 * s, surfZ(mw, mY - hc[1]) - .003], [0, mY, surfZ(0, mY - hc[1]) - .002], [mw, mY + .005 * s, surfZ(mw, mY - hc[1]) - .003]], .0055 * s, .0055 * s, N.head, {n: 5});

 // ---- neck
 B.lock('skin', [L(J.neck, J.chest, .3), J.neck, L(J.neck, J.head, .5), [J.head[0], J.head[1] + .04 * s, J.head[2]]], .043 * s, .041 * s, [N.chest, N.neck, N.neck, N.head], {n: 10, cap0: false, cap1: false});

 // ---- shirt: hem to collar in one surface, then the sleeves
 const sh = J.shoulder;
 B.loft('shirt', [
  {p: up(J.hips, .025 * s), r: [.153 * s, .109 * s], k: 2.4, b: N.hips},
  {p: up(J.spine, -.01 * s), r: [.142 * s, .098 * s], k: 2.4, b: [[N.hips, .3], [N.spine, .7]]},
  {p: L(J.spine, J.chest, .5), r: [.149 * s, .102 * s], k: 2.4, b: N.spine},
  {p: up(J.chest, 0, .006), r: [.158 * s, .106 * s], k: 2.5, b: [[N.spine, .3], [N.chest, .7]]},
  {p: [J.chest[0], sh[1] - .012 * s, L(J.chest, J.neck, .5)[2]], r: [Math.abs(sh[0] - J.chest[0]) - .012 * s, .096 * s], k: 2.25, b: N.chest},
  {p: [J.chest[0], sh[1] + .026 * s, L(J.chest, J.neck, .7)[2] - .004], r: [.135 * s, .082 * s], k: 2.5, b: N.chest},
  {p: up(J.neck, .012 * s), r: [.058 * s, .053 * s], b: [[N.chest, .6], [N.neck, .4]]},
 ], {n: 14, cap1: true, capLen: .5, facet: .08});
 for (const [k, S] of side) {
  const a = sd(sh, k), e = sd(J.elbow, k), w = sd(J.wrist, k), he = sd(J.handEnd, k), ua = N.upperArm(S), fa = N.foreArm(S), hd = N.hand(S);
  const sleeve = look.sleeve ?? .45;
  B.loft('shirt', [
   {p: [k * (sh[0] - .03 * s), sh[1] - .02 * s, sh[2]], r: .056 * s, b: [[N.chest, .6], [ua, .4]]},
   {p: L(a, e, .04), r: .064 * s, b: [[N.chest, .25], [ua, .75]]},
   {p: L(a, e, sleeve * .6), r: .063 * s, b: ua},
   {p: L(a, e, sleeve), r: .064 * s, b: ua},
  ], {n: 10, facet: .08});
  // arm, elbow, forearm, wrist and a mitten hand, one surface to the fingertips, flat across the palm
  B.loft('skin', [
   {p: L(a, e, .2), r: .043 * s, b: ua}, {p: L(a, e, .7), r: .04 * s, b: ua},
   {p: e, r: [.037 * s, .039 * s], b: [[ua, .5], [fa, .5]]},
   {p: L(e, w, .35), r: .037 * s, b: fa}, {p: L(e, w, .85), r: [.029 * s, .031 * s], b: fa}, {p: w, r: [.022 * s, .029 * s], b: [[fa, .5], [hd, .5]]},
   {p: L(w, he, .4), r: [.018 * s, .034 * s], b: hd, glow: .5}, {p: L(w, he, .75), r: [.017 * s, .033 * s], b: hd, glow: .5}, {p: he, r: [.014 * s, .024 * s], b: hd, glow: .6},
  ], {n: 9, cap1: true, capLen: 1, facet: .05});
  B.lock('skin', [[w[0] - k * .006 * s, w[1] - .02 * s, w[2] + .024 * s], [w[0] - k * .012 * s, w[1] - .045 * s, w[2] + .034 * s], [w[0] - k * .01 * s, w[1] - .068 * s, w[2] + .032 * s]], .012 * s, .009 * s, hd, {n: 6, glow: .8});

  // legs, socks and shoes
  const hp = sd(J.hip, k), kn = sd(J.knee, k), an = sd(J.ankle, k), to = sd(J.toe, k), th = N.thigh(S), sn = N.shin(S), ft = N.foot(S), toe = N.toe?.(S) || ft;
  if (look.bottomsKind === 'jeans') {
   B.loft('bottoms', [
    {p: L(hp, kn, -.08), r: .074 * s, b: [[N.hips, .5], [th, .5]]}, {p: L(hp, kn, .3), r: .066 * s, b: th}, {p: L(hp, kn, .8), r: .056 * s, b: th},
    {p: kn, r: .054 * s, b: [[th, .5], [sn, .5]]}, {p: L(kn, an, .3), r: .053 * s, b: sn}, {p: L(kn, an, .8), r: .051 * s, b: sn},
    {p: L(kn, an, .9), r: .057 * s, b: sn}, {p: L(kn, an, 1.0), r: .057 * s, b: [[sn, .7], [ft, .3]]},
   ], {n: 10, facet: .08});
  } else {
   B.loft('bottoms', [
    {p: L(hp, kn, -.12), r: .076 * s, b: [[N.hips, .5], [th, .5]]}, {p: L(hp, kn, 0), r: .079 * s, b: [[N.hips, .3], [th, .7]]}, {p: L(hp, kn, .2), r: .077 * s, b: th}, {p: L(hp, kn, .42), r: .074 * s, b: th},
   ], {n: 10, facet: .08});
   B.loft('skin', [
    {p: L(hp, kn, .1), r: .06 * s, b: th}, {p: L(hp, kn, .6), r: .05 * s, b: th}, {p: L(hp, kn, .92), r: .045 * s, b: th},
    {p: kn, r: [.044 * s, .046 * s], b: [[th, .5], [sn, .5]]}, {p: L(kn, an, .3), r: [.046 * s, .05 * s], b: sn}, {p: L(kn, an, .75), r: .034 * s, b: sn}, {p: an, r: .029 * s, b: sn},
   ], {n: 9, facet: .05});
   if (look.socks) B.loft('socks', [{p: L(kn, an, .58), r: .038 * s, b: sn}, {p: L(kn, an, .8), r: .035 * s, b: sn}, {p: an, r: .034 * s, b: [[sn, .6], [ft, .4]]}, {p: L(an, to, .25), r: .036 * s, b: ft}], {n: 9});
  }
  // sneaker: heel to toe along the foot, a thicker rubber sole under it
  const f0 = [an[0], an[1] - .035 * s, an[2] - .05 * s], f1 = [to[0], to[1] + .008 * s, to[2] + .035 * s];
  const along = t => L(f0, f1, t), y0 = .012 * s;
  B.loft('shoes', [
   {p: along(0), r: [.038 * s, .036 * s], k: 2.4, b: ft},
   {p: [an[0], an[1] - .018 * s, an[2]], r: [.043 * s, .044 * s], k: 2.4, b: ft},
   {p: [...along(.48).slice(0, 1), .043 * s, along(.48)[2]], r: [.047 * s, .033 * s], k: 2.6, b: ft},
   {p: [...along(.75).slice(0, 1), .036 * s, along(.75)[2]], r: [.05 * s, .027 * s], k: 2.8, b: toe},
   {p: [...along(.95).slice(0, 1), .031 * s, along(.95)[2]], r: [.043 * s, .021 * s], k: 2.6, b: toe},
  ], {n: 12, ref: [0, 1, 0], cap0: true, cap1: true, capLen: .9, facet: .15});
  B.loft('soles', [
   {p: [f0[0], y0, f0[2] - .006 * s], r: [.042 * s, .012 * s], k: 3.2, b: ft}, {p: [an[0], y0, an[2] + .02 * s], r: [.047 * s, .013 * s], k: 3.2, b: ft},
   {p: [f1[0], y0, L(f0, f1, .75)[2]], r: [.054 * s, .013 * s], k: 3.2, b: toe}, {p: [f1[0], y0 + .002, f1[2] + .006 * s], r: [.046 * s, .012 * s], k: 3, b: toe},
  ], {n: 12, ref: [0, 1, 0], cap0: true, cap1: true, capLen: 1, facet: .3});
 }
 // ---- pelvis of the shorts or jeans, closing under the shirt
 B.loft('bottoms', [
  {p: up(J.spine, -.045 * s), r: [.126 * s, .086 * s], k: 2.4, b: [[N.hips, .6], [N.spine, .4]]},
  {p: J.hips, r: [.143 * s, .097 * s], k: 2.4, b: N.hips},
  {p: [J.hips[0], J.hip[1] - .03 * s, J.hip[2]], r: [.136 * s, .094 * s], k: 2.4, b: N.hips},
 ], {n: 14, cap1: true, capLen: .45, facet: .08});

 hair(B, J, N, look, s);
 return B;
}

// Hair as chunky locks over a cap, so the light catches clumps instead of a helmet.
function hair(B, J, N, look, s) {
 const hc = J.headC, hr = J.headR, R = rng(look.seed || 11);
 // the cap: follows the skull, low at the nape, up to the brow at the front
 const cap = [-.35, -.05, .25, .52, .76, .93].map(f => {
  const s0 = Math.sqrt(1 - f * f);
  return {p: [hc[0], hc[1] + f * hr[1], hc[2] - .01 * s], r: [hr[0] * s0 * 1.075, hr[2] * s0 * 1.085], b: N.head, s: q => {
   const front = Math.max(0, Math.sin(q)) ** 2; if (!front) return [1, 1, 0];
   const nf = f + front * (look.brow + (f + .35) * (1 - look.brow) / 1.35 - f), k = Math.sqrt(Math.max(.01, 1 - nf * nf)) / s0; return [k, k, (nf - f) * hr[1]];
  }};
 });
 B.loft('hair', cap, {n: 18, cap1: true, capLen: .6, facet: .2});
 const onHead = (phi, el, out = 1.07) => [hc[0] + Math.sin(phi) * Math.cos(el) * hr[0] * out, hc[1] + Math.sin(el) * hr[1] * out, hc[2] + Math.cos(phi) * Math.cos(el) * hr[2] * out];
 const add = (pts, r0) => B.lock('hair', pts, r0, 0, N.head, {n: 6, facet: .32, glow: .2});
 if (look.hairStyle === 'mop') {
  // young Daddy's blond mop: locks all round, longer at the back and over the ears, a heavy fringe
  for (let i = 0; i < 22; i++) {
   const phi = (i / 22) * Math.PI * 2 + R() * .15, front = Math.cos(phi) > .55;
   const el = front ? .66 + R() * .08 : .1 + R() * .5, len = (front ? .06 : .07 + R() * .04) * s;
   const p0 = onHead(phi, el, .98), outD = [Math.sin(phi), 0, Math.cos(phi)];
   const p1 = [p0[0] + outD[0] * .03 * s, p0[1] - len * .4, p0[2] + outD[2] * .03 * s];
   const p2 = [p0[0] + outD[0] * .036 * s, p0[1] - len * (front ? .8 : .95), p0[2] + outD[2] * (front ? .045 : .025) * s];
   B.lock('hair', [p0, p1, p2], (.05 + R() * .012) * s, .016 * s, N.head, {n: 7, facet: .25, glow: .2, capLen: 1.4});
  }
  for (let i = 0; i < 9; i++) { // the crown, swirling back
   const phi = i / 9 * Math.PI * 2, p0 = onHead(phi, 1.1, 1.0), d = [Math.sin(phi + .8), 0, Math.cos(phi + .8)];
   B.lock('hair', [p0, [p0[0] + d[0] * .045 * s, p0[1] + .004 * s, p0[2] + d[2] * .045 * s], [p0[0] + d[0] * .075 * s, p0[1] - .016 * s, p0[2] + d[2] * .075 * s]], .048 * s, .018 * s, N.head, {n: 7, facet: .25, capLen: 1.4});
  }
 } else {
  // a ponytail and bangs, the hair swept back from the face
  for (let i = -3; i <= 3; i++) {
   const phi = i * .2, p0 = onHead(phi, .78, 1.0), q = onHead(phi * 1.3, .42, 1.12);
   add([p0, L(p0, q, .55).map((v, k) => v + (k === 2 ? .012 * s : 0)), q], .036 * s);
  }
  for (const k of [1, -1]) for (let i = 0; i < 4; i++) { // sides, tucked behind the ears
   const phi = k * (1.1 + i * .3), p0 = onHead(phi, .6, 1.0), p1 = onHead(phi, .05, 1.1), p2 = onHead(phi * 1.1, -.25, 1.06);
   add([p0, p1, p2], .04 * s);
  }
  const base = onHead(Math.PI, .62, 1.06);
  B.loft('tie', [{p: L(base, [base[0], base[1] + .01, base[2] - .05], 0), r: .028 * s, b: N.head}, {p: [base[0], base[1] + .005 * s, base[2] - .022 * s], r: .028 * s, b: N.head}], {n: 10, cap0: true, cap1: true, capLen: .4});
  const tail = [[base[0], base[1] - .005 * s, base[2] - .02 * s], [base[0], base[1] - .03 * s, base[2] - .075 * s], [base[0], base[1] - .1 * s, base[2] - .1 * s], [base[0], base[1] - .18 * s, base[2] - .09 * s], [base[0], base[1] - .23 * s, base[2] - .07 * s]];
  B.lock('hair', tail, .05 * s, .012 * s, N.head, {n: 10, facet: .25, capLen: 1.5});
 }
}

// ---------- Our own skeleton for a stylized child, and the pose controller the school jump uses. ----------
export const CHILD_BONES = (J) => {
 const S = [['hips', null, ...J.hips], ['spine', 'hips', ...J.spine], ['chest', 'spine', ...J.chest], ['neck', 'chest', ...J.neck], ['head', 'neck', ...J.head]];
 for (const [k, s] of [[1, 'L'], [-1, 'R']]) {
  const m = p => [p[0] * k, p[1], p[2]];
  S.push([`upperArm.${s}`, 'chest', ...m(J.shoulder)], [`foreArm.${s}`, `upperArm.${s}`, ...m(J.elbow)], [`hand.${s}`, `foreArm.${s}`, ...m(J.wrist)]);
  S.push([`thigh.${s}`, 'hips', ...m(J.hip)], [`shin.${s}`, `thigh.${s}`, ...m(J.knee)], [`foot.${s}`, `shin.${s}`, ...m(J.ankle)], [`toe.${s}`, `foot.${s}`, ...m(J.toe)]);
 }
 return S;
};
export const CHILD_NAMES = {hips: 'hips', spine: 'spine', chest: 'chest', neck: 'neck', head: 'head', upperArm: s => `upperArm.${s}`, foreArm: s => `foreArm.${s}`, hand: s => `hand.${s}`, thigh: s => `thigh.${s}`, shin: s => `shin.${s}`, foot: s => `foot.${s}`, toe: s => `toe.${s}`};
