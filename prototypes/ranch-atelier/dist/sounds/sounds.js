// /sounds renders from catalogues fetched at load, like /models, so a sound the engineer adds shows up with no rebuild.
// The bundled /sounds/manifest.json lists every slot and pick (written by tools/sound-engineer/manifest.mjs) and
// /music/catalog.json the composer's music;
// /api/sounds (the R2 catalogue the sound-store Action publishes) adds the stored audio, waveform and measurements.
// Records share the model catalogue's shape (id, name, kind, group, urls, provenance) plus media:'sound'.
const SOURCES = [window.SOUNDS_CATALOG_URL, '/api/sounds'].filter(Boolean);
const KINDS = [['all', 'All'], ['ambience', 'Ambience'], ['animal', 'Animals'], ['effect', 'Effects'], ['ui', 'Interface'], ['music', 'Music']];
const STATE = {stored: 'In the store', picked: 'Picked, not stored yet', bundled: 'On the site'};
const root = document.getElementById('root'), crumb = document.getElementById('crumb');
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const secs = x => !Number.isFinite(+x) ? '' : x < 60 ? (+x).toFixed(1) + ' s' : Math.floor(x / 60) + ':' + String(Math.round(x % 60)).padStart(2, '0');
const audioUrl = s => s.urls?.audio || s.urls?.mp3 || s.urls?.ogg || null;
const status = s => audioUrl(s) ? (s.status === 'bundled' ? 'bundled' : 'stored') : 'picked';

async function json(url){
  try {
    const r = await fetch(url, {headers:{accept:'application/json'}});
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
    const j = await r.json();
    return Array.isArray(j) ? j : j.sounds;
  } catch { return null; }
}

// Bundled list first (every cue, stored or not), then stored records replace theirs by id.
async function catalogue(){
  // The composer's scores (music beds, interludes and stings) publish their own list in the same shape.
  const base = [...(await json('/sounds/manifest.json') || []), ...(await json('/music/catalog.json') || [])];
  const byId = new Map(base.map(s => [s.id, s]));
  for (const url of SOURCES){
    const stored = await json(url);
    if (!stored?.length) continue;
    for (const s of stored) byId.set(s.id, {...byId.get(s.id), ...s});
    break;
  }
  return [...byId.values()];
}

// ---- one player for the whole page
const player = new Audio();
player.preload = 'none';
let playing = null; // id
const listeners = new Set();
const notify = () => listeners.forEach(f => f());
player.addEventListener('play', notify); player.addEventListener('pause', notify); player.addEventListener('ended', () => { if (!player.loop) playing = null; notify(); });
player.addEventListener('timeupdate', notify);
function toggle(s){
  const url = audioUrl(s);
  if (!url) return;
  if (playing === s.id && !player.paused) { player.pause(); return; }
  if (playing !== s.id) { player.src = url; playing = s.id; player.loop = Boolean(s.loop && document.querySelector('.loop[aria-pressed="true"]')); }
  player.play().catch(() => {});
}

// ---- waveform: stored peaks, or decoded from the file for bundled sounds
const decoded = new Map();
async function peaksOf(s, n = 120){
  if (Array.isArray(s.peaks) && s.peaks.length) return s.peaks;
  const url = audioUrl(s);
  if (!url) return null;
  if (!decoded.has(url)) decoded.set(url, (async () => {
    const buf = await (await fetch(url)).arrayBuffer();
    const ctx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 44100);
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0), step = Math.max(1, Math.floor(data.length / n)), out = [];
    for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step, e = Math.min(data.length, j + step); j < e; j++) m = Math.max(m, Math.abs(data[j])); out.push(+m.toFixed(3)); }
    const top = Math.max(...out, 1e-6);
    return out.map(v => +(v / top).toFixed(3));
  })().catch(() => null));
  return decoded.get(url);
}

