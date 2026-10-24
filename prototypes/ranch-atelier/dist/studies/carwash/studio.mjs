import * as T from 'three';
import {buildMoonBuggy} from '../../simulations/carwash/buggy.mjs';
import {VEHICLES} from '../../simulations/effect-hunt/vehicles.mjs';
import {mountContext} from '../../look/context-card.mjs';

const $=s=>document.querySelector(s),revision='carwash-l1-20261024-r2';
const toolNames={rinse:'Rinse',soap:'Soap',scrub:'Scrub',pressure:'Tire pressure wash',wax:'Wax',dry:'Dry'};
let tool='rinse',vehicleId='buggy',vehicle,parts=[],patches=[],holding=false,hit=null,finished=false,run=0;
const earned={buggy:0,coaster:0};
function panel(open){$('#panel').hidden=!open;document.body.classList.toggle('panel-open',open);$('#panel-toggle').setAttribute('aria-expanded',String(open));}
panel(innerWidth>=1000);$('#panel-toggle').onclick=()=>panel($('#panel').hidden);$('#close-panel').onclick=()=>panel(false);
$('#nav-toggle').onclick=()=>{$('#nav').classList.toggle('open');$('#nav-toggle').setAttribute('aria-expanded',String($('#nav').classList.contains('open')))};
$('#nav').onclick=()=>$('#nav').classList.remove('open');addEventListener('keydown',e=>{if(e.key==='Escape'){panel(false);$('#nav').classList.remove('open')}});
const say=t=>$('#scene-status').textContent=t;
const host=$('#scene'),scene=new T.Scene();scene.background=new T.Color('#d2e8db');
const camera=new T.PerspectiveCamera(38,1,.1,100);camera.position.set(5,4.3,6);camera.lookAt(0,1,0);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;host.append(renderer.domElement);
scene.add(new T.HemisphereLight('#fffbe7','#688477',2.8));const sun=new T.DirectionalLight('#fff4d5',3);sun.position.set(3,8,5);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.bias=-.001;scene.add(sun);
const mat=(color,opts={})=>new T.MeshStandardMaterial({color,roughness:.65,...opts});
const mint=mat('#78bfa9'),cream=mat('#fff3ca'),coral=mat('#f57f66'),dark=mat('#244f48'),steel=mat('#abc8bd',{metalness:.5,roughness:.35});
function mesh(g,m,p=[0,0,0],parent=scene){const o=new T.Mesh(g,m);o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
const box=(w,h,d,m,p,parent)=>mesh(new T.BoxGeometry(w,h,d),m,p,parent);
const cyl=(r,h,m,p,parent)=>mesh(new T.CylinderGeometry(r,r,h,32),m,p,parent);
const sphere=(r,m,p,parent)=>mesh(new T.SphereGeometry(r,16,12),m,p,parent);
// Study-only workshop geometry. The vehicle is the existing game builder.
box(18,.3,16,mint,[0,-.45,0]);
for(let x=-5;x<6;x++)for(let z=-4;z<5;z++)box(.96,.025,.96,(x+z)%2?mat('#dce8d6'):mat('#eaf0df'),[x,-.28,z]);
box(13,4,.25,cream,[0,1.7,-4.3]);
for(let x=-6;x<=6;x+=1.2)box(.04,3.8,.03,mint,[x,1.7,-4.15]);
box(7.4,2.4,.16,coral,[0,2.2,-4.08]);box(7,2,.18,mat('#a9d5d5'),[0,2.2,-3.96]);
// A view of Overland hills, framed like a wash-studio window.
for(let i=0;i<5;i++){const h=sphere(1.2,mat(['#83b883','#a2c88c','#729e72'][i%3]),[-2.8+i*1.4,1.1,-3.8]);h.scale.set(1.2,.65,.1)}
box(8,.18,.6,cream,[0,1.1,-3.7]);
for(const x of [-4.6,4.6]){box(.35,4.4,.35,coral,[x,1.9,-2.5]);box(.6,.4,.6,cream,[x,4,-2.5]);}
box(9.5,.28,.3,coral,[0,4,-2.5]);
const turntable=new T.Group();scene.add(turntable);cyl(2.45,.28,dark,[0,-.11,0],turntable);cyl(2.3,.08,coral,[0,.06,0],turntable);cyl(2.17,.025,mat('#f5c5a5'),[0,.115,0],turntable);
for(let i=0;i<16;i++){const a=i/16*Math.PI*2;box(.12,.03,.24,cream,[Math.sin(a)*2.25,.12,Math.cos(a)*2.25],turntable).rotation.y=a;}
const carRoot=new T.Group();carRoot.position.y=.14;scene.add(carRoot);
const rollers=[];for(const x of [-3.4,3.4]){const g=new T.Group();g.position.set(x,1,-1.5);scene.add(g);cyl(.19,2.7,dark,[0,.1,0],g);for(let i=0;i<10;i++){const a=i/10*Math.PI*2;for(let j=0;j<5;j++){const b=box(.33,.3,.17,j%2?coral:mint,[Math.cos(a)*.36,-.8+j*.4,Math.sin(a)*.36],g);b.rotation.y=-a;}}rollers.push(g);}
// Two-link articulated arm; its tool tip is placed at the hit point every frame, with no trailing interpolation.
const arm=new T.Group();scene.add(arm);const shoulder=new T.Vector3(-2.8,3.3,-1.1);
cyl(.45,.25,dark,[-2.8,3.3,-1.1],arm);const upper=box(.22,1,.28,cream,[0,0,0],arm),fore=box(.18,1,.23,mint,[0,0,0],arm);
const joints=[sphere(.22,coral,[0,0,0],arm),sphere(.2,coral,[0,0,0],arm),sphere(.14,steel,[0,0,0],arm)];
const head=new T.Group();scene.add(head);const toolGroup=new T.Group();head.add(toolGroup);const ring=mesh(new T.TorusGeometry(.22,.025,8,32),coral,[0,0,.06],toolGroup);
const brush=cyl(.23,.1,cream,[0,0,0],toolGroup);brush.rotation.x=Math.PI/2;
const bristles=[];for(let i=0;i<18;i++){const a=i/18*Math.PI*2;bristles.push(box(.035,.035,.16,coral,[Math.cos(a)*.18,Math.sin(a)*.18,.08],toolGroup));}
const nozzle=mesh(new T.ConeGeometry(.1,.32,12),steel,[0,0,0],toolGroup);nozzle.rotation.x=Math.PI/2;
function poseArm(point,normal){const end=point.clone().addScaledVector(normal,.12),mid=shoulder.clone().add(end).multiplyScalar(.5);const d=shoulder.distanceTo(end),lift=Math.sqrt(Math.max(.05,3.3**2-(d/2)**2));mid.y+=lift*.7;mid.z-=lift*.3;
 const segment=(o,a,b)=>{o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=a.distanceTo(b);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());};segment(upper,shoulder,mid);segment(fore,mid,end);[shoulder,mid,end].forEach((p,i)=>joints[i].position.copy(p));head.position.copy(end);head.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),normal.clone().negate());}
