// /models is a review desk. Each model shows what was asked for (the concept and its prompt) beside what was built
// (a 3D model to turn) in one row, with comments and the three verdict buttons on the right; one thin bar of facts sits
// above and one of details below. /models opens the next model still to review; /models/<id> opens that one. Moving between
// models swaps the page in place, so a hands-free voice session keeps listening from one model to the next.
// Catalogue sources, first that answers wins: window.MODELS_CATALOG_URL, /api/models, then /models/manifest.json.
// Verdicts go to /api/model-reviews, which also drops each one in the feedback inbox for the modelers.
// The 3D library is 935 KB and only upgrades <model-viewer> elements, so it loads beside the page, never in front of it.
import('/vendor/model-viewer.min.js').catch(() => {});

const SOURCES = [window.MODELS_CATALOG_URL, '/api/models', '/models/manifest.json'].filter(Boolean);
const LABEL = {accept:'Kept', adjust:'Note sent', reject:'Rejected'};
const root = document.getElementById('root'), crumb = document.getElementById('crumb') || document.createElement('div');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const pct = x => Math.round(100 * x) + '%';
const LS = 'models-reviews-v1';
// Small copies of the reference pictures (tools/models-thumbs/make.py): 's' for the strip, 'm' for the grid. A picture
// without one (a stored model not yet thumbnailed) falls back to the full image, once.
const thumb = (u, k) => /^\/models\/.+\.(jpe?g|png)$/i.test(u || '') ? u.replace(/\.(jpe?g|png)$/i, `.${k}.webp`) : u;
const thumbImg = (u, k, extra = '') => `<img src="${esc(thumb(u, k))}" alt="" loading="lazy" decoding="async"${thumb(u, k) !== u ? ` onerror="this.onerror=null;this.src='${esc(u)}'"` : ''}${extra}>`;

let list = [], reviews = {}, cur = null, view = 'review', filter = 'todo', handsFree = false, pending = null, voiceLine = '', voiceKind = '', gridShow = 'art', flipped = new Set();
try { reviews = JSON.parse(localStorage.getItem(LS) || '{}'); } catch {}
const keep = () => { try { localStorage.setItem(LS, JSON.stringify(reviews)); } catch {} };

async function fetchList(url){
  try {
    const r = await fetch(url, {headers:{accept:'application/json'}});
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return [];
    const j = await r.json(), l = Array.isArray(j) ? j : j.models;
    return Array.isArray(l) ? l : [];
  } catch { return []; }
}
// The first source that answers wins; models in the bundled manifest that the stored catalogue doesn't list yet
// (a preview, or a deploy before the model-store sync has run) are added in the manifest's order.
// Speed (Evan, 2026-10-23: "too slow to load"): the bundled manifest is a static file, so the page paints from it at once.
// The stored catalogue (/api/models, which waits on R2 and can take seconds) is asked in parallel and merged in when it
// answers; its entries win for the models it lists, and the page only redraws if it brings something new.
const MANIFEST = '/models/manifest.json';
const merge = (stored, bundled) => {
  const have = new Set(stored.map(m => m.id)), extra = bundled.filter(m => !have.has(m.id));
  const order = new Map(bundled.map((m, i) => [m.id, i]));
  return [...stored, ...extra].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
};
const storedSources = () => SOURCES.filter(u => u !== MANIFEST);
async function storedCatalogue(){
  for (const url of storedSources()){ const l = await fetchList(url); if (l.length) return l; }
  return [];
}
async function catalogue(){
  const bundled = await fetchList(MANIFEST);
  return {bundled, first: bundled.length ? bundled : await storedCatalogue()};
}
async function loadReviews(){
  try {
    const r = await fetch('/api/model-reviews', {headers:{accept:'application/json'}});
    if (r.ok) { const j = await r.json(); if (j && j.reviews) { reviews = {...reviews, ...j.reviews}; keep(); } }
  } catch {}
}
const todo = () => list.filter(m => !reviews[m.id]);
const shown = () => filter === 'all' ? list : filter === 'todo' ? todo() : list.filter(m => reviews[m.id]?.verdict === filter);
const counts = () => ({todo: todo().length, accept: 0, adjust: 0, reject: 0, all: list.length, ...Object.values(reviews).reduce((c, r) => (list.some(m => m.id === r.id) && (c[r.verdict] = (c[r.verdict] || 0) + 1), c), {})});

// ---------- rendering ----------
function chips(){
  const c = counts();
  return `<div class="rbar"><div class="seg" role="group" aria-label="Show">${[['todo','To review'],['accept','Accepted'],['adjust','Adjust'],['reject','Rejected'],['all','All']].map(([k, l]) =>
    `<button type="button" data-filter="${k}" aria-pressed="${filter === k}">${l} <b>${c[k] || 0}</b></button>`).join('')}</div>
    <button type="button" class="gridbtn" data-view="${view === 'grid' ? 'review' : 'grid'}">${view === 'grid' ? 'Back to reviewing' : 'See them all'}</button></div>`;
}

