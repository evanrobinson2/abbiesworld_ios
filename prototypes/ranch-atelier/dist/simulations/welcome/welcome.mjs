// Welcome to Abbie's World (AW-STUDY-0022, studies/welcome). A tour guide asks a new player how they want to start:
//   none    just play
//   simple  play, with a few chalk notes beside the real controls
//   tour    the grand tour: the world builds itself, a narrated thirty-second camera tour of the live simulation, then the
//           last shot eases into real play and the chalk notes follow. It doubles as the product tour (toy box > Welcome tour).
// The tour is a list of stops (tour-stops.mjs) so every new feature can opt in. Everything here is presentation layer:
// the guide, captions and chalk are drawn for the player and invisible to every perception; only the world build is fiction.
// ?welcome=guide shows the guide again, ?welcome=tour|simple|none runs that choice (for previews and checks).
import {tourStops,tourHints,findIn} from './tour-stops.mjs?v=2';
import {chalkNote} from './chalk.mjs?v=1';

const KEY='aw-welcome',root=document.documentElement;
const store={get(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}},set(v){try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const until=async(test,ms=30000,step=120)=>{const end=performance.now()+ms;while(performance.now()<end){try{if(test())return true;}catch{}await sleep(step);}return false;};
const make=(tag,props={},html='')=>{const el=document.createElement(tag);Object.assign(el,props);if(html)el.innerHTML=html;return el;};
const css=make('link',{rel:'stylesheet',href:'welcome/welcome.css?v=1'});document.head.append(css);

const params=new URLSearchParams(location.search),forced=params.get('welcome');
const pace=Math.min(10,Math.max(1,Number(params.get('pace'))||1)); // ?pace=4 slows every shot, for frame captures on slow machines
window.AbbiesWelcome={open:()=>guide({fresh:false}),tour:()=>runTour({fresh:false}),hints:()=>runHints(true),reset:()=>{try{localStorage.removeItem(KEY);}catch{}}};
if(root.classList.contains('ui-v2'))boot();

async function boot(){
 // Wait for a finished world, and for anything else that greets the player first (sign-in door, a what's-new card).
 if(!await until(()=>window.RanchCamera?.ready?.(),90000))return;
 await until(()=>!document.querySelector('dialog[open],.afb-card'),60000,400);await sleep(600);
 const record=store.get();
 if(forced==='tour'||forced==='simple'||forced==='none')return choose(forced,{fresh:!record});
 if(forced==='guide'||!record)return guide({fresh:!record});
 if(record.mode!=='none')runHints(false);
}

// The tour guide: one question, three answers. The only words on screen before the world is yours.
const ICON={tour:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4z"/><path d="m17 11 4-2.5v7L17 13"/><path d="M7 3.5 9 7M12 3.5 14 7"/></svg>',
 simple:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c3-1 4-4 7-9s5-6 7-6"/><path d="m15.5 4 3.8.2.2 3.8"/><path d="M4 21h6"/></svg>',
 none:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'};
function guide({fresh}){
 document.querySelector('.aw-guide')?.remove();
 const card=make('section',{className:'aw-welcome aw-guide v2-glass'},`<div class="aw-guide-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M24 5l4.2 11.1L39.5 20l-11.3 3.9L24 35l-4.2-11.1L8.5 20l11.3-3.9z"/><path d="M38 31l1.6 4.2 4.2 1.6-4.2 1.6L38 42.6l-1.6-4.2-4.2-1.6 4.2-1.6z"/></svg></div>
  <h2>Welcome to Abbie’s World!</h2><p>How would you like to start?</p>
  <div class="aw-choices">
   <button type="button" data-mode="tour" class="aw-choice aw-choice-hero">${ICON.tour}<b>The grand tour</b><small>We build a world and show you around</small></button>
   <button type="button" data-mode="simple" class="aw-choice">${ICON.simple}<b>Show me the basics</b><small>A few chalk tips while I play</small></button>
   <button type="button" data-mode="none" class="aw-choice">${ICON.none}<b>Just let me play</b><small>No tips</small></button>
  </div>`);
 card.setAttribute('role','dialog');card.setAttribute('aria-label','Welcome to Abbie’s World');
 card.addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(!b)return;unlockVoice();card.classList.add('leaving');setTimeout(()=>card.remove(),380);choose(b.dataset.mode,{fresh});});
 document.body.append(card);card.querySelector('.aw-choice-hero').focus({preventScroll:true});
}
function choose(mode,{fresh}){
 const record={...(store.get()||{}),mode,at:new Date().toISOString()};store.set(record);
 if(mode==='tour')runTour({fresh});else if(mode==='simple')runHints(true);
}

