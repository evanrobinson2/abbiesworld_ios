// Scene Builder lab study: the stand-in renderer. A 2D isometric hex diorama; the real build draws the library's GLBs in three.js.
// Everything here is presentation: the editor's hover glow, selection ring and grid are drawn for the player and are not in the world.
'use strict';
const ckey = (q, r) => q + ',' + r;
const SQ3 = Math.sqrt(3), TILT = .56, HS = 13;
const hexRGB = new Map();
const rgb = h => { let v = hexRGB.get(h); if (!v) { v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; hexRGB.set(h, v); } return v; };
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0')).join(''); };

const SEASON_PAL = {
  spring: {grass: ['#9bd86f', '#7fc25a'], leaf: ['#8fd36a', '#f3b4c8', '#a8e07a'], sky: ['#8fd3ff', '#e4f6ff']},
  summer: {grass: ['#7fc65a', '#5aa645'], leaf: ['#4f9a3c', '#3f8a35', '#62ad46'], sky: ['#6fc3ff', '#d6f0ff']},
  autumn: {grass: ['#b8b45a', '#a0963f'], leaf: ['#e0842b', '#c9452c', '#e7b53a'], sky: ['#9bc6e8', '#ffe2b8']},
  winter: {grass: ['#e6eef2', '#cfdde6'], leaf: ['#dfe9ee', '#c9d9e2', '#eef4f7'], sky: ['#b9cfe6', '#eef3f8']},
};
const GROUND = {
  grass: (c, s, rc) => mix(mix(SEASON_PAL[s].grass[0], SEASON_PAL[s].grass[1], c.rv), '#8d8f8a', clamp((c.h - 4) / 4, 0, 1) * .8),
  sand: (c, s) => mix(mix('#e8d9a6', '#d9c58a', c.rv), SEASON_PAL[s].grass[0], c.h >= 3 ? .45 : 0),
  regolith: c => mix(mix('#b9b9be', '#9d9da4', c.rv), '#e2e2e8', clamp((c.h - 3) / 5, 0, .5)),
  dust: c => mix(mix('#c9a46a', '#b58d55', c.rv), '#8a7358', clamp((c.h - 3) / 4, 0, .6)),
};
const SIDE = {grass: '#7b5f45', sand: '#b79c6a', regolith: '#6f6f78', dust: '#80623c'};

const view = {fit: 1, zoom: 1, rot: 0, px: 0, py: 20, tilt: TILT};
const rotAx = (q, r, k) => { let x = q, z = r, y = -q - r; for (let i = 0; i < ((k % 6) + 6) % 6; i++) { const nx = -z, ny = -x, nz = -y; x = nx; y = ny; z = nz; } return [x, z]; };
const SZ = () => 34 * view.zoom * view.fit;
let cx = 0, cy = 0;
function hexToXY(q, r) { const [a, b] = rotAx(q, r, view.rot), z = SZ(); return [cx + view.px + z * SQ3 * (a + b / 2), cy + view.py + z * 1.5 * b * view.tilt]; }
function topXY(c) { const [x, y] = hexToXY(c.q, c.r); return [x, y - (c.water ? c.wl - .4 : c.h) * HS * view.zoom]; }
function worldXY(q, r) { return [SQ3 * (q + r / 2), 1.5 * r]; }          // unrotated world metres (for physics)
function axialOf(wx, wy) { const r = wy / 1.5, q = wx / SQ3 - r / 2; let x = q, z = r, y = -x - z, rx = Math.round(x), ry = Math.round(y), rz = Math.round(z); const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z); if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry; return [rx, rz]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// ---- light: one signal (hour, weather, season) tints everything -----------------------------------------------
function lighting(env, weather, family) {
  const el = Math.sin((env.hour - 6) / 24 * Math.PI * 2);                    // -1..1, noon = 1
  const day = clamp((el + .15) / .5, 0, 1), dusk = clamp(1 - Math.abs(el) / .35, 0, 1) * (el > -.4 ? 1 : 0);
  let L = .5 + .5 * day; const over = {clear: 1, cloudy: .88, rain: .76, snow: .88, storm: .62, fog: .85, dust: .8}[weather] ?? 1; L *= over;
  const t = [mixN(.55, 1, day), mixN(.65, 1, day), mixN(.95, 1, day)];
  t[0] += dusk * .12; t[1] -= dusk * .04; t[2] -= dusk * .18;
  return {el, day, dusk, L, tint: t.map(v => clamp(v * (.78 + .22 * L), 0, 1.15)), night: 1 - day};
}
const mixN = (a, b, t) => a + (b - a) * t;
let TINT = [1, 1, 1];
function col(h, f = 1) { const v = rgb(h); return `rgb(${clamp(v[0] * f * TINT[0], 0, 255) | 0},${clamp(v[1] * f * TINT[1], 0, 255) | 0},${clamp(v[2] * f * TINT[2], 0, 255) | 0})`; }

