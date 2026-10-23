import {cityCenters} from './city-footprint.mjs';
import {citySettings} from './city-settings.mjs';
import {DIMENSIONS} from './city-dimensions.mjs';
const point=(r,a)=>({x:Math.sin(a)*r,z:Math.cos(a)*r});
const segmentDistance=(p,a,b)=>{const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z)));return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);};
export function insideCityHex(p,r,margin=0){return Math.abs(p.x)+margin<=Math.sqrt(3)*r/2&&Math.abs(p.z)+Math.abs(p.x)/Math.sqrt(3)+margin*2/Math.sqrt(3)<=r;}
export function planCity(seed=214,options={}){
 const settings=citySettings(options),radius=settings.size/2,segments=16,rings=radius>=60?2:1;
 let n=seed>>>0;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const step=Math.sqrt(3)*radius,centers=cityCenters(settings.layout,settings.rotation,settings.size);
 const nodes=[],edges=[],placements=[],districts=[],connectors=[];
 for(let d=0;d<centers.length;d++){
  const center=centers[d],turn=random()*Math.PI*2,offset=nodes.length;
  const district={id:d,center,turn,roads:rings===2?[16,34]:[16],nodeOffset:offset};districts.push(district);
  for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){const p=point(ring?37:19,turn+i*Math.PI*2/segments);nodes.push({id:nodes.length,x:p.x+center.x,z:p.z+center.z});}
  for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++)edges.push([offset+ring*segments+i,offset+ring*segments+(i+1)%segments]);
  if(rings===2)for(let i=0;i<segments;i+=4)edges.push([offset+i,offset+segments+i]);
  placements.push({id:'civic-'+d,asset:'RC-001',...center,rotation:turn,radius:7,scale:[1,1,1],label:'District '+(d+1)+' observatory',node:offset,role:'civic',district:d});
  for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){
   if(i%4===0||random()>(ring?.5+settings.complexity*.15:.85+settings.complexity*.05))continue;
   const a=turn+i*Math.PI*2/segments,r=(ring?45:27)+(random()-.5)*settings.noise*1.6;
   const asset='RC-'+String(ring?2+Math.floor(random()*9):(random()<.6?11+Math.floor(random()*4):4+Math.floor(random()*5))).padStart(3,'0'),dim=DIMENSIONS[asset];
   const width=.85+random()*.15,sy=(Number(asset.slice(3))<11?settings.height:1)*(1+(random()-.5)*settings.noise*.5),p=point(r,a),footprint=Math.hypot(dim[0],dim[1])*width/2;
   if(!insideCityHex(p,radius,footprint+1))continue;
   const placed={id:'building-'+d+'-'+ring+'-'+i,asset,x:p.x+center.x,z:p.z+center.z,rotation:a,radius:footprint,scale:[width*(random()<.5&&settings.mirror?-1:1),sy,width],node:offset+ring*segments+i,label:(Number(asset.slice(3))>=11?'Street shop':'City residence')+' '+(placements.length+1),role:Number(asset.slice(3))>=11?'shop':'home',district:d,attachments:[]};
   if(placements.some(q=>Math.hypot(q.x-placed.x,q.z-placed.z)<q.radius+placed.radius+.65))continue;
   // Only the diner has an unobstructed broad flat roof; additions fit inside its 8.3 × 5.3 m parapet.
   const addRoll=random(),upperRoll=random();if(asset==='RC-011'&&addRoll<settings.combine){const upper=upperRoll<.55?'RC-008':'RC-015',s=upper==='RC-008'?.52:.65;placed.attachments.push({asset:upper,y:4.45,scale:[s,upper==='RC-008'?.65:s,s],support:{width:8.3,depth:5.3}});}
   placements.push(placed);
  }
 }
 // Adjacent district gateways use connected outer-ring nodes. Clear any frontage crossed by their access corridor.
 for(let a=0;a<districts.length;a++)for(let b=a+1;b<districts.length;b++){
  const da=districts[a],db=districts[b];if(Math.hypot(da.center.x-db.center.x,da.center.z-db.center.z)>step*1.01)continue;
  const nearest=(d,target)=>nodes.slice(d.nodeOffset+(rings-1)*segments,d.nodeOffset+rings*segments).reduce((best,p)=>Math.hypot(p.x-target.x,p.z-target.z)<Math.hypot(best.x-target.x,best.z-target.z)?p:best);
  const from=nearest(da,db.center),to=nearest(db,da.center);edges.push([from.id,to.id]);connectors.push({from,to});
 }
 const kept=placements.filter(p=>p.role==='civic'||!connectors.some(c=>segmentDistance(p,c.from,c.to)<p.radius+3));
 const depot=kept.find(p=>p.role==='shop')||kept.find(p=>p.role!=='civic');if(!depot)throw Error('City has no depot frontage');depot.role='depot';depot.label='Neighborhood parcel depot';
 return {seed,...settings,settings,radius,turn:districts[0].turn,nodes,edges,placements:kept,depot,destinations:kept.filter(p=>p!==depot&&p.role!=='civic'),roads:districts[0].roads,districts,connectors};
}
export function cityRoute(plan,from,target){
 const nearest=p=>plan.nodes.reduce((best,n)=>Math.hypot(n.x-p.x,n.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)?n:best,plan.nodes[0]);
 const start=nearest(from),end=typeof target==='number'?plan.nodes[target]:nearest(target),dist=plan.nodes.map(()=>Infinity),prev=[],todo=new Set(plan.nodes.map(n=>n.id));dist[start.id]=0;
 while(todo.size){let u=[...todo].reduce((a,b)=>dist[a]<dist[b]?a:b);todo.delete(u);if(u===end.id)break;for(const edge of plan.edges){if(!edge.includes(u))continue;const v=edge[0]===u?edge[1]:edge[0],a=plan.nodes[u],b=plan.nodes[v],d=dist[u]+Math.hypot(a.x-b.x,a.z-b.z);if(d<dist[v]){dist[v]=d;prev[v]=u;}}}
 const ids=[end.id];while(ids[0]!==start.id){if(prev[ids[0]]===undefined)throw Error('Disconnected city street');ids.unshift(prev[ids[0]]);}
 return ids.map(i=>({...plan.nodes[i]}));
}
