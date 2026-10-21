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
export function advanceFlight(state,dt,{contains,floorAt,gravity=.981,restitution=.22,maxStep=1/120}){
 if(!Number.isFinite(dt)||dt<0)throw Error('Invalid flight timestep');
 let left=Math.min(dt,.1);
 while(left>1e-8){const h=Math.min(left,maxStep);left-=h;state.velocity[1]-=gravity*h;
  const desired=state.position.map((n,i)=>n+state.velocity[i]*h),next=containPoint(state.position,desired,contains);
  if(Math.hypot(next[0]-desired[0],next[2]-desired[2])>1e-8){state.velocity[0]*=-.2;state.velocity[2]*=-.2;}
  const floor=floorAt(next[0],next[2]);
  if(!Number.isFinite(floor))throw Error('Stage surface unavailable');
  state.grounded=next[1]<=floor;
  if(state.grounded){next[1]=floor;if(state.velocity[1]<0)state.velocity[1]=-state.velocity[1]*restitution;const friction=Math.exp(-9*h);state.velocity[0]*=friction;state.velocity[2]*=friction;if(Math.abs(state.velocity[1])<.025)state.velocity[1]=0;}
  state.position=next;
 }
 state.age=(state.age||0)+dt;
 state.settled=state.grounded&&Math.hypot(...state.velocity)<.025;
 return state;
}
