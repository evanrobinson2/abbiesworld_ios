const {performance}=require('node:perf_hooks'),fs=require('node:fs');
(async()=>{
 const fixture=require('../tests/outbreak-fixture.cjs'),fast=await import('../outbreak-simulation.mjs'),old=await import('../tests/reference/encounter-v1.mjs');const base=await fixture('brooms'),results=[];
 for(const count of [32,96,256,512]){
  let world=structuredClone(base.world);for(const i of base.board.instances){let n=Object.values(world.actors).filter(a=>a.instanceId===i.instanceId).length;while(n<count/2){const k=Math.min(32,count/2-n);world=fast.spawnActors(world,base.board,base.graph,i.instanceId,k);n+=k;}}
  const run=sim=>{let w=structuredClone(world);const start=performance.now();for(let t=0;t<40;t++)w=sim.advanceEncounter(w,base.graph,.25);return (performance.now()-start)/40;};run(old);run(fast);const samples={before:[],after:[]};for(let trial=0;trial<7;trial++)for(const name of trial%2?['after','before']:['before','after'])samples[name].push(run(name==='before'?old:fast));const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)],before=median(samples.before),after=median(samples.after);results.push({actors:count,beforeMsPerTick:before,afterMsPerTick:after,improvementPercent:(1-after/before)*100,samples});
 }
 const report={method:'Same generated connected terrain; 40 quarter-second ticks per trial, warmup then 7 interleaved trials; median CPU time. Identical decision/path budgets and actor fidelity. Excludes rendering, save and UI.',node:process.version,results};console.log(JSON.stringify(report,null,2));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2));
})();
