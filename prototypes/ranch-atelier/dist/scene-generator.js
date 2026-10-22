import {RanchRenderer} from './ranch-renderer.js';
import {intentFor} from './simulation-intent.js';
import {replayChange,replayAdvance,replaySample} from './ranch-replay.js';

import {calibratedScale} from './model-calibration.js';

import {paddockView} from './property-view.js';

import * as T from 'three';

import {OrbitControls} from '/vendor/OrbitControls.js';

import {generateScene,farmEnvelope,terrainHeight} from './scene-layout.js';

import {storyMaterial} from './storybook-materials.js?v=2';

import {initTheme,getTheme,setTheme,usePreset,applyToThree} from './theme-engine.js';

const $=id=>document.getElementById(id),host=$('scene-viewport'),status=$('scene-status');

const scene=new T.Scene();scene.background=new T.Color('#e8edde');

const renderer=new RanchRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;host.append(renderer.domElement);

const camera=new T.PerspectiveCamera(35,1,.1,500),orbit=new OrbitControls(camera,renderer.domElement);orbit.maxPolarAngle=Math.PI*.47;orbit.minDistance=8;orbit.maxDistance=120;

scene.add(new T.HemisphereLight('#fff5df','#82906f',.8));const sun=new T.DirectionalLight('#fff1da',2.1);sun.position.set(-15,27,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:85});sun.shadow.normalBias=.025;scene.add(sun);

let lifePlaying=false,lifeSeconds=0,lifeTick=0,initialConditions=null,constructionRun=null;

let actionRevision=0;
let replayPrefs={speed:1,selectedId:'',following:false,emojis:'all'};
let previousFollowView=null;
let world,layout,run,envelope,worker,records=[],serial=0,busy=false,settings={seed:43,size:'small',area:1,density:'balanced',farmType:'mixed',topology:4,relief:1,modelSize:1};const templates=new Map();

const activityLabels=new Map();let lifeActors=[];

const labelLayer=document.createElement('div');labelLayer.id='scene-activity-labels';host.append(labelLayer);

function activityEmoji(activity=''){

 if(/rest|sleep/.test(activity))return '💤';

 if(/water|drink/.test(activity))return '💧';

 if(/food|feed/.test(activity))return '🌾';

 if(/clean|manure|compost/.test(activity))return '🧹';

 if(/build/.test(activity))return '🔨';

 if(/wood|material|collect|unload/.test(activity))return '🪵';

 if(/horse|ride/.test(activity))return '🐴';

 if(/walk/.test(activity))return '🚶';

 if(/plan/.test(activity))return '📋';

 return '⏳';

}

function positionLabels(){

 const enabled=replayPrefs.emojis!=='off'&&!busy;

 for(const [id,label]of activityLabels){const model=world?.children.find(o=>o.userData.farmEntity===id);if(!enabled||(replayPrefs.emojis==='selected'&&replayPrefs.selectedId!==id)||!model||!model.visible||!lifeActors.some(a=>a.id===id)){label.hidden=true;continue;}

 const point=model.position.clone();point.y+=(model.userData.labelHeight||.6)+.12;point.project(camera);

 label.hidden=point.z < -1||point.z>1||Math.abs(point.x)>1||Math.abs(point.y)>1;

 label.style.left=((point.x+1)/2*host.clientWidth)+'px';label.style.top=((1-point.y)/2*host.clientHeight)+'px';}

}

function render(){renderer.render(scene,camera);positionLabels()}orbit.addEventListener('change',()=>{render();window.RanchView?.changed()});

function fit(top=false){if(!world)return;const box=new T.Box3().setFromObject(world),center=box.getCenter(new T.Vector3()),r=box.getSize(new T.Vector3()).length()/2,angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));camera.position.copy(center).add(new T.Vector3(top?.01:1,top?1:1.05,top?.01:1.25).normalize().multiplyScalar(r/Math.sin(angle)*.85));orbit.target.copy(center);orbit.update();render()}

new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();if(replayPrefs.following){followResident();render();}else fit()}).observe(host);

function surface(color,role){return {color:new T.Color(color).convertLinearToSRGB().toArray(),role}}

function primitive(geometry,color,role){const mesh=new T.Mesh(geometry,storyMaterial(color,role==='soil'||role==='water'||role==='foliage'?'ground':'wood'));mesh.userData.ownedGeometry=true;mesh.userData.themeSurface=surface(color,role);mesh.receiveShadow=true;return mesh}

async function template(id){if(!templates.has(id))templates.set(id,(async()=>{const record=records.find(r=>r.id===id);if(!record)throw Error('Unknown model: '+id);const r=await fetch(record.json);if(!r.ok)throw Error('Could not load '+id);const parts=await r.json(),g=new T.Group();for(const part of parts){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));if(part.normals?.length===part.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(part.normals,3));else geo.computeVertexNormals();const mesh=new T.Mesh(geo,storyMaterial(new T.Color().setRGB(...part.color,T.SRGBColorSpace),part.role==='foliage'?'foliage':'wood'));mesh.userData.themeSurface=part;mesh.castShadow=mesh.receiveShadow=true;g.add(mesh)}return g})().catch(e=>{templates.delete(id);throw e}));return templates.get(id)}

