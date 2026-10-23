// /models renders from a catalogue fetched at load, so a model added to the catalogue (database or R2 URLs) appears with no rebuild.
// Catalogue sources, first that answers wins: window.MODELS_CATALOG_URL, /api/models, then the bundled /models/manifest.json.
import {mountViewer} from '/models/viewer.js?v=3';

const SOURCES = [window.MODELS_CATALOG_URL, '/api/models', '/models/manifest.json'].filter(Boolean);
const LABEL = {good:'Close match', partial:'Partial match', weak:'Weak match'};
const root = document.getElementById('root'), crumb = document.getElementById('crumb');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const pct = x => Math.round(100 * x) + '%';
const status = m => LABEL[m.status] ? m.status : (m.outline >= 0.85 ? 'good' : m.outline >= 0.75 ? 'partial' : 'weak');

async function catalogue(){
  for (const url of SOURCES){
    try {
      const r = await fetch(url, {headers:{accept:'application/json'}});
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) continue;
      const j = await r.json(), list = Array.isArray(j) ? j : j.models;
      if (Array.isArray(list) && list.length) return list;
    } catch {}
  }
  return [];
}

function navigator(list, cur){
  return `<nav class="navigator" aria-label="Models">${list.map(m => `<a class="nv${m.id === cur ? ' on' : ''}" href="/models/${encodeURIComponent(m.id)}"${m.id === cur ? ' aria-current="page"' : ''}><img src="${esc(m.urls.ref)}" alt="" loading="lazy"><span>${esc(m.name)}</span><b class="${status(m)}">${pct(m.outline)}</b></a>`).join('')}</nav>`;
}

function landing(list){
  document.title = 'Models';
  const groups = [...new Set(list.map(m => m.group || 'Models'))];
  root.innerHTML = `<div class="intro"><div class="eyebrow">Models</div><h1>Models made from your images</h1>
    <p>Every model I build to match an image gets a page: your image beside the 3D model, how well it matches, what I did, and the file details. Pick one to open it.</p></div>` +
    groups.map(g => { const ms = list.filter(m => (m.group || 'Models') === g); return `
    <section class="group"><h2>${esc(g)} <small>${ms.length} model${ms.length === 1 ? '' : 's'} · outline match shown</small></h2>${navigator(ms)}
    <div class="tiles">${ms.map(m => `
      <a class="tile" href="/models/${encodeURIComponent(m.id)}">
        <div class="tp"><img src="${esc(m.urls.ref)}" alt="Reference image" loading="lazy"><img src="${esc(m.urls.render || m.urls.ref)}" alt="Fitted model" loading="lazy"></div>
        <div class="tm"><strong>${esc(m.name)}</strong><span class="chip ${status(m)}">${LABEL[status(m)]}</span></div>
        <div class="tm sub"><span>${esc(m.subject)}</span><b>${pct(m.outline)}</b></div>
      </a>`).join('')}</div></section>`; }).join('');
}

// Verdicts go to the same inbox as the app's feedback button, tagged with the thread that owns the models review.
const REVIEW_THREAD = 'cmsg_01USVJqCbJruSGtaP4zsE2eYAb48x2DmDDA14qSKHaFgpa';
const VERDICT = {reject:'Rejected', adjust:'Adjust', accept:'Accepted'};
const saved = id => { try { return JSON.parse(localStorage.getItem('model-verdict:' + id) || 'null'); } catch { return null; } };

