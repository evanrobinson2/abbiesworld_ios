// Sandbox v2 play mode (Evan, 2026-10-23; docs/oracle/hud/HUD_STUDY.md). Three glass toys replace the web-page chrome:
// the chronograph (time, weather, season, pause, speed and pinned dials; chrono.mjs), the hand of cards (the tile preview cards) and the toy box (everything else).
// The v1 controls stay in the DOM with their own handlers; each toy calls the original control, so no feature is lost.
// The mode is chosen in index.html's boot script (html.ui-v2); "Classic layout" in the toy box switches back to v1.
import {mountChrono} from './chrono.mjs?v=3';
import {cardFace,cardArt,setCardArt} from './hand-cards.mjs?v=13';
import {openCallout,closeCallout} from '../look/callout.mjs?v=2';
import {inventory} from './inventory.mjs?v=4';
if(document.documentElement.classList.contains('ui-v2'))start();

function start(){
 const root=document.documentElement,$=s=>document.querySelector(s);
 const press=sel=>{const el=typeof sel==='string'?$(sel):sel;el?.click();return !!el;};
 // Tapping a person, thing or tile opens its card as a callout beside it (look/callout.mjs) instead of the v1 side panel.
 // The card docks on the far right; if it would cover what was tapped, the view slides left so the thing stays in sight.
 addEventListener('ranch:inspect',({detail:d})=>openCallout({name:d.name,kind:d.kind,description:d.description,hero:d.hero,focal:[],anchor:d.anchor,clear:slideView,onClose:()=>press('#close-inspection')}));
 function slideView(dx){const rc=window.RanchCamera;if(!rc?.camera||!rc.orbit)return;const {T,camera,orbit}=rc,h=rc.canvas?.clientHeight||innerHeight;
  const dist=camera.position.distanceTo(orbit.target),perPx=camera.isPerspectiveCamera?2*dist*Math.tan(camera.fov*Math.PI/360)/h:(camera.top-camera.bottom)/camera.zoom/h;
  const right=new T.Vector3().setFromMatrixColumn(camera.matrix,0).multiplyScalar(dx*perPx),from=orbit.target.clone(),cam=camera.position.clone(),t0=performance.now();
  rc.stopFollow?.();const step=now=>{const k=Math.min(1,(now-t0)/380),e=1-Math.pow(1-k,3);orbit.target.copy(from).addScaledVector(right,e);camera.position.copy(cam).addScaledVector(right,e);orbit.update();if(k<1)requestAnimationFrame(step);};requestAnimationFrame(step);}
 addEventListener('ranch:inspect-close',()=>closeCallout({silent:true}));
 const svg=(body,view='0 0 24 24')=>`<svg viewBox="${view}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
 const I={cards:svg('<rect x="4" y="3" width="11" height="16" rx="2"/><path d="M15 6l4 1.5-4 13.5-6-1.6"/><path d="M7 13l2-3 2 2 2-3"/>'),
  make:svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z"/>'),
  talk:svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  scenes:svg('<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
  tiles:svg('<path d="m12 2.5 8 4.6v9.8l-8 4.6-8-4.6V7.1z"/><path d="m12 12 8-4.6M12 12v9.4M12 12 4 7.4"/>'),
  music:svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  workshop:svg('<path d="M3 21V10l5 3V10l5 3V6l8 4v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>'),
  feedback:svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.7A8 8 0 1 1 21 12z"/>'),
  town:svg('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
  explore:svg('<path d="M4 20V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 7h6M8 11h6"/>'),
  account:svg('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
  settings:svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  developer:svg('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>'),
  classic:svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M15 9v11"/>'),
  clock:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  weather:svg('<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.3 1.9A3 3 0 0 0 7 18z"/>'),
  season:svg('<path d="M12 21c-4-3-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-3 8-7 11z"/><path d="M12 21V9"/>'),
  speed:svg('<path d="M5 18a8 8 0 1 1 14 0"/><path d="m12 14 4-5"/>'),
  pause:svg('<path d="M9 5v14M15 5v14" stroke-width="3"/>'),
  play:svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  plus:svg('<path d="M12 6v12M6 12h12" stroke-width="2.4"/>'),
  todo:svg('<path d="M9 7h11M9 12h11M9 17h11"/><path d="m3.5 7 1.2 1.2L7 5.8M3.5 12l1.2 1.2L7 10.8"/>'),
  guests:svg('<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-4 3-6 5.5-6s5 2 5.5 6M13.5 19.5c.4-3 2-4.5 3.5-4.5s3.2 1.5 3.5 4.5"/>'),
  hungry:svg('<path d="M4 13h16l-1.5 6h-13z"/><path d="M8 13c0-3 1.5-5 4-5s4 2 4 5"/>'),
  feed:svg('<path d="M5 20 7 8h10l2 12z"/><path d="M9 8c0-2 1-4 3-4s3 2 3 4M9 13h6"/>'),
  water:svg('<path d="M12 3c3.5 4.5 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.5-6.5 6-11z"/>'),
  people:svg('<circle cx="12" cy="7" r="3.5"/><path d="M5 21c.6-5 3.4-7.5 7-7.5s6.4 2.5 7 7.5"/>'),
  seasonSpring:svg('<path d="M12 21v-8M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 13c4 0 6-3 6-7-4 0-6 3-6 7z"/>'),
  seasonSummer:svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>'),
  seasonAutumn:svg('<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14z"/><path d="M5 19 13 11"/>'),
  seasonWinter:svg('<path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>'),
  tour:svg('<path d="M4 7h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4z"/><path d="m17 11 4-2.5v7L17 13"/>'),
  more:svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'),
  box:svg('<path d="M4 10h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="color-mix(in srgb,var(--v2-accent) 30%,transparent)"/><path d="M3 6.5 12 4l9 2.5v3.5H3z" fill="color-mix(in srgb,var(--v2-accent) 55%,transparent)"/><path d="M10 14h4"/>','0 0 24 24')
 };
 const make=(tag,props={},html='')=>{const el=document.createElement(tag);Object.assign(el,props);if(html)el.innerHTML=html;return el;};
 const hold=(el,{tap,long,ms=450})=>{let timer=0,fired=false;el.addEventListener('pointerdown',e=>{if(e.button)return;fired=false;clearTimeout(timer);timer=setTimeout(()=>{fired=true;long();},ms);});
  for(const t of ['pointerup','pointerleave','pointercancel'])el.addEventListener(t,()=>clearTimeout(timer));
  el.addEventListener('click',e=>{e.preventDefault();if(fired){fired=false;return;}tap();});el.addEventListener('contextmenu',e=>{e.preventDefault();clearTimeout(timer);long();});};
 const closeAll=except=>{if(except!=='shelf')shelf.hidden=true;if(except!=='sheet')root.classList.remove('v2-sheet');};

 // The chronograph (chrono.mjs): time of day, pause and speed pushers, weather, season and pinned dials.
 const chrono=mountChrono({press,icons:I});
 // Abbie's backpack hangs on the chronograph once she carries something (inventory.mjs).
 inventory();

 // Hand of cards: the real generator cards move here, keeping their tap, drag-to-board and live previews.
 const hand=make('div',{id:'v2-hand',className:'v2-toy'});
 const more=make('button',{id:'v2-hand-more',className:'v2-btn v2-glass',type:'button',title:'Tile options'},I.more);more.setAttribute('aria-label','Tile options');
 more.onclick=()=>toggleSheet();
 function toggleSheet(open=!root.classList.contains('v2-sheet')){closeAll('sheet');if(open&&document.body.classList.contains('scene-dropper-hidden'))press('#scene-dropper-toggle');root.classList.toggle('v2-sheet',open);}
 function adoptCards(){const cards=document.getElementById('current-scene-type');if(!cards)return false;if(cards.parentElement!==hand)hand.prepend(cards);fan();return true;}
 function fan(){const heroes=[...hand.querySelectorAll('.generator-hero')],n=heroes.length;heroes.forEach((h,i)=>{h.style.setProperty('--fan',((i-(n-1)/2)*1.5).toFixed(1)+'deg');if(!h.dataset.v2){h.dataset.v2='1';cardFace(h);}});}

 // Toy box: tap for the shelf, hold for the grown-up workbench.
 // It wears a small square </> mark in the corner beside the version, like a website's maker mark, so it reads as the
 // developer's signature rather than something to play with (Evan, 2026-10-23); it still opens the shelf.
 const box=make('button',{id:'v2-box',className:'v2-toy',type:'button',title:'Toy box'},'<b aria-hidden="true">&lt;/&gt;</b><span class="v2-dot"></span>');box.setAttribute('aria-label','Toy box: tap for the shelf, hold for settings');
 const shelf=make('div',{id:'v2-shelf',className:'v2-toy v2-glass',hidden:true});shelf.setAttribute('role','menu');
 const items=[
  ['talk','Talk',()=>press('#live-toggle'),'talk'],['make','Make',()=>press('#make-toggle'),'talk'],['scenes','Scenes',()=>press('#compact-scene-title')||press('#library-open')],['tiles','Tile options',()=>toggleSheet(true)],
  ['cards',cardArt()==='concept'?'Cards: concept':'Cards: in game',()=>{const next=cardArt()==='concept'?'ingame':'concept';setCardArt(next);const b=shelf.querySelector('[data-item=cards]');if(b)b.lastElementChild.textContent=next==='concept'?'Cards: concept':'Cards: in game';}],
  ['music','Music',()=>press('#app-jukebox-toggle')],['workshop','Workshop',()=>press('.aw-fab')],['feedback','Feedback',()=>press('.afb-fab')],
  null,
  ['tour','Welcome tour',()=>window.AbbiesWelcome?.open()],['town',"Abbie's Town",()=>{location.href='/town';}],['explore','Library',()=>press('.ex-door')],['account','Sign in',()=>press('#account-chip')],['settings','Settings',()=>press('#app-settings-toggle')],['developer','Developer',()=>press('#developer-toggle')],
  ['classic','Classic layout',()=>{try{localStorage.setItem('sandbox-ui','v1');}catch{}location.reload();}]];
 for(const item of items){if(!item){shelf.append(make('hr'));continue;}const [icon,label,run,tone]=item;
  const b=make('button',{type:'button'},`<span class="v2-btn v2-glass">${I[icon]}</span><span>${label}</span>`);b.setAttribute('role','menuitem');b.dataset.item=icon;if(tone)b.dataset.tone=tone;
  b.onclick=e=>{e.stopPropagation();shelf.hidden=true;run();};shelf.append(b);}
 hold(box,{tap:()=>{closeAll('shelf');shelf.hidden=!shelf.hidden;},long:()=>{closeAll();press('#app-settings-toggle');}});

 document.body.append(hand,box,shelf);hand.append(more);

 // Touching the world puts summoned things away; idle tucks the hand so the world gets the bottom edge back.
 let idle=0;const wake=()=>{hand.classList.remove('tucked');clearTimeout(idle);idle=setTimeout(()=>{if(!root.classList.contains('v2-sheet')&&!hand.matches(':hover'))hand.classList.add('tucked');},2500);};
 // Hovering the lowered hand lifts the whole hand as it is (Evan, 2026-10-23); leaving it starts the tuck timer again.
 hand.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')wake();});hand.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')wake();});
 addEventListener('pointerdown',e=>{wake();
  // The tile sheet closes on any tap outside it (not only on the world), so it can never trap the player.
  if(root.classList.contains('v2-sheet')&&!e.target.closest?.('#scene-tools-drawer,#v2-hand,.facet-picker,dialog,[popover]'))root.classList.remove('v2-sheet');
  if(e.target.closest?.('#v2-chrono,#v2-chrono-pop,#v2-box,#v2-shelf,#v2-hand,#scene-tools-drawer,.facet-picker,dialog,[popover]'))return;if(e.target.tagName==='CANVAS')closeAll();},true);
 // The sheet's × belongs to v1's drawer and toggles the v1 dropper, which left the v2 sheet open and re-toggling (Evan, 2026-10-23:
 // "caught in a loop that wouldn't close"). In v2 it just puts the sheet away.
 addEventListener('click',e=>{if(e.target.closest?.('#scene-tools-drawer .tile-tools-heading button')){e.preventDefault();e.stopPropagation();root.classList.remove('v2-sheet');}},true);
 addEventListener('pointermove',e=>{if(e.clientY>innerHeight-160)wake();},{passive:true});wake();
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();});

 // Keep in step with the v1 controls as the app builds them.
 const sync=()=>{adoptCards();chrono.sync();
  // Sign in (account.js) shows on the shelf once the site can sign people in, and says whether you are.
  const chip=$('#account-chip'),acct=shelf.querySelector('[data-item=account]');if(acct){acct.hidden=!chip;const t=chip?.textContent||'Sign in',label=acct.lastElementChild;if(label.textContent!==t)label.textContent=t;}
  box.classList.toggle('busy',!!$('.aw-fab.working'));};
 let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','class','aria-pressed']});
 sync();
}
