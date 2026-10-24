// Halloween mode in the real Winchester board (Evan, 2026-10-24 01:09Z: "add a halloween mode ... the world needs you to be
// able to interact with it"). Drafted behind an experimental flag; the rules are in rules.mjs, the sound in sound.mjs.
//   mountHalloween(window.AbbieTown, window.__town)      once the board and its stage exist (one line in abbietown.template.html)
// What it does when the mode is on:
//   light     dusk purples and warm amber on the town's own look (town.lookFilter, read by dioFrame), no fog layer over the world
//   world     jack-o'-lanterns glow on the porches, low drifting mist on the lawns, bats circling over each hex, a wheelbarrow of pumpkins
//   people    the townsfolk put on costumes, and little trick-or-treaters queue at the lit doors
//   play      tap a lit porch: knock, the door creaks, a costumed neighbour hands you a treat that drops into the backpack;
//             five doors in one night hang the pumpkin charm. A door gives one treat a night.
// Layers: everything drawn in the scene is in-fiction (so the town's people can see it). The speech bubble is the presentation layer.
// Tone: PG, cute, never scary. Tour: no (a seasonal event; it joins the tour when it leaves the experiment).
import {mode, nextStored, nightKey, pickDoors, knock, answered, freshNight, grade, CHARM_AT} from './rules.mjs?v=1';
import * as sound from './sound.mjs?v=1';

const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} return null; };
const COSTUMES = ['witch', 'ghost', 'pumpkin', 'cat', 'skeleton', 'astronaut'];
const BODY = {witch: '#6b3fa0', ghost: '#f4f1ff', pumpkin: '#e8791c', cat: '#2b2b34', skeleton: '#2b2b34', astronaut: '#eef1f6'};
const SKIN = ['#f1c9a5', '#c68a5e', '#8d5a3b', '#e8b48f', '#a86f4a'];

