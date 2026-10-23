// Tiles drawer, reorganised around the tile type (Evan, 2026-10-22).
// The original controls stay in the page and keep their handlers; this layer gives them a compact face:
// picture chips for tile types, an inset Randomize and big/small view on the live tile, three-step
// toggles instead of sliders, and accordions instead of pop-out panels.
import {uiIcon} from './ui-icons.mjs?v=4';
import {SHAPES,shapeIcon} from './ranch-shapes.mjs?icons=5';

const THUMBS={ranch:'ranch',garden:'garden',meadow:'meadow',moon:'moon'};
const SIZE=[[70,'Small'],[100,'Medium'],[150,'Large']];
const COMPLEXITY=[[1,'Simple'],[2,'Lively'],[4,'Busy']];
const MODEL_STYLE=[['normal','Normal'],['charming','Charming']];   // simulations/model-style.mjs
const VIEW_KEY='tile-drawer-view';

function css(){if(document.querySelector('link[data-tile-drawer]'))return;const l=document.createElement('link');l.rel='stylesheet';l.dataset.tileDrawer='';l.href=new URL('./tile-drawer.css?v=1',import.meta.url).href;document.head.append(l);}

// Three choices standing in for one slider or number input (or a select, matched by value); the input stays the source of truth.
function steps(input,choices,{label,event='change'}){
 const group=document.createElement('div');group.className='td-steps';group.setAttribute('role','radiogroup');group.setAttribute('aria-label',label);
 const name=document.createElement('span');name.className='td-steps-label';name.textContent=label;group.append(name);
 const row=document.createElement('div');row.className='td-steps-row';if(choices.length!==3)row.style.gridTemplateColumns=`repeat(${choices.length},minmax(0,1fr))`;group.append(row);
 const buttons=choices.map(([value,text])=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=text;b.dataset.value=value;b.onclick=()=>{if(b.disabled)return;input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));if(event==='change')input.dispatchEvent(new Event('change',{bubbles:true}));sync();};row.append(b);return b;});
 // The nearest step lights up, so values set elsewhere (saved scenes, old sliders) still read sensibly.
 const sync=()=>{const v=Number(input.value);let best=buttons.find(b=>b.dataset.value===input.value),gap=best?0:Infinity;best??=buttons[0];if(gap)for(const b of buttons){const d=Math.abs(Number(b.dataset.value)-v);if(d<gap){gap=d;best=b;}}for(const b of buttons){b.setAttribute('aria-checked',String(b===best));b.disabled=input.disabled;}};
 sync();new MutationObserver(sync).observe(input,{attributes:true});input.addEventListener('input',sync);input.addEventListener('change',sync);
 return {group,sync};
}

// Min, middle and max of a placement axis.
function axisChoices(input){const min=Number(input.min),max=Number(input.max),mid=Math.round((min+max)/2);return [[min,'Low'],[mid,'Medium'],[max,'High']];}

function section(name,title,body,{open=false}={}){
 const d=document.createElement('details');d.className='td-section';d.name='tile-drawer';d.dataset.section=name;d.open=open;
 const s=document.createElement('summary');s.innerHTML='<span></span>'+uiIcon('chevron');s.querySelector('span').textContent=title;d.append(s);
 const inner=document.createElement('div');inner.className='td-section-body';if(body)inner.append(...[].concat(body));d.append(inner);return d;
}

