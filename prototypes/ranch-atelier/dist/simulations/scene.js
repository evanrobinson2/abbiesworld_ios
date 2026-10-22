import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {sandboxWheel} from './vendor/sandbox-camera.mjs';
import {attachMaterialProfile} from './tile-materials.js';
import {roleFor} from './ranch-renderer.js';
import {RanchRenderer} from './ranch-renderer.js';
import {createRanchComposer} from './ranch-composer.js';
import {terrainSampler} from './tile-landscape.js';
import {planAssembly} from './tile-adapter.js';
import {RENDER_UNITS_PER_METRE as S} from './tile-metrics.js';
import {DOMESTIC_SCENES,domesticRecipe,domesticRequirements,completeDomesticPaths} from './domestic-scenes.js';
import {DISTRICT_SCENES,districtRecipe} from './district-scenes.js';
import {HERO_SCENES,castleRecipe} from './castle-scenes.js';
import {SEASIDE_SCENES,seasideRecipe,seasideSurface} from './seaside-scenes.js';
import {GARDEN_V2,gardenCardRecipe,applyGardenAssembly} from './garden-adapter.js';
import {spatialState,spatialReadout} from './microcosm.mjs';
import {attachSceneLife,animateSceneLife} from './microcosm-view.mjs';
import {townSurface} from './town-life/layouts.mjs';
import {townForPreset} from './town-life/tile-state.mjs';
import {attachTown,animateTown} from './town-life/tile-view.mjs';
import {advanceHour} from './town-life/economy.mjs';
const $=s=>document.querySelector(s),host=$('#world');
const definitions={ranch:{label:'Ranch',presets:{homestead:'Homestead',working:'Working ranch',pasture:'Grazing estate'}},...DOMESTIC_SCENES,...HERO_SCENES,...DISTRICT_SCENES,...SEASIDE_SCENES,garden:GARDEN_V2};
let active=null,busy=false,running=true,lastKind=null,revision=0;
function notify(label){window.dispatchEvent(new CustomEvent('scenegenerated',{detail:{label}}));}
try{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.1,1600);
 const renderer=new RanchRenderer({antialias:false,preserveDrawingBuffer:true,animateNPCs:false,contourSamples:0});renderer.setPixelRatio(Math.min(devicePixelRatio,1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;host.replaceChildren(renderer.domElement);const canvas=renderer.domElement;canvas.tabIndex=0;
 const orbit=new OrbitControls(camera,canvas);orbit.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};orbit.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};orbit.enableDamping=false;orbit.maxPolarAngle=Math.PI*.47;orbit.minDistance=1.2;orbit.maxDistance=800;
 canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();sandboxWheel(T,camera,orbit,e);},{capture:true,passive:false});
 scene.add(new T.HemisphereLight('#fff7e2','#738769',1.6));const sun=new T.DirectionalLight('#fff1cf',2);sun.position.set(-45,90,50);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:220});sun.shadow.normalBias=.03;scene.add(sun);
 function render(){renderer.render(scene,camera);canvas.dataset.camera=camera.position.toArray().map(v=>v.toFixed(3)).join(',');canvas.dataset.target=orbit.target.toArray().map(v=>v.toFixed(3)).join(',');}
 function fit(){if(!active)return;const box=new T.Box3().setFromObject(active.group),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());const d=Math.max(size.x/Math.max(camera.aspect,.2),size.y,size.z)*.6/Math.tan(T.MathUtils.degToRad(camera.fov/2));orbit.target.copy(center);camera.position.copy(center).add(new T.Vector3(.65,.78,1.2).normalize().multiplyScalar(d));orbit.update();render();}
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();fit();}
 new ResizeObserver(resize).observe(host);orbit.addEventListener('change',render);$('#reset-camera').onclick=fit;
 function palette(){const css=getComputedStyle($('.sample'));scene.background=new T.Color(css.getPropertyValue('--bg').trim());if(active){for(const record of active.paint){const {material,role,base}=record;const token=role==='roof'?'roof':role==='foliage'||role==='ground'?'land':role==='water'?'water':role==='timber'?'roof':role==='plaster'?'panel':role==='stone'?'muted':role==='clay'||role==='cloth'?'accent':null;if(token){material.color.set(css.getPropertyValue('--'+token).trim());}else material.color.copy(base);}canvas.dataset.paletteColors=active.paint.filter(r=>['roof','ground','foliage','plaster'].includes(r.role)).slice(0,12).map(r=>r.role+':'+r.material.color.getHexString()).join(',');renderer.shadowMap.needsUpdate=true;}render();}
 window.addEventListener('palettechange',palette);
 function preparePaint(group){const paint=[],clones=new Map();group.traverse(o=>{if(!o.isMesh||!o.material)return;const map=m=>{if(!m.color)return m;if(clones.has(m))return clones.get(m);const clone=m.clone();clone.onBeforeCompile=m.onBeforeCompile;clone.customProgramCacheKey=m.customProgramCacheKey;clone.userData={...m.userData,shared:false};const role=roleFor(o,m);attachMaterialProfile(clone,role);paint.push({material:clone,base:m.color.clone(),role});clones.set(m,clone);return clone;};o.material=Array.isArray(o.material)?o.material.map(map):map(o.material);});return paint;}
 function readout(){if(!active)return;const r=active.recipe,stats=spatialReadout(active.assembly.plans),town=active.type==='town',state=town?r.townLife:r.microcosm;
  canvas.dataset.terrain=String(r.landscape.height);canvas.dataset.greenery=String(r.landscape.vegetation);canvas.dataset.meshes=String(active.meshes);canvas.dataset.sceneRevision=String(revision);canvas.dataset.sceneSeed=String(r.seed);canvas.dataset.sceneKind=active.type;canvas.dataset.generator=r.generator;canvas.dataset.simulation=town?'town-household-economy':'spatial-path-activity';canvas.dataset.simulationTime=String(town?state.day*24+state.hour:state.seconds);canvas.dataset.walkedMetres=String(r.microcosm.metres);canvas.dataset.households=String(town?state.households.length:0);
  $('#place-details').textContent=`${stats.sites} places linked by ${stats.routes} paths · ${stats.metres} m of walking routes.`;
  $('#scene-type').textContent=definitions[active.type].label;$('#simulation-summary').textContent=definitions[active.type].label+' · scene controls';
  $('#simulation-readout').textContent=town?`Day ${state.day}, ${state.hour}:00 · ${state.households.length} households · ${state.meals} meals served · ${state.ledger?.length||0} transactions`:`${Math.floor(state.seconds)} seconds · ${Math.floor(state.metres)} metres walked · ${state.trips} visits`;
  $('#simulation-scope').textContent=town?'Town household economy, work, school, and civic services are running. Outside support covers shortages.':active.type==='garden'?'Actual Farm generator and path activity. Crop growth, harvest, and production are not implemented.':'Actual scene generator and spatial path activity. No domain production or economy is running in this view.';
  $('#simulation-source').textContent=`${r.generator} · ${active.preset} · seed ${r.seed} · ${stats.routes} paths / ${stats.metres} m · ${stats.sites} places`;
  $('#step-simulation').textContent=town?'Advance 1 hour':'Advance 10 seconds';
 }
 function step(dt){if(!active||busy)return;if(active.type==='town'){for(const g of active.group.children)animateTown(g,dt);active.elapsed+=dt;while(active.elapsed>=8){active.elapsed-=8;active.recipe.townLife=advanceHour(active.recipe.townLife);}}else for(const g of active.group.children)animateSceneLife(g,dt);}
 $('#pause-simulation').onclick=()=>{running=!running;$('#pause-simulation').textContent=running?'Pause':'Resume';};
 $('#step-simulation').onclick=()=>{if(!active||busy)return;if(active.type==='town')active.recipe.townLife=advanceHour(active.recipe.townLife);else step(10);readout();render();};
 $('#scene-family').innerHTML='<option value="any">Any scene family</option>'+Object.entries(definitions).map(([id,d])=>`<option value="${id}">${d.label}</option>`).join('');
 host.setAttribute('aria-label','Loading actual Sandbox generators');$('#simulation-readout').textContent='Loading generator assets…';
 const composer=await createRanchComposer();
 async function generate(first=false,mode='random'){if(busy)return;busy=true;for(const id of ['reshape-scene','terrain','greenery'])$('#'+id).disabled=true;$('#randomize-scene').disabled=true;$('#scene-family').disabled=true;$('#step-simulation').disabled=true;$('#simulation-readout').textContent='Generating actual scene…';let staged;
  try{const selection=$('#scene-family').value,available=Object.keys(definitions).filter(k=>k!==lastKind);const editing=mode!=='random'&&active;const type=editing?active.type:first?'town':selection==='any'?available[Math.floor(Math.random()*available.length)]:selection;const presets=Object.keys(definitions[type].presets),preset=editing?active.preset:presets[Math.floor(Math.random()*presets.length)],seed=mode==='settings'&&active?active.recipe.seed:crypto.getRandomValues(new Uint32Array(1))[0]||1;
   if(type==='garden')await composer.gardenDimensions();
   let recipe=type==='garden'?gardenCardRecipe(preset,seed,composer.dimensions):SEASIDE_SCENES[type]?seasideRecipe(preset,seed):DISTRICT_SCENES[type]?districtRecipe(type,preset,seed,3):type==='castle'?castleRecipe(preset,seed):type!=='ranch'?domesticRecipe(type,preset,seed):{generator:'ranch-composer',version:1,seed,preset,landscape:{height:0,vegetation:2,props:1,seed:173},tiles:({homestead:['ranch'],working:['ranch','paddock','crop'],pasture:['ranch','paddock']}[preset]).map((kind,i)=>({id:kind,type:kind,cell:i,rotation:0,seed:(seed+i*43)>>>0||1}))};
   recipe.landscape={...recipe.landscape,height:['garden','seaside'].includes(type)?0:Number($('#terrain').value),vegetation:Number($('#greenery').value)};
   recipe.microcosm=spatialState();const assembly=completeDomesticPaths(planAssembly(recipe,{dimensions:composer.dimensions,requirementsByType:type==='ranch'?{}:{[type]:recipe.requirements||domesticRequirements(type,preset)}}));applyGardenAssembly(assembly,()=>recipe);staged=new T.Group();
   const baseHeight=terrainSampler(recipe,assembly);
   if(type==='town')recipe.townLife=townForPreset(preset,seed,3);
   for(const tile of recipe.tiles){const plan=assembly.plans.find(p=>p.id===tile.id),heightAt=recipe.requirements?.[0]?.townTerrain?townSurface(plan,recipe.requirements[0].townTerrain.preset,recipe.seed,baseHeight):type==='seaside'?seasideSurface(assembly):type==='garden'?()=>0:baseHeight;const g=await composer.draw(tile,plan,{landscape:recipe.landscape,heightAt});g.position.set(plan.center.x*S,0,plan.center.z*S);staged.add(g);if(type==='town')attachTown(g,plan,preset,()=>recipe.townLife,heightAt,S);else attachSceneLife(g,plan,()=>recipe.microcosm,heightAt,S);}
   let meshes=0;staged.traverse(o=>{if(o.isMesh)meshes++;});const previous=active;active={meshes,group:staged,recipe,assembly,type,preset,elapsed:0,paint:preparePaint(staged)};scene.add(staged);if(previous){scene.remove(previous.group);composer.dispose(previous.group);}lastKind=type;revision++;palette();if(first)fit();readout();canvas.setAttribute('aria-label',definitions[type].label+' generated by '+recipe.generator+'. Drag to orbit; scroll to zoom; Shift-drag to pan.');if(!first)notify((mode==='settings'?'Updated · ':mode==='reshape'?'Reshaped · ':'')+definitions[type].label+' · '+definitions[type].presets[preset]);
  }catch(error){if(staged&&staged!==active?.group)composer.dispose(staged);$('#simulation-readout').textContent='Generation failed: '+error.message;notify('Generation failed · '+error.message);console.error(error);}finally{busy=false;$('#reshape-scene').disabled=!active;$('#greenery').disabled=!active;$('#terrain').disabled=!active||['garden','seaside'].includes(active.type);$('#terrain-value').textContent=$('#terrain').disabled?'Fixed':Number($('#terrain').value)?$('#terrain').value+' / 12':'Flat';$('#shape-note').textContent=($('#terrain').disabled?'This scene keeps its designed ground profile. ':'')+'Changes restart scene activity; view and style stay put.';$('#randomize-scene').disabled=false;$('#scene-family').disabled=false;$('#step-simulation').disabled=false;}}
 $('#reshape-scene').onclick=()=>generate(false,'reshape');
 for(const id of ['terrain','greenery']){const slider=$('#'+id);slider.oninput=()=>{$('#'+id+'-value').textContent=id==='terrain'?(Number(slider.value)?slider.value+' / 12':'Flat'):slider.value+' / 3';};slider.onchange=()=>generate(false,'settings');}
 $('#randomize-scene').onclick=()=>generate();$('#scene-family').onchange=()=>generate();resize();await generate(true);
 let last=performance.now(),ui=0;function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(!document.hidden&&running&&!busy){step(dt);render();ui+=dt;if(ui>.5){readout();ui=0;}}requestAnimationFrame(frame);}requestAnimationFrame(frame);
}catch(error){host.textContent='Actual Sandbox runtime failed to load: '+error.message;console.error(error);}
