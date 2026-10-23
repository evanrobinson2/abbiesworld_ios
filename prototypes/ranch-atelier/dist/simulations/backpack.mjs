// AW-STUDY-0046: Abbie's backpack. Game canon (Evan, 2026-10-23 15:53Z): "player inventories are backpacks, and they
// are opened fully 'half shell' style even though they need not physically match that, we can just cleave the mesh ...
// she should be able to pick from 10 different styles, and then customize 5 different facets in different ways, and one
// of the vanity badges she can earn in the game for completing quests is backpack charms." Design card and canon in
// docs/oracle/backpack/BACKPACK_STUDY.md and docs/design/GAME_CANON.md.
//
// One inventory: what she carries still lives in /simulations/inventory.mjs ('aw-inventory'); this module is how the
// backpack looks (style + five facets, 'aw-backpack'), which charms she has earned, and the 3D model and its view.
//
//   import {STYLES, FACETS, CHARMS, look, setLook, earnedCharms, earnCharm, glyph, backpackView} from './backpack.mjs';
//   const view = await backpackView(el, {items, coins, charms, dressUp: true});  view.open(); view.close();
//
// The model is a recipe, not a scan: each style is a silhouette extruded into two half shells that meet at the zip.
// "Cleaving" the mesh is literal: every vertex of a shell is clamped to the cut plane, so each half has a flat inside
// that takes the lining. The front half hinges on the bottom edge and swings down 180 degrees, so both insides face
// you like an open clamshell. Parts and materials are named by what they are (fabric, lining, trim, metal, glass).
// Three.js loads only when a backpack is first drawn, so pages that just show the glyph pay nothing.

const STORE = 'aw-backpack', EVENT = 'aw-backpack-change';

// ---------- the five facets ----------
export const FACETS = [
 {id: 'colour', name: 'Colour', options: [
  {id: 'berry', name: 'Berry', c: '#e0457b'}, {id: 'sunflower', name: 'Sunflower', c: '#f2b33d'}, {id: 'sky', name: 'Sky', c: '#4aa3df'},
  {id: 'meadow', name: 'Meadow', c: '#58b25a'}, {id: 'grape', name: 'Grape', c: '#8c5bc7'}, {id: 'tomato', name: 'Tomato', c: '#e2533b'},
  {id: 'cocoa', name: 'Cocoa', c: '#8a5a3c'}, {id: 'snow', name: 'Snow', c: '#f1ede3'}, {id: 'midnight', name: 'Midnight', c: '#2e3760'},
  {id: 'mint', name: 'Mint', c: '#6fd3bf'}]},
 {id: 'pattern', name: 'Pattern', options: [
  {id: 'plain', name: 'Plain'}, {id: 'stripes', name: 'Stripes'}, {id: 'dots', name: 'Polka dots'}, {id: 'gingham', name: 'Gingham'},
  {id: 'stars', name: 'Stars'}, {id: 'hearts', name: 'Hearts'}]},
 {id: 'pocket', name: 'Pocket', options: [
  {id: 'round', name: 'Round pocket'}, {id: 'square', name: 'Square pocket'}, {id: 'heart', name: 'Heart pocket'},
  {id: 'star', name: 'Star pocket'}, {id: 'none', name: 'No pocket'}]},
 {id: 'trim', name: 'Straps', options: [
  {id: 'cream-brass', name: 'Cream and brass', strap: '#f3e6c8', metal: '#c99a3c'}, {id: 'navy-silver', name: 'Navy and silver', strap: '#24345e', metal: '#c9d1dc'},
  {id: 'pink-gold', name: 'Pink and gold', strap: '#f59bbd', metal: '#e8b84a'}, {id: 'leaf-wood', name: 'Leaf and wood', strap: '#3f8f4e', metal: '#a8743f'},
  {id: 'rainbow', name: 'Rainbow', strap: '#ff7a59', metal: '#ffd23f', rainbow: true}, {id: 'black-chrome', name: 'Black and chrome', strap: '#262a30', metal: '#dfe5ec'}]},
 {id: 'lining', name: 'Lining', options: [
  {id: 'lemon', name: 'Lemon', c: '#ffe98a'}, {id: 'lilac', name: 'Lilac', c: '#cdb6f2'}, {id: 'seaglass', name: 'Sea glass', c: '#a9e3d6'},
  {id: 'peach', name: 'Peach', c: '#ffc4a3'}, {id: 'night', name: 'Starry night', c: '#26306b', stars: true}, {id: 'rainbow', name: 'Rainbow', c: '#ffffff', rainbow: true}]}
];

// ---------- the ten styles (MJ proofs: tools/midjourney/outputs/backpack-0046/) ----------
export const STYLES = [
 {id: 'classic', name: 'Classic', line: 'The school backpack: a big round pocket and two zips.', cloth: 'fabric', look: {colour: 'berry', pattern: 'plain', pocket: 'round', trim: 'cream-brass', lining: 'lemon'}},
 {id: 'explorer', name: 'Explorer', line: 'A hiking rucksack with a bedroll on top and a bottle at the side.', cloth: 'canvas', look: {colour: 'meadow', pattern: 'plain', pocket: 'square', trim: 'leaf-wood', lining: 'peach'}},
 {id: 'bubble', name: 'Astronaut', line: 'A round bubble pack with a porthole and an antenna, for the Moon.', cloth: 'vinyl', look: {colour: 'snow', pattern: 'plain', pocket: 'none', trim: 'navy-silver', lining: 'night'}},
 {id: 'bunny', name: 'Bunny', line: 'Soft floppy ears and a sleepy face on the front.', cloth: 'plush', look: {colour: 'snow', pattern: 'plain', pocket: 'heart', trim: 'pink-gold', lining: 'lilac'}},
 {id: 'saddlebag', name: 'Saddlebag', line: 'Ranch leather with a stitched flap and two brass buckles.', cloth: 'leather', look: {colour: 'cocoa', pattern: 'plain', pocket: 'square', trim: 'cream-brass', lining: 'seaglass'}},
 {id: 'turtle', name: 'Turtle shell', line: 'A dome of hexagon plates. It already opens like a shell.', cloth: 'vinyl', look: {colour: 'meadow', pattern: 'plain', pocket: 'none', trim: 'leaf-wood', lining: 'lemon'}},
 {id: 'rolltop', name: 'Roll-top', line: 'A tall bucket with the top rolled down and a big clip.', cloth: 'canvas', look: {colour: 'tomato', pattern: 'plain', pocket: 'square', trim: 'black-chrome', lining: 'seaglass'}},
 {id: 'retro', name: 'Retro', line: 'Chunky 1980s colour blocks, the way young Daddy wore them.', cloth: 'vinyl', look: {colour: 'sky', pattern: 'plain', pocket: 'round', trim: 'rainbow', lining: 'rainbow'}},
 {id: 'wicker', name: 'Wicker', line: 'A woven basket on leather straps, with a flower.', cloth: 'wicker', look: {colour: 'sunflower', pattern: 'plain', pocket: 'none', trim: 'leaf-wood', lining: 'peach'}},
 {id: 'rocket', name: 'Rocket', line: 'A little rocket with fins, a window and a nose cone.', cloth: 'vinyl', look: {colour: 'tomato', pattern: 'plain', pocket: 'none', trim: 'navy-silver', lining: 'night'}}
];

