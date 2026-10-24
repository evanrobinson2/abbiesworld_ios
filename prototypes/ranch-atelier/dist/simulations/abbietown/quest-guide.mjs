// Quest guidance on the Winchester board (Issue #531): once she says yes to a favour, the place her next step needs is lit with a
// big pulsing spotlight (poi-beacon.mjs): gold where the object is picked up, green where it belongs. It moves on as the steps
// tick off and goes out when the favour is done. Presentation layer: a cue for the player, invisible to every perception.
//   mountQuestGuide({THREE, scene, camera, canvas, spots, fallback, fly})
//     spots     (at) => Object3D | null   the quest place's object, looked up every time so late-loading hexes are found
//     fallback  (at) => Vector3 | null    where to light it if the place has no object (the giver standing there)
//     fly       (Vector3, {dist, pitch}) => void   the town's camera move
// Abbie is six and must always know where to head (Evan, 2026-10-24), so the guide never fails silently:
//   - it looks the places up again every two seconds, so a hex that loads late is lit as soon as it exists;
//   - when the light is off screen, a small glowing arrow sits on the screen edge pointing to it;
//   - guide.status() says what is wanted, lit, off screen and missing, and a missing place is warned about once;
//   - an error in one frame is reported once and the next frame carries on.
//   guide.flyToNext() moves the camera to frame the next place (wide enough that it does not count as arriving).
import {createPoiBeacons} from '../poi-beacon.mjs';
import {targets} from '../quests.mjs';

export const COLOUR = {collect: '#ffd23f', bring: '#3fe0a0', visit: '#6cc4ff'};
// the quest engine's place names, as the board's hero spots ('lab' is parked until the high school game, so has none)
export const PLACE = {cafe: 'cafe', school: 'highschool', common: 'common', noticeboard: 'noticeboard', bakery: 'bakery', farm: 'farm'};
export const placeObject = (tiles, at) => { for (const id of Object.keys(tiles || {})) { const s = tiles[id].spots?.[PLACE[at]]; if (s?.g) return s.g; } return null; };

// The lights she should see now: one per place, collecting beats delivering when two favours point at the same door.
export function lights(list = targets()) {
 const by = new Map();
 for (const t of list) { if (!t.at) continue; const cur = by.get(t.at); if (!cur || (cur.do !== 'collect' && t.do === 'collect')) by.set(t.at, t); }
 return [...by.values()].map(t => ({at: t.at, do: t.do, colour: COLOUR[t.do] || COLOUR.visit, quest: t.quest, say: t.say}));
}

// Where the edge arrow sits for a point projected to clip space (x, y in -1..1, z > 1 is behind the camera): null when the
// point is on screen, else {x, y, angle} in pixels from the top left, inset by pad, angle in radians (0 = pointing right).
export function edgeArrow(p, w, h, pad = 46) {
 let x = p.x, y = p.y; if (p.z > 1) { x = -x; y = -y; }
 if (p.z <= 1 && Math.abs(x) <= 1 && Math.abs(y) <= 1) return null;
 const m = Math.max(Math.abs(x), Math.abs(y)) || 1; x /= m; y /= m;
 const sx = (w / 2 - pad) * x, sy = (h / 2 - pad) * y;
 return {x: w / 2 + sx, y: h / 2 - sy, angle: Math.atan2(-y, x)};
}

const CSS = `.aw-qg-arrow{position:fixed;z-index:28;width:44px;height:44px;margin:-22px 0 0 -22px;pointer-events:none;filter:drop-shadow(0 0 8px var(--c));animation:awqg 1.2s ease-in-out infinite}
.aw-qg-arrow i{position:absolute;inset:0;transform:rotate(var(--a))}
.aw-qg-arrow i:before{content:"";position:absolute;left:8px;top:6px;border-left:30px solid var(--c);border-top:16px solid transparent;border-bottom:16px solid transparent}
@keyframes awqg{50%{margin-left:-18px;opacity:.7}}`;

export function mountQuestGuide({THREE: T, scene, camera, canvas, spots, fallback = () => null, fly = null, warn = (...a) => console.warn(...a)}) {
 const beacons = createPoiBeacons({THREE: T, scene, camera}), v = new T.Vector3(), box = new T.Box3();
 const place = at => typeof spots === 'function' ? spots(at) : spots?.[at];
 const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
 const arrows = new Map(), spot = new Map(), warned = new Set();
 let st = {wanted: [], lit: [], missing: [], off: [], error: null};
 if (typeof document !== 'undefined') { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); }

 const sync = () => {
  const want = lights(), keep = new Set(), missing = [];
  for (const l of want) {
   const o = place(l.at); let p = null;
   if (o) { box.setFromObject(o); if (!box.isEmpty()) { box.getCenter(v); p = {x: v.x, y: box.min.y, z: v.z}; } }
   if (!p) { const f = fallback(l.at); if (f) p = {x: f.x, y: f.y, z: f.z}; }
   if (!p) { missing.push(l.at); if (!warned.has(l.at)) { warned.add(l.at); warn('quest guide: nowhere to put the light for', l.at); } continue; }
   warned.delete(l.at); keep.add(l.at); spot.set(l.at, {o, p, colour: l.colour});
   beacons.set(l.at, p, {colour: l.colour, radius: 6});
  }
  for (const id of [...beacons.items.keys()]) if (!keep.has(id)) { beacons.remove(id); spot.delete(id); arrows.get(id)?.remove(); arrows.delete(id); }
  st = {...st, wanted: want.map(l => l.at), lit: [...keep], missing};
 };
 addEventListener('aw-quests-change', sync); addEventListener('aw-inventory-change', sync); sync();
 const again = setInterval(() => { try { sync(); } catch (e) { fail(e); } }, 2000);
 const fail = e => { if (st.error !== String(e)) { st.error = String(e); warn('quest guide', e); } };

 const arrow = id => {
  let a = arrows.get(id); if (a) return a;
  a = document.createElement('div'); a.className = 'aw-qg-arrow'; a.innerHTML = '<i></i>'; a.style.setProperty('--c', spot.get(id).colour); a.hidden = true; document.body.append(a); arrows.set(id, a); return a;
 };
 function arrowsFrame() {
  const r = (canvas || document.body).getBoundingClientRect(), off = [];
  for (const [id, s] of spot) {
   const b = beacons.items.get(id); const a = arrow(id);
   const visible = !s.o || shown(s.o); if (b) b.g.visible = visible;
   v.set(s.p.x, s.p.y, s.p.z).project(camera);
   const e = visible ? edgeArrow(v, r.width, r.height) : null;
   a.hidden = !e; if (e) { off.push(id); a.style.left = r.left + e.x + 'px'; a.style.top = r.top + e.y + 'px'; a.style.setProperty('--a', e.angle + 'rad'); }
  }
  st.off = off;
 }
 let last = performance.now();
 (function frame(now) {
  requestAnimationFrame(frame);
  try { const dt = Math.min(.05, (now - last) / 1000); last = now; arrowsFrame(); beacons.update(dt); } catch (e) { fail(e); }
 })(last);

 return {
  beacons, sync, status: () => ({...st}),
  // frame the next place she is wanted at, from far enough away that it is a look, not an arrival
  flyToNext() {
   const l = lights()[0]; const s = l && spot.get(l.at); if (!s || !fly) return null;
   fly(new T.Vector3(s.p.x, s.p.y, s.p.z), {dist: 420, pitch: 48}); return {at: l.at, say: l.say};
  },
  dispose() { clearInterval(again); beacons.dispose(); arrows.forEach(a => a.remove()); }
 };
}
