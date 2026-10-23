import {ABILITIES,SIMULATION_LIMITS} from './actor-catalog.mjs';
import {distance} from './world-navigation.mjs';
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
export const bodyCenter=a=>({...a.position,y:a.position.y+(a.body==='rabbit'?.3:a.body==='wolf'?.5:.9)});
export function sphereHit(from,to,center,radius){const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,ox=from.x-center.x,oy=from.y-center.y,oz=from.z-center.z,A=dx*dx+dy*dy+dz*dz,C=ox*ox+oy*oy+oz*oz-radius*radius;if(C<=0)return 0;if(!A)return null;const B=2*(ox*dx+oy*dy+oz*dz),disc=B*B-4*A*C;if(disc<0)return null;const t=(-B-Math.sqrt(disc))/(2*A);return t>=0&&t<=1?t:null;}
const blockerIndexes=new WeakMap();
function blockers(graph,a,b,r){let index=blockerIndexes.get(graph);if(!index||index.signature!==graph.signature){index={signature:graph.signature,cells:new Map()};for(const o of graph.obstacles||[]){const reach=o.kind==='circle'?o.radius:Math.hypot(o.w,o.d)/2;for(let x=Math.floor((o.x-reach)/16);x<=Math.floor((o.x+reach)/16);x++)for(let z=Math.floor((o.z-reach)/16);z<=Math.floor((o.z+reach)/16);z++){const key=x+','+z;if(!index.cells.has(key))index.cells.set(key,[]);index.cells.get(key).push(o);}}blockerIndexes.set(graph,index);}const result=new Set();for(let x=Math.floor((Math.min(a.x,b.x)-r)/16);x<=Math.floor((Math.max(a.x,b.x)+r)/16);x++)for(let z=Math.floor((Math.min(a.z,b.z)-r)/16);z<=Math.floor((Math.max(a.z,b.z)+r)/16);z++)for(const o of index.cells.get(x+','+z)||[])result.add(o);return result;}
export function environmentHit(graph,from,to,radius=0){let hit=null;
 for(const o of blockers(graph,from,to,radius)){const angle=o.angle||0,c=Math.cos(angle),s=Math.sin(angle),local=p=>({x:(p.x-o.x)*c-(p.z-o.z)*s,z:(p.x-o.x)*s+(p.z-o.z)*c}),a=local(from),b=local(to);let t=null;
  if(o.kind==='circle')t=sphereHit({x:a.x,y:0,z:a.z},{x:b.x,y:0,z:b.z},{x:0,y:0,z:0},o.radius+radius);
  else {let lo=0,hi=1;for(const [axis,half]of [['x',o.w/2+radius],['z',o.d/2+radius]]){const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-9){if(Math.abs(a[axis])>half){hi=-1;break;}}else{let l=(-half-a[axis])/delta,h=(half-a[axis])/delta;if(l>h)[l,h]=[h,l];lo=Math.max(lo,l);hi=Math.min(hi,h);}}if(lo<=hi)t=lo;}
  // Navigation footprints are conservative solid columns; not full mesh/roof physics.
  if(t!==null&&(hit===null||t<hit))hit=t;
 }
 if(graph.heightAt){const steps=Math.max(1,Math.ceil(distance(from,to)/.5));for(let i=1;i<=steps;i++){const t=i/steps,p=lerp(from,to,t);if(p.y-radius<=graph.heightAt(p.x,p.z)){if(hit===null||t<hit)hit=t;break;}}}
 return hit;
}
export function launchProjectile(world,actor,target,abilityId){const ability=ABILITIES[abilityId];if(world.encounter.projectiles.length>=SIMULATION_LIMITS.projectiles)return false;const from=bodyCenter(actor),aim=bodyCenter(target),length=distance(from,aim)||1,speed=ability.projectile.speed;world.encounter.projectiles.push({id:++world.encounter.nextProjectile,sourceId:actor.id,abilityId,damageBonus:actor.damageBonus||0,position:from,velocity:{x:(aim.x-from.x)/length*speed,y:(aim.y-from.y)/length*speed,z:(aim.z-from.z)/length*speed},remaining:ability.projectile.lifetime,signature:world.encounter.graphSignature});world.encounter.casts++;return true;}
export function advanceProjectiles(world,graph,index,dt,pending){const alive=[];
 for(const p of world.encounter.projectiles){if(!world.entities[p.sourceId]?.active||p.signature!==graph.signature)continue;const ability=ABILITIES[p.abilityId],from=p.position,to={x:from.x+p.velocity.x*dt,y:from.y+p.velocity.y*dt,z:from.z+p.velocity.z*dt};let hit=environmentHit(graph,from,to,ability.projectile.radius),victim=null;
  for(const a of index.near({position:lerp(from,to,.5)},distance(from,to)/2+2)){if(a.id===p.sourceId||a.hp<=0)continue;const t=sphereHit(from,to,bodyCenter(a),(a.radius||.4)+ability.projectile.radius);if(t!==null&&(hit===null||t<hit)){hit=t;victim=a;}}
  if(hit!==null){const center=lerp(from,to,hit);world.encounter.impacts++;world.encounter.effects.push({position:center,until:world.encounter.time+.5,radius:ability.projectile.splash});for(const a of index.near({position:center},ability.projectile.splash+1)){if(distance(center,bodyCenter(a))>ability.projectile.splash+(a.radius||.4))continue;if(a!==victim&&environmentHit(graph,center,bodyCenter(a),0)!==null)continue;pending.push({a:world.actors[p.sourceId],b:a,weapon:ability,bonus:p.damageBonus});}}
  else if((p.remaining-=dt)>0){p.position=to;alive.push(p);}
 }
 world.encounter.projectiles=alive;world.encounter.effects=world.encounter.effects.filter(e=>e.until>world.encounter.time);
}
