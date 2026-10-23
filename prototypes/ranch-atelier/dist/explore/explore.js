// Explore: one library for everything the world is made of. Models, cards, HUDs and the studies behind them share one grid,
// one viewer and one set of shelves. Every collection is read when the page opens, so new work appears with no rebuild:
//   models  /api/models (R2), falling back to the bundled /models/manifest.json
//   cards   /api/library?c=cards   huds /api/library?c=huds   (R2 library/<c>/catalog.json; empty until the first is published)
//   reports /api/library?c=reports (every study under docs/oracle on main)
// Shelves and picks are this browser's own (localStorage); nothing here writes to the server.
import {mountStage} from '/explore/stage.js?v=1';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pct = x => Math.round(100 * x) + '%';
const store = {
  get(k, d){ try { const v = localStorage.getItem('explore.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem('explore.' + k, JSON.stringify(v)); } catch {} },
};

const ICON = {
  all: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
  models: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  cards: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M9 7h6M12 14l1.6 1.6L12 17.2l-1.6-1.6z"/></svg>',
  huds: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M6 9h4M14 9h4M6 15h3"/><circle cx="16" cy="15" r="1.5"/></svg>',
  reports: '<svg viewBox="0 0 24 24"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 7h6"/></svg>',
  tick: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
};
const COLLECTIONS = [
  {id: 'all', name: 'Everything'},
  {id: 'models', name: 'Models', kind: 'model'},
  {id: 'cards', name: 'Cards', kind: 'card'},
  {id: 'huds', name: 'HUDs', kind: 'hud'},
  {id: 'reports', name: 'Reports', kind: 'report'},
];
const WAITING = {
  cards: ['Cards are on their way', 'Each card the card maker finishes lands on this shelf by itself. The study behind them is already here.'],
  huds: ['HUDs are on their way', 'Each HUD from the HUD study lands on this shelf by itself, with its report beside it.'],
  models: ['Models are on their way', 'Every model built to match an image lands here.'],
  reports: ['No reports yet', 'Studies merged under docs/oracle appear here by themselves.'],
};
const STATUS = {good: 'Close match', partial: 'Partial match', weak: 'Weak match'};
const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return (h + 20) % 360; };

/* ---------- sound: every verb answers, pitch wanders a little, picks climb a pentatonic scale ---------- */
const sound = (() => {
  let ac, on = store.get('sound', true), last = 0;
  const ctx = () => { if (!ac) { try { ac = new AudioContext(); } catch { return null; } } if (ac.state === 'suspended') ac.resume(); return ac; };
  const tone = (f, {type = 'sine', dur = 0.12, vol = 0.08, at = 0, slide = 0} = {}) => {
    const a = on && ctx(); if (!a) return;
    const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain(), wob = 1 + (Math.random() - 0.5) * 0.12;
    o.type = type; o.frequency.setValueAtTime(f * wob, t); if (slide) o.frequency.exponentialRampToValueAtTime(f * wob * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const PENTA = [0, 2, 4, 7, 9];
  const note = n => 392 * Math.pow(2, (PENTA[n % 5] + 12 * Math.floor(n / 5)) / 12);
  return {
    get on(){ return on; }, set on(v){ on = v; store.set('sound', v); },
    hover(){ const t = performance.now(); if (t - last < 70) return; last = t; tone(1500, {dur: 0.035, vol: 0.012}); },
    pick(n){ tone(note(Math.min(n, 14)), {type: 'triangle', dur: 0.18, vol: 0.07}); },
    unpick(){ tone(330, {type: 'triangle', dur: 0.12, vol: 0.05, slide: 0.8}); },
    open(){ tone(523, {dur: 0.16, vol: 0.06}); tone(784, {dur: 0.22, vol: 0.05, at: 0.06}); tone(220, {type: 'triangle', dur: 0.3, vol: 0.03, slide: 2}); },
    close(){ tone(660, {dur: 0.14, vol: 0.05, slide: 0.6}); },
    step(d){ tone(d > 0 ? 880 : 740, {dur: 0.06, vol: 0.03}); },
    switch(){ tone(587, {type: 'triangle', dur: 0.1, vol: 0.05}); tone(880, {type: 'triangle', dur: 0.12, vol: 0.04, at: 0.05}); },
    drop(){ tone(140, {type: 'triangle', dur: 0.22, vol: 0.14, slide: 0.7}); tone(1046, {dur: 0.25, vol: 0.05, at: 0.05}); tone(1318, {dur: 0.3, vol: 0.04, at: 0.11}); },
    boop(){ tone(260, {type: 'sine', dur: 0.16, vol: 0.06, slide: 0.75}); },
  };
})();

/* ---------- data ---------- */
async function json(url){
  const r = await fetch(url, {headers: {accept: 'application/json'}});
  if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) throw new Error(url + ' ' + r.status);
  return r.json();
}
const firstList = async (urls, key) => { for (const u of urls) { try { const j = await json(u), l = Array.isArray(j) ? j : j[key]; if (Array.isArray(l) && l.length) return l; } catch {} } return []; };
const modelStatus = m => STATUS[m.status] ? m.status : (m.outline >= 0.85 ? 'good' : m.outline >= 0.75 ? 'partial' : 'weak');

const toItem = {
  model: m => ({kind: 'model', coll: 'models', id: m.id, name: m.name, sub: m.subject || '', set: m.group || 'Models', date: m.date || '', status: modelStatus(m), score: m.outline,
    thumb: m.urls?.ref, alt: m.urls?.render, raw: m}),
  card: c => ({kind: 'card', coll: 'cards', id: c.id, name: c.name, sub: c.subject || c.summary || '', set: c.group || c.set || 'Cards', date: c.date || '', status: c.status, score: c.score,
    thumb: c.thumb || c.image, alt: c.back, raw: c}),
  hud: h => ({kind: 'hud', coll: 'huds', id: h.id, name: h.name, sub: h.subject || h.summary || '', set: h.group || h.set || 'HUDs', date: h.date || '', status: h.status, score: h.score,
    thumb: h.thumb || h.image, raw: h}),
  report: r => ({kind: 'report', coll: 'reports', id: r.id, name: r.name, sub: r.summary || '', set: r.group || 'Reports', date: r.date || '', beside: r.beside, raw: r}),
};

const S = {
  items: [], byKey: new Map(), coll: 'all', q: '', filters: {status: new Set(), kind: new Set(), set: new Set()},
  tile: store.get('tile', innerWidth < 760 ? 112 : 150), names: store.get('names', false), byDay: store.get('byDay', false),
  picked: new Set(), anchor: null, visible: [], shelves: store.get('shelves', []), lens: -1, loaded: false,
};
const keyOf = it => it.kind + ':' + it.id;

async function load(){
  const [models, cards, huds, reports] = await Promise.all([
    firstList([window.MODELS_CATALOG_URL, '/api/models', '/models/manifest.json'].filter(Boolean), 'models'),
    firstList(['/api/library?c=cards', '/explore/collections/cards.json'], 'items'),
    firstList(['/api/library?c=huds', '/explore/collections/huds.json'], 'items'),
    firstList(['/api/library?c=reports', '/explore/collections/reports.json'], 'items'),
  ]);
  S.items = [...models.map(toItem.model), ...cards.map(toItem.card), ...huds.map(toItem.hud), ...reports.map(toItem.report)].filter(i => i.id && i.name);
  S.byKey = new Map(S.items.map(i => [keyOf(i), i]));
  S.loaded = true;
}

/* ---------- the view: what is visible ---------- */
function inColl(it){
  if (S.coll.startsWith('shelf:')) return (S.shelves.find(s => 'shelf:' + s.id === S.coll)?.keys || []).includes(keyOf(it));
  return S.coll === 'all' || it.coll === S.coll;
}
function matches(it){
  const f = S.filters;
  if (f.status.size && !f.status.has(it.status)) return false;
  if (f.kind.size && !f.kind.has(it.coll)) return false;
  if (f.set.size && !f.set.has(it.set)) return false;
  if (S.q){ const hay = (it.name + ' ' + it.sub + ' ' + it.set + ' ' + it.kind).toLowerCase(); if (!S.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false; }
  return true;
}
function dayLabel(d){
  if (!d) return 'Undated';
  const t = new Date(d + 'T12:00:00'), now = new Date(), diff = Math.round((new Date(now.toDateString()) - new Date(t.toDateString())) / 864e5);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday';
  if (diff < 7) return t.toLocaleDateString(undefined, {weekday: 'long'});
  return t.toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: t.getFullYear() === now.getFullYear() ? undefined : 'numeric'});
}

/* ---------- rendering ---------- */
function thumbHTML(it){
  if (it.kind === 'report') return `<div class="tome" style="--h:${hue(it.name)}"><em>${esc(it.set.replace(/ studies$/, ''))}</em><strong>${esc(it.name)}</strong><i></i></div>`;
  return `<img src="${esc(it.thumb)}" alt="" loading="lazy" decoding="async">${it.alt ? `<img class="alt" src="${esc(it.alt)}" alt="" loading="lazy" decoding="async">` : ''}`;
}
function tileHTML(it, i){
  const k = keyOf(it), score = typeof it.score === 'number' ? `<b class="${esc(it.status || '')}">${pct(it.score)}</b>` : '';
  return `<div class="tile${S.picked.has(k) ? ' on' : ''}" role="listitem" tabindex="0" data-k="${esc(k)}" style="--i:${Math.min(i, 24)}" aria-label="${esc(it.name)}">${thumbHTML(it)}
    <div class="cap"><span>${esc(it.name)}</span>${score}</div><button class="tick" tabindex="-1" aria-label="Pick">${ICON.tick}</button></div>`;
}
function renderRail(){
  const counts = c => c === 'all' ? S.items.length : S.items.filter(i => i.coll === c).length;
  $('#collections').innerHTML = COLLECTIONS.map((c, n) => `<button class="coll${S.coll === c.id ? ' on' : ''}" role="listitem" data-c="${c.id}" title="${c.name} (${n + 1})"><span class="glyph">${ICON[c.id]}</span><span>${c.name}</span><span class="n">${S.loaded ? counts(c.id) : ''}</span></button>`).join('');
  $('#shelves').innerHTML = S.shelves.length ? S.shelves.map(s => {
    const peek = s.keys.map(k => S.byKey.get(k)).filter(i => i && i.thumb).slice(0, 4);
    return `<button class="shelf${S.coll === 'shelf:' + s.id ? ' on' : ''}" role="listitem" data-s="${esc(s.id)}"><span class="swatch">${peek.map(i => `<img src="${esc(i.thumb)}" alt="">`).join('')}</span><span class="label">${esc(s.name)}</span><span class="n">${s.keys.length}</span></button>`;
  }).join('') : '<p class="shelf-empty">Drag anything here to keep it together.</p>';
}
function renderFacets(){
  const base = S.items.filter(inColl), count = (k, v) => base.filter(i => i[k] === v).length;
  const groups = [];
  const statuses = ['good', 'partial', 'weak'].filter(s => count('status', s));
  if (statuses.length) groups.push(['Match', 'status', statuses.map(s => [s, STATUS[s], count('status', s), `<i class="dot ${s}"></i>`])]);
  const kinds = COLLECTIONS.slice(1).map(c => c.id).filter(c => count('coll', c));
  if (kinds.length > 1) groups.push(['Kind', 'kind', kinds.map(c => [c, COLLECTIONS.find(x => x.id === c).name, count('coll', c), ''])]);
  const sets = [...new Set(base.map(i => i.set))];
  if (sets.length > 1) groups.push(['Set', 'set', sets.slice(0, 16).map(s => [s, s, count('set', s), ''])]);
  $('#facets').innerHTML = groups.length ? groups.map(([title, key, opts]) => `<div class="group"><h3>${title}</h3><div class="chips">${opts.map(([v, label, n, dot]) =>
    `<button class="chip" data-f="${key}" data-v="${esc(v)}" aria-pressed="${S.filters[key].has(v)}">${dot}${esc(label)} <small>${n}</small></button>`).join('')}</div></div>`).join('') : '';
  const n = Object.values(S.filters).reduce((a, s) => a + s.size, 0), b = $('#filter-count');
  b.hidden = !n; b.textContent = n;
}
function renderToggles(){
  const t = [['names', 'Names on tiles', S.names], ['byDay', 'Group by day', S.byDay], ['sound', 'Sound', sound.on]];
  $('#view-toggles').innerHTML = t.map(([k, label, on]) => `<button class="switch" role="switch" data-t="${k}" aria-checked="${on}"><span>${label}</span><i></i></button>`).join('');
  document.body.classList.toggle('names', S.names);
}
function renderStudies(){
  const el = $('#studies'), beside = ['models', 'cards', 'huds'].includes(S.coll) ? S.items.filter(i => i.kind === 'report' && i.beside === S.coll) : [];
  el.hidden = !beside.length;
  if (beside.length) el.innerHTML = `<h2>The study behind it <small>${beside.length} report${beside.length === 1 ? '' : 's'}</small></h2><div class="tiles" role="list">${beside.map(tileHTML).join('')}</div>`;
}
function renderGrid(){
  const grid = $('#grid');
  if (!S.loaded){ grid.innerHTML = ''; return; }
  const list = S.items.filter(i => inColl(i) && matches(i));
  const groups = new Map();
  for (const it of list){ const g = S.byDay ? dayLabel(it.date) : it.set; (groups.get(g) || groups.set(g, []).get(g)).push(it); }
  if (S.byDay) for (const g of groups.values()) g.sort((a, b) => a.set.localeCompare(b.set));
  S.visible = [...groups.values()].flat();
  renderStudies();
  if (!list.length){
    const shelf = S.coll.startsWith('shelf:'), filtered = S.q || Object.values(S.filters).some(s => s.size);
    const [h, p] = filtered ? ['Nothing fits that', 'Try fewer words, or let go of a filter.'] : shelf ? ['An empty shelf', 'Drag anything from the other collections onto this shelf.'] : WAITING[S.coll] || WAITING.models;
    grid.innerHTML = `<div class="waiting"><div class="plank"><span></span><span></span><span></span></div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`;
    return;
  }
  let i = 0;
  grid.innerHTML = [...groups].map(([g, items]) => `<section class="day"><h2>${esc(g)} <small>${items.length}</small><button class="pick-all" data-g="${esc(g)}">Pick all</button></h2><div class="tiles" role="list">${items.map(it => tileHTML(it, i++)).join('')}</div></section>`).join('');
}
function renderPicked(){
  const box = $('#picked'), n = S.picked.size;
  box.hidden = !n; document.body.classList.toggle('picking', n > 0);
  if (!n) return;
  const nb = $('#picked-n'); if (nb.textContent !== String(n)){ nb.textContent = n; nb.classList.remove('pop'); void nb.offsetWidth; nb.classList.add('pop'); }
  const items = [...S.picked].map(k => S.byKey.get(k)).filter(Boolean);
  $('#picked-strip').innerHTML = items.slice(-7).map(i => i.thumb ? `<img src="${esc(i.thumb)}" alt="">` : `<span class="tome-dot" style="--h:${hue(i.name)}"></span>`).join('');
  const onShelf = S.coll.startsWith('shelf:');
  $('#picked-actions').innerHTML = (onShelf ? `<button class="chip" data-act="unshelve">Take off this shelf</button>` : '') +
    S.shelves.filter(s => 'shelf:' + s.id !== S.coll).map(s => `<button class="chip" data-act="shelve" data-s="${esc(s.id)}">Onto ${esc(s.name)}</button>`).join('') +
    `<button class="chip" data-act="new-shelf">New shelf from these</button>`;
}
function render(){ renderRail(); renderFacets(); renderToggles(); renderGrid(); renderPicked(); syncURL(); }
function setTile(px){ S.tile = Math.max(84, Math.min(340, px)); document.documentElement.style.setProperty('--tile', S.tile + 'px'); store.set('tile', S.tile); }

/* ---------- URL: the collection, search and open item are shareable ---------- */
function syncURL(){
  const u = new URL(location.href), p = u.searchParams;
  S.coll === 'all' || S.coll.startsWith('shelf:') ? p.delete('c') : p.set('c', S.coll);
  S.q ? p.set('q', S.q) : p.delete('q');
  S.lens >= 0 && S.visible[S.lens] ? p.set('item', keyOf(S.visible[S.lens])) : p.delete('item');
  if (u.href !== location.href) history.replaceState(null, '', u);
}

/* ---------- picking ---------- */
function pick(k, mode = 'toggle'){
  const had = S.picked.has(k);
  if (mode === 'add' || (mode === 'toggle' && !had)) S.picked.add(k); else S.picked.delete(k);
  const el = document.querySelector(`.tile[data-k="${CSS.escape(k)}"]`);
  el?.classList.toggle('on', S.picked.has(k));
  if (S.picked.has(k) !== had){ S.picked.has(k) ? sound.pick(S.picked.size) : sound.unpick(); if (el){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }
  S.anchor = k; renderPicked();
}
function pickRun(k){
  const keys = S.visible.map(keyOf), a = keys.indexOf(S.anchor), b = keys.indexOf(k);
  if (a < 0 || b < 0) return pick(k);
  const [lo, hi] = a < b ? [a, b] : [b, a];
  keys.slice(lo, hi + 1).forEach((x, n) => { if (!S.picked.has(x)){ S.picked.add(x); document.querySelector(`.tile[data-k="${CSS.escape(x)}"]`)?.classList.add('on'); setTimeout(() => sound.pick(S.picked.size - (hi - lo) + n), n * 40); } });
  renderPicked();
}
function letGo(){ S.picked.clear(); document.querySelectorAll('.tile.on').forEach(t => t.classList.remove('on')); renderPicked(); sound.unpick(); }

/* ---------- shelves ---------- */
const saveShelves = () => store.set('shelves', S.shelves);
function shelve(id, keys){
  const s = S.shelves.find(x => x.id === id); if (!s) return;
  const before = s.keys.length; s.keys = [...new Set([...s.keys, ...keys])]; saveShelves(); renderRail(); renderPicked();
  const el = document.querySelector(`.shelf[data-s="${CSS.escape(id)}"]`), n = el?.querySelector('.n');
  if (n){ n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
  el?.animate([{transform: 'scale(1)'}, {transform: 'scale(1.08)'}, {transform: 'scale(.97)'}, {transform: 'scale(1)'}], {duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)'});
  sound.drop(); toast(s.keys.length > before ? `${s.keys.length - before} onto ${s.name}` : `Already on ${s.name}`);
}
function newShelf(keys = []){
  const id = Date.now().toString(36), s = {id, name: 'Shelf ' + (S.shelves.length + 1), keys: [...keys]};
  S.shelves.push(s); saveShelves(); renderRail(); renderPicked(); sound.switch();
  renameShelf(id);
}
function renameShelf(id){
  const el = document.querySelector(`.shelf[data-s="${CSS.escape(id)}"] .label`), s = S.shelves.find(x => x.id === id);
  if (!el || !s) return;
  el.innerHTML = `<input value="${esc(s.name)}" aria-label="Shelf name" maxlength="40">`;
  const input = el.querySelector('input'); input.focus(); input.select();
  let closed = false;
  const done = keep => { if (closed) return; closed = true; if (keep && input.value.trim()) s.name = input.value.trim(); saveShelves(); renderRail(); renderPicked(); };
  input.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); });
  input.addEventListener('blur', () => done(true), {once: true});
}
let toastTimer;
function toast(text){
  document.querySelector('.toast-on')?.remove(); clearTimeout(toastTimer);
  const t = document.createElement('div'); t.className = 'toast-on'; t.textContent = text; document.body.append(t);
  toastTimer = setTimeout(() => t.animate([{opacity: 1}, {opacity: 0, transform: 'translateX(-50%) translateY(10px)'}], {duration: 250}).onfinish = () => t.remove(), 1400);
}

/* ---------- drag tiles onto shelves ---------- */
let drag = null;
const ghost = $('#ghost-drag');
function startDrag(e, tile){
  const k = tile.dataset.k, keys = S.picked.has(k) ? [...S.picked] : [k];
  const items = keys.map(x => S.byKey.get(x)).filter(Boolean);
  ghost.innerHTML = items.slice(0, 3).map(i => i.thumb ? `<img src="${esc(i.thumb)}" alt="">` : `<span class="tome-dot" style="--h:${hue(i.name)}"></span>`).join('') + (keys.length > 1 ? `<b>${keys.length}</b>` : '');
  ghost.hidden = false;
  const r = tile.getBoundingClientRect();
  drag = {keys, origin: {x: r.left + r.width / 2, y: r.top + r.height / 2}, over: null, tiles: keys.map(x => document.querySelector(`.tile[data-k="${CSS.escape(x)}"]`)).filter(Boolean)};
  drag.tiles.forEach(t => t.classList.add('lifted'));
  if (!S.shelves.length) $('#shelves').innerHTML = '<p class="shelf-empty">Drop here to start a shelf.</p>';
  moveDrag(e); sound.pick(1);
}
function moveDrag(e){
  ghost.style.transform = `translate(${e.clientX - 42}px,${e.clientY - 42}px) rotate(${Math.max(-10, Math.min(10, (e.movementX || 0) * 0.8))}deg)`;
  const hit = document.elementFromPoint(e.clientX, e.clientY), shelf = hit?.closest('.shelf'), rail = hit?.closest('.shelves, .rail-head');
  const over = shelf ? shelf.dataset.s : rail ? '+' : null;
  if (over !== drag.over){ document.querySelectorAll('.shelf.drop').forEach(x => x.classList.remove('drop')); shelf?.classList.add('drop'); if (over) sound.hover(); drag.over = over; }
}
let dragEnded = 0;
function endDrag(){
  const d = drag; drag = null; dragEnded = performance.now();
  document.querySelectorAll('.shelf.drop').forEach(x => x.classList.remove('drop'));
  d.tiles.forEach(t => t.classList.remove('lifted'));
  if (d.over && d.over !== '+'){ ghost.hidden = true; shelve(d.over, d.keys); }
  else if (d.over === '+'){ ghost.hidden = true; newShelf(d.keys); }
  else {
    // Let go somewhere else: the stack springs home.
    sound.boop();
    ghost.animate([{transform: ghost.style.transform}, {transform: `translate(${d.origin.x - 42}px,${d.origin.y - 42}px) scale(.7)`, opacity: 0}], {duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)'}).onfinish = () => { ghost.hidden = true; renderRail(); };
  }
}

/* ---------- the viewer ---------- */
let stage = null;
function lensThumb(it){ return it.thumb ? `<img src="${esc(it.thumb)}" alt="" loading="lazy">` : `<span class="tome-dot" style="--h:${hue(it.name)}"></span>`; }
function openLens(index, from){
  if (index < 0 || index >= S.visible.length) return;
  const was = S.lens; S.lens = index;
  const lens = $('#lens'), it = S.visible[index], dir = was < 0 ? 0 : Math.sign(index - was);
  if (lens.hidden){ lens.hidden = false; sound.open(); document.body.style.overflow = 'hidden'; } else sound.step(dir);
  stage?.dispose(); stage = null;
  const st = $('#lens-stage');
  st.innerHTML = stageHTML(it);
  const hero = st.firstElementChild;
  hero.classList.add(dir > 0 ? 'from-right' : dir < 0 ? 'from-left' : 'enter');
  if (!dir && from){
    // The picture grows out of the tile it came from.
    const a = from.getBoundingClientRect(), b = hero.getBoundingClientRect();
    if (b.width){ hero.classList.remove('enter'); hero.animate([{transform: `translate(${a.left + a.width / 2 - (b.left + b.width / 2)}px,${a.top + a.height / 2 - (b.top + b.height / 2)}px) scale(${a.width / b.width})`, opacity: 0.4}, {transform: 'none', opacity: 1}], {duration: 520, easing: 'cubic-bezier(.34,1.3,.64,1)'}); }
  }
  const v = st.querySelector('.view3d');
  if (v) stage = mountStage(v, {src: it.raw.urls.glb, orbit: it.raw.orbit || [30, 70]});
  if (it.kind === 'report') mountReader(st, it);
  $('#lens-info').innerHTML = infoHTML(it); $('#lens-info').style.animation = 'none'; void $('#lens-info').offsetWidth; $('#lens-info').style.animation = '';
  const strip = $('#lens-strip');
  if (!strip.dataset.built || strip.children.length !== S.visible.length){ strip.innerHTML = S.visible.map((x, n) => `<button data-n="${n}" aria-label="${esc(x.name)}">${lensThumb(x)}</button>`).join(''); strip.dataset.built = '1'; }
  strip.querySelectorAll('button').forEach((b, n) => b.classList.toggle('on', n === index));
  strip.children[index]?.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: was < 0 ? 'auto' : 'smooth'});
  document.querySelectorAll('.lens-step').forEach(b => { b.style.opacity = (b.dataset.step < 0 ? index > 0 : index < S.visible.length - 1) ? 1 : 0.25; });
  syncURL();
}
function closeLens(){
  if ($('#lens').hidden) return;
  const it = S.visible[S.lens]; stage?.dispose(); stage = null; S.lens = -1;
  $('#lens').hidden = true; $('#lens-stage').innerHTML = ''; $('#lens-strip').dataset.built = '';
  sound.close(); syncURL();
  const t = it && document.querySelector(`.tile[data-k="${CSS.escape(keyOf(it))}"]`);
  if (t){ t.scrollIntoView({block: 'nearest'}); t.focus({preventScroll: true}); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); }
}
function stageHTML(it){
  if (it.kind === 'model'){
    const glb = it.raw.urls?.glb;
    const right = glb ? `<figure class="view3d"><canvas aria-label="3D model, drag to turn, pinch or scroll to zoom"></canvas><div class="spinner"><i></i></div><figcaption>3D model</figcaption><p class="hint">Drag to turn · scroll to zoom</p><div class="tools"><button class="spin">Spin</button><button class="home">Home</button></div></figure>`
      : `<figure><img src="${esc(it.alt || it.thumb)}" alt=""><figcaption>Render</figcaption></figure>`;
    return `<div class="pair"><figure><img src="${esc(it.thumb)}" alt="Inspiration image"><figcaption>Your image</figcaption></figure>${right}</div>`;
  }
  if (it.kind === 'report') return `<div class="reader">${it.raw.page && it.raw.text ? '<div class="tabs"><button data-r="page" aria-pressed="true">Page</button><button data-r="text" aria-pressed="false">Text</button></div>' : ''}<div class="reader-body"></div></div>`;
  return `<img class="hero" src="${esc(it.raw.image || it.thumb)}" alt="${esc(it.name)}">`;
}
function mountReader(st, it){
  const body = st.querySelector('.reader-body'), r = it.raw;
  const show = which => {
    st.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.r === which)));
    if (which === 'page'){ body.outerHTML = `<iframe class="reader-body" src="/api/library?report=${encodeURIComponent(r.page)}" title="${esc(it.name)}" sandbox="allow-scripts allow-popups"></iframe>`; }
    else {
      const div = document.createElement('div'); div.className = 'md reader-body'; div.innerHTML = '<p>Opening the report…</p>';
      st.querySelector('.reader-body').replaceWith(div);
      fetch('/api/library?report=' + encodeURIComponent(r.text)).then(x => x.ok ? x.text() : Promise.reject()).then(md => { div.innerHTML = markdown(md); })
        .catch(() => { div.innerHTML = `<p>The report did not load. <a href="${esc(r.source)}" target="_blank" rel="noopener">Read it on GitHub</a>.</p>`; });
    }
  };
  st.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { sound.switch(); show(b.dataset.r); }));
  show(r.page ? 'page' : 'text');
}
function infoHTML(it){
  const r = it.raw, k = keyOf(it), kindName = {model: 'Model', card: 'Card', hud: 'HUD', report: 'Report'}[it.kind];
  let body = '';
  if (typeof it.score === 'number') body += `<div class="meter"><div class="row"><span>${esc(STATUS[it.status] || 'Match')}</span><b class="${esc(it.status)}">${pct(it.score)}</b></div><div class="bar"><i style="width:${pct(it.score)}"></i></div>${(r.scores || []).slice(1).map(s => `<div class="row"><span title="${esc(s.help || '')}">${esc(s.label)}</span><span>${pct(s.value)}</span></div>`).join('')}</div>`;
  const list = (title, xs) => xs?.length ? `<div class="notes"><h4>${title}</h4><ul>${xs.slice(0, 5).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  body += list('What matches', r.good) + list('What is off', r.off);
  const facts = [...(r.details || [])];
  if (it.kind === 'model' && r.bytes) facts.push(['File', (r.bytes / 1e6).toFixed(1) + ' MB']);
  if (it.date) facts.push(['Made', it.date]);
  if (facts.length) body += `<dl class="facts">${facts.slice(0, 8).map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`;
  const acts = [];
  if (it.kind === 'model') acts.push(`<a class="act hot" href="/models/${encodeURIComponent(it.id)}">Full page</a>`);
  if (it.kind === 'report' && r.source) acts.push(`<a class="act" href="${esc(r.source)}" target="_blank" rel="noopener">On GitHub</a>`);
  if (r.url) acts.push(`<a class="act hot" href="${esc(r.url)}">Open</a>`);
  acts.push(`<button class="act" data-lens="pick">${S.picked.has(k) ? 'Picked ✓' : 'Pick'}</button>`, `<button class="act" data-lens="link">Copy link</button>`);
  return `<div class="eyebrow">${kindName} · ${esc(it.set)}</div><h1>${esc(it.name)}</h1>${it.sub ? `<p>${esc(it.sub)}</p>` : ''}${body}<div class="acts">${acts.join('')}</div>`;
}

/* ---------- a small Markdown reader for the reports ---------- */
function inline(s){
  return s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1');
}
function markdown(src){
  const lines = esc(src).split('\n'), out = []; let i = 0;
  while (i < lines.length){
    const l = lines[i];
    if (/^```/.test(l)){ const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre><code>${buf.join('\n')}</code></pre>`); continue; }
    const h = l.match(/^(#{1,4})\s+(.*)/); if (h){ out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*([-*_])\1{2,}\s*$/.test(l)){ out.push('<hr>'); i++; continue; }
    if (/^\|/.test(l)){ const rows = []; while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()));
      const body = rows.filter(r => !/^\|[\s:|-]+\|$/.test(r));
      out.push(`<table>${body.map((r, n) => `<tr>${cells(r).map(c => n ? `<td>${c}</td>` : `<th>${c}</th>`).join('')}</tr>`).join('')}</table>`); continue; }
    if (/^&gt;\s?/.test(l)){ const buf = []; while (i < lines.length && /^&gt;\s?/.test(lines[i])) buf.push(lines[i++].replace(/^&gt;\s?/, '')); out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)){ const ordered = /^\s*\d+\./.test(l), buf = []; while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) buf.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, '')); out.push(`<${ordered ? 'ol' : 'ul'}>${buf.map(x => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue; }
    if (!l.trim()){ i++; continue; }
    const buf = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||&gt;|\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

/* ---------- input ---------- */
function setColl(c){
  if (S.coll === c) return; S.coll = c; S.filters.status.clear(); S.filters.kind.clear(); S.filters.set.clear(); sound.switch();
  $('#field').scrollTop = 0; render(); if (innerWidth < 760) document.body.classList.remove('rail-open');
}
$('#collections').addEventListener('click', e => { const b = e.target.closest('.coll'); if (b) setColl(b.dataset.c); });
$('#shelves').addEventListener('click', e => { const b = e.target.closest('.shelf'); if (b && !e.target.closest('input')) setColl('shelf:' + b.dataset.s); });
$('#shelves').addEventListener('dblclick', e => { const b = e.target.closest('.shelf'); if (b) renameShelf(b.dataset.s); });
$('#new-shelf').addEventListener('click', () => newShelf(S.picked.size ? [...S.picked] : []));
$('#facets').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; const f = S.filters[b.dataset.f]; f.has(b.dataset.v) ? f.delete(b.dataset.v) : f.add(b.dataset.v); sound.pick(f.size + 2); renderFacets(); renderGrid(); });
$('#view-toggles').addEventListener('click', e => {
  const b = e.target.closest('.switch'); if (!b) return; const k = b.dataset.t;
  if (k === 'sound') sound.on = !sound.on; else { S[k] = !S[k]; store.set(k, S[k]); }
  sound.switch(); renderToggles(); if (k === 'byDay') renderGrid();
});
$('#picked-actions').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const keys = [...S.picked];
  if (b.dataset.act === 'shelve') shelve(b.dataset.s, keys);
  if (b.dataset.act === 'new-shelf') newShelf(keys);
  if (b.dataset.act === 'unshelve'){ const s = S.shelves.find(x => 'shelf:' + x.id === S.coll); s.keys = s.keys.filter(k => !S.picked.has(k)); saveShelves(); S.picked.clear(); sound.boop(); render(); }
});
$('#picked-clear').addEventListener('click', letGo);
document.querySelectorAll('.density button').forEach(b => b.addEventListener('click', () => { setTile(S.tile * (b.dataset.d > 0 ? 1.25 : 0.8)); sound.step(+b.dataset.d); }));
$('#drawer-toggle').addEventListener('click', () => { const folded = document.body.classList.toggle('drawer-folded'); $('#drawer-toggle').setAttribute('aria-expanded', String(!folded)); store.set('drawer', !folded); sound.switch(); });
$('#fold').addEventListener('click', () => { document.body.classList.add('rail-folded'); document.body.classList.remove('rail-open'); store.set('rail', false); sound.switch(); });
$('#unfold').addEventListener('click', () => { if (innerWidth < 760) document.body.classList.toggle('rail-open'); else { document.body.classList.remove('rail-folded'); store.set('rail', true); } sound.switch(); });
let qTimer;
$('#q').addEventListener('input', e => { clearTimeout(qTimer); qTimer = setTimeout(() => { S.q = e.target.value.trim(); renderGrid(); syncURL(); }, 90); });

