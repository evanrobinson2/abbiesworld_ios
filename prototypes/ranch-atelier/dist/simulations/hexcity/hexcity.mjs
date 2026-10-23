// The hex city (AW-STUDY-0033). The founding tile is split into small hexes, each a city block of about a tenth of a
// hectare, and the town grows on them year by year from the land under them. Systems, each from first principles:
//  - Water: wells where the water table is shallow; later a channel from the spring at a steady fall, which can only
//    feed fountains below the level it arrives at (gravity decides who gets running water).
//  - Food and goods chains (in the spirit of Anno): fields, boats, groves, flocks, vines, woods and clay in the land
//    around the tile, worked by people who walk out to them; mill, bakery, press, weaver, kiln and carpenter in town.
//  - Four kinds of household, each with its own needs and its own work. A household that has what the next kind needs
//    becomes that kind, and stops doing the work it did before (the town has to keep a mix).
//  - Services reach as far as people will walk on the real streets: market, fountain, bath, school, temple, theatre,
//    fire watch. Streets are where feet went: worn paths become gravel, then paving.
//  - A place's pull (desirability): the view of the sea, height, gardens and temples near, smoke and noise downwind.
//  - Fire in thatch, floods from the river, births, deaths, newcomers and leavers.
// The council builds a work only when the need is measured, and records why. The story is the event log.
// Deterministic for a seed and a list of player edits. No three.js, no DOM.
import { ASSUMPTIONS as LA, rng, Heap, walkField, round } from './headland.mjs';

export const CITY = {
 s: 20, R: 8,                       // hex block: 20 m to a corner (0.1 ha); the tile is 8 rings (217 blocks, ~590 m across)
 hinterland: 1800,                  // metres: land around the tile that town people walk out to work
 dayHours: 10,                      // a working day; walking out and back comes out of it
 eat: 250,                          // kg of grain (or the same in fish) a person eats in a year
 grain: 900, fallow: 1.5, farmHa: 8,// kg per hectare after seed (alluvium, beans in the rotation); a third fallow; ha a household ploughs with oxen
 fishFeeds: 10, boatsPerHa: 2,      // people one fishing household feeds; boats the sheltered water holds per hectare
 oil: 200, oilHa: 3, oilNeed: 8,    // kg of oil per hectare of olives; ha a household tends; kg a person uses
 wool: 25, flockHa: 30, clothNeed: 3,// kg of wool per hectare of pasture; ha one shepherd keeps; kg of cloth a person
 wine: 1500, vineHa: 1.5, wineNeed: 120, // litres per hectare; ha a household tends; litres a well-off person drinks
 timber: 4, woodHa: 40,             // m3 per hectare a year, cut sustainably; ha one woodcutter household works
 houseTimber: 6, houseTiles: 2000,  // to build or raise a house: m3 of timber; roof tiles for a tiled roof
 tilesPerKiln: 40000,               // roof tiles a kiln fires in a year
 hh: [0, 3, 5, 8, 10],              // households a block holds, by kind
 people: 5,                         // people in a household
 litres: 30, bathLitres: 120000,    // water a person uses a day; a bath a day
 well: 12000, wellDeep: 10,         // litres a day a well gives; wells deeper than this many metres are not dug
 fall: .003,                        // the channel's fall: 3 m per km
 lossChannel: .2,                   // a fifth leaks on the way
 birth: .036, death: .026,          // per person per year
 trade: { grain: 1, oil: 4, wine: 2, cloth: 8, tiles: .6 }, // value in kg of grain: a kg of oil or cloth, a litre of wine, a tile
 fireRisk: .012,                    // chance a thatched block catches fire in a year, before the fire watch
 walkTo: { water: 150, market: 300, bath: 360, school: 360, temple: 420, theatre: 600, watch: 300 } // seconds people will walk
};
const K = CITY;
export const KINDS = ['', 'Settlers', 'Townsfolk', 'Artisans', 'Patrons'];
// What each kind needs to live as that kind (cumulative), and the work each kind does.
export const NEEDS = {
 1: ['water', 'food'],
 2: ['water', 'food', 'market', 'oil', 'cloth'],
 3: ['water', 'food', 'market', 'oil', 'cloth', 'fountain', 'bath', 'school', 'tiles'],
 4: ['water', 'food', 'market', 'oil', 'cloth', 'fountain', 'bath', 'school', 'tiles', 'temple', 'theatre', 'wine', 'view']
};
export const ZONES = ['', 'home', 'work', 'civic', 'field', 'green', 'harbour', 'water', 'river'];
// Works: zone, kind of worker, households of workers, where it may stand.
export const WORKS = {
 well:     { zone: 'civic', staff: 0 },
 fountain: { zone: 'civic', staff: 0 },
 castellum:{ zone: 'civic', staff: 0 },
 market:   { zone: 'civic', kind: 1, staff: 2 },
 harbour:  { zone: 'harbour', kind: 1, staff: 0 },
 mill:     { zone: 'work', kind: 1, staff: 2 },
 bakery:   { zone: 'work', kind: 1, staff: 2 },
 press:    { zone: 'work', kind: 1, staff: 2 },
 carpenter:{ zone: 'work', kind: 1, staff: 2 },
 weaver:   { zone: 'work', kind: 1, staff: 2 },
 kiln:     { zone: 'work', kind: 2, staff: 3 },
 bath:     { zone: 'civic', kind: 2, staff: 2 },
 school:   { zone: 'civic', kind: 2, staff: 1 },
 watch:    { zone: 'civic', kind: 2, staff: 1 },
 temple:   { zone: 'civic', kind: 3, staff: 1 },
 theatre:  { zone: 'civic', kind: 3, staff: 2 },
 garden:   { zone: 'green', staff: 0 }
};
export const WORK_IDS = Object.keys(WORKS);

