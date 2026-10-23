import * as T from './vendor/three.module.js';
import {body,advance} from './sandbox-inertia.mjs';
export const INERTIA_LAYERS=['people','objects','scenery'];
export function defaultLayers(){return Object.fromEntries(INERTIA_LAYERS.map(k=>[k,true]));}
export function layerOf(o){if(INERTIA_LAYERS.includes(o.userData?.inertiaLayer))return o.userData.inertiaLayer;if(o.userData?.npcMotion)return 'people';const key=o.userData?.motionKey;return key?(key.startsWith('dressing-')?'scenery':'objects'):null;}
// Select semantic roots, not mesh parts. A house, person or assembly is one body.
// Never select both parent and child; unmarked terrain is the fixed container.
// Expand only the temporary drag copy. The normal scene keeps its cheap batches.
// Each tree/rock/tuft remains one rigid body across all its material ranges.
function splitScenery(root){
 const batches=[];root.traverse(o=>{if(o.isMesh&&o.userData.inertiaParts?.length)batches.push(o);});
 const parents=new Map();
 for(const mesh of batches){let groups=parents.get(mesh.parent);if(!groups){groups=new Map();parents.set(mesh.parent,groups);}
  for(const part of mesh.userData.inertiaParts){let group=groups.get(part.key);if(!group){group=new T.Group();group.position.fromArray(part.anchor);group.userData.inertiaLayer='scenery';group.userData.motionKey=part.key;mesh.parent.add(group);groups.set(part.key,group);}
   const geometry=new T.BufferGeometry();for(const [name,attribute]of Object.entries(mesh.geometry.attributes)){geometry.setAttribute(name,new T.BufferAttribute(attribute.array.slice(part.start*attribute.itemSize,(part.start+part.count)*attribute.itemSize),attribute.itemSize,attribute.normalized));}
   geometry.translate(-part.anchor[0],-part.anchor[1],-part.anchor[2]);const piece=new T.Mesh(geometry,mesh.material);piece.castShadow=mesh.castShadow;piece.receiveShadow=mesh.receiveShadow;piece.userData.dragGeometry=true;group.add(piece);
  }
  mesh.visible=false;
 }
 // Sector roots no longer constitute a single body once their contents split.
 for(const parent of parents.keys()){delete parent.userData.motionKey;delete parent.userData.inertiaLayer;}
}
export function collectInertia(root){splitScenery(root);const records=[];root.updateWorldMatrix(true,true);function visit(o){const layer=layerOf(o);if(layer){const base=o.position.clone(),key=o.userData.motionKey||o.userData.worldEntityId||layer;let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))>>>0;const response=.85+(hash%31)/100;records.push({o,layer,base,rotation:o.rotation.clone(),body:body(),response,anchor:base.clone().applyMatrix4(o.parent.matrixWorld)});return;}for(const c of o.children||[])visit(c);}for(const c of root.children)visit(c);return records;}
export function stepInertia(records,dt,{dx=0,dy=0,dz=0,trackTransforms=false,enabled=true,layers=defaultLayers(),reduced=false,radius=.65}={}){
 for(const r of records){const active=enabled&&layers[r.layer]!==false&&!reduced;
 r.o.parent.updateWorldMatrix(true,false);const anchor=r.base.clone().applyMatrix4(r.o.parent.matrixWorld),delta=trackTransforms?anchor.clone().sub(r.anchor):new T.Vector3(dx,dy,dz);r.anchor.copy(anchor);
 advance(r.body,dt,{dx:delta.x*r.response,dz:(delta.z+delta.y*.45)*r.response,elasticity:12/r.response,damping:3.4,radius,reduced:!active});
 r.o.position.copy(r.base);r.o.rotation.copy(r.rotation);
 // Offsets are in world units: nested people retain the same response regardless
 // of their metre-to-render scale, parent rotation, or assembled building scale.
 if(active){r.o.parent.updateWorldMatrix(true,false);const inverse=new T.Matrix3().setFromMatrix4(r.o.parent.matrixWorld.clone().invert()),offset=new T.Vector3(r.body.x,0,r.body.z).applyMatrix3(inverse);r.o.position.add(offset);r.o.rotation.z-=r.body.x*.08;r.o.rotation.x+=r.body.z*.08;}
 }
}
