// The tow-back. After 5 real seconds off the tiles the cart times out: Nubbin, a friendly original critter, trots in
// from the nearest edge, clips its harness to the front, and tows you back onto the board while you sit and laugh.
// Timeline: 'run' (critter arrives, 1.2 s) -> 'tow' (pull to a safe spot on the board) -> 'release' (critter waves, trots off).
import * as T from 'three';
import {buildNubbin} from './vehicles.mjs';

export function createTow({scene, world, driver, home = {x: 0, z: 0}}) {
 const n = buildNubbin(); n.group.visible = false; n.group.scale.setScalar(1.15); scene.add(n.group);
 const rope = new T.Mesh(new T.CylinderGeometry(.05, .05, 1, 5), new T.MeshStandardMaterial({color: '#d9b36a', flatShading: true})); rope.name = 'tow-rope'; rope.visible = false; scene.add(rope);
 let phase = 'idle', t = 0, target = null, last = {x: 0, z: 0};
 // nearest spot on the board: walk from the cart straight toward home until onBoard, then a few metres further in
 const safeSpot = (x, z) => { const dx = home.x - x, dz = home.z - z, L = Math.hypot(dx, dz) || 1; let d = 0; while (d < L && !world.onBoard(x + dx / L * d, z + dz / L * d)) d += 4; d = Math.min(L, d + 18); return {x: x + dx / L * d, z: z + dz / L * d}; };
 const setPose = (x, z, face, trot) => { const y = world.heightAt(x, z); n.group.position.set(x, y, z); n.group.rotation.y = face; n.group.visible = true; const w = Math.sin(trot * 14) * .6; n.legs.forEach((l, i) => l.rotation.x = (i % 2 ? w : -w)); n.head.rotation.x = Math.sin(trot * 7) * .06; n.tail.position.y = 1.05 + Math.abs(Math.sin(trot * 10)) * .12; };
 return {
  get active() { return phase !== 'idle'; }, get phase() { return phase; }, critter: n.group,
  update(dt, hooks = {}) {
   const s = driver.s;
   if (phase === 'idle') { if (driver.timedOut()) { phase = 'run'; t = 0; target = safeSpot(s.x, s.z); driver.frozen = true; hooks.onStart?.(); const a = Math.atan2(target.x - s.x, target.z - s.z); n._from = {x: s.x - Math.sin(a) * 60, z: s.z - Math.cos(a) * 60}; n._face = a; } else { n.group.visible = rope.visible = false; return; } }
   t += dt; const a = Math.atan2(target.x - s.x, target.z - s.z), fx = Math.sin(a), fz = Math.cos(a);
   if (phase === 'run') { // the critter runs in from behind the cart, round to the front
    const k = Math.min(1, t / 1.2), e = 1 - (1 - k) ** 2, fromX = n._from.x, fromZ = n._from.z, ax = s.x + fx * 3.4, az = s.z + fz * 3.4;
    setPose(fromX + (ax - fromX) * e, fromZ + (az - fromZ) * e, a + Math.PI, t); // facing the cart, then turns to face home when it hooks on
    if (k >= 1) { phase = 'tow'; t = 0; hooks.onHook?.(); }
   } else if (phase === 'tow') {
    // the cart is pulled at a gentle, steady pace; the critter faces the way home and runs ahead of it
    const v = 15 + Math.min(10, t * 4), dx = target.x - s.x, dz = target.z - s.z, L = Math.hypot(dx, dz);
    if (L < 2.5) { phase = 'release'; t = 0; hooks.onDone?.(); } else { const m = Math.min(L, v * dt); driver.s.x += dx / L * m; driver.s.z += dz / L * m; driver.s.y = Math.max(world.heightAt(driver.s.x, driver.s.z) + 2.2 + Math.sin(t * 8) * .5, driver.s.y * .98); driver.s.vx = driver.s.vz = driver.s.vy = 0; const dh = ((Math.atan2(dx, dz) - driver.s.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; driver.s.heading += dh * Math.min(1, dt * 4); }
    setPose(s.x + fx * 4.2, s.z + fz * 4.2, a, t); last = {x: n.group.position.x, z: n.group.position.z};
   } else if (phase === 'release') { // sets you down, waves, trots off
    driver.frozen = false; driver.s.offTime = 0;
    const k = t / 1.6; setPose(last.x + fx * k * 10, last.z + fz * k * 10, a, t); n.group.scale.setScalar(1.15 * Math.max(.01, 1 - Math.max(0, k - .6) * 2.5));
    if (t > 1.6) { phase = 'idle'; n.group.visible = rope.visible = false; n.group.scale.setScalar(1.15); return; }
   }
   // rope from the critter's harness to the front of the cart
   if (phase !== 'release') { const A = n.group.position.clone().add(new T.Vector3(0, 1, 0)), B = new T.Vector3(s.x + fx * 1.6, s.y + .8, s.z + fz * 1.6), L = A.distanceTo(B); rope.visible = true; rope.position.copy(A).lerp(B, .5); rope.scale.set(1, L, 1); rope.lookAt(B); rope.rotateX(Math.PI / 2); } else rope.visible = false;
  }
 };
}
