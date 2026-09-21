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
  resolvePegHit,
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
    assert.equal(catalog.boards[0].pegs.filter((peg) => peg.strength > 1).length, 3);
    assert.equal(catalog.boards[0].pegs.filter((peg) => peg.valuable).length, 1);
  });

  it('keeps the iOS and prototype pack copies identical to AssetSources', async () => {
    for (const file of ['pack.json', 'content/boards.json']) {
      const source = resolve(
        import.meta.dirname,
        `../../../AssetSources/World2/minigames/peg-battle/${file}`
      );
      const web = resolve(import.meta.dirname, `../data/peg-battle/${file}`);
      const ios = resolve(
        import.meta.dirname,
        `../../../abbies.world.ios/abbies.world.ios/Resources/World2/minigames/peg-battle/${file}`
      );
      const [a, b, c] = await Promise.all([
        readFile(source, 'utf8'),
        readFile(web, 'utf8'),
        readFile(ios, 'utf8'),
      ]);
      assert.equal(a, b, file);
      assert.equal(a, c, file);
    }
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
    session.pegs[0].gone = true;
    session.pegs[0].sticky = true;
    const again = resetBattle(session);
    assert.equal(again.playerHearts, 6);
    assert.equal(again.enemyHearts, 6);
    assert.equal(again.turn, 1);
    assert.equal(again.pegs.filter((peg) => peg.gone).length, 0);
    assert.equal(again.pegs.filter((peg) => peg.sticky).length, 0);
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

  it('keeps the orb smaller than a peg, matching open-source Peggle scale', () => {
    const physics = sessionPhysics();
    // PegglePy (Mr0o/PegglePy local/config.py): ballRad 12 / pegRad 25 = 0.48.
    assert.ok(physics.ballRadius / physics.pegRadius < 0.55);
    assert.ok(physics.ballRadius / physics.pegRadius > 0.3);
    assert.ok(physics.ballRadius < physics.blockWidth / 2);
  });

  it('pops a block after it is hit so the next shot can pass through', () => {
    const session = createBattle(catalog, { seed: 42 });
    beginPlayerTurn(session);
    chooseCard(session, session.hand[0]);
    resolveFlight(session, 0.15);
    const gone = session.pegs.filter((peg) => peg.gone || peg.present === false).length;
    assert.ok(gone > 0);
    if (session.phase === 'hitResolve') resolveEnemyTurn(session);
    if (session.phase === 'playerAim') {
      chooseCard(session, session.hand[0]);
      resolveFlight(session, 0.15);
      assert.ok(session.pegs.every((peg) => !peg.hitThisShot));
    }
  });

  it('strength-2 blocks stay present after one hit', () => {
    const session = createBattle(catalog, { seed: 8 });
    const target = session.pegs.find((peg) => peg.strength > 1);
    assert.ok(target);
    assert.equal(target.strength, 2);
    resolvePegHit(session, target, session.definition.cards[0], {
      consecutive: 0,
      cleaned: 0,
      power: 0,
      hits: 0,
      pops: 0,
      shield: 0,
      hearts: 0,
      burst: false,
      starPower: false,
      ballSpec: { behavior: 'star', returnsLeft: 0 },
    });
    assert.equal(target.gone, false);
    assert.equal(target.present, true);
    assert.equal(target.strength, 1);
  });

  it('sticky blocks stay present after the first hit', () => {
    const session = createBattle(catalog, { seed: 8 });
    const target = session.pegs.find((peg) => peg.kind === 'normal' && peg.present);
    target.sticky = true;
    target.muddy = true;
    beginPlayerTurn(session);
    chooseCard(session, session.hand[0]);
    resolvePegHit(session, target, session.definition.cards[0], {
      consecutive: 1,
      cleaned: 0,
      power: 0,
      hits: 0,
      pops: 0,
      shield: 0,
      hearts: 0,
      burst: false,
      starPower: false,
      ballSpec: { behavior: 'star', returnsLeft: 0 },
    });
    assert.equal(target.gone, false);
    assert.equal(target.present, true);
    assert.equal(target.sticky, false);
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

  it('applies muddy paws only on the signature bark', () => {
    const session = createBattle(catalog, { seed: 8 });
    session.phase = 'hitResolve';
    resolveEnemyTurn(session);
    assert.equal(session.pegs.filter((peg) => peg.muddy).length, 3);
    session.phase = 'hitResolve';
    resolveEnemyTurn(session);
    assert.equal(session.pegs.filter((peg) => peg.muddy).length, 3);
  });

  it('lets the harness pick an enemy without editing the pack JSON', () => {
    const session = createBattle(catalog, { seed: 1, enemyId: 'bad-doggo', boardId: 'pavilion-duel' });
    assert.equal(session.definition.enemy.id, 'bad-doggo');
    assert.equal(session.definition.board.id, 'pavilion-duel');
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
