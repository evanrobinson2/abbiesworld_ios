import * as T from './vendor/three.module.js';
// Each semantic object has its own world-space displacement and velocity.
export function settleAxis(x,v,dt,stiffness=28){const w=Math.sqrt(stiffness),c=v+w*x,e=Math.exp(-w*dt);return {x:(x+c*dt)*e,v:(v-w*c*dt)*e};}
export function stepElastic(records,dt,{enabled=true,reduced=false,radius=.65}={}){
 dt=Math.max(0,Math.min(.05,dt));
 for(const r of records){
  r.o.parent.updateWorldMatrix(true,false);
  const anchor=r.base.clone().applyMatrix4(r.o.parent.matrixWorld);
  // First placement establishes the origin, without flinging from world zero.
  const delta=r.elasticReady?anchor.clone().sub(r.anchor):new T.Vector3();
  r.elasticReady=true;r.anchor=anchor;const b=r.body;
  b.y??=0;b.vy??=0;
  if(enabled&&!reduced){
   b.x-=delta.x;b.y-=delta.y;b.z-=delta.z;
   const length=Math.hypot(b.x,b.y,b.z);
   if(length>radius){const ratio=radius/length;b.x*=ratio;b.y*=ratio;b.z*=ratio;}
   const stiffness=28/(r.response||1);
   for(const axis of ['x','y','z']){const next=settleAxis(b[axis],b['v'+axis]||0,dt,stiffness);b[axis]=next.x;b['v'+axis]=next.v;}
  }else{b.x=b.y=b.z=b.vx=b.vy=b.vz=0;}
  // Convert the independently integrated world position back into local space.
  r.o.position.copy(r.o.parent.worldToLocal(anchor.clone().add(new T.Vector3(b.x,b.y,b.z))));
  r.o.rotation.copy(r.rotation);r.o.rotation.z-=b.x*.04;r.o.rotation.x+=b.z*.04;
 }
}
