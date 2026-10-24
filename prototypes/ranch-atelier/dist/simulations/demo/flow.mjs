// The demo flow, end to end (Evan, 2026-10-23): opening tour in the studio -> Winchester diorama tour -> the strange
// scientist's group chat with the launch pad unfolding from the café roof -> the board, where tiles are placed -> the
// mission board -> a mission (zoom in, smoke, the mission page). Presentation only: every in-world thing is built by board.mjs.
import {createStage} from './town-stage.mjs';
import {createChat, CSS as CHAT_CSS, tone, audio} from './chat.mjs';
import {TOUR, SCIENTIST} from './script.mjs';
import {MISSIONS, registerMission, isDone, moonUnlocked, chest, state, save} from './missions.mjs';

const $ = s => document.querySelector(s), sleep = s => new Promise(r => setTimeout(r, s * 1000));
const Q = new URLSearchParams(location.search), DEMO = !Q.has('play');

// ---- smoke and mirrors: cartoon puffs hide the cut, then clear. A cut to a mission puffs on the place only (under a quarter
// of the screen, never a full-screen fade); the tour's one cut from studio to town puffs across the whole picture. ----
function smoke(mid, at = null) {
 const c = $('#smoke'), g = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight; c.style.display = 'block';
 const R = at ? Math.min(c.width, c.height) * .13 : 1, puffs = Array.from({length: at ? 16 : 46}, () => at
  ? {x: at[0] + (Math.random() - .5) * R * 1.4, y: at[1] + (Math.random() - .5) * R * 1.1, r: R * (.5 + Math.random() * .6), d: Math.random() * .25, s: 1}
  : {x: Math.random() * c.width, y: c.height * (.2 + Math.random() * .7), r: 40 + Math.random() * 120, d: Math.random() * .35, s: .7 + Math.random() * .5});
 tone([180, 140, 110], {type: 'triangle', len: .25, gain: .05, gap: .12});
 return new Promise(res => {
  const t0 = performance.now(); let midDone = false;
  (function f(now) {
   const t = (now - t0) / 1000; g.clearRect(0, 0, c.width, c.height);
   for (const p of puffs) { const k = Math.max(0, t - p.d), grow = Math.min(1, k / .55), fade = t < 1 ? 1 : Math.max(0, 1 - (t - 1) / .7), r = p.r * (.2 + grow * 1.4) * p.s;
    const gr = g.createRadialGradient(p.x, p.y, r * .1, p.x, p.y, r); gr.addColorStop(0, `rgba(255,252,246,${.95 * fade})`); gr.addColorStop(.7, `rgba(236,230,244,${.8 * fade})`); gr.addColorStop(1, 'rgba(236,230,244,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y - k * 20, r, 0, 7); g.fill(); }
   if (!midDone && t > .7) { midDone = true; mid && mid(); }
   if (t < 1.8) requestAnimationFrame(f); else { c.style.display = 'none'; res(); }
  })(t0);
 });
}

export async function start() {
 // one Winchester: the real seven-hex board on /town, in a frame; this page only adds the story on top of it
 const frame = $('#town'); await new Promise(res => { const ok = () => { try { const A = frame.contentWindow.AbbieTown; if (A?.stage && A.board && A.stage.tiles?.downtown?.spots?.cafeRoof) return res(); } catch {} setTimeout(ok, 300); }; ok(); });
 const stage = createStage(frame), chat = createChat(document.body); $('#gate button').disabled = false;
 window.demo = {stage, chat}; // for tests and the developer console
 const style = document.createElement('style'); style.textContent = CHAT_CSS; document.head.appendChild(style);
 let board = null; // the mission board element, once built

 // ---- cues from the script ----
 const cues = {
  studio: () => { stage.lock(true); stage.jump(stage.VIEWS.studio); chat.show('landscape', 'Abbie, Ani'); stage.shift(innerWidth > 900 ? .17 : 0); },
  walkIn: () => stage.walkIn(),
  board: () => smoke(() => stage.jump(stage.VIEWS.board)),
  'zone:downtown': () => stage.zoneView('downtown'), 'zone:ani': () => stage.zoneView('ani'), 'zone:abbie': () => stage.zoneView('abbie'), 'zone:school': () => stage.zoneView('school'),
  cafe: () => stage.cafeView(),
  phone: async () => { chat.hide(); await sleep(.5); chat.show('portrait', 'Strange Scientist, Abbie, Ani'); stage.shift(innerWidth > 900 ? .17 : 0); stage.roofView(); },
  padUnfold: async () => { tone([220, 330, 440, 660], {type: 'triangle', len: .3, gap: .5, gain: .05}); await stage.padUnfold(3.6); },
  toyRocket: () => stage.toyRocket(1.4),
  laugh: () => { [900, 1100, 950, 1200, 1000, 1300].forEach((f, i) => setTimeout(() => tone([f], {type: 'triangle', len: .07, gain: .05}), i * 110)); chat.reactToLast('😂'); },
  growSpray: async () => { tone([300, 500, 700, 900, 1200], {type: 'sawtooth', len: .25, gap: .3, gain: .03}); stage.flyTo({dist: 75, pitch: .42}); await stage.growSpray(3.2); },
  missionBoard: async () => { chat.hide(); stage.shift(0); await sleep(.6); openBoard(); }
 };
 async function play(script, quiet) {
  chat.setQuiet(quiet);
  for (const b of script) {
   if (b.cue) { const r = cues[b.cue]?.(); if (b.wait) await Promise.all([r, sleep(b.wait)]); else await r; }
   else await chat.say(b);
  }
 }

 // ---- tiles: a tray of two glass tiles; tap one, tap a free slot beside Winchester, it drops in and conforms ----
 let holding = null;
 const tray = $('#tray');
 function drawTray() {
  tray.innerHTML = '';
  for (const kind of ['ranch', 'moon']) {
   if (stage.has(kind)) continue;
   const locked = kind === 'moon' && !moonUnlocked(DEMO), b = document.createElement('button');
   b.className = 'tile ' + kind + (locked ? ' locked' : '') + (holding === kind ? ' held' : ''); b.setAttribute('aria-label', kind === 'ranch' ? 'Ranch tile' : locked ? 'Moon tile, locked until the Moon Mission is done' : 'Moon tile');
   b.innerHTML = `<i>${kind === 'ranch' ? '🐑' : locked ? '🔒' : '🌙'}</i>`;
   b.onclick = () => { stage.clearPadlock(); if (locked) { tone([200, 160], {type: 'square', len: .1, gain: .03}); return; } holding = holding === kind ? null : kind; stage.showSlots(!!holding); stage.flyTo(stage.VIEWS.board); drawTray(); };
   tray.appendChild(b);
  }
 }
 const cv = stage.canvas; let down = null;
 cv.addEventListener('pointermove', e => { if (holding && !down) { const s = stage.slotAt(e); stage.showSlots(true, s); } });
 cv.addEventListener('pointerdown', e => { down = {x: e.clientX, y: e.clientY}; });
 cv.addEventListener('pointerup', async e => {
  const was = down; down = null; if (!holding || !was || Math.hypot(e.clientX - was.x, e.clientY - was.y) > 6) return; // a drag turns the board; only a tap places
  const id = stage.slotAt(e); if (!id) return;
  const kind = holding; holding = null; stage.showSlots(false); stage.place(kind, id); tone([392, 523, 659], {type: 'triangle', len: .12, gain: .05});
  save({[kind + 'Placed']: true}); refreshBoard(); await sleep(1.1); await stage.tileView(id); await sleep(1.4); stage.flyTo(stage.VIEWS.board);
 });

 // ---- the chest (bottom left), the town noticeboard and its pinned cards ----
 const dock = $('#dock'), chestEl = $('#chest');
 const CHARM_ICON = id => (chest().find(c => c.id === id) || {icon: '🧀'}).icon;
 function drawChest(pop) {
  const cs = chest(), n = cs.filter(c => c.have).length;
  chestEl.innerHTML = `<b>${n} of ${cs.length}</b><div>${cs.map(c => `<span class="slot ${c.have ? 'have' : ''}">${c.have ? c.icon : ''}</span>`).join('')}</div>`;
  chestEl.setAttribute('aria-label', `Charm chest, ${n} of ${cs.length}`); if (pop) chestEl.animate([{transform: 'scale(1)'}, {transform: 'scale(1.18) rotate(-2deg)'}, {transform: 'scale(1)'}], {duration: 520});
 }
 window.AbbieDemo = {registerMission, stage, chat, get selected() { return picked; }, select: id => pick(MISSIONS.find(m => m.id === id))};
 function flags() { for (const m of MISSIONS) { const open = !isDone(m) && !(m.needs === 'moon' && !stage.has('moon')); stage.flag(typeof m.at === 'string' && m.at !== 'moon' ? m.at : 'none', open); } }
 function refreshBoard() { if (board) buildBoard(); drawTray(); drawChest(); flags(); }
 // Evan, 21:25Z: the mission selector is a paper notebook with a checklist. Pick a line and a halo (and a beam into the sky)
 // marks the place; then go there overhead, or drive there when the mission offers it.
 let picked = null;
 const placeOf = m => typeof m.at === 'function' ? m.at(stage) : m.at === 'moon' ? [...stage.tiles.values()].find(t => t.userData.kind === 'moon')?.userData.anchor : stage.spots[m.at];
 function pick(m) { if (picked !== m) picked?.onDeselect?.(stage); picked = m; m.onSelect?.(stage); const at = placeOf(m); stage.halo(at); if (at) stage.lookAt(at); buildBoard(); }
 function buildBoard() {
  board?.remove();
  const el = board = document.createElement('section'); el.className = 'missions'; el.setAttribute('aria-label', 'Missions notebook');
  el.innerHTML = `<i class="rings">${'<u></u>'.repeat(9)}</i><h2>Missions</h2><ul>${MISSIONS.map(m => { const sealed = m.needs === 'moon' && !stage.has('moon'), d = isDone(m), on = picked?.id === m.id;
   return `<li class="${sealed ? 'sealed' : ''} ${d ? 'done' : ''} ${on ? 'on' : ''} ${m.finale ? 'finale' : ''}" data-id="${m.id}"><span class="box">${d ? '✓' : ''}</span><span class="txt"><b>${m.icon} ${m.title}</b><small>${sealed ? 'Needs the Moon tile' : m.line}</small></span><span class="charm">${m.charmIcon || CHARM_ICON(m.charm)}</span>${sealed ? '<em>Show me where</em>' : on ? `<span class="go"><button class="glass" data-go="god" aria-label="Go overhead">🛰️</button>${m.drive ? '<button class="glass" data-go="drive" aria-label="Drive there">🏎️</button>' : ''}</span>` : ''}</li>`; }).join('')}</ul>`;
  document.body.appendChild(el);
  el.querySelectorAll('li').forEach(li => li.onclick = e => { const m = MISSIONS.find(x => x.id === li.dataset.id), go = e.target.closest('[data-go]')?.dataset.go;
   if (li.classList.contains('sealed')) return showWhere(m);
   if (go === 'god') { if (m.overhead) { closeBoard(); return m.overhead(m, stage); } return launch(m); } if (go === 'drive') { closeBoard(); return m.drive(m, stage); }
   pick(m); });
  requestAnimationFrame(() => el.classList.add('in'));
 }
 function closeBoard() { const el = board; board = null; if (!picked) stage.halo(null); if (el) { el.classList.remove('in'); setTimeout(() => el.remove(), 450); } }
 function openBoard() { stage.lock(false); stage.noticeView(); dock.hidden = false; chestEl.hidden = false; buildBoard(); drawTray(); drawChest(); flags(); }
 $('#pin').onclick = () => { if (board) { closeBoard(); stage.flyTo(stage.VIEWS.board); } else openBoard(); };

 // "Show me where": the padlock sets down on the open spot where the Moon tile goes
 async function showWhere(m) {
  tone([300, 380], {type: 'triangle', len: .1, gain: .04}); closeBoard();
  const slot = stage.nearestFree(); holding = moonUnlocked(DEMO) ? 'moon' : null; drawTray(); stage.showSlots(true);
  if (slot) { await stage.tileView(slot.id); await stage.padlock(slot.id); } else await stage.flyTo(stage.VIEWS.board);
 }

 // ---- a mission: dolly to the place (0.9 s), a puff on the place only hides the swap, the mission's own opening ----
 async function launch(m) {
  closeBoard(); stage.halo(null); picked = null; const where = m.at === 'moon' ? [...stage.tiles.values()].find(t => t.userData.kind === 'moon') : null, spot = where ? where.userData.anchor : stage.spots[m.at] || stage.spots.cafe;
  const go = where ? stage.tileView(where.userData.slot) : stage.spotView(stage.spots[m.at] ? m.at : 'cafe', 55);
  await sleep(.5);
  // the Moon Mission plays inside the real town (it launches from the café roof pad) and hands the camera back on scene-exit
  const tw = $('#town').contentWindow;
  if (m.inTown && tw.AbbieTown?.go) {
   await go; const back = () => { tw.removeEventListener('abbietown:scene-exit', back); refreshBoard(); drawChest(true); openBoard(); };
   tw.addEventListener('abbietown:scene-exit', back); tw.AbbieTown.go(m.inTown, {crew: true}); return;
  }
  await Promise.all([go, smoke(() => { const f = $('#mission'); f.hidden = false; f.querySelector('iframe').src = m.page; }, stage.project(spot))]);
 }
 $('#mission button').onclick = async () => {
  const f = $('#mission');
  await smoke(() => { f.hidden = true; f.querySelector('iframe').src = 'about:blank'; }, [innerWidth / 2, innerHeight / 2]);
  if (!DEMO && moonUnlocked(false)) save({moonUnlocked: true});
  refreshBoard(); drawChest(true); openBoard();
 };
 addEventListener('storage', refreshBoard);

// ---- the show ----
 const gate = $('#gate');
 const begin = async () => {
  gate.classList.add('go'); try { await Promise.race([audio().resume(), sleep(.5)]); } catch {}
  await sleep(.4); gate.remove();
  if (Q.has('skip')) { await cues.board(); openBoard(); return; }
  if (Q.get('at') === 'scientist') { await cues.board(); await play(SCIENTIST, true); return; }
  await play(TOUR, Q.has('quiet'));
  await play(SCIENTIST, true);
 };
 $('#gate button').onclick = begin;
 if (Q.has('go')) begin();
 return window.demo;
}
