// The model library: every distinct 3D file we have made, as an asset shelf (dist/models/library.json, built by
// tools/model-library/build.py). Big pictures, a collection rail, search, filters for source, place, type and status, and
// a detail sheet with the model turning. Models on the review desk open there; the rest open here.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST = (() => { try { return JSON.parse(localStorage.getItem('aw-lib') || '{}'); } catch { return {}; } })();
const save = () => { try { localStorage.setItem('aw-lib', JSON.stringify({size: S.size, group: S.group, stages: S.stages})); } catch {} };
const S = {q:'', col:null, place:null, source:null, type:null, status:null, group: ST.group || 'collection', size: ST.size || 190, stages: !!ST.stages, sel: null};
const FACETS = [['source','Source'], ['type','Type'], ['place','Place'], ['status','Status']];
const STATUS = {reviewed:'On the review desk', unreviewed:'In the game files, not reviewed', branch:'Only on an unmerged branch'};
const SRCDOT = {Meshy:'#7a4bd1', Printables:'#d8801f', Blender:'#2e7d6e', Catalogue:'#4a74b5', 'Midjourney + Blender':'#c2487e', 'AI written code':'#7d7d86'};
// Where library.json and the pictures live; a preview page can point this at its own folder.
const BASE = window.LIB_BASE || '/models/';
const pic = u => u && BASE !== '/models/' ? u.replace('/models/', BASE) : u;
let data = null, items = [], root = null, view = [];
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';

function filtered(ignore){
  const q = S.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(e => {
    if (!S.stages && e.level === 'stage' && !q.length) return false;
    if (ignore !== 'col' && S.col && e.collection !== S.col) return false;
    for (const [k] of FACETS) if (k !== ignore && S[k] && e[k === 'status' ? 'status' : k] !== S[k]) return false;
    if (q.length){ const hay = `${e.name} ${e.collection} ${e.place} ${e.source} ${e.type} ${e.id || ''} ${e.file}`.toLowerCase(); if (!q.every(w => hay.includes(w))) return false; }
    return true;
  });
}
const count = (list, k) => list.reduce((m, e) => (m[e[k]] = (m[e[k]] || 0) + 1, m), {});
const tile = e => `<button type="button" class="lt${S.sel === e.key ? ' on' : ''}" data-k="${e.key}" title="${esc(e.name)}">
  <span class="lp">${e.thumb ? `<img src="${pic(e.thumb)}" alt="" loading="lazy" decoding="async">` : '<i class="nopic"></i>'}${e.status === 'reviewed' ? '<b class="lr" title="On the review desk"></b>' : ''}${e.level === 'stage' ? '<em class="ls">stage</em>' : ''}</span>
  <span class="ln">${esc(e.name)}</span><span class="lm"><i style="background:${SRCDOT[e.source] || '#888'}"></i>${esc(e.type)}${e.copies > 1 ? ` · ${e.copies} copies` : ''}</span></button>`;

