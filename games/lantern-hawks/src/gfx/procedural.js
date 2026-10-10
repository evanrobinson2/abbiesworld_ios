// Procedural placeholder art. Everything here is drawn from code with one
// small palette and chunky dark outlines, and registered under the same role
// keys real art will use later (see keys.js and assets/manifest.json).

import { P } from './palette.js';
import { drawText, textWidth } from './font.js';
import { spriteKey, hexKey, HEX_ARTS, HEX_VARIANTS } from './keys.js';

// ---- helpers ------------------------------------------------------------------
export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function bayer(x, y) { return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16; }

function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }

// Dithered vertical gradient through a list of colours.
function vgrad(g, x, y, w, h, cols) {
  const n = cols.length - 1;
  for (let j = 0; j < h; j++) {
    const t = (j / Math.max(1, h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    for (let k = 0; k < w; k++) px(g, x + k, y + j, f > bayer(x + k, y + j) ? cols[i + 1] : cols[i]);
  }
}

// Fill with a dither between two colours at a given density.
function ditherRect(g, x, y, w, h, c1, c2, t) {
  for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) px(g, x + k, y + j, t > bayer(x + k, y + j) ? c2 : c1);
}

function ellipse(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

function glow(g, cx, cy, r, c, strength = 0.5) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    const d = Math.sqrt(x * x + y * y) / r;
    if (d < 1 && (1 - d) * strength > bayer(cx + x, cy + y)) px(g, cx + x, cy + y, c);
  }
}

// Add a 1px dark outline around every opaque pixel.
export function outline(src, color = P.ink) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, g] = mk(w, h);
  g.drawImage(src, 0, 0);
  g.fillStyle = color;
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && s[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (op(x, y)) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) g.fillRect(x, y, 1, 1);
  }
  return c;
}

function flipH(src) {
  const [c, g] = mk(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

// Draw a character grid with a palette map.
function grid(rows, pal) {
  const [c, g] = mk(rows[0].length, rows.length);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) px(g, x, y, pal[ch]); }));
  return c;
}

// ---- characters ----------------------------------------------------------------
const HEAD_DOWN = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...khhsssshhk...',
  '...kssessessk...', '...kSssssssSk...', '....kSssssSk....',
];
const HEAD_UP = [
  '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...khhhhhhhhk...',
  '...khhhhhhhhk...', '...kHhhhhhhHk...', '....kHhhhhHk....',
];
const BODY_FRONT = ['...kjjgjjgjjk...', '..kJjjjggjjjJk..', '..kJjjjggjjjJk..', '..ksJjjjjjjJsk..', '...kppppppppk...'];
const BODY_BACK = ['...kjjjjjjjjk...', '..kJjjjjjjjjJk..', '..kJjjjjjjjjJk..', '..ksJjjjjjjJsk..', '...kppppppppk...'];
const LEGS_F = [
  ['....kpPk.kPpk...', '....kbbk.kbbk...', '....kkkk.kkkk...'],
  ['....kpPk.kPpk...', '....kbbk..kkk...', '....kkkk........'],
];
const SIDE = [
  '................', '......kkkkk.....', '.....khhhhhk....', '....khhhhhhhk...', '....khhhssssk...',
  '....khhsssesk...', '....khSsssssk...', '.....kSsssk.....', '.....kjjjgjk....', '....kjjjjgjjk...',
  '....kjjsjgjjk...', '....kJjsjjjJk...', '....kppppppk....',
];
const LEGS_S = [
  ['.....kpPpk......', '.....kbbbk......', '.....kkkkk......'],
  ['....kpPk.kPk....', '...kbbk...kbk...', '...kkkk...kkk...'],
];

const CHAR_PALS = {
  hero: { j: P.blue, J: P.blueD, g: P.silverL, h: P.hairBrown, H: '#24160e', p: P.inkSoft, P: P.ink, s: P.skin1, S: P.skin1D },
  'npc.cadet': { j: P.teal, J: P.tealD, g: P.silverL, h: P.hairBlond, H: P.amberD, p: P.inkSoft, P: P.ink, s: P.skin2, S: P.skin2D },
  'npc.vendor': { j: P.amber, J: P.amberD, g: P.white, h: P.hairGrey, H: P.silverD, p: P.brownD, P: P.ink, s: P.skin3, S: P.skin3D },
  'npc.mechanic': { j: P.orange, J: P.brown, g: P.yellow, h: P.hairBlack, H: P.ink, p: P.orange, P: P.brown, s: P.skin1, S: P.skin1D },
};

function charFrame(pal, dir, f) {
  const base = { k: P.ink, e: P.ink, b: P.brownD, ...pal };
  if (dir === 'down' || dir === 'up') {
    const rows = [...(dir === 'down' ? HEAD_DOWN : HEAD_UP), ...(dir === 'down' ? BODY_FRONT : BODY_BACK), ...LEGS_F[f]];
    return grid(rows, base);
  }
  const c = grid([...SIDE, ...LEGS_S[f]], base);
  return dir === 'left' ? flipH(c) : c;
}

function paintCharacters(reg) {
  for (const [who, pal] of Object.entries(CHAR_PALS)) {
    for (const dir of ['down', 'up', 'left', 'right']) for (const f of [0, 1]) reg(spriteKey(who, dir, f), charFrame(pal, dir, f));
  }
}

// ---- hex tiles (28x32, pointy top, bevelled) -------------------------------------
const HW = 28, HH = 32;
function inHex(x, y) {
  if (y < 0 || y >= HH || x < 0 || x >= HW) return false;
  const yc = y + 0.5;
  let half;
  if (yc < 8) half = (yc / 8) * 14;
  else if (yc > 24) half = ((32 - yc) / 8) * 14;
  else half = 14;
  return Math.abs(x + 0.5 - 14) <= half;
}

const HEX_BASE = {
  plains: [P.grass, [P.grassD, P.grassL, P.flower1]],
  forest: [P.grassD, [P.grass, P.leafD]],
  dense_forest: [P.leafD, [P.leaf, P.ink]],
  lake: [P.water, [P.waterL, P.waterD]],
  hills: [P.olive, [P.oliveD, P.grass]],
  mountains: [P.stoneD, [P.stone, P.inkSoft]],
  river: [P.grass, [P.grassD, P.grassL]],
  bridge: [P.grass, [P.grassD]],
  road: [P.grass, [P.grassD, P.grassL]],
  ruins: [P.scorchL, [P.scorch, P.stoneD]],
  cave: [P.olive, [P.oliveD]],
  city: [P.stone, [P.stoneD, P.stoneL]],
  city_burning: [P.scorch, [P.scorchL, P.ember]],
  port: [P.stoneD, [P.stone, P.inkSoft]],
};

