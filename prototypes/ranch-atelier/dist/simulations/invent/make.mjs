// Make: the player says or types a wish and one new toy appears in their world (api/invent.js, INVENT.md).
// Summoned, never resident: a small glass wish card that closes itself once the toy lands. The toy is world layer
// (the residents and Suzy can see it); the card is presentation layer and covers nothing but its own glass.
// The keyboard's own dictation is the voice input, so no microphone code or extra AI cost lives here.
import {constrain,toBuild,LIMITS} from './contract.mjs';
import {buildOps} from '../live/policy.mjs';

const SAVED='abbies-makes-v1',KEEP=24;
const load=()=>{try{const v=JSON.parse(localStorage.getItem(SAVED)||'[]');return Array.isArray(v)?v:[];}catch{return [];}};
const save=list=>{try{localStorage.setItem(SAVED,JSON.stringify(list.slice(0,KEEP)));}catch{}};

export function mountMake({ensureStage}){
 const spacer=document.querySelector('header .toolbar-spacer');if(!spacer||document.getElementById('make-toggle'))return;
 const button=document.createElement('button');button.id='make-toggle';button.type='button';button.title='Make something';button.setAttribute('aria-label','Make something');
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/></svg><span class="button-label">Make</span>';
 (document.getElementById('live-toggle')||spacer).after(button);
 let card=null;
 button.addEventListener('click',()=>{card??=createCard(ensureStage);card.toggle();});
}

function createCard(ensureStage){
 style();
 const el=document.createElement('form');el.id='make-card';el.hidden=true;el.setAttribute('aria-label','Make something');el.autocomplete='off';
 el.innerHTML=`<div class="mk-row"><input name="wish" maxlength="${LIMITS.words}" enterkeyhint="go" placeholder="A rainbow dragon…" aria-label="What shall we make?"><button type="submit" class="mk-go" aria-label="Make it"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg></button><button type="button" class="mk-close" aria-label="Close">×</button></div><p class="mk-say" role="status" aria-live="polite"></p><div class="mk-chips"></div>`;
 document.body.append(el);
 const input=el.querySelector('input'),say=el.querySelector('.mk-say'),chips=el.querySelector('.mk-chips');
 let busy=false,count=0;
 const tell=(text,tone='')=>{say.textContent=text||'';say.dataset.tone=tone;};
 function showChips(list,onPick){chips.replaceChildren(...list.slice(0,6).map(x=>{const b=document.createElement('button');b.type='button';b.textContent=x.label;b.onclick=()=>onPick(x);return b;}));}
 function showMine(){showChips(load().map(m=>({label:m.recipe.name,make:m})),x=>place(x.make.recipe,x.make.wish));}
 async function place(recipe,wish){
  const stage=await ensureStage();
  // Every recipe passes the same gate again here, so a saved or cached make cannot carry anything new.
  const safe=constrain(recipe);
  const id=`${safe.id}-${Date.now().toString(36).slice(-4)}${count++}`;
  const r=await stage.apply([...buildOps(toBuild(safe,{id})),{op:'camera',args:{focus:id,duration:1.2}}]);
  if(!r.ok)throw Error('It wouldn’t fit there. Try again.');
  const list=load().filter(m=>m.wish!==wish);list.unshift({wish,recipe:safe});save(list);
  return safe;
 }
 async function make(wish){
  if(busy||!wish)return;busy=true;el.classList.add('mk-busy');tell('');chips.replaceChildren();
  try{
   const r=await fetch('/api/invent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wish})});
   const out=await r.json().catch(()=>({}));
   if(out.signIn){tell(out.error,'ask');showChips([{label:'Sign in'}],()=>document.getElementById('account-chip')?.click());return;}
   if(out.ok===false){tell('Let’s make something else! What about a castle made of clouds?','soft');return;}
   if(!r.ok||!out.recipe){tell(out.error||'That one didn’t come out right. Try again.','soft');if(out.ideas?.length)showChips(out.ideas.map(w=>({label:w,wish:w})),x=>{input.value=x.wish;make(x.wish);});return;}
   const made=await place(out.recipe,wish);
   tell(made.say,'yay');input.value='';
   setTimeout(()=>{if(!busy&&say.dataset.tone==='yay')close();},2600);
  }catch(e){tell(e.message||'Something went wrong. Try again.','soft');}
  finally{busy=false;el.classList.remove('mk-busy');}
 }
 el.addEventListener('submit',e=>{e.preventDefault();input.blur();make(input.value.trim());});
 el.querySelector('.mk-close').onclick=()=>close();
 function open(){el.hidden=false;tell('');showMine();setTimeout(()=>input.focus(),50);}
 function close(){el.hidden=true;}
 return {toggle(){el.hidden?open():close();}};
}

function style(){
 if(document.getElementById('make-style'))return;
 const s=document.createElement('style');s.id='make-style';
 s.textContent=`#make-card{position:fixed;z-index:45;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(420px,calc(100vw - 32px));padding:10px;border-radius:26px;
background:linear-gradient(160deg,rgba(255,255,255,.34),rgba(255,255,255,.12));border:1px solid rgba(255,255,255,.55);box-shadow:0 18px 40px rgba(20,16,10,.28),inset 0 1px 0 rgba(255,255,255,.7),inset 0 -8px 18px rgba(80,60,160,.12);color:#2c2418;font:600 15px/1.35 Manrope,system-ui,sans-serif}
#make-card[hidden]{display:none}
#make-card .mk-row{display:flex;gap:8px;align-items:center}
#make-card input{flex:1;min-width:0;height:46px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.7);background:rgba(255,253,246,.92);color:#2c2418;font:inherit;font-size:17px;outline:none}
#make-card input:focus{box-shadow:0 0 0 3px rgba(255,190,80,.55)}
#make-card button{font:inherit;cursor:pointer}
#make-card .mk-go{width:46px;height:46px;border-radius:50%;border:0;color:#fff;background:radial-gradient(circle at 35% 30%,#ffd36b,#ff7a59 55%,#c2418f);box-shadow:0 6px 14px rgba(194,65,143,.4),inset 0 1px 0 rgba(255,255,255,.6);display:grid;place-items:center}
#make-card .mk-go svg{width:24px;height:24px}
#make-card .mk-close{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.5);color:#2c2418;font-size:20px;line-height:1}
#make-card.mk-busy .mk-go{animation:mk-spin 1.1s linear infinite}
#make-card.mk-busy input{background:linear-gradient(90deg,#fff6df,#ffe7f3,#e6f0ff,#fff6df);background-size:300% 100%;animation:mk-shimmer 1.6s linear infinite}
@keyframes mk-spin{to{transform:rotate(360deg)}}@keyframes mk-shimmer{to{background-position:300% 0}}
#make-card .mk-say{margin:8px 6px 0;min-height:0;color:#fffaf0;text-shadow:0 1px 3px rgba(0,0,0,.45)}
#make-card .mk-say:empty{display:none}
#make-card .mk-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
#make-card .mk-chips:empty{display:none}
#make-card .mk-chips button{padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.7);background:rgba(255,253,246,.8);color:#2c2418;font-size:13px}
@media (prefers-reduced-motion:reduce){#make-card.mk-busy .mk-go,#make-card.mk-busy input{animation:none}}`;
 document.head.append(s);
}
