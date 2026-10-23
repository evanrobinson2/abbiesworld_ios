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

// One bookmark per focus session: visiting another hex keeps the original view.
// The visible rectangle is in canvas pixels, excluding drawers and navigation.
export function createSandboxFocus(T,camera,orbit,{changed=()=>{}}={}){
 let previous=null;
 function clear(){previous=null;changed(false);}
 function focus(points,{width,height,left=0,top=0,right=width,bottom=height}={}){
  if(!points?.length||!(width>0&&height>0&&right>left&&bottom>top))return false;
  if(!previous)previous={position:camera.position.clone(),target:orbit.target.clone(),zoom:camera.zoom,view:camera.view?.enabled?{...camera.view}:null};
  const offset=camera.position.clone().sub(orbit.target),azimuth=Math.atan2(offset.x,offset.z);
  const polar=Math.max(orbit.minPolarAngle??0,Math.min(orbit.maxPolarAngle??Math.PI,55*Math.PI/180));
  const back=new T.Vector3(Math.sin(polar)*Math.sin(azimuth),Math.cos(polar),Math.sin(polar)*Math.cos(azimuth));
  const horizontal=new T.Vector3().crossVectors(camera.up,back).normalize(),vertical=new T.Vector3().crossVectors(back,horizontal);
  const center=new T.Box3().setFromPoints(points).getCenter(new T.Vector3());
  const tanY=Math.tan(camera.fov*Math.PI/360)/camera.zoom,tanX=tanY*camera.aspect;
  let distance=orbit.minDistance;
  for(const point of points){const v=point.clone().sub(center);distance=Math.max(distance,v.dot(back)+Math.abs(v.dot(horizontal))/(tanX*(right-left)/width),v.dot(back)+Math.abs(v.dot(vertical))/(tanY*(bottom-top)/height));}
  distance=Math.min(orbit.maxDistance,Math.max(orbit.minDistance,distance*1.08));
  camera.setViewOffset(width,height,(width-left-right)/2,(height-top-bottom)/2,width,height);
  orbit.target.copy(center);camera.position.copy(center).addScaledVector(back,distance);orbit.update();changed(true);return true;
 }
 function restore({width,height}={}){
  if(!previous)return false;
  const saved=previous;previous=null;camera.position.copy(saved.position);orbit.target.copy(saved.target);camera.zoom=saved.zoom;
  if(saved.view){const v=saved.view,sx=width>0?width/v.fullWidth:1,sy=height>0?height/v.fullHeight:1;camera.setViewOffset(v.fullWidth*sx,v.fullHeight*sy,v.offsetX*sx,v.offsetY*sy,v.width*sx,v.height*sy);}
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();orbit.update();changed(false);return true;
 }
 return {focus,restore,clear,get active(){return !!previous;}};
}

// Capture eligibility before tile handlers can place/move anything. Native
// dblclick alone can follow a drag; require two unmoved clicks on the same hex.
export function bindHexFocus(element,{canFocus,pick,focus}){
 let down=null,taps=[],multi=false;const pointers=new Set(),handlers=[];
 const on=(name,fn)=>{element.addEventListener(name,fn,true);handlers.push([name,fn]);};
 on('pointerdown',event=>{
  pointers.add(event.pointerId);multi=pointers.size>1;if(multi){down=null;taps=[];return;}
  const cell=!cameraOwnsPointer(event)&&!event.altKey&&canFocus()?pick(event):null;
  down=cell?{pointer:event.pointerId,x:event.clientX,y:event.clientY,cell,key:cell.q+':'+cell.r,time:event.timeStamp}:null;
  if(!down)taps=[];
 });
 on('pointermove',event=>{if(down&&down.pointer===event.pointerId&&Math.hypot(event.clientX-down.x,event.clientY-down.y)>6){down=null;taps=[];}});
 const reset=event=>{pointers.delete(event.pointerId);down=null;taps=[];if(!pointers.size)multi=false;};
 on('pointercancel',reset);
 on('lostpointercapture',event=>{if(pointers.has(event.pointerId))reset(event);});
 on('pointerup',event=>{
  pointers.delete(event.pointerId);const tap=down;down=null;
  if(!tap||multi||tap.pointer!==event.pointerId||(event.pointerType==='touch'&&event.timeStamp-tap.time>500)||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>6){taps=[];if(!pointers.size)multi=false;return;}
  tap.time=event.timeStamp;const last=taps.at(-1);
  taps=last&&last.key===tap.key&&(event.pointerType!=='touch'||tap.time-last.time<600)&&Math.hypot(last.x-tap.x,last.y-tap.y)<=8?[last,tap]:[tap];
  if(event.pointerType==='touch'&&taps.length===2){taps=[];queueMicrotask(()=>{if(canFocus())focus(tap.cell);});}
 });
 on('dblclick',event=>{
  if(cameraOwnsPointer(event)||event.altKey||!canFocus()||taps.length!==2)return;
  const tap=taps.at(-1);taps=[];event.preventDefault();event.stopImmediatePropagation();focus(tap.cell);
 });
 return ()=>handlers.forEach(([name,fn])=>element.removeEventListener(name,fn,true));
}
