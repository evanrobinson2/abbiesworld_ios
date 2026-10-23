// AW-STUDY-0041: draws the mannequin as cut-out pieces, one rig per practice rep, from the body study's canon.
// node tools/rig2d/build.mjs  -> prototypes/ranch-atelier/dist/studies/rigging/rigs/*.json
// Each rep changes one thing (ARTIST_METHOD.md section 4); notes.json records why.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'prototypes/ranch-atelier/dist/studies/rigging/rigs');
mkdirSync(OUT, { recursive: true });
const anatomy = JSON.parse(readFileSync(join(ROOT, 'docs/oracle/bodies/anatomy.json'), 'utf8'));
const canon = Object.fromEntries(anatomy.measurements.figures['male-average'].rows.map(r => [r.what, r.heads]));

export const H = 56;                        // pixels per head; the figure is 7.5 heads
const k = v => Math.round(v * H * 100) / 100;
const P = (x, y) => [k(x), k(y)];
const r2 = n => Math.round(n * 100) / 100;

// ---------- joints: front and side views, same names as tools/figure-practice/mannequin/rest-joints.json ----------
// Character space: x right on screen, y down, ground at y=0, centre x=0. Figure's R is screen left in the front view.
const A = 17 * Math.PI / 180, ua = canon['upper arm, acromion to elbow'], fa = canon['forearm, elbow to wrist'],
  hd = canon['length, wrist to fingertip'];
function frontJoints() {
  const J = { hc: P(0, -3.9), pelvis: P(0, -3.42), waist: P(0, -4.55), neck: P(0, -6.42), crown: P(0, -7.5) };
  for (const [s, sg] of [['R', -1], ['L', 1]]) {
    const sx = 0.8 * sg, sy = -6.05, dx = Math.sin(A) * sg, dy = Math.cos(A);
    J['s' + s] = P(sx, sy);
    J['e' + s] = P(sx + dx * ua, sy + dy * ua);
    J['w' + s] = P(sx + dx * (ua + fa * 0.98), sy + dy * (ua + fa));
    J['f' + s] = P(sx + dx * (ua + fa + hd) * 0.99, sy + dy * (ua + fa + hd));
    J['h' + s] = P(0.42 * sg, -3.78);
    J['k' + s] = P(0.37 * sg, -3.78 + canon['thigh, trochanter to mid-knee']);
    J['a' + s] = P(0.33 * sg, -0.2);
    J['t' + s] = P(0.4 * sg, 0);
  }
  return J;
}
function sideJoints() {   // facing screen right; near side = figure's left
  const J = { hc: P(0, -3.9), pelvis: P(-0.05, -3.42), waist: P(0.06, -4.55), neck: P(0.02, -6.42), crown: P(-0.08, -7.5) };
  for (const [s, dx] of [['R', -0.1], ['L', 0]]) {
    J['s' + s] = P(-0.02 + dx, -6.02);
    J['e' + s] = P(-0.12 + dx, -6.02 + ua);
    J['w' + s] = P(0.1 + dx, -6.02 + ua + fa * 0.98);
    J['f' + s] = P(0.2 + dx, -6.02 + ua + fa + hd * 0.98);
    J['h' + s] = P(0 + dx, -3.78);
    J['k' + s] = P(0.12 + dx, -3.78 + canon['thigh, trochanter to mid-knee']);
    J['a' + s] = P(-0.02 + dx, -0.22);
    J['t' + s] = P(0.82 + dx, -0.04);
  }
  return J;
}

