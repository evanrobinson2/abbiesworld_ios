import * as T from './vendor/three.module.js';

export function onDraggedTiles(position,centers,radius){
 return centers.some(c=>Array.from({length:6},(_,i)=>i*Math.PI/3).every(a=>(position.x-c.x)*Math.cos(a)+(position.z-c.z)*Math.sin(a)<=radius*Math.sqrt(3)/2+1e-6));
}

// Take the actors physically standing on this tile, regardless of their home.
// This is a render copy only: identity, routes, combat and saved positions stay put.
export function captureDragActors(objects,{origin,centers,radius,scale}){
 const group=new T.Group(),hidden=[];group.scale.setScalar(scale);
 for(const original of objects){if(!original.visible||!onDraggedTiles(original.position,centers,radius))continue;
  const copy=original.clone(true);copy.position.x-=origin.x;copy.position.z-=origin.z;copy.userData.inertiaLayer='people';delete copy.userData.dragHidden;group.add(copy);
  hidden.push(original);original.userData.dragHidden=true;original.visible=false;
 }
 return {group,release(){for(const original of hidden){delete original.userData.dragHidden;original.visible=true;}}};
}
