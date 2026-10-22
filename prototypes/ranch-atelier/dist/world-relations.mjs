import {AFFINITY_KINDS,affinities} from './world-model.mjs';
export const RELATIONS=['allied','neutral','hostile'];
const key=(a,b)=>[a,b].sort().join('|');
export function setRelationship(world,a,b,value){
 if(!world.groups[a]||!world.groups[b]||a===b||!RELATIONS.includes(value))throw Error('Choose two different groups and a valid relationship');
 if(world.groups[a].kind!==world.groups[b].kind)throw Error('Relationships must compare the same membership kind');
 const next=structuredClone(world);next.relationships??={};next.relationships[key(a,b)]=value;
 for(const actor of Object.values(next.actors||{})){actor.decisionAt=0;actor.windup=null;actor.pathJob=null;actor.route=null;const attacker=next.actors[actor.attackerId];if(attacker&&relationship(next,actor,attacker)!=='hostile'){actor.attackerId=null;actor.threatUntil=0;}}
 return next;
}
export function diplomaticRelationship(world,a,b){
 // Explicit treaties outrank diet. Most specific tier wins; hostile wins ties.
 for(const kind of AFFINITY_KINDS){
  const left=affinities(world,a.id,kind),right=affinities(world,b.id,kind);let best=null;
  for(const x of left)for(const y of right){const value=world.relationships?.[key(x.groupId,y.groupId)];if(value==='hostile')return value;if(value==='neutral')best=value;else if(value==='allied'&&!best)best=value;}
  if(best)return best;
 }
 return null;
}
export function relationship(world,a,b){
 const treaty=diplomaticRelationship(world,a,b);if(treaty!==null)return treaty;
 if((a.diet||[]).some(t=>(b.tags||[]).includes(t))||(b.diet||[]).some(t=>(a.tags||[]).includes(t)))return 'hostile';
 return 'neutral';
}
export function isHostile(world,a,b){if(a.id===b.id)return false;const treaty=diplomaticRelationship(world,a,b);return treaty!==null?treaty==='hostile':relationship(world,a,b)==='hostile'||(a.attackerId===b.id&&(a.threatUntil||0)>world.encounter.time);}
// Identity invalidation is safe only for sealed immutable semantic branches.
// Imported or externally mutable worlds get a fresh cache until the next fork seals them.
const caches=new WeakMap(),noTreaties=Object.freeze({});
const equalList=(a,b)=>a?.length===b?.length&&(a||[]).every((v,i)=>v===b[i]);
export function relationResolver(world,actors){
 const treaties=world.relationships||noTreaties,stable=Object.isFrozen(world.entities)&&Object.isFrozen(treaties);
 let versions=stable&&caches.get(world.entities);
 if(!versions){versions=new WeakMap();if(stable)caches.set(world.entities,versions);}
 let cache=versions.get(treaties);
 if(!cache){cache={actors:new Map(),intern:new Map(),memo:new Map()};versions.set(treaties,cache);}
 const profiles=new Map();
 for(const a of actors){
  let profile=cache.actors.get(a.id);
  if(!profile||!equalList(profile.tags,a.tags)||!equalList(profile.diet,a.diet)){
   const signature=JSON.stringify([AFFINITY_KINDS.map(k=>affinities(world,a.id,k)),a.tags,a.diet]);
   if(!cache.intern.has(signature))cache.intern.set(signature,cache.intern.size);
   profile={number:cache.intern.get(signature),tags:[...(a.tags||[])],diet:[...(a.diet||[])]};cache.actors.set(a.id,profile);
  }
  profiles.set(a.id,profile.number);
 }
 return (a,b)=>{if(!a||!b||a.id===b.id)return false;const x=profiles.get(a.id),y=profiles.get(b.id),pair=x<y?x+':'+y:y+':'+x;
  if(!cache.memo.has(pair)){const treaty=diplomaticRelationship(world,a,b);cache.memo.set(pair,{hostile:relationship(world,a,b)==='hostile',peace:treaty==='neutral'||treaty==='allied'});}
  const relation=cache.memo.get(pair);
  // Retaliation expires on simulation time and is never memoized with diplomacy.
  return relation.hostile||(!relation.peace&&a.attackerId===b.id&&(a.threatUntil||0)>world.encounter.time);
 };
}
