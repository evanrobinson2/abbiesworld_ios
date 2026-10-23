// AW-STUDY-0013 picks: tap a choice to turn it green (one per group), then "Lock in" sends the picks to Evan's
// feedback inbox (/api/feedback), tagged with the café thread so they come back to it. Picks also stay on this device.
(function(){
 const THREAD='cmsg_01USVJqCbJruSGtaP4zsE2eY2AeiSPdmMRPB8fib4jGGE9', KEY='aw-cafe-picks-v1';
 const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}};
 const save=p=>{try{localStorage.setItem(KEY,JSON.stringify(p))}catch(e){}};
 let picks=load();
 const bar=document.createElement('div');bar.className='lockbar glass';
 bar.innerHTML='<span class="lk-sum"></span><button type="button" class="lk-btn">Lock in</button>';
 document.body.appendChild(bar);
 const sum=bar.querySelector('.lk-sum'),btn=bar.querySelector('.lk-btn');
 function paint(){
  document.querySelectorAll('[data-pick]').forEach(el=>{const [g,v]=el.dataset.pick.split('=');el.classList.toggle('picked',picks[g]&&picks[g].v===v)});
  const list=Object.values(strip());
  sum.textContent=list.length?list.map(p=>p.label).join(' · '):'Tap your picks';
  const locked=picks.__locked===JSON.stringify(strip());
  btn.disabled=!list.filter(p=>p.v).length||locked;btn.textContent=locked?'Locked in ✓':'Lock in';bar.classList.toggle('locked',locked);
  bar.classList.toggle('show',list.length>0);
 }
 function strip(){const o={};for(const k in picks)if(k!=='__locked')o[k]=picks[k];return o}
 document.addEventListener('click',e=>{
  const el=e.target.closest('[data-pick]');if(!el)return;e.preventDefault();e.stopPropagation();
  const [g,v]=el.dataset.pick.split('=');const label=el.dataset.label||v;
  const locked=picks.__locked;delete picks.__locked;
  if(picks[g]&&picks[g].v===v)delete picks[g];else picks[g]={v,label,group:el.dataset.group||g};
  if(locked)picks.__locked=locked;save(picks);paint();
 },true);
 btn.onclick=async()=>{
  const p=strip();const lines=Object.entries(p).map(([g,x])=>'- '+(x.group||g)+': '+x.label+' ('+x.v+')');
  btn.disabled=true;btn.textContent='Locking in…';
  try{
   const r=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    note:'AW-STUDY-0013 café picks, locked in on '+document.title+':\n'+lines.join('\n'),
    page:location.pathname,title:document.title,thread:THREAD,threadTitle:'AW-STUDY-0013 - The Coffee Shop',
    viewport:innerWidth+'x'+innerHeight,standalone:matchMedia('(display-mode: standalone)').matches})});
   if(!r.ok)throw Error(r.status);
   picks.__locked=JSON.stringify(p);save(picks);paint();
  }catch(err){btn.disabled=false;btn.textContent='Try again';}
 };
 window.cafePicksPaint=paint;paint();
})();
