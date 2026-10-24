// AW-STUDY-0062 Scene Builder Lab: the scene is a pure fold of a base and an ordered list of edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILIES, TOPOS, defaults, fold, worldHash, key, hexDist} from '../scene-lab/engine.mjs';

const ops = [{t: 'place', q: 0, r: 0, kind: 'tree', g: 1}, {t: 'height', q: 1, r: 0, d: 2, g: 2}, {t: 'env', k: 'gravity', v: 1.62, g: 3}, {t: 'reroll', v: 55, g: 4}, {t: 'recipe', k: 'season', v: 'winter', g: 5}];

test('the same base and edits always give the same world', () => {
  assert.equal(worldHash(fold(defaults(), ops)), worldHash(fold(defaults(), JSON.parse(JSON.stringify(ops)))));
});
test('dropping the last edit group is an undo', () => {
  const before = worldHash(fold(defaults(), ops.slice(0, 4))), after = worldHash(fold(defaults(), ops));
  assert.notEqual(before, after);
  assert.equal(worldHash(fold(defaults(), ops.slice(0, 4))), before);
});
test('every family builds on every land shape with a hero and nothing on water', () => {
  for (const f of Object.keys(FAMILIES)) for (const t of Object.keys(TOPOS)) {
    const b = defaults(); b.recipe.family = f; b.recipe.topo = t; const W = fold(b, []);
    assert.ok(W.props.size > 5, `${f}/${t} has things`);
    for (const p of W.props.values()) { const c = W.cells.get(key(p.q, p.r)); assert.ok(c, 'on the board'); assert.ok(!c.water || p.kind === 'boat', `${f}/${t} ${p.kind} not in water`); }
  }
});
test('things you place survive a new first pass; the first pass is replaced', () => {
  const W = fold(defaults(), [{t: 'place', q: 0, r: 0, kind: 'rock'}, {t: 'reroll', v: 999}]);
  const p = W.props.get(key(0, 0)); assert.equal(p?.kind, 'rock'); assert.equal(p.own, true);
});
test('buildings never stand on a slope; the board is a hex of the asked radius', () => {
  const b = defaults(); b.recipe.radius = 4; const W = fold(b, []);
  assert.equal(W.cells.size, 61); for (const c of W.cells.values()) assert.ok(hexDist(c.q, c.r) <= 4);
});
test('asset kinds turned out are never used by the first pass', () => {
  const b = defaults(); b.recipe.out = ['Plant']; const W = fold(b, []);
  for (const p of W.props.values()) assert.ok(!['tree', 'pine', 'palm', 'bush', 'deadtree', 'mushroom'].includes(p.kind));
});
