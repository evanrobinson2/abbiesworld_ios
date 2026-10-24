// Scene Builder lab study: the clickable mock. State is {base, ops}; the world is always fold(base, ops).
'use strict';
const E = window.SceneEngine, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const cv = $('#cv'), g = cv.getContext('2d'), qs = new URLSearchParams(location.search);
const BASE_URL = 'https://ranch.abbies.world';
const store = {get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }};

// ---- state ---------------------------------------------------------------------------------------------------
const base = E.defaults();
for (const k of ['family', 'season', 'topo', 'style']) if (qs.get(k)) base.recipe[k] = qs.get(k);
if (qs.get('seed')) base.recipe.seed = +qs.get('seed');
if (qs.get('hour')) base.env.hour = +qs.get('hour');
if (qs.get('weather')) base.env.weather = qs.get('weather');
if (qs.get('gravity')) base.env.gravity = +qs.get('gravity');
if (qs.get('radius')) base.recipe.radius = +qs.get('radius');
let ops = [], redo = [], W = E.fold(base, ops), gid = 0;
const UI = {tool: 'place', brush: 'tree', tab: qs.get('tab') || 'recipe', bench: qs.get('bench') === '1' || store.get('awsb-bench') === '1', grid: true, play: false, running: base.recipe.style !== 'still', stepIn: false, sel: null, hover: null, size: 1, chat: [], userEdited: false, lastBuild: performance.now(), mode: 'lab'};
const live = {hour: base.env.hour, T: 0, simT: 0}, bornMap = new Map(), dustSeen = new Set(), parts = [], balls = [];
let critters = [], critKey = '', stats = {dropped: 0};
const envNow = () => W.env, rc = () => W.recipe;
const FAM = E.FAMILIES, famKinds = f => [...new Set([...FAM[f].heroes, ...FAM[f].scatter.map(s => s[0])])].filter(k => k !== 'dock' || true);
const TITLE = {ranch: 'Ranch', woodland: 'Woodland', coast: 'Coast', town: 'Town', moon: 'Moon base', wasteland: 'Wasteland'};
const toast = (m, ms = 1800) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms); };

// ---- ops -----------------------------------------------------------------------------------------------------
function commit(newOps, {coalesce = false, quiet = false} = {}) {
  const gg = ++gid; newOps = newOps.map(o => ({...o, g: gg, at: Date.now()}));
  if (coalesce) { const last = ops[ops.length - 1], n = newOps[0]; if (last && newOps.length === 1 && last.t === n.t && last.k === n.k && Date.now() - last.at < 900) { ops[ops.length - 1] = {...n, g: last.g, at: Date.now()}; rebuild(); return; } }
  ops.push(...newOps); redo = []; rebuild(); if (!quiet) UI.userEdited = ops.some(o => ['place', 'erase', 'height', 'flatten', 'lock', 'scale'].includes(o.t));
  $('#undo').classList.toggle('dim', !ops.length); $('#redo').classList.toggle('dim', !redo.length);
  save();
}
function undo() { if (!ops.length) return; const last = ops[ops.length - 1].g; const popped = []; while (ops.length && ops[ops.length - 1].g === last) popped.unshift(ops.pop()); redo.push(popped); rebuild(true); save(); }
function redoIt() { const b = redo.pop(); if (!b) return; ops.push(...b); rebuild(true); save(); }
function rebuild(silent = false) {
  const prev = new Set(W.props.keys()); W = E.fold(base, ops); const now = performance.now(); let fresh = [...W.props.values()].filter(p => !bornMap.has(p.id));
  fresh.sort((a, b) => E.hexDist(a.q, a.r) - E.hexDist(b.q, b.r)); const many = fresh.length > 3;
  fresh.forEach((p, i) => bornMap.set(p.id, silent ? -1e9 : now + (many ? i * 38 : 0)));
  if (many && !silent) UI.lastBuild = now;
  live.hour = W.env.realClock ? realHour() : (envHourChanged() ? W.env.hour : live.hour);
  UI.userEdited = ops.some(o => ['place', 'erase', 'height', 'flatten', 'lock', 'scale'].includes(o.t));
  const ck = W.recipe.family + W.recipe.seed + W.recipe.style + W.recipe.radius + W.recipe.topo; if (ck !== critKey) { critKey = ck; spawnCritters(); }
  if (UI.sel && ![...W.props.values()].some(p => p.id === UI.sel)) UI.sel = null;
  refreshTray(); updateStepper(); refreshPanelLive(); $('#undo').classList.toggle('dim', !ops.length); $('#redo').classList.toggle('dim', !redo.length);
}
let lastEnvHour = base.env.hour; const envHourChanged = () => { const c = lastEnvHour !== W.env.hour; lastEnvHour = W.env.hour; return c; };
const realHour = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const save = () => store.set('awsb-ops', JSON.stringify(ops.slice(-400)));

// ---- creatures: derived from the recipe, not ops ----------------------------------------------------------------
function spawnCritters() {
  const st = E.STYLES[rc().style], fam = FAM[rc().family], r = E.mulberry(rc().seed + 5), n = Math.round(fam.lifeN * Math.max(.6, st.life) * (envNow().life ?? 1)); critters = [];
  const cells = [...W.cells.values()].filter(c => !c.water && !W.props.has(E.key(c.q, c.r)));
  for (let i = 0; i < n && cells.length; i++) { const c = cells[Math.floor(r() * cells.length)]; critters.push({id: i, kind: fam.life[i % fam.life.length], q: c.q, r: c.r, from: [c.q, c.r], to: [c.q, c.r], t: 1, dir: 1, moving: false, wait: r() * 2}); }
}
function stepCritters(dt) {
  const st = E.STYLES[rc().style], sp = st.sim * envNow().timeScale; if (!sp || !UI.running) return;
  for (const c of critters) {
    if (c.kind === 'gull') { c.q += Math.cos(live.T * .4 + c.id) * dt * .5; c.r += Math.sin(live.T * .3 + c.id * 2) * dt * .35; if (!W.cells.has(E.key(Math.round(c.q), Math.round(c.r)))) { c.q *= .9; c.r *= .9; } c.moving = true; continue; }
    if (c.t < 1) { c.t = Math.min(1, c.t + dt * .7 * sp); c.q = c.from[0] + (c.to[0] - c.from[0]) * c.t; c.r = c.from[1] + (c.to[1] - c.from[1]) * c.t; c.moving = true; if (c.t >= 1) { c.moving = false; c.wait = .6 + Math.random() * 2.2; } continue; }
    c.wait -= dt * sp; if (c.wait > 0) continue;
    const cur = W.cells.get(E.key(Math.round(c.q), Math.round(c.r))); if (!cur) continue;
    const opts = E.DIRS.map(([a, b]) => W.cells.get(E.key(cur.q + a, cur.r + b))).filter(n => n && !n.water && Math.abs(n.h - cur.h) <= 1 && !W.props.has(E.key(n.q, n.r)));
    if (!opts.length) { c.wait = 1.5; continue; }
    const n = opts[Math.floor(Math.random() * opts.length)]; c.from = [cur.q, cur.r]; c.to = [n.q, n.r]; c.t = 0; c.dir = n.q + n.r / 2 >= cur.q + cur.r / 2 ? 1 : -1;
  }
}

