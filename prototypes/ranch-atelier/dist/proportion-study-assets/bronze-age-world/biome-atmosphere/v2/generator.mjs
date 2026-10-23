import {makePrefabConnection,resolvePlacements,compileTravelRoutes} from './connections.mjs';
import {rng} from '../generator.mjs';
export function distanceToSegment(p,a,b){const x=b.x-a.x,z=b.z-a.z,d=x*x+z*z,t=d?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/d)):0;return Math.hypot(p.x-a.x-x*t,p.z-a.z-z*t);}
export function composeV2(catalog,{seed=43,abundance='balanced'}={}){
 if(!Number.isSafeInteger(seed)||!['quiet','balanced','lush'].includes(abundance))throw Error('Invalid composition');
 const random=rng('v2'+seed),placements=[],routes=[],rejections=[];
 const add=(id,assetId,x,z,scale,group,yaw=0)=>{const a=catalog.assets[assetId];const p={id,assetId,position:{x,y:0,z},scale,radius:a.radius*scale,yaw,group};
  if(placements.some(q=>Math.hypot(x-q.position.x,z-q.position.z)<p.radius+q.radius+.4)||routes.some(r=>distanceToSegment(p.position,r.a,r.b)<p.radius+r.width/2+.5)){rejections.push(id);return null;}placements.push(p);return p;};
 const route=(id,a,b,width=2.8,owner=null)=>routes.push({id,a,b,width,owner,verified:false});
 route('home-lane',{x:0,z:-120},{x:0,z:0},3.2);route('garden-lane',{x:0,z:0},{x:0,z:120},3.2);
 const house=add('home','GF-191',-13,-10,2.5,'household');
 if(!house)throw Error('House placement failed');
 const entry=catalog.assets[house.assetId].anchors.find(a=>a.id==='entry').position;
 house.yaw=Math.atan2(-house.position.x,-house.position.z)-Math.atan2(entry.x,entry.z);
 house.entrance={x:house.position.x+house.scale*(entry.x*Math.cos(house.yaw)+entry.z*Math.sin(house.yaw)),z:house.position.z+house.scale*(-entry.x*Math.sin(house.yaw)+entry.z*Math.cos(house.yaw)),y:entry.y*house.scale};
 const n=Math.hypot(house.entrance.x-house.position.x,house.entrance.z-house.position.z);house.approach={x:house.position.x+(house.entrance.x-house.position.x)/n*(house.radius+2),z:house.position.z+(house.entrance.z-house.position.z)/n*(house.radius+2)};
 route('home-threshold',house.entrance,house.approach,2.8,house.id);route('home-access',house.approach,{x:0,z:house.approach.z},2.8,house.id);
 const granary=add('granary','GF-410',12,-14,2.6,'storage',-.3);
 const standAnchor=catalog.assets[granary.assetId].anchors.find(a=>a.id==='worker_stand');
 if(!standAnchor)throw Error('Granary worker anchor required');
 const sx=standAnchor.position.x*Math.cos(granary.yaw)+standAnchor.position.z*Math.sin(granary.yaw),sz=-standAnchor.position.x*Math.sin(granary.yaw)+standAnchor.position.z*Math.cos(granary.yaw),sl=Math.hypot(sx,sz);
 if(!Number.isFinite(sl)||sl<1e-6)throw Error('Granary worker anchor needs a horizontal approach direction');
 granary.entrance={x:granary.position.x+sx*granary.scale,y:standAnchor.position.y*granary.scale,z:granary.position.z+sz*granary.scale};
 granary.approach={x:granary.position.x+sx/sl*(granary.radius+2),z:granary.position.z+sz/sl*(granary.radius+2)};
 const storage={...granary.approach,role:'exterior receiving approach',sourceAnchor:{assetId:granary.assetId,id:'worker_stand',worldPosition:{...granary.entrance}},clearanceOffset:true};
 route('store-access',{x:0,z:storage.z},storage,2.8);
 add('well','GF-011',-5,2,2,'commons');
 add('shelter','GF-017',-15,11,2.5,'workyard',.4);route('work-access',{x:0,z:6},{x:-11,z:6},2.8);
 add('sorting','GF-030',-12,18,2.5,'workyard');add('crate','GF-025',-7,12,2.4,'workyard');add('jar','GF-014',-21,4,2,'household');add('cat','GF-171',-6,19,2.8,'household',1.1);
 const plots=[{id:'onions',label:'Onion garden',assetId:'GF-004',x:9,z:5,w:8,d:7,yield:8},{id:'beans',label:'Bean garden',assetId:'GF-033',x:18,z:12,w:7,d:8,yield:8},{id:'flax',label:'Flax garden',assetId:'GF-031',x:7,z:18,w:8,d:7,yield:8}];
 for(const f of plots){f.access={x:0,z:f.z};f.stand={x:f.x-f.w/2-1.8,z:f.z};route(f.id+'-access',f.access,f.stand,2.6);f.cropInstances=f.id==='flax'?4:2;f.cropScale=f.id==='onions'?5.4:6.4;for(let i=0;i<f.cropInstances;i++)add(f.id+'-'+i,f.assetId,f.x+(i%2?1.9:-1.9),f.z+(f.cropInstances===2?(i?1.8:-1.8):(i<2?-1.9:1.9)),f.cropScale,f.id,random()*.3);}
 const trees=[[-23,-1],[-21,17],[-12,25],[-2,-22],[8,-24],[21,-8],[23,2],[19,21],[1,27],[-25,8]];
 for(const [i,[x,z]]of trees.entries()){if(abundance==='quiet'&&i%2)continue;add('tree-'+i,['GF-153','GF-152','GF-154'][i%3],x+(random()-.5),z+(random()-.5),3.2+random()*.5,'orchard',random()*6.28);}
 for(let i=0;i<(abundance==='lush'?16:abundance==='quiet'?4:9);i++){const a=random()*Math.PI*2,r=20+random()*7;add('flower-'+i,'GF-567',Math.cos(a)*r,Math.sin(a)*r,1.5+random()*.6,'verge',a);}
 const connection=makePrefabConnection(placements,plots),travelRoutes=compileTravelRoutes(plots,storage,connection.joins[0]);
 return{schemaVersion:2,generator:'meadowlands-v2',biome:'garden-farm',seed,abundance,connection,travelRoutes,simulationConfig:{walkingMetresPerSecond:3.8,harvestSeconds:2.4,regrowSeconds:22},environment:'earth',placements:resolvePlacements(connection),routes,fields:plots,plots,rejections,worker:{assetId:'GF-008',scale:2.1,start:{x:storage.x,z:storage.z}},storage,presentationPalette:{HomeReed:'#b68b45',HomePlaster:'#e6d6ac',HomeWood:'#74513c',Reed:'#c1a15e'},decorativeGeometry:{orchardCanopies:'five overlapping stylized crowns per orchard tree; within reserved footprint'},uniqueBaseIncrement:0,terrain:{relief:'continuous-landscape-v2',hexBoundaries:false},limitations:['Standalone illustrative harvest loop; no PC economy or Board integration','Scaled source anchors; conservative route clearance, not full navigation mesh','Source bases retained; yields are prototype balance values']};
}
export function createSimulation(plan){return{time:0,stock:0,deliveries:0,queue:[],plots:Object.fromEntries(plan.plots.map(p=>[p.id,{ready:true,regrow:0,queued:false}])),worker:{...plan.worker.start,phase:'idle',carrying:0,target:null,waypoints:[],work:0}};}
export function queueHarvest(state,id){const p=state.plots[id];if(!p||!p.ready||p.queued)return false;p.queued=true;state.queue.push(id);return true;}
export function stepSimulation(state,plan,dt){if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Bounded simulation step required');state.time+=dt;
 for(const p of Object.values(state.plots))if(!p.ready&&p.regrow>0){p.regrow=Math.max(0,p.regrow-dt);if(!p.regrow)p.ready=true;}
 const w=state.worker;
 if(w.phase==='idle'&&state.queue.length){w.target=state.queue.shift();const p=plan.plots.find(p=>p.id===w.target);w.waypoints=plan.travelRoutes[p.id].slice(1).map(p=>({...p}));w.phase='outbound';}
 if(w.phase==='outbound'||w.phase==='returning'){const target=w.waypoints[0];if(target){const dx=target.x-w.x,dz=target.z-w.z,d=Math.hypot(dx,dz),travel=Math.min(d,plan.simulationConfig.walkingMetresPerSecond*dt);if(d){w.x+=dx/d*travel;w.z+=dz/d*travel;}if(d<=travel+1e-9)w.waypoints.shift();}
  if(!w.waypoints.length){if(w.phase==='outbound'){w.phase='harvesting';w.work=0;}else{state.stock+=w.carrying;state.deliveries++;w.carrying=0;w.phase='idle';w.target=null;}}
 }else if(w.phase==='harvesting'){w.work+=dt;if(w.work>=plan.simulationConfig.harvestSeconds){const plot=plan.plots.find(p=>p.id===w.target),p=state.plots[w.target];p.ready=false;p.regrow=plan.simulationConfig.regrowSeconds;p.queued=false;w.carrying=plot.yield;w.waypoints=plan.travelRoutes[plot.id].slice(0,-1).reverse().map(p=>({...p}));w.phase='returning';}}
 return state;
}