function dispose(group){group.traverse(m=>{if(m.userData.ownedGeometry||m.userData.ranchBlossoms)m.geometry?.dispose();m.material?.dispose()})}

function setBusy(value){busy=value;actionRevision++;for(const id of ['scene-generate','scene-rebuild','scene-load','scene-save','scene-export','scene-simulate','scene-use-result','scene-review-build','scene-import','neighbor-start'])$(id).disabled=value;$('scene-use-result').disabled=value||!run?.scenario;$('scene-review-build').disabled=value||!constructionRun;host.setAttribute('aria-busy',String(value));updateMission();syncReplay()}

async function displayFrame(index,refit=false){

 const ticket=++serial;let next;lifeActors=[];

 try{

 const plan=generateScene({run,index,envelope});await Promise.all([...new Set(plan.placements.map(p=>p.assetId))].map(template));if(ticket!==serial)return;

 next=new T.Group();const radius=plan.envelope.radius;

 const ground=(x,z)=>terrainHeight(run,plan.envelope,x,z,settings.relief);

 const positions=[],walls=[],edge=[];const vertex=(p)=>[p[0],ground(...p),p[1]];

 function triangle(a,b,c,depth){if(depth){const ab=a.map((v,i)=>(v+b[i])/2),bc=b.map((v,i)=>(v+c[i])/2),ca=c.map((v,i)=>(v+a[i])/2);triangle(a,ab,ca,depth-1);triangle(ab,b,bc,depth-1);triangle(ca,bc,c,depth-1);triangle(ab,bc,ca,depth-1);}else positions.push(...vertex(a),...vertex(b),...vertex(c));}

 for(let i=0;i<6;i++){const a=[Math.sin(i*Math.PI/3)*radius,Math.cos(i*Math.PI/3)*radius],b=[Math.sin((i+1)*Math.PI/3)*radius,Math.cos((i+1)*Math.PI/3)*radius];triangle([0,0],a,b,4);for(let j=0;j<16;j++)edge.push(a.map((v,k)=>v+(b[k]-v)*j/16));}

 const bottom=Math.min(...edge.map(p=>ground(...p)))-.55;

 for(let i=0;i<edge.length;i++){const a=vertex(edge[i]),b=vertex(edge[(i+1)%edge.length]),c=[a[0],bottom,a[2]],d=[b[0],bottom,b[2]];walls.push(...a,...b,...c,...b,...d,...c);}

 function geometry(points){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.computeVertexNormals();return g;}

 const land=primitive(geometry(positions),'#a4b781','foliage');land.material.side=T.DoubleSide;next.add(land);

 const skirt=primitive(geometry(walls),'#94795b','soil');skirt.material.side=T.DoubleSide;next.add(skirt);

 function ribbon(segment,color,role,y){const a=new T.Vector3(segment.from.x,ground(segment.from.x,segment.from.z)+y,segment.from.z),b=new T.Vector3(segment.to.x,ground(segment.to.x,segment.to.z)+y,segment.to.z),d=b.clone().sub(a);if(d.length()<.001)return;const mesh=primitive(new T.BoxGeometry(segment.width,.012,d.length()+.025),color,role);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),d.normalize());next.add(mesh);}

 for(const w of plan.water)ribbon(w,'#8dbac0','water',.049);

 for(const path of plan.paths)ribbon(path,'#cdbc91','unmapped',.06);

 const fences=paddockView(T,plan.paddocks,p=>({x:(p[0]-plan.envelope.cx)*plan.envelope.scale,z:(p[1]-plan.envelope.cz)*plan.envelope.scale}),ground,plan.envelope.scale);fences.traverse(o=>{if(o.geometry)o.userData.ownedGeometry=true});next.add(fences);

 for(const p of plan.placements){

 const model=(await template(p.assetId)).clone(true);model.traverse(m=>{if(m.material)m.material=m.material.clone()});

 const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());p.scale*=settings.modelSize;model.scale.setScalar(calibratedScale(p.assetId)!==null?calibratedScale(p.assetId)*plan.envelope.scale*settings.modelSize:p.scale/Math.max(size.x,size.z));

 for(const child of model.children){child.position.x-=center.x;child.position.z-=center.z;child.position.y-=box.min.y;}

 p.y=p.footprint?.polygon?Math.max(...p.footprint.polygon.map(q=>ground((q[0]-plan.envelope.cx)*plan.envelope.scale,(q[1]-plan.envelope.cz)*plan.envelope.scale)))+.025:ground(p.x,p.z)+.025;model.position.set(p.x,p.y,p.z);model.rotation.y=p.rotation||0;model.userData.farmEntity=p.id;model.userData.labelHeight=size.y*model.scale.y;next.add(model);

 }

 applyToThree(next,T);if(world){scene.remove(world);dispose(world)}world=next;scene.add(world);layout=plan;for(const o of world.children){const actor=run.frames[index].workers.find(w=>w.id===o.userData.farmEntity);if(actor?.offsite)o.visible=false;}

 $('scene-caption').textContent='Day '+(plan.seconds/86400).toFixed(1)+' · '+run.summary.animals+' residents · One farm, one decorative tile';

 $('scene-time').value=index;$('scene-day').textContent='Day '+(plan.seconds/86400).toFixed(1);
 $('scene-summary').textContent='';

 $('scene-summary').textContent=run.summary.completed+'/'+run.summary.total+' structures completed · '+run.summary.care+' care deliveries. Actual simulation positions and paths; terrain follows the simulation height field. Relief and model size are visual controls; farm type changes animal care, not crop production.';

 if(refit)fit();else render();window.RanchView?.changed();

 }catch(e){if(next)dispose(next);status.textContent=e.message;console.error(e)}

}

