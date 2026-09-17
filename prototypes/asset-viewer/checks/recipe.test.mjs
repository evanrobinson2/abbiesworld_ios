// Checks on the recipe wording and on the built catalogue. Run with `npm run
// check`. The point is that the taxonomy can be reviewed as text: if a recipe
// does not read as a sentence a child could follow, the families are wrong.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { SLOT_ORDER, imagePrompt, missingSlots, sentence, surprise } from '../app/recipe.js';

const catalogue = JSON.parse(readFileSync(new URL('../data/assets.json', import.meta.url)));
const { assets, families } = catalogue;

const byId = Object.fromEntries(assets.map((asset) => [asset.id, asset]));
const mixOf = (...ids) =>
  Object.fromEntries(ids.map((id) => [byId[id].family, byId[id]]));

test('every catalogued asset has carved art and a recorded prompt', () => {
  const noArt = assets.filter((asset) => !asset.hasArt).map((a) => a.id);
  const noPrompt = assets.filter((asset) => !asset.prompt).map((a) => a.id);
  assert.deepEqual(noArt, [], 'assets missing art');
  assert.deepEqual(noPrompt, [], 'assets missing a prompt');
});

test('every family is populated, and every asset belongs to a known family', () => {
  const known = new Set(families.map((family) => family.id));
  assert.deepEqual([...known].sort(), [...SLOT_ORDER].sort());
  for (const family of families) {
    assert.ok(
      assets.some((asset) => asset.family === family.id),
      `family ${family.id} has no assets`
    );
  }
  for (const asset of assets) {
    assert.ok(known.has(asset.family), `${asset.id} has unknown family ${asset.family}`);
  }
});

test('a full recipe reads back as a sentence', () => {
  const mix = mixOf(
    'form_chair',
    'mat_gingerbread',
    'cozy_nap_energy',
    'ench_purrs_when_you_sit',
    'trim_pompom_fringe'
  );
  assert.equal(
    sentence(mix),
    'A Little Chair made of Gingerbread, with Cozy Nap Energy, that purrs when you sit, finished with Pompom Fringe.'
  );
});

test('a partial recipe still reads, and names what it is missing', () => {
  const justEssence = mixOf('cozy_nap_energy');
  assert.equal(sentence(justEssence), 'A mystery thing, with Cozy Nap Energy.');
  // Essences alone cannot describe a thing to build: that is why forms exist.
  assert.deepEqual(missingSlots(justEssence), ['form']);
  assert.equal(imagePrompt(justEssence), '');

  const withForm = mixOf('form_lamp', 'cozy_nap_energy');
  assert.deepEqual(missingSlots(withForm), []);
  assert.ok(imagePrompt(withForm).length > 0);
});

test('an empty mix produces nothing rather than a broken sentence', () => {
  assert.equal(sentence({}), '');
  assert.equal(imagePrompt({}), '');
});

test('the prompt carries the picked ingredients and their tags as emphasis', () => {
  const prompt = imagePrompt(mixOf('form_armchair', 'mat_cloud_cotton', 'ench_burps_rainbows'));
  for (const fragment of [
    'whimsical squishy armchair',
    'built from cloud cotton',
    'enchanted so that it burps rainbows',
  ]) {
    assert.ok(prompt.includes(fragment), `prompt missing "${fragment}"`);
  }
  // Cloud Cotton is tagged soft/white/floaty, and those tags should reach the prompt.
  assert.ok(/Emphasise:.*floaty/.test(prompt), 'material tags did not reach the prompt');
  // The house style must survive composition, or the result will not carve.
  assert.ok(prompt.includes('flat solid light gray background'), 'prompt lost the flat plate');
});

test('surprise fills one slot per family from assets that actually have art', () => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const mix = surprise(assets);
    assert.deepEqual(Object.keys(mix).sort(), [...SLOT_ORDER].sort());
    for (const slot of SLOT_ORDER) {
      assert.equal(mix[slot].family, slot);
      assert.ok(mix[slot].hasArt);
    }
    assert.deepEqual(missingSlots(mix), []);
    assert.ok(sentence(mix).endsWith('.'));
  }
});