// ---- drop test: gravity and topology made visible ----------------------------------------------------------------
function dropTest(n = 12) {
  const cells = [...W.cells.values()]; stats.dropped += n;
  for (let i = 0; i < n; i++) { const c = cells[Math.floor(Math.random() * cells.length)], [x, y] = rendererXY(c.q, c.r); balls.push({x: x + (Math.random() - .5) * .4, y: y + (Math.random() - .5) * .3, z: 300 + Math.random() * 160, vz: 0, vx: 0, vy: 0, fl: 0, c: ['#ff6b6b', '#ffd166', '#4ecdc4', '#a78bfa', '#ffffff'][i % 5], rest: 0, t: 0}); }
  toast(`${n} balls dropped at ${envNow().gravity.toFixed(2)} m/s²`);
}
const rendererXY = (q, r) => worldXY(q, r);
function stepBalls(dt) {
  const gpx = envNow().gravity * 60, bn = envNow().bounce;
  for (const b of balls) {
    b.t += dt; const [q, r] = axialOf(b.x, b.y), cell = W.cells.get(E.key(q, r)); const fl = cell ? (cell.water ? cell.wl - .4 : cell.h) * 13 : -999; b.fl = Math.max(fl, 0);
    b.vz -= gpx * dt; b.z += b.vz * dt;
    if (b.z <= fl) { b.z = fl; if (cell && cell.water) { b.vz *= -.1; b.vx *= .9; b.vy *= .9; if (b.t > 1.5 && Math.abs(b.vz) < 10) b.rest += dt * 2; } else if (Math.abs(b.vz) > 40) b.vz = -b.vz * bn; else b.vz = 0; }
    if (cell && !cell.water && b.z <= fl + .5 && b.vz === 0) {         // rolling: the land decides which way
      const low = E.neighbors(W, cell).filter(n => n.h < cell.h && !n.water || n.water && cell.h > n.wl).sort((a, c) => a.h - c.h)[0];
      if (low) { const [tx, ty] = rendererXY(low.q, low.r), [cx0, cy0] = rendererXY(cell.q, cell.r), dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, a = 1.6 * (envNow().gravity / 9.81); b.vx += dx / d * a * dt; b.vy += dy / d * a * dt; }
      b.vx *= Math.pow(.35, dt); b.vy *= Math.pow(.35, dt); if (!low) { b.rest += dt; }
    }
    b.x += b.vx * dt; b.y += b.vy * dt; if (!W.cells.get(E.key(...axialOf(b.x, b.y)))) b.rest = 99;
  }
  for (let i = balls.length - 1; i >= 0; i--) if (balls[i].rest > 3.5 || balls[i].t > 30) balls.splice(i, 1);
}