// Narration: voice/<id>.mp3 when rendered (tools/welcome-narration), the browser's own voice otherwise.
let audio=null,voiced=null;
function unlockVoice(){
 try{audio=audio||new Audio();audio.src='welcome/voice/silence.mp3';audio.play().catch(()=>{});}catch{}
 try{speechSynthesis?.speak(Object.assign(new SpeechSynthesisUtterance(''),{volume:0}));}catch{}
}
async function voiceManifest(){if(voiced)return voiced;try{const r=await fetch('welcome/voice/manifest.json',{cache:'no-cache'});voiced=r.ok?(await r.json()).lines||{}:{};}catch{voiced={};}return voiced;}
function say(stop,muted){
 if(muted())return Promise.resolve();
 const file=voiced?.[stop.id];
 if(file&&audio){audio.src='welcome/voice/'+file;return new Promise(res=>{const done=()=>{audio.onended=audio.onerror=null;res();};audio.onended=done;audio.onerror=done;audio.play().catch(done);});}
 try{
  if(!('speechSynthesis' in window))return Promise.resolve();
  const u=new SpeechSynthesisUtterance(stop.line),voices=speechSynthesis.getVoices();
  u.voice=voices.find(v=>/Samantha|Google UK English Female|Serena|Moira|Karen|Aria|Jenny/i.test(v.name))||voices.find(v=>/^en/i.test(v.lang))||null;u.rate=.98;u.pitch=1.06;
  return new Promise(res=>{u.onend=u.onerror=res;speechSynthesis.cancel();speechSynthesis.speak(u);setTimeout(res,9000);});
 }catch{return Promise.resolve();}
}

