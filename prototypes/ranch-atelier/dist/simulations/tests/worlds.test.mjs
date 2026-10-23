// AW-STUDY-0048 Changing worlds: doors and rides pair up, the backpack follows, the crew waits for itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import {GATES, WORLDS, CREW, REGION_IDS, newState, pickUp, canUse, travel, viaMap, viaMemory, tally, memoryTrips} from '../worlds/worlds.mjs';

test('every way there is a way back, in a world that exists', () => {
 for (const [id, g] of Object.entries(GATES)) {
  assert.ok(WORLDS[g.world], id); assert.equal(GATES[g.to].to, id, id + ' pairs'); assert.equal(GATES[g.to].kind, g.kind);
 }
});
test('the three Winchester regions keep the ids the town thread fixed', () => {
 assert.deepEqual([...REGION_IDS].sort(), ['abbie-daddy-side', 'anis-side', 'downtown']);
 for (const g of Object.values(GATES)) if (g.region) assert.ok(REGION_IDS.includes(g.region));
});
test('the cellar stays shut without the café key, opens with it, and the coins land in the backpack', () => {
 let s = newState({at: 'town:cafe-cellar'});
 assert.equal(travel(s, 'town:cafe-cellar').ok, false);
 s = pickUp(s, 'cafe-key');
 const r = travel(s, 'town:cafe-cellar');
 assert.ok(r.ok); assert.equal(r.state.world, 'basement'); assert.equal(r.state.backpack.coins, 10);
 assert.ok(r.state.backpack.items.includes('cafe-key'), 'the key came along');
 const back = travel(r.state, 'basement:stairs');
 assert.equal(back.state.world, 'town'); assert.equal(back.state.backpack.coins, 10, 'no second reward');
});
test('Main Street to Launch to the Moon base takes the crew, and the tile arrives with the truck', () => {
 let s = newState();
 assert.equal(canUse(s, 'town:truck', {couch: true}).ok, false);
 assert.deepEqual(canUse(s, 'town:truck', {couch: true}).waiting, CREW.map(c => c.id));
 s = {...s, ready: CREW.map(c => c.id)};
 s = travel(s, 'town:truck', {couch: true}).state; assert.equal(s.world, 'launch'); assert.ok(s.backpack.items.includes('rocket-tile'));
 s = {...s, ready: ['abbie', 'ani', 'daddy']};
 s = travel(s, 'launch:rocket', {couch: true}).state; assert.equal(s.world, 'moon'); assert.ok(s.backpack.items.includes('moon-key'));
 assert.notEqual(s.hat, 'daddy', 'the hat moved on after the trips'); assert.ok(CREW.some(c => c.id === s.hat));
});
test('the map lands at the way back and the memory coin only goes where you have been', () => {
 let s = newState(); s = viaMap(s, 'ranch').state; assert.equal(s.world, 'ranch'); assert.equal(s.at, 'ranch:gate');
 assert.equal(viaMemory(s, 'moon').ok, false);
 s = {...s, visited: [...s.visited, 'basement']}; assert.deepEqual(memoryTrips(s), ['basement']);
 assert.equal(viaMemory(s, 'basement').state.world, 'basement');
});
test('ties on the TV go to the Captain\'s Hat', () => {
 assert.deepEqual(tally({abbie: 'go', ani: 'stay', daddy: 'go'}, 'ani'), {go: true, by: 'majority'});
 assert.deepEqual(tally({abbie: 'go', ani: 'stay'}, 'ani'), {go: false, by: 'hat'});
});
