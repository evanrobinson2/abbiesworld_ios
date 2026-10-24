// Scene Builder Lab (AW-STUDY-0062): the scene document and generators. Experimental (?exp=scene-builder), see game-registry.json.
// A scene is a base + an ordered list of ops. Everything shown is a pure fold over the ops, so any scene
// can be rebuilt, undone, exported and re-rendered later (docs/MODELER_VISION.md: preserve intent, not just output).
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash2 = (x, y, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2147483647); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; };
const vnoise = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
const fbm = (x, y, s, o = 3) => { let v = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, s + i * 31); n += a; a *= .5; f *= 2; } return v / n; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const key = (q, r) => q + ',' + r;
const hexDist = (q, r) => (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

// The four default choices. Everything else is the lab bench.
const FAMILIES = {
  ranch:     {name: 'Ranch',     places: ['Ranch'],                        heroes: ['barn', 'house'], scatter: [['tree', .15, 'forest'], ['bush', .07], ['rock', .04, 'high'], ['fence', .13, 'hero'], ['hay', .06, 'hero'], ['lamp', .03, 'hero']], life: ['cow', 'sheep', 'chicken'], lifeN: 5, ground: 'grass'},
  woodland:  {name: 'Woodland',  places: ['Woodland'],                     heroes: ['tent'],          scatter: [['pine', .38, 'forest'], ['bush', .08], ['rock', .07], ['log', .05], ['mushroom', .05]], life: ['deer', 'rabbit'], lifeN: 4, ground: 'grass'},
  coast:     {name: 'Coast',     places: ['Coast'],                        heroes: ['house', 'dock'], scatter: [['palm', .28, 'shore'], ['umbrella', .14, 'shore'], ['rock', .08], ['boat', .5, 'water'], ['bush', .14], ['palm', .06], ['fence', .06, 'hero']], life: ['gull', 'person'], lifeN: 3, ground: 'sand'},
  town:      {name: 'Town',      places: ['Town', 'Winchester', 'Cafe'],   heroes: ['house', 'shop', 'house'], scatter: [['house', .14, 'hero'], ['lamp', .1, 'hero'], ['tree', .07], ['bench', .05, 'hero'], ['crate', .03]], life: ['person', 'dog'], lifeN: 5, ground: 'grass'},
  moon:      {name: 'Moon base', places: ['Moon base', 'Space'],           heroes: ['dome', 'solar'], scatter: [['rock', .13], ['antenna', .06, 'hero'], ['crate', .06, 'hero'], ['rover', .03]], life: ['astronaut'], lifeN: 3, ground: 'regolith'},
  wasteland: {name: 'Wasteland', places: ['Wasteland'],                    heroes: ['tent', 'wreck'], scatter: [['deadtree', .1], ['barrel', .07, 'hero'], ['rock', .1], ['scarecrow', .03]], life: ['crow'], lifeN: 3, ground: 'dust'},
};
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const TOPOS = {meadow: 'Meadow', hills: 'Rolling hills', valley: 'Valley', ridge: 'Mountain ridge', island: 'Island', crater: 'Crater'};
const STYLES = {
  still:  {name: 'Still life', note: 'A diorama. Nothing moves until you say.', sim: 0,   life: 0,   wx: 0,   density: .95},
  cozy:   {name: 'Cozy',       note: 'Slow days, gentle weather, a few friends.', sim: .5,  life: 1,   wx: .25, density: 1},
  lively: {name: 'Lively',     note: 'Busy days, more creatures, changing skies.', sim: 1,   life: 1.7, wx: .55, density: 1.2},
  wild:   {name: 'Wild',       note: 'Storms roll in. Fewer things, more weather.', sim: 1.5, life: 1.3, wx: 1,   density: .8},
};
const TYPE_OF = {tree: 'Plant', pine: 'Plant', palm: 'Plant', bush: 'Plant', deadtree: 'Plant', mushroom: 'Plant', house: 'Building', shop: 'Building', barn: 'Building', tent: 'Building', dome: 'Building', dock: 'Building',
  rock: 'Prop', fence: 'Prop', hay: 'Prop', lamp: 'Prop', crate: 'Prop', barrel: 'Prop', log: 'Prop', bench: 'Prop', umbrella: 'Prop', solar: 'Prop', antenna: 'Prop', scarecrow: 'Prop', boat: 'Vehicle', rover: 'Vehicle', wreck: 'Vehicle'};
const defaults = () => ({
  recipe: {family: 'ranch', season: 'summer', topo: 'hills', style: 'cozy', seed: 1234, radius: 5, relief: 1, scale: 1, water: null, out: []},
  env: {hour: 14, weather: 'auto', wind: .3, gravity: 9.81, timeScale: 1, bounce: .35, realClock: false},
});

// ---- terrain -------------------------------------------------------------------------------------------------
const defaultWater = t => ({island: 1, valley: -1, crater: -1}[t] ?? -1);
function genCells(rc) {
  const R = rc.radius, cells = new Map(), sc = .38 / rc.scale, wl = rc.water ?? defaultWater(rc.topo);
  for (let q = -R; q <= R; q++) for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
    const wx = q + r / 2, wy = r * .866, nd = hexDist(q, r) / R, n = fbm(wx * sc, wy * sc, rc.seed, 3);
    let v;
    switch (rc.topo) {
      case 'meadow': v = .18 + .1 * n; break;
      case 'hills': v = .15 + .6 * Math.pow(n, 1.25); break;
      case 'valley': v = .12 + .85 * Math.pow(nd, 1.4) * (.55 + n * .8); break;
      case 'ridge': v = .08 + .95 * (1 - Math.abs(2 * fbm(wx * sc * .8, wy * sc * .8, rc.seed + 9, 2) - 1)) * (.55 + .45 * n); break;
      case 'island': v = (1 - Math.pow(nd, 1.8)) * (.35 + .75 * n) - .08; break;
      case 'crater': v = .16 + .7 * Math.exp(-Math.pow((nd - .68) / .17, 2)) - .12 * (nd < .5 ? 1 : 0) + .1 * n; break;
      default: v = .2;
    }
    const h = clamp(Math.round(v * rc.relief * 7), 0, 7);
    cells.set(key(q, r), {q, r, h, wl, water: h < wl, rv: hash2(q, r, rc.seed)});
  }
  return cells;
}
const neighbors = (W, c) => DIRS.map(([dq, dr]) => W.cells.get(key(c.q + dq, c.r + dr))).filter(Boolean);
const slopeOf = (W, c) => Math.max(0, ...neighbors(W, c).map(n => Math.abs(n.h - c.h)));
const nearWater = (W, c) => neighbors(W, c).some(n => n.water);

