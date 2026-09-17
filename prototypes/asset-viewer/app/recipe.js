// Composing a recipe out of picked ingredients. Pure functions, no React, so
// the wording can be checked without rendering anything.
//
// Two outputs, deliberately: the sentence is what a six-year-old should be able
// to read back to know what she just made, and the prompt is what the machine
// would actually send to image generation. If the sentence does not make sense,
// the ingredient taxonomy is wrong — that is the whole point of showing it.

export const SLOT_ORDER = ['form', 'material', 'essence', 'enchantment', 'trim'];

// Only a form is really required; everything else adds to a thing that already
// exists. That asymmetry is why forms are their own family.
export const REQUIRED_SLOTS = ['form'];

// Names are stored in title case because that is how they read as item labels,
// but mid-sentence they have to drop to lower case throughout — "that purrs
// When You Sit" is not a sentence. None of these names are proper nouns.
function phrase(name) {
  return name.toLowerCase();
}

/** The kid-facing readback, e.g. "A Little Chair made of Gingerbread…" */
export function sentence(mix) {
  const { form, material, essence, enchantment, trim } = mix;
  if (!form && !material && !essence && !enchantment && !trim) return '';

  let text = form ? `A ${form.name}` : 'A mystery thing';
  if (material) text += ` made of ${material.name}`;
  if (essence) text += `, with ${essence.name}`;
  if (enchantment) text += `, that ${phrase(enchantment.name)}`;
  if (trim) text += `, finished with ${trim.name}`;
  return `${text}.`;
}

/** The image-generation prompt the machine would send for this recipe. */
export function imagePrompt(mix) {
  const { form, material, essence, enchantment, trim } = mix;
  if (!form) return '';

  const clauses = [`A whimsical ${phrase(form.name)} for a child's bedroom`];
  if (material) clauses.push(`built from ${phrase(material.name)}`);
  if (essence) clauses.push(`radiating ${phrase(essence.name)}`);
  if (enchantment) clauses.push(`enchanted so that it ${phrase(enchantment.name)}`);
  if (trim) clauses.push(`finished with ${phrase(trim.name)}`);

  // Tags from the picked material and essence become emphasis, which is the
  // only reason the tags exist as metadata rather than as prose.
  const emphasis = [...new Set([...(material?.tags ?? []), ...(essence?.tags ?? [])])];

  let prompt = `${clauses.join(', ')}.`;
  if (emphasis.length) prompt += ` Emphasise: ${emphasis.join(', ')}.`;
  prompt +=
    ' Storybook illustration style, soft rounded shapes, thick clean dark outlines,' +
    ' bright friendly colors. Centered composition, the object fills most of the frame.' +
    ' Completely flat solid light gray background, absolutely no gradient, no drop shadow,' +
    ' no scenery, no text, no letters, no numbers.';
  return prompt;
}

/** Which slots still need filling before the machine could run. */
export function missingSlots(mix) {
  return REQUIRED_SLOTS.filter((slot) => !mix[slot]);
}

/** One random asset per family, for trying combinations quickly. */
export function surprise(assets) {
  const mix = {};
  for (const slot of SLOT_ORDER) {
    const options = assets.filter((asset) => asset.family === slot && asset.hasArt);
    if (options.length) mix[slot] = options[Math.floor(Math.random() * options.length)];
  }
  return mix;
}
