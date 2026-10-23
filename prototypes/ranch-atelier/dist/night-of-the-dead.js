import './app-appearance.js';
import {stepElastic} from './board3-elastic.mjs';
import {createHorizon} from './board-horizon.mjs';
import {collectInertia} from './inertia-layers.mjs';
import {facetRequests,grownCells,createLoadoutStore} from '/sandbox2-runtime/workbench-model.mjs';
import {sceneEditor,pullPose} from '/sandbox2-runtime/scene-editor-contract.mjs';
import {REGION_PRESETS,regionEdit} from '/sandbox2-runtime/region-presets.mjs';
import {townSurface,townLayout,TOWN_LAYOUTS} from '/sandbox2-runtime/town-life/layouts.mjs';
import {spatialReadout,spatialState} from '/sandbox2-runtime/microcosm.mjs';
import {attachSceneLife,animateSceneLife} from '/sandbox2-runtime/microcosm-view.mjs';
import {pullSample,dashboardData} from '/sandbox2-runtime/sandbox-model.mjs';
import {body as glassBody,advance as advanceGlass} from '/sandbox2-runtime/sandbox-inertia.mjs';
import {attachTown,animateTown} from '/sandbox2-runtime/town-life/tile-view.mjs';
import {townState,stepTownInstance,townForPreset} from '/sandbox2-runtime/town-life/tile-state.mjs';
import {advanceHour,toggleBusiness,routine} from '/sandbox2-runtime/town-life/economy.mjs';
import {addIncident} from '/sandbox2-runtime/town-life/civics.mjs';
import {sandboxWheel,cameraOwnsPointer} from '/sandbox2-runtime/sandbox-camera.mjs';
import {resolveDrop} from '/sandbox2-runtime/board-state.js';
import {TILE_METRICS,TILE_RADIUS_METRES,RENDER_UNITS_PER_METRE} from '/sandbox2-runtime/tile-metrics.js';
import {GARDEN_V2,gardenCardRecipe,applyGardenAssembly} from '/sandbox2-runtime/garden-adapter.js';
import {TILE_CONTROLS} from '/sandbox2-runtime/tile-control-design.js';
import {SEASIDE_SCENES,seasideRecipe,describeSeaside,seasideSurface} from '/sandbox2-runtime/seaside-scenes.js';
import {DISTRICT_SCENES,districtRecipe,describeDistrict} from '/sandbox2-runtime/district-scenes.js';
import {planSettlementPreset} from '/sandbox2-runtime/settlement-layout.js';
import {SETTLEMENT_PRESETS,settlementPreset} from '/sandbox2-runtime/settlement-presets.js';
import {HERO_SCENES,castleRecipe,describeCastle} from '/sandbox2-runtime/castle-scenes.js';
import {planComposition} from '/sandbox2-runtime/board-composition.js';
import {resolveBoardEconomy,evolveBoardEconomy} from '/sandbox2-runtime/board-economy.js';
import {DOMESTIC_SCENES,domesticRecipe,domesticRequirements,completeDomesticPaths,describeDomestic} from '/sandbox2-runtime/domestic-scenes.js';
import {editComposition as editBoard,compositionHistory as createHistory,replaceComposition} from '/sandbox2-runtime/board-state.js';
import {SCENE_TYPES,sceneTypeForCard,requirePlaceableCard} from '/sandbox2-runtime/scene-registry.js';
import * as T from 'three';
import {OrbitControls} from '/sandbox2-runtime/vendor/OrbitControls.js';
import {RanchRenderer} from '/sandbox2-runtime/ranch-renderer.js';
import {createRanchComposer} from '/sandbox2-runtime/ranch-composer.js';
import {planAssembly} from '/sandbox2-runtime/tile-adapter.js';
import {CELLS,cellCenter,random} from '/sandbox2-runtime/tile-board.js';
import {emptyBoard,cardKey,cellWorld,instanceCells} from '/sandbox2-runtime/playground-model.js';
import {legacyBoardHeight} from '/sandbox2-runtime/board-legacy-terrain.js';
import {BOARD_CELLS as FULL_BOARD_CELLS,validateFootprints,boardTiles,boardHeight,rawTerrain} from '/sandbox2-runtime/board-terrain.js';
import {createCard,saveCard,saveCards,listCards,listCardSummaries,getCard,saveBoard,loadBoard,getStorageDiagnostics,inspectStorageEnvelopes} from '/sandbox2-runtime/card-library.js';
import {runStorageProbe} from '/sandbox2-runtime/storage-probe.js';
import {inspectStorageEnvironment} from '/sandbox2-runtime/storage-environment.js';
import {dragMaterial} from '/sandbox2-runtime/tile-drag.js';
import {captureMotion,createTileMotion,motionDefaults} from '/sandbox2-runtime/tile-motion.js';
const SCENE_DEFINITIONS={...DOMESTIC_SCENES,garden:GARDEN_V2,...HERO_SCENES,...DISTRICT_SCENES,...SEASIDE_SCENES};
const terrainEditor=['/procedural','/procedural.html','/terrain-editor'].includes(location.pathname);if(terrainEditor){document.body.classList.add('terrain-editor');document.title='Terrain Editor · Ranch Atelier';document.querySelector('.brand strong').textContent='Terrain Editor';}
let expanded=location.pathname.startsWith('/tile-generator')||location.pathname.startsWith('/sandbox/');let sceneType=expanded?(location.pathname.split('/')[2]||'ranch'):'ranch';if(!SCENE_TYPES[sceneType])sceneType='ranch';if(expanded)document.body.classList.add('expanded-scene');
const $=id=>document.getElementById(id),S=RENDER_UNITS_PER_METRE,R=TILE_RADIUS_METRES,STORE='ranch-night-of-the-dead-v1';
let board=emptyBoard(crypto.randomUUID());board.region={name:"Night of the Dead",boardWidth:8,shape:"lower-half-hex",cliffHeightMetres:18};try{const old=await loadBoard();if(old){validateFootprints(old);board=old;}}catch{}
const START_CELLS=new Set(['-2,1','-1,1','-3,2','-2,2','-1,2','-3,3','-2,3','-1,3']);
const compactBoard=false;const BOARD_CELLS=compactBoard?FULL_BOARD_CELLS.filter(c=>c.row>=4&&c.row<=6&&c.col>=4&&c.col<=6):FULL_BOARD_CELLS;if(compactBoard)board.region={...board.region,boardWidth:3};
const history=createHistory(board),scene=new T.Scene();scene.background=new T.Color('#101419');scene.fog=new T.Fog('#101419',400,1200);
const host=$('board-viewport'),renderer=new RanchRenderer({antialias:false,preserveDrawingBuffer:true,animateNPCs:false,contourSamples:0});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;host.append(renderer.domElement);
const camera=new T.PerspectiveCamera(38,1,.1,1600),orbit=new OrbitControls(camera,renderer.domElement);orbit.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};orbit.enableDamping=false;orbit.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};orbit.maxPolarAngle=Math.PI*.47;orbit.minDistance=1.2;orbit.maxDistance=800;
scene.add(new T.HemisphereLight('#b6cfdd','#242c27',1.9));const sun=new T.DirectionalLight('#dbe8ff',2.2);sun.position.set(-45,90,50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:220});sun.shadow.normalBias=.03;scene.add(sun);
let settlementChoice=SETTLEMENT_PRESETS[board.settlement?.preset]?board.settlement.preset:'hamlet';
let actionRevision=0,assetIndex={},villageRunning=false,villageTimer=null;
let forestTemplate=null,dragPreview=null,dragOrigin=[],dragFrame=0;
let ground=new T.Group(),pieces=new Map(),preview=new T.Group(),ghost=new T.Group(),assembly={plans:[],links:[],warnings:[]},heightAt=(x,z)=>rawTerrain(x,z),composer,busy=true,mode='create',preset=sceneType==='ranch'?'homestead':Object.keys(SCENE_DEFINITIONS[sceneType].presets)[0],seed=41,draft=null,deck=[],activeCard=null,selected=null,rotation=0,target=null,drag=null;
scene.add(ground,preview,ghost);
renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();event.stopImmediatePropagation();sandboxWheel(T,camera,orbit,event);},{capture:true,passive:false});
const renderTimes=[];let quality='balanced',renderCPU=0;
try{quality=localStorage.getItem('ranch-render-quality')||quality;}catch{}
if(!['eco','balanced','high'].includes(quality))quality='balanced';
function applyQuality(){const cap={eco:1,balanced:1.5,high:2}[quality],budget={eco:2500000,balanced:4500000,high:8000000}[quality];renderer.setPixelRatio(Math.min(devicePixelRatio,cap,Math.sqrt(budget/Math.max(1,host.clientWidth*host.clientHeight))));renderer.setSize(host.clientWidth,host.clientHeight,false);}
function performanceSnapshot(){const now=performance.now(),recent=renderTimes.filter(t=>now-t<2000),fps=recent.length>1?(recent.length-1)*1000/(recent.at(-1)-recent[0]):0;return {quality,fps:now-(recent.at(-1)||0)>500?0:Math.round(fps),frameMs:fps?Math.round(10000/fps)/10:null,cpuSubmitMs:Math.round(renderCPU*10)/10,pixelRatio:renderer.getPixelRatio(),width:canvas.width,height:canvas.height,drawCalls:renderer.ranchStats?.calls||0,triangles:renderer.ranchStats?.triangles||0,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,visible:!document.hidden};}
window.RanchPerformance={read:performanceSnapshot,setQuality(value){if(!['eco','balanced','high'].includes(value))throw Error('Unknown quality');quality=value;try{localStorage.setItem('ranch-render-quality',value);}catch{}applyQuality();render();window.RanchView?.changed();}};
window.RanchView?.register('performance',performanceSnapshot);
function render(){const began=performance.now();renderer.render(scene,camera);renderCPU=performance.now()-began;renderTimes.push(began);while(renderTimes.length>240||renderTimes[0]<began-2000)renderTimes.shift();renderer.domElement.dataset.renderTriangles=renderer.ranchStats?.triangles||0;renderer.domElement.dataset.renderCalls=renderer.ranchStats?.calls||0;}
const motion=createTileMotion({render,changed:()=>window.RanchView?.changed(),shadow:()=>renderer.shadowMap.needsUpdate=true,settings:()=>motionDefaults,reduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches});
orbit.addEventListener('change',()=>{render();window.RanchView?.changed();});
let boardViewMemory=null,closePull=null,closeSpring=0;
let workbenchReady=false;
const sceneLoadouts=createLoadoutStore();let loadedTrayDrag=null;
let customSettings={vegetation:2,props:1,generatedGrowth:true};
let closeFraming=false,detailFraming=false;
function fit(close=false,details=false){closeFraming=close;detailFraming=details;const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;
 const drawer=$('create-drawer'),deckDrawer=$('deck-drawer');let left=document.getElementById('scene-workbench')&&!document.getElementById('scene-workbench').hidden?(width>700?266:158):24,top=58,right=width-24,bottom=height-50;
 if(!document.body.classList.contains('horizontal-workbench')&&!drawer.hidden&&width>600)right=Math.min(right,drawer.getBoundingClientRect().left-22);
 if(!deckDrawer.hidden&&width>600)right=Math.min(right,deckDrawer.getBoundingClientRect().left-22);
 const nav=document.getElementById('left-navigation');if(width>=800&&nav&&!document.body.classList.contains('nav-collapsed'))left=Math.max(left,nav.getBoundingClientRect().right+20);
 if(expanded){top=120;bottom=height-35;if(width<800&&!drawer.hidden)bottom=Math.min(bottom,drawer.getBoundingClientRect().top-12);}
 if(document.body.classList.contains('board3')){left=20;right=width-20;top=95;bottom=height-155;if(!$('create-drawer').hidden&&width>700)right=$('create-drawer').getBoundingClientRect().left-22;if($('scene-workbench')?.hidden)bottom=height-45;}
 const usableW=Math.max(150,right-left),usableH=Math.max(150,bottom-top),cx=(left+right)/2,cy=(top+bottom)/2;
 const points=[],box=new T.Box3(),add=p=>{points.push(p);box.expandByPoint(p);},addBox=b=>{if(b.isEmpty())return;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])add(new T.Vector3(x,y,z));};
 if(close&&details){const items=mode==='create'?[preview]:[...pieces.values()].filter(g=>!selected||g.userData.instanceId===selected);for(const g of items)g.traverse(o=>{if(o.userData.motionKey&&!o.userData.motionKey.startsWith('dressing-'))addBox(new T.Box3().setFromObject(o));});}
 if(false&&expanded&&details&&points.length){const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());const half=Math.max(.8,Math.min(1.8,size.x*.12));points.length=0;box.makeEmpty();addBox(new T.Box3(new T.Vector3(center.x-half,Math.max(0,center.y-size.y*.5),center.z-half),new T.Vector3(center.x+half,Math.min(3,center.y+size.y*.5),center.z+half)));}
 if(close&&!details&&mode==='create'&&draft){const bounds=new T.Box3().setFromObject(preview);for(const p of draft.resolvedPlan.plans)for(let e=0;e<6;e++){const x=(p.center.x+Math.sin(e*Math.PI/3)*R)*S,z=(p.center.z+Math.cos(e*Math.PI/3)*R)*S;add(new T.Vector3(x,bounds.min.y,z));add(new T.Vector3(x,bounds.max.y,z));}}
 if(close&&!details&&mode!=='create')for(const g of pieces.values())if(!selected||g.userData.instanceId===selected)addBox(new T.Box3().setFromObject(g));
 if(!points.length)for(const cell of (b3Whole||board.instances.length?BOARD_CELLS:BOARD_CELLS.filter(c=>Math.abs(c.q)<=2&&Math.abs(c.r)<=2))){const c=cellWorld(cell);for(let e=0;e<7;e++){const x=c.x+(e<6?Math.sin(e*Math.PI/3)*R:0),z=c.z+(e<6?Math.cos(e*Math.PI/3)*R:0);add(new T.Vector3(x*S,heightAt(x,z)*S,z*S));add(new T.Vector3(x*S,(heightAt(x,z)+2)*S,z*S));}}
 const center=box.getCenter(new T.Vector3()),back=new T.Vector3(...(innerWidth<650?[1.5,3,.1]:[.65,.78,1.2])).normalize(),rightAxis=new T.Vector3().crossVectors(camera.up,back).normalize(),upAxis=new T.Vector3().crossVectors(back,rightAxis),tanY=Math.tan(camera.fov*Math.PI/360),tanX=tanY*camera.aspect;
 const projected=points.map(p=>p.clone().sub(center)),rx=projected.map(p=>p.dot(rightAxis)),uy=projected.map(p=>p.dot(upAxis));center.addScaledVector(rightAxis,(Math.min(...rx)+Math.max(...rx))/2).addScaledVector(upAxis,(Math.min(...uy)+Math.max(...uy))/2);
 let distance=details?1.2:6;for(const p of points){const v=p.clone().sub(center);distance=Math.max(distance,v.dot(back)+Math.abs(v.dot(rightAxis))/(tanX*usableW/width),v.dot(back)+Math.abs(v.dot(upAxis))/(tanY*usableH/height));}
 camera.setViewOffset(width,height,width/2-cx,height/2-cy,width,height);orbit.target.copy(center);camera.position.copy(center).addScaledVector(back,distance*1.055);orbit.update();render();
}
new ResizeObserver(()=>{applyQuality();camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render();}).observe(host);
function status(text){$('board-status').textContent=text;if($('b3-feedback'))$('b3-feedback').textContent=text;window.RanchView?.changed();}
function setBusy(value){busy=value;document.querySelectorAll('#scene-configurator button,#scene-configurator input,#scene-configurator select,#edit-closeup,#editor-return,#editor-place').forEach(el=>el.disabled=value);document.querySelectorAll('#region-presets button,#region-save,#scene-browser-open,#scene-results button').forEach(el=>el.disabled=value);document.querySelectorAll('#microcosm-panel button,#microcosm-panel select').forEach(el=>el.disabled=value);document.querySelectorAll('#terrain-panel button,#terrain-panel input').forEach(el=>el.disabled=value);$('scene-family').disabled=value;$('previous-biome').disabled=value;$('next-biome').disabled=value;for(const id of ['variation','save-card','rotate','remove','undo','redo','village-step','village-supplies','village-starter'])$(id).disabled=value;$('save-card').disabled=value||!draft;document.querySelectorAll('[data-preset],[data-settlement]').forEach(b=>b.disabled=value);syncInstanceControls();for(const id of ['draft-thumbnail','place-draft','save-preset','apply-settings','scene-greenery','draft-props','draft-seed','turn-draft'])$(id).disabled=value||!draft;}
function dispose(g){g.traverse(o=>{if(!o.userData.sharedGeometry)o.geometry?.dispose();if(o.material&&!o.material.userData?.shared){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}
function buildGround(nextBoard,sample){const ground=new T.Group();const N=14,landPositions=[],landColors=[],wallPositions=[],gridPositions=[];
 for(const cell of BOARD_CELLS){const c=cellWorld(cell),positions=[],colors=[],base=new T.Color('#323e39'),low=new T.Color('#303a35'),high=new T.Color('#434a40');
 const pt=(e,u,v)=>{const a=e*Math.PI/3,b=(e+1)*Math.PI/3,x=c.x+R*(Math.sin(a)*u+Math.sin(b)*v),z=c.z+R*(Math.cos(a)*u+Math.cos(b)*v);return [x,sample(x,z),z];};
 const tri=(...ps)=>{for(const p of ps){positions.push(...p.map(v=>v*S));const steep=Math.max(Math.abs(sample(p[0]+.3,p[2])-sample(p[0]-.3,p[2])),Math.abs(sample(p[0],p[2]+.3)-sample(p[0],p[2]-.3)))>1;const color=steep?new T.Color('#9b8d79'):base.clone().lerp(p[1]>10?high:low,.35);colors.push(color.r,color.g,color.b);}};
 for(let e=0;e<6;e++)for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){tri(pt(e,i/N,j/N),pt(e,(i+1)/N,j/N),pt(e,i/N,(j+1)/N));if(i+j<N-1)tri(pt(e,(i+1)/N,j/N),pt(e,(i+1)/N,(j+1)/N),pt(e,i/N,(j+1)/N));}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const mesh=new T.Mesh(geo,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));mesh.userData.cell=cell;mesh.material.visible=false;mesh.material.depthWrite=false;if(!nextBoard.instances.some(i=>instanceCells(i,nextBoard.cards[cardKey(i.cardId,i.cardRevision)]).some(o=>o.q===cell.q&&o.r===cell.r))){if(START_CELLS.has(cell.q+','+cell.r)){landPositions.push(...positions);landColors.push(...colors);}}ground.add(mesh);
 const walls=[];for(let e=0;e<6;e++){const angle=(e+.5)*Math.PI/3,nx=c.x+Math.sin(angle)*R*Math.sqrt(3),nz=c.z+Math.cos(angle)*R*Math.sqrt(3);if(BOARD_CELLS.some(other=>{const p=cellWorld(other);return Math.hypot(p.x-nx,p.z-nz)<.01;}))continue;for(let j=0;j<N;j++){const a=pt(e,1-j/N,j/N).map(v=>v*S),b=pt(e,1-(j+1)/N,(j+1)/N).map(v=>v*S),lowA=[a[0],-.12,a[2]],lowB=[b[0],-.12,b[2]];walls.push(...a,...lowA,...b,...b,...lowA,...lowB);}}if(START_CELLS.has(cell.q+','+cell.r))wallPositions.push(...walls);
 const pts=[];for(let e=0;e<6;e++)for(let j=0;j<=N;j++){const p=pt(e,1-j/N,j/N);pts.push(new T.Vector3(p[0]*S,p[1]*S+.018,p[2]*S));}for(let i=0;i<pts.length;i++)gridPositions.push(...pts[i].toArray(),...pts[(i+1)%pts.length].toArray());
 }
 const landGeo=new T.BufferGeometry();landGeo.setAttribute('position',new T.Float32BufferAttribute(landPositions,3));landGeo.setAttribute('color',new T.Float32BufferAttribute(landColors,3));landGeo.computeVertexNormals();const land=new T.Mesh(landGeo,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));land.receiveShadow=true;ground.add(land);
 const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.Float32BufferAttribute(wallPositions,3));wallGeo.computeVertexNormals();ground.add(new T.Mesh(wallGeo,new T.MeshLambertMaterial({color:'#222a29',side:T.DoubleSide})));
 const gridGeo=new T.BufferGeometry();gridGeo.setAttribute('position',new T.Float32BufferAttribute(gridPositions,3));ground.add(new T.LineSegments(gridGeo,new T.LineBasicMaterial({color:'#6b8078',transparent:true,opacity:.32})));
 return ground;
}
function plantForest(ground,nextBoard,sample){if(!forestTemplate)return;const rng=random(81),places=[],occupied=nextBoard.instances.flatMap(i=>instanceCells(i,nextBoard.cards[cardKey(i.cardId,i.cardRevision)]));for(let k=0;k<12000&&places.length<Math.min(BOARD_CELLS.length*7,innerWidth<800?250:750);k++){const c=BOARD_CELLS[Math.floor(rng()*BOARD_CELLS.length)];if(occupied.some(o=>o.q===c.q&&o.r===c.r))continue;const center=cellWorld(c),x=center.x+(rng()-.5)*70,z=center.z+(rng()-.5)*70,cluster=Math.sin(x/63)+Math.cos(z/79)+Math.sin((x+z)/91);if(cluster<.35||sample(x,z)<12)continue;places.push({x,z,y:sample(x,z),angle:rng()*6.28,size:.8+rng()*.65});}
 forestTemplate.updateMatrixWorld(true);forestTemplate.traverse(o=>{if(!o.isMesh)return;const inst=new T.InstancedMesh(o.geometry.clone(),o.material.clone(),places.length),mat=new T.Matrix4(),pos=new T.Vector3(),rot=new T.Quaternion(),scale=new T.Vector3();for(let i=0;i<places.length;i++){const p=places[i];pos.set(p.x*S,p.y*S,p.z*S);rot.setFromAxisAngle(new T.Vector3(0,1,0),p.angle);scale.setScalar(p.size);mat.compose(pos,rot,scale).multiply(o.matrixWorld);inst.setMatrixAt(i,mat);}inst.castShadow=false;inst.receiveShadow=true;ground.add(inst);});}
