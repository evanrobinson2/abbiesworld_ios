import {motionDefaults,captureMotion,createTileMotion} from './tile-motion.js';
import {landscapeSettings,terrainSampler,dressingPlan} from './tile-landscape.js';
import {RanchRenderer} from './ranch-renderer.js';
import * as T from 'three';
import {planAssembly,segmentDistance} from './tile-adapter.js';
import {installTileDrag} from './tile-drag.js';
import {OrbitControls} from '/vendor/OrbitControls.js';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {ranchMaterial,addLandscape} from './tile-materials.js';
import {calibratedScale,modelDimensions,CALIBRATION_KEY} from './model-calibration.js';
import {RADIUS_METRES,CELLS,cellCenter,initialBoard,moveTile,rotateTile,validateBoard,random} from './tile-board.js';
let actionRevision=0;
const $=id=>document.getElementById(id),host=$('scene-viewport'),S=.1,R=RADIUS_METRES*S,names={ranch:'Ranch',paddock:'Paddock',crop:'Crop',woodland:'Woodland',pond:'Pond',meadow:'Meadow'};
const scene=new T.Scene();scene.background=new T.Color('#e8edde');
const renderer=new RanchRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.append(renderer.domElement);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
const camera=new T.PerspectiveCamera(36,1,.1,500),orbit=new OrbitControls(camera,renderer.domElement);orbit.mouseButtons={LEFT:null,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};orbit.enableDamping=false;orbit.maxPolarAngle=Math.PI*.47;orbit.minDistance=8;orbit.maxDistance=140;
scene.add(new T.HemisphereLight('#fff6df','#728779',1.15));const sun=new T.DirectionalLight('#fff0d2',2.0);sun.position.set(-15,35,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:75});sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun);addLandscape(scene);
let heightAt=()=>0;
let board={...initialBoard(),id:crypto.randomUUID()},selected='ranch',busy=false,catalog=[],generation=0,assembly=null,committedBoard=null;const dimensions={};const groups=new Map(),templates=new Map(),cells=[],labels=[];
const motionSettings={...motionDefaults};
const tileMotion=createTileMotion({render,changed:()=>window.RanchView?.changed(),shadow:()=>{renderer.shadowMap.needsUpdate=true},settings:()=>motionSettings,reduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
const labelLayer=document.createElement('div');labelLayer.id='tile-labels';host.append(labelLayer);
function render(){renderer.render(scene,camera);for(let i=0;i<CELLS.length;i++){const c=cellCenter(i),v=new T.Vector3(c.x*S,heightAt(c.x,c.z+R*.7/S)*S+.25,c.z*S+R*.7).project(camera),label=labels[i];if(!label)continue;label.hidden=v.z<-1||v.z>1||Math.abs(v.x)>1||Math.abs(v.y)>1;label.style.left=(v.x+1)/2*host.clientWidth+'px';label.style.top=(1-v.y)/2*host.clientHeight+'px';}}
orbit.addEventListener('change',()=>{actionRevision++;render();window.RanchView?.changed()});
function fit(top=false){const low=top==='low';top=top===true;const angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect)),distance=R*2.45/Math.sin(angle);camera.position.copy(new T.Vector3(top?.01:1,top?1:low?.38:1.15,top?.01:1.35).normalize().multiplyScalar(distance));orbit.target.set(0,0,0);orbit.update();
 for(let attempt=0;attempt<12;attempt++){camera.updateMatrixWorld();let extent=0;for(let i=0;i<CELLS.length;i++){const c=cellCenter(i);for(let j=0;j<6;j++){const x=c.x+Math.sin(j*Math.PI/3)*RADIUS_METRES,z=c.z+Math.cos(j*Math.PI/3)*RADIUS_METRES,v=new T.Vector3(x*S,heightAt(x,z)*S,z*S).project(camera);extent=Math.max(extent,Math.abs(v.x),Math.abs(v.y));}}if(extent<.9)break;camera.position.multiplyScalar(1.08);orbit.update();}render()}
