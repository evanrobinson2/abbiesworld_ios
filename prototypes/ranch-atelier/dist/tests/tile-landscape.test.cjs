const test=require('node:test'),assert=require('node:assert/strict');
test('landscape relief and deterministic dressing preserve routes and structures',async()=>{
 const {initialBoard}=await import('../tile-board.js'),{planAssembly,segmentDistance}=await import('../tile-adapter.js'),{landscapeSettings,terrainSampler,dressingPlan}=await import('../tile-landscape.js');
 const b=initialBoard(),a=planAssembly(b),s=landscapeSettings(b),h=terrainSampler(b,a);
 assert(Math.abs(h(-40,0)-h(40,0))>.5);
 for(const p of a.plans){const items=dressingPlan(p,s);assert(items.length>100);assert.deepEqual(items,dressingPlan(p,s));assert.equal(dressingPlan(p,{...s,vegetation:0,props:0}).length,0);
 for(const d of items){for(const o of p.placements)assert(Math.hypot(d.x-o.x,d.z-o.z)>o.radius+.6);for(const path of p.paths)for(let i=1;i<path.points.length;i++)assert(segmentDistance(d,path.points[i-1],path.points[i])>path.width/2+.6);}
 for(const o of p.placements){const x=p.center.x+o.x,z=p.center.z+o.z;assert(Math.abs(h(x,z)-h(x+.5,z))<1e-8);}
 }
 b.landscape={height:0};const flat=terrainSampler(b,a);assert.equal(flat(20,30),0);
});
