// Champions of the Drifting Isles: rules and battle simulation.
// Pure JavaScript, no rendering, so the same code runs the game in the browser and the balance runs in Node.
import {
  CARDS, CHAMPIONS, CALENDAR, RUN_YEARS, START_LIVES, GOLD_PER_YEAR, WELL_GOLD, REROLL_BASE,
  MERCHANT_BASE, MERCHANT_STEP, MAX_LEVEL, KEEP_IN_HAND, RAIDER, EDICTS, MERCHANT_POOL, champById,
} from './data.js';

// ---- geometry ---------------------------------------------------------------------------------------------------
export const GRID = 5;            // plots live on a 5 x 5 lattice; the centre 3 x 3 starts open
export const CELL = 2.5;          // world units between plot centres
export const PLOT_Z = 9;          // world z of the grid's centre row
export const FIELD = { minX: -9.5, maxX: 9.5, minZ: -18, maxZ: 16, spawnZ: -16 };

export function cellPos(i) {
  const r = Math.floor(i / GRID), c = i % GRID;
  return { x: (c - 2) * CELL, z: PLOT_Z + (r - 2) * CELL };
}
export function neighbours(i) {
  const r = Math.floor(i / GRID), c = i % GRID, out = [];
  if (r > 0) out.push(i - GRID);
  if (r < GRID - 1) out.push(i + GRID);
  if (c > 0) out.push(i - 1);
  if (c < GRID - 1) out.push(i + 1);
  return out;
}

// ---- random -----------------------------------------------------------------------------------------------------
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  rng.state = () => a;
  return rng;
}

// ---- boards -----------------------------------------------------------------------------------------------------
export function newBoard() {
  const plots = [];
  for (let i = 0; i < GRID * GRID; i++) {
    const r = Math.floor(i / GRID), c = i % GRID;
    plots.push({ i, open: r >= 1 && r <= 3 && c >= 1 && c <= 3, card: null, level: 0, charms: {}, bonusUnits: 0, dealt: 0, kills: 0 });
  }
  return { plots };
}
export function seatPlot(board) { return board.plots.find((p) => p.card && CARDS[p.card].type === 'seat') || null; }
export function expandable(board) {
  return board.plots.filter((p) => !p.open && neighbours(p.i).some((n) => board.plots[n].open)).map((p) => p.i);
}
export function levelMult(level) { return Math.pow(1.25, Math.max(0, level - 1)); }

// ---- run state --------------------------------------------------------------------------------------------------
export function newRun(champId, seed = (Date.now() & 0x7fffffff)) {
  const rng = makeRng(seed);
  const champ = champById(champId);
  const others = rng.shuffle(CHAMPIONS.filter((c) => c.id !== champId).map((c) => c.id));
  const s = {
    seed, rngState: 0, champ: champId, year: 1, lives: START_LIVES, gold: 0,
    board: newBoard(), hand: [champ.seat, ...drawFrom(rng, champ.deck, 3)],
    rivals: others.slice(0, 2).map((id) => ({ champ: id, board: newBoard(), peace: false, wins: 0 })),
    bench: others.slice(2),
    attacker: null, rerolls: 0, freeRerolls: 0, merchantBuys: 0,
    edicts: [], mods: baseMods(), stats: { kills: 0, battlesWon: 0, battlesLost: 0, cardsPlayed: 0 },
    phase: 'plan', over: false, won: false, log: [],
  };
  s._rng = rng;
  for (const r of s.rivals) rivalTurn(s, r, 1);
  pickAttacker(s);
  return s;
}
function baseMods() {
  return { dmg: 1, hp: 1, count: 0, towerRange: 1, towerDmg: 1, aura: 1, speed: 1, tithe: 0 };
}
export function rng(s) { return s._rng; }
function drawFrom(rng, deck, n) { const out = []; for (let k = 0; k < n; k++) out.push(rng.pick(deck)); return out; }

