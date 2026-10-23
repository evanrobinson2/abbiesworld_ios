import {seeded} from './worksite-layout.mjs';
import './procedural-engine.js';
import './terrain-presets.js';
import {GARDEN_CONTRACT,describeGarden} from './scene-semantics.js';
const terrainAPI=globalThis.TerrainPresets,engine=globalThis.ProceduralRanch;
export const GARDEN_LAYOUTS={court:'Kitchen backyard',spine:'Market garden',split:'Two garden rooms',terraces:'Wide growing rows'};
export const DEFAULT_GARDEN={seed:41,terrain:'meadow-clearing',layout:'court',beds:8,carved:true};
export const GARDEN_ASSETS=['garden-growing-plot','feed-store-complete','water-trough-full','compost-full','water-bucket-full','wood-full','tree-standing','abbie-work'];
const R=50,A=R*Math.sqrt(3)/2,rules=GARDEN_CONTRACT.rules;
export function inHex(x,z,margin=0){for(let i=0;i<6;i++)if(x*Math.cos(i*Math.PI/3)+z*Math.sin(i*Math.PI/3)>A-margin+1e-7)return false;return true;}
export function normalizeGarden(input={}){const p={...DEFAULT_GARDEN,...input};if(!Number.isInteger(p.seed)||p.seed<1||p.seed>4294967295)throw Error('Enter a whole seed from 1 to 4294967295.');if(!GARDEN_LAYOUTS[p.layout])throw Error('Unknown garden arrangement.');if(![8,12].includes(p.beds))throw Error('Choose 8 or 12 growing plots.');if(p.terrain!=='working-surface'&&!terrainAPI.get(p.terrain))throw Error('Unknown terrain prefab.');return p;}
export function gardenTerrain(recipe){if(recipe.terrain==='working-surface')return {height:()=>0,sample:()=>({height:0,grade:0,bank:Infinity}),datum:0,world:{vegetation:[]},provider:{kind:'level-working-surface',placementVerification:'required'}};const terrainRecipe=terrainAPI.recipe(recipe.terrain,recipe.seed,{spacing:2.5}),world=terrainAPI.generate(terrainRecipe),datum=engine.sample(world,90,90);
 const height=(x,z)=>engine.sample(world,x+90,90-z)-datum;
 const sample=(x,z)=>{const h=height(x,z),dx=(height(x+.5,z)-height(x-.5,z)),dz=(height(x,z+.5)-height(x,z-.5));return {height:h,grade:Math.hypot(dx,dz),bank:Math.abs(90-z-engine.brookY(world,x+90))-world.water.brook.width/2};};
 return {world,recipe:terrainRecipe,datum,height,sample};
}
function rectangle(item,pad=0){return {x0:item.x-item.w/2-pad,x1:item.x+item.w/2+pad,z0:item.z-item.d/2-pad,z1:item.z+item.d/2+pad};}
function overlaps(a,b,pad=0){a=rectangle(a,pad);b=rectangle(b);return a.x0<b.x1&&a.x1>b.x0&&a.z0<b.z1&&a.z1>b.z0;}
function contains(o,x,z,pad=0){const b=rectangle(o,pad);return x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1;}
function footprintSamples(item,terrain){const out=[],nx=Math.ceil(item.w),nz=Math.ceil(item.d);for(let ix=0;ix<=nx;ix++)for(let iz=0;iz<=nz;iz++){const x=item.x-item.w/2+item.w*ix/nx,z=item.z-item.d/2+item.d*iz/nz;out.push({x,z,...terrain.sample(x,z)});}return out;}
function footprint(item,terrain){return footprintSamples(item,terrain).every(s=>inHex(s.x,s.z,2)&&s.bank>=rules.bankBuffer&&s.grade<=(item.role==='bed'?rules.maxBedGrade:rules.maxBuildingGrade));}
// Outdoor rooms come first; beds share their cultivation aisles.
function bedPattern(layout,count,bed,seed=41){
 const rng=seeded(seed),dx=bed.w+1.6,dz=bed.d+2.2,out=[];
 const block=(number,cols,cx,cz,room)=>{
  let remaining=number,row=0;const rows=[];
  while(remaining){const length=Math.min(remaining,Math.max(2,cols+(rng()<.4?-1:0)));rows.push(length);remaining-=length;}
  let z=cz-(rows.length-1)*dz/2;
  for(const length of rows){const setback=(rng()-.5)*dx*1.5;for(let col=0;col<length;col++)out.push({x:cx+(col-(length-1)/2)*dx+setback,z,room,row});row++;z+=dz+rng()*.6;}
 };
 if(layout==='court')block(count,3,-1,-6,'kitchen');
 if(layout==='spine')block(count,2+(seed%2),-2,-8,'market');
 if(layout==='split'){const first=Math.floor(count/2)+(seed%3-1);block(first,2,-9,-3,'daily');block(count-first,2,5,-10,'keeping');}
 if(layout==='terraces')block(count,4,-1,-8,'rows');
 return out;
}
// Grid routes validate their full width against obstacles, protected water and grade.
export function findRoute(start,end,items,terrain,width,maxGrade){
 const size=101,key=(x,z)=>(z+50)*size+x+50,decode=k=>({x:k%size-50,z:Math.floor(k/size)-50}),sx=Math.round(start.x),sz=Math.round(start.z),ex=Math.round(end.x),ez=Math.round(end.z),startKey=key(sx,sz),endKey=key(ex,ez),open=new Set([startKey]),g=new Map([[startKey,0]]),prev=new Map(),cache=new Map();
 function free(x,z){const k=key(x,z);if(cache.has(k))return cache.get(k);let ok=inHex(x,z,width/2+.1)&&!items.some(o=>contains(o,x,z,width/2+.15));if(ok)for(const [dx,dz]of [[0,0],[width/2,0],[-width/2,0],[0,width/2],[0,-width/2]]){const s=terrain.sample(x+dx,z+dz);if(s.bank<rules.bankBuffer||s.grade>maxGrade){ok=false;break;}}cache.set(k,ok);return ok;}
 if(!free(sx,sz)||!free(ex,ez))return null;
 while(open.size){let current,best=Infinity;for(const k of open){const p=decode(k),score=g.get(k)+Math.hypot(p.x-ex,p.z-ez);if(score<best){best=score;current=k;}}if(current===endKey){const points=[];for(let k=current;k!==undefined;k=prev.get(k))points.unshift(decode(k));return points;}
 open.delete(current);const p=decode(current);for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=p.x+dx,z=p.z+dz;if(!free(x,z)||dx&&dz&&(!free(p.x+dx,p.z)||!free(p.x,p.z+dz)))continue;const k=key(x,z),cost=g.get(current)+Math.hypot(dx,dz);if(cost<(g.get(k)??Infinity)){g.set(k,cost);prev.set(k,current);open.add(k);}}
 }return null;
}
export function composeGarden(input,dimensions,terrainOverride){
 const recipe=normalizeGarden(input),terrain=terrainOverride||gardenTerrain(recipe),bed=dimensions['garden-growing-plot'];if(!bed)throw Error('Normalized garden assets are not loaded.');
 const patterns=bedPattern(recipe.layout,recipe.beds,bed,recipe.seed),proposals=[];
 const make=(id,role,model,x,z,purpose,activities)=>{const d=dimensions[model];if(!d)throw Error('Missing normalized asset '+model);return {id,role,model,x,z,w:d.w,d:d.d,h:d.h,purpose,activities,simulation:'planned',orientation:0};};
 for(const ox of [0,-4,4])for(const oz of [0,5,-4]){
  const plots=patterns.map((p,i)=>({...make('bed-'+i,'bed','garden-growing-plot',p.x+ox,p.z+oz,'Plant, tend and harvest food',['plant','water','tend','harvest','compost']),room:p.room,row:p.row}));
  const back=Math.max(...plots.map(p=>p.z+p.d/2))+7;
  const items=[...plots,make('produce-store','storage','feed-store-complete',-9+ox,back,'Shared garden shed: harvest storage and household collection',['store','dispatch']),
   {id:'tool-store',role:'tool-store',model:null,x:-13+ox,z:back+4.5,w:1.6,d:.6,h:1.5,purpose:'Keep tending tools along the shed workcourt',activities:['tend'],simulation:'planned',orientation:0},
   {id:'seed-store',role:'seed-store',model:null,x:-5.5+ox,z:back+5.5,w:2.4,d:1.2,h:1.8,purpose:'Keep saved seed beside the shed and sorting bench',activities:['plant','save-seed'],simulation:'planned',orientation:0},
   make('water-point','water','water-trough-full',Math.max(...plots.map(p=>p.x+p.w/2))+5,back-4,'Water at the transition from workcourt to growing aisles; supply undecided',['water']),
   make('compost','compost','compost-full',Math.min(...plots.map(p=>p.x-p.w/2))-3,Math.min(...plots.map(p=>p.z)),'Return garden residues at the peripheral service edge',['compost','amend']),
   {id:'packing',role:'packing',model:null,x:-3+ox,z:back+1,w:3,d:1.4,h:.9,purpose:'Sort harvest and save seed beside the shared shed',activities:['harvest','save-seed','store'],simulation:'planned',orientation:0}];
  const hub={x:2+ox,z:Math.round(back+5)},arrival={x:20,z:34};
  const yard={id:'workcourt',purpose:'Shared standing and carrying space between shed, packing, tools and seeds',x:-5+ox,z:back+4,w:19,d:8};
  if(!inHex(hub.x,hub.z,3)||!inHex(arrival.x,arrival.z,2)||items.some(o=>!footprint(o,terrain))||items.some((o,i)=>items.slice(i+1).some(q=>overlaps(o,q,1.2))))continue;
  const score=items.reduce((sum,o)=>sum+terrain.sample(o.x,o.z).grade,0)+Math.abs(ox)*.001+Math.abs(oz)*.001;proposals.push({items,plots,hub,arrival,yard,score});
 }
 proposals.sort((a,b)=>a.score-b.score);let chosen,routes;
 for(const p of proposals){
  const paths=[],arrivalPath=findRoute(p.arrival,p.hub,p.items,terrain,rules.cartWidth,rules.maxCartGrade);if(!arrivalPath)continue;
  let boundaryClear=true;for(let k=0;k<=12;k++){const f=k/12,x=21.650635+(p.arrival.x-21.650635)*f,z=37.5+(p.arrival.z-37.5)*f;for(const dx of [-rules.cartWidth/2,0,rules.cartWidth/2]){const v=terrain.sample(x+dx,z);if(v.bank<rules.bankBuffer||v.grade>rules.maxCartGrade)boundaryClear=false;}}if(!boundaryClear)continue;
  paths.push({id:'service-arrival',purpose:'Household arrival and harvest collection',traffic:'cart',surface:'worn',width:rules.cartWidth,points:[{x:21.650635,z:37.5},...arrivalPath],from:'arrival',to:'yard'});
  // Attach to existing circulation, never cast another route from the yard to each prop.
  const connect=(end,width,maxGrade)=>{const candidates=paths.flatMap(r=>r.points.slice(1,-1).map(point=>({point,from:r.id}))).concat([{point:p.hub,from:'yard'}]).sort((a,b)=>Math.hypot(a.point.x-end.x,a.point.z-end.z)-Math.hypot(b.point.x-end.x,b.point.z-end.z));
   for(const c of candidates.slice(0,24)){const points=findRoute(c.point,end,p.items,terrain,width,maxGrade);if(points)return {points,from:c.from};}return null;};
  let failed=false;
  const rooms=[...new Set(p.plots.map(o=>o.room))];
  for(const room of rooms){const beds=p.plots.filter(o=>o.room===room),right=Math.ceil(Math.max(...beds.map(o=>o.x+o.w/2))+2),rowIds=[...new Set(beds.map(o=>o.row))].reverse();
   for(const row of rowIds){const members=beds.filter(o=>o.row===row),z=Math.round(members[0].z+members[0].d/2+1.1),entry={x:right,z},link=connect(entry,rules.walkingWidth,rules.maxWalkingGrade);
    if(!link){failed=true;break;}paths.push({id:'lane-'+room+'-'+row,...link,to:room,traffic:'pedestrian',surface:'aisle',width:rules.walkingWidth,purpose:'Shared garden circulation'});
    const points=findRoute(entry,{x:Math.floor(Math.min(...members.map(o=>o.x))),z},p.items,terrain,rules.bedAccessWidth,rules.maxWalkingGrade);
    if(!points){failed=true;break;}paths.push({id:'aisle-'+room+'-'+row,from:'lane-'+room+'-'+row,to:'beds',traffic:'pedestrian',surface:'soil',width:rules.bedAccessWidth,points,purpose:'Shared tending aisle for a row of beds'});
   }if(failed)break;
  }
  if(failed)continue;
  for(const o of p.items){const width=o.role==='bed'?rules.bedAccessWidth:rules.walkingWidth,door={x:o.x,z:o.z+o.d/2},approach={x:Math.round(o.x),z:o.role==='bed'?Math.round(door.z+1.1):Math.ceil(door.z+width/2+.2)},link=connect(approach,width,rules.maxWalkingGrade);if(!link){failed=true;break;}
   o.door=door;o.interaction=approach;paths.push({id:'access-'+o.id,...link,to:o.id,traffic:'pedestrian',surface:'threshold',width,purpose:o.purpose,points:[...link.points,door]});
  }
  if(!failed){chosen=p;routes=paths;break;}
 }
 if(!chosen)throw Error('This terrain or model size cannot fit the requested garden with clear, gentle access. Try Meadow Clearing, 8 plots, or another arrangement.');
 for(const o of chosen.items){const heights=footprintSamples(o,terrain).map(s=>s.height);o.assetComposition=o.role==='bed'?{bedAsset:'GF-002',beds:1,cropAssets:['GF-003','GF-004','GF-005'],units:'metres',scale:1}:null;o.y=Math.max(...heights);o.foundationDepth=o.y-Math.min(...heights);o.reason=o.role==='bed'?'Gentle dry ground; access reserved around growing plot':o.role==='compost'?'Beside production, separate from packing':o.role==='storage'?'Beside collection yard and cart access':'Connected to garden work routes';}
 const provider=terrain.provider||terrainAPI.provider(terrain.world,{prefabId:recipe.terrain,maxBuildGrade:rules.maxBuildingGrade,bankBufferMetres:rules.bankBuffer});
 const result={schema:'ranch-atelier/composed-scene',schemaVersion:'1.0.0',generatorVersion:'garden-farm/2.0.0',recipe,semantics:GARDEN_CONTRACT,terrain:provider,verticalDisplayOffset:-(terrain.datum||0),items:chosen.items,areas:[chosen.yard],layoutIntent:'Shared workcourt and coherent growing rooms; narrow common aisles with short unpaved thresholds',routes,hub:chosen.hub,arrival:{x:21.650635,z:37.5},interfaces:[{id:'arrival',status:'candidate',neighborCompatibility:'unknown',traffic:['pedestrian','cart'],widthMetres:3}],
  grammar:{production:'garden -> household-arrival + shed-workcourt + growing-rooms + shared-aisles + peripheral-compost + terrain',sentence:describeGarden({beds:recipe.beds,layout:GARDEN_LAYOUTS[recipe.layout].toLowerCase(),terrain:recipe.terrain==='working-surface'?'Board working surface':terrainAPI.get(recipe.terrain).name,connections:1})},
  dependencies:[{id:'brief',dependsOn:[]},{id:'terrain',dependsOn:['brief']},{id:'normalized-assets',dependsOn:['brief']},{id:'working-layout',dependsOn:['terrain','normalized-assets']},{id:'traffic',dependsOn:['working-layout']},{id:'hex-cut',dependsOn:['traffic']},{id:'validation',dependsOn:['hex-cut']}],
  validation:{status:'satisfied',checks:['essential footprints inside final hex','dry ground and authored slope limits','nonoverlapping full normalized footprints','all workstations connected to arrival'],unknown:['soil bearing','water yield','food production capacity','seasonal behavior','compatibility with neighboring terrain']},
  purposePolicy:'Every asset has a purpose; landscape dressing is explicitly decoration. No production simulation is claimed.'};
 return result;
}
// Sutherland-Hodgman clipping is applied after composition, never to essential assets.
export function clipHex(polygon){let out=polygon;for(let i=0;i<6;i++){const nx=Math.cos(i*Math.PI/3),nz=Math.sin(i*Math.PI/3),next=[];for(let j=0;j<out.length;j++){const a=out[j],b=out[(j+1)%out.length],da=A-a.x*nx-a.z*nz,db=A-b.x*nx-b.z*nz;if(da>=-1e-9)next.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);next.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});}}out=next;}return out;}
