import {setAffinities,placeId,affinities} from './world-model.mjs';
import {setRelationship} from './world-relations.mjs';
export const FACTION_SCENARIOS=Object.freeze({nations:'Two hostile nations',clans:'Rival clans, one nation','divided-family':'Family across enemy borders',alliance:'Allies against the horde',ceasefire:'Two nations at peace'});
export function applyFactionScenario(world,board,scenario){
 if(!FACTION_SCENARIOS[scenario])throw Error('Unknown faction scenario');
 const places=board.instances.map(i=>placeId(i.instanceId)).filter(id=>world.entities[id]?.active);if(places.length<2)throw Error('This scenario needs two scenes');
 let w=world;const membership=(id,kind,name)=>{w=setAffinities(w,id,kind,[name]);return affinities(w,id,kind)[0].groupId;},relate=(a,b,state)=>{w=setRelationship(w,a,b,state);};
 const a=membership(places[0],'national',scenario==='clans'?'Vale Commonwealth':'Ember Court'),b=membership(places[1],'national',scenario==='clans'?'Vale Commonwealth':'River Circle');
 if(scenario==='clans'){const left=membership(places[0],'tribal','Cinder Clan'),right=membership(places[1],'tribal','Reed Clan');relate(left,right,'hostile');}
 else relate(a,b,['alliance','ceasefire'].includes(scenario)?'allied':'hostile');
 if(scenario==='divided-family'){
  const cousins=places.slice(0,2).map(pid=>Object.values(w.actors).find(actor=>w.entities[actor.id]?.parentId===pid));if(cousins.some(x=>!x))throw Error('Each nation needs an actor');
  const left=membership(cousins[0].id,'familial','Willow household west'),right=membership(cousins[1].id,'familial','Willow household east');relate(left,right,'allied');
 }
 if(scenario==='alliance'){if(places.length<3)throw Error('An alliance encounter needs a third scene');const horde=membership(places[2],'national','Ashen Horde');relate(a,horde,'hostile');relate(b,horde,'hostile');}
 w.encounter.events.unshift({at:w.encounter.time,text:FACTION_SCENARIOS[scenario]+'. Explicit relationships are active.'});w.encounter.events=w.encounter.events.slice(0,25);return w;
}
