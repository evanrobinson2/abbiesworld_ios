import * as T from 'three';
import {regionalAsset} from './ranch-regional.mjs';
const treeIds=new Set(['WW-139','WW-140','WW-147','WW-148','WW-151','GF-153']),materials=new Map();
function material(color,role){const key=color+role;if(!materials.has(key)){const m=new T.MeshStandardMaterial({color,roughness:1});m.userData={shared:true,seasonRole:role};materials.set(key,m);}return materials.get(key);}
// The stock branchwork remains; large connected crowns carry its species silhouette at map scale.
export async function overlandPlant(id){
 const stock=await regionalAsset(id);if(!treeIds.has(id))return stock;
 const group=new T.Group();group.add(stock);const bounds=new T.Box3().setFromObject(stock),h=bounds.max.y,evergreen=id==='WW-140',role=evergreen?'evergreen':'deciduous';
 const crown=(geometry,color,x,y,z)=>{const o=new T.Mesh(geometry,material(color,role));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
 if(evergreen)for(let tier=0;tier<3;tier++){const o=crown(new T.ConeGeometry(h*(.27-tier*.055),h*(.49-tier*.05),8),['#45694b','#52774e','#688752'][tier],0,h*(.43+tier*.19),0);o.rotation.y=tier*.7;}
 else{const palette=id==='GF-153'?['#72944e','#87a352','#648744']:id==='WW-139'?['#7e9c60','#98af6e','#6c8b51']:['#547b4d','#6b8e53','#789955'];
  for(const [i,[x,y,z,r]]of [[0,.72,0,.28],[-.19,.63,.04,.25],[.19,.68,.04,.26],[.04,.81,-.09,.23],[0,.58,.18,.24]].entries()){const o=crown(new T.IcosahedronGeometry(h*r,1),palette[i%3],x*h,y*h,z*h);o.scale.y=.88;}
  if(id==='GF-153')for(let i=0;i<6;i++){const a=i*2.4;const apple=new T.Mesh(new T.SphereGeometry(h*.035,6,5),material('#b86d45','deciduous'));apple.position.set(Math.cos(a)*h*.26,h*(.58+(i%3)*.08),Math.sin(a)*h*.25);group.add(apple);}
 }
 group.userData={...stock.userData};return group;
}