// The library (Evan, 2026-10-23: "give me a better way to browse"): every model we have, not only the ones on the desk.
function library(){
  crumb.innerHTML = '<a href="/models">Models</a>';
  import('/models/library.js?v=6').then(l => l.mount(root));
}
// The browser (Evan, 04:00Z): every model as a small version of the review card, a framed print and the model standing
// free beside it. One wordless toggle: Row shows one card at a time to swipe through, Screen shows them all as a grid.
let browse = (() => { try { return localStorage.getItem('aw-browse') || 'screen'; } catch (e) { return 'screen'; } })();
function grid(){
  document.title = 'Models';
  crumb.innerHTML = set ? `<a href="/studies/">Studies</a> · ${esc(set.title)}` : '<a href="/models">Models</a>';
  const ms = shown(), row = browse === 'row';
  applyLook(null);
  const toggle = `<div class="tools"><div class="lay" role="group" aria-label="Layout">${[['row', 'One at a time', 'row'], ['screen', 'All at once', 'grid']].map(([k, l, i]) =>
    `<button type="button" class="peb" data-browse="${k}" aria-label="${l}" aria-pressed="${browse === k}">${ico(i)}</button>`).join('')}</div><button type="button" class="peb" id="gear" aria-label="Look" aria-expanded="false">${ico('gear')}</button></div><div class="gearpop" id="gearpop" hidden role="group" aria-label="Look">${gearPop()}</div>`;
  root.innerHTML = `<header class="awbar hero"><div class="nm"><div class="ttl"><h1>Models</h1><small>Each model beside the picture it came from</small></div></div>${toggle}</header>` + chips() +
    (ms.length ? `<div class="${row ? 'rowcards' : 'cards'}">${ms.map(m => { const r = reviews[m.id]; return `
    <a class="mc" href="/models/${encodeURIComponent(m.id)}" data-open="${esc(m.id)}">
      <span class="mn"><strong>${esc(titleCase(m.name))}</strong>${m.style ? `<small>${esc(m.style)}</small>` : ''}<i class="dot ${r ? r.verdict : ''}" title="${r ? LABEL[r.verdict] : 'To review'}"></i></span>
      <span class="mpair"><span class="mprint">${thumbImg(m.urls.ref, 'm')}${row && (m.ask || m.subject) ? `<em>“${esc(m.ask || m.subject)}”</em>` : ''}</span>
      <span class="malive"><model-viewer src="${esc(m.urls.glb)}" alt="3D model of the ${esc(m.name.toLowerCase())}" loading="lazy" reveal="auto" camera-orbit="${+(m.orbit || [-30])[0]}deg ${+(m.orbit || [0, 72])[1]}deg auto"${row ? ' camera-controls touch-action="pan-y" auto-rotate rotation-per-second="14deg"' : ''} interaction-prompt="none" environment-image="neutral" shadow-intensity="0.7" exposure="0.8"></model-viewer></span></span></a>`; }).join('')}</div>`
    : `<p class="empty">Nothing here yet.</p>`);
}

// The look (docs/design/look/LOOK.md): one top bar (AW, the model's name, wordless counters, gear, camera, cart), the
// inspiration and the model as two equal squares with numbered focal points on both, notes below, and Reject / Chat /
// Keep under the right thumb. Chat is one modality: talk or type in the same place, and it goes to the modeler.
const ICON = {
  todo:'<path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  accept:'<path d="M4.5 12.5 10 18 19.5 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  adjust:'<path d="M13 7 4 16a2 2 0 0 0 3 3l9-9" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M11 5l3-3 7 7-3 3Z" fill="currentColor"/>',
  reject:'<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  gear:'<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  cart:'<path d="M2.5 4h3l2.4 10.5a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.4-1.1L21 8H7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="19.5" r="1.6" fill="currentColor"/><circle cx="17" cy="19.5" r="1.6" fill="currentColor"/>',
  row:'<rect x="3" y="6" width="18" height="12" rx="2" fill="currentColor"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor"/><rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor"/>',
  left:'<path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  right:'<path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  send:'<path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  plus:'<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
};
const ico = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
// Names read in Title Case (Evan, 03:51Z); small joining words stay lower case.
const titleCase = s => String(s).replace(/\S+/g, (w, i) => i && /^(a|an|and|at|for|in|of|on|or|the|to|with)$/i.test(w) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1));
// The modeler's notes stay in the manifest as written; the page shows them in plain words (Evan, 04:58Z: no
// technobabble). Sentences about scores, seeds and renders are dropped, measurements in brackets go, and "the hero"
// becomes "your picture".
const JARGON = /\bIoU\b|\bseed\b|\bpx\b|\bsamples?\b|SSIM|\bscor(e|ed|es|ing)\b|\bthe AD\b|\bAD\b|\bround \d|\bmean\b|±|\bW\/L\b|\bloss\b|\btriangles?\b|\bbudget\b|\b0\.\d{2,}\b|[-+][XYZ]\b/i;
function plainNote(note){
  const said = String(note).split(/(?<=[.!?])\s+(?=[A-Z])/).filter(t => !JARGON.test(t)).map(t => t
    .replace(/\s*\([^)]*\d[^)]*\)/g, '')
    .replace(/\bthe (?:turnaround )?sheet's front and side views\b/gi, 'the side views').replace(/\bthe hero (?!(?:wins|has|is|was|shows|keeps|uses|reads|looks|leans|sits|stands|camera)\b)(?=[a-z]{3,}\b)/gi, 'your picture\u2019s ').replace(/\bthe hero's\b/gi, 'your picture\u2019s').replace(/\bthe hero\b/gi, 'your picture').replace(/\bhero\b/gi, 'picture')
    .replace(/\b(the )?turnaround sheet('s)?\b/gi, (w, a, b) => 'the side views' + (b ? '\u2019' : '')).replace(/\bthe sheet('s)?\b/gi, (w, b) => 'the side views' + (b ? '\u2019' : ''))
    .replace(/\bsheet views?\b/gi, 'side views').replace(/\bthe side views wants\b/gi, 'the side views want').replace(/\btile size\b/gi, 'game size').replace(/\s{2,}/g, ' ').trim()).join(' ');
  return said.length > 14 ? said[0].toUpperCase() + said.slice(1) : '';
}
// Models that come from outside (Printables and the like) always show where they came from, who made them and the licence.
const sourceLine = m => { const s = m.source; if (!s || !s.url) return '';
  const by = s.authorUrl ? `<a href="${esc(s.authorUrl)}" target="_blank" rel="noopener">${esc(s.author)}</a>` : esc(s.author);
  return `<p class="srcline"><b>Source</b> ${esc(s.site)}${s.title ? ` · “${esc(s.title)}”` : ''} · by ${by} · ${esc(s.licence)} · <a href="${esc(s.url)}" target="_blank" rel="noopener">View the original</a>${s.credit ? `<span>${esc(s.credit)}</span>` : ''}</p>`; };