new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();fit()}).observe(host);
function mesh(geo,color,role='ground'){geo.setAttribute('paintPosition',geo.getAttribute('position').clone());const m=new T.Mesh(geo,ranchMaterial(color,role));m.receiveShadow=true;return m;}
function box(g,x,y,z,w,h,d,color){const m=mesh(new T.BoxGeometry(w,h,d),color);m.position.set(x,y,z);g.add(m);return m;}
function segment(g,a,b,width,color,y=.04){const dx=b[0]-a[0],dz=b[1]-a[1],m=box(g,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,.025,Math.hypot(dx,dz),color);m.rotation.y=Math.atan2(dx,dz);return m;}
function dispose(g){g.traverse(o=>{if(!o.userData.sharedGeometry)o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>{if(!m.userData.shared)m.dispose()});else if(o.material&&!o.material.userData.shared)o.material.dispose()});}
for(let i=0;i<CELLS.length;i++){const c=cellCenter(i),g=new T.Group();g.position.set(c.x*S,0,c.z*S);const shape=new T.Shape();for(let j=0;j<6;j++){const x=Math.sin(j*Math.PI/3)*R,z=Math.cos(j*Math.PI/3)*R;j?shape.lineTo(x,z):shape.moveTo(x,z)}shape.closePath();const m=mesh(new T.ShapeGeometry(shape),'#dfe5d5');m.rotation.x=-Math.PI/2;m.position.y=-.055;m.userData.cell=i;g.add(m);const pts=Array.from({length:7},(_,j)=>new T.Vector3(Math.sin(j*Math.PI/3)*R,-.04,Math.cos(j*Math.PI/3)*R));const outline=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#82977d'}));g.add(outline);scene.add(g);cells.push(m);const label=document.createElement('span');label.className='tile-cell-label';labelLayer.append(label);labels.push(label);}
async function template(id){if(!templates.has(id))templates.set(id,(async()=>{const r=catalog.find(r=>r.id===id);if(!r)throw Error('Missing model '+id);const response=await fetch(r.json);if(!response.ok)throw Error('Cannot load '+id);const group=new T.Group();for(const p of await response.json()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));if(p.normals?.length===p.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(p.normals,3));else geo.computeVertexNormals();const m=mesh(geo,new T.Color().setRGB(...p.color,T.SRGBColorSpace),p.role||'plain');m.castShadow=true;m.userData.sharedGeometry=true;group.add(m)}return group})().catch(e=>{templates.delete(id);throw e}));return templates.get(id)}
async function asset(g,id,x,z,widthMetres,rotation=0){const source=await template(id),model=source.clone(true);const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3()),factor=(calibratedScale(id)??1)*S;model.position.set(-center.x,-b.min.y,-center.z);const wrapper=new T.Group();wrapper.add(model);wrapper.scale.setScalar(factor);wrapper.position.set(x*S,.025,z*S);wrapper.rotation.y=rotation;wrapper.userData.asset=id;g.add(wrapper);}
function tileName(tile){return names[tile.type||tile.id];}

function batchTile(group){
 group.updateMatrixWorld(true);const buckets=new Map();
 group.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+o.castShadow;let b=buckets.get(key);if(!b){b={material:o.material,cast:o.castShadow,parts:[]};buckets.set(key,b)}let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.setAttribute('paintPosition',geo.getAttribute('position').clone());geo.applyMatrix4(o.matrixWorld);for(const name of Object.keys(geo.attributes))if(!['position','normal','paintPosition','color'].includes(name))geo.deleteAttribute(name);b.parts.push(geo);});
 const result=new T.Group();for(const b of buckets.values()){const geo=mergeGeometries(b.parts);b.parts.forEach(g=>g.dispose());const m=new T.Mesh(geo,b.material);m.castShadow=b.cast;m.receiveShadow=true;result.add(m)}dispose(group);return result;
}

