const test=require('node:test'),assert=require('node:assert/strict'),dims=require('./garden-dimensions.json');
test('garden card freezes the shared plan and preserves metre poses through rotations',async()=>{
 const {gardenCardRecipe,applyGardenPlan,levelGardenTerrain}=await import('../garden-adapter.js'),{composeGarden,GARDEN_LAYOUTS}=await import('../garden-farm.js');
 for(const preset of Object.keys(GARDEN_LAYOUTS))for(const beds of [8,12]){
  const r=gardenCardRecipe(preset,41,dims,{beds});assert.deepEqual(r.gardenPlan,composeGarden({layout:preset,seed:41,beds,terrain:'working-surface'},dims,levelGardenTerrain));
  const frozen=JSON.stringify(r),copy=JSON.parse(frozen);
  for(let rotation=0;rotation<6;rotation++){const p={id:'saved',rotation,ports:[],warnings:[]};applyGardenPlan(p,copy);assert.equal(p.placements.length,r.gardenPlan.items.length);for(let i=0;i<p.placements.length;i++){const a=p.placements[i],b=r.gardenPlan.items[i],t=rotation*Math.PI/3;assert(Math.abs(a.x*Math.cos(t)-a.z*Math.sin(t)-b.x)<1e-9);assert(Math.abs(a.x*Math.sin(t)+a.z*Math.cos(t)-b.z)<1e-9);assert.equal(a.w,b.w);assert.equal(a.d,b.d);assert.equal(JSON.stringify(a.gardenItem),JSON.stringify(b));}assert.equal(JSON.stringify(copy),frozen);}
 }
});
test('legacy saved gardens remain placeable without acquiring new capabilities or geometry',async()=>{
 const {sceneTypeForCard,requirePlaceableCard,SCENE_TYPES}=await import('../scene-registry.js'),{domesticRecipe}=await import('../domestic-scenes.js'),{applyGardenPlan,gardenCardRecipe}=await import('../garden-adapter.js');
 const old={recipe:domesticRecipe('garden','kitchen',41),cells:[{}]},before=JSON.stringify(old);assert.equal(sceneTypeForCard(old).version,1);assert.equal(sceneTypeForCard(old).capabilities.garden,12);assert.equal(requirePlaceableCard(old),old);const p={id:'legacy',placements:[{id:'unchanged'}]};assert.equal(applyGardenPlan(p,old.recipe),p);assert.equal(JSON.stringify(old),before);
 const next={recipe:gardenCardRecipe('court',41,dims),cells:[{}]};assert.equal(requirePlaceableCard(next),next);assert.deepEqual(SCENE_TYPES.garden.capabilities,{});assert.equal(SCENE_TYPES.garden.simulation,'planned');assert.equal(sceneTypeForCard({...next,recipe:{...next.recipe,version:3}}),null);
});

 test('serialized working geometry restores without a catalog and does not mutate the source card',async()=>{
 const T=await import('../vendor/three.module.js'),{gardenRenditionItems}=await import('../garden-rendition.js');const root=new T.Group(),item=new T.Group();item.userData.gardenItemId='shed';item.add(new T.Mesh(new T.BoxGeometry(4,3,2),new T.MeshBasicMaterial({color:0x987654})));root.add(item);const saved=JSON.parse(JSON.stringify(root.toJSON())),before=JSON.stringify(saved),restore=gardenRenditionItems(saved),a=restore('shed');a.position.set(80,9,-40);a.rotation.y=Math.PI/3;const b=restore('shed');assert.deepEqual(b.position.toArray(),[0,0,0]);assert.deepEqual(new T.Box3().setFromObject(b).getSize(new T.Vector3()).toArray(),[4,3,2]);assert.equal(b.children[0].material.color.getHex(),0x987654);assert.equal(JSON.stringify(saved),before);assert.throws(()=>restore('missing'),/missing/);
 });

 test('neighbour approaches preserve frozen interiors and avoid working footprints',async()=>{
 const {gardenCardRecipe,applyGardenPlan}=await import('../garden-adapter.js');const r=gardenCardRecipe('court',41,dims),before=JSON.stringify(r);
 for(let rotation=0;rotation<6;rotation++){const p={id:'g',rotation,warnings:[],ports:Array.from({length:6},(_,i)=>({x:43.3012701892*Math.cos(i*Math.PI/3),z:43.3012701892*Math.sin(i*Math.PI/3)}))};applyGardenPlan(p,r);assert.deepEqual(p.warnings,[]);assert.equal(p.paths.filter(r=>r.kind==='connector').length,6);for(const path of p.paths.filter(r=>r.kind==='connector'))for(const point of path.points.slice(0,-1))for(const o of p.placements){const dx=point.x-o.x,dz=point.z-o.z,x=dx*Math.cos(o.angle)-dz*Math.sin(o.angle),z=dx*Math.sin(o.angle)+dz*Math.cos(o.angle);assert(!(Math.abs(x)<o.w/2+.69&&Math.abs(z)<o.d/2+.69));}}
 assert.equal(JSON.stringify(r),before);
 });