function hexDecor(g, art, r) {
  const tree = (x, y) => { rect(g, x, y + 3, 2, 3, P.trunk); ellipse(g, x + 1, y + 1, 3, 3, P.leaf); px(g, x, y, P.leafL); px(g, x - 2, y + 2, P.leafD); };
  const house = (x, y, roof, lit = true) => { rect(g, x, y + 3, 6, 5, P.wall); rect(g, x - 1, y, 8, 3, roof); px(g, x + 2, y + 5, lit ? P.lit : P.ink); rect(g, x, y + 8, 6, 1, P.ink); };
  if (art === 'forest' || art === 'dense_forest') for (const [x, y] of [[7, 6], [16, 5], [11, 13], [20, 14], [6, 19], [15, 21]]) tree(x + Math.floor(r() * 2), y);
  if (art === 'hills') for (const [x, y] of [[9, 14], [19, 18]]) { ellipse(g, x, y, 7, 4, P.oliveD); ellipse(g, x - 1, y - 1, 5, 3, P.olive); rect(g, x - 3, y - 3, 3, 1, P.grassL); }
  if (art === 'mountains') for (const [x, y, s] of [[9, 20, 9], [19, 22, 8]]) {
    for (let i = 0; i < s; i++) { rect(g, x - i, y - s + i, i * 2 + 1, 1, i < 3 ? P.white : P.stone); px(g, x - i, y - s + i, P.stoneL); }
  }
  if (art === 'river' || art === 'bridge') {
    for (let y = 0; y < HH; y++) { const cx = 13 + Math.round(Math.sin(y / 5) * 3); rect(g, cx - 3, y, 7, 1, P.water); px(g, cx - 1, y, y % 4 ? P.water : P.waterL); }
  }
  if (art === 'bridge' || art === 'road') { rect(g, 0, 13, HW, 6, P.road); rect(g, 0, 13, HW, 1, P.roadL); rect(g, 0, 18, HW, 1, P.roadD); }
  if (art === 'bridge') { for (let x = 9; x < 20; x += 2) rect(g, x, 12, 1, 8, P.brownD); rect(g, 8, 12, 12, 1, P.brownL); rect(g, 8, 19, 12, 1, P.brownL); }
  if (art === 'ruins') for (const [x, y] of [[8, 10], [17, 12], [12, 20]]) { rect(g, x, y, 3, 7, P.stoneL); rect(g, x, y, 3, 1, P.white); rect(g, x + 4, y + 5, 4, 2, P.stoneD); }
  if (art === 'cave') { ellipse(g, 14, 16, 8, 6, P.oliveD); ellipse(g, 14, 19, 5, 5, P.ink); rect(g, 9, 22, 10, 2, P.ink); }
  if (art === 'city' || art === 'city_burning') {
    const burn = art === 'city_burning';
    rect(g, 10, 4, 8, 9, burn ? P.inkSoft : P.silver); for (let x = 10; x < 18; x += 2) px(g, x, 3, P.ink); // citadel
    house(5, 13, burn ? P.scorchL : P.blue, !burn); house(17, 14, burn ? P.scorchL : P.red, !burn); house(10, 20, burn ? P.scorchL : P.olive, !burn);
    if (burn) { glow(g, 14, 9, 6, P.fire, 0.8); glow(g, 8, 16, 4, P.ember, 0.7); px(g, 14, 2, P.fire); }
    else rect(g, 13, 1, 1, 3, P.blueL);
  }
  if (art === 'port') { ellipse(g, 14, 16, 9, 6, P.stone); ellipse(g, 14, 16, 6, 4, P.stoneD); for (const [x, y] of [[5, 16], [23, 16], [14, 10], [14, 22]]) px(g, x, y, P.neonCyan); rect(g, 13, 13, 3, 5, P.silverL); }
  if (art === 'plains') for (let i = 0; i < 3; i++) { const x = 6 + Math.floor(r() * 16), y = 8 + Math.floor(r() * 16); rect(g, x, y, 1, 2, P.grassL); px(g, x + 1, y + 1, P.grassL); }
}

function paintHex(art, v) {
  const [c, g] = mk(HW, HH);
  const [base, dots] = HEX_BASE[art];
  const r = rng(art.length * 977 + v * 31 + art.charCodeAt(0));
  rect(g, 0, 0, HW, HH, base);
  for (let i = 0; i < 46; i++) px(g, Math.floor(r() * HW), Math.floor(r() * HH), dots[i % dots.length]);
  hexDecor(g, art, r);
  // Clip to the hex, then bevel: light top-left rim, dark bottom-right rim, ink outline.
  const img = g.getImageData(0, 0, HW, HH);
  const d = img.data;
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
    const i = (y * HW + x) * 4;
    if (!inHex(x, y)) { d[i + 3] = 0; continue; }
    const edge = !inHex(x - 1, y) || !inHex(x + 1, y) || !inHex(x, y - 1) || !inHex(x, y + 1);
    if (edge) { d[i] = 0x14; d[i + 1] = 0x10; d[i + 2] = 0x1c; continue; }
    const nearTL = !inHex(x - 2, y - 1) || !inHex(x - 1, y - 2);
    const nearBR = !inHex(x + 2, y + 1) || !inHex(x + 1, y + 2);
    const k = nearTL ? 1.3 : nearBR ? 0.62 : 1;
    if (k !== 1) for (let j = 0; j < 3; j++) d[i + j] = Math.min(255, d[i + j] * k + (nearTL ? 18 : 0));
  }
  g.putImageData(img, 0, 0);
  return c;
}

function paintHexes(reg) {
  for (const art of HEX_ARTS) for (let v = 0; v < HEX_VARIANTS; v++) reg(hexKey(art, v), paintHex(art, v));
  // Hover / selection rim.
  const [c, g] = mk(HW, HH);
  for (let y = 0; y < HH; y++) for (let x = 0; x < HW; x++) {
    if (!inHex(x, y)) continue;
    const edge = !inHex(x - 1, y) || !inHex(x + 1, y) || !inHex(x, y - 1) || !inHex(x, y + 1);
    if (edge) px(g, x, y, P.lit);
  }
  reg('hex.cursor', c);
}

// ---- figurines (16x24, standing on a base) -----------------------------------------
function paintFigures(reg) {
  {
    const [c, g] = mk(16, 24);
    ellipse(g, 8, 20, 6, 2, P.silverD); rect(g, 2, 20, 13, 2, P.inkSoft);
    g.fillStyle = P.blue; g.beginPath(); g.moveTo(8, 7); g.lineTo(13, 20); g.lineTo(3, 20); g.fill();
    rect(g, 7, 10, 2, 9, P.silverL);
    ellipse(g, 8, 5, 3, 3, P.skin1); rect(g, 5, 2, 7, 2, P.hairBrown);
    rect(g, 12, 1, 1, 11, P.brownD); rect(g, 13, 1, 3, 3, P.lit); // lantern pennant
    reg('fig.squad', outline(c));
  }
  {
    const [c, g] = mk(16, 24);
    ellipse(g, 8, 20, 6, 2, P.inkSoft); rect(g, 2, 20, 13, 2, P.ink);
    rect(g, 5, 13, 2, 7, P.redD); rect(g, 9, 13, 2, 7, P.redD);
    rect(g, 3, 6, 10, 8, P.crimson); rect(g, 6, 8, 4, 2, P.ink); px(g, 8, 8, P.yellow);
    rect(g, 1, 7, 2, 4, P.ink); rect(g, 13, 7, 2, 4, P.ink); rect(g, 5, 3, 6, 3, P.ink); px(g, 6, 4, P.ember);
    reg('fig.mech.harrier', outline(c));
  }
}

