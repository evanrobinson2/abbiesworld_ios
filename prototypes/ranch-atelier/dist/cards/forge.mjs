// Card Forge: one renderer for every Abbie's World card, in game and in print.
// A card is a small JSON spec (cards/README.md). renderCard() paints it in millimetres, so one layout comes out as a
// hand card in the game or a 600 ppi print master with 3 mm bleed. Frames, gems, icons and type are drawn at the
// output resolution; only the art is a bitmap, and model art is rendered from the game's own GLB at print resolution.
// The face follows the card rubric in docs/oracle/cards (CARD_STUDY.md, card-rubric.json): window shape tells the
// card type, rarity is a growth stage told by gem shape + colour + frame colour, a cost and at most two stats sit
// in fixed corners, and the face carries at most 15 words.
import * as THREE from 'three';
import { GLTFLoader } from '/vendor/loaders/GLTFLoader.js';

export const CARD = { w: 63, h: 88, bleed: 3, safe: 3, radius: 3 }; // mm

// Layout in trim millimetres (0,0 is the top-left of the cut card).
export const L = {
  art: { x: 4, y: 4, w: 55, h: 52 },          // 51.6% of the face
  subject: { x: 4, y: 17.5, w: 55, h: 37 },   // where a model or cut-out stands: below the ribbon, above the gem
  ribbon: { x: 7.2, y: 12, w: 48.6, h: 7.2 },
  cost: { cx: 9.4, cy: 9.4, r: 5.7 },
  gem: { cx: 31.5, cy: 56.2, r: 3.1 },
  type: { x: 14, y: 59.4, w: 35, h: 3.8 },
  text: { x: 4.5, y: 63.6, w: 54, h: 10.4 },
  stats: [{ cx: 9.4, cy: 79.6 }, { cx: 53.6, cy: 79.6 }], statR: 5.2,
  collector: { x: 17.2, y: 79.2, w: 28.6, h: 5.4 },
  // Sun tier: full art with a window the subject steps out of; the ribbon moves above the window
  sunArt: { x: 4, y: 16, w: 55, h: 40 },
  sunSubject: { x: 4, y: 10.2, w: 55, h: 44.8 },
  sunRibbon: { x: 15.6, y: 3.6, w: 43, h: 7 },
};
// How the art sits on the card, per tier (CARD_ART.md house mapping). A spec can override with "artStyle".
export const ART_STYLES = { seed: 'specimen', sprout: 'portal', bloom: 'portal', harvest: 'shadowbox', sun: 'popout' };
const STYLE_MODES = { specimen: ['specimen'], portal: ['portal'], shadowbox: ['shadowbox'], popout: ['overlay', 'popout'] };
const NUMERAL_MM = 8; // 22.7 pt: cap height is over 6% of card height, as the rubric asks

// Rarity is a growth stage. Gem colours are the rubric's OKLCH values (colour-blind checked there).
export const RARITIES = {
  seed:    { label: 'Seed',    kid: 'Common',    order: 0, oklch: [0.40, 0.07, 60],  finish: 'standard' },
  sprout:  { label: 'Sprout',  kid: 'Uncommon',  order: 1, oklch: [0.62, 0.14, 140], finish: 'standard' },
  bloom:   { label: 'Bloom',   kid: 'Rare',      order: 2, oklch: [0.70, 0.12, 235], finish: 'standard' },
  harvest: { label: 'Harvest', kid: 'Epic',      order: 3, oklch: [0.52, 0.16, 330], finish: 'golden_hour' },
  sun:     { label: 'Sun',     kid: 'Legendary', order: 4, oklch: [0.85, 0.15, 85],  finish: 'shimmer' },
};
const RARITY_ALIAS = { common: 'seed', uncommon: 'sprout', rare: 'bloom', epic: 'harvest', legendary: 'sun' };
export const rarityOf = r => RARITIES[r] ? r : RARITY_ALIAS[r] || 'seed';

// Card type is told by the art window's shape; the accent colour is a second cue.
export const TYPES = {
  animal:   { label: 'Animal',   shape: 'arch',    accent: '#5b7a3a' },
  building: { label: 'Building', shape: 'gable',   accent: '#9a4b35' },
  crop:     { label: 'Crop',     shape: 'scallop', accent: '#a8792a' },
  weather:  { label: 'Weather',  shape: 'circle',  accent: '#3b6f96' },
  helper:   { label: 'Helper',   shape: 'chamfer', accent: '#6e4e7d' },
};
export const FINISHES = { standard: 'STD', shimmer: 'SHM', golden_hour: 'GLD', frost: 'FRS' };

// The look is cel-shaded: flat colour, ink lines, no fake wood, metal, paper, bevels or grain (Evan, 2026-10-23).
// Each tier's frame is one flat colour (body), a rim colour (edge) and a line colour (trim).
const INK = '#2a1c12';
const FRAME = {
  seed:    { body: '#ecd6a8', edge: '#c9a46c', trim: '#8a6236' },
  sprout:  { body: '#d3e5a8', edge: '#9cc16f', trim: '#4d7a33' },
  bloom:   { body: '#c2dcef', edge: '#86b2d4', trim: '#2f6390' },
  harvest: { body: '#f3d277', edge: '#dcaa3e', trim: '#8c3f6e' },
  sun:     { body: '#ffe68f', edge: '#f4bf42', trim: '#c26a12' },
};
const PAPER = '#fff5df'; // ribbon and rules plate

// A quiet pattern in the frame says where the card lives. spec.pattern wins; then the tile, the crop type, the biome.
export const PATTERNS = ['barn-boards', 'sprout-rows', 'meadow-flowers', 'stars', 'waves', 'cobbles', 'plain'];
const PATTERN_OF = { ranch: 'barn-boards', dusk: 'barn-boards', orchard: 'sprout-rows', garden: 'sprout-rows', meadow: 'meadow-flowers', moon: 'stars', moonbase: 'stars', sea: 'waves', beach: 'waves', city: 'cobbles', town: 'cobbles' };
export function patternOf(spec) {
  if (PATTERNS.includes(spec.pattern)) return spec.pattern;
  const tile = spec.tile || (String(spec.id || '').startsWith('tile-') ? spec.id.slice(5) : null);
  return PATTERN_OF[tile] || (spec.type === 'crop' ? 'sprout-rows' : PATTERN_OF[spec.biome]) || 'barn-boards';
}

// Flat cel backdrops behind models and cut-outs, one per world: two sky bands, hills, two ground bands.
export const BIOMES = {
  ranch: { sky: ['#9fd0ea', '#cfe8ef'], sun: '#fff3c9', hills: ['#bcd592', '#a1c575', '#8bb35f'], ground: ['#93c25f', '#7fae4f'] },
  orchard: { sky: ['#f2c49a', '#f9dfc0'], sun: '#fff0d2', hills: ['#cbd292', '#b0c273', '#97b05b'], ground: ['#9fbe5e', '#89aa4e'] },
  garden: { sky: ['#a8d8e8', '#d8eef0'], sun: '#fff4cc', hills: ['#acd189', '#92c16c', '#7cb059'], ground: ['#a8805a', '#957049'] },
  meadow: { sky: ['#a6dcf0', '#d6f0f2'], sun: '#fff6d0', hills: ['#c6e19c', '#abd37e', '#93c368'], ground: ['#9fd06c', '#89bf5a'], flowers: true },
  dusk: { sky: ['#8d7fb8', '#e6a9b8'], sun: '#ffe1b8', hills: ['#9d9ab8', '#8290a8', '#6c7f94'], ground: ['#728d64', '#5f7854'] },
  moon: { sky: ['#101a3c', '#1f2d5c'], sun: '#dfe9ff', hills: ['#646b84', '#545a72', '#454a60'], ground: ['#7a8096', '#666b80'], stars: true },
};

const ICON_DISC = {
  coin: '#a8781c', milk: '#3f74ad', heart: '#b8404f', egg: '#a8701c', wheat: '#8f6a1e', wood: '#7a4c28', star: '#6a4fb0',
  apple: '#4f7a2f', paw: '#7a5a3c', sun: '#b8681a', water: '#2a6f96', wool: '#5f6b80', hammer: '#4f5864', bolt: '#2f5f92',
};
export const ICONS = Object.keys(ICON_DISC);

// ---------------------------------------------------------------- fonts (two open-licence families, per the rubric)

const FONT = { display: 'CardFredoka', body: 'CardNunito' };
let fontsReady = null;
export function loadFonts(base = new URL('./fonts/', import.meta.url).href) {
  if (fontsReady) return fontsReady;
  const faces = [
    new FontFace(FONT.display, `url(${base}fredoka.woff2)`, { weight: '300 700' }),
    new FontFace(FONT.body, `url(${base}nunito-700.woff2)`, { weight: '700' }),
    new FontFace(FONT.body, `url(${base}nunito-700-italic.woff2)`, { weight: '700', style: 'italic' }),
    new FontFace(FONT.body, `url(${base}nunito-800.woff2)`, { weight: '800' }),
    new FontFace(FONT.body, `url(${base}nunito-900.woff2)`, { weight: '900' }),
  ];
  fontsReady = Promise.all(faces.map(f => f.load().then(x => document.fonts.add(x))));
  return fontsReady;
}
const nameFont = s => `600 ${s}px ${FONT.display}`;
const numFont = s => `700 ${s}px ${FONT.display}`;
const typeFont = s => `900 ${s}px ${FONT.body}`;
const rulesFont = s => `800 ${s}px ${FONT.body}`;
const footFont = s => `800 ${s}px ${FONT.body}`;
const MM_PER_PT = 25.4 / 72;

