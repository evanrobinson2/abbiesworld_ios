// AW-STUDY-0037 Character Studio: 50 human moves, grouped by the game genre they come from.
// Every move is a function of time (seconds) returning a pose for rig.mjs's applyPose. Poses are written from the rest
// A-pose in degrees (see rig.mjs for the axes; right-side bones are written like the left and mirrored by the rig).
//   root: [x, y, z] in hip heights. The studio keeps the feet on the floor, so y is extra lift (jumps, swimming).
//   turn: [x, y, z] degrees, the whole body about the feet (falls, swimming).
// Built from three kinds of motion: gait() for walk cycles, K() for keyframed actions, and plain functions.
const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos, max = Math.max, min = Math.min, abs = Math.abs;
const LR = (b, v, w = v) => ({[b + '_L']: v, [b + '_R']: w});
// relaxed standing: arms in from the A-pose to about 8 degrees, soft elbows
export const NEUTRAL = {...LR('upperarm', [4, 0, -14]), ...LR('forearm', [-12, 0, 0]), ...LR('hand', [-6, 0, 0]),
 ...LR('thigh', [0, 0, 0]), ...LR('shin', [2, 0, 0]), ...LR('foot', [-2, 0, 0])};
export const P = (...parts) => Object.assign({}, NEUTRAL, ...parts);
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const ease = k => k * k * (3 - 2 * k);
const lerp3 = (a = [0, 0, 0], b = [0, 0, 0], k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// keyframed: keys = [[seconds, pose], ...]; first and last should match for a seamless loop
function K(keys, {snap = 0} = {}) {
 const len = keys[keys.length - 1][0];
 const f = t => {
  t = ((t % len) + len) % len;
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, a] = keys[i], [t1, b] = keys[i + 1];
  let k = (t - t0) / max(t1 - t0, 1e-6);
  k = ease(min(max(snap ? (t - t0) / snap : k, 0), 1));
  const out = {};
  for (const n of new Set([...Object.keys(a), ...Object.keys(b)])) out[n] = lerp3(a[n], b[n], k);
  return out;
 };
 f.len = len; return f;
}
// a walk cycle; o: len (s), stride, knee, arm, elbow, bounce, lean, twist, crouch (thigh bias), plus overrides
export function gait(o) {
 o = {len: 1.05, stride: 24, knee: 42, arm: 18, elbow: 18, bounce: .025, lean: 2, twist: 6, crouch: 0, toe: 0, sway: 2, ...o};
 const f = t => {
  const p = t / o.len * TAU, s = sin(p), c = cos(p);
  const thL = -o.stride * s - o.crouch, thR = o.stride * s - o.crouch;
  const shL = o.crouch * 1.6 + 4 + o.knee * max(0, c) ** 1.4, shR = o.crouch * 1.6 + 4 + o.knee * max(0, -c) ** 1.4;
  const pose = P({
   thigh_L: [thL, 0, 0], thigh_R: [thR, 0, 0], shin_L: [shL, 0, 0], shin_R: [shR, 0, 0],
   foot_L: [-(thL + shL) * .6 + o.toe + (s < 0 ? -s * 14 : 0), 0, 0], foot_R: [-(thR + shR) * .6 + o.toe + (s > 0 ? s * 14 : 0), 0, 0],
   upperarm_L: [4 + o.arm * s, 0, -14], upperarm_R: [4 - o.arm * s, 0, -14],
   forearm_L: [-o.elbow - o.elbow * .4 * max(0, -s), 0, 0], forearm_R: [-o.elbow - o.elbow * .4 * max(0, s), 0, 0],
   hips: [0, o.twist * s, o.sway * c], spine: [o.lean, -o.twist * .5 * s, -o.sway * c * .5], chest: [o.lean * .5, -o.twist * .8 * s, 0],
   head: [-o.lean * .8, o.twist * .3 * s, 0],
   root: [0, -o.bounce * abs(s), 0]});
  return o.more ? o.more(pose, p, t) : pose;
 };
 // ground speed in hip heights a second: two steps a cycle, each about 2 leg lengths x sin(stride)
 f.len = o.len; f.speed = o.speed ?? 4 * Math.sin((o.stride + o.crouch * .3) * Math.PI / 180) / o.len; return f;
}
const loop = (len, fn) => { const f = t => fn(((t % len) + len) % len / len * TAU, t); f.len = len; return f; };

// ---------- poses used by several moves ----------
const GUARD = P({hips: [0, -22, 0], spine: [4, 4, 0], chest: [6, 6, 0], head: [6, 14, 0],
 thigh_L: [-20, 0, 6], shin_L: [22, 0, 0], foot_L: [-2, 0, 0], thigh_R: [14, 0, 8], shin_R: [26, 0, 0], foot_R: [-20, 0, 0],
 upperarm_L: [-48, 0, -12], forearm_L: [-118, 0, 0], hand_L: [0, 0, 0], upperarm_R: [-30, 0, -6], forearm_R: [-130, 0, 0], hand_R: [0, 0, 0]});
const CROUCH = P({thigh_L: [-62, 0, 8], thigh_R: [-62, 0, 8], shin_L: [110, 0, 0], shin_R: [110, 0, 0], foot_L: [-40, 0, 0], foot_R: [-40, 0, 0],
 spine: [28, 0, 0], chest: [10, 0, 0], head: [-26, 0, 0]});
const SIT = P({thigh_L: [-88, 0, 4], thigh_R: [-88, 0, 4], shin_L: [86, 0, 0], shin_R: [86, 0, 0], foot_L: [-2, 0, 0], foot_R: [-2, 0, 0],
 spine: [-4, 0, 0], upperarm_L: [-18, 0, -12], upperarm_R: [-18, 0, -12], forearm_L: [-60, 0, 0], forearm_R: [-60, 0, 0], root: [0, 0, -.32]});
const UP = [-178, 0, -18]; // an arm straight up
const FWD = [-90, 0, -22]; // an arm straight forward

