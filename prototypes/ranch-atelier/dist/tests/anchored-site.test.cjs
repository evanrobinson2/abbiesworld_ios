const test=require('node:test'),assert=require('node:assert/strict');
const requirement={role:'castle',w:40.4,d:43.6,radius:29.7,anchor:{x:0,z:-3},hub:{x:0,z:35},exteriorAccess:{x:0,z:23},items:[{asset:'castle',x:0,z:0,angle:0}]};
test('anchored landmarks route around their footprint and expose only an exterior access target',async()=>{
 const {planAssembly}=await import('../tile-adapter.js'),{cellWorld,emptyBoard,editBoard}=await import('../playground-model.js'),{resolveAssemblyAccess,resolvedAssemblyObstacles}=await import('../board-resolved-access.js'),{createJoinVerifier}=await import('../board-join-verifier.js');
 for(let rotation=0;rotation<6;rotation++){
  const assembly=planAssembly({tiles:[{id:'hero:castle',type:'castle',center:{x:0,z:0},rotation,seed:118},{id:'neighbor:home',type:'home',center:cellWorld({q:1,r:0}),rotation:0,seed:41}]},{requirementsByType:{castle:[requirement],home:[]}});assert.deepEqual(assembly.warnings,[]);
  const plan=assembly.plans[0],placement=plan.placements[0];assert.equal(placement.accessScope,'exterior-only');assert.equal(plan.paths.find(p=>p.kind==='access').points.at(-1),placement.door);
  let board=emptyBoard('anchored');for(const [id,q]of [['hero',0],['neighbor',1]])board=editBoard(board,'place',{card:{id,revision:1,cells:[{q:0,r:0}],rendition:{meshes:[]},recipe:{tiles:[{id:id==='hero'?'castle':'home',type:id==='hero'?'castle':'home',rotation:0,seed:41}]}},newInstanceId:id,q,r:0});
  const inventory=resolvedAssemblyObstacles(assembly,()=>({kind:'box',w:40.4,d:43.6})),verify=createJoinVerifier({boardId:board.id,boardRevision:board.revision,heightAt:()=>0,contains:()=>true,obstacles:inventory.obstacles,obstaclesComplete:inventory.complete}),access=resolveAssemblyAccess({board,assembly,heightAt:()=>0,verifySegment:verify});
  assert.deepEqual(access.warnings,[]);const port=access.resolvedPortsByInstance.hero.ports[0];assert(port.verified);assert(port.routeEvidence.targets.includes('hero:castle-0:exterior'));assert.equal(port.routeEvidence.targets.length,2);
 }
});
test('incomplete or out-of-bounds anchored requirements fail visibly',async()=>{
 const {planAssembly}=await import('../tile-adapter.js');for(const req of [{...requirement,exteriorAccess:undefined},{...requirement,anchor:{x:40,z:0}},{...requirement,hub:{x:0,z:0}}]){const a=planAssembly({tiles:[{id:'castle',type:'castle',cell:0,rotation:0,seed:1}]},{requirementsByType:{castle:[req]}});assert(a.warnings.length);assert.equal(a.plans[0].placements.length,0);}
});
test('anchored working districts keep their rotation and require every internal street target',async()=>{
 const {planAssembly}=await import('../tile-adapter.js'),{completeDomesticPaths}=await import('../domestic-scenes.js'),{cellWorld,emptyBoard,editBoard}=await import('../playground-model.js'),{resolveAssemblyAccess,resolvedAssemblyObstacles}=await import('../board-resolved-access.js'),{createJoinVerifier}=await import('../board-join-verifier.js');
 const req={role:'district',w:44,d:72,radius:38,anchor:{x:0,z:0},hub:{x:0,z:42},exteriorAccess:{x:0,z:40},accessScope:'working-entrances',internalPaths:[[{x:0,z:40},{x:0,z:0},{x:0,z:-38}],[{x:0,z:0},{x:-8,z:0}]],items:[{asset:'house',x:-12,z:0,angle:0}]};
 for(let rotation=0;rotation<6;rotation++){
  const assembly=completeDomesticPaths(planAssembly({tiles:[{id:'district:district',type:'district',center:{x:0,z:0},rotation,seed:41},{id:'neighbor:home',type:'home',center:cellWorld({q:1,r:0}),rotation:0,seed:41}]},{requirementsByType:{district:[req],home:[]}}));assert.deepEqual(assembly.warnings,[]);assert.equal(assembly.plans[0].placements[0].angle,rotation*Math.PI/3);assert.equal(assembly.plans[0].placements[0].accessScope,'working-entrances');
  let board=emptyBoard('district');for(const [id,q]of [['district',0],['neighbor',1]])board=editBoard(board,'place',{card:{id,revision:1,cells:[{q:0,r:0}],rendition:{meshes:[]},recipe:{tiles:[{id:id==='district'?'district':'home',type:id==='district'?'district':'home',rotation:0,seed:41}]}},newInstanceId:id,q,r:0});
  const inventory=resolvedAssemblyObstacles(assembly,()=>({kind:'box',w:6,d:6})),verify=createJoinVerifier({boardId:board.id,boardRevision:board.revision,heightAt:()=>0,contains:()=>true,obstacles:inventory.obstacles,obstaclesComplete:true}),inspect=()=>resolveAssemblyAccess({board,assembly,heightAt:()=>0,verifySegment:verify});
  const access=inspect();assert.deepEqual(access.warnings,[]);assert(access.resolvedPortsByInstance.district.ports[0].routeEvidence.targets.includes('district:district-0:1'));
  assembly.plans[0].paths=assembly.plans[0].paths.filter(p=>p.kind!=='courtyard');assert(inspect().warnings.some(w=>w.instanceId==='district'));
 }
 const invalid=planAssembly({tiles:[{id:'district',type:'district',cell:0,rotation:0,seed:41}]},{requirementsByType:{district:[{...req,internalPaths:[]}]}});assert(invalid.warnings.length);
});