function build(input){

 lifeActors=[];

 lifePlaying=false;$('scene-life').hidden=true;

 stopFollowing();worker?.terminate();++serial;setBusy(true);$('scene-timeline').hidden=true;status.textContent='Running the ranch simulation...';settings={seed:input.seed,size:input.size||'small',area:input.area||1,density:input.density||'balanced',farmType:input.farmType||'mixed',topology:Number.isInteger(input.topology)?Math.max(1,Math.min(9,input.topology)):4,relief:Number.isFinite(input.relief)?Math.max(0,Math.min(6,input.relief)):1,modelSize:Number.isFinite(input.modelSize)?Math.max(.5,Math.min(2,input.modelSize)):1};syncControls();

 worker=new Worker('/simulation-worker.js?v=topography9');const activeWorker=worker;

 worker.onmessage=async({data})=>{if(data.type==='progress'){status.textContent=data.message;$('scene-progress').value=data.progress;}

 if(data.type==='error'){status.textContent=data.message;setBusy(false);worker.terminate();}

 if(data.type==='result'){

  run=data.run;constructionRun=run;$('scene-timeline-label').textContent='Review growth';initialConditions=run.initialConditions;envelope=farmEnvelope(run);worker.terminate();updateInitialConditions();

  $('scene-seed').value=run.seed;$('scene-size').value=settings.size;$('scene-time').max=run.frames.length-1;

  // Calculate once from the entire recorded farm; reveal days without moving its origin or camera.

  const days=run.frames.map((f,i)=>i).filter(i=>i===0||run.frames[i].seconds%86400===0||i===run.frames.length-1);

  for(const [step,index] of days.entries()){

   if(worker!==activeWorker)return;

   status.textContent='Building day '+(run.frames[index].seconds/86400).toFixed(0)+' of '+(run.duration/86400).toFixed(0)+'…';

   await displayFrame(index,step===0);

   await new Promise(resolve=>setTimeout(resolve,350));

  }

  if(worker!==activeWorker)return;

  $('scene-timeline').hidden=false;status.textContent=run.paused?'Construction paused for care. This snapshot cannot start a new run yet.':'Ranch built. Its structures, residents and supplies are now the starting conditions. Choose Simulate this ranch.';setBusy(false);if(run.activityLoop){lifeSeconds=100;lifePlaying=true;$('scene-life').hidden=false;$('scene-life-toggle').textContent='Pause farm life';}

 }}



 worker.onerror=e=>{status.textContent='Simulation stopped: '+e.message;setBusy(false)};

 worker.postMessage({type:'run',...settings,sceneOnly:true,dailyPreview:false,activityLoop:false,checkpoint:true});

}

function readControls(){return {size:$('scene-size').value,topology:Number($('scene-topology').value),area:Number($('scene-area').value),density:$('scene-density').value,farmType:$('scene-type').value,relief:Number($('scene-relief').value),modelSize:Number($('scene-model-size').value)};}

const topologyNames=['None','Barely rolling','Gentle','Rolling','Hilly','Rugged','Mountainous','Wild','Extreme - unpredictable'];
function topologyLabel(){const n=Number($('scene-topology').value);$('scene-topology-value').textContent=n+' / 9 - '+topologyNames[n-1];$('scene-topology').setAttribute('aria-valuetext',n+' of 9, '+topologyNames[n-1]);}
$('scene-topology').oninput=topologyLabel;
function syncControls(){for(const [id,key]of [['topology','topology'],['area','area'],['density','density'],['type','farmType'],['relief','relief'],['model-size','modelSize']])$('scene-'+id).value=settings[key];topologyLabel();$('scene-relief-value').textContent=settings.relief+'x';$('scene-model-size-value').textContent=settings.modelSize+'x';}

for(const [id,key]of [['relief','relief'],['model-size','modelSize']])$('scene-'+id).oninput=e=>{settings[key]=Number(e.target.value);syncControls();if(run&&!busy)displayFrame(layout?.index??0);};

function fresh(){return crypto.getRandomValues(new Uint32Array(1))[0]||1}

function recipe(){return {version:3,kind:'simulated-ranch-artifact',initialConditions,settings,theme:getTheme(),boundary:{kind:'decorative-hex',...envelope},terrain:run.world.terrain,activityLoop:run.activityLoop,simulation:{duration:run.duration,summary:run.summary,paused:run.paused,frame:run.frames[layout.index]},layout,assetCatalog:'/simulation-assets/catalog.json',coordinates:'Y-up, model positions in display units; source simulation metres retained in frame'};}

