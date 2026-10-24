const assert = require('node:assert/strict');
const { createHandler } = require('../dist/api/assimilate.js');
const PHOTO = 'data:image/png;base64,iVBORw0KGgo=';
const run = async (body, { screen, plan, signedIn = true, charge = true, stt = 'hello tea time', env = {} } = {}) => {
  const calls = [], charges = [];
  const fetcher = async (u, o) => { const b = JSON.parse(o.body); const sys = b.messages[0].content; calls.push(typeof sys === 'string' ? sys.slice(0, 20) : 'audio');
    if (typeof sys !== 'string') return stt === 'fail' ? { ok: false, status: 500 } : { ok: true, json: async () => ({ choices: [{ message: { content: stt } }] }) };
    const out = sys.startsWith('You screen') ? screen : plan;
    if (out === 'fail') return { ok: false, status: 500 };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(out) } }] }) }; };
  const h = createHandler({ fetcher, env: { AI_GATEWAY_API_KEY: 'x', ...env }, who: () => signedIn ? { id: 'a' } : null, purse: () => ({ charge: async (_a, usd) => { charges.push(usd); return charge; } }) });
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(d) { this.body = JSON.parse(d); } };
  await h({ method: 'POST', headers: {}, body }, res); return { status: res.statusCode, body: res.body, calls, charges };
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
  // Video: sampled frames take the photo path; raw video is refused before any spend.
  const FRAME = 'data:image/jpeg;base64,/9j/4AAQ', CLIP = { data: 'data:audio/webm;codecs=opus;base64,GkXfowEAAAAA', seconds: 12 }, SOUND = { env: { CAPTURE_STT_MODEL: 'stt/x' } };
  r = await run({ video: 'x', consent: true }, { screen: ok, plan }); assert.equal(r.status, 400); assert.equal(r.calls.length, 0); assert.equal(r.charges.length, 0);
  r = await run({ consent: true, frames: [FRAME, FRAME, FRAME] }, { screen: ok, plan }); assert.equal(r.status, 200); assert.equal(r.body.from, 'video'); assert.notEqual(r.body.brief.anchor.inferred, true);
  assert.ok(Math.abs(r.charges[0] - (0.005 * 3 + 0.02)) < 1e-9, 'one look per frame is charged up front');
  r = await run({ consent: true, frames: Array(7).fill(FRAME) }, { screen: ok, plan }); assert.equal(r.status, 400);
  r = await run({ consent: true, frames: ['data:image/gif;base64,AAAA'] }, { screen: ok, plan }); assert.equal(r.status, 400);
  r = await run({ consent: true, frames: [FRAME, FRAME] }, { screen: { ...ok, child_visible: true }, plan }); assert.equal(r.status, 409); assert.equal(r.calls.length, 1, 'a child in any frame holds the whole video');
  r = await run({ consent: true, frames: [FRAME] }, { screen: { ...ok, nude: true }, plan }); assert.equal(r.status, 422); assert.equal(r.calls.length, 1);
  // Audio: off until a speech model is named; then clip -> transcript -> screened as words -> planner; charged first.
  r = await run({ audio: CLIP, consent: true }, { screen: ok, plan }); assert.equal(r.status, 501); assert.equal(r.calls.length, 0); assert.equal(r.charges.length, 0);
  r = await run({ audio: CLIP, consent: true }, { screen: ok, plan, ...SOUND }); assert.equal(r.status, 200); assert.equal(r.body.from, 'sound');
  assert.deepEqual(r.calls.map(c => c.startsWith('You screen') ? 'screen' : c.startsWith('You plan') ? 'plan' : c), ['audio', 'screen', 'plan']);
  assert.ok(Math.abs(r.charges[0] - (0.02 + 0.001 + 0.02)) < 1e-9);
  r = await run({ audio: CLIP, consent: true }, { screen: { ...ok, unsafe: true }, plan, ...SOUND }); assert.equal(r.status, 422, 'unsafe speech is rejected'); assert.equal(r.calls.length, 2, 'never reaches the planner');
  r = await run({ audio: CLIP, consent: true }, { screen: ok, plan, stt: 'fail', ...SOUND }); assert.equal(r.status, 503);
  r = await run({ audio: { ...CLIP, seconds: 90 }, consent: true }, { screen: ok, plan, ...SOUND }); assert.equal(r.status, 400);
  r = await run({ audio: { ...CLIP, data: 'data:video/mp4;base64,AAAA' }, consent: true }, { screen: ok, plan, ...SOUND }); assert.equal(r.status, 400);
  r = await run({ audio: 'x', consent: true }, { screen: ok, plan, ...SOUND }); assert.equal(r.status, 400);
  r = await run({ audio: CLIP, consent: true }, { screen: ok, plan, charge: false, ...SOUND }); assert.equal(r.status, 402); assert.equal(r.calls.length, 0, 'a refused charge sends nothing to the gateway');
  r = await run({ words: 'x' }, { screen: ok, plan }); assert.equal(r.status, 400);
  r = await run({ words: 'x', consent: true }, { screen: ok, plan, signedIn: false }); assert.equal(r.status, 401);
  r = await run({ words: 'x', consent: true }, { screen: ok, plan, charge: false }); assert.equal(r.status, 402);
  r = await run({ words: 'x', consent: true }, { screen: ok, plan: 'fail' }); assert.equal(r.status, 502);
  console.log('ASSIMILATE API OK');
})().catch(e => { console.error(e); process.exit(1); });