// ---- auto decorate: the first pass. Pure function of recipe + terrain, so it can be re-rolled, locked around and replayed ----
function autoProps(W) {
  const rc = W.recipe, fam = FAMILIES[rc.family], st = STYLES[rc.style], R = rc.radius, rnd = mulberry(rc.seed * 7 + 11), out = new Set(rc.out);
  const props = [], taken = new Set([...W.props.values()].filter(p => p.own).map(p => key(p.q, p.r))), ok = k => !taken.has(k) && !W.ban.has(k);
  const cells = [...W.cells.values()].filter(c => !c.water);
  const flat = c => 3 * slopeOf(W, c) + hexDist(c.q, c.r) / R + (nearWater(W, c) ? 1 : 0);
  const add = (kind, c, rule, extra = {}) => { if (out.has(TYPE_OF[kind])) return false; const k = key(c.q, c.r); if (!ok(k)) return false; taken.add(k); props.push({id: 'a:' + kind + '@' + k, kind, q: c.q, r: c.r, s: .9 + rnd() * .25, v: rnd(), rule, own: false, ...extra}); return true; };
  const heroes = [];
  [...cells].sort((a, b) => flat(a) - flat(b)).forEach(c => { if (heroes.length >= fam.heroes.length || heroes.some(h => hexDist(h.q - c.q, h.r - c.r) < 2)) return; const kind = fam.heroes[heroes.length]; if (kind === 'dock') return; if (add(kind, c, 'hero')) heroes.push(c); });
  if (fam.heroes.includes('dock')) { const s = cells.filter(c => nearWater(W, c)).sort((a, b) => a.rv - b.rv)[0]; if (s) add('dock', s, 'hero'); }
  const nearHero = c => Math.min(9, ...heroes.map(h => hexDist(h.q - c.q, h.r - c.r)));
  const forest = c => fbm((c.q + c.r / 2) * .55, c.r * .5, rc.seed + 77, 2);
  const order = [...W.cells.values()].sort((a, b) => hexDist(a.q, a.r) - hexDist(b.q, b.r) || a.rv - b.rv);
  for (const c of order) {
    for (const [kind, p, where] of fam.scatter) {
      let prob = p * st.density;
      if (where === 'water') { if (!c.water) continue; } else if (c.water) continue;
      if (where === 'forest') prob *= forest(c) > .5 ? 2.4 : .25;
      if (where === 'hero') { const d = nearHero(c); prob *= d <= 1 ? 2.2 : d <= 3 ? 1 : .05; }
      if (where === 'shore') { if (!nearWater(W, c)) continue; prob *= 2; }
      if (where === 'high') prob *= c.h >= 4 ? 3 : .4;
      if (['house', 'shop', 'barn', 'tent', 'dome'].includes(kind) && slopeOf(W, c) > 0) continue;
      if (slopeOf(W, c) > 2 && !['rock'].includes(kind)) continue;
      if (rnd() < prob && add(kind, c, where || 'scatter')) break;
    }
  }
  return props;
}

