// Persistent semantic entities. Render meshes are views of these records, never their owners.
import {cardKey} from './playground-model.js';
export const AFFINITY_KINDS=['familial','tribal','political','regional','national'];
const copy=x=>structuredClone(x);
const palette=['#bb6949','#547f99','#798f55','#9975a4','#bf9750','#4f9487'];
export function hash(text){let n=2166136261;for(const c of String(text)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;}
const id=(...parts)=>parts.map(p=>encodeURIComponent(p)).join('/');
export const placeId=instanceId=>id('place',instanceId);
export function affinities(world,entityId,kind,seen=new Set()){
 const e=world.entities[entityId];if(!e||seen.has(entityId))return [];seen.add(entityId);
 return Object.hasOwn(e.affinities||{},kind)?e.affinities[kind]:e.parentId?affinities(world,e.parentId,kind,seen):[];
}
export function affinityColor(world,entityId,kind='tribal'){
 const ties=affinities(world,entityId,kind);return world.groups[ties.slice().sort((a,b)=>b.weight-a.weight)[0]?.groupId]?.color||'#9aab98';
}
export function commonAffinity(world,a,b){return AFFINITY_KINDS.reduce((n,k)=>{const left=affinities(world,a,k),right=affinities(world,b,k);return n+left.reduce((m,x)=>m+Math.min(x.weight,right.find(y=>y.groupId===x.groupId)?.weight||0),0);},0);}
export function setAffinities(world,entityId,kind,names,{inherit=false}={}){
 if(!AFFINITY_KINDS.includes(kind)||!world.entities[entityId]?.active)throw Error('Choose an active object and membership kind');
 const next=copy(world),e=next.entities[entityId];if(inherit){delete e.affinities[kind];return next;}
 if(!Array.isArray(names)||names.length>12||names.some(n=>typeof n!=='string'||!n.trim()||n.trim().length>60))throw Error('Use up to 12 names, each 1–60 characters');
 e.affinities[kind]=[...new Set(names.map(n=>n.trim().normalize('NFC')))].map(name=>{const groupId=id('group',kind,name.toLocaleLowerCase('en'));next.groups[groupId]??={id:groupId,kind,name,color:palette[hash(groupId)%palette.length]};return {groupId,weight:1};});return next;
}
export function syncWorld(board,assembly){
 if(board.world&&board.world.version!==1)throw Error('Unsupported world version');
 const world=board.world?copy(board.world):{version:1,id:board.id,seconds:0,entities:{},groups:{},agents:{},inventories:{},produced:0,consumed:0,initialFuel:0,delivered:0,events:[],policy:{preferFamiliar:true,ruleset:'fuel-v1'}};
 if(world.id!==board.id)throw Error('World belongs to another board');
 for(const e of Object.values(world.entities))e.active=false;
 const upsert=(key,data)=>{const previous=world.entities[key];world.entities[key]={affinities:{},traits:{},capabilities:[],...previous,...data,id:key,active:true};return world.entities[key];};
 const region=id('region',board.id),regionGroup=id('group','regional',board.id);
 world.groups[regionGroup]={id:regionGroup,kind:'regional',name:board.region?.name||'This region',color:'#798f55'};
 upsert(region,{kind:'region',name:board.region?.name||'This region',parentId:null});
 world.entities[region].affinities.regional=[{groupId:regionGroup,weight:1}];
 for(const i of board.instances){
  const card=board.cards[cardKey(i.cardId,i.cardRevision)],pid=placeId(i.instanceId),plans=assembly.plans.filter(p=>p.id.startsWith(i.instanceId+':')),first=plans[0];
  const point=p=>({x:p.center.x+p.hub.x,z:p.center.z+p.hub.z});
  const e=upsert(pid,{kind:'place',instanceId:i.instanceId,type:card.type||card.recipe.type,name:card.name||card.type||card.recipe.type,parentId:region,position:first?point(first):null,hub:first?first.id+':hub':null,capabilities:card.type==='home'?['receives-fuel']:card.type==='woodland'?['supplies-fuel']:[]});
  if(!world.inventories[pid]){const fuel=e.type==='woodland'?12:0;world.inventories[pid]={fuel,produced:0,consumed:0};world.initialFuel+=fuel;}
  if(e.type==='home'){
   const family=id('group','familial',i.instanceId);world.groups[family]??={id:family,kind:'familial',name:(card.name||'Home')+' household',color:palette[hash(family)%palette.length]};
   if(!world.agents[id('person',i.instanceId)]){e.affinities.familial=[{groupId:family,weight:1}];world.agents[id('person',i.instanceId)]={id:id('person',i.instanceId),homeId:pid,at:pid,position:e.position?{...e.position,y:0}:null,cargo:0,phase:'idle',trip:null,metres:0,deliveries:0};}
   upsert(id('person',i.instanceId),{kind:'person',instanceId:i.instanceId,name:'Courier · '+(card.name||'Home'),parentId:pid,capabilities:['walk','carry-fuel']});
  }
  for(const p of plans){
   for(const o of p.placements){const oid=id('object',i.instanceId,p.id,o.id);const worldPoint=item=>({x:p.center.x+o.x+(item?.x||0)*Math.cos(o.angle||0)+(item?.z||0)*Math.sin(o.angle||0),z:p.center.z+o.z-(item?.x||0)*Math.sin(o.angle||0)+(item?.z||0)*Math.cos(o.angle||0)});
    upsert(oid,{kind:'object',instanceId:i.instanceId,name:o.label||o.model||o.id,parentId:pid,position:worldPoint(),asset:o.model||null});
    for(const [index,item]of (o.items||[]).entries())upsert(id('item',i.instanceId,p.id,o.id,index,item.asset),{kind:'item',instanceId:i.instanceId,name:item.asset+' · '+(index+1),parentId:oid,position:worldPoint(item),asset:item.asset});
   }
   for(const [index,path]of p.paths.entries())upsert(id('path',i.instanceId,p.id,index),{kind:'path',instanceId:i.instanceId,name:(path.kind||'Footpath')+' · '+(index+1),parentId:pid,position:path.points[0]?{x:p.center.x+path.points[0].x,z:p.center.z+path.points[0].z}:null});
  }
 }
 return world;
}
export function worldReport(world){const active=Object.values(world.entities).filter(e=>e.active),people=Object.values(world.agents).filter(a=>world.entities[a.id]?.active);return {seconds:world.seconds,objects:active.length,people:people.length,travelling:people.filter(a=>a.trip).length,waiting:people.filter(a=>a.phase==='waiting').length,delivered:world.delivered,stock:Object.entries(world.inventories).filter(([k])=>world.entities[k]?.active).reduce((n,[,s])=>n+s.fuel,0),stored:Object.entries(world.inventories).filter(([k])=>!world.entities[k]?.active).reduce((n,[,s])=>n+s.fuel,0),cargo:Object.values(world.agents).reduce((n,a)=>n+a.cargo,0),produced:world.produced,consumed:world.consumed,initialFuel:world.initialFuel};}
