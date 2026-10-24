// Holodeck stage: the browser half of the ship's computer.
// Enabled only with ?creator=<room>. Receives protocol commands over a WebSocket relay,
// applies a whole batch inside one frame, acknowledges after that frame is drawn, and
// streams the scene state and the viewer's taps back to the Creator.
import {PROTOCOL,ROOM_PATTERN,checkCommand,OPS} from './protocol.mjs';
import {GLTFLoader} from '../vendor/loaders/GLTFLoader.js';
import {makePerson} from '../town-life/people/models.mjs';

export function creatorRoom(search=location.search){const room=new URLSearchParams(search).get('creator');return room&&ROOM_PATTERN.test(room)?room:null;}

export function createStage(ctx,{room,relay}){
 const {T,scene,camera,orbit,renderer}=ctx;
 const layer=new T.Group();layer.name='holodeck';scene.add(layer);
 const entities=new Map(),pendingAcks=[],shots=[];let socket=null,peers={creator:0},rev=0,lastSent='',tapped=null,selected=null,retry=500,closed=false;
 const loader=new GLTFLoader(),catalog=fetch('/simulation-assets/catalog.json').then(r=>r.json()).catch(()=>[]);
 // The model library (R2 catalogue, bundled manifest as fallback). Its ids are spawned as "lib-<id>".
 let libraryList=null;
 const library=()=>libraryList??=fetch('/api/models').then(r=>r.ok?r.json():Promise.reject(Error('store'))).catch(()=>fetch('/models/manifest.json').then(r=>r.json())).then(d=>(d.models||[]).filter(m=>m.urls?.glb)).catch(()=>[]);
 const v=a=>new T.Vector3(...a),round=x=>Math.round(x*100)/100,arr=p=>[round(p.x),round(p.y),round(p.z)];
 const ui=createOverlay(ctx.host,{chip:!!room});

 // ---- world reading -------------------------------------------------------------------
 let worldCache={at:0,list:[]};
 function worldThings(){
  if(performance.now()-worldCache.at<1000)return worldCache.list;
  const people=(ctx.people?.()||[]).slice(0,40).map(p=>({name:p.name,kind:'person',doing:p.doing,position:arr(p.object.getWorldPosition(new T.Vector3())),object:p.object})),things=[],root=ctx.world();
  root?.traverse(o=>{const d=o.userData;if(d?.person||!d?.inspect?.title||!o.visible||things.length>=40)return;things.push({name:String(d.inspect.title),kind:'thing',position:arr(o.getWorldPosition(new T.Vector3())),object:o});});
  return (worldCache={at:performance.now(),list:[...people,...things]}).list;
 }
 function personHeight(){const p=worldThings().find(w=>w.kind==='person');if(!p)return 1.75;const b=new T.Box3().setFromObject(p.object);return Math.max(.05,b.max.y-b.min.y);}
 function resolve(name){
  if(entities.has(name))return entities.get(name).object;
  const lower=name.toLowerCase(),w=worldThings();
  return (w.find(t=>t.name.toLowerCase()===lower)||w.find(t=>t.name.toLowerCase().includes(lower)))?.object||null;
 }
 const ray=new T.Raycaster();
 function groundAt(x,z){
  ray.set(new T.Vector3(x,500,z),new T.Vector3(0,-1,0));ray.camera=camera;
  const targets=[ctx.world(),...ctx.ground()].filter(Boolean);
  // The first surface below that is not a building, prop or inhabitant is the ground.
  const hit=ray.intersectObjects(targets,true).find(h=>h.object.visible&&!h.object.isSprite&&!isCreator(h.object)&&!isWorldThing(h.object));
  return hit?hit.point.y:0;
 }
 const isCreator=o=>{for(let p=o;p;p=p.parent)if(p===layer)return true;return false;};
 const isWorldThing=o=>{for(let p=o;p;p=p.parent)if(p.userData.inspect||p.userData.person)return true;return false;};
 function placement(a,fallback){
  let p=a.at?v(a.at):a.to?v(a.to):null;
  if(!p&&a.near){
   // Beside the target, on the side facing the camera, clear of its footprint.
   const t=resolve(a.near);if(!t)throw Error('Nothing called '+a.near);
   const box=new T.Box3().setFromObject(t),c=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
   const dir=camera.position.clone().sub(c).setY(0).normalize();if(!dir.lengthSq())dir.set(1,0,0);
   p=c.clone().addScaledVector(dir,Math.max(size.x,size.z)/2+personHeight()*.7);p.y=box.min.y;
  }
  if(!p)p=fallback?fallback.clone():orbit.target.clone();
  if(a.offset)p.add(v(a.offset));
  if(a.ground!==false&&!a.at?.length)p.y=groundAt(p.x,p.z);
  else if(a.ground===true)p.y=groundAt(p.x,p.z);
  return p;
 }

 // ---- entity building -----------------------------------------------------------------
 const GEO={box:()=>new T.BoxGeometry(1,1,1).translate(0,.5,0),sphere:()=>new T.SphereGeometry(.5,24,16).translate(0,.5,0),cone:()=>new T.ConeGeometry(.5,1,24).translate(0,.5,0),cylinder:()=>new T.CylinderGeometry(.5,.5,1,24).translate(0,.5,0),torus:()=>new T.TorusGeometry(.4,.12,12,32).rotateX(Math.PI/2).translate(0,.12,0),capsule:()=>new T.CapsuleGeometry(.3,.4,6,16).translate(0,.5,0),pyramid:()=>new T.ConeGeometry(.6,1,4).translate(0,.5,0),ring:()=>new T.TorusGeometry(.5,.05,8,48).translate(0,.55,0),star:starGeometry};
 function starGeometry(){const s=new T.Shape();for(let i=0;i<10;i++){const r=i%2?.22:.5,a=i/10*Math.PI*2+Math.PI/2;s[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r);}return new T.ExtrudeGeometry(s,{depth:.16,bevelEnabled:true,bevelSize:.03,bevelThickness:.03,bevelSegments:2}).translate(0,.5,-.08);}
 async function build(a){
  const unit=a.parent?1:personHeight();
  if(a.shape==='empty'){const g=new T.Group();g.userData.baseScale=unit;return g;}
  if(a.shape){const m=new T.Mesh(GEO[a.shape](),new T.MeshStandardMaterial({color:a.color||'#f2b134',roughness:.55,metalness:.05}));m.castShadow=m.receiveShadow=true;const g=new T.Group();g.add(m);g.userData.baseScale=unit;return g;}
  if(a.person){if(a.parent)throw Error('People cannot be parts');const n=entities.size;const role=a.person.role,child=role==='child',zombie=role==='zombie';const person={index:n,appearance:{build:1,height:child?1.2:1.7,skin:zombie?['#9cbf7a','#8fb37f','#a7c48a'][n%3]:['#e8b98f','#c68c5e','#8d5a3b','#f3d0b0'][n%4],hair:zombie?'#4b4a3a':['#3b2a1e','#a0522d','#e2c16b','#222'][n%4],hairStyle:n%3},wardrobe:{top:a.color||(zombie?['#6f6a8a','#7a5b4a','#56706a'][n%3]:'#4f7cac'),bottom:zombie?'#4a4a3e':'#4a4036',hat:role==='rancher'?'brim':'none',accessory:'none'}};const body=makePerson(person),g=new T.Group();g.add(body);g.userData.baseScale=unit/1.75;g.userData.rig=body.userData;if(zombie){const [l,,r]=body.userData.limbs;l.rotation.x=r.rotation.x=-1.45;}return g;}
  // Pages with a procedural kit (Family Teleport) build those ids locally, with no download.
  if(ctx.kit?.has(a.asset)){const g=new T.Group();g.add(ctx.kit.build(a.asset));g.userData.baseScale=unit;return g;}
  // Library models come in any size: normalise to one person tall on the ground, then scale like shapes.
  if(a.asset.startsWith('lib-')){const m=(await library()).find(m=>'lib-'+m.id===a.asset);if(!m)throw Error('Unknown asset '+a.asset+'; use op catalog');
   const gltf=await loader.loadAsync(m.urls.glb),model=gltf.scene;model.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});
   const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),c=box.getCenter(new T.Vector3()),k=1/Math.max(1e-3,size.y||Math.max(size.x,size.z));
   model.scale.setScalar(k);model.position.set(-c.x*k,-box.min.y*k,-c.z*k);const g=new T.Group();g.add(model);g.userData.baseScale=unit;return g;}
  const item=(await catalog).find(c=>c.id===a.asset);if(!item)throw Error('Unknown asset '+a.asset+'; use op catalog');
  const gltf=await loader.loadAsync(item.glb);const g=new T.Group();gltf.scene.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true;});g.add(gltf.scene);g.userData.baseScale=1;return g;
 }
 function applyScale(e,scale){const b=e.object.userData.baseScale;const s=Array.isArray(scale)?scale:[scale??1,scale??1,scale??1];e.scale=s;e.object.scale.set(s[0]*b,s[1]*b,s[2]*b);}
 function restyle(e,a){
  e.object.traverse(o=>{if(!o.isMesh)return;if(!o.userData.ownMaterial){o.material=o.material.clone();o.userData.ownMaterial=true;}
   if(a.color&&e.kind!=='person')o.material.color?.set(a.color);if(a.emissive){o.material.emissive?.set(a.emissive);o.material.emissiveIntensity=1.4;}
   if(a.opacity!==undefined){o.material.transparent=a.opacity<1;o.material.opacity=a.opacity;o.material.depthWrite=a.opacity>=1;}});
  if(a.color)e.color=a.color;if(a.emissive)e.emissive=a.emissive;if(a.opacity!==undefined)e.opacity=a.opacity;
  if(a.visible!==undefined)e.object.visible=a.visible;
  if(a.label!==undefined)setLabel(e,a.label);
 }
 function setLabel(e,text){
  if(e.labelSprite){e.object.remove(e.labelSprite);e.labelSprite.material.map.dispose();e.labelSprite.material.dispose();e.labelSprite=null;}
  e.label=text||undefined;if(!text)return;
  const c=document.createElement('canvas'),x=c.getContext('2d');c.width=512;c.height=128;x.font='600 56px Manrope, system-ui, sans-serif';const w=Math.min(500,x.measureText(text).width+56);
  x.fillStyle='rgba(255,250,240,.92)';x.beginPath();x.roundRect((512-w)/2,14,w,100,50);x.fill();x.fillStyle='#3a2a1c';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,66);
  const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false,transparent:true}));s.renderOrder=999;
  s.userData.worldHeight=personHeight()*.35;e.labelSprite=s;e.object.add(s);fixLabel(e);
 }
 function fixLabel(e){const s=e.labelSprite;if(!s)return;const ws=e.object.getWorldScale(new T.Vector3());const h=s.userData.worldHeight;s.scale.set(h*4/ws.x,h/ws.y,1);const box=new T.Box3();e.object.children.filter(c=>c!==s).forEach(c=>box.expandByObject(c));s.position.y=(box.isEmpty()?1:(box.max.y-e.object.position.y)/ws.y)+h*.9/ws.y;}

 // ---- ops -----------------------------------------------------------------------------
 const get=id=>{const e=entities.get(id);if(!e)throw Error('No entity '+id);return e;};
 let cameraTween=null;
 const OPS_RUN={
  async state(a){return snapshot(a.world!==false);},
  async catalog(){return [...(ctx.kit?.list()||[]),...(await catalog).map(c=>({id:c.id,label:c.label,category:c.category})),...(await library()).map(m=>({id:'lib-'+m.id,label:m.name,category:'library'}))];},
  async spawn(a){
   const id=a.id||(a.shape||a.asset||'person')+'-'+(entities.size+1);
   if(entities.has(id))OPS_RUN.remove({id});
   const parent=a.parent?get(a.parent):null;if(parent&&a.parent===id)throw Error('An entity cannot be its own part');
   const object=await build(a),e={id,kind:a.shape?'shape':a.asset?'asset':'person',type:a.shape||a.asset||a.person.role||'person',object,behavior:'none',phase:Math.random()*6,parent:parent?.id};
   object.name='holodeck:'+id;object.userData.holodeckId=id;
   // A part sits in its parent's space: at/offset are in parent sizes and it never snaps to the ground.
   if(parent){object.position.copy(a.at?v(a.at):new T.Vector3());if(a.offset)object.position.add(v(a.offset));}else object.position.copy(placement(a));
   e.base=object.position.clone();object.rotation.y=T.MathUtils.degToRad(a.rotationY||0);
   applyScale(e,a.scale);(parent?parent.object:layer).add(object);entities.set(id,e);restyle(e,a);if(a.behavior)e.behavior=a.behavior;
   e.appear={t:0,duration:.35};object.scale.multiplyScalar(.001);
   return {id,position:arr(object.position)};
  },
  async remove(a){
   if(a.all){for(const id of [...entities.keys()])OPS_RUN.remove({id});return {removed:'all'};}
   const e=get(a.id);for(const part of [...entities.values()])if(part.parent===a.id&&entities.has(part.id))OPS_RUN.remove({id:part.id});
   e.object.parent?.remove(e.object);e.object.traverse(o=>{if(o.isMesh&&o.userData.ownMaterial)o.material.dispose();});entities.delete(a.id);return {removed:a.id};
  },
  async move(a){const e=get(a.id),to=e.parent?(a.to?v(a.to):e.object.position.clone()).add(a.offset?v(a.offset):new T.Vector3()):placement({...a,ground:a.ground??!a.to},e.object.position);const d=a.duration??1;
   if(!d){e.object.position.copy(to);e.base=to.clone();e.tween=null;}else e.tween={from:e.object.position.clone(),to,t:0,d};
   if(!e.parent)e.object.lookAt(to.x,e.object.position.y,to.z);return {id:a.id,to:arr(to)};},
  async transform(a){const e=get(a.id);if(a.position){e.object.position.copy(v(a.position));e.base=e.object.position.clone();}
   if(a.rotation)e.object.rotation.set(...a.rotation.map(T.MathUtils.degToRad));if(a.rotationY!==undefined)e.object.rotation.y=T.MathUtils.degToRad(a.rotationY);
   if(a.scale!==undefined){applyScale(e,a.scale);fixLabel(e);}return {id:a.id};},
  async style(a){restyle(get(a.id),a);return {id:a.id};},
  async animate(a){const e=get(a.id);e.behavior=a.behavior;e.speed=a.speed??1;e.radius=a.radius;e.base=e.object.position.clone();e.chase=a.behavior==='chase'?{target:a.target??null,quarry:null,pick:0,ground:Math.random()*.25,caught:0}:null;return {id:a.id,behavior:a.behavior};},
  async people(a){return {speed:ctx.walkPace(a.speed)};},
  async camera(a){
   if(a.fit){ctx.fit();return {fit:true};}
   ctx.stopFollow();
   let target=a.target?v(a.target):orbit.target.clone(),position=a.position?v(a.position):null;
   if(a.focus){const t=resolve(a.focus);if(!t)throw Error('Nothing called '+a.focus);const box=new T.Box3().setFromObject(t);target=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3()).length();const dist=a.distance??Math.max(size*2.2,personHeight()*4);const dir=camera.position.clone().sub(orbit.target).normalize();position=target.clone().addScaledVector(dir,dist);}
   else if(!position&&a.distance)position=target.clone().addScaledVector(camera.position.clone().sub(orbit.target).normalize(),a.distance);
   position??=camera.position.clone().add(target.clone().sub(orbit.target));
   if(a.fov){camera.fov=a.fov;camera.updateProjectionMatrix();}
   const d=a.duration??1;if(!d){camera.position.copy(position);orbit.target.copy(target);orbit.update();cameraTween=null;}
   else cameraTween={p0:camera.position.clone(),t0:orbit.target.clone(),p1:position,t1:target,t:0,d};
   return {position:arr(position),target:arr(target)};
  },
  async time(a){if(a.hour!==undefined)ctx.setHour(a.hour);if(a.paused!==undefined)ctx.setPaused(a.paused);if(a.speed!==undefined)ctx.setSpeed(a.speed);return ctx.clock();},
  async weather(a){ctx.setWeather(a.mode);return {weather:ctx.clock().weather};},
  async narrate(a){ui.caption(a.text,a.seconds??Math.min(12,3+a.text.length/14));return {shown:true};},
  async screenshot(a){return new Promise(resolve=>shots.push({resolve,width:a.width??960,quality:a.quality??.8}));}
 };

 // ---- per-frame -----------------------------------------------------------------------
 let time=0;
 function frame(dt){
  time+=dt;
  if(cameraTween){const c=cameraTween;c.t=Math.min(1,c.t+dt/c.d);const k=ease(c.t);camera.position.lerpVectors(c.p0,c.p1,k);orbit.target.lerpVectors(c.t0,c.t1,k);orbit.update();if(c.t>=1)cameraTween=null;}
  for(const e of entities.values()){
   const o=e.object;
   if(e.appear){e.appear.t+=dt;const k=Math.min(1,e.appear.t/e.appear.duration),pop=1+Math.sin(k*Math.PI)*.18;const b=o.userData.baseScale,s=e.scale;o.scale.set(s[0]*b*k*pop,s[1]*b*k*pop,s[2]*b*k*pop);if(k>=1){e.appear=null;applyScale(e,e.scale);fixLabel(e);}}
   if(e.tween){const w=e.tween;w.t=Math.min(1,w.t+dt/w.d);o.position.lerpVectors(w.from,w.to,ease(w.t));if(e.kind==='person')o.position.y+=Math.abs(Math.sin(w.t*w.d*9))*personHeight()*.03;if(w.t>=1){o.position.copy(w.to);e.base=w.to.clone();e.tween=null;}}
   else if(e.behavior!=='none'){const sp=e.speed??1,t=time*sp+e.phase,h=personHeight();
    if(e.behavior==='spin')o.rotation.y+=dt*sp*1.6;
    if(e.behavior==='bob')o.position.y=e.base.y+(Math.sin(t*2)+1)*h*.12;
    if(e.behavior==='hop')o.position.y=e.base.y+Math.abs(Math.sin(t*3))*h*.3;
    if(e.behavior==='pulse'&&!e.appear){const k=1+Math.sin(t*3)*.08,b=o.userData.baseScale;o.scale.set(e.scale[0]*b*k,e.scale[1]*b*k,e.scale[2]*b*k);}
    if(e.behavior==='chase')chase(e,dt);
    if(e.behavior==='orbit'){const r=e.radius??h*2;o.position.set(e.base.x+Math.cos(t*.8)*r,e.base.y,e.base.z+Math.sin(t*.8)*r);o.rotation.y=-t*.8;}}
  }
 }
 const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;

 // Chase: walk toward the nearest visible inhabitant, spreading chasers across different people.
 // On a catch, a little hop of triumph and then someone new. Speed 1 matches the inhabitants' walk.
 const at=o=>o.getWorldPosition(new T.Vector3());
 function quarryFor(e){
  const c=e.chase,people=worldThings().filter(w=>w.kind==='person'&&w.object.visible);
  if(c.target){const o=resolve(c.target);return o&&o.visible?o:null;}
  const taken=new Set([...entities.values()].filter(x=>x!==e&&x.chase?.quarry).map(x=>x.chase.quarry)),here=e.object.position;
  const ranked=people.filter(p=>p.object!==c.last||people.length===1).map(p=>({o:p.object,d:at(p.object).distanceTo(here)})).sort((x,y)=>x.d-y.d);
  return (ranked.find(p=>!taken.has(p.o))||ranked[0])?.o||null;
 }
 function chase(e,dt){
  const c=e.chase,o=e.object,h=personHeight();
  c.pick-=dt;c.ground-=dt;
  if(c.caught>0){c.caught-=dt;o.position.y=e.base.y+Math.sin(Math.max(0,c.caught)/.6*Math.PI)*h*.35;return;}
  if(!c.quarry?.visible||c.pick<=0){c.quarry=quarryFor(e);c.pick=1.5;}
  const rig=o.userData.rig;
  if(!c.quarry){if(rig)rig.limbs[1].rotation.x=rig.limbs[3].rotation.x=0;return;}
  const goal=at(c.quarry),dx=goal.x-o.position.x,dz=goal.z-o.position.z,dist=Math.hypot(dx,dz);
  if(dist<h*.45){c.last=c.quarry;c.quarry=null;c.pick=0;c.caught=.6;e.base=o.position.clone();return;}
  const step=Math.min(dist,h*4.5*(e.speed??1)*dt);o.position.x+=dx/dist*step;o.position.z+=dz/dist*step;
  if(c.ground<=0){c.ground=.25;c.y=groundAt(o.position.x,o.position.z);}
  o.position.y+=((c.y??o.position.y)-o.position.y)*Math.min(1,dt*10);e.base=o.position.clone();
  const turn=Math.atan2(dx,dz)-o.rotation.y;o.rotation.y+=Math.atan2(Math.sin(turn),Math.cos(turn))*Math.min(1,dt*6);
  if(rig){const g=(c.gait=(c.gait||0)+step/h*3);rig.limbs[1].rotation.x=Math.sin(g)*.55;rig.limbs[3].rotation.x=-Math.sin(g)*.55;rig.limbs[0].rotation.x=-1.45+Math.sin(g)*.12;rig.limbs[2].rotation.x=-1.45-Math.sin(g)*.12;o.children[0].rotation.z=Math.sin(g*.5)*.08;}
 }

 // Called right after the frame's draw call, while the drawing buffer is still readable.
 function rendered(){
  const now=performance.now();
  while(shots.length){const s=shots.shift();s.resolve(capture(s));}
  for(const a of pendingAcks.splice(0)){a.timing.drawn=round(now-a.received);a.timing.drawnEpoch=Date.now();
   if(!a.probe){send(a.message());continue;}
   // Measurement mode: read the pixel back, then wait for the next frame so the drawn one has been presented.
   a.timing.probe=probe(a.probe);requestAnimationFrame(()=>{a.timing.presented=round(performance.now()-a.received);a.timing.presentedEpoch=Date.now();send(a.message());});}
 }
 function capture({width,quality}){const src=renderer.domElement,h=Math.round(width*src.height/src.width),c=document.createElement('canvas');c.width=width;c.height=h;c.getContext('2d').drawImage(src,0,0,width,h);const data=c.toDataURL('image/jpeg',quality);return {mime:'image/jpeg',width,height:h,data:data.slice(data.indexOf(',')+1)};}
 function probe(id){const e=entities.get(id);if(!e)return null;const gl=renderer.getContext(),p=new T.Box3().setFromObject(e.object).getCenter(new T.Vector3()).project(camera),c=renderer.domElement;const x=Math.round((p.x+1)/2*c.width),y=Math.round((p.y+1)/2*c.height);const px=new Uint8Array(4);gl.readPixels(x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);return {x,y,rgb:[px[0],px[1],px[2]]};}

 // ---- state stream ----------------------------------------------------------------------
 function snapshot(world=true){
  const c=ctx.clock();
  return {protocol:PROTOCOL,rev,family:ctx.family(),name:ctx.name(),clock:{hour:round(c.hour),day:c.day,paused:c.paused,speed:c.speed},weather:c.weather,weatherMode:c.weatherMode,peopleSpeed:ctx.walkPace?.(),
   camera:{position:arr(camera.position),target:arr(orbit.target),fov:camera.fov},viewport:{width:innerWidth,height:innerHeight},scaleHint:{personHeight:round(personHeight())},
   entities:[...entities.values()].map(e=>({id:e.id,parent:e.parent,kind:e.kind,type:e.type,position:arr(e.object.position),scale:e.scale,color:e.color,label:e.label,behavior:e.behavior,visible:e.object.visible,moving:!!e.tween})),
   world:world?worldThings().map(({name,kind,doing,position})=>({name,kind,doing,position})):undefined,lastTap:tapped,selected,hidden:document.hidden};
 }
 setInterval(()=>{
  if(socket?.readyState!==1||!peers.creator)return;
  const sel=document.querySelector('#inspection:not([hidden]) #inspect-name')?.textContent||null;if(sel!==selected){selected=sel;if(sel)send({t:'event',kind:'select',name:sel});}
  const s=snapshot(false),key=JSON.stringify({...s,rev:0});if(key===lastSent)return;lastSent=key;s.rev=++rev;send({t:'state',rev,state:s});
 },200);

 // Taps: a click without a drag reports where the viewer pointed, so "put it there" works.
 let down=null;const dom=renderer.domElement;
 dom.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};});
 dom.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||performance.now()-down.t>600)return;const r=dom.getBoundingClientRect();const m=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);const pick=new T.Raycaster();pick.setFromCamera(m,camera);
  const hit=pick.intersectObjects([layer,ctx.world(),...ctx.ground()].filter(Boolean),true).find(h=>h.object.visible&&!h.object.isSprite);if(!hit)return;
  let name=null;for(let o=hit.object;o&&!name;o=o.parent){const d=o.userData;name=d.holodeckId||d.person?.name||d.inspect?.title||null;}
  tapped={point:arr(hit.point),on:name,at:new Date().toISOString()};send({t:'event',kind:'tap',...tapped});});

 // ---- transport -----------------------------------------------------------------------
 function send(m){if(socket?.readyState===1)socket.send(JSON.stringify(m));}
 async function onCommand(m){
  const received=performance.now(),receivedEpoch=Date.now();let results,error;
  ({results,error}=await apply(m.ops));
  const timing={receivedEpoch,applied:round(performance.now()-received)},ack={received,timing,probe:m.probe,message:()=>({t:'ack',id:m.id,ok:!error,error,results,timing,sentAt:m.sentAt})};
  if(document.hidden){timing.drawn=null;send(ack.message());}else pendingAcks.push(ack);
 }
 // Applies a batch in this frame. Shared by the relay and by in-page drivers such as live voice mode.
 async function apply(ops){
  const results=[];let error=null;
  try{if(!Array.isArray(ops)||!ops.length||ops.length>64)throw Error('ops must be a non-empty array of at most 64');ops.forEach(checkCommand);for(const op of ops)results.push(await OPS_RUN[op.op](op.args??{}));}
  catch(e){error=e.message;console.warn('[holodeck]',e.stack||e);}
  if(ops?.some?.(o=>OPS[o.op]?.mutates))rev++;
  return {ok:!error,results,error};
 }
 function connect(){
  if(closed)return;
  // A custom relay is accepted only for local development, so a link cannot hand the scene to another server.
  const local=r=>{try{return ['localhost','127.0.0.1'].includes(new URL(r).hostname);}catch{return false;}};
  const url=new URL(relay&&local(relay)?relay:`${location.protocol==='http:'?'ws':'wss'}://${location.host}/api/holodeck`);url.searchParams.set('room',room);url.searchParams.set('role','stage');
  socket=new WebSocket(url);ui.status('connecting');
  socket.onopen=()=>{retry=500;ui.status(peers.creator?'online':'waiting');};
  socket.onmessage=ev=>{let m;try{m=JSON.parse(ev.data);}catch{return;}
   if(m.t==='welcome'||m.t==='presence'){peers=m.peers;ui.status(peers.creator?'online':'waiting');if(peers.creator){lastSent='';}}
   else if(m.t==='cmd')onCommand(m);
   else if(m.t==='ping')send({t:'pong',at:m.at});};
  socket.onclose=()=>{ui.status('offline');peers={creator:0};setTimeout(connect,retry);retry=Math.min(retry*2,8000);};
 }
 if(room)connect();
 return {frame,rendered,snapshot,apply,caption:ui.caption,dispose(){closed=true;socket?.close();scene.remove(layer);}};
}

