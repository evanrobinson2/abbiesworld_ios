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
  {id: 'peach', name: 'Peach', c: '#ffc4a3'}, {id: 'night', name: 'Starry night', c: '#26306b', stars: true}, {id: 'rainbow', name: 'Rainbow', c: '#ffffff', rainbow: true}]},
 // Her notebook rides in the backpack and holds her quests (Evan, 23:39Z: "let her pick her notebook as a facet of her
 // backpack", fluffy covers like his picture). It is hers whatever the style, so a new style keeps it (keep: true).
 // Drawn by notebook.mjs.
 {id: 'notebook', name: 'Notebook', keep: true, options: [
  {id: 'strawberry', name: 'Strawberry', c: '#ff4fa3'}, {id: 'unicorn', name: 'Unicorn', c: '#f6f2ee'}, {id: 'puppy', name: 'Puppy', c: '#ffe45a'},
  {id: 'rainbow-bear', name: 'Rainbow bear', c: '#ff9a5c'}, {id: 'bunny', name: 'Bunny', c: '#ffc9d6'}, {id: 'kitty', name: 'Kitty', c: '#c6a4f0'},
  {id: 'teddy', name: 'Teddy', c: '#ffb0c2'}]}
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
 // The first charm (Evan, 16:49Z): win the cell game, Abbie's science adventure, and get off the slide.
 {id: 'tardigrade', name: 'Tardigrade', icon: '🦠', quest: "Win Abbie's science adventure"},
 // Every reward is a backpack charm (Evan, 20:51Z): no gold coin charm. The floppy disk is won by beating the word game
 // in Grace's basement, two minutes of play in all; the basement game calls earnCharm('basement').
 {id: 'basement', name: 'Floppy disk', icon: '💾', quest: "Beat the word game in Grace's basement (two minutes of play)"},
 // Coins are scrapped (Evan, 20:51Z), so no charm unlocks from them any more: the school game calls earnCharm('school-roof')
 // when she climbs onto the roof, and the heart crowns the set.
 {id: 'school-roof', name: 'Star', icon: '⭐', quest: 'Climb onto the school roof'},
 {id: 'brass-key', name: 'Brass key', icon: '🗝️', quest: "Find the café's secret key", when: s => s.items.includes('cafe-basement-key')},
 {id: 'moon-key', name: 'Moon', icon: '🌙', quest: 'Earn the key to the Moon base', when: s => s.items.some(i => /moon/i.test(i))},
 {id: 'all-memories', name: 'Heart', icon: '💛', quest: 'Earn every other charm', crown: true},
 {id: 'bub', name: 'Bub', icon: '🐕', quest: 'Play fetch with bub'},
 {id: 'barista', name: 'Coffee cup', icon: '☕', quest: 'Serve your first coffee in the café'},
 {id: 'rocket', name: 'Rocket', icon: '🚀', quest: 'Finish the Moon Mission'},
 {id: 'toy-car', name: 'Toy car', icon: '🏎️', quest: 'Collect 10 of the 16 stars in the toy-car coaster'},
 {id: 'moon-buggy', name: 'Moon buggy', icon: '🚙', quest: 'Roll the Moon Buggy through the carwash and get soaked'},
 // Repeatable (Moon Mission): every three cheeses mined at the Moon kiosk wins another; up to two hang on the keychain.
 // Halloween (experimental): knock on five doors in one night. Seasonal, so it never counts toward 'all-memories'.
 {id: 'pumpkin', name: 'Pumpkin', icon: '🎃', quest: 'Trick-or-treat at five doors on Halloween night'},
 {id: 'moon-cheese', name: 'Moon cheese', icon: '🧀', quest: 'Mine three moon cheeses at the Moon kiosk', repeat: true, hang: 2}
];

// ---------- saved look and charms ----------
const readJSON = (k, f) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? f; } catch { return f; } };
function saved() { const v = readJSON(STORE, {}); return v && typeof v === 'object' ? v : {}; }
function save(v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {} dispatchEvent(new CustomEvent(EVENT, {detail: v})); }
export const styleOf = id => STYLES.find(s => s.id === id) || STYLES[0];
export const option = (facet, id) => { const f = FACETS.find(x => x.id === facet); return f.options.find(o => o.id === id) || f.options[0]; };
// Abbie's own backpack, the one every new player starts with and the one she wears everywhere until she changes it
// (Evan, 2026-10-24 01:00Z: "this is abbie's default backpack"): the bunny in grape stripes, a heart pocket, pink and
// gold straps, a rainbow lining and the rainbow bear notebook.
export const DEFAULT_LOOK = {style: 'bunny', colour: 'grape', pattern: 'stripes', pocket: 'heart', trim: 'pink-gold', lining: 'rainbow', notebook: 'rainbow-bear'};
// The whole look: {style, colour, pattern, pocket, trim, lining, notebook}. A style brings its own facets until she
// changes them; with nothing saved it is her default.
export function look(v = saved()) {
 if (!v.style) v = {...DEFAULT_LOOK, ...v};
 const st = styleOf(v.style), out = {style: st.id};
 for (const f of FACETS) out[f.id] = option(f.id, v[f.id] ?? st.look[f.id]).id;
 return out;
}
export function setLook(patch) {
 const v = saved(), next = {...v, ...patch};
 if (patch.style && patch.style !== v.style) for (const f of FACETS) if (!(f.id in patch) && !f.keep) next[f.id] = styleOf(patch.style).look[f.id];
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
 const has = new Set(CHARMS.filter(c => !c.crown && (given[c.id] || (c.when && c.when(s)))).map(c => c.id));
 // The heart comes with every other one-off charm (moon cheese, which she can win again and again, doesn't count).
 const all = CHARMS.every(c => c.crown || c.repeat || has.has(c.id));
 return CHARMS.filter(c => has.has(c.id) || (c.crown && (given[c.id] || all))).map(c => c.id);
}
export const coinCount = () => progress().coins;
// How many of a charm she owns (0 or 1, or the count for a repeatable one).
export function charmCount(id) { const v = saved(), c = CHARMS.find(x => x.id === id); if (!c) return 0; if (c.repeat) return v.counts?.[id] || (v.charms?.[id] ? 1 : 0); return earnedCharms().includes(id) ? 1 : 0; }
// She keeps each charm on her backpack or in her jewellery box (Evan, 20:51Z). A new charm goes on the backpack.
export const inBox = id => !!saved().boxed?.[id];
export function putInBox(id, yes = true) { const v = saved(); v.boxed = {...(v.boxed || {})}; if (yes) v.boxed[id] = true; else delete v.boxed[id]; save(v); }
// What hangs on the backpack: each charm she has and hasn't put away, a repeatable one up to its hang limit (moon cheese: two).
export function keychain() { const boxed = saved().boxed || {}, extra = UPGRADES.keyring.levels[upgradeLevel('keyring')].extra; return earnedCharms().filter(id => !boxed[id]).flatMap(id => { const c = CHARMS.find(x => x.id === id); return Array(Math.max(1, Math.min(charmCount(id), (c.hang || 1) + (c.repeat ? extra : 0)))).fill(id); }); }