function draw(){
  view = filtered();
  const all = items.filter(e => S.stages || e.level !== 'stage');
  const cols = Object.entries(count(filtered('col'), 'collection')).sort((a, b) => b[1] - a[1]);
  const sizeVar = `--ts:${S.size}px`;
  let groups = [['', view]];
  if (S.group !== 'none'){
    const m = new Map(); view.forEach(e => { const g = e[S.group] || 'Other'; (m.get(g) || m.set(g, []).get(g)).push(e); });
    groups = [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }
  const chips = FACETS.map(([k, label]) => {
    const c = Object.entries(count(filtered(k), k === 'status' ? 'status' : k)).sort((a, b) => b[1] - a[1]);
    return `<div class="lf"><span>${label}</span>${c.map(([v, n]) => `<button type="button" class="ch" data-f="${k}" data-v="${esc(v)}" aria-pressed="${S[k] === v}">${k === 'source' ? `<i style="background:${SRCDOT[v] || '#888'}"></i>` : ''}${esc(k === 'status' ? STATUS[v] || v : v)} <b>${n}</b></button>`).join('')}</div>`;
  }).join('');
  const stagesN = items.filter(e => e.level === 'stage').length;
  root.innerHTML = `<div class="lib" style="${sizeVar}">
  <header class="lh"><div><h1>Models</h1><small>${view.length.toLocaleString()} of ${all.length.toLocaleString()} shown</small></div>
    <label class="ls2"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><input id="lq" type="search" value="${esc(S.q)}" placeholder="Search ${all.length.toLocaleString()} models" autocomplete="off" enterkeyhint="search"></label>
    <div class="lcontrols"><label>Group <select id="lg">${[['collection','Study'],['place','Place'],['source','Source'],['type','Type'],['status','Status'],['none','None']].map(([k, l]) => `<option value="${k}"${S.group === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="lz">Size <input id="lz" type="range" min="110" max="320" step="10" value="${S.size}" aria-label="Picture size"></label>
    <button type="button" class="ch tog" id="lstages" aria-pressed="${S.stages}">Build stages and clips <b>${stagesN}</b></button></div></header>
  <div class="lbody"><nav class="lrail" aria-label="Studies and collections"><button type="button" class="lc${S.col ? '' : ' on'}" data-col="">All <b>${cols.reduce((s, c) => s + c[1], 0)}</b></button>${cols.map(([c, n]) => `<button type="button" class="lc${S.col === c ? ' on' : ''}" data-col="${esc(c)}">${esc(c)} <b>${n}</b></button>`).join('')}</nav>
  <main class="lmain"><div class="lfs">${chips}${(S.col || S.place || S.source || S.type || S.status || S.q) ? '<button type="button" class="ch clr" id="lclear">Clear filters</button>' : ''}</div>
  ${view.length ? groups.map(([g, l]) => `<section class="lg">${g ? `<h2>${esc(S.group === 'status' ? STATUS[g] || g : g)} <b>${l.length}</b></h2>` : ''}<div class="lgrid">${l.map(tile).join('')}</div></section>`).join('') : '<p class="empty">Nothing matches. Clear a filter or search for something else.</p>'}
  </main></div><div id="lsheet" class="lsheet" hidden></div></div>`;
  if (S.sel) sheet(S.sel, true);
}

function sheet(key, keepScroll){
  const e = items.find(x => x.key === key), el = root.querySelector('#lsheet');
  if (!e){ el.hidden = true; return; }
  S.sel = key;
  const i = view.findIndex(x => x.key === key);
  const pic = e.glb ? `<model-viewer class="lv" src="${esc(e.glb)}" camera-controls touch-action="pan-y" auto-rotate auto-rotate-delay="1500" rotation-per-second="18deg" camera-orbit="-35deg 68deg auto" shadow-intensity="0.8" exposure="0.9" environment-image="neutral" interaction-prompt="none" poster="${esc(pic(e.thumb) || '')}"></model-viewer>`
    : `<div class="lv still">${e.thumb ? `<img src="${pic(e.thumb)}" alt="">` : ''}<p>${e.branch ? 'This one lives on an unmerged branch' : 'This file is kept in the repo as a source'}, not on the site, so it shows as a picture.</p></div>`;
  const rows = [['Study', e.collection], ['Place', e.place], ['Source', e.source], ['Type', e.type], ['Status', STATUS[e.status]], ['Size', fmt(e.bytes)], ...(e.branch ? [['Branch', e.branch]] : []), ['Kept as', e.copies > 1 ? `${e.copies} identical copies in the repo` : 'one file'], ['File', `<code>${esc(e.file.replace('prototypes/ranch-atelier/dist/', ''))}</code>`]];
  el.innerHTML = `<div class="lback" data-close></div><aside><header><button type="button" class="pb" data-lstep="-1" ${i <= 0 ? 'disabled' : ''} aria-label="Previous">‹</button><h2>${esc(e.name)}</h2><button type="button" class="pb" data-lstep="1" ${i < 0 || i >= view.length - 1 ? 'disabled' : ''} aria-label="Next">›</button><button type="button" class="pb x" data-close aria-label="Close">×</button></header>
    ${pic}<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${k === 'File' ? v : esc(v)}</dd>`).join('')}</dl>
    <div class="lact">${e.id ? `<a class="btn" href="/models/${encodeURIComponent(e.id)}" data-desk="${esc(e.id)}">Review it on the desk</a>` : ''}${e.glb ? `<a class="btn ghost" href="${esc(e.glb)}" download>Download</a>` : ''}${e.source_info ? `<a class="btn ghost" href="${esc(e.source_info)}" target="_blank" rel="noopener">The original</a>` : ''}</div></aside>`;
  el.hidden = false;
  root.querySelectorAll('.lt.on').forEach(t => t.classList.remove('on'));
  root.querySelector(`.lt[data-k="${key}"]`)?.classList.add('on');
}
const close = () => { S.sel = null; const el = root.querySelector('#lsheet'); el.hidden = true; el.innerHTML = ''; root.querySelectorAll('.lt.on').forEach(t => t.classList.remove('on')); };

function wire(){
  root.addEventListener('click', ev => {
    const t = ev.target.closest('button, a, [data-close]'); if (!t) return;
    if (t.dataset.k){ sheet(t.dataset.k); return; }
    if (t.dataset.col !== undefined && t.classList.contains('lc')){ S.col = t.dataset.col || null; draw(); scrollTo({top:0}); return; }
    if (t.dataset.f){ S[t.dataset.f] = S[t.dataset.f] === t.dataset.v ? null : t.dataset.v; draw(); return; }
    if (t.id === 'lclear'){ Object.assign(S, {q:'', col:null, place:null, source:null, type:null, status:null}); draw(); return; }
    if (t.id === 'lstages'){ S.stages = !S.stages; save(); draw(); return; }
    if ('close' in t.dataset) return close();
    if (t.dataset.lstep){ const n = view[view.findIndex(x => x.key === S.sel) + +t.dataset.lstep]; if (n) sheet(n.key); return; }
  });
  root.addEventListener('input', ev => {
    if (ev.target.id === 'lq'){ S.q = ev.target.value; clearTimeout(wire.t); wire.t = setTimeout(() => { const f = root.querySelector('#lq'), pos = f.selectionStart; draw(); const g = root.querySelector('#lq'); g.focus(); g.setSelectionRange(pos, pos); }, 160); }
    if (ev.target.id === 'lz'){ S.size = +ev.target.value; root.querySelector('.lib').style.setProperty('--ts', S.size + 'px'); save(); }
  });
  root.addEventListener('change', ev => { if (ev.target.id === 'lg'){ S.group = ev.target.value; save(); draw(); } });
  addEventListener('keydown', ev => {
    if (!root.querySelector('.lib') || ev.target.closest('input, select, textarea')) return;
    if (ev.key === 'Escape') close();
    if (S.sel && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')){ const n = view[view.findIndex(x => x.key === S.sel) + (ev.key === 'ArrowRight' ? 1 : -1)]; if (n) sheet(n.key); }
    if (ev.key === '/'){ ev.preventDefault(); root.querySelector('#lq')?.focus(); }
  });
}
let wired = false;
export async function mount(el){
  root = el; document.title = 'Models'; el.classList.add('libwrap');
  if (!data){
    el.innerHTML = '<p class="loading">Opening the library…</p>';
    try { data = await (await fetch(BASE + 'library.json')).json(); items = data.items; } catch { el.innerHTML = '<p class="empty">The library could not load. Try again.</p>'; return; }
  }
  if (!wired){ wire(); wired = true; }
  draw();
}
export function unmount(){ root?.classList.remove('libwrap'); }
