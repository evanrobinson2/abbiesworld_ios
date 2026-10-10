import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/core/rules.js';

test('2d6 odds match the dice', () => {
  assert.equal(R.prob2d6AtLeast(2), 1);
  assert.equal(R.prob2d6AtLeast(7), 21 / 36);
  assert.equal(R.prob2d6AtLeast(12), 1 / 36);
  assert.equal(R.prob2d6AtLeast(13), 0);
});

test('to-hit target number follows the engine formula', () => {
  // 4 + 2x medium + walked 1 + target moved 5 (+2) + heat 9 (+1) - gunnery 2 = 8
  assert.equal(R.toHitTN({ bracket: 1, attackerMove: 'walk', targetSquares: 5, heat: 9, skill: 2 }), 8);
  assert.equal(R.toHitTN({ bracket: 0 }), 4);
  assert.equal(R.targetMoveMod(12), 4);
  assert.equal(R.targetMoveMod(40), 4);
});

test('heat modifier steps at 8, 13, 17 and 24', () => {
  assert.deepEqual([0, 7, 8, 12, 13, 17, 24, 30].map(R.heatMod), [0, 0, 1, 1, 2, 3, 4, 4]);
});

test('range brackets use the "below" limits', () => {
  const ml = { short: 12, medium: 21, long: 30 };
  assert.deepEqual([0, 11, 12, 20, 21, 29, 30].map(d => R.rangeBracket(ml, d)), [0, 0, 1, 1, 2, 2, null]);
});

test('end of round: sinks cool, redline damages, 30 shuts down', () => {
  assert.deepEqual(R.endRoundHeat(12, 5), { heat: 7, overheatDamage: 0, shutdown: false });
  assert.deepEqual(R.endRoundHeat(28, 5), { heat: 23, overheatDamage: 3, shutdown: false });
  assert.deepEqual(R.endRoundHeat(40, 5), { heat: 35, overheatDamage: 15, shutdown: true });
  assert.equal(R.addHeat(38, 8), R.HEAT_CAP);
  assert.equal(R.addHeat(3, -6), 0);
});

test('damage goes armour, then structure, then inward', () => {
  const m = R.makeMechState({ armor: { LA: 2, LT: 3, LL: 1, H: 1, CT: 4, RA: 1, RT: 1, RL: 1 }, structure: { LA: 1, LT: 2, LL: 1, H: 1, CT: 2, RA: 1, RT: 1, RL: 1 } });
  const ev = R.applyDamage(m, 'LA', 6);
  assert.deepEqual(ev, [{ loc: 'LA', armor: 2, structure: 1 }, { loc: 'LT', armor: 3, structure: 0 }]);
  R.applyDamage(m, 'CT', 6);
  assert.equal(m.destroyed, true);
});

test('practice referee calls half armour or a bare centre torso', () => {
  const m = R.makeMechState({ armor: { LA: 4, LT: 4, LL: 4, H: 4, CT: 4, RA: 4, RT: 4, RL: 4 }, structure: { LA: 1, LT: 1, LL: 1, H: 1, CT: 1, RA: 1, RT: 1, RL: 1 } });
  assert.equal(R.practiceOut(m), false);
  m.armor.CT = 0;
  assert.equal(R.practiceOut(m), true);
});
