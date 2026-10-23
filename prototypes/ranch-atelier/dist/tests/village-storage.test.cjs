const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const tick = () => new Promise(resolve => setImmediate(resolve));

// Manually deliver IndexedDB events to verify promise settlement boundaries.
// This tests the production handlers, not a replacement storage implementation.
function storage() {
  const requests = [], writes = [], transactions = [], boardWaiters = [];
  function request(method, key) {const r = {method, key}; requests.push(r); return r;}
  const store = {get(key) {return request('get', key);}, getKey(key) {return request('getKey', key);}, add(v) {writes.push(v);}, put(v) {writes.push(v);}};
  const db = {transaction(names) {const tx = {names, objectStore: () => store, abort() {tx.onabort?.();}}; transactions.push(tx);if(Array.isArray(names))boardWaiters.splice(0).forEach(resolve=>resolve(tx));return tx;}, close() {}};
  const context = vm.createContext({structuredClone, crypto, Event, TextEncoder, window: {dispatchEvent() {}}, localStorage: {setItem() {throw Error('cache denied');}}, indexedDB: {open() {const r = {result: db}; queueMicrotask(() => r.onsuccess()); return r;}}});
  const source = fs.readFileSync(path.join(__dirname, '../card-library.js'), 'utf8');
  vm.runInContext(source.replace(/\bexport /g, '') + '\nglobalThis.api={saveCards,saveBoard,loadBoard,getCard};', context);
  return {api: context.api, requests, writes, transactions, boardTransaction:()=>{const tx=transactions.find(t=>Array.isArray(t.names));return tx?Promise.resolve(tx):new Promise(resolve=>boardWaiters.push(resolve));}};
}
const card = id => ({id, revision: 1, name: id, cells: [{q: 0, r: 0}], rendition: {meshes: []}});
function deliver(h, key, result) {
  const r = h.requests.find(r => r.key === key && !r.delivered);
  assert(r, `Missing storage request: ${key}`);
  r.delivered = true; r.result = result; r.onsuccess();
  return r;
}

test('board save stores only exact revision pins and does not rewrite existing geometry', async () => {
  const h = storage(), original = {...card('a'), revision: 2};
  const saving = h.api.saveBoard({id: 'b', cards: {'a@2': original}});
  await tick();
  assert.equal(deliver(h, 'a@2', 'a@2').method, 'getKey');
  await h.boardTransaction();
  const snapshot = h.writes[0];
  assert.equal(snapshot.cards['a@2'].libraryRef, 'a@2');
  assert.equal(snapshot.cards['a@2'].revision, 2);
  assert.equal(snapshot.cards['a@2'].rendition, undefined);
  assert(original.rendition, 'In-memory card must remain hydrated');
  assert.equal(h.transactions.filter(t => t.names === 'cards').length, 1);
  h.transactions.at(-1).oncomplete();
  assert.equal((await saving).persisted, true);
});

test('missing card must commit before board and pointer writes start', async () => {
  const h = storage();
  const saving = h.api.saveBoard({id: 'b', cards: {'a@1': card('a')}});
  await tick(); deliver(h, 'a@1', undefined);
  await tick(); deliver(h, 'a@1', undefined);
  assert.equal(h.transactions.length, 2);
  assert.equal(h.writes.length, 1);
  assert.equal(h.writes[0].key, 'a@1');
  h.transactions[1].oncomplete();
  await h.boardTransaction();
  assert.deepEqual(Array.from(h.transactions[2].names), ['boards', 'meta']);
  h.transactions[2].oncomplete();
  await saving;
});

test('failed missing-card save cannot advance board or current pointer', async () => {
  const h = storage();
  const saving = h.api.saveBoard({id: 'b', cards: {'a@1': card('a')}});
  const rejected = assert.rejects(saving, /cancelled/);
  await tick(); deliver(h, 'a@1', undefined);
  await tick();
  h.transactions[1].onabort();
  await rejected;
  assert.equal(h.transactions.some(t => Array.isArray(t.names)), false);
  assert.equal(h.writes.length, 0);
});

test('board transaction abort rejects even after required cards have committed', async () => {
  const h = storage();
  const saving = h.api.saveBoard({id: 'b', cards: {'a@1': card('a')}});
  const rejected = assert.rejects(saving, /aborted/);
  await tick(); deliver(h, 'a@1', undefined);
  await tick(); deliver(h, 'a@1', undefined);
  h.transactions[1].oncomplete();
  await h.boardTransaction();
  h.transactions[2].onabort();
  await rejected;
});

