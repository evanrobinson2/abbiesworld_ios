// Kart mode (AW-STUDY-0055). Turns the Effect Hunt's driving into a race: the board's tiles are stencilled into a looping track
// (re-drawn lazily in the background whenever a tile is placed), scenery you crash into or smash, ramps and boost pads, a start
// line and laps. The Effect Hunt still owns the vehicles, the ten effects, the beacons and the tow-back; this layer only reads
// its driver and adds rules.
//   const kart = createKart({scene, world, driver, board, tow})
//   kart.attach()            hooks world.onBoard / world.nearObstacles so tiles placed in slots count as board and props bump
//   kart.frame(dt)           every frame, after hunt.frame(dt)
//   kart.setTiles(['slot-0'])  the board changed: the track is rebuilt in the background and swapped in when ready
// Board metres are x east, y north; scene metres are x east, z south, via world.toScene. Nothing here draws a gizmo or a label; the
// only words anywhere are on the painted START sign.
import * as T from 'three';
import {layoutOf, buildTrack, runLazily, seeded, inHex, R3, TRACK} from './track.mjs';
import {createObstacles, PROP_SCALE} from './obstacles.mjs';
import {bonk, boing, pop, chime, pipPip} from '../effect-hunt/sound.mjs';

const SURFACE = {road: 1, dirt: .94, verge: .88, grass: .72, void: .6};
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; };

