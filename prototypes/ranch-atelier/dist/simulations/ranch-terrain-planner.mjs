import {restoreTerrain,terrainRecord} from './board-terrain.mjs';
import {boardBounds} from './simulation/spatial-bounds.mjs';
import {planAssembly,inside} from './tile-adapter.js';
import {newEnglandTerrain,assessRanchTerrain,slopeAt} from './new-england-terrain.mjs';
import {TILE_RADIUS_METRES} from './tile-metrics.js';
import {safeRoute} from './ranch-navigation.mjs';
export function terrainWalkable(h,p,r=0){
 for(const [x,z] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]])if(!Number.isFinite(h(p.x+x,p.z+z))||slopeAt(h,p.x+x,p.z+z)>.25)return false;
 return true;
}
export function footprintFits(h,plan,candidate,req){
 const r=Math.max(1,req.radius||Math.hypot(req.w||2,req.d||2)/2),n=Math.ceil(r*2);let low=Infinity,high=-Infinity;
 // Reject obvious relief before the dense one-metre foundation audit.
 for(const dx of [-r,0,r])for(const dz of [-r,0,r]){const y=h(plan.center.x+candidate.x+dx,plan.center.z+candidate.z+dz);if(!Number.isFinite(y))return false;low=Math.min(low,y);high=Math.max(high,y);if(high-low>.85)return false;}

 for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const x=plan.center.x+candidate.x-r+2*r*i/n,z=plan.center.z+candidate.z-r+2*r*j/n,y=h(x,z);if(!Number.isFinite(y)||slopeAt(h,x,z)>.12)return false;low=Math.min(low,y);high=Math.max(high,y);if(high-low>.85)return false;}
 return true;
}
export function routeOnTerrain(assembly,h){
 const contains=boardBounds(assembly.plans,TILE_RADIUS_METRES);
 for(const p of assembly.plans)for(const path of p.paths){
  const rawBounds=(q,r)=>contains({x:q.x+p.center.x,z:q.z+p.center.z},r)&&terrainWalkable(h,{x:q.x+p.center.x,z:q.z+p.center.z},r);
  // Exact-coordinate cache is local to one route and discarded after repair.
  const boundsCache=new Map();
  const bounds=(q,r)=>{const key=q.x+','+q.z+','+r;if(boundsCache.has(key))return boundsCache.get(key);const value=rawBounds(q,r);if(boundsCache.size<50000)boundsCache.set(key,value);return value;};
  const radius=Math.max(.35,(path.width||1)/2),start=path.points[0],end=path.points.at(-1);
  // Retain authored entrance segments; keep other sites out of the repaired corridor.
  const obstacles=p.placements.filter(o=>Math.hypot(o.x-start.x,o.z-start.z)>o.radius+radius&&Math.hypot(o.x-end.x,o.z-end.z)>o.radius+radius).map(o=>({x:o.x,z:o.z,radius:o.radius}));
  const repaired=safeRoute(start,path.points.slice(1),radius,obstacles,bounds);if(!repaired)return false;path.points=[start,...repaired];
 }
 return true;
}
export function planTerrainFirst(board,options,finish=a=>a,{attempts=32}={}){
 const height=(board.landscape?.height??12)*1.6,seed=board.landscape?.seed??board.seed??173,rejections=[],fixed=board.terrain;
 if(fixed)attempts=1;
 for(let attempt=0;attempt<attempts;attempt++){
  const h=fixed?restoreTerrain(fixed):newEnglandTerrain((seed+attempt*7917)>>>0,height,board.landscape?.terrain),cache=new Map();
  const a=planAssembly(board,{...options,pruneEmptyBranches:true,siteAllowed:(p,c,r)=>{const key=[p.id,c.x,c.z,r.radius].join(':');if(!cache.has(key))cache.set(key,footprintFits(h,p,c,r));return cache.get(key);}});
  if(a.plans.some(p=>p.warnings.length)){rejections.push('required-space-or-access');continue;}
  let low=Infinity,high=-Infinity;for(const p of a.plans)for(let k=0;k<6;k++){const y=h(p.center.x+Math.sin(k*Math.PI/3)*TILE_RADIUS_METRES,p.center.z+Math.cos(k*Math.PI/3)*TILE_RADIUS_METRES);low=Math.min(low,y);high=Math.max(high,y);}if(!fixed&&high-low<height*.25){rejections.push('insufficient-landform');continue;}
  finish(a);if(!routeOnTerrain(a,h)){rejections.push('route');continue;}
  const check=assessRanchTerrain(h,a);if(!check.valid){rejections.push('validation');continue;}
  h.validation={...check,attempts:attempt+1,seed:h.seed,rejections};return {assembly:a,heightAt:h,terrain:fixed||terrainRecord(h,height)};
 }
 if(fixed){
  const h=restoreTerrain(fixed),a=planAssembly(board,{...options,pruneEmptyBranches:true});
  // An established board permits visibly invalid construction. Never reshape its terrain.
  for(const p of a.plans){const reqs=options.requirementsByTile?.[p.id]||options.requirementsByType?.[p.type]||[];
   reqs.forEach((req,i)=>{if(p.placements.some(o=>o.id===p.id+'-'+i))return;const angle=i*2.399963,x=Math.sin(angle)*12,z=Math.cos(angle)*12,door={x:x+Math.sin(angle)*(req.d||2)/2,z:z+Math.cos(angle)*(req.d||2)/2};p.placements.push({...req,id:p.id+'-'+i,x,z,angle,door,approach:door,reason:'User-permitted invalid placement'});p.paths.push({kind:'access',to:p.id+'-'+i,width:2,points:[p.hub,door]});p.warnings.push('Forced placement: '+(req.label||req.role));});
  }
  finish(a);const assessment=assessRanchTerrain(h,a);
  a.placementIssues=[...assessment.failures,...a.plans.flatMap(p=>p.warnings.map(message=>({type:'placement',tile:p.id,message})))];
  if(!routeOnTerrain(a,h))a.placementIssues.push({type:'route',message:'Some destinations have no safe route'});
  h.validation={valid:false,attempts:1,seed:h.seed,failures:a.placementIssues};
  return {assembly:a,heightAt:h,terrain:fixed};
 }
 const error=new Error(fixed?'This layout cannot fit the established terrain. The existing board is unchanged. Choose another layout or explicitly randomize the board.':'No buildable, connected ranch site found after '+attempts+' terrain candidates. Randomize or choose a larger site; requirements were not relaxed.');error.rejections=rejections;throw error;
}
