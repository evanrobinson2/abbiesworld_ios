// Critter Carousel: the whole game as a pure reducer.
//
// Phaser never owns game state. It calls `tick` and `tap` and draws whatever
// comes back, which is why this file can be played and proven in node with no
// browser and no gestures. One verb: tap.
//
// Kid rules baked in here:
//   - There is no way to lose and no timer. The lane loops forever.
//   - A tap always yields an ingredient. Tapping between two of them yields a
//     seeded blend of the pair instead of nothing, so a sloppy tap is a
//     surprise rather than a punishment.

import { LANES, STAGES, STAGE_PROMPTS, laneFor, itemFor } from './catalog.js';
import { hashSeed, pickAt } from './rng.js';

export const ITEM_PERIOD_MS = 900;
export const CLEAN_WINDOW = 0.3;
export const CELEBRATE_MS = 1200;

export function createGame({ seed = 1 } = {}) {
  return {
    seed: hashSeed(seed),
    phase: 'riding',
    stageIndex: 0,
    stageElapsed: 0,
    totalElapsed: 0,
    celebrateRemaining: 0,
    rngCursor: 0,
    picks: [],
    log: [`start seed=${hashSeed(seed)}`],
  };
}

export function currentStage(state) {
  return STAGES[state.stageIndex] ?? null;
}

export function stagePrompt(state) {
  const stage = currentStage(state);
  return stage ? STAGE_PROMPTS[stage] : 'Look what you made!';
}

// Where the lane is right now, and what a tap would grab.
export function spotlight(state) {
  const stage = currentStage(state);
  if (!stage) return null;
  const lane = laneFor(stage);
  const size = lane.length;
  const position = (state.stageElapsed / ITEM_PERIOD_MS) % size;
  const nearestIndex = Math.round(position) % size;
  const distance = Math.abs(position - Math.round(position));
  const lowIndex = Math.floor(position) % size;
  const highIndex = (lowIndex + 1) % size;
  const isBlend = distance > CLEAN_WINDOW;
  return {
    stage,
    position,
    distance,
    isBlend,
    index: nearestIndex,
    item: lane[nearestIndex],
    candidates: isBlend ? [lane[lowIndex], lane[highIndex]] : [lane[nearestIndex]],
  };
}

function advanceStage(state) {
  const nextIndex = state.stageIndex + 1;
  if (nextIndex >= STAGES.length) {
    return {
      ...state,
      phase: 'done',
      stageIndex: nextIndex,
      celebrateRemaining: 0,
      log: [...state.log, 'done'],
    };
  }
  return {
    ...state,
    phase: 'riding',
    stageIndex: nextIndex,
    stageElapsed: 0,
    celebrateRemaining: 0,
    log: [...state.log, `stage ${STAGES[nextIndex]}`],
  };
}

export function tick(state, deltaMs) {
  if (deltaMs <= 0) return state;
  const next = {
    ...state,
    totalElapsed: state.totalElapsed + deltaMs,
  };
  if (state.phase === 'riding') {
    next.stageElapsed = state.stageElapsed + deltaMs;
    return next;
  }
  if (state.phase === 'celebrating') {
    next.celebrateRemaining = state.celebrateRemaining - deltaMs;
    if (next.celebrateRemaining <= 0) return advanceStage(next);
    return next;
  }
  return next;
}

export function tap(state) {
  if (state.phase === 'celebrating') {
    // Swallowed on purpose: a double tap must not spend the next stage too.
    return { ...state, log: [...state.log, 'tap ignored (celebrating)'] };
  }

  if (state.phase === 'done') {
    const reseeded = createGame({ seed: state.seed + state.picks.length + 1 });
    return { ...reseeded, log: [...state.log, 'play again', ...reseeded.log] };
  }

  const shot = spotlight(state);
  if (!shot) return state;

  let chosen = shot.item;
  let rngCursor = state.rngCursor;
  if (shot.isBlend) {
    chosen = pickAt(state.seed, rngCursor, shot.candidates);
    rngCursor += 1;
  }

  const pick = {
    stage: shot.stage,
    id: chosen.id,
    name: chosen.name,
    surprise: shot.isBlend,
    atMs: state.totalElapsed,
  };

  return {
    ...state,
    phase: 'celebrating',
    celebrateRemaining: CELEBRATE_MS,
    rngCursor,
    picks: [...state.picks, pick],
    log: [
      ...state.log,
      `pick ${shot.stage}=${chosen.id}${shot.isBlend ? ' (surprise blend)' : ''}`,
    ],
  };
}

// Advance by whole frames so a browser at 60fps and a headless script agree.
export function run(state, { forMs, frameMs = 16 }) {
  let next = state;
  let remaining = forMs;
  while (remaining > 0) {
    const step = Math.min(frameMs, remaining);
    next = tick(next, step);
    remaining -= step;
  }
  return next;
}

export function recipe(state) {
  if (state.picks.length < STAGES.length) return null;
  const byStage = {};
  for (const pick of state.picks) byStage[pick.stage] = pick.id;
  return {
    creatureId: byStage.creature,
    outfitId: byStage.outfit,
    buddyId: byStage.buddy,
  };
}

export function pickedItems(state) {
  return state.picks.map((pick) => ({
    ...pick,
    item: itemFor(pick.stage, pick.id),
  }));
}

export function isComplete(state) {
  return state.phase === 'done';
}

// Text rendering lives with the logic rather than the view, so an assistant
// reading a transcript sees exactly what the player sees.
export function renderText(state) {
  const lines = [];
  const stage = currentStage(state);
  const stageLabel = stage
    ? `stage ${state.stageIndex + 1}/${STAGES.length} (${stage})`
    : 'finished';
  lines.push(
    `CRITTER CAROUSEL  seed=${state.seed}  ${stageLabel}  phase=${state.phase}  t=${state.totalElapsed}ms`
  );

  if (stage) {
    lines.push(`  "${stagePrompt(state)}"`);
    const lane = laneFor(stage);
    const shot = spotlight(state);
    const strip = lane
      .map((entry, index) => (index === shot.index ? `[${entry.name}]` : ` ${entry.name} `))
      .join('');
    lines.push(`  ${strip}`);
    const marker = shot.isBlend
      ? `  spotlight: ~~ ${shot.candidates.map((c) => c.name).join(' / ')} ~~ (blend, d=${shot.distance.toFixed(2)})`
      : `  spotlight: >> ${shot.item.name} << (clean, d=${shot.distance.toFixed(2)})`;
    lines.push(marker);
  }

  if (state.phase === 'celebrating') {
    const last = state.picks[state.picks.length - 1];
    lines.push(`  GOT IT: ${last.name}${last.surprise ? ' (surprise!)' : ''}`);
  }

  const picked = state.picks.length
    ? state.picks.map((p) => `${p.stage}=${p.name}${p.surprise ? '*' : ''}`).join('  ')
    : '—';
  lines.push(`  picks: ${picked}`);

  if (state.phase === 'done') {
    lines.push('  TAP to play again');
  }

  return lines.join('\n');
}

export const CATALOG_SIZES = Object.fromEntries(
  Object.entries(LANES).map(([stage, lane]) => [stage, lane.length])
);
