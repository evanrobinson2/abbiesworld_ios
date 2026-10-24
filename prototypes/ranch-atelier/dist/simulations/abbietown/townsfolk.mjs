// Townsfolk on the Winchester board who ask for help (Evan, 2026-10-23 23:39Z: "if you interact with people have them ask
// for you to help them, take on a task and that puts something in your back pack"). The quests themselves live in
// simulations/quests.mjs (the quests thread); this puts the people who give them into the town and tells the quest
// engine where she goes. Drafted 2026-10-23.
//   mountTownsfolk(window.AbbieTown, window.__town)   once the board is built
// World layer: the people are small low-poly figures standing by their place, so the town's own characters can see them.
// Presentation layer: the ask is a speech bubble on the person (spatial), with a little mark over anyone who has an ask.
// Visits: when the camera settles close over one of the quest places, report({did: 'visit', at}) ticks off matching steps.
import {GIVERS, TEMPLATES, offer, accept, decline, report} from '../quests.mjs?v=1';

// the quest engine's place names, as the board's hero spots ('lab' is parked until the high school game, so has none)
const SPOT = {cafe: 'cafe', school: 'highschool', common: 'common', noticeboard: 'noticeboard', bakery: 'bakery', farm: 'farm'};
const LOOK = {baker: ['#f4efe6', '#8a5a3a'], teacher: ['#5b7fb8', '#3b2a22'], librarian: ['#7a5a8c', '#6b4a2a'], postie: ['#c8502c', '#2a2a2a'],
 gardener: ['#5f8f4a', '#c9a35a'], scientist: ['#f4f6f8', '#4a4a4a'], neighbour: ['#d98a45', '#5a3a2a'], farmer: ['#b5532f', '#6b4a2a']};
const SKIN = ['#f1c9a5', '#c68a5e', '#8d5a3b', '#e8b48f', '#a86f4a', '#f3d2b6', '#7a4a32'];

function figure(T, [coat, hair], skin) {
 const g = new T.Group(), m = c => new T.MeshStandardMaterial({color: c, roughness: .8, flatShading: true});
 const body = new T.Mesh(new T.CylinderGeometry(.42, .62, 1.7, 7), m(coat)); body.position.y = 1.15; body.name = 'coat';
 const legs = new T.Mesh(new T.CylinderGeometry(.4, .36, .55, 7), m('#3a3d44')); legs.position.y = .28; legs.name = 'trousers';
 const head = new T.Mesh(new T.IcosahedronGeometry(.42, 1), m(skin)); head.position.y = 2.38; head.name = 'skin';
 const top = new T.Mesh(new T.SphereGeometry(.45, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55), m(hair)); top.position.y = 2.46; top.name = 'hair';
 for (const o of [body, legs, head, top]) { o.castShadow = true; g.add(o); }
 return g;
}

