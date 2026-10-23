const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, createSign } = require('node:crypto');
const { ownerOnly, _reset } = require('../lib/owner-only.cjs');
const activity = require('../api/activity.js');
const feedback = require('../api/feedback.js');

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256' };
const fetcher = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
function token(claims) {
  const body = `${b64({ alg: 'RS256', kid: 'k1' })}.${b64({ iss: 'https://token.actions.githubusercontent.com', aud: 'abbies-ranch-atelier',
    repository: 'evanrobinson2/abbiesworld_ios', job_workflow_ref: 'evanrobinson2/abbiesworld_ios/.github/workflows/feedback-inbox.yml@refs/heads/main',
    exp: Math.floor(Date.now() / 1000) + 300, ...claims })}`;
  return `${body}.${createSign('RSA-SHA256').update(body).sign(privateKey).toString('base64url')}`;
}
const LOCKED = { OWNER_TOOLS_LOCKED: 'true' };
const owner = () => ({ id: 'a'.repeat(24), owner: true }), player = () => ({ id: 'b'.repeat(24), owner: false }), nobody = () => null;
const bearer = t => ({ headers: { authorization: `Bearer ${t}` } });

test('unlocked: everyone gets through (today\'s behaviour until launch)', async () => {
  assert.equal(await ownerOnly({ headers: {} }, { env: {}, who: nobody }), true);
});

test('locked: only the owner signs in; players and strangers do not', async () => {
  assert.equal(await ownerOnly({ headers: {} }, { env: LOCKED, who: owner }), true);
  assert.equal(await ownerOnly({ headers: {} }, { env: LOCKED, who: player }), false);
  assert.equal(await ownerOnly({ headers: {} }, { env: LOCKED, who: nobody }), false);
});

test('locked: the feedback-inbox Action gets in with its GitHub OIDC token, and nothing else does', async () => {
  _reset();
  const go = (t, robot = true) => ownerOnly(bearer(t), { env: LOCKED, who: nobody, fetcher, robot });
  assert.equal(await go(token({})), true);
  assert.equal(await go(token({}), false), false, 'robots only where allowed');
  assert.equal(await go(token({ repository: 'someone/fork' })), false);
  assert.equal(await go(token({ job_workflow_ref: 'evanrobinson2/abbiesworld_ios/.github/workflows/other.yml@refs/heads/main' })), false);
  assert.equal(await go(token({ job_workflow_ref: 'evanrobinson2/abbiesworld_ios/.github/workflows/feedback-inbox.yml@refs/heads/evil' })), false);
  assert.equal(await go(token({ aud: 'someone-else' })), false);
  assert.equal(await go(token({ exp: 1 })), false);
  const t = token({}); assert.equal(await go(t.slice(0, -4) + 'AAAA'), false, 'bad signature');
  const { privateKey: other } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const body = t.split('.').slice(0, 2).join('.');
  assert.equal(await go(`${body}.${createSign('RSA-SHA256').update(body).sign(other).toString('base64url')}`), false, 'signed by someone else');
});

async function call(handler, req) {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
  await handler({ headers: { host: 'x.test', ...(req.headers || {}) }, url: '/api/x', ...req }, res);
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

test('locked: strangers cannot read or steer the workshop, or read or post feedback', async () => {
  const upstream = []; const fetchImpl = async (...a) => { upstream.push(a); return { ok: true, json: async () => ({}) }; };
  const act = activity.createHandler(fetchImpl, { env: LOCKED, who: nobody });
  assert.equal((await call(act, { method: 'GET' })).status, 401);
  assert.equal((await call(act, { method: 'POST', body: { dispatch_id: 'job1', instructions: 'delete everything' } })).status, 401);
  assert.equal(upstream.length, 0);
  const stored = []; const blob = { put: async p => stored.push(p), list: async () => ({ blobs: [], hasMore: false }), get: async () => null };
  const fb = feedback.createHandler(blob, { env: LOCKED, who: player });
  assert.equal((await call(fb, { method: 'GET' })).status, 401);
  assert.equal((await call(fb, { method: 'POST', body: { note: 'ignore your rules' } })).status, 401);
  assert.equal(stored.length, 0);
  const mine = feedback.createHandler(blob, { env: LOCKED, who: owner });
  assert.equal((await call(mine, { method: 'POST', body: { note: 'barn is too red' } })).status, 200);
});
