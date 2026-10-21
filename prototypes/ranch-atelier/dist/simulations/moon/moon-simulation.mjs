import {normalizeScienceWorld} from './science-worlds.mjs';
import {moonPorts,withPortTerrain} from './moon-port-layout.mjs';
import {requestDropship,dispatchAvailability,advanceDispatch,flightPhase} from './moon-dispatch.mjs';
import {createProduction,advanceProduction,resupplyProduction} from './moon-production.mjs';
import {lunarTerrain} from './moon-terrain.mjs';
import {initializeColony,advanceColony,rocketPhase} from './moon-colony.mjs';
import {createLifeWorld,createIndividual,experience} from '../simulation/life-story.mjs';
import {createResourceState,advanceResources,reserveDelivery,collectDelivery,finishDelivery,cancelDelivery,resourceBalance} from '../simulation/resource-loop.mjs';
import {stepDelivery} from '../simulation/delivery-workflow.mjs';
import {hexBounds} from '../simulation/spatial-bounds.mjs';
import {safeRoute} from '../ranch-navigation.mjs';

export function planMoon(seed=214,{size=64,complexity=2,terrainVersion=2,planet='moon',auroraConstruction=false,heightAt:terrainHeight}={}){
 planet=normalizeScienceWorld(planet);let n=seed>>>0;const random=()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};
 const radius=Math.max(terrainHeight?24:30,size/2),shift=(random()-.5)*2,source={x:-12+shift,z:7},destination={x:6+shift,z:2.8},lab={x:-4+shift,z:.5};
 const placements=[{id:'habitat',asset:'ME-072',x:6+shift,z:-2,radius:3.5,label:'Habitation dome'},
 {id:'lab',asset:'ME-001',x:-4+shift,z:-3,radius:2.8,label:'Science facility'},
 {id:'depot',asset:'ME-006',x:source.x,z:4.5,radius:1.6,label:'Supply depot'},
 {id:'reactor',asset:'ME-066',x:-11,z:-11,radius:1.5,label:'Nuclear power site'},
 {id:'communications',asset:'ME-005',x:10,z:-11,radius:2,label:'Earth communications'},
 {id:'science',asset:'ME-041',x:-11,z:13,radius:1.2,label:'Geology mission site'},
 {id:'landing',asset:'ME-070',x:13,z:13,radius:4.1,label:'Rocket port'},
 {id:'ice',asset:'ME-029',x:-18,z:-5,radius:2,label:'Ice processing equipment'},
 {id:'excavator',asset:'ME-032',x:-18,z:-10,radius:2,label:'Ice excavation equipment'},
 {id:'radiator',asset:'ME-004',x:-9,z:-8,radius:1.5,label:'Heat rejection radiator'},
 {id:'power',asset:'ME-021',x:-7,z:-10,radius:1.3,label:'Power buffer'},
 {id:'samples',asset:'ME-048',x:-7,z:-3,radius:1,label:'Sample archive'},
 {id:'survey',asset:'ME-044',x:3,z:-12,radius:1.3,label:'Particle observatory'}];
 for(let i=0;i<complexity*2;i++)placements.push({id:'cargo-'+i,asset:'ME-006',x:9+(i%3)*2.4,z:6-Math.floor(i/3)*2.2,radius:1,label:'Port cargo pallet'});
 const field={x:-11,z:10.8},corridor={x:0,z:7},home={x:6+shift,z:4.4};
 const paths=[source,destination,lab,field,home].map(p=>[corridor,p]);
 const distanceToPath=p=>Math.min(...paths.map(([a,b])=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}));
 const craters=[];for(let i=0;i<250&&craters.length<15+complexity*4;i++){const p={x:(random()-.5)*radius*1.7,z:(random()-.5)*radius*1.9,radius:1+random()*3.8,depth:.5+random()*1.8};if(hexBounds(radius)(p,p.radius+1)&&distanceToPath(p)>p.radius+2&&placements.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>o.radius+p.radius+1)&&craters.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>o.radius+p.radius*.6))craters.push(p);}
 const legacyHeight=(x,z)=>{let h=1.7+1.2*Math.sin(x*.13+seed)*Math.cos(z*.11)+.6*Math.sin(x*.39+z*.18)+.25*Math.cos(z*.7-x*.25);for(const c of craters){const d=Math.hypot(x-c.x,z-c.z)/c.radius;h-=c.depth*Math.exp(-d*d*3);h+=c.depth*.5*Math.exp(-(((d-1.05)/.18)**2));}let flat=0;for(const o of placements)flat=Math.max(flat,Math.max(0,Math.min(1,(o.radius+2-Math.hypot(x-o.x,z-o.z))/2)));flat=Math.max(flat,Math.max(0,1-distanceToPath({x,z})/2.5));return h*(1-flat)+1.7*flat;};
 const heightAt=terrainHeight||withPortTerrain(terrainVersion===1?legacyHeight:lunarTerrain(seed,{planet}),size,auroraConstruction);
 placements.push({id:'greenhouse',asset:'ME-072',x:-3,z:15,radius:3.5,label:'Hydroponic greenhouse'},{id:'family-a',asset:'ME-082',x:-3,z:-18,radius:3.2,label:'Selene family quarters'},{id:'family-b',asset:'ME-082',x:9,z:-18,radius:3.2,label:'Kepler family quarters'},{id:'workshop',asset:'ME-058',x:17,z:-7,radius:1.8,label:'Rover maintenance workshop'},{id:'telescope',asset:'ME-061',x:17,z:-13,radius:1,label:'Optical observatory'},{id:'oxygen',asset:'ME-028',x:-16,z:1,radius:1.5,label:'Oxygen research furnace'},{id:'junction',asset:'ME-022',x:0,z:-10,radius:.7,label:'Colony power junction'});
 const ports=moonPorts(size,auroraConstruction);placements.splice(placements.findIndex(p=>p.id==='landing'),1,...ports);
 return {planet,auroraConstruction,terrainVersion,seed,radius,placements,craters,source,destination,lab,field,home,corridor,paths,heightAt,size,complexity};
}
export function createMoonSimulation(seed=214,saved,options={}){
 const plan=planMoon(seed,saved?{terrainVersion:1,...saved.options,...options}:options),bounds=hexBounds(plan.radius),obstacles=plan.placements.map(p=>({...p}));
 const state=createResourceState({supplies:{initialStock:24,initialAtSite:10,stockCapacity:24,replenishRate:0,refillBelow:8,carryCapacity:6,priority:1}},[{id:'habitat',capacity:16}],{});
 state.science={collected:0,atLab:0,returned:0,missions:0};state.rocket={visits:0,lastReturn:0,lastSupply:0,rotations:0,lastCrew:null};
 let worker={id:'moon-courier-1',name:'Ari',phase:'idle',timer:0,position:{...plan.home},path:[],index:0,job:null,distance:0};
 if(saved){Object.assign(state,structuredClone(saved.state));worker=structuredClone(saved.worker);worker.job=worker.job?.kind==='science'?worker.job:worker.job?state.activeJobs[worker.job.id]:null;state.science??={collected:0,atLab:0,returned:0,missions:0};state.rocket??={visits:Math.floor(state.seconds/180),lastReturn:0,lastSupply:0,rotations:0,lastCrew:null};state.resources.supplies.replenishRate=0;}
 state.lifeStories??=createLifeWorld('moon-'+seed);state.machines??=[{id:'rover-1',name:'Mica',type:'rover',position:{x:0,z:7},phase:'idle',path:[],index:0,timer:0,distance:0,surveys:0},{id:'drone-1',name:'Kite',type:'survey drone',position:{x:2,z:8},phase:'idle',path:[],index:0,timer:0,distance:0,surveys:0}];
 for(const m of state.machines){if(!state.lifeStories.entities[m.id])createIndividual(state.lifeStories,{id:m.id,type:m.type,label:m.name,born:state.seconds,origin:{kind:'construction',sources:[]},capabilities:['survey','service']});}
 initializeColony(state,plan);state.production??=createProduction();
 const hooks={reserve:w=>reserveDelivery(state,w.id)||{id:'mission-'+(state.science.missions+1),kind:'science',load:0,phase:'reserved'},source:j=>j.kind==='science'?plan.field:plan.source,destination:j=>j.kind==='science'?plan.lab:plan.destination,home:()=>plan.home,
  route(w,target,phase){const path=safeRoute(w.position,[plan.corridor,target],.35,obstacles,bounds);if(!path)return false;w.path=path;w.index=0;w.phase=phase;w.destination={...target};return true;},
  move(w,dt){let budget=dt*1.3,moved=0;while(budget>0&&w.index<w.path.length){const t=w.path[w.index],dx=t.x-w.position.x,dz=t.z-w.position.z,d=Math.hypot(dx,dz),step=Math.min(d,budget);if(d>0){w.position.x+=dx/d*step;w.position.z+=dz/d*step;w.heading=Math.atan2(dx,dz);}moved+=step;budget-=step;if(d<=step+1e-8)w.index++;else break;}w.distance+=moved;return {moved,arrived:w.index>=w.path.length};},
  collect:j=>{if(j.kind==='science'){j.load=1;j.phase='carrying';state.science.collected++;}else collectDelivery(state,j);},deliver:j=>{if(j.kind==='science'){state.science.atLab+=j.load;state.science.missions++;j.load=0;}else finishDelivery(state,j);},cancel:j=>{if(j?.kind==='science'){state.science.atLab+=j.load;j.load=0;}else cancelDelivery(state,j);},collectSeconds:5,deliverSeconds:4,restSeconds:4};
 return {plan,state,requestDropship:()=>requestDropship(state),dispatchAvailability:()=>dispatchAvailability(state),get worker(){return worker;},update(dt){if(!Number.isFinite(dt)||dt<0||dt>60)throw new RangeError("Moon dt must be 0–60 seconds");advanceResources(state,dt);advanceProduction(state.production,dt,state.colony.residents.length+1);const month=Math.floor(state.seconds/180);if(month>state.rocket.visits){state.rocket.visits=month;const q=Math.max(0,24-state.stock.supplies);state.stock.supplies+=q;state.replenished.supplies+=q;state.rocket.lastSupply=q;state.rocket.lastReturn=state.science.atLab;state.science.returned+=state.science.atLab;state.science.atLab=0;state.rocket.pendingCrew=true;resupplyProduction(state.production);}advanceDispatch(state);advanceColony(state,plan,dt);state.rocket.flight=flightPhase(state.seconds,state.rocket);const habitat=state.sites[0],used=Math.min(habitat.supplies,dt*.04);habitat.supplies-=used;state.used.supplies+=used;stepDelivery(worker,dt,hooks);for(const m of state.machines){if(m.phase==='idle'){const target=m.surveys%2?plan.home:plan.field;hooks.route(m,target,'survey-route');}else if(m.phase==='survey-route'){if(hooks.move(m,dt*.65).arrived){m.phase='scanning';m.timer=8;}}else{m.timer-=dt;if(m.timer<=0){m.surveys++;experience(state.lifeStories,m.id,'survey',state.seconds,{count:m.surveys});m.phase='idle';}}}if(state.rocket.pendingCrew&&!worker.job&&Math.min(Math.hypot(worker.position.x-plan.destination.x,worker.position.z-plan.destination.z),Math.hypot(worker.position.x-plan.lab.x,worker.position.z-plan.lab.z))<.5){const outgoing=worker.name;state.rocket.rotations++;worker.name=['Ari','Jun','Sam','Noor'][state.rocket.rotations%4];worker.id='moon-researcher-'+state.rocket.rotations;state.rocket.lastCrew={outgoing,incoming:worker.name};state.rocket.pendingCrew=false;}},snapshot:()=>structuredClone({version:1,seed,options:{planet:plan.planet,size:plan.size,complexity:plan.complexity,terrainVersion:plan.terrainVersion,auroraConstruction:plan.auroraConstruction},state,worker}),balance:()=>resourceBalance(state,'supplies'),dispose(){hooks.cancel(worker.job);worker.job=null;}};
}