// ---------- upgrades: the plain way to make the backpack better (Evan, 2026-10-24: "a standard, straightforward inventory
// upgrade system"). Each upgrade has a few levels; a level costs stars, and she has one star for every memory coin and every
// charm she has earned. Stars are only ever spent on upgrades, so what she has earned is never taken away.
export const UPGRADES = {
 pockets: {name: 'Pockets', icon: '🎒', blurb: 'Room for more things', levels: [
  {cap: 8, cost: 0, says: 'Carries 8 things'}, {cap: 12, cost: 2, says: 'Carries 12 things'}, {cap: 16, cost: 3, says: 'Carries 16 things'}, {cap: 24, cost: 4, says: 'Carries 24 things'}]},
 keyring: {name: 'Keyring', icon: '🔑', blurb: 'More of the same charm on the ring', levels: [
  {extra: 0, cost: 0, says: 'Repeat charms hang as usual'}, {extra: 1, cost: 2, says: 'One more of each repeat charm hangs'}, {extra: 2, cost: 3, says: 'Two more of each repeat charm hang'}]}
};
export const upgradeLevel = id => Math.max(0, Math.min(UPGRADES[id].levels.length - 1, (saved().up || {})[id] | 0));
export const capacity = () => UPGRADES.pockets.levels[upgradeLevel('pockets')].cap;
export const starsSpent = () => Object.keys(UPGRADES).reduce((n, id) => n + UPGRADES[id].levels.slice(1, upgradeLevel(id) + 1).reduce((a, l) => a + l.cost, 0), 0);
export const starsLeft = () => Math.max(0, coinCount() + earnedCharms().length - starsSpent());
// The next level of an upgrade, or null at the top.
export const nextLevel = id => UPGRADES[id].levels[upgradeLevel(id) + 1] || null;
export function buyUpgrade(id) {
 const next = UPGRADES[id] && nextLevel(id); if (!next || next.cost > starsLeft()) return false;
 const v = saved(); save({...v, up: {...(v.up || {}), [id]: upgradeLevel(id) + 1}}); return true;
}
// A charm she can win again (repeat: true) counts up instead; earnCharm then returns how many she has.
export function earnCharm(id) {
 const c = CHARMS.find(x => x.id === id); if (!c) return false;
 const v = saved(); v.charms = {...(v.charms || {})};
 if (c.repeat) { v.counts = {...(v.counts || {})}; v.counts[id] = (v.counts[id] || (v.charms[id] ? 1 : 0)) + 1; v.charms[id] ||= new Date().toISOString(); save(v); return v.counts[id]; }
 if (v.charms[id]) return false;
 v.charms[id] = new Date().toISOString(); save(v); return true;
}
// Charms she has earned but not yet seen arrive: returns them once, then remembers they were seen.
export function newCharms() {
 const v = saved(), seen = new Set(v.seen || []), earned = earnedCharms(), fresh = earned.filter(id => !seen.has(id));
 // A repeatable charm arrives again each time its count goes up.
 const seenN = {...(v.seenCounts || {})}, again = earned.filter(id => CHARMS.find(c => c.id === id).repeat && seen.has(id) && charmCount(id) > (seenN[id] || 1));
 earned.forEach(id => { if (CHARMS.find(c => c.id === id).repeat) seenN[id] = charmCount(id); });
 if (fresh.length || again.length) { v.seen = [...seen, ...fresh]; v.seenCounts = seenN; try { localStorage.setItem(STORE, JSON.stringify(v)); } catch {} }
 return [...fresh, ...again].map(id => CHARMS.find(c => c.id === id));
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
 const t = new T.CanvasTexture(patternCanvas(base, pattern, accent, cloth)); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2.6, 2.6); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
 texCache.set(key, t); return t;
}
// The cloth as a flat 256 px tile: colour, pattern and grain (also what the decorating cards print).
export function patternCanvas(base, pattern, accent, cloth) {
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
 return cv;
}
function star2d(g, cx, cy, r, ri) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); g.fill(); }
function heart2d(g, cx, cy, s) { g.beginPath(); g.moveTo(cx, cy + s * .9); g.bezierCurveTo(cx - s * 1.4, cy - s * .1, cx - s * .6, cy - s * 1.1, cx, cy - s * .35); g.bezierCurveTo(cx + s * .6, cy - s * 1.1, cx + s * 1.4, cy - s * .1, cx, cy + s * .9); g.fill(); }
// The cloth's relief as a normal map, made from a grain-only height canvas (the colour canvas would raise its own
// stripes and dots). Canvas twill, pebbled leather, nubbly plush and a basket weave each get their own.
function normalTexture(cloth) {
 const key = 'normal|' + cloth; if (texCache.has(key)) return texCache.get(key);
 const N = 256, h = Object.assign(document.createElement('canvas'), {width: N, height: N}), g = h.getContext('2d');
 g.fillStyle = '#808080'; g.fillRect(0, 0, N, N);
 const rnd = (() => { let a = 7; return () => (a = (a * 16807) % 2147483647) / 2147483647; })();
 if (cloth === 'wicker') { for (let y = 0; y < N; y += 32) for (let x = 0; x < N; x += 32) { const v = ((x + y) / 32) % 2; for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#a0a0a0' : '#d8d8d8'; v ? g.fillRect(x + 2 + k * 7, y + 2, 5, 28) : g.fillRect(x + 2, y + 2 + k * 7, 28, 5); } } }
 else if (cloth === 'vinyl') { g.fillStyle = '#868686'; for (let i = 0; i < 80; i++) g.fillRect(rnd() * N, rnd() * N, 3, 3); }
 else if (cloth === 'leather') { for (let i = 0; i < 1400; i++) { const x = rnd() * N, y = rnd() * N, r = 2 + rnd() * 3; g.fillStyle = `rgba(${rnd() < .5 ? 40 : 200},${rnd() < .5 ? 40 : 200},128,.35)`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }
 else if (cloth === 'plush') { for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < .5 ? 'rgba(210,210,210,.5)' : 'rgba(60,60,60,.5)'; g.fillRect(rnd() * N, rnd() * N, 3, 3); } }
 else { for (let i = 0; i < N; i += 4) { g.fillStyle = (i / 4) % 2 ? '#b0b0b0' : '#707070'; g.fillRect(i, 0, 2, N); g.fillStyle = (i / 4) % 2 ? '#a0a0a0' : '#787878'; g.fillRect(0, i + 2, N, 2); } }
 const src = g.getImageData(0, 0, N, N).data, out = g.createImageData(N, N), k = cloth === 'vinyl' ? 1.2 : cloth === 'leather' ? 2.4 : 3;
 const hv = (x, y) => src[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
 for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const dx = (hv(x + 1, y) - hv(x - 1, y)) * k, dy = (hv(x, y + 1) - hv(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), o = (y * N + x) * 4;
  out.data[o] = (-dx / l * .5 + .5) * 255; out.data[o + 1] = (dy / l * .5 + .5) * 255; out.data[o + 2] = (1 / l * .5 + .5) * 255; out.data[o + 3] = 255;
 }
 g.putImageData(out, 0, 0);
 const t = new T.CanvasTexture(h); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2.6, 2.6); t.anisotropy = 8;
 texCache.set(key, t); return t;
}
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
export function accentFor(l) { const col = option('colour', l.colour).c, trim = option('trim', l.trim); return l.pattern === 'plain' ? col : (lightness(col) > .7 ? trim.strap : '#fff6e2'); }
const lightness = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255; return (Math.max(r, g, b) + Math.min(r, g, b)) / 510; };
function materials(l, st) {
 const col = option('colour', l.colour).c, trim = option('trim', l.trim), lin = option('lining', l.lining);
 const cloth = st.cloth, light = new T.Color(col).getHSL({}).l > .7;
 const accent = l.pattern === 'plain' ? col : (light ? trim.strap : '#fff6e2');
 const map = patternTexture(col, cloth === 'wicker' ? 'plain' : l.pattern, accent, cloth);
 const rough = {fabric: .88, canvas: .92, plush: 1, leather: .6, vinyl: .42, wicker: .85}[cloth] ?? .85;
 const M = (name, o) => Object.assign(new T.MeshStandardMaterial({flatShading: true, ...o}), {name});
 const P = (name, o) => Object.assign(new T.MeshPhysicalMaterial({flatShading: true, ...o}), {name});
 return {
  fabric: P(`fabric ${cloth}`, {color: '#ffffff', map, normalMap: normalTexture(cloth), normalScale: new T.Vector2(1, 1).multiplyScalar(cloth === 'vinyl' ? .35 : cloth === 'plush' ? 1.4 : 1), roughness: rough, metalness: 0,
   sheen: cloth === 'plush' ? 1 : cloth === 'canvas' ? .5 : 0, sheenRoughness: .6, sheenColor: new T.Color(col).lerp(new T.Color('#ffffff'), .5),
   clearcoat: cloth === 'vinyl' ? .8 : cloth === 'leather' ? .25 : 0, clearcoatRoughness: .25}),
  pocket: M('fabric pocket', {color: shade(col, -.07), roughness: rough, map: l.pattern === 'plain' ? null : map}),
  trim: P('trim strap', {color: trim.strap, roughness: .68, sheen: .6, sheenRoughness: .5, sheenColor: new T.Color(trim.strap).lerp(new T.Color('#ffffff'), .5), normalMap: normalTexture('canvas'), normalScale: new T.Vector2(.6, .6)}),
  trim2: M('trim strap', {color: trim.rainbow ? '#5fb7ff' : shade(trim.strap, -.08), roughness: .7}),
  metal: M('metal hardware', {color: trim.metal, roughness: .24, metalness: .9, envMapIntensity: 1.3}),
  lining: M('lining', {color: '#ffffff', map: liningTexture(lin), roughness: .95, side: T.DoubleSide, emissive: lin.c, emissiveIntensity: .12}),
  thread: M('thread', {color: light ? shade(col, -.32) : shade(col, .42), roughness: .9}),
  dark: M('ink dark', {color: '#2a2230', roughness: .5}),
  white: M('paint white', {color: '#fbf7ee', roughness: .6}),
  pink: M('felt pink', {color: '#f6a3bf', roughness: .95}),
  glass: P('glass porthole', {color: '#9fd8ff', roughness: .05, metalness: .1, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .72, emissive: '#1d4d7a', emissiveIntensity: .25}),
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

// Hero charms (Evan, 2026-10-23 16:34Z, on the Midjourney charm sheet: "these are perfect, build the charms"). Built from
// tools/midjourney/outputs/backpack-0046/12-charms-sheet-*: chunky faceted enamel-and-gold pieces on a gold jump ring
// and a short chain. Faceted means cut like a gem: a "pillow" from a flat outline with a raised apex on each face.
// About 5 cm tall in the world; every part is named.
function gem(points, t, apex, centre = [0, 0]) {
 // points: the outline (x, y), counter-clockwise. A rim band of thickness 2t, and a fan to an apex on each side.
 const area = points.reduce((a, [x, y], i) => { const [x2, y2] = points[(i + 1) % points.length]; return a + x * y2 - x2 * y; }, 0);
 if (area < 0) points = points.slice().reverse(); // the facets assume a counter-clockwise outline
 const pos = [], n = points.length, [cx, cy] = centre;
 const P = (x, y, z) => pos.push(x, y, z);
 for (let i = 0; i < n; i++) {
  const [ax, ay] = points[i], [bx, by] = points[(i + 1) % n];
  P(cx, cy, t + apex); P(ax, ay, t); P(bx, by, t);            // front facet
  P(cx, cy, -t - apex); P(bx, by, -t); P(ax, ay, -t);         // back facet
  P(ax, ay, t); P(ax, ay, -t); P(bx, by, -t); P(ax, ay, t); P(bx, by, -t); P(bx, by, t); // rim
 }
 const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
}
const starPts = (r, ri, k = 5) => Array.from({length: k * 2}, (_, i) => { const a = Math.PI / 2 + i * Math.PI / k, q = i % 2 ? ri : r; return [Math.cos(a) * q, Math.sin(a) * q]; });
const heartPts = (k, n = 18) => { const s = new T.Shape(); heartShape(s, k); return s.getSpacedPoints(n).slice(0, -1).map(p => [p.x, p.y]); };
function heartShape(s, k) { s.moveTo(0, -k * .9); s.bezierCurveTo(-k * 1.5, k * .1, -k * .7, k * 1.2, 0, k * .45); s.bezierCurveTo(k * .7, k * 1.2, k * 1.5, k * .1, 0, -k * .9); }

// ---------- Meshy charms ----------
// The charms that take up canon are Meshy models made from their Midjourney picks (Evan, 17:27Z), cleaned in Blender
// (simulations/assets/backpack/charms/, centred, largest side 1, Y up). Untextured ones have one material, "charm",
// which is shaded here as enamel or gold. Until a model has loaded, or if it can't, the hand-built charm stands in.
const CHARM_GLB = {tardigrade: 'tardigrade', 'all-memories': 'heart', 'moon-key': 'moon', rocket: 'rocket', 'school-roof': 'star', basement: 'floppy-disk',
 bub: 'bub', barista: 'coffee-cup', 'brass-key': 'brass-key', 'toy-car': 'toy-car'};
// The rocket, the floppy disk and the toy car carry their own Meshy textures (red and cream, yellow label and silver shutter), so they have no shade here.
const CHARM_SHADE = {heart: ['enamel heart red', '#e8334f', .1, .22], moon: ['metal gold moon', '#f0b93a', .75, .28],
 star: ['metal gold star', '#ffc93a', .7, .3],
 bub: ['enamel bub black', '#2a2622', .05, .45], 'coffee-cup': ['enamel cup cream', '#f1e6d4', .05, .4], 'brass-key': ['metal brass key', '#e0b04a', .8, .28]};
const CHARM_SIZE = .11;
// Turns that make each model hang the way a charm does: the water bear and bub side on, the disk and the key standing up.
const CHARM_TURN = {tardigrade: [0, -Math.PI / 2, 0], 'floppy-disk': [Math.PI / 2, 0, 0], 'brass-key': [Math.PI / 2, 0, 0], bub: [0, -Math.PI / 2.6, 0]};
const glbCharms = new Map(), glbLoads = new Map();
// A small reader for these GLBs (one node, plain triangles, an optional base-colour image), so every page can load the
// charms with its own three.js and needs no importmap for GLTFLoader.
async function readGLB(url) {
 const buf = await (await fetch(url)).arrayBuffer(), dv = new DataView(buf);
 if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('not a glb');
 const jl = dv.getUint32(12, true), j = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl))), bin = 20 + jl + 8;
 const N = {5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array}, W = {SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4};
 const acc = i => { const a = j.accessors[i], v = j.bufferViews[a.bufferView], C = N[a.componentType], n = W[a.type];
  if (v.byteStride && v.byteStride !== n * C.BYTES_PER_ELEMENT) throw new Error('interleaved');
  return new T.BufferAttribute(new C(buf.slice(bin + (v.byteOffset || 0) + (a.byteOffset || 0), bin + (v.byteOffset || 0) + (a.byteOffset || 0) + a.count * n * C.BYTES_PER_ELEMENT)), n, !!a.normalized); };
 const g = new T.Group();
 for (const node of j.nodes) {
  if (node.mesh == null) continue;
  for (const pr of j.meshes[node.mesh].primitives) {
   const geo = new T.BufferGeometry();
   for (const [k, name] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['TEXCOORD_0', 'uv']]) if (pr.attributes[k] != null) geo.setAttribute(name, acc(pr.attributes[k]));
   if (pr.indices != null) geo.setIndex(acc(pr.indices));
   if (!geo.attributes.normal) geo.computeVertexNormals();
   let mat = null; const pm = pr.material != null && j.materials?.[pr.material]?.pbrMetallicRoughness, ti = pm?.baseColorTexture?.index;
   if (ti != null) { const im = j.images[j.textures[ti].source], v = j.bufferViews[im.bufferView];
    const bmp = await createImageBitmap(new Blob([new Uint8Array(buf, bin + (v.byteOffset || 0), v.byteLength)], {type: im.mimeType || 'image/png'}), {imageOrientation: 'none'});
    const tex = new T.Texture(bmp); tex.flipY = false; tex.colorSpace = T.SRGBColorSpace; tex.needsUpdate = true;
    mat = new T.MeshStandardMaterial({map: tex, roughness: .3, metalness: .15}); mat.name = 'enamel charm'; }
   const m = new T.Mesh(geo, mat); const M4 = new T.Matrix4();
   if (node.matrix) M4.fromArray(node.matrix); else M4.compose(new T.Vector3(...(node.translation || [0, 0, 0])), new T.Quaternion(...(node.rotation || [0, 0, 0, 1])), new T.Vector3(...(node.scale || [1, 1, 1])));
   m.applyMatrix4(M4); g.add(m);
  }
 }
 return g;
}
export async function loadCharmModels(ids = CHARMS.map(c => c.id)) {
 await three();
 // Every view waits on the same load, so a second view that asks while the first is loading is rebuilt too.
 const want = [...new Set(ids.map(id => CHARM_GLB[id]).filter(Boolean))];
 for (const f of want) if (!glbLoads.has(f)) glbLoads.set(f, readGLB(new URL(`./assets/backpack/charms/${f}.glb`, import.meta.url).href).then(g => glbCharms.set(f, g)).catch(() => {}));
 await Promise.all(want.map(f => glbLoads.get(f)));
 return want.some(f => glbCharms.get(f));
}
function meshyCharm(id) {
 const f = CHARM_GLB[id], src = f && glbCharms.get(f); if (!src) return null;
 const g = new T.Group(), sh = CHARM_SHADE[f];
 const mat = sh && Object.assign(new T.MeshStandardMaterial({color: sh[1], metalness: sh[2], roughness: sh[3], emissive: sh[2] > .5 ? '#5a3c00' : '#000', emissiveIntensity: sh[2] > .5 ? .3 : 0}), {name: sh[0]});
 src.updateMatrixWorld(true);
 src.traverse(o => { if (!o.isMesh) return;
  // Geometry is copied, so a view that rebuilds (and disposes its meshes) never frees the cached model.
  const m = new T.Mesh(o.geometry.clone().applyMatrix4(o.matrixWorld), mat || o.material || new T.MeshStandardMaterial({color: '#f7c23c'})); m.name = `charm ${f}`; m.castShadow = true; g.add(m); });
 g.scale.setScalar(CHARM_SIZE); if (CHARM_TURN[f]) g.rotation.set(...CHARM_TURN[f]); return g;
}

