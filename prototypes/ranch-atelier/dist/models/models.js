// /models is a review desk. Each model shows what was asked for (the concept and its prompt) beside what was built
// (a 3D model to turn) in one row, with comments and the three verdict buttons on the right; one thin bar of facts sits
// above and one of details below. /models opens the next model still to review; /models/<id> opens that one. Moving between
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
  // Each tile shows the concept art or the 3D model; the switch flips them all, the small button flips one.
  const showSwitch = `<div class="seg show" role="group" aria-label="Tiles show">${[['art','Concept art'],['model','3D models']].map(([k, l]) =>
    `<button type="button" data-show="${k}" aria-pressed="${gridShow === k}">${l}</button>`).join('')}</div>`;
  root.innerHTML = chips() + showSwitch + (ms.length ? `<div class="tiles">${ms.map(m => { const r = reviews[m.id], as3d = (gridShow === 'model') !== flipped.has(m.id); return `
    <a class="tile" href="/models/${encodeURIComponent(m.id)}" data-open="${esc(m.id)}">
      ${as3d ? `<model-viewer src="${esc(m.urls.glb)}" alt="3D model of the ${esc(m.name.toLowerCase())}" loading="lazy" camera-orbit="${+(m.orbit || [-30])[0]}deg ${+(m.orbit || [0, 72])[1]}deg auto" camera-controls touch-action="pan-y" interaction-prompt="none" environment-image="neutral" shadow-intensity="0.8"></model-viewer>`
        : `<img src="${esc(m.urls.ref)}" alt="" loading="lazy">`}<i class="dot ${r ? r.verdict : ''}" title="${r ? LABEL[r.verdict] : 'To review'}"></i>
      <button type="button" class="flip" data-flip="${esc(m.id)}" aria-label="Show the ${as3d ? 'concept art' : '3D model'}">${as3d ? 'Art' : '3D'}</button>
      <span class="tn"><strong>${esc(m.name)}</strong><small>${esc(m.style || m.group || '')}</small></span></a>`; }).join('')}</div>`
    : `<p class="empty">Nothing here yet.</p>`);
}

