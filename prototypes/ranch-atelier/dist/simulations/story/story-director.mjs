import {nominateHero,experience} from '../simulation/life-story.mjs';
import {freePoint} from '../ranch-navigation.mjs?collision=2';
import {STORY_PLACES,STORY_SPECIES} from './story-contract.mjs';
// Casts a validated story onto a running ranch and plays its beats through the ordinary
// people simulation. The director only sets agendas and protections; walking, routing,
// gestures and needs stay the simulation's own. Works on the live runtime and on a headless core.

const ACTION_AGENDA={visit:{text:'Visiting',seconds:6},feed:{text:'Feeding',gesture:true,seconds:7},groom:{text:'Grooming',gesture:true,seconds:8},play:{text:'Playing',gesture:true,seconds:8},garden:{text:'Gardening',gesture:true,seconds:8},'collect-eggs':{text:'Collecting eggs',gesture:true,seconds:7},'pick-apples':{text:'Picking apples',gesture:true,seconds:8},rest:{text:'Resting',seconds:7},celebrate:{text:'Celebrating',gesture:true,seconds:6},shelter:{text:'Heading inside',indoors:true},explore:{text:'Exploring',seconds:8}};
const PLACE_TARGET={home:{role:'home'},garden:{role:'field'},playground:{role:'playground'},store:{role:'store'},well:{role:'water-source'},horses:{species:'horse'},cows:{species:'cow'},goats:{species:'goat'},chickens:{species:'chicken'}};
export const BEAT_TIMEOUT=75,BLOCKED_GRACE=10; // simulation seconds before a stuck beat is skipped rather than blocking the story
const AGE={child:p=>p.age<18,adult:p=>p.age>=18&&p.age<67,elder:p=>p.age>=67,any:()=>true};

// world: {workers, state, places, obstacles, bounds}
export function castStory(story,world){
 const people=world.workers.filter(w=>w.person?.alive!==false),used=new Set(),bindings={},issues=[];
 for(const c of story.cast.filter(c=>c.kind==='person')){
  // Prefer a resident of the right age; the founder child is the natural first hero.
  const ranked=people.filter(w=>!used.has(w)).sort((a,b)=>Number(AGE[c.age](b.person))-Number(AGE[c.age](a.person))||Number(b.person.id==='founder-child'&&c.age==='child')-Number(a.person.id==='founder-child'&&c.age==='child')||Number(!!a.person.visiting)-Number(!!b.person.visiting));
  const w=ranked[0];if(!w){issues.push(`Nobody is free to play ${c.name}.`);continue;}
  used.add(w);bindings[c.id]={kind:'person',worker:w,person:w.person};
 }
 const animals=world.state.pens.flatMap(p=>p.animals.map(a=>({a,pen:p})));
 for(const c of story.cast.filter(c=>c.kind==='animal')){
  const found=animals.find(x=>x.pen.species===c.species&&!Object.values(bindings).some(b=>b.animal===x.a));
  if(!found){issues.push(`There is no ${c.species} for ${c.name} yet.`);continue;}
  bindings[c.id]={kind:'animal',animal:found.a,pen:found.pen};
 }
 return {bindings,issues};
}

// Protections are the story's invariants. Every cast member survives; heroes also keep rich memories.
export function protectCast(story,bindings,state){
 for(const c of story.cast){const b=bindings[c.id];if(!b)continue;const subject=b.person||b.animal;
  subject.storyName=c.name;subject.storyProtected=true;subject.storyHero=c.hero;
  const id=subject.storyId;if(id&&state.lifeStories?.entities[id]){if(c.hero)nominateHero(state.lifeStories,id,true);state.lifeStories.entities[id].label=c.name;}
 }
}
export function releaseCast(bindings){for(const b of Object.values(bindings)){const s=b.person||b.animal;if(!s)continue;delete s.storyAgenda;delete s.storyName;delete s.storyProtected;delete s.storyHero;}}

// Every protected cast member must still be the same living individual.
export function checkInvariants(story,bindings,state){
 const broken=[];
 for(const c of story.cast){const b=bindings[c.id];if(!b)continue;
  if(b.person&&b.person.alive===false)broken.push(`${c.name} must not die.`);
  if(b.animal&&!state.pens.some(p=>p.animals.includes(b.animal)))broken.push(`${c.name} must stay on the ranch.`);
 }
 return broken;
}

export function placeTarget(place,world,stagedProps){
 const prop=stagedProps.find(p=>p.asset===place);if(prop)return {point:prop.visit,label:prop.label};
 const t=PLACE_TARGET[place],found=t&&world.places.find(p=>t.species?p.species===t.species:p.role===t.role);
 return found?{...t,label:found.label||STORY_PLACES[place]}:null;
}

// A spot beside an anchor place that keeps paths and doorways clear; the prop becomes an obstacle.
export function stageProp(prop,world,size=1.4){
 const anchor=world.places.find(p=>{const t=PLACE_TARGET[prop.near];return t&&(t.species?p.species===t.species:p.role===t.role);})||world.places.find(p=>p.role==='home');
 if(!anchor)return null;
 for(let k=0;k<24;k++){
  const angle=(anchor.angle||0)+Math.PI*.5+k*Math.PI/12,reach=(anchor.radius||Math.max(anchor.w||4,anchor.d||4)/2)+2.4;
  const trial={x:anchor.world.x+Math.sin(angle)*reach,z:anchor.world.z+Math.cos(angle)*reach};
  if(world.places.some(p=>Math.hypot(trial.x-p.world.x,trial.z-p.world.z)<(p.radius||Math.max(p.w||4,p.d||4)/2)+1.2))continue;
  const point=freePoint(trial,size/2,world.obstacles,world.bounds);if(!point)continue;
  if(Math.hypot(point.x-trial.x,point.z-trial.z)>1.5)continue;
  const obstacle={x:point.x,z:point.z,radius:size/2,storyProp:true};world.obstacles.push(obstacle);
  const visit=freePoint({x:point.x+Math.sin(angle)*(size/2+.9),z:point.z+Math.cos(angle)*(size/2+.9)},.3,world.obstacles,world.bounds)||point;
  return {asset:prop.asset,near:prop.near,point,visit,angle:angle+Math.PI,obstacle};
 }
 return null;
}
export function unstageProps(world,staged){for(const s of staged){const i=world.obstacles.indexOf(s.obstacle);if(i>=0)world.obstacles.splice(i,1);}}