// The director: owns the camera for the length of the tour, one shot per stop, hard cuts like a commercial.
async function runTour({fresh}){
 const R=window.RanchCamera;if(!R||root.classList.contains('aw-tour'))return;
 const {T,camera,orbit}=R;
 await voiceManifest();
 let stage=R.canvas;while(stage&&stage.parentElement!==document.body)stage=stage.parentElement;stage?.classList.add('aw-stage');
 root.classList.add('aw-tour');R.stopFollow?.();const orbitWas=orbit.enabled;orbit.enabled=false;
 const caption=make('div',{className:'aw-welcome aw-caption'});caption.setAttribute('aria-live','polite');
 const skip=make('button',{className:'aw-welcome aw-skip v2-glass',type:'button'},'Skip');
 const mute=make('button',{className:'aw-welcome aw-mute v2-glass',type:'button',title:'Narrator on or off'},'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path class="aw-wave" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>');
 mute.setAttribute('aria-label','Narrator on or off');
 let cancelled=false,muted=false;
 skip.onclick=()=>{cancelled=true;try{audio?.pause();speechSynthesis?.cancel();}catch{}};
 mute.onclick=()=>{muted=!muted;mute.classList.toggle('off',muted);try{if(muted){audio?.pause();speechSynthesis?.cancel();}}catch{}};
 document.body.append(caption,skip,mute);

 const v=(x,y,z)=>new T.Vector3(x,y,z),pos=v(),tgt=v(),tmp=v();
 let shot=null,shotStart=0;
 // Measured when the world is still (pieces flying in during an arrival would make it look huge), then held.
 const measure=()=>{const box=R.bounds?.()||new T.Box3().setFromObject(R.world()||R.scene);const c=box.getCenter(v()),s=box.getSize(v());return {c,r:Math.max(4,Math.hypot(s.x,s.z)/2),top:box.max.y};};
 let frame=measure();const bounds=()=>frame;
 const place=(center,dist,az,el)=>{pos.set(center.x+Math.sin(az)*Math.cos(el)*dist,center.y+Math.sin(el)*dist,center.z+Math.cos(az)*Math.cos(el)*dist);tgt.copy(center);};
 const ease=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
 let raf=0;const loop=now=>{raf=requestAnimationFrame(loop);if(!shot)return;const t=Math.min(1,(now-shotStart)/(shot.ms||1));shot.pose(t,now);camera.position.copy(pos);orbit.target.copy(tgt);camera.lookAt(tgt);orbit.update?.();};
 raf=requestAnimationFrame(loop);
 const cut=(pose,ms)=>{shot={pose,ms};shotStart=performance.now();};

 // Each shot is a pose over time t in 0..1, measured on the world as it is now.
 const sizeOf=o=>{const s=new T.Box3().setFromObject(o).getSize(v());return Math.max(.08,s.x,s.y,s.z);};
 const shots={
  // While the world is made, the camera waits high above it (the play camera won't look up past the horizon).
  sky:()=>{const b=bounds();return t=>place(b.c,b.r*(7-t*.3),.48+t*.04,1.32);},
  crane:()=>{const b=bounds(),az=.52;return t=>{const k=ease(t);place(b.c,b.r*(6.7-4.6*k),az+k*.3,1.32-.72*k);};},
  push:o=>{const p=o.getWorldPosition(v()),d=Math.max(sizeOf(o)*7,bounds().r*.12),az=Math.random()*6.28;return t=>{const k=ease(t);place(p,d*(1.9-.8*k),az+k*.35,.42-.1*k);};},
  follow:o=>{const d=Math.max(sizeOf(o)*6,.9),az=Math.random()*6.28;return t=>{o.getWorldPosition(tmp);place(tmp,d*(1.25-.25*t),az+t*.6,.3);};},
  orbit:o=>{const p=o.getWorldPosition(v()),d=bounds().r*.4,az=Math.random()*6.28;return t=>place(p,d,az+t*.7,.5);},
  timelapse:()=>{const b=bounds(),az=2.3,from=R.hour?.()??8,to=from<16.5?17.6:from+1.5;return t=>{place(b.c,b.r*1.35,az+t*.3,.42);if(R.hour)R.hour(from+(to-from)*ease(t));};},
  hero:()=>{const b=bounds(),az=.9;return t=>{const k=ease(t);place(b.c,b.r*(1.05+1.3*k),az+k*.5,.32+k*.22);};},
 };

 const ctx={fresh,
  rebuild:async shape=>{const before=R.world();await window.RanchActions?.run('sandboxApp.shape',{shape});await until(()=>R.world()!==before&&R.ready(),45000);frame=measure();},
  arrive:(effect,duration)=>R.arrive?.(effect,duration)};
 try{
  for(const stop of tourStops(ctx)){
   if(cancelled)break;
   if(stop.shot==='crane'&&stop.run){cut(shots.sky(),1e9);try{await stop.run(ctx);}catch(e){console.warn('[welcome] build skipped',e.message);}if(cancelled)break;}
   let pose=null,ms=stop.seconds*1000*pace;
   if(stop.shot==='card'){frame=measure();pose=await cardShot(R,T,shots,bounds,place);frame=measure();if(!pose)continue;}
   else{const subject=stop.find?.(R.world());if(!subject)continue;pose=shots[stop.shot]?.(subject.isObject3D?subject:R.world());if(!pose)continue;}
   if(stop.shot==='card')root.classList.add('aw-tour-cards');
   cut(pose,ms);caption.innerHTML='';caption.append(make('span',{textContent:stop.title}));caption.classList.remove('in');void caption.offsetWidth;caption.classList.add('in');
   const t0=performance.now();await say(stop,()=>muted||cancelled);
   const left=ms-(performance.now()-t0);if(left>0)await until(()=>cancelled,left,80);
   root.classList.remove('aw-tour-cards');
  }
 }catch(e){console.warn('[welcome] tour stopped',e);}
 // The last shot eases into real play: the camera settles where play frames the world, then the toys come back.
 caption.classList.remove('in');
 const from={p:camera.position.clone(),t:orbit.target.clone()};R.fit?.();const to={p:camera.position.clone(),t:orbit.target.clone()};
 cut(t=>{const k=ease(t);pos.lerpVectors(from.p,to.p,k);tgt.lerpVectors(from.t,to.t,k);},cancelled?500:1800);
 await sleep(cancelled?500:1800);cancelAnimationFrame(raf);shot=null;
 orbit.enabled=orbitWas;root.classList.remove('aw-tour','aw-tour-cards');
 for(const n of [caption,skip,mute])n.classList.add('leaving');setTimeout(()=>{caption.remove();skip.remove();mute.remove();},600);
 try{audio?.pause();speechSynthesis?.cancel();}catch{}
 const record=store.get()||{};store.set({...record,mode:'tour',toured:new Date().toISOString()});
 await sleep(1400);runHints(true);
}