test('reload hydrates the pinned revision directly and preserves legacy embedded cards', async () => {
  const h = storage(), pinned = {...card('a'), revision: 2}, legacy = card('legacy');
  const loading = h.api.loadBoard();
  await tick(); deliver(h, 'current', {id: 'b'});
  deliver(h, 'b', {id: 'b', cards: {'a@2': {libraryRef: 'a@2', id: 'a', revision: 2}, 'legacy@1': legacy}});
  await tick(); deliver(h, 'a@2', {card: pinned});
  const result = await loading;
  assert.equal(result.cards['a@2'], pinned);
  assert.equal(result.cards['legacy@1'], legacy);
  assert.equal(h.requests.filter(r => r.key === 'a@2').length, 1);
  assert(!h.requests.some(r => r.key === 'a@3'), 'Never upgrade to a newer card revision');
});

test('reload rejects a missing pinned revision instead of substituting another card', async () => {
  const h = storage();
  const loading = h.api.loadBoard();
  const rejected = assert.rejects(loading, /missing.*a@2/);
  await tick(); deliver(h, 'current', {id: 'b'});
  deliver(h, 'b', {id: 'b', cards: {'a@2': {libraryRef: 'a@2', id: 'a', revision: 2}}});
  await tick(); deliver(h, 'a@2', undefined);
  await rejected;
});

for (const [label, reference] of [
  ['dictionary key differs from libraryRef', {libraryRef: 'other@1', id: 'other', revision: 1}],
  ['libraryRef differs from card identity', {libraryRef: 'expected@2', id: 'other', revision: 1}],
]) test(`reload rejects a mismatched pin: ${label}`, async () => {
  const h = storage();
  const loading = h.api.loadBoard();
  const rejected = assert.rejects(loading, /mismatch/i);
  await tick(); deliver(h, 'current', {id: 'b'});
  deliver(h, 'b', {id: 'b', cards: {'expected@2': reference}});
  await rejected;
  assert.deepEqual(h.requests.map(r => r.key), ['current', 'b'], 'Reject the envelope before fetching any library card');
  assert.equal(h.writes.length, 0);
});

test('card batch resolves only on transaction completion and rejects abort', async () => {
  const h = storage();
  let settled = false;
  const saving = h.api.saveCards([card('a'), card('b')]);
  const rejected = assert.rejects(saving, /cancelled/);
  saving.then(() => {settled = true;}, () => {settled = true;});
  await tick();
  assert.equal(h.transactions.length, 1);
  for (const request of h.requests) request.onsuccess();
  assert.equal(h.writes.length, 2);
  await tick();
  assert.equal(settled, false, 'Individual request success is not transaction commit');
  h.transactions[0].onabort();
  await rejected;
});

test('immutable card conflict aborts the entire batch', async () => {
  const h = storage();
  const saving = h.api.saveCards([card('a'), card('b')]);
  const rejected = assert.rejects(saving);
  await tick();
  let aborted = false;
  h.transactions[0].abort = () => {aborted = true;queueMicrotask(()=>h.transactions[0].onabort());};
  h.requests[0].onsuccess();
  h.requests[1].result = {card: {name: 'different'}};
  h.requests[1].onsuccess();
  await rejected;
  assert.equal(aborted, true);
  assert.equal(h.transactions.length, 1, 'All writes must share one transaction');
});

test('board and current pointer share a transaction; cache failure is a receipt warning', async () => {
  const h = storage();
  const saving = h.api.saveBoard({id: 'board-a', revision: 3});
  await h.boardTransaction();
  assert.deepEqual(Array.from(h.transactions[0].names), ['boards', 'meta']);
  assert.equal(h.writes[1].id, 'board-a');
  h.transactions[0].oncomplete();
  const receipt = await saving;
  assert.equal(receipt.persisted, true);
  assert.equal(receipt.boardId, 'board-a');
  assert.equal(receipt.warnings.length, 1);
});