const presets={homestead:{name:'Homestead',types:['ranch']},working:{name:'Working ranch',types:['ranch','paddock','crop']},pasture:{name:'Grazing estate',types:['ranch','paddock']}};
function presetSet(type=sceneType){return type==='ranch'?presets:Object.fromEntries(Object.entries(SCENE_DEFINITIONS[type].presets).map(([key,name])=>[key,{name,types:[type]}]));}
function recipe({type,chosen,variation,settings}){if(type==='garden'&&GARDEN_V2.presets[chosen])return gardenCardRecipe(chosen,variation,composer.dimensions);if(SEASIDE_SCENES[type])return seasideRecipe(chosen,variation);if(DISTRICT_SCENES[type])return districtRecipe(type,chosen,variation,settings?.growthStage??3);if(type==='castle')return castleRecipe(chosen,variation);if(type!=='ranch')return domesticRecipe(type,chosen,variation);return {generator:'ranch-composer',version:1,seed:variation,preset:chosen,landscape:{height:0,vegetation:2,props:1,seed:173},tiles:presetSet(type)[chosen].types.map((type,i)=>({id:type,type,cell:i,rotation:0,seed:(variation+i*43)>>>0||1}))};}
async function composeDraft(request){const type=request.type;if(type==='garden'&&GARDEN_V2.presets[request.chosen])await composer.gardenDimensions();const r=recipe(request);if(type==='ranch'&&request.settings?.generatedGrowth){const cells=grownCells(CELLS,r.tiles.length,request.variation);r.tiles.forEach((tile,i)=>tile.cell=cells[i]);r.footprintGrowth={method:'connected-parcel-accretion',seed:request.variation};}r.microcosm=spatialState();if(request.settings)r.landscape={...r.landscape,...request.settings};const definition=r.generator==='domestic-composer'?DOMESTIC_SCENES[type]:SCENE_DEFINITIONS[type],a=completeDomesticPaths(planAssembly(r,{dimensions:composer.dimensions,requirementsByType:type==='ranch'?{}:{[type]:r.requirements||domesticRequirements(type,request.chosen)}})),next=new T.Group();applyGardenAssembly(a,()=>r);try{for(const tile of r.tiles){const p=a.plans.find(p=>p.id===tile.id),g=await composer.draw(tile,p,{landscape:r.landscape,...(r.requirements?.[0]?.townTerrain?{heightAt:townSurface(p,r.requirements[0].townTerrain.preset,r.seed)}:type==='seaside'?{heightAt:seasideSurface(a)}:{})});g.position.set(p.center.x*S,0,p.center.z*S);next.add(g);}const snapshot=next.clone(true);snapshot.scale.setScalar(1/S);const result={tileMetrics:structuredClone(TILE_METRICS),recipe:r,cells:r.tiles.map(t=>CELLS[t.cell]),rendition:{scene:snapshot.toJSON()},resolvedPlan:a,normalizedDimensions:structuredClone(composer.dimensions),normalization:structuredClone(composer.normalization),ports:[],type,capabilities:type==='ranch'?{}:structuredClone(definition.capabilities),semantics:{description:r.generator==='garden-composer'?r.gardenPlan.grammar.sentence:type==='ranch'?'A household ranch arranged around livestock care, storage and agricultural surplus.':SEASIDE_SCENES[type]?describeSeaside(request.chosen):DISTRICT_SCENES[type]?describeDistrict(type,request.chosen):type==='castle'?describeCastle(request.chosen):describeDomestic(type,request.chosen,r.requirements.length),...(definition||{purpose:'Households, livestock care and agricultural surplus'}),implemented:['spatial layout','paths','placement adaptation',...(Object.keys(definition?.capabilities||{}).length?['village-demo economy when connected']:[])],planned:[...(r.generator==='garden-composer'?['crop growth','watering','harvest production','storage consumption']:[]),'power','water','sewage'],quantities:'Village-demo capacities are explicit provisional settings; ecological and real-world quantities remain undecided'},provenance:type==='ranch'?{catalog:'/simulation-assets/catalog.json'}:{manifest:r.generator==='garden-composer'?'/garden-assets/provenance.json':type==='seaside'?'/coastal-assets/manifest.json':type==='castle'?'/castle-assets/manifest.json':'/domestic-assets/manifest.json',sourceUp:'Z',renderUp:'Y',geometry:'glTF Y-up; no second conversion'}};if(type==='town'){r.townLife??=townForPreset(request.chosen);for(const g of next.children){const plan=a.plans[next.children.indexOf(g)];attachTown(g,plan,request.chosen,()=>r.townLife,townSurface(plan,request.chosen,r.seed),S);}}else for(const g of next.children){const plan=a.plans[next.children.indexOf(g)];attachSceneLife(g,plan,()=>r.microcosm,r.requirements?.[0]?.townTerrain?townSurface(plan,r.requirements[0].townTerrain.preset,r.seed):type==='seaside'?seasideSurface(a):()=>0,S);}return {group:next,draft:result};}catch(error){dispose(next);throw error;}}
async function generate(){if(typeof closePull!=='undefined'&&(closePull||closeSpring))cancelClosePull();if(!composer)return false;if(expanded){selected=null;mode='create';ground.visible=false;for(const g of pieces.values())g.visible=false;}if(busy)throw Error('Board is busy');const request=Object.freeze({type:sceneType,chosen:preset,variation:seed,settings:structuredClone(customSettings)}),previousPreview=preview,previousDraft=draft;setBusy(true);status('Composing '+SCENE_TYPES[request.type].label.toLowerCase()+'…');let staged;try{staged=await composeDraft(request);scene.remove(preview);preview=staged.group;draft=staged.draft;scene.add(preview);preview.visible=expanded&&mode==='create';updateDraftThumbnail();renderer.shadowMap.needsUpdate=true;if(expanded)fit(true,draft.recipe.generator==='garden-composer');else render();if(expanded)$('board-summary').textContent=draft.recipe.tiles.length+' hex'+(draft.recipe.tiles.length===1?'':'es')+' · '+(presetSet(request.type)[request.chosen]?.name||DOMESTIC_SCENES[request.type]?.presets[request.chosen]);actionRevision++;dispose(previousPreview);status(draft.resolvedPlan.warnings.length?draft.resolvedPlan.warnings.join('; '):draft.recipe.generator==='garden-composer'?'Ready · layout only; production planned':'Ready to save');return true;}catch(error){if(staged){scene.remove(staged.group);dispose(staged.group);}preview=previousPreview;draft=previousDraft;scene.add(preview);if(draft?.recipe){sceneType=draft.type;preset=draft.recipe.preset;seed=draft.recipe.seed;updateSceneControls();}status(error.message);return false;}finally{setBusy(false);if(typeof syncEditorContract==='function')syncEditorContract();if(typeof updateMicrocosm==='function'&&$('microcosm-panel'))updateMicrocosm();}}
async function refreshDeck(){deck=await listCardSummaries();$('deck-count').textContent=deck.length;const wrap=$('deck-cards');wrap.replaceChildren();if(!deck.length){wrap.textContent='Your saved compositions will appear here.';return;}for(const card of deck){const b=document.createElement('button');b.className='deck-card';b.setAttribute('aria-label','Place '+card.name);const art=document.createElement('span');art.className='card-art';art.textContent='⬡'.repeat(card.cells.length);const title=document.createElement('strong');title.textContent=card.name;const meta=document.createElement('small');meta.textContent=card.cells.length+(card.cells.length===1?' hex · ':' hexes · ')+(sceneTypeForCard(card)?.label||card.type);b.append(art,title,meta);b.disabled=!sceneTypeForCard(card);if(b.disabled)meta.textContent='Not available on Board yet';b.onclick=async()=>{if(busy)return;setBusy(true);try{activeCard=await getCard(card.id,card.revision);if(!activeCard)throw Error('Saved card not found');selected=null;rotation=0;setMode('place');showDeck(false);$('selection-name').textContent=card.name;status('Choose a hex');}catch(error){status(error.message);}finally{setBusy(false);}};wrap.append(b);}}
function focusSettlement(){const wanted=({burg:'castle',neighborhood:'neighborhood',town:'town',seaside:'seaside'})[board.settlement?.preset]||'home',instance=board.instances.find(i=>board.cards[cardKey(i.cardId,i.cardRevision)]?.type===wanted);if(instance){selected=instance.instanceId;$('selection-name').textContent=board.cards[cardKey(instance.cardId,instance.cardRevision)].name;syncInstanceControls();}fit(true,true);}
function selectedCard(){const instance=board.instances.find(i=>i.instanceId===selected);return instance?board.cards[cardKey(instance.cardId,instance.cardRevision)]:null;}
function syncInstanceControls(){
 if(b3Ready)queueMicrotask(b3Sync);
 refreshDashboard();
 const select=$('instance-select'),card=selectedCard();select.replaceChildren(new Option('Choose a tile',''));
 for(const i of board.instances){const c=board.cards[cardKey(i.cardId,i.cardRevision)];select.add(new Option(c.name+' · '+i.q+', '+i.r,i.instanceId));}
 select.value=card?selected:'';select.disabled=busy;
 $('place-panel').hidden=!card;$('instance-editor').hidden=!card;$('instance-presets').replaceChildren();
 $('selection-name').textContent=card?card.name:activeCard?activeCard.name:'Choose a tile';
 $('instance-reroll').disabled=busy||!card;$('remove').disabled=busy||!card;
 $('undo').disabled=busy||!history.available().undo;$('redo').disabled=busy||!history.available().redo;
 if(!card)return;
 const type=card.type,design=TILE_CONTROLS[type];$('instance-heading').textContent=design?.choice||'Layout';$('instance-seed').textContent='Seed '+card.recipe.seed;$('fit-selection').textContent=design?.focus||'Close view';
 for(const [id,p] of Object.entries(presetSet(type))){const button=document.createElement('button');button.textContent=p.name;button.dataset.instancePreset=id;button.setAttribute('aria-pressed',String(id===card.recipe.preset));button.disabled=busy;button.onclick=()=>reviseInstance({instanceId:selected,preset:id}).catch(e=>status(e.message));$('instance-presets').append(button);}
 window.RanchView?.changed();
}
function chooseInstance(id){if(busy)throw Error('Board is busy');if(!board.instances.some(i=>i.instanceId===id))throw Error('Select a tile');selected=id;activeCard=null;setMode('place');$('create-drawer').hidden=false;$('drawer-toggle').setAttribute('aria-expanded','true');syncInstanceControls();return {instanceId:selected,recipe:selectedCard().recipe};}
async function reviseInstance(args){
 if(busy)throw Error('Board is busy');
 const instance=board.instances.find(i=>i.instanceId===args.instanceId);if(!instance)throw Error('Select a tile');
 const source=board.cards[cardKey(instance.cardId,instance.cardRevision)],chosen=args.preset??source.recipe.preset,variation=args.seed??(args.preset?source.recipe.seed:(crypto.getRandomValues(new Uint32Array(1))[0]||1));
 if(!SCENE_TYPES[source.type]?.presets.includes(chosen))throw Error('Unsupported preset for '+source.type);
 if(!Number.isInteger(variation)||variation<1||variation>4294967295)throw Error('Seed must be an integer from 1 to 4294967295');
 runVillage(false);setBusy(true);status('Updating '+source.name+'…');let staged;
 const beforeRevision=board.revision;
 try{
  await new Promise(requestAnimationFrame);staged=await composeDraft({type:source.type,chosen,variation,settings:{growthStage:source.recipe.growthStage??3}});
  if(staged.draft.resolvedPlan.warnings.length)throw Error(staged.draft.resolvedPlan.warnings.join('; '));
  const card=createCard({...staged.draft,name:presetSet(source.type)[chosen].name,sourceCard:{id:source.id,revision:source.revision}});
  const next=replaceComposition(board,instance.instanceId,card);validateFootprints(next);
  const visual=await rebuild(next);history.commit(next);actionRevision++;selected=instance.instanceId;activeCard=null;setBusy(true);
  const saved=await persistCurrent(),warnings=[...visual.warnings,...saved.warnings];
  try{warnings.push(...economy().accessWarnings.map(w=>typeof w==='string'?w:w.reason||w.message||'Access needs review'));}catch(error){warnings.push('Access inspection unavailable: '+error.message);}
  status(warnings.length?warnings.join('; '):'Tile updated · Undo available');
  return {instanceId:selected,cardId:card.id,cardRevision:card.revision,beforeRevision,afterRevision:board.revision,seed:variation,preset:chosen,persisted:saved.persisted,storageScope:'this-browser',warnings};
 }finally{if(staged)dispose(staged.group);setBusy(false);window.RanchView?.changed();}
}
$('instance-select').onchange=()=>{if($('instance-select').value)chooseInstance($('instance-select').value);};
$('instance-reroll').onclick=()=>reviseInstance({instanceId:selected}).catch(e=>status(e.message));
function showDeck(open){$('deck-drawer').hidden=!open;$('deck-toggle').setAttribute('aria-expanded',String(open));render();}
function setMode(next){mode=next;preview.visible=expanded&&mode==='create';ground.visible=!expanded||mode!=='create';for(const g of pieces.values())g.visible=!expanded||mode!=='create';ghost.visible=mode==='place';$('create-panel').hidden=false;$('place-panel').hidden=!selected;$('life-panel').hidden=true;if(mode==='life')refreshLife();syncInstanceControls();document.querySelector('.drawer-head h2').textContent=terrainEditor?'Terrain':SCENE_TYPES[sceneType].label;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(expanded&&mode==='create')fit(true,draft?.recipe.generator==='garden-composer');render();}
async function startVillage(presetId='hamlet'){
 if(busy)throw Error('Board is busy');runVillage(false);setBusy(true);
 const cards=[],warnings=[],previousId=board.id;let cardsSaved=false,committed=false,saved=null;
 try{const definition=settlementPreset(presetId),entries=definition.entries;
  for(let i=0;i<entries.length;i++){const entry=entries[i];status('Composing '+definition.label+' · '+(i+1)+'/'+entries.length);await new Promise(requestAnimationFrame);const result=await composeDraft(Object.freeze({type:entry.type,chosen:entry.preset,variation:entry.seed}));try{if(result.draft.resolvedPlan.warnings.length)throw Error(result.draft.resolvedPlan.warnings.join('; '));cards.push(createCard({...result.draft,name:SCENE_DEFINITIONS[entry.type].name}));}finally{dispose(result.group);}}
  status('Finding a suitable site…');await new Promise(requestAnimationFrame);
  const placement=planSettlementPreset({cards,entries,dimensions:composer.dimensions,assetIndex,boardId:crypto.randomUUID(),maxCandidates:8});
  if(placement.status!=='ready')throw Error('No suitable '+definition.label.toLowerCase()+' site found; your board is unchanged');
  let next={...placement.board,settlement:{preset:presetId,label:definition.label,site:placement.site}};const resolved=placement.economy;
  next=evolveBoardEconomy(next,resolved,'supplies');status('Saving scene cards…');await saveCards(cards);cardsSaved=true;
  await rebuild(next);committed=true;history.commit(next);actionRevision++;activeCard=null;selected=null;setBusy(true);saved=await persistCurrent();warnings.push(...saved.warnings);
  try{await refreshDeck();}catch(error){warnings.push('Village saved; deck refresh failed: '+error.message);}
  try{setMode('life');if(innerWidth<600){$('create-drawer').hidden=true;$('drawer-toggle').setAttribute('aria-expanded','false');}focusSettlement();}catch(error){warnings.push('Village committed; view refresh failed: '+error.message);}
  status(warnings.length?warnings.join('; '):definition.label+' ready · '+cards.length+' scenes saved to deck');
  return {outcome:'board-committed',boardLoaded:true,boardId:board.id,revision:board.revision,cardIds:cards.map(c=>c.id),cardsPersisted:true,...saved,warnings};
 }catch(error){if(!cardsSaved){status(error?.message||error?.name||'Settlement preparation failed');throw error;}warnings.push((committed?'Village committed':'Cards saved; previous board retained')+': '+error.message);try{await refreshDeck();}catch(refreshError){warnings.push('Deck refresh failed: '+refreshError.message);}status(warnings.join('; '));return {outcome:committed?'board-committed':'cards-saved',boardLoaded:committed,boardId:committed?board.id:previousId,revision:board.revision,cardIds:cards.map(c=>c.id),cardsPersisted:true,persisted:committed?!!saved?.persisted:false,storageScope:'this-browser',warnings};
 }finally{setBusy(false);if(mode==='life')try{refreshLife();}catch(error){warnings.push('Life view refresh failed: '+error.message);}}
}
for(const button of document.querySelectorAll('[data-settlement]'))button.onclick=()=>{settlementChoice=button.dataset.settlement;document.querySelectorAll('[data-settlement]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.settlement===settlementChoice)));$('village-starter').textContent='Load '+SETTLEMENT_PRESETS[settlementChoice].label;};
document.querySelectorAll('[data-settlement]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.settlement===settlementChoice)));$('village-starter').textContent='Load '+SETTLEMENT_PRESETS[settlementChoice].label;
$('village-starter').onclick=()=>startVillage(settlementChoice).catch(e=>status(e.message));
function economy(){return resolveBoardEconomy(board,assembly,heightAt,assetIndex,composer.dimensions);}
function refreshLife(){if(!composer)return;const {report,accessWarnings}=economy();$('village-day').textContent='Day '+report.day+' · '+report.population+' residents';const stock=$('village-stock');stock.replaceChildren();for(const [key,label]of Object.entries({rawFood:'Harvest',fuel:'Fuel',clay:'Clay',vessels:'Vessels',food:'Food'})){const chip=document.createElement('span');chip.textContent=label+' '+report.stock[key];stock.append(chip);}const goals=$('village-goals');goals.replaceChildren();for(const goal of report.goals){const b=document.createElement('button');b.textContent=(goal.claimed?'✓ ':goal.ready?'Claim · ':'')+goal.title+(goal.claimed?'':' · '+goal.progress+'/'+goal.target);b.disabled=busy||!goal.ready;b.onclick=()=>villageEdit('claim',{goalId:goal.id}).catch(e=>status(e.message));goals.append(b);}$('village-supplies').disabled=busy||!!board.supplies;$('village-supplies').textContent=board.supplies?'Starting clay allocated':'Starting clay · 30';const jobs=report.lastDay?.jobs||[];$('village-work').textContent=jobs.length?jobs.filter(j=>j.status==='working').length+' working · '+jobs.filter(j=>j.status==='blocked').length+' blocked'+(report.lastDay.unfed?' · '+report.lastDay.unfed+' unfed':''):report.warnings[0]?.message||'Ready';return {report,accessWarnings};}
async function villageEdit(action,args={}){if(busy)throw Error('Board is busy');setBusy(true);try{const current=economy(),next=evolveBoardEconomy(board,current,action,args);resolveBoardEconomy(next,assembly,heightAt,assetIndex,composer.dimensions);history.commit(next);board=next;actionRevision++;const saved=await persistCurrent();if(saved.persisted)status(action==='supplies'?'Starting clay allocated':action==='claim'?'Goal claimed · +1 inspiration':'Day '+board.simulation.day);return {revision:board.revision,...saved,report:economy().report};}finally{setBusy(false);refreshLife();window.RanchView?.changed();}}
function runVillage(run){villageRunning=run;$('village-run').textContent=run?'Pause':'Run';clearTimeout(villageTimer);if(run){const tick=async()=>{if(!villageRunning)return;try{if(!busy)await villageEdit('day');}catch(e){status(e.message);runVillage(false);return;}if(villageRunning)villageTimer=setTimeout(tick,3000);};villageTimer=setTimeout(tick,100);}actionRevision++;}
$('village-step').onclick=()=>villageEdit('day').catch(e=>status(e.message));$('village-run').onclick=()=>runVillage(!villageRunning);$('village-supplies').onclick=()=>villageEdit('supplies').catch(e=>status(e.message));
document.addEventListener('visibilitychange',()=>{if(document.hidden)runVillage(false);});
async function rebuild(next,{animate=true,allowUnwalkable=false}={}){setBusy(true);motion.settle();const before=captureMotion(pieces),nextPieces=new Map();let stagedGround=null,committed=false;await new Promise(requestAnimationFrame);try{const {tiles,assembly:a,source}=planComposition(next,composer.dimensions),normal=boardHeight(a,next.terrain?.seed??41,{relief:next.terrain?.relief??1,landform:next.terrain?.landform});if(!normal.grading.valid&&!allowUnwalkable)throw Error('This placement needs excessive terrain grading. Try a gentler site.');const h=!normal.grading.valid&&!next.terrain?.landform?legacyBoardHeight(a,next.terrain?.seed??41,normal.grading.warnings,next.terrain?.relief??1):normal;if(a.warnings.length)throw Error('Cannot preserve this composition: '+a.warnings.map(w=>w.split(': ').slice(1).join(': ')).join('; '));for(const tile of tiles){const p=a.plans.find(p=>p.id===tile.id),g=await composer.draw(tile,p,{skirt:false,heightAt:h,...(source(tile).recipe.generator==='garden-composer'?{gardenRendition:source(tile).rendition.scene}:{}),normalization:source(tile).normalization,landscape:source(tile).recipe.landscape});g.position.set(p.center.x*S,0,p.center.z*S);g.userData.instanceId=tile.instanceId;if(source(tile).type==='town'){const card=source(tile);attachTown(g,p,card.recipe.preset,()=>{const i=board.instances.find(i=>i.instanceId===tile.instanceId&&i.cardId===card.id)||next.instances.find(i=>i.instanceId===tile.instanceId);return townState(card,i);},h,S);}else {const card=source(tile);attachSceneLife(g,p,()=>{const i=board.instances.find(i=>i.instanceId===tile.instanceId)||next.instances.find(i=>i.instanceId===tile.instanceId);if(i){i.microcosm??=structuredClone(card.recipe.microcosm||spatialState());return i.microcosm;}return null;},h,S);}g.traverse(o=>{o.userData.instanceId=tile.instanceId;});nextPieces.set(tile.id,g);}
 stagedGround=buildGround(next,h);
 const previous={board,pieces,ground,assembly,heightAt};
 for(const g of previous.pieces.values())scene.remove(g);scene.remove(previous.ground);
 pieces=nextPieces;ground=stagedGround;assembly=a;heightAt=h;board=next;
 for(const g of pieces.values()){scene.add(g);g.visible=!expanded||mode!=='create';}scene.add(ground);ground.visible=!expanded||mode!=='create';renderer.shadowMap.needsUpdate=true;
 try{render();}catch(error){for(const g of pieces.values())scene.remove(g);scene.remove(ground);({board,pieces,ground,assembly,heightAt}=previous);for(const g of pieces.values())scene.add(g);scene.add(ground);throw error;}
 committed=true;for(const g of previous.pieces.values())dispose(g);dispose(previous.ground);
 const warnings=[];
 if(animate)try{for(const [id,g]of pieces)if(!before.has(id)){const start=captureMotion(new Map([[id,g]])).get(id);start.position.y+=3;for(const p of start.pieces.values())p.position.y+=.6;before.set(id,start);}await motion.play(pieces,before);}catch(error){motion.settle();warnings.push('Layout committed; animation unavailable: '+error.message);}
 status(warnings.length?warnings.join('; '):`${board.instances.length} compositions · ${a.links.length} connected edges`);$('board-summary').textContent=`100 hexes · ${board.instances.length} compositions`;if(!expanded)document.querySelector('.board-heading h1').textContent=terrainEditor?'Shape your landscape.':board.region?.name||board.settlement?.label||'Room to grow.';syncTerrainControls();return {warnings};
 }finally{if(!committed){for(const g of nextPieces.values())dispose(g);if(stagedGround)dispose(stagedGround);}setBusy(false);}}
function syncRegionUI(){
 $('region-name').value=board.region?.name||'';
 for(const button of $('region-presets').children)button.setAttribute('aria-pressed',String(button.dataset.region===board.terrain?.landform));
 $('region-open').textContent=board.region?.name||'Region';
}
async function changeRegion(presetId){
 if(busy)return;const feedback=$('region-feedback');
 try{const next=regionEdit(board,{name:$('region-name').value,presetId,seed:crypto.getRandomValues(new Uint32Array(1))[0]||1});feedback.textContent=presetId?'Generating your landscape…':'Saving region name…';
 if(presetId)await rebuild(next,{animate:false});else board=next;
 history.commit(next);actionRevision++;setBusy(true);const saved=await persistCurrent();syncRegionUI();if(!expanded)document.querySelector('.board-heading h1').textContent=board.region.name;setMode('place');
 feedback.textContent=saved.persisted?(presetId?REGION_PRESETS[presetId].label+' generated · saved in this browser. Undo is available.':'Region name saved in this browser.'):saved.warnings.join('; ');
 }catch(error){feedback.textContent=error.message+' Your previous landscape is unchanged.';}finally{setBusy(false);}
}
for(const [id,p]of Object.entries(REGION_PRESETS)){const button=document.createElement('button');button.dataset.region=id;button.innerHTML=p.art+'<strong>'+p.label+'</strong><span>'+p.description+'</span>';button.onclick=()=>changeRegion(id);$('region-presets').append(button);}
$('region-open').onclick=()=>{syncRegionUI();$('region-dialog').showModal();};$('region-save').onclick=()=>changeRegion();
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>$(button.dataset.close).close();
function syncTerrainControls(){syncRegionUI();const settings=board.terrain||{seed:41,relief:1};$('terrain-seed').value=settings.seed;$('terrain-relief').value=settings.relief;$('terrain-relief-value').textContent=Math.round(settings.relief*100)+'%';document.querySelectorAll('[data-relief]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.relief)===settings.relief)));}
$('terrain-relief').oninput=()=>{$('terrain-relief-value').textContent=Math.round(Number($('terrain-relief').value)*100)+'%';};
document.querySelectorAll('[data-relief]').forEach(b=>b.onclick=()=>{$('terrain-relief').value=b.dataset.relief;$('terrain-relief').oninput();document.querySelectorAll('[data-relief]').forEach(p=>p.setAttribute('aria-pressed',String(p===b)));});
$('apply-terrain').onclick=async()=>{if(busy)return;const terrain={...board.terrain,seed:Number($('terrain-seed').value),relief:Number($('terrain-relief').value)};if(!Number.isInteger(terrain.seed)||terrain.seed<1||terrain.seed>4294967295||!Number.isFinite(terrain.relief)||terrain.relief<0||terrain.relief>1.5){status('Choose a valid terrain seed and relief.');return;}try{const next={...board,revision:board.revision+1,terrain};await rebuild(next,{animate:false});history.commit(next);actionRevision++;setBusy(true);const saved=await persistCurrent();if(saved.persisted)status('Terrain saved · open Sandbox to build on it');fit(false);}catch(e){status(e.message);syncTerrainControls();}finally{setBusy(false);}};
syncTerrainControls();
let persisted=true;
async function persistCurrent(){try{const result=await saveBoard(board);persisted=true;$('retry-save').hidden=true;return result;}catch(error){persisted=false;$('retry-save').hidden=false;const usage=await navigator.storage?.estimate?.().catch(()=>null);const warning='Edit kept in memory; save failed: '+(error.message||error.name||'storage unavailable')+(usage?' ('+Math.round(usage.usage/1048576)+' MB of '+Math.round(usage.quota/1048576)+' MB)':'');status(warning);return {persisted:false,storageScope:'this-browser',warnings:[warning]};}}
$('retry-save').onclick=async()=>{if(busy)return;const result=await persistCurrent();if(result.persisted)status('Board saved · this browser');};
async function commit(action,args){if(busy)return {error:'Board is busy'};try{if(['place','replace'].includes(action))requirePlaceableCard(args.card);const next=editBoard(board,action,args);validateFootprints(next);const visual=await rebuild(next,{allowUnwalkable:action==='remove'});history.commit(next);actionRevision++;setBusy(true);const saved=await persistCurrent();if(action==='place'){await refreshDeck().catch(()=>{});if(b3Ready&&board.instances.length===1)setMode('place');}window.RanchView?.changed();return {revision:board.revision,persisted:saved.persisted,storageScope:saved.storageScope,warnings:[...assembly.warnings,...visual.warnings,...saved.warnings]};}catch(e){status(e.message);return {error:e.message};}finally{setBusy(false);if(typeof syncEditorContract==='function')syncEditorContract();if(typeof updateMicrocosm==='function'&&$('microcosm-panel'))updateMicrocosm();}}
function dropCell(cell){return cell&&drag?.grabCell&&selected?{q:cell.q-drag.grabCell.q,r:cell.r-drag.grabCell.r}:cell;}
function dropIntent(cell,newInstanceId='preview'){cell=dropCell(cell);return resolveDrop(board,{selected,card:activeCard,q:cell.q,r:cell.r,rotation,newInstanceId});}
function placement(cell){const intent=dropIntent(cell);return editBoard(board,intent.action,intent.args);}
async function commitDrop(cell,id=crypto.randomUUID()){const intent=dropIntent(cell,id);const candidate=editBoard(board,intent.action,intent.args);if(compactBoard&&candidate.instances.some(i=>instanceCells(i,candidate.cards[cardKey(i.cardId,i.cardRevision)]).some(c=>!BOARD_CELLS.some(b=>b.q===c.q&&b.r===c.r)))){status('This scene needs more room. Choose a smaller prefab.');return {error:'Outside 3 by 3 board'};}return commit(intent.action,intent.args);}
let hoverKey='';
function hover(cell){const key=cell?[cell.q,cell.r,selected,activeCard?.id,rotation,board.revision,drag?.grabCell?.q,drag?.grabCell?.r].join(':'):'';if(key&&key===hoverKey)return;hoverKey=key;target=cell;scene.remove(ghost);dispose(ghost);ghost=new T.Group();scene.add(ghost);if(!cell||(!activeCard&&!selected))return;let valid=true,footprint=[cell];try{const b=placement(cell);validateFootprints(b);const i=b.instances.find(i=>i.instanceId===(selected||'preview'));footprint=instanceCells(i,b.cards[cardKey(i.cardId,i.cardRevision)]);}catch{valid=false;}for(const c of footprint){const p=cellWorld(c),pts=Array.from({length:7},(_,i)=>{const x=p.x+Math.sin(i*Math.PI/3)*R,z=p.z+Math.cos(i*Math.PI/3)*R;return new T.Vector3(x*S,heightAt(x,z)*S+.1,z*S);});ghost.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:valid?'#f9d47a':'#c65c48',linewidth:2})));}render();}
const ray=new T.Raycaster();function hit(e){const rect=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);const groundHit=ray.intersectObjects(ground.children.filter(o=>o.userData.cell),false).find(h=>h.object.userData.cell),cell=groundHit?.object.userData.cell;const item=activeCard?null:(ray.intersectObjects([...pieces.values()],true).find(h=>h.object.userData.instanceId)?.object.userData.instanceId||board.instances.find(i=>cell&&instanceCells(i,board.cards[cardKey(i.cardId,i.cardRevision)]).some(c=>c.q===cell.q&&c.r===cell.r))?.instanceId);return {cell,item,point:groundHit?.point};}
let orbitMode=false,glassEnabled=true,glassRecords=[],lastDragPosition=null;
const canvas=renderer.domElement;
// Capture before OrbitControls: tiles own their gesture; empty space owns the camera.
canvas.addEventListener('pointerdown',e=>{
 if(cameraOwnsPointer(e)||busy)return;
 if(drag){cancelPull();return;}
 if(orbitMode||(expanded&&mode==='create'))return;
 const h=hit(e);if(!h.item&&!activeCard&&!h.cell){selected=null;syncInstanceControls();return;}
 e.stopImmediatePropagation();orbit.enabled=false;canvas.setPointerCapture(e.pointerId);
 drag={x:e.clientX,y:e.clientY,item:h.item,pointer:e.pointerId,started:performance.now(),pull:0,dx:0,empty:!h.item&&!activeCard,source:h.cell};
 if(drag.empty){selected=null;syncInstanceControls();canvas.style.cursor='grabbing';}
 if(h.item&&!activeCard){selected=h.item;activeCard=null;const origin=board.instances.find(i=>i.instanceId===selected),center=cellWorld(origin);if(h.cell)drag.grabCell={q:h.cell.q-origin.q,r:h.cell.r-origin.r};if(h.point)drag.grabPoint={x:h.point.x-center.x*S,z:h.point.z-center.z*S};syncInstanceControls();$('create-drawer').hidden=false;$('create-drawer').scrollTop=0;}
},true);
canvas.addEventListener('pointermove',e=>{
 if(busy||orbitMode||(expanded&&mode==='create'))return;
 if(!drag){if(activeCard)hover(hit(e).cell);return;}
 if(e.pointerId!==drag.pointer)return;
 const h=hit(e);drag.pull=Math.max(0,drag.y-e.clientY);drag.dx=e.clientX-drag.x;
 if(drag.empty){hover(h.cell);$('pull-hint').hidden=false;$('pull-hint').textContent='Moving: Empty land';return;}
 if(drag.item&&Math.hypot(drag.dx,drag.pull)>6){liftDrag(h.cell,h.point);const p=pullSample(drag.dx,drag.pull,performance.now()-drag.started);$('pull-hint').hidden=false;$('pull-hint').textContent=(p.ready?'Remove: ':p.pulling?'Lifting: ':'Moving: ')+(board.cards[cardKey(board.instances.find(i=>i.instanceId===drag.item)?.cardId,board.instances.find(i=>i.instanceId===drag.item)?.cardRevision)]?.name||'Scene');}
 else if(activeCard)hover(h.cell);
});
canvas.addEventListener('pointerup',async e=>{
 if(!drag||e.pointerId!==drag.pointer)return;const start=drag,h=hit(e),drop=dropCell(h.cell),p=pullSample(start.dx,start.pull,performance.now()-start.started);
 if(start.empty){drag=null;endDrag();restorePointer();hover(null);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(h.cell&&h.item){const occupant=board.instances.find(i=>i.instanceId===h.item),card=board.cards[cardKey(occupant.cardId,occupant.cardRevision)];if(instanceCells(occupant,card).length===1)await commit('move',{instanceId:occupant.instanceId,q:start.source.q,r:start.source.r});else status('This scene spans several hexes · move the scene as a whole');}else status(h.cell?'Empty land moved · both spaces remain empty':'Move cancelled');return;}
 if(start.item&&p.ready){await removeWithPop(start.item);return;}
 const moving=start.item&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>6;
 if(moving&&p.pulling){drag=null;await springBack();restorePointer();status('Back in place');return;}
 drag=null;endDrag();restorePointer();
 if(activeCard&&h.cell){const id=crypto.randomUUID();await commitDrop(h.cell,id);if(board.instances.some(i=>i.instanceId===id)){activeCard=null;selected=id;}}
 else if(selected&&moving&&drop){const intent=resolveDrop(board,{selected,q:drop.q,r:drop.r});await commit(intent.action,intent.args);}
 syncInstanceControls();hover(null);
});
function liftDrag(cell,point){if(!selected)return;const instance=board.instances.find(i=>i.instanceId===selected),origin=cellWorld(instance),aim=point?{x:(point.x-(drag.grabPoint?.x||0))/S,z:(point.z-(drag.grabPoint?.z||0))/S}:cell?cellWorld(dropCell(cell)):origin;
 if(!dragPreview){dragPreview=new T.Group();glassRecords=[];for(const g of pieces.values())if(g.userData.instanceId===selected){const copy=g.clone(true);copy.position.x-=origin.x*S;copy.position.z-=origin.z*S;copy.traverse(o=>{if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>dragMaterial(m,.9)):dragMaterial(o.material,.9);});dragPreview.add(copy);const plate=new T.Mesh(new T.CylinderGeometry(R*S*.97,R*S*.97,.28,6),new T.MeshStandardMaterial({color:'#a7b680',roughness:1}));plate.position.set(copy.position.x,heightAt(g.position.x/S,g.position.z/S)*S-.14,copy.position.z);plate.userData.dragPlate=true;dragPreview.add(plate);for(const o of copy.children)if(o.userData.motionKey&&!o.userData.motionKey.startsWith('dressing-'))glassRecords.push({o,base:o.position.clone(),rotation:o.rotation.clone(),body:glassBody()});g.traverse(o=>{if(o.material){dragOrigin.push([o,o.material]);o.material=Array.isArray(o.material)?o.material.map(m=>dragMaterial(m,.22)):dragMaterial(o.material,.22);}});}scene.add(dragPreview);canvas.style.cursor='grabbing';dragFrame=requestAnimationFrame(glassFrame);}
 const p=pullSample(drag.dx,drag.pull,performance.now()-drag.started),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 dragPreview.position.set(p.pulling?origin.x*S:aim.x*S,p.pulling?p.lift:1.8+(heightAt(aim.x,aim.z)-heightAt(origin.x,origin.z))*S,p.pulling?origin.z*S:aim.z*S);
 dragPreview.scale.set(1-p.stretch*.35,1+p.stretch,1-p.stretch*.35);dragPreview.rotation.z=0;render();
}
let glassTime=0;
function glassFrame(now){if(!dragPreview)return;const dt=Math.min(.05,(now-glassTime)/1000||.016);glassTime=now;const pos=dragPreview.position,dx=lastDragPosition?pos.x-lastDragPosition.x:0,dz=lastDragPosition?pos.z-lastDragPosition.z:0;lastDragPosition=pos.clone();
 stepElastic(glassRecords,dt,{enabled:glassEnabled,radius:2*S,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});render();dragFrame=requestAnimationFrame(glassFrame);}
