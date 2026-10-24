// node tools/diorama-swipe/test.mjs : the generator must get better against a hidden taste, and replays must be deterministic.
import fs from 'node:fs'; import assert from 'node:assert/strict';
import {Learner, Generator, mulberry32, summarize, DECKS} from '../../preview/diorama-swipe/engine.mjs';
const items = JSON.parse(fs.readFileSync(new URL('../../preview/diorama-swipe/models.json', import.meta.url))).items;
const by = new Map(items.map(i => [i.key, i]));

// 1. Determinism and shape.
{ const g = new Generator(items, new Learner(items)); const a = g.make('setting', 42), b = g.make('setting', 42);
  assert.deepEqual(a, b); assert.ok(a.keys.length >= 3 && a.layout.length === a.keys.length);
  for (const d of Object.keys(DECKS)) { let ok = 0; for (let s = 1; s <= 40; s++) if (g.make(d, s * 31)) ok++; assert.ok(ok >= 30, d + ' makes dioramas'); }
  for (const p of a.layout) assert.ok(Math.hypot(p.x, p.z) <= 1, 'inside the hex'); }

// 2. A made-up human: loves animals and the Ranch, loves one particular building pair, hates machines and the Moon base.
const human = keys => { let s = 0; for (const k of keys) { const i = by.get(k); s += (i.type === 'Animal' ? 1.2 : 0) + (i.place === 'Ranch' ? .8 : 0) + (i.place === 'Cafe' ? .5 : 0) - (i.type === 'Machine and tech' ? 1.2 : 0) - (i.place === 'Moon base' ? 1 : 0) - (i.place === 'Wasteland' ? 1 : 0); } return s / keys.length > .35; };
function run(learn, seed, votes = 300) {
  const L = new Learner(items), g = new Generator(items, L), log = []; let n = 0, b = 0;
  while (n < votes) { for (const d of g.batch(10, 1000 * ++b + seed)) { const like = human(d.keys); log.push({vote: like ? 'liked' : 'hated', guess: d.guess}); if (learn) L.vote(d.keys, like); if (++n >= votes) break; } }
  return [summarize(log.slice(0, 10), 10)[0], ...summarize(log.slice(-50), 50)];
}
let first = 0, last = 0, ctrl = 0; const R = 8;
for (let s = 1; s <= R; s++) { const a = run(true, s), c = run(false, s); first += a[0].rate; last += a[1].rate; ctrl += c[1].rate; }
first /= R; last /= R; ctrl /= R;
console.log(`hot dog rate: first 10 votes ${(first * 100).toFixed(0)}%, last 50 ${(last * 100).toFixed(0)}%, no-learning control ${(ctrl * 100).toFixed(0)}%`);
assert.ok(last > first + .1, 'learning lifts the hot dog rate'); assert.ok(last > ctrl + .1, 'beats the no-learning control');

// 3. Replaying the same votes gives the same learner.
{ const g = new Generator(items, new Learner(items)), ds = g.batch(10, 5); const A = new Learner(items), B = new Learner(items); ds.forEach((d, i) => { A.vote(d.keys, i % 2 === 0); B.vote(d.keys, i % 2 === 0); }); assert.equal(A.predict(ds[0].keys), B.predict(ds[0].keys)); }
console.log('diorama-swipe: ok');
