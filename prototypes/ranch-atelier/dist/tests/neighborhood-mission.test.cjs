const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const M=require('../neighborhood-mission.js');
const families=[{id:'a',name:'Orchard family',travelSeconds:600},{id:'b',name:'Meadow family',travelSeconds:600}];
const stock=()=>Object.fromEntries(Object.entries(M.bundle).map(([k,v])=>[k,v*2]));
function fixture(){return {seconds:8*3600,neighborhood:M.create(families,stock()),links:[],workers:{config:{tickSeconds:10},depot:'home',jobs:[{status:'complete'}],careJobs:[],workers:[{id:'jeff',at:'home',path:[],edge:null,task:null,cargo:0}]}};}
const W={route:()=>[],travel:()=>{}};
test('finite bundles transfer once per family; return releases worker; JSON continuation preserves ledger',()=>{
 let s=fixture();for(let i=0;i<80;i++){M.tick(s,W);s.seconds+=10;}
 assert.equal(s.neighborhood.active.phase,'outbound');
 s=JSON.parse(JSON.stringify(s));
 for(let i=0;i<800;i++){M.tick(s,W);s.seconds+=10;}
 assert.equal(M.inspect(s.neighborhood).complete,true);
 for(const f of s.neighborhood.recipients)assert.deepEqual(f.received,M.bundle);
 assert.equal(s.neighborhood.events.filter(e=>e.type==='gifts-delivered').length,2);
 assert(Object.values(M.balance(s.neighborhood)).every(v=>v===0));
 assert.equal(s.workers.workers[0].offsite,false);
 assert.equal(M.tick(s,W).size,0);
});
test('ranch completion, care, resources and routes gate dispatch without consuming stock',()=>{
 for(const block of ['construction','care','stock','route']){
  const s=fixture();if(block==='construction')s.workers.jobs[0].status='planned';
  if(block==='care')s.workers.careJobs=[{enabled:true,target:3,delivered:0,reserved:0}];
  if(block==='stock')s.neighborhood.stock.foal=0;
  const before=JSON.stringify(s.neighborhood.stock);
  assert.equal(M.tick(s,block==='route'?{...W,route:()=>null}:W).size,0);
  assert(s.neighborhood.blocked);assert.equal(JSON.stringify(s.neighborhood.stock),before);
 }
});
test('invalid families and reserve rejected; gifts are reserved before any delivery',()=>{
 assert.throws(()=>M.create([families[0],families[0]],stock()),/unique/);
 assert.throws(()=>M.create([],stock()),/1–24/);
 assert.throws(()=>M.create(families,{foal:-1}),/reserve/);
 const s=fixture();assert.equal(M.tick(s,W).has('jeff'),true);
 assert.equal(s.neighborhood.stock.chicken,3);assert.equal(s.neighborhood.recipients[0].received.chicken,0);
 assert(Object.values(M.balance(s.neighborhood)).every(v=>v===0));
});
test('five families stay locked until quest labor earns each full bundle',()=>{
 const s=fixture();s.neighborhood=M.create(Array.from({length:5},(_,i)=>({id:'family-'+i,name:'Family '+i,travelSeconds:600})),{}, {prepare:true});
 assert.equal(s.neighborhood.recipients.every(f=>f.status==='locked'),true);
 const missing=M.tick(s,W);assert.equal(missing.size,0);assert.match(s.neighborhood.blocked,/horse habitat/);
 s.links=['horse','cow','chicken','goat'].map(species=>({species,admittedAt:1,job:species}));
 s.workers.jobs=[...s.links.map(l=>({id:l.job,at:'home',status:'complete'})),{id:'garden',at:'home',status:'complete'}];
 M.tick(s,W);assert.equal(s.neighborhood.preparing.resource,'foal');assert.equal(s.neighborhood.stock.foal,0);
 // Time and work, not a click, must earn all gifts. Off-shift periods do not add labor.
 for(let i=0;i<20*8640;i++){M.tick(s,W);s.seconds+=10;}
 assert.equal(M.inspect(s.neighborhood).complete,true);
 assert.equal(s.neighborhood.events.filter(e=>e.type==='family-unlocked').length,5);
 assert.deepEqual(s.neighborhood.produced,{foal:5,cow:5,chicken:15,goat:5,wheatSeedKg:50});
 for(const f of s.neighborhood.recipients){const unlocked=s.neighborhood.events.find(e=>e.type==='family-unlocked'&&e.familyId===f.id);assert(unlocked.time<f.deliveredAt);}
 assert(Object.values(M.balance(s.neighborhood)).every(v=>v===0));
});
test('actual ranch engine carries mission through checkpoint, care, simulation and replay',async()=>{
 const root=path.join(__dirname,'..'),c={structuredClone,console,setTimeout};vm.createContext(c);
 c.importScripts=(...files)=>{for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file.replace(/^\//,'')),'utf8'),c);};
 vm.runInContext(fs.readFileSync(path.join(root,'simulation-worker.js'),'utf8').replace("require('./browser-entry.cjs');","globalThis.sim=require('./sim.cjs');globalThis.ranch=require('./ranch.cjs');globalThis.planner=require('./planner.cjs');globalThis.sceneState=require('./scene-state.cjs');"),c);
 const plan=c.sim.grow({seed:43,size:540,horses:6,mode:'grazing'},8),s=c.ranch.create(plan);
 c.planner.start(s,[{species:'horse',count:6},{species:'cow',count:2},{species:'goat',count:2},{species:'chicken',count:6}]);
 for(let i=0;i<20*8640&&!s.paused;i++)c.ranch.step(s);
 assert.equal(s.paused,null);s.neighborhood=c.NeighborhoodMission.create(families,stock());
 const cp=c.sceneState.checkpoint(s,plan),before=JSON.stringify(cp);
 const a=await c.sceneState.simulate(cp,{days:1}),b=await c.sceneState.simulate(cp,{days:1});
 assert.equal(a.neighborhood.delivered,2);assert.equal(a.neighborhood.complete,true);
 assert.deepEqual(a.neighborhood,b.neighborhood);assert.equal(JSON.stringify(cp),before);
 assert(Object.values(a.giftBalances).every(v=>v===0));assert(Object.values(a.balances).every(v=>Math.abs(v)<1e-6));
 assert(a.activityLoop.samples.some(f=>f.workers.some(w=>w.offsite)));
 const next=await c.sceneState.simulate(a.initialConditions,{days:1});
 assert.equal(next.neighborhood.delivered,2);assert.equal(next.events.filter(e=>e.type==='gifts-delivered').length,0);
 const quest=JSON.parse(before);quest.state.neighborhood=c.NeighborhoodMission.create([families[0]],{}, {prepare:true});
 const prepared=await c.sceneState.simulate(quest,{days:7});
 assert.equal(prepared.paused,null);assert.equal(prepared.neighborhood.complete,true);
 assert(prepared.activityLoop.samples.some(f=>f.workers.some(w=>w.activity==='preparing-gift-wheatSeedKg')));
 assert(Object.values(prepared.giftBalances).every(v=>v===0));
 assert(Object.values(prepared.balances).every(v=>Math.abs(v)<1e-6));
});
