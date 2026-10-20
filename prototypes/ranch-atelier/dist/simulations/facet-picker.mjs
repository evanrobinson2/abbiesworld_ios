// Same single-choice, light-dismiss interaction as the hex picker.
export function facetPicker(trigger,{name,choices,value,choose}){
 const menu=document.createElement('div');menu.id=trigger.id+'-choices';menu.className='facet-picker';menu.setAttribute('popover','auto');menu.setAttribute('role','listbox');menu.setAttribute('aria-label',name);document.body.append(menu);
 trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-controls',menu.id);trigger.setAttribute('aria-expanded','false');let wasOpen=false;
 trigger.onpointerdown=()=>{wasOpen=menu.matches(':popover-open');};
 menu.addEventListener('toggle',e=>trigger.setAttribute('aria-expanded',String(e.newState==='open')));
 trigger.onclick=()=>{if(wasOpen||menu.matches(':popover-open')){wasOpen=false;menu.hidePopover();return;}
 menu.replaceChildren();for(const [id,label]of choices){const b=document.createElement('button');b.textContent=label;b.type='button';b.setAttribute('role','option');b.setAttribute('aria-selected',String(id===value()));b.onclick=()=>{choose(id);menu.hidePopover();trigger.focus();};menu.append(b);}
 const r=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-138,r.left))+'px';menu.style.top=(r.bottom+7)+'px';menu.showPopover();(menu.querySelector('[aria-selected=true]')||menu.firstElementChild).focus();};
 menu.onkeydown=e=>{const options=[...menu.children],i=options.indexOf(document.activeElement);if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();options[e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowDown'?1:options.length-1))%options.length].focus();}};
}
