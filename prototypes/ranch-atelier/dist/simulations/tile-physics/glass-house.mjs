import * as T from '../ranch-diorama-lab/vendor/three.module.js';
/** Original Sandbox spring effect on disposable copies. Host pauses simulation while active. */
export function createGlassHouse({root,tileObjects,entities,fixtures=()=>[],inertia,renderUnitsPerMetre=.1,radiusMetres=50}){
 if(!inertia?.collectInertia||!inertia?.stepInertia)throw Error('Inject original Sandbox inertia module');
 const tiles=new Map(tileObjects.map(t=>[t.id,t.object]));let carrier=null,records=[],hidden=new Map();
 function finish(){for(const [object,visible]of hidden)object.visible=visible;hidden.clear();if(carrier){root.remove(carrier);carrier.traverse(o=>{if(o.userData.dragGeometry)o.geometry?.dispose();});carrier=null;}records=[];}
 function hide(object){if(!hidden.has(object)){hidden.set(object,object.visible);object.visible=false;}}
 return {
  begin(tileId){if(carrier)throw Error('Finish current Glass House presentation');const tile=tiles.get(tileId);if(!tile)throw Error('Unknown tile');root.updateWorldMatrix(true,true);const inhabitants=entities(),bodyRoots=new Set(inhabitants.map(e=>e.body));carrier=new T.Group();carrier.position.copy(tile.position);carrier.quaternion.copy(tile.quaternion);carrier.scale.copy(tile.scale);root.add(carrier);carrier.updateWorldMatrix(true,false);
   const cloneTree=(source,exclude)=>{if(exclude&&bodyRoots.has(source))return null;const clone=source.clone(false);for(const child of source.children){const c=cloneTree(child,exclude);if(c)clone.add(c);}return clone;};
   const add=(source,{exclude=false,layer=null,fixture=false}={})=>{const clone=cloneTree(source,exclude);if(!clone)return;const local=new T.Matrix4().multiplyMatrices(carrier.matrixWorld.clone().invert(),source.matrixWorld);local.decompose(clone.position,clone.quaternion,clone.scale);if(layer)clone.userData.inertiaLayer=layer;if(fixture){for(const child of clone.children)child.userData.inertiaLayer??='objects';}carrier.add(clone);hide(source);};
   try{add(tile);for(const f of fixtures().filter(f=>f.tileId===tileId))add(f.object,{exclude:true,fixture:true});for(const e of inhabitants.filter(e=>e.tileId===tileId&&e.body.visible))add(e.body,{layer:'people'});records=inertia.collectInertia(carrier);}catch(error){finish();throw error;}return records.length;
  },
  move({position,rotation}){if(!carrier)throw Error('No active Glass House');if(position)carrier.position.fromArray(position).multiplyScalar(renderUnitsPerMetre);if(rotation)carrier.quaternion.fromArray(rotation);},
  update(dt,{reduced=false}={}){if(!carrier)return;if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Invalid presentation delta');inertia.stepInertia(records,dt,{trackTransforms:true,enabled:true,radius:radiusMetres*renderUnitsPerMetre*.13,reduced});},
  end:finish,cancel:finish,dispose:finish,get active(){return !!carrier;},get count(){return records.length;}
 };
}
