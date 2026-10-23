// One spatial specification drives generated roofs, collision and resting slots.
export const SHELTER_MODELS={cow:'cattle-shelter-complete',horse:'cattle-shelter-complete',goat:'goat-shelter-complete',chicken:'chicken-coop-complete'};
export function habitat(species,count,dimensions,diameter){
 const model=SHELTER_MODELS[species],s=dimensions[model],min=(species==='horse'||species==='cow')?14:species==='goat'?10:8;
 const w=Math.max(Math.min(diameter*.14,min),s.w+2.4),d=Math.max(w*.85,s.d+5);
 return {w,d,shelter:{model,w:s.w,d:s.d,x:0,z:-d/2+s.d/2+.5},count};
}
export function restingPoint(p,index,count,radius){
 const s=p.shelter,columns=Math.max(1,1+Math.floor((s.w-2*radius-.5)/(radius*2+.15)));
 const col=index%columns,row=Math.floor(index/columns),rows=Math.ceil(count/columns);
 return {x:s.x+(col-(Math.min(columns,count)-1)/2)*(radius*2+.15),z:s.z+(row-(rows-1)/2)*(radius*2+.15)};
}