// ---------- charms: vanity badges, one for each quest she completes ----------
// Earned from what she has already done (gold coins are Daddy's core memories, memory-coins.mjs; items are in
// inventory.mjs), so a charm appears even for quests finished before the backpack existed. Quests that have no
// signal yet call earnCharm(id) when they finish.
export const CORE_MEMORIES = 11; // Grace's basement 10 + the school roof 1, so far
export const CHARMS = [
 {id: 'first-memory', name: 'Gold coin', icon: '🪙', quest: "Find one of Daddy's core memories", when: s => s.coins >= 1},
 {id: 'basement', name: 'Floppy disk', icon: '💾', quest: "Find all ten memories in Grace's basement", when: s => s.places["Grace's basement"] >= 10},
 {id: 'school-roof', name: 'Star', icon: '⭐', quest: 'Find the memory on the school roof', when: s => Object.keys(s.places).some(p => /school/i.test(p) && s.places[p] > 0)},
 {id: 'brass-key', name: 'Brass key', icon: '🗝️', quest: "Find the café's secret key", when: s => s.items.includes('cafe-basement-key')},
 {id: 'moon-key', name: 'Moon', icon: '🌙', quest: 'Earn the key to the Moon base', when: s => s.items.some(i => /moon/i.test(i))},
 {id: 'all-memories', name: 'Heart', icon: '💛', quest: "Find every one of Daddy's core memories", when: s => s.coins >= CORE_MEMORIES},
 {id: 'bub', name: 'Bone', icon: '🦴', quest: 'Play fetch with bub'},
 {id: 'barista', name: 'Coffee cup', icon: '☕', quest: 'Serve your first coffee in the café'},
 {id: 'rocket', name: 'Rocket', icon: '🚀', quest: 'Finish the Moon Mission'}
];

// ---------- saved look and charms ----------
const readJSON = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? f; } catch { return f; } };
function saved() { const v = readJSON(STORE, {}); return v && typeof v === 'object' ? v : {}; }
function save(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {} dispatchEvent(new CustomEvent(EVENT, {detail: v})); }
export const styleOf = id => STYLES.find(s => s.id === id) || STYLES[0];
export const option = (facet, id) => { const f = FACETS.find(x => x.id === facet); return f.options.find(o => o.id === id) || f.options[0]; };
// The whole look: {style, colour, pattern, pocket, trim, lining}. A style brings its own facets until she changes them.
export function look(v = saved()) {
 const st = styleOf(v.style), out = {style: st.id};
 for (const f of FACETS) out[f.id] = option(f.id, v[f.id] ?? st.look[f.id]).id;
 return out;
}
export function setLook(patch) {
 const v = saved(), next = {...v, ...patch};
 if (patch.style && patch.style !== v.style) for (const f of FACETS) if (!(f.id in patch)) next[f.id] = styleOf(patch.style).look[f.id];
 save(next); return look(next);
}
export const onLook = fn => { const h = () => fn(look()); addEventListener(EVENT, h); return () => removeEventListener(EVENT, h); };

function progress() {
 const s = {coins: 0, places: {}, items: (readJSON('aw-inventory', []) || []).map(i => i.id)};
 const mine = readJSON('aw-memory-coins', {}) || {};
 for (const id in mine) { s.places[mine[id].place] = (s.places[mine[id].place] || 0) + 1; }
 const legacy = readJSON('aw-basement-coins', []) || [];
 for (const id of legacy) if (!mine[`Grace's basement:${id}`]) s.places["Grace's basement"] = (s.places["Grace's basement"] || 0) + 1;
 s.coins = Object.values(s.places).reduce((a, b) => a + b, 0);
 return s;
}
export function earnedCharms() {
 const s = progress(), given = saved().charms || {};
 return CHARMS.filter(c => given[c.id] || (c.when && c.when(s))).map(c => c.id);
}
export const coinCount = () => progress().coins;
export function earnCharm(id) {
 if (!CHARMS.some(c => c.id === id)) return false;
 const v = saved(); v.charms = {...(v.charms || {})}; if (v.charms[id]) return false;
 v.charms[id] = new Date().toISOString(); save(v); return true;
}
// Charms she has earned but not yet seen arrive: returns them once, then remembers they were seen.
export function newCharms() {
 const v = saved(), seen = new Set(v.seen || []), earned = earnedCharms(), fresh = earned.filter(id => !seen.has(id));
 if (fresh.length) { v.seen = [...seen, ...fresh]; try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {} }
 return fresh.map(id => CHARMS.find(c => c.id === id));
}

// A small flat backpack for the chronograph register, in her colours.
export function glyph(l = look()) {
 const c = option('colour', l.colour).c, t = option('trim', l.trim), lin = option('lining', l.lining).c;
 return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.2a3 3 0 0 1 6 0" fill="none" stroke="${t.strap}" stroke-width="1.8" stroke-linecap="round"/>` +
  `<path d="M5.2 10.4a6.8 6.8 0 0 1 13.6 0v8.4a2.4 2.4 0 0 1-2.4 2.4H7.6a2.4 2.4 0 0 1-2.4-2.4z" fill="${c}" stroke="#2b1d0e" stroke-opacity=".55" stroke-width="1.2"/>` +
  `<path d="M5.4 11.4h13.2" stroke="${lin}" stroke-width="1.4"/>` +
  `<rect x="8.2" y="14" width="7.6" height="5" rx="2" fill="#000" fill-opacity=".14"/><circle cx="12" cy="11.4" r="1" fill="${t.metal}"/></svg>`;
}

// ---------- the model ----------
let T = null;
export async function three() { return T ??= await import(new URL('../vendor/three.module.js', import.meta.url).href); }

const texCache = new Map();
function patternTexture(base, pattern, accent, cloth) {
 const key = [base, pattern, accent, cloth].join('|');
 if (texCache.has(key)) return texCache.get(key);
 const N = 256, cv = Object.assign(document.createElement('canvas'), {width: N, height: N}), g = cv.getContext('2d');
 g.fillStyle = base; g.fillRect(0, 0, N, N);
 g.fillStyle = accent; g.strokeStyle = accent;
 if (cloth === 'wicker') {
  for (let y = 0; y < N; y += 32) for (let x = 0; x < N; x += 32) {
   const h = ((x + y) / 32) % 2;
   g.fillStyle = h ? 'rgba(255,240,200,.35)' : 'rgba(80,40,10,.28)'; g.fillRect(x + 2, y + 2, 28, 28);
   g.fillStyle = 'rgba(60,30,5,.35)';
   for (let k = 0; k < 4; k++) h ? g.fillRect(x + 2 + k * 7, y + 2, 2, 28) : g.fillRect(x + 2, y + 2 + k * 7, 28, 2);
  }
 } else if (pattern === 'stripes') { g.lineWidth = 22; for (let i = -N; i < N * 2; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + N, N); g.stroke(); } }
 else if (pattern === 'dots') { for (let y = 0; y < N; y += 64) for (let x = 0; x < N; x += 64) for (const o of [0, 32]) { g.beginPath(); g.arc(x + 16 + o, y + 16 + o, 10, 0, 7); g.fill(); } }
 else if (pattern === 'gingham') { g.globalAlpha = .45; for (let i = 0; i < N; i += 64) { g.fillRect(i, 0, 32, N); g.fillRect(0, i, N, 32); } g.globalAlpha = 1; }
 else if (pattern === 'stars' || pattern === 'hearts') {
  for (let y = 0; y < N; y += 64) for (let x = 0; x < N; x += 64) { const cx = x + 32 + (y / 64 % 2) * 16 - 8, cy = y + 32; pattern === 'stars' ? star2d(g, cx, cy, 13, 5.5) : heart2d(g, cx, cy, 12); }
 }
 // Fabric grain: a fine weave so cloth reads as cloth, and the same canvas drives the bump.
 if (cloth !== 'vinyl' && cloth !== 'leather') { g.globalAlpha = .07; g.fillStyle = '#000'; for (let i = 0; i < N; i += 4) { g.fillRect(i, 0, 1, N); g.fillRect(0, i + 2, N, 1); } g.globalAlpha = 1; }
 if (cloth === 'leather') { g.globalAlpha = .08; for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < .5 ? '#000' : '#fff'; g.fillRect(Math.random() * N, Math.random() * N, 2, 2); } g.globalAlpha = 1; }
 const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2.6, 2.6); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
 texCache.set(key, t); return t;
}
function star2d(g, cx, cy, r, ri) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function heart2d(g, cx, cy, s) { g.beginPath(); g.moveTo(cx, cy + s * .9); g.bezierCurveTo(cx - s * 1.4, cy - s * .1, cx - s * .6, cy - s * 1.1, cx, cy - s * .35); g.bezierCurveTo(cx + s * .6, cy - s * 1.1, cx + s * 1.4, cy - s * .1, cx, cy + s * .9); g.fill(); }
function liningTexture(o) {
 const key = 'lining|' + o.id; if (texCache.has(key)) return texCache.get(key);
 const N = 128, cv = Object.assign(document.createElement('canvas'), {width: N, height: N}), g = cv.getContext('2d');
 g.fillStyle = o.c; g.fillRect(0, 0, N, N);
 if (o.rainbow) ['#ff6b6b', '#ffb347', '#ffe066', '#7bd389', '#5fb7ff', '#a98bff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * N / 6, N, N / 6 + 1); });
 if (o.stars) { g.fillStyle = '#ffe9a8'; for (let i = 0; i < 14; i++) star2d(g, (i * 37) % N, (i * 53) % N, 4, 1.8); }
 g.globalAlpha = .06; g.fillStyle = '#000'; for (let i = 0; i < N; i += 3) g.fillRect(0, i, N, 1); g.globalAlpha = 1;
 const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1.4, 1.4); t.colorSpace = T.SRGBColorSpace;
 texCache.set(key, t); return t;
}

