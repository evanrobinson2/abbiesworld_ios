import { clonePegs, clampAim, simulateShot } from './physics.js';

export function bedById(campaign, bedId) {
  return campaign.beds.find((bed) => bed.id === bedId) ?? campaign.beds[0];
}

export function remainingGlow(pegs) {
  return pegs.filter((peg) => peg.kind === 'glow' && peg.alive).length;
}

export function createProgress(campaign, stored = {}) {
  const unlocked = new Set(
    campaign.beds.filter((bed) => bed.unlockedByDefault).map((bed) => bed.id)
  );
  for (const id of stored.unlockedBedIds ?? []) unlocked.add(id);
  return {
    unlockedBedIds: [...unlocked],
    clearedBedIds: [...new Set(stored.clearedBedIds ?? [])],
    gems: stored.gems ?? 0,
    bestScores: { ...(stored.bestScores ?? {}) },
    awardedDecoration: stored.awardedDecoration === true,
  };
}

export function createRound(campaign, bed, progress) {
  const pegs = clonePegs(bed.pegs);
  return {
    campaign,
    bed,
    pegs,
    dropsLeft: bed.drops ?? campaign.rules.startingDrops,
    giftUsed: false,
    gardenGlow: false,
    hitsThisShot: 0,
    totalHits: 0,
    gemsThisRound: 0,
    lastBowl: null,
    phase: 'aim',
    status: `Aim the dewdrop. Light ${remainingGlow(pegs)} glow seeds.`,
    progress,
    lastShot: null,
  };
}

function popHitPegs(round) {
  let glowHits = 0;
  for (const peg of round.pegs) {
    if (!peg.hit || !peg.alive) continue;
    peg.alive = false;
    peg.hit = false;
    round.totalHits += 1;
    if (peg.kind === 'glow') glowHits += 1;
  }
  return glowHits;
}

function applyBowl(round, effect) {
  if (effect === 'extraDrop') {
    round.dropsLeft += 1;
    return 'The +1 bowl gave you another drop.';
  }
  if (effect === 'gems') {
    round.gemsThisRound += 2;
    return 'The gem bowl sparkled. +2 gems.';
  }
  if (effect === 'glowBoost') {
    round.gardenGlow = true;
    return 'The glow bowl woke the garden.';
  }
  if (effect === 'bounce') {
    return 'A bounce bowl caught the marble.';
  }
  return 'The marble rolled off the board.';
}

function unlockNext(campaign, progress, bedId) {
  const index = campaign.beds.findIndex((bed) => bed.id === bedId);
  const next = campaign.beds[index + 1];
  if (next && !progress.unlockedBedIds.includes(next.id)) {
    progress.unlockedBedIds.push(next.id);
    return next;
  }
  return null;
}

export function resolveShot(round, angle) {
  if (round.phase !== 'aim') return round;
  const aimed = clampAim(angle);
  const shot = simulateShot(round.campaign, round.pegs, aimed);
  round.lastShot = shot;
  round.pegs = shot.pegs;
  round.hitsThisShot = shot.events.filter((event) => event.type === 'peg').length;
  const glowHits = popHitPegs(round);
  const catchEvent = [...shot.events].reverse().find((event) => event.type === 'caught');
  round.lastBowl = catchEvent?.bowl ?? null;
  const notes = [applyBowl(round, catchEvent?.effect)];

  if (round.hitsThisShot >= round.campaign.rules.gardenGlowHits) {
    round.gardenGlow = true;
    notes.push('Garden Glow! The beads are dancing.');
  }

  const glowLeft = remainingGlow(round.pegs);
  if (glowLeft === 0) {
    round.phase = 'cleared';
    round.gemsThisRound += round.bed.rewardGems;
    round.progress.gems += round.gemsThisRound;
    if (!round.progress.clearedBedIds.includes(round.bed.id)) {
      round.progress.clearedBedIds.push(round.bed.id);
    }
    const previous = round.progress.bestScores[round.bed.id] ?? 0;
    round.progress.bestScores[round.bed.id] = Math.max(previous, round.gemsThisRound);
    const next = unlockNext(round.campaign, round.progress, round.bed.id);
    if (round.bed.awardsDecoration) {
      round.progress.awardedDecoration = true;
    }
    round.status = next
      ? `Bed cleared! ${round.bed.name} unlocked ${next.name}.`
      : `Bed cleared! You woke every glow seed.`;
    return round;
  }

  round.dropsLeft -= 1;
  if (round.dropsLeft <= 0 && round.campaign.rules.alwaysFinishable && !round.giftUsed) {
    round.giftUsed = true;
    round.dropsLeft = 1;
    notes.push('The garden gifted one more drop.');
  }

  if (round.dropsLeft <= 0) {
    round.phase = 'retry';
    round.status = `The glow seeds are still sleeping. Try this bed again.`;
    return round;
  }

  round.phase = 'aim';
  round.status = `${notes.filter(Boolean).join(' ')} ${glowLeft} glow seeds left. ${round.dropsLeft} drops.`;
  if (glowHits > 0) {
    round.status = `Glow seeds woke: ${glowHits}. ${glowLeft} left. ${round.dropsLeft} drops.`;
  }
  return round;
}

export function inspectCampaign(campaign) {
  return {
    gameKey: campaign.gameKey,
    kidName: campaign.kidName,
    land: campaign.land,
    poi: campaign.poi,
    bedCount: campaign.beds.length,
    beds: campaign.beds.map((bed) => ({
      id: bed.id,
      name: bed.name,
      pegs: bed.pegs.length,
      glow: bed.pegs.filter((peg) => peg.kind === 'glow').length,
      drops: bed.drops,
      rewardGems: bed.rewardGems,
      awardsDecoration: Boolean(bed.awardsDecoration),
    })),
  };
}
