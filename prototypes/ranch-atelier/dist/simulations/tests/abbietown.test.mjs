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