// ---------------------------------------------------------------- small helpers

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}
function rrect(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}
function hashSeed(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
const TAU = Math.PI * 2;
function disc(ctx, cx, cy, r, fill) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = fill; ctx.fill(); }
function inkLine(ctx, pathFn, lw = 0.45, col = INK) {
  ctx.save(); ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.strokeStyle = col; pathFn(); ctx.stroke(); ctx.restore();
}
// A cel rim: a flat colour band with an ink line on each side (in place of bevels).
function celRim(ctx, pathFn, col, lw) {
  ctx.save(); ctx.lineJoin = 'round';
  ctx.lineWidth = lw + 0.5; ctx.strokeStyle = INK; pathFn(); ctx.stroke();
  ctx.lineWidth = lw; ctx.strokeStyle = col; pathFn(); ctx.stroke();
  ctx.restore();
}
function sparkle(ctx, cx, cy, s) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.22 : s; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill();
}
function flower(ctx, cx, cy, s, petal, centre) {
  for (let k = 0; k < 5; k++) { const a = k * TAU / 5 - Math.PI / 2; disc(ctx, cx + Math.cos(a) * s, cy + Math.sin(a) * s, s * 0.78, petal); }
  disc(ctx, cx, cy, s * 0.62, centre);
}

// The frame's quiet pattern, drawn in colour c over the flat body colour bg. Low contrast on purpose.
function paintPattern(ctx, kind, x, y, w, h, c, bg, seed) {
  if (!kind || kind === 'plain') return;
  const r = rng(seed + 31);
  ctx.save(); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'barn-boards') {
    const bw = 4.4; ctx.lineWidth = 0.3;
    for (let i = 0, px = x; px < x + w; px += bw, i++) {
      ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + h); ctx.stroke();
      const end = y + h * (i % 2 ? 0.3 : 0.7) + (r() - 0.5) * 8; // board ends, staggered, with two nails each side
      ctx.beginPath(); ctx.moveTo(px, end); ctx.lineTo(px + bw, end); ctx.stroke();
      for (const ny of [end - 1.2, end + 1.2]) for (const nx of [px + 1, px + bw - 1]) disc(ctx, nx, ny, 0.24, c);
    }
  } else if (kind === 'sprout-rows') {
    const sx = 5.4, sy = 6.2; ctx.lineWidth = 0.26;
    for (let j = 0, yy = y + 2; yy < y + h + sy; yy += sy, j++) {
      ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(x, yy + 0.5); ctx.lineTo(x + w, yy + 0.5); ctx.stroke(); ctx.globalAlpha = 1;
      for (let xx = x + (j % 2 ? sx / 2 : 0); xx < x + w + sx; xx += sx) {
        ctx.beginPath(); ctx.moveTo(xx, yy + 0.4); ctx.lineTo(xx, yy - 0.9); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(xx - 0.62, yy - 1.15, 0.6, 0.3, -0.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(xx + 0.62, yy - 1.15, 0.6, 0.3, 0.5, 0, TAU); ctx.fill();
      }
    }
  } else if (kind === 'meadow-flowers') {
    const g = 6.6;
    for (let yy = y; yy < y + h + g; yy += g) for (let xx = x; xx < x + w + g; xx += g) {
      const fx = xx + r() * g * 0.7, fy = yy + r() * g * 0.7;
      if (r() < 0.62) flower(ctx, fx, fy, 0.5 + r() * 0.18, c, bg);
      else { ctx.lineWidth = 0.24; ctx.beginPath(); ctx.moveTo(fx, fy + 0.6); ctx.quadraticCurveTo(fx + 0.2, fy - 0.2, fx + 0.7, fy - 0.6); ctx.stroke(); disc(ctx, fx + 0.75, fy - 0.65, 0.24, c); }
    }
  } else if (kind === 'stars') {
    const g = 5.6;
    for (let yy = y; yy < y + h + g; yy += g) for (let xx = x; xx < x + w + g; xx += g) {
      const sx = xx + r() * g * 0.8, sy = yy + r() * g * 0.8;
      if (r() < 0.35) sparkle(ctx, sx, sy, 0.75 + r() * 0.45); else disc(ctx, sx, sy, 0.16 + r() * 0.16, c);
    }
  } else if (kind === 'waves') {
    const g = 3.6; ctx.lineWidth = 0.28;
    for (let j = 0, yy = y; yy < y + h + g; yy += g, j++) {
      ctx.beginPath();
      for (let xx = x - g + (j % 2) * g / 2; xx < x + w + g; xx += g) { ctx.moveTo(xx, yy); ctx.arc(xx + g / 2, yy, g / 2, Math.PI, 0); }
      ctx.stroke();
    }
  } else if (kind === 'cobbles') {
    const g = 3.4; ctx.lineWidth = 0.26;
    for (let j = 0, yy = y; yy < y + h; yy += g, j++) for (let xx = x - (j % 2) * g / 2; xx < x + w; xx += g) {
      rrect(ctx, xx + 0.25 + r() * 0.2, yy + 0.25 + r() * 0.2, g - 0.6, g - 0.6, 0.9); ctx.stroke();
    }
  }
  ctx.restore();
}
export function oklchToHex([l, c, h]) {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_];
  return '#' + lin.map(v => { v = Math.min(1, Math.max(0, v)); v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
}

// ---------------------------------------------------------------- icons (drawn in a 24-unit box)

const P = s => new Path2D(s);
const ICON_PATHS = {
  heart: P('M12 21s-7.6-4.6-9.6-9.3C.9 8.3 3.1 4.4 6.9 4.4c2.2 0 3.7 1.3 5.1 3.1 1.4-1.8 2.9-3.1 5.1-3.1 3.8 0 6 3.9 4.5 7.3C19.6 16.4 12 21 12 21z'),
  egg: P('M12 2.6c3.9 0 7.2 6.3 7.2 11.3 0 4.5-3.2 7.6-7.2 7.6s-7.2-3.1-7.2-7.6C4.8 8.9 8.1 2.6 12 2.6z'),
  milk: P('M9 2.4h6v2.2l2.2 3.1v12.1a1.8 1.8 0 0 1-1.8 1.8H8.6a1.8 1.8 0 0 1-1.8-1.8V7.7L9 4.6z'),
  water: P('M12 2.4s7 7.8 7 12.6a7 7 0 0 1-14 0c0-4.8 7-12.6 7-12.6z'),
  apple: P('M12 7.6c-1.6-1.3-5.8-1.9-7.4 1.7-1.7 3.8.4 9.8 3.6 11.9 1.5.9 2.5.4 3.8.4s2.3.5 3.8-.4c3.2-2.1 5.3-8.1 3.6-11.9C17.8 5.7 13.6 6.3 12 7.6zM12.4 7.2c.1-2.2 1-3.8 2.6-4.8.4.6.2 1-.2 1.3-1.1.8-1.7 2-1.8 3.5z'),
  bolt: P('M13.5 1.8 4.6 13.6h6l-1.3 8.6 9.1-12.1h-6.1z'),
  wool: P('M7 19.5a4.3 4.3 0 0 1-.9-8.5 5 5 0 0 1 8.9-4.3 4.6 4.6 0 0 1 6.4 4.9 4.1 4.1 0 0 1-1.3 7.9z'),
};
function drawIconGlyph(ctx, icon, cx, cy, size, fill = '#fffaf0') {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = fill; ctx.strokeStyle = fill; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (ICON_PATHS[icon]) {
    ctx.fill(ICON_PATHS[icon]);
    if (icon === 'milk') { ctx.globalAlpha = 0.35; ctx.fillStyle = '#000'; ctx.fillRect(8.6, 11, 6.8, 1.6); }
  } else if (icon === 'star' || icon === 'coin') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4.6 : 10.4; ctx.lineTo(12 + Math.cos(a) * r, 12.6 + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
  } else if (icon === 'sun') {
    ctx.beginPath(); ctx.arc(12, 12, 5.2, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.4;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(12 + Math.cos(a) * 7.8, 12 + Math.sin(a) * 7.8); ctx.lineTo(12 + Math.cos(a) * 10.8, 12 + Math.sin(a) * 10.8); ctx.stroke(); }
  } else if (icon === 'wheat') {
    ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(12, 4); ctx.stroke();
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
      ctx.save(); ctx.translate(12 + s * 2.4, 6.5 + i * 3.6); ctx.rotate(s * 0.55);
      ctx.beginPath(); ctx.ellipse(0, 0, 1.6, 2.9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(12, 3.4, 1.5, 2.6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (icon === 'wood') {
    ctx.save(); ctx.translate(12, 12); ctx.rotate(-0.5); rrect(ctx, -9.5, -4.6, 17, 9.2, 4.6); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(17.3, 9.1, 3.3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(17.3, 9.1, 1.7, 0, Math.PI * 2); ctx.stroke();
  } else if (icon === 'paw') {
    ctx.beginPath(); ctx.ellipse(12, 15.6, 5.4, 4.6, 0, 0, Math.PI * 2); ctx.fill();
    for (const [x, y] of [[5.4, 10.4], [9.2, 6.4], [14.8, 6.4], [18.6, 10.4]]) { ctx.beginPath(); ctx.ellipse(x, y, 2.3, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }
  } else if (icon === 'hammer') {
    ctx.save(); ctx.translate(12, 12); ctx.rotate(Math.PI / 4); rrect(ctx, -1.4, -3, 2.8, 13.5, 1.2); ctx.fill(); rrect(ctx, -7, -8.5, 14, 6, 1.4); ctx.fill(); ctx.restore();
  }
  ctx.restore();
}

// Flat icon disc with an ink ring and a glyph: stat badges, ability icons and inline rules icons.
function drawIconDisc(ctx, icon, cx, cy, r, rim = PAPER) {
  disc(ctx, cx, cy, r, INK);
  disc(ctx, cx, cy, r * 0.86, rim);
  celDisc(ctx, cx, cy, r * 0.7, ICON_DISC[icon] || '#666');
  drawIconGlyph(ctx, icon, cx, cy + r * 0.02, r * 0.95);
}
// A flat colour disc with an ink line and one hard-edged highlight (cel shading, no gradients).
function celDisc(ctx, cx, cy, r, col) {
  disc(ctx, cx, cy, r, INK);
  disc(ctx, cx, cy, r * 0.9, col);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(cx + r * 0.25, cy + r * 0.32, r * 0.95, 0, TAU); ctx.rect(cx + 2 * r, cy - 2 * r, -4 * r, 4 * r);
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill('evenodd');
  ctx.restore();
}

// Chunky outlined number (GAME_FEEL: one rounded display face with a dark outline).
function numeral(ctx, s, cx, cy, size, fill = '#fff8e8', stroke = INK) {
  ctx.save();
  ctx.font = numFont(size); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(s), base = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = stroke;
  ctx.strokeText(s, cx, base);
  ctx.fillStyle = fill; ctx.fillText(s, cx, base);
  ctx.restore();
}

// ---------------------------------------------------------------- text layout with inline icons

function tokenize(text) {
  return String(text || '').split('\n').map(para => para.split(/\s+/).filter(Boolean).map(raw =>
    raw.split(/(\{[a-z]+\})/).filter(Boolean).map(p => { const m = p.match(/^\{([a-z]+)\}$/); return m ? { icon: m[1] } : { text: p }; })));
}
export function faceWords(text) { return String(text || '').replace(/\{[a-z]+\}/g, ' ').split(/\s+/).filter(w => /[a-z0-9]/i.test(w)).length; }
function layoutParagraphs(ctx, paras, font, size, maxW, lineH) {
  ctx.font = font(size);
  const space = ctx.measureText(' ').width, lines = [];
  const wordW = parts => parts.reduce((w, p) => w + (p.icon ? size * 1.16 : ctx.measureText(p.text).width), 0);
  for (const words of paras) {
    let line = [], lw = 0;
    for (const word of words) {
      const ww = wordW(word);
      if (line.length && lw + space + ww > maxW) { lines.push({ words: line, w: lw }); line = []; lw = 0; }
      lw += (line.length ? space : 0) + ww; line.push(word);
    }
    lines.push({ words: line, w: lw });
  }
  return { lines, height: lines.length * size * lineH, space, tooWide: lines.some(l => l.w > maxW + 0.01) };
}
function drawLines(ctx, layout, font, size, x, y, w, lineH, color) {
  ctx.font = font(size); ctx.textBaseline = 'alphabetic';
  let yy = y + size * 0.86;
  for (const line of layout.lines) {
    let xx = x + (w - line.w) / 2;
    line.words.forEach((word, i) => {
      if (i) xx += layout.space;
      for (const p of word) {
        if (p.icon) { drawIconDisc(ctx, p.icon, xx + size * 0.58, yy - size * 0.33, size * 0.58); xx += size * 1.16; }
        else { ctx.fillStyle = color; ctx.fillText(p.text, xx, yy); xx += ctx.measureText(p.text).width; }
      }
    });
    yy += size * lineH;
  }
}

// ---------------------------------------------------------------- art

const artCache = new Map();
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async';
    img.onload = () => resolve(img); img.onerror = () => reject(new Error('could not load ' + src)); img.src = src;
  });
}

let gl = null;
function glRig() {
  if (gl) return gl;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // cel colours stay the model's own colours
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  return (gl = { renderer, loader: new GLTFLoader() });
}

// Three-step toon ramp: shadow, mid, lit. Nearest filtering keeps the steps hard.
let toonRamp = null;
function ramp() {
  if (toonRamp) return toonRamp;
  const t = new THREE.DataTexture(new Uint8Array([105, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return (toonRamp = t);
}
function toonOf(m) {
  // a card is a solid print: see-through toy materials read as ghosts against the painted world
  const seeThrough = m.transparent || m.opacity < 1;
  return new THREE.MeshToonMaterial({
    color: m.color ? m.color.clone() : new THREE.Color(0xffffff), map: m.map || null, gradientMap: ramp(),
    vertexColors: !!m.vertexColors, side: m.side, alphaTest: seeThrough ? Math.max(m.alphaTest || 0, 0.5) : m.alphaTest || 0,
    emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0), emissiveMap: m.emissiveMap || null, emissiveIntensity: m.emissiveIntensity ?? 1,
  });
}
// Part lines: each part (mesh material) is drawn in a flat id colour; where two ids meet, an ink line goes on.
// Toys are built from parts, so this is where a cel artist would ink: ear over head, leg over body, roof over wall.
function partLines(renderer, scene, cam, model, w, h, t) {
  const ids = new Map(), keep = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    keep.push([o, o.material]);
    const flat = [o.material].flat().map(m => {
      if (!ids.has(m)) { const n = ids.size; ids.set(m, new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL((n * 0.618034) % 1, 0.85, [0.3, 0.5, 0.7][n % 3]) })); }
      return ids.get(m);
    });
    o.material = Array.isArray(o.material) ? flat : flat[0];
  });
  renderer.clear(); renderer.render(scene, cam);
  for (const [o, m] of keep) o.material = m;
  for (const m of ids.values()) m.dispose();
  const c = mkCanvas(w, h), cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(renderer.domElement, 0, 0);
  const src = cx.getImageData(0, 0, w, h), d = src.data, e = cx.createImageData(w, h), o = e.data, ink = parseInt(INK.slice(1), 16);
  const differ = (i, j) => d[i + 3] > 200 && d[j + 3] > 200 && Math.abs(d[i] - d[j]) + Math.abs(d[i + 1] - d[j + 1]) + Math.abs(d[i + 2] - d[j + 2]) > 60;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if ((x + 1 < w && differ(i, i + 4)) || (y + 1 < h && differ(i, i + w * 4))) { o[i] = ink >> 16; o[i + 1] = (ink >> 8) & 255; o[i + 2] = ink & 255; o[i + 3] = 255; }
  }
  cx.clearRect(0, 0, w, h); cx.putImageData(e, 0, 0);
  const lines = mkCanvas(w, h), lx = lines.getContext('2d');
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; lx.drawImage(c, Math.cos(a) * t, Math.sin(a) * t); }
  lx.drawImage(c, 0, 0);
  return lines;
}

