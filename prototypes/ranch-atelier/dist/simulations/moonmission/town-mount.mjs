// AW-STUDY-0036 Moon Mission, mounted on the Abbie's Town stage (window.AbbieTown.stage, AW-STUDY-0042). The town owns the
// renderer, the camera and the light; the mission adds its scenes to the same world layer, so the black truck stops at the
// real cafe curb in the Downtown diorama and the rocket port lands in the same street. Scenes that live on a tile are placed
// on that tile's spot; off-map scenes (Launch, orbit, the Moon) sit out at the far origin the town keeps for them.
import {createMission} from './mission.mjs';
import {ZONES} from './zones.mjs';
import {createWorld} from './world3d.mjs';
import {createHud} from './hud.mjs';

// mission zone -> the town scene it stands in (null = off-map, registered here)
const TOWN_SCENE = {'main-street': 'cafe-curb', 'church-park': 'cafe-curb', kitchen: 'abbie-kitchen', 'tree-house': 'treehouse', galley: 'anis-kitchen', 'launch-pad': 'launch-pad'};
// the diorama spot each mission zone stands at (tile id, spot id) and how far out from its curb the zone's origin sits
const SPOT = {'main-street': ['downtown', 'cafe', 0], 'church-park': ['downtown', 'common', 0], kitchen: ['abbie-daddy-side', 'home', 16], 'tree-house': ['abbie-daddy-side', 'gingerbread', 12], galley: ['anis-side', 'ani', 16], 'launch-pad': ['downtown', 'cafeRoof', 0]}; // Evan, 21:27Z: the rocket launches from the café's roof pad
const OFFMAP = ['briefing-room', 'crew-bus', 'capsule', 'orbit', 'lunar-descent', 'airlock', 'habitat', 'star-child-cave', 'crater-road', 'moon-base-pad', 'mining-outpost'];
// how big the mission's metres are on the cartoon-scale tile, and how far the near-isometric camera stands back
const FIT = {'main-street': {s: 2, dist: 72, aim: [-4, -7]}, kitchen: {s: 1.1, dist: 70, aim: [0, -2]}, 'tree-house': {s: 1.1, dist: 60}, galley: {s: 1.1, dist: 66}, 'launch-pad': {s: .9, dist: 46}, 'briefing-room': {s: 1, dist: 36}, 'crew-bus': {s: 1, dist: 28}, capsule: {s: 1, dist: 20},
 orbit: {s: 1, dist: 60}, 'lunar-descent': {s: 1, dist: 70}, airlock: {s: 1, dist: 28}, habitat: {s: 1, dist: 55}, 'star-child-cave': {s: 1, dist: 45}, 'crater-road': {s: 1, dist: 60}, 'moon-base-pad': {s: 1, dist: 60}, 'mining-outpost': {s: 1, dist: 34}};
const NIGHT = {bg: '#03050d', sun: '#e8eeff', sunI: 2.4, sky: '#8fa4d8', gnd: '#3a3f55', hemiI: 1.1};
let running = null;

export function start(AT, {quiet = false} = {}) {
 if (running || !AT || !AT.stage) return running;
 const {THREE, controls, camera, farGroup, dioGroup, scene} = AT.stage;
 OFFMAP.forEach((id, i) => AT.registerScene({id, region: null, anchor: [i * 2000, 0], bounds: 80}));
 const m = createMission({chapter: +new URLSearchParams(location.search).get('chapter') || 1}); let mount = null;
 const sceneOf = id => TOWN_SCENE[id] || id;
 const host = {
  bare: id => id === 'main-street' || id === 'church-park',
  parentFor(id) { if (mount) mount.dispose(); mount = AT.mount(sceneOf(id), {}); return mount.group; },
  place(g, id) {
   const sp0 = SPOT[id];
   if (sp0) { const [tile, spot, out] = sp0, t = AT.stage.tiles[tile], sp = t.spots[spot], o = sp.out || {dirX: 0, dirZ: 1}, c = sp.curb || sp;
    const lx = c.x + o.dirX * out, lz = c.z + o.dirZ * out, wx = lx + t.group.position.x + dioGroup.position.x, wz = lz + t.group.position.z + dioGroup.position.z, gy = AT.stage.ground(wx, wz);
    g.position.set(lx + t.group.position.x, (spot === 'cafeRoof' ? c.y + t.group.position.y : gy == null || isNaN(gy) ? c.y : gy) - (spot === 'cafeRoof' ? 0 : dioGroup.position.y), lz + t.group.position.z); g.rotation.y = Math.atan2(o.dirX, o.dirZ); g.scale.setScalar((FIT[id] || {s: 1}).s);
    const aim = (FIT[id] || {}).aim || [0, 0], th = g.rotation.y, ax = (aim[0] * Math.cos(th) + aim[1] * Math.sin(th)) * g.scale.x, az = (-aim[0] * Math.sin(th) + aim[1] * Math.cos(th)) * g.scale.x;
    AT.registerScene({id: 'mm:' + id, region: tile, anchor: [lx + ax, lz + az], y: g.position.y, facing: sp.facing, bounds: sp.bounds || 30}); return; }
   const sc = AT.scenes[sceneOf(id)]; g.position.copy(sc.world).sub(farGroup.position); g.scale.setScalar((FIT[id] || {s: 1}).s);
  },
  entered(id, S) { const f = FIT[id] || {s: 1, dist: 60}, z = ZONES[id]; mount.setMood(z.mood === 'dark' ? 'dark' : 'light'); AT.enterScene(SPOT[id] ? 'mm:' + id : sceneOf(id), {dist: f.dist, azimuth: 45, pitch: 36, fov: 24, lock: true, look: SPOT[id] ? undefined : {wash: 'off', ...(z.mood === 'dark' ? NIGHT : {bg: '#cfe2ea'})}}); },
 };
 AT.stage.hideChrome(true);
 const stageEl = document.getElementById('stage'), saved = stageEl && stageEl.getAttribute('style'); // the town page is a study page: during the mission the world fills the screen
 if (stageEl && !document.body.classList.contains('play')) { stageEl.style.cssText = (saved || '') + ';position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border-radius:0;z-index:5'; dispatchEvent(new Event('resize')); }
 const world = createWorld(null, ZONES, host);
 const hud = createHud({mission: m, world, quiet});
 const off = AT.stage.frame((dt, t) => {
  hud.frame(Math.min(.1, dt));
  const S = world.state, follow = S.buggy || S.lander; // the camera follows the buggy and the lander
  if (follow) { const v = follow.getWorldPosition(new THREE.Vector3()); const d = v.sub(controls.target).multiplyScalar(Math.min(1, dt * 4)); controls.target.add(d); camera.position.add(d); }
  if (m.view().done && !running.ended) { running.ended = true; setTimeout(() => stop(), 6000); }
 });
 function stop() { off(); hud.destroy(); if (stageEl && !document.body.classList.contains('play')) { saved == null ? stageEl.removeAttribute('style') : stageEl.setAttribute('style', saved); dispatchEvent(new Event('resize')); } if (mount) mount.dispose(); AT.stage.hideChrome(false); AT.enterScene('cafe-curb', {dist: 90, pitch: 40}); AT.exitScene(); running = null; }
 running = {m, world, hud, stop, ended: false};
 { const b = new URLSearchParams(location.search).get('beat'); if (b) { hud.bot(b); const v = m.view(); if (v.zone) world.setZone(v.zone, ZONES[v.zone].mood); } } // ?beat=<id> jumps ahead for testing
 window.moonMission = {m, world, hud, view: () => m.view(), bot: hud.bot};
 return running;
}
export const stop = () => running && running.stop();
