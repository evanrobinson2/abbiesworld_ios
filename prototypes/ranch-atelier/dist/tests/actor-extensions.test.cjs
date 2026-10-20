const test=require('node:test'),assert=require('node:assert/strict'),fixture=require('./outbreak-fixture.cjs');
const entries=(a,ap,b,bp)=>[{type:a,preset:ap,seed:41,q:0,r:0},{type:b,preset:bp,seed:63,q:0,r:1}];
test('Temperaments change shared flee decisions; fearless unarmed people still flee',async()=>{
 const {configureActor}=await import('../actor-profiles.mjs'),{chooseActorGoal}=await import('../actor-decisions.mjs'),{world}=await fixture('brooms');const source=Object.values(world.actors).find(a=>a.team==='living'),target=Object.values(world.actors)[0];
 const cautious=configureActor(structuredClone(source),{temperament:'cautious'}),bold=configureActor(structuredClone(source),{temperament:'steadfast'});cautious.hp=bold.hp=source.maxHp*.5;assert.equal(chooseActorGoal(cautious,target,0),'flee');assert.equal(chooseActorGoal(bold,target,0),'engage');bold.weapon=null;configureActor(bold,{temperament:'fearless'});assert.equal(chooseActorGoal(bold,target,0),'flee');
});
test('Variant edits preserve health fraction, resistances, boosts and death without compounding',async()=>{
 const {setActorProfile}=await import('../actor-profiles.mjs'),{strengthen}=await import('../outbreak-simulation.mjs');let {world}=await fixture('brooms');const a=Object.values(world.actors).find(a=>a.team==='living');a.hp=a.maxHp/2;
 world=setActorProfile(world,a.id,{temperament:'natural',variant:'hardy'});const first=world.actors[a.id];assert.equal(first.maxHp,7.5);assert.equal(first.hp,3.75);const again=setActorProfile(world,a.id,{temperament:'natural',variant:'hardy'});assert.deepEqual(again.actors[a.id],first);
 world=strengthen(world,'living');world=setActorProfile(world,a.id,{temperament:'steadfast',variant:'hardy'});assert.equal(world.actors[a.id].maxHp,9.5);
 world.actors[a.id].hp=0;world=setActorProfile(world,a.id,{temperament:'fearless',variant:'fireproof'});assert.equal(world.actors[a.id].hp,0);assert.equal(world.actors[a.id].resistances.fire,1);assert.throws(()=>setActorProfile(world,a.id,{temperament:'invented',variant:'standard'}));
});
test('Conditions recompute from base values once, affect perception and movement, and restore exactly',async()=>{
 const {setWorldConditions}=await import('../world-conditions.mjs'),{setActorProfile}=await import('../actor-profiles.mjs');const {world}=await fixture('brooms'),person=Object.values(world.actors).find(a=>a.team==='living'),zombie=Object.values(world.actors).find(a=>a.team==='undead');
 let night=setWorldConditions(world,{timeOfDay:'night',weather:'fog',season:'winter'});assert.equal(night.actors[person.id].sense,person.sense*.4*.45);assert.equal(night.actors[person.id].speed,person.speed*.75);assert.equal(night.actors[zombie.id].speed,zombie.speed);const twice=setWorldConditions(night,{timeOfDay:'night',weather:'fog',season:'winter'});assert.deepEqual(twice.actors,night.actors);
 night=setActorProfile(night,person.id,{temperament:'natural',variant:'nightborn'});assert.equal(night.actors[person.id].sense,person.sense*.45);night=setActorProfile(night,person.id,{temperament:'natural',variant:'hardy'});assert.equal(night.actors[person.id].speed,person.speed*.9);
 const clear=setWorldConditions(setActorProfile(night,person.id,{temperament:'natural',variant:'standard'}),{timeOfDay:'day',weather:'clear',season:'spring'});assert.equal(clear.actors[person.id].sense,person.sense);assert.equal(clear.actors[person.id].speed,person.speed);assert.throws(()=>setWorldConditions(world,{weather:'acid'}));
});
test('Faction scenarios use actual membership precedence, not scenario-specific attack logic',async()=>{
 const {applyFactionScenario}=await import('../actor-factions.mjs'),{relationship}=await import('../world-relations.mjs'),{affinities}=await import('../world-model.mjs'),site=await fixture('scouts',entries('wizard','circle','wizard','circle'));
 const pair=w=>site.board.instances.map(i=>Object.values(w.actors).filter(a=>a.instanceId===i.instanceId));
 const feud=applyFactionScenario(site.world,site.board,'clans'),[left,right]=pair(feud);assert.deepEqual(affinities(feud,left[0].id,'national'),affinities(feud,right[0].id,'national'));assert.equal(relationship(feud,left[0],right[0]),'hostile');
 const family=applyFactionScenario(site.world,site.board,'divided-family'),[a,b]=pair(family);assert.equal(relationship(family,a[0],b[0]),'allied');assert.equal(relationship(family,a[1],b[1]),'hostile');assert.equal(relationship(family,a[0],b[1]),'hostile');
 const peace=applyFactionScenario(site.world,site.board,'ceasefire');assert.equal(relationship(peace,...pair(peace).map(x=>x[0])),'allied');
});
test('Conditions and profiles persist through spawn, save/load, Undo and deterministic continuation',async()=>{
 const {setWorldConditions}=await import('../world-conditions.mjs'),{setActorProfile}=await import('../actor-profiles.mjs'),{advanceEncounter,spawnActors,syncEncounter}=await import('../outbreak-simulation.mjs'),{compositionHistory}=await import('../board-state.js'),{placeId}=await import('../world-model.mjs');const site=await fixture('brooms');let world=setWorldConditions(site.world,{timeOfDay:'night',weather:'fog',season:'winter'});world=setActorProfile(world,placeId(site.board.instances[1].instanceId),{temperament:'cautious',variant:'hardy'});
 const history=compositionHistory({...site.board,world});const dawn=setWorldConditions(world,{timeOfDay:'dawn'});history.commit({...site.board,revision:site.board.revision+1,world:dawn});assert.deepEqual(history.peek('undo').world.conditions,world.conditions);
 const fresh=spawnActors(world,site.board,site.graph,site.board.instances[1].instanceId,1),spawned=Object.values(fresh.actors).at(-1);assert.equal(spawned.sense,85*.4*.45);
 const midway=advanceEncounter(world,site.graph,2),reload=syncEncounter(JSON.parse(JSON.stringify(midway)),site.board,site.graph);assert.deepEqual(advanceEncounter(reload,site.graph,3),advanceEncounter(world,site.graph,5));
});
test('New generator presets create the advertised actors using the real composition pipeline',async()=>{
 for(const [type,preset,variant,temperament]of [['brains','cautious','scout','cautious'],['brains','guards','hardy','steadfast'],['wizard','fireproof','fireproof','natural'],['rabbits','nocturnal','nightborn','natural']]){const site=await fixture('scouts',entries(type,preset,'zombies','stragglers')),actors=Object.values(site.world.actors).filter(a=>a.instanceId===site.board.instances[0].instanceId);assert(actors.length);assert(actors.every(a=>a.variant===variant&&a.temperament===temperament));}
});
async function linePair(){const {syncEncounter}=await import('../outbreak-simulation.mjs');const graph={signature:'extension-line',nodes:{'a#0':{x:0,y:0,z:0},'a#1':{x:10,y:0,z:0},'b#0':{x:20,y:0,z:0},'b#1':{x:30,y:0,z:0}},adj:{'a#0':[{id:'a#1',cost:10}],'a#1':[{id:'a#0',cost:10},{id:'b#0',cost:10}],'b#0':[{id:'a#1',cost:10},{id:'b#1',cost:10}],'b#1':[{id:'b#0',cost:10}]}};const board={id:'extensions',instances:['a','b'].map(instanceId=>({instanceId,cardId:instanceId,cardRevision:1})),cards:Object.fromEntries(['a','b'].map(id=>[id+'@1',{recipe:{seed:41,agents:{archetype:id==='a'?'wizard':'zombie',count:1}}}]))};const world=syncEncounter({id:board.id,seconds:0,entities:Object.fromEntries(['a','b'].map(id=>['place/'+id,{id:'place/'+id,instanceId:id,kind:'place',active:true,affinities:{}}])),groups:{}},board,graph),[a,b]=Object.values(world.actors);a.position={x:0,y:0,z:0};b.position={x:30,y:0,z:0};a.speed=b.speed=0;b.hp=b.maxHp=50;return {world,graph,a,b};}
test('Fog actually prevents acquisition at long range; fireproof stops live projectile and burn damage',async()=>{
 const {advanceEncounter}=await import('../outbreak-simulation.mjs'),{setWorldConditions}=await import('../world-conditions.mjs'),{setActorProfile}=await import('../actor-profiles.mjs'),{world,graph,a,b}=await linePair();
 const clear=advanceEncounter(world,graph,2);assert(clear.encounter.casts>0);assert(clear.actors[b.id].hp<50);
 const dark=advanceEncounter(setWorldConditions(world,{timeOfDay:'night',weather:'fog'}),graph,2);assert.equal(dark.encounter.casts,0);assert.equal(dark.actors[a.id].targetId,null);
 const immune=advanceEncounter(setActorProfile(world,b.id,{temperament:'natural',variant:'fireproof'}),graph,6);assert(immune.encounter.impacts>0);assert.equal(immune.actors[b.id].hp,50);assert(!immune.actors[b.id].burning);
});
test('Authored faction wars and peace produce different outcomes on real connected terrain',async()=>{
 const {applyFactionScenario}=await import('../actor-factions.mjs'),{advanceEncounter}=await import('../outbreak-simulation.mjs'),site=await fixture('scouts',entries('wizard','circle','wizard','circle'));
 const war=advanceEncounter(applyFactionScenario(site.world,site.board,'nations'),site.graph,240),peace=advanceEncounter(applyFactionScenario(site.world,site.board,'ceasefire'),site.graph,240);assert(war.encounter.casts>0);assert(war.encounter.hits>0);assert.equal(peace.encounter.casts,0);assert.equal(peace.encounter.hits,0);
});
