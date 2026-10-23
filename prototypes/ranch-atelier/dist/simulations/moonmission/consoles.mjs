// AW-STUDY-0036 Chapter 1, round 2: the three launch consoles (Evan, 20:28Z). One tactile 2D game per console, drawn on a canvas
// in the player's own panel: Daddy's flight plan (two-click burn timing), Ani's cow swap, Abbie's landing. No words: icons,
// shapes and colour only (the crew's speech comes from the mission captions). NES-ish: flat colours, chunky pixels.
// mountConsole(name, send) -> {el, draw(game, t), destroy}; send(ev) dispatches a game event with its player id filled in.
import {BURNS, VEG} from './games.mjs';

export const CONSOLE_OWNER = {flight: 'daddy', cows: 'ani', landing: 'abbie'};
const W = 480, H = 270, PX = 3, COL = {daddy: '#6f9bff', ani: '#b18cff', abbie: '#ff7eb6'};
const VEGC = {carrot: '#ff8c1a', corn: '#ffd23f', broccoli: '#3ea64a', pea: '#8fd14f', tomato: '#e53935', beet: '#9c27b0'};
const px = (v, n = PX) => Math.round(v / n) * n;
function bezel(c, color) { c.fillStyle = '#10131f'; c.fillRect(0, 0, W, H); c.strokeStyle = color; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6); }
function veg(c, kind, x, y, r) {
 c.fillStyle = VEGC[kind];
 if (kind === 'carrot') { c.beginPath(); c.moveTo(x - r * .6, y - r); c.lineTo(x + r * .6, y - r); c.lineTo(x, y + r); c.fill(); c.fillStyle = '#3ea64a'; c.fillRect(x - r * .4, y - r * 1.3, r * .8, r * .4); }
 else if (kind === 'corn') { c.fillRect(x - r * .5, y - r, r, r * 2); c.fillStyle = '#6fbf4a'; c.fillRect(x - r * .8, y - r * .2, r * .5, r * 1.2); c.fillRect(x + r * .3, y - r * .2, r * .5, r * 1.2); }
 else if (kind === 'pea') { for (let i = -1; i <= 1; i++) { c.beginPath(); c.arc(x + i * r * .7, y, r * .4, 0, 7); c.fill(); } }
 else { c.beginPath(); c.arc(x, y, r * .85, 0, 7); c.fill(); if (kind === 'broccoli') { c.fillStyle = '#7a5230'; c.fillRect(x - r * .2, y + r * .4, r * .4, r * .7); } }
}

function drawFlight(c, g, t) {
 bezel(c, COL.daddy);
 // the flight plan: Earth bottom left, the Moon top right, a curved path with three burn nodes
 c.fillStyle = '#2a6fd6'; c.beginPath(); c.arc(50, 215, 36, 0, 7); c.fill(); c.fillStyle = '#3ea64a'; c.fillRect(32, 205, 22, 14);
 c.fillStyle = '#d7dae3'; c.beginPath(); c.arc(430, 60, 26, 0, 7); c.fill(); c.fillStyle = '#aeb3c2'; c.fillRect(420, 52, 10, 8);
 const pt = u => [60 + u * 360, 200 - Math.sin(u * Math.PI * .85) * 120 - u * 40];
 c.strokeStyle = '#4a5578'; c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); for (let u = 0; u <= 1; u += .02) { const [x, y] = pt(u); u ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.setLineDash([]);
 BURNS.forEach((b, i) => { const [x, y] = pt((i + 1) / 4), done = g.fired.includes(b.id), cur = g.stage === i && !g.done;
  c.fillStyle = done ? '#6fe3a5' : cur ? '#ffc83d' : '#3a4263'; c.beginPath(); c.arc(x, y, cur ? 15 + Math.sin(t * 6) * 2 : 12, 0, 7); c.fill();
  c.fillStyle = '#10131f'; if (i === 0) c.fillRect(x - 5, y - 8, 10, 16); else if (i === 1) { c.fillRect(x - 5, y - 8, 10, 8); c.fillRect(x - 3, y, 6, 8); } else { c.beginPath(); c.moveTo(x - 7, y - 7); c.lineTo(x + 7, y - 7); c.lineTo(x, y + 8); c.fill(); } });
 const rp = pt(Math.min(1, (g.fired.length + (g.armed ? g.p * .8 : 0)) / 3.2 * .9)); c.fillStyle = '#ff7eb6'; c.fillRect(rp[0] - 5, rp[1] - 10, 10, 20); c.fillStyle = '#fff'; c.fillRect(rp[0] - 3, rp[1] - 14, 6, 5);
 // the burn sweep: a track with a gold window and a marker; the big button below
 const b = BURNS[Math.min(g.stage, 2)], tx = 40, tw = W - 80, ty = 238;
 c.fillStyle = '#1f2540'; c.fillRect(tx, ty - 10, tw, 20);
 c.fillStyle = g.flash === 'hit' ? '#6fe3a5' : '#ffc83d'; c.fillRect(tx + (b.at - g.tol) * tw, ty - 10, g.tol * 2 * tw, 20);
 if (g.armed) { c.fillStyle = '#fff'; c.fillRect(tx + g.p * tw - 3, ty - 16, 6, 32); }
 else { c.fillStyle = COL.daddy; c.beginPath(); c.arc(W / 2, ty, 8 + Math.sin(t * 5) * 2, 0, 7); c.fill(); }
 if (g.flash === 'early' || g.flash === 'late') { c.fillStyle = '#e53935'; c.fillRect(tx + (g.flash === 'early' ? 0 : tw - 12), ty - 10, 12, 20); }
}

