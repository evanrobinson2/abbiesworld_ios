import {planStory,createStorySession} from './story-session.mjs';
// The storybook: a child talks (or a parent types) a story into a book that springs out from the
// table edge. The book reads every line aloud, so a child who can't read can follow along.
const FACE={human:{child:'🧒',adult:'🧑',elder:'🧓',any:'🙂'},horse:'🐴',cow:'🐮',goat:'🐐',chicken:'🐔'};
const ACTION_GLYPH={visit:'👀',feed:'🥕',groom:'🪮',play:'🤸',garden:'🌱','collect-eggs':'🥚','pick-apples':'🍎',rest:'🪑',celebrate:'🎉',shelter:'🏠',explore:'🧭'};
const face=c=>c.kind==='animal'?FACE[c.species]:FACE.human[c.age]||FACE.human.any;
const BOOK_SVG=`<svg viewBox="0 0 86 92" aria-hidden="true"><rect x="10" y="6" width="70" height="80" rx="9" fill="#7e2c1d"/><rect x="14" y="4" width="66" height="80" rx="8" fill="#b5462f"/><rect x="14" y="4" width="12" height="80" rx="6" fill="#933522"/><rect x="74" y="10" width="7" height="68" rx="3" fill="#fbf2d9"/><path d="M50 22l5.6 11.4 12.6 1.8-9.1 8.9 2.1 12.5L50 50.7l-11.2 5.9 2.1-12.5-9.1-8.9 12.6-1.8z" fill="#ffc93a" stroke="#d79a00" stroke-width="2" stroke-linejoin="round"/><rect x="36" y="64" width="28" height="5" rx="2.5" fill="#ffc93a" opacity=".8"/></svg>`;
const MIC_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15m6-3.5a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.9V22h2v-2.6a8 8 0 0 0 7-7.9z"/></svg>';

// A damped spring (GAME_FEEL law 10): v += (target - x) * k * dt; v *= damping.
function spring(x,k=210,d=.82){return {x,v:0,target:x,k,d,step(dt){this.v+=(this.target-this.x)*this.k*dt;this.v*=Math.pow(this.d,dt*60);this.x+=this.v*dt;return Math.abs(this.v)>.001||Math.abs(this.target-this.x)>.001;}};}

// Tiny synthesized sounds, pitch-randomized ±6% (law 11). Started on the first tap.
function createSounds(){let ctx=null;const pentatonic=[0,2,4,7,9,12,14,16];let step=0;
 const audio=()=>ctx||(ctx=new (window.AudioContext||window.webkitAudioContext)());
 const tone=(freq,len=.12,type='sine',gain=.16,when=0)=>{try{const c=audio(),t=c.currentTime+when,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq*(.94+Math.random()*.12);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+len);o.connect(g).connect(c.destination);o.start(t);o.stop(t+len+.02);}catch{}};
 const noise=(len=.25,gain=.12,freq=1800)=>{try{const c=audio(),b=c.createBuffer(1,c.sampleRate*len,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type='bandpass';f.frequency.value=freq*(.94+Math.random()*.12);g.gain.value=gain;s.buffer=b;s.connect(f).connect(g).connect(c.destination);s.start();}catch{}};
 return {page:()=>noise(.28,.14,1400),pop:()=>{tone(523*2**(pentatonic[step++%pentatonic.length]/12),.14);},resetPops:()=>{step=0;},thunk:()=>{tone(110,.18,'sine',.3);noise(.08,.12,500);},chime:()=>{tone(784,.6,'sine',.12);tone(1175,.8,'sine',.09,.08);tone(1568,.9,'sine',.06,.16);},boop:()=>tone(220,.2,'triangle',.12),tick:()=>tone(1320,.04,'square',.03)};
}

function tornEdge(){const pts=['0 0'];for(let i=0;i<=40;i++){const y=i*2.5,x=100-(i%2?1.4:0)-Math.random()*1.4;pts.push(`calc(${x}% ) ${y}%`);}pts.push('0 100%');return `polygon(${pts.join(',')})`;}