function disposeDragMaterial(m){for(const v of Array.isArray(m)?m:[m])v.dispose();}
function endDrag(){cancelAnimationFrame(dragFrame);glassRecords=[];lastDragPosition=null;if(dragPreview){scene.remove(dragPreview);dragPreview.traverse(o=>{if(o.material)disposeDragMaterial(o.material);if(o.userData.dragPlate)o.geometry.dispose();});dragPreview=null;}for(const[o,m]of dragOrigin){disposeDragMaterial(o.material);o.material=m;}dragOrigin=[];canvas.style.cursor='';$('pull-hint').hidden=true;render();}
function restorePointer(){orbit.enabled=true;}
async function springBack(){if(!dragPreview)return;const object=dragPreview,start=object.position.clone(),scale=object.scale.clone(),rotation=object.rotation.z;await new Promise(resolve=>{const begin=performance.now();function tick(now){const t=Math.min(1,(now-begin)/240),f=matchMedia('(prefers-reduced-motion: reduce)').matches?0:(1-t)**3;object.position.y=start.y*f;object.scale.set(1+(scale.x-1)*f,1+(scale.y-1)*f,1+(scale.z-1)*f);object.rotation.z=rotation*f;render();if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});endDrag();}
async function removeWithPop(id){if(busy)return;const object=dragPreview;drag=null;restorePointer();if(object&&!matchMedia('(prefers-reduced-motion: reduce)').matches)await new Promise(resolve=>{const start=performance.now(),y=object.position.y;function tick(now){const t=Math.min(1,(now-start)/180);object.position.y=y+t*4;object.scale.setScalar(1-t*.35);render();if(t<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});endDrag();const result=await commit('remove',{instanceId:id});if(!result?.error){selected=null;status('Removed · Undo available');}syncInstanceControls();hover(null);}
function cancelPull(){drag=null;endDrag();restorePointer();hover(null);}
canvas.addEventListener('pointercancel',cancelPull);canvas.addEventListener('lostpointercapture',()=>{if(drag)cancelPull();});window.addEventListener('blur',cancelPull);
$('camera-orbit').onclick=()=>{cancelPull();orbitMode=!orbitMode;$('camera-orbit').setAttribute('aria-pressed',String(orbitMode));status(orbitMode?'Drag to orbit':'Click a tile · pull up to remove');};
$('glass-toggle').onclick=()=>{glassEnabled=!glassEnabled;$('glass-toggle').setAttribute('aria-pressed',String(glassEnabled));};
$('board-view').onclick=()=>{selected=null;activeCard=null;setMode('place');};
$('drawer-toggle').onclick=()=>{$('create-drawer').hidden=false;$('drawer-toggle').setAttribute('aria-expanded','true');fit(closeFraming,detailFraming);};$('drawer-close').onclick=()=>{$('create-drawer').hidden=true;$('drawer-toggle').setAttribute('aria-expanded','false');fit(closeFraming,detailFraming);};$('deck-toggle').onclick=()=>showDeck($('deck-drawer').hidden);$('deck-close').onclick=()=>showDeck(false);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{setMode(b.dataset.mode);if(mode==='place'&&!deck.length)showDeck(true);});
function presetShape(type,chosen){
 const cells=type==='ranch'?CELLS.slice(0,presetSet(type)[chosen].types.length):[CELLS[0]],ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('aria-hidden','true');svg.classList.add('preset-footprint');
 const points=cells.map(c=>({x:Math.sqrt(3)*18*(c.q+c.r/2),y:27*c.r})),minX=Math.min(...points.map(p=>p.x))-17,maxX=Math.max(...points.map(p=>p.x))+17,minY=Math.min(...points.map(p=>p.y))-19,maxY=Math.max(...points.map(p=>p.y))+19;
 svg.setAttribute('viewBox',[minX,minY,maxX-minX,maxY-minY].join(' '));
 for(const p of points){const hex=document.createElementNS(ns,'polygon');hex.setAttribute('points',Array.from({length:6},(_,i)=>[p.x+Math.sin(i*Math.PI/3)*18,p.y+Math.cos(i*Math.PI/3)*18].join(',')).join(' '));svg.append(hex);}if(type==='town'){for(const path of townLayout(chosen,seed).paths){const line=document.createElementNS(ns,'polyline');line.setAttribute('points',path.map(([x,z])=>[x*.4,z*.4].join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','.8');svg.append(line);}}return svg;
}
function cycleBiome(direction){if(busy)return;const ids=['ranch','garden','market',...Object.keys(SCENE_TYPES).filter(id=>!['ranch','garden','market'].includes(id))];$('scene-family').value=ids[(ids.indexOf(sceneType)+direction+ids.length)%ids.length];$('scene-family').onchange();}
$('previous-biome').onclick=()=>cycleBiome(-1);$('next-biome').onclick=()=>cycleBiome(1);
function updateSceneControls(){ $('scene-browser-open').firstChild.textContent=SCENE_TYPES[sceneType].label+' · Explore scenes '; document.body.dataset.sceneType=sceneType;document.querySelector('.drawer-head h2').textContent=terrainEditor?'Terrain':SCENE_TYPES[sceneType].label;$('preset-heading').textContent=TILE_CONTROLS[sceneType].choice;$('fit-selection').textContent=TILE_CONTROLS[sceneType].focus;const family=$('scene-family');family.replaceChildren();for(const s of ['ranch','garden','market',...Object.keys(SCENE_TYPES).filter(id=>!['ranch','garden','market'].includes(id))].map(id=>SCENE_TYPES[id])){const o=document.createElement('option');o.value=s.id;o.textContent=s.label;family.append(o);}family.value=sceneType;const wrap=$('presets');wrap.replaceChildren();for(const [id,p]of Object.entries(presetSet())){const b=document.createElement('button');b.dataset.preset=id;b.setAttribute('aria-pressed',String(id===preset));b.append(presetShape(sceneType,id));const label=document.createElement('span');label.textContent=p.name;b.append(label);b.onclick=()=>{preset=id;$('card-name').value=p.name;updateSceneControls();generate();};wrap.append(b);}renderCustomPresets();$('expand-scene').href=SCENE_TYPES[sceneType].expandedPath;$('expand-scene').textContent='Edit closely ↗';if(expanded){$('fit-board').textContent='Whole tile';document.querySelector('.brand strong').textContent='Sandbox';document.title=SCENE_TYPES[sceneType].label+' · Sandbox';document.querySelector('.board-heading h1').textContent=SCENE_DEFINITIONS[sceneType]?.name||'Ranch';}}
$('scene-family').onchange=()=>{sceneType=$('scene-family').value;preset=SCENE_TYPES[sceneType].presets[0];$('card-name').value=presetSet()[preset].name;updateSceneControls();generate();};

const thumbnailTarget=new T.WebGLRenderTarget(320,200);thumbnailTarget.texture.colorSpace=T.SRGBColorSpace;
const thumbnailPixels=new Uint8Array(320*200*4),thumbnailCanvas=document.createElement('canvas');thumbnailCanvas.width=320;thumbnailCanvas.height=200;
function updateDraftThumbnail(){
 const shot=new T.Scene();shot.background=new T.Color('#e7ecde');shot.add(new T.HemisphereLight('#b6cfdd','#242c27',1.9));const light=new T.DirectionalLight('#dbe8ff',2.2);light.position.set(-45,90,50);shot.add(light);
 const parent=preview.parent,visible=preview.visible,previousTarget=renderer.getRenderTarget();preview.visible=true;shot.add(preview);
 try{const box=new T.Box3().setFromObject(preview),center=box.getCenter(new T.Vector3()),radius=box.getSize(new T.Vector3()).length()/2;
 const cam=new T.PerspectiveCamera(38,1.6,.1,1600);cam.position.copy(center).add(new T.Vector3(.65,.78,1.2).normalize().multiplyScalar(radius/Math.sin(19*Math.PI/180)*1.1));cam.lookAt(center);
 renderer.setRenderTarget(thumbnailTarget);renderer.render(shot,cam);renderer.readRenderTargetPixels(thumbnailTarget,0,0,320,200,thumbnailPixels);
 const context=thumbnailCanvas.getContext('2d'),pixels=context.createImageData(320,200);for(let y=0;y<200;y++)pixels.data.set(thumbnailPixels.subarray((199-y)*1280,(200-y)*1280),y*1280);context.putImageData(pixels,0,0);$('draft-image').src=thumbnailCanvas.toDataURL('image/png');
 }finally{shot.remove(preview);parent?.add(preview);preview.visible=visible;renderer.setRenderTarget(previousTarget);render();}
 $('draft-seed').value=seed;
 $('tile-measure').textContent=TILE_METRICS.pointToPoint+' m point-to-point · '+TILE_METRICS.acrossFlats.toFixed(1)+' m across flats per tile · '+draft.cells.length+' tile'+(draft.cells.length===1?'':'s')+' in this scene';
}
const PRESET_STORE='ranch-generator-presets-v1';
function readCustomPresets(){try{const rows=JSON.parse(localStorage.getItem(PRESET_STORE)||'[]');return Array.isArray(rows)?rows.filter(p=>SCENE_TYPES[p.type]?.presets.includes(p.preset)&&Number.isInteger(p.seed)&&p.seed>0&&p.seed<=4294967295&&p.settings&&[0,1,2,3].includes(p.settings.vegetation)&&[0,1].includes(p.settings.props)&&typeof p.name==='string'):[];}catch{return [];}}
function renderCustomPresets(){const wrap=$('custom-presets');wrap.replaceChildren();for(const saved of readCustomPresets().filter(p=>p.type===sceneType)){const b=document.createElement('button');b.className='custom-footprint';const label=document.createElement('span');label.textContent=saved.name;b.append(presetShape(saved.type,saved.preset),label);b.onclick=()=>{if(busy)return;preset=saved.preset;seed=saved.seed;rotation=saved.rotation||0;$('turn-draft').textContent='Rotate placement · '+rotation*60+'°';customSettings={...saved.settings};$('scene-greenery').value=customSettings.vegetation;$('greenery-value').textContent=customSettings.vegetation;$('draft-props').value=customSettings.props;$('card-name').value=saved.name;updateSceneControls();generate();};wrap.append(b);}}
$('save-preset').onclick=()=>{if(busy||!draft)return;const name=$('preset-name').value.trim();if(!name){status('Name your custom preset first');$('preset-name').focus();return;}try{const rows=readCustomPresets();rows.push({name,rotation,type:draft.type,preset:draft.recipe.preset,seed:draft.recipe.seed,settings:{vegetation:draft.recipe.landscape.vegetation,props:draft.recipe.landscape.props}});localStorage.setItem(PRESET_STORE,JSON.stringify(rows));renderCustomPresets();status('Preset saved in this browser');}catch(error){status('Could not save preset: '+error.message);}};
$('scene-greenery').onchange=()=>{customSettings.vegetation=Number($('scene-greenery').value);$('greenery-value').textContent=customSettings.vegetation;generate();};
$('apply-settings').onclick=()=>{const value=Number($('draft-seed').value);if(!Number.isInteger(value)||value<1||value>4294967295){status('Seed must be a whole number from 1 to 4294967295');return;}seed=value;customSettings.props=Number($('draft-props').value);generate();};
$('turn-draft').onclick=()=>{rotation=(rotation+1)%6;$('turn-draft').textContent='Rotate placement · '+rotation*60+'°';};
$('expand-scene').onclick=e=>{e.preventDefault();const url=new URL(SCENE_TYPES[sceneType].expandedPath,location.origin);url.searchParams.set('preset',preset);url.searchParams.set('growth',customSettings.growthStage??3);url.searchParams.set('seed',seed);url.searchParams.set('vegetation',customSettings.vegetation);url.searchParams.set('props',customSettings.props);url.searchParams.set('rotation',rotation);const popup=window.open(url,'_blank','popup,width=1200,height=850');if(!popup)status('Allow pop-up windows to open this generator');};
function armDraft(dragging=false){if(busy||!draft)throw Error('Wait for the preview');if(draft.resolvedPlan.warnings.length)throw Error('Choose a new variation: '+draft.resolvedPlan.warnings.join('; '));activeCard=createCard({...draft,name:$('card-name').value.trim()||presetSet()[preset].name});selected=null;setMode('place');showDeck(false);if(innerWidth<800&&!dragging){$('create-drawer').hidden=true;$('drawer-toggle').setAttribute('aria-expanded','false');}status('Choose a hex to place this scene');}
$('place-draft').onclick=()=>{try{armDraft();}catch(e){status(e.message);}};
let cardPointer=null;
const trayCursor=$('tray-cursor');

let liveTray=null,liveTrayFrame=0,liveTrayTime=0;
function endLiveTray(){cancelAnimationFrame(liveTrayFrame);if(!liveTray)return;scene.remove(liveTray.group);liveTray.group.traverse(o=>{if(o.userData.dragGeometry)o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});liveTray=null;renderer.shadowMap.needsUpdate=true;render();}
function moveLiveTray(e){
 if(!activeCard||!draft)return;
 if(!liveTray){const group=preview.clone(true);group.visible=true;group.traverse(o=>{if(o.material)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});scene.add(group);liveTray={group,records:collectInertia(group)};liveTrayTime=performance.now();liveTrayFrame=requestAnimationFrame(animateLiveTray);}
 const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
 const h=hit(e),point=h.point||ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-orbit.target.y),new T.Vector3());
 if(point)liveTray.group.position.set(point.x,point.y+2,point.z);
 liveTray.group.rotation.y=rotation*Math.PI/3;renderer.shadowMap.needsUpdate=true;render();
}
function animateLiveTray(now){if(!liveTray)return;const dt=Math.max(0,Math.min(.05,(now-liveTrayTime)/1000));liveTrayTime=now;stepElastic(liveTray.records,dt,{trackTransforms:true,enabled:glassEnabled,radius:R*S*.13,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches});renderer.shadowMap.needsUpdate=true;render();liveTrayFrame=requestAnimationFrame(animateLiveTray);}
window.addEventListener('blur',()=>{endLiveTray();cancelLoadedTrayDrag();});

function finishTray(){endLiveTray();cardPointer=null;trayCursor.hidden=true;orbit.enabled=true;hover(null);}
function moveTray(e){moveLiveTray(e);trayCursor.style.left=e.clientX+'px';trayCursor.style.top=e.clientY+'px';const cell=document.elementFromPoint(e.clientX,e.clientY)===canvas?hit(e).cell:null;hover(cell);let valid=false;if(cell)try{const candidate=placement(cell);validateFootprints(candidate);if(compactBoard&&candidate.instances.some(i=>instanceCells(i,candidate.cards[cardKey(i.cardId,i.cardRevision)]).some(c=>!BOARD_CELLS.some(b=>b.q===c.q&&b.r===c.r))))throw Error('Scene exceeds this board');valid=true;}catch{}trayCursor.hidden=!!liveTray;trayCursor.dataset.valid=String(valid);trayCursor.querySelector('span').textContent=valid?'Release to place':cell?'Scene does not fit here':'Move onto the board';}

$('draft-image').draggable=false;
$('draft-thumbnail').addEventListener('dragstart',e=>e.preventDefault());
$('draft-thumbnail').addEventListener('pointerdown',e=>{if(e.button!==0||cardPointer!==null)return;try{armDraft(true);$('create-panel').hidden=false;cardPointer=e.pointerId;orbit.enabled=false;$('draft-thumbnail').setPointerCapture(e.pointerId);trayCursor.querySelector('img').src=$('draft-image').src;trayCursor.hidden=false;moveTray(e);e.preventDefault();}catch(error){finishTray();status(error.message);}});
$('draft-thumbnail').addEventListener('pointermove',e=>{if(cardPointer===e.pointerId){moveTray(e);e.preventDefault();}});
$('draft-thumbnail').addEventListener('pointerup',async e=>{if(cardPointer!==e.pointerId)return;const cell=document.elementFromPoint(e.clientX,e.clientY)===canvas?hit(e).cell:null;finishTray();if(cell){const id=crypto.randomUUID();await commitDrop(cell,id);if(board.instances.some(i=>i.instanceId===id)){activeCard=null;selected=id;}}else activeCard=null;setMode(expanded?'place':'create');syncInstanceControls();});
function cancelTray(){if(cardPointer===null)return;finishTray();activeCard=null;setMode('create');}
$('draft-thumbnail').addEventListener('pointercancel',cancelTray);
$('draft-thumbnail').addEventListener('lostpointercapture',cancelTray);
window.addEventListener('blur',cancelTray);window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelTray();});

window.addEventListener('focus',()=>refreshDeck().catch(e=>status(e.message)));

if(expanded){const query=new URLSearchParams(location.search);const stage=Number(query.get('growth'));if(query.has('growth')&&Number.isInteger(stage)&&stage>=0&&stage<=3)customSettings.growthStage=stage;const turn=Number(query.get('rotation'));if(Number.isInteger(turn)&&turn>=0&&turn<=5)rotation=turn;$('turn-draft').textContent='Rotate placement · '+rotation*60+'°';if(SCENE_TYPES[sceneType].presets.includes(query.get('preset')))preset=query.get('preset');const n=Number(query.get('seed'));if(Number.isInteger(n)&&n>0&&n<=4294967295)seed=n;for(const key of ['vegetation','props'])if(query.has(key)){const n=Number(query.get(key));if(Number.isInteger(n)&&n>=0&&n<=(key==='props'?1:3))customSettings[key]=n;}$('scene-greenery').value=customSettings.vegetation;$('greenery-value').textContent=customSettings.vegetation;$('draft-props').value=customSettings.props;}
updateSceneControls();$('card-name').value=presetSet()[preset].name;
$('variation').onclick=()=>{seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;$('draft-seed').value=seed;generate();};
async function saveDraft(name){if(!draft||busy)throw Error('Composition is not ready');if(draft.resolvedPlan.warnings.length)throw Error('Choose a new variation: '+draft.resolvedPlan.warnings.join('; '));setBusy(true);try{const card=createCard({...draft,name:name?.trim()||$('card-name').value.trim()||presetSet()[preset].name,type:draft.type});await saveCard(card);actionRevision++;const warnings=[];try{await refreshDeck();}catch(error){deck=[card,...deck.filter(c=>c.id!==card.id||c.revision!==card.revision)];warnings.push('Card saved; deck refresh failed: '+error.message);}activeCard=card;selected=null;if(!expanded){setMode('place');showDeck(true);}$('selection-name').textContent=card.name;status('Saved to deck · this browser');return {cardId:card.id,cardRevision:card.revision,persisted:true,storageScope:'this-browser',warnings};}finally{setBusy(false);if(typeof syncEditorContract==='function')syncEditorContract();if(typeof updateMicrocosm==='function'&&$('microcosm-panel'))updateMicrocosm();}}
$('save-card').onclick=()=>saveDraft().catch(e=>status(e.message));
$('rotate').onclick=()=>{if(selected)commit('rotate',{instanceId:selected});else{rotation=(rotation+1)%6;hover(target);status('Placement rotation '+rotation*60+'°');}};
$('remove').onclick=()=>{if(selected)removeWithPop(selected);};
async function navigateHistory(type){if(busy)throw Error('Board is busy');if(villageRunning)runVillage(false);const previousId=board.id,next=history.peek(type),visual=await rebuild(next,{allowUnwalkable:true});history.accept(type,next);if(!board.instances.some(i=>i.instanceId===selected)){selected=null;$('selection-name').textContent='Choose a composition';}if(previousId!==board.id&&board.settlement)focusSettlement();setBusy(true);try{const saved=await persistCurrent();return {revision:next.revision,...saved,warnings:[...visual.warnings,...saved.warnings]};}finally{setBusy(false);if(mode==='life')refreshLife();}}
for(const type of ['undo','redo'])$(type).onclick=()=>navigateHistory(type).catch(e=>status(e.message));
$('fit-board').onclick=()=>{if(expanded&&mode==='create'){fit(true);return;}if(mode==='create')setMode('place');fit();};$('fit-selection').onclick=()=>fit(true,true);
window.addEventListener('ranch-layout',()=>render());
window.addEventListener('keydown',e=>{if(e.key==='Escape'){motion.settle();cancelPull();activeCard=null;selected=null;syncInstanceControls();hover(null);}});
window.RanchView?.register('board',()=>({id:board.id,revision:board.revision,region:board.region,terrainSettings:board.terrain,grid:{columns:compactBoard?3:10,rows:compactBoard?3:10,cells:BOARD_CELLS.length,tileMetrics:TILE_METRICS},settlement:board.settlement||null,mode,busy,seed,preset,sceneType,selectedInstanceId:selected,selectedRecipe:selectedCard()?.recipe||null,tileControls:TILE_CONTROLS,deck:deck.map(c=>({id:c.id,revision:c.revision,name:c.name})),instances:board.instances,adaptation:{links:assembly.links,warnings:assembly.warnings},terrain:'continuous world-space hills and valley; level working pads',motion:motion.state(),storage:'this-browser',persisted,storageDiagnostic:getStorageDiagnostics().attempts.at(-1)||null,camera:camera.position.toArray()}));
const schema=(properties={},required=[])=>({type:'object',properties,required}),str={type:'string'},integer={type:'integer'};
async function actionCommit(action,args){const result=await commit(action,args);if(result?.error)throw Error(result.error);return result;}
window.RanchActions?.register('board',{
 revision:()=>actionRevision+board.revision,read:()=>({boardId:board.id,boardRevision:board.revision,region:board.region,terrain:board.terrain,settlement:board.settlement||null,instances:structuredClone(board.instances),deck:deck.map(c=>({id:c.id,name:c.name,revision:c.revision})),mode,sceneType,sceneTypes:SCENE_TYPES,selectedInstanceId:selected,selectedRecipe:selectedCard()?.recipe||null,tileControls:TILE_CONTROLS,preset,seed,busy,persisted,warnings:assembly.warnings}),unavailable:()=>busy?'Board is busy':null,
 actions:{
 storageProbe:{description:'Run once per page: tiny insert, equal-size overwrite and two-store transaction in a new diagnostic database; stop on first failure, read back, retain records, never touch Board storage',schema:schema(),run:()=>runStorageProbe()},
 exportSnapshot:{description:'Export the current Board state with references to this browser�s saved card revisions; no geometry or writes',readOnly:true,schema:schema(),run:()=>({format:'ranch-board-references-v1',storageScope:'this-browser',requiresSavedCardRevisions:true,persisted,board:structuredClone({...board,cards:Object.fromEntries(Object.entries(board.cards).map(([key,c])=>[key,{libraryRef:key,id:c.id,revision:c.revision}]))})})},
 storageInspect:{description:'Read bounded storage failure metadata without writing cards or changing the Board',readOnly:true,schema:schema({envelopes:{type:'boolean'}}),run:async args=>({boardId:board.id,committedBoardRevision:board.revision,actionCounter:actionRevision,persisted,environment:await inspectStorageEnvironment(),...getStorageDiagnostics(),...(args.envelopes?{envelopes:await inspectStorageEnvelopes({limit:100})}:{})})},
 newVillage:{description:'Load a settlement preset using saved scene cards; undo restores the previous board',schema:schema({preset:{type:'string',enum:Object.keys(SETTLEMENT_PRESETS)}}),run:args=>startVillage(args.preset||'hamlet')},
 villageInspect:{description:'Inspect verified access, production and goals',readOnly:true,schema:schema(),run:()=>refreshLife()},
 advanceDay:{description:'Advance the village by one day',schema:schema(),run:()=>villageEdit('day')},
 startingSupplies:{description:'Allocate this board’s finite 30-clay reserve once',schema:schema(),run:()=>villageEdit('supplies')},
 claimGoal:{description:'Claim a ready societal goal once',schema:schema({goalId:{type:'string',enum:['housing','winter-reserve','shared-meal']}},['goalId']),run:args=>villageEdit('claim',args)},
 select:{description:'Select an existing tile and open its type-specific controls',schema:schema({instanceId:str},['instanceId']),run:args=>chooseInstance(args.instanceId)},
 reviseInstance:{description:'Reroll one instance or change its supported preset/seed in place; preserves the source card and other instances; undoable',schema:schema({instanceId:str,preset:str,seed:{type:'integer',minimum:1,maximum:4294967295}},['instanceId']),run:args=>reviseInstance(args)},
 inspect:{description:'Inspect saved cards, board and adapted connections',readOnly:true,schema:schema(),run:()=>({sceneTypes:SCENE_TYPES,boardId:board.id,revision:board.revision,instances:board.instances,deck:deck.map(c=>({id:c.id,name:c.name,revision:c.revision})),connections:assembly.links,warnings:assembly.warnings})},
 generate:{description:'Generate a scene from a semantic preset; inspect sceneTypes for supported presets',schema:schema({type:{type:'string',enum:Object.keys(SCENE_TYPES)},preset:{type:'string'},seed:{type:'integer',minimum:1,maximum:4294967295}},['preset']),run:async args=>{if(busy)throw Error('Board is busy');const type=args.type||'ranch';if(![...(SCENE_TYPES[type]?.presets||[]),...(SCENE_TYPES[type]?.legacy?.presets||[])].includes(args.preset))throw Error('Unknown preset for '+type);sceneType=type;preset=args.preset;updateSceneControls();seed=args.seed||crypto.getRandomValues(new Uint32Array(1))[0]||1;$('card-name').value=(presetSet()[preset]?.name||DOMESTIC_SCENES[type]?.presets[preset]);document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));setMode('create');const generated=await generate();if(!generated)throw Error($('board-status').textContent);return {sceneType,seed,preset,warnings:draft.resolvedPlan.warnings};}},
 saveCard:{description:'Save the resolved composition into this browser deck',schema:schema({name:str}),run:args=>saveDraft(args.name)},
 place:{description:'Place a saved composition at an axial grid cell',schema:schema({cardId:str,q:integer,r:integer,rotation:{type:'integer',minimum:0,maximum:5}},['cardId','q','r']),run:async args=>{const summary=deck.find(c=>c.id===args.cardId);if(!summary)throw Error('Saved card not found');const card=await getCard(summary.id,summary.revision);if(!card)throw Error('Saved card not found');setMode('place');const instanceId=crypto.randomUUID();const result=await actionCommit('place',{card,newInstanceId:instanceId,q:args.q,r:args.r,rotation:args.rotation||0});selected=instanceId;return {...result,instanceId};}},
 move:{description:'Move a composition and adapt neighboring layouts',schema:schema({instanceId:str,q:integer,r:integer},['instanceId','q','r']),run:args=>actionCommit('move',args)},
 rotate:{description:'Rotate a composition by sixty degrees',schema:schema({instanceId:str},['instanceId']),run:args=>actionCommit('rotate',args)},
 remove:{description:'Remove a board instance while retaining its deck card',schema:schema({instanceId:str},['instanceId']),run:args=>actionCommit('remove',args)},
 fit:{description:'Frame the full landscape or selected composition',schema:schema({close:{type:'boolean'}}),run:args=>{fit(!!args.close);return {camera:camera.position.toArray()};}},
 save:{description:'Persist the board with pinned card revisions',schema:schema(),run:async()=>{const saved=await saveBoard(board);persisted=true;$('retry-save').hidden=true;return {revision:board.revision,...saved};}},
 undo:{description:'Undo the last committed composition edit',schema:schema(),run:()=>navigateHistory('undo')},
 redo:{description:'Redo a composition edit',schema:schema(),run:()=>navigateHistory('redo')}
 }});