export function designDrawer({drawer,panel,heroTrack,worldSettings,options,reroll,generatorLabel}){
 css();drawer.classList.add('td');
 let view='small';try{view=localStorage.getItem(VIEW_KEY)||'small';}catch{}
 const applyView=()=>{drawer.dataset.view=view;viewButton.innerHTML=uiIcon(view==='big'?'smallHex':'largeHex');viewButton.title=viewButton.ariaLabel=view==='big'?'Small view':'Big view';viewButton.setAttribute('aria-pressed',String(view==='big'));};

 // Picture chips: each tile type shows its diorama instead of a line icon.
 for(const hero of heroTrack.querySelectorAll('.generator-hero')){const id=hero.dataset.generator,art=hero.querySelector('.generator-hero-art');if(!THUMBS[id]||art.querySelector('img'))continue;const img=new Image();img.className='td-thumb';img.alt='';img.decoding='async';img.src=new URL('./assets/tile-thumbs/'+THUMBS[id]+'.webp',import.meta.url).href;img.onerror=()=>img.remove();art.prepend(img);}

 // Inset tools on the live tile: Randomize re-rolls it, the view button swaps big and small.
 const tools=document.createElement('div');tools.className='td-card-tools';
 const dice=document.createElement('button');dice.type='button';dice.className='td-dice';dice.innerHTML=uiIcon('dice');dice.title=dice.ariaLabel='Randomize this tile';dice.onclick=()=>{dice.classList.remove('td-rolled');void dice.offsetWidth;dice.classList.add('td-rolled');reroll();};
 const viewButton=document.createElement('button');viewButton.type='button';viewButton.className='td-view';viewButton.onclick=()=>{view=view==='big'?'small':'big';try{localStorage.setItem(VIEW_KEY,view);}catch{}applyView();};
 tools.append(dice,viewButton);panel.append(tools);applyView();

 // Per-type quick settings become three-step toggles; the full list moves into an accordion.
 const axes=panel.querySelector('.placement-axes'),details=panel.querySelector('.placement-details'),advancedToggle=panel.querySelector('.placement-advanced');
 if(advancedToggle)advancedToggle.hidden=true;
 const decorateAxes=()=>{for(const label of axes.querySelectorAll('label')){const input=label.querySelector('input[type=range]');if(!input||label.dataset.td)continue;label.dataset.td='1';label.hidden=true;const {group}=steps(input,axisChoices(input),{label:input.getAttribute('aria-label')||label.title,event:'input'});group.classList.add('td-axis');label.after(group);}
  for(const g of axes.querySelectorAll('.td-axis'))if(!g.previousElementSibling?.dataset.td)g.remove();};
 new MutationObserver(decorateAxes).observe(axes,{childList:true});decorateAxes();
 const facet=panel.querySelector('.placement-facet'),facetSelect=facet?.querySelector('select');
 const facetChips=document.createElement('div');facetChips.className='td-facets';facetChips.setAttribute('role','radiogroup');facetChips.setAttribute('aria-label','Tile kind');
 const renderFacets=()=>{if(!facetSelect)return;const opts=[...facetSelect.options];facetChips.replaceChildren();facet.hidden=opts.length<=4&&opts.length>1;facetChips.hidden=!facet.hidden;for(const o of opts){const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.textContent=o.textContent;b.setAttribute('aria-checked',String(o.value===facetSelect.value));b.onclick=()=>{facetSelect.value=o.value;facetSelect.dispatchEvent(new Event('change',{bubbles:true}));renderFacets();};facetChips.append(b);}};
 if(facetSelect){new MutationObserver(renderFacets).observe(facetSelect,{childList:true});facetSelect.addEventListener('change',()=>requestAnimationFrame(renderFacets));facet.after(facetChips);renderFacets();}
 const typeSettings=section('type','Tile options',details);details.hidden=false;
 const retitle=()=>{typeSettings.querySelector('summary span').textContent=(generatorLabel()||'Tile')+' tile options';};
 new MutationObserver(retitle).observe(details,{childList:true});retitle();
 panel.after(typeSettings);

 // This ranch: size and detail, layout, configuration and backdrop, one open at a time.
 const ranch=document.createElement('div');ranch.className='td-ranch';
 const heading=document.createElement('div');heading.className='td-group-title';heading.textContent='This ranch';ranch.append(heading);
 const size=document.querySelector('#size'),complexity=document.querySelector('#complexity');
 const sizeSteps=size&&steps(size,SIZE,{label:'Size'}),detailSteps=complexity&&steps(complexity,COMPLEXITY,{label:'Buildings'});
 const style=document.querySelector('#model-style'),styleSteps=style&&steps(style,MODEL_STYLE,{label:'Model style'});
 ranch.append(section('size','Size & detail',[sizeSteps?.group,detailSteps?.group,styleSteps?.group].filter(Boolean),{open:true}));

 const layout=document.createElement('div');layout.className='td-layouts';layout.setAttribute('role','radiogroup');layout.setAttribute('aria-label','Hex layout');
 const renderLayouts=()=>{const current=document.querySelector('#shape-open');const chosen=current?.querySelector('svg')?.outerHTML;layout.replaceChildren();for(const [id,shape]of Object.entries(SHAPES)){const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.dataset.shape=id;b.title=b.ariaLabel=shape.name;b.innerHTML=shapeIcon(id,true)+'<span>'+shape.name+'</span>';b.setAttribute('aria-checked',String(!!chosen&&shapeIcon(id,true)===chosen));b.onclick=()=>chooseLayout(id);layout.append(b);}};
 // The layout list is the same one the hex button used to pop out; choosing still goes through it.
 const chooseLayout=id=>{const open=document.querySelector('#shape-open');if(!open||open.disabled)return;open.click();const pick=document.querySelector('#shape-dialog [data-shape="'+id+'"]');if(pick)pick.click();else document.querySelector('#shape-dialog')?.hidePopover?.();requestAnimationFrame(renderLayouts);};
 const layoutSection=section('layout','Layout',layout);layoutSection.addEventListener('toggle',()=>{if(layoutSection.open)renderLayouts();});ranch.append(layoutSection);

 const configure=section('configure','More settings',null);ranch.append(configure);
 const adoptAdvanced=()=>{const advanced=document.querySelector('#advanced-panel');if(!advanced||advanced.parentElement===configure.lastElementChild)return !!advanced;advanced.hidden=false;configure.lastElementChild.append(advanced);document.querySelector('#advanced-open')?.setAttribute('hidden','');return true;};
 const backdropBody=section('backdrop','Backdrop',null);ranch.append(backdropBody);
 const adoptBackdrop=()=>{const b=worldSettings.querySelector('.world-backdrop-picker')||document.querySelector('.world-backdrop-picker');if(b&&b.parentElement!==backdropBody.lastElementChild)backdropBody.lastElementChild.append(b);return !!b;};
 drawer.append(ranch);worldSettings.hidden=true;
 if(!(adoptAdvanced()&&adoptBackdrop())){const watch=new MutationObserver(()=>{if(adoptAdvanced()&adoptBackdrop())watch.disconnect();});watch.observe(document.body,{childList:true,subtree:true});setTimeout(()=>watch.disconnect(),60000);}

 return {sync(){sizeSteps?.sync();detailSteps?.sync();styleSteps?.sync();retitle();}};
}
