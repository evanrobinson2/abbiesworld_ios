import {createIndividual,experience,relate} from '../simulation/life-story.mjs';
import {safeRoute,freePoint} from '../ranch-navigation.mjs';
import {hexBounds} from '../simulation/spatial-bounds.mjs';
import {slopeAt} from '../new-england-terrain.mjs';
export function rocketPhase(seconds){
 const t=((seconds%180)+180)%180;
 // Exchange occurs at touchdown, at each month boundary. The opening ship is already docked.
 if(t>=164){const q=(180-t)/16;return {phase:'descending',altitude:38*q*q,thrust:.4+.6*q,progress:1-q};}
 if(t<22)return {phase:'docked',altitude:0,thrust:0,progress:t/22};
 if(t<38){const q=(t-22)/16;return {phase:'ascending',altitude:38*q*q,thrust:1,progress:q};}
 return {phase:'in-transit',altitude:38,thrust:0,progress:(t-38)/126};
}
export function initializeColony(state,plan){
 if(state.colony)return;
 state.colony={families:[{id:'selene',name:'Selene',home:'family-a'},{id:'kepler',name:'Kepler',home:'family-b'}],residents:[],completed:{}};
 for(const [f,family] of state.colony.families.entries())for(let i=0;i<3;i++){
  const id=`colonist-${f}-${i}`,names=[['Lea','Omar','Pip'],['Mae','Ivo','Nia']],home=plan.placements.find(p=>p.id===family.home),parents=i===2?[`colonist-${f}-0`,`colonist-${f}-1`]:[];
  createIndividual(state.lifeStories,{id,type:'human',label:names[f][i],generation:i===2?2:1,origin:{kind:parents.length?'family-lineage':'arrival',sources:parents},traits:{curiosity:.35+(f*3+i)*.1},capabilities:i===2?['learn','socialize']:['research','maintenance','socialize']});
  for(const parent of parents){relate(state.lifeStories,id,parent,'parent',state.seconds);relate(state.lifeStories,parent,id,'child',state.seconds);}
  state.colony.residents.push({id,name:names[f][i],family:family.id,child:i===2,home:family.home,position:{x:home.x+(i-1)*.6,z:home.z+4},phase:'resting',activity:'At family quarters',path:[],index:0,wait:i*2,visits:0,heading:0});
 }
}
const routeContexts=new WeakMap();
export function advanceColony(state,plan,dt){
 let context=routeContexts.get(plan);if(!context){const contains=hexBounds(plan.radius),samples=new Map();context={obstacles:plan.placements.map(p=>({...p})),bounds:(p,r)=>{if(!contains(p,r))return false;const key=p.x.toFixed(3)+','+p.z.toFixed(3);if(!samples.has(key)){if(samples.size>20000)samples.clear();samples.set(key,slopeAt(plan.heightAt,p.x,p.z)<.3);}return samples.get(key);}};routeContexts.set(plan,context);}const {bounds,obstacles}=context;
 for(const [residentIndex,person] of state.colony.residents.entries()){
  const vip=state.rocket.vip,welcome=vip&&['waiting-for-pad','descending','disembarking','greeting','celebrating'].includes(vip.phase);
  if(welcome&&person.welcomeAttempt!==vip.id){
   const entry=vip.boarding.at(-1),target={x:entry.x+2.2+(residentIndex%2)*.8,z:entry.z+(Math.floor(residentIndex/2)-1)*1.5};
   person.welcomeAttempt=vip.id;const accessible=freePoint(target,.3,obstacles,bounds);const route=accessible&&safeRoute(person.position,[accessible],.3,obstacles,bounds);
   if(route){person.path=route;person.index=0;person.phase='walking';person.nextActivity='Welcoming the VIP visitors';person.activity='Walking to welcome the VIPs';person.welcomeVisit=vip.id;}
  }
  if(welcome&&person.welcomeVisit===vip.id&&person.phase!=='walking'){
   person.phase='welcoming';person.activity=vip.phase==='celebrating'?'Cheering for the VIP visitors':'Waiting to greet the VIP visitors';person.heading=Math.atan2(vip.people[0].position.x-person.position.x,vip.people[0].position.z-person.position.z);continue;
  }
  if(!welcome&&person.phase==='welcoming'){person.phase='activity';person.wait=1;person.activity='Returning to daily life';}

  if(person.phase==='walking'){
   let remaining=dt*(person.child?.75:1.05);
   while(remaining>0&&person.index<person.path.length){const p=person.path[person.index],dx=p.x-person.position.x,dz=p.z-person.position.z,d=Math.hypot(dx,dz),step=Math.min(d,remaining);if(d){person.heading=Math.atan2(dx,dz);person.position.x+=dx/d*step;person.position.z+=dz/d*step;}remaining-=step;if(d<=step)person.index++;else break;}
   if(person.index===person.path.length){person.phase='activity';person.wait=12;person.activity=person.nextActivity;person.visits++;state.colony.completed[person.activity]=(state.colony.completed[person.activity]||0)+1;experience(state.lifeStories,person.id,'daily-activity',state.seconds,{activity:person.activity});}
   continue;
  }
  person.wait-=dt;if(person.wait>0)continue;
  const phase=Math.floor(state.seconds/45)%4;
  const targetId=phase===0?person.home:phase===1?(person.child?'habitat':'lab'):phase===2?(person.child?'habitat':'workshop'):person.home;
  const place=plan.placements.find(p=>p.id===targetId),target={x:place.x,z:place.z+place.radius+1};
  const route=safeRoute(person.position,[target],.3,obstacles,bounds);
  if(!route){person.phase='blocked';person.activity='Route blocked';person.wait=8;continue;}
  person.path=route;person.index=0;person.phase='walking';person.nextActivity=phase===0||phase===3?'Family time':person.child?'Learning at community dome':phase===1?'Research shift':'Equipment inspection';person.activity='Walking · '+person.nextActivity;
 }
}