// Tiles: click opens, the tick or a modifier picks, a press-and-move lifts them toward a shelf.
let press = null;
$('#field').addEventListener('pointerdown', e => {
  const t = e.target.closest('.tile'); if (!t || e.button !== 0 || e.target.closest('.tick')) return;
  press = {t, x: e.clientX, y: e.clientY, id: e.pointerId};
});
addEventListener('pointermove', e => {
  if (drag) return moveDrag(e);
  if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8 && e.pointerType !== 'touch'){ startDrag(e, press.t); press = null; }
});
addEventListener('pointerup', () => { if (drag) endDrag(); });
$('#field').addEventListener('click', e => {
  const all = e.target.closest('.pick-all');
  if (all){ const sec = all.closest('.day'); [...sec.querySelectorAll('.tile')].forEach((t, n) => setTimeout(() => pick(t.dataset.k, 'add'), n * 30)); return; }
  const t = e.target.closest('.tile'); press = null;
  if (!t || performance.now() - dragEnded < 250) return; // a drag just ended on this tile
  const k = t.dataset.k;
  if (e.target.closest('.tick') || e.metaKey || e.ctrlKey) return pick(k);
  if (e.shiftKey) return pickRun(k);
  const n = S.visible.findIndex(i => keyOf(i) === k);
  if (n >= 0) openLens(n, t); else { const it = S.byKey.get(k); if (it){ S.visible = [it, ...S.visible.filter(x => x !== it)]; openLens(0, t); } }
});
$('#field').addEventListener('pointerover', e => { const t = e.target.closest('.tile'); if (t && !t.contains(e.relatedTarget)) sound.hover(); });
$('#field').addEventListener('keydown', e => {
  const t = e.target.closest('.tile'); if (!t) return;
  if (e.key === 'Enter') t.click();
  if (e.key === ' '){ e.preventDefault(); pick(t.dataset.k); }
});

