// The title screen: one tile you can play before anything else has loaded (dispatch #482, Evan 2026-10-23: "I am not a
// fan of the loading game"). A tiny scene of its own (a handful of shaders, compiled the moment it opens) shows one hex tile
// with three sheep. One effect card is dealt per launch. The chalkboard teaches the gesture, "Move card to play area.", and the
// power only switches on when the card is dropped into the play area, never on deal or touch. Progress for the main world's
// shaders sits unobtrusively at the bottom and never blocks the card. The basement is an Easter egg inside the game now.
// Same step(n,total) / finish(ok) interface as warm-up-card.mjs and intro-scene.mjs.
import * as T from './vendor/three.module.js';
const TOWN='/town';
const CARDS=[
 {id:'fireball',name:'Fireball',glyph:'\u{1F525}',tint:'#ff7a3d'},
 {id:'waterball',name:'Waterball',glyph:'\u{1F4A7}',tint:'#4aa8ff'},
 {id:'tie-dye',name:'Tie-dye',glyph:'\u{1F308}',tint:'#c46bff'},
 {id:'paint-rain',name:'Paint rain',glyph:'\u{1F3A8}',tint:'#ff5fa2'},
];
const STYLE=`#title-tile{position:fixed;inset:0;z-index:2147483000;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;background:linear-gradient(#ffd9a8 0%,#ffeccb 38%,#cfe8ee 100%);font-family:"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif;transition:opacity .7s ease}
#title-tile.leaving{opacity:0;pointer-events:none}
#title-tile canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#title-tile .name{position:absolute;top:max(14px,env(safe-area-inset-top));left:0;right:0;text-align:center;font-weight:800;font-size:clamp(26px,6vw,52px);color:#5a3a22;letter-spacing:.01em;text-shadow:0 2px 0 #fff8;pointer-events:none}
#title-tile .board{position:absolute;left:50%;top:calc(max(14px,env(safe-area-inset-top)) + clamp(40px,8vw,72px));transform:translateX(-50%) rotate(-1.2deg);width:min(88vw,430px);padding:12px 16px;border-radius:10px;background:#2c3a33;color:#f3f0e6;font-size:clamp(17px,4.4vw,24px);text-align:center;border:7px solid #9a6a3c;box-shadow:0 6px 0 #6d4824,0 12px 22px #0003,inset 0 0 22px #0006;pointer-events:none;font-family:"Chalkboard SE","Comic Sans MS","Segoe Print",system-ui,sans-serif}
#title-tile .board b{font-weight:400;border-bottom:2px dashed #f3f0e6aa}
#title-tile.played .board{opacity:0;transition:opacity .6s}
#title-tile .zone{position:absolute;left:50%;top:54%;width:min(54vw,48vh,380px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:3px dashed #f3f0e6;box-shadow:0 0 0 3px #2c3a3366;pointer-events:none;opacity:.5;transition:opacity .35s,transform .35s}
#title-tile.dragging .zone{opacity:.9}
#title-tile.over .zone{transform:translate(-50%,-50%) scale(1.06);border-color:#ffe27a}
#title-tile.played .zone{opacity:0}
#title-tile .card{position:absolute;left:50%;bottom:calc(max(40px,env(safe-area-inset-bottom)) + 14px);width:min(30vw,128px);min-width:96px;aspect-ratio:5/7;margin-left:calc(min(30vw,128px) / -2);border-radius:12px;background:linear-gradient(160deg,#1c2b5e,#0e1736);border:3px solid #ffe9a8;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:0 8px 0 #0a1230,0 16px 26px #0005,inset 0 0 20px var(--tint);cursor:grab;touch-action:none;transition:transform .25s ease;outline:none;animation:tt-bob 2.2s ease-in-out infinite}
#title-tile .card .glyph{font-size:clamp(34px,9vw,52px);line-height:1}
#title-tile .card .label{font-size:13px;font-weight:700;letter-spacing:.02em}
#title-tile .card:focus-visible{box-shadow:0 0 0 4px #fff,0 8px 0 #0a1230}
#title-tile.dragging .card{animation:none;cursor:grabbing;transition:none}
#title-tile.played .card{animation:none;pointer-events:none;opacity:0;transition:opacity .5s .1s}
@keyframes tt-bob{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}
#title-tile .progress{position:absolute;left:0;right:0;bottom:max(12px,env(safe-area-inset-bottom));display:flex;justify-content:center;align-items:center;gap:10px;color:#5a3a22b0;font-size:13px;pointer-events:none}
#title-tile .progress i{display:block;width:70px;height:4px;border-radius:2px;background:#5a3a2233;overflow:hidden}
#title-tile .progress i b{display:block;height:100%;width:0;background:#e0a84a;transition:width .3s}
#title-tile .enter{position:absolute;left:50%;bottom:max(10px,env(safe-area-inset-bottom));transform:translateX(-50%);font:inherit;font-weight:700;color:#2b2118;background:#ffb23d;border:0;border-radius:12px;padding:10px 22px;box-shadow:0 4px 0 #b3711a;cursor:pointer;display:none}
#title-tile.ready .progress{display:none}#title-tile.ready .enter{display:block}
@media (prefers-reduced-motion:reduce){#title-tile .card{animation:none}}`;
const rand=(a,b)=>a+Math.random()*(b-a),ease=t=>1-(1-t)**3,clamp01=t=>Math.min(1,Math.max(0,t));
const swirl=()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=x.createImageData(256,256),col=new T.Color();
 for(let j=0;j<256;j++)for(let i=0;i<256;i++){const dx=i-128,dy=j-128,r=Math.hypot(dx,dy),h=((Math.atan2(dy,dx)*3/(2*Math.PI)+r/46)%1+1)%1;col.setHSL(h,.9,.58);const k=(j*256+i)*4;im.data[k]=col.r*255;im.data[k+1]=col.g*255;im.data[k+2]=col.b*255;im.data[k+3]=255;}
 x.putImageData(im,0,0);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.center.set(.5,.5);t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return t;};