async function village(failAt, presetId) {
  const source = fs.readFileSync(path.join(__dirname, '../board.js'), 'utf8');
  const start = source.indexOf('async function startVillage('), end = source.indexOf('\nfor(const button', start);
  assert(start >= 0 && end > start);
  const {DOMESTIC_SCENES} = await import('../domestic-scenes.js');
  const {HERO_SCENES} = await import('../castle-scenes.js');
  const {DISTRICT_SCENES} = await import('../district-scenes.js');
  const {SEASIDE_SCENES} = await import('../seaside-scenes.js');
  const {settlementPreset} = await import('../settlement-presets.js');
  const durableCards = [], durableBoards = [], requests = [], placements = [];
  let id = 0;
  const c = {DOMESTIC_SCENES, SCENE_DEFINITIONS: {...DOMESTIC_SCENES, ...HERO_SCENES, ...DISTRICT_SCENES, ...SEASIDE_SCENES}, busy: false, mode: 'place', actionRevision: 0, board: {id: 'previous', revision: 1},
    innerWidth: 1200,
    composer: {dimensions: {}}, assetIndex: {}, crypto: {randomUUID: () => 'id-' + ++id},
    settlementPreset,
    planSettlementPreset: args => {
      placements.push(args);
      if (failAt === 'site') return {status: 'blocked'};
      return {status: 'ready', board: {id: args.boardId, revision: 1}, economy: {}, site: {q: 2, r: -1}};
    },
    runVillage() {}, setBusy: v => {c.busy = v;}, status() {}, requestAnimationFrame: fn => fn(), dispose() {},
    composeDraft: async request => {requests.push(request); return {group: {}, draft: {type: request.type, resolvedPlan: {warnings: []}}};},
    createCard: draft => ({...draft, id: 'card-' + ++id}), emptyBoard: id => ({id, revision: 1}), editBoard: b => b,
    planComposition: () => ({assembly: {}}), boardHeight: () => () => 0,
    resolveBoardEconomy: () => ({report: {connectedInstanceIds: Array(7).fill('connected')}}), evolveBoardEconomy: b => b,
    saveCards: async cards => {durableCards.push(...cards);},
    rebuild: async next => {if (failAt === 'rebuild') throw Error('render failed'); c.board = next;},
    history: {commit() {}}, persistCurrent: async () => {durableBoards.push(c.board); return {persisted: true, warnings: []};},
    refreshDeck: async () => {if (failAt === 'deck') throw Error('deck failed');},
    setMode: v => {c.mode = v;}, fit() {}, refreshLife() {},
    focusSettlement() {if (failAt === 'focus') throw Error('settlement framing failed');},
  };
  vm.createContext(c);
  vm.runInContext(source.slice(start, end), c);
  let outcome;
  try {outcome = await c.startVillage(presetId);} catch (error) {outcome = error;}
  return {c, durableCards, durableBoards, requests, placements, outcome};
}

test('blocked settlement site leaves the previous board and library unchanged', async () => {
  const h = await village('site', 'burg');
  assert.match(h.outcome.message, /No suitable.*site/);
  assert.equal(h.requests.length, 8);
  assert.equal(h.durableCards.length, 0);
  assert.equal(h.durableBoards.length, 0);
  assert.equal(h.c.board.id, 'previous');
  assert.equal(h.c.busy, false);
});

test('Burg composes eight preset entries and persists its selected site metadata', async () => {
  const h = await village(undefined, 'burg');
  const {settlementPreset} = await import('../settlement-presets.js');
  const definition = settlementPreset('burg');
  assert.deepEqual(h.requests.map(r => [r.type, r.chosen, r.variation]), definition.entries.map(e => [e.type, e.preset, e.seed]));
  assert(h.requests.every(Object.isFrozen));
  assert.equal(h.placements.length, 1);
  assert.equal(h.placements[0].maxCandidates, 8);
  assert.deepEqual(h.placements[0].entries, definition.entries);
  assert.equal(h.durableCards.length, 8);
  assert.equal(h.outcome.cardIds.length, 8);
  assert.equal(h.outcome.persisted, true);
  assert.equal(h.durableBoards.length, 1);
  assert.equal(h.outcome.warnings.length, 0, 'Successful desktop startup must not hide missing browser globals');
  assert.equal(h.durableBoards[0].settlement.preset, 'burg');
  assert.equal(h.durableBoards[0].settlement.label, definition.label);
  assert.deepEqual(h.durableBoards[0].settlement.site, {q: 2, r: -1});
});

test('village rebuild failure reports cards already durably saved', async () => {
  const h = await village('rebuild');
  assert.equal(h.durableCards.length, 7);
  assert.equal(h.c.board.id, 'previous');
  assert.equal(h.c.busy, false);
  assert.equal(h.outcome.cardIds?.length, 7, 'Partial failure must expose the durable card IDs for recovery');
});

test('village deck refresh failure returns the committed board receipt', async () => {
  const h = await village('deck');
  assert.equal(h.durableBoards.length, 1);
  assert.equal(h.outcome.boardId, h.c.board.id, 'A display refresh failure must not hide a committed board');
  assert.equal(h.outcome.persisted, true);
  assert(h.outcome.warnings?.length, 'Receipt should describe the refresh failure');
});

test('settlement framing failure preserves the successful save receipt', async () => {
  const h = await village('focus', 'burg');
  assert.equal(h.durableBoards.length, 1);
  assert.equal(h.outcome.outcome, 'board-committed');
  assert.equal(h.outcome.boardId, h.c.board.id);
  assert.equal(h.outcome.persisted, true);
  assert.equal(h.outcome.cardIds.length, 8);
  assert(h.outcome.warnings.some(w => /settlement framing failed/.test(w)));
  assert.equal(h.c.busy, false);
});