$('#lens-strip').addEventListener('click', e => { const b = e.target.closest('button'); if (b) openLens(+b.dataset.n); });
$('#lens-close').addEventListener('click', closeLens);
$('#lens-veil').addEventListener('click', closeLens);
document.querySelectorAll('.lens-step').forEach(b => b.addEventListener('click', () => openLens(S.lens + +b.dataset.step)));
$('#lens-info').addEventListener('click', e => {
  const b = e.target.closest('[data-lens]'); if (!b) return; const it = S.visible[S.lens];
  if (b.dataset.lens === 'pick'){ pick(keyOf(it)); b.textContent = S.picked.has(keyOf(it)) ? 'Picked ✓' : 'Pick'; }
  if (b.dataset.lens === 'link'){ navigator.clipboard?.writeText(location.href).then(() => { b.textContent = 'Copied ✓'; sound.pick(4); }, () => {}); }
});
let swipe = null;
$('#lens-stage').addEventListener('pointerdown', e => { if (!e.target.closest('canvas, iframe, .md')) swipe = {x: e.clientX}; });
$('#lens-stage').addEventListener('pointerup', e => { if (swipe && Math.abs(e.clientX - swipe.x) > 60) openLens(S.lens + (e.clientX < swipe.x ? 1 : -1)); swipe = null; });

