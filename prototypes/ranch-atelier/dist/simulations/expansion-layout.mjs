// Expansion preserves established sites and adds only one shared boundary crossing.
import {safeRoute} from './ranch-navigation.mjs';
import {terrainWalkable} from './ranch-terrain-planner.mjs';
export function retainEstablishedLayout(next,previous,heightAt){
 const old=new Map(previous.plans.map(p=>[p.id,p]));
 next.plans=next.plans.map(p=>old.has(p.id)?structuredClone(old.get(p.id)):p);
 next.links=structuredClone(previous.links||[]);
 for(const p of next.plans.filter(p=>!old.has(p.id))){
  p.paths=p.paths.filter(path=>path.kind!=='connector');p.ports=[];
  if(!p.placements.length)continue;
  const neighbor=next.plans.filter(q=>old.has(q.id)&&Math.abs(Math.hypot(q.center.x-p.center.x,q.center.z-p.center.z)-next.radiusMetres*Math.sqrt(3))<.1).sort((a,b)=>a.id.localeCompare(b.id))[0];
  if(!neighbor)continue;
  const point={x:(p.center.x+neighbor.center.x)/2,z:(p.center.z+neighbor.center.z)/2};
  next.links.push({a:neighbor.id,b:p.id,point,width:3});
  for(const [a,b]of [[p,neighbor],[neighbor,p]]){
   const port={neighbor:b.id,x:point.x-a.center.x,z:point.z-a.center.z};a.ports.push(port);
   const candidates=[a.hub,...a.paths.flatMap(path=>path.points)];const start=candidates.reduce((best,v)=>Math.hypot(v.x-port.x,v.z-port.z)<Math.hypot(best.x-port.x,best.z-port.z)?v:best,a.hub);
   const obstacles=a.placements.map(o=>({x:o.x,z:o.z,radius:o.radius}));
   const route=safeRoute(start,[port],.6,obstacles,(v,r)=>(Math.abs(v.x)<=next.radiusMetres*Math.sqrt(3)/2+.001&&Math.abs(v.z)<=next.radiusMetres+.001&&Math.abs(v.x)+Math.sqrt(3)*Math.abs(v.z)<=next.radiusMetres*Math.sqrt(3)+.001)&&terrainWalkable(heightAt,{x:v.x+a.center.x,z:v.z+a.center.z},r));
   if(route)a.paths.push({kind:'connector',width:1.2,points:[start,...route]});
   else{a.warnings.push('Expansion crossing has no safe walking route');(next.placementIssues??=[]).push({type:'route',tile:a.id,message:'Expansion crossing blocked by terrain or buildings'});}
  }
 }
 return next;
}
export function exposedEdges(tile,tiles,diameter){
 return Array.from({length:6},(_,e)=>{const angle=(e+.5)*Math.PI/3,d=diameter*Math.sqrt(3)/2;return !tiles.some(t=>t.id!==tile.id&&Math.hypot(t.center.x-tile.center.x-Math.sin(angle)*d,t.center.z-tile.center.z-Math.cos(angle)*d)<.1);});
}