export const GENRES = [
 {id: 'cozy', name: 'Cozy life', from: 'Animal Crossing, The Sims, Stardew Valley'},
 {id: 'platformer', name: 'Platformer', from: 'Mario, Celeste, Astro Bot'},
 {id: 'fighting', name: 'Fighting', from: 'Street Fighter, Smash Bros, Tekken'},
 {id: 'adventure', name: 'Adventure and RPG', from: 'Zelda, Skyrim, Diablo'},
 {id: 'stealth', name: 'Stealth and spooky', from: 'Metal Gear, Luigi\'s Mansion, Little Nightmares'},
 {id: 'sports', name: 'Sports', from: 'FIFA, NBA 2K, Wii Sports, Mario Golf'},
 {id: 'shooter', name: 'Action shooter', from: 'Fortnite, Splatoon, Overwatch'},
 {id: 'builder', name: 'Builders and workers', from: 'Age of Empires, Minecraft, Stardew Valley'},
 {id: 'dance', name: 'Dance and rhythm', from: 'Just Dance, Fortnite emotes'},
 {id: 'racing', name: 'Racing', from: 'Mario Kart, BMX games'},
 {id: 'emotes', name: 'Emotes', from: 'Fall Guys, Among Us, Roblox'},
];

export const MOVES = [];
const M = (genre, id, name, fn, extra = {}) => MOVES.push({genre, id, name, fn, len: fn.len, ...extra});

// ===== Cozy life =====
M('cozy', 'idle', 'Idle, breathing', loop(3.6, p => P({chest: [1.6 * sin(p), 0, 0], spine: [.6 * sin(p), 2 * sin(p / 1), 0], head: [-1.5 * sin(p), 6 * sin(p * .5), 1.5 * sin(p * .5)],
 ...LR('upperarm', [4 - 2 * sin(p), 0, -14 + 1.2 * sin(p)]), hips: [0, 0, 1.2 * sin(p * .5)], thigh_L: [0, 0, 1.2 * sin(p * .5)], thigh_R: [0, 0, -1.2 * sin(p * .5)]})));
M('cozy', 'walk', 'Walk', gait({}), {travel: true});
M('cozy', 'wave', 'Wave hello', loop(1.6, p => P({upperarm_R: [-10, 0, 124], forearm_R: [-14, 0, 26 + 26 * sin(p * 2)], hand_R: [0, 0, 10 * sin(p * 2)],
 head: [-4, -8, -8], chest: [0, -4, -3], hips: [0, 0, 2], upperarm_L: [4, 0, -12]})));
M('cozy', 'sit', 'Sit down and rest', K([[0, P()], [.8, SIT], [1.2, P(SIT, {head: [8, 0, 0]})], [3.2, P(SIT, {head: [8, 18, 0], chest: [-2, 6, 0]})],
 [4.2, P(SIT, {head: [4, -14, 0]})], [5, SIT], [5.8, P()]]));
M('cozy', 'clap', 'Clap', loop(.5, p => P({upperarm_L: [-50, 0, -30 + 8 * max(0, sin(p))], upperarm_R: [-50, 0, -30 + 8 * max(0, sin(p))],
 forearm_L: [-58, 0, 0], forearm_R: [-58, 0, 0], hand_L: [0, 0, -20], hand_R: [0, 0, -20], head: [-4, 0, 0], chest: [-2, 0, 0],
 root: [0, -.01 * abs(sin(p)), 0]})));

// ===== Platformer =====
M('platformer', 'run', 'Run', gait({len: .62, stride: 46, knee: 100, arm: 48, elbow: 88, bounce: .06, lean: 12, twist: 10, sway: 0,
 more: (q, p) => (q.root = [0, .05 * abs(cos(p)), 0], q)}), {travel: true});
M('platformer', 'jump', 'Jump', K([[0, P()],
 [.28, P(CROUCH, {thigh_L: [-48, 0, 6], thigh_R: [-48, 0, 6], shin_L: [86, 0, 0], shin_R: [86, 0, 0], spine: [24, 0, 0], ...LR('upperarm', [50, 0, -14])})],
 [.46, P({...LR('upperarm', [-160, 0, -10]), ...LR('foot', [40, 0, 0]), root: [0, .3, 0], head: [-10, 0, 0]})],
 [.7, P({...LR('thigh', [-56, 0, 4]), ...LR('shin', [80, 0, 0]), ...LR('upperarm', [-140, 0, 20]), ...LR('forearm', [-30, 0, 0]), root: [0, .62, 0]})],
 [.95, P({...LR('thigh', [-20, 0, 4]), ...LR('shin', [20, 0, 0]), ...LR('upperarm', [-40, 0, 40]), root: [0, .1, 0]})],
 [1.1, P(CROUCH, {...LR('thigh', [-40, 0, 6]), ...LR('shin', [70, 0, 0]), spine: [18, 0, 0], ...LR('upperarm', [-30, 0, 30])})],
 [1.5, P()], [1.9, P()]]));
M('platformer', 'flip', 'Double jump flip', K([[0, P()], [.25, P(CROUCH, {...LR('upperarm', [50, 0, -10])})],
 [.45, P({...LR('upperarm', [-170, 0, -10]), root: [0, .4, 0]})],
 [.7, P({hips: [180, 0, 0], ...LR('thigh', [-110, 0, 6]), ...LR('shin', [130, 0, 0]), ...LR('upperarm', [-80, 0, 0]), ...LR('forearm', [-90, 0, 0]), root: [0, .95, 0]})],
 [.95, P({hips: [360, 0, 0], ...LR('thigh', [-60, 0, 6]), ...LR('shin', [60, 0, 0]), ...LR('upperarm', [-60, 0, 50]), root: [0, .55, 0]})],
 [1.15, P(CROUCH, {...LR('upperarm', [-30, 0, 50]), hips: [360, 0, 0]})], [1.6, P({hips: [360, 0, 0]})], [1.61, P()], [1.9, P()]]));
M('platformer', 'hang', 'Ledge hang and shimmy', loop(1.4, p => P({...LR('upperarm', [-176, 0, -4]), forearm_L: [-14 - 12 * max(0, sin(p)), 0, 0], forearm_R: [-14 - 12 * max(0, -sin(p)), 0, 0],
 upperarm_L: [-176, 0, -4 + 14 * max(0, sin(p))], upperarm_R: [-176, 0, -4 + 14 * max(0, -sin(p))],
 thigh_L: [-8 + 6 * sin(p), 0, 4 + 6 * sin(p)], thigh_R: [-4 - 6 * sin(p), 0, 4 - 6 * sin(p)], shin_L: [18, 0, 0], shin_R: [26, 0, 0], ...LR('foot', [30, 0, 0]),
 head: [-14, 0, 0], spine: [-4, 0, 3 * sin(p)], root: [.18 * sin(p / 2), .62, 0]})), {air: true});
