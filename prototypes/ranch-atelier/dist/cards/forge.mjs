// Card Forge: one renderer for every Abbie's World card, in game and in print.
// A card is a small JSON spec (cards/README.md). renderCard() paints it in millimetres, so one layout comes out as a
// hand card in the game or a 600 ppi print master with 3 mm bleed. Frames, gems, icons and type are drawn at the
// output resolution; only the art is a bitmap, and model art is rendered from the game's own GLB at print resolution.
// The face follows the card rubric in docs/oracle/cards (CARD_STUDY.md, card-rubric.json): window shape tells the
// card type, rarity is a growth stage told by gem shape + colour + frame material, a cost and at most two stats sit
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

// Frame materials per tier: [light, base, dark] for the body, and five stops for bevels and trim.
const WOOD = {
  pine:    { body: ['#e2bf87', '#c99c5f', '#8d6434'], trim: ['#6b4a26', '#c49a62', '#8a6236', '#e8c992', '#5e4020'] },
  green:   { body: ['#e2bf87', '#c99c5f', '#8d6434'], trim: ['#2f4a22', '#7fa35a', '#4d6e35', '#b6d48f', '#26401b'] },
  lacquer: { body: ['#b0573b', '#7c2f20', '#3f140c'], trim: ['#5a3a1c', '#d6a15c', '#8a5c2a', '#f6d79a', '#4d3117'] },
  gilded:  { body: ['#efcf74', '#b8872f', '#5a3a0c'], trim: ['#5e3f0c', '#f0cd6a', '#a7791f', '#fff4c4', '#6b4a12'] },
  sun:     { body: ['#fbe7a2', '#e7b851', '#9a6514'], trim: ['#6b3f08', '#ffd66b', '#c2861c', '#fffbe0', '#7a4c0c'] },
};
const FRAME_OF = { seed: 'pine', sprout: 'green', bloom: 'lacquer', harvest: 'gilded', sun: 'sun' };
const BRASS = ['#5a3a1c', '#d6a15c', '#8a5c2a', '#f6d79a', '#4d3117'];

// Painted backdrops behind models and cut-outs, one per world.
export const BIOMES = {
  ranch: { sky: ['#8fbfdc', '#c9e0e2', '#f7e7c4'], sun: '#fff4d6', hills: ['#c4cf9f', '#a9bd7f', '#93ab66'], ground: ['#8eaa63', '#6f8c4a'] },
  orchard: { sky: ['#e9b98c', '#f4d6b6', '#fbecd8'], sun: '#ffe9c9', hills: ['#c9c99a', '#adb97c', '#8fa660'], ground: ['#97ad62', '#728d47'] },
  dusk: { sky: ['#7d6fa8', '#d99ab0', '#f6cfa8'], sun: '#ffe1b8', hills: ['#8f8fb0', '#76829c', '#5d7088'], ground: ['#6a7d5c', '#4c5e43'] },
  moon: { sky: ['#0d1430', '#1c2a55', '#33467a'], sun: '#cfe0ff', hills: ['#5a6178', '#474d63', '#383d50'], ground: ['#6d7286', '#4a4f62'], stars: true },
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
function metalGradient(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  [0, 0.28, 0.5, 0.72, 1].forEach((p, i) => g.addColorStop(p, stops[i]));
  return g;
}
export function oklchToHex([l, c, h]) {
  const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3, m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3, s_ = (l - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_];
  return '#' + lin.map(v => { v = Math.min(1, Math.max(0, v)); v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(v * 255).toString(16).padStart(2, '0'); }).join('');
}

let grainTile = null;
function grain() {
  if (grainTile) return grainTile;
  const n = 256, c = mkCanvas(n, n), ctx = c.getContext('2d'), img = ctx.createImageData(n, n), r = rng(7);
  for (let i = 0; i < n * n; i++) { const v = 128 + (r() - 0.5) * 90; img.data.set([v, v, v, 255], i * 4); }
  ctx.putImageData(img, 0, 0);
  return (grainTile = c);
}
function paintGrain(ctx, x, y, w, h, alpha, mode = 'overlay', mmPerTile = 18) {
  ctx.save();
  const p = ctx.createPattern(grain(), 'repeat');
  const s = mmPerTile / 256;
  p.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
  ctx.globalAlpha = alpha; ctx.globalCompositeOperation = mode; ctx.fillStyle = p;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
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

// Enamel disc with a metal rim and a glyph: stat badges, ability icons and inline rules icons.
function drawIconDisc(ctx, icon, cx, cy, r, rim = BRASS) {
  const col = ICON_DISC[icon] || '#666';
  ctx.save();
  ctx.shadowColor = 'rgba(20,10,0,.45)'; ctx.shadowBlur = r * 0.5; ctx.shadowOffsetY = r * 0.14;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = metalGradient(ctx, cx - r, cy - r, cx + r, cy + r, rim); ctx.fill();
  ctx.restore();
  enamel(ctx, cx, cy, r * 0.82, col);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = r * 0.18; ctx.shadowOffsetY = r * 0.06;
  drawIconGlyph(ctx, icon, cx, cy + r * 0.02, r * 1.05);
  ctx.restore();
}
function enamel(ctx, cx, cy, r, col) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r * 1.05);
  g.addColorStop(0, mix(col, '#ffffff', 0.3)); g.addColorStop(0.55, col); g.addColorStop(1, mix(col, '#000000', 0.35));
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx - r * 0.18, cy - r * 0.52, r * 0.6, r * 0.26, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
}

