const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Transactional event fake: writes become visible only on completion. The
// production codec uses real gzip streams; no storage or codec logic is copied.
function harness(initial = [], options = {}) {
  const rows = new Map(initial.map(row => [row.key, structuredClone(row)]));
  const stats = {writes: 0, scans: 0, deletes: 0};
  const database = {close() {}, transaction(name, mode) {
    const write = mode === 'readwrite', staged = new Map();
    if (write) {stats.writes++; options.beforeWrite?.(rows, stats.writes);}
    let aborted = false;
    const tx = {error: null, abort() {aborted = true; queueMicrotask(() => tx.onabort?.());}};
    function request(read) {
      const r = {};
      queueMicrotask(() => {if (!aborted) {r.result = structuredClone(read()); r.onsuccess?.();}});
      return r;
    }
    const store = {
      get: key => request(() => rows.get(key)),
      getAll: () => request(() => [...rows.values()]),
      getAllKeys: () => {stats.scans++; return request(() => [...rows.keys()]);},
      add: row => staged.set(row.key, structuredClone(row)),
      put: row => staged.set(row.key, structuredClone(row)),
      delete() {stats.deletes++; throw Error('Compaction must not delete');},
    };
    tx.objectStore = () => store;
    setImmediate(() => {
      if (aborted) return;
      if (write && options.failWrite?.(stats.writes)) {
        tx.error = new DOMException('QuotaExceededError', 'QuotaExceededError');
        aborted = true; tx.onabort?.(); return;
      }
      for (const [key, row] of staged) rows.set(key, row);
      tx.oncomplete?.();
    });
    return tx;
  }};
  const context = vm.createContext({structuredClone, crypto, Event, CompressionStream, DecompressionStream, TextEncoder, Response, Blob,
    window: {dispatchEvent() {}}, indexedDB: {open() {const r = {result: database}; queueMicrotask(() => r.onsuccess()); return r;}}});
  const source = fs.readFileSync(path.join(__dirname, '../card-library.js'), 'utf8');
  vm.runInContext(source.replace(/\bexport /g, '') + '\nglobalThis.api={createCard,encodeStoredCard,decodeStoredCard,saveCards,compactCardStorage,getCard};', context);
  return {api: context.api, rows, stats};
}
function fixture(api) {
  return api.createCard({id: 'geometry-card', revision: 7, name: 'Full card', createdAt: '2026-10-19T00:00:00.000Z',
    cells: [{q: 0, r: 0}], seed: 4294967295, recipe: {seed: 123, generator: 'test', version: 2},
    rendition: {scene: {object: {type: 'Group'}, geometries: [{positions: [0, -1.125, 1e-8, 10000.75], indices: [0, 1, 2]}]}},
    capabilities: {housing: 6}, semantics: {implemented: ['geometry'], planned: ['interiors']},
    ports: [{id: 'gate', x: 1.25, y: 0, z: -2}], provenance: {asset: '/castle-assets/example.glb'}});
}
const plain = value => JSON.parse(JSON.stringify(value));

test('compaction preserves full geometry, semantics, provenance and pinned revision', async () => {
  const h = harness(), card = fixture(h.api), key = card.id + '@7';
  h.rows.set(key, {key, card});
  assert.equal(await h.api.compactCardStorage(), 1);
  assert.equal(h.rows.size, 1);
  assert.equal(h.rows.get(key).encoding, 'gzip-json-v1');
  assert.deepEqual(plain(await h.api.getCard(card.id, 7)), plain(card));
  assert.equal(h.stats.deletes, 0);
});

test('compressed same-key retries are idempotent and altered revisions are rejected', async () => {
  const h = harness(), card = fixture(h.api);
  await h.api.saveCards([card]);
  await h.api.saveCards([structuredClone(card)]);
  await assert.rejects(h.api.saveCards([{...card, name: 'changed'}]), /immutable/);
  assert.deepEqual(plain(await h.api.getCard(card.id, 7)), plain(card));
  assert.equal(h.rows.size, 1);
});

test('compaction never overwrites a concurrently replaced row', async () => {
  let replacement;
  const h = harness([], {beforeWrite(rows) {rows.set(replacement.key, replacement);}});
  const card = fixture(h.api), key = card.id + '@7';
  h.rows.set(key, {key, card});
  replacement = await h.api.encodeStoredCard({...card, name: 'Concurrent replacement'});
  await h.api.compactCardStorage();
  assert.equal(h.rows.get(key), replacement);
  assert.equal(h.stats.deletes, 0);
});

test('aborted compaction retains the original full row without deleting it', async () => {
  const h = harness([], {failWrite: () => true}), card = fixture(h.api), key = card.id + '@7';
  h.rows.set(key, {key, card});
  await assert.rejects(h.api.compactCardStorage(), /QuotaExceededError/);
  assert.deepEqual(plain(h.rows.get(key).card), plain(card));
  assert.equal(h.stats.deletes, 0);
});

test('quota retry reopens once, waits for abort and retains legacy rows on repeated failure', async () => {
  const h = harness([], {failWrite: () => true});
  const legacy = fixture(h.api), key = legacy.id + '@7';
  h.rows.set(key, {key, card: legacy});
  await assert.rejects(h.api.saveCards([{...legacy, id: 'new-card'}]), /QuotaExceededError/);
  assert.equal(h.stats.writes, 2, 'Initial save and one identical retry only');
  assert.equal(h.stats.scans, 0);
  assert.equal(h.rows.size, 1);
  assert.deepEqual(plain(await h.api.getCard(legacy.id, 7)), plain(legacy));
});

