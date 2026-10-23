// The Effect Hunt (AW-STUDY-0057). One controller that puts a vehicle on the Winchester board, lights a laser beacon over
// every effect you have not found, lets you drive (cart, buggy, toy car) or watch from overhead (god mode), and gives
// every effect you collect a 15 second cooldown tray.
//   const hunt = createHunt({scene, camera, renderer, world, paint, clock})
//   hunt.frame(dt)                every animation frame
//   hunt.setMode('cart'|'buggy'|'coaster'|'god')
// `world` is world.mjs' fromBoard() (or the stand-in). `paint` is optional: createPaintWorld(...) from Paint the World.
import * as T from 'three';
import {beaconCheat, EFFECTS, byId, collect, found, canCast, startCooldown, spotOf, isFound, COOLDOWN_MS, cooldownLeft} from './effects.mjs';
import {createBeacons} from './beacons.mjs';
import {createFx} from './fx.mjs';
import {VEHICLES} from './vehicles.mjs';
import {createDriver, bindInput} from './drive.mjs';
import {createTow} from './tow.mjs';
import {mountUi} from './ui.mjs';
import {chime, boing, pop, pipPip, bonk} from './sound.mjs';

export const MODES = [
 {id: 'cart', icon: '🛒', name: 'Jet cart', vehicle: 'cart'}, {id: 'buggy', icon: '🚙', name: 'Moon buggy', vehicle: 'buggy'},
 {id: 'coaster', icon: '🏎️', name: 'Toy car', vehicle: 'coaster'}, {id: 'god', icon: '🛰️', name: 'Overhead', vehicle: null}
];

