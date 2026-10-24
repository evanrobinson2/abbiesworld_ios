import {sfx as catalogSfx} from './catalog-sfx.mjs';
// The gold coin reward (Evan, 2026-10-23: "a very special prize"). The coins are Daddy's core memories, so finding one is
// a moment: the coin lifts out of the world toward you, turns over in a burst of warm light and sparkles to a chiming
// fanfare, then flies up and away to be kept. Meta mode: it is felt, not read. No words, nothing masks the world, and
// it lives on the presentation layer so no character or AI perceives it. Shared by Grace's basement and the school jump.
//
//   const reward = coinReward(T, {scene, camera, from: worldPos, coin: optionalMesh, audio: audioContext, presentation});
//   each frame: if (reward && !reward.update(dt)) reward = null;
const tex = {};
function raysTexture(T) {
 if (tex.rays) return tex.rays;
 const c = Object.assign(document.createElement('canvas'), {width: 256, height: 256}), g = c.getContext('2d');
 const r = g.createRadialGradient(128, 128, 4, 128, 128, 126); r.addColorStop(0, 'rgba(255,244,200,1)'); r.addColorStop(.25, 'rgba(255,214,110,.55)'); r.addColorStop(1, 'rgba(255,190,60,0)');
 g.fillStyle = r; g.fillRect(0, 0, 256, 256);
 g.translate(128, 128); g.globalCompositeOperation = 'lighter';
 for (let i = 0; i < 14; i++) { g.rotate(Math.PI * 2 / 14); const w = i % 2 ? 7 : 12; const l = g.createLinearGradient(0, 0, 124, 0); l.addColorStop(0, 'rgba(255,236,160,.75)'); l.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = l; g.beginPath(); g.moveTo(0, -w / 2); g.lineTo(124, -1); g.lineTo(124, 1); g.lineTo(0, w / 2); g.fill(); }
 return (tex.rays = new T.CanvasTexture(c));
}
function sparkTexture(T) {
 if (tex.spark) return tex.spark;
 const c = Object.assign(document.createElement('canvas'), {width: 32, height: 32}), g = c.getContext('2d');
 g.fillStyle = '#fff'; g.fillRect(14, 2, 4, 28); g.fillRect(2, 14, 28, 4); g.fillStyle = '#ffe9a0'; g.fillRect(12, 12, 8, 8);
 const t = new T.CanvasTexture(c); t.magFilter = T.NearestFilter; return (tex.spark = t);
}
function plainCoin(T) {
 const m = new T.Mesh(new T.CylinderGeometry(.16, .16, .03, 24), new T.MeshStandardMaterial({color: '#ffcc33', metalness: .85, roughness: .25, emissive: '#7a5400', emissiveIntensity: .4, name: 'coin gold'}));
 m.rotation.x = Math.PI / 2; const g = new T.Group(); g.add(m); return g;
}
function fanfare(ac) {
 // the coin, a rising fanfare, then sparkle: all from the sound catalogue
 catalogSfx('coin-2', {gain: .8}); catalogSfx('tada', {gain: .8, delay: .4}); catalogSfx('sparkle-1', {gain: .7, delay: 1.1});
}