// ---- world fold ----------------------------------------------------------------------------------------------
function newWorld(base) {
  const W = {recipe: {...base.recipe, out: [...base.recipe.out]}, env: {...base.env}, hd: new Map(), props: new Map(), ban: new Set(), cells: null, uid: 0};
  regenTerrain(W); regenAuto(W); return W;
}
function regenTerrain(W) { W.cells = genCells(W.recipe); for (const [k, d] of W.hd) { const c = W.cells.get(k); if (c) { c.h = clamp(c.h + d, 0, 7); c.water = c.h < c.wl; } } }
function regenAuto(W) {
  for (const [k, p] of [...W.props]) if (!p.own) W.props.delete(k);
  for (const k of [...W.props.keys()]) { const p = W.props.get(k); if (!W.cells.has(key(p.q, p.r)) || (W.cells.get(key(p.q, p.r)).water && !['boat'].includes(p.kind))) W.props.delete(k); }
  for (const p of autoProps(W)) { const c = W.cells.get(key(p.q, p.r)); if (c && !W.props.has(key(p.q, p.r))) W.props.set(key(p.q, p.r), p); }
}
const TERRAIN_KEYS = ['topo', 'radius', 'relief', 'scale', 'water', 'seed'];
function applyOp(W, op) {
  switch (op.t) {
    case 'recipe': {
      const old = W.recipe[op.k]; W.recipe[op.k] = op.v;
      if (op.k === 'topo' || op.k === 'radius' || op.k === 'relief' || op.k === 'scale' || op.k === 'water' || op.k === 'seed') { if (op.k === 'topo' || op.k === 'radius') W.hd.clear(); regenTerrain(W); }
      if (op.k !== 'season' && old !== op.v) regenAuto(W);
      break; }
    case 'env': W.env[op.k] = op.v; break;
    case 'reroll': W.recipe.seed = op.v; regenTerrain(W); regenAuto(W); break;
    case 'place': { const c = W.cells.get(key(op.q, op.r)); if (!c || (c.water && op.kind !== 'boat')) break; W.props.set(key(op.q, op.r), {id: 'u:' + (++W.uid), kind: op.kind, q: op.q, r: op.r, s: op.s || 1, v: hash2(op.q, op.r, W.uid), rule: 'you', own: true}); W.ban.delete(key(op.q, op.r)); break; }
    case 'erase': { const k = key(op.q, op.r); if (W.props.delete(k)) W.ban.add(k); break; }
    case 'height': { const k = key(op.q, op.r), c = W.cells.get(k); if (!c) break; const nh = clamp(c.h + op.d, 0, 7); W.hd.set(k, (W.hd.get(k) || 0) + (nh - c.h)); c.h = nh; c.water = c.h < c.wl; const p = W.props.get(k); if (p && c.water && p.kind !== 'boat') W.props.delete(k); break; }
    case 'flatten': { const k = key(op.q, op.r), c = W.cells.get(k); if (!c) break; const avg = Math.round(neighbors(W, c).reduce((a, n) => a + n.h, c.h) / (neighbors(W, c).length + 1)); const d = avg - c.h; if (d) { W.hd.set(k, (W.hd.get(k) || 0) + d); c.h = avg; c.water = c.h < c.wl; } break; }
    case 'lock': { const p = W.props.get(key(op.q, op.r)); if (p) p.own = !p.own; break; }
    case 'scale': { const p = W.props.get(key(op.q, op.r)); if (p) p.s = clamp(p.s * op.f, .5, 2.2); break; }
  }
}
function fold(base, ops) { const W = newWorld(base); for (const op of ops) applyOp(W, op); return W; }
const worldHash = W => { const s = JSON.stringify([[...W.cells.values()].map(c => c.h), [...W.props.values()].map(p => [p.kind, p.q, p.r, +p.s.toFixed(2)]).sort(), W.recipe, W.env]); let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(16); };
const opLabel = op => ({recipe: () => `${op.k} → ${op.v}`, env: () => `${op.k} → ${typeof op.v === 'number' ? +op.v.toFixed(2) : op.v}`, reroll: () => 'Re-decorate (new seed)', place: () => `Place ${op.kind}`, erase: () => 'Erase', height: () => op.d > 0 ? 'Raise land' : 'Lower land', flatten: () => 'Smooth land', lock: () => 'Pin / unpin', scale: () => 'Resize'}[op.t]());
const autoWeather = (W, T) => { const rc = W.recipe, st = STYLES[rc.style]; if (rc.family === 'moon') return 'clear'; const v = fbm(T / 70, rc.seed * .01, rc.seed, 2) + (st.wx - .3) * .35;
  if (v < .42) return 'clear'; if (v < .55) return 'cloudy'; if (rc.season === 'winter') return v > .7 ? 'storm' : 'snow'; if (rc.family === 'wasteland') return v > .7 ? 'dust' : 'cloudy'; return v > .75 ? 'storm' : (rc.season === 'summer' ? 'cloudy' : 'rain'); };
export {FAMILIES, SEASONS, TOPOS, STYLES, TYPE_OF, defaults, fold, worldHash, applyOp, newWorld, opLabel, DIRS, key, hexDist, neighbors, slopeOf, autoWeather, mulberry, hash2, fbm, clamp};