export function mountHalloween(town, ctx = {}) {
  const T = ctx.THREE, stage = town?.stage, camera = ctx.camera || stage?.camera, canvas = ctx.canvas || stage?.renderer?.domElement;
  const stored = {experimental: LS('aw-experimental') || '', halloween: LS('aw-halloween') || ''};
  const next = nextStored(location.search, stored);
  LS('aw-experimental', next.experimental || null); LS('aw-halloween', next.halloween || null);
  const m = mode({search: location.search, stored: next});
  const api = town.halloween = {on: false, why: m.why, doors: [], set(v) { LS('aw-halloween', v === 'auto' ? null : v); location.reload(); }}; // the developer toggle: set('on' | 'off' | 'auto')
  window.AbbieHalloween = api;
  if (!m.on || !T || !stage?.tiles || !camera || !canvas) return api;
  api.on = true;

  // ---------- the light: the town's look, graded toward dusk (read by dioFrame every frame) ----------
  let hour = new Date().getHours() + new Date().getMinutes() / 60;
  addEventListener('aw-world-clock', e => { if (Number.isFinite(e.detail?.hour)) hour = e.detail.hour; });
  const ca = new T.Color(), cb = new T.Color(), hex = c => '#' + c.getHexString();
  const mix = (a, b, w) => hex(ca.set(a).lerp(cb.set(b), w));
  town.lookFilter = look => { const g = grade(hour);
    return {...look, bg: mix(look.bg, g.bg, g.w), sky: mix(look.sky, g.sky, g.w), gnd: mix(look.gnd, g.gnd, g.w), sun: mix(look.sun, g.sun, g.w),
      sunI: look.sunI + (g.sunI - look.sunI) * g.w, hemiI: look.hemiI + (g.hemiI - look.hemiI) * g.w}; };

  // ---------- shared looks ----------
  const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .8, flatShading: true, ...o});
  const M = {orange: mat('#f08a24', {emissive: '#c25a00', emissiveIntensity: .55}), stem: mat('#4f8a3e'), glow: mat('#ffe08a', {emissive: '#ffb02e', emissiveIntensity: 1.6}),
    dark: mat('#2b2b34'), white: mat('#f4f1ff'), black: mat('#1d1626'), purple: mat('#5a2f8a'), bone: mat('#f1eadb'), glass: mat('#8fd4ff', {roughness: .2, metalness: .3})};
  const G = {ico: new T.IcosahedronGeometry(1, 1), cone: new T.ConeGeometry(1, 1, 8), cyl: new T.CylinderGeometry(1, 1, 1, 8), box: new T.BoxGeometry(1, 1, 1), tri: new T.ConeGeometry(1, 1, 3)};
  const part = (g, geo, material, x, y, z, sx, sy, sz, name) => { const o = new T.Mesh(geo, material); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; if (name) o.name = name; g.add(o); return o; };
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; })();
  const sprite = (color, size, opacity, blending) => { const s = new T.Sprite(new T.SpriteMaterial({map: glowTex, color, transparent: true, opacity, depthWrite: false, blending})); s.scale.set(size, size, 1); return s; };

  // a jack-o'-lantern about 1.6 m across (chunky like the town), face on local +z
  const lantern = () => { const g = new T.Group(); g.name = 'jack-o-lantern';
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; part(g, G.ico, M.orange, Math.cos(a) * .22, .75, Math.sin(a) * .22, .62, .72, .62, 'pumpkin rib'); }
    part(g, G.cyl, M.stem, 0, 1.5, 0, .09, .3, .09, 'pumpkin stem');
    for (const s of [-1, 1]) { const e = part(g, G.tri, M.glow, s * .28, .95, .62, .16, .22, .08, 'pumpkin eye'); e.rotation.z = Math.PI; }
    part(g, G.box, M.glow, 0, .52, .62, .56, .12, .08, 'pumpkin smile'); part(g, G.box, M.glow, -.18, .42, .62, .1, .1, .08, 'pumpkin tooth');
    const halo = sprite('#ffb02e', 9, .55, T.AdditiveBlending); halo.position.y = .8; g.add(halo); g.userData.halo = halo; return g; };

  // a person in a costume, about 2.6 m tall at scale 1 (the townsfolk's size)
  const accessories = (g, costume, headY = 2.4) => {
    if (costume === 'witch') { part(g, G.cyl, M.purple, 0, headY + .38, 0, .75, .06, .75, 'witch brim'); part(g, G.cone, M.purple, 0, headY + .9, 0, .42, 1, .42, 'witch hat'); }
    else if (costume === 'ghost') { part(g, G.cone, M.white, 0, 1.4, 0, .95, 2.9, .95, 'ghost sheet').material = mat('#f4f1ff', {emissive: '#9aa0d0', emissiveIntensity: .25}); for (const s of [-1, 1]) part(g, G.ico, M.black, s * .17, headY + .02, .4, .07, .1, .05, 'ghost eye'); }
    else if (costume === 'pumpkin') { part(g, G.ico, M.orange, 0, headY + .05, 0, .6, .52, .6, 'pumpkin head'); part(g, G.cyl, M.stem, 0, headY + .6, 0, .06, .18, .06, 'pumpkin head stem'); for (const s of [-1, 1]) part(g, G.tri, M.glow, s * .2, headY + .1, .5, .1, .14, .05, 'pumpkin head eye').rotation.z = Math.PI; }
    else if (costume === 'cat') { for (const s of [-1, 1]) part(g, G.cone, M.dark, s * .27, headY + .5, 0, .16, .34, .16, 'cat ear'); const tail = part(g, G.cyl, M.dark, 0, .9, -.55, .07, .9, .07, 'cat tail'); tail.rotation.x = -.7; }
    else if (costume === 'skeleton') { for (let i = 0; i < 4; i++) part(g, G.box, M.bone, 0, 1.0 + i * .28, .58, .62 - i * .06, .07, .05, 'rib'); }
    else if (costume === 'astronaut') { part(g, G.ico, M.glass, 0, headY, 0, .6, .6, .6, 'helmet glass').material = mat('#8fd4ff', {transparent: true, opacity: .45, roughness: .15}); part(g, G.box, M.white, 0, 1.4, -.5, .7, 1.0, .3, 'oxygen pack'); }
  };
  const person = (costume, skin = SKIN[0]) => { const g = new T.Group(); g.name = 'trick-or-treater-' + costume;
    if (costume !== 'ghost') { part(g, G.cone, mat(BODY[costume] || '#d98a45'), 0, 1.15, 0, .62, 1.7, .62, 'coat'); part(g, G.cyl, M.dark, 0, .28, 0, .38, .55, .38, 'trousers'); }
    part(g, G.ico, mat(costume === 'skeleton' ? '#f1eadb' : skin), 0, 2.38, 0, .42, .42, .42, 'skin'); accessories(g, costume); return g; };

  // ---------- the doors: porches on each hex, chosen the same way every night ----------
  const tiles = Object.entries(stage.tiles), doors = [], residents = [], kids = [], bats = [], mists = [], hits = [];
  const perHex = new Map();
  tiles.forEach(([id, tile], hi) => { if (!tile.group) return;
    const picked = pickDoors(tile.houses || [], {seed: hi + 1}); perHex.set(id, picked);
    for (const d of picked) { const y = tile.hf(d.x, -d.z), g = lantern(); g.position.set(d.x, y, d.z); g.rotation.y = d.yaw; g.scale.setScalar(1.15); tile.group.add(g);
      const hit = new T.Mesh(new T.SphereGeometry(3.2, 8, 6), new T.MeshBasicMaterial({visible: false})); hit.position.set(d.x, y + 1.4, d.z); hit.userData.door = d; hit.name = 'door-hit'; tile.group.add(hit); hits.push(hit);
      doors.push({...d, hex: id, tile, y, lantern: g, hit, flare: 0}); } });
  api.doors = doors;

  // a wheelbarrow of pumpkins from the model library beside a few porches (library first)
  import('three/addons/loaders/GLTFLoader.js').then(({GLTFLoader}) => new GLTFLoader().loadAsync('/simulation-assets/generated/kit-wheelbarrow-with-pumpkins.glb')).then(gltf => {
    const box = new T.Box3().setFromObject(gltf.scene), size = box.getSize(new T.Vector3()), k = 2.4 / Math.max(size.x, size.z, .01);
    doors.filter((_, i) => i % 3 === 0).forEach(d => { const w = gltf.scene.clone(true); w.scale.setScalar(k); w.position.set(d.x + Math.cos(d.yaw) * 3.4, d.tile.hf(d.x + Math.cos(d.yaw) * 3.4, -d.z + Math.sin(d.yaw) * 3.4), d.z - Math.sin(d.yaw) * 3.4);
      w.position.y -= box.min.y * k; w.rotation.y = d.yaw + .5; w.traverse(o => { if (o.isMesh) o.castShadow = true; }); w.name = 'wheelbarrow of pumpkins'; d.tile.group.add(w); });
  }).catch(() => {});

  // ---------- costumes for the townsfolk (they mount a moment after us) ----------
  const dressed = new Set(); let tries = 0;
  const dressFolk = setInterval(() => { const folk = town.townsfolk; tries++;
    if (folk?.length) { folk.forEach((p, i) => { if (dressed.has(p)) return; dressed.add(p); const c = COSTUMES[(i * 2 + 1) % COSTUMES.length]; if (c === 'ghost') return; accessories(p, c); p.userData.costume = c; }); clearInterval(dressFolk); }
    else if (tries > 40) clearInterval(dressFolk); }, 500);

  // ---------- trick-or-treaters queue at the lit doors, and bats and mist fill the air ----------
  doors.forEach((d, i) => { if (i % 2) return; const c = COSTUMES[(i + 2) % COSTUMES.length], k = person(c, SKIN[i % SKIN.length]); k.scale.setScalar(.62);
    const sx = Math.sin(d.yaw), sz = Math.cos(d.yaw); k.userData = {d, sx, sz, phase: i * 1.7, state: 'wait', t: 1 + (i % 4)}; k.position.set(d.x + sx * 11, d.tile.hf(d.x + sx * 11, -(d.z + sz * 11)), d.z + sz * 11); d.tile.group.add(k); kids.push(k); });
  tiles.forEach(([id, tile], hi) => { if (!tile.group) return;
    for (let i = 0; i < 2; i++) { const b = new T.Group(); b.name = 'bat'; part(b, G.ico, M.dark, 0, 0, 0, .5, .35, .7, 'bat body');
      const wings = [-1, 1].map(s => { const w = part(b, G.tri, M.dark, s * .9, 0, 0, .9, 1.4, .08, 'bat wing'); w.rotation.set(0, 0, s * Math.PI / 2); w.userData.s = s; return w; });
      b.scale.setScalar(1.8); b.userData = {wings, r: 55 + i * 40 + hi * 4, h: 26 + i * 9 + (hi % 3) * 5, sp: .35 + i * .12, a0: hi * 1.1 + i * 3}; tile.group.add(b); bats.push(b); }
    for (let i = 0; i < 5; i++) { const s = sprite('#c9b8ff', 42 + i * 8, .2, T.NormalBlending); const a = i * 1.26 + hi, r = 25 + i * 9; s.userData = {a, r, sp: .02 + i * .004}; s.position.set(Math.cos(a) * r, tile.hf(Math.cos(a) * r, Math.sin(a) * r) + 3, -Math.sin(a) * r); tile.group.add(s); mists.push({s, tile}); } });

  // ---------- the speech bubble (presentation layer, drawn for the player) ----------
  const css = document.createElement('style'); css.textContent = `
.hw-bubble{position:fixed;z-index:31;max-width:250px;transform:translate(-50%,calc(-100% - 22px));padding:11px 14px;border-radius:18px;background:linear-gradient(160deg,rgba(255,244,222,.95),rgba(255,226,180,.92));
 box-shadow:0 10px 30px rgba(60,20,80,.35),inset 0 1px 0 #fff;font:500 14px/1.4 system-ui,sans-serif;color:#3a2150;pointer-events:none;transition:opacity .25s}
.hw-bubble::after{content:"";position:absolute;left:50%;bottom:-6px;width:12px;height:12px;background:inherit;transform:translateX(-50%) rotate(45deg)}
.hw-bubble b{display:block;font:700 11px system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#d0661a;margin-bottom:3px}`;
  document.head.append(css);
  const bubble = document.createElement('div'); bubble.className = 'hw-bubble'; bubble.hidden = true; bubble.setAttribute('data-presentation', ''); document.body.append(bubble);
  let talk = null; const v = new T.Vector3();
  const say = (door, who, text, ms = 4200) => { talk = {door, until: performance.now() + ms}; bubble.innerHTML = `<b>${who}</b>${text}`; bubble.hidden = false; bubble.style.opacity = 1; };

  // ---------- the night: one treat per door, kept on this device ----------
  const today = nightKey(); let night = (() => { try { const n = JSON.parse(LS('aw-halloween-night') || 'null'); return n?.date === today ? n : freshNight(today); } catch { return freshNight(today); } })();
  const save = () => LS('aw-halloween-night', JSON.stringify(night));
  api.night = () => night;
  let inv = null, pack = null;
  Promise.all([import('../inventory.mjs?v=12'), import('../backpack.mjs?v=14')]).then(([i, b]) => { inv = i.inventory(); pack = b; }).catch(e => console.warn('Halloween backpack', e));

  const answer = door => {
    sound.startMusic(); sound.knock();
    const r = knock({...night, date: new Date().toISOString()}, door); door.flare = 1;
    const resident = person(COSTUMES[Math.abs(Math.floor(door.x * 7 + door.z * 3)) % COSTUMES.length], SKIN[Math.abs(Math.floor(door.x)) % SKIN.length]);
    const sx = Math.sin(door.yaw), sz = Math.cos(door.yaw), px = door.x - sx * 2.2, pz = door.z - sz * 2.2;
    resident.position.set(px, door.y, pz); resident.rotation.y = door.yaw; resident.scale.setScalar(.01); door.tile.group.add(resident); residents.push({g: resident, born: performance.now() + 450, life: 5200, k: 1.15});
    setTimeout(() => sound.creak(), 380);
    setTimeout(() => {
      say(door, 'Trick or treat!', r.say);
      if (r.kind !== 'treat') return;
      if (!inv) return say(door, 'Hold on...', 'The backpack is still waking up. Knock again in a moment!');
      const item = inv.add(r.treat);
      if (!item) return say(door, 'Oh dear', 'Your pockets are too full for more sweets!');
      sound.treat(); const res = answered(night, door); night = res.night; save();
      if (res.charm && pack) setTimeout(() => { pack.earnCharm('pumpkin'); sound.charm(); say(door, 'A Halloween charm!', `Five doors in one night! This little pumpkin is for your backpack.`, 5200); }, 2200);
    }, 700);
  };
  api.knockAt = id => { const d = doors.find(x => x.id === id) || doors[0]; if (d) answer(d); return d?.id; };

  // ---------- tapping a lit porch (a drag is the camera's, so only a short still press counts) ----------
  const ray = new T.Raycaster(), ndc = new T.Vector2(); let down = null;
  canvas.addEventListener('pointerdown', e => { down = {x: e.clientX, y: e.clientY, t: performance.now()}; });
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 600) { down = null; return; } down = null;
    if (!document.body.classList.contains('play')) return;
    const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const visible = hits.filter(h => { for (let o = h; o; o = o.parent) if (!o.visible) return false; return true; });
    const hit = ray.intersectObjects(visible, false)[0]; if (hit) answer(doors.find(d => d.hit === hit.object));
  });

  // ---------- per frame ----------
  const toScreen = (d, up) => { d.lantern.getWorldPosition(v); v.y += up; v.project(camera); const r = canvas.getBoundingClientRect(); return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 ? [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height] : null; };
  stage.frame((dt, t) => {
    doors.forEach((d, i) => { const f = .85 + .15 * Math.sin(t * 5 + i * 2.3) * Math.sin(t * 3.1 + i); d.flare = Math.max(0, d.flare - dt * .6);
      d.lantern.userData.halo.material.opacity = (.5 + d.flare * .45) * f; d.lantern.userData.halo.scale.setScalar(9 + d.flare * 7); });
    bats.forEach(b => { const u = b.userData, a = u.a0 + t * u.sp; b.position.set(Math.cos(a) * u.r, u.h + Math.sin(t * 1.3 + u.a0) * 3, Math.sin(a) * u.r); b.rotation.y = -a; const flap = Math.sin(t * 14 + u.a0) * .6; u.wings.forEach(w => { w.rotation.z = w.userData.s * (Math.PI / 2 + flap); }); });
    mists.forEach(({s, tile}) => { const u = s.userData; u.a += dt * u.sp; const x = Math.cos(u.a) * u.r, z = Math.sin(u.a) * u.r; s.position.set(x, tile.hf(x, -z) + 3 + Math.sin(t * .5 + u.a * 3), z); });
    kids.forEach(k => { const u = k.userData, d = u.d, now = performance.now();
      u.t -= dt;
      if (u.state === 'wait' && u.t <= 0) { u.state = 'up'; }
      else if (u.state === 'up' || u.state === 'down') { const to = u.state === 'up' ? 3.2 : 11, cur = Math.hypot(k.position.x - d.x, k.position.z - d.z), step = 3 * dt;
        const nd = u.state === 'up' ? Math.max(to, cur - step) : Math.min(to, cur + step); k.position.x = d.x + u.sx * nd; k.position.z = d.z + u.sz * nd;
        k.rotation.y = u.state === 'up' ? Math.atan2(-u.sx, -u.sz) : Math.atan2(u.sx, u.sz); k.position.y = d.tile.hf(k.position.x, -k.position.z) + Math.abs(Math.sin(t * 9 + u.phase)) * .25;
        if (nd === to) { u.state = u.state === 'up' ? 'knock' : 'wait'; u.t = u.state === 'knock' ? 2.6 : 5 + (u.phase % 3); if (u.state === 'knock') d.flare = Math.max(d.flare, .6); } }
      else if (u.state === 'knock' && u.t <= 0) u.state = 'down'; });
    for (let i = residents.length - 1; i >= 0; i--) { const r = residents[i], age = performance.now() - r.born; if (age < 0) continue;
      const k = age < 350 ? age / 350 : age > r.life - 350 ? Math.max(.01, (r.life - age) / 350) : 1; r.g.scale.setScalar(r.k * Math.max(.01, k)); r.g.position.y += 0; if (age > r.life) { r.g.parent?.remove(r.g); residents.splice(i, 1); } }
    if (talk) { const p = toScreen(talk.door, 4.5); if (!p || performance.now() > talk.until) { bubble.hidden = true; talk = null; } else { bubble.style.left = p[0] + 'px'; bubble.style.top = p[1] + 'px'; } }
  });
  return api;
}
