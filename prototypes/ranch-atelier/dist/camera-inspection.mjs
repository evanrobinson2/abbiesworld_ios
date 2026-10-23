// Observe intent before shared canvas capture handlers consume the event.
// This never changes camera bindings, cancels input, or moves simulation objects.
export function observeCameraInspection(canvas,onSuspend,root=canvas.ownerDocument){
 const pointers=new Map();
 const belongs=e=>e.composedPath().includes(canvas);
 const wheel=e=>{if(belongs(e))onSuspend();};
 const down=e=>{
  if(!belongs(e))return;
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size>1||e.button!==0||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey)onSuspend();
 };
 const move=e=>{const p=pointers.get(e.pointerId);if(p&&Math.hypot(e.clientX-p.x,e.clientY-p.y)>5)onSuspend();};
 const end=e=>pointers.delete(e.pointerId);
 const blur=()=>pointers.clear();
 const events={wheel,pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,lostpointercapture:end};
 for(const [name,fn] of Object.entries(events))root.addEventListener(name,fn,{capture:true,passive:true});
 const win=canvas.ownerDocument?.defaultView;
 win?.addEventListener('blur',blur);
 return ()=>{for(const [name,fn]of Object.entries(events))root.removeEventListener(name,fn,true);win?.removeEventListener('blur',blur);pointers.clear();};
}
