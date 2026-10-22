/** Metres, Y up. Static composition only: no economic or navigation capabilities. */
export function rng(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619);return()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const PRESETS=['activity-court','sheltered-edge','open-commons'];
export function registry(catalog){return catalog.biomes.map(b=>({id:b.id,label:b.label,generator:'biome-atmosphere',version:1,expandedPath:'/tile-generator/'+b.id,presets:[...PRESETS]}));}
function seg(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function hexContains(p,radius,margin){for(let i=0;i<6;i++){const angle=i*Math.PI/3;if(p.x*Math.cos(angle)+p.z*Math.sin(angle)>radius*Math.cos(Math.PI/6)-margin)return false;}return true;}
export function compose(catalog,{biome,seed=43,preset='activity-court'}={}){
 const b=catalog.biomes.find(x=>x.id===biome);if(!b)throw Error('Unknown biome');if(!PRESETS.includes(preset))throw Error('Unknown preset');if(!['string','number'].includes(typeof seed)||String(seed).length>120||typeof seed==='number'&&!Number.isFinite(seed))throw Error('Invalid seed');
 const radius=50,random=rng(seed+'|'+biome),placements=[],rejections=[];
 // A broad north/south lane and an open central court remain reserved.
 const routes=[{id:'arrival-lane',a:{x:0,z:-43},b:{x:0,z:43},width:5,verified:false}];
 const groups=preset==='sheltered-edge'?[[-13,-10],[-13,9],[12,10]]:preset==='open-commons'?[[-16,-9],[16,-9],[9,18]]:[[-12,-10],[12,-7],[-12,12]];
 b.assetIds.forEach((id,i)=>{const asset=catalog.assets[id];if(!asset||!Number.isFinite(asset.radius)||asset.radius<=0){rejections.push({id,reason:'Missing measured dependency'});return;}
  const group=Math.floor(i/2),anchor=groups[group%groups.length],size=asset.radius;
  let accepted=false;
  for(let attempt=0;attempt<18;attempt++){
   const gardenSites=[[-16,-14],[-9,-3],[10,-8],[12,12],[-13,23],[8,4],[-10,1]];
   const site=biome==='garden-farm'?gardenSites[i]:null;
   const p=site?{x:site[0]+(random()-.5)*.6,z:site[1]+(preset==='sheltered-edge'?-2:preset==='open-commons'?2:0)+(random()-.5)*.6}:{x:anchor[0]+(i%2?7:-3)+(random()-.5)*3,z:anchor[1]+(i%2?6:-3)+(random()-.5)*3};
   if(!hexContains(p,radius,size+1)||Math.hypot(p.x,p.z)<size+7||routes.some(c=>seg(p,c.a,c.b)<size+c.width/2+1)||placements.some(q=>Math.hypot(p.x-q.position.x,p.z-q.position.z)<size+q.radius+1))continue;
   const entry=asset.anchors?.find(a=>a.id==='entry'&&Math.hypot(a.position.x,a.position.z)>0.1);
   const yaw=Math.atan2(-p.x,-p.z)-(entry?Math.atan2(entry.position.x,entry.position.z):0),placementId=biome+'/'+i;
   let entrance=null,approach=null,branches=[];
   if(entry){
    const e=entry.position;entrance={x:p.x+e.x*Math.cos(yaw)+e.z*Math.sin(yaw),y:e.y,z:p.z-e.x*Math.sin(yaw)+e.z*Math.cos(yaw)};
    const length=Math.hypot(entrance.x-p.x,entrance.z-p.z),distance=Math.max(size+1,length+1);
    approach={x:p.x+(entrance.x-p.x)/length*distance,z:p.z+(entrance.z-p.z)/length*distance};
    branches=[{id:placementId+'/threshold',a:{x:entrance.x,z:entrance.z},b:approach,width:1.6,owner:placementId,verified:false},{id:placementId+'/approach',a:approach,b:{x:0,z:approach.z},width:1.6,owner:placementId,verified:false}];
    if(branches.some(r=>placements.some(q=>seg(q.position,r.a,r.b)<q.radius+r.width/2+.25)))continue;
   }
   placements.push({id:placementId,assetId:id,position:{...p,y:0},yaw,scale:1,radius:size,group:'activity-'+group,intent:b.intent,pivot:'horizontal-bounds-center / ground-minimum',entrance,approach,entranceSource:entry?{assetId:id,anchorId:entry.id,sha256:asset.sha256}:null});routes.push(...branches);accepted=true;break;
  }
  if(!accepted)rejections.push({id,reason:'No safe space: preserve lane, commons and measured bounds'});
 });
 const fields=[];
 if(biome==='garden-farm'){
  // Repeated crop instances form actual cultivation groups, never new base assets.
  for(const [fi,assetId,cx,cz] of [[0,'GF-004',12,16],[1,'GF-031',-13,23]]){
   const a=catalog.assets[assetId];if(!a)continue;let count=0;
   const access={id:'cultivation-'+fi+'/access',a:{x:cx-Math.sign(cx)*4.1,z:cz},b:{x:0,z:cz},width:1.6,verified:false};
   if(!placements.some(q=>seg(q.position,access.a,access.b)<q.radius+access.width/2+.25))routes.push(access);

   for(let row=0;row<5;row++)for(let col=0;col<4;col++){
    const position={x:cx+(col-1.5)*1.95,y:0,z:cz+(row-2)*1.95};
    if(!hexContains(position,radius,a.radius+1)||routes.some(r=>seg(position,r.a,r.b)<a.radius+r.width/2+1)||placements.some(q=>Math.hypot(position.x-q.position.x,position.z-q.position.z)<a.radius+q.radius+1))continue;
    placements.push({id:`garden-field-${fi}-${row}-${col}`,assetId,position,yaw:0,scale:1,radius:a.radius,group:'cultivation-'+fi,intent:fi?'Fiber and flowering flax rows':'Household onion harvest rows',pivot:'horizontal-bounds-center / ground-minimum',instanceOnly:true});count++;
   }
   if(count)fields.push({id:'cultivation-'+fi,x:cx,z:cz,w:8.2,d:10.2,instances:count,visualOnly:true});
  }
 }
 return {schemaVersion:1,biome,seed,preset,units:'metres',radius,cells:[{q:0,r:0}],environment:b.environment,intent:b.intent,fields,terrain:{type:b.environment==='interior'?'cutaway-floor':'continuous-hex',height:0,relief:biome==='garden-farm'?'garden-support-blend-v1':'flat prototype; Board terrain adaptation required',maxReliefMetres:biome==='garden-farm'?2.6:0},routes,placements,rejections,ports:[],capabilities:[],dependencies:placements.map(p=>({id:p.assetId,sha256:catalog.assets[p.assetId].sha256})),limitations:['Static composition; no crafting, rewards, collision or verified entrance joins','No relief inferred; placement grounded on flat support','Scene must receive visual review and Board adapter registration before release']};
}
export function makeCard(plan,{id,name,rendition}={}){if(!id||!name||!rendition||!rendition.scene)throw Error('Actual rendered scene, stable id and name required');return{schemaVersion:1,id,revision:1,name,units:'metres',cells:plan.cells.map(c=>({...c})),recipe:{type:plan.biome,generator:'biome-atmosphere',version:1,seed:plan.seed,preset:plan.preset,tiles:[{q:0,r:0,biome:plan.biome,placements:structuredClone(plan.placements),routes:structuredClone(plan.routes),fields:structuredClone(plan.fields??[]),terrain:structuredClone(plan.terrain)}]},rendition,ports:[],capabilities:[],storageScope:'this-browser'};}
export function atmosphere({environment='earth',seed=43,time='night',weather='clear',intensity=.5,reducedMotion=false}={}){
 if(!['earth','vacuum','interior'].includes(environment)||!['day','dusk','night'].includes(time)||!['clear','clouds','rain','snow','mist'].includes(weather)||!Number.isFinite(intensity)||intensity<0||intensity>1)throw Error('Invalid atmosphere controls');
 const random=rng('sky|'+seed),effective=environment==='earth'?weather:'clear',night=time==='night',hidden=environment==='interior';
 const stars=night&&!hidden?Array.from({length:180},(_,i)=>{const a=random()*Math.PI*2,e=.15+random()*1.25;return{id:'star-'+i,position:{x:Math.cos(a)*Math.cos(e)*110,y:Math.sin(e)*110,z:Math.sin(a)*Math.cos(e)*110},size:.12+random()*.22};}):[];
 const clouds=effective!=='clear'&&!hidden?Array.from({length:Math.ceil(3+intensity*6)},(_,i)=>({id:'cloud-'+i,position:{x:(random()-.5)*65,y:19+random()*7,z:-15-random()*30},scale:3+random()*3,phase:random()*6.28})):[];
 const particles=['rain','snow'].includes(effective)?Array.from({length:Math.round(80+intensity*160)},()=>({x:(random()-.5)*85,y:random()*40+2,z:(random()-.5)*85})):[];
 return{schemaVersion:1,environment,seed,time,requestedWeather:weather,weather:effective,intensity,reducedMotion,stars,clouds,particles,moon:night&&!hidden?{position:{x:-14,y:21,z:-18},radius:2}:null,windMetresPerSecond:reducedMotion?0:1.5*intensity,fog:effective==='mist'?{near:65,far:190}:null,uniqueBaseIncrement:0,gameplayEffects:[],notes:environment!=='earth'&&weather!=='clear'?['Atmospheric weather suppressed outside terrestrial exterior']:[]};
}
/** Board composer bridge. Entrances remain unknown unless supplied by source metadata. */
export function composerPlan(plan,catalog){return{id:plan.biome+'-'+plan.seed,type:plan.biome,center:{x:0,z:0},hub:{x:0,z:0},ports:[],paths:plan.routes.map(r=>({kind:'footpath',width:r.width,points:[r.a,r.b],verified:false})),placements:plan.placements.map(p=>{const a=catalog.assets[p.assetId];return{id:p.id,role:p.group,x:p.position.x,z:p.position.z,angle:p.yaw,w:a.dimensionsMetres[0],d:a.dimensionsMetres[1],radius:p.radius,door:p.entrance??null,approach:p.approach??null,items:[{asset:a.id,x:0,y:0,z:0,angle:0,purpose:p.intent,sourceSha256:a.sha256}],internalPaths:[],inputs:[],outputs:[],entranceStatus:p.entrance?'source anchor mapped; traversal unverified':'unverified; source anchor mapping required'};}),fields:structuredClone(plan.fields??[]),terrain:structuredClone(plan.terrain),environment:plan.environment,seed:plan.seed,capabilities:[],limitations:plan.limitations};}
