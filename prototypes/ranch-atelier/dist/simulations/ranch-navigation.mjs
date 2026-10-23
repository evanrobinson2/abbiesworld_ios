import {profiler as perf} from './simulation-profiler.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function boxObstacle(x,z,w,d,angle=0){return {x,z,w,d,angle};}
export function overlaps(p,r,o){if(o.radius!==undefined){const reach=r+o.radius;if(Math.abs(p.x-o.x)>reach||Math.abs(p.z-o.z)>reach)return false;return distance(p,o)<reach;}const c=Math.cos(o.angle||0),s=Math.sin(o.angle||0),dx=p.x-o.x,dz=p.z-o.z,x=dx*c-dz*s,z=dx*s+dz*c;if(Math.abs(x)>o.w/2+r+1e-9||Math.abs(z)>o.d/2+r+1e-9)return false;return Math.hypot(Math.max(0,Math.abs(x)-o.w/2),Math.max(0,Math.abs(z)-o.d/2))<r;}
export function clearPoint(p,r,obstacles,bounds=()=>true){return bounds(p,r)&&!obstacles.some(o=>overlaps(p,r,o));}
export function clearSegment(a,b,r,obstacles,bounds){const n=Math.max(1,Math.ceil(distance(a,b)/Math.max(.08,r*.5)));for(let i=0;i<=n;i++)if(!clearPoint({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n},r,obstacles,bounds))return false;return true;}
function freePointImpl(p,r,obstacles,bounds,peers=[]){for(let ring=0;ring<30;ring++)for(let i=0;i<(ring?24:1);i++){const a=i*Math.PI/12,q={x:p.x+Math.cos(a)*ring*.25,z:p.z+Math.sin(a)*ring*.25};if(clearPoint(q,r,obstacles,bounds)&&peers.every(o=>distance(q,o)>=r+o.radius+.08))return q;}return null;}
// Stable bounded A* priority queue: newest equal-cost entry wins, as before.
class RouteQueue{
 constructor(){this.items=[];this.serial=0;}
 get length(){return this.items.length;}
 before(a,b){return a.f<b.f||(a.f===b.f&&a.order>b.order);}
 push(node){node.order=this.serial++;const a=this.items;let i=a.length;a.push(node);while(i){const p=(i-1)>>1;if(!this.before(node,a[p]))break;a[i]=a[p];i=p;}a[i]=node;}
 pop(){const a=this.items,result=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&this.before(a[c+1],a[c]))c++;if(!this.before(a[c],last))break;a[i]=a[c];i=c;}a[i]=last;}return result;}
}
// A bounded visibility-checked grid repairs only obstructed stretches of the authored path.
// Every point the search can test lies within distance(a,b)+35 m of a, so obstacles
// beyond that reach can never overlap and are dropped once per search.
function nearObstacles(a,reach,r,obstacles){const limit=reach+r+1e-6;return obstacles.filter(o=>{const extent=o.radius!==undefined?o.radius:Math.hypot(o.w,o.d)/2;return Math.abs(o.x-a.x)<=limit+extent&&Math.abs(o.z-a.z)<=limit+extent;});}
function detourImpl(a,b,r,obstacles,bounds){obstacles=nearObstacles(a,distance(a,b)+35+1,r,obstacles);if(!clearPoint(a,r,obstacles,bounds)||!clearPoint(b,r,obstacles,bounds))return null;if(clearSegment(a,b,r,obstacles,bounds))return [b];const step=.7,key=(x,z)=>x+','+z,open=new RouteQueue(),seen=new Map([[key(0,0),0]]);let visits=0;open.push({x:0,z:0,g:0,f:distance(a,b)});
 while(open.length&&visits++<6000){const n=open.pop(),p={x:a.x+n.x*step,z:a.z+n.z*step};if(distance(p,b)<step*1.5&&clearSegment(p,b,r,obstacles,bounds)){const route=[b];for(let q=n;q.parent;q=q.parent)route.unshift({x:a.x+q.x*step,z:a.z+q.z*step});return route;}
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,q={x:a.x+x*step,z:a.z+z*step},g=n.g+Math.hypot(dx,dz)*step,k=key(x,z);if(g>distance(a,b)+35||g>=(seen.get(k)??Infinity)||!clearSegment(p,q,r,obstacles,bounds))continue;seen.set(k,g);open.push({x,z,g,f:g+distance(q,b),parent:n});}}
 return null;}
