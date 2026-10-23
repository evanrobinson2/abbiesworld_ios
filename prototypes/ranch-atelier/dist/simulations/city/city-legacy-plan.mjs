// Seeded street frontage. Metres; buildings face actual connected pedestrian routes.
export function planCity(seed=214,{size=120,complexity=2}={}){
 let n=seed>>>0;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const radius=Math.max(40,Number(size)/2),turn=random()*Math.PI*2,segments=16,rings=radius>=60?2:1;
 const point=(r,a)=>({x:Math.sin(a)*r,z:Math.cos(a)*r});
 const nodes=[],edges=[];for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){const a=turn+i*Math.PI*2/segments;nodes.push({id:nodes.length,...point(ring?37:19,a)});}
 for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++)edges.push([ring*segments+i,ring*segments+(i+1)%segments]);
 if(rings===2)for(let i=0;i<segments;i+=4)edges.push([i,segments+i]);
 const placements=[{id:'civic',asset:'RC-001',x:0,z:0,rotation:turn,radius:7,label:'Central observatory',node:0,role:'civic'}];
 const density=Math.max(1,Math.min(3,Number(complexity)||1));
 for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){
  if(i%4===0||random()>(ring?.5+density*.15:.85+density*.05))continue;
  const a=turn+i*Math.PI*2/segments,r=ring?45:27,asset=ring?2+Math.floor(random()*9):(random()<.6?11+Math.floor(random()*4):4+Math.floor(random()*5));
  placements.push({id:'building-'+ring+'-'+i,asset:'RC-'+String(asset).padStart(3,'0'),...point(r,a),rotation:a,radius:5.1,node:ring*segments+i,label:(asset>=11?'Street shop':'City residence')+' '+i,role:asset>=11?'shop':'home'});
 }
 const depot=placements.find(p=>p.role==='shop')||placements[1];depot.role='depot';depot.label='Neighborhood supply depot';
 const destinations=placements.filter(p=>p!==depot&&p.id!=='civic');
 return {seed,size:radius*2,radius,complexity:density,turn,nodes,edges,placements,depot,destinations,roads:rings===2?[16,34]:[16]};
}
export function cityRoute(plan,from,target){
 const nearest=p=>plan.nodes.reduce((best,n)=>Math.hypot(n.x-p.x,n.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)?n:best,plan.nodes[0]);
 const start=nearest(from),end=typeof target==='number'?plan.nodes[target]:nearest(target),dist=plan.nodes.map(()=>Infinity),prev=[],todo=new Set(plan.nodes.map(n=>n.id));dist[start.id]=0;
 while(todo.size){let u=[...todo].reduce((a,b)=>dist[a]<dist[b]?a:b);todo.delete(u);if(u===end.id)break;for(const edge of plan.edges){if(!edge.includes(u))continue;const v=edge[0]===u?edge[1]:edge[0],a=plan.nodes[u],b=plan.nodes[v],d=dist[u]+Math.hypot(a.x-b.x,a.z-b.z);if(d<dist[v]){dist[v]=d;prev[v]=u;}}}
 const ids=[end.id];while(ids[0]!==start.id){if(prev[ids[0]]===undefined)throw Error('Disconnected city street');ids.unshift(prev[ids[0]]);}
 return ids.map(i=>({...plan.nodes[i]}));
}
