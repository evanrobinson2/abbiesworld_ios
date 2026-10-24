import * as T from 'three';
// AW-STUDY-0015 Tile Drop Impact (docs/oracle/tiledrop/TILE_DROP_STUDY.md).
// A dropped tile is a heavy thing landing: it winds up, slams, squashes, settles, squeezes a ring of dust out from
// under its edges, throws clods, shakes the camera and makes a layered crunch-thud timed to the impact frame.
// Presentation only: never changes stored tile coordinates, terrain or simulation. Dust and clods are in-fiction
// (the ground really puffs), the shake is meta (felt in the body), the sound is diegetic.

const TIMING={windUp:.14,fall:.24,settle:.62};
const IMPACT=TIMING.windUp+TIMING.fall;
const DUST={puffs:360,clods:110};
const SOUND_SOURCES=['/api/sounds','/sounds/manifest.json'];
const R2_PUBLIC='https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev/';
// The crunch-thud, back to front: Sonniss slots from tools/sound-engineer/library.mjs, then two synthesised layers that
// always play (the sub thump and the noise crunch), so the impact still lands with no catalogue or offline.
const LAYERS=[
 {slot:'meteor',gain:.95,delay:0,rate:.82},        // the body: a low boom
 {slot:'rock-fall',gain:.7,delay:.025,rate:1},      // the crunch tail: debris settling
 {slot:'place-stone',gain:.85,delay:0,rate:.7},     // the transient: stone on stone, pitched down
 {slot:'place-wood',gain:.55,delay:.012,rate:.8}    // the toy: a wooden board-game knock
];
const easeOut=t=>1-(1-t)**3;

// The tile's motion. `group` is the drawn tile at its resting transform.
export function dropTile(group,{reducedMotion=false,onImpact,lift}={}){
 const position=group.position.clone(),scale=group.scale.clone(),rotation=group.rotation.clone();
 const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),radius=Math.max(1,Math.max(size.x,size.z)/2);
 const height=lift??Math.max(3,radius*1.25),tilt=(Math.random()<.5?-1:1)*.06,yaw=(Math.random()-.5)*.09;
 const duration=reducedMotion?0:IMPACT+TIMING.settle;let time=0,done=false,hit=false;
 function set(y,sy,sxz,rx=0,rz=0,ry=0){group.position.set(position.x,position.y+y,position.z);group.scale.set(scale.x*sxz,scale.y*sy,scale.z*sxz);group.rotation.set(rotation.x+rx,rotation.y+ry,rotation.z+rz);}
 function impact(){if(hit)return;hit=true;onImpact?.({group,position,radius});}
 const finish=()=>{set(0,1,1);impact();done=true;};
 function pose(t){
  if(t<TIMING.windUp){const u=t/TIMING.windUp,k=Math.sin(u*Math.PI/2);// wind-up: hangs, rises a touch and crouches
   set(height*(1+.07*k),1-.07*k,1+.035*k,tilt*(1-.3*k),tilt*.6,yaw);return;}
  if(t<IMPACT){const u=(t-TIMING.windUp)/TIMING.fall,s=u*u;// slam: gravity, stretching with speed
   set(height*1.07*(1-s),1+.12*s,1-.045*s,tilt*.7*(1-s),tilt*.42*(1-s),yaw*(1-s));return;}
  impact();const u=(t-IMPACT)/TIMING.settle,d=Math.exp(-5.2*u),w=Math.cos(u*Math.PI*3.4);// squash, then a damped spring
  set(height*.035*Math.max(0,Math.sin(u*Math.PI*1.7))*d,1-.2*d*w,1+.09*d*w);
 }
 if(duration)pose(0);else finish();
 return {update(dt){if(done)return;time+=Math.max(0,dt);if(time>=duration)finish();else pose(time);},finish,get done(){return done;},get impacted(){return hit;},get progress(){return duration?Math.min(1,time/duration):1;},impactIn:()=>Math.max(0,IMPACT-time)};
}