export function createHunt({scene, camera, renderer, world, paint = null, clock = {day: 1, hour: 18.5}, ui = true, mode = 'cart', beacons = true, onFound, onAll, offset = {x: 0, y: 0, z: 0}, wins = [window], uiRoot = document.body, onExit, fov = 58, camHold = 0, vehicleScale = 1.9, chase = {dist: 20, height: 8.5}, tune = {}}) {
 const effectsAt = e => { const s = spotOf(e, world.board), p = world.toScene(s.x, s.y); return {x: p.x, y: world.heightAt(p.x, p.z), z: p.z}; };
 const places = new Map(EFFECTS.map(e => { const p = effectsAt(e); return [e.id, p]; }));
 const beam = createBeacons({scene, effects: EFFECTS, place: e => { const p = places.get(e.id); return {x: p.x, y: p.y, z: p.z}; }});
 beam.restore(found()); beam.set(beacons);
 const fx = createFx({scene, heightAt: world.heightAt});
 const start = world.roadStart?.(0, -40) || (() => { const s = world.toScene(0, -40); return {x: s.x, z: s.z, heading: Math.PI}; })();
 const driver = createDriver({world, start, tune});
 const tow = createTow({scene, world, driver, home: world.home});
 const vehicleRoot = new T.Group(); vehicleRoot.name = 'vehicle'; scene.add(vehicleRoot);
 const VS = vehicleScale; // a toy-sized vehicle in a toy-sized town: bigger than life so it reads from the sky
 let vehicle = null, vehicleId = null, cur = mode, armed = -1, autopilot = null, yawOff = 0, idle = 0, camPos = new T.Vector3(), camLook = new T.Vector3(), godCentre = new T.Vector3(start.x, 0, start.z), godHeight = 190;
 let wheelSpin = 0, bobT = 0, onTray;

 function setVehicle(id) {
  if (vehicleId === id) return; vehicleId = id; vehicleRoot.clear(); const def = VEHICLES[id]; vehicle = def.build(); vehicleRoot.add(vehicle.group); driver.s.jetpack = !!def.jetpack;
  vehicle.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.raycast = () => {}; } });
 }
 const off = new T.Vector3(offset.x, offset.y, offset.z);
 const hud = ui ? mountUi({root: uiRoot, onExit,
  onCast: i => cast(i), onMode: id => setMode(id), onJet: v => { input.set('jet', v); }, onBoost: v => { input.set('boost', v); },
  modes: MODES
 }) : null;
 const input = bindInput(driver, renderer.domElement, {onCast: i => cast(i), wins});

 function setMode(id) {
  cur = id; const m = MODES.find(x => x.id === id); if (m.vehicle) setVehicle(m.vehicle); vehicleRoot.visible = true; autopilot = null; hud?.setMode(id); beam.set(beacons && (id !== 'god' || beaconCheat()));
  if (id === 'god') { godCentre.set(driver.s.x, 0, driver.s.z); }
 }
 function castAt(e, at) {
  if (!canCast(e.id)) return false;
  const heading = driver.s.heading;
  if (e.id === 'paint') { if (!paint) return false; paint.play({colours: ['pink', 'teal'], at: {x: at.x, z: at.z}, count: 4, spread: 12, R: [4, 6]}, clock); }
  else if (!fx.cast(e.id, {x: at.x, z: at.z, heading})) return false;
  startCooldown(e.id); pop(); return true;
 }
 function cast(i) {
  const e = EFFECTS[i]; if (!e) return;
  if (!isFound(e.id)) { hud?.pulse(i); return; }
  if (cur === 'god') { armed = armed === i ? -1 : i; hud?.armed(armed); return; }
  const f = driver.forward(), d = e.id === 'shrooms' ? 0 : e.id === 'paint' ? 16 : 0; castAt(e, {x: driver.s.x + f.x * d, z: driver.s.z + f.z * d});
 }
 // god mode: a tap on the ground sends the cart there, or casts the armed effect there
 const ray = new T.Raycaster(), v2 = new T.Vector2();
 function groundAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect(); v2.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(v2, camera);
  const o = ray.ray.origin.clone().sub(off), d = ray.ray.direction; let t = 0; for (let k = 0; k < 90; k++) { const x = o.x + d.x * t, z = o.z + d.z * t, y = o.y + d.y * t; if (y <= world.heightAt(x, z)) return {x, z}; t += Math.max(2, (y - world.heightAt(x, z)) * .5 / Math.max(.15, -d.y)); }
  return null;
 }
 let downAt = null;
 renderer.domElement.addEventListener('pointerdown', e => { downAt = {x: e.clientX, y: e.clientY, id: e.pointerId, t: performance.now(), cx: godCentre.x, cz: godCentre.z}; });
 renderer.domElement.addEventListener('pointermove', e => { if (cur !== 'god' || !downAt || e.pointerId !== downAt.id) return; const k = godHeight / renderer.domElement.clientHeight * 1.7; godCentre.x = downAt.cx - (e.clientX - downAt.x) * k; godCentre.z = downAt.cz - (e.clientY - downAt.y) * k; });
 renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || e.pointerId !== downAt.id) return; const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y); downAt = null;
  if (moved > 8) return;
  if (cur === 'god') { const g = groundAt(e.clientX, e.clientY); if (!g) return; if (armed >= 0) { castAt(EFFECTS[armed], g); armed = -1; hud?.armed(-1); } else autopilot = g; }
 });
 renderer.domElement.addEventListener('wheel', e => { if (cur === 'god') { godHeight = Math.min(420, Math.max(70, godHeight * (1 + Math.sign(e.deltaY) * .1))); e.preventDefault(); } }, {passive: false});
 // drag in drive mode swings the camera round the cart; it eases back behind you after a moment of hands off
 renderer.domElement.addEventListener('pointermove', e => { if (cur !== 'god' && e.buttons === 1 && e.clientX >= (renderer.domElement.clientWidth || innerWidth) * .55) { yawOff -= e.movementX * .008; idle = 0; } });

 let lastOff = 0;
 function frame(dt) {
  dt = Math.min(dt, .05); const s = driver.s, now = Date.now(); bobT += dt;
  // autopilot for god mode taps: steer toward the target and slow when near
  if (cur === 'god' && autopilot) { const dx = autopilot.x - s.x, dz = autopilot.z - s.z, dist = Math.hypot(dx, dz); const want = Math.atan2(dx, dz); let dh = ((want - s.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; driver.input.steer = Math.max(-1, Math.min(1, dh * 2)); driver.input.throttle = dist < 8 ? 0 : (Math.abs(dh) > 1.8 ? .2 : .85); if (dist < 8 && Math.abs(s.speed) < 3) autopilot = null; if (dist > 20 && s.speed < 1.5) driver.input.jet = true; else driver.input.jet = false; }
  else if (cur === 'god') { driver.input.steer = driver.input.throttle = 0; }
  if (!tow.active) driver.step(dt); else driver.step(0.0001);
  const wasTowing = tow.active;
  tow.update(dt, {onStart: () => { pipPip(); }, onHook: () => { pipPip(); }});
  if (tow.active && !wasTowing) hud?.pulse(0);
  if (s.bonk > 0) { bonk(s.bonk); s.bonk = 0; }
  fx.update(dt, driver);
  if (paint) paint.update(dt, clock);
  beam.update(dt);
  // pickups
  const hit = beam.nearest(s.x, s.z, 7); if (hit && s.y - world.heightAt(s.x, s.z) < 14 && !isFound(hit.id)) {
   const n = collect(hit.id); beam.remove(hit.id); chime(n); hud?.pulse(EFFECTS.indexOf(hit)); onFound?.(hit, n);
   fx.cast('confetti', {x: s.x, z: s.z, heading: s.heading}); if (n >= EFFECTS.length) onAll?.();
  }
  // vehicle pose
  if (vehicle) {
   const g = vehicleRoot; g.position.set(s.x, s.y, s.z); g.rotation.set(0, 0, 0); g.rotateY(s.heading); g.rotateX(s.pitch + (s.jetting ? -.12 : 0)); g.rotateZ(s.roll);
   const sq = 1 - s.squash * .6; vehicle.group.scale.set((1 + s.squash * .4) * VS, sq * VS, (1 + s.squash * .4) * VS);
   wheelSpin += s.speed * dt * 3; vehicle.wheels.forEach(w => { w.rotation.x = wheelSpin; });
   const p = vehicle.parts; if (p.flames) p.flames.forEach((f, i) => { const k = s.jetting ? 1.3 + Math.sin(bobT * 40 + i) * .3 : 0; f.scale.set(.8 + k * .3, Math.max(.001, k), .8 + k * .3); f.visible = k > 0.01; });
   if (p.riders) p.riders.forEach((r, i) => { r.position.y = vehicle.seats[i].y + Math.sin(bobT * 9 + i * 2) * .04 * Math.min(1, Math.abs(s.speed) / 12) + (s.air ? .08 : 0); r.rotation.z = -s.steer * .18 + Math.sin(bobT * 3 + i) * .02; r.rotation.x = s.air ? -.1 : 0; });
   if (p.flag) p.flag.rotation.z = Math.PI / 2 + Math.sin(bobT * 8) * .25;
  }
  camera_(dt);
  hud?.frame(now, s.fuel / driver.K.tank, s.jetting);
  return s;
 }
 const sunAim = new T.Vector3();
 function camera_(dt) {
  const s = driver.s; if (camHold > 0) { camHold -= dt; return; } // the host's own fly-in is finishing
  if (cur === 'god') {
   if (!downAt) { godCentre.x += (autopilot ? (s.x - godCentre.x) : 0) * Math.min(1, dt * 1.2); godCentre.z += (autopilot ? (s.z - godCentre.z) : 0) * Math.min(1, dt * 1.2); }
   const y = world.heightAt(godCentre.x, godCentre.z); camPos.set(godCentre.x, y + godHeight, godCentre.z + godHeight * .28); camLook.set(godCentre.x, y, godCentre.z);
   camPos.add(off); camLook.add(off); camera.position.lerp(camPos, 1 - Math.exp(-dt * 5)); camera.lookAt(camLook); return;
  }
  idle += dt; if (idle > 1.5 || Math.abs(driver.input.throttle) > .1) yawOff *= Math.exp(-dt * (idle > 1.5 ? 2 : .6));
  const a = s.heading + yawOff + Math.PI, dist = chase.dist + Math.min(chase.dist * .35, Math.abs(s.speed) * .14 * chase.dist / 20), h = chase.height + (s.y - world.heightAt(s.x, s.z)) * .3;
  camPos.set(s.x + Math.sin(a) * dist, s.y + h, s.z + Math.cos(a) * dist);
  const gy = world.heightAt(camPos.x, camPos.z) + 2; if (camPos.y < gy) camPos.y = gy; // never under the ground
  camPos.add(off); camera.position.lerp(camPos, 1 - Math.exp(-dt * 4)); camLook.set(s.x + Math.sin(s.heading) * 8, s.y + 3, s.z + Math.cos(s.heading) * 8).add(off); camera.lookAt(camLook);
  camera.fov += ((fov + Math.min(14, Math.abs(s.speed) * .35) + (driver.s.boostT > 0 ? 8 : 0)) - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix();
 }
 setMode(mode);
 return {
  driver, tow, fx, beam, places, frame, setMode, cast, get mode() { return cur; }, setBeacons: v => { beacons = v; beam.set(v && (cur !== 'god' || beaconCheat())); }, vehicleRoot,
  foundCount: () => found().size, dispose() { hud?.dispose(); input.dispose(); vehicleRoot.removeFromParent(); fx.root.removeFromParent(); beam.root.removeFromParent(); camera.fov = fov; camera.updateProjectionMatrix(); }
 };
}
