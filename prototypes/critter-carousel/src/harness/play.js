// Play the game as text, either scripted or by hand at a prompt.
//
//   node src/harness/play.js --seed=3 --taps=500,1400,2300
//   node src/harness/play.js --seed=3            (press enter to tap)
//
// Same core the browser runs, so a transcript from here describes the real
// game and not a simplified stand-in.

import readline from 'node:readline';

import { CELEBRATE_MS, createGame, recipe, renderText, run, tap } from '../core/machine.js';
import { composePrompt, renderPromptText } from '../core/prompt.js';

const args = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value = 'true'] = arg.slice(2).split('=');
      return [key, value];
    })
);

const seed = Number(args.get('seed') ?? 1);
const tapPlan = (args.get('taps') ?? '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value));

function showCard(state) {
  const result = recipe(state);
  if (!result) return;
  console.log('');
  console.log(renderPromptText(composePrompt(result)));
}

if (tapPlan.length) {
  let state = createGame({ seed });
  for (const wait of tapPlan) {
    state = run(state, { forMs: wait });
    console.log(`\n${renderText(state)}`);
    state = tap(state);
    console.log(`  -> tapped at ${wait}ms into the stage`);
    state = run(state, { forMs: CELEBRATE_MS });
  }
  console.log(`\n${renderText(state)}`);
  showCard(state);
  process.exit(0);
}

// Interactive: the lane rides in real time, enter is the only control.
let state = createGame({ seed });
const FRAME_MS = 100;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', () => {
  state = tap(state);
});
rl.on('close', () => process.exit(0));

console.log('Press enter to tap. Ctrl-C to quit.\n');
const timer = setInterval(() => {
  state = run(state, { forMs: FRAME_MS, frameMs: FRAME_MS });
  readline.cursorTo(process.stdout, 0, 0);
  readline.clearScreenDown(process.stdout);
  console.log(renderText(state));
  console.log('\n[enter] = tap');
  if (state.phase === 'done') {
    showCard(state);
    clearInterval(timer);
    rl.close();
  }
}, FRAME_MS);