const plainList = xs => (xs || []).map(plainNote).filter(Boolean);
const FAIR = {fair:'Fair', close:'Close', off:'Off'};
const MOTIFS = [['default','Default'],['rome','Rome'],['efficient','Efficient']];
// Two modes (Evan, 04:03Z). App mode is the flat look (Default, Rome, Efficient) and the default from the Studies and
// app.abbies.world; Game mode is the toy-table look under the world's sky (docs/design/look/motifs.json), with its styles.
// Each switcher can flip to the other. ?mode=game or ?mode=app picks one for a link.
const GAME = [
  {id:'ranch', name:'Ranch'},
  {id:'gallery', name:'Gallery', c:{'--sky-top':'#2f3744','--sky-low':'#9aa0aa','--hill-far':'#5c6372','--hill':'#454c5a','--tile':'#f5f2ec','--tile-edge':'#8f897e','--signc':'#2f3744','--ink':'#22252b','--ink-soft':'#5b6069'}},
  {id:'legion', name:'Legion', c:{'--sky-top':'#4a1716','--sky-low':'#efcf9c','--hill-far':'#8b8a5a','--hill':'#5f6b34','--tile':'#f5f0e6','--tile-edge':'#a8916a','--signc':'#9e2a22','--ink':'#2b1a14','--ink-soft':'#6b5446'}},
  {id:'moon', name:'Moonbase', c:{'--sky-top':'#0c1a3c','--sky-low':'#4a7fae','--hill-far':'#8a96a6','--hill':'#b4bcc8','--tile':'#eef4fb','--tile-edge':'#8aa0b8','--signc':'#2b5d8a','--ink':'#14243a','--ink-soft':'#4c5f78'}},
  {id:'sea', name:'Under the sea', c:{'--sky-top':'#0d6585','--sky-low':'#86e3d8','--hill-far':'#f2d9a6','--hill':'#e6c483','--tile':'#f0fbfa','--tile-edge':'#5fb0b0','--signc':'#127a8a','--ink':'#0f3a40','--ink-soft':'#3f6d72'}},
  {id:'spooky', name:'Spooky', c:{'--sky-top':'#2a1842','--sky-low':'#e88442','--hill-far':'#4a3048','--hill':'#24182c','--tile':'#fff1dc','--tile-edge':'#8a5a2a','--signc':'#4a2a5a','--ink':'#2a1830','--ink-soft':'#6a4a5a'}},
  {id:'candy', name:'Candy party', silly:true, c:{'--sky-top':'#ff9fd0','--sky-low':'#fff2a6','--hill-far':'#a6ecd0','--hill':'#5ed0a2','--tile':'#fff7fb','--tile-edge':'#ff8cc0','--signc':'#ff5fa2','--ink':'#4a1a3a','--ink-soft':'#8a4a6e'}}
];
const GVARS = ['--sky-top','--sky-low','--hill-far','--hill','--tile','--tile-edge','--signc','--ink','--ink-soft'];
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return null; };
const pageMode = () => { const q = new URLSearchParams(location.search).get('mode'); if (q === 'game' || q === 'app') return q; return store('aw-mode') || 'app'; };
// The style comes from the one theme system (theme/boot.js writes the tokens and data-mode); the gear opens the
// shared profile and settings sheet at Style. Candy Party keeps its wobble.
function applyLook(){
  const r = document.documentElement;
  GVARS.forEach(k => r.style.removeProperty(k));
  r.classList.toggle('silly', r.dataset.awTheme === 'candy');
}
addEventListener('aw-look-change', () => applyLook());
const fbOff = () => store('aw-models-fb') === 'off';
document.documentElement.classList.toggle('fb-off', fbOff());
import('/theme/appnav.mjs').then(n => n.mountAppNav({current: 'models'}));
function gearPop(){
  const r = document.documentElement, mode = r.dataset.mode || 'app';
  const items = mode === 'game' ? GAME.map(g => `<button type="button" data-gstyle="${g.id}" aria-pressed="${r.dataset.motif === 'game-' + g.id}">${g.name}</button>`)
    : MOTIFS.map(([k, l]) => `<button type="button" data-motif="${k}" aria-pressed="${r.dataset.motif === k}">${l}</button>`);
  return `<div class="modes" role="group" aria-label="Mode">${[['app','App'],['game','Game']].map(([k, l]) => `<button type="button" data-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('')}</div>${items.join('')}`;
}
const motifFor = m => { try { const v = localStorage.getItem('aw-motif'); if (v) return v; } catch {} return /paper warrior|roman/i.test(m.group || '') ? 'rome' : 'default'; };
function topbar(m, seq, i){
  const c = counts();
  const counter = (k, label) => `<button type="button" class="ctr ${k}" data-filter="${k}" aria-pressed="${filter === k}" aria-label="${label}: ${c[k] || 0}"><i>${ico(k === 'todo' ? 'todo' : k)}</i><b>${c[k] || 0}</b></button>`;
  const sub = [m.group, m.style === 'charming' ? 'Charming' : '', seq.length > 1 ? `${i + 1} of ${seq.length}` : ''].filter(Boolean).join(' \u00b7 ');
  return `<header class="awbar hero">
    <div class="nm"><button type="button" class="peb" data-step="-1" aria-label="Previous model" ${i <= 0 ? 'disabled' : ''}>${ico('left')}</button>
      <div class="ttl"><h1>${esc(titleCase(m.name))}</h1>${sub ? `<small>${esc(sub)}</small>` : ''}</div>
      <button type="button" class="peb" data-step="1" aria-label="Next model" ${i >= seq.length - 1 ? 'disabled' : ''}>${ico('right')}</button></div>
    <div class="tools">
      <div class="ctrs" role="group" aria-label="Which models">${counter('todo','To look at')}${counter('accept','Kept')}${counter('adjust','Notes sent')}${counter('reject','Rejected')}</div>
      <button type="button" class="peb" data-view="${set ? 'grid' : 'library'}" aria-label="See them all">${ico('grid')}</button>
      <button type="button" class="peb" id="gear" aria-label="Look" aria-expanded="false">${ico('gear')}</button>
      <button type="button" class="peb" id="cam" aria-label="Take a photo to make into a model">${ico('camera')}</button>
      <button type="button" class="peb" id="cart" aria-label="Request more">${ico('cart')}<span class="badge" id="badge"${orders.length ? '' : ' hidden'}>${orders.length}</span></button>
      <button type="button" class="peb" id="fbtoggle" aria-label="Show or hide your feedback" aria-pressed="${!fbOff()}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg></button>
    </div>
  </header>`;
}

function review(){
  const ms = shown();
  if (!cur || !list.some(m => m.id === cur)) cur = (ms[0] || todo()[0] || list[0]).id;
  const m = list.find(x => x.id === cur), r = reviews[m.id], seq = ms.some(x => x.id === m.id) ? ms : list, i = seq.findIndex(x => x.id === m.id);
  document.title = m.name + ' · Models';
  applyLook(m);
  const [theta, phi] = m.orbit || [-30, 72];
  const fp = m.focal || [];
  const dots = fp.map(f => `<button type="button" class="fp ${esc(f.verdict)}" data-fp="${+f.n}" style="left:${+f.img[0]}%;top:${+f.img[1]}%" aria-label="${+f.n}: ${esc(f.label)}">${+f.n}</button>`).join('');
  const spots = fp.map(f => `<button type="button" slot="hotspot-${+f.n}" class="fp ${esc(f.verdict)}" data-fp="${+f.n}" data-position="0 0 0" aria-label="${+f.n}: ${esc(f.label)}, ${FAIR[f.verdict] || ''}">${+f.n}</button>`).join('');
  const was = r ? `<p class="was ${r.verdict}"><b>${LABEL[r.verdict]}</b>${r.notes ? ` “${esc(r.notes)}”` : ''}<button type="button" data-clear>Change</button></p>` : '';
  const good = plainList(m.good), off = plainList(m.off);
  // One screen (Evan, 05:37Z): the hero bar, the picture and the model as big as the window allows with the strip under
  // them, and your feedback in its own panel on the right, which hides.
  root.innerHTML = `${topbar(m, seq, i)}
  <div class="mshell">
  <article class="desk2 stage">
    <div class="pair2">
      <figure class="print"><div class="sq2 pic"><span class="inset">Inspiration</span><img src="${esc(m.urls.ref)}" alt="The inspiration for the ${esc(m.name.toLowerCase())}">${dots}</div>${m.ask || m.subject ? `<button type="button" class="said" data-said aria-label="Show the whole prompt">“${esc(m.ask || m.subject)}”</button>` : ''}</figure>
      <figure class="livefig"><div class="sq2 alive"><span class="inset">Model</span><model-viewer class="got" autoplay src="${esc(m.urls.glb)}" alt="3D model of the ${esc(m.name.toLowerCase())}" camera-controls touch-action="pan-y" camera-orbit="${+theta}deg ${+phi}deg auto"
        auto-rotate auto-rotate-delay="2500" rotation-per-second="16deg" interaction-prompt="none" shadow-intensity="0.8" exposure="0.8" environment-image="neutral">${spots}</model-viewer>