// Silhouette ink line around an image with a transparent backdrop. Soft alpha (a contact shadow) gets no line.
function inkOutline(src, w, h, t) {
  const sil = mkCanvas(w, h), s = sil.getContext('2d', { willReadFrequently: true });
  s.drawImage(src, 0, 0, w, h);
  const img = s.getImageData(0, 0, w, h), d = img.data, ink = parseInt(INK.slice(1), 16);
  for (let i = 0; i < d.length; i += 4) { d[i] = ink >> 16; d[i + 1] = (ink >> 8) & 255; d[i + 2] = ink & 255; d[i + 3] = d[i + 3] >= 150 ? 255 : 0; }
  s.putImageData(img, 0, 0);
  const out = mkCanvas(w, h), o = out.getContext('2d');
  for (let k = 0; k < 16; k++) { const a = k * TAU / 16; o.drawImage(sil, Math.cos(a) * t, Math.sin(a) * t); }
  o.drawImage(src, 0, 0, w, h);
  return out;
}

// A GLB as a cel-shaded hero shot: toon materials, ink part lines, a crisp contact shadow, transparent background,
// framed to `fill` of the frame. view: {yaw, pitch, fill, lift, fov, exposure}
export async function renderModel(url, w, h, view = {}) {
  const { renderer, loader } = glRig();
  const model = (await loader.loadAsync(url)).scene;
  const scene = new THREE.Scene();
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.material = Array.isArray(o.material) ? o.material.map(toonOf) : o.material ? toonOf(o.material) : o.material;
  });
  let box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  const pivot = new THREE.Group(); pivot.add(model); pivot.rotation.y = THREE.MathUtils.degToRad(view.yaw ?? -30);
  scene.add(pivot);
  box = new THREE.Box3().setFromObject(pivot);
  const size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z);

  scene.add(new THREE.AmbientLight(0xfff6e6, view.exposure ?? 1.2)); // flat fill: the toon ramp makes the steps
  const key = new THREE.DirectionalLight(0xfff4e2, 2.1);
  key.position.set(-radius * 1.6, radius * 2.6, radius * 2.2);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
  const sc = key.shadow.camera; sc.left = sc.bottom = -radius * 1.6; sc.right = sc.top = radius * 1.6; sc.near = 0.01; sc.far = radius * 10;
  scene.add(key);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 12), new THREE.ShadowMaterial({ opacity: 0.26 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const cam = new THREE.PerspectiveCamera(view.fov ?? 26, w / h, radius * 0.01, radius * 100);
  const pitch = THREE.MathUtils.degToRad(view.pitch ?? 16);
  const target = new THREE.Vector3(0, size.y * (view.lift ?? 0.46), 0);
  const corners = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
  const fill = view.fill ?? 0.8;
  let dist = radius * 3;
  for (let i = 0; i < 24; i++) {
    cam.position.set(0, target.y + Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    cam.lookAt(target); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    let mx = 0, my = 0;
    for (const p of corners) { const v = p.clone().project(cam); mx = Math.max(mx, Math.abs(v.x)); my = Math.max(my, Math.abs(v.y)); }
    const need = Math.max(mx, my) / fill;
    dist *= Math.min(Math.max(need, 0.6), 1.6);
    if (Math.abs(need - 1) < 0.01) break;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.render(scene, cam);
  const out = mkCanvas(w, h), octx = out.getContext('2d');
  octx.filter = 'saturate(1.15)'; // the game's pastel toy palette needs a small push to sing on a card
  octx.drawImage(renderer.domElement, 0, 0);
  octx.filter = 'none';
  ground.visible = false;
  if (view.lines !== false) octx.drawImage(partLines(renderer, scene, cam, model, w, h, Math.max(0.8, w * 0.0011)), 0, 0);
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); for (const m of [o.material].flat()) m?.dispose?.(); });
  return out;
}

// For an image with a transparent backdrop: the subject's box in source pixels (opaque parts, not the shadow).
function alphaBounds(src, w, h) {
  const n = 160, t = mkCanvas(n, n), tx = t.getContext('2d', { willReadFrequently: true });
  tx.drawImage(src, 0, 0, n, n);
  const d = tx.getImageData(0, 0, n, n).data;
  const corner = Math.max(d[3], d[(n - 1) * 4 + 3], d[(n * n - n) * 4 + 3], d[(n * n - 1) * 4 + 3]);
  let x0 = n, x1 = 0, y0 = n, y1 = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 200) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  if (x1 <= x0) return { corner, box: null };
  return { corner, box: { x: x0 * w / n, y: y0 * h / n, w: (x1 - x0 + 1) * w / n, h: (y1 - y0 + 1) * h / n } };
}