const shade = (hex, k) => { const c = new T.Color(hex); const h = {}; c.getHSL(h); return c.setHSL(h.h, Math.min(1, h.s * (k < 0 ? 1.05 : .92)), Math.max(0, Math.min(1, h.l + k))); };
function materials(l, st) {
 const col = option('colour', l.colour).c, trim = option('trim', l.trim), lin = option('lining', l.lining);
 const cloth = st.cloth, light = new T.Color(col).getHSL({}).l > .7;
 const accent = l.pattern === 'plain' ? col : (light ? trim.strap : '#fff6e2');
 const map = patternTexture(col, cloth === 'wicker' ? 'plain' : l.pattern, accent, cloth);
 const rough = {fabric: .88, canvas: .92, plush: 1, leather: .6, vinyl: .42, wicker: .85}[cloth] ?? .85;
 const M = (name, o) => Object.assign(new T.MeshStandardMaterial({flatShading: true, ...o}), {name});
 return {
  fabric: M(`fabric ${cloth}`, {color: '#ffffff', map, bumpMap: map, bumpScale: cloth === 'vinyl' ? .2 : 1.2, roughness: rough, metalness: 0}),
  pocket: M('fabric pocket', {color: shade(col, -.07), roughness: rough, map: l.pattern === 'plain' ? null : map}),
  trim: M('trim strap', {color: trim.strap, roughness: .7}),
  trim2: M('trim strap', {color: trim.rainbow ? '#5fb7ff' : shade(trim.strap, -.08), roughness: .7}),
  metal: M('metal hardware', {color: trim.metal, roughness: .3, metalness: .75}),
  lining: M('lining', {color: '#ffffff', map: liningTexture(lin), roughness: .95, side: T.DoubleSide, emissive: lin.c, emissiveIntensity: .12}),
  dark: M('ink dark', {color: '#2a2230', roughness: .5}),
  white: M('paint white', {color: '#fbf7ee', roughness: .6}),
  pink: M('felt pink', {color: '#f6a3bf', roughness: .95}),
  glass: M('glass porthole', {color: '#9fd8ff', roughness: .08, metalness: .1, transparent: true, opacity: .72, emissive: '#1d4d7a', emissiveIntensity: .25}),
  leaf: M('leaf green', {color: '#4f9a45', roughness: .8}),
  gold: M('metal gold', {color: '#ffcc33', roughness: .28, metalness: .8, emissive: '#5a3c00', emissiveIntensity: .25}),
  neon1: M('vinyl neon pink', {color: '#ff4fa3', roughness: .4}), neon2: M('vinyl neon yellow', {color: '#ffe23f', roughness: .4}),
  red: M('paint red', {color: '#e2533b', roughness: .5})
 };
}

// Silhouettes: x across, y up from the bottom edge (the hinge), in metres-ish (a backpack is about 1 tall here).
function rr(w, h, rt, rb, x0 = -w / 2) {
 const s = new T.Shape(), x1 = x0 + w;
 s.moveTo(x0 + rb, 0); s.lineTo(x1 - rb, 0); s.quadraticCurveTo(x1, 0, x1, rb); s.lineTo(x1, h - rt); s.quadraticCurveTo(x1, h, x1 - rt, h);
 s.lineTo(x0 + rt, h); s.quadraticCurveTo(x0, h, x0, h - rt); s.lineTo(x0, rb); s.quadraticCurveTo(x0, 0, x0 + rb, 0); return s;
}
const SIL = {
 classic: () => rr(.78, 1, .32, .12), explorer: () => rr(.74, .98, .16, .1), bunny: () => rr(.78, .9, .36, .16), saddlebag: () => rr(.82, .9, .1, .14),
 turtle: () => rr(.88, .86, .44, .2), rolltop: () => rr(.7, 1.02, .08, .12), retro: () => rr(.8, .98, .18, .16),
 bubble: () => { const s = new T.Shape(); s.absellipse(0, .47, .44, .47, 0, Math.PI * 2, false, 0); return s; },
 wicker: () => { const s = new T.Shape(); s.moveTo(-.28, 0); s.lineTo(.28, 0); s.quadraticCurveTo(.34, 0, .35, .06); s.lineTo(.42, .84); s.quadraticCurveTo(.43, .9, .37, .9); s.lineTo(-.37, .9); s.quadraticCurveTo(-.43, .9, -.42, .84); s.lineTo(-.35, .06); s.quadraticCurveTo(-.34, 0, -.28, 0); return s; },
 rocket: () => { const s = new T.Shape(); s.moveTo(-.29, 0); s.lineTo(.29, 0); s.lineTo(.32, .6); s.quadraticCurveTo(.31, .96, 0, 1.14); s.quadraticCurveTo(-.31, .96, -.32, .6); s.lineTo(-.29, 0); return s; }
};
const DEPTH = {turtle: .26, bubble: .22, wicker: .2, saddlebag: .17}; // depth of each half
const PUFF = {turtle: .9, bubble: .55, bunny: .35, classic: .3, retro: .2, rocket: .35, explorer: .2, rolltop: .15, saddlebag: .1, wicker: .05};

function pocketShape(id, w) {
 if (id === 'round') { const s = new T.Shape(); s.absellipse(0, 0, w * .32, w * .26, 0, Math.PI * 2); return s; }
 if (id === 'square') return rr(w * .56, w * .4, .05, .07, -w * .28);
 const s = new T.Shape(), k = w * .3;
 if (id === 'heart') { s.moveTo(0, -k * .9); s.bezierCurveTo(-k * 1.5, k * .1, -k * .7, k * 1.2, 0, k * .45); s.bezierCurveTo(k * .7, k * 1.2, k * 1.5, k * .1, 0, -k * .9); return s; }
 for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? k * .48 : k * 1.05; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
 return s;
}

