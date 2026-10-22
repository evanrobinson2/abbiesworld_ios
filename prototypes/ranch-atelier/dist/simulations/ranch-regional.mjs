import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {ranchMaterial} from './tile-materials.js';
const loader=new GLTFLoader(),cache=new Map();
export const REGIONAL={
 'WW-139':{name:'Birch',height:7,role:'deciduous'},'WW-140':{name:'Pine',height:8,role:'evergreen'},'WW-151':{name:'Maple',height:5,role:'deciduous'},'GF-153':{name:'Apple tree',height:4.5,role:'deciduous'},'WW-046':{name:'Woodland fern',height:.8,role:'meadow'},'UP-051':{name:'Pasture clover',height:.4,role:'meadow'},'GF-010':{name:'Flowered stone edging',height:.45,role:'meadow'}
};
Object.assign(REGIONAL,{"WW-147": {"name": "Oak", "height": 7, "role": "deciduous"}, "WW-148": {"name": "Beech", "height": 6, "role": "deciduous"}, "WW-273": {"name": "Blackberry bramble", "height": 1.3, "role": "meadow"}, "WW-347": {"name": "Goldenrod", "height": 1.3, "role": "meadow"}, "WW-528": {"name": "Bunchberry", "height": 0.45, "role": "meadow"}, "GF-159": {"name": "Elder shrub", "height": 2, "role": "deciduous"}, "GF-235": {"name": "Strawberry patch", "height": 0.3, "role": "meadow"}, "GF-567": {"name": "Sunflower", "height": 2, "role": "meadow"}, "GF-679": {"name": "Coneflower", "height": 1, "role": "meadow"}, "GF-250": {"name": "Pot marigold", "height": 0.65, "role": "meadow"}, "GF-249": {"name": "Borage", "height": 0.8, "role": "meadow"}, "GF-634": {"name": "Hollyhock", "height": 1.8, "role": "meadow"}, "GF-158": {"name": "Hazel", "height": 2.3, "role": "deciduous"}});
export async function regionalAsset(id){
 if(!cache.has(id))cache.set(id,loader.loadAsync('./regional-assets/'+id+'.glb').then(({scene})=>{
  const spec=REGIONAL[id],bounds=new T.Box3().setFromObject(scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  scene.position.set(-center.x,-bounds.min.y,-center.z);const root=new T.Group();root.add(scene);root.scale.setScalar(Math.min(spec.height/size.y,5/Math.max(size.x,size.z))*.1);
  const materials=new Map();
  scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.userData.sharedGeometry=true;const convert=m=>{if(materials.has(m))return materials.get(m);const green=/leaf|needle|grass|stem|flower/i.test(m.name),role=green?(spec.role==='meadow'?'groundcover':'foliage'):'timber';const src=ranchMaterial(m.color,role),next=src.clone();next.onBeforeCompile=src.onBeforeCompile;next.customProgramCacheKey=src.customProgramCacheKey;next.side=m.side;next.userData={...src.userData,shared:true,seasonRole:green?spec.role:null};materials.set(m,next);return next;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});
  root.userData.inspect={title:spec.name,kind:'Landscape',description:spec.role==='evergreen'?'Evergreen cover along the farm margin.':'Seasonal planting, kept clear of working routes.'};root.userData.asset=id;return root;
 }));return (await cache.get(id)).clone(true);
}
