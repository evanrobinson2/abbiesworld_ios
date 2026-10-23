import {axial} from './tile-expansion.mjs';
// Seeded visual succession and working edges. These are art rules, not an ecology simulation.
export function seedForHex(seed,id){let n=seed>>>0;for(const c of String(id))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;}
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function distance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
export function planStorybookDressing({seed,id,type,diameter=100,paths=[]}){
 const random=rng(seedForHex(seed,id)),radius=diameter/2,items=[],features=[];
 const clear=p=>{const x=Math.abs(p.x),z=Math.abs(p.z);if(x>radius*.82||z>radius*.92||Math.sqrt(3)*z+x>radius*1.68)return false;if(type!=='meadow'&&x<diameter*.32&&z<diameter*.21)return false;return !paths.some(path=>(path.points||[]).slice(1).some((b,i)=>distance(p,path.points[i],b)<(path.width||3)/2+2.2));};
 const put=(kind,x,z,scale=1,story='')=>{const p={kind,x,z,scale,cell:[Math.floor(x/5),Math.floor(z/5)],turn:random()*Math.PI*2,variation:random(),story};if(clear(p))items.push(p);};
 // Meadow has no hero footprint: broad habitat drifts and breathing space carry its identity.
 if(type==='meadow'){
  const phase=random()*Math.PI*2,phase2=random()*Math.PI*2;
  const variant=seedForHex(seed,id)%4,habitatName=['Pond meadow','Wet meadow','Flower meadow','Dry meadow'][variant],patches=[];
  const patch=(kind,x,z,rx,rz)=>{const p={kind,x,z,rx,rz,phase:random()*6.28};const footprint=[p,...Array.from({length:32},(_,i)=>({x:x+Math.cos(i*Math.PI/16)*rx*1.18,z:z+Math.sin(i*Math.PI/16)*rz*1.18}))];if(footprint.every(clear))patches.push(p);};
  // Habitat is composed in broad masses that remain legible at board scale.
  for(let i=0;i<4;i++)patch(variant===3?'dry':'sward',(random()-.5)*diameter*.4,(random()-.5)*diameter*.4,diameter*(.12+random()*.07),diameter*(.08+random()*.05));
  if(variant<2){for(const [x,z]of [[-.12,-.05],[.13,.14],[-.15,.19],[.12,-.2]]){const count=patches.filter(p=>p.kind==='water').length;if(count>=(variant===0?1:2))break;patch('water',x*diameter,z*diameter,diameter*(variant===0?.16:.105),diameter*(variant===0?.105:.065));}}
  const water=patches.filter(p=>p.kind==='water'),wetDistance=(x,z)=>Math.min(Infinity,...water.map(p=>Math.hypot((x-p.x)/p.rx,(z-p.z)/p.rz)));
  features.push(habitatName,...(water.length?['open water','reed margins']:variant===3?['golden grasses','weathered stones']:['flower-rich swathes']));
  for(const p of water)for(let i=0;i<15;i++){const a=i*Math.PI*2/15,x=p.x+Math.cos(a)*p.rx*1.22,z=p.z+Math.sin(a)*p.rz*1.22;put('reeds',x,z,.8+random()*.4,'Reeds on a wet margin');}
  if(variant===3)for(let i=0;i<5;i++)put('stones',(random()-.5)*diameter*.5,(random()-.5)*diameter*.5,.7+random(),'Exposed stones in dry grassland');
  features.push('low grass mosaic','loose wildflower drifts','scattered seed heads','open glades');
  for(let gx=-radius;gx<radius;gx+=5)for(let gz=-radius;gz<radius;gz+=5){
   const x=gx+1+random()*3,z=gz+1+random()*3;
   const habitat=Math.sin(x/diameter*11+phase)+Math.cos(z/diameter*9+phase2)+.35*Math.sin((x+z)/diameter*17+phase);
   if(habitat<-.55||random()<.2||wetDistance(x,z)<1.22)continue;
   const flower=habitat>(variant===2?-.1:.85)&&random()<(variant===2?.85:.45),kind=flower?'flowers':habitat>.1&&random()<.12?'seedheads':'grass';
   put(kind,x,z,kind==='seedheads'?.7+random()*.3:kind==='flowers'?.65+random()*.35:.65+random()*.55,flower?'Seasonal flowers gathered in a sheltered drift':kind==='seedheads'?'Older stems above renewing grass':'Low meadow cover around an open glade');
  }
  return {version:2,cellSizeMetres:5,seed:seedForHex(seed,id),type,habitatName,patches,features,items};
 }
 // A tended boundary ages unevenly: established canopy, gaps, stumps and young replacement growth.
 const edge=type==='crop'?'windbreak':type==='paddock'?'shelterbelt':'orchard edge';features.push(edge,'renewing hedgerow');
 for(let i=0;i<11;i++){const angle=Math.PI*.62+i*Math.PI*.115,r=radius*(.76+random()*.1),x=Math.cos(angle)*r,z=Math.sin(angle)*r,age=random();put(age<.12?'stump':age<.32?'sapling':'tree',x,z,.8+random()*.55,age<.32?'Regrowth in an older boundary':edge);if(age>.32&&type==='ranch')put('fruit',x+1.5,z+1.5,.7,'Fallen orchard fruit');}
 // Ground cover follows the boundary habitat; the middle remains a readable working clearing.
 for(let gx=-radius;gx<radius;gx+=5)for(let gz=-radius;gz<radius;gz+=5){const x=gx+1+random()*3,z=gz+1+random()*3;const edgeDistance=Math.hypot(x,z)/radius;if(edgeDistance<.63||edgeDistance>.94)continue;const habitat=Math.sin(x*.11+seed%7)+Math.cos(z*.14);if(habitat<-.5)continue;put(random()<.3?'flowers':'grass',x,z,.5+random(),habitat>.8?'Sheltered, lightly maintained verge':'Open meadow margin');}
 if(type==='ranch'||type==='sugar-shack'){
  features.push('kitchen plots','supply yard');
  for(let row=0;row<3;row++)for(let col=0;col<5;col++)put('vegetable',-diameter*.22+col*diameter*.055,diameter*.31+row*diameter*.045,.85,'Tended kitchen garden');
  for(let i=0;i<5;i++)put(i<3?'crate':'barrel',diameter*.36+(i%2)*2.5,-diameter*.12+Math.floor(i/2)*3,1,'Supplies beside the working yard');
  put('cart',-diameter*.36,diameter*.12,1,'Handcart at the yard edge');
 }else if(type==='crop'){
  features.push('harvest crates','pollinator strip');for(let i=0;i<4;i++)put('crate',diameter*.35,-diameter*.1+i*3,.9,'Harvest staging beside the field');for(let i=0;i<15;i++)put('flowers',-diameter*.28+i*diameter*.04,diameter*.32+random()*3,1.1,'Pollinator strip outside the crop beds');
 }else if(type==='paddock'){
  features.push('grazed meadow','hay reserve');for(let i=0;i<4;i++)put('hay',diameter*.34,-diameter*.13+i*4,1,'Hay kept beside the pasture edge');put('trough',-diameter*.36,diameter*.12,1,'Water station at the pasture edge');
 }
 return {version:1,cellSizeMetres:5,seed:seedForHex(seed,id),type,features,items};
}
export function describeHexes(active){const tiles=(active?.recipe?.tiles||[]).map(t=>{const center=active.assembly?.plans?.find(p=>p.id===t.id)?.center||t.center;return Number.isFinite(t.q)||!center?t:{...t,...axial(center,active.config?.size||100)};});return tiles.map((tile,index)=>{const plan=active.assembly?.plans?.find(p=>p.id===tile.id),type=tile.type||plan?.type||'scene';const info={ranch:['Farmstead','Home, livestock care and daily farm work'],paddock:['Grazing pasture','Livestock turnout and care'],crop:['Kitchen garden','Cultivated beds and harvest work'],woodland:['Woodland','Canopy, understory and woodland margins'],pond:['Pond','Open water and a living shoreline'],meadow:[['Pond meadow','Wet meadow','Flower meadow','Dry meadow'][seedForHex(active.recipe.seed,tile.id)%4],'Open grassland and seasonal flowering'],moon:['Moon base','Science-base tile'],city:['Town','Settlement and civic activity'],'sugar-shack':['Sugar shack','Maple-sugaring place'],ai:['Generated place','Custom scene composition']}[type]||[type.replaceAll('-',' '),'Special scene tile'];return {number:index+1,id:tile.id,type,name:tile.name||tile.label||info[0],purpose:info[1],q:tile.q??null,r:tile.r??null,seed:tile.seed??active.recipe.seed,center:plan?.center||null,neighbors:tiles.filter(other=>other!==tile&&Number.isFinite(tile.q)&&Number.isFinite(other.q)&&Math.max(Math.abs(tile.q-other.q),Math.abs(tile.r-other.r),Math.abs(tile.q+tile.r-other.q-other.r))===1).map(t=>t.id)};});}