// Art for a spec, cached: {canvas, mode: model|cutout|image, bounds, srcW, srcH}
export async function prepareArt(spec, opts = {}) {
  const art = spec.art || {};
  const mode = spec.artMode || (art.image ? 'image' : 'model');
  const dpi = opts.artDpi || 600, view = { ...(opts.view || {}), ...(art.view || {}) }, box = opts.box || L.subject;
  const key = [mode, mode === 'model' ? art.model : art.image, JSON.stringify(view), box.w, box.h, dpi].join('|');
  if (artCache.has(key)) return artCache.get(key);
  const job = (async () => {
    if (mode === 'model') {
      if (!art.model) throw new Error('no model for this card');
      const w = Math.round(box.w / 25.4 * dpi), h = Math.round(box.h / 25.4 * dpi);
      let canvas = await renderModel(art.model, w, h, view);
      if (art.outline !== false) canvas = inkOutline(canvas, w, h, Math.max(2, dpi / 25.4 * 0.3)); // 0.3 mm silhouette line
      return { canvas, mode, srcW: w, srcH: h, bounds: alphaBounds(canvas, w, h).box, rendered: box };
    }
    if (!art.image) throw new Error('no image for this card');
    const img = await loadImage(art.image), iw = img.naturalWidth, ih = img.naturalHeight;
    const a = alphaBounds(img, iw, ih);
    // A transparent cut-out stands on the flat world backdrop, like a model render, with the same ink silhouette.
    const cut = a.corner < 40 && a.box;
    const canvas = cut && art.outline !== false ? inkOutline(img, iw, ih, Math.max(2, Math.max(a.box.w, a.box.h) * 0.008)) : img;
    return { canvas, mode: cut ? 'cutout' : 'image', bounds: cut ? a.box : null, srcW: iw, srcH: ih };
  })();
  artCache.set(key, job);
  job.catch(() => artCache.delete(key));
  return job;
}

function cutoutPlacement(art, spec, r, style) {
  const v = spec.art?.view || {}, B = art.bounds;
  const fill = v.fill ?? (style === 'specimen' ? 0.94 : 0.84);
  const s = Math.min((r.h * fill) / B.h, (r.w * 0.86) / B.w); // mm per source pixel
  const cx = r.x + r.w * (v.x ?? 0.5), by = r.y + r.h * (v.ground ?? 0.97);
  return { s, dx: cx - (B.x + B.w / 2) * s, dy: by - (B.y + B.h) * s };
}

function paintBackdrop(ctx, x, y, w, h, biomeName, seed, horizonAt = 0.66) {
  const b = BIOMES[biomeName] || BIOMES.ranch, r = rng(seed);
  const horizon = y + h * horizonAt;
  ctx.save();
  ctx.fillStyle = b.sky[0]; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = b.sky[1]; ctx.fillRect(x, y + (horizon - y) * 0.48, w, y + h - (horizon - y) * 0.48); // one hard step of sky
  if (b.stars) {
    ctx.fillStyle = '#fff6dc';
    for (let i = 0; i < 46; i++) { const px = x + r() * w, py = y + r() * (horizon - y) * 0.9, s = 0.12 + r() * 0.2; if (i % 8 === 0) sparkle(ctx, px, py, s * 4.5); else disc(ctx, px, py, s, '#fff6dc'); }
  }
  const sx = x + w * (0.72 + r() * 0.1), sy = y + h * 0.2, sr = Math.min(w, h) * 0.075;
  ctx.globalAlpha = 0.35; disc(ctx, sx, sy, sr * 1.9, b.sun); ctx.globalAlpha = 1; disc(ctx, sx, sy, sr, b.sun);
  if (!b.stars) {
    const shade = mix('#ffffff', b.sky[1], 0.55);
    for (let i = 0; i < 3; i++) {
      const cx = x + r() * w, cy = y + h * (0.1 + r() * 0.2), cw = w * (0.1 + r() * 0.1);
      for (const [col, dy] of [[shade, cw * 0.09], ['#fffdf6', 0]]) {
        ctx.fillStyle = col; ctx.beginPath();
        for (let k = 0; k < 4; k++) { const px = cx + (k - 1.5) * cw * 0.3, pr = cw * (k === 1 || k === 2 ? 0.26 : 0.18); ctx.moveTo(px + pr, cy + dy - pr * 0.3); ctx.arc(px, cy + dy - pr * 0.3, pr, 0, TAU); }
        ctx.rect(cx - cw * 0.63, cy + dy - cw * 0.06, cw * 1.26, cw * 0.14); ctx.fill();
      }
    }
  }
  b.hills.forEach((col, i) => {
    const base = horizon - h * (0.1 - i * 0.045);
    ctx.beginPath(); ctx.moveTo(x, y + h);
    const ph = r() * 6, amp = h * (0.05 - i * 0.008), freq = 1.4 + r() * 1.2;
    for (let k = 0; k <= 48; k++) { const t = k / 48; ctx.lineTo(x + t * w, base - Math.sin(t * Math.PI * freq + ph) * amp - Math.sin(t * 9 + ph) * amp * 0.18); }
    ctx.lineTo(x + w, y + h); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
    if (i < 2 && !b.stars) {
      for (let t = 0; t < 9; t++) {
        const tx = x + r() * w, ty = base - Math.sin(((tx - x) / w) * Math.PI * freq + ph) * amp + h * 0.006, s = h * (0.012 + r() * 0.012) * (i + 1);
        ctx.fillStyle = mix(col, '#2c3a1c', 0.3); ctx.beginPath(); ctx.ellipse(tx, ty - s, s * 0.8, s, 0, 0, TAU); ctx.fill();
      }
    }
  });
  ctx.fillStyle = b.ground[0];
  ctx.beginPath(); ctx.moveTo(x, horizon + h * 0.02); ctx.quadraticCurveTo(x + w * 0.5, horizon - h * 0.035, x + w, horizon + h * 0.02); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  const near = horizon + (y + h - horizon) * 0.5;
  ctx.fillStyle = b.ground[1];
  ctx.beginPath(); ctx.moveTo(x, near); ctx.quadraticCurveTo(x + w * 0.35, near - h * 0.03, x + w, near + h * 0.01); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  if (b.flowers) for (let i = 0; i < 26; i++) {
    const px = x + r() * w, py = horizon + h * 0.02 + r() * (y + h - horizon), s = 0.3 + (py - horizon) / h * 1.2;
    flower(ctx, px, py, s, ['#fffaf0', '#ffd65a', '#f49ab4', '#b9a4ef'][i % 4], '#e8a020');
  }
  ctx.restore();
}

// Specimen backdrop: a field-guide plate in flat cel colour, with a floor shadow under the subject.
function paintPaper(ctx, x, y, w, h, sub) {
  ctx.fillStyle = '#f7ecd2'; ctx.fillRect(x, y, w, h);
  const fy = sub.y + sub.h * 0.9;
  ctx.fillStyle = '#ecdcb8'; ctx.fillRect(x, fy, w, y + h - fy);
  ctx.beginPath(); ctx.ellipse(sub.x + sub.w / 2, fy, sub.w * 0.34, 1.6, 0, 0, TAU); ctx.fillStyle = '#dcc79c'; ctx.fill();
}

// Shadowbox foreground: grass and flowers in front of the subject, darker, so the window reads as a deep box.
function paintForeground(ctx, x, w, groundY, seed, biome) {
  const r = rng(seed + 11), b = BIOMES[biome] || BIOMES.ranch;
  const base = mix(b.ground[1], '#1c2a10', 0.35);
  ctx.save();
  for (let i = 0; i < 140; i++) {
    const px = x + r() * w, edge = Math.min(px - x, x + w - px) / w; // taller tufts toward the sides
    const l = 1.2 + r() * 2.2 + (0.5 - edge) * 6;
    ctx.strokeStyle = mix(base, '#a8c070', r() * 0.35); ctx.lineWidth = 0.28 + r() * 0.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px, groundY + 1.6); ctx.quadraticCurveTo(px + (r() - 0.5) * 1.2, groundY + 1.6 - l * 0.6, px + (r() - 0.5) * 2, groundY + 1.6 - l); ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const px = x + (r() < 0.5 ? r() * w * 0.25 : w * 0.75 + r() * w * 0.25), py = groundY - 1 - r() * 3, col = ['#f5f0e6', '#f2c14e', '#e88aa0'][i % 3];
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(px + Math.cos(a) * 0.45, py + Math.sin(a) * 0.45, 0.38, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#c98a1c'; ctx.beginPath(); ctx.arc(px, py, 0.28, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Sun tier glory: flat rays and a few sparkles behind the subject.
function sunburst(ctx, cx, cy, R, seed) {
  const r = rng(seed + 9);
  ctx.save(); ctx.fillStyle = 'rgba(255,244,200,.32)';
  ctx.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a, a + TAU / 32); ctx.closePath(); }
  ctx.fill();
  ctx.globalAlpha = 0.3; disc(ctx, cx, cy, R * 0.22, '#fff4c8');
  ctx.globalAlpha = 0.9; ctx.fillStyle = '#fffbe6';
  for (let i = 0; i < 9; i++) { const a = r() * TAU, d = R * (0.12 + r() * 0.3); sparkle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, 0.6 + r() * 0.7); }
  ctx.restore();
}

