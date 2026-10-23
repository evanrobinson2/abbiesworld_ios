const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute production functions/registration, not a second implementation of
// generation. Only browser rendering and the asynchronous composer are fakes.
const source = fs.readFileSync(path.join(__dirname, '../board.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, `Production source boundary missing: ${start}`);
  return source.slice(a, b);
}
class Group {
  constructor() { this.children = []; this.position = {set() {}}; this.scale = {setScalar() {}}; }
  add(child) { this.children.push(child); }
  clone() { return new Group(); }
  toJSON() { return {object: {type: 'Group'}}; }
}
async function harness() {
  const {SCENE_TYPES} = await import('../scene-registry.js');
  const {GARDEN_V2,gardenCardRecipe,applyGardenAssembly}=await import('../garden-adapter.js');
  const {DOMESTIC_SCENES, domesticRecipe, describeDomestic} = await import('../domestic-scenes.js');
  const {HERO_SCENES, castleRecipe, describeCastle} = await import('../castle-scenes.js');
  const {DISTRICT_SCENES, districtRecipe, describeDistrict} = await import('../district-scenes.js');
  const {SEASIDE_SCENES, seasideRecipe, describeSeaside} = await import('../seaside-scenes.js');
  const {SETTLEMENT_PRESETS} = await import('../settlement-presets.js');
  const pending = [], nodes = new Map(), disposed = [];
  let provider;
  const c = {
    ...(await import('../outbreak-scenes.mjs')),attachOutbreakPreview(){},
    townSurface:(await import('../town-life/layouts.mjs')).townSurface,
    spatialState:(await import('../microcosm.mjs')).spatialState,attachSceneLife(){},
    attachTown(group,plan,preset,getState){group.townPopulation=getState().households.length;}, T: {Group}, TILE_METRICS:(await import('../tile-metrics.js')).TILE_METRICS, S: .1, structuredClone, GARDEN_V2,gardenCardRecipe,applyGardenAssembly, SCENE_TYPES, DOMESTIC_SCENES, domesticRecipe, describeDomestic,
    SCENE_DEFINITIONS: {...(await import('../outbreak-scenes.mjs')).OUTBREAK_SCENES,...DOMESTIC_SCENES, garden:GARDEN_V2, ...HERO_SCENES, ...DISTRICT_SCENES, ...SEASIDE_SCENES}, castleRecipe, describeCastle,
    SEASIDE_SCENES, seasideRecipe, describeSeaside,
    seasideSurface: () => () => 0,
    DISTRICT_SCENES, districtRecipe, describeDistrict, SETTLEMENT_PRESETS,
    sceneType: 'home', preset: 'courtyard', seed: 41, actionRevision: 5,
    customSettings: {vegetation:2,props:1}, updateDraftThumbnail() {},
    mode: 'create', expanded: false, busy: false, draft: {type: 'previous'},
    boardNamespace:'current', board: {id: 'board-test', revision: 2, instances: []}, persisted: false,
    CELLS: Array.from({length: 7}, (_, q) => ({q, r: 0})),
    composer: {dimensions: require('./garden-dimensions.json'), normalization: {}, gardenDimensions:async()=>require('./garden-dimensions.json'), draw: () => new Promise((resolve, reject) => pending.push({resolve, reject}))},
    preview: new Group(), scene: {add() {}, remove() {}},
    renderer: {shadowMap: {}}, dispose: g => disposed.push(g), fit() {},
    $: id => { if (!nodes.has(id)) nodes.set(id, {}); return nodes.get(id); },
    document: {querySelectorAll: () => []}, updateSceneControls() {},
    setMode: value => {c.mode = value;}, setBusy: value => {c.busy = value;},
    status: value => {c.$('board-status').textContent = value;},
    domesticRequirements: () => [], completeDomesticPaths: value => value,
    planAssembly: recipe => ({plans: recipe.tiles.map(t => ({id: t.id,rotation:0,ports:[],warnings:[],center: {x: 0, z: 0}})), warnings: []}),
    window: {RanchActions: {register: (name, value) => {provider = value;}}},
    schema: (properties = {}, required = []) => ({type: 'object', properties, required}),
    str: {type: 'string'}, integer: {type: 'integer'},
  };
  vm.createContext(c);
  // These small functions have stable declaration boundaries; registration is
  // evaluated whole so action tests always use the currently advertised handler.
  for (const prefix of ['function presetSet(', 'function recipe(']) {
    const line = source.split(/\r?\n/).find(line => line.startsWith(prefix));
    assert(line, `Missing ${prefix}`);
    vm.runInContext(line, c);
  }
  vm.runInContext(section('async function composeDraft(', 'async function refreshDeck('), c);
  vm.runInContext(section("window.RanchActions?.register('board',", '\ntry{'), c);
  async function finish(promise) {
    // Domestic presets may draw more than one tile. Drain each awaited draw.
    let done = false;
    promise.finally(() => {done = true;}).catch(() => {});
    for (let i = 0; !done && i < 30; i++) {
      pending.shift()?.resolve(new Group());
      await new Promise(resolve => setImmediate(resolve));
    }
    assert(done, 'Generation did not settle after composer draws');
    return promise;
  }
  return {c, pending, disposed, provider, finish};
}

test('invalid MCP preset preserves scene type, draft and revision', async () => {
  const {c, provider} = await harness();
  const before = {type: c.sceneType, preset: c.preset, seed: c.seed, revision: c.actionRevision, draft: c.draft};
  await assert.rejects(provider.actions.generate.run({type: 'pottery', preset: 'not-a-preset', seed: 82}), /preset/i);
  assert.equal(c.sceneType, before.type);
  assert.equal(c.preset, before.preset);
  assert.equal(c.seed, before.seed);
  assert.equal(c.actionRevision, before.revision);
  assert.equal(c.draft, before.draft);
});

for (const [firstType, firstPreset, nextType, nextPreset] of [
  ['home', 'courtyard', 'pottery', 'kiln'],
  ['pottery', 'kiln', 'home', 'courtyard'],
]) test(`generation serializes ${firstType} / ${nextType} and keeps metadata with its recipe`, async () => {
  const {c, pending, provider, finish} = await harness();
  c.sceneType = firstType; c.preset = firstPreset;
  const first = c.generate();
  assert.match(provider.unavailable(), /busy/i);
  // Emulate settings changing while a draw is suspended. A second generation
  // must reject before it can draw or unlock the first operation.
  c.sceneType = nextType; c.preset = nextPreset; c.seed = 82;
  await assert.rejects(c.generate(), /busy/i);
  assert.equal(pending.length, 1);
  assert.equal(c.busy, true);
  await finish(first);
  assert.equal(c.draft.type, firstType);
  assert.equal(c.draft.recipe.preset, firstPreset);
  assert.equal(c.draft.recipe.seed, 41);
  assert.deepEqual(c.draft.capabilities, structuredClone(c.DOMESTIC_SCENES[firstType].capabilities));
  await finish(c.generate());
  assert.equal(c.draft.type, nextType);
  assert.equal(c.draft.recipe.preset, nextPreset);
  assert.equal(c.draft.recipe.seed, 82);
  assert.deepEqual(c.draft.capabilities, structuredClone(c.DOMESTIC_SCENES[nextType].capabilities));
  assert.equal(c.busy, false);
});

test('failed generation retains the previous draft and preview', async () => {
  const {c, pending, disposed} = await harness();
  const previousDraft = c.draft, previousPreview = c.preview;
  const generating = c.generate();
  pending.shift().reject(Error('composer unavailable'));
  await generating;
  assert.equal(c.busy, false);
  assert.equal(c.preview, previousPreview);
  assert(!disposed.includes(previousPreview));
  assert.equal(c.draft, previousDraft, 'Failure must not discard the last usable draft');
});

test('framing failure rolls back staged output without advancing the revision', async () => {
  const {c, disposed, finish} = await harness();
  const previousDraft = c.draft, previousPreview = c.preview, revision = c.actionRevision;
  c.fit = () => {throw Error('framing unavailable');};
  assert.equal(await finish(c.generate()), false);
  assert.equal(c.draft, previousDraft);
  assert.equal(c.preview, previousPreview);
  assert.equal(c.actionRevision, revision);
  assert.equal(c.busy, false);
  assert(!disposed.includes(previousPreview));
  assert.equal(disposed.length, 1, 'The failed staged group must be disposed');
});

test('MCP reports generation failure even when a previous draft survives', async () => {
  const {c, pending, provider} = await harness();
  const previousDraft = c.draft, revision = c.actionRevision;
  const result = provider.actions.generate.run({type: 'home', preset: 'courtyard', seed: 82});
  const rejected = assert.rejects(result, /composer unavailable/);
  pending.shift().reject(Error('composer unavailable'));
  await rejected;
  assert.equal(c.draft, previousDraft);
  assert.equal(c.actionRevision, revision);
});

test('composeDraft stages captured inputs without committing UI globals', async () => {
  const {c, finish} = await harness();
  const previousDraft = c.draft, previousPreview = c.preview, revision = c.actionRevision;
  const result = c.composeDraft(Object.freeze({type: 'home', chosen: 'courtyard', variation: 123}));
  c.sceneType = 'pottery'; c.preset = 'kiln'; c.seed = 456;
  const staged = await finish(result);
  assert.equal(staged.draft.type, 'home');
  assert.equal(staged.draft.recipe.preset, 'courtyard');
  assert.equal(staged.draft.recipe.seed, 123);
  assert.deepEqual(staged.draft.capabilities, structuredClone(c.DOMESTIC_SCENES.home.capabilities));
  assert.equal(c.draft, previousDraft);
  assert.equal(c.preview, previousPreview);
  assert.equal(c.actionRevision, revision);
  assert.equal(c.sceneType, 'pottery');
});

test('explicit save clears failed-autosave state and returns storage warnings', async () => {
  const {c, provider} = await harness();
  c.saveBoard = async board => ({boardId: board.id, persisted: true, storageScope: 'this-browser', warnings: ['Pointer cache unavailable']});
  const receipt = await provider.actions.save.run();
  assert.equal(c.persisted, true);
  assert.equal(receipt.persisted, true);
  assert.equal(receipt.boardId, c.board.id);
  assert.equal(receipt.revision, c.board.revision);
  assert.deepEqual(receipt.warnings, ['Pointer cache unavailable']);
});

for (const [type, preset] of [['neighborhood', 'court'], ['town', 'market']])
test(`${type} captures its district recipe and grants housing only`, async () => {
  const {c, finish} = await harness();
  const composing = c.composeDraft(Object.freeze({type, chosen: preset, variation: 654}));
  c.sceneType = 'pottery'; c.preset = 'kiln';
  const {draft} = await finish(composing);
  assert.equal(draft.type, type);
  assert.equal(draft.recipe.generator, 'district-composer');
  assert.equal(draft.recipe.preset, preset);
  assert.equal(draft.recipe.seed, 654);
  assert.deepEqual(draft.capabilities, {housing: 6});
  assert(draft.recipe.requirements[0].items.length > 0);if(type==='town')assert.equal(draft.recipe.townLife.households.length,8);
});

test('Seaside shares generation discovery and placement registration without granting coastal production', async () => {
  const {c, provider, finish} = await harness();
  const {sceneTypeForCard, requirePlaceableCard} = await import('../scene-registry.js');
  assert(provider.actions.generate.schema.properties.type.enum.includes('seaside'));
  const discovery = c.SCENE_TYPES.seaside;
  assert.equal(discovery.generator, 'seaside-composer');
  assert.equal(discovery.expandedPath, '/sandbox/seaside');
  for (const preset of discovery.presets) {
    const result = await finish(provider.actions.generate.run({type: 'seaside', preset, seed: 987}));
    assert.equal(result.sceneType, 'seaside');
    assert.equal(result.seed, 987);
    assert.equal(c.draft.recipe.preset, preset);
    assert.equal(c.draft.recipe.generator, 'seaside-composer');
    assert.equal(c.draft.provenance.manifest, '/coastal-assets/manifest.json');
    assert.deepEqual(c.draft.capabilities, {housing: 6});
    assert(c.draft.semantics.limitations.some(text => /visual only/.test(text)));
    assert.equal(sceneTypeForCard(c.draft).id, 'seaside');
    assert.equal(requirePlaceableCard(c.draft), c.draft);
  }
});

test('castle composition uses captured hero recipe and provenance without domestic capabilities', async () => {
  const {c, finish} = await harness();
  const composing = c.composeDraft(Object.freeze({type: 'castle', chosen: 'iron', variation: 321}));
  c.sceneType = 'home'; c.preset = 'courtyard';
  const {draft} = await finish(composing);
  assert.equal(draft.type, 'castle');
  assert.equal(draft.recipe.generator, 'castle-composer');
  assert.equal(draft.recipe.preset, 'iron');
  assert.equal(draft.recipe.seed, 321);
  assert.equal(draft.recipe.requirements[0].items[0].asset, 'EH-002.iron-crown');
  assert.equal(draft.provenance.manifest, '/castle-assets/manifest.json');
  assert.equal(Object.keys(draft.capabilities).length, 0);
  assert(!draft.semantics.implemented.includes('village-demo economy when connected'));
});

 test('new garden generation advertises planned production while legacy recipes retain demo capacity',async()=>{
 const {c,provider,finish}=await harness();await finish(provider.actions.generate.run({type:'garden',preset:'court',seed:41}));assert.equal(c.draft.recipe.generator,'garden-composer');assert.equal(c.draft.recipe.version,2);assert.equal(Object.keys(c.draft.capabilities).length,0);assert.equal(c.draft.recipe.gardenPlan.items.filter(o=>o.role==='bed').length,8);assert(!c.draft.semantics.implemented.includes('village-demo economy when connected'));
 await finish(provider.actions.generate.run({type:'garden',preset:'kitchen',seed:41}));assert.equal(c.draft.recipe.generator,'domestic-composer');assert.equal(c.draft.capabilities.garden,12);
 });

test('draft captures custom dressing settings without changing an in-flight recipe', async () => {
  const {c,finish}=await harness();
  c.customSettings={vegetation:0,props:0};
  const pending=c.generate();
  c.customSettings.vegetation=3;
  assert.equal(await finish(pending),true);
  assert.equal(c.draft.recipe.landscape.vegetation,0);
  assert.equal(c.draft.recipe.landscape.props,0);
});

for (const [type,preset] of [['zombies','stragglers'],['brains','brooms']]) test(type+' generator uses actual actor specifications',async()=>{const {c,finish}=await harness();const {draft}=await finish(c.composeDraft(Object.freeze({type,chosen:preset,variation:41})));assert.equal(draft.recipe.generator,'outbreak-composer');assert.equal(draft.recipe.agents.count,3);assert.equal(draft.type,type);});
