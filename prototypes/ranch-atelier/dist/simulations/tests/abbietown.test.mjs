// AW-STUDY-0042 Abbie's Town: the land is true scale, the town grows on it without trespassing, the manifest counts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeLand, growTown, summary, SPOTS} from '../abbietown/town.mjs';
import {manifest} from '../abbietown/manifest.mjs';

const land = makeLand(JSON.parse(readFileSync(new URL('../abbietown/land.json', import.meta.url))));

test('the land keeps its real heights and water', () => {
 assert.equal(land.W, 6800); assert.equal(land.D, 4800);
 const h = Array.from(land.H); assert.ok(Math.min(...h) > 0 && Math.max(...h) > 100 && Math.max(...h) < 120);
 const mystic = land.raw.water.find(w => /upper mystic/i.test(w.n)); assert.ok(mystic && mystic.lvl < 6);
 assert.ok(!land.raw.roads.some(r => r.c > 4), 'local streets are counted, not kept');
});

test('the town grows: fewer houses when charming, none on water, the places all placed apart', () => {
 const real = growTown(land, {charm: 0}), abbie = growTown(land, {charm: 1});
 assert.ok(abbie.houses.length < real.houses.length && abbie.houses.length > 800);
 for (const h of abbie.houses) assert.ok(isNaN(land.waterAt(h.x, h.y)));
 assert.equal(abbie.spots.length, SPOTS.length);
 for (const s of abbie.spots) assert.ok(Number.isFinite(s.x) && Number.isFinite(s.y), s.id);
 const shops = abbie.spots.filter(s => s.at === 'centre');
 for (const a of shops) for (const b of shops) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 26);
 assert.deepEqual(growTown(land, {charm: 1}).houses.slice(0, 5), abbie.houses.slice(0, 5), 'deterministic');
});

test('the manifest counts down to the soccer ball', () => {
 const t = growTown(land, {charm: 1}), rows = manifest(land, t, summary(land, t));
 const ball = rows.find(r => /soccer ball/i.test(r.item));
 assert.ok(ball && ball.size <= .22 && ball.town > 0 && ball.real > ball.town);
 assert.ok(rows.every(r => Number.isFinite(r.town) && Number.isFinite(r.real)));
});

test('the coffee shop anchors sit on land, kerbside and clear of the shop, for other studies', async () => {
  const {anchors, growTown, makeLand} = await import('../abbietown/town.mjs');
  const {readFileSync} = await import('node:fs');
  const land = makeLand(JSON.parse(readFileSync(new URL('../abbietown/land.json', import.meta.url))));
  const a = anchors(land, growTown(land, {charm: 1})).cafe;
  for (const k of ['at', 'door', 'curb', 'street', 'rocketPort']) assert.ok(Number.isFinite(a[k].x + a[k].y + a[k].z), k);
  const d = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  assert.ok(d(a.door, a.at) > 5 && d(a.curb, a.street) > 1 && d(a.rocketPort, a.street) < 3);
});

test('the seven-hex region carves three regions of one third each, with the places inside', async () => {
  const {regionOf, placeRegions} = await import('../abbietown/regions.mjs');
  const n = {}; let all = 0;
  for (let x = 0; x < 6800; x += 20) for (let y = 0; y < 4800; y += 20) { const r = regionOf(x, y); if (r) { all++; n[r.region] = (n[r.region] || 0) + 1; } }
  for (const k of ['abbie-daddy-side', 'anis-side', 'downtown']) assert.ok(Math.abs(n[k] / all - 1 / 3) < .03, k);
  const w = placeRegions(growTown(land, {charm: 1}));
  assert.equal(w.cafe.region, 'downtown'); assert.equal(w.common.region, 'downtown'); assert.equal(w.home.region, 'abbie-daddy-side'); assert.equal(w.ani.region, 'anis-side');
  for (const id of ['cafe', 'muraco', 'leonard', 'ginn', 'horn', 'home', 'ani']) assert.ok(w[id], id + ' is inside the greater hex');
});

import {ENTRANCES, backUrl, available} from '../abbietown/entrances.mjs';
import {GATES} from '../worlds/worlds.mjs';
test('every town entrance is a real gate of the worlds model, or a known town-only one', () => {
  for (const id of Object.keys(ENTRANCES)) { assert.ok(id.startsWith('town:')); if (GATES[id]) assert.equal(GATES[id].world, 'town'); }
  assert.equal(backUrl('town:lab-door'), '/town?at=town%3Alab-door');
  assert.ok(!available('town:cafe-cellar', {items: []})); assert.ok(available('town:cafe-cellar', {items: ['cafe-key']}));
  for (const e of Object.values(ENTRANCES)) assert.ok(e.url || e.kind === 'stage');
});
