import test from 'node:test';
import assert from 'node:assert/strict';
import { saveGame, loadGame, hasSave, SAVE_KEY } from '../src/core/save.js';
import { newGame } from '../src/core/state.js';
import { load } from './helpers.mjs';

const mem = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('save and load round trip', () => {
  const st = mem();
  const s = newGame(load('names.json'), load('data/world.json'));
  s.money = 999;
  s.collection.push({ id: 'aim', inDeck: true });
  assert.equal(hasSave(st), false);
  assert.ok(saveGame(st, s));
  assert.ok(hasSave(st));
  assert.deepEqual(loadGame(st), s);
});

test('broken or blocked storage never throws', () => {
  const st = mem();
  st.setItem(SAVE_KEY, '{"version":0}');
  assert.equal(loadGame(st), null);
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(saveGame(blocked, {}), false);
  assert.equal(loadGame(blocked), null);
  assert.equal(hasSave(blocked), false);
});