// ---- city scenes (320x180 "epic" image with points of interest) --------------------
const STYLES = {
  school:   { roof: P.blue, roofD: P.blueD, wall: P.wall },
  barracks: { roof: P.olive, roofD: P.oliveD, wall: P.wallD },
  hospital: { roof: P.white, roofD: P.silver, wall: P.wallL, cross: true },
  shop:     { roof: P.red, roofD: P.redD, wall: P.wall, awning: P.amber },
  shop2:    { roof: P.purple, roofD: P.purpleD, wall: P.wall, awning: P.teal },
  lounge:   { roof: P.brown, roofD: P.brownD, wall: P.brownL, lamps: true },
  garage:   { roof: P.stoneD, roofD: P.inkSoft, wall: P.stone, bay: true },
};

function building(g, x, y, w, h, kind, ruined, r) {
  const s = STYLES[kind] || STYLES.shop;
  const roofH = Math.round(h * 0.42);
  const [b, bg] = mk(w + 2, h + 2);
  // Roof: a peaked block with shingle lines.
  bg.fillStyle = s.roof; bg.beginPath(); bg.moveTo(1, roofH + 1); bg.lineTo(5, 1); bg.lineTo(w - 4, 1); bg.lineTo(w, roofH + 1); bg.fill();
  for (let yy = 4; yy < roofH; yy += 3) ditherRect(bg, 4, yy, w - 7, 1, s.roof, s.roofD, 0.7);
  rect(bg, 1, roofH + 1, w, h - roofH, s.wall);
  ditherRect(bg, 1, h - 3, w, 3, s.wall, P.wallD, 0.5);
  for (let wx = 4; wx < w - 6; wx += 8) for (let wy = roofH + 4; wy < h - 10; wy += 9) {
    const lit = ruined ? r() > 0.75 : r() > 0.2;
    rect(bg, wx, wy, 4, 5, P.ink); rect(bg, wx + 1, wy + 1, 2, 3, lit ? P.lit : P.glass);
  }
  const dw = s.bay ? Math.min(20, w - 8) : 6;
  rect(bg, Math.round(w / 2 - dw / 2), h - 9, dw, 10, P.ink);
  rect(bg, Math.round(w / 2 - dw / 2) + 1, h - 8, dw - 2, 9, s.bay ? P.stoneD : P.brown);
  if (s.awning) for (let ax = 2; ax < w - 1; ax += 4) rect(bg, ax, roofH + 1, 2, 3, s.awning), rect(bg, ax + 2, roofH + 1, 2, 3, P.white);
  if (s.cross) { rect(bg, w / 2 - 1, 3, 3, 9, P.red); rect(bg, w / 2 - 4, 6, 9, 3, P.red); }
  if (s.lamps) for (const lx of [3, w - 5]) { glow(bg, lx + 1, roofH + 6, 5, P.lit, 0.7); rect(bg, lx, roofH + 4, 3, 3, P.lit); }
  if (ruined) damage(bg, w + 2, h + 2, roofH, 1, r);
  g.drawImage(outline(b), x - 1, y - 1);
}

function damage(g, W, H, roofH, amount, r) {
  const holes = Math.round(2 + amount * (W / 12));
  for (let i = 0; i < holes; i++) {
    const hx = Math.floor(r() * (W - 8)) + 2, hy = Math.floor(r() * Math.max(2, roofH - 4)) + 2;
    const hw = 4 + Math.floor(r() * 7), hh = 3 + Math.floor(r() * 4);
    for (let y = 0; y < hh; y++) rect(g, hx + Math.floor(r() * 2), hy + y, Math.max(1, hw - Math.floor(r() * 3)), 1, P.ink);
    rect(g, hx + 1, hy + hh, hw - 2, 1, P.ember);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r() < 0.08 * amount) px(g, x, y, r() < 0.5 ? P.scorch : P.scorchL);
}

function citadel(g, x, y, w, h, ruined, r) {
  const [b, bg] = mk(w + 2, h + 2);
  rect(bg, 1, 10, w, h - 9, P.stoneL);
  ditherRect(bg, 1, h - 10, w, 10, P.stoneL, P.stone, 0.5);
  for (const tx of [1, w - 13]) { rect(bg, tx, 1, 13, h, P.stone); for (let cx = tx; cx < tx + 13; cx += 4) rect(bg, cx, 0, 2, 3, P.stone); }
  for (let cx = 14; cx < w - 14; cx += 5) rect(bg, cx, 7, 3, 4, P.stoneL);
  const banner = ruined ? [P.crimson, P.ink] : [P.blue, P.silverL];
  for (const bx of [w * 0.32, w * 0.62]) { rect(bg, bx, 16, 9, 22, banner[0]); rect(bg, bx + 3, 22, 3, 7, banner[1]); }
  rect(bg, w / 2 - 7, h - 20, 14, 21, P.ink); ellipse(bg, w / 2, h - 20, 7, 5, P.ink); rect(bg, w / 2 - 5, h - 18, 10, 19, ruined ? P.ember : P.brownD);
  for (const tx of [5, w - 9]) for (let wy = 10; wy < h - 12; wy += 10) rect(bg, tx, wy, 3, 5, ruined ? P.ink : P.lit);
  if (ruined) damage(bg, w + 2, h + 2, h * 0.5, 1.2, r);
  g.drawImage(outline(b), x - 1, y - 1);
}

function tower(g, x, y, w, h, ruined) {
  const [b, bg] = mk(w + 2, h + 2);
  const cx = Math.round(w / 2);
  if (!ruined) { ellipse(bg, cx, 6, Math.round(w / 2), 4, P.silverL); ellipse(bg, cx, 7, Math.round(w / 2) - 2, 2, P.silver); }
  rect(bg, cx - 5, 10, 10, h - 10, P.stone);
  for (let yy = 14; yy < h - 4; yy += 8) rect(bg, cx - 5, yy, 10, 2, P.stoneD), rect(bg, cx - 1, yy + 3, 2, 3, ruined ? P.ink : P.lit);
  rect(bg, cx, 1, 1, 9, P.inkSoft); px(bg, cx, 1, P.red);
  if (ruined) { rect(bg, cx - 5, 10, 10, Math.round(h * 0.35), P.ink); rect(bg, cx - 9, h - 6, 18, 6, P.stoneD); ellipse(bg, cx + 6, h - 3, 6, 3, P.silverD); }
  g.drawImage(outline(b), x - 1, y - 1);
}