export function beatAgenda(beat,index,target,names){
 const a=ACTION_AGENDA[beat.action]||ACTION_AGENDA.visit,partner=beat.with&&names[beat.with]?' with '+names[beat.with]:'';
 const text=`${a.text}${partner} · ${target?.label||'nearby'}`.replace(/ · the /,' · ');
 const agenda={id:`story:${index}:${beat.action}`,story:true,text,gesture:!!a.gesture,seconds:a.seconds};
 if(a.indoors)return {...agenda,indoors:true};
 if(target?.point)return {...agenda,point:target.point,label:target.label};
 return {...agenda,...(target?.species?{species:target.species}:{role:target?.role||'home'})};
}

// The beat loop. `world()` returns the live runtime view each tick so a rebuilt board is noticed.
export function createStoryDirector(story,{world,staged=[],onBeat=()=>{},onBeatDone=()=>{},onEnd=()=>{},onIssue=()=>{},setWeather=()=>{},narrating=()=>false}){
 let view=world(),{bindings,issues}=castStory(story,view),index=-1,beatStarted=0,blockedSince=null,finished=false,broken=[];
 protectCast(story,bindings,view.state);for(const issue of issues)onIssue(issue);
 const names=Object.fromEntries(story.cast.map(c=>[c.id,c.name]));
 function start(i){
  index=i;const beat=story.beats[i];if(!beat){finish('complete');return;}
  const b=bindings[beat.who];if(!b?.person){onIssue(`${names[beat.who]||'Someone'} is not on the ranch, so that part is told, not played.`);onBeat(i,beat,null);next(true);return;}
  if(beat.weather)setWeather(beat.weather);
  const target=placeTarget(beat.place,view,staged);
  b.person.storyAgenda=beatAgenda(beat,i,target,names);beatStarted=view.state.seconds;blockedSince=null;
  // A person named in "with" comes along and does the same thing at the same place.
  const partner=bindings[beat.with];if(partner?.person)partner.person.storyAgenda={...beatAgenda(beat,i,target,names),id:`story:${i}:with`,text:beatAgenda({...beat,with:beat.who},i,target,names).text};
  // Clear stale progress so the simulation treats this as a fresh activity.
  for(const x of [b,partner])if(x?.worker&&['activity-route','activity-doing'].includes(x.worker.phase))x.worker.phase='idle';
  onBeat(i,beat,b);
 }
 function next(skipped=false){const beat=story.beats[index],b=bindings[beat?.who];if(bindings[beat?.with]?.person)delete bindings[beat.with].person.storyAgenda;
  if(b?.person){const done=b.person.storyAgenda;delete b.person.storyAgenda;if(b.person.storyId&&view.state.lifeStories?.entities[b.person.storyId])experience(view.state.lifeStories,b.person.storyId,'story',view.state.calendar?.year??0,{activity:beat.line,salience:story.cast.find(c=>c.id===beat.who)?.hero?9:6,other:bindings[beat.with]?.person?.storyId||bindings[beat.with]?.animal?.storyId});if(done)onBeatDone(index,beat,{skipped});}
  start(index+1);
 }
 function beatDone(){const beat=story.beats[index],b=bindings[beat.who],w=b.worker,agenda=b.person.storyAgenda;
  if(agenda.indoors)return w.phase==='offsite';
  return w.activityKey===agenda.id&&w.activityDone;
 }
 function finish(reason){if(finished)return;finished=true;for(const b of Object.values(bindings))if(b.person)delete b.person.storyAgenda;onEnd({reason,broken});}
 return {
  get index(){return index;},get finished(){return finished;},get bindings(){return bindings;},get broken(){return broken;},
  start(){start(0);},
  update(){
   if(finished)return;
   const fresh=world();if(fresh.state!==view.state){finish('board-changed');return;}
   const now=checkInvariants(story,bindings,view.state);if(now.length){broken=now;finish('invariant');return;}
   if(index<0||index>=story.beats.length)return;
   const elapsed=view.state.seconds-beatStarted,actor=bindings[story.beats[index].who]?.worker;
   // The simulation reports an unroutable target as "Route blocked"; give it a moment, then move on.
   if(actor?.body.userData.activity==='Route blocked')blockedSince??=view.state.seconds;else blockedSince=null;
   if(beatDone()&&!narrating())next();
   else if((elapsed>BEAT_TIMEOUT||blockedSince!=null&&view.state.seconds-blockedSince>BLOCKED_GRACE)&&!narrating()){onIssue(`${names[story.beats[index].who]} couldn't get there, so the story skips ahead.`);next(true);}
  },
  stop(){finish('stopped');},
  release(){releaseCast(bindings);unstageProps(view,staged);}
 };
}

export const storySpecies=STORY_SPECIES;