M('platformer', 'climb', 'Climb a ladder', loop(1.2, p => { const s = sin(p);
 return P({upperarm_L: [-150 - 22 * s, 0, -6], upperarm_R: [-150 + 22 * s, 0, -6], forearm_L: [-40 + 30 * s, 0, 0], forearm_R: [-40 - 30 * s, 0, 0],
  thigh_L: [-50 + 40 * s, 0, 6], thigh_R: [-50 - 40 * s, 0, 6], shin_L: [80 - 50 * s, 0, 0], shin_R: [80 + 50 * s, 0, 0], ...LR('foot', [-20, 0, 0]),
  spine: [-6, 0, 0], head: [-12, 0, 0], root: [0, .45 + .04 * cos(p * 2), .1]}); }), {air: true});

// ===== Fighting =====
M('fighting', 'stance', 'Fight stance', loop(.9, p => P(GUARD, {root: [0, -.03 + .025 * sin(p), 0], head: [6 + 2 * sin(p), 14, 0],
 shin_L: [24 + 6 * sin(p), 0, 0], shin_R: [28 + 6 * sin(p), 0, 0], upperarm_L: [-48 + 3 * cos(p), 0, -12]})));
M('fighting', 'jabcross', 'Jab and cross', K([[0, GUARD],
 [.12, P(GUARD, {upperarm_L: [-86, 0, -14], forearm_L: [-6, 0, 0], chest: [6, -6, 0], head: [6, 18, 0]})], [.3, GUARD],
 [.48, P(GUARD, {upperarm_R: [-88, 0, -24], forearm_R: [-6, 0, 0], hips: [0, 14, 0], chest: [8, 26, 0], spine: [6, 10, 0], thigh_R: [10, 0, 8], foot_R: [10, 0, 0], head: [6, 0, 0]})],
 [.75, GUARD], [1.05, GUARD]]));
M('fighting', 'kick', 'Roundhouse kick', K([[0, GUARD],
 [.25, P(GUARD, {thigh_R: [-70, 0, 30], shin_R: [110, 0, 0], hips: [0, 30, -10], spine: [-8, 0, -14], upperarm_L: [-40, 0, 10]})],
 [.42, P(GUARD, {thigh_R: [-50, 0, 66], shin_R: [6, 0, 0], foot_R: [40, 0, 0], hips: [0, 50, -22], spine: [-10, 10, -24], chest: [0, 0, 6], foot_L: [0, 0, 0], thigh_L: [0, 0, 6], shin_L: [8, 0, 0], head: [0, -40, 14], upperarm_L: [-30, 0, 40], forearm_L: [-60, 0, 0]})],
 [.62, P(GUARD, {thigh_R: [-70, 0, 30], shin_R: [110, 0, 0], hips: [0, 20, -8]})], [.9, GUARD], [1.2, GUARD]]));
M('fighting', 'uppercut', 'Uppercut', K([[0, GUARD],
 [.25, P(GUARD, {...LR('thigh', [-40, 0, 8]), ...LR('shin', [70, 0, 0]), spine: [24, -10, 0], chest: [10, -18, 0], upperarm_R: [10, 0, 0], forearm_R: [-100, 0, 0]})],
 [.45, P(GUARD, {...LR('thigh', [-4, 0, 6]), ...LR('shin', [6, 0, 0]), ...LR('foot', [30, 0, 0]), spine: [-10, 18, 0], chest: [-8, 24, 0], head: [-14, 0, 0], upperarm_R: [-150, 0, -20], forearm_R: [-70, 0, 0], root: [0, .12, 0]})],
 [.75, GUARD], [1.1, GUARD]]));
M('fighting', 'ko', 'Knocked out (and back up)', K([[0, GUARD],
 [.15, P(GUARD, {spine: [-24, 0, 0], chest: [-12, 0, 0], head: [-30, 0, 0], ...LR('upperarm', [-20, 0, 60]), ...LR('forearm', [-20, 0, 0])})],
 [.5, P({spine: [-10, 0, 0], head: [-20, 0, 0], ...LR('upperarm', [-40, 0, 70]), thigh_L: [-20, 0, 0], shin_L: [30, 0, 0], turn: [-30, 0, 0], root: [0, 0, -.2]})],
 [.85, P({...LR('upperarm', [-150, 0, 40]), ...LR('thigh', [-14, 0, 8]), ...LR('shin', [20, 0, 0]), turn: [-92, 0, 0], root: [0, .06, -.4]})],
 [1, P({...LR('upperarm', [-150, 0, 50]), ...LR('thigh', [-24, 0, 8]), ...LR('shin', [30, 0, 0]), head: [10, 0, 0], turn: [-86, 0, 0], root: [0, .1, -.4]})],
 [2.4, P({...LR('upperarm', [-160, 0, 50]), ...LR('thigh', [-20, 0, 8]), ...LR('shin', [26, 0, 0]), head: [0, 30, 0], turn: [-90, 0, 0], root: [0, .07, -.4]})],
 [3, P(SIT, {spine: [20, 0, 0], ...LR('upperarm', [20, 0, 10]), root: [0, -.1, -.4]})],
 [3.6, P(CROUCH, {root: [0, 0, -.2]})], [4.2, GUARD]]));

// ===== Adventure and RPG =====
M('adventure', 'slash', 'Sword slash', K([[0, P({upperarm_R: [-40, 0, 6], forearm_R: [-60, 0, 0], thigh_L: [-14, 0, 4], thigh_R: [10, 0, 4]})],
 [.3, P({upperarm_R: [-160, 0, 50], forearm_R: [-60, 0, 0], chest: [-6, -24, 0], spine: [-4, -10, 0], thigh_L: [-14, 0, 4], thigh_R: [10, 0, 4], head: [0, 10, 0]})],
 [.45, P({upperarm_R: [-70, 0, -50], forearm_R: [-10, 0, 0], hand_R: [-30, 0, 0], chest: [16, 30, 0], spine: [14, 14, 0], thigh_L: [-34, 0, 4], shin_L: [36, 0, 0], thigh_R: [16, 0, 4], head: [6, -14, 0], root: [0, 0, .12]})],
 [.75, P({upperarm_R: [-30, 0, -40], forearm_R: [-30, 0, 0], chest: [10, 20, 0], thigh_L: [-30, 0, 4], shin_L: [32, 0, 0], thigh_R: [14, 0, 4], root: [0, 0, .1]})],
 [1.2, P({upperarm_R: [-40, 0, 6], forearm_R: [-60, 0, 0], thigh_L: [-14, 0, 4], thigh_R: [10, 0, 4]})]]));
