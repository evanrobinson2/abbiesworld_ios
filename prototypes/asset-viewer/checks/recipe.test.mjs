// Checks on the recipe wording and on the built catalogue. Run with `npm run
// check`. The point is that the taxonomy can be reviewed as text: if a recipe
// does not read as a sentence a child could follow, the families are wrong.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { SLOT_ORDER, imagePrompt, missingSlots, sentence, slotsFrom, surprise } from '../app/recipe.js';

const catalogue = JSON.parse(readFileSync(new URL('../data/assets.json', import.meta.url)));
const { assets, families, kinds } = catalogue;

const generated = assets.filter((asset) => asset.source === 'generated');
const byId = Object.fromEntries(assets.map((asset) => [asset.id, asset]));
const mixOf = (...ids) => Object.fromEntries(ids.map((id) => [byId[id].family, byId[id]]));

test('every generated asset has carved art and a recorded prompt', () => {
  assert.deepEqual(generated.filter((a) => !a.hasArt).map((a) => a.id), []);
  assert.deepEqual(generated.filter((a) => !a.prompt).map((a) => a.id), []);
});

test('every asset belongs to a declared kind and family', () => {
  const knownKinds = new Set(kinds.map((kind) => kind.id));
  const knownFamilies = new Set(families.map((family) => family.id));
  for (const asset of assets) {
    assert.ok(knownKinds.has(asset.kind), `${asset.id} has unknown kind ${asset.kind}`);
    assert.ok(knownFamilies.has(asset.family), `${asset.id} has unknown family ${asset.family}`);
  }
  // A declared family with nothing in it would show as an empty filter chip.
  for (const family of families) {
    assert.ok(assets.some((a) => a.family === family.id), `family ${family.id} is empty`);
  }
  for (const kind of kinds) {
    assert.ok(assets.some((a) => a.kind === kind.id), `kind ${kind.id} is empty`);
  }
});

test('the four asked-for kinds exist and hold both new and existing art', () => {
  for (const id of ['ingredient', 'rawMaterial', 'craftingItem', 'decoration']) {
    const group = assets.filter((asset) => asset.kind === id);
    assert.ok(group.length > 0, `kind ${id} is missing`);
    assert.ok(group.some((a) => a.source === 'generated'), `kind ${id} has no generated art`);
  }
  // Three of the four should also surface art that already existed in the repo;
  // ingredients are the exception, since the essences had no art at all.
  for (const id of ['rawMaterial', 'craftingItem', 'decoration']) {
    const group = assets.filter((asset) => asset.kind === id);
    assert.ok(group.some((a) => a.source === 'bundled'), `kind ${id} indexed nothing from the repo`);
  }
});

test('recipe slots are exactly the families the catalogue marks as slots', () => {
  const declared = families.filter((family) => family.recipeSlot).map((family) => family.id);
  assert.deepEqual([...declared].sort(), [...SLOT_ORDER].sort());
  assert.deepEqual(slotsFrom(families), SLOT_ORDER);
  // Tools and decorations are families but not slots: a recipe never eats them.
  for (const id of ['tool', 'decoration']) {
    assert.ok(!slotsFrom(families).includes(id), `${id} should not be a recipe slot`);
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

test('each decoration was generated from the prompt its own recipe composes', () => {
  const decorations = assets.filter((asset) => asset.family === 'decoration');
  assert.ok(decorations.length >= 10, 'expected a decoration set to check');
  for (const decoration of decorations) {
    assert.ok(Array.isArray(decoration.recipe), `${decoration.id} has no recipe`);
    const mix = mixOf(...decoration.recipe);
    // This is the whole claim: the art was made by this function, so recomposing
    // the recipe has to reproduce the stored prompt exactly or the two drifted.
    assert.equal(imagePrompt(mix), decoration.prompt, `${decoration.id} prompt drifted from its recipe`);
    assert.equal(sentence(mix), decoration.readback, `${decoration.id} readback drifted from its recipe`);
    assert.deepEqual(missingSlots(mix), [], `${decoration.id} recipe is missing a required slot`);
  }
});

test('surprise fills one slot per recipe family from assets that have art', () => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const mix = surprise(assets, families);
    assert.deepEqual(Object.keys(mix).sort(), [...SLOT_ORDER].sort());
    for (const slot of SLOT_ORDER) {
      assert.equal(mix[slot].family, slot);
      assert.ok(mix[slot].hasArt);
    }
    assert.deepEqual(missingSlots(mix), []);
    assert.ok(sentence(mix).endsWith('.'));
  }
});

test('every bundled asset records where it came from', () => {
  const bundled = assets.filter((asset) => asset.source === 'bundled');
  assert.ok(bundled.length > 1000, 'expected the whole repo to be indexed');
  for (const asset of bundled) {
    assert.ok(asset.path, `${asset.id} has no repo path`);
    assert.ok(asset.preview.startsWith('repo/'), `${asset.id} has no thumbnail`);
    assert.ok(asset.bytes > 0 && asset.dimensions?.length === 2, `${asset.id} is missing file metadata`);
  }
});
