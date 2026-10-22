import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {ranchMaterial} from './tile-materials.js';
import {calibratedScale,modelDimensions} from './model-calibration.js';
import {GARDEN_ASSETS,inHex} from './garden-farm.js';
export async function createGardenArt(){
const templates=new Map(),dimensions={},normalization={},catalog=await fetch('/simulation-assets/catalog.json').then(r=>{if(!r.ok)throw Error('Asset catalog unavailable');return r.json()});
let frozenScales=null;
function material(color,role='ground'){return ranchMaterial(color,role);}
function mesh(geo,color,role='ground'){const m=new T.Mesh(geo,material(color,role));m.receiveShadow=true;return m;}
function box(g,x,y,z,w,h,d,color,role='timber'){const m=mesh(new T.BoxGeometry(w,h,d),color,role);m.position.set(x,y,z);m.castShadow=true;g.add(m);return m;}
async function load(id){if(!templates.has(id))templates.set(id,(async()=>{
 if(id.startsWith('GF-')){const g=(await new GLTFLoader().loadAsync('/garden-assets/'+id+'.glb')).scene;g.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.template=true;o.userData.sharedGeometry=true;for(const m of Array.isArray(o.material)?o.material:[o.material])m.userData.shared=true;}});return g;}
 if(id==='garden-growing-plot'){
  const g=new T.Group(),bed=await load('GF-002'),plants=await Promise.all(['GF-003','GF-004','GF-005'].map(load));
  g.add(bed.clone(true));for(let j=0;j<3;j++){const plant=plants[j].clone(true);plant.position.set(-.8+j*.8,.32,0);plant.userData={purpose:'Food crop; growth and yield planned',asset:['GF-003','GF-004','GF-005'][j]};g.add(plant);}return g;
 }
 const record=catalog.find(a=>a.id===id);if(!record)throw Error('Missing asset '+id);const parts=await fetch(record.json).then(r=>{if(!r.ok)throw Error('Could not load '+id);return r.json()}),group=new T.Group();for(const p of parts){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));if(p.normals?.length===p.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(p.normals,3));else geo.computeVertexNormals();const m=mesh(geo,new T.Color().setRGB(...p.color,T.SRGBColorSpace),p.role||'plain');m.castShadow=true;m.userData.template=true;m.userData.sharedGeometry=true;group.add(m);}return group;})());return templates.get(id);}
async function refreshDimensions(){for(const id of GARDEN_ASSETS){const source=await load(id),size=new T.Box3().setFromObject(source).getSize(new T.Vector3());dimensions[id]=modelDimensions(id,size);normalization[id]=calibratedScale(id)??1;}}
function addAsset(group,id,x,y,z){return load(id).then(source=>{const asset=source.clone(true),b=new T.Box3().setFromObject(asset),c=b.getCenter(new T.Vector3()),factor=frozenScales?.[id]??calibratedScale(id)??1;asset.position.set(-c.x,-b.min.y,-c.z);const wrapper=new T.Group();wrapper.add(asset);wrapper.scale.setScalar(factor);normalization[id]=factor;wrapper.position.set(x,y,z);wrapper.userData={asset:id,purpose:'Declared by parent placement'};group.add(wrapper);return wrapper;});}
async function drawItems(group,items,{normalization:scales}={}){frozenScales=scales||null;for(const o of items){if(o.foundationDepth>.03)box(group,o.x,o.y-o.foundationDepth/2,o.z,o.w,o.foundationDepth,o.d,'#aa9677','ground');if(o.model){const a=await addAsset(group,o.model,o.x,o.y+.02,o.z);a.userData={...a.userData,id:o.id,purpose:o.purpose,simulation:o.simulation};}else if(o.role==='tool-store'){box(group,o.x,o.y+.8,o.z,1.6,1.5,.12,'#8b7455');for(const dx of [-.5,0,.5]){box(group,o.x+dx,o.y+.9,o.z+.16,.08,1.1,.08,'#c5ac7d');box(group,o.x+dx,o.y+.35,o.z+.16,.28,.16,.12,'#66716a');}}else if(o.role==='seed-store'){for(const y of [.3,.85,1.4])box(group,o.x,o.y+y,o.z,2.4,.1,1.2,'#ad8a60');for(const dx of [-1.1,1.1])box(group,o.x+dx,o.y+.8,o.z,.12,1.6,1.2,'#8b7455');for(let i=0;i<4;i++)box(group,o.x-.85+i*.55,o.y+.6,o.z,.42,.4,.6,'#c4a57b');box(group,o.x,o.y+1.65,o.z,2.4,.12,1.2,'#6e8372');}else{box(group,o.x,o.y+.85,o.z,3,.15,1.4,'#ad8a60');for(const dx of [-1.2,1.2])for(const dz of [-.5,.5])box(group,o.x+dx,o.y+.4,o.z+dz,.12,.8,.12,'#8b7455');}}

frozenScales=null;}
async function drawContext(group,next,height){
 const worker=next.items.find(o=>o.role==='bed');if(worker){await load('GF-008');const person=await addAsset(group,'GF-008',worker.interaction.x,height(worker.interaction.x,worker.interaction.z),worker.interaction.z);person.userData.purpose='Garden tender; static activity illustration, not simulated labor';}
 const beds=next.items.filter(o=>o.role==='bed'),left=Math.min(...beds.map(o=>o.x-o.w/2))-5,rear=Math.min(...beds.map(o=>o.z-o.d/2))-3,right=Math.max(...beds.map(o=>o.x+o.w/2))+3,front=Math.max(...beds.map(o=>o.z+o.d/2))+1;
 const fences=[[{x:left,z:rear},{x:right,z:rear}],[{x:left,z:rear},{x:left,z:front}]];
 const clear=(x,z,pad)=>inHex(x,z,pad)&&!next.items.some(o=>Math.abs(x-o.x)<o.w/2+pad&&Math.abs(z-o.z)<o.d/2+pad)&&!next.routes.some(r=>r.points.some(p=>Math.hypot(x-p.x,z-p.z)<r.width/2+pad));
 for(const [a,b]of fences){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/2.4);for(let i=0;i<n;i++){const p={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},q={x:a.x+(b.x-a.x)*(i+1)/n,z:a.z+(b.z-a.z)*(i+1)/n};if(![p,q,{x:(p.x+q.x)/2,z:(p.z+q.z)/2}].every(v=>clear(v.x,v.z,.8)))continue;box(group,p.x,height(p.x,p.z)+.55,p.z,.12,1.1,.12,'#a9936e').userData.purpose='decoration: garden boundary clear of working routes';for(const h of [.4,.85]){const rail=box(group,(p.x+q.x)/2,height((p.x+q.x)/2,(p.z+q.z)/2)+h,(p.z+q.z)/2,Math.hypot(q.x-p.x,q.z-p.z),.09,.08,'#ac9973');rail.rotation.y=-Math.atan2(q.z-p.z,q.x-p.x);rail.userData.purpose='decoration: garden boundary';}}}
}
await refreshDimensions();return {dimensions,normalization,refreshDimensions,addAsset,load,drawItems,drawContext};
}
