// Drawn by hand, 12 frames: the Guilty Gear Xrd-inspired look from AW-STUDY-0045 (#8 there), promoted to a real mode in
// AW-STUDY-0051. A 3D figure that passes for hand-drawn limited animation: two hard designed bands of light, a pen
// outline whose width swells and thins, the outline redrawn a little differently on every drawing (line boil), paper
// grain that changes with each drawing, and animation that holds each pose for two film frames ("on twos", 12 drawings a
// second). Style only: nothing from the game itself, just how its kind of picture is made.
//   const H = handDrawn(T, root, {fps: 12})   swaps the look onto every mesh under root (shading and ink are
//                                             painted-brush.mjs with this preset, so figures keep their own maps and roles)
//   const k = H.tick(seconds)                 once per frame with the clock's seconds: {t, frame, changed}. Feed k.t to the
//                                             AnimationMixer / move player so poses step; changed is true on a new drawing
//   H.render(renderer, scene, camera, k)      renders; with camera 'stepped' it holds the view between drawings, else smooth
//   H.hold(seconds)                           holds the current drawing (a hit lands: the whole picture freezes a beat)
//   H.set({fps, boil, grain, camera, ink})    live tuning; H.restore() puts every original material back
//   stepMixer(mixer, fps)                     for a game that runs its own loop: makes mixer.update(dt) sample the pose only on a
//                                             new drawing (dt of 0, a hit-stop, holds the pose); returns an undo function
//   handDrawnClock({fps})                     the clock on its own, for things that are not figures (a prop's wobble, a lamp)
// Frame time stays at the standard: the look is the same one shader program as Painted Brush (uniforms only), so
// switching it on compiles nothing new once Painted Brush is warm; H.warm(renderer, scene, camera) compiles it ahead.
import {paintBrush} from './painted-brush.mjs';

export const HAND_DRAWN = {
 fps: 12, camera: 'smooth',
 // Xrd's shading is designed, not simulated: two hard bands, a cool shadow, almost no painted surface, a thin warm rim
 bands: 2, soft: .04, half: .55, tint: '#7a6aa8', amb: .5, paint: .18, brush: 0, rim: .55, accent: '#ffd9a8',
 sun: '#fff1dc', sky: '#9fb2d6', ground: '#6a5a78', lightDir: [.35, .75, .6], fog: 0,
 point: '#000000', pointPos: [0, -50, 0], pointR: 1, flicker: 0,
 // the pen: wide, swelling and thinning along the line (inkVary), redrawn each drawing (boil), never dry-brushed broken
 ink: .016, inkBreak: 0, inkVary: .35, inkCol: '#1a1424', boil: .7,
 grain: .09,
};

// A clock that steps. tick(now) -> {t, frame, changed}: t is the time of the held drawing, so every animation fed with it
// sits still between drawings. hold() freezes it (hit-stop) and the held time is not played back afterwards.
export function handDrawnClock({fps = 12} = {}) {
 let last = null, virt = 0, holdUntil = 0, prevFrame = -1, rate = fps;
 const c = {
  get fps() { return rate; }, set fps(v) { rate = Math.max(1, +v || 12); },
  tick(now) {
   if (last === null) last = now;
   const from = Math.max(last, holdUntil); virt += Math.max(0, now - from); last = now;
   const frame = Math.floor(virt * rate + 1e-9), t = frame / rate, changed = frame !== prevFrame;
   prevFrame = frame;
   return {t, frame, changed};
  },
  hold(seconds, now = last ?? 0) { holdUntil = Math.max(holdUntil, now + seconds); },
  reset() { last = null; virt = 0; holdUntil = 0; prevFrame = -1; },
 };
 return c;
}

// Pose stepping for a game that already calls mixer.update(dt) every frame. The mixer only moves when a drawing's worth
// of time has built up, so the body holds each pose for two film frames while movement, input and physics stay smooth.
export function stepMixer(mixer, fps = 12) {
 const orig = mixer.update; let acc = 0;
 mixer.update = function (dt) {
  acc += dt;
  if (acc + 1e-9 >= 1 / fps) { const d = acc; acc = 0; orig.call(mixer, d); }
  return mixer;
 };
 return () => { mixer.update = orig; };
}

export function handDrawn(T, root, opts = {}) {
 const L = {...HAND_DRAWN, ...opts}, clock = handDrawnClock({fps: L.fps}), B = paintBrush(T, root, L);
 const held = {pos: new T.Vector3(), quat: new T.Quaternion(), zoom: 1, has: false}, save = {pos: new T.Vector3(), quat: new T.Quaternion()};
 const inkScale = B.ink.uW.value / (L.ink || 1);
 let cameraMode = L.camera, last = {t: 0, frame: 0, changed: true};
 const H = {
  U: B.U, brush: B, clock, hulls: B.hulls,
  get fps() { return clock.fps; },
  tick(now) {
   last = clock.tick(now);
   B.setFrame(last.frame);
   return last;
  },
  hold: (seconds, now) => clock.hold(seconds, now),
  set(o = {}) {
   if (o.fps != null) clock.fps = o.fps;
   if (o.camera) { cameraMode = o.camera; held.has = false; }
   if (o.boil != null) B.ink.uBoil.value = o.boil;
   if (o.inkVary != null) B.ink.uVary.value = o.inkVary;
   if (o.grain != null) B.U.uGrain.value = o.grain;
   if (o.ink != null) B.ink.uW.value = o.ink * inkScale;
   return H;
  },
  render(renderer, scene, camera, k = last) {
   if (cameraMode !== 'stepped') { held.has = false; renderer.render(scene, camera); return; }
   // stepped camera: take the view on a new drawing, render from it, give the live camera back to its controls
   if (k.changed || !held.has) { held.pos.copy(camera.position); held.quat.copy(camera.quaternion); held.zoom = camera.zoom; held.has = true; }
   save.pos.copy(camera.position); save.quat.copy(camera.quaternion);
   camera.position.copy(held.pos); camera.quaternion.copy(held.quat); camera.updateMatrixWorld(true);
   renderer.render(scene, camera);
   camera.position.copy(save.pos); camera.quaternion.copy(save.quat); camera.updateMatrixWorld(true);
  },
  warm(renderer, scene, camera) { renderer.compile(scene, camera); },
  restore: () => B.restore(),
 };
 return H;
}