$('scene-generate').onclick=()=>build({seed:fresh(),...readControls()});

$('scene-rebuild').onclick=()=>{const seed=Number($('scene-seed').value);if(!Number.isInteger(seed)||seed<1||seed>4294967295){status.textContent='Enter a whole-number seed from 1 to 4294967295.';return}build({seed,...readControls()})};

$('scene-fit').onclick=()=>{stopFollowing();fit();};$('scene-top').onclick=()=>{stopFollowing();fit(true);};

$('scene-time').oninput=e=>{const index=Number(e.target.value);if(run?.scenario&&run.activityLoop){replayUI({type:'seek',seconds:Math.max(0,Math.min(run.activityLoop.duration,run.frames[index].seconds-(run.activityLoop.startSeconds||0)))});}else{lifePlaying=false;displayFrame(index);}};

$('scene-save').onclick=()=>{try{localStorage.setItem('ranch-scene-v2',JSON.stringify({settings,theme:getTheme()}));status.textContent='Simulation seed and theme saved. Load reruns the same farm.'}catch{status.textContent='Storage unavailable. Download the artifact instead.'}};

$('scene-load').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem('ranch-scene-v2'));if(!saved?.settings||!['small','large'].includes(saved.settings.size)||!Number.isInteger(saved.settings.seed))throw Error('No saved simulated farm on this device.');setTheme(saved.theme);build(saved.settings)}catch(e){status.textContent=e.message}};

