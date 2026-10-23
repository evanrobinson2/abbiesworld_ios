const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/model-reviews.js');
function fakeBlob() {
  const files = new Map();
  return { files,
    put: async (path, body, opts) => { if (files.has(path) && !opts.allowOverwrite) throw new Error('exists'); files.set(path, Buffer.from(body)); },
    del: async path => { files.delete(path); },
    list: async ({ prefix }) => ({ blobs: [...files.keys()].filter(p => p.startsWith(prefix)).map(pathname => ({ pathname })), hasMore: false }),
    get: async path => files.has(path) ? { statusCode: 200, stream: new Blob([files.get(path)]).stream() } : null };
}
async function call(handler, req) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ headers: { host: 'x.test', ...(req.headers || {}) }, url: '/api/model-reviews', ...req }, res);
  return { status: res.statusCode, body: JSON.parse(res.body) };
}
test('a verdict is kept per model, replaced by the next one, and dropped in the feedback inbox', async () => {
  const blob = fakeBlob(), handler = createHandler(blob);
  assert.equal((await call(handler, { method: 'POST', body: { id: 'ranch-barn-shelter', verdict: 'adjust', notes: 'roof steeper', via: 'voice', name: 'Barn shelter' } })).status, 200);
  assert.equal((await call(handler, { method: 'POST', body: JSON.stringify({ id: 'ranch-barn-shelter', verdict: 'accept' }) })).status, 200);
  const listed = await call(handler, { method: 'GET' });
  assert.equal(listed.body.reviews['ranch-barn-shelter'].verdict, 'accept');
  const inbox = [...blob.files.keys()].filter(p => p.startsWith('feedback/v1/'));
  assert.equal(inbox.length, 2);
  const first = JSON.parse(blob.files.get(inbox.sort()[0]));
  assert.equal(first.kind, 'model-review'); assert.match(first.note, /^Adjust: Barn shelter — roof steeper$/); assert.equal(first.via, 'voice');
  assert.match(inbox[0].slice('feedback/v1/'.length, -5), /^[a-z0-9]{8,12}-[a-f0-9]{8}$/);
  assert.equal((await call(handler, { method: 'POST', body: { id: 'ranch-barn-shelter', verdict: 'clear' } })).status, 200);
  assert.deepEqual((await call(handler, { method: 'GET' })).body.reviews, {});
});
test('bad reviews are refused', async () => {
  const handler = createHandler(fakeBlob());
  assert.equal((await call(handler, { method: 'POST', body: { id: 'ranch-cow', verdict: 'adjust', notes: '  ' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', body: { id: '../etc', verdict: 'accept' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', body: { id: 'ranch-cow', verdict: 'maybe' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', headers: { origin: 'https://evil.test' }, body: { id: 'ranch-cow', verdict: 'accept' } })).status, 403);
  assert.equal((await call(handler, { method: 'DELETE' })).status, 405);
});
