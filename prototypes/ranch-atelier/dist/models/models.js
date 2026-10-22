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

function model(list, id){
  const i = list.findIndex(m => m.id === id);
  if (i < 0){ root.innerHTML = `<p class="empty">There is no model called “${esc(id)}”. <a href="/models">See all models</a>.</p>`; return; }
  const m = list[i], prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length], st = status(m), nm = esc(m.name.toLowerCase());
  document.title = m.name + ' · Models';
  crumb.innerHTML = `<a href="/models">Models</a><span>/</span><span>${esc(m.name)}</span>`;
  const [theta, phi] = m.orbit || [-20, 65];
  root.innerHTML = navigator(list, m.id) + `
  <article class="card">
    <header class="ch">
      <div><div class="eyebrow">${esc(m.group)}${m.subject ? ' · ' + esc(m.subject) : ''}</div><h1>${esc(m.name)}</h1></div>
      <div class="headline"><span class="chip ${st}">${LABEL[st]}</span><span class="big">${pct(m.outline)}</span><span class="small">outline match</span></div>
    </header>
    <div class="pair">
      <figure class="pane"><img src="${esc(m.urls.ref)}" alt="Your reference image of the ${nm}"><figcaption>Your image</figcaption></figure>
      <figure class="pane viewer" data-src="${esc(m.urls.glb)}" data-theta="${+theta}" data-phi="${+phi}">
        <div class="stage"><canvas aria-label="Interactive 3D model of the ${nm}"></canvas><div class="msg">Loading 3D model…</div></div>
        <figcaption><span>My 3D model · drag to turn, scroll or pinch to zoom</span><span class="btns"><button type="button" class="reset">Reset view</button><button type="button" class="motion" aria-pressed="true" hidden>Motion</button><button type="button" class="spin" aria-pressed="false">Spin</button></span></figcaption>
      </figure>
    </div>
    <div class="grid3">
      <section class="block">
        <h2>How well it matches</h2>
        ${m.urls.render || m.urls.overlay ? `<div class="thumbs">
          ${m.urls.render ? `<figure><img src="${esc(m.urls.render)}" alt="My model rendered from your camera" loading="lazy"><figcaption>My model from your camera</figcaption></figure>` : ''}
          ${m.urls.overlay ? `<figure><img src="${esc(m.urls.overlay)}" alt="Silhouette overlay" loading="lazy"><figcaption>Overlay: white both · <b class="k-blue">blue</b> yours only · <b class="k-red">red</b> mine only</figcaption></figure>` : ''}
        </div>` : ''}
        <div class="bars">${(m.scores || []).map(s => `<div class="bar"><span class="bl" title="${esc(s.help)}">${esc(s.label)}</span><span class="track"><i style="width:${Math.max(2, Math.round(s.value * 100))}%"></i></span><span class="bv">${pct(s.value)}</span></div>`).join('')}</div>
        ${m.loss ? `<p class="score">Overall loss <b>${(+m.loss.before).toFixed(3)} → ${(+m.loss.after).toFixed(3)}</b> ${esc(m.loss.note || '')}.</p>` : ''}
      </section>
      <section class="block">
        <h2>What matches</h2><ul class="ticks good">${(m.good || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <h2>What is off</h2><ul class="ticks off">${(m.off || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </section>
      <section class="block">
        <h2>What I did</h2>
        <ol class="steps">${(m.steps || []).map(([h, t]) => `<li><b>${esc(h)}</b> ${esc(t)}</li>`).join('')}</ol>
      </section>
    </div>
    <section class="block details"><h2>Details</h2>
      <dl>${(m.details || []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
        <dt>Download</dt><dd><a href="${esc(m.urls.glb)}" download="${esc(m.id)}.glb">${esc(m.id)}.glb</a></dd></dl>
    </section>
    <nav class="pn"><a href="/models/${encodeURIComponent(prev.id)}">← ${esc(prev.name)}</a><a href="/models">All models</a><a href="/models/${encodeURIComponent(next.id)}">${esc(next.name)} →</a></nav>
  </article>`;
  mountViewer(root.querySelector('.viewer'));
}

const list = await catalogue();
if (!list.length) root.innerHTML = '<p class="empty">No models yet.</p>';
else if (root.dataset.view === 'landing') landing(list);
else {
  const seg = location.pathname.replace(/\/+$/, '').split('/').pop();
  model(list, seg === 'model.html' ? new URLSearchParams(location.search).get('id') || '' : decodeURIComponent(seg));
}
