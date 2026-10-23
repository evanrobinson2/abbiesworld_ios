// Gamepad play (Evan, 2026-10-23: "game should support game pad"), standard mapping through the browser Gamepad API.
//   Left stick   pan over the board, or walk in first person
//   Right stick  orbit the camera, or look around in first person
//   RT / LT      zoom in / out; RT at the closest zoom steps into first person, LT steps back out
//   A            tap whatever is under the centre of the screen (a small aiming dot shows while a pad is in use)
//   B            back (closes what is open, like Escape)
//   LB / RB      move along the cards in the hand; X plays the card in focus
//   Y            the toy box; Start pauses
// It only drives the same controls a finger or mouse would; nothing here writes to the simulation directly.
const DEAD = .18;
const axis = v => Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD);

export function installGamepad() {
 let raf = 0, last = 0, prev = [], focus = -1, dot = null;
 const $ = s => document.querySelector(s);
 const hand = () => [...document.querySelectorAll('#v2-hand .generator-hero, #current-scene-type .generator-hero')].filter(h => h.getClientRects().length);
 const showFocus = () => { hand().forEach((h, i) => h.toggleAttribute('data-pad-focus', i === focus)); };
 const aim = on => {
  if (on && !dot) { dot = document.createElement('div'); dot.id = 'pad-aim'; dot.setAttribute('aria-hidden', 'true'); document.body.append(dot); }
  if (dot) dot.hidden = !on;
 };
 function pressed(pad, i) { const now = !!pad.buttons[i]?.pressed, was = !!prev[i]; return now && !was; }
 function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
  const pad = [...(navigator.getGamepads?.() || [])].find(p => p && p.connected);
  if (!pad) { aim(false); raf = 0; return; }
  const cam = window.RanchCamera, fp = window.RanchFirstPerson;
  const lx = axis(pad.axes[0] || 0), ly = axis(pad.axes[1] || 0), rx = axis(pad.axes[2] || 0), ry = axis(pad.axes[3] || 0);
  const rt = pad.buttons[7]?.value || 0, lt = pad.buttons[6]?.value || 0;
  const busyUI = !!document.querySelector('dialog[open]');
  if (cam && !busyUI) {
   const {T, camera, orbit} = cam;
   if (fp?.active) {
    fp.move.z = -ly; fp.move.x = lx; fp.move.turn = rx; fp.move.look = ry;
    if (lt > .5 && !prev.ltHeld) fp.exit();
   } else {
    if (lx || ly || rx || ry) cam.stopFollow();
    const offset = camera.position.clone().sub(orbit.target), dist = offset.length();
    if (lx || ly) { // pan along the ground, relative to where the camera faces
     const fwd = offset.clone().setY(0).normalize().negate(), right = new T.Vector3(-fwd.z, 0, fwd.x), k = dist * .9 * dt;
     const step = fwd.multiplyScalar(-ly * k).add(right.multiplyScalar(lx * k)); orbit.target.add(step); camera.position.add(step);
    }
    if (rx || ry) {
     const sph = new T.Spherical().setFromVector3(offset);
     sph.theta -= rx * 2.2 * dt; sph.phi = Math.max(.12, Math.min(orbit.maxPolarAngle, sph.phi + ry * 1.6 * dt));
     camera.position.copy(orbit.target).add(new T.Vector3().setFromSpherical(sph));
    }
    const zoom = rt - lt;
    if (zoom) {
     if (zoom > 0 && fp?.atBottom()) { if (!prev.rtHeld) fp.enter(); }
     else { const o = camera.position.clone().sub(orbit.target); o.setLength(Math.max(orbit.minDistance, Math.min(orbit.maxDistance, o.length() * Math.exp(-zoom * 1.6 * dt)))); camera.position.copy(orbit.target).add(o); }
    }
    orbit.update();
   }
  }
  if (pressed(pad, 0)) { const c = cam?.canvas?.getBoundingClientRect(); if (c && !fp?.active) window.RanchPickAt?.(c.left + c.width / 2, c.top + c.height / 2); }
  if (pressed(pad, 1)) document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  if (pressed(pad, 4) || pressed(pad, 5)) { const n = hand().length; if (n) { focus = ((focus < 0 ? 0 : focus + (pressed(pad, 5) ? 1 : -1)) + n) % n; showFocus(); document.getElementById('v2-hand')?.classList.remove('tucked'); } }
  if (pressed(pad, 2) && focus >= 0) hand()[focus]?.click();
  if (pressed(pad, 3)) $('#v2-box')?.click();
  if (pressed(pad, 9)) $('#pause')?.click();
  aim(!fp?.active);
  prev = pad.buttons.map(b => b.pressed); prev.ltHeld = lt > .5; prev.rtHeld = rt > .5;
  raf = requestAnimationFrame(loop);
 }
 const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
 addEventListener('gamepadconnected', start);
 addEventListener('gamepaddisconnected', () => { focus = -1; showFocus(); const m = window.RanchFirstPerson?.move; if (m) Object.assign(m, {x: 0, z: 0, turn: 0, look: 0}); });
 const style = document.createElement('style');
 style.textContent = '#pad-aim{position:fixed;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fffcf0d0;box-shadow:0 0 0 1.5px #1b223080;pointer-events:none;z-index:40}#pad-aim[hidden]{display:none}.generator-hero[data-pad-focus]{outline:3px solid #ffd34d;outline-offset:2px;--lift:-16px}';
 document.head.append(style);
 if ([...(navigator.getGamepads?.() || [])].some(Boolean)) start();
}