async function content(tile,plan){
 const g=new T.Group(),type=tile.type||tile.id;
 const positions=[],colors=[],N=80,landColor=new T.Color(type==='crop'?'#a2ae76':type==='paddock'?'#9db680':'#b4bc91'),roadColor=new T.Color('#c8b88b');
 const point=(edge,u,v)=>{const a=edge*Math.PI/3,b=(edge+1)*Math.PI/3,x=(Math.sin(a)*u+Math.sin(b)*v)*R,z=(Math.cos(a)*u+Math.cos(b)*v)*R;return [x,heightAt(plan.center.x+x/S,plan.center.z+z/S)*S,z];};
 const triangle=(...points)=>{for(const point of points){positions.push(...point);const p={x:point[0]/S,z:point[2]/S};let edge=Infinity;for(const path of plan.paths)for(let i=1;i<path.points.length;i++)edge=Math.min(edge,segmentDistance(p,path.points[i-1],path.points[i])-path.width/2);const blend=1-Math.max(0,Math.min(1,(edge+.25)/.7)),color=landColor.clone().lerp(roadColor,blend);colors.push(color.r,color.g,color.b);}};
 for(let edge=0;edge<6;edge++)for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){triangle(point(edge,i/N,j/N),point(edge,(i+1)/N,j/N),point(edge,i/N,(j+1)/N));if(i+j<N-1)triangle(point(edge,(i+1)/N,j/N),point(edge,(i+1)/N,(j+1)/N),point(edge,i/N,(j+1)/N));}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const terrain=mesh(geo,'#ffffff');const terrainSource=terrain.material;terrain.material=terrainSource.clone();terrain.material.onBeforeCompile=terrainSource.onBeforeCompile;terrain.material.customProgramCacheKey=()=>terrainSource.customProgramCacheKey()+'-vertex-paths';terrain.material.userData={...terrain.material.userData,shared:false};terrain.material.vertexColors=true;g.add(terrain);
 const sides=[];for(let e=0;e<6;e++)for(let j=0;j<N;j++){const a=point(e,1-j/N,j/N),b=point(e,1-(j+1)/N,(j+1)/N),c=[a[0],-.22,a[2]],d=[b[0],-.22,b[2]];sides.push(...a,...c,...b,...b,...c,...d);}const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(sides,3));skirt.computeVertexNormals();g.add(mesh(skirt,'#8e9868'));
 const ground=(x,z)=>heightAt(plan.center.x+x,plan.center.z+z)*S;
 for(const o of plan.placements){
  if(o.model){await asset(g,o.model,o.x,o.z,dimensions[o.model].width,o.angle);g.children.at(-1).position.y+=ground(o.x,o.z);g.children.at(-1).userData.motionKey=o.id;continue;}
  const part=new T.Group();part.position.set(o.x*S,ground(o.x,o.z),o.z*S);part.rotation.y=o.angle;part.userData.motionKey=o.id;g.add(part);
  if(o.role==='enclosure'){
   const x=o.w*S/2,z=o.d*S/2,gap=.16;
   for(const [a,b]of [[[-x,-z],[x,-z]],[[-x,-z],[-x,z]],[[x,-z],[x,z]],[[-x,z],[-gap,z]],[[gap,z],[x,z]]]){
    const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.35);for(let i=0;i<=n;i++)box(part,a[0]+(b[0]-a[0])*i/n,.085,a[1]+(b[1]-a[1])*i/n,.035,.17,.035,'#ac8962');for(const y of [.065,.13])segment(part,a,b,.025,'#b9976e',y);
   }
   // An actual open gate lies on the access path, facing the shared yard.
   await asset(part,'water-trough-full',o.w/2-3,0,3);
   for(let i=0;i<2;i++)await asset(part,i?'cow-idle':'horse-idle',i?4:-4,-2,2.8,i*2);
  }else if(o.role==='field'){
   for(let row=0;row<4;row++){const z=-o.d*S*.35+row*o.d*S*.23;box(part,0,.025,z,o.w*S,.045,.17,'#816349');for(let j=0;j<6;j++)box(part,-o.w*S*.4+j*o.w*S*.16,.08,z,.055,.1,.07,row%2?'#68814e':'#789455');}
  }else if(o.role==='water'){
   const shore=mesh(new T.CylinderGeometry(o.w*S/2,o.w*S/2+.12,.06,40),'#b5ad83');shore.scale.z=o.d/o.w;shore.position.y=.03;part.add(shore);
   const water=mesh(new T.CylinderGeometry(o.w*S/2-.15,o.w*S/2-.15,.025,40),'#6dabb3');water.scale.z=o.d/o.w;water.position.y=.075;part.add(water);
  }
 }
 const dressing=dressingPlan(plan,landscapeSettings(board));plan.dressingCounts={};
 for(const d of dressing){plan.dressingCounts[d.kind]=(plan.dressingCounts[d.kind]||0)+1;const y=ground(d.x,d.z);
  if(d.kind==='tree'||d.kind==='prop'){await asset(g,d.model||'tree-standing',d.x,d.z,5,d.angle);const wrapper=g.children.at(-1);wrapper.position.y+=y;if(d.kind==='tree')wrapper.scale.multiplyScalar(d.size);continue;}
  const tuft=new T.Group();tuft.position.set(d.x*S,y,d.z*S);tuft.rotation.y=d.angle;g.add(tuft);
  if(d.kind==='shrub'||d.kind==='rock'){for(let k=0;k<3;k++){const m=mesh(new T.IcosahedronGeometry((d.kind==='rock'?.045:.09)*d.size,0),d.kind==='rock'?'#94917c':k%2?'#71824b':'#809153','foliage');m.position.set((k-1)*.055,.045+k*.015,0);m.scale.set(1,.8,1);m.castShadow=true;tuft.add(m);}}
  else for(let k=0;k<5;k++){const m=mesh(new T.ConeGeometry(.022,.10*d.size,3),k%2?'#849951':'#9ca65c','foliage');m.position.set(Math.sin(k*2.4)*.045,.04,Math.cos(k*2.4)*.045);m.rotation.z=(k-2)*.13;tuft.add(m);}
 }
 if(type==='ranch')for(const [i,id]of ['abbie-idle','ani-idle','daddy-idle'].entries()){const x=plan.hub.x-3+i*3,z=plan.hub.z+2;await asset(g,id,x,z,.6);g.children.at(-1).position.y+=ground(x,z);}
 // Keep a small set of semantic pieces; dense dressing remains sector-batched.
 const result=new T.Group(),sectors=Array.from({length:6},()=>new T.Group());
 for(const child of [...g.children]){
  if(child.userData.motionKey){g.remove(child);const pos=child.position.clone(),rot=child.rotation.clone(),scale=child.scale.clone(),key=child.userData.motionKey;child.position.set(0,0,0);child.rotation.set(0,0,0);child.scale.set(1,1,1);const piece=batchTile(child);piece.position.copy(pos);piece.rotation.copy(rot);piece.scale.copy(scale);piece.userData.motionKey=key;result.add(piece);}
  else if(child.isGroup){const sector=Math.floor((Math.atan2(child.position.z,child.position.x)+Math.PI)/(Math.PI/3))%6;sectors[sector].add(child);}
 }
 result.add(batchTile(g));sectors.forEach((sector,i)=>{if(sector.children.length){const piece=batchTile(sector);piece.userData.motionKey='dressing-'+i;result.add(piece);}});return result;
}
function sync(){actionRevision++;const settings=landscapeSettings(board);$('tile-relief').value=settings.height;$('tile-relief-value').textContent=settings.height+' m';$('tile-vegetation').value=settings.vegetation;$('tile-props').value=settings.props;renderer.shadowMap.needsUpdate=true;for(const t of board.tiles){const g=groups.get(t.id),c=cellCenter(t.cell);if(g){g.position.set(c.x*S,0,c.z*S);g.rotation.y=0;}}
for(let i=0;i<7;i++){const t=board.tiles.find(t=>t.cell===i);labels[i].textContent=t?tileName(t):(i?'Ring '+i:'Center');labels[i].style.borderColor=t?.id===selected?'#2f593d':'#bac5b1';cells[i].material.color.set(t?.id===selected?'#b5c8a6':'#dfe5d5');}
const tile=board.tiles.find(t=>t.id===selected);$('tile-cell').value=tile.cell;$('tile-title').textContent=tileName(tile);$('tile-type').value=tile.type||tile.id;$('tile-info').textContent=`Rotation ${tile.rotation*60}° · Seed ${tile.seed}`;document.querySelectorAll('[data-tile]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.tile===selected));b.textContent=tileName(board.tiles.find(t=>t.id===b.dataset.tile))});render();window.RanchView?.changed();}
function setBusy(v){busy=v;for(const id of ['tile-redraw','tile-load','tile-save','tile-export','tile-type','tile-cell','tile-rotate','tile-relief','tile-vegetation','tile-props','tile-dress','motion-replay','motion-duration','motion-hold','motion-stagger','motion-strength'])$(id).disabled=v;}
async function rebuild(message='Assembly adapted.'){
 if(busy)return false;dragControls.cancel();tileMotion.settle();const before=captureMotion(groups);setBusy(true);const nextGroups=new Map();$('tile-status').textContent='Adapting layouts and shared paths…';
 try{
  const next=planAssembly(board,{dimensions});heightAt=terrainSampler(board,next);
  for(const tile of board.tiles)nextGroups.set(tile.id,await content(tile,next.plans.find(p=>p.id===tile.id)));
  for(const [id,old]of groups){scene.remove(old);dispose(old);}groups.clear();for(const [id,g]of nextGroups){groups.set(id,g);scene.add(g);}
  assembly=next;committedBoard=structuredClone(board);sync();await tileMotion.play(groups,before);$('tile-status').textContent=message;return true;
 }catch(e){for(const g of nextGroups.values())dispose(g);if(committedBoard)board=structuredClone(committedBoard);if(assembly)heightAt=terrainSampler(board,assembly);sync();$('tile-status').textContent='Could not adapt: '+e.message;return false;}finally{setBusy(false);window.RanchView?.changed();if(calibrationPending)queueMicrotask(refreshCalibration);}
}
async function redraw(id,seed=crypto.getRandomValues(new Uint32Array(1))[0]||1){if(busy)throw Error('Board is busy');board.tiles.find(t=>t.id===id).seed=seed;return rebuild('New variation; connected layouts adapted.');}
function place(id,cell){if(busy)return;if(id)selected=id;moveTile(board,selected,cell);return rebuild('Tile placed. Connections and layouts adapted.');}
for(const b of document.querySelectorAll('[data-tile]'))b.onclick=()=>{selected=b.dataset.tile;sync()};
$('tile-cell').onchange=e=>place(selected,Number(e.target.value));$('tile-rotate').onclick=()=>rotate(selected);$('tile-redraw').onclick=()=>redraw(selected);
const dragControls=installTileDrag({renderer,camera,scene,orbit,cells,groups,radius:R,isBusy:()=>busy,getBoard:()=>board,
 select:id=>{selected=id;sync()},place,render,changed:()=>window.RanchView?.changed(),status:text=>$('tile-status').textContent=text});
$('tile-type').onchange=e=>changeType(selected,e.target.value);
$('tile-fit').onclick=()=>fit();$('tile-top').onclick=()=>fit(true);$('tile-low').onclick=()=>fit('low');
$('tile-save').onclick=()=>{try{saveBoard()}catch(e){$('tile-status').textContent='Could not save: '+e.message}};
$('tile-load').onclick=()=>loadBoard().catch(e=>$('tile-status').textContent=e.message);
$('tile-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(board,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ranch-three-tile-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.RanchView?.register('tileEditor',()=>({board,selected,busy,assembly,modelDimensions:dimensions,normalization:'shared-family-metres-v2',drag:dragControls.state(),motion:tileMotion.state(),sceneTypes:names,cellCount:7,scale:S,shading:'dorf-pigment-overlay-foliage-ink-v1',background:'misty-meadow',renderStats:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,programs:renderer.info.programs.length},camera:camera.position.toArray(),target:orbit.target.toArray()}),render);

async function refreshDimensions(){for(const id of ['shelter-complete','family-home-complete','feed-store-complete']){const model=await template(id),size=new T.Box3().setFromObject(model).getSize(new T.Vector3());dimensions[id]=modelDimensions(id,size);}}
let calibrationPending=false;
async function refreshCalibration(){if(!catalog.length)return;calibrationPending=true;if(busy)return;calibrationPending=false;await refreshDimensions();await rebuild('Model sizes updated from shared calibrations.');}
window.addEventListener('ranch-model-calibration',refreshCalibration);
window.addEventListener('storage',e=>{if(e.key===CALIBRATION_KEY||e.key===null)refreshCalibration()});

(async()=>{const r=await fetch('/simulation-assets/catalog.json');if(!r.ok)throw Error('Asset library unavailable');catalog=await r.json();await refreshDimensions();await rebuild();sync();fit();$('tile-status').textContent='';if(innerWidth<800)window.RanchDrawers?.close()})().catch(e=>$('tile-status').textContent=e.message);


for(const [id,key] of [['tile-relief','height'],['tile-vegetation','vegetation'],['tile-props','props']])$(id).onchange=()=>{if(busy)return;changeLandscape({[key]:Number($(id).value)});};
$('tile-relief').oninput=()=>{$('tile-relief-value').textContent=$('tile-relief').value+' m';};
$('tile-dress').onclick=()=>{if(busy)return;changeLandscape({seed:crypto.getRandomValues(new Uint32Array(1))[0]||1});};

function setMotion(values){const limits={duration:[300,3000],hold:[0,600],stagger:[0,600],strength:[0,2]};for(const [key,value]of Object.entries(values)){if(!limits[key]||!Number.isFinite(value)||value<limits[key][0]||value>limits[key][1])throw Error('Invalid motion setting: '+key);}for(const [key,value]of Object.entries(values)){motionSettings[key]=value;$('motion-'+key).value=value;}actionRevision++;window.RanchView?.changed();return tileMotion.state();}
async function replayMotion(){if(busy)throw Error('Board is busy');setBusy(true);try{await tileMotion.replay();actionRevision++;return tileMotion.state();}finally{setBusy(false);}}
for(const key of ['duration','hold','stagger','strength'])$('motion-'+key).onchange=e=>setMotion({[key]:Number(e.target.value)});
$('motion-replay').onclick=replayMotion;
window.addEventListener('keydown',e=>{if(e.key==='Escape')tileMotion.settle()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)tileMotion.settle()});
// UI and MCP share these operations; the registry never synthesizes UI events.
function rotate(id){if(busy)return false;rotateTile(board,id);return rebuild('Layout preference changed; connections preserved.');}
function changeType(id,type){if(busy)return false;board.tiles.find(t=>t.id===id).type=type;return rebuild('Scene changed. Neighboring layouts adapted.');}
function changeLandscape(settings){if(busy)return false;board.landscape={...landscapeSettings(board),...settings};return rebuild('Landscape updated.');}
function saveBoard(){localStorage.setItem('ranch-tile-board-v1',JSON.stringify(board));$('tile-status').textContent='Layout saved on this browser.';return {storageScope:'this browser',storageKey:'ranch-tile-board-v1',board:structuredClone(board)};}
async function loadBoard(){if(busy)throw Error('Board is busy');const saved=JSON.parse(localStorage.getItem('ranch-tile-board-v1'));if(!validateBoard(saved))throw Error('No valid saved layout on this browser.');board={...saved,id:saved.id||crypto.randomUUID()};if(!await rebuild('Saved layout restored and connections recomputed.'))throw Error($('tile-status').textContent);return {storageScope:'this browser'};}
const actionObject=(properties={},required=[])=>({type:'object',properties,required});
const tileId={type:'string',enum:['ranch','paddock','crop']},seedArg={type:'integer',minimum:1,maximum:4294967295};
const actionState=()=>({storageScope:'this browser and origin',boardId:board.id,boardRevision:actionRevision,board:structuredClone(board),selected,busy,motion:tileMotion.state(),warnings:assembly?.warnings||[],camera:camera.position.toArray(),target:orbit.target.toArray()});
async function committed(operation){if(await operation===false)throw Error($('tile-status').textContent||'Board operation failed');return {warnings:assembly?.warnings||[],seeds:board.tiles.map(t=>({id:t.id,seed:t.seed}))};}
window.RanchActions?.register('tiles',{
 revision:()=>actionRevision,
 read:actionState,
 unavailable:()=>!assembly?'Board is loading':busy?'Board is busy':null,
 actions:{
  motion:{description:'Tune spring transition timing in milliseconds and strength',schema:actionObject({duration:{type:'number',minimum:300,maximum:3000},hold:{type:'number',minimum:0,maximum:600},stagger:{type:'number',minimum:0,maximum:600},strength:{type:'number',minimum:0,maximum:2}}),run:setMotion},
  replayMotion:{description:'Replay the last transition without changing the board',schema:actionObject(),run:replayMotion},
  inspect:{description:'Inspect board, selection, seeds and connection warnings',readOnly:true,schema:actionObject(),run:actionState},
  select:{description:'Select an existing tile',schema:actionObject({id:tileId},['id']),run:({id})=>{selected=id;sync();return {selected};}},
  move:{description:'Move a tile to a cell; swap with its occupant',schema:actionObject({id:tileId,cell:{type:'integer',minimum:0,maximum:6}},['id','cell']),run:({id,cell})=>committed(place(id,cell))},
  rotate:{description:'Rotate a tile by sixty degrees',schema:actionObject({id:tileId},['id']),run:({id})=>committed(rotate(id))},
  redraw:{description:'Regenerate a tile with an explicit seed or a fresh variation',schema:actionObject({id:tileId,seed:seedArg},['id']),run:({id,seed})=>committed(redraw(id,seed))},
  setType:{description:'Change the content type of an existing tile',schema:actionObject({id:tileId,type:{type:'string',enum:Object.keys(names)}},['id','type']),run:({id,type})=>committed(changeType(id,type))},
  landscape:{description:'Set supported landscape parameters',schema:actionObject({height:{type:'integer',minimum:0,maximum:30},vegetation:{type:'integer',minimum:0,maximum:3},props:{type:'integer',minimum:0,maximum:1},seed:seedArg}),run:settings=>committed(changeLandscape(settings))},
  view:{description:'Fit the board, view from above, or inspect hills',schema:actionObject({preset:{type:'string',enum:['fit','top','low']}},['preset']),run:({preset})=>{fit(preset==='top'?true:preset==='low'?'low':false);return {preset};}},
  save:{description:'Save the current board in this browser',schema:actionObject(),run:saveBoard},
  load:{description:'Restore the board saved in this browser',schema:actionObject(),run:loadBoard},
  export:{description:'Return the current board as a structured artifact',readOnly:true,schema:actionObject(),run:()=>({kind:'ranch-tile-board',artifact:structuredClone(board)})}
 }
});