try{setBusy(true);assetIndex={...await (await fetch('/domestic-assets/index.json')).json(),...await (await fetch('/coastal-assets/index.json')).json()};composer=await createRanchComposer();await refreshDeck();await rebuild(board,{animate:false,allowUnwalkable:true});setMode('create');if(!terrainEditor&&!expanded&&board.instances.length){if(board.settlement)focusSettlement();else fit(true,true);}}catch(e){setBusy(false);status('Could not open Board: '+e.message);console.error(e);}

// Town Life belongs to the Town composition and each placed instance.
const townPanel=document.createElement('section');townPanel.id='town-tile-life';townPanel.style.cssText='padding:12px;border-top:1px solid #c8cdbb;display:grid;gap:8px';
townPanel.innerHTML='<h3>Town Life</h3><button id="town-show-board">Show placed towns</button><button id="town-show-preview">Back to preset preview</button><p id="town-life-context"></p><output id="town-life-clock"></output><div><button id="town-life-run">Pause town</button> <button id="town-life-hour">Advance hour</button></div><p id="town-life-counts"></p><details><summary>Households, workplaces & civic life</summary><div id="town-life-households"></div><div id="town-life-businesses"></div><button id="town-life-injury">Try walkway injury</button><p id="town-life-cases"></p><p id="town-life-ledger"></p></details><small>Outside supplies cover shortages. Each placed Town runs its own household economy.</small>';
$('create-drawer').append(townPanel);let townRunning=!matchMedia('(prefers-reduced-motion: reduce)').matches,townElapsed=0,townLast=0,townUIElapsed=0,townWorking=false;
function activeTown(){const i=board.instances.find(i=>i.instanceId===selected),c=i&&board.cards[cardKey(i.cardId,i.cardRevision)];if(c?.type==='town')return {id:i.instanceId,card:c,state:townState(c,i)};if(draft?.type==='town')return {id:null,card:draft,state:draft.recipe.townLife};return null;}
let lastTownPanelState,lastTownPanelKey;
function refreshTownPanel(){const a=activeTown();const key=JSON.stringify([a?.id,busy,townWorking,townRunning]);if(a?.state===lastTownPanelState&&key===lastTownPanelKey)return;lastTownPanelState=a?.state;lastTownPanelKey=key;townPanel.hidden=!a;if(!a){townPanel.style.display='none';return;}townPanel.style.display='grid';const state=a.state;$('town-life-context').textContent=a.id?'Selected Town tile · '+a.card.name:'Town preset preview · '+presetSet('town')[a.card.recipe.preset].name;$('town-life-clock').textContent=`Day ${state.day} · ${String(state.hour).padStart(2,'0')}:00`;$('town-life-run').textContent=townRunning?'Pause town':'Run town';$('town-life-hour').disabled=busy||townWorking;$('town-life-counts').textContent=`${state.households.length} households · ${state.households.reduce((n,h)=>n+h.adults+h.children,0)} residents · ${state.transactions} trades · ${state.meals} meals`;
 const homes=$('town-life-households');homes.replaceChildren();for(const h of state.households){const p=document.createElement('p');p.textContent=`${h.name}: ${h.cash} credits · ${h.food} food · ${routine(state,h,0).text}`;homes.append(p);}
 const jobs=$('town-life-businesses');jobs.replaceChildren();for(const b of state.businesses){const btn=document.createElement('button');btn.textContent=b.label+' · '+(b.open?'Open':'Closed');btn.setAttribute('aria-pressed',String(b.open));btn.disabled=busy||townWorking;btn.onclick=()=>changeTown(s=>toggleBusiness(s,b.id));jobs.append(btn);}
 $('town-life-injury').disabled=busy||townWorking;$('town-life-cases').textContent=state.cases?.at(-1)?.history.at(-1)||'No civic incident.';$('town-life-ledger').textContent=state.ledger.slice(0,4).map(r=>`${r.from} → ${r.to}: ${r.quantity} ${r.good}`).join(' · ');
}
async function changeTown(transform){if(busy||townWorking)return;const a=activeTown();if(!a)return;townWorking=true;try{const nextState=transform(a.state);if(a.id){const next={...board,revision:board.revision+1,instances:board.instances.map(i=>i.instanceId===a.id?{...i,townLife:nextState}:i)};history.commit(next);board=next;await persistCurrent();syncInstanceControls();}else draft.recipe.townLife=nextState;actionRevision++;window.RanchView?.changed();}catch(e){status(e.message);}finally{townWorking=false;refreshTownPanel();}}
$('town-show-board').onclick=()=>{const i=board.instances.find(i=>board.cards[cardKey(i.cardId,i.cardRevision)]?.type==='town');if(i)chooseInstance(i.instanceId);else {setMode('place');status('No Town placed yet. Use Place on board, then choose a hex.');}};$('town-show-preview').onclick=()=>{selected=null;setMode('create');};
$('town-life-run').onclick=()=>{townRunning=!townRunning;townElapsed=0;refreshTownPanel();};$('town-life-hour').onclick=()=>changeTown(advanceHour);$('town-life-injury').onclick=()=>changeTown(s=>addIncident(s,'injury'));
async function advanceVisibleTowns(){if(busy||townWorking)return;townWorking=true;try{if(preview.visible&&draft?.type==='town')draft.recipe.townLife=advanceHour(draft.recipe.townLife);let next=board;for(const i of board.instances){const c=board.cards[cardKey(i.cardId,i.cardRevision)];if(c?.type==='town'&&[...pieces.values()].some(g=>g.visible&&g.userData.instanceId===i.instanceId))next=stepTownInstance(next,i.instanceId);}if(next!==board){history.commit(next);board=next;await persistCurrent();}actionRevision++;}catch(e){townRunning=false;status(e.message);}finally{townWorking=false;refreshTownPanel();}}
function townFrame(ms){const dt=Math.min(.1,(ms-townLast)/1000||0);townLast=ms;let changed=false;if(!busy&&!document.hidden&&townRunning){if(preview.visible)for(const g of preview.children)changed=animateTown(g,dt)||changed;for(const g of pieces.values())if(g.visible)changed=animateTown(g,dt)||changed;if(changed){townElapsed+=dt;if(townElapsed>=8){townElapsed=0;advanceVisibleTowns();}render();}}townUIElapsed+=dt;if(townUIElapsed>.5){townUIElapsed=0;refreshTownPanel();refreshDashboard();}requestAnimationFrame(townFrame);}
refreshTownPanel();requestAnimationFrame(townFrame);

