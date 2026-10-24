// AW-112: a charm takes her back to its mini game, and the first-charm lesson is remembered per player.
import test from 'node:test';
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = {getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k)};
globalThis.dispatchEvent = () => true; globalThis.CustomEvent = class { constructor(t, o) { this.type = t; this.detail = o?.detail; } };
const B = await import('../backpack.mjs');
const {ENTRANCES} = await import('../abbietown/entrances.mjs');

test('every replay gate is a real town entrance with a page', () => {
 for (const c of B.CHARMS.filter(c => c.replay)) assert.ok(ENTRANCES[c.replay]?.url, `${c.id} -> ${c.replay}`);
});
test('a charm leads to its own game and comes back to where she was', () => {
 const d = B.charmReplay('school-roof', '/town?at=x'); assert.equal(d.gate, 'town:school-door');
 assert.ok(d.url.startsWith('/studies/school/play.html')); assert.ok(d.url.includes('from=' + encodeURIComponent('/town?at=x')));
 assert.equal(B.charmReplay('toy-car').gate, 'town:skate-park');
 assert.equal(B.charmReplay('heart'), null); assert.equal(B.charmReplay('nope'), null);
});
test('the first-charm lesson is taught once, kept with her inventory, and charms are untouched', () => {
 B.earnCharm('school-roof'); const before = B.earnedCharms();
 assert.equal(B.taught('charm-replay'), false); assert.equal(B.markTaught('charm-replay'), true);
 assert.equal(B.taught('charm-replay'), true); assert.equal(B.markTaught('charm-replay'), false);
 assert.deepEqual(B.earnedCharms(), before);
 assert.ok(JSON.parse(store.get('aw-backpack')).taught['charm-replay']);
});
