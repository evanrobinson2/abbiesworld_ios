import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
import { parseWorld, neighbors, isNeighbor, hexCenter, pixelToHex, findHexPath, specialAt, passable, hexArt, roadAxis, roadLinks, coverAt, AXIS_ROTATION } from '../src/core/hex.js';
import { newGame } from '../src/core/state.js';

const world = parseWorld(load('data/world.json'));
const state = newGame(load('names.json'), load('data/world.json'));

test('every row has the declared number of hexes and every code is defined', () => {
  for (const row of world.grid) {
    assert.equal(row.length, world.cols);
    for (const c of row) assert.ok(world.terrain[c], `terrain ${c}`);
  }
});

test('neighbours are symmetric', () => {
  for (let r = 0; r < world.rowsN; r++) for (let q = 0; q < world.colsN; q++) {
    for (const n of neighbors(q, r)) assert.ok(isNeighbor(n, { q, r }), `${q},${r} <-> ${n.q},${n.r}`);
  }
});

test('pixel to hex inverts hex centres', () => {
  for (let r = 0; r < world.rowsN; r++) for (let q = 0; q < world.colsN; q++) {
    const c = hexCenter(q, r, 10, 10);
    assert.deepEqual(pixelToHex(world, c.x, c.y, 10, 10), { q, r });
  }
});

test('the squad starts on the home city', () => {
  const sp = specialAt(world, world.start.q, world.start.r, state);
  assert.equal(sp.city, 'home');
  assert.equal(state.location, 'city:home');
});

test('paths go around water and stop next to impassable goals', () => {
  const p = findHexPath(world, { q: 2, r: 3 }, { q: 9, r: 3 });
  assert.ok(p && p.steps.length >= 7);
  for (const s of p.steps) assert.ok(passable(world, s.q, s.r));
  const port = findHexPath(world, { q: 2, r: 3 }, { q: 14, r: 3 });
  assert.deepEqual(port.bump, { q: 14, r: 3 });
  assert.ok(isNeighbor(port.steps.at(-1), { q: 14, r: 3 }));
});

test('patrols appear only after the raid; the town burns', () => {
  assert.equal(specialAt(world, 5, 3, state), null);
  const ruined = { ...state, mapVariant: 'ruined' };
  assert.equal(specialAt(world, 5, 3, ruined).scene, 'patrol_a');
  const beaten = { ...ruined, flags: { patrol_a_down: 1 } };
  assert.equal(specialAt(world, 5, 3, beaten), null);
  assert.equal(hexArt(world, 2, 3, ruined).burning, true);
  assert.equal(hexArt(world, 2, 3, state).real, 'hex.city');
});

test('the port town and the stockade open only after the raid; before it, checkpoints', () => {
  const ruined = { ...state, mapVariant: 'ruined' };
  assert.equal(specialAt(world, 13, 3, state).scene, 'road_out');
  assert.equal(specialAt(world, 13, 3, ruined).city, 'port');
  assert.equal(specialAt(world, 11, 8, state).scene, 'hex_stockade_closed');
  assert.equal(specialAt(world, 11, 8, ruined).city, 'stockade');
  assert.equal(specialAt(world, 0, 0, state).city, 'hut');
  assert.equal(specialAt(world, 0, 1, state).scene, 'hex_cave');
  // Every story place is reachable on foot from Citadel Town.
  for (const [q, r] of [[13, 3], [11, 8], [0, 0], [0, 1]]) assert.ok(findHexPath(world, world.start, { q, r }), `${q},${r}`);
});

test('road hexes follow the road: east-west on the main road, diagonal on the south road', () => {
  assert.deepEqual(roadLinks(world, 4, 3).sort(), ['E', 'W']);
  assert.equal(roadAxis(world, 4, 3), 'ew');
  assert.equal(roadAxis(world, 10, 5), 'nwse');
  const a = hexArt(world, 4, 3, state);
  assert.equal(a.axis, 'ew');
  assert.equal(a.variant, 'hex.road.ew');
  assert.equal(a.rotate, AXIS_ROTATION.ew); // the art runs SW-NE, so east-west is a 60 degree turn
  assert.equal(hexArt(world, 10, 5, state).rotate, -Math.PI / 3);
  assert.equal(hexArt(world, 4, 4, state).axis, undefined); // not a road
});

test('forest, ruins and towns give cover; road and plains do not', () => {
  const at = (code) => { for (let r = 0; r < world.rowsN; r++) for (let q = 0; q < world.colsN; q++) if (world.grid[r][q] === code) return coverAt(world, q, r); };
  assert.ok(at('f') >= 1 && at('F') >= 2 && at('u') >= 1 && at('c') >= 1);
  assert.equal(at('r'), 0);
  assert.equal(at('p'), 0);
});