addEventListener('keydown', e => {
  const typing = e.target.matches('input, textarea');
  if (!$('#lens').hidden){
    if (e.key === 'Escape') closeLens();
    else if (['ArrowRight', 'ArrowDown', 'j'].includes(e.key)){ e.preventDefault(); openLens(S.lens + 1); }
    else if (['ArrowLeft', 'ArrowUp', 'k'].includes(e.key)){ e.preventDefault(); openLens(S.lens - 1); }
    else if (e.key === ' ' && !typing){ e.preventDefault(); $('#lens-info [data-lens="pick"]')?.click(); }
    return;
  }
  if (e.key === 'Escape'){ if (typing){ e.target.blur(); return; } if (S.picked.size) letGo(); return; }
  if (typing) return;
  if (e.key === '/'){ e.preventDefault(); $('#q').focus(); $('#q').select(); }
  else if (/^[1-5]$/.test(e.key) && !e.metaKey && !e.ctrlKey) setColl(COLLECTIONS[+e.key - 1].id);
  else if (e.key === '+' || e.key === '='){ setTile(S.tile * 1.25); sound.step(1); }
  else if (e.key === '-' || e.key === '_'){ setTile(S.tile * 0.8); sound.step(-1); }
  else if ((e.metaKey || e.ctrlKey) && e.key === 'a'){ e.preventDefault(); S.visible.forEach((it, n) => setTimeout(() => pick(keyOf(it), 'add'), Math.min(n, 30) * 18)); }
});
// Ctrl/Cmd + wheel over the grid resizes tiles, like pinching a photo wall.
$('#field').addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); setTile(S.tile * (e.deltaY < 0 ? 1.06 : 0.94)); }, {passive: false});

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
if (COLLECTIONS.some(c => c.id === params.get('c'))) S.coll = params.get('c');
if (params.get('q')){ S.q = params.get('q'); $('#q').value = S.q; }
if (store.get('rail', true) === false && innerWidth >= 760) document.body.classList.add('rail-folded');
if (store.get('drawer', innerWidth >= 1100) === false || innerWidth < 1100){ document.body.classList.add('drawer-folded'); $('#drawer-toggle').setAttribute('aria-expanded', 'false'); }
// From the explore host, the way back goes to the game's own address.
if (/^explore\./.test(location.hostname)){ const home = 'https://' + location.hostname.replace(/^explore\./, 'www.') + '/sandbox'; $('#door').href = home; $('#back').href = home; }
setTile(S.tile);
render();
load().then(() => {
  render();
  const want = params.get('item'), n = want ? S.visible.findIndex(i => keyOf(i) === want) : -1;
  if (n >= 0) openLens(n);
}).catch(() => { $('#grid').innerHTML = '<div class="waiting"><h3>The library did not open</h3><p>Reload to try again.</p></div>'; });
window.RanchView?.register?.('explore', () => ({collection: S.coll, search: S.q, visible: S.visible.length, picked: [...S.picked], open: S.lens >= 0 ? keyOf(S.visible[S.lens]) : null}));
