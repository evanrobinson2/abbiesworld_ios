// Metres, Y-up. Reactor-centered single deck; stock furnishings retain their authored scale.
export function planStarship(seed=214){
 const flip=seed%2?-1:1,stretch=(seed%3)*.5,spacing=12+stretch,wing=23+stretch,end=spacing*2+11;
 const rooms=[],placements=[],berths=[],nodes=[],edges=[];
 const addNode=(id,x,z)=>{nodes.push({id,x,z});return id;},link=(a,b)=>edges.push([a,b]);
 const add=(id,name,side,row,kind)=>{const z=row*spacing,r={id,name,side,x:side*wing,z,w:12,d:10.5,kind,door:{x:side*(wing-6),z}};rooms.push(r);return r;};
 for(let i=0;i<4;i++)add('cabin-'+i,'Quarters '+String.fromCharCode(65+i),i%2?1:-1,Math.floor(i/2)-2,'quarters');
 for(const [id,name,side,row,kind] of [['mess','Galley & mess',-flip,0,'living'],['recreation','Crew commons',flip,0,'living'],['medical','Infirmary',-flip,1,'medical'],['hygiene','Wash & sanitation',flip,1,'hygiene'],['workshop','Fabrication shop',-flip,2,'work'],['life-support','Life support',flip,2,'work']])add(id,name,side,row,kind);
 rooms.push({id:'bridge',name:'Flight deck',x:0,z:-end,w:24,d:9,side:0,kind:'bridge',door:{x:0,z:-end+4.5}},{id:'engineering',name:'Engineering & cargo',x:0,z:end,w:24,d:9,side:0,kind:'engineering',door:{x:0,z:end-4.5}});
 // The navigation graph follows the reactor promenade and side galleries. No path crosses the core.
 for(let i=0;i<8;i++){const a=i*Math.PI/4;addNode('ring-'+i,Math.cos(a)*16,Math.sin(a)*16);if(i)link('ring-'+(i-1),'ring-'+i);}link('ring-7','ring-0');
 for(const side of [-1,1]){for(let row=-2;row<=2;row++){addNode('gallery-'+side+'-'+row,side*15.5,row*spacing);if(row>-2)link('gallery-'+side+'-'+(row-1),'gallery-'+side+'-'+row);}link('gallery-'+side+'-0',side<0?'ring-4':'ring-0');link('gallery-'+side+'--1',side<0?'ring-5':'ring-7');link('gallery-'+side+'-1',side<0?'ring-3':'ring-1');}
 for(const r of rooms){addNode(r.id,r.x,r.z);if(r.side)link(r.id,'gallery-'+r.side+'-'+Math.round(r.z/spacing));else{const node=r.id+'-approach';addNode(node,0,r.z+(r.id==='bridge'?1:-1)*6);link(r.id,node);link(node,r.id==='bridge'?'ring-6':'ring-2');for(const side of [-1,1]){const corner=node+'-'+side;addNode(corner,side*15.5,nodes.find(n=>n.id===node).z);link(corner,node);link(corner,'gallery-'+side+'-'+(r.id==='bridge'?-2:2));}}}
 function asset(room,id,dx,dz,turn=0,label){const p={id:room.id+'-'+placements.length,asset:id,x:room.x+dx,z:room.z+dz,turn,room:room.id,label:label||id};placements.push(p);return p;}
 for(const room of rooms){
  if(room.kind==='quarters')for(let j=0;j<5;j++){const p=asset(room,'RI-003',(j-2)*1.65,-2.65,0,'Personal sleeping berth '+(berths.length+1));berths.push({id:p.id,room:room.id,x:p.x,z:room.z-.8});asset(room,'MI-075',(j-2)*1.65,3.5,Math.PI,'Personal clothing locker');}
  if(room.id==='mess'){asset(room,'RI-006',-2,-2.4,0,'Restrained galley');for(const dx of [-2,1.5])asset(room,'MI-024',dx,2.2,0,'Crew dining table');asset(room,'MI-065',3,-2.4,0,'Drinking water station');}
  if(room.id==='recreation'){asset(room,'SI-004',-3,-2.4,0,'Resistance exercise');asset(room,'MI-077',0,2.2,0,'Strategy board');asset(room,'MI-076',3,-2.4,0,'Crew lending library');}
  if(room.id==='medical'){asset(room,'SI-009',-2,-2.3,0,'Medical restraint and monitor');asset(room,'MI-009',3,-2.6,0,'Medical stores');}
  if(room.id==='hygiene')for(const dx of [-3,0,3]){asset(room,'MI-012',dx,-2.5,0,'Sanitation station');asset(room,'MI-033',dx,2.4,Math.PI,'Recovery shower');}
  if(room.id==='workshop'){asset(room,'SI-001',-2,-2.2,0,'Work bench');asset(room,'MI-017',2,2.4,Math.PI,'Replacement-part printer');asset(room,'SI-006',3,-2.5,0,'Tool board');}
  if(room.id==='life-support'){asset(room,'RI-005',-2,-2.3,0,'Life-support service frame');asset(room,'MI-004',2,2.3,Math.PI,'Water recovery unit');asset(room,'MI-003',3,-2.5,0,'Air scrubber');}
  if(room.id==='bridge')for(const dx of [-7,3,7]){asset(room,'RI-001',dx,-1.8,0,'Flight console');asset(room,'RI-002',dx,1.5,0,'Flight seat');}
  if(room.id==='engineering'){for(const dx of [-8,-4,4,8])asset(room,'RI-004',dx,2.2,Math.PI,'Secured cargo rack');for(const dx of [-7,7])asset(room,'RI-028',dx,-2.1,0,'Battery cassette');}
 }
 for(const side of [-1,1])for(let row=0;row<2;row++)for(let col=0;col<3;col++)placements.push({id:`radiator-${side}-${row}-${col}`,asset:'RE-005',x:side*8+(col-1)*2.7,z:23+(row-.5)*2.2,turn:0,room:'engineering',zone:'Reactor service court',label:'Stock radiator wing · visual equipment'});
 for(const side of [-1,1])for(let i=0;i<3;i++)placements.push({id:`reactor-service-${side}-${i}`,asset:i===1?'ME-066':'RI-005',x:side*8+(i-1)*2.6,z:-23,turn:0,room:'life-support',zone:'Reactor service court',label:i===1?'Stock power concept · visual equipment':'Stock service frame'});
 return {version:2,seed,rooms,placements,berths,nodes,edges,spacing,wing,end,reactor:{radius:12.6,height:17.64},length:end*2+20,width:(wing+13)*2,crew:20};
}
function graphRoute(plan,start,end){const costs=new Map([[start,0]]),previous=new Map(),open=new Set(plan.nodes.map(n=>n.id));while(open.size){let id=null;for(const k of open)if(id===null||(costs.get(k)??Infinity)<(costs.get(id)??Infinity))id=k;if(id===end)break;open.delete(id);const a=plan.nodes.find(n=>n.id===id);for(const edge of plan.edges){if(!edge.includes(id))continue;const next=edge[0]===id?edge[1]:edge[0],b=plan.nodes.find(n=>n.id===next),cost=(costs.get(id)??Infinity)+Math.hypot(a.x-b.x,a.z-b.z);if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);previous.set(next,id);}}}const ids=[end];while(ids[0]!==start){const p=previous.get(ids[0]);if(!p)throw Error('Disconnected ship compartment');ids.unshift(p);}return ids.map(id=>plan.nodes.find(n=>n.id===id));}
export function routeInside(plan,from,fromRoom,to,toRoom){
 const a=plan.rooms.find(r=>r.id===fromRoom),b=plan.rooms.find(r=>r.id===toRoom);
 const path=a.id===b.id?[{x:from.x,z:a.z},{x:to.x,z:a.z},to]:[{x:from.x,z:a.z},...graphRoute(plan,a.id,b.id),{x:to.x,z:b.z},to];
 return path.filter((p,i)=>!i||Math.hypot(p.x-path[i-1].x,p.z-path[i-1].z)>.001).map(p=>({x:p.x,z:p.z}));
}
export function walkable(plan,p,margin=.25){
 if(Math.hypot(p.x,p.z)<plan.reactor.radius+margin)return false;
 if(plan.rooms.some(r=>Math.abs(p.x-r.x)<=r.w/2-margin&&Math.abs(p.z-r.z)<=r.d/2-margin))return true;
 return plan.edges.some(([a,b])=>{a=plan.nodes.find(n=>n.id===a);b=plan.nodes.find(n=>n.id===b);const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz)<=1.75-margin;});
}