// Bone names are the mannequin's (tools/figure-practice/pose_svg.py) plus a root "hips".
const BONES = [
  ['hips', null, 'hc', 'pelvis'], ['abdomen', 'hips', 'hc', 'waist'], ['chest', 'abdomen', 'waist', 'neck'],
  ['head', 'chest', 'neck', 'crown'],
  ...['R', 'L'].flatMap(s => [
    ['uarm' + s, 'chest', 's' + s, 'e' + s], ['farm' + s, 'uarm' + s, 'e' + s, 'w' + s], ['hand' + s, 'farm' + s, 'w' + s, 'f' + s],
    ['thigh' + s, 'hips', 'h' + s, 'k' + s], ['shin' + s, 'thigh' + s, 'k' + s, 'a' + s], ['foot' + s, 'shin' + s, 'a' + s, 't' + s]]),
].map(([name, parent, head, tail]) => ({ name, parent, head, tail, alias: studioName(name) }));
// The Character Studio's bone names (studies/character-studio, AW-STUDY-0037/0038), so poses move between them.
function studioName(n) {
  const m = { hips: 'pelvis', abdomen: 'spine', chest: 'chest', head: 'head', uarm: 'upperarm', farm: 'forearm', hand: 'hand', thigh: 'thigh', shin: 'shin', foot: 'foot' };
  const side = /[RL]$/.test(n) && n !== 'hips' ? n.slice(-1) : '';
  return m[side ? n.slice(0, -1) : n] + (side ? '_' + side : '');
}

const len = (J, b) => Math.hypot(J[b.tail][0] - J[b.head][0], J[b.tail][1] - J[b.head][1]);

// ---------- drawing: smooth edges through profile points ----------
function smooth(pts) {             // Catmull-Rom through points -> cubic Béziers (open curve, starts with the first point)
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r2(c1[0])} ${r2(c1[1])} ${r2(c2[0])} ${r2(c2[1])} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d;
}
// A limb piece in bone space (bone along +x, length L). a = the -y edge, b = the +y edge: [[t, halfwidth in heads], ...].
// Round caps centred exactly on both pivots (r0, r1 in heads): the joint is a disc whatever the angle.
function limb(L, a, b, r0, r1, caps = true) {
  const top = a.map(([t, h]) => [t * L, -k(h)]), bot = b.map(([t, h]) => [t * L, k(h)]).reverse();
  if (!caps) return `M${top.map(p => p.map(r2).join(' ')).join('L')}L${bot.map(p => p.map(r2).join(' ')).join('L')}Z`;
  return `M${r2(top[0][0])} ${r2(top[0][1])}${smooth(top)}A${k(r1)} ${k(r1)} 0 0 1 ${r2(bot[0][0])} ${r2(bot[0][1])}` +
    `${smooth(bot)}A${k(r0)} ${k(r0)} 0 0 1 ${r2(top[0][0])} ${r2(top[0][1])}Z`;
}
const flat = (h0, h1) => [[0, h0], [1, h1]];

// The profiles, in heads. Outer/inner (front view) or front/back (side view); straight sides face curved ones and
// the bulge peaks sit at different heights on each edge (construction.json limb rules, anatomy.json surface forms).
const FRONT = {
  uarm: { r0: .27, r1: .16, outer: [[0, .27], [.12, .31], [.3, .26], [.55, .21], [.8, .18], [1, .16]],
    inner: [[0, .27], [.15, .19], [.5, .22], [.75, .19], [1, .16]] },
  farm: { r0: .16, r1: .12, outer: [[0, .16], [.22, .22], [.5, .17], [.8, .13], [1, .12]],
    inner: [[0, .16], [.3, .2], [.55, .17], [.85, .12], [1, .12]] },
  thigh: { r0: .36, r1: .22, outer: [[0, .36], [.18, .4], [.55, .32], [.85, .24], [1, .22]],
    inner: [[0, .36], [.2, .32], [.55, .24], [.8, .25], [1, .22]] },
  shin: { r0: .22, r1: .13, outer: [[0, .22], [.25, .27], [.6, .18], [.88, .13], [1, .13]],
    inner: [[0, .22], [.36, .28], [.66, .18], [.9, .13], [1, .13]] },
};
const SIDE = {
  uarm: { r0: .24, r1: .17, front: [[0, .24], [.2, .27], [.55, .26], [.85, .18], [1, .17]],
    back: [[0, .24], [.3, .25], [.6, .21], [.85, .17], [1, .17]] },
  farm: { r0: .17, r1: .11, front: [[0, .17], [.25, .22], [.6, .15], [1, .11]],
    back: [[0, .17], [.2, .18], [.6, .14], [1, .11]] },
  thigh: { r0: .4, r1: .23, front: [[0, .4], [.4, .37], [.8, .26], [1, .23]],
    back: [[0, .4], [.12, .44], [.4, .33], [.8, .25], [1, .23]] },
  shin: { r0: .23, r1: .13, front: [[0, .23], [.3, .2], [.7, .16], [1, .13]],
    back: [[0, .23], [.28, .32], [.6, .2], [.9, .14], [1, .13]] },
};

