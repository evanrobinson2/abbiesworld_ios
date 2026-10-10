import test from 'node:test';
import assert from 'node:assert/strict';
import { Story, evalCond, applyEffects, costOf } from '../src/core/script.js';
import { nameDict, fill } from '../src/core/names.js';
import { newGame } from '../src/core/state.js';
import { load } from './helpers.mjs';

const names = load('names.json');
const world = load('data/world.json');
const fresh = () => newGame(names, world);

test('conditions', () => {
  const s = fresh();
  s.flags.a = 2;
  assert.ok(evalCond({ flag: 'a', gte: 2 }, s));
  assert.ok(!evalCond({ flag: 'b' }, s));
  assert.ok(evalCond({ not: { flag: 'b' } }, s));
  assert.ok(evalCond({ any: [{ flag: 'b' }, { money: { gte: 20 } }] }, s));
  assert.ok(evalCond([{ flag: 'a' }, { variant: 'intact' }], s));
  assert.ok(!evalCond({ skill: 'gunnery', gte: 1 }, s));
  assert.throws(() => evalCond({ bogus: 1 }, s));
});

test('tuition cost scales with the current level', () => {
  const s = fresh();
  assert.equal(costOf({ tuition: 'pistol' }, s), 75);
  s.party[0].skills.pistol = 2;
  assert.equal(costOf({ tuition: 'pistol' }, s), 325);
});

test('effects', () => {
  const s = fresh();
  const ev = applyEffects([{ set: 'x' }, { add: 'n', n: 2 }, { money: 100 }, { skill: 'piloting', add: 5, max: 3 }, { item: 'k' }, { day: 1 }, { variant: 'ruined' }, { battle: 'duel1' }, { booster: 1 }], s);
  assert.equal(s.flags.x, 1);
  assert.equal(s.flags.n, 2);
  assert.equal(s.money, 120);
  assert.equal(s.party[0].skills.piloting, 3);
  assert.deepEqual(s.items, ['k']);
  assert.equal(s.day, 2);
  assert.equal(s.mapVariant, 'ruined');
  assert.deepEqual(ev.filter(e => e.type !== 'toast').map(e => e.type), ['variant', 'battle', 'booster']);
});

const scenes = {
  shop: {
    start: 'start',
    nodes: {
      start: {
        redirect: [{ if: { flag: 'banned' }, goto: 'banned' }],
        text: ['Page one {hero_first}.', 'Page two.'],
        choices: [
          { text: 'Buy', cost: 50, effects: [{ set: 'bought' }], goto: 'thanks' },
          { text: 'Secret', if: { flag: 'vip' }, goto: 'thanks' },
          { text: 'Locked', requires: { flag: 'key' }, lockedText: 'Need key', goto: 'thanks' },
          { text: 'Fight', effects: [{ battle: 'duel1' }] },
          { text: 'Leave', exit: true },
        ],
      },
      thanks: { text: 'Thanks.', next: 'start' },
      banned: { text: 'Out.' },
      won: { text: 'You won.' },
    },
  },
};

test('runner: pages, hidden and locked choices, costs, exit', () => {
  const s = fresh();
  const st = new Story({ scenes, state: s, dict: nameDict(names) });
  let v = st.enter('shop');
  assert.equal(v.text, 'Page one Rook.');
  assert.equal(v.more, true);
  assert.equal(v.choices.length, 0);
  v = st.next();
  assert.deepEqual(v.choices.map(c => c.text), ['Buy (50 C-bills)', 'Locked', 'Fight', 'Leave']);
  assert.equal(v.choices[0].enabled, false);
  assert.equal(v.choices[0].reason, 'Need 50 C-bills');
  assert.equal(v.choices[1].reason, 'Need key');
  s.money = 60;
  assert.ok(st.choose(0));
  assert.equal(s.money, 10);
  assert.equal(st.nodeId, 'thanks');
  assert.equal(s.flags.bought, 1);
  st.choose(0); // Continue -> start
  st.choose(4);
  assert.deepEqual(st.takeEvents().map(e => e.type).filter(t => t === 'exit'), ['exit']);
});

test('runner: redirects and battles', () => {
  const s = fresh();
  const st = new Story({ scenes, state: s });
  s.flags.banned = 1;
  assert.equal(st.enter('shop').nodeId, 'banned');
  delete s.flags.banned;
  st.enter('shop');
  st.next();
  st.choose(3);
  assert.equal(st.waiting, 'battle');
  assert.equal(st.choose(4), false, 'no choices while a battle runs');
  st.resolveBattle({ win: { scene: 'shop', node: 'won', effects: [{ money: 5 }] } }, 'win');
  assert.equal(st.nodeId, 'won');
  assert.equal(s.money, 25);
});

test('unknown placeholders stay visible', () => {
  assert.equal(fill('Hi {hero} {nope}', nameDict(names)), 'Hi Rook Calder {?nope}');
  assert.equal(nameDict(names).father_first, 'Elias');
  assert.equal(nameDict(names).slot5, 'Mantis');
});