export function activeRivals(s) { return s.rivals.filter((r) => !r.peace); }
export function pickAttacker(s) {
  const act = activeRivals(s);
  if (CALENDAR[s.year] === 'final') {
    // The strongest rival comes in person.
    s.attacker = act.slice().sort((a, b) => boardPower(b.board) - boardPower(a.board))[0].champ;
  } else s.attacker = rng(s).pick(act).champ;
}
export function rerollCost(s) { return s.freeRerolls > 0 ? 0 : REROLL_BASE + REROLL_BASE * s.rerolls; }
function payReroll(s) {
  const cost = rerollCost(s);
  if (s.gold < cost) return false;
  if (s.freeRerolls > 0) s.freeRerolls--; else { s.gold -= cost; s.rerolls++; }
  return true;
}
export function rerollAttacker(s) {
  const act = activeRivals(s).filter((r) => r.champ !== s.attacker);
  if (!act.length || CALENDAR[s.year] === 'final' || !payReroll(s)) return false;
  s.attacker = rng(s).pick(act).champ;
  return true;
}

// Can `cardId` go on plot i? Returns the kind of play, or null.
export function playKind(s, cardId, i, board = s.board) {
  const card = CARDS[cardId], p = board.plots[i];
  if (!p || !p.open) return null;
  const hasSeat = !!seatPlot(board);
  if (!hasSeat && card.type !== 'seat') return null;              // the first card must be your seat
  if (card.type === 'spell') {
    if (!p.card || p.level >= MAX_LEVEL) return null;
    if (card.target === 'structure' && !['tower', 'building'].includes(CARDS[p.card].type)) return null;
    return 'spell';
  }
  if (card.type === 'charm') {
    if (!p.card) return null;
    const t = CARDS[p.card].type;
    if (card.target === 'troop' && t !== 'troop') return null;
    if (card.target === 'fighter' && !['troop', 'tower', 'seat'].includes(t)) return null;
    return 'charm';
  }
  if (!p.card) return card.type === 'seat' && hasSeat ? null : 'place';
  if (p.card === cardId && p.level < MAX_LEVEL) return 'level';
  return null;
}
export function validPlots(s, cardId) {
  return s.board.plots.filter((p) => playKind(s, cardId, p.i)).map((p) => p.i);
}

export function play(s, handIdx, i) {
  const id = s.hand[handIdx];
  const kind = playKind(s, id, i);
  if (!kind) return null;
  applyCard(s.board, id, i, kind);
  s.hand.splice(handIdx, 1);
  s.stats.cardsPlayed++;
  return kind;
}
function applyCard(board, id, i, kind) {
  const p = board.plots[i], card = CARDS[id];
  if (kind === 'place') { p.card = id; p.level = 1; }
  else if (kind === 'level') p.level++;
  else if (kind === 'charm') { for (const k in card.charm) p.charms[k] = (p.charms[k] || 0) + card.charm[k]; }
  else if (kind === 'spell') p.level = Math.min(MAX_LEVEL, p.level + (card.spell === 'levelup2' ? 2 : 1));
}
export function discard(s, handIdx) {
  s.hand.splice(handIdx, 1);
  s.gold += WELL_GOLD;
}
export function handLimit(s) { return CALENDAR[s.year] === 'final' ? 0 : KEEP_IN_HAND; }
export function readyForBattle(s) { return !!seatPlot(s.board) && s.hand.length <= handLimit(s); }

// ---- armies -----------------------------------------------------------------------------------------------------
function auraOn(board, i, mods) {
  const a = { dmg: 0, regen: 0, haste: 0, towerDmg: 0, guard: 0, burst: 0 };
  for (const n of neighbours(i)) {
    const q = board.plots[n];
    if (!q.open || !q.card) continue;
    const au = CARDS[q.card].aura;
    if (!au) continue;
    for (const k in au) a[k] += au[k] * q.level * mods.aura;
  }
  a.guard = Math.min(0.6, a.guard);
  return a;
}

