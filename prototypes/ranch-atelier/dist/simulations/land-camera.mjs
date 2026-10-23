import * as T from 'three';

// AW-STUDY-0018: the camera for true, continuous land (docs/oracle/camera/CAMERA_STUDY.md).
// The board's OrbitControls orbit a free point: on hills the pivot floats into the sky or sinks into a slope, the
// camera passes through ridges, and one finger spins the world instead of moving across it. Here the pivot is always
// a point on the ground, you grab the land to move, the view tilts down as you rise (city-builder style), the camera
// lifts over ridges, and at the bottom of the zoom one continuous move puts you on your feet (AW-STUDY-0011).
// Presentation only: it moves the player's camera and never adds anything to the world.
// Units are render units (0.1 per metre in the Basin). heightAt(x,z) gives ground height in the same units.
export const LAND = {
 minDist: .9, maxDist: 420,          // 9 m to 4.2 km from the ground point you are looking at
 lowPitch: 13, highPitch: 64,        // degrees above the horizon at the near and far ends of the zoom
 minPitch: 6, maxPitch: 84,
 clearance: .25,                     // never closer than 2.5 m to the ground, more when high up
 diveAfter: .32,                     // extra zoom-in (log units) past the bottom that starts the dive
 diveSeconds: 1.2, riseSeconds: .9,
 eye: .16, walk: .25, run: .7,       // 1.6 m eyes, 2.5 m/s walk, 7 m/s run
 eyeFov: 52, eyeNear: .05,
 deadZone: .16
};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rad=T.MathUtils.degToRad,ease=t=>t*t*t*(t*(t*6-15)+10);
export function pitchFor(dist,c=LAND){const t=clamp(Math.log(dist/c.minDist)/Math.log(c.maxDist/c.minDist),0,1);return rad(c.lowPitch+(c.highPitch-c.lowPitch)*Math.pow(t,.8));}
const stick=(v,dz)=>Math.abs(v)<dz?0:Math.sign(v)*(Math.abs(v)-dz)/(1-dz);