// ---- tools ---------------------------------------------------------------------------------------------------
const TOOLS = [
  ['select', 'Select', '<path d="M5 3l12 7-5 1.5L9.5 17z"/>'],
  ['place', 'Place', '<path d="M12 3l7 4v7l-7 4-7-4V7z"/><path d="M12 8v6M9 11h6"/>'],
  ['erase', 'Erase', '<path d="M4 15l8-9 7 6-5 6H8z"/><path d="M8 20h11"/>'],
  ['raise', 'Raise land', '<path d="M3 17l5-7 4 4 3-5 6 8z"/><path d="M12 3v4M10 5l2-2 2 2"/>'],
  ['lower', 'Lower land', '<path d="M3 13l5-5 4 3 3-3 6 5z"/><path d="M12 21v-4M10 19l2 2 2-2"/>'],
  ['smooth', 'Smooth land', '<path d="M3 15q4-6 9 0t9 0"/><path d="M3 10q4-6 9 0t9 0"/>'],
  ['eyedrop', 'Pick from the world', '<path d="M15 3l6 6-3 1-9 9H5v-4l9-9z"/>'],
  ['hand', 'Move the view', '<path d="M8 12V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v7c0 4-2 7-6 7s-5-2-7-5l-1-3a1.5 1.5 0 012.5-1L8 14"/>'],
];
const ICON = (p, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>', redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>', grid: '<path d="M12 3l7 4v10l-7 4-7-4V7z"/><path d="M12 12l7-5M12 12L5 7M12 12v9"/>', play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M8 4v16M16 4v16"/>', dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', rotl: '<path d="M4 12a8 8 0 108-8"/><path d="M4 4v5h5"/>', rotr: '<path d="M20 12a8 8 0 11-8-8"/><path d="M20 4v5h-5"/>', screen: '<rect x="3" y="5" width="18" height="12" rx="3"/><path d="M9 21h6"/>', flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M8 15h8"/>', trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>', pin: '<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v8"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l7-7"/>', mount: '<path d="M3 19l6-10 4 6 3-4 5 8z"/>', sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', cloud: '<path d="M7 18a4 4 0 010-8 5 5 0 019.5 1A3.5 3.5 0 0117 18z"/>', atom: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/>', scroll: '<path d="M6 4h11a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2zM6 4a2 2 0 00-2 2v1h2M9 9h6M9 13h6"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>', cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9"/>', layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'};

function buildToolbar() {
  const tb = $('#toolbar');
  tb.innerHTML = TOOLS.map(([id, name, p]) => `<button class="tbtn" data-tool="${id}" title="${name}" aria-label="${name}">${ICON(p)}</button>`).join('') + '<i class="sep"></i>' +
    `<button class="tbtn" id="undo" title="Undo (Z)" aria-label="Undo">${ICON(I.undo)}</button><button class="tbtn" id="redo" title="Redo (Shift+Z)" aria-label="Redo">${ICON(I.redo)}</button><i class="sep"></i>` +
    `<button class="tbtn" id="rotl" title="Turn the world (Q)" aria-label="Turn left">${ICON(I.rotl)}</button><button class="tbtn" id="rotr" title="Turn the world (E)" aria-label="Turn right">${ICON(I.rotr)}</button>` +
    `<button class="tbtn tog" id="gridb" title="Hex glow (G)" aria-label="Hex glow">${ICON(I.grid)}</button><i class="sep"></i>` +
    `<button class="tbtn tog" id="runb" title="Run the world (Space)" aria-label="Run">${ICON(I.pause)}</button><button class="tbtn" id="eyeb" title="Step in (F)" aria-label="Step in">${ICON(I.eye)}</button><button class="tbtn" id="playb" title="Hide the lab and just play (P)" aria-label="Play">${ICON(I.screen)}</button>`;
  tb.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.tool) setTool(b.dataset.tool); });
  $('#undo').onclick = undo; $('#redo').onclick = redoIt; $('#rotl').onclick = () => rotate(-1); $('#rotr').onclick = () => rotate(1);
  $('#gridb').onclick = () => { UI.grid = !UI.grid; syncToolbar(); }; $('#runb').onclick = () => { UI.running = !UI.running; syncToolbar(); };
  $('#eyeb').onclick = () => stepIn(); $('#playb').onclick = () => setPlay(true);
  syncToolbar();
}
function syncToolbar() {
  $$('#toolbar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === UI.tool));
  $('#gridb').classList.toggle('on', UI.grid); $('#runb').classList.toggle('on', UI.running); $('#runb').innerHTML = ICON(UI.running ? I.pause : I.play); $('#eyeb').classList.toggle('on', UI.stepIn);
  cv.dataset.tool = UI.tool; $('#tray').classList.toggle('muted', UI.tool !== 'place');
}
function setTool(t) { UI.tool = t; if (t !== 'select') { UI.sel = null; hideBubble(); } syncToolbar(); }
function rotate(d) { view.rot = (view.rot + d + 6) % 6; }
let stepTarget = null;
function stepIn() { UI.stepIn = !UI.stepIn; const c = UI.hover?.[0]; view.tz = UI.stepIn ? 2.3 : 1; view.tt = UI.stepIn ? .85 : TILT; if (UI.stepIn) { const [x, y] = hexToXY(c?.q ?? 0, c?.r ?? 0); view.fx = cx - x + view.px; view.fy = cy + 40 - y + view.py; } else { view.fx = 0; view.fy = 20; } toast(UI.stepIn ? 'Stand-in for first person: the real build puts you on the tile' : 'Back to the overview'); syncToolbar(); }
function setPlay(on) { UI.play = on; document.body.classList.toggle('play', on); }

// ---- tray (the hand of cards for the family) ------------------------------------------------------------------------
function refreshTray() {
  const f = rc().family, kinds = famKinds(f).filter(k => !new Set(rc().out).has(E.TYPE_OF[k])), tray = $('#tray');
  if (!kinds.includes(UI.brush)) UI.brush = kinds[0];
  const counts = {}; for (const p of W.props.values()) counts[p.kind] = (counts[p.kind] || 0) + 1;
  tray.innerHTML = kinds.map((k, i) => `<button class="card${k === UI.brush ? ' on' : ''}" data-k="${k}" title="${k}" style="--i:${i}"><canvas width="96" height="96" data-k="${k}"></canvas><b>${counts[k] || ''}</b><kbd>${i < 9 ? i + 1 : ''}</kbd></button>`).join('') + `<button class="card dice" id="dice" title="Re-decorate with a new first pass (R)"><span>${ICON(I.dice, 30)}</span></button>`;
  const ctx = {season: rc().season, lt: {night: 0, day: 1}, T: 0, wind: 0};
  $$('canvas', tray).forEach(c => { const gg = c.getContext('2d'); TINT = [1, 1, 1]; drawProp(gg, {kind: c.dataset.k, v: .3, q: 0, r: 0, s: 1}, 48, 70, 46, ctx); });
  tray.onclick = e => { if (e.target.closest('#dice')) return doReroll(); const b = e.target.closest('.card'); if (!b) return; UI.brush = b.dataset.k; setTool('place'); refreshTray(); };
}
function doReroll() { commit([{t: 'reroll', v: 1 + Math.floor(Math.random() * 99999)}]); toast('New first pass. Things you placed or pinned stay.'); }

// ---- stepper (default flow: choose, auto, then you) --------------------------------------------------------------------
function updateStepper() { const s = UI.userEdited ? 3 : (performance.now() - UI.lastBuild < 2600 ? 2 : (ops.some(o => o.t === 'recipe' || o.t === 'reroll') ? 2 : 1)); $$('#stepper li').forEach((li, i) => li.classList.toggle('on', i + 1 === s)); $$('#stepper li').forEach((li, i) => li.classList.toggle('done', i + 1 < s)); }

// ---- panel -----------------------------------------------------------------------------------------------------------
let models = null, thumbsBy = {};
fetch('models.json').then(r => r.json()).then(j => { models = j.items; for (const [id, f] of Object.entries(FAM)) { const its = models.filter(m => f.places.includes(m.place)); thumbsBy[id] = {n: its.length, items: its, hero: its.filter(m => m.thumb).slice(0, 3)}; } if (UI.tab === 'recipe' || UI.tab === 'assets') renderPanel(); }).catch(() => {});
const th = m => `<img loading="lazy" src="${BASE_URL}${m.thumb}" alt="" onerror="this.remove()">`;
const SEASON_COL = {spring: '#9bd86f', summer: '#4f9a3c', autumn: '#e0842b', winter: '#dfe9ee'};
const TOPO_PATH = {meadow: 'M2 20 Q16 16 30 19 T58 18', hills: 'M2 22 Q10 8 20 18 T38 14 T58 20', valley: 'M2 8 Q14 8 22 20 Q30 26 38 20 Q46 8 58 8', ridge: 'M2 24 L16 8 L24 18 L36 4 L46 16 L58 24', island: 'M2 24 L14 24 Q20 8 30 8 Q40 8 46 24 L58 24', crater: 'M2 20 L14 20 L20 8 L26 18 L34 18 L40 8 L46 20 L58 20'};
const HOUR = h => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`; };
const fmt = (v, d = 2) => (+v).toFixed(d).replace(/\.?0+$/, '');
const TABS = {recipe: ['Make a world', I.cube], assets: ['Assets', I.layers], chat: ['Ask', I.chat], land: ['Land', I.mount], sky: ['Sky & weather', I.cloud], physics: ['Physics & life', I.atom], scene: ['Scene record', I.scroll]};
const BENCH = ['land', 'sky', 'physics', 'scene'];
function renderRail() {
  const tabs = ['recipe', 'assets', 'chat'], bench = UI.bench ? BENCH : [];
  $('#rail').innerHTML = tabs.map(t => railBtn(t)).join('') + `<i class="rsep"></i>` + `<div class="bench${UI.bench ? ' open' : ''}">${bench.map(t => railBtn(t)).join('')}</div>` + `<button class="rbtn flask${UI.bench ? ' on' : ''}" id="benchb" title="Lab bench: land, sky, physics, record" aria-label="Lab bench">${ICON(I.flask, 24)}</button>`;
  $$('#rail .rbtn[data-t]').forEach(b => b.onclick = () => { UI.tab = b.dataset.t; renderRail(); renderPanel(); });
  $('#benchb').onclick = () => { UI.bench = !UI.bench; store.set('awsb-bench', UI.bench ? '1' : '0'); if (!UI.bench && BENCH.includes(UI.tab)) UI.tab = 'recipe'; renderRail(); renderPanel(); };
}
const railBtn = t => `<button class="rbtn${UI.tab === t ? ' on' : ''}" data-t="${t}" title="${TABS[t][0]}" aria-label="${TABS[t][0]}">${ICON(TABS[t][1], 24)}</button>`;
function setRecipe(k, v) { commit([{t: 'recipe', k, v}], {coalesce: ['relief', 'scale'].includes(k)}); }
function setEnv(k, v, co = true) { commit([{t: 'env', k, v}], {coalesce: co, quiet: true}); if (k === 'hour') live.hour = v; }
const slider = (id, label, min, max, step, val, unit = '', fmtf = v => fmt(v)) => `<label class="row"><span>${label}</span><output id="o-${id}">${fmtf(val)}${unit}</output><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
function bindSlider(id, fn, fmtf = v => fmt(v), unit = '') { const el = $('#' + id); if (!el) return; el.oninput = () => { const v = +el.value; $('#o-' + id).textContent = fmtf(v) + unit; fn(v); }; }
function renderPanel() {
  const t = UI.tab, body = $('#pbody'), r = rc(), env = envNow(); let h = `<h2>${TABS[t][0]}</h2>`;
  if (t === 'recipe') {
    h += `<p class="lede">Pick four things. The first pass decorates for you, then it is yours.</p><h3>Asset family</h3><div class="fams">` + Object.entries(FAM).map(([id, f]) => { const tb = thumbsBy[id]; return `<button class="fam${r.family === id ? ' on' : ''}" data-fam="${id}"><span class="thumbs">${tb ? tb.hero.map(th).join('') : ''}</span><b>${f.name}</b><small>${tb ? tb.n : '…'} models</small></button>`; }).join('') + `</div>` +
      `<h3>Season</h3><div class="seasons">` + E.SEASONS.map(s => `<button class="season${r.season === s ? ' on' : ''}" data-season="${s}" style="--c:${SEASON_COL[s]}"><i></i><b>${s}</b></button>`).join('') + `</div>` +
      `<h3>Land shape</h3><div class="topos">` + Object.entries(E.TOPOS).map(([id, n]) => `<button class="topo${r.topo === id ? ' on' : ''}" data-topo="${id}"><svg viewBox="0 0 60 30"><path d="${TOPO_PATH[id]}"/></svg><b>${n}</b></button>`).join('') + `</div>` +
      `<h3>How alive</h3><div class="styles">` + Object.entries(E.STYLES).map(([id, s]) => `<button class="style${r.style === id ? ' on' : ''}" data-style="${id}"><b>${s.name}</b><small>${s.note}</small></button>`).join('') + `</div>` +
      `<button class="go" id="go">${ICON(I.dice, 22)}<span>Build my world</span></button><p class="foot">Then paint, place and move things yourself. Your changes survive a new first pass. Land, sky and physics wait behind the flask.</p>`;
  } else if (t === 'assets') {
    const tb = thumbsBy[r.family], out = new Set(r.out), types = ['Plant', 'Building', 'Prop', 'Vehicle'];
    h += `<p class="lede">What the first pass may use. Out always wins.</p><h3>Kinds</h3><div class="chips">` + types.map(ty => `<button class="chip${out.has(ty) ? '' : ' on'}" data-type="${ty}">${ty === 'Prop' ? 'Props' : ty + 's'}</button>`).join('') + `</div><h3>${TITLE[r.family]} models in the library</h3><div class="mgrid">` + (tb ? tb.items.filter(m => m.thumb).slice(0, 36).map(m => `<span class="m" title="${m.name}">${th(m)}</span>`).join('') : '<p class="foot">Loading the library…</p>') + `</div><p class="foot">${tb ? tb.n : '…'} library models match this family. In the real build the first pass picks real models by role (house, tree, fence) from the allowed set; this mock draws stand-in shapes. Packs from the project chat plug in here.</p>`;
  } else if (t === 'chat') {
    h += `<div class="chat" id="chatlog">${UI.chat.length ? UI.chat.map(m => `<div class="msg ${m.who}">${m.text}</div>`).join('') : '<div class="msg bot">Tell me what to change. I move things, change the season or weather, and set gravity. I always say what I did.</div>'}</div><div class="chips sug">` + ['make it winter', 'add 3 trees', 'remove the rocks', 'moon gravity', 'steeper hills', 'a storm at night', 'undo'].map(s => `<button class="chip" data-say="${s}">${s}</button>`).join('') + `</div><form id="chatf"><input id="chati" placeholder="Make the hills steeper…" autocomplete="off"><button aria-label="Send">${ICON('<path d="M4 12l16-8-6 16-3-7z"/>', 20)}</button></form><p class="foot">Free helper, no AI cost. The real build sends the same verbs to the model (the AI Gateway today, ChatGPT if you want it), checks each one against the library, and shows an Undo.</p>`;
  } else if (t === 'land') {
    h += `<p class="lede">The generator's own numbers. All of them are in the record.</p>` + slider('relief', 'Relief', .25, 2, .05, r.relief) + slider('scale', 'Feature size', .6, 1.8, .05, r.scale) + slider('radius', 'World size', 3, 7, 1, r.radius, ' rings', v => v) +
      slider('water', 'Water level', -1, 5, 1, r.water ?? ({island: 1}[r.topo] ?? -1), '', v => v < 0 ? 'none' : v) +
      `<div class="row2"><label class="seed"><span>Seed</span><input id="seed" type="number" value="${r.seed}"></label><button class="btn" id="seedr">${ICON(I.dice, 18)} New land</button></div>` +
      `<h3>Brush</h3><div class="chips">` + [1, 2, 3].map(n => `<button class="chip${UI.size === n ? ' on' : ''}" data-size="${n}">${['Small', 'Medium', 'Large'][n - 1]}</button>`).join('') + `</div><p class="foot">Raise, lower and smooth are on the toolbar. Hand edits sit on top of the generated land, so a new seed keeps them where the land allows.</p>`;
  } else if (t === 'sky') {
    h += `<p class="lede">One signal drives light, colour, creatures and sound together.</p>` + slider('hour', 'Time of day', 0, 23.9, .1, live.hour, '', HOUR) +
      `<label class="tgl"><input type="checkbox" id="real" ${env.realClock ? 'checked' : ''}><span>Today and now (real clock)</span></label><h3>Weather</h3><div class="chips">` + ['auto', 'clear', 'cloudy', 'rain', 'snow', 'storm', 'fog'].map(w => `<button class="chip${env.weather === w ? ' on' : ''}" data-wx="${w}">${w === 'auto' ? 'Follow the season' : w}</button>`).join('') + `</div>` + slider('wind', 'Wind', 0, 1, .05, env.wind) +
      `<h3>Season</h3><div class="seasons small">` + E.SEASONS.map(s => `<button class="season${r.season === s ? ' on' : ''}" data-season="${s}" style="--c:${SEASON_COL[s]}"><i></i><b>${s}</b></button>`).join('') + `</div><p class="foot">Real build: <code>world-clock.mjs</code>, <code>ranch-sky.mjs</code>, <code>ranch-weather.mjs</code> and the seasons state already do this; the lab only edits their inputs.</p>`;
  } else if (t === 'physics') {
    h += `<p class="lede">Grown-up controls. Nothing here shows in the world.</p><h3>Gravity</h3><div class="chips">` + [['Earth', 9.81], ['Mars', 3.71], ['Moon', 1.62], ['Jupiter', 24.8]].map(([n, v]) => `<button class="chip${Math.abs(env.gravity - v) < .01 ? ' on' : ''}" data-g="${v}">${n}</button>`).join('') + `</div>` + slider('gravity', 'Gravity', .5, 30, .01, env.gravity, ' m/s²') + slider('timeScale', 'Time scale', 0, 4, .1, env.timeScale, '×') + slider('bounce', 'Bounciness', 0, .9, .05, env.bounce) + slider('life', 'Creatures', 0, 3, .25, env.life ?? 1, '×') +
      `<div class="row2"><button class="btn big" id="drop">${ICON(I.dice, 18)} Drop test</button><button class="btn" id="dropm">Just 3</button></div><p class="foot">Props land under this gravity; the balls bounce and then roll downhill, so the land shape decides where they end up. Real build: <code>planet-gravity.mjs</code> and <code>tile-physics/</code> (Rapier, already in the tile test) with a wake-up budget so a big world stays smooth.</p>`;
  } else if (t === 'scene') {
    h += `<p class="lede">Your world is a recipe plus your edits, not a picture. Anything here can be replayed.</p><div class="ops">` + (ops.length ? groupOps().map(gp => `<div class="op"><i>${gp.n > 1 ? '×' + gp.n : ''}</i><span>${gp.label}</span></div>`).join('') : '<div class="op"><span>Nothing yet. Choose, then build.</span></div>') + `</div>` +
      `<div class="row2"><button class="btn" id="exp">Copy scene file</button><button class="btn" id="rep">Rebuild from record</button></div><div id="repres" class="foot"></div><p class="foot">Format <code>aw-scene</code> v1: base recipe, seed, ordered edits, and a checksum. When rendering improves, old scenes rebuild on the new engine.</p>`;
  }
  body.innerHTML = h; bindPanel(); if (t === 'recipe') standIns();
  if (t === 'chat') { const l = $('#chatlog'); l.scrollTop = l.scrollHeight; }
}
function standIns() { // when library thumbnails are unreachable, each family card still shows two of its own stand-ins
  $$('.fam').forEach(el => { const f = el.dataset.fam, c = document.createElement('canvas'); c.width = 200; c.height = 80; const x = c.getContext('2d'); TINT = [1, 1, 1]; const ks = [FAM[f].heroes[0], FAM[f].scatter[0][0], FAM[f].scatter[1][0]]; ks.forEach((k, i) => drawProp(x, {kind: k, v: .3, q: 0, r: 0, s: 1}, 34 + i * 66, 66, 36, {season: 'summer', lt: {night: 0}, T: 0, wind: 0})); el.querySelector('.thumbs').style.cssText = `background:url(${c.toDataURL()}) center/contain no-repeat,rgba(255,255,255,.18);border-radius:9px`; });
}
function groupOps() { const out = []; for (const o of ops) { const last = out[out.length - 1]; if (last && last.g === o.g) last.n++; else out.push({g: o.g, n: 1, label: E.opLabel(o)}); } return out.slice(-60).reverse(); }
function refreshPanelLive() { if (UI.tab === 'scene') renderPanel(); else if (UI.tab === 'recipe' || UI.tab === 'assets') { /* choices keep their own state */ } }
function bindPanel() {
  const b = $('#pbody'), q = (s, f) => $$(s, b).forEach(f);
  q('[data-fam]', e => e.onclick = () => { setRecipe('family', e.dataset.fam); if (e.dataset.fam === 'moon' && envNow().gravity > 5 && !ops.some(o => o.k === 'gravity')) setEnv('gravity', 1.62, false); renderPanel(); });
  q('[data-season]', e => e.onclick = () => { setRecipe('season', e.dataset.season); renderPanel(); });
  q('[data-topo]', e => e.onclick = () => { setRecipe('topo', e.dataset.topo); renderPanel(); });
  q('[data-style]', e => e.onclick = () => { setRecipe('style', e.dataset.style); UI.running = E.STYLES[e.dataset.style].sim > 0; syncToolbar(); renderPanel(); });
  $('#go') && ($('#go').onclick = doReroll);
  q('[data-type]', e => e.onclick = () => { const o = new Set(rc().out); o.has(e.dataset.type) ? o.delete(e.dataset.type) : o.add(e.dataset.type); setRecipe('out', [...o]); renderPanel(); });
  q('[data-size]', e => e.onclick = () => { UI.size = +e.dataset.size; renderPanel(); });
  q('[data-wx]', e => e.onclick = () => { setEnv('weather', e.dataset.wx, false); renderPanel(); });
  q('[data-g]', e => e.onclick = () => { setEnv('gravity', +e.dataset.g, false); renderPanel(); });
  bindSlider('relief', v => setRecipe('relief', v)); bindSlider('scale', v => setRecipe('scale', v)); bindSlider('radius', v => setRecipe('radius', v), v => v, ' rings'); bindSlider('water', v => setRecipe('water', v), v => v < 0 ? 'none' : v);
  bindSlider('hour', v => setEnv('hour', v), HOUR); bindSlider('wind', v => setEnv('wind', v)); bindSlider('gravity', v => { setEnv('gravity', v); }, v => fmt(v), ' m/s²'); bindSlider('timeScale', v => setEnv('timeScale', v), v => fmt(v), '×'); bindSlider('bounce', v => setEnv('bounce', v)); bindSlider('life', v => { setEnv('life', v); critKey = ''; }, v => fmt(v), '×');
  $('#seed') && ($('#seed').onchange = e => commit([{t: 'reroll', v: +e.target.value || 1}])); $('#seedr') && ($('#seedr').onclick = () => { commit([{t: 'reroll', v: 1 + Math.floor(Math.random() * 99999)}]); renderPanel(); });
  $('#real') && ($('#real').onchange = e => { setEnv('realClock', e.target.checked, false); if (e.target.checked) { const m = new Date().getMonth(); setRecipe('season', ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][m]); } renderPanel(); });
  $('#drop') && ($('#drop').onclick = () => dropTest(14)); $('#dropm') && ($('#dropm').onclick = () => dropTest(3));
  $('#exp') && ($('#exp').onclick = () => { const f = sceneFile(); navigator.clipboard?.writeText(JSON.stringify(f, null, 1)).then(() => toast('Scene file copied'), () => toast('Copy blocked in this browser')); });
  $('#rep') && ($('#rep').onclick = () => { const a = E.worldHash(W), W2 = E.fold(base, JSON.parse(JSON.stringify(ops))), b2 = E.worldHash(W2); $('#repres').innerHTML = a === b2 ? `Rebuilt from the record: identical <code>${b2}</code> ✓ (${W2.props.size} things, ${ops.length} edits)` : `Mismatch ${a} vs ${b2}`; });
  const cf = $('#chatf'); if (cf) { cf.onsubmit = e => { e.preventDefault(); const i = $('#chati'); if (i.value.trim()) say(i.value.trim()); i.value = ''; }; q('[data-say]', e => e.onclick = () => say(e.dataset.say)); }
}
const sceneFile = () => ({format: 'aw-scene', version: 1, study: 'AW-STUDY-0062', base, ops: ops.map(({t, k, v, q, r, kind, d, f}) => ({t, k, v, q, r, kind, d, f})), checksum: E.worldHash(W)});

