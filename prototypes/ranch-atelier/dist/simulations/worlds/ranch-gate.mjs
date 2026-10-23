// AW-STUDY-0048: the ranch gate, the way out of the Ranch (the sandbox) into Abbie's Town, and the first in-game ride.
// It is a world object (a wooden gate with a painted sign of the town's steeple, no words) on the rim of the board. Tapping it
// pulls the camera through the gate, then the player arrives in the town at the gate's own scene. The way back is the
// town's ranch gate (simulations/abbietown/entrances.mjs, 'town:ranch-gate', url '/?from=town').
// Gate ids are those of worlds/worlds.mjs ('ranch:gate' pairs with 'town:ranch-gate').
export const RANCH_GATE = {id: 'ranch:gate', name: 'The ranch gate', kind: 'ride', to: 'town:ranch-gate', url: '/town?at=town:ranch-gate', family: 'ranch', owner: 'AW-STUDY-0048'};
export const rideUrl = (gate = RANCH_GATE) => gate.url;

// Where on the rim the gate stands: a bearing in the board's x/z plane (front-left, toward the default camera) and how far
// out from the centre as a fraction of the board's radius. The loop walks inward until the board's ground is found.
export function gateSpot(bounds, ground, bearing = 325, from = .84) {
 const cx = (bounds.min.x + bounds.max.x) / 2, cz = (bounds.min.z + bounds.max.z) / 2, r = Math.min(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) / 2;
 for (let f = from; f >= .3; f -= .04) {
  const x = cx + Math.sin(bearing * Math.PI / 180) * r * f, z = cz + Math.cos(bearing * Math.PI / 180) * r * f, y = ground(x, z);
  if (y != null) return {x, y, z, facing: Math.atan2(x - cx, z - cz), f};
 }
 return null;
}

function signTexture(T) {
 const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
 g.fillStyle = '#f4ead2'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#6b4220'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120);
 g.fillStyle = '#c8502c'; g.fillRect(34, 66, 60, 38); g.fillStyle = '#7a2410'; g.beginPath(); g.moveTo(28, 68); g.lineTo(64, 38); g.lineTo(100, 68); g.fill(); // a little house
 g.fillStyle = '#fff'; g.fillRect(58, 82, 12, 22); g.fillStyle = '#4f8f4a'; g.beginPath(); g.arc(104, 94, 11, 0, 7); g.fill();
 const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
export function buildGate(T) {
 const g = new T.Group(); g.name = 'ranch-gate';
 const wood = new T.MeshStandardMaterial({color: '#8b5a2b', roughness: .9, flatShading: true}), dark = new T.MeshStandardMaterial({color: '#6b4220', roughness: .9, flatShading: true});
 const box = (w, h, d, x, y, z, m = wood) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
 box(.09, .62, .09, -.55, .31, 0, dark); box(.09, .62, .09, .55, .31, 0, dark);
 for (const y of [.2, .42]) box(1.0, .06, .05, 0, y, 0);
 box(.5, .06, .05, 0, .31, 0).rotation.z = .45;
 const sign = new T.Mesh(new T.BoxGeometry(.3, .3, .04), [dark, dark, dark, dark, new T.MeshStandardMaterial({map: signTexture(T), roughness: .8}), dark]); sign.position.set(.55, .78, 0); sign.castShadow = true; g.add(sign);
 box(.04, .18, .04, .55, .62, 0, dark);
 g.userData.ride = RANCH_GATE; return g;
}

// Put the gate in the scene once the ranch is ready; keep it on the rim if the board changes. Tapping it goes to the town.
export function installRanchGate({T, scene, camera, orbit, canvas, ready, bounds, world, stopFollow, navigate = u => location.assign(u)}) {
 let gate = null, last = '', riding = false, down = null;
 const ray = new T.Raycaster(), ptr = new T.Vector2();
 const setPtr = e => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); };
 const onGate = e => { if (!gate) return false; setPtr(e); return ray.intersectObject(gate, true).length > 0; };
 function place() {
  const w = world?.(), b = bounds?.(); if (!ready() || !w || !b) return;
  const key = [b.min.x, b.max.x, b.min.z, b.max.z].map(v => v.toFixed(2)).join(); if (gate && key === last) return; last = key;
  const down = new T.Raycaster(); down.camera = camera; // sprites (labels, smoke) need a camera to be raycast
  const ground = (x, z) => { down.set(new T.Vector3(x, 30, z), new T.Vector3(0, -1, 0)); let hits = []; try { hits = down.intersectObject(w, true); } catch { return null; } // the lowest upward-facing surface is the ground, not a tree top or a roof
   const up = hits.filter(i => i.object.isMesh && !i.object.isSprite && i.face && i.face.normal.clone().transformDirection(i.object.matrixWorld).y > .6); return up.length ? up.at(-1).point.y : null; };
  if (gate) { scene.remove(gate); gate = null; }
  const spot = gateSpot(b, ground); if (!spot) return;
  gate = buildGate(T); gate.position.set(spot.x, spot.y, spot.z); gate.rotation.y = Math.atan2(camera.position.x - spot.x, camera.position.z - spot.z); // faces the player's side of the board gate.scale.setScalar(1.35); scene.add(gate);
 }
 const timer = setInterval(place, 800); place();
 canvas.addEventListener('pointerdown', e => { down = {x: e.clientX, y: e.clientY, id: e.pointerId}; }, true);
 canvas.addEventListener('pointermove', e => { if (!riding) canvas.style.cursor = gate && onGate(e) ? 'pointer' : ''; }, true);
 canvas.addEventListener('pointerup', e => {
  const d = down; down = null; if (!d || d.id !== e.pointerId || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5 || riding || !onGate(e)) return;
  e.stopImmediatePropagation(); ride();
 }, true);
 // The ride: the camera walks up to the gate and through it, the way a person would, then the town loads at its own gate.
 async function ride() {
  riding = true; stopFollow?.(); orbit.enabled = false;
  const p = gate.position.clone(), out = new T.Vector3(Math.sin(gate.rotation.y), 0, Math.cos(gate.rotation.y)), c0 = camera.position.clone(), t0 = orbit.target.clone();
  const c1 = p.clone().add(out.clone().multiplyScalar(1.7)).add(new T.Vector3(0, .9, 0)), c2 = p.clone().sub(out.clone().multiplyScalar(1.2)).add(new T.Vector3(0, .6, 0)), tg = p.clone().add(new T.Vector3(0, .35, 0));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const leg = (from, to, ms, tf, tt) => new Promise(res => { if (reduced) { camera.position.copy(to); orbit.target.copy(tt); orbit.update(); return res(); } const s = performance.now(); (function f(n) { const k = ease(Math.min(1, (n - s) / ms)); camera.position.lerpVectors(from, to, k); orbit.target.lerpVectors(tf, tt, k); camera.lookAt(orbit.target); k < 1 ? requestAnimationFrame(f) : res(); })(s); });
  await leg(c0, c1, 900, t0, tg); await leg(c1, c2, 700, tg, tg);
  window.dispatchEvent(new CustomEvent('ranch:ride', {detail: {gate: RANCH_GATE.id, to: RANCH_GATE.to}}));
  navigate(rideUrl());
 }
 return {gate: () => gate, ride, dispose: () => { clearInterval(timer); if (gate) scene.remove(gate); }};
}
