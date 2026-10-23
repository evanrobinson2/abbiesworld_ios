// /models is a review desk. Each model shows what was asked for (the concept and its prompt) beside what was built
// (a 3D model to turn), then one tap or one spoken sentence: accept, adjust with notes, or reject. The details sit
// under "Learn more". /models opens the next model still to review; /models/<id> opens that one. Moving between
// models swaps the page in place, so a hands-free voice session keeps listening from one model to the next.
// Catalogue sources, first that answers wins: window.MODELS_CATALOG_URL, /api/models, then /models/manifest.json.
// Verdicts go to /api/model-reviews, which also drops each one in the feedback inbox for the modelers.
import '/vendor/model-viewer.min.js';

const SOURCES = [window.MODELS_CATALOG_URL, '/api/models', '/models/manifest.json'].filter(Boolean);
const LABEL = {accept:'Accepted', adjust:'Adjust', reject:'Rejected'};
const root = document.getElementById('root'), crumb = document.getElementById('crumb');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const pct = x => Math.round(100 * x) + '%';
const LS = 'models-reviews-v1';

let list = [], reviews = {}, cur = null, view = 'review', filter = 'todo', handsFree = false, pending = null;
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
async function catalogue(){
  let base = [];
  for (const url of SOURCES){ base = await fetchList(url); if (base.length) break; }
  const bundled = SOURCES.at(-1) === '/models/manifest.json' ? await fetchList('/models/manifest.json') : [];
  const have = new Set(base.map(m => m.id)), extra = bundled.filter(m => !have.has(m.id));
  const order = new Map(bundled.map((m, i) => [m.id, i]));
  return [...base, ...extra].sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));
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

function grid(){
  document.title = 'Models';
  crumb.innerHTML = '<a href="/models">Models</a>';
  const ms = shown();
  root.innerHTML = chips() + (ms.length ? `<div class="tiles">${ms.map(m => { const r = reviews[m.id]; return `
    <a class="tile" href="/models/${encodeURIComponent(m.id)}" data-open="${esc(m.id)}">
      <img src="${esc(m.urls.ref)}" alt="" loading="lazy"><i class="dot ${r ? r.verdict : ''}" title="${r ? LABEL[r.verdict] : 'To review'}"></i>
      <span class="tn"><strong>${esc(m.name)}</strong><small>${esc(m.style || m.group || '')}</small></span></a>`; }).join('')}</div>`
    : `<p class="empty">Nothing here yet.</p>`);
}

