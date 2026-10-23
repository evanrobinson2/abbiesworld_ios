// Common contract for every scene generator: generated space, live activity,
// controls and factual readouts. Economic systems stay owned by their domain.
export function spatialReadout(plans){const routes=plans.flatMap(p=>p.paths||[]),sites=plans.reduce((n,p)=>n+p.placements.reduce((m,o)=>m+(o.items?.filter(i=>i.asset==='GF-191').length||1),0),0),length=routes.reduce((sum,p)=>sum+p.points.slice(1).reduce((n,b,i)=>n+Math.hypot(b.x-p.points[i].x,b.z-p.points[i].z),0),0);return {sites,routes:routes.length,metres:Math.round(length)};}
export function continuousSites(rng,radius=43){const sites=[];for(let i=0;i<650;i++){const a=rng()*Math.PI*2,r=Math.sqrt(rng())*radius;sites.push({x:Math.cos(a)*r,z:Math.sin(a)*r,tie:rng()});}return sites;}
export function spatialState(){return {seconds:0,metres:0,trips:0};}
