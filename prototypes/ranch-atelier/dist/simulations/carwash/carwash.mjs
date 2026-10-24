// The carwash on Main Street (AW-STUDY-0059). A drive-through with no walls to speak of and a frame of painted arches over the
// road: soap, spinning brushes, a rinse, a tipping bucket and the dryers. A grubby loaner Moon Buggy waits at the entrance. Roll
// it through and you are soaked, because the buggy has no roof, and that earns it: it comes out clean and shiny, it is yours,
// and it moves onto the left bar (garage.mjs). The conveyor takes the wheel inside, so little hands cannot get stuck.
//   place(AT)  AT is window.AbbieTown; builds the carwash on the downtown road and returns {root, launch, dispose, ...}
// It only adds in-fiction things to the world (a building, water, a buggy), so characters can see it too. The lens drops and the
// thought are the presentation layer: meta (what Abbie feels), drawn for the player, never in the world.
import * as T from 'three';
import {buildMoonBuggy, look, earned, earn} from './buggy.mjs';
import * as S from './sound.mjs';

export const L = 34, HW = 6, CONVEY = 7.5, VS = 2.6;
const ZONE = {soap: [5, 10], brush: [11, 19], rinse: [20, 26], dry: [27, 33]};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapPi = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .75, flatShading: true, ...o});
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; };

