import {Vec3} from './actor-state.mjs';
import {stepAnimals} from './ranch-animal-core.mjs';
import {stepPeople} from './ranch-people-core.mjs';
import {createEcologyCore} from './ranch-ecology-core.mjs';
import {advanceNeeds,cancelJob} from '../ranch-life-state.mjs?grazing=4';
import {advanceGenerations,routine,farmhandsNeeded} from '../ranch-generations.mjs?v=6';
import {weatherAt} from '../ranch-rhythm.mjs?v=4';
import {weatherOutlook} from './weather-state.mjs';
import {agendaWindow} from './runtime-scheduling.mjs';
import {storyBudget} from './life-fidelity.mjs';
import {syncHumanStories,compactFamilies,recordActivity} from '../ranch-story-adapter.mjs';
import {relate} from './life-story.mjs';
import {freePoint} from '../ranch-navigation.mjs?collision=2';
// All authoritative updates operate on numeric records. Geometry queries are
// deterministic world services; this module has no renderer or DOM dependency.
export function createRanchCore(context){
 const {state,actors:animalViews,workers,homes,home,places,pens,rng,decisions,poiOccupancy,farmhandProfiles,carryAvailable,obstacles,inBoard,heightAt,outsideEntry,assembly,starterChild,advisors,penMembers,recipe}=context;
 const runtime={animationTime:0,demographyKey:null,storySample:-Infinity};const ecology=createEcologyCore(places,recipe.seed);let notices=[];
 const claimedPlace=w=>['activity-route','activity-doing'].includes(w.phase)?w.agenda?.placeId:null;
 const refreshOccupancy=()=>{poiOccupancy.clear();for(const w of workers)poiOccupancy.set(w.person.id,claimedPlace(w));};
 function syncPeople(){
  const wanted=state.generations.people.filter(p=>p.alive),hour=state.calendar?.hour??12,urgent=state.pens.some(p=>p.animals.some(a=>a.thirst>.55||a.hunger>.55)),shortage=farmhandsNeeded(wanted,hour,pens.reduce((n,p)=>n+p.count,0),urgent,state.calendar?.day??1,state.weather);
  for(let i=0;i<Math.min(8,shortage);i++){const p=structuredClone(farmhandProfiles[i]);Object.assign(p,{id:'farmhand-'+i,age:25+i,homeIndex:i%Math.max(1,homes.length),visiting:true,alive:true,generation:0});wanted.push(p);}
  for(const w of [...workers])if(!wanted.some(p=>p.id===w.person.id)&&!w.person.visiting){cancelJob(state,w.job);workers.splice(workers.indexOf(w),1);poiOccupancy.set(w.person.id,null);decisions.forget(w.person.id);}
  for(const p of wanted){let w=workers.find(w=>w.person.id===p.id);if(w){w.person=p;w.body.userData.person=p;continue;}if(!carryAvailable)continue;
   const dwelling=homes[p.homeIndex]||home,position=freePoint(dwelling?outsideEntry(dwelling):assembly.plans[0].center,.3,obstacles,inBoard,workers.filter(w=>w.body.visible).map(w=>({...w.position,radius:.3})));if(!position)continue;
   w={person:p,position,home:dwelling,job:null,path:[],index:0,phase:'idle',timer:0,body:{position:new Vec3(position.x,heightAt(position.x,position.z),position.z),rotation:{x:0,y:0,z:0},scale:new Vec3(1,1,1),visible:true,userData:{person:p,walkedMetres:0,routeVisits:0}},waterCarry:{visible:false},feedCarry:{visible:false},animation:null};workers.push(w);
  }
  for(const w of workers){w.required=!w.person.visiting||wanted.some(p=>p.id===w.person.id);const p=w.person,scale=p.age<18?.35+.65*p.age/18:1;w.body.scale.set(p.appearance.build*p.appearance.height/1.75*scale,p.appearance.height/1.75*scale,p.appearance.height/1.75*scale);}
 }
 function step(dt,animationDt=dt/6,needsDt=dt){
  if(!Number.isFinite(dt)||dt<0||!Number.isFinite(animationDt)||animationDt<0||!Number.isFinite(needsDt)||needsDt<0)throw new RangeError('Invalid core timestep');
  runtime.animationTime+=animationDt;state.weather=state.weatherOverride&&state.weatherOverride!=='auto'?state.weatherOverride:weatherAt(state.calendar?.day??1,state.season?.index??1,state.calendar?.hour??12,recipe.seed);{const c=state.calendar??{},manual=state.weatherOverride&&state.weatherOverride!=='auto',key=[manual?state.weather:'auto',c.day??1,Math.floor((c.hour??12)*4),state.season?.index??1].join();if(state.weatherFront?.key!==key)state.weatherFront={key,...(manual?{now:state.weather,next:state.weather,inHours:Infinity,front:null}:weatherOutlook(c.day??1,state.season?.index??1,c.hour??12,recipe.seed))};}state.household??={};advanceNeeds(state,needsDt);
  const signature=JSON.stringify([Math.floor(state.calendar?.year??0),state.calendar?.day,agendaWindow(state.calendar?.hour??12),state.weather,state.pens.some(p=>p.animals.some(a=>a.thirst>.55||a.hunger>.55))]);
  if(runtime.demographyKey!==signature){advanceGenerations(state.generations,state.calendar?.day??1,{year:state.calendar?.year,daysPerYear:state.calendar?.daysPerYear??20,capacity:Math.max(12,homes.length*8)});syncPeople();runtime.demographyKey=signature;}
  if(state.seconds-runtime.storySample>storyBudget(state.lifeStories).cadence){runtime.storySample=state.seconds;syncHumanStories(state.lifeStories,state.generations.people,state.calendar?.year??0);compactFamilies(state.generations,state.lifeStories);}
  for(const w of workers){w.animation=null;w.workGesture=null;}
  stepPeople(context,dt,animationDt,runtime.animationTime,needsDt);stepAnimals(context,dt,animationDt);
  for(const w of workers)if(w.person.storyId)recordActivity(state.lifeStories,w.person.storyId,w.body.userData.activity,state.calendar?.year??0);
  for(const v of animalViews){recordActivity(state.lifeStories,v.a.storyId,v.a.activity,state.calendar?.year??0);if(v.a.species==='goat'){const friend=(penMembers.get(v.p)||[]).find(q=>q!==v);if(friend?.a.storyId)relate(state.lifeStories,v.a.storyId,friend.a.storyId,'companion',state.calendar?.year??0);}}
  ecology.step(dt,state);notices=advisors.update(state,workers);
 }
 const poseOwnership=context.poseOwnership;
 return {context,state,workers,actors:animalViews,runtime,ecology,step,syncPeople,notices:()=>notices,
snapshot(){return structuredClone({scheduling:{version:1,rng:rng.snapshot(),animationTime:runtime.animationTime,occupancyVersion:poiOccupancy.version,demographyKey:runtime.demographyKey,layoutVersion:context.layoutVersion,storySample:Number.isFinite(runtime.storySample)?runtime.storySample:null,decisions:decisions.snapshot()},terrainSignature:JSON.stringify([heightAt.seed,assembly.plans.map(p=>p.placements.map(o=>[o.id,o.x,o.z]))]),state,poseOwnership:poseOwnership.snapshot(),ecology:ecology.snapshot(),workers:workers.map(w=>({personId:w.person.id,agenda:w.agenda,activityKey:w.activityKey,activityDone:w.activityDone,activityTimer:w.activityTimer,visible:w.body.visible,position:w.position,destination:w.destination,job:w.job,path:w.path,index:w.index,phase:w.phase,timer:w.timer,rotation:w.body.rotation.y,activity:w.body.userData.activity,walked:w.body.userData.walkedMetres,visits:w.body.userData.routeVisits})),animals:animalViews.map(v=>({id:v.a.id,position:v.body.position.toArray(),rotation:v.body.rotation.y,target:v.target.toArray(),timer:v.timer,phase:v.phase,looseTarget:v.looseTarget,pendingSeconds:v.pendingSeconds}))});},
restore(saved){if(!saved?.state)return;decisions.restore(saved.scheduling?.decisions);rng.restore(saved.scheduling?.rng);runtime.animationTime=saved.scheduling?.animationTime??0;runtime.storySample=saved.scheduling?.storySample??-Infinity;runtime.demographyKey=saved.scheduling?.demographyKey??null;context.layoutVersion=saved.scheduling?.layoutVersion??0;poseOwnership.restore(saved.poseOwnership);ecology.restore(saved.ecology);const pens=state.pens;for(const [key,value]of Object.entries(saved.state))if(key!=='pens'&&key!=='sites')state[key]=structuredClone(value);for(const p of pens){const q=saved.state.pens.find(q=>q.id===p.id);if(!q)continue;const animals=p.animals;Object.assign(p,structuredClone(q));p.animals=animals;for(const a of animals){const savedAnimal=q.animals.find(b=>b.id===a.id);if(savedAnimal){for(const key of Object.keys(a))if(!Object.hasOwn(savedAnimal,key))delete a[key];Object.assign(a,savedAnimal);}}}state.sites=state.pens;if(!saved.state.rhythmVersion&&!state.generations.people.some(p=>p.alive&&p.age>=5&&p.age<18)){starterChild.born=state.generations.year-9;state.generations.people.push(starterChild);}syncPeople();workers.forEach((w,i)=>{const q=saved.workers.find(q=>q.personId===w.person.id)||(!saved.workers[0]?.personId?saved.workers[i]:null);if(!q)return;w.animation=null;w.workGesture=null;w.body.visible=q.visible!==false;Object.assign(w,{agenda:structuredClone(q.agenda),activityKey:q.activityKey,activityDone:q.activityDone,activityTimer:q.activityTimer,position:structuredClone(q.position),destination:q.destination?structuredClone(q.destination):null,job:q.job?.id?state.activeJobs[q.job.id]:q.job,path:structuredClone(q.path),index:q.index,phase:q.phase,timer:q.timer});w.body.rotation.y=q.rotation;w.body.position.set(q.position.x,heightAt(q.position.x,q.position.z),q.position.z);Object.assign(w.body.userData,{activity:q.activity,walkedMetres:q.walked,routeVisits:q.visits});});const pickups=new Set();for(const w of workers){if(w.job?.phase!=='reserved')continue;if(pickups.has(w.job.resource)){cancelJob(state,w.job);w.job=null;w.phase='idle';w.path=[];w.destination=null;}else pickups.add(w.job.resource);}for(const v of animalViews){const q=saved.animals.find(a=>a.id===v.a.id);if(q){v.animation=null;v.body.position.fromArray(q.position);v.pendingSeconds=q.pendingSeconds??0;v.body.rotation.y=q.rotation;v.target.fromArray(q.target);v.timer=q.timer;v.phase=q.phase;v.looseTarget=q.looseTarget?{...q.looseTarget}:undefined;v.safeTargetKey=null;v.safeTargetInput=null;v.safeTargetOutput=null;}}
 if(saved.terrainSignature!==JSON.stringify([heightAt.seed,assembly.plans.map(p=>p.placements.map(o=>[o.id,o.x,o.z]))])){
  for(const w of workers){cancelJob(state,w.job);w.job=null;w.path=[];w.destination=null;w.phase='idle';w.activityKey=null;w.waterCarry.visible=w.feedCarry.visible=false;const q=freePoint(w.home?outsideEntry(w.home):assembly.plans[0].center,.3,obstacles,inBoard,workers.filter(v=>v!==w&&v.body.visible).map(v=>({...v.position,radius:.3})));if(q){w.position=q;w.body.position.set(q.x,heightAt(q.x,q.z),q.z);}else w.body.visible=false;}
 }
 refreshOccupancy();poiOccupancy.restoreVersion(saved.scheduling?.occupancyVersion);
 }
 };
}
