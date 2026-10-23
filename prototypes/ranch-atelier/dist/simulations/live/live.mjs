// Live mode: hands-free voice that changes the world as the family talks.
// Microphone -> AI Gateway realtime (speech to speech, with tools) -> holodeck stage ops in this page.
// The server (api/live.js) mints a 60-second ticket for our relay; no key ever reaches the page.
// With ElevenLabs picked in /live-voice, the session answers in text and api/live-voice.js speaks it.
// Safety layers: the game-controller instructions (policy.mjs), a narrow tool set, the local PG screen
// on every tool text, and the server guard on every line spoken by either side. Tool calls wait for
// the guard's verdict on what the child just said, so an unsafe request never reaches the screen.
import {AUDIO_RATE,LIVE_OPS,APP_ACTIONS,APP_WORLDS,SETTINGS_KEY,normalizeSettings,sessionConfig,gameIdea,screen,toolTexts,buildOps,summarize,searchModels} from './policy.mjs';

const RATE=AUDIO_RATE,IDLE_MS=120000,MAX_MS=20*60000,MAX_CHAIN=6;
const CONSENT_KEY='abbies-live-consent-v1';

export async function startLive({stage,audio,button}){
 // The family's choices from /live-voice: provider, voice and how it listens. Safety is not a setting.
 let settings=normalizeSettings((()=>{try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');}catch{return null;}})());
 const ui=createUI();
 if(!(await consent(ui)))return {active:false,stop(){}};
 const live={active:true,stop};
 let ws=null,stream=null,processor=null,source=null,muted=false,ended=false;
 let playTime=0;const playing=new Set();
 let lastSpeech=Date.now(),startedAt=Date.now(),strikes=0,chain=0,goodbye=false;
 let guardChild=Promise.resolve({verdict:'ok'});
 const pending=new Map();// responseId -> {calls, outputs, done}
 let timer=0,currentResponse=null,cutResponse=null;
 // ElevenLabs voice: the model writes text, each sentence is spoken in order through api/live-voice.js.
 let voiceTicket=null,sentence='',speakChain=Promise.resolve(),speakAbort=new AbortController(),voiceFailed=false,carry=null;
 // Tool calls run one at a time, in the order the model made them (app actions refuse to overlap).
 let toolQueue=Promise.resolve();
 // On a phone, put the world in view: close side drawers that would cover it.
 if(innerWidth<760)for(const sel of ['#scene-tools-drawer .tile-tools-heading button','#panel-close']){const b=document.querySelector(sel);if(b&&b.offsetParent)b.click();}
 setButton(true);ui.show();ui.state('connecting','Waking up the Computer…');

 try{
  const r=await fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'session'})});
  const s=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(s.error||'Live mode could not start.');
  voiceTicket=s.voiceTicket||null;
  if(settings.provider==='elevenlabs'&&!voiceTicket){settings={...settings,provider:'openai'};ui.toast('ElevenLabs is not connected yet, so the Computer uses its usual voice.');}
  if(!settings.captions)ui.el.querySelector('.live-lines').style.visibility='hidden';
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
  ws=new WebSocket(s.url,s.protocols);
  ws.onopen=()=>{
   send({type:'session-update',config:sessionConfig(brief(),settings)});
   startCapture();ui.state('listening','Say what you want to see!');
   // A short hello so the family knows it is listening.
   if(settings.greeting)send({type:'response-create',options:{instructions:'Greet the family in one short, cheerful sentence and ask what they want to make in the world.'}});
  };
  ws.onmessage=ev=>{let e;try{e=JSON.parse(ev.data);}catch{return;}for(const x of Array.isArray(e)?e:[e])onEvent(x);};
  ws.onerror=()=>{};
  ws.onclose=ev=>{if(!ended)stop(ev.code===4402?'The Computer has used up its magic for now. Keep playing!':ev.code===1000?'Live mode is resting. Tap Talk to play again.':'The connection dropped. Tap Talk to try again.');};
 }catch(e){stop(e.message||String(e));}

 timer=setInterval(()=>{
  if(ended)return;
  if(Date.now()-startedAt>MAX_MS)stop('That was a long play! Tap Talk to start again.');
  else if(Date.now()-lastSpeech>IDLE_MS&&!playing.size)stop('Live mode is resting. Tap Talk to play again.');
 },5000);
 // Tool table (defined before returning: the helpers below are hoisted, consts are not).
 const TOOL_RUN={
  look:async()=>({...summarize(stage.snapshot(true)),app:appState()}),
  catalog:async a=>searchModels(await getJSON('/simulation-assets/catalog.json',[]),(await getJSON('/api/models',null)||await getJSON('/models/manifest.json',{})).models,{query:a.query||'',kind:a.kind}),
  control_app:async a=>controlApp(a.action,a.args||{}),
  change_world:async a=>{
   const ops=Array.isArray(a.ops)?a.ops:[];
   for(const o of ops)if(!LIVE_OPS.includes(o?.op))throw Error('Op '+o?.op+' is not available in live mode');
   const r=await stage.apply(ops.map(o=>({op:o.op,args:o.args||{}})));return compact(r);
  },
  // Voice builds pass the same toy-kit gate as Make (invent/contract.mjs), with the voice's wider bounds.
  build:async a=>{if(!a?.id||!Array.isArray(a.parts)||!a.parts.length)throw Error('build needs an id and parts');const {constrain,LIMITS}=await import('../invent/contract.mjs');return compact(await stage.apply(buildOps({...a,parts:constrain({parts:a.parts},LIMITS.voice).parts})));},
  order_model:async a=>{
   const r=await fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'order',description:a.description,for:a.for})});
   const out=await r.json().catch(()=>({}));
   if(out.ok)ui.toast('Workshop order sent: '+a.description);
   return out.ok?{ok:true,status:'The workshop has the order. It will arrive later, not today.'}:{ok:false,error:out.verdict?'The workshop cannot make that one.':out.error||'The workshop is busy.'};
  },
  game_idea:async a=>gameIdea(a.idea),
  goodbye:async()=>{goodbye=true;return {ok:true};}
 };
 return live;

 // ---- app ---------------------------------------------------------------------------------
 // The app's own actions (app-actions.js): validated schemas, page-owned code, no DOM selectors.
 function appState(){
  const app=window.RanchActions?.read('sandboxApp'),tiles=window.RanchActions?.read('sandboxGenerators');
  if(!app)return null;
  return {world:app.simulation,worldName:app.simulationName,shape:app.shape,ranch:app.ranch,paused:app.paused,building:app.busy,panelOpen:app.panelOpen,libraryOpen:app.libraryOpen,
   arrival:app.arrival,season:app.season,sound:app.sound,worlds:app.simulations.filter(w=>APP_WORLDS.includes(w.id)),tileKinds:tiles?.generators?.map(g=>g.id),freeTileSpots:tiles?.availableCells?.length};
 }
 async function controlApp(action,args){
  const actions=window.RanchActions;if(!actions)throw Error('The app controls are not ready yet');
  if(!Object.hasOwn(APP_ACTIONS,action))throw Error('Unknown app action '+action);
  const run=(name,a={})=>actions.run(name,a);
  switch(action){
   case 'state':return appState();
   case 'simulation':if(!APP_WORLDS.includes(args.id))throw Error('That world is not available here');return ok(await run('sandboxApp.simulation',pick(args,['id','fresh'])));
   case 'add_tile':{
    const kind={ranch:'ranch',garden:'garden',meadow:'meadow',moon:'moon'}[args.kind];if(!kind)throw Error('Tile kinds: ranch, garden, meadow, moon');
    // A rebuild (new animals, shape) must finish before the board takes a new tile.
    for(let i=0;i<120&&actions.read('sandboxApp')?.busy;i++)await new Promise(r=>setTimeout(r,250));
    await run('sandboxGenerators.select',{generatorId:kind});
    let t=actions.read('sandboxGenerators');
    if(t.requiresPrint)t=(await run('sandboxGenerators.print',{})).state;
    // The preview tile builds itself before it can be placed: wait for Ready (bounded).
    for(let i=0;i<60&&!t.ready;i++){await new Promise(r=>setTimeout(r,250));t=actions.read('sandboxGenerators');}
    const cell=t.availableCells?.[0];if(!cell)throw Error('There is no free spot for a tile right now');
    await run('sandboxGenerators.place',{q:cell.q,r:cell.r});return {ok:true,placed:kind};
   }
   case 'scenes':{const r=await run('sandboxScenes.list');return {scenes:(r?.entries||[]).slice(0,20).map(e=>({sceneId:e.id,name:e.name,world:e.family,favorite:e.favorite}))};}
   case 'save_scene':return ok(await run('sandboxScenes.save',{name:String(args.name||'').slice(0,40)||'My world'}));
   case 'load_scene':return ok(await run('sandboxScenes.load',{sceneId:String(args.sceneId||'')}));
   case 'new_ranch':return ok(await run('sandboxScenes.newRanch'));
   case 'shape':return ok(await run('sandboxApp.shape',pick(args,['shape'])));
   case 'ranch':return ok(await run('sandboxApp.ranch',pick(args,['horses','cows','goats','chickens','goatPlay','playground','size','complexity'])));
   default:return ok(await run('sandboxApp.'+action,pick(args,{panel:['open'],library:['open'],pause:['paused'],arrival:['effect','replay'],season:['season'],sound:['on']}[action]||[])));
  }
 }
 // Declarations, not consts: this code sits after `return live` and is reached only through hoisting.
 function pick(o,keys){return Object.fromEntries(keys.filter(k=>o[k]!==undefined).map(k=>[k,o[k]]));}
 function ok(){return {ok:true,app:appState()};}
 async function getJSON(url,fallback){try{const r=await fetch(url);return r.ok?await r.json():fallback;}catch{return fallback;}}

 // ---- transport ---------------------------------------------------------------------------
 function send(event){if(ws?.readyState===1)ws.send(JSON.stringify(event));}
 function brief(){
  try{const s=summarize(stage.snapshot(true));
   return `\n\nTHE WORLD RIGHT NOW (from the game, not from the child): ${JSON.stringify({place:s.place,clock:s.clock,weather:s.weather,personHeight:s.personHeight,people:s.people.map(p=>p.name),buildings:s.buildings.map(b=>b.name),yourThings:s.yourThings.map(t=>t.id),app:appState()})}`.slice(0,7900);}
  catch{return '';}
 }

 async function onEvent(e){
  switch(e.type){
   case 'speech-started':lastSpeech=Date.now();chain=0;if(settings.interrupt||!playing.size)stopPlayback();ui.state('listening','Listening…');break;
   case 'speech-stopped':ui.state('thinking','Thinking…');break;
   case 'input-transcription-completed':{
    const text=(e.transcript||'').trim();if(!text)break;ui.heard(text);
    guardChild=guard('child',text).then(v=>{if(['unsafe','jailbreak'].includes(v.verdict))redirect('rules');else if(v.verdict==='distress')ui.alert('Please go and find a grown-up you trust right now.');return v;});
    break;}
   case 'audio-delta':play(e.delta);ui.state('speaking');break;
   case 'audio-transcript-delta':ui.said(e.delta,true);{const t=ui.saidText();if(!screen(t,{level:'speech'}).ok)redirect('computer');}break;
   // ElevenLabs path: text arrives instead of audio; speak each finished sentence, guard the whole line.
   case 'text-delta':if(cutResponse===currentResponse)break;if(!screen(ui.saidText()+e.delta,{level:'speech'}).ok){redirect('computer');break;}ui.said(e.delta,true);
    sentence+=e.delta;{const m=sentence.match(/^([\s\S]*?[.!?…](?:["'”’)]*)(?:\s+|$))/);if(m&&m[1].trim().length>1){sentence=sentence.slice(m[1].length);speak(m[1]);}}break;
   case 'text-done':{if(cutResponse===currentResponse){sentence='';break;}if(sentence.trim())speak(sentence);sentence='';const t=e.text||ui.saidText();guard('computer',t).then(v=>{if(['unsafe','jailbreak','personal'].includes(v.verdict))redirect('computer');});break;}
   case 'audio-transcript-done':{const t=e.transcript||ui.saidText();guard('computer',t).then(v=>{if(['unsafe','jailbreak','personal'].includes(v.verdict))redirect('computer');});break;}
   case 'function-call-arguments-done':{const p=pending.get(e.responseId);if(p)p.calls++;toolQueue=toolQueue.then(()=>runTool(e));break;}
   case 'response-created':currentResponse=e.responseId;pending.set(e.responseId,{calls:0,outputs:0,done:false});ui.said('',false);break;
   case 'response-done':{const p=pending.get(e.responseId);if(p){p.done=true;maybeContinue(e.responseId);}if(goodbye)speakChain.then(()=>setTimeout(()=>stop('Bye for now! Tap Talk to play again.'),1500+Math.max(0,(playTime-audio.currentTime)*1000)));else if(!playing.size)ui.state('listening');break;}
   case 'error':console.warn('[live]',e.message,e.code);if(/session|auth|expired|closed/i.test(e.message||''))stop('Live mode stopped: '+e.message);break;
  }
 }

 // The model reacts again after its tools return, but never more than MAX_CHAIN times per thing said.
 function maybeContinue(id){
  const p=pending.get(id);if(!p||!p.done||p.outputs<p.calls)return;pending.delete(id);
  if(p.calls&&!goodbye&&++chain<=MAX_CHAIN)send({type:'response-create'});
 }

 // ---- tools --------------------------------------------------------------------------------
 async function runTool(e){
  const p=pending.get(e.responseId);
  let result;
  try{
   const args=JSON.parse(e.arguments||'{}');
   // Wait for the guard on what was just said (bounded), so a refused request never builds anything.
   // The bound is generous: a phone busy rebuilding the ranch can take seconds to hear back.
   const verdict=await Promise.race([guardChild,new Promise(r=>setTimeout(()=>r({verdict:'unknown'}),6000))]);
   if(['unsafe','jailbreak'].includes(verdict.verdict))throw Error('Not allowed in Abbie\'s World.');
   for(const t of toolTexts(e.name,args))if(!screen(t).ok)throw Error('That name or label is not allowed in Abbie\'s World. Pick a friendly one.');
   result=await TOOL_RUN[e.name]?.(args);
   if(result===undefined)throw Error('Unknown tool '+e.name);
  }catch(err){result={ok:false,error:err.message};}
  send({type:'conversation-item-create',item:{type:'function-call-output',callId:e.callId,name:e.name,output:JSON.stringify(result).slice(0,12000)}});
  if(p){p.outputs++;maybeContinue(e.responseId);}
 }
 function compact(r){return {ok:r.ok,error:r.error||undefined,results:(r.results||[]).slice(0,40)};}

 // ---- guard --------------------------------------------------------------------------------
 async function guard(who,text){
  if(!screen(text,{level:who==='computer'?'speech':'all'}).ok)return {verdict:'unsafe'};
  try{const r=await fetch('/api/live',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'guard',who,text})});return r.ok?await r.json():{verdict:'unknown'};}
  catch{return {verdict:'unknown'};}
 }
 // Stop what is being said, and steer back. Two slips by the Computer end the session.
 function redirect(kind){
  // One slip is one strike, however many checks (screen, then guard) catch the same reply.
  if(kind==='computer'){if(cutResponse&&cutResponse===currentResponse)return;cutResponse=currentResponse;}
  stopPlayback();send({type:'response-cancel'});ui.clear();
  if(kind==='computer'&&++strikes>=2){stop('Live mode stopped to keep things friendly. Tap Talk to start fresh.');return;}
  send({type:'conversation-item-create',item:{type:'text-message',role:'user',text:kind==='rules'
   ?'[GAME RULE CHECK, from the game, not the child] The last request is not allowed in Abbie\'s World. Do not do it, repeat it or explain it. Say one kind sentence and offer a fun, gentle thing to build instead.'
   :'[GAME RULE CHECK, from the game, not the child] Your last reply broke the game\'s rules and was cut off. Do not repeat it. Say one cheerful sentence that brings the family back to building in the world.'}});
  send({type:'response-create'});
 }

 // ---- audio --------------------------------------------------------------------------------
 function startCapture(){
  source=audio.createMediaStreamSource(stream);processor=audio.createScriptProcessor(4096,1,1);
  const ratio=audio.sampleRate/RATE;
  processor.onaudioprocess=ev=>{
   if(muted||ended||ws?.readyState!==1)return;
   const input=ev.inputBuffer.getChannelData(0),n=Math.floor(input.length/ratio),pcm=new Int16Array(n);
   for(let i=0;i<n;i++){const x=i*ratio,j=Math.floor(x),f=x-j,v=input[j]*(1-f)+(input[Math.min(j+1,input.length-1)]??0)*f;pcm[i]=Math.max(-1,Math.min(1,v))*0x7fff;}
   send({type:'input-audio-append',audio:b64(pcm.buffer)});
  };
  // A silent sink keeps the processor running without echoing the mic to the speaker.
  const sink=audio.createGain();sink.gain.value=0;source.connect(processor);processor.connect(sink);sink.connect(audio.destination);
 }
 function play(base64){
  const bin=atob(base64),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  playPCM(new Int16Array(bytes.buffer,0,bytes.length>>1));
 }
 // Sentences are fetched in parallel but played strictly in order; barge-in aborts the lot.
 function speak(text){
  text=text.trim();if(!text||ended)return;
  const signal=speakAbort.signal;
  const audioReady=fetch('/api/live-voice',{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:voiceTicket,text,voice:settings.elevenVoice,speed:settings.speed})}).catch(e=>e);
  speakChain=speakChain.then(async()=>{
   const r=await audioReady;if(signal.aborted||ended)return;
   if(!(r instanceof Response)||!r.ok||!r.body){if(!voiceFailed){voiceFailed=true;ui.toast('The ElevenLabs voice did not answer. Words are on screen.');}return;}
   const reader=r.body.getReader();carry=null;
   try{for(;;){const {done,value}=await reader.read();if(done||signal.aborted)break;ui.state('speaking');playBytes(value);}}catch{}
  });
 }
 function playBytes(chunk){
  let bytes=chunk;if(carry!==null){bytes=new Uint8Array(chunk.length+1);bytes[0]=carry;bytes.set(chunk,1);carry=null;}
  if(bytes.length%2){carry=bytes[bytes.length-1];bytes=bytes.subarray(0,bytes.length-1);}
  if(bytes.length)playPCM(new Int16Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)));
 }
 function playPCM(pcm){
  if(!pcm.length)return;
  const buf=audio.createBuffer(1,pcm.length,RATE),ch=buf.getChannelData(0);for(let i=0;i<pcm.length;i++)ch[i]=pcm[i]/32768;
  const src=audio.createBufferSource();src.buffer=buf;src.connect(audio.destination);
  playTime=Math.max(playTime,audio.currentTime+.04);src.start(playTime);playTime+=buf.duration;
  playing.add(src);src.onended=()=>{playing.delete(src);if(!playing.size&&!ended)ui.state('listening');};
 }
 function stopPlayback(){speakAbort.abort();speakAbort=new AbortController();speakChain=Promise.resolve();sentence='';for(const s of playing){try{s.onended=null;s.stop();}catch{}}playing.clear();playTime=audio.currentTime;}

 // ---- lifecycle ----------------------------------------------------------------------------
 function stop(message){
  if(ended)return;ended=true;live.active=false;clearInterval(timer);
  try{send({type:'session-close'});ws?.close(1000);}catch{}
  stopPlayback();processor&&(processor.onaudioprocess=null);processor?.disconnect();source?.disconnect();stream?.getTracks().forEach(t=>t.stop());
  setButton(false);ui.end(message);
 }
 function setButton(on){button.setAttribute('aria-pressed',String(on));button.classList.toggle('live-on',on);button.querySelector('.button-label').textContent=on?'Live':'Talk';}
 function b64(buffer){const bytes=new Uint8Array(buffer);let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));return btoa(s);}

 // ---- UI -----------------------------------------------------------------------------------
 function createUI(){
  injectStyle();
  const el=document.createElement('div');el.className='live-dock';el.hidden=true;
  el.innerHTML='<div class="live-orb" aria-hidden="true"><i></i></div><div class="live-lines"><p class="live-heard"></p><p class="live-said" aria-live="polite"></p></div><button class="live-mute" aria-label="Mute microphone" title="Mute">Mute</button><button class="live-end" aria-label="End live mode" title="End">End</button>';
  document.body.append(el);
  const heard=el.querySelector('.live-heard'),said=el.querySelector('.live-said');let saidText='',hideTimer=0;
  el.querySelector('.live-end').onclick=()=>stop('You ended live mode.');
  el.querySelector('.live-mute').onclick=ev=>{muted=!muted;ev.currentTarget.textContent=muted?'Unmute':'Mute';el.dataset.muted=muted;if(muted)send({type:'input-audio-clear'});};
  return {
   el,show(){clearTimeout(hideTimer);el.hidden=false;},
   state(s,text){el.dataset.state=s;if(text)said.textContent=text;},
   heard(t){heard.textContent='“'+t+'”';},
   said(t,append){saidText=append?saidText+t:t;if(saidText)said.textContent=saidText;},
   saidText:()=>saidText,
   clear(){saidText='';said.textContent='…';},
   alert(t){said.textContent=t;el.dataset.state='alert';},
   toast(t){const n=document.createElement('div');n.className='live-toast';n.textContent=t;document.body.append(n);setTimeout(()=>n.remove(),5000);},
   end(t){el.dataset.state='ended';heard.textContent='';said.textContent=t||'';hideTimer=setTimeout(()=>{el.hidden=true;},5000);}
  };
 }
}