// Chunky outlined number (GAME_FEEL: one rounded display face with a dark outline).
function numeral(ctx, s, cx, cy, size, fill = '#fff8e8', stroke = '#22140a') {
  ctx.save();
  ctx.font = numFont(size); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(s), base = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.16; ctx.strokeStyle = stroke;
  ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = size * 0.1; ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(s, cx, base);
  ctx.shadowColor = 'transparent'; ctx.fillStyle = fill; ctx.fillText(s, cx, base);
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  return (gl = { renderer, loader: new GLTFLoader() });
}

// A GLB as a studio hero shot: transparent background, soft contact shadow, framed to `fill` of the frame.
// view: {yaw, pitch, fill, lift, fov, exposure}
export async function renderModel(url, w, h, view = {}) {
  const { renderer, loader } = glRig();
  const model = (await loader.loadAsync(url)).scene;
  const scene = new THREE.Scene();
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    for (const m of [o.material].flat()) {
      if (!m) continue;
      if ('roughness' in m) m.roughness = Math.max(m.roughness ?? 0.8, 0.55);
      // a card is a solid print: see-through toy materials read as ghosts against the painted world
      if (m.transparent || m.opacity < 1) { m.transparent = false; m.opacity = 1; m.alphaTest = Math.max(m.alphaTest || 0, 0.5); m.depthWrite = true; m.needsUpdate = true; }
    }
  });
  let box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  model.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  const pivot = new THREE.Group(); pivot.add(model); pivot.rotation.y = THREE.MathUtils.degToRad(view.yaw ?? -30);
  scene.add(pivot);
  box = new THREE.Box3().setFromObject(pivot);
  const size = box.getSize(new THREE.Vector3()), radius = Math.max(size.x, size.y, size.z);

  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x6b7a4a, 1.25));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
  key.position.set(-radius * 1.6, radius * 2.6, radius * 2.2);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 6; key.shadow.bias = -0.0004;
  const sc = key.shadow.camera; sc.left = sc.bottom = -radius * 1.6; sc.right = sc.top = radius * 1.6; sc.near = 0.01; sc.far = radius * 10;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfe2ff, 1.1); rim.position.set(radius * 2, radius * 1.4, -radius * 2.4); scene.add(rim);
  const fillL = new THREE.DirectionalLight(0xffe2c2, 0.45); fillL.position.set(radius * 2.4, radius * 0.6, radius * 1.2); scene.add(fillL);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 12), new THREE.ShadowMaterial({ opacity: 0.32 }));
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
  renderer.toneMappingExposure = view.exposure ?? 1.05;
  renderer.render(scene, cam);
  const out = mkCanvas(w, h), octx = out.getContext('2d');
  octx.filter = 'saturate(1.35) contrast(1.06)'; // the game's pastel toy palette needs a push to sing on a card
  octx.drawImage(renderer.domElement, 0, 0);
  scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
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
      const canvas = await renderModel(art.model, w, h, view);
      return { canvas, mode, srcW: w, srcH: h, bounds: alphaBounds(canvas, w, h).box, rendered: box };
    }
    if (!art.image) throw new Error('no image for this card');
    const img = await loadImage(art.image);
    const a = alphaBounds(img, img.naturalWidth, img.naturalHeight);
    // A transparent cut-out stands on the painted world backdrop, like a model render.
    const cut = a.corner < 40 && a.box;
    return { canvas: img, mode: cut ? 'cutout' : 'image', bounds: cut ? a.box : null, srcW: img.naturalWidth, srcH: img.naturalHeight };
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
  const sky = ctx.createLinearGradient(0, y, 0, horizon);
  sky.addColorStop(0, b.sky[0]); sky.addColorStop(0.6, b.sky[1]); sky.addColorStop(1, b.sky[2]);
  ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
  if (b.stars) {
    for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.3 + r() * 0.7; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + r() * w, y + r() * h * 0.6, 0.08 + r() * 0.16, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  const sx = x + w * (0.72 + r() * 0.1), sy = y + h * 0.2;
  const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * 0.55);
  sun.addColorStop(0, b.sun); sun.addColorStop(0.25, b.sun + 'aa'); sun.addColorStop(1, b.sun + '00');
  ctx.fillStyle = sun; ctx.fillRect(x, y, w, h);
  if (!b.stars) {
    ctx.save(); ctx.filter = `blur(${w * 0.012}px)`;
    for (let i = 0; i < 4; i++) {
      const cx = x + r() * w, cy = y + h * (0.1 + r() * 0.22), cw = w * (0.12 + r() * 0.12);
      ctx.fillStyle = 'rgba(255,250,240,.6)';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(cx + (k - 1.5) * cw * 0.32, cy + Math.sin(k * 2) * cw * 0.05, cw * 0.32, cw * 0.17, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
  b.hills.forEach((col, i) => {
    const base = horizon - h * (0.1 - i * 0.045);
    ctx.beginPath(); ctx.moveTo(x, y + h);
    const ph = r() * 6, amp = h * (0.05 - i * 0.008), freq = 1.4 + r() * 1.2;
    for (let k = 0; k <= 48; k++) { const t = k / 48; ctx.lineTo(x + t * w, base - Math.sin(t * Math.PI * freq + ph) * amp - Math.sin(t * 9 + ph) * amp * 0.18); }
    ctx.lineTo(x + w, y + h); ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, y + h);
    g.addColorStop(0, col); g.addColorStop(1, mix(col, '#000000', 0.12));
    ctx.fillStyle = g; ctx.fill();
    if (i < 2 && !b.stars) {
      for (let t = 0; t < 9; t++) {
        const tx = x + r() * w, ty = base - Math.sin(((tx - x) / w) * Math.PI * freq + ph) * amp + h * 0.006, s = h * (0.012 + r() * 0.012) * (i + 1);
        ctx.fillStyle = mix(col, '#2c3a1c', 0.35); ctx.beginPath(); ctx.ellipse(tx, ty - s, s * 0.8, s, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  });
  const g = ctx.createLinearGradient(0, horizon, 0, y + h);
  g.addColorStop(0, b.ground[0]); g.addColorStop(1, b.ground[1]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x, horizon + h * 0.02); ctx.quadraticCurveTo(x + w * 0.5, horizon - h * 0.035, x + w, horizon + h * 0.02); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.fill();
  const hz = ctx.createLinearGradient(0, horizon - h * 0.12, 0, horizon + h * 0.05);
  hz.addColorStop(0, b.sky[2] + '00'); hz.addColorStop(0.7, b.sky[2] + '55'); hz.addColorStop(1, b.sky[2] + '00');
  ctx.fillStyle = hz; ctx.fillRect(x, horizon - h * 0.12, w, h * 0.17);
  if (!b.stars) {
    ctx.strokeStyle = mix(b.ground[1], '#20300f', 0.3); ctx.lineWidth = h * 0.0025; ctx.globalAlpha = 0.35;
    for (let i = 0; i < 160; i++) { const px = x + r() * w, py = horizon + r() * (y + h - horizon), l = h * (0.006 + (py - horizon) / h * 0.02); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (r() - 0.5) * l * 0.6, py - l); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
}

// Specimen backdrop: a field-guide plate. Warm paper, a soft pool of light, a hint of the floor line.
function paintPaper(ctx, x, y, w, h, sub, seed) {
  const g = ctx.createRadialGradient(x + w * 0.45, y + h * 0.42, 1, x + w / 2, y + h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, '#fbf3e1'); g.addColorStop(0.65, '#efe0bf'); g.addColorStop(1, '#d9c193');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const fy = sub.y + sub.h * 0.9;
  const fl = ctx.createLinearGradient(0, fy - 4, 0, y + h);
  fl.addColorStop(0, 'rgba(160,120,60,0)'); fl.addColorStop(0.4, 'rgba(160,120,60,.10)'); fl.addColorStop(1, 'rgba(120,85,40,.22)');
  ctx.fillStyle = fl; ctx.fillRect(x, fy - 4, w, y + h - fy + 4);
  paintGrain(ctx, x, y, w, h, 0.2, 'multiply', 9);
  const r = rng(seed + 5);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.fillStyle = '#7a5520';
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x + r() * w, y + r() * h, 3 + r() * 8, 2 + r() * 4, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
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

// Sun tier glory: soft rays and motes behind the subject.
function sunburst(ctx, cx, cy, R, seed) {
  const r = rng(seed + 9);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + r() * 0.1, wdt = 0.06 + r() * 0.06;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.75);
    g.addColorStop(0, 'rgba(255,236,170,.5)'); g.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a, a + wdt); ctx.closePath(); ctx.fill();
  }
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35);
  halo.addColorStop(0, 'rgba(255,240,190,.4)'); halo.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = halo; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, d = R * (0.08 + r() * 0.4), s = 0.12 + r() * 0.35;
    ctx.fillStyle = `rgba(255,248,215,${0.4 + r() * 0.6})`; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9, s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Paints backdrop + art in box (x,y,w,h); a model or cut-out stands in `sub`. Returns the subject's box in mm.
// style: specimen (paper backdrop), portal (painted world), shadowbox (world + foreground layer), popout (world + glory).
function paintArt(ctx, art, spec, x, y, w, h, sub, style) {
  let subject = null;
  if (art.mode === 'model' || art.mode === 'cutout') {
    const seed = hashSeed(spec.id);
    if (style === 'specimen') paintPaper(ctx, x, y, w, h, sub, seed);
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
    if (style !== 'specimen') { // a soft warm rim separates a pastel toy from a bright painted world
      const k = ctx.getTransform().a;
      ctx.save(); ctx.shadowColor = 'rgba(46,28,6,.5)'; ctx.shadowBlur = 0.9 * k; draw(ctx); ctx.restore();
    } else draw(ctx);
    subject.draw = draw;
    if (style === 'shadowbox') paintForeground(ctx, x, w, sub.y + sub.h, seed, spec.biome);
  } else {
    const f = spec.art?.focus || [0.5, 0.5], zoom = spec.art?.zoom || 1;
    const s = Math.max(w / art.srcW, h / art.srcH) * zoom, dw = art.srcW * s, dh = art.srcH * s;
    const dx = x + (w - dw) * f[0], dy = y + (h - dh) * f[1];
    ctx.drawImage(art.canvas, Math.min(x, Math.max(dx, x + w - dw)), Math.min(y, Math.max(dy, y + h - dh)), dw, dh);
    subject = { pxPerMm: 1 / s };
  }
  const v = ctx.createRadialGradient(x + w / 2, y + h * 0.45, Math.min(w, h) * 0.35, x + w / 2, y + h * 0.5, Math.max(w, h) * 0.78);
  v.addColorStop(0, 'rgba(40,20,0,0)'); v.addColorStop(1, 'rgba(40,20,0,.32)');
  ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
  paintGrain(ctx, x, y, w, h, 0.06, 'overlay', 14);
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

function paintFrameBody(ctx, tier, x, y, w, h, seed) {
  const m = WOOD[FRAME_OF[tier]], r = rng(seed);
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, m.body[0]); g.addColorStop(0.4, m.body[1]); g.addColorStop(1, m.body[2]);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  const metal = tier === 'harvest' || tier === 'sun';
  // wood grain (pine and lacquer) or hammered leaf (gilded)
  ctx.save(); ctx.globalAlpha = metal ? 0.1 : tier === 'bloom' ? 0.18 : 0.26; ctx.strokeStyle = m.body[2]; ctx.lineWidth = metal ? 0.12 : 0.2;
  for (let i = 0; i < (metal ? 30 : 80); i++) {
    const yy = y + r() * h, amp = 0.4 + r() * 1.4, ph = r() * 6, fr = 4 + r() * 6;
    ctx.beginPath();
    for (let t = 0; t <= 36; t++) { const xx = x + t / 36 * w; ctx.lineTo(xx, yy + Math.sin(t / 36 * fr + ph) * amp); }
    ctx.stroke();
  }
  if (!metal) for (let i = 0; i < 3; i++) { // knots
    const kx = x + r() * w, ky = y + r() * h;
    for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.ellipse(kx, ky, k * 0.45, k * 0.22, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
  paintGrain(ctx, x, y, w, h, metal ? 0.12 : 0.22, 'overlay', 22);
  if (tier === 'bloom' || metal) { // lacquer and leaf catch a broad sheen
    const s = ctx.createLinearGradient(x, y, x + w, y + h);
    s.addColorStop(0.15, 'rgba(255,255,255,0)'); s.addColorStop(0.3, 'rgba(255,255,255,.22)'); s.addColorStop(0.42, 'rgba(255,255,255,0)');
    ctx.fillStyle = s; ctx.fillRect(x, y, w, h);
  }
  const lp = ctx.createRadialGradient(x + w * 0.3, y + h * 0.12, 0, x + w * 0.3, y + h * 0.12, h * 0.95);
  lp.addColorStop(0, 'rgba(255,240,210,.2)'); lp.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = lp; ctx.fillRect(x, y, w, h);
}

function bevel(ctx, pathFn, trim, lw) {
  ctx.save();
  ctx.shadowColor = 'rgba(15,6,0,.55)'; ctx.shadowBlur = 1.4; ctx.shadowOffsetY = 0.45;
  ctx.lineWidth = lw * 2; ctx.lineJoin = 'round'; ctx.strokeStyle = metalGradient(ctx, 0, 0, CARD.w * 0.6, CARD.h, trim);
  pathFn(); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.lineWidth = 0.12; ctx.strokeStyle = 'rgba(0,0,0,.35)'; pathFn(); ctx.stroke(); ctx.restore();
}
function innerShadow(ctx, pathFn, strength = 0.5, size = 1.6) {
  ctx.save();
  pathFn(); ctx.clip();
  ctx.shadowColor = `rgba(20,8,0,${strength})`; ctx.shadowBlur = size; ctx.shadowOffsetY = size * 0.25;
  ctx.lineWidth = size * 2; ctx.strokeStyle = '#000'; pathFn(); ctx.stroke();
  ctx.restore();
}
function parchment(ctx, pathFn, x, y, w, h, seed, alpha = 1) {
  ctx.save();
  pathFn(); ctx.clip();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#fbf3df'); g.addColorStop(1, '#efe0bd');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  paintGrain(ctx, x, y, w, h, 0.14 * alpha, 'multiply', 10);
  const r = rng(seed);
  ctx.globalAlpha = 0.045 * alpha; ctx.fillStyle = '#8a5a20';
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(x + r() * w, y + r() * h, 2 + r() * 6, 1 + r() * 3, r() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  innerShadow(ctx, pathFn, 0.3 * alpha, 1);
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

// Rarity gem: growth-stage shape (seed, sprout, flower, wheat sheaf, sunburst) in its rubric colour, set in brass.
function rarityGem(ctx, tier, cx, cy, r) {
  const col = oklchToHex(RARITIES[tier].oklch), dark = mix(col, '#000000', 0.45), light = mix(col, '#ffffff', 0.45);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = r * 0.5; ctx.shadowOffsetY = r * 0.15;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = metalGradient(ctx, cx - r, cy - r, cx + r, cy + r, BRASS); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.84, 0, Math.PI * 2); ctx.fillStyle = '#1f150d'; ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 0, cx, cy, r);
  g.addColorStop(0, light); g.addColorStop(0.5, col); g.addColorStop(1, dark);
  ctx.fillStyle = g; ctx.strokeStyle = dark; ctx.lineWidth = r * 0.06;
  const s = r * 0.72;
  ctx.translate(cx, cy);
  ctx.beginPath();
  if (tier === 'seed') { ctx.moveTo(0, -s); ctx.bezierCurveTo(s * 0.9, -s * 0.4, s * 0.75, s * 0.9, 0, s); ctx.bezierCurveTo(-s * 0.75, s * 0.9, -s * 0.9, -s * 0.4, 0, -s); }
  else if (tier === 'sprout') {
    ctx.moveTo(-s * 0.1, s); ctx.lineTo(s * 0.1, s); ctx.lineTo(s * 0.1, -s * 0.05); ctx.lineTo(-s * 0.1, -s * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-s * 0.48, -s * 0.38, s * 0.52, s * 0.28, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * 0.48, -s * 0.38, s * 0.52, s * 0.28, 0.6, 0, Math.PI * 2);
  } else if (tier === 'bloom') {
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.moveTo(Math.cos(a) * s * 0.55 + s * 0.4, Math.sin(a) * s * 0.55); ctx.ellipse(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.4, s * 0.4, 0, 0, Math.PI * 2); }
    ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); ctx.fillStyle = '#ffe08a';
  } else if (tier === 'harvest') {
    for (const a of [-0.45, 0, 0.45]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -s * 0.38, s * 0.24, s * 0.62, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.rect(-s * 0.42, s * 0.18, s * 0.84, s * 0.22); ctx.fillStyle = '#e8c25a'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.25, s * 0.4); ctx.lineTo(-s * 0.4, s); ctx.lineTo(s * 0.4, s); ctx.lineTo(s * 0.25, s * 0.4); ctx.fillStyle = g;
  } else {
    for (let i = 0; i < 24; i++) { const a = -Math.PI / 2 + i * Math.PI / 12, rr = i % 2 ? s * 0.62 : s * 1.06; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2); ctx.fillStyle = '#fff3c4';
  }
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.42, r * 0.3, r * 0.13, -0.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
  ctx.restore();
}

// Round token for cost and stats: rim, dark enamel, big outlined numeral (contrast over 3:1 by construction).
function token(ctx, value, cx, cy, r, col, rim) {
  ctx.save();
  ctx.shadowColor = 'rgba(15,6,0,.55)'; ctx.shadowBlur = r * 0.45; ctx.shadowOffsetY = r * 0.12;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = metalGradient(ctx, cx - r, cy - r, cx + r, cy + r, rim); ctx.fill();
  ctx.restore();
  enamel(ctx, cx, cy, r * 0.84, col);
  numeral(ctx, String(value), cx, cy, NUMERAL_MM);
}

function brassCaps(ctx) {
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [CARD.w, 0, -1, 1], [0, CARD.h, 1, -1], [CARD.w, CARD.h, -1, -1]]) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 0.8; ctx.shadowOffsetY = 0.3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7.5, 0); ctx.lineTo(7.5, 1.4); ctx.quadraticCurveTo(2.6, 1.4, 1.4, 2.6); ctx.quadraticCurveTo(1.4, 2.6, 1.4, 7.5); ctx.lineTo(0, 7.5); ctx.closePath();
    ctx.fillStyle = metalGradient(ctx, 0, 0, 7.5, 7.5, BRASS); ctx.fill();
    ctx.fillStyle = '#3a240e'; for (const [px, py] of [[5.6, 0.7], [0.7, 5.6]]) { ctx.beginPath(); ctx.arc(px, py, 0.32, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
function filigree(ctx, trim) {
  for (const [cx, cy, sx, sy] of [[1.8, 1.8, 1, 1], [CARD.w - 1.8, 1.8, -1, 1], [1.8, CARD.h - 1.8, 1, -1], [CARD.w - 1.8, CARD.h - 1.8, -1, -1]]) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx * 0.8, sy * 0.8);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 0.8; ctx.shadowOffsetY = 0.3;
    ctx.strokeStyle = metalGradient(ctx, 0, 0, 9, 9, trim); ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 0.55; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(1.2, 9.5); ctx.bezierCurveTo(1.2, 4, 4, 1.2, 9.5, 1.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.6, 7); ctx.bezierCurveTo(3.5, 4.6, 4.6, 3.5, 7, 2.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(2.5, 2.5, 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
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
 *        finish: overrides the tier's finish, guides: trim and safe lines}
 * Returns {canvas, qc, manifest, masks}: qc is the quality report for this exact output, manifest is the rubric
 * checker's card.json (boxes in canvas px), masks are the finish layers to draw with renderMask().
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
  const trim = WOOD[FRAME_OF[tier]].trim, sun = tier === 'sun';
  const finish = opts.finish || spec.finish || R.finish;
  const seed = hashSeed(spec.id || spec.name);
  const qc = newQC(spec), boxes = [], toPx = (x, y, bw, bh) => [x, y, bw, bh].map((v, i) => Math.round((i < 2 ? v + b : v) * pxmm));
  const style = lod === 'board' && sun ? 'portal' : spec.artStyle || ART_STYLES[tier];
  const A = lod === 'board' ? { x: 4, y: 4, w: 55, h: 72 } : sun ? L.sunArt : L.art;
  const sub = lod === 'board' ? { x: 4, y: 12, w: 55, h: 60 } : sun ? L.sunSubject : L.subject;

  let art = null;
  try { art = await prepareArt(spec, { artDpi: Math.max(600, dpi), box: sub, view: style === 'specimen' ? { fill: 0.92 } : {} }); }
  catch (e) { qc.add('art', 'fail', 'Art did not load: ' + e.message); }

  ctx.save();
  ctx.scale(pxmm, pxmm); ctx.translate(b, b);
  ctx.clearRect(-b, -b, CARD.w + b * 2, CARD.h + b * 2);
  ctx.save();
  if (!bleed) { rrect(ctx, 0, 0, CARD.w, CARD.h, CARD.radius); ctx.clip(); }

  paintFrameBody(ctx, tier, -b, -b, CARD.w + b * 2, CARD.h + b * 2, seed);
  const winPath = () => windowPath(ctx, type, A.x, A.y, A.w, A.h);
  let subject = null;
  if (style === 'popout' && lod !== 'board') {
    // Sun tier: the world runs to the edge of the card (overlay), a gold window floats in it, and the subject's
    // head steps out over the window's top edge (pop-out), with a small cast shadow on the frame.
    if (art) subject = paintArt(ctx, art, spec, -b, -b, CARD.w + 2 * b, CARD.h + 2 * b, sub, style);
    ctx.save(); rrect(ctx, 1.1, 1.1, CARD.w - 2.2, CARD.h - 2.2, CARD.radius - 0.9);
    ctx.lineWidth = 0.9; ctx.strokeStyle = metalGradient(ctx, 0, 0, CARD.w, CARD.h, trim); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b); windowPath(ctx, type, A.x, A.y, A.w, A.h);
    ctx.fillStyle = 'rgba(60,30,0,.28)'; ctx.fill('evenodd'); ctx.restore(); // the world outside the window sits back
    bevel(ctx, winPath, trim, 0.6);
    if (subject?.draw) {
      ctx.save();
      ctx.beginPath(); ctx.rect(-b, -b, CARD.w + 2 * b, A.y + 12 + b); ctx.clip();
      ctx.save(); ctx.filter = 'blur(0.6px) brightness(0)'; ctx.globalAlpha = 0.35; ctx.translate(0.5, 0.7); subject.draw(ctx); ctx.restore();
      subject.draw(ctx);
      ctx.restore();
    }
  } else {
    // painted edge (Seed), green trim (Sprout), brass (Bloom), gold (Harvest)
    ctx.save(); rrect(ctx, 1.1, 1.1, CARD.w - 2.2, CARD.h - 2.2, CARD.radius - 0.9);
    ctx.lineWidth = tier === 'seed' ? 0.9 : 0.75;
    ctx.strokeStyle = tier === 'seed' ? TYPES[type].accent : metalGradient(ctx, 0, 0, CARD.w, CARD.h, trim); ctx.stroke(); ctx.restore();
    if (tier === 'harvest') filigree(ctx, trim);
    bevel(ctx, winPath, trim, 0.75);
    ctx.save(); winPath(); ctx.fillStyle = '#222'; ctx.fill(); ctx.clip();
    if (art) subject = paintArt(ctx, art, spec, A.x, A.y, A.w, A.h, sub, style);
    ctx.restore();
    innerShadow(ctx, winPath, 0.6, 1.4);
  }
  if (art) checkArt(qc, art, subject, A, sub, style);

  // Cost: top-left token
  const hasCost = Number.isFinite(spec.cost);
  if (hasCost) {
    const C = L.cost;
    token(ctx, spec.cost, C.cx, C.cy, C.r, '#24384a', BRASS);
    boxes.push({ role: 'numeral', what: 'cost', bbox: toPx(C.cx - C.r, C.cy - C.r, C.r * 2, C.r * 2), font_pt: +(NUMERAL_MM / MM_PER_PT).toFixed(1), family: 'Fredoka', text_colour: '#fff8e8' });
  }

  // Name ribbon (board cards carry no words)
  if (lod !== 'board') {
    const Rb = sun ? L.sunRibbon : L.ribbon, rp = () => ribbonPath(ctx, Rb);
    bevel(ctx, rp, trim, 0.45);
    parchment(ctx, rp, Rb.x, Rb.y - 1, Rb.w, Rb.h + 2, seed + 1);
    ctx.save(); rp(); ctx.clip(); // accent stripes in the type colour
    ctx.fillStyle = TYPES[type].accent; ctx.globalAlpha = 0.85;
    ctx.fillRect(Rb.x, Rb.y - 1, Rb.w, 1.25); ctx.fillRect(Rb.x, Rb.y + Rb.h - 0.4, Rb.w, 1.3);
    if (R.order >= 2) { // spot-gloss name from Bloom up
      const g2 = ctx.createLinearGradient(0, Rb.y, 0, Rb.y + Rb.h); g2.addColorStop(0, 'rgba(255,255,255,.45)'); g2.addColorStop(0.45, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = g2; ctx.fillRect(Rb.x, Rb.y, Rb.w, Rb.h * 0.5);
    }
    ctx.restore();
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
  const G = lod === 'board' ? { cx: 31.5, cy: 79.8, r: 3.4 } : L.gem;
  if (lod === 'inspect') {
    const T = L.type, tp = () => rrect(ctx, T.x, T.y, T.w, T.h, 1.2);
    ctx.save(); tp(); const tg = ctx.createLinearGradient(0, T.y, 0, T.y + T.h); tg.addColorStop(0, mix(TYPES[type].accent, '#000000', 0.25)); tg.addColorStop(1, mix(TYPES[type].accent, '#000000', 0.55)); ctx.fillStyle = tg; ctx.fill(); ctx.restore();
    bevel(ctx, tp, trim, 0.3);
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
  if (lod !== 'board') {
    const X = L.text, xp = () => rrect(ctx, X.x, X.y, X.w, X.h, 1.4);
    bevel(ctx, xp, trim, 0.5);
    parchment(ctx, xp, X.x, X.y, X.w, X.h, seed + 2);
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
    token(ctx, st.value, pos.cx, pos.cy, r, ICON_DISC[st.icon] || '#444', trim);
    const ix = pos.cx + (pos.cx < CARD.w / 2 ? 4.3 : -4.3), iy = pos.cy - 3.7;
    drawIconDisc(ctx, st.icon, ix, iy, 2.3, trim);
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

  if (tier === 'sprout' || tier === 'bloom') brassCaps(ctx);
  ctx.restore(); // silhouette clip

  // Finish preview and gloss
  ctx.save();
  const facePath = () => { if (bleed) { ctx.beginPath(); ctx.rect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b); } else rrect(ctx, 0, 0, CARD.w, CARD.h, CARD.radius); };
  if (opts.preview !== false) {
    if (finish === 'shimmer' && !sun) finishPreview(ctx, finish, winPath, A.x, A.y, A.w, A.h, seed);
    else finishPreview(ctx, finish, facePath, -b, -b, CARD.w + 2 * b, CARD.h + 2 * b, seed);
  }
  facePath(); ctx.clip();
  const sh = ctx.createLinearGradient(0, 0, CARD.w, CARD.h);
  sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.05)');
  ctx.fillStyle = sh; ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
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

  const artBox = style === 'popout' ? { x: 0, y: 0, w: CARD.w, h: CARD.h } : A;
  const srcPerMm = subject?.pxPerMm || 0;
  const masks = maskRegions(tier, finish);
  const manifest = {
    id: spec.id, ppi: dpi, bleed, rarity: tier, type, lod, finish, full_art: sun,
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
  return { canvas, qc: qc.done(), manifest, masks };
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
  const g = ctx.createRadialGradient(CARD.w / 2, CARD.h * 0.45, 2, CARD.w / 2, CARD.h / 2, CARD.h * 0.7);
  g.addColorStop(0, '#2f6b6a'); g.addColorStop(1, '#123536');
  ctx.fillStyle = g; ctx.fillRect(-b, -b, CARD.w + 2 * b, CARD.h + 2 * b);
  // quilted diamond stitching, like a saddle blanket
  ctx.save(); ctx.strokeStyle = 'rgba(255,230,170,.16)'; ctx.lineWidth = 0.25; ctx.setLineDash([0.7, 0.5]);
  for (let k = -CARD.h; k < CARD.w + CARD.h; k += 5) { ctx.beginPath(); ctx.moveTo(k, -b); ctx.lineTo(k - CARD.h - 2 * b, CARD.h + b); ctx.stroke(); ctx.beginPath(); ctx.moveTo(k, -b); ctx.lineTo(k + CARD.h + 2 * b, CARD.h + b); ctx.stroke(); }
  ctx.restore();
  paintGrain(ctx, -b, -b, CARD.w + 2 * b, CARD.h + 2 * b, 0.18, 'overlay', 20);
  const gold = WOOD.gilded.trim;
  ctx.save(); rrect(ctx, 3.2, 3.2, CARD.w - 6.4, CARD.h - 6.4, 2.4); ctx.lineWidth = 0.9; ctx.strokeStyle = metalGradient(ctx, 0, 0, CARD.w, CARD.h, gold); ctx.stroke();
  rrect(ctx, 4.6, 4.6, CARD.w - 9.2, CARD.h - 9.2, 1.8); ctx.lineWidth = 0.3; ctx.stroke(); ctx.restore();
  filigree(ctx, gold);
  const halo = ctx.createRadialGradient(CARD.w / 2, CARD.h * 0.46, 0, CARD.w / 2, CARD.h * 0.46, 30);
  halo.addColorStop(0, 'rgba(255,230,160,.45)'); halo.addColorStop(1, 'rgba(255,230,160,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, CARD.w, CARD.h);
  try {
    const logo = await loadImage(new URL('./art/back-logo.png', import.meta.url).href);
    const lw = 50, lh = lw * logo.naturalHeight / logo.naturalWidth;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 0.8;
    ctx.drawImage(logo, (CARD.w - lw) / 2, CARD.h * 0.46 - lh / 2, lw, lh); ctx.restore();
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
function checkArt(qc, art, subject, A, sub, style) {
  if (!subject) { qc.add('art', 'fail', 'Art did not paint'); return; }
  const ppi = subject.pxPerMm * 25.4;
  if (art.mode === 'model') qc.add('art', 'pass', `Rendered from the game model at ${Math.round(ppi)} ppi`);
  else qc.add('art', ppi >= 300 ? 'pass' : ppi >= 200 ? 'warn' : 'fail', ppi >= 300 ? `Art prints at ${Math.round(ppi)} ppi` : `Art is ${Math.round(ppi)} ppi in print${ppi >= 200 ? ' (fine in game)' : '; needs a bigger image'}`);
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
