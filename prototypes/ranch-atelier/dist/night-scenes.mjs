import {mergeGeometries} from '/night-geometry-utils.mjs';
import {GLTFLoader} from '/sandbox2-runtime/vendor/loaders/GLTFLoader.js';
export const SCENES=[
 {name:'Dead-end street',props:[['NS06',0,-2.8],['NS03',3.7,-1.9],['NS05',-3.3,-2],['NS08',2.4,2.8],['NS04',-2.8,2.7]],gear:[]},
 {name:'Rendezvous',props:[['NS07',0,-2.8],['NS03',-3.7,-1.6],['NS10',-3.1,2.6]],gear:[['ZG036',3.1,-2.5],['ZG019',3.1,-2.5,.55]]},
 {name:'Corner shop',props:[['NS06',.3,-2.8],['NS05',-3.3,-1.8],['NS04',3.1,-1.3],['NS08',-2.3,2.8],['NS10',2.4,2.9]],gear:[['ZG036',-2,-1.4],['ZG034',-1.1,-1.4]]},
 {name:'Repair yard',props:[['NS07',0,-2.8],['NS09',.5,-.2],['NS03',-3.5,1.4]],gear:[['ZG040',-2.4,2.5],['ZG018',-2.4,2.5,1.09],['ZG050',2.6,2.5],['ZG017',-3,-1.3]]},
 {name:'First aid stop',props:[['NS03',3.4,-1.9],['NS08',-2.4,2.3]],gear:[['ZG031',-.8,-2.2],['ZG029',2.4,-1.9],['ZG030',1,2.5],['ZG021',1,2.5,.6],['ZG026',2.5,1.5],['ZG036',-2.7,-.5],['ZG020',-2.7,-.5,.55]]},
 {name:'Backyard shelter',props:[['NS08',-2.5,1.9],['NS10',2.3,2.8]],gear:[['ZG031',0,-2.2],['ZG033',.2,.2],['ZG039',2.7,-1.6],['ZG037',-.5,2.3],['ZG038',1,2.5],['ZG034',-2.6,-1.6],['ZG035',-2.5,-2.4]]},
 {name:'Barricaded alley',props:[['NS04',-3,-1.7],['NS03',3.6,-1.6]],gear:[['ZG043',-2.6,-3],['ZG043',0,-3],['ZG042',2.5,2.3],['ZG041',-2.4,2],['ZG046',0,.2],['ZG050',2.8,-1.5]]},
 {name:'Checkpoint',props:[['NS03',3.8,-1.2]],gear:[['ZG049',-2.5,-2],['ZG044',.5,.2],['ZG045',2,-2.5],['ZG041',-2.5,2.2],['ZG046',1.8,2.6],['ZG048',-2.7,-.2],['ZG035',3,1.2]]}
];
export async function dressNightScenes({T,scene,scale,activeCells,cellWorld,render,shadow}){
 const root=new T.Group();root.name='Full-scale survivor places';root.scale.setScalar(scale);scene.add(root);const cache=new Map(),missing=[];
 const mat=(color)=>new T.MeshStandardMaterial({color,roughness:.95});const asphalt=mat('#303738'),curb=mat('#797b71'),stripe=mat('#b7ab7b'),dirt=mat('#484d3e');
 function box(g,size,pos,m){const o=new T.Mesh(new T.BoxGeometry(...size),m);o.position.set(...pos);o.receiveShadow=true;o.castShadow=true;g.add(o);return o;}
 function compactStatic(original){
  original.updateMatrixWorld(true);const groups=new Map();let supported=true;
  original.traverse(o=>{if(o.isMesh){if(Array.isArray(o.material)||o.isSkinnedMesh){supported=false;return;}const key=o.material.uuid;if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});const geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.applyMatrix4(o.matrixWorld);for(const key of Object.keys(geo.attributes))if(!['position','normal'].includes(key))geo.deleteAttribute(key);groups.get(key).geometries.push(geo);}});
  if(!supported)return original;const result=new T.Group();for(const entry of groups.values()){const merged=mergeGeometries(entry.geometries);if(!merged)return original;result.add(new T.Mesh(merged,entry.material));for(const geo of entry.geometries)geo.dispose();}return result;
 }
 async function asset(id){if(!cache.has(id)){const url=id.startsWith('NS')?'/night-assets/'+id+'/model.glb':'/survival-gear/output/'+id+'.glb';cache.set(id,new GLTFLoader().loadAsync(url).then(g=>compactStatic(g.scene)));}return cache.get(id);}
 async function place(group,[id,x,z,y=0]){try{const original=await asset(id),copy=original.clone(true);const curbLift=group.userData.road&&Math.abs(Math.abs(z)-2.35)<.45&&!['NS06','NS07'].includes(id)?.12:0;copy.position.set(x,y+curbLift,z);copy.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});group.add(copy);}catch(e){missing.push(id);}}
 const work=[];
 activeCells.forEach((cell,i)=>{const c=cellWorld(cell),g=new T.Group();g.position.set(c.x,0,c.z);g.name=SCENES[i].name;g.userData.road=[0,1,2,3,6,7].includes(i);root.add(g);
  if([0,1,2,3,6,7].includes(i)){box(g,[8.5,.035,3.8],[0,.018,0],asphalt);for(const side of [-1,1]){box(g,[7.8,.12,.85],[0,.06,side*2.35],curb);for(let j=-3;j<=3;j+=.65)box(g,[.018,.008,.84],[j,.126,side*2.35],dirt);}for(const x of [-3,0,3])box(g,[1.1,.006,.07],[x,.04,0],stripe);}
  else box(g,[7.5,.02,6.8],[0,.01,0],dirt);
  // Sparse cracks, drains and small debris stay clear of the central combat route.
  for(let j=0;j<6;j++){const x=-3.2+j*1.2,z=j%2?1.65:-1.7;const crack=box(g,[.5,.008,.018],[x,.045,z],dirt);crack.rotation.y=j*.57;}
  for(const x of [-2.9,2.9]){box(g,[.45,.016,.32],[x,.05,1.7],asphalt);for(let j=-2;j<=2;j++)box(g,[.018,.012,.27],[x+j*.075,.063,1.7],curb);}
  // Full-size enclosed building volume behind modular fronts, with open interiors.
  for(const [id,x,z] of SCENES[i].props){if(id==='NS06'||id==='NS07'){const w=id==='NS06'?4.2:4.4,h=id==='NS06'?3:3.1;box(g,[w,.12,2],[x,.06,z-.8],curb);box(g,[w,.16,2.1],[x,h+.08,z-.85],asphalt);box(g,[w,h,.16],[x,h/2,z-1.8],curb);for(const side of [-1,1])box(g,[.16,h,1.8],[x+side*(w/2-.08),h/2,z-.8],curb);box(g,[.65,.3,.7],[x+1,h+.3,z-1],asphalt);}}
  for(const p of [...SCENES[i].props,...SCENES[i].gear])work.push(place(g,p));
 });
 await Promise.all(work);shadow();render();return {root,sceneCount:8,propCount:work.length,missing:[...new Set(missing)],names:SCENES.map(s=>s.name)};
}
