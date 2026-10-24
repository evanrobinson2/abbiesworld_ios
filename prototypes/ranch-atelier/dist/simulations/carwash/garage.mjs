// The buggy's place on the left bar, and the garage where she tricks it out (AW-STUDY-0059).
//   mountGarage(AT, carwash)   once the buggy is hers a little live buggy joins the left bar (backpack, notebook, buggy). Tap it
//                              and she hops on, at the road nearest the camera. The brush orb opens the garage.
// The garage dresses the buggy like the backpack and the FPS gunsmith do (Evan: no cards): a small glass bead on each of the five
// toy mounts and one for the colour theme, riding on the turning buggy; tap one and a short strip of choices opens beside it, tap a
// choice and it goes on at once, on the turntable and on the buggy you are driving. Presentation layer: summoned, dismissable.
import * as T from 'three';
import {THEMES, ANIMALS, SLOTS, buildMoonBuggy, buildAnimal, look, setLook, setSlot, earned} from './buggy.mjs';
import {loadout} from '../loadout.mjs';

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
 .aw-garage{position:fixed;left:50%;bottom:max(8px,env(safe-area-inset-bottom));transform:translate(-50%,0);width:min(100vw - 16px,560px);z-index:60;border-radius:34px;padding:12px 12px 10px;color:#2a1a3a;
  background:linear-gradient(165deg,#ffffffc8 0%,#ffffff62 40%,#ffffff40 62%,#ffffff88 100%);border:1px solid #ffffffe0;backdrop-filter:blur(14px) saturate(1.5);-webkit-backdrop-filter:blur(14px) saturate(1.5);
  box-shadow:inset 0 1.5px 0 #fff,inset 0 -12px 22px -12px #ffffffa0,0 24px 44px -14px #0c203080;animation:awgarage .45s cubic-bezier(.2,1.3,.4,1)}
 @keyframes awgarage{from{transform:translate(-50%,60px);opacity:0}}
 .aw-garage .top{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
 .aw-garage canvas.view{width:100%;height:300px;border-radius:24px;touch-action:none;background:radial-gradient(ellipse at 50% 80%,#ffffff70,#ffffff00 70%)}
 .aw-garage .orbs{display:flex;flex-direction:column;gap:7px}
 .aw-garage .orb{width:42px;height:42px;border-radius:50%;border:0;font-size:20px;cursor:pointer;color:#fff;background:radial-gradient(circle at 32% 26%,#ffffffcc,#ffffff30 55%,#2a103055);box-shadow:0 5px 12px #2a103044,inset 0 1px 3px #fff}
 .aw-garage .orb.on{box-shadow:0 0 14px #f2b632,inset 0 1px 3px #fff}
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

 // ----- the garage: the buggy turns on a glass shelf with a small bead on each mount (FPS-loadout style, no cards). Tap a bead
 // (or the part), a short strip of choices opens beside it; tap one and it goes on at once.
 function closeGarage() { if (!garage) return; garage.dispose(); garage = null; const d = window.__effectHunt?.driver; if (d) d.frozen = false; }
 async function openGarage() {
  if (garage) return; const root = document.createElement('div'); root.className = 'aw-garage'; root.dataset.ui = ''; document.body.append(root);
  root.innerHTML = `<div class="top"><canvas class="view" aria-label="Your Moon Buggy"></canvas><div class="orbs"><button class="orb" data-x="drive" aria-label="Drive">🚙</button><button class="orb" data-x="close" aria-label="Close">✕</button></div></div>`;
  const driving = !!window.__effectHunt; if (driving) window.__effectHunt.driver.frozen = true;
  const canvas = root.querySelector('canvas.view'), renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true}); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 2, .1, 60); scene.add(new T.HemisphereLight('#fff6e6', '#6f5a7a', 1.5)); const key = new T.DirectionalLight('#fff1d6', 2.6); key.position.set(3, 5, 4); scene.add(key); const rim = new T.DirectionalLight('#bfe3ff', 1.2); rim.position.set(-3, 1, -3); scene.add(rim);
  const floor = new T.Mesh(new T.CircleGeometry(2.6, 28), new T.MeshBasicMaterial({color: '#000', transparent: true, opacity: .14})); floor.rotation.x = -Math.PI / 2; floor.position.y = .01; scene.add(floor);
  let api = null, yaw = .8, drag = null, selected = null, raf = 0; const ring = new T.Mesh(new T.TorusGeometry(.2, .025, 6, 20), new T.MeshBasicMaterial({color: '#ffd34d'})); ring.visible = false;
  const rebuild = () => { if (api) { scene.remove(api.group); api.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); } const l = look(); api = buildMoonBuggy({theme: l.theme, slots: l.slots, withRider: true}); scene.add(api.group); api.parts.chassis.add(ring); };
  rebuild();
  const size = () => { const w = canvas.clientWidth || 400, h = canvas.clientHeight || 300; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); cam.position.set(0, 3.2, 6.6); cam.lookAt(0, .85, 0); }; size();
  // loadout beads: one per toy mount and one for the colour theme, each riding on its own empty socket
  const host = Object.assign(document.createElement('div'), {className: 'aw-lo-host'}); Object.assign(host.style, {position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 65}); document.body.append(host);
  const v3 = new T.Vector3(), socketOf = id => id === 'theme' ? api.parts.themeSocket : api.parts.sockets[SLOTS.findIndex(s => s.id === id)];
  const slotsFn = () => { const l = look(); return [...SLOTS.map(s => ({id: s.id, name: s.name, options: [{id: '', name: 'Nothing', icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="#6a5a7a" stroke-width="3" stroke-linecap="round"/></svg>'}, ...ANIMALS.map(a => ({id: a.id, name: a.name, icon: animalArt(a.id)}))]})), {id: 'theme', name: 'Colours', options: THEMES.map(t => ({id: t.id, name: t.name, swatch: `linear-gradient(135deg,${t.swatch[0]} 0 45%,${t.swatch[1]} 45% 75%,${t.swatch[2]} 75%)`}))}]; };
  const lo = loadout(host, {
   slots: slotsFn, value: id => { const l = look(); return id === 'theme' ? l.theme : (l.slots[SLOTS.findIndex(s => s.id === id)] || ''); },
   anchor: id => { const so = socketOf(id); if (!so) return null; so.getWorldPosition(v3); const wz = v3.clone(); v3.project(cam); const r = canvas.getBoundingClientRect(); return {x: r.left + (v3.x + 1) / 2 * r.width, y: r.top + (1 - v3.y) / 2 * r.height, back: wz.z < -.2}; },
   avoid: () => { const r = canvas.getBoundingClientRect(); return {left: r.left + r.width * .2, right: r.right - r.width * .2, top: r.top, bottom: r.bottom}; },
   onSelect: id => { selected = id; const so = id && id !== 'theme' ? socketOf(id) : null; ring.visible = !!so; if (so) ring.position.copy(so.position); },
   onPick: (id, opt) => { if (id === 'theme') setLook({theme: opt}); else setSlot(SLOTS.findIndex(s => s.id === id), opt || null); rebuild(); drivingApi()?.setSlots(look().slots); drivingApi()?.setTheme(look().theme); drawBtn(); lo.refresh(); }
  });
  const fake = {x: 0, z: 0, heading: 0, steer: 0, speed: 0, air: false, squash: 0, roll: 0}, flat = {heightAt: () => 0}; let t0 = performance.now();
  const frame = now => { raf = requestAnimationFrame(frame); const dt = Math.min(.05, (now - t0) / 1000); t0 = now; if (!selected && !drag) yaw += dt * .45; api.group.rotation.y = yaw; ring.rotation.x = Math.PI / 2; ring.scale.setScalar(1 + Math.sin(now / 250) * .08); fake.speed = Math.sin(now / 900) * 2; api.update(dt, fake, flat, 1); api.wheels.forEach(w => { w.rotation.x += dt * 2; }); renderer.render(scene, cam); };
  raf = requestAnimationFrame(frame);
  canvas.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: yaw, id: e.pointerId}; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) yaw = drag.y + (e.clientX - drag.x) * .012; }); canvas.addEventListener('pointerup', () => { drag = null; }); canvas.addEventListener('pointercancel', () => { drag = null; });
  root.querySelector('[data-x=close]').onclick = () => closeGarage();
  root.querySelector('[data-x=drive]').onclick = () => { closeGarage(); hopOn(); }; if (driving) root.querySelector('[data-x=drive]').style.display = 'none';
  garage = {root, dispose() { cancelAnimationFrame(raf); lo.dispose(); host.remove(); renderer.dispose(); renderer.forceContextLoss?.(); root.remove(); }};
 }
 return {hopOn, hopOff, openGarage, closeGarage, drawBtn, get open() { return !!garage; }, get driving() { return !!hopped; }};
}
