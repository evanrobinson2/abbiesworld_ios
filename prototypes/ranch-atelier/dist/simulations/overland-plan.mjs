// Authored places use metres. These are scenery, never production/job promises.
const distance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
export function overlandPlan(tiles,town,heightAt,assembly={plans:[]}){
 const k=town.k,items=[],paths=[],clearings=[],warnings=[];
 const places=[
  ['ranch','Ranch home',0,0,'Working yards and livestock; preserve the established simulation.'],
  ['paddock','Market approach',137,-2,'Orchard gate, roadside stalls and town arrival.'],
  ['crop','West shore',65,112,'Quiet birch shore with dry lakeside seating.'],
  ['meadow-3','Apple orchard',-72,116,'Curving orchard ranks, harvest shelter and open picking aisles.'],
  ['meadow-4','Woodland foothill',-121,65,'Pine shoulder, coppice clearing and stored timber.'],
  ['meadow-5','High mountain',-69,-120,'Unbroken summit and stone-strewn lower apron.'],
  ['meadow-6','Eastern mountain',69,-120,'Bare summit, birch foot and a small valley rest stop.'],
  ['world-east-0','Town neighborhoods',277,0,'Market lane, kitchen gardens and flower-fronted homes.'],
  ['world-east-1','Lakeside court',208,120,'Shore promenade, courtyard seating and reeds.'],
  ['world-east-2','Garden outskirts',346,120,'Sunflower garden, seed shed and boundary fruit trees.'],
  ['world-east-3','Picnic woods',139,240,'Oak canopy framing a picnic clearing and lake approach.']
 ].filter(p=>tiles.some(t=>t.id===p[0])).map(([id,name,x,z,purpose])=>({id,name,x:x*k,z:z*k,purpose,simulation:id==='ranch'?'existing ranch simulation':'modeled scenery',distance:(name.includes('mountain')?42:17)*k}));
 const path=(id,points,width=2.4)=>paths.push({id:'overland-'+id,width:width*k,points:points.map(p=>p.map(v=>v*k)),overland:true});
 path('orchard',[[0,10],[-32,34],[-53,72],[-69,98],[-75,123]]);
 path('woodland',[[-32,34],[-74,47],[-95,66],[-121,68]]);
 path('valley',[[8,-12],[35,-34],[82,-45],[110,-24],[121,15]]);
 path('west-shore',[[-53,72],[-18,100],[17,126],[32,141]]);
 path('south-shore',[[32,141],[48,178],[87,192],[124,201],[149,220],[160,246]]);
 path('east-garden',[[264,126],[294,132],[321,143],[344,149],[367,151]]);
 path('picnic-link',[[199,115],[213,151],[204,183],[181,207],[149,220]]);
 const allPaths=()=>[...town.paths,...paths,...assembly.plans.flatMap(t=>t.paths.filter(p=>!p.lakeside).map(p=>({width:p.width,points:p.points.map(q=>[q.x+t.center.x,q.z+t.center.z])})))];
 const roadDistance=(x,z)=>Math.min(...allPaths().flatMap(p=>p.points.slice(1).map((b,i)=>distance([x,z],p.points[i],b)-p.width/2)));
 const onLand=(x,z,r)=>tiles.some(t=>Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return (x-t.center.x)*Math.cos(a)+(z-t.center.z)*Math.sin(a)<Math.sqrt(3)*40*k-r;}).every(Boolean));
 const clear=(x,z,r)=>onLand(x,z,r)&&!town.wet(x,z,.08+r/(60*k))&&roadDistance(x,z)>r+.5*k&&!town.buildings.some(b=>Math.hypot(x-b.x,z-b.z)<Math.max(b.width,b.depth)*.66+r)&&Math.hypot(x-town.square.x,z-town.square.z)>town.square.radius+r&&!assembly.plans.some(t=>t.placements.some(o=>Math.hypot(x-t.center.x-o.x,z-t.center.z-o.z)<o.radius+r+1));
 const reserve=(x,z,r)=>clearings.push({x:x*k,z:z*k,r:r*k});
 const add=(asset,x,z,size=1,purpose='landscape',angle=0,r=1,slopeLimit=.65)=>{x*=k;z*=k;r*=k;if(!clear(x,z,r)||heightAt.slope?.(x,z)>slopeLimit)return false;items.push({id:'dressing-'+items.length,asset,x,z,size:size*k,angle,purpose,radius:r});return true;};
 const grove=(asset,points,size,purpose)=>points.forEach(([x,z],i)=>add(asset,x,z,size*(.9+(i%3)*.09),purpose,i*1.7,2.7*size));
 // Individual silhouettes and open activity courts, authored against actual routes.
 reserve(-78,114,38);reserve(-121,65,16);reserve(156,234,28);reserve(346,139,32);
 for(let row=0;row<3;row++)for(let col=0;col<5;col++)add('GF-153',-111+col*13+row*3,90+row*18+Math.sin(col*.8)*5,1.3,'Apple orchard; picking aisles',.2*col,3.5);
 add('GF-017',-91,136,1.8,'Orchard harvest shelter',.25,4);add('GF-027',-96,140,1.8,'Drying fruit display',0,1.8);add('GF-025',-87,141,2,'Harvest crates',0,1.5);add('GF-014',-83,138,1.5,'Orchard water jar',0,1.3);
 grove('WW-139',[[25,125],[30,153],[39,163],[11,117],[20,145]],1.35,'Birch shore');add('GF-194',29,137,2,'Lake-facing bench',-1.1,2);
 grove('WW-147',[[114,220],[119,249],[138,260],[171,258],[179,235],[174,218],[125,209]],1.65,'Oak picnic canopy');
 for(const [x,z]of [[143,230],[162,239]]){add('BA-0012',x,z,2.7,'Picnic table',.25,2.4);add('GF-194',x,z+3,2,'Picnic seating',0,1.8);add('GF-194',x,z-3,2,'Picnic seating',Math.PI,1.8);}
 add('GF-017',151,254,1.9,'Picnic rain shelter',0,4);
 grove('WW-140',[[-135,34],[-126,53],[-108,57],[-156,41],[-165,23]],1.3,'Foothill pine edge');
 add('GF-133',-125,61,2,'Dry woodland fuel store',0,2.5);for(const [x,z]of [[-116,63],[-115,60],[-121,59]])add('WW-003',x,z,2.3,'Cut timber beside clearing',.3,1.7);
 grove('WW-139',[[74,-43],[88,-40],[96,-51],[101,-35]],1.15,'Eastern mountain foot');add('GF-194',82,-51,2,'Valley rest bench',Math.PI,1.7);
 grove('GF-153',[[115,-3],[126,-12],[139,-20],[152,-26]],1.2,'Market approach orchard');
 add('GF-017',113,13,1.4,'Roadside produce stand',0,3);add('BA-0012',114,17,1.8,'Produce counter',0,1.5);add('GF-025',110,16,1.8,'Produce crates',0,1.3);
 add('GF-017',351,127,1.8,'Seed garden shelter',.15,4);add('GF-023',357,130,2,'Seed storage',0,1.6);add('GF-014',343,130,1.8,'Garden water',0,1.4);
 for(let row=0;row<3;row++)for(let col=0;col<6;col++){add('GF-004',329+col*3.4,126+row*4,1.6,'Kitchen garden planting',0,1.1);add('GF-567',333+col*3.2,159+row*3,1.2,'Sunflower garden',0,.9);}
 grove('GF-153',[[367,127],[377,141],[379,158],[359,171],[323,167]],1.5,'Garden boundary orchard');
 // Town gardens derive from building orientation; doors and street corridors stay empty.
 for(const b of town.buildings){const index=Number(b.id.split('-')[2]||0),rear=(u,v)=>[(b.x+Math.cos(b.angle)*u+Math.sin(b.angle)*v)/k,(b.z-Math.sin(b.angle)*u+Math.cos(b.angle)*v)/k];
  if(b.kind==='home'){const [x,z]=rear(0,-6);add(index===0?'GF-025':index===1?'GF-004':index===2?'GF-634':'GF-194',x,z,index===1?2:1.5,['Market household stores','Kitchen garden','Flower frontage','Shared court seat'][index],b.angle,1.3);const [tx,tz]=rear(5,-5);add(index===1?'GF-153':'WW-151',tx,tz,.85,'Household shade',b.angle,2.2);}
 }
 // Connected montane belts follow each complete mountain foot, leaving the valley exits open.
 for(const [j,peak]of (heightAt.peaks||[]).entries())for(let n=0;n<160;n++){
  const angle=n*2.399963+j,band=.7+.42*((n*.6180339)%1),reach=peak.footprintRadius*(band+.045*Math.sin(angle*3+j)),x=peak.x+Math.cos(angle)*reach,z=peak.z+Math.sin(angle)*reach;
  if(Math.sin(angle)<-.45||heightAt(x,z)>peak.summitHeight*.5||Math.sin(x/14+Math.cos(z/19))<-.85)continue;
  add('WW-140',x/k,z/k,2.1+(n%4)*.18,'Montane pine belt',angle,6.5,4.5);
 }
 // Grounded stone groups mark different mountain aprons without covering summits.
 for(const [x,z,n]of [[-101,-66,4],[-34,-66,3],[-99,-151,4],[43,-67,3],[99,-105,4],[-171,-17,4]])for(let i=0;i<n;i++)add('stone',x+i*3.2,z+Math.sin(i*2)*3,1+i*.2,'Mountain scree apron',i,.9);
 // Small plant drifts sit at named activity edges, never on a uniform tile lattice.
 for(const [asset,x,z]of [['WW-046',-121,55],['WW-528',-143,43],['GF-250',-101,145],['GF-249',-84,87],['WW-273',16,137],['GF-679',130,253],['GF-235',174,242],['GF-250',361,133],['GF-634',322,160]])for(let j=0;j<9;j++)add(asset,x+Math.cos(j*2.4)*Math.sqrt(j)*1.5,z+Math.sin(j*2.4)*Math.sqrt(j)*1.5,1.5,'Contextual garden or woodland margin',j,.7);
 // Woodland rooms connect the mountain feet to the valley edges; inhabited clearings stay open.
 for(const [cx,cz,rx,rz,asset]of [[-151,38,22,19,'WW-140'],[-66,-61,28,13,'WW-140'],[108,-60,25,18,'WW-140'],[-106,64,19,24,'WW-139'],[79,194,25,16,'WW-147'],[185,251,18,23,'WW-147'],[367,91,21,24,'WW-151'],[273,-28,19,14,'WW-151']]){
  const before=items.length;
  for(let n=0;n<95;n++){const a=n*2.399963,r=Math.sqrt((n+.5)/95),x=(cx+Math.cos(a)*rx*r)*k,z=(cz+Math.sin(a)*rz*r)*k;
   if(clearings.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+3*k)||items.some(i=>Math.hypot(x-i.x,z-i.z)<i.radius+3*k))continue;
   add(asset,x/k,z/k,1.7+(n%4)*.18,'Valley woodland edge',a,4.5,3.8);
  }
 }
 return {version:1,k,places,items,paths,clearings,warnings,roadDistance,clear,simulation:'Authored scenery. Existing ranch and guided coffee actions retained; no new production or harvesting simulation.'};
}
export function withOverland(base,plan){const h=(x,z)=>base(x,z);Object.assign(h,base);h.overland=plan;return h;}
