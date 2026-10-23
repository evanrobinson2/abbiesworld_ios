(function(root){
'use strict';
const types={
 welcome:{name:'Welcome lodge',kind:'admin',color:'#dfb76d',icon:'⌂',cost:2,appeal:1},
 care:{name:'Animal care',kind:'admin',color:'#91bcb2',icon:'✚',cost:5,appeal:0},
 cafe:{name:'Café & supplies',kind:'admin',color:'#e3a385',icon:'☕',cost:3,appeal:2},
 savanna:{name:'Savanna',kind:'habitat',color:'#d5c278',icon:'♧',species:'Giraffes',cost:4,appeal:9,noise:0},
 rainforest:{name:'Rainforest',kind:'habitat',color:'#739a78',icon:'♧',species:'Lemurs',cost:5,appeal:10,noise:0},
 wetlands:{name:'Wetlands',kind:'habitat',color:'#8eb8ae',icon:'≈',species:'Flamingos',cost:3,appeal:7,noise:0},
 highlands:{name:'Rocky highlands',kind:'habitat',color:'#a8b4ab',icon:'△',species:'Mountain goats',cost:4,appeal:8,noise:0},
 woodland:{name:'Woodland',kind:'habitat',color:'#a9bb7c',icon:'♧',species:'Red pandas',cost:3,appeal:8,noise:0},
 adventure:{name:'Adventure playground',kind:'play',color:'#ddb094',icon:'⚑',cost:2,appeal:10,noise:16},
 discovery:{name:'Discovery garden',kind:'play',color:'#b8c99b',icon:'✿',cost:2,appeal:6,noise:3}
};
const cells=[[0,0],[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const adjacent=(a,b)=>Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]),Math.abs(a[0]+a[1]-b[0]-b[1]))===1;
function create(){const s={schemaVersion:1,id:'abbie-zoo',revision:0,minute:540,day:1,running:true,speed:1,cash:900,visitors:28,happiness:80,weather:'sunny',selected:1,event:null,eventsSeen:[],nextEventAt:555,tick:0,tiles:['welcome','savanna','rainforest','wetlands','care','cafe','adventure'].map((type,i)=>({id:'hex-'+i,type,shade:1,enrichment:1,quiet:false,staff:1,welfare:85})),log:[],lastBuild:0};log(s,'planner','Park open. Seven tiles connected by a step-free path network.');plan(s);return s;}
function log(s,kind,message){s.log.unshift({id:s.tick+'-'+s.revision+'-'+s.log.length,minute:s.minute,day:s.day,kind,message});s.log=s.log.slice(0,65);}
function plan(s){const edges=[];for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)if(adjacent(cells[i],cells[j])){const center=k=>({x:Math.sqrt(3)*100*(cells[k][0]+cells[k][1]/2),y:150*cells[k][1]});const a=center(i),b=center(j),distance=Math.hypot(b.x-a.x,b.y-a.y),offset=87*Math.cos(Math.PI/6);edges.push({a:i,b:j,width:3,grade:0,from:{x:a.x+(b.x-a.x)*offset/distance,y:a.y+(b.y-a.y)*offset/distance},to:{x:b.x-(b.x-a.x)*offset/distance,y:b.y-(b.y-a.y)*offset/distance}});}
 const habitat=s.tiles.filter(t=>types[t.type].kind==='habitat');const care=s.tiles.filter(t=>t.type==='care').reduce((v,t)=>v+3*t.staff,0)+2;
 const demand=habitat.length*2;const food=s.tiles.filter(t=>t.type==='cafe').length*55+15;const capacity=35+s.tiles.reduce((v,t)=>v+(t.type==='welcome'?35:types[t.type].kind==='play'?18:8),0);
 const warnings=[];if(care<demand)warnings.push({id:'care',tileIds:habitat.map(t=>t.id),message:`Keeper capacity ${care}/${demand}. Add Animal care or increase its staffing.`});if(food<s.visitors)warnings.push({id:'food',tileIds:s.tiles.filter(t=>t.type==='cafe').map(t=>t.id),message:`Food service ${food}/${s.visitors} visitors. Add a café or reduce admissions.`});if(s.visitors>capacity)warnings.push({id:'crowds',tileIds:s.tiles.map(t=>t.id),message:'Paths are crowded. Reduce admissions or add visitor space.'});
 for(const t of habitat){const i=s.tiles.indexOf(t);const noise=s.tiles.reduce((v,n,j)=>v+(adjacent(cells[i],cells[j])?(types[n.type].noise||0):0),0);if(noise>10&&!t.quiet)warnings.push({id:'noise-'+t.id,tileIds:[t.id],message:types[t.type].name+' borders noisy play. Order quiet viewing or swap a neighbor.'});}
 s.planner={connected:7,accessible:7,edges,care,demand,food,capacity,warnings,contract:'Flat step-free toy layout; public routes and exhibit gates remain outside animal areas. Capacity shortages are reported, never silently filled.'};return s.planner;}
