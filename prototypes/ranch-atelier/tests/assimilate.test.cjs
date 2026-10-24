const assert = require('node:assert/strict');
const { createHandler } = require('../dist/api/assimilate.js');
const PHOTO = 'data:image/png;base64,iVBORw0KGgo=';
const run = async (body, { screen, plan, signedIn = true, charge = true } = {}) => {
  const calls = [];
  const fetcher = async (u, o) => { const b = JSON.parse(o.body); calls.push(b.messages[0].content.slice(0, 20));
    const out = b.messages[0].content.startsWith('You screen') ? screen : plan;
    if (out === 'fail') return { ok: false, status: 500 };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(out) } }] }) }; };
  const h = createHandler({ fetcher, env: { AI_GATEWAY_API_KEY: 'x' }, who: () => signedIn ? { id: 'a' } : null, purse: () => ({ charge: async () => charge }) });
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(d) { this.body = JSON.parse(d); } };
  await h({ method: 'POST', headers: {}, body }, res); return { status: res.statusCode, body: res.body, calls };
};
const ok = { sexual: false, nude: false, unsafe: false, child_visible: false, uncertain: false };
const plan = { title: 'Teapot Park', theme: 'park', anchor: { label: 'a red teapot' }, props: ['bench', 'tree', 'bogus', 'cow'], life: ['goat', 'tree'], wanted: ['steam'], inferred: ['sunny'], story: 'Tea time.' };
(async () => {
  let r = await run({ consent: true, words: 'x', photo: PHOTO }, { screen: ok, plan });
  assert.equal(r.status, 200); assert.equal(r.body.status, 'drafted'); assert.deepEqual(r.body.brief.props, ['bench', 'tree']); assert.deepEqual(r.body.brief.life, ['goat']); assert.equal(r.body.brief.anchor.built, false);
  assert.equal(r.body.layout[0].anchor, true); assert.equal(r.calls.length, 2);
  r = await run({ consent: true, words: 'a teapot' }, { screen: ok, plan }); assert.equal(r.body.brief.anchor.inferred, true);
  for (const k of ['sexual', 'nude', 'unsafe']) { r = await run({ words: 'x', consent: true, photo: PHOTO }, { screen: { ...ok, [k]: true }, plan }); assert.equal(r.status, 422); assert.equal(r.calls.length, 1, 'rejected input never reaches the planner'); }
  r = await run({ words: 'x', consent: true, photo: PHOTO }, { screen: { ...ok, child_visible: true }, plan }); assert.equal(r.status, 409); assert.equal(r.body.outcome, 'held'); assert.equal(r.calls.length, 1);
  r = await run({ words: 'x', consent: true }, { screen: { ...ok, uncertain: true }, plan }); assert.equal(r.status, 409); assert.equal(r.calls.length, 1);
  r = await run({ words: 'x', consent: true }, { screen: 'fail', plan }); assert.equal(r.status, 503);
  r = await run({ words: 'x', consent: true }, { screen: { sexual: false }, plan }); assert.equal(r.status, 503, 'unreadable screen fails closed');
  r = await run({ video: 'x', consent: true }, { screen: ok, plan }); assert.equal(r.status, 501); assert.equal(r.calls.length, 0);
  r = await run({ audio: 'x', consent: true }, { screen: ok, plan }); assert.equal(r.status, 501);
  r = await run({ words: 'x' }, { screen: ok, plan }); assert.equal(r.status, 400);
  r = await run({ words: 'x', consent: true }, { screen: ok, plan, signedIn: false }); assert.equal(r.status, 401);
  r = await run({ words: 'x', consent: true }, { screen: ok, plan, charge: false }); assert.equal(r.status, 402);
  r = await run({ words: 'x', consent: true }, { screen: ok, plan: 'fail' }); assert.equal(r.status, 502);
  console.log('ASSIMILATE API OK');
})().catch(e => { console.error(e); process.exit(1); });
