// Live voice settings: provider, voice and how the Computer talks and listens. Saved on this device
// under SETTINGS_KEY and read by simulations/live/live.mjs; the server rebuilds the session from these
// choices (policy.serverSession), so nothing here can change the rules.
import {SETTINGS_KEY,DEFAULT_SETTINGS,OPENAI_VOICES,ELEVEN_VOICES,normalizeSettings} from '/simulations/live/policy.mjs';
const $=s=>document.querySelector(s);
const OPENAI_ABOUT={marin:'clear, friendly (default)',cedar:'warm, natural',alloy:'neutral, even',ash:'soft, steady',ballad:'gentle, expressive',coral:'bright, cheerful',echo:'calm, low',sage:'calm, thoughtful',shimmer:'light, airy',verse:'lively, expressive'};
let settings=load(),elevenVoices=ELEVEN_VOICES,configured=null,audio=null,toastTimer=0;

function load(){try{return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null'));}catch{return normalizeSettings(null);}}
function save(patch){
 settings=normalizeSettings({...settings,...patch});
 let ok=true;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{ok=false;}
 render();toast(ok?'Saved · used next time you tap Talk':'Could not save on this device');
}
function toast(text){const t=$('#toast');t.textContent=text;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,1800);}

function voiceButton(id,name,about,setting,canPlay){
 return `<button type="button" role="radio" class="voice" data-value="${id}" aria-checked="${settings[setting]===id}"><strong>${esc(name)}</strong><small>${esc(about||'')}</small>${canPlay?`<span class="play" role="button" tabindex="0" data-play="${id}" aria-label="Hear ${esc(name)}">▶</span>`:''}</button>`;
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

function render(){
 for(const group of document.querySelectorAll('[role=radiogroup][data-setting]'))
  for(const b of group.querySelectorAll('[role=radio]'))b.setAttribute('aria-checked',String(settings[group.dataset.setting]===b.dataset.value));
 for(const box of document.querySelectorAll('input[type=checkbox][data-setting]'))box.checked=!!settings[box.dataset.setting];
 $('#speed').value=settings.speed;$('#speed-out').textContent=settings.speed.toFixed(2)+'×';
 const eleven=settings.provider==='elevenlabs';
 $('#voices-openai').hidden=eleven;$('#voices-eleven').hidden=!eleven;
 $('#voice-note').textContent=eleven?(configured?'Tap ▶ to hear a voice say hello.':'Voices can be previewed once ElevenLabs is connected.'):'You hear OpenAI voices in live mode itself.';
 $('#eleven-status').textContent=configured===false?'ElevenLabs is not connected on the server yet. Until it is, live mode uses the OpenAI voice.':configured?'ElevenLabs is connected.':'';
}
function renderVoices(){
 $('#voices-openai').innerHTML=OPENAI_VOICES.map(v=>voiceButton(v,v[0].toUpperCase()+v.slice(1),OPENAI_ABOUT[v],'openaiVoice',false)).join('');
 const list=elevenVoices.some(v=>v.id===settings.elevenVoice)?elevenVoices:[...elevenVoices,{id:settings.elevenVoice,name:'Your saved voice',about:''}];
 $('#voices-eleven').innerHTML=list.map(v=>voiceButton(v.id,v.name,v.about,'elevenVoice',!!configured)).join('');
 render();
}

async function preview(id){
 try{
  audio??=new AudioContext({sampleRate:24000});await audio.resume();
  toast('Loading voice…');
  const r=await fetch('/api/live-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({preview:true,voice:id,speed:settings.speed})});
  if(!r.ok)throw Error((await r.json().catch(()=>({}))).error||'The voice did not answer.');
  const bytes=new Uint8Array(await r.arrayBuffer()),pcm=new Int16Array(bytes.buffer,0,bytes.length>>1);
  const buf=audio.createBuffer(1,pcm.length,24000),ch=buf.getChannelData(0);for(let i=0;i<pcm.length;i++)ch[i]=pcm[i]/32768;
  const src=audio.createBufferSource();src.buffer=buf;src.connect(audio.destination);src.start();$('#toast').hidden=true;
 }catch(e){toast(e.message);}
}

document.addEventListener('click',e=>{
 const play=e.target.closest('[data-play]');if(play){e.stopPropagation();preview(play.dataset.play);return;}
 const radio=e.target.closest('[role=radio]');const group=radio?.closest('[data-setting]');
 if(radio&&group)save({[group.dataset.setting]:radio.dataset.value});
});
document.addEventListener('keydown',e=>{const play=e.target.closest?.('[data-play]');if(play&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();preview(play.dataset.play);}});
for(const box of document.querySelectorAll('input[type=checkbox][data-setting]'))box.onchange=()=>save({[box.dataset.setting]:box.checked});
$('#speed').oninput=()=>{$('#speed-out').textContent=Number($('#speed').value).toFixed(2)+'×';};
$('#speed').onchange=()=>save({speed:Number($('#speed').value)});
$('#reset').onclick=()=>save({...DEFAULT_SETTINGS});
window.addEventListener('storage',e=>{if(e.key===SETTINGS_KEY){settings=load();render();}});

renderVoices();
fetch('/api/live-voice').then(r=>r.ok?r.json():null).then(d=>{configured=!!d?.configured;if(d?.voices?.length)elevenVoices=d.voices;renderVoices();}).catch(()=>{configured=false;render();});
