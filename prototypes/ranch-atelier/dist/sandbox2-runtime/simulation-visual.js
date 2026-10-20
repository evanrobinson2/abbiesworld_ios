import {RanchRenderer} from './ranch-renderer.js';
import {calibratedScale} from './model-calibration.js';
import {paddockView,disposePaddockView} from './property-view.js';
import * as T from 'three';
import {OrbitControls} from '/vendor/OrbitControls.js';
import {initTheme, resolveColor} from '/theme-engine.js';
import {resolveBuildingAsset, resolveWorkerAsset, resolveAnimalAsset, speciesByHabitatFromFrame} from '/simulation-asset-resolver.js';
import {intentFor} from '/simulation-intent.js';

const $ = id => document.getElementById(id);
const host = document.createElement('div'); host.id = 'simulation-viewport';
host.hidden=true;
const bubbles = document.createElement('div'); bubbles.id = 'intent-bubbles';
const status = document.createElement('p'); status.id = 'visual-status'; status.setAttribute('role','status');
$('notice').after(status);
$('map').after(host); host.append(bubbles);
const settings = document.createElement('label'); settings.className = 'intent-setting';
settings.innerHTML = 'Intent bubbles <select id="intent-mode"><option value="all">Everyone</option><option value="transit">In transit</option><option value="selected">Selected person</option><option value="off">Off</option></select>';
$('notice').before(settings);
const scene = new T.Scene(); scene.background = new T.Color('#e2e7d4');
const renderer = new RanchRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); host.prepend(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Three-dimensional simulation. Drag to orbit; pinch or scroll to zoom. Select a person through People and animals.');
scene.add(new T.HemisphereLight('#fff7e9','#82966b',2.5));
const sun = new T.DirectionalLight('#fff3db',2.8); sun.position.set(-80,180,70); scene.add(sun);
const camera = new T.PerspectiveCamera(38,1,.1,3000);
const controls = new OrbitControls(camera,renderer.domElement); controls.maxPolarAngle = Math.PI*.47; controls.minDistance=8; controls.maxDistance=1500;
const objects = new Map(), templates = new Map(), labels = new Map(), failed = new Set();
let speciesRun=null,speciesMap={},paddockLayer=null,paddockStamp="";
let catalog = new Map(), ground, world, latest, landVersion=0, selected=null, focusedRun=null, signature='', pending=0;

function elevation(x,z) {
  const g=world.terrain.grid, a=Math.max(0,Math.min(g.cols-1.001,x/g.spacing)), b=Math.max(0,Math.min(g.rows-1.001,z/g.spacing));
  const i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j;
  return g.heights[j][i]*(1-u)*(1-v)+g.heights[j][i+1]*u*(1-v)+g.heights[j+1][i]*(1-u)*v+g.heights[j+1][i+1]*u*v;
}
function focus(x,z,span=65) {
  const center=new T.Vector3(x,elevation(x,z),z); controls.target.copy(center);
  camera.position.copy(center).add(new T.Vector3(.7,.85,1).normalize().multiplyScalar(span*Math.max(1,1/camera.aspect))); controls.update();render();
}
function focusRanch() {
  const points=latest?.frame.buildings.map(b=>b.workPosition)||[];for(const p of latest?.frame.paddocks||[])for(const f of p.fences)for(const [x,z]of f.points)points.push([x,0,z]);
  if(!points.length){const p=latest?.actors[0]?.position;return p?focus(p[0],p[2]):focus(world.bounds.width/2,world.bounds.depth/2,world.bounds.width*1.5);}
  const xs=points.map(p=>p[0]),zs=points.map(p=>p[2]);
  focus((Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2,Math.max(55,(Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))+25)*1.7));
}
function loadingStatus(){status.textContent=failed.size?`${failed.size} visual assets unavailable; their simulation continues.`:pending?'Loading character and building models…':'';}
async function template(id) {
  if(!templates.has(id)) templates.set(id,(async()=>{
    const record=catalog.get(id); if(!record)throw Error('Missing asset '+id);
    pending++;loadingStatus();
    try {
      const response=await fetch(record.json);if(!response.ok)throw Error('Asset unavailable');
      const group=new T.Group();
      for(const part of await response.json()){
        const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));
        if(part.normals?.length===part.positions.length)geometry.setAttribute('normal',new T.Float32BufferAttribute(part.normals,3));else geometry.computeVertexNormals();
        const material=new T.MeshStandardMaterial({color:new T.Color().setRGB(...resolveColor(part),T.SRGBColorSpace),roughness:.9});
        group.add(new T.Mesh(geometry,material));
      }
      return group;
    } finally {pending--;loadingStatus();}
  })().catch(e=>{failed.add(id);loadingStatus();console.error(e);throw e;}));
  return templates.get(id);
}
function place(key,id,position,dimensions,actor) {
  let entry=objects.get(key);
  if(!entry){entry={root:new T.Group(),id:null,height:2};objects.set(key,entry);scene.add(entry.root);}
  entry.root.position.set(...position);entry.actor=actor;
  if(entry.id!==id){
    entry.id=id;entry.root.clear();
    if(id)template(id).then(source=>{
      if(objects.get(key)!==entry||entry.id!==id)return;
      const model=source.clone(true), box=new T.Box3().setFromObject(model), size=box.getSize(new T.Vector3()), center=box.getCenter(new T.Vector3());
      // Assets are authored in metres; fit structures inside their recorded footprint.
      const scale=calibratedScale(id)??(dimensions?Math.min(dimensions.width/size.x,dimensions.depth/size.z):1);
      model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);model.scale.setScalar(scale);
      entry.height=size.y*scale;entry.root.add(model);render();
    }).catch(()=>{});
  }
  if(actor){
    if(entry.previous){const dx=position[0]-entry.previous[0],dz=position[2]-entry.previous[2];if(Math.hypot(dx,dz)>.015)entry.root.rotation.y=Math.atan2(dx,dz);}
    entry.previous=position;
  }
  return entry;
}
async function setLand(detail) {
  if(paddockLayer){scene.remove(paddockLayer);disposePaddockView(paddockLayer);paddockLayer=null;}paddockStamp='';
  world=detail.world;const version=++landVersion;focusedRun=null;latest=null;signature='';
  for(const e of objects.values())scene.remove(e.root);objects.clear();for(const l of labels.values())l.remove();labels.clear();
  if(ground){scene.remove(ground);ground.geometry.dispose();ground.material.map?.dispose();ground.material.dispose();}
  const g=world.terrain.grid, geometry=new T.PlaneGeometry(world.bounds.width,world.bounds.depth,g.cols-1,g.rows-1);geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i)+world.bounds.width/2,z=pos.getZ(i)+world.bounds.depth/2;pos.setXYZ(i,x,elevation(x,z)-.12,z);}
  geometry.computeVertexNormals();ground=new T.Mesh(geometry,new T.MeshBasicMaterial({color:'#dce1bd',toneMapped:false}));scene.add(ground);
  focus(world.bounds.width/2,world.bounds.depth/2,world.bounds.width*1.5);
  const svg=detail.svg.cloneNode(true);svg.lastElementChild?.remove();svg.setAttribute('width','1536');svg.setAttribute('height','1536');svg.setAttribute('viewBox',`0 ${-world.bounds.depth} ${world.bounds.width} ${world.bounds.depth}`);
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try{const img=new Image();img.src=url;await img.decode();if(version!==landVersion)return;const canvas=document.createElement('canvas');canvas.width=canvas.height=1536;canvas.getContext('2d').drawImage(img,0,0,1536,1536);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.flipY=false;ground.material.map=texture;ground.material.color.set('white');ground.material.needsUpdate=true;render();}finally{URL.revokeObjectURL(url);}
}
function update(detail) {
  const crossedResult=latest && (latest.time===latest.run.duration)!==(detail.time===detail.run.duration);
  latest=detail;selected=detail.selection;
  const seen=new Set();
  const stamp=JSON.stringify(detail.frame.paddocks||[]);if(stamp!==paddockStamp){paddockStamp=stamp;if(paddockLayer){scene.remove(paddockLayer);disposePaddockView(paddockLayer);}paddockLayer=paddockView(T,detail.frame.paddocks,p=>({x:p[0],z:p[1]}),elevation);scene.add(paddockLayer);}
  // Future resident records identify habitat species without changing the simulation.
  if(speciesRun!==detail.run){speciesRun=detail.run;speciesMap={};for(const f of detail.run.frames)Object.assign(speciesMap,speciesByHabitatFromFrame(f));}
  for(const b of detail.frame.buildings){if(!b.footprint)continue;const q=b.footprint,x=q.x+q.width/2,z=q.z+q.depth/2,key='building:'+b.id;seen.add(key);const entry=place(key,resolveBuildingAsset(b,{speciesByHabitat:speciesMap}),[x,Math.max(...(q.polygon||[[q.x,q.z],[q.x+q.width,q.z],[q.x,q.z+q.depth],[q.x+q.width,q.z+q.depth]]).map(p=>elevation(...p)))+.05,z],q);entry.root.rotation.y=-(q.angle||0);}
  // Keep co-located people visually separable; this small display offset does not alter routes.
  const occupied=new Map();
  for(const a of detail.actors){
    const intent=intentFor(a,detail.frame),unitButton=$('unit-list').querySelector(`[data-unit="${a.id}"]`);
    if(unitButton)unitButton.textContent=`${a.name} · ${intent.text}`;
    if(selected===a.id){$('selection').hidden=false;$('selection').textContent=`${a.name} · ${intent.text}`;}
    const key='actor:'+a.id;seen.add(key);const cell=a.position.map(n=>Math.round(n*2)).join(','),n=occupied.get(cell)||0;occupied.set(cell,n+1);
    const p=[...a.position];if(n){p[0]+=Math.cos(n*2.4)*1.1;p[2]+=Math.sin(n*2.4)*1.1;}p[1]=elevation(p[0],p[2]);
    let asset=a.kind==='worker'?resolveWorkerAsset({...a,carrying:{amount:a.cargo??a.carrying?.amount??0}}):resolveAnimalAsset(a);
    // Unrepresented activities still show the correct person's neutral pose.
    if(!asset&&a.kind==='worker'&&catalog.has(a.id+'-idle'))asset=a.id+'-idle';
    if(!asset&&a.kind==='animal'&&catalog.has(a.species+'-idle'))asset=a.species+'-idle';
    place(key,asset,p,null,a);
    if(a.kind==='worker'){
      let label=labels.get(a.id);if(!label){label=document.createElement('button');label.className='intent-bubble';label.dataset.actor=a.id;label.onclick=()=>window.SimulationPlayback.select(a.id);bubbles.append(label);labels.set(a.id,label);}
      const intent=intentFor(a,detail.frame);label.replaceChildren();const name=document.createElement('strong');name.textContent=a.name;const text=document.createElement('span');text.textContent=intent.text;label.append(name,text);label.dataset.transit=String(intent.transit);label.title=a.name+': '+intent.text;label.setAttribute('aria-label',label.title);
    }
  }
  for(const [key,entry] of objects)if(!seen.has(key)){scene.remove(entry.root);objects.delete(key);}
  for(const [id,label]of labels)if(!seen.has('actor:'+id)){label.remove();labels.delete(id);}
  if(focusedRun!==detail.run.id||crossedResult){focusedRun=detail.run.id;focusRanch();}
  const nextSignature=`${detail.run.id}:${selected}`;
  if(signature!==nextSignature&&selected){const a=detail.actors.find(a=>a.id===selected);if(a)focus(a.position[0],a.position[2],24);}signature=nextSignature;
  render();
}
function layoutBubbles(){
  if(!latest)return;const width=host.clientWidth,height=host.clientHeight,rects=[],mode=$('intent-mode').value;
  const ordered=[...labels].sort(([a,x],[b,y])=>(b===selected)-(a===selected)||Number(y.dataset.transit==='true')-Number(x.dataset.transit==='true')||a.localeCompare(b));
  for(const [id,label]of ordered){
    const entry=objects.get('actor:'+id),p=entry.root.position.clone();p.y+=entry.height+.4;p.project(camera);
    label.hidden=mode==='off'||(mode==='selected'&&id!==selected)||(mode==='transit'&&label.dataset.transit!=='true'&&id!==selected)||p.z>1||p.z< -1;
    if(label.hidden)continue;
    const x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height,w=label.offsetWidth,h=label.offsetHeight;
    if(x<0||x>width||y<0||y>height){label.hidden=true;continue;}
    const left=Math.max(5,Math.min(width-w-5,x-w/2));let top=y-h-12;
    for(let level=0;level<5;level++){
      if(!rects.some(r=>left<r.x+r.w+5&&left+w+5>r.x&&top<r.y+r.h+5&&top+h+5>r.y))break;
      top-=h+8;
    }
    if(top<8||rects.some(r=>left<r.x+r.w+5&&left+w+5>r.x&&top<r.y+r.h+5&&top+h+5>r.y)){label.hidden=true;continue;}
    label.style.setProperty('--leader',Math.max(0,y-top-h-4)+'px');label.style.left=left+'px';label.style.top=top+'px';label.style.setProperty('--tail',Math.max(8,Math.min(w-8,x-left))+'px');
    label.classList.toggle('selected',id===selected);rects.push({x:left,y:top,w,h});
  }
}
function render(){renderer.render(scene,camera);layoutBubbles();}
controls.addEventListener('change',render);$('intent-mode').onchange=render;
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const oldFit=Math.max(1,1/camera.aspect);camera.aspect=w/h;camera.position.sub(controls.target).multiplyScalar(Math.max(1,1/camera.aspect)/oldFit).add(controls.target);camera.updateProjectionMatrix();render();}).observe(host);
const ray=new T.Raycaster();let down;
renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const entries=[...objects.values()].filter(o=>o.actor);const hit=ray.intersectObjects(entries.map(o=>o.root),true)[0];if(hit){let obj=hit.object;while(obj.parent&&obj.parent!==scene)obj=obj.parent;const entry=entries.find(o=>o.root===obj);if(entry)window.SimulationPlayback.select(entry.actor.id);}});

