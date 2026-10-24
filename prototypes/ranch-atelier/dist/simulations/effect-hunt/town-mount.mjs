// Mounts the Effect Hunt inside the real Winchester town (window.AbbieTown). Import this module from INSIDE the town's own
// frame (see demo-mission.mjs), so it shares the town's three.js. Coordinates: board metres east and north, the town's
// dioGroup is local with z = -north, and `dioGroup.position` is how far the board sits from the scene origin.
import {createHunt} from './hunt.mjs';
import {fromBoard} from './world.mjs';
import {createBeacons} from './beacons.mjs';
import {EFFECTS, found, spotOf} from './effects.mjs';
import {createPaintWorld} from '../paint-world/paint-world.mjs';
import {createKart} from '../kart/kart.mjs'; // kart mode (AW-STUDY-0058): a racetrack stencilled from the board, scenery to crash into, laps

// Beacons only (the notebook line is selected, nobody is driving yet): a laser over every effect still hidden.
export function showBeacons({stage, board = window.AbbieTown.board}) {
 const world = fromBoard(board), scene = stage.dioGroup;
 const b = createBeacons({scene, effects: EFFECTS, place: e => { const s = spotOf(e, board), p = world.toScene(s.x, s.y); return {x: p.x, y: world.heightAt(p.x, p.z), z: p.z}; }});
 b.restore(found());
 const st0 = start || world.roadStart?.(0, -40) || {x: 0, z: 40}; stage.flyTo({x: stage.dioGroup.position.x + st0.x, y: world.heightAt(st0.x, st0.z) + stage.dioGroup.position.y + 3, z: stage.dioGroup.position.z + st0.z}, {dist: 40, pitch: 30, azimuth: ((st0.heading ?? Math.PI) * 180 / Math.PI + 180)}); // the host's own camera glides to the spawn, then the chase camera takes over
 const off = stage.frame((dt) => b.update(Math.min(dt || .016, .05)));
 return {beacons: b, dispose() { off(); b.root.removeFromParent(); }};
}

export function mountHunt({stage, board = window.AbbieTown.board, doc = document, uiRoot, mode = 'cart', onExit, wins, start = null, kart: withKart = true}) { // start: {x, z, heading} in scene metres, else the road nearest the middle; kart: false for a plain drive (the carwash)
 const world = fromBoard(board), scene = stage.dioGroup, ctl = stage.controls, cam = stage.camera, renderer = stage.renderer;
 const clock = {day: 1, hour: 15.5}, saved = {enabled: ctl.enabled};
 ctl.enabled = false; doc.documentElement.style.setProperty('--hunt-left', '74px'); // clear of the backpack button
 const paint = createPaintWorld({scene, heightAt: (a, b) => world.heightAt(a * .6, b * .6) / .6, unit: .6, camera: cam, plantScale: 5});
 const hunt = createHunt({scene, camera: cam, renderer, world, paint, clock, mode, offset: stage.dioGroup.position, uiRoot: uiRoot || document.body, wins: wins || [...new Set([window, doc.defaultView, window.parent])], onExit: () => onExit?.(), start, fov: cam.fov, camHold: 1.8, vehicleScale: 2.6, chase: {dist: 34, height: 19}, tune: {radius: 3.2}});
 const st0 = world.roadStart?.(0, -40) || {x: 0, z: 40}; stage.flyTo({x: stage.dioGroup.position.x + st0.x, y: world.heightAt(st0.x, st0.z) + stage.dioGroup.position.y + 3, z: stage.dioGroup.position.z + st0.z}, {dist: 40, pitch: 30, azimuth: ((st0.heading ?? Math.PI) * 180 / Math.PI + 180)}); // the host's own camera glides to the spawn, then the chase camera takes over
 // kart mode: the loop threads between the town's houses; the Polaroid phone and fire wheels ride along when earned
 const kart = !withKart ? null : createKart({scene, world, driver: hunt.driver, board, tow: hunt.tow, width: 11, vehicleRoot: hunt.vehicleRoot, camera: cam, renderer, topScene: stage.scene, inCar: () => hunt.mode !== 'god', onEvent: e => { if (e.t === 'lap' && e.done) window.dispatchEvent(new CustomEvent('aw:kart-race-done', {detail: e})); }});
 kart?.ready({atStart: false}).then(() => { const t = kart.track, q = world.toScene(t.start.x, t.start.y); hunt.driver.place(q.x, q.z, Math.atan2(t.start.tx, -t.start.ty)); }).catch(e => console.warn('kart mode: track not built', e));
 const off = stage.frame(dt => { const s = hunt.frame(Math.min(dt || .016, .05)); kart?.frame(dt || .016); ctl.target.set(s.x + stage.dioGroup.position.x, s.y + stage.dioGroup.position.y, s.z + stage.dioGroup.position.z); });
 let dropPicker = () => {}, gone = false; import('../kart/toy-cars.mjs').then(m => { if (!gone) dropPicker = m.mountCarPicker({hunt}); }).catch(() => {}); // tap for the next toy car
 if (kart) window.__kart = kart;
 window.__effectHunt = hunt; // for tests and the console
 return {hunt, paint, kart, dispose() { gone = true; dropPicker(); off(); kart?.dispose(); hunt.dispose(); paint.dispose(); ctl.enabled = saved.enabled; if (window.__effectHunt === hunt) window.__effectHunt = null; if (window.__kart === kart) window.__kart = null; }};
}
