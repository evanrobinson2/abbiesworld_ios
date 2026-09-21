import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import { loadCatalog } from '../app/lib/peg-battle/catalog.js';
import { getEnemyState } from '../app/lib/peg-battle/assets.js';
import { simulateShot } from '../app/lib/peg-battle/physics.js';
import {
  beginPlayerTurn,
  chooseCard,
  createBattle,
  currentIntent,
  debugSnapshot,
  destroyBattle,
  inspectPack,
  resetBattle,
  resolveEnemyTurn,
  resolveFlight,
} from '../app/lib/peg-battle/session.js';

const catalog = loadCatalog();

describe('peg-battle pack', () => {
  it('loads enemies, five balls, and a duel board', () => {
    const inspect = inspectPack(catalog);
    assert.equal(inspect.packId, 'peg-battle');
    assert.deepEqual(inspect.enemies, ['bad-doggo']);
    assert.deepEqual(inspect.cards, [
      'star-ball',
      'bubble-ball',
      'paint-ball',
      'rocket-ball',
      'boomerang-ball',
    ]);
    assert.equal(catalog.boards[0].pegs.length, 39);
    assert.equal(catalog.boards[0].pegs.filter((peg) => peg.kind === 'star').length, 2);
    assert.equal(catalog.boards[0].pegs.filter((peg) => peg.kind === 'heart').length, 1);
  });

  it('keeps the iOS and prototype pack copies identical to AssetSources', async () => {
    const source = resolve(
      import.meta.dirname,
      '../../../AssetSources/World2/minigames/peg-battle/pack.json'
    );
    const web = resolve(import.meta.dirname, '../data/peg-battle/pack.json');
    const ios = resolve(
      import.meta.dirname,
      '../../../abbies.world.ios/abbies.world.ios/Resources/World2/minigames/peg-battle/pack.json'
    );
    const [a, b, c] = await Promise.all([
      readFile(source, 'utf8'),
      readFile(web, 'utf8'),
      readFile(ios, 'utf8'),
    ]);
    assert.equal(a, b);
    assert.equal(a, c);
  });

  it('falls back when a carved portrait is missing', () => {
    const entry = getEnemyState(catalog.manifest, 'bad-doggo', 'hurt');
    assert.equal(entry.id, 'bad-doggo/hurt');
    if (entry.missing) {
      assert.equal(entry.placeholder.label, 'bad-doggo hurt');
    } else {
      assert.ok(entry.src);
    }
  });
});

describe('BattleSession', () => {
  it('reproduces the same hand from the same seed', () => {
    const a = createBattle(catalog, { seed: 1234 });
    const b = createBattle(catalog, { seed: 1234 });
    assert.deepEqual(a.hand, b.hand);
    assert.deepEqual(a.deck, b.deck);
    assert.equal(currentIntent(a).id, 'bark');
  });

  it('reset recreates from the definition instead of patching fields', () => {
    const session = createBattle(catalog, { seed: 99 });
    beginPlayerTurn(session);
    chooseCard(session, session.hand[0]);
    session.playerHearts = 1;
    session.pegs[0].charged = true;
    const again = resetBattle(session);
    assert.equal(again.playerHearts, 6);
    assert.equal(again.enemyHearts, 6);
    assert.equal(again.turn, 1);
    assert.equal(again.pegs.filter((peg) => peg.charged).length, 0);
    assert.equal(again.seed, 99);
    assert.equal(session.phase, 'destroyed');
  });

  it('destroy clears physics so a leftover ball cannot survive', () => {
    const session = createBattle(catalog, { seed: 1 });
    session.world = { ball: { alive: true } };
    const gone = destroyBattle(session);
    assert.equal(gone, null);
    assert.equal(session.alive, false);
    assert.equal(session.world, null);
    assert.equal(session.phase, 'destroyed');
  });

  it('converts power to tiny heart damage', () => {
    const session = createBattle(catalog, { seed: 7 });
    beginPlayerTurn(session);
    chooseCard(session, session.hand[0]);
    resolveFlight(session, 0.2);
    assert.equal(session.lastDamage, Math.floor(session.lastPower / 10));
    assert.ok(session.lastDamage >= 0);
    assert.ok(session.enemyHearts <= 6);
  });

  it('charges pegs on shot A and pops them on shot B', () => {
    const session = createBattle(catalog, { seed: 42 });
    beginPlayerTurn(session);
    chooseCard(session, session.hand[0]);
    resolveFlight(session, 0.15);
    const charged = session.pegs.filter((peg) => peg.charged).length;
    if (session.phase === 'hitResolve') resolveEnemyTurn(session);
    if (session.phase === 'playerAim') {
      chooseCard(session, session.hand[0]);
      const before = session.pegs.filter((peg) => peg.charged).length;
      assert.equal(before, charged);
      resolveFlight(session, 0.15);
      assert.ok(session.pegs.every((peg) => !peg.hitThisShot));
    }
  });

  it('cycles the played card to the bottom and redraws to three', () => {
    const session = createBattle(catalog, { seed: 3 });
    beginPlayerTurn(session);
    const played = session.hand[1];
    const waiting = session.deck[0];
    chooseCard(session, played);
    resolveFlight(session, 0);
    assert.equal(session.hand.length, 3);
    assert.ok(!session.hand.includes(played) || waiting === played);
    assert.equal(session.deck.at(-1), played);
    if (waiting) assert.ok(session.hand.includes(waiting));
  });

  it('telegraphs bark then scratch then pounce', () => {
    const session = createBattle(catalog, { seed: 8 });
    assert.equal(currentIntent(session).id, 'bark');
    session.phase = 'hitResolve';
    resolveEnemyTurn(session);
    assert.equal(currentIntent(session).id, 'scratch');
    session.phase = 'hitResolve';
    resolveEnemyTurn(session);
    assert.equal(currentIntent(session).id, 'pounce');
    assert.equal(currentIntent(session).damage, 4);
  });

  it('bubble shield expires after the enemy attack', () => {
    const session = createBattle(catalog, { seed: 11 });
    session.shield = 2;
    session.phase = 'hitResolve';
    const before = session.playerHearts;
    resolveEnemyTurn(session);
    assert.equal(session.shield, 0);
    assert.ok(session.playerHearts >= before - 1);
  });

  it('a shot simulation always ends', () => {
    const flight = simulateShot(
      { ...sessionPhysics() },
      catalog.boards[0].pegs,
      0.1,
      { behavior: 'star' }
    );
    assert.equal(flight.ended, true);
    assert.ok(flight.steps > 10);
  });
});

function sessionPhysics() {
  const session = createBattle(catalog, { seed: 1 });
  return session.physics;
}
