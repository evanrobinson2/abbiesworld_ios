// The garden: oversized flowers and crayons, a parent bug you drag, and a family of coloured bugs hiding in it. Shared by
// experiment 8 (the search / collect / follow loop) and experiment 7 (progress as companions). Each bug differs in colour
// AND shape AND marking so no one has to rely on colour alone (experiment 9).
import {$, fit, devPanel} from './common.js';
const BUGS = [
 {id: 'ladybird', col: '#e63946', shape: 'round', mark: 'spots'}, {id: 'bee', col: '#ffcf33', shape: 'oval', mark: 'stripes'},
 {id: 'beetle', col: '#3fc6e8', shape: 'shield', mark: 'line'}, {id: 'ant', col: '#7bd95b', shape: 'long', mark: 'none'},
 {id: 'moth', col: '#b678ff', shape: 'wings', mark: 'dots'}, {id: 'pill', col: '#ff8f3d', shape: 'seg', mark: 'rings'}
];
function bugPath(c, b, r) { c.beginPath();
 if (b.shape === 'round') c.arc(0, 0, r, 0, 7); else if (b.shape === 'oval') c.ellipse(0, 0, r * 1.15, r * .8, 0, 0, 7);
 else if (b.shape === 'shield') { c.moveTo(0, -r); c.lineTo(r, -r * .2); c.lineTo(r * .7, r); c.lineTo(-r * .7, r); c.lineTo(-r, -r * .2); c.closePath(); }
 else if (b.shape === 'long') c.ellipse(0, 0, r * 1.5, r * .6, 0, 0, 7);
 else if (b.shape === 'wings') { c.ellipse(-r * .7, 0, r * .8, r, -.4, 0, 7); c.ellipse(r * .7, 0, r * .8, r, .4, 0, 7); }
 else { for (let i = -1; i <= 1; i++) c.arc(i * r * .8, 0, r * .55, 0, 7); } }
