const test=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../api/invent.js');
const contract=()=>import('../simulations/invent/contract.mjs');
const PLAYER={id:'b'.repeat(24),owner:false};

function memoryStore(){const m=new Map();return {m,async read(p){return m.has(p)?JSON.parse(m.get(p)):null;},async write(p,v){m.set(p,JSON.stringify(v));}};}
function purse(budget=1){const spent=[];return {spent,factory:()=>({left:async()=>budget-spent.reduce((a,b)=>a+b,0),charge:async(a,usd)=>{if(spent.reduce((x,y)=>x+y,0)+usd>budget+1e-9)return false;spent.push(usd);return true;}})};}
const RECIPE={name:'Rainbow Dragon',say:"Here's your rainbow dragon!",size:1.4,behavior:'bob',parts:[{id:'body',shape:'capsule',at:[0,.2,0],scale:[.5,.4,.8],color:'#7a5cff'},{id:'head',shape:'sphere',at:[0,.55,.5],scale:.3,color:'#ff7ab8'},{id:'wing',shape:'cone',at:[.4,.5,0],scale:[.4,.1,.5],rotation:[0,0,90],color:'#ffd36b'}]};
function designer({delay=0,recipe=RECIPE,verdict='ok'}={}){const calls=[];const fetcher=async(url,init)=>{const body=JSON.parse(init.body);calls.push(body);if(delay)await new Promise(r=>setTimeout(r,delay));
 const content=/safety and scope guard/.test(body.messages[0].content)?JSON.stringify({verdict,why:'t'}):JSON.stringify(recipe);
 return {ok:true,status:200,json:async()=>({choices:[{message:{content},finish_reason:'stop'}]})};};fetcher.calls=calls;return fetcher;}
function call(handler,{method='POST',body,origin='https://ranch.test',ip='1.2.3.4'}={}){
 return new Promise(resolve=>{const out={headers:{}};handler({method,body,headers:{origin,host:'ranch.test','x-forwarded-for':ip,'x-vercel-oidc-token':'oidc-test'}},{statusCode:200,setHeader(k,v){out.headers[k]=v;},end(s){out.status=this.statusCode;out.body=JSON.parse(s);resolve(out);}});});
}
const make=(o={})=>{const p=o.p||purse();let n=0;const store=o.store||memoryStore();const fetcher=o.fetcher||designer();return {p,store,fetcher,h:createHandler({who:()=>o.who===undefined?(o.crowd?{id:String(n++).padStart(24,'c'),owner:false}:PLAYER):o.who,purse:p.factory,store,fetcher,env:{}})};};

test('constrain keeps the toy kit and pulls everything into range',async()=>{
 const {constrain,LIMITS}=await contract();
 const r=constrain({name:'Rocket',size:99,behavior:'chase',parts:[...Array(40)].map((_,i)=>({id:'Fin!'+(i%3),shape:i%5?'cone':'gun',at:[9,-9,0],scale:50,color:'red',emissive:'#ff0000',extra:'x'}))});
 assert.equal(r.parts.length,LIMITS.parts);assert.equal(r.scale,LIMITS.size[1]);assert.equal(r.behavior,undefined);
 assert.ok(r.parts.every(p=>p.shape==='cone'&&p.at[0]===LIMITS.at&&p.at[1]===-0.2&&p.scale===2&&!p.color&&p.emissive==='#ff0000'&&!('extra' in p)));
 assert.equal(new Set(r.parts.map(p=>p.id)).size,r.parts.length);
 assert.throws(()=>constrain({parts:[{shape:'empty'}]}));
 const rude=constrain({name:'shit tower',say:'damn',parts:[{id:'sex',shape:'box'}]});
 assert.equal(rude.name,'My invention');assert.doesNotMatch(rude.say,/damn/);assert.equal(rude.parts[0].id,'box');
});

test('a made toy becomes valid holodeck ops',async()=>{
 const {constrain,toBuild}=await contract();const {buildOps}=await import('../simulations/live/policy.mjs');const {checkCommand}=await import('../simulations/holodeck/protocol.mjs');
 const ops=buildOps(toBuild(constrain(RECIPE),{id:'rainbow-dragon-1'}));ops.forEach(checkCommand);
 assert.equal(ops[0].args.shape,'empty');assert.equal(ops[0].args.behavior,'bob');assert.equal(ops.length,1+3+1);
});

