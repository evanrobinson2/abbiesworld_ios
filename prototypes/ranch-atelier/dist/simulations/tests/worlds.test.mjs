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

// ---- round 2: boards ---------------------------------------------------------------------------------------
import {newLibrary, newBoard, switchTo, rename, place, archive, restore, overview, layout, spiral, tileCount, pointerOf} from '../worlds/boards.mjs';
test('a new board is blank, shown at once, and leaves the old one untouched', () => {
 const a = newLibrary(), b = newBoard(a);
 assert.equal(b.boards.length, 2); assert.equal(b.current, 'board-2'); assert.equal(tileCount(b.boards[1]), 0);
 assert.deepEqual(b.boards[0], a.boards[0]);
 assert.equal(newBoard(b).boards[2].name, 'A place of your own 2');
});
test('a copy keeps where it came from and edits do not touch the original', () => {
 let l = newBoard(newLibrary(), {from: 'board-1'}); const c = l.boards[1];
 assert.equal(c.made, 'copy'); assert.equal(c.from, 'board-1'); assert.equal(c.name, 'Copy of Our ranch');
 l = place(l, c.id, 2, 0, 'pond'); assert.equal(tileCount(l.boards[1]), tileCount(l.boards[0]) + 1);
});
test('switching only moves the pointer; a board in the attic cannot be shown until restored', () => {
 let l = newBoard(newLibrary(), {name: 'Moon ranch', land: 'moon'});
 assert.equal(switchTo(l, 'board-1').current, 'board-1'); assert.deepEqual(pointerOf(switchTo(l, 'board-1')), {key: 'current', id: 'board-1'});
 l = archive(l, 'board-2'); assert.equal(l.current, 'board-1'); assert.throws(() => switchTo(l, 'board-2'));
 l = restore(l, 'board-2'); assert.equal(l.current, 'board-2'); assert.equal(l.boards.length, 2);
 assert.throws(() => archive(archive(l, 'board-2'), 'board-1'), /at least one/);
});
test('names are trimmed, short and unique', () => {
 let l = newBoard(newLibrary(), {name: '  Dino   Valley  '}); assert.equal(l.boards[1].name, 'Dino Valley');
 assert.throws(() => rename(l, 'board-2', 'Our ranch')); assert.throws(() => rename(l, 'board-2', '   '));
 assert.equal(rename(l, 'board-2', 'x'.repeat(50)).boards[1].name.length, 32);
});
test('the zoomed-out view puts the shown board in the middle and keeps one open slot', () => {
 let l = newBoard(newBoard(newLibrary())); l = switchTo(l, 'board-1'); const o = overview(l);
 assert.deepEqual(o.boards[0], {id: 'board-1', q: 0, r: 0}); assert.equal(o.boards.length, 3);
 const seen = new Set([...o.boards, o.openSlot].map(s => s.q + ',' + s.r)); assert.equal(seen.size, 4);
 assert.equal(new Set(spiral(19).map(s => s.q + ',' + s.r)).size, 19);
});
test('the stable map keeps each board in its slot when you switch', () => {
 const l = newBoard(newBoard(newLibrary())), a = layout(l), b = layout(switchTo(l, 'board-1'));
 assert.deepEqual(a, b); assert.equal(a.boards.length, 3); assert.deepEqual(a.openSlot, spiral(4)[3]);
});
