// AW-STUDY-0041 animations, keyed pose to pose (Cooper, Game Anim: pose to pose is how games work).
// Keys: [time, ...values, ease?]; bone values are offsets from rest; IK targets are in character space (pixels).
// Side view faces screen right; ankle rest height is -12.3 px; a flat foot points 12 degrees below horizontal.
const G = -12.3, FLAT = 12;

// Treadmill walk, 1 s: contact, down, passing, up, then the other side (Richard Williams' walk positions).
function footKeys(shift) {
  const k = [[0, 36, G, -6], [.1, 24, G, FLAT], [.42, -30, G, FLAT], [.55, -38, G - 26, 44], [.75, 0, G - 22, 22], [.93, 33, G - 6, -4], [1, 36, G, -6]];
  // shift by half a cycle for the other foot, keeping keys sorted and the loop closed
  const s = k.map(([t, ...v]) => [((t + shift) % 1 + 1) % 1, ...v]).sort((a, b) => a[0] - b[0]);
  const first = s[0], last = s[s.length - 1];
  if (first[0] > 0) s.unshift([0, ...interpLoop(last, first)]);
  if (s[s.length - 1][0] < 1) s.push([1, ...s[0].slice(1)]);
  return s.map(r => [...r, 'linear']);
}
function interpLoop(a, b) {   // value at t=0 between a (late) and b (early, wrapped)
  const span = (1 - a[0]) + b[0], u = (1 - a[0]) / span;
  return a.slice(1).map((v, i) => v + (b[1 + i] - v) * u);
}
const walk = {
  duration: 1, loop: true,
  bones: {
    hips: { translate: [[0, 0, 5], [.1, 0, 10], [.3, 0, 2], [.5, 0, 5], [.6, 0, 10], [.8, 0, 2], [1, 0, 5]] },
    chest: { rotate: [[0, 3], [.25, 5], [.5, 3], [.75, 5], [1, 3]] },
    head: { rotate: [[0, -3], [.35, -1], [.6, -3], [.85, -1], [1, -3]] },
    // arms swing against the legs; forearms trail by 0.08 s (overlap)
    uarmL: { rotate: [[0, 20], [.5, -22], [1, 20]] },
    farmL: { rotate: [[0, -6], [.08, -4], [.58, -30], [1, -6]] },
    uarmR: { rotate: [[0, -22], [.5, 20], [1, -22]] },
    farmR: { rotate: [[0, -30], [.08, -30], [.58, -4], [1, -30]] },
  },
  ik: { footL: footKeys(0), footR: footKeys(.5) },
};

// Rep 5 jump: everything at once, evenly timed, the body squashed flat with no thought for its area.
const jumpV1 = {
  duration: 1.4, loop: true,
  root: { translate: [[0, 0, 0, 'linear'], [.6, 0, -140, 'linear'], [1.2, 0, 0, 'linear'], [1.4, 0, 0]],
    scale: [[0, 1, 1, 'linear'], [1.15, 1, 1, 'linear'], [1.2, 1, .7, 'linear'], [1.3, 1, 1, 'linear'], [1.4, 1, 1]] },
  bones: { uarmL: { rotate: [[0, 0, 'linear'], [.6, -150, 'linear'], [1.2, 0]] }, uarmR: { rotate: [[0, 0, 'linear'], [.6, -150, 'linear'], [1.2, 0]] } },
};