</div></figure>
    </div>
    <nav class="strip" aria-label="All models in this list">${seq.map(x => { const rv = reviews[x.id]; return `<a href="/models/${encodeURIComponent(x.id)}" data-open="${esc(x.id)}" class="sq${x.id === m.id ? ' on' : ''}"${x.id === m.id ? ' aria-current="true"' : ''} title="${esc(x.name)}${x.style ? ' · ' + esc(x.style) : ''}">${thumbImg(x.urls.ref, 's')}<i class="dot ${rv ? rv.verdict : ''}"></i></a>`; }).join('')}</nav>
  </article>
  <aside class="fb" aria-label="Your feedback">
    <h2 class="fbh">Your feedback</h2>
    ${was}
    ${sourceLine(m)}
    <div class="thumb decide" role="group" aria-label="Decide">
      <button type="button" class="tb reject" data-verdict="reject" aria-label="Reject">${ico('reject')}</button>
      <button type="button" class="tb chat" id="chat" aria-label="Talk or type a note">${ico('mic')}</button>
      <button type="button" class="tb accept" data-verdict="accept" aria-label="Keep it">${ico('accept')}</button>
    </div>
    ${fp.length ? `<div><h2>Points to check</h2><ol class="focal">${fp.map(f => `<li data-fp="${+f.n}"><span class="fp ${esc(f.verdict)}">${+f.n}</span><b>${esc(f.label)}</b><em class="${esc(f.verdict)}">${FAIR[f.verdict] || ''}</em><span>${esc(f.note)}</span></li>`).join('')}</ol></div>` : ''}
    <div class="notes2">${good.length ? `<div><h2>What matches</h2><ul>${good.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}${off.length ? `<div><h2>What is off</h2><ul>${off.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>
  </aside>
  </div>`;
  const on = root.querySelector('.strip .on'); if (on){ const st = on.parentElement; st.scrollLeft = on.offsetLeft - st.clientWidth / 2 + on.clientWidth / 2; }
  placeSpots(root.querySelector('model-viewer'), fp);
  loadScreen(root.querySelector('.sq2.alive'));
  warmNeighbours(seq, i);
}
// Focal points on the model sit at fractions of its bounding box ("at": x, y, z from -0.5 to 0.5, +z facing the camera).
// Loading screen: a quiet progress ring over the model's own picture until the 3D model is ready. No effects when it arrives.
function loadScreen(box){
  if (!box) return;
  const mv = box.querySelector('model-viewer'), ld = document.createElement('div');
  ld.className = 'mload'; ld.innerHTML = '<i class="ring"></i><b class="bar"><u></u></b><span>Getting the 3D model</span>';
  box.append(ld);
  const bar = ld.querySelector('u'), done = () => { ld.classList.add('gone'); setTimeout(() => ld.remove(), 250); };
  mv.addEventListener('progress', e => { bar.style.width = Math.round(100 * (e.detail?.totalProgress || 0)) + '%'; });
  mv.addEventListener('load', done, {once:true}); mv.addEventListener('error', () => { ld.querySelector('span').textContent = 'The 3D model did not load'; ld.classList.add('err'); }, {once:true});
  if (mv.loaded) done();
}
// While you look at one model, fetch the next and the previous so a swipe opens them at once.
const warmed = new Set();
function warmNeighbours(seq, i){
  const go = () => [seq[i + 1], seq[i - 1]].forEach(n => { const u = n?.urls?.glb; if (u && !warmed.has(u)){ warmed.add(u); fetch(u).catch(() => {}); } });
  setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go) : go()), 1500);
}

function placeSpots(mv, fp){
  if (!mv || !fp.length) return;
  mv.addEventListener('load', () => {
    const c = mv.getBoundingBoxCenter(), d = mv.getDimensions();
    fp.forEach(f => mv.updateHotspot({name:`hotspot-${+f.n}`, position:`${c.x + f.at[0] * d.x}m ${c.y + f.at[1] * d.y}m ${c.z + f.at[2] * d.z}m`}));
    mv.classList.add('placed');
  }, {once:true});
}
function focus(n){
  root.querySelectorAll('[data-fp]').forEach(e => e.classList.toggle('lit', e.dataset.fp === String(n)));
}

// ---------- chat: one place to talk or type ----------
function openChat(){
  let o = document.getElementById('chatpop');
  if (!o){ o = document.createElement('div'); o.id = 'chatpop'; o.className = 'chatpop'; document.body.append(o); }
  o.innerHTML = `<div class="orb" id="orb" aria-hidden="true"></div>
    <p class="heard ${voiceKind}" id="heard" aria-live="polite">${esc(speech ? 'Listening… or type below.' : 'Type what to change.')}</p>
    <form class="line" id="chatform"><input id="chatin" type="text" autocomplete="off" placeholder="Talk, or type it here" aria-label="Your note"><button type="submit" class="tb send" aria-label="Send">${ico('send')}</button></form>
    <button type="button" class="peb close" id="chatclose" aria-label="Close">${ico('reject')}</button>`;
  o.hidden = false;
  if (speech) startListening();
}
function closeChat(){ const o = document.getElementById('chatpop'); if (o) o.hidden = true; stopListening(); }

// ---------- request more: a cart of new orders; every order starts as concept art ----------
let orders = [];
const ORDERS_THREAD = 'cmsg_01USVJqCbJruSGtaP4zsE2eYJJwV5vW99BgS3tVwgdy9Q5';
function openCart(prefill){
  let o = document.getElementById('cartpop');
  if (!o){ o = document.createElement('div'); o.id = 'cartpop'; o.className = 'cartpop'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Request more'); document.body.append(o); }
  const m = list.find(x => x.id === cur);
  o.innerHTML = `<div class="row2"><h2>Request more</h2><button type="button" class="peb" id="cartclose" aria-label="Close">${ico('reject')}</button></div>
    <div id="orderlist">${orders.map((x, k) => `<div class="order"><img src="${x.photo || esc(m?.urls.ref || '')}" alt=""><div><strong>${esc(x.text || 'Make this')}</strong><small>Concept art · you pick · model</small></div><button type="button" class="peb" data-unorder="${k}" aria-label="Remove">${ico('reject')}</button></div>`).join('')}</div>
    <form class="line" id="orderform"><button type="button" class="peb" id="cam2" aria-label="Add a photo">${ico('camera')}</button><input id="orderin" type="text" autocomplete="off" placeholder="More like this: a centurion’s version, battered…" aria-label="What more should be made"><button type="submit" class="tb send" aria-label="Add to orders">${ico('plus')}</button></form>
    <p class="pg">Every order starts as concept art for you to pick. Photos stay private: a child’s face is never redrawn or modelled, and nothing unclothed is ever made.</p>
    <div class="row2"><span class="sent" id="sent"></span><button type="button" class="tb accept wide" id="sendorders"${orders.length ? '' : ' disabled'}>Send</button></div>`;
  o.hidden = false;
  if (prefill) o.querySelector('#orderin').value = prefill;
}
function drawBadge(){ const b = document.getElementById('badge'); if (b){ b.hidden = !orders.length; b.textContent = orders.length; } }
function photo(file){
  return new Promise(res => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82)); };
    img.onerror = () => res(null); img.src = url;
  });
}
// Orders go to /api/model-orders, which always starts them at the concept stage and runs the PG check on photos.
// Until that endpoint is live, words-only orders fall back to the feedback inbox; photos never go there (it is copied to the repo).
async function sendOrders(){
  const m = list.find(x => x.id === cur), keepers = [], said = [];
  for (const x of orders){
    let r = await fetch('/api/model-orders', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({from_model_id:m?.id, text:x.text || 'Make this from my photo', photo:x.photo || undefined})}).catch(() => null);
    if (r && r.status === 404 && !x.photo) r = await fetch('/api/feedback', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({
      note:`[Order] ${x.text}${m ? ` (more like ${m.name}, /models/${m.id})` : ''}. Start with concept art for Evan to pick; never go straight to a model.`,
      page:location.pathname, title:document.title, thread:ORDERS_THREAD, threadTitle:'Model orders', viewport:`${innerWidth}x${innerHeight}@${devicePixelRatio}`})}).catch(() => null);
    if (r && r.ok) continue;
    keepers.push(x);
    let why = 'Not sent. Try again.';
    try { const j = await r.json(); if (j && j.error) why = j.error; } catch {}
    if (r && r.status === 404) why = 'Photos can be sent once ordering is switched on.';
    said.push(why);
  }
  const sent = orders.length - keepers.length; orders = keepers;
  openCart(); drawBadge();
  document.getElementById('sent').textContent = [sent ? `${sent} sent. Concept art comes first.` : '', ...new Set(said)].filter(Boolean).join(' ');
}

function render(push){
  if (view === 'library') library(); else if (view === 'grid') grid(); else review();
  const path = (view === 'review' && cur ? `/models/${encodeURIComponent(cur)}` : '/models') + (set ? `?set=${encodeURIComponent(set.id)}` : '');
  if (push && location.pathname + location.search !== path) history.pushState({cur, view}, '', path);
}

// ---------- verdicts ----------
function go(step){
  const ms = shown(), seq = ms.some(x => x.id === cur) ? ms : list, i = seq.findIndex(x => x.id === cur);
  const n = seq[i + step]; if (n){ cur = n.id; render(true); scrollTo({top:0, behavior:'smooth'}); }
}
function nextAfter(id){
  const i = list.findIndex(m => m.id === id);
  return [...list.slice(i + 1), ...list.slice(0, i)].find(m => !reviews[m.id])?.id || null;
}
async function decide(verdict, notes, via){
  const m = list.find(x => x.id === cur); if (!m) return;
  notes = (notes ?? document.getElementById('notes')?.value ?? '').trim();
  if (verdict === 'adjust' && !notes){ openChat(); return; }
  const prev = reviews[m.id];
  reviews[m.id] = {id:m.id, verdict, notes, via, at:new Date().toISOString(), name:m.name}; keep();
  const nxt = filter === 'todo' ? nextAfter(m.id) : null;
  toast(`${LABEL[verdict]}: ${m.name}${nxt ? '. Next up.' : ''}`, () => { if (prev) reviews[m.id] = prev; else delete reviews[m.id]; keep(); send(m, prev ? prev.verdict : 'clear', prev?.notes || '', 'tap'); cur = m.id; render(true); });
  const saving = send(m, verdict, notes, via);
  const said = `${LABEL[verdict]}${notes ? ': ' + notes : ''}`, next = nxt && list.find(x => x.id === nxt), full = x => `${x.style === 'charming' ? 'charming ' : ''}${x.name.toLowerCase()}`;
  hear(`Saving ${said} (${full(m)})…`, 'saving');
  if (nxt) cur = nxt; else if (filter === 'todo'){ view = 'grid'; filter = 'all'; }
  render(true); scrollTo({top:0, behavior:'smooth'});
  const ok = await saving;
  hear(`${ok ? '✓ Saved' : 'Saved on this device'}: ${said} (${full(m)}).${next ? ` Now: ${full(next)}.` : ''}`, ok ? 'saved' : 'error');
  if (via === 'voice') say(next ? `Next, the ${full(next)}.` : filter === 'todo' ? 'That was the last one.' : 'Saved.');
}
// Paper warrior models belong to the Roman model study thread, so their verdicts also reach that thread's feedback inbox.
const OWNER = [[/^(paper warrior|paper figures|roman parts)/i, 'cmsg_01USVJqCbJruSGtaP4zsE2eYAb48x2DmDDA14qSKHaFgpa', 'Models review'],
  [/^moon remaster/i, 'cmsg_01USVJqCbJruSGtaP4zsE2eYDScAk27PpBxCDd533GMVx1', 'Models review'],
  [/^grace's basement/i, 'cmsg_01USVJqCbJruSGtaP4zsE2eYFaCujnPX2YigsAYuPKmL9D', 'Coffee shop office basement']];
async function send(m, verdict, notes, via){
  try {
    const r = await fetch('/api/model-reviews', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:m.id, name:`${m.name}${m.style ? ' (' + m.style + ')' : ''}`, verdict, notes, via})});
    if (!r.ok) throw new Error(r.status);
    const own = OWNER.find(([re]) => re.test(m.group || ''));
    if (own && verdict !== 'clear') fetch('/api/feedback', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({
      note:`[${LABEL[verdict]}] ${m.name} (/models/${m.id})${notes ? ': ' + notes : ''}`, page:location.pathname, title:document.title,
      thread:own[1], threadTitle:own[2], viewport:`${innerWidth}x${innerHeight}@${devicePixelRatio}`})}).catch(() => {});
    return true;
  } catch { toast('Saved on this device. It will reach the modeler when the connection is back.'); return false; }
}

let tt;
function toast(msg, undo){
  let t = document.getElementById('toast');
  if (!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button type="button">Undo</button>' : ''}`; t.hidden = false;
  if (undo) t.querySelector('button').onclick = () => { t.hidden = true; undo(); };
  clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 5000);
}

