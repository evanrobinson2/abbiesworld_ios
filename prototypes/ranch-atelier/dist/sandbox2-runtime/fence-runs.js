// Simplify only runs between gate posts. Gate endpoints stay exact.
export function fenceRuns(edges,tolerance=5.5){
 const adj=new Map(),used=new Set(),out=edges.filter(e=>e.gate).map(e=>({...e}));
 edges.forEach((e,i)=>{if(e.gate)return;for(const p of e.points){const k=p.join(',');if(!adj.has(k))adj.set(k,[]);adj.get(k).push(i);}});
 const simplify=points=>{if(points.length<3)return points;const a=points[0],b=points.at(-1),dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;let best=0,index=0;for(let i=1;i<points.length-1;i++){const p=points[i],t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0,d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);if(d>best){best=d;index=i;}}return best>tolerance?[...simplify(points.slice(0,index+1)).slice(0,-1),...simplify(points.slice(index))]:[a,b];};
 const starts=[...adj.keys()].sort((a,b)=>adj.get(a).length-adj.get(b).length);
 for(const start of starts){while(adj.get(start).some(i=>!used.has(i))){let key=start,points=[start.split(',').map(Number)];for(let n=0;n<edges.length;n++){const i=adj.get(key)?.find(i=>!used.has(i));if(i===undefined)break;used.add(i);const edge=edges[i],p=edge.points.find(p=>p.join(',')!==key);key=p.join(',');points.push(p);if(key===start)break;}
 let reduced;if(points[0].join(',')===points.at(-1).join(',')){const mid=Math.floor(points.length/2);reduced=[...simplify(points.slice(0,mid+1)).slice(0,-1),...simplify(points.slice(mid))];}else reduced=simplify(points);
 for(let i=1;i<reduced.length;i++)out.push({points:[reduced[i-1],reduced[i]],gate:false});}}
 return out;
}
