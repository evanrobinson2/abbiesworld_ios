// AW-STUDY-0036 Game 2: the lunar lander. Daddy flies (tilt and thrust), Abbie works the landing lights, Ani puts the
// feet down, and the girls call out rocks from the picture-in-picture camera. Nothing fails: a hard landing is a big
// bounce and Houston laughing, then you go again. Pure and deterministic; the scene reads `state` every frame.
export const MOON_G = 1.62; // m/s^2
export const SOFT = 2.5;    // m/s: at or under this is a soft landing

export function newLander(seed = 1) {
 return {alt: 220, vy: -9, x: 0, vx: 0, fuel: 100, tilt: 0, lights: false, feet: false, t: 0, bounces: 0, landed: false, soft: false, rocks: rocksFor(seed)};
}
// rocks on the way down: [altitude when it appears, side -1 left / 1 right, call]
function rocksFor(seed) {
 let s = seed >>> 0 || 1; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
 return [160, 110, 60].map(a => { const side = r() < .5 ? -1 : 1; return {alt: a, side, said: false, call: side < 0 ? 'Rock! Go right!' : 'Rock! Go left!'}; });
}
// input: {thrust 0..1, tilt -1..1}; returns the calls spoken this step
export function stepLander(L, input = {}, dt = 1 / 30) {
 const out = [];
 if (L.landed) return out;
 const thrust = Math.max(0, Math.min(1, input.thrust || 0)) * (L.fuel > 0 ? 1 : 0);
 L.tilt += ((input.tilt || 0) - L.tilt) * Math.min(1, dt * 4);
 const ay = -MOON_G + thrust * 4.2, ax = Math.sin(L.tilt) * thrust * 2.4;
 L.vy += ay * dt; L.vx += ax * dt; L.alt += L.vy * dt; L.x += L.vx * dt; L.fuel = Math.max(0, L.fuel - thrust * dt * 5); L.t += dt;
 for (const k of L.rocks) if (!k.said && L.alt <= k.alt) { k.said = true; out.push({who: k.side < 0 ? 'ani' : 'abbie', text: k.call}); }
 if (L.alt <= 0) {
  L.alt = 0;
  const speed = Math.hypot(L.vy, L.vx);
  if (speed <= SOFT && L.lights && L.feet) { L.landed = true; L.soft = true; out.push({who: 'houston', text: 'Touchdown. Soft as a feather, Moon Rocket.'}); }
  else { L.bounces++; L.vy = Math.min(4, Math.abs(L.vy) * .35); L.vx *= .3; L.alt = .2; out.push({who: 'houston', text: L.bounces > 1 ? 'Bounce number ' + L.bounces + '. Gently now, Commander.' : 'Well, you’re down! Mostly. Try that again, a little softer.'}); if (L.bounces >= 3) { L.landed = true; L.soft = false; out.push({who: 'houston', text: 'That counts. Welcome to the Moon!'}); } } // never a fail: after three bounces it settles
 }
 return out;
}
