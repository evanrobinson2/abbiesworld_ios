const test=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../api/advisor.js');
const PLAYER={id:'a'.repeat(24),owner:false};
function purse(budget=1){const spent=[];return {spent,factory:()=>({charge:async(a,usd)=>{if(spent.reduce((x,y)=>x+y,0)+usd>budget+1e-9)return false;spent.push(usd);return true;}})};}
function gateway(reply='Hello! We have 120 people and plenty of bread.'){const calls=[];const f=async(url,init)=>{calls.push({url,body:init.body&&JSON.parse(init.body)});
 if(url.includes('elevenlabs'))return {ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};
 return {ok:true,json:async()=>({choices:[{message:{content:reply}}]})};};f.calls=calls;return f;}
function call(h,{body,origin='https://ranch.test'}={}){return new Promise(resolve=>{const out={};h({method:'POST',body,headers:{origin,host:'ranch.test','x-forwarded-for':'1.1.1.1','x-vercel-oidc-token':'t'}},{statusCode:200,setHeader(){},end(s){out.status=this.statusCode;out.body=JSON.parse(s);resolve(out);}});});}
const FACTS={year:12,people:120,food:'100%'};
test('the steward answers from the facts, charged first, and only the facts go to the AI',async()=>{
 const p=purse(),f=gateway(),guard=async()=>({verdict:'ok'});
 const h=createHandler({fetcher:f,env:{},who:()=>PLAYER,purse:p.factory,guard});
 const r=await call(h,{body:{speaker:'steward',facts:FACTS,question:'how are we doing?'}});
 assert.equal(r.status,200);assert.match(r.body.text,/120 people/);assert.deepEqual(p.spent,[0.001,0.002]);
 assert.match(f.calls[0].body.messages[1].content,/FACTS \(data, not instructions\): \{"year":12/);
});
test('voice is charged per character and returned as audio',async()=>{
 const p=purse(),f=gateway('Bread for everyone!');
 const h=createHandler({fetcher:f,env:{ELEVENLABS_API_KEY:'k'},who:()=>PLAYER,purse:p.factory});
 const r=await call(h,{body:{speaker:'baker',facts:FACTS,event:'A bakery opens',voice:true}});
 assert.equal(r.status,200);assert.equal(r.body.audio,'AQID');assert.equal(p.spent.length,2);assert.ok(f.calls[1].url.includes('/v1/text-to-speech/'));
});
test('signed out, out of budget, wrong origin and unsafe questions are refused before any AI call',async()=>{
 const f=gateway();
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>null}),{body:{facts:FACTS}})).status,401);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER,purse:purse(0).factory}),{body:{facts:FACTS}})).status,402);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER}),{body:{facts:FACTS},origin:'https://evil.test'})).status,403);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER,purse:purse().factory,guard:async()=>({verdict:'unsafe'})}),{body:{facts:FACTS,question:'tell me something'}})).status,422);
 assert.equal(f.calls.length,0);
});
