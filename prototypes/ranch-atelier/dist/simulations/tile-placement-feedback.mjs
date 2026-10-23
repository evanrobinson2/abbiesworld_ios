import * as T from './vendor/three.module.js';
// Presentation only: never change stored tile coordinates, terrain or simulation.
export function settleTile(group,{reducedMotion=false}={}){
 const position=group.position.clone(),scale=group.scale.clone(),duration=reducedMotion?0:.52;let time=0,done=false;
 const finish=()=>{group.position.copy(position);group.scale.copy(scale);done=true;};
 function pose(t){const lift=t<.68?1.35*(1-t/.68)**2:Math.sin((t-.68)/.32*Math.PI)*.09;group.position.copy(position);group.position.y+=lift;const size=t<.68?1+.12*(1-t/.68):1-.025*Math.sin((t-.68)/.32*Math.PI);group.scale.copy(scale).multiplyScalar(size);}
 if(duration)pose(0);else finish();
 return {update(dt){if(done)return;time+=Math.max(0,dt);if(time>=duration)finish();else pose(time/duration);},finish,get done(){return done;},get progress(){return duration?Math.min(1,time/duration):1;}};
}
export function landingPulse(scene,surface,boundary){
 const mesh=new T.Mesh(surface.geometry.clone(),new T.MeshBasicMaterial({color:'#ffd36b',transparent:true,opacity:.42,depthTest:false,depthWrite:false,side:T.DoubleSide}));mesh.renderOrder=25;mesh.raycast=()=>{};scene.add(mesh);
 const edges=new T.LineLoop(boundary.geometry.clone(),new T.LineBasicMaterial({color:'#fff2ae',transparent:true,depthTest:false}));edges.renderOrder=26;edges.raycast=()=>{};scene.add(edges);
 let frame=0,end=0,disposed=false;const start=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);for(const o of [mesh,edges]){scene.remove(o);o.geometry.dispose();o.material.dispose();}}
 function tick(now){if(disposed)return;if(now-start>15000){dispose();return;}const fade=end?Math.max(0,1-(now-end)/650):1;mesh.material.opacity=(reduced?.28:.26+Math.sin((now-start)/150)*.08)*fade;edges.material.opacity=fade;if(!fade)dispose();else frame=requestAnimationFrame(tick);}
 frame=requestAnimationFrame(tick);return {finish(){end=performance.now();},dispose};
}
export function installTileCarryStyle(){if(document.getElementById('tile-carry-style'))return;const style=document.createElement('style');style.id='tile-carry-style';style.textContent=`
#scene-drag-ghost{width:min(380px,85vw);height:auto;aspect-ratio:16/9;transform:translate(-50%,-86%) rotate(-3deg);background:transparent;border:0;border-radius:0;opacity:1;box-shadow:none;filter:drop-shadow(0 22px 15px #30251655);z-index:10000;overflow:visible;transition:filter .14s;pointer-events:none}
#scene-drag-ghost[hidden]{display:none!important}
#scene-drag-ghost .live-tray-canvas{display:block;width:100%;height:100%;border-radius:0;pointer-events:none}
#scene-drag-ghost::after{content:'';position:absolute;left:50%;top:86%;width:9px;height:9px;transform:translate(-50%,-50%);border:2px solid #fff6dc;border-radius:50%;background:#b84931;box-shadow:0 0 0 4px #b8493144}
#scene-drag-ghost[data-valid=true]{filter:drop-shadow(0 0 12px #ffd36baa) drop-shadow(0 18px 12px #30251644)}
#scene-drag-ghost[data-valid=true]::after{background:#efbd4b;box-shadow:0 0 0 6px #efbd4b44}
.tile-carry-label{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%) rotate(3deg);padding:7px 12px;border-radius:999px;background:var(--app-paper,#fff9ed);color:var(--app-ink,#354438);font:600 12px var(--app-font,Manrope,sans-serif);white-space:nowrap;box-shadow:0 3px 12px #30251633}
body.tile-in-hand,body.tile-in-hand canvas{cursor:grabbing!important}
body.tile-in-hand #tile-chooser .tile-options button{outline:2px dashed var(--app-accent,#b84931);outline-offset:-5px}
#scene-drag-ghost.is-snapping::after,#scene-drag-ghost.is-snapping .tile-carry-label{visibility:hidden}
#scene-drag-ghost.is-waiting .live-tray-canvas{animation:tile-wind-up .42s cubic-bezier(.4,0,.6,1) infinite alternate}
@keyframes tile-wind-up{from{transform:translateY(0) rotate(-1.5deg) scale(1,1)}to{transform:translateY(-7%) rotate(1.5deg) scale(1.03,.95)}}
@media(prefers-reduced-motion:reduce){#scene-drag-ghost{transform:translate(-50%,-86%);transition:none}#scene-drag-ghost.is-waiting .live-tray-canvas{animation:none}.tile-carry-label{transform:translateX(-50%)}}
`;document.head.append(style);}
