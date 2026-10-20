// Behavior proposes a nearby waypoint. Physics alone writes the retained pose.
// This is bounded walking propulsion, never position correction or vertical lift.
export function beginRecovery(body,target,centerOffset){
 if(body.recoveryAttempted)return false;body.recoveryAttempted=true;
 const p=target?.position;if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))return false;
 const feet=body.position.map((v,i)=>v-centerOffset[i]),limit=Math.min(2,Number.isFinite(target.maxDistance)?target.maxDistance:2);
 if(limit<=0||Math.hypot(p[0]-feet[0],p[2]-feet[2])>limit+1e-8)return false;
 body.recovery={target:[...p],centerOffset:[...centerOffset],seconds:0};return true;
}
export function stepRecovery(body,dt){
 const r=body.recovery;if(!r)return;r.seconds+=dt;
 if(r.seconds>6){delete body.recovery;return;}
 if(!body.contact)return; // Airborne movement is entirely gravity/contact driven.
 const dx=r.target[0]-(body.position[0]-r.centerOffset[0]),dz=r.target[2]-(body.position[2]-r.centerOffset[2]),d=Math.hypot(dx,dz),speed=d<.025?0:Math.min(.6,d/.15),vx=d?dx/d*speed:0,vz=d?dz/d*speed:0;
 const ax=vx-body.velocity[0],az=vz-body.velocity[2],change=Math.hypot(ax,az),fraction=change?Math.min(1,10*dt/change):0;
 body.velocity[0]+=ax*fraction;body.velocity[2]+=az*fraction;
 if(d<.025&&Math.hypot(body.velocity[0],body.velocity[2])<.02)delete body.recovery;
}