// For a bone pointing down the screen, local -y is screen right and +y is screen left.
// Front view: figure R limbs are on screen left (outer = +y), L limbs on screen right (outer = -y).
// Side view facing right: front of a down-pointing limb is screen right (-y), the back +y.
function limbPiece(view, kind, side, L) {
  if (view === 'front') {
    const p = FRONT[kind];
    const [a, b] = side === 'R' ? [p.inner, p.outer] : [p.outer, p.inner];
    return limb(L, a, b, p.r0, p.r1);
  }
  const p = SIDE[kind];
  return limb(L, p.front, p.back, p.r0, p.r1);
}

function trunk(view, J) {   // hips, abdomen, chest, head pieces (bone space)
  const L = n => len(J, BONES.find(b => b.name === n));
  if (view === 'front') {
    const Lc = L('chest'), La = L('abdomen'), Lh = L('head');
    // chest: from the waist (x=0) up to the neck (x=Lc); the ribcage egg, widest just under the armpits.
    const chest = [[0, .6], [.3, .7], [.62, .78], [.82, .74], [.94, .42], [1, .2]];
    const ab = [[0, .66], [.5, .6], [1, .6]];
    const hips = [[-.1, .62], [.15, .76], [.6, .62], [1, .3]];
    return {
      chest: limb(Lc, chest, chest, .6, .2),
      abdomen: limb(La, ab, ab, .62, .58, true),
      hips: limb(L('hips'), hips.map(([t, h]) => [Math.max(t, 0), h]), hips.map(([t, h]) => [Math.max(t, 0), h]), .62, .3),
      head: `<path d="M${r2(-k(.05))} ${r2(-k(.12))}L${r2(k(.26))} ${r2(-k(.12))}L${r2(k(.26))} ${r2(k(.12))}L${r2(-k(.05))} ${r2(k(.12))}Z"/>` +
        `<ellipse cx="${r2(Lh * .55)}" cy="0" rx="${r2(Lh * .5)}" ry="${r2(k(.34))}"/>`,
      Lh,
    };
  }
  const Lc = L('chest'), La = L('abdomen'), Lh = L('head');
  // side: chest bone points up the screen, so local -y is screen left (the back) and +y is screen right (the front)
  const back = [[0, .42], [.3, .44], [.62, .54], [.85, .44], [1, .16]], front = [[0, .46], [.35, .52], [.64, .62], [.86, .42], [1, .17]];
  const abBack = [[0, .5], [.5, .42], [1, .42]], abFront = [[0, .44], [.5, .5], [1, .46]];
  const hpBack = [[0, .5], [.45, .66], [1, .32]], hpFront = [[0, .44], [.5, .38], [1, .3]];
  return {
    chest: limb(Lc, back, front, .42, .16),
    abdomen: limb(La, abBack, abFront, .46, .42),
    // hips bone points down: -y is screen right (front), +y screen left (back, the glutes)
    hips: limb(L('hips'), hpFront, hpBack, .47, .3),
    head: `<path d="M${r2(-k(.05))} ${r2(-k(.11))}L${r2(k(.3))} ${r2(-k(.13))}L${r2(k(.3))} ${r2(k(.1))}L${r2(-k(.05))} ${r2(k(.11))}Z"/>` +
      `<path d="M${r2(Lh * .05)} ${r2(k(.05))}C${r2(Lh * .02)} ${r2(k(.45))} ${r2(Lh * .9)} ${r2(k(.55))} ${r2(Lh)} ${r2(k(.05))}` +
      `C${r2(Lh * 1.02)} ${r2(-k(.35))} ${r2(Lh * .55)} ${r2(-k(.5))} ${r2(Lh * .25)} ${r2(-k(.38))}C${r2(Lh * .12)} ${r2(-k(.3))} ${r2(Lh * .02)} ${r2(-k(.2))} ${r2(Lh * .05)} ${r2(k(.05))}Z"/>`,
    Lh,
  };
}

