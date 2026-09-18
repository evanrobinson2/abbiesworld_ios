import { describe, expect, it } from 'vitest';

import {
  CELEBRATE_MS,
  CLEAN_WINDOW,
  ITEM_PERIOD_MS,
  createGame,
  currentStage,
  isComplete,
  recipe,
  renderText,
  run,
  spotlight,
  tap,
  tick,
} from './machine.js';
import { CREATURES, STAGES, laneFor } from './catalog.js';
import { composePrompt } from './prompt.js';

// Plays a whole game by tapping after each of three waits.
function playGame(seed, waits) {
  let state = createGame({ seed });
  for (const wait of waits) {
    state = run(state, { forMs: wait });
    state = tap(state);
    state = run(state, { forMs: CELEBRATE_MS });
  }
  return state;
}

describe('carousel motion', () => {
  it('starts on the first creature with the lane centered', () => {
    const state = createGame({ seed: 1 });
    const shot = spotlight(state);
    expect(currentStage(state)).toBe('creature');
    expect(shot.index).toBe(0);
    expect(shot.isBlend).toBe(false);
    expect(shot.item.id).toBe(CREATURES[0].id);
  });

  it('advances one item per period', () => {
    let state = createGame({ seed: 1 });
    state = run(state, { forMs: ITEM_PERIOD_MS });
    expect(spotlight(state).index).toBe(1);
    state = run(state, { forMs: ITEM_PERIOD_MS * 2 });
    expect(spotlight(state).index).toBe(3);
  });

  it('loops forever so the player can never be stranded', () => {
    const lane = laneFor('creature');
    let state = createGame({ seed: 1 });
    state = run(state, { forMs: ITEM_PERIOD_MS * lane.length });
    expect(spotlight(state).index).toBe(0);
    expect(currentStage(state)).toBe('creature');
    expect(isComplete(state)).toBe(false);
  });
});

describe('tapping', () => {
  it('grabs the spotlighted item cleanly at the center', () => {
    let state = createGame({ seed: 1 });
    state = run(state, { forMs: ITEM_PERIOD_MS * 2 });
    state = tap(state);
    expect(state.picks).toHaveLength(1);
    expect(state.picks[0].id).toBe(CREATURES[2].id);
    expect(state.picks[0].surprise).toBe(false);
  });

  it('never returns nothing: a tap between two items blends the pair', () => {
    let state = createGame({ seed: 7 });
    state = run(state, { forMs: Math.round(ITEM_PERIOD_MS * 1.5) });
    const shot = spotlight(state);
    expect(shot.isBlend).toBe(true);
    expect(shot.candidates).toHaveLength(2);

    state = tap(state);
    expect(state.picks).toHaveLength(1);
    expect(state.picks[0].surprise).toBe(true);
    expect(shot.candidates.map((c) => c.id)).toContain(state.picks[0].id);
  });

  it('keeps the forgiving window wide enough for a six year old', () => {
    // A clean pick is available for 60% of every item's time on screen.
    const cleanMs = ITEM_PERIOD_MS * CLEAN_WINDOW * 2;
    expect(cleanMs).toBeGreaterThanOrEqual(500);
  });

  it('swallows a double tap instead of spending the next stage', () => {
    let state = createGame({ seed: 1 });
    state = tap(state);
    const afterFirst = state.picks.length;
    state = tap(state);
    expect(state.picks).toHaveLength(afterFirst);
    expect(state.phase).toBe('celebrating');
  });
});

describe('progression', () => {
  it('walks creature then outfit then buddy and finishes', () => {
    const seen = [];
    let state = createGame({ seed: 3 });
    for (let i = 0; i < STAGES.length; i += 1) {
      seen.push(currentStage(state));
      state = tap(state);
      state = run(state, { forMs: CELEBRATE_MS });
    }
    expect(seen).toEqual(['creature', 'outfit', 'buddy']);
    expect(isComplete(state)).toBe(true);
  });

  it('produces a recipe the Swift pipeline can accept', () => {
    const state = playGame(11, [0, ITEM_PERIOD_MS, ITEM_PERIOD_MS * 3]);
    const result = recipe(state);
    expect(result).toEqual({
      creatureId: 'abbie',
      outfitId: 'astronaut',
      buddyId: 'owl',
    });
  });

  it('has no recipe until all three stages are picked', () => {
    let state = createGame({ seed: 1 });
    expect(recipe(state)).toBeNull();
    state = tap(state);
    state = run(state, { forMs: CELEBRATE_MS });
    expect(recipe(state)).toBeNull();
  });

  it('restarts on a tap once finished', () => {
    let state = playGame(5, [0, 0, 0]);
    expect(isComplete(state)).toBe(true);
    state = tap(state);
    expect(state.phase).toBe('riding');
    expect(state.picks).toHaveLength(0);
    expect(currentStage(state)).toBe('creature');
  });
});

