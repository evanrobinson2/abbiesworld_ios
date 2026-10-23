const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../api/model-orders.js');
function fakeBlob() {
  const files = new Map();
  return { files,
    put: async (path, body, opts) => { if (files.has(path) && !opts.allowOverwrite) throw new Error('exists'); files.set(path, Buffer.from(body)); },
    list: async ({ prefix }) => ({ blobs: [...files.keys()].filter(p => p.startsWith(prefix)).map(pathname => ({ pathname })), hasMore: false }),
    get: async path => files.has(path) ? { statusCode: 200, stream: new Blob([files.get(path)]).stream() } : null };
}
const guard = answer => async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(answer) } }] }) });
const purse = (ok = true) => () => ({ charge: async () => ok });
const player = { id: 'a'.repeat(24), owner: false }, owner = { id: 'b'.repeat(24), owner: true };
const PHOTO = 'data:image/jpeg;base64,' + Buffer.from('fake jpeg').toString('base64');
function make({ answer = { people: false, faces: false, child: false, unclothed: false, unsafe: false, subject: 'a red tractor' }, me = player, env = { AI_GATEWAY_API_KEY: 'k' }, fetcher, ok } = {}) {
  const blob = fakeBlob();
  return { blob, handler: createHandler({ blob, env, fetcher: fetcher || guard(answer), who: () => me, purse: purse(ok) }) };
}
async function call(handler, req) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ headers: { host: 'x.test', ...(req.headers || {}) }, url: req.url || '/api/model-orders', ...req }, res);
  return { status: res.statusCode, body: res.headers['Content-Type'] === 'application/json' ? JSON.parse(res.body) : res.body };
}
const jsons = (blob, prefix) => [...blob.files.keys()].filter(p => p.startsWith(prefix) && p.endsWith('.json')).map(p => JSON.parse(blob.files.get(p)));

test('an order always starts at the concept stage and drops a note in the inbox', async () => {
  const { blob, handler } = make();
  const r = await call(handler, { method: 'POST', body: { text: 'a little red tractor', from_model_id: 'ranch-cow', stage: 'model' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.order.stage, 'concept');
  const [order] = jsons(blob, 'model-orders/v1/'), [note] = jsons(blob, 'feedback/v1/');
  assert.equal(order.stage, 'concept'); assert.equal(order.fromModel, 'ranch-cow'); assert.equal(order.photo, null);
  assert.equal(note.kind, 'model-order'); assert.match(note.note, /concept art/); assert.match(note.note, /never go straight to a model/);
});

test('a checked photo is kept privately, never put in the inbox, and faces mark the order no-likeness', async () => {
  const { blob, handler } = make({ answer: { people: true, faces: true, child: true, unclothed: false, unsafe: false, subject: 'a child holding a toy horse' } });
  const r = await call(handler, { method: 'POST', body: { text: 'make the toy horse', photo: PHOTO } });
  assert.equal(r.status, 200);
  assert.equal(r.body.order.noLikeness, true);
  assert.ok([...blob.files.keys()].some(p => /^model-orders\/v1\/.+\.jpg$/.test(p)));
  assert.ok(![...blob.files.keys()].some(p => p.startsWith('feedback/v1/') && !p.endsWith('.json')));
  assert.match(jsons(blob, 'feedback/v1/')[0].note, /do not redraw, model or make a likeness/);
});

test('unclothed or unsafe photos are refused with a plain reason and nothing is stored', async () => {
  for (const answer of [{ unclothed: true, unsafe: false }, { unclothed: false, unsafe: true }]) {
    const { blob, handler } = make({ answer });
    const r = await call(handler, { method: 'POST', body: { text: 'x', photo: PHOTO } });
    assert.equal(r.status, 422); assert.match(r.body.error, /can’t be used/);
    assert.equal(blob.files.size, 0);
  }
});

test('the photo check fails closed', async () => {
  const cases = [
    make({ env: {} }),
    make({ fetcher: async () => ({ ok: false, status: 500 }) }),
    make({ fetcher: async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: 'not json' } }] }) }) }),
    make({ answer: { people: false } })];
  for (const { blob, handler } of cases) {
    const r = await call(handler, { method: 'POST', body: { text: 'x', photo: PHOTO } });
    assert.equal(r.status, 422); assert.equal(blob.files.size, 0);
  }
});

test('photos need a signed-in player with budget left; words alone do not', async () => {
  assert.equal((await call(make({ me: null }).handler, { method: 'POST', body: { text: 'x', photo: PHOTO } })).status, 401);
  assert.equal((await call(make({ ok: false }).handler, { method: 'POST', body: { text: 'x', photo: PHOTO } })).status, 402);
  assert.equal((await call(make({ me: null }).handler, { method: 'POST', body: { text: 'just words' } })).status, 200);
});

test('bad orders are refused and only the owner can read orders and photos', async () => {
  const { handler } = make();
  assert.equal((await call(handler, { method: 'POST', body: { text: '  ' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', body: { text: 'x', from_model_id: '../etc' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', body: { text: 'x', photo: 'data:image/gif;base64,AAAA' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', headers: { origin: 'https://evil.test' }, body: { text: 'x' } })).status, 403);
  assert.equal((await call(handler, { method: 'DELETE' })).status, 405);
  assert.equal((await call(handler, { method: 'GET' })).status, 403);
  const own = make({ me: owner });
  const placed = await call(own.handler, { method: 'POST', body: { text: 'a barn cat', photo: PHOTO } });
  const listed = await call(own.handler, { method: 'GET' });
  assert.equal(listed.status, 200); assert.equal(listed.body.orders.length, 1);
  const pic = await call(own.handler, { method: 'GET', url: `/api/model-orders?photo=${placed.body.order.id}` });
  assert.equal(pic.status, 200); assert.equal(String(pic.body), 'fake jpeg');
});
