const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/view-context.js');
process.env.RANCH_VIEW_READ_KEY = 'read-test-key';
process.env.RANCH_VIEW_WRITE_KEY = 'write-test-key';
const records = new Map();
const handler = createHandler({
  put: async (path, body) => records.set(path, { body, uploadedAt: new Date() }),
  list: async () => ({ blobs: [...records].map(([pathname, record]) => ({ pathname, uploadedAt: record.uploadedAt })) }),
  get: async path => records.has(path) ? { statusCode: 200, stream: new Response(records.get(path).body).body } : null
});
async function request(method, key, body, url = '/api/view-context', extra = {}) {
  let result;
  const res = { setHeader() {}, end(text) { result = { status: this.statusCode, body: JSON.parse(text) }; } };
  await handler({ method, headers: { authorization: 'Bearer ' + key, host: 'ranch.test', ...extra }, body, url }, res);
  return result;
}
const base = { sessionId: 'session-1234567890', slug: '/3d', title: '3D Ranch', viewport: { width: 390, height: 844 }, lastActiveAt: Date.now(), image: 'data:image/jpeg;base64,YWJj', sharing: true };
test('unauthenticated readers and browser write credentials cannot read private views', async () => {
  assert.equal((await request('GET', '')).status, 401);
  assert.equal((await request('GET', 'write-test-key')).status, 401);
  assert.equal((await request('POST', 'read-test-key', base)).status, 401);
});
test('reject cross-origin writes, traversal and oversized uploads', async () => {
  assert.equal((await request('POST', 'write-test-key', base, undefined, { origin: 'https://elsewhere.test' })).status, 403);
  assert.equal((await request('POST', 'write-test-key', { ...base, sessionId: '../../secret' })).status, 400);
  assert.equal((await request('POST', 'write-test-key', { ...base, extra: 'x'.repeat(1800001) })).status, 400);
});
test('roundtrip preserves actual page state and includes images only on demand', async () => {
  const write = await request('POST', 'write-test-key', { ...base, context: { camera: [1, 2, 3], selected: 'house' } }, undefined, { origin: 'https://ranch.test' });
  assert.equal(write.status, 200);
  const read = await request('GET', 'read-test-key');
  assert.deepEqual(read.body.views[0].context, { camera: [1, 2, 3], selected: 'house' });
  assert.equal(read.body.views[0].image, undefined);
  assert.equal(read.body.views[0].imageAvailable, true);
  assert.equal(read.body.views[0].stale, false);
  const image = await request('GET', 'read-test-key', null, '/api/view-context?image=1&sessionId=' + base.sessionId);
  assert.equal(image.body.views[0].image, base.image);
});
test('most recently interacted tab wins over background heartbeat; paused and old views are stale', async () => {
  await request('POST', 'write-test-key', { ...base, sessionId: 'background-123456789', lastActiveAt: 1 });
  assert.equal((await request('GET', 'read-test-key')).body.views[0].sessionId, base.sessionId);
  await request('POST', 'write-test-key', { ...base, sharing: false, image: null });
  assert.equal((await request('GET', 'read-test-key')).body.views.find(v => v.sessionId === base.sessionId).stale, true);
  const key = 'ranch-view/v1/' + base.sessionId + '.json';
  const record = JSON.parse(records.get(key).body);
  record.sharing = true; record.receivedAt = new Date(Date.now() - 120000).toISOString();
  records.get(key).body = JSON.stringify(record);
  assert.equal((await request('GET', 'read-test-key')).body.views.find(v => v.sessionId === base.sessionId).stale, true);
});
