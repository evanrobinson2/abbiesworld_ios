import * as T from 'three';
import {domesticAsset} from './domestic-assets.js';
// The water surface is visual only; the coast sampler decides traversability.
export async function drawCoastalWater(group,plan,heightAt,scale){
 const coast=heightAt.coasts?.find(c=>c.id===plan.id);if(!coast)return;
 const polygon=coast.wetPolygon,center=polygon.reduce((p,q)=>({x:p.x+q.x/polygon.length,z:p.z+q.z/polygon.length}),{x:0,z:0}),positions=[],colors=[];
 const pale=new T.Color('#83b8ad'),deep=new T.Color('#558d98');
 const vertex=(p,color)=>{positions.push((p.x-plan.center.x)*scale,(coast.waterLevel+.015)*scale,(p.z-plan.center.z)*scale);colors.push(color.r,color.g,color.b);};
 for(let i=0;i<polygon.length;i++){vertex(center,deep);vertex(polygon[i],pale);vertex(polygon[(i+1)%polygon.length],pale);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const water=new T.Mesh(geo,new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide}));water.userData.purpose='visual coastal water; non-walkable';group.add(water);
 const angle=(coast.rotation||0)*Math.PI/3,cos=Math.cos(angle),sin=Math.sin(angle),world=(x,z)=>({x:plan.center.x+x*cos+z*sin,z:plan.center.z-x*sin+z*cos});
 for(const [x,z,a]of [[0,25,.4],[15,25,-.35]]){const p=world(x,z);if(!heightAt.isWater?.(p.x,p.z))continue;const boat=await domesticAsset('CE-006');boat.position.set((p.x-plan.center.x)*scale,(coast.waterLevel+.03)*scale,(p.z-plan.center.z)*scale);boat.scale.setScalar(scale);boat.rotation.y=angle+a;boat.userData.purpose='moored boat; visual only';group.add(boat);}
 const wavePoints=[];for(let row=0;row<7;row++)for(let col=0;col<5;col++){const x=-24+col*11+(row%2)*3,z=16+row*4,a=world(x,z),b=world(x+3,z);if(heightAt.isWater?.(a.x,a.z)&&heightAt.isWater?.(b.x,b.z))wavePoints.push((a.x-plan.center.x)*scale,(coast.waterLevel+.035)*scale,(a.z-plan.center.z)*scale,(b.x-plan.center.x)*scale,(coast.waterLevel+.035)*scale,(b.z-plan.center.z)*scale);}
 const lines=new T.BufferGeometry();lines.setAttribute('position',new T.Float32BufferAttribute(wavePoints,3));group.add(new T.LineSegments(lines,new T.LineBasicMaterial({color:'#cee2c9',transparent:true,opacity:.35})));
}