// ---- sky -----------------------------------------------------------------------------------------------------
function drawSky(g, w, h, env, weather, lt, season, family, T) {
  const pal = SEASON_PAL[season].sky; let top, bot;
  if (family === 'moon') { top = mix('#02030a', '#0b1030', lt.day * .35); bot = mix('#0a0d22', '#1b2347', lt.day * .5); }
  else { top = mix('#070b24', pal[0], lt.day); bot = mix('#1c2650', pal[1], lt.day); if (lt.dusk) { top = mix(top, '#ff8f6b', lt.dusk * .45); bot = mix(bot, '#ffd08a', lt.dusk * .7); } }
  if (weather === 'storm') { top = mix(top, '#3a4152', .6); bot = mix(bot, '#59627a', .55); } else if (weather === 'rain' || weather === 'cloudy' || weather === 'snow') { top = mix(top, '#8e9bb0', .35 * lt.day); bot = mix(bot, '#c4ccd8', .3 * lt.day); }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (lt.night > .25 || family === 'moon') { g.fillStyle = '#fff'; const n = 70, k = family === 'moon' ? 1 : lt.night; for (let i = 0; i < n; i++) { const x = (Math.sin(i * 91.7) * .5 + .5) * w, y = (Math.sin(i * 47.3 + 2) * .5 + .5) * h * .6, tw = .5 + .5 * Math.sin(T * 2 + i); g.globalAlpha = k * (.35 + .5 * tw) * (weather === 'clear' || family === 'moon' ? 1 : .25); g.fillRect(x, y, i % 7 ? 1.4 : 2.2, i % 7 ? 1.4 : 2.2); } g.globalAlpha = 1; }
  const sunA = (env.hour - 6) / 24 * Math.PI * 2, sx = w * (.12 + .76 * ((env.hour - 5) / 14)), sy = h * .55 - Math.sin(sunA) * h * .42;
  if (lt.el > -.12 && weather !== 'storm') { const r = family === 'moon' ? 22 : 34; const gl = g.createRadialGradient(sx, sy, 2, sx, sy, r * 3); gl.addColorStop(0, 'rgba(255,240,190,.9)'); gl.addColorStop(.25, 'rgba(255,230,160,.35)'); gl.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gl; g.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6); g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(sx, sy, r * .55, 0, 7); g.fill(); }
  if (lt.night > .3 || family === 'moon') { const mx = w * (.88 - .76 * (((env.hour + 12) % 24 - 5) / 14)), my = h * .5 - Math.sin(sunA + Math.PI) * h * .4; if (family === 'moon') { g.fillStyle = '#4e86d8'; g.beginPath(); g.arc(w * .82, h * .2, 34, 0, 7); g.fill(); g.fillStyle = '#6fb06a'; g.beginPath(); g.arc(w * .8, h * .21, 12, 0, 7); g.arc(w * .84, h * .18, 8, 0, 7); g.fill(); } else if (Math.sin(sunA) < .05) { g.fillStyle = '#eef0ff'; g.beginPath(); g.arc(clamp(mx, 40, w - 40), clamp(my, 40, h * .5), 16, 0, 7); g.fill(); } }
  const cl = {clear: 3, cloudy: 9, rain: 9, snow: 8, storm: 11, fog: 7, dust: 6}[weather] ?? 4; if (family !== 'moon') for (let i = 0; i < cl; i++) { const sp = 6 + i * 1.7 + env.wind * 40, x = ((i * 233 + T * sp) % (w + 300)) - 150, y = h * (.08 + (i * 37 % 40) / 140), s = 50 + (i * 29 % 60); g.fillStyle = `rgba(${weather === 'storm' ? '80,86,102' : '255,255,255'},${.35 + lt.day * .25})`; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * s * .38, y + (k % 2) * 5, s * .45, s * .2, 0, 0, 7); g.fill(); } }
}