function charmMesh(id, m) {
 const g = new T.Group(); g.name = `charm ${id}`;
 const M = (name, c, o = {}) => Object.assign(new T.MeshStandardMaterial({color: c, flatShading: true, roughness: .38, ...o}), {name});
 const gold = M('metal gold charm', '#f7c23c', {metalness: .55, roughness: .3, emissive: '#6a4600', emissiveIntensity: .4});
 const meshy = meshyCharm(id); if (meshy) g.add(meshy); else {
 const add = (geo, mat, name, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, mat); o.name = name; o.position.set(x, y, z); g.add(o); return o; };
 const ext = (shape, d, mat, name, bev = .006) => { const geo = new T.ExtrudeGeometry(shape, {depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 6}); geo.center(); return add(geo, mat, name); };
 if (id === 'school-roof') { // the faceted gold star
  add(gem(starPts(.066, .03), .01, .02), M('metal gold star', '#ffc93a', {metalness: .7, roughness: .3, emissive: '#6a4300', emissiveIntensity: .3}), 'faceted star');
 } else if (id === 'all-memories') { // the faceted red heart
  add(gem(heartPts(.052), .012, .022, [0, .005]), M('enamel heart red', '#e8334f', {roughness: .22, metalness: .1}), 'faceted heart');
 } else if (id === 'moon-key') { // the crescent moon resting on a little cloud
  const s = new T.Shape(); s.absarc(0, 0, .058, Math.PI * .28, Math.PI * 1.72, false); s.absarc(.028, .006, .046, Math.PI * 1.6, Math.PI * .4, true);
  ext(s, .016, M('metal gold moon', '#f0b93a', {metalness: .75, roughness: .28, emissive: '#5a3c00', emissiveIntensity: .3}), 'crescent');
  for (const [x, y, r] of [[-.02, -.045, .018], [.004, -.05, .021], [.03, -.044, .016], [-.036, -.036, .013]]) add(new T.IcosahedronGeometry(r, 0), M('enamel cloud white', '#f6f1e6', {roughness: .6}), 'cloud puff', x, y, .008);
 } else if (id === 'brass-key') { // the café key, brass
  const bow = add(new T.TorusGeometry(.024, .009, 5, 12), gold, 'key bow'); bow.position.y = .036;
  add(gem(heartPts(.012, 10), .003, .004), M('enamel key red', '#e8334f', {roughness: .25}), 'bow heart', 0, .036, 0);
  add(new T.BoxGeometry(.013, .072, .012), gold, 'key shaft', 0, -.014, 0);
  add(new T.BoxGeometry(.024, .011, .012), gold, 'key bit', .012, -.042, 0); add(new T.BoxGeometry(.017, .01, .012), gold, 'key bit', .009, -.026, 0);
 } else if (id === 'basement') { // Grace's floppy disk, after Evan's pick: blue enamel in dark metal, a silver shutter, a yellow label
  const edge = M('metal floppy edge', '#3a3f52', {metalness: .7, roughness: .3}), blue = M('enamel floppy blue', '#2f55c8', {roughness: .24});
  const silver = M('metal shutter', '#c9ccd2', {metalness: .85, roughness: .22}), dark = M('ink dark', '#1d2436');
  const body = new T.Shape(); body.moveTo(-.05, -.05); body.lineTo(.05, -.05); body.lineTo(.05, .04); body.lineTo(.04, .05); body.lineTo(-.05, .05); body.closePath();
  ext(body, .008, edge, 'floppy rim', .003);
  const face = new T.Shape(); face.moveTo(-.046, -.046); face.lineTo(.046, -.046); face.lineTo(.046, .038); face.lineTo(.038, .046); face.lineTo(-.046, .046); face.closePath();
  ext(face, .012, blue, 'floppy body', .002);
  add(new T.BoxGeometry(.05, .032, .02), silver, 'floppy shutter', -.004, .03, 0);
  add(new T.BoxGeometry(.016, .026, .023), M('enamel slider white', '#f4f1e8', {roughness: .5}), 'shutter slider', -.01, .03, 0);
  add(new T.BoxGeometry(.01, .02, .023), dark, 'shutter window', .01, .03, 0);
  add(new T.BoxGeometry(.068, .03, .02), M('enamel label yellow', '#f2c94c', {roughness: .35}), 'floppy label', .004, -.012, 0);
  add(new T.BoxGeometry(.026, .006, .023), M('enamel label blue', '#7fd3f5', {roughness: .3}), 'label bar', .018, -.008, 0);
  for (const x of [-.02, -.01]) add(new T.BoxGeometry(.005, .005, .023), dark, 'label dot', x, -.018, 0);
  add(new T.BoxGeometry(.058, .012, .019), edge, 'floppy slot', .008, -.038, 0);
  for (const [x, y] of [[-.042, .042], [-.042, -.042], [.042, -.042], [.038, .034]]) add(new T.BoxGeometry(.006, .006, .019), edge, 'corner screw', x, y, 0);
 } else if (id === 'moon-cheese') { // a wedge of moon cheese: pale gold, faceted, with crater holes on its faces
  const cheese = M('enamel moon cheese', '#f0bf2a', {roughness: .4, emissive: '#4a3200', emissiveIntensity: .12}), hole = M('enamel cheese hole', '#b97a10', {roughness: .6});
  const w = new T.Shape(); w.moveTo(-.05, -.03); w.lineTo(.05, -.03); w.lineTo(-.05, .045); w.closePath();
  add(new T.ExtrudeGeometry(w, {depth: .03, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 1}), cheese, 'cheese wedge', 0, 0, -.015);
  for (const [x, y, r, z] of [[-.03, -.012, .008, .0195], [-.012, .008, .006, .0195], [.012, -.016, .007, .0195], [-.035, .02, .005, .0195], [-.022, -.018, .006, -.0195], [0, -.008, .007, -.0195]]) {
   const h = add(new T.CircleGeometry(r, 7), hole, 'cheese hole', x, y, z); if (z < 0) h.rotation.y = Math.PI; }
 } else if (id === 'tardigrade') { // a water bear: a plump segmented body on four pairs of stubby legs, in pink enamel (to match the cell game's water bear) with gold claws
  const skin = M('enamel tardigrade pink', '#f6a8c4', {roughness: .3, emissive: '#5a1f38', emissiveIntensity: .2}), fold = M('enamel tardigrade fold', '#e889ab', {roughness: .3});
  [-.03, -.01, .01, .03].forEach((x, i) => { const seg = add(new T.IcosahedronGeometry(.024, 1), i % 2 ? fold : skin, 'tardigrade segment', x, .002 * (i % 2), 0); seg.scale.set(.95, .82 - Math.abs(x) * 2, .8); });
  const head = add(new T.IcosahedronGeometry(.02, 1), skin, 'tardigrade head', -.05, .006, 0); head.scale.set(1, .85, .8);
  add(new T.CylinderGeometry(.006, .008, .012, 6), fold, 'tardigrade snout', -.068, .004, 0).rotation.z = Math.PI / 2;
  for (const z of [-1, 1]) add(new T.IcosahedronGeometry(.0045, 0), M('tardigrade eye', '#1b1424', {roughness: .2}), 'tardigrade eye', -.058, .016, z * .011);
  [-.036, -.012, .012, .036].forEach(x => { for (const z of [-1, 1]) {
   const leg = add(new T.CylinderGeometry(.007, .009, .018, 6), skin, 'tardigrade leg', x, -.022, z * .012); leg.rotation.x = z * .25;
   add(new T.ConeGeometry(.004, .008, 4), gold, 'tardigrade claw', x - .004, -.033, z * .015).rotation.z = Math.PI * .6;
  } });
 } else if (id === 'bub') { // bub, the black lab, faceted like the sheet's little dog
  const fur = M('fur black lab', '#2b2724', {roughness: .55}), muzzle = M('fur muzzle', '#3d3632', {roughness: .55});
  const body = add(new T.IcosahedronGeometry(.034, 0), fur, 'dog body', 0, -.012, 0); body.scale.set(1.45, .9, .85);
  const head = add(new T.IcosahedronGeometry(.027, 0), fur, 'dog head', -.038, .02, 0); head.scale.set(1, .95, .9);
  add(new T.IcosahedronGeometry(.013, 0), muzzle, 'dog muzzle', -.06, .012, 0).scale.set(1.3, .8, .9);
  add(new T.IcosahedronGeometry(.005, 0), M('dog nose', '#111'), 'dog nose', -.074, .015, 0);
  for (const z of [-1, 1]) { const ear = add(new T.ConeGeometry(.012, .026, 4), fur, 'dog ear', -.034, .03, z * .018); ear.rotation.set(z * .5, 0, Math.PI * .85);
   add(new T.IcosahedronGeometry(.0045, 0), M('dog eye brown', '#6b3a1f', {roughness: .2}), 'dog eye', -.055, .028, z * .013); }
  for (const [x, z] of [[-.03, -.014], [-.03, .014], [.03, -.014], [.03, .014]]) add(new T.BoxGeometry(.012, .03, .012), fur, 'dog leg', x, -.04, z);
  const tail = add(new T.ConeGeometry(.007, .04, 4), fur, 'dog tail', .056, .006, 0); tail.rotation.z = -1.0;
  add(new T.TorusGeometry(.014, .004, 4, 10), M('collar red', '#e8334f'), 'dog collar', -.03, .002, 0).rotation.y = Math.PI / 2;
 } else if (id === 'barista') { // a takeaway cup from the café
  add(new T.CylinderGeometry(.034, .026, .07, 10), M('paper cup cream', '#f4efe4', {roughness: .7}), 'cup');
  add(new T.CylinderGeometry(.0335, .0305, .032, 10), M('paper sleeve brown', '#8a5a3c', {roughness: .8}), 'cup sleeve', 0, -.005, 0);
  add(new T.CylinderGeometry(.037, .037, .012, 10), M('lid white', '#fbf7ee', {roughness: .4}), 'cup lid', 0, .04, 0);
  add(new T.CylinderGeometry(.03, .036, .008, 10), M('lid white', '#fbf7ee', {roughness: .4}), 'lid rim', 0, .049, 0);
  add(new T.IcosahedronGeometry(.008, 0), M('enamel leaf', '#4f9a45'), 'sleeve mark', 0, -.005, .034).scale.z = .3;
 } else if (id === 'toy-car') { // a little red toy car with fat black wheels
  const red = M('enamel car red', '#e23a3a', {roughness: .25}), glass = M('enamel car window', '#9fd6f0', {roughness: .2}), tyre = M('rubber tyre', '#1d1b20', {roughness: .7});
  add(new T.BoxGeometry(.09, .026, .044), red, 'car body', 0, -.006, 0);
  add(new T.BoxGeometry(.046, .024, .04), red, 'car cabin', -.006, .018, 0);
  for (const z of [-1, 1]) add(new T.BoxGeometry(.036, .016, .002), glass, 'car window', -.006, .019, z * .0205);
  for (const x of [-.03, .03]) for (const z of [-1, 1]) add(new T.CylinderGeometry(.013, .013, .01, 10), tyre, 'car wheel', x, -.02, z * .024).rotation.x = Math.PI / 2;
  for (const z of [-1, 1]) add(new T.BoxGeometry(.004, .006, .008), gold, 'car headlight', .046, -.002, z * .013);
 } else if (id === 'moon-buggy') { // a little Moon Buggy: big lugged tyres, a split nose, tall bars
  const body = M('enamel buggy slate', '#4a6a8a', {roughness: .3}), tyre = M('rubber tyre', '#1d1b20', {roughness: .7}), lamp = M('enamel buggy lamp', '#e8f6ff', {roughness: .2, emissive: '#bfeaff', emissiveIntensity: .6});
  add(new T.BoxGeometry(.07, .02, .04), body, 'buggy frame', 0, -.004, 0); add(new T.BoxGeometry(.03, .024, .036), body, 'buggy nose', .026, .008, 0); add(new T.BoxGeometry(.028, .01, .03), M('enamel buggy seat', '#1e2128', {roughness: .8}), 'buggy seat', -.012, .012, 0);
  for (const x of [-.026, .026]) for (const z of [-1, 1]) add(new T.CylinderGeometry(.014, .014, .012, 10), tyre, 'buggy wheel', x, -.016, z * .026).rotation.x = Math.PI / 2;
  for (const z of [-1, 1]) add(new T.BoxGeometry(.004, .005, .006), lamp, 'buggy headlight', .044, .006, z * .01);
  add(new T.CylinderGeometry(.002, .002, .03, 5), M('buggy bar', '#9fb3c8'), 'buggy bars', .016, .02, 0).rotation.z = .3;
 } else if (id === 'pumpkin') { // a little pumpkin: six orange ribs round a stem, with a friendly lit face
  const rind = M('enamel pumpkin orange', '#f08a24', {roughness: .35, emissive: '#5a2600', emissiveIntensity: .25}), leaf = M('enamel pumpkin stem', '#4f8a3e', {roughness: .5}), glow = M('pumpkin face glow', '#ffe08a', {roughness: .3, emissive: '#ffb02e', emissiveIntensity: 1});
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, rib = add(new T.IcosahedronGeometry(.026, 1), rind, 'pumpkin rib', Math.cos(a) * .014, 0, Math.sin(a) * .014); rib.scale.set(.8, 1, .8); }
  add(new T.CylinderGeometry(.005, .007, .016, 6), leaf, 'pumpkin stem', 0, .032, 0);
  for (const x of [-.013, .013]) add(new T.ConeGeometry(.006, .01, 3), glow, 'pumpkin eye', x, .006, .034).rotation.x = Math.PI / 2;
  add(new T.BoxGeometry(.026, .006, .004), glow, 'pumpkin smile', 0, -.014, .036);
 } else if (id === 'rocket') { // the red rocket with a porthole
  const red = M('enamel rocket red', '#d9393a', {roughness: .25}), cream = M('enamel rocket cream', '#f4ece0', {roughness: .3});
  add(new T.CylinderGeometry(.024, .026, .07, 8), cream, 'rocket body');
  add(new T.ConeGeometry(.024, .04, 8), red, 'rocket nose', 0, .055, 0);
  const ring = add(new T.TorusGeometry(.011, .004, 4, 10), gold, 'rocket porthole', 0, .012, .025); ring.rotation.x = 0;
  add(new T.CircleGeometry(.011, 10), M('glass porthole', '#5fb7ff', {roughness: .1, emissive: '#1d4d7a', emissiveIntensity: .3}), 'porthole glass', 0, .012, .0255);
  for (const a of [0, 2.1, 4.2]) { const f = add(new T.BoxGeometry(.022, .03, .006), a ? red : M('enamel fin blue', '#2e4fb8'), 'rocket fin', Math.cos(a) * .026, -.03, Math.sin(a) * .026); f.rotation.y = -a; f.rotation.z = .25 * Math.sign(Math.cos(a) || 1); }
  add(new T.CylinderGeometry(.016, .02, .012, 8), gold, 'rocket nozzle', 0, -.041, 0);
 }
 }
 // The gold jump ring, a short chain and the bail: it hangs from the pivot at the group's origin.
 const top = new T.Box3().setFromObject(g).max.y, chain = new T.Group(); chain.name = 'charm chain';
 [0, 1, 2, 3].forEach(i => { const l = new T.Mesh(new T.TorusGeometry(.008, .0026, 4, 8), gold); l.name = 'chain link'; l.position.y = -i * .012; l.rotation.y = i % 2 ? Math.PI / 2 : 0; chain.add(l); });
 const bail = new T.Mesh(new T.TorusGeometry(.009, .003, 4, 8), gold); bail.name = 'charm bail'; bail.position.y = -.05; bail.rotation.y = Math.PI / 2; chain.add(bail);
 const body = new T.Group(); body.name = 'charm body'; g.children.slice().forEach(c => body.add(c)); body.position.y = -.058 - top;
 const out = new T.Group(); out.name = g.name; out.userData.charm = id; out.add(chain, body); return out;
}

