import {hash} from '../town-life/people/core.mjs';
import {POI_RULES} from './sugar-shack-spec.mjs';
export {POI_RULES};
// Hex adjacency is geometric, not the minimum-spanning path graph.
export function neighboringTiles(plans,tileId,radius){const origin=plans.find(p=>p.id===tileId);if(!origin)return [];return plans.filter(p=>p.id!==tileId&&Math.abs(Math.hypot(p.center.x-origin.center.x,p.center.z-origin.center.z)-Math.sqrt(3)*radius)<.1).map(p=>p.id);}
export function sightseeingAgenda(person,agenda,{day=1,hour=12,weather='clear',neighbor=false,available=true}={}){
 if(!available||person.visiting||!person.alive||person.age<5||agenda.indoors||!['social','play'].includes(agenda.id)||hour<9||hour>=19||['rain','hail','snow','heat'].includes(weather)||(person.poiVisitDay===day||person.poiUnavailableDay===day))return agenda;
 const chance=Math.max(.1,POI_RULES.baseInterest+(neighbor?POI_RULES.neighborBonus:0)-(person.poiWellbeing||0)*.3);
 if((hash(person.id+':sugar-shack:'+day)%1000)/1000>=chance)return agenda;
 return {id:'sightseeing',role:'sugar-shack',text:'Sightseeing at the sugar shack'};
}
export function completeSightseeing(state,person,day,elapsed,placeId){
 if(elapsed<POI_RULES.visitSeconds||person.poiVisitDay===day)return false;
 person.poiVisitDay=day;person.poiWellbeing=Math.min(1,(person.poiWellbeing||0)+POI_RULES.visitRelief);
 state.poi??={visits:0};state.poi.visits++;if(placeId){state.poi.byPlace??={};state.poi.byPlace[placeId]=(state.poi.byPlace[placeId]||0)+1;}return true;
}