poseArm(new T.Vector3(1,1.3,1),new T.Vector3(0,1,0));
const particleGeo=new T.SphereGeometry(.035,6,4),particleMats=[mat('#f4fcff'),mat('#91dbec'),mat('#d4b08a')],particles=[];
for(let i=0;i<65;i++){const p=mesh(particleGeo,particleMats[i%3]);p.visible=false;p.userData.life=0;particles.push(p);}
let particleIndex=0;
function puff(point,normal){for(let j=0;j<2;j++){const p=particles[particleIndex++%particles.length];p.position.copy(point);p.visible=true;p.material=particleMats[tool==='scrub'?2:tool==='soap'?0:1];p.userData.life=.4+Math.random()*.3;p.userData.v=normal.clone().multiplyScalar(.4).add(new T.Vector3((Math.random()-.5)*1.5,1,(Math.random()-.5)*1.5));}}
const ray=new T.Raycaster(),ndc=new T.Vector2(),scratch=new T.Vector3();
let random=()=>Math.random();function seed(n){random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296}}
function disposeCar(){if(!vehicle)return;const materials=new Set(),geometries=new Set();carRoot.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});carRoot.clear();for(const m of materials)m.dispose();for(const g of geometries)g.dispose();}
function newRun(){holding=false;hit=null;finished=false;run++;seed(run*137+29);disposeCar();vehicle=vehicleId==='buggy'?buildMoonBuggy({theme:'sunny',dirt:0,withRider:false}):VEHICLES.coaster.build();vehicle.parts.riders?.forEach(r=>r.removeFromParent());vehicle.group.traverse(o=>{if(o.name.startsWith('rider-'))o.visible=false});carRoot.add(vehicle.group);carRoot.rotation.y=0;$('#rotation').value=0;parts=[];patches=[];
 vehicle.group.traverse(o=>{if(o.isMesh&&o.visible&&o.material?.color&&!/glow|mud-splat/.test(o.name)){o.material=o.material.clone();o.userData.cleanColor=o.material.color.clone();o.material.color.lerp(new T.Color('#715336'),.7);o.castShadow=true;parts.push(o)}});scene.updateMatrixWorld(true);
 // Surface patches are sampled from the actual model, never the empty space around it.
 for(let i=0;i<420;i++){const a=random()*Math.PI*2,e=.03+random()*1.25;const origin=new T.Vector3(Math.cos(a)*5,1+Math.sin(e)*4,Math.sin(a)*5);const target=new T.Vector3((random()-.5)*.8,.5+random()*.65,(random()-.5)*1.8);ray.set(origin,target.sub(origin).normalize());const h=ray.intersectObjects(parts,false)[0];if(!h)continue;const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);if(n.y<-.5)continue;
 const wheel=/tyre|hub|tread|lug|wheel/.test(h.object.name);const p=mesh(new T.IcosahedronGeometry(.09+random()*.07,1),mat(i%4?'#785432':'#b6a27a'),[0,0,0],carRoot);p.position.copy(carRoot.worldToLocal(h.point.clone().addScaledVector(n,.018)));p.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);p.scale.set(1,.19,1);p.castShadow=false;p.userData={dirt:1,wet:0,soap:0,wax:0,dry:0,credit:0,foam:0,wheel,part:h.object,normal:n};patches.push(p);}
 $('#result').hidden=true;say('Rinse, soap, scrub — one part at a time.');updateScore();window.RanchView?.changed();}
