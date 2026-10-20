import {SCENE_TYPES} from './scene-registry.js';
const categories=[
 {name:'Production & resources',ids:['ranch','garden','woodland','pottery','preservation','seaside']},
 {name:'Daily life & exchange',ids:['home','animals','gathering','market']},
 {name:'Settlements & landmarks',ids:['castle','neighborhood','town']}
];
const purposes={ranch:'Homesteads, livestock care and working pasture.',garden:'Planting, tending and harvesting a farm.',woodland:'Working clearings for timber, regrowth and fuel.',pottery:'Clay preparation, kiln yards and vessel making.',preservation:'Food preservation and storage: roots, drying yards and pantries.',seaside:'Coastal landings, salt processing and boat repair.',home:'Shelter, cooking and shared household space.',animals:'Companion care, feeding and sheltered rest.',gathering:'Shared meals, meeting places and village commons.',market:'Stalls, goods and spaces for local exchange.',castle:'Fortified courtyards and landmark buildings.',neighborhood:'Homes arranged around shared streets and courtyards.',town:'A larger composition of homes, streets and market spaces.'};
const key='ranch-generator-favorites-v1';let favorites=[];try{const saved=JSON.parse(localStorage.getItem(key));if(Array.isArray(saved))favorites=saved.filter(x=>typeof x==='string');}catch{}
let category='All',query='';const $=id=>document.getElementById(id),title=s=>s.replace(/[-_]/g,' ').replace(/^./,c=>c.toUpperCase());
const entries=categories.flatMap(group=>group.ids.filter(id=>SCENE_TYPES[id]).map(id=>({...SCENE_TYPES[id],category:group.name,purpose:purposes[id]})));
function element(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function link(text,path,className){const e=element('a',text,className);e.href=path;return e;}
function render(){
 const results=entries.filter(s=>(category==='All'||s.category===category)&&(!$('favorites-only').checked||favorites.includes(s.id))&&[s.label,s.purpose,s.category,...s.presets].join(' ').toLowerCase().includes(query));
 $('generator-results').replaceChildren();$('generator-count').textContent=results.length+' of '+entries.length+' archetypes';
 for(const group of categories){const members=results.filter(s=>s.category===group.name);if(!members.length)continue;
  const section=element('section',null,'category-section'),grid=element('div',null,'category-grid');section.append(element('h2',group.name),grid);$('generator-results').append(section);
  for(const s of members){const card=element('article',null,'generator-card'),heading=element('div',null,'card-heading'),h=element('h3');card.dataset.archetype=s.id;h.append(link(s.label,s.expandedPath));
   const fav=element('button',favorites.includes(s.id)?'★':'☆','favorite');fav.setAttribute('aria-label','Favorite '+s.label);fav.setAttribute('aria-pressed',String(favorites.includes(s.id)));fav.onclick=()=>{favorites=favorites.includes(s.id)?favorites.filter(id=>id!==s.id):[...favorites,s.id];try{localStorage.setItem(key,JSON.stringify(favorites));}catch{}render();$('generator-results').querySelector('[data-archetype="'+s.id+'"] .favorite')?.focus();};heading.append(h,fav);
   const presets=element('div',null,'preset-links');for(const preset of s.presets)presets.append(link(title(preset),s.expandedPath+'?preset='+encodeURIComponent(preset)));
   card.append(heading,element('p',s.purpose),element('span','Start with a preset','preset-label'),presets,link('Open '+s.label+' →',s.expandedPath,'open-generator'));grid.append(card);
  }
 }
 if(!results.length)$('generator-results').append(element('p','No scenes match. Clear the filters or try another search.','empty-results'));
 window.RanchView?.changed();
}
for(const name of ['All',...categories.map(g=>g.name)]){const b=element('button',name==='All'?'All scenes':name);b.dataset.category=name;b.setAttribute('aria-pressed',String(name===category));b.onclick=()=>{category=name;syncCategories();render();};$('generator-categories').append(b);}
function syncCategories(){for(const b of $('generator-categories').children)b.setAttribute('aria-pressed',String(b.dataset.category===category));}
$('generator-search').oninput=e=>{query=e.target.value.trim().toLowerCase();render();};$('favorites-only').onchange=render;
$('clear-filters').onclick=()=>{category='All';query='';$('generator-search').value='';$('favorites-only').checked=false;syncCategories();render();};
window.RanchView?.register('generatorLibrary',()=>({category,query,favorites,availableTypes:entries.map(s=>s.id),results:$('generator-count').textContent}));render();