// ---------- voice ----------
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
const speech = !!Rec;
let rec = null, listening = false;
// The status line survives re-renders, so what was heard and saved stays on screen after the page moves on.
const hear = (s, kind = '') => { voiceLine = s; voiceKind = kind; const h = document.getElementById('heard'); if (h){ h.textContent = s; h.className = `heard ${kind}`; } };
// Replies are shown, not spoken: every voice in the game is an ElevenLabs designed voice (INVARIANTS.md), and this page has no
// pre-rendered lines, so there is no browser speech.
let talking = false;
function say(text, then){ then?.(); }
function setMic(on){ const b = document.getElementById('mic'); if (b){ b.setAttribute('aria-pressed', String(on)); b.classList.toggle('live', on); } }

// "accept", "ship it", "reject", "start over", or anything else said with adjust/change words. "next" and "back" move.
function parse(said){
  const t = said.toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(next|skip)( one| model)?$/.test(t)) return {move:1};
  if (/^(back|previous|go back)( one| model)?$/.test(t)) return {move:-1};
  const lead = t.match(/^(accept(ed)?|approve(d)?|ship it|looks good|reject(ed)?|start over|scrap it|adjust|change|fix|tweak)\b/);
  const notesFrom = s => s.replace(/^(accept(ed)?|approve(d)?|ship it|looks good|reject(ed)?|start over|scrap it|adjust|change|fix|tweak)\b[\s:,-]*/i, '').trim();
  const kind = w => /^(reject|start over|scrap)/.test(w) ? 'reject' : /^(accept|approve|ship it|looks good)/.test(w) ? 'accept' : 'adjust';
  if (lead) return {verdict:kind(lead[1]), notes:notesFrom(said.trim())};
  if (/\b(reject|start over|scrap it|throw it out|no good)\b/.test(t)) return {verdict:'reject', notes:said.trim()};
  if (/\b(accept|approved?|ship it|looks (good|great)|perfect|love it|good to go)\b/.test(t) && !/\b(but|except|although|needs?|should)\b/.test(t)) return {verdict:'accept', notes:said.trim()};
  if (/\b(make|needs?|should|too|more|less|bigger|smaller|taller|shorter|wider|thinner|change|fix|move|add|remove|instead)\b/.test(t)) return {verdict:'adjust', notes:said.trim()};
  return {notes:said.trim()};
}

