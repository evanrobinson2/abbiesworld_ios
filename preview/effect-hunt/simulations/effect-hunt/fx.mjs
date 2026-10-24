// The five new effects, each a small pooled thing that costs nothing until cast and cleans itself up after DURATION
// seconds. Paint is the sixth, and it is not here: it is the Paint the World module (see paint-bridge.mjs).
//   const fx = createFx({scene, heightAt})        heightAt(x, z) in scene metres
//   fx.cast('confetti', {x, z, heading})          restarts the effect there
//   fx.update(dt, driver?)                         every frame; the driver (optional) feels bubbles, mushrooms and snow
// All motion is simple: a few hundred triangles, one material per effect, instanced where there are many.
import * as T from 'three';

export const DURATION = 15;
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const m = (name, color, o = {}) => Object.assign(new T.MeshStandardMaterial({color, flatShading: true, roughness: .6, ...o}), {name});

export function createFx({scene, heightAt}) {
 const root = new T.Group(); root.name = 'effect-fx'; scene.add(root);
 const dummy = new T.Object3D(), fxs = {};
 let seed = 11;

 // ---- confetti cannon: 220 flat streamers burst up and flutter down
 {
  const N = 220, geo = new T.PlaneGeometry(.5, .22), mat = m('confetti', '#ffffff', {side: T.DoubleSide, emissive: '#ffffff', emissiveIntensity: .15});
  const mesh = new T.InstancedMesh(geo, mat, N); mesh.frustumCulled = false; mesh.visible = false; mesh.raycast = () => {}; root.add(mesh);
  const cols = ['#ff4fa3', '#ffd95a', '#7fe4ff', '#7dff9a', '#b57bff', '#ff8a2a'].map(c => new T.Color(c)); const P = [];
  fxs.confetti = {
   cast({x, z}) { const r = rng(seed++); P.length = 0; const y = heightAt(x, z); for (let i = 0; i < N; i++) { const a = r() * 6.283, sp = 3 + r() * 9; P.push({x, y: y + 1, z, vx: Math.cos(a) * sp * .6, vy: 14 + r() * 14, vz: Math.sin(a) * sp * .6, rx: r() * 6, ry: r() * 6, sp: 4 + r() * 8, ph: r() * 6}); mesh.setColorAt(i, cols[i % cols.length]); } mesh.instanceColor.needsUpdate = true; mesh.visible = true; this.t = 0; this.on = true; },
   update(dt) { this.t += dt; for (let i = 0; i < N; i++) { const p = P[i]; p.vy -= 9 * dt; p.vy = Math.max(p.vy, -3.2 - Math.sin(p.ph + this.t * 3) * .8); p.vx *= 1 - dt * .6; p.vz *= 1 - dt * .6; p.x += p.vx * dt + Math.sin(this.t * 3 + p.ph) * dt * 2; p.z += p.vz * dt; p.y += p.vy * dt; const g = heightAt(p.x, p.z) + .05; if (p.y < g) { p.y = g; p.vy = p.vx = p.vz = 0; } dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(p.rx + this.t * p.sp, p.ry + this.t * p.sp * .7, 0); dummy.scale.setScalar(1 - smooth(DURATION - 3, DURATION, this.t)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); } mesh.instanceMatrix.needsUpdate = true; },
   stop() { mesh.visible = false; this.on = false; }
  };
 }

 // ---- bubble burst: 34 soap bubbles drift up from a ring; inside the swarm you float a little
 {
  const N = 34, mat = m('bubble-film', '#bfefff', {transparent: true, opacity: .42, roughness: .05, metalness: .1, emissive: '#7fe4ff', emissiveIntensity: .25, depthWrite: false});
  const mesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), mat, N); mesh.frustumCulled = false; mesh.visible = false; mesh.raycast = () => {}; root.add(mesh);
  const B = []; let c = {x: 0, z: 0};
  fxs.bubbles = {
   lift: 0, cast({x, z}) { const r = rng(seed++); c = {x, z}; B.length = 0; for (let i = 0; i < N; i++) { const a = r() * 6.283, rr = 2 + r() * 11; B.push({x: x + Math.cos(a) * rr, z: z + Math.sin(a) * rr, h: r() * 3, s: 1 + r() * 2.2, vy: 1.8 + r() * 2.4, ph: r() * 6}); } mesh.visible = true; this.t = 0; this.on = true; },
   update(dt, driver) { this.t += dt; this.lift = 0; for (let i = 0; i < N; i++) { const b = B[i]; b.h += b.vy * dt; const gy = heightAt(b.x, b.z); const wob = 1 + Math.sin(this.t * 5 + b.ph) * .06; dummy.position.set(b.x + Math.sin(this.t + b.ph) * 1.2, gy + b.h, b.z + Math.cos(this.t * .8 + b.ph) * 1.2); dummy.scale.set(b.s * wob, b.s / wob, b.s * wob).multiplyScalar(1 - smooth(DURATION - 2, DURATION, this.t)); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); if (driver && Math.hypot(driver.s.x - b.x, driver.s.z - b.z) < b.s + 2 && Math.abs(driver.s.y - (gy + b.h)) < 7) this.lift = 1; } mesh.instanceMatrix.needsUpdate = true; if (driver && this.lift && driver.s.vy < 4) driver.s.vy += 22 * dt; },
   stop() { mesh.visible = false; this.on = false; }
  };
 }

 // ---- bounce mushrooms: seven springy caps; drive over one and boing
 {
  const stem = m('mushroom-stem', '#fff2dc'), cap = m('mushroom-cap', '#ff5a3c'), spot = m('mushroom-spot', '#ffffff');
  const make = () => { const g = new T.Group(); g.name = 'bounce-mushroom'; const s = new T.Mesh(new T.CylinderGeometry(.7, .95, 1.8, 8), stem); s.position.y = .9; const c = new T.Mesh(new T.SphereGeometry(2.2, 10, 6, 0, 6.283, 0, 1.45), cap); c.position.y = 1.5; g.add(s, c); for (let i = 0; i < 5; i++) { const a = i * 1.26, d = new T.Mesh(new T.IcosahedronGeometry(.32, 0), spot); d.position.set(Math.cos(a) * 1.35, 3.1 - (i % 2) * .5, Math.sin(a) * 1.35); d.scale.y = .5; g.add(d); } g.visible = false; root.add(g); return g; };
  const list = Array.from({length: 7}, () => ({g: make(), x: 0, z: 0, born: 0, sq: 0, cool: 0}));
  fxs.shrooms = {
   cast({x, z, heading = 0}) { const r = rng(seed++); this.t = 0; this.on = true; list.forEach((o, i) => { const a = heading + (i - 3) * .45, d = 9 + (i % 2) * 6 + r() * 4; o.x = x + Math.sin(a) * d; o.z = z + Math.cos(a) * d; o.born = i * .12; o.sq = 0; o.cool = 0; o.g.position.set(o.x, heightAt(o.x, o.z) - .2, o.z); o.g.rotation.y = r() * 6; o.g.scale.setScalar(.001); o.g.visible = true; o.cap = i % 3; }); },
   update(dt, driver) { this.t += dt; for (const o of list) { if (!o.g.visible) continue; const k = smooth(o.born, o.born + .5, this.t), e = k * (1 + Math.sin(k * 9) * .12 * (1 - k)), out = 1 - smooth(DURATION - 1.2, DURATION, this.t); o.sq = Math.max(0, o.sq - dt * 3); o.cool -= dt; const sq = Math.sin(o.sq * Math.PI) * .45; o.g.scale.set(e * out * (1 + sq * .6), e * out * (1 - sq), e * out * (1 + sq * .6)); if (driver && o.cool <= 0 && k > .8 && Math.hypot(driver.s.x - o.x, driver.s.z - o.z) < 3.4 && driver.s.y < heightAt(o.x, o.z) + 4.5) { driver.impulse(21 + Math.min(10, Math.abs(driver.s.speed) * .25)); o.sq = 1; o.cool = .6; } } },
   stop() { list.forEach(o => o.g.visible = false); this.on = false; }
  };
 }

 // ---- firefly swarm: 70 glowing motes that wander round the cart and light the ground
 {
  const N = 70, mat = m('firefly-glow', '#e6ff7a', {emissive: '#c8ff5a', emissiveIntensity: 2.2, roughness: 1}), mesh = new T.InstancedMesh(new T.OctahedronGeometry(.2, 0), mat, N); mesh.frustumCulled = false; mesh.visible = false; mesh.raycast = () => {}; root.add(mesh);
  const light = new T.PointLight('#d8ff6a', 0, 38, 1.6); light.name = 'firefly-light'; root.add(light);
  const F = []; let c = {x: 0, z: 0};
  fxs.fireflies = {
   cast({x, z}) { const r = rng(seed++); c = {x, z}; F.length = 0; for (let i = 0; i < N; i++) F.push({a: r() * 6.283, rr: 3 + r() * 10, h: 1 + r() * 5, sp: .4 + r() * .9, ph: r() * 6}); mesh.visible = true; this.t = 0; this.on = true; },
   update(dt, driver) { this.t += dt; const tx = driver ? driver.s.x : c.x, tz = driver ? driver.s.z : c.z; c.x += (tx - c.x) * Math.min(1, dt * 1.6); c.z += (tz - c.z) * Math.min(1, dt * 1.6); const out = 1 - smooth(DURATION - 2.5, DURATION, this.t), inn = smooth(0, .8, this.t); const gy = heightAt(c.x, c.z); for (let i = 0; i < N; i++) { const f = F[i]; f.a += f.sp * dt; const tw = .5 + .5 * Math.sin(this.t * 4 + f.ph); dummy.position.set(c.x + Math.cos(f.a) * f.rr, gy + f.h + Math.sin(this.t * 1.3 + f.ph) * 1.2 + 1.5, c.z + Math.sin(f.a) * f.rr); dummy.scale.setScalar((.4 + tw) * out * inn); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); } mesh.instanceMatrix.needsUpdate = true; light.position.set(c.x, gy + 6, c.z); light.intensity = 90 * out * inn; },
   stop() { mesh.visible = false; light.intensity = 0; this.on = false; }
  };
 }

 // ---- snow globe: a white patch on the ground, falling flakes, and the ground goes slippery
 {
  const N = 420, pts = new T.BufferGeometry(); pts.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
  const dot = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, '#fff'); r.addColorStop(.55, '#fff'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); return new T.CanvasTexture(c); })();
  const flakes = new T.Points(pts, new T.PointsMaterial({color: '#ffffff', map: dot, alphaTest: .05, size: .9, transparent: true, opacity: .9, depthWrite: false})); flakes.name = 'snow-flakes'; flakes.frustumCulled = false; flakes.visible = false; flakes.raycast = () => {}; root.add(flakes);
  const patchMat = m('snow-patch', '#f4fbff', {polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: .9, transparent: true});
  const R = 22, patch = new T.Mesh(new T.CircleGeometry(R, 40, 0, 6.283), patchMat); patch.name = 'snow-patch'; patch.visible = false; patch.raycast = () => {}; root.add(patch);
  // a draped disc: 5 rings by 40 segments, each vertex follows the ground
  const rings = 5, segs = 36, g2 = new T.BufferGeometry(), V = new Float32Array(((rings) * segs + 1) * 3), I = [];
  for (let r = 0; r < rings; r++) for (let s = 0; s < segs; s++) { const a = r * segs + s + 1, b = r * segs + (s + 1) % segs + 1; if (r === 0) I.push(0, a, b); else { const a0 = (r - 1) * segs + s + 1, b0 = (r - 1) * segs + (s + 1) % segs + 1; I.push(a0, a, b, a0, b, b0); } }
  g2.setAttribute('position', new T.BufferAttribute(V, 3)); g2.setIndex(I); patch.geometry = g2;
  let c = {x: 0, z: 0}; const S = [];
  fxs.snow = {
   cast({x, z}) { const r = rng(seed++); c = {x, z}; for (let i = 0; i < rings * segs + 1; i++) { const rr = i === 0 ? 0 : (Math.floor((i - 1) / segs) + 1) / rings * R * (.92 + .08 * Math.sin(i * 3.1)), a = ((i - 1) % segs) / segs * 6.283, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr; V.set([px, heightAt(px, pz) + .07, pz], i * 3); } g2.attributes.position.needsUpdate = true; g2.computeVertexNormals(); g2.computeBoundingSphere(); S.length = 0; for (let i = 0; i < N; i++) S.push({a: r() * 6.283, rr: Math.sqrt(r()) * 30, y: r() * 28, v: 2 + r() * 2.4, ph: r() * 6}); patch.visible = flakes.visible = true; patchMat.opacity = 0; this.t = 0; this.on = true; },
   update(dt, driver) { this.t += dt; const out = 1 - smooth(DURATION - 2, DURATION, this.t); patchMat.opacity = smooth(0, 1.2, this.t) * out * .92; const pa = pts.attributes.position; for (let i = 0; i < N; i++) { const f = S[i]; f.y -= f.v * dt; if (f.y < 0) f.y += 28; pa.setXYZ(i, c.x + Math.cos(f.a) * f.rr + Math.sin(this.t + f.ph) * 1.2, heightAt(c.x + Math.cos(f.a) * f.rr, c.z + Math.sin(f.a) * f.rr) + f.y, c.z + Math.sin(f.a) * f.rr); } pa.needsUpdate = true; flakes.material.opacity = .9 * out; if (driver && Math.hypot(driver.s.x - c.x, driver.s.z - c.z) < R) driver.slick(.3); },
   stop() { patch.visible = flakes.visible = false; this.on = false; }
  };
 }

 return {
  root, ids: Object.keys(fxs), has: id => !!fxs[id],
  cast(id, at) { const f = fxs[id]; if (!f) return false; f.cast(at); return true; },
  update(dt, driver) { for (const f of Object.values(fxs)) { if (!f.on) continue; f.update(dt, driver); if (f.t >= DURATION) f.stop(); } },
  active: () => Object.entries(fxs).filter(([, f]) => f.on).map(([id]) => id)
 };
}
