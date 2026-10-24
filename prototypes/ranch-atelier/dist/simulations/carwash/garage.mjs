// The buggy's place on the left bar, and the garage where she tricks it out (AW-STUDY-0059).
//   mountGarage(AT, carwash)   once the buggy is hers a little live buggy joins the left bar (backpack, notebook, buggy). Tap it
//                              and she hops on, at the road nearest the camera. The brush orb opens the garage.
// The garage is a card game, the same stock and gestures as dressing the backpack: five slots for toy animals, a hand of animal
// cards, and a hand of colour-theme cards (Cards v3 "print" faces, each window showing the real buggy wearing that choice). Tap a
// card or drag it onto the buggy; the five slots are small round windows showing what is on each mount. Everything redraws live
// on a turntable buggy, and on the buggy you are driving. Presentation layer: summoned, dismissable, no words but the card names.
import * as T from 'three';
import {THEMES, ANIMALS, SLOTS, buildMoonBuggy, buildAnimal, look, setLook, setSlot, earned, themeOf} from './buggy.mjs';
import {renderFace} from '../../cards/v3/face.mjs?v=2';

// ---------- little pictures of the real models, drawn once on a shared hidden renderer
let off = null; const arts = new Map();
function snap(build, key, {w = 300, h = 340, yaw = .7, pitch = .32, fit = 1.0} = {}) {
 if (arts.has(key)) return arts.get(key);
 off ??= new T.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true}); off.outputColorSpace = T.SRGBColorSpace; off.setSize(w, h, false); off.setPixelRatio(1);
 const scene = new T.Scene(), cam = new T.PerspectiveCamera(28, w / h, .05, 80); scene.add(new T.HemisphereLight('#fff6e6', '#6f5a7a', 1.5)); const key1 = new T.DirectionalLight('#fff1d6', 2.6); key1.position.set(2, 4, 3); scene.add(key1); const rim = new T.DirectionalLight('#bfe3ff', 1.2); rim.position.set(-3, 1, -3); scene.add(rim);
 const obj = build(); scene.add(obj); obj.rotation.y = yaw; const bb = new T.Box3().setFromObject(obj), c = bb.getCenter(new T.Vector3()), sz = bb.getSize(new T.Vector3()), d = Math.max(sz.x, sz.y * 1.1, sz.z) * fit / (2 * Math.tan(14 * Math.PI / 180)) * 1.25;
 cam.position.set(c.x, c.y + Math.sin(pitch) * d, c.z + Math.cos(pitch) * d); cam.lookAt(c); off.render(scene, cam);
 const out = Object.assign(document.createElement('canvas'), {width: w, height: h}); out.getContext('2d').drawImage(off.domElement, 0, 0); const url = out.toDataURL();
 obj.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); arts.set(key, url); return url;
}
const animalArt = id => snap(() => buildAnimal(id), 'a:' + id, {w: 240, h: 260, yaw: .5, pitch: .22, fit: .9});
const themeArt = id => snap(() => buildMoonBuggy({theme: id, withRider: false, slots: []}).group, 't:' + id, {w: 340, h: 300, yaw: .75, pitch: .3, fit: 1.0});
const buggyArt = (l, w = 160, h = 130) => snap(() => buildMoonBuggy({theme: l.theme, slots: l.slots, withRider: false}).group, 'b:' + JSON.stringify(l) + w, {w, h, yaw: .75, pitch: .3});
const tint = (hex, t) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, m = v => Math.round(v + (243 - v) * t).toString(16).padStart(2, '0'); return '#' + m(r) + m(g) + m(b); };
const faces = new Map();
const face = (key, name, art, colour, n) => faces.get(key) || (faces.set(key, renderFace({id: 'buggy', name, art, edition: n, palette: {air: tint(colour, .62), grass: colour, earth: colour, body: colour}}, {style: 'print', dpi: 150}).then(r => r.canvas)), faces.get(key));
const copy = cv => { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); return c; };