function createOverlay(host,{chip:showChip=true}={}){
 const style=document.createElement('style');
 style.textContent=`.holodeck-caption{position:fixed;left:50%;bottom:max(110px,14vh);transform:translate(-50%,12px);max-width:min(720px,calc(100vw - 32px));padding:12px 20px;border-radius:18px;background:rgba(26,22,18,.72);backdrop-filter:blur(10px);color:#fff8ec;font:500 19px/1.4 Fraunces,Georgia,serif;text-align:center;opacity:0;transition:opacity .35s,transform .35s;pointer-events:none;z-index:40}
.holodeck-caption.show{opacity:1;transform:translate(-50%,0)}
.holodeck-status{display:inline-flex;align-items:center;gap:6px;font:600 12px Manrope,system-ui,sans-serif;color:inherit;opacity:.85;padding:0 8px;white-space:nowrap}
.holodeck-status i{width:8px;height:8px;border-radius:50%;background:#b9b1a5;display:inline-block}
.holodeck-status[data-s=online] i{background:#3fb37f;box-shadow:0 0 0 3px rgba(63,179,127,.25)}.holodeck-status[data-s=waiting] i{background:#e0a33a}`;
 document.head.append(style);
 const cap=document.createElement('div');cap.className='holodeck-caption';cap.setAttribute('role','status');cap.setAttribute('aria-live','polite');document.body.append(cap);
 const chip=document.createElement('span');chip.className='holodeck-status';chip.innerHTML='<i></i><span>Computer</span>';
 if(showChip)(document.querySelector('header .toolbar-spacer')?.after?document.querySelector('header .toolbar-spacer').after(chip):document.body.append(chip));
 let timer=0;const labels={online:'Computer online',waiting:'Computer: waiting for Creator',connecting:'Computer: connecting',offline:'Computer offline'};
 return {caption(text,seconds){cap.textContent=text;cap.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>cap.classList.remove('show'),seconds*1000);},
  status(s){chip.dataset.s=s;chip.title=labels[s];chip.lastChild.textContent=s==='online'?'Computer':s==='waiting'?'Computer…':'Computer ✕';}};
}
