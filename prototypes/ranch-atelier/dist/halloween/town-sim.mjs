export const HOUSE_COUNT=6,HOUSE_RADIUS=17,WALK_RADIUS=11.6;
export function rng(seed){let n=Number(seed)>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function polar(angle,r){return [Math.sin(angle)*r,Math.cos(angle)*r];}
export function housePoint(h,r,lateral=0){const [x,z]=polar(h.angle,r);return [x+Math.cos(h.angle)*lateral,z-Math.sin(h.angle)*lateral];}
export function createTown(seed=43,count=18){const rand=rng(seed),names=['Mabel','Arthur','June','Felix','Edith','Theo','Nora','Alfie','Clara','Otis','Iris','Hugo','Hazel','Robin','Ada','Milo','Pearl','Jasper','Rose','Leo','Vera','Kit','Olive','Finn','Elsie','Rowan','Cora','Bertie','Wren','Mae','Luca','Daisy','Emil','Poppy','Ruth','Sid'];const homes=['The Lantern House','Bramble Cottage','Moonflower Books','The Copper Kettle','Cobweb Corner','The Pumpkin Pantry'];const houses=homes.map((name,i)=>({id:i,name,angle:i*Math.PI/3,stock:60,initial:60,queue:[],active:null,served:0}));const costumeIds=['witch','vampire','pumpkin','scarecrow','mummy','skeleton','wolf','robot'];const people=Array.from({length:count},(_,i)=>{const home=i%6,h=houses[home],a=h.angle,rank=Math.floor(i/6);return {id:i,name:names[i%names.length],costume:costumeIds[Math.floor(rand()*costumeIds.length)],height:i%3===0?1:.78+rand()*.1,variant:Math.floor(rand()*3),home,target:(home+1)%6,state:'home',position:housePoint(h,16.7,(rank-2)*.42),angle:a,heading:a+Math.PI,speed:1.05+rand()*.22,sweets:0,visits:0,timer:rank*3+rand()*2,route:[],at:0};});return {seed:Number(seed),houses,people,time:0,given:0,events:[],paused:false};}
function route(p,points){p.route=points;p.at=0;}
function move(p,dt){let left=p.speed*dt;while(p.at<p.route.length){const q=p.route[p.at],dx=q[0]-p.position[0],dz=q[1]-p.position[1],d=Math.hypot(dx,dz);if(d>1e-8)p.heading=Math.atan2(dx,dz);if(d<=left){p.position=[...q];left-=d;p.at++;}else{p.position[0]+=dx/d*left;p.position[1]+=dz/d*left;return false;}}return true;}
export function tickTown(town,dt){if(town.paused)return;dt=Math.max(0,Math.min(.1,dt));town.time+=dt;
 for(const p of town.people){const h=town.houses[p.target];
 if(p.state==='home'){p.timer-=dt;if(p.timer<=0){p.state='leave';const home=town.houses[p.home];route(p,[housePoint(home,14.75),housePoint(home,13.4),housePoint(home,WALK_RADIUS)]);}}
 else if(p.state==='leave'){if(move(p,dt))p.state='walk';}
 else if(p.state==='walk'){let remaining=h.angle-p.angle;while(remaining<0)remaining+=Math.PI*2;const step=p.speed*dt/WALK_RADIUS;if(remaining<=step){p.angle=h.angle;p.position=housePoint(h,WALK_RADIUS);p.state='queue';h.queue.push(p.id);route(p,[housePoint(h,12.6,(h.queue.length-1)*.8)]);}else{p.angle+=step;p.position=polar(p.angle,WALK_RADIUS);p.heading=p.angle+Math.PI/2;}}
 else if(p.state==='queue'){move(p,dt);if(h.active===null&&h.queue[0]===p.id&&p.at===p.route.length){h.active=p.id;p.state='approach';route(p,[housePoint(h,13.4),housePoint(h,14.75)]);}}
 else if(p.state==='approach'){if(move(p,dt)){p.state='greet';p.timer=0;}}
 else if(p.state==='greet'){p.heading=h.angle;p.timer+=dt;if(p.timer>=2){p.state='gift';p.timer=0;}}
 else if(p.state==='gift'){p.timer+=dt;if(p.timer>=1.2){if(h.stock>0){h.stock--;h.served++;p.sweets++;town.given++;town.events.unshift(`${p.name} received a sweet at ${h.name}.`);}else town.events.unshift(`${p.name} waved hello — ${h.name} is out of sweets.`);town.events=town.events.slice(0,6);p.visits++;p.state='depart';route(p,[housePoint(h,13.4),housePoint(h,WALK_RADIUS)]);}}
 else if(p.state==='depart'){if(move(p,dt)){h.queue.shift();h.active=null;h.queue.forEach((id,i)=>route(town.people[id],[housePoint(h,12.6,i*.8)]));p.target=(p.target+1)%HOUSE_COUNT;p.angle=h.angle;p.state='walk';}}
 }
}
export function advanceTown(town,dt){let remaining=Math.min(dt,2);while(remaining>1e-9){const step=Math.min(.05,remaining);tickTown(town,step);remaining-=step;}}