// Build one backpack. Returns the group, both halves, the open control and the charm pendulums.
// Little real parts that make it read as sewn and zipped, not extruded: a row of stitches along a path, and zip teeth.
// Both are InstancedMeshes (one draw call each) and named by what they are.
function stitchRow(pts, mat, name, {step = .05, len = .026, r = .0045, closed = false} = {}) {
 const n = pts.length, seg = [], total = (() => { let t = 0; for (let i = 0; i < n - (closed ? 0 : 1); i++) { const a = pts[i], b = pts[(i + 1) % n], d = a.distanceTo(b); seg.push(d); t += d; } return t; })();
 const count = Math.max(2, Math.floor(total / step)), inst = new T.InstancedMesh(new T.BoxGeometry(len, r * 2, r * 2), mat, count), m4 = new T.Matrix4(), q = new T.Quaternion(), pos = new T.Vector3(), tan = new T.Vector3(), one = new T.Vector3(1, 1, 1), x = new T.Vector3(1, 0, 0);
 let si = 0, acc = 0;
 for (let k = 0; k < count; k++) {
  const target = (k + .5) * total / count; while (si < seg.length - 1 && acc + seg[si] < target) { acc += seg[si]; si++; }
  const a = pts[si], b = pts[(si + 1) % n], f = seg[si] ? (target - acc) / seg[si] : 0;
  pos.lerpVectors(a, b, f); tan.subVectors(b, a).normalize(); q.setFromUnitVectors(x, tan);
  inst.setMatrixAt(k, m4.compose(pos, q, one));
 }
 inst.name = name; inst.castShadow = false; return inst;
}
function zipTeeth(pts, mat, name, z, step = .017) {
 const n = pts.length, geo = new T.BoxGeometry(.008, .0055, .011);
 const list = []; let carry = 0;
 for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], d = a.distanceTo(b); let t = carry; while (t < d) { list.push([a.clone().lerp(b, t / d), b.clone().sub(a).normalize()]); t += step; } carry = t - d; }
 const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), q = new T.Quaternion(), one = new T.Vector3(1, 1, 1), x = new T.Vector3(1, 0, 0), side = new T.Vector3();
 list.forEach(([p, tn], k) => { side.set(-tn.y, tn.x, 0); p.addScaledVector(side, (k % 2 ? 1 : -1) * .0042); p.z = z; im.setMatrixAt(k, m4.compose(p, q.setFromUnitVectors(x, tn), one)); });
 im.name = name; return im;
}
// A flat padded strap: a rounded-rectangle section swept along a curve (the width lies across the bag).
function ribbon(curve, w, t, segs, mat, name) {
 const sec = [[-1, -.55], [-.55, -1], [.55, -1], [1, -.55], [1, .55], [.55, 1], [-.55, 1], [-1, .55]], pos = [], idx = [], P = curve.getSpacedPoints(segs), fr = [];
 const up = new T.Vector3(0, 0, 1);
 P.forEach((p, i) => { const tn = curve.getTangentAt(i / segs).normalize(), wd = new T.Vector3().crossVectors(up, tn).normalize(), th = new T.Vector3().crossVectors(tn, wd).normalize(); fr.push([p, wd, th]);
  sec.forEach(([u, v]) => { const q = p.clone().addScaledVector(wd, u * w / 2).addScaledVector(th, v * t / 2); pos.push(q.x, q.y, q.z); }); });
 for (let i = 0; i < segs; i++) for (let j = 0; j < 8; j++) { const a = i * 8 + j, b = i * 8 + (j + 1) % 8, c = (i + 1) * 8 + j, d = (i + 1) * 8 + (j + 1) % 8; idx.push(a, c, b, b, c, d); }
 const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
 const uv = []; for (let i = 0; i <= segs; i++) for (let j = 0; j < 8; j++) uv.push(j / 8 * 2, i / segs * 6); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
 const o = new T.Mesh(g, mat); o.name = name; o.userData.frames = fr; return o;
}
// One charm on its own, without its chain (for reference renders and side-by-side with its Meshy model).
export async function charmModel(id) { await three(); await loadCharmModels([id]); const c = charmMesh(id, materials(look(), styleOf('classic'))); return c.children[1]; }