$('scene-export').onclick=()=>{if(!run||!layout)return;const url=URL.createObjectURL(new Blob([JSON.stringify(recipe(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ranch-artifact-'+settings.seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Artifact downloaded: placements, simulation frame, theme and separate boundary.'};

window.addEventListener('ranch-theme-change',()=>{if(world)applyToThree(world,T);$('scene-theme').value=getTheme().preset;render();window.RanchView?.changed()});

async function start(){const contract=await initTheme();$('scene-theme').append(...contract.presets.map(p=>new Option(p.label,p.id)),new Option('Your theme','custom'));$('scene-theme').value=getTheme().preset;$('scene-theme').onchange=e=>{if(e.target.value!=='custom')usePreset(e.target.value)};const r=await fetch('/simulation-assets/catalog.json');if(!r.ok)throw Error('Asset library unavailable');records=await r.json();window.RanchView?.register('sceneGenerator',()=>({settings,theme:getTheme(),boundary:envelope,seconds:layout?.seconds,placements:layout?.placements.length,busy,initialConditions:initialConditions?{schema:initialConditions.schema,seconds:initialConditions.state.seconds,residents:initialConditions.state.animals.manager.residents.length}:null,neighborhood:missionReport(),scenario:run?.scenario,balances:run?.balances,lifePlaying,lifeSeconds,people:lifeActors.map(a=>({id:a.id,activity:a.activity,emoji:activityEmoji(a.activity)})),activityEmojis:replayPrefs.emojis!=='off',replay:replayReport(),paddocks:layout?.paddocks?.length,propertyVersion:run?.world?.property?.version,shading:'storybook-toon-3-band',camera:camera.position.toArray(),cameraTarget:orbit.target.toArray(),framing:replayPrefs.following?'close-resident-follow':'fixed-full-run'}),render);build({seed:43,size:'small'});if(world&&innerWidth<800)window.RanchDrawers?.close()}start().catch(e=>{status.textContent=e.message;console.error(e)});



function lifeFrame(time){

 requestAnimationFrame(lifeFrame);const dt=lifeTick?Math.min(.1,(time-lifeTick)/1000):0;lifeTick=time;

 if(!lifePlaying||busy||!run?.activityLoop||!world||document.hidden)return;

 const next=replayAdvance(replayState(),dt,run.activityLoop.duration);lifeSeconds=next.seconds/run.activityLoop.duration*300;lifePlaying=next.playing;paintLife();

}

function paintLife(){

 const loop=run?.activityLoop;if(!loop||!world)return;

 const seconds=lifeSeconds/300*loop.duration,sample=replaySample(loop.samples,seconds);if(!sample)return;const a=sample.current,b=sample.next;

 const entities=new Map(world.children.filter(o=>o.userData.farmEntity).map(o=>[o.userData.farmEntity,o]));

 lifeActors=a.workers;

 for(const actor of a.workers){const model=entities.get(actor.id),end=b.workers.find(w=>w.id===actor.id);if(!model||!end)continue;model.visible=!actor.offsite;if(actor.offsite){const label=activityLabels.get(actor.id);if(label)label.hidden=true;continue;}

 const waypoints=[{seconds:a.seconds,position:actor.position},...(end.motion||[]).filter(p=>p.seconds>a.seconds&&p.seconds<b.seconds),{seconds:b.seconds,position:end.position}];let k=1;while(k<waypoints.length-1&&waypoints[k].seconds<seconds)k++;const p=waypoints[k-1],q=waypoints[k],u=Math.max(0,Math.min(1,(seconds-p.seconds)/Math.max(.001,q.seconds-p.seconds))),x=(p.position[0]+(q.position[0]-p.position[0])*u-envelope.cx)*envelope.scale,z=(p.position[2]+(q.position[2]-p.position[2])*u-envelope.cz)*envelope.scale;

 const resting=actor.activity==='resting'&&end.activity==='resting',slot=a.workers.findIndex(w=>w.id===actor.id),px=x+(resting?Math.cos(slot*2.4)*.26:0),pz=z+(resting?Math.sin(slot*2.4)*.26:0);model.position.set(px,terrainHeight(run,envelope,px,pz,settings.relief)+.025,pz);const dx=q.position[0]-p.position[0],dz=q.position[2]-p.position[2];if(Math.hypot(dx,dz)>.01)model.rotation.y=Math.atan2(dx,dz);model.userData.activity=actor.activity;

 let label=activityLabels.get(actor.id);if(!label){label=document.createElement('span');label.className='scene-activity-label';labelLayer.append(label);activityLabels.set(actor.id,label);}

 const name=actor.name||actor.id.replaceAll('-',' '),description=intentFor(actor).text;label.textContent=activityEmoji(actor.activity);label.title=name+': '+description;label.setAttribute('aria-label',label.title);

 }

 const animalFrames=loop.animalSamples||[],ai=Math.max(0,Math.min(animalFrames.length-2,Math.floor(seconds/600))),af=animalFrames[ai],bf=animalFrames[ai+1]||af;
 for(const actor of af?.animals||[]){const model=entities.get(actor.id),end=bf.animals.find(a=>a.id===actor.id);if(!model||!end)continue;const waypoints=[{seconds:af.seconds,position:actor.position},...(end.motion||[]).filter(p=>p.seconds>af.seconds&&p.seconds<bf.seconds).map(p=>({...p,position:p.position.length===2?[p.position[0],actor.position[1],p.position[1]]:p.position})),{seconds:bf.seconds,position:end.position}];let k=1;while(k<waypoints.length-1&&waypoints[k].seconds<seconds)k++;const a=waypoints[k-1],b=waypoints[k],u=Math.max(0,Math.min(1,(seconds-a.seconds)/Math.max(.001,b.seconds-a.seconds))),x=(a.position[0]+(b.position[0]-a.position[0])*u-envelope.cx)*envelope.scale,z=(a.position[2]+(b.position[2]-a.position[2])*u-envelope.cz)*envelope.scale;model.position.set(x,terrainHeight(run,envelope,x,z,settings.relief)+.025,z);const dx=b.position[0]-a.position[0],dz=b.position[2]-a.position[2];if(Math.hypot(dx,dz)>.01)model.rotation.y=Math.atan2(dx,dz);}
 const absolute=(loop.startSeconds||0)+seconds; $('scene-caption').textContent='Day '+(absolute/86400).toFixed(1)+' · '+run.summary.animals+' residents · Completed-run replay'; const hour=Math.floor(absolute%86400/3600),minute=Math.floor(absolute%3600/60);$('scene-life-clock').textContent='Day '+Math.floor(absolute/86400)+' · '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');$('scene-life-time').value=lifeSeconds;syncReplay();followResident();render();

}

function replayState(){return {...replayPrefs,seconds:lifeSeconds/300*(run?.activityLoop?.duration||0),playing:lifePlaying};}
function replayReport(){
 const loop=run?.scenario&&run.activityLoop;if(!loop)return {available:false,mode:'completed-run-replay'};
 const state=replayState(),sample=replaySample(loop.samples,state.seconds),people=(sample?.current.workers||[]).map(a=>({id:a.id,name:a.name||a.id,activity:a.activity,intent:intentFor(a).text,offsite:!!a.offsite,position:a.position}));
 return {available:true,mode:'completed-run-replay',...state,effectivePlaying:lifePlaying&&!busy&&!document.hidden,durationSeconds:loop.duration,absoluteSeconds:(loop.startSeconds||0)+state.seconds,sampledSeconds:sample?.current.seconds,people,selected:people.find(a=>a.id===state.selectedId)||null,changesCompletedRun:false};
}
function syncReplay(){
 if(run?.scenario)$('scene-timeline').hidden=true;
 const ready=!!run?.scenario&&!!run?.activityLoop&&!busy,people=run?.activityLoop?.samples?.[0]?.workers||[],select=$('scene-resident');
 const key=people.map(a=>a.id).join('|');if(select.dataset.roster!==key){select.replaceChildren(new Option('Whole ranch',''),...people.map(a=>new Option(a.name||a.id,a.id)));select.dataset.roster=key;}
 if(!people.some(a=>a.id===replayPrefs.selectedId)){restoreFollowView();replayPrefs.selectedId='';replayPrefs.following=false;}
 select.value=replayPrefs.selectedId;$('scene-replay-speed').value=String(replayPrefs.speed);$('scene-emojis').value=replayPrefs.emojis;
 $('scene-life-toggle').textContent=lifePlaying?'Pause replay':lifeSeconds>=300?'Replay from start':'Play replay';
 $('scene-follow').textContent=replayPrefs.following?'Stop following':'Follow resident';
 for(const id of ['scene-life-toggle','scene-life-time','scene-replay-speed','scene-step-back','scene-step-next','scene-resident','scene-emojis'])$(id).disabled=!ready;
 $('scene-follow').disabled=!ready||!replayPrefs.selectedId;
 const actor=lifeActors.find(a=>a.id===replayPrefs.selectedId);$('scene-resident-detail').textContent=actor?(actor.name||actor.id)+' · '+intentFor(actor).text+(actor.offsite?' · Off-site; camera waits at ranch':''):'';
}
function followResident(){
 if(!replayPrefs.following)return;
 const model=world?.children.find(o=>o.userData.farmEntity===replayPrefs.selectedId);if(!model?.visible)return;
 if(!previousFollowView)previousFollowView={position:camera.position.clone(),target:orbit.target.clone(),minDistance:orbit.minDistance};
 const height=Math.max(.12,model.userData.labelHeight||.2),span=Math.max(.8,height*5),target=model.position.clone();target.y+=height*.55;
 const direction=previousFollowView.position.clone().sub(previousFollowView.target);direction.y=0;if(direction.lengthSq()<.01)direction.set(1,0,1.25);direction.normalize();
 camera.position.copy(target).addScaledVector(direction,span);camera.position.y=target.y+span*.65;
 camera.position.y=Math.max(camera.position.y,terrainHeight(run,envelope,camera.position.x,camera.position.z,settings.relief)+height*1.5);
 orbit.minDistance=.15;orbit.target.copy(target);orbit.update();
}
function restoreFollowView(){if(previousFollowView){camera.position.copy(previousFollowView.position);orbit.target.copy(previousFollowView.target);orbit.minDistance=previousFollowView.minDistance;previousFollowView=null;orbit.update();render();}}
function stopFollowing(){if(replayPrefs.following){replayPrefs.following=false;restoreFollowView();actionRevision++;syncReplay();window.RanchView?.changed();}}
async function controlReplay(command){
 if(busy||!run?.scenario||!run.activityLoop)throw Error('Complete a daily run first');
 const next=replayChange(replayState(),command,run.activityLoop.duration,run.activityLoop.samples[0].workers.map(a=>a.id));
 if(layout.index!==run.frames.length-1)await displayFrame(run.frames.length-1);
 if(replayPrefs.following&&!next.following)restoreFollowView();
 replayPrefs={speed:next.speed,selectedId:next.selectedId,following:next.following,emojis:next.emojis};lifeSeconds=next.seconds/run.activityLoop.duration*300;lifePlaying=next.playing;actionRevision++;paintLife();window.RanchView?.changed();return replayReport();
}
const replayUI=command=>controlReplay(command).catch(e=>{status.textContent=e.message;});
$('scene-life-toggle').onclick=()=>replayUI({type:lifePlaying?'pause':'play'});
$('scene-life-time').oninput=e=>replayUI({type:'seek',seconds:Number(e.target.value)/300*run.activityLoop.duration});
$('scene-replay-speed').onchange=e=>replayUI({type:'speed',speed:Number(e.target.value)});
$('scene-step-back').onclick=()=>replayUI({type:'step',seconds:-60});
$('scene-step-next').onclick=()=>replayUI({type:'step',seconds:60});
$('scene-resident').onchange=e=>replayUI({type:'resident',id:e.target.value});
$('scene-follow').onclick=()=>replayUI({type:'follow',enabled:!replayPrefs.following});
orbit.addEventListener('start',stopFollowing);

requestAnimationFrame(lifeFrame);



$('scene-emojis').onchange=e=>replayUI({type:'emojis',mode:e.target.value});


function updateInitialConditions(){
 updateMission();
 const s=initialConditions?.state;
 $('scene-run-controls').hidden=!s;
 if(!s)return;
 const complete=s.workers.jobs.filter(j=>j.status==='complete').length;
 const stocks=Object.entries(s.workers.careStock).map(([k,v])=>k+' '+v.toFixed(1)).join(', ')||'no care supplies';
 $('scene-initial-summary').textContent='Day '+(s.seconds/86400).toFixed(1)+' · '+complete+'/'+s.workers.jobs.length+' structures built · '+s.animals.manager.residents.length+' residents · '+Object.keys(s.animals.habitats).length+' paddocks. Depot: '+stocks+'. Existing gates, routes, carried loads and unfinished work are retained.';
 $('scene-use-result').disabled=busy||!run?.scenario;
}
async function simulateCurrent(){
 if(!initialConditions||busy)return;
 if(!initialConditions.state.neighborhood)setupVisits({families:$('neighbor-families').value,reserve:$('neighbor-reserve').value});
 $('scene-progress').value=0;const days=Number($('scene-run-days').value),deliveries=$('scene-deliveries').value==='scheduled';
 lifePlaying=false;lifeActors=[];setBusy(true);$('scene-life').hidden=true;status.textContent='Computing from the saved ranch conditions…';
 const previousRun=run;
 return new Promise((resolve,reject)=>{
 worker?.terminate();worker=new Worker('/simulation-worker.js?v=neighbor-mission1');
 worker.onmessage=async({data})=>{
  if(data.type==='progress'){status.textContent=data.message;$('scene-progress').value=data.progress;}
  if(data.type==='error'){status.textContent=data.message;worker.terminate();setBusy(false);updateInitialConditions();reject(Error(data.message));}
  if(data.type==='result'){
   run=data.run;$('scene-timeline-label').textContent='Review run';worker.terminate();envelope ||= farmEnvelope(run);$('scene-time').max=run.frames.length-1;
   await displayFrame(run.frames.length-1,!previousRun);$('scene-timeline').hidden=false;
   lifeSeconds=0;lifePlaying=false;$('scene-life').hidden=false;$('scene-life-toggle').textContent='Play run';
   $('scene-run-result').textContent=(run.paused?'Paused when animal care needed attention. ':'Run complete. ')+(run.elapsed/3600).toFixed(1)+' hours · '+run.summary.care+' care deliveries · '+run.summary.cleanups+' cleanups. '+(deliveries?'Scheduled supplies arrived at the depot.':'Only existing supplies were available.');
   status.textContent='Run ready. Replay it, compare another supply setting from the same start, or use its result as the next starting point.';
   setBusy(false);updateInitialConditions();paintLife();window.RanchView?.changed();resolve({summary:run.summary,neighborhood:run.neighborhood,giftBalances:run.giftBalances,renderReady:layout?.seconds===run.duration});
  }
 };
 worker.onerror=e=>{status.textContent='Simulation stopped: '+e.message;setBusy(false);updateInitialConditions();reject(Error(e.message));};
 worker.postMessage({type:'simulate-scene',initialConditions,days,deliveries});
 });
}
$('scene-simulate').onclick=()=>simulateCurrent().catch(e=>{status.textContent=e.message;});
$('scene-review-build').onclick=async()=>{if(!constructionRun||busy)return;stopFollowing();lifePlaying=false;$('scene-life').hidden=true;run=constructionRun;$('scene-timeline-label').textContent='Review growth';$('scene-time').max=run.frames.length-1;await displayFrame(0);updateInitialConditions();status.textContent='Reviewing construction. The daily-run starting snapshot is unchanged.';};
function adoptRun(){if(!run?.initialConditions||!run.scenario||busy)throw Error('No completed daily run to adopt');initialConditions=structuredClone(run.initialConditions);actionRevision++;updateInitialConditions();status.textContent='The end of this run is now the next starting point.';window.RanchView?.changed();return missionReport();}
$('scene-use-result').onclick=adoptRun;
$('scene-import').onclick=()=>$('scene-import-file').click();
$('scene-import-file').onchange=async e=>{
 try{const file=e.target.files[0];if(!file)return;if(file.size>100*1024*1024)throw Error('Choose a ranch artifact smaller than 100 MB.');const artifact=JSON.parse(await file.text()),snapshot=artifact.initialConditions;
 if(snapshot?.schema!=='ranch-scene-initial-conditions'||snapshot.version!==1||!snapshot.state?.workers?.jobs||!snapshot.state?.animals?.manager?.residents)throw Error('This artifact has no supported ranch starting conditions. Export a new ranch artifact first.');
 initialConditions=snapshot;constructionRun=null;run=null;lifePlaying=false;lifeActors=[];$('scene-life').hidden=true;if(artifact.settings){settings=artifact.settings;syncControls();}envelope=artifact.boundary||null;updateInitialConditions();status.textContent='Starting conditions loaded. Choose a duration and simulate this ranch.';
 }catch(error){status.textContent=error.message;}finally{e.target.value='';}
};

function missionReport(){return run?.scenario&&run.neighborhood?run.neighborhood:window.NeighborhoodMission.inspect(initialConditions?.state.neighborhood);}
function updateMission(){
 const report=missionReport();$('neighbor-start').disabled=busy||!initialConditions||!!initialConditions.state.neighborhood;
 $('neighbor-families').disabled=busy||!!initialConditions?.state.neighborhood;$('neighbor-reserve').disabled=busy||!!initialConditions?.state.neighborhood;
 $('neighbor-progress').textContent=!report?'No visits planned':`${run?.scenario&&run.neighborhood?'Run result · ':''}${report.delivered}/${report.total} families received gifts${report.active?' · '+report.active.phase+' · '+report.active.actorId:''}${report.blocked?' · '+report.blocked:''}${report.complete?' · Everyone visited; visitor home':''}`;
 const names={foal:'Foal',cow:'Cow',chicken:'Chickens',goat:'Goat',wheatSeedKg:'Wheat seed (kg)'};
 $('neighbor-items').textContent=report?Object.entries(report.bundle).map(([k,v])=>`${names[k]} ${Math.min(report.stock[k],v)}/${v}`).join(' · ')+(report.preparing?` · Preparing ${names[report.preparing.resource]} ${Math.floor(report.preparing.workDone/report.preparing.workRequired*100)}%`:''):'';
 const list=$('neighbor-families-status');list.replaceChildren();
 for(const f of report?.families||[]){const li=document.createElement('li');li.textContent=f.name+' · '+(f.status==='locked'?'Locked · prepare full gift bundle':f.status==='ready'?'Unlocked · ready to visit':f.status);list.append(li);}
}
function setupVisits({families,reserve='prepare'}){
 if(busy||!initialConditions)throw Error('Build or load a ranch first');
 if(initialConditions.state.neighborhood)throw Error('This ranch already has a neighborhood mission');
 if(reserve!=='prepare')throw Error('Unknown reserve scenario');
 const names=families.split(/\r?\n/).map(n=>n.trim()).filter(Boolean);
 if(new Set(names.map(n=>n.toLowerCase())).size!==names.length)throw Error('Each family must appear once');
 const recipients=names.map((name,i)=>({id:'neighbor-'+(i+1),name,travelSeconds:3600}));
 const stock=Object.fromEntries(Object.entries(window.NeighborhoodMission.bundle).map(([k,v])=>[k,reserve==='full'?v*names.length:0]));
 const mission=window.NeighborhoodMission.create(recipients,stock,{prepare:reserve==='prepare'});
 $('neighbor-families').value=names.join('\n');$('neighbor-reserve').value=reserve;
 const next=structuredClone(initialConditions);next.state.neighborhood=mission;initialConditions=next;
 // A previous comparison result must not override the newly configured starting point.
 if(run?.scenario)run={...run,neighborhood:null};
 actionRevision++;updateMission();window.RanchView?.changed();return window.NeighborhoodMission.inspect(mission);
}
$('neighbor-start').onclick=()=>{try{setupVisits({families:$('neighbor-families').value,reserve:$('neighbor-reserve').value});status.textContent='Visits planned. Simulate this ranch to begin.';}catch(e){status.textContent=e.message;}};
const noArgs={type:'object',properties:{},required:[]};
window.RanchActions?.register('simulator',{
 revision:()=>actionRevision,
 read:()=>({busy,seed:settings.seed,startingSeconds:initialConditions?.state.seconds,neighborhood:missionReport(),summary:run?.summary,paused:run?.paused,replay:replayReport()}),
 unavailable:action=>action==='inspect'?null:action.startsWith('replay')&&(!run?.activityLoop||!run.scenario)?'Complete a daily run first':busy?'Simulation is busy':!initialConditions?'Build or load a ranch first':null,
 actions:{
  inspect:{description:'Inspect ranch and per-family gift progress',schema:noArgs,readOnly:true,run:()=>({neighborhood:missionReport(),summary:run?.summary,replay:replayReport()})},
  planVisits:{description:'Plan a neighborhood quest with empty inventory; earn each bundle through work before visiting. One family per line',schema:{type:'object',properties:{families:{type:'string'},reserve:{type:'string',enum:['prepare']}},required:['families','reserve']},run:setupVisits},
  simulate:{description:'Simulate from current starting conditions; await completion, then adopt explicitly',schema:{type:'object',properties:{days:{type:'integer',enum:[1,3,7]},deliveries:{type:'boolean'}},required:['days','deliveries']},run:async a=>{$('scene-run-days').value=String(a.days);$('scene-deliveries').value=a.deliveries?'scheduled':'existing';return simulateCurrent();}},
  replayPlay:{description:'Play the completed recording; does not advance live simulation',schema:noArgs,run:()=>controlReplay({type:'play'})},
  replayPause:{description:'Pause completed-run replay',schema:noArgs,run:()=>controlReplay({type:'pause'})},
  replayStep:{description:'Step backward or forward one recorded minute; pauses replay',schema:{type:'object',properties:{seconds:{type:'integer',enum:[-60,60]}},required:['seconds']},run:a=>controlReplay({type:'step',...a})},
  replaySeek:{description:'Seek elapsed simulated seconds within completed recording; pauses replay',schema:{type:'object',properties:{seconds:{type:'number',minimum:0}},required:['seconds']},run:a=>controlReplay({type:'seek',...a})},
  replaySpeed:{description:'Set replay speed; normal compresses the recording into five minutes',schema:{type:'object',properties:{speed:{type:'number',enum:[.25,1,4]}},required:['speed']},run:a=>controlReplay({type:'speed',...a})},
  replayResident:{description:'Select a recorded resident by ID; empty ID selects the whole ranch',schema:{type:'object',properties:{id:{type:'string'}},required:['id']},run:a=>controlReplay({type:'resident',...a})},
  replayFollow:{description:'Follow selected resident with camera; waits while resident is off-site',schema:{type:'object',properties:{enabled:{type:'boolean'}},required:['enabled']},run:a=>controlReplay({type:'follow',...a})},
  replayEmojis:{description:'Show recorded activity emojis for all, selected, or no residents',schema:{type:'object',properties:{mode:{type:'string',enum:['all','selected','off']}},required:['mode']},run:a=>controlReplay({type:'emojis',...a})},
  adopt:{description:'Use completed daily run as next starting conditions',schema:noArgs,run:adoptRun}
 }
});
