import {rawTerrain} from './board-terrain.js';

// Explicit recovery only: reproduce the pre-grading saved-board surface.
// This preserves historical apron overlap behavior; it does not certify access.
export function legacyBoardHeight(assembly,seed=41,gradingWarnings=[],relief=1){
 const pads=assembly.plans.flatMap(plan=>plan.placements.map(p=>({x:plan.center.x+p.x,z:plan.center.z+p.z,radius:p.radius})));
 const sample=(x,z)=>{let height=rawTerrain(x,z,seed,relief);for(const p of pads){const d=Math.hypot(x-p.x,z-p.z),v=Math.max(0,Math.min(1,(p.radius+9-d)/9)),blend=v*v*(3-2*v);if(blend)height=height*(1-blend)+rawTerrain(p.x,p.z,seed,relief)*blend;}return height;};
 sample.grading={valid:false,recovery:true,warnings:[...gradingWarnings.map(w=>({...w})),{reason:'Legacy terrain restored for recovery; routes are not certified. Move scenes to a gentler site.'}]};
 return sample;
}
