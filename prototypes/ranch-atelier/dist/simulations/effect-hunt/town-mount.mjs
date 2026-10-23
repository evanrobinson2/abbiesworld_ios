// Mounts the Effect Hunt inside the real Winchester town (window.AbbieTown). Import this module from INSIDE the town's own
// frame (see demo-mission.mjs), so it shares the town's three.js. Coordinates: board metres east and north, the town's
// dioGroup is local with z = -north, and `dioGroup.position` is how far the board sits from the scene origin.
import {createHunt} from './hunt.mjs';
import {fromBoard} from './world.mjs';
import {createBeacons} from './beacons.mjs';
import {EFFECTS, found, spotOf} from './effects.mjs';
import {createPaintWorld} from '../paint-world/paint-world.mjs';

// Beacons only (the notebook line is selected, nobody is driving yet): a laser over every effect still hidden.
export function showBeacons({stage, board = window.AbbieTown.board}) {
 const world = fromBoard(board), scene = stage.dioGroup;
 const b = createBeacons({scene, effects: EFFECTS, place: e => { const s = spotOf(e, board), p = world.toScene(s.x, s.y); return {x: p.x, y: world.heightAt(p.x, p.z), z: p.z}; }});
 b.restore(found());
 stage.flyTo({x: stage.dioGroup.position.x, y: world.heightAt(0, 40) + stage.dioGroup.position.y + 3, z: stage.dioGroup.position.z + 40}, {dist: 40, pitch: 30, azimuth: 180}); // the host's own camera glides to the spawn, then the chase camera takes over
 const off = stage.frame((dt) => b.update(Math.min(dt || .016, .05)));
 return {beacons: b, dispose() { off(); b.root.removeFromParent(); }};
}

export function mountHunt({stage, board = window.AbbieTown.board, doc = document, uiRoot, mode = 'cart', onExit, wins}) {
 const world = fromBoard(board), scene = stage.dioGroup, ctl = stage.controls, cam = stage.camera, renderer = stage.renderer;
 const clock = {day: 1, hour: 15.5}, saved = {enabled: ctl.enabled};
 ctl.enabled = false; doc.documentElement.style.setProperty('--hunt-left', '74px'); // clear of the backpack button
 const paint = createPaintWorld({scene, heightAt: (a, b) => world.heightAt(a * .6, b * .6) / .6, unit: .6, camera: cam, plantScale: 5});
 const hunt = createHunt({scene, camera: cam, renderer, world, paint, clock, mode, offset: stage.dioGroup.position, uiRoot: uiRoot || document.body, wins: wins || [...new Set([window, doc.defaultView, window.parent])], onExit: () => onExit?.(), fov: cam.fov, camHold: 1.8, vehicleScale: 2.6, chase: {dist: 34, height: 19}});
 stage.flyTo({x: stage.dioGroup.position.x, y: world.heightAt(0, 40) + stage.dioGroup.position.y + 3, z: stage.dioGroup.position.z + 40}, {dist: 40, pitch: 30, azimuth: 180}); // the host's own camera glides to the spawn, then the chase camera takes over
 const off = stage.frame(dt => { const s = hunt.frame(Math.min(dt || .016, .05)); ctl.target.set(s.x + stage.dioGroup.position.x, s.y + stage.dioGroup.position.y, s.z + stage.dioGroup.position.z); });
 window.__effectHunt = hunt; // for tests and the console
 return {hunt, paint, dispose() { off(); hunt.dispose(); paint.dispose(); ctl.enabled = saved.enabled; }};
}