try {
  await initTheme();const response=await fetch('/simulation-assets/catalog.json');if(!response.ok)throw Error('Asset catalog unavailable');catalog=new Map((await response.json()).map(r=>[r.id,r]));
  $('map').hidden=true;host.hidden=false;host.classList.add('ready');
  window.addEventListener('simulation-land',e=>setLand(e.detail));window.addEventListener('simulation-frame',e=>update(e.detail));
  $('fit').onclick=()=>focus(world.bounds.width/2,world.bounds.depth/2,world.bounds.width*1.5);$('ranch-view').onclick=focusRanch;
  $('zoom-in').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(.7).add(controls.target);controls.update();render();};
  $('zoom-out').onclick=()=>{camera.position.sub(controls.target).multiplyScalar(1.4).add(controls.target);controls.update();render();};
  const initial=window.SimulationPlayback.getState();if(initial.world)await setLand({world:initial.world,svg:$('map')});window.SimulationPlayback.redraw();
  window.RanchView?.register('simulationVisual',()=>({paddocks:latest?.frame.paddocks?.length,propertyVersion:latest?.run.world.property?.version,models:objects.size,loadedAssets:templates.size,failedAssets:[...failed],bubbles:[...labels.values()].filter(l=>!l.hidden).map(l=>l.title),camera:camera.position.toArray()}),render);
}catch(e){host.hidden=true;$('map').hidden=false;status.textContent='3D view unavailable. Showing the simulation map.';console.error(e);}
