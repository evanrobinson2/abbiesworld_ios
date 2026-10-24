// The farm's animals that the model library did not have (pig, alpaca, rabbit, duck), built as low-poly named parts, plus the
// little mind every farm animal shares: they graze, wander inside their pen, look at a visitor, come to the fence, scatter, and
// are pleased when tapped. All animals face +X; `rot` turns them. Metres, y up, in the tile's own frame.
//   makePig() makeAlpaca() makeRabbit() makeDuck()  -> {group, step(dt, moving, speed)}  (step swings legs, ears and bill)
//   new Critter({obj, kind, home, speed, ...}).update(dt, env)    env = {hf(x, z), blocked(x, z, r, critter), visitors: [{x, z}], t}
//   voice(kind, gain)       a short synthesised call (cow moo, pig oink, goat meh ...); silent until the page has had a tap
// World layer: the animals themselves. Presentation layer: the hearts over a happy animal (userData.presentation).
import * as T from 'three';

const mat = (name, color, o = {}) => Object.assign(new T.MeshStandardMaterial({color, flatShading: true, roughness: .85, metalness: 0, ...o}), {name});
const ell = (rx, ry, rz, m, x = 0, y = 0, z = 0, name) => { const o = new T.Mesh(new T.IcosahedronGeometry(1, 1), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); o.castShadow = true; if (name) o.name = name; return o; };
const bx = (w, h, d, m, x = 0, y = 0, z = 0, name) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; if (name) o.name = name; return o; };
const cone = (r, h, m, x = 0, y = 0, z = 0, name, seg = 5) => { const o = new T.Mesh(new T.ConeGeometry(r, h, seg), m); o.position.set(x, y, z); o.castShadow = true; if (name) o.name = name; return o; };
const pivot = (x, y, z, ...kids) => { const g = new T.Group(); g.position.set(x, y, z); g.add(...kids); return g; };
const eyes = (m, x, y, z) => [1, -1].map(s => ell(.035, .035, .035, m, x, y, z * s, 'eye'));

const EYE = mat('eye', '#2a1f1a');

