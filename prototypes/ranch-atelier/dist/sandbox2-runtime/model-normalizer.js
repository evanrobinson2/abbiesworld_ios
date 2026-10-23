import {RanchRenderer} from './ranch-renderer.js';
import * as T from 'three';

import {OrbitControls} from '/vendor/OrbitControls.js';

import {calibratedScale,saveCalibration,readCalibrations,clearCalibration,projectScale,calibrationStatus} from './model-calibration.js';

const $=id=>document.getElementById(id),host=$('scene-viewport'),scene=new T.Scene();scene.background=new T.Color('#e8edde');

const renderer=new RanchRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(renderer.domElement);

const camera=new T.PerspectiveCamera(38,1,.01,2000),orbit=new OrbitControls(camera,renderer.domElement);orbit.maxPolarAngle=Math.PI*.49;

scene.add(new T.HemisphereLight('#fff8ed','#72836a',2.4));const sun=new T.DirectionalLight('#fff4dc',2.6);sun.position.set(8,20,12);scene.add(sun);

const grid=new T.GridHelper(100,100,'#687c6c','#c3cdbb');grid.position.y=-.006;scene.add(grid);

const pole=new T.Mesh(new T.CylinderGeometry(.035,.035,2,12),new T.MeshStandardMaterial({color:'#c36b38'}));pole.position.set(-1.5,1,0);scene.add(pole);

const origin=new T.Mesh(new T.RingGeometry(.08,.13,32),new T.MeshBasicMaterial({color:'#c36b38',side:T.DoubleSide}));origin.rotation.x=-Math.PI/2;origin.position.y=.003;scene.add(origin);

let records=[],filtered=[],selected=null,current=null,baseSize=null,factor=1,serial=0,playing=false,timer=null,dirty=false;const cache=new Map(),drafts=new Map(),enabled=new Set(['Buildings','People','Animals','Vegetation','Supplies']);

let daddyReference=null,silhouette=null,lockedReference=null;

const category=r=>r.category==='buildings'?'Buildings':r.category==='workers'?'People':r.category==='supplies'?'Supplies':r.subject==='tree'?'Vegetation':'Animals';

const title=s=>s.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

function render(){renderer.render(scene,camera)}orbit.addEventListener('change',()=>{render();window.RanchView?.changed()});

function referenceView(){camera.position.set(6,4,7);orbit.target.set(0,1,0);orbit.update();render()}

new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();render()}).observe(host);referenceView();

function pause(){playing=false;clearTimeout(timer);$('play').textContent='Play cycle';window.RanchView?.changed()}

function schedule(){clearTimeout(timer);if(playing)timer=setTimeout(()=>step(1,false),Math.max(.5,Math.min(10,Number($('interval').value)||1.5))*1000)}

function update(){if(!current)return;$('accept-next').disabled=false;$('lock-silhouette').disabled=false;reviewProgress();$('save').disabled=false;current.scale.setScalar(factor);if(document.activeElement!==$('scale'))$('scale').value=+factor.toPrecision(8);if(document.activeElement!==$('height'))$('height').value=+(baseSize.y*factor).toPrecision(8);$('model-dimensions').textContent=`${Number((baseSize.x*factor).toPrecision(6))} m wide × ${Number((baseSize.y*factor).toPrecision(6))} m high × ${Number((baseSize.z*factor).toPrecision(6))} m deep`;$('status').textContent=calibrationStatus.error?calibrationStatus.error:dirty?'Unsaved scale adjustment':readCalibrations()[selected.id]?'Saved app-wide':projectScale(selected.id)!==null?`Project default: ${projectScale(selected.id)} metres per source unit (not yet approved)`:'Provisional: 1 source unit = 1 m. Set dimensions and save.';render();window.RanchView?.changed()}