test('corrupt gzip is reported as a rejected read without rewriting the row', async () => {
  const row = {key: 'broken@1', encoding: 'gzip-json-v1', packed: new Uint8Array([1, 2, 3])};
  const h = harness([row]);
  await assert.rejects(h.api.getCard('broken', 1));
  assert.equal(h.stats.writes, 0);
  assert.equal(h.rows.size, 1);
});

test('human-readable quota messages retain their typed recovery signal',()=>{
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../card-library.js'),'utf8').replace(/\bexport /g,'')+'\nglobalThis.wrap=cardStorageError;',context);
 const error=context.wrap(new DOMException('The quota has been exceeded','QuotaExceededError'),'save failed');assert.equal(error.name,'QuotaExceededError');assert.match(error.message,/The quota has been exceeded/);
});

test('quota reopen retries the same complete cards without compaction or deletion',async()=>{const h=harness([],{failWrite:n=>n===1}),card=fixture(h.api);await h.api.saveCards([card]);assert.equal(h.stats.writes,2);assert.equal(h.stats.scans,0);assert.equal(h.stats.deletes,0);assert.deepEqual(plain(await h.api.getCard(card.id,7)),plain(card));});

test('cancellation errors cannot mask the original quota failure',async()=>{
 const requests=[],tx={objectStore:()=>({get:()=>{const r={};requests.push(r);return r;}})};
 const context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../card-library.js'),'utf8').replace(/\bexport /g,'')+'\nglobalThis.write=writeCardRows;',context);
 const pending=context.write({transaction:()=>tx},[{},{}],[{key:'a'},{key:'b'}]);
 requests[0].error=new DOMException('quota','QuotaExceededError');requests[0].onerror();tx.onerror({target:requests[0]});
 requests[1].error=new DOMException('cancelled','AbortError');requests[1].onerror();tx.onerror({target:requests[1]});tx.error=requests[0].error;tx.onabort();
 await assert.rejects(pending,e=>e.name==='QuotaExceededError'&&e.stage==='lookup');
});

for (const failRetry of [false, true]) test(`retry waits for abort and reuses encoded row objects (${failRetry ? 'second failure' : 'success'})`, async () => {
  const transactions = [], waiters = new Map(), persisted = new Map([['old@1', {key: 'old@1', card: {id: 'old', revision: 1}}]]);
  let opens = 0, closes = 0, encodes = 0, deletes = 0;
  const waitFor = index => transactions[index] ? Promise.resolve(transactions[index]) : new Promise(resolve => waiters.set(index, resolve));
  const context = vm.createContext({structuredClone, crypto, Event, CompressionStream, DecompressionStream, TextEncoder, Response, Blob,
    window: {dispatchEvent() {}}, indexedDB: {open() {
      const connectionId = ++opens;
      const r = {result: {close() {closes++;}, transaction() {
        const record = {connectionId, rows: []};
        const tx = {error: null, objectStore: () => ({
          get(key) {const request = {}; queueMicrotask(() => {request.result = persisted.get(key); request.onsuccess();}); return request;},
          add(row) {record.rows.push(row); return {};},
          delete() {deletes++; throw Error('Unexpected deletion');},
        })};
        record.tx = tx;
        const index = transactions.push(record) - 1;
        waiters.get(index)?.(record);
        return tx;
      }}};
      queueMicrotask(() => r.onsuccess()); return r;
    }}, counted: () => {encodes++;}});
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../card-library.js'), 'utf8').replace(/\bexport /g, '') +
    '\nconst originalEncoder=encodeStoredCard;encodeStoredCard=async card=>{counted();return originalEncoder(card);};globalThis.api={createCard,saveCards};', context);
  const card = fixture(context.api);
  let settled = false;
  const saving = context.api.saveCards([card]);
  saving.then(() => {settled = true;}, () => {settled = true;});
  const first = await waitFor(0);
  await new Promise(setImmediate);
  const quota = new DOMException('Storage refused the write', 'QuotaExceededError');
  first.tx.onerror({target: {error: quota}});
  await new Promise(setImmediate);
  assert.equal(opens, 1, 'Request error must not reopen before transaction abort');
  assert.equal(transactions.length, 1);
  assert.equal(settled, false);
  first.tx.error = quota; first.tx.onabort();
  const second = await waitFor(1);
  await new Promise(setImmediate);
  assert.notEqual(first.connectionId, second.connectionId);
  assert.equal(closes, 1);
  assert.equal(encodes, 1, 'Retry must not regenerate or re-encode the card');
  assert.equal(first.rows.length, 1);
  assert.strictEqual(second.rows[0], first.rows[0], 'Retry must reuse the exact encoded envelope');
  assert.strictEqual(second.rows[0].packed, first.rows[0].packed);
  if (failRetry) {
    const rejected = assert.rejects(saving, error => error.name === 'QuotaExceededError' && error.firstFailure.name === 'QuotaExceededError');
    second.tx.error = quota; second.tx.onabort(); await rejected;
  } else {
    for (const row of second.rows) persisted.set(row.key, row);
    second.tx.oncomplete(); await saving;
  }
  await new Promise(setImmediate);
  assert.equal(opens, 2);
  assert.equal(transactions.length, 2, 'Only one retry is allowed');
  assert.equal(deletes, 0);
  assert(persisted.has('old@1'));
  assert.equal(persisted.size, failRetry ? 1 : 2);
});
