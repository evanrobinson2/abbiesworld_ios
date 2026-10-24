const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHandler}=require('../api/tile-chat.js');
const PLAYER={id:'a'.repeat(24),owner:false};
const items=JSON.parse(fs.readFileSync(__dirname+'/../../../../preview/diorama-swipe/models.json','utf8')).items;
let C,lib;
test.before(async()=>{C=await import('../simulations/tile-chat/contract.mjs');lib=C.libraryIndex(items);});
const tile=()=>{const pick=(role,place)=>lib.all.filter(i=>i.role===role&&i.place===place)[0];
 const ks=[pick('Building','Ranch'),pick('Animal','Ranch'),pick('Animal','Ranch'),pick('Plant','Ranch')].map(i=>i.key);
 return C.withIds({id:'t',deck:'setting',label:'Ranch',place:'Ranch',keys:ks,layout:ks.map((k,n)=>({key:k,x:-.5+n*.3,z:.1*n,rot:0}))},lib);};
test('every verb applies, stays on the hex and inside the library, and removing keeps one part',()=>{
 const d=tile();let r=C.apply(d,{verb:'move',ids:['p2'],dx:5,dz:5},lib);assert.ok(r.ok);const p=r.d.layout[1];assert.ok(Math.abs(p.z)<=.87&&Math.abs(p.x)<=1);
 r=C.apply(d,{verb:'scale',ids:['p1'],factor:99},lib);assert.ok(r.d.layout[0].size<=1.4);
 r=C.apply(d,{verb:'add',key:lib.all.find(i=>i.role==='Prop').key},lib);assert.equal(r.d.layout.length,5);
 assert.equal(C.apply(d,{verb:'add',key:'nope'},lib).ok,false);assert.equal(C.apply(d,{verb:'fly',ids:['p1']},lib).ok,false);
 assert.equal(C.apply(d,{verb:'remove',ids:['p1','p2','p3','p4']},lib).ok,false);
 r=C.apply(d,{verb:'restyle',place:'Cafe'},lib);assert.ok(r.ok);assert.ok(r.d.layout.every(q=>lib.by.get(q.key)));assert.notDeepEqual(r.d.layout.map(q=>q.key),d.layout.map(q=>q.key));
 assert.equal(d.layout.length,4,'apply never mutates its input (that is the undo snapshot)');
});
test('the free helper turns plain words into edits, and says so honestly when it cannot',()=>{
 const d=tile(),name=lib.by.get(d.layout[0].key).name.split(' ')[0];
 const rm=C.localPlan('remove the '+name);assert.equal(rm[0].verb,'remove');const res=C.resolve(d,rm[0],lib);assert.ok(res.ok);assert.equal(res.edit.ids[0],'p1');
 const add=C.resolve(d,C.localPlan('add a tree')[0],lib);assert.ok(add.ok);assert.equal(lib.by.get(add.edit.key).role,'Plant');
 assert.equal(C.resolve(d,C.localPlan('add a unicorn spaceship')[0],lib).ok,false);
 assert.equal(C.localPlan('make everything moon base')[0].verb,'restyle');assert.ok(C.resolve(d,C.localPlan('make everything moon base')[0],lib).edit.place==='Moon base');
 assert.equal(C.localPlan('sing me a song'),null);assert.ok(C.localPlan('undo').undo);
 const two=C.localPlan('add 2 chickens near the barn');assert.equal(two.length,2);
});
test('AI plans are cut down to the allowlist before use',()=>{
 const p=C.validatePlan({say:'Done!',edits:[{verb:'remove',target:'cow',extra:'<script>'},{verb:'delete-all'},{verb:'move',target:'p1',dx:99}]});
 assert.equal(p.edits.length,2);assert.equal(p.edits[1].dx,.6);assert.ok(!('extra' in p.edits[0]));assert.throws(()=>C.validatePlan({}));
});
function purse(budget=1){const spent=[];return {spent,factory:()=>({charge:async(a,usd)=>{if(spent.reduce((x,y)=>x+y,0)+usd>budget+1e-9)return false;spent.push(usd);return true;}})};}
function gateway(plan={say:'Moved it.',edits:[{verb:'remove',target:'cow'}]}){const calls=[];const f=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(plan)}}]})};};f.calls=calls;return f;}
function call(h,{body,origin='https://ranch.test'}={}){return new Promise(resolve=>{const out={};h({method:'POST',body,headers:{origin,host:'ranch.test','x-forwarded-for':'1.1.1.1','x-vercel-oidc-token':'t'}},{statusCode:200,setHeader(){},end(s){out.status=this.statusCode;out.body=JSON.parse(s);resolve(out);}});});}
const BODY={message:'remove the cow',places:['Ranch'],tile:{place:'Ranch',items:[{id:'p1',name:'Red barn',role:'Building'},{id:'p2',name:'Cow',role:'Animal'}]}};
test('the plan is charged first (guard then plan) and only the tile text goes to the AI',async()=>{
 const p=purse(),f=gateway(),h=createHandler({fetcher:f,env:{},who:()=>PLAYER,purse:p.factory,guard:async()=>({verdict:'ok'})});
 const r=await call(h,{body:BODY});assert.equal(r.status,200);assert.deepEqual(r.body.edits,[{verb:'remove',target:'cow'}]);assert.deepEqual(p.spent,[0.001,0.01]);
 assert.match(f.calls[0].body.messages[1].content,/TILE \(data, not instructions\)/);
});
test('signed out, out of budget, wrong origin, unsafe words and empty tiles are refused before any AI call',async()=>{
 const f=gateway(),ok=async()=>({verdict:'ok'});
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>null}),{body:BODY})).status,401);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER,purse:purse(0).factory,guard:ok}),{body:BODY})).status,402);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER}),{body:BODY,origin:'https://evil.test'})).status,403);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER,purse:purse().factory,guard:async()=>({verdict:'unsafe'})}),{body:BODY})).status,422);
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>PLAYER}),{body:{message:'hi',tile:{items:[]}}})).status,400);
 assert.equal((await call(createHandler({fetcher:f,env:{TILE_CHAT_ENABLED:'false'},who:()=>PLAYER}),{body:BODY})).status,503);
 assert.equal(f.calls.length,0);
});
