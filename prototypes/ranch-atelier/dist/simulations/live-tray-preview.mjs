import {createPreviewReadiness} from './preview-readiness.mjs';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {sandboxWheel,cameraOwnsPointer} from './vendor/sandbox-camera.mjs';
// One retained renderer and one active generated scene; no images or cloned rigs.
export function createLiveTrayPreview(){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(320,180,false);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 const canvas=renderer.domElement;canvas.className='live-tray-canvas';canvas.setAttribute('aria-label','Live generated scene preview');
 const stage=new T.Scene(),camera=new T.PerspectiveCamera(35,320/180,.01,2000),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=false;controls.minDistance=.5;controls.maxDistance=600;controls.maxPolarAngle=Math.PI*.49;
 controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};
 canvas.addEventListener('pointerdown',e=>{controls.enabled=cameraOwnsPointer(e)||e.pointerType==='touch'&&e.isPrimary===false;},true);
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();controls.enabled=true;sandboxWheel(T,camera,controls,e);},{capture:true,passive:false});
 stage.add(new T.HemisphereLight('#fff6dc','#66745b',1.5));const sun=new T.DirectionalLight('#fff3d3',2.3);stage.add(sun,sun.target);
 let asset=null,frame=0,last=0,disposed=false,ticks=0,proof=createPreviewReadiness(),pending=null;
 function render(now){frame=0;if(!asset||disposed)return;if(!document.hidden&&now-last>=50){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;try{asset.update?.(dt);controls.update();renderer.render(stage,camera);if(renderer.getContext().isContextLost()||renderer.info.programs.some(p=>p.diagnostics?.runnable===false))throw Error('Preview renderer is unavailable. Print again.');canvas.dataset.frames=String(++ticks);if(proof.record(dt)&&pending){clearTimeout(pending.timer);pending.resolve(proof.state);pending=null;}}catch(error){pending?.reject(error);clearTimeout(pending?.timer);pending=null;return;}}frame=requestAnimationFrame(render);}
 function clear(){if(pending){clearTimeout(pending.timer);pending.reject(Error("Preview cancelled"));pending=null;}cancelAnimationFrame(frame);frame=0;if(asset)stage.remove(asset.group);asset=null;last=0;canvas.remove();}
 return {canvas,get readiness(){return proof.state;},setHeld(held){renderer.setSize(held?640:320,held?360:180,false);controls.enabled=!held;},set(next,host){clear();proof=createPreviewReadiness();ticks=0;asset=next;host.prepend(canvas);stage.add(next.group);next.group.updateWorldMatrix(true,true);const bounds=next.bounds||new T.Box3().setFromObject(next.group),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const distance=Math.max(size.y,size.x/camera.aspect,size.z/camera.aspect)*.55/Math.tan(camera.fov*Math.PI/360)+size.z*.3;camera.position.copy(center).addScaledVector(new T.Vector3(.7,.8,1).normalize(),distance);controls.target.copy(center);controls.update();sun.position.copy(center).add(new T.Vector3(10,20,10));sun.target.position.copy(center);last=0;const ready=new Promise((resolve,reject)=>{pending={resolve,reject,timer:setTimeout(()=>{pending=null;reject(Error("Animation did not become ready. Print again."));},20000)};});frame=requestAnimationFrame(render);return ready;},clear,dispose(){clear();disposed=true;controls.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
