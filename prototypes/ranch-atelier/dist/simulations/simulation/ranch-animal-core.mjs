import {renewAnimal} from '../ranch-ecology-state.mjs?v=2';
import {animalSchedule} from '../ranch-rhythm.mjs?v=4';
import {playHeight} from '../ranch-play-spec.mjs';
import {avoidStep,avoidStepWithPeers,nearbyPeers,freePoint,clearSegment} from '../ranch-navigation.mjs?collision=2';
import {worldToPen} from './actor-state.mjs';
import {stormNear} from './weather-state.mjs';
// Identical state transition is used by the visible adapter and headless tests.
export function stepAnimals(context,stepSeconds,animationSeconds){
 const {state,actors:animalViews,workers,rng,animalRadius,penObstacles,inPen,inBoard,obstacles,heightAt,penMembers,station,layoutVersion,poseOwnership,compiled}=context;
 const animalId=v=>'animal:'+v.a.id;
 const penStep=(position,target,step,r,obs,peers,p)=>compiled?.step(position,target,step,r,obs,peers,p)??avoidStepWithPeers(position,target,step,r,obs,peers,inPen(p));
for(const v of animalViews){v.peer.x=v.body.position.x;v.peer.z=v.body.position.z;}for(const v of animalViews){let dt=stepSeconds,animationStep=animationSeconds;if(poseOwnership.owns(animalId(v))){v.a.atWater=v.a.atFeed=v.a.atShelter=false;continue;}const {body,a,p}=v;v.adultScale??=body.scale.clone();body.scale.copy(v.adultScale).multiplyScalar(renewAnimal(a,state.calendar?.year??0,state.lifeStories)*(a.traits?.size??1));if(v.detail==='coarse'&&!a.loose){v.pendingSeconds+=dt;if(v.pendingSeconds<1.2){v.animation={distance:0,dt:0,activity:a.activity};continue;}dt=v.pendingSeconds;v.pendingSeconds=0;}else if(v.pendingSeconds){dt+=v.pendingSeconds;v.pendingSeconds=0;}if(a.loose){const q={x:a.loose.x,z:a.loose.z},r=animalRadius[a.species];v.timer-=dt;if(v.timer<=0||!v.looseTarget){v.looseTarget=freePoint({x:q.x+(rng()-.5)*4,z:q.z+(rng()-.5)*4},r,obstacles,inBoard)||q;v.timer=4+rng()*4;}const next=avoidStep(q,v.looseTarget,Math.min(.2,dt*.45),r,obstacles,workers.filter(w=>w.body.visible).map(w=>({...w.position,radius:.3})),inBoard),moved=Math.hypot(next.x-q.x,next.z-q.z);a.loose={x:next.x,z:next.z};body.position.copy(worldToPen(p,next,heightAt));if(moved>.0001){const desired=Math.atan2(q.z-next.z,next.x-q.x);body.rotation.y=desired-p.angle;}a.atWater=a.atFeed=a.atShelter=false;a.activity='Exploring the ranch';v.peer.x=body.position.x;v.peer.z=body.position.z;v.animation={distance:moved,dt:animationStep,activity:a.activity};continue;}v.phase+=dt;v.timer-=dt;const routine=animalSchedule(a.species,state.calendar?.hour??12);if(!a.intent&&a.thirst<.65&&a.hunger<.65){if(routine==='Roosting'||routine==='Resting'||['heat','rain','hail','snow'].includes(state.weather)||stormNear(state.weatherFront))a.activity='Resting';else if(routine==='Feeding')a.activity='Going to feed';else if(routine==='Climbing'&&p.play){a.activity='Climbing';v.target.set(Math.sin(v.slot)*p.play.length*.3,0);v.timer=4;}else if(routine==='Scratching')a.activity='Scratching';}const drinking=a.activity==='Drinking'||a.activity==='Going to water',feeding=a.activity==='Feeding'||a.activity==='Going to feed';if(drinking||feeding){const spot=station(p,drinking?'water':'feed');v.target.set(spot.x+v.slot,spot.z-((a.species==='horse'||a.species==='cow')?1.2:a.species==='goat'?.9:.72));}else if(a.activity==='Resting'&&p.shelter){v.target.set(v.rest.x,v.rest.z);}else if(a.activity==='Climbing'){}else if(v.timer<=0){v.target.set((rng()-.5)*(p.w-4),(rng()-.5)*(p.d-4));v.timer=4+rng()*5;if(a.species==='goat'){const friend=(penMembers.get(p)||[]).find(q=>q!==v);if(friend)v.target.set(friend.body.position.x+.8,friend.body.position.z+.8);}}
   if(a.species==='chicken'&&a.activity==='Scratching'){const passer=workers.find(w=>w.body.visible&&Math.hypot(w.position.x-p.world.x,w.position.z-p.world.z)<p.radius+1);if(passer){v.target.set(-Math.sign(passer.position.x-p.world.x)*(p.w/2-2),-Math.sign(passer.position.z-p.world.z)*(p.d/2-2));a.activity='Scattering';}}

   if(a.species==='horse'&&!drinking&&!feeding){const caretaker=workers.find(w=>w.agenda?.id==='groom'&&w.phase==='activity-doing');if(caretaker&&Math.hypot(caretaker.position.x-p.world.x,caretaker.position.z-p.world.z)<p.radius+3){v.target.set(0,p.d/2-1.4);a.activity='Approaching caretaker';}}
   const targetKey=v.target.x+':'+v.target.y+':'+layoutVersion;
   if(v.safeTargetInput!==targetKey&&v.safeTargetKey!==targetKey){v.safeTargetInput=targetKey;const safeTarget=freePoint({x:v.target.x,z:v.target.y},animalRadius[a.species],penObstacles(p),inPen(p));if(safeTarget)v.target.set(safeTarget.x,safeTarget.z);v.safeTargetKey=v.target.x+':'+v.target.y+':'+layoutVersion;v.safeTargetOutput={x:v.target.x,z:v.target.y};}else if(v.safeTargetOutput)v.target.set(v.safeTargetOutput.x,v.safeTargetOutput.z);
   const dx=v.target.x-body.position.x,dz=v.target.y-body.position.z,d=Math.hypot(dx,dz),speed=(a.species==='cow'?.55:a.species==='horse'?.9:a.species==='goat'?.65:.45)*(a.traits?.pace??1);
   let travelled=0;
   if(d>.18&&a.activity!=='Grazing'){
    const position={x:body.position.x,z:body.position.z},peers=nearbyPeers(position,Math.max(.65,Math.abs(dt*speed)),animalRadius[a.species],v.peers);
    const ahead=penStep(position,{x:v.target.x,z:v.target.y},Math.min(.65,d),animalRadius[a.species],penObstacles(p),peers,p);
    const desired=Math.hypot(ahead.x-position.x,ahead.z-position.z)>.001?Math.atan2(position.z-ahead.z,ahead.x-position.x):body.rotation.y,delta=Math.atan2(Math.sin(desired-body.rotation.y),Math.cos(desired-body.rotation.y));
    body.rotation.y+=Math.max(-dt*3,Math.min(dt*3,delta));
    // Turn first, then advance in the direction the nose faces.
    const aligned=Math.max(0,Math.cos(delta)),step=Math.min(d-.18,dt*speed*aligned);
    const candidate={x:body.position.x+Math.cos(body.rotation.y)*step,z:body.position.z-Math.sin(body.rotation.y)*step};
    if(clearSegment(position,candidate,animalRadius[a.species],[...penObstacles(p),...peers],inPen(p))){travelled=Math.hypot(candidate.x-position.x,candidate.z-position.z);body.position.x=candidate.x;body.position.z=candidate.z;}

   }
   v.peer.x=body.position.x;v.peer.z=body.position.z;body.position.y=playHeight(p.play,body.position.x,body.position.z);const arrived=Math.hypot(v.target.x-body.position.x,v.target.y-body.position.z)<.4;
   if(arrived&&(drinking||feeding)){const delta=Math.atan2(Math.sin(-Math.PI/2-body.rotation.y),Math.cos(-Math.PI/2-body.rotation.y));body.rotation.y+=Math.max(-dt*3,Math.min(dt*3,delta));}a.atWater=drinking&&arrived;a.atFeed=feeding&&arrived;a.atShelter=a.activity==='Resting'&&arrived;if(a.activity==='Resting'&&!arrived)a.activity='Going to shelter';
   v.animation={distance:travelled,dt:animationStep,activity:arrived?(drinking?'Drinking':feeding?'Feeding':a.activity):a.activity};

  }

}
