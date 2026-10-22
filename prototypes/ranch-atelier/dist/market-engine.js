// Market space and market time share a connected, metre-based walking graph.
export const MARKET_STYLES={
 village:{view:{azimuth:-60,elevation:40,roofMode:'solid',focus:'market',intent:'Look across the arrival toward the open square.'},name:'Village square',origin:'Luberon, France',description:'An open gathering place with produce awnings, trees and pitched-roof shops. Growth spreads around the square.',source:'https://en.luberon-apt.fr/market-days',stretch:[1,1],growth:[.95,1.1],covered:.22,palette:['#d97956','#e6b95d','#74a698','#9f9bb9','#b0b86f']},
 souk:{view:{azimuth:-55,elevation:52,roofMode:'xray',focus:'market',intent:'Look down into the courtyard and branching covered lanes.'},name:'Courtyard souk',origin:'Moroccan medinas',description:'Compact branching lanes, plaster shops, flat roof terraces and woven shade. Growth adds connected clusters around the fountain court.',source:'https://www.visitmorocco.com/en/discover-morocco/medinas-in-morocco',stretch:[.86,.86],growth:[1,1],covered:.78,palette:['#d49b79','#e2bc8f','#b97963','#e7cda7','#b9a57e']},
 arcade:{view:{azimuth:-28,elevation:42,roofMode:'xray',focus:'market',intent:'Look along the shopping street with its passage visible.'},name:'Covered shopping street',origin:'Osaka, Japan',description:'A long neighborhood shopping district with tiled shop roofs, fabric curtains and covered passages. Growth favors the ends of the street.',source:'https://osaka-info.jp/special/coolosaka/en/cool-shop/782/',stretch:[1.2,.95],growth:[.45,2.4],covered:.9,palette:['#a3b3ad','#ded2b0','#c79779','#8eaaa5','#b2a4a3']},
 canal:{view:{azimuth:-70,elevation:38,roofMode:'xray',focus:'market',intent:'Look from the land approach across stalls toward the landing and boats.'},name:'Canal-side market',origin:'Taling Chan, Thailand',description:'Timber stalls follow the water, with a landing and moored produce boats. Growth follows the bank. Boats are scenery; this visit arrives on foot.',source:'https://www.tourismthailand.org/Attraction/talingchan-floating-market',stretch:[1.15,1],growth:[.5,2],covered:.16,palette:['#b69d72','#b6b97b','#d4ac73','#8fa68b','#c98d70']}
};
export const DEFAULTS={seed:43,bays:3,style:'village',spacing:'comfortable',setting:'mixed',distance:900,people:2,purpose:'both',day:6,week:1,weather:'clear',departure:7};
export function normalize(input={}){
 const c={...DEFAULTS,...input};
 for(const [k,min,max] of [['seed',1,4294967295],['bays',2,8],['distance',200,3000],['people',1,2],['day',0,6],['week',1,999],['departure',6,12]])if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)throw Error(`Invalid ${k}.`);
 for(const [k,values] of Object.entries({style:Object.keys(MARKET_STYLES),spacing:['compact','comfortable','spacious'],setting:['mixed','outdoor','indoor'],purpose:['both','buy','sell'],weather:['clear','rain']}))if(!values.includes(c[k]))throw Error(`Invalid ${k}.`);
 return c;
}
function random(seed){return()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
// Original implementation of the triangle-pair / quad-subdivide / relax approach
// documented by Oskar Stålberg and the Sylves Townscaper grid tutorial.
// Generate the complete patch before choosing occupied plots: growth never relaxes
// existing positions again. This is a finite market, not Townscaper's infinite tiling.
export function irregularGrid(seed){
 const rng=random(seed),vertices=[],lookup=new Map(),triangles=[],edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
 const add=(x,z)=>{vertices.push({x,z});return vertices.length-1;};
 for(let q=-5;q<=5;q++)for(let r=-5;r<=5;r++)if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=5)lookup.set(`${q},${r}`,add((q+r/2)*20,r*Math.sqrt(3)*10));
 for(let q=-5;q<5;q++)for(let r=-5;r<5;r++)for(const coords of [[[q,r],[q+1,r],[q,r+1]],[[q+1,r],[q+1,r+1],[q,r+1]]]){const ids=coords.map(p=>lookup.get(p.join(',')));if(ids.every(i=>i!==undefined))triangles.push(ids);}
 const triangleEdges=new Map();triangles.forEach((p,i)=>p.forEach((a,j)=>{const key=edgeKey(a,p[(j+1)%3]);if(!triangleEdges.has(key))triangleEdges.set(key,[]);triangleEdges.get(key).push(i);}));
 const pairs=[...triangleEdges.values()].filter(a=>a.length===2);for(let i=pairs.length-1;i;i--){const j=Math.floor(rng()*(i+1));[pairs[i],pairs[j]]=[pairs[j],pairs[i]];}
 const consumed=new Set(),polys=[];
 const ordered=ids=>{const center=ids.reduce((p,i)=>({x:p.x+vertices[i].x/ids.length,z:p.z+vertices[i].z/ids.length}),{x:0,z:0});return ids.sort((a,b)=>Math.atan2(vertices[a].z-center.z,vertices[a].x-center.x)-Math.atan2(vertices[b].z-center.z,vertices[b].x-center.x));};
 for(const [a,b] of pairs)if(!consumed.has(a)&&!consumed.has(b)){consumed.add(a);consumed.add(b);polys.push(ordered([...new Set([...triangles[a],...triangles[b]])]));}
 triangles.forEach((p,i)=>{if(!consumed.has(i))polys.push(ordered([...p]));});
 const midpoints=new Map(),faces=[];
 const middle=(a,b)=>{const key=edgeKey(a,b);if(!midpoints.has(key))midpoints.set(key,add((vertices[a].x+vertices[b].x)/2,(vertices[a].z+vertices[b].z)/2));return midpoints.get(key);};
 for(const p of polys){const c=p.reduce((v,i)=>({x:v.x+vertices[i].x/p.length,z:v.z+vertices[i].z/p.length}),{x:0,z:0}),center=add(c.x,c.z);p.forEach((v,j)=>faces.push([v,middle(v,p[(j+1)%p.length]),center,middle(p[(j+p.length-1)%p.length],v)]));}
 const edges=new Map(),neighbors=vertices.map(()=>new Set());faces.forEach((p,i)=>p.forEach((a,j)=>{const b=p[(j+1)%4],key=edgeKey(a,b);if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(i);neighbors[a].add(b);neighbors[b].add(a);}));
 const fixed=new Set([...edges.values()].filter(e=>e.faces.length===1).flatMap(e=>[e.a,e.b]));
 for(let it=0;it<18;it++){const next=vertices.map((p,i)=>{if(fixed.has(i))return p;const ids=[...neighbors[i]],average=ids.reduce((v,j)=>({x:v.x+vertices[j].x/ids.length,z:v.z+vertices[j].z/ids.length}),{x:0,z:0});return {x:p.x*.55+average.x*.45,z:p.z*.55+average.z*.45};});vertices.splice(0,vertices.length,...next);}
 const cells=faces.map((ids,id)=>({id,ids,center:ids.reduce((p,i)=>({x:p.x+vertices[i].x/4,z:p.z+vertices[i].z/4}),{x:0,z:0}),neighbors:[]}));
 for(const e of edges.values())if(e.faces.length===2){const[a,b]=e.faces;cells[a].neighbors.push(b);cells[b].neighbors.push(a);}
 return {vertices,cells,edges:[...edges.values()]};
}
export function generateMarket(input={}){
 const config=normalize(input),nodes=[],edges=[],stalls=[],halls=[],grid=irregularGrid(config.seed),profile=MARKET_STYLES[config.style],spacing={compact:.9,comfortable:1,spacious:1.22}[config.spacing];
 for(const p of [...grid.vertices,...grid.cells.map(c=>c.center)]){p.x*=profile.stretch[0]*spacing;p.z*=profile.stretch[1]*spacing;}
 const add=(id,x,z)=>{nodes.push({id,x,z});return id;};
 const link=(a,b,width=3)=>{const p=nodes.find(n=>n.id===a),q=nodes.find(n=>n.id===b);edges.push({a,b,width,length:Math.hypot(q.x-p.x,q.z-p.z)});};
 const degree=grid.vertices.map(()=>0);for(const e of grid.edges){degree[e.a]++;degree[e.b]++;}
 const junction=grid.vertices.map((p,i)=>({...p,i})).filter(p=>degree[p.i]>=5).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];
 const plaza=grid.cells.filter(c=>c.ids.includes(junction.i)).sort((a,b)=>Math.hypot(a.center.x-junction.x,a.center.z-junction.z)-Math.hypot(b.center.x-junction.x,b.center.z-junction.z))[0],order=[plaza.id],chosen=new Set(order),canalBank=Math.max(...plaza.ids.map(i=>grid.vertices[i].z))+7;
 while(order.length<33){
  const anchor=order.length>=9?[...new Set(order.slice(0,9).flatMap(i=>grid.cells[i].ids))].map(i=>grid.vertices[i]).sort((a,b)=>a.z-b.z)[0]:null;
  const frontier=[...new Set(order.flatMap(i=>grid.cells[i].neighbors))].filter(i=>!chosen.has(i)).filter(i=>config.style!=='canal'||Math.max(...grid.cells[i].ids.map(j=>grid.vertices[j].z))<=canalBank-4).filter(i=>{if(!anchor)return true;const p=grid.cells[i].ids.map(j=>grid.vertices[j]),minX=Math.min(...p.map(p=>p.x)),maxX=Math.max(...p.map(p=>p.x)),minZ=Math.min(...p.map(p=>p.z));return !(minZ<anchor.z&&maxX>anchor.x-17&&minX<anchor.x+3);});
  frontier.sort((a,b)=>{const score=i=>{const p=grid.cells[i].center;return Math.hypot((p.x-junction.x)*profile.growth[0],(p.z-junction.z)*profile.growth[1])+Math.sin(i*7+config.seed)*2;};return score(a)-score(b)||a-b;});if(!frontier.length)throw Error('Market growth has no free neighboring plot.');chosen.add(frontier[0]);order.push(frontier[0]);
 }
 const occupied=order.slice(0,config.bays*4+1),active=new Set(occupied),cells=occupied.map(i=>({...grid.cells[i],corners:grid.cells[i].ids.map(j=>({...grid.vertices[j]}))}));
 const used=new Set(cells.flatMap(c=>c.ids));for(const id of used){const p=grid.vertices[id];add(`v-${id}`,p.x,p.z);}
 const boundary=[];for(const e of grid.edges){const included=e.faces.filter(id=>active.has(id));if(!included.length)continue;link(`v-${e.a}`,`v-${e.b}`,2.2);if(included.length===1)boundary.push({a:grid.vertices[e.a],b:grid.vertices[e.b],center:grid.cells[included[0]].center});}
 // Anchor the entrance to the smallest supported market, so expansion is stable.
 const baseIds=[...new Set(order.slice(0,9).flatMap(i=>grid.cells[i].ids))],entry=baseIds.sort((a,b)=>grid.vertices[a].z-grid.vertices[b].z||a-b)[0],ep=grid.vertices[entry];
 add('gate',ep.x,ep.z-10);add('drop',ep.x-5,ep.z-9);add('store',ep.x-11,ep.z-8);add('home',ep.x,ep.z-10-config.distance);
 link('home','gate',3);link('gate',`v-${entry}`,3.4);link('gate','drop',3);link('drop','store',2.4);
 const trades=['Produce','Bread','Flowers','Tools','Cloth','Preserves'];
 for(const cell of cells.slice(1)){
  const rng=random(config.seed+cell.id*1709),indoor=config.setting==='indoor'||config.setting==='mixed'&&rng()<profile.covered;
  const front=cell.ids.map((id,i)=>{const a=grid.vertices[id],b=grid.vertices[cell.ids[(i+1)%4]];return {i,x:(a.x+b.x)/2,z:(a.z+b.z)/2};}).sort((a,b)=>Math.hypot(a.x-plaza.center.x,a.z-plaza.center.z)-Math.hypot(b.x-plaza.center.x,b.z-plaza.center.z))[0];
  const corners=Array.from({length:4},(_,i)=>cell.corners[(front.i+i)%4]),id=`stall-${cell.id}`;
  const left=`v-${cell.ids[front.i]}`,right=`v-${cell.ids[(front.i+1)%4]}`,whole=edges.findIndex(e=>e.a===left&&e.b===right||e.a===right&&e.b===left);if(whole>=0)edges.splice(whole,1);
  add(id,front.x,front.z);link(left,id,2.2);link(id,right,2.2);
  const s={id,cellId:cell.id,x:cell.center.x,z:cell.center.z,corners,indoor,trade:trades[Math.floor(rng()*trades.length)],color:profile.palette[Math.floor(rng()*5)],height:3.5+rng()*1.8};
  stalls.push(s);if(indoor)halls.push(s);
 }
 stalls[0].trade='Your booth';
 const bounds={minX:Math.min(...cells.flatMap(c=>c.corners.map(p=>p.x)),ep.x-15)-5,maxX:Math.max(...cells.flatMap(c=>c.corners.map(p=>p.x)))+7,minZ:ep.z-15,maxZ:Math.max(...cells.flatMap(c=>c.corners.map(p=>p.z)))+7};
 // Fix the bank against the complete growth envelope so water never moves into
 // existing paths when the market expands. A walking landing joins the graph.
 let waterfront=null;
 if(config.style==='canal'){
  const bankZ=canalBank;
  const bankEntry=[...used].sort((a,b)=>grid.vertices[b].z-grid.vertices[a].z)[0],p=grid.vertices[bankEntry];
  add('landing',p.x,bankZ+2);link(`v-${bankEntry}`,'landing',2.4);
  waterfront={bankZ,minX:bounds.minX-3,maxX:bounds.maxX+3};bounds.maxZ=bankZ+14;
 }
 const tile=marketHex(order.map(i=>({corners:grid.cells[i].ids.map(j=>grid.vertices[j])})),nodes,waterfront);
 return {config,profile,waterfront,tile,nodes,edges,stalls,halls,cells,boundary,plaza:cells[0],booth:stalls[0].id,bounds,length:bounds.maxZ-bounds.minZ,gridKind:'relaxed-irregular-quads'};
}
export function route(world,from,to){
 const costs=new Map([[from,0]]),previous=new Map(),done=new Set();
 while(!done.has(to)){
  const current=[...costs].filter(([id])=>!done.has(id)).sort((a,b)=>a[1]-b[1])[0];if(!current)throw Error('Unreachable market destination.');
  const [id,cost]=current;done.add(id);
  for(const e of world.edges){const next=e.a===id?e.b:e.b===id?e.a:null;if(next&&cost+e.length<(costs.get(next)??Infinity)){costs.set(next,cost+e.length);previous.set(next,id);}}
 }
 const ids=[to];while(ids[0]!==from)ids.unshift(previous.get(ids[0]));
 return {nodes:ids.map(id=>world.nodes.find(n=>n.id===id)),distance:costs.get(to)};
}
export function pointOnRoute(path,fraction){
 let remaining=path.distance*Math.max(0,Math.min(1,fraction));
 for(let i=1;i<path.nodes.length;i++){const a=path.nodes[i-1],b=path.nodes[i],d=Math.hypot(b.x-a.x,b.z-a.z);if(remaining<=d){const f=d?remaining/d:0;return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}remaining-=d;}
 return {...path.nodes.at(-1)};
}
export function simulateMarket(input={}){
 const config=normalize(input),world=generateMarket(config);
 if(config.purpose==='both'&&config.people<2)throw Error('Selling and shopping needs two people: one covers the booth while the other shops. Choose buy only or sell only for a solo visit.');
 const selling=config.purpose!=='buy',buying=config.purpose!=='sell',events=[],frames=[],transactions=[],people=Array.from({length:config.people},(_,i)=>({id:i,name:i===0?'Abbie':'Ani',node:'home',state:'At home',until:0,trip:null,task:null}));
 let reserve=0,boothStock=0,sold=0,bought=0,stored=0,purchasesHome=0,missed=0,returned=0,stockHome=selling?24:0;
 const log=(minute,text)=>events.push({minute,text});
 const travel=(p,to,t,after,label)=>{const path=route(world,p.node,to);p.trip={path,start:t,end:t+Math.max(1,Math.ceil(path.distance/50)),to,after};p.state=label;p.task=null;};
 const wait=(p,state,t,duration,task)=>{p.state=state;p.until=t+duration;p.task=task;p.trip=null;};
 const startShopping=(p,t)=>{p.shopIndex=0;p.bag=0;nextShop(p,t);};
 const nextShop=(p,t)=>{if(t>=15*60+30||p.shopIndex>=6){travel(p,'store',t,'stash','Taking purchases to storage');return;}const choices=world.stalls.filter(s=>s.id!==world.booth),s=choices[(p.shopIndex*3+config.seed)%choices.length];travel(p,s.id,t,'shop','Walking to '+s.trade.toLowerCase());};
 const setup=(p,t)=>{p.carry=Math.min(8,reserve);reserve-=p.carry;travel(p,world.booth,t,'setup','Carrying stock to booth');};
 const arrive=(p,t,action)=>{
  if(action==='drop')wait(p,'Unloading at drop-off',t,selling?15:5,'unloaded');
  if(action==='storage')wait(p,'Storing supplies',t,10,'stored');
  if(action==='setup')wait(p,'Setting up booth',t,20,'ready');
  if(action==='shop'){if(t>=16*60){travel(p,'store',t,'stash','Market closed · returning purchases');}else wait(p,t<540?'Waiting for market to open':'Shopping',t,Math.max(0,540-t)+15,'purchased');}
  if(action==='stash')wait(p,'Storing purchases',t,5,'stashed');
  if(action==='restock')wait(p,'Collecting reserve stock',t,5,'restocked');
  if(action==='backBooth'){boothStock+=p.carry||0;p.carry=0;wait(p,'Staffing booth',t,Infinity,null);}
  if(action==='pack')wait(p,'Collecting belongings',t,10,'collected');
  if(action==='home'){purchasesHome+=p.bag||0;p.bag=0;p.state='Home again';p.task=null;returned++;if(p.id===0&&selling){stockHome=p.carry||0;p.carry=0;}log(t,p.name+' returned home.');}
 };
 log(360,config.day===6?`Week ${config.week} · Saturday market opens 09:00–16:00.`:'Market closed today. It opens only on Saturday.');
 for(let t=360;t<=1200;t++){
  if(config.day===6&&t===config.departure*60){stockHome=0;if(selling)people[0].carry=24;for(const p of people)travel(p,'drop',t,'drop','Going to market');log(t,`Left home · ${config.distance} m to the market gate.`);}
  for(const p of people){
   if(t>=540&&p.state==='Waiting for market to open')p.state='Shopping';
   if(p.trip&&t>=p.trip.end){const {to,after}=p.trip;p.node=to;p.trip=null;arrive(p,t,after);}
   if(p.task&&t>=p.until){const task=p.task;p.task=null;
    if(task==='unloaded'){travel(p,'store',t,'storage','Taking belongings to storage');log(t,p.name+' finished at the drop-off.');}
    if(task==='stored'){if(selling&&p.id===0){reserve=p.carry;p.carry=0;log(t,'Sale stock deposited in storage.');setup(p,t);}else if(buying&&p.id===(selling?1:0))startShopping(p,t);else wait(p,'Helping at storage',t,Infinity,null);}
    if(task==='ready'){boothStock+=p.carry;p.carry=0;wait(p,'Staffing booth',t,Infinity,null);log(t,'Booth ready; Abbie is covering sales.');}
    if(task==='purchased'){if(t<=960){bought++;p.bag++;log(t,`${p.name} bought item ${bought} of 6.`);}p.shopIndex++;nextShop(p,t);}
    if(task==='stashed'){stored+=p.bag||0;p.bag=0;wait(p,'Shopping finished · waiting at storage',t,Infinity,null);log(t,'Purchases stored for the journey home.');}
    if(task==='restocked'){p.carry=Math.min(8,reserve);reserve-=p.carry;travel(p,world.booth,t,'backBooth','Restocking booth');}
    if(task==='packed'){p.carry=(p.carry||0)+boothStock;boothStock=0;travel(p,'store',t,'pack','Returning unsold stock');}
    if(task==='collected'){if(buying&&p.id===(selling?1:0)){p.bag=stored;stored=0;}if(selling&&p.id===0){p.carry=(p.carry||0)+reserve;reserve=0;}p.collected=true;wait(p,'Ready to go home',t,Infinity,null);}
   }
  }
  const seller=people[0],staffed=selling&&seller.state==='Staffing booth'&&!seller.trip;
  if(config.day===6&&t>=540&&t<960&&t%15===0){
   const indoor=world.stalls[0].indoor,demand=(config.weather==='rain'&&!indoor?1:2)+(t>=660&&t<780?1:0);
   if(selling){const qty=staffed?Math.min(boothStock,demand):0;sold+=qty;boothStock-=qty;missed+=demand-qty;if(qty)transactions.push({minute:t,quantity:qty,staff:seller.id,node:seller.node,staffed});}
  }
  if(config.day===6&&staffed&&boothStock===0&&reserve>0&&t<945){travel(seller,'store',t,'restock','Fetching reserve stock');log(t,'Booth pauses while Abbie fetches more stock.');}
  if(config.day===6&&t===960){log(t,'Market closed. Packing and collecting belongings.');for(const p of people){if(selling&&p.id===0&&!p.trip)wait(p,'Packing booth',t,20,'packed');else if(!p.trip&&p.node==='store')wait(p,'Collecting belongings',t,10,'collected');}}
  // A late shopper completes the storage task, then collects. Nobody teleports home.
  if(config.day===6&&t>=960){for(const p of people)if(!p.trip&&!p.task&&!p.collected&&p.node==='store')wait(p,'Collecting belongings',t,10,'collected');}
  if(config.day===6&&people.every(p=>p.collected)&&!people.some(p=>p.departed)){for(const p of people){p.departed=true;travel(p,'home',t,'home','Walking home together');}log(t,'Everyone and all belongings are ready. Heading home.');}
  frames.push({minute:t,open:config.day===6&&t>=540&&t<960,sold,bought,stored,purchasesHome,reserve,boothStock,missed,stockHome,returned,people:people.map(p=>({id:p.id,name:p.name,state:p.state,node:p.node,position:p.trip?pointOnRoute(p.trip.path,(t-p.trip.start)/(p.trip.end-p.trip.start)):world.nodes.find(n=>n.id===p.node),bag:p.bag||0,carry:p.carry||0,staffing:selling&&p.id===0&&p.state==='Staffing booth'}))});
 }
 return {version:1,config,world,frames,events,transactions,summary:{sold,bought,purchasesHome,unsold:selling?24-sold:0,missed,returned,stockHome},hours:Array.from({length:15},(_,i)=>360+i*60)};
}