// ---- pig: pink, round, a curly tail, a snout that twitches
export function makePig(tone = '#f2a3b4') {
 const g = new T.Group(), skin = mat('pig skin', tone), deep = mat('pig snout', '#e4859b'), ear = mat('pig ear', '#e993a6'), hoof = mat('hoof', '#6b4a44');
 const body = ell(.78, .5, .48, skin, 0, .62, 0, 'pig body');
 const head = pivot(.74, .7, 0, ell(.34, .3, .32, skin, .08, 0, 0, 'pig head'), ell(.14, .13, .16, deep, .4, -.05, 0, 'pig snout'),
  ...eyes(EYE, .26, .1, .22), cone(.1, .22, ear, .06, .3, .2, 'pig ear left', 3), cone(.1, .22, ear, .06, .3, -.2, 'pig ear right', 3));
 head.children[3].rotation.z = -.7; head.children[4].rotation.z = -.7;
 const tail = pivot(-.72, .86, 0, new T.Mesh(new T.TorusGeometry(.07, .025, 5, 8, Math.PI * 1.6), deep));
 const legs = [[.42, .26], [.42, -.26], [-.4, .26], [-.4, -.26]].map(([x, z], i) => pivot(x, .38, z, bx(.13, .38, .13, skin, 0, -.19, 0, 'pig leg ' + i), bx(.15, .06, .15, hoof, 0, -.4, 0, 'pig hoof ' + i)));
 g.add(body, head, tail, ...legs); let ph = 0;
 return {group: g, head, tail, legs, step(dt, moving, sp) { ph += dt * sp * 5; legs.forEach((l, i) => { l.rotation.z = moving ? Math.sin(ph + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * .5 : 0; }); tail.rotation.x = Math.sin(ph * .6) * .3; head.children[1].scale.y = 1 + Math.sin(ph * 2) * .04; }};
}

// ---- alpaca: a long neck, a fluffy body, banana ears, a sleepy face
export function makeAlpaca(tone = '#efe3cb') {
 const g = new T.Group(), wool = mat('alpaca wool', tone), face = mat('alpaca face', '#d9c3a2'), hoof = mat('hoof', '#5a4a40');
 const body = ell(.62, .46, .4, wool, 0, 1.05, 0, 'alpaca body');
 const neck = bx(.2, .75, .2, wool, .52, 1.55, 0, 'alpaca neck'); neck.rotation.z = -.28;
 const head = pivot(.72, 1.95, 0, ell(.2, .17, .16, face, .05, 0, 0, 'alpaca head'), ell(.11, .09, .1, wool, -.04, .16, 0, 'alpaca topknot'), ...eyes(EYE, .15, .04, .12),
  cone(.05, .24, face, -.02, .26, .1, 'alpaca ear left', 4), cone(.05, .24, face, -.02, .26, -.1, 'alpaca ear right', 4));
 const tail = pivot(-.6, 1.15, 0, ell(.1, .08, .08, wool, -.06, 0, 0, 'alpaca tail'));
 const legs = [[.34, .17], [.34, -.17], [-.3, .17], [-.3, -.17]].map(([x, z], i) => pivot(x, .72, z, bx(.1, .72, .1, face, 0, -.36, 0, 'alpaca leg ' + i), bx(.13, .05, .13, hoof, 0, -.74, 0, 'alpaca hoof ' + i)));
 g.add(body, neck, head, tail, ...legs); let ph = 0;
 return {group: g, head, tail, legs, step(dt, moving, sp) { ph += dt * sp * 3.2; legs.forEach((l, i) => { l.rotation.z = moving ? Math.sin(ph + (i % 2 ? 0 : Math.PI) + (i > 1 ? Math.PI : 0)) * .45 : 0; }); head.rotation.z = Math.sin(ph * .4) * .05; tail.rotation.x = Math.sin(ph * .7) * .1; }};
}

// ---- rabbit: a round body, ears that stand up, hops instead of walking
export function makeRabbit(tone = '#b9b2a6') {
 const g = new T.Group(), fur = mat('rabbit fur', tone), light = mat('rabbit belly', '#f4efe6'), pink = mat('rabbit ear inside', '#f0b4bd');
 const body = ell(.26, .2, .17, fur, 0, .24, 0, 'rabbit body'), tail = ell(.06, .06, .06, light, -.26, .3, 0, 'rabbit tail');
 const head = pivot(.24, .36, 0, ell(.12, .1, .1, fur, 0, 0, 0, 'rabbit head'), ell(.035, .03, .05, pink, .12, -.01, 0, 'rabbit nose'), ...eyes(EYE, .08, .04, .075),
  ell(.035, .17, .025, fur, -.02, .2, .05, 'rabbit ear left'), ell(.035, .17, .025, fur, -.02, .2, -.05, 'rabbit ear right'));
 const hind = [1, -1].map(s => ell(.12, .06, .05, fur, -.16, .08, .13 * s, 'rabbit foot')), fore = [1, -1].map(s => ell(.06, .05, .04, light, .18, .05, .08 * s, 'rabbit paw'));
 g.add(body, tail, head, ...hind, ...fore); let ph = 0;
 return {group: g, head, tail, hop: true, step(dt, moving, sp) { ph += dt * (moving ? 9 : 1.2); const h = moving ? Math.max(0, Math.sin(ph)) : 0; body.parent.position.y = 0; g.position.y = 0; g.userData.lift = h * .22 * sp; head.rotation.z = moving ? Math.sin(ph) * .2 : Math.sin(ph) * .05; head.children[3].rotation.z = Math.sin(ph * .7) * .06; }};
}

// ---- duck: white or mallard, an orange bill, waddles on land, floats on the pond
export function makeDuck(kind = 'white') {
 const g = new T.Group(), white = kind === 'white', body = mat('duck body', white ? '#f6f3ea' : '#a88a64'), head = mat('duck head', white ? '#f6f3ea' : '#2f7a5c'), bill = mat('duck bill', '#f2a22a'), foot = mat('duck foot', '#e8892a');
 const b = ell(.3, .2, .2, body, 0, .3, 0, 'duck body'), tail = cone(.07, .16, body, -.3, .4, 0, 'duck tail', 4); tail.rotation.z = 1.9;
 const hd = pivot(.24, .52, 0, ell(.1, .1, .09, head, 0, 0, 0, 'duck head'), bx(.14, .03, .07, bill, .14, -.02, 0, 'duck bill'), ...eyes(EYE, .06, .03, .075));
 const wings = [1, -1].map(s => pivot(0, .36, .17 * s, ell(.2, .06, .05, body, -.02, 0, .02 * s, 'duck wing')));
 const feet = [1, -1].map(s => pivot(0, .12, .08 * s, bx(.1, .02, .07, foot, .03, -.1, 0, 'duck foot')));
 g.add(b, tail, hd, ...wings, ...feet); let ph = 0;
 return {group: g, head: hd, wings, step(dt, moving, sp, flap = 0) { ph += dt * (moving ? 10 : 1.5); g.userData.sway = moving ? Math.sin(ph) * .12 : 0; hd.rotation.z = moving ? Math.sin(ph) * .1 : Math.sin(ph * 2) * .03 + (flap ? 0 : 0); feet.forEach((f, i) => { f.rotation.z = moving ? Math.sin(ph + i * Math.PI) * .6 : 0; }); wings.forEach((w, i) => { w.rotation.x = (i ? -1 : 1) * (flap ? Math.sin(ph * 3) * .9 : .05); }); }};
}

// ---- hearts: the "I am pleased" cue over a tapped animal (presentation layer)
let heartTex = null;
function heartTexture() {
 if (heartTex) return heartTex; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
 x.fillStyle = '#ff5c8a'; x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(32, 54); x.bezierCurveTo(6, 34, 8, 8, 28, 14); x.bezierCurveTo(32, 16, 32, 18, 32, 20); x.bezierCurveTo(32, 18, 32, 16, 36, 14); x.bezierCurveTo(56, 8, 58, 34, 32, 54); x.stroke(); x.fill();
 heartTex = new T.CanvasTexture(c); heartTex.colorSpace = T.SRGBColorSpace; return heartTex;
}
export function heart(parent, y, size = 1.6) {
 const s = new T.Sprite(new T.SpriteMaterial({map: heartTexture(), transparent: true, depthWrite: false, depthTest: false})); s.scale.setScalar(size); s.position.set((Math.random() - .5) * 1.2, y, (Math.random() - .5) * 1.2); s.renderOrder = 20; s.userData.presentation = true; s.userData.age = 0; parent.add(s); return s;
}

// ---- voices: tiny synthesised calls, soft, never until the page has been touched
let ac = null, master = null;
const unlock = () => { try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); master ||= Object.assign(ac.createGain(), {gain: {value: .5}}); master.connect(ac.destination); ac.resume?.(); } catch {} };
if (typeof addEventListener === 'function') addEventListener('pointerdown', unlock, {once: true});
const CALLS = { // [type, [freq points], seconds, vibrato Hz, filter Hz]
 cow: [['sawtooth', [120, 150, 95], .9, 6, 520]], pig: [['square', [260, 190], .12, 0, 900], ['square', [240, 170], .16, 0, 800]], goat: [['sawtooth', [520, 430, 470], .6, 28, 1400]],
 sheep: [['sawtooth', [380, 300, 330], .7, 22, 1100]], chicken: [['triangle', [700, 480], .09, 0, 2200], ['triangle', [650, 440], .12, 0, 2200]], duck: [['square', [520, 360], .13, 0, 1400], ['square', [500, 330], .15, 0, 1400]],
 horse: [['sawtooth', [420, 900, 360], .9, 9, 1800]], alpaca: [['sine', [300, 340, 280], .8, 5, 900]], rabbit: [], dog: [['sawtooth', [320, 200], .13, 0, 1200], ['sawtooth', [330, 210], .15, 0, 1200]], cat: [['sine', [760, 980, 520], .6, 4, 2600]]
};
export function voice(kind, gain = 1) {
 if (!ac || ac.state === 'suspended' || gain <= .02) return; const notes = CALLS[kind] || []; let t0 = ac.currentTime + .01;
 for (const [type, pts, dur, vib, lp] of notes) {
  const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter(); o.type = type; f.type = 'lowpass'; f.frequency.value = lp;
  pts.forEach((fr, i) => o.frequency.linearRampToValueAtTime(fr, t0 + dur * i / Math.max(1, pts.length - 1)));
  if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib; lg.gain.value = pts[0] * .05; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + .05); }
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.16 * gain, t0 + .03); g.gain.exponentialRampToValueAtTime(.001, t0 + dur);
  o.connect(f); f.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .05); t0 += dur * .9;
 }
}