function consent(ui){
 try{if(localStorage.getItem(CONSENT_KEY))return Promise.resolve(true);}catch{}
 return new Promise(resolve=>{
  const d=document.createElement('dialog');d.className='live-consent';
  d.innerHTML='<h2>Talk to the world</h2><p>The Computer listens while live mode is on and changes the world as you speak. Your voice goes to an AI voice service (OpenAI, through Vercel) to run the game. Abbie\'s World does not record or keep what is said.</p><p>It only plays the game: it stays PG, steers back to building, and tells a child to find a grown-up if something sounds wrong.</p><p class="small">For grown-ups: start it for your child and stay nearby. Tap End or say goodbye to stop.</p><div class="live-consent-actions"><button value="no">Not now</button><button value="yes" class="primary">Start talking</button></div>';
  document.body.append(d);d.showModal();
  d.querySelectorAll('button').forEach(b=>b.onclick=()=>{const ok=b.value==='yes';if(ok)try{localStorage.setItem(CONSENT_KEY,new Date().toISOString());}catch{}d.close();d.remove();resolve(ok);});
  d.addEventListener('cancel',()=>{d.remove();resolve(false);});
 });
}

function injectStyle(){
 if(document.getElementById('live-style'))return;
 const s=document.createElement('style');s.id='live-style';
 s.textContent=`#live-toggle.live-on{background:#e8553b;color:#fff8ec;border-color:transparent}
.live-dock{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:45;display:flex;align-items:center;gap:12px;width:min(640px,calc(100vw - 32px));padding:10px 12px 10px 14px;border-radius:24px;background:rgba(30,24,19,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:#fff8ec;font:500 16px/1.35 Manrope,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.live-dock[hidden]{display:none}
.live-orb{flex:none;width:40px;height:40px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffd56b,#e8553b 70%);display:grid;place-items:center;transition:transform .2s}
.live-orb i{width:12px;height:12px;border-radius:50%;background:#fff8ec;opacity:.9}
.live-dock[data-state=listening] .live-orb{animation:live-breathe 2.4s ease-in-out infinite}
.live-dock[data-state=speaking] .live-orb{animation:live-talk .5s ease-in-out infinite alternate}
.live-dock[data-state=thinking] .live-orb{animation:live-spin 1s linear infinite;background:conic-gradient(#ffd56b,#e8553b,#ffd56b)}
.live-dock[data-state=connecting] .live-orb{opacity:.6}
.live-dock[data-state=ended] .live-orb,.live-dock[data-muted=true] .live-orb{filter:grayscale(1);animation:none}
.live-dock[data-state=alert] .live-orb{background:#5b8def}
.live-lines{flex:1;min-width:0}
.live-lines p{margin:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-box-orient:vertical}
.live-heard{font-size:13px;opacity:.7;-webkit-line-clamp:1}
.live-said{font-family:Fraunces,Georgia,serif;font-size:17px;-webkit-line-clamp:2}
.live-dock button{flex:none;border:0;border-radius:14px;padding:8px 12px;font:600 13px Manrope,system-ui,sans-serif;background:rgba(255,248,236,.14);color:inherit}
.live-dock .live-end{background:#e8553b}
.live-toast{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:46;padding:10px 16px;border-radius:16px;background:rgba(30,24,19,.86);color:#fff8ec;font:600 14px Manrope,system-ui,sans-serif}
.live-consent{max-width:min(440px,calc(100vw - 32px));border:0;border-radius:24px;padding:22px;background:#fff8ec;color:#3a2a1c;font:400 15px/1.45 Manrope,system-ui,sans-serif}
.live-consent h2{margin:0 0 8px;font:600 22px Fraunces,Georgia,serif}.live-consent .small{font-size:13px;opacity:.75}
.live-consent-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:14px}.live-consent-actions button{border:0;border-radius:14px;padding:10px 16px;font:600 15px Manrope,system-ui,sans-serif;background:#efe4d2;color:#3a2a1c}.live-consent-actions .primary{background:#e8553b;color:#fff8ec}
@keyframes live-breathe{50%{transform:scale(1.08)}}@keyframes live-talk{to{transform:scale(1.18)}}@keyframes live-spin{to{transform:rotate(1turn)}}
@media (prefers-reduced-motion:reduce){.live-orb{animation:none!important}}`;
 document.head.append(s);
}
