import {routeBetween} from '../../world-navigation.mjs';
import {syncEncounter,spawnActors,advanceEncounter,encounterReport} from '../../outbreak-simulation.mjs';
// V1 integration contract: positions in local metres, +Z entrance, stable grave/identity IDs.
export function cemeteryGraph(plan){
 const nodes={},adj={};const add=(id,x,z)=>{const k='cemetery#'+id;nodes[k]={x,y:0,z};adj[k]=[];return k;};const edge=(a,b)=>{const cost=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z);adj[a].push({id:b,cost});adj[b].push({id:a,cost});};
 for(const [i,n] of plan.nodes.entries())add(i===0?'gate':'path'+i,n.x,n.z);
 const key=i=>'cemetery#'+(i===0?'gate':'path'+i);for(const [a,b]of plan.edges)edge(key(a),key(b));
 for(const p of plan.plots){let best=null;for(const [a,b]of plan.edges){const A=plan.nodes[a],B=plan.nodes[b],dx=B.x-A.x,dz=B.z-A.z,t=Math.max(0,Math.min(1,((p.x-A.x)*dx+(p.z-A.z)*dz)/(dx*dx+dz*dz))),x=A.x+t*dx,z=A.z+t*dz,d=Math.hypot(p.x-x,p.z-z);if(!best||d<best.d)best={a,b,x,z,d};}const front=add(p.id+'-front',best.x,best.z),grave=add(p.id,p.x,p.z);edge(key(best.a),front);edge(front,key(best.b));edge(front,grave);}

 for(const n of Object.values(nodes))n.y=plan.heightAt(n.x,n.z);
 return {nodes,adj,hubs:{},obstacles:[],signature:'cemetery-v2-'+plan.signature,heightAt:plan.heightAt};
}
export function createCemeteryEvent(plan,saved,{linkedDeceased=[],extendGraph}={}){
 const graph=cemeteryGraph(plan),board={id:'cemetery-'+plan.seed,instances:[{instanceId:'cemetery',cardId:'cemetery',cardRevision:1}],cards:{'cemetery@1':{recipe:{seed:plan.seed,agents:{archetype:'zombie',count:1}}}}};
 const blank=()=>syncEncounter({seconds:0,entities:{'place/cemetery':{id:'place/cemetery',active:true,affinities:{}}},groups:{},actors:{},conditions:{season:'autumn',timeOfDay:'night',weather:'clear'},encounter:{version:1,time:0,random:plan.seed||1,nextId:0,spawned:{cemetery:true},events:[],hits:0,misses:0,consumed:0,defeated:0}},board,graph);
 const valid=saved?.version===2&&saved.signature===plan.signature&&saved.fullness===plan.fullness;
 if(extendGraph)extendGraph(graph);
 let state=valid?structuredClone(saved):{version:2,signature:plan.signature,seed:plan.seed,fullness:plan.fullness,phase:'quiet',elapsed:0,remainder:0,raised:[],world:blank()};
 function raise(fraction=.25){
  const f=Math.max(0,Math.min(1,Number(fraction)||0)),available=plan.plots.filter(p=>p.occupied&&!state.raised.some(a=>a.plotId===p.id)),n=Math.min(available.length,Math.round(plan.occupied*f));
  if(!n)return {raised:0,reason:plan.occupied?'No additional occupied graves selected.':'This cemetery is empty. No graves were created.'};
  const selected=available.sort((a,b)=>a.rank-b.rank).slice(0,n),before=new Set(Object.keys(state.world.actors));
  for(let left=n;left>0;left-=32)state.world=spawnActors(state.world,board,graph,'cemetery',Math.min(32,left),'zombie');
  const actors=Object.values(state.world.actors).filter(a=>!before.has(a.id));
  actors.forEach((a,i)=>{const p=selected[i],historical=linkedDeceased.find(d=>d.deceased===true&&d.plotId===p.id&&typeof d.id==='string'&&typeof d.name==='string'&&typeof d.sourceSimulationId==='string');
   const identity=historical?{id:historical.id,name:historical.name,provenance:'simulation-deceased',sourceSimulationId:historical.sourceSimulationId}:{id:`fictional-${plan.seed}-${p.id}`,name:['Rowan','Morgan','Ellis','Avery','Robin','Sage'][p.rank%6]+' '+['Vale','Reed','Ash','Moss','Hollow'][Math.floor(p.rank/6)%5],provenance:'generated-fictional'};
   a.position={x:p.x,y:plan.heightAt(p.x,p.z),z:p.z};a.name=identity.name;a.sourceGraveId=p.id;a.identity=identity;a.hunger='brains';a.raisedAt=state.elapsed;a.stunnedUntil=state.world.encounter.time+1.5;state.world.entities[a.id].name=a.name;state.raised.push({actorId:a.id,plotId:p.id,identity,raisedAt:state.elapsed});
  });state.phase='rising';return {raised:n,records:structuredClone(state.raised.slice(-n))};
 }
 return {graph,get world(){return state.world;},get state(){return state;},raise,
 update(dt){if(state.phase==='quiet')return;const step=Math.max(0,Math.min(.25,dt));state.elapsed+=step;state.remainder+=step;while(state.remainder>=.25){state.world=advanceEncounter(state.world,graph,.25);state.remainder-=.25;}state.phase=state.raised.some(a=>state.elapsed-a.raisedAt<1.5)?'rising':'searching';},
 setDestination(point){let routed=0;for(const a of Object.values(state.world.actors)){const route=routeBetween(graph,a.position,point);if(route){a.route={points:route.points,next:1,signature:graph.signature};a.pathJob=null;a.decisionAt=Number.MAX_VALUE;a.intent='wandering';routed++;}}return {routed,total:state.raised.length};},
 reset(){state={version:2,signature:plan.signature,seed:plan.seed,fullness:plan.fullness,phase:'quiet',elapsed:0,remainder:0,raised:[],world:blank()};},
 snapshot:()=>structuredClone(state),report(){return {phase:state.phase,raised:state.raised.length,historical:state.raised.filter(a=>a.identity.provenance==='simulation-deceased').length,generated:state.raised.filter(a=>a.identity.provenance==='generated-fictional').length,...encounterReport(state.world)};}};
}