// Turn a board into what fights. side 'P' fights from its plots; side 'E' arrives at the far edge.
export function buildArmy(board, side, opts) {
  const mods = opts.mods || baseMods();
  const diff = opts.diff || 1;
  const units = [], shooters = [], summoners = [];
  const seat = seatPlot(board);
  for (const p of board.plots) {
    if (!p.open || !p.card) continue;
    const card = CARDS[p.card], L = p.level, m = levelMult(L);
    const aura = auraOn(board, p.i, mods);
    const ch = p.charms;
    if (card.unit) {
      const u = card.unit;
      let count = u.count * L + p.bonusUnits + (u.count ? mods.count : 0);
      if (u.perGold) count = Math.floor((opts.gold || 0) / u.perGold) + L;
      count = Math.max(0, Math.round(count));
      const spec = {
        plot: p.i, card: p.card, shape: u.shape, missile: u.missile,
        hp: u.hp * m * mods.hp * (1 + (ch.hp || 0)) * diff,
        dmg: u.dmg * m * mods.dmg * (1 + aura.dmg + (ch.dmg || 0)) * diff,
        cd: u.cd / ((1 + aura.haste) * mods.speed), range: u.range, speed: u.speed * mods.speed,
        armor: u.armor || 0, guard: aura.guard, regen: aura.regen, burst: aura.burst, taunt: !!u.taunt,
        loot: ch.loot || 0,
      };
      units.push({ spec, count });
    }
    if (card.shooter && (side === 'P' || opts.withTowers)) {
      const sh = card.shooter;
      shooters.push({
        plot: p.i, card: p.card, kind: sh.kind, aoe: sh.aoe || 0, pierce: !!sh.pierce, chain: sh.chain || 0, pick: sh.pick || 'nearest',
        dmg: sh.dmg * m * mods.towerDmg * mods.dmg * (1 + aura.towerDmg + aura.dmg + (ch.dmg || 0)) * diff,
        cd: sh.cd / (1 + aura.haste), range: sh.range * mods.towerRange, loot: ch.loot || 0,
      });
    }
    if (card.summon && side === 'P') {
      const base = CARDS[card.summon.card].unit;
      const sm = levelMult(L);
      summoners.push({
        plot: p.i, every: card.summon.every / (1 + 0.3 * (L - 1)),
        spec: { plot: p.i, card: card.summon.card, shape: base.shape, hp: base.hp * sm * mods.hp * diff, dmg: base.dmg * sm * mods.dmg * diff,
          cd: base.cd / mods.speed, range: base.range, speed: base.speed * mods.speed, armor: 0, guard: aura.guard, regen: aura.regen, burst: aura.burst, loot: 0 },
      });
    }
  }
  return { units, shooters, summoners, seat: seat ? seat.i : null };
}

// Total fighting strength, used to rank rivals and in the balance report.
export function boardPower(board) {
  let pw = 0;
  for (const p of board.plots) {
    if (!p.card) continue;
    const c = CARDS[p.card], m = levelMult(p.level);
    if (c.unit) pw += (c.unit.count * p.level + p.bonusUnits) * c.unit.hp * c.unit.dmg / c.unit.cd * m * m / 10;
    if (c.shooter) pw += c.shooter.dmg * m / c.shooter.cd * 3;
    if (c.aura || c.growth || c.summon) pw += 6 * p.level;
  }
  return pw;
}

export function rivalDiff(year) { return (year <= 3 ? 0.75 : 1) * (1 + 0.04 * (year - 1) + 0.0012 * (year - 1) * (year - 1)); }

export function enemyArmy(s, attackerId) {
  const rival = s.rivals.find((r) => r.champ === attackerId);
  const diff = rivalDiff(s.year);
  const army = buildArmy(rival.board, 'E', { diff });
  const n = 2 + Math.floor(s.year * 1.1);
  army.units.push({ spec: { plot: -1, card: 'raider', shape: RAIDER.shape, hp: RAIDER.hp * diff * (1 + 0.04 * s.year), dmg: RAIDER.dmg * diff,
    cd: RAIDER.cd, range: RAIDER.range, speed: RAIDER.speed, armor: 0, guard: 0, regen: 0, burst: 0 }, count: n });
  if (CALENDAR[s.year] === 'final') {
    army.units.push({ spec: { plot: -1, card: 'boss', boss: attackerId, shape: 'boss', hp: 600 * diff, dmg: 12 * diff, cd: 1.0, range: 1.4,
      speed: 1.6, armor: 0.2, guard: 0, regen: 0, burst: 0, aoe: 1.4 }, count: 1 });
  }
  return army;
}

// ---- rivals -----------------------------------------------------------------------------------------------------
export function rivalTurn(s, rival, year) {
  const r = rng(s), champ = champById(rival.champ), b = rival.board;
  const plays = year === 1 ? 1 : year >= 20 ? 2 : year >= 8 ? (r() < 0.5 ? 2 : 1) : 1;
  if (CALENDAR[year] === 'spire') { const ex = expandable(b); if (ex.length) b.plots[r.pick(ex)].open = true; }
  for (let k = 0; k < plays; k++) {
    if (!seatPlot(b)) { applyCard(b, champ.seat, 12, 'place'); continue; }
    const id = r() < 0.12 ? champ.seat : r.pick(champ.deck);
    const spots = b.plots.filter((p) => playKind({ board: b }, id, p.i, b)).map((p) => p.i);
    if (!spots.length) continue;
    const levels = spots.filter((i) => b.plots[i].card);
    const i = levels.length && r() < 0.7 ? r.pick(levels) : r.pick(spots);
    const kind = playKind({ board: b }, id, i, b);
    applyCard(b, id, i, kind);
  }
  yearlyGrowth(b, r);
}