function drawWave(el, peaks, progress){
  const c = el.querySelector('canvas'), r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  if (!r.width) return;
  c.width = r.width * dpr; c.height = r.height * dpr;
  const g = c.getContext('2d'), css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--app-accent').trim() || '#3f7a43', dim = css.getPropertyValue('--app-border').trim() || '#d8cfb2';
  g.clearRect(0, 0, c.width, c.height);
  const n = peaks.length, w = c.width / n, mid = c.height / 2;
  for (let i = 0; i < n; i++) {
    const h = Math.max(dpr, peaks[i] * (c.height * .92));
    g.fillStyle = i / n < progress ? ink : dim;
    g.fillRect(i * w + w * .18, mid - h / 2, Math.max(dpr, w * .64), h);
  }
}

async function mountWave(el, s){
  if (!audioUrl(s)) { el.classList.add('off'); el.insertAdjacentHTML('beforeend', `<span class="note">${s.status === 'picked' || !s.status ? 'Waiting for the sound store' : 'No audio'}</span>`); return; }
  const peaks = await peaksOf(s, el.classList.contains('big') ? 240 : 120);
  if (!peaks) { el.insertAdjacentHTML('beforeend', '<span class="note">Could not read this file</span>'); return; }
  const redraw = () => drawWave(el, peaks, playing === s.id && player.duration ? player.currentTime / player.duration : 0);
  redraw(); listeners.add(redraw); new ResizeObserver(redraw).observe(el);
  el.addEventListener('pointerdown', e => {
    const f = Math.min(1, Math.max(0, (e.clientX - el.getBoundingClientRect().left) / el.clientWidth));
    if (playing !== s.id) toggle(s);
    const seek = () => { if (player.duration) player.currentTime = f * player.duration; };
    player.readyState >= 1 ? seek() : player.addEventListener('loadedmetadata', seek, {once:true});
  });
}

function mountPlay(btn, s){
  if (!audioUrl(s)) { btn.disabled = true; btn.title = 'Not in the store yet'; }
  const render = () => { const on = playing === s.id && !player.paused; btn.innerHTML = on ? PAUSE : PLAY; btn.setAttribute('aria-label', (on ? 'Pause ' : 'Play ') + s.name); };
  render(); listeners.add(render);
  btn.onclick = () => toggle(s);
}

const meta = s => [s.duration ? secs(s.duration) : '', Number.isFinite(s.loudness) ? `${(+s.loudness).toFixed(0)} LUFS` : '', s.loop ? 'loops' : ''].filter(Boolean).join(' · ');

// ---- landing
function landing(list){
  document.title = 'Sounds';
  const kinds = KINDS.filter(([k]) => k === 'all' || list.some(s => s.kind === k));
  const stored = list.filter(s => audioUrl(s)).length;
  root.innerHTML = `<div class="intro"><div class="eyebrow">Sounds</div><h1>Sounds for Abbie’s World</h1>
    <p>Every sound the game plays, and every one the sound engineer has picked for it. Press play to listen, or open one to see where it came from, how it was cut and where the game uses it. ${stored} of ${list.length} are ready to play.</p></div>
    <div class="sbar"><input type="search" placeholder="Search sounds" aria-label="Search sounds"><div class="chips" role="group" aria-label="Kind">${kinds.map(([k, label], i) => `<button type="button" data-kind="${k}" aria-pressed="${i === 0}">${label}</button>`).join('')}</div></div>
    <div id="groups"></div>`;
  const q = root.querySelector('input'), groups = root.querySelector('#groups');
  let kind = 'all';
  const render = () => {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    const shown = list.filter(s => (kind === 'all' || s.kind === kind) && words.every(w => [s.name, s.subject, s.group, ...(s.tags || []), ...(s.uses || [])].join(' ').toLowerCase().includes(w)));
    listeners.clear();
    if (!shown.length) { groups.innerHTML = '<p class="empty-filter">No sounds match.</p>'; return; }
    const names = [...new Set(shown.map(s => s.group || 'Sounds'))];
    groups.innerHTML = names.map(g => { const ss = shown.filter(s => (s.group || 'Sounds') === g); return `
      <section class="group"><h2>${esc(g)} <small>${ss.length} sound${ss.length === 1 ? '' : 's'}</small></h2><div class="rows">${ss.map(s => `
        <div class="row" data-id="${esc(s.id)}">
          <button type="button" class="play"></button>
          <div class="who"><a href="/sounds/${encodeURIComponent(s.id)}">${esc(s.name)}</a><small>${esc(s.subject || '')}</small></div>
          <div class="wave"><canvas aria-hidden="true"></canvas></div>
          <div class="meta"><span>${esc(meta(s))}</span><span class="tag ${status(s)}">${STATE[status(s)]}</span></div>
        </div>`).join('')}</div></section>`; }).join('');
    for (const row of groups.querySelectorAll('.row')) {
      const s = list.find(x => x.id === row.dataset.id);
      mountPlay(row.querySelector('.play'), s);
      mountWave(row.querySelector('.wave'), s);
    }
  };
  q.oninput = render;
  root.querySelector('.chips').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    kind = b.dataset.kind;
    for (const x of root.querySelectorAll('.chips button')) x.setAttribute('aria-pressed', String(x === b));
    render();
  };
  render();
}

