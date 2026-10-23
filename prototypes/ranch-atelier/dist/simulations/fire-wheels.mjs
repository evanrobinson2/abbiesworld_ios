// Fire wheels (Evan, 2026-10-23 23:21Z): winning the toy-car coaster earns the Toy car charm, and the charm unlocks a card
// that makes your wheels trail fire wherever you drive (the coaster now; kart and first-person car mode when they exist).
// One switch shared by every game, one trail anyone can attach to a car's wheels:
//   import {fireWheelsUnlocked, fireWheelsOn, setFireWheels, onFireWheels, fireTrail} from '/simulations/fire-wheels.mjs';
//   const trail = fireTrail(T, scene); each frame: trail.update(dt, wheels, speed)   (wheels: Object3Ds at the tyres)
// The card (event deck) calls setFireWheels(true); a game reads fireWheelsOn() and listens with onFireWheels(fn).
// The flames are in the world: characters can see a car on fire-wheels go by.
import {earnedCharms} from './backpack.mjs';

const KEY = 'aw-fire-wheels', EVENT = 'aw-fire-wheels', CHARM = 'toy-car';
export const fireWheelsUnlocked = () => { try { return earnedCharms().includes(CHARM); } catch { return false; } };
export const fireWheelsOn = () => { try { return fireWheelsUnlocked() && localStorage.getItem(KEY) === '1'; } catch { return false; } };
export function setFireWheels(on) {
  if (on && !fireWheelsUnlocked()) return false;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
  dispatchEvent(new CustomEvent(EVENT, {detail: {on: !!on}})); return true;
}
export const onFireWheels = fn => { const h = e => fn(e.detail.on); addEventListener(EVENT, h); return () => removeEventListener(EVENT, h); };

// A pool of glowing puffs left behind each wheel: born white-gold at the tyre, fading through orange to red smoke.
export function fireTrail(T, scene, {max = 900, size = .5} = {}) {
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), life = new Float32Array(max), vel = new Float32Array(max * 3);
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3));
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  const mat = new T.PointsMaterial({size, map: new T.CanvasTexture(cv), vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending, name: 'fire trail glow'});
  const pts = new T.Points(g, mat); pts.name = 'fire wheels trail'; pts.frustumCulled = false; scene.add(pts);
  let head = 0, carry = 0; const w = new T.Vector3(), c = new T.Color(), gold = new T.Color('#fff2b0'), orange = new T.Color('#ff7a14'), red = new T.Color('#b0201a');
  for (let i = 0; i < max; i++) pos[i * 3 + 1] = -1e5;
  return {
    object: pts,
    update(dt, wheels, speed = 10, on = true) {
      if (on && wheels?.length) { carry += dt * Math.min(140, 30 + speed * 6) ; while (carry >= 1) { carry--; for (const wh of wheels) {
        wh.getWorldPosition(w); const i = head; head = (head + 1) % max; pos.set([w.x + (Math.random() - .5) * .12, w.y - .05 + Math.random() * .1, w.z + (Math.random() - .5) * .12], i * 3);
        vel.set([(Math.random() - .5) * .6, .6 + Math.random() * .8, (Math.random() - .5) * .6], i * 3); life[i] = 1; } } }
      for (let i = 0; i < max; i++) { if (life[i] <= 0) continue; life[i] -= dt * 1.8; const l = Math.max(0, life[i]);
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        if (l > .6) c.copy(orange).lerp(gold, (l - .6) / .4); else c.copy(red).lerp(orange, l / .6); c.multiplyScalar(l);
        col.set([c.r, c.g, c.b], i * 3); if (l === 0) pos[i * 3 + 1] = -1e5; }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
    dispose() { scene.remove(pts); g.dispose(); mat.dispose(); },
  };
}
