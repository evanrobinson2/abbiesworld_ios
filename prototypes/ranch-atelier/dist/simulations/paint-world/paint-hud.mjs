// One unlimited miracle in the hand: click to carry, or grab and flick on touch.
import {rollBall} from './paint-balls.mjs';
import {pop} from './balloon.mjs';
export const SPIN_COOLDOWN_MS = 0;
export const THROW_EFFECTS = ['paint', 'fireball', 'waterball', 'cats-dogs'];
const FIREBALL = `<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true"><defs><radialGradient id="pwf" cx=".38" cy=".4" r=".75"><stop offset="0" stop-color="#ffe58a"/><stop offset=".5" stop-color="#ff6fae"/><stop offset="1" stop-color="#7a3ad6"/></radialGradient></defs>
<path d="M40 5c-9 3-14 8-16 11-6-2-14 2-14 11 0 8 6 14 14 14s14-6 14-13c0-4-2-7-4-9 3-3 5-8 6-14z" fill="url(#pwf)" stroke="#2b2a26" stroke-width="2.4" stroke-linejoin="round"/>
<circle cx="8" cy="39" r="2.6" fill="#ff6fae" stroke="#2b2a26" stroke-width="1.6"/><circle cx="14" cy="45" r="1.8" fill="#7a3ad6" stroke="#2b2a26" stroke-width="1.4"/><circle cx="4" cy="30" r="1.8" fill="#ffd54a" stroke="#2b2a26" stroke-width="1.4"/>
<ellipse cx="19" cy="25" rx="4" ry="2.6" fill="#fff" opacity=".85" transform="rotate(-35 19 25)"/></svg>`;

const CSS = `#paint-hud{position:fixed;right:14px;top:112px;z-index:6;pointer-events:auto}
#paint-hud.inline{position:static}
#paint-hud .ph-icon{position:relative;width:48px;height:48px;border:0;padding:0;background:none;cursor:grab;touch-action:none;filter:drop-shadow(0 3px 5px #0005)}
#paint-hud .ph-icon:focus-visible{outline:2px solid #fff;border-radius:50%}
#paint-hud .ph-icon[aria-pressed=true]{filter:drop-shadow(0 0 7px #ff6fae)}
#paint-hud .ph-n{position:absolute;right:-4px;bottom:-3px;background:#2b2a26;color:#fff;border-radius:50%;padding:1px 4px;font:800 18px/1 system-ui}
.ph-held{position:fixed;width:64px;height:64px;z-index:60;pointer-events:none;transform:translate(-50%,-60%);filter:drop-shadow(0 6px 9px #ff6fae88)}`;
export function createPaintHud({onThrow, host=null, surface=null, rand=Math.random}={}) {
 if (!document.getElementById('ph-css')) document.head.append(Object.assign(document.createElement('style'), {id:'ph-css',textContent:CSS}));
 const el=document.createElement('div'); el.id='paint-hud'; el.dataset.layer='presentation'; if(host)el.className='inline';
 const icon=document.createElement('button'); icon.type='button'; icon.className='ph-icon';
 icon.setAttribute('aria-label','Pick up a random balloon. Unlimited.'); icon.setAttribute('aria-pressed','false');
 icon.innerHTML=FIREBALL+'<span class="ph-n" aria-hidden="true">&infin;</span>'; el.append(icon); (host||document.body).append(el);
 let held=null, ball=null, pointer=null, trail=[], origin=null, fromIcon=false, visible=true, suppressClick=false;
 const listeners=new AbortController(), options={capture:true,signal:listeners.signal};
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function position(x,y){if(held){held.style.left=x+'px';held.style.top=y+'px';}}
 function pick(x,y){
  if(held)return;
  const g=rollBall(rand); ball={colour:g.colours[0],size:g.size,R:g.size.mult,kind:THROW_EFFECTS[Math.floor(rand()*THROW_EFFECTS.length)]};
  held=document.createElement('div');held.className='ph-held';held.dataset.layer='presentation';held.setAttribute('aria-hidden','true');held.innerHTML=FIREBALL.replaceAll('pwf','pwf-held');document.body.append(held);
  icon.setAttribute('aria-pressed','true');position(x,y);
 }
 function cancel(){held?.remove();held=null;ball=null;pointer=null;trail=[];icon.setAttribute('aria-pressed','false');}
 function sample(e){const t=performance.now();trail.push({x:e.clientX,y:e.clientY,t});while(trail.length>1&&t-trail[0].t>100)trail.shift();position(e.clientX,e.clientY);}
 function worldTarget(e){return surface ? e.target===surface : e.target?.tagName==='CANVAS';}
 function down(e){
  const home=icon.contains(e.target);
  if(e.button!==0||e.shiftKey||e.ctrlKey||e.metaKey||e.altKey){if(held)cancel();suppressClick=false;return;}
  if(!home&&!held)suppressClick=false;
  if(!visible||e.button!==0||(!home&&(!held||!worldTarget(e))))return;
  if(pointer!==null){cancel();return;}
  stop(e);suppressClick=true;pick(e.clientX,e.clientY);pointer=e.pointerId;fromIcon=home;origin={x:e.clientX,y:e.clientY};trail=[];sample(e);
 }
 function move(e){if(!held)return;if(pointer!==null&&e.pointerId!==pointer)return;if(pointer!==null){stop(e);sample(e);}else if(e.pointerType==='mouse')position(e.clientX,e.clientY);}
 function up(e){
  if(!held||e.pointerId!==pointer)return;stop(e);sample(e);
  const moved=Math.hypot(e.clientX-origin.x,e.clientY-origin.y);pointer=null;
  if(fromIcon&&moved<8)return;
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  if(surface?hit!==surface:hit?.tagName!=='CANVAS'){cancel();return;}
  const a=trail[0],z=trail.at(-1),dt=Math.max(.016,(z.t-a.t)/1000);
  const clamp=v=>Math.max(-3000,Math.min(3000,v));
  const launched=onThrow?.(ball,e.clientX,e.clientY,clamp((z.x-a.x)/dt),clamp((z.y-a.y)/dt));
  if(launched!==false)pop(e.clientX,e.clientY,ball.kind,ball.colour);
  cancel();
 }
 window.addEventListener('pointerdown',down,options);window.addEventListener('pointermove',move,options);window.addEventListener('pointerup',up,options);
 window.addEventListener('click',e=>{if(suppressClick){suppressClick=false;if(worldTarget(e)||icon.contains(e.target))stop(e);}},{capture:true,signal:listeners.signal});
 window.addEventListener('pointercancel',cancel,{signal:listeners.signal});window.addEventListener('blur',cancel,{signal:listeners.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},{signal:listeners.signal});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();},{signal:listeners.signal});
 icon.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0){const r=icon.getBoundingClientRect();held?cancel():pick(r.x+r.width/2,r.bottom+32);}});
 const tray={count:()=>Infinity,fill(){},clear:cancel,grant(){return Infinity;}};
 const api={el,tray,grant(){},ready:()=>true,cooldownLeft:()=>0,cancel,
  setVisible(on){visible=on;el.hidden=!on;if(!on)cancel();},refresh(){},
  dispose(){cancel();listeners.abort();el.remove();}};
 window.addEventListener('pagehide',()=>api.dispose(),{once:true,signal:listeners.signal});
 return api;
}