function cowPos(cow) { return [cow.x * (W - 60) + 30, cow.row ? 130 : 80]; }
function drawCows(c, g, t) {
 bezel(c, COL.ani); c.fillStyle = '#4aa84a'; c.fillRect(8, 40, W - 16, 140); c.fillStyle = '#3d8f3d'; for (let i = 0; i < 24; i++) c.fillRect(px(20 + i * 19), px(56 + (i * 37) % 110), 6, 6);
 c.fillStyle = '#8a5a2b'; c.fillRect(8, 36, W - 16, 6);
 for (const cow of g.cows) { const [x, y] = cowPos(cow);
  if (cow.state === 'swapped') { c.fillStyle = '#b07a3a'; c.fillRect(x - 14, y - 6, 28, 22); veg(c, VEG[cow.want], x, y + 5, 9); continue; }
  const sh = g.tagged === cow.i ? Math.sin(t * 40) * g.shake * 6 : 0;
  c.fillStyle = '#fff'; c.fillRect(x - 18 + sh, y - 10, 36, 22); c.fillStyle = '#222'; c.fillRect(x - 10 + sh, y - 6, 8, 8); c.fillRect(x + 6 + sh, y + 2, 8, 6); c.fillStyle = '#fff'; c.fillRect(x + 14 + sh, y - 14, 14, 14); c.fillStyle = '#222'; c.fillRect(x + 22 + sh, y - 10, 3, 3); c.fillStyle = '#f2a3b8'; c.fillRect(x + 22 + sh, y - 3, 8, 4);
  c.fillRect(x - 14 + sh, y + 12, 5, 8); c.fillRect(x + 9 + sh, y + 12, 5, 8);
  if (g.tagged === cow.i || g.hint === cow.i) { c.strokeStyle = g.tagged === cow.i ? '#ffc83d' : '#fff'; c.lineWidth = 3; c.strokeRect(x - 24, y - 20, 58, 46); }
  // what this cow wants: a bubble above it
  c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y - 34, 14, 0, 7); c.fill(); veg(c, VEG[cow.want], x, y - 34, 8); }
 // the veggie tray
 VEG.forEach((k, i) => { const x = 40 + i * 78, y = 222; c.fillStyle = '#8a5a2b'; c.fillRect(x - 28, y - 28, 56, 52); c.fillStyle = '#2b2f45'; c.fillRect(x - 24, y - 24, 48, 44); veg(c, k, x, y - 2, 13); });
 for (let i = 0; i < 6; i++) { c.fillStyle = i < g.swapped ? '#ffc83d' : '#2b2f45'; c.fillRect(20 + i * 14, 14, 10, 10); }
}
function cowHit(g, x, y) {
 if (y > 190) { const i = Math.round((x - 40) / 78); return i >= 0 && i < 6 && Math.abs(x - (40 + i * 78)) < 34 ? {veg: i} : null; }
 let best = null, bd = 1e9; for (const cow of g.cows) { if (cow.state !== 'wild') continue; const [cx, cy] = cowPos(cow), d = Math.hypot(x - cx, y - cy); if (d < bd) { bd = d; best = cow; } } return best && bd < 50 ? {cow: best.i} : null;
}

