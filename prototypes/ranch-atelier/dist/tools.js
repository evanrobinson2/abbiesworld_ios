import {icons} from '/ui-icons.js';
(()=>{
  const $=id=>document.getElementById(id), search=$('tool-search'), category=$('tool-category'), main=$('tool-main'), filters=$('tool-filters');
  let pages=[];
  const link=(label,href,cls)=>{const a=document.createElement('a');a.textContent=label;a.href=href;a.className=cls;return a;};
  const safe=href=>typeof href==='string'&&href.startsWith('/')&&!href.startsWith('//');
  function toolCue(p){const text=(p.title+' '+p.href).toLowerCase();for(const [pattern,cue] of [[/outbreak|zombie/,'zombies'],[/castle|tower|fort/,'castle'],[/garden|farm|crop|plant|orchard/,'garden'],[/wood|forest|tree/,'woodland'],[/animal|cow|sheep|horse|livestock/,'animals'],[/brain/,'brains'],[/market|shop|sales|store/,'market'],[/water|coast|sea|river/,'water'],[/terrain|map|landscape/,'terrain'],[/theme|style|color/,'palette'],[/ranch|house|home|room|bedroom/,'house'],[/unit|character|people/,'units']])if(pattern.test(text))return cue;return ({Play:'play','Scene generators':'world',Tools:'tools',Studies:'study',Places:'place',Assets:'assets',Sets:'scenarios',Pieces:'assets'})[p.category]||'tools';}
  function render(){
    const terms=search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const found=pages.filter(p=>(main.checked||!p.main)&&(!category.value||p.category===category.value)&&terms.every(t=>[p.title,p.description,p.category,p.href,...p.aliases].join(' ').toLowerCase().includes(t)));
    const fragment=document.createDocumentFragment();
    for(const p of found){
      const row=document.createElement('tr'), name=document.createElement('td'), group=document.createElement('td'), slug=document.createElement('td');
      const visual=link('',p.href,'tool-visual');const cue=toolCue(p);visual.innerHTML=icons[cue]||icons.tools;visual.dataset.kind=cue;visual.setAttribute('aria-label','Open '+p.title);name.className='tool-name';name.append(visual,link(p.title,p.href,'tool-title'));
      if(p.description){const description=document.createElement('p');description.className='tool-description';description.textContent=p.description;name.append(description);}
      const mobileGroup=document.createElement('span');mobileGroup.className='tool-mobile-category';mobileGroup.textContent=p.category;name.append(mobileGroup);
      group.className='tool-category';group.textContent=p.category;slug.append(link(p.href,p.href,'tool-slug'));
      if(p.aliases.length){const aliases=document.createElement('details'),summary=document.createElement('summary');aliases.className='tool-aliases';summary.textContent=p.aliases.length+' alternate URL'+(p.aliases.length===1?'':'s');aliases.append(summary,...p.aliases.map(h=>link(h,h,'tool-slug')));slug.append(aliases);}
      row.append(name,group,slug);fragment.append(row);
    }
    $('tool-rows').replaceChildren(fragment);$('tool-empty').hidden=found.length>0;$('tool-count').textContent=found.length+' pages';$('tools-table-scroll').scrollTop=0;window.RanchView?.changed();
  }
  window.RanchView?.register('tools',()=>({query:search.value,category:category.value,includeMain:main.checked,total:pages.length,visible:document.querySelectorAll('#tool-rows tr').length,visualCues:true}));
  const query=new URLSearchParams(location.search);search.value=query.get('q')||'';
  function sync(){const query=new URLSearchParams();if(search.value.trim())query.set('q',search.value.trim());if(category.value)query.set('category',category.value);if(main.checked)query.set('all','1');history.replaceState(null,'',location.pathname+(query.size?'?'+query:''));render();}
  search.addEventListener('input',sync);category.addEventListener('change',sync);main.addEventListener('change',sync);
  $('tool-filter-toggle').onclick=()=>{filters.open=!filters.open;};filters.addEventListener('toggle',()=>{$('tool-filter-toggle').setAttribute('aria-expanded',String(filters.open));});
  const categoryHome=category.parentElement, afterCategory=category.nextSibling;
  const media=matchMedia('(max-width:799px)');function layout(){if(media.matches)filters.querySelector('div').prepend(category);else categoryHome.insertBefore(category,afterCategory);}media.addEventListener('change',layout);layout();
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&filters.open){filters.open=false;$('tool-filter-toggle').focus();}});
  fetch('/tools-catalog.json').then(r=>{if(!r.ok)throw Error('Directory could not load.');return r.json();}).then(data=>{
    pages=data.pages.filter(p=>safe(p.href)).map(p=>({...p,aliases:p.aliases.filter(safe)}));
    for(const name of [...new Set(pages.map(p=>p.category))]){const option=document.createElement('option');option.value=name;option.textContent=name;category.append(option);}
    if([...category.options].some(o=>o.value===query.get('category')))category.value=query.get('category');main.checked=query.get('all')==='1';$('tool-loading').hidden=true;render();
  }).catch(()=>{$('tool-loading').textContent='The directory could not load. Reload to try again.';});
})();
