// Remaster wave 1 kits (docs/oracle/remaster/REMASTER_STUDY.md rows R2 and R4), built in tools/ranch-rebuild/models
// and copied to /ranch-kits/ by tools/ranch-rebuild/to_game.py. Both model styles use them (no charming twin).
//  * kitchenGarden(): the Ranch tile's 6 x 5 m kitchen garden as a grid of real-scale raised beds with a crop on every
//    crop_slot_* empty. Repeats are InstancedMeshes (one per kit part), so 9 beds and 54 crops cost about 20 draw calls.
//  * lampKit(): the four lamps for simulations/ranch-lights.mjs (crook lantern, post lantern, porch lamp, string lights).
import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {ranchMaterial} from './tile-materials.js';

const loader=new GLTFLoader(),files=new Map();
export const CROP_STAGES=['sprout','growing','ripe','thirsty'];
export const LAMP_KINDS=['crook-lantern','post-lantern','porch-lamp','string-lights'];
// Warm glass of every lamp (#ffc56b). Lit lamps set emissiveIntensity to this; unlit ones to 0.
export const LAMP_GLOW=1.6;

// Shading role from the modeller's material name (same words as tools/ranch-rebuild/MODELER.md). Leaves and stems
// take the meadow season tint; Wilted_Brown (#968241, the thirsty crop) and Fruit_Gold stay as modelled in every season.
function roleOf(name){
 const n=name.toLowerCase();
 if(/wilted/.test(n))return 'plain';
 for(const [role,pattern]of [['groundcover',/leaf|stem/],['food',/fruit/],['ground',/soil/],['metal',/iron|metal|zinc|brass/],['fiber',/rope|twine|straw|hay/],['timber',/timber|plank|post|stake|wood/]])if(pattern.test(n))return role;
 return 'plain';
}
function kitMaterial(m){
 if(/glass/i.test(m.name)){const glass=new T.MeshStandardMaterial({name:m.name,color:'#ffc56b',emissive:'#ffc56b',emissiveIntensity:0,roughness:.32});glass.userData={lampGlass:true};return glass;}
 const role=roleOf(m.name),out=ranchMaterial(m.color,role);
 return out;
}
// One GLB -> its parts (geometry with the node transform baked in, the game material) and its named empties.
function load(path){
 if(!files.has(path))files.set(path,loader.loadAsync(path).then(({scene})=>{
  scene.updateMatrixWorld(true);const parts=[],anchors={},materials=new Map();
  scene.traverse(o=>{
   if(o.isMesh){const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);for(const name of Object.keys(geometry.attributes))if(!['position','normal'].includes(name))geometry.deleteAttribute(name);
    geometry.setAttribute('paintPosition',geometry.getAttribute('position').clone());
    if(!materials.has(o.material))materials.set(o.material,kitMaterial(o.material));parts.push({name:o.name,geometry,material:materials.get(o.material)});}
   else if(o!==scene)anchors[o.name]=new T.Vector3().setFromMatrixPosition(o.matrixWorld);
  });
  return {parts,anchors};
 }));
 return files.get(path);
}
const KIT='/ranch-kits/';
export const kitchenGardenKit=()=>Promise.all(['bed','stake','watering-can',...CROP_STAGES.map(s=>'crop-'+s)].map(n=>load(KIT+'kitchen-garden/'+n+'.glb'))).then(([bed,stake,can,...crops])=>({bed,stake,can,crops:Object.fromEntries(CROP_STAGES.map((s,i)=>[s,crops[i]]))}));
let lamps;
export const lampKit=()=>lamps??=Promise.all(LAMP_KINDS.map(n=>load(KIT+'lamp-kit/'+n+'.glb'))).then(list=>Object.fromEntries(LAMP_KINDS.map((n,i)=>[n,list[i]])));

// A lamp as plain meshes sharing the kit's geometry and iron/timber materials; the glass gets its own material so
// each lamp can be lit on its own round. Returns {object, glass, anchors (local, metres)}.
export function lampInstance(kit,kind){
 const piece=kit[kind],object=new T.Group();object.name=kind;let glass=null;
 for(const p of piece.parts){let material=p.material;if(material.userData.lampGlass){glass??=material.clone();glass.userData={lampGlass:true};material=glass;}
  const mesh=new T.Mesh(p.geometry,material);mesh.castShadow=!material.userData.lampGlass;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;object.add(mesh);}
 const anchors=Object.entries(piece.anchors).filter(([n])=>n.startsWith('LightAnchor')).sort(([a],[b])=>a.localeCompare(b)).map(([,v])=>v.clone());
 return {object,glass,anchors};
}