// The card stop: the hand comes up, a garden card is printed and dropped on a free hex, and the camera watches it land.
async function cardShot(R,T,shots,bounds,place){
 try{
  const A=window.RanchActions;if(!A)return null;
  await A.run('sandboxGenerators.select',{generatorId:'garden'});
  if(!await until(()=>A.read('sandboxGenerators')?.ready,7000))return null;
  const cells=A.read('sandboxGenerators').availableCells||[];if(!cells.length)return null;
  const before=new Set(R.scene.children),b=bounds(),c=cells[Math.floor(cells.length/2)];
  await A.run('sandboxGenerators.place',{q:c.q,r:c.r});
  const added=R.scene.children.filter(o=>!before.has(o)&&o.type==='Group');
  const box=new T.Box3();for(const o of added)box.expandByObject(o);
  const centre=box.isEmpty()?b.c:box.getCenter(new T.Vector3()),az=Math.atan2(centre.x-b.c.x,centre.z-b.c.z)||.6;
  return t=>place(centre,b.r*(.75+.15*t),az+.4+t*.25,.55);
 }catch(e){console.warn('[welcome] card stop skipped',e.message);return null;}
}

// Chalk hints in real play: one at a time, beside the real thing, gone when you do it or after a little while.
let hinting=false;
async function runHints(fromStart){
 if(hinting)return;hinting=true;
 const record=store.get()||{},done=new Set(record.hints||[]);if(fromStart&&record.mode==='tour'&&!record.toured)done.clear();
 const report={dragged:false,inspected:false,taps:[],tapped:sel=>report.taps.some(n=>n.closest?.(sel))};
 let down=null;
 const onDown=e=>{down=[e.clientX,e.clientY];report.taps.push(e.target);},onMove=e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>40&&e.target?.tagName==='CANVAS')report.dragged=true;},onUp=()=>{down=null;};
 const onWheel=()=>{report.dragged=true;},onInspect=()=>{report.inspected=true;};
 addEventListener('pointerdown',onDown,true);addEventListener('pointermove',onMove,true);addEventListener('pointerup',onUp,true);addEventListener('wheel',onWheel,{passive:true});addEventListener('ranch:inspect',onInspect);
 const R=window.RanchCamera,proj=new (R?.T?.Vector3||Object)();
 try{
  for(const hint of tourHints()){
   if(done.has(hint.id))continue;
   while(root.classList.contains('aw-tour')||document.querySelector('.aw-guide,dialog[open],.afb-card'))await sleep(500);
   report.taps.length=0;
   let at=null,subject=null;
   if(hint.world){subject=hint.world(R?.world());if(!subject)continue;}
   const where=()=>{if(subject){subject.getWorldPosition(proj);proj.project(R.camera);if(proj.z>1)return null;return {x:(proj.x+1)/2*innerWidth,y:(1-proj.y)/2*innerHeight};}
    const a=hint.anchor?.();if(!a)return null;if(a.getBoundingClientRect){const r=a.getBoundingClientRect();if(!r.width)return null;return {x:r.left+r.width/2,y:r.top+r.height/2,size:Math.max(r.width,r.height)/2};}return a;};
   at=where();if(!at)continue;
   const note=chalkNote({kind:hint.doodle,text:hint.text,at,size:at.size||40});
   const t0=performance.now();
   await until(()=>{if(subject){const p=where();if(p)note.move(p.x,p.y);}return hint.done?.(report)||performance.now()-t0>11000;},12000,50);
   const finished=hint.done?.(report);note.erase();
   if(finished)done.add(hint.id);store.set({...(store.get()||{}),hints:[...done]});
   await sleep(finished?1600:2600);
  }
  // Notes that ran out of time once come back one more time next visit, then never again.
  const r=store.get()||{};r.hintVisits=(r.hintVisits||0)+1;if(r.hintVisits>=2)r.hints=tourHints().map(h=>h.id);store.set(r);
 }finally{
  removeEventListener('pointerdown',onDown,true);removeEventListener('pointermove',onMove,true);removeEventListener('pointerup',onUp,true);removeEventListener('wheel',onWheel);removeEventListener('ranch:inspect',onInspect);hinting=false;
 }
}
export {guide,runTour,runHints,findIn};
