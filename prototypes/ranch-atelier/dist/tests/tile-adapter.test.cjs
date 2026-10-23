const test=require('node:test'),assert=require('node:assert/strict');
const modules=Promise.all([import('../tile-adapter.js'),import('../tile-board.js')]);
test('all arrangements share exact boundary crossings and keep access clear',async()=>{
 const [m,b]=await modules;
 for(let a=0;a<7;a++)for(let c=0;c<7;c++)for(let d=0;d<7;d++){
  if(new Set([a,c,d]).size!==3)continue;
  const board=b.initialBoard();board.tiles.forEach((t,i)=>t.cell=[a,c,d][i]);const plan=m.planAssembly(board);
  for(const link of plan.links)for(const id of [link.a,link.b]){const p=plan.plans.find(p=>p.id===id),port=p.ports.find(p=>p.neighbor===(id===link.a?link.b:link.a));assert(Math.hypot(p.center.x+port.x-link.point.x,p.center.z+port.z-link.point.z)<1e-8);}
  for(const p of plan.plans){for(const o of p.placements){assert(m.inside(o,o.radius+1));for(const q of p.placements)if(q!==o)assert(Math.hypot(q.x-o.x,q.z-o.z)>q.radius+o.radius+1);}
   for(const path of p.paths)for(let i=1;i<path.points.length;i++)for(const o of p.placements){if(path.to===o.id&&i===path.points.length-1)continue;assert(m.segmentDistance(o,path.points[i-1],path.points[i])>=o.radius+path.width/2-.01,`${p.id}: path intersects ${o.role}`);}
  }
 }
});
test('placement adapts layout, cancellation inputs remain untouched, reconstruction is deterministic',async()=>{
 const [m,b]=await modules,board=b.initialBoard(),before=JSON.stringify(board),first=m.planAssembly(board);assert.equal(JSON.stringify(board),before);assert.deepEqual(m.planAssembly(board),first);assert.equal(first.warnings.length,0);assert.equal(first.components,1);
 b.moveTile(board,'paddock',4);const moved=m.planAssembly(board);assert.notDeepEqual(moved.plans[0].placements,first.plans[0].placements);assert.deepEqual(m.planAssembly(JSON.parse(JSON.stringify(board))),moved);
 board.tiles.forEach((t,i)=>t.cell=[1,3,5][i]);assert.equal(m.planAssembly(board).components,3);assert.equal(m.planAssembly(board).links.length,0);
});
test('new affinity data affects placement; pond stays out of access routes',async()=>{
 const [m,b]=await modules,board=b.initialBoard(),first=m.planAssembly(board);const changed=m.planAssembly(board,{affinities:{...m.AFFINITIES,barn:{crop:10}}});assert.notDeepEqual(first.plans[0].placements[0],changed.plans[0].placements[0]);
 board.tiles[1].type='pond';const p=m.planAssembly(board).plans[1];for(const path of p.paths)for(const o of p.placements)assert(m.segmentDistance(o,...path.points)>=o.radius+1.5);
});
