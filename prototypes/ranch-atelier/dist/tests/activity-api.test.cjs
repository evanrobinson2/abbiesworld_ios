const { test } = require('node:test');
const assert = require('node:assert/strict');
// Pins the owner lock off so the handler is tested alone; tests/owner-only.test.cjs covers it on.
const { createHandler } = require('../api/activity.js');
async function call(handler, req) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ headers: { host: 'x.test', ...(req.headers || {}) }, url: '/api/activity', ...req }, res);
  return { status: res.statusCode, body: JSON.parse(res.body) };
}
test('activity proxies the dispatch feed with the key and reports offline without it', async () => {
  const seen = [];
  const handler = createHandler(async (url, opts) => { seen.push({ url, opts }); return { ok: true, status: 200, json: async () => ({ events: [{ id: 'e1' }], jobs: [{ parcel_id: 'd1' }], machines: [] }) }; }, { env: {} });
  delete process.env.DISPATCH_FEED_KEY;
  assert.equal((await call(handler, { method: 'GET' })).body.source, 'offline');
  process.env.DISPATCH_FEED_KEY = 'k';
  const live = await call(handler, { method: 'GET', url: '/api/activity?since=2026-10-22T00:00:00Z' });
  assert.equal(live.body.source, 'live');
  assert.equal(live.body.jobs[0].parcel_id, 'd1');
  assert.match(seen[0].url, /format=activity&since=2026-10-22/);
  assert.equal(seen[0].opts.headers['X-Dispatch-Feed-Key'], 'k');
  const steer = await call(handler, { method: 'POST', body: { dispatch_id: 'd1', instructions: 'domed lid' } });
  assert.equal(steer.status, 200);
  assert.deepEqual(JSON.parse(seen[1].opts.body), { dispatch_id: 'd1', instructions: 'domed lid', source: 'ranch-app' });
  assert.equal((await call(handler, { method: 'POST', body: { dispatch_id: 'd1', instructions: ' ' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', headers: { origin: 'https://evil.test' }, body: { dispatch_id: 'd1', instructions: 'x' } })).status, 403);
  delete process.env.DISPATCH_FEED_KEY;
});