function charmMesh(id, m) {
 const g = new T.Group(); g.name = `charm ${id}`;
 const add = (geo, mat, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); return o; };
 const ext = (shape, d, mat) => { const geo = new T.ExtrudeGeometry(shape, {depth: d, bevelEnabled: true, bevelThickness: .005, bevelSize: .005, bevelSegments: 1, curveSegments: 4}); geo.center(); return add(geo, mat); };
 const M = (c, o = {}) => new T.MeshStandardMaterial({color: c, flatShading: true, roughness: .4, ...o});
 const gold = m.gold;
 if (id === 'first-memory') { const c = add(new T.CylinderGeometry(.055, .055, .014, 10), gold); c.rotation.x = Math.PI / 2; const h = new T.Shape(); heartShape(h, .022); const e = ext(h, .004, M('#fff1b0', {metalness: .6})); e.position.z = .009; }
 else if (id === 'basement') { add(new T.BoxGeometry(.1, .1, .012), M('#3b5bd9')); add(new T.BoxGeometry(.05, .032, .014), M('#d9dde4', {metalness: .7}), .005, .032, 0); add(new T.BoxGeometry(.07, .04, .014), M('#fbf7ee'), 0, -.024, 0); }
 else if (id === 'school-roof') { const s = new T.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .026 : .06; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ext(s, .014, M('#ffd23f', {emissive: '#6a4b00', emissiveIntensity: .3})); }
 else if (id === 'brass-key') { const r = add(new T.TorusGeometry(.024, .008, 4, 10), gold); r.position.y = .03; add(new T.BoxGeometry(.012, .07, .01), gold, 0, -.02, 0); add(new T.BoxGeometry(.022, .01, .01), gold, .012, -.045, 0); add(new T.BoxGeometry(.016, .01, .01), gold, .01, -.028, 0); }
 else if (id === 'moon-key') { const s = new T.Shape(); s.absarc(0, 0, .055, Math.PI * .3, Math.PI * 1.7, false); s.absarc(.025, 0, .044, Math.PI * 1.55, Math.PI * .45, true); ext(s, .016, M('#fff3b8', {emissive: '#5c5220', emissiveIntensity: .25})); }
 else if (id === 'all-memories') { const h = new T.Shape(); heartShape(h, .05); ext(h, .02, M('#ff4f7a', {roughness: .25})); }
 else if (id === 'bub') { add(new T.BoxGeometry(.08, .022, .02), M('#f6efe0')); for (const x of [-.042, .042]) for (const y of [-.012, .012]) add(new T.IcosahedronGeometry(.016, 0), M('#f6efe0'), x, y, 0); }
 else if (id === 'barista') { add(new T.CylinderGeometry(.03, .024, .05, 8, 1), M('#fbf7ee')); add(new T.CylinderGeometry(.026, .026, .004, 8), M('#6b3a1f'), 0, .024, 0); const h = add(new T.TorusGeometry(.014, .005, 4, 8, Math.PI), M('#fbf7ee'), .03, 0, 0); h.rotation.z = -Math.PI / 2; add(new T.CylinderGeometry(.045, .045, .006, 10), M('#7fc8c2'), 0, -.028, 0); }
 else if (id === 'rocket') { add(new T.CylinderGeometry(.02, .022, .06, 8), M('#f1ede3')); add(new T.ConeGeometry(.02, .035, 8), M('#e2533b'), 0, .047, 0); for (const s of [-1, 1]) { const f = add(new T.BoxGeometry(.03, .025, .006), M('#e2533b'), s * .022, -.024, 0); f.rotation.z = s * .5; } add(new T.CylinderGeometry(.009, .009, .004, 8), M('#5fb7ff'), 0, .008, .021).rotation.x = Math.PI / 2; }
 // The jump ring and a short chain: it hangs from the pivot at the group's origin.
 const top = new T.Box3().setFromObject(g).max.y, chain = new T.Group();
 [0, 1, 2].forEach(i => { const l = new T.Mesh(new T.TorusGeometry(.009, .0028, 4, 8), m.metal); l.position.y = -i * .014; l.rotation.y = i % 2 ? Math.PI / 2 : 0; chain.add(l); });
 const body = new T.Group(); g.children.slice().forEach(c => body.add(c)); body.position.y = -.04 - top;
 const out = new T.Group(); out.name = g.name; out.add(chain, body); return out;
}
function heartShape(s, k) { s.moveTo(0, -k * .9); s.bezierCurveTo(-k * 1.5, k * .1, -k * .7, k * 1.2, 0, k * .45); s.bezierCurveTo(k * .7, k * 1.2, k * 1.5, k * .1, 0, -k * .9); }

