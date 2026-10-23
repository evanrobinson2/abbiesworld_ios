const assert=require('node:assert/strict');const e=require('./dist/engine.js');let valid=0,infeasible=0;
for(const w of [2.8,3.2,4.6,7])for(const d of [2.8,4.2,7])for(const bed of ['single','double','king'])for(const seed of [17,18]){
 const settings={...e.defaults,width:w,depth:d,bed,seed,needs:['desk','reading','storage']},p=e.generate(settings);
 assert.deepEqual(p,e.generate(settings),'deterministic');
 if(!p.items.length){assert(p.omitted.some(x=>x.includes('Bed')));infeasible++;continue;}
 assert(p.checks.reachable);assert(p.checks.doorClear);assert(p.checks.overlapFree);
 for(const a of p.items){assert(a.x>=0&&a.y>=0&&a.x+a.w<=w&&a.y+a.d<=d);}
 for(const a of p.decor)assert(p.items.some(i=>i.id===a.anchor));valid++;
}
const base=e.generate(e.defaults);assert(base.items.some(i=>i.id==='bed'));assert(base.items.some(i=>i.id==='desk'));assert(base.items.some(i=>i.id==='wardrobe'));
const party=e.generate({...e.defaults,extras:['whimsy','party']});assert(party.decor.some(x=>x.kind==='garland'));assert(party.decor.some(x=>x.kind==='stars'));
console.log(JSON.stringify({combinations:valid+infeasible,valid,infeasibleExplicitlyReported:infeasible,checks:['determinism','furniture bounds','door clearance','nonoverlap','entrance reachability','decoration ownership','party and whimsy']}));
