import {ASSET_BOUNDS} from './worksite-bounds.mjs';

export function seeded(seed=41){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function itemBounds(o){
 const b=o.size?[-o.size[0]/2,-o.size[2]/2,o.size[0]/2,o.size[2]/2]:ASSET_BOUNDS[o.asset];
 if(!b)throw Error('Missing reviewed footprint '+o.asset);
 const symmetric=o.size?b:[-Math.max(Math.abs(b[0]),Math.abs(b[2])),-Math.max(Math.abs(b[1]),Math.abs(b[3])),Math.max(Math.abs(b[0]),Math.abs(b[2])),Math.max(Math.abs(b[1]),Math.abs(b[3]))];
 const c=Math.cos(o.angle||0),s=Math.sin(o.angle||0),points=[];
 for(const x of [symmetric[0],symmetric[2]])for(const z of [symmetric[1],symmetric[3]])points.push([o.x+x*c+z*s,o.z-x*s+z*c]);
 return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
const union=bs=>[Math.min(...bs.map(b=>b[0])),Math.min(...bs.map(b=>b[1])),Math.max(...bs.map(b=>b[2])),Math.max(...bs.map(b=>b[3]))];
const overlap=(a,b,p=.25)=>a[0]<b[2]+p&&a[2]>b[0]-p&&a[1]<b[3]+p&&a[3]>b[1]-p;
const inside=(p,b,pad=0)=>p.x>b[0]-pad&&p.x<b[2]+pad&&p.z>b[1]-pad&&p.z<b[3]+pad;
export function segmentClear(a,b,boxes,pad=.65){const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.12);for(let k=0;k<=steps;k++){const t=k/(steps||1),p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};if(boxes.some(box=>inside(p,box,pad)))return false;}return true;}
function route(start,end,boxes,extent=7){
 const step=.5,key=(x,z)=>x+','+z,point=k=>{const [x,z]=k.split(',').map(Number);return {x:x*step,z:z*step};},s=key(Math.round(start.x/step),Math.round(start.z/step)),e=key(Math.round(end.x/step),Math.round(end.z/step));
 const open=new Set([s]),cost=new Map([[s,0]]),prev=new Map(),closed=new Set();
 while(open.size){let k,best=Infinity;for(const q of open){const p=point(q),v=cost.get(q)+Math.hypot(p.x-end.x,p.z-end.z);if(v<best){best=v;k=q;}}open.delete(k);if(k===e){const points=[];for(let q=k;q!==undefined;q=prev.get(q))points.unshift(point(q));if(!segmentClear(start,points[0],boxes)||!segmentClear(points.at(-1),end,boxes))return null;const raw=[start,...points,end].filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.z-a[i-1].z)>1e-8),smooth=[raw[0]];for(let i=0;i<raw.length-1;){let j=raw.length-1;while(j>i+1&&!segmentClear(raw[i],raw[j],boxes))j--;smooth.push(raw[j]);i=j;}return smooth;}closed.add(k);const a=point(k);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const b={x:a.x+dx*step,z:a.z+dz*step},q=key(Math.round(b.x/step),Math.round(b.z/step));if(closed.has(q)||Math.abs(b.x)>extent||Math.abs(b.z)>extent||!segmentClear(a,b,boxes))continue;const v=cost.get(k)+Math.hypot(dx,dz)*step;if(v<(cost.get(q)??Infinity)){cost.set(q,v);prev.set(q,k);open.add(q);}}}return null;
}
function groupsFor(items){
 const groups=[],used=new Set();
 // Keep supported stacks and cultivated beds together. Other equipment must earn
 // its own site; nearby coordinates in the old illustration are not a constraint.
 for(const [i,o]of items.entries()){if(used.has(i))continue;const indices=[i];used.add(i);
  if(o.asset==='GF-004'){items.forEach((q,j)=>{if(!used.has(j)&&q.asset==='GF-004'&&q.purpose===o.purpose){indices.push(j);used.add(j);}});}
  if(o.asset==='soil'){const b=itemBounds(o);items.forEach((q,j)=>{if(!used.has(j)&&q.asset==='GF-004'&&inside(q,b)){indices.push(j);used.add(j);}});}
  items.forEach((q,j)=>{if(!used.has(j)&&Math.hypot(q.x-o.x,q.z-o.z)<.01){indices.push(j);used.add(j);}});
  const members=indices.map(j=>items[j]),bounds=union(members.map(itemBounds));groups.push({members,bounds,area:(bounds[2]-bounds[0])*(bounds[3]-bounds[1]),purpose:o.purpose,order:i});
 }return groups.sort((a,b)=>b.area-a.area||a.order-b.order);
}
function zone(purpose){if(/fuel|fire|kiln|clay source|regrowth|timber/.test(purpose))return 'service';if(/shelter|shade|rest/.test(purpose))return 'shelter';if(/water|wash/.test(purpose))return 'water';if(/meal|seating|participant|serve|trading|vendor/.test(purpose))return 'social';return 'work';}
export function discoverWorksite(items,{seed=41,type,preset,index=0}={}){
 const groups=groupsFor(items),rng=seeded((seed^Math.imul(index+1,2654435761))>>>0),bias=rng()<.5?-1:1;
 // A shared arrival is kept open before work grows around it. This is a flat,
 // graded working pad; terrain suitability is still verified by Sandbox.
 const spine=[{x:0,z:7},{x:0,z:3},{x:0,z:1}],placed=[],output=[],paths=[spine],events=[];
 for(const g of groups){const category=zone(g.purpose),cx=(g.bounds[0]+g.bounds[2])/2,cz=(g.bounds[1]+g.bounds[3])/2,candidates=[];
  for(let n=0;n<850;n++){const x=(rng()*2-1)*6,z=(rng()*2-1)*5.9,dx=x-cx,dz=z-cz,b=[g.bounds[0]+dx,g.bounds[1]+dz,g.bounds[2]+dx,g.bounds[3]+dz];
   if(b[0]<-7||b[2]>7||b[1]<-7||b[3]>6.4||[[b[0],b[1]],[b[0],b[3]],[b[2],b[1]],[b[2],b[3]]].some(([x,z])=>Math.hypot(x,z)>9.8)||placed.some(p=>overlap(b,p.bounds,.32))||paths.some(path=>path.slice(1).some((v,i)=>!segmentClear(path[i],v,[b],path===spine?.85:.7))))continue;
   const peers=placed.filter(p=>p.category===category),near=peers.length?Math.min(...peers.map(p=>Math.hypot(x-p.x,z-p.z))):0;
   const target=category==='shelter'?{x:bias*1.5,z:-3.4}:category==='service'?{x:bias*4,z:-3}:category==='water'?{x:-bias*3,z:1}:category==='social'?{x:-bias*3,z:2}:{x:bias*3,z:0};
   const score=Math.hypot(x-target.x,z-target.z)+near*.45+rng()*.6;candidates.push({x,z,dx,dz,b,score});
  }
  candidates.sort((a,b)=>a.score-b.score);let c,best;
  const needsAccess=!g.members.every(o=>o.asset==='WW-001');
  for(const candidate of candidates.slice(0,70)){
   const boxes=[...placed.map(p=>p.bounds),candidate.b], [x0,z0,x1,z1]=candidate.b;
   if(!needsAccess){c=candidate;break;}
   const ends=[{x:(x0+x1)/2,z:z1+1.2},{x:x0-1.2,z:(z0+z1)/2},{x:x1+1.2,z:(z0+z1)/2},{x:(x0+x1)/2,z:z0-1.2}].filter(q=>Math.abs(q.x)<=7&&Math.abs(q.z)<=7&&!boxes.some(b=>inside(q,b,.66)));
   for(const end of ends){const starts=paths.flat().concat(spine).sort((a,b)=>Math.hypot(a.x-end.x,a.z-end.z)-Math.hypot(b.x-end.x,b.z-end.z));for(const start of starts.slice(0,2)){const r=route(start,end,boxes);if(r){best=r;break;}}if(best)break;}
   if(best){c=candidate;break;}
  }
  if(!c)throw Error('No clear working space and access for '+type+'/'+preset+': '+g.purpose);
  placed.push({x:c.x,z:c.z,bounds:c.b,category});output.push(...g.members.map(o=>({...o,x:o.x+c.dx,z:o.z+c.dz,layoutReason:category+' activity placed after '+events.length+' prior work areas'})));events.push({purpose:g.purpose,category,position:{x:c.x,z:c.z}});
  if(best)paths.push(best);
 }
 return {items:output,internalPaths:paths,internalPathWidths:paths.map((_,i)=>i===0?1.4:1.2),layout:{version:1,seed,index,method:'activity-affinity and free-space growth',events,terrain:'level working pad; board grading verified at placement'}};
}
