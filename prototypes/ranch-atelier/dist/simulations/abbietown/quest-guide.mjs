// Quest guidance on the Winchester board (Issue #531): once she says yes to a favour, the place her next step needs is lit with a
// big pulsing spotlight (poi-beacon.mjs): gold where the object is picked up, green where it belongs. It moves on as the steps
// tick off and goes out when the favour is done. Presentation layer: a cue for the player, invisible to every perception.
//   mountQuestGuide({THREE, scene, camera, spots, onFrame})   spots: {cafe: {object3d}, ...} the quest places on the board
import {createPoiBeacons} from '../poi-beacon.mjs';
import {targets} from '../quests.mjs';

export const COLOUR = {collect: '#ffd23f', bring: '#3fe0a0', visit: '#6cc4ff'};

// The lights she should see now: one per place, collecting beats delivering when two favours point at the same door.
export function lights(list = targets()) {
 const by = new Map();
 for (const t of list) { if (!t.at) continue; const cur = by.get(t.at); if (!cur || (cur.do !== 'collect' && t.do === 'collect')) by.set(t.at, t); }
 return [...by.values()].map(t => ({at: t.at, do: t.do, colour: COLOUR[t.do] || COLOUR.visit, quest: t.quest}));
}

export function mountQuestGuide({THREE: T, scene, camera, spots}) {
 const beacons = createPoiBeacons({THREE: T, scene, camera}), v = new T.Vector3(), box = new T.Box3();
 const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
 const sync = () => {
  const want = lights(), keep = new Set();
  for (const l of want) {
   const s = spots[l.at]; if (!s) continue;
   box.setFromObject(s); box.getCenter(v); keep.add(l.at);
   beacons.set(l.at, {x: v.x, y: box.min.y, z: v.z}, {colour: l.colour, radius: 6});
  }
  for (const id of [...beacons.items.keys()]) if (!keep.has(id)) beacons.remove(id);
 };
 addEventListener('aw-quests-change', sync); addEventListener('aw-inventory-change', sync); sync();
 let last = performance.now();
 (function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  for (const [id, b] of beacons.items) b.g.visible = !!spots[id] && shown(spots[id]); // the board hides, so do its lights
  beacons.update(dt);
 })(last);
 return {beacons, sync};
}