// ---- the chat helper: plain verbs, no AI (the AI path uses the same verbs) -----------------------------------------------
const KIND_WORDS = {tree: ['tree', 'pine', 'palm', 'deadtree'], trees: ['tree'], rock: ['rock'], bush: ['bush'], house: ['house'], barn: ['barn'], fence: ['fence'], lamp: ['lamp'], crate: ['crate'], tent: ['tent'], boat: ['boat'], dome: ['dome'], barrel: ['barrel'], bench: ['bench'], log: ['log'], hay: ['hay'], umbrella: ['umbrella'], mushroom: ['mushroom'], shop: ['shop'], solar: ['solar']};
function say(text) {
  UI.chat.push({who: 'me', text: text.replace(/</g, '&lt;')}); const reply = helper(text.toLowerCase()); UI.chat.push({who: 'bot', text: reply}); if (UI.tab === 'chat') renderPanel();
}
function pickKind(word) { const w = word.replace(/s$/, ''); const cand = KIND_WORDS[w]; if (!cand) return null; const have = famKinds(rc().family); return cand.find(k => have.includes(k)) || (cand.length && 'none:' + w); }
function freeCells(kind) { return [...W.cells.values()].filter(c => !W.props.has(E.key(c.q, c.r)) && (kind === 'boat' ? c.water : !c.water) && (['house', 'barn', 'tent', 'dome', 'shop'].includes(kind) ? E.slopeOf(W, c) === 0 : E.slopeOf(W, c) <= 2)); }
function helper(t) {
  if (/\bundo\b/.test(t)) { if (!ops.length) return 'Nothing to undo.'; undo(); return 'Undone.'; }
  const done = [], seas = E.SEASONS.find(s => t.includes(s)); if (seas) { setRecipe('season', seas); done.push(`season is ${seas}`); }
  const gv = /moon/.test(t) && /gravity|float|jump/.test(t) ? 1.62 : /mars/.test(t) && /gravity/.test(t) ? 3.71 : /(earth|normal) gravity/.test(t) ? 9.81 : /jupiter/.test(t) ? 24.8 : /heavy/.test(t) ? 20 : /(low|light|floaty) gravity/.test(t) ? 3 : null; if (gv) { setEnv('gravity', gv, false); done.push(`gravity is ${gv} m/s²`); }
  const wx = ['storm', 'rain', 'snow', 'fog', 'cloud', 'clear', 'sunny'].find(w => t.includes(w)); if (wx && !/winter/.test(t.replace(/snow/, ''))) { const w = wx === 'cloud' ? 'cloudy' : wx === 'sunny' ? 'clear' : wx; setEnv('weather', w, false); done.push(`weather is ${w}`); }
  const hr = [['midnight', 0], ['night', 23], ['dawn', 6], ['sunrise', 6], ['morning', 8], ['noon', 12], ['afternoon', 15], ['sunset', 18.5], ['evening', 19.5]].find(([w]) => t.includes(w)); if (hr) { setEnv('hour', hr[1], false); done.push(`time is ${HOUR(hr[1])}`); }
  const tp = Object.entries({island: 'island', valley: 'valley', crater: 'crater', mountain: 'ridge', ridge: 'ridge', hill: 'hills', meadow: 'meadow', flat: 'meadow'}).find(([w]) => t.includes(w)); if (tp && !/steeper|flatter/.test(t)) { setRecipe('topo', tp[1]); done.push(`land is ${E.TOPOS[tp[1]].toLowerCase()}`); }
  const fm = Object.entries({ranch: 'ranch', farm: 'ranch', wood: 'woodland', forest: 'woodland', coast: 'coast', beach: 'coast', town: 'town', city: 'town', 'moon base': 'moon', space: 'moon', waste: 'wasteland'}).find(([w]) => t.includes(w)); if (fm && !/gravity/.test(t)) { setRecipe('family', fm[1]); done.push(`family is ${TITLE[fm[1]]}`); }
  if (/steeper|taller|higher|more dramatic/.test(t)) { setRecipe('relief', Math.min(2, +(rc().relief * 1.3).toFixed(2))); done.push('hills are steeper'); } if (/flatter|gentler|calmer land/.test(t)) { setRecipe('relief', Math.max(.25, +(rc().relief * .75).toFixed(2))); done.push('land is flatter'); }
  if (/bigger world|larger world|expand/.test(t)) { setRecipe('radius', Math.min(7, rc().radius + 1)); done.push('world is a ring bigger'); }
  if (/surprise|again|re-?roll|new first pass|redo it/.test(t)) { commit([{t: 'reroll', v: 1 + Math.floor(Math.random() * 99999)}]); done.push('new first pass'); }
  if (/animals|creatures|friends|more life/.test(t)) { const v = Math.min(3, (envNow().life ?? 1) + .75); setEnv('life', v, false); critKey = ''; done.push('more creatures'); }
  const add = t.match(/\b(?:add|put|place|more|plant)\s+(\d+)?\s*([a-z]+)/); if (add && !['animals', 'creatures', 'friends', 'life'].includes(add[2])) {
    const n = Math.min(+add[1] || 3, 30), k = pickKind(add[2]); if (!k) done.push(`I don't know "${add[2]}" yet`); else if (String(k).startsWith('none:')) done.push(`no ${add[2]} in the ${TITLE[rc().family]} family`); else { const cells = freeCells(k).sort(() => Math.random() - .5).slice(0, n); if (cells.length) { commit(cells.map(c => ({t: 'place', q: c.q, r: c.r, kind: k}))); done.push(`added ${cells.length} ${k}${cells.length > 1 ? 's' : ''}`); } else done.push(`no room for ${k}`); } }
  const rm = t.match(/\b(?:remove|delete|clear|get rid of)\s+(?:the |all |all the )?([a-z]+)/); if (rm) { const word = rm[1].replace(/s$/, ''), ks = KIND_WORDS[word] || [word]; const hit = [...W.props.values()].filter(p => ks.includes(p.kind)); if (hit.length) { commit(hit.slice(0, 60).map(p => ({t: 'erase', q: p.q, r: p.r}))); done.push(`removed ${Math.min(60, hit.length)} ${word}${hit.length > 1 ? 's' : ''}`); } else done.push(`I can't find any ${rm[1]}`); }
  if (!done.length) return 'I can add or remove things, change the season, time, weather or gravity, reshape the land, or start a new first pass. Try “make it winter” or “add 3 trees”.';
  renderRail(); return 'Done: ' + done.join('; ') + '. <button class="lnk" data-undo>Undo</button>';
}
document.addEventListener('click', e => { if (e.target.matches('[data-undo]')) { undo(); } });