export function createLandCamera({camera,orbit,canvas,heightAt,waterY=-Infinity,bounds=null,config={}}){
 const c={...LAND,...config},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ground=(x,z)=>Math.max(heightAt(x,z),waterY);
 // goal is where input puts the view; now eases toward it. lift is the extra pitch needed to see over the land.
 const goal={x:0,z:0,log:Math.log(60),yaw:0,tilt:0},now={...goal},eye={x:0,z:0,yaw:0,pitch:0,y:0};
 let mode='land',lift=0,push=0,transition=null,walkTo=null,baseFov=camera.fov,baseNear=camera.near;
 const keys=new Set(),pointers=new Map(),v=new T.Vector3(),w=new T.Vector3(),ray=new T.Ray(),ndc=new T.Vector2(),caster=new T.Raycaster();
 let drag=null,pinch=null,pad=null;
 const was=new Map();

 function clampFocus(g){if(!bounds)return;g.x=clamp(g.x,bounds.minX,bounds.maxX);g.z=clamp(g.z,bounds.minZ,bounds.maxZ);}
 function pose(s,liftBy,out=new T.Vector3()){
  const dist=Math.exp(s.log),pitch=clamp(pitchFor(dist,c)+s.tilt+liftBy,rad(c.minPitch),rad(c.maxPitch));
  const fy=ground(s.x,s.z),h=Math.cos(pitch)*dist;
  out.set(s.x+Math.sin(s.yaw)*h,fy+Math.sin(pitch)*dist,s.z+Math.cos(s.yaw)*h);
  return {position:out,focus:new T.Vector3(s.x,fy,s.z),pitch,dist};
 }
 // How much more pitch the camera needs so no ridge stands between it and the point it looks at.
 function liftNeeded(s){
  let extra=0;
  for(let k=0;k<18;k++){
   const p=pose(s,extra,v),gap=Math.max(c.clearance,p.dist*.04);let blocked=false;
   for(let i=2;i<=10&&!blocked;i++){w.lerpVectors(p.focus,p.position,i/10);if(ground(w.x,w.z)+gap*(i/10)>w.y)blocked=true;}
   if(!blocked)return extra;extra+=rad(3);
  }
  return extra;
 }
 function pointerRay(e){const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);caster.setFromCamera(ndc,camera);return ray.copy(caster.ray);}
 // March the ray over the height field; steps shrink as it nears the ground.
 function groundHit(r,out=new T.Vector3()){
  let t=0;for(let i=0;i<240;i++){r.at(t,out);const gap=out.y-ground(out.x,out.z);if(gap<.01)return out;t+=Math.max(.01,gap*.45);if(t>4000)break;}
  return null;
 }
 function planeHit(r,y,out=new T.Vector3()){if(r.direction.y>-.02)return null;return r.at((y-r.origin.y)/r.direction.y,out);}
 function apply(){
  if(mode!=='land')return;
  const p=pose(now,lift,v);
  camera.position.copy(p.position);camera.up.set(0,1,0);camera.lookAt(p.focus);orbit.target.copy(p.focus);
 }
 function snap(){Object.assign(now,goal);lift=liftNeeded(now);apply();}

 // Read whatever pose the camera has now (a framing, a shared view) into ground-anchored terms.
 function adopt(){
  const dx=camera.position.x-orbit.target.x,dz=camera.position.z-orbit.target.z,dist=clamp(camera.position.distanceTo(orbit.target),c.minDist,c.maxDist);
  goal.x=orbit.target.x;goal.z=orbit.target.z;goal.yaw=Math.atan2(dx,dz);goal.log=Math.log(dist);
  const pitch=Math.asin(clamp((camera.position.y-ground(goal.x,goal.z))/dist,-1,1));goal.tilt=clamp(pitch-pitchFor(dist,c),-rad(25),rad(25));
  clampFocus(goal);mode='land';transition=null;snap();
 }

 function zoom(amount,e){
  if(mode==='eye'){if(amount>0)rise();return;}
  if(mode!=='land')return;
  const before=goal.log,next=clamp(before+amount,Math.log(c.minDist),Math.log(c.maxDist));
  // Only once the view has actually reached the bottom does more zoom-in count toward stepping in.
  if(amount<0&&before<=Math.log(c.minDist)+1e-3){if(now.log<=Math.log(c.minDist)+.06){push+=-amount;if(push>c.diveAfter)dive();}return;}
  push=0;
  // Zoom toward the point under the cursor: it stays under the cursor as the view closes in.
  if(e){const hit=groundHit(pointerRay(e));if(hit){const k=1-Math.exp(next-before);goal.x+=(hit.x-goal.x)*k;goal.z+=(hit.z-goal.z)*k;clampFocus(goal);}}
  goal.log=next;
 }
 function eyePose(){return {position:new T.Vector3(eye.x,ground(eye.x,eye.z)+c.eye,eye.z),quaternion:new T.Quaternion().setFromEuler(new T.Euler(eye.pitch,eye.yaw,0,'YXZ'))};}
 function dive(){
  if(mode!=='land')return;push=0;
  // Stand where you were looking, facing the same way, eyes level with a slight look down the land.
  eye.x=now.x;eye.z=now.z;eye.yaw=now.yaw;eye.pitch=-rad(4);
  transition={from:{position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov},to:'eye',t:0,seconds:reduced?.35:c.diveSeconds};
  mode='diving';camera.near=Math.min(baseNear,c.eyeNear);camera.updateProjectionMatrix();
 }
 function rise(){
  if(mode!=='eye')return;walkTo=null;
  const fx=eye.x-Math.sin(eye.yaw)*c.minDist*1.4,fz=eye.z-Math.cos(eye.yaw)*c.minDist*1.4;
  Object.assign(goal,{x:fx,z:fz,yaw:eye.yaw,log:Math.log(c.minDist*2.2),tilt:0});clampFocus(goal);Object.assign(now,goal);lift=liftNeeded(now);
  transition={from:{position:camera.position.clone(),quaternion:camera.quaternion.clone(),fov:camera.fov},to:'land',t:0,seconds:reduced?.3:c.riseSeconds};mode='rising';
 }
 function stepTransition(dt){
  const tr=transition;tr.t=Math.min(1,tr.t+dt/tr.seconds);const k=ease(tr.t);
  let target,fov;
  if(tr.to==='eye'){target=eyePose();fov=c.eyeFov;}
  else{const p=pose(now,lift);const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(p.position,p.focus,new T.Vector3(0,1,0)));target={position:p.position,quaternion:q};fov=baseFov;}
  camera.position.lerpVectors(tr.from.position,target.position,k);
  // One continuous move: never let the path cut through a hill on the way down.
  camera.position.y=Math.max(camera.position.y,ground(camera.position.x,camera.position.z)+c.eye);
  camera.quaternion.slerpQuaternions(tr.from.quaternion,target.quaternion,k);camera.fov=tr.from.fov+(fov-tr.from.fov)*k;camera.updateProjectionMatrix();
  if(tr.t>=1){transition=null;mode=tr.to;if(mode==='land'){camera.near=baseNear;camera.updateProjectionMatrix();apply();}}
 }

 // Pointer: one finger or the left button grabs the land; right or middle orbits; two fingers pinch, twist and pan.
 function down(e){
  if(e.target!==canvas)return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,button:e.button,time:e.timeStamp});
  try{canvas.setPointerCapture(e.pointerId);}catch{}
  if(pointers.size===2){drag=null;pinch=gesture();return;}
  if(pointers.size>2)return;
  if(mode==='eye'){drag={kind:'look'};return;}
  if(mode!=='land')return;
  if(e.button===2||e.button===1||e.altKey){drag={kind:'orbit'};return;}
  const hit=groundHit(pointerRay(e));drag=hit?{kind:'grab',y:hit.y,anchor:hit.clone()}:{kind:'orbit'};
 }
 function gesture(){const [a,b]=[...pointers.values()];return {mx:(a.x+b.x)/2,my:(a.y+b.y)/2,spread:Math.hypot(a.x-b.x,a.y-b.y),angle:Math.atan2(b.y-a.y,b.x-a.x)};}
 function move(e){
  const p=pointers.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(pointers.size===2&&pinch){
   const g=gesture(),scale=g.spread/Math.max(1,pinch.spread);let turn=g.angle-pinch.angle;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
   const mid={clientX:g.mx,clientY:g.my};
   if(mode==='eye'){if(scale<.985)rise();pinch=g;return;}
   if(mode==='land'){
    if(Math.abs(Math.log(scale))>.002)zoom(-Math.log(scale)*1.6,mid);
    goal.yaw-=turn;
    const from=groundHit(pointerRay({clientX:pinch.mx,clientY:pinch.my})),to=from&&planeHit(pointerRay(mid),from.y);
    if(from&&to){goal.x+=from.x-to.x;goal.z+=from.z-to.z;clampFocus(goal);}
   }
   pinch=g;return;
  }
  if(!drag)return;
  if(drag.kind==='look'){eye.yaw+=dx*.004;eye.pitch=clamp(eye.pitch+dy*.004,-rad(70),rad(60));walkTo=null;return;}
  if(drag.kind==='orbit'){goal.yaw-=dx*.006;goal.tilt=clamp(goal.tilt+dy*.004,-rad(30),rad(30));return;}
  // Grab: the point you pressed stays under your finger. The camera follows at once so the land never slides.
  const to=planeHit(pointerRay(e),drag.y);if(!to)return;
  const lim=Math.exp(now.log)*.6,mx=clamp(drag.anchor.x-to.x,-lim,lim),mz=clamp(drag.anchor.z-to.z,-lim,lim);
  goal.x+=mx;goal.z+=mz;clampFocus(goal);now.x=goal.x;now.z=goal.z;apply();
 }
 function up(e){
  const p=pointers.get(e.pointerId);pointers.delete(e.pointerId);
  if(pointers.size<2)pinch=null;
  if(!pointers.size)drag=null;
  // A still tap in first person walks you there; everywhere else a tap stays free for selection.
  if(p&&mode==='eye'&&e.type==='pointerup'&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<6&&e.timeStamp-p.time<400){const hit=groundHit(pointerRay(e));if(hit&&hit.y>waterY+.005)walkTo={x:hit.x,z:hit.z};}
 }
 function wheel(e){
  if(e.target!==canvas)return;
  const unit=e.deltaMode===1?16:e.deltaMode===2?300:1,dx=clamp(e.deltaX*unit,-300,300),dy=clamp(e.deltaY*unit,-300,300);
  e.preventDefault();e.stopImmediatePropagation();
  if(e.shiftKey&&!e.ctrlKey&&mode==='land'){const s=Math.exp(now.log)*.0016,cy=Math.cos(goal.yaw),sy=Math.sin(goal.yaw);goal.x+=(dx*cy+dy*sy)*s;goal.z+=(-dx*sy+dy*cy)*s;clampFocus(goal);return;}
  zoom(dy*(e.ctrlKey?.01:.0016),e);
 }
 const typing=e=>e.target?.closest?.('input,textarea,select,[contenteditable="true"]');
 function keydown(e){if(typing(e)||e.metaKey||e.ctrlKey)return;const k=e.key.toLowerCase();
  if(k==='escape'&&mode==='eye'){rise();return;}
  if(['w','a','s','d','q','e','r','f','z','x','arrowup','arrowdown','arrowleft','arrowright','shift','+','=','-'].includes(k))keys.add(k);}
 function keyup(e){keys.delete(e.key.toLowerCase());if(e.key==='Shift')keys.delete('shift');}
 const blur=()=>keys.clear();

 // Gamepad, standard mapping: left stick moves, right stick turns and tilts, triggers zoom, A dives, B rises.
 function readPad(){
  const pads=navigator.getGamepads?.()||[];for(const g of pads){if(g&&g.connected&&g.mapping==='standard')return g;}
  for(const g of pads)if(g&&g.connected)return g;return null;
 }
 function pressed(g,i){const on=!!g.buttons[i]?.pressed,before=was.get(i)||false;was.set(i,on);return on&&!before;}

 function update(dt){
  dt=Math.min(.05,Math.max(0,dt));
  const g=readPad();pad=g?{lx:stick(g.axes[0]||0,c.deadZone),ly:stick(g.axes[1]||0,c.deadZone),rx:stick(g.axes[2]||0,c.deadZone),ry:stick(g.axes[3]||0,c.deadZone),lt:g.buttons[6]?.value||0,rt:g.buttons[7]?.value||0}:null;
  if(g){if(pressed(g,0)&&mode==='land')dive();if(pressed(g,1)&&mode==='eye')rise();}
  const key=k=>keys.has(k)?1:0,fwd=key('w')+key('arrowup')-key('s')-key('arrowdown')-(pad?.ly||0),side=key('d')+key('arrowright')-key('a')-key('arrowleft')+(pad?.lx||0);
  if(mode==='land'){
   const dist=Math.exp(now.log),speed=dist*1.1*dt,cy=Math.cos(goal.yaw),sy=Math.sin(goal.yaw);
   if(fwd||side){goal.x+=(side*cy-fwd*sy)*speed;goal.z+=(-side*sy-fwd*cy)*speed;clampFocus(goal);}
   goal.yaw+=((key('q')-key('e'))*1.6-(pad?.rx||0)*2)*dt;
   goal.tilt=clamp(goal.tilt+((key('r')-key('f'))*.8+(pad?.ry||0)*.9)*dt,-rad(30),rad(30));
   const z=(key('x')+key('-')-key('z')-key('+')-key('=')+(pad?(pad.lt-pad.rt):0))*1.4*dt;if(z)zoom(z);
   push=Math.max(0,push-dt*.5);
   const k=1-Math.exp(-14*dt);for(const n of ['x','z','log','yaw','tilt'])now[n]+=(goal[n]-now[n])*k;
   // Lift fast when a ridge would block the view, settle back slowly when it clears.
   const need=liftNeeded(now);lift+=(need-lift)*(1-Math.exp(-(need>lift?22:3)*dt));
   apply();
  }else if(mode==='eye'){
   const run=keys.has('shift')||Math.hypot(pad?.lx||0,pad?.ly||0)>.92,speed=(run?c.run:c.walk)*dt;
   eye.yaw+=((key('q')-key('e'))*1.6-(pad?.rx||0)*2.2)*dt;eye.pitch=clamp(eye.pitch-(pad?.ry||0)*1.6*dt,-rad(70),rad(60));
   let mx=0,mz=0;const cy=Math.cos(eye.yaw),sy=Math.sin(eye.yaw);
   if(fwd||side){walkTo=null;mx=(side*cy-fwd*sy)*speed;mz=(-side*sy-fwd*cy)*speed;}
   else if(walkTo){const ddx=walkTo.x-eye.x,ddz=walkTo.z-eye.z,d=Math.hypot(ddx,ddz);if(d<.05)walkTo=null;else{const s=Math.min(d,c.walk*1.4*dt);mx=ddx/d*s;mz=ddz/d*s;eye.yaw+=Math.atan2(Math.sin(Math.atan2(-ddx,-ddz)-eye.yaw),Math.cos(Math.atan2(-ddx,-ddz)-eye.yaw))*Math.min(1,5*dt);}}
   // The lake and the map's edge stop you; rivers you can wade.
   const nx=eye.x+mx,nz=eye.z+mz,inside=!bounds||(nx>bounds.minX&&nx<bounds.maxX&&nz>bounds.minZ&&nz<bounds.maxZ);
   if(inside&&heightAt(nx,nz)>waterY-.03){eye.x=nx;eye.z=nz;}else walkTo=null;
   const zo=key('x')+key('-')+(pad?.lt||0);if(zo>.5)rise();
   const want=heightAt(eye.x,eye.z)+c.eye;eye.y=eye.y?eye.y+(want-eye.y)*(1-Math.exp(-12*dt)):want;
   camera.position.set(eye.x,eye.y,eye.z);camera.quaternion.setFromEuler(new T.Euler(eye.pitch,eye.yaw,0,'YXZ'));
   v.set(0,0,-2).applyQuaternion(camera.quaternion);orbit.target.copy(camera.position).add(v);
  }else if(transition)stepTransition(dt);
  canvas.dataset.landCamera=mode;
 }

 const handlers=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['wheel',wheel,{passive:false}],['keydown',keydown],['keyup',keyup],['blur',blur]];
 for(const [n,f,o] of handlers)window.addEventListener(n,f,{capture:true,...o});
 const menu=e=>{if(e.target===canvas)e.preventDefault();};window.addEventListener('contextmenu',menu,true);
 // The board's controls stand down while the land camera owns the view; nothing they do can clamp it.
 const saved={enabled:orbit.enabled,minDistance:orbit.minDistance,maxPolarAngle:orbit.maxPolarAngle};
 orbit.enabled=false;orbit.minDistance=0;orbit.maxPolarAngle=Math.PI;
 adopt();
 return {update,adopt,dive,rise,get mode(){return mode;},get state(){return {mode,focus:{x:now.x,z:now.z},distance:Math.exp(now.log),yaw:now.yaw,lift,eye:{...eye},aboveGround:camera.position.y-ground(camera.position.x,camera.position.z)};},
  dispose(){for(const [n,f,o] of handlers)window.removeEventListener(n,f,{capture:true,...o});window.removeEventListener('contextmenu',menu,true);Object.assign(orbit,saved);camera.fov=baseFov;camera.near=baseNear;camera.updateProjectionMatrix();}};
}