// AW-STUDY-0025 (Evan, 2026-10-23 08:43Z): "drop it on the board, it should then roll like a die randomly for a while
// until it stops". The tile comes in from the side it was thrown from, hits the board (dust and crunch-thud on the
// first hit), tumbles end over end about its own centre with a fading spin, hops twice, and settles square on its hex.
// Same contract as dropTile: presentation only, it ends exactly at the stored transform.
export function rollTile(group,{reducedMotion=false,onImpact,lift}={}){
 const position=group.position.clone(),scale=group.scale.clone(),rest=group.quaternion.clone();
 const box=new T.Box3().setFromObject(group),size=box.getSize(new T.Vector3()),radius=Math.max(1,Math.max(size.x,size.z)/2),centre=new T.Vector3(0,size.y*.5/Math.max(1e-6,scale.y),0);
 const height=lift??Math.max(3,radius*1.6),side=Math.random()*Math.PI*2,run=radius*1.4,from=new T.Vector3(Math.sin(side)*run,0,Math.cos(side)*run);
 const axis=new T.Vector3(Math.cos(side),0,-Math.sin(side)).applyAxisAngle(new T.Vector3(0,1,0),(Math.random()-.5)*.6).normalize(),turns=2+Math.floor(Math.random()*2)+Math.random()*.4;
 const FALL=.42,ROLL=1.15,SETTLE=.5,duration=reducedMotion?0:FALL+ROLL+SETTLE;let time=0,done=false,hit=false;
 const q=new T.Quaternion(),spin=new T.Quaternion(),c=new T.Vector3();
 function set(offset,y,quat,sy=1,sxz=1){c.copy(centre).multiply(scale);const lifted=c.clone().applyQuaternion(quat);group.position.set(position.x+offset.x,position.y+y+c.y-lifted.y,position.z+offset.z).add(new T.Vector3(c.x-lifted.x,0,c.z-lifted.z));group.quaternion.copy(quat);group.scale.set(scale.x*sxz,scale.y*sy,scale.z*sxz);}
 function impact(){if(hit)return;hit=true;onImpact?.({group,position,radius});}
 const finish=()=>{group.position.copy(position);group.quaternion.copy(rest);group.scale.copy(scale);impact();done=true;};
 function pose(t){
  if(t<FALL){const u=t/FALL;spin.setFromAxisAngle(axis,-.5*u);q.copy(rest).premultiply(spin);set(from,height*(1-u*u),q);return;}
  impact();
  if(t<FALL+ROLL){const u=(t-FALL)/ROLL,e=1-(1-u)**2.2,a=turns*Math.PI*2*e-.5*(1-e);// a spin that fades, two hops that shrink
   const hop=Math.abs(Math.sin(u*Math.PI*2))*height*.22*(1-u)**1.5;spin.setFromAxisAngle(axis,a);q.copy(rest).premultiply(spin);
   set(from.clone().multiplyScalar((1-e)*(1-e)),hop,q);return;}
  const u=(t-FALL-ROLL)/SETTLE,d=Math.exp(-6*u),w=Math.cos(u*Math.PI*3.2);// square on the hex, then a damped squash
  const k=Math.min(1,u*2.5),e=1-(1-k)**3;spin.setFromAxisAngle(axis,(turns+(Math.round(turns)-turns)*e)*Math.PI*2);q.copy(rest).premultiply(spin);set(new T.Vector3(),0,q,1-.14*d*w,1+.06*d*w);
 }
 if(duration)pose(0);else finish();
 return {update(dt){if(done)return;time+=Math.max(0,dt);if(time>=duration)finish();else pose(time);},finish,get done(){return done;},get impacted(){return hit;},get progress(){return duration?Math.min(1,time/duration):1;},impactIn:()=>Math.max(0,FALL-time)};
}

