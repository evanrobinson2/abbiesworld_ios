// Sign in to play: a small chip in the game's header. Signed-in players keep their worlds online
// (the same ranch everyone starts from, their own copy) and may use the paid AI up to their cap.
// Nothing is asked of players and nothing is promised. See ACCOUNTS.md.
(()=>{
 const KEYS=['abbies-simulations-v1','abbies-suburban-v1'],TAG='abbies-save-account',RESTORED='abbies-save-restored';
 const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
 const write=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v);return true;}catch{return false;}};
 const stamp=saves=>{let t=0;for(const v of Object.values(saves||{})){try{for(const i of JSON.parse(v)?.instances||[])t=Math.max(t,Number(i.updated)||0);}catch{}}return t;};
 const local=()=>{const s={};for(const k of KEYS){const v=read(k);if(v)s[k]=v;}return s;};
 let me=null,timer=0;

 async function upload(){
  const saves=local();if(!me?.signedIn||!Object.keys(saves).length)return;
  try{const r=await fetch('/api/me',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({updated:stamp(saves),saves})});
   if(r.ok){write(TAG,me.tag);status('Saved to your account');}}catch{}
 }
 function status(text){const el=document.getElementById('save-status');if(el)el.textContent=text;}

 // Bring this player's worlds to this device, or claim the worlds already here for them.
 async function sync(){
  let cloud=null;try{const r=await fetch('/api/me?save=1',{cache:'no-store'});if(r.ok)cloud=await r.json();}catch{return;}
  const here=local(),mine=read(TAG)===me.tag,cloudAt=Number(cloud?.updated)||stamp(cloud?.saves),hereAt=stamp(here);
  const take=cloud?.saves&&Object.keys(cloud.saves).length&&(!mine&&read(TAG)||cloudAt>hereAt+5000||!Object.keys(here).length);
  if(take){
   if(sessionStorage.getItem(RESTORED)===String(cloudAt))return;
   for(const k of KEYS)write(k,cloud.saves[k]??null);write(TAG,me.tag);
   try{sessionStorage.setItem(RESTORED,String(cloudAt));}catch{}
   return location.reload();
  }
  // Worlds left here by another account are already kept with that account: start this one fresh.
  if(!mine&&read(TAG)&&Object.keys(here).length){for(const k of KEYS)write(k,null);write(TAG,me.tag);return location.reload();}
  if(!mine||hereAt>cloudAt)upload();
 }

 function chip(){
  const header=document.querySelector('header');if(!header||document.getElementById('account-chip'))return;
  const css=document.createElement('style');css.textContent=`
#account-chip{font:inherit;font-size:13px;border-radius:999px;padding:6px 12px;border:1px solid rgba(255,255,255,.35);background:rgba(20,24,30,.55);color:#fff;cursor:pointer;backdrop-filter:blur(8px);white-space:nowrap}
#account-chip[data-in=true]{background:rgba(64,140,90,.75)}
#account-pop{position:fixed;z-index:60;top:56px;right:12px;max-width:min(320px,calc(100vw - 32px));padding:16px;border-radius:16px;background:rgba(22,26,32,.94);color:#f4f1ea;box-shadow:0 12px 40px rgba(0,0,0,.35);font-size:14px;line-height:1.4}
#account-pop p{margin:0 0 12px}#account-pop small{display:block;opacity:.7;margin-top:10px}
#account-pop a{display:inline-block;padding:9px 16px;border-radius:999px;background:#f4f1ea;color:#1b1f24;text-decoration:none;font-weight:600}`;
  document.head.append(css);
  const b=document.createElement('button');b.id='account-chip';b.type='button';
  const spacer=header.querySelector('.toolbar-spacer');(spacer?.nextSibling?header.insertBefore(b,spacer.nextSibling):header.append(b));
  const here=encodeURIComponent(location.pathname+location.search);
  const render=()=>{b.dataset.in=!!me?.signedIn;b.textContent=me?.signedIn?'Signed in':'Sign in';b.title=me?.signedIn?'Your worlds are kept with your account':'Sign in to keep your worlds';};
  b.onclick=()=>{
   let pop=document.getElementById('account-pop');if(pop)return pop.remove();
   pop=document.createElement('div');pop.id='account-pop';
   pop.innerHTML=me?.signedIn
    ?`<p>Your worlds are kept with your account, so they follow you to any device.</p><a href="/api/auth/logout">Sign out</a>`
    :`<p>Sign in with Google to keep your worlds and talk to the Computer. A grown-up signs in; it is free.</p><a href="/api/auth/login?return=${here}">Continue</a><small>We ask nothing of you and promise nothing.</small>`;
   document.body.append(pop);
  };
  document.addEventListener('pointerdown',e=>{const pop=document.getElementById('account-pop');if(pop&&!pop.contains(e.target)&&e.target!==b)pop.remove();});
  render();return render;
 }

 async function start(){
  try{const r=await fetch('/api/me',{cache:'no-store'});if(r.ok)me=await r.json();}catch{}
  if(!me?.signInReady&&!me?.signedIn)return;
  const render=chip();render?.();
  if(new URLSearchParams(location.search).get('signin')==='failed')status('Sign-in did not finish. Try again any time.');
  if(!me.signedIn)return;
  window.dispatchEvent(new CustomEvent('abbies-account',{detail:{signedIn:true,left:me.left}}));
  await sync();
  window.addEventListener('sandbox-autosaved',()=>{clearTimeout(timer);timer=setTimeout(upload,15000);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);upload();}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
