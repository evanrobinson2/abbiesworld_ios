import test from 'node:test';
import assert from 'node:assert/strict';
import { load, seeded, battleData, hero } from './helpers.mjs';
import { createBattle, handView, playCard, endTurn, cardTN, tnBreakdown, describeCard } from '../src/core/battle.js';
import { buildDeck, openBooster, addToCollection, toggleInDeck, deckExtras, draw } from '../src/core/cards.js';
import { prob2d6AtLeast, SHUTDOWN } from '../src/core/rules.js';

const battles = load('data/battles.json');
const data = battleData();

test('loadout builds the base deck', () => {
  const deck = buildDeck(data.mechs.trainer, { gunnery: 0, piloting: 0 }, data.cards);
  const count = (id) => deck.filter(x => x === id).length;
  assert.equal(count('large_laser'), 2);
  assert.equal(count('medium_laser'), 3);
  assert.equal(count('small_laser'), 4);
  assert.equal(count('mg_burst'), 2);
  assert.equal(count('punch'), 2);
  assert.equal(deck.length, 13 + data.cards.basics.length);
});

test('skills add cards', () => {
  const base = buildDeck(data.mechs.trainer, { gunnery: 0, piloting: 0 }, data.cards).length;
  const skilled = buildDeck(data.mechs.trainer, { gunnery: 3, piloting: 2 }, data.cards);
  assert.equal(skilled.length, base + 4);
  assert.ok(skilled.includes('aim') && skilled.includes('target_lock') && skilled.includes('evasive_step') && skilled.includes('charge'));
});

test('every card the data can produce exists and has art', () => {
  for (const l of Object.values(data.cards.loadout)) assert.ok(data.cards.cards[l.card]);
  for (const id of data.cards.basics) assert.ok(data.cards.cards[id]);
  for (const s of data.cards.skillCards) assert.ok(data.cards.cards[s.card]);
  for (const c of Object.values(data.cards.cards)) assert.match(c.art, /^card\./);
});

test('the hit chance on a card is the engine target number as a probability', () => {
  const b = createBattle(battles.duel1, data, hero(1, 0), { rng: seeded(3) });
  b.player.pile.hand = ['medium_laser'];
  b.range = 15; // medium for a medium laser
  const v = handView(b)[0];
  // 4 + 2 (medium) - 1 gunnery = 5
  assert.equal(v.tn, 5);
  assert.equal(v.hit, prob2d6AtLeast(5));
  const sum = tnBreakdown(b, b.player, 'medium_laser').reduce((n, p) => n + p.value, 0);
  assert.equal(sum, v.tn);
});

test('playing a card adds its heat and rolls visible dice', () => {
  const b = createBattle(battles.duel1, data, hero(), { rng: seeded(5) });
  b.player.pile.hand = ['large_laser', 'vent'];
  b.range = 20;
  const out = playCard(b, 0, seeded(9));
  assert.equal(out.ok, true);
  assert.equal(b.player.heat, 8);
  assert.equal(out.dice.length, 2);
  assert.equal(out.hit, out.total >= out.tn);
  playCard(b, 0, seeded(9));
  assert.equal(b.player.heat, 2);
});

test('aim and evade modify the target number', () => {
  const b = createBattle(battles.duel1, data, hero(), { rng: seeded(5) });
  b.range = 10;
  const tn = cardTN(b, b.player, 'medium_laser');
  b.player.turnState.aim = 2;
  assert.equal(cardTN(b, b.player, 'medium_laser'), tn - 2);
  b.enemy.turnState.evade = 3;
  assert.equal(cardTN(b, b.player, 'medium_laser'), tn + 1);
});

test('out-of-range and melee cards say why they are blocked', () => {
  const b = createBattle(battles.duel1, data, hero(), { rng: seeded(5) });
  b.range = 40;
  assert.equal(describeCard(b, b.player, 'small_laser').reason, 'Out of range');
  assert.equal(describeCard(b, b.player, 'punch').reason, 'Get to range 1');
});

test('only one move per round', () => {
  const b = createBattle(battles.duel1, data, hero(), { rng: seeded(5) });
  b.player.pile.hand = ['advance', 'withdraw'];
  const before = b.range;
  playCard(b, 0, seeded(1));
  assert.ok(b.range < before);
  assert.equal(playCard(b, 0, seeded(1)).ok, false);
});

test('ending a round at shutdown heat costs a turn', () => {
  const b = createBattle(battles.duel1, data, hero(), { rng: seeded(5) });
  b.player.heat = SHUTDOWN + b.player.sinks;
  const round = b.round;
  endTurn(b, seeded(2));
  assert.ok(b.round >= round + 2 || b.over, 'the player sat a round out');
  assert.ok(b.log.some(l => /shut down/.test(l.text)));
});

test('a battle always finishes and the enemy deck plays', () => {
  for (const id of ['duel1', 'sample']) {
    const rng = seeded(11);
    const b = createBattle(battles[id], data, hero(1, 1), { rng });
    let n = 0;
    while (!b.over && n++ < 60) {
      for (const c of handView(b)) if (c.playable && c.hit !== null) { playCard(b, b.player.pile.hand.indexOf(c.id), rng); break; }
      endTurn(b, rng);
    }
    assert.ok(b.over, `${id} finished`);
    assert.ok(['win', 'lose'].includes(b.result));
    assert.ok(b.log.some(l => l.who === 'enemy'));
  }
});

test('draw reshuffles the discard pile', () => {
  const pile = { deck: ['a'], hand: [], discard: ['b', 'c'] };
  draw(pile, 3, seeded(1));
  assert.equal(pile.hand.length, 3);
  assert.equal(pile.discard.length, 0);
});

test('boosters: 3 cards, never base cards; collection respects the deck limit', () => {
  for (let i = 0; i < 50; i++) {
    const pack = openBooster(data.cards, seeded(i));
    assert.equal(pack.length, 3);
    for (const id of pack) assert.notEqual(data.cards.cards[id].rarity, 'base');
  }
  const state = { collection: [] };
  addToCollection(state, Array(10).fill('aim'), 8);
  assert.equal(deckExtras(state).length, 8);
  assert.equal(toggleInDeck(state, 9, 8), false);
  assert.equal(toggleInDeck(state, 0, 8), true);
  assert.equal(toggleInDeck(state, 9, 8), true);
});
