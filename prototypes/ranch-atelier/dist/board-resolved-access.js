// Adapter from current, world-positioned tile plans to per-instance economic ports.
// Saved cards are never modified. Verifiers must use the same staged geometry/revision.
import {boardTiles} from './board-terrain.js';
import {assemblyObstacles} from './board-join-verifier.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const transform=(p,o,center)=>({x:center.x+o.x+p.x*Math.cos(o.angle||0)+p.z*Math.sin(o.angle||0),z:center.z+o.z-p.x*Math.sin(o.angle||0)+p.z*Math.cos(o.angle||0)});
function validProof(proof,candidate){const a=candidate.access.a,b=candidate.access.b,path=proof?.path;if(proof?.signature!==candidate.signature||proof.kind!=='pedestrian'||proof.verified!==true||proof.traversable!==true||proof.terrainChecked!==true||proof.obstructionFree!==true||!Array.isArray(path)||path.length<2||!path.every(p=>finite(p)&&Number.isFinite(p.y)))return false;const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);return distance(path[0],a)<=.05&&distance(path.at(-1),b)<=.05;}
function projection(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1);return {t,d:Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)};}
function crossing(a,b,c,d){const ux=b.x-a.x,uz=b.z-a.z,vx=d.x-c.x,vz=d.z-c.z,den=ux*vz-uz*vx;if(Math.abs(den)<1e-8)return null;const t=((c.x-a.x)*vz-(c.z-a.z)*vx)/den,u=((c.x-a.x)*uz-(c.z-a.z)*ux)/den;return t>=0&&t<=1&&u>=0&&u<=1?{x:a.x+t*ux,z:a.z+t*uz}:null;}
export function resolvedAssemblyObstacles(assembly,footprintForItem){
 const obstacles=[],warnings=[];
 for(const plan of assembly.plans)for(const placement of plan.placements){if(!placement.items){obstacles.push(...assemblyObstacles({plans:[{...plan,placements:[placement]}]}));continue;}
  // A domestic macro is a layout container, not a solid 14m building.
  for(const item of placement.items){const footprint=footprintForItem?.(item,placement,plan);if(footprint?.passable===true)continue;if(!footprint||!['box','circle'].includes(footprint.kind)){warnings.push({tileId:plan.id,placementId:placement.id,asset:item.asset,reason:'Missing item collision footprint'});continue;}const position=transform({x:item.x,z:item.z},placement,plan.center);obstacles.push({...footprint,...position,angle:(placement.angle||0)+(item.angle||0)+(footprint.angle||0)});}
 }
 return {obstacles,complete:warnings.length===0,warnings};
}
export function resolveAssemblyAccess({board,assembly,heightAt,verifySegment,clearance=.6,instanceIdByTile}){
 if(typeof heightAt!=='function')throw Error('Resolved access needs the rendered terrain sampler');
 const ownership=instanceIdByTile||Object.fromEntries(boardTiles(board).map(t=>[t.id,t.instanceId])),byId=new Map(assembly.plans.map(p=>[p.id,p])),resolvedPortsByInstance={},navigationByInstance={},warnings=[];
 for(const instance of board.instances){const plans=assembly.plans.filter(p=>ownership[p.id]===instance.instanceId),nodes=[],segments=[],targets=[],adj=[];
  const node=p=>{if(!finite(p))throw Error('Invalid resolved route point');let i=nodes.findIndex(n=>dist(n,p)<1e-5);if(i<0){i=nodes.length;nodes.push({x:p.x,z:p.z});adj.push([]);}return i;};
  const world=(p,plan)=>({x:p.x+plan.center.x,z:p.z+plan.center.z});
  for(const plan of plans){targets.push({id:plan.id+':hub',node:node(world(plan.hub,plan))});for(const path of plan.paths){if(!(path.width>=clearance*2)||!Array.isArray(path.points))continue;for(let i=1;i<path.points.length;i++){const a=world(path.points[i-1],plan),b=world(path.points[i],plan);node(a);node(b);if(dist(a,b)>1e-6)segments.push({a,b});}}
   for(const placement of plan.placements){if(placement.role==='water')continue;if(placement.accessScope==='exterior-only'){targets.push({id:placement.id+':exterior',node:placement.door?node(world(placement.door,plan)):-1});continue;}if(placement.items){if(!placement.internalPaths?.length){targets.push({id:placement.id,node:-1});continue;}for(const [index,path]of placement.internalPaths.entries())targets.push({id:placement.id+':'+index,node:path.length?node(transform(path.at(-1),placement,plan.center)):-1});}else targets.push({id:placement.id,node:placement.door?node(world(placement.door,plan)):-1});}
  }
  const portRecords=[];for(const plan of plans)for(const [index,p]of plan.ports.entries()){const neighbor=byId.get(p.neighbor);if(!neighbor||ownership[neighbor.id]===instance.instanceId)continue;const point=world(p,plan),length=dist(neighbor.center,plan.center);if(!length)continue;portRecords.push({id:plan.id+':'+p.neighbor+':'+index,point,node:node(point),direction:{x:(neighbor.center.x-plan.center.x)/length,z:(neighbor.center.z-plan.center.z)/length}});}
  for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){const p=crossing(segments[i].a,segments[i].b,segments[j].a,segments[j].b);if(p)node(p);}
  let checkedSegments=0,rejectedSegments=0;
  for(const {a,b}of segments){const split=nodes.map((p,i)=>({i,...projection(p,a,b)})).filter(p=>p.t>=-1e-6&&p.t<=1+1e-6&&p.d<1e-5).sort((a,b)=>a.t-b.t);for(let i=1;i<split.length;i++){const from=split[i-1].i,to=split[i].i,p=nodes[from],q=nodes[to],count=Math.max(1,Math.ceil(dist(p,q)/6));let valid=typeof verifySegment==='function';for(let j=0;j<count&&valid;j++){const point=t=>{const x=p.x+(q.x-p.x)*t,z=p.z+(q.z-p.z)*t;return {x,y:heightAt(x,z),z};},a=point(j/count),b=point((j+1)/count);const candidate={signature:'route:'+board.id+':'+board.revision+':'+instance.instanceId+':'+from+':'+to+':'+j,access:{a,b}};let proof;try{proof=verifySegment(candidate,board);}catch{}checkedSegments++;valid=validProof(proof,candidate);}if(valid){adj[from].push(to);adj[to].push(from);}else rejectedSegments++;}}
  const ports=portRecords.map(p=>{const reached=new Set(),queue=[p.node];while(queue.length){const i=queue.pop();if(reached.has(i))continue;reached.add(i);queue.push(...adj[i]);}const missing=targets.filter(t=>!reached.has(t.node)).map(t=>t.id),point={...p.point,y:heightAt(p.point.x,p.point.z)};const endpointCandidate={signature:'port:'+board.id+':'+board.revision+':'+p.id,access:{a:point,b:point}};let endpoint;try{endpoint=verifySegment?.(endpointCandidate,board);}catch{}const verified=plans.length>0&&targets.length>0&&missing.length===0&&!plans.some(plan=>plan.warnings?.length)&&validProof(endpoint,endpointCandidate);const result={id:p.id,kind:'pedestrian',verified,x:p.point.x,y:heightAt(p.point.x,p.point.z),z:p.point.z,direction:p.direction,routeEvidence:{boardId:board.id,boardRevision:board.revision,targets:targets.map(t=>t.id),unreachable:missing,checkedSegments,rejectedSegments}};if(!verified)warnings.push({instanceId:instance.instanceId,portId:p.id,reason:'Incomplete or non-traversable route to working entrances',unreachable:missing});return result;});
  navigationByInstance[instance.instanceId]={nodes:nodes.map(p=>({...p,y:heightAt(p.x,p.z)})),adj,targets,ports:portRecords.map(p=>({id:p.id,node:p.node}))};
  resolvedPortsByInstance[instance.instanceId]={space:'world-metres',boardId:board.id,boardRevision:board.revision,ports};
 }
 return {resolvedPortsByInstance,navigationByInstance,warnings};
}
