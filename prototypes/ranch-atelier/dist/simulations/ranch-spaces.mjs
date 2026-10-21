import {SUGAR_SHACK} from './poi/sugar-shack-spec.mjs';
import {goatPlaySpec} from './ranch-play-spec.mjs';
import {habitat} from './ranch-habitat.mjs?cows=1';
export const RANCH_MODELS=['family-home-complete','feed-store-complete','water-point-complete','cattle-shelter-complete','goat-shelter-complete','chicken-coop-complete'];
export function spaceRequirements(dimensions,level,diameter,counts,preset){
 const model=(role,id,label)=>{const d=dimensions[id];return {role,model:id,label,w:d.w,d:d.d,radius:Math.hypot(d.w,d.d)/2,spaceTag:true};};
 const pen=(species,n)=>{const space=habitat(species,n,dimensions,diameter);return {role:'enclosure',label:{cow:'Cow pasture',horse:'Horse paddock',goat:'Goat browse yard',chicken:'Chicken run'}[species],species,...space,...(species==='goat'?{play:goatPlaySpec(counts.goatPlay??1)}:{}),radius:Math.hypot(space.w,space.d)/2,spaceTag:true};};
 const home=[model('home','family-home-complete','Family home'),model('water-source','water-point-complete','Shared water point'),model('store','feed-store-complete','Feed store')];
 const pens=[pen('horse',counts.horses),pen('goat',counts.goats),pen('chicken',counts.chickens),pen('cow',counts.cows??2)].filter(p=>p.count>0);
 const supports=[model('coop','chicken-coop-complete','Chicken coop'),model('shelter','goat-shelter-complete','Goat shelter'),model('stable','cattle-shelter-complete','Horse shelter')];
 const poi={...SUGAR_SHACK};
 const garden={role:'field',label:'Kitchen garden',w:6,d:5,radius:4,spaceTag:true};
 const extra=Array.from({length:Math.max(0,level-1)},()=>model('home','family-home-complete','Family home'));
 return {ranch:[...home,poi,...(preset==='homestead'?pens:[]),garden,...extra,...((counts.playground??1)>0?[{role:'playground',label:'Children’s playground',level:counts.playground??1,w:7*(.8+(counts.playground??1)*.15)+2,d:5.5*(.8+(counts.playground??1)*.15)+2,radius:Math.hypot(7*(.8+(counts.playground??1)*.15)+2,5.5*(.8+(counts.playground??1)*.15)+2)/2}]:[])],paddock:[...pens],crop:[garden,{...garden,label:'Second growing plot'},model('store','feed-store-complete','Garden store')]};
}
export function ranchSiteCost(plan,candidate,req){
 const find=role=>plan.placements.find(p=>p.role===role),distance=p=>Math.hypot(candidate.x-p.x,candidate.z-p.z);
 // Yard proximity dominates decorative radial preferences; each function has a different neighbour.
 let cost=Math.hypot(candidate.x-plan.hub.x,candidate.z-plan.hub.z)*.55;
 const near=(req.role==='field'||req.role==='playground')?find('home'):req.role==='store'?find('water-source'):req.role==='coop'?plan.placements.find(p=>p.species==='chicken'):req.role==='stable'?plan.placements.find(p=>p.species==='horse'):req.role==='shelter'?plan.placements.find(p=>p.species==='goat'):null;
 if(near)cost+=distance(near)*2;
 if(req.role==='enclosure'&&find('home'))cost+=Math.max(0,16-distance(find('home')))*3;
 return cost;
}