// ---- low-poly stand-ins --------------------------------------------------------------------------------------
function box(g, x, y, w, h, base, d = w * .5) {
  g.fillStyle = col(base, 1.1); g.beginPath(); g.moveTo(x, y - h - d); g.lineTo(x + w, y - h); g.lineTo(x, y - h + d); g.lineTo(x - w, y - h); g.closePath(); g.fill();
  g.fillStyle = col(base, .82); g.beginPath(); g.moveTo(x - w, y - h); g.lineTo(x, y - h + d); g.lineTo(x, y + d); g.lineTo(x - w, y); g.closePath(); g.fill();
  g.fillStyle = col(base, .62); g.beginPath(); g.moveTo(x + w, y - h); g.lineTo(x, y - h + d); g.lineTo(x, y + d); g.lineTo(x + w, y); g.closePath(); g.fill();
}
function poly(g, pts, c, f = 1) { g.fillStyle = col(c, f); g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }
function blob(g, x, y, rx, ry, c, f = 1) { g.fillStyle = col(c, f); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }
function roof(g, x, y, w, h, rh, base) { // gable roof over a box top at y
  poly(g, [[x - w * 1.08, y - h], [x, y - h + w * .54], [x, y - h + w * .54 - rh], [x - w * 1.08 + w * .5, y - h - rh * .62]], base, .9);
  poly(g, [[x + w * 1.08, y - h], [x, y - h + w * .54], [x, y - h + w * .54 - rh], [x + w * 1.08 - w * .5, y - h - rh * .62]], base, .66);
}
const WINDOW = '#ffe9a8';
function glowWin(g, x, y, r, lt) { if (lt.night > .35) { g.fillStyle = `rgba(255,222,140,${.85 * lt.night})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
const FOLIAGE = (p, s, season) => { const pal = SEASON_PAL[season].leaf; return pal[Math.floor(p.v * 97) % pal.length]; };

function drawProp(g, p, x, y, u, ctx) { // u = pixel unit for this prop; ctx = {season, lt, T, wind}
  const s = u * (p.s || 1), lt = ctx.lt, sway = Math.sin(ctx.T * 2 + p.q * 1.7 + p.r) * ctx.wind * 2.6 * s / 10;
  g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x + s * .15, y + s * .05, s * .7, s * .28, 0, 0, 7); g.fill();
  switch (p.kind) {
    case 'tree': { const winter = ctx.season === 'winter', c = FOLIAGE(p, s, ctx.season); box(g, x, y, s * .13, s * .6, '#7a5a3c', s * .06);
      if (winter) { g.strokeStyle = col('#6b4f36'); g.lineWidth = s * .08; g.beginPath(); g.moveTo(x, y - s * .5); g.lineTo(x - s * .35, y - s * 1.05); g.moveTo(x, y - s * .6); g.lineTo(x + s * .33, y - s * 1.1); g.stroke(); blob(g, x + sway, y - s * 1.1, s * .5, s * .22, '#f4f8fa'); }
      else { blob(g, x + sway, y - s * 1.05, s * .62, s * .5, c, .92); blob(g, x + sway * 1.2 - s * .12, y - s * 1.3, s * .46, s * .38, c, 1.12); } break; }
    case 'pine': { box(g, x, y, s * .1, s * .35, '#6a4d34', s * .05); const win = ctx.season === 'winter'; for (let i = 0; i < 3; i++) { const yy = y - s * (.35 + i * .38), w = s * (.6 - i * .15); poly(g, [[x - w + sway * i * .3, yy], [x + sway * (i + 1) * .35, yy - s * .72], [x + w + sway * i * .3, yy]], win ? '#e9f1f4' : (i % 2 ? '#2f7a45' : '#3b8a50'), .95 - i * .04); poly(g, [[x + sway * (i + 1) * .35, yy - s * .72], [x + w + sway * i * .3, yy], [x, yy + s * .1]], win ? '#c9d8df' : '#256a3b', .8); } break; }
    case 'palm': { g.strokeStyle = col('#8a6a45'); g.lineWidth = s * .12; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + s * .25, y - s * .7, x + s * .1 + sway, y - s * 1.3); g.stroke(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.strokeStyle = col('#3f9a4a', .9 + i % 2 * .15); g.lineWidth = s * .1; g.beginPath(); g.moveTo(x + s * .1 + sway, y - s * 1.3); g.quadraticCurveTo(x + s * .1 + Math.cos(a) * s * .5 + sway, y - s * 1.55, x + s * .1 + Math.cos(a) * s * .75 + sway, y - s * 1.2 + Math.sin(a) * s * .22); g.stroke(); } break; }
    case 'deadtree': { g.strokeStyle = col('#5b4a3a'); g.lineWidth = s * .1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * .05, y - s * .9); g.moveTo(x, y - s * .5); g.lineTo(x - s * .35, y - s * .95); g.moveTo(x + s * .04, y - s * .7); g.lineTo(x + s * .32, y - s * 1.05); g.stroke(); break; }
    case 'bush': blob(g, x, y - s * .22, s * .5, s * .32, FOLIAGE(p, s, ctx.season), .9); blob(g, x + s * .18, y - s * .3, s * .3, s * .22, FOLIAGE(p, s, ctx.season), 1.1); if (ctx.season === 'spring') { g.fillStyle = col('#ffffff'); g.fillRect(x - s * .15, y - s * .38, s * .09, s * .09); g.fillRect(x + s * .15, y - s * .3, s * .09, s * .09); } break;
    case 'rock': poly(g, [[x - s * .5, y], [x - s * .35, y - s * .38], [x, y - s * .55], [x + s * .38, y - s * .34], [x + s * .5, y]], '#9aa0a6', 1); poly(g, [[x, y - s * .55], [x + s * .38, y - s * .34], [x + s * .5, y], [x + s * .05, y + s * .06]], '#7e848b', .85); if (ctx.season === 'winter') poly(g, [[x - s * .35, y - s * .38], [x, y - s * .55], [x + s * .38, y - s * .34], [x, y - s * .3]], '#f4f8fa'); break;
    case 'house': { const c = ['#f2e6cf', '#e8d3b0', '#d9e4ee', '#f0d5d0'][Math.floor(p.v * 40) % 4]; box(g, x, y, s * .55, s * .62, c); roof(g, x, y, s * .55, s * .62, s * .5, ctx.season === 'winter' ? '#e9eff2' : ['#b5523f', '#6a7da8', '#7a5a8c'][Math.floor(p.v * 30) % 3]); g.fillStyle = col('#7a5a3c'); g.fillRect(x + s * .12, y - s * .3, s * .14, s * .3); glowWin(g, x - s * .25, y - s * .32, s * .07, lt); break; }
    case 'shop': { box(g, x, y, s * .7, s * .55, '#f2dcc0'); roof(g, x, y, s * .7, s * .55, s * .28, '#7a5a8c'); for (let i = 0; i < 4; i++) poly(g, [[x - s * .6 + i * s * .3, y - s * .25], [x - s * .3 + i * s * .3, y - s * .25], [x - s * .35 + i * s * .3, y - s * .1], [x - s * .6 + i * s * .3 - s * .05, y - s * .1]], i % 2 ? '#ffffff' : '#e0584a', .9); glowWin(g, x + s * .3, y - s * .35, s * .08, lt); break; }
    case 'barn': box(g, x, y, s * .72, s * .7, '#b5382e'); roof(g, x, y, s * .72, s * .7, s * .55, '#5d4a40'); g.strokeStyle = col('#f4efe6'); g.lineWidth = s * .05; g.strokeRect(x - s * .5, y - s * .5, s * .26, s * .45); g.beginPath(); g.moveTo(x - s * .5, y - s * .5); g.lineTo(x - s * .24, y - s * .05); g.moveTo(x - s * .24, y - s * .5); g.lineTo(x - s * .5, y - s * .05); g.stroke(); break;
    case 'tent': poly(g, [[x - s * .6, y], [x, y - s * .85], [x + s * .6, y]], '#e7a23a', 1); poly(g, [[x, y - s * .85], [x + s * .6, y], [x + s * .1, y + s * .08]], '#c9852a', .9); poly(g, [[x - s * .12, y + s * .02], [x, y - s * .4], [x + s * .12, y + s * .02]], '#3a2a1e'); break;
    case 'dome': box(g, x, y, s * .65, s * .12, '#e9ecef'); g.fillStyle = `rgba(190,225,255,${.55})`; g.beginPath(); g.ellipse(x, y - s * .12, s * .62, s * .75, 0, Math.PI, 0); g.fill(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(x, y - s * .12, s * .62, s * .75, 0, Math.PI, 0); g.stroke(); blob(g, x, y - s * .2, s * .15, s * .1, '#ffe9a8', 1); break;
    case 'solar': g.strokeStyle = col('#8e9399'); g.lineWidth = s * .06; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * .3); g.stroke(); poly(g, [[x - s * .55, y - s * .38], [x + s * .35, y - s * .62], [x + s * .6, y - s * .38], [x - s * .3, y - s * .14]], '#2f5fa8'); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - s * .1, y - s * .5); g.lineTo(x + s * .15, y - s * .26); g.stroke(); break;
    case 'antenna': g.strokeStyle = col('#c9ced4'); g.lineWidth = s * .07; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 1.1); g.stroke(); blob(g, x, y - s * 1.1, s * .3, s * .12, '#f1f3f5'); g.fillStyle = Math.sin(ctx.T * 4) > 0 ? '#ff5a4a' : '#7a2a24'; g.beginPath(); g.arc(x, y - s * 1.22, s * .05, 0, 7); g.fill(); break;
    case 'rover': box(g, x, y - s * .12, s * .5, s * .24, '#e8eaee'); [-.4, .4].forEach(d => blob(g, x + s * d, y, s * .14, s * .14, '#3b3f46')); break;
    case 'crate': box(g, x, y, s * .3, s * .32, '#b88a52'); break;
    case 'barrel': box(g, x, y, s * .22, s * .42, '#a5412f', s * .1); break;
    case 'hay': blob(g, x, y - s * .2, s * .32, s * .26, '#e6c25a'); blob(g, x, y - s * .2, s * .12, s * .09, '#c9a23a'); break;
    case 'fence': for (let i = -1; i <= 1; i++) box(g, x + i * s * .3, y - i * s * .1, s * .04, s * .34, '#a37b52', s * .02); g.strokeStyle = col('#a37b52'); g.lineWidth = s * .04; g.beginPath(); g.moveTo(x - s * .3, y - s * .27); g.lineTo(x + s * .3, y - s * .27 - s * .0); g.moveTo(x - s * .3, y - s * .16 + s * .1); g.lineTo(x + s * .3, y - s * .16 - s * .1); g.stroke(); break;
    case 'lamp': g.strokeStyle = col('#4a4f57'); g.lineWidth = s * .06; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * .9); g.stroke(); blob(g, x, y - s * .95, s * .09, s * .09, '#ffe9a8', 1.1); if (lt.night > .3) { const gl = g.createRadialGradient(x, y - s * .95, 1, x, y - s * .95, s * 1.1); gl.addColorStop(0, `rgba(255,225,150,${.55 * lt.night})`); gl.addColorStop(1, 'rgba(255,225,150,0)'); g.fillStyle = gl; g.fillRect(x - s * 1.2, y - s * 2.1, s * 2.4, s * 2.4); } break;
    case 'bench': box(g, x, y - s * .14, s * .38, s * .06, '#a37b52', s * .12); box(g, x - s * .26, y, s * .04, s * .16, '#6a4d34', s * .02); box(g, x + s * .26, y, s * .04, s * .16, '#6a4d34', s * .02); break;
    case 'log': box(g, x, y, s * .4, s * .16, '#8a6a45', s * .1); blob(g, x - s * .32, y - s * .1, s * .08, s * .08, '#d8b98a'); break;
    case 'mushroom': box(g, x, y, s * .05, s * .2, '#f1e7d6', s * .03); blob(g, x, y - s * .22, s * .2, s * .12, '#d9483b'); break;
    case 'umbrella': g.strokeStyle = col('#f4efe6'); g.lineWidth = s * .05; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * .7); g.stroke(); poly(g, [[x - s * .5, y - s * .55], [x, y - s * .95], [x + s * .5, y - s * .55]], '#e0584a'); poly(g, [[x - s * .1, y - s * .62], [x, y - s * .95], [x + s * .5, y - s * .55]], '#ffffff', .95); break;
    case 'dock': box(g, x, y - s * .06, s * .6, s * .06, '#a37b52', s * .22); for (let i = -1; i <= 1; i += 2) box(g, x + i * s * .45, y + s * .1, s * .04, s * .22, '#6a4d34', s * .02); break;
    case 'boat': { const bob = Math.sin(ctx.T * 1.6 + p.q) * s * .05; poly(g, [[x - s * .55, y - s * .1 + bob], [x + s * .55, y - s * .1 + bob], [x + s * .35, y + s * .08 + bob], [x - s * .35, y + s * .08 + bob]], '#c8553d'); g.strokeStyle = col('#f4efe6'); g.lineWidth = s * .05; g.beginPath(); g.moveTo(x, y - s * .1 + bob); g.lineTo(x, y - s * .95 + bob); g.stroke(); poly(g, [[x + s * .03, y - s * .9 + bob], [x + s * .5, y - s * .25 + bob], [x + s * .03, y - s * .25 + bob]], '#ffffff'); break; }
    case 'wreck': box(g, x, y - s * .1, s * .5, s * .26, '#8b5a3c'); box(g, x - s * .05, y - s * .36, s * .3, s * .2, '#6f4a33'); blob(g, x - s * .38, y, s * .12, s * .12, '#2c2c30'); break;
    case 'scarecrow': g.strokeStyle = col('#7a5a3c'); g.lineWidth = s * .07; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * .95); g.moveTo(x - s * .4, y - s * .7); g.lineTo(x + s * .4, y - s * .7); g.stroke(); blob(g, x, y - s * 1.0, s * .15, s * .15, '#e6c25a'); poly(g, [[x - s * .22, y - s * 1.1], [x, y - s * 1.35], [x + s * .22, y - s * 1.1]], '#5d4a40'); break;
    default: blob(g, x, y - s * .2, s * .3, s * .3, '#cccccc');
  }
}
function drawCritter(g, c, x, y, u, ctx) {
  const k = c.kind, b = Math.abs(Math.sin(ctx.T * 6 + c.id * 3)) * (c.moving ? u * .12 : 0), f = c.dir < 0 ? -1 : 1;
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y, u * .3, u * .12, 0, 0, 7); g.fill();
  const body = (bx, by, rx, ry, cc) => blob(g, x + bx * f, y - by - b, rx, ry, cc);
  switch (k) {
    case 'cow': body(0, u * .3, u * .32, u * .2, '#f5f5f2'); body(-u * .1, u * .32, u * .1, u * .08, '#2c2c30'); body(u * .32, u * .38, u * .13, u * .11, '#f5f5f2'); break;
    case 'sheep': body(0, u * .28, u * .28, u * .22, '#f1efe8'); body(u * .27, u * .3, u * .1, u * .09, '#4a4a4f'); break;
    case 'chicken': body(0, u * .18, u * .14, u * .12, '#fbfbf7'); body(u * .12, u * .3, u * .06, u * .06, '#e0584a'); break;
    case 'deer': body(0, u * .36, u * .26, u * .16, '#a8794b'); body(u * .3, u * .6, u * .09, u * .09, '#a8794b'); break;
    case 'rabbit': body(0, u * .14, u * .13, u * .1, '#d9d4cb'); body(u * .1, u * .28, u * .04, u * .1, '#d9d4cb'); break;
    case 'dog': body(0, u * .2, u * .2, u * .12, '#3b2a22'); body(u * .22, u * .28, u * .09, u * .08, '#3b2a22'); break;
    case 'gull': g.strokeStyle = col('#ffffff'); g.lineWidth = 2; { const fl = Math.sin(ctx.T * 8 + c.id) * u * .1, yy = y - u * 1.4 - Math.sin(ctx.T + c.id) * u * .2; g.beginPath(); g.moveTo(x - u * .25, yy + fl); g.lineTo(x, yy); g.lineTo(x + u * .25, yy + fl); g.stroke(); } break;
    case 'crow': body(0, u * .16, u * .12, u * .09, '#24262c'); body(u * .1, u * .24, u * .06, u * .06, '#24262c'); break;
    case 'astronaut': body(0, u * .36, u * .13, u * .22, '#f4f5f7'); body(0, u * .62, u * .12, u * .12, '#f4f5f7'); body(u * .04, u * .62, u * .07, u * .06, '#274a8a'); break;
    default: body(0, u * .34, u * .12, u * .2, ['#d9534f', '#4a8fd9', '#e0a63a'][c.id % 3]); body(0, u * .62, u * .09, u * .09, '#f2cfa5');
  }
}

// ---- the board -----------------------------------------------------------------------------------------------
function hexPath(g, x, y, z, ti, scaleTop = 1) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const px = x + Math.cos(a) * z * scaleTop, py = y + Math.sin(a) * z * ti * scaleTop; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
function drawBoard(g, W, st) { // st: {season, lt, weather, T, hover:[cells], sel, grid, drops, fam, now, gravity, born, dust, balls, critters}
  const z = SZ(), ti = view.tilt, order = [...W.cells.values()].sort((a, b) => { const A = rotAx(a.q, a.r, view.rot), B = rotAx(b.q, b.r, view.rot); return A[1] - B[1] || A[0] - B[0]; });
  const gm = FAMILIES_G(W.recipe.family), ground = GROUND[gm], side = SIDE[gm], winter = st.season === 'winter';
  const critters = st.critters || [], balls = st.balls || [], items = [];
  for (const c of order) {
    const [x, y] = hexToXY(c.q, c.r), hh = (c.water ? c.wl - .4 : c.h) * HS * view.zoom, base = (c.water ? 0 : 0);
    const down = hh + HS * view.zoom * .9;
    let top = ground(c, st.season, W.recipe); if (winter && gm !== 'regolith') top = mix(top, '#f2f7fa', c.h >= 2 ? .85 : .6); if (c.water) top = mix('#4fa6d8', '#78c2ea', c.rv);
    const sd = c.water ? mix('#2f78a8', '#3b8bbb', .5) : (winter && gm !== 'regolith' ? mix(side, '#cfd8dc', .35) : side);
    const v = i => [x + Math.cos(Math.PI / 180 * (60 * i - 30)) * z, y - hh + Math.sin(Math.PI / 180 * (60 * i - 30)) * z * ti];
    const p1 = v(1), p2 = v(2), p3 = v(3);
    g.fillStyle = col(sd, .82); g.beginPath(); g.moveTo(p3[0], p3[1]); g.lineTo(p2[0], p2[1]); g.lineTo(p2[0], p2[1] + down); g.lineTo(p3[0], p3[1] + down); g.closePath(); g.fill();
    g.fillStyle = col(sd, .6); g.beginPath(); g.moveTo(p2[0], p2[1]); g.lineTo(p1[0], p1[1]); g.lineTo(p1[0], p1[1] + down); g.lineTo(p2[0], p2[1] + down); g.closePath(); g.fill();
    if (c.water) { g.fillStyle = col(top, 1); hexPath(g, x, y - hh, z, ti); g.fill(); g.strokeStyle = `rgba(255,255,255,${.2 + .15 * Math.sin(st.T * 2 + c.q * 2)})`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - z * .4, y - hh + Math.sin(st.T * 2 + c.r) * 2); g.quadraticCurveTo(x, y - hh - 3, x + z * .4, y - hh + 1); g.stroke(); }
    else {
      const [rq, rr] = rotAx(c.q, c.r, view.rot); const nb = W.cells.get(ckey(c.q + 1, c.r - 1)); let f = 1.0 + (nb && nb.h < c.h ? .08 : nb && nb.h > c.h ? -.05 : 0);
      g.fillStyle = col(top, f); hexPath(g, x, y - hh, z, ti); g.fill();
    }
    if (st.grid) { g.strokeStyle = `rgba(255,255,255,${c.water ? .16 : .22})`; g.lineWidth = 1; hexPath(g, x, y - hh, z * .98, ti); g.stroke(); }
    items.push({c, x, y: y - hh, key: ckey(c.q, c.r), ord: rotAx(c.q, c.r, view.rot)});
    const pr = W.props.get(ckey(c.q, c.r));
    if (pr) {
      const bornT = st.born.get(pr.id) ?? -1e9, age = (st.now - bornT) / 1000;
      if (age >= 0) {
        const gpx = st.gravity * 60, t0 = Math.sqrt(2 * 200 / gpx), land = clamp(age, 0, 99); let lift = age < t0 ? 200 - .5 * gpx * age * age : 0, sq = 1;
        if (age >= t0 && age < t0 + .35) { const k = (age - t0) / .35; lift = Math.abs(Math.sin(k * 5)) * (1 - k) * 14 * st.bounce; sq = 1 - (1 - k) * .12; if (!st.dust.has(pr.id)) { st.dust.add(pr.id); for (let i = 0; i < 6; i++) st.parts.push({x: x, y: y - hh, vx: (i - 2.5) * 18, vy: -30 - i * 4, life: .6, t: 0, kind: 'dust'}); } }
        items[items.length - 1].prop = pr; items[items.length - 1].lift = lift; items[items.length - 1].sq = sq;
      }
    }
  }
  // props and critters drawn per cell, back to front
  const crit = critters.map(cr => { const [x, y] = hexToXY(cr.q, cr.r); const cell = W.cells.get(ckey(Math.round(cr.q), Math.round(cr.r))); const hh = cell ? (cell.water ? cell.wl - .4 : cell.h) * HS * view.zoom : 0; const [rq, rr] = rotAx(cr.q, cr.r, view.rot); return {cr, x, y: y - hh, ord: [rq, rr]}; });
  const draw = [...items.filter(i => i.prop).map(i => ({o: i.ord, f: () => { const u = z * .62 * view.zoom ** 0; g.save(); g.translate(i.x, i.y - i.lift * view.zoom); g.scale(1 / i.sq, i.sq); drawProp(g, i.prop, 0, 0, u * 1.35, st); g.restore(); if (st.sel === i.prop.id || (st.hover && st.hover[0] && st.hover[0].q === i.c.q && st.hover[0].r === i.c.r && st.tool === 'select')) { g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.2; g.setLineDash([5, 4]); g.lineDashOffset = -st.T * 12; hexPath(g, i.x, i.y, z * .95, ti); g.stroke(); g.setLineDash([]); } }})),
    ...crit.map(i => ({o: i.ord, f: () => drawCritter(g, i.cr, i.x, i.y, z * .8, st)})),
    ...balls.map(b => { const [bx, by] = ballXY(b); const sx = cx + view.px + bx * z, sy = cy + view.py + by * z * ti; return {o: ballOrd(b), f: () => { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy - b.fl * view.zoom, z * .13, z * .06, 0, 0, 7); g.fill(); blob(g, sx, sy - b.z * view.zoom - z * .1, z * .14, z * .14, b.c); }}; })];
  draw.sort((a, b) => a.o[1] - b.o[1] || a.o[0] - b.o[0]).forEach(d => d.f());
}
function ballXY(b) { // world metres (unrotated) -> rotated screen metres
  const a = (b.x), c = (b.y); const ang = view.rot * Math.PI / 3, rx = a * Math.cos(ang) - c * Math.sin(ang), ry = a * Math.sin(ang) + c * Math.cos(ang); return [rx, ry * 1];
}
function ballOrd(b) { const [x, y] = ballXY(b); return [x, y / 1.5]; }
function FAMILIES_G(f) { return {moon: 'regolith', wasteland: 'dust', coast: 'sand'}[f] || 'grass'; }

// ---- weather particles ---------------------------------------------------------------------------------------
function stepParticles(parts, dt, w, h, weather, env, season, family, lt) {
  const gm = clamp(env.gravity / 9.81, .12, 3) ** .75, want = {rain: 260, storm: 420, snow: 160, dust: 90, fog: 0, clear: 0, cloudy: 0}[weather] ?? 0;
  let extra = 0; if (weather === 'clear' || weather === 'cloudy') { if (season === 'autumn') extra = 26; if (season === 'spring') extra = 18; if (season === 'summer' && lt.night > .5 && family !== 'moon') extra = 22; }
  const kind = want ? (weather === 'snow' ? 'snow' : weather === 'dust' ? 'dust' : 'rain') : extra ? (season === 'autumn' ? 'leaf' : season === 'spring' ? 'petal' : 'fly') : null;
  const target = want || extra, count = parts.filter(p => p.kind !== 'dust' || p.weather).length;
  if (kind && count < target && !document.hidden) for (let i = 0; i < Math.min(target - count, 14); i++) parts.push({kind, weather: 1, x: Math.random() * (w + 200) - 100, y: -10 - Math.random() * h * .3, vx: 0, vy: 0, s: Math.random(), life: 99, t: 0});
  for (const p of parts) {
    p.t += dt;
    if (p.kind === 'dust' && !p.weather) { p.vy += 120 * dt; }
    else if (p.kind === 'rain') { p.vy = (weather === 'storm' ? 780 : 620) * gm; p.vx = (env.wind - .15) * 260; }
    else if (p.kind === 'snow') { p.vy = 70 * gm + p.s * 40 * gm; p.vx = Math.sin(p.t * 1.6 + p.s * 9) * 26 + env.wind * 90; }
    else if (p.kind === 'leaf' || p.kind === 'petal') { p.vy = 55 * gm + p.s * 24; p.vx = Math.sin(p.t * 2 + p.s * 7) * 40 + env.wind * 160; }
    else if (p.kind === 'fly') { p.vy = Math.sin(p.t * 2 + p.s * 9) * 22; p.vx = Math.cos(p.t * 1.3 + p.s * 5) * 22; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.weather && (p.y > h + 10 || p.x > w + 120 || p.x < -120) && kind) { p.y = -10; p.x = Math.random() * (w + 200) - 100; }
    else if (p.weather && !kind) p.life = 0;
    if (!p.weather) p.life -= dt;
  }
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
}
function drawParticles(g, parts, lt) {
  for (const p of parts) {
    if (p.kind === 'rain') { g.strokeStyle = 'rgba(190,215,255,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); g.stroke(); }
    else if (p.kind === 'snow') { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(p.x, p.y, 1.6 + p.s * 1.8, 0, 7); g.fill(); }
    else if (p.kind === 'leaf') { g.fillStyle = ['#e0842b', '#c9452c', '#e7b53a'][Math.floor(p.s * 3)]; g.fillRect(p.x, p.y, 5, 3); }
    else if (p.kind === 'petal') { g.fillStyle = '#f7c5d6'; g.fillRect(p.x, p.y, 4, 3); }
    else if (p.kind === 'fly') { g.fillStyle = `rgba(255,240,150,${.4 + .5 * Math.sin(p.t * 5 + p.s * 9)})`; g.beginPath(); g.arc(p.x, p.y + 380 * p.s, 2.2, 0, 7); g.fill(); }
    else if (p.kind === 'dust') { g.fillStyle = `rgba(230,225,215,${Math.max(0, p.life) * .8})`; g.beginPath(); g.arc(p.x, p.y, 3 + (0.6 - p.life) * 8, 0, 7); g.fill(); }
  }
}
