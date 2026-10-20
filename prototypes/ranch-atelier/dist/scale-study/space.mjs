export const CELL=.25,PERSON_RADIUS=.38,DOOR_WIDTH=1.2;
export const BUILDING={radius:4.5,height:2.8};
export const DOOR_Z=BUILDING.radius*Math.sqrt(3)/2;
export const FOOTPRINT=Array.from({length:6},(_,i)=>[BUILDING.radius*Math.cos(i*Math.PI/3),BUILDING.radius*Math.sin(i*Math.PI/3)]);
export const SHELF=[1.8,-2.4],RECEIVING=[1.8,-1.65];
const wall=(a,b)=>({a,b,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,w:Math.hypot(b[0]-a[0],b[1]-a[1]),d:.2,angle:-Math.atan2(b[1]-a[1],b[0]-a[0]),kind:'wall'});
export const WALLS=FOOTPRINT.flatMap((a,i)=>{const b=FOOTPRINT[(i+1)%6];return i===1?[wall(a,[DOOR_WIDTH/2,DOOR_Z]),wall([-DOOR_WIDTH/2,DOOR_Z],b)]:[wall(a,b)];});
export const OBSTACLES=[...WALLS,
 {x:SHELF[0],z:SHELF[1],w:1.8,d:.65,kind:'shelf'},
 {x:-1.4,z:-.9,w:1.8,d:.9,kind:'counter'},
 {x:-1.8,z:1,w:1.75,d:.55,kind:'bench'}
];
export function insideBuilding([x,z]){return FOOTPRINT.every((a,i)=>{const b=FOOTPRINT[(i+1)%6];return (b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0])>=-1e-8;});}
export function toWorld([x,z],angle=0,offset=0){const a=angle*Math.PI/180;return [x*Math.cos(a)+z*Math.sin(a)+offset,-x*Math.sin(a)+z*Math.cos(a)];}
export function toLocal([x,z],angle=0,offset=0){const a=angle*Math.PI/180;x-=offset;return [x*Math.cos(a)-z*Math.sin(a),x*Math.sin(a)+z*Math.cos(a)];}
export function blocked(point,angle=0,offset=0){if(Math.abs(point[0]+6)<.75+PERSON_RADIUS&&Math.abs(point[1]-4.8)<.7+PERSON_RADIUS)return true;const [x,z]=toLocal(point,angle,offset);return OBSTACLES.some(o=>{const c=Math.cos(o.angle||0),s=Math.sin(o.angle||0),dx=x-o.x,dz=z-o.z;return Math.abs(dx*c-dz*s)<o.w/2+PERSON_RADIUS-1e-6&&Math.abs(dx*s+dz*c)<o.d/2+PERSON_RADIUS-1e-6;});}
// Axial hexes: CELL is the distance between neighboring centers, in metres.
export const HEX_NEIGHBORS=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
export function hexCenter([q,r],spacing=CELL){return [spacing*(q+r/2),spacing*Math.sqrt(3)/2*r];}
export function nearestHex([x,z],spacing=CELL){const r=z/(spacing*Math.sqrt(3)/2),q=x/spacing-r/2,s=-q-r;let qi=Math.round(q),ri=Math.round(r),si=Math.round(s);const dq=Math.abs(qi-q),dr=Math.abs(ri-r),ds=Math.abs(si-s);if(dq>dr&&dq>ds)qi=-ri-si;else if(dr>ds)ri=-qi-si;return [qi,ri];}
export function clearSegment(a,b,angle=0,offset=0){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.025));for(let i=0;i<=n;i++)if(blocked([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n],angle,offset))return false;return true;}
export function findRoute(angle=0,offset=0){
 const start=[-7.5,8.5],end=toWorld(RECEIVING,angle,offset),key=p=>p.join(','),a=nearestHex(start),nearest=nearestHex(end);
 // Exact activity anchors connect to a nearby clear hex center without moving the shelf.
 const candidates=[nearest,...HEX_NEIGHBORS.map(d=>[nearest[0]+d[0],nearest[1]+d[1]])].filter(c=>clearSegment(hexCenter(c),end,angle,offset));
 if(!candidates.length)throw new Error('Receiving shelf has no clear hex connection');
 const goals=new Set(candidates.map(key)),queue=[a],parents=new Map([[key(a),null]]);let found;
 for(let i=0;i<queue.length;i++){const p=queue[i],worldP=hexCenter(p);if(goals.has(key(p))){found=p;break;}for(const [dq,dr] of HEX_NEIGHBORS){const n=[p[0]+dq,p[1]+dr],world=hexCenter(n),k=key(n);if(world[0]<-10||world[0]>10||world[1]<-7||world[1]>10||parents.has(k)||!clearSegment(worldP,world,angle,offset))continue;parents.set(k,p);queue.push(n);}}
 if(!found)throw new Error('No clear hex route through the doorway');const path=[];let p=found;while(p){path.push(hexCenter(p));p=parents.get(key(p));}path.reverse();if(!clearSegment(start,path[0],angle,offset))throw new Error('Street anchor is blocked');return [start,...path,end];
}
export function hexPolygon(center=[0,0],radius=1){return Array.from({length:6},(_,i)=>{const a=(30+i*60)*Math.PI/180;return [center[0]+Math.cos(a)*radius,center[1]+Math.sin(a)*radius];});}
// Clip linework to a convex boundary; partial hexes remain honest at building walls.
export function clipSegment(a,b,polygon){let lo=0,hi=1;const delta=[b[0]-a[0],b[1]-a[1]];for(let i=0;i<polygon.length;i++){const p=polygon[i],n=polygon[(i+1)%polygon.length],e=[n[0]-p[0],n[1]-p[1]],c=e[0]*(a[1]-p[1])-e[1]*(a[0]-p[0]),d=e[0]*delta[1]-e[1]*delta[0];if(Math.abs(d)<1e-10){if(c< -1e-8)return null;continue;}const t=-c/d;if(d>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}return [[a[0]+lo*delta[0],a[1]+lo*delta[1]],[a[0]+hi*delta[0],a[1]+hi*delta[1]]];}
export function routeLength(path){return path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);}
export function onRoute(path,distance){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=length)return {position:[a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length],heading:Math.atan2(b[0]-a[0],b[1]-a[1])};distance-=length;}return {position:[...path.at(-1)],heading:Math.PI};}
