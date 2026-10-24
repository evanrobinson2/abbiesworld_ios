// Diorama engine (AW-STUDY-0060). Pure JS, no DOM: the page and tools/diorama-swipe/test.mjs both import it.
// Generator: recipes by deck (setting, role, scale, odd couples, upgrade pass) fill slots from the model library.
// Learner: every vote is replayed into per-asset, per-group and per-pair Beta counts; the next batch samples from them.
export const VERSION = 1;
export const DECKS = {
  setting: {t: 'By setting', line: 'One place, a hero building and the life around it'},
  role: {t: 'By role', line: 'Everything of one kind, gathered'},
  scale: {t: 'By scale', line: 'One giant with a crowd of tiny things'},
  odd: {t: 'Odd couples', line: 'Two places that never met'},
  upgrade: {t: 'Upgrade pass', line: 'The second-pass models, shown off'},
};
// Footprint size (hex side = 1) and ring preference per role.
export const SIZE = {Building: 0.95, Vehicle: 0.55, Machine: 0.5, Furniture: 0.32, People: 0.34, Animal: 0.3, Plant: 0.4, Prop: 0.26, Charm: 0.2};
const roleOf = t => t === 'Machine and tech' ? 'Machine' : t;

export function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gamma(k, r) { if (k < 1) return gamma(k + 1, r) * Math.pow(r(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { const u1 = r(), u2 = r(); x = Math.sqrt(-2 * Math.log(u1 || 1e-9)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = r(); if (u < 1 - .0331 * x ** 4 || Math.log(u || 1e-9) < .5 * x * x + d * (1 - v + Math.log(v))) return d * v; } }
const beta = (a, b, r) => { const x = gamma(a, r), y = gamma(b, r); return x / (x + y); };

// ---- learner -------------------------------------------------------------------------------------------------------
// Counts are {l, h} = likes (hot dog) and hates (not hot dog). A pick onto the board counts as two likes.
export class Learner {
  constructor(items) { this.items = items; this.by = new Map(items.map(i => [i.key, i])); this.asset = new Map(); this.group = new Map(); this.pair = new Map(); this.n = 0; this.likes = 0; this.history = []; }
  static groupsOf(i) { return ['t:' + i.type, 'p:' + i.place, 'pt:' + i.place + '|' + i.type, 'c:' + i.collection, 's:' + i.source, 'u:' + (i.pass || 'Original')]; }
  static bump(map, k, like, w) { const c = map.get(k) || {l: 0, h: 0}; like ? c.l += w : c.h += w; map.set(k, c); }
  vote(keys, like, w = 1, count = true) {
    for (const k of keys) { Learner.bump(this.asset, k, like, w); const i = this.by.get(k); if (i) for (const g of Learner.groupsOf(i)) Learner.bump(this.group, g, like, w); }
    for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) Learner.bump(this.pair, keys[a] < keys[b] ? keys[a] + '~' + keys[b] : keys[b] + '~' + keys[a], like, w);
    if (count) { this.n++; if (like) this.likes++; }
  }
  // Pick (placed on the board): an extra like, not a new vote.
  pick(keys) { this.vote(keys, true, 2, false); }
  rate(c, prior = .5, k = 4) { return ((c?.l || 0) + prior * k) / ((c?.l || 0) + (c?.h || 0) + k); }
  groupPrior(i) { const r = Learner.groupsOf(i).map(g => this.rate(this.group.get(g))); return r.reduce((a, b) => a + b, 0) / r.length; }
  assetCounts(i) { const p = this.groupPrior(i), c = this.asset.get(i.key) || {l: 0, h: 0}; return {a: p * 4 + c.l, b: (1 - p) * 4 + c.h}; }
  mean(i) { const {a, b} = this.assetCounts(i); return a / (a + b); }
  sample(i, r) { const {a, b} = this.assetCounts(i); return beta(a, b, r); }
  pairRate(x, y) { const k = x < y ? x + '~' + y : y + '~' + x; return this.rate(this.pair.get(k), .5, 3); }
  // The generator's own guess that a diorama is a hot dog.
  predict(keys) { const m = keys.map(k => this.mean(this.by.get(k))); let s = m.reduce((a, b) => a + b, 0) / m.length, p = 0, n = 0; for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) { p += this.pairRate(keys[a], keys[b]); n++; } return n ? .7 * s + .3 * p / n : s; }
  top(n = 5, like = true) { return [...this.asset.entries()].map(([k, c]) => ({item: this.by.get(k), c, s: this.rate(c), n: c.l + c.h})).filter(x => x.item && x.n >= 1 && (like ? x.s > .5 : x.s < .5)).sort((a, b) => like ? b.s - a.s || b.n - a.n : a.s - b.s || b.n - a.n).slice(0, n); }
  groups(prefix, n = 4) { return [...this.group.entries()].filter(([k]) => k.startsWith(prefix)).map(([k, c]) => ({k: k.slice(prefix.length), s: this.rate(c), n: c.l + c.h})).sort((a, b) => b.s - a.s).slice(0, n); }
}

// ---- generator -----------------------------------------------------------------------------------------------------
const pick = (arr, r) => arr[Math.floor(r() * arr.length)];
export class Generator {
  constructor(items, learner, {explore = .18} = {}) {
    this.items = items.map(i => ({...i, role: roleOf(i.type)})); this.L = learner; this.explore = explore;
    this.byPlaceRole = new Map(); for (const i of this.items) { const k = i.place + '|' + i.role; if (!this.byPlaceRole.has(k)) this.byPlaceRole.set(k, []); this.byPlaceRole.get(k).push(i); }
    this.places = [...new Set(this.items.map(i => i.place))].filter(p => this.items.filter(i => i.place === p).length >= 6);
    this.roles = [...new Set(this.items.map(i => i.role))];
  }
  pool(role, places, chosen, filt) { let c = this.items.filter(i => i.role === role && places.includes(i.place) && !chosen.some(x => x.key === i.key)); if (filt) { const f = c.filter(filt); if (f.length) c = f; } return c; }
  // Thompson sample the learner's belief for each candidate, boosted by how well it pairs with what is already chosen; sometimes ignore taste.
  choose(cands, chosen, r) {
    if (!cands.length) return null;
    if (r() < this.explore) return pick(cands, r);
    let best = null, bs = -1;
    for (const c of cands.length > 60 ? Array.from({length: 60}, () => pick(cands, r)) : cands) {
      let s = this.L.sample(c, r);
      if (chosen.length) s = .75 * s + .25 * chosen.reduce((a, x) => a + this.L.pairRate(c.key, x.key), 0) / chosen.length;
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }
  recipe(deck, r) {
    const places = this.places, chosen = [], take = (role, n, ps, filt) => { for (let i = 0; i < n; i++) { const c = this.choose(this.pool(role, ps, chosen, filt), chosen, r); if (c) chosen.push(c); } };
    let place, label;
    if (deck === 'setting' || deck === 'upgrade') {
      const withB = places.filter(p => this.byPlaceRole.has(p + '|Building')); place = pick(withB, r); const up = deck === 'upgrade' ? i => i.pass === 'Upgrade' : null;
      if (deck === 'upgrade') { const ups = withB.filter(p => this.items.some(i => i.place === p && i.pass === 'Upgrade')); place = pick(ups.length ? ups : withB, r); }
      take('Building', 1, [place], up); take('Plant', 1 + (r() < .6), [place], up); take('Animal', r() < .6 ? 1 : 0, [place], up); take('People', 1, [place], up);
      take(pick(['Vehicle', 'Furniture', 'Machine'], r), 1, [place], up); take('Prop', 2, [place], up); label = place;
    } else if (deck === 'role') {
      const role = pick(this.roles.filter(x => x !== 'Charm'), r); place = pick(places.filter(p => (this.byPlaceRole.get(p + '|' + role) || []).length >= 4), r) || null;
      take(role, 6, place ? [place] : places); label = (place ? place + ' ' : '') + role.toLowerCase() + 's';
    } else if (deck === 'scale') {
      place = pick(places, r); take(pick(['Building', 'Vehicle'], r), 1, [place]); for (const role of ['Prop', 'Plant', 'People', 'Animal', 'Prop', 'Furniture']) take(role, 1, [place]); label = place + ', big and tiny';
    } else { // odd couples
      const a = pick(places, r); let b = pick(places, r); for (let g = 0; g < 5 && b === a; g++) b = pick(places, r); place = a;
      take('Building', 1, [a]); take('Plant', 1, [b]); take('People', 1, [b]); take('Animal', 1, [a, b]); take('Vehicle', 1, [b]); take('Prop', 1, [a]); take('Prop', 1, [b]); label = a + ' meets ' + b;
    }
    return {place, label, items: chosen};
  }
  // Layout on a hex (flat-top, side 1): biggest near the centre, the rest on a loose ring with spacing.
  layout(rec, r) {
    const its = [...rec.items].sort((a, b) => SIZE[b.role] - SIZE[a.role]), placed = [];
    const inHex = (x, z, m) => { const ax = Math.abs(x), az = Math.abs(z); return az <= .866 - m * .9 && ax * .866 + az * .5 <= .866 - m * .9 + .0001; };
    for (const it of its) {
      const s = (SIZE[it.role] || .3) * (rec.deck === 'role' && its.length > 4 ? (it.role === 'Building' ? .55 : it.role === 'Vehicle' ? .75 : .9) : 1) * (rec.deck === 'scale' && placed.length ? .8 : 1) * (rec.deck === 'scale' && !placed.length ? 1.15 : 1), rad = s * .5;
      let spot = null;
      for (let g = 0; g < 80 && !spot; g++) {
        const ang = r() * Math.PI * 2, d = placed.length === 0 ? r() * .12 : (.28 + r() * .55) * (g > 50 ? .6 : 1), x = Math.cos(ang) * d, z = Math.sin(ang) * d;
        if (inHex(x, z, rad * .6) && placed.every(p => Math.hypot(p.x - x, p.z - z) > (p.rad + rad) * .78)) spot = {x, z};
      }
      spot ||= {x: (r() - .5) * .8, z: (r() - .5) * .6};
      placed.push({key: it.key, role: it.role, x: spot.x, z: spot.z, rad, size: s, rot: (placed.length === 0 ? (r() < .5 ? 0 : Math.PI / 6) : 0) + r() * Math.PI * 2 * (it.role === 'Building' ? 0 : 1)});
    }
    return placed;
  }
  make(deck, seed) { const r = mulberry32(seed); const rec = this.recipe(deck, r); rec.deck = deck; if (rec.items.length < 3) return null; return {id: deck + '-' + seed.toString(36), seed, deck, label: rec.label, place: rec.place, keys: rec.items.map(i => i.key), layout: this.layout(rec, r)}; }
  // A batch: many candidates per slot, keep the ones the learner expects to land best, always leaving room to be surprised.
  batch(n, seedBase, {deckBias} = {}) {
    const decks = Object.keys(DECKS), out = [], seen = new Set(); let seed = seedBase;
    const pool = [];
    for (let i = 0; i < n * 5 && pool.length < n * 4; i++) { const deck = decks[(i + seedBase) % decks.length]; const d = this.make(deck, ++seed * 7919 + i); if (d && !seen.has(d.keys.slice().sort().join())) { seen.add(d.keys.slice().sort().join()); d.guess = this.L.predict(d.keys); pool.push(d); } }
    pool.sort((a, b) => b.guess - a.guess);
    const greedy = pool.slice(0, Math.ceil(n * .7)), rest = pool.slice(Math.ceil(n * .7)), r = mulberry32(seedBase ^ 0x9e3779b9);
    while (greedy.length < n && rest.length) greedy.push(rest.splice(Math.floor(r() * rest.length), 1)[0]);
    // Interleave so decks alternate rather than arriving in guess order.
    greedy.sort((a, b) => (a.seed % 97) - (b.seed % 97)); return greedy.slice(0, n);
  }
}

export function summarize(votes, size = 10) { const out = []; for (let i = 0; i < votes.length; i += size) { const b = votes.slice(i, i + size); out.push({n: b.length, rate: b.filter(v => v.vote === 'liked').length / b.length, guess: b.reduce((a, v) => a + (v.guess ?? .5), 0) / b.length}); } return out; }
