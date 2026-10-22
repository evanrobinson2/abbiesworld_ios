import * as T from 'three';
import {woodlandDetails} from './overland-atmosphere.mjs';
export function drawWoodlandDetails(plan,heightAt){
 const root=new T.Group(),data=woodlandDetails(plan,heightAt),dummy=new T.Object3D();root.name='Layered woodland canopy and understory';
 function batch(points,geometry,color,role,shape){if(!points.length)return;const material=new T.MeshStandardMaterial({color,roughness:1});material.userData.seasonRole=role;const mesh=new T.InstancedMesh(geometry,material,points.length);points.forEach((p,i)=>{const [sx,sy,sz,dy]=shape(p);dummy.position.set(p.x*.1,(p.y+dy)*.1,p.z*.1);dummy.rotation.set(0,p.angle,0);dummy.scale.set(sx*.1,sy*.1,sz*.1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.userData.overlandInstancing=true;root.add(mesh);}
 const pine=data.trees.filter(t=>t.pine),broad=data.trees.filter(t=>!t.pine);
 batch(data.trees,new T.CylinderGeometry(.08,.13,1,6),'#766049',null,p=>[p.size,p.size,p.size,p.size*.5]);
 for(let tier=0;tier<3;tier++)batch(pine,new T.ConeGeometry(1,1,8),['#3e6147','#54764f','#6b8657'][tier],'evergreen',p=>[p.size*(.3-tier*.055),p.size*.52,p.size*(.3-tier*.055),p.size*(.4+tier*.19)]);
 batch(broad,new T.IcosahedronGeometry(1,1),'#63844f','deciduous',p=>[p.size*.34,p.size*.4,p.size*.32,p.size*.7]);
 batch(data.shrubs,new T.IcosahedronGeometry(1,0),'#7c9660','meadow',p=>[p.size*.8,p.size*.6,p.size*.65,p.size*.4]);
 batch(data.rocks,new T.DodecahedronGeometry(1,0),'#9e9f8a',null,p=>[p.size*.8,p.size*.35,p.size*.6,p.size*.2]);
 return {root,report:{canopyTrees:data.trees.length,understory:data.shrubs.length,stones:data.rocks.length}};
}
