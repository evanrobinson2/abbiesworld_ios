import {initLiquidGlass} from './liquid-glass.mjs';
// Responsive shell only: retain the original controls and their event handlers.
export function compactWorkspace({icon}) {
 const header=document.querySelector('header'),panel=document.querySelector('#panel');
 const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href=new URL('./compact-workspace.css',import.meta.url).href;document.head.append(stylesheet);const polish=document.createElement('link');polish.rel='stylesheet';polish.href=new URL('./workspace-polish.css',import.meta.url).href;document.head.append(polish);initLiquidGlass();
 const title=document.createElement('button');title.id='compact-scene-title';title.setAttribute('aria-expanded','false');title.setAttribute('aria-controls','scene-readouts compact-scene-summary');
 const name=document.createElement('span'),chevron=document.createElement('span');chevron.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';chevron.setAttribute('aria-hidden','true');title.append(name,chevron);header.prepend(title);
 const summary=document.createElement('aside');summary.id='compact-scene-summary';summary.setAttribute('aria-label','Scene summary');document.body.append(summary);
 const sync=()=>{const label=document.querySelector('#label')?.textContent||'Scene';name.textContent=label;title.setAttribute('aria-label',label+': scene information');summary.textContent=label+' · '+(document.querySelector('#stats')?.textContent||'');};
 sync();const observer=new MutationObserver(sync);observer.observe(document.querySelector('.live-status'),{subtree:true,childList:true,characterData:true});
 title.onclick=()=>{const open=document.body.classList.toggle('scene-information-open');title.setAttribute('aria-expanded',String(open));};
 const dropper=document.createElement('button');dropper.id='scene-dropper-toggle';dropper.innerHTML=icon('tiles');dropper.setAttribute('aria-controls','panel tile-chooser');header.append(dropper);
 let hidden=false;try{hidden=localStorage.getItem('scene-dropper-hidden')==='true';}catch{}
 const applyDropper=()=>{document.body.classList.toggle('scene-dropper-hidden',hidden);dropper.setAttribute('aria-expanded',String(!hidden));dropper.setAttribute('aria-pressed',String(!hidden));dropper.setAttribute('aria-label',(hidden?'Show':'Hide')+' tile tools');dropper.removeAttribute('title');document.dispatchEvent(new CustomEvent('tile-tools-visibility',{detail:{open:!hidden}}));};
 applyDropper();dropper.onclick=()=>{hidden=!hidden;if(hidden){const chooser=document.querySelector('#tile-chooser');if(chooser?.matches(':popover-open'))chooser.hidePopover();}else{panel.hidden=false;document.querySelector('#settings').setAttribute('aria-expanded','true');}applyDropper();try{localStorage.setItem('scene-dropper-hidden',String(hidden));}catch{}};
 const menu=document.createElement('div');menu.id='compact-controls';menu.setAttribute('popover','auto');menu.setAttribute('aria-label','More scene controls');document.body.append(menu);
 const more=document.createElement('button');more.id='compact-controls-toggle';more.innerHTML=icon('sliders');more.setAttribute('aria-label','More scene controls');more.setAttribute('popovertarget',menu.id);more.setAttribute('aria-expanded','false');header.append(more);
 menu.addEventListener('toggle',()=>{const open=menu.matches(':popover-open');more.setAttribute('aria-expanded',String(open));if(open){document.body.classList.remove('scene-information-open');title.setAttribute('aria-expanded','false');}});
 const groups=['toolbar-calendar','toolbar-tools'].map(id=>{const group=document.getElementById(id),anchor=document.createComment(id);group.before(anchor);return {group,anchor};});
 const media=matchMedia('(max-width:760px)');
 const adapt=()=>{if(menu.matches(':popover-open'))menu.hidePopover();for(const {group,anchor}of groups){if(media.matches)menu.append(group);else anchor.after(group);}document.body.classList.toggle('compact-mobile',media.matches);document.body.classList.remove('scene-information-open');title.setAttribute('aria-expanded','false');};
 media.addEventListener('change',adapt);adapt();
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.body.classList.remove('scene-information-open');title.setAttribute('aria-expanded','false');}});
}