// One instanced mesh of puffs and one of clods: two draw calls for the whole burst, nothing allocated per frame.
export function createImpactEffects(scene,{camera}={}){
 const puffGeo=new T.IcosahedronGeometry(1,1),clodGeo=new T.DodecahedronGeometry(1,0);
 const puffMat=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,transparent:false});
 const clodMat=new T.MeshStandardMaterial({color:'#ffffff',roughness:.95,metalness:0,flatShading:true});
 const puffs=new T.InstancedMesh(puffGeo,puffMat,DUST.puffs),clods=new T.InstancedMesh(clodGeo,clodMat,DUST.clods);
 // One zero-sized instance stays drawn so both shaders compile with the scene, not on the impact frame.
 for(const m of [puffs,clods]){m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;m.raycast=()=>{};m.userData.presentation='impact-dust';m.setMatrixAt(0,new T.Matrix4().makeScale(0,0,0));m.setColorAt(0,new T.Color());m.count=1;m.castShadow=false;}
 clods.castShadow=true;puffs.receiveShadow=true;
 const P=Array.from({length:DUST.puffs},()=>({p:new T.Vector3(),v:new T.Vector3(),age:1,life:1,size:1,spin:0})),C=Array.from({length:DUST.clods},()=>({p:new T.Vector3(),v:new T.Vector3(),age:1,life:1,size:1,ground:0,r:new T.Euler(),w:new T.Vector3()}));
 const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),color=new T.Color();let live=false,shake=0,shakeAmp=0,shakeTime=0;const offset=new T.Vector3(),seed=Math.random()*100;
 scene.add(puffs,clods);
 // Corners of a flat-top hex at angle a; dust squeezes out fastest from the edges' midpoints and plumes at the corners.
 function burst({position,radius,groundAt=()=>position.y,dust='#d9b98a',soil='#6b4a2e',strength=1}){
  const base=new T.Color(dust),dark=new T.Color(soil);
  P.forEach((d,i)=>{const a=Math.random()*Math.PI*2,edge=radius*(.92+.12*Math.random()),corner=Math.abs(Math.cos(3*a));
   const x=position.x+Math.sin(a)*edge,z=position.z+Math.cos(a)*edge,plume=i<DUST.puffs*.18;
   d.p.set(x,groundAt(x,z)+.05+Math.random()*.15,z);
   const out=(2.2+Math.random()*5.5)*(.6+.4*radius/4)*strength*(plume?.45:1);
   d.v.set(Math.sin(a)*out,(plume?2.6+corner*2.2:.35+Math.random()*1.4)*strength,Math.cos(a)*out);
   d.age=0;d.life=(plume?2.4:1.3)+Math.random()*1.4;d.size=(plume?.75:.38+Math.random()*.55)*(.55+.45*radius/4);d.spin=Math.random()*6;
   color.copy(base).lerp(dark,Math.random()*.22).offsetHSL(0,0,(Math.random()-.5)*.08);puffs.setColorAt(i,color);});
  C.forEach((d,i)=>{const a=Math.random()*Math.PI*2,edge=radius*(.75+.3*Math.random()),x=position.x+Math.sin(a)*edge,z=position.z+Math.cos(a)*edge;
   d.ground=groundAt(x,z);d.p.set(x,d.ground+.1,z);const out=(1.5+Math.random()*4)*strength;d.v.set(Math.sin(a)*out,(3+Math.random()*5.5)*strength,Math.cos(a)*out);
   d.age=0;d.life=1+Math.random()*.8;d.size=(.035+Math.random()*.09)*(.6+.4*radius/4);d.w.set(Math.random()*14,Math.random()*14,Math.random()*14);
   color.copy(dark).lerp(base,Math.random()*.35);clods.setColorAt(i,color);});
  puffs.instanceColor.needsUpdate=clods.instanceColor.needsUpdate=true;puffs.count=DUST.puffs;clods.count=DUST.clods;live=true;
 }
 function update(dt){
  if(shakeTime>0){shakeTime=Math.max(0,shakeTime-dt);shake+=dt;}
  if(!live)return;let alive=0;
  P.forEach((d,i)=>{d.age+=dt;const t=Math.min(1,d.age/d.life);if(t<1)alive++;const drag=Math.exp(-3.4*dt);d.v.multiplyScalar(drag);d.v.y+=.35*dt;d.p.addScaledVector(d.v,dt);
   const grow=t<.12?easeOut(t/.12):1,fade=t>.55?1-easeOut((t-.55)/.45):1,r=d.size*(.35+1.25*easeOut(Math.min(1,t*1.6)))*grow*fade;
   q.setFromAxisAngle(s.set(0,1,0),d.spin*t);m.compose(d.p,q,s.set(r,r*.82,r));puffs.setMatrixAt(i,m);});
  C.forEach((d,i)=>{d.age+=dt;const t=Math.min(1,d.age/d.life);if(t<1)alive++;d.v.y-=24*dt;d.p.addScaledVector(d.v,dt);
   if(d.p.y<d.ground){d.p.y=d.ground;d.v.y*=-.32;d.v.x*=.55;d.v.z*=.55;d.w.multiplyScalar(.5);}
   d.r.set(d.w.x*d.age,d.w.y*d.age,d.w.z*d.age);q.setFromEuler(d.r);const r=d.size*(t>.8?1-(t-.8)/.2:1);m.compose(d.p,q,s.set(r,r,r));clods.setMatrixAt(i,m);});
  puffs.instanceMatrix.needsUpdate=clods.instanceMatrix.needsUpdate=true;
  if(!alive){live=false;m.makeScale(0,0,0);puffs.setMatrixAt(0,m);clods.setMatrixAt(0,m);puffs.count=clods.count=1;}
 }
 // Camera shake: a decaying, low-frequency wobble applied around the render, then removed, so orbit state is untouched.
 function kick(amplitude=.12,seconds=.42){shakeAmp=Math.max(shakeAmp*(shakeTime>0?1:0),amplitude);shakeTime=seconds;shake=0;}
 function shakeIn(cam=camera){if(!cam||shakeTime<=0){offset.set(0,0,0);return;}const k=(shakeTime/.42)**2*shakeAmp,f=shake*38+seed;
  offset.set(Math.sin(f)*.6+Math.sin(f*2.3)*.4,Math.sin(f*1.7+1)*.7+Math.sin(f*3.1)*.3,Math.sin(f*1.3+2)*.5).multiplyScalar(k);cam.position.add(offset);}
 function shakeOut(cam=camera){if(offset.lengthSq())cam.position.sub(offset);offset.set(0,0,0);}
 return {burst,kick,update,shakeIn,shakeOut,get active(){return live||shakeTime>0;},dispose(){scene.remove(puffs,clods);puffGeo.dispose();clodGeo.dispose();puffMat.dispose();clodMat.dispose();}};
}

