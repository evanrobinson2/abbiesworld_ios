import {resolveBuildingAsset,resolveAnimalAsset,resolveWorkerAsset,speciesByHabitatFromFrame} from './simulation-asset-resolver.js';
const SCALE=.1;
// Simulate first. The hex is derived from occupied space, never used as a placement grid.
export function farmEnvelope(run){
 const points=[],farmPoints=[];
 const final=run.frames.at(-1);
 for(const b of final.buildings){const q=b.footprint;if(q)farmPoints.push(...(q.polygon||[[q.x,q.z],[q.x+q.width,q.z],[q.x+q.width,q.z+q.depth],[q.x,q.z+q.depth]]));}
 for(const p of final.paddocks||[])for(const fence of p.fences||[])farmPoints.push(...fence.points);
 for(const f of run.frames){
  for(const p of f.paddocks||[])for(const fence of p.fences||[])points.push(...fence.points);
  for(const b of f.buildings){const q=b.footprint;if(q)points.push(...(q.polygon||[[q.x,q.z],[q.x+q.width,q.z],[q.x+q.width,q.z+q.depth],[q.x,q.z+q.depth]]));}
  for(const a of [...f.animals,...f.workers,...f.sources])if(a.position)points.push([a.position[0],a.position[2]]);
  for(const t of f.trails||[])points.push([t.from[0],t.from[2]],[t.to[0],t.to[2]]);
  for(const h of f.habitats||[])points.push([h.water[0],h.water[2]]);
 }
 if(!points.length)throw Error('The simulation produced no farm to frame.');
 let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;for(const [x,z]of (farmPoints.length?farmPoints:points)){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);}
 const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 // Pointy hex: all six supporting planes contain every occupied point, plus margin.
 let apothem=0;for(const [x,z]of points)for(let i=0;i<6;i++){const a=i*Math.PI/3;apothem=Math.max(apothem,(x-cx)*Math.cos(a)+(z-cz)*Math.sin(a));}
 return {cx,cz,radius:(apothem+18)*SCALE/Math.cos(Math.PI/6),scale:SCALE};
}
export function generateScene({run,index=run?.frames.length-1,envelope=null}={}){
 if(!run?.frames?.length)throw Error('Run the ranch simulation before carving the tile.');
 envelope ||= farmEnvelope(run);
 const f=run.frames[index],end=run.frames.at(-1),species=speciesByHabitatFromFrame(end),placements=[],paths=[];
 const point=p=>({x:(p[0]-envelope.cx)*SCALE,z:(p[2]-envelope.cz)*SCALE});
 const put=(id,assetId,p,scale,extra={})=>{if(assetId)placements.push({id,assetId,...point(p),scale,rotation:0,...extra});};
 for(const b of f.buildings){const q=b.footprint;if(!q)continue;const center=[q.x+q.width/2,0,q.z+q.depth/2],door=b.workPosition||center;put(b.id,resolveBuildingAsset(b,{speciesByHabitat:species}),center,Math.max(q.width,q.depth)*SCALE,{rotation:q.angle===undefined?Math.atan2(door[0]-center[0],door[2]-center[2]):-q.angle,footprint:q,stage:b.stage});}
 // Actors retain simulation positions; a tiny display fan separates co-located family members.
 const colocated=new Map();for(const w of f.workers){const key=w.position[0]+':'+w.position[2],n=colocated.get(key)||0;colocated.set(key,n+1);const p=[...w.position];if(n){p[0]+=Math.cos(n*2.4)*3;p[2]+=Math.sin(n*2.4)*3;}put(w.id,resolveWorkerAsset(w),p,w.id==='marley'?.38:.42);}
 for(const a of f.animals)put(a.id,resolveAnimalAsset(a)||(['horse','cow','goat','chicken'].includes(a.species)?a.species+'-idle':null),a.position,{horse:.7,cow:.65,goat:.45,chicken:.23}[a.species]||.4);
 for(const t of f.trails.filter(t=>t.strength>=.12))paths.push({from:point(t.from),to:point(t.to),width:Math.max(.09,t.width*SCALE),strength:t.strength});
 for(const s of f.sources)put(s.id,'wood-'+(s.stock>0?'partial':'empty'),s.position,.7);
 for(const h of f.habitats||[]){put(h.id+'-water','water-trough-'+(h.waterStock>0?'partial':'empty'),h.water,.5);const p=[...h.shelter];p[0]+=4;put(h.id+'-food',(species[h.id]==='chicken'?'ration':'hay')+'-'+(h.foodStock>0?'partial':'empty'),p,.5);}
 const inside=(x,z,pad=0)=>{for(let i=0;i<6;i++){const a=i*Math.PI/3;if(x*Math.cos(a)+z*Math.sin(a)>envelope.radius*Math.cos(Math.PI/6)-pad)return false;}return true;};
 const boxes=end.buildings.filter(b=>b.footprint).map(b=>b.footprint);
 for(const tree of run.world.vegetation||[]){const p=tree.position,pt=point([p[0],0,p[1]]);if(!inside(pt.x,pt.z,1)||boxes.some(q=>p[0]>q.x-8&&p[0]<q.x+q.width+8&&p[1]>q.z-8&&p[1]<q.z+q.depth+8))continue;put(tree.id,'tree-standing',[p[0],0,p[1]],(tree.radius||4)*SCALE*1.5);}
 const brook=run.world.water?.brook;const water=[];for(let i=1;i<(brook?.centerline.length||0);i++){const a=brook.centerline[i-1],b=brook.centerline[i],from=point([a[0],0,a[1]]),to=point([b[0],0,b[1]]);if(inside(from.x,from.z,1)&&inside(to.x,to.z,1))water.push({from,to,width:(brook.width||5)*SCALE});}
 return {seed:run.seed,envelope,placements,paths,water,paddocks:f.paddocks||[],seconds:f.seconds,index,summary:run.summary,paused:run.paused};
}

// Bilinear sample of the simulation height field, centered into display coordinates.
export function terrainHeight(run,envelope,x,z,relief=1){
 const g=run.world.terrain?.grid;if(!g)return 0;
 function sample(wx,wz){const a=Math.max(0,Math.min(g.cols-1.000001,(wx-(g.origin?.[0]||0))/g.spacing)),b=Math.max(0,Math.min(g.rows-1.000001,(wz-(g.origin?.[1]||0))/g.spacing)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=g.heights;return (h[j][i]*(1-u)+h[j][i+1]*u)*(1-v)+(h[j+1][i]*(1-u)+h[j+1][i+1]*u)*v;}
 return (sample(x/SCALE+envelope.cx,z/SCALE+envelope.cz)-sample(envelope.cx,envelope.cz))*SCALE*relief;
}