async function source(record){if(!cache.has(record.id))cache.set(record.id,(async()=>{const response=await fetch(record.json);if(!response.ok)throw Error('Cannot load '+record.id);const group=new T.Group();for(const part of await response.json()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(part.positions,3));if(part.normals?.length===part.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(part.normals,3));else geo.computeVertexNormals();group.add(new T.Mesh(geo,new T.MeshStandardMaterial({color:new T.Color().setRGB(...part.color,T.SRGBColorSpace),roughness:.9})));}return group;})().catch(e=>{cache.delete(record.id);throw e}));return cache.get(record.id)}

async function show(record){const ticket=++serial;if(!record)return;selected=record;$('model-list').value=record.id;$('model-name').textContent=title(record.subject)+' · '+title(record.state);$('status').textContent='Loading model…';for(const id of ['height','scale','smaller','larger','save','revert','clear-saved','accept-next','lock-silhouette'])$(id).disabled=true;try{const model=(await source(record)).clone(true);if(ticket!==serial)return;const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3());baseSize=box.getSize(new T.Vector3());model.position.set(-center.x,-box.min.y,-center.z);if(current)scene.remove(current);current=new T.Group();current.add(model);scene.add(current);factor=drafts.get(record.id)??calibratedScale(record.id)??1;dirty=drafts.has(record.id);$('model-count').textContent=`${filtered.indexOf(record)+1} / ${filtered.length} models · ${category(record)} · ground origin 0, 0, 0`;for(const id of ['height','scale','smaller','larger','save','revert','clear-saved','accept-next','lock-silhouette'])$(id).disabled=false;update();schedule();prefetch();}catch(e){pause();$('status').textContent=e.message;}}

function step(delta,stop=true){if(stop)pause();if(filtered.length)show(filtered[(filtered.findIndex(r=>r.id===selected?.id)+delta+filtered.length)%filtered.length]);}

function filter(){pause();filtered=records.filter(r=>enabled.has(category(r)));$('model-list').replaceChildren(...filtered.map(r=>new Option(title(r.subject)+' · '+title(r.state),r.id)));for(const id of ['previous','next','play','model-list'])$(id).disabled=!filtered.length;if(filtered.length)show(filtered.find(r=>r.id===selected?.id)||filtered.find(r=>!approved(r))||filtered[0]);else{++serial;selected=null;if(current)scene.remove(current);current=null;$('model-name').textContent='No categories selected';$('model-dimensions').textContent='';$('model-count').textContent='0 models';$('status').textContent='Turn on a category to compare models.';for(const id of ['height','scale','smaller','larger','save','revert','clear-saved','accept-next','lock-silhouette'])$(id).disabled=true;render();window.RanchView?.changed();}}

function edit(value){pause();if(!current||!Number.isFinite(value)||value<=0){$('save').disabled=true;$('accept-next').disabled=true;$('lock-silhouette').disabled=true;$('status').textContent='Enter a finite positive scale.';return;}factor=value;drafts.set(selected.id,factor);dirty=true;update()}

$('scale').oninput=e=>edit(Number(e.target.value));$('height').oninput=e=>edit(Number(e.target.value)/baseSize.y);$('smaller').onclick=()=>edit(factor*.9);$('larger').onclick=()=>edit(factor*1.1);

$('save').onclick=async()=>{if(saving)return;pause();setSaving(true);try{await saveCalibration(selected.id,factor);drafts.delete(selected.id);dirty=false;update()}catch(e){$('status').textContent='Could not save: '+e.message}finally{setSaving(false)}};

$('revert').onclick=()=>{pause();drafts.delete(selected.id);factor=calibratedScale(selected.id)??1;dirty=false;update()};

$('play').onclick=()=>{if(playing)pause();else{playing=true;$('play').textContent='Pause cycle';schedule();window.RanchView?.changed()}};$('interval').onchange=schedule;$('previous').onclick=()=>step(-1);$('next').onclick=()=>step(1);$('model-list').onchange=e=>{pause();show(filtered.find(r=>r.id===e.target.value))};