// ---------- The tile and its blocks ----------
const SQ3 = Math.sqrt(3);
export const HEX_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export function hexCenter(q, r) { return [K.s * SQ3 * (q + r / 2), K.s * 1.5 * r]; }
export function makeTile(land, founding) {
 const L = land, N = L.N, C = LA.cell, ox = founding.x * C, oz = founding.y * C, hexes = [], index = new Map();
 const sample = (arr, x, z) => { const gx = Math.max(0, Math.min(N - 1.001, x / C)), gy = Math.max(0, Math.min(N - 1.001, z / C)), x0 = gx | 0, y0 = gy | 0, u = gx - x0, v = gy - y0;
  return arr[y0 * N + x0] * (1 - u) * (1 - v) + arr[y0 * N + x0 + 1] * u * (1 - v) + arr[(y0 + 1) * N + x0] * (1 - u) * v + arr[(y0 + 1) * N + x0 + 1] * u * v; };
 for (let q = -K.R; q <= K.R; q++) for (let r = Math.max(-K.R, -q - K.R); r <= Math.min(K.R, -q + K.R); r++) {
  const [hx, hz] = hexCenter(q, r), x = ox + hx, z = oz + hz, cell = Math.min(N - 1, Math.max(0, Math.round(z / C))) * N + Math.min(N - 1, Math.max(0, Math.round(x / C)));
  const h = sample(L.h, x, z), hex = { id: hexes.length, q, r, x: hx, z: hz, h, cell, sea: h < 0, river: !!L.river[cell] && h >= 0, soil: L.soil[cell], above: L.above[cell], flood: L.flood(cell), cover: L.cover[cell], n: [] };
  index.set(q + ',' + r, hex.id); hexes.push(hex);
 }
 for (const hx of hexes) { for (const [dq, dr] of HEX_DIRS) { const j = index.get((hx.q + dq) + ',' + (hx.r + dr)); if (j !== undefined) hx.n.push(j); }
  let m = 0; for (const j of hx.n) m = Math.max(m, Math.abs(hexes[j].h - hx.h)); hx.slope = m / (K.s * SQ3);
  hx.coast = !hx.sea && hx.n.some(j => hexes[j].sea); hx.bank = !hx.river && !hx.sea && hx.n.some(j => hexes[j].river); }
 return { hexes, index, ox, oz };
}

// The land around the tile that people walk out to: what it can grow, and how long the walk is.
export function hinterland(land, founding, tile) {
 const L = land, N = L.N, C = LA.cell, ha = C * C / 1e4, from = walkField(L, [founding.site]), R = K.R * K.s * SQ3 + K.s;
 const out = { grain: [], olive: [], pasture: [], vine: [], wood: [], clay: [], fishHa: 0 };
 for (let i = 0; i < N * N; i++) {
  const dx = (i % N) * C - tile.ox, dz = ((i / N) | 0) * C - tile.oz, d = Math.hypot(dx, dz);
  if (d < R || d > K.hinterland) continue;
  const walk = from[i]; if (L.h[i] < 0) { if (L.shelter[i] > .5 || nearShore(L, i)) out.fishHa += ha; continue; }
  if (!isFinite(walk)) continue;
  const s = L.slope[i], soil = L.soil[i], south = southFacing(L, i);
  if (soil === 3 || (soil === 2 && s < .08)) out.grain.push(walk);
  else if (soil === 2 && s < .35 && south > .3) out.vine.push(walk);
  else if (soil === 2 && s < .35) out.olive.push(walk);
  else if (soil === 4) out.clay.push(walk);
  else if (L.cover[i] === 1) out.wood.push(walk);
  else if (L.cover[i] === 2 || L.cover[i] === 6 || soil === 1) out.pasture.push(walk);
 }
 for (const k of ['grain', 'olive', 'pasture', 'vine', 'wood', 'clay']) out[k].sort((a, b) => a - b);
 out.ha = ha; return out;
}
function nearShore(L, i) { const N = L.N, x = i % N, y = (i / N) | 0; for (let k = -2; k <= 2; k++) for (let j = -2; j <= 2; j++) { const xx = x + k, yy = y + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N && L.h[yy * N + xx] >= 0) return L.shelter[i] > .3; } return false; }
function southFacing(L, i) { const N = L.N, x = i % N, y = (i / N) | 0; const dz = (L.h[Math.min(N - 1, y + 1) * N + x] - L.h[Math.max(0, y - 1) * N + x]); return Math.max(0, -dz / (2 * LA.cell) / Math.max(.01, L.slope[i])); } // sea is south (+y)

// A worker's useful share of the day after walking out and back.
const dayShare = walkSec => Math.max(0, 1 - 2 * walkSec / 3600 / K.dayHours);

