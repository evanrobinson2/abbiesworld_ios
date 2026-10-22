import {configureActor} from './actor-profiles.mjs';
import {applyActorConditions} from './world-conditions.mjs';
import {forkEncounter} from './world-snapshot.mjs';
// Seeded, fixed-tick world actors. No renderer, network or model calls.
import {ACTOR_TYPES,ABILITIES as WEAPONS,SIMULATION_LIMITS} from './actor-catalog.mjs';
import {placeId,hash} from './world-model.mjs';
import {distance,routeBetween,beginRoute,stepRoute,nearbyNodes} from './world-navigation.mjs';
import {relationResolver} from './world-relations.mjs';
import {chooseActorGoal} from './actor-decisions.mjs';
import {launchProjectile,advanceProjectiles,environmentHit,bodyCenter} from './actor-projectiles.mjs';
const DT=.25;
const event=(w,text)=>{w.encounter.events.unshift({at:w.encounter.time,text});w.encounter.events=w.encounter.events.slice(0,25);};
function random(w){let a=w.encounter.random|0;a^=a<<13;a^=a>>>17;a^=a<<5;w.encounter.random=a>>>0;return (a>>>0)/4294967296;}
function participants(w){return Object.values(w.actors||{}).filter(a=>w.entities[a.id]?.active&&a.hp>0);}
function graphNodes(graph,instanceId){return Object.keys(graph.nodes).filter(k=>k.startsWith(instanceId+'#')&&graph.adj[k]?.length);}
export function spawnActors(world,board,graph,instanceId,count,archetype){
 const w=structuredClone(world),card=board.cards[board.instances.find(i=>i.instanceId===instanceId)?.cardId+'@'+board.instances.find(i=>i.instanceId===instanceId)?.cardRevision],spec=ACTOR_TYPES[archetype||card?.recipe?.agents?.archetype];
 if(!spec||!Number.isInteger(count)||count<1||count>32)throw Error('Choose 1–32 actors in a valid scene');
 if(participants(w).length+count>SIMULATION_LIMITS.actors)throw Error('This world supports up to '+SIMULATION_LIMITS.actors+' active actors');
 const place=w.entities[placeId(instanceId)],nodes=graphNodes(graph,instanceId);if(!place||!nodes.length)throw Error('This scene needs traversable paths before actors can spawn');
 for(let i=0;i<count;i++){
  const seq=++w.encounter.nextId,id='actor/'+instanceId+'/'+seq,node=nodes[hash(instanceId+':'+seq+':'+(card?.recipe.seed||41))%nodes.length],position=structuredClone(graph.nodes[node]);
  w.actors[id]={...structuredClone(spec),archetype:archetype||card.recipe.agents.archetype,name:spec.name+' '+seq,id,instanceId,position,maxHp:spec.hp,damageBonus:0,attackReady:0,stunnedUntil:0,decisionAt:0,decisionSlot:seq%3,pathJob:null,fleeUntil:0,intent:'idle',targetId:null,route:null,windup:null,kills:0,metres:0};
  const profile=card.recipe.agents;if(profile.temperament||profile.variant)configureActor(w.actors[id],profile,w.conditions);else applyActorConditions(w.actors[id],w.conditions);
  w.entities[id]={id,kind:spec.body==='rabbit'||spec.body==='wolf'?'animal':'person',name:spec.name+' '+seq,instanceId,parentId:place.id,active:true,affinities:{},capabilities:['perceive','walk',...(spec.weapon?['attack']:[])]};
 }
 return w;
}
export function syncEncounter(world,board,graph){
 let w=structuredClone(world);w.actors??={};w.encounter??={version:1,time:0,random:hash(board.id)||1,nextId:0,spawned:{},events:[],hits:0,misses:0,consumed:0,defeated:0};
 w.encounter.projectiles??=[];w.encounter.effects??=[];w.encounter.nextProjectile??=0;w.encounter.casts??=0;w.encounter.impacts??=0;w.encounter.decisionCursor??=0;w.encounter.pathCursor??=0;
 if(w.encounter.version!==1)throw Error('Unknown encounter version');
 for(const a of Object.values(w.actors)){
  const instance=board.instances.find(i=>i.instanceId===a.instanceId),card=instance&&board.cards[instance.cardId+'@'+instance.cardRevision];const exists=!!card?.recipe?.agents;
  if(w.entities[a.id])w.entities[a.id].active=exists;
  if(!exists){a.pathJob=null;a.route=null;a.windup=null;a.intent='stored';continue;}
  // World positions survive edits. A removed route can strand an actor; rebuilding never teleports it home.
  if((a.route&&a.route.signature!==graph.signature)||(a.pathJob&&a.pathJob.signature!==graph.signature)||a.intent==='stored'){a.decisionAt=0;a.pathJob=null;a.route=null;}
  const def=ACTOR_TYPES[a.archetype];for(const field of ['body','radius','mana','maxMana','manaRegen','resistances'])if(a[field]===undefined&&def?.[field]!==undefined)a[field]=structuredClone(def[field]);
 }
 for(const i of board.instances){const card=board.cards[i.cardId+'@'+i.cardRevision];if(!card.recipe?.agents||w.encounter.spawned[i.instanceId])continue;
  w=spawnActors(w,board,graph,i.instanceId,card.recipe.agents.count,card.recipe.agents.archetype);w.encounter.spawned[i.instanceId]=true;
 }
 return w;
}
export function nearbyIndex(actors){const cells=new Map();for(const a of actors){const key=Math.floor(a.position.x/32)+','+Math.floor(a.position.z/32);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(a);}return {near(a,radius){const result=[],cx=Math.floor(a.position.x/32),cz=Math.floor(a.position.z/32),n=Math.ceil(radius/32),r2=radius*radius;for(let dx=-n;dx<=n;dx++)for(let dz=-n;dz<=n;dz++)for(const b of cells.get((cx+dx)+','+(cz+dz))||[]){const x=a.position.x-b.position.x,z=a.position.z-b.position.z;if(a!==b&&x*x+z*z<=r2)result.push(b);}return result;}};}
function setRoute(a,r,g){a.route=r?{points:r.points,next:1,signature:g.signature}:null;}
function requestRoute(g,a,to,mode){a.pathJob=beginRoute(g,a.position,to,{limit:mode==='flee'?100:Number.MAX_VALUE});a.pathJob.mode=mode;a.route=null;}
function fleeRequest(g,a,target){const clearance=distance(a.position,target.position),candidates=nearbyNodes(g,a.position,65,64).filter(c=>c.distance>.3&&distance(c.p,target.position)>clearance+1).sort((x,y)=>(distance(y.p,target.position)-y.distance*.15)-(distance(x.p,target.position)-x.distance*.15)||x.key.localeCompare(y.key));if(!candidates.length){a.intent='cornered';a.route=null;a.pathJob=null;return;}requestRoute(g,a,candidates[0].p,'flee');a.pathJob.threat={...target.position};a.pathJob.clearance=clearance-.05;a.intent='fleeing';}
function safeEscape(job){return !job.result.points.slice(1).some((q,i)=>{const p=job.result.points[i],dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,den=dx*dx+dy*dy+dz*dz,t=den?Math.max(0,Math.min(1,((job.threat.x-p.x)*dx+(job.threat.y-p.y)*dy+(job.threat.z-p.z)*dz)/den)):0;return distance({x:p.x+dx*t,y:p.y+dy*t,z:p.z+dz*t},job.threat)<job.clearance;});}
function finishPath(g,a){const job=a.pathJob;if(!job||job.status==='searching')return;if(job.status==='ready'&&(job.mode!=='flee'||safeEscape(job))){setRoute(a,job.result,g);a.intent=job.mode==='flee'?'fleeing':job.mode==='wander'?'wandering':'chasing';}else{a.route=null;a.intent=job.mode==='flee'?'cornered':'blocked';}a.pathJob=null;}
function decide(w,g,a,index,hostile,metrics){let target=null,best=Infinity;const candidates=index.near(a,a.sense);const offset=hash(a.id+':'+Math.floor(w.encounter.time/3))%Math.max(1,candidates.length);for(let i=0;i<Math.min(candidates.length,SIMULATION_LIMITS.perceptionCandidates);i++){const b=candidates[(offset+i)%candidates.length];metrics.perceptionCandidates++;if(!hostile(a,b))continue;const d=distance(a.position,b.position);if(d<best||(d===best&&b.id<(target?.id||''))){target=b;best=d;}}
 const old=w.actors[a.targetId];if(old?.hp>0&&w.entities[old.id]?.active&&hostile(a,old)&&distance(a.position,old.position)<=a.sense&&distance(a.position,old.position)<best){target=old;}
 a.targetId=target?.id||null;const goal=chooseActorGoal(a,target,w.encounter.time);
 if(goal==='idle'){if(a.intent==='wandering'&&(a.route||a.pathJob))return;a.route=null;a.pathJob=null;const nodes=nearbyNodes(g,a.position,65,32).filter(n=>n.distance>3);if(nodes.length){const pick=nodes[hash(a.id+':wander:'+Math.floor(w.encounter.time/8))%nodes.length];requestRoute(g,a,pick.p,'wander');a.intent='wandering';}else a.intent='idle';return;}
 if(goal==='flee'){a.fleeUntil=w.encounter.time+1.5;if(a.route&&a.intent==='fleeing')return;fleeRequest(g,a,target);return;}
 const weapon=WEAPONS[a.weapon];if(weapon?.kind==='projectile'&&distance(a.position,target.position)<=weapon.range&&environmentHit(g,bodyCenter(a),bodyCenter(target),weapon.projectile.radius)===null){a.intent='aiming';a.route=null;a.pathJob=null;return;}
 if(a.pathJob)return;requestRoute(g,a,target.position,'chase');a.intent='chasing';
}
function move(a,g,seconds){if(!a.route)return;if(a.route.signature!==g.signature){a.route=null;a.intent='blocked';a.decisionAt=0;return;}let budget=a.speed*seconds;while(a.route&&budget>0){const p=a.route.points[a.route.next];if(!p){a.route=null;break;}const d=distance(a.position,p),step=Math.min(d,budget),f=d?step/d:1;a.position={x:a.position.x+(p.x-a.position.x)*f,y:a.position.y+(p.y-a.position.y)*f,z:a.position.z+(p.z-a.position.z)*f};budget-=step;a.metres+=step;if(step>=d-.000001){a.route.next++;if(a.route.next>=a.route.points.length)a.route=null;}}}
function canAttack(w,g,a,b,hostile){const ability=WEAPONS[a.weapon];if(!ability||!b||b.hp<=0||!w.entities[b.id]?.active||!hostile(a,b)||distance(a.position,b.position)>ability.range)return false;if(ability.kind==='projectile')return (a.mana||0)>=ability.cost&&environmentHit(g,bodyCenter(a),bodyCenter(b),ability.projectile.radius)===null;return !!routeBetween(g,a.position,b.position,{limit:ability.range+.05});}
export function advanceEncounter(world,graph,seconds=1){
 if(!Number.isFinite(seconds)||seconds<=0||seconds>600||Math.abs(seconds/DT-Math.round(seconds/DT))>.001)throw Error('Use quarter-second steps up to 600 seconds');
 const w=forkEncounter(world),e=w.encounter;e.projectiles??=[];e.effects??=[];e.casts??=0;e.impacts??=0;e.nextProjectile??=0;e.decisionCursor??=0;e.pathCursor??=0;
 for(let tick=0;tick<Math.round(seconds/DT);tick++){
  e.time=Math.round((e.time+DT)*4)/4;w.seconds=e.time;e.graphSignature=graph.signature;const time=e.time,actors=participants(w),index=nearbyIndex(actors),hostile=relationResolver(w,actors),pending=[],metrics={decisions:0,perceptionCandidates:0,pathExpansions:0,queued:0};
  for(const a of actors){if(a.maxMana)a.mana=Math.min(a.maxMana,(a.mana||0)+(a.manaRegen||0)*DT);if(a.burning?.until>time-DT)pending.push({a:w.actors[a.burning.sourceId],b:a,weapon:{label:'Burning',damageType:'fire',damage:a.burning.dps*DT,accuracy:1,stagger:0},bonus:0,dot:true});else a.burning=null;if(a.pathJob&&a.pathJob.signature!==graph.signature){a.pathJob=null;a.route=null;a.decisionAt=0;}if(a.route?.signature!==graph.signature){a.route=null;}}
  // Work-count budgets, persistent round-robin cursors, no wall-clock-dependent decisions.
  const n=actors.length,start=e.decisionCursor%Math.max(1,n);let scanned=0;
  for(;scanned<n&&metrics.decisions<SIMULATION_LIMITS.decisionsPerTick;scanned++){const a=actors[(start+scanned)%n];if(a.windup||a.stunnedUntil>time||time<a.decisionAt)continue;decide(w,graph,a,index,hostile,metrics);a.decisionAt=time+.75;metrics.decisions++;}
  e.decisionCursor=n?(start+scanned)%n:0;
  const pathStart=e.pathCursor%Math.max(1,n);let pathScanned=0;
  for(;pathScanned<n&&metrics.pathExpansions<SIMULATION_LIMITS.pathExpansionsPerTick;pathScanned++){const a=actors[(pathStart+pathScanned)%n];if(!a.pathJob)continue;metrics.pathExpansions+=stepRoute(graph,a.pathJob,Math.min(SIMULATION_LIMITS.pathSlice,SIMULATION_LIMITS.pathExpansionsPerTick-metrics.pathExpansions));finishPath(graph,a);}
  e.pathCursor=n?(pathStart+pathScanned)%n:0;
  for(const a of actors){if(a.stunnedUntil>time){a.intent='staggered';continue;}const ability=WEAPONS[a.weapon];
   if(a.windup){if(time>=a.windup.ends){const b=w.actors[a.windup.targetId];if(canAttack(w,graph,a,b,hostile)){if(ability.kind==='projectile'){if(launchProjectile(w,a,b,a.weapon))a.mana-=ability.cost;}else pending.push({a,b,weapon:ability});}a.attackReady=time+(ability?.cooldown||1);a.windup=null;a.decisionAt=0;}continue;}
   const b=w.actors[a.targetId];if(!['fleeing','cornered'].includes(a.intent)&&ability&&time>=a.attackReady&&b&&distance(a.position,b.position)<=(ability.approachRange??ability.range)&&canAttack(w,graph,a,b,hostile)){a.intent=ability.kind==='projectile'?'casting':'attacking';a.route=null;a.pathJob=null;a.windup={targetId:b.id,ends:time+ability.windup};continue;}
   // Cheap same-edge correction closes the last metre without a new full search.
   if(a.intent==='chasing'&&b?.hp>0&&distance(a.position,b.position)<(ability?.range||1)*3){const job=beginRoute(graph,a.position,b.position);if(job.status==='ready'){setRoute(a,job.result,graph);a.pathJob=null;}}
   move(a,graph,DT);
  }
  advanceProjectiles(w,graph,index,DT,pending);
  const killers=new Map();for(const hit of pending){const {a,b,weapon}=hit;if(!hit.dot&&random(w)>weapon.accuracy){e.misses++;continue;}const resistance=Math.max(0,Math.min(1,b.resistances?.[weapon.damageType]||0)),damage=(weapon.damage+(hit.bonus??a?.damageBonus??0))*(1-resistance);if(b.hp>0&&b.hp<=damage)killers.set(b.id,hit);b.hp=Math.max(0,Math.round((b.hp-damage)*10000)/10000);b.stunnedUntil=Math.max(b.stunnedUntil,time+(weapon.stagger||0));if(a&&a.id!==b.id){b.attackerId=a.id;b.threatUntil=time+10;}if(weapon.burn&&resistance<1)b.burning={sourceId:a?.id,until:time+weapon.burn.duration,dps:weapon.burn.dps};if(!hit.dot)e.hits++;}
  for(const b of actors.filter(a=>a.hp<=0&&a.intent!=='dead')){const hit=killers.get(b.id),killer=hit?.a;b.intent='dead';b.route=null;b.pathJob=null;b.windup=null;b.targetId=null;b.burning=null;if(killer)killer.kills++;if(hit?.weapon.consumes&&killer?.diet.some(t=>b.tags.includes(t))){e.consumed++;event(w,b.name+' was eaten by '+killer.name);}else{e.defeated++;event(w,b.name+' was defeated');}}
  metrics.queued=actors.filter(a=>a.pathJob).length;e.metrics=metrics;
 }
 return w;
}
export function encounterReport(w,{includeActors=true}={}){const alive=participants(w),all=Object.values(w.actors||{}).filter(a=>w.entities[a.id]?.active);return {time:w.encounter?.time||0,active:alive.length,zombies:alive.filter(a=>a.team==='undead').length,people:alive.filter(a=>a.team==='living').length,rabbits:alive.filter(a=>a.archetype==='rabbit').length,wolves:alive.filter(a=>a.archetype==='wolf').length,wizards:alive.filter(a=>a.archetype==='wizard').length,eaten:w.encounter?.consumed||0,defeated:w.encounter?.defeated||0,fighting:alive.filter(a=>['attacking','casting'].includes(a.intent)).length,fleeing:alive.filter(a=>a.intent==='fleeing').length,burning:alive.filter(a=>a.burning).length,projectiles:w.encounter?.projectiles?.length||0,casts:w.encounter?.casts||0,blocked:alive.filter(a=>a.intent==='blocked'||a.intent==='cornered').length,metrics:w.encounter?.metrics||{},actors:includeActors?all.map(a=>({id:a.id,name:a.name,team:a.team,hp:a.hp,maxHp:a.maxHp,intent:a.intent,weapon:a.weapon,target:a.targetId,kills:a.kills,temperament:a.temperament||'natural',variant:a.variant||'standard',sense:a.sense,speed:a.speed})):[]};}
export function equipPeople(world,weapon='broom'){if(!WEAPONS[weapon])throw Error('Unknown weapon');const w=structuredClone(world);for(const a of participants(w).filter(a=>a.team==='living'&&a.archetype!=='wizard')){a.weapon=weapon;a.windup=null;a.pathJob=null;a.decisionAt=0;w.entities[a.id].capabilities=['perceive','walk','attack'];}event(w,'Living people equipped with '+WEAPONS[weapon].label.toLowerCase()+'s');return w;}
export function strengthen(world,team){const w=structuredClone(world);for(const a of participants(w).filter(a=>a.team===team)){a.maxHp+=2;a.hp+=2;if(a.baseStats)a.baseStats.maxHp+=2/(a.variant==='hardy'?1.5:a.variant==='scout'?.8:1);a.damageBonus++;a.decisionAt=0;}event(w,team+' strengthened: +2 health, +1 damage');return w;}
