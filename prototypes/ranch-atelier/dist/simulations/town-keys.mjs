// WASD (and arrow) panning for the Winchester map view (dispatch #545). The orbit target and the camera slide together over
// the ground, in the direction the camera faces, faster when zoomed out and faster again with Shift. Ignored while typing.
const KEYS={KeyW:[0,-1],ArrowUp:[0,-1],KeyS:[0,1],ArrowDown:[0,1],KeyA:[-1,0],ArrowLeft:[-1,0],KeyD:[1,0],ArrowRight:[1,0]};
export function mountTownKeys({camera,controls}){
 const held=new Set();let raf=0,last=0;
 const typing=e=>{const t=e.target;return t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));};
 const step=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;let x=0,z=0;for(const k of held){if(!KEYS[k])continue;x+=KEYS[k][0];z+=KEYS[k][1];}
  if(x||z){const len=Math.hypot(x,z),dist=camera.position.distanceTo(controls.target),speed=Math.max(40,dist*.7)*(held.has('Shift')?2.5:1);
   const f={x:controls.target.x-camera.position.x,z:controls.target.z-camera.position.z},fl=Math.hypot(f.x,f.z)||1,fx=f.x/fl,fz=f.z/fl; // forward on the ground, and its right
   const dx=(fx*-z+(-fz)*x)/len*speed*dt,dz=(fz*-z+fx*x)/len*speed*dt;camera.position.x+=dx;camera.position.z+=dz;controls.target.x+=dx;controls.target.z+=dz;controls.update?.();raf=requestAnimationFrame(step);}else raf=0;};
 addEventListener('keydown',e=>{if(e.metaKey||e.ctrlKey||e.altKey||typing(e)||controls.enabled===false)return;if(e.key==='Shift')held.add('Shift');if(!KEYS[e.code])return;e.preventDefault();held.add(e.code);if(!raf){last=performance.now();raf=requestAnimationFrame(step);}});
 addEventListener('keyup',e=>{held.delete(e.code);if(e.key==='Shift')held.delete('Shift');});
 addEventListener('blur',()=>held.clear());
}
