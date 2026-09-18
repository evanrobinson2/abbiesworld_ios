// The prompt DAG, small enough to read in one sitting.
//
// Three ingredients come in, a composed image prompt and a card identity go
// out. Every node is named and the trace is returned alongside the result, so
// a prompt is reviewable as text instead of being a string someone assembled
// inline. This is the shape the backend version should take.

import { itemFor } from './catalog.js';

const STYLE_NODE =
  'storybook trading-card illustration, soft rounded shapes, warm light, ' +
  'thick clean outlines, friendly faces, no text';

export function composePrompt(recipeInput) {
  const creature = itemFor('creature', recipeInput.creatureId);
  const outfit = itemFor('outfit', recipeInput.outfitId);
  const buddy = itemFor('buddy', recipeInput.buddyId);

  if (!creature || !outfit || !buddy) {
    return { ok: false, reason: 'unknown ingredient', recipe: recipeInput };
  }

  const trace = [];
  const node = (name, value) => {
    trace.push({ node: name, value });
    return value;
  };

  const subject = node('subject', creature.look);
  const wardrobe = node('wardrobe', outfit.look);
  const companion = node('companion', buddy.look);
  const powers = node('powers', outfit.power);
  const mood = node('mood', buddy.personality.slice(0, 2).join(' and '));
  const style = node('style', STYLE_NODE);

  const prompt = node(
    'prompt',
    `${subject}, ${wardrobe}, ${companion}. The card should feel ${mood}. ${style}.`
  );

  const name = node('cardName', `${outfit.name} ${creature.name}`);
  const title = node('cardTitle', `${name} & the ${buddy.name}`);

  return {
    ok: true,
    recipe: recipeInput,
    name,
    title,
    powers,
    personality: buddy.personality,
    prompt,
    style,
    trace,
  };
}

export function renderPromptText(composed) {
  if (!composed.ok) {
    return `PROMPT FAILED: ${composed.reason}`;
  }
  const lines = [];
  lines.push(`CARD: ${composed.title}`);
  lines.push(`  recipe:      ${composed.recipe.creatureId} + ${composed.recipe.outfitId} + ${composed.recipe.buddyId}`);
  lines.push(`  powers:      ${composed.powers}`);
  lines.push(`  personality: ${composed.personality.join(', ')}`);
  lines.push('  prompt DAG:');
  for (const step of composed.trace) {
    if (step.node === 'prompt') continue;
    lines.push(`    ${step.node.padEnd(12)} ${step.value}`);
  }
  lines.push('  composed prompt:');
  lines.push(`    ${composed.prompt}`);
  return lines.join('\n');
}
