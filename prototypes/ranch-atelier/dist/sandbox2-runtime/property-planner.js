/* Terrain-led ranch planning. Distances and land budgets are game parameters. */
(function(root){
'use strict';
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
class Heap{constructor(){this.a=[]}push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].score<=v.score)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].score<this.a[c].score)c++;if(this.a[c].score>=last.score)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return first;}}
function polygon(b,pad=0){const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0),w=b.width/2+pad,d=b.depth/2+pad;return [[-w,-d],[w,-d],[w,d],[-w,d]].map(([x,z])=>[b.cx+x*c-z*s,b.cz+x*s+z*c]);}
function contains(b,x,z,pad=0){if(b.cx===undefined)return x>b.x-pad&&x<b.x+b.w+pad&&z>b.y-pad&&z<b.y+b.h+pad;const c=Math.cos(b.angle||0),s=Math.sin(b.angle||0),dx=x-b.cx,dz=z-b.cz;return Math.abs(dx*c+dz*s)<b.width/2+pad&&Math.abs(-dx*s+dz*c)<b.depth/2+pad;}
function intersects(a,b,pad=0){const pa=polygon(a,pad),pb=polygon(b);for(const poly of [pa,pb])for(let i=0;i<4;i++){const p=poly[i],q=poly[(i+1)%4],axis=[p[1]-q[1],q[0]-p[0]],aa=pa.map(p=>p[0]*axis[0]+p[1]*axis[1]),bb=pb.map(p=>p[0]*axis[0]+p[1]*axis[1]);if(Math.max(...aa)<=Math.min(...bb)||Math.max(...bb)<=Math.min(...aa))return false;}return true;}
function box(spec,p,angle){const b={...spec,cx:p[0],cz:p[1],width:spec.w,depth:spec.h,angle},poly=polygon(b),xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);return {...b,x:Math.min(...xs),y:Math.min(...zs),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...zs)-Math.min(...zs),polygon:poly};}
function boundary(points,gate){const set=new Set(points.map(p=>p.join(','))),segments=[];for(const [x,z]of points)for(const [dx,dz,a,b]of [[-4,0,[x-2,z-2],[x-2,z+2]],[4,0,[x+2,z-2],[x+2,z+2]],[0,-4,[x-2,z-2],[x+2,z-2]],[0,4,[x-2,z+2],[x+2,z+2]]])if(!set.has([x+dx,z+dz].join(',')))segments.push({points:[a,b],gate:false});if(gate&&segments.length){let closest=segments.reduce((a,b)=>distance(a.points[0].map((v,i)=>(v+a.points[1][i])/2),gate)<distance(b.points[0].map((v,i)=>(v+b.points[1][i])/2),gate)?a:b);closest.gate=true;}return segments;}
function plan(input,environment){
 const config={seed:43,size:540,horses:6,mode:'grazing',...input},env=environment(config.seed,config.size,config.topology),size=config.size,trees=env.w.vegetation,buildings=[],events=[],failures=[];
 const treeCost=(x,z)=>trees.reduce((n,t)=>n+(distance([x,z],t.position)<t.radius+3?1:0),0);
 const suitable=(x,z)=>env.dry(x,z)&&Math.abs(z-env.waterY(x))>19&&env.slope(x,z)<.09&&x>size*.12&&x<size*.88&&z<size*.86;
 const grade=b=>{const points=[...polygon(b),[b.cx,b.cz]],heights=points.map(p=>env.height(...p));return Math.max(...heights)-Math.min(...heights);};
 const feasible=b=>polygon(b,3).every(p=>suitable(...p)&&!treeCost(...p))&&grade(b)<Math.min(b.width,b.depth)*.09&&!buildings.some(a=>intersects(a,b,config.buildingGap??8));
 const barnSpec={id:'shelter',name:'Barn and turnout shelter',w:28,h:16,wood:180,work:70,capacity:config.horses};
 const sites=[];
 for(let z=40;z<size*.8;z+=12)for(let x=size*.2;x<size*.8;x+=12){
   if(!suitable(x,z)||treeCost(x,z))continue;
   const gx=env.height(x+6,z)-env.height(x-6,z),gz=env.height(x,z+6)-env.height(x,z-6);
   let angle=Math.atan2(gx,-gz); // Long wall follows the local contour.
   const facing=[-Math.sin(angle),Math.cos(angle)],side=Math.sign(z-env.waterY(x));
   if(facing[1]*side>0)angle+=Math.PI; // Turnout toward the open meadow; services on the outer side.
   const b=box(barnSpec,[x,z],angle);if(!feasible(b))continue;
   const front=[-Math.sin(angle),Math.cos(angle)],gate=[x+front[0]*25,z+front[1]*25];
   let land=0;for(let dz=-80;dz<=80;dz+=16)for(let dx=-80;dx<=80;dx+=16){const p=[gate[0]+dx,gate[1]+dz];if(suitable(...p)&&!treeCost(...p)&&Math.sign(p[1]-env.waterY(p[0]))===side)land++;}
   if(land<45||!suitable(...gate))continue;
   const score=grade(b)*55+Math.abs(Math.abs(z-env.waterY(x))-100)*.12+distance([x,z],[size*.5,size*.35])*.045-land*.8;
   sites.push({b,front,gate,score});
 }
 sites.sort((a,b)=>a.score-b.score);const site=sites[Math.min(config.coreRank||0,sites.length-1)];
 if(!site)return {config,valid:false,failures:['No dry barn site with connected turnout'],pasture:{area:0,target:1},paths:[]};
 const barn=site.b,front=site.front,side=[Math.cos(barn.angle),Math.sin(barn.angle)],gateHint=site.gate;
 const local=(across,along)=>[barn.cx+side[0]*across+front[0]*along,barn.cz+side[1]*across+front[1]*along];
 const core=local(-10,-23);barn.door=local(0,-barn.depth/2-5);barn.turnout=local(0,barn.depth/2+5);buildings.push(barn);
 events.push({agent:'site',action:'site-barn',position:[barn.cx,barn.cz],reason:'Contour-aligned dry footprint beside usable turnout; rear service access separated from animals.'});
 const specs=[
  {id:'feed',name:'Feed store',w:12,h:10,wood:70,work:25,target:local(-29,-14),anchor:barn.door},
  {id:'water',name:'Water supply point',w:8,h:8,wood:25,work:15,target:local(27,12),anchor:barn.turnout},
  {id:'abbie-home',name:'Abbie’s family home',w:18,h:16,beds:4,wood:150,work:60,target:local(-35,-58),anchor:core},
  {id:'ani-home',name:'Ani’s family home',w:18,h:16,beds:4,wood:150,work:60,target:local(22,-67),anchor:core},
  {id:'garden',name:'Kitchen garden',w:20,h:16,wood:30,work:20,target:local(-55,-75),anchor:null}
 ];
 for(const spec of specs){
  const home=buildings.find(b=>b.id==='abbie-home');if(spec.id==='garden'){spec.anchor=home.door;spec.target=[home.cx-side[0]*29,home.cz-side[1]*29];}
  let best;
  for(let radius=0;radius<=45;radius+=9)for(let k=0;k<(radius?24:1);k++){
   const p=[spec.target[0]+Math.cos(k*Math.PI/12)*radius,spec.target[1]+Math.sin(k*Math.PI/12)*radius];
   const towards=Math.atan2(spec.anchor[1]-p[1],spec.anchor[0]-p[0])-Math.PI/2;
   for(const angle of [towards,barn.angle,barn.angle+.25,barn.angle-.25]){
    const b=box(spec,p,angle);if(!feasible(b))continue;
    if((p[0]-barn.cx)*front[0]+(p[1]-barn.cz)*front[1]>20&&spec.beds)continue;
    const score=distance(p,spec.target)+grade(b)*80+distance(p,spec.anchor)*.15;
    if(!best||score<best.score)best={b,score};
   }
  }
  if(!best){failures.push('No suitable '+spec.id+' site');continue;}
  const b=best.b,doors=[[0,b.depth/2+5],[0,-b.depth/2-5],[b.width/2+5,0],[-b.width/2-5,0]].map(([x,z])=>[b.cx+x*Math.cos(b.angle)-z*Math.sin(b.angle),b.cz+x*Math.sin(b.angle)+z*Math.cos(b.angle)]);
  doors.sort((a,b)=>distance(a,spec.anchor)-distance(b,spec.anchor));b.door=doors[0];buildings.push(b);
  events.push({agent:spec.id,action:'reserve-site',position:[b.cx,b.cz],reason:spec.beds?'Dry domestic ground away from turnout traffic.':spec.id==='garden'?'Short household access on workable ground.':'Short service access to the barn and turnout gate.'});
 }
 if(failures.length)return {config,core,buildings,valid:false,failures,pasture:{area:0,target:1},paths:[]};
 const n=Math.floor(size/4),point=k=>[(k%n)*4+2,Math.floor(k/n)*4+2],cell=p=>Math.max(0,Math.min(n-1,Math.floor(p[0]/4)))+Math.max(0,Math.min(n-1,Math.floor(p[1]/4)))*n;
 const blocked=new Uint8Array(n*n),heights=new Float32Array(n*n),treeWeights=new Uint8Array(n*n);
 for(let k=0;k<n*n;k++){const p=point(k);blocked[k]=!env.dry(...p)||env.slope(...p)>.15||buildings.some(b=>contains(b,...p,1.2));heights[k]=env.height(...p);treeWeights[k]=Math.min(10,treeCost(...p));}
 const road=new Set();
 function route(start,goal){
  const s=cell(start),g=cell(goal);if(blocked[s]||blocked[g])return null;const cost=new Float64Array(n*n).fill(Infinity),prev=new Int32Array(n*n).fill(-1),heap=new Heap();cost[s]=0;heap.push({k:s,score:0});
  while(heap.a.length){const {k}=heap.pop();if(k===g){const out=[];for(let at=g;at!==-1;at=prev[at])out.push(point(at));return out.reverse();}
   const x=k%n,z=Math.floor(k/n);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz,j=xx+zz*n;if(xx<0||zz<0||xx>=n||zz>=n||blocked[j]||dx&&dz&&(blocked[k+dx]||blocked[k+dz*n]))continue;
    const step=4*Math.hypot(dx,dz),value=cost[k]+step*(road.has(j)?.65:1)+Math.abs(heights[j]-heights[k])*12+treeWeights[j]*3;
    if(value<cost[j]){cost[j]=value;prev[j]=k;heap.push({k:j,score:value+distance(point(j),point(g))*.65});}
   }
  }return null;
 }
 const paths=[],connect=(id,a,b,width=3)=>{const points=route(a,b);if(!points){failures.push('Unreachable '+id);return;}points.forEach(p=>road.add(cell(p)));paths.push({id,points,width,length:points.slice(1).reduce((s,p,i)=>s+distance(p,points[i]),0)});};
 for(const b of buildings){const anchor=b.id==='shelter'||b.id==='feed'?core:b.id==='water'?barn.turnout:b.id==='garden'?buildings.find(b=>b.id==='abbie-home').door:core;connect(b.id,anchor,b.door);}
 connect('barn-turnout',barn.door,barn.turnout);
 const entry=[core[0],core[1]<env.waterY(core[0])?10:size-10];connect('entry',core,entry,4);
 const available=k=>{const p=point(k),along=(p[0]-barn.cx)*front[0]+(p[1]-barn.cz)*front[1];return !blocked[k]&&!road.has(k)&&!treeWeights[k]&&env.dry(...p)&&Math.abs(p[1]-env.waterY(p[0]))>19&&env.slope(...p)<.14&&p.every(v=>v>8&&v<size-8)&&Math.sign(p[1]-env.waterY(p[0]))===Math.sign(barn.cz-env.waterY(barn.cx))&&along>-25&&!buildings.some(b=>contains(b,...p,5));};
 const candidates=[];for(let k=0;k<n*n;k++)if(available(k))candidates.push(k);candidates.sort((a,b)=>distance(point(a),gateHint)-distance(point(b),gateHint));
 const target=config.mode==='grazing'?config.horses*8094:config.horses*500;let cells=[],gateRoute;
 for(const seed of candidates.slice(0,8)){
  const queue=new Heap(),seen=new Set([seed]),out=[];queue.push({k:seed,score:0});
  while(queue.a.length&&out.length*16<target){const {k}=queue.pop();out.push(k);const x=k%n,z=Math.floor(k/n);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,zz=z+dz,j=xx+zz*n;if(xx<0||zz<0||xx>=n||zz>=n||seen.has(j)||!available(j))continue;seen.add(j);queue.push({k:j,score:distance(point(j),point(seed))+Math.abs(heights[j]-heights[seed])*25+env.slope(...point(j))*150});}}
  if(out.length>cells.length){const path=route(barn.turnout,point(seed));if(path){cells=out;gateRoute=path;}}if(cells.length*16>=target)break;
 }
 if(cells.length*16<target)failures.push('Insufficient connected grazing reserve');
 const pasture={cells:cells.map(point),area:cells.length*16,target,gate:gateRoute?.at(-1),cellSize:4};pasture.fences=boundary(pasture.cells,pasture.gate);
 // The exact shared grid edge is the crossing used by the animal graph.
 if(gateRoute){const a=gateRoute.at(-2),b=gateRoute.at(-1);if(a&&b){for(const f of pasture.fences)f.gate=distance(f.points[0].map((v,i)=>(v+f.points[1][i])/2),a.map((v,i)=>(v+b[i])/2))<.1;}paths.push({id:'pasture',points:gateRoute,width:3,length:gateRoute.length*4});}
 const property={version:2,barn:{center:[barn.cx,barn.cz],turnout:barn.turnout,service:barn.door},depot:core,domestic:buildings.filter(b=>b.beds).map(b=>[b.cx,b.cz]),reserve:{area:pasture.area,target:pasture.target},rationale:events};
 const world={...env.w,grown:true,property,paths,buildings:buildings.map(b=>({...b,kind:b.beds?'house':'barn'}))};
 return {config,core,yard:{x:core[0]-4,y:core[1]-4,w:8,h:8},buildings,pasture,paths,world,events,failures,valid:!failures.length,route,jobs:buildings.map(b=>({id:b.id,position:b.door,wood:b.wood,work:b.work,remaining:b.work}))};
}
function allocateHabitat(s,species,count,space,attempt=0){
 const required=Math.ceil(space*count*8),anchor=species==='chicken'?(s.property?.domestic?.[0]||s.property?.depot):s.property?.barn?.turnout;
 const free=Object.keys(s.nodes).filter(k=>s.nodes[k].pasture&&!s.reserved[k]);if(!anchor)return null;
 const score=k=>distance(s.nodes[k].p,anchor)+s.env.slope(...s.nodes[k].p)*(species==='goat'?40:350);
 free.sort((a,b)=>score(a)-score(b));
 for(const seed of free.slice(attempt*24,attempt*24+24)){
  const heap=new Heap(),seen=new Set([seed]),out=[];heap.push({k:seed,score:0});
  while(heap.a.length&&out.length<required){const {k}=heap.pop();out.push(k);for(const e of s.nodes[k].edges)if(s.nodes[e.to].pasture&&!s.reserved[e.to]&&!seen.has(e.to)){seen.add(e.to);heap.push({k:e.to,score:distance(s.nodes[e.to].p,s.nodes[seed].p)+Math.abs(s.env.height(...s.nodes[e.to].p)-s.env.height(...s.nodes[seed].p))*30});}}
  if(out.length===required)return out;
 }return null;
}
root.FarmProperty={plan,contains,intersects,polygon,boundary,allocateHabitat,Heap};if(typeof module!=='undefined')module.exports=root.FarmProperty;
})(globalThis);
