import * as T from 'three';

export function unitFromHit(object, root) {
  for (let o=object;o&&o!==root;o=o.parent) {
    if (o.userData.person || o.userData.articulation?.species) return o;
  }
  return null;
}

// Translate the existing camera and orbit target together: zoom and view angle
// remain owned by the shared controls, not by a second camera implementation.
export function createCameraFollow(camera, orbit) {
  let unit=null, root=null;
  const position=new T.Vector3(),delta=new T.Vector3();
  function stop(){unit=null;root=null;}
  function update(dt){
    if(!unit)return;
    let belongs=false;
    for(let o=unit;o;o=o.parent){if(!o.visible){stop();return;}if(o===root){belongs=true;break;}}
    if(!belongs){stop();return;}
    unit.getWorldPosition(position);position.y+=.1;
    delta.copy(position).sub(orbit.target).multiplyScalar(1-Math.exp(-8*Math.min(.05,Math.max(0,dt))));
    orbit.target.add(delta);camera.position.add(delta);orbit.update();
  }
  return {start(object,sceneRoot){unit=object;root=sceneRoot;},stop,update,get unit(){return unit;}};
}