// the painted sign over the entrance: a sky-blue board with bubbles, in the Ranch's hand-painted wood-and-paint dialect
const signTex = () => canvasTex(1024, 320, (g, w, h) => {
 g.fillStyle = '#7fd0f2'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff55'); gr.addColorStop(1, '#00000018'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
 for (let i = 0; i < 26; i++) { const x = (i * 197) % w, y = (i * 83) % h, r = 8 + (i * 13) % 26; g.strokeStyle = '#ffffffcc'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.fillStyle = '#ffffff55'; g.beginPath(); g.arc(x - r * .3, y - r * .3, r * .22, 0, 7); g.fill(); }
 g.font = '900 170px ui-rounded,"Arial Rounded MT Bold",system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
 g.lineWidth = 26; g.strokeStyle = '#d63a4a'; g.strokeText('CAR WASH', w / 2, h / 2 + 8); g.lineWidth = 8; g.strokeStyle = '#ffffff'; g.strokeText('CAR WASH', w / 2, h / 2 + 8); g.fillStyle = '#fff7e2'; g.fillText('CAR WASH', w / 2, h / 2 + 8);
 g.strokeStyle = '#d63a4a'; g.lineWidth = 14; g.strokeRect(10, 10, w - 20, h - 20);
});
const dropTex = () => canvasTex(128, 128, (g, w, h) => { // a speech bubble with a water drop: "wash me", in a picture
 g.fillStyle = '#ffffffee'; g.beginPath(); g.roundRect(8, 8, 112, 84, 30); g.fill(); g.beginPath(); g.moveTo(52, 88); g.lineTo(64, 120); g.lineTo(78, 88); g.fill();
 g.fillStyle = '#3aa8e8'; g.beginPath(); g.moveTo(64, 20); g.bezierCurveTo(90, 52, 92, 74, 64, 78); g.bezierCurveTo(36, 74, 38, 52, 64, 20); g.fill(); g.fillStyle = '#ffffffaa'; g.beginPath(); g.ellipse(54, 56, 5, 10, .4, 0, 7); g.fill();
});
const dotTex = () => canvasTex(32, 32, (c, w, h) => { const g = c.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

// where it goes: the straight, clear stretch of a downtown road nearest the school, found by scanning the board's road samples for
// 46 m that stay on one line with no house on it and few trees beside it; it faces away from the middle of town
export function findSite(board) {
 const sp = (board.roadSpawns?.(3) || []).filter(s => s.hex === 'downtown'); if (sp.length < 10) return null;
 const near = (x, y, d) => sp.some(q => Math.hypot(q.x - x, q.y - y) < d);
 let best = null;
 for (const s of sp) {
  let dx = Math.cos(s.heading), dy = Math.sin(s.heading); if (s.x * dx + s.y * dy < 0) { dx = -dx; dy = -dy; } // roll in from the centre side, out the far side
  let straight = true;
  for (let t = -L / 2 - 8; t <= L / 2 + 8 && straight; t += 3) if (!near(s.x + dx * t, s.y + dy * t, 2.6)) straight = false;
  if (!straight) continue;
  const rx = dy, ry = -dx; let score = 0;
  for (const o of board.obstaclesNear(s.x, s.y, 60)) { // the buggy is wide (a bump radius of 3.2 m): anything that close to its line pushes it
   const ox = o.x - s.x, oy = o.y - s.y, u = ox * dx + oy * dy, v = Math.abs(ox * rx + oy * ry), b = o.kind === 'building';
   if (u > -L / 2 - 1 && u < L / 2 + 1) { if (v < o.r + 3.6) score += b ? 100 : 20; else if (v < HW + o.r * .5) score += b ? 10 + o.r : 1; }
   else if ((u > -L / 2 - 22 && u <= -L / 2 - 1) || (u >= L / 2 + 1 && u < L / 2 + 12)) { if (v < o.r + 3.6) score += b ? 50 : 5; }
  }
  const cost = score * 100 + Math.hypot(s.x, s.y); if (!best || cost < best.cost) best = {cost, score, cx: s.x, cy: s.y, dx, dy};
 }
 return best && {cx: best.cx, cy: best.cy, dx: best.dx, dy: best.dy, score: best.score};
}

export function place(AT) {
 const stage = AT?.stage, board = AT?.board; if (!stage || !board) return null;
 const site = findSite(board); if (!site) return null;
 const {dioGroup, scene, camera, renderer} = stage, hOf = (bx, by) => board.heightAt(bx, by);
 const f = {x: site.dx, z: -site.dy}, heading = Math.atan2(f.x, f.z), r = {x: Math.cos(heading), z: -Math.sin(heading)}; // scene forward and right (z is south, so board north is -z)
 const p0 = {x: site.cx - site.dx * L / 2, y: site.cy - site.dy * L / 2}, p1 = {x: site.cx + site.dx * L / 2, y: site.cy + site.dy * L / 2};
 const h0 = hOf(p0.x, p0.y), h1 = hOf(p1.x, p1.y), baseH = Math.min(h0, h1);
 const root = new T.Group(); root.name = 'carwash'; root.rotation.order = 'YXZ'; root.position.set(p0.x, h0, -p0.y); root.rotation.y = heading; root.rotation.x = -Math.atan2(h1 - h0, L); dioGroup.add(root);
 const add = (parent, geo, m, name, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, m); o.name = name; o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };

 // the town's own trees and rocks standing where the carwash is are lifted out (hidden instances), so nothing grows through the tunnel
 { const m4 = new T.Matrix4(), v3 = new T.Vector3(), zero = new T.Matrix4().makeScale(0, 0, 0); dioGroup.updateMatrixWorld(true); root.updateMatrixWorld(true);
  dioGroup.traverse(o => { if (!o.isInstancedMesh) return; let hidden = false;
   for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m4); const wm = m4.clone().premultiply(o.matrixWorld); v3.setFromMatrixPosition(wm); root.worldToLocal(v3); if (v3.z > -26 && v3.z < L + 16 && Math.abs(v3.x) < HW + 5) { o.setMatrixAt(i, zero); hidden = true; } }
   if (hidden) o.instanceMatrix.needsUpdate = true; }); }
 // ---- the building: a concrete apron, low painted walls, and a row of arches, one colour per stage
 const apron = add(root, new T.BoxGeometry(HW * 2 + 2, 4, L + 2), mat('#b9bcc4'), 'carwash apron', 0, -1.9, L / 2);
 const wet = new T.Mesh(new T.PlaneGeometry(HW * 2 - 1, L), new T.MeshStandardMaterial({color: '#25384a', transparent: true, opacity: .5, roughness: .25, metalness: .2, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'wet floor'})); wet.name = 'wet floor'; wet.rotation.x = -Math.PI / 2; wet.position.set(0, .16, L / 2); root.add(wet);
 const beltTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = '#3a3f4c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd34d'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8, i * 64 + 40); g.lineTo(32, i * 64 + 14); g.lineTo(56, i * 64 + 40); g.lineTo(56, i * 64 + 52); g.lineTo(32, i * 64 + 26); g.lineTo(8, i * 64 + 52); g.fill(); } }); beltTex.wrapT = T.RepeatWrapping; beltTex.repeat.set(1, L / 8);
 const belt = new T.Mesh(new T.PlaneGeometry(1.6, L), new T.MeshStandardMaterial({map: beltTex, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'conveyor belt'})); belt.name = 'conveyor belt'; belt.rotation.x = -Math.PI / 2; belt.position.set(0, .18, L / 2); root.add(belt);
 const stripe = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#fff7e8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3aa8e8'; g.fillRect(0, 0, w / 2, h); g.fillStyle = '#00000014'; g.fillRect(0, h - 3, w, 3); }); stripe.wrapS = stripe.wrapT = T.RepeatWrapping; stripe.repeat.set(L * 1.2, 1);
 for (const s of [-1, 1]) {
  add(root, new T.BoxGeometry(.5, 2.6, L), new T.MeshStandardMaterial({map: stripe, roughness: .8, name: 'wall painted stripes'}), 'carwash wall', s * HW, 1.3, L / 2);
  add(root, new T.BoxGeometry(.9, .3, L + .4), mat('#d63a4a', {name: 'wall cap red'}), 'wall cap', s * HW, 2.75, L / 2);
  for (const z of [0, 8.5, 17, 25.5, L]) { add(root, new T.BoxGeometry(.9, 3.4, .9), mat('#8a5a3c', {name: 'post wood'}), 'wall post', s * HW, 1.7, z); const lamp = add(root, new T.IcosahedronGeometry(.4, 1), mat('#ffe9a8', {emissive: '#ffcf5a', emissiveIntensity: .9, name: 'lantern glow'}), 'lantern', s * HW, 3.8, z); lamp.castShadow = false; }
 }
 const archColours = {entry: '#d63a4a', soap: '#ff7eb6', brush: '#3aa8e8', bucket: '#2fb8a6', rinse: '#2fb8a6', dry: '#ff9a2e', exit: '#7bd389'};
 function arch(z, key, {h = 7.4, beam = .7} = {}) {
  const c = archColours[key]; const g = new T.Group(); g.name = 'arch ' + key; g.position.z = z; root.add(g);
  for (const s of [-1, 1]) add(g, new T.BoxGeometry(.9, h, .9), mat('#8a5a3c', {name: 'arch post wood'}), 'arch post', s * (HW - .2), h / 2, 0);
  add(g, new T.BoxGeometry(HW * 2 + .4, beam, .9), mat(c, {name: 'arch beam ' + key}), 'arch beam', 0, h, 0);
  for (let i = 0; i < 9; i++) add(g, new T.ConeGeometry(.45, 1, 3), mat(['#ff7eb6', '#ffd34d', '#7fd6ff', '#9be37d'][i % 4], {name: 'bunting'}), 'bunting flag', -HW + .6 + i * (HW * 2 - 1.2) / 8, h - .9, .55).rotation.x = Math.PI;
  return g;
 }
 const entry = arch(0, 'entry', {h: 8.4, beam: 3.0}); const sign = new T.Mesh(new T.PlaneGeometry(HW * 2 - .4, 2.6), new T.MeshBasicMaterial({map: signTex()})); sign.name = 'carwash sign'; sign.position.set(0, 8.4, -.5); sign.rotation.y = Math.PI; entry.add(sign); const sign2 = sign.clone(); sign2.position.z = .5; sign2.rotation.y = 0; entry.add(sign2);
 const aSoap = arch(6, 'soap'), aBrush = arch(11, 'brush'), aBucket = arch(23, 'bucket', {h: 8}), aRinse = arch(20.5, 'rinse'), aDry = arch(28, 'dry'), aExit = arch(L, 'exit', {h: 8.4, beam: 2.4});
 const green = add(aExit, new T.IcosahedronGeometry(.9, 1), mat('#6dff8a', {emissive: '#2fe05a', emissiveIntensity: 1.6, name: 'go light green'}), 'go light', 0, 8.4, .7); green.castShadow = false;
 const exitSign = new T.Mesh(new T.PlaneGeometry(6, 1.3), new T.MeshBasicMaterial({map: canvasTex(512, 110, (g, w, h) => { g.fillStyle = '#fff7e2'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a8a4a'; g.font = '900 80px ui-rounded,system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ALL CLEAN!', w / 2, h / 2 + 4); })})); exitSign.position.set(0, 7.4, .5); aExit.add(exitSign);

 // while you are inside, the overhead frames turn see-through so the chase camera can see the buggy
 const fade = [...new Set(root.children.flatMap(c => { const out = []; if (/^arch /.test(c.name)) c.traverse(o => { if (o.isMesh && o.material && !/post/.test(o.material.name)) out.push(o.material); }); return out; }))]; let fadeK = 1;
 // soap bubbles drifting over the entrance (a landmark you can see from the sky) and a spinning pink-and-blue sign pole
 const bubbles = []; const bubMat = new T.MeshBasicMaterial({color: '#c9ecff', transparent: true, opacity: .28, depthWrite: false, name: 'soap bubble'});
 for (let i = 0; i < 14; i++) { const b = new T.Mesh(new T.SphereGeometry(.35 + (i % 4) * .22, 12, 8), bubMat); b.name = 'soap bubble'; b.position.set(Math.sin(i * 2.1) * 6, 7 + (i * 1.7) % 6, -2 + Math.cos(i * 1.3) * 3); b.userData.p = i; root.add(b); bubbles.push(b); }

 // ---- the brushes: two pairs of upright rollers that spin, and a curtain of cloth strips that sways
 const spinners = [], strips = [];
 for (const z of [13.5, 16.5]) for (const s of [-1, 1]) {
  const roller = new T.Group(); roller.name = 'brush roller'; roller.position.set(s * 4.2, 0, z); root.add(roller);
  add(roller, new T.CylinderGeometry(.35, .35, 5.6, 8), mat('#5a6070', {name: 'brush core'}), 'brush core', 0, 2.8, 0);
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; for (let y = 0; y < 5; y++) { const b = add(roller, new T.BoxGeometry(.9, .55, .12), mat(i % 2 ? '#ff7eb6' : '#ffd34d', {name: 'brush bristle'}), 'brush bristle', Math.cos(a) * .72, .6 + y * 1.1, Math.sin(a) * .72); b.rotation.y = -a; b.castShadow = false; } }
  roller.userData = {dir: s * (z > 15 ? -1 : 1)}; spinners.push(roller);
 }
 for (let i = 0; i < 15; i++) { const strip = new T.Group(); strip.position.set(-HW + .8 + i * (HW * 2 - 1.6) / 14, 7.6, 14.9); root.add(strip); add(strip, new T.BoxGeometry(.6, 3.6, .08), mat(['#3aa8e8', '#ffffff', '#2fb8a6'][i % 3], {name: 'brush curtain cloth'}), 'curtain strip', 0, -1.8, 0); strip.userData.p = i; strips.push(strip); }
 // the tipping bucket over the rinse: it tips and drops a wave onto whoever is under it
 const bucket = new T.Group(); bucket.name = 'bucket'; bucket.position.set(0, 7.5, 23); root.add(bucket);
 add(bucket, new T.CylinderGeometry(2.2, 1.7, 2.4, 10, 1, true), mat('#3aa8e8', {name: 'bucket blue', side: T.DoubleSide}), 'bucket shell', 0, -1.2, 0); add(bucket, new T.CylinderGeometry(1.7, 1.7, .12, 10), mat('#2e86c0', {name: 'bucket base'}), 'bucket base', 0, -2.4, 0);
 add(bucket, new T.TorusGeometry(2.2, .14, 6, 14), mat('#fff7e2', {name: 'bucket rim'}), 'bucket rim', 0, 0, 0).rotation.x = Math.PI / 2; bucket.userData = {tip: 0};
 // the dryers: big fans in boxes on both sides and overhead
 const fans = [];
 for (const [x, y, rz] of [[-4.6, 2.6, 0], [4.6, 2.6, 0], [0, 6.6, Math.PI / 2]]) {
  const box = new T.Group(); box.position.set(x, y, 29.2); root.add(box); add(box, new T.BoxGeometry(2.4, 2.4, 1.2), mat('#ff9a2e', {name: 'dryer housing'}), 'dryer housing', 0, 0, 0);
  const rotor = new T.Group(); rotor.position.z = -.7; box.add(rotor); for (let i = 0; i < 4; i++) { const bl = add(rotor, new T.BoxGeometry(.4, 1.8, .06), mat('#fff7e2', {name: 'fan blade'}), 'fan blade', 0, 0, 0); bl.rotation.z = i * Math.PI / 2; bl.scale.x = 1; bl.geometry.translate(0, .9, 0); }
  if (x !== 0) box.rotation.y = x < 0 ? .5 : -.5; else box.rotation.x = .5; box.userData = {rotor}; fans.push(rotor);
 }

 // ---- the water: one pool of drops that fall, one of foam that hangs about
 const POOL = 1400, pw = {pos: new Float32Array(POOL * 3), vel: new Float32Array(POOL * 3), life: new Float32Array(POOL), n: 0}, pf = {pos: new Float32Array(POOL / 2 * 3), vel: new Float32Array(POOL / 2 * 3), life: new Float32Array(POOL / 2), n: 0};
 pw.pos.fill(-9999); pf.pos.fill(-9999);
 const mkPoints = (pool, size, colour, op) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pool.pos, 3)); const p = new T.Points(g, new T.PointsMaterial({size, map: dotTex(), color: colour, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true, alphaTest: .02})); p.frustumCulled = false; root.add(p); return p; };
 const waterPts = mkPoints(pw, 1.5, '#c4ecff', .85), foamPts = mkPoints(pf, 3.2, '#ffffff', .9); waterPts.name = 'water spray'; foamPts.name = 'soap foam';
 const spawn = (pool, x, y, z, vx, vy, vz, life) => { const i = pool.n++ % pool.life.length; pool.pos.set([x, y, z], i * 3); pool.vel.set([vx, vy, vz], i * 3); pool.life[i] = life; };
 const emitters = []; // {zone, x, y, z, dx, dy, dz, speed, rate, pool}
 for (let i = 0; i < 9; i++) { const a = -Math.PI * .08 + i / 8 * Math.PI * 1.16, x = Math.cos(a) * 5.4, y = .4 + Math.sin(a) * 6.8; for (const z of [20.5]) emitters.push({zone: 'rinse', x, y, z, dx: -Math.cos(a) * .9, dy: Math.max(.2, -Math.sin(a) * .4), dz: .2, speed: 8, rate: 26, pool: pw}); }
 for (let i = 0; i < 7; i++) emitters.push({zone: 'rinse', x: -4.5 + i * 1.5, y: 7.2, z: 21, dx: 0, dy: -1, dz: .2, speed: 6, rate: 34, pool: pw});
 for (let i = 0; i < 8; i++) emitters.push({zone: 'soap', x: -5 + i * 1.43, y: 7.1, z: 6, dx: 0, dy: -.4, dz: .1, speed: 1.6, rate: 9, pool: pf});
 for (const s of [-1, 1]) for (let y = 0; y < 3; y++) emitters.push({zone: 'soap', x: s * 5.3, y: 1 + y * 2, z: 6, dx: -s, dy: .1, dz: .1, speed: 2.4, rate: 6, pool: pf});
 for (let i = 0; i < 6; i++) emitters.push({zone: 'brush', x: -4.5 + i * 1.8, y: 7.3, z: 12.5, dx: 0, dy: -1, dz: 0, speed: 3, rate: 8, pool: pw});
 for (const [x, y] of [[-4.2, 2.6], [4.2, 2.6], [0, 6.2]]) emitters.push({zone: 'dry', x, y, z: 28.6, dx: -Math.sign(x) * .6, dy: x ? .1 : -.8, dz: .5, speed: 11, rate: 30, pool: pw, air: true});
 let act = .2, acc = new Map(), bucketPending = 0;
 const G = 17;
 function stepParticles(dt) {
  for (const e of emitters) {
   const k = (e.rate * act * dt) + (acc.get(e) || 0), nn = Math.floor(k); acc.set(e, k - nn);
   for (let j = 0; j < nn; j++) { const sp = e.speed * (.75 + Math.random() * .5), sx = (Math.random() - .5) * .35, sy = (Math.random() - .5) * .35, sz = (Math.random() - .5) * .35; spawn(e.pool, e.x + (Math.random() - .5) * .3, e.y, e.z + (Math.random() - .5) * .3, (e.dx + sx) * sp, (e.dy + sy) * sp, (e.dz + sz) * sp, e.air ? .6 : e.pool === pf ? 2.6 : 1.5); }
  }
  for (const [pool, g, drift] of [[pw, G, 0], [pf, 3, 1]]) {
   const n = pool.life.length;
   for (let i = 0; i < n; i++) {
    if (pool.life[i] <= 0) { pool.pos[i * 3 + 1] = -9999; continue; } pool.life[i] -= dt; const o = i * 3;
    pool.vel[o + 1] -= g * dt; if (drift) { pool.vel[o] *= 1 - dt; pool.vel[o + 2] *= 1 - dt; }
    pool.pos[o] += pool.vel[o] * dt; pool.pos[o + 1] += pool.vel[o + 1] * dt; pool.pos[o + 2] += pool.vel[o + 2] * dt;
    if (pool.pos[o + 1] < .25) { pool.life[i] = 0; pool.pos[o + 1] = -9999; }
   }
   pool === pw ? waterPts.geometry.attributes.position.needsUpdate = true : foamPts.geometry.attributes.position.needsUpdate = true;
  }
 }
 // the bucket tips: a thick column of water over the rinse
 function tipBucket(u, v) { bucket.userData.tip = 1; S.splash(1); for (let i = 0; i < 220; i++) spawn(pw, (Math.random() - .5) * 4.4 + v, 6 + Math.random() * 1.2, 23 + (Math.random() - .5) * 4.4 + (u - 23) * .3, (Math.random() - .5) * 2, -3 - Math.random() * 6, (Math.random() - .5) * 2 + 2, 1.4); }

 // ---- the grubby loaner, waiting in front of the entrance with a bubble that says "wash me" in a picture
 const loaner = buildMoonBuggy({...look(), dirt: 1, withRider: false}); loaner.group.name = 'loaner moon buggy'; loaner.group.scale.setScalar(VS); loaner.group.position.set(0, 0, -9); root.add(loaner.group);
 loaner.group.traverse(o => { if (o.isMesh) o.userData.loaner = true; });
 const bubble = new T.Sprite(new T.SpriteMaterial({map: dropTex(), depthTest: false, transparent: true})); bubble.name = 'wash me bubble'; bubble.scale.set(3, 3, 1); bubble.position.set(0, 9, -9); bubble.renderOrder = 9; root.add(bubble);
 const hit = new T.Mesh(new T.BoxGeometry(8, 7, 9), new T.MeshBasicMaterial({visible: false})); hit.name = 'tap area'; hit.position.set(0, 3.5, -9); root.add(hit);
 const showLoaner = () => { const on = !earned(); loaner.group.visible = on; bubble.visible = on; hit.visible = on; };
 showLoaner(); addEventListener('aw-buggy-earned', showLoaner);

 // ---- driving it: a hop-in start in front of the entrance, a plain drive (no kart laps), the chase camera
 let running = null, soak = 0, bucketDone = false, sparkles = [];
 const startPose = () => { const z = -11, x = root.position.x + Math.sin(heading) * z, zz = root.position.z + Math.cos(heading) * z; return {x, z: zz, heading}; };
 async function launch() {
  if (running || window.__effectHunt) return; running = 'loading';
  try {
   const m = await import('../effect-hunt/town-mount.mjs'); S.startBed();
   running = m.mountHunt({stage, mode: 'buggy', start: startPose(), kart: false, onExit: stopRun}); loaner.group.visible = false; bubble.visible = false;
   running.hunt.driver.s.vx = running.hunt.driver.s.vz = 0; soak = 0; bucketDone = false; api.running = running;
  } catch (e) { console.warn('carwash: could not start the buggy', e); running = null; }
 }
 function stopRun() { const r = running; running = null; api.running = null; if (r && r !== 'loading') r.dispose(); S.stopBed(); showLoaner(); soak = 0; lens.set(0); }
 const ray = new T.Raycaster(), ndc = new T.Vector2(); let down = null; const el = renderer.domElement;
 el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
 el.addEventListener('pointerup', e => {
  if (running || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !hit.visible || !dioGroup.visible) return;
  const rc = el.getBoundingClientRect(); ndc.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1); ray.setFromCamera(ndc, camera);
  if (ray.intersectObject(hit, false)[0]) launch();
 });

 // ---- the lens: a few water drops on the glass while she is soaked (meta: what Abbie feels)
 const lens = (() => {
  const c = document.createElement('canvas'); c.className = 'aw-lens'; c.dataset.ui = ''; Object.assign(c.style, {position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 30}); document.body.append(c);
  const g = c.getContext('2d'), drops = []; let level = 0;
  return {
   set(v) { level = v; }, get level() { return level; },
   frame(dt) {
    if (c.width !== innerWidth) { c.width = innerWidth; c.height = innerHeight; }
    if (level > .02 && drops.length < 46 && Math.random() < level * dt * 40) drops.push({x: Math.random() * c.width, y: Math.random() * c.height * .8, r: 6 + Math.random() * 16 * (.5 + level), a: 1, v: 6 + Math.random() * 30});
    g.clearRect(0, 0, c.width, c.height);
    for (let i = drops.length - 1; i >= 0; i--) { const d = drops[i]; d.y += d.v * dt; d.v *= 1 + dt * .6; d.a -= dt * (level > .02 ? .18 : .6); if (d.a <= 0) { drops.splice(i, 1); continue; }
     const gr = g.createRadialGradient(d.x - d.r * .3, d.y - d.r * .35, 1, d.x, d.y, d.r); gr.addColorStop(0, `rgba(255,255,255,${.65 * d.a})`); gr.addColorStop(.5, `rgba(190,230,255,${.18 * d.a})`); gr.addColorStop(1, `rgba(120,190,240,${.3 * d.a})`);
     g.fillStyle = gr; g.beginPath(); g.ellipse(d.x, d.y, d.r * .8, d.r * 1.1, 0, 0, 7); g.fill(); }
   }, dispose() { c.remove(); }
  };
 })();
 // her inner voice, as a small thought (the same voice the backpack uses), drawn for the player only
 function thought(text, ms = 4200) {
  const d = Object.assign(document.createElement('div'), {className: 'aw-wash-thought', textContent: text}); d.dataset.ui = '';
  Object.assign(d.style, {position: 'fixed', left: '50%', top: '16%', transform: 'translate(-50%,12px) scale(.9)', opacity: 0, zIndex: 40, pointerEvents: 'none', maxWidth: 'min(80vw,420px)', textAlign: 'center', padding: '12px 18px', borderRadius: '26px', font: '700 17px/1.3 "Patrick Hand",ui-rounded,system-ui,sans-serif', color: '#2a3350', background: 'radial-gradient(circle at 30% 20%,#fff,#e9f6ff)', boxShadow: '0 10px 24px #2a103044, inset 0 1px 2px #fff', transition: 'opacity .35s, transform .45s cubic-bezier(.2,1.4,.4,1)'});
  document.body.append(d); requestAnimationFrame(() => { d.style.opacity = 1; d.style.transform = 'translate(-50%,0) scale(1)'; }); setTimeout(() => { d.style.opacity = 0; d.style.transform = 'translate(-50%,-8px) scale(.95)'; setTimeout(() => d.remove(), 500); }, ms);
 }
 // the moment it becomes hers: a jingle, sparkles round the buggy, it shines, the charm goes on her backpack
 function theMomentItIsHers(drv, veh) {
  earn(); S.jingle(); veh?.setDirt(0);
  thought("Brrr! I'm soaked! But look at the Moon Buggy shine. It's mine now!");
  const s = drv.s; for (let i = 0; i < 70; i++) { const a = Math.random() * 6.283, sp = 3 + Math.random() * 7; sparkles.push({x: s.x, y: s.y + 3, z: s.z, vx: Math.cos(a) * sp, vy: 4 + Math.random() * 8, vz: Math.sin(a) * sp, t: 1.4 + Math.random() * .8, c: ['#fff6a8', '#ffd34d', '#ff7eb6', '#7fd6ff'][i % 4]}); }
  import('../backpack.mjs?v=9').then(B => B.earnCharm?.('moon-buggy')).catch(() => {});
  addEventListener('aw-buggy-earned', () => {}, {once: true});
 }
 const spkGeo = new T.BufferGeometry(), spkMax = 80, spkPos = new Float32Array(spkMax * 3), spkCol = new Float32Array(spkMax * 3); spkGeo.setAttribute('position', new T.BufferAttribute(spkPos, 3)); spkGeo.setAttribute('color', new T.BufferAttribute(spkCol, 3));
 const spk = new T.Points(spkGeo, new T.PointsMaterial({size: 2.2, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, alphaTest: .02})); spk.name = 'sparkles'; spk.frustumCulled = false; dioGroup.add(spk);

 // ---- every frame: the show, the conveyor, the soaking
 const tmpC = new T.Color(), wp = new T.Vector3(); let time = 0, shake = 0;
 const off = stage.frame((dt0, tm) => {
  const dt = Math.min(dt0 || .016, .05); time += dt;
  const hunt = window.__effectHunt, drv = hunt?.driver, s = drv?.s, veh = hunt?.vehicleRoot?.children?.[0]?.userData?.buggy;
  const vis = dioGroup.visible; root.visible = vis; if (!vis) return;
  // where the driver is, in the carwash's own frame: u along it, v across
  let u = -99, v = 0, inTunnel = false;
  if (s) { const dx = s.x - root.position.x, dz = s.z - root.position.z; u = dx * f.x + dz * f.z; v = dx * r.x + dz * r.z; inTunnel = u > 1 && u < L - .5 && Math.abs(v) < HW; }
  // the show wakes as someone comes near (a quiet idle for the rest of the time)
  const camD = camera.position.distanceTo(root.getWorldPosition(wp));
  const near = s ? clamp(1 - Math.hypot(u - L / 2, v) / 50, 0, 1) : clamp(1 - camD / 700, 0, 1) * .5;
  act += ((.18 + near * .95) - act) * Math.min(1, dt * 3);
  if (camD < 900 || s) stepParticles(dt);
  // the arches and brushes live: rollers spin, the curtain sways, fans whirr, bubbles drift, the belt crawls
  for (const sp of spinners) sp.rotation.y += sp.userData.dir * dt * (2 + near * 4);
  for (const st of strips) st.rotation.x = Math.sin(time * 2.2 + st.userData.p * .7) * (.08 + near * .12);
  for (const fn of fans) fn.rotation.z += dt * (3 + near * 14);
  bubbles.forEach(b => { const p = b.userData.p; b.position.y = 7 + (p * 1.7) % 6 + Math.sin(time * .8 + p) * .6; b.position.x = Math.sin(p * 2.1) * 6 + Math.cos(time * .5 + p) * .8; });
  beltTex.offset.y -= dt * CONVEY / 8 * (near > .05 ? 1 : .15);
  green.material.emissiveIntensity = 1.2 + Math.sin(time * 4) * .5; bucket.rotation.x = -bucket.userData.tip * 1.1 * Math.sin(Math.min(1, bucket.userData.tip) * Math.PI) ; bucket.userData.tip = Math.max(0, bucket.userData.tip - dt * .7);
  if (loaner.group.visible) { loaner.group.position.y = Math.max(0, Math.sin(time * 3) * .25) ; loaner.group.rotation.y = Math.sin(time * 1.2) * .06; bubble.position.y = 9 + Math.sin(time * 3) * .3; }
  { const want = s && u > -16 && u < L + 4 && Math.abs(v) < HW + 3 ? .18 : 1; fadeK += (want - fadeK) * Math.min(1, dt * 5); for (const m of fade) { m.transparent = fadeK < .99; m.opacity = fadeK; m.depthWrite = fadeK > .6; } for (const st of strips) st.visible = fadeK > .6; }
  const dt2 = (z) => Math.max(0, 1 - Math.abs(u - z) / 7);
  // sounds follow the player: spray at the rinse, brushes at the rollers, dryers at the end
  if (s && hunt?.mode === 'buggy') S.setLevels({spray: Math.max(dt2(8), dt2(23)) * .9 + .1 * near, dryer: dt2(29), brush: dt2(15), master: near + .2}); else if (s) S.setLevels({master: 0});
  if (!s) { lens.set(0); lens.frame(dt); return; }
  if (hunt.mode !== 'buggy') { lens.set(lens.level * .98); lens.frame(dt); return; }
  // the conveyor: inside the wash it carries the buggy through straight and steady
  const fv = s.vx * f.x + s.vz * f.z;
  if (inTunnel && fv > -1) {
   const hh = wrapPi(heading - s.heading); s.heading += hh * Math.min(1, dt * 4); const sp = Math.max(CONVEY, 0) , k = Math.min(1, dt * 3);
   s.vx += (f.x * sp - s.vx) * k; s.vz += (f.z * sp - s.vz) * k; s.x -= r.x * v * Math.min(1, dt * 2); s.z -= r.z * v * Math.min(1, dt * 2);
  }
  // soaking: a fine mist all through, the rinse a lot, the bucket the most; no roof, so all of it lands on her
  if (inTunnel) {
   const rinse = u > ZONE.rinse[0] && u < ZONE.rinse[1]; soak = clamp(soak + dt * (rinse ? .22 : u > ZONE.soap[0] ? .06 : .02), 0, 1);
   if (!bucketDone && u > 22.2 && u < 25) { bucketDone = true; tipBucket(u, v); soak = clamp(soak + .6, 0, 1); shake = 1; S.brr(); }
   if (u > ZONE.soap[0] && Math.random() < dt * 6 * near) S.pop();
   if (!earned()) veh?.setDirt(Math.min(veh.state.dirt, 1 - clamp((u - ZONE.soap[0]) / (ZONE.rinse[1] - ZONE.soap[0]), 0, 1)));
  } else soak = clamp(soak - dt * .045, 0, 1);
  if (u > L && u < L + 6 && soak > .6 && !earned() && Math.abs(v) < HW + 2) theMomentItIsHers(drv, veh);
  if (u > L + 8 || u < -30) bucketDone = bucketDone && inTunnel; // a fresh pass tips the bucket again
  veh?.setWet(soak); lens.set(inTunnel ? clamp(soak * 1.1, 0, 1) : soak * .6); lens.frame(dt);
  shake = Math.max(0, shake - dt * 1.4); if (shake > 0) { camera.position.x += (Math.random() - .5) * shake * .5; camera.position.y += (Math.random() - .5) * shake * .5; }
  // sparkles
  for (let i = 0; i < spkMax; i++) { const q = sparkles[i]; if (!q) { spkPos[i * 3 + 1] = -9999; continue; } q.t -= dt; q.vy -= 9 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; spkPos.set([q.x, q.y, q.z], i * 3); tmpC.set(q.c); spkCol.set([tmpC.r, tmpC.g, tmpC.b], i * 3); if (q.t <= 0) sparkles[i] = null; }
  sparkles = sparkles.filter(Boolean).slice(0, spkMax); spkGeo.attributes.position.needsUpdate = true; spkGeo.attributes.color.needsUpdate = true;
 });
 const api = {root, site, loaner, launch, stop: stopRun, running: null, lens, thought, get soak() { return soak; }, set soak(v) { soak = v; }, frame: off, dispose() { off(); lens.dispose(); root.removeFromParent(); stopRun(); }};
 return api;
}
