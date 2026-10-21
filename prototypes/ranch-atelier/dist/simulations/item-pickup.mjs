import {firstVisibleHit} from './scene-picking.mjs';
import * as T from 'three';
import {cameraOwnsPointer} from './vendor/sandbox-camera.mjs';
import {advanceFlight,containPoint,releaseVelocity} from './item-flight.mjs';
/** Attach BEFORE tile-drag. begin(selection) returns a transaction in world-render units:
 * {object,position:Vector3,contains(x,z),floorAt(x,z),apply(Vector3),commit(Vector3):boolean,cancel()}.
 * getSelection() => {object,...}; optional hitTest(hit,selection) handles merged selections.
 * Host calls update(realSeconds), gates other manipulations with active, and calls cancel
 * before scene switches/saves. The controller owns gestures only over the selected item.
 */
export function attachItemPickup({canvas,camera,getSelection,getActive,canStart=()=>true,begin,hitTest,onStatus=()=>{}}){
 const ray=new T.Raycaster(),pointer=new T.Vector2(),touches=new Map();
 let pending=null,held=null,flight=null,tx=null,replaying=false,instance=null,selection=null,lastHover=0,oldCursor=canvas.style.cursor;
 function status(value){canvas.dataset.itemPickup=value;onStatus(value);}
 function cursor(value){canvas.style.cursor=value||oldCursor;}
 function consume(e){e.preventDefault();e.stopImmediatePropagation();}
 function replay(e){replaying=true;try{const forwarded=new PointerEvent('pointerdown',{pointerId:e.pointerId,pointerType:e.pointerType,isPrimary:e.isPrimary,clientX:e.clientX,clientY:e.clientY,button:e.button,buttons:e.buttons,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,metaKey:e.metaKey,altKey:e.altKey,bubbles:true,cancelable:true});forwarded.__sceneGestureReplay=true;canvas.dispatchEvent(forwarded);}finally{replaying=false;}}
 function cast(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
 function hit(e){const s=getSelection(),a=getActive();if(!s?.object||!a||!canStart()||a.arrival&&!a.arrival.done)return null;cast(e);const h=firstVisibleHit(ray,a.group);if(!h)return null;let matches=false;for(let p=h.object;p;p=p.parent)if(p===s.object){matches=true;break;}return (hitTest?hitTest(h,s):matches)?{s,a,h}:null;}
 function clearPending(){const p=pending;if(p)clearTimeout(p.timer);pending=null;return p;}
 function releaseCapture(){const id=held?.id;held=null;if(id!==undefined&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}
 function cancel(){clearPending();releaseCapture();flight=null;const saved=tx;tx=null;try{saved?.cancel();}finally{cursor();status(saved?'cancelled':'idle');}}
 function start(p){if(getSelection()!==p.s||getActive()!==p.a||!canStart())return false;const transaction=begin(p.s);if(!transaction)return false;tx=transaction;instance=p.a;selection=p.s;const origin=tx.position.clone();held={id:p.event.pointerId,plane:new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),p.h.point),offset:origin.clone().sub(p.h.point),position:origin.toArray(),samples:[],time:performance.now()/1000};held.samples.push({time:held.time,position:[...held.position]});canvas.setPointerCapture(held.id);cursor('grabbing');status('held');return true;}
 function down(e){if(replaying||e.__sceneGestureReplay)return;if(e.pointerType==='touch'){touches.set(e.pointerId,e);if(touches.size>1){const first=pending?.event||(held&&touches.get(held.id));cancel();if(first)replay(first);return;}}
  if(!e.isPrimary||cameraOwnsPointer(e)||e.altKey)return;
  if(tx){return;}const h=hit(e);if(!h)return;
  pending={...h,event:e,timer:null};pending.timer=setTimeout(()=>{const p=clearPending();if(!p)return;try{if(!start(p)){cursor();replay(p.event);}}catch(error){cancel();status('cancelled: '+error.message);}},500);consume(e);cursor('grab');
 }
 function move(e){if(replaying||e.__sceneGestureReplay)return;if(touches.has(e.pointerId))touches.set(e.pointerId,e);
  if(pending&&e.pointerId===pending.event.pointerId){if(Math.hypot(e.clientX-pending.event.clientX,e.clientY-pending.event.clientY)>6||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey){const p=clearPending();cursor();replay(p.event);return;}consume(e);return;}
  if(!held){if(!tx&&!e.buttons&&performance.now()-lastHover>60){lastHover=performance.now();if(!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&hit(e)){cursor('grab');consume(e);}}return;}if(e.pointerId!==held.id)return;consume(e);cast(e);const target=ray.ray.intersectPlane(held.plane,new T.Vector3());if(!target)return;
  try{target.add(held.offset);const position=containPoint(held.position,target.toArray(),tx.contains);position[1]=Math.max(position[1],tx.floorAt(position[0],position[2]));if(!position.every(Number.isFinite))throw Error('Invalid pickup position');held.position=position;const time=performance.now()/1000;held.samples.push({time,position:[...position]});held.samples=held.samples.filter(s=>time-s.time<=.2);tx.apply(new T.Vector3(...position));}catch(error){cancel();status('cancelled: '+error.message);}
 }
 function up(e){if(replaying||e.__sceneGestureReplay)return;touches.delete(e.pointerId);if(pending&&pending.event.pointerId===e.pointerId){const p=clearPending();cursor();replay(p.event);return;}if(!held||held.id!==e.pointerId)return;consume(e);flight={position:[...held.position],velocity:releaseVelocity(held.samples,performance.now()/1000),age:0};releaseCapture();cursor();status('released');}
 function cancelled(e){if(replaying||e.__sceneGestureReplay)return;touches.delete(e.pointerId);if(pending?.event.pointerId===e.pointerId||held?.id===e.pointerId){consume(e);cancel();}}
 function key(e){if(e.key==='Escape')cancel();}
 function blur(){cancel();touches.clear();}
 function leave(){if(pending){clearPending();cursor();}}
 const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancelled,lostpointercapture:cancelled,pointerleave:leave};
 for(const [name,fn]of Object.entries(listeners))canvas.addEventListener(name,fn,true);window.addEventListener('keydown',key);window.addEventListener('blur',blur);
 return {get active(){return !!tx;},get pending(){return !!pending;},cancel,update(dt){if(!tx)return;if(getActive()!==instance){cancel();return;}if(!flight)return;try{advanceFlight(flight,dt,tx);tx.apply(new T.Vector3(...flight.position));if(flight.settled){if(tx.commit(new T.Vector3(...flight.position))!==false){tx=null;flight=null;status('landed');}else{cancel();status('restored: no safe landing');}}else if(flight.age>12){cancel();status('restored: landing timed out');}}catch(error){cancel();status('cancelled: '+error.message);}},dispose(){cancel();for(const [name,fn]of Object.entries(listeners))canvas.removeEventListener(name,fn,true);window.removeEventListener('keydown',key);window.removeEventListener('blur',blur);}};
}