function field(g, x, y, w, h, ruined, r) {
  rect(g, x, y + 3, w, h - 3, P.sand);
  for (let i = 0; i < w * h * 0.08; i++) px(g, x + Math.floor(r() * w), y + 3 + Math.floor(r() * (h - 3)), r() < 0.5 ? P.sandD : P.sandL);
  for (let fx = x; fx < x + w; fx += 4) { rect(g, fx, y, 1, 5, P.brownD); rect(g, fx, y + 1, 4, 1, P.brownL); }
  for (let i = 0; i < 5; i++) { const px0 = x + 8 + i * Math.floor((w - 16) / 5), py0 = y + 10 + (i % 2) * 12; rect(g, px0, py0, 3, 6, P.ink); rect(g, px0 + 1, py0 + 1, 1, 4, P.stoneL); }
  if (ruined) {
    for (let i = 0; i < 3; i++) { const cx = x + 10 + Math.floor(r() * (w - 20)), cy = y + 12 + Math.floor(r() * (h - 18)); ellipse(g, cx, cy, 6, 3, P.scorch); ellipse(g, cx, cy, 3, 2, P.ink); }
    const m = paintMech('trainer');
    g.save(); g.translate(x + w - 18, y + h - 10); g.rotate(-Math.PI / 2); g.drawImage(m, -14, -14, 28, 28); g.restore();
  } else {
    const m = paintMech('scout');
    g.drawImage(flipH(m), x + w - 26, y + 2, 24, 24);
  }
}

function person(g, hs, ruined, getSprite) {
  const spr = getSprite(hs.sprite);
  if (!spr) return;
  const x = Math.round(hs.x * 320), y = Math.round(hs.y * 180);
  ellipse(g, x + 6, y + 17, 6, 2, ruined ? P.ink : P.roadD);
  g.drawImage(spr, x - 2, y - 2, 16, 16 * (spr.height / spr.width) | 0);
}

function paintCity(city, ruined, getSprite) {
  const [c, g] = mk(320, 180);
  const r = rng(ruined ? 911 : 119);
  if (ruined) { vgrad(g, 0, 0, 320, 110, [P.night, P.purpleD, P.redD, P.ember]); stars(g, 25, 2, 50); }
  else { vgrad(g, 0, 0, 320, 110, [P.blueL, P.silverL, P.wallL, P.sandL]); glow(g, 250, 30, 26, P.white, 0.35); }
  hills(g, 52, 5, ruined ? P.inkSoft : P.purpleD, 41);
  hills(g, 64, 4, ruined ? P.ink : P.tealD, 43);
  hills(g, 76, 3, ruined ? P.scorch : P.leafD, 47);
  vgrad(g, 0, 82, 320, 98, ruined ? [P.scorchL, P.scorch, P.ink] : [P.grassL, P.grass, P.grassD]);
  // Streets.
  g.fillStyle = ruined ? P.stoneD : P.roadL; g.beginPath(); g.moveTo(150, 82); g.lineTo(170, 82); g.lineTo(230, 180); g.lineTo(90, 180); g.fill();
  rect(g, 0, 128, 320, 10, ruined ? P.stoneD : P.road); rect(g, 0, 128, 320, 1, ruined ? P.stone : P.roadL);
  ditherRect(g, 0, 137, 320, 2, ruined ? P.stoneD : P.road, P.roadD, 0.5);
  // Points of interest back to front.
  const order = city.hotspots.slice().sort((a, b) => (a.y + a.h) - (b.y + b.h));
  for (const hs of order) {
    const x = Math.round(hs.x * 320), y = Math.round(hs.y * 180), w = Math.round(hs.w * 320), h = Math.round(hs.h * 180);
    if (hs.kind === 'person') person(g, hs, ruined, getSprite);
    else if (hs.kind === 'citadel') citadel(g, x, y, w, h, ruined, r);
    else if (hs.kind === 'tower') tower(g, x, y, w, h, ruined);
    else if (hs.kind === 'field') field(g, x, y, w, h, ruined, r);
    else building(g, x, y, w, h, hs.kind, ruined && !['hospital', 'lounge', 'shop', 'shop2'].includes(hs.kind), r);
  }
  if (ruined) {
    for (const [sx, sy, seed] of [[150, 40, 1], [60, 60, 2], [270, 20, 3], [290, 100, 4]]) smoke(g, sx, sy, seed);
    for (let i = 0; i < 40; i++) px(g, Math.floor(r() * 320), 20 + Math.floor(r() * 120), r() < 0.5 ? P.fire : P.ember);
    const h = paintMech('hunter');
    g.drawImage(h, 236, 6, 30, 30);
  }
  return c;
}

function paintCities(reg, cities, getSprite) {
  for (const city of Object.values(cities)) {
    reg(city.art.intact, paintCity(city, false, getSprite));
    reg(city.art.ruined, paintCity(city, true, getSprite));
  }
}