export function mountTownsfolk(town, {THREE: T, camera, canvas, controls} = {}) {
 const tiles = town?.stage?.tiles; if (!T || !tiles || !camera || !canvas) return null;
 const spotOf = at => { for (const id of Object.keys(tiles)) { const s = tiles[id].spots?.[SPOT[at]]; if (s?.g) return s; } return null; };
 const people = [], perPlace = {};
 Object.entries(GIVERS).forEach(([id, giver], i) => {
  const s = spotOf(giver.at); if (!s) return;
  const box = new T.Box3().setFromObject(s.g), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
  const k = perPlace[giver.at] = (perPlace[giver.at] || 0) + 1, a = (s.facing || 0) + Math.PI / 2 + (k - 1) * .55;
  const r = Math.max(size.x, size.z) * .5 + 3; // just outside the building, in front of its door side
  const p = figure(T, LOOK[id] || LOOK.neighbour, SKIN[i % SKIN.length]); p.name = 'townsfolk-' + id;
  p.position.set(c.x + Math.sin(a) * r, box.min.y, c.z + Math.cos(a) * r); p.rotation.y = a; p.scale.setScalar(1.25);
  p.userData.giver = id; town.scene.add(p); s.g.parent.attach(p); people.push(p); // lives on the hex, so it hides with the board
 });
 if (!people.length) return null;
 town.townsfolk = people; // the town's own tap handler leaves these to us

 // the bubble and the waiting marks (presentation: drawn for the player, invisible to every perception)
 const css = document.createElement('style'); css.textContent = `
.tf-bubble{position:fixed;z-index:30;max-width:260px;transform:translate(-50%,calc(-100% - 18px));padding:11px 13px;border-radius:16px;background:rgba(255,255,255,.9);
 box-shadow:0 10px 30px rgba(40,30,20,.22),inset 0 1px 0 rgba(255,255,255,.9);font:500 14px/1.4 system-ui,sans-serif;color:#2a2622;display:flex;flex-direction:column;gap:8px}
.tf-bubble::after{content:"";position:absolute;left:50%;bottom:-6px;width:12px;height:12px;background:inherit;transform:translateX(-50%) rotate(45deg)}
.tf-bubble b{font:600 11px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#c8502c}
.tf-bubble .row{display:flex;gap:8px}.tf-bubble button{all:unset;cursor:pointer;padding:6px 12px;border-radius:999px;font:600 13px system-ui,sans-serif;background:#2a2622;color:#fff}
.tf-bubble button.no{background:rgba(42,38,34,.08);color:#2a2622}
.tf-mark{position:fixed;z-index:29;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c8,#f2b63a);box-shadow:0 2px 6px rgba(0,0,0,.25);pointer-events:none;animation:tfb 1.6s ease-in-out infinite}
@keyframes tfb{50%{transform:translateY(-4px)}}`;
 document.head.append(css);
 const marks = people.map(() => { const d = document.createElement('div'); d.className = 'tf-mark'; d.hidden = true; document.body.append(d); return d; });
 const bubble = document.createElement('div'); bubble.className = 'tf-bubble'; bubble.hidden = true; document.body.append(bubble);
 let talking = null, shutAt = 0;
 const say = (p, html, ms = 0) => { talking = p; bubble.innerHTML = html; bubble.hidden = false; shutAt = ms ? performance.now() + ms : 0; };
 const hush = () => { talking = null; bubble.hidden = true; };
 const v = new T.Vector3(), toScreen = (p, up) => { p.getWorldPosition(v); v.y += up; v.project(camera); const r = canvas.getBoundingClientRect();
  return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 ? [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] : null; };

 function talk(p) {
  const id = p.userData.giver, giver = GIVERS[id]; report({did: 'visit', at: giver.at}); // reaching them counts as visiting their place
  const q = offer(id);
  if (!q) return say(p, `<b>${giver.name}</b>Thank you for all your help today!`, 3500);
  say(p, `<b>${giver.name}</b>${q.ask}<div class="row"><button class="yes">I'll help</button><button class="no">Not now</button></div>`);
  bubble.querySelector('.yes').onclick = () => { accept(q.id); say(p, `<b>${giver.name}</b>Thank you! It's in your notebook.`, 3000); };
  bubble.querySelector('.no').onclick = () => { decline(id); hush(); };
 }

 // a tap (not a drag) on a person
 const ray = new T.Raycaster(), ndc = new T.Vector2(); let down = null;
 canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
 canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(people.filter(shown), true)[0]; if (!hit) { if (talking && !shutAt) hush(); return; }
  let o = hit.object; while (o && !o.userData.giver) o = o.parent; if (o) talk(o);
 });

 // visits: the camera settled close over a quest place
 const places = Object.keys(SPOT).map(at => ({at, s: spotOf(at)})).filter(x => x.s).map(x => ({at: x.at, c: new T.Box3().setFromObject(x.s.g).getCenter(new T.Vector3())}));
 let here = null;
 (function frame() {
  requestAnimationFrame(frame);
  const near = controls && camera.position.distanceTo(controls.target) < 260;
  const pl = near && places.find(x => Math.hypot(x.c.x - controls.target.x, x.c.z - controls.target.z) < 45);
  if ((pl?.at || null) !== here) { here = pl?.at || null; if (here) report({did: 'visit', at: here}); }
  people.forEach((p, i) => { const s = shown(p) && camera.position.distanceTo(p.getWorldPosition(v)) < 900 && offerWaiting(p.userData.giver) && p !== talking ? toScreen(p, 6) : null;
   marks[i].hidden = !s; if (s) { marks[i].style.left = s[0] + 'px'; marks[i].style.top = s[1] + 'px'; } });
  if (talking) { const s = toScreen(talking, 5.5); if (!s || (shutAt && performance.now() > shutAt)) hush(); else { bubble.style.left = s[0] + 'px'; bubble.style.top = s[1] + 'px'; } }
 })();
 return {people, talk};
}

const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
// this person still has an ask she hasn't taken, and isn't waiting on her for one she has (peeks at the engine's stored state)
function offerWaiting(id) {
 let taken = {}; try { taken = JSON.parse(localStorage.getItem('aw-quests') || '{}').taken || {}; } catch {}
 const mine = TEMPLATES.filter(t => t.giver === id);
 return !mine.some(t => taken[t.id] && !taken[t.id].doneAt) && mine.some(t => !taken[t.id]);
}
