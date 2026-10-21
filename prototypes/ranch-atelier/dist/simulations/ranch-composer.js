import {gardenPlanting} from './garden-facets.mjs';
import {applyVariant} from './variants/new-england.mjs';
import {dressingAsset,enclosureAsset} from './variants/dressing.mjs';
import {sugarShack} from './poi/sugar-shack.mjs';
import {regionalAsset,REGIONAL} from './ranch-regional.mjs?v=3';
import {playground} from './ranch-play.mjs';
import {markNPC,isHumanAsset,installNPCAnimations} from '/npc-animation.js';
import {gardenRenditionItems} from './garden-rendition.js';
import {createGardenArt} from './garden-art.js';
import {drawCoastalWater} from './coastal-water.js';
import {drawDomesticGroup} from './domestic-assets.js';
import * as T from 'three';
import {mergeGeometries} from './vendor/utils/BufferGeometryUtils.js';
import {ranchMaterial} from './tile-materials.js';
import {calibratedScale,modelDimensions} from './model-calibration.js';
import {dressingPlan,landscapeSettings} from './tile-landscape.js?diversity=3';
import {segmentDistance} from './tile-adapter.js';
import {TILE_RADIUS_METRES,RENDER_UNITS_PER_METRE} from './tile-metrics.js';
const S=RENDER_UNITS_PER_METRE;
export async function createRanchComposer({variants=true,variantStage='full',variantSeed=1}={}){
 let gardenArt;const getGardenArt=async()=>gardenArt||(gardenArt=await createGardenArt());
 let board={},heightAt=()=>0,frozenScales=null;const normalization={};
 const variantTemplates=new Map();
 const catalog=await (await fetch('/simulation-assets/catalog.json')).json(),templates=new Map(),dimensions={};
function mesh(geo,color,role='ground'){geo.setAttribute('paintPosition',geo.getAttribute('position').clone());const m=new T.Mesh(geo,ranchMaterial(color,role));m.receiveShadow=true;return m;}
function box(g,x,y,z,w,h,d,color){const m=mesh(new T.BoxGeometry(w,h,d),color);m.position.set(x,y,z);g.add(m);return m;}
function segment(g,a,b,width,color,y=.04){const dx=b[0]-a[0],dz=b[1]-a[1],m=box(g,(a[0]+b[0])/2,y,(a[1]+b[1])/2,width,.025,Math.hypot(dx,dz),color);m.rotation.y=Math.atan2(dx,dz);return m;}
function dispose(g){g.traverse(o=>{if(!o.userData.sharedGeometry)o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>{if(!m.userData.shared)m.dispose()});else if(o.material&&!o.material.userData.shared)o.material.dispose()});}

async function template(id){if(!templates.has(id))templates.set(id,(async()=>{const r=catalog.find(r=>r.id===id);if(!r)throw Error('Missing model '+id);const response=await fetch(r.json);if(!response.ok)throw Error('Cannot load '+id);const group=new T.Group();for(const p of await response.json()){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p.positions,3));if(p.normals?.length===p.positions.length)geo.setAttribute('normal',new T.Float32BufferAttribute(p.normals,3));else geo.computeVertexNormals();const m=mesh(geo,new T.Color().setRGB(...p.color,T.SRGBColorSpace),p.role||'plain');m.castShadow=true;m.userData.sharedGeometry=true;m.userData.isWindow=p.materialName==='glass';group.add(m)}return group})().catch(e=>{templates.delete(id);throw e}));return templates.get(id)}
async function asset(g,id,x,z,widthMetres,rotation=0,override){let source=await template(id);if(override?override.stage!=='original':variants){const recipeStage=override?.stage||variantStage,localSeed=((override?.seed??variantSeed)+Math.floor(Math.abs(x*13+z*7)))%8,k=id+':'+recipeStage+':'+localSeed;if(!variantTemplates.has(k)){const v=applyVariant(source.clone(true),id,{seed:localSeed,stage:recipeStage});v.traverse(o=>{if(o.geometry)o.userData.sharedGeometry=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)m.userData.shared=true;});variantTemplates.set(k,v);}source=variantTemplates.get(k);}const model=source.clone(true);if(id==='family-home-complete'){let glass;model.traverse(o=>{if(o.isMesh&&o.userData.isWindow){if(!glass){glass=o.material.clone();glass.userData={...o.material.userData,shared:false,homeWindow:true};}o.material=glass;}});}const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),center=b.getCenter(new T.Vector3()),factor=(frozenScales?.[id]??calibratedScale(id)??1)*S;model.position.set(-center.x,-b.min.y,-center.z);const wrapper=new T.Group();wrapper.add(model);wrapper.scale.setScalar(factor);wrapper.position.set(x*S,.025,z*S);wrapper.rotation.y=rotation;wrapper.userData.asset=id;wrapper.userData.variant=model.userData.variant;wrapper.userData.inspect={title:catalog.find(r=>r.id===id)?.label||id,kind:isHumanAsset(id)?'Resident':'Ranch object',description:isHumanAsset(id)?'Standing in the shared yard.':'Part of the generated ranch.'};if(isHumanAsset(id))markNPC(wrapper);normalization[id]=factor/S;dimensions[id]={w:size.x*factor/S,d:size.z*factor/S,height:size.y*factor/S,width:size.x*factor/S};g.add(wrapper);}
function tileName(tile){return names[tile.type||tile.id];}

