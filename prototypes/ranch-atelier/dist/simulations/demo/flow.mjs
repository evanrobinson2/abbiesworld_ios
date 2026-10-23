// The demo flow, end to end (Evan, 2026-10-23): opening tour in the studio -> Winchester diorama tour -> the strange
// scientist's group chat with the launch pad unfolding from the café roof -> the board, where tiles are placed -> the
// mission board -> a mission (zoom in, smoke, the mission page). Presentation only: every in-world thing is built by board.mjs.
import {createStage} from './board.mjs';
import {createChat, CSS as CHAT_CSS, tone, audio} from './chat.mjs';
import {TOUR, SCIENTIST} from './script.mjs';
import {MISSIONS, isDone, moonUnlocked, chest, state, save} from './missions.mjs';
import {coinReward} from '../coin-reward.mjs';

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
 const stage = await createStage($('#stage')), chat = createChat(document.body);
 window.demo = {stage, chat}; // for tests and the developer console
 const style = document.createElement('style'); style.textContent = CHAT_CSS; document.head.appendChild(style);
 let board = null; // the mission board element, once built

 // ---- cues from the script ----
 const cues = {
  studio: () => { stage.setSky('#d9cdf5'); stage.tiltShift(false); stage.flyTo(stage.VIEWS.studio, 0); chat.show('landscape', 'Abbie, Ani'); stage.shift(innerWidth > 900 ? .17 : 0); },
  walkIn: () => stage.walkIn(),
  board: () => smoke(() => { stage.setSky('#cfe6f5'); stage.tiltShift(true); stage.flyTo(stage.VIEWS.board, 0); }),
  'zone:downtown': () => stage.zoneView('downtown', 2.2), 'zone:ani': () => stage.zoneView('ani', 2.2), 'zone:abbie': () => stage.zoneView('abbie', 2.2), 'zone:school': () => stage.zoneView('school', 2.2),
  cafe: () => stage.cafeView(2),
  phone: async () => { chat.hide(); await sleep(.5); chat.show('portrait', 'Strange Scientist, Abbie, Ani'); stage.shift(innerWidth > 900 ? .17 : 0); stage.roofView(1.8); },
  padUnfold: async () => { tone([220, 330, 440, 660], {type: 'triangle', len: .3, gap: .5, gain: .05}); await stage.padUnfold(3.6); },
  toyRocket: () => stage.toyRocket(1.4),
  laugh: () => { [900, 1100, 950, 1200, 1000, 1300].forEach((f, i) => setTimeout(() => tone([f], {type: 'triangle', len: .07, gain: .05}), i * 110)); chat.reactToLast('😂'); },
  growSpray: async () => { tone([300, 500, 700, 900, 1200], {type: 'sawtooth', len: .25, gap: .3, gain: .03}); stage.flyTo({dist: 34, pitch: .4}, 3); await stage.growSpray(3.2); },
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
   b.onclick = () => { stage.clearPadlock(); if (locked) { tone([200, 160], {type: 'square', len: .1, gain: .03}); return; } holding = holding === kind ? null : kind; stage.showSlots(!!holding); stage.flyTo(stage.VIEWS.board, 1); drawTray(); };
   tray.appendChild(b);
  }
 }
 const cv = $('#stage');
 let drag = null;
 cv.addEventListener('pointermove', e => { if (drag) { stage.nudge(-(e.clientX - drag.x) * .006, (e.clientY - drag.y) * .004, 1); drag = {x: e.clientX, y: e.clientY, moved: true}; return; } if (holding) { const s = stage.slotAt(e); stage.showSlots(true, s && s.join(',')); } });
 cv.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY}; });
 cv.addEventListener('wheel', e => { e.preventDefault(); stage.nudge(0, 0, e.deltaY > 0 ? 1.06 : .94); }, {passive: false});
 cv.addEventListener('pointerup', async e => {
  const was = drag; drag = null; if (was?.moved || !holding) return;
  const s = stage.slotAt(e); if (!s) return;
  const kind = holding; holding = null; stage.showSlots(false); stage.place(kind, s[0], s[1]); tone([392, 523, 659], {type: 'triangle', len: .12, gain: .05});
  save({[kind + 'Placed']: true}); refreshBoard(); await sleep(1.1); stage.tileView(s[0], s[1], 1.6); await sleep(2.2); stage.flyTo(stage.VIEWS.board, 1.6);
 });

 // ---- the chest (bottom left), the town noticeboard and its pinned cards ----
 const dock = $('#dock'), chestEl = $('#chest');
 const CHARM_ICON = id => (chest().find(c => c.id === id) || {icon: '🧀'}).icon;
 function drawChest(pop) {
  const cs = chest(), n = cs.filter(c => c.have).length;
  chestEl.innerHTML = `<b>${n} of ${cs.length}</b><div>${cs.map(c => `<span class="slot ${c.have ? 'have' : ''}">${c.have ? c.icon : ''}</span>`).join('')}</div>`;
  chestEl.setAttribute('aria-label', `Charm chest, ${n} of ${cs.length}`); if (pop) chestEl.animate([{transform: 'scale(1)'}, {transform: 'scale(1.18) rotate(-2deg)'}, {transform: 'scale(1)'}], {duration: 520});
 }
 function flags() { for (const m of MISSIONS) { const open = !isDone(m) && !(m.needs === 'moon' && !stage.has('moon')); stage.flag(m.at === 'moon' ? 'none' : m.at, open); } }
 function refreshBoard() { if (board) buildBoard(); drawTray(); drawChest(); flags(); }
 function buildBoard() {
  board?.remove();
  const el = board = document.createElement('section'); el.className = 'missions'; el.setAttribute('aria-label', 'Town notices');
  el.innerHTML = `<div class="plate">TOWN NOTICES</div><div class="cards">${MISSIONS.map((m, i) => { const sealed = m.needs === 'moon' && !stage.has('moon'), d = isDone(m); return `<button class="card ${sealed ? 'sealed' : ''} ${d ? 'done' : ''} ${m.finale ? 'finale' : ''}" data-id="${m.id}" style="--tint:${m.tint};--tilt:${[-1.6, 1.2, -.8, 1][i]}deg"><u></u><i>${m.icon}</i><h3>${m.title}</h3><p>${sealed ? 'Needs the Moon tile' : m.line}</p>${sealed ? '<em>Show me where</em>' : ''}<span class="medal">${CHARM_ICON(m.charm)}</span>${d ? '<b class="tag">Done</b>' : ''}</button>`; }).join('')}</div>`;
  document.body.appendChild(el);
  el.querySelectorAll('.card').forEach(b => b.onclick = () => { const m = MISSIONS.find(x => x.id === b.dataset.id); if (b.classList.contains('sealed')) return showWhere(m); launch(m); });
  requestAnimationFrame(() => el.classList.add('in'));
 }
 function closeBoard() { const el = board; board = null; if (el) { el.classList.remove('in'); setTimeout(() => el.remove(), 450); } }
 function openBoard() { const p = stage.spots.noticeboard.position, yaw = .75; stage.flyTo({target: [p.x + Math.sin(yaw) * 9, 1, p.z + Math.cos(yaw) * 9], dist: 34, yaw, pitch: .5}, 1.4); dock.hidden = false; chestEl.hidden = false; buildBoard(); drawTray(); drawChest(); flags(); }
 $('#pin').onclick = () => { if (board) { closeBoard(); stage.flyTo(stage.VIEWS.board, 1); } else openBoard(); };

 // "Show me where": the padlock sets down on the open spot where the Moon tile goes
 async function showWhere(m) {
  tone([300, 380], {type: 'triangle', len: .1, gain: .04}); closeBoard();
  const slot = stage.free().sort((a, b) => { const k = s => { const [x, z] = stage.hexXZ(...s); return x * Math.sin(.6) + z * Math.cos(.6); }; return k(b) - k(a); })[0]; holding = moonUnlocked(DEMO) ? 'moon' : null; drawTray(); stage.showSlots(true);
  if (slot) { await stage.tileView(slot[0], slot[1], 1.2); await stage.padlock(slot[0], slot[1]); } else await stage.flyTo(stage.VIEWS.board, 1);
 }

 // ---- a mission: dolly to the place (0.9 s), a puff on the place only hides the swap, the mission's own opening ----
 async function launch(m) {
  closeBoard(); const where = m.at === 'moon' ? [...stage.tiles.values()].find(t => t.userData.kind === 'moon') : null;
  const spot = where || stage.spots[m.at] || stage.spots.cafe, target = new stage.T.Vector3(); (where || spot).getWorldPosition(target);
  const go = where ? stage.tileView(where.userData.q, where.userData.r, .9) : stage.flyTo({target: [target.x, 2.5, target.z], dist: 22, yaw: .1, pitch: .4}, .9);
  await sleep(.5); await Promise.all([go, smoke(() => { const f = $('#mission'); f.hidden = false; f.querySelector('iframe').src = m.page; }, stage.project(where || spot))]);
 }
 $('#mission button').onclick = async () => {
  const f = $('#mission'); stage.flyTo(stage.VIEWS.board, 0);
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
