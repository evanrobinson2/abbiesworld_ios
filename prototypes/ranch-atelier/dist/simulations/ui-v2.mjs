// Sandbox v2 play mode (Evan, 2026-10-23; docs/oracle/hud/HUD_STUDY.md). Three glass toys replace the web-page chrome:
// the sun dial (time, weather, pause, speed), the hand of cards (the tile preview cards) and the toy box (everything else).
// The v1 controls stay in the DOM with their own handlers; each toy calls the original control, so no feature is lost.
// The mode is chosen in index.html's boot script (html.ui-v2); "Classic layout" in the toy box switches back to v1.
if(document.documentElement.classList.contains('ui-v2'))start();

function start(){
 const root=document.documentElement,$=s=>document.querySelector(s);
 const press=sel=>{const el=typeof sel==='string'?$(sel):sel;el?.click();return !!el;};
 const svg=(body,view='0 0 24 24')=>`<svg viewBox="${view}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
 const I={
  talk:svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  scenes:svg('<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
  tiles:svg('<path d="m12 2.5 8 4.6v9.8l-8 4.6-8-4.6V7.1z"/><path d="m12 12 8-4.6M12 12v9.4M12 12 4 7.4"/>'),
  music:svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  workshop:svg('<path d="M3 21V10l5 3V10l5 3V6l8 4v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>'),
  feedback:svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.7A8 8 0 1 1 21 12z"/>'),
  explore:svg('<path d="M4 20V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h6M8 11h6"/>'),
  settings:svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  developer:svg('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>'),
  classic:svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M15 9v11"/>'),
  clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  weather:svg('<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.3 1.9A3 3 0 0 0 7 18z"/>'),
  season:svg('<path d="M12 21c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11z"/><path d="M12 21V9"/>'),
  speed:svg('<path d="M5 18a8 8 0 1 1 14 0"/><path d="m12 14 4-5"/>'),
  more:svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
  box:svg('<path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="color-mix(in srgb,var(--v2-accent) 30%,transparent)"/><path d="M3 6.5 12 4l9 2.5v3.5H3z" fill="color-mix(in srgb,var(--v2-accent) 55%,transparent)"/><path d="M10 14h4"/>','0 0 24 24')
 };
 const make=(tag,props={},html='')=>{const el=document.createElement(tag);Object.assign(el,props);if(html)el.innerHTML=html;return el;};
 const hold=(el,{tap,long,ms=450})=>{let timer=0,fired=false;el.addEventListener('pointerdown',e=>{if(e.button)return;fired=false;clearTimeout(timer);timer=setTimeout(()=>{fired=true;long();},ms);});
  for(const t of ['pointerup','pointerleave','pointercancel'])el.addEventListener(t,()=>clearTimeout(timer));
  el.addEventListener('click',e=>{e.preventDefault();if(fired){fired=false;return;}tap();});el.addEventListener('contextmenu',e=>{e.preventDefault();clearTimeout(timer);long();});};
 const closeAll=except=>{if(except!=='ring')ring.hidden=true;if(except!=='shelf')shelf.hidden=true;if(except!=='sheet')root.classList.remove('v2-sheet');};

 // Sun dial.
 const dial=make('button',{id:'v2-dial',className:'v2-toy v2-glass',type:'button'},
  `<svg class="v2-sky" viewBox="0 0 58 58" aria-hidden="true"><defs><linearGradient id="v2-sky-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc0f0"/><stop offset="1" stop-color="#d9f0ff"/></linearGradient></defs>
   <rect width="58" height="58" fill="url(#v2-sky-g)"/><path d="M0 40 Q15 33 29 37 T58 35 V58 H0z" fill="#8cbc5a"/><path d="M0 46 Q20 40 58 44 V58 H0z" fill="#6d9c45"/>
   <circle class="v2-orb" cx="29" cy="20" r="6.5" fill="#ffd34d" stroke="#fff6c8" stroke-width="2"/></svg>
   <span class="v2-nap"><i></i><i></i></span><span class="v2-weather v2-glass"></span><span class="v2-speed v2-glass"></span>`);
 dial.setAttribute('aria-label','Sun dial: tap to pause, hold for time, weather, season and speed');
 const ring=make('div',{id:'v2-dial-ring',className:'v2-toy v2-glass',hidden:true});
 for(const [icon,label,target]of [['clock','Time of day','#scene-clock-control'],['weather','Weather','#scene-weather-control'],['season','Season','#scene-season-control'],['speed','Speed','#simulation-speed']]){
  const b=make('button',{className:'v2-btn v2-glass',type:'button',title:label},I[icon]);b.setAttribute('aria-label',label);
  b.onclick=e=>{e.stopPropagation();press(target);};ring.append(b);}
 hold(dial,{tap:()=>{closeAll();press('#pause');syncDial();},long:()=>{closeAll('ring');ring.hidden=!ring.hidden;}});

 const sky={night:['#0d1838','#2b3d6b'],dawn:['#f7a35c','#ffe0b0'],day:['#7cc0f0','#d9f0ff'],dusk:['#d9735a','#ffc58a']};
 function parseHour(){const t=$('#scene-readouts .clock-time')?.textContent||'';const m=/(\d+):(\d+)\s*(AM|PM)/i.exec(t);if(!m)return null;let h=+m[1]%12+(m[3].toUpperCase()==='PM'?12:0);return h+ +m[2]/60;}
 function syncDial(){
  const h=parseHour();if(h!=null){const day=h>=6&&h<18,f=day?(h-6)/12:((h+6)%24)/12,a=Math.PI*(1-f),orb=dial.querySelector('.v2-orb');
   orb.setAttribute('cx',(29+22*Math.cos(a)).toFixed(1));orb.setAttribute('cy',(38-26*Math.sin(a)).toFixed(1));orb.setAttribute('fill',day?'#ffd34d':'#f4f1e3');orb.setAttribute('stroke',day?'#fff6c8':'#c9d3ea');
   const [top,bottom]=sky[h<5||h>=20?'night':h<8?'dawn':h<17?'day':'dusk'];const stops=dial.querySelectorAll('stop');stops[0].setAttribute('stop-color',top);stops[1].setAttribute('stop-color',bottom);
   dial.title=$('#scene-readouts .clock-time').textContent+' · '+($('#scene-readouts .clock-date')?.textContent||'');}
  const w=$('#scene-readouts .weather-symbol');const wb=dial.querySelector('.v2-weather');if(w&&wb.dataset.src!==w.innerHTML){wb.dataset.src=w.innerHTML;wb.innerHTML=w.innerHTML;wb.title=$('#scene-readouts .weather-name')?.textContent||'';}
  dial.classList.toggle('paused',!!$('#pause .play-icon')&&!$('#pause .play-icon').hidden);
  const pace=($('#simulation-speed .pace-badge')?.textContent||'').trim(),sp=dial.querySelector('.v2-speed');sp.textContent=pace;sp.classList.toggle('on',!!pace&&pace!=='›'&&pace!=='1×');
 }

 // Hand of cards: the real generator cards move here, keeping their tap, drag-to-board and live previews.
 const hand=make('div',{id:'v2-hand',className:'v2-toy'});
 const more=make('button',{id:'v2-hand-more',className:'v2-btn v2-glass',type:'button',title:'Tile options'},I.more);more.setAttribute('aria-label','Tile options');
 more.onclick=()=>toggleSheet();
 function toggleSheet(open=!root.classList.contains('v2-sheet')){closeAll('sheet');if(open&&document.body.classList.contains('scene-dropper-hidden'))press('#scene-dropper-toggle');root.classList.toggle('v2-sheet',open);}
 function adoptCards(){const cards=document.getElementById('current-scene-type');if(!cards)return false;if(cards.parentElement!==hand)hand.prepend(cards);fan();return true;}
 function fan(){const heroes=[...hand.querySelectorAll('.generator-hero')],n=heroes.length;heroes.forEach((h,i)=>{h.style.setProperty('--fan',((i-(n-1)/2)*5).toFixed(1)+'deg');if(!h.dataset.v2){h.dataset.v2='1';let wasPressed=false;h.addEventListener('pointerdown',()=>{wasPressed=h.getAttribute('aria-pressed')==='true';},true);h.addEventListener('click',()=>{if(wasPressed)toggleSheet();});}});}

 // Toy box: tap for the shelf, hold for the grown-up workbench.
 const box=make('button',{id:'v2-box',className:'v2-toy v2-glass',type:'button',title:'Toy box'},I.box+'<span class="v2-dot"></span>');box.setAttribute('aria-label','Toy box: tap for the shelf, hold for settings');
 const shelf=make('div',{id:'v2-shelf',className:'v2-toy v2-glass',hidden:true});shelf.setAttribute('role','menu');
 const items=[
  ['talk','Talk',()=>press('#live-toggle'),'talk'],['scenes','Scenes',()=>press('#compact-scene-title')||press('#library-open')],['tiles','Tile options',()=>toggleSheet(true)],
  ['music','Music',()=>press('#app-jukebox-toggle')],['workshop','Workshop',()=>press('.aw-fab')],['feedback','Feedback',()=>press('.afb-fab')],
  null,
  ['explore','Library',()=>press('.ex-door')],['settings','Settings',()=>press('#app-settings-toggle')],['developer','Developer',()=>press('#developer-toggle')],
  ['classic','Classic layout',()=>{try{localStorage.setItem('sandbox-ui','v1');}catch{}location.reload();}]];
 for(const item of items){if(!item){shelf.append(make('hr'));continue;}const [icon,label,run,tone]=item;
  const b=make('button',{type:'button'},`<span class="v2-btn v2-glass">${I[icon]}</span><span>${label}</span>`);b.setAttribute('role','menuitem');if(tone)b.dataset.tone=tone;
  b.onclick=e=>{e.stopPropagation();shelf.hidden=true;run();};shelf.append(b);}
 hold(box,{tap:()=>{closeAll('shelf');shelf.hidden=!shelf.hidden;},long:()=>{closeAll();press('#app-settings-toggle');}});

 document.body.append(dial,ring,hand,box,shelf);hand.append(more);

 // Touching the world puts summoned things away; idle tucks the hand so the world gets the bottom edge back.
 let idle=0;const wake=()=>{hand.classList.remove('tucked');clearTimeout(idle);idle=setTimeout(()=>{if(!root.classList.contains('v2-sheet')&&!hand.matches(':hover'))hand.classList.add('tucked');},6000);};
 addEventListener('pointerdown',e=>{wake();if(e.target.closest?.('#v2-dial,#v2-dial-ring,#v2-box,#v2-shelf,#v2-hand,#scene-tools-drawer,.facet-picker,dialog,[popover]'))return;if(e.target.tagName==='CANVAS')closeAll();},true);
 addEventListener('pointermove',e=>{if(e.clientY>innerHeight-160)wake();},{passive:true});wake();
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});

 // Keep in step with the v1 controls as the app builds them.
 const sync=()=>{adoptCards();syncDial();box.classList.toggle('busy',!!$('.aw-fab.working'));};
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','aria-pressed']});
 sync();
}