function yearlyGrowth(board, r) {
  for (const p of board.plots) {
    if (!p.card) continue;
    const c = CARDS[p.card];
    if (c.growth) for (const n of neighbours(p.i)) {
      const q = board.plots[n];
      if (q.card && CARDS[q.card].type === 'troop') q.bonusUnits += c.growth.units * p.level;
    }
    if (c.yearly === 'levelRandom') {
      const cands = board.plots.filter((q) => q.card && q.level < MAX_LEVEL);
      if (cands.length) r.pick(cands).level++;
    }
  }
}

// Gold that arrives before the battle (vaults, mints, tithe), per plot so it can fly from the right place.
export function preBattleIncome(s) {
  const out = [];
  for (const p of s.board.plots) {
    if (!p.card) continue;
    const c = CARDS[p.card];
    if (c.income) out.push({ plot: p.i, gold: c.income * p.level });
  }
  if (s.mods.tithe) out.push({ plot: null, gold: s.mods.tithe });
  return out;
}

// ---- year flow --------------------------------------------------------------------------------------------------
export function startBattle(s, opts = {}) {
  for (const inc of preBattleIncome(s)) s.gold += inc.gold;
  for (const p of s.board.plots) { p.dealt = 0; p.kills = 0; }
  const player = buildArmy(s.board, 'P', { mods: s.mods, gold: s.gold });
  const enemy = enemyArmy(s, s.attacker);
  s.phase = 'battle';
  return new Battle(player, enemy, s, opts);
}

// Called once a battle ends. Returns what the player earned, for the reward show.
export function finishBattle(s, battle) {
  const won = battle.result === 'win';
  const final = CALENDAR[s.year] === 'final';
  const out = { won, gold: GOLD_PER_YEAR + battle.coins, loot: [], lifeLost: !won, final };
  s.gold += out.gold;
  s.stats.kills += battle.kills;
  if (won) s.stats.battlesWon++; else { s.stats.battlesLost++; s.lives--; }
  const r = rng(s);
  if (final) {
    if (won) { s.won = true; s.over = true; s.phase = 'won'; }
    else { s.over = true; s.phase = 'lost'; }
    return out;
  }
  if (s.lives <= 0) { s.over = true; s.phase = 'lost'; return out; }
  const att = champById(s.attacker), mine = champById(s.champ);
  out.loot.push(won ? r.pick(att.deck) : r.pick(mine.deck));
  s.hand.push(...out.loot);
  yearlyGrowth(s.board, r);
  s.phase = 'reward';
  return out;
}

// Pick one of three after each battle (from your own deck; your seat can turn up to level it).
export function offerCards(s) {
  const r = rng(s), mine = champById(s.champ);
  const pool = [...mine.deck, ...mine.deck, mine.seat];
  return [r.pick(pool), r.pick(pool), r.pick(pool)];
}
export function rerollOffer(s) { if (!payReroll(s)) return null; return offerCards(s); }

export function nextYear(s) {
  s.year++;
  s.rerolls = 0;
  for (const rv of s.rivals) if (!rv.peace) rivalTurn(s, rv, s.year);
  for (const rv of s.rivals) if (rv.peace) yearlyGrowth(rv.board, rng(s));
  pickAttacker(s);
  s.phase = 'plan';
}
export function eventFor(s) { return CALENDAR[s.year] || null; }

