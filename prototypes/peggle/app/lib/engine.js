import { clonePegs, clampAim, launchWorld, simulateShot, stepBall } from './physics.js';
import {
  createClashState,
  injectLoadoutPegs,
  livingCritters,
  maybeSpawnTiltPrompt,
  resolveClashTurn,
} from './clash.js';

export const SHOT_PLAYBACK_RATE = 0.28;
export const SHOT_STEP_DT = 1 / 120;

export {
  activateTiltPrompt,
  applyArmor,
  applyShotDamage,
  createClashState,
  injectLoadoutPegs,
  livingCritters,
  maybeSpawnTiltPrompt,
  resolveClashTurn,
  tickCritterCadence,
} from './clash.js';

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

export function createRound(campaign, bed, progress, options = {}) {
  const maxLoadout = campaign.clash?.maxLoadout ?? 2;
  const loadout = [...new Set(options.loadout ?? [])].slice(0, maxLoadout);
  const templatePegs = injectLoadoutPegs(bed.pegs, loadout);
  const pegs = clonePegs(templatePegs);
  return {
    campaign,
    bed,
    pegs,
    templatePegs,
    loadout,
    dropsLeft: bed.drops ?? campaign.rules.startingDrops,
    giftUsed: false,
    gardenGlow: false,
    hitsThisShot: 0,
    totalHits: 0,
    gemsThisRound: 0,
    lastBowl: null,
    phase: 'aim',
    status: campaign.clash
      ? `Aim a dewdrop. This shot is your turn in ${bed.name}.`
      : `Aim the dewdrop. Light ${remainingGlow(pegs)} glow seeds.`,
    progress,
    lastShot: null,
    clash: campaign.clash ? createClashState(campaign, bed, loadout) : null,
  };
}

function popHitPegs(round) {
  const hits = [];
  let glowHits = 0;
  for (const peg of round.pegs) {
    if (!peg.hit || !peg.alive) continue;
    hits.push({ id: peg.id, kind: peg.kind });
    peg.alive = false;
    peg.hit = false;
    round.totalHits += 1;
    if (peg.kind === 'glow') glowHits += 1;
    if (peg.kind === 'tilt' && round.clash) {
      round.clash.tiltCharges += 1;
    }
  }
  return { glowHits, hits };
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

function markGardenHelped(round, notes) {
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
  if (round.bed.awardsDecoration) {
    round.status = `${round.bed.name} is smiling! The Marble Fountain is yours.`;
  } else if (next) {
    round.status = `${round.bed.name} is happy. ${next.name} is ready whenever you are.`;
  } else {
    round.status = `${round.bed.name} is happy. The critters are resting.`;
  }
  if (notes.length) {
    round.status = `${notes.filter(Boolean).join(' ')} ${round.status}`;
  }
  return round;
}

export function beginShot(round, angle) {
  if (round.phase !== 'aim') return { round, world: null };
  const world = launchWorld(round.campaign, round.pegs, clampAim(angle));
  world.events = [];
  const tiltArmed = Boolean(round.clash?.tiltArmed);
  if (tiltArmed) {
    world.tiltEnabled = true;
    world.tiltSteer = 0;
  }
  return {
    world,
    round: {
      ...round,
      phase: 'falling',
      pegs: world.pegs,
      hitsThisShot: 0,
      lastBowl: null,
      lastShot: null,
      clash: round.clash
        ? { ...round.clash, tiltArmed: false, tiltPrompt: false }
        : null,
      status: tiltArmed ? 'Tilt is steering this dewdrop…' : 'The dewdrop is falling…',
    },
  };
}

export function advanceShot(world, dt = SHOT_STEP_DT) {
  if (!world?.ball?.alive) return [];
  const events = stepBall(world, dt);
  world.events.push(...events);
  return events;
}

export function settleShot(round, world) {
  const next = {
    ...round,
    pegs: world.pegs,
    lastShot: {
      events: world.events,
      ball: { x: world.ball.x, y: world.ball.y },
      ended: !world.ball.alive,
    },
  };
  next.hitsThisShot = world.events.filter((event) => event.type === 'peg').length;
  const { glowHits, hits } = popHitPegs(next);
  const catchEvent = [...world.events].reverse().find((event) => event.type === 'caught');
  next.lastBowl = catchEvent?.bowl ?? null;
  const notes = [applyBowl(next, catchEvent?.effect)];
  return finishResolvedShot(next, notes, glowHits, hits);
}

export function resolveShot(round, angle) {
  if (round.phase !== 'aim') return round;
  const shot = simulateShot(round.campaign, round.pegs, clampAim(angle));
  round.lastShot = shot;
  round.pegs = shot.pegs;
  round.hitsThisShot = shot.events.filter((event) => event.type === 'peg').length;
  const { glowHits, hits } = popHitPegs(round);
  const catchEvent = [...shot.events].reverse().find((event) => event.type === 'caught');
  round.lastBowl = catchEvent?.bowl ?? null;
  const notes = [applyBowl(round, catchEvent?.effect)];
  return finishResolvedShot(round, notes, glowHits, hits);
}

function finishResolvedShot(round, notes, glowHits, hits = []) {
  if (round.hitsThisShot >= round.campaign.rules.gardenGlowHits) {
    round.gardenGlow = true;
    notes.push('Garden Glow! The beads are dancing.');
  }

  const glowLeft = remainingGlow(round.pegs);
  const glowCleared = glowLeft === 0;

  if (round.clash && round.campaign.clash) {
    const result = resolveClashTurn(round, { hits, glowCleared });
    notes.push(result.report);

    if (result.won) {
      return markGardenHelped(round, notes);
    }
    if (result.rest) {
      round.phase = 'rest';
      round.status = 'The garden needs a rest. Try again whenever you like.';
      return round;
    }

    maybeSpawnTiltPrompt(round.clash, round.campaign.clash.tiltSpawnChance);
    round.dropsLeft = Math.max(1, round.dropsLeft);
    round.phase = 'aim';
    const foes = livingCritters(round.clash.critters).length;
    round.status = `${notes.filter(Boolean).join(' ')} Your hearts: ${round.clash.playerHearts}. Critters still playing: ${foes}.`;
    if (glowHits > 0 && !result.reset) {
      round.status = `Glow seeds woke: ${glowHits}. ${round.status}`;
    }
    return round;
  }

  if (glowLeft === 0) {
    return markGardenHelped(round, notes);
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
    safari: campaign.safari ?? null,
    powerUps: campaign.powerUps ?? [],
    clash: campaign.clash ?? null,
    music: campaign.music ?? [],
    critters: campaign.critters ?? [],
    bedCount: campaign.beds.length,
    beds: campaign.beds.map((bed) => ({
      id: bed.id,
      name: bed.name,
      animal: bed.animal ?? null,
      map: bed.map ?? null,
      encounter: bed.encounter ?? [],
      unlockedByDefault: Boolean(bed.unlockedByDefault),
      pegs: bed.pegs.length,
      glow: bed.pegs.filter((peg) => peg.kind === 'glow').length,
      drops: bed.drops,
      rewardGems: bed.rewardGems,
      awardsDecoration: Boolean(bed.awardsDecoration),
    })),
  };
}