export function safeRoute(start,points,r,obstacles,bounds){let p=start;const route=[];for(const target of points){const part=detour(p,target,r,obstacles,bounds);if(!part)return null;route.push(...part);p=target;}return route;}
// Swept tests prevent tunnelling; a consistent right-hand preference lets agents pass.
function avoidStepImpl(position,target,step,r,obstacles,peers=[],bounds=()=>true,prepared=false){const d=distance(position,target);if(d<.001)return {...position};// Exclude only peers that cannot contribute collision or pressure anywhere in this step.
 // Keep original peer order and the exact narrow-phase and score arithmetic.
 const reach=Math.abs(Math.min(step,d));if(!prepared)peers=nearbyPeers(position,reach,r,peers);
 const heading=Math.atan2(target.z-position.z,target.x-position.x);let best=null,bestScore=Infinity;
 for(const turn of [0,.35,-.35,.7,-.7,1.1,-1.1,1.55,-1.55,2.1,-2.1,2.6,-2.6,Math.PI]){const a=heading+turn,q={x:position.x+Math.cos(a)*Math.min(step,d),z:position.z+Math.sin(a)*Math.min(step,d)};if(!clearSegment(position,q,r,obstacles,bounds))continue;let valid=true,pressure=0;for(const o of peers){const gap=distance(q,o)-(r+o.radius);if(!clearSegment(position,q,r,[o])){valid=false;break;}pressure+=Math.max(0,.8-gap)*.1;}if(!valid)continue;const score=distance(q,target)+Math.abs(turn)*step*.12+pressure+(turn<0?.015*step:0);if(score<bestScore){best=q;bestScore=score;}}
 return best||{...position};}

export function avoidStep(...args){return perf.measure('nav.avoidStep',()=>avoidStepImpl(...args));}

// The same search with the same obstacles and bounds always fails the same way.
// A walker that cannot route retries from the same spot every tick, so recent
// failures are remembered (exact inputs only) instead of re-running the grid.
const failedSearches=new WeakMap();let detourCalls=0;
function failures(obstacles,bounds){let byBounds=failedSearches.get(obstacles);if(!byBounds)failedSearches.set(obstacles,byBounds=new WeakMap());let entry=byBounds.get(bounds);if(!entry||entry.count!==obstacles.length)byBounds.set(bounds,entry={count:obstacles.length,keys:new Map()});return entry.keys;}
export function detour(a,b,r,obstacles,bounds=()=>true){
 const known=failures(obstacles,bounds),key=a.x+','+a.z+','+b.x+','+b.z+','+r,seen=known.get(key);detourCalls++;
 if(seen!==undefined&&detourCalls-seen<4000)return null;
 const route=perf.measure('nav.detour',()=>detourImpl(a,b,r,obstacles,bounds));
 if(route)known.delete(key);else{if(known.size>=512)known.delete(known.keys().next().value);known.set(key,detourCalls);}
 return route;}



export function freePoint(...args){return perf.measure('nav.freePoint',()=>freePointImpl(...args));}

// Reuse this conservative ordered superset for steering and the final swept test.
export function nearbyPeers(position,reach,r,peers){return peers.filter(o=>{const limit=Math.abs(reach)+r+o.radius+.8+1e-9;return Math.abs(position.x-o.x)<=limit&&Math.abs(position.z-o.z)<=limit;});}
// Caller supplies nearbyPeers for at least this movement distance.
export function avoidStepWithPeers(position,target,step,r,obstacles,peers,bounds){return perf.measure('nav.avoidStep',()=>avoidStepImpl(position,target,step,r,obstacles,peers,bounds,true));}
