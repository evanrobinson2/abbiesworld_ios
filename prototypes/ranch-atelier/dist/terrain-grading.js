// Shared analytic surface: roads and pads use one bounded-grade field.
// Unaffected ground remains exactly the caller's original terrain.
export function gradeTerrain({heightAt,pads=[],paths=[],maxGrade=.18,maxEarthwork=18,shoulder=18}={}){
 if(typeof heightAt!=='function'||!(maxGrade>0&&maxGrade<=.25)||!(shoulder>0)||!Number.isFinite(shoulder)||!Number.isFinite(maxEarthwork)||maxEarthwork<0)throw Error('Invalid grading specification');
 const sites=pads.map(p=>({...p,radius:Math.max(0,p.radius||0),original:heightAt(p.x,p.z)}));
 if(sites.some(p=>![p.x,p.z,p.radius,p.original].every(Number.isFinite)||(p.height!==undefined&&!Number.isFinite(p.height))))throw Error('Invalid pad');
 const heights=sites.map(p=>p.height??p.original),edges=[];
 for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++)edges.push([i,j,maxGrade*Math.max(0,Math.hypot(sites[i].x-sites[j].x,sites[i].z-sites[j].z)-sites[i].radius-sites[j].radius)]);
 const upper=sites.map(p=>p.height??Infinity),lower=sites.map(p=>p.height??-Infinity);
 if(sites.some(p=>p.height!==undefined))for(let pass=0;pass<sites.length;pass++){let changed=false;for(const [i,j,c]of edges){const before=[upper[i],upper[j],lower[i],lower[j]];upper[i]=Math.min(upper[i],upper[j]+c);upper[j]=Math.min(upper[j],upper[i]+c);lower[i]=Math.max(lower[i],lower[j]-c);lower[j]=Math.max(lower[j],lower[i]-c);if(before.some((v,k)=>v!==[upper[i],upper[j],lower[i],lower[j]][k]))changed=true;}if(!changed)break;}
 const conflicts=sites.flatMap((p,i)=>lower[i]>upper[i]+1e-7?[{id:p.id,reason:'Fixed entrance elevations are incompatible'}]:[]);
 for(let i=0;i<heights.length;i++)heights[i]=Math.max(lower[i],Math.min(upper[i],heights[i]));
 // Shortest-path relaxation enforces compatible flat pad elevations, even
 // for chains of overlapping pads. Convergence removes ordering dependence.
 for(let pass=0;pass<sites.length;pass++){let changed=false;for(const [i,j,c]of edges){if(heights[i]>heights[j]+c){heights[i]=heights[j]+c;changed=true;}if(heights[j]>heights[i]+c){heights[j]=heights[i]+c;changed=true;}}if(!changed)break;}
 const shift=sites.length&&!sites.some(p=>p.height!==undefined)?sites.reduce((s,p,i)=>s+p.original-heights[i],0)/sites.length:0;
 for(let i=0;i<heights.length;i++)heights[i]+=shift;
 const warnings=conflicts.concat(sites.flatMap((p,i)=>Math.abs(heights[i]-p.original)>maxEarthwork?[{id:p.id,reason:'Required pad earthwork exceeds limit',metres:heights[i]-p.original}]:p.height!==undefined&&Math.abs(p.height-heights[i])>1e-6?[{id:p.id,reason:'Fixed entrance elevation conflicts with grading'}]:[]));
 if(paths.some(p=>!Array.isArray(p.points)||p.points.some(v=>!Number.isFinite(v.x)||!Number.isFinite(v.z))||(p.width!==undefined&&(!Number.isFinite(p.width)||p.width<=0))))throw Error('Invalid road');
 const segments=paths.flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b,radius:Math.max(.6,(p.width||1.4)/2)+1})));
 const distance=(x,z,s)=>{const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=Math.max(0,Math.min(1,((x-s.a.x)*dx+(z-s.a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-s.a.x-t*dx,z-s.a.z-t*dz)-s.radius;};
 // Index influence regions once. Most Board vertices are untouched hills.
 // Keep the global height envelope: distant pads can still constrain a road.
 const cellSize=48,bins=new Map();
 function indexRegion(minX,minZ,maxX,maxZ,kind,item){for(let ix=Math.floor(minX/cellSize);ix<=Math.floor(maxX/cellSize);ix++)for(let iz=Math.floor(minZ/cellSize);iz<=Math.floor(maxZ/cellSize);iz++){const key=ix+','+iz;let bin=bins.get(key);if(!bin){bin={pads:[],segments:[]};bins.set(key,bin);}bin[kind].push(item);}}
 for(const p of sites){const r=p.radius+shoulder;indexRegion(p.x-r,p.z-r,p.x+r,p.z+r,'pads',p);}
 for(const s of segments){const r=s.radius+shoulder;indexRegion(Math.min(s.a.x,s.b.x)-r,Math.min(s.a.z,s.b.z)-r,Math.max(s.a.x,s.b.x)+r,Math.max(s.a.z,s.b.z)+r,'segments',s);}
 function sample(x,z){const original=heightAt(x,z);if(!sites.length||warnings.length)return original;
  const bin=bins.get(Math.floor(x/cellSize)+','+Math.floor(z/cellSize));if(!bin)return original;
  let edge=Infinity;
  for(const p of bin.pads)edge=Math.min(edge,Math.max(0,Math.hypot(x-p.x,z-p.z)-p.radius));
  for(const s of bin.segments)edge=Math.min(edge,distance(x,z,s));
  if(edge>=shoulder)return original;
  let lower=-Infinity,upper=Infinity;
  for(let i=0;i<sites.length;i++){const p=sites[i],d=Math.max(0,Math.hypot(x-p.x,z-p.z)-p.radius);lower=Math.max(lower,heights[i]-maxGrade*d);upper=Math.min(upper,heights[i]+maxGrade*d);}
  const t=Math.max(0,edge/shoulder),blend=t*t*(3-2*t),graded=(lower+upper)/2;
  return graded*(1-blend)+original*blend;
 }
 // Refuse major cuts along a road as well as at its entrances.
 if(!warnings.length){const roadWarnings=[];for(const s of segments){const length=Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z),count=Math.max(1,Math.ceil(length/2)),nx=-(s.b.z-s.a.z)/(length||1),nz=(s.b.x-s.a.x)/(length||1);let peak=0;for(let i=0;i<=count;i++)for(const offset of [-s.radius,0,s.radius]){const x=s.a.x+(s.b.x-s.a.x)*i/count+nx*offset,z=s.a.z+(s.b.z-s.a.z)*i/count+nz*offset;peak=Math.max(peak,Math.abs(sample(x,z)-heightAt(x,z)));}if(peak>maxEarthwork)roadWarnings.push({reason:'Required road earthwork exceeds limit',metres:peak,a:s.a,b:s.b});}warnings.push(...roadWarnings);}
 return {heightAt:sample,valid:!warnings.length,warnings,pads:sites.map((p,i)=>({...p,height:heights[i]}))};
}
