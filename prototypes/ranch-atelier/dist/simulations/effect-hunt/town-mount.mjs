// Mounts the Effect Hunt inside the real Winchester town (window.AbbieTown). Import this module from INSIDE the town's own
// frame (see demo-mission.mjs), so it shares the town's three.js. Coordinates: board metres east and north, the town's
// dioGroup is local with z = -north, and `dioGroup.position` is how far the board sits from the scene origin.
import * as T from 'three';
import {createHunt} from './hunt.mjs';
import {fromBoard} from './world.mjs';
import {createBeacons} from './beacons.mjs';
import {EFFECTS, found, spotOf} from './effects.mjs';
import {createPaintWorld} from '../paint-world/paint-world.mjs';
import {createKart} from '../kart/kart.mjs'; // kart mode (AW-STUDY-0058): a racetrack stencilled from the board, scenery to crash into, laps

// Beacons only (the notebook line is selected, nobody is driving yet): a laser over every effect still hidden.
export function showBeacons({stage, board = window.AbbieTown.board}) {
 const world = fromBoard(board), scene = stage.dioGroup;
 const b = createBeacons({scene, camera: stage.camera, effects: EFFECTS, place: e => { const s = spotOf(e, board), p = world.toScene(s.x, s.y); return {x: p.x, y: world.heightAt(p.x, p.z), z: p.z}; }});
 b.restore(found());
 const st0 = start || world.roadStart?.(0, -40) || {x: 0, z: 40}; stage.flyTo({x: stage.dioGroup.position.x + st0.x, y: world.heightAt(st0.x, st0.z) + stage.dioGroup.position.y + 3, z: stage.dioGroup.position.z + st0.z}, {dist: 40, pitch: 30, azimuth: ((st0.heading ?? Math.PI) * 180 / Math.PI + 180)}); // the host's own camera glides to the spawn, then the chase camera takes over
 const off = stage.frame((dt) => b.update(Math.min(dt || .016, .05)));
 return {beacons: b, dispose() { off(); b.root.removeFromParent(); }};
}