// Sky Council: three edicts, never one you already hold.
export function offerEdicts(s) {
  const pool = EDICTS.filter((e) => !s.edicts.includes(e.id) || ['loan', 'second_wind', 'apprentice'].includes(e.id));
  return rng(s).shuffle(pool.slice()).slice(0, 3).map((e) => e.id);
}
export function applyEdict(s, id) {
  s.edicts.push(id);
  const m = s.mods;
  if (id === 'loan') s.gold += 99;
  if (id === 'drill') m.count += 2;
  if (id === 'whetstone') m.dmg *= 1.15;
  if (id === 'cloaks') m.hp *= 1.2;
  if (id === 'lenses') { m.towerRange *= 1.25; m.towerDmg *= 1.15; }
  if (id === 'second_wind') s.lives = Math.min(START_LIVES, s.lives + 1);
  if (id === 'rich_soil') m.aura *= 1.5;
  if (id === 'patrons') s.freeRerolls += 3;
  if (id === 'boots') m.speed *= 1.15;
  if (id === 'tithe') m.tithe += 4;
  if (id === 'apprentice') {
    const ps = s.board.plots.filter((p) => p.card && p.level < MAX_LEVEL).sort((a, b) => a.level - b.level).slice(0, 2);
    for (const p of ps) p.level++;
  }
}

export function merchantStock(s) {
  const r = rng(s), mine = champById(s.champ);
  const others = CHAMPIONS.filter((c) => c.id !== s.champ);
  return [r.pick(MERCHANT_POOL), r.pick(mine.deck), r.pick(r.pick(others).deck), r.pick(MERCHANT_POOL), r.pick(mine.deck)];
}
export function merchantPrice(s) { return MERCHANT_BASE + MERCHANT_STEP * s.merchantBuys; }
export function buy(s, id) {
  const price = merchantPrice(s);
  if (s.gold < price) return false;
  s.gold -= price; s.merchantBuys++; s.hand.push(id);
  return true;
}
export function expand(s, i) {
  if (!expandable(s.board).includes(i)) return false;
  s.board.plots[i].open = true;
  return true;
}
export function warOptions(s) { return rng(s).shuffle(s.bench.slice()).slice(0, 2); }
export function declareWar(s, champId) {
  s.bench = s.bench.filter((c) => c !== champId);
  const rv = { champ: champId, board: newBoard(), peace: false, wins: 0 };
  for (let y = 1; y <= s.year; y++) rivalTurn(s, rv, y);          // they have been building all along
  s.rivals.push(rv);
}
export function peaceOptions(s) { return activeRivals(s).slice().sort((a, b) => boardPower(b.board) - boardPower(a.board)).slice(0, 2).map((r) => r.champ); }
export function makePeace(s, champId) {
  if (activeRivals(s).length <= 1) return;
  s.rivals.find((r) => r.champ === champId).peace = true;
}

// ---- battle -----------------------------------------------------------------------------------------------------
let NEXT_ID = 1;
const MISSILE_SPEED = { stone: 13, bolt: 20, beam: 0, coin: 16, fireball: 11, boulder: 10, shell: 10, spear: 26, bee: 0, flame: 0, chain: 0, arrow: 18 };

export class Battle {
  constructor(player, enemy, s, opts = {}) {
    this.s = s;
    this.rng = makeRng((s.seed * 31 + s.year * 977) >>> 0);
    this.units = [];
    this.projectiles = [];
    this.events = [];
    this.t = 0; this.result = null; this.coins = 0; this.kills = 0;
    this.board = s.board;
    this.basePlot = player.seat;
    this.base = cellPos(player.seat);
    this.shooters = player.shooters.map((sh) => ({ ...sh, ...cellPos(sh.plot), timer: 0.6 + this.rng() * 0.6 }));
    this.summoners = player.summoners.map((sm) => ({ ...sm, ...cellPos(sm.plot), timer: 1 + this.rng() * sm.every }));
    this.spawnQueue = [];
    // Player troops pour out of their plots over the first second.
    for (const g of player.units) {
      const pos = cellPos(g.spec.plot);
      for (let k = 0; k < g.count; k++) {
        this.spawnQueue.push({ at: 0.15 + k * 0.06 + this.rng() * 0.2, side: 'P', spec: g.spec, x: pos.x + (this.rng() - 0.5) * 1.6, z: pos.z - 0.6 + (this.rng() - 0.5) * 1.2 });
      }
    }
    // The enemy warband marches in from the far edge, column by column.
    const eGroups = enemy.units.filter((g) => g.count > 0);
    let idx = 0;
    const total = eGroups.reduce((a, g) => a + g.count, 0);
    const cols = Math.max(6, Math.ceil(Math.sqrt(total * 2.2)));
    for (const g of eGroups) {
      for (let k = 0; k < g.count; k++, idx++) {
        const col = idx % cols, row = Math.floor(idx / cols);
        const x = ((col + 0.5) / cols - 0.5) * 16 + (this.rng() - 0.5) * 0.6;
        const z = FIELD.spawnZ - Math.min(row, 6) * 0.6 + (this.rng() - 0.5) * 0.4;
        this.spawnQueue.push({ at: 0.4 + row * 0.35 + this.rng() * 0.3, side: 'E', spec: g.spec, x, z });
      }
    }
    this.spawnQueue.sort((a, b) => a.at - b.at);
    this.grid = new Map();
  }