export function drawBug(c, b, x, y, r, {ang = 0, a = 1, ghost = false, t = 0} = {}) {
 c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = a;
 const wob = Math.sin(t * 14 + x) * .08; c.rotate(wob);
 bugPath(c, b, r); c.fillStyle = ghost ? '#0000001f' : b.col; c.fill();
 if (!ghost) { c.lineWidth = 2.5; c.strokeStyle = '#3b2d4a'; c.stroke(); c.save(); bugPath(c, b, r); c.clip(); c.fillStyle = '#3b2d4a';
  if (b.mark === 'spots') for (const [u, v] of [[-.4, -.3], [.4, -.1], [0, .45]]) { c.beginPath(); c.arc(u * r, v * r, r * .18, 0, 7); c.fill(); }
  if (b.mark === 'stripes') for (let i = -1; i <= 1; i++) c.fillRect(i * r * .55 - r * .12, -r, r * .24, r * 2);
  if (b.mark === 'line') c.fillRect(-r * .06, -r, r * .12, r * 2);
  if (b.mark === 'dots') for (const [u, v] of [[-.7, 0], [.7, 0]]) { c.beginPath(); c.arc(u * r, v * r, r * .2, 0, 7); c.fill(); }
  if (b.mark === 'rings') for (const i of [-.8, 0, .8]) { c.beginPath(); c.arc(i * r, 0, r * .3, 0, 7); c.stroke(); }
  c.restore(); c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * .3, -r * .35, r * .2, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#3b2d4a'; c.beginPath(); c.arc(s * r * .3, -r * .35, r * .08, 0, 7); c.fill(); c.fillStyle = '#fff'; } }
 c.restore();
}
export function startGarden({canvas, mode, demo = true}) {
 let {c, w, h} = fit(canvas); const S = () => Math.min(w, h * .8);
 const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
 const scenery = [], hides = [];
 const build = () => { scenery.length = 0; hides.length = 0;
  const cols = ['#ff7eb6', '#ffd23f', '#9b7bff', '#5ec9f0', '#ff9b54', '#7bd95b'];
  for (let i = 0; i < 6; i++) scenery.push({k: 'flower', x: .12 + (i % 3) * .38 + (rnd() - .5) * .08, y: .3 + Math.floor(i / 3) * .32 + rnd() * .06, r: .12, col: cols[i]});
  for (let i = 0; i < 5; i++) scenery.push({k: 'crayon', x: .1 + i * .2, y: .88 + (rnd() - .5) * .03, r: .1, col: cols[(i + 2) % 6], rot: (rnd() - .5) * .8});
  // each bug sits half-hidden behind a flower or a crayon, so a search is "look behind the big things"
  BUGS.forEach((b, i) => { const sc = scenery[(i * 2 + 1) % scenery.length]; hides.push({b, x: sc.x + (i % 2 ? .05 : -.05), y: sc.y + (sc.k === 'flower' ? .05 : -.04), found: false, fly: 0, vx: 0, vy: 0}); });
 };
 build();
 const parent = {x: .5, y: .62, tx: .5, ty: .62}, tail = []; // tail: found bugs in the order they joined
 let down = false, t0 = performance.now(), celebrate = 0, rounds = 0, firstFindAt = null, taps = 0, demoOn = demo, demoT = 0;
 canvas.addEventListener('pointerdown', e => { down = true; demoOn = false; taps++; canvas.setPointerCapture(e.pointerId); aim(e); });
 canvas.addEventListener('pointermove', e => { if (down) aim(e); }); canvas.addEventListener('pointerup', () => down = false);
 const aim = e => { parent.tx = e.clientX / w; parent.ty = e.clientY / h; };
 function join(hd) { hd.found = true; hd.pop = 1; tail.push(hd); if (firstFindAt == null) firstFindAt = performance.now() - t0; }
 function step(dt) {
  if (demoOn) { demoT += dt; const first = hides[0], k = Math.min(1, demoT / 2.2); parent.tx = .5 + (first.x - .5) * k; parent.ty = .62 + (first.y - .62) * k; if (first.found) demoOn = false; }
  const sp = 1 - Math.pow(.0009, dt); parent.x += (parent.tx - parent.x) * sp; parent.y += (parent.ty - parent.y) * sp;
  if (!celebrate) for (const hd of hides) if (!hd.found && Math.hypot((hd.x - parent.x) * w, (hd.y - parent.y) * h) < S() * .09) join(hd);
  // the line follows: each bug aims at the one ahead, keeping a gap, so the family reads as a train
  let prev = parent; for (const hd of tail) { if (hd.fly) continue; const dx = prev.x - hd.x, dy = prev.y - hd.y, d = Math.hypot(dx * w, dy * h), gap = S() * .075; if (d > gap) { const k = (d - gap) / d * (1 - Math.pow(.002, dt)); hd.x += dx * k; hd.y += dy * k; } hd.ang = Math.atan2(dy, dx) + Math.PI / 2; prev = hd; }
  if (tail.length === hides.length && !celebrate) celebrate = performance.now(); // a short flourish, then easy replay
  if (celebrate) { const e = (performance.now() - celebrate) / 1000; for (const hd of tail) { hd.fly = e; hd.y -= dt * (.06 + e * .25); hd.x += Math.sin(e * 6 + hd.x * 9) * dt * .1; } if (e > 2.6) { build(); tail.length = 0; celebrate = 0; rounds++; parent.x = parent.tx = .5; parent.y = parent.ty = .62; } }
 }
 function drawScenery() {
  c.fillStyle = '#bff0a8'; c.fillRect(0, 0, w, h); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffffff55'); g.addColorStop(1, '#4d8a3a33'); c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (const s of scenery) { const R = s.r * S(), x = s.x * w, y = s.y * h; c.save(); c.translate(x, y); c.lineWidth = 3; c.strokeStyle = '#3b2d4a'; c.lineJoin = 'round';
   if (s.k === 'flower') { c.fillStyle = '#4d9a3a'; c.fillRect(-4, 0, 8, R * 2.2); c.fillStyle = s.col; for (let i = 0; i < 6; i++) { c.save(); c.rotate(i * Math.PI / 3); c.beginPath(); c.ellipse(0, -R * .75, R * .42, R * .62, 0, 0, 7); c.fill(); c.stroke(); c.restore(); } c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(0, 0, R * .4, 0, 7); c.fill(); c.stroke(); }
   else { c.rotate(s.rot); c.fillStyle = s.col; c.fillRect(-R * .22, -R * 1.2, R * .44, R * 2.4); c.strokeRect(-R * .22, -R * 1.2, R * .44, R * 2.4); c.beginPath(); c.moveTo(-R * .22, -R * 1.2); c.lineTo(0, -R * 1.65); c.lineTo(R * .22, -R * 1.2); c.closePath(); c.fill(); c.stroke(); }
   c.restore(); }
 }
 function frame(now) {
  const dt = Math.min(.05, (now - (frame.p || now)) / 1000); frame.p = now; step(dt); const t = now / 1000;
  drawScenery();
  const R = S() * .05;
  // hiding bugs: they peek out beside a big flower or crayon; a bug wiggles when the parent is near so searching gives feedback
  for (const hd of hides) if (!hd.found) { const near = Math.hypot((hd.x - parent.x) * w, (hd.y - parent.y) * h) < S() * .3; drawBug(c, hd.b, hd.x * w, hd.y * h, R, {t: near ? t : 0, a: .95}); if (near) { c.strokeStyle = '#fff'; c.lineWidth = 3; c.setLineDash([4, 6]); c.beginPath(); c.arc(hd.x * w, hd.y * h, R * 1.7 + Math.sin(t * 6) * 3, 0, 7); c.stroke(); c.setLineDash([]); } }
  for (let i = tail.length - 1; i >= 0; i--) { const hd = tail[i]; drawBug(c, hd.b, hd.x * w, hd.y * h, R * (1 + (hd.pop > 0 ? hd.pop * .6 : 0)), {ang: hd.ang || 0, t, a: celebrate ? Math.max(0, 1 - hd.fly / 2.4) : 1}); if (hd.pop > 0) hd.pop = Math.max(0, hd.pop - .05); }
  // the parent: a bigger bug with a crown, so "who I am moving" is never a question
  c.save(); c.translate(parent.x * w, parent.y * h); drawBug(c, {col: '#ff5fa2', shape: 'oval', mark: 'spots'}, 0, 0, R * 1.5, {ang: Math.atan2(parent.ty - parent.y, parent.tx - parent.x) + Math.PI / 2, t}); c.fillStyle = '#ffd23f'; c.strokeStyle = '#3b2d4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-R * .6, -R * 1.5); c.lineTo(-R * .6, -R * 2.3); c.lineTo(-R * .2, -R * 1.8); c.lineTo(0, -R * 2.4); c.lineTo(R * .2, -R * 1.8); c.lineTo(R * .6, -R * 2.3); c.lineTo(R * .6, -R * 1.5); c.closePath(); c.fill(); c.stroke(); c.restore();
  if (mode === 'progress') { // experiment 7: the home leaf at the top. Missing bugs are shadows; found ones sit in colour. No numbers.
   const lw = Math.min(w * .9, 420), lx = (w - lw) / 2, ly = 18; c.fillStyle = '#4d9a3acc'; c.beginPath(); c.roundRect(lx, ly, lw, R * 3, R * 1.5); c.fill();
   BUGS.forEach((b, i) => { const got = hides.some(hd => hd.b === b && hd.found); drawBug(c, b, lx + lw * (i + .5) / BUGS.length, ly + R * 1.5, R * .95, {ghost: !got, a: got ? 1 : .8, t: got ? t * .3 : 0}); }); }
  if (demoOn) { const k = Math.min(1, demoT / 2.2), fx = parent.x * w + 20, fy = parent.y * h + 24; c.font = '40px sans-serif'; c.fillText('👆', fx, fy + Math.sin(t * 8) * 4 * (1 - k)); }
  requestAnimationFrame(frame);
 }
 addEventListener('resize', () => ({c, w, h} = fit(canvas)));
 const dev = devPanel(() => [mode === 'progress' ? 'EXP 7 success checks' : 'EXP 8 success checks', 'found now: ' + tail.length + '/' + hides.length, 'rounds completed: ' + rounds, 'time to first find: ' + (firstFindAt == null ? '-' : (firstFindAt / 1000).toFixed(1) + 's') + (demo ? ' (after one demo)' : ''), 'touches: ' + taps]);
 (function loop() { dev(); requestAnimationFrame(loop); })(); requestAnimationFrame(frame);
}
