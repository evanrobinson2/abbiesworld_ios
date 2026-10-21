// Hex container; paths precede family clusters, then later infill. Coordinates in metres.
export function planCemetery(seed=214,{fullness=0,condition=0,layout='woodland',growth='families'}={}){
 seed=Number(seed)>>>0;fullness=Math.max(0,Math.min(1,+fullness||0));condition=Math.max(0,Math.min(1,+condition||0));
 if(!['woodland','meadow','hillside'].includes(layout))layout='woodland';if(!['families','scattered','compact'].includes(growth))growth='families';
 let state=seed;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296),R=34/Math.sqrt(3);
 const boundary=Array.from({length:6},(_,i)=>({x:R*Math.cos(i*Math.PI/3),z:R*Math.sin(i*Math.PI/3)}));
 const inside=(x,z,margin=0)=>Math.abs(z)<17-margin&&Math.sqrt(3)*Math.abs(x)+Math.abs(z)<34-margin*2;
 const heightAt=(x,z)=>layout==='hillside'?(17-z)*.055+.16*Math.sin(x*.17):.16*Math.sin(x*.16+seed)*Math.sin(z*.12);
 const paths=[],nodes=[],edges=[];
 function path(points,parent=null){let prev=parent;const ids=[];for(const [x,z]of points){const id=nodes.length;nodes.push({x,z});ids.push(id);if(prev!==null){edges.push([prev,id]);paths.push({a:nodes[prev],b:nodes[id],width:prev===0?1.9:1.25});}prev=id;}return ids;}
 const bend=(random()-.5)*4;
 const trunk=path([[0,17],[1,12],[bend,7],[bend-2,2],[bend+1,-3],[bend,-8],[bend+2,-13]]);
 for(let j=0;j<5;j++){const side=j%2?1:-1,origin=trunk[2+Math.floor(j*.75)],p=nodes[origin],end={x:side*(11+random()*3),z:p.z+(random()-.5)*7},control={x:p.x+side*(3+random()*5),z:p.z+3+random()*2};const points=[];for(let k=1;k<=10;k++){const t=k/10,u=1-t;points.push([u*u*p.x+2*u*t*control.x+t*t*end.x,u*u*p.z+2*u*t*control.z+t*t*end.z]);}path(points,origin);}
 const dist=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);};
 const trees=[];for(let i=0;i<300&&trees.length<(layout==='woodland'?11:layout==='meadow'?3:6);i++){const x=(random()-.5)*34,z=(random()-.5)*30;if(inside(x,z,2)&&paths.every(p=>dist({x,z},p.a,p.b)>2)&&trees.every(t=>Math.hypot(x-t[0],z-t[1])>4))trees.push([x,z]);}
 const plots=[],spacing=growth==='compact'?2.85:growth==='scattered'?3.8:3.2;
 for(let i=0;i<8000;i++){const segment=paths[Math.floor(random()*paths.length)],t=random(),side=random()<.5?-1:1,dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,len=Math.hypot(dx,dz),offset=2.2+random()*(growth==='families'?3:1.4),x=segment.a.x+dx*t+side*dz/len*offset,z=segment.a.z+dz*t-side*dx/len*offset;
 if(!inside(x,z,2)||paths.some(p=>dist({x,z},p.a,p.b)<2)||trees.some(q=>Math.hypot(x-q[0],z-q[1])<2.4)||plots.some(p=>Math.hypot(x-p.x,z-p.z)<spacing))continue;
 const cluster=Math.floor((z+17)/7);plots.push({id:'plot-'+plots.length,x,z,w:1.75,d:2.5,yaw:Math.atan2(dx,dz)+side*Math.PI/2+(random()-.5)*.24,style:Math.floor(random()*3),wear:random(),lean:(random()-.5)*.48,age: growth==='scattered'?random()*30:Math.hypot(x-bend,z+7)+cluster*.3+random()*3});
 }
 plots.sort((a,b)=>a.age-b.age);const occupied=Math.round(plots.length*fullness);plots.forEach((p,i)=>{p.rank=i;p.occupied=i<occupied;});
 return {version:2,seed,fullness,condition,layout,growth,signature:`${seed}-${layout}-${growth}`,angle:0,width:R*2,depth:34,boundary,plots,paths,nodes,edges,occupied,capacity:plots.length,name:['Willow','Alder','Cedar','Meadow','Hollow'][seed%5]+' Cemetery',trees,heightAt};
}