export function coinReward(T, {scene, camera, from, coin = null, audio = null, presentation = o => o}) {
 const group = presentation(new T.Group(), {purpose: 'gold coin reward'}); group.name = 'coin reward';
 const c = coin ? coin.clone() : plainCoin(T); c.visible = true; c.position.set(0, 0, 0); c.scale.setScalar(1); // keep the coin's own tilt
 const holder = new T.Group(); holder.add(c); group.add(holder);
 const light = new T.PointLight('#ffd27a', 0, 3, 2); light.position.set(0, .3, .6); group.add(light);
 const rays = new T.Sprite(new T.SpriteMaterial({map: raysTexture(T), transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, opacity: 0}));
 rays.renderOrder = 998; group.add(rays);
 const sparks = Array.from({length: 26}, (_, i) => {
  const s = new T.Sprite(new T.SpriteMaterial({map: sparkTexture(T), transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, opacity: 0, color: i % 3 ? '#ffe28a' : '#ffffff'}));
  s.renderOrder = 999; const a = Math.random() * Math.PI * 2, e = (Math.random() - .5) * 1.4;
  s.userData.dir = new T.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + .2, Math.sin(a) * Math.cos(e)); s.userData.speed = .35 + Math.random() * .55; s.userData.spin = Math.random() * 6;
  group.add(s); return s;
 });
 c.traverse(o => { if (o.isMesh) { o.renderOrder = 1000; o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); for (const m of [].concat(o.material)) { m.depthTest = false; } } });
 scene.add(group);
 fanfare(audio);
 const start = from.clone(), t0 = {t: 0}, fwd = new T.Vector3(), up = new T.Vector3(), right = new T.Vector3();
 const ease = x => 1 - Math.pow(1 - x, 3), smooth = x => x * x * (3 - 2 * x);
 const LIFT = .9, HOLD = 1.9, AWAY = .7, END = LIFT + HOLD + AWAY;
 return {
  group,
  update(dt) {
   const t = (t0.t += dt);
   camera.getWorldDirection(fwd); up.copy(camera.up).applyQuaternion(camera.quaternion).normalize(); right.crossVectors(fwd, up).normalize();
   const dist = .9 + .25 * Math.min(1, camera.position.distanceTo(start) / 20);
   const front = camera.position.clone().addScaledVector(fwd, dist).addScaledVector(up, .04);
   const away = camera.position.clone().addScaledVector(fwd, dist * 1.4).addScaledVector(up, .9).addScaledVector(right, .55);
   const fitScale = dist * Math.tan((camera.fov || 50) * Math.PI / 360) * .55; // the coin fills about a quarter of the view height
   let pos, scale, glow;
   if (t < LIFT) { const k = ease(t / LIFT); pos = start.clone().lerp(front, k); pos.y += Math.sin(k * Math.PI) * .3; scale = .4 + (fitScale / .16 - .4) * k; glow = k; }
   else if (t < LIFT + HOLD) { const k = (t - LIFT) / HOLD; pos = front.clone().addScaledVector(up, Math.sin(k * Math.PI * 2) * .01); scale = fitScale / .16 * (1 + .08 * Math.sin(Math.min(1, k * 4) * Math.PI)); glow = 1; }
   else { const k = smooth(Math.min(1, (t - LIFT - HOLD) / AWAY)); pos = front.clone().lerp(away, k); scale = fitScale / .16 * (1 - .85 * k); glow = 1 - k; }
   group.position.copy(pos); holder.scale.setScalar(scale * .16 / .16);
   holder.quaternion.copy(camera.quaternion);
   // the turn: fast spins that slow to face you, then a slow shimmer turn
   const spin = t < LIFT ? t * 14 : t < LIFT + HOLD ? Math.max(0, (LIFT + .7 - t)) * 10 + Math.sin((t - LIFT) * 2.2) * .35 : (t - LIFT - HOLD) * 9;
   holder.rotateY(spin);
   rays.scale.setScalar(scale * .16 * 3.4 * (.85 + .15 * Math.sin(t * 3))); rays.material.rotation = t * .35; rays.material.opacity = .6 * glow;
   light.intensity = 1.2 * glow;
   const burst = t - LIFT * .8;
   for (const s of sparks) {
    if (burst < 0) continue;
    const d = s.userData.speed * (1 - Math.exp(-burst * 3)) * scale * .16 * 3.2;
    s.position.copy(s.userData.dir).multiplyScalar(d); s.material.rotation = t * s.userData.spin;
    s.material.opacity = Math.max(0, Math.min(1, burst * 4) * (1 - burst / (HOLD + .4))) * (.6 + .4 * Math.sin(t * 20 + s.userData.spin * 9));
    s.scale.setScalar(scale * .16 * .5);
   }
   if (t >= END) { scene.remove(group); return false; }
   return true;
  },
 };
}