// A single scene tile encloses the occupied market, arrival court and waterfront.
// The distant home stays in the simulation graph outside the displayed tile.
export function marketHex(cells,nodes,waterfront){
 const points=[...cells.flatMap(c=>c.corners),...nodes.filter(n=>['gate','drop','store'].includes(n.id))];
 if(waterfront){const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x));points.push({x:minX-10,z:waterfront.bankZ+9},{x:maxX+10,z:waterfront.bankZ+9});}
 const cx=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2,cz=waterfront?waterfront.bankZ:(Math.min(...points.map(p=>p.z))+Math.max(...points.map(p=>p.z)))/2;
 const normals=Array.from({length:6},(_,i)=>({x:Math.cos(Math.PI/6+i*Math.PI/3),z:Math.sin(Math.PI/6+i*Math.PI/3)}));
 const radius=(Math.max(...points.flatMap(p=>normals.map(n=>(p.x-cx)*n.x+(p.z-cz)*n.z)))+6)/Math.cos(Math.PI/6);
 return {shape:'hexagon',cx,cz,radius,waterCoverage:waterfront?.5:0,display:{radius:12,thickness:.45,scale:12/radius},corners:Array.from({length:6},(_,i)=>({x:cx+radius*Math.cos(i*Math.PI/3),z:cz+radius*Math.sin(i*Math.PI/3)}))};
}