// Paints backdrop + art in box (x,y,w,h); a model or cut-out stands in `sub`. Returns the subject's box in mm.
// style: specimen (paper backdrop), portal (painted world), shadowbox (world + foreground layer), popout (world + glory).
function paintArt(ctx, art, spec, x, y, w, h, sub, style) {
  let subject = null;
  if (art.mode === 'model' || art.mode === 'cutout') {
    const seed = hashSeed(spec.id);
    if (style === 'specimen') paintPaper(ctx, x, y, w, h, sub);
    else paintBackdrop(ctx, x, y, w, h, spec.biome || 'ranch', seed, Math.min(0.8, (sub.y + sub.h * 0.62 - y) / h));
    if (style === 'popout') sunburst(ctx, sub.x + sub.w / 2, sub.y + sub.h * 0.45, Math.max(w, h), seed);
    let draw;
    if (art.mode === 'model') {
      const rw = art.rendered.w, rh = art.rendered.h, rx = sub.x + (sub.w - rw) / 2, ry = sub.y + sub.h - rh;
      draw = c => c.drawImage(art.canvas, rx, ry, rw, rh);
      const B = art.bounds, k = rw / art.srcW;
      subject = B ? { x: rx + B.x * k, y: ry + B.y * k, w: B.w * k, h: B.h * k, pxPerMm: 1 / k } : { pxPerMm: 1 / k };
    } else {
      const p = cutoutPlacement(art, spec, sub, style), B = art.bounds;
      draw = c => c.drawImage(art.canvas, p.dx, p.dy, art.srcW * p.s, art.srcH * p.s);
      subject = { x: p.dx + B.x * p.s, y: p.dy + B.y * p.s, w: B.w * p.s, h: B.h * p.s, pxPerMm: 1 / p.s };
    }
    draw(ctx); // the art carries its own ink silhouette (prepareArt), so it reads on any backdrop
    subject.draw = draw;
    if (style === 'shadowbox') paintForeground(ctx, x, w, sub.y + sub.h, seed, spec.biome);
  } else {
    const f = spec.art?.focus || [0.5, 0.5], zoom = spec.art?.zoom || 1;
    const s = Math.max(w / art.srcW, h / art.srcH) * zoom, dw = art.srcW * s, dh = art.srcH * s;
    const dx = x + (w - dw) * f[0], dy = y + (h - dh) * f[1];
    ctx.drawImage(art.canvas, Math.min(x, Math.max(dx, x + w - dw)), Math.min(y, Math.max(dy, y + h - dh)), dw, dh);
    subject = { pxPerMm: 1 / s };
  }
  return subject;
}

// ---------------------------------------------------------------- frame pieces

// Art window outline by card type (the type is readable from the silhouette alone).
function windowPath(ctx, type, x, y, w, h) {
  const shape = (TYPES[type] || TYPES.animal).shape, br = 1.6;
  ctx.beginPath();
  if (shape === 'arch') {
    const ah = 11;
    ctx.moveTo(x, y + ah);
    ctx.ellipse(x + w / 2, y + ah, w / 2, ah, 0, Math.PI, 0);
    ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + br, y + h); ctx.arcTo(x, y + h, x, y + h - br, br);
  } else if (shape === 'gable') {
    const eave = 9;
    ctx.moveTo(x, y + eave); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + eave);
    ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + br, y + h); ctx.arcTo(x, y + h, x, y + h - br, br);
  } else if (shape === 'scallop') {
    const n = 5, sr = w / n / 2, base = y + sr;
    ctx.moveTo(x, base);
    for (let i = 0; i < n; i++) ctx.arc(x + sr + i * sr * 2, base, sr, Math.PI, 0);
    ctx.lineTo(x + w, y + h - br); ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
    ctx.lineTo(x + br, y + h); ctx.arcTo(x, y + h, x, y + h - br, br);
  } else if (shape === 'circle') {
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    const c = 6;
    ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
    ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c);
  }
  ctx.closePath();
}

function paintFrameBody(ctx, tier, x, y, w, h, seed, pattern) {
  const f = FRAME[tier];
  ctx.fillStyle = f.body; ctx.fillRect(x, y, w, h);
  paintPattern(ctx, pattern, x, y, w, h, mix(f.body, f.trim, 0.26), f.body, seed);
}

// Name ribbon: a banner with folded tails, hung across the top of the art.
function ribbonPath(ctx, R) {
  const notch = 2.2;
  ctx.beginPath();
  ctx.moveTo(R.x, R.y + 0.6); ctx.quadraticCurveTo(R.x + R.w / 2, R.y - 0.9, R.x + R.w, R.y + 0.6);
  ctx.lineTo(R.x + R.w - notch * 0.4, R.y + R.h / 2 + 0.3); ctx.lineTo(R.x + R.w, R.y + R.h + 0.6);
  ctx.quadraticCurveTo(R.x + R.w / 2, R.y + R.h - 0.9, R.x, R.y + R.h + 0.6);
  ctx.lineTo(R.x + notch * 0.4, R.y + R.h / 2 + 0.3);
  ctx.closePath();
}