function review(){
  const ms = shown();
  if (!cur || !list.some(m => m.id === cur)) cur = (ms[0] || todo()[0] || list[0]).id;
  const m = list.find(x => x.id === cur), r = reviews[m.id], seq = ms.some(x => x.id === m.id) ? ms : list, i = seq.findIndex(x => x.id === m.id), c = counts();
  document.title = m.name + ' · Models';
  crumb.innerHTML = `<a href="/models">Models</a><span>/</span><span>${esc(m.name)}${m.style ? ' · ' + esc(m.style) : ''}</span>`;
  const [theta, phi] = m.orbit || [-30, 72];
  const score = m.outline ?? m.scores?.[0]?.value;
  // One thin bar of facts on top, one row of the two pictures plus the verdict panel, one thin bar of details below.
  const facts = [
    m.ask || m.subject ? `<span><b>Asked</b> ${esc(m.ask || m.subject)}</span>` : '',
    ...(m.scores || []).map(s => `<span title="${esc(s.help || '')}"><b>${esc(s.label)}</b> ${pct(s.value)}</span>`),
    ...(m.details || []).filter(([k]) => !/^(source|made with|reference|compute)$/i.test(k)).map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`),
    ...(m.off || []).map(x => `<span class="off"><b>Off</b> ${esc(x)}</span>`),
    `<a href="${esc(m.urls.glb)}" download="${esc(m.id)}.glb">${esc(m.id)}.glb</a>`].filter(Boolean).join('');
  root.innerHTML = `
  <article class="desk">
    <header class="topbar">
      <button type="button" class="arrow" data-step="-1" aria-label="Previous model" ${i <= 0 ? 'disabled' : ''}>‹</button>
      <h1>${esc(m.name)}</h1>${m.style ? `<span class="style ${esc(m.style)}">${esc(m.style)}</span>` : ''}
      <span class="where">${i + 1} of ${seq.length}${score != null ? ` · ${pct(score)} match` : ''}</span>
      ${r ? `<span class="was ${r.verdict}"><b>${LABEL[r.verdict]}</b>${r.notes ? ` “${esc(r.notes)}”` : ''}<button type="button" data-clear>Change</button></span>` : ''}
      <span class="sp"></span>
      <select id="filter" aria-label="Which models">${[['todo','To review'],['accept','Accepted'],['adjust','Adjust'],['reject','Rejected'],['all','All']].map(([k, l]) => `<option value="${k}"${filter === k ? ' selected' : ''}>${l} (${c[k] || 0})</option>`).join('')}</select>
      <button type="button" class="gridbtn" data-view="grid">All</button>
      <button type="button" class="arrow" data-step="1" aria-label="Next model" ${i >= seq.length - 1 ? 'disabled' : ''}>›</button>
    </header>
    <div class="row">
      <img class="art" src="${esc(m.urls.ref)}" alt="The concept art for the ${esc(m.name.toLowerCase())}">
      <model-viewer class="got" autoplay src="${esc(m.urls.glb)}" alt="3D model of the ${esc(m.name.toLowerCase())}" camera-controls touch-action="pan-y" camera-orbit="${+theta}deg ${+phi}deg auto"
        auto-rotate auto-rotate-delay="2500" rotation-per-second="16deg" interaction-prompt="none" shadow-intensity="0.9" exposure="1.05" environment-image="neutral"></model-viewer>
      <aside class="say" aria-label="Your verdict">
        <textarea id="notes" placeholder="Comments: roof steeper, love the colour…">${esc(r?.notes || '')}</textarea>
        <div class="voice">
          <button type="button" class="mic" id="mic" aria-pressed="false" aria-label="Talk your feedback"${speech ? '' : ' hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1A7 7 0 0 0 19 12h-2Z"/></svg></button>
          <span class="heard ${voiceKind}" id="heard" aria-live="polite">${esc(voiceLine || (speech ? 'Tap the mic and talk.' : 'Type your comments.'))}</span>
        </div>
        ${speech ? `<label class="hf"><input type="checkbox" id="hf" ${handsFree ? 'checked' : ''}> Hands-free</label>` : ''}
        <button type="button" class="act accept" data-verdict="accept">Accept</button>
        <button type="button" class="act adjust" data-verdict="adjust">Adjust</button>
        <button type="button" class="act reject" data-verdict="reject">Reject</button>
      </aside>
    </div>
    <footer class="botbar">${facts}</footer>
    <nav class="strip" aria-label="All models in this list">${seq.map(x => { const rv = reviews[x.id]; return `<a href="/models/${encodeURIComponent(x.id)}" data-open="${esc(x.id)}" class="sq${x.id === m.id ? ' on' : ''}"${x.id === m.id ? ' aria-current="true"' : ''} title="${esc(x.name)}${x.style ? ' · ' + esc(x.style) : ''}"><img src="${esc(x.urls.ref)}" alt="" loading="lazy"><i class="dot ${rv ? rv.verdict : ''}"></i></a>`; }).join('')}</nav>
  </article>`;
  const on = root.querySelector('.strip .on'); if (on){ const st = on.parentElement; st.scrollLeft = on.offsetLeft - st.clientWidth / 2 + on.clientWidth / 2; }
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
const OWNER = [[/^paper warrior/i, 'cmsg_01USVJqCbJruSGtaP4zsE2eYAb48x2DmDDA14qSKHaFgpa', 'Models review']];
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
// Spoken replies use the device's own voice: instant, free, and nothing leaves the phone. Recognition pauses while it talks
// so it does not hear itself.
let talking = false;
function say(text, then){
  const synth = window.speechSynthesis;
  if (!synth || !window.SpeechSynthesisUtterance){ then?.(); return; }
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 1.05;
  const v = synth.getVoices().find(v => /en(-|_)US/.test(v.lang) && /Samantha|Google US|Aria|Jenny|Natural/i.test(v.name)); if (v) u.voice = v;
  let done = false; const fin = () => { if (done) return; done = true; talking = false; if (listening && handsFree && rec) try { rec.start(); } catch {} then?.(); };
  u.onend = fin; u.onerror = fin; setTimeout(fin, 1500 + text.length * 80);
  talking = true; if (rec) try { rec.stop(); } catch {}
  synth.cancel(); synth.speak(u);
}
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
  if (!p.verdict){ hear(`You said “${said}”. Now say accept, adjust or reject, or tap one.`, 'heard-it'); say('Got it. Accept, adjust, or reject?'); return; }
  if (p.verdict === 'adjust' && !p.notes){ hear('Adjust what? Say what should change.', 'heard-it'); say('What should change?'); return; }
  hear(`You said “${said}” → ${LABEL[p.verdict]}${p.notes ? ': ' + p.notes : ''}`, 'heard-it');
  clearTimeout(pending);
  say(`Got it. ${LABEL[p.verdict]}${p.notes ? ': ' + p.notes : ''}.`, () => { pending = setTimeout(() => decide(p.verdict, p.notes, 'voice'), 250); });
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
  if (t.dataset.flip){ e.preventDefault(); flipped.has(t.dataset.flip) ? flipped.delete(t.dataset.flip) : flipped.add(t.dataset.flip); render(); }
  else if (t.dataset.show){ gridShow = t.dataset.show; flipped.clear(); render(); }
  else if (t.dataset.open){ e.preventDefault(); cur = t.dataset.open; view = 'review'; render(true); scrollTo({top:0}); }
  else if (t.dataset.filter){ filter = t.dataset.filter; if (view === 'review' && filter !== 'all' && !shown().some(m => m.id === cur)) cur = shown()[0]?.id || cur; render(true); }
  else if (t.dataset.view){ view = t.dataset.view; render(true); }
  else if (t.dataset.step) go(+t.dataset.step);
  else if (t.dataset.verdict){ clearTimeout(pending); decide(t.dataset.verdict, undefined, 'tap'); }
  else if ('clear' in t.dataset){ const m = list.find(x => x.id === cur); delete reviews[cur]; keep(); send(m, 'clear', '', 'tap'); render(); }
  else if (t.id === 'mic') listening ? stopListening() : startListening();
});
document.addEventListener('change', e => {
  if (e.target.id === 'filter'){ filter = e.target.value; if (filter !== 'all' && !shown().some(m => m.id === cur)) cur = shown()[0]?.id || cur; render(true); return; }
  if (e.target.id === 'hf'){ handsFree = e.target.checked; if (handsFree && !listening) startListening(); else if (!handsFree && rec) rec.continuous = false; } });
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