function metrics(s){plan(s);const habitats=s.tiles.filter(t=>types[t.type].kind==='habitat');let appeal=0,expense=0;for(const t of s.tiles){const d=types[t.type];appeal+=d.appeal+(d.kind==='habitat'?t.enrichment*2:0);expense+=d.cost+t.staff*1.5+t.shade*.25+t.enrichment*.35;}
 const comfort=habitats.length?habitats.reduce((v,t)=>v+t.welfare,0)/habitats.length:100;
 const satisfaction=clamp(comfort*.65+35-Math.max(0,s.visitors-s.planner.food)*.5-Math.max(0,s.visitors-s.planner.capacity)*.5,10,100);
 const cafeCount=s.tiles.filter(t=>t.type==='cafe').length;
 return {appeal,expense,comfort,satisfaction,income:Math.min(s.visitors,s.planner.capacity)*(.2+cafeCount*.12),capacity:s.planner.capacity};}
function advance(s,steps=1){if(!Number.isInteger(steps)||steps<1||steps>12)throw Error('Advance requires 1–12 steps');for(let k=0;k<steps;k++){if(s.event)break;s.tick++;s.minute+=5;if(s.minute>=1080){s.minute=540;s.day++;s.weather=s.day%2?'sunny':'warm';log(s,'world','A new day. Visitors are arriving again.');}const m=metrics(s);s.visitors=Math.round(clamp(s.visitors+(m.appeal*.8+(s.schoolUntil>s.tick?24:0)-(s.admissionUntil>s.tick?25:0)-s.visitors)*.15,4,160));
 for(const t of s.tiles){if(types[t.type].kind!=='habitat')continue;const i=s.tiles.indexOf(t),noise=s.tiles.reduce((v,n,j)=>v+(adjacent(cells[i],cells[j])?(types[n.type].noise||0):0),0);const heat=s.weather==='hot'?18:s.weather==='warm'?8:3;const target=clamp(64+t.shade*8+t.enrichment*7-Math.max(0,s.planner.demand-s.planner.care)*6-heat-Math.max(0,noise-(t.quiet?18:0)),15,100);t.welfare=clamp(t.welfare+(target-t.welfare)*.22,0,100);}
 const after=metrics(s);s.happiness=Math.round(after.satisfaction);s.cash=Math.round((s.cash+after.income-after.expense)*100)/100;
 if(s.cash<60&&!s.event){s.event={id:'budget-'+s.tick,kind:'budget',title:'A tight operating budget',body:'The zoo is spending more than it earns. Choose a recovery plan.',choices:[{id:'grant',label:'Accept a $200 community grant',effect:'One-time support; keep the current zoo'},{id:'fundraiser',label:'Host a donation afternoon',effect:'+$120 and a temporary visitor boost'}]};}
 else if(s.tick>=s.nextEventAt-540){const kind=['heat','school','enrichment'][s.eventsSeen.length%3],t=s.tiles.find(t=>types[t.type].kind==='habitat');s.event=kind==='heat'?{id:'heat-'+s.tick,kind,title:'The afternoon is warming up',body:(t?types[t.type].species:'The animals')+' need a cooler place to rest.',tileId:t?.id,choices:[{id:'shade',label:'Build shade across exhibits · $90',effect:'+1 shade in every habitat'},{id:'cool',label:'Send the cooling crew · $35',effect:'Cool weather for six simulation steps'}]}:kind==='school'?{id:'school-'+s.tick,kind,title:'A school group wants to visit',body:'Twenty-four excited children are waiting at the gate.',choices:[{id:'welcome',label:'Welcome the group',effect:'+$80; higher visitor demand for eight steps'},{id:'stagger',label:'Stagger their arrival',effect:'+$40; reduced admissions for six steps'}]}:{id:'enrichment-'+s.tick,kind,title:'A curious animal needs a challenge',body:(t?types[t.type].species:'Your animals')+' are ready for a new foraging activity.',tileId:t?.id,choices:[{id:'puzzle',label:'Build a feeding puzzle · $30',effect:'+1 enrichment in the selected habitat'},{id:'keeper',label:'Arrange a keeper session · $15',effect:'Immediate comfort boost'}]};}
 if(s.event){s.running=false;log(s,'choice',s.event.title);}if(s.coolUntil&&s.tick>=s.coolUntil){s.weather='hot';s.coolUntil=0;log(s,'world','The cooling visit ends; shade continues to protect animals.');}s.revision++;}plan(s);return s;}
