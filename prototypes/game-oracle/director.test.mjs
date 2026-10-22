import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {consult,retrieve,normalisePlan,STYLE_IDS,PLAN_SCHEMA} from './lib/director.js';
import {searchKnowledge,getIdentity,steamLibrary,repo} from './lib/knowledge.js';
import {createHandler} from './api/consult.js';
import knowledge from './api/knowledge.js';import steam from './api/steam.js';import mcp from './api/mcp.js';
const fakeRes=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(b){this.body=b;this.code??=200;return this},end(){return this}});
const modelPlan={reading:'A sheep round-up.',title:'Sheep Round-Up',pitch:'Herd the sheep home before sunset.',fantasy:'You are a shepherd.',verbs:['herd','build','call'],
 rules:[{rule:'Sheep walk away from you.',why:'Herding'},{rule:'Fences you build guide them.',why:'Building is the verb'}],goal:'All sheep in the pen.',fail:null,
 beats:[{title:'Morning',what:'Sheep spread out.',player:'Looks'},{title:'Round-up',what:'Herding.',player:'Builds fences'}],
 choices:[{atBeat:1,prompt:'Which gate?',options:[{label:'North',consequence:'Shorter path'},{label:'South',consequence:'Past the pond'}],timerSeconds:null,remembered:null}],
 presentation:{style:'hud',why:'One objective',overlays:['objective'],readAloud:true},
 factory:[{factory:'model',name:'woolly-sheep',brief:'A round woolly sheep',for:'Round-up'},{factory:'sound',name:'baa',brief:'A soft baa',for:'sheep'},{factory:'teleporter',name:'x',brief:'bad',for:'x'}],
 references:[{title:'Dorfromantik',take:'soft goals',leave:'hex-only world'}],kidFit:'Ages 4+'};
let last;
const gateway=(content,status=200)=>async(url,opts)=>{last={url,opts};return {ok:status===200,status,json:async()=>({choices:[{message:{content:typeof content==='string'?content:JSON.stringify(content)}}],usage:{total_tokens:10}}),text:async()=>'err'};};