// ---- pointer -------------------------------------------------------------------------------------------------------------
function cellAt(mx, my) {
  let best = null, bd = 1e9; const z = SZ();
  for (const c of W.cells.values()) { const [x, y] = topXY(c), dx = mx - x, dy = (my - y) / view.tilt, d = Math.hypot(dx, dy); if (d < z * .98) { const ord = rotAx(c.q, c.r, view.rot); const key2 = -ord[1] * 1000 - ord[0]; if (key2 < bd) { bd = key2; best = c; } } }
  return best;
}
const area = (c, n) => !c ? [] : n <= 1 ? [c] : [...W.cells.values()].filter(x => E.hexDist(x.q - c.q, x.r - c.r) <= n - 1);
let drag = null, panning = null, painted = null;
function applyTool(c, first) {
  if (!c) return; const k = E.key(c.q, c.r), t = UI.tool;
  if (t === 'place') { const ex = W.props.get(k); if (ex && ex.kind === UI.brush && !first) return; if (c.water && UI.brush !== 'boat') { if (first) toast('That is water'); return; } add1({t: 'place', q: c.q, r: c.r, kind: UI.brush}); }
  else if (t === 'erase') { if (W.props.has(k)) add1({t: 'erase', q: c.q, r: c.r}); }
  else if (t === 'raise' || t === 'lower') area(c, UI.size).forEach(x => add1({t: 'height', q: x.q, r: x.r, d: t === 'raise' ? 1 : -1}, x));
  else if (t === 'smooth') area(c, UI.size).forEach(x => add1({t: 'flatten', q: x.q, r: x.r}, x));
  else if (t === 'select') { const p = W.props.get(k); UI.sel = p ? p.id : null; p ? showBubble(p) : hideBubble(); }
  else if (t === 'eyedrop') { const p = W.props.get(k); if (p) { UI.brush = p.kind; setTool('place'); refreshTray(); toast(`Picked ${p.kind}`); } }
}
let pending = null;
function add1(op, key2) { if (!pending) return; const kk = op.t + op.q + ',' + op.r; if (pending.seen.has(kk)) return; pending.seen.add(kk); pending.ops.push(op); }
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); const rect = cv.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (UI.tool === 'hand' || e.button === 1 || e.shiftKey && UI.tool === 'select') { panning = {x: e.clientX, y: e.clientY, px: view.px, py: view.py}; return; }
  const c = cellAt(mx, my); drag = true; pending = {ops: [], seen: new Set()}; applyTool(c, true); flushPending(true);
});
cv.addEventListener('pointermove', e => {
  const rect = cv.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (panning) { view.px = panning.px + e.clientX - panning.x; view.py = panning.py + e.clientY - panning.y; return; }
  const c = cellAt(mx, my); UI.hover = c ? area(c, ['raise', 'lower', 'smooth'].includes(UI.tool) ? UI.size : 1) : null; UI.mouse = [mx, my];
  if (drag && ['place', 'erase', 'raise', 'lower', 'smooth'].includes(UI.tool) && c && (!painted || painted !== c)) { painted = c; if (UI.tool !== 'raise' && UI.tool !== 'lower' && UI.tool !== 'smooth') { applyTool(c, false); } }
});
cv.addEventListener('pointerup', () => { if (panning) { panning = null; return; } flushPending(false); drag = null; painted = null; });
cv.addEventListener('pointerleave', () => { UI.hover = null; });
function flushPending(first) { if (!pending) return; if (first && !['place', 'erase', 'raise', 'lower', 'smooth'].includes(UI.tool)) { pending = null; return; } if (!first) { if (pending.ops.length) commit(pending.ops); pending = null; } else if (UI.tool === 'place' || UI.tool === 'erase') { /* first cell committed on release together with drag cells */ } }
cv.addEventListener('wheel', e => { e.preventDefault(); view.tz = clamp(((view.tz ?? view.zoom) * (e.deltaY < 0 ? 1.1 : .91)), .5, 3); }, {passive: false});
cv.addEventListener('dblclick', () => { view.tz = 1; view.px = 0; view.py = 20; });
addEventListener('keydown', e => {
  if (e.target.matches('input,textarea')) return; const k = e.key.toLowerCase();
  if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redoIt() : undo(); } else if (k === 'z') e.shiftKey ? redoIt() : undo();
  else if (k === 'q') rotate(-1); else if (k === 'e') rotate(1); else if (k === 'g') { UI.grid = !UI.grid; syncToolbar(); } else if (k === ' ') { e.preventDefault(); UI.running = !UI.running; syncToolbar(); } else if (k === 'p') setPlay(!UI.play); else if (k === 'f') stepIn(); else if (k === 'r') doReroll();
  else if (k === 'b') { UI.bench = !UI.bench; renderRail(); } else if (k === 'escape') { if (UI.play) setPlay(false); else { UI.sel = null; hideBubble(); setTool('select'); } }
  else if (k === 'delete' || k === 'backspace') { const p = [...W.props.values()].find(p => p.id === UI.sel); if (p) { commit([{t: 'erase', q: p.q, r: p.r}]); hideBubble(); } }
  else if (/^[1-9]$/.test(k)) { const ks = $$('#tray .card[data-k]'); if (ks[+k - 1]) { UI.brush = ks[+k - 1].dataset.k; setTool('place'); refreshTray(); } }
  else { const m = {v: 'select', x: 'erase', h: 'hand'}[k]; if (m) setTool(m); }
});
// selection bubble (presentation layer, drawn for the player)
function showBubble(p) { const bu = $('#bubble'); bu.classList.add('on'); bu.innerHTML = `<button data-a="minus" title="Smaller">${ICON(I.minus, 18)}</button><button data-a="plus" title="Bigger">${ICON(I.plus, 18)}</button><button data-a="pin" title="${p.own ? 'Let new first passes replace it' : 'Pin: keep through a new first pass'}" class="${p.own ? 'on' : ''}">${ICON(I.pin, 18)}</button><button data-a="del" title="Remove">${ICON(I.trash, 18)}</button>`; bu.onclick = e => { const b = e.target.closest('button'); if (!b) return; const pr = [...W.props.values()].find(x => x.id === UI.sel); if (!pr) return; const a = b.dataset.a; if (a === 'del') { commit([{t: 'erase', q: pr.q, r: pr.r}]); hideBubble(); } else if (a === 'pin') { commit([{t: 'lock', q: pr.q, r: pr.r}]); const np = W.props.get(E.key(pr.q, pr.r)); UI.sel = np?.id; np && showBubble(np); } else commit([{t: 'scale', q: pr.q, r: pr.r, f: a === 'plus' ? 1.2 : .83}]); }; }
function hideBubble() { $('#bubble').classList.remove('on'); }