function model(list, id){
  const i = list.findIndex(m => m.id === id);
  if (i < 0){ root.innerHTML = `<p class="empty">There is no model called “${esc(id)}”. <a href="/models">See all models</a>.</p>`; return; }
  const m = list[i], prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length], st = status(m), nm = esc(m.name.toLowerCase());
  document.title = m.name + ' · Models';
  crumb.innerHTML = `<a href="/models">Models</a><span>/</span><span>${esc(m.name)}</span>`;
  const [theta, phi] = m.orbit || [-20, 65], v = saved(m.id);
  const cell = (h, body) => `<section class="cell"><h2>${h}</h2>${body}</section>`;
  root.innerHTML = `
  <article class="card slim">
    <header class="dbar">
      <a class="step" href="/models/${encodeURIComponent(prev.id)}" aria-label="Previous: ${esc(prev.name)}">←</a>
      <div class="dname"><div class="eyebrow">${esc(m.group)}${m.subject ? ' · ' + esc(m.subject) : ''}</div><h1>${esc(m.name)}</h1></div>
      <div class="headline"><span class="chip ${st}">${LABEL[st]}</span><span class="big">${pct(m.outline)}</span><span class="small">outline match</span></div>
      <a class="step" href="/models/${encodeURIComponent(next.id)}" aria-label="Next: ${esc(next.name)}">→</a>
    </header>
    <div class="row3">
      <figure class="pane"><img src="${esc(m.urls.ref)}" alt="Your reference image of the ${nm}"><figcaption>Your image</figcaption></figure>
      <figure class="pane viewer" data-src="${esc(m.urls.glb)}" data-theta="${+theta}" data-phi="${+phi}">
        <div class="stage"><canvas aria-label="Interactive 3D model of the ${nm}"></canvas><div class="msg">Loading 3D model…</div></div>
        <figcaption><span>My 3D model · drag to turn</span><span class="btns"><button type="button" class="reset">Reset view</button><button type="button" class="motion" aria-pressed="true" hidden>Motion</button><button type="button" class="spin" aria-pressed="false">Spin</button></span></figcaption>
      </figure>
      <aside class="verdict">
        <label for="vnote">Your notes</label>
        <textarea id="vnote" maxlength="4000" placeholder="What should change?">${esc(v?.note || '')}</textarea>
        <button type="button" class="vb reject" data-v="reject">Reject<small>start over</small></button>
        <button type="button" class="vb adjust" data-v="adjust">Adjust<small>use my notes</small></button>
        <button type="button" class="vb accept" data-v="accept">Accept<small>ship it</small></button>
        <p class="vstate" id="vstate">${v ? `${VERDICT[v.verdict]} · sent to Claude` : ''}</p>
      </aside>
    </div>
    <footer class="dbar bottom">
      ${m.urls.render || m.urls.overlay ? cell('Match', `<div class="minis">${m.urls.render ? `<img src="${esc(m.urls.render)}" alt="My model rendered from your camera" title="My model from your camera" loading="lazy">` : ''}${m.urls.overlay ? `<img src="${esc(m.urls.overlay)}" alt="Silhouette overlay" title="White both · blue yours only · red mine only" loading="lazy">` : ''}</div>`) : ''}
      ${(m.scores || []).length ? cell('Scores', `<div class="bars">${m.scores.map(s => `<div class="bar"><span class="bl" title="${esc(s.help)}">${esc(s.label)}</span><span class="track"><i style="width:${Math.max(2, Math.round(s.value * 100))}%"></i></span><span class="bv">${pct(s.value)}</span></div>`).join('')}</div>${m.loss ? `<p class="score">Loss <b>${(+m.loss.before).toFixed(3)} → ${(+m.loss.after).toFixed(3)}</b></p>` : ''}`) : ''}
      ${cell('What matches', `<ul class="ticks good">${(m.good || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${cell('What is off', `<ul class="ticks off">${(m.off || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`)}
      ${cell('What I did', `<ol class="steps">${(m.steps || []).map(([h, t]) => `<li><b>${esc(h)}</b> ${esc(t)}</li>`).join('')}</ol>`)}
      ${cell('Details', `<dl>${(m.details || []).map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('')}<dt>File</dt><dd><a href="${esc(m.urls.glb)}" download="${esc(m.id)}.glb">${esc(m.id)}.glb</a></dd></dl>`)}
    </footer>
  </article>`;
  mountViewer(root.querySelector('.viewer'));
  root.querySelectorAll('.cell').forEach(c => c.addEventListener('click', e => { if (!e.target.closest('a')) c.classList.toggle('open'); }));
  const note = root.querySelector('#vnote'), state = root.querySelector('#vstate');
  root.querySelectorAll('.vb').forEach(b => b.addEventListener('click', async () => {
    const verdict = b.dataset.v, text = note.value.trim();
    if (verdict === 'adjust' && !text){ note.focus(); note.placeholder = 'Say what to change, then press Adjust'; return; }
    try { localStorage.setItem('model-verdict:' + m.id, JSON.stringify({verdict, note: text, at: new Date().toISOString()})); } catch {}
    state.textContent = 'Sending…';
    const ok = await fetch('/api/feedback', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
      note: `[${VERDICT[verdict]}] ${m.name} (/models/${m.id})${text ? ': ' + text : ''}`, page: location.pathname, title: document.title,
      thread: REVIEW_THREAD, threadTitle: 'Models review', viewport: `${innerWidth}x${innerHeight}@${devicePixelRatio}`})}).then(r => r.ok).catch(() => false);
    state.textContent = ok ? `${VERDICT[verdict]} · sent to Claude` : `${VERDICT[verdict]} · saved here, not sent (try again)`;
    root.querySelectorAll('.vb').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  if (v) root.querySelector(`.vb.${v.verdict}`)?.setAttribute('aria-pressed', 'true');
}

const list = await catalogue();
if (!list.length) root.innerHTML = '<p class="empty">No models yet.</p>';
else if (root.dataset.view === 'landing') landing(list);
else {
  const seg = location.pathname.replace(/\/+$/, '').split('/').pop();
  model(list, seg === 'model.html' ? new URLSearchParams(location.search).get('id') || '' : decodeURIComponent(seg));
}