// ---- card art (24x24 icons) -----------------------------------------------------------
function paintCardArt(reg) {
  const icon = (key, fn) => { const [c, g] = mk(24, 24); fn(g); reg(key, outline(c)); };
  icon('card.laser', g => { rect(g, 2, 15, 7, 5, P.silverD); rect(g, 9, 16, 13, 2, P.ember); rect(g, 9, 17, 13, 1, P.fire); glow(g, 21, 17, 3, P.fire, 0.9); });
  icon('card.gun', g => { rect(g, 3, 9, 12, 5, P.inkSoft); rect(g, 15, 10, 6, 2, P.silverD); for (let i = 0; i < 3; i++) rect(g, 6 + i * 4, 16, 2, 4, P.amber); });
  icon('card.missile', g => { rect(g, 6, 9, 12, 4, P.silver); g.fillStyle = P.red; g.beginPath(); g.moveTo(18, 8); g.lineTo(22, 11); g.lineTo(18, 14); g.fill(); rect(g, 3, 9, 3, 4, P.fire); rect(g, 6, 15, 10, 3, P.silverD); });
  icon('card.fist', g => { rect(g, 6, 7, 12, 10, P.silver); for (let i = 0; i < 4; i++) rect(g, 6 + i * 3, 6, 2, 3, P.silverL); rect(g, 8, 17, 8, 4, P.blue); });
  icon('card.boot', g => { rect(g, 8, 3, 7, 13, P.silverD); rect(g, 8, 15, 13, 5, P.silver); rect(g, 8, 20, 13, 1, P.inkSoft); });
  icon('card.move', g => { rect(g, 3, 10, 12, 4, P.teal); g.fillStyle = P.teal; g.beginPath(); g.moveTo(14, 5); g.lineTo(21, 12); g.lineTo(14, 19); g.fill(); });
  icon('card.shield', g => { g.fillStyle = P.blue; g.beginPath(); g.moveTo(5, 4); g.lineTo(19, 4); g.lineTo(19, 12); g.lineTo(12, 20); g.lineTo(5, 12); g.fill(); rect(g, 11, 6, 2, 9, P.silverL); });
  icon('card.vent', g => { for (let i = 0; i < 3; i++) for (let x = 3; x < 21; x++) px(g, x, 7 + i * 5 + Math.round(Math.sin(x / 2) * 1.5), P.neonCyan); });
  icon('card.aim', g => { for (let a = 0; a < 40; a++) px(g, 12 + Math.round(Math.cos(a / 40 * 6.283) * 8), 12 + Math.round(Math.sin(a / 40 * 6.283) * 8), P.red); rect(g, 11, 2, 2, 20, P.red); rect(g, 2, 11, 20, 2, P.red); });
  icon('card.bolt', g => { g.fillStyle = P.yellow; g.beginPath(); g.moveTo(14, 2); g.lineTo(6, 13); g.lineTo(11, 13); g.lineTo(9, 22); g.lineTo(18, 10); g.lineTo(13, 10); g.fill(); });
  icon('card.wrench', g => { g.save(); g.translate(12, 12); g.rotate(-0.8); rect(g, -2, -8, 4, 16, P.silver); rect(g, -5, -10, 10, 4, P.silver); rect(g, -2, -10, 4, 2, P.ink); g.restore(); });
}
// ---- mechs (battle sprites, 64x64, facing right) ---------------------------------
export function paintMech(kind) {
  const [c, g] = mk(64, 64);
  if (kind === 'trainer') {
    const A = P.silver, AD = P.silverD, B = P.blue, BD = P.blueD;
    rect(g, 22, 40, 8, 18, AD); rect(g, 34, 40, 8, 18, AD);        // legs
    rect(g, 20, 56, 12, 4, BD); rect(g, 32, 56, 12, 4, BD);         // feet
    rect(g, 23, 46, 6, 3, B); rect(g, 35, 46, 6, 3, B);             // knee plates
    rect(g, 18, 20, 28, 22, A); ditherRect(g, 18, 34, 28, 8, A, AD, 0.5); // torso
    rect(g, 24, 24, 16, 8, B); rect(g, 26, 26, 4, 2, P.blueL);      // chest plate
    rect(g, 26, 10, 12, 11, A); rect(g, 28, 13, 9, 4, P.glassL); rect(g, 29, 14, 3, 1, P.white); // head + canopy
    rect(g, 8, 22, 10, 8, AD); rect(g, 8, 30, 8, 12, A); rect(g, 6, 42, 10, 6, BD); // left arm + fist
    rect(g, 46, 22, 10, 8, AD); rect(g, 48, 30, 8, 10, A); rect(g, 50, 33, 13, 4, P.inkSoft); rect(g, 60, 34, 3, 2, P.ember); // laser arm
    rect(g, 18, 20, 28, 2, P.silverL);
  } else if (kind === 'scout') {
    const Y = P.yellow, YD = P.amberD;
    // Bird legs: thigh back, shin forward.
    for (const o of [0, 10]) {
      rect(g, 24 + o, 34, 6, 10, YD); rect(g, 20 + o, 44, 6, 10, Y); rect(g, 16 + o, 56, 12, 3, P.inkSoft);
    }
    ellipse(g, 32, 26, 14, 10, Y);                                    // egg body
    for (let x = 22; x < 44; x += 6) rect(g, x, 20, 3, 14, P.ink);    // training stripes
    rect(g, 12, 22, 8, 5, P.inkSoft); rect(g, 6, 23, 7, 3, P.inkSoft); // gun pods
    rect(g, 44, 22, 8, 5, P.inkSoft);
    rect(g, 20, 20, 9, 5, P.glassL); px(g, 21, 21, P.white);          // canopy (facing left)
  } else {
    const R = P.crimson, RD = P.redD;
    for (const o of [0, 12]) {
      rect(g, 22 + o, 36, 7, 9, RD); rect(g, 18 + o, 45, 7, 10, R); rect(g, 14 + o, 55, 13, 3, P.ink);
    }
    rect(g, 16, 16, 32, 20, R); ditherRect(g, 16, 28, 32, 8, R, RD, 0.5);
    rect(g, 24, 20, 16, 6, P.ink); ellipse(g, 32, 23, 4, 2, R); px(g, 32, 23, P.yellow); // wyrm emblem
    rect(g, 6, 20, 10, 6, P.ink); rect(g, 2, 21, 6, 4, RD);
    rect(g, 48, 20, 10, 6, P.ink); rect(g, 56, 21, 6, 4, RD);
    rect(g, 18, 12, 10, 6, P.ink); rect(g, 19, 13, 7, 3, P.ember);
  }
  return outline(c);
}

function paintMechs(reg) {
  reg('mech.trainer', paintMech('trainer'));
  reg('mech.scout', paintMech('scout'));
  reg('mech.hunter', paintMech('hunter'));
}

// ---- portraits (64x64) -----------------------------------------------------------
const FACES = {
  hero:        { skin: 'skin1', hair: P.hairBrown, style: 'messy', cloth: P.blue, collar: P.silverL, bg: P.blueD },
  drillmaster: { skin: 'skin3', hair: P.hairGrey, style: 'crop', cloth: P.olive, collar: P.oliveD, bg: P.inkSoft, scar: true, brow: 'stern' },
  regent:      { skin: 'skin2', hair: P.hairGrey, style: 'bun', cloth: P.blue, collar: P.silverL, bg: P.purpleD, circlet: true },
  rival:       { skin: 'skin1', hair: P.hairRed, style: 'undercut', cloth: P.brown, collar: P.brownL, bg: P.redD, grin: true },
  father:      { skin: 'skin1', hair: P.hairGrey, style: 'crop', cloth: P.blueD, collar: P.silver, bg: P.night, beard: true, medals: true },
  barkeep:     { skin: 'skin3', hair: P.hairBlack, style: 'bun', cloth: P.white, collar: P.brown, bg: P.brownD },
  medic:       { skin: 'skin1', hair: P.hairBlond, style: 'long', cloth: P.white, collar: P.teal, bg: P.tealD, glasses: true },
  mechanic:    { skin: 'skin2', hair: P.hairBlack, style: 'cap', cloth: P.orange, collar: P.brown, bg: P.inkSoft, smudge: true },
  shopkeep:    { skin: 'skin2', hair: P.hairGrey, style: 'bald', cloth: P.olive, collar: P.amber, bg: P.brownD, moustache: true },
  crewchief:   { skin: 'skin3', hair: P.hairBlack, style: 'crop', cloth: P.stoneD, collar: P.yellow, bg: P.inkSoft, goggles: true },
  soldier:     { skin: 'skin2', hair: P.hairBlack, style: 'helmet', cloth: P.blueD, collar: P.silverD, bg: P.night, helmet: P.blue },
  sentry:      { skin: 'skin1', hair: P.hairBlack, style: 'helmet', cloth: P.ink, collar: P.crimson, bg: P.redD, helmet: P.crimson, visor: true },
  cadet:       { skin: 'skin2', hair: P.hairBlond, style: 'messy', cloth: P.teal, collar: P.silverL, bg: P.tealD },
  drunk:       { skin: 'skin1', hair: P.hairBrown, style: 'messy', cloth: P.inkSoft, collar: P.stoneD, bg: P.brownD, stubble: true, sleepy: true, nose: true },
  clerk:       { skin: 'skin3', hair: P.hairBlack, style: 'crop', cloth: P.purple, collar: P.white, bg: P.night, headset: true, glasses: true },
};