function hand(L, view) {   // mitten: palm then the finger block, thumb as its own bump on the inside
  const u = L;
  if (view === 'side') return `<path d="M0 ${-k(.11)}C${u * .3} ${-k(.15)} ${u * .6} ${-k(.15)} ${u * .85} ${-k(.08)}Q${u * 1.02} 0 ${u * .85} ${k(.07)}C${u * .6} ${k(.13)} ${u * .3} ${k(.16)} 0 ${k(.11)}Z"/>`;
  return `<path d="M0 ${-k(.12)}C${r2(u * .3)} ${-k(.2)} ${r2(u * .62)} ${-k(.2)} ${r2(u * .9)} ${-k(.1)}Q${r2(u * 1.03)} 0 ${r2(u * .9)} ${k(.1)}` +
    `C${r2(u * .62)} ${k(.2)} ${r2(u * .3)} ${k(.2)} 0 ${k(.12)}A${k(.12)} ${k(.12)} 0 0 1 0 ${-k(.12)}Z"/>`;
}
function foot(L, view, side) {
  if (view === 'side') {   // bone from the ankle to the ball/toe, pointing forward; heel behind the ankle
    return `<path d="M${-k(.26)} ${-k(.02)}C${-k(.3)} ${-k(.16)} ${-k(.08)} ${-k(.16)} ${k(.08)} ${-k(.12)}` +
      `C${r2(L * .5)} ${-k(.06)} ${r2(L * .9)} ${-k(.02)} ${r2(L * 1.05)} ${k(.04)}L${r2(L * 1.03)} ${k(.2)}L${-k(.24)} ${k(.2)}Q${-k(.34)} ${k(.12)} ${-k(.26)} ${-k(.02)}Z"/>`;
  }
  const o = side === 'R' ? 1 : -1;   // front: bone points down; the foot widens to the ground, flares outward
  return `<path d="M0 ${-k(.13)}L${r2(L * 1.05)} ${r2(-k(.2) - (o < 0 ? k(.12) : 0))}L${r2(L * 1.05)} ${r2(k(.2) + (o > 0 ? k(.12) : 0))}L0 ${k(.13)}A${k(.13)} ${k(.13)} 0 0 1 0 ${-k(.13)}Z"/>`;
}

// ---------- the reps ----------
function pieces(view, style, J) {
  const out = {}, T = trunk(view, J);
  for (const b of BONES) {
    const L = len(J, b), kind = b.name.replace(/[RL]$/, ''), side = b.name.slice(-1);
    let d;
    if (style === 'rect') {
      // Rep 1: a rectangle per bone, cut at the joints, average width.
      const w = { uarm: .22, farm: .17, hand: .14, thigh: .32, shin: .21, foot: .15, chest: .7, abdomen: .62, hips: .6, head: .34 }[kind];
      d = `<path d="${limb(L, flat(w, w), flat(w, w), w, w, false)}"/>`;
    } else if (style === 'capsule') {
      // Rep 2: the same widths, but each end is a disc centred on its pivot, so the pieces overlap at every joint.
      const w = { uarm: [.27, .16], farm: [.16, .12], hand: [.12, .1], thigh: [.36, .22], shin: [.22, .13], foot: [.13, .13],
        chest: [.6, .2], abdomen: [.62, .58], hips: [.62, .3], head: [.34, .34] }[kind];
      d = `<path d="${limb(L, flat(...w), flat(...w), w[0], w[1])}"/>`;
    } else {
      // Rep 3+: drawn forms. Limbs from profiles, the trunk and head from their own shapes.
      if (FRONT[kind]) d = `<path d="${limbPiece(view, kind, side, L)}"/>`;
      else if (kind === 'hand') d = hand(L, view);
      else if (kind === 'foot') d = foot(L, view, side);
      else if (kind === 'head') d = T.head;
      else d = `<path d="${T[kind]}"/>`;
    }
    out[b.name] = { default: d };
  }
  return out;
}

