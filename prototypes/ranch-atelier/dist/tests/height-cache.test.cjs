const test=require('node:test'),assert=require('node:assert/strict');
test('height cache keeps exact doubles and signed zero separate, with a strict bound',async()=>{
 const {memoizeHeight}=await import('../height-cache.js');let calls=0;const h=memoizeHeight((x,z)=>{calls++;return Object.is(x,-0)?-7:x+z;},8);
 assert.equal(h(0,1),1);assert.equal(h(-0,1),-7);assert.equal(h(1,2),3);assert.equal(h(1+Number.EPSILON,2),1+Number.EPSILON+2);const count=calls;assert.equal(count,4);h(0,1);h(-0,1);assert.equal(calls,count);
 for(let i=0;i<100;i++){assert.equal(h(i,i),2*i);assert(h.cacheInfo().size<=8);}const before=calls;assert.equal(h(0,1),1);assert.equal(calls,before+1);assert(h.cacheInfo().size<=8);
});
test('new samplers cannot reuse old terrain samples and nonfinite values are never cached',async()=>{
 const {memoizeHeight}=await import('../height-cache.js');let calls=0;const a=memoizeHeight(x=>{calls++;return x;}),b=memoizeHeight(x=>x+1);assert.equal(a(1,0),1);assert.equal(b(1,0),2);a(NaN,0);a(NaN,0);assert.equal(calls,3);assert.equal(a.cacheInfo().size,1);
});
test('actual Board heights and metadata match exactly with or without caching',async()=>{
 const {demoStar}=await import('../scripts/diagnose-access-grades.mjs'),{planComposition}=await import('../board-composition.js'),{boardHeight}=await import('../board-terrain.js');const assembly=planComposition(demoStar(-4,3)).assembly,a=boardHeight(assembly,41,{cache:true}),b=boardHeight(assembly,41,{cache:false});assert.deepEqual(a.grading,b.grading);
 for(let pass=0;pass<2;pass++)for(let i=0;i<20000;i++){const x=-350+150*Math.sin(i*1.71),z=200+150*Math.cos(i*.991);assert.equal(a(x,z),b(x,z));}assert(a.cacheInfo().hits>=20000);const other=boardHeight(assembly,42);assert.notEqual(a(-200,200),other(-200,200));
});
