// Splat balls (AW-STUDY-0049, Evan 2026-10-23): spend the Paint card and you are given a handful of paint balls. They wait
// in a row along the top; drag one into the world and let go, and inertia does the rest. Each grant is random in
// two ways (Evan: "maybe # of balls and then effect size"): how many balls, and how big their splats are. A ball's own
// size shows which it is, so there is no text. The tray is the one overlay: it holds what you own, never world things.
//   rollGrant(rand?)               -> {count, size: {id, mult}, colours: [id, id]}
//   createBallTray({onThrow})      -> {grant(g), count(), el}
//   onThrow(ball, x, y, vx, vy)    pixels and pixels/second at release; return false to put the ball back
import {PAINT_COLOURS} from './alien-plants.mjs';

// Reasonable params: five balls is the usual hand; a regular splat is the size you saw first; tiny and giant are rare.
export const COUNTS = [[3, 1], [4, 2], [5, 4], [6, 2], [7, 1]];
export const SIZES = [{id: 'tiny', mult: .55, w: 1}, {id: 'small', mult: .78, w: 2}, {id: 'regular', mult: 1, w: 4}, {id: 'big', mult: 1.35, w: 2}, {id: 'giant', mult: 1.6, w: 1}];
const PAIRS = [['pink', 'teal'], ['lime', 'violet'], ['sun', 'pink'], ['teal', 'violet'], ['sun', 'lime']];
const pick = (list, weight, rand) => { let t = list.reduce((a, x) => a + weight(x), 0) * rand(); for (const x of list) if ((t -= weight(x)) <= 0) return x; return list[list.length - 1]; };
export function rollGrant(rand = Math.random) {
 return {count: pick(COUNTS, c => c[1], rand)[0], size: pick(SIZES, s => s.w, rand), colours: PAIRS[Math.floor(rand() * PAIRS.length)]};
}
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

const CSS = `#paint-balls{display:flex;flex-direction:row;align-items:center;gap:5px;pointer-events:none;max-width:62vw;overflow:visible}
.pb-ball{border:0;padding:0;border-radius:50%;pointer-events:auto;cursor:grab;touch-action:none;flex:none;position:relative;box-shadow:0 5px 10px rgba(0,0,0,.3),inset 0 -5px 8px rgba(0,0,0,.25);transition:transform .2s cubic-bezier(.2,1.5,.4,1)}
.pb-ball::after{content:"";position:absolute;left:22%;top:16%;width:30%;height:24%;border-radius:50%;background:rgba(255,255,255,.85);transform:rotate(-30deg)}
.pb-ball:hover{transform:scale(1.1)}.pb-ball:focus-visible{outline:3px solid #fff;outline-offset:2px}
.pb-ball.new{animation:pb-in .55s cubic-bezier(.2,1.5,.4,1) both}
@keyframes pb-in{from{transform:translateY(-34px) scale(.3);opacity:0}}
.pb-held{position:fixed;z-index:30;pointer-events:none;border-radius:50%;transform:translate(-50%,-50%) scale(1.15);box-shadow:0 14px 22px rgba(0,0,0,.35),inset 0 -5px 8px rgba(0,0,0,.25)}
@media (prefers-reduced-motion:reduce){.pb-ball.new{animation:none}}`;

export function createBallTray({onThrow, parent = document.body}) {
 if (!document.getElementById('pb-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'pb-css', textContent: CSS}));
 const el = document.createElement('div'); el.id = 'paint-balls'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Paint balls. Drag one into the world.');
 parent.append(el);
 const balls = []; // {colour, size, R, node}
 const paintBall = (node, b) => { const c = PAINT_COLOURS[b.colour], px = Math.round(20 + 18 * Math.min(1.6, b.size.mult)); node.style.width = node.style.height = px + 'px'; node.style.background = `radial-gradient(circle at 34% 30%, ${mix(c.paint, '#ffffff', .55)} 0 12%, ${c.paint} 46%, ${c.deep} 100%)`; return px; };
 function addBall(b) {
  const node = document.createElement('button'); node.type = 'button'; node.className = 'pb-ball new'; node.setAttribute('aria-label', 'Paint ball, drag it into the world');
  paintBall(node, b); b.node = node; balls.push(b); el.append(node);
  node.addEventListener('animationend', () => node.classList.remove('new'));
  node.addEventListener('pointerdown', e => start(e, b));
 }
 function start(e, b) {
  e.preventDefault(); e.stopPropagation();
  const held = document.createElement('div'); held.className = 'pb-held'; const px = paintBall(held, b); held.style.left = e.clientX + 'px'; held.style.top = e.clientY + 'px'; document.body.append(held);
  b.node.style.visibility = 'hidden';
  const trail = [{x: e.clientX, y: e.clientY, t: performance.now()}], id = e.pointerId;
  const move = ev => { if (ev.pointerId !== id) return; held.style.left = ev.clientX + 'px'; held.style.top = ev.clientY + 'px'; const t = performance.now(); trail.push({x: ev.clientX, y: ev.clientY, t}); while (trail.length > 2 && t - trail[0].t > 120) trail.shift(); };
  const end = ev => {
   if (ev.pointerId !== id) return; removeEventListener('pointermove', move); removeEventListener('pointerup', end); removeEventListener('pointercancel', end); held.remove();
   const a = trail[0], z = trail[trail.length - 1], dt = Math.max(.016, (z.t - a.t) / 1000), vx = (z.x - a.x) / dt, vy = (z.y - a.y) / dt;
   const hr = el.getBoundingClientRect(), home = Math.hypot(vx, vy) < 200 && ev.clientY < hr.bottom + 14 && ev.clientX > hr.left - 14 && ev.clientX < hr.right + 14; // let go on the strip: put it back
   if (ev.type === 'pointercancel' || home || onThrow(b, ev.clientX, ev.clientY, Math.max(-3000, Math.min(3000, vx)), Math.max(-3000, Math.min(3000, vy))) === false) { b.node.style.visibility = ''; return; }
   balls.splice(balls.indexOf(b), 1); b.node.remove();
  };
  addEventListener('pointermove', move); addEventListener('pointerup', end); addEventListener('pointercancel', end);
 }
 return {el, count: () => balls.length,
  grant(g) { for (let i = 0; i < g.count && balls.length < 14; i++) addBall({colour: g.colours[i % g.colours.length], size: g.size, R: g.size.mult}); return balls.length; }};
}

// A release at screen (x, y) px with velocity (vx, vy) px/s becomes a ground launch: where the finger is on the ground
// plane at the camera target's height, and the flick mapped onto the ground by the camera's right and forward.
// Units follow the scene (the caller's world units per second). Returns null when the finger is above the horizon.
export function groundThrow(T, camera, canvas, target, x, y, vx, vy) {
 const r = canvas.getBoundingClientRect(), ray = new T.Raycaster();
 ray.setFromCamera(new T.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height * 2 - 1)), camera);
 const t = (target.y - ray.ray.origin.y) / ray.ray.direction.y; if (!(t > 0)) return null;
 const P = ray.ray.at(t, new T.Vector3()), f = new T.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
 const rt = new T.Vector3().crossVectors(f, new T.Vector3(0, 1, 0)).normalize();
 const k = 2 * camera.position.distanceTo(target) * Math.tan(camera.fov * Math.PI / 360) / r.height * .5;
 return {x: P.x, z: P.z, vx: (rt.x * vx - f.x * vy) * k, vz: (rt.z * vx - f.z * vy) * k};
}