function refreshDashboard(){
 const panel=$('tile-dashboard');if(!panel)return;const i=board.instances.find(i=>i.instanceId===selected),card=i&&board.cards[cardKey(i.cardId,i.cardRevision)];panel.hidden=!card;document.body.classList.toggle('tile-selected',!!card);if(!card)return;
 const data=dashboardData(card,i,card.type==='town'?townState(card,i):null),key=JSON.stringify([selected,card.name,data]);if(panel.dataset.value===key)return;panel.dataset.value=key;panel.replaceChildren();const title=document.createElement('h2');title.textContent=card.name;panel.append(title);const badge=document.createElement('small');badge.textContent=data.kind||(data.live?'Live households':'Layout');panel.append(badge);const grid=document.createElement('div');grid.className='gauges';
 for(const m of data.metrics){const el=document.createElement('div');el.className='gauge';const value=document.createElement('strong');value.textContent=m.value;const label=document.createElement('span');label.textContent=m.label;el.append(value,label);if(m.ratio!==undefined){const meter=document.createElement('meter');meter.min=0;meter.max=1;meter.value=m.ratio;meter.setAttribute('aria-label',m.label);el.append(meter);}grid.append(el);}panel.append(grid);
 if(data.bars){const chart=document.createElement('div');chart.className='mini-bars';chart.setAttribute('aria-label','Market stock');for(const [label,value]of data.bars){const bar=document.createElement('div');bar.innerHTML='<i></i><b></b><span></span>';bar.querySelector('i').style.height=(4+Math.min(1,value/Math.max(1,...data.bars.map(b=>b[1])))*48)+'px';bar.querySelector('b').textContent=value;bar.querySelector('span').textContent=label;chart.append(bar);}panel.append(chart);}
 const close=document.createElement('button');close.textContent='Compose';close.onclick=()=>{selected=null;syncInstanceControls();};const remove=document.createElement('button');remove.textContent='Rip up';remove.disabled=busy;remove.onclick=()=>{if(!busy)removeWithPop(selected);};panel.append(close,remove);if(data.kind){const step=document.createElement('button');step.textContent='Advance paths';step.onclick=()=>{stepSpatial(10);syncInstanceControls();};panel.append(step);}
}

