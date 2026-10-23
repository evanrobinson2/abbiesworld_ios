// Champions of the Drifting Isles: the game. Wires the rules (sim.js), the diorama (world.js), cards and sound.
import { CARDS, CHAMPIONS, TYPES, EDICTS, EVENT_INFO, CALENDAR, RUN_YEARS, champById, MAX_LEVEL } from './data.js';
import * as G from './sim.js';
import { World } from './world.js';
import { sfx, unlock, setMuted } from './audio.js';

const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const world = new World($('world'));
window.__world = world;
Object.defineProperty(window, '__S', { get: () => S });
window.__speed = (v) => { speed = v; };
let S = null;                 // the run
let busy = false;             // an animation owns the screen
let battle = null, speed = 1, acc = 0;
let muted = false;
try { muted = localStorage.getItem('champions.muted') === '1'; } catch { /* private mode */ }

// ---- icons (all drawn here) ---------------------------------------------------------------------------------------
const ICON = {
  sword: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7l-9 9-2-2-3 3-2-2 3-3-2-2z" fill="#fff" stroke="#3a2a1c" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  pawn: '<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" fill="#fff" stroke="#3a2a1c" stroke-width="1.6"/><path d="M6 21c0-5 2.5-8 6-8s6 3 6 8z" fill="#fff" stroke="#3a2a1c" stroke-width="1.6"/></svg>',
  scroll: '<svg viewBox="0 0 24 24"><path d="M6 4h11a3 3 0 0 1 0 6h-1v10H7a3 3 0 0 1 0-6h1V6" fill="#f6ecd4" stroke="#6b4416" stroke-width="1.6"/><path d="M10 9h4M10 13h4" stroke="#6b4416" stroke-width="1.4"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f2c14e" stroke="#8a5d22" stroke-width="1.8"/><circle cx="12" cy="12" r="5" fill="none" stroke="#c8962e" stroke-width="1.6"/></svg>',
  spire: '<svg viewBox="0 0 24 24"><path d="M12 2l4 8h-2v10h-4V10H8z" fill="#b9a4ff" stroke="#4a3a8a" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  dove: '<svg viewBox="0 0 24 24"><path d="M3 13c4 0 6-3 8-7 1 3 1 5 0 7 3 0 6-2 10-2-2 5-6 8-11 8-3 0-5-2-7-6z" fill="#fff" stroke="#3a4a6a" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  skull: '<svg viewBox="0 0 24 24"><path d="M12 3c5 0 8 3 8 7 0 3-2 4-2 6v3H6v-3c0-2-2-3-2-6 0-4 3-7 8-7z" fill="#f6ecd4" stroke="#3a2a1c" stroke-width="1.6"/><circle cx="9" cy="11" r="2" fill="#3a2a1c"/><circle cx="15" cy="11" r="2" fill="#3a2a1c"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="#cfe6ff" stroke="#2b4a7a" stroke-width="1.6"/></svg>',
  eye: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="#fff" stroke="#3a2a1c" stroke-width="1.6"/><circle cx="12" cy="12" r="3.5" fill="#4f86c9"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21C5 16 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-3 8-10 13z" fill="#e2577a" stroke="#7a1f34" stroke-width="1.6"/></svg>',
  leaf: '<svg viewBox="0 0 24 24"><path d="M4 20C4 9 10 4 20 4c0 10-5 16-16 16z" fill="#5fa043" stroke="#2d5a1e" stroke-width="1.6"/><path d="M4 20L14 10" stroke="#2d5a1e" stroke-width="1.4"/></svg>',
  dice: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="#3a2a1c" stroke-width="1.6"/><circle cx="8" cy="8" r="1.6" fill="#3a2a1c"/><circle cx="16" cy="16" r="1.6" fill="#3a2a1c"/><circle cx="12" cy="12" r="1.6" fill="#3a2a1c"/></svg>',
  boot: '<svg viewBox="0 0 24 24"><path d="M7 3h6v9l6 3c2 1 2 5 0 5H5V3z" fill="#a8743f" stroke="#3a2a1c" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  hammer: '<svg viewBox="0 0 24 24"><path d="M4 7l6-4 4 4-2 2 8 9-2 2-9-8-2 2z" fill="#bfb5a4" stroke="#3a2a1c" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  reroll: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-3-6.2" fill="none" stroke="#5a3a14" stroke-width="2.6" stroke-linecap="round"/><path d="M20 3v6h-6" fill="none" stroke="#5a3a14" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  horn: '<svg viewBox="0 0 48 48"><path d="M6 30c10-2 22-10 30-20l4 3c-4 12-12 22-24 26z" fill="#fff6d8" stroke="#6b4416" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="38" cy="11.5" rx="4.5" ry="3" transform="rotate(36 38 11.5)" fill="#6b4416"/><path d="M14 30l3 6" stroke="#6b4416" stroke-width="2.4"/></svg>',
  flame: '<svg viewBox="0 0 26 32"><path d="M13 1c2 6 10 9 10 18a10 10 0 0 1-20 0c0-5 3-7 4-11 2 3 2 5 4 6 1-5 0-9 2-13z" fill="#ff8a2a" stroke="#7a2a0a" stroke-width="1.6" stroke-linejoin="round"/><path d="M13 14c1 3 5 5 5 9a5 5 0 0 1-10 0c0-3 3-5 5-9z" fill="#ffd45a"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#5a3a14"/><path d="M16 8c2 2 2 6 0 8M19 5c4 4 4 10 0 14" fill="none" stroke="#5a3a14" stroke-width="2" stroke-linecap="round"/></svg>',
  nosound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#5a3a14"/><path d="M16 9l5 6M21 9l-5 6" stroke="#5a3a14" stroke-width="2" stroke-linecap="round"/></svg>',
  sword2: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7l-9 9-2-2-3 3-2-2 3-3-2-2z" fill="#ffe48a" stroke="#3a2a1c" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};
const EVENT_ICON = { council: ICON.scroll, merchant: ICON.coin, spire: ICON.spire, war: ICON.sword, peace: ICON.dove, final: ICON.skull };

// ---- cards --------------------------------------------------------------------------------------------------------
function fmt(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)); }
function cardEl(id, opts = {}) {
  const c = CARDS[id], ch = champById(c.champ);
  const el = document.createElement('div');
  el.className = `card t-${c.type} r${c.rarity}` + (c.text.length > 62 ? ' small-text' : '');
  el.style.setProperty('--c', ch ? ch.color : '#7b5bd6');
  el.style.setProperty('--a', ch ? ch.accent : '#f2c14e');
  let stats = '';
  if (c.unit) stats += `<div class="stat l">${ICON.pawn}${c.unit.perGold ? '$' : c.unit.count}</div><div class="stat r">${ICON.sword}${fmt(c.unit.dmg * 10 / c.unit.cd)}</div>`;
  if (c.shooter) stats += `<div class="stat r">${ICON.sword}${fmt(c.shooter.dmg * 10 / c.shooter.cd)}</div>`;
  el.innerHTML = `<div class="face"><div class="art"><img alt="" draggable="false" src="${world.cardArt(id)}"></div><div class="name">${c.name}</div><div class="gem"></div>
    <div class="type">${TYPES[c.type].label}${ch ? '' : ' · Rare'}</div><div class="text">${c.text}</div>${stats}</div>`;
  if (opts.price != null) el.insertAdjacentHTML('beforeend', `<div class="price"><span class="coin-ico"></span>${opts.price}</div>`);
  el.dataset.id = id;
  return el;
}

