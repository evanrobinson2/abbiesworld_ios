// AW-STUDY-0066 Stage 1: the rail-racing model for the skate-park arcade. Pure numbers, no rendering, so a headless run
// (and the study page) can run a whole race in a few milliseconds and the clock cannot be bent by the camera.
//   const trk = buildTrack(T, SPRINT);  const m = makeModel(trk);  m.launch(); while (!m.done) m.step(1 / 60, lane);
// THE RACE CLOCK: the clock is the count of fixed 1/60 s simulation steps since GO. Presentation (slow motion, camera
// swings, shake, the screen's frame rate) never touches it; after the line the simulation is frozen, so the finish
// time is exactly what was crossed. The old 30 s coaster stretched every ride to 30.0 s; this does not.

export const TRACK_ID = 'sprint-v1';          // bump when the track, the pads or the physics change: records never mix across versions
export const BOARD_KEY = TRACK_ID + '/timed/cosmetic';   // track / mode / class. All cars handle the same, so one board.
export const LANE_X = 0.55, STEP = 1 / 60;

export const SPRINT = {
  start: {pos: [0, 16, 0], yaw: 0}, seconds: 12, lamp: 4,
  segs: [
    {k: 'straight', len: 6, tag: 'gate'},
    {k: 'pitch', deg: -30, r: 6},
    {k: 'straight', len: 12, tag: 'run1'},
    {k: 'pitch', deg: 30, r: 8},
    {k: 'straight', len: 12, tag: 'run2'},
    {k: 'turn', deg: 90, r: 10, bank: 30},
    {k: 'straight', len: 10, tag: 'run3'},
    {k: 'pitch', deg: -22, r: 8},
    {k: 'straight', len: 10, tag: 'run4'},
    {k: 'pitch', deg: 22, r: 8},
    {k: 'straight', len: 8, tag: 'run5'},
    {k: 'turn', deg: -180, r: 9, bank: 36},
    {k: 'straight', len: 14, tag: 'run6'},
    {k: 'pitch', deg: 10, r: 8}, {k: 'pitch', deg: -10, r: 8},
    {k: 'straight', len: 12, tag: 'run7'},
    {k: 'straight', len: 18, tag: 'finish'},
  ],
};

// orbs give a speed burst; cones slow you. [track piece, metres into it, lane (-1 left, 0 middle, 1 right), kind]
export const PADS = [
  ['run1', 2, -1, 'orb'], ['run1', 7, -1, 'orb'], ['run1', 10, 0, 'cone'],
  ['run2', 2, 1, 'orb'], ['run2', 6, 1, 'orb'], ['run2', 9, 0, 'cone'],
  ['run3', 2, 0, 'orb'], ['run3', 5, -1, 'cone'], ['run3', 8, 1, 'orb'],
  ['run4', 1, -1, 'orb'], ['run4', 5, 0, 'cone'], ['run4', 8, -1, 'orb'],
  ['run5', 2, 1, 'orb'], ['run5', 5, -1, 'cone'],
  ['run6', 2, 0, 'cone'], ['run6', 4, 1, 'orb'], ['run6', 9, -1, 'orb'], ['run6', 12, 0, 'orb'],
  ['run7', 2, -1, 'orb'], ['run7', 6, 0, 'cone'], ['run7', 9, 1, 'orb'],
];
export const LAUNCH_WINDOW = 0.45;   // seconds after GO in which the launch tap is perfect

export function makeModel(trk, padDefinitions = PADS) {
  const S = trk.S, n = S.length, h0 = S[0].p.y, G = 9.8 * .55;
  const base = new Float32Array(n);
  for (let i = 0; i < n; i++) base[i] = Math.min(20, Math.max(9, Math.sqrt(Math.max(0, 40 + 2 * G * (h0 - S[i].p.y)))));
  for (let k = 0; k < 6; k++) for (let i = 1; i < n - 1; i++) base[i] = (base[i - 1] + 2 * base[i] + base[i - 1 + 2]) / 4;
  const line = trk.marks.finish.s0 + 2;
  const pads = padDefinitions.map(([tag, off, lane, kind], id) => ({id, s: trk.marks[tag].s0 + off, lane, kind, hit: false}));
  const baseAt = s => { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= s) lo = m; else hi = m; } return base[lo]; };
  const m = {
    trk, pads, line, S, t: 0, s: 0, v: 0, boost: 0, slow: 0, stall: 0, laneX: 0, lane: 0, orbs: 0, cones: 0, launch: 'none', done: false, time: null, ticks: 0, events: [],
    // the launch tap: pressed before GO it floods the engine (flood); in the first LAUNCH_WINDOW after GO it is perfect
    flood() { if (m.launch === 'none') { m.launch = 'flooded'; m.stall = .6; m.events.push('flooded'); } },
    launchTap() { if (m.launch === 'none' && m.t <= LAUNCH_WINDOW) { m.launch = 'perfect'; m.boost = 1.3; m.events.push('perfect'); } return m.launch; },
    step(dt, lane) {
      if (m.done) return;
      m.lane = lane; m.laneX += (lane * LANE_X - m.laneX) * Math.min(1, 12 * dt);
      const sp = m.s; m.ticks++; m.t += dt;
      let target = baseAt(m.s) + (m.boost > 0 ? 8 * Math.min(1, m.boost / .5) : 0);
      if (m.slow > 0) target *= .62;
      if (m.stall > 0) { target = 0; m.stall -= dt; }
      m.v += (target - m.v) * Math.min(1, 3.2 * dt);
      m.boost = Math.max(0, m.boost - dt); m.slow = Math.max(0, m.slow - dt);
      m.s += m.v * dt;
      for (const p of pads) if (!p.hit && p.s > sp && p.s <= m.s) {
        if (Math.abs(m.laneX - p.lane * LANE_X) < .32) { p.hit = true; if (p.kind === 'orb') { m.orbs++; m.boost = 1.4; m.events.push('orb'); } else { m.cones++; m.slow = .8; m.events.push('cone'); } }
      }
      if (m.s >= line) { m.time = m.t - (m.s - line) / Math.max(m.v, .01); m.done = true; m.events.push('finish'); }
    },
  };
  return m;
}

// ---- bots, so a headless run can show what skill is worth. Honest numbers, not a claim about feel. ----
export const policies = {
  center: () => 0,
  greedy: m => {   // look a few metres ahead: want orbs, flee cones
    let best = 0, bs = -1e9;
    for (const lane of [-1, 0, 1]) {
      let sc = lane === m.lane ? .05 : 0;
      for (const p of m.pads) { const d = p.s - m.s; if (p.hit || d < 1.5 || d > 11) continue; if (p.lane === lane) sc += (p.kind === 'orb' ? 1 : -3) / (1 + d * .1); }
      if (sc > bs) { bs = sc; best = lane; }
    }
    return best;
  },
};
export function simulate(trk, policy = 'greedy', {launch = 'perfect', pads = PADS} = {}) {
  const m = makeModel(trk, pads), pol = policies[policy];
  if (launch === 'perfect') m.launchTap();
  let guard = 0;
  while (!m.done && guard++ < 6000) m.step(STEP, pol(m));
  return {time: m.time, orbs: m.orbs, cones: m.cones, launch: m.launch};
}