test('a wish is guarded, designed, charged, stored and cached',async()=>{
 const {p,store,fetcher,h}=make();
 const r=await call(h,{body:{wish:'a Rainbow dragon!'}});
 assert.equal(r.status,200);assert.equal(r.body.ok,true);assert.equal(r.body.recipe.name,'Rainbow Dragon');assert.equal(r.body.cached,false);
 assert.equal(fetcher.calls.length,2);assert.deepEqual(p.spent,[0.001,0.02]);
 assert.ok([...store.m.keys()].some(k=>k.startsWith('invent/v1/cache/')));assert.ok([...store.m.keys()].some(k=>k.startsWith(`invent/v1/made/${PLAYER.id}/`)));
 // The same words again (any case or punctuation) are free and need no AI.
 const again=await call(h,{body:{wish:'A rainbow   dragon'}});
 assert.equal(again.body.cached,true);assert.equal(fetcher.calls.length,2);assert.equal(p.spent.length,2);
 // Another instance finds it in the shared store.
 const other=make({store});const third=await call(other.h,{body:{wish:'a rainbow dragon'}});
 assert.equal(third.body.cached,true);assert.equal(other.fetcher.calls.length,0);
});

test('unsafe wishes stop before any design, and guard trouble fails closed',async()=>{
 const local=make();const a=await call(local.h,{body:{wish:'a pistol'}});
 assert.equal(a.body.ok,false);assert.equal(local.fetcher.calls.length,0);assert.equal(local.p.spent.length,0);
 const judged=make({fetcher:designer({verdict:'unsafe'})});const b=await call(judged.h,{body:{wish:'something sneaky'}});
 assert.equal(b.body.ok,false);assert.equal(judged.fetcher.calls.length,1);assert.deepEqual(judged.p.spent,[0.001]);
 const broken=make({fetcher:async()=>({ok:false,status:500,json:async()=>({})})});const c=await call(broken.h,{body:{wish:'a pony'}});
 assert.equal(c.status,503);assert.ok(!c.body.recipe);
});

test('sign-in, origin and the spending cap are enforced; cached wishes stay free when magic runs out',async()=>{
 assert.equal((await call(make({who:null}).h,{body:{wish:'a pony'}})).body.signIn,true);
 assert.equal((await call(make().h,{body:{wish:'a pony'},origin:'https://evil.test'})).status,403);
 const store=memoryStore();const rich=make({store});await call(rich.h,{body:{wish:'a pony'}});
 const broke=make({store,p:purse(0)});
 assert.equal((await call(broke.h,{body:{wish:'a pony'}})).body.ok,true);
 const out=await call(broke.h,{body:{wish:'a robot'}});assert.equal(out.status,402);assert.equal(out.body.budget,true);
 assert.deepEqual(out.body.ideas,['Rainbow Dragon']);assert.equal((await call(broke.h,{body:{wish:out.body.ideas[0]}})).body.ok,true);
});

test('a surge of the same wish pays for one design',async()=>{
 const {p,fetcher,h}=make({crowd:true,fetcher:designer({delay:30})});
 const all=await Promise.all([...Array(12)].map((_,i)=>call(h,{body:{wish:'a big red barn'},ip:'10.0.0.'+i})));
 assert.ok(all.every(r=>r.body.ok));assert.equal(fetcher.calls.length,2);assert.deepEqual(p.spent,[0.001,0.02]);
});

test('bursts from one player are slowed down',async()=>{
 const {h}=make();let last;
 for(let i=0;i<9;i++)last=await call(h,{body:{wish:'toy number '+i},ip:'9.9.9.'+i});
 assert.equal(last.status,429);
});

test('the preview-only acceptance hook is off in production',async()=>{
 const store=memoryStore(),p=purse();
 const h=createHandler({who:()=>null,purse:p.factory,store,fetcher:designer(),env:{}});
 const r=await new Promise(resolve=>{const out={};h({method:'GET',url:'/api/invent?try=a%20pony',headers:{host:'ranch.test'}},{statusCode:200,setHeader(){},end(s){out.status=this.statusCode;out.body=JSON.parse(s);resolve(out);}});});
 assert.equal(r.body.recipe,undefined);assert.equal(r.body.signedIn,false);
});
