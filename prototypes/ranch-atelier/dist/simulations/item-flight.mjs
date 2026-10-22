import {PLANET_GRAVITY} from './planet-gravity.mjs';
// World render units. Only the manipulated item is advanced, not the whole scene.
export function releaseVelocity(samples,now,{window=.12,maxSpeed=4}={}){
 const recent=samples.filter(s=>now-s.time<=window);
 if(recent.length<2)return [0,0,0];
 const first=recent[0],last=recent.at(-1),dt=last.time-first.time;
 if(dt<=.001||now-last.time>.08)return [0,0,0];
 const v=last.position.map((n,i)=>(n-first.position[i])/dt),speed=Math.hypot(...v);
 return speed>maxSpeed?v.map(n=>n*maxSpeed/speed):v;
}
export function containPoint(from,to,contains){
 if(contains(to[0],to[2]))return [...to];
 let lo=0,hi=1;
 for(let i=0;i<24;i++){const m=(lo+hi)/2;if(contains(from[0]+(to[0]-from[0])*m,from[2]+(to[2]-from[2])*m))lo=m;else hi=m;}
 return [from[0]+(to[0]-from[0])*lo,to[1],from[2]+(to[2]-from[2])*lo];
}
/** Bottom-point terrain collision, not a general rigid-body solver. Physical seconds only.
 * Time and distance subdivision bounds terrain sweeps and gravity-boundary error.
 */
export function advanceFlight(state,dt,{contains,floorAt,gravity=PLANET_GRAVITY.earth*.1,gravityAt,restitution=.22,maxStep=1/120,maxTravel=.005}){
 if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Flight timestep must be 0..1 physical seconds');
 if(!(maxStep>0)||!(maxTravel>0)||!Number.isFinite(maxStep+maxTravel)||!Number.isFinite(restitution)||restitution<0||restitution>1)throw Error('Invalid flight options');
 if(![state.position,state.velocity].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)))throw Error('Invalid flight state');
 let left=dt,steps=0;
 while(left>1e-10){
  if(++steps>4096)throw Error('Flight exceeds collision step budget');
  const g=gravityAt?gravityAt(state.position[0],state.position[2],state):gravity;
  if(!Number.isFinite(g)||g<0)throw Error('Invalid gravity');
  const speed=Math.hypot(...state.velocity),h=Math.min(left,maxStep,maxTravel/Math.max(.001,speed+g*maxStep));left-=h;
  const from=state.position,velocity=state.velocity;
  const desired=from.map((n,i)=>n+velocity[i]*h-(i===1?.5*g*h*h:0)),next=containPoint(from,desired,contains);
  velocity[1]-=g*h;
  if(Math.hypot(next[0]-desired[0],next[2]-desired[2])>1e-8){velocity[0]*=-.2;velocity[2]*=-.2;}
  const floor=floorAt(next[0],next[2]);
  if(!Number.isFinite(floor))throw Error('Stage surface unavailable');
  state.grounded=next[1]<=floor;
  if(state.grounded){
   // An uphill obstruction is a collision, never permission to lift/teleport an item.
   if(floor>from[1]+1e-7&&Math.hypot(next[0]-from[0],next[2]-from[2])>1e-10){
    let lo=0,hi=1;for(let i=0;i<20;i++){const t=(lo+hi)/2,x=from[0]+(next[0]-from[0])*t,z=from[2]+(next[2]-from[2])*t;if(floorAt(x,z)<=from[1])lo=t;else hi=t;}
    next[0]=from[0]+(next[0]-from[0])*lo;next[2]=from[2]+(next[2]-from[2])*lo;next[1]=Math.max(next[1],floorAt(next[0],next[2]));velocity[0]*=-.2;velocity[2]*=-.2;
   }else next[1]=floor;
   if(velocity[1]<0)velocity[1]=-velocity[1]*restitution;
   const friction=Math.exp(-9*h);velocity[0]*=friction;velocity[2]*=friction;if(Math.abs(velocity[1])<.025)velocity[1]=0;
  }
  state.position=next;
 }
 // Publish membership at the final position as well as the last integration sample.
 if(gravityAt)gravityAt(state.position[0],state.position[2],state);
 state.age=(state.age||0)+dt;
 state.settled=state.grounded&&Math.hypot(...state.velocity)<.025;
 return state;
}
