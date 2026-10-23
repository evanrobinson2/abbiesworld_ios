// The ranch chronograph (Evan, 2026-10-23; docs/oracle/hud/CHRONO_STUDY.md). One liquid-glass instrument, top left:
// a 24-hour bezel dial with a sky window (tap: time of day), the time and day, two pushers (pause, speed), and a row of
// registers. Weather and season are the default registers; any scene item from the information manifest
// (presentation-layer.mjs) can be pinned as another, in a dial form that suits it. The world can suggest a register
// (pin it or wave it off; it never pops up over play), and the player's own to-dos get one too.
import {volunteer, readManifest, onManifestChange} from './presentation-layer.mjs';

const FORMS = {count: ['count', 'gauge', 'phase'], level: ['gauge', 'phase', 'count'], list: ['list', 'count'], timer: ['timer', 'phase'], state: ['state'], event: ['count'], place: ['state']};
const FORM_NAMES = {count: 'Number', gauge: 'Gauge', phase: 'Moon', list: 'List', timer: 'Timer', state: 'Sign'};
const MAX_PINS = 3, PIN_KEY = 'chrono-pins', WAVE_KEY = 'chrono-waved', TODO_KEY = 'ranch-todos';
const store = {get(k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }};
// The speed pusher reads as a stopwatch (the old half-gauge looked cut off).
const STOPWATCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="13.5" r="7.5"/><path d="M10 3h4M12 3v3M18.5 6.5l1.5-1.5M12 13.5l3-3"/></svg>';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