export function createTitleTile({destination=TOWN}={}){
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const root=document.createElement('div');root.id='title-tile';
 const forced=new URLSearchParams(location.search).get('titlecard'),card0=CARDS.find(c=>c.id===forced)||CARDS[Math.floor(Math.random()*CARDS.length)]; // ?titlecard=<id> pins the card for testing
 root.innerHTML=`<div class="name">Abbie’s World</div><div class="board">Move card <b>to play area.</b></div><div class="zone"></div>
 <div class="card" role="button" tabindex="0" aria-label="${card0.name} card. Move card to play area." style="--tint:${card0.tint}55"><span class="glyph">${card0.glyph}</span><span class="label">${card0.name}</span></div>
 <div class="progress"><span class="txt">Loading shaders…</span><i><b></b></i></div><button class="enter" type="button">Enter Winchester</button>`;
 document.body.append(root);
 const $=s=>root.querySelector(s),card=$('.card'),zone=$('.zone'),txt=$('.txt'),bar=$('.progress i b'),enter=$('.enter');
 // ---- the tile
 const canvas=document.createElement('canvas');root.prepend(canvas);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,100);
 scene.add(new T.HemisphereLight('#fff4e0','#8a7a5a',1.5));const sun=new T.DirectionalLight('#fff0d0',2.2);sun.position.set(-4,8,5);scene.add(sun);
 const world=new T.Group();world.position.y=-.2;scene.add(world);
 const grassMat=new T.MeshStandardMaterial({color:'#86b24e',roughness:.9,flatShading:true}),dirtMat=new T.MeshStandardMaterial({color:'#8b6a45',roughness:1,flatShading:true});
 const tile=new T.Mesh(new T.CylinderGeometry(3,3,.5,6),[dirtMat,grassMat,dirtMat]);tile.rotation.y=Math.PI/6;tile.position.y=-.25;world.add(tile);
 const trunkMat=new T.MeshStandardMaterial({color:'#7a5230',flatShading:true}),leafMat=new T.MeshStandardMaterial({color:'#4f8a3a',flatShading:true});
 const trees=[[-1.8,-1.2],[1.9,-1.5],[-1.3,1.5]].map(([x,z],i)=>{const g=new T.Group(),h=rand(.8,1.2);const tr=new T.Mesh(new T.CylinderGeometry(.1,.14,.6*h,6),trunkMat);tr.position.y=.3*h;const lf=new T.Mesh(new T.ConeGeometry(.55,1.2*h,7),leafMat);lf.position.y=1.1*h;g.add(tr,lf);g.position.set(x,0,z);g.rotation.y=i;world.add(g);return g;});
 const woolMat=new T.MeshStandardMaterial({color:'#fffaf0',flatShading:true}),faceMat=new T.MeshStandardMaterial({color:'#4b3a30',flatShading:true});
 const sheep=[0,1,2].map(i=>{const g=new T.Group(),body=new T.Mesh(new T.IcosahedronGeometry(.34,1),woolMat),head=new T.Mesh(new T.IcosahedronGeometry(.16,0),faceMat);body.position.y=.38;head.position.set(.3,.42,0);g.add(body,head);world.add(g);return {g,a:i*2.1,r:.9+i*.45,v:.35+.1*i,flee:0};});
 const clouds=[0,1].map(i=>{const m=new T.Mesh(new T.IcosahedronGeometry(.7,1),new T.MeshStandardMaterial({color:'#fff',flatShading:true,transparent:true,opacity:.92}));m.scale.set(1.6,.6,1);m.position.set(i?-3:2.5,4.2+i*.4,-1.5);scene.add(m);return m;});
 // ---- effect pieces, all visible from the start (scale 0) so their shaders compile with the first frame
 const ball=new T.Mesh(new T.SphereGeometry(.45,16,12),new T.MeshBasicMaterial({color:card0.tint}));ball.position.y=9;scene.add(ball);
 const scorch=new T.Mesh(new T.CircleGeometry(1,24),new T.MeshBasicMaterial({color:'#2a1a10',transparent:true,opacity:.75}));scorch.rotation.x=-Math.PI/2;scorch.position.y=.012;scorch.scale.setScalar(.001);world.add(scorch);
 const pond=new T.Mesh(new T.CircleGeometry(1,28),new T.MeshStandardMaterial({color:'#4aa8ff',roughness:.2,transparent:true,opacity:.85}));pond.rotation.x=-Math.PI/2;pond.position.y=.02;pond.scale.setScalar(.001);world.add(pond);
 const ring=new T.Mesh(new T.RingGeometry(.9,1,32),new T.MeshBasicMaterial({color:'#fff',transparent:true,opacity:0,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;ring.scale.setScalar(.001);world.add(ring);
 const splats=Array.from({length:14},(_,i)=>{const m=new T.Mesh(new T.CircleGeometry(1,16),new T.MeshBasicMaterial({color:new T.Color().setHSL(Math.random(),.85,.6)}));m.rotation.x=-Math.PI/2;m.position.y=.03+i*.001;m.scale.setScalar(.001);world.add(m);const b=new T.Mesh(new T.SphereGeometry(.16,10,8),m.material);b.position.y=9;scene.add(b);return {m,b,x:rand(-2,2),z:rand(-1.8,1.8),t0:i*.18+rand(0,.2),r:rand(.35,.7)};});
 const N=70,pPos=new Float32Array(N*3),pVel=new Float32Array(N*3),pLife=new Float32Array(N);const pGeo=new T.BufferGeometry();pGeo.setAttribute('position',new T.BufferAttribute(pPos,3));
 const dot=(()=>{const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');x.fillStyle='#fff';x.beginPath();x.arc(16,16,15,0,7);x.fill();return new T.CanvasTexture(c);})();
 const pMat=new T.PointsMaterial({map:dot,alphaTest:.3,color:card0.id==='waterball'?'#bfe4ff':'#ffb040',size:.14,transparent:true,opacity:.95,depthWrite:false});const pts=new T.Points(pGeo,pMat);pts.frustumCulled=false;world.add(pts);for(let i=0;i<N;i++)pPos[i*3+1]=-50;
 const flash=new T.PointLight('#ff9a50',0,9);flash.position.set(0,1.2,0);world.add(flash);
 const swirlTex=card0.id==='tie-dye'?swirl():null;
 const emit=(n,speed,up,spread)=>{for(let k=0,j=0;k<n&&j<N*3;j++){const i=(Math.random()*N)|0;if(pLife[i]>0)continue;pPos.set([rand(-spread,spread),.15,rand(-spread,spread)],i*3);pVel.set([rand(-1,1)*speed,rand(.4,1)*up,rand(-1,1)*speed],i*3);pLife[i]=rand(.7,1.4);k++;}};
 const resize=()=>{const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;const portrait=h>w;camera.fov=portrait?62:36;camera.position.set(0,portrait?8:6.2,portrait?10.6:8.6);camera.lookAt(0,portrait?-.2:.1,0);camera.updateProjectionMatrix();};
 resize();addEventListener('resize',resize);
 renderer.compileAsync?.(scene,camera).catch(()=>{});
 // ---- playing the card: power only starts at drop
 let played=false,t0=0;const clock=new T.Clock();
 const play=()=>{if(played)return;played=true;root.classList.add('played');root.classList.remove('dragging','over');t0=clock.elapsedTime;card.removeAttribute('tabindex');card.setAttribute('aria-hidden','true');window.dispatchEvent(new CustomEvent('aw-title-card-played',{detail:{effect:card0.id}}));};
 const inZone=(x,y)=>{const r=zone.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;return Math.hypot(x-cx,y-cy)<r.width/2*1.05;};
 let drag=null;
 card.addEventListener('pointerdown',e=>{if(played)return;card.setPointerCapture(e.pointerId);const r=card.getBoundingClientRect();drag={dx:e.clientX-(r.left+r.width/2),dy:e.clientY-(r.top+r.height/2)};root.classList.add('dragging');e.preventDefault();});
 card.addEventListener('pointermove',e=>{if(!drag)return;const r0=card.offsetLeft+card.offsetWidth/2,b0=card.offsetTop+card.offsetHeight/2;card.style.transform=`translate(${e.clientX-drag.dx-r0}px,${e.clientY-drag.dy-b0}px) rotate(${Math.max(-12,Math.min(12,(e.clientX-drag.dx-r0)/18))}deg) scale(1.08)`;root.classList.toggle('over',inZone(e.clientX,e.clientY));});
 const release=e=>{if(!drag)return;drag=null;if(inZone(e.clientX,e.clientY))play();else{root.classList.remove('dragging','over');card.style.transform='';}};
 card.addEventListener('pointerup',release);card.addEventListener('pointercancel',()=>{drag=null;root.classList.remove('dragging','over');card.style.transform='';});
 card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();play();}});
 // ---- the loop
 let raf=0,gone=false;
 const frame=()=>{if(gone)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,clock.getDelta()),now=clock.elapsedTime,e=played?now-t0:-1;
  clouds.forEach((c,i)=>{c.position.x+=dt*(.15+i*.05);if(c.position.x>5)c.position.x=-5;});
  trees.forEach((g,i)=>{g.rotation.z=Math.sin(now*1.1+i)*.02;});
  const fleeing=played&&(card0.id==='fireball'||card0.id==='waterball')&&e>.6;
  sheep.forEach(s=>{s.flee+=((fleeing?1:0)-s.flee)*dt*3;s.a+=dt*s.v;const r=s.r+s.flee*1.3,x=Math.cos(s.a)*r,z=Math.sin(s.a)*r*.8;s.g.position.set(x,Math.abs(Math.sin(now*3+s.a*3))*.05*(1+s.flee*2),z);s.g.rotation.y=-s.a+Math.PI;});
  if(played){const id=card0.id;
   if(id==='fireball'||id==='waterball'){const fall=clamp01(e/.6);ball.position.set(0,fall<1?9-8.5*ease(fall)**1.4:-50,0);ball.scale.setScalar(fall<1?1:.001);
    if(e>=.6){const k=e-.6;flash.intensity=id==='fireball'?Math.max(0,5*Math.exp(-k*2.2)):0;
     if(id==='fireball'){scorch.scale.setScalar(.2+1.25*ease(clamp01(k/.5)));if(k<7)emit(2,.5,2.4,.5+.6*clamp01(k));}
     else{pond.scale.setScalar(.2+1.55*ease(clamp01(k/.9)));ring.material.opacity=.7*(1-clamp01(k/1.1));ring.scale.setScalar(.4+3*ease(clamp01(k/1.1)));if(k<.5)emit(6,1.6,3,.2);}}}
   else if(id==='tie-dye'){const k=clamp01(e/1.4);grassMat.map=swirlTex;grassMat.color.set('#fff');grassMat.needsUpdate=!grassMat.userData.m;grassMat.userData.m=true;swirlTex.rotation=now*.5;leafMat.color.setHSL((now*.2)%1,.75,.55);
    ring.material.color.setHSL((now*.5)%1,.9,.6);ring.material.opacity=.8*(1-k);ring.scale.setScalar(.3+3.2*ease(k));}
   else if(id==='paint-rain'){splats.forEach(s=>{const k=e-s.t0;if(k<0)return;const f=clamp01(k/.45);s.b.position.set(s.x,f<1?9-8.7*f*f:-50,s.z);if(f>=1)s.m.scale.setScalar(s.r*ease(clamp01((k-.45)/.25)));s.m.position.x=s.x;s.m.position.z=s.z;});}}
  for(let i=0;i<N;i++){if(pLife[i]<=0){pPos[i*3+1]=-50;continue;}pLife[i]-=dt;pVel[i*3+1]-=(card0.id==='waterball'?5:-.4)*dt;pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;if(pPos[i*3+1]<0&&card0.id==='waterball')pLife[i]=0;}
  pGeo.attributes.position.needsUpdate=true;
  world.rotation.y=Math.sin(now*.25)*.12;renderer.render(scene,camera);};
 frame();
 // ---- leaving
 const close=()=>{if(gone)return;root.classList.add('leaving');setTimeout(()=>{gone=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);renderer.dispose();root.remove();style.remove();},750);};
 enter.onclick=()=>{if(destination)location.assign(destination);else close();};
 addEventListener('keydown',function esc(e){if(e.key==='Escape'&&root.classList.contains('ready')){removeEventListener('keydown',esc);close();}});
 return {
  step(n,total){const k=Math.min(1,n/Math.max(1,total));bar.style.width=Math.round(k*100)+'%';txt.textContent='Loading shaders…';},
  finish(ok){bar.style.width='100%';root.classList.add('ready');enter.hidden=false;},
  card:card0.id,
 };
}
