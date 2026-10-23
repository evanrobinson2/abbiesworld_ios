// Wheel zooms; Shift-wheel pans. Modified left-drag belongs to OrbitControls,
// even when it starts over a tile or while a placement is armed.
export function cameraOwnsPointer(event){return event.button!==0||event.shiftKey||event.ctrlKey||event.metaKey;}
export function sandboxWheel(T,camera,orbit,event){
 if(!orbit.enabled)return;
 const unit=event.deltaMode===1?16:event.deltaMode===2?300:1;
 const dx=Math.max(-300,Math.min(300,event.deltaX*unit)),dy=Math.max(-300,Math.min(300,event.deltaY*unit));
 const offset=camera.position.clone().sub(orbit.target);
 if(event.shiftKey&&!event.ctrlKey){
  camera.updateMatrixWorld();const amount=offset.length()*.0015;
  const pan=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0).multiplyScalar(-dx*amount).addScaledVector(new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),dy*amount);
  orbit.target.add(pan);camera.position.add(pan);
 }else{
  const fine=Math.max(.18,Math.min(1,(offset.length()-orbit.minDistance)/Math.max(12,orbit.minDistance*8)));
  const distance=Math.max(orbit.minDistance,Math.min(orbit.maxDistance,offset.length()*Math.exp(dy*.003*fine)));
  offset.setLength(distance);camera.position.copy(orbit.target).add(offset);
 }
 orbit.update();
}