// Build one backpack. Returns the group, both halves, the open control and the charm pendulums.
export function buildBackpack(l = look(), {charms = []} = {}) {
 const st = styleOf(l.style), m = materials(l, st), shape = SIL[st.id]();
 const half = DEPTH[st.id] ?? .15, bev = .045, puff = PUFF[st.id] ?? .2;
 const outline = shape.getSpacedPoints(80);
 const bb = new T.Box2().setFromPoints(outline), W = bb.max.x - bb.min.x, H = bb.max.y, cx = 0, cy = H / 2;
 const r2 = (x, y) => Math.min(1, (x / (W / 2)) ** 2 + ((y - cy) / (H / 2)) ** 2);
 const surfaceZ = (x, y) => half * (1 + puff * (1 - r2(x, y)));
 const halfWidthAt = y => Math.max(...outline.filter(p => Math.abs(p.y - y) < .05).map(p => Math.abs(p.x)), .1);

 const root = new T.Group(); root.name = `backpack ${st.id}`;
 const back = new T.Group(); back.name = 'half back'; const front = new T.Group(); front.name = 'half front';
 root.add(back, front);

 // The cleave: extrude, clamp every vertex behind the cut plane onto it, then puff the outside.
 const shellGeo = () => {
  const g = new T.ExtrudeGeometry(shape, {depth: half - bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .85, bevelSegments: 2, curveSegments: st.id === 'bubble' ? 22 : 5, steps: 1});
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let z = Math.max(0, p.getZ(i)); const x = p.getX(i), y = p.getY(i); z *= 1 + puff * (1 - r2(x, y)); p.setZ(i, z); }
  g.computeVertexNormals(); return g;
 };
 const geo = shellGeo();
 const fs = new T.Mesh(geo, m.fabric); fs.name = 'shell front'; front.add(fs);
 const bs = new T.Mesh(geo, m.fabric); bs.name = 'shell back'; bs.scale.z = -1; back.add(bs);
 // Lining on both cut faces, inset so a rim of fabric shows round it.
 const lg = new T.ShapeGeometry(shape, 6); lg.translate(-cx, -cy, 0); lg.scale(.86, .88, 1); lg.translate(cx, cy, 0);
 { const u = lg.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 1.6, u.getY(i) * 1.6); }
 const lf = new T.Mesh(lg, m.lining); lf.name = 'lining front'; lf.position.z = -.004; front.add(lf);
 const lb = new T.Mesh(lg, m.lining); lb.name = 'lining back'; lb.position.z = .004; back.add(lb);
 // The zip: piping round each half's rim, and a pull at the top.
 const pipe = z => { const pts = outline.map(p => new T.Vector3(p.x, p.y, z)); return new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 80, .016, 4, true); };
 front.add(Object.assign(new T.Mesh(pipe(.014), m.trim), {name: 'zip piping front'}));
 back.add(Object.assign(new T.Mesh(pipe(-.014), m.trim2), {name: 'zip piping back'}));
 for (const s of [-1, 1]) { const p = new T.Mesh(new T.BoxGeometry(.03, .06, .012), m.metal); p.name = 'zip pull'; p.position.set(s * .1, H - .045, .03); p.rotation.x = .25; front.add(p); }

 // Straps, handle and buckles on the back half.
 const tube = (pts, r, mat, name, parent) => { const o = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, r, 5, false), mat); o.name = name; parent.add(o); return o; };
 const bz = (x, y) => -surfaceZ(x, y);
 for (const s of [-1, 1]) {
  const x = s * W * .22;
  tube([new T.Vector3(x, H * .84, bz(x, H * .84) + .02), new T.Vector3(x * 1.08, H * .62, bz(x, H * .6) - .16), new T.Vector3(x * 1.15, H * .32, bz(x, H * .3) - .12), new T.Vector3(x * 1.2, H * .12, bz(x, H * .12) + .01)], .034, m.trim, 'shoulder strap', back);
  const b = new T.Mesh(new T.BoxGeometry(.07, .05, .02), m.metal); b.name = 'strap buckle'; b.position.set(x * 1.12, H * .26, bz(x, H * .26) - .1); back.add(b);
 }
 if (!['bunny', 'rocket'].includes(st.id)) tube([new T.Vector3(-.12, H - .03, -.04), new T.Vector3(-.08, H + .08, -.04), new T.Vector3(.08, H + .08, -.04), new T.Vector3(.12, H - .03, -.04)], .022, m.trim, 'top handle', back);

 // The pocket facet sits on the front.
 const py = st.id === 'saddlebag' ? H * .24 : H * .3;
 const round = ['turtle', 'bubble', 'rocket'].includes(st.id);
 if (l.pocket !== 'none' && !round) {
  const pg = new T.ExtrudeGeometry(pocketShape(l.pocket, W), {depth: .03, bevelEnabled: true, bevelThickness: .018, bevelSize: .016, bevelSegments: 2, curveSegments: l.pocket === 'round' ? 16 : 5});
  const pk = new T.Mesh(pg, m.pocket); pk.name = 'front pocket'; pk.position.set(0, py, surfaceZ(0, py) - .03); front.add(pk);
  const pp = new T.Mesh(new T.BoxGeometry(.026, .044, .01), m.metal); pp.name = 'pocket zip pull'; pp.position.set(W * .12, py + W * .12, surfaceZ(0, py) + .035); front.add(pp);
 } else if (l.pocket !== 'none') {
  // Round styles wear the pocket as a patch below the window.
  const pg = new T.ExtrudeGeometry(pocketShape(l.pocket, W * .55), {depth: .012, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1, curveSegments: 4});
  const yy = H * .2, pk = new T.Mesh(pg, m.pocket); pk.name = 'front pocket patch'; pk.position.set(0, yy, surfaceZ(0, yy) - .012); front.add(pk);
 }

 const fz = (x, y) => surfaceZ(x, y);
 const X = {
  explorer() {
   const roll = new T.Mesh(new T.CylinderGeometry(.12, .12, W * 1.05, 8), m.trim2); roll.name = 'bedroll'; roll.rotation.z = Math.PI / 2; roll.position.set(0, H + .1, -.06); back.add(roll);
   for (const s of [-1, 1]) { const b = new T.Mesh(new T.TorusGeometry(.125, .014, 4, 10), m.trim); b.name = 'bedroll strap'; b.rotation.y = Math.PI / 2; b.position.set(s * W * .3, H + .1, -.06); back.add(b); }
   const bot = new T.Mesh(new T.CylinderGeometry(.07, .07, .3, 8), m.glass); bot.name = 'water bottle'; bot.position.set(W / 2 + .05, H * .3, -.05); back.add(bot);
   const cap = new T.Mesh(new T.CylinderGeometry(.045, .05, .05, 8), m.metal); cap.name = 'bottle cap'; cap.position.set(W / 2 + .05, H * .3 + .17, -.05); back.add(cap);
   const flap = new T.Mesh(new T.ExtrudeGeometry(rr(W * .8, H * .28, .02, .12, -W * .4), {depth: .02, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1}), m.trim2); flap.name = 'top flap'; flap.position.set(0, H * .7, fz(0, H * .8) - .012); front.add(flap);
  },
  bubble() {
   const yy = H * .6, z = fz(0, yy);
   const ring = new T.Mesh(new T.TorusGeometry(.16, .035, 6, 14), m.metal); ring.name = 'porthole ring'; ring.position.set(0, yy, z - .01); front.add(ring);
   const gl = new T.Mesh(new T.SphereGeometry(.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), m.glass); gl.name = 'porthole glass'; gl.rotation.x = Math.PI / 2; gl.scale.y = .35; gl.position.set(0, yy, z - .02); front.add(gl);
   const ant = new T.Mesh(new T.CylinderGeometry(.008, .008, .22, 5), m.metal); ant.name = 'antenna'; ant.position.set(W * .22, H + .06, -.04); ant.rotation.z = -.25; back.add(ant);
   const tip = new T.Mesh(new T.IcosahedronGeometry(.035, 0), m.red); tip.name = 'antenna light'; tip.position.set(W * .22 + .03, H + .17, -.04); back.add(tip);
  },
  bunny() {
   for (const s of [-1, 1]) {
    const e = new T.Shape(); e.absellipse(0, 0, .09, .24, 0, Math.PI * 2);
    const ear = new T.Mesh(new T.ExtrudeGeometry(e, {depth: .03, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 1, curveSegments: 5}), m.fabric); ear.name = 'bunny ear';
    const inner = new T.Mesh(new T.ShapeGeometry(e, 5), m.pink); inner.name = 'inner ear'; inner.scale.set(.6, .75, 1); inner.position.z = .056; ear.add(inner);
    ear.position.set(s * .16, H + .17, -.06); ear.rotation.z = s * -.28; if (s > 0) ear.rotation.x = -.5; back.add(ear);
   }
   const yy = H * .68;
   for (const s of [-1, 1]) { const ey = new T.Mesh(new T.IcosahedronGeometry(.03, 0), m.dark); ey.name = 'eye'; ey.scale.z = .5; ey.position.set(s * .12, yy, fz(s * .12, yy)); front.add(ey);
    const ck = new T.Mesh(new T.CircleGeometry(.04, 8), m.pink); ck.name = 'cheek'; ck.position.set(s * .2, yy - .07, fz(s * .2, yy - .07) + .004); front.add(ck); }
   const n = new T.Mesh(new T.IcosahedronGeometry(.022, 0), m.pink); n.name = 'nose'; n.position.set(0, yy - .05, fz(0, yy - .05) + .01); front.add(n);
  },
  saddlebag() {
   const fh = H * .46, f = rr(W * .96, fh, .02, .16, -W * .48);
   const flap = new T.Mesh(new T.ExtrudeGeometry(f, {depth: .02, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 1, curveSegments: 4}), m.pocket); flap.name = 'leather flap'; flap.position.set(0, H - fh + .02, fz(0, H * .7) - .01); front.add(flap);
   for (const s of [-1, 1]) {
    const x = s * W * .24, st2 = new T.Mesh(new T.BoxGeometry(.06, H * .5, .012), m.trim); st2.name = 'buckle strap'; st2.position.set(x, H * .5, fz(x, H * .5) + .035); front.add(st2);
    const bk = new T.Mesh(new T.TorusGeometry(.038, .009, 4, 4), m.metal); bk.name = 'brass buckle'; bk.rotation.z = Math.PI / 4; bk.position.set(x, H * .56, fz(x, H * .56) + .045); front.add(bk);
   }
  },
  turtle() {
   const hex = new T.CylinderGeometry(.085, .095, .035, 6); hex.rotateX(Math.PI / 2);
   const plateM = m.pocket, rows = [[0, .52], [-.19, .41], [.19, .41], [-.19, .63], [.19, .63], [0, .3], [0, .74], [-.32, .52], [.32, .52]];
   for (const [x, y] of rows) { const yy = y * H / .86, z = fz(x, yy); const p = new T.Mesh(hex, plateM); p.name = 'shell plate'; p.position.set(x, yy, z - .006); p.lookAt(p.position.x * 1.6, (yy - cy) * 1.6 + yy, z + .6); front.add(p); }
  },
  rolltop() {
   const band = new T.Mesh(new T.CylinderGeometry(.075, .075, W * .98, 8), m.pocket); band.name = 'rolled top'; band.rotation.z = Math.PI / 2; band.position.set(0, H - .07, .02); front.add(band);
   const st2 = new T.Mesh(new T.BoxGeometry(.07, H * .38, .014), m.trim); st2.name = 'clip strap'; st2.position.set(0, H * .76, fz(0, H * .76) + .03); front.add(st2);
   const clip = new T.Mesh(new T.BoxGeometry(.11, .07, .03), m.metal); clip.name = 'clip buckle'; clip.position.set(0, H * .62, fz(0, H * .62) + .045); front.add(clip);
  },
  retro() {
   const a = new T.Shape(); a.moveTo(-W / 2 + .05, H * .55); a.lineTo(W / 2 - .05, H * .85); a.lineTo(W / 2 - .05, H * .55); a.lineTo(-W / 2 + .05, H * .55);
   const b = new T.Shape(); b.moveTo(-W / 2 + .05, H * .5); b.lineTo(W / 2 - .05, H * .5); b.lineTo(-W / 2 + .05, H * .16);
   const opts = {depth: .012, bevelEnabled: false};
   const pa = new T.Mesh(new T.ExtrudeGeometry(a, opts), m.neon1); pa.name = 'colour block pink'; pa.position.z = fz(0, H * .7) - .004; front.add(pa);
   const pb = new T.Mesh(new T.ExtrudeGeometry(b, opts), m.neon2); pb.name = 'colour block yellow'; pb.position.z = fz(0, H * .35) - .006; front.add(pb);
  },
  wicker() {
   const lid = new T.Mesh(new T.BoxGeometry(W * 1.02, .07, .05), m.trim); lid.name = 'leather lid band'; lid.position.set(0, H - .05, .03); front.add(lid);
   const yy = H * .52, z = fz(0, yy) + .02;
   for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, p = new T.Mesh(new T.IcosahedronGeometry(.045, 0), m.white); p.name = 'flower petal'; p.scale.z = .4; p.position.set(Math.cos(a) * .055, yy + Math.sin(a) * .055, z); front.add(p); }
   const c = new T.Mesh(new T.IcosahedronGeometry(.032, 0), m.neon2); c.name = 'flower centre'; c.position.set(0, yy, z + .015); front.add(c);
   for (const s of [-1, 1]) { const lf = new T.Mesh(new T.IcosahedronGeometry(.04, 0), m.leaf); lf.name = 'flower leaf'; lf.scale.set(1.4, .5, .3); lf.position.set(s * .1, yy - .09, z - .005); lf.rotation.z = s * .5; front.add(lf); }
  },
  rocket() {
   const yy = H * .62, z = fz(0, yy);
   const ring = new T.Mesh(new T.TorusGeometry(.11, .028, 6, 12), m.metal); ring.name = 'window ring'; ring.position.set(0, yy, z - .01); front.add(ring);
   const gl = new T.Mesh(new T.CircleGeometry(.11, 12), m.glass); gl.name = 'window glass'; gl.position.set(0, yy, z - .004); front.add(gl);
   for (const s of [-1, 1]) {
    const f = new T.Shape(); f.moveTo(0, 0); f.lineTo(s * .2, -.06); f.lineTo(s * .2, .05); f.lineTo(0, .3);
    const fin = new T.Mesh(new T.ExtrudeGeometry(f, {depth: .04, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1}), m.trim2); fin.name = 'fin'; fin.position.set(s * .3, .06, -.04); back.add(fin);
   }
   const noz = new T.Mesh(new T.CylinderGeometry(.12, .17, .08, 8), m.metal); noz.name = 'nozzle'; noz.position.set(0, -.035, -.02); back.add(noz);
   const tip = new T.Mesh(new T.ConeGeometry(.06, .1, 8), m.trim2); tip.name = 'nose cone tip'; tip.position.set(0, H + .02, 0); back.add(tip);
  }
 };
 X[st.id]?.();
 root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

 // Charms hang from rings on the back half's side seams, alternating sides, and swing as pendulums.
 const pend = [];
 charms.forEach((id, i) => {
  const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), y = H * (.78 - row * .13);
  const anchor = new T.Object3D(); anchor.position.set(side * (halfWidthAt(y) + .03), y, -.02); back.add(anchor);
  const ring = new T.Mesh(new T.TorusGeometry(.018, .006, 4, 8), m.metal); ring.name = 'charm ring'; ring.position.copy(anchor.position); ring.rotation.y = Math.PI / 2; back.add(ring);
  const c = charmMesh(id, m); c.scale.setScalar(1.6); root.add(c);
  pend.push({id, anchor, mesh: c, ax: 0, az: 0, vx: 0, vz: 0, last: null, vel: new T.Vector3()});
 });

 const sockets = {
  back: [[-.18, .76], [.18, .76], [-.18, .47], [.18, .47], [0, .2], [-.22, .2], [.22, .2]].map(([x, y]) => new T.Vector3(x * W / .78, y * H, .07)),
  front: [[-.17, .76], [.17, .76], [-.17, .24], [.17, .24], [0, .24]].map(([x, y]) => new T.Vector3(x * W / .78, y * H, -.07))
 };
 let openT = 0;
 const tmp = new T.Vector3(), inv = new T.Matrix4();
 return {
  group: root, front, back, H, W, half, sockets, look: l, charms: pend,
  get open() { return openT; },
  setOpen(t) { openT = t; front.rotation.x = t * Math.PI; },
  update(dt) {
   root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
   for (const p of pend) {
    tmp.setFromMatrixPosition(p.anchor.matrixWorld).applyMatrix4(inv);
    if (p.last) { const v = tmp.clone().sub(p.last).divideScalar(Math.max(dt, 1e-3)); const a = v.clone().sub(p.vel).divideScalar(Math.max(dt, 1e-3)); p.vel.copy(v);
     // A damped pendulum driven by how its ring moves (and a breath of idle sway).
     const L = .12, g = 9.8, k = dt;
     p.vx += (-(g / L) * Math.sin(p.ax) - a.z / L * .02 - 3.2 * p.vx) * k + Math.sin(performance.now() / 900 + p.id.length) * .002;
     p.vz += (-(g / L) * Math.sin(p.az) + a.x / L * .02 - 3.2 * p.vz) * k;
     p.ax = Math.max(-1.2, Math.min(1.2, p.ax + p.vx * k)); p.az = Math.max(-1.2, Math.min(1.2, p.az + p.vz * k));
    }
    p.last = (p.last || new T.Vector3()).copy(tmp);
    p.mesh.position.copy(tmp); p.mesh.rotation.set(p.ax, p.id.length * .7, p.az);
   }
  }
 };
}