// The same microcosm panel follows preview and placed selection across all families.
const microPanel=document.createElement('section');microPanel.id='microcosm-panel';microPanel.innerHTML='<h3>Microcosm</h3><p id="microcosm-story"></p><div id="microcosm-metrics" class="gauges"></div><p id="microcosm-scope"></p><div id="microcosm-activity"><button id="microcosm-run">Pause paths</button><button id="microcosm-step">Advance paths</button></div><div id="microcosm-growth"><label for="town-growth">Settlement growth</label><select id="town-growth"><option value="0">First households</option><option value="1">A small hamlet</option><option value="2">Neighbors arrive</option><option value="3" selected>Established town</option></select><button id="town-grow">Grow one season</button></div><button id="microcosm-variation">Explore another seed</button>';
$('create-panel').insertBefore(microPanel,$('presets').nextSibling);let spatialRunning=!matchMedia('(prefers-reduced-motion: reduce)').matches,spatialLast=0,spatialUI=0;
function activeMicrocosm(){const i=board.instances.find(i=>i.instanceId===selected),card=i&&board.cards[cardKey(i.cardId,i.cardRevision)];return {i,card:card||draft,plans:card?assembly.plans.filter(p=>p.id.startsWith(i.instanceId+':')):draft?.resolvedPlan.plans||[]};}
function updateMicrocosm(){const {i,card,plans}=activeMicrocosm();if(!card)return;const town=card.type==='town',data=spatialReadout(plans),state=i?.microcosm||card.recipe.microcosm||spatialState(),growth=card.recipe.growthStage??3;microPanel.hidden=false;$('microcosm-story').textContent=town?TOWN_LAYOUTS[card.recipe.preset]?.inspiration||'Town life':(SCENE_DEFINITIONS[card.type]?.purpose||'Household ranch life, routes and shared working space.');$('microcosm-scope').textContent=town?'Live households, work, school and trade · paths and gentle terrain grow together.':'Live path activity · spatial layout and visits are simulated here. Production follows each scene’s implemented systems; these counts do not invent an economy.';const metrics=[['Places',data.sites],['Paths',data.routes],['Path metres',data.metres],...(town?[['Households',townState(card,i).households.length]]:[['Walked metres',Math.floor(state.metres)],['Visits',state.trips]])];$('microcosm-metrics').replaceChildren(...metrics.map(([label,value])=>{const el=document.createElement('div');el.className='gauge';const strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=value;small.textContent=label;el.append(strong,small);return el;}));$('microcosm-activity').hidden=town;$('microcosm-growth').hidden=!town||!!i;$('town-growth').value=String(growth);$('town-grow').disabled=busy||growth>=3;$('microcosm-variation').hidden=!!i;$('microcosm-run').textContent=spatialRunning?'Pause paths':'Run paths';}
function stepSpatial(dt){if(busy)return;if(preview.visible&&draft?.type!=='town')for(const g of preview.children)animateSceneLife(g,dt);for(const g of pieces.values())if(g.visible)animateSceneLife(g,dt);render();}
$('microcosm-run').onclick=()=>{spatialRunning=!spatialRunning;updateMicrocosm();};$('microcosm-step').onclick=()=>{stepSpatial(10);updateMicrocosm();};
async function growTownStage(stage){if(busy)return;const old=draft?.type==='town'?structuredClone(draft.recipe.townLife):null;customSettings.growthStage=stage;if(await generate()){const fresh=draft.recipe.townLife;if(old&&fresh)draft.recipe.townLife={...fresh,...old,layoutVersion:fresh.layoutVersion,layoutSeed:fresh.layoutSeed,growthStage:fresh.growthStage,households:fresh.households.map((h,i)=>old.households[i]||h)};}updateMicrocosm();}
$('town-growth').onchange=()=>growTownStage(Number($('town-growth').value));$('town-grow').onclick=()=>growTownStage(Math.min(3,(draft?.recipe.growthStage??3)+1));$('microcosm-variation').onclick=async()=>{seed=(seed+7919)>>>0||1;await generate();updateSceneControls();updateMicrocosm();};
function spatialFrame(now){const dt=Math.min(.1,(now-spatialLast)/1000||0);spatialLast=now;if(spatialRunning)stepSpatial(dt);spatialUI+=dt;if(spatialUI>.5){spatialUI=0;updateMicrocosm();}requestAnimationFrame(spatialFrame);}requestAnimationFrame(spatialFrame);updateMicrocosm();
const sceneInfo={
 ranch:['Grow & make','🌾','Homesteads, livestock care and working pasture.'],garden:['Grow & make','🌱','Beds, orchards and farm plots.'],woodland:['Grow & make','🌲','Working clearings, timber and regrowth.'],pottery:['Grow & make','🏺','Clay yards, kilns and pottery workshops.'],preservation:['Grow & make','🫙','Root cellars, drying yards and food storage.'],seaside:['Places & landmarks','⛵','Coastal landings, salt yards and boat repair.'],home:['Daily life','🏡','Households, cooking and shared living space.'],animals:['Daily life','🐾','Animal shelters, feeding and companion care.'],gathering:['Daily life','🌳','Commons, shared meals and meeting places.'],market:['Daily life','🧺','Stalls, goods and local exchange.'],castle:['Places & landmarks','🏰','Fortified courtyards and landmark buildings.'],neighborhood:['Places & landmarks','🏘️','Homes around streets and shared courtyards.'],town:['Places & landmarks','🏫','Growing streets, homes, workplaces and civic life.']
};
let sceneCategory='All';
function drawSceneBrowser(){
 const query=$('scene-search').value.trim().toLowerCase(),wrap=$('scene-results');wrap.replaceChildren();
 for(const [id,s]of Object.entries(SCENE_TYPES)){
  const [category,icon,description]=sceneInfo[id]||['Daily life','⌂',SCENE_DEFINITIONS[id]?.purpose||'Explore this scene family.'];
  const names=Object.values(presetSet(id)).map(p=>p.name);
  if(sceneCategory!=='All'&&category!==sceneCategory||![s.label,description,...names].join(' ').toLowerCase().includes(query))continue;
  const button=document.createElement('button');button.className='scene-choice';button.dataset.scene=id;button.setAttribute('aria-pressed',String(id===sceneType));
  const illustration=document.createElement('span');illustration.className='scene-illustration';illustration.textContent=icon;illustration.setAttribute('aria-hidden','true');
  const title=document.createElement('strong');title.textContent=s.label;
  const desc=document.createElement('span');desc.textContent=description;
  const layouts=document.createElement('small');layouts.textContent=names.join(' · ');
  button.append(illustration,title,desc,layouts);button.disabled=busy;
  button.onclick=async()=>{if(busy)return;$('scene-browser').close();selected=null;sceneType=id;preset=s.presets[0];$('card-name').value=presetSet()[preset].name;updateSceneControls();setMode('create');await generate();$('scene-browser-open').focus();};wrap.append(button);
 }
 $('scene-result-count').textContent=wrap.children.length+' scene families'+(wrap.children.length?'':' · Try another search or category');
 for(const button of $('scene-categories').children)button.setAttribute('aria-pressed',String(button.textContent===sceneCategory));
}
for(const category of ['All','Grow & make','Daily life','Places & landmarks']){const button=document.createElement('button');button.textContent=category;button.onclick=()=>{sceneCategory=category;drawSceneBrowser();};$('scene-categories').append(button);}
$('scene-search').oninput=drawSceneBrowser;
$('scene-browser-open').onclick=()=>{drawSceneBrowser();$('scene-browser').showModal();};
if(!expanded&&!terrainEditor&&!board.region&&!board.instances.length)$('region-dialog').showModal();

// Both views share draft, recipe and simulation state; the board camera is kept
// separately so inspecting the draft never discards the player's board framing.