export function mountChrono({press, icons}) {
 const $ = s => document.querySelector(s);
 const el = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };

 // The case.
 const chrono = el('div', 'v2-toy v2-glass', `
  <button class="ch-dial" type="button" aria-label="Time of day">
   <svg viewBox="0 0 64 64" aria-hidden="true">
    <defs><clipPath id="ch-window"><circle cx="32" cy="32" r="19"/></clipPath>
     <linearGradient id="ch-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc0f0"/><stop offset="1" stop-color="#d9f0ff"/></linearGradient></defs>
    <g class="ch-bezel" fill="none" stroke-width="6"></g>
    <g clip-path="url(#ch-window)"><rect x="10" y="10" width="44" height="44" fill="url(#ch-sky)"/>
     <circle class="ch-body" cx="32" cy="30" r="6" fill="#ffd34d" stroke="#fff6c8" stroke-width="1.5"/>
     <path d="M10 40 Q21 34 32 38 T54 36 V54 H10z" fill="#8cbc5a"/><path d="M10 45 Q26 40 54 44 V54 H10z" fill="#6d9c45"/></g>
    <circle cx="32" cy="32" r="19" fill="none" stroke="#ffffffb0" stroke-width="1"/>
    <circle class="ch-orb" r="3.6" cx="32" cy="3.5" fill="#ffd34d" stroke="#fff" stroke-width="1.4"/>
   </svg><span class="ch-nap" aria-hidden="true"><i></i><i></i></span></button>
  <button class="ch-read" type="button" aria-label="Time of day"><strong class="ch-time">–</strong><small class="ch-date"></small></button>
  <div class="ch-registers" role="group" aria-label="The world"></div>
  <div class="ch-tiles v2-glass" role="group" aria-label="This place"></div>
  <div class="ch-pushers"><button class="ch-push ch-pause" type="button" aria-label="Pause"></button><button class="ch-push ch-speed" type="button" aria-label="Speed"></button></div>`);
 chrono.id = 'v2-chrono';
 const pop = el('div', 'v2-toy v2-glass'); pop.id = 'v2-chrono-pop'; pop.hidden = true;
 document.body.append(chrono, pop);
 // Two tiers (Evan, 2026-10-23: "high level -> world, second level -> tile based"): the case carries the world
 // (time, weather, season); a slimmer band under it carries this place's dials, to-dos and warnings.
 const regs = chrono.querySelector('.ch-registers'), tileRegs = chrono.querySelector('.ch-tiles');
 // On a phone the case folds to the dial and the time (8% budget); tapping the dial unfolds the pushers and dials
 // for a while. On a wide screen the dial sets the time of day.
 const narrow = matchMedia('(max-width:520px)');
 let foldTimer = 0;
 const unfold = () => { chrono.classList.add('open'); clearTimeout(foldTimer); foldTimer = setTimeout(() => { if (pop.hidden) chrono.classList.remove('open'); }, 8000); };
 chrono.addEventListener('pointerdown', () => { if (chrono.classList.contains('open')) unfold(); });
 chrono.querySelector('.ch-dial').onclick = () => { closePop(); if (narrow.matches && !chrono.classList.contains('open')) unfold(); else press('#scene-clock-control'); };
 chrono.querySelector('.ch-read').onclick = () => { closePop(); press('#scene-clock-control'); };
 chrono.querySelector('.ch-pause').onclick = () => { closePop(); press('#pause'); sync(); };
 chrono.querySelector('.ch-speed').onclick = () => { closePop(); press('#simulation-speed'); };

 // 24-hour bezel: night, dawn, day, dusk (Don't Starve's wedges on a GMT ring). Midnight at the bottom, noon at the top.
 const angle = h => (h / 24) * Math.PI * 2 + Math.PI / 2, at = (h, r) => [32 + r * Math.cos(angle(h)), 32 + r * Math.sin(angle(h))];
 const arc = (a, b, colour) => { const [x1, y1] = at(a, 27), [x2, y2] = at(b, 27), large = ((b - a + 24) % 24) > 12 ? 1 : 0; return `<path d="M${x1.toFixed(2)} ${y1.toFixed(2)} A27 27 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="${colour}"/>`; };
 chrono.querySelector('.ch-bezel').innerHTML = arc(20, 5, '#26355f') + arc(5, 8, '#f3a05f') + arc(8, 17, '#8fd0f5') + arc(17, 20, '#e07a5a');
 const skies = {night: ['#0d1838', '#2b3d6b'], dawn: ['#f7a35c', '#ffe0b0'], day: ['#7cc0f0', '#d9f0ff'], dusk: ['#d9735a', '#ffc58a']};
 const hourNow = () => { const m = /(\d+):(\d+)\s*(AM|PM)/i.exec($('#scene-readouts .clock-time')?.textContent || ''); return m ? (+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0) + +m[2] / 60 : null; };

 // The ranch volunteers what its residents know, so the chronograph (and the voice controller) can offer it.
 const num = (re, s) => { const m = re.exec(s || ''); return m ? +m[1] : null; };
 const care = () => $('#care-readout')?.textContent || '', peaks = {};
 const level = (key, value) => { if (value == null) return null; peaks[key] = Math.max(peaks[key] || 0, value); return {value, max: peaks[key] || 1}; };
 const arriving = () => [...document.querySelectorAll('#activity-list > *')].filter(r => /arriving/i.test(r.textContent)).map(r => r.firstChild?.textContent || r.textContent);
 // Scene id 'ranch-care' sits beside ranch-info.mjs's 'ranch' manifest (time, weather, season, animals, ledger) without replacing it.
 volunteer('ranch-care', {place: 'ranch', dialect: 'wood, bells, painted signs', items: [
  {id: 'arrivals', says: 'friends arriving', kind: 'list', who: 'characters', for: ['player', 'director'], read: arriving, relevant: () => arriving().length > 0,
   prefer: ['diegetic', 'overlay'], ways: {diegetic: 'guests walk up the lane and wave', overlay: 'a dial counting who is on the way'}, glyph: icons.guests},
  {id: 'hungry', says: 'hungry animals', kind: 'count', who: 'characters', for: ['player', 'director'], read: () => num(/(\d+) hungry/, care()), relevant: () => num(/(\d+) hungry/, care()) > 0,
   prefer: ['diegetic', 'overlay'], ways: {diegetic: 'animals crowd the trough and call', overlay: 'a dial with the number waiting'}, glyph: icons.hungry},
  {id: 'feed', says: 'feed in the barn', kind: 'level', who: 'characters', for: ['player', 'director'], read: () => level('feed', num(/(\d+) kg feed/, care())),
   prefer: ['diegetic', 'overlay'], ways: {diegetic: 'hay bales stacked by the barn', overlay: 'a gauge that empties'}, glyph: icons.feed},
  {id: 'water', says: 'water in the tanks', kind: 'level', who: 'characters', for: ['player', 'director'], read: () => level('water', num(/(\d+) L water/, care())),
   prefer: ['diegetic', 'overlay'], ways: {diegetic: 'the trough and tank levels', overlay: 'a gauge that empties'}, glyph: icons.water},
  {id: 'people', says: 'people and animals', kind: 'count', who: 'characters', for: ['player', 'director'], read: () => num(/(\d+) population/, $('#stats')?.textContent),
   prefer: ['diegetic', 'overlay'], ways: {diegetic: 'residents walking the paths', overlay: 'a count dial'}, glyph: icons.people},
  {id: 'todos', says: 'my to-dos', kind: 'list', who: 'player', for: ['player', 'grown-up', 'director'], read: () => todos.list().filter(t => !t.done),
   prefer: ['overlay'], ways: {overlay: 'a dial with how many are left; opens into the list'}, glyph: icons.todo}]});

 // The player's to-dos for their world. The voice controller can add them: window.RanchTodos.add(text, {place}).
 const todos = {
  list: () => store.get(TODO_KEY, []),
  save(list) { store.set(TODO_KEY, list); render(); },
  add(text, {place} = {}) { text = String(text || '').trim(); if (!text) return null; const t = {id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), text, place: place || $('#label')?.textContent || '', done: false, at: Date.now()}; todos.save([...todos.list(), t]); return t; },
  done(id, done = true) { todos.save(todos.list().map(t => t.id === id ? {...t, done} : t)); },
  remove(id) { todos.save(todos.list().filter(t => t.id !== id)); }};
 window.RanchTodos = todos;

 // Pins: what the player chose to wear on the instrument. To-dos are pinned until waved off.
 let pins = store.get(PIN_KEY, null) ?? [{scene: 'ranch-care', id: 'todos', form: 'list'}];
 const waved = new Set(store.get(WAVE_KEY, []));
 const savePins = () => { store.set(PIN_KEY, pins); render(); };
 const items = () => readManifest(null, {audience: 'player'}).flatMap(m => m.items.map(i => ({...i, scene: m.sceneId, place: m.place})));
 const find = (scene, id, all = items()) => all.find(i => i.scene === scene && i.id === id);
 const formsFor = item => FORMS[item.kind] || ['count'];

 // A register draws a value in one of six dial forms, 30 px across.
 function face(item, form) {
  let v = item.value, n = Array.isArray(v) ? v.length : typeof v === 'object' && v ? v.value ?? v.count : v, max = typeof v === 'object' && v && !Array.isArray(v) ? v.max : null;
  const f = max ? Math.max(0, Math.min(1, n / max)) : null, glyph = item.glyph || '';
  const label = n == null ? '·' : n > 999 ? Math.round(n / 1000) + 'k' : String(Math.round(n));
  if (form === 'gauge' || form === 'timer') { const c = 2 * Math.PI * 12, frac = f ?? 0; return `<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="none" stroke="#0000001a" stroke-width="3"/><circle cx="15" cy="15" r="12" fill="none" stroke="var(--v2-accent)" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 15 15)"/></svg><span class="ch-g">${glyph}</span>`; }
  if (form === 'phase') { const frac = f ?? (n ? 1 : 0), x = 15 - 24 * frac + 12; return `<svg viewBox="0 0 30 30"><defs><clipPath id="ph-${item.id}"><circle cx="15" cy="15" r="11"/></clipPath></defs><circle cx="15" cy="15" r="11" fill="#26355f"/><circle clip-path="url(#ph-${item.id})" cx="${x.toFixed(1)}" cy="15" r="11" fill="#f4f1e3"/></svg>`; }
  if (form === 'list') return `<span class="ch-n">${label}</span><span class="ch-g ch-g-small">${glyph}</span>`;
  if (form === 'state') return `<span class="ch-g">${glyph || (typeof v === 'string' ? esc(v.slice(0, 2)) : '·')}</span>`;
  return `<span class="ch-n">${label}</span><span class="ch-g ch-g-small">${glyph}</span>`;
 }
 const register = (cls, title, html) => { const b = el('button', 'ch-reg v2-glass ' + cls, html); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); return b; };

 let lastKey = '';
 function render() {
  const all = items();
  // Default registers: weather and season, read from the v1 readouts.
  const weather = $('#scene-readouts .weather-symbol')?.innerHTML || '', weatherName = $('#scene-readouts .weather-name')?.textContent || 'Weather', season = $('#scene-readouts .weather-season')?.textContent || 'Season';
  const pinned = pins.map(p => ({p, item: find(p.scene, p.id, all)})).filter(x => x.item);
  const offer = all.find(i => i.relevant?.() && !pins.some(p => p.scene === i.scene && p.id === i.id) && !waved.has(i.scene + ':' + i.id));
  const key = JSON.stringify([weather.length, weatherName, season, pinned.map(x => [x.p.id, x.p.form, x.item.value]), offer?.id, offer?.value]);
  if (key === lastKey) return; lastKey = key;
  const nodes = [];
  const w = register('ch-weather', weatherName, `<span class="ch-g">${weather}</span>`); w.onclick = () => { closePop(); press('#scene-weather-control'); }; nodes.push(w);
  const s = register('ch-season', season, `<span class="ch-g">${icons['season' + season] || icons.season}</span>`); s.onclick = () => { closePop(); press('#scene-season-control'); }; nodes.push(s);
  for (const {p, item} of pinned) { const r = register('ch-pin', item.says, face(item, p.form)); r.onclick = () => item.id === 'todos' ? openTodos(r) : openPin(r, p, item); nodes.push(r); }
  if (offer) { // The world suggests; the player decides. A quiet ghost register, never a pop-up.
   const g = register('ch-offer', 'Suggested dial: ' + offer.says + '. Tap to pin.', face(offer, formsFor(offer)[0]) + '<span class="ch-wave" role="button" aria-label="Wave off">×</span>');
   g.onclick = e => { if (e.target.closest('.ch-wave')) { waved.add(offer.scene + ':' + offer.id); store.set(WAVE_KEY, [...waved]); lastKey = ''; render(); return; } pin(offer, formsFor(offer)[0]); };
   nodes.push(g); }
  const add = register('ch-add', 'Pin a dial', icons.plus); add.onclick = () => openShelf(add); nodes.push(add);
  regs.replaceChildren(...nodes.slice(0, 2)); tileRegs.replaceChildren(...nodes.slice(2));
 }
 function pin(item, form) { pins = [...pins.filter(p => !(p.scene === item.scene && p.id === item.id)), {scene: item.scene, id: item.id, form}].slice(-MAX_PINS); closePop(); savePins(); }

 // Popovers under the case: the dial shelf, a pinned dial's detail, and the to-do list.
 function openPopAt(anchor, html) { pop.innerHTML = html; pop.hidden = false; const r = anchor.getBoundingClientRect(); pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left - 8)) + 'px'; return pop; }
 function closePop() { pop.hidden = true; }
 const formChips = (item, current) => formsFor(item).map(f => `<button type="button" class="ch-chip" data-form="${f}" aria-pressed="${f === current}">${FORM_NAMES[f]}</button>`).join('');
 function openShelf(anchor) {
  const all = items().filter(i => !pins.some(p => p.scene === i.scene && p.id === i.id));
  openPopAt(anchor, `<strong class="ch-title">Pin a dial</strong>` + (all.length ? all.map((i, k) => `<div class="ch-row" data-k="${k}"><span class="ch-reg v2-glass ch-preview">${face(i, formsFor(i)[0])}</span><span class="ch-says">${esc(i.says)}<small>${esc(i.place || i.scene)}</small></span><span class="ch-chips">${formChips(i)}</span></div>`).join('') : '<p class="ch-note">Everything this place offers is already on the dial.</p>'));
  pop.querySelectorAll('.ch-row').forEach(row => row.querySelectorAll('.ch-chip').forEach(c => c.onclick = () => pin(all[+row.dataset.k], c.dataset.form)));
 }
 function openPin(anchor, p, item) {
  const v = item.value, shown = Array.isArray(v) ? (v.length ? v.join(', ') : 'none') : typeof v === 'object' && v ? `${Math.round(v.value)} of ${Math.round(v.max)}` : v ?? '—';
  openPopAt(anchor, `<strong class="ch-title">${esc(item.says)}</strong><p class="ch-note">${esc(shown)}</p><p class="ch-note ch-way">In the world: ${esc(item.ways?.diegetic || 'shown on the dial')}</p><span class="ch-chips">${formChips(item, p.form)}</span><button type="button" class="ch-chip ch-unpin">Take off the dial</button>`);
  pop.querySelectorAll('[data-form]').forEach(c => c.onclick = () => pin(item, c.dataset.form));
  pop.querySelector('.ch-unpin').onclick = () => { pins = pins.filter(x => x !== p); closePop(); savePins(); };
 }
 function openTodos(anchor) {
  const draw = () => {
   const list = todos.list();
   openPopAt(anchor, `<strong class="ch-title">My to-dos</strong><ul class="ch-todos">${list.map(t => `<li data-id="${t.id}" class="${t.done ? 'done' : ''}"><button type="button" class="ch-tick" aria-label="${t.done ? 'Not done' : 'Done'}">${t.done ? '✓' : ''}</button><span>${esc(t.text)}${t.place ? `<small>${esc(t.place)}</small>` : ''}</span><button type="button" class="ch-x" aria-label="Remove">×</button></li>`).join('') || '<li class="ch-empty">Nothing yet. Say it to the Computer, or write one here.</li>'}</ul><form class="ch-new"><input type="text" placeholder="Add a to-do" aria-label="New to-do" maxlength="140"><button type="submit" class="ch-chip">Add</button></form><button type="button" class="ch-chip ch-unpin">Take off the dial</button>`);
   pop.querySelectorAll('li[data-id]').forEach(li => { li.querySelector('.ch-tick').onclick = () => { todos.done(li.dataset.id, !li.classList.contains('done')); draw(); }; li.querySelector('.ch-x').onclick = () => { todos.remove(li.dataset.id); draw(); }; });
   pop.querySelector('.ch-new').onsubmit = e => { e.preventDefault(); const input = pop.querySelector('.ch-new input'); if (todos.add(input.value)) draw(); pop.querySelector('.ch-new input')?.focus(); };
   pop.querySelector('.ch-unpin').onclick = () => { pins = pins.filter(x => x.id !== 'todos'); closePop(); savePins(); };
  };
  draw();
 }
 addEventListener('pointerdown', e => { if (!pop.hidden && !e.target.closest?.('#v2-chrono,#v2-chrono-pop')) closePop(); }, true);
 document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });

 function sync() {
  const h = hourNow();
  if (h != null) {
   const [x, y] = at(h, 27), orb = chrono.querySelector('.ch-orb'), day = h >= 6 && h < 18;
   orb.setAttribute('cx', x.toFixed(2)); orb.setAttribute('cy', y.toFixed(2)); orb.setAttribute('fill', day ? '#ffd34d' : '#f4f1e3');
   const rise = day ? Math.sin(Math.PI * (h - 6) / 12) : Math.sin(Math.PI * (((h + 6) % 24)) / 12), body = chrono.querySelector('.ch-body');
   body.setAttribute('cy', (44 - 20 * rise).toFixed(1)); body.setAttribute('fill', day ? '#ffd34d' : '#f4f1e3'); body.setAttribute('stroke', day ? '#fff6c8' : '#c9d3ea');
   const [top, bottom] = skies[h < 5 || h >= 20 ? 'night' : h < 8 ? 'dawn' : h < 17 ? 'day' : 'dusk'], stops = chrono.querySelectorAll('#ch-sky stop');
   stops[0].setAttribute('stop-color', top); stops[1].setAttribute('stop-color', bottom);
  }
  chrono.querySelector('.ch-time').textContent = $('#scene-readouts .clock-time')?.textContent || '';
  chrono.querySelector('.ch-date').textContent = $('#scene-readouts .clock-date')?.textContent || '';
  const paused = !!$('#pause .play-icon') && !$('#pause .play-icon').hidden;
  chrono.classList.toggle('paused', paused);
  const pauseButton = chrono.querySelector('.ch-pause'); if (pauseButton.dataset.state !== String(paused)) { pauseButton.dataset.state = String(paused); pauseButton.innerHTML = paused ? icons.play : icons.pause; pauseButton.setAttribute('aria-label', paused ? 'Play' : 'Pause'); }
  const pace = ($('#simulation-speed .pace-badge')?.textContent || '').trim(), speed = chrono.querySelector('.ch-speed'), text = !pace || pace === '›' ? '1×' : pace;
  if (speed.dataset.pace !== text) { speed.dataset.pace = text; speed.innerHTML = STOPWATCH + `<b>${esc(text)}</b>`; speed.setAttribute('aria-label', 'Speed ' + text); }
  render();
 }
 onManifestChange(() => { lastKey = ''; render(); });
 return {sync};
}