// ---- the little mind
// kind groups: scatter (hens, ducks, rabbits run from a visitor), come (goats, pigs, sheep walk over to the fence to see you),
// look (cows, horses, alpacas turn their heads), follow (the dog keeps near), nap (the cat).
const GROUP = {chicken: 'scatter', duck: 'scatter', rabbit: 'scatter', goat: 'come', pig: 'come', sheep: 'come', cow: 'look', horse: 'look', alpaca: 'look', dog: 'follow', cat: 'nap'};
export class Critter {
 // obj: Group in the tile (x, z, rotation.y are driven), kind, home: {inside(x, z, r), pick(rng) -> [x, z], clamp?}, speed m/s, radius m,
 // rig: {update(dist, dt, activity, seed)} for the authored livestock, or step(dt, moving, speed) for the procedural ones.
 constructor({obj, kind, home, speed = 1.6, radius = 1, rig = null, step = null, lift = 0, seed = 1, name = kind, floats = false}) {
  Object.assign(this, {obj, kind, home, speed, radius, rig, stepFn: step, lift, seed, name, floats, group: GROUP[kind] || 'look', state: 'idle', timer: 1 + (seed * 7.3) % 4, target: null, heading: (seed * 2.1) % 6.28, joy: 0, scare: 0, activity: 'Standing', hearts: [], callT: 8 + (seed * 13) % 30});
  this.x = obj.position.x; this.z = obj.position.z; this.speedNow = 0;
 }
 // turn gently toward an angle
 turn(a, dt, rate = 4) { let d = a - this.heading; d = Math.atan2(Math.sin(d), Math.cos(d)); this.heading += d * Math.min(1, rate * dt); }
 pick(env, rng = Math.random) { for (let i = 0; i < 12; i++) { const [x, z] = this.home.pick(rng); if (!env.blocked?.(x, z, this.radius, this) && Math.hypot(x - this.x, z - this.z) > 2) return [x, z]; } return null; }
 tap(env) { this.joy = 1.4; this.state = 'joy'; voice(this.kind, 1); for (let i = 0; i < 3; i++) this.hearts.push(heart(this.obj.parent, 5 + i * .6 + this.radius)); return {did: 'pet', item: this.kind}; }
 update(dt, env) {
  const near = env.visitors?.reduce((b, v) => { const d = Math.hypot(v.x - this.x, v.z - this.z); return !b || d < b.d ? {d, v} : b; }, null);
  this.timer -= dt; this.scare = Math.max(0, this.scare - dt); this.joy = Math.max(0, this.joy - dt);
  // scatter: hens, ducks and rabbits run from a visitor that comes close, then settle again
  if (this.group === 'scatter' && near && near.d < 9 && this.scare <= 0 && this.state !== 'joy') {
   this.scare = 1.6; this.state = 'flee'; this.fleeFrom = near.v; this.timer = 1.6; if (Math.random() < .6) voice(this.kind, Math.max(0, 1 - near.d / 40));
  }
  let moving = false, sp = 0;
  if (this.state === 'joy') { if (this.joy <= 0) { this.state = 'idle'; this.timer = 1; } this.activity = 'Standing'; }
  else if (this.state === 'flee') {
   const a = Math.atan2(this.z - this.fleeFrom.z, this.x - this.fleeFrom.x); this.heading = a; // run directly away
   sp = this.speed * 2.6; moving = true; this.activity = 'Fleeing';
   if (this.timer <= 0) { this.state = 'idle'; this.timer = 1.5; }
  } else if (this.state === 'walk') {
   const dx = this.target[0] - this.x, dz = this.target[1] - this.z, d = Math.hypot(dx, dz);
   if (d < .6 || this.timer <= 0) { this.state = 'idle'; this.timer = 2 + Math.random() * 5; this.target = null; this.activity = Math.random() < .6 ? 'Grazing' : 'Standing'; }
   else { this.turn(Math.atan2(dz, dx), dt, 3.5); sp = this.speed; moving = true; this.activity = 'Walking'; }
  } else { // idle: graze, look around, and every so often choose somewhere new
   if (near && near.d < 30 && ['look', 'come', 'follow'].includes(this.group)) {
    const a = Math.atan2(near.v.z - this.z, near.v.x - this.x); if (this.group !== 'follow' || near.d > 14) this.turn(a, dt, 1.6);
    if (this.group === 'come' && this.timer < 0 && near.d > 8) { const t = this.nearestInside(near.v); if (t) { this.target = t; this.state = 'walk'; this.timer = 9; } }
    if (this.group === 'follow' && near.d > 12 && this.timer < 0) { this.target = [near.v.x - Math.cos(a) * 6, near.v.z - Math.sin(a) * 6]; this.state = 'walk'; this.timer = 6; }
   }
   if (this.timer <= 0 && this.state === 'idle') { const t = this.pick(env); if (t) { this.target = t; this.state = 'walk'; this.timer = 14; } else this.timer = 2; }
   this.activity = this.activity === 'Walking' ? 'Standing' : this.activity;
  }
  if (moving) { // step, kept inside the home and out of the props
   const nx = this.x + Math.cos(this.heading) * sp * dt, nz = this.z + Math.sin(this.heading) * sp * dt;
   if (this.home.inside(nx, nz, this.radius) && !env.blocked?.(nx, nz, this.radius, this)) { this.x = nx; this.z = nz; } else { this.state = this.state === 'flee' ? 'idle' : 'walk'; if (this.state === 'walk') { const t = this.pick(env); this.target = t || [this.home.pick(Math.random)[0], this.home.pick(Math.random)[1]]; } this.timer = Math.min(this.timer, 2); }
  }
  this.speedNow = moving ? sp : 0;
  // draw
  const bob = this.joy > 0 ? Math.abs(Math.sin(this.joy * 9)) * .9 : 0, ug = this.stepFn?.(dt, moving, sp / Math.max(.1, this.speed), this.state === 'flee');
  this.rig?.update(moving ? sp * dt : 0, dt, this.joy > 0 ? 'Standing' : this.activity === 'Fleeing' ? 'Walking' : this.activity, this.seed);
  const gy = env.hf(this.x, this.z), data = this.obj.userData;
  this.obj.position.set(this.x, gy + this.lift + bob + (data.lift || 0), this.z); this.obj.rotation.y = -this.heading; this.obj.rotation.z = data.sway || 0; if (this.floats) this.obj.position.y = env.waterY?.(this.x, this.z) ?? this.obj.position.y;
  // calls now and then, quieter the farther the visitor
  this.callT -= dt; if (this.callT <= 0) { this.callT = 18 + Math.random() * 40; if (near) voice(this.kind, Math.max(0, 1 - near.d / 120) * .5); }
  // hearts float up and fade
  for (let i = this.hearts.length - 1; i >= 0; i--) { const h = this.hearts[i]; h.userData.age += dt; h.position.y += dt * 2.2; h.material.opacity = Math.max(0, 1 - h.userData.age / 1.6); if (h.userData.age > 1.6) { h.parent?.remove(h); h.material.dispose(); this.hearts.splice(i, 1); } }
 }
 // the spot inside the home nearest a visitor (where an animal goes to see you over the fence)
 nearestInside(v) { let best = null, bd = 1e9; for (let i = 0; i < 14; i++) { const [x, z] = this.home.pick(Math.random), d = Math.hypot(x - v.x, z - v.z); if (d < bd) { bd = d; best = [x, z]; } } return best; }
}
