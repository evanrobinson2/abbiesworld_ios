// The opening: black, then Abbie's backpack charms circling under a spotlight, with a second light on the backpack
// (Evan, 2026-10-23 23:00Z: "it is just those back pack charms circling .. black screen highlighting those with spotlight,
// and another light on the back pack. then once the shaders are loaded the charms fold into the back pack and then the
// scene lights shut off, then fade into abbie's world"). No words and no loading bar: the charms circling is the wait.
// The charm models and the backpack are the real ones from backpack.mjs.
//   const intro = createCharmIntro();  await intro.finish();   // resolves once the lights are off and the overlay has faded
import {CHARMS, look, buildBackpack, loadCharmModels, charmModel, three} from './backpack.mjs';
const STYLE=`#charm-intro{position:fixed;inset:0;z-index:2147483000;background:#000;transition:opacity .8s ease}
#charm-intro.leaving{opacity:0;pointer-events:none}#charm-intro canvas{position:absolute;inset:0;width:100%;height:100%;display:block}`;
const clamp01=t=>Math.min(1,Math.max(0,t)),ease=t=>t*t*(3-2*t),easeOut=t=>1-(1-t)**3;
const MIN_SHOW=3200; // the charms circle at least this long, so a fast load still reads as an opening
export function createCharmIntro({slow=1,manual=false}={}){ // tests: slow<1 stretches time; manual advances only by intro.advance(seconds)
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const root=document.createElement('div');root.id='charm-intro';root.setAttribute('aria-hidden','true');document.body.append(root);
 const canvas=document.createElement('canvas');root.append(canvas);
 let done,gone=false,raf=0;const finished=new Promise(r=>done=r);
 const born=performance.now();let wantFinish=false,fold=-1,lightsOff=-1;
 const state={ok:true};let pending=0;const pendingRef={};
 (async()=>{
  const T=await three();
  const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setClearColor('#000');renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,60);
  scene.add(new T.AmbientLight('#ffffff',.04));
  // one warm spotlight from above on the ring of charms, one cool light on the backpack, both with a faint shaft in the dark
  const ringLight=new T.SpotLight('#ffe2b0',0,16,.62,.55,1.2);ringLight.position.set(0,7.5,1.2);ringLight.target.position.set(0,1.4,0);scene.add(ringLight,ringLight.target);
  const bagLight=new T.SpotLight('#cfe6ff',0,14,.34,.5,1.2);bagLight.position.set(-3.2,4.2,5.4);bagLight.target.position.set(0,1.1,0);scene.add(bagLight,bagLight.target);
  const shaft=(light,color,r)=>{const len=light.position.distanceTo(light.target.position),m=new T.Mesh(new T.ConeGeometry(r,len,32,1,true),new T.MeshBasicMaterial({color,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));
   m.position.copy(light.position).lerp(light.target.position,.5);m.lookAt(light.target.position);m.rotateX(Math.PI/2);m.rotateX(Math.PI);scene.add(m);return m;};
  const ringShaft=shaft(ringLight,'#ffd9a0',3),bagShaft=shaft(bagLight,'#bcd8ff',1.7);
  const floor=new T.Mesh(new T.CircleGeometry(3.4,48),new T.MeshStandardMaterial({color:'#1a1512',roughness:.9}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  const bp=buildBackpack(look(),{charms:[]}),scale=2.4/bp.H;bp.group.scale.setScalar(scale);bp.group.position.set(0,0,0);scene.add(bp.group);
  const ids=CHARMS.map(c=>c.id);await loadCharmModels(ids);
  const charms=[];
  for(const id of ids){try{const m=await charmModel(id);if(!m)continue;const box=new T.Box3().setFromObject(m),size=box.getSize(new T.Vector3()),k=.95/Math.max(size.x,size.y,size.z,1e-3),holder=new T.Group();m.scale.multiplyScalar(k);const c=new T.Box3().setFromObject(m).getCenter(new T.Vector3());m.position.sub(c);holder.add(m);scene.add(holder);charms.push({holder,a:charms.length});}catch{}}
  charms.forEach((c,i)=>{c.a=i/charms.length*Math.PI*2;c.bob=Math.random()*6;});
  const R=3.1,CY=1.7,pocket=new T.Vector3(0,2.5*.62,.18+bp.half*scale);
  const resize=()=>{const w=innerWidth,h=innerHeight,portrait=h>w;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=portrait?52:34;camera.position.set(0,portrait?2.3:1.9,portrait?10.6:8.4);camera.lookAt(0,1.25,0);camera.updateProjectionMatrix();};
  resize();addEventListener('resize',resize);
  renderer.compileAsync?.(scene,camera).catch(()=>{});
  const clock=new T.Clock();let simTime=0,spin=0,foldStart=0,offStart=0,booted=0;pendingRef.add=x=>{pending+=x;};
  const frame=()=>{if(gone)return;raf=requestAnimationFrame(frame);let dt=Math.min(.05,clock.getDelta())*slow;if(manual){dt=Math.min(.05,pending);pending-=dt;}simTime+=dt;const now=simTime;booted=Math.min(1,booted+dt/1.6);
   const lit=ease(booted),off=lightsOff<0?1:1-clamp01((now-offStart)/.7);
   ringLight.intensity=90*lit*off;bagLight.intensity=70*lit*off;ringShaft.material.opacity=.035*lit*off;bagShaft.material.opacity=.04*lit*off;
   if(wantFinish&&fold<0&&simTime*1000>MIN_SHOW){fold=0;foldStart=now;}
   spin+=dt*(fold<0?.5:.5+2.5*clamp01((now-foldStart)/1.2));
   bp.group.rotation.y=Math.sin(now*.4)*.35;
   const t=fold<0?0:(now-foldStart);
   charms.forEach((c,i)=>{const own=clamp01((t-i*.09)/1.1),k=ease(own),a=c.a+spin,x=Math.cos(a)*R,z=Math.sin(a)*R*.55,y=CY+Math.sin(now*1.3+c.bob)*.12;
    // the fold: each charm swings in along an arc over the backpack's top pocket and shrinks into it
    const px=x*(1-k)+pocket.x*k,pz=z*(1-k)+pocket.z*k,py=y*(1-k)+pocket.y*k+Math.sin(k*Math.PI)*.9;
    c.holder.position.set(px,py,pz);c.holder.rotation.set(now*.4+i,now*.9+i*.6,k*2.4);const s=1-.82*easeOut(own);c.holder.scale.setScalar(s);c.holder.visible=own<1;});
   if(fold>=0&&lightsOff<0&&t>charms.length*.09+1.3){lightsOff=1;offStart=now;bp.group.scale.setScalar(scale*1.06);}
   if(lightsOff>0&&bp.group.scale.x>scale)bp.group.scale.setScalar(Math.max(scale,bp.group.scale.x-dt*.2));
   if(lightsOff>0&&now-offStart>.85&&!state.closing){state.closing=true;root.classList.add('leaving');setTimeout(()=>{gone=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);renderer.dispose();root.remove();style.remove();done();},850);}
   bp.update?.(dt);renderer.render(scene,camera);};
  frame();
 })().catch(e=>{console.warn('charm intro',e);state.ok=false;root.classList.add('leaving');setTimeout(()=>{gone=true;root.remove();style.remove();done();},800);});
 return {
  advance(sec){pendingRef.add?.(sec);},
  step(){}, // no progress is shown; the charms circling is the wait
  finish(ok){wantFinish=true;return finished;},
  get done(){return finished;},
 };
}
