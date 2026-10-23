// First person at the bottom of the zoom (Evan, 2026-10-23: "zoom should let me do 1st person once i'm at the bottom").
// Zooming in past the closest orbit distance steps the camera down to a person's eye height on the ground under the
// view, facing the way the camera faced. Zooming out (wheel, pinch, gamepad trigger) or Escape steps back up.
// Mouse: drag to look, WASD or the arrow keys to walk. Touch: drag up and down to walk, left and right to turn.
// Gamepad (gamepad.mjs): left stick walks, right stick looks. The camera only follows the ground; it never writes
// to the simulation.
export function installFirstPerson({T, camera, orbit, canvas, getActive, onEnter = () => {}, onExit = () => {}}) {
 const EYE = .17, SPEED = .55, LOOK = .0042; // 1.7 m eyes and a walking pace, in scene units (a tenth of a metre)
 let on = false, yaw = 0, pitch = 0, saved = null, raf = 0, last = 0, drag = null;
 const keys = new Set(), move = {x: 0, z: 0, turn: 0, look: 0}; // move is fed by the gamepad
 const ground = (x, z) => { const a = getActive(); const h = a?.heightAt?.(x * 10, z * 10); return Number.isFinite(h) ? h * .1 : 0; };

 function enter() {
  if (on || !getActive()) return false;
  on = true; saved = {near: camera.near, position: camera.position.clone(), target: orbit.target.clone()};
  const dir = orbit.target.clone().sub(camera.position); dir.y = 0; if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
  yaw = Math.atan2(-dir.x, -dir.z); pitch = -.05;
  camera.position.set(orbit.target.x, ground(orbit.target.x, orbit.target.z) + EYE, orbit.target.z);
  camera.near = .01; camera.updateProjectionMatrix(); orbit.enabled = false;
  document.documentElement.classList.add('first-person');
  last = performance.now(); raf = requestAnimationFrame(tick); onEnter(); return true;
 }
 function exit() {
  if (!on) return false;
  on = false; cancelAnimationFrame(raf); keys.clear(); drag = null;
  // Step back up behind where you stood, at the closest orbit distance, looking at the same spot.
  const look = new T.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), target = camera.position.clone().addScaledVector(look, .4);
  target.y = ground(target.x, target.z);
  orbit.target.copy(target); camera.position.copy(target).addScaledVector(look, -orbit.minDistance * .8).add(new T.Vector3(0, orbit.minDistance * .6, 0));
  camera.near = saved?.near ?? camera.near; camera.updateProjectionMatrix(); orbit.enabled = true; orbit.update();
  document.documentElement.classList.remove('first-person'); onExit(); return true;
 }
 function tick(now) {
  if (!on) return;
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  let f = move.z, s = move.x;
  if (keys.has('w') || keys.has('arrowup')) f += 1; if (keys.has('s') || keys.has('arrowdown')) f -= 1;
  if (keys.has('d')) s += 1; if (keys.has('a')) s -= 1;
  if (keys.has('arrowleft')) yaw += 1.8 * dt; if (keys.has('arrowright')) yaw -= 1.8 * dt;
  yaw -= move.turn * 2.2 * dt; pitch = Math.max(-1.2, Math.min(1.2, pitch - move.look * 1.6 * dt));
  if (drag?.touch) { f += drag.walk; yaw -= drag.turn * dt; }
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), len = Math.hypot(f, s) > 1 ? Math.hypot(f, s) : 1;
  camera.position.x += (fx * f + -fz * s) / len * SPEED * dt; camera.position.z += (fz * f + fx * s) / len * SPEED * dt;
  camera.position.y = ground(camera.position.x, camera.position.z) + EYE;
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  raf = requestAnimationFrame(tick);
 }
 canvas.addEventListener('pointerdown', e => { if (!on) return; e.stopImmediatePropagation(); canvas.setPointerCapture?.(e.pointerId); drag = {id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', walk: 0, turn: 0}; }, true);
 canvas.addEventListener('pointermove', e => {
  if (!on || !drag || drag.id !== e.pointerId) return; e.stopImmediatePropagation();
  if (drag.touch) { drag.walk = Math.max(-1, Math.min(1, (drag.y - e.clientY) / 80)); drag.turn = Math.max(-2, Math.min(2, (e.clientX - drag.x) / 60)); }
  else { yaw -= (e.clientX - drag.x) * LOOK; pitch = Math.max(-1.2, Math.min(1.2, pitch - (e.clientY - drag.y) * LOOK)); drag.x = e.clientX; drag.y = e.clientY; }
 }, true);
 const end = e => { if (on && drag?.id === e.pointerId) { e.stopImmediatePropagation(); drag = null; } };
 canvas.addEventListener('pointerup', end, true); canvas.addEventListener('pointercancel', end, true);
 addEventListener('keydown', e => { if (!on || e.target.closest?.('input,textarea,[contenteditable=true]')) return; if (e.key === 'Escape') { exit(); return; } keys.add(e.key.toLowerCase()); });
 addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
 addEventListener('blur', () => keys.clear());
 // Pinch: in at the closest distance steps down; out steps back up.
 const touches = new Map(); let pinch0 = 0;
 const spread = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
 canvas.addEventListener('touchstart', e => { for (const t of e.changedTouches) touches.set(t.identifier, {x: t.clientX, y: t.clientY}); if (touches.size === 2) pinch0 = spread(); }, {passive: true});
 canvas.addEventListener('touchmove', e => {
  for (const t of e.changedTouches) if (touches.has(t.identifier)) touches.set(t.identifier, {x: t.clientX, y: t.clientY});
  if (touches.size !== 2 || !pinch0) return; const ratio = spread() / pinch0;
  if (!on && ratio > 1.25 && atBottom()) { enter(); pinch0 = 0; } else if (on && ratio < .8) { exit(); pinch0 = 0; }
 }, {passive: true});
 const lift = e => { for (const t of e.changedTouches) touches.delete(t.identifier); if (touches.size < 2) pinch0 = 0; };
 canvas.addEventListener('touchend', lift, {passive: true}); canvas.addEventListener('touchcancel', lift, {passive: true});
 const atBottom = () => camera.position.distanceTo(orbit.target) <= orbit.minDistance * 1.05;
 // The wheel: returns true when it changed mode, so the caller skips its own zoom.
 function wheel(e) {
  if (e.shiftKey) return false;
  if (on) { if (e.deltaY > 0) exit(); return true; }
  if (e.deltaY < 0 && atBottom()) return enter();
  return false;
 }
 return {enter, exit, wheel, atBottom, move, get active() { return on; }};
}
