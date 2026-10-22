import {schedule} from '../ranch-rhythm.mjs?v=4';
import {sightseeingAgenda,completeSightseeing,POI_RULES} from '../poi/poi-state.mjs';
import {practice} from './life-learning.mjs';
import {experience} from './life-story.mjs';
import {agendaWindow} from './runtime-scheduling.mjs';
import {avoidStep,freePoint,safeRoute} from '../ranch-navigation.mjs?collision=2';
import {cancelJob,reserveJob,collect,deliver} from '../ranch-life-state.mjs?grazing=4';
import {pickupAvailable} from '../ranch-advisors.mjs';
import {stepDelivery} from './delivery-workflow.mjs';
function animateCorePerson(w,state,distance,dt,heightAt){w.animation={state:{...state},distance,dt};w.body.position.set(w.position.x,heightAt(w.position.x,w.position.z),w.position.z);}
export function stepPeople(context,dt,animationStep,animationTime,needsDt=dt){
 const {state,workers,places,poiPlaces,poiNeighbors,poiOccupancy,decisions,layoutVersion,assembly,inside,obstacles,inBoard,heightAt,source,pens,network,outsideEntry,poseOwnership,bench}=context;
 const humanId=w=>'human:'+w.person.id;const claimedPlace=w=>['activity-route','activity-doing'].includes(w.phase)?w.agenda?.placeId:null;
 function moveHome(w,dt,activity){
  if(w.phase!=='offsite-route'&&w.phase!=='offsite'){cancelJob(state,w.job);w.job=null;w.waterCarry.visible=w.feedCarry.visible=false;if(!setDestination(w,w.home?outsideEntry(w.home):w.position,'offsite-route'))return;}
  if(w.phase==='offsite-route'){const target=w.path[w.index];if(target){const next=avoidStep(w.position,target,dt*4,.3,obstacles,workers.filter(q=>q!==w&&q.body.visible).map(q=>({...q.position,radius:.3})),inBoard);const dx=next.x-w.position.x,dz=next.z-w.position.z,moved=Math.hypot(dx,dz);w.position=next;if(moved)w.body.rotation.y=Math.atan2(dx,dz);animateCorePerson(w,{text:'Walking home'},moved,animationStep,heightAt);if(Math.hypot(target.x-next.x,target.z-next.z)<.1)w.index++;}if(w.index>=w.path.length||w.index===w.path.length-1&&Math.hypot(w.position.x-w.path.at(-1).x,w.position.z-w.path.at(-1).z)<.8){w.phase='offsite';w.body.visible=false;w.destination=null;}}
  w.body.userData.activity=w.phase==='offsite'?activity:'Heading home · '+activity.toLowerCase();
 }
 // A walker whose route just failed waits before planning the same trip again;
 // on large boards every stuck walker otherwise re-plans on every tick.
 function setDestination(w,target,phase){
  const attempt=target.x+','+target.z+','+phase;if(w.failedRoute===attempt&&state.seconds<w.routeRetryAt)return false;
  if(planDestination(w,target,phase)){w.failedRoute=null;return true;}
  w.failedRoute=attempt;w.routeRetryAt=state.seconds+3;return false;
 }
 function planDestination(w,target,phase){
  const endpoint=freePoint(target,.3,obstacles,inBoard,workers.filter(q=>q!==w&&q.body.visible).flatMap(q=>[{...q.position,radius:.4},...(q.destination?[{...q.destination,radius:.4}]:[])]));
  const authored=endpoint&&network.route(w.position,endpoint);
  // Graph endpoints sit on building faces. Stop outside their footprint and include exact access points.
  const points=authored&&authored.slice(1,-1).map(q=>freePoint(q,.3,obstacles,inBoard)).filter(Boolean);
  const path=points&&safeRoute(w.position,[...points,endpoint],.3,obstacles,inBoard);
  if(!path)return false;w.path=path;w.destination=endpoint;w.index=0;w.phase=phase;return true;
 }
 function chooseAgenda(w){
  const calendar=state.calendar??{day:1,hour:12};
  const signature=JSON.stringify([calendar.day,agendaWindow(calendar.hour),state.weather,state.season?.index,w.person.age,w.person.alive,w.person.occupation,w.required,w.phase,w.activityDone,w.person.storyAgenda?.id,w.person.poiVisitDay,w.person.poiUnavailableDay,poiOccupancy.version,layoutVersion]);
  return decisions.read(w.person.id,signature,state.seconds,1.5,()=>{
   let agenda=w.person.visiting?(w.required?{id:'care',text:'Caring for livestock'}:{id:'off-duty',text:'Off duty · visiting farmhand',indoors:true}):schedule(w.person,calendar,state.weather);
   if(agenda.id==='apples'&&state.season?.index!==2)agenda={id:'garden',text:state.season?.index===3?'Tending the compost':'Tending the kitchen garden',role:'field'};
   if(['activity-route','activity-doing'].includes(w.phase)&&!w.activityDone&&w.agenda&&!['rain','hail'].includes(state.weather)&&calendar.hour<21)agenda=w.agenda;
   // A story beat outranks the daily schedule until the story director clears it.
   if(w.person.storyAgenda)agenda=w.person.storyAgenda;
   if(!agenda.indoors&&['social','play'].includes(agenda.id)){
    const poi=poiPlaces.filter(p=>poiOccupancy.count(p.id,w.person.id)<POI_RULES.capacity).sort((a,b)=>Math.hypot(w.position.x-a.entry.x,w.position.z-a.entry.z)-Math.hypot(w.position.x-b.entry.x,w.position.z-b.entry.z))[0];
    const chosen=sightseeingAgenda(w.person,agenda,{...calendar,weather:state.weather,neighbor:!!poi&&poiNeighbors(poi).includes(assembly.plans.find(p=>inside({x:w.position.x-p.center.x,z:w.position.z-p.center.z},0))?.id),available:!!poi});
    if(chosen.id==='sightseeing')agenda={...chosen,placeId:poi.id};
   }
   return agenda;
  });
 }

for(const w of workers){if(poseOwnership.owns(humanId(w)))continue;try{let moved=0;
   w.person.poiWellbeing=Math.max(0,(w.person.poiWellbeing||0)-needsDt*.0005);const agenda=chooseAgenda(w);w.agenda=agenda;const activity=agenda.id==='care'?'Ranch work':agenda.text;
   if(!agenda.indoors&&agenda.id!=='care'&&!w.job){const anchor=agenda.point?{label:agenda.label||"the story spot",role:"story"}:places.find(p=>agenda.placeId?p.id===agenda.placeId:agenda.species?p.species===agenda.species:p.role===agenda.role);if(anchor){if(w.activityKey!==agenda.id){w.phase='idle';w.activityKey=agenda.id;w.activityDone=false;}if(w.phase!=='activity-route'&&w.phase!=='activity-doing'){w.body.visible=true;const seat=agenda.id==='social'?bench:null;const activityPoint=agenda.point?agenda.point:seat?{x:seat.x,z:seat.z+1}:['playground','field'].includes(anchor.role)?{x:anchor.world.x-1,z:anchor.world.z+1.45}:outsideEntry(anchor);if(!setDestination(w,activityPoint,'activity-route')){if(agenda.id==='sightseeing')w.person.poiUnavailableDay=state.calendar?.day??1;w.body.userData.activity='Route blocked';continue;}}if(w.phase==='activity-route'){const target=w.path[w.index];if(target){const next=avoidStep(w.position,target,dt*1.6,.3,obstacles,workers.filter(q=>q!==w&&q.body.visible).map(q=>({...q.position,radius:.3})),inBoard);const dx=next.x-w.position.x,dz=next.z-w.position.z,d=Math.hypot(dx,dz);if(agenda.id==='sightseeing'){w.poiStuck=d<.001?(w.poiStuck||0)+dt:0;if(w.poiStuck>12){w.person.poiUnavailableDay=state.calendar?.day??1;w.phase='idle';w.activityKey=null;w.path=[];w.destination=null;w.poiStuck=0;continue;}}if(d)w.body.rotation.y=Math.atan2(dx,dz);w.position=next;animateCorePerson(w,{text:'Walking'},d,animationStep,heightAt);if(Math.hypot(target.x-next.x,target.z-next.z)<.1)w.index++;}if(w.index>=w.path.length){w.phase='activity-doing';w.activityTimer=0;}}else{w.activityTimer+=dt;animateCorePerson(w,{text:agenda.text,phase:'work'},0,animationStep,heightAt);if((['play','garden','eggs','groom','apples'].includes(agenda.id)||agenda.gesture)){const beat=Math.sin(animationTime*2);w.workGesture={left:-.8+beat*.2,right:-.8-beat*.2,head:.25};}if(w.activityTimer>(agenda.id==='sightseeing'?POI_RULES.visitSeconds:agenda.seconds||6)&&!w.activityDone){if(agenda.id==='sightseeing'){completeSightseeing(state,w.person,state.calendar?.day??1,w.activityTimer,anchor.id);w.body.userData.routeVisits++;}w.activityDone=true;if(!agenda.story)practice(w.person,agenda.id);if(w.person.storyId){experience(state.lifeStories,w.person.storyId,agenda.story?'story':'practice',state.calendar?.year??0,agenda.story?{activity:agenda.text,salience:6}:{activity:agenda.id});state.lifeStories.entities[w.person.storyId].consequences.skills={...w.person.skills};}if(!agenda.story)state.household[agenda.id]=(state.household[agenda.id]||0)+1;}}w.body.userData.activity=w.phase==='activity-route'?'Walking to '+anchor.label.toLowerCase():agenda.text;continue;}}
   if(['activity-route','activity-doing'].includes(w.phase)){w.phase='idle';w.activityKey=null;}

   if(activity!=='Ranch work'&&!w.job){moveHome(w,dt,activity);continue;}
   if(w.phase==='offsite'||w.phase==='offsite-route'){const point=freePoint(w.position,.3,obstacles,inBoard,workers.filter(q=>q!==w&&q.body.visible).map(q=>({...q.position,radius:.3})));if(!point)continue;w.position=point;w.body.visible=true;w.phase='idle';w.destination=null;w.path=[];}

   moved=stepDelivery(w,dt,{
    phases:{destination:"to-pen"},
    reserve:w=>reserveJob(state,w.body.userData.person.id,resource=>pickupAvailable(state,resource)),cancel:job=>cancelJob(state,job),
    collect:job=>collect(state,job),deliver:job=>deliver(state,job),
    source:job=>source[job.resource]&&outsideEntry(source[job.resource]),
    destination:job=>{const pen=pens.find(p=>p.id===job.penId);return pen&&outsideEntry(pen);},
    home:w=>w.home?outsideEntry(w.home):w.position,route:setDestination,
    visit:w=>w.body.userData.routeVisits++,
    move:(w,dt)=>{let moved=0;const target=w.path[w.index];if(target){const next=avoidStep(w.position,target,dt*1.6,.3,obstacles,workers.filter(q=>q!==w&&q.body.visible).map(q=>({...q.position,radius:.3})),inBoard),dx=next.x-w.position.x,dz=next.z-w.position.z;moved=Math.hypot(dx,dz);if(moved>.0001){w.position=next;w.body.rotation.y=Math.atan2(dx,dz);}if(Math.hypot(target.x-w.position.x,target.z-w.position.z)<.08)w.index++;}return {moved,arrived:w.index>=w.path.length};},
    status:(w,event)=>{const water=w.job?.resource==='water',pen=pens.find(p=>p.id===w.job?.penId);w.body.userData.activity=({'to-source':water?'Going to fill a bucket':'Going to collect feed',collect:water?'Filling a bucket':'Loading feed','to-destination':(water?'Carrying water to ':'Carrying feed to ')+(pen?.label.toLowerCase()||'station'),deliver:water?'Pouring water into the trough':'Putting feed out','to-rest':'Returning home for a break',rest:'Resting at the doorstep',blocked:'Route blocked'})[event];}
   });
   if(['to-source','to-pen'].includes(w.phase)&&moved<.001){w.stuckSeconds=(w.stuckSeconds||0)+dt;if(w.stuckSeconds>12){const target=w.destination,phase=w.phase;w.stuckSeconds=0;w.routeRetries=(w.routeRetries||0)+1;if(w.routeRetries>2||!target||!setDestination(w,target,phase)){cancelJob(state,w.job);w.job=null;w.phase='idle';w.path=[];w.destination=null;w.routeRetries=0;}}}else{w.stuckSeconds=0;if(moved>.01)w.routeRetries=0;}
   w.waterCarry.visible=!!w.job?.load&&w.job.resource==='water';w.feedCarry.visible=!!w.job?.load&&w.job.resource==='feed';w.body.userData.walkedMetres+=moved;animateCorePerson(w,{text:w.body.userData.activity},moved,animationStep,heightAt);
  }finally{poiOccupancy.set(w.person.id,claimedPlace(w));}}

}