// The layered crunch-thud. Buffers are fetched when a card is picked up (prime), so the impact plays sample-accurate.
export function createImpactSound(){
 let context=null,master=null,catalogue=null,loading=null;const buffers=new Map();
 async function loadCatalogue(){for(const url of SOUND_SOURCES){try{const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)continue;const j=await r.json(),list=(Array.isArray(j)?j:j.sounds||[]).filter(s=>s.urls?.audio);if(!list.length)continue;const by=new Map();for(const s of list){const k=s.slot||s.id;if(!by.has(k))by.set(k,[]);by.get(k).push(s);}return by;}catch{}}return new Map();}
 async function fetchAudio(url){for(const u of url.startsWith('/r2/')?[url,R2_PUBLIC+url.slice(4)]:[url]){try{const r=await fetch(u);if(r.ok)return await r.arrayBuffer();}catch{}}throw Error('sound unavailable');}
 // The longest take of a slot is usually the fullest; short takes are kept as the fallback.
 function take(slot){const list=catalogue?.get(slot);return list?.length?[...list].sort((a,b)=>(b.duration||0)-(a.duration||0))[0]:null;}
 function buffer(s){if(!buffers.has(s.id))buffers.set(s.id,fetchAudio(s.urls.audio).then(b=>context.decodeAudioData(b)).catch(()=>null));return buffers.get(s.id);}
 function ensure(){if(!context){const A=window.AudioContext||window.webkitAudioContext;if(!A)return false;context=new A();master=context.createDynamicsCompressor();master.threshold.value=-10;master.ratio.value=4;const out=context.createGain();out.gain.value=.9;master.connect(out).connect(context.destination);}if(context.state==='suspended')context.resume().catch(()=>{});return true;}
 function prime(){if(!ensure())return Promise.resolve();loading??=loadCatalogue().then(c=>{catalogue=c;for(const l of LAYERS){const s=take(l.slot);if(s)buffer(s);}});return loading;}
 async function sample(l,at,strength){const s=take(l.slot);if(!s)return;const b=await buffer(s);if(!b||at<context.currentTime-.03)return;const src=context.createBufferSource(),g=context.createGain();src.buffer=b;src.playbackRate.value=l.rate;g.gain.value=l.gain*strength;src.connect(g).connect(master);src.start(Math.max(context.currentTime,at+l.delay));src.onended=()=>{src.disconnect();g.disconnect();};}
 // Schedule the whole stack for `inSeconds` from now: the impact frame is known when the slam starts.
 function play(inSeconds=0,strength=1){if(!ensure())return;const at=context.currentTime+Math.max(0,inSeconds);for(const l of LAYERS)sample(l,at,strength);}
 return {prime,play,layers:LAYERS.map(l=>l.slot),get context(){return context;}};
}

// One sound stack per page, shared by the board and the hand of cards (which primes it when a card is picked up).
let shared=null;export const sharedImpactSound=()=>shared??=createImpactSound();

// Dust colours per tile type: how the ground of each place looks when it puffs.
export const IMPACT_DUST={ranch:['#d8b98c','#6e4b2c'],paddock:['#d8b98c','#6e4b2c'],crop:['#c9a27a','#4f3420'],meadow:['#dcc79a','#5d6b2f'],moon:['#cfd0d4','#6c6e76'],city:['#d6cdbf','#77706a'],ai:['#e6d3b0','#7a6040']};
export const IMPACT_TIMING={...TIMING,impact:IMPACT};
