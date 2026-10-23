import * as T from '../vendor/three.module.js';
export const VARIANTS={
 'family-home-complete':{name:'Granite-footed farmhouse',kind:'house',changes:['Cream clapboard and weathered timber','Teal roofing with restrained color variation','Granite foundation courses within the original footprint']},
 'shelter-complete':{name:'Weathered working shelter',kind:'shelter',changes:['Sun-faded timber and muted teal roof','Stone footings beneath existing posts']},
 'tree-standing':{name:'Field-edge tree',kind:'tree',changes:['Varied leaf greens and gray-brown bark','Seeded crown asymmetry; trunk and root position retained']},
 'grass':{name:'Uneven meadow tuft',kind:'grass',changes:['Dry and fresh blade colors','Seeded blade heights and lean; same planting footprint']},
 'rock':{name:'Embedded granite',kind:'rock',changes:['Cool granite with subdued moss','Flatter stones sunk into their existing location']},
 'enclosure':{name:'Weathered pasture fence',kind:'fence',changes:['Uneven timber fading','Slight post-height variation; gates and rails stay in place']}
};
const materials=new Map();
export function applyVariant(root,id,{seed=1,stage='full'}={}){
 const spec=VARIANTS[id];if(!spec||stage==='original')return root;
 const bucket=((seed%8)+8)%8;let n=bucket+17;const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 root.traverse(o=>{if(!o.isMesh)return;const recolor=m=>{const role=m.userData?.dorfRole||'',hsl={};m.color?.getHSL(hsl);if(!m.color||o.userData.isWindow)return m;let target;
 if(spec.kind==='grass')target=random()<.25?'#b1a46c':'#849565';else if(spec.kind==='rock')target=random()<.25?'#788269':'#8b9090';else if(spec.kind==='fence')target=random()<.5?'#98856b':'#b3a18a';else if(role==='roof')target='#437779';else if(role==='plaster')target='#eadbb5';else if(role==='foliage')target=random()<.5?'#73854a':'#8c9b58';else if(['timber','bark'].includes(role))target='#998164';else return m;
 const key=id+':'+role+':'+m.color.getHexString()+':'+target;let next=materials.get(key);if(!next){next=m.clone();next.onBeforeCompile=m.onBeforeCompile;next.customProgramCacheKey=m.customProgramCacheKey;next.color.lerp(new T.Color(target),.65);next.roughness=.94;next.userData={...m.userData,shared:true};materials.set(key,next);}return next;};o.material=Array.isArray(o.material)?o.material.map(recolor):recolor(o.material);
 if(stage!=='full')return;
 if(spec.kind==='tree'&&o.material.userData?.dorfRole==='foliage'){const geo=o.geometry.clone(),p=geo.attributes.position;for(let i=0;i<p.count;i++){const height=Math.max(.001,size.y),y=(p.getY(i)-bounds.min.y)/height;const normals=geo.attributes.normal;if(normals){const nx=normals.getX(i),nz=normals.getZ(i),ny=normals.getY(i)-Math.cos(y*4+bucket)*size.x*.14/height*nx+Math.sin(y*3+bucket)*size.z*.105/height*nz,length=Math.hypot(nx,ny,nz)||1;normals.setXYZ(i,nx/length,ny/length,nz/length);}p.setX(i,p.getX(i)+Math.sin(y*4+bucket)*size.x*.035);p.setZ(i,p.getZ(i)+Math.cos(y*3+bucket)*size.z*.035);}if(!geo.attributes.normal)geo.computeVertexNormals();o.geometry=geo;o.userData.sharedGeometry=false;}
 if(spec.kind==='grass'){o.scale.y=.65+random()*.6;o.rotation.z+=(random()-.5)*.22;}
 if(spec.kind==='rock'){o.scale.y*=.65;o.position.y-=.018;}
 if(spec.kind==='fence'&&o.geometry.type==='BoxGeometry'&&o.geometry.parameters.height>.1)o.scale.y=.92+random()*.12;
 });
 if(stage==='full'&&['house','shelter'].includes(spec.kind)){
  // Foundations follow wall bounds, not roof overhangs or projecting planters.
  if(spec.kind==='house'){const walls=new T.Box3();root.traverse(o=>{if(o.isMesh&&o.material.userData?.dorfRole==='plaster')walls.union(new T.Box3().setFromObject(o));});if(!walls.isEmpty()){bounds.min.x=walls.min.x;bounds.max.x=walls.max.x;bounds.min.z=walls.min.z;bounds.max.z=walls.max.z;size.x=walls.max.x-walls.min.x;size.z=walls.max.z-walls.min.z;}}
  const stoneMaterial=new T.MeshStandardMaterial({color:'#92958b',roughness:1});stoneMaterial.userData={dorfRole:'stone',shared:false};const foundation=new T.Group();foundation.name='Granite footings';
  const h=size.y*.035,rows=spec.kind==='house'?2:1;
  for(let row=0;row<rows;row++)for(let i=0;i<8;i++){const x=bounds.min.x+size.x*(i+.5)/8;for(const z of [bounds.min.z+size.z*.035,bounds.max.z-size.z*.035]){if(spec.kind==='shelter'&&i>0&&i<7)continue;const m=new T.Mesh(new T.BoxGeometry(size.x/8*.94,h*.9,size.z*.07),stoneMaterial);m.position.set(x,bounds.min.y+h*(row+.5),z);m.castShadow=m.receiveShadow=true;foundation.add(m);}}root.add(foundation);
 }
 root.userData.variant={sourceId:id,recipe:'new-england-v1',seed:bucket,stage,name:spec.name};return root;
}