export function createKart({scene, world, driver, board, tow = null, extraIds = [], laps = 3, onEvent = () => {}, lift = .22, width = TRACK.width, vehicleRoot = null, camera = null, renderer = null, topScene = null, inCar = () => true}) {
 const toScene = (x, y) => world.toScene(x, y);
 const fromScene = (x, z) => [(x - world.origin.x) / world.scale, -(z - world.origin.z) / world.scale];
 const root = new T.Group(); root.name = 'kart track'; scene.add(root);
 const origOnBoard = world.onBoard, origNear = world.nearObstacles, baseMax = driver.K.maxSpeed, baseSlope = driver.K.slopeSlow;
 let L = layoutOf(board, extraIds, {width}), track = null, building = false, queued = null, attached = false, towKey = '';
 const cache = new Map(), obstacles = createObstacles({scene, world, toScene, fromScene, base: origNear, onBump: (o, power) => { if (power < 4) return; state.crashes++; puff({x: o.x, y: world.heightAt(o.x, o.z) + 1, z: o.z}, '#ffe9b0', 10, 4); onEvent({t: 'crash', kind: o.kind, power}); }, onSmash: (o, speed) => { state.smashes++; pop(); puff(o.obj.position, '#ffffff', 14, 5); onEvent({t: 'smash', kind: o.kind, speed}); }});
 const state = {lap: 0, laps, gate: 0, gateCount: 0, lapT: 0, best: null, surface: 'road', rebuilding: false, waiting: true, lastBuild: 0, tiles: [...extraIds], crashes: 0, smashes: 0};

 // ---- puffs: dust, debris, the swap when a new track arrives
 const MAX = 240, pp = new Float32Array(MAX * 3), pc = new Float32Array(MAX * 3), pv = new Float32Array(MAX * 3), pl = new Float32Array(MAX); let pn = 0;
 const pgeo = new T.BufferGeometry(); pgeo.setAttribute('position', new T.BufferAttribute(pp, 3)); pgeo.setAttribute('color', new T.BufferAttribute(pc, 3));
 const dot = canvasTex(32, 32, (c, w, h) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
 const pts = new T.Points(pgeo, new T.PointsMaterial({size: 2.6, map: dot, alphaTest: .02, vertexColors: true, transparent: true, opacity: .85, depthWrite: false, sizeAttenuation: true})); pts.frustumCulled = false; pts.name = 'kart dust'; root.add(pts);
 const col = new T.Color();
 function puff(p, color, n = 16, speed = 6) { col.set(color); for (let i = 0; i < n; i++) { const k = pn++ % MAX, a = Math.random() * 6.283, s = speed * (.3 + Math.random() * .7); pp.set([p.x, p.y + .5, p.z], k * 3); pv.set([Math.cos(a) * s, 2 + Math.random() * speed * .5, Math.sin(a) * s], k * 3); pc.set([col.r, col.g, col.b], k * 3); pl[k] = .6 + Math.random() * .7; } }
 function puffs(dt) { for (let i = 0; i < MAX; i++) { if (pl[i] <= 0) { pp[i * 3 + 1] = -9999; continue; } pl[i] -= dt; pv[i * 3 + 1] -= 12 * dt; pp[i * 3] += pv[i * 3] * dt; pp[i * 3 + 1] += pv[i * 3 + 1] * dt; pp[i * 3 + 2] += pv[i * 3 + 2] * dt; } pgeo.attributes.position.needsUpdate = true; pgeo.attributes.color.needsUpdate = true; }

 // ---- the road: a decal that follows the town's own ground exactly, five columns across so it banks with the hill
 function ribbon(samples, halfW, cols, lifted, vscale, closed, off = 0) {
  const pos = [], uv = [], idx = [], n = samples.length;
  samples.forEach(p => { const nx = -p.ty, ny = p.tx; for (let c = 0; c < cols; c++) { const lat = off + (c / (cols - 1) * 2 - 1) * halfW, q = toScene(p.x + nx * lat, p.y + ny * lat); pos.push(q.x, world.heightAt(q.x, q.z) + lifted, q.z); uv.push(c / (cols - 1), p.s / vscale); } });
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) for (let c = 0; c < cols - 1; c++) { const a = i * cols + c, b = ((i + 1) % n) * cols + c; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
 }
 const decal = (map, f) => new T.MeshStandardMaterial({map, roughness: .92, polygonOffset: true, polygonOffsetFactor: -f, polygonOffsetUnits: -f});
 const rnd = seeded(9);
 const asphalt = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#4b4b5a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '0,0,0'},${.03 + rnd() * .06})`; c.fillRect(rnd() * w, rnd() * h, 2, 2); } c.fillStyle = '#f2f2f6'; c.fillRect(4, 0, 3, h); c.fillRect(w - 7, 0, 3, h); c.fillStyle = '#ffd34d'; c.fillRect(w / 2 - 2, 0, 4, h * .5); });
 const kerbTex = canvasTex(8, 16, (c, w, h) => { c.fillStyle = '#e8483c'; c.fillRect(0, 0, w, h / 2); c.fillStyle = '#fff'; c.fillRect(0, h / 2, w, h / 2); });
 const dirtTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#b88a5a'; c.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(${rnd() < .5 ? '90,55,25' : '230,190,140'},${.08 + rnd() * .1})`; c.fillRect(rnd() * w, rnd() * h, 3, 2); } c.fillStyle = 'rgba(90,55,25,.35)'; c.fillRect(w * .28, 0, 4, h); c.fillRect(w * .68, 0, 4, h); });
 const signTex = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#fff7e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9483c'; c.font = '800 70px ui-rounded,system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('START', w / 2, h / 2 + 3); });
 const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .8, flatShading: true, ...o});
 const mesh = (geo, m, name, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, m); o.name = name; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };

 let roadGroup = null, slabs = null, padsGroup = null;
 function mountMeshes(t) {
  roadGroup?.removeFromParent(); slabs?.removeFromParent();
  roadGroup = new T.Group(); roadGroup.name = 'road'; const W = t.width;
  const asph = new T.Mesh(ribbon(t.main.samples, W / 2, 5, lift, 16, true), decal(asphalt, 2)); asph.name = 'road asphalt'; asph.receiveShadow = true; roadGroup.add(asph);
  for (const s of [-1, 1]) { const k = new T.Mesh(ribbon(t.main.samples, .7, 2, lift + .04, 3, true, s * (W / 2 + .7)), decal(kerbTex, 3)); k.name = 'road kerb'; k.receiveShadow = true; roadGroup.add(k); }
  const dirt = new T.Mesh(ribbon(t.cut.samples, t.shortcutWidth / 2, 3, lift, 9, false), decal(dirtTex, 2)); dirt.name = 'road dirt shortcut'; dirt.receiveShadow = true; roadGroup.add(dirt);
  // start line and gantry
  const s = t.start, q = toScene(s.x, s.y), y0 = world.heightAt(q.x, q.z), face = Math.atan2(s.tx, -s.ty);
  const line = new T.Mesh(new T.PlaneGeometry(W, 2.2), new T.MeshStandardMaterial({map: canvasTex(64, 8, (c) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#fff'; c.fillRect(i * 4, j * 4, 4, 4); } }), polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4})); line.name = 'start line';
  line.rotation.order = 'YXZ'; line.rotation.set(-Math.PI / 2, face, 0); line.position.set(q.x, y0 + lift + .06, q.z); roadGroup.add(line);
  const g = new T.Group(); g.name = 'start gantry'; g.position.set(q.x, y0, q.z); g.rotation.y = face; // local +x runs across the road, local +z along it
  for (const k of [-1, 1]) g.add(mesh(new T.BoxGeometry(1.2, 12, 1.2), mat('#e9483c'), 'gantry post red', k * (W / 2 + 2), 6, 0));
  g.add(mesh(new T.BoxGeometry(W + 6, 3, 1), mat('#fff7e8'), 'gantry banner cream', 0, 12, 0));
  for (const f of [1, -1]) { const sg = new T.Mesh(new T.PlaneGeometry(W + 5, 2.4), new T.MeshBasicMaterial({map: signTex})); sg.name = 'start sign'; sg.position.set(0, 12, f * .55); if (f < 0) sg.rotation.y = Math.PI; g.add(sg); }
  for (let i = 0; i < 11; i++) { const fl = mesh(new T.ConeGeometry(.8, 1.6, 3), mat(['#ff7eb6', '#ffd34d', '#7fd6ff', '#9be37d'][i % 4]), 'bunting flag', -W / 2 + i * (W / 10), 10, .2); fl.rotation.x = Math.PI; g.add(fl); }
  roadGroup.add(g);
  // ramps and boost pads, as painted wood and chevrons on the road
  for (const r of t.ramps) {
   const p = toScene(r.x, r.y), rg = new T.Group(); rg.name = r.pad ? 'boost pad' : 'jump ramp'; rg.position.set(p.x, world.heightAt(p.x, p.z), p.z); rg.rotation.y = Math.atan2(r.tx, -r.ty);
   if (r.pad) { rg.add(mesh(new T.BoxGeometry(8, .12, 10), mat('#2b2b44', {emissive: '#2b2b44'}), 'pad plate', 0, lift + .1, 0)); for (let i = 0; i < 3; i++) { const ch = mesh(new T.ConeGeometry(1.8, 2, 3), mat('#ffe14d', {emissive: '#ffcf1a', emissiveIntensity: 1.2}), 'pad chevron', 0, lift + .22, -3 + i * 3); ch.rotation.x = -Math.PI / 2; ch.scale.y = .1; rg.add(ch); } }
   else { const w = mesh(new T.BoxGeometry(9, .5, 8), mat('#ff8a1e'), 'ramp wood orange', 0, 1, 0); w.rotation.x = .24; rg.add(w); rg.add(mesh(new T.BoxGeometry(9, .2, .7), mat('#2f7bff'), 'ramp lip blue', 0, 2.1, 3.7)); for (const k of [-1, 1]) rg.add(mesh(new T.BoxGeometry(.3, 1.4, 7.4), mat('#fff7e8'), 'ramp rail cream', k * 4.4, .7, 0)); }
   roadGroup.add(rg);
  }
  root.add(roadGroup);
  // tiles placed in slots: a simple slab on the ground so the board has something under the new track (the real tile replaces it)
  slabs = new T.Group(); slabs.name = 'new tiles';
  for (const h of t.L.placed) { const rings = 12, R = L.R, pos = [], idx = [], c0 = toScene(h.x, h.y); pos.push(c0.x, world.heightAt(c0.x, c0.z), c0.z); const rows = [[0]];
   for (let r = 1; r <= rings; r++) { const row = [], n = 6 * r; for (let i = 0; i < n; i++) { const c = Math.floor(i / r), f = (i % r) / r, a0 = c * Math.PI / 3, a1 = (c + 1) * Math.PI / 3, bx = R * r / rings * (Math.cos(a0) * (1 - f) + Math.cos(a1) * f), by = R * r / rings * (Math.sin(a0) * (1 - f) + Math.sin(a1) * f), q = toScene(h.x + bx, h.y + by); row.push(pos.length / 3); pos.push(q.x, world.heightAt(q.x, q.z), q.z); } rows.push(row); }
   for (let r = 1; r <= rings; r++) { const a = rows[r - 1], b = rows[r]; let i = 0, j = 0; const na = a.length, nb = b.length; if (r === 1) { for (let k = 0; k < 6; k++) idx.push(0, b[k], b[(k + 1) % 6]); continue; } while (i < na || j < nb) { const ai = a[i % na], an = a[(i + 1) % na], bj = b[j % nb], bn = b[(j + 1) % nb]; if (i >= na) { idx.push(ai, bn, bj); j++; } else if (j >= nb) { idx.push(ai, an, bj); i++; } else if ((i + 1) / na <= (j + 1) / nb) { idx.push(ai, an, bj); i++; } else { idx.push(ai, bn, bj); j++; } } }
   const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); if (geo.attributes.normal.getY(0) < 0) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const tt = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = tt; } geo.computeVertexNormals(); }
   const m = new T.Mesh(geo, mat('#aab4d8')); m.name = 'tile ' + h.slot; m.receiveShadow = true; slabs.add(m); }
  root.add(slabs);
 }

 // ---- building and swapping tracks
 async function buildFor(layout) { if (cache.has(layout.key)) return cache.get(layout.key); const t = await runLazily(buildTrack(layout), {budget: 4}); cache.set(layout.key, t); return t; }
 function mount(t) {
  track = t; L = t.L; mountMeshes(t); obstacles.mount(t); clearScenery(); for (const r of t.ramps) r.cool = 0;
  Object.assign(state, {gate: 0, gateCount: 0, lapT: 0, lap: state.lap}); state.length = t.main.length; state.lastBuild = t.ms; state.tiles = L.placed.map(h => h.slot);
 }
 function attach() {
  if (attached) return; attached = true;
  world.onBoard = (x, z) => origOnBoard(x, z) || L.onBoard(...fromScene(x, z));
  world.nearObstacles = (x, z) => obstacles.near(x, z);
  obstacles.baseFilter = o => !cleared(o.x, o.z);
  world.kartLayout = () => L;
 }
 async function setTiles(ids) {
  if (building) { queued = ids; return; }
  building = true; state.rebuilding = true; const t0 = performance.now(); onEvent({t: 'rebuild-start'});
  const layout = layoutOf(board, ids, {width}), t = await buildFor(layout); building = false; state.rebuilding = false;
  const s = driver.s, [bx, by] = fromScene(s.x, s.z); mount(t);
  const near = t.nearMain(bx, by, 4); // if you were not near the new road, set you on it
  if (!near || near.d > t.width * .7) { const sm = t.main.samples[near ? near.i : 0], q = toScene(sm.x, sm.y); driver.place(q.x, q.z, Math.atan2(sm.tx, -sm.ty)); }
  puff({x: s.x, y: world.heightAt(s.x, s.z), z: s.z}, '#e8dcc0', 40, 9); pipPip();
  onEvent({t: 'rebuilt', ms: performance.now() - t0, build: t.ms, key: layout.key});
  if (queued) { const q = queued; queued = null; setTiles(q); }
 }
 // quietly make the tracks for each possible next tile while nothing else is going on, so placing one is instant
 function prebuild(slotIds = (board.slots || []).map(s => s.id)) { const idle = typeof requestIdleCallback === 'function' ? requestIdleCallback : f => setTimeout(f, 600); let i = 0; const next = () => { if (i >= slotIds.length) return; const layout = layoutOf(board, [...state.tiles, slotIds[i++]], {width}); if (cache.has(layout.key)) return next(); buildFor(layout).then(() => idle(next)); }; idle(next); }

 // ---- stencilling: scenery the town drew on the road's line is cleared (hidden, and it stops colliding). Hides instances of any
 // InstancedMesh under `group`; originals are remembered so a rebuilt track can bring them back.
 const cleared = (x, z) => { if (!track) return false; const [bx, by] = fromScene(x, z), a = track.nearMain(bx, by, 3), b = track.nearCut(bx, by, 2); return (a && a.d < track.width / 2 + 7) || (b && b.d < track.shortcutWidth / 2 + 6); };
 const groups = new Set(), m4 = new T.Matrix4(), v3 = new T.Vector3(), zero = new T.Matrix4().makeScale(0, 0, 0);
 function clearScenery(group) {
  if (group) groups.add(group);
  for (const g of groups) g.traverse(o => { if (!o.isInstancedMesh) return; o.userData.kartOrig ??= Array.from({length: o.count}, (_, i) => { o.getMatrixAt(i, m4); return m4.clone(); });
   o.userData.kartOrig.forEach((m, i) => { v3.setFromMatrixPosition(m); o.setMatrixAt(i, cleared(v3.x, v3.z) ? zero : m); }); o.instanceMatrix.needsUpdate = true; });
 }
 // ---- fire wheels (the Toy car charm's card) and the Polaroid phone (the floppy-disk charm): both optional, both loaded on demand
 let fire = null, fireOn = false, wheels = [], wheelsOf = null;
 import('../fire-wheels.mjs').then(m => { fire = m.fireTrail(T, topScene || scene); fireOn = m.fireWheelsOn(); m.onFireWheels(v => { fireOn = v; }); }).catch(() => {});
 import('./toy-cars.mjs').then(m => m.registerToyCars()).catch(() => {});
 let polaroid = null;
 if (renderer && camera) import('./polaroid.mjs').then(m => { polaroid = m.createPolaroid({renderer, scene: topScene || scene, camera, visible: inCar, sound: () => pop()}); }).catch(() => {});
 // ---- per frame
 const EV = (t, extra) => onEvent({t, ...extra});
 function frame(dt) {
  if (!track) return state;
  dt = Math.min(dt, .05); const s = driver.s, [bx, by] = fromScene(s.x, s.z), K = driver.K;
  const surf = track.surfaceAt(bx, by); state.surface = surf;
  if (state.waiting) { if (Math.abs(driver.input.throttle) > .1 || driver.input.boost || driver.input.jet) state.waiting = false; else { s.vx = s.vz = 0; s.speed = 0; } } // parked on the line until you go
  K.slopeSlow += ((surf === 'road' || surf === 'dirt' ? baseSlope * .3 : baseSlope) - K.slopeSlow) * Math.min(1, dt * 4); // a stencilled road is graded: hills drag you less on it
  const want = baseMax * (SURFACE[surf] ?? 1); K.maxSpeed += (want - K.maxSpeed) * Math.min(1, dt * 4);
  if (!s.air) { // ramps and pads
   for (const r of track.ramps) {
    if (r.cool > 0) { r.cool = Math.max(0, r.cool - dt); continue; }
    const dx = bx - r.x, dy = by - r.y; if (dx * dx + dy * dy > 36) continue;
    const along = dx * r.tx + dy * r.ty; if (!r.pad && (Math.sin(s.heading) * r.tx - Math.cos(s.heading) * r.ty) < .2) continue; // jump ramps only the way they point
    r.cool = 1.2;
    if (r.pad) { s.boostT = Math.max(s.boostT, 1.3); pipPip(); EV('pad'); } else { driver.impulse(13 + Math.min(8, Math.abs(s.speed) * .22)); boing(); EV('jump'); }
   }
  }
  const pud = obstacles.puddleAt(s.x, s.z); if (pud && !s.air) { s.vx *= 1 - dt * 1.6; s.vz *= 1 - dt * 1.6; if (!state._wet) { state._wet = true; puff({x: s.x, y: s.y, z: s.z}, '#9fd8ff', 16, 5); EV('splash'); } } else state._wet = false;
  // laps: gates in order; the shortcut joins the first and the fourth hex
  const n = track.gates.length; state.lapT += dt;
  for (let i = 0; i < n; i++) {
   const gt = track.gates[i]; if (i === state.gate || (bx - gt.at.x) ** 2 + (by - gt.at.y) ** 2 > 24 * 24) continue;
   const ok = i === (state.gate + 1) % n || (state.gate === 0 && i === 3 % n) || (state.gate === 3 % n && i === 0); if (!ok) continue;
   state.gate = i; state.gateCount++;
   if (i === 0 && state.gateCount >= 4) { state.gateCount = 0; state.lap++; const time = state.lapT; if (state.best == null || time < state.best) state.best = time; state.lapT = 0; chime(state.lap); EV('lap', {lap: state.lap, time, best: state.best, done: state.lap >= laps}); }
  }
  if (!s.air && s.surface !== 'void' && Math.abs(s.speed) > 6) { /* tyre dust on grass */ if (surf === 'grass' && Math.random() < dt * 30) puff({x: s.x - Math.sin(s.heading) * 3, y: s.y, z: s.z - Math.cos(s.heading) * 3}, '#a8c48f', 1, 3); }
  obstacles.update(dt); puffs(dt);
  if (fire) { const cur = vehicleRoot?.children[0]; if (cur !== wheelsOf) { wheelsOf = cur; wheels = []; cur?.traverse(o => { if (o.userData?.spin || o.name === 'wheel') wheels.push(o); }); } fire.update(dt, wheels, Math.abs(s.speed), fireOn && !s.air); }
  polaroid?.update();
  return state;
 }
 return {root, state, attach, frame, clearScenery, cleared, setTiles, prebuild, mount, obstacles, puff, get track() { return track; }, get layout() { return L; }, ready: async ({atStart = true} = {}) => { mount(await buildFor(L)); attach(); if (atStart) { state.waiting = true; const q = toScene(track.start.x, track.start.y); driver.place(q.x, q.z, Math.atan2(track.start.tx, -track.start.ty)); } return track; }, toScene, fromScene,
  dispose() { polaroid?.dispose(); fire?.object.removeFromParent(); world.onBoard = origOnBoard; world.nearObstacles = origNear; driver.K.maxSpeed = baseMax; driver.K.slopeSlow = baseSlope; root.removeFromParent(); obstacles.dispose(); }};
}