// Rarity gem: growth-stage shape (seed, sprout, flower, wheat sheaf, sunburst) in its rubric colour, flat with ink.
function rarityGem(ctx, tier, cx, cy, r) {
  const col = oklchToHex(RARITIES[tier].oklch), dark = mix(col, '#000000', 0.45);
  disc(ctx, cx, cy, r, INK);
  disc(ctx, cx, cy, r * 0.88, PAPER);
  disc(ctx, cx, cy, r * 0.74, '#2b2118');
  ctx.save();
  ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = r * 0.06;
  const s = r * 0.66;
  ctx.translate(cx, cy);
  ctx.beginPath();
  if (tier === 'seed') { ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.9, -s * 0.4, s * 0.75, s * 0.9, 0, s); ctx.bezierCurveTo(-s * 0.75, s * 0.9, -s * 0.9, -s * 0.4, 0, -s); }
  else if (tier === 'sprout') {
    ctx.moveTo(-s * 0.1, s); ctx.lineTo(s * 0.1, s); ctx.lineTo(s * 0.1, -s * 0.05); ctx.lineTo(-s * 0.1, -s * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-s * 0.48, -s * 0.38, s * 0.52, s * 0.28, -0.6, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * 0.48, -s * 0.38, s * 0.52, s * 0.28, 0.6, 0, TAU);
  } else if (tier === 'bloom') {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; ctx.moveTo(Math.cos(a) * s * 0.55 + s * 0.4, Math.sin(a) * s * 0.55); ctx.ellipse(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.4, s * 0.4, 0, 0, TAU); }
    ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, TAU); ctx.fillStyle = '#ffe08a';
  } else if (tier === 'harvest') {
    for (const a of [-0.45, 0, 0.45]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -s * 0.38, s * 0.24, s * 0.62, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.rect(-s * 0.42, s * 0.18, s * 0.84, s * 0.22); ctx.fillStyle = '#e8c25a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.25, s * 0.4); ctx.lineTo(-s * 0.4, s); ctx.lineTo(s * 0.4, s); ctx.lineTo(s * 0.25, s * 0.4); ctx.fillStyle = col;
  } else {
    for (let i = 0; i < 24; i++) { const a = -Math.PI / 2 + i * Math.PI / 12, rr = i % 2 ? s * 0.62 : s * 1.06; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fillStyle = '#fff3c4';
  }
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

// Round token for cost and stats: ink ring, flat rim, flat disc, big outlined numeral (contrast over 3:1 by construction).
function token(ctx, value, cx, cy, r, col, rim) {
  disc(ctx, cx, cy, r, INK);
  disc(ctx, cx, cy, r * 0.9, rim);
  celDisc(ctx, cx, cy, r * 0.78, col);
  numeral(ctx, String(value), cx, cy, NUMERAL_MM);
}

// "PRELIMINARY · idea only": a taped label across the art for anything below the ship bar (Evan, 2026-10-23).
function preliminaryStamp(ctx, A) {
  const w = Math.min(52, A.w - 2), h = 11;
  ctx.save(); ctx.translate(A.x + A.w / 2, A.y + A.h * 0.6); ctx.rotate(-0.12);
  rrect(ctx, -w / 2, -h / 2, w, h, 1.4); ctx.fillStyle = '#fff1c4'; ctx.fill();
  ctx.lineWidth = 0.55; ctx.strokeStyle = INK; ctx.stroke();
  ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 1.4); ctx.clip(); ctx.fillStyle = '#c8402a';
  for (let k = -w / 2 - 4; k < w / 2; k += 3.2) { ctx.beginPath(); ctx.moveTo(k, -h / 2); ctx.lineTo(k + 1.4, -h / 2); ctx.lineTo(k + 1.4 - 1.4, -h / 2 + 1.4); ctx.lineTo(k - 1.4, -h / 2 + 1.4); ctx.fill(); ctx.beginPath(); ctx.moveTo(k, h / 2 - 1.4); ctx.lineTo(k + 1.4, h / 2 - 1.4); ctx.lineTo(k, h / 2); ctx.lineTo(k - 1.4, h / 2); ctx.fill(); }
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = nameFont(4.6); ctx.fillStyle = '#b3301c'; ctx.letterSpacing = '0.04em'; ctx.fillText('PRELIMINARY', 0, -1); ctx.letterSpacing = '0px';
  ctx.font = typeFont(2.6); ctx.fillStyle = INK; ctx.fillText('idea only', 0, 2.9);
  ctx.restore();
}

// Finish preview over the face (the print file carries the finish as a mask layer instead).
function finishPreview(ctx, finish, pathFn, x, y, w, h, seed) {
  if (!finish || finish === 'standard') return;
  ctx.save(); pathFn(); ctx.clip();
  if (finish === 'shimmer') {
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    ['#ff6b8b', '#ffd36b', '#7bf0a8', '#6bc8ff', '#b88bff', '#ff6b8b'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.globalAlpha = 0.3; ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  } else if (finish === 'golden_hour') {
    ctx.globalCompositeOperation = 'overlay';
    const g = ctx.createRadialGradient(x + w * 0.75, y + h * 0.15, 0, x + w * 0.75, y + h * 0.15, Math.max(w, h));
    g.addColorStop(0, 'rgba(255,200,90,.55)'); g.addColorStop(1, 'rgba(255,160,40,.12)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  } else if (finish === 'frost') {
    const r = rng(seed + 3);
    ctx.globalCompositeOperation = 'screen'; ctx.strokeStyle = 'rgba(220,240,255,.35)'; ctx.lineWidth = 0.12;
    for (let i = 0; i < 60; i++) { const fx = x + r() * w, fy = y + r() * h; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(a) * 1.2, fy + Math.sin(a) * 1.2); ctx.stroke(); } }
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(210,235,255,.28)'); g.addColorStop(0.5, 'rgba(210,235,255,0)'); g.addColorStop(1, 'rgba(210,235,255,.22)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the card

export function cardPixels({ dpi = 600, bleed = false } = {}) {
  const b = bleed ? CARD.bleed : 0;
  return { w: Math.round((CARD.w + b * 2) / 25.4 * dpi), h: Math.round((CARD.h + b * 2) / 25.4 * dpi), bleedMm: b };
}

/**
 * Paint one card.
 * opts: {dpi (default 600), bleed (print master: 3 mm bleed, square), lod: 'inspect'|'hand'|'board',
 *        finish: overrides the tier's finish, guides: trim and safe lines,
 *        plate: false drops the hand LOD's rules/ability plate and gives its room to the art,
 *        preview: true paints a still preview of the print finish on the face,
 *        allowPreliminary: false throws instead of stamping a card that is below the ship bar}
 * Returns {canvas, qc, manifest, masks}: qc is the quality report for this exact output, manifest is the rubric
 * checker's card.json (boxes in canvas px), masks are the finish layers to draw with renderMask().
 * The ship bar: no failed check, art sharp enough for this output, and art that is ours to ship (a game model
 * rendered here, or an image whose spec says art.status "final"). Below it, qc.ship is false, qc.preliminary says
 * why, and the face carries a "PRELIMINARY · idea only" stamp across the art. Nothing below the bar looks finished.
 */
export async function renderCard(spec, opts = {}) {
  await loadFonts();
  const dpi = opts.dpi || 600, bleed = !!opts.bleed, lod = opts.lod || 'inspect';
  const { w, h, bleedMm: b } = cardPixels({ dpi, bleed });
  const canvas = opts.canvas || mkCanvas(w, h);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const pxmm = dpi / 25.4;
  const tier = rarityOf(spec.rarity), R = RARITIES[tier], type = TYPES[spec.type] ? spec.type : 'animal';
  const F = FRAME[tier], sun = tier === 'sun', pattern = patternOf(spec);
  const finish = opts.finish || spec.finish || R.finish;
  const seed = hashSeed(spec.id || spec.name);
  const qc = newQC(spec), boxes = [], toPx = (x, y, bw, bh) => [x, y, bw, bh].map((v, i) => Math.round((i < 2 ? v + b : v) * pxmm));
  const style = lod === 'board' && sun ? 'portal' : spec.artStyle || ART_STYLES[tier];
  // A hand card with plate:false keeps its name but gives the plate's room to the art (a tile card's art is the point).
  const tall = lod === 'board' || (lod === 'hand' && opts.plate === false && !sun);
  const A = tall ? { x: 4, y: 4, w: 55, h: 72 } : sun ? L.sunArt : L.art;
  const sub = lod === 'board' ? { x: 4, y: 12, w: 55, h: 60 } : tall ? { x: 4, y: 20, w: 55, h: 54 } : sun ? L.sunSubject : L.subject;

  let art = null;
  try { art = await prepareArt(spec, { artDpi: Math.max(600, dpi), box: sub, view: style === 'specimen' ? { fill: 0.92 } : {} }); }
  catch (e) { qc.add('art', 'fail', 'Art did not load: ' + e.message); }

  ctx.save();
  ctx.scale(pxmm, pxmm); ctx.translate(b, b);
  ctx.clearRect(-b, -b, CARD.w + b * 2, CARD.h + b * 2);
  ctx.save();
  if (!bleed) { rrect(ctx, 0, 0, CARD.w, CARD.h, CARD.radius); ctx.clip(); }

  paintFrameBody(ctx, tier, -b, -b, CARD.w + b * 2, CARD.h + b * 2, seed, pattern);
  const winPath = () => windowPath(ctx, type, A.x, A.y, A.w, A.h);
  let subject = null;
  if (style === 'popout' && lod !== 'board') {
    // Sun tier: the world runs to the edge of the card (overlay), a gold window floats in it, and the subject's
    // head steps out over the window's top edge (pop-out), with a small cast shadow on the frame.
    if (art) subject = paintArt(ctx, art, spec, -b, -b, CARD.w + 2 * b, CARD.h + 2 * b, sub, style);
    ctx.save(); ctx.beginPath(); ctx.rect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b); windowPath(ctx, type, A.x, A.y, A.w, A.h);
    ctx.fillStyle = 'rgba(42,28,18,.24)'; ctx.fill('evenodd'); ctx.restore(); // the world outside the window sits back
    inkLine(ctx, () => rrect(ctx, 1.1, 1.1, CARD.w - 2.2, CARD.h - 2.2, CARD.radius - 0.9), 0.7, F.trim);
    celRim(ctx, winPath, F.edge, 0.8);
    if (subject?.draw) {
      ctx.save();
      ctx.beginPath(); ctx.rect(-b, -b, CARD.w + 2 * b, A.y + 12 + b); ctx.clip();
      ctx.save(); ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.25; ctx.translate(0.6, 0.8); subject.draw(ctx); ctx.restore(); // flat cast shadow
      subject.draw(ctx);
      ctx.restore();
    }
  } else {
    // one flat line in the tier's colour inside the cut, then the window: art first, a cel rim over its edge
    inkLine(ctx, () => rrect(ctx, 1.1, 1.1, CARD.w - 2.2, CARD.h - 2.2, CARD.radius - 0.9), 0.7, F.trim);
    ctx.save(); winPath(); ctx.fillStyle = '#222'; ctx.fill(); ctx.clip();
    if (art) subject = paintArt(ctx, art, spec, A.x, A.y, A.w, A.h, sub, style);
    ctx.restore();
    celRim(ctx, winPath, F.edge, 0.9);
  }
  if (art) checkArt(qc, art, subject, A, sub, style, dpi);

  // Cost: top-left token
  const hasCost = Number.isFinite(spec.cost);
  if (hasCost) {
    const C = L.cost;
    token(ctx, spec.cost, C.cx, C.cy, C.r, '#24384a', F.edge);
    boxes.push({ role: 'numeral', what: 'cost', bbox: toPx(C.cx - C.r, C.cy - C.r, C.r * 2, C.r * 2), font_pt: +(NUMERAL_MM / MM_PER_PT).toFixed(1), family: 'Fredoka', text_colour: '#fff8e8' });
  }

  // Name ribbon (board cards carry no words)
  if (lod !== 'board') {
    const Rb = sun ? L.sunRibbon : L.ribbon, rp = () => ribbonPath(ctx, Rb);
    ctx.save(); rp(); ctx.fillStyle = PAPER; ctx.fill(); ctx.clip(); // flat paper, accent stripes in the type colour
    ctx.fillStyle = TYPES[type].accent;
    ctx.fillRect(Rb.x, Rb.y - 1, Rb.w, 1.25); ctx.fillRect(Rb.x, Rb.y + Rb.h - 0.4, Rb.w, 1.3);
    ctx.restore();
    inkLine(ctx, rp, 0.5);
    const left = Rb.x + (hasCost && !sun ? 7.4 : 3), right = Rb.x + Rb.w - 3, nw = right - left;
    let ns = 4.8; ctx.font = nameFont(ns);
    while (ctx.measureText(spec.name || '').width > nw && ns > 3.6) { ns -= 0.1; ctx.font = nameFont(ns); }
    const fits = ctx.measureText(spec.name || '').width <= nw;
    qc.add('name', fits ? 'pass' : 'fail', fits ? `Name set at ${(ns / MM_PER_PT).toFixed(1)} pt` : 'Name is too long for the ribbon');
    ctx.save(); ctx.fillStyle = '#2b1a0e'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(spec.name || '', left + nw / 2, Rb.y + Rb.h / 2 + 0.25); ctx.restore();
    boxes.push({ role: 'name', bbox: toPx(left, Rb.y + 0.6, nw, Rb.h - 1.2), font_pt: +(ns / MM_PER_PT).toFixed(1), family: 'Fredoka', text_colour: '#2b1a0e', plate: 'opaque' });
  }

  // Gem where art meets the plate; type line under it
  const G = tall ? { cx: 31.5, cy: 79.8, r: 3.4 } : L.gem;
  if (lod === 'inspect') {
    const T = L.type, tp = () => rrect(ctx, T.x, T.y, T.w, T.h, 1.2);
    ctx.save(); tp(); ctx.fillStyle = mix(TYPES[type].accent, '#000000', 0.35); ctx.fill(); ctx.restore();
    inkLine(ctx, tp, 0.4);
    const typeText = [TYPES[type].label, spec.subtype].filter(Boolean).join(' · ').toUpperCase();
    let ts = 2.3; ctx.font = typeFont(ts); ctx.letterSpacing = '0.06em';
    while (ctx.measureText(typeText).width > T.w - 3 && ts > 1.8) { ts -= 0.05; ctx.font = typeFont(ts); }
    ctx.save(); ctx.fillStyle = '#fbf0d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(typeText, T.x + T.w / 2, T.y + T.h / 2 + 0.15); ctx.restore();
    ctx.letterSpacing = '0px';
    boxes.push({ role: 'type', bbox: toPx(T.x, T.y, T.w, T.h), font_pt: +(ts / MM_PER_PT).toFixed(1), family: 'Nunito', text_colour: '#fbf0d6', plate: 'opaque' });
  }
  rarityGem(ctx, tier, G.cx, G.cy, G.r);
  boxes.push({ role: 'gem', bbox: toPx(G.cx - G.r, G.cy - G.r, G.r * 2, G.r * 2) });

  // Rules plate (inspect) or ability icons (hand)
  if (!tall) {
    const X = L.text, xp = () => rrect(ctx, X.x, X.y, X.w, X.h, 1.4);
    ctx.save(); xp(); ctx.fillStyle = PAPER; ctx.fill(); ctx.restore();
    inkLine(ctx, xp, 0.5);
    if (lod === 'inspect') fitRules(ctx, qc, spec, X, boxes, toPx, false);
    else {
      const icons = abilityIcons(spec), n = icons.length;
      icons.forEach((ic, i) => drawIconDisc(ctx, ic, X.x + X.w / 2 + (i - (n - 1) / 2) * 11, X.y + X.h / 2, 4.2));
    }
  }

  // Stats: bottom corners (board keeps one)
  const stats = (spec.stats || []).slice(0, lod === 'board' ? 1 : 2);
  stats.forEach((st, i) => {
    const pos = lod === 'board' ? L.stats[1] : L.stats[i], r = L.statR;
    token(ctx, st.value, pos.cx, pos.cy, r, ICON_DISC[st.icon] || '#444', F.edge);
    const ix = pos.cx + (pos.cx < CARD.w / 2 ? 4.3 : -4.3), iy = pos.cy - 3.7;
    drawIconDisc(ctx, st.icon, ix, iy, 2.3);
    boxes.push({ role: 'numeral', what: st.icon, bbox: toPx(pos.cx - r, pos.cy - r, r * 2, r * 2), font_pt: +(NUMERAL_MM / MM_PER_PT).toFixed(1), family: 'Fredoka', text_colour: '#fff8e8' });
  });

  // Collector line (inspect only): set, number/total, maker, variant
  const variant = FINISHES[finish] || 'STD';
  const maker = spec.maker || makerLine(spec, art);
  if (lod === 'inspect') {
    const K = L.collector, kp = () => rrect(ctx, K.x, K.y, K.w, K.h, 1.2);
    ctx.save(); kp(); ctx.fillStyle = 'rgba(28,18,10,.82)'; ctx.fill(); ctx.restore();
    const line1 = [String(spec.set || 'ranch').toUpperCase(), `${String(spec.number || 0).padStart(3, '0')}/${String(spec.setSize || 0).padStart(3, '0')}`, variant].join('  ·  ');
    let fs = 1.9; ctx.font = footFont(fs);
    const widest = () => Math.max(ctx.measureText(line1).width, ctx.measureText(maker).width);
    while (widest() > K.w - 1.6 && fs > 1.77) { fs -= 0.02; ctx.font = footFont(fs); }
    if (widest() > K.w - 1.6) qc.add('collector', 'fail', 'Collector line is too long');
    ctx.save(); ctx.fillStyle = '#fbf0d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(line1, K.x + K.w / 2, K.y + K.h * 0.31); ctx.globalAlpha = 0.85; ctx.fillText(maker, K.x + K.w / 2, K.y + K.h * 0.72); ctx.restore();
    boxes.push({ role: 'collector', bbox: toPx(K.x, K.y, K.w, K.h), font_pt: +(fs / MM_PER_PT).toFixed(1), family: 'Nunito', text_colour: '#fbf0d6' });
  }

  ctx.restore(); // silhouette clip

  // Finish preview and gloss
  ctx.save();
  const facePath = () => { if (bleed) { ctx.beginPath(); ctx.rect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b); } else rrect(ctx, 0, 0, CARD.w, CARD.h, CARD.radius); };
  if (opts.preview === true) { // the inspect view shows finishes live from the masks; the face stays flat
    if (finish === 'shimmer' && !sun) finishPreview(ctx, finish, winPath, A.x, A.y, A.w, A.h, seed);
    else finishPreview(ctx, finish, facePath, -b, -b, CARD.w + 2 * b, CARD.h + 2 * b, seed);
  }
  ctx.restore();

  if (opts.guides && bleed) {
    ctx.save(); ctx.lineWidth = 0.15; ctx.setLineDash([0.8, 0.6]);
    ctx.strokeStyle = '#ff2d55'; ctx.strokeRect(0, 0, CARD.w, CARD.h);
    ctx.strokeStyle = '#00b3ff'; ctx.strokeRect(CARD.safe, CARD.safe, CARD.w - 2 * CARD.safe, CARD.h - 2 * CARD.safe);
    ctx.restore();
  }
  ctx.restore();

  checkSpec(spec).forEach(([id, level, msg]) => qc.add(id, level, msg));
  checkStats(qc, spec);
  checkSafe(qc, boxes, b, pxmm);
  qc.add('output', 'pass', `${w}×${h} px at ${dpi} ppi${bleed ? ', 63×88 mm + 3 mm bleed' : ''} · ${lod}`);
  const why = shipBlockers(qc.items, spec, art);
  qc.add('ship', why.length ? 'warn' : 'pass', why.length ? 'Preliminary, idea only: ' + why.join('; ') : 'Ready to ship');
  const report = qc.done();
  report.ship = !why.length; report.preliminary = why;
  if (!report.ship) {
    if (opts.allowPreliminary === false) throw Object.assign(new Error(`${spec.id} is below the ship bar: ${why.join('; ')}`), { qc: report });
    ctx.save(); ctx.scale(pxmm, pxmm); ctx.translate(b, b); preliminaryStamp(ctx, A); ctx.restore();
  }

  const artBox = style === 'popout' ? { x: 0, y: 0, w: CARD.w, h: CARD.h } : A;
  const srcPerMm = subject?.pxPerMm || 0;
  const masks = maskRegions(tier, finish);
  const manifest = {
    id: spec.id, ppi: dpi, bleed, rarity: tier, type, lod, finish, full_art: sun, ship: report.ship, pattern,
    art: {
      bbox: toPx(artBox.x, artBox.y, artBox.w, artBox.h), source_px: [Math.round(artBox.w * srcPerMm), Math.round(artBox.h * srcPerMm)],
      mode: STYLE_MODES[style] || [style], source: art?.mode,
      ...(style === 'popout' ? { window_bbox: toPx(A.x, A.y, A.w, A.h) } : {}), // full-bleed art; the pop-out is measured from this window
      layers: style === 'specimen' ? ['paper', 'subject', 'shadow'] : style === 'shadowbox' ? ['bg', 'mid', 'subject', 'fg', 'shadow'] : ['bg', 'mid', 'subject', 'shadow'],
      ...(subject?.w ? { subject_bbox: toPx(subject.x, subject.y, subject.w, subject.h), focal_point: toPx(subject.x + subject.w / 2, subject.y + subject.h * 0.25, 0, 0).slice(0, 2) } : {}),
    },
    boxes: boxes.map(({ what, ...x }) => x),
    collector: { set: String(spec.set || 'ranch').toUpperCase(), number: spec.number, total: spec.setSize, maker, variant },
    finish_masks: masks.map(m => `${spec.id}.${m.layer}.png`),
  };
  return { canvas, qc: report, manifest, masks };
}

function abilityIcons(spec) {
  if (spec.abilities?.length) return spec.abilities.slice(0, 3);
  return [...new Set([...String(spec.rules || '').matchAll(/\{([a-z]+)\}/g)].map(m => m[1]))].slice(0, 3);
}
function makerLine(spec, art) {
  if (art?.mode === 'model') return spec.art?.modelMaker || '3D model · Atelier';
  return spec.art?.maker || 'Concept art · Atelier';
}

function fitRules(ctx, qc, spec, X, boxes, toPx, translucent) {
  const padX = 2.4, padY = 0.9, innerW = X.w - padX * 2, innerH = X.h - padY * 2;
  const paras = tokenize(spec.rules), min = 8 * MM_PER_PT; // 8 pt floor for body text
  let s = 3.4, lay;
  for (; s > min; s -= 0.04) { lay = layoutParagraphs(ctx, paras, rulesFont, s, innerW, 1.16); if (lay.height <= innerH && !lay.tooWide) break; }
  s = Math.max(s, min);
  lay = layoutParagraphs(ctx, paras, rulesFont, s, innerW, 1.16);
  const fits = lay.height <= innerH + 0.01 && !lay.tooWide;
  qc.add('text', fits ? 'pass' : 'fail', fits ? `Rules fit at ${(s / MM_PER_PT).toFixed(1)} pt` : 'Rules overflow the plate at 8 pt; shorten them');
  const y0 = X.y + padY + Math.max(0, (innerH - lay.height) / 2);
  ctx.save(); rrect(ctx, X.x, X.y, X.w, X.h, 1.4); ctx.clip();
  drawLines(ctx, lay, rulesFont, s, X.x + padX, y0, innerW, 1.16, '#2b1d10');
  ctx.restore();
  boxes.push({ role: 'text', bbox: toPx(X.x + 0.6, X.y + 0.4, X.w - 1.2, X.h - 0.8), font_pt: +(s / MM_PER_PT).toFixed(1), family: 'Nunito', text_colour: '#2b1d10', plate: translucent ? 'translucent' : 'opaque' });
}

// Finish masks per tier and finish (rubric D9 finish_masks: the printer needs one layer per finish).
export function maskRegions(tier, finish) {
  const out = [];
  if (tier === 'bloom') out.push({ layer: 'spot_uv', regions: ['name', 'gem'] });
  if (tier === 'harvest') out.push({ layer: 'cold_foil', regions: ['frame', 'gem'] });
  if (tier === 'sun') out.push({ layer: 'holofoil', regions: ['frame'] }, { layer: 'spot_uv', regions: ['name', 'gem'] }); // the world shimmers, the hero stays clean
  if (finish === 'shimmer' && tier !== 'sun') out.push({ layer: 'holofoil', regions: ['art'] });
  if (finish === 'golden_hour' && tier !== 'harvest') out.push({ layer: 'cold_foil', regions: ['art'] });
  if (finish === 'frost') out.push({ layer: 'spot_uv', regions: ['frame'] }, { layer: 'etched_foil', regions: ['frame'] });
  const merged = new Map();
  for (const m of out) merged.set(m.layer, [...new Set([...(merged.get(m.layer) || []), ...m.regions])]);
  return [...merged].map(([layer, regions]) => ({ layer, regions }));
}
// White = finish applied. Same canvas size as the card.
export function renderMask(spec, mask, opts = {}) {
  const dpi = opts.dpi || 600, bleed = !!opts.bleed;
  const { w, h, bleedMm: b } = cardPixels({ dpi, bleed });
  const c = mkCanvas(w, h), ctx = c.getContext('2d'), type = TYPES[spec.type] ? spec.type : 'animal';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.scale(dpi / 25.4, dpi / 25.4); ctx.translate(b, b); ctx.fillStyle = '#fff';
  const sun = rarityOf(spec.rarity) === 'sun', A = sun ? L.sunArt : L.art;
  for (const r of mask.regions) {
    if (r === 'face') ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
    if (r === 'art') { windowPath(ctx, type, A.x, A.y, A.w, A.h); ctx.fill(); }
    if (r === 'name') { ribbonPath(ctx, sun ? L.sunRibbon : L.ribbon); ctx.fill(); }
    if (r === 'gem') { ctx.beginPath(); ctx.arc(L.gem.cx, L.gem.cy, L.gem.r, 0, Math.PI * 2); ctx.fill(); }
    if (r === 'frame') {
      // everything but the art window and the rules plate
      ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
      ctx.fillStyle = '#000';
      windowPath(ctx, type, A.x, A.y, A.w, A.h); ctx.fill();
      rrect(ctx, L.text.x, L.text.y, L.text.w, L.text.h, 1.4); ctx.fill();
      ctx.fillStyle = '#fff';
    }
  }
  return c;
}

// ---------------------------------------------------------------- card back

export async function renderBack(opts = {}) {
  await loadFonts();
  const dpi = opts.dpi || 600, bleed = !!opts.bleed;
  const { w, h, bleedMm: b } = cardPixels({ dpi, bleed });
  const c = mkCanvas(w, h), ctx = c.getContext('2d');
  ctx.scale(dpi / 25.4, dpi / 25.4); ctx.translate(b, b);
  if (!bleed) { rrect(ctx, 0, 0, CARD.w, CARD.h, CARD.radius); ctx.clip(); }
  ctx.fillStyle = '#21504f'; ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
  // quilted diamond stitching, like a saddle blanket
  ctx.save(); ctx.strokeStyle = 'rgba(255,230,170,.16)'; ctx.lineWidth = 0.25; ctx.setLineDash([0.7, 0.5]);
  for (let k = -CARD.h; k < CARD.w + CARD.h; k += 5) { ctx.beginPath(); ctx.moveTo(k, -b); ctx.lineTo(k - CARD.h - 2 * b, CARD.h + b); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k, -b); ctx.lineTo(k + CARD.h + 2 * b, CARD.h + b); ctx.stroke(); }
  ctx.restore();
  ctx.save(); rrect(ctx, 3.2, 3.2, CARD.w - 6.4, CARD.h - 6.4, 2.4); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
  ctx.lineWidth = 0.7; ctx.strokeStyle = '#f0c75a'; ctx.stroke();
  rrect(ctx, 4.8, 4.8, CARD.w - 9.6, CARD.h - 9.6, 1.8); ctx.lineWidth = 0.3; ctx.stroke(); ctx.restore();
  ctx.globalAlpha = 0.18; disc(ctx, CARD.w / 2, CARD.h * 0.46, 22, '#fff0c0'); ctx.globalAlpha = 1;
  try {
    const logo = await loadImage(new URL('./art/back-logo.png', import.meta.url).href);
    const lw = 50, lh = lw * logo.naturalHeight / logo.naturalWidth;
    ctx.drawImage(logo, (CARD.w - lw) / 2, CARD.h * 0.46 - lh / 2, lw, lh);
  } catch { /* the back still reads without the logo */ }
  ctx.save(); ctx.font = `600 3.2px ${FONT.display}`; ctx.fillStyle = '#f6dc8a'; ctx.textAlign = 'center'; ctx.letterSpacing = '0.3em';
  ctx.fillText('ABBIE’S WORLD', CARD.w / 2, CARD.h - 9.5); ctx.restore();
  return c;
}

