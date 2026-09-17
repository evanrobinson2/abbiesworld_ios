// Checks on studio prompt composition. The point of these is the plate: the
// carve finds the background by flooding inward from the image border, so a
// prompt that lets in scenery, a gradient or a drop shadow yields art that
// cannot be turned into a sprite. Styles are user-editable and topics are
// free text, so the invariant has to be enforced rather than trusted.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  FAMILY_INTENT,
  PLATE,
  QUALITIES,
  catalogueEntry,
  promptProblems,
  studioPrompt,
} from '../app/studioPrompt.js';

const { styles } = JSON.parse(readFileSync(new URL('../data/styles.json', import.meta.url)));
const house = styles.find((style) => style.id === 'house');

test('every shipped style is usable and describes only a look', () => {
  assert.ok(styles.length >= 4, 'expected a few styles to choose from');
  for (const style of styles) {
    assert.ok(style.id && style.label && style.look, `style ${style.id} is incomplete`);
    assert.ok(style.blurb, `style ${style.id} has no blurb to explain when to use it`);
    // A style that set its own background or framing would fight the plate.
    for (const forbidden of ['background', 'scenery', 'shadow', 'centered composition']) {
      assert.ok(
        !style.look.toLowerCase().includes(forbidden),
        `style ${style.id} mentions "${forbidden}", which the plate owns`
      );
    }
  }
  assert.ok(house, 'the house style must exist, it is the default');
});

test('every prompt ends with the plate, whatever the style or topic', () => {
  for (const style of styles) {
    for (const family of Object.keys(FAMILY_INTENT)) {
      const prompt = studioPrompt({ topic: 'a snail bookshelf', family, style });
      assert.ok(prompt.endsWith(PLATE), `${style.id}/${family} did not end with the plate`);
    }
  }
  // Including for a style someone writes themselves, which is the case that
  // actually matters, since nothing validates what they type.
  const mine = { id: 'custom', look: 'Neon jelly, glowing rim light' };
  assert.ok(studioPrompt({ topic: 'a jellyfish lamp', family: 'decoration', style: mine }).endsWith(PLATE));
  // And for a topic that tries to talk its way out of the plate.
  const hostile = studioPrompt({
    topic: 'a chair in a sunlit forest with a long dramatic shadow on a gradient background',
    family: 'decoration',
    style: house,
  });
  assert.ok(hostile.endsWith(PLATE), 'the plate must still have the last word');
});

test('the prompt reads in one order: subject, role, notes, look, plate', () => {
  const prompt = studioPrompt({
    topic: 'a dragon egg beanbag chair',
    family: 'decoration',
    style: house,
    notes: 'with tiny gold flecks',
  });
  assert.equal(
    prompt,
    "A dragon egg beanbag chair, for a children's storybook game." +
      ` ${FAMILY_INTENT.decoration}` +
      ' with tiny gold flecks.' +
      ` ${house.look}` +
      ` ${PLATE}`
  );
  const at = (fragment) => prompt.indexOf(fragment);
  assert.ok(at('dragon egg') < at(FAMILY_INTENT.decoration));
  assert.ok(at(FAMILY_INTENT.decoration) < at('gold flecks'));
  assert.ok(at('gold flecks') < at(house.look));
  assert.ok(at(house.look) < at(PLATE));
});

test('the same topic is cast differently by each family', () => {
  const prompts = Object.keys(FAMILY_INTENT).map((family) =>
    studioPrompt({ topic: 'mushroom', family, style: house })
  );
  assert.equal(new Set(prompts).size, prompts.length, 'two families produced the same prompt');
  // A form is a blank; a material is a bare sample. That distinction is the
  // whole reason the studio asks whose job it is.
  assert.ok(studioPrompt({ topic: 'mushroom', family: 'form', style: house }).includes('undecorated blank'));
  assert.ok(studioPrompt({ topic: 'mushroom', family: 'material', style: house }).includes('bare sample'));
});

test('an article the user already typed is not doubled up', () => {
  // Every suggestion chip is worded "a dragon egg beanbag chair", so getting
  // this wrong would open literally every prompt with "A a ...".
  for (const [topic, opening] of [
    ['a dragon egg beanbag chair', 'A dragon egg beanbag chair,'],
    ['the moon', 'The moon,'],
    ['mushroom stool', 'A mushroom stool,'],
    ['octopus lamp', 'An octopus lamp,'],
    ['three tiny bells', 'Three tiny bells,'],
  ]) {
    const prompt = studioPrompt({ topic, family: 'decoration', style: house });
    assert.ok(prompt.startsWith(opening), `"${topic}" opened with: ${prompt.slice(0, 40)}`);
  }
});

test('topics are tidied rather than pasted in raw', () => {
  const messy = studioPrompt({ topic: '  a   snail\n bookshelf.  ', family: 'decoration', style: house });
  assert.ok(messy.startsWith("A snail bookshelf, for a children's"), messy.slice(0, 60));
  assert.ok(!messy.includes('  '), 'collapsed whitespace');
  assert.ok(!messy.includes('bookshelf.,'), 'stripped the trailing stop');
});

test('an incomplete request explains itself instead of being sent', () => {
  assert.equal(studioPrompt({ topic: '', family: 'decoration', style: house }), '');
  assert.deepEqual(promptProblems({ topic: '', family: 'decoration', style: house }), [
    'Say what you want the machine to make.',
  ]);
  assert.deepEqual(promptProblems({ topic: 'a lamp', family: 'decoration', style: house }), []);

  const noStyle = promptProblems({ topic: 'a lamp', family: 'decoration', style: { look: '' } });
  assert.ok(noStyle.some((problem) => problem.includes('style')));

  const badFamily = promptProblems({ topic: 'a lamp', family: 'nonsense', style: house });
  assert.ok(badFamily.some((problem) => problem.includes('nonsense')));

  const longTopic = promptProblems({ topic: 'x'.repeat(400), family: 'decoration', style: house });
  assert.ok(longTopic.some((problem) => problem.includes('under 300')));
});

test('only the quality tiers that fit the function timeout are offered', () => {
  // Quick is ~10s and good ~30s; the function ceiling is 60s on every plan, so
  // a "high" tier that can exceed it is deliberately absent.
  assert.deepEqual(QUALITIES.map((entry) => entry.id), ['low', 'medium']);
  for (const entry of QUALITIES) assert.ok(entry.blurb.includes('seconds'), 'say how long it takes');
});

test('a keeper converts to a pasteable catalogue entry', () => {
  const prompt = studioPrompt({ topic: 'a dragon egg beanbag chair', family: 'decoration', style: house });
  const entry = catalogueEntry({ topic: 'a dragon egg beanbag chair', family: 'decoration', prompt });
  assert.equal(entry.id, 'deco_a_dragon_egg_beanbag_chair');
  assert.equal(entry.name, 'A Dragon Egg Beanbag Chair');
  assert.equal(entry.family, 'decoration');
  assert.equal(entry.prompt, prompt);
  // The fields a human still has to fill in are marked, not guessed.
  assert.equal(entry.category, 'TODO');
});