// ---- HUD ----------------------------------------------------------------------------------------------------------
function hud() {
  $('hud').classList.remove('hidden');
  $('yearNum').textContent = S.year;
  const next = Object.keys(CALENDAR).map(Number).filter((y) => y >= S.year).sort((a, b) => a - b)[0];
  $('yearNext').innerHTML = next ? `${EVENT_ICON[CALENDAR[next]]}${next === S.year ? 'now' : next}` : '';
  // ring of 33 ticks; filled up to the current year, marks on event years
  let t = '';
  for (let y = 1; y <= RUN_YEARS; y++) {
    const a = (y - 0.5) / RUN_YEARS * Math.PI * 2 - Math.PI / 2, ev = CALENDAR[y];
    const r0 = ev ? 51 : 52, r1 = ev ? 59 : 56;
    t += `<line x1="${50 + Math.cos(a) * r0}" y1="${50 + Math.sin(a) * r0}" x2="${50 + Math.cos(a) * r1}" y2="${50 + Math.sin(a) * r1}" stroke="${y < S.year ? '#8a5d22' : y === S.year ? '#d6453a' : ev ? '#ffffff' : '#ffffffaa'}" stroke-width="${ev || y === S.year ? 3.4 : 2}" stroke-linecap="round"/>`;
  }
  $('yearTicks').innerHTML = t;
  $('gold').textContent = S.gold;
  let lv = '';
  for (let k = 0; k < 3; k++) lv += `<span class="life${k >= S.lives ? ' lost' : ''}">${ICON.flame}</span>`;
  $('lives').innerHTML = lv;
  const att = champById(S.attacker);
  $('attacker').style.setProperty('--ac', att.color);
  $('attackerImg').src = world.champArt(att.id);
  $('attacker').classList.toggle('final', CALENDAR[S.year] === 'final');
  const cost = G.rerollCost(S);
  $('attackerReroll').innerHTML = `${ICON.reroll}${cost === 0 ? 'free' : cost}`;
  $('mute').innerHTML = muted ? ICON.nosound : ICON.sound;
  horn();
}
function horn() {
  const h = $('horn');
  if (!S || S.phase !== 'plan' || busy) { h.classList.add('hidden'); return; }
  h.classList.remove('hidden');
  const need = Math.max(0, S.hand.length - G.handLimit(S));
  const ready = G.readyForBattle(S);
  h.classList.toggle('ready', ready); h.classList.toggle('waiting', !ready);
  h.querySelector('.horn-ico').innerHTML = ICON.horn;
  $('hornLabel').textContent = ready ? '' : (!G.seatPlot(S.board) ? 'seat' : `${need} more`);
}
function bumpPurse() { const p = $('purse'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); $('gold').textContent = S.gold; }
async function flyCoins(from, n, delay = 0) {
  const to = $('purse').getBoundingClientRect(), tx = to.left + 20, ty = to.top + 20;
  const k = Math.min(n, 12);
  for (let i = 0; i < k; i++) {
    const c = document.createElement('div'); c.className = 'flycoin'; c.innerHTML = ICON.coin; $('fly').appendChild(c);
    const sx = from.x + (Math.random() - 0.5) * 30, sy = from.y + (Math.random() - 0.5) * 20;
    c.animate([{ transform: `translate(${sx}px,${sy}px) scale(.4)` }, { transform: `translate(${sx + (Math.random() - 0.5) * 60}px,${sy - 50}px) scale(1.2)`, offset: 0.35 }, { transform: `translate(${tx}px,${ty}px) scale(.8)` }],
      { duration: 650, delay: delay + i * 55, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' }).finished.then(() => { c.remove(); sfx.coin(i); bumpPurse(); });
  }
  await wait(delay + k * 55 + 650);
}
function label(i, html, cls = '') {
  const p = world.plotScreen(i, 2.6);
  const el = document.createElement('div'); el.className = 'plabel ' + cls; el.innerHTML = html;
  el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  $('labels').appendChild(el); setTimeout(() => el.remove(), 2900);
}
async function banner(title, sub = '', bad = false, ms = 1500) {
  $('bannerTitle').textContent = title; $('bannerSub').textContent = sub;
  const b = $('banner'); b.classList.toggle('bad', bad); b.classList.remove('hidden');
  const inner = b.firstElementChild; inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = '';
  await wait(ms); b.classList.add('hidden');
}

// ---- hand ---------------------------------------------------------------------------------------------------------
function layoutHand() {
  const hand = $('hand');
  hand.innerHTML = '';
  const n = S.hand.length, cw = parseFloat(getComputedStyle(hand.parentElement || document.body).getPropertyValue('--cw')) || hand.querySelector('.card')?.offsetWidth || 110;
  const W = window.innerWidth, cardW = Math.min(128, Math.max(84, W * 0.21));
  const spread = Math.min(cardW * 0.82, (W - cardW - 24) / Math.max(1, n - 1));
  S.hand.forEach((id, k) => {
    const slot = document.createElement('div'); slot.className = 'slot';
    const off = (k - (n - 1) / 2);
    slot.style.transform = `translateX(calc(-50% + ${off * spread}px)) translateY(${Math.abs(off) * Math.abs(off) * 4}px) rotate(${off * 4}deg)`;
    slot.dataset.k = k;
    const el = cardEl(id); el.style.setProperty('--sway', (3 + (k % 3)) + 's'); el.style.setProperty('--phase', (-k * 0.7) + 's');
    slot.appendChild(el);
    slot.addEventListener('pointerdown', (e) => beginDrag(e, k, slot));
    hand.appendChild(slot);
  });
}
function showHand(on) { $('hand').classList.toggle('away', !on); }

// ---- drag and drop ------------------------------------------------------------------------------------------------
let drag = null;
function beginDrag(e, k, slot) {
  if (busy || !S || S.phase !== 'plan') return;
  unlock();
  e.preventDefault();
  hideBubble();
  const rect = slot.getBoundingClientRect();
  drag = { k, id: S.hand[k], slot, startX: e.clientX, startY: e.clientY, moved: false, el: null, offX: e.clientX - rect.left - rect.width / 2, offY: e.clientY - rect.top - rect.height / 2, w: rect.width, target: null, x: e.clientX, y: e.clientY, sc: 1 };
  slot.setPointerCapture?.(e.pointerId);
  slot.addEventListener('pointermove', moveDrag);
  slot.addEventListener('pointerup', endDrag);
  slot.addEventListener('pointercancel', endDrag);
}
function moveDrag(e) {
  if (!drag) return;
  drag.x = e.clientX; drag.y = e.clientY;
  if (!drag.moved && Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 8) {
    drag.moved = true;
    sfx.lift();
    const el = cardEl(drag.id); el.classList.add('dragged'); el.style.width = drag.w + 'px';
    $('fly').appendChild(el); drag.el = el;
    drag.slot.style.visibility = 'hidden';
    drag.valid = G.validPlots(S, drag.id);
    world.setWellGlow(true, false);
  }
  if (!drag.moved) return;
  const handTop = $('hand').getBoundingClientRect().top;
  const overWorld = e.clientY < handTop + 20;
  const t = overWorld ? world.pick(e.clientX, e.clientY) : null;
  const kind = typeof t === 'number' ? G.playKind(S, drag.id, t) : null;
  if (t !== drag.target) { if (t != null && (kind || t === 'well')) sfx.hover(); drag.target = t; }
  world.highlight(drag.valid, kind ? t : null, kind ? { card: drag.id, kind } : null);
  world.setWellGlow(true, t === 'well');
  drag.sc += ((overWorld ? 0.42 : 1.06) - drag.sc) * 0.5;
  const tilt = Math.max(-14, Math.min(14, (e.movementX || 0) * 1.2));
  const lift = overWorld ? drag.w * 1.4 * drag.sc * 0.5 + 46 : drag.w * 0.5;
  drag.el.style.transform = `translate(${e.clientX - drag.w / 2}px, ${e.clientY - drag.w * 0.7 - lift}px) scale(${drag.sc}) rotate(${tilt}deg)`;
  drag.el.style.opacity = overWorld ? 0.92 : 1;
}
async function endDrag(e) {
  const d = drag; drag = null;
  if (!d) return;
  d.slot.removeEventListener('pointermove', moveDrag); d.slot.removeEventListener('pointerup', endDrag); d.slot.removeEventListener('pointercancel', endDrag);
  world.highlight([], null, null); world.setWellGlow(false, false);
  if (!d.moved) { inspect(d.id); return; }
  const t = d.target;
  const kind = typeof t === 'number' ? G.playKind(S, d.id, t) : null;
  if (kind) {
    busy = true;
    const p = world.plotScreen(t, 0.8);
    await d.el.animate([{ transform: d.el.style.transform, opacity: 1 }, { transform: `translate(${p.x - d.w / 2}px, ${p.y - d.w * 0.7}px) scale(.12) rotate(0deg)`, opacity: 0.2 }], { duration: 230, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' }).finished;
    d.el.remove();
    G.play(S, d.k, t);
    world.syncBoard(S.board, { plot: t, kind });
    const lvl = S.board.plots[t].level;
    if (kind === 'place') sfx.place(1); else if (kind === 'level' || kind === 'spell') { sfx.levelUp(lvl); label(t, `Lv ${lvl}`, 'gold'); } else sfx.charm();
    world.shake(0.08);
    busy = false;
    layoutHand(); hud(); save();
  } else if (t === 'well') {
    busy = true;
    const p = world.wellScreen();
    await d.el.animate([{ transform: d.el.style.transform }, { transform: `translate(${p.x - d.w / 2}px, ${p.y - d.w * 0.7}px) scale(.1) rotate(200deg)`, opacity: 0 }], { duration: 380, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' }).finished;
    d.el.remove();
    G.discard(S, d.k);
    sfx.well();
    flyCoins(p, 9);
    busy = false;
    layoutHand(); hud(); save();
  } else {
    if (typeof t === 'number') sfx.deny();
    const r = d.slot.getBoundingClientRect();
    await d.el.animate([{ transform: d.el.style.transform }, { transform: `translate(${r.left}px, ${r.top}px) scale(1)` }], { duration: 260, easing: 'cubic-bezier(.3,1.4,.5,1)', fill: 'forwards' }).finished;
    d.el.remove(); d.slot.style.visibility = '';
  }
}

function inspect(id) {
  const o = $('overlay'); o.className = 'inspect'; o.innerHTML = '';
  o.appendChild(cardEl(id));
  const valid = G.validPlots(S, id);
  world.highlight(valid, null, null);
  sfx.flip();
  o.onclick = () => { o.className = 'hidden'; o.onclick = null; world.highlight([], null, null); };
}

// ---- tapping plots (inspect, or the Spire) -----------------------------------------------------------------------
let tapStart = null, spireResolve = null;
$('world').addEventListener('pointerdown', (e) => { unlock(); tapStart = { x: e.clientX, y: e.clientY }; });
$('world').addEventListener('pointerup', (e) => {
  if (!tapStart || Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 10) return;
  const t = world.pick(e.clientX, e.clientY);
  if (spireResolve && typeof t === 'number' && G.expandable(S.board).includes(t)) { const r = spireResolve; spireResolve = null; r(t); return; }
  if (typeof t === 'number' && S && S.board.plots[t].card) showBubble(t); else hideBubble();
});
function showBubble(i) {
  const p = S.board.plots[i], c = CARDS[p.card], army = G.buildArmy(S.board, 'P', { mods: S.mods, gold: S.gold });
  let row = '';
  const u = army.units.find((g) => g.spec.plot === i), sh = army.shooters.find((x) => x.plot === i);
  if (u) row += `<span>${ICON.pawn.replace('<svg', '<svg width="14" height="14"')} ${u.count}</span><span>${ICON.sword.replace('<svg', '<svg width="14" height="14"')} ${fmt(u.spec.dmg * 10 / u.spec.cd)}</span>`;
  if (sh) row += `<span>${ICON.sword.replace('<svg', '<svg width="14" height="14"')} ${fmt(sh.dmg * 10 / sh.cd)}</span>`;
  const charms = Object.entries(p.charms).map(([k, v]) => ({ hp: `+${Math.round(v * 100)}% health`, dmg: `+${Math.round(v * 100)}% damage`, loot: `${Math.round(v * 100)}% coin` }[k])).join(', ');
  const b = $('bubble');
  b.innerHTML = `<b>${c.name} <span class="lv">Lv ${p.level}</span></b>${c.text}${row ? `<div class="row">${row}</div>` : ''}${charms ? `<div class="row">${charms}</div>` : ''}`;
  const s = world.plotScreen(i, 2.4);
  b.style.left = Math.max(120, Math.min(window.innerWidth - 120, s.x)) + 'px'; b.style.top = s.y + 'px';
  b.classList.remove('hidden');
  sfx.hover();
}
function hideBubble() { $('bubble').classList.add('hidden'); }

// ---- the year -----------------------------------------------------------------------------------------------------
$('horn').addEventListener('click', () => { unlock(); if (!busy && S && S.phase === 'plan' && G.readyForBattle(S)) fight(); else { sfx.deny(); const h = $('horn'); h.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 220 }); } });
$('speed').addEventListener('click', () => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; $('speedLabel').textContent = speed + '×'; sfx.snap(); });
$('attacker').addEventListener('click', () => {
  unlock();
  if (busy || !S || S.phase !== 'plan') return;
  if (G.rerollAttacker(S)) { sfx.coin(); sfx.flip(); world.setRivals(S.rivals, S.attacker); hud(); save(); }
  else sfx.deny();
});
$('mute').addEventListener('click', () => { muted = !muted; setMuted(muted); try { localStorage.setItem('champions.muted', muted ? '1' : '0'); } catch { /* ignore */ } hud(); });

async function fight() {
  busy = true; hideBubble(); horn();
  showHand(false);
  sfx.horn();
  // income from vaults and mints flies to the purse first
  const income = G.preBattleIncome(S);
  for (const inc of income) if (inc.plot != null) label(inc.plot, `+${inc.gold}`, 'gold');
  const total = income.reduce((a, b) => a + b.gold, 0);
  battle = G.startBattle(S);
  if (total) for (const inc of income) flyCoins(inc.plot != null ? world.plotScreen(inc.plot) : { x: innerWidth / 2, y: innerHeight / 2 }, inc.gold);
  hud();
  const att = champById(S.attacker);
  world.setMode('battle');
  world.startBattle(battle, champById(S.champ).color, att.color, CALENDAR[S.year] === 'final' ? att.id : null);
  banner(CALENDAR[S.year] === 'final' ? 'Final Siege' : `${att.name}`, CALENDAR[S.year] === 'final' ? 'They come in person.' : 'attacks!', false, 1300);
  $('speed').classList.remove('hidden');
  acc = 0;
}
world.onFrame = (dt) => {
  if (!battle) return;
  acc += dt * speed;
  let steps = 0;
  while (acc >= 1 / 60 && steps < 12 * speed && !battle.result) { battle.step(1 / 60); acc -= 1 / 60; steps++; }
  const colors = { P: champById(S.champ).color, E: champById(S.attacker).color };
  world.playEvents(battle.events, colors);
  for (const ev of battle.events) {
    if (ev.t === 'death') sfx.death();
    else if (ev.t === 'hit') sfx.hit();
    else if (ev.t === 'boom' || ev.t === 'burst') sfx.boom();
    else if (ev.t === 'zap') sfx.zap(ev.kind);
    else if (ev.t === 'shoot') sfx.shoot();
    else if (ev.t === 'coin') sfx.coin();
    else if (ev.t === 'breach') sfx.breach();
  }
  battle.events.length = 0;
  if (battle.result && !battle.ending) { battle.ending = true; endBattle(); }
};

async function endBattle() {
  const b = battle;
  await wait(b.result === 'win' ? 700 : 1100);
  $('speed').classList.add('hidden');
  // damage dealt, floating from each plot
  for (const p of S.board.plots) if (p.card && p.dealt > 0) label(p.i, `${ICON.sword2}${fmt(p.dealt)}`);
  const out = G.finishBattle(S, b);
  if (out.won) { sfx.win(); await banner(out.final ? 'Victory!' : 'The isle holds!', `${b.kills} foes routed`, false, 1500); }
  else { await banner('Breached!', S.lives > 0 ? 'You lose a life.' : 'The last light goes out.', true, 1600); }
  hud();
  if (!out.won) { const lives = $('lives').children; if (lives[S.lives]) { lives[S.lives].classList.remove('lost'); lives[S.lives].classList.add('going'); } }
  world.endBattle();
  battle = null;
  world.setMode('plan');
  await flyCoins({ x: innerWidth / 2, y: innerHeight * 0.38 }, out.gold);
  hud();
  if (S.over) { save(true); return endScreen(); }
  // spoils: a card from the beaten rival (or from your own deck after a loss)
  for (const id of out.loot) await spoils(id, out.won ? S.attacker : S.champ);
  layoutHand(); showHand(true);
  await chooseCard();
  G.nextYear(S);
  world.setRivals(S.rivals, S.attacker);
  hud();
  await runEvent();
  busy = false;
  world.syncBoard(S.board);
  layoutHand(); showHand(true); hud(); save();
  await banner(`Year ${S.year}`, `${champById(S.attacker).name} gathers a warband.`, false, 1300);
}

async function spoils(id, fromChamp) {
  const o = $('overlay'); o.className = ''; o.innerHTML = `<div class="stage-title">Spoils of war</div>`;
  const wrap = document.createElement('div'); wrap.className = 'row-cards'; const el = cardEl(id); wrap.appendChild(el); o.appendChild(wrap);
  sfx.reveal(CARDS[id].rarity);
  await wait(1100);
  const r = el.getBoundingClientRect(), h = $('hand').getBoundingClientRect();
  await el.animate([{ transform: 'none' }, { transform: `translate(${h.left + h.width / 2 - r.left - r.width / 2}px, ${h.top - r.top}px) scale(.6)`, opacity: 0.3 }], { duration: 380, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished;
  o.className = 'hidden';
}

function chooseCard() {
  return new Promise((resolve) => {
    let offer = G.offerCards(S);
    const o = $('overlay'); o.className = '';
    const draw = () => {
      o.innerHTML = `<div class="stage-title">Choose a card</div>`;
      const row = document.createElement('div'); row.className = 'row-cards';
      offer.forEach((id) => {
        const el = cardEl(id); row.appendChild(el);
        el.addEventListener('click', async () => {
          sfx.flip(); S.hand.push(id);
          const r = el.getBoundingClientRect(), h = $('hand').getBoundingClientRect();
          await el.animate([{ transform: 'none' }, { transform: `translate(${h.left + h.width / 2 - r.left - r.width / 2}px, ${h.top - r.top}px) scale(.6)`, opacity: 0.4 }], { duration: 340, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished;
          o.className = 'hidden'; layoutHand(); resolve();
        }, { once: true });
      });
      o.appendChild(row);
      const cost = G.rerollCost(S);
      const btn = document.createElement('button'); btn.className = 'pill'; btn.innerHTML = `${ICON.reroll.replace('<svg', '<svg width="20" height="20"')} Reroll <span class="coin-ico"></span>${cost || 'free'}`;
      btn.disabled = S.gold < cost;
      btn.addEventListener('click', () => { const nx = G.rerollOffer(S); if (nx) { offer = nx; sfx.coin(); hud(); draw(); } else sfx.deny(); });
      o.appendChild(btn);
    };
    draw();
  });
}

// ---- events -------------------------------------------------------------------------------------------------------
async function runEvent() {
  const ev = G.eventFor(S);
  if (!ev) return;
  const info = EVENT_INFO[ev];
  sfx.open();
  if (ev === 'final') { await banner(info.name, info.line, true, 2200); return; }
  if (ev === 'council') return council();
  if (ev === 'merchant') return merchant();
  if (ev === 'spire') return spire();
  if (ev === 'war') return envoy('war');
  if (ev === 'peace') return envoy('peace');
}
function council() {
  return new Promise((resolve) => {
    const o = $('overlay'); o.className = '';
    o.innerHTML = `<div class="stage-title">${EVENT_INFO.council.name}</div><div class="stage-sub">${EVENT_INFO.council.line}</div>`;
    const row = document.createElement('div'); row.className = 'seals';
    for (const id of G.offerEdicts(S)) {
      const e = EDICTS.find((x) => x.id === id);
      const el = document.createElement('button'); el.className = 'seal';
      el.innerHTML = `${ICON[e.icon] || ICON.scroll}<b>${e.name}</b><span>${e.text}</span>`;
      el.addEventListener('click', async () => {
        G.applyEdict(S, id); sfx.levelUp(4); world.syncBoard(S.board); hud();
        await el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)', opacity: 0 }], { duration: 300, fill: 'forwards' }).finished;
        o.className = 'hidden'; resolve();
      }, { once: true });
      row.appendChild(el);
    }
    o.appendChild(row);
  });
}
function merchant() {
  return new Promise((resolve) => {
    const stock = G.merchantStock(S);
    const o = $('overlay'); o.className = '';
    o.innerHTML = `<div class="stage-title">${EVENT_INFO.merchant.name}</div><div class="stage-sub">${EVENT_INFO.merchant.line}</div>`;
    const row = document.createElement('div'); row.className = 'row-cards';
    const els = stock.map((id) => {
      const el = cardEl(id, { price: G.merchantPrice(S) });
      el.addEventListener('click', async () => {
        if (el.dataset.sold || !G.buy(S, id)) { sfx.deny(); return; }
        el.dataset.sold = '1';
        sfx.coin(); sfx.flip(); bumpPurse(); hud(); layoutHand(); refresh();
        const r = el.getBoundingClientRect(), h = $('hand').getBoundingClientRect();
        await el.animate([{ transform: 'none' }, { transform: `translate(${h.left + h.width / 2 - r.left - r.width / 2}px, ${h.top - r.top}px) scale(.5)`, opacity: 0 }], { duration: 360, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards' }).finished;
        el.style.visibility = 'hidden';
      });
      row.appendChild(el);
      return el;
    });
    const refresh = () => {
      const price = G.merchantPrice(S);
      for (const el of els) { const p = el.querySelector('.price'); if (p) p.lastChild.textContent = price; el.classList.toggle('cant', S.gold < price); }
    };
    refresh();
    o.appendChild(row);
    const btn = document.createElement('button'); btn.className = 'pill ghosty'; btn.textContent = 'Sail on';
    btn.addEventListener('click', () => { o.className = 'hidden'; resolve(); }, { once: true });
    o.appendChild(btn);
  });
}
async function spire() {
  const cells = G.expandable(S.board);
  if (!cells.length) return;
  showHand(false);
  world.setExpandable(cells);
  const o = $('overlay'); o.className = 'clear';
  o.innerHTML = `<div style="position:absolute;top:calc(118px + var(--safe-t));left:0;right:0;pointer-events:none"><div class="stage-title">${EVENT_INFO.spire.name}</div><div class="stage-sub" style="margin:4px auto 0">Tap a glowing spot to grow your isle.</div></div>`;
  const i = await new Promise((r) => { spireResolve = r; });
  G.expand(S, i);
  world.setExpandable([]);
  world.openPlot(i);
  sfx.rumble(); sfx.levelUp(3);
  o.className = 'hidden';
  await wait(600);
  showHand(true);
}
function envoy(kind) {
  return new Promise((resolve) => {
    const opts = kind === 'war' ? G.warOptions(S) : G.peaceOptions(S);
    if (!opts.length || (kind === 'peace' && G.activeRivals(S).length <= 1)) return resolve();
    const info = EVENT_INFO[kind];
    const o = $('overlay'); o.className = '';
    o.innerHTML = `<div class="stage-title">${info.name}</div><div class="stage-sub">${kind === 'war' ? 'Choose who joins the war.' : 'Choose who lays down arms.'}</div>`;
    const row = document.createElement('div'); row.className = 'champs';
    for (const id of opts) {
      const ch = champById(id);
      const el = document.createElement('button'); el.className = 'champ'; el.style.setProperty('--c', ch.color);
      el.innerHTML = `<div class="pt"><img alt="" src="${world.champArt(id)}"></div><b>${ch.name}</b><i>${ch.realm}</i>`;
      el.addEventListener('click', () => {
        if (kind === 'war') G.declareWar(S, id); else G.makePeace(S, id);
        world.setRivals(S.rivals, S.attacker); sfx.open(); hud();
        o.className = 'hidden'; resolve();
      }, { once: true });
      row.appendChild(el);
    }
    o.appendChild(row);
  });
}

// ---- title, end, save ---------------------------------------------------------------------------------------------
function save(clear) {
  try {
    if (clear || !S || S.over) { localStorage.removeItem('champions.run'); return; }
    const copy = { ...S, _rng: undefined, rngState: S._rng.state() };
    localStorage.setItem('champions.run', JSON.stringify(copy));
  } catch { /* storage may be blocked */ }
}
function load() {
  try {
    const raw = localStorage.getItem('champions.run'); if (!raw) return null;
    const s = JSON.parse(raw); s._rng = G.makeRng(s.rngState);
    if (!s.board || !s.hand) return null;
    if (s.phase !== 'plan') s.phase = 'plan';
    return s;
  } catch { return null; }
}
function title() {
  S = null;
  world.setMode('title');
  world.syncBoard(G.newBoard());
  $('hud').classList.add('hidden'); $('hand').innerHTML = ''; $('horn').classList.add('hidden');
  const saved = load();
  const o = $('overlay'); o.className = '';
  o.style.justifyContent = 'flex-start';
  o.innerHTML = `<div class="logo" style="margin-top:4vh"><div class="l1">Champions</div><div class="l2">of the Drifting Isles</div></div>
    <div class="stage-sub" style="margin-top:2vh">Place a card or two each year. Hold your isle for 33 years.</div>`;
  if (saved) {
    const b = document.createElement('button'); b.className = 'pill'; b.innerHTML = `Continue · Year ${saved.year}`;
    b.addEventListener('click', () => { unlock(); o.style.justifyContent = ''; start(saved); });
    o.appendChild(b);
  }
  const row = document.createElement('div'); row.className = 'champs'; row.style.marginTop = 'auto';
  for (const ch of CHAMPIONS) {
    const el = document.createElement('button'); el.className = 'champ'; el.style.setProperty('--c', ch.color);
    el.innerHTML = `<div class="pt"><img alt="" src="${world.champArt(ch.id)}"></div><b>${ch.name}</b><i>${ch.realm}</i>`;
    el.addEventListener('click', () => { unlock(); sfx.fanfare(); o.style.justifyContent = ''; start(G.newRun(ch.id)); });
    row.appendChild(el);
  }
  o.appendChild(row);
  o.insertAdjacentHTML('beforeend', '<div class="tribute">A tribute to the play of 9 Kings by Sad Socket. Our own world, art and sound.</div>');
}
async function start(run) {
  S = run;
  $('overlay').className = 'hidden';
  world.setRivals(S.rivals, S.attacker);
  world.syncBoard(S.board);
  world.setMode('plan');
  setMuted(muted);
  layoutHand(); showHand(true); hud();
  save();
  busy = true;
  await banner(`Year ${S.year}`, S.year === 1 ? 'Drag your seat onto a plot.' : `${champById(S.attacker).name} gathers a warband.`, false, 1500);
  busy = false; horn();
  if (S.year === 1 && !G.seatPlot(S.board)) world.highlight(G.validPlots(S, champById(S.champ).seat), null, null);
}
function endScreen() {
  const o = $('overlay'); o.className = '';
  const ch = champById(S.champ);
  if (S.won) sfx.fanfare();
  o.innerHTML = `<div class="stage-title">${S.won ? 'Champion of the Isles!' : 'The isle has fallen'}</div>
    <div class="champs"><div class="champ" style="--c:${ch.color}"><div class="pt"><img alt="" src="${world.champArt(ch.id)}"></div><b>${ch.name}</b><i>${ch.realm}</i></div></div>
    <div class="stats"><div><b>${S.year}</b>years</div><div><b>${fmt(S.stats.kills)}</b>foes routed</div><div><b>${S.stats.battlesWon}</b>battles won</div></div>`;
  const b = document.createElement('button'); b.className = 'pill'; b.textContent = 'New run';
  b.addEventListener('click', () => title());
  o.appendChild(b);
}

window.addEventListener('resize', () => { if (S) layoutHand(); });
title();
