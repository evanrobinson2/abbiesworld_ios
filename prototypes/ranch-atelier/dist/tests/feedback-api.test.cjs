const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/feedback.js');
function fakeBlob() {
  const files = new Map();
  return { files,
    put: async (path, body) => { files.set(path, Buffer.isBuffer(body) ? body : Buffer.from(body)); },
    list: async ({ prefix }) => ({ blobs: [...files.keys()].filter(p => p.startsWith(prefix)).map(pathname => ({ pathname })), hasMore: false }),
    get: async path => files.has(path) ? { statusCode: 200, stream: new Blob([files.get(path)]).stream() } : null };
}
async function call(handler, req) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ headers: { host: 'x.test', ...(req.headers || {}) }, url: '/api/feedback', ...req }, res);
  const type = res.headers['Content-Type'];
  return { status: res.statusCode, body: type === 'application/json' ? JSON.parse(res.body) : res.body, type };
}
const jpeg = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg').toString('base64');
test('feedback stores note and picture, lists newest first, serves the picture', async () => {
  const blob = fakeBlob(), handler = createHandler(blob);
  const first = await call(handler, { method: 'POST', body: { note: 'barn is too red', image: jpeg, thread: 'cmsg_01ABCDEFGHIJKLMNOP', page: '/sandbox' } });
  assert.equal(first.status, 200);
  await new Promise(r => setTimeout(r, 5));
  const second = await call(handler, { method: 'POST', body: JSON.stringify({ note: 'second', thread: 'not a thread' }) });
  const listed = await call(handler, { method: 'GET' });
  assert.deepEqual(listed.body.items.map(i => i.note), ['second', 'barn is too red']);
  assert.equal(listed.body.items[1].thread, 'cmsg_01ABCDEFGHIJKLMNOP');
  assert.equal(listed.body.items[0].thread, null);
  assert.equal(listed.body.items[1].imageUrl, `/api/feedback?image=${first.body.id}`);
  const since = await call(handler, { method: 'GET', url: `/api/feedback?since=${first.body.id}` });
  assert.deepEqual(since.body.items.map(i => i.id), [second.body.id]);
  const picture = await call(handler, { method: 'GET', url: `/api/feedback?image=${first.body.id}` });
  assert.equal(picture.type, 'image/jpeg');
  assert.equal(Buffer.from(picture.body).toString(), 'fake-jpeg');
});
test('feedback rejects empty posts, bad pictures and foreign origins', async () => {
  const handler = createHandler(fakeBlob());
  assert.equal((await call(handler, { method: 'POST', body: { note: '  ' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', body: { image: 'data:image/png;base64,AAAA' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', headers: { origin: 'https://evil.test' }, body: { note: 'hi' } })).status, 403);
  assert.equal((await call(handler, { method: 'GET', url: '/api/feedback?image=../x' })).status, 400);
});
