import {commonAffinity} from './world-model.mjs';
import {distance,placeRoute,routeFromPosition} from './world-navigation.mjs';
const active=(w,id)=>w.entities[id]?.active;
const event=(w,text)=>{w.events.unshift({at:w.seconds,text});w.events=w.events.slice(0,30);};
function startTrip(w,g,a,target,route,phase){a.trip={target,points:structuredClone(route.points),next:1,signature:g.signature};a.phase=phase;a.at=null;if(!a.position)a.position=structuredClone(route.points[0]);}
function returnHome(w,g,a){const target=g.hubs[w.entities[a.homeId]?.hub],route=routeFromPosition(g,a.position,target);if(!route){a.trip=null;a.phase='waiting';return false;}startTrip(w,g,a,a.homeId,route,'returning');return true;}
function reserved(w,pid){return Object.values(w.agents).filter(a=>active(w,a.id)&&a.phase==='collecting'&&a.trip?.target===pid).length*2;}
function chooseSupplier(w,g,a){return Object.values(w.entities).filter(e=>e.active&&e.type==='woodland'&&w.inventories[e.id].fuel-reserved(w,e.id)>=2).map(e=>{const r=a.at?placeRoute(w,g,a.at,e.id):routeFromPosition(g,a.position,g.hubs[e.hub]);const ties=commonAffinity(w,a.id,e.id);return {e,r,score:r?r.distance/(1+(w.policy.preferFamiliar?.15:0)*Math.min(3,ties)):Infinity,ties};}).filter(x=>x.r).sort((a,b)=>a.score-b.score||a.e.id.localeCompare(b.e.id))[0];}
function arrive(w,g,a){const target=a.trip.target;a.trip=null;a.at=target;
 if(target===a.homeId){if(a.cargo){w.inventories[target].fuel+=a.cargo;w.delivered+=a.cargo;a.deliveries++;event(w,'Courier delivered '+a.cargo+' fuel to '+w.entities[target].name);a.cargo=0;}a.phase='idle';return;}
 if(active(w,target)&&w.inventories[target]?.fuel>=2){w.inventories[target].fuel-=2;a.cargo=2;event(w,'Collected 2 fuel at '+w.entities[target].name);}returnHome(w,g,a);
}
function tick(w,g){
 w.seconds++;
 for(const [pid,s]of Object.entries(w.inventories)){const e=w.entities[pid];if(!e?.active)continue;if(e.type==='woodland'&&w.seconds%60===0&&s.fuel<24){s.fuel++;s.produced++;w.produced++;}if(e.type==='home'&&w.seconds%120===0&&s.fuel>0){s.fuel--;s.consumed++;w.consumed++;}}
 for(const a of Object.values(w.agents).sort((a,b)=>a.id.localeCompare(b.id))){
  if(!active(w,a.id)||!active(w,a.homeId)){a.trip=null;a.phase='stored';continue;}
  const home=w.entities[a.homeId],homeNode=g.nodes[g.hubs[home.hub]];
  if(a.phase==='idle'&&a.at===a.homeId&&homeNode)a.position=structuredClone(homeNode);
  if(a.trip&&(a.trip.signature!==g.signature||!active(w,a.trip.target))){const destination=a.cargo?a.homeId:a.trip.target,route=active(w,destination)?routeFromPosition(g,a.position,g.hubs[w.entities[destination].hub]):null;if(route)startTrip(w,g,a,destination,route,a.cargo?'returning':'collecting');else {a.trip=null;a.phase='waiting';event(w,'Courier waiting: route changed; cargo stays with the courier');}}
  if(!a.trip){
   if(a.cargo){returnHome(w,g,a);}
   else if(w.inventories[a.homeId].fuel<6){const supplier=chooseSupplier(w,g,a);if(supplier){a.preference=supplier.ties?'Route cost includes shared memberships':'Closest available route';startTrip(w,g,a,supplier.e.id,supplier.r,'collecting');}else a.phase='waiting';}
   else if(a.at!==a.homeId)returnHome(w,g,a);else a.phase='idle';
  }
  if(!a.trip)continue;
  let budget=1.2;
  while(a.trip&&budget>0){const p=a.trip.points[a.trip.next];if(!p){arrive(w,g,a);break;}const len=distance(a.position,p),step=Math.min(budget,len),t=len?step/len:1;a.position={x:a.position.x+(p.x-a.position.x)*t,y:a.position.y+(p.y-a.position.y)*t,z:a.position.z+(p.z-a.position.z)*t};a.metres+=step;budget-=step;if(len<=step+.000001){a.trip.next++;if(a.trip.next>=a.trip.points.length){arrive(w,g,a);break;}}}
 }
}
export function advanceWorld(world,graph,seconds=1){if(!Number.isInteger(seconds)||seconds<1||seconds>3600)throw Error('Advance by 1–3600 whole simulation seconds');const next=structuredClone(world);for(let i=0;i<seconds;i++)tick(next,graph);return next;}
