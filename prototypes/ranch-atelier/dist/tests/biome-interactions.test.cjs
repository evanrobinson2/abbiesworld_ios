const test=require('node:test'),assert=require('node:assert/strict');
const card=(id,cells=[{q:0,r:0}])=>({id,revision:1,cells,rendition:{meshes:[]}});
test('drop swaps occupied compositions atomically and supports undo',async()=>{
 const {editComposition,resolveDrop,compositionHistory}=await import('../board-state.js'),{emptyBoard}=await import('../playground-model.js');
 let b=editComposition(emptyBoard('test'),'place',{card:card('a'),newInstanceId:'a',q:0,r:0});b=editComposition(b,'place',{card:card('b'),newInstanceId:'b',q:2,r:0});
 const before=JSON.stringify(b),history=compositionHistory(b),drop=resolveDrop(b,{selected:'a',q:2,r:0});assert.equal(drop.action,'swap');const next=editComposition(b,drop.action,drop.args);
 assert.equal(next.instances.find(i=>i.instanceId==='a').q,2);assert.equal(next.instances.find(i=>i.instanceId==='b').q,0);assert.equal(JSON.stringify(b),before);
 history.commit(next);assert.equal(history.peek('undo').instances[0].q,0);
});
test('new scene replaces one target; mismatched footprints cannot displace neighbors',async()=>{
 const {editComposition,resolveDrop}=await import('../board-state.js'),{emptyBoard}=await import('../playground-model.js');
 let b=editComposition(emptyBoard('test'),'place',{card:card('a'),newInstanceId:'a',q:0,r:0});b=editComposition(b,'place',{card:card('b'),newInstanceId:'b',q:1,r:0});
 const replacement=card('c'),drop=resolveDrop(b,{card:replacement,q:0,r:0,newInstanceId:'c'});const next=editComposition(b,drop.action,drop.args);assert.equal(next.instances.length,2);assert.equal(next.cards['c@1'],replacement);assert(!next.instances.some(i=>i.instanceId==='a'));
 const before=JSON.stringify(b),bad=resolveDrop(b,{card:card('wide',[{q:0,r:0},{q:1,r:0}]),q:0,r:0});assert.throws(()=>editComposition(b,bad.action,bad.args),/overlap/);assert.equal(JSON.stringify(b),before);
});
test('trackpad scroll orbits, pinch zooms and Shift pans without changing scene scale',async()=>{
 const T=await import('../vendor/three.module.js'),{trackpadOrbit}=await import('../trackpad-orbit.js'),camera=new T.PerspectiveCamera();camera.position.set(15,15,15);const orbit={target:new T.Vector3(),minDistance:2,maxDistance:100,maxPolarAngle:Math.PI*.47,update(){camera.lookAt(this.target);}};orbit.update();
 const initial=camera.position.clone(),distance=initial.length();trackpadOrbit(T,camera,orbit,{deltaX:15,deltaY:10,deltaMode:0});assert(camera.position.distanceTo(initial)>1);assert(Math.abs(camera.position.length()-distance)<1e-8);
 trackpadOrbit(T,camera,orbit,{deltaX:0,deltaY:-10,deltaMode:0,ctrlKey:true});assert(camera.position.length()<distance);
 const oldOffset=camera.position.clone().sub(orbit.target);trackpadOrbit(T,camera,orbit,{deltaX:10,deltaY:5,deltaMode:0,shiftKey:true});assert(orbit.target.length()>0);assert(camera.position.clone().sub(orbit.target).distanceTo(oldOffset)<1e-8);
});
test('Market presets are placeable static scenes with known local assets',async()=>{
 const {domesticRecipe,DOMESTIC_SCENES}=await import('../domestic-scenes.js'),{sceneTypeForCard}=await import('../scene-registry.js'),fs=require('node:fs'),path=require('node:path');const index=JSON.parse(fs.readFileSync(path.join(__dirname,'../domestic-assets/index.json')));
 for(const preset of Object.keys(DOMESTIC_SCENES.market.presets)){const recipe=domesticRecipe('market',preset,41);assert.equal(sceneTypeForCard({recipe}).id,'market');assert(recipe.requirements.length>=2);for(const req of recipe.requirements)for(const item of req.items)assert(index[item.asset],item.asset+' exists');}
 assert.deepEqual(DOMESTIC_SCENES.market.capabilities,{});
});