M('adventure', 'spin', 'Spin attack', K([[0, P()], [.3, P(CROUCH, {upperarm_R: [-20, 0, 40], chest: [10, -50, 0], ...LR('thigh', [-40, 0, 14]), ...LR('shin', [60, 0, 0])})],
 [.9, P(CROUCH, {upperarm_R: [-10, 0, 80], upperarm_L: [-10, 0, 50], forearm_R: [0, 0, 0], ...LR('thigh', [-40, 0, 14]), ...LR('shin', [60, 0, 0]), chest: [10, 0, 0], turn: [0, 360, 0]})],
 [1.3, P({turn: [0, 360, 0]})], [1.31, P()], [1.6, P()]]));
M('adventure', 'cast', 'Cast a spell', K([[0, P()],
 [.5, P({...LR('upperarm', [-40, 0, 30]), ...LR('forearm', [-100, 0, 0]), ...LR('hand', [-30, 0, 0]), spine: [-6, 0, 0], head: [-8, 0, 0], ...LR('thigh', [-6, 0, 6]), root: [0, .02, 0]})],
 [1.1, P({...LR('upperarm', [-150, 0, 30]), ...LR('forearm', [-20, 0, 0]), spine: [-14, 0, 0], head: [-20, 0, 0], ...LR('foot', [20, 0, 0]), root: [0, .08, 0]})],
 [1.35, P({...LR('upperarm', [-86, 0, -26]), ...LR('forearm', [-4, 0, 0]), ...LR('hand', [60, 0, 0]), spine: [14, 0, 0], thigh_L: [-26, 0, 4], shin_L: [24, 0, 0], thigh_R: [16, 0, 4], root: [0, 0, .1]})],
 [1.9, P({...LR('upperarm', [-80, 0, -24]), ...LR('forearm', [-8, 0, 0]), ...LR('hand', [50, 0, 0]), spine: [12, 0, 0], thigh_L: [-24, 0, 4], shin_L: [22, 0, 0], thigh_R: [14, 0, 4], root: [0, 0, .1]})],
 [2.5, P()]]));
M('adventure', 'potion', 'Drink a potion', K([[0, P()], [.5, P({upperarm_R: [-34, 0, -6], forearm_R: [-120, 0, 0], head: [6, 0, 0]})],
 [.9, P({upperarm_R: [-70, 0, -14], forearm_R: [-140, 0, 0], hand_R: [20, 0, 0], head: [-34, 0, 0], spine: [-8, 0, 0], chest: [-6, 0, 0]})],
 [1.7, P({upperarm_R: [-80, 0, -14], forearm_R: [-140, 0, 0], hand_R: [30, 0, 0], head: [-40, 0, 0], spine: [-10, 0, 0], chest: [-8, 0, 0]})],
 [2.1, P({upperarm_R: [-20, 0, 6], forearm_R: [-40, 0, 0], head: [4, 0, 0], ...LR('upperarm', [-10, 0, 10]), upperarm_L: [-20, 0, 30], forearm_L: [-90, 0, 0], chest: [-4, 0, 0]})],
 [2.4, P({upperarm_L: [-30, 0, 70], upperarm_R: [-30, 0, 70], ...LR('forearm', [-40, 0, 0]), root: [0, .06, 0], head: [-10, 0, 0]})], [2.9, P()]]));
M('adventure', 'bow', 'Draw a bow', K([[0, P({hips: [0, -60, 0], head: [0, 50, 0]})],
 [.6, P({hips: [0, -60, 0], chest: [0, -24, 0], head: [0, 70, 0], upperarm_L: [-10, 0, 72], forearm_L: [-4, 0, 0], upperarm_R: [-6, 0, 70], forearm_R: [-110, 0, 0], thigh_L: [-10, 0, 10], thigh_R: [6, 0, 10]})],
 [1.4, P({hips: [0, -60, 0], chest: [0, -26, 0], head: [0, 72, 0], upperarm_L: [-10, 0, 72], forearm_L: [-4, 0, 0], upperarm_R: [-6, 0, 74], forearm_R: [-150, 0, 0], thigh_L: [-10, 0, 10], thigh_R: [6, 0, 10]})],
 [1.55, P({hips: [0, -60, 0], chest: [0, -26, 0], head: [0, 72, 0], upperarm_L: [-10, 0, 72], forearm_L: [-4, 0, 0], upperarm_R: [-6, 0, 86], forearm_R: [-40, 0, 0], thigh_L: [-10, 0, 10], thigh_R: [6, 0, 10]})],
 [2.2, P({hips: [0, -60, 0], head: [0, 50, 0]})]]));

// ===== Stealth and spooky =====
M('stealth', 'sneak', 'Sneak', gait({len: 1.5, stride: 20, knee: 50, crouch: 26, arm: 8, elbow: 70, bounce: .01, lean: 22, twist: 4,
 more: q => (q.upperarm_L = add(q.upperarm_L, [-30, 0, 10]), q.upperarm_R = add(q.upperarm_R, [-30, 0, 10]), q.head = [-20, 0, 0], q)}), {travel: true});
M('stealth', 'tiptoe', 'Tiptoe', gait({len: 1.1, stride: 16, knee: 70, arm: 0, elbow: 90, bounce: .02, toe: 34, lean: -4, twist: 0,
 more: (q, p) => (q.upperarm_L = [-10, 0, 30], q.upperarm_R = [-10, 0, 30], q.hand_L = [50, 0, 0], q.hand_R = [50, 0, 0], q.root = [0, .05, 0],
  q.head = [4, 18 * sin(p / 2), 0], q)}), {travel: true});
