import {createPreviewReadiness} from './preview-readiness.mjs';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {sandboxWheel,cameraOwnsPointer} from './vendor/sandbox-camera.mjs';
// One active generated scene, drawn by the world's own renderer when one is given. A second WebGL context
// would compile every shader and upload every mesh again, then the world uploads them a third time on
// placement; sharing the context means a printed tile is already on the graphics chip when it lands.
// The shared path draws into a small render target, applies the same ACES grade and sRGB output the
// world uses, and copies the pixels onto an ordinary 2D canvas for the card.
const BLIT_VERTEX='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const BLIT_FRAGMENT=`uniform sampler2D image;uniform float exposure;varying vec2 vUv;
vec3 RRTAndODTFit(vec3 v){vec3 a=v*(v+.0245786)-.000090537;vec3 b=v*(.983729*v+.4329510)+.238081;return a/b;}
vec3 aces(vec3 color){const mat3 I=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));const mat3 O=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));color*=exposure/.6;color=I*color;color=RRTAndODTFit(color);color=O*color;return clamp(color,0.,1.);}
vec3 srgb(vec3 c){return mix(c*12.92,pow(c,vec3(.41666))*1.055-.055,step(.0031308,c));}
void main(){vec4 c=texture2D(image,vUv);gl_FragColor=vec4(srgb(aces(c.rgb)),c.a);}`;
export function createLiveTrayPreview({renderer:shared=null}={}){
 const exposure=.95;let width=320,height=180;
 const renderer=shared||new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 let canvas,paint=null,target=null,output=null,blit=null,pixels=null,image=null;
 if(shared){
  canvas=document.createElement('canvas');paint=canvas.getContext('2d');
  target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4});output=new T.WebGLRenderTarget(1,1);
  const material=new T.ShaderMaterial({uniforms:{image:{value:target.texture},exposure:{value:exposure}},vertexShader:BLIT_VERTEX,fragmentShader:BLIT_FRAGMENT,depthTest:false,depthWrite:false,transparent:false,toneMapped:false});
  blit={scene:new T.Scene(),camera:new T.Camera(),material};blit.scene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
 }else{renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=exposure;canvas=renderer.domElement;}
 function resize(w,h){
  width=w;height=h;
  if(!shared){renderer.setSize(w,h,false);return;}
  const ratio=Math.min(devicePixelRatio,1.5),pw=Math.round(w*ratio),ph=Math.round(h*ratio);
  canvas.width=pw;canvas.height=ph;target.setSize(pw,ph);output.setSize(pw,ph);pixels=new Uint8Array(pw*ph*4);image=new ImageData(pw,ph);
 }
 resize(320,180);
 canvas.className='live-tray-canvas';canvas.setAttribute('aria-label','Live generated scene preview');
 const stage=new T.Scene(),camera=new T.PerspectiveCamera(35,320/180,.01,2000),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=false;controls.minDistance=.5;controls.maxDistance=600;controls.maxPolarAngle=Math.PI*.49;
 controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};
 canvas.addEventListener('pointerdown',e=>{controls.enabled=cameraOwnsPointer(e)||e.pointerType==='touch'&&e.isPrimary===false;},true);
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();controls.enabled=true;sandboxWheel(T,camera,controls,e);},{capture:true,passive:false});
 stage.add(new T.HemisphereLight('#fff6dc','#66745b',1.5));const sun=new T.DirectionalLight('#fff3d3',2.3);stage.add(sun,sun.target);
 let asset=null,frame=0,last=0,disposed=false,ticks=0,proof=createPreviewReadiness(),pending=null,box=null,clipping=[];
 // The print window (tile-pull.mjs) lays the tile down from the bottom up: a clipping plane at a fraction of its height.
 const cut=new T.Plane(new T.Vector3(0,-1,0),0);
 function draw(){
  if(!shared){renderer.clippingPlanes=clipping;renderer.render(stage,camera);return;}
  // Borrow the world renderer for one small frame, then hand back exactly the state it had.
  const previousTarget=renderer.getRenderTarget(),previousPlanes=renderer.clippingPlanes,previousShadows=renderer.shadowMap.autoUpdate,previousClear=renderer.getClearAlpha(),autoReset=renderer.info.autoReset;
  renderer.info.autoReset=false;renderer.shadowMap.autoUpdate=false;renderer.clippingPlanes=clipping;renderer.setClearAlpha(0);
  try{
   renderer.setRenderTarget(target);renderer.clear();renderer.render(stage,camera);
   renderer.clippingPlanes=[];renderer.setRenderTarget(output);renderer.clear();renderer.render(blit.scene,blit.camera);
   renderer.readRenderTargetPixels(output,0,0,output.width,output.height,pixels);
  }finally{renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=previousPlanes;renderer.shadowMap.autoUpdate=previousShadows;renderer.setClearAlpha(previousClear);renderer.info.autoReset=autoReset;}
  // WebGL rows run bottom-up; the card's canvas runs top-down.
  const row=output.width*4,data=image.data;for(let y=0;y<output.height;y++)data.set(pixels.subarray((output.height-1-y)*row,(output.height-y)*row),y*row);
  paint.putImageData(image,0,0);
 }
 function render(now){frame=0;if(!asset||disposed)return;if(!document.hidden&&now-last>=50){const dt=last?Math.min(.05,(now-last)/1000):0;last=now;try{asset.update?.(dt);controls.update();draw();if(renderer.getContext().isContextLost()||renderer.info.programs.some(p=>p.diagnostics?.runnable===false))throw Error('Preview renderer is unavailable. Print again.');canvas.dataset.frames=String(++ticks);if(proof.record(dt)&&pending){clearTimeout(pending.timer);pending.resolve(proof.state);pending=null;}}catch(error){pending?.reject(error);clearTimeout(pending?.timer);pending=null;return;}}frame=requestAnimationFrame(render);}
 function clear(){clipping=[];if(pending){clearTimeout(pending.timer);pending.reject(Error("Preview cancelled"));pending=null;}cancelAnimationFrame(frame);frame=0;if(asset)stage.remove(asset.group);asset=null;last=0;canvas.remove();}
 return {canvas,get readiness(){return proof.state;},reveal(t){if(!box||t>=1){clipping=[];if(!shared)renderer.clippingPlanes=[];return;}cut.constant=box.min.y+(box.max.y-box.min.y)*Math.max(0,t)*1.02;clipping=[cut];},setHeld(held){resize(held?640:320,held?360:180);controls.enabled=!held;},set(next,host){clear();proof=createPreviewReadiness();ticks=0;asset=next;host.prepend(canvas);stage.add(next.group);next.group.updateWorldMatrix(true,true);const bounds=box=next.bounds||new T.Box3().setFromObject(next.group),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const distance=Math.max(size.y,size.x/camera.aspect,size.z/camera.aspect)*.55/Math.tan(camera.fov*Math.PI/360)+size.z*.3;camera.position.copy(center).addScaledVector(new T.Vector3(.7,.8,1).normalize(),distance);controls.target.copy(center);controls.update();sun.position.copy(center).add(new T.Vector3(10,20,10));sun.target.position.copy(center);last=0;const ready=new Promise((resolve,reject)=>{pending={resolve,reject,timer:setTimeout(()=>{pending=null;reject(Error("Animation did not become ready. Print again."));},20000)};});frame=requestAnimationFrame(render);return ready;},clear,dispose(){clear();disposed=true;controls.dispose();if(shared){target.dispose();output.dispose();blit.material.dispose();blit.scene.children[0].geometry.dispose();}else{renderer.dispose();renderer.forceContextLoss();}}};
}