$('fit').onclick=()=>{if(!current)return;pause();const box=new T.Box3().setFromObject(current);for(const ref of [daddyReference,silhouette])if(ref?.visible)box.union(new T.Box3().setFromObject(ref));const size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),angle=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*camera.aspect));camera.position.copy(center).add(new T.Vector3(1,.7,1.2).normalize().multiplyScalar(size.length()/2/Math.sin(angle)*1.15));orbit.target.copy(center);camera.far=Math.max(2000,camera.position.distanceTo(center)+size.length()*4);camera.near=Math.min(.01,size.length()/10000);camera.updateProjectionMatrix();orbit.update()};$('reference-view').onclick=referenceView;$('reference').onchange=e=>{pole.visible=e.target.checked;render();window.RanchView?.changed()};

$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,units:'metres',models:readCalibrations()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ranch-model-calibrations.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});

window.RanchView?.register('modelNormalizer',()=>({persistence:calibrationStatus,selected:selected?.id,category:selected?category(selected):null,enabledCategories:[...enabled],modelCount:records.length,normalizedCount:records.filter(r=>calibratedScale(r.id)!==null).length,filteredCount:filtered.length,playing,dirty,approvedCount:records.filter(approved).length,daddyReferenceVisible:!!daddyReference?.visible,lockedSilhouette:lockedReference,silhouetteVisible:!!silhouette?.visible,metresPerUnit:factor,dimensionsMetres:baseSize?{width:baseSize.x*factor,height:baseSize.y*factor,depth:baseSize.z*factor}:null,groundOrigin:[0,0,0],camera:camera.position.toArray(),cameraTarget:orbit.target.toArray()}),render);



function approved(record){const saved=readCalibrations()[record.id];return !!saved?.approvedAt&&saved.metresPerUnit===(drafts.get(record.id)??calibratedScale(record.id)??1);}

function reviewProgress(){const count=records.filter(approved).length;$('approval-progress').textContent=`${count} / ${records.length} models approved`;$('review-remaining').disabled=count===records.length;$('accept-next').textContent=selected&&approved(selected)?'Accepted - Next':'Accept & Next';}

function nextPending(){const index=filtered.findIndex(r=>r.id===selected?.id);for(let i=1;i<=filtered.length;i++){const r=filtered[(index+i)%filtered.length];if(!approved(r))return r;}return null;}

function prefetch(){const next=nextPending();if(next&&next.id!==selected?.id)source(next).catch(()=>{});}

$('accept-next').onclick=async()=>{if(saving||!selected||!current||$('accept-next').disabled)return;pause();setSaving(true);const name=title(selected.subject)+' - '+title(selected.state);try{await saveCalibration(selected.id,factor,{approved:true});drafts.delete(selected.id);dirty=false;reviewProgress();const next=nextPending();if(next){$('review-status').textContent=name+' accepted.';await show(next);}else{$('review-status').textContent=records.every(approved)?'All models approved.':'All selected categories approved. Use Review all remaining models to continue.';update();}}catch(e){$('review-status').textContent='Could not accept: '+e.message;}finally{setSaving(false)}};

$('review-remaining').onclick=()=>{enabled.clear();for(const name of ['Buildings','People','Animals','Vegetation','Supplies'])enabled.add(name);$('categories').querySelectorAll('input').forEach(i=>i.checked=true);selected=records.find(r=>!approved(r))||selected;filter();$('review-status').textContent='Reviewing all remaining models.';};

function referenceMaterial(kind){return new T.MeshBasicMaterial({color:kind==='wire'?'#b55228':'#263f45',wireframe:kind==='wire',transparent:true,opacity:kind==='wire'?.14:.16,depthTest:false,depthWrite:false});}

