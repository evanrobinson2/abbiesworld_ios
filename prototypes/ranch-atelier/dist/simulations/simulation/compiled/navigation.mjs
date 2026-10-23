export async function createCompiledNavigation(bytes){
 const source=bytes??await (await fetch(new URL('./navigation.wasm',import.meta.url))).arrayBuffer();
 const {instance}=await WebAssembly.instantiate(source,{}),e=instance.exports;e._initialize?.();
 const obstacles=new Float64Array(e.memory.buffer,e.obstacle_buffer(),512*6),peers=new Float64Array(e.memory.buffer,e.peer_buffer(),16384*3),result=new Float64Array(e.memory.buffer,e.result_buffer(),2);
 let calls=0,fallbacks=0;
 return {kind:'wasm-c',get calls(){return calls;},get fallbacks(){return fallbacks;},step(position,target,step,r,obs,near,p){
  if(obs.length>512||near.length>16384)return null;
  for(let i=0;i<obs.length;i++){const o=obs[i],j=i*6;obstacles[j]=o.x;obstacles[j+1]=o.z;obstacles[j+2]=o.radius??-1;obstacles[j+3]=o.w??0;obstacles[j+4]=o.d??0;obstacles[j+5]=o.angle??0;}
  for(let i=0;i<near.length;i++){const o=near[i],j=i*3;peers[j]=o.x;peers[j+1]=o.z;peers[j+2]=o.radius;}
  const ok=e.avoid_pen_step(position.x,position.z,target.x,target.z,step,r,p.w,p.d,obs.length,near.length);if(!ok){fallbacks++;return null;}calls++;return {x:result[0],z:result[1]};
 }};
}