// ---------- a view: one canvas that draws a backpack, opens it and shows what's inside ----------
function itemTexture(icon) {
 const N = 128, cv = Object.assign(document.createElement('canvas'), {width: N, height: N}), g = cv.getContext('2d');
 const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace;
 const tile = () => { g.clearRect(0, 0, N, N); g.fillStyle = 'rgba(255,255,255,.92)'; g.shadowColor = 'rgba(40,20,40,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 4; g.beginPath(); g.roundRect(10, 10, N - 20, N - 20, 26); g.fill(); g.shadowColor = 'transparent'; };
 tile();
 if (/^(\/|https?:|data:|\.)/.test(icon || '')) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { tile(); g.drawImage(im, 22, 22, N - 44, N - 44); t.needsUpdate = true; }; im.src = icon; }
 else {
  const font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui';
  const draw = () => { tile(); g.fillStyle = '#3a2a4a'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon || '✦', N / 2, N / 2 + 4); t.needsUpdate = true; };
  draw(); document.fonts?.load(font, icon || '✦').then(draw, () => {}); // the emoji font may load after the first draw
 }
 t.needsUpdate = true; return t;
}

// el: a positioned element the canvas fills. items: [{id, name, icon}], coins: a number, charms: charm ids.
export async function backpackView(el, {look: l = look(), items = [], coins = 0, charms = earnedCharms(), dressUp = false, onChange = null, onTap = null, yaw = -.45, spin = true} = {}) {
 await three();
 const canvas = document.createElement('canvas'); canvas.className = 'aw-bp-canvas';
 Object.assign(canvas.style, {position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'pointer'});
 el.append(canvas);
 const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: false});
 renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true;
 renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
 const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, .05, 50);
 scene.add(new T.HemisphereLight('#fff6e6', '#6f5a7a', 1.5));
 const sun = new T.DirectionalLight('#fff1d6', 2.4); sun.position.set(1.6, 3, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -1.6; sun.shadow.camera.right = sun.shadow.camera.top = 1.6; scene.add(sun);
 const rim = new T.DirectionalLight('#bfe3ff', 1.1); rim.position.set(-2, 1.5, -2); scene.add(rim);
 const floor = new T.Mesh(new T.CircleGeometry(1.2, 24), new T.ShadowMaterial({opacity: .18})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
 const holder = new T.Group(); scene.add(holder);

 let bp = null, sprites = [], coinPile = null, state = {l: look(l), items, coins, charms};
 let want = 0, t = 0, yawNow = yaw, yawWant = yaw, drag = null, idle = 0, zoom = 1; const touches = new Map();
 function rebuild() {
  if (bp) { holder.remove(bp.group); bp.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
  bp = buildBackpack(state.l, {charms: state.charms}); holder.add(bp.group); bp.setOpen(t);
  sprites = []; const sk = []; for (let i = 0; i < 7; i++) { if (bp.sockets.back[i]) sk.push(['back', bp.sockets.back[i]]); if (bp.sockets.front[i]) sk.push(['front', bp.sockets.front[i]]); }
  state.items.slice(0, sk.length).forEach((it, i) => {
   const [h, p] = sk[i], s = new T.Sprite(new T.SpriteMaterial({map: itemTexture(it.icon), transparent: true, depthWrite: false}));
   s.scale.setScalar(.25); s.position.copy(p); s.userData.item = it; s.renderOrder = 5; bp[h].add(s); sprites.push(s);
  });
  // Daddy's core memories ride in the front half as a little pile of gold coins.
  if (state.coins > 0) {
   coinPile = new T.Group(); coinPile.name = 'gold coins';
   const cg = new T.CylinderGeometry(.05, .05, .013, 10), cm = new T.MeshStandardMaterial({name: 'coin gold', color: '#ffcc33', metalness: .8, roughness: .28, emissive: '#5a3c00', emissiveIntensity: .3, flatShading: true});
   for (let i = 0; i < Math.min(12, state.coins); i++) { const c = new T.Mesh(cg, cm); c.rotation.x = Math.PI / 2 + (i % 3 - 1) * .2; c.rotation.y = i * 1.3; c.position.set((i % 4 - 1.5) * .07, (Math.floor(i / 4)) * .05, -.02 - (i % 2) * .012); coinPile.add(c); }
   coinPile.position.set(0, bp.H * .5, -.02); coinPile.userData.item = {id: 'coins', name: state.coins === 1 ? "One of Daddy's core memories" : `${state.coins} of Daddy's core memories`, icon: '🪙'};
   bp.front.add(coinPile);
  } else coinPile = null;
  fit();
 }
 function fit() {
  const w = el.clientWidth || 300, h = el.clientHeight || 300; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
 }
 const ro = new ResizeObserver(fit); ro.observe(el);
 rebuild();

 // Taps: on a closed backpack, open it; on an item, name it; on the open shell, close it.
 const ray = new T.Raycaster(), ndc = new T.Vector2();
 const pick = e => { const r = canvas.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam); return ray; };
 canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, e); drag = {x: e.clientX, y: e.clientY, yaw: yawWant, moved: touches.size > 1, pinch: touches.size > 1 ? gap() : 0, zoom}; canvas.setPointerCapture?.(e.pointerId); });
 const gap = () => { const [a, b] = [...touches.values()]; return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0; };
 canvas.addEventListener('pointercancel', e => { touches.delete(e.pointerId); drag = null; });
 canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.55, Math.min(1.6, zoom * (1 + e.deltaY * .0012))); }, {passive: false});
 canvas.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) touches.set(e.pointerId, e); if (!drag) return;
  if (touches.size > 1 && drag.pinch) { zoom = Math.max(.55, Math.min(1.6, drag.zoom * drag.pinch / Math.max(1, gap()))); return; } const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true; yawWant = drag.yaw + dx * .01; idle = 0; });
 canvas.addEventListener('pointerup', e => {
  touches.delete(e.pointerId); const d = drag; drag = null; if (!d || d.moved) return;
  const r = pick(e);
  if (want > .5) {
   const hit = r.intersectObjects([...sprites, ...(coinPile ? [coinPile] : [])], true)[0];
   if (hit) { let o = hit.object; while (o && !o.userData.item) o = o.parent; if (o) { say(o.userData.item.name, e); onTap?.(o.userData.item); return; } }
  }
  const ch = r.intersectObjects(bp.charms.map(p => p.mesh), true)[0];
  if (ch) { let o = ch.object; while (o && !/^charm /.test(o.name)) o = o.parent; const c = CHARMS.find(x => o && o.name === 'charm ' + x.id); if (c) { say(`${c.name}: ${c.quest}`, e); const p = bp.charms.find(q => q.id === c.id); if (p) p.vx += 4; return; } }
  if (r.intersectObject(bp.group, true).length || want > .5) api.toggle();
 });
 let tag = null;
 function say(text, e) {
  tag?.remove(); tag = document.createElement('div'); tag.className = 'aw-bp-tag'; tag.textContent = text;
  const r = el.getBoundingClientRect();
  Object.assign(tag.style, {position: 'absolute', left: Math.max(8, Math.min(r.width - 200, e.clientX - r.left - 60)) + 'px', top: Math.max(6, e.clientY - r.top - 46) + 'px', zIndex: 3, maxWidth: '220px', padding: '6px 11px', borderRadius: '14px',
   background: 'linear-gradient(160deg,#ffffffe8,#ffffffb8)', color: '#3a2a4a', font: '600 13px/1.25 var(--app-font,system-ui)', boxShadow: '0 8px 20px -8px #2a103066,inset 0 1px 0 #fff', pointerEvents: 'none'});
  el.append(tag); const me = tag; setTimeout(() => { me.style.transition = 'opacity .3s'; me.style.opacity = 0; setTimeout(() => me.remove(), 320); }, 2200);
 }

 // Dress-up: ten styles on either side, five facet orbs below. Each tap is a change she can see at once.
 let dress = null;
 function mountDress() {
  dress = document.createElement('div'); dress.className = 'aw-bp-dress';
  const facetOrb = f => `<button type="button" class="aw-bp-orb" data-f="${f.id}" aria-label="${f.name}"></button>`;
  dress.innerHTML = `<button type="button" class="aw-bp-orb aw-bp-prev" aria-label="Previous style">‹</button><button type="button" class="aw-bp-orb aw-bp-next" aria-label="Next style">›</button>
   <div class="aw-bp-dots">${STYLES.map((s, i) => `<i data-i="${i}" title="${s.name}"></i>`).join('')}</div><div class="aw-bp-orbs">${FACETS.map(facetOrb).join('')}</div>`;
  el.append(dress);
  const step = d => { const i = STYLES.findIndex(s => s.id === state.l.style); change({style: STYLES[(i + d + STYLES.length) % STYLES.length].id}, true); };
  dress.querySelector('.aw-bp-prev').onclick = () => step(-1); dress.querySelector('.aw-bp-next').onclick = () => step(1);
  dress.querySelectorAll('.aw-bp-dots i').forEach(d => d.onclick = () => change({style: STYLES[+d.dataset.i].id}, true));
  dress.querySelectorAll('.aw-bp-orbs button').forEach(b => b.onclick = e => {
   const f = FACETS.find(x => x.id === b.dataset.f), i = f.options.findIndex(o => o.id === state.l[f.id]), o = f.options[(i + 1) % f.options.length];
   change({[f.id]: o.id}); say(o.name, e);
  });
  drawDress();
 }
 function drawDress() {
  if (!dress) return;
  const i = STYLES.findIndex(s => s.id === state.l.style);
  dress.querySelectorAll('.aw-bp-dots i').forEach((d, k) => d.classList.toggle('on', k === i));
  dress.querySelectorAll('.aw-bp-orbs button').forEach(b => { b.style.background = swatch(b.dataset.f, state.l); b.innerHTML = b.dataset.f === 'pocket' ? pocketSvg(state.l.pocket) : ''; });
 }
 function change(patch, styleChange = false) {
  let nl = {...state.l, ...patch};
  if (styleChange) nl = {...styleOf(patch.style).look, style: patch.style};
  state.l = nl; rebuild(); drawDress(); onChange?.(nl);
  if (bp) bp.group.scale.setScalar(.92);
 }

 let raf = 0, prev = performance.now(), alive = true;
 const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
 function frame(now) {
  if (!alive) return; raf = requestAnimationFrame(frame);
  if (!el.isConnected) return;
  const dt = Math.min(.05, (now - prev) / 1000); prev = now; idle += dt;
  t += Math.sign(want - t) * Math.min(Math.abs(want - t), dt / .55); const e = ease(t);
  bp.setOpen(e);
  if (spin && !drag && idle > 2 && want < .5) yawWant += dt * .25;
  if (want > .5 && !drag) yawWant += (.32 - yawWant) * Math.min(1, dt * 3);
  yawNow += (yawWant - yawNow) * Math.min(1, dt * 8);
  holder.rotation.y = yawNow;
  holder.rotation.x = -e * .38;
  const s = bp.group.scale.x; bp.group.scale.setScalar(s + (1 - s) * Math.min(1, dt * 10));
  holder.position.y = e * bp.H * .98;
  for (const sp of sprites) { sp.visible = e > .45; sp.material.opacity = Math.min(1, (e - .45) * 3); }
  // Frame the closed pack, then the open clamshell (twice as tall).
  const H = bp.H, ty = H * (.5 + .5 * e), span = H * (1.35 + e * 1.15), wide = (bp.W + .5) * 1.25;
  const fov = cam.fov * Math.PI / 180, dist = Math.max(span / 2 / Math.tan(fov / 2), wide / 2 / Math.tan(fov / 2) / cam.aspect) * 1.08;
  cam.position.set(0, ty + .35 * (1 - e) + .1, dist * zoom); cam.lookAt(0, ty, 0);
  floor.visible = e < .5; floor.material.opacity = .18 * (1 - e * 2);
  bp.update(dt);
  renderer.render(scene, cam);
 }
 raf = requestAnimationFrame(frame);

 const api = {
  canvas, get isOpen() { return want > .5; },
  open() { want = 1; idle = 0; }, close() { want = 0; idle = 0; }, toggle() { want = want > .5 ? 0 : 1; idle = 0; },
  get look() { return state.l; },
  setLook(nl) { state.l = look(nl); rebuild(); drawDress(); },
  setContents({items: it = state.items, coins: c = state.coins, charms: ch = state.charms} = {}) { state.items = it; state.coins = c; state.charms = ch; rebuild(); },
  dressUp(on = true) { if (on && !dress) { mountDress(); want = 0; } else if (!on && dress) { dress.remove(); dress = null; } },
  bounce() { if (bp) bp.group.scale.setScalar(1.12); bp?.charms.forEach(p => p.vz += 3); },
  dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); canvas.remove(); dress?.remove(); tag?.remove(); }
 };
 style();
 if (dressUp) api.dressUp(true);
 return api;
}

