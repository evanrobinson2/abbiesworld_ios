import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeArrow, lights, PLACE, placeObject} from '../abbietown/quest-guide.mjs';
import * as Q from '../quests.mjs';

const mem = () => { const m = new Map(); return {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v)}; };

test('a point on screen has no arrow, one off screen gets an arrow on the edge pointing at it', () => {
 assert.equal(edgeArrow({x: .2, y: -.3, z: .5}, 1000, 600), null);
 const r = edgeArrow({x: 3, y: 0, z: .5}, 1000, 600, 40); assert.ok(Math.abs(r.x - 960) < 1e-6 && Math.abs(r.y - 300) < 1e-6 && Math.abs(r.angle) < 1e-6);
 const up = edgeArrow({x: 0, y: 2, z: .5}, 1000, 600, 40); assert.ok(Math.abs(up.y - 40) < 1e-6 && Math.abs(up.angle + Math.PI / 2) < 1e-6);
});
test('a place behind the camera points the opposite way', () => {
 const r = edgeArrow({x: .5, y: 0, z: 1.2}, 1000, 600); assert.ok(r.x < 500);
});
test('every place a favour needs has a board spot, and none is the parked lab', () => {
 for (const t of Q.TEMPLATES) for (const s of t.steps) assert.ok(PLACE[s.at], `${t.id}: ${s.at}`);
});
test('lights follow the next step of each open favour', () => {
 Q.useStore(mem()); Q.useInventory({has: () => false, add: () => true});
 Q.accept('bake-sugar');
 assert.deepEqual(lights().map(l => l.at), ['common']);
});
test('placeObject finds a spot on any tile and returns null when it is missing', () => {
 const g = {}; const tiles = {a: {spots: {}}, b: {spots: {highschool: {g}}}};
 assert.equal(placeObject(tiles, 'school'), g); assert.equal(placeObject(tiles, 'common'), null); assert.equal(placeObject(undefined, 'cafe'), null);
});
test('forItem finds the favour for the object she carries, and says where she goes next', () => {
 Q.useStore(mem()); Q.useInventory({has: () => true, add: () => true});
 assert.equal(Q.forItem('quest-sugar'), null);
 Q.accept('bake-sugar');
 const f = Q.forItem('quest-sugar'); assert.equal(f.quest.id, 'bake-sugar'); assert.equal(f.next.at, 'common');
 assert.equal(Q.forItem('nothing'), null);
});
