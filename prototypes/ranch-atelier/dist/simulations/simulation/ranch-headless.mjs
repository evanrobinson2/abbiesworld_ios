import {createRanchCore} from './ranch-core.mjs';
import {Vec3,Vec2} from './actor-state.mjs';
import {restoreTerrain} from '../board-terrain.mjs';
import {terrainWalkable} from '../ranch-terrain-planner.mjs';
import {hexBounds,boardBounds} from './spatial-bounds.mjs';
import {pathNetwork} from '../ranch-routes.mjs';
import {boxObstacle} from '../ranch-navigation.mjs';
import {neighboringTiles} from '../poi/poi-state.mjs';
import {createDecisionSchedule,createOccupancy,createStatefulRandom} from './runtime-scheduling.mjs';
import {createPoseOwnership} from './pose-ownership.mjs';
import {createAdvisors} from '../ranch-advisors.mjs';
// Portable checkpoint: the same core can run without a canvas, DOM, or Three.js.
export function exportCoreWorld(core){const c=core.context;return JSON.parse(JSON.stringify({snapshot:core.snapshot(),assembly:c.assembly,recipe:c.recipe,places:c.places,obstacles:c.obstacles,farmhandProfiles:c.farmhandProfiles,carryAvailable:c.carryAvailable,starterChild:c.starterChild,bench:c.bench,animalRadius:c.animalRadius,actors:c.actors,workers:c.workers}));}
export function restoreCoreWorld(data,{compiled=null}={}){
 if(data.recipe.tiles.some(t=>['moon','city'].includes(t.type)))throw new Error('Headless export currently supports ranch terrain only');
 const d=structuredClone(data),state=d.snapshot.state,places=d.places,pens=places.filter(p=>p.species),homes=places.filter(p=>p.role==='home'),home=homes[0],radius=d.assembly.radiusMetres??d.recipe.hexRadiusMetres??50;
 const heightAt=restoreTerrain(d.recipe.terrain),inside=hexBounds(radius),contains=boardBounds(d.assembly.plans,radius),inBoard=(p,r)=>contains(p,r)&&terrainWalkable(heightAt,p,r);
 const pose=b=>({...b,position:new Vec3(b.position.x,b.position.y,b.position.z),scale:new Vec3(b.scale.x,b.scale.y,b.scale.z)});
 const actors=d.actors.map(a=>({...a,a:state.pens.flatMap(p=>p.animals).find(x=>x.id===a.a.id),p:pens.find(p=>p.id===a.p.id),body:pose(a.body),target:new Vec2(a.target.x,a.target.y),adultScale:a.adultScale?new Vec3(a.adultScale.x,a.adultScale.y,a.adultScale.z):undefined}));
 const workers=d.workers.map(w=>({...w,person:state.generations.people.find(p=>p.id===w.person.id)||w.person,home:homes.find(h=>h.id===w.home?.id),body:pose(w.body)}));
 const penMembers=new Map();for(const a of actors){if(!penMembers.has(a.p))penMembers.set(a.p,[]);penMembers.get(a.p).push(a);}for(const group of penMembers.values()){for(const a of group)a.peer={x:a.body.position.x,z:a.body.position.z,radius:d.animalRadius[a.a.species]};for(const a of group)a.peers=group.filter(b=>b!==a).map(b=>b.peer);}
 const station=(p,kind)=>p[kind+'Point']||{x:(kind==='water'?-1:1)*p.w*.22,z:p.d/2-(kind==='water'?1.5:1.8)},geometry=new Map(),penObstacles=p=>{if(!geometry.has(p))geometry.set(p,[boxObstacle(station(p,'water').x,station(p,'water').z,1.8,.8),boxObstacle(station(p,'feed').x,station(p,'feed').z,1.4,.9),...(p.shelterObstacles||[])]);return geometry.get(p);};
 const c={...d,state,places,pens,homes,home,actors,workers,heightAt,inside,inBoard,penMembers,station,penObstacles,inPen:p=>(q,r)=>Math.abs(q.x)<p.w/2-r-.2&&Math.abs(q.z)<p.d/2-r-.2,outsideEntry:p=>({x:p.entry.x+Math.sin(p.angle)*.65,z:p.entry.z+Math.cos(p.angle)*.65}),source:{feed:places.find(p=>p.role==='store'),water:places.find(p=>p.role==='water-source')},network:pathNetwork(d.assembly.plans),poiPlaces:places.filter(p=>p.role==='sugar-shack'),poiNeighbors:poi=>neighboringTiles(d.assembly.plans,d.assembly.plans.find(p=>inside({x:poi.world.x-p.center.x,z:poi.world.z-p.center.z},0))?.id??poi.plan.id,radius),decisions:createDecisionSchedule(),poiOccupancy:createOccupancy(),rng:createStatefulRandom(d.recipe.seed+738),poseOwnership:createPoseOwnership({capture:()=>null,recover:()=>false,describe:()=>{}}),advisors:createAdvisors(),compiled,layoutVersion:0};
 const core=createRanchCore(c);core.restore(d.snapshot);return core;
}
