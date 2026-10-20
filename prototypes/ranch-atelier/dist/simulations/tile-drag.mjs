import * as T from 'three';
import {cameraOwnsPointer} from './vendor/sandbox-camera.mjs';
// A stationary hold grabs. Early movement/taps are replayed to the existing
// camera/selection handlers; a second touch yields both pointers to the camera.
export function attachTileDrag({canvas,camera,getActive,controls}){
 const ray=new T.Raycaster(),pointer=new T.Vector2(),originalCursor=canvas.style.cursor;
 let drag=null,pending=null,replaying=false,touchCamera=false,lastHover=0;const touches=new Map();
 const holdMs=500,slop=6;
 function cursor(value=''){canvas.style.cursor=value||originalCursor;canvas.dataset.tileGesture=drag?'grabbing':pending?'hold':value==='grab'?'grabbable':'idle';}
 function point(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
 function consume(e){e.preventDefault();e.stopImmediatePropagation();}
 function replay(type,e){replaying=true;try{canvas.dispatchEvent(new PointerEvent(type,{pointerId:e.pointerId,pointerType:e.pointerType,isPrimary:e.isPrimary,clientX:e.clientX,clientY:e.clientY,button:e.button,buttons:type==='pointerup'?0:e.buttons,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,metaKey:e.metaKey,altKey:e.altKey,bubbles:true,cancelable:true}));}finally{replaying=false;}}
 function candidate(e){const active=getActive();if(!active||active.arrival&&!active.arrival.done)return null;point(e);const hit=ray.intersectObject(active.group,true)[0];if(!hit)return null;const tile=active.tileObjects.find(t=>{for(let o=hit.object;o;o=o.parent)if(o===t.object)return true;return false;});return tile&&controls.canGrab(tile.id)?{active,hit,tile}:null;}
 function clearPending(){if(!pending)return null;const p=pending;pending=null;clearTimeout(p.timer);cursor();return p;}
 function release(){if(!drag)return;const id=drag.id;drag=null;cursor();if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 function abort(){clearPending();if(drag){release();controls.cancel();}cursor();}
 function start(e,c,select=false){const pose=controls.startDrag(c.tile.id,{select});if(!pose)return false;const plane=new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),c.hit.point);drag={id:e.pointerId,plane,start:c.hit.point.clone(),position:pose.position,rotation:pose.rotation,group:c.active.group,time:e.timeStamp};canvas.setPointerCapture(e.pointerId);cursor('grabbing');return true;}
 function yieldFirst(){const held=drag?touches.get(drag.id):pending?.event;abort();if(held)replay('pointerdown',held);}
 function down(e){if(replaying)return;
  if(e.pointerType==='touch'){touches.set(e.pointerId,e);if(touches.size>1){touchCamera=true;yieldFirst();return;}if(touchCamera)return;}
  if(!e.isPrimary||cameraOwnsPointer(e)||e.altKey)return;const c=candidate(e);if(!c)return;
  if(controls.moveEnabled&&c.tile.id===controls.selectedTile){if(start(e,c))consume(e);return;}
  if(!controls.longPressEnabled)return;
  pending={event:e,c,timer:null};pending.timer=setTimeout(()=>{const p=clearPending();if(!p)return;if(getActive()!==p.c.active||!controls.longPressEnabled){replay('pointerdown',p.event);return;}if(!start(p.event,p.c,true))replay('pointerdown',p.event);},holdMs);cursor('grab');consume(e);
 }
 function move(e){if(replaying)return;if(e.pointerType==='touch'&&touches.has(e.pointerId))touches.set(e.pointerId,e);
  if(pending&&e.pointerId===pending.event.pointerId){if(Math.hypot(e.clientX-pending.event.clientX,e.clientY-pending.event.clientY)>slop||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey){const p=clearPending();replay('pointerdown',p.event);return;}consume(e);return;}
  if(!drag){if(!e.buttons&&performance.now()-lastHover>60){lastHover=performance.now();cursor(candidate(e)?'grab':'');}return;}
  if(e.pointerId!==drag.id)return;consume(e);if(!controls.active){release();return;}point(e);const p=ray.ray.intersectPlane(drag.plane,new T.Vector3());if(!p)return;
  const a=drag.group.worldToLocal(drag.start.clone()),b=drag.group.worldToLocal(p),delta=b.sub(a).multiplyScalar(10);controls.dragTo({position:drag.position.map((v,i)=>v+delta.getComponent(i)),rotation:drag.rotation},Math.max(1/120,Math.min(1/20,(e.timeStamp-drag.time)/1000)));drag.time=e.timeStamp;
 }
 function up(e){if(replaying)return;touches.delete(e.pointerId);if(!touches.size)touchCamera=false;
  if(pending&&e.pointerId===pending.event.pointerId){const p=clearPending();replay('pointerdown',p.event);return;}
  if(!drag||e.pointerId!==drag.id)return;consume(e);release();controls.drop();
 }
 function cancelled(e){if(replaying)return;if(e.type==='pointercancel'){touches.delete(e.pointerId);if(!touches.size)touchCamera=false;}if(pending&&e.pointerId===pending.event.pointerId){clearPending();return;}if(drag&&e.pointerId===drag.id){consume(e);abort();}}
 function key(e){if(e.key==='Escape'){abort();controls.cancel();}}
 function leave(){if(pending)clearPending();if(!drag)cursor();}
 function blur(){abort();touches.clear();touchCamera=false;}
 const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancelled,lostpointercapture:cancelled,pointerleave:leave};for(const [type,handler]of Object.entries(listeners))canvas.addEventListener(type,handler,true);window.addEventListener('keydown',key);window.addEventListener('blur',blur);
 return {dispose(){abort();for(const [type,handler]of Object.entries(listeners))canvas.removeEventListener(type,handler,true);window.removeEventListener('keydown',key);window.removeEventListener('blur',blur);cursor();}};
}