function spend(s,c){if(s.cash<c)throw Error('Not enough funds. Choose a lower-cost option or the budget recovery event.');s.cash-=c;}
function command(state,action,args={}){const s=copy(state);const tile=()=>{const t=s.tiles.find(t=>t.id===args.tileId);if(!t)throw Error('Unknown exhibit');return t;};
 if(action==='select'){tile();s.selected=s.tiles.findIndex(t=>t.id===args.tileId);}
 else if(action==='play'){if(typeof args.running!=='boolean')throw Error('running must be boolean');if(args.running&&s.event)throw Error('Resolve the pending event first');s.running=args.running;}
 else if(action==='speed'){if(![1,2,4].includes(args.value))throw Error('Unsupported speed');s.speed=args.value;}
 else if(action==='advance'){advance(s,args.steps??1);}
 else if(action==='swap'){const t=tile();if(!types[args.type])throw Error('Unknown tile type');const before=types[t.type].name;Object.assign(t,{type:args.type,shade:1,enrichment:1,quiet:false,staff:1,welfare:85});s.lastBuild++;log(s,'build',`${before} → ${types[t.type].name}. Planner reconnects gates and visitor paths.`);}
 else if(action==='configure'){const t=tile();if(!['shade','enrichment','quiet','staff'].includes(args.key))throw Error('Unsupported setting');if(args.key==='quiet'){if(typeof args.value!=='boolean')throw Error('quiet must be boolean');}else if(!Number.isInteger(args.value)||args.value<0||args.value>3)throw Error('Setting must be 0–3');if(types[t.type].kind!=='habitat'&&args.key!=='staff')throw Error('This setting requires an animal exhibit');const cost=args.key==='quiet'?10:Math.max(0,args.value-t[args.key])*20;spend(s,cost);t[args.key]=args.value;s.lastBuild++;log(s,'build',`${types[t.type].name}: ${args.key} → ${args.value}. Layout rebuilt · $${cost}.`);}
 else if(action==='resolve'){const e=s.event;if(!e||!e.choices.some(c=>c.id===args.choice))throw Error('This choice is unavailable');const t=s.tiles.find(t=>t.id===e.tileId&&types[t.type].kind==='habitat')||s.tiles.find(t=>types[t.type].kind==='habitat');
 if(args.choice==='shade'){spend(s,90);s.weather='hot';s.tiles.filter(t=>types[t.type].kind==='habitat').forEach(t=>t.shade=Math.min(3,t.shade+1));s.lastBuild++;}
 if(args.choice==='cool'){spend(s,35);s.weather='sunny';s.coolUntil=s.tick+6;}
 if(args.choice==='welcome'){s.cash+=80;s.schoolUntil=s.tick+8;}
 if(args.choice==='stagger'){s.cash+=40;s.admissionUntil=s.tick+6;}
 if(args.choice==='puzzle'){if(!t)throw Error('Place an animal exhibit first');spend(s,30);t.enrichment=Math.min(3,t.enrichment+1);s.lastBuild++;}
 if(args.choice==='keeper'){spend(s,15);if(t)t.welfare=Math.min(100,t.welfare+15);}
 if(args.choice==='grant')s.cash+=200;if(args.choice==='fundraiser'){s.cash+=120;s.schoolUntil=s.tick+6;}
 log(s,'decision',e.choices.find(c=>c.id===args.choice).label);s.eventsSeen.push(e.id);s.eventsSeen=s.eventsSeen.slice(-30);s.nextEventAt=540+s.tick+12;s.event=null;s.running=true;
 }else if(action==='scenario'){if(s.event)throw Error('Resolve the current event first');if(!['heat','school'].includes(args.kind))throw Error('Unknown scenario');s.nextEventAt=540+s.tick+1;s.eventsSeen=args.kind==='heat'?[]:['heat'];advance(s,1);}
 else if(action==='replan'){plan(s);s.lastBuild++;log(s,'planner','All seven gates connected. Paths rebuilt; capacity warnings updated.');}
 else throw Error('Unknown action');s.revision++;plan(s);return s;}
function restore(raw){const s=copy(raw);if(s.schemaVersion!==1||s.tiles?.length!==7||s.tiles.some((t,i)=>t.id!=='hex-'+i||!types[t.type]||!Number.isFinite(t.welfare)||!Number.isInteger(t.shade)||t.shade<0||t.shade>3)||!Number.isFinite(s.cash)||!Number.isFinite(s.tick)||!Array.isArray(s.log))throw Error('Invalid zoo save');s.running=false;plan(s);return s;}
const api={types,cells,adjacent,create,plan,metrics,advance,command,restore,copy};if(typeof module!=='undefined')module.exports=api;else root.ZooModel=api;
})(typeof window!=='undefined'?window:globalThis);