function drawLanding(c, g, t) {
 bezel(c, COL.abbie); c.fillStyle = '#070a14'; c.fillRect(8, 8, W - 16, 200); for (let i = 0; i < 40; i++) { c.fillStyle = '#fff'; c.fillRect(px((i * 97) % (W - 20) + 10), px((i * 53) % 190 + 10), 3, 3); }
 c.fillStyle = '#9a9eab'; c.fillRect(8, 188, W - 16, 20); c.fillStyle = '#6fe3a5'; c.fillRect(W / 2 - 40, 186, 80, 4);
 const x = W / 2 + g.x * 2.2, y = 186 - Math.min(1, g.alt / 160) * 160 - 14;
 c.save(); c.translate(x, y); c.rotate(-g.tilt * .5);
 if (g.thrust > .05 && !g.landed) { c.fillStyle = '#ffa800'; c.fillRect(-5, 14, 10, 12 + Math.random() * 10 * g.thrust); }
 c.fillStyle = '#f6f7fb'; c.fillRect(-12, -14, 24, 24); c.fillStyle = '#ff7eb6'; c.fillRect(-12, 6, 24, 4); c.fillStyle = '#7fb4ff'; c.fillRect(-5, -9, 10, 8);
 c.fillStyle = '#9aa3b8'; c.fillRect(-16, 10, 4, g.feet ? 8 : 3); c.fillRect(12, 10, 4, g.feet ? 8 : 3); c.restore();
 // speed light (green = soft), fuel bar, thrust and tilt pads
 const spd = Math.hypot(g.vy, g.vx), ok = spd <= 2.5; c.fillStyle = ok ? '#6fe3a5' : spd < 5 ? '#ffc83d' : '#e53935'; c.beginPath(); c.arc(30, 30, 12, 0, 7); c.fill();
 c.fillStyle = '#1f2540'; c.fillRect(W - 40, 20, 14, 120); c.fillStyle = '#ffc83d'; c.fillRect(W - 40, 20 + 120 * (1 - g.fuel / 100), 14, 120 * g.fuel / 100);
 const pad = (x0, w, on, col) => { c.fillStyle = on ? col : '#2b2f45'; c.fillRect(x0, 216, w, 44); c.strokeStyle = col; c.lineWidth = 3; c.strokeRect(x0, 216, w, 44); };
 pad(14, 100, g.tilt < -.1, COL.abbie); pad(W / 2 - 80, 160, g.thrust > .05, '#ffa800'); pad(W - 114, 100, g.tilt > .1, COL.abbie);
 c.fillStyle = '#10131f'; c.beginPath(); c.moveTo(80, 226); c.lineTo(48, 238); c.lineTo(80, 250); c.fill(); c.beginPath(); c.moveTo(W - 80, 226); c.lineTo(W - 48, 238); c.lineTo(W - 80, 250); c.fill();
 c.beginPath(); c.moveTo(W / 2, 224); c.lineTo(W / 2 - 18, 252); c.lineTo(W / 2 + 18, 252); c.fill();
}

const DRAW = {flight: drawFlight, cows: drawCows, landing: drawLanding};

export function mountConsole(name, send) {
 const el = document.createElement('div'); el.className = 'pl console'; el.style.borderColor = COL[CONSOLE_OWNER[name]];
 const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.style.cssText = 'height:min(36vh,calc(46vw*270/480));width:auto;aspect-ratio:16/9;max-width:100%;border-radius:12px;touch-action:none;image-rendering:pixelated;display:block'; el.append(cv);
 const c = cv.getContext('2d'), who = CONSOLE_OWNER[name]; let last = null;
 const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
 let held = 0;
 const land = (x, y, down) => { if (y < 210) return; if (x < W * .3) send({tilt: down ? -1 : 0}); else if (x > W * .7) send({tilt: down ? 1 : 0}); else send({thrust: down ? 1 : 0}); };
 cv.addEventListener('pointerdown', e => { const [x, y] = at(e); cv.setPointerCapture(e.pointerId);
  if (name === 'flight') send({press: true}); else if (name === 'cows' && last) { const h = cowHit(last, x, y); if (h) send(h); } else if (name === 'landing') { held = 1; land(x, y, true); } });
 const up = e => { if (name === 'landing' && held) { held = 0; send({thrust: 0, tilt: 0}); } };
 cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
 return {el, canvas: cv, draw(g, t) { last = g; c.imageSmoothingEnabled = false; DRAW[name](c, g, t); }, hit: (g, x, y) => cowHit(g, x, y), destroy() { el.remove(); }};
}
export const _test = {cowHit, cowPos};