export function buildBackpack(l = look(), {charms = []} = {}) {
 const st = styleOf(l.style), m = materials(l, st), shape = SIL[st.id]();
 const half = DEPTH[st.id] ?? .15, bev = .045, puff = PUFF[st.id] ?? .2;
 const outline = shape.getSpacedPoints(80);
 const bb = new T.Box2().setFromPoints(outline), W = bb.max.x - bb.min.x, H = bb.max.y, cx = 0, cy = H / 2;
 const r2 = (x, y) => Math.min(1, (x / (W / 2)) ** 2 + ((y - cy) / (H / 2)) ** 2);
 const surfaceZ = (x, y) => half * (1 + puff * (1 - r2(x, y)));
 const halfWidthAt = y => Math.max(...outline.filter(p => Math.abs(p.y - y) < .05).map(p => Math.abs(p.x)), .1);
 // A charm hangs down its chain, so its ring sits clear of the widest part of the bag below it, not just beside the ring.
 const clearBelow = y => Math.max(...outline.filter(p => p.y < y + .05 && p.y > y - .26).map(p => Math.abs(p.x)), halfWidthAt(y)) + bev;

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
 // The compartments (issue #536): each half's inside is zipped shut under a cloth cover. The pull rides the cover's top
 // edge; unzipping runs it down and the cover shrinks to the bottom, so what is inside shows from the top first.
 lg.computeBoundingBox();
 const zipTop = lg.boundingBox.max.y, covers = {}, coverMat = m.fabric.clone(); coverMat.side = T.DoubleSide;
 for (const [h, half2, sg] of [['back', back, 1], ['front', front, -1]]) {
  const group = new T.Group(); group.name = `compartment cover ${h}`; group.position.z = sg * .2;
  const sheet = new T.Mesh(lg, coverMat); sheet.name = 'cover cloth'; group.add(sheet);
  const track = new T.Mesh(new T.BoxGeometry(Math.max(.2, halfWidthAt(zipTop - .06) * 1.7), .018, .014), m.metal); track.name = 'cover zip teeth'; track.position.set(0, zipTop - .005, sg * .008); group.add(track);
  const pull = new T.Mesh(new T.BoxGeometry(.05, .1, .022), m.metal); pull.name = 'compartment zip pull'; pull.position.z = sg * .23; pull.userData.zip = sheet.userData.zip = track.userData.zip = h;
  half2.add(group, pull); covers[h] = {group, pull, sheet, track, k: 1};
 }
 const setZip = (h, k) => { const c = covers[h]; c.k = k; c.group.scale.y = Math.max(.001, k); c.group.visible = k > .03; c.pull.position.y = Math.max(.07, zipTop * k - .02); c.pull.position.x = 0; };
 setZip('back', 1); setZip('front', 1);
 // The zip: piping round each half's rim, and a pull at the top.
 const pipe = z => { const pts = outline.map(p => new T.Vector3(p.x, p.y, z)); return new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 80, .016, 4, true); };
 front.add(Object.assign(new T.Mesh(pipe(.014), m.trim), {name: 'zip piping front'}));
 back.add(Object.assign(new T.Mesh(pipe(-.014), m.trim2), {name: 'zip piping back'}));
 // Stitching round each shell's face, and zip teeth along the rim on the cut side.
 const rim = outline.slice(0, -1), c0 = new T.Vector2(0, cy);
 const inset = d => rim.map((pt, i) => { const a = rim[(i + rim.length - 1) % rim.length], b = rim[(i + 1) % rim.length], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1; let nx = -ty / l, ny = tx / l; if (nx * (c0.x - pt.x) + ny * (c0.y - pt.y) < 0) { nx = -nx; ny = -ny; } return new T.Vector2(pt.x + nx * d, pt.y + ny * d); });
 const on = (pts2, sign, lift) => pts2.map(q => new T.Vector3(q.x, q.y, sign * (surfaceZ(q.x, q.y) + lift)));
 front.add(stitchRow(on(inset(.07), 1, .0015), m.thread, 'stitching front', {closed: true, step: .052}));
 back.add(stitchRow(on(inset(.07), -1, .0015), m.thread, 'stitching back', {closed: true, step: .052}));
 const flat = (pts2, z) => pts2.map(q => new T.Vector3(q.x, q.y, z));
 front.add(zipTeeth(flat(inset(.03), 0), m.metal, 'zip teeth front', -.007));
 back.add(zipTeeth(flat(inset(.03), 0), m.metal, 'zip teeth back', .007));
 for (const s of [-1, 1]) { const p = new T.Mesh(new T.BoxGeometry(.03, .06, .012), m.metal); p.name = 'zip pull'; p.position.set(s * .1, H - .045, .03); p.rotation.x = .25; front.add(p); }

 // Straps, handle and buckles on the back half.
 const tube = (pts, r, mat, name, parent) => { const o = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 12, r, 5, false), mat); o.name = name; parent.add(o); return o; };
 const bz = (x, y) => -surfaceZ(x, y);
 for (const s of [-1, 1]) {
  const x = s * W * .22;
  const sc = new T.CatmullRomCurve3([new T.Vector3(x, H * .84, bz(x, H * .84) + .02), new T.Vector3(x * 1.08, H * .62, bz(x, H * .6) - .16), new T.Vector3(x * 1.15, H * .32, bz(x, H * .3) - .12), new T.Vector3(x * 1.2, H * .12, bz(x, H * .12) + .01)]);
  const strap = ribbon(sc, .078, .028, 28, m.trim, 'shoulder strap'); back.add(strap);
  for (const e of [-1, 1]) back.add(stitchRow(strap.userData.frames.map(([pt, wd, th]) => pt.clone().addScaledVector(wd, e * .028).addScaledVector(th, .0155)), m.thread, 'strap stitching', {step: .042, len: .02, r: .0035}));
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
  // Rows share the seam; every other row steps back across the side panel so a full set hangs staggered, not stacked.
  const rows = Math.ceil(charms.length / 2), gap = Math.min(.2, .6 / Math.max(1, rows - 1)), side = i % 2 ? 1 : -1, row = Math.floor(i / 2), y = H * (.8 - row * gap);
  const anchor = new T.Object3D(); anchor.position.set(side * (clearBelow(y) + .03), y, row % 2 ? -half * .8 : -.02); back.add(anchor);
  const ring = new T.Mesh(new T.TorusGeometry(.018, .006, 4, 8), m.metal); ring.name = 'charm ring'; ring.position.copy(anchor.position); ring.rotation.y = Math.PI / 2; back.add(ring);
  const c = charmMesh(id, m); c.scale.setScalar(rows > 3 ? 1.3 : 1.6); root.add(c);
  pend.push({id, anchor, mesh: c, ax: 0, az: 0, vx: 0, vz: 0, last: null, vel: new T.Vector3()});
 });

 const sockets = {
  back: [[-.18, .76], [.18, .76], [-.18, .47], [.18, .47], [0, .2], [-.22, .2], [.22, .2]].map(([x, y]) => new T.Vector3(x * W / .78, y * H, .07)),
  front: [[-.17, .76], [.17, .76], [-.17, .24], [.17, .24], [0, .24]].map(([x, y]) => new T.Vector3(x * W / .78, y * H, -.07))
 };
 let openT = 0;
 const tmp = new T.Vector3(), wp = new T.Vector3(), wq = new T.Quaternion(), inv = new T.Matrix4();
 return {
  group: root, front, back, H, W, half, sockets, look: l, charms: pend, covers, setZip, zipTop,
  get open() { return openT; },
  setOpen(t) { openT = t; front.rotation.x = t * Math.PI; },
  // world: the swing follows how the ring moves through the world (a backpack worn by a walking figure), in metres,
  // turned into the backpack's own frame; otherwise it follows the ring inside the backpack (the viewer's toy).
  update(dt, {world = false, gain = .02} = {}) {
   root.updateMatrixWorld(true); inv.copy(root.matrixWorld).invert();
   if (world) root.getWorldQuaternion(wq).invert();
   for (const p of pend) {
    tmp.setFromMatrixPosition(p.anchor.matrixWorld).applyMatrix4(inv);
    if (world) wp.setFromMatrixPosition(p.anchor.matrixWorld);
    const at = world ? wp : tmp;
    if (p.last) { const v = at.clone().sub(p.last).divideScalar(Math.max(dt, 1e-3)); const a = v.clone().sub(p.vel).divideScalar(Math.max(dt, 1e-3)); p.vel.copy(v);
     if (world) a.applyQuaternion(wq).clampLength(0, 60);
     // A damped pendulum driven by how its ring moves (and a breath of idle sway).
     const L = .12, g = 9.8, k = dt;
     p.vx += (-(g / L) * Math.sin(p.ax) - a.z / L * gain - 3.2 * p.vx) * k + Math.sin(performance.now() / 900 + p.id.length) * .002;
     p.vz += (-(g / L) * Math.sin(p.az) + a.x / L * gain - 3.2 * p.vz) * k;
     p.ax = Math.max(-1.2, Math.min(1.2, p.ax + p.vx * k)); p.az = Math.max(-1.2, Math.min(1.2, p.az + p.vz * k));
    }
    p.last = (p.last || new T.Vector3()).copy(at);
    p.mesh.position.copy(tmp); p.mesh.rotation.set(p.ax, p.id.length * .7, p.az);
   }
  }
 };
}