export function installStoryBook(host){
 const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./story-book.css',import.meta.url).href;document.head.append(link);
 const root=document.createElement('div');root.id='story-book-root';
 root.innerHTML=`<button class="sb-tab" type="button" aria-label="Open the storybook" aria-expanded="false">${BOOK_SVG}<span class="sb-bubble" aria-hidden="true"></span></button>
 <section class="sb-page" aria-label="Storybook" hidden><div class="sb-sheet">
  <button class="sb-ribbon" type="button" aria-label="Close the storybook"></button>
  <div class="sb-title"></div><div class="sb-cast"></div><div class="sb-beats" aria-hidden="true"></div>
  <div class="sb-words"><textarea aria-label="Your story" maxlength="1200" placeholder="Once upon a time…"></textarea></div>
  <div class="sb-thinking" hidden aria-hidden="true"><span>🪶</span><span>✨</span><span>📜</span></div>
  <div class="sb-wishes"></div>
  <div class="sb-controls"><button class="sb-small sb-stop" type="button" aria-label="Stop the story" hidden>✋</button><button class="sb-mic" type="button" aria-label="Tell a story out loud"><span class="ring"></span><span class="ring"></span>${MIC_SVG}</button><button class="sb-go" type="button" aria-label="Play this story" hidden>✨</button><button class="sb-small sb-again" type="button" aria-label="Play it again" hidden>🔁</button><button class="sb-small sb-new" type="button" aria-label="Tell a new story" hidden>✏️</button></div>
  <div class="sb-footnote"></div><div class="sb-sr" role="status" aria-live="polite"></div>
 </div></section>`;
 document.body.append(root);
 const $=s=>root.querySelector(s),tab=$('.sb-tab'),page=$('.sb-page'),sheet=$('.sb-sheet'),title=$('.sb-title'),castRow=$('.sb-cast'),beatsRow=$('.sb-beats'),words=$('textarea'),thinking=$('.sb-thinking'),wishes=$('.sb-wishes'),mic=$('.sb-mic'),go=$('.sb-go'),stopButton=$('.sb-stop'),again=$('.sb-again'),fresh=$('.sb-new'),foot=$('.sb-footnote'),live=$('.sb-sr'),bubble=$('.sb-bubble');
 sheet.style.clipPath=tornEdge();
 const sounds=createSounds();
 let open=false,mode='idle',story=null,lastText='',controller=null,recognition=null,narrationUntil=0,spoken=false;

 // Springs drive the page slide and wobble, and the tab's squash.
 const slide=spring(-1.08),tilt=spring(0,180,.8),tabScale=spring(1,320,.75);let animating=false,last=0;
 function animate(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;const moving=[slide.step(dt),tilt.step(dt),tabScale.step(dt)].some(Boolean);
  page.style.transform=`translateX(${slide.x*100}%) rotate(${tilt.x}deg)`;page.hidden=slide.x<-1.05&&!open;tab.style.transform=`scale(${tabScale.x})`;
  if(moving)requestAnimationFrame(animate);else animating=false;}
 const kick=()=>{if(!animating){animating=true;last=performance.now();requestAnimationFrame(animate);}};
 const wobble=(amount=1)=>{tabScale.x=1-.12*amount;tabScale.v=4*amount;kick();};

 function setOpen(next){if(next===open)return;open=next;tab.setAttribute('aria-expanded',String(open));slide.target=open?0:-1.08;tilt.x=open?-4:0;tilt.v=open?-30:20;tilt.target=open?-.8:0;page.hidden=false;sounds.page();wobble();kick();
  if(open){if(mode==='idle'&&!spoken){spoken=true;say('Tell me a story!',{min:0});}setTimeout(()=>{if(mode==='idle'&&!matchMedia('(pointer:coarse)').matches)words.focus();},250);}
  else tab.focus({preventScroll:true});}
 tab.onclick=()=>setOpen(!open);$('.sb-ribbon').onclick=()=>setOpen(false);
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}});

 // Reading aloud. narrating() holds the next beat until the line has been heard.
 function say(text,{min=Math.max(4500,text.split(/\s+/).length*380)}={}){narrationUntil=performance.now()+min;live.textContent=text;}
 const narrating=()=>performance.now()<narrationUntil;

 function setMode(next){mode=next;
  const busy=['thinking','building','playing'].includes(mode);
  words.readOnly=busy||mode==='done';thinking.hidden=!['thinking','building'].includes(mode);words.parentElement.hidden=['thinking','building'].includes(mode);
  mic.hidden=busy||mode==='done';go.hidden=busy||mode==='done'||!words.value.trim();stopButton.hidden=!busy;again.hidden=fresh.hidden=mode!=='done';
 }
 words.addEventListener('input',()=>{go.hidden=['thinking','building','playing','done'].includes(mode)||!words.value.trim();});
 words.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();tell();}});

 // Voice: the browser's speech recognizer. A finished sentence plays without any reading needed.
 const Recognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognizer)mic.hidden=true;
 mic.onclick=()=>{sounds.tick();if(recognition){recognition.stop();return;}if(!Recognizer)return;
  recognition=new Recognizer();recognition.lang=navigator.language||'en-US';recognition.interimResults=true;recognition.continuous=false;const before=words.value.trim();let finalText='';
  recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)finalText+=e.results[i][0].transcript;else interim+=e.results[i][0].transcript;}words.value=[before,finalText+interim].filter(Boolean).join(' ');words.dispatchEvent(new Event('input'));};
  recognition.onerror=()=>{};
  recognition.onend=()=>{mic.classList.remove('listening');mic.setAttribute('aria-label','Tell a story out loud');recognition=null;if(finalText.trim().split(/\s+/).length>=3)setTimeout(()=>{if(mode==='idle')tell();},900);};
  try{recognition.start();mic.classList.add('listening');mic.setAttribute('aria-label','Stop listening');}catch{recognition=null;}
 };

 function renderCast(bindings={}){castRow.replaceChildren();sounds.resetPops();
  for(const [i,c]of story.cast.entries()){const b=document.createElement('button');b.type='button';b.className='sb-sticker'+(Object.keys(bindings).length&&!bindings[c.id]?' away':'');b.style.setProperty('--tilt',`${(i%2?1:-1)*(3+i)}deg`);b.setAttribute('aria-label',`Look at ${c.name}`);
   b.innerHTML=`<span class="face"></span><span class="name"></span>${c.hero?'<span class="star" aria-hidden="true">⭐</span>':''}`;b.querySelector('.face').textContent=face(c);b.querySelector('.name').textContent=c.name;
   b.onclick=()=>{sounds.pop();const s=spring(.85,400,.7);const step=()=>{const m=s.step(1/60);b.style.transform=`scale(${s.x})`;if(m)requestAnimationFrame(step);};s.target=1;step();session.focus(c.id);};
   b.style.transform='scale(0)';castRow.append(b);
   // Stickers pop in one by one, each a note higher (Balatro-style stagger).
   setTimeout(()=>{sounds.pop();const s=spring(0,300,.72);s.target=1;const step=()=>{const m=s.step(1/60);b.style.transform=`scale(${s.x})`;if(m)requestAnimationFrame(step);};step();},90*i);
  }}
 function renderBeats(current=-1,done=new Map()){beatsRow.replaceChildren();if(!story)return;for(const [i,beat]of story.beats.entries()){const d=document.createElement('span');d.className='sb-bead'+(done.has(i)?done.get(i)?' skipped':' done':i===current?' now':'');d.textContent=i===current||done.has(i)?ACTION_GLYPH[beat.action]||'•':'';beatsRow.append(d);}}
 function renderWishes(){wishes.replaceChildren();if(!story?.missing.length)return;const jar=document.createElement('span');jar.textContent='💭';jar.title='Wishes for later';wishes.append(jar);for(const [i,m]of story.missing.slice(0,5).entries()){const s=document.createElement('span');s.className='sb-wish';s.style.setProperty('--tilt',`${(i%2?2:-2)}deg`);s.textContent=m.name;wishes.append(s);}}

 const done=new Map();
 const session=createStorySession(host,{
  stage:(what,detail)=>{if(what==='new-tile'){foot.textContent='Building a new place for '+Object.keys(detail).join(', ')+'…';}},
  checked:check=>{foot.textContent=`Rehearsed off-screen: ${check.played}/${check.beats} parts play${check.skipped?.length?`, ${check.skipped.length} will be told`:''} · ${check.ms} ms${footExtra}`;},
  cast:bindings=>renderCast(bindings),
  beat:(i,beat)=>{setMode('playing');renderBeats(i,done);words.value=beat.line;say(beat.line);bubble.textContent=(face(story.cast.find(c=>c.id===beat.who)||{kind:'person'}))+' '+(ACTION_GLYPH[beat.action]||'');const s=spring(.4,300,.7);s.target=1;const step=()=>{const m=s.step(1/60);bubble.style.transform=`scale(${s.x})`;if(m)requestAnimationFrame(step);};step();wobble(.6);},
  beatDone:(i,beat,{skipped})=>{done.set(i,skipped);renderBeats(-1,done);sounds.pop();},
  issue:m=>{live.textContent=m;},
  narrating,
  end:({reason})=>{if(reason==='complete'){sounds.chime();setTimeout(()=>say('The end.',{min:0}),900);words.value=story.beats.map(b=>b.line).join(' ')+'\n\nThe end.';}else if(reason==='board-changed'){words.value='The ranch changed, so the story paused here.';}bubble.textContent=reason==='complete'?'⭐':'';setMode('done');}
 });
 let footExtra='';

 async function tell(){const text=words.value.trim();if(!text||['thinking','building','playing'].includes(mode))return;
  if(!host.ready()){sounds.boop();wobble();return;}
  recognition?.stop();lastText=text;sounds.thunk();setMode('thinking');title.textContent='';foot.textContent='';castRow.replaceChildren();beatsRow.replaceChildren();wishes.replaceChildren();done.clear();
  controller=new AbortController();
  try{const planned=await planStory(text,{signal:controller.signal});story=planned.story;footExtra=planned.model?` · ${planned.model}${planned.costUSD?` · $${planned.costUSD.toFixed(4)}`:''}`:'';
   title.textContent=story.title;renderCast();renderWishes();renderBeats();setMode('building');say(story.title,{min:1500});
   await session.play(story);
  }catch(error){if(error.name==='AbortError'){setMode('idle');words.value=lastText;return;}sounds.boop();setMode('idle');words.value=lastText;foot.textContent=error.message;say('Hmm, let\'s try telling that a different way.',{min:0});}
  finally{controller=null;}
 }
 go.onclick=()=>{sounds.tick();tell();};
 stopButton.onclick=()=>{controller?.abort();session.clear();try{speechSynthesis.cancel();}catch{}bubble.textContent='';setMode('done');};
 again.onclick=()=>{if(!story)return;done.clear();words.value='';setMode('building');renderBeats();session.play(story).catch(e=>{foot.textContent=e.message;setMode('done');});};
 fresh.onclick=()=>{session.clear();story=null;done.clear();words.value='';title.textContent='';castRow.replaceChildren();beatsRow.replaceChildren();wishes.replaceChildren();foot.textContent='';bubble.textContent='';setMode('idle');words.focus();};

 fetch('/api/story-compose').then(r=>r.ok?r.json():null).then(info=>{if(!info?.enabled){foot.textContent='The storyteller is asleep (not enabled on this server).';}}).catch(()=>{});
 setMode('idle');
 const api={open:()=>setOpen(true),close:()=>setOpen(false),session,get mode(){return mode;},tell:text=>{words.value=text;return tell();}};
 // ?storydebug mirrors the director and cast state into the DOM for automated checks.
 if(/[?&]storydebug/.test(location.search))setInterval(()=>{const s=session.current,d=s?.director;if(!d)return;const cast={};for(const [id,b]of Object.entries(d.bindings))if(b.worker){const w=b.worker;cast[id]={phase:w.phase,activity:w.body.userData.activity,visible:w.body.visible,key:w.activityKey,done:w.activityDone,agenda:b.person.storyAgenda?.id,x:+w.position.x.toFixed(1),z:+w.position.z.toFixed(1),path:(w.path?.length||0)+'/'+w.index};}root.dataset.debug=JSON.stringify({index:d.index,finished:d.finished,seconds:Math.round(s.world?.state.seconds||0),cast});},500);
 return api;
}
