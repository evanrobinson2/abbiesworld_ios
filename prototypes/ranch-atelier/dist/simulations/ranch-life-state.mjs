import {createResourceState,advanceResources,advanceConsumer,reserveDelivery,collectDelivery,finishDelivery,cancelDelivery} from './simulation/resource-loop.mjs?pickups=1';
// Ranch vocabulary and balancing; mechanics are shared across scene families.
export const RANCH_RESOURCES={
 water:{initialStock:180,initialAtSite:1,stockCapacity:180,replenishRate:.5,refillBelow:5,priority:1.2,carryCapacity:6},
 feed:{initialStock:100,initialAtSite:2,stockCapacity:100,replenishRate:.5,refillBelow:5,priority:1,carryCapacity:6}
};
export const RANCH_NEEDS=[
 {resource:'water',need:'thirst',growth:.002,start:.3,stop:.12,rate:.035,relief:.4},
 {resource:'feed',need:'hunger',growth:.0015,start:.25,stop:.12,rate:.025,relief:.4}
];
export function createCareState(pens,stock={}){
 const sites=pens.map(p=>({...p,capacity:12,animals:Array.from({length:p.count},(_,i)=>({id:p.id+'-'+i,species:p.species,hunger:.35+i*.025,thirst:.4+i*.02,activity:'Exploring'}))}));
 return Object.assign(createResourceState(RANCH_RESOURCES,sites,stock),{pens:sites,foraged:0});
}
export function advanceNeeds(s,dt){
 advanceResources(s,dt);
 for(const p of s.pens)for(const a of p.animals){
  const needs=RANCH_NEEDS.map(n=>({...n,growth:n.growth*(n.resource==='feed'?(s.season?.feed??1):(s.season?.water??1))}));
  const action=advanceConsumer(s,p,a,needs,dt,r=>r==='water'?a.atWater:a.atFeed);
  a.activity='Exploring';
  if(action)a.activity=action.resource==='water'?(action.arrived?'Drinking':'Going to water'):(action.arrived?'Feeding':'Going to feed');
  else if(a.hunger<.25&&a.thirst<.3){if(s.baseline&&(s.season?.grazing??1)>.05&&a.species!=='chicken'&&Math.floor((s.seconds+a.id.length*3)/12)%3!==0){a.activity='Grazing';const intake=Math.min(a.hunger,dt*.003*(s.season?.grazing??1));a.hunger-=intake;s.foraged+=intake;}else a.activity='Resting';}
  else if(a.thirst>.65||a.hunger>.65)a.activity='Waiting for care';
 }
}
// Compatibility keeps the existing renderer/navigation on the same state.
export function reserveJob(s,worker,available){const job=reserveDelivery(s,worker,available);if(job)job.penId=job.siteId;return job;}
export const collect=collectDelivery,deliver=finishDelivery,cancelJob=cancelDelivery;
export function careSummary(s){const animals=s.pens.flatMap(p=>p.animals);return {sites:s.pens.map(p=>({id:p.id,species:p.species,water:p.water,feed:p.feed,animals:p.animals.map(a=>({activity:a.activity,hunger:a.hunger,thirst:a.thirst,atFeed:a.atFeed,atWater:a.atWater}))})),animals:animals.length,waiting:animals.filter(a=>a.activity==='Waiting for care').length,hungry:animals.filter(a=>a.hunger>.65).length,thirsty:animals.filter(a=>a.thirst>.65).length,sheltered:animals.filter(a=>a.atShelter).length,activeJobs:Object.keys(s.activeJobs).length,feed:Math.round(s.stock.feed),water:Math.round(s.stock.water),jobs:s.jobs};}