// ---------------------------------------------------------------- quality check

const PG_WORDS = /\b(kill|killed|dead|death|blood|gun|stupid|hate|shut up|damn|hell|weapon)\b/i;
function newQC(spec) {
  const items = [];
  return {
    items,
    add(id, level, msg) { const i = items.findIndex(x => x.id === id); const it = { id, level, msg }; if (i >= 0) items[i] = it; else items.push(it); },
    done() {
      const fails = items.filter(i => i.level === 'fail').length, warns = items.filter(i => i.level === 'warn').length;
      const grade = fails ? 'blocked' : warns ? 'playable' : 'collection';
      return { id: spec.id, grade, label: { collection: 'Collection grade', playable: 'Playable', blocked: 'Blocked' }[grade], fails, warns, items };
    },
  };
}
function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const m = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
export function readingGrade(text) {
  const plain = String(text || '').replace(/\{[a-z]+\}/g, ' ');
  const words = plain.split(/\s+/).filter(w => /[a-z]/i.test(w));
  if (!words.length) return 0;
  const sentences = Math.max(1, plain.split(/[.!?:\n]+/).filter(s => /[a-z]/i.test(s)).length);
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}
export function checkSpec(spec) {
  const out = [];
  if (!spec.id || !/^[a-z0-9-]+$/.test(spec.id)) out.push(['spec', 'fail', 'Card needs an id (lowercase, dashes)']);
  if (!TYPES[spec.type]) out.push(['spec', 'fail', `Unknown type "${spec.type}" (animal, building, crop, weather, helper)`]);
  if (!spec.rarity || !(spec.rarity in RARITIES || spec.rarity in RARITY_ALIAS)) out.push(['spec', 'fail', `Unknown rarity "${spec.rarity}"`]);
  if ((spec.name || '').length > 18) out.push(['name-length', 'fail', `Name is ${spec.name.length} characters; 18 is the most for kids`]);
  const words = `${spec.name} ${spec.subtype || ''} ${spec.rules}`;
  if (PG_WORDS.test(words)) out.push(['pg', 'fail', 'Wording is not PG: ' + words.match(PG_WORDS)[0]]);
  const n = faceWords(spec.rules);
  out.push(['words', n <= 15 ? 'pass' : 'fail', n <= 15 ? `${n} words on the face` : `${n} words on the face; 15 is the most`]);
  const g = readingGrade(spec.rules);
  // Flesch-Kincaid swings wildly on 10-word texts, so it only warns; the rubric confirms reading level with a judge.
  out.push(['reading', g < 3.5 ? 'pass' : 'warn', `Reading level about grade ${Math.max(0, g).toFixed(1)}${g >= 3.5 ? ' by formula (aim for 3)' : ''}`]);
  const unknown = [...String(spec.rules || '').matchAll(/\{([a-z]+)\}/g)].map(m => m[1]).filter(i => !ICON_DISC[i]);
  if (unknown.length) out.push(['icons', 'fail', 'Unknown rules icons: ' + unknown.join(', ')]);
  return out;
}
function checkStats(qc, spec) {
  const stats = spec.stats || [];
  const bad = stats.filter(s => !ICON_DISC[s.icon] || !Number.isInteger(s.value) || s.value < 0 || s.value > 99);
  if (stats.length > 2) qc.add('stats', 'fail', 'At most two stats on the face');
  else if (bad.length) qc.add('stats', 'fail', 'Stats need a known icon and a whole number 0 to 99');
  else qc.add('stats', 'pass', stats.length ? `${stats.length} stat${stats.length > 1 ? 's' : ''} in the bottom corners` : 'No stats');
  if (!Number.isFinite(spec.cost)) qc.add('cost', 'warn', 'No cost on this card');
}
function checkSafe(qc, boxes, b, pxmm) {
  const s = Math.round((b + CARD.safe) * pxmm), W = Math.round((CARD.w - CARD.safe + b) * pxmm), H = Math.round((CARD.h - CARD.safe + b) * pxmm);
  const out = boxes.filter(x => x.bbox[0] < s || x.bbox[1] < s || x.bbox[0] + x.bbox[2] > W || x.bbox[1] + x.bbox[3] > H);
  qc.add('safe', out.length ? 'fail' : 'pass', out.length ? 'Outside the 3 mm safe zone: ' + out.map(x => x.role).join(', ') : 'Every word, number and gem is 3 mm inside the cut');
}
// What keeps a card below the ship bar (see renderCard).
function shipBlockers(items, spec, art) {
  const why = items.filter(i => i.level === 'fail').map(i => i.msg);
  const a = items.find(i => i.id === 'art');
  if (a && a.level === 'warn') why.push(a.msg);
  if (art && art.mode !== 'model' && spec.art?.status !== 'final') why.push('the art is not approved yet (art.status is not "final")');
  return why;
}
function checkArt(qc, art, subject, A, sub, style, dpi = 600) {
  if (!subject) { qc.add('art', 'fail', 'Art did not paint'); return; }
  const ppi = subject.pxPerMm * 25.4, need = Math.min(300, dpi); // sharp at this output: print needs 300, a hand card less
  if (art.mode === 'model') qc.add('art', 'pass', `Rendered from the game model at ${Math.round(ppi)} ppi`);
  else qc.add('art', ppi >= need ? 'pass' : ppi >= need * 2 / 3 ? 'warn' : 'fail', ppi >= need ? `Art is ${Math.round(ppi)} ppi (${need} needed here)` : `Art is ${Math.round(ppi)} ppi; ${need} needed${ppi >= need * 2 / 3 ? '' : ', needs a bigger image'}`);
  if (subject.w) {
    const off = Math.abs(subject.x + subject.w / 2 - (A.x + A.w / 2)) / A.w, hh = subject.h / A.h;
    qc.add('subject_centre', off <= 0.1 ? 'pass' : 'warn', off <= 0.1 ? 'Subject centred in the window' : `Subject is ${(off * 100).toFixed(0)}% off centre`);
    if (style === 'popout') {
      const out = (A.y - subject.y) / CARD.h;
      qc.add('popout', out >= 0.05 && out <= 0.15 ? 'pass' : 'warn', `Subject steps ${(out * 100).toFixed(0)}% of card height out of the window${out < 0.05 || out > 0.15 ? ' (5 to 15% reads best)' : ''}`);
    }
    const [lo, hi] = style === 'specimen' ? [0.6, 0.75] : style === 'popout' ? [0.6, 1.2] : [0.35, 0.65];
    qc.add('subject_height', hh >= lo - 0.005 && hh <= hi + 0.005 ? 'pass' : 'warn', `Subject is ${(hh * 100).toFixed(0)}% of the window height${hh < lo || hh > hi ? ` (${lo * 100} to ${hi * 100}% for ${style})` : ''}`);
    const clipped = subject.x < sub.x - 0.5 || subject.x + subject.w > sub.x + sub.w + 0.5 || (style !== 'popout' && subject.y < sub.y - 3);
    qc.add('framing', clipped ? 'warn' : 'pass', clipped ? 'Subject runs out of its frame' : 'Subject framed with clear space');
  }
}

// ---------------------------------------------------------------- sets

export async function loadSet(url = new URL('./cards.json', import.meta.url).href) {
  const doc = await (await fetch(url, { cache: 'no-cache' })).json();
  const cards = (doc.cards || []).map(c => ({ set: doc.set?.id, setSize: doc.cards.length, biome: doc.set?.biome, ...c }));
  return { set: doc.set || {}, cards };
}
export function toBlob(canvas, type = 'image/png', q) { return new Promise(r => canvas.toBlob(r, type, q)); }

// Glyphs and colours for other card looks (cards/v3 hex badges draw the same icons on their faceted chips).
export { drawIconGlyph, ICON_DISC as ICON_COLOURS };