// ---- one sound
function sound(list, id){
  const i = list.findIndex(s => s.id === id);
  if (i < 0){ root.innerHTML = `<p class="empty">There is no sound called “${esc(id)}”. <a href="/sounds">See all sounds</a>.</p>`; return; }
  const s = list[i], prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length], st = status(s), src = s.source || {}, rc = s.recipe || {};
  document.title = s.name + ' · Sounds';
  crumb.innerHTML = `<a href="/sounds">Sounds</a><span>/</span><span>${esc(s.name)}</span>`;
  const details = [
    ['Length', s.duration ? secs(s.duration) : null], ['Loudness', Number.isFinite(s.loudness) ? `${(+s.loudness).toFixed(1)} LUFS (target ${rc.target ?? '–'})` : null],
    ['Peak', Number.isFinite(s.peak) ? `${(+s.peak).toFixed(1)} dBTP` : null], ['Channels', s.channels ? (s.channels === 1 ? 'Mono' : 'Stereo') : null],
    ['File size', s.bytes ? `${(s.bytes / 1024).toFixed(0)} KB` : null], ['SHA-256', s.sha256 ? s.sha256.slice(0, 16) + '…' : null],
  ].filter(([, v]) => v);
  const recipe = [
    rc.trim ? `Cut ${secs(rc.trim[0])} to ${secs(rc.trim[1])} of the original.` : 'Whole file.',
    rc.fade != null ? `${rc.fade} s fades in and out${s.loop ? ', with a crossfaded loop point' : ''}.` : null,
    rc.gain ? `Gain ${rc.gain > 0 ? '+' : ''}${rc.gain} dB before levelling.` : null,
    rc.target != null ? `Levelled to ${rc.target} LUFS, true peak under −1 dB.` : null,
    rc.mono ? 'Folded to mono.' : null, rc.format ? `Encoded as ${String(rc.format).toUpperCase()}.` : null,
  ].filter(Boolean);
  root.innerHTML = `
  <article class="card">
    <header class="ch">
      <div><div class="eyebrow">${esc(s.group)}</div><h1>${esc(s.name)}</h1></div>
      <div class="headline"><span class="tag ${st}">${STATE[st]}</span>${s.duration ? `<span class="big">${secs(s.duration)}</span>` : ''}</div>
    </header>
    <p>${esc(s.subject || '')}</p>
    <div class="wave big"><canvas aria-label="Waveform of ${esc(s.name)}; click to jump"></canvas></div>
    <div class="transport"><button type="button" class="play"></button><span class="time">0.0 s</span>
      ${s.loop ? '<span class="btns"><button type="button" class="loop" aria-pressed="true">Loop</button></span>' : ''}
      <label>Volume <input type="range" class="vol" min="0" max="1" step=".01" value="${player.volume}"></label></div>
    <div class="grid3">
      <section class="block"><h2>Where the game plays it</h2>
        ${(s.uses || []).length ? `<div class="uses">${s.uses.map(u => `<span>${esc(u)}</span>`).join('')}</div>` : '<p>Not assigned to a game moment yet.</p>'}
        ${(s.tags || []).length ? `<h2>Tags</h2><div class="uses">${s.tags.map(u => `<span>${esc(u)}</span>`).join('')}</div>` : ''}
      </section>
      <section class="block"><h2>Why this one</h2>
        ${(s.notes || []).length ? `<ul class="ticks good">${s.notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${(s.candidates || []).length ? `<h2>What I listened to</h2><ul class="cands">${s.candidates.map(c => `<li><b class="${c.path === src.path ? 'picked' : ''}">${esc(c.title || c.path.split('/').pop())}${c.path === src.path ? ' · picked' : ''}</b><small>${esc(c.why || '')}${c.why ? ' · ' : ''}${esc(c.ref || '')}</small></li>`).join('')}</ul>` : ''}
      </section>
      <section class="block"><h2>How I cut it</h2><ol class="steps">${recipe.map(r => `<li>${esc(r)}</li>`).join('')}</ol></section>
    </div>
    <section class="block details"><h2>Details</h2><dl>
      ${src.library ? `<dt>Source</dt><dd>${esc(src.library)}${src.bundle ? ' · ' + esc(src.bundle.toUpperCase()) : ''}${src.publisher ? ' · ' + esc(src.publisher) : ''}</dd>` : ''}
      ${src.path ? `<dt>Original file</dt><dd class="mono">${esc(src.path)}${src.part ? ` (part ${esc(src.part.split('/')[1])})` : ''}</dd>` : ''}
      ${details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
      <dt>Licence</dt><dd>${s.license === 'sonniss-gdc' ? 'Sonniss GDC bundle licence: free to use in the game, no credit needed. The sound itself may not be passed on as a sound effect, so there is no download here.' : esc(s.license || 'Made for Abbie’s World')}</dd>
      ${s.date ? `<dt>Date</dt><dd>${esc(s.date)}</dd>` : ''}
    </dl></section>
    <nav class="pn"><a href="/sounds/${encodeURIComponent(prev.id)}">← ${esc(prev.name)}</a><a href="/sounds">All sounds</a><a href="/sounds/${encodeURIComponent(next.id)}">${esc(next.name)} →</a></nav>
  </article>`;
  mountPlay(root.querySelector('.play'), s);
  mountWave(root.querySelector('.wave'), s);
  const time = root.querySelector('.time');
  listeners.add(() => { time.textContent = playing === s.id ? `${secs(player.currentTime)} / ${secs(player.duration || s.duration)}` : secs(s.duration) || '0.0 s'; });
  root.querySelector('.vol').oninput = e => { player.volume = +e.target.value; };
  const loop = root.querySelector('.loop');
  if (loop) loop.onclick = () => { const on = loop.getAttribute('aria-pressed') !== 'true'; loop.setAttribute('aria-pressed', String(on)); player.loop = on && playing === s.id; };
}

addEventListener('keydown', e => { if (e.code === 'Space' && e.target === document.body && playing) { e.preventDefault(); player.paused ? player.play() : player.pause(); } });

const list = await catalogue();
if (!list.length) root.innerHTML = '<p class="empty">No sounds yet.</p>';
else if (root.dataset.view === 'landing') landing(list);
else {
  const seg = location.pathname.replace(/\/+$/, '').split('/').pop();
  sound(list, seg === 'sound.html' ? new URLSearchParams(location.search).get('id') || '' : decodeURIComponent(seg));
}