const hash=(n)=>{let x=Math.imul(n^0x9e3779b9,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);return ((x^x>>>16)>>>0)/4294967296;};
// No crop growth is simulated on the Ranch tile yet, so each bed gets a believable stage: beds planted together share
// one, one bed in nine or so has dried out, and a slot here and there runs a stage ahead.
export function gardenStages(beds,slots,seed=1){
 const pool=['ripe','growing','growing','sprout','ripe','growing','thirsty','sprout','ripe'],out=[];
 for(let b=0;b<beds;b++){const base=pool[Math.floor(hash(seed*31+b)*pool.length)];
  for(let s=0;s<slots;s++){const r=hash(seed*977+b*13+s);out.push(base==='growing'&&r>.8?'ripe':base==='sprout'&&r>.75?'growing':base==='thirsty'&&r>.7?'growing':base);}}
 if(beds>2&&!out.includes('thirsty'))for(let s=0;s<slots;s++)out[(beds-1)*slots+s]=s%3?'thirsty':'growing';
 return out.slice(0,beds*slots);
}

// The kitchen garden for a w x d metre plot, in render units (S per metre), front (+Z) toward its access path.
// Beds are 1.21 x 0.91 m with 0.5 m paths between them. The group's userData.kitchenGarden lets a future crop
// simulation set any slot's stage: setStage(slot, 'sprout'|'growing'|'ripe'|'thirsty').
export async function kitchenGarden({w=6,d=5,seed=1,S=.1,stages=null}={}){
 const kit=await kitchenGardenKit(),group=new T.Group();group.name='Kitchen garden';
 const bedW=1.21,bedD=.91,gap=.5,cols=Math.max(1,Math.min(3,Math.floor((w-.8+gap)/(bedW+gap)))),rows=Math.max(1,Math.min(3,Math.floor((d-1.1+gap)/(bedD+gap))));
 const slots=Object.entries(kit.bed.anchors).filter(([n])=>n.startsWith('crop_slot')).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})).map(([,v])=>v);
 const q=new T.Quaternion(),one=new T.Vector3(1,1,1),zero=new T.Matrix4().makeScale(0,0,0);
 const beds=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)beds.push({x:(c-(cols-1)/2)*(bedW+gap),z:(r-(rows-1)/2)*(bedD+gap)-.3});
 const instanced=(piece,matrices)=>{for(const p of piece.parts){const mesh=new T.InstancedMesh(p.geometry,p.material,matrices.length);matrices.forEach((x,i)=>mesh.setMatrixAt(i,x));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.sharedGeometry=true;mesh.computeBoundingSphere();group.add(mesh);}return group.children.slice(-piece.parts.length);};
 const at=(x,y,z,yaw=0,s=1)=>new T.Matrix4().compose(new T.Vector3(x*S,y*S,z*S),q.setFromAxisAngle(T.Object3D.DEFAULT_UP,yaw),one.clone().multiplyScalar(s*S));
 instanced(kit.bed,beds.map(b=>at(b.x,0,b.z)));
 // Crops: one InstancedMesh per stage part, sized for every slot; a slot shows in exactly one stage.
 const cropSlots=beds.flatMap((b,bi)=>slots.map((s,si)=>({bed:bi,matrix:at(b.x+s.x,s.y,b.z+s.z,hash(seed+bi*7+si)*Math.PI*2,.9+hash(seed*3+bi*5+si)*.2)})));
 const state=stages||gardenStages(beds.length,slots.length,seed),stageMeshes=Object.fromEntries(CROP_STAGES.map(s=>[s,instanced(kit.crops[s],cropSlots.map(()=>zero))]));
 const apply=(i,stage)=>{for(const s of CROP_STAGES)for(const mesh of stageMeshes[s]){mesh.setMatrixAt(i,s===stage?cropSlots[i].matrix:zero);mesh.instanceMatrix.needsUpdate=true;}};
 cropSlots.forEach((_,i)=>apply(i,state[i]));for(const list of Object.values(stageMeshes))for(const mesh of list)mesh.computeBoundingSphere();
 // A stake and twine at the end of the first and last bed, the watering can where the paths cross.
 const ends=[beds[0],beds[beds.length-1]];instanced(kit.stake,ends.map((b,i)=>at(b.x+(i?-1:1)*(bedW/2+.12),0,b.z,i?Math.PI:0)));
 const front=beds.filter(b=>b.z===Math.max(...beds.map(q=>q.z)));instanced(kit.can,[at(front[0].x+bedW/2+gap/2,0,front[0].z-(rows>1?(bedD+gap)/2:-(bedD/2+.35)),-.6)]);
 group.userData.kitchenGarden={beds:beds.length,slots:cropSlots.length,stages:state,setStage(i,stage){if(!CROP_STAGES.includes(stage)||!cropSlots[i])return false;state[i]=stage;apply(i,stage);for(const list of Object.values(stageMeshes))for(const mesh of list)mesh.computeBoundingSphere();return true;}};
 group.userData.inspect={title:'Kitchen garden',kind:'Working garden',description:`${beds.length} raised beds · ${state.filter(s=>s==='ripe').length} ripe, ${state.filter(s=>s==='thirsty').length} need water. Crop growth is not simulated yet.`};
 group.userData.keepInstanced=true;
 return group;
}
