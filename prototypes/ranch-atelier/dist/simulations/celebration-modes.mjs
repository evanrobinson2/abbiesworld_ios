// Persistent, independently switchable celebrations. No full-screen overlay.
const PARTY = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="#ff70bf"/><path d="M24 24c-9-12 16-17 15-2S9 43 8 24 33 1 39 14" fill="none" stroke="#95f06b" stroke-width="7"/><path d="M24 24c7 6-6 12-10 3S19 9 30 14" fill="none" stroke="#9363ff" stroke-width="5"/></svg>';
const DISCO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 0v6" stroke="#737a92" stroke-width="3"/><circle cx="24" cy="26" r="19" fill="#cde9ff" stroke="#7278a5" stroke-width="2"/><path d="M7 18h34M5 27h38M9 36h30M24 7v38M15 10q-6 16 0 31M33 10q6 16 0 31" fill="none" stroke="#9298c9" stroke-width="2"/><path d="M35 8v12M29 14h12" stroke="#fff" stroke-width="3"/></svg>';
export function createCelebrationModes({T, scene, camera, orbit, canvas, heightAt=()=>0}) {
 const state={party:false,disco:false}, buttons={};
 let root=null, raf=0, start=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(!document.getElementById('aw-celebrations-css'))document.head.append(Object.assign(document.createElement('style'),{id:'aw-celebrations-css',textContent:`
 .aw-celebration{width:48px;height:48px;padding:3px;border:0;border-radius:50%;background:none;cursor:pointer;flex:none}
 .aw-celebration svg{width:100%;height:100%}.aw-celebration[aria-pressed=true]{box-shadow:0 0 0 3px #fff,0 0 12px #d55cff}
 .aw-celebration:focus-visible{outline:3px solid #8b5cf6}
 canvas.aw-party{animation:aw-party-colours 12s linear infinite!important;filter:saturate(1.9)}
 @keyframes aw-party-colours{from{filter:hue-rotate(0deg) saturate(1.9)}to{filter:hue-rotate(360deg) saturate(1.9)}}
 @media(prefers-reduced-motion:reduce){canvas.aw-party{animation:none!important;filter:hue-rotate(45deg) saturate(1.5)!important}}` }));
 function clearDisco(){cancelAnimationFrame(raf);raf=0;if(!root)return;scene.remove(root);root.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [o.material].flat())m.dispose();});root=null;}
 function disco(){
  root=new T.Group();root.name='disco-celebration';root.userData.worldEffect=true;
  const size=Math.max(1,camera.position.distanceTo(orbit.target)*.045);
  root.position.copy(orbit.target);const ground=heightAt(root.position.x,root.position.z);root.position.y=Number.isFinite(ground)?ground:orbit.target.y;
  const mirror=new T.SphereGeometry(size*.38,16,10).toNonIndexed(),colours=[];
  for(let i=0;i<mirror.attributes.position.count;i++){const tile=Math.floor(i/6),shade=[.96,.58,.82,.68][(tile*7+Math.floor(tile/16))%4];colours.push(shade,Math.min(1,shade+.05),Math.min(1,shade+.12));}
  mirror.setAttribute('color',new T.Float32BufferAttribute(colours,3));
  const ball=new T.Mesh(mirror,new T.MeshStandardMaterial({vertexColors:true,metalness:.45,roughness:.18,flatShading:true,emissive:0x667788,emissiveIntensity:.25}));
  ball.position.y=size*4;root.add(ball);
  const dots=[];
  for(let i=0;i<24;i++){
   const dot=new T.Mesh(new T.CircleGeometry(size*.15,12),new T.MeshBasicMaterial({color:new T.Color().setHSL(i/24,.85,.65),transparent:true,opacity:.65,depthWrite:false,side:T.DoubleSide}));
   dot.rotation.x=-Math.PI/2;root.add(dot);dots.push(dot);
  }
  scene.add(root);start=performance.now();
  function frame(now){if(!root)return;const t=reduced.matches?0:(now-start)/1000;ball.rotation.y=t*.45;
   dots.forEach((dot,i)=>{const a=i/24*Math.PI*2+t*.28,r=size*(1.2+(i%4)*.65);dot.position.x=Math.cos(a)*r;dot.position.z=Math.sin(a)*r;
    const h=heightAt(root.position.x+dot.position.x,root.position.z+dot.position.z);dot.visible=Number.isFinite(h);dot.position.y=(dot.visible?h:root.position.y)-root.position.y+.08;});
   raf=requestAnimationFrame(frame);
  }raf=requestAnimationFrame(frame);
 }
 function set(id,on){if(!(id in state)||state[id]===!!on)return;state[id]=!!on;buttons[id]?.setAttribute('aria-pressed',String(state[id]));
  if(id==='party')canvas.classList.toggle('aw-party',state.party);else{clearDisco();if(state.disco)disco();}
 }
 return {buttons,set,isOn:id=>!!state[id],mount(host){for(const id of ['party','disco']){if(buttons[id])continue;const b=document.createElement('button');b.type='button';b.className='aw-celebration';b.dataset.mode=id;b.dataset.layer='presentation';b.title=id.toUpperCase();b.setAttribute('aria-label',id.toUpperCase());b.setAttribute('aria-pressed',String(state[id]));b.innerHTML=id==='party'?PARTY:DISCO;b.addEventListener('pointerdown',e=>e.stopPropagation());b.onclick=()=>set(id,!state[id]);host.append(b);buttons[id]=b;}},
  dispose(){set('party',false);set('disco',false);clearDisco();Object.values(buttons).forEach(b=>b.remove());}};
}
