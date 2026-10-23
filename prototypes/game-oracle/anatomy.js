const $=s=>document.querySelector(s),dialogs=[...document.querySelectorAll('dialog')];
let catalog;
const labels={systems:'Systems',mechanics:'Mechanics',simulation:'Simulation','procedural-generation':'Proc. generation',ui:'UI',ux:'UX',rendering:'Rendering',assets:'Assets',audio:'Audio',models:'Models',binary:'Binary'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(d){dialogs.forEach(x=>{if(x!==d&&x.open)x.close()});if(!d.open)d.showModal()}
$('#nav-open').onclick=()=>show($('#navigation'));$('#tools-open').onclick=()=>show($('#tools'));
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
dialogs.forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));
function render(){
 const q=$('#query').value.trim().toLowerCase(),genre=$('#genre').value,domain=$('#domain').value;
 const games=catalog.games.filter(g=>(!genre||g.genre===genre)&&(!domain||g.claims.some(c=>c.domain===domain))&&(!q||JSON.stringify([g.title,g.genre,g.claims,g.nextPass]).toLowerCase().includes(q)));
 $('#result-count').textContent=`${games.length} / ${catalog.games.length} studies`;$('#filter-count').textContent=`${games.length} matching studies`;
 $('#studies').innerHTML=games.length?games.map(g=>`<article class="card"><div class="card-top"><div class="genre">${esc(g.genre)}</div><h3>${esc(g.title)}</h3><p class="finding-title">${esc(g.claims[0].title)}</p><p>${esc(g.claims[0].finding)}</p><div class="tags">${[...new Set(g.claims.map(c=>c.domain))].slice(0,3).map(d=>`<span class="tag">${esc(labels[d])}</span>`).join('')}</div></div><div class="card-foot"><span>${g.claims.length} findings · ${g.fileCount?g.fileCount.toLocaleString()+' files':(g.kind==='design-lesson'?'design literature':'extraction pending')}</span><button data-game="${esc(g.id)}" aria-label="Inspect ${esc(g.title)}">Inspect ↗</button></div></article>`).join(''):'<p class="empty">No studies match these filters.</p>';
 document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>openStudy(b.dataset.game));
}
function openStudy(id){
 const g=catalog.games.find(x=>x.id===id);if(!g)return;
 $('#game-select').value=id;$('#detail-title').textContent=g.title;
 $('#detail-body').innerHTML=`<p class="genre">${esc(g.genre)} · ${esc(g.version)}</p><p class="muted">${esc(g.sourceBasis)}</p><div class="detail-meta"><span class="tag">${g.kind==='design-lesson'?'Design lesson':'Partial study'}</span><span class="tag">${g.binaryRoutineObserved?'Isolated code tested':'Runtime unobserved'}</span>${g.binaryRoutineObserved?'<span class="tag">Gameplay unobserved</span>':''}</div>${g.claims.map(c=>`<section class="finding"><div class="basis">${esc(labels[c.domain])} · ${esc(c.basis)}</div><h3>${esc(c.title)}</h3><p>${esc(c.finding)}</p>${c.flow?`<dl class="flow">${Object.entries(c.flow).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`:''}<a href="${esc(c.evidence.url)}" target="_blank" rel="noopener">${esc(c.evidence.path)}${c.evidence.lines?' · lines '+c.evidence.lines.join('–'):''} ↗</a></section>`).join('')}<section class="detail-section"><h3>${g.kind==='design-lesson'?'Research record':'File inventory'}</h3><p>${g.fileCount.toLocaleString()} extracted files · ${g.imageFileCount.toLocaleString()} image headers read${g.packedResourceCount?' · '+g.packedResourceCount.toLocaleString()+' packed resource entries':''}</p><p class="muted">${esc(g.assetNote)} Standard model-file candidates: ${g.modelCandidates}.</p><table><thead><tr><th>Extension</th><th>Files</th></tr></thead><tbody>${Object.entries(g.extensions).slice(0,10).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.toLocaleString()}</td></tr>`).join('')}</tbody></table><p><a href="${esc(g.inventoryUrl)}" target="_blank" rel="noopener">Full inventory, package hashes and binary analysis · JSON ↗</a></p></section><section class="detail-section"><h3>Coverage</h3><div class="coverage">${Object.entries(g.coverage).map(([k,v])=>`<div class="${v==='not yet studied'?'unknown':''}"><span>${esc(labels[k])}</span><span>${v==='not yet studied'?'Unexamined':'Partial evidence'}</span></div>`).join('')}</div></section><section class="detail-section"><h3>Design lesson</h3><p class="lesson">${esc(g.lesson.text)}</p><p class="muted">${esc(g.lesson.status)}</p></section><section class="detail-section"><h3>Next pass</h3><p class="next">${esc(g.nextPass)}</p></section>`;
 const url=new URL(location.href);url.searchParams.set('game',id);history.replaceState(null,'',url);show($('#detail'));$('#detail').scrollTop=0;
}
$('#game-select').onchange=e=>openStudy(e.target.value);
$('#detail').addEventListener('close',()=>{const url=new URL(location.href);url.searchParams.delete('game');history.replaceState(null,'',url)});
$('#query').oninput=render;$('#genre').onchange=render;$('#domain').onchange=render;
$('#apply').onclick=()=>$('#tools').close();$('#reset').onclick=()=>{$('#query').value='';$('#genre').value='';$('#domain').value='';render()};
document.querySelectorAll('[data-term]').forEach(b=>b.onclick=()=>{$('#query').value=b.dataset.term;render()});
try{
 const res=await fetch('/data/game-anatomy.json');if(!res.ok)throw new Error(`Catalog returned ${res.status}`);catalog=await res.json(); const lr=await fetch('/data/design-lessons.json');if(!lr.ok)throw new Error('Design lessons unavailable');const lessons=await lr.json();catalog.games=[...lessons.studies,...catalog.games];catalog.counts.findings+=lessons.studies.reduce((n,g)=>n+g.claims.length,0);
 $('#stats').innerHTML=[['12','starting categories'],[catalog.counts.findings,'evidence-linked findings'],[catalog.counts.files.toLocaleString(),'files indexed']].map(([n,t])=>`<div class="stat"><strong>${n}</strong><span>${t}</span></div>`).join('');
 $('#revision').textContent='Updated '+new Date(catalog.updatedAt).toLocaleDateString();
 $('#genre').insertAdjacentHTML('beforeend',catalog.games.map(g=>`<option>${esc(g.genre)}</option>`).join(''));
 $('#domain').insertAdjacentHTML('beforeend',Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join(''));
 $('#game-select').innerHTML=catalog.games.map(g=>`<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('');render();
 const id=new URL(location.href).searchParams.get('game');if(id)openStudy(id);
}catch(e){$('#error').hidden=false;$('#error').textContent='Could not load studies. '+e.message;$('#stats').textContent='Unavailable';}