export function mountHunt({stage, board = window.AbbieTown.board, doc = document, uiRoot, mode = 'cart', onExit, wins, start = null, kart: withKart = true, scale = 2.6, through = !withKart}) { // start: {x, z, heading} in scene metres, else the road nearest the middle; kart: false for a plain drive (the carwash)
 const world = fromBoard(board), scene = stage.dioGroup, ctl = stage.controls, cam = stage.camera, renderer = stage.renderer;
 if (through) world.nearObstacles = () => []; // a plain drive (the carwash buggy) passes through houses, trees and bushes; kart mode keeps its own props to crash into
 const k = scale / 2.6, clock = {day: 1, hour: 15.5}, saved = {enabled: ctl.enabled};
 ctl.enabled = false; doc.documentElement.style.setProperty('--hunt-left', '74px'); // clear of the backpack button
 let handle = null; // always a way out (Evan could not leave drive mode): the notebook button, a round close button, and Escape all land here; if the host's own exit leaves the drive running, it is stopped here
 function leave() { try { onExit?.(); } catch (e) { console.warn('drive exit', e); } if (handle && window.__effectHunt === handle.hunt) handle.dispose(); }
 const paint = createPaintWorld({scene, heightAt: (a, b) => world.heightAt(a * .6, b * .6) / .6, unit: .6, camera: cam, plantScale: 5});
 const hunt = createHunt({scene, camera: cam, renderer, world, paint, clock, mode, offset: stage.dioGroup.position, uiRoot: uiRoot || document.body, wins: wins || [...new Set([window, doc.defaultView, window.parent])], onExit: () => leave(), start, fov: cam.fov, camHold: 1.8, vehicleScale: scale, chase: {dist: 34 * k, height: 19 * k}, tune: {radius: 3.2 * k}});
 const st0 = world.roadStart?.(0, -40) || {x: 0, z: 40}; stage.flyTo({x: stage.dioGroup.position.x + st0.x, y: world.heightAt(st0.x, st0.z) + stage.dioGroup.position.y + 3, z: stage.dioGroup.position.z + st0.z}, {dist: 40, pitch: 30, azimuth: ((st0.heading ?? Math.PI) * 180 / Math.PI + 180)}); // the host's own camera glides to the spawn, then the chase camera takes over
 // kart mode: the loop threads between the town's houses; the Polaroid phone and fire wheels ride along when earned
 const kart = !withKart ? null : createKart({scene, world, driver: hunt.driver, board, tow: hunt.tow, width: 11, vehicleRoot: hunt.vehicleRoot, camera: cam, renderer, topScene: stage.scene, inCar: () => hunt.mode !== 'god', onEvent: e => { if (e.t === 'lap' && e.done) window.dispatchEvent(new CustomEvent('aw:kart-race-done', {detail: e})); }});
 kart?.ready({atStart: false}).then(() => { const t = kart.track, q = world.toScene(t.start.x, t.start.y); hunt.driver.place(q.x, q.z, Math.atan2(t.start.tx, -t.start.ty)); }).catch(e => console.warn('kart mode: track not built', e));
 const off = stage.frame(dt => { dressGhost(); const s = hunt.frame(Math.min(dt || .016, .05)); kart?.frame(dt || .016); ctl.target.set(s.x + stage.dioGroup.position.x, s.y + stage.dioGroup.position.y, s.z + stage.dioGroup.position.z); });
 let dropPicker = () => {}, gone = false; import('../kart/toy-cars.mjs').then(m => { if (!gone) dropPicker = m.mountCarPicker({hunt}); }).catch(() => {}); // tap for the next toy car
 const closeBtn = Object.assign(doc.createElement('button'), {type: 'button', textContent: '✕', className: 'aw-drive-exit'}); closeBtn.dataset.ui = ''; closeBtn.setAttribute('aria-label', 'Stop driving');
 closeBtn.style.cssText = 'position:fixed;right:14px;top:14px;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,.6);background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.6),rgba(255,130,170,.4));box-shadow:0 6px 16px rgba(60,20,80,.3),inset 0 1px 2px rgba(255,255,255,.7);font-size:22px;color:#5a1030;z-index:60;cursor:pointer;touch-action:manipulation'; closeBtn.onclick = e => { e.stopPropagation(); leave(); }; doc.body.appendChild(closeBtn);
 const keys = [...new Set([window, doc.defaultView])].filter(Boolean), esc = e => { if (e.key === 'Escape') leave(); }; keys.forEach(w => w.addEventListener('keydown', esc));
 // the car is always findable: where scenery hides it, a pale outline of it shows through (drawn for the player only, never part of the world)
 const veh = hunt.vehicleRoot, ghosts = []; let ghostFor = null; const ghostMat = new T.MeshBasicMaterial({color: '#ffffff', transparent: true, opacity: .5, depthFunc: T.GreaterDepth, depthWrite: false});
 const dressGhost = () => { const cur = veh.children[0]; if (cur === ghostFor) return; ghostFor = cur; ghosts.length = 0; cur?.traverse(o => { if (!o.isMesh || o.userData.ghost) return; const g = new T.Mesh(o.geometry, ghostMat); g.userData.ghost = g.userData.presentation = true; g.renderOrder = 999; g.raycast = () => {}; o.add(g); }); };
 if (kart) window.__kart = kart;
 window.__effectHunt = hunt; // for tests and the console
 return handle = {hunt, paint, kart, dispose() { gone = true; closeBtn.remove(); keys.forEach(w => w.removeEventListener('keydown', esc)); dropPicker(); off(); kart?.dispose(); hunt.dispose(); paint.dispose(); ctl.enabled = saved.enabled; if (window.__effectHunt === hunt) window.__effectHunt = null; if (window.__kart === kart) window.__kart = null; }};
}