// ---------- a view: one canvas that draws a backpack, opens it and shows what's inside ----------
function itemTexture(icon, px = 128) {
 const N = 128, cv = Object.assign(document.createElement('canvas'), {width: px, height: px}), g = cv.getContext('2d'); g.scale(px / N, px / N);
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

// What the callout says about an item: its own words, who gave it, or a plain line.
const aboutOf = it => it.about || it.thought || (it.id === 'coins' ? 'Coins that hold Daddy\'s core memories.' : it.from ? `Given to Abbie by ${it.from}.` : 'Something Abbie picked up on her adventures.');
// el: a positioned element the canvas fills. items: [{id, name, icon}], coins: a number, charms: charm ids.
export async function backpackView(el, {look: l = look(), items = [], coins = 0, charms = earnedCharms(), dressUp = false, onChange = null, onTap = null, onFocus = null, yaw = -.45, spin = true, float = false, deckHost = null, overSlot = null, onDeal = null, onPart = null, onUse = null} = {}) {
 await three();
 const canvas = document.createElement('canvas'); canvas.className = 'aw-bp-canvas';
 Object.assign(canvas.style, {position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'pointer'});
 el.append(canvas);
 const renderer = new T.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: false});
 renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.outputColorSpace = T.SRGBColorSpace; renderer.shadowMap.enabled = true;
 renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
 const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1, .05, 50);
 // A small studio to reflect: a soft sky, a warm key softbox and a cool rim strip, so metal, vinyl and glass read as themselves.
 { const es = new T.Scene(), sky = new T.Mesh(new T.SphereGeometry(10, 24, 16), new T.MeshBasicMaterial({side: T.BackSide, vertexColors: true})), pa = sky.geometry.attributes.position, col = new Float32Array(pa.count * 3), c1 = new T.Color('#e9f2ff'), c2 = new T.Color('#9a8aa6');
  for (let i = 0; i < pa.count; i++) { const c = c2.clone().lerp(c1, Math.max(0, Math.min(1, pa.getY(i) / 10 * .5 + .5))); col.set([c.r, c.g, c.b], i * 3); }
  sky.geometry.setAttribute('color', new T.BufferAttribute(col, 3)); es.add(sky);
  const box = (w, h, x, y, z, k, c) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide})); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
  box(5, 4, 4, 5, 5, 5, '#fff2d8'); box(1.2, 6, -6, 2, -3, 4, '#cfe6ff'); box(8, 1.2, 0, 8, 0, 2.5, '#ffffff');
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(es, .03).texture; scene.environmentIntensity = .6; pm.dispose(); es.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); }); }
 scene.add(new T.HemisphereLight('#fff6e6', '#6f5a7a', 1.0));
 const sun = new T.DirectionalLight('#fff1d6', 2.4); sun.position.set(1.6, 3, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = sun.shadow.camera.bottom = -1.6; sun.shadow.camera.right = sun.shadow.camera.top = 1.6; scene.add(sun);
 const rim = new T.DirectionalLight('#bfe3ff', 1.1); rim.position.set(-2, 1.5, -2); scene.add(rim);
 const floor = new T.Mesh(new T.CircleGeometry(1.2, 24), new T.ShadowMaterial({opacity: .18})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
 const holder = new T.Group(); scene.add(holder);

 const has = {back: false, front: false}, zip = {back: {k: 1, want: 1, wig: 0}, front: {k: 1, want: 1, wig: 0}};
 let insp = null, callout = null, hinted = false;
 let bp = null, sprites = [], coinPile = null, state = {l: look(l), items, coins, charms};
 let picking = null, sampledAt = 0, anchorsNow = {}, tracked = {}, bounds = null;
 let want = 0, t = 0, yawNow = yaw, yawWant = yaw, drag = null, idle = 0, zoom = 1; const touches = new Map();
 function rebuild() {
  if (bp && focus != null) { focus = null; hop = 0; onFocus?.(null); } // a rebuilt bag has new charms: leave the close-up rather than aim at a stale one
  if (bp) { holder.remove(bp.group); bp.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
  bp = buildBackpack(state.l, {charms: state.charms}); holder.add(bp.group); bp.setOpen(t); tracked = {}; sampledAt = 0;
  // Things sit in the compartment they belong to: favours, keys and small treasures in the front pocket, the rest in the
  // main compartment. A full compartment spills into the other one.
  sprites = []; const free = {back: [...bp.sockets.back], front: [...bp.sockets.front]}; has.back = has.front = false;
  for (const it of state.items) {
   const want2 = it.compartment || (/^quest-|key|stamp|charm/i.test(it.id) ? 'front' : 'back'), h = free[want2].length ? want2 : free[want2 === 'front' ? 'back' : 'front'].length ? (want2 === 'front' ? 'back' : 'front') : null; if (!h) continue;
   const p = free[h].shift(), s = new T.Sprite(new T.SpriteMaterial({map: itemTexture(it.icon), transparent: true, depthWrite: false}));
   s.scale.setScalar(.25); s.position.copy(p); s.userData.item = it; s.userData.comp = h; s.renderOrder = 5; bp[h].add(s); sprites.push(s); has[h] = true;
  }
  // Coins are scrapped (Evan, 20:51Z): no gold pile floats in the front half any more.
  coinPile = null;
  for (const h of ['back', 'front']) { const c = bp.covers[h]; if (!has[h]) { zip[h].k = zip[h].want = 0; } bp.setZip(h, zip[h].k); c.pull.visible = has[h]; }
  // A rebuild (new item, new look) keeps the item she is looking at in her hands.
  if (insp) { const sp = sprites.find(x => x.userData.item.id === insp.item.id); if (sp) { insp.src = sp; insp.item = sp.userData.item; sp.visible = false; } else if (insp.item.id !== 'coins' || !coinPile) release(true); else { insp.src = coinPile; coinPile.visible = false; } }
  fit();
 }
 function fit() {
  const w = el.clientWidth || 300, h = el.clientHeight || 300; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
 }
 const ro = new ResizeObserver(fit); ro.observe(el);
 rebuild();
 // The Meshy charms arrive after the first frame; the backpack is rebuilt with them (and keeps its pose).
 loadCharmModels(state.charms).then(got => { if (got) rebuild(); });

 // Which facet a part of the backpack belongs to: tap the part and its cards come up (Evan, 16:34Z).
 const facetOf = o => {
  for (; o && o !== bp.group; o = o.parent) {
   const n = o.name || '';
   if (/^charm /.test(n)) return 'charm';
   if (/^lining/.test(n)) return 'lining';
   if (/pocket/.test(n)) return 'pocket';
   if (/strap|handle|piping|buckle|zip|clip|nozzle|fin$/.test(n)) return 'trim';
   if (/^shell|ear$|flap|rolled top|plate|colour block|lid band/.test(n)) return 'colour';
  }
  return 'style';
 };
 let glow = null;
 function highlight(f) {
  glow = f;
  bp.group.traverse(o => { if (!o.isMesh || !o.material?.emissive) return; const m = o.material;
   m.userData.base ??= {c: m.emissive.getHex(), i: m.emissiveIntensity};
   if (!(f && facetOf(o) === f)) { m.emissive.setHex(m.userData.base.c); m.emissiveIntensity = m.userData.base.i; } });
 }

 // Taps: an item names itself, a charm brings the camera in close, a part (while decorating) deals its cards,
 // anything else opens or closes the backpack.
 const ray = new T.Raycaster(), ndc = new T.Vector2();
 const pick = (x, y) => { const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -(y - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam); return ray; };
 const hitPart = (x, y) => { const h = pick(x, y).intersectObject(bp.group, true).find(h => h.object.visible && !h.object.isSprite); return h ? facetOf(h.object) : null; };
 canvas.addEventListener('pointerdown', e => { touches.set(e.pointerId, e); drag = {x: e.clientX, y: e.clientY, yaw: yawWant, moved: touches.size > 1, pinch: touches.size > 1 ? gap() : 0, zoom}; canvas.setPointerCapture?.(e.pointerId); });
 const gap = () => { const [a, b] = [...touches.values()]; return a && b ? Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) : 0; };
 canvas.addEventListener('pointercancel', e => { touches.delete(e.pointerId); drag = null; });
 canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.55, Math.min(1.6, zoom * (1 + e.deltaY * .0012))); }, {passive: false});
 canvas.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) touches.set(e.pointerId, e); if (!drag) return;
  if (touches.size > 1 && drag.pinch) { zoom = Math.max(.55, Math.min(1.6, drag.zoom * drag.pinch / Math.max(1, gap()))); return; }
  const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true;
  if (focus != null) { if (Math.abs(dx) > 40 && !drag.swiped) { drag.swiped = true; api.focusCharm(focus + (dx < 0 ? 1 : -1)); } return; }
  yawWant = drag.yaw + dx * .01; idle = 0; });
 canvas.addEventListener('pointerup', e => {
  touches.delete(e.pointerId); const d = drag; drag = null; if (!d || d.moved) return;
  const r = pick(e.clientX, e.clientY);
  if (insp) { release(); return; }
  if (want > .5 && !deck) {
   const live = [...sprites.filter(x => x.visible), ...(coinPile?.visible ? [coinPile] : []), ...['back', 'front'].flatMap(h => [bp.covers[h].group.visible ? bp.covers[h].group : null, bp.covers[h].pull.visible ? bp.covers[h].pull : null].filter(Boolean))];
   const hit = r.intersectObjects(live, true)[0];
   if (hit) { let o = hit.object; while (o && !o.userData.item && !o.userData.zip) o = o.parent; if (o?.userData.zip) { api.zip(o.userData.zip); return; } if (o) { inspect(o.userData.item, o); return; } }
  }
  const ch = r.intersectObjects(bp.charms.map(p => p.mesh), true)[0];
  if (ch) { let o = ch.object; while (o && !o.userData.charm) o = o.parent; const i = bp.charms.findIndex(p => p.mesh === o); if (i >= 0) { api.focusCharm(i); return; } }
  if (focus != null) { api.unfocus(); return; }
  if (deck) { const f = hitPart(e.clientX, e.clientY), g = f && f !== 'charm' ? f : 'style'; deck.show(g); onDeal?.(g); highlight(g !== 'style' ? g : null); return; }
  // The loadout (loadout.mjs): a tap on a part selects that slot; a tap on nothing lets it go. Opening is the host's.
  if (onPart && want < .9) { const f = hitPart(e.clientX, e.clientY); onPart(f === 'charm' ? null : f); return; }
  if (r.intersectObject(bp.group, true).length || want > .5) api.toggle();
 });
 let tag = null;
 function say(text, e, ms = 2200) {
  tag?.remove(); tag = document.createElement('div'); tag.className = 'aw-bp-tag'; tag.textContent = text;
  const r = el.getBoundingClientRect(), x = e ? e.clientX - r.left - 60 : r.width / 2 - 100, y = e ? e.clientY - r.top - 46 : r.height - 70;
  Object.assign(tag.style, {position: 'absolute', left: Math.max(8, Math.min(r.width - 220, x)) + 'px', top: Math.max(6, y) + 'px', zIndex: 3, maxWidth: '220px', padding: '6px 11px', borderRadius: '14px',
   background: 'linear-gradient(160deg,#ffffffe8,#ffffffb8)', color: '#3a2a4a', font: '600 13px/1.25 var(--app-font,system-ui)', boxShadow: '0 8px 20px -8px #2a103066,inset 0 1px 0 #fff', pointerEvents: 'none'});
  el.append(tag); const me = tag; setTimeout(() => { me.style.transition = 'opacity .3s'; me.style.opacity = 0; setTimeout(() => me.remove(), 320); }, ms);
 }

 // Decorating is a card game (Evan, 16:34Z: "use the card system ... click the part of the backpack to change then the
 // cards show and you drop into the facet"). The cards are Cards v3 faces (backpack-cards.mjs); dropping one on the
 // backpack, or tapping it, puts that choice on.
 let deck = null;
 async function mountDeck(first = 'style') {
  const {cardDeck} = await import('./backpack-cards.mjs?v=6');
  if (deck || !alive) return;
  deck = cardDeck(deckHost || el, {look: () => state.l, split: !!deckHost,
   onDrop: (facet, value, x, y) => { const f = facet === 'style' ? 'style' : facet; const over = x == null || hitPart(x, y) != null || !!overSlot?.(x, y, f); if (!over) return false; apply(f, value); return true; }});
  deck.show(first); onDeal?.(first);
 }
 function apply(f, value) {
  if (f === 'style') change({style: value}, true); else change({[f]: value});
  burst = 1; if (f === 'lining') { want = Math.max(want, .62); }
  highlight(f === 'style' ? null : f);
  if (f === 'pattern') highlight('colour');
 }
 function change(patch, styleChange = false) {
  let nl = {...state.l, ...patch};
  if (styleChange) nl = {...styleOf(patch.style).look, notebook: state.l.notebook, style: patch.style};
  state.l = nl; rebuild(); if (glow) highlight(glow); onChange?.(nl);
  if (bp) bp.group.scale.setScalar(.9);
 }

 // Where each slot sits on screen: a grid of rays over the stage, every few frames. Each slot's bead goes on the hit of
 // its own part nearest a home spot on the silhouette (so the two straps get one bead, colour and pattern sit apart on
 // the shell); a part out of sight (the lining while shut, no pocket) falls back to that home spot.
 const HOME = {style: [.5, 0], colour: [.32, .3], pattern: [.66, .52], pocket: [.5, .74], trim: [.18, 0], lining: [.94, .24]};
 function sample() {
  const r = canvas.getBoundingClientRect(); if (!r.width) return;
  const N = 22, hits = {all: []}; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
   const x = r.left + (i + .5) / N * r.width, y = r.top + (j + .5) / N * r.height;
   const h = pick(x, y).intersectObject(bp.group, true).find(h => h.object.visible && !h.object.isSprite); if (!h) continue;
   const f = facetOf(h.object), q = [x, y, h.object, h.point]; (hits[f] ||= []).push(q); hits.all.push(q);
   x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  if (x1 < x0) { tracked = {}; bounds = null; return; }
  const c = r.width / N / 2; bounds = {left: x0 - c, top: y0 - c, right: x1 + c, bottom: y1 + c};
  const out = {};
  for (const [f, [hx, hy]] of Object.entries(HOME)) {
   const tx = x0 + hx * (x1 - x0), ty = y0 + hy * (y1 - y0), own = hits[f === 'pattern' ? 'colour' : f], src = f !== 'style' && own?.length ? own : hits.all;
   let best = src[0], bd = 1e18; for (const p of src) { const d = (p[0] - tx) ** 2 + (p[1] - ty) ** 2; if (d < bd) { bd = d; best = p; } }
   out[f] = {o: best[2], p: best[2].worldToLocal(best[3].clone()), lift: f === 'style' ? 40 : 0};
  }
  tracked = out;
 }
 // Each frame the tracked points are carried with their parts and projected, so the beads stay on as it bobs and turns.
 function project() {
  const r = canvas.getBoundingClientRect(), out = {}; if (!Object.keys(tracked).length) return;
  for (const [f, t] of Object.entries(tracked)) {
   if (!t.o.parent) continue; const v = t.o.localToWorld(tmpV.copy(t.p)).project(cam);
   out[f] = {x: r.left + (v.x + 1) / 2 * r.width, y: Math.max(r.top + 12, r.top + (1 - v.y) / 2 * r.height - t.lift)};
  }
  anchorsNow = out;
 }

 // The charm close-up: the camera comes in on one charm, it turns slowly, its quest is told; swipe for the next.
 let focus = null;
 const camPos = new T.Vector3(), camAt = new T.Vector3(), wantPos = new T.Vector3(), wantAt = new T.Vector3(), tmpV = new T.Vector3();
 let snapped = false, burst = 0, hop = 0; const fBox = new T.Box3(), fQ = new T.Quaternion(), fQ2 = new T.Quaternion(), fUp = new T.Vector3(0, 1, 0);

 // Looking closely at one thing: it comes out of its compartment into a larger view, with a short callout, and goes back.
 const iFrom = new T.Vector3(), iTo = new T.Vector3(), iDir = new T.Vector3(), iScale = new T.Vector3(), iQ = new T.Quaternion(), iEul = new T.Euler();
 function inspect(item, src) {
  if (insp) return;
  const mesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({map: itemTexture(item.icon, 512), transparent: true, side: T.DoubleSide, depthTest: false, toneMapped: false}));
  mesh.renderOrder = 20; mesh.name = 'inspected item'; scene.add(mesh); src.getWorldPosition(mesh.position);
  insp = {item, src, mesh, k: 0, dir: 1}; src.visible = false; showCallout(item); onFocus?.('item:' + item.id);
 }
 function finishRelease() { if (!insp) return; insp.src.visible = true; scene.remove(insp.mesh); insp.mesh.material.map?.dispose(); insp.mesh.material.dispose(); insp.mesh.geometry.dispose(); insp = null; }
 function release(now = false) { if (!insp) return; hideCallout(); onFocus?.(null); if (now) finishRelease(); else insp.dir = -1; }
 function showCallout(item) {
  hideCallout(); callout = document.createElement('div'); callout.className = 'aw-bp-callout'; callout.setAttribute('role', 'status');
  const name = Object.assign(document.createElement('b'), {textContent: item.name}), about = Object.assign(document.createElement('p'), {textContent: aboutOf(item)}), row = document.createElement('div'); row.className = 'aw-bp-crow';
  const btn = (text, cls, fn, label) => { const b = Object.assign(document.createElement('button'), {type: 'button', className: 'aw-bp-cbtn ' + cls, textContent: text}); if (label) b.setAttribute('aria-label', label); b.addEventListener('pointerdown', ev => ev.stopPropagation()); b.addEventListener('click', ev => { ev.stopPropagation(); fn(); }); return b; };
  if (item.id !== 'coins' && onUse) row.append(btn(item.fuel ? 'Charge' : 'Use', 'use', () => { const it = insp?.item; if (it) onUse(it); }));
  row.append(btn('Put back', 'back', () => release(), 'Put it back in the backpack'));
  callout.append(name, about, row); el.append(callout);
 }
 function hideCallout() { callout?.remove(); callout = null; }

 let raf = 0, prev = performance.now(), alive = true;
 const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
 function frame(now) {
  if (!alive) return; raf = requestAnimationFrame(frame);
  if (!el.isConnected) return;
  const dt = Math.min(.05, (now - prev) / 1000); prev = now; idle += dt;
  const goal = deck && focus == null ? Math.max(want, .36) : want;
  t += Math.sign(goal - t) * Math.min(Math.abs(goal - t), dt / .55); const e = ease(t);
  bp.setOpen(e);
  if ((spin || float) && !drag && idle > 2 && want < .5 && !deck && !picking && focus == null) yawWant += dt * (float ? .12 : .25);
  // In close-up the bag turns its charm's seam toward you, rather than the camera flying round (or through) it.
  const fSide = focus != null && bp.charms[focus] ? Math.sign(bp.charms[focus].anchor.position.x || 1) : 0;
  if (focus != null) yawWant += (-fSide * 1.1 - yawWant) * Math.min(1, dt * 4);
  else if (want > .5 && !drag) yawWant += (.32 - yawWant) * Math.min(1, dt * 3);
  yawNow += (yawWant - yawNow) * Math.min(1, dt * 8);
  holder.rotation.y = yawNow;
  holder.rotation.x = -e * .38;
  const s = bp.group.scale.x; bp.group.scale.setScalar(s + (1 - s) * Math.min(1, dt * 10));
  holder.position.y = e * bp.H * .98;
  // The floating mini (Evan, 22:55Z): the backpack hangs in the air on its own and idles there, waiting to be touched.
  if (float) { const k = 1 - e * .7; holder.position.y += Math.sin(now / 900) * bp.H * .035 * k; holder.rotation.z = Math.sin(now / 1300) * .05 * k; holder.rotation.x += Math.sin(now / 1100) * .03 * k; }
  // The cover cloth hides what is inside by depth, so an item shows as the zip runs down past it.
  for (const sp of sprites) { sp.visible = e > .6 && insp?.src !== sp; sp.material.opacity = Math.min(1, (e - .6) * 4); }
  if (coinPile) coinPile.visible = insp?.src !== coinPile;
  if (picking === 'lining') zip.back.want = zip.front.want = 0; else if (want < .5) for (const h of ['back', 'front']) zip[h].want = has[h] ? 1 : 0;
  for (const h of ['back', 'front']) { const z = zip[h]; z.k += (z.want - z.k) * Math.min(1, dt * 6); if (Math.abs(z.want - z.k) < .003) z.k = z.want; z.wig = Math.max(0, z.wig - dt * 2.2); bp.setZip(h, z.k); bp.covers[h].pull.rotation.z = Math.sin(now / 45) * z.wig * .6; }
  // Glow the part being decorated, gently.
  if (glow) { const k = .18 + .12 * Math.sin(now / 260) + burst * .5; bp.group.traverse(o => { if (o.isMesh && o.material?.emissive && facetOf(o) === glow) { o.material.emissive.setHex(0xfff3d0); o.material.emissiveIntensity = k; } }); }
  burst = Math.max(0, burst - dt * 2);
  const H = bp.H, fov = cam.fov * Math.PI / 180;
  if (focus != null && bp.charms[focus]) {
   const p = bp.charms[focus]; scene.updateMatrixWorld(true);
   const body = p.mesh.children[1]; fBox.setFromObject(body).getCenter(wantAt);
   // Turn the charm's face to the camera whatever its chain is doing, with a slow sway.
   body.parent.getWorldQuaternion(fQ).invert(); body.quaternion.copy(fQ).multiply(fQ2.setFromAxisAngle(fUp, .45 * Math.sin(now / 900))); hop = Math.max(0, hop - dt * .9);
   // Frame it from in front; between charms the camera steps back a little so the swap reads as a move.
   if (!p.size) { const b = new T.Box3().setFromObject(body), v = b.getSize(new T.Vector3()); p.size = Math.max(v.x, v.y, v.z) || .1; }
   const d = Math.max(.3, p.size * 2.6) * zoom * (1 + hop * 1.6);
   wantPos.copy(wantAt).add(tmpV.set(fSide * d * .12, d * .15, d));
  } else {
   const inHand = deck && !deckHost, ty = H * (.5 + .5 * e) + (inHand ? -H * .12 : 0), span = H * (1.35 + e * 1.15) * (inHand ? 1.45 : 1), wide = (bp.W + .5) * 1.25;
   const dist = Math.max(span / 2 / Math.tan(fov / 2), wide / 2 / Math.tan(fov / 2) / cam.aspect) * (float && !deck ? .86 : 1.08);
   wantAt.set(0, ty, 0); wantPos.set(0, ty + .35 * (1 - e) + .1, dist * zoom);
  }
  if (!snapped) { camPos.copy(wantPos); camAt.copy(wantAt); snapped = true; }
  const k = Math.min(1, dt * (focus != null ? 4 : 7)); camPos.lerp(wantPos, k); camAt.lerp(wantAt, k);
  cam.position.copy(camPos); cam.lookAt(camAt);
  floor.visible = !float && e < .5 && focus == null; floor.material.opacity = .18 * (1 - e * 2);
  if (insp) {
   insp.k = Math.max(0, Math.min(1, insp.k + insp.dir * dt / .5)); const ek = ease(insp.k);
   const d = camPos.distanceTo(camAt) * .5, vh = 2 * Math.tan(fov / 2) * d, size = Math.min(vh, vh * cam.aspect) * .62;
   insp.src.getWorldPosition(iFrom); insp.src.getWorldScale(iScale);
   cam.getWorldDirection(iDir); iTo.copy(cam.position).addScaledVector(iDir, d).addScaledVector(cam.up, vh * .06);
   insp.mesh.position.lerpVectors(iFrom, iTo, ek); insp.mesh.scale.setScalar(iScale.x + (size - iScale.x) * ek);
   insp.mesh.quaternion.copy(cam.quaternion).multiply(iQ.setFromEuler(iEul.set(.12 * ek, ek * .5 * Math.sin(now / 700), 0)));
   if (insp.dir < 0 && insp.k <= 0) finishRelease();
  }
  bp.update(dt);
  renderer.render(scene, cam);
  if (onPart) { if (now - sampledAt > 400) { sampledAt = now; sample(); } project(); }
 }
 raf = requestAnimationFrame(frame);

 const api = {
  canvas, get isOpen() { return want > .5; },
  open() { want = 1; idle = 0; if (!hinted && (has.back || has.front)) { hinted = true; setTimeout(() => alive && want > .5 && !insp && say('Tap a zip to open a pocket', null, 2600), 900); } }, close() { release(true); want = 0; idle = 0; api.unfocus(); }, toggle() { if (want > .5) release(true); want = want > .5 ? 0 : 1; idle = 0; },
  // The compartments: zip('back') runs the main compartment's zip, zip('front') the front pocket's; open true/false forces it.
  zip(h, open) { const z = zip[h]; if (!z || !has[h]) return; z.want = open == null ? (z.want > .5 ? 0 : 1) : open ? 0 : 1; z.wig = 1; if (want < .5) want = 1; say(`${h === 'front' ? 'Front pocket' : 'Main pocket'} ${z.want ? 'zipped shut' : 'open'}`, null, 1400); },
  zipped(h) { return zip[h]?.want > .5; }, get compartments() { return {back: {items: sprites.filter(x => x.userData.comp === 'back').map(x => x.userData.item.id), zipped: zip.back.want > .5}, front: {items: [...sprites.filter(x => x.userData.comp === 'front').map(x => x.userData.item.id), ...(coinPile ? ['coins'] : [])], zipped: zip.front.want > .5}}; },
  inspect(id) { const sp = sprites.find(x => x.userData.item.id === id) || (id === 'coins' && coinPile); if (sp) inspect(sp.userData.item, sp); return !!sp; },
  release() { release(); }, get inspecting() { return insp ? insp.item : null; },
  get look() { return state.l; },
  setLook(nl) { state.l = look(nl); rebuild(); },
  setContents({items: it = state.items, coins: c = state.coins, charms: ch = state.charms} = {}) { state.items = it; state.coins = c; state.charms = ch; rebuild(); },
  // Decorate (the old name dressUp is kept for callers): the backpack opens part way, the style cards are dealt.
  dressUp(on = true) { if (on && !deck) { focus = null; mountDeck(); } else if (!on && deck) { deck.dispose(); deck = null; highlight(null); } },
  // Deal one facet's hand (the slots around the floating backpack); null puts the hand away.
  deal(f) { if (f == null) { api.dressUp(false); onDeal?.(null); return; } focus = null; if (!deck) mountDeck(f); else { deck.show(f); onDeal?.(f); } highlight(f === 'style' ? null : f === 'pattern' ? 'colour' : f); },
  get dealt() { return deck?.facet || null; },
  // The loadout's slots on the model, in client px: anchors(), select(f) glows a slot and holds the bag still (the
  // lining opens it part way), pick(f, value) puts a choice on.
  anchors() { return anchorsNow; }, get bounds() { return bounds; },
  select(f) { picking = f; focus = null; highlight(f === 'style' || f === 'notebook' ? null : f === 'pattern' ? 'colour' : f); if (f === 'lining') want = Math.max(want, .62); else if (want < .9) want = 0; idle = 0; },
  pick(f, value) { apply(f, value); if (f === 'style') highlight(null); },
  get charmCount() { return bp.charms.length; },
  focusCharm(i = 0) {
   const n = bp.charms.length; if (!n) { say('No charms yet: finish a quest to earn one.'); return; }
   const was = focus; if (was != null && bp.charms[was]) { bp.charms[was].mesh.children[1].quaternion.identity(); hop = 1; }
   focus = ((i % n) + n) % n; const p = bp.charms[focus], c = CHARMS.find(x => x.id === p.id);
   p.vx += 3; if (c) say(`${c.name}: ${c.quest}`, null, 3200); onFocus?.(focus);
  },
  unfocus() { if (focus == null) return; const p = bp.charms[focus]; if (p) p.mesh.children[1].quaternion.identity(); focus = null; onFocus?.(null); },
  get focused() { return focus; },
  say(text, ms) { say(text, null, ms); },
  bounce() { if (bp) bp.group.scale.setScalar(1.12); bp?.charms.forEach(p => p.vz += 3); },
  dispose() { release(true); alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); canvas.remove(); deck?.dispose(); tag?.remove(); }
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
const POCKET_PATHS = {round: 'M5 13a7 5.6 0 1 0 14 0a7 5.6 0 1 0-14 0z', square: 'M7.5 8h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', heart: 'M12 19s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.2A3.6 3.6 0 0 1 19 10c0 4.6-7 9-7 9z', star: 'M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7z', none: 'M12 12z'};
export const pocketPath = id => POCKET_PATHS[id] || POCKET_PATHS.none;
export function pocketSvg(id) {
 const p = {round: '<ellipse cx="12" cy="13" rx="7" ry="5.6"/>', square: '<rect x="5.5" y="8" width="13" height="10" rx="2"/>', heart: '<path d="M12 19s-7-4.4-7-9a3.6 3.6 0 0 1 7-1.2A3.6 3.6 0 0 1 19 10c0 4.6-7 9-7 9z"/>', star: '<path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7z"/>', none: '<path d="M6 18L18 6" stroke-width="2"/>'}[id];
 return `<svg viewBox="0 0 24 24" fill="#fff8" stroke="#2b1d0e" stroke-opacity=".6" stroke-width="1.4">${p}</svg>`;
}

