import {continuousSites} from './microcosm.mjs';
import {cellCenter,RADIUS_METRES,random} from './tile-board.js';

// Affinities are data, independent of mesh generation. Distances are metres.
export const AFFINITIES={barn:{paddock:4,crop:1},store:{crop:4,ranch:1},home:{meadow:2,pond:1},shelter:{ranch:4},field:{ranch:2},enclosure:{ranch:3}};
let R=RADIUS_METRES,A=R*Math.sqrt(3)/2;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function inside(p,margin=0){for(let i=0;i<6;i++){const a=i*Math.PI/3;if(p.x*Math.cos(a)+p.z*Math.sin(a)>A-margin+1e-7)return false;}return true;}
export function route(start,end,obstacles){
 const clear=(a,b)=>obstacles.every(o=>segmentDistance(o,a,b)>=o.radius+1.1-1e-6);
 if(clear(start,end))return [start,end];
 const nodes=[start,end];for(const o of obstacles)for(let i=0;i<16;i++){const a=i*Math.PI/8,r=(o.radius+1.2)/Math.cos(Math.PI/16),p={x:o.x+Math.cos(a)*r,z:o.z+Math.sin(a)*r};if(inside(p,1)&&obstacles.every(q=>dist(p,q)>q.radius+1.1))nodes.push(p);}
 const costs=nodes.map(()=>Infinity),prev=[],done=new Set();costs[0]=0;
 for(let n=0;n<nodes.length;n++){let k=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(k<0||costs[i]<costs[k]))k=i;if(k<0||!Number.isFinite(costs[k]))break;if(k===1){const path=[];for(let j=1;j!==undefined;j=prev[j])path.unshift(nodes[j]);return path;}done.add(k);for(let j=0;j<nodes.length;j++)if(!done.has(j)&&clear(nodes[k],nodes[j])){const cost=costs[k]+dist(nodes[k],nodes[j]);if(cost<costs[j]){costs[j]=cost;prev[j]=k;}}}
 return null;
}
function requirements(type,dimensions){
 const asset=(role,model,width,extra={})=>{const d=dimensions[model]||{w:width,d:width*.7};return {role,model,w:d.w,d:d.d,radius:Math.hypot(d.w,d.d)/2,...extra};};
 if(type==='ranch')return [asset('barn','shelter-complete',16),asset('home','family-home-complete',17),asset('home','family-home-complete',17),asset('store','feed-store-complete',10)];
 if(type==='paddock')return [{role:'enclosure',w:20,d:22,radius:Math.hypot(20,22)/2},{role:'enclosure',w:20,d:22,radius:Math.hypot(20,22)/2},asset('shelter','shelter-complete',16)];
 if(type==='crop')return [asset('store','feed-store-complete',10),...Array.from({length:6},()=>({role:'field',w:9,d:12,radius:7.5}))];
 if(type==='pond')return [{role:'water',w:32,d:26,radius:21}];
 return [];
}
export function planAssembly(board,{dimensions={},dimensionsByTile={},requirementsByType={},requirementsByTile={},siteCost=()=>0,affinities=AFFINITIES,connectionTree=false}={}){
 R=RADIUS_METRES;A=R*Math.sqrt(3)/2;
 const reqs=p=>requirementsByTile[p.id]||requirementsByType[p.type]||requirements(p.type,dimensionsByTile[p.id]||dimensions);
 const rotate=(point,p)=>{const a=(p.rotation||0)*Math.PI/3;return {x:point.x*Math.cos(a)+point.z*Math.sin(a),z:-point.x*Math.sin(a)+point.z*Math.cos(a)};};
 const plans=board.tiles.map(t=>({id:t.id,type:t.type||t.id,seed:t.seed,rotation:t.rotation,cell:t.cell,center:t.center||cellCenter(t.cell),hub:{x:0,z:0},ports:[],placements:[],paths:[],trees:[],warnings:[]})),links=[];
 for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++)if(Math.abs(dist(plans[i].center,plans[j].center)-A*2)<.01)links.push({a:plans[i].id,b:plans[j].id});
 if(connectionTree){
  const parent=new Map(plans.map(p=>[p.id,p.id]));const root=id=>{while(parent.get(id)!==id)id=parent.get(id);return id;};
  // Prefer shorter useful connections, then stable seed variation for equal edges.
  const by=new Map(plans.map(p=>[p.id,p]));links.sort((a,b)=>{const cost=l=>dist(by.get(l.a).center,by.get(l.b).center)+(random(by.get(l.a).seed^by.get(l.b).seed)()*.1);return cost(a)-cost(b);});
  const tree=links.filter(l=>{const a=root(l.a),b=root(l.b);if(a===b)return false;parent.set(a,b);return true;});links.splice(0,links.length,...tree);
 }
 const byId=Object.fromEntries(plans.map(p=>[p.id,p]));
 for(const p of plans){const neighbors=links.filter(l=>l.a===p.id||l.b===p.id).map(l=>byId[l.a===p.id?l.b:l.a]);if(neighbors.length){p.hub={x:neighbors.reduce((s,n)=>s+(n.center.x-p.center.x),0)/neighbors.length*.075,z:neighbors.reduce((s,n)=>s+(n.center.z-p.center.z),0)/neighbors.length*.075};}}
 for(const p of plans){const fixed=reqs(p).filter(r=>r.anchor);if(fixed.length){const h=fixed[0].hub;if(!h||![h.x,h.z].every(Number.isFinite)||!inside(h,2)){p.warnings.push('Invalid anchored site hub');}else p.hub=rotate(h,p);}}
 for(const link of links){const a=byId[link.a],b=byId[link.b],mid={x:(a.center.x+b.center.x)/2,z:(a.center.z+b.center.z)/2},dx=b.center.x-a.center.x,dz=b.center.z-a.center.z,len=Math.hypot(dx,dz),tangent={x:-dz/len,z:dx/len};
  // Agree once on a shared crossing, sliding along the edge toward the two yards.
  const target={x:(a.center.x+a.hub.x+b.center.x+b.hub.x)/2,z:(a.center.z+a.hub.z+b.center.z+b.hub.z)/2},offset=Math.max(-16,Math.min(16,(target.x-mid.x)*tangent.x+(target.z-mid.z)*tangent.z));
  link.point={x:mid.x+tangent.x*offset,z:mid.z+tangent.z*offset};link.width=3;
  for(const [p,n]of [[a,b],[b,a]]){const port={neighbor:n.id,x:link.point.x-p.center.x,z:link.point.z-p.center.z};p.ports.push(port);p.paths.push({kind:'connector',width:3,points:[p.hub,{x:port.x,z:port.z}]});}
 }
 for(const p of plans){const rng=random(p.seed),angle=p.rotation*Math.PI/3,candidates=continuousSites(rng,R*.86);
  for(const [index,req]of reqs(p).entries()){
   if(req.anchor){
    const validPoint=v=>v&&[v.x,v.z].every(Number.isFinite);
    if(!['exterior-only','working-entrances'].includes(req.accessScope||'exterior-only')||(req.accessScope==='working-entrances'&&!req.internalPaths?.length)||!validPoint(req.anchor)||!validPoint(req.hub)||!validPoint(req.exteriorAccess)||![req.w,req.d,req.radius].every(v=>Number.isFinite(v)&&v>0)){p.warnings.push('Invalid anchored requirement for '+req.role);continue;}
    const c=rotate(req.anchor,p),door=rotate(req.exteriorAccess,p),hub=rotate(req.hub,p),length=dist(c,door);
    if(dist(hub,p.hub)>1e-6||!inside(c,req.radius+2)||!inside(door,2)||dist(c,p.hub)<=req.radius+2||(Math.abs(req.exteriorAccess.x-req.anchor.x)<req.w/2+1&&Math.abs(req.exteriorAccess.z-req.anchor.z)<req.d/2+1)||p.placements.some(o=>dist(c,o)<=req.radius+o.radius+2)){p.warnings.push('No clear anchored space for '+req.role);continue;}
    const approach={x:c.x+(door.x-c.x)/length*Math.max(length,req.radius+1.5),z:c.z+(door.z-c.z)/length*Math.max(length,req.radius+1.5)};
    p.placements.push({...req,id:p.id+'-'+index,x:c.x,z:c.z,angle:angle,door,approach,accessScope:req.accessScope||'exterior-only',reason:'Fixed anchor with authored access'});continue;
   }
   const weights=affinities[req.role]||{};let tx=0,tz=0,total=0;for(const other of plans){if(other===p)continue;const weight=weights[other.type]||0;if(!weight)continue;const d=dist(p.center,other.center);tx+=(other.center.x-p.center.x)/d*weight;tz+=(other.center.z-p.center.z)/d*weight;total+=weight;}
   const preferred=total?{x:tx/total*24,z:tz/total*24}:{x:Math.sin(angle+index*2.4)*22,z:Math.cos(angle+index*2.4)*22};
   const available=candidates.filter(c=>inside(c,req.radius+2)&&dist(c,p.hub)>req.radius+4&&p.placements.every(o=>dist(c,o)>req.radius+o.radius+2)&&p.paths.filter(path=>path.kind==='connector').every(path=>segmentDistance(c,...path.points)>req.radius+2));
   available.sort((a,b)=>(dist(a,preferred)+a.tie*.6+siteCost(p,a,req))-(dist(b,preferred)+b.tie*.6+siteCost(p,b,req)));
   if(!available.length){p.warnings.push('No clear space for '+req.role);continue;}
   const c=available[0],orientation=Math.atan2(p.hub.x-c.x,p.hub.z-c.z),dir={x:Math.sin(orientation),z:Math.cos(orientation)},item={...req,id:p.id+'-'+index,x:c.x,z:c.z,angle:orientation,reason:total?'Prefers nearby '+Object.keys(weights).join(' / '):'Faces the shared yard'};
   item.door={x:c.x+dir.x*(req.d/2),z:c.z+dir.z*(req.d/2)};item.approach={x:c.x+dir.x*(req.radius+1.5),z:c.z+dir.z*(req.radius+1.5)};p.placements.push(item);
  }
  if(p.placements.some(o=>o.anchor)){p.paths=p.paths.filter(path=>{if(path.kind!=='connector')return true;const points=route(path.points[0],path.points.at(-1),p.placements);if(!points){p.warnings.push('No clear connector around anchored site');return false;}path.points=points;return true;});}
  for(const o of p.placements){if(o.role==='water')continue;
   if(o.anchor){const points=route(p.hub,o.approach,p.placements);if(points)p.paths.push({kind:'access',to:o.id,width:2,points:[...points,o.door],accessScope:o.accessScope});else p.warnings.push('No exterior access to '+o.role);continue;}

   // Entrances face the nearest existing lane, rather than an artificial central plaza.
   const lanePoints=[p.hub];for(const lane of p.paths)for(let i=1;i<lane.points.length;i++){const a=lane.points[i-1],b=lane.points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/(dx*dx+dz*dz||1)));lanePoints.push({x:a.x+dx*t,z:a.z+dz*t});}
   lanePoints.sort((a,b)=>dist(a,o)-dist(b,o));const facing=lanePoints[0];o.angle=Math.atan2(facing.x-o.x,facing.z-o.z);const dir={x:Math.sin(o.angle),z:Math.cos(o.angle)};o.door={x:o.x+dir.x*o.d/2,z:o.z+dir.z*o.d/2};o.approach={x:o.x+dir.x*(o.radius+1.5),z:o.z+dir.z*(o.radius+1.5)};
   const starts=[p.hub];for(const existing of p.paths)for(let i=1;i<existing.points.length;i++){const a=existing.points[i-1],b=existing.points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((o.approach.x-a.x)*dx+(o.approach.z-a.z)*dz)/(dx*dx+dz*dz||1)));starts.push({x:a.x+dx*t,z:a.z+dz*t});}
   starts.sort((a,b)=>dist(a,o.approach)-dist(b,o.approach));let best=null,bestLength=Infinity;
   for(const start of starts.slice(0,5)){const path=route(start,o.approach,p.placements);if(!path)continue;const length=path.slice(1).reduce((sum,b,i)=>sum+dist(path[i],b),0);if(length<bestLength){best=path;bestLength=length;}}
   // If the nearest lane faces a blocked side, try another usable entrance.
   if(!best)for(let turn=1;turn<=12&&!best;turn++){const angle=o.angle+turn*Math.PI/6,dir={x:Math.sin(angle),z:Math.cos(angle)},approach={x:o.x+dir.x*(o.radius+1.5),z:o.z+dir.z*(o.radius+1.5)};if(!inside(approach,1)||p.placements.some(q=>q!==o&&dist(q,approach)<q.radius+1.2))continue;for(const start of starts){const trial=route(start,approach,p.placements);if(trial){best=trial;o.angle=angle;o.approach=approach;o.door={x:o.x+dir.x*o.d/2,z:o.z+dir.z*o.d/2};break;}}}
   if(best)p.paths.push({kind:'access',to:o.id,width:o.role==='field'?1.4:2,points:[...best,o.door]});else p.warnings.push('No access to '+o.role);
  }
  // Join authored outer street ends to a nearby existing lane. Only anchored
  // working districts opt in; actual item/terrain verification still decides access.
  for(const o of p.placements.filter(o=>o.anchor&&o.accessScope==='working-entrances'))for(const [internalIndex,internal]of (o.internalPaths||[]).entries())for(const local of [internal[0],internal.at(-1)]){
   if(!local||Math.hypot(local.x,local.z)<o.radius-1)continue;
   const end={x:o.x+local.x*Math.cos(o.angle)+local.z*Math.sin(o.angle),z:o.z-local.x*Math.sin(o.angle)+local.z*Math.cos(o.angle)};
   if(dist(end,o.door)<1e-6)continue;let closest=null;
   for(const lane of p.paths.filter(path=>path.kind==='connector'))for(let i=1;i<lane.points.length;i++){const a=lane.points[i-1],b=lane.points[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((end.x-a.x)*dx+(end.z-a.z)*dz)/(dx*dx+dz*dz||1))),point={x:a.x+t*dx,z:a.z+t*dz},distance=dist(end,point);if(!closest||distance<closest.distance)closest={point,distance};}
   if(closest&&closest.distance>1e-6&&closest.distance<=Math.max(6,o.radius)&&inside(end,1)&&inside(closest.point,0))p.paths.push({kind:'access',to:o.id,width:Math.max(1.4,Math.min(3,o.internalPathWidths?.[internalIndex]||1.4)),points:[end,closest.point],accessScope:'working-entrances',purpose:'through-street join'});
  }
  const treeCount=p.type==='woodland'?25:p.type==='meadow'?5:3;
  for(let i=0;i<240&&p.trees.length<treeCount;i++){const a=rng()*Math.PI*2,d=15+rng()*26,t={x:Math.cos(a)*d,z:Math.sin(a)*d,size:5+rng()*3};if(!inside(t,4)||p.placements.some(o=>dist(t,o)<o.radius+4)||p.paths.some(path=>path.points.slice(1).some((b,i)=>segmentDistance(t,path.points[i],b)<4))||p.trees.some(q=>dist(q,t)<4))continue;p.trees.push(t);}
 }
 const visited=new Set();let components=0;for(const p of plans)if(!visited.has(p.id)){components++;const queue=[p.id];while(queue.length){const id=queue.pop();if(visited.has(id))continue;visited.add(id);for(const l of links)if(l.a===id||l.b===id)queue.push(l.a===id?l.b:l.a);}}
 return {version:1,radiusMetres:R,plans,links,components,warnings:plans.flatMap(p=>p.warnings.map(w=>p.id+': '+w)),affinities};
}
