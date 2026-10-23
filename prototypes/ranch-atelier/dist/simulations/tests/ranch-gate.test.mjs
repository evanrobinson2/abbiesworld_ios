// AW-STUDY-0048: the ranch gate pairs with the town's ranch gate, and finds ground on the board's rim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {GATES, newState, travel} from '../worlds/worlds.mjs';

import {RANCH_GATE, gateSpot, rideUrl} from '../worlds/ranch-gate.mjs';
import {ENTRANCES} from '../abbietown/entrances.mjs';
test('the ranch gate pairs with the town ranch gate, in the model and in the town registry', () => {
 assert.equal(GATES[RANCH_GATE.id].to, RANCH_GATE.to); assert.equal(GATES[RANCH_GATE.to].to, RANCH_GATE.id);
 assert.ok(ENTRANCES[RANCH_GATE.to], 'town registry has the way back'); assert.equal(ENTRANCES[RANCH_GATE.to].url, '/?from=town');
 assert.equal(rideUrl(), '/town?at=town:ranch-gate');
 const s = travel(newState({world: 'ranch', at: 'ranch:gate'}), 'ranch:gate'); assert.equal(s.state.world, 'town');
});
test('the gate stands on the rim and walks inward until it finds ground', () => {
 const b = {min: {x: -5, z: -5}, max: {x: 5, z: 5}}; let calls = 0;
 const spot = gateSpot(b, (x, z) => (++calls < 4 ? null : 1.5)); assert.ok(spot && spot.y === 1.5 && spot.f < .84);
 assert.equal(gateSpot(b, () => null), null);
});