  spawn(side, spec, x, z) {
    const u = {
      id: NEXT_ID++, side, spec, shape: spec.shape, card: spec.card, plot: spec.plot, boss: spec.boss || null,
      x, z, vx: 0, vz: 0, hp: spec.hp, maxHp: spec.hp, cd: spec.cd, timer: this.rng() * spec.cd, alive: true,
      target: null, face: side === 'P' ? Math.PI : 0, born: this.t, flash: 0, moving: false, r: spec.shape === 'boss' ? 0.9 : spec.shape === 'brute' ? 0.5 : spec.shape === 'tiny' ? 0.29 : 0.38,
    };
    this.units.push(u);
    return u;
  }

  living(side) { return this.units.filter((u) => u.alive && u.side === side); }

  rebuildGrid() {
    const g = this.grid; g.clear();
    for (const u of this.units) {
      if (!u.alive) continue;
      const k = (Math.floor(u.x / 2) + 64) * 1024 + (Math.floor(u.z / 2) + 64);
      let b = g.get(k); if (!b) g.set(k, (b = [])); b.push(u);
    }
  }
  near(x, z, radius, fn) {
    const r = Math.ceil(radius / 2);
    const cx = Math.floor(x / 2), cz = Math.floor(z / 2);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      const b = this.grid.get((cx + i + 64) * 1024 + (cz + j + 64));
      if (b) for (const u of b) fn(u);
    }
  }
  nearestEnemy(u, maxD) {
    let best = null, bd = maxD * maxD;
    const want = u.side === 'P' ? 'E' : 'P';
    const scan = (v) => {
      if (!v.alive || v.side !== want) return;
      let d = (v.x - u.x) ** 2 + (v.z - u.z) ** 2;
      if (v.spec.taunt) d *= 0.35;
      if (d < bd) { bd = d; best = v; }
    };
    if (maxD <= 12) this.near(u.x, u.z, maxD, scan);
    else for (const v of this.units) scan(v);
    return best;
  }

  damage(target, amount, srcPlot, x, z) {
    if (!target.alive) return;
    const dealt = amount * (1 - target.spec.armor) * (1 - (target.spec.guard || 0));
    target.hp -= dealt;
    target.flash = 0.12;
    if (srcPlot != null && srcPlot >= 0 && target.side === 'E') this.board.plots[srcPlot].dealt += dealt;
    if (target.hp <= 0) {
      target.alive = false;
      this.events.push({ t: 'death', x: target.x, z: target.z, side: target.side, shape: target.shape, boss: target.boss });
      if (target.side === 'E') {
        this.kills++;
        if (srcPlot != null && srcPlot >= 0) {
          const p = this.board.plots[srcPlot];
          p.kills++;
          if (p.charms.loot && this.rng() < p.charms.loot) { this.coins++; this.events.push({ t: 'coin', x: target.x, z: target.z }); }
        }
      } else if (target.spec.burst) {
        this.events.push({ t: 'burst', x: target.x, z: target.z });
        this.near(target.x, target.z, 1.6, (v) => { if (v.alive && v.side === 'E' && (v.x - target.x) ** 2 + (v.z - target.z) ** 2 < 1.6 * 1.6) this.damage(v, target.spec.burst, target.plot, v.x, v.z); });
      }
    }
  }
  splash(x, z, radius, amount, side, srcPlot) {
    this.near(x, z, radius + 1, (v) => {
      if (v.alive && v.side !== side && (v.x - x) ** 2 + (v.z - z) ** 2 < radius * radius) this.damage(v, amount, srcPlot, v.x, v.z);
    });
  }

  fire(from, target, dmg, kind, opts) {
    const speed = MISSILE_SPEED[kind] ?? 16;
    if (!speed) {                        // instant: beams, bees, flames, chains
      this.events.push({ t: 'zap', kind, x0: from.x, z0: from.z, y0: from.y ?? 1, x1: target.x, z1: target.z });
      if (opts.aoe) this.splash(target.x, target.z, opts.aoe, dmg, from.side, opts.plot);
      else this.damage(target, dmg, opts.plot, target.x, target.z);
      if (opts.chain) {
        let last = target; const hit = new Set([target.id]);
        for (let k = 1; k < opts.chain; k++) {
          let nxt = null, bd = 16;
          this.near(last.x, last.z, 4, (v) => { if (v.alive && v.side === 'E' && !hit.has(v.id)) { const d = (v.x - last.x) ** 2 + (v.z - last.z) ** 2; if (d < bd) { bd = d; nxt = v; } } });
          if (!nxt) break;
          hit.add(nxt.id);
          this.events.push({ t: 'zap', kind, x0: last.x, z0: last.z, y0: 0.6, x1: nxt.x, z1: nxt.z });
          this.damage(nxt, dmg * 0.8, opts.plot, nxt.x, nxt.z);
          last = nxt;
        }
      }
      return;
    }
    const dx = target.x - from.x, dz = target.z - from.z, dist = Math.hypot(dx, dz);
    let tx = target.x, tz = target.z, len = dist;
    if (opts.pierce) { len = Math.max(dist, opts.range || dist); tx = from.x + dx / (dist || 1) * len; tz = from.z + dz / (dist || 1) * len; }
    this.projectiles.push({
      kind, side: from.side, x: from.x, z: from.z, y: from.y ?? 0.8, x0: from.x, z0: from.z, y0: from.y ?? 0.8,
      tx, tz, target, dmg, plot: opts.plot, aoe: opts.aoe || 0, pierce: opts.pierce,
      t: 0, dur: Math.max(0.12, len / speed), arc: ['stone', 'boulder', 'shell', 'fireball', 'coin'].includes(kind) ? Math.min(3.5, dist * 0.25) : 0.15, hit: new Set(),
    });
  }

  step(dt) {
    if (this.result) return;
    this.t += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.t) {
      const q = this.spawnQueue.shift();
      const u = this.spawn(q.side, q.spec, q.x, q.z);
      if (q.side === 'P') this.events.push({ t: 'pop', x: q.x, z: q.z, plot: q.spec.plot });
    }
    this.rebuildGrid();
    const enrage = this.t > 45 ? 1 + (this.t - 45) * 0.04 : 1;

    // Summoners (Elder Stump, Kiln)
    for (const sm of this.summoners) {
      sm.timer -= dt;
      if (sm.timer <= 0) {
        sm.timer += sm.every;
        this.spawn('P', sm.spec, sm.x + (this.rng() - 0.5), sm.z - 0.8);
        this.events.push({ t: 'pop', x: sm.x, z: sm.z, plot: sm.plot });
      }
    }
    // Towers and the seat
    for (const sh of this.shooters) {
      sh.timer -= dt;
      if (sh.timer > 0) continue;
      let tgt = null;
      if (sh.pick === 'strongest') {
        let best = -1;
        this.near(sh.x, sh.z, sh.range, (v) => { if (v.alive && v.side === 'E' && (v.x - sh.x) ** 2 + (v.z - sh.z) ** 2 < sh.range ** 2 && v.hp > best) { best = v.hp; tgt = v; } });
      } else {
        let bd = sh.range * sh.range;
        this.near(sh.x, sh.z, sh.range, (v) => { if (v.alive && v.side === 'E') { const d = (v.x - sh.x) ** 2 + (v.z - sh.z) ** 2; if (d < bd) { bd = d; tgt = v; } } });
      }
      if (!tgt) { sh.timer = 0.15; continue; }
      sh.timer = sh.cd;
      this.events.push({ t: 'shoot', plot: sh.plot, kind: sh.kind });
      this.fire({ x: sh.x, z: sh.z, y: 2.2, side: 'P' }, tgt, sh.dmg, sh.kind, { plot: sh.plot, aoe: sh.aoe, pierce: sh.pierce, chain: sh.chain, range: sh.range });
    }

    // Units
    for (const u of this.units) {
      if (!u.alive) continue;
      const s = u.spec;
      if (u.flash > 0) u.flash -= dt;
      if (s.regen && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + s.regen * u.maxHp * dt);
      u.timer -= dt;
      if (!u.target || !u.target.alive || (this.t * 60 + u.id) % 20 < 1) {
        u.target = this.nearestEnemy(u, u.side === 'P' ? 99 : (s.range > 2 ? Math.max(6, s.range + 1) : 5));
      }
      let gx, gz, tgt = u.target;
      if (tgt) { gx = tgt.x; gz = tgt.z; }
      else if (u.side === 'E') { gx = this.base.x; gz = this.base.z; }
      else { const home = cellPos(u.plot >= 0 ? u.plot : this.basePlot); gx = home.x; gz = home.z - 2.2; }
      const dx = gx - u.x, dz = gz - u.z, d = Math.hypot(dx, dz) || 1e-6;
      const reach = tgt ? s.range + u.r + tgt.r * 0.6 : (u.side === 'E' ? 0.2 : 0.8);
      u.moving = false;
      if (d > reach) {
        const sp = s.speed * (u.side === 'E' ? enrage : 1) * (this.t - u.born < 0.3 ? 0.4 : 1);
        u.vx = dx / d * sp; u.vz = dz / d * sp;
        u.x += u.vx * dt; u.z += u.vz * dt;
        u.moving = true;
        u.face = Math.atan2(dx, dz);
      } else if (tgt) {
        u.face = Math.atan2(dx, dz);
        if (u.timer <= 0) {
          u.timer = s.cd;
          this.events.push({ t: 'swing', id: u.id });
          if (s.range > 2) this.fire({ x: u.x, z: u.z, y: 0.9, side: u.side }, tgt, s.dmg, s.missile || 'arrow', { plot: u.side === 'P' ? u.plot : -1 });
          else if (s.aoe) { this.events.push({ t: 'slam', x: tgt.x, z: tgt.z }); this.splash(tgt.x, tgt.z, s.aoe, s.dmg, u.side, -1); }
          else this.damage(tgt, s.dmg, u.side === 'P' ? u.plot : -1, tgt.x, tgt.z);
        }
      }
      // keep a little personal space
      this.near(u.x, u.z, 1.2, (v) => {
        if (v === u || !v.alive) return;
        const ox = u.x - v.x, oz = u.z - v.z, dd = ox * ox + oz * oz, min = (u.r + v.r) * 0.95;
        if (dd < min * min && dd > 1e-8) { const k = (min - Math.sqrt(dd)) * 0.5 / Math.sqrt(dd); u.x += ox * k; u.z += oz * k; }
      });
      u.x = Math.max(FIELD.minX, Math.min(FIELD.maxX, u.x));
      u.z = Math.max(FIELD.minZ - 6, Math.min(FIELD.maxZ, u.z));
      if (u.side === 'E' && (u.x - this.base.x) ** 2 + (u.z - this.base.z) ** 2 < 1.1 * 1.1) {
        this.result = 'lose';
        this.events.push({ t: 'breach', x: u.x, z: u.z });
        return;
      }
    }

    // Projectiles
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.target && p.target.alive && !p.pierce) { p.tx = p.target.x; p.tz = p.target.z; }
      const k = Math.min(1, p.t / p.dur);
      p.x = p.x0 + (p.tx - p.x0) * k; p.z = p.z0 + (p.tz - p.z0) * k;
      p.y = p.y0 + (0.5 - p.y0) * k + p.arc * 4 * k * (1 - k);
      if (p.pierce) {
        this.near(p.x, p.z, 1.2, (v) => { if (v.alive && v.side === 'E' && !p.hit.has(v.id) && (v.x - p.x) ** 2 + (v.z - p.z) ** 2 < 0.6) { p.hit.add(v.id); this.damage(v, p.dmg, p.plot, v.x, v.z); } });
      }
      if (k >= 1) {
        p.done = true;
        if (p.pierce) continue;
        if (p.aoe) { this.events.push({ t: 'boom', x: p.tx, z: p.tz, r: p.aoe, kind: p.kind }); this.splash(p.tx, p.tz, p.aoe, p.dmg, p.side, p.plot); }
        else if (p.target && p.target.alive) this.damage(p.target, p.dmg, p.plot, p.tx, p.tz);
        this.events.push({ t: 'hit', x: p.tx, z: p.tz, kind: p.kind });
      }
    }
    // pierce spears fly on past their target to the end of their range
    this.projectiles = this.projectiles.filter((p) => !p.done);

    if (!this.spawnQueue.length && this.t > 1 && !this.units.some((u) => u.alive && u.side === 'E')) {
      this.result = 'win';
      this.events.push({ t: 'cleared' });
    }
    if ((this.t * 60 | 0) % 30 === 0) this.units = this.units.filter((u) => u.alive);
  }
}