function review(){
  const ms = shown();
  if (!cur || !list.some(m => m.id === cur)) cur = (ms[0] || todo()[0] || list[0]).id;
  const m = list.find(x => x.id === cur), r = reviews[m.id], seq = ms.some(x => x.id === m.id) ? ms : list, i = seq.findIndex(x => x.id === m.id);
  document.title = m.name + ' · Models';
  crumb.innerHTML = `<a href="/models">Models</a><span>/</span><span>${esc(m.name)}${m.style ? ' · ' + esc(m.style) : ''}</span>`;
  const [theta, phi] = m.orbit || [-30, 72];
  root.innerHTML = chips() + `
  <article class="desk">
    <div class="dh">
      <button type="button" class="arrow" data-step="-1" aria-label="Previous model" ${i <= 0 ? 'disabled' : ''}>‹</button>
      <div class="dt"><h1>${esc(m.name)}</h1><span class="where">${m.style ? `<span class="style ${esc(m.style)}">${esc(m.style)}</span>` : ''}${i + 1} of ${seq.length}</span></div>
      <button type="button" class="arrow" data-step="1" aria-label="Next model" ${i >= seq.length - 1 ? 'disabled' : ''}>›</button>
    </div>
    <div class="duo">
      <figure class="asked"><span class="k">You asked for</span><img src="${esc(m.urls.ref)}" alt="The concept art for the ${esc(m.name.toLowerCase())}">
        ${m.ask ? `<figcaption class="ask">“${esc(m.ask)}”</figcaption>` : m.subject ? `<figcaption class="ask">${esc(m.subject)}</figcaption>` : ''}</figure>
      <figure class="got"><span class="k">You got <em>drag to turn, pinch to zoom</em></span>
        <model-viewer src="${esc(m.urls.glb)}" alt="3D model of the ${esc(m.name.toLowerCase())}" camera-controls touch-action="pan-y" camera-orbit="${+theta}deg ${+phi}deg auto"
          auto-rotate auto-rotate-delay="2500" rotation-per-second="16deg" interaction-prompt="none" shadow-intensity="0.9" exposure="1.05" environment-image="neutral"></model-viewer></figure>
    </div>
    ${r ? `<p class="was ${r.verdict}"><b>${LABEL[r.verdict]}</b>${r.notes ? ` “${esc(r.notes)}”` : ''}<button type="button" data-clear>Change</button></p>` : ''}
    <section class="say" aria-label="Your verdict">
      <div class="acts">
        <button type="button" class="mic" id="mic" aria-pressed="false" aria-label="Talk your feedback"${speech ? '' : ' hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2Z"/></svg></button>
        <button type="button" class="act reject" data-verdict="reject">Reject</button>
        <button type="button" class="act adjust" data-verdict="adjust">Adjust</button>
        <button type="button" class="act accept" data-verdict="accept">Accept</button>
      </div>
      <textarea id="notes" rows="1" placeholder="Notes in your own words: roof steeper, love the colour…">${esc(r?.notes || '')}</textarea>
      <div class="voice"><span class="heard" id="heard" aria-live="polite">${speech ? 'Tap the mic and talk: “accept”, “reject”, or what to change.' : 'Type notes, or use your keyboard’s dictation.'}</span>
        ${speech ? `<label class="hf"><input type="checkbox" id="hf" ${handsFree ? 'checked' : ''}> Hands-free</label>` : ''}</div>
    </section>
    <details class="more"><summary>Learn more</summary>
      <div class="mgrid">
        <section><h2>How close it is</h2>
          <div class="bars">${(m.scores || [{label:'Outline match', value:m.outline}]).map(s => `<div class="bar"><span class="bl" title="${esc(s.help || '')}">${esc(s.label)}</span><span class="track"><i style="width:${Math.max(2, Math.round(s.value * 100))}%"></i></span><span class="bv">${pct(s.value)}</span></div>`).join('')}</div>
          ${m.urls.render || m.urls.overlay ? `<div class="thumbs">${m.urls.render ? `<img src="${esc(m.urls.render)}" alt="The model from the concept's camera" loading="lazy">` : ''}${m.urls.overlay ? `<img src="${esc(m.urls.overlay)}" alt="Silhouette overlay" loading="lazy">` : ''}</div>` : ''}
          <dl>${(m.details || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}<dt>File</dt><dd><a href="${esc(m.urls.glb)}" download="${esc(m.id)}.glb">${esc(m.id)}.glb</a></dd></dl></section>
        <section>${(m.good || []).length ? `<h2>What matches</h2><ul class="ticks good">${m.good.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          ${(m.off || []).length ? `<h2>What is off</h2><ul class="ticks off">${m.off.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</section>
        ${(m.steps || []).length ? `<section><h2>How it was made</h2><ol class="steps">${m.steps.map(([h, t]) => `<li><b>${esc(h)}</b> ${esc(t)}</li>`).join('')}</ol></section>` : ''}
      </div></details>
  </article>`;
  if (listening) setMic(true);
}

function render(push){
  if (view === 'grid') grid(); else review();
  const path = view === 'review' && cur ? `/models/${encodeURIComponent(cur)}` : '/models';
  if (push && location.pathname !== path) history.pushState({cur, view}, '', path);
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
  if (verdict === 'adjust' && !notes){ const t = document.getElementById('notes'); t.focus(); t.placeholder = 'Say or type what to change, then Adjust'; hear('What should change?'); return; }
  const prev = reviews[m.id];
  reviews[m.id] = {id:m.id, verdict, notes, via, at:new Date().toISOString(), name:m.name}; keep();
  const nxt = filter === 'todo' ? nextAfter(m.id) : null;
  toast(`${LABEL[verdict]}: ${m.name}${nxt ? '. Next up.' : ''}`, () => { if (prev) reviews[m.id] = prev; else delete reviews[m.id]; keep(); send(m, prev ? prev.verdict : 'clear', prev?.notes || '', 'tap'); cur = m.id; render(true); });
  send(m, verdict, notes, via);
  if (nxt) cur = nxt; else if (filter === 'todo'){ view = 'grid'; filter = 'all'; }
  render(true); scrollTo({top:0, behavior:'smooth'});
}
async function send(m, verdict, notes, via){
  try {
    const r = await fetch('/api/model-reviews', {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:m.id, name:`${m.name}${m.style ? ' (' + m.style + ')' : ''}`, verdict, notes, via})});
    if (!r.ok) throw new Error(r.status);
  } catch { toast('Saved on this device. It will reach the modeler when the connection is back.'); }
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
const hear = s => { const h = document.getElementById('heard'); if (h) h.textContent = s; };
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

function act(said){
  const p = parse(said), notes = document.getElementById('notes');
  if (p.move){ hear(p.move > 0 ? 'Next model.' : 'Previous model.'); go(p.move); return; }
  if (notes && p.notes) notes.value = p.notes;
  if (!p.verdict){ hear(`Heard “${said}”. Say accept, adjust or reject, or tap one.`); return; }
  hear(`Heard “${said}” → ${LABEL[p.verdict]}`);
  clearTimeout(pending); pending = setTimeout(() => decide(p.verdict, p.notes, 'voice'), 900);
}

function startListening(){
  if (!speech) return;
  if (rec) try { rec.abort(); } catch {}
  rec = new Rec(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = handsFree;
  let finalText = '';
  rec.onresult = e => {
    let interim = '';
    for (let k = e.resultIndex; k < e.results.length; k++){ const r = e.results[k]; if (r.isFinal) finalText += r[0].transcript + ' '; else interim += r[0].transcript; }
    if (interim) hear('… ' + interim);
    if (finalText.trim()){ const s = finalText.trim(); finalText = ''; act(s); }
  };
  rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ handsFree = false; stopListening(); hear('The microphone is blocked for this page. Allow it in the browser settings, or type your notes.'); } };
  rec.onend = () => { if (listening && handsFree) { try { rec.start(); return; } catch {} } listening = false; setMic(false); };
  try { rec.start(); listening = true; setMic(true); hear('Listening…'); } catch { hear('The microphone could not start. Tap it again.'); }
}
function stopListening(){ listening = false; setMic(false); if (rec) try { rec.stop(); } catch {} }