// ---------- The simulation ----------
export function simulate(land, founding, { years = 120, edits = [], seed = 1, onYear } = {}) {
 const tile = makeTile(land, founding), H = tile.hexes, n = H.length, r = rng(seed * 2654435761 + 7), log = [];
 const hin = hinterland(land, founding, tile);
 const zone = new Uint8Array(n), work = new Int8Array(n).fill(-1), kind = new Uint8Array(n), hh = new Float32Array(n), wear = new Float32Array(n), road = new Uint8Array(n);
 const fountainOK = new Uint8Array(n), blocked = new Uint8Array(n), unmet = new Uint8Array(n), thatch = new Uint8Array(n), burnt = new Uint8Array(n);
 for (const x of H) zone[x.id] = x.sea ? 7 : x.river ? 8 : 0;
 const say = (year, text, hex = -1, tag = '') => log.push({ year, text, hex, tag });
 const W = id => WORK_IDS.indexOf(id);
 const center = H.reduce((b, x) => (x.q * x.q + x.r * x.r + x.q * x.r < b.q * b.q + b.r * b.r + b.q * b.r ? x : b), H[0]);
 const st = { tile, hin, land, years: [], log, aqueduct: null, stock: { timber: 20, tiles: 0 }, people: 0 };
 const buildable = x => !x.sea && !x.river && x.slope < .25 && zone[x.id] !== 7 && zone[x.id] !== 8;
 // Walking on the blocks: Tobler on the slope between blocks, faster on made streets.
 const ROAD = [1, 1.3, 1.6, 2];
 const step = (a, b) => { const d = K.s * SQ3, s = (H[b].h - H[a].h) / d; if (H[b].sea) return Infinity; let t = d / (LA.walk * Math.exp(-3.5 * Math.abs(s + .05)) / 3.6) / ROAD[road[b]]; if (H[b].river) t += road[b] >= 2 ? 0 : 90; return t; };
 const field = sources => { const dist = new Float32Array(n).fill(Infinity), par = new Int32Array(n).fill(-1), q = new Heap(); for (const s of sources) { dist[s] = 0; q.push(0, s); }
  while (q.size) { const c = q.pop(); if (q.key > dist[c]) continue; for (const m of H[c].n) { const nd = dist[c] + step(c, m); if (nd < dist[m]) { dist[m] = nd; par[m] = c; q.push(nd, m); } } } return { dist, par }; };
 const of = id => { const w = W(id), out = []; for (let i = 0; i < n; i++) if (work[i] === w) out.push(i); return out; };
 const place = (year, id, i, why) => { zone[i] = ZONES.indexOf(WORKS[id].zone); work[i] = W(id); kind[i] = 0; hh[i] = 0; if (why) say(year, why, i, id); };
 // Pick the best free block by a score; null if none.
 const best = (score) => { let b = -1, bs = -Infinity; for (const x of H) { if (!buildable(x) || (zone[x.id] && zone[x.id] !== 1) || work[x.id] >= 0 || (zone[x.id] === 1 && hh[x.id] > 0)) continue; const s = score(x); if (s > bs) { bs = s; b = x.id; } } return b < 0 ? null : b; };
 const near = (i, list) => list.reduce((m, j) => Math.min(m, Math.hypot(H[i].x - H[j].x, H[i].z - H[j].z)), 1e9);

 // Year 0: the founders' first blocks around the chosen place, and a well.
 let home = [center.id, ...center.n].filter(i => buildable(H[i]));
 for (const i of home) { zone[i] = 1; kind[i] = 1; hh[i] = LA.party / K.people / home.length; thatch[i] = 1; }
 say(0, `${LA.party} people raise ${home.length} blocks of thatched houses on the founding place.`, center.id, 'found');

 for (let year = 1; year <= years; year++) {
  for (const e of edits) if (e.year === year) { const i = tile.index.get(e.q + ',' + e.r); if (i === undefined || !buildable(H[i])) continue; if (work[i] >= 0 && e.zone !== 'clear') continue; zone[i] = ZONES.indexOf(e.zone === 'clear' ? '' : e.zone); if (e.zone !== 'home') { kind[i] = 0; hh[i] = 0; } if (e.zone === 'clear') work[i] = -1; say(year, `You zone a block for ${e.zone === 'clear' ? 'nothing' : e.zone === 'green' ? 'a garden' : e.zone}.`, i, 'edit'); if (e.zone === 'green') work[i] = W('garden'); }
  const homes = []; for (let i = 0; i < n; i++) if (zone[i] === 1) homes.push(i);
  const pop = homes.reduce((s, i) => s + hh[i] * K.people, 0);
  const byKind = [0, 0, 0, 0, 0]; for (const i of homes) byKind[kind[i] || 1] += hh[i];

  // --- Water ---
  const wells = of('well'), fountains = of('fountain');
  const aq = st.aqueduct, aqSupply = aq ? aq.lps * 86400 * (1 - K.lossChannel) : 0;
  const bathUse = of('bath').length * K.bathLitres;
  const supply = wells.length * K.well + Math.max(0, aqSupply - bathUse), demand = pop * K.litres, waterRatio = demand ? Math.min(1, supply / demand) : 1;
  const toWater = field([...wells, ...fountains]), toFountain = field(fountains);

  // --- Labour: each kind does its own work; the land's yield falls with the walk out ---
  const free = byKind.slice();
  const staffed = {}; for (const id of WORK_IDS) { const w = WORKS[id], list = of(id); let s = 0; for (const _ of list) { if (!w.staff) { s++; continue; } const take = Math.min(w.staff, free[w.kind]); free[w.kind] -= take; s += take / w.staff; } staffed[id] = s; }
  const workLand = (list, perHh, yieldHa, hands) => { let out = 0, used = 0; const share = []; for (let k = 0; k < list.length && used < hands * perHh; k++) { const d = dayShare(list[k]); if (d < .3) break; out += yieldHa * hin.ha * d; used += hin.ha; } return { out, used }; };
  const fishers = Math.min(free[1] * .35, staffed.harbour ? hin.fishHa * K.boatsPerHa : 2); free[1] -= fishers;
  const needGrain = pop * K.eat, farmersWanted = needGrain / (K.grain / K.fallow * K.farmHa) * 1.15;
  const farmers = Math.min(free[1], farmersWanted); free[1] -= farmers;
  const grain = workLand(hin.grain, K.farmHa / hin.ha, K.grain / K.fallow, farmers).out;
  const fish = fishers * K.fishFeeds * K.eat;
  const woodHands = Math.min(free[1], 1 + pop / 200); free[1] -= woodHands;
  const timber = workLand(hin.wood, K.woodHa / hin.ha, K.timber, woodHands).out;
  const pressOn = staffed.press > 0, weaverOn = staffed.weaver > 0, exporting = of('harbour').length && of('market').length;
  const groveHands = pressOn ? Math.min(free[1] * (exporting ? .5 : 1), pop * K.oilNeed / (K.oil * K.oilHa) * 1.1 + (exporting ? free[1] * .25 : 0)) : 0; free[1] -= groveHands;
  const oil = workLand(hin.olive, K.oilHa / hin.ha, K.oil, groveHands).out;
  const shepherds = weaverOn ? Math.min(free[1], pop * K.clothNeed / (K.wool * K.flockHa) * 1.1) : 0; free[1] -= shepherds;
  const cloth = Math.min(workLand(hin.pasture, K.flockHa / hin.ha, K.wool, shepherds).out, staffed.weaver * 4000);
  const vineHands = pressOn && (byKind[4] || exporting) ? Math.min(free[1], byKind[4] * K.people * K.wineNeed / (K.wine * K.vineHa) * 1.1 + (exporting ? free[1] * .3 : 0)) : 0; free[1] -= vineHands;
  const wine = workLand(hin.vine, K.vineHa / hin.ha, K.wine, vineHands).out;
  const tilesMade = staffed.kiln * K.tilesPerKiln * (hin.clay.length ? dayShare(hin.clay[0]) : .5);
  st.stock.timber += timber * (staffed.carpenter ? 1 : .5); st.stock.tiles += tilesMade;
  st.stock.timber = Math.min(st.stock.timber, 400 + pop); // timber rots: stores hold a few years' building
  // Bread needs a mill (or hand querns, slow) and a bakery; without them grain is eaten as porridge (food, not bread).
  // Trade: once there is a landing and a market, ships take what the town has spare (oil, wine, cloth, tiles) and
  // bring what it lacks, food first. Prices are in kg of grain (K.trade).
  const trading = of('harbour').length && of('market').length;
  const spare = { oil: Math.max(0, oil - pop * K.oilNeed), wine: Math.max(0, wine - byKind[4] * K.people * K.wineNeed), cloth: Math.max(0, cloth - pop * K.clothNeed), tiles: Math.max(0, st.stock.tiles - 20 * K.houseTiles) };
  let credit = trading ? Object.keys(spare).reduce((c, k) => c + spare[k] * K.trade[k], 0) : 0;
  const bought = { grain: 0, cloth: 0, oil: 0, wine: 0 };
  const buy = (k, amount) => { const got = Math.max(0, Math.min(amount, credit / K.trade[k])); credit -= got * K.trade[k]; bought[k] = got; };
  if (trading) { buy('grain', needGrain - grain - fish); buy('cloth', pop * K.clothNeed - cloth); buy('oil', pop * K.oilNeed - oil); buy('wine', byKind[4] * K.people * K.wineNeed - wine); }
  const imported = bought.grain; if (trading) st.stock.tiles -= spare.tiles * Math.min(1, (bought.grain + bought.cloth * K.trade.cloth) / Math.max(1, (spare.oil * K.trade.oil + spare.wine * K.trade.wine + spare.cloth * K.trade.cloth + spare.tiles * K.trade.tiles)));
  if (trading && (bought.grain + bought.cloth) > 200 && !st.firstTrade) { st.firstTrade = year; say(year, `The first ship trades the town's spare ${Object.keys(spare).filter(k => spare[k] > 0).join(' and ')} for ${bought.grain > 200 ? Math.round(bought.grain / 1000 * 10) / 10 + ' t of grain' : ''}${bought.grain > 200 && bought.cloth > 50 ? ' and ' : ''}${bought.cloth > 50 ? Math.round(bought.cloth) + ' kg of cloth' : ''}.`, of('harbour')[0], 'trade'); }
  const food = Math.min(1, (grain + fish + imported) / Math.max(1, needGrain));
  const pp = Math.max(1, pop);
  const goods = { oil: Math.min(1, (oil + bought.oil) / (pp * K.oilNeed)), cloth: Math.min(1, (cloth + bought.cloth) / (pp * K.clothNeed)), wine: byKind[4] ? Math.min(1, (wine + bought.wine) / (byKind[4] * K.people * K.wineNeed)) : (wine > 0 ? 1 : 0) };

  // --- Services: how far each block is from each, on the streets ---
  const reach = {}; for (const id of ['market', 'bath', 'school', 'temple', 'theatre', 'watch']) { const list = of(id).filter(i => staffed[id] > 0 || !WORKS[id].staff); reach[id] = list.length ? field(list).dist : null; }
  const within = (id, i) => reach[id] && reach[id][i] <= K.walkTo[id];

  // --- Pull of each block (desirability) ---
  const smoke = [...of('kiln'), ...of('bakery'), ...of('carpenter'), ...of('mill')], gardens = [...of('garden'), ...of('temple')];
  const pull = new Float32Array(n);
  for (const x of H) { if (x.sea) continue; let p = .3 + Math.min(.25, Math.max(0, x.h) / 120) + (H.some(y => y.sea) ? .1 : 0);
   for (const j of smoke) { const dx = x.x - H[j].x, dz = x.z - H[j].z, d = Math.hypot(dx, dz); if (d < 140) p -= .22 * (1 - d / 140) * (dz < 0 ? 1.4 : .6); } // the sea wind blows smoke north (inland)
   for (const j of gardens) { const d = Math.hypot(x.x - H[j].x, x.z - H[j].z); if (d < 100) p += .18 * (1 - d / 100); }
   if (of('harbour').some(j => H[j].n.includes(x.id)) || of('market').some(j => H[j].n.includes(x.id))) p -= .05;
   pull[x.id] = Math.max(0, Math.min(1, p)); }

  // --- Needs, block by block ---
  const has = (need, i) => {
   switch (need) {
    case 'water': return toWater.dist[i] <= K.walkTo.water && waterRatio > .8;
    case 'fountain': return toFountain.dist[i] <= K.walkTo.water && fountainOK[i];
    case 'food': return food > .9;
    case 'market': return within('market', i);
    case 'oil': return goods.oil > .7 && within('market', i);
    case 'cloth': return goods.cloth > .7 && within('market', i);
    case 'wine': return goods.wine > .7 && within('market', i);
    case 'tiles': return !thatch[i];
    case 'view': return pull[i] > .6;
    default: return within(need, i);
   }
  };
  let ups = 0, downs = 0, leavers = 0; const want = {}; if (year % 5 === 0) blocked.fill(0);
  const workersShort = k => free[k] < 0.5 && WORK_IDS.some(id => WORKS[id].kind === k && of(id).length && staffed[id] < of(id).length);
  for (const i of homes) {
   const k = kind[i] || 1, miss = NEEDS[k].filter(nd => !has(nd, i)); unmet[i] = miss.length;
   if (miss.length) { if (r() < .5) { const lost = hh[i] * (miss.includes('food') || miss.includes('water') ? .25 : .1); hh[i] -= lost; leavers += lost; } if (k > 1 && miss.length > 1 && r() < .3) { kind[i] = k - 1; downs++; } continue; }
   if (k < 4) for (const nd of NEEDS[k + 1]) if (!has(nd, i)) want[nd] = (want[nd] || 0) + hh[i];
   if (k < 4 && NEEDS[k + 1].every(nd => nd === 'tiles' || has(nd, i))) {
    if (blocked[i]) continue;
    // Keep a mix: the council holds back the last blocks of a kind whose work would go undone.
    if (byKind[k] - hh[i] < needWorkers(k) && r() < .9) { blocked[i] = 1; if (!st.held || year - st.held > 15) { st.held = year; say(year, `The council keeps some blocks of ${KINDS[k].toLowerCase()} as they are: their work would go undone if they all moved up.`, i, 'hold'); } continue; }
    if (k + 1 >= 3 && thatch[i]) { if (st.stock.tiles >= K.houseTiles && st.stock.timber >= K.houseTimber) { st.stock.tiles -= K.houseTiles; st.stock.timber -= K.houseTimber; thatch[i] = 0; } else continue; }
    else if (st.stock.timber >= K.houseTimber) { st.stock.timber -= K.houseTimber; if (thatch[i] && st.stock.tiles >= K.houseTiles) { st.stock.tiles -= K.houseTiles; thatch[i] = 0; } } else continue;
    kind[i] = k + 1; ups++; byKind[k] -= hh[i]; byKind[k + 1] += hh[i];
   }
  }
  function needWorkers(k) { let need = 0; for (const id of WORK_IDS) if (WORKS[id].kind === k) need += of(id).length * WORKS[id].staff; if (k === 1) need += farmersWanted + fishers + woodHands + groveHands + shepherds + vineHands + 2; return need; }
  st.want = want; st.missing = {}; for (const i of homes) { const k = kind[i] || 1; if (k < 4) for (const nd of NEEDS[k + 1]) if (!has(nd, i)) st.missing[k + ':' + nd] = (st.missing[k + ':' + nd] || 0) + 1; }
  (st.missingByYear ||= {})[year] = st.missing;
  for (let k = 2; k <= 4; k++) if (!st['first' + k] && homes.some(i => kind[i] === k)) { st['first' + k] = year; const i = homes.find(j => kind[j] === k); say(year, `The first ${KINDS[k].toLowerCase()} move in: ${k === 2 ? 'oil and cloth from the market reach their door' : k === 3 ? 'running water, a bath and a school nearby, and a tiled roof' : 'a temple, a theatre and wine, in the finest spot in town'}.`, i, 'up' + k); }

  // --- People: births, deaths, newcomers into room the town has ---
  const sick = waterRatio < .9 || !of('bath').length ? 1.25 : 1;
  let room = 0; for (const i of homes) room += Math.max(0, K.hh[kind[i] || 1] - hh[i]);
  const growth = pop * (K.birth * Math.min(1, food + .1) - K.death * sick * (food < .8 ? 1.6 : 1)) / K.people;
  const pullTown = food > .95 && waterRatio > .9 ? Math.min(room * .5, 2 + pop * .05 / K.people) : 0;
  let add = growth + pullTown;
  for (const i of homes.sort((a, b) => pull[b] - pull[a])) { if (add <= 0) break; const space = K.hh[kind[i] || 1] - hh[i]; if (space <= 0) continue; const t = Math.min(space, add); hh[i] += t; add -= t; }
  if (add < 0) for (const i of homes) { const t = Math.min(hh[i], -add / homes.length); hh[i] -= t; }

  // --- Feet wear the streets: every household walks to water, market and work each day ---
  const fieldsWay = edgeToward(H, tile, hin, founding, land);
  const walkHome = (par, i, w) => { let c = i, guard = 0; while (c >= 0 && guard++ < 80) { wear[c] += w; c = par[c]; } };
  for (const i of homes) { if (toWater.par && isFinite(toWater.dist[i])) walkHome(toWater.par, i, hh[i] * 2); if (reach.market) walkHome(field(of('market')).par, i, hh[i]); }
  const outward = field([fieldsWay]); for (const i of homes) walkHome(outward.par, i, hh[i] * .6 * (byKind[1] / Math.max(1, homes.reduce((s, j) => s + hh[j], 0))));
  for (let i = 0; i < n; i++) { wear[i] *= .9; const was = road[i]; road[i] = wear[i] > 400 && byKind[3] + byKind[4] > 20 ? 3 : wear[i] > 120 ? 2 : wear[i] > 30 ? 1 : 0; if (road[i] === 3 && was < 3 && !st.paved) { st.paved = true; say(year, 'The busiest street is paved with stone.', i, 'road'); } }

  // --- Fire and flood ---
  if (!of('watch').length || r() < .3) for (const i of homes) { if (!thatch[i] || hh[i] < 1) continue; const risk = K.fireRisk * (hh[i] / 3) * (within('watch', i) ? .2 : 1); if (r() < risk) { const lost = [i, ...H[i].n.filter(j => zone[j] === 1 && thatch[j] && r() < .5)]; for (const j of lost) { hh[j] *= .3; burnt[j] = year; if (st.stock.tiles >= K.houseTiles) { st.stock.tiles -= K.houseTiles; thatch[j] = 0; } } say(year, `Fire takes ${lost.length} block${lost.length > 1 ? 's' : ''} of thatched houses.`, i, 'fire'); if (!st.firstFire) st.firstFire = year; st.fires = (st.fires || 0) + 1; break; } }
  const flood = gumbelFlood(r);
  for (const i of homes) { const x = H[i]; if (x.above < flood && x.above < 8 && hh[i] > 0 && H.some(y => y.river)) { const lost = hh[i] * .5; hh[i] -= lost; if (!st.lastFlood || st.lastFlood < year) { say(year, `A flood ${round(flood, 1)} m above the river reaches the low houses; families rebuild higher.`, i, 'flood'); st.lastFlood = year; } } }

  // --- The council: works built when the need is measured ---
  const P = Math.round(pop), hhAll = homes.reduce((s, i) => s + hh[i], 0);
  const homesFar = homes.filter(i => toWater.dist[i] > K.walkTo.water);
  if (homesFar.length && demand * 1.1 > wells.length * K.well || homesFar.length > 2) {
   const w = best(x => (x.above < K.wellDeep ? 1 : -9) - near(x.id, homesFar) / 100 - near(x.id, wells.length ? wells : [center.id]) / -400);
   if (w !== null && H[w].above < K.wellDeep) { const nW = wells.length + 1; place(year, 'well', w, nW <= 2 ? `${homesFar.length} blocks are more than ${K.walkTo.water / 60 | 0} minutes from water: a well is dug where the water lies ${Math.round(H[w].above + 2)} m down.` : nW % 10 === 0 ? `The town has ${nW} wells now.` : ''); }
  }
  if (!st.aqueduct && (P > 600 || (want.fountain || 0) > 8)) { const a = planAqueduct(land, founding, tile); if (a) { st.aqueduct = a; const c = a.arrive; zone[c] = 3; work[c] = W('castellum'); say(year, `The wells cannot keep up: a channel is built from the spring, ${round(a.length / 1000, 1)} km at a fall of ${K.fall * 1000} m per km, on ${a.arches} arches and through ${a.tunnel} m of tunnel. It arrives ${Math.round(a.level)} m above the sea with ${round(a.lps, 1)} litres a second.`, c, 'aqueduct');
   for (const x of H) fountainOK[x.id] = x.h < a.level - 1 ? 1 : 0;
   const above = H.filter(x => !x.sea && x.h >= a.level - 1).length; if (above) say(year, `${above} blocks stand above the channel's level: fountains can never reach them.`, -1, 'aqueduct'); } }
  if (st.aqueduct && byKind[1] + byKind[2] > 8) { const dry = homes.filter(i => fountainOK[i] && toFountain.dist[i] > K.walkTo.water); if (dry.length > 1) { const f = best(x => fountainOK[x.id] ? -near(x.id, dry) / 60 + (road[x.id] ? .5 : 0) : -99); if (f !== null && fountainOK[f]) { const nF = fountains.length + 1; place(year, 'fountain', f, nF <= 2 ? `A fountain for ${dry.length} blocks below the channel's level.` : nF % 10 === 0 ? `The channel feeds ${nF} fountains now.` : ''); } } }
  if (!of('harbour').length && (food < .97 || farmers >= free[1] + farmers - .5) && byKind[1] > 10) { const h = best(x => x.coast ? 1 - near(x.id, homes) / 400 : -99); if (h !== null && H[h].coast) place(year, 'harbour', h, `Families short of fields take to the boats: a landing stage on the shore.`); }
  if (!of('market').length && hhAll > 24) { let m = -1, mw = -1; for (const x of H) if (buildable(x) && !(zone[x.id] && zone[x.id] !== 1) && work[x.id] < 0 && wear[x.id] > mw) { mw = wear[x.id]; m = x.id; } if (m >= 0) place(year, 'market', m, `A market opens where the most feet cross (${Math.round(wear[m])} household trips a day).`); }
  if (!of('mill').length && P > 250) { const bank = H.filter(x => x.bank && buildable(x) && work[x.id] < 0); if (bank.length) { const m = bank.sort((a, b) => b.h - a.h)[0].id; const kW = round(1000 * 9.81 * maxQ(land) * 2 * .6 / 1000, 1); place(year, 'mill', m, `${P} people need more flour than hand querns can grind: a ${kW} kW water mill on the river bank.`); } }
  if (of('mill').length && of('bakery').length < Math.ceil(P / 600) && reach.market) { const b = best(x => -(reach.market[x.id] || 999) / 60 - near(x.id, of('mill')) / 300); if (b !== null) place(year, 'bakery', b, 'A bakery beside the market, so the flour becomes bread.'); }
  if (!of('carpenter').length && P > 180) { const c = best(x => -near(x.id, [fieldsWay]) / 200 - (pull[x.id])); if (c !== null) place(year, 'carpenter', c, 'Timber comes in faster than anyone can saw it: a carpenter\'s yard on the way to the woods.'); }
  if (!of('press').length && (want.oil || 0) > 6) { const c = best(x => -pull[x.id] * 2 - near(x.id, of('market')) / 400); if (c !== null) place(year, 'press', c, `${Math.round(want.oil)} households are ready to live better but have no oil: a press for the olives on the terra rossa.`); }
  if (!of('weaver').length && (want.cloth || 0) > 6) { const c = best(x => -pull[x.id] * 2 - near(x.id, of('market')) / 400); if (c !== null) place(year, 'weaver', c, `${Math.round(want.cloth)} households want cloth: a weaver's shop, fed by the flocks on the hills.`); }
  if (!of('kiln').length && ((want.tiles || 0) > 4 || (st.fires || 0) >= 3)) { const c = best(x => (x.bank || x.soil === 4 ? 1 : 0) - pull[x.id] * 2 - near(x.id, of('market')) / 600); if (c !== null) place(year, 'kiln', c, 'Thatch burns and leaks: a kiln on the clay by the river fires roof tiles.'); }
  if (st.firstFire && !of('watch').length && P > 120) { const c = best(x => -near(x.id, homes.filter(i => thatch[i])) / 100); if (c !== null) place(year, 'watch', c, `After the fire of year ${st.firstFire}, a fire watch with buckets and hooks.`); }
  if (!of('school').length && (P * .3 > 60 || (want.school || 0) > 6)) { const c = best(x => pull[x.id] - near(x.id, homes) / 150); if (c !== null) place(year, 'school', c, `${Math.round(P * .3)} children: a school.`); }
  if (!of('bath').length && st.aqueduct && (want.bath || 0) > 8) { const c = best(x => fountainOK[x.id] ? -(reach.market ? reach.market[x.id] : 0) / 100 : -99); if (c !== null && fountainOK[c]) place(year, 'bath', c, `The channel brings enough water for a public bath (${K.bathLitres / 1000} m³ a day).`); }
  if (!of('temple').length && ((want.temple || 0) > 4 || byKind[3] > 6)) { const c = best(x => x.h / 10 - (reach.market ? reach.market[x.id] : 0) / 120); if (c !== null) place(year, 'temple', c, `A temple on the high ground ${Math.round(H[c].h)} m above the sea, seen from the boats.`); }
  if (!of('theatre').length && (want.theatre || 0) > 6) { const c = best(x => x.slope * 20 - (reach.market ? reach.market[x.id] : 0) / 300); if (c !== null) place(year, 'theatre', c, H[c].slope > .1 ? `A theatre cut into the hillside (a ${Math.round(H[c].slope * 100)}% slope saves building the seats).` : `A theatre on the gentlest rise there is; its seats are built up on vaults.`); }
  // More of a service where it does not reach: the block among the unreached homes where most feet pass.
  for (const id of ['market', 'school', 'bath', 'temple']) {
   const list = of(id); if (!list.length || (want[id] || 0) < 15 || list.length >= 6 || (id === 'bath' && !st.aqueduct)) continue;
   const out = homes.filter(i => !within(id, i)); if (out.length < 6) continue;
   let c = -1, cw = -1; for (const i of out) for (const j of [i, ...H[i].n]) { const x = H[j]; if (!buildable(x) || (zone[j] && zone[j] !== 1) || work[j] >= 0 || (id === 'bath' && !fountainOK[j])) continue; const w = wear[j] + (zone[j] === 1 ? 0 : 30); if (w > cw) { cw = w; c = j; } }
   if (c >= 0) place(year, id, c, `${out.length} blocks of homes are too far from a ${id}: another one opens among them.`);
  }
  if ((want.view || 0) > 10 && of('garden').length < 6) { const c = best(x => -near(x.id, homes.filter(i => kind[i] === 3)) / 40 + x.h / 50); if (c !== null) place(year, 'garden', c, 'Artisans want somewhere fine to live: a garden with trees and a pool.'); }
  // New homes when the houses are nearly full: where the walk to water and market is short and the pull is high.
  const full = homes.length && homes.reduce((s, i) => s + hh[i], 0) / homes.reduce((s, i) => s + K.hh[kind[i] || 1], 0) > .8;
  if (full && food > .9) { for (let k = 0; k < 1 + (P > 300 ? 2 : 0); k++) { const c = best(x => (zone[x.id] === 1 ? 2 : 0) + pull[x.id] - (isFinite(toWater.dist[x.id]) ? toWater.dist[x.id] : 600) / 300 - near(x.id, homes) / 60 - (x.above < x.flood + .5 ? 3 : 0)); if (c === null) break; zone[c] = 1; kind[c] = 1; thatch[c] = 1; hh[c] = .5; homes.push(c); } }

  const snap = { year, pop: Math.round(homes.reduce((s, i) => s + hh[i], 0) * K.people), byKind: byKind.map(v => Math.round(v * K.people)), food: round(food, 2), water: round(waterRatio, 2), goods: { oil: round(goods.oil, 2), cloth: round(goods.cloth, 2), wine: round(goods.wine, 2) }, stock: { timber: Math.round(st.stock.timber), tiles: Math.round(st.stock.tiles) },
   workers: { farmers: round(farmers, 1), fishers: round(fishers, 1), woodcutters: round(woodHands, 1), groves: round(groveHands, 1), shepherds: round(shepherds, 1), vines: round(vineHands, 1) },
   zone: zone.slice(), work: work.slice(), kind: kind.slice(), hh: Uint8Array.from(hh, v => Math.round(v * 10)), road: road.slice(), unmet: unmet.slice(), thatch: thatch.slice(), pull: Uint8Array.from(pull, v => v * 255) };
  st.years.push(snap); onYear?.(snap, st);
 }
 return st;
}
function maxQ(L) { let q = 0; for (let i = 0; i < L.N * L.N; i++) if (L.river[i] && L.h[i] >= 0) q = Math.max(q, L.Q[i]); return q; }
// The biggest flood of the year, metres above the river (Gumbel, mode 0.8 m, scale 0.35 m).
function gumbelFlood(r) { return .8 - .35 * Math.log(-Math.log(Math.max(1e-6, r()))); }
// The block on the tile's edge toward the most farmland: where the field hands walk out.
function edgeToward(H, tile, hin, founding, land) {
 const N = land.N, C = LA.cell; let sx = 0, sz = 0, c = 0;
 for (let i = 0; i < N * N; i++) if ((land.soil[i] === 3 || land.soil[i] === 2) && land.slope[i] < .08) { const dx = (i % N) * C - tile.ox, dz = ((i / N) | 0) * C - tile.oz, d = Math.hypot(dx, dz); if (d > 300 && d < 1800) { sx += dx / d; sz += dz / d; c++; } }
 const a = Math.atan2(sz, sx); let best = 0, bs = -Infinity;
 for (const x of H) { if (x.sea || x.river) continue; const d = Math.hypot(x.x, x.z), s = (x.x * Math.cos(a) + x.z * Math.sin(a)) / (d || 1) * d; if (s > bs) { bs = s; best = x.id; } }
 return best;
}

