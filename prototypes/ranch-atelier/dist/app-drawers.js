(()=>{function init(){
 const header=document.querySelector('header'),nav=document.getElementById('left-navigation');if(!header||!nav)return;
 document.body.classList.add('drawer-layout');const mobile=()=>innerWidth<800;
 let collapsed=false;try{collapsed=localStorage.getItem('ranch-nav-collapsed')==='true';}catch{}
 function sync(){document.body.classList.toggle('nav-collapsed',collapsed);if(!mobile()){nav.inert=collapsed;document.getElementById('nav-toggle').setAttribute('aria-expanded',String(!collapsed));}window.dispatchEvent(new Event('ranch-layout'));window.RanchView?.changed();}
 for(const id of ['nav-toggle','nav-close'])document.getElementById(id).addEventListener('click',e=>{if(mobile())return;e.preventDefault();e.stopImmediatePropagation();collapsed=id==='nav-close'?true:!collapsed;try{localStorage.setItem('ranch-nav-collapsed',String(collapsed));}catch{}sync();window.dispatchEvent(new Event('resize'));},true);
 const panel=document.createElement('dialog');panel.id='app-controls';panel.setAttribute('aria-labelledby','app-controls-title');panel.innerHTML='<div class="app-controls-heading"><h2 id="app-controls-title">Page controls</h2><button id="app-controls-close" aria-label="Close controls">×</button></div><div id="app-controls-content"></div>';
 document.body.append(panel);const content=panel.lastElementChild,opener=document.createElement('button');opener.id='app-controls-toggle';opener.innerHTML='<span aria-hidden="true" class="drawer-grip"></span><span aria-hidden="true" class="drawer-chevron">‹</span>';opener.setAttribute('aria-label','Open controls drawer');opener.title='Open controls drawer';opener.setAttribute('aria-controls',panel.id);opener.setAttribute('aria-expanded','false');document.body.append(opener);
 function close(){panel.close();}function open(){if(panel.open)return;panel.append(opener);if(mobile())panel.showModal();else panel.show();opener.setAttribute('aria-expanded','true');opener.setAttribute('aria-label','Close controls drawer');opener.title='Close controls drawer';document.body.classList.add('controls-open');window.dispatchEvent(new Event('resize'));window.RanchView?.changed();}
 opener.onclick=()=>panel.open?close():open();panel.querySelector('button').onclick=close;panel.addEventListener('close',()=>{document.body.append(opener);opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-label','Open controls drawer');opener.title='Open controls drawer';document.body.classList.remove('controls-open');opener.focus();window.dispatchEvent(new Event('resize'));window.RanchView?.changed();});panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
 document.addEventListener('click',e=>{if(panel.open&&e.target.closest('#about,#journal,#rooms,#layers,#library'))close();});
 const selectors=['[data-character-studies] .panel','.controls','.map-tools','.grow-bar','.zoom','#back','.dock','.scene-tools','.study-tabs','#builder-panel','.study-heading','#method-choices','#quick-stages','#illustrator-tools .tools-scroll','#dorf-panel','.shelf','.stage-bottom','.subjects','#reset','.footer a[download]','header #about','header #library','#selection'];
 let initialControlsShown=false;
 function collect(){for(const selector of selectors)for(const el of document.querySelectorAll(selector)){if(panel.contains(el))continue;el.dataset.drawerControl='true';if(el.matches('.dock'))el.hidden=false;content.append(el);}const old=document.getElementById('tools-toggle');if(old)old.hidden=true;const wb=document.getElementById('wb-open');if(wb)wb.hidden=true;const wbclose=document.getElementById('wb-close');if(wbclose)wbclose.hidden=true;
  opener.hidden=!content.children.length;
  // Open once when controls arrive, including pages that load them asynchronously.
  if(!initialControlsShown&&content.children.length){initialControlsShown=true;open();}
 }
 collect();const observer=new MutationObserver(()=>collect());observer.observe(document.body,{childList:true,subtree:true});
 // A completed run should present its result in the drawer, not over the land.
 const result=document.getElementById('result');if(result)new MutationObserver(()=>{if(!result.hidden)open();}).observe(result,{attributes:true,attributeFilter:['hidden']});
 window.RanchDrawers={open,close};window.addEventListener('resize',()=>sync());sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
