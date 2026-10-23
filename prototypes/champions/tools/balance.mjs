// Headless balance run: a simple auto-player plays full 33-year runs with each champion, using the same rules and
// battle code as the game. Usage: node tools/balance.mjs [runsPerChampion]
import { CHAMPIONS, CARDS } from '../js/data.js';
import * as G from '../js/sim.js';

const RUNS = Number(process.argv[2] || 6);

function score(s, id, i) {
  const kind = G.playKind(s, id, i);
  if (!kind) return -1;
  const p = s.board.plots[i], c = CARDS[id];
  if (kind === 'level') return 10 + p.level;
  if (kind === 'charm' || kind === 'spell') return 8 + p.level;
  let sc = 5;
  const nb = G.neighbours(i).map((n) => s.board.plots[n]).filter((q) => q.open && q.card);
  if (c.aura || c.growth) sc += nb.filter((q) => CARDS[q.card].type === 'troop' || CARDS[q.card].type === 'tower').length * 2;
  if (c.type === 'troop') sc += nb.filter((q) => CARDS[q.card].aura || CARDS[q.card].growth).length * 2;
  const r = Math.floor(i / G.GRID);
  if (c.type === 'tower' || c.type === 'seat') sc += (4 - r) * 0.5;   // towers forward
  return sc;
}

function autoPlan(s) {
  if (!G.seatPlot(s.board)) {
    const k = s.hand.findIndex((id) => CARDS[id].type === 'seat');
    G.play(s, k, 17);
  }
  while (s.hand.length > G.handLimit(s)) {
    let best = null;
    s.hand.forEach((id, h) => s.board.plots.forEach((p) => { const v = score(s, id, p.i); if (v > 0 && (!best || v > best.v)) best = { v, h, i: p.i }; }));
    if (best) G.play(s, best.h, best.i); else G.discard(s, 0);
  }
}

function runBattle(s) {
  const b = G.startBattle(s);
  let steps = 0;
  while (!b.result && steps < 60 * 240) { b.step(1 / 60); steps++; }
  if (!b.result) b.result = 'lose';
  return b;
}

function playRun(champ, seed) {
  const s = G.newRun(champ, seed);
  const trace = [];
  while (!s.over) {
    autoPlan(s);
    const b = runBattle(s);
    const rv = s.rivals.find((r) => r.champ === s.attacker);
    trace.push({ y: s.year, res: b.result[0], t: Math.round(b.t), me: Math.round(G.boardPower(s.board)), them: Math.round(G.boardPower(rv.board)), units: b.units.length });
    const out = G.finishBattle(s, b);
    if (s.over) break;
    const offer = G.offerCards(s);
    s.hand.push(offer[0]);
    G.nextYear(s);
    const ev = G.eventFor(s);
    if (ev === 'council') G.applyEdict(s, G.offerEdicts(s)[0]);
    if (ev === 'merchant') { const st = G.merchantStock(s); while (s.gold > G.merchantPrice(s) + 20 && st.length) G.buy(s, st.shift()); }
    if (ev === 'spire') { const ex = G.expandable(s.board); if (ex.length) G.expand(s, ex[0]); }
    if (ev === 'war') { const o = G.warOptions(s); if (o.length) G.declareWar(s, o[0]); }
    if (ev === 'peace') G.makePeace(s, G.peaceOptions(s)[0]);
  }
  return { s, trace };
}

const t0 = Date.now();
for (const c of CHAMPIONS) {
  let wins = 0, years = 0, lost = [];
  for (let k = 0; k < RUNS; k++) {
    const { s, trace } = playRun(c.id, 1000 + k * 7919);
    if (s.won) wins++;
    years += s.year;
    lost.push(trace.filter((t) => t.res === 'l').map((t) => t.y).join(','));
    if (k === 0) console.log(c.id, trace.filter((t) => t.y % 4 === 1 || t.res === 'l').map((t) => `y${t.y}:${t.res}${t.t}s me${t.me}/them${t.them}`).join(' '));
  }
  console.log(`${c.id.padEnd(10)} wins ${wins}/${RUNS}  avg end year ${(years / RUNS).toFixed(1)}  losses at [${lost.join(' | ')}]`);
}
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
