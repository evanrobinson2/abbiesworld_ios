// Composing a studio prompt from a topic, a family and a style.
//
// Three parts, joined in this order and never any other:
//
//   1. the topic, cast into a family's role  — what to draw
//   2. the style's look                       — how to draw it
//   3. the plate                              — how to frame and isolate it
//
// The plate is not configurable. Carving finds the background by flooding
// inward from the image border, so a prompt that lets in scenery, a gradient or
// a drop shadow produces art that cannot be carved and is therefore useless as
// a sprite. A style may change how a thing looks; it may not change that.

/** Appended to every prompt, always last. The carve depends on it. */
export const PLATE =
  'Centered composition, the subject fills most of the frame.' +
  ' Completely flat solid light gray background, absolutely no gradient, no drop shadow,' +
  ' no scenery, no text, no letters, no numbers.';

/** How a topic is cast into each family's role. A topic of "mushroom" becomes a
 *  plain mushroom blank, a bare sample of mushroom, or a bottled mushroom mood
 *  depending on which family is asked for. */
export const FAMILY_INTENT = {
  form: 'Shown as a plain undecorated blank, completely unpainted, no pattern, no print, no decoration of any kind, like an unpainted craft-store kit piece waiting to be decorated.',
  material:
    'Shown as a bare sample of the material on its own — a small neat stack, chunk or swatch — not built into any object.',
  essence:
    'Shown as a single whimsical glass potion bottle with a cork stopper, containing this as swirling contents.',
  enchantment:
    'Shown as a small round enamel charm medallion on a tiny ring, its face illustrating this.',
  trim: 'Shown on its own as a neat coil, spool or sewing card, not attached to anything.',
  tool: 'Shown on its own as a well-loved child-safe craft tool, not in use.',
  decoration:
    "Shown as a finished decoration for a child's bedroom, ready to be placed in a room.",
};

export const QUALITIES = [
  { id: 'low', label: 'Quick', blurb: 'About 10 seconds. Use this while you are still deciding.' },
  { id: 'medium', label: 'Good', blurb: 'About 30 seconds and noticeably finer. Use it once the wording is right.' },
];

const MAX_TOPIC = 300;
const MAX_NOTES = 400;

/** Trim, collapse whitespace, and drop a trailing full stop so the template's
 *  own punctuation reads correctly. */
function tidy(text) {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;]+$/, '');
}

/** People naturally type "a dragon egg beanbag chair", and the suggestion chips
 *  are worded that way too, so the template must not blindly prepend another
 *  article and open every prompt with "A a dragon egg". */
function withArticle(subject) {
  if (/^(a|an|the|some|my|two|three|four|five|\d)\b/i.test(subject)) {
    return subject.replace(/^./, (character) => character.toUpperCase());
  }
  const article = /^[aeiou]/i.test(subject) ? 'An' : 'A';
  return `${article} ${subject}`;
}

/**
 * Compose the exact prompt the studio will send.
 *
 * @param {object} request
 * @param {string} request.topic     what to draw, in the user's own words
 * @param {string} request.family    which family's role to cast it into
 * @param {object} request.style     `{ look }` — the chosen or custom style
 * @param {string} [request.notes]   extra direction, optional
 * @returns {string} the prompt, or '' if there is nothing to draw yet
 */
export function studioPrompt({ topic, family, style, notes }) {
  const subject = tidy(topic);
  if (!subject) return '';

  const parts = [`${withArticle(subject)}, for a children's storybook game.`];

  const intent = FAMILY_INTENT[family];
  if (intent) parts.push(intent);

  const extra = tidy(notes);
  if (extra) parts.push(`${extra}.`);

  const look = tidy(style?.look);
  if (look) parts.push(`${look}.`);

  parts.push(PLATE);
  return parts.join(' ');
}

/** Why a request cannot be sent yet, as sentences to show the user. Empty means
 *  it is ready. */
export function promptProblems({ topic, family, style, notes }) {
  const problems = [];
  const subject = tidy(topic);
  if (!subject) problems.push('Say what you want the machine to make.');
  if (subject.length > MAX_TOPIC) problems.push(`That topic is ${subject.length} characters; keep it under ${MAX_TOPIC}.`);
  if (tidy(notes).length > MAX_NOTES) problems.push(`Those notes are too long; keep them under ${MAX_NOTES} characters.`);
  if (family && !FAMILY_INTENT[family]) problems.push(`"${family}" is not a family the studio knows how to cast a topic into.`);
  if (!tidy(style?.look)) problems.push('Pick a style, or write one of your own.');
  return problems;
}

/** A catalogue entry for a generation worth keeping, ready to paste into
 *  tools/carve-assets/catalog/ingredients.json. Saving from the browser is not
 *  possible on a read-only deployment, so the studio hands back the exact text
 *  to commit instead of pretending it persisted. */
export function catalogueEntry({ topic, family, prompt }) {
  const slug = tidy(topic)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  const prefix = { form: 'form', material: 'mat', essence: 'ess', enchantment: 'ench', trim: 'trim', tool: 'tool', decoration: 'deco' }[family] ?? 'asset';
  return {
    id: `${prefix}_${slug}`,
    name: tidy(topic).replace(/\b\w/g, (c) => c.toUpperCase()),
    family,
    category: 'TODO',
    emoji: '',
    tags: [],
    prompt,
  };
}
