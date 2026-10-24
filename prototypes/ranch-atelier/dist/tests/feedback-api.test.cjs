const { test } = require('node:test');
const assert = require('node:assert/strict');
// These tests cover the handler itself, so they pin the owner lock off; tests/owner-only.test.cjs covers it on.
const UNLOCKED = { env: {} };
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
test('study revisions preserve multiline feedback, isolate studies and retry without duplicating', async () => {
  const blob=fakeBlob(), handler=createHandler(blob,{env:{OWNER_TOOLS_LOCKED:'true'},who:()=>({owner:true})});
  const body={note:'Publishing test\nSecond line',studyId:'faster-study-publishing',studyRevision:'a'.repeat(64),requestId:'m0000000-abcdef12',sha:'b'.repeat(40)};
  assert.equal((await call(handler,{method:'POST',body})).status,200);
  assert.equal((await call(handler,{method:'POST',body})).body.duplicate,true);
  assert.equal((await call(handler,{method:'POST',body:{...body,studyRevision:'c'.repeat(64)}})).status,409);
  const read=await call(handler,{method:'GET',url:'/api/feedback?studyId=faster-study-publishing'});
  assert.equal(read.body.items.length,1); assert.equal(read.body.items[0].note,body.note);
  assert.equal(read.body.items[0].studyRevision,body.studyRevision); assert.ok(read.body.items[0].receivedAt);
  assert.equal((await call(handler,{method:'GET',url:'/api/feedback?studyId=another-study'})).body.items.length,0);
  for(const bad of ['../study','UPPER','a'.repeat(81)])assert.equal((await call(handler,{method:'POST',body:{...body,studyId:bad}})).status,400);
  assert.equal((await call(handler,{method:'POST',body:{...body,studyRevision:'short'}})).status,400);
});
test('new study IDs do not bypass owner authorization or same-origin checks',async()=>{
  const body={note:'test',studyId:'new-study',studyRevision:'a'.repeat(64)};
  for(const who of [()=>null,()=>({owner:false})]){
    const handler=createHandler(fakeBlob(),{env:{OWNER_TOOLS_LOCKED:'true'},who});
    assert.equal((await call(handler,{method:'POST',body})).status,401);
    assert.equal((await call(handler,{method:'GET',url:'/api/feedback?studyId=new-study'})).status,401);
  }
  const handler=createHandler(fakeBlob(),{env:{OWNER_TOOLS_LOCKED:'true'},who:()=>({owner:true})});
  assert.equal((await call(handler,{method:'POST',headers:{host:'app.abbies.world',origin:'https://unrelated.vercel.app'},body})).status,403);
  assert.equal((await call(handler,{method:'OPTIONS'})).status,405);
});
test('study filtering happens before pagination, with revision history retained',async()=>{
  const blob=fakeBlob(), handler=createHandler(blob,UNLOCKED);
  for(let n=0;n<65;n++){const id='m00000'+String(n).padStart(2,'0')+'-abcdef12';blob.files.set('feedback/v1/'+id+'.json',Buffer.from(JSON.stringify({id,note:'note '+n,studyId:n<3?'quiet-study':'busy-study',studyRevision:'a'.repeat(64)})))}
  assert.equal((await call(handler,{method:'GET',url:'/api/feedback?studyId=quiet-study'})).body.items.length,3);
  const first=await call(handler,{method:'GET',url:'/api/feedback?studyId=busy-study'});
  assert.equal(first.body.items.length,50);assert.ok(first.body.nextBefore);
  const second=await call(handler,{method:'GET',url:'/api/feedback?studyId=busy-study&before='+first.body.nextBefore});
  assert.equal(second.body.items.length,12);
});
test('feedback stores note and picture, lists newest first, serves the picture', async () => {
  const blob = fakeBlob(), handler = createHandler(blob, UNLOCKED);
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
  const handler = createHandler(fakeBlob(), UNLOCKED);
  assert.equal((await call(handler, { method: 'POST', body: { note: '  ' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', body: { image: 'data:image/png;base64,AAAA' } })).status, 400);
  assert.equal((await call(handler, { method: 'POST', headers: { origin: 'https://evil.test' }, body: { note: 'hi' } })).status, 403);
  assert.equal((await call(handler, { method: 'GET', url: '/api/feedback?image=../x' })).status, 400);
});
