import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {sandboxWheel,cameraOwnsPointer} from './vendor/sandbox-camera.mjs';
// One retained renderer and one active generated scene; no images or cloned rigs.
export function createLiveTrayPreview(){
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(320,180,false);renderer.toneMapping=T.ACESFilmicToneMapping;
 const canvas=renderer.domElement;canvas.className='live-tray-canvas';canvas.setAttribute('aria-label','Live generated scene preview');
 const stage=new T.Scene(),camera=new T.PerspectiveCamera(35,320/180,.01,2000),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=false;controls.minDistance=.5;controls.maxDistance=600;controls.maxPolarAngle=Math.PI*.49;
 controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};
 canvas.addEventListener('pointerdown',e=>{controls.enabled=cameraOwnsPointer(e)||e.pointerType==='touch'&&e.isPrimary===false;},true);
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();controls.enabled=true;sandboxWheel(T,camera,controls,e);},{capture:true,passive:false});
 stage.add(new T.HemisphereLight('#fff6dc','#85806b',2.4));const sun=new T.DirectionalLight('#fff3d3',3);stage.add(sun,sun.target);
 let asset=null,frame=0,last=0,disposed=false,ticks=0;
 function render(now){frame=0;if(!asset||disposed)return;if(!document.hidden&&now-last>=50){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;asset.update?.(dt);controls.update();renderer.render(stage,camera);canvas.dataset.frames=String(++ticks);}frame=requestAnimationFrame(render);}
 function clear(){cancelAnimationFrame(frame);frame=0;if(asset)stage.remove(asset.group);asset=null;last=0;canvas.remove();}
 return {canvas,set(next,host){clear();asset=next;host.prepend(canvas);stage.add(next.group);next.group.updateWorldMatrix(true,true);const bounds=next.bounds||new T.Box3().setFromObject(next.group),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const distance=Math.max(size.y,size.x/camera.aspect,size.z/camera.aspect)*.55/Math.tan(camera.fov*Math.PI/360)+size.z*.3;camera.position.copy(center).addScaledVector(new T.Vector3(.7,.8,1).normalize(),distance);controls.target.copy(center);controls.update();sun.position.copy(center).add(new T.Vector3(10,20,10));sun.target.position.copy(center);last=0;frame=requestAnimationFrame(render);},clear,dispose(){clear();disposed=true;controls.dispose();renderer.dispose();renderer.forceContextLoss();}};
}
