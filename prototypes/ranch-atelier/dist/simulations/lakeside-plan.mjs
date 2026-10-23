import {townLayout,project} from './town-life/layouts.mjs';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function lakeRadius(a){return 1+.085*Math.sin(a*3+.6)+.045*Math.cos(a*5-.9);}
export function lakesidePlan(seed=214,diameter=160){
 const k=diameter/160,lake={x:111*k,z:124*k,rx:65*k,rz:49*k,waterLevel:3.1*k},square={x:222*k,z:39*k,radius:17*k};
 const paths=[{id:'main-street',width:5.5*k,points:[[28,4],[65,8],[108,28],[159,39],[222,39],[276,44],[311,64]].map(([x,z])=>[x*k,z*k])}, {id:'promenade',width:3*k,points:[[108,28],[153,49],[174,73],[183,99],[199,115],[229,126],[264,126]].map(([x,z])=>[x*k,z*k])}];
 const blocks=[['market',155,-9],['garden',230,-24],['post',292,28],['court',241,91]],buildings=[],trees=[];
 for(const [index,[preset,x,z]] of blocks.entries()){
  const layout=townLayout(preset,seed+index*37,3),world=p=>[(p[0]+x)*k,(p[1]+z)*k];
  layout.paths.forEach((p,j)=>paths.push({id:`district-${index}-lane-${j}`,width:(j===0?3:2)*k,frontage:j>=layout.lanes.length,points:p.map(world)}));
  const start=world([0,34]),main=paths[0].points,nearest=main.slice(1).map((b,i)=>project(start,main[i],b)).sort((a,b)=>Math.hypot(a[0]-start[0],a[1]-start[1])-Math.hypot(b[0]-start[0],b[1]-start[1]))[0];
  paths.push({id:`district-${index}-join`,width:3*k,points:[start,nearest]});
  for(const h of layout.homes)buildings.push({id:`town-home-${index}-${h.index}`,kind:'home',x:(x+h.center[0])*k,z:(z+h.center[1])*k,angle:h.angle,door:world(h.door),width:6.4*k,depth:5.4*k});
  trees.push(...layout.planting.map(world));
 }
 const additions=[['coffee-shop',222,16,0],['bakery',198,35,Math.PI/2],['bookshop',247,26,-Math.PI/2],['florist',198,57,Math.PI/2],['grocer',250,58,-Math.PI/2],['town-hall',222,64,Math.PI],['corner-shop',121,15,0],['shore-shop',133,49,Math.PI]];
 const wet=(x,z,margin=0)=>{const dx=(x-lake.x)/lake.rx,dz=(z-lake.z)/lake.rz;return Math.hypot(dx,dz)<lakeRadius(Math.atan2(dz,dx))+margin;};
 const roadDistance=(x,z)=>Math.min(...paths.filter(p=>!p.frontage).flatMap(p=>p.points.slice(1).map((b,i)=>{const q=project([x,z],p.points[i],b);return Math.hypot(x-q[0],z-q[1])-p.width/2;})));
 // Retain only plots whose frontage and larger common remain genuinely clear.
 const accepted=buildings.filter(b=>!wet(b.x,b.z,.12)&&Math.hypot(b.x-square.x,b.z-square.z)>square.radius+5*k&&roadDistance(b.x,b.z)>3.2*k);
 for(const [id,x,z,angle]of additions){const b={id,kind:id,x:x*k,z:z*k,angle,width:7.5*k,depth:6*k,door:[(x+Math.sin(angle)*3.7)*k,(z+Math.cos(angle)*3.7)*k]};if(accepted.some(a=>Math.hypot(a.x-b.x,a.z-b.z)<9*k))continue;accepted.push(b);const candidates=paths[0].points.slice(1).map((p,i)=>project(b.door,paths[0].points[i],p)),q=candidates.sort((a,c)=>Math.hypot(a[0]-b.door[0],a[1]-b.door[1])-Math.hypot(c[0]-b.door[0],c[1]-b.door[1]))[0];paths.push({id:id+'-access',width:1.7*k,points:[b.door,q]});}
 // Civic and everyday uses occupy existing plots, retaining their real entrances.
 const uses=[['produce-market','bicycle-workshop'],['greenhouse','seed-library'],['post-office','art-studio'],['boathouse','community-kitchen']];
 for(let district=0;district<4;district++){const plots=accepted.filter(b=>b.id.startsWith(`town-home-${district}-`));plots.slice(0,2).forEach((b,i)=>{b.kind=uses[district][i];});}
 return {version:2,seed,k,lake,square,fountain:{x:228*k,z:54*k,radius:2.8*k},buildings:accepted,paths,trees:trees.filter(([x,z])=>!wet(x,z,.15)&&roadDistance(x,z)>2*k&&!accepted.some(b=>Math.hypot(x-b.x,z-b.z)<6*k)),wet,roadDistance,coffeeShop:accepted.find(b=>b.id==='coffee-shop'),generator:'town-life/layouts.mjs; four connected growth districts',simulation:'town spatial generation; guided coffee station available; full shop-day simulation planned'};
}
export function expandWorldTiles(tiles,diameter,seed){const r=diameter/2;return [...tiles,...[[2,0],[1,1],[2,1],[0,2]].map(([q,s],i)=>({id:'world-east-'+i,type:'meadow',cell:20+i,center:{x:Math.sqrt(3)*r*(q+s/2),z:1.5*r*s},rotation:0,seed:seed+800+i*43})).filter(t=>!tiles.some(o=>Math.hypot(o.center.x-t.center.x,o.center.z-t.center.z)<1))];}
export function lakesideTerrain(base,plan){
 const {lake,k}=plan;
 const h=(x,z)=>{const dx=(x-lake.x)/lake.rx,dz=(z-lake.z)/lake.rz,q=Math.hypot(dx,dz)/lakeRadius(Math.atan2(dz,dx)),bank=smooth((q-.91)/.2);return q>1.11?base(x,z):(lake.waterLevel-2*k)*(1-bank)+base(x,z)*bank;};
 Object.assign(h,base);h.lakeside=plan;h.slope=(x,z)=>Math.hypot(h(x+.5,z)-h(x-.5,z),h(x,z+.5)-h(x,z-.5));
 h.habitat=(x,z)=>plan.wet(x,z,.08)?{kind:'water',woodland:0,slope:0,moisture:1,floodplain:1}:base.habitat(x,z);
 h.surfaceColor=(x,z)=>plan.wet(x,z,.12)?'#b9c3a0':base.surfaceColor(x,z);
 return h;
}
