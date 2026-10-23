import {summitClouds} from './overland-atmosphere.mjs';
import {drawWoodlandDetails} from './overland-ecology.mjs';
import {overlandPlant} from './overland-planting.mjs';
import * as T from 'three';
import {domesticAsset} from './domestic-assets.js';
import {regionalAsset,REGIONAL} from './ranch-regional.mjs';
export async function drawOverland(plan,heightAt){
 const root=new T.Group();root.name='Authored overland places';
 const stoneMaterial=new T.MeshStandardMaterial({color:'#969b89',roughness:1});
 for(const item of plan.items){let object;
  if(item.asset==='stone'){object=new T.Mesh(new T.DodecahedronGeometry(.13,0),stoneMaterial);object.scale.set(1.6,.85,1.1);object.position.y=.06;const g=new T.Group();g.add(object);object=g;object.scale.multiplyScalar(item.size);}
  else if(REGIONAL[item.asset]){object=await overlandPlant(item.asset);object.scale.multiplyScalar(item.size);}
  else{object=await domesticAsset(item.asset);object.scale.multiplyScalar(.1*item.size);}
  object.position.set(item.x*.1,heightAt(item.x,item.z)*.1,item.z*.1);object.rotation.y=item.angle;
  object.userData.inspect={title:item.purpose,kind:'Overland scenery',description:'Modeled scenery; no new simulation behavior.'};object.userData.overlandId=item.id;root.add(object);
 }
 // Permanent high-altitude cloud banks partially conceal the complete mountain geometry.
 const clouds=new T.Group();clouds.name='Permanent summit clouds';root.add(clouds);
 const cloudMaterial=new T.MeshStandardMaterial({color:'#f4f3e8',roughness:1,flatShading:false});
 for(const c of summitClouds(heightAt.peaks||[],plan.k)){
  const cloud=new T.Mesh(new T.SphereGeometry(1,16,12),cloudMaterial);
  cloud.position.set(c.x*.1,c.y*.1,c.z*.1);cloud.scale.set(c.sx*.1,c.sy*.1,c.sz*.1);cloud.receiveShadow=true;clouds.add(cloud);
 }
 const woodland=drawWoodlandDetails(plan,heightAt);root.add(woodland.root);
 return {root,report:{version:2,woodland:woodland.report,places:plan.places,items:plan.items.length,assets:[...new Set(plan.items.map(i=>i.asset))],permanentCloudBanks:heightAt.peaks?.length||0,warnings:plan.warnings,simulation:plan.simulation}};
}
