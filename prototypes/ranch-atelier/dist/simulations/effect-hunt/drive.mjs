// Wacky arcade driving for the jet cart, the buggy and the toy car (inspired by kart racers; no one's characters, names or
// sounds). Everything is a spring or a clamp, so it feels bouncy and forgiving, never simulated:
//  - the body rides on a soft spring over the ground and squashes on landings
//  - grip is loose (a drift that settles), snow patches make it looser
//  - hold JET and the cart hovers and climbs on a tank that refills on the ground; BOOST is a short burst
//  - leave the board and the world gently slows you; past 5 seconds the tow critter takes over (see tow.mjs)
// Positions are scene metres: x east, z south (so board north is -z). `world` supplies heightAt(x,z) and onBoard(x,z).
export const TUNE = {
 maxSpeed: 26, boostSpeed: 40, accel: 22, brake: 34, drag: .35, steerRate: 2.1, grip: 5.5, slideGrip: 1.4,
 gravity: 26, jetLift: 40, jetMax: 7, tank: 2.6, refill: 1.2, hoverHeight: 12, bounce: .32, slopeSlow: 9,
 offGraceStart: 0, offSlowTo: .4, offLimit: 5
};

export function createDriver({world, tune = {}, start = {x: 0, z: 0, heading: 0}, jetpack = true}) {
 const K = {...TUNE, ...tune};
 const s = {x: start.x, z: start.z, y: world.heightAt(start.x, start.z), heading: start.heading, vx: 0, vz: 0, vy: 0, speed: 0, steer: 0,
  fuel: K.tank, boostT: 0, boostCharge: 1, air: false, squash: 0, pitch: 0, roll: 0, offTime: 0, off: false, grip: 1, jetting: false, landed: 0, bonk: 0, jetpack};
 const input = {throttle: 0, steer: 0, jet: false, boost: false};
 const fwd = () => ({x: Math.sin(s.heading), z: Math.cos(s.heading)});
 let frozen = false, slick = 0;

 function step(dt) {
  dt = Math.min(dt, .05);
  const f = fwd(), rx = f.z, rz = -f.x; // right-hand axis
  let vf = s.vx * f.x + s.vz * f.z, vr = s.vx * rx + s.vz * rz;
  const gnd = world.heightAt(s.x, s.z), height = s.y - gnd;
  s.air = height > .4;
  // ---- off the board: slow down smoothly and count the seconds; the hunt hands over to the tow critter at the limit
  s.off = !world.onBoard(s.x, s.z);
  s.offTime = s.off ? s.offTime + dt : Math.max(0, s.offTime - dt * 2);
  const offK = s.off ? 1 - Math.min(1, s.offTime / K.offLimit) * (1 - K.offSlowTo) : 1;
  if (!frozen) {
   // ---- throttle, brake, boost, drag
   const top = (s.boostT > 0 ? K.boostSpeed : K.maxSpeed) * offK;
   if (input.boost && s.boostCharge >= 1 && s.boostT <= 0) { s.boostT = 1.1; s.boostCharge = 0; vf = Math.max(vf, K.maxSpeed); }
   s.boostT = Math.max(0, s.boostT - dt); if (s.boostT <= 0) s.boostCharge = Math.min(1, s.boostCharge + dt / 6);
   if (s.boostT > 0) vf += K.accel * 2.2 * dt;
   else if (input.throttle > 0) vf += K.accel * input.throttle * dt * (s.air ? .4 : 1);
   else if (input.throttle < 0) vf += (vf > 0 ? -K.brake : -K.accel * .6) * -input.throttle * dt;
   vf -= vf * K.drag * dt; if (vf > top) vf += (top - vf) * Math.min(1, dt * 3);
   // ---- steering is stronger at low speed and eases off when fast; slightly twitchy on purpose
   const want = input.steer * K.steerRate * (1 / (1 + Math.abs(vf) * .03));
   s.steer += (want - s.steer) * Math.min(1, dt * 9);
   s.heading += s.steer * dt * Math.sign(vf || 1) * Math.min(1, Math.abs(vf) / 4 + (s.air ? .5 : 0));
   // ---- slope: uphill slows, downhill speeds up
   const e = 1.5, sl = (world.heightAt(s.x + f.x * e, s.z + f.z * e) - world.heightAt(s.x - f.x * e, s.z - f.z * e)) / (2 * e);
   if (!s.air) vf -= sl * K.slopeSlow * dt * 4;
  }
  // ---- grip: the sideways part of the velocity dies off, slower on snow, almost none in the air
  const g = (s.air ? .25 : 1) * (slick > 0 ? K.slideGrip / K.grip : 1) * K.grip;
  vr -= vr * Math.min(1, g * dt);
  const nf = fwd(); // heading changed: rebuild velocity from the old forward/right parts
  s.vx = nf.x * vf + nf.z * vr; s.vz = nf.z * vf - nf.x * vr; s.speed = vf;
  slick = Math.max(0, slick - dt);
  // ---- vertical: jet lifts toward a hover height with a tank; otherwise gravity and a soft ground spring
  s.jetting = s.jetpack && input.jet && s.fuel > 0 && !frozen;
  if (s.jetting) { s.fuel = Math.max(0, s.fuel - dt); const target = gnd + K.hoverHeight + 6 * (input.throttle > 0 ? 0 : 0); s.vy += (K.jetLift - K.gravity) * dt * (s.y < target ? 1 : .15); s.vy = Math.min(s.vy, K.jetMax); }
  else { s.vy -= K.gravity * dt; if (!input.jet) s.fuel = Math.min(K.tank, s.fuel + (s.air ? .15 : K.refill) * dt); }
  s.x += s.vx * dt; s.z += s.vz * dt; s.y += s.vy * dt;
  const g2 = world.heightAt(s.x, s.z);
  if (s.y <= g2) { // touchdown: a squashy bounce proportional to the fall
   if (s.vy < -6) { s.squash = Math.min(.45, -s.vy * .02); s.landed = Math.min(1, -s.vy / 20); s.vy = -s.vy * K.bounce; if (s.vy < 3) s.vy = 0; } else s.vy = Math.max(0, s.vy);
   s.y = g2;
  }
  if (world.nearObstacles && !s.air) for (const o of world.nearObstacles(s.x, s.z)) { // bonk: soft push-out and a bouncy rebound
   const dx = s.x - o.x, dz = s.z - o.z, d = Math.hypot(dx, dz), R = o.r + 1.6; if (d >= R || d < 1e-4) continue;
   const nx = dx / d, nz = dz / d, vn = s.vx * nx + s.vz * nz; s.x = o.x + nx * R; s.z = o.z + nz * R;
   if (vn < 0) { s.vx -= (1 + .55) * vn * nx; s.vz -= (1 + .55) * vn * nz; s.vy = Math.max(s.vy, Math.min(9, -vn * .3)); s.squash = Math.min(.4, -vn * .02); s.bonk = Math.min(1, -vn / 14); }
  }
  s.squash += (0 - s.squash) * Math.min(1, dt * 6);
  s.landed = Math.max(0, s.landed - dt * 2);
  // ---- body attitude from the ground slope under the nose and the sides, and a lean into turns
  const e2 = 1.6, nf2 = fwd();
  const tp = (world.heightAt(s.x + nf2.x * e2, s.z + nf2.z * e2) - world.heightAt(s.x - nf2.x * e2, s.z - nf2.z * e2)) / (2 * e2);
  const tr = (world.heightAt(s.x + nf2.z * e2, s.z - nf2.x * e2) - world.heightAt(s.x - nf2.z * e2, s.z + nf2.x * e2)) / (2 * e2);
  const airUp = s.air ? Math.max(-.5, Math.min(.5, s.vy * .03)) : 0;
  s.pitch += ((-Math.atan(tp) * (s.air ? .3 : 1)) + airUp - s.pitch) * Math.min(1, dt * 7);
  s.roll += ((Math.atan(tr) * (s.air ? .2 : 1)) - s.steer * Math.min(1, Math.abs(vf) / 20) * .35 - s.roll) * Math.min(1, dt * 7);
 }

 return {
  s, input, step, K,
  set frozen(v) { frozen = v; }, get frozen() { return frozen; },
  impulse(vy) { s.vy = Math.max(s.vy, vy); s.y += .2; },        // mushrooms, ramps
  slick(seconds) { slick = Math.max(slick, seconds); },          // snow
  place(x, z, heading) { s.x = x; s.z = z; s.y = world.heightAt(x, z); s.vx = s.vz = s.vy = 0; s.speed = 0; if (heading != null) s.heading = heading; s.offTime = 0; },
  forward: fwd, offFraction: () => Math.min(1, s.offTime / K.offLimit), timedOut: () => s.offTime >= K.offLimit
 };
}