function progress(q){return q.wheel?(1-q.dirt)*.7+q.wax*.15+q.dry*.15:q.wet*.1+q.soap*.1+(1-q.dirt)*.5+(q.dirt<.02&&q.foam<.02?.1:0)+q.wax*.1+q.dry*.1;}
function score(){return Math.round(patches.reduce((n,p)=>n+p.userData.credit,0)/Math.max(1,patches.length)*10000)}
function cleanPct(){return patches.reduce((n,p)=>n+1-p.userData.dirt,0)/Math.max(1,patches.length)*100}
function updateScore(){$('#score').textContent=score().toLocaleString();$('#clean').value=cleanPct();$('#clean-label').textContent=Math.round(cleanPct())+'% dirt removed';$('#combo').textContent=toolNames[tool];}
function work(point,normal,dt){if(finished)return;const pLocal=carRoot.worldToLocal(point.clone()),rad=tool==='pressure'?.3:tool==='scrub'?.38:.46;let changed=false;
 for(const p of patches){if(p.position.distanceTo(pLocal)>rad)continue;const q=p.userData,before=progress(q);if(tool==='rinse'){q.wet=Math.min(1,q.wet+dt*3);q.foam=Math.max(0,q.foam-dt*2.5);q.dry=0;}
 else if(tool==='soap'&&q.wet>.15&&q.dirt>.02){q.soap=Math.min(1,q.soap+dt*3);q.foam=Math.min(1,q.foam+dt*3);}
 else if(tool==='scrub'&&q.soap>.15){q.dirt=Math.max(0,q.dirt-dt*(q.wheel?.35:1.7));q.foam=Math.min(1,q.foam+dt);}
 else if(tool==='pressure'){q.wet=Math.min(1,q.wet+dt*3);q.foam=Math.max(0,q.foam-dt*3);q.dirt=Math.max(0,q.dirt-dt*(q.wheel?2:q.soap>.15?.45:.06));q.dry=0;}
 else if(tool==='wax'&&q.dirt<.02&&q.foam<.02){q.wax=Math.min(1,q.wax+dt*2);}
 else if(tool==='dry'&&q.dirt<.02&&q.foam<.02){q.dry=Math.min(1,q.dry+dt*2);}
 q.credit=Math.max(q.credit,progress(q));if(progress(q)!==before)changed=true;
 const level=Math.max(q.dirt,q.foam*.85);const droplet=level<.02&&q.wet>.2&&q.dry<.98;p.visible=level>.015||droplet;p.scale.setScalar(droplet?.18*(1-q.dry):Math.max(.01,level));p.scale.y*=droplet?.7:.19;p.material.color.set(droplet?'#8acbdf':q.foam>.1?'#f5f3dd':q.wet>.2?'#60452f':'#86613b');
 }
 if(changed){updateMaterials();updateScore();}if(tool!=='wax'&&tool!=='dry')puff(point,normal);
}
function updateMaterials(){const groups=new Map();for(const p of patches){const q=p.userData;if(!groups.has(q.part))groups.set(q.part,[]);groups.get(q.part).push(q)}for(const [o,qs]of groups){const dirt=qs.reduce((n,q)=>n+q.dirt,0)/qs.length,wet=qs.reduce((n,q)=>n+q.wet*(1-q.dry),0)/qs.length,wax=qs.reduce((n,q)=>n+q.wax,0)/qs.length;o.material.color.copy(o.userData.cleanColor).lerp(new T.Color('#715336'),dirt*.7);o.material.roughness=.7-wet*.25-wax*.25;}}
function pick(e){const rect=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(ndc,camera);hit=ray.intersectObjects(parts,false).find(h=>h.object.visible)||null;if(hit){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);poseArm(hit.point,n);}}
const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;holding=true;canvas.setPointerCapture(e.pointerId);pick(e);});canvas.addEventListener('pointermove',pick);const release=()=>{holding=false;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);addEventListener('blur',release);document.addEventListener('visibilitychange',release);
const tips={rinse:'Water loosens the mud. Rinse the top and sides.',soap:'Soap sticks to wet patches.',scrub:'Scrub the soapy top and sides.',pressure:'Aim at the tires. Blast away the sludge.',wax:'Wax clean, rinsed paint for a shine.',dry:'Blow the droplets off clean, rinsed parts.'};
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('selected',x===b));brush.visible=ring.visible=tool==='scrub'||tool==='wax';bristles.forEach(x=>x.visible=tool==='scrub');nozzle.visible=!brush.visible;say(tips[tool]);updateScore();if(innerWidth<1000)panel(false)});
$('#rotation').oninput=e=>{holding=false;hit=null;carRoot.rotation.y=+e.target.value*Math.PI/180;scene.updateMatrixWorld(true);};$('#front').onclick=()=>{$('#rotation').value=0;$('#rotation').dispatchEvent(new Event('input'))};$('#back').onclick=()=>{$('#rotation').value=180;$('#rotation').dispatchEvent(new Event('input'))};
$('#vehicle').onchange=e=>{vehicleId=e.target.value;newRun()};$('#reset').onclick=()=>newRun();
$('#finish').onclick=()=>{if(finished)return;holding=false;finished=true;const value=score();earned[vehicleId]+=value;const unlocked=earned[vehicleId]>=1500;const r=$('#result');r.hidden=false;r.textContent=`${vehicle.name}: ${value.toLocaleString()} points. ${unlocked?'Bubble Parade unlocked for this vehicle! Color preview applied.':'Every bit counts. '+earned[vehicleId].toLocaleString()+' / 1,500 toward Bubble Parade.'} Session-only study reward.`;
 if(unlocked){for(const o of parts)if(/body|chassis|cowl|nose|fender/.test(o.name))o.material.color.set('#fd8bb5');}say(value?'Nice work. Your partial wash counts!':'A fresh start is ready whenever you are.');window.RanchView?.changed();};
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;if(transition)transition.target.copy(destination());else camera.position.copy(destination());camera.lookAt(0,view==='tires'?.6:.9,0);camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);
let zoom=1,view='front',transition=null;
const viewPos={front:[0,3,7],rear:[0,3,7],left:[0,3,7],right:[0,3,7],top:[0,7,.15],tires:[0,1.4,6]};
const viewAngles={front:0,rear:Math.PI,left:Math.PI/2,right:-Math.PI/2,top:0,tires:Math.PI/2};
function destination(){const narrow=host.clientWidth/host.clientHeight<.8?1.65:1;const scale=narrow*[1,.77,.57][zoom-1];const v=new T.Vector3(...viewPos[view]);return v.sub(new T.Vector3(0,.9,0)).multiplyScalar(scale).add(new T.Vector3(0,.9,0));}
function changeView(key=view){view=key;holding=false;hit=null;const angle=viewAngles[key],delta=Math.atan2(Math.sin(angle-carRoot.rotation.y),Math.cos(angle-carRoot.rotation.y));transition={start:performance.now(),angle:carRoot.rotation.y,end:carRoot.rotation.y+delta,position:camera.position.clone(),target:destination()};document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===key));}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{changeView(b.dataset.view);if(innerWidth<1000)panel(false)});
document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{zoom=+b.dataset.zoom;document.querySelectorAll('[data-zoom]').forEach(x=>x.classList.toggle('selected',x===b));changeView();if(innerWidth<1000)panel(false)});
let last=performance.now();renderer.setAnimationLoop(now=>{const dt=Math.min(.04,(now-last)/1000);last=now;if(transition){const t=Math.min(1,(now-transition.start)/250),k=t*t*(3-2*t);carRoot.rotation.y=T.MathUtils.lerp(transition.angle,transition.end,k);camera.position.lerpVectors(transition.position,transition.target,k);camera.lookAt(0,view==='tires'?.6:.9,0);$('#rotation').value=carRoot.rotation.y*180/Math.PI;if(t===1){transition=null;scene.updateMatrixWorld(true);}}if(holding&&hit&&!transition){const n=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);poseArm(hit.point,n);work(hit.point,n,dt);toolGroup.rotation.z+=dt*10;}for(const r of rollers)r.rotation.y+=dt*.4;for(const p of particles){if(p.userData.life<=0)continue;p.userData.life-=dt;p.position.addScaledVector(p.userData.v,dt);p.userData.v.y-=dt*2;p.visible=p.userData.life>0;}renderer.render(scene,camera);});
newRun();document.querySelector('[data-tool="rinse"]').click();
// Read-only study evidence for browser verification and the shared view bridge.
window.washStudio={get state(){return{revision,tool,vehicleId,view,zoom,turning:!!transition,score:score(),clean:cleanPct(),finished,patches:patches.length,earned:{...earned}}},targets(){scene.updateMatrixWorld(true);return patches.filter(p=>p.visible).map(p=>{const q=p.getWorldPosition(new T.Vector3()).project(camera),r=canvas.getBoundingClientRect();return{x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2,wheel:p.userData.wheel}})},renderer,scene,camera};
window.RanchView?.register('carwash-exploration',()=>window.washStudio.state,()=>renderer.render(scene,camera));
// Existing shared feedback API. Each note carries stable study + revision + current interaction context.
const noteKey='carwash-study-note';try{$('#note').value=localStorage.getItem(noteKey)||''}catch{}
$('#note').oninput=()=>{try{localStorage.setItem(noteKey,$('#note').value)}catch{}};
$('#sign-in').href='/api/auth/login?return='+encodeURIComponent(location.pathname);let saving=false;
async function notes(){try{const r=await fetch('/api/feedback',{credentials:'same-origin',cache:'no-store'});if(r.status===401){$('#sign-in').hidden=false;$('#feedback-status').textContent='Sign in to read and save shared notes.';return}if(!r.ok)throw Error('Shared notes unavailable. Your draft stays here.');const data=await r.json();$('#notes').replaceChildren();for(const item of(data.items||[]).filter(i=>i.entryId==='carwash-l1-20261024'||i.studyId==='carwash')){const a=document.createElement('article'),t=document.createElement('time'),p=document.createElement('p');t.textContent=new Date(item.receivedAt).toLocaleString();p.textContent=item.note;a.append(t,p);$('#notes').append(a)}$('#feedback-status').textContent='Shared notes loaded.';$('#sign-in').hidden=true;}catch(e){$('#feedback-status').textContent=e.message}}
$('#note-form').onsubmit=async e=>{e.preventDefault();const note=$('#note').value.trim();if(!note||saving)return;saving=true;$('#save-note').disabled=true;try{const r=await fetch('/api/feedback',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({note,entryId:'carwash-l1-20261024',studyId:'carwash',studyLevel:'Exploration',studyContext:JSON.stringify(window.washStudio.state),buildId:revision,title:'Carwash Level 1 Exploration',page:location.href,threadTitle:'Carwash Level 1 exploration',viewport:`${innerWidth}x${innerHeight}`})});if(r.status===401){$('#sign-in').hidden=false;throw Error('Sign in to save. Your draft is still here.')}if(!r.ok)throw Error('Not saved. Please retry.');const data=await r.json();$('#note').value='';try{localStorage.removeItem(noteKey)}catch{}await notes();$('#feedback-status').textContent='Saved to shared feedback · '+data.id;}catch(e){$('#feedback-status').textContent=e.message}finally{saving=false;$('#save-note').disabled=false}};$('#refresh').onclick=notes;notes();
if($('#context'))mountContext($('#context'),'carwash');

// Keep the shared connection control accessible without covering this study’s tool toggle.
const placeConnection=()=>{const b=document.querySelector('#ranch-view-sharing'),parent=document.querySelector('#panel .scroll');if(b&&parent&&!parent.contains(b))parent.append(b)};new MutationObserver(placeConnection).observe(document.body,{childList:true,subtree:true});placeConnection();
