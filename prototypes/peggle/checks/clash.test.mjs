import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import {
  applyArmor,
  applyShotDamage,
  createProgress,
  createRound,
  injectLoadoutPegs,
  remainingGlow,
  resolveClashTurn,
} from '../app/lib/engine.js';

const campaign = JSON.parse(
  await readFile(
    resolve(import.meta.dirname, '../../../AssetSources/World2/minigames/plink/campaign.json'),
    'utf8'
  )
);

function freshCritters(hearts = 10) {
  return [
    { id: 'a', name: 'Seed Moth', hearts, armor: 'none', attack: 1, cadence: 1, cooldown: 1 },
    { id: 'b', name: 'Pollen Fox', hearts, armor: 'none', attack: 1, cadence: 1, cooldown: 1 },
  ];
}

describe('Critter Clash helpers', () => {
  it('splashes every critter for bomb damage', () => {
    const critters = freshCritters(10);
    applyShotDamage(campaign, critters, [{ kind: 'bomb' }]);
    assert.equal(critters[0].hearts, 7);
    assert.equal(critters[1].hearts, 7);
  });

  it('applies red bomb damage at four times the splash', () => {
    const critters = freshCritters(20);
    applyShotDamage(campaign, critters, [{ kind: 'redBomb' }]);
    assert.equal(critters[0].hearts, 8);
    assert.equal(critters[1].hearts, 8);
  });

  it('halves non-bomb taps on a shell turtle, never below 1', () => {
    assert.equal(applyArmor(2, 'halfUnlessBomb', false), 1);
    assert.equal(applyArmor(1, 'halfUnlessBomb', false), 1);
    assert.equal(applyArmor(3, 'halfUnlessBomb', true), 3);
    const turtle = [
      { id: 'shellTurtle', name: 'Shell Turtle', hearts: 8, armor: 'halfUnlessBomb' },
    ];
    applyShotDamage(campaign, turtle, [{ kind: 'glow' }]);
    assert.equal(turtle[0].hearts, 7);
    applyShotDamage(campaign, turtle, [{ kind: 'bomb' }]);
    assert.equal(turtle[0].hearts, 4);
  });

  it('resets the board after a glow clear and keeps fighting while critters live', () => {
    const bed = campaign.beds.find((item) => item.id === 'crystal-cascade');
    const round = createRound(campaign, bed, createProgress(campaign));
    for (const peg of round.pegs) {
      if (peg.kind === 'glow') peg.alive = false;
    }
    const result = resolveClashTurn(round, { hits: [], glowCleared: true });
    assert.equal(result.won, false);
    assert.equal(result.rest, false);
    assert.ok(remainingGlow(round.pegs) > 0);
    assert.ok(round.clash.critters.some((critter) => critter.hearts > 0));
    assert.equal(round.phase, 'aim');
  });

  it('sends the player to garden rest at 0 hearts', () => {
    const round = createRound(campaign, campaign.beds[0], createProgress(campaign));
    round.clash.playerHearts = 1;
    for (const critter of round.clash.critters) critter.cooldown = 0;
    const result = resolveClashTurn(round, { hits: [] });
    assert.equal(result.rest, true);
    assert.equal(round.clash.playerHearts, 0);
    assert.equal(result.won, false);
  });

  it('injects packed power-up pegs without dropping the original layout', () => {
    const bed = campaign.beds[0];
    const packed = injectLoadoutPegs(bed.pegs, ['tilt', 'bomb']);
    assert.equal(packed.length, bed.pegs.length + 2);
    assert.ok(packed.some((peg) => peg.kind === 'tilt'));
    assert.ok(packed.some((peg) => peg.kind === 'bomb'));
    const round = createRound(campaign, bed, createProgress(campaign), {
      loadout: ['tilt', 'redBomb', 'bomb'],
    });
    assert.deepEqual(round.loadout, ['tilt', 'redBomb']);
    assert.ok(round.pegs.some((peg) => peg.kind === 'tilt'));
    assert.ok(round.pegs.some((peg) => peg.kind === 'redBomb'));
    assert.equal(round.pegs.filter((peg) => peg.kind === 'bomb').length, 0);
  });
});