test('repo knowledge bundle carries identities, Steam profiles and the installed list',()=>{
 assert(repo.identities.length>=5);assert(repo.profiles.length>=4);assert(repo.installed.length>50);
 assert.equal(getIdentity('dorfromantik').record.game.title,'Dorfromantik');assert(getIdentity('1455840').record);assert.equal(getIdentity('nope'),null);
});
test('one search spans identities, studies and styles',()=>{
 const r=searchKnowledge({q:'tile placing countryside quests'});assert.equal(r.results[0].kind,'identity');assert.equal(r.results[0].title,'Dorfromantik');
 assert.equal(searchKnowledge({q:'dialogue choice detective',kinds:['style']}).results[0].id,'telltale');
});
test('steam library joins installed and owned with identity flags',()=>{
 const lib=steamLibrary({});assert(lib.counts.installed>50);const tg=lib.results.find(r=>r.steamAppId==='2198150');assert(tg.installed&&tg.profile);
 assert(steamLibrary({q:'tiny glade'}).results.every(r=>/tiny glade/i.test(r.name)));assert(steamLibrary({installed:true}).results.every(r=>r.installed));
});
test('retrieval suggests a style from the idea and honours an explicit one',()=>{
 assert.equal(retrieve('a bedtime story about a sleepy dragon').style.id,'storybook');assert.equal(retrieve('a bedtime story',{style:'cinema'}).style.id,'cinema');
});
test('without a credential the Oracle answers from its studies, at no cost',async()=>{
 let called=false;const plan=await consult({idea:'build a village that grows when you place houses'},{fetcher:async()=>{called=true;}});
 assert.equal(called,false);assert.equal(plan.schema,PLAN_SCHEMA);assert.equal(plan.source,'studies');assert(plan.rules.length&&plan.beats.length);assert(STYLE_IDS.includes(plan.presentation.style));
});
test('with a credential the model plan is validated and trimmed',async()=>{
 const plan=await consult({idea:'round up the sheep before sunset',audience:'kid'},{fetcher:gateway(modelPlan),credential:{token:'t',method:'oidc'}});
 assert.equal(plan.source,'model');assert.equal(plan.title,'Sheep Round-Up');assert.equal(plan.factory.length,2,'unknown factories are dropped');
 assert.equal(plan.choices[0].options.length,2);assert.equal(plan.presentation.style,'hud');
 const sent=JSON.parse(last.opts.body);assert.equal(sent.messages.length,2);assert.match(sent.messages[1].content,/young children/);
});
test('unusable model output is an error, not a half plan',async()=>{
 await assert.rejects(consult({idea:'anything at all'},{fetcher:gateway('not json'),credential:{token:'t',method:'oidc'}}));
 assert.throws(()=>normalisePlan({title:'x'},{idea:'i',audience:'kid',source:'model',ctx:retrieve('i')}),/missing/);
 await assert.rejects(consult({idea:'x'}),/few words/);await assert.rejects(consult({idea:'a fine idea',style:'opera'}),/style/);
});
test('consult API uses the model only for keyed callers or its own page',async()=>{
 const key='k'.repeat(32),env={ORACLE_KEY:key,VERCEL_OIDC_TOKEN:'oidc'};let calls=0;const fetcher=async(...a)=>{calls++;return gateway(modelPlan)(...a);};
 const h=createHandler({fetcher,env});
 let res=fakeRes();await h({method:'POST',headers:{host:'o.app'},body:{idea:'round up the sheep'}},res);assert.equal(res.body.source,'studies');assert.equal(calls,0);
 res=fakeRes();await h({method:'POST',headers:{host:'o.app','x-oracle-key':key},body:{idea:'round up the sheep'}},res);assert.equal(res.body.source,'model');assert.equal(calls,1);
 res=fakeRes();await h({method:'POST',headers:{host:'o.app','x-oracle-key':'wrong'},body:{idea:'round up the sheep'}},res);assert.equal(res.body.source,'studies');
 res=fakeRes();await h({method:'POST',headers:{host:'o.app',origin:'https://o.app'},body:{idea:'round up the sheep'}},res);assert.equal(res.body.source,'model');
 res=fakeRes();await h({method:'POST',headers:{host:'o.app'},body:{idea:'no'}},res);assert.equal(res.code,400);
 res=fakeRes();await h({method:'GET',headers:{}},res);assert(res.body.styles.includes('telltale'));
 const off=createHandler({fetcher,env:{...env,ORACLE_MODEL_ENABLED:'false'}});res=fakeRes();await off({method:'POST',headers:{host:'o.app','x-oracle-key':key},body:{idea:'round up the sheep'}},res);assert.equal(res.body.source,'studies');
});
test('knowledge and steam endpoints validate input',()=>{
 let res=fakeRes();knowledge({method:'GET',url:'/api/knowledge?q=castle&kinds=bogus'},res);assert.equal(res.code,400);
 res=fakeRes();knowledge({method:'GET',url:'/api/knowledge?identity=tiny-glade'},res);assert.equal(res.body.record.game.title,'Tiny Glade');
 res=fakeRes();steam({method:'GET',url:'/api/steam?installed=maybe'},res);assert.equal(res.code,400);
 res=fakeRes();steam({method:'GET',url:'/api/steam?q=dorfromantik'},res);assert.equal(res.body.results[0].identity,true);
});
test('MCP exposes the Oracle tools; consult without a key is studies-only',async()=>{
 const res=fakeRes();await mcp({method:'POST',headers:{},body:{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'consult_oracle',arguments:{idea:'a treasure hunt on the ranch',audience:'kid'}}}},res);
 assert.equal(JSON.parse(res.body.result.content[0].text).source,'studies');
 await mcp({method:'POST',headers:{},body:{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'get_game_identity',arguments:{id:'besiege'}}}},res);assert.equal(JSON.parse(res.body.result.content[0].text).record.game.title,'Besiege');
});
test('published knowledge contains no machine paths, account ids or secrets',()=>{
 const raw=readFileSync(new URL('./data/repo-knowledge.json',import.meta.url),'utf8');
 assert(!/[A-Z]:\\\\|Users[\\/]|7656119\d{10}|api[_-]?key|Bearer /i.test(raw));
});
