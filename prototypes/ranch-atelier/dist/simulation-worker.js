importScripts('/property-planner.js');
importScripts('/neighborhood-mission.js');
'use strict';(()=>{const modules={"./terrain-source.cjs":function(module,exports,require){
/* Seeded world construction. No network, model calls or prompt interpretation. */
(function(root){
const size=180, rect=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function landscape(seed){
 seed=(Number(seed)>>>0)||1;const r=random(seed),phase=r()*6.28,bend=5+r()*8,level=103+r()*2,channel=99+r()*2,baseline=99+r()*18,tilt=(r()-.5)*.004;
 const streamY=x=>baseline+bend*Math.sin(x/size*5+phase)+3*Math.sin(x/size*10+phase*.7);
 const elevation=(x,y)=>channel-x*.007+(level-channel)*(1-Math.exp(-Math.abs(y-streamY(x))/36))+tilt*(y-90)+.28*Math.sin(x/34+phase)*Math.sin(y/43);
 const heights=Array.from({length:37},(_,j)=>Array.from({length:37},(_,i)=>+elevation(i*5,j*5).toFixed(3)));
 const centerline=Array.from({length:37},(_,i)=>[i*5,streamY(i*5),channel-i*5*.007]);
 const vegetation=[];for(let i=0;i<3600;i++){const x=3+r()*174,y=3+r()*174,rad=3.2+r()*2.2,edge=23+7*Math.sin(y/28+phase);
 if(!(x<edge||x>180-edge||y>155+4*Math.sin(x/23+phase))||Math.abs(y-streamY(x))<8||vegetation.some(t=>dist(t.position,[x,y])<(t.radius+rad)*.60))continue;
 vegetation.push({id:'tree-'+i,kind:r()<.27?'conifer':'deciduous',species:'Woodland canopy',position:[x,y,elevation(x,y)],radius:rad,height:10+r()*7});}
 const world={id:'procedural-'+seed,name:'A ranch grown from the stream',seed,bounds:{width:size,depth:size},coordinateSystem:{units:'metres'},terrain:{grid:{cols:37,rows:37,spacing:5,origin:[0,0],heights}},water:{brook:{centerline,width:5.3}},vegetation,buildings:[],parcels:[{id:'meadow',kind:'meadow',polygon:rect(20,8,140,153)}],paths:[],outdoorContents:[],actors:[],landDetails:[],grown:false};
 return world;
}
function grow(land){
 const w=JSON.parse(JSON.stringify(land));if(w.grown)return w;const r=random(w.seed^0x51c9),grid=w.terrain.grid;
 const waterY=x=>{const q=Math.max(0,Math.min(35.999,x/5)),i=Math.floor(q),f=q-i;return w.water.brook.centerline[i][1]*(1-f)+w.water.brook.centerline[i+1][1]*f};
 const height=(x,y)=>{const a=Math.max(0,Math.min(35.999,x/5)),b=Math.max(0,Math.min(35.999,y/5)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=grid.heights;return (h[j][i]*(1-u)+h[j][i+1]*u)*(1-v)+(h[j+1][i]*(1-u)+h[j+1][i+1]*u)*v};
 const boxes=[];const overlaps=(a,b,pad=4)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
 function place(id,name,kind,bw,bh,score){let best;
 for(let y=18;y<112-bh;y+=3)for(let x=28;x<151-bw;x+=3){const b={x,y,w:bw,h:bh};if(boxes.some(a=>overlaps(a,b)))continue;const pts=rect(x-3,y-3,bw+6,bh+6);if(pts.some(p=>p[1]>waterY(p[0])-10))continue;let zs=pts.map(p=>height(...p)),slope=(Math.max(...zs)-Math.min(...zs))/Math.min(bw,bh);if(slope>.12)continue;let value=score([x+bw/2,y+bh/2])-slope*90+r()*1.5;if(!best||value>best.value)best={...b,id,name,kind,value};}
 if(!best)throw Error('No suitable '+name.toLowerCase()+' site on this seed. Try a new landscape.');boxes.push(best);return best;}
 const gate=[65+r()*45,3];
 const house=place('farmhouse','Farmhouse','house',16,14,p=>-dist(p,gate));
 const hc=[house.x+8,house.y+7];const barn=place('barn','Red rescue barn','barn',20,15,p=>-Math.abs(dist(p,hc)-47)-Math.abs(p[1]-53)*.25);
 const bc=[barn.x+10,barn.y+7.5];const garden=place('vegetables','Kitchen garden','vegetables',19,15,p=>-dist(p,hc));
 const field=place('paddock','Meadow paddock','paddock',29,24,p=>-dist(p,bc));
 const room=(id,name,x,y,a,b)=>({id,name,kind:'room',polygon:rect(x,y,a,b),contents:[],doors:[],windows:[]});
 for(const b of [house,barn])w.buildings.push({id:b.id,name:b.name,kind:b.kind,polygon:rect(b.x,b.y,b.w,b.h),height:b.kind==='barn'?5:3,baseZ:height(b.x,b.y),description:'Placed by dry-ground, slope, separation and access rules.',rooms:b.kind==='barn'?[room('work','Open barn',b.x,b.y,b.w,b.h)]:[room('living','Living & kitchen',b.x,b.y,10,14),room('quiet','Quiet rooms',b.x+10,b.y,6,14)]});
 for(const b of [garden,field])w.parcels.push({id:b.id,name:b.name,kind:b.kind,polygon:rect(b.x,b.y,b.w,b.h),fenced:b===field});
 // Route a shared footpath network through dry unoccupied grid cells.
 const step=2,n=90,key=(x,y)=>y*n+x,cell=p=>[Math.floor(p[0]/step),Math.floor(p[1]/step)],point=k=>[(k%n+.5)*step,(Math.floor(k/n)+.5)*step];
 const blocked=(x,y)=>{const px=x*2+1,py=y*2+1;return py>waterY(px)-7||px<24||px>156||boxes.some(b=>px>b.x-1&&px<b.x+b.w+1&&py>b.y-1&&py<b.y+b.h+1)};
 const network=new Set([key(...cell(gate))]);
 for(const b of boxes){const door=[b.x+b.w/2,b.y],start=cell([door[0],door[1]-3]),queue=[start],seen=new Set([key(...start)]),prev=new Map();let hit;
 for(let z=0;z<queue.length;z++){const [x,y]=queue[z],k=key(x,y);if(network.has(k)){hit=k;break}for(const [dx,dy]of [[0,-1],[1,0],[-1,0],[0,1]]){const a=x+dx,c=y+dy,q=key(a,c);if(a<0||a>=n||c<0||c>=n||seen.has(q)||blocked(a,c))continue;seen.add(q);prev.set(q,k);queue.push([a,c]);}}
 if(hit===undefined)throw Error('A path could not reach '+b.name+'. Try a new landscape.');const points=[];for(let k=hit;k!==undefined;k=prev.get(k)){network.add(k);points.push(point(k))}points.reverse();w.paths.push({id:b.id+'-path',points:[door,...points],width:b===house?2.5:1.5});b.gate=door;}
 for(let i=0;i<6;i++)w.outdoorContents.push({id:'bed-'+i,name:'Garden bed '+(i+1),kind:'garden-bed',position:[garden.x+2+(i%2)*8,garden.y+2+Math.floor(i/2)*4],size:[6,2.5]});
 w.vegetation=w.vegetation.filter(t=>!boxes.some(b=>t.position[0]>b.x-t.radius-2&&t.position[0]<b.x+b.w+t.radius+2&&t.position[1]>b.y-t.radius-2&&t.position[1]<b.y+b.h+t.radius+2));
 w.grown=true;w.placement=boxes;w.checks={dry:boxes.every(b=>rect(b.x,b.y,b.w,b.h).every(p=>p[1]<waterY(p[0])-7)),nonoverlap:boxes.every((a,i)=>boxes.slice(i+1).every(b=>!overlaps(a,b,0))),connected:w.paths.length===boxes.length};return w;
}
root.ProceduralRanch={landscape,grow};if(typeof module!=='undefined')module.exports=root.ProceduralRanch;
})(typeof window!=='undefined'?window:globalThis);

},
"./sim.cjs":function(module,exports,require){
'use strict';
const terrain=require('./terrain-source.cjs');

function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const rect=b=>[[b.x,b.y],[b.x+b.w,b.y],[b.x+b.w,b.y+b.h],[b.x,b.y+b.h]];
const center=b=>[b.x+b.w/2,b.y+b.h/2];
const overlap=(a,b,p=0)=>a.x<b.x+b.w+p&&a.x+a.w+p>b.x&&a.y<b.y+b.h+p&&a.y+a.h+p>b.y;
function environment(seed,size,topology=4){const w=terrain.landscape(seed),scale=size/180;w.bounds={width:size,depth:size};w.terrain.grid.spacing*=scale;w.water.brook.centerline=w.water.brook.centerline.map(([x,y,z])=>[x*scale,y*scale,z]);w.vegetation=w.vegetation.map(t=>({...t,position:[t.position[0]*scale,t.position[1]*scale,t.position[2]]}));w.parcels=[];const g=w.terrain.grid;
 const level=Number.isInteger(topology)?Math.max(1,Math.min(9,topology)):4,base=103,relief=[0,.2,.55,1,1.35,1.8,2.2,2.8,3.4][level-1],amplitude=[0,0,0,0,4,10,22,40,70][level-1],phase=(seed>>>0)*.000137;
 if(level!==4){for(let j=0;j<g.rows;j++)for(let i=0;i<g.cols;i++){const x=i/(g.cols-1),z=j/(g.rows-1),warp=level>=8?.24*Math.sin(z*17+phase):0,broad=Math.sin((x+warp)*11+phase)*Math.cos(z*9-phase*.7),detail=Math.sin(x*27+z*19+phase)*.24,peak=Math.max(0,broad+detail);g.heights[j][i]=base+(g.heights[j][i]-base)*relief+amplitude*peak**3;}
 w.water.brook.centerline=w.water.brook.centerline.map(p=>[p[0],p[1],base+(p[2]-base)*relief]);}
 w.terrain.topology={level,seed,algorithm:'terrain-levels-v1'};
 const waterY=x=>{let q=Math.max(0,Math.min(35.999,x/g.spacing)),i=Math.floor(q);return w.water.brook.centerline[i][1]*(1-q+i)+w.water.brook.centerline[i+1][1]*(q-i)};
 const height=(x,y)=>{let a=Math.max(0,Math.min(35.999,x/g.spacing)),b=Math.max(0,Math.min(35.999,y/g.spacing)),i=Math.floor(a),j=Math.floor(b),u=a-i,v=b-j,h=g.heights;return(h[j][i]*(1-u)+h[j][i+1]*u)*(1-v)+(h[j+1][i]*(1-u)+h[j+1][i+1]*u)*v};
 const dry=(x,y)=>x>=8&&y>=8&&x<size-8&&y<size-8&&Math.abs(y-waterY(x))>12;
 const slope=(x,y)=>Math.hypot(height(x+3,y)-height(x-3,y),height(x,y+3)-height(x,y-3))/6;
 return {w,size,waterY,height,dry,slope};}
function legacyPlan(config){const c={seed:54,size:360,horses:6,mode:'hay',strategy:'yard',...config},e=environment(c.seed,c.size),r=rng(c.seed^12345),buildings=[],events=[],failures=[],step=4,n=Math.floor(c.size/step),key=(x,y)=>y*n+x,pt=k=>[(k%n+.5)*step,(Math.floor(k/n)+.5)*step],cell=p=>key(Math.min(n-1,Math.max(0,Math.floor(p[0]/step))),Math.min(n-1,Math.max(0,Math.floor(p[1]/step)))),trees=e.w.vegetation;
 const forest=(x,y)=>x<c.size*.14||x>c.size*.86||y>c.size*.86;
 let candidates=[];for(let y=28;y<c.size-28;y+=8)for(let x=28;x<c.size-28;x+=8){if(!e.dry(x,y)||forest(x,y)||Math.abs(y-e.waterY(x))<32)continue;const waterDistance=Math.abs(y-e.waterY(x));candidates.push({p:[x,y],score:-e.slope(x,y)*150-Math.abs(waterDistance-55)*.12-dist([x,y],[c.size*.5,c.size*.35])*.025+r()*5});}
 candidates.sort((a,b)=>b.score-a.score);if(!candidates.length)return {config:c,failures:['No suitable core'],valid:false};const core=candidates[Math.min(c.coreRank??0,candidates.length-1)].p,yard={id:'yard',x:core[0]-12,y:core[1]-12,w:24,h:24};
 events.push({agent:'site',action:'reserve-yard',position:core,reason:'Dry, gentle ground near water with room around a shared working yard'});
 const specs=[{id:'shelter',name:'Animal shelter',w:28,h:16,capacity:c.horses,wood:180,work:70},{id:'abbie-home',name:"Abbie�s family home",w:18,h:16,beds:4,wood:150,work:60},{id:'ani-home',name:"Ani�s family home",w:18,h:16,beds:4,wood:150,work:60},{id:'feed',name:'Feed store',w:12,h:10,wood:70,work:25},{id:'water',name:'Water supply point',w:8,h:8,wood:25,work:15},{id:'garden',name:'Kitchen garden',w:20,h:16,wood:30,work:20}];
 for(const spec of specs){let choices=[];for(let y=12;y<c.size-28;y+=4)for(let x=12;x<c.size-28;x+=4)for(let rot=0;rot<2;rot++){const b={...spec,x,y,w:rot?spec.h:spec.w,h:rot?spec.w:spec.h};if(x+b.w>c.size-12||y+b.h>c.size-12||overlap(b,yard,3)||buildings.some(a=>overlap(a,b,c.buildingGap??8)))continue;const p=center(b),corners=rect(b);if(!corners.every(q=>e.dry(...q)&&Math.sign(q[1]-e.waterY(q[0]))===Math.sign(core[1]-e.waterY(core[0]))&&!forest(...q))||e.slope(...p)>.12)continue;let target=core;if(spec.id==='feed'&&buildings[0])target=center(buildings[0]);if(spec.id==='garden'&&buildings[1])target=center(buildings[1]);let score=-dist(p,target)-e.slope(...p)*100+r()*3;if(c.strategy==='spread')score=-Math.abs(dist(p,target)-65)+r()*3;if(c.strategy==='water')score-=Math.abs(p[1]-e.waterY(p[0]))*.7;choices.push({b,score});}
 choices.sort((a,b)=>b.score-a.score);if(!choices.length){failures.push('Cannot place '+spec.id);continue}const b=choices[0].b;let doors=[[b.x+b.w/2,b.y-3],[b.x+b.w/2,b.y+b.h+3],[b.x-3,b.y+b.h/2],[b.x+b.w+3,b.y+b.h/2]];doors.sort((a,d)=>dist(a,core)-dist(d,core));b.door=doors[0];buildings.push(b);events.push({agent:spec.id.includes('home')?'household':spec.id,action:'place',id:b.id,position:center(b),reason:'Best feasible location relative to yard and related facilities'});}
 const blocked=k=>{let p=pt(k);return !e.dry(...p)||buildings.some(b=>p[0]>b.x-1&&p[0]<b.x+b.w+1&&p[1]>b.y-1&&p[1]<b.y+b.h+1)};
 function route(start,goal){let s=cell(start),g=cell(goal);if(blocked(s)||blocked(g))return null;let queue=[s],prev=new Int32Array(n*n).fill(-1);prev[s]=s;for(let i=0;i<queue.length;i++){let k=queue[i];if(k===g){let a=[];while(k!==s){a.push(pt(k));k=prev[k]}a.push(pt(s));return a.reverse()}let x=k%n,y=Math.floor(k/n);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){let xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=n||yy>=n)continue;let j=key(xx,yy);if(prev[j]!==-1||blocked(j)||Math.abs(e.height(...pt(k))-e.height(...pt(j)))>1)continue;prev[j]=k;queue.push(j)}}return null;}
 const paths=[];for(const b of buildings){let p=route(core,b.door);if(!p)failures.push('Unreachable '+b.id);else paths.push({id:b.id,points:p,length:(p.length-1)*step,width:3});}
 const entry=[core[0],core[1]<e.waterY(core[0])?10:c.size-10],access=route(core,entry);if(access)paths.push({id:'entry',points:access,length:(access.length-1)*step,width:4});else failures.push('No outside access');
 const occupied=new Set(paths.flatMap(p=>p.points.map(cell)));const pastureTarget=c.mode==='grazing'?c.horses*8094:c.horses*500;
 const available=k=>{let p=pt(k);return !blocked(k)&&!forest(...p)&&!occupied.has(k)&&!buildings.some(b=>p[0]>b.x-6&&p[0]<b.x+b.w+6&&p[1]>b.y-6&&p[1]<b.y+b.h+6)&&!overlap({x:p[0]-2,y:p[1]-2,w:4,h:4},yard,4)&&e.slope(...p)<.12};
 let potential=[];for(let k=0;k<n*n;k++)if(available(k)&&Math.sign(pt(k)[1]-e.waterY(pt(k)[0]))===Math.sign(core[1]-e.waterY(core[0])))potential.push(k);
 const shelter=buildings.find(b=>b.id==='shelter'),target=shelter?center(shelter):core;potential.sort((a,b)=>dist(pt(a),target)-dist(pt(b),target));let cells=[],gateRoute=null,seen=new Set();
 // Select a connected component reachable from the yard, then grow within it.
 for(const seed of potential){if(seen.has(seed))continue;let q=[seed];seen.add(seed);for(let i=0;i<q.length;i++){let k=q[i],x=k%n,y=Math.floor(k/n);for(let j of [x>0?k-1:-1,x<n-1?k+1:-1,y>0?k-n:-1,y<n-1?k+n:-1])if(j>=0&&!seen.has(j)&&available(j)){seen.add(j);q.push(j)}}const path=route(core,pt(seed));if(path&&q.length>cells.length){cells=q.slice(0,Math.ceil(pastureTarget/16));gateRoute=path;if(cells.length*16>=pastureTarget)break;}}
 if(gateRoute)paths.push({id:'pasture',points:gateRoute,length:(gateRoute.length-1)*step,width:3});if(cells.length*16<pastureTarget)failures.push(`Pasture shortfall: ${cells.length*16} / ${pastureTarget} m2`);
 const pasture={cells:cells.map(pt),area:cells.length*16,target:pastureTarget,gate:gateRoute?.at(-1),cellSize:step};
 const cellSet=new Set(cells),gateCells=new Set((gateRoute||[]).map(cell)),fences=[];
 for(const k of cells){const [x,y]=pt(k);for(const [neighbor,a,b] of [[k-1,[x-2,y-2],[x-2,y+2]],[k+1,[x+2,y-2],[x+2,y+2]],[k-n,[x-2,y-2],[x+2,y-2]],[k+n,[x-2,y+2],[x+2,y+2]]])if(!cellSet.has(neighbor))fences.push({points:[a,b],gate:gateCells.has(k)&&gateCells.has(neighbor)});}
 pasture.fences=fences;

 const world={...e.w,name:"Abbie & Ani�s two-family ranch",buildings:buildings.filter(b=>b.beds||b.id==='shelter'||b.id==='feed').map(b=>({...b,polygon:rect(b),kind:b.beds?'house':'barn',baseZ:e.height(b.x,b.y),height:4})),paths,actors:[],grown:true};
 const jobs=buildings.map(b=>({id:b.id,position:b.door,wood:b.wood,work:b.work,remaining:b.work}));jobs.push({id:'pasture',position:pasture.gate||core,wood:100,work:35,remaining:35});jobs.push({id:'access',position:core,wood:20,work:25,remaining:25});
 return {config:c,core,yard,buildings,pasture,paths,world,events,failures,valid:failures.length===0,jobs,route};}
function plan(config){return FarmProperty.plan(config,environment);}
function grow(config,attempts=8){let best;for(let i=0;i<attempts;i++){const p=plan({...config,coreRank:i*3});if(!best||p.pasture.area>best.pasture.area)best=p;if(p.valid)return p;}return best;}
function simulate(plan,options={}){if(!plan.valid)return {completed:false,reason:'Layout requirements unmet',days:0};const days=options.days??90,speed=options.speed??1.2,supplyPerDay=options.supplyPerDay??60,people=options.people??['Abbie','Ani','Mommy','Daddy','Jeff','Alexis','Marley'];let roster=people.map(name=>({name,role:name==='Marley'?'retriever':'general',rate:name==='Marley'?.3:1,hours:0,travelHours:0,tasks:0}));const jobs=structuredClone(plan.jobs),events=[],stock={wood:80,staged:0},delivered={wood:0},used={wood:0};let day=0;
 for(day=1;day<=days;day++){stock.wood+=supplyPerDay;delivered.wood+=supplyPerDay;for(const a of roster){let hours=6;if(a.role==='retriever'){// Dog fetches small staged supplies; never manufactures materials.
 const fetch=Math.min(stock.wood,2);stock.wood-=fetch;stock.staged+=fetch;a.hours+=.5;a.tasks++;events.push({day,actor:a.name,action:'retrieve-small-supplies',amount:fetch});continue;}
 for(const j of jobs){if(j.remaining<=0)continue;let p=plan.paths.find(p=>p.id===j.id),travel=(p?.length||0)*2/(speed*3600);if(travel>=hours)continue;if(!j.started){if(stock.wood+stock.staged<j.wood)continue;const staged=Math.min(stock.staged,j.wood);stock.staged-=staged;stock.wood-=j.wood-staged;used.wood+=j.wood;j.started=true;events.push({day,actor:a.name,action:'start',job:j.id});}let effort=Math.min(j.remaining,(hours-travel)*a.rate);events.push({day,actor:a.name,action:a.role==='light-work'?'assist':'work',job:j.id,effort,travelHours:travel});j.remaining-=effort;a.hours+=effort/a.rate;a.travelHours+=travel;hours-=effort/a.rate+travel;a.tasks++;if(j.remaining<1e-8){j.remaining=0;events.push({day,actor:a.name,action:'finish',job:j.id});}if(hours<.05)break;}}
 if(jobs.every(j=>j.remaining===0))break;}
 // A separate 30-day operation phase with explicit delivered inputs and recurring care tasks.
 let operation={days:0,unmet:0,feedDelivered:0,feedConsumed:0,waterDelivered:0,waterConsumed:0,manureProduced:0,manureRemoved:0,assignments:[]};let feed=0,water=0,manure=0;
 if(jobs.every(j=>j.remaining===0))for(let d=0;d<30;d++){let horses=plan.config.horses,food=horses*10,drink=horses*40;const suppliedFood=food*(options.operatingSupplyFraction??1),suppliedWater=drink*(options.operatingSupplyFraction??1);feed+=suppliedFood;water+=suppliedWater;operation.feedDelivered+=suppliedFood;operation.waterDelivered+=suppliedWater;let dailyHours=horses*.6+2+plan.paths.reduce((s,p)=>s+p.length,0)*4/(speed*3600);let available=roster.filter(a=>a.role!=='retriever').reduce((s,a)=>s+6*a.rate,0);if(dailyHours>available)operation.unmet++;let demand=dailyHours;for(const actor of roster.filter(a=>a.role!=='retriever')){const work=Math.min(demand,6*actor.rate);if(work>0)operation.assignments.push({day:d+1,actor:actor.name,task:'feeding, watering, cleaning and family upkeep',effort:work});demand-=work;}const eaten=Math.min(feed,food),drunk=Math.min(water,drink);if(eaten<food||drunk<drink)operation.unmet++;feed-=eaten;water-=drunk;manure+=horses*25;operation.feedConsumed+=eaten;operation.waterConsumed+=drunk;operation.manureProduced+=horses*25;if((d+1)%7===0){operation.manureRemoved+=manure;manure=0;}operation.days++;}
 return {completed:jobs.every(j=>j.remaining===0),days:Math.min(day,days),roster,events,jobs,stock,delivered,used,operation,remaining:{feed,water,manure},assumptions:'Six-hour game workdays; abstract material units and labor hours; purchased building supplies, full daily feed and water deliveries in both modes; no calibrated husbandry, construction, grazing growth, meals, sleep or social simulation.'};}
function validate(p,s){const issues=[...p.failures];if(p.buildings.filter(b=>b.beds).length!==2)issues.push('Two homes required');if(p.buildings.filter(b=>b.beds).reduce((a,b)=>a+b.beds,0)<7)issues.push('Insufficient beds');if(p.buildings.find(b=>b.id==='shelter')?.capacity<p.config.horses)issues.push('Insufficient shelter');for(let i=0;i<p.buildings.length;i++)for(let j=i+1;j<p.buildings.length;j++)if(overlap(p.buildings[i],p.buildings[j]))issues.push('Building collision');for(const b of p.buildings)if(!p.paths.some(x=>x.id===b.id))issues.push('Missing route '+b.id);if(p.pasture.area<p.pasture.target)issues.push('Insufficient pasture');if(!s.completed)issues.push('Construction unfinished');if(s.completed&&Math.abs(80+s.delivered.wood-s.used.wood-s.stock.wood-s.stock.staged)>1e-6)issues.push('Material conservation error');if(s.operation?.unmet)issues.push('Daily care or resource needs unmet');return {passed:issues.length===0,issues:[...new Set(issues)]};}
module.exports={plan,grow,simulate,validate,environment};

},
"./animals.cjs":function(module,exports,require){
'use strict';
// Headless, fixed-step animal and forage simulation. All rates are game parameters.
const {environment}=require('./sim.cjs');
const key=p=>p.join(',');
function create(plan,options={}){
 const cfg={tickMinutes:10,horses:plan.config.horses,foodPerDay:10,waterPerDay:40,speed:1,capacityPerM2:.2,initialPerM2:.12,residualPerM2:.04,growthPerM2Day:.004,moisture:1,waterPerDaySupply:300,hayPerDay:0,gateOpen:true,roadMultiplier:1,...options};
 for(const k of ['tickMinutes','speed','capacityPerM2'])if(!(cfg[k]>0))throw Error('Invalid '+k);
 const env=environment(plan.config.seed,plan.config.size,plan.config.topology),nodes=new Map(),pastureKeys=new Set(plan.pasture.cells.map(key));
 for(const p of plan.pasture.cells)nodes.set(key(p),{p,grass:cfg.initialPerM2*16,pasture:true});
 for(const path of plan.paths)for(const p of path.points){const k=key(p);if(!nodes.has(k))nodes.set(k,{p,grass:0,pasture:false});nodes.get(k).road=true;}
 const gates=plan.pasture.fences.filter(f=>f.gate),crossesGate=(a,b)=>{const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];return cfg.gateOpen&&gates.some(g=>Math.abs(mid[0]-(g.points[0][0]+g.points[1][0])/2)<.01&&Math.abs(mid[1]-(g.points[0][1]+g.points[1][1])/2)<.01)};
 for(const node of nodes.values()){const[x,y]=node.p;node.edges=[];for(const p of [[x+4,y],[x-4,y],[x,y+4],[x,y-4]]){const next=nodes.get(key(p));if(!next)continue;if(node.pasture!==next.pasture&&!crossesGate(node.p,next.p))continue;const slope=Math.abs(env.height(...p)-env.height(x,y))/4;const surface=node.road&&next.road?cfg.roadMultiplier:1.6;node.edges.push({to:key(p),seconds:4/cfg.speed*surface*(1+8*slope)});}}
 const service=id=>{const path=plan.paths.find(p=>p.id===id);return path?key(path.points.at(-1)):null;};const shelter=service('shelter'),water=service('water'),feed=service('feed');if(!shelter||!nodes.has(shelter))throw Error('Shelter entrance required');
 const animals=Array.from({length:cfg.horses},(_,i)=>({id:'horse-'+(i+1),at:shelter,edge:null,foodDebt:0,waterDebt:0,grazed:0,hayEaten:0,drank:0,travelSeconds:0,shelterMinutes:0,unmetFoodTicks:0,unmetWaterTicks:0,blockedTicks:0,activity:'rest'}));
 return {cfg,nodes:Object.fromEntries(nodes),services:{shelter,water,feed},animals,minute:0,water:0,hay:0,ledger:{initialGrass:plan.pasture.cells.length*cfg.initialPerM2*16,growth:0,grazed:0,hayDelivered:0,hayEaten:0,waterDelivered:0,waterDrunk:0},daily:[],traffic:{}};
}
function route(s,start,predicate){const queue=[start],prev=new Map([[start,null]]);for(let i=0;i<queue.length;i++){const k=queue[i];if(predicate(s.nodes[k],k)){const path=[];for(let q=k;prev.get(q)!==null;q=prev.get(q))path.push(q);return path.reverse();}for(const e of s.nodes[k].edges)if(!prev.has(e.to)){prev.set(e.to,k);queue.push(e.to);}}return null;}
function step(s){const c=s.cfg,dt=c.tickMinutes,dayFraction=dt/1440;if(s.minute%1440===0){s.water+=c.waterPerDaySupply;s.hay+=c.hayPerDay;s.ledger.waterDelivered+=c.waterPerDaySupply;s.ledger.hayDelivered+=c.hayPerDay;}
 for(const node of Object.values(s.nodes))if(node.pasture){const room=Math.max(0,c.capacityPerM2*16-node.grass),growth=Math.min(room,c.growthPerM2Day*16*c.moisture*dayFraction*Math.max(0,1-node.grass/(c.capacityPerM2*16)));node.grass+=growth;s.ledger.growth+=growth;}
 // Rotate service order each tick to avoid permanently favoring the first animal.
 const offset=Math.floor(s.minute/dt)%s.animals.length;
 for(let i=0;i<s.animals.length;i++){const a=s.animals[(i+offset)%s.animals.length];a.foodDebt+=c.foodPerDay*dayFraction;a.waterDebt+=c.waterPerDay*dayFraction;let remaining=dt*60;
 const night=s.minute%1440<360||s.minute%1440>=1200;
 let kind='rest',predicate=(n,k)=>k===s.services.shelter;
 if(a.waterDebt>=2){kind='drink';predicate=(n,k)=>k===s.services.water;}
 else if(a.foodDebt>=.4){kind='graze';predicate=n=>n.pasture&&n.grass>c.residualPerM2*16+.25;}
 else if(!night){kind='idle';predicate=(n,k)=>k===a.at;}
 let path=route(s,a.edge?a.edge.to:a.at,predicate);
 if(kind==='graze'&&path===null&&s.hay>0){kind='hay';predicate=(n,k)=>k===s.services.feed;path=route(s,a.edge?a.edge.to:a.at,predicate);}
 if(path===null){a.blockedTicks++;a.activity='blocked-'+kind;}else{
 a.activity=kind;
 if(a.edge){let time=Math.min(remaining,a.edge.remaining);a.edge.remaining-=time;remaining-=time;a.travelSeconds+=time;if(a.edge.remaining<=1e-8){a.at=a.edge.to;a.edge=null;}}
 while(!a.edge&&remaining>0&&path.length){const to=path.shift(),e=s.nodes[a.at].edges.find(e=>e.to===to);if(!e)throw Error('Non-adjacent movement');s.traffic[a.at+'>'+to]=(s.traffic[a.at+'>'+to]||0)+1;const used=Math.min(remaining,e.seconds);a.travelSeconds+=used;remaining-=used;if(used<e.seconds){a.edge={to,remaining:e.seconds-used,total:e.seconds};break;}a.at=to;}
 if(!a.edge&&predicate(s.nodes[a.at],a.at)&&remaining>0){const fraction=remaining/(dt*60);if(kind==='drink'){const amount=Math.min(a.waterDebt,s.water,15*fraction);s.water-=amount;a.waterDebt-=amount;a.drank+=amount;s.ledger.waterDrunk+=amount;}else if(kind==='graze'){const n=s.nodes[a.at],amount=Math.min(a.foodDebt,Math.max(0,n.grass-c.residualPerM2*16),1*fraction);n.grass-=amount;a.foodDebt-=amount;a.grazed+=amount;s.ledger.grazed+=amount;}else if(kind==='hay'){const amount=Math.min(a.foodDebt,s.hay,1*fraction);s.hay-=amount;a.foodDebt-=amount;a.hayEaten+=amount;s.ledger.hayEaten+=amount;}else if(kind==='rest')a.shelterMinutes+=remaining/60;}
 }
 if(a.foodDebt>c.foodPerDay)a.unmetFoodTicks++;if(a.waterDebt>c.waterPerDay)a.unmetWaterTicks++;
 }
 s.minute+=dt;if(s.minute%1440===0)s.daily.push({day:s.minute/1440,grass:Object.values(s.nodes).reduce((v,n)=>v+n.grass,0),foodDebt:s.animals.reduce((v,a)=>v+a.foodDebt,0),waterDebt:s.animals.reduce((v,a)=>v+a.waterDebt,0),animals:s.animals.map(a=>({id:a.id,position:position(s,a),activity:a.activity}))});return s;
}
function position(s,a){const from=s.nodes[a.at].p;if(!a.edge)return from.slice();const to=s.nodes[a.edge.to].p,f=1-a.edge.remaining/a.edge.total;return from.map((v,i)=>v+(to[i]-v)*f);}
function summarize(s){const grass=Object.values(s.nodes).reduce((v,n)=>v+n.grass,0),l=s.ledger;return {days:s.minute/1440,horses:s.animals.length,grassRemaining:grass,grassConsumed:l.grazed,grassRegrown:l.growth,hayConsumed:l.hayEaten,foodDebt:s.animals.reduce((v,a)=>v+a.foodDebt,0),waterDebt:s.animals.reduce((v,a)=>v+a.waterDebt,0),travelHours:s.animals.reduce((v,a)=>v+a.travelSeconds,0)/3600,unmetFoodAnimalDays:s.animals.reduce((v,a)=>v+a.unmetFoodTicks,0)*s.cfg.tickMinutes/1440,unmetWaterAnimalDays:s.animals.reduce((v,a)=>v+a.unmetWaterTicks,0)*s.cfg.tickMinutes/1440,blockedTicks:s.animals.reduce((v,a)=>v+a.blockedTicks,0),balanceErrors:{grass:l.initialGrass+l.growth-l.grazed-grass,hay:l.hayDelivered-l.hayEaten-s.hay,water:l.waterDelivered-l.waterDrunk-s.water}};}
function run(plan,options={}){const s=create(plan,options);for(let i=0;i<(options.days??90)*1440/s.cfg.tickMinutes;i++)step(s);return s;}
module.exports={create,step,run,summarize,position,route};


},
"./sanctuary.cjs":function(module,exports,require){
'use strict';
// Species traits are research-informed; all numeric capacities are game design units.
const profiles={
 horse:{food:'forage',natural:['grass'],shelter:'equine-shelter',behaviors:['graze','rest','explore'],space:8,care:3},
 donkey:{food:'equine-fibre',natural:['grass'],shelter:'dry-equine-shelter',behaviors:['graze','rest','explore'],space:5,care:2},
 mule:{food:'equine-fibre',natural:['grass'],shelter:'dry-equine-shelter',behaviors:['graze','rest','explore'],space:6,care:2},
 cow:{food:'cattle-forage',natural:['grass','forbs'],shelter:'cattle-shelter',behaviors:['graze','ruminate','rest'],space:10,care:4},
 goat:{food:'goat-forage',natural:['browse','forbs'],shelter:'goat-shelter',behaviors:['browse','climb','rest'],space:3,care:2},
 sheep:{food:'sheep-forage',natural:['grass','forbs'],shelter:'sheep-shelter',behaviors:['graze','ruminate','rest'],space:3,care:2},
 pig:{food:'pig-ration',natural:['roots'],shelter:'pig-house',behaviors:['root','wallow','nest','rest'],space:3,care:3},
 chicken:{food:'chicken-ration',natural:['seeds','invertebrates'],shelter:'secure-coop',behaviors:['scratch','dust-bathe','perch','rest'],space:1,care:1},
 turkey:{food:'turkey-ration',natural:['seeds','invertebrates'],shelter:'turkey-house',behaviors:['forage','dust-bathe','rest'],space:1.5,care:1.5},
 duck:{food:'duck-ration',natural:['invertebrates','greens'],shelter:'waterfowl-house',behaviors:['dabble','bathe','preen','rest'],space:1.5,care:1.5},
 goose:{food:'goose-ration',natural:['grass','greens'],shelter:'waterfowl-house',behaviors:['graze','bathe','preen','rest'],space:2,care:1.5},
 alpaca:{food:'camelid-forage',natural:['grass'],shelter:'camelid-shelter',behaviors:['graze','rest','explore'],space:4,care:2},
 llama:{food:'camelid-forage',natural:['grass','browse'],shelter:'camelid-shelter',behaviors:['graze','browse','rest'],space:5,care:2},
 rabbit:{food:'rabbit-hay-and-ration',natural:['grass','greens'],shelter:'secure-rabbit-home',behaviors:['forage','hide','explore','rest'],space:1,care:1},
 dog:{food:'dog-food',natural:[],shelter:'family-home',behaviors:['sniff','play','retrieve','rest'],space:1,care:1}
};
const actions={
 dog:[{id:'chew-toy',label:'Give Marley a bone-shaped chew toy',effect:'delighted',durationDays:7},{id:'fetch',label:'Play fetch',effect:'playful',durationDays:2}],
 default:[{id:'enrichment',label:'Offer suitable enrichment',effect:'content',durationDays:3}]
};
function create(options={}){return {version:1,day:0,mode:'sanctuary',capacities:{space:300,care:150,...options.capacities},shelters:{...options.shelters},residents:[],requests:[],events:[],stocks:{},pasture:{grass:100,browse:100,forbs:100,seeds:100,invertebrates:100,roots:100,greens:100},resting:[],ledger:{deliveries:0,eaten:0,initialStock:0},ecology:{rootDisturbance:0,scratching:0,manure:0},supplied:options.supplied??true};}
function requirements(s,requests){let space=0,care=0,shelters={};for(const r of [...s.residents,...requests]){const p=profiles[r.species];space+=p.space;care+=p.care;shelters[p.shelter]=(shelters[p.shelter]||0)+1;}return {space,care,shelters};}
function request(s,species,count){if(!profiles[species]||!Number.isInteger(count)||count<1||count>100)throw Error('Invalid adoption request');const arrivals=Array.from({length:count},()=>({species})),need=requirements(s,arrivals),missing=[];if(need.space>s.capacities.space)missing.push('land');if(need.care>s.capacities.care)missing.push('care-capacity');for(const[k,v]of Object.entries(need.shelters))if((s.shelters[k]||0)<v)missing.push(k);if(!s.supplied)missing.push('reliable-feed-and-water');const req={id:s.requests.length+1,species,count,status:missing.length?'waiting-for-preparation':'ready',missing,requirements:need};s.requests.push(req);s.events.push({day:s.day,type:'adoption-request',...structuredClone(req)});return req;}
function prepare(s,id,changes){const req=s.requests.find(r=>r.id===id);if(!req||req.status==='admitted')throw Error('No pending request');if(changes.space!==undefined)s.capacities.space=changes.space;if(changes.care!==undefined)s.capacities.care=changes.care;if(changes.shelters)Object.assign(s.shelters,changes.shelters);if(changes.supplied!==undefined)s.supplied=changes.supplied;return admit(s,id);}
function admit(s,id){const req=s.requests.find(r=>r.id===id);if(!req||req.status==='admitted')throw Error('No pending request');const need=requirements(s,Array.from({length:req.count},()=>({species:req.species})));let missing=[];if(need.space>s.capacities.space)missing.push('land');if(need.care>s.capacities.care)missing.push('care-capacity');for(const[k,v]of Object.entries(need.shelters))if((s.shelters[k]||0)<v)missing.push(k);if(!s.supplied)missing.push('reliable-feed-and-water');req.missing=missing;if(missing.length){req.status='waiting-for-preparation';return req;}for(let i=0;i<req.count;i++){const species=req.species;s.residents.push({id:'resident-'+(s.residents.length+1),species,name:species==='dog'?'Marley':species+' '+(s.residents.filter(r=>r.species===species).length+1),happiness:70,effects:[],activity:'settling-in',consumed:0});}req.status='admitted';s.events.push({day:s.day,type:'arrivals',species:req.species,count:req.count});return req;}
function interact(s,id,actionId){const resident=s.residents.find(r=>r.id===id);if(!resident)throw Error('Unknown resident');const action=(actions[resident.species]||actions.default).find(a=>a.id===actionId);if(!action)throw Error('Unsupported interaction for species');resident.effects=resident.effects.filter(e=>e.id!==action.id);resident.effects.push({...action,start:s.day,expires:s.day+action.durationDays});resident.happiness=95;s.events.push({day:s.day,type:'interaction',resident:id,action:action.id,expires:s.day+action.durationDays});return inspect(s,id);}
function inspect(s,id){const r=s.residents.find(r=>r.id===id);if(!r)throw Error('Unknown resident');return {id:r.id,name:r.name,species:r.species,activity:r.activity,happiness:r.happiness,care:'Caretaker handles daily needs',actions:actions[r.species]||actions.default,effects:structuredClone(r.effects)};}
function step(s){s.day++;s.resting=[];for(const [k,v]of Object.entries(s.pasture)){if(v<25)s.resting.push(k);s.pasture[k]=Math.min(100,v+2);}
 for(const r of s.residents){const p=profiles[r.species];const resource=p.natural.find(k=>!s.resting.includes(k)&&s.pasture[k]>=1);let natural=0;if(resource){natural=['pig','chicken','turkey','duck','goose','rabbit'].includes(r.species)?.1:.5;s.pasture[resource]-=natural;}
 // Natural forage is supplementary in this coarse mixed-species prototype.
 const ration=1-natural;if((s.stocks[p.food]||0)<ration){const amount=ration-(s.stocks[p.food]||0);s.stocks[p.food]=(s.stocks[p.food]||0)+amount;s.ledger.deliveries+=amount;s.events.push({day:s.day,type:s.supplied?'replenish-ration':'caregiver-backup',species:r.species,food:p.food,amount});}
 s.stocks[p.food]-=ration;s.ledger.eaten+=ration;r.consumed+=1;
 r.activity=resource?p.behaviors[(s.day+Number(r.id.split('-')[1]))%p.behaviors.length]:'supplemental-feeding';
 if(r.species==='pig'&&r.activity==='root'){s.ecology.rootDisturbance+=.1;s.pasture.grass=Math.max(0,s.pasture.grass-.1);}
 if(r.species==='chicken'&&r.activity==='scratch')s.ecology.scratching+=.1;
 s.ecology.manure+=.1;r.effects=r.effects.filter(e=>e.expires>s.day);r.happiness=70+Math.max(0,...r.effects.map(e=>25*(e.expires-s.day)/e.durationDays));}
 // Routine caretaker removes manure from the occupied area; no automatic fertilizer bonus.
 if(s.ecology.manure>5){s.events.push({day:s.day,type:'clean-and-compost',amount:s.ecology.manure});s.ecology.manure=0;}
 if(s.resting.length)s.events.push({day:s.day,type:'rest-forage-and-supplement',resources:[...s.resting]});return s;}
module.exports={profiles,create,request,prepare,admit,step,interact,inspect,requirements};

},
"./spatial-sanctuary.cjs":function(module,exports,require){
'use strict';
// Experimental sanctuary runtime. Quantities are game units, not husbandry advice.
const M=require('./sanctuary.cjs'), A=require('./animals.cjs');
function create(plan,options={}){
 const graph=A.create(plan,{horses:0});
 return {version:1,minute:0,tickMinutes:10,property:plan.world.property,env:require('./sim.cjs').environment(plan.config.seed,plan.config.size,plan.config.topology),speed:options.speed??1,manager:M.create(),nodes:graph.nodes,habitats:{},reserved:{},projects:[],traffic:{},ledger:{natural:0,ration:0,water:0,waterDelivered:0,backupVisits:0},daily:[]};
}
// Connected, disjoint paddocks: boundaries are enforced in routing, not rendered fences.
function allocate(s,species,count,attempt=0){return FarmProperty.allocateHabitat(s,species,count,M.profiles[species].space,attempt);}
function command(s,c){
 if(c.type==='give-joy')return M.interact(s.manager,c.resident,c.action);
 if(c.type==='inspect'){
  const info=M.inspect(s.manager,c.resident),r=s.manager.residents.find(r=>r.id===c.resident);
  return {...info,position:A.position(s,r),habitat:r.habitat};
 }
 if(c.type==='add-animals'){
  const req=M.request(s.manager,c.species,c.count),cells=allocate(s,c.species,c.count,c._placementAttempt||0);
  req.status='waiting-for-preparation';req.missing=cells?['habitat-preparation']:['connected-land'];
  if(cells){const id='habitat-'+req.id;for(const k of cells)s.reserved[k]=id;s.projects.push({id,request:req.id,species:c.species,count:c.count,cells,remaining:Math.max(60,cells.length*2),status:'building'});}
  return req;
 }
 if(c.type==='improve-habitat'){
  const h=s.habitats[c.habitat];if(!h)throw Error('Unknown habitat');
  if(h.level>=3)return {status:'already-improved'};
  if(s.projects.some(p=>p.habitat===h.id&&p.status==='building'))return {status:'already-planned'};
  const p={id:'improve-'+s.projects.length,habitat:h.id,remaining:120,status:'building'};s.projects.push(p);return p;
 }
 throw Error('Unknown sanctuary command');
}
function finish(s,p){
 if(p.habitat){const h=s.habitats[p.habitat];h.level++;for(const k of h.cells)s.nodes[k].resourceCapacity=4*h.level;return;}
 const profile=M.profiles[p.species],h={id:p.id,species:p.species,cells:p.cells,shelter:p.cells[0],water:p.waterAt||p.cells[Math.min(1,p.cells.length-1)],level:1,gate:p.gateInside,buildingId:p.buildingId,fences:p.fences};s.habitats[h.id]=h;
 for(const k of h.cells){s.nodes[k].resources=Object.fromEntries(profile.natural.map(r=>[r,4]));s.nodes[k].resourceCapacity=4;}
 const req=s.manager.requests.find(r=>r.id===p.request),need=M.requirements(s.manager,Array.from({length:p.count},()=>({species:p.species})));
 const before=s.manager.residents.length;
 M.prepare(s.manager,req.id,{space:Math.max(s.manager.capacities.space,need.space),care:Math.max(s.manager.capacities.care,need.care),shelters:need.shelters});
 for(const r of s.manager.residents.slice(before))Object.assign(r,{habitat:h.id,at:h.shelter,edge:null,foodDebt:0,waterDebt:0,travelSeconds:0,naturalEaten:0,rationEaten:0,drank:0});
 s.manager.events.push({day:s.manager.day,type:'habitat-ready',habitat:h.id});
}
function route(s,r,target){
 const h=s.habitats[r.habitat],start=r.edge?r.edge.to:r.at,queue=[start],prev=new Map([[start,null]]);
 for(let i=0;i<queue.length;i++){const k=queue[i];if(target(s.nodes[k],k)){const result=[];for(let q=k;prev.get(q)!==null;q=prev.get(q))result.push(q);return result.reverse();}
  for(const e of s.nodes[k].edges)if(s.reserved[e.to]===h.id&&!prev.has(e.to)){prev.set(e.to,k);queue.push(e.to);}}
 return null;
}
function move(s,r,path){
 let remaining=s.tickMinutes*60;
 r.motion=[{seconds:s.minute*60,position:A.position(s,r)}];
 if(r.edge){const t=Math.min(remaining,r.edge.remaining);r.edge.remaining-=t;remaining-=t;r.travelSeconds+=t;if(r.edge.remaining<1e-9){r.at=r.edge.to;r.edge=null;}}
 r.motion.push({seconds:(s.minute+s.tickMinutes)*60-remaining,position:A.position(s,r)});
 while(!r.edge&&remaining>0&&path.length){const to=path.shift(),edge=s.nodes[r.at].edges.find(e=>e.to===to),total=edge.seconds/s.speed,t=Math.min(total,remaining);remaining-=t;r.travelSeconds+=t;s.traffic[r.at+'>'+to]=(s.traffic[r.at+'>'+to]||0)+1;if(t<total)r.edge={to,total,remaining:total-t};else r.at=to;r.motion.push({seconds:(s.minute+s.tickMinutes)*60-remaining,position:A.position(s,r)});}
 return remaining/(s.tickMinutes*60);
}
function step(s){
 if(!(s.speed>0))throw Error('Speed must be positive');
 // One abstract caretaker work queue. These are timed preparations, not physical builders.
 const project=s.projects.find(p=>p.status==='building');if(project&&!s.externalCare){project.remaining-=s.tickMinutes;if(project.remaining<=0){finish(s,project);project.status='complete';}}
 const fraction=s.tickMinutes/1440;
 for(const n of Object.values(s.nodes))if(n.resources)for(const key of Object.keys(n.resources))n.resources[key]=Math.min(n.resourceCapacity,n.resources[key]+.02*fraction);
 for(const r of s.manager.residents){
  r.motion=[];
  if(r.interaction){r.foodDebt+=fraction;r.waterDebt+=fraction;continue;}
  const h=s.habitats[r.habitat],p=M.profiles[r.species],night=s.minute%1440<360||s.minute%1440>=1200;
  r.foodDebt+=fraction;r.waterDebt+=fraction;
  const naturalLimit=['pig','chicken','turkey','duck','goose','rabbit'].includes(r.species)?.1:.5;
  const eligible=n=>p.natural.find(k=>(n.resources?.[k]||0)>1.05);
  let activity=night?'rest':'explore',target=(n,k)=>k===h.shelter;
  if(r.waterDebt>=.05){activity='drink';target=(n,k)=>k===h.water;}
  else if(s.externalCare&&r.foodDebt>=.08){activity='supplemental-feeding';target=(n,k)=>k===h.shelter;}
  else if(r.foodDebt>=.03){activity='forage';target=n=>Boolean(eligible(n));}
  else if(!night){const index=(Math.floor(s.minute/60)+Number(r.id.split('-')[1])*7)%h.cells.length;target=(n,k)=>k===h.cells[index];}
  let path=route(s,r,target);if(path===null){activity='supplemental-feeding';target=(n,k)=>k===h.shelter;path=route(s,r,target);}
  const available=path===null?0:move(s,r,path);r.activity=activity;
  if(!r.edge&&available>0&&target(s.nodes[r.at],r.at)){
   if(activity==='drink'){const amount=s.externalCare?Math.min(r.waterDebt,h.waterStock||0):r.waterDebt;r.waterDebt-=amount;r.drank+=amount;s.ledger.water+=amount;if(s.externalCare)h.waterStock-=amount;else s.ledger.waterDelivered+=amount;}
   if(s.externalCare&&activity==='supplemental-feeding'){const amount=Math.min(r.foodDebt,h.foodStock||0);h.foodStock-=amount;r.foodDebt-=amount;r.rationEaten+=amount;r.consumed+=amount;s.ledger.ration+=amount;}
   if(activity==='forage'){const n=s.nodes[r.at],key=eligible(n);if(key){const amount=Math.min(r.foodDebt*naturalLimit,n.resources[key]-1,.1*available,s.externalCare?Math.max(0,((s.minute+s.tickMinutes)/1440-(r.arrivedAt||0)/86400)*naturalLimit-r.naturalEaten):Infinity);n.resources[key]-=amount;r.foodDebt-=amount;r.naturalEaten+=amount;r.consumed+=amount;s.ledger.natural+=amount;r.activity=key==='browse'?'browse':r.species==='chicken'?'scratch':r.species==='pig'?'root':'forage';}}
  }
  // Typed complete rations and rescue water delivered to the resident by an abstract caretaker.
  // This explicit fallback keeps slow/blocked animals safe; it does not prove service routes work.
  if(!s.externalCare&&r.foodDebt>=.03){const amount=r.foodDebt;const food=p.food;s.manager.stocks[food]=(s.manager.stocks[food]||0)+amount;s.manager.ledger.deliveries+=amount;s.manager.stocks[food]-=amount;s.manager.ledger.eaten+=amount;s.ledger.ration+=amount;r.rationEaten+=amount;r.consumed+=amount;r.foodDebt=0;s.ledger.backupVisits++;}
  if(!s.externalCare&&r.waterDebt>.25){const amount=r.waterDebt;r.waterDebt=0;r.drank+=amount;s.ledger.water+=amount;s.ledger.waterDelivered+=amount;s.ledger.backupVisits++;}
 }
 s.minute+=s.tickMinutes;s.manager.day=s.minute/1440;
 for(const r of s.manager.residents){r.effects=r.effects.filter(e=>e.expires>s.manager.day);r.happiness=70+Math.max(0,...r.effects.map(e=>25*(e.expires-s.manager.day)/e.durationDays));}
 if(s.minute%1440===0)s.daily.push({day:s.manager.day,residents:s.manager.residents.map(r=>({id:r.id,species:r.species,position:A.position(s,r),activity:r.activity,happiness:r.happiness})),ledger:{...s.ledger}});
 return s;
}
module.exports={create,command,step,finish};


},
"./workers.cjs":function(module,exports,require){
'use strict';
// Physical construction experiment. Work hours/material units are game parameters.
const {environment}=require('./sim.cjs');
const key=(x,z)=>`${x},${z}`;
class Heap {
 constructor(){this.a=[];}
 push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].score<=v.score)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
 pop(){const top=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].score<this.a[c].score)c++;if(this.a[c].score>=last.score)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return top;}
}
const edgeKey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
function create(plan,options={}){
 const cfg={tickSeconds:10,supplyPerDay:60,initialStock:80,speed:1.2,trailGain:.025,trailDecay:.85,...options};
 if(!(cfg.tickSeconds>0&&cfg.tickSeconds<=60&&86400%cfg.tickSeconds===0&&cfg.speed>0&&cfg.supplyPerDay>=0&&cfg.initialStock>=0))throw Error('Invalid worker configuration');
 const env=environment(plan.config.seed,plan.config.size,plan.config.topology),nodes={};
 const clear=(x,z)=>env.dry(x,z)&&env.slope(x,z)<.3&&!plan.buildings.some(b=>FarmProperty.contains(b,x,z,1.2));
 for(let z=10;z<plan.config.size-8;z+=4)for(let x=10;x<plan.config.size-8;x+=4)if(clear(x,z))nodes[key(x,z)]={position:[x,env.height(x,z),z],edges:[]};
 for(const [id,n]of Object.entries(nodes))for(const [dx,dz]of [[4,0],[-4,0],[0,4],[0,-4],[4,4],[4,-4],[-4,4],[-4,-4]]){
  const [x,,z]=n.position,to=key(x+dx,z+dz),other=nodes[to];if(!other)continue;
  // No diagonal corner cutting; sample the whole segment against stream/footprints.
  if(dx&&dz&&(!nodes[key(x+dx,z)]||!nodes[key(x,z+dz)]))continue;
  if(![.25,.5,.75].every(t=>clear(x+dx*t,z+dz*t)))continue;
  const distance=Math.hypot(dx,dz),slope=Math.abs(other.position[1]-n.position[1])/distance;if(slope>.3)continue;
  n.edges.push({to,distance,terrain:1+8*slope});
 }
 const nearest=p=>Object.keys(nodes).reduce((best,k)=>!best||Math.hypot(nodes[k].position[0]-p[0],nodes[k].position[2]-p[1])<Math.hypot(nodes[best].position[0]-p[0],nodes[best].position[2]-p[1])?k:best,null);
 const lane=new Set(plan.paths.flatMap(p=>p.points.map(p=>key(p[0],p[1]))));for(const [id,n]of Object.entries(nodes))for(const edge of n.edges)if(lane.has(id)&&lane.has(edge.to))edge.terrain*=.7;
 const depot=nearest(plan.core),jobs=plan.buildings.map(b=>({id:b.id,name:b.name,footprint:{x:b.cx-b.width/2,z:b.cz-b.depth/2,width:b.width,depth:b.depth,angle:b.angle,polygon:b.polygon},at:nearest(b.door),wood:b.wood,work:b.work*3600,done:0,delivered:0,used:0,reserved:0,status:'planned',completedAt:null}));
 const names=['Abbie','Ani','Mommy','Daddy','Jeff','Alexis','Marley'];
 const workers=names.map((name,i)=>({id:name.toLowerCase(),name,at:depot,edge:null,path:[],task:null,cargo:0,capacity:name==='Marley'?1:8,buildRate:name==='Marley'?0:1,speed:cfg.speed*(.9+(i%3)*.1),activity:'resting',workedSeconds:0,travelSeconds:0,trips:0,restUntil:0}));
 const s={version:1,config:cfg,seed:plan.config.seed,seconds:0,nodes,depot,sources:[{id:'depot',at:depot,stock:cfg.initialStock}],jobs,workers,trails:{},ledger:{initial:cfg.initialStock,delivered:0,used:0},events:[],daily:[],terrain:env.w.terrain,water:env.w.water,property:plan.world.property};
 for(const j of jobs)if(!route(s,depot,j.at))throw Error('Unreachable construction site '+j.id);
 return s;
}
function cost(s,from,e){const wear=s.trails[edgeKey(from,e.to)]?.wear||0;return e.distance*e.terrain*(1-.35*Math.min(1,wear));}
function route(s,start,goal){
 if(start===goal)return [];
 const heap=new Heap(),g={[start]:0},prev={},target=s.nodes[goal];if(!target||!s.nodes[start])return null;
 const heuristic=k=>Math.hypot(s.nodes[k].position[0]-target.position[0],s.nodes[k].position[2]-target.position[2])*.65;
 heap.push({key:start,score:heuristic(start),g:0});
 while(heap.a.length){const cur=heap.pop();if(cur.g!==g[cur.key])continue;if(cur.key===goal){const path=[];for(let k=goal;k!==start;k=prev[k])path.push(k);return path.reverse();}
  for(const e of s.nodes[cur.key].edges){const next=cur.g+cost(s,cur.key,e);if(g[e.to]===undefined||next<g[e.to]){g[e.to]=next;prev[e.to]=cur.key;heap.push({key:e.to,g:next,score:next+heuristic(e.to)});}}
 }return null;
}
function position(s,w){const a=s.nodes[w.at].position;if(!w.edge)return [...a];const b=s.nodes[w.edge.to].position;return a.map((v,i)=>v+(b[i]-v)*w.edge.fraction);}
function travel(s,w,dt){
 let left=dt;
 w.motion=[{seconds:s.seconds,position:position(s,w)}];
 while(left>1e-9&&(w.edge||w.path.length)){
  if(!w.edge){const to=w.path.shift(),e=s.nodes[w.at].edges.find(e=>e.to===to);if(!e)throw Error('Invalid movement');w.edge={to,fraction:0,distance:e.distance,effort:cost(s,w.at,e)};}
  const e=w.edge,speed=w.speed/(1+w.cargo/w.capacity*.35),duration=e.effort/speed,used=Math.min(left,(1-e.fraction)*duration),distance=used/duration*e.distance;
  const id=edgeKey(w.at,e.to),t=s.trails[id]||(s.trails[id]={a:w.at,b:e.to,wear:0,passages:0,distance:0,lastUsed:0});
  t.wear=Math.min(1,t.wear+s.config.trailGain*distance/e.distance);t.distance+=distance;t.lastUsed=s.seconds;t.wear=Math.max(0,t.wear);
  e.fraction+=used/duration;w.travelSeconds+=used;left-=used;
  if(e.fraction>=1-1e-9){w.at=e.to;w.edge=null;t.passages++;}
  w.motion.push({seconds:s.seconds+dt-left,position:position(s,w)});
 }
 return left;
}
function go(s,w,target){const p=route(s,w.at,target);if(p===null)return false;w.path=p;return true;}
function assign(s,w){
 if(w.name!=='Marley')for(const j of s.careJobs||[]){
  const missing=j.target-j.delivered-j.reserved,stock=s.careStock[j.resource]||0;
  if(j.enabled&&missing>.05&&stock>.05&&go(s,w,s.depot)){
   const amount=Math.min(missing,w.capacity,stock);s.careStock[j.resource]-=amount;j.reserved+=amount;
   w.task={kind:'care',job:j.id,resource:j.resource,amount,phase:'collect',handling:20};w.activity='walking-to-care-supplies';return;
  }
 }
 if(w.name!=='Marley')for(const j of s.cleaningJobs||[]){
  const amount=Math.min(w.capacity,j.dirty-j.reserved);
  if(amount>=1&&go(s,w,j.at)){j.reserved+=amount;w.task={kind:'clean',job:j.id,resource:'manure',amount,phase:'collect',handling:60};w.activity='walking-to-clean';return;}
 }
 // Supply first, then build on delivered materials. Reservations prevent duplicate hauling.
 for(const j of s.jobs){if(j.status==='complete'||j.status==='queued')continue;
  const missing=j.wood-j.delivered-j.reserved;
  if(missing>1e-7){const source=s.sources.find(a=>a.stock>1e-7);if(source&&go(s,w,source.at)){const amount=Math.min(missing,w.capacity,source.stock);source.stock-=amount;j.reserved+=amount;w.task={kind:'haul',job:j.id,source:source.id,amount,phase:'collect',handling:20};w.activity='walking-to-materials';return;}}
  const builders=s.workers.filter(a=>a.task?.kind==='build'&&a.task.job===j.id).length;
  if(w.buildRate>0&&j.delivered-j.used>1e-7&&builders<2&&go(s,w,j.at)){w.task={kind:'build',job:j.id};w.activity='walking-to-build';return;}
 }
 const stops=s.jobs.filter(j=>j.status==='complete');const next=stops[(Math.floor(s.seconds/300)+s.workers.indexOf(w))%Math.max(1,stops.length)];
 if(next&&go(s,w,next.at)){w.activity='walking-to-inspect';w.restUntil=s.seconds+300;return;}
 w.activity='waiting-for-work-or-materials';w.restUntil=s.seconds+60;
}
function step(s){
 const dt=s.config.tickSeconds,day=Math.floor(s.seconds/86400),time=s.seconds%86400;
 if(time===0){if(day>0){s.sources[0].stock+=s.config.supplyPerDay;s.ledger.delivered+=s.config.supplyPerDay;for(const t of Object.values(s.trails))t.wear*=s.config.trailDecay;}s.events.push({time:s.seconds,type:'supply',amount:day?s.config.supplyPerDay:0});}
 const shift=time>=8*3600&&time<14*3600;
 for(const w of s.workers){
  w.motion=[];
  if(!shift){
   // Finish an in-flight haul before resting so carried materials are not teleported.
   if(!w.task){const homeId=['abbie','mommy','daddy','marley'].includes(w.id)?'abbie-home':'ani-home',home=s.jobs.find(j=>j.id===homeId&&j.status==='complete')?.at||s.depot;if(w.at!==home&&!w.edge&&!w.path.length)go(s,w,home);if(w.edge||w.path.length){w.activity='walking-home';travel(s,w,dt);}else w.activity='resting';continue;}
   if(w.task.kind==='build'){w.task=null;w.path=[];if(w.edge){w.path=[];travel(s,w,dt);}continue;}
  }
  if(!w.task){if(w.edge||w.path.length){travel(s,w,dt);continue;}if(s.seconds<w.restUntil)continue;assign(s,w);if(!w.task)continue;}
  let remaining=travel(s,w,dt);if(w.edge||w.path.length)continue;
  const task=w.task,j=(task.kind==='clean'?s.cleaningJobs:task.kind==='care'?s.careJobs:s.jobs).find(j=>j.id===task.job);
  if(task.kind==='clean'){
   if(task.phase==='collect'){
    if(w.at!==j.at)throw Error('Cleaning away from habitat');w.activity='cleaning';task.handling-=remaining;
    if(task.handling<=0){w.cargo=task.amount;j.dirty-=task.amount;j.reserved-=task.amount;task.phase='deliver';task.handling=30;if(!go(s,w,s.depot))throw Error('Compost point unreachable');w.activity='carrying-manure';}
   }else{
    if(w.at!==s.depot)throw Error('Composting away from designated point');w.activity='composting';task.handling-=remaining;
    if(task.handling<=0){s.compost=(s.compost||0)+w.cargo;w.cargo=0;w.trips++;s.events.push({time:s.seconds,worker:w.id,type:'cleaning-complete',job:j.id,amount:task.amount});w.task=null;}
   }
   continue;
  }
  if(task.kind==='care'){
   if(task.phase==='collect'){
    if(w.at!==s.depot)throw Error('Care pickup away from depot');w.activity='collecting-'+task.resource;task.handling-=remaining;
    if(task.handling<=0){w.cargo=task.amount;task.phase='deliver';task.handling=30;if(!go(s,w,j.at))throw Error('Unreachable care delivery');w.activity='carrying-'+task.resource;}
   }else{
    if(w.at!==j.at)throw Error('Care delivery away from habitat');w.activity='replenishing-'+task.resource;task.handling-=remaining;
    if(task.handling<=0){j.delivered+=w.cargo;j.reserved-=w.cargo;w.cargo=0;w.trips++;s.events.push({time:s.seconds,worker:w.id,type:'care-delivery',job:j.id,resource:j.resource,amount:task.amount});w.task=null;}
   }
   continue;
  }
  if(task.kind==='haul'){
   if(task.phase==='collect'){
    if(w.at!==s.sources.find(a=>a.id===task.source).at)throw Error('Collection away from source');w.activity='collecting';const used=Math.min(remaining,task.handling);task.handling-=used;remaining-=used;
    if(task.handling<=1e-9){w.cargo=task.amount;task.phase='deliver';task.handling=20;if(!go(s,w,j.at))throw Error('Reserved delivery became unreachable');w.activity='carrying-materials';}
   }else{
    if(w.at!==j.at)throw Error('Delivery away from site');w.activity='unloading';task.handling-=remaining;
    if(task.handling<=0){j.delivered+=w.cargo;j.reserved-=w.cargo;w.cargo=0;w.trips++;s.events.push({time:s.seconds,worker:w.id,type:'delivery',job:j.id,amount:task.amount});w.task=null;}
   }
  }else{
   if(j.status==='complete'){w.task=null;continue;}
   if(w.at!==j.at)throw Error('Construction away from site');w.activity='building';
   const rate=j.wood/j.work,work=Math.min(remaining*w.buildRate,j.work-j.done,(j.delivered-j.used)/rate);
   j.done+=work;j.used+=work*rate;s.ledger.used+=work*rate;w.workedSeconds+=work/w.buildRate;j.status='building';
   if(j.done>=j.work-1e-6){j.done=j.work;j.status='complete';j.completedAt=s.seconds;s.events.push({time:s.seconds,type:'building-complete',job:j.id});}
   if(j.status==='complete'||j.delivered-j.used<1e-7){w.task=null;w.restUntil=s.seconds+30;}
  }
 }
 s.seconds+=dt;
 if(Math.floor(s.seconds/86400)>day)s.daily.push({day:day+1,complete:s.jobs.filter(j=>j.status==='complete').length,used:s.ledger.used,trailSegments:Object.values(s.trails).filter(t=>t.wear>=.15).length});
 return s;
}
function balance(s){const stock=s.sources.reduce((v,a)=>v+a.stock,0),inTransit=s.workers.reduce((v,w)=>v+(w.task?.kind==='haul'?w.task.amount:0),0),onsite=s.jobs.reduce((v,j)=>v+j.delivered-j.used,0);return s.ledger.initial+s.ledger.delivered-stock-inTransit-onsite-s.ledger.used;}
function frame(s){return {version:1,seconds:s.seconds,axes:'Y-up; positions [x,height,z] in metres',workers:s.workers.map(w=>({id:w.id,name:w.name,position:position(s,w),activity:w.activity,task:w.task?{kind:w.task.kind,job:w.task.job,phase:w.task.phase,reservedAmount:w.task.amount}:null,carrying:{material:'wood',amount:w.cargo},destination:w.path.length?s.nodes[w.path.at(-1)].position:w.edge?s.nodes[w.edge.to].position:null})),buildings:s.jobs.filter(j=>j.status!=='queued').map(j=>({id:j.id,footprint:j.footprint,workPosition:s.nodes[j.at].position,progress:j.done/j.work,stage:j.status==='complete'?'complete':j.done/j.work>.7?'roof':j.done/j.work>.25?'frame':j.done>0?'foundation':'planned',materialsOnSite:j.delivered-j.used})),sources:s.sources.map(a=>{const reserved=s.workers.reduce((v,w)=>v+(w.task?.kind==='haul'&&w.task.source===a.id&&w.task.phase==='collect'?w.task.amount:0),0);return {...a,available:a.stock,reserved,stock:a.stock+reserved,position:s.nodes[a.at].position};}),trails:Object.values(s.trails).filter(t=>t.wear>.01).map(t=>({from:s.nodes[t.a].position,to:s.nodes[t.b].position,strength:t.wear,width:.3+t.wear*1.2,passages:t.passages})),materialBalanceError:balance(s)};}
module.exports={create,step,route,position,frame,balance,cost,edgeKey,travel};



},
"./horse-activities.cjs":function(module,exports,require){
'use strict';
const W=require('./workers.cjs');
function request(s,actorId,horseId,kind){
 if(!['ride','horse-play'].includes(kind))throw Error('Unknown horse activity');
 const w=s.workers.workers.find(w=>w.id===actorId),horse=s.animals.manager.residents.find(r=>r.id===horseId&&r.species==='horse');
 if(!w||w.name==='Marley')throw Error('A human rider or play partner is required');
 if(!horse||horse.interaction||horse.edge||w.task||w.cargo||w.edge||w.path.length||(s.horseActivities||[]).some(a=>a.actor===actorId))throw Error('Person or horse is not available');
 const path=W.route(s.workers,w.at,horse.at);if(!path)throw Error('Horse cannot be reached');
 s.horseActivities??=[];const action={actor:actorId,horse:horseId,kind,phase:'approach',elapsed:0,duration:kind==='ride'?1200:900,started:s.seconds,affinity:['abbie','ani'].includes(actorId)?'shared-horse-interest':null};
 w.path=path;horse.interaction=actorId;s.horseActivities.push(action);s.events.push({time:s.seconds,type:'horse-activity-requested',...action});return action;
}
function tick(s){
 const held=new Set(),dt=s.workers.config.tickSeconds;
 for(const a of s.horseActivities||[]){const w=s.workers.workers.find(w=>w.id===a.actor),h=s.animals.manager.residents.find(r=>r.id===a.horse);held.add(w.id);w.motion=[];
  if(a.phase==='approach'){w.activity='walking-to-horse';W.travel(s.workers,w,dt);if(!w.edge&&!w.path.length){a.phase='together';a.togetherAt=s.seconds;s.events.push({time:s.seconds,type:'horse-activity-started',actor:w.id,horse:h.id,kind:a.kind,affinity:a.affinity});
   if(a.kind==='ride'){const habitat=s.animals.habitats[h.habitat],allowed=new Set(habitat.cells),graph={...s.workers,nodes:Object.fromEntries(habitat.cells.filter(k=>s.workers.nodes[k]).map(k=>[k,{...s.workers.nodes[k],edges:s.workers.nodes[k].edges.filter(e=>allowed.has(e.to))}]))};const dest=habitat.cells.at(-1),out=W.route(graph,w.at,dest),back=W.route(graph,dest,w.at);if(out&&back)w.path=[...out,...back];}
  }}else{w.activity=a.kind;h.activity=a.kind;W.travel(s.workers,w,dt);h.at=w.at;h.edge=w.edge?{to:w.edge.to,total:1,remaining:1-w.edge.fraction}:null;a.elapsed+=dt;
   if(a.elapsed>=a.duration&&!w.edge&&!w.path.length){a.complete=true;h.interaction=null;h.effects=h.effects.filter(e=>e.id!=='horse-company');h.effects.push({id:'horse-company',start:s.seconds/86400,expires:s.seconds/86400+1,durationDays:1,effect:'enjoyed company'});h.happiness=95;s.events.push({time:s.seconds,type:'horse-activity-complete',actor:w.id,horse:h.id,kind:a.kind,secondsTogether:a.elapsed,affinity:a.affinity});}
  }
 }
 s.horseActivities=(s.horseActivities||[]).filter(a=>!a.complete);return held;
}
module.exports={request,tick};

},
"./planner.cjs":function(module,exports,require){
'use strict';
function start(s,adoptions){s.planner={actor:'daddy',policy:'readiness-based',nextReview:8*3600,lastDecision:null,busyUntil:0,adoptions:structuredClone(adoptions),decisions:[]};for(const j of s.workers.jobs)j.status='queued';}
function review(s,adopt){const p=s.planner;if(!p||s.seconds<p.nextReview)return;p.nextReview=s.seconds+3600;const hour=s.seconds%86400/3600;if(hour<8||hour>=14)return;const daddy=s.workers.workers.find(w=>w.id==='daddy');if(!daddy||daddy.cargo||daddy.edge||daddy.task?.kind==='care'||daddy.task?.kind==='clean')return;
 if(p.lastDecision!==null&&s.seconds-p.lastDecision<6*3600)return;
 const jobs=s.workers.jobs,active=jobs.filter(j=>j.status!=='queued'&&j.status!=='complete');if(active.length>=3)return;
 let decision;const ready=['water','feed'].every(id=>jobs.find(j=>j.id===id)?.status==='complete');
 if(ready&&p.adoptions.length&&!s.links.some(l=>!l.admittedAt)){
  const next=p.adoptions[0],req=adopt(next);if(s.links.some(l=>l.request===req.id))p.adoptions.shift();decision={kind:'prepare-animal-home',species:next.species,count:next.count,request:req.id,reason:'Water and feed facilities are ready; the previous arrivals are settled. Prepare the next habitat before inviting animals.'};
 }else{const order=['water','feed','abbie-home','ani-home','shelter','garden'],job=order.map(id=>jobs.find(j=>j.id===id&&j.status==='queued')).find(Boolean);if(!job)return;job.status='planned';job.issuedAt=s.seconds;decision={kind:'issue-construction',job:job.id,reason:job.id==='water'?'Establish a reliable water point first.':job.id==='feed'?'Prepare safe feed storage before animals arrive.':'The workforce has room for another project; build the family and farm facilities.'};}
 if(daddy.task?.kind==='build'){daddy.task=null;daddy.path=[];}p.lastDecision=s.seconds;p.busyUntil=s.seconds+600;daddy.activity='planning-the-farm';const event={time:s.seconds,type:'planner-decision',actor:'daddy',...decision};p.decisions.push(event);s.events.push(event);
}
module.exports={start,review};

},
"./ranch.cjs":function(module,exports,require){
'use strict';
// One saved world, with 10-second workers and synchronized 10-minute animal steps.
const W=require('./workers.cjs'),S=require('./spatial-sanctuary.cjs'),M=require('./sanctuary.cjs'),A=require('./animals.cjs'),H=require('./horse-activities.cjs'),P=require('./planner.cjs');
function create(plan,options={}){
 const workers=W.create(plan,options.workers),animals=S.create(plan);
 if(600%workers.config.tickSeconds!==0)throw Error('Worker tick must divide animal tick');
 workers.careJobs=[];workers.careStock={};workers.cleaningJobs=[];workers.compost=0;animals.externalCare=true;
 return {version:1,seconds:0,workers,animals,config:{careSupply:true,maxResidents:40,...options.care},careLedger:{supplied:{},manureProduced:0},links:[],events:[],paused:null};
}
function command(s,c){
 if(c.type==='horse-activity')return H.request(s,c.actor,c.horse,c.activity);
 if(c.type==='resume'){s.paused=null;return;}
 if(c.type==='give-joy'||c.type==='inspect')return S.command(s.animals,c);
 if(c.type!=='add-animals')throw Error('Supported commands: add-animals, inspect, give-joy, resume');
 const a=s.animals,w=s.workers,req=S.command(a,c),p=a.projects.find(p=>p.request===req.id);
 if(!p)return req;
 const pending=s.links.reduce((n,l)=>n+l.count,0);
 if(pending+c.count>s.config.maxResidents){p.status='waiting';req.missing=['care-capacity'];for(const k of p.cells)delete a.reserved[k];return req;}
 // Grow the new paddock from the service edge; every crossing uses its actual gate.
 const member=new Set(p.cells),anchor=c.species==='horse'?a.property.barn.turnout:c.species==='chicken'?a.property.domestic[0]:a.property.barn.service;
 const edgeCandidates=[];
 for(const k of p.cells){const [x,z]=a.nodes[k].p;for(const [dx,dz]of [[4,0],[-4,0],[0,4],[0,-4]]){const outside=`${x+dx},${z+dz}`;if(member.has(outside)||!w.nodes[k]||!w.nodes[outside]||a.reserved[outside])continue;edgeCandidates.push({inside:k,outside,dx,dz,score:Math.hypot(x-anchor[0],z-anchor[1])});}}
 edgeCandidates.sort((x,y)=>x.score-y.score);
 let gate,job,shape;
 const canService=(candidate,trial)=>{
  const seen=new Set([w.depot]),queue=[w.depot];
  const clearEdge=(k,e)=>{const n=w.nodes[k],to=w.nodes[e.to];return to&&(member.has(k)===member.has(e.to)||(k===candidate.inside&&e.to===candidate.outside)||(k===candidate.outside&&e.to===candidate.inside))&&(!trial||[0,.25,.5,.75,1].every(t=>!FarmProperty.contains(trial,n.position[0]+(to.position[0]-n.position[0])*t,n.position[2]+(to.position[2]-n.position[2])*t,1.2)));};
  for(let i=0;i<queue.length;i++)for(const e of w.nodes[queue[i]].edges)if(!seen.has(e.to)&&clearEdge(queue[i],e)){seen.add(e.to);queue.push(e.to);}
  return seen.has(candidate.inside)&&w.jobs.every(j=>seen.has(j.at))&&w.careJobs.every(j=>seen.has(j.at));
 };
 const reuse=c.species==='horse'&&!s.links.some(l=>l.species==='horse');
 for(const candidate of edgeCandidates){
  if(reuse){if(!canService(candidate,null))continue;gate=candidate;job=w.jobs.find(j=>j.id==='shelter');break;}
  const [x,z]=a.nodes[candidate.inside].p,dims={cow:[10,7],goat:[7,5],chicken:[5,4]}[c.species]||[7,5],normal=[candidate.dx/4,candidate.dz/4];
  const center=[x+normal[0]*(dims[1]/2+8),z+normal[1]*(dims[1]/2+8)],angle=Math.atan2(-normal[0],normal[1]);
  const trial={cx:center[0],cz:center[1],width:dims[0],depth:dims[1],angle};const poly=FarmProperty.polygon(trial,2);
  if(!poly.every(q=>a.env.dry(...q)&&Math.abs(q[1]-a.env.waterY(q[0]))>19&&a.env.slope(...q)<.1))continue;
  if(w.jobs.some(j=>{const q=j.footprint;return q&&FarmProperty.intersects(trial,{cx:q.x+q.width/2,cz:q.z+q.depth/2,width:q.width,depth:q.depth,angle:q.angle||0},4);}))continue;
  if(Object.entries(a.reserved).some(([k])=>FarmProperty.contains(trial,...a.nodes[k].p,2)))continue;
  if(w.workers.some(r=>[r.at,r.edge?.to,...r.path].filter(Boolean).some(k=>{const n=w.nodes[k];return n&&FarmProperty.contains(trial,n.position[0],n.position[2],2)})))continue;
  if(!canService(candidate,trial))continue;gate=candidate;shape=trial;break;
 }
 if(!gate){p.status='waiting';req.missing=['accessible-paddock-service-edge'];for(const k of p.cells)delete a.reserved[k];if((c._placementAttempt||0)<16){req.status='replanned';a.projects=a.projects.filter(q=>q!==p);return command(s,{...c,_placementAttempt:(c._placementAttempt||0)+1});}return req;}
 const entrance=gate.inside;
 p.cells=[entrance,...p.cells.filter(k=>k!==entrance)];
 p.gateInside=gate.inside;p.gateOutside=gate.outside;
 p.fences=FarmProperty.boundary(p.cells.map(k=>a.nodes[k].p),a.nodes[entrance].p.map((v,i)=>v+[gate.dx,gate.dz][i]/2));
 if(!job){
  const removed=new Set(Object.keys(w.nodes).filter(k=>FarmProperty.contains(shape,w.nodes[k].position[0],w.nodes[k].position[2],1.2)));
  for(const [id,t]of Object.entries(w.trails))if(removed.has(t.a)||removed.has(t.b))delete w.trails[id];for(const k of removed){delete w.nodes[k];if(a.nodes[k])a.nodes[k].pasture=false;}for(const n of Object.values(a.nodes))n.edges=n.edges.filter(e=>!removed.has(e.to));for(const n of Object.values(w.nodes))n.edges=n.edges.filter(e=>!removed.has(e.to)&&[.25,.5,.75].every(t=>{const q=w.nodes[e.to].position;return !FarmProperty.contains(shape,n.position[0]+(q[0]-n.position[0])*t,n.position[2]+(q[2]-n.position[2])*t,1.2)}));
  job={id:'build-'+p.id,name:M.profiles[c.species].shelter,footprint:{x:shape.cx-shape.width/2,z:shape.cz-shape.depth/2,width:shape.width,depth:shape.depth,angle:shape.angle,polygon:FarmProperty.polygon(shape)},at:gate.outside,wood:20+c.count*5,work:(4+c.count)*3600,done:0,delivered:0,used:0,reserved:0,status:'planned',completedAt:null};w.jobs.push(job);
 }else if(job.status==='queued'){job.status='planned';job.issuedAt=s.seconds;}
 p.buildingId=job.id;
 // Fence edges affect human routing too; no walking through a completed field boundary.
 for(const [k,n]of Object.entries(w.nodes))n.edges=n.edges.filter(e=>member.has(k)===member.has(e.to)||(k===gate.inside&&e.to===gate.outside)||(k===gate.outside&&e.to===gate.inside));
 for(const actor of w.workers){const goal=actor.path.at(-1);if(goal){const path=W.route(w,actor.edge?.to||actor.at,goal);if(path)actor.path=path;else throw Error('New paddock blocks an existing task');}}
 const waterAt=p.cells.find(k=>k!==entrance&&w.nodes[k]&&W.route(w,entrance,k))||entrance;
 if(!W.route(w,w.depot,entrance)||!W.route(w,w.depot,waterAt))throw Error('Paddock gate cannot be serviced');
 p.waterAt=waterAt;
 const link={id:p.id,request:req.id,job:job.id,species:c.species,count:c.count,admittedAt:null};s.links.push(link);
 w.cleaningJobs.push({id:p.id+'-clean',habitat:p.id,at:entrance,dirty:0,reserved:0});
 for(const [kind,resource,at]of [['food',M.profiles[c.species].food,entrance],['water','water',waterAt]])w.careJobs.push({id:p.id+'-'+kind,habitat:p.id,kind,resource,at,enabled:false,target:0,delivered:0,reserved:0,transferred:0});
 req.missing=['built-shelter','stocked-feeder-and-water'];return req;
}
function supplies(s){
 if(!s.config.careSupply)return;
 const targets={};for(const l of s.links)for(const resource of [M.profiles[l.species].food,'water'])targets[resource]=(targets[resource]||0)+l.count*3;
 for(const [resource,target]of Object.entries(targets)){
  // Purchased supplies arrive at the depot, never directly inside a habitat.
  const amount=Math.max(0,target-(s.workers.careStock[resource]||0));s.workers.careStock[resource]=(s.workers.careStock[resource]||0)+amount;s.careLedger.supplied[resource]=(s.careLedger.supplied[resource]||0)+amount;
 }
}
function care(s){
 const w=s.workers,a=s.animals;
 for(const l of s.links){const job=w.jobs.find(j=>j.id===l.job),project=a.projects.find(p=>p.id===l.id),tasks=w.careJobs.filter(j=>j.habitat===l.id);
  const built=job.status==='complete'&&['feed','water'].every(id=>w.jobs.find(j=>j.id===id)?.status==='complete');
  for(const t of tasks){t.enabled=built;if(!built)continue;
   const h=a.habitats[l.id],stock=h?(t.kind==='food'?h.foodStock:h.waterStock):t.delivered;
   if(stock<l.count*2)t.target=Math.max(t.target,t.delivered+l.count*3-stock);
   if(h){const added=t.delivered-t.transferred;if(t.kind==='food')h.foodStock+=added;else h.waterStock+=added;t.transferred=t.delivered;}
  }
  if(!l.admittedAt&&built&&tasks.every(t=>t.delivered>=l.count*2)){
   S.finish(a,project);project.status='complete';const h=a.habitats[l.id];h.foodStock=tasks.find(t=>t.kind==='food').delivered;h.waterStock=tasks.find(t=>t.kind==='water').delivered;
   for(const t of tasks)t.transferred=t.delivered;l.admittedAt=s.seconds;
   for(const r of a.manager.residents.filter(r=>r.habitat===l.id))r.arrivedAt=s.seconds;
   s.events.push({time:s.seconds,type:'animals-arrive',habitat:l.id,count:l.count,shelterCompletedAt:job.completedAt});
  }
 }
 // Interrupt one on-site builder for pending animal care. Finish carried loads first.
 if(w.careJobs.some(j=>j.enabled&&j.target-j.delivered-j.reserved>.05&&(w.careStock[j.resource]||0)>.05)){
  const builder=w.workers.find(r=>r.task?.kind==='build'&&!r.edge&&!r.path.length);
  if(builder){builder.task=null;builder.restUntil=0;}
 }
}
function step(s){
 if(s.paused)return s;
 P.review(s,c=>command(s,{type:'add-animals',...c}));
 if(s.seconds%86400===0)supplies(s);
 if(s.seconds%600===0)care(s);
 if(s.config.horseActivities&&s.seconds%86400===11*3600){const people=s.workers.workers.filter(w=>w.name!=='Marley'),offset=Math.floor(s.seconds/86400)%people.length;for(let i=0;i<people.length;i++){const person=people[(i+offset)%people.length],horse=s.animals.manager.residents.find(r=>r.species==='horse'&&!r.interaction&&!r.edge);try{H.request(s,person.id,horse?.id,Math.floor(s.seconds/86400)%2?'ride':'horse-play');break;}catch{}}}
 const held=H.tick(s),roster=s.workers.workers;if(s.planner&&s.seconds<s.planner.busyUntil){held.add('daddy');const d=roster.find(w=>w.id==='daddy');if(d)d.activity='planning-the-farm';}s.workers.workers=roster.filter(w=>!held.has(w.id));W.step(s.workers);s.workers.workers=roster;s.seconds=s.workers.seconds;
 if(s.seconds%600===0){
  // Animal steps consume only physically delivered habitat stock. No emergency teleporting.
  S.step(s.animals);care(s);
  for(const j of s.workers.cleaningJobs){const count=s.animals.manager.residents.filter(r=>r.habitat===j.habitat&&r.arrivedAt<s.seconds).length,amount=count*.2/144;j.dirty+=amount;s.careLedger.manureProduced+=amount;}
  const trouble=s.animals.manager.residents.find(r=>r.foodDebt>.5||r.waterDebt>.5);
  if(trouble){s.paused={reason:'care-needs-attention',resident:trouble.id,time:s.seconds};s.events.push({type:'gentle-safety-pause',...s.paused});}
 }
 return s;
}
function balances(s){
 const result={wood:W.balance(s.workers)};
 result.manure=s.careLedger.manureProduced-s.workers.compost-s.workers.cleaningJobs.reduce((v,j)=>v+j.dirty,0)-s.workers.workers.reduce((v,w)=>v+(w.task?.kind==='clean'?w.cargo:0),0);
 for(const [resource,supplied]of Object.entries(s.careLedger.supplied)){
  const reserved=s.workers.workers.reduce((v,w)=>v+(w.task?.kind==='care'&&w.task.resource===resource?w.task.amount:0),0);
  const delivered=s.workers.careJobs.filter(j=>j.resource===resource).reduce((v,j)=>v+j.delivered,0);
  result[resource]=supplied-(s.workers.careStock[resource]||0)-reserved-delivered;
 }
 for(const kind of ['food','water']){
  const delivered=s.workers.careJobs.filter(j=>j.kind===kind).reduce((v,j)=>v+j.transferred,0),stock=Object.values(s.animals.habitats).reduce((v,h)=>v+(kind==='food'?h.foodStock:h.waterStock),0);
  result[kind+'-habitat']=delivered-stock-(kind==='food'?s.animals.ledger.ration:s.animals.ledger.water);
 }return result;
}
function frame(s){
 const f=W.frame(s.workers);
 for(const r of f.workers){const actual=s.workers.workers.find(w=>w.id===r.id);if(['care','clean'].includes(actual.task?.kind))r.carrying.material=actual.task.resource;}
 return {...f,paddocks:s.animals.projects.filter(p=>p.cells&&p.fences).map(p=>({id:p.id,species:p.species,buildingId:p.buildingId,stage:s.workers.jobs.find(j=>j.id===p.buildingId)?.status||p.status,fences:p.fences,gate:s.animals.nodes[p.gateInside].p,area:p.cells.length*16})),paused:s.paused,animals:s.animals.manager.residents.map(r=>{const [x,z]=A.position(s.animals,r),n=s.workers.nodes[r.at];return {id:r.id,name:r.name,species:r.species,position:[x,r.edge?(n.position[1]+(s.workers.nodes[r.edge.to].position[1]-n.position[1])*(1-r.edge.remaining/r.edge.total)):n.position[1],z],activity:r.activity,happiness:r.happiness,habitat:r.habitat,arrivedAt:r.arrivedAt};}),habitats:Object.values(s.animals.habitats).map(h=>({id:h.id,foodStock:h.foodStock,waterStock:h.waterStock,shelter:s.workers.nodes[h.shelter].position,water:s.workers.nodes[h.water].position})),careStock:structuredClone(s.workers.careStock),careJobs:structuredClone(s.workers.careJobs),cleaningJobs:structuredClone(s.workers.cleaningJobs),compost:s.workers.compost,balances:balances(s)};
}
module.exports={create,command,step,frame,balances};


},
"./scene-state.cjs":function(module,exports,require){
const R=require('./ranch.cjs'),W=require('./workers.cjs'),{environment}=require('./sim.cjs');
function checkpoint(state,plan){
 // Environment methods are reconstructed from the terrain recipe; all mutable state is retained.
 const {env,...animals}=state.animals;
 return {schema:'ranch-scene-initial-conditions',version:1,planConfig:structuredClone(plan.config),world:structuredClone(plan.world),state:structuredClone({...state,animals})};
}
function restore(input){
 if(input?.schema!=='ranch-scene-initial-conditions'||input.version!==1||!input.state?.workers?.nodes||!input.state?.animals?.nodes||!Number.isFinite(input.state.seconds)||!input.planConfig)throw Error('Choose a supported ranch starting snapshot.');
 const s=structuredClone(input.state),c=input.planConfig;
 if(s.seconds!==s.workers.seconds||s.animals.minute*60!==s.seconds)throw Error('Starting snapshot clocks are inconsistent.');
 s.animals.env=environment(c.seed,c.size,c.topology);
 return s;
}
function describe(s){return {seconds:s.seconds,buildings:s.workers.jobs.filter(j=>j.status==='complete').length,planned:s.workers.jobs.length,residents:s.animals.manager.residents.length,people:s.workers.workers.filter(w=>w.id!=='marley').length,habitats:Object.keys(s.animals.habitats).length,depot:structuredClone(s.workers.careStock),wood:s.workers.sources.reduce((n,x)=>n+x.stock,0)};}
async function simulate(input,options={},progress=()=>{}){
 const s=restore(input),days=Number(options.days??1);
 if(![1,3,7].includes(days))throw Error('Choose one, three or seven days.');
 if(s.paused)throw Error('This starting snapshot needs care before it can run. Build a healthy ranch first.');
 const start=s.seconds,initial=describe(s),eventStart=s.workers.events.length;
 s.config.careSupply=options.deliveries!==false;
 s.workers.config.scheduledSupplyPerDay ??= s.workers.config.supplyPerDay;
 s.workers.config.supplyPerDay=options.deliveries===false?0:s.workers.config.scheduledSupplyPerDay;
 const frame=()=>{const f=R.frame(s);f.neighborhood=s.neighborhood?NeighborhoodMission.inspect(s.neighborhood):null;for(const w of f.workers)w.offsite=!!s.workers.workers.find(a=>a.id===w.id).offsite;for(const a of f.animals)a.motion=s.animals.manager.residents.find(r=>r.id===a.id).motion||[];return f;};
 const frames=[frame()],samples=[],animalSamples=[];
 const record=()=>{samples.push({seconds:s.seconds-start,workers:s.workers.workers.map(w=>({id:w.id,name:w.name,position:W.position(s.workers,w),activity:w.activity,offsite:!!w.offsite,motion:(w.motion||[]).map(p=>({...p,seconds:p.seconds-start}))}))});};
 const recordAnimals=()=>animalSamples.push({seconds:s.seconds-start,animals:frame().animals.map(a=>({...a,motion:(a.motion||[]).map(p=>({...p,seconds:p.seconds-start}))}))});
 record();recordAnimals();
 while(s.seconds<start+days*86400&&!s.paused){
  const roster=s.workers.workers,held=s.neighborhood?NeighborhoodMission.tick(s,W):new Set();
  s.workers.workers=roster.filter(w=>!held.has(w.id));
  try{R.step(s);}finally{s.workers.workers=roster;}
  record();
  if((s.seconds-start)%600===0)recordAnimals();
  if((s.seconds-start)%3600===0){frames.push(frame());progress({type:'progress',message:'Running this ranch: '+((s.seconds-start)/3600)+' / '+days*24+' hours',progress:(s.seconds-start)/(days*86400)});await new Promise(r=>setTimeout(r,0));}
 }
 if(frames.at(-1).seconds!==s.seconds)frames.push(frame());
 const after=describe(s),elapsed=s.seconds-start,events=[...s.workers.events.slice(eventStart),...(s.neighborhood?.events||[]).filter(e=>e.time>=start)];
 return {version:2,neighborhood:s.neighborhood?NeighborhoodMission.inspect(s.neighborhood):null,giftBalances:s.neighborhood?NeighborhoodMission.balance(s.neighborhood):null,seed:input.planConfig.seed,world:structuredClone(input.world),frames,tracks:[],events,duration:s.seconds,startSeconds:start,elapsed,paused:s.paused,initialConditions:checkpoint(s,{config:input.planConfig,world:input.world}),initialSummary:initial,scenario:{days,deliveries:options.deliveries!==false},summary:{animals:after.residents,completed:after.buildings,total:after.planned,care:events.filter(e=>e.type==='care-delivery').length,cleanups:events.filter(e=>e.type==='cleaning-complete').length},activityLoop:{duration:elapsed,startSeconds:start,playbackSeconds:300,samples,animalSamples,paused:s.paused},balances:R.balances(s)};
}
module.exports={checkpoint,restore,describe,simulate};
},
"./browser-entry.cjs":function(module,exports,require){
const P=require('./planner.cjs'),R=require('./ranch.cjs'),W=require('./workers.cjs'),{environment,grow}=require('./sim.cjs');
function capture(s){const f=R.frame(s);f.planner=s.planner?{actor:s.planner.actor,lastDecision:s.planner.decisions.at(-1),pending:s.planner.adoptions.length}:null;for(const a of f.animals)a.motion=s.animals.manager.residents.find(r=>r.id===a.id).motion||[];return f;}
let dayReady;
self.onmessage=async({data})=>{
 if(data.type==='day-rendered'){dayReady?.();return;}
 try{
  if(data.type==='simulate-scene'){const run=await require('./scene-state.cjs').simulate(data.initialConditions,data,postMessage);postMessage({type:'result',run});return;}
  const seed=data.seed>>>0,size=(data.size==='large'?764:540)*(data.sceneOnly?[1,1.25,1.5].includes(Number(data.area))?Number(data.area):1:1),factor=data.size==='large'?2:1;
  if(data.type==='territory'){postMessage({type:'territory',world:environment(seed,size).w,seed});return;}
  postMessage({type:'progress',message:'Finding room for both families…',progress:0});
  const type=data.sceneOnly?data.farmType:'mixed',mix=type==='horses'?[['horse',16]]:type==='smallstock'?[['goat',8],['chicken',8]]:[['horse',6],['cow',2],['goat',2],['chicken',6]];
  const plan=grow({seed,size,topology:data.sceneOnly?data.topology:4,horses:6*factor,mode:'grazing',buildingGap:data.sceneOnly?({compact:4,balanced:8,spread:16}[data.density]??8):8,strategy:data.sceneOnly&&data.density==='spread'?'spread':'yard'},8);if(!plan.valid)throw Error('This territory needs more suitable land. Try a new territory.');
  const s=R.create(plan);s.config.horseActivities=true;P.start(s,mix.map(([species,count])=>({species,count:count*factor})));
  const frames=[capture(s)],tracks=[],events=[],last={},duration=(factor===2?30:20)*86400;
  for(let i=0;i<duration/10&&!s.paused;i++){
   R.step(s);
   for(const w of (data.sceneOnly?[]:s.workers.workers)){const value={id:w.id,position:W.position(s.workers,w),activity:w.activity,cargo:w.cargo,material:w.task?.resource||'wood',job:w.task?.job||null};const stamp=JSON.stringify(value);if(last[w.id]!==stamp){tracks.push({seconds:s.seconds,...value,motion:w.motion||[]});last[w.id]=stamp;}}
   if(s.seconds%(data.sceneOnly?3600:600)===0)frames.push(capture(s));
   if(s.seconds%86400===0){postMessage({type:'progress',message:`Simulating day ${s.seconds/86400} of ${duration/86400}…`,progress:s.seconds/duration});if(data.sceneOnly&&data.dailyPreview){await new Promise(resolve=>{const timeout=setTimeout(resolve,5000);dayReady=()=>{clearTimeout(timeout);resolve()};postMessage({type:'day',run:{seed,world:plan.world,frames:[capture(s)],duration:s.seconds,paused:s.paused,summary:{animals:s.animals.manager.residents.length,completed:s.workers.jobs.filter(j=>j.status==='complete').length,total:s.workers.jobs.length,care:s.workers.events.filter(e=>e.type==='care-delivery').length}}});});dayReady=null;}else await new Promise(r=>setTimeout(r,0));}
  }
  if(frames.at(-1).seconds!==s.seconds)frames.push(capture(s));
  for(const [source,list]of [['workers',s.workers.events],['animals',s.animals.manager.events],['ranch',s.events]])for(const e of list)events.push({source,...e});
  const initialConditions=data.checkpoint?require('./scene-state.cjs').checkpoint(s,plan):null;
  let activityLoop=null;
  if(data.activityLoop&&!s.paused){
   postMessage({type:'progress',message:'Preparing a day of farm life...',progress:1});
   const start=s.workers.seconds,samples=[];const record=()=>({seconds:s.workers.seconds-start,workers:s.workers.workers.map(w=>({id:w.id,position:W.position(s.workers,w),activity:w.activity,motion:(w.motion||[]).map(p=>({...p,seconds:p.seconds-start}))}))});
   samples.push(record());for(let t=0;t<8640;t++){W.step(s.workers);samples.push(record());if(t%360===0)await new Promise(r=>setTimeout(r,0));}
   activityLoop={duration:86400,playbackSeconds:300,samples};
  }
  postMessage({type:'result',run:{initialConditions,activityLoop,version:1,id:crypto.randomUUID(),seed,sizeLabel:factor===2?'Large':'Small',size,objective:{animals:16*factor,description:'Build shelters and sustain '+16*factor+' sanctuary animals'},created:new Date().toISOString(),world:plan.world,frames,tracks,events,duration:s.seconds,paused:s.paused,summary:{animals:s.animals.manager.residents.length,completed:s.workers.jobs.filter(j=>j.status==='complete').length,total:s.workers.jobs.length,care:s.workers.events.filter(e=>e.type==='care-delivery').length,cleanups:s.workers.events.filter(e=>e.type==='cleaning-complete').length},sampling:'Workers and route waypoints at 10 seconds; animal and world snapshots at 10 minutes.'}});
 }catch(e){postMessage({type:'error',message:e.message});}
};





}};const cache={};function require(id){if(!cache[id]){const m=cache[id]={exports:{}};modules[id](m,m.exports,require);}return cache[id].exports;}require('./browser-entry.cjs');})();
