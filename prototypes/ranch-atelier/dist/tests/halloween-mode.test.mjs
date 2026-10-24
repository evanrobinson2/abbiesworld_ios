// Halloween mode rules (simulations/halloween-mode/rules.mjs): the switch, the doors, the sweets, the charm and the light.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mode, nextStored, nightKey, pickDoors, knock, answered, freshNight, grade, TREATS, CHARM_AT, MAX_DOORS_PER_HEX, MIN_GAP} from '../simulations/halloween-mode/rules.mjs';

const houses = Array.from({length: 60}, (_, i) => ({x: (i % 10) * 18 - 90, z: Math.floor(i / 10) * 18 - 54, yaw: (i % 4) * Math.PI / 2, tier: i % 3}));

test('it is off for everyone until the experiment is switched on, then follows the season', () => {
  const oct31 = new Date(2026, 9, 31), june = new Date(2026, 5, 10);
  assert.equal(mode({date: oct31, search: ''}).on, false, 'in season but not switched on');
  assert.equal(mode({date: oct31, search: '?experimental=halloween'}).on, true);
  assert.equal(mode({date: oct31, stored: {experimental: 'other,halloween'}}).on, true, 'a remembered flag counts');
  assert.equal(mode({date: june, search: '?experimental=halloween'}).on, false, 'out of season');
  assert.equal(mode({date: new Date(2026, 10, 1), stored: {experimental: 'halloween'}}).on, true, 'Nov 1 is still in');
  assert.equal(mode({date: new Date(2026, 10, 2), stored: {experimental: 'halloween'}}).on, false);
});
test('the developer toggle beats the date either way, and is remembered', () => {
  const june = new Date(2026, 5, 10), oct31 = new Date(2026, 9, 31);
  assert.equal(mode({date: june, search: '?halloween=on'}).on, true);
  assert.equal(mode({date: oct31, search: '?halloween=off', stored: {experimental: 'halloween'}}).on, false);
  assert.equal(mode({date: june, stored: nextStored('?halloween=on', {})}).on, true);
  assert.equal(nextStored('?experimental=off', {experimental: 'halloween'}).experimental, '');
  assert.deepEqual(nextStored('?experimental=halloween', {experimental: 'a'}).experimental.split(','), ['a', 'halloween']);
});
test('the same houses give treats every night, never too close together, never past the cap', () => {
  const a = pickDoors(houses, {seed: 3}), b = pickDoors(houses, {seed: 3});
  assert.deepEqual(a.map(d => d.id), b.map(d => d.id));
  assert.ok(a.length > 1 && a.length <= MAX_DOORS_PER_HEX);
  for (const [i, d] of a.entries()) for (const e of a.slice(i + 1)) assert.ok(Math.hypot(d.house.x - e.house.x, d.house.z - e.house.z) >= MIN_GAP);
  for (const d of a) assert.ok(Math.hypot(d.x - d.house.x, d.z - d.house.z) > 5, 'the porch is in front of the house');
  assert.deepEqual(pickDoors([], {seed: 1}), []);
});
test('every door gives one sweet a night, the sweets are all PG, and five doors earn the charm once', () => {
  const doors = pickDoors(houses, {seed: 5}).concat(pickDoors(houses, {seed: 6}));
  let night = freshNight('2026-10-31'), charms = 0, given = [];
  for (const d of doors.slice(0, 7)) {
    const r = knock(night, d); assert.equal(r.kind, 'treat'); assert.match(r.treat.id, /^hw-/); given.push(r.treat.id);
    const out = answered(night, d); night = out.night; if (out.charm) charms++;
  }
  assert.equal(charms, 1, 'the charm comes at door five and not again');
  assert.equal(new Set(given).size, given.length, 'every sweet is its own item');
  assert.equal(night.treats, 7); assert.ok(night.treats >= CHARM_AT);
  assert.equal(knock(night, doors[0]).kind, 'again', 'a door that has given has no more tonight');
  assert.equal(answered(night, doors[0]).night.treats, 7, 'asking twice never adds a sweet');
  for (const t of TREATS) assert.doesNotMatch(JSON.stringify(t), /blood|gore|skull|kill|dead|scary|fright|horror/i);
});
test('the light is dusk-heavy at night, gentler at noon, and always a real colour', () => {
  const noon = grade(12), night = grade(23);
  assert.ok(night.w > noon.w && night.dark > .9 && noon.dark < .05);
  for (const g of [noon, night, grade(0), grade(18.5)]) { assert.match(g.bg, /^#[0-9a-f]{6}$/i); assert.ok(g.w > .5 && g.w <= 1 && g.sunI > 0 && g.hemiI > 0); }
  assert.equal(nightKey(new Date(2026, 9, 5)), '2026-10-05');
});
