const test=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../api/project-chat.js');
const OWNER={id:'a'.repeat(24),owner:true},PLAYER={id:'b'.repeat(24),owner:false};
const ENV={PROJECT_CHAT_ENABLED:'true',PROJECT_CHAT_GITHUB_TOKEN:'t'};
function gh(issue={number:7,state:'open',title:'[game-chat] x',labels:[{name:'game-chat'}]},comments=[]){const calls=[];const f=async(url,init={})=>{calls.push({url,init});
 if(url.endsWith('/issues')&&init.method==='POST')return {ok:true,json:async()=>({number:7})};
 if(url.includes('/comments'))return {ok:true,json:async()=>comments};
 return {ok:true,json:async()=>issue};};f.calls=calls;return f;}
function call(h,{method='POST',url='/api/project-chat',body,origin='https://ranch.test'}={}){return new Promise(resolve=>{const out={};h({method,url,body,headers:{origin,host:'ranch.test'}},{statusCode:200,setHeader(){},end(s){out.status=this.statusCode;out.body=JSON.parse(s);resolve(out);}});});}
test('a message becomes a game-chat issue with the hex as context, and only that',async()=>{
 const f=gh(),h=createHandler({fetcher:f,env:ENV,who:()=>OWNER});
 const r=await call(h,{body:{message:'Add a pond to this hex',hex:{id:'h4',label:'Blank hex 4'}}});
 assert.equal(r.status,200);assert.equal(r.body.issue,7);const sent=JSON.parse(f.calls[0].init.body);
 assert.deepEqual(sent.labels,['game-chat']);assert.match(sent.title,/^\[game-chat\] Add a pond/);assert.match(sent.body,/Selected hex: Blank hex 4/);assert.ok(!/Bearer/.test(sent.body));
});
test('off by default, owner only, same-origin; players and the off state look identical',async()=>{
 const f=gh();
 assert.equal((await call(createHandler({fetcher:f,env:{},who:()=>OWNER}),{body:{message:'hi'}})).status,403);
 assert.equal((await call(createHandler({fetcher:f,env:ENV,who:()=>PLAYER}),{body:{message:'hi'}})).status,403);
 assert.equal((await call(createHandler({fetcher:f,env:ENV,who:()=>null}),{body:{message:'hi'}})).status,403);
 assert.equal((await call(createHandler({fetcher:f,env:ENV,who:()=>OWNER}),{body:{message:'hi'},origin:'https://evil.test'})).status,403);
 assert.deepEqual((await call(createHandler({fetcher:f,env:ENV,who:()=>PLAYER}),{method:'GET'})).body,{enabled:false});
 assert.equal((await call(createHandler({fetcher:f,env:{PROJECT_CHAT_ENABLED:'true'},who:()=>OWNER}),{body:{message:'hi'}})).status,503);
 assert.equal(f.calls.length,0);
});
test('anything that looks like a secret is refused and never sent',async()=>{
 const f=gh(),h=createHandler({fetcher:f,env:ENV,who:()=>OWNER});
 for(const m of ['my key is sk-abcdefghijklmnopqrstuvwx','ghp_abcdefghijklmnopqrstuvwxyz0123','password: hunter2hunter2','-----BEGIN RSA PRIVATE KEY-----'])assert.equal((await call(h,{body:{message:m}})).status,422);
 assert.equal(f.calls.length,0);
});
test('status walks sent, received, working, result, and only game-chat issues can be read',async()=>{
 const get=(issue,comments)=>call(createHandler({fetcher:gh(issue,comments),env:ENV,who:()=>OWNER}),{method:'GET',url:'/api/project-chat?issue=7'});
 const base={number:7,state:'open',title:'t',labels:[{name:'game-chat'}]},shake={body:'<!-- abbies-intake:v1 -->\nReceived',user:{login:'github-actions[bot]'},created_at:'x'};
 assert.equal((await get(base,[])).body.status,'sent');
 assert.equal((await get(base,[shake])).body.status,'received');
 const w=await get(base,[shake,{body:'<!-- m -->Building the pond',user:{login:'evanrobinson2'},created_at:'y'}]);assert.equal(w.body.status,'working');assert.equal(w.body.comments[0].text,'Building the pond');
 assert.equal((await get({...base,state:'closed'},[shake])).body.status,'result');
 assert.equal((await get({number:7,state:'open',title:'t',labels:[{name:'bug'}]},[])).status,404);
});
test('the chosen asset packs ride along as context, cleaned',async()=>{
 const f=gh(),h=createHandler({fetcher:f,env:ENV,who:()=>OWNER});
 await call(h,{body:{message:'Build a farm diorama',packs:{include:['Ranch','Cafe<script>'],exclude:['Zombie survival gear'],allowed:300,of:668}}});
 const b=JSON.parse(f.calls[0].init.body).body;assert.match(b,/include Ranch, Cafescript; exclude Zombie survival gear \(300 of 668/);
});
