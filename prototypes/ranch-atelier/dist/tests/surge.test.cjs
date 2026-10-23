// Launch-day surge settings (docs/launch/SURGE.md): caps that can be raised in the env, surge mode keeping the public's
// pool for inventing, and composition opening from every host the game is served on.
const test=require('node:test');
const assert=require('node:assert/strict');
const {capFrom}=require('../lib/wallet.cjs');

test('caps read from the env, falling back on anything that is not a dollar amount',()=>{
 assert.equal(capFrom('300',100),300);assert.equal(capFrom('0',1),0);assert.equal(capFrom('2.5',1),2.5);
 for(const bad of [undefined,null,'',' ','lots','-5'])assert.equal(capFrom(bad,100),100);
});

const person=n=>({id:String(n).repeat(24),owner:false}),owner={id:'o'.repeat(24),owner:true};
const call=(h,body,origin='https://ranch.test',host='ranch.test')=>new Promise(resolve=>h({method:'POST',body,headers:{origin,host,'x-vercel-oidc-token':'t'}},
 {statusCode:200,setHeader(){},flushHeaders(){},write(){},on(){},off(){},end(s){resolve({status:this.statusCode,body:s?JSON.parse(s):null});}}));

test('surge mode rests public talking, keeps the owner talking, and spends nothing for the rested',async()=>{
 const {createHandler}=require('../api/live.js');
 const charged=[];const purse=()=>({left:async()=>1,charge:async(a,usd)=>{charged.push(usd);return true;}});
 const env={LIVE_TICKET_SECRET:'x',AI_SURGE_MODE:'true'};
 const rested=await call(createHandler({env,who:()=>person(4),purse}),{action:'session'});
 assert.equal(rested.status,402);assert.equal(rested.body.surge,true);assert.equal(charged.length,0);
 assert.equal((await call(createHandler({env,who:()=>owner,purse}),{action:'session'})).status,200);
 assert.equal((await call(createHandler({env:{LIVE_TICKET_SECRET:'x'},who:()=>person(4),purse}),{action:'session'})).status,200,'off by default');
});

test('inventing (tile composition) opens from abbies.world hosts and nowhere else',async()=>{
 const {createHandler}=require('../api/ai-compose.js');
 const env={AI_COMPOSITION_ENABLED:'true',AI_GATEWAY_API_KEY:'k'};
 const h=createHandler({env,who:()=>null});
 const body={prompt:'a red barn with a duck pond',requestId:'req-12345678'};
 for(const origin of ['https://ranch.abbies.world','https://www.abbies.world','https://abbies-ranch-atelier.vercel.app'])
  assert.equal((await call(h,body,origin)).status,401,`${origin} reaches sign-in`);
 for(const origin of ['https://evil.example','http://ranch.abbies.world','https://ranch.abbies.world.evil.example',undefined])
  assert.equal((await call(h,body,origin)).status,403,`${origin} is refused`);
});

function memoryStore(){
 const data=new Map();let n=0;
 return {data,async read(p){await new Promise(r=>setImmediate(r));const v=data.get(p);return v?{value:JSON.parse(v.body),etag:v.etag}:{value:null,etag:null};},
  async write(p,value,etag){await new Promise(r=>setImmediate(r));const cur=data.get(p);if(etag?cur?.etag!==etag:cur)return false;data.set(p,{body:JSON.stringify(value),etag:'e'+(++n)});return true;}};
}
const poolTotal=store=>[...store.data].filter(([k])=>k.startsWith('spend/v1/public/')).reduce((n,[,v])=>n+JSON.parse(v.body).usd,0);

test('a crowd charging at once spreads over the pool shards and never overspends',async()=>{
 const {createWallet}=require('../lib/wallet.cjs');
 const store=memoryStore(),w=createWallet({store,caps:{person:1,public:5,owner:1000}});
 // 400 players invent at the same moment, 2 cents each: exactly 250 fit in $5.
 const results=await Promise.all(Array.from({length:400},(_,i)=>w.charge({id:String(i).padStart(24,'p'),owner:false},0.02).catch(e=>e.message)));
 assert.equal(results.filter(r=>r===true).length,250);
 assert.deepEqual(results.filter(r=>typeof r==='string'),[],'no ledger-busy errors');
 assert.equal(Math.round(poolTotal(store)*1e6)/1e6,5);
 assert.ok([...store.data.keys()].filter(k=>k.startsWith('spend/v1/public/')).length>8,'charges landed on many shards');
 assert.equal(await w.left({id:'x'.repeat(24),owner:false}),0);
});

test('a charge too big for one shard takes from several, and spending from before sharding still counts',async()=>{
 const {createWallet}=require('../lib/wallet.cjs');
 const store=memoryStore();
 await store.write('spend/v1/public.json',{usd:60},null);
 const w=createWallet({store,caps:{person:50,public:100,owner:1000},shards:16});
 assert.equal(Math.round(await w.left({id:'a'.repeat(24),owner:false})*100)/100,40,'$100 minus the $60 already spent');
 assert.equal(await w.charge({id:'a'.repeat(24),owner:false},30),true,'$30 spans several $2.50 shards');
 assert.equal(await w.charge({id:'b'.repeat(24),owner:false},11),false,'only $10 left');
 assert.equal(Math.round(poolTotal(store)*1e6)/1e6,30,'the refused charge gave back every part');
});