function syncEditorContract(){
 const contract=sceneEditor(sceneType);$('editor-title').textContent=contract.title;$('editor-description').textContent=contract.description;
 $('editor-layout-label').textContent=contract.closeup.layoutLabel;$('editor-vegetation-label').textContent=contract.closeup.vegetationLabel;
 $('editor-layout').replaceChildren(...Object.entries(presetSet()).map(([value,p])=>{const o=document.createElement('option');o.value=value;o.textContent=p.name;return o;}));$('editor-layout').value=preset;
 $('editor-vegetation').value=String(customSettings.vegetation);$('editor-props').checked=!!customSettings.props;
 $('editor-growth-wrap').hidden=!contract.closeup.controls.includes('growth');$('editor-growth').value=String(customSettings.growthStage??3);
 $('editor-variation-name').textContent='Variation '+seed;
 $('edit-closeup').disabled=busy||!draft;
 $('editor-return').hidden=!expanded;$('editor-place').hidden=!expanded;
 if(typeof syncWorkbench==='function')syncWorkbench();document.body.classList.toggle('scene-closeup',expanded);if(expanded){document.querySelector('.board-heading h1').textContent=presetSet()[preset]?.name||SCENE_TYPES[sceneType].label;$('board-summary').textContent='Draft · '+(draft?.cells.length||0)+' hexes';}else{$('fit-board').textContent='Whole board';document.title='Night of the Dead · Ranch Atelier';}
}
function captureBoardView(){return {position:camera.position.clone(),target:orbit.target.clone(),zoom:camera.zoom,view:camera.view?{...camera.view}:null,selected,mode,drawerHidden:$('create-drawer').hidden,framing:[closeFraming,detailFraming],width:host.clientWidth,height:host.clientHeight};}
function openSceneEditor(){
 if(busy||!draft)return;cancelClosePull();cancelPull();if(!expanded)boardViewMemory=captureBoardView();
 expanded=true;document.body.classList.remove('loaded-minimized');selected=null;activeCard=null;document.body.classList.add('expanded-scene','scene-closeup');$('create-drawer').hidden=false;$('create-drawer').scrollTop=0;
 setMode('create');syncEditorContract();status('Grab the scene and pull · Release to spring back');
}
function returnToBoard({placing=false}={}){
 if(busy)return;cancelClosePull();expanded=false;document.body.classList.remove('expanded-scene');document.body.classList.remove('scene-closeup');
 if(location.pathname.startsWith('/sandbox/')||location.pathname.startsWith('/tile-generator'))window.history.replaceState(null,'','/sandbox');
 const saved=boardViewMemory;boardViewMemory=null;selected=placing?null:saved?.selected||null;setMode(saved?.mode||'create');
 $('board-summary').textContent=`100 hexes · ${board.instances.length} compositions`;document.querySelector('.board-heading h1').textContent=board.region?.name||board.settlement?.label||'Room to grow.';
 if(saved){$('create-drawer').hidden=saved.drawerHidden;[closeFraming,detailFraming]=saved.framing;if(saved.width===host.clientWidth&&saved.height===host.clientHeight){camera.position.copy(saved.position);camera.zoom=saved.zoom;camera.view=saved.view?{...saved.view}:null;camera.updateProjectionMatrix();orbit.target.copy(saved.target);orbit.update();}else fit(...saved.framing);}
 syncEditorContract();render();status('Draft ready in the tray');
}
$('edit-closeup').onclick=openSceneEditor;$('expand-scene').onclick=e=>{e.preventDefault();openSceneEditor();};$('editor-return').onclick=()=>returnToBoard();
$('editor-place').onclick=()=>{returnToBoard({placing:true});try{armDraft();}catch(error){status(error.message);}};
$('editor-layout').onchange=()=>{if(busy)return;cancelClosePull();preset=$('editor-layout').value;$('card-name').value=presetSet()[preset].name;updateSceneControls();generate();};
$('editor-reroll').onclick=()=>{if(busy)return;cancelClosePull();seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;generate();};
$('editor-vegetation').onchange=()=>{if(busy)return;cancelClosePull();customSettings.vegetation=Number($('editor-vegetation').value);$('scene-greenery').value=String(customSettings.vegetation);$('greenery-value').textContent=String(customSettings.vegetation);generate();};
$('editor-props').onchange=()=>{if(busy)return;cancelClosePull();customSettings.props=Number($('editor-props').checked);$('draft-props').value=String(customSettings.props);generate();};
$('editor-growth').onchange=()=>{if(busy)return;cancelClosePull();growTownStage(Number($('editor-growth').value));};
function resetClosePose(){preview.position.set(0,0,0);preview.rotation.set(0,0,0);preview.scale.set(1,1,1);renderer.shadowMap.needsUpdate=true;render();}
function cancelClosePull(){cancelAnimationFrame(closeSpring);closeSpring=0;const old=closePull;closePull=null;if(old&&canvas.hasPointerCapture(old.pointer))canvas.releasePointerCapture(old.pointer);orbit.enabled=true;canvas.style.cursor='';$('pull-hint').hidden=true;resetClosePose();}
function releaseClosePull(){
 if(!closePull)return;const start={p:preview.position.clone(),r:preview.rotation.z,s:preview.scale.y},pointer=closePull.pointer;closePull=null;if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer);orbit.enabled=true;canvas.style.cursor='';$('pull-hint').hidden=true;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){resetClosePose();return;}
 const began=performance.now();function frame(now){const t=Math.min(1,(now-began)/420),spring=Math.exp(-6*t)*Math.cos(t*10)*(1-t);preview.position.copy(start.p).multiplyScalar(spring);preview.rotation.z=start.r*spring;preview.scale.set(1,1+(start.s-1)*spring,1);renderer.shadowMap.needsUpdate=true;render();if(t<1)closeSpring=requestAnimationFrame(frame);else{closeSpring=0;resetClosePose();}}closeSpring=requestAnimationFrame(frame);
}
canvas.addEventListener('pointerdown',e=>{
 if(!expanded||mode!=='create'||busy||orbitMode||cameraOwnsPointer(e))return;
 const rect=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
 if(!ray.intersectObject(preview,true).length)return;
 e.preventDefault();e.stopImmediatePropagation();cancelClosePull();camera.updateMatrixWorld();
 closePull={pointer:e.pointerId,x:e.clientX,y:e.clientY,right:new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up:new T.Vector3().setFromMatrixColumn(camera.matrixWorld,1),scale:2*camera.position.distanceTo(orbit.target)*Math.tan(camera.fov*Math.PI/360)/rect.height};
 orbit.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';$('pull-hint').textContent='Let go to spring back';$('pull-hint').hidden=false;
},true);
canvas.addEventListener('pointermove',e=>{if(!closePull||e.pointerId!==closePull.pointer)return;e.preventDefault();e.stopImmediatePropagation();const p=pullPose(e.clientX-closePull.x,e.clientY-closePull.y,closePull.scale,matchMedia('(prefers-reduced-motion: reduce)').matches);preview.position.copy(closePull.right).multiplyScalar(p.x).addScaledVector(closePull.up,p.y);preview.rotation.z=-p.tilt;preview.scale.set(1,p.stretch,1);renderer.shadowMap.needsUpdate=true;render();},true);
canvas.addEventListener('pointerup',e=>{if(closePull?.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();releaseClosePull();},true);
canvas.addEventListener('pointercancel',()=>{if(closePull)cancelClosePull();},true);canvas.addEventListener('lostpointercapture',()=>{if(closePull)cancelClosePull();});window.addEventListener('blur',()=>{if(closePull||closeSpring)cancelClosePull();});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&(closePull||closeSpring))cancelClosePull();});
syncEditorContract();

$('board-view').onclick=()=>{if(expanded)returnToBoard();else {selected=null;activeCard=null;setMode('place');}};

// Horizontal workbench. All preview art is rendered from the same recipes used
// by placement. Background thumbnail work never replaces the player's draft.
const workbench=document.createElement('section');workbench.id='scene-workbench';
workbench.innerHTML='<div class="workbench-top"><div class="workbench-title"><small>MAKE A LITTLE WORLD</small><h2 id="workbench-name">Ranch</h2><p id="workbench-story"></p><div class="loaded-scene-actions"><span id="loaded-scene-label">Loaded scene</span><button id="workbench-settings">Scene settings</button><button id="workbench-toggle">Minimize closeup</button></div></div><div class="facet-section"><div class="facet-heading"><strong>Try a prefab</strong><span>Generated examples</span><button id="workbench-die" aria-label="Randomize the three prefab examples" title="Roll three new examples">⚄</button></div><div id="workbench-facets" aria-label="Generated prefab examples"></div></div><div id="workbench-placement"></div></div><div class="workbench-browser"><aside class="workbench-filters"><small>SCENES</small><button aria-pressed="true">All <span id="workbench-count"></span></button><span>Click to edit · drag to place</span></aside><div id="workbench-tray" tabindex="0" aria-label="Available scenes, scroll vertically"></div></div>';
workbenchReady=!terrainEditor;
let facetEpoch=0,facetSeed=seed,facetType='',facetsLoading=false,thumbnailQueue=[],thumbnailRunning=false;
const sceneThumbs=new Map();
if(workbenchReady){
 document.body.classList.add('horizontal-workbench');document.querySelector('main').append(workbench);
 $('workbench-placement').append($('draft-preview'));$('draft-thumbnail').querySelector('span').textContent='Drag this scene onto the board';
 $('workbench-count').textContent=Object.keys(SCENE_TYPES).length;
 $('workbench-settings').onclick=()=>{if(!expanded)restoreLoadedCloseup();$('create-drawer').hidden=!$('create-drawer').hidden;};
 $('workbench-toggle').onclick=()=>expanded?minimizeLoadedCloseup():restoreLoadedCloseup();
 $('workbench-die').onclick=()=>{if(busy||facetsLoading)return;facetSeed=crypto.getRandomValues(new Uint32Array(1))[0]||1;refreshFacets();};
 $('region-dialog').close();
 for(const [type,definition] of Object.entries(SCENE_TYPES)){
  const button=document.createElement('button');button.className='workbench-scene';button.title='Choose to place · drag onto the board';button.dataset.sceneType=type;button.setAttribute('aria-pressed',String(type===sceneType));
  const img=document.createElement('img');img.alt='';img.width=160;img.height=100;const name=document.createElement('strong');name.textContent=(sceneInfo[type]?.[1]||'⬡')+' '+definition.label;button.setAttribute('aria-label',definition.label);const desc=document.createElement('span');desc.textContent=sceneInfo[type]?.[2]||'Explore this scene';button.append(img,name,desc);
  button.onclick=async()=>{if(busy||performance.now()<(button._ignoreClickUntil||0))return;await b3Prepare(type).catch(e=>status(e.message));};
  wireSceneTrayDrag(button,type);
  $('workbench-tray').append(button);
 }
 // The tray remains in document order on phones and supports native swiping.
 $('place-draft').onclick=()=>{if(busy)return;minimizeLoadedCloseup();try{armDraft();$('create-drawer').hidden=true;render();}catch(error){status(error.message);}};
 $('draft-thumbnail').addEventListener('pointerdown',()=>{if(expanded&&!busy)minimizeLoadedCloseup();},true);
 $('edit-closeup').onclick=()=>{openSceneEditor();$('create-drawer').hidden=true;fit(true,true);};
 $('board-view').onclick=()=>expanded?minimizeLoadedCloseup():restoreLoadedCloseup();
 $('editor-return').textContent='Minimize closeup';$('editor-return').onclick=minimizeLoadedCloseup;
 const whole=document.createElement('button');whole.id='workbench-whole';whole.textContent='Whole scene';whole.onclick=()=>fit(true,false);$('editor-view-tools').append(whole);
 const closer=document.createElement('button');closer.textContent='Get closer';closer.onclick=()=>fit(true,true);$('editor-view-tools').append(closer);
 if(draft){$('draft-image').src=renderWorkbenchArt(preview);$('create-drawer').hidden=true;}
 for(const type of Object.keys(SCENE_TYPES))queueThumbnail(type);
}
function syncWorkbench(){
 if(typeof workbenchReady==='undefined'||!workbenchReady)return;
 $('workbench-name').textContent=SCENE_TYPES[sceneType].label;$('workbench-story').textContent=sceneInfo[sceneType]?.[2]||'';
 for(const el of $('workbench-tray').children){el.setAttribute('aria-pressed',String(el.dataset.sceneType===sceneType));el.disabled=busy&&!loadedTrayDrag;}
 rememberLoadedScene();$('workbench-toggle').textContent=expanded?'Minimize closeup':'Open closeup';$('workbench-toggle').disabled=busy;$('loaded-scene-label').textContent='Loaded · '+(presetSet()[preset]?.name||SCENE_TYPES[sceneType].label);
 $('workbench-die').disabled=busy||facetsLoading;
 if(draft&&draft.type===sceneType){const img=renderWorkbenchArt(preview);$('draft-image').src=img;sceneThumbs.set(sceneType,img);const tile=$('workbench-tray').querySelector(`[data-scene-type="${sceneType}"] img`);if(tile)tile.src=img;}
 for(const b of $('workbench-facets').children)b.disabled=busy||facetsLoading;
}
function renderWorkbenchArt(group){
 const shot=new T.Scene();shot.add(new T.HemisphereLight('#b6cfdd','#242c27',1.9));const light=new T.DirectionalLight('#dbe8ff',2.2);light.position.set(-45,90,50);shot.add(light);
 const parent=group.parent,visible=group.visible,oldTarget=renderer.getRenderTarget(),clear=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha();group.visible=true;shot.add(group);
 try{const box=new T.Box3().setFromObject(group),details=new T.Box3();group.traverse(o=>{const key=o.userData.motionKey;if(key&&!/dressing|tree|vegetation|ground|terrain/i.test(key))details.union(new T.Box3().setFromObject(o));});const center=(details.isEmpty()?box:details).getCenter(new T.Vector3()),radius=box.getSize(new T.Vector3()).length()*.14;const cam=new T.PerspectiveCamera(38,1.6,.1,1600);cam.position.copy(center).add(new T.Vector3(.65,.78,1.2).normalize().multiplyScalar(radius/Math.sin(19*Math.PI/180)*1.02));cam.lookAt(center);renderer.setClearColor('#e7ecde',0);renderer.setRenderTarget(thumbnailTarget);renderer.render(shot,cam);renderer.readRenderTargetPixels(thumbnailTarget,0,0,320,200,thumbnailPixels);const ctx=thumbnailCanvas.getContext('2d'),image=ctx.createImageData(320,200);for(let y=0;y<200;y++)image.data.set(thumbnailPixels.subarray((199-y)*1280,(200-y)*1280),y*1280);ctx.putImageData(image,0,0);let x0=320,y0=200,x1=0,y1=0;for(let y=0;y<200;y++)for(let x=0;x<320;x++)if(image.data[(y*320+x)*4+3]>20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}const cropped=document.createElement('canvas');cropped.width=320;cropped.height=200;const out=cropped.getContext('2d'),w=x1-x0+1,h=y1-y0+1;if(w>0&&h>0){const scale=Math.min(300/w,180/h);out.drawImage(thumbnailCanvas,x0,y0,w,h,(320-w*scale)/2,(200-h*scale)/2,w*scale,h*scale);}return cropped.toDataURL('image/png');}
 finally{shot.remove(group);parent?.add(group);group.visible=visible;renderer.setClearColor(clear,alpha);renderer.setRenderTarget(oldTarget);render();}
}
async function refreshFacets(){
 const epoch=++facetEpoch,type=sceneType;facetType=type;facetsLoading=true;syncWorkbench();const requests=facetRequests(type,presetSet(type),facetSeed,customSettings),wrap=$('workbench-facets');wrap.replaceChildren();
 for(const [i,request] of requests.entries()){
  const button=document.createElement('button');button.className='prefab-facet';button.disabled=true;button.innerHTML='<span class="facet-number"></span><img alt=""><strong></strong><small>Growing an example…</small>';
  button.querySelector('.facet-number').textContent=String(i+1).padStart(2,'0');button.querySelector('strong').textContent=presetSet(type)[request.chosen].name;wrap.append(button);
  button.onclick=async()=>{if(busy)return;sceneType=request.type;preset=request.chosen;seed=request.variation;customSettings={...request.settings};$('card-name').value=presetSet()[preset].name;updateSceneControls();if(await generate()){openSceneEditor();$('create-drawer').hidden=true;fit(true,true);for(const b of wrap.children)b.setAttribute('aria-pressed',String(b===button));}};
  try{const built=await composeDraft(request);try{if(epoch!==facetEpoch)return;button.querySelector('img').src=renderWorkbenchArt(built.group);button.querySelector('img').alt='Generated '+presetSet(type)[request.chosen].name+' example';button.querySelector('small').textContent=type==='town'?['First households','Small hamlet','Established town'][i]:built.draft.cells.length+' hex'+(built.draft.cells.length===1?'':'es')+' · variation '+request.variation;button.dataset.footprint=JSON.stringify(built.draft.cells);button.setAttribute('aria-pressed',String(preset===request.chosen&&seed===request.variation));}finally{dispose(built.group);}}catch(error){button.querySelector('small').textContent='Could not generate · roll again';button.dataset.failed='true';}
 }
 if(epoch===facetEpoch){facetsLoading=false;syncWorkbench();for(const b of wrap.children)if(b.dataset.failed)b.disabled=true;}
}
function queueThumbnail(type){thumbnailQueue.push(type);if(!thumbnailRunning)drainThumbnails();}
async function drainThumbnails(){thumbnailRunning=true;while(thumbnailQueue.length){if(busy||facetsLoading){await new Promise(r=>setTimeout(r,150));continue;}const type=thumbnailQueue.shift(),img=$('workbench-tray').querySelector(`[data-scene-type="${type}"] img`);if(sceneThumbs.has(type)){img.src=sceneThumbs.get(type);continue;}try{const built=await composeDraft({type,chosen:SCENE_TYPES[type].presets[0],variation:41,settings:{vegetation:2,props:1}});try{const art=renderWorkbenchArt(built.group);sceneThumbs.set(type,art);img.src=art;}finally{dispose(built.group);}}catch{img.alt='Preview unavailable';}await new Promise(r=>setTimeout(r,30));}thumbnailRunning=false;}

