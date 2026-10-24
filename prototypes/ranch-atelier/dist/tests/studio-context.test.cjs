const {test}=require('node:test');
const assert=require('node:assert/strict');
const data=require('../studies/context.json');
const {createHandler}=require('../api/studio-context.js');
async function call(h,url='/api/studio-context') {
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(b){this.body=JSON.parse(b);}};
  await h({method:'GET',url,headers:{}},res);return res;
}
test('every study, alias and new id inherits studio sources; HTML escapes content',async()=>{
  const {resolveContext,contextHTML}=await import('../look/context-card.mjs');
  for(const id of [...Object.keys(data.studies),'brand-new-study'])
    assert(resolveContext(data,id).kinds.some(k=>k.items.some(i=>i.t==='Make imagination come alive')));
  const altered=structuredClone(data);altered.studio.entries[0].summary='<script>alert(1)</script>';
  assert(!contextHTML(altered,'new').includes('<script>'));
});
test('packet ranks and bounds evidence without mutating or promoting it',async()=>{
  const {studioPacket,studioText}=await import('../look/studio-context.mjs');
  const evidence=Array.from({length:25},(_,i)=>({id:String(i),source:'private/recording',summary:'x'.repeat(1000),study:i===24?'target':'other'}));
  const packet=studioPacket(data,{study:'target',evidence});
  assert.equal(packet.evidence[0].id,'24');assert.equal(packet.evidence.length,8);
  assert.equal(packet.evidence[0].summary.length,700);assert.equal(packet.omittedEvidence,17);
  assert.equal(evidence[0].summary.length,1000);assert.equal(packet.evidence[0].status,'unreviewed');
  assert(studioText(studioPacket(data)).length<14000);
});
test('private endpoint requires owner even when legacy tools are unlocked',async()=>{
  let reads=0;
  const res=await call(createHandler({gate:async(req,opts)=>{assert.equal(opts.env.OWNER_TOOLS_LOCKED,'true');return false;},feedback:async()=>{reads++;return [];}}),'/api/studio-context?feedback=1');
  assert.equal(res.statusCode,401);assert.equal(reads,0);
  assert.equal(res.headers['Cache-Control'],'private, no-store');
});
test('database notes read only on demand, remain unreviewed, failures explicit',async()=>{
  let reads=0;
  const h=createHandler({gate:async()=>true,feedback:async()=>{reads++;return [{id:'n',note:'Controls are swapped',receivedAt:'2026-10-24',studyId:'carwash',sha:'abc'}];}});
  assert.equal((await call(h)).body.evidence.length,0);assert.equal(reads,0);
  const res=await call(h,'/api/studio-context?feedback=1&study=carwash');
  assert.equal(reads,1);assert.equal(res.body.evidence[0].revision,'abc');
  assert.equal(res.body.evidence[0].status,'unreviewed user feedback');
  const failed=await call(createHandler({gate:async()=>true,feedback:async()=>{throw Error('offline');}}),'/api/studio-context?feedback=1');
  assert.match(failed.body.feedbackStatus,/unavailable/);assert.equal(failed.body.evidence.length,0);
});