function act(said, via = 'voice'){
  const p = parse(said), notes = document.getElementById('notes');
  if (p.move){ hear(p.move > 0 ? 'Next model.' : 'Previous model.'); go(p.move); return; }
  if (notes && p.notes) notes.value = p.notes;
  if (!p.verdict) p.verdict = 'adjust';
  if (p.verdict === 'adjust' && !p.notes){ hear('Adjust what? Say what should change.', 'heard-it'); say('What should change?'); return; }
  hear(`You said “${said}” → ${LABEL[p.verdict]}${p.notes ? ': ' + p.notes : ''}`, 'heard-it');
  clearTimeout(pending);
  say(`Got it. ${LABEL[p.verdict]}${p.notes ? ': ' + p.notes : ''}.`, () => { pending = setTimeout(() => { closeChat(); decide(p.verdict, p.notes, via); }, 250); });
}

function startListening(){
  if (!speech) return;
  if (rec) try { rec.abort(); } catch {}
  rec = new Rec(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = handsFree;
  let finalText = '';
  rec.onresult = e => {
    let interim = '';
    for (let k = e.resultIndex; k < e.results.length; k++){ const r = e.results[k]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; }
    if (interim) hear('“' + interim + '…”', 'listening');
    if (finalText.trim()){ const s = finalText.trim(); finalText = ''; act(s); }
  };
  rec.onerror = e => {
    const why = {'not-allowed':'The microphone is blocked for this page. Allow it in the browser settings, or type your notes.',
      'service-not-allowed':'Speech recognition is switched off on this device (on iPhone: Settings › Siri, turn on Siri or Dictation). Or type your notes.',
      'audio-capture':'No microphone found. Type your notes instead.',
      'network':'The speech service could not be reached. Check the connection and tap the mic again.',
      'no-speech':'I didn’t hear anything. Tap the mic and talk.'}[e.error];
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture'){ handsFree = false; stopListening(); }
    if (why && !(e.error === 'no-speech' && handsFree)) hear(why, 'error');
  };
  rec.onend = () => {
    if (talking && handsFree) return;
    if (listening && handsFree) { try { rec.start(); return; } catch {} }
    listening = false; setMic(false);
    if (voiceKind === 'listening') hear('I didn’t catch anything. Tap the mic and talk.', 'error');
  };
  try { rec.start(); listening = true; setMic(true); hear('Listening… speak now', 'listening'); } catch { hear('The microphone could not start. Tap it again.', 'error'); }
}
function stopListening(){ listening = false; setMic(false); if (rec) try { rec.stop(); } catch {} }

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, a[data-open]'); if (!t) return;
  if (t.hasAttribute('data-said')){ t.classList.toggle('open'); return; }
  if (t.dataset.flip){ e.preventDefault(); flipped.has(t.dataset.flip) ? flipped.delete(t.dataset.flip) : flipped.add(t.dataset.flip); render(); }
  else if (t.dataset.browse){ browse = t.dataset.browse; try { localStorage.setItem('aw-browse', browse); } catch (er) {} render(); }
  else if (t.dataset.show){ gridShow = t.dataset.show; flipped.clear(); render(); }
  else if (t.dataset.open){ e.preventDefault(); cur = t.dataset.open; view = 'review'; render(true); scrollTo({top:0}); }
  else if (t.dataset.filter){ filter = t.dataset.filter; if (view === 'review' && filter !== 'all' && !shown().some(m => m.id === cur)) cur = shown()[0]?.id || cur; render(true); }
  else if (t.dataset.view){ view = t.dataset.view; render(true); }
  else if (t.dataset.step) go(+t.dataset.step);
  else if (t.dataset.verdict){ clearTimeout(pending); decide(t.dataset.verdict, undefined, 'tap'); }
  else if ('clear' in t.dataset){ const m = list.find(x => x.id === cur); delete reviews[cur]; keep(); send(m, 'clear', '', 'tap'); render(); }
  else if (t.id === 'mic') listening ? stopListening() : startListening();
  else if (t.id === 'chat') openChat();
  else if (t.id === 'chatclose') closeChat();
  else if (t.id === 'gear'){ import('/theme/aw.mjs').then(m => m.openSettings('style')); }
  else if (t.id === 'fbtoggle'){ const off = !fbOff(); store('aw-models-fb', off ? 'off' : 'on'); document.documentElement.classList.toggle('fb-off', off); t.setAttribute('aria-pressed', String(!off)); }
  else if (t.dataset.mode && t.closest('#gearpop')){ store('aw-mode', t.dataset.mode); const u = new URL(location.href); if (u.searchParams.has('mode')){ u.searchParams.delete('mode'); history.replaceState(history.state, '', u); } applyLook(view === 'review' ? list.find(x => x.id === cur) : null); document.getElementById('gearpop').innerHTML = gearPop(); }
  else if (t.dataset.gstyle){ store('aw-game-style', t.dataset.gstyle); applyLook(null); document.getElementById('gearpop').innerHTML = gearPop(); }
  else if (t.dataset.motif){ try { localStorage.setItem('aw-motif', t.dataset.motif); } catch {} document.documentElement.dataset.motif = t.dataset.motif; document.querySelectorAll('[data-motif]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.motif === t.dataset.motif))); }
  else if (t.id === 'cart') openCart();
  else if (t.id === 'cartclose') document.getElementById('cartpop').hidden = true;
  else if (t.id === 'cam'){ openCart(); camIn.click(); }
  else if (t.id === 'cam2') camIn.click();
  else if (t.dataset.unorder){ orders.splice(+t.dataset.unorder, 1); openCart(); drawBadge(); }
  else if (t.id === 'sendorders') sendOrders();
  else if (t.dataset.fp) focus(t.dataset.fp);
});
const camIn = Object.assign(document.createElement('input'), {type:'file', accept:'image/*', hidden:true}); camIn.setAttribute('capture', 'environment'); document.body.append(camIn);
camIn.addEventListener('change', async () => { const f = camIn.files?.[0]; camIn.value = ''; if (!f) return; const ph = await photo(f); if (!ph) return; const txt = document.getElementById('orderin')?.value.trim() || ''; orders.push({text:txt, photo:ph}); openCart(); drawBadge(); });
document.addEventListener('submit', e => {
  if (e.target.id === 'chatform'){ e.preventDefault(); const v = document.getElementById('chatin').value.trim(); if (!v) return; stopListening(); act(v, 'typed'); }
  if (e.target.id === 'orderform'){ e.preventDefault(); const v = document.getElementById('orderin').value.trim(); if (!v) return; orders.push({text:v}); openCart(); drawBadge(); }
});
document.addEventListener('focusin', e => { if (e.target.id === 'chatin' && listening) stopListening(); });
document.addEventListener('change', e => {
  if (e.target.id === 'filter'){ filter = e.target.value; if (filter !== 'all' && !shown().some(m => m.id === cur)) cur = shown()[0]?.id || cur; render(true); return; }
  if (e.target.id === 'hf'){ handsFree = e.target.checked; if (handsFree && !listening) startListening(); else if (!handsFree && rec) rec.continuous = false; } });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){ closeChat(); const c = document.getElementById('cartpop'); if (c) c.hidden = true; return; }
  if (view !== 'review' || e.target.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowright') go(1); else if (k === 'arrowleft') go(-1);
  else if (k === 'a') decide('accept', undefined, 'tap'); else if (k === 'r') decide('reject', undefined, 'tap');
  else if (k === 'd' || k === 'm') openChat();
});
addEventListener('popstate', () => { route(); render(false); });

