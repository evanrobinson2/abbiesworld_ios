import * as T from './vendor/three.module.js';
// Interactions float over the thing you touched, like reaching into the world, instead of docking in a side panel.
// The card sits above the selection's screen bounds, flips below or beside it when there is no room, and follows moving residents.
const style=document.createElement('style');style.textContent=`body.simulation-workspace #inspection.world-anchored{position:fixed!important;left:var(--anchor-left)!important;top:var(--anchor-top)!important;right:auto!important;bottom:auto!important;width:min(280px,calc(100vw - 24px))!important;max-width:none!important;max-height:var(--anchor-max-height,46dvh)!important;overflow:auto!important;transform:none!important;transform-origin:var(--anchor-origin,50% 100%)!important;animation:world-anchor-in .16s ease-out!important;box-shadow:0 10px 30px #2a22144d!important;z-index:39!important}
#world-anchor-stem{position:fixed;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;background:var(--app-paper,#fff9ed);border:1px solid var(--app-border,#d5ceb9);border-width:0 1px 1px 0;transform:rotate(var(--stem-turn,45deg));z-index:40;pointer-events:none}
#world-anchor-stem[hidden]{display:none}
#world-anchor-dot{position:fixed;left:0;top:0;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:var(--app-accent,#b84931);box-shadow:0 0 0 3px #fff9edcc;z-index:5;pointer-events:none}
#world-anchor-dot[hidden]{display:none}
@keyframes world-anchor-in{from{opacity:0;scale:.94}to{opacity:1;scale:1}}
@media(prefers-reduced-motion:reduce){body.simulation-workspace #inspection.world-anchored{animation:none!important}}`;
document.head.append(style);
export function installWorldAnchor({panel,camera,canvas,target}){
 const stem=document.createElement('div');stem.id='world-anchor-stem';stem.hidden=true;stem.setAttribute('aria-hidden','true');
 const dot=document.createElement('div');dot.id='world-anchor-dot';dot.hidden=true;dot.setAttribute('aria-hidden','true');document.body.append(dot,stem);
 const box=new T.Box3(),origin=new T.Vector3(),corner=new T.Vector3(),offset={min:new T.Vector3(),max:new T.Vector3()};let current=null,frame=0;
 function measure(object){object.updateWorldMatrix(true,true);box.setFromObject(object);if(box.isEmpty())return false;object.getWorldPosition(origin);offset.min.copy(box.min).sub(origin);offset.max.copy(box.max).sub(origin);return true;}
 function release(){if(!current&&!panel.classList.contains('world-anchored'))return;current=null;panel.classList.remove('world-anchored');stem.hidden=dot.hidden=true;}
 function place(){
  const object=target();if(panel.hidden||!object||!object.parent||document.body.classList.contains('scene-library-open')){release();return;}
  if(object!==current){if(!measure(object)){release();return;}current=object;panel.classList.add('world-anchored');}
  object.getWorldPosition(origin);const c=canvas.getBoundingClientRect();let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,behind=0;
  for(let i=0;i<8;i++){corner.set(i&1?offset.max.x:offset.min.x,i&2?offset.max.y:offset.min.y,i&4?offset.max.z:offset.min.z).add(origin).project(camera);if(corner.z>1)behind++;const x=c.left+(corner.x+1)*c.width/2,y=c.top+(1-corner.y)*c.height/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(behind===8){stem.hidden=dot.hidden=true;return;}
  const header=document.querySelector('body>header')?.getBoundingClientRect().bottom||0,minTop=Math.max(8,header+8),gap=16,w=panel.offsetWidth,h=panel.offsetHeight,cx=Math.min(Math.max((left+right)/2,c.left+12),c.right-12);
  // Anchor on the top of what you touched; a very tall bound (a whole tile) uses its upper third so the card stays close.
  const anchorY=Math.max(top,Math.min(bottom,top+(bottom-top)*.18));
  let x,y,side;
  if(anchorY-gap-h>=minTop){side='above';x=cx-w/2;y=anchorY-gap-h;}
  else if(bottom+gap+h<=innerHeight-8){side='below';x=cx-w/2;y=bottom+gap;}
  else if(right+gap+w<=innerWidth-8){side='right';x=right+gap;y=(top+bottom)/2-h/2;}
  else{side='left';x=left-gap-w;y=(top+bottom)/2-h/2;}
  x=Math.min(Math.max(8,x),innerWidth-w-8);y=Math.min(Math.max(minTop,y),Math.max(minTop,innerHeight-h-8));
  panel.style.setProperty('--anchor-left',x+'px');panel.style.setProperty('--anchor-top',y+'px');panel.style.setProperty('--anchor-max-height',Math.max(160,Math.min(innerHeight*.5,innerHeight-minTop-16))+'px');
  const sx=side==='above'||side==='below'?Math.min(Math.max(cx,x+18),x+w-18):side==='right'?x:x+w,sy=side==='above'?y+h:side==='below'?y:Math.min(Math.max((top+bottom)/2,y+18),y+h-18);
  stem.style.left=sx+'px';stem.style.top=sy+'px';stem.style.setProperty('--stem-turn',{above:'45deg',below:'225deg',right:'135deg',left:'-45deg'}[side]);
  panel.style.setProperty('--anchor-origin',side==='above'?'50% 100%':side==='below'?'50% 0':side==='right'?'0 50%':'100% 50%');
  dot.style.left=cx+'px';dot.style.top=(side==='below'?bottom:anchorY)+'px';stem.hidden=dot.hidden=false;
 }
 const loop=()=>{frame=requestAnimationFrame(loop);place();};frame=requestAnimationFrame(loop);
 return {refresh(){current=null;},dispose(){cancelAnimationFrame(frame);release();stem.remove();dot.remove();}};
}
