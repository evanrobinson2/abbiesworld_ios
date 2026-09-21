import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import { simulateShot, clampAim } from '../app/lib/physics.js';
import { createProgress, createRound, inspectCampaign, remainingGlow, resolveShot } from '../app/lib/engine.js';

const campaign = JSON.parse(
  await readFile(
    resolve(import.meta.dirname, '../../../AssetSources/World2/minigames/plink/campaign.json'),
    'utf8'
  )
);

describe('Plink campaign', () => {
  it('describes Peggle Land, the pavilion, and eight beds', () => {
    const inspect = inspectCampaign(campaign);
    assert.equal(inspect.gameKey, 'peggle');
    assert.equal(inspect.kidName, 'Plink');
    assert.equal(inspect.land.id, 'world.peggle');
    assert.equal(inspect.poi.id, 'poi.pegglePavilion');
    assert.equal(inspect.bedCount, 8);
    assert.equal(inspect.beds[0].id, 'dewdrop-nursery');
    assert.ok(inspect.beds.at(-1).awardsDecoration);
    for (const bed of inspect.beds) {
      assert.ok(bed.glow > 0, `${bed.id} needs glow seeds`);
      assert.ok(bed.pegs >= bed.glow);
    }
  });

  it('keeps the iOS bundled copy identical to the source campaign', async () => {
    const sourcePath = resolve(
      import.meta.dirname,
      '../../../AssetSources/World2/minigames/plink/campaign.json'
    );
    const iosPath = resolve(
      import.meta.dirname,
      '../../../abbies.world.ios/abbies.world.ios/Resources/World2/plink_campaign.json'
    );
    const [source, iosCopy] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(iosPath, 'utf8'),
    ]);
    assert.equal(iosCopy, source);
  });
});

describe('Plink physics', () => {
  it('clamps aim so a six-year-old cannot fire backwards', () => {
    assert.equal(clampAim(4), 1.15);
    assert.equal(clampAim(-4), -1.15);
  });

  it('drops a straight marble into a bowl on the first bed', () => {
    const bed = campaign.beds[0];
    const shot = simulateShot(campaign, bed.pegs, 0.18);
    assert.equal(shot.ended, true);
    assert.ok(shot.steps > 10);
    const caught = shot.events.find((event) => event.type === 'caught');
    assert.ok(caught);
    assert.ok(caught.effect);
  });
});

describe('Plink progression', () => {
  it('starts only the nursery unlocked and can clear it with garden gifts', () => {
    const progress = createProgress(campaign);
    assert.deepEqual(progress.unlockedBedIds, ['dewdrop-nursery']);
    const round = createRound(campaign, campaign.beds[0], progress);
    assert.equal(remainingGlow(round.pegs), 3);
    let guard = 0;
    while (round.phase === 'aim' && guard < 40) {
      resolveShot(round, (guard % 5) * 0.2 - 0.4);
      guard += 1;
    }
    assert.ok(round.phase === 'cleared' || round.phase === 'retry' || round.phase === 'aim');
    assert.ok(guard < 40);
  });
});
