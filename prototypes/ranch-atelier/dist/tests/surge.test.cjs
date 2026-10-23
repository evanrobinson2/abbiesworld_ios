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