// The channel from the spring: it must fall steadily, so it follows the contours. Where the ground dips below the
// channel it rides on arches; where the ground rises above it, a tunnel. Route on the land grid by least cost,
// then the level it reaches the tile at decides which blocks a fountain can serve.
export function planAqueduct(land, founding, tile) {
 const L = land, N = L.N, C = LA.cell, sp = L.spring; if (!sp) return null;
 const target = founding.site, tx = target % N, ty = (target / N) | 0, R = (K.R - 1) * K.s * SQ3;
 // Dijkstra over cells with the channel level as part of the state: level = spring height - fall * length.
 const dist = new Float32Array(N * N).fill(Infinity), len = new Float32Array(N * N), par = new Int32Array(N * N).fill(-1), q = new Heap();
 dist[sp.cell] = 0; q.push(0, sp.cell); let arrive = -1;
 while (q.size) { const c = q.pop(); if (q.key > dist[c]) continue; const cx = c % N, cy = (c / N) | 0;
  if (Math.hypot((cx - tx) * C, (cy - ty) * C) < R) { arrive = c; break; }
  for (let k = 0; k < 8; k++) { const x = cx + [1, -1, 0, 0, 1, 1, -1, -1][k], y = cy + [0, 0, 1, -1, 1, -1, 1, -1][k]; if (x < 0 || y < 0 || x >= N || y >= N) continue; const m = y * N + x;
   if (L.h[m] < 0) continue; const d = C * (k < 4 ? 1 : Math.SQRT2), l = len[c] + d, level = sp.h - K.fall * l, gap = level - L.h[m];
   const cost = d * (gap > 0 ? 1 + gap / 4 : 1 + (-gap) * 1.5) + (L.river[m] ? 200 : 0) ; // arches cost with height, tunnels with depth
   if (-gap > 45) continue;                                                               // deeper than this no one digs
   const nd = dist[c] + cost; if (nd < dist[m]) { dist[m] = nd; len[m] = l; par[m] = c; q.push(nd, m); } } }
 if (arrive < 0) return null;
 const path = []; for (let c = arrive; c >= 0; c = par[c]) path.push(c); path.reverse();
 let arches = 0, tunnel = 0; const pts = [];
 for (const c of path) { const level = sp.h - K.fall * len[c], gap = level - L.h[c]; if (gap > 3) arches++; if (gap < -1) tunnel += C; pts.push([(c % N) * C - tile.ox, level, ((c / N) | 0) * C - tile.oz, L.h[c]]); }
 const level = sp.h - K.fall * len[arrive];
 // The castellum: the tile block nearest where the channel arrives.
 const ax = (arrive % N) * C - tile.ox, az = ((arrive / N) | 0) * C - tile.oz;
 let castle = 0, bd = 1e9; for (const x of tile.hexes) { if (x.sea || x.river) continue; const d = Math.hypot(x.x - ax, x.z - az); if (d < bd) { bd = d; castle = x.id; } }
 return { path: pts, length: len[arrive], level, arches: Math.round(arches * C / 10), tunnel: Math.round(tunnel), lps: sp.lps, arrive: castle };
}