function batchTile(group,{inertiaParts=false}={}){
 group.updateMatrixWorld(true);const buckets=new Map();
 group.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid+o.castShadow;let b=buckets.get(key);if(!b){b={material:o.material,cast:o.castShadow,parts:[],ranges:[],count:0};buckets.set(key,b)}let geo=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geo.setAttribute('paintPosition',geo.getAttribute('position').clone());geo.applyMatrix4(o.matrixWorld);for(const name of Object.keys(geo.attributes))if(!['position','normal','paintPosition','color'].includes(name))geo.deleteAttribute(name);if(inertiaParts){let owner=o;while(owner.parent&&owner.parent!==group)owner=owner.parent;const count=geo.getAttribute('position').count;b.ranges.push({inspect:owner.userData.inspect,variant:owner.userData.variant,key:'dressing-part-'+group.children.indexOf(owner),anchor:new T.Vector3().setFromMatrixPosition(owner.matrixWorld).toArray(),start:b.count,count});b.count+=count;}b.parts.push(geo);});
 const result=new T.Group();for(const b of buckets.values()){const geo=mergeGeometries(b.parts);b.parts.forEach(g=>g.dispose());const m=new T.Mesh(geo,b.material);m.castShadow=b.cast;m.receiveShadow=true;if(inertiaParts)m.userData.inertiaParts=b.ranges;result.add(m)}dispose(group);return result;
}

