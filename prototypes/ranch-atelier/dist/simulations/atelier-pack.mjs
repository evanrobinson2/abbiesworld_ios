// Ranch Atelier original pack (?atelier, ?atelier=autumn, ?atelier=frost).
// Thirteen script-built Blender models in /simulation-assets/atelier, each with a provenance record.
// Off unless asked for, so the normal ranch is unchanged.
import * as T from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {ranchMaterial} from './tile-materials.js';
import {RENDER_UNITS_PER_METRE} from './tile-metrics.js';

const ROOT='/simulation-assets/atelier/',PAINTS=['meadow','autumn','frost'];
const param=typeof location==='undefined'?null:new URLSearchParams(location.search).get('atelier');
export const ATELIER=param===null?null:{paint:PAINTS.includes(param)?param:'meadow'};

// Regional ids the composer asks for, and the pack model that stands in for each.
const STAND_IN={'WW-139':['birch'],'WW-140':['fir-a','fir-b'],'WW-147':['oak-a'],'WW-148':['oak-b'],'WW-151':['oak-a','oak-b'],'GF-159':['bush-a'],'GF-158':['bush-a'],'WW-273':['bush-b']};
const ROLE={leaf:'foliage','leaf-dark':'foliage',needle:'foliage',berry:'foliage',bark:'timber','bark-birch':'timber','birch-mark':'timber',wood:'timber','wood-cut':'timber',hoop:'metal',stone:'stone','stone-moss':'stone'};
const LABEL={tree:'Landscape',bush:'Landscape',rock:'Landscape',prop:'Yard'};
const loader=new GLTFLoader(),cache=new Map();let palette;

export function atelierStandIn(id,n=0){const pool=ATELIER&&STAND_IN[id];return pool?pool[n%pool.length]:null;}

export async function atelierModel(name){
 if(!cache.has(name))cache.set(name,(async()=>{
  palette??=fetch(ROOT+'palette.json').then(r=>r.json());
  const [{scene},paint,record]=await Promise.all([loader.loadAsync(ROOT+name+'.glb'),palette.then(p=>p[ATELIER?.paint||'meadow']),fetch(ROOT+name+'.json').then(r=>r.json())]);
  const materials=new Map(),root=new T.Group();
  // Repaint, don't remodel: one shape, one colour set per land. Pack colours are authored, so the
  // season shader only adds snow ('atelier' is a role it knows nothing else about).
  scene.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;o.userData.sharedGeometry=true;
   const swap=m=>{const key=m.name.replace(/\.\d+$/,'');if(!materials.has(key)){const src=ranchMaterial('#'+(paint[key]||m.color.getHexString()),ROLE[key]||'plain'),next=src.clone();next.onBeforeCompile=src.onBeforeCompile;next.customProgramCacheKey=src.customProgramCacheKey;next.userData={...src.userData,shared:true,seasonRole:'atelier'};materials.set(key,next);}return materials.get(key);};
   o.material=Array.isArray(o.material)?o.material.map(swap):swap(o.material);});
  root.add(scene);root.scale.setScalar(RENDER_UNITS_PER_METRE);
  root.userData.inspect={title:record.label,kind:LABEL[record.kind]||'Landscape',description:'Original Atelier model, script-built in Blender ('+record.date+').'};
  root.userData.asset=record.id;root.userData.provenance=ROOT+name+'.json';
  return root;
 })());
 return (await cache.get(name)).clone(true);
}

// Yard dressing rules: what a working building keeps outside its door.
const YARD={home:['rain-barrel','log-pile','crate-stack'],barn:['crate-stack','log-pile','stump'],store:['crate-stack','rain-barrel','crate-stack'],shelter:['log-pile','stump','rain-barrel']};
export function atelierYardProp(role,i){return YARD[role]?.[i%3]||'crate-stack';}
// Rocks become flat boulders. (The composer also turns every 13th managed edge tree into a stump.)
export function atelierRock(n){return n%3?'boulder-a':'boulder-b';}
