// Deterministic dressing depends on authoritative sites and routes, never moves them.
export const DRESSING_DEFAULTS={work:true,life:true,landscape:true,materials:true};
export function parcelPoint(c,u,v){return {x:c[0].x*(1-u)*(1-v)+c[1].x*u*(1-v)+c[2].x*u*v+c[3].x*(1-u)*v,z:c[0].z*(1-u)*(1-v)+c[1].z*u*(1-v)+c[2].z*u*v+c[3].z*(1-u)*v};}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function inPolygon(p,ps){let yes=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
export function routeClear(w,p,r){return w.edges.every(e=>segmentDistance(p,w.nodes.find(n=>n.id===e.a),w.nodes.find(n=>n.id===e.b))>e.width/2+r+.15);}
export function dressingPlan(w){
 const items=[],seed=w.config.seed,noise=(id)=>{let h=seed;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;};
 const safe=(p,r)=>w.tile.corners.every((a,i)=>{const b=w.tile.corners[(i+1)%6];return ((b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x))/Math.hypot(b.x-a.x,b.z-a.z)>r+.2;})&&(!w.waterfront||p.z+r<w.waterfront.bankZ-.35)&&routeClear(w,p,r);
 const add=(id,kind,pass,p,r,extra={})=>{if(items.length>=128||!safe(p,r)||items.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.radius+r+.12))return;items.push({id,kind,pass,...p,radius:r,variation:noise(id),...extra});};
 for(const s of w.stalls){
  const c=s.corners,angle=Math.atan2(c[1].z-c[0].z,c[1].x-c[0].x);
  // Stock is behind the counter; the front approach and door remain empty.
  add(s.id+'/stock','stock','work',parcelPoint(c,.31,.67),.8,{anchor:s.id,trade:s.trade,color:s.color,angle});
  if(s.id!==w.booth)add(s.id+'/seller','person','life',parcelPoint(c,.52,.64),.55,{anchor:s.id,color:s.color,angle});
  if(s.cellId%3===0)add(s.id+'/wares','wares','work',parcelPoint(c,.67,.5),.7,{anchor:s.id,trade:s.trade,color:s.color,angle});
 }
 const outside=(p,r)=>!w.cells.some(c=>inPolygon(p,c.corners)||c.corners.some((a,i)=>segmentDistance(p,a,c.corners[(i+1)%4])<r+.6))&&!w.nodes.filter(n=>['store','drop','gate'].includes(n.id)).some(n=>Math.hypot(p.x-n.x,p.z-n.z)<r+4);
 for(const e of w.boundary){const mx=(e.a.x+e.b.x)/2,mz=(e.a.z+e.b.z)/2,dx=mx-e.center.x,dz=mz-e.center.z,len=Math.hypot(dx,dz),key=[e.a.x,e.a.z,e.b.x,e.b.z].map(v=>v.toFixed(3)).sort().join(':');
  for(let k=0;k<2;k++){const distance=4+k*3.7,p={x:mx+dx/len*distance,z:mz+dz/len*distance},n=noise(key+k);const kind=k===0&&n<.2?'display':n>.43?'tree':'garden',radius=kind==='display'?1.75:kind==='tree'?2.2:1.5;if(n>.7||!outside(p,radius))continue;const nearest=w.stalls.reduce((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)<Math.hypot(b.x-p.x,b.z-p.z)?a:b);add('verge/'+key+'/'+k,kind,kind==='display'?'work':'landscape',p,radius,{anchor:nearest.id,trade:nearest.trade,color:nearest.color,angle:n*6.28});if(kind==='display'&&outside({x:p.x+dx/len*2.5,z:p.z+dz/len*2.5},.55))add('verge/'+key+'/visitor','person','life',{x:p.x+dx/len*2.5,z:p.z+dz/len*2.5},.55,{anchor:nearest.id,color:nearest.color,angle:n*6.28});}
 }
 const store=w.nodes.find(n=>n.id==='store'),drop=w.nodes.find(n=>n.id==='drop');
 for(const [id,p]of [['store-stock',{x:store.x-4.2,z:store.z-2.4}],['drop-stock',{x:drop.x,z:drop.z-3.5}]])if(!w.cells.some(c=>inPolygon(p,c.corners)))add(id,'stock','work',p,.85,{anchor:id.split('-')[0],trade:'Produce',color:'#b5946a',angle:0});
 // Quiet resting clusters occupy free ground near the approach, away from traffic.
 for(let i=0;i<1;i++){const p={x:drop.x-6-i*4,z:drop.z-6};if(outside(p,1.8))add('rest/'+i,'rest','work',p,1.8,{anchor:'drop',angle:.12*i});}
 for(const [i,uv]of [[.25,.25],[.75,.65],[.3,.8]].entries()){const p=parcelPoint(w.plaza.corners,...uv);if(Math.hypot(p.x-w.plaza.center.x,p.z-w.plaza.center.z)>2.1)add('commons/visitor-'+i,'person','life',p,.55,{anchor:'plaza',angle:i*1.5,color:['#8e9b83','#c18c69','#7c969b'][i]});}
 return {version:1,seed,passes:[{id:'materials',dependsOn:['sites']},{id:'work',dependsOn:['sites','routes']},{id:'life',dependsOn:['work','market-hours']},{id:'landscape',dependsOn:['sites','routes','work']}],items};
}

