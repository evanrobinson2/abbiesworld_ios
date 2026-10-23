import {discoverWorksite,seeded} from './worksite-layout.mjs';
import {createCoastSurface,DEFAULT_COAST} from './coast-surface.js';
// Working shore grammar. Coastal trades are visible purposes, not economy grants.
export const SEASIDE_SCENES={seaside:{label:'Seaside',name:'Working shore',presets:{landing:'Fishing landing',salt:'Salt shore',repair:'Boatwright cove'},purpose:'Keep households, shore access, repair, drying, salt work and loading connected on dry ground.',uses:['six simulated residents','illustrative shore workers'],inputs:['catch','brine','timber','rope','food','fuel'],outputs:['preserved catch','salt','repaired boats','loaded cargo'],changes:['drying and seasonal tides are proposed, not simulated'],dependencies:['woodland','food gardens','workshops','inland exchange'],failures:['storm damage','spoiled catch','blocked dry access'],recovery:['repair','clear access','replace spoiled supplies'],capabilities:{housing:6},limitations:['Six residents simulated across the settlement','Fishing, tides, salt production and boat transport are visual only','Coastal capacities, yields and tide ranges are undecided']}};
const item=(asset,x,z,purpose,extra={})=>({asset,x,z,y:0,angle:0,purpose,...extra});
export function seasideRequirements(preset,seed=41){
 if(!SEASIDE_SCENES.seaside.presets[preset])throw Error('Unknown seaside preset');
 const rng=seeded(seed),bend=(rng()-.5)*6,lane=[{x:0,z:-30},{x:bend,z:-20},{x:-bend*.4,z:-4},{x:0,z:8},{x:0,z:26}],items=[],paths=[lane];
 const homeSites=[];
 // Household frontages grow on the dry inland side, near the existing approach.
 for(let i=0;i<3;i++){
  const candidates=[];for(let n=0;n<180;n++){const x=(rng()<.5?-1:1)*(9+rng()*10),z=-21+rng()*23;if(homeSites.some(h=>Math.hypot(x-h.x,z-h.z)<11))continue;const score=Math.hypot(x-bend,z+12)+(homeSites.length?Math.min(...homeSites.map(h=>Math.hypot(x-h.x,z-h.z)))*.3:0)+rng()*2;candidates.push({x,z,score});}
  candidates.sort((a,b)=>a.score-b.score);const {x,z}=candidates[0];homeSites.push({x,z});
  items.push(item('GF-191',x,z,'household shelter'),item('roof',x,z,'pitched coastal weather cover',{y:2.62,size:[6.4,1.4,5.4],roofShape:'gable',roofColor:i===1?'#496e70':'#9e7451'}),item('GF-014',x+4,z+2,'household fresh water'),item('WW-003',x-4,z+2,'stored household fuel'),item('CE-007',x+2,z+4,'illustrative shore household member'));
  const az=z+5.5,segment=lane.findIndex((p,j)=>j<lane.length-1&&p.z<=az&&lane[j+1].z>=az),a=lane[Math.max(0,segment)],b=lane[Math.max(0,segment)+1],lx=a.x+(b.x-a.x)*(az-a.z)/(b.z-a.z);paths.push([{x:lx,z:az},{x,z:az}]);
 }
 // Each work yard has a clear front; the main lane remains unobstructed.
 const dryX=preset==='salt'?-14:14,repairX=-dryX;
 const repair=[item('CE-005',0,0,'boat repair support'),item('CE-006',0,0,'boat hauled out for repair',{y:.55}),item('CE-041',4,0,'caulking work bench'),item('CE-042',4,3,'pitch preparation'),item('CE-050',4,-1,'shipwright tool'),item('CE-004',-3,4,'catch carrying basket')];
 if(preset==='repair')repair.push(item('CE-043',-4,-3,'sail repair frame'));
 const salt=[...Array.from({length:3},(_,i)=>item('CE-001',0,i*3,'brine evaporation bed')),item('CE-027',4,3,'covered dry salt storage'),item('CE-028',4,-1,'salt grading'),item('CE-002',-3,1,'salt gathering tool')];
 for(const [work,x,index]of [[repair,repairX,0],[salt,dryX,1]]){const discovered=discoverWorksite(work,{seed,type:'seaside',preset,index});items.push(...discovered.items.map(o=>({...o,x:o.x+x,z:o.z+13})));paths.push([{x:0,z:26},{x,z:26},{x,z:20}],...discovered.internalPaths.map(p=>p.map(v=>({x:v.x+x,z:v.z+13}))));}
 items.push(item('CE-003',-4,16,'fish drying'),item('CE-003',-4,20,'fish drying'),item('CE-004',-4,23,'catch waiting for processing'),item('CE-007',-4,13,'illustrative fish worker'),item('CE-037',4,16,'cargo staging'),item('CE-040',4,20,'shore cargo haulage'),item('CE-033',4,23,'dry-ground hauling capstan'));
 paths.push([{x:0,z:12},{x:-4,z:12}], [{x:0,z:14},{x:4,z:14}]);
 for(const x of [-10,-7.42,-4.84,-2.26])items.push(item('CE-031',x,29.5,'stone shore edge; no pedestrian crossing',{grounding:'terrain'}));

 return [{role:'seaside',coast:structuredClone(DEFAULT_COAST),w:54,d:48,radius:26,anchor:{x:0,z:-14},hub:{x:0,z:-46},exteriorAccess:{x:0,z:-44},accessScope:'working-entrances',internalPaths:paths,internalPathWidths:paths.map((_,i)=>i===0?2.8:1.4),layout:{version:1,seed,method:'dry shore work zones and growing inland frontages',homeSites},items,purpose:SEASIDE_SCENES.seaside.purpose,index:0}];
}
export function seasideRecipe(preset,seed=41){return {generator:'seaside-composer',version:1,type:'seaside',preset,seed,requirements:seasideRequirements(preset,seed),landscape:{height:0,vegetation:1,props:0,seed:seed^173},tiles:[{id:'seaside',type:'seaside',cell:0,rotation:0,seed}]};}
export function describeSeaside(preset){return SEASIDE_SCENES.seaside.presets[preset]+' brings three shore households onto a shared dry lane, with repair, drying, salt and cargo yards facing the water. Six residents participate in the existing settlement economy; coastal trades remain illustrative and their quantities are undecided.';}

export function seasideSurface(assembly){const surface=createCoastSurface({baseHeightAt:()=>0,coasts:assembly.plans.filter(p=>p.type==='seaside').map(p=>({...DEFAULT_COAST,...p.placements.find(o=>o.role==='seaside')?.coast,id:p.id,center:p.center,rotation:p.rotation||0,waterLevel:-1.2}))});return Object.assign(surface.heightAt,surface);}