function rememberLoadedScene(){
 if(!workbenchReady||busy||!draft||draft.type!==sceneType)return;
 sceneLoadouts.remember(sceneType,{chosen:draft.recipe.preset,variation:draft.recipe.seed,rotation,name:$('card-name').value.trim()||presetSet()[preset].name,settings:{...customSettings,...draft.recipe.landscape,...(draft.recipe.growthStage===undefined?{}:{growthStage:draft.recipe.growthStage}),generatedGrowth:!!draft.recipe.footprintGrowth}});
}
function minimizeLoadedCloseup(){
 if(busy)return;rememberLoadedScene();if(expanded)returnToBoard();
 document.body.classList.add('loaded-minimized');$('create-drawer').hidden=true;syncWorkbench();render();
}
function restoreLoadedCloseup(){if(busy||!draft)return;document.body.classList.remove('loaded-minimized');openSceneEditor();$('create-drawer').hidden=true;syncWorkbench();fit(true,true);if(facetType!==sceneType)refreshFacets();}
async function loadTrayScene(type,closeup=false){
 if(busy)return false;rememberLoadedScene();const changed=type!==sceneType;
 if(changed||!draft){const loaded=sceneLoadouts.get(type)||{chosen:SCENE_TYPES[type].presets[0],variation:41,rotation:0,settings:{vegetation:2,props:1,generatedGrowth:true}};sceneType=type;preset=loaded.chosen;seed=loaded.variation;rotation=loaded.rotation;customSettings={...loaded.settings};$('card-name').value=loaded.name||presetSet()[preset].name;$('turn-draft').textContent='Rotate placement · '+rotation*60+'°';updateSceneControls();if(!await generate())return false;}
 if(closeup){restoreLoadedCloseup();}else{$('create-drawer').hidden=true;render();syncWorkbench();}
 return true;
}
function wireSceneTrayDrag(button,type){
 button.querySelector('img').draggable=false;button.addEventListener('dragstart',e=>e.preventDefault());
 button.addEventListener('pointerdown',e=>{if(e.button!==0||busy||loadedTrayDrag)return;loadedTrayDrag={pointer:e.pointerId,button,type,x:e.clientX,y:e.clientY,last:{clientX:e.clientX,clientY:e.clientY},phase:'pending',cancelled:false};button.setPointerCapture(e.pointerId);});
 button.addEventListener('pointermove',e=>{
  const drag=loadedTrayDrag;if(!drag||drag.pointer!==e.pointerId)return;drag.last={clientX:e.clientX,clientY:e.clientY};
  if(drag.phase==='pending'){
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<9)return;
   // Horizontal touch gestures remain native carousel scrolling; pull upward to place.
   if(e.pointerType==='touch'&&Math.abs(dy)>Math.abs(dx)){loadedTrayDrag=null;return;}
   drag.phase='loading';button._ignoreClickUntil=performance.now()+1200;button.setPointerCapture(e.pointerId);e.preventDefault();
   minimizeLoadedCloseup();orbit.enabled=false;trayCursor.hidden=false;trayCursor.querySelector('img').src=sceneThumbs.get(type)||button.querySelector('img').src;trayCursor.style.left=e.clientX+'px';trayCursor.style.top=e.clientY+'px';trayCursor.querySelector('span').textContent='Loading your scene…';
   drag.ready=(async()=>{try{if(!await loadTrayScene(type,false))throw Error('Scene could not load');if(drag.cancelled)return false;armDraft(true);$('create-drawer').hidden=true;render();orbit.enabled=false;trayCursor.querySelector('img').src=$('draft-image').src;drag.phase=drag.phase==='dropping'?'dropping':'dragging';moveTray(drag.last);return true;}catch(error){status(error.message);return false;}})();
  }else if(drag.phase==='dragging'){e.preventDefault();moveTray(e);}else if(drag.phase==='loading'){e.preventDefault();trayCursor.style.left=e.clientX+'px';trayCursor.style.top=e.clientY+'px';}
 });
 button.addEventListener('pointerup',async e=>{
  const drag=loadedTrayDrag;if(!drag||drag.pointer!==e.pointerId)return;
  if(drag.phase==='pending'){loadedTrayDrag=null;return;}
  e.preventDefault();drag.phase='dropping';drag.last={clientX:e.clientX,clientY:e.clientY};button._ignoreClickUntil=performance.now()+1200;
  try{const ready=await drag.ready;if(!ready||drag.cancelled)return;const cell=document.elementFromPoint(e.clientX,e.clientY)===canvas?hit(e).cell:null;if(cell){const id=crypto.randomUUID();await commitDrop(cell,id);if(board.instances.some(i=>i.instanceId===id))selected=id;}else status('Scene remains loaded · drop onto the board to place it');}
  finally{endLiveTray();if(loadedTrayDrag===drag){loadedTrayDrag=null;trayCursor.hidden=true;orbit.enabled=true;activeCard=null;hover(null);setMode('create');$('create-drawer').hidden=true;syncWorkbench();}}
 });
 button.addEventListener('pointercancel',cancelLoadedTrayDrag);button.addEventListener('lostpointercapture',()=>{if(loadedTrayDrag?.phase!=='dropping')cancelLoadedTrayDrag();});
}
function cancelLoadedTrayDrag(){endLiveTray();const drag=loadedTrayDrag;if(!drag)return;drag.cancelled=true;loadedTrayDrag=null;trayCursor.hidden=true;orbit.enabled=true;activeCard=null;hover(null);drag.button._ignoreClickUntil=performance.now()+500;}
window.addEventListener('pointerup',()=>{if(loadedTrayDrag?.phase==='pending')loadedTrayDrag=null;});
window.addEventListener('blur',cancelLoadedTrayDrag);window.addEventListener('keydown',e=>{if(e.key==='Escape')cancelLoadedTrayDrag();});

// Board3 uses the existing composition engine, immutable cards and shared Board storage.
// This controller is isolated from Sandbox2 until its interaction contract is accepted.
var b3Ready=true,b3Whole=false;
let b3Access=false,b3Overlay=new T.Group();scene.add(b3Overlay);
const b3Stages=[{id:'compose',status:'available'},{id:'understand',status:'partial'},{id:'play',status:'planned'},{id:'create',status:'planned'}];
function b3Changed(){actionRevision++;window.RanchView?.changed();b3Sync();}
function b3Sync(){
 document.title='Night of the Dead · Ranch Atelier';
 $('b3-world-name').textContent=board.region?.name||board.settlement?.label||'Night of the Dead';
 $('b3-existing').replaceChildren(new Option('Select a scene',''),...board.instances.map(i=>new Option(board.cards[cardKey(i.cardId,i.cardRevision)].name,i.instanceId)));$('b3-existing').value=selected||'';
 $('b3-undo').disabled=busy||!history.available().undo;$('b3-redo').disabled=busy||!history.available().redo;
 $('b3-storage').textContent=persisted?'Saved in this browser':'Changes not saved · retry Save world';
 document.body.classList.toggle('b3-placement',!!activeCard);
 document.body.classList.toggle('b3-selected',!!selected&&!activeCard);
 $('b3-selection-actions').hidden=!selected;
 $('place-panel').open=!!selected;
 $('b3-placement-actions').hidden=!activeCard;
 $('b3-return').hidden=!expanded;
 $('b3-loaded-name').textContent=activeCard?.name||selectedCard()?.name||presetSet()[preset]?.name||'Scene';
 $('b3-rotation').textContent='Rotate · '+rotation*60+'°';
 $('b3-build').setAttribute('aria-expanded',String(!workbench.hidden));
 document.getElementById('b3-tray-reopen')?.setAttribute('aria-expanded',String(!workbench.hidden));
 $('b3-paths').setAttribute('aria-pressed',String(b3Access));
 $('b3-quiet').textContent=spatialRunning?'Pause path activity':'Resume path activity';
 $('b3-feedback').dataset.warning=String(!persisted||/failed|cannot|could not|blocked|does not fit/i.test($('b3-feedback').textContent));
}
function b3Close(){ $('create-drawer').hidden=true;$('b3-tools').hidden=true;showDeck(false);b3Changed(); }
function b3Panel(panel){if(busy)return; b3Close();$('b3-tools').dataset.panel=panel;if(panel==='scene'){$('create-drawer').hidden=false;}else{$('b3-tools-title').textContent=panel==='view'?'View':'Your world';$('b3-view-panel').hidden=panel!=='view';$('b3-world-panel').hidden=panel!=='world';$('b3-tools').hidden=false;$('b3-name').value=board.region?.name||'';}b3Changed();}
async function b3Prepare(type){
 if(busy)throw Error('World is busy');cancelLoadedTrayDrag();if(expanded)returnToBoard();
 if(!await loadTrayScene(type,false))throw Error('Scene could not load');
 armDraft();$('create-drawer').hidden=false;$('b3-tools').hidden=true;
 b3Changed();return {type,seed,rotation,recipe:structuredClone(draft.recipe),warnings:draft.resolvedPlan.warnings};
}
function b3Cancel(){if(busy)return;activeCard=null;selected=null;cancelPull();cancelLoadedTrayDrag();hover(null);if(expanded)returnToBoard();setMode('place');b3Close();workbench.hidden=false;status('Choose a scene or explore your world');b3Changed();}
function b3Frame(kind){if(expanded)returnToBoard();b3Whole=kind==='region';setMode('place');if(kind==='selection'&&selected)fit(true,true);else{const previous=selected;selected=null;fit(kind!=='region'&&board.instances.length>0,false);selected=previous;}b3Changed();return {camera:camera.position.toArray()};}
function b3AccessView(){b3Access=!b3Access;scene.remove(b3Overlay);dispose(b3Overlay);b3Overlay=new T.Group();scene.add(b3Overlay);if(b3Access){for(const p of assembly.plans){const c=p.center;if(!c)continue;const points=Array.from({length:7},(_,i)=>{const x=c.x+Math.sin(i*Math.PI/3)*R,z=c.z+Math.cos(i*Math.PI/3)*R;return new T.Vector3(x*S,heightAt(x,z)*S+.07,z*S);});b3Overlay.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#f2d590'})));}}render();status(b3Access?`${assembly.links.length} planned connections · ${assembly.warnings.length} layout warnings`:'Tile boundaries hidden');b3Changed();return {links:assembly.links,warnings:assembly.warnings,scope:'Layout connections; not verified courier travel'};}
async function b3SaveName(name){name=name.trim();if(!name||name.length>60)throw Error('Use a name from 1 to 60 characters');if(busy)throw Error('World is busy');const next={...board,revision:board.revision+1,region:{...board.region,name}};history.commit(next);board=next;const result=await persistCurrent();status(result.persisted?'World name saved':result.warnings.join('; '));b3Changed();return result;}
function b3Snapshot(){return {format:'ranch-board3-v1',exportedAt:new Date().toISOString(),storageScope:'this-browser',board:structuredClone(board)};}
const contextual=document.createElement('section');contextual.id='b3-context';contextual.innerHTML='<small id="b3-context-label">IN YOUR WORLD</small><h2 id="b3-loaded-name">Scene</h2><button id="b3-return" hidden>Return to world</button><div id="b3-placement-actions" hidden><button id="b3-rotation">Rotate · 0°</button><button id="b3-cancel">Cancel placement</button><button id="b3-draft-closeup">Look closely at draft</button></div><div id="b3-selection-actions" hidden><button id="b3-selected-closeup">Look closer</button><button id="b3-selected-rotate">Rotate scene</button><button id="b3-selected-remove">Remove scene</button></div>';
$('create-drawer').insertBefore(contextual,$('create-drawer').children[1]);
const cap=document.createElement('div');cap.className='b3-tray-head';cap.innerHTML='<span>MAKE YOUR WORLD</span><button id="b3-tray-close" aria-label="Minimize scene tray">−</button>';workbench.prepend(cap);
$('b3-build').onclick=()=>{if(busy)return;if(expanded)returnToBoard();b3Close();workbench.hidden=!workbench.hidden;b3Changed();};
$('b3-tray-close').onclick=()=>{workbench.hidden=true;$('b3-tray-reopen').setAttribute('aria-expanded','false');b3Changed();};
const trayReopen=document.createElement('button');trayReopen.id='b3-tray-reopen';trayReopen.textContent='POI tray';trayReopen.hidden=false;workbench.hidden=true;trayReopen.setAttribute('aria-expanded','false');document.body.append(trayReopen);trayReopen.onclick=()=>{workbench.hidden=!workbench.hidden;trayReopen.setAttribute('aria-expanded',String(!workbench.hidden));b3Changed();};
$('b3-view').onclick=()=>b3Panel('view');$('b3-world').onclick=()=>b3Panel('world');$('b3-tools-close').onclick=b3Close;$('drawer-close').onclick=b3Close;
$('b3-fit').onclick=()=>b3Frame('settlement');$('b3-whole').onclick=()=>b3Frame('region');$('b3-near').onclick=()=>b3Frame('selection');
$('b3-orbit').onclick=()=>{orbitMode=!orbitMode;$('camera-orbit').setAttribute('aria-pressed',String(orbitMode));$('b3-orbit').setAttribute('aria-pressed',String(orbitMode));status(orbitMode?'Drag to orbit':'Drag scenes to move');b3Changed();};
$('b3-paths').onclick=b3AccessView;$('b3-quiet').onclick=()=>{spatialRunning=!spatialRunning;updateMicrocosm();b3Changed();};
$('b3-undo').onclick=()=>navigateHistory('undo').then(()=>{b3Close();status('Edit undone');b3Changed();}).catch(e=>status(e.message));
$('b3-redo').onclick=()=>navigateHistory('redo').then(b3Changed).catch(e=>status(e.message));
$('b3-cancel').onclick=b3Cancel;$('b3-rotation').onclick=()=>{rotation=(rotation+1)%6;hover(target);rememberLoadedScene();b3Changed();};
$('b3-return').onclick=()=>{returnToBoard();b3Cancel();};
$('b3-draft-closeup').onclick=()=>{activeCard=null;openSceneEditor();$('create-drawer').hidden=false;b3Changed();};
$('b3-selected-closeup').onclick=()=>b3Frame('selection');
$('b3-selected-rotate').onclick=()=>selected&&commit('rotate',{instanceId:selected}).then(b3Changed);
$('b3-selected-remove').onclick=async()=>{if(!selected||busy)return;const result=await commit('remove',{instanceId:selected});if(!result.error){selected=null;b3Close();status('Scene removed · Undo restores it');}b3Changed();};
$('b3-name-save').onclick=()=>b3SaveName($('b3-name').value).catch(e=>status(e.message));
$('b3-save').onclick=()=>persistCurrent().then(r=>{status(r.persisted?'World saved · this browser':r.warnings.join('; '));b3Changed();});
$('b3-export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(b3Snapshot())],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='board3-world.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('World exported with recipes and card revisions');};
$('b3-deck').onclick=()=>{b3Close();showDeck(true);};
$('b3-existing').onchange=()=>{if(!$('b3-existing').value)return;try{chooseInstance($('b3-existing').value);$('b3-tools').hidden=true;b3Changed();}catch(e){status(e.message);}};
const nav=$('b3-navigation');function b3Nav(open){nav.hidden=!open;$('b3-nav-toggle').setAttribute('aria-expanded',String(open));if(open)$('b3-nav-close').focus();else $('b3-nav-toggle').focus();}
$('b3-nav-toggle').onclick=()=>b3Nav(nav.hidden);$('b3-nav-close').onclick=()=>b3Nav(false);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){b3Cancel();nav.hidden=true;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();navigateHistory(e.shiftKey?'redo':'undo').then(b3Changed).catch(error=>status(error.message));}});
canvas.addEventListener('pointerup',()=>queueMicrotask(()=>{if(!activeCard&&!busy)b3Sync();}));
window.RanchView?.register('night-of-the-dead',()=>({version:1,stage:'compose',stages:b3Stages,sceneType,seed,rotation,placement:!!activeCard,closeup:expanded,drawer:!$('b3-tools').hidden?$('b3-tools-title').textContent:!$('create-drawer').hidden?'scene':null,trayVisible:!workbench.hidden,storageScope:'this-browser',sharedBoardStorage:false,tileMetrics:TILE_METRICS,persisted,selected,connections:assembly.links.length,warnings:assembly.warnings}));
window.RanchActions?.register('night-of-the-dead',{revision:()=>actionRevision+board.revision,unavailable:()=>busy?'World is busy':null,read:()=>({stage:'compose',boardId:board.id,revision:board.revision,placement:!!activeCard,sceneType,seed,rotation,persisted,selected,warnings:assembly.warnings}),actions:{
 prepare:{description:'Load retained scene settings and prepare world placement without closeup',schema:schema({type:{type:'string',enum:Object.keys(SCENE_TYPES)}},['type']),run:a=>b3Prepare(a.type)},
 cancel:{description:'Cancel a draft placement without changing the saved world',schema:schema(),run:()=>b3Cancel()},
 view:{description:'Frame the region, settlement or selected scene',schema:schema({kind:{type:'string',enum:['region','settlement','selection']}},['kind']),run:a=>b3Frame(a.kind)},
 rename:{description:'Save this world’s name in the shared browser Board library',schema:schema({name:str},['name']),run:a=>b3SaveName(a.name)},
 export:{description:'Export the complete world, card revisions and recipes without mutation',readOnly:true,schema:schema(),run:()=>b3Snapshot()}
}});
if(expanded)returnToBoard();document.body.classList.add('loaded-minimized');setMode('place');$('create-drawer').hidden=true;$('b3-tools').hidden=true;workbench.hidden=true;
selected=null;b3Frame(board.instances.length?'settlement':'region');if(!board.instances.length){b3Whole=true;fit(false);}
status(board.instances.length?'Your saved world · ready to explore':'Choose a scene, then a clearing');b3Sync();

const boardVersion=document.createElement('small');boardVersion.id='b3-version';boardVersion.textContent='Sandbox · v1.3';document.body.append(boardVersion);

const worldMenuButton=document.createElement('button');worldMenuButton.id='b3-world-menu';worldMenuButton.textContent='◎';worldMenuButton.setAttribute('aria-label','World menu');worldMenuButton.setAttribute('aria-expanded','false');document.body.append(worldMenuButton);worldMenuButton.onclick=()=>{if(!$('b3-tools').hidden&&$('b3-tools').dataset.panel==='world'){b3Close();worldMenuButton.setAttribute('aria-expanded','false');}else{b3Panel('world');worldMenuButton.setAttribute('aria-expanded','true');}};

const viewPill=$('b3-view');document.body.append(viewPill);viewPill.innerHTML='<span aria-hidden="true">◉</span> View';viewPill.classList.add('b3-view-pill');

host.setAttribute('aria-label','Eight active hexes in rows 2, 3, 3, within a 26-hex outline. Each hex is 10 metres across. Survivor scene and locked gear tile. Scroll to zoom.');

// Isolated survivor generator, shared camera and people/simulation runtime.
const {mountSurvivorStart}=await import('/night-opening.mjs');
await mountSurvivorStart({T,scene,render,camera,orbit,canvas:renderer.domElement,scale:S,cellWorld,allCells:BOARD_CELLS,activeCells:BOARD_CELLS.filter(c=>START_CELLS.has(c.q+','+c.r)),fit:()=>b3Frame('region'),shadow:()=>renderer.shadowMap.needsUpdate=true});