// ---------- the left bar button
function leftBar() { let bar = document.getElementById('aw-left-bar'); if (!bar) { bar = Object.assign(document.createElement('nav'), {id: 'aw-left-bar', className: 'aw-left-bar'}); bar.setAttribute('aria-label', 'What Abbie can touch'); document.body.append(bar); } return bar; }
function css() {
 if (document.getElementById('aw-garage-css')) return; const s = document.createElement('style'); s.id = 'aw-garage-css';
 s.textContent = `
 .aw-left-buggy{position:relative;width:64px;height:56px;padding:0;border:0;background:none;cursor:pointer;display:grid;place-items:center;transition:transform .18s;filter:drop-shadow(0 6px 6px #2a103040)}
 .aw-left-buggy img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}
 .aw-left-buggy:hover{transform:translateY(-2px) scale(1.06)}.aw-left-buggy:active{transform:scale(.94)}
 .aw-left-buggy.pop{animation:awbuggypop .9s cubic-bezier(.2,1.5,.4,1)}@keyframes awbuggypop{0%{transform:scale(0) rotate(-20deg)}60%{transform:scale(1.35) rotate(6deg)}100%{transform:scale(1)}}
 .aw-left-buggy .brush{position:absolute;right:-6px;bottom:-4px;width:24px;height:24px;border-radius:50%;border:0;font-size:13px;line-height:24px;padding:0;cursor:pointer;color:#fff;background:radial-gradient(circle at 32% 26%,#ffffffcc,#ffffff30 55%,#2a103060);box-shadow:0 3px 8px #2a103055,inset 0 1px 2px #fff}
 .aw-garage{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translate(-50%,0);width:min(100vw - 16px,600px);z-index:60;border-radius:34px;padding:12px 12px 10px;color:#2a1a3a;
  background:linear-gradient(165deg,#ffffffc8 0%,#ffffff62 40%,#ffffff40 62%,#ffffff88 100%);border:1px solid #ffffffe0;backdrop-filter:blur(14px) saturate(1.5);-webkit-backdrop-filter:blur(14px) saturate(1.5);
  box-shadow:inset 0 1.5px 0 #fff,inset 0 -12px 22px -12px #ffffffa0,0 24px 44px -14px #0c203080;animation:awgarage .45s cubic-bezier(.2,1.3,.4,1)}
 @keyframes awgarage{from{transform:translate(-50%,60px);opacity:0}}
 .aw-garage .top{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
 .aw-garage canvas.view{width:100%;height:190px;border-radius:24px;touch-action:none;background:radial-gradient(ellipse at 50% 80%,#ffffff70,#ffffff00 70%)}
 .aw-garage .slots{display:flex;gap:7px;justify-content:center;margin:2px 0 6px}
 .aw-garage .slot{width:46px;height:46px;border-radius:50%;border:2.5px dashed #ffffffb0;background:radial-gradient(circle at 32% 26%,#ffffffa0,#ffffff30 60%,#2a103018);padding:0;cursor:pointer;display:grid;place-items:center;overflow:hidden;transition:transform .15s}
 .aw-garage .slot img{width:100%;height:100%;object-fit:cover}.aw-garage .slot.on{border:2.5px solid #f2b632;box-shadow:0 0 0 3px #f2b63255;transform:scale(1.1)}.aw-garage .slot.over{transform:scale(1.25);border-color:#ff7eb6}
 .aw-garage .orbs{display:flex;flex-direction:column;gap:7px}
 .aw-garage .orb{width:42px;height:42px;border-radius:50%;border:0;font-size:20px;cursor:pointer;color:#fff;background:radial-gradient(circle at 32% 26%,#ffffffcc,#ffffff30 55%,#2a103055);box-shadow:0 5px 12px #2a103044,inset 0 1px 3px #fff}
 .aw-garage .orb.on{box-shadow:0 0 14px #f2b632,inset 0 1px 3px #fff}
 .aw-garage .hand{display:flex;overflow-x:auto;padding:14px 8px 4px;scrollbar-width:none;touch-action:pan-x}.aw-garage .hand::-webkit-scrollbar{display:none}
 .aw-garage .card{flex:none;width:72px;aspect-ratio:63/88;margin-left:-12px;padding:0;border:0;border-radius:6px;background:#f3eee2;cursor:grab;touch-action:none;transform:rotate(calc((var(--i) - 2) * .6deg));box-shadow:0 8px 16px -8px #2a103088,0 1px 3px #0003;transition:transform .18s}
 .aw-garage .card:first-child{margin-left:0}.aw-garage .card canvas{width:100%;height:100%;display:block;border-radius:6px}
 .aw-garage .card:hover{transform:translateY(-9px);z-index:2}.aw-garage .card.on{transform:translateY(-8px);box-shadow:0 0 0 2.5px #f2b632,0 10px 18px -8px #2a103088}
 .aw-garage .none{flex:none;width:72px;aspect-ratio:63/88;margin-left:-12px;border-radius:6px;border:2px dashed #2a1a3a55;background:#ffffff40;font-size:22px;cursor:pointer;display:grid;place-items:center;padding:0}
 .aw-gghost{position:fixed;left:0;top:0;z-index:90;pointer-events:none;border-radius:6px;overflow:hidden;box-shadow:0 22px 34px -12px #2a1030aa}.aw-gghost canvas{width:100%;height:100%;display:block}
 .aw-hunt-brush{width:clamp(38px,9vw,46px);aspect-ratio:1;border-radius:50%;border:0;font-size:clamp(18px,4.5vw,22px);color:#fff;cursor:pointer;pointer-events:auto;background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.6),rgba(255,255,255,.1) 55%,rgba(20,10,40,.4));box-shadow:0 8px 18px rgba(20,10,40,.4),inset 0 1px 3px rgba(255,255,255,.75)}
 @media(prefers-reduced-motion:reduce){.aw-garage{animation:none}.aw-left-buggy.pop{animation:none}}`;
 document.head.append(s);
}