function paintPortrait(f) {
  const [c, g] = mk(64, 64);
  const S = P[f.skin], SD = P[f.skin + 'D'];
  // Painted backdrop: dithered gradient and a rim light.
  vgrad(g, 0, 0, 64, 64, [f.bg, P.ink]);
  glow(g, 46, 18, 22, P.white, 0.18);
  const [fig, fg] = mk(64, 64);
  // Shoulders and collar.
  ellipse(fg, 32, 64, 26, 14, f.cloth);
  ditherRect(fg, 6, 56, 52, 8, f.cloth, P.ink, 0.25);
  rect(fg, 24, 50, 16, 6, f.collar);
  rect(fg, 27, 44, 10, 8, SD); // neck
  if (f.medals) { rect(fg, 14, 56, 3, 4, P.yellow); rect(fg, 18, 56, 3, 4, P.red); rect(fg, 22, 56, 3, 4, P.yellow); }
  // Head.
  ellipse(fg, 32, 30, 12, 15, S);
  ditherRect(fg, 20, 30, 6, 14, S, SD, 0.55); // shadow side
  ellipse(fg, 20, 31, 2, 3, SD); ellipse(fg, 44, 31, 2, 3, S); // ears
  // Hair.
  const H = f.hair;
  if (f.style === 'messy') { ellipse(fg, 32, 18, 13, 7, H); for (let x = 20; x < 46; x += 4) rect(fg, x, 21, 3, 4, H); }
  if (f.style === 'crop') { ellipse(fg, 32, 17, 12, 5, H); }
  if (f.style === 'bun') { ellipse(fg, 32, 18, 13, 7, H); ellipse(fg, 32, 9, 6, 5, H); rect(fg, 19, 20, 3, 16, H); rect(fg, 42, 20, 3, 16, H); }
  if (f.style === 'long') { ellipse(fg, 32, 18, 13, 7, H); rect(fg, 18, 20, 5, 28, H); rect(fg, 41, 20, 5, 28, H); }
  if (f.style === 'undercut') { ellipse(fg, 30, 16, 12, 6, H); rect(fg, 22, 14, 18, 6, H); rect(fg, 38, 18, 6, 6, H); }
  if (f.style === 'cap') { ellipse(fg, 32, 17, 13, 6, f.cloth); rect(fg, 30, 20, 18, 3, f.collar); }
  if (f.style === 'helmet') { ellipse(fg, 32, 19, 14, 10, f.helmet); rect(fg, 18, 22, 28, 3, P.ink); }
  if (f.circlet) { rect(fg, 21, 20, 22, 2, P.silverL); px(fg, 32, 19, P.blueL); }
  if (f.headset) { rect(fg, 18, 26, 4, 9, P.inkSoft); rect(fg, 20, 14, 24, 2, P.inkSoft); rect(fg, 22, 38, 8, 2, P.inkSoft); }
  // Face.
  const ey = 30;
  if (f.visor) { rect(fg, 22, ey - 2, 21, 5, P.ink); rect(fg, 24, ey - 1, 17, 2, P.ember); }
  else {
    const lid = f.sleepy ? 1 : 2;
    rect(fg, 25, ey, 4, lid, P.ink); rect(fg, 35, ey, 4, lid, P.ink);
    if (!f.sleepy) { px(fg, 26, ey, P.white); px(fg, 36, ey, P.white); }
    const by = f.brow === 'stern' ? ey - 3 : ey - 4;
    rect(fg, 24, by, 6, 1, f.hair === P.hairGrey ? P.silverD : P.ink); rect(fg, 34, by, 6, 1, f.hair === P.hairGrey ? P.silverD : P.ink);
    if (f.brow === 'stern') { px(fg, 29, by + 1, P.ink); px(fg, 34, by + 1, P.ink); }
  }
  if (f.glasses) { rect(fg, 23, ey - 2, 7, 5, P.silverL); rect(fg, 24, ey - 1, 5, 3, S); rect(fg, 33, ey - 2, 7, 5, P.silverL); rect(fg, 34, ey - 1, 5, 3, S); rect(fg, 25, ey, 3, 1, P.ink); rect(fg, 35, ey, 3, 1, P.ink); rect(fg, 30, ey - 1, 3, 1, P.silverL); }
  if (f.goggles) { rect(fg, 22, 18, 20, 5, P.inkSoft); rect(fg, 24, 19, 6, 3, P.glassL); rect(fg, 34, 19, 6, 3, P.glassL); }
  rect(fg, 31, ey + 3, 2, 5, SD); // nose
  if (f.nose) rect(fg, 30, ey + 6, 4, 3, P.red);
  if (f.moustache) rect(fg, 27, ey + 9, 10, 2, f.hair);
  const mouth = f.grin ? [27, ey + 11, 10, 2] : [28, ey + 11, 8, 1];
  rect(fg, ...mouth, P.redD);
  if (f.grin) rect(fg, 28, ey + 11, 8, 1, P.white);
  if (f.beard) { ellipse(fg, 32, 41, 10, 5, f.hair); rect(fg, 28, ey + 11, 8, 1, P.redD); }
  if (f.stubble) ditherRect(fg, 24, 38, 16, 6, S, SD, 0.5);
  if (f.scar) { for (let i = 0; i < 7; i++) px(fg, 38 + (i % 2), 24 + i, P.redD); }
  if (f.smudge) { rect(fg, 36, 36, 4, 2, P.inkSoft); }
  // Highlight on the lit side.
  rect(fg, 40, 24, 1, 10, P.white);
  g.drawImage(outline(fig), 0, 0);
  // Frame.
  rect(g, 0, 0, 64, 1, P.silverL); rect(g, 0, 63, 64, 1, P.ink); rect(g, 0, 0, 1, 64, P.silverL); rect(g, 63, 0, 1, 64, P.ink);
  return c;
}

function paintPortraits(reg) {
  for (const [k, f] of Object.entries(FACES)) reg(`portrait.${k}`, paintPortrait(f));
}

// ---- story-board backgrounds (320x180) -----------------------------------------------
function room(g, wall, wallD, floor, floorD, horizon = 118) {
  vgrad(g, 0, 0, 320, horizon, [wallD, wall, wall]);
  vgrad(g, 0, horizon, 320, 180 - horizon, [floor, floorD]);
  for (let x = -200; x < 520; x += 32) {
    g.strokeStyle = floorD; g.beginPath(); g.moveTo(160 + (x - 160) * 0.35, horizon); g.lineTo(x, 180); g.stroke();
  }
  rect(g, 0, horizon - 1, 320, 2, P.ink);
}
function lamp(g, x, y, col = P.lit) { rect(g, x - 6, y, 12, 3, P.inkSoft); glow(g, x, y + 12, 26, col, 0.35); rect(g, x - 4, y + 3, 8, 2, col); }
function hills(g, base, amp, col, seed, step = 4) {
  const r = rng(seed);
  let y = base;
  for (let x = 0; x < 320; x += step) {
    y += (r() - 0.5) * amp; y = Math.max(base - amp * 2, Math.min(base + amp, y));
    rect(g, x, Math.round(y), step, 180 - Math.round(y), col);
  }
}
function stars(g, n, seed, h = 120) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) px(g, Math.floor(r() * 320), Math.floor(r() * h), r() < 0.2 ? P.neonCyan : P.white);
}
function smoke(g, x, y, seed, col = P.inkSoft) {
  const r = rng(seed);
  for (let i = 0; i < 9; i++) ellipse(g, x + Math.floor((r() - 0.3) * 30) + i * 3, y - i * 9, 8 + i, 5 + i / 2, col);
}