// Rep 6 jump: anticipation crouch, stretch at take-off, the arc, tuck, reach for the ground, area-true squash,
// arms that arrive late and overshoot. Feet stay planted by IK while on the ground.
const S = (s) => [1 / Math.sqrt(s) ** 2 * 1, s];   // root scale keeping area: sx = 1/sy
const jumpV2 = {
  duration: 1.7, loop: true,
  root: {
    translate: [[0, 0, 0], [.34, 0, 0, 'out'], [.72, 0, -150, 'in'], [1.06, 0, 0], [1.7, 0, 0]],
    scale: [[0, 1, 1], [.3, ...S(.9)], [.38, ...S(1.14), 'out'], [.55, 1, 1], [1.02, ...S(1.08)], [1.08, ...S(.86), 'out'], [1.3, ...S(1.03)], [1.45, 1, 1], [1.7, 1, 1]],
  },
  bones: {
    hips: { translate: [[0, 0, 0], [.3, 0, 44], [.38, 0, -6], [.72, 0, 0], [1.06, 0, 2], [1.12, 0, 40], [1.4, 0, 2], [1.7, 0, 0]] },
    chest: { rotate: [[0, 0], [.3, 22], [.38, -6], [.72, 4], [1.08, 20], [1.4, -2], [1.7, 0]] },
    head: { rotate: [[0, 0], [.32, -18], [.42, 8], [.76, -4], [1.14, -16], [1.46, 3], [1.7, 0]] },
    uarmL: { rotate: [[0, 0], [.3, 55], [.42, -160], [.75, -120], [1.08, -50], [1.24, 14], [1.45, -4], [1.7, 0]] },
    farmL: { rotate: [[0, 0], [.33, 10], [.46, -20], [.8, -35], [1.14, -40], [1.3, 6], [1.7, 0]] },
    uarmR: { rotate: [[0, 0], [.32, 50], [.44, -150], [.78, -110], [1.1, -45], [1.27, 12], [1.48, -3], [1.7, 0]] },
    farmR: { rotate: [[0, 0], [.35, 10], [.48, -18], [.82, -30], [1.16, -36], [1.32, 5], [1.7, 0]] },
  },
  ik: {
    footL: [[0, 0, G, FLAT], [.3, 0, G, FLAT], [.38, 6, G - 10, 55], [.55, 18, -70, 30], [.72, 22, -78, 20], [.98, 8, G - 4, 0], [1.06, 0, G, FLAT], [1.7, 0, G, FLAT]],
    footR: [[0, -3, G, FLAT], [.3, -3, G, FLAT], [.38, 3, G - 10, 55], [.55, 10, -62, 35], [.72, 14, -70, 25], [.98, 2, G - 4, 0], [1.06, -3, G, FLAT], [1.7, -3, G, FLAT]],
  },
};

// Front view: breathe, wave (the hand arrives after the forearm), cheer-jump with area-true squash.
const front = {
  idle: { duration: 3, loop: true, bones: {
    chest: { scale: [[0, 1, 1], [1.4, 1.025, 1.025], [3, 1, 1]] },
    head: { rotate: [[0, 0], [1.5, 2], [3, 0]] },
    uarmL: { rotate: [[0, 0], [1.5, -2], [3, 0]] }, uarmR: { rotate: [[0, 0], [1.5, 2], [3, 0]] } } },
  wave: { duration: 1.6, loop: true, bones: {
    uarmL: { rotate: [[0, -128], [1.6, -128]] },
    farmL: { rotate: [[0, -55], [.4, -15], [.8, -55], [1.2, -15], [1.6, -55]] },
    handL: { rotate: [[0, -5], [.12, -20], [.52, 15], [.92, -20], [1.32, 15], [1.6, -5]] },
    head: { rotate: [[0, 6], [1.6, 6]] }, chest: { rotate: [[0, -3], [1.6, -3]] },
    uarmR: { rotate: [[0, 4], [1.6, 4]] } } },
  cheer: { duration: 1.4, loop: true,
    root: { translate: [[0, 0, 0], [.25, 0, 0, 'out'], [.6, 0, -110, 'in'], [.9, 0, 0], [1.4, 0, 0]],
      scale: [[0, 1, 1], [.22, ...S(.88)], [.3, ...S(1.12), 'out'], [.5, 1, 1], [.9, ...S(.88), 'out'], [1.1, ...S(1.03)], [1.25, 1, 1], [1.4, 1, 1]] },
    bones: {
      uarmL: { rotate: [[0, 0], [.22, 10], [.4, -140], [.9, -120], [1.08, -20], [1.4, 0]] },
      uarmR: { rotate: [[0, 0], [.22, -10], [.4, 140], [.9, 120], [1.08, 20], [1.4, 0]] },
      farmL: { rotate: [[0, 0], [.45, -25], [1, -10], [1.4, 0]] }, farmR: { rotate: [[0, 0], [.45, 25], [1, 10], [1.4, 0]] },
      thighL: { rotate: [[0, 0], [.22, -14], [.3, 0], [.6, -18], [.9, -10], [1.1, 0]] },
      thighR: { rotate: [[0, 0], [.22, 14], [.3, 0], [.6, 18], [.9, 10], [1.1, 0]] },
      shinL: { rotate: [[0, 0], [.22, 28], [.3, 0], [.6, 30], [.9, 18], [1.1, 0]] },
      shinR: { rotate: [[0, 0], [.22, -28], [.3, 0], [.6, -30], [.9, -18], [1.1, 0]] },
      head: { rotate: [[0, 0], [.3, -4], [.9, 4], [1.4, 0]] } } },
};

export const ANIMS = { v1: { walk, jump: jumpV1 }, v2: { walk, jump: jumpV2 }, front };