export function swatch(f, l) {
 if (f === 'colour') return option('colour', l.colour).c;
 if (f === 'pattern') { const c = option('colour', l.colour).c; return {plain: c, stripes: `repeating-linear-gradient(45deg,${c} 0 6px,#fff6e2 6px 10px)`, dots: `radial-gradient(#fff6e2 25%,transparent 27%) 0 0/10px 10px,${c}`, gingham: `linear-gradient(90deg,#ffffff70 50%,transparent 0) 0 0/10px 10px,linear-gradient(#ffffff70 50%,transparent 0) 0 0/10px 10px,${c}`, stars: `radial-gradient(#fff6e2 18%,transparent 22%) 0 0/9px 9px,${c}`, hearts: `radial-gradient(#ffd0dd 22%,transparent 26%) 0 0/9px 9px,${c}`}[l.pattern]; }
 if (f === 'trim') { const t = option('trim', l.trim); return t.rainbow ? 'conic-gradient(#ff6b6b,#ffb347,#ffe066,#7bd389,#5fb7ff,#a98bff,#ff6b6b)' : `radial-gradient(circle,${t.metal} 0 28%,${t.strap} 30%)`; }
 if (f === 'lining') { const o = option('lining', l.lining); return o.rainbow ? 'linear-gradient(#ff6b6b,#ffb347,#ffe066,#7bd389,#5fb7ff,#a98bff)' : o.stars ? `radial-gradient(#ffe9a8 15%,transparent 20%) 0 0/8px 8px,${o.c}` : o.c; }
 return 'linear-gradient(160deg,#ffffffd0,#ffffff70)';
}
export function pocketSvg(id) {
 const p = {round: '<ellipse cx="12" cy="13" rx="7" ry="5.6"/>', square: '<rect x="5.5" y="8" width="13" height="10" rx="2"/>', heart: '<path d="M12 19s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.2A3.6 3.6 0 0 1 19 10c0 4.6-7 9-7 9z"/>', star: '<path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7z"/>', none: '<path d="M6 18L18 6" stroke-width="2"/>'}[id];
 return `<svg viewBox="0 0 24 24" fill="#fff8" stroke="#2b1d0e" stroke-opacity=".6" stroke-width="1.4">${p}</svg>`;
}

