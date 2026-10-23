import {AFFINITY_KINDS,affinities} from '../../world-model.mjs';
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
export function relationResolver(world,actors){
 const profiles=new Map(),intern=new Map(),memo=new Map();
 for(const a of actors){const signature=JSON.stringify([AFFINITY_KINDS.map(k=>affinities(world,a.id,k)),a.tags,a.diet]);if(!intern.has(signature))intern.set(signature,intern.size);profiles.set(a.id,intern.get(signature));}
 return (a,b)=>{if(!a||!b||a.id===b.id)return false;const x=profiles.get(a.id),y=profiles.get(b.id),key=x<y?x+':'+y:y+':'+x;if(!memo.has(key)){const treaty=diplomaticRelationship(world,a,b);memo.set(key,{hostile:relationship(world,a,b)==='hostile',peace:treaty==='neutral'||treaty==='allied'});}const relation=memo.get(key);return relation.hostile||(!relation.peace&&a.attackerId===b.id&&(a.threatUntil||0)>world.encounter.time);};
}