M('stealth', 'look', 'Look around', K([[0, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, 0, 0]})],
 [.7, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, 10, 0], chest: [0, 20, 0], head: [0, 60, 0]})],
 [1.6, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, 10, 0], chest: [0, 20, 0], head: [0, 60, 0]})],
 [2.2, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, -10, 0], chest: [0, -20, 0], head: [0, -60, 0]})],
 [3.1, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, -10, 0], chest: [0, -20, 0], head: [0, -60, 0]})],
 [3.7, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, 0, 0], head: [-30, 0, 0]})],
 [4.4, P({...LR('thigh', [-12, 0, 8]), ...LR('shin', [20, 0, 0]), spine: [8, 0, 0]})]]));
M('stealth', 'cower', 'Cower', loop(.24, p => P(CROUCH, {...LR('upperarm', [-150 + 2 * sin(p), 0, -14]), ...LR('forearm', [-120, 0, 0]), spine: [40, 0, 2 * sin(p)], head: [30, 0, 0],
 root: [0, -.02 * abs(sin(p)), 0]})));
M('stealth', 'zombie', 'Zombie shuffle', loop(2, p => { const s = sin(p);
 return P({upperarm_L: [-88 + 6 * s, 0, -18], upperarm_R: [-80 - 6 * s, 0, -26], forearm_L: [-6, 0, 0], forearm_R: [-14, 0, 0], ...LR('hand', [20, 0, 0]),
  thigh_L: [-18 * max(0, s) + 6, 0, 4], thigh_R: [10 * s, 0, 8], shin_L: [10 + 30 * max(0, s), 0, 0], shin_R: [6, 0, 0], foot_R: [10, 0, 0],
  hips: [0, 6 * s, 6], spine: [10, 0, 6], head: [16, 10, 24 + 6 * sin(p * 2)], root: [0, -.03 * abs(s), 0]}); }), {travel: true, speed: .3});

// ===== Sports =====
M('sports', 'soccer', 'Soccer kick', K([[0, P()],
 [.35, P({thigh_L: [-30, 0, 4], shin_L: [30, 0, 0], thigh_R: [20, 0, 4], shin_R: [30, 0, 0], ...LR('upperarm', [-10, 0, 20]), root: [0, 0, .1]})],
 [.6, P({thigh_L: [-20, 0, 6], shin_L: [20, 0, 0], thigh_R: [40, 0, 6], shin_R: [100, 0, 0], foot_R: [40, 0, 0], upperarm_L: [-30, 0, 50], upperarm_R: [20, 0, 30], spine: [-6, 0, 0], root: [0, 0, .2]})],
 [.78, P({thigh_L: [-10, 0, 6], shin_L: [16, 0, 0], foot_L: [20, 0, 0], thigh_R: [-90, 0, 4], shin_R: [10, 0, 0], foot_R: [40, 0, 0], upperarm_L: [20, 0, 60], upperarm_R: [-60, 0, 40], spine: [-16, 0, 0], head: [10, 0, 0], root: [0, .02, .2]})],
 [1.1, P({thigh_R: [-30, 0, 4], shin_R: [30, 0, 0], ...LR('upperarm', [-10, 0, 20]), root: [0, 0, .2]})], [1.6, P()]]));
M('sports', 'hoops', 'Basketball shot', K([[0, P({...LR('upperarm', [-40, 0, -4]), ...LR('forearm', [-90, 0, 0])})],
 [.4, P(CROUCH, {...LR('thigh', [-40, 0, 8]), ...LR('shin', [70, 0, 0]), spine: [14, 0, 0], ...LR('upperarm', [-50, 0, -6]), ...LR('forearm', [-100, 0, 0])})],
 [.65, P({upperarm_R: [-150, 0, -10], forearm_R: [-90, 0, 0], hand_R: [-50, 0, 0], upperarm_L: [-140, 0, -14], forearm_L: [-80, 0, 0], ...LR('foot', [30, 0, 0]), root: [0, .3, 0], head: [-14, 0, 0]})],
 [.8, P({upperarm_R: [-160, 0, -10], forearm_R: [-10, 0, 0], hand_R: [60, 0, 0], upperarm_L: [-140, 0, -4], forearm_L: [-60, 0, 0], ...LR('foot', [30, 0, 0]), root: [0, .34, 0], head: [-14, 0, 0]})],
 [1.15, P({upperarm_R: [-150, 0, -10], forearm_R: [-10, 0, 0], hand_R: [60, 0, 0], ...LR('thigh', [-20, 0, 6]), ...LR('shin', [30, 0, 0])})],
 [1.7, P({...LR('upperarm', [-40, 0, -4]), ...LR('forearm', [-90, 0, 0])})]]));
const BAT = {hips: [0, -40, 0], chest: [0, -30, 0], head: [0, 60, 0], thigh_L: [-8, 0, 16], thigh_R: [-8, 0, 14], ...LR('shin', [20, 0, 0]),
 upperarm_L: [-40, 0, -50], forearm_L: [-70, 0, 0], upperarm_R: [-30, 0, 20], forearm_R: [-120, 0, 0], spine: [10, 0, 0]};
M('sports', 'bat', 'Baseball swing', K([[0, P(BAT)], [.5, P(BAT, {chest: [0, -46, 0], thigh_L: [-30, 0, 10], shin_L: [40, 0, 0]})],
 [.7, P(BAT, {hips: [0, 30, 0], chest: [0, 40, 0], head: [0, 30, 0], upperarm_L: [-80, 0, 30], forearm_L: [-10, 0, 0], upperarm_R: [-80, 0, -40], forearm_R: [-20, 0, 0], foot_R: [20, 0, 0]})],
 [1, P(BAT, {hips: [0, 50, 0], chest: [0, 60, 0], head: [0, 10, 0], upperarm_L: [-120, 0, 30], forearm_L: [-90, 0, 0], upperarm_R: [-110, 0, -30], forearm_R: [-90, 0, 0], foot_R: [30, 0, 0]})],
 [1.6, P(BAT, {hips: [0, 40, 0], chest: [0, 50, 0], head: [0, 20, 0], upperarm_L: [-100, 0, 30], forearm_L: [-90, 0, 0], upperarm_R: [-90, 0, -30], forearm_R: [-90, 0, 0]})], [2.2, P(BAT)]]));