const BG = {
  'scene.poi.training': (g) => {
    room(g, P.blueD, P.night, P.stoneD, P.inkSoft);
    rect(g, 90, 22, 140, 70, P.ink); vgrad(g, 93, 25, 134, 64, [P.tealD, P.night]);
    for (let i = 0; i < 6; i++) rect(g, 100 + i * 20, 70 - i * 6, 10, 2, P.neonCyan);
    drawText(g, 'MISSION BOARD', 120, 30, P.neonCyan);
    for (const x of [30, 110, 190, 270]) { rect(g, x - 26, 130, 52, 10, P.brownD); rect(g, x - 24, 140, 4, 24, P.ink); rect(g, x + 20, 140, 4, 24, P.ink); }
    lamp(g, 60, 0); lamp(g, 260, 0);
  },
  'scene.poi.hall': (g) => {
    room(g, P.brownL, P.brownD, P.brown, P.brownD, 124);
    for (const x of [20, 100, 220, 300]) { rect(g, x - 8, 0, 16, 124, P.wallD); ditherRect(g, x - 8, 0, 6, 124, P.wallD, P.brownD, 0.5); }
    for (const x of [50, 140, 170, 250]) { rect(g, x, 40, 22, 28, P.ink); rect(g, x + 2, 42, 18, 24, P.amberD); rect(g, x + 4, 46, 14, 2, P.yellow); }
    rect(g, 148, 96, 24, 30, P.ink); ellipse(g, 160, 92, 10, 8, P.amber); ellipse(g, 160, 92, 5, 4, P.brownD);
    glow(g, 160, 60, 50, P.lit, 0.25);
  },
  'scene.poi.barracks': (g) => {
    room(g, P.olive, P.oliveD, P.brownD, P.ink);
    rect(g, 136, 20, 48, 40, P.ink); vgrad(g, 139, 23, 42, 34, [P.night, P.nightL]); stars(g, 0, 1);
    for (let i = 0; i < 6; i++) px(g, 142 + i * 7, 26 + (i * 13) % 26, P.white);
    for (const x of [10, 70, 210, 270]) { rect(g, x, 90, 50, 8, P.silverD); rect(g, x, 98, 50, 14, P.blueD); rect(g, x, 112, 4, 30, P.ink); rect(g, x + 46, 112, 4, 30, P.ink); rect(g, x + 2, 92, 14, 6, P.white); }
  },
  'scene.poi.citadel': (g) => {
    room(g, P.stone, P.stoneD, P.stoneL, P.stoneD, 128);
    for (let i = 0; i < 4; i++) { const x = 40 + i * 80; glow(g, x, 40, 30, P.white, 0.25); rect(g, x - 10, 10, 20, 60, P.ink); vgrad(g, x - 8, 12, 16, 56, [P.blueL, P.silverL]); }
    for (const x of [0, 80, 160, 240, 316]) rect(g, x, 0, 6, 128, P.stoneD);
    for (const x of [110, 196]) { rect(g, x, 20, 14, 70, P.blue); rect(g, x + 4, 40, 6, 10, P.silverL); }
    rect(g, 136, 100, 48, 30, P.blueD); rect(g, 144, 80, 32, 24, P.silver);
  },
  'scene.poi.comms': (g) => {
    room(g, P.nightL, P.night, P.inkSoft, P.ink);
    for (let x = 10; x < 320; x += 52) { rect(g, x, 50, 44, 60, P.ink); vgrad(g, x + 3, 53, 38, 30, [P.tealD, P.night]); for (let j = 0; j < 4; j++) rect(g, x + 6, 58 + j * 6, 10 + ((x + j * 7) % 22), 2, P.neonCyan); rect(g, x + 4, 90, 36, 4, P.stoneD); }
    ellipse(g, 160, 20, 60, 14, P.silverD); ellipse(g, 160, 18, 50, 10, P.silver);
  },
  'scene.poi.hospital': (g) => {
    room(g, P.wallL, P.wall, P.tealD, P.ink);
    for (let x = 0; x < 320; x += 10) rect(g, x, 60, 1, 58, P.silver);
    for (const x of [40, 170]) { rect(g, x, 110, 90, 10, P.white); rect(g, x, 120, 90, 6, P.silverD); rect(g, x + 4, 102, 20, 8, P.white); }
    rect(g, 286, 40, 20, 50, P.silver); rect(g, 293, 48, 6, 18, P.red); rect(g, 288, 54, 16, 6, P.red);
    lamp(g, 100, 0, P.white); lamp(g, 230, 0, P.white);
  },
  'scene.poi.arms': (g) => {
    room(g, P.brownL, P.brownD, P.brown, P.brownD);
    for (let y = 20; y < 100; y += 26) { rect(g, 20, y + 18, 280, 4, P.brownD); for (let x = 30; x < 290; x += 18) { rect(g, x, y, 3, 18, P.silverL); rect(g, x - 1, y + 14, 5, 3, P.brownD); } }
    rect(g, 60, 120, 200, 24, P.brownD); rect(g, 60, 120, 200, 3, P.amber);
    lamp(g, 160, 0);
  },
  'scene.poi.outfitter': (g) => {
    room(g, P.purple, P.purpleD, P.brown, P.brownD);
    const cols = [P.red, P.blue, P.teal, P.amber, P.olive, P.silver];
    for (let i = 0; i < 12; i++) { rect(g, 20 + i * 14, 40, 12, 60, cols[i % 6]); ditherRect(g, 20 + i * 14, 40, 4, 60, cols[i % 6], P.ink, 0.3); }
    rect(g, 220, 30, 60, 90, P.brownD); vgrad(g, 224, 34, 52, 82, [P.glassL, P.glass]); g.strokeStyle = P.white; g.beginPath(); g.moveTo(230, 40); g.lineTo(270, 100); g.stroke();
  },
  'scene.poi.lounge': (g) => {
    room(g, P.brownD, P.ink, P.redD, P.ink, 112);
    rect(g, 0, 70, 320, 40, P.brown); rect(g, 0, 68, 320, 4, P.amber);
    for (let x = 20; x < 300; x += 12) rect(g, x, 30 + (x % 3) * 2, 6, 14 - (x % 3) * 2, [P.teal, P.amber, P.red, P.olive][x % 4]);
    rect(g, 0, 46, 320, 3, P.brownD);
    for (const x of [60, 160, 260]) lamp(g, x, 0, P.amber);
    ellipse(g, 240, 150, 40, 10, P.brownD);
  },
  'scene.poi.garage': (g) => {
    room(g, P.stoneD, P.inkSoft, P.stoneD, P.ink, 130);
    for (let x = 0; x < 320; x += 40) rect(g, x, 0, 4, 130, P.ink);
    const m = paintMech('trainer');
    g.drawImage(m, 120, 6, 112, 112);
    for (const x of [100, 250]) { rect(g, x, 0, 1, 60, P.silverD); rect(g, x - 3, 60, 7, 4, P.yellow); }
    for (let i = 0; i < 10; i++) px(g, 196 + (i * 7) % 20, 60 + (i * 5) % 14, P.fire);
    for (let x = 0; x < 320; x += 16) rect(g, x, 128, 8, 3, P.yellow);
  },
  'scene.poi.field': (g) => {
    vgrad(g, 0, 0, 320, 100, [P.blueL, P.silverL, P.wallL]);
    hills(g, 86, 6, P.leafD, 3); hills(g, 96, 4, P.leaf, 5);
    vgrad(g, 0, 104, 320, 76, [P.sandL, P.sand, P.sandD]);
    for (let i = 0; i < 7; i++) { const x = 20 + i * 46, s = 1 + (i % 3) * 0.3; rect(g, x, 110 - 10 * s, 6 * s, 20 * s, P.stoneL); rect(g, x, 110 - 10 * s, 6 * s, 2, P.white); }
    rect(g, 250, 60, 50, 30, P.ink); rect(g, 252, 62, 46, 26, P.inkSoft); drawText(g, 'CADETS', 264, 70, P.lit);
    for (let x = 0; x < 320; x += 6) rect(g, x, 100, 2, 8, P.brownD);
  },
  'scene.story.dream': (g) => {
    vgrad(g, 0, 0, 320, 180, [P.night, P.purpleD, P.neonViolet, P.neonPink, P.ember]);
    stars(g, 60, 9, 70);
    vgrad(g, 0, 130, 320, 50, [P.ember, P.fire, P.red]);
    g.strokeStyle = P.neonCyan;
    for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(0, 118 + i * 4); g.quadraticCurveTo(160, 96 + i * 4, 320, 118 + i * 4); g.stroke(); }
    for (let x = 20; x < 320; x += 40) rect(g, x, 110 - Math.round(Math.sin((x / 320) * Math.PI) * 18), 2, 40, P.neonCyan);
    for (const [x, d] of [[60, 1], [250, -1], [280, -1]]) { g.strokeStyle = P.ink; g.lineWidth = 6; g.beginPath(); g.moveTo(x, 180); g.quadraticCurveTo(x + d * 30, 110, x + d * 10, 70); g.stroke(); g.lineWidth = 1; ellipse(g, x + d * 10, 68, 8, 5, P.crimson); px(g, x + d * 14, 66, P.yellow); }
  },
  'scene.story.raid': (g) => {
    vgrad(g, 0, 0, 320, 120, [P.night, P.purpleD, P.redD, P.ember]);
    stars(g, 30, 4, 50);
    for (let i = 0; i < 9; i++) { const x = 30 + i * 33, y = 10 + (i * 17) % 40; g.strokeStyle = P.fire; g.beginPath(); g.moveTo(x - 20, y - 30); g.lineTo(x, y); g.stroke(); ellipse(g, x, y, 2, 2, P.white); glow(g, x, y, 6, P.fire, 0.6); }
    hills(g, 92, 7, P.inkSoft, 8); hills(g, 110, 5, P.ink, 12);
    const h = paintMech('hunter');
    g.drawImage(h, 196, 52, 72, 72); g.drawImage(h, 120, 70, 44, 44);
    rect(g, 30, 70, 40, 40, P.ink); rect(g, 36, 60, 10, 12, P.ink); glow(g, 50, 80, 20, P.fire, 0.4);
    smoke(g, 50, 70, 3);
  },
  'scene.story.ruins': (g) => {
    vgrad(g, 0, 0, 320, 130, [P.night, P.redD, P.ember]);
    stars(g, 20, 6, 40);
    const r = rng(31);
    for (let x = 0; x < 320; x += 24) {
      const h = 30 + Math.floor(r() * 50);
      rect(g, x, 130 - h, 20, h, P.ink);
      for (let j = 0; j < 4; j++) rect(g, x + Math.floor(r() * 14), 130 - h - Math.floor(r() * 8), 4 + Math.floor(r() * 6), 8, P.night);
      if (r() < 0.5) glow(g, x + 10, 130 - h / 2, 10, P.fire, 0.5);
    }
    smoke(g, 80, 80, 1); smoke(g, 230, 70, 2);
    vgrad(g, 0, 130, 320, 50, [P.scorchL, P.scorch, P.ink]);
    for (let i = 0; i < 30; i++) rect(g, Math.floor(r() * 320), 135 + Math.floor(r() * 40), 3 + Math.floor(r() * 8), 3, P.stoneD);
  },
  'scene.story.road': (g) => {
    vgrad(g, 0, 0, 320, 110, [P.night, P.nightL, P.purpleD]);
    stars(g, 50, 13, 80);
    for (let i = 0; i < 3; i++) { rect(g, 228 + i * 8, 40 - i * 12, 2, 70, P.neonCyan); glow(g, 229 + i * 8, 40 - i * 12, 8, P.neonCyan, 0.5); }
    hills(g, 104, 4, P.ink, 21);
    g.fillStyle = P.roadD; g.beginPath(); g.moveTo(140, 108); g.lineTo(180, 108); g.lineTo(300, 180); g.lineTo(20, 180); g.fill();
    for (let y = 112; y < 180; y += 10) rect(g, 158, y, 4, 5, P.lit);
    rect(g, 40, 120, 40, 30, P.ink); rect(g, 44, 116, 16, 6, P.scorch); glow(g, 60, 136, 12, P.ember, 0.4);
  },
  'scene.poi.street': (g) => {
    vgrad(g, 0, 0, 320, 100, [P.blueL, P.silverL]);
    for (let x = 0; x < 320; x += 52) { rect(g, x, 50, 46, 60, [P.wall, P.wallD, P.brownL][x % 3]); rect(g, x - 2, 44, 50, 8, [P.blue, P.red, P.olive][x % 3]); rect(g, x + 8, 64, 10, 12, P.lit); rect(g, x + 28, 64, 10, 12, P.lit); }
    vgrad(g, 0, 110, 320, 70, [P.roadL, P.road, P.roadD]);
  },
  'scene.title': (g) => {
    vgrad(g, 0, 0, 320, 180, [P.black, P.night, P.nightL, P.purpleD]);
  },
};

function paintBackgrounds(reg) {
  for (const [key, fn] of Object.entries(BG)) {
    const [c, g] = mk(320, 180);
    fn(g);
    reg(key, c);
  }
}

// ---- entry point -----------------------------------------------------------------------
export function generateAll(reg, { cities }) {
  const made = new Map();
  const r = (k, v) => { made.set(k, v); reg(k, v); };
  paintCharacters(r);
  paintHexes(r);
  paintFigures(r);
  paintMechs(r);
  paintPortraits(r);
  paintBackgrounds(r);
  paintCardArt(r);
  paintCities(r, cities, (who) => made.get(spriteKey(who, 'down', 0)));
}
