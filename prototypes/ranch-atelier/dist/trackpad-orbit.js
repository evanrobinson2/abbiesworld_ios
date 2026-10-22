// Scroll orbits; pinch (ctrl-wheel) zooms; Shift-scroll pans. No click-drag stealing.
export function trackpadOrbit(T,camera,orbit,event){
 const unit=event.deltaMode===1?16:event.deltaMode===2?300:1;
 const dx=Math.max(-300,Math.min(300,event.deltaX*unit)),dy=Math.max(-300,Math.min(300,event.deltaY*unit));
 const offset=camera.position.clone().sub(orbit.target);
 if(event.ctrlKey){offset.multiplyScalar(Math.exp(dy*.008));offset.setLength(Math.max(orbit.minDistance,Math.min(orbit.maxDistance,offset.length())));camera.position.copy(orbit.target).add(offset);}
 else if(event.shiftKey){camera.updateMatrixWorld();const amount=offset.length()*.0015,pan=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-dx*amount).addScaledVector(new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),dy*amount);orbit.target.add(pan);camera.position.add(pan);}
 else{const spherical=new T.Spherical().setFromVector3(offset);spherical.theta-=dx*.005;spherical.phi=Math.max(.05,Math.min(orbit.maxPolarAngle,spherical.phi+dy*.005));camera.position.copy(orbit.target).add(new T.Vector3().setFromSpherical(spherical));}
 orbit.update();
}