// ---- frame ------------------------------------------------------------------------------------------------------------------
let W0 = 0, H0 = 0, DPR = 1, last = performance.now();
function resize() { DPR = Math.min(2, devicePixelRatio || 1); W0 = innerWidth; view.fit = innerWidth < 760 ? Math.max(.42, innerWidth / 700) : 1; H0 = innerHeight; cv.width = W0 * DPR; cv.height = H0 * DPR; cv.style.width = W0 + 'px'; cv.style.height = H0 + 'px'; }
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; live.T += dt;
  if (!document.body.classList.contains('study')) {
    const st = E.STYLES[rc().style], env = envNow(); if (UI.running && !env.realClock) { live.hour = (live.hour + dt * st.sim * env.timeScale * .15) % 24; live.simT += dt * st.sim * env.timeScale; } if (env.realClock) live.hour = realHour();
    if (Math.floor(live.hour * 4) !== frame.hq && UI.tab === 'sky') { frame.hq = Math.floor(live.hour * 4); const s = $('#hour'); if (s && document.activeElement !== s) { s.value = live.hour; $('#o-hour').textContent = HOUR(live.hour); } }
    const weather = env.weather === 'auto' ? E.autoWeather(W, live.simT) : env.weather, lt = lighting({hour: live.hour}, weather, rc().family);
    view.zoom += ((view.tz ?? view.zoom) - view.zoom) * Math.min(1, dt * 7); view.tilt += ((view.tt ?? TILT) - view.tilt) * Math.min(1, dt * 6); view.px += ((view.fx ?? view.px) - view.px) * (view.fx !== undefined && UI.stepIn ? Math.min(1, dt * 6) : 0); if (!UI.stepIn && view.fx !== undefined) { view.px += (0 - view.px) * Math.min(1, dt * 6); view.py += (20 - view.py) * Math.min(1, dt * 6); if (Math.abs(view.px) < .5) view.fx = undefined; } if (UI.stepIn) view.py += ((view.fy ?? 20) - view.py) * Math.min(1, dt * 6);
    cx = W0 / 2 - (UI.play || W0 < 760 ? 0 : 150); cy = W0 < 760 && !UI.play ? H0 * .36 : H0 * .5; TINT = lt.tint; stepCritters(dt); stepBalls(dt); stepParticles(parts, dt, W0, H0, weather, env, rc().season, rc().family, lt);
    g.setTransform(DPR, 0, 0, DPR, 0, 0); drawSky(g, W0, H0, {hour: live.hour, wind: env.wind}, weather, lt, rc().season, rc().family, live.T);
    drawBoard(g, W, {season: rc().season, lt, weather, T: live.T, hover: UI.hover, sel: UI.sel, grid: UI.grid && !UI.play, tool: UI.tool, born: bornMap, now, gravity: env.gravity, bounce: env.bounce, dust: dustSeen, parts, critters, balls, wind: env.wind});
    if (UI.hover && !UI.play && !UI.stepIn) { for (const c of UI.hover) { const [x, y] = topXY(c); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.2; g.shadowColor = 'rgba(160,220,255,.9)'; g.shadowBlur = 12; hexPath(g, x, y, SZ() * .96, view.tilt); g.stroke(); g.shadowBlur = 0; } if (UI.tool === 'place' && UI.hover[0] && !UI.hover[0].water) { const [x, y] = topXY(UI.hover[0]); g.globalAlpha = .55; drawProp(g, {kind: UI.brush, v: .3, q: UI.hover[0].q, r: UI.hover[0].r, s: 1}, x, y, SZ() * .84, {season: rc().season, lt, T: live.T, wind: 0}); g.globalAlpha = 1; } }
    if (weather === 'fog') { const gr = g.createLinearGradient(0, H0 * .3, 0, H0); gr.addColorStop(0, 'rgba(225,232,240,0)'); gr.addColorStop(1, 'rgba(225,232,240,.38)'); g.fillStyle = gr; g.fillRect(0, 0, W0, H0); }
    drawParticles(g, parts, lt);
    if (weather === 'storm' && Math.random() < dt * .25) frame.flash = 1; if (frame.flash > 0) { g.fillStyle = `rgba(255,255,255,${frame.flash * .55})`; g.fillRect(0, 0, W0, H0); frame.flash -= dt * 4; }
    if (lt.night > .5) { g.fillStyle = `rgba(10,20,60,${(lt.night - .5) * .16})`; g.fillRect(0, 0, W0, H0); }
    placeBubble(); if (!frame.u || now - frame.u > 500) { frame.u = now; updateStepper(); coverage(); }
  }
  requestAnimationFrame(frame);
}
function placeBubble() { const bu = $('#bubble'); if (!UI.sel) return; const p = [...W.props.values()].find(x => x.id === UI.sel); if (!p) return; const c = W.cells.get(E.key(p.q, p.r)); const [x, y] = topXY(c); bu.style.left = x + 'px'; bu.style.top = (y - SZ() * 1.9) + 'px'; }
function coverage() { const vw = innerWidth * innerHeight; let a = 0; (UI.play ? [$('#exitplay')] : $$('.ui')).forEach(el => { if (getComputedStyle(el).display === 'none') return; const r = el.getBoundingClientRect(); const w = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)), h = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)); a += w * h; }); $('#cover').textContent = `${UI.play ? 'Play' : 'Lab'} · interface covers ${Math.round(a / vw * 100)}%`; }
function resetPan() { view.px = 0; view.py = 20; view.fx = undefined; }