export function mountGarage(AT, carwash) {
 css();
 let btn = null, garage = null, hopped = null;
 const drivingApi = () => window.__effectHunt?.vehicleRoot?.children?.[0]?.userData?.buggy;

 // ----- hop on: the buggy drives out from the road nearest where the camera is looking
 function nearestRoad() {
  const {board, stage} = AT, tg = stage.controls.target, bx = tg.x - stage.dioGroup.position.x, by = -(tg.z - stage.dioGroup.position.z);
  const s = (board.roadSpawns?.(14) || []).sort((a, b) => Math.hypot(a.x - bx, a.y - by) - Math.hypot(b.x - bx, b.y - by))[0]; if (!s) return null;
  return {x: s.x, z: -s.y, heading: Math.atan2(Math.cos(s.heading), -Math.sin(s.heading))};
 }
 async function hopOn() {
  if (window.__effectHunt || hopped) return; hopped = 'loading'; closeGarage();
  try { const m = await import('../effect-hunt/town-mount.mjs'); hopped = m.mountHunt({stage: AT.stage, mode: 'buggy', start: nearestRoad(), kart: false, onExit: hopOff}); addBrush(); }
  catch (e) { console.warn('garage: could not hop on', e); hopped = null; }
 }
 function hopOff() { const h = hopped; hopped = null; closeGarage(); if (h && h !== 'loading') h.dispose(); document.querySelectorAll('.aw-hunt-brush').forEach(b => b.remove()); }
 // while driving, a brush orb beside the other round buttons opens the garage (the driver waits, parked)
 function addBrush() {
  setTimeout(() => { const grp = document.querySelector('.hunt-top .group'); if (!grp || grp.querySelector('.aw-hunt-brush')) return; const b = Object.assign(document.createElement('button'), {className: 'aw-hunt-brush', textContent: '🎨'}); b.dataset.ui = ''; b.setAttribute('aria-label', 'Trick out the buggy'); b.onclick = e => { e.stopPropagation(); garage ? closeGarage() : openGarage(); }; grp.append(b); }, 80);
 }

 // ----- the bar button: a picture of her buggy as she has it, a brush orb to dress it
 function drawBtn(pop = false) {
  if (!earned()) return; const bar = leftBar();
  if (!btn?.isConnected) {
   btn = Object.assign(document.createElement('div'), {className: 'aw-left-buggy', tabIndex: 0}); btn.setAttribute('role', 'button'); btn.setAttribute('aria-label', 'My Moon Buggy'); btn.title = 'My Moon Buggy';
   btn.innerHTML = '<img alt=""><button type="button" class="brush" aria-label="Trick out the buggy">🎨</button>';
   btn.onclick = e => { if (e.target.closest('.brush')) { e.stopPropagation(); garage ? closeGarage() : openGarage(); } else hopOn(); };
   bar.append(btn);
  }
  btn.querySelector('img').src = buggyArt(look(), 192, 156);
  if (pop) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
 }
 const keepLast = () => { const bar = document.getElementById('aw-left-bar'); if (bar && btn?.isConnected && bar.lastElementChild !== btn) bar.append(btn); };
 addEventListener('aw-buggy-earned', () => { drawBtn(true); setTimeout(keepLast, 1500); });
 addEventListener('aw-buggy-change', () => { arts.forEach((v, k) => { if (k.startsWith('b:')) arts.delete(k); }); drawBtn(); });
 if (earned()) { drawBtn(); setTimeout(keepLast, 1500); setTimeout(keepLast, 4000); }

 // ----- the garage
 function closeGarage() { if (!garage) return; garage.dispose(); garage = null; const d = window.__effectHunt?.driver; if (d) d.frozen = false; }
 async function openGarage() {
  if (garage) return; const l0 = look(), root = document.createElement('div'); root.className = 'aw-garage'; root.dataset.ui = ''; document.body.append(root);
  root.innerHTML = `<div class="top"><canvas class="view" aria-label="Your Moon Buggy"></canvas><div class="orbs"><button class="orb" data-h="animals" aria-label="Toy animals">🐰</button><button class="orb" data-h="themes" aria-label="Colour themes">🎨</button><button class="orb" data-x="drive" aria-label="Drive">🚙</button><button class="orb" data-x="close" aria-label="Close">✕</button></div></div><div class="slots"></div><div class="hand" role="listbox"></div>`;
  const driving = !!window.__effectHunt; if (driving) window.__effectHunt.driver.frozen = true; else root.querySelector('[data-x=drive]').style.display = '';
  // live turntable
  const canvas = root.querySelector('canvas.view'), renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true}); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 2, .1, 60); scene.add(new T.HemisphereLight('#fff6e6', '#6f5a7a', 1.5)); const key = new T.DirectionalLight('#fff1d6', 2.6); key.position.set(3, 5, 4); scene.add(key); const rim = new T.DirectionalLight('#bfe3ff', 1.2); rim.position.set(-3, 1, -3); scene.add(rim);
  const floor = new T.Mesh(new T.CircleGeometry(2.6, 28), new T.MeshBasicMaterial({color: '#000', transparent: true, opacity: .14})); floor.rotation.x = -Math.PI / 2; floor.position.y = .01; scene.add(floor);
  let api = null, yaw = .8, drag = null, spin = true, raf = 0;
  const rebuild = () => { if (api) { scene.remove(api.group); api.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); } const l = look(); api = buildMoonBuggy({theme: l.theme, slots: l.slots, withRider: true}); scene.add(api.group); };
  rebuild();
  const size = () => { const w = canvas.clientWidth || 400, h = canvas.clientHeight || 190; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); cam.position.set(0, 3.4, 6.2); cam.lookAt(0, .75, 0); }; size();
  const fake = {x: 0, z: 0, heading: 0, steer: 0, speed: 0, air: false, squash: 0, roll: 0}, flat = {heightAt: () => 0}; let t0 = performance.now();
  const frame = now => { raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - t0) / 1000); t0 = now; if (spin && !drag) yaw += dt * .45; api.group.rotation.y = yaw; fake.speed = Math.sin(now / 900) * 2; api.update(dt, fake, flat, 1); api.wheels.forEach(w => { w.rotation.x += dt * 2; }); renderer.render(scene, cam); };
  raf = requestAnimationFrame(frame);
  canvas.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: yaw, id: e.pointerId}; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) yaw = drag.y + (e.clientX - drag.x) * .012; }); canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
  // slots and hands
  let slot = 0, hand = 'animals'; const slotsEl = root.querySelector('.slots'), handEl = root.querySelector('.hand'), slotBtns = [];
  SLOTS.forEach((s, i) => { const b = document.createElement('button'); b.className = 'slot'; b.setAttribute('aria-label', s.name); b.onclick = () => { slot = i; hand = 'animals'; draw(); }; slotsEl.append(b); slotBtns.push(b); });
  const apply = () => { rebuild(); drivingApi()?.setSlots(look().slots); drivingApi()?.setTheme(look().theme); drawBtn(); };
  function land(kind, value, i) { if (kind === 'animal') setSlot(i ?? slot, value); else setLook({theme: value}); apply(); draw(); }
  async function draw() {
   const l = look(); root.querySelectorAll('.orb[data-h]').forEach(o => o.classList.toggle('on', o.dataset.h === hand));
   slotBtns.forEach((b, i) => { b.classList.toggle('on', i === slot && hand === 'animals'); b.innerHTML = l.slots[i] ? `<img alt="" src="${animalArt(l.slots[i])}">` : '<span style="opacity:.55;font-size:17px">＋</span>'; });
   handEl.innerHTML = ''; const gen = draw.gen = (draw.gen || 0) + 1;
   const cards = hand === 'animals' ? ANIMALS.map((a, i) => ({kind: 'animal', value: a.id, name: a.name, art: animalArt(a.id), colour: a.body, on: l.slots[slot] === a.id, i})) : THEMES.map((t, i) => ({kind: 'theme', value: t.id, name: t.name, art: themeArt(t.id), colour: Array.isArray(t.trim) ? t.accent : t.body, on: l.theme === t.id, i}));
   if (hand === 'animals' && l.slots[slot]) { const n = document.createElement('button'); n.className = 'none'; n.textContent = '✕'; n.setAttribute('aria-label', 'Take it off'); n.onclick = () => land('animal', null); handEl.append(n); }
   for (const cd of cards) {
    const b = document.createElement('button'); b.className = 'card' + (cd.on ? ' on' : ''); b.style.setProperty('--i', cd.i); b.setAttribute('aria-label', cd.name); handEl.append(b); wire(b, cd);
    face(cd.kind + ':' + cd.value, cd.name, cd.art, cd.colour, cd.i + 1).then(cv => { if (gen === draw.gen) b.append(copy(cv)); });
   }
   handEl.animate?.([{transform: 'translateY(30px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 280, easing: 'cubic-bezier(.2,1.3,.4,1)'});
  }
  // tap a card to put it on; lift it and drop it on the buggy, or on a slot, to put it there
  function wire(b, cd) {
   let st = null, ghost = null;
   b.addEventListener('pointerdown', e => { st = {x: e.clientX, y: e.clientY, id: e.pointerId}; });
   b.addEventListener('pointermove', e => {
    if (!st || e.pointerId !== st.id) return;
    if (!ghost && Math.abs(e.clientY - st.y) > 10 && Math.abs(e.clientY - st.y) > Math.abs(e.clientX - st.x)) { b.setPointerCapture?.(e.pointerId); const r = b.getBoundingClientRect(), cv = b.querySelector('canvas'); ghost = document.createElement('div'); ghost.className = 'aw-gghost'; if (cv) ghost.append(copy(cv)); Object.assign(ghost.style, {width: r.width + 'px', height: r.height + 'px'}); ghost._dx = st.x - r.left; ghost._dy = st.y - r.top; document.body.append(ghost); b.style.opacity = .3; }
    if (ghost) { e.preventDefault(); ghost.style.transform = `translate(${e.clientX - ghost._dx}px,${e.clientY - ghost._dy}px) scale(1.12)`; const over = slotAt(e.clientX, e.clientY); slotBtns.forEach((s, i) => s.classList.toggle('over', i === over)); }
   });
   const slotAt = (x, y) => slotBtns.findIndex(s => { const r = s.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
   const end = e => { if (!st) return; const s0 = st; st = null; b.style.opacity = ''; slotBtns.forEach(s => s.classList.remove('over'));
    if (!ghost) { if (e.type === 'pointerup' && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) < 10) land(cd.kind, cd.value); return; }
    const g = ghost; ghost = null; const vr = canvas.getBoundingClientRect(), onView = e.clientX >= vr.left && e.clientX <= vr.right && e.clientY >= vr.top && e.clientY <= vr.bottom, sl = slotAt(e.clientX, e.clientY);
    const ok = e.type === 'pointerup' && (sl >= 0 || onView); g.animate(ok ? [{opacity: 1}, {transform: g.style.transform.replace(/scale\([^)]*\)/, 'scale(.15)'), opacity: 0}] : [{opacity: 1}, {opacity: 0}], {duration: 260, fill: 'forwards'}).onfinish = () => g.remove();
    if (ok) land(cd.kind, cd.value, sl >= 0 ? sl : undefined); };
   b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', e => { if (ghost) end({type: 'pointercancel', clientX: e.clientX, clientY: e.clientY}); });
  }
  root.querySelectorAll('.orb[data-h]').forEach(o => o.onclick = () => { hand = o.dataset.h; draw(); });
  root.querySelector('[data-x=close]').onclick = () => closeGarage();
  root.querySelector('[data-x=drive]').onclick = () => { closeGarage(); hopOn(); }; if (driving) root.querySelector('[data-x=drive]').style.display = 'none';
  draw();
  garage = {root, dispose() { cancelAnimationFrame(raf); renderer.dispose(); renderer.forceContextLoss?.(); root.remove(); document.querySelectorAll('.aw-gghost').forEach(g => g.remove()); }};
 }
 return {hopOn, hopOff, openGarage, closeGarage, drawBtn, get open() { return !!garage; }, get driving() { return !!hopped; }};
}
