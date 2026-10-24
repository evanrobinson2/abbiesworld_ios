// Paint the World inside Abbie's Town (AW-STUDY-0049; Evan 2026-10-23: "abbies.world is Winchester, not the ranch sandbox, so the
// splats need to work in /town too"). Mounts on AbbieTown.stage the way the Moon Mission does: the town owns the renderer,
// camera and light; this adds the paint fireball and its ball row on the top bar, and the paint to the world layer of the seven-hex board.
//   start(window.AbbieTown)   once, after the stage exists. Also answers the god-view deck's 'ranch:play-event' {id: 'paint-rain'}.
// The town has no hour of the day, so the paint keeps its own game clock (a day in three minutes, as in the sandbox).
// Paint and plants sit only on the hexes (the height function says NaN off them), and grow at the diorama's scale
// (1 unit = 1 metre here; the sandbox is 0.1), so a splat is about the width of a house.
import {createPaintWorld, hoursOf} from './paint-world.mjs';
import {createPaintHud} from './paint-hud.mjs';
import {rollGrant, groundThrow} from './paint-balls.mjs';

const HOURS_PER_SECOND = 24 / 180;
const inHex = (x, y, R) => { const ax = Math.abs(x), ay = Math.abs(y); return ay <= R * Math.sqrt(3) / 2 && ax <= R - ay / Math.sqrt(3); }; // flat-top, as the town's
let running = null;

export function start(AT) {
 if (running || !AT || !AT.stage) return running;
 const {THREE: T, scene, camera, controls, renderer, dioGroup, tiles} = AT.stage, R = AT.board.hexSide, SCALE = 2.4;
 const heightAt = (wx, wz) => { for (const t of Object.values(tiles)) { const px = wx - t.centre.x, py = -(wz - t.centre.z); if (inHex(px, py, R)) return t.hf(px, py); } return NaN; };
 const world = createPaintWorld({scene, camera, unit: 1, heightAt, plantScale: 4, maxPlants: 40});
 world.warm(renderer, camera);
 let clock = {day: 1, hour: 9};
 let hud = null;
 const mountHud = () => { hud = createPaintHud({host: window.AWHud?.balloons || null, onThrow: (ball, x, y, vx, vy) => {
  if (!dioGroup.visible) return false;
  const g = groundThrow(T, camera, renderer.domElement, controls.target, x, y, vx, vy, heightAt); if (!g) return false;
  world.launch({...g, colour: ball.colour, R: (7.5 + Math.random() * 4) * SCALE * ball.R}, clock); return true;
 }}); };
 // The fireball and its balls go in the HUD's balloons slot (the end of the top row); wait for the HUD a few seconds at most.
 if (window.AWHud) mountHud(); else { addEventListener('aw-hud-ready', mountHud, {once: true}); setTimeout(() => { if (!hud) mountHud(); }, 4000); }
 function play() { const grant = rollGrant(); if (!hud) return; hud.grant(grant); renderer.domElement.dataset.paintGrant = JSON.stringify({count: grant.count, size: grant.size.id}); }
 addEventListener('ranch:play-event', e => { if (e.detail?.id === 'paint-rain') play(); });
 AT.stage.frame((dt) => {
  const on = dioGroup.visible; world.root.visible = on; hud?.setVisible(on);
  if (!on) return;
  const t = clock.hour + Math.min(.1, dt) * HOURS_PER_SECOND; clock = {day: clock.day + Math.floor(t / 24), hour: t % 24};
  world.update(Math.min(.1, dt), clock, {daylight: 1});
 });
 running = {world, get tray() { return hud?.tray; }, get hud() { return hud; }, play, get clock() { return clock; }};
 AT.paint = running;
 return running;
}