describe('determinism', () => {
  it('replays identically from the same seed and taps', () => {
    const waits = [450, Math.round(ITEM_PERIOD_MS * 1.5), 1800];
    const first = playGame(99, waits);
    const second = playGame(99, waits);
    expect(recipe(first)).toEqual(recipe(second));
    expect(first.log).toEqual(second.log);
  });

  it('resolves a blend differently for different seeds', () => {
    const waits = [Math.round(ITEM_PERIOD_MS * 0.5), 0, 0];
    const ids = new Set();
    for (let seed = 0; seed < 24; seed += 1) {
      ids.add(playGame(seed, waits).picks[0].id);
    }
    // Both sides of the blend show up across seeds rather than one always winning.
    expect(ids.size).toBeGreaterThan(1);
  });

  it('agrees regardless of frame pacing', () => {
    const slow = run(createGame({ seed: 4 }), { forMs: 1800, frameMs: 16 });
    const fast = run(createGame({ seed: 4 }), { forMs: 1800, frameMs: 4 });
    expect(spotlight(slow).index).toBe(spotlight(fast).index);
  });
});

describe('no-fail guarantees', () => {
  it('every tap at every moment of a lane yields an ingredient', () => {
    const lane = laneFor('creature');
    const loop = ITEM_PERIOD_MS * lane.length;
    for (let offset = 0; offset < loop; offset += 25) {
      let state = run(createGame({ seed: 2 }), { forMs: offset });
      state = tap(state);
      expect(state.picks).toHaveLength(1);
      expect(state.picks[0].id).toBeTruthy();
    }
  });

  it('exposes no timer, score, or lives to run out', () => {
    const state = createGame({ seed: 1 });
    expect(state).not.toHaveProperty('score');
    expect(state).not.toHaveProperty('lives');
    expect(state).not.toHaveProperty('timeRemaining');
  });
});

describe('prompt DAG', () => {
  it('composes a prompt and names the card from the recipe', () => {
    const composed = composePrompt({
      creatureId: 'bunny',
      outfitId: 'ninja',
      buddyId: 'unicorn',
    });
    expect(composed.ok).toBe(true);
    expect(composed.name).toBe('Ninja Bunny');
    expect(composed.title).toBe('Ninja Bunny & the Unicorn');
    expect(composed.prompt).toContain('adorable bunny');
    expect(composed.prompt).toContain('ninja outfit');
    expect(composed.prompt).toContain('unicorn companion');
    expect(composed.powers).toBe('stealth, agility, and shadow powers');
  });

  it('names every node so a prompt can be reviewed as text', () => {
    const composed = composePrompt({
      creatureId: 'cat',
      outfitId: 'wizard',
      buddyId: 'frog',
    });
    const nodes = composed.trace.map((step) => step.node);
    expect(nodes).toEqual([
      'subject',
      'wardrobe',
      'companion',
      'powers',
      'mood',
      'style',
      'prompt',
      'cardName',
      'cardTitle',
    ]);
  });

  it('refuses an unknown ingredient instead of inventing one', () => {
    const composed = composePrompt({
      creatureId: 'sasquatch',
      outfitId: 'ninja',
      buddyId: 'fox',
    });
    expect(composed.ok).toBe(false);
  });

  it('composes for all 512 combinations', () => {
    let count = 0;
    for (const creature of laneFor('creature')) {
      for (const outfit of laneFor('outfit')) {
        for (const buddy of laneFor('buddy')) {
          const composed = composePrompt({
            creatureId: creature.id,
            outfitId: outfit.id,
            buddyId: buddy.id,
          });
          expect(composed.ok).toBe(true);
          count += 1;
        }
      }
    }
    expect(count).toBe(512);
  });
});

describe('text rendering', () => {
  it('shows the stage, lane, spotlight, and picks', () => {
    const state = run(createGame({ seed: 1 }), { forMs: ITEM_PERIOD_MS });
    const text = renderText(state);
    expect(text).toContain('stage 1/3 (creature)');
    expect(text).toContain('Who do you want to be?');
    expect(text).toContain('[Dragon]');
    expect(text).toContain('>> Dragon <<');
  });

  it('marks a blend spotlight differently from a clean one', () => {
    const state = run(createGame({ seed: 1 }), { forMs: Math.round(ITEM_PERIOD_MS * 1.5) });
    expect(renderText(state)).toContain('blend');
  });

  it('reports the celebration of a pick', () => {
    let state = tap(createGame({ seed: 1 }));
    state = tick(state, 100);
    expect(renderText(state)).toContain('GOT IT: Abbie');
  });
});