// ---- boot -------------------------------------------------------------------------------------------------------------------
try { const saved = qs.get('fresh') ? null : JSON.parse(store.get('awsb-ops') || 'null'); if (saved && saved.length && !qs.get('family')) { ops = saved; } } catch (e) {}
$('#modeb').onclick = () => setMode(document.body.classList.contains('study') ? 'lab' : 'study');
function setMode(m) { document.body.classList.toggle('study', m === 'study'); $$('#modeb button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); if (m === 'study') scrollTo(0, 0); }
$$('#modeb button').forEach(b => b.onclick = e => { e.stopPropagation(); setMode(b.dataset.m); });
$('#exitplay').onclick = () => setPlay(false);
buildToolbar(); renderRail(); resize(); addEventListener('resize', resize);
view.tz = 1; view.tt = TILT; W = E.fold(base, ops); lastEnvHour = W.env.hour; live.hour = W.env.hour; critKey = ''; rebuild();
if (qs.get('mode') === 'study' || location.hash === '#study') setMode('study'); if (qs.get('play') === '1') setPlay(true);
if (qs.get('tool')) setTool(qs.get('tool')); if (qs.get('zoom')) { view.zoom = view.tz = +qs.get('zoom'); } if (qs.get('rot')) view.rot = +qs.get('rot');
if (qs.get('drop')) setTimeout(() => dropTest(+qs.get('drop')), 1400);
if (qs.get('sim')) live.simT = +qs.get('sim');
renderPanel(); window.__lab = {get W() { return W; }, get ops() { return ops; }, undo, say, commit, UI, E, setPlay, setMode, dropTest};
requestAnimationFrame(frame);