async function makeReference(record,scale,kind){const model=(await source(record)).clone(true),box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3());model.position.set(-center.x,-box.min.y,-center.z);const material=referenceMaterial(kind);model.traverse(o=>{if(o.isMesh){o.material=material;o.renderOrder=kind==='wire'?3:2;}});const group=new T.Group();group.add(model);group.scale.setScalar(scale);group.userData.referenceMaterial=material;return group;}

function discardReference(group){if(group){scene.remove(group);group.userData.referenceMaterial.dispose();}}

async function setSilhouette(value){const record=records.find(r=>r.id===value?.id);if(!record||!Number.isFinite(value.scale)||value.scale<=0)return;const next=await makeReference(record,value.scale,'silhouette');discardReference(silhouette);silhouette=next;lockedReference={id:record.id,scale:value.scale,visible:value.visible!==false};silhouette.visible=lockedReference.visible;scene.add(silhouette);$('show-silhouette').disabled=false;$('show-silhouette').checked=silhouette.visible;$('silhouette-label').textContent=`Locked: ${title(record.subject)} - ${title(record.state)} (${Number(value.scale.toPrecision(6))}x)`;render();window.RanchView?.changed();}

$('lock-silhouette').onclick=async()=>{if(!selected||!current||$('lock-silhouette').disabled)return;pause();const value={id:selected.id,scale:factor,visible:true};$('lock-silhouette').disabled=true;try{localStorage.setItem('ranch-model-silhouette-v1',JSON.stringify(value));await setSilhouette(value);}catch(e){$('silhouette-label').textContent='Could not lock silhouette: '+e.message;}finally{$('lock-silhouette').disabled=false;}};

$('show-silhouette').onchange=e=>{if(!silhouette)return;silhouette.visible=e.target.checked;lockedReference.visible=e.target.checked;try{localStorage.setItem('ranch-model-silhouette-v1',JSON.stringify(lockedReference));}catch{}render();window.RanchView?.changed();};

$('daddy-reference').onchange=e=>{if(daddyReference)daddyReference.visible=e.target.checked;render();window.RanchView?.changed();};

async function initReferences(){const daddy=records.find(r=>r.id==='daddy-idle');if(daddy){daddyReference=await makeReference(daddy,calibratedScale(daddy.id)??1,'wire');daddyReference.visible=$('daddy-reference').checked;scene.add(daddyReference);render();}let saved;try{saved=JSON.parse(localStorage.getItem('ranch-model-silhouette-v1'));}catch{}if(saved)await setSilhouette(saved);}



(async()=>{const response=await fetch('/simulation-assets/catalog.json');if(!response.ok)throw Error('Model catalog unavailable');records=await response.json();for(const name of enabled){const label=document.createElement('label');label.className='check';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.onchange=()=>{input.checked?enabled.add(name):enabled.delete(name);filter()};label.append(input,`${name} (${records.filter(r=>category(r)===name).length})`);$('categories').append(label)}filter();initReferences().catch(e=>{$('silhouette-label').textContent='Reference unavailable: '+e.message;});if(innerWidth<800)setTimeout(()=>window.RanchDrawers?.close(),300)})().catch(e=>$('status').textContent=e.message);



$('clear-saved').onclick=async()=>{pause();if(saving||!selected)return;setSaving(true);try{await clearCalibration(selected.id);drafts.delete(selected.id);factor=calibratedScale(selected.id)??1;dirty=false;update()}catch(e){$('status').textContent='Could not clear: '+e.message}finally{setSaving(false)}};


window.addEventListener('ranch-model-calibration',()=>{if(selected&&current&&!dirty){factor=calibratedScale(selected.id)??1;update()}});

let saving=false;function setSaving(value){saving=value;for(const el of document.querySelectorAll('#categories input,#height,#scale,#smaller,#larger,#save,#clear-saved,#revert,#accept-next,#model-list,#next,#previous,#play,#review-remaining'))el.disabled=value;if(value)$('status').textContent='Saving shared calibration…';}
