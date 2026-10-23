import assert from 'node:assert/strict';
import {perceivable, validateItem, volunteer, readManifest} from '../presentation-layer.mjs';

// Perception never sees presentation, hidden or marker entities.
const seen = perceivable([
  {id: 'cow', type: 'cow'}, {id: 'sel', type: 'box', layer: 'presentation'},
  {id: 'ring', type: 'ring'}, {id: 'pin', type: 'marker'}, {id: 'ghost', type: 'tree', visible: false}, {id: 'axes', type: 'tree', developerOnly: true},
]);
assert.deepEqual(seen.map(e => e.id), ['cow', 'ring']);

// Characters know it, so it must not lead with an overlay.
assert.ok(validateItem({id: 'crowd', says: 'busy', who: 'characters', prefer: ['overlay'], ways: {overlay: 'gauge'}}).some(p => /lead with diegetic/.test(p)));
// Grown-up information stays out of the world.
assert.ok(validateItem({id: 'pnl', says: 'income statement', who: 'player', for: ['grown-up'], prefer: ['diegetic'], ways: {diegetic: 'x'}}).some(p => /grown-up view/.test(p)));

// The coffee shop example: Abbie feels a busy morning; Evan reads the ledger.
const {problems} = volunteer('coffee-shop', {place: 'coffee shop', dialect: 'playful-tense', items: [
  {id: 'rush', says: 'the morning rush', kind: 'level', who: 'characters', for: ['player', 'director'], read: () => 0.8,
   prefer: ['diegetic', 'meta'], ways: {diegetic: 'queue out the door, bell rings faster', meta: 'music lifts a step'}},
  {id: 'income', says: 'income statement', kind: 'ledger', who: 'player', for: ['grown-up'], read: () => ({espressoMachine: -5000}),
   prefer: ['overlay'], ways: {overlay: 'ledger page in the grown-up workbench'}},
]});
assert.deepEqual(problems, []);
assert.deepEqual(readManifest('coffee-shop', {audience: 'player'})[0].items.map(i => i.id), ['rush']);
assert.equal(readManifest('coffee-shop', {audience: 'grown-up'})[0].items[0].value.espressoMachine, -5000);
console.log('presentation-layer: ok');