// Draw order, back to front. Front view: legs, hips, trunk, head, arms. Side view: far limbs, trunk, near limbs.
function slots(view, grouped) {
  const g = n => grouped ? { group: n } : {};
  const S = (bone, extra = {}) => ({ bone, piece: bone, ...extra });
  if (view === 'front') return [
    ...['R', 'L'].flatMap(s => ['foot', 'shin', 'thigh'].map(n => S(n + s, g('body')))),
    S('hips', g('body')), S('abdomen', g('body')), S('chest', g('body')), S('head', g('body')),
    ...['R', 'L'].flatMap(s => ['hand', 'farm', 'uarm'].map(n => S(n + s, g('arm' + s)))),
  ];
  return [
    ...['hand', 'farm', 'uarm'].map(n => S(n + 'R', { far: true, ...g('farArm') })),
    ...['foot', 'shin', 'thigh'].map(n => S(n + 'R', { far: true, ...g('farLeg') })),
    S('hips', g('body')), S('abdomen', g('body')), S('chest', g('body')), S('head', g('body')),
    ...['foot', 'shin', 'thigh'].map(n => S(n + 'L', g('nearLeg'))),
    ...['hand', 'farm', 'uarm'].map(n => S(n + 'L', g('nearArm'))),
  ];
}

function ik(view) {
  if (view === 'front') return [
    { name: 'handR', bones: ['uarmR', 'farmR'], bend: -1, stretch: 1.12 },
    { name: 'handL', bones: ['uarmL', 'farmL'], bend: 1, stretch: 1.12 },
  ];
  return [
    { name: 'footR', bones: ['thighR', 'shinR'], bend: 1, hold: 'footR' },
    { name: 'footL', bones: ['thighL', 'shinL'], bend: 1, hold: 'footL' },
    { name: 'handR', bones: ['uarmR', 'farmR'], bend: -1, stretch: 1.12 },
    { name: 'handL', bones: ['uarmL', 'farmL'], bend: -1, stretch: 1.12 },
  ];
}

export function makeRig({ id, rep, title, view = 'front', style, grouped = false, animations = {} }) {
  const J = view === 'front' ? frontJoints() : sideJoints();
  return {
    format: 'aw-rig2d', version: 1, id, rep, title, view, style,
    character: 'Blue-graphite mannequin (AW-STUDY-0038 shares this rig)',
    units: { px_per_head: H, heads: 7.5, origin: 'ground under the hip centre', y: 'down' },
    joints: J, bones: BONES, ik: ik(view), slots: slots(view, grouped), pieces: pieces(view, style, J), animations,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { ANIMS } = await import('./anims.mjs');
  const reps = [
    { id: 'rep1-rect', rep: 1, title: 'Rectangles cut at the joints', style: 'rect' },
    { id: 'rep2-capsule', rep: 2, title: 'Discs on the pivots', style: 'capsule' },
    { id: 'rep3-forms', rep: 3, title: 'Drawn forms: straight against curve', style: 'forms' },
    { id: 'rep4-patch', rep: 4, title: 'One outline per body (the auto-patch)', style: 'forms', grouped: true },
    { id: 'rep5-side', rep: 5, title: 'Side view, IK legs, first jump', style: 'forms', grouped: true, view: 'side', animations: ANIMS.v1 },
    { id: 'rep6-motion', rep: 6, title: 'Anticipation, area-true squash, arcs, overlap', style: 'forms', grouped: true, view: 'side', animations: ANIMS.v2 },
  ];
  for (const r of reps) writeFileSync(join(OUT, r.id + '.json'), JSON.stringify(makeRig(r)));
  // The shipped rigs: the best rep of each view, with every animation.
  writeFileSync(join(OUT, 'mannequin-front.json'), JSON.stringify(makeRig({ id: 'mannequin-front', rep: 4, title: 'Mannequin, front', style: 'forms', grouped: true, animations: ANIMS.front })));
  writeFileSync(join(OUT, 'mannequin-side.json'), JSON.stringify(makeRig({ id: 'mannequin-side', rep: 6, title: 'Mannequin, side', style: 'forms', grouped: true, view: 'side', animations: ANIMS.v2 })));
  console.log('wrote', reps.length + 2, 'rigs to', OUT);
}