function style() {
 if (document.getElementById('aw-bp-css')) return;
 const s = document.createElement('style'); s.id = 'aw-bp-css';
 s.textContent = `
 .aw-bp-dress{position:absolute;inset:0;pointer-events:none;z-index:2}
 .aw-bp-orb{pointer-events:auto;width:40px;height:40px;border-radius:50%;border:1.5px solid #ffffffe0;cursor:pointer;display:grid;place-items:center;padding:0;
  box-shadow:inset 0 2px 0 #ffffffb0,inset 0 -6px 10px #00000026,0 8px 18px -6px #2a103066;font:700 22px/1 var(--app-font,system-ui);color:#3a2a4a;transition:transform .15s}
 .aw-bp-orb:active{transform:scale(.9)}
 .aw-bp-orb svg{width:24px;height:24px}
 .aw-bp-prev,.aw-bp-next{position:absolute;top:44%;background:linear-gradient(160deg,#ffffffe0,#ffffff90)}
 .aw-bp-prev{left:6px}.aw-bp-next{right:6px}
 .aw-bp-dots{position:absolute;left:0;right:0;bottom:60px;display:flex;justify-content:center;gap:7px;pointer-events:auto}
 .aw-bp-dots i{width:8px;height:8px;border-radius:50%;background:#ffffff90;box-shadow:0 1px 3px #0003;cursor:pointer}
 .aw-bp-dots i.on{background:#fff;transform:scale(1.5)}
 .aw-bp-orbs{position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:10px}`;
 document.head.append(s);
}
