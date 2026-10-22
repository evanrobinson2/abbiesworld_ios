import {fenceRuns} from './fence-runs.js';
// Long fence runs approximate the terrain cells; service gate openings remain exact.
export function paddockView(T,paddocks,project,height,scale=1){
 const group=new T.Group(),posts=[],rails=[],fields=[];
 for(const paddock of paddocks||[]){
  const edges=fenceRuns(paddock.fences||[]),built=paddock.stage==='complete',seen=new Set();
  for(const fence of edges){
   const a=project(fence.points[0]),b=project(fence.points[1]);
   for(const p of [a,b]){const key=p.x+','+p.z;if(seen.has(key))continue;seen.add(key);posts.push({p,h:built?1.15:.45});}
   if(built&&!fence.gate){const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/(4*scale)));for(let k=0;k<count;k++){const p={x:a.x+(b.x-a.x)*k/count,z:a.z+(b.z-a.z)*k/count},q={x:a.x+(b.x-a.x)*(k+1)/count,z:a.z+(b.z-a.z)*(k+1)/count};if(k)posts.push({p,h:1.15});rails.push({a:p,b:q});}}
  }
  // Assemble the actual boundary into loops, preserving openings in the fence only.
  const next=new Map();for(const edge of edges){const [a,b]=edge.points;for(const [p,q]of [[a,b],[b,a]]){const key=p.join(',');if(!next.has(key))next.set(key,[]);next.get(key).push(q);}}
  const used=new Set();for(const start of next.keys()){
   if(used.has(start))continue;let current=start,previous=null,loop=[];
   for(let guard=0;guard<=edges.length+1;guard++){used.add(current);loop.push(project(current.split(',').map(Number)));const choices=next.get(current)||[],following=choices.find(p=>p.join(',')!==previous);if(!following)break;previous=current;current=following.join(',');if(current===start)break;}
   if(loop.length>3){const contour=loop.map(p=>new T.Vector2(p.x,p.z)),triangles=T.ShapeUtils.triangulateShape(contour,[]);for(const tri of triangles)for(const i of tri){const p=loop[i];fields.push(p.x,height(p.x,p.z)+.025*scale,p.z);}}
  }
 }
 if(fields.length){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(fields,3));geometry.computeVertexNormals();const material=new T.MeshBasicMaterial({color:'#90a66b',transparent:true,opacity:.22,side:T.DoubleSide,depthWrite:false});group.add(new T.Mesh(geometry,material));}
 const mat=new T.MeshStandardMaterial({color:'#9b8057',roughness:1}),geo=new T.BoxGeometry(1,1,1),postMesh=new T.InstancedMesh(geo,mat,posts.length),railMesh=new T.InstancedMesh(geo,mat,rails.length*2),dummy=new T.Object3D();
 posts.forEach(({p,h},i)=>{dummy.position.set(p.x,height(p.x,p.z)+h*scale/2,p.z);dummy.rotation.set(0,0,0);dummy.scale.set(.14*scale,h*scale,.14*scale);dummy.updateMatrix();postMesh.setMatrixAt(i,dummy.matrix);});
 rails.forEach(({a,b},i)=>{for(let level=0;level<2;level++){const start=new T.Vector3(a.x,height(a.x,a.z)+(level?.85:.4)*scale,a.z),end=new T.Vector3(b.x,height(b.x,b.z)+(level?.85:.4)*scale,b.z),delta=end.clone().sub(start);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),delta.clone().normalize());dummy.scale.set(.1*scale,.12*scale,delta.length());dummy.updateMatrix();railMesh.setMatrixAt(i*2+level,dummy.matrix);}});
 group.add(postMesh,railMesh);group.userData.paddocks=paddocks?.length||0;return group;
}
export function disposePaddockView(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