// Keyboard + touch input. Touch: drag anywhere on the left half steers and throttles like a stick; the round buttons on
// the right are jet and boost. No words anywhere.
export function bindInput(driver, el, {onCast, wins = [window]} = {}) {
 const i = driver.input, keys = new Set();
 const upd = () => {
  i.throttle = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
  i.steer = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
  i.jet = keys.has('Space') || stick.jet; i.boost = keys.has('ShiftLeft') || keys.has('ShiftRight') || stick.boost;
  if (stick.active) { i.steer = stick.x; i.throttle = stick.y; }
 };
 const stick = {active: false, id: null, x0: 0, y0: 0, x: 0, y: 0, jet: false, boost: false};
 const kd = e => { if (e.repeat) return; keys.add(e.code); if (/^(Digit[0-9])$/.test(e.code) && onCast) onCast(e.code === 'Digit0' ? 9 : +e.code.slice(5) - 1); if (/Arrow|Space/.test(e.code)) e.preventDefault(); upd(); };
 const ku = e => { keys.delete(e.code); upd(); };
 for (const w of wins) { w.addEventListener('keydown', kd); w.addEventListener('keyup', ku); }
 const pd = e => { if (e.target.closest?.('[data-ui]')) return; if (e.clientX < (el.clientWidth || innerWidth) * .55 && !stick.active) { stick.active = true; stick.id = e.pointerId; stick.x0 = e.clientX; stick.y0 = e.clientY; el.setPointerCapture?.(e.pointerId); } };
 const pm = e => { if (!stick.active || e.pointerId !== stick.id) return; stick.x = Math.max(-1, Math.min(1, (e.clientX - stick.x0) / 70)); stick.y = Math.max(-1, Math.min(1, (stick.y0 - e.clientY) / 70)); upd(); };
 const pu = e => { if (e.pointerId !== stick.id) return; stick.active = false; stick.x = stick.y = 0; stick.id = null; upd(); };
 el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm); el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu);
 return {stick, set(name, v) { stick[name] = v; upd(); }, dispose() { for (const w of wins) { w.removeEventListener('keydown', kd); w.removeEventListener('keyup', ku); } el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm); el.removeEventListener('pointerup', pu); }};
}