function style() {
 if (document.getElementById('aw-bp-css')) return;
 const s = document.createElement('style'); s.id = 'aw-bp-css';
 s.textContent = `
 .aw-bp-dress{position:absolute;inset:0;pointer-events:none;z-index:2}
 .aw-bp-callout{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);z-index:5;width:max-content;max-width:min(300px,calc(100% - 12px));padding:8px 12px 10px;border-radius:20px;text-align:center;color:#3a2a4a;font:13px/1.3 var(--app-font,system-ui);
  background:linear-gradient(160deg,#ffffffec,#ffffffb4);box-shadow:inset 0 1.5px 0 #fff,0 12px 26px -10px #2a103077;animation:aw-bp-rise .28s cubic-bezier(.3,1.4,.5,1)}
 .aw-bp-callout b{display:block;font-size:15px}.aw-bp-callout p{margin:3px 0 7px;opacity:.85}
 .aw-bp-crow{display:flex;gap:8px;justify-content:center}
 .aw-bp-cbtn{min-width:78px;min-height:40px;padding:0 14px;border-radius:20px;border:1.5px solid #ffffffe0;cursor:pointer;font:700 13px/1 var(--app-font,system-ui);color:#3a2a4a;background:linear-gradient(160deg,#ffffffe8,#ffffff90);box-shadow:inset 0 2px 0 #fff,inset 0 -5px 8px #0000001a,0 6px 14px -6px #2a103066}
 .aw-bp-cbtn.use{background:linear-gradient(160deg,#fff6c8,#ffd23f)}.aw-bp-cbtn:active{transform:scale(.94)}
 @keyframes aw-bp-rise{from{opacity:0;transform:translate(-50%,10px)}}
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