function route(){
  const seg = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop());
  const id = seg === 'model.html' ? new URLSearchParams(location.search).get('id') : seg === 'models' || seg === 'index.html' ? null : seg;
  view = 'review';
  if (!id && !set && !new URLSearchParams(location.search).has('review')){ view = 'library'; cur = null; return; }
  cur = id && list.some(m => m.id === id) ? id : null;
  if (id && !cur) root.innerHTML = `<p class="empty">There is no model called “${esc(id)}”. <a href="/models">See all models</a>.</p>`;
  if (!cur){ filter = 'todo'; cur = todo()[0]?.id || null; if (!cur){ view = 'grid'; filter = 'all'; } }
  else if (reviews[cur]) filter = 'all';
}

// A study set (/models?set=<review inbox item id>) shows only that study's models, listed by the item's `models`
// (ids; a trailing * matches a prefix). The set is the unit a later "upgrade" or "re-imagine the whole set" acts on.
const set = await (async () => {
  const id = new URLSearchParams(location.search).get('set'); if (!id) return null;
  try { const f = await (await fetch('/review/feed.json', {cache:'no-cache'})).json(); const it = (f.items || []).find(x => x.id === id); return it && it.models ? it : null; } catch { return null; }
})();
const inSet = m => set.models.some(p => p.endsWith('*') ? m.id.startsWith(p.slice(0, -1)) : m.id === p);
const storedLater = storedSources().length ? storedCatalogue() : Promise.resolve([]);
// Reviews come from /api/model-reviews, which can be slow; the page waits for it only briefly (your own are in
// localStorage already) and redraws when it answers, if anyone else's verdicts changed what's shown.
const reviewsLater = loadReviews(), before = JSON.stringify(reviews);
const [cat] = await Promise.all([catalogue(), Promise.race([reviewsLater, new Promise(r => setTimeout(r, 400))])]);
list = cat.first;
if (set){ list = list.filter(inSet).sort((a, b) => set.models.findIndex(p => p === a.id) - set.models.findIndex(p => p === b.id)); document.documentElement.dataset.set = set.id; }
if (!list.length) root.innerHTML = '<p class="empty">No models yet.</p>';
else {
  route(); render(false);
  const q = new URLSearchParams(location.search), shared = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).join(' ');
  if (shared) openCart(shared);
  reviewsLater.then(() => { if (JSON.stringify(reviews) !== before && list.some(m => m.id === cur)) render(false); });
  // The stored catalogue arrives; redraw only if it knows models the bundled one doesn't, or describes them differently.
  storedLater.then(stored => {
    if (!stored.length || set) return;
    const next = merge(stored, cat.bundled), mine = new Map(list.map(m => [m.id, JSON.stringify(m)]));
    if (next.length === list.length && next.every(m => mine.get(m.id) === JSON.stringify(m))) return;
    const was = cur; list = next; if (!list.some(m => m.id === was)) return; render(false);
  }).catch(() => {});
}