// ---------- events ----------
document.addEventListener('click', e => {
  const t = e.target.closest('button, a[data-open]'); if (!t) return;
  if (t.dataset.open){ e.preventDefault(); cur = t.dataset.open; view = 'review'; render(true); scrollTo({top:0}); }
  else if (t.dataset.filter){ filter = t.dataset.filter; if (view === 'review' && filter !== 'all' && !shown().some(m => m.id === cur)) cur = shown()[0]?.id || cur; render(true); }
  else if (t.dataset.view){ view = t.dataset.view; render(true); }
  else if (t.dataset.step) go(+t.dataset.step);
  else if (t.dataset.verdict){ clearTimeout(pending); decide(t.dataset.verdict, undefined, 'tap'); }
  else if ('clear' in t.dataset){ const m = list.find(x => x.id === cur); delete reviews[cur]; keep(); send(m, 'clear', '', 'tap'); render(); }
  else if (t.id === 'mic') listening ? stopListening() : startListening();
});
document.addEventListener('change', e => { if (e.target.id === 'hf'){ handsFree = e.target.checked; if (handsFree && !listening) startListening(); else if (!handsFree && rec) rec.continuous = false; } });
document.addEventListener('keydown', e => {
  if (view !== 'review' || e.target.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowright') go(1); else if (k === 'arrowleft') go(-1);
  else if (k === 'a') decide('accept', undefined, 'tap'); else if (k === 'r') decide('reject', undefined, 'tap');
  else if (k === 'd') decide('adjust', undefined, 'tap'); else if (k === 'm' && speech) listening ? stopListening() : startListening();
});
addEventListener('popstate', () => { route(); render(false); });

function route(){
  const seg = decodeURIComponent(location.pathname.replace(/\/+$/, '').split('/').pop());
  const id = seg === 'model.html' ? new URLSearchParams(location.search).get('id') : seg === 'models' || seg === 'index.html' ? null : seg;
  view = 'review';
  cur = id && list.some(m => m.id === id) ? id : null;
  if (id && !cur) root.innerHTML = `<p class="empty">There is no model called “${esc(id)}”. <a href="/models">See all models</a>.</p>`;
  if (!cur){ filter = 'todo'; cur = todo()[0]?.id || null; if (!cur){ view = 'grid'; filter = 'all'; } }
  else if (reviews[cur]) filter = 'all';
}

[list] = await Promise.all([catalogue(), loadReviews()]);
if (!list.length) root.innerHTML = '<p class="empty">No models yet.</p>';
else { route(); render(false); }
