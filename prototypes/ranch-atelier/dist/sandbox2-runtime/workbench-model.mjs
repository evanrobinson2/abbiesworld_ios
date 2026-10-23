// A facet is a real generator request, never a decorative footprint template.
export function facetRequests(type,presets,seed,settings={}) {
 const keys=type==='ranch'?['homestead','pasture','working'].filter(k=>k in presets):Object.keys(presets);if(!keys.length)throw Error('Scene needs a preset');
 return Array.from({length:3},(_,i)=>({type,chosen:keys[i%keys.length],variation:((seed+(type==='ranch'?0:i*7919))>>>0)||1,settings:{...settings,...(type==='ranch'?{generatedGrowth:true}:{}),...(type==='town'?{growthStage:[0,1,3][i]}:{})}}));
}
// Seeded accretion: every new parcel attaches to an occupied neighbor.
// Used only for Ranch multi-parcel layouts, whose composer supports these cells.
export function grownCells(cells,count,seed){
 if(count<1||count>cells.length)throw Error('Growth exceeds available cells');
 const selected=[0];let state=seed>>>0;
 const near=(a,b)=>Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r))===1;
 while(selected.length<count){const candidates=cells.map((_,i)=>i).filter(i=>!selected.includes(i)&&selected.some(j=>near(cells[i],cells[j])));if(!candidates.length)throw Error('Disconnected growth domain');state=(Math.imul(state,1664525)+1013904223)>>>0;selected.push(candidates[state%candidates.length]);}
 return selected;
}
// Remember overrides independently for each scene family. Callers receive copies,
// so editing one loaded scene cannot silently mutate another saved configuration.
export function createLoadoutStore(){
 const records=new Map();
 return {
  remember(type,value){records.set(type,structuredClone(value));},
  get(type){return records.has(type)?structuredClone(records.get(type)):null;}
 };
}
