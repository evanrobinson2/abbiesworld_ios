import * as T from 'three';
// A flat civic platform with a narrow graded apron meets the existing terrain exactly at the hex boundary.
export function withCityTerrain(base,tiles,diameter){const cities=tiles.filter(t=>t.type==='city'),radius=diameter/2;return (x,z)=>{for(const t of cities){const dx=Math.abs(x-t.center.x),dz=Math.abs(z-t.center.z),fraction=Math.max(dx/(Math.sqrt(3)*radius/2),(dz+dx/Math.sqrt(3))/radius);if(fraction>1)continue;const root=tiles.find(p=>p.id===t.placement?.clusterParent)||t,h=base(root.center.x,root.center.z),a=Math.max(0,Math.min(1,(fraction-.96)/.04)),blend=a*a*(3-2*a);return h*(1-blend)+base(x,z)*blend;}return base(x,z);};}
export function terrainGeometry(radius,center,tileCenter,heightAt,baseHeight){const vertices=[],indices=[],rings=[0,.96,1],count=48;
 for(const scale of rings)for(let i=0;i<count;i++){const edge=Math.floor(i/8),f=(i%8)/8,a=edge*Math.PI/3,b=(edge+1)*Math.PI/3,x=center.x+radius*scale*(Math.sin(a)*(1-f)+Math.sin(b)*f),z=center.z+radius*scale*(Math.cos(a)*(1-f)+Math.cos(b)*f);vertices.push(x,heightAt(tileCenter.x+x,tileCenter.z+z)-baseHeight,z);}
 for(let ring=0;ring<2;ring++)for(let i=0;i<count;i++){const a=ring*count+i,b=ring*count+(i+1)%count,c=a+count,d=b+count;indices.push(a,c,b,b,c,d);}
 for(let i=0;i<count;i++){const j=2*count+i;vertices.push(vertices[j*3],vertices[j*3+1]-.9,vertices[j*3+2]);}
 for(let i=0;i<count;i++){const a=2*count+i,b=2*count+(i+1)%count,c=a+count,d=b+count;indices.push(a,b,c,b,d,c);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
