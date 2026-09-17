// Headless proof. No browser, no gestures, no Phaser.
//
// Runs scripted playthroughs against the pure core and prints a transcript an
// assistant can read, then checks the invariants that make the game kind to a
// six year old. Exits non-zero if any of them break.

import {
  CELEBRATE_MS,
  ITEM_PERIOD_MS,
  createGame,
  isComplete,
  recipe,
  renderText,
  run,
  spotlight,
  tap,
} from '../core/machine.js';
import { laneFor } from '../core/catalog.js';
import { composePrompt, renderPromptText } from '../core/prompt.js';

const failures = [];

function check(label, condition) {
  const status = condition ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${label}`);
  if (!condition) failures.push(label);
}

function heading(text) {
  console.log(`\n${'='.repeat(72)}\n${text}\n${'='.repeat(72)}`);
}

// Plays one game, printing the screen at every decision point.
function playVerbose(seed, waits, label) {
  heading(`PLAYTHROUGH: ${label}  (seed=${seed})`);
  let state = createGame({ seed });
  for (const wait of waits) {
    state = run(state, { forMs: wait });
    console.log(`\n-- waited ${wait}ms, about to tap --`);
    console.log(renderText(state));
    state = tap(state);
    console.log('\n-- tapped --');
    console.log(renderText(state));
    state = run(state, { forMs: CELEBRATE_MS });
  }
  console.log('\n-- final --');
  console.log(renderText(state));

  const result = recipe(state);
  console.log('\nRECIPE HANDED TO THE PIPELINE:');
  console.log(`  ${JSON.stringify(result)}`);
  console.log('');
  console.log(renderPromptText(composePrompt(result)));
  return state;
}

heading('CRITTER CAROUSEL — headless proof');
console.log('One verb: tap. No drag, no pinch, no swipe, no timer, no losing.');

const clean = playVerbose(
  42,
  [0, ITEM_PERIOD_MS * 2, ITEM_PERIOD_MS * 4],
  'deliberate taps, dead center'
);
const sloppy = playVerbose(
  42,
  [
    Math.round(ITEM_PERIOD_MS * 0.5),
    Math.round(ITEM_PERIOD_MS * 1.5),
    Math.round(ITEM_PERIOD_MS * 2.5),
  ],
  'sloppy taps, all between items'
);

heading('INVARIANTS');

check('deliberate play finishes with a full recipe', Boolean(recipe(clean)));
check('sloppy play finishes with a full recipe too', Boolean(recipe(sloppy)));
check('sloppy play never came up empty', sloppy.picks.every((p) => Boolean(p.id)));
check('sloppy play was all surprise blends', sloppy.picks.every((p) => p.surprise));
check('deliberate play had no blends', clean.picks.every((p) => !p.surprise));

// A tap at literally any millisecond of the lane yields an ingredient.
const lane = laneFor('creature');
let everyTapPaidOut = true;
let blendCount = 0;
for (let offset = 0; offset < ITEM_PERIOD_MS * lane.length; offset += 10) {
  let probe = run(createGame({ seed: 8 }), { forMs: offset });
  if (spotlight(probe).isBlend) blendCount += 1;
  probe = tap(probe);
  if (probe.picks.length !== 1 || !probe.picks[0].id) everyTapPaidOut = false;
}
check('a tap at any moment in the lane yields an ingredient', everyTapPaidOut);

const totalProbes = Math.ceil((ITEM_PERIOD_MS * lane.length) / 10);
const cleanShare = 1 - blendCount / totalProbes;
console.log(`  (clean-pick share of the lane: ${(cleanShare * 100).toFixed(0)}%)`);
check('most of the lane is a clean pick, not a blend', cleanShare > 0.55);

// Determinism: same seed and same taps, same card, every time.
const waits = [300, 1350, 2700];
const a = playQuiet(77, waits);
const b = playQuiet(77, waits);
check('same seed + same taps replays identically', JSON.stringify(a.log) === JSON.stringify(b.log));

// Frame pacing must not change the outcome.
const slow = run(createGame({ seed: 5 }), { forMs: 1800, frameMs: 16 });
const fast = run(createGame({ seed: 5 }), { forMs: 1800, frameMs: 4 });
check('60fps and 250fps agree on the spotlight', spotlight(slow).index === spotlight(fast).index);

// The lane loops, so she cannot get stranded by waiting.
const parked = run(createGame({ seed: 1 }), { forMs: ITEM_PERIOD_MS * lane.length * 3 });
check('waiting three full loops leaves the game playable', !isComplete(parked));

// Every combination composes a prompt.
let composable = 0;
for (const creature of laneFor('creature')) {
  for (const outfit of laneFor('outfit')) {
    for (const buddy of laneFor('buddy')) {
      if (
        composePrompt({
          creatureId: creature.id,
          outfitId: outfit.id,
          buddyId: buddy.id,
        }).ok
      ) {
        composable += 1;
      }
    }
  }
}
check(`all ${composable} recipes compose a prompt`, composable === 512);

heading('SAMPLE CARDS FROM SLOPPY PLAY');
for (let seed = 0; seed < 5; seed += 1) {
  const state = playQuiet(seed, [450, 1350, 2250]);
  const composed = composePrompt(recipe(state));
  console.log(`  seed ${seed}: ${composed.title}  —  ${composed.powers}`);
}

function playQuiet(seed, plan) {
  let state = createGame({ seed });
  for (const wait of plan) {
    state = run(state, { forMs: wait });
    state = tap(state);
    state = run(state, { forMs: CELEBRATE_MS });
  }
  return state;
}

heading(failures.length ? `FAILED (${failures.length})` : 'ALL INVARIANTS HELD');
for (const failure of failures) console.log(`  - ${failure}`);
process.exit(failures.length ? 1 : 0);