async function content(tile,plan,options={}){
 // Moon owns its registered assets, regolith surface and skirt through its adapter.
 if(tile.type==='moon')return new T.Group();
 const R=TILE_RADIUS_METRES*S;
 const frozenGarden=options.gardenRendition?gardenRenditionItems(options.gardenRendition):null;
 const resultGardenItems=[];const g=new T.Group(),type=tile.type||tile.id;
 const positions=[],colors=[],N=40,landColor=new T.Color(type==='seaside'?'#b0b88b':type==='crop'?'#a2ae76':type==='paddock'?'#9db680':'#b4bc91'),roadColor=new T.Color('#b29462');
 const point=(edge,u,v)=>{const a=edge*Math.PI/3,b=(edge+1)*Math.PI/3,x=(Math.sin(a)*u+Math.sin(b)*v)*R,z=(Math.cos(a)*u+Math.cos(b)*v)*R;return [x,heightAt(plan.center.x+x/S,plan.center.z+z/S)*S,z];};
 const coastRecord=heightAt.coasts?.find(c=>c.id===plan.id),sand=new T.Color('#ccb982');const triangle=(...points)=>{for(const point of points){positions.push(...point);let color=coastRecord?landColor.clone().lerp(sand,Math.max(0,Math.min(1,(1.15-(point[1]/S-coastRecord.waterLevel))/.6))):landColor;if(heightAt.habitat){const habitat=heightAt.habitat(plan.center.x+point[0]/S,plan.center.z+point[2]/S);color=color.clone().lerp(new T.Color('#93a35c'),(habitat.floodplain||0)*.28).lerp(new T.Color('#819064'),habitat.woodland*.18).lerp(new T.Color('#8b8b7e'),Math.max(0,Math.min(1,(habitat.slope-.22)*2)));}colors.push(color.r,color.g,color.b);}};
 for(let edge=0;edge<6;edge++)for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){triangle(point(edge,i/N,j/N),point(edge,(i+1)/N,j/N),point(edge,i/N,(j+1)/N));if(i+j<N-1)triangle(point(edge,(i+1)/N,j/N),point(edge,(i+1)/N,(j+1)/N),point(edge,i/N,(j+1)/N));}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();const terrain=mesh(geo,'#ffffff');const terrainSource=terrain.material;terrain.material=terrainSource.clone();const paintedPaths=[...plan.paths.filter(p=>p.kind!=='garden-threshold'),...(plan.gardenSource?.areas||[]).map(a=>{const angle=(plan.rotation||0)*Math.PI/3;return {width:a.d,points:[{x:a.x-a.w/2+a.d/2,z:a.z},{x:a.x+a.w/2-a.d/2,z:a.z}].map(p=>({x:p.x*Math.cos(angle)+p.z*Math.sin(angle),z:-p.x*Math.sin(angle)+p.z*Math.cos(angle)}))}}),...plan.placements.flatMap(o=>(o.visualPaths||[]).map(path=>({...path,points:path.points.map(p=>({x:o.x+p.x*Math.cos(o.angle)+p.z*Math.sin(o.angle),z:o.z-p.x*Math.sin(o.angle)+p.z*Math.cos(o.angle)}))})))];const segments=paintedPaths.flatMap(path=>path.points.slice(1).map((p,i)=>({ends:new T.Vector4(path.points[i].x*S,path.points[i].z*S,p.x*S,p.z*S),width:path.width*S})));terrain.material.onBeforeCompile=shader=>{terrainSource.onBeforeCompile(shader);if(!segments.length)return;shader.uniforms.pathEnds={value:segments.map(s=>s.ends)};shader.uniforms.pathWidths={value:segments.map(s=>s.width)};shader.uniforms.pathColor={value:roadColor};shader.fragmentShader=`uniform vec4 pathEnds[${segments.length}];uniform float pathWidths[${segments.length}];uniform vec3 pathColor;\n`+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 float roadEdge=10000.;for(int i=0;i<${segments.length};i++){vec2 a=pathEnds[i].xy,b=pathEnds[i].zw,d=b-a;float t=clamp(dot(vPaintPosition.xz-a,d)/max(dot(d,d),.000001),0.,1.);roadEdge=min(roadEdge,length(vPaintPosition.xz-a-d*t)-pathWidths[i]*.5);}// Quiet, hand-painted paths: rounded joins with a slightly irregular soft edge.
 vec2 pathUV=vPaintPosition.xz;
 float brush=sin(pathUV.x*8.3+sin(pathUV.y*5.1))*sin(pathUV.y*7.7+pathUV.x*2.1);
 float paintedEdge=roadEdge+brush*.009;
 float pathMask=1.-smoothstep(-.018,.028,paintedEdge);
 float pathRim=smoothstep(-.055,-.012,paintedEdge);
 float pigment=sin(pathUV.x*3.7+pathUV.y*2.3)*sin(pathUV.y*4.1-pathUV.x*1.9);
 vec3 paintedPath=pathColor*(1.+pigment*.022-pathRim*.075);
 diffuseColor.rgb=mix(diffuseColor.rgb,paintedPath,pathMask);`);};terrain.material.customProgramCacheKey=()=>terrainSource.customProgramCacheKey()+'-painted-paths-v6-'+segments.length;terrain.material.userData={...terrain.material.userData,shared:false};terrain.material.vertexColors=true;terrain.material.userData.seasonRole='ground';terrain.material.userData.seasonPaths=segments.length>0;g.add(terrain);
 if(options.skirt!==false){const sides=[];for(let e=0;e<6;e++)if(options.exposedEdges?.[e]!==false)for(let j=0;j<N;j++){const a=point(e,1-j/N,j/N),b=point(e,1-(j+1)/N,(j+1)/N),c=[a[0],-.22,a[2]],d=[b[0],-.22,b[2]];sides.push(...a,...c,...b,...b,...c,...d);}const skirt=new T.BufferGeometry();skirt.setAttribute('position',new T.Float32BufferAttribute(sides,3));skirt.computeVertexNormals();g.add(mesh(skirt,'#8e9868'));}
 const ground=(x,z)=>heightAt(plan.center.x+x,plan.center.z+z)*S;
 for(const o of plan.placements){
  if(o.gardenItem){let part;if(options.gardenRendition){part=frozenGarden(o.gardenItem.id);}else{const art=await getGardenArt();part=new T.Group();await art.drawItems(part,[{...o.gardenItem,x:0,z:0,y:0,foundationDepth:0}],{normalization:frozenScales});}part.position.set(o.x*S,ground(o.x,o.z),o.z*S);part.rotation.y=o.angle;part.scale.setScalar(S);part.userData.motionKey=o.id;part.userData.gardenItemId=o.gardenItem.id;part.userData.purpose=o.gardenItem.purpose;part.userData.simulation=o.gardenItem.simulation;resultGardenItems.push(part);continue;}
  if(o.model){await asset(g,o.model,o.x,o.z,dimensions[o.model].width,o.angle);g.children.at(-1).position.y+=ground(o.x,o.z);g.children.at(-1).userData.motionKey=o.id;continue;}
  const part=new T.Group();part.position.set(o.x*S,ground(o.x,o.z),o.z*S);part.rotation.y=o.angle;part.userData.motionKey=o.id;g.add(part);
  if(o.items){await drawDomesticGroup(part,o,S,item=>ground(o.x+item.x*Math.cos(o.angle)+item.z*Math.sin(o.angle),o.z-item.x*Math.sin(o.angle)+item.z*Math.cos(o.angle))-ground(o.x,o.z));}
  else if(o.role==='enclosure'){
   const fence=enclosureAsset(o.w,o.d);if(variants)applyVariant(fence,'enclosure',{seed:plan.seed,stage:variantStage});part.add(fence);part.userData.variant=fence.userData.variant;
   // An actual open gate lies on the access path, facing the shared yard.
   if(!options.managed)await asset(part,'water-trough-full',o.w/2-3,0,3);
   if(!options.managed)for(let i=0;i<2;i++)await asset(part,i?'cow-idle':'horse-idle',i?4:-4,-2,2.8,i*2);
  }else if(o.role==='sugar-shack'){const shack=sugarShack({seed:plan.seed??1});shack.scale.setScalar(S);part.add(shack);part.userData.inspect=shack.userData.inspect;
  }else if(o.role==='playground'){const play=playground(o.level);play.scale.multiplyScalar(S);part.add(play);part.userData.inspect=play.userData.inspect;
  }else if(o.role==='field'){
   if(!tile.garden){for(let row=0;row<4;row++){const z=-o.d*S*.35+row*o.d*S*.23;box(part,0,.025,z,o.w*S,.045,.17,'#816349');for(let j=0;j<6;j++)box(part,-o.w*S*.4+j*o.w*S*.16,.08,z,.055,.1,.07,row%2?'#68814e':'#789455');}}else{const planting=gardenPlanting(o.w,o.d,tile.garden);part.userData.garden=planting.settings;part.userData.inspect={title:planting.settings.facet+' garden',kind:'Working garden',description:planting.plants.length+' plantings per bed · '+planting.settings.variety+' planting variants. Garden tending uses the existing ranch activity system.'};
   for(let row=0;row<planting.rows;row++){const z=(row/(planting.rows-1)-.5)*o.d*S*.75;box(part,0,.025,z,o.w*S,.045,Math.min(.17,o.d*S/planting.rows*.65),'#816349');}
   for(const plant of planting.plants){if(plant.asset){const model=await regionalAsset(plant.asset),bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());model.scale.multiplyScalar(Math.min(1,plant.spacing*S/Math.max(size.x,size.z,.001)));model.position.set(plant.x*S,.05,plant.z*S);part.add(model);}else box(part,plant.x*S,.08,plant.z*S,.055,.07+plant.variant*.012,.07,['#68814e','#789455','#8f934c','#5b7956','#b3a064'][plant.variant]);}}
  }else if(o.role==='water'){
   const shore=mesh(new T.CylinderGeometry(o.w*S/2,o.w*S/2+.12,.06,40),'#b5ad83');shore.scale.z=o.d/o.w;shore.position.y=.03;part.add(shore);
   const water=mesh(new T.CylinderGeometry(o.w*S/2-.15,o.w*S/2-.15,.025,40),'#6dabb3');water.scale.z=o.d/o.w;water.position.y=.075;part.add(water);
  }
 }
 if(plan.gardenSource){const art=await getGardenArt(),context=new T.Group(),angle=(plan.rotation||0)*Math.PI/3;context.rotation.y=angle;context.scale.setScalar(S);await art.drawContext(context,{...plan.gardenSource,routes:plan.paths.map(r=>({...r,points:r.points.map(p=>({x:p.x*Math.cos(angle)-p.z*Math.sin(angle),z:p.x*Math.sin(angle)+p.z*Math.cos(angle)}))}))},(x,z)=>heightAt(plan.center.x+x*Math.cos(angle)+z*Math.sin(angle),plan.center.z-x*Math.sin(angle)+z*Math.cos(angle)));g.add(context);}
 const coast=heightAt.coasts?.find(c=>c.id===plan.id);const dressing=dressingPlan(plan,landscapeSettings(board),heightAt).filter(d=>{if(!coast)return true;const p={x:plan.center.x+d.x,z:plan.center.z+d.z};return !heightAt.isWater(p.x,p.z)&&coast.wetPolygon.every((a,i)=>segmentDistance(p,a,coast.wetPolygon[(i+1)%coast.wetPolygon.length])>(d.kind==='tree'?7:1.5));});plan.dressingCounts={};plan.plantedAssets=[];const richness=board.landscape?.biodiversity??3;
 for(const d of dressing){plan.dressingCounts[d.kind]=(plan.dressingCounts[d.kind]||0)+1;const y=ground(d.x,d.z);
  if(options.managed&&(d.kind==='tree'&&plan.dressingCounts.tree%3===0||d.kind==='shrub'||d.kind==='grass'&&plan.dressingCounts.grass%(richness>2?9:28)===0)){
   const n=plan.dressingCounts[d.kind],trees=d.habitat==='woodland'?['WW-140','WW-147','WW-148']:['WW-139','WW-151'],shrubs=['WW-046','GF-159','WW-273','GF-158'],flowers=['UP-051','WW-347','GF-679','GF-250','GF-249','GF-634','GF-567','WW-528','GF-235'];
   const pick=pool=>pool[(n+Math.abs(Math.floor(d.x/7)))%Math.min(pool.length,Math.max(1,richness*3))];
   const id=d.kind==='tree'?(plan.placements.some(o=>o.role==='home'&&Math.hypot(o.x-d.x,o.z-d.z)<22)?'GF-153':pick(trees)):d.kind==='shrub'?pick(shrubs):pick(flowers);
   if(!plan.plantedAssets.includes(id))plan.plantedAssets.push(id);
   const plant=await regionalAsset(id);plant.position.set(d.x*S,y,d.z*S);plant.rotation.y=d.angle;plant.scale.multiplyScalar(d.size*(richness===4?1.15:1));g.add(plant);continue;
  }
  if(options.managed&&d.kind==='prop'&&d.model==='wood-partial'){const edge=await regionalAsset('GF-010');edge.position.set(d.x*S,y,d.z*S);edge.rotation.y=d.angle;g.add(edge);continue;}
  if(d.kind==='tree'||d.kind==='prop'){await asset(g,d.model||'tree-standing',d.x,d.z,5,d.angle);const wrapper=g.children.at(-1);wrapper.position.y+=y;if(d.kind==='tree')wrapper.scale.multiplyScalar(d.size);continue;}
  const tuft=new T.Group();tuft.userData.inspect={title:{shrub:'Low shrub',rock:'Field stone',grass:'Grass tuft'}[d.kind]||d.kind,kind:'Landscape',description:{shrub:'Low cover in open ground away from paths.',rock:'A small stone cluster in the ranch landscape.',grass:'Ground cover placed outside paths and building clearances.'}[d.kind]};tuft.position.set(d.x*S,y,d.z*S);tuft.rotation.y=d.angle;g.add(tuft);
  const dressing=dressingAsset(d.kind,d.size);if(variants)applyVariant(dressing,d.kind,{seed:Math.floor(d.x*13+d.z*7),stage:variantStage});tuft.add(dressing);tuft.userData.variant=dressing.userData.variant;
 }
 if(type==='ranch'&&!options.managed)for(const [i,id]of ['abbie-idle','ani-idle','daddy-idle'].entries()){const x=plan.hub.x-3+i*3,z=plan.hub.z+2;await asset(g,id,x,z,.6);g.children.at(-1).position.y+=ground(x,z);}
 // Keep a small set of semantic pieces; dense dressing remains sector-batched.
 const result=new T.Group(),sectors=Array.from({length:6},()=>new T.Group());
 for(const child of [...g.children]){
  if(child.userData.npcMotion){result.add(child);continue;}
  if(child.userData.motionKey){g.remove(child);const pos=child.position.clone(),rot=child.rotation.clone(),scale=child.scale.clone(),key=child.userData.motionKey;child.position.set(0,0,0);child.rotation.set(0,0,0);child.scale.set(1,1,1);const piece=batchTile(child);piece.position.copy(pos);piece.rotation.copy(rot);piece.scale.copy(scale);piece.userData.motionKey=key;piece.userData.inspect=child.userData.inspect;piece.userData.asset=child.userData.asset;piece.userData.variant=child.userData.variant;result.add(piece);}
  else if(child.isGroup){const sector=Math.floor((Math.atan2(child.position.z,child.position.x)+Math.PI)/(Math.PI/3))%6;sectors[sector].add(child);}
 }
 result.add(batchTile(g));for(const part of resultGardenItems)result.add(part);sectors.forEach((sector,i)=>{if(sector.children.length){const piece=batchTile(sector,{inertiaParts:true});piece.userData.motionKey='dressing-'+i;result.add(piece);}});await drawCoastalWater(result,plan,heightAt,S);return result;
}

 for(const id of ['shelter-complete','family-home-complete','feed-store-complete']){const model=await template(id),size=new T.Box3().setFromObject(model).getSize(new T.Vector3());dimensions[id]=modelDimensions(id,size);dimensions[id].width=dimensions[id].w;}
 return {dimensions,normalization,async prepareModels(ids){for(const id of ids){const model=await template(id),size=new T.Box3().setFromObject(model).getSize(new T.Vector3());dimensions[id]=modelDimensions(id,size);dimensions[id].width=dimensions[id].w;}},async model(id,override){const g=new T.Group();await asset(g,id,0,0,1,0,override);return g.children[0];},async gardenDimensions(){const art=await getGardenArt();await art.refreshDimensions();Object.assign(dimensions,art.dimensions);Object.assign(normalization,art.normalization);return art.dimensions;},async tree(){const g=new T.Group();await asset(g,'tree-standing',0,0,5);return g;},async draw(tile,plan,options={}){frozenScales=options.normalization||null;board={landscape:options.landscape||{height:0,vegetation:2,props:1}};heightAt=options.heightAt||(()=>0);const result=await content(tile,plan,options);plan.renderedDimensions=structuredClone(dimensions);return result;},dispose};
}
