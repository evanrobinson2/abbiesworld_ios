const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function engine(){const c={structuredClone,console,setTimeout};c.importScripts=()=>vm.runInContext(fs.readFileSync(path.join(__dirname,'../property-planner.js'),'utf8'),c);vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(__dirname,'../simulation-worker.js'),'utf8').replace("require('./browser-entry.cjs');","globalThis.sim=require('./sim.cjs');globalThis.ranch=require('./ranch.cjs');globalThis.planner=require('./planner.cjs');globalThis.sceneState=require('./scene-state.cjs');"),c);return c;}
test('precomputed ranch runs preserve layout, replay deterministically and respect finite supplies',async()=>{
 const c=engine(),plan=c.sim.grow({seed:43,size:540,horses:6,mode:'grazing'},8),s=c.ranch.create(plan);
 c.planner.start(s,[{species:'horse',count:6},{species:'cow',count:2},{species:'goat',count:2},{species:'chicken',count:6}]);
 for(let i=0;i<20*8640&&!s.paused;i++)c.ranch.step(s);
 assert.equal(s.paused,null);assert.equal(s.animals.manager.residents.length,16);
 const cp=c.sceneState.checkpoint(s,plan),json=JSON.stringify(cp),copy=JSON.parse(json);
 assert.equal(copy.state.animals.env,undefined);
 const a=await c.sceneState.simulate(copy,{days:1}),b=await c.sceneState.simulate(copy,{days:1});
 assert.equal(a.elapsed,86400);assert.equal(a.paused,null);
 assert.deepEqual(a.frames,b.frames);assert.equal(JSON.stringify(cp),json);
 assert.deepEqual(a.frames[0].buildings,a.frames.at(-1).buildings);
 assert.equal(a.activityLoop.animalSamples.length,145);
 for(const value of Object.values(a.balances))assert(Math.abs(value)<1e-6);
 const finite=await c.sceneState.simulate(copy,{days:7,deliveries:false});
 assert(finite.paused,'Finite supplies should eventually require care');
 assert(finite.elapsed<7*86400);
 assert.deepEqual(finite.initialConditions.state.careLedger.supplied,copy.state.careLedger.supplied);
 assert.equal(finite.initialConditions.state.workers.ledger.delivered,copy.state.workers.ledger.delivered);
 for(const value of Object.values(finite.balances))assert(Math.abs(value)<1e-6);
 const next=await c.sceneState.simulate(a.initialConditions,{days:1});
 assert.equal(next.startSeconds,a.duration);assert.equal(next.duration,a.duration+86400);
 await assert.rejects(()=>c.sceneState.simulate(copy,{days:99}),/Choose one/);
 assert.throws(()=>c.sceneState.restore({...copy,version:9}),/supported/);
 const corrupt=JSON.parse(json);corrupt.state.seconds+=10;assert.throws(()=>c.sceneState.restore(corrupt),/clocks/);
});
