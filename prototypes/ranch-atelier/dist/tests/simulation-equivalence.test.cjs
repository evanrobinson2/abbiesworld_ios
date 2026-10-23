const test=require('node:test'),assert=require('node:assert/strict'),fixture=require('./outbreak-fixture.cjs');
const entries=(left,lp,right,rp,seed=41)=>[{type:left,preset:lp,seed,q:0,r:0},{type:right,preset:rp,seed:seed+22,q:0,r:1}];
async function modules(){return {current:await import('../outbreak-simulation.mjs'),reference:await import('./reference/encounter-v1.mjs'),relations:await import('../world-relations.mjs'),oldRelations:await import('./reference/relations-v1.mjs'),model:await import('../world-model.mjs')};}
for(const [label,es]of [['unarmed',entries('zombies','stragglers','brains','scouts')],['brooms',entries('zombies','horde','brains','brooms',79)],['wizard',entries('zombies','horde','wizard','apprentice')],['wildlife',entries('rabbits','grove','rabbits','predator',73)],['diplomacy',entries('wizard','circle','wizard','circle')]])test('Exact reference replay: '+label,async()=>{
 const {current,reference,relations,oldRelations,model}=await modules(),site=await fixture('scouts',es);let a=structuredClone(site.world),b=structuredClone(site.world);const originals=JSON.stringify(site.world);
 if(label==='diplomacy')for(const [index,instance]of site.board.instances.entries()){a=model.setAffinities(a,model.placeId(instance.instanceId),'national',['Nation '+index]);b=model.setAffinities(b,model.placeId(instance.instanceId),'national',['Nation '+index]);}
 for(let tick=0;tick<480;tick++){
  if(label==='diplomacy'&&[0,120,200].includes(tick)){const ids=Object.values(a.groups).filter(g=>g.kind==='national').map(g=>g.id),value=tick===120?'allied':'hostile';a=relations.setRelationship(a,...ids,value);b=oldRelations.setRelationship(b,...ids,value);}
  if(tick===80){a=current.strengthen(a,'living');b=reference.strengthen(b,'living');}
  if(tick===100){a=current.equipPeople(a,'broom');b=reference.equipPeople(b,'broom');}
  if(tick===140){const id=site.board.instances[0].instanceId;a=current.spawnActors(a,site.board,site.graph,id,2);b=reference.spawnActors(b,site.board,site.graph,id,2);}
  if(tick===240){a=current.syncEncounter(JSON.parse(JSON.stringify(a)),site.board,site.graph);b=reference.syncEncounter(JSON.parse(JSON.stringify(b)),site.board,site.graph);}
  const before=JSON.stringify(a);a=current.advanceEncounter(a,site.graph,.25);b=reference.advanceEncounter(b,site.graph,.25);assert.deepEqual(a,b,label+' tick '+tick);
  if(tick===0){assert.equal(JSON.stringify(site.world),originals);assert.notEqual(JSON.stringify(a),before);}
 }
});
test('512 actor replay retains every work budget, position, RNG draw and pending route',async()=>{
 const {current,reference}=await modules(),site=await fixture('brooms');let a=site.world;
 for(const instance of site.board.instances){let count=Object.values(a.actors).filter(x=>x.instanceId===instance.instanceId).length;while(count<256){const amount=Math.min(32,256-count);a=current.spawnActors(a,site.board,site.graph,instance.instanceId,amount);count+=amount;}}
 let b=structuredClone(a);for(let tick=0;tick<80;tick++){a=current.advanceEncounter(a,site.graph,.25);b=reference.advanceEncounter(b,site.graph,.25);assert.deepEqual(a,b,'crowd tick '+tick);}
});
test('Shared static branches are immutable; current actors and old Undo checkpoints remain independent',async()=>{
 const {current,reference}=await modules(),site=await fixture('brooms'),{compositionHistory}=await import('../board-state.js'),{compositionHistory:oldHistory}=await import('./reference/board-state-v1.mjs'),{sealWorld}=await import('../world-snapshot.mjs');
 let a=site.world,b=structuredClone(a),ba={...site.board,world:a},bb={...site.board,world:b},ha=compositionHistory(ba),hb=oldHistory(bb);const before=JSON.stringify(a);
 const next=current.advanceEncounter(a,site.graph,.25);assert.equal(next.entities,a.entities);assert(Object.isFrozen(next.entities));assert.notEqual(next.actors,a.actors);assert.equal(JSON.stringify(a),before);
 for(let tick=0;tick<20;tick++){a=sealWorld(current.advanceEncounter(a,site.graph,.25));b=reference.advanceEncounter(b,site.graph,.25);ba={...ba,revision:ba.revision+1,world:a};bb={...bb,revision:bb.revision+1,world:b};const method=tick%4===0?'commit':'checkpoint';ha[method](ba);hb[method](bb);}
 for(const action of ['undo','undo','redo']){const x=ha.peek(action),y=hb.peek(action);assert.deepEqual(x,y);ha.accept(action,x);hb.accept(action,y);}
 assert.equal(JSON.stringify(site.world),before);
});
test('Persistent diplomacy invalidates inherited membership, diet, treaty and reload; retaliation expires live',async()=>{
 const {current,relations,oldRelations,model}=await modules(),{world,graph}=await fixture('brooms');let w=current.advanceEncounter(world,graph,.25);
 const check=()=>{const actors=Object.values(w.actors),resolve=relations.relationResolver(w,actors),old=oldRelations.relationResolver(w,actors);for(const a of actors)for(const b of actors)assert.equal(resolve(a,b),old(a,b),a.id+' / '+b.id);};check();
 for(const [i,p]of Object.values(w.entities).filter(e=>e.kind==='place').entries())w=model.setAffinities(w,p.id,'national',['N'+i]);w=current.advanceEncounter(w,graph,.25);check();
 const ids=Object.values(w.groups).filter(g=>g.kind==='national').map(g=>g.id);for(const state of ['allied','hostile','neutral']){w=relations.setRelationship(w,...ids,state);w=current.advanceEncounter(w,graph,.25);check();}
 const actors=Object.values(w.actors);actors[0].tags=['alien'];actors[0].diet=['human'];check();
 w=JSON.parse(JSON.stringify(w));delete w.relationships;const [a,b]=Object.values(w.actors);a.diet=[];b.diet=[];a.tags=[];b.tags=[];a.attackerId=b.id;a.threatUntil=w.encounter.time+1;check();w=current.advanceEncounter(w,graph,2);check();
});
test('Disconnecting, removing and restoring a real tile matches the reference without teleporting',async()=>{
 const {current,reference,model}=await modules(),site=await fixture('brooms');let a=site.world,b=structuredClone(a);const split={...site.graph,signature:site.graph.signature+'-split',adj:Object.fromEntries(Object.entries(site.graph.adj).map(([key,edges])=>[key,edges.filter(e=>e.id.split('#')[0]===key.split('#')[0])]))};
 for(const graph of [site.graph,split,site.graph]){a=current.advanceEncounter(a,graph,2);b=reference.advanceEncounter(b,graph,2);assert.deepEqual(a,b);}
 for(const board of [{...site.board,instances:site.board.instances.slice(0,1)},site.board]){a=current.syncEncounter(model.syncWorld({...board,world:a},site.assembly),board,site.graph);b=reference.syncEncounter(model.syncWorld({...board,world:b},site.assembly),board,site.graph);a=current.advanceEncounter(a,site.graph,2);b=reference.advanceEncounter(b,site.graph,2);assert.deepEqual(a,b);}
});