const GOLF = {spine: [34, 0, 0], chest: [6, 0, 0], head: [20, 0, 0], ...LR('thigh', [-16, 0, 8]), ...LR('shin', [20, 0, 0]),
 upperarm_L: [-20, 0, -28], upperarm_R: [-20, 0, -28], ...LR('forearm', [-10, 0, 0])};
M('sports', 'golf', 'Golf swing', K([[0, P(GOLF)], [.3, P(GOLF)],
 [1.1, P(GOLF, {chest: [6, -60, 0], hips: [0, -20, 0], upperarm_L: [-110, 0, -50], upperarm_R: [-80, 0, 20], forearm_R: [-90, 0, 0], head: [20, 30, 0]})],
 [1.4, P(GOLF, {chest: [6, 10, 0], hips: [0, 14, 0]})],
 [1.75, P(GOLF, {spine: [10, 0, 0], chest: [-10, 70, 0], hips: [0, 50, 0], head: [-10, -20, 0], upperarm_R: [-140, 0, -40], upperarm_L: [-100, 0, 20], ...LR('forearm', [-90, 0, 0]), foot_R: [40, 0, 0], thigh_R: [10, 0, 0]})],
 [2.6, P(GOLF, {spine: [10, 0, 0], chest: [-10, 70, 0], hips: [0, 50, 0], head: [-10, -20, 0], upperarm_R: [-140, 0, -40], upperarm_L: [-100, 0, 20], ...LR('forearm', [-90, 0, 0]), foot_R: [40, 0, 0], thigh_R: [10, 0, 0]})],
 [3.3, P(GOLF)]]));
M('sports', 'swim', 'Swim freestyle', loop(1.3, p => P({turn: [90, 0, 0], root: [0, .55, -1.1],
 upperarm_L: [-(p / TAU * 360), 0, -10], upperarm_R: [-((p / TAU * 360 + 180) % 360), 0, -10],
 forearm_L: [-20 * max(0, sin(p)), 0, 0], forearm_R: [-20 * max(0, -sin(p)), 0, 0],
 thigh_L: [12 * sin(p * 3), 0, 4], thigh_R: [-12 * sin(p * 3), 0, 4], ...LR('shin', [14, 0, 0]), ...LR('foot', [50, 0, 0]),
 chest: [0, 24 * sin(p), 0], head: [-50, 30 * max(0, sin(p)) ** 3, 0]})), {air: true});

// ===== Action shooter =====
const AIM = {upperarm_R: [-84, 0, -18], forearm_R: [-14, 0, 0], upperarm_L: [-78, 0, -40], forearm_L: [-34, 0, 0], head: [6, 0, 0], chest: [4, 0, 0]};
M('shooter', 'aimwalk', 'Aim and walk', gait({len: 1.1, stride: 22, knee: 46, crouch: 10, arm: 0, twist: 0, lean: 8,
 more: q => Object.assign(q, AIM)}), {travel: true});
M('shooter', 'throw', 'Throw a water balloon', K([[0, P()],
 [.45, P({upperarm_R: [40, 0, 70], forearm_R: [-110, 0, 0], upperarm_L: [-80, 0, -10], chest: [-8, -40, 0], hips: [0, -20, 0], thigh_L: [-30, 0, 6], shin_L: [24, 0, 0], thigh_R: [14, 0, 6], head: [0, 30, 0]})],
 [.65, P({upperarm_R: [-120, 0, 30], forearm_R: [-30, 0, 0], upperarm_L: [20, 0, 20], chest: [14, 30, 0], hips: [0, 20, 0], thigh_L: [-34, 0, 6], shin_L: [34, 0, 0], thigh_R: [20, 0, 6], foot_R: [30, 0, 0], head: [0, -10, 0], root: [0, 0, .12]})],
 [.9, P({upperarm_R: [-60, 0, -40], forearm_R: [-10, 0, 0], chest: [20, 36, 0], hips: [0, 24, 0], thigh_L: [-30, 0, 6], shin_L: [30, 0, 0], thigh_R: [16, 0, 6], root: [0, 0, .14]})],
 [1.5, P()]]));
M('shooter', 'roll', 'Dodge roll', K([[0, P()], [.2, P(CROUCH, {...LR('upperarm', [-60, 0, 0])})],
 [.55, P(CROUCH, {hips: [180, 0, 0], ...LR('thigh', [-120, 0, 6]), ...LR('shin', [140, 0, 0]), ...LR('upperarm', [-60, 0, 0]), ...LR('forearm', [-100, 0, 0]), spine: [40, 0, 0], head: [40, 0, 0], root: [0, .05, .3]})],
 [.85, P(CROUCH, {hips: [360, 0, 0], ...LR('upperarm', [-40, 0, 20]), root: [0, 0, .5]})], [1.1, P({hips: [360, 0, 0], root: [0, 0, .5]})], [1.11, P()], [1.4, P()]]));
M('shooter', 'slide', 'Slide', K([[0, P()], [.3, P(CROUCH, {root: [0, 0, .1]})],
 [.5, P({turn: [-40, 0, 0], thigh_L: [-80, 0, 6], shin_L: [10, 0, 0], thigh_R: [-30, 0, 8], shin_R: [100, 0, 0], spine: [30, 0, 0], head: [30, 0, 0], ...LR('upperarm', [-30, 0, 50]), root: [0, .1, .5]})],
 [1.1, P({turn: [-40, 0, 0], thigh_L: [-80, 0, 6], shin_L: [10, 0, 0], thigh_R: [-30, 0, 8], shin_R: [100, 0, 0], spine: [30, 0, 0], head: [30, 0, 0], ...LR('upperarm', [-30, 0, 50]), root: [0, .1, .9]})],
 [1.5, P(CROUCH, {root: [0, 0, .9]})], [1.9, P({root: [0, 0, .9]})], [1.91, P()], [2.1, P()]]));
