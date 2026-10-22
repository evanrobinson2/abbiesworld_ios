import {segmentDistance} from './tile-adapter.js';
// Keep every junction fixed so the rendered paths and walking graph agree.
export function refineRanchPaths(assembly){
 for(const plan of assembly.plans){
  const junctions=plan.paths.flatMap(p=>p.points);
  for(const path of plan.paths){
   path.width=path.kind==='connector'?1.65:path.kind==='access'?1.15:path.width;
   if(path.kind!=='connector')continue;
   const result=[];
   for(let i=1;i<path.points.length;i++){
    const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(!len)continue;
    const stops=[0,1];for(const p of junctions){const t=((p.x-a.x)*dx+(p.z-a.z)*dz)/(len*len);if(t>1e-6&&t<1-1e-6&&segmentDistance(p,a,b)<.001)stops.push(t);}
    const ts=[...new Set(stops)].sort((a,b)=>a-b);
    for(let k=1;k<ts.length;k++){
     const start=ts[k-1],end=ts[k],length=(end-start)*len,steps=Math.max(1,Math.ceil(length/2));
     let amplitude=Math.min(2,length*.075)*Math.sin(plan.seed*.17+i);
     const sample=amp=>Array.from({length:steps+1},(_,j)=>{const u=j/steps,t=start+(end-start)*u,bend=amp*Math.sin(Math.PI*u)**2;return {x:a.x+dx*t-dz/len*bend,z:a.z+dz*t+dx/len*bend};});
     let points=sample(amplitude);
     for(let attempt=0;attempt<5;attempt++){if(points.slice(1).every((p,j)=>plan.placements.every(o=>segmentDistance(o,points[j],p)>o.radius+path.width/2+.15)))break;amplitude*=.5;points=sample(amplitude);}
     if(!points.slice(1).every((p,j)=>plan.placements.every(o=>segmentDistance(o,points[j],p)>o.radius+path.width/2+.15)))points=sample(0);
     result.push(...(result.length?points.slice(1):points));
    }
   }
   path.points=result;
  }
 }
 return assembly;
}
