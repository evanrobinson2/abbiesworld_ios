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
const OFFMAP = ['briefing-room', 'crew-bus', 'capsule', 'orbit', 'lunar-descent', 'airlock', 'habitat', 'star-child-cave', 'crater-road', 'moon-base-pad'];
// how big the mission's metres are on the cartoon-scale tile, and how far the near-isometric camera stands back
const FIT = {'main-street': {s: 1.6, dist: 80, out: 9}, kitchen: {s: 1.1, dist: 70}, 'tree-house': {s: 1.1, dist: 60}, galley: {s: 1.1, dist: 66}, 'launch-pad': {s: 1.2, dist: 100}, 'briefing-room': {s: 1, dist: 36}, 'crew-bus': {s: 1, dist: 28}, capsule: {s: 1, dist: 20},
 orbit: {s: 1, dist: 60}, 'lunar-descent': {s: 1, dist: 70}, airlock: {s: 1, dist: 28}, habitat: {s: 1, dist: 55}, 'star-child-cave': {s: 1, dist: 45}, 'crater-road': {s: 1, dist: 60}, 'moon-base-pad': {s: 1, dist: 60}};
let running = null;

export function start(AT, {quiet = false} = {}) {
 if (running || !AT || !AT.stage) return running;
 const {THREE, controls, camera, farGroup, dioGroup, scene} = AT.stage;
 OFFMAP.forEach((id, i) => AT.registerScene({id, region: null, anchor: [i * 2000, 0], bounds: 80}));
 const m = createMission(); let mount = null;
 // the tile's ground under a scene: the spot's y can sit below the squeezed terrain, so ask the land itself (cast down onto the tile's meshes)
 const ray = new THREE.Raycaster();
 function groundY(wx, wz, fallback) { const tile = AT.stage.tiles.downtown; ray.set(new THREE.Vector3(wx, 600, wz), new THREE.Vector3(0, -1, 0)); const hits = ray.intersectObject(AT.stage.dioGroup, true).filter(h => h.object.isMesh && !mount?.group.children.includes(h.object) && !isMine(h.object)); const want = fallback + dioGroup.position.y, near = hits.filter(h => Math.abs(h.point.y - want) < 5).sort((a, b) => Math.abs(a.point.y - want) - Math.abs(b.point.y - want)); return near.length ? near[0].point.y - dioGroup.position.y : fallback; }
 const isMine = o => { for (let p = o; p; p = p.parent) if (p === (mount && mount.group)) return true; return false; };
 const sceneOf = id => TOWN_SCENE[id] || id;
 const host = {
  bare: id => id === 'main-street' || id === 'church-park',
  parentFor(id) { if (mount) mount.dispose(); mount = AT.mount(sceneOf(id), {}); return mount.group; },
  place(g, id) { const sc = AT.scenes[sceneOf(id)], origin = sc.region ? dioGroup.position : farGroup.position; g.position.copy(sc.world).sub(origin); if (TOWN_SCENE[id] && sc.facing != null && FIT[id].out) g.position.add(new THREE.Vector3(Math.sin(sc.facing), 0, Math.cos(sc.facing)).multiplyScalar(FIT[id].out)); if (sc.region) g.position.y = groundY(g.position.x + origin.x, g.position.z + origin.z, g.position.y);
  if (sc.region) { const tp = AT.stage.tiles[sc.region].group.position; AT.registerScene({id: 'mm:' + id, region: sc.region, anchor: [g.position.x - tp.x, g.position.z - tp.z], y: g.position.y + dioGroup.position.y, facing: sc.facing, bounds: sc.bounds}); } g.scale.setScalar((FIT[id] || {s: 1}).s); if (sc.facing != null && TOWN_SCENE[id]) g.rotation.y = sc.facing; },
  entered(id, S) { const f = FIT[id] || {s: 1, dist: 60}, z = ZONES[id]; mount.setMood(z.mood === 'dark' ? 'dark' : 'light'); AT.enterScene(AT.scenes['mm:' + id] ? 'mm:' + id : sceneOf(id), {dist: f.dist, azimuth: 45, pitch: 36, fov: 24, lock: true}); },
 };
 AT.stage.hideChrome(true);
 const world = createWorld(null, ZONES, host);
 const hud = createHud({mission: m, world, quiet});
 const off = AT.stage.frame((dt, t) => {
  hud.frame(Math.min(.1, dt));
  const S = world.state, follow = S.buggy || S.lander; // the camera follows the buggy and the lander
  if (follow) { const v = follow.getWorldPosition(new THREE.Vector3()); const d = v.sub(controls.target).multiplyScalar(Math.min(1, dt * 4)); controls.target.add(d); camera.position.add(d); }
  if (m.view().done && !running.ended) { running.ended = true; setTimeout(() => stop(), 6000); }
 });
 function stop() { off(); hud.destroy(); if (mount) mount.dispose(); AT.stage.hideChrome(false); AT.exitScene(); running = null; }
 running = {m, world, hud, stop, ended: false};
 { const b = new URLSearchParams(location.search).get('beat'); if (b) { hud.bot(b); const v = m.view(); if (v.zone) world.setZone(v.zone, ZONES[v.zone].mood); } } // ?beat=<id> jumps ahead for testing
 window.moonMission = {m, world, hud, view: () => m.view(), bot: hud.bot};
 return running;
}
export const stop = () => running && running.stop();