M('shooter', 'peek', 'Crouch behind cover and peek', K([[0, P(CROUCH, AIM, {spine: [20, 0, 0], head: [0, 0, 0]})],
 [.8, P(CROUCH, AIM, {spine: [20, 0, 0]})], [1.2, P(CROUCH, AIM, {spine: [10, 0, -30], chest: [0, 0, -10], head: [0, 0, 20]})],
 [2.2, P(CROUCH, AIM, {spine: [10, 0, -30], chest: [0, 0, -10], head: [0, 0, 20]})], [2.6, P(CROUCH, AIM, {spine: [20, 0, 0]})],
 [3.2, P(CROUCH, AIM, {spine: [20, 0, 0], head: [0, 0, 0]})]]));

// ===== Builders and workers =====
M('builder', 'hammer', 'Hammer', loop(.7, p => { const k = max(0, sin(p)), hit = max(0, -sin(p));
 return P({spine: [26, 0, 0], head: [16, 0, 0], ...LR('thigh', [-16, 0, 10]), ...LR('shin', [26, 0, 0]),
  upperarm_R: [-40 - 70 * k + 10 * hit, 0, -6], forearm_R: [-60 - 50 * k, 0, 0], hand_R: [-20 * k + 20 * hit, 0, 0],
  upperarm_L: [-50, 0, -20], forearm_L: [-50, 0, 0]}); }));
M('builder', 'chop', 'Chop wood', K([[0, P({...LR('thigh', [-4, 0, 14]), ...LR('upperarm', [-50, 0, -26]), ...LR('forearm', [-30, 0, 0])})],
 [.6, P({...LR('thigh', [-4, 0, 14]), ...LR('upperarm', [-176, 0, -16]), ...LR('forearm', [-60, 0, 0]), spine: [-12, 0, 0], head: [-6, 0, 0]})],
 [.85, P({...LR('thigh', [-24, 0, 14]), ...LR('shin', [30, 0, 0]), ...LR('upperarm', [-60, 0, -26]), ...LR('forearm', [-6, 0, 0]), spine: [36, 0, 0], head: [10, 0, 0]})],
 [1.2, P({...LR('thigh', [-24, 0, 14]), ...LR('shin', [30, 0, 0]), ...LR('upperarm', [-56, 0, -26]), ...LR('forearm', [-10, 0, 0]), spine: [34, 0, 0], head: [10, 0, 0]})],
 [1.6, P({...LR('thigh', [-4, 0, 14]), ...LR('upperarm', [-50, 0, -26]), ...LR('forearm', [-30, 0, 0])})]]));
const SHOVEL = {upperarm_R: [-30, 0, -16], forearm_R: [-60, 0, 0], upperarm_L: [-50, 0, -30], forearm_L: [-20, 0, 0]};
M('builder', 'dig', 'Dig with a shovel', K([[0, P(SHOVEL, {spine: [20, 0, 0]})],
 [.4, P(SHOVEL, {spine: [30, 0, 0], thigh_R: [-50, 0, 10], shin_R: [60, 0, 0], thigh_L: [-6, 0, 6], root: [0, .05, 0]})],
 [.7, P(SHOVEL, {spine: [44, 0, 0], ...LR('thigh', [-30, 0, 10]), ...LR('shin', [50, 0, 0]), upperarm_L: [-30, 0, -30]})],
 [1.1, P(SHOVEL, {spine: [10, -10, 0], chest: [0, -20, 0], upperarm_L: [-80, 0, -10], upperarm_R: [-20, 0, -10]})],
 [1.4, P(SHOVEL, {spine: [10, 30, 0], chest: [0, 40, 0], upperarm_L: [-100, 0, 10], forearm_L: [-10, 0, 0], head: [0, 20, 0]})], [1.9, P(SHOVEL, {spine: [20, 0, 0]})]]));
M('builder', 'carry', 'Carry a box', gait({len: 1.2, stride: 20, knee: 40, arm: 0, twist: 3, lean: -6, bounce: .02,
 more: q => Object.assign(q, {...LR('upperarm', [-50, 0, -6]), ...LR('forearm', [-80, 0, 0]), ...LR('hand', [0, 0, -20]), head: [6, 0, 0]})}), {travel: true, prop: 'box'});
M('builder', 'push', 'Push something heavy', gait({len: 1.6, stride: 26, knee: 50, crouch: 18, arm: 0, twist: 2, lean: 10, bounce: .015,
 more: q => Object.assign(q, {turn: [28, 0, 0], ...LR('upperarm', [-110, 0, -20]), ...LR('forearm', [-40, 0, 0]), ...LR('hand', [-60, 0, 0]), head: [-30, 0, 0], root: [0, 0, -.3]})}), {travel: true, speed: .25});

// ===== Dance and rhythm =====
M('dance', 'disco', 'Disco point', loop(1, p => { const up = sin(p) > 0, s = sin(p * 2);
 return P({upperarm_R: up ? [-30, 0, 140] : [-40, 0, -60], forearm_R: [-6, 0, 0], upperarm_L: [-20, 0, -10], forearm_L: [-90, 0, 0],
  hips: [0, 0, up ? 8 : -8], spine: [0, 0, up ? -8 : 6], head: up ? [-20, 0, -14] : [16, 20, 10],
  thigh_L: [-6, 0, up ? 4 : 12], thigh_R: [-4, 0, up ? 14 : 4], shin_L: [up ? 30 : 6, 0, 0], shin_R: [up ? 6 : 30, 0, 0], root: [0, -.03 * abs(s), 0]}); }));
M('dance', 'robot', 'The robot', K([[0, P({...LR('upperarm', [-10, 0, -12]), ...LR('forearm', [-90, 0, 0])})],
 [.5, P({upperarm_L: [-90, 0, -12], forearm_L: [-90, 0, 0], upperarm_R: [-10, 0, -12], forearm_R: [-90, 0, 0], head: [0, 40, 0]})],
 [1, P({upperarm_L: [-90, 0, -12], forearm_L: [0, 0, 0], upperarm_R: [-10, 0, 60], forearm_R: [-90, 0, 0], head: [0, 40, 0], chest: [0, 20, 0]})],
 [1.5, P({upperarm_L: [-10, 0, 60], forearm_L: [-90, 0, 0], upperarm_R: [-90, 0, -12], forearm_R: [0, 0, 0], head: [0, -40, 0], chest: [0, -20, 0]})],
 [2, P({upperarm_L: [-10, 0, -12], forearm_L: [-90, 0, 0], upperarm_R: [-10, 0, -12], forearm_R: [-90, 0, 0], head: [20, 0, 0], ...LR('thigh', [-20, 0, 6]), ...LR('shin', [40, 0, 0])})],
 [2.5, P({...LR('upperarm', [-10, 0, -12]), ...LR('forearm', [-90, 0, 0])})]], {snap: .07}));
