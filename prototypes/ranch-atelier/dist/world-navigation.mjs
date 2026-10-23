import {PriorityQueue} from './vendor/yuka/PriorityQueue.mjs';
// Only edges certified by the current terrain/collision verifier enter the world graph.
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function worldNavigation(resolved){
 const nodes={},adj={},hubs={},ports={};
 const key=(instance,index)=>instance+'#'+index;
 function edge(a,b){if(a===b)return;const cost=distance(nodes[a],nodes[b]);adj[a].push({id:b,cost});adj[b].push({id:a,cost});}
 for(const [instance,nav]of Object.entries(resolved.navigation||{})){
  nav.nodes.forEach((p,i)=>{const k=key(instance,i);nodes[k]=p;adj[k]=[];});
  nav.adj.forEach((ns,i)=>ns.filter(j=>j>i).forEach(j=>edge(key(instance,i),key(instance,j))));
  for(const t of nav.targets)if(t.node>=0)hubs[t.id]=key(instance,t.node);
  for(const p of nav.ports)ports[p.id]=key(instance,p.node);
 }
 for(const connection of resolved.model.connections.filter(c=>c.valid)){
  const a=ports[connection.access.a.id],b=ports[connection.access.b.id];if(!a||!b)continue;let prev=a;
  connection.path.slice(1,-1).forEach((p,i)=>{const k='join:'+a+':'+b+':'+i;nodes[k]=p;adj[k]=[];edge(prev,k);prev=k;});edge(prev,b);
 }
 // Geometry signature excludes board revisions caused only by affinity edits or clock steps.
 const geometry=JSON.stringify([nodes,adj]);let a=2166136261,b=5381;for(let i=0;i<geometry.length;i++){a=Math.imul(a^geometry.charCodeAt(i),16777619);b=Math.imul(b,33)^geometry.charCodeAt(i);}const signature=(a>>>0).toString(16)+':'+(b>>>0).toString(16)+':'+geometry.length;return {nodes,adj,hubs,signature,obstacles:resolved.projectileObstacles||[],heightAt:resolved.projectileHeightAt};
}
const indexes=new WeakMap(),CELL=32;
const cell=p=>Math.floor(p.x/CELL)+','+Math.floor(p.z/CELL);
export function navigationIndex(graph){
 const previous=indexes.get(graph);if(previous?.signature===graph.signature)return previous;
 const index={signature:graph.signature,regions:{},edges:new Map(),nodes:new Map(),edgeList:[]};
 const put=(map,k,v)=>{if(!map.has(k))map.set(k,[]);map.get(k).push(v);};
 let region=0;
 for(const id of Object.keys(graph.nodes).sort()){
  put(index.nodes,cell(graph.nodes[id]),id);
  if(index.regions[id]===undefined){const queue=[id];index.regions[id]=region;for(let i=0;i<queue.length;i++)for(const next of graph.adj[queue[i]]||[])if(index.regions[next.id]===undefined){index.regions[next.id]=region;queue.push(next.id);}region++;}
  for(const edge of graph.adj[id]||[])if(id<edge.id){const a=graph.nodes[id],b=graph.nodes[edge.id],e={a:id,b:edge.id,p:a,q:b};index.edgeList.push(e);
   for(let x=Math.floor((Math.min(a.x,b.x)-.05)/CELL);x<=Math.floor((Math.max(a.x,b.x)+.05)/CELL);x++)for(let z=Math.floor((Math.min(a.z,b.z)-.05)/CELL);z<=Math.floor((Math.max(a.z,b.z)+.05)/CELL);z++)put(index.edges,x+','+z,e);
  }
 }
 indexes.set(graph,index);return index;
}
export function attachPosition(graph,p){
 if(!p)return {anchors:[],edges:[]};const index=navigationIndex(graph),anchors=new Map(),edges=[];
 for(const id of index.nodes.get(cell(p))||[])if(distance(graph.nodes[id],p)<.03)anchors.set(id,0);
 for(const e of index.edges.get(cell(p))||[]){const a=e.p,b=e.q,dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;if(!den)continue;const t=((p.x-a.x)*dx+(p.z-a.z)*dz)/den;if(t<-.0001||t>1.0001)continue;const y=a.y+(b.y-a.y)*t;if(Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t)>.03||Math.abs(p.y-y)>.2)continue;
  edges.push(e);for(const id of [e.a,e.b])anchors.set(id,distance(p,graph.nodes[id]));
 }
 return {anchors:[...anchors].map(([id,cost])=>({id,cost})),edges};
}
export function nearbyNodes(graph,position,radius,limit=12){const index=navigationIndex(graph),result=[],n=Math.ceil(radius/CELL),cx=Math.floor(position.x/CELL),cz=Math.floor(position.z/CELL);for(let x=cx-n;x<=cx+n;x++)for(let z=cz-n;z<=cz+n;z++)for(const key of index.nodes.get(x+','+z)||[]){const d=distance(position,graph.nodes[key]);if(d<=radius)result.push({key,p:graph.nodes[key],distance:d});}return result.sort((a,b)=>a.distance-b.distance||a.key.localeCompare(b.key)).slice(0,limit);}
const compare=(a,b)=>a.f-b.f||a.g-b.g||a.id.localeCompare(b.id);
export function beginRoute(graph,from,to,{limit=Number.MAX_VALUE}={}){
 const start=attachPosition(graph,from),finish=attachPosition(graph,to),index=navigationIndex(graph);
 const job={signature:graph.signature,from:{...from},to:{...to},limit,status:'searching',open:[],costs:{},parents:{},goals:Object.fromEntries(finish.anchors.map(a=>[a.id,a.cost]))};
 if(distance(from,to)>limit||!start.anchors.some(a=>finish.anchors.some(b=>index.regions[a.id]===index.regions[b.id]))){job.status='blocked';return job;}
 if(start.edges.some(e=>finish.edges.includes(e))){job.status='ready';job.result={points:[{...from},{...to}],distance:distance(from,to)};return job;}
 const queue=new PriorityQueue(compare);
 for(const a of start.anchors){job.costs[a.id]=a.cost;queue.push({id:a.id,g:a.cost,f:a.cost+distance(graph.nodes[a.id],to)});}
 job.open=queue.data;return job;
}
export function stepRoute(graph,job,budget){
 if(job.signature!==graph.signature){job.status='cancelled';return 0;}if(job.status!=='searching')return 0;
 const queue=new PriorityQueue(compare);queue.data=job.open;queue.length=queue.data.length;let used=0;
 while(queue.length&&used<budget){const current=queue.pop();used++;if(current.g!==job.costs[current.id])continue;if(current.f>job.limit){job.status='blocked';break;}
  if(Object.hasOwn(job.goals,current.id)){
   const ids=[current.id];while(job.parents[ids[0]])ids.unshift(job.parents[ids[0]]);
   const points=[job.from];for(const id of ids)if(distance(points.at(-1),graph.nodes[id])>.00001)points.push(graph.nodes[id]);if(distance(points.at(-1),job.to)>.00001)points.push(job.to);
   job.result={points,distance:current.g+job.goals[current.id],ids};job.status='ready';break;
  }
  for(const edge of graph.adj[current.id]||[]){const g=current.g+edge.cost;if(g>job.limit||g>=(job.costs[edge.id]??Infinity))continue;job.costs[edge.id]=g;job.parents[edge.id]=current.id;queue.push({id:edge.id,g,f:g+distance(graph.nodes[edge.id],job.to)});}
 }
 if(!queue.length&&job.status==='searching')job.status='blocked';return used;
}
export function routeBetween(graph,from,to,options){const job=beginRoute(graph,from,to,options);while(job.status==='searching')stepRoute(graph,job,1024);return job.result||null;}
export function shortestPath(graph,from,to){if(!graph.nodes[from]||!graph.nodes[to])return null;return routeBetween(graph,graph.nodes[from],graph.nodes[to]);}
export function placeRoute(world,graph,from,to){return shortestPath(graph,graph.hubs[world.entities[from]?.hub],graph.hubs[world.entities[to]?.hub]);}
export function routeFromPosition(graph,position,to){return graph.nodes[to]?routeBetween(graph,position,graph.nodes[to]):null;}