M('dance', 'twist', 'The twist', loop(.8, p => { const s = sin(p);
 return P({hips: [0, 34 * s, 0], spine: [6, -10 * s, 0], chest: [0, -12 * s, 0], head: [0, -10 * s, 0], ...LR('thigh', [-24, 0, 8]), ...LR('shin', [40, 0, 0]),
  foot_L: [-10, 30 * s, 0], foot_R: [-10, -30 * s, 0],
  upperarm_L: [-30 - 20 * s, 0, 30], upperarm_R: [-30 + 20 * s, 0, 30], ...LR('forearm', [-90, 0, 0]), root: [0, -.04 + .03 * cos(p * 2), 0]}); }));
M('dance', 'charleston', 'Charleston hop', loop(1.2, p => { const s = sin(p), c = cos(p);
 return P({thigh_L: [-30 * s, 0, 4], thigh_R: [-30 * c, 0, 4], shin_L: [20 + 30 * max(0, -s), 0, 0], shin_R: [20 + 30 * max(0, -c), 0, 0],
  upperarm_L: [40 * s, 0, 20], upperarm_R: [-40 * s, 0, 20], ...LR('forearm', [-40, 0, 0]), ...LR('hand', [-60, 0, 0]),
  spine: [6, 0, 0], head: [0, 0, 8 * s], root: [0, .05 * abs(sin(p * 2)), 0]}); }));

// ===== Racing =====
const KART = {...LR('thigh', [-80, 0, 10]), ...LR('shin', [20, 0, 0]), ...LR('foot', [-10, 0, 0]), spine: [-10, 0, 0], chest: [6, 0, 0], ...LR('upperarm', [-60, 0, -14]), ...LR('forearm', [-50, 0, 0])};
M('racing', 'kart', 'Steer a kart', loop(2.4, p => { const s = sin(p);
 return P(KART, {upperarm_L: [-60 - 16 * s, 0, -14], upperarm_R: [-60 + 16 * s, 0, -14], chest: [6, -6 * s, -10 * s], spine: [-10, 0, -6 * s], head: [-4, 10 * s, 6 * s],
  root: [0, .03 * abs(sin(p * 5)), 0]}); }));
M('racing', 'bike', 'Pedal a bike', loop(.8, p => P({thigh_L: [-70 + 26 * sin(p), 0, 6], thigh_R: [-70 - 26 * sin(p), 0, 6], shin_L: [70 - 30 * cos(p), 0, 0], shin_R: [70 + 30 * cos(p), 0, 0],
 ...LR('foot', [10, 0, 0]), spine: [30, 0, 0], chest: [6, 0, 0], head: [-30, 0, 0], ...LR('upperarm', [-70, 0, -4]), ...LR('forearm', [-30, 0, 0]),
 hips: [0, 0, 3 * sin(p)], root: [0, .3, -.15]})), {air: true});

// ===== Emotes =====
M('emotes', 'cheer', 'Cheer', K([[0, P()], [.2, P(CROUCH, {...LR('thigh', [-30, 0, 8]), ...LR('shin', [50, 0, 0]), ...LR('upperarm', [-30, 0, 10]), ...LR('forearm', [-100, 0, 0])})],
 [.45, P({...LR('upperarm', [-10, 0, 150]), ...LR('forearm', [-10, 0, 0]), ...LR('foot', [30, 0, 0]), head: [-20, 0, 0], root: [0, .3, 0], thigh_L: [-30, 0, 10], shin_L: [60, 0, 0]})],
 [.7, P({...LR('upperarm', [-10, 0, 140]), ...LR('forearm', [-40, 0, 0]), head: [-14, 0, 0]})],
 [.85, P({...LR('upperarm', [-10, 0, 150]), ...LR('forearm', [-10, 0, 0]), head: [-20, 0, 0], ...LR('foot', [20, 0, 0])})],
 [1, P({...LR('upperarm', [-10, 0, 140]), ...LR('forearm', [-40, 0, 0]), head: [-14, 0, 0]})], [1.4, P()]]));
M('emotes', 'sad', 'Sad', loop(4, p => P({spine: [14, 0, 0], chest: [10, 0, 0], head: [34 + 4 * sin(p), 0, 0], clavicle_L: [0, 0, -8], clavicle_R: [0, 0, -8],
 ...LR('upperarm', [6, 0, -18]), ...LR('forearm', [-4, 0, 0]), thigh_R: [-12 * max(0, sin(p * 2)) ** 3, 0, 2], shin_R: [8 + 12 * max(0, sin(p * 2)) ** 3, 0, 0],
 root: [0, -.02 + .01 * sin(p), 0]})));
M('emotes', 'laugh', 'Laugh', loop(.36, p => P({spine: [-16, 0, 0], chest: [-6 + 4 * sin(p), 0, 0], head: [-26 + 6 * sin(p), 0, 0],
 upperarm_R: [-30, 0, -26], forearm_R: [-90, 0, 0], upperarm_L: [-20, 0, -26], forearm_L: [-80, 0, 0], ...LR('thigh', [-6, 0, 6]), ...LR('shin', [10, 0, 0]),
 root: [0, -.015 * abs(sin(p)), 0]})));
M('emotes', 'shrug', 'Shrug', K([[0, P()], [.4, P({clavicle_L: [0, 0, 16], clavicle_R: [0, 0, 16], ...LR('upperarm', [-10, 0, 10]), ...LR('forearm', [-80, 0, 0]), ...LR('hand', [0, 50, 20]), head: [0, 0, 14], chest: [-4, 0, 0]})],
 [1.3, P({clavicle_L: [0, 0, 16], clavicle_R: [0, 0, 16], ...LR('upperarm', [-10, 0, 14]), ...LR('forearm', [-80, 0, 0]), ...LR('hand', [0, 50, 20]), head: [0, 0, 18], chest: [-4, 0, 0]})], [1.9, P()]]));

export const byId = Object.fromEntries(MOVES.map(m => [m.id, m]));
