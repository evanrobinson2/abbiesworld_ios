// AW-STUDY-0046: Abbie's notebook. Evan, 23:39Z: "when you open back pack, THATS where you see your notebook, and in
// your notebook is a list of quests (hand written in pencil font on ruled yellow line paper in a fluffy cover ...). let
// her pick her notebook as a facet of her backpack. you can show it under the backpack on the left bar."
//
//   import {openNotebook, closeNotebook, coverCanvas} from '/simulations/notebook.mjs';
//   openNotebook()           the notebook in main focus, open on her quest list
//   coverCanvas(id, w, h)    the fluffy cover, drawn (one of the backpack's 'notebook' facet options)
//
// The quest list is the townsfolk's favours she has taken on (quests.mjs list(), owned by the quests thread: each with
// its steps ticked off as she goes) and the charm quests (backpack.mjs CHARMS). It redraws on 'aw-quests-change'.
// Presentation layer: the notebook is drawn for the player and is invisible to every perception; directors read her
// quests through the quests manifest, never from the DOM.
import {CHARMS, earnedCharms, look, FACETS} from './backpack.mjs?v=11';
import {list as questList} from './quests.mjs';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

// ---------- the fluffy covers ----------
// Faux fur drawn strand by strand over the cover colour, then the face sewn on, then the snap strap with its glitter.
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
function rng(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
const RAINBOW = ['#ff6b8a', '#ffa45c', '#ffe066', '#8be08b', '#6cc4ff', '#b48cff'];

export function coverCanvas(id = look().notebook, w = 300, h = 380) {
 const o = FACETS.find(f => f.id === 'notebook').options.find(x => x.id === id) || FACETS.find(f => f.id === 'notebook').options[0];
 const c = Object.assign(document.createElement('canvas'), {width: w, height: h}), g = c.getContext('2d');
 const r = rng([...o.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)), s = w / 300;
 const pad = 14 * s, bx = pad, by = pad + (/(unicorn|puppy|rainbow-bear|bunny|kitty|teddy)/.test(o.id) ? 34 * s : 0), bw = w - 2 * pad, bh = h - by - pad;
 const body = () => { g.beginPath(); g.roundRect(bx, by, bw, bh, 30 * s); };
 const colourAt = y => o.id === 'rainbow-bear' ? RAINBOW[Math.min(5, Math.max(0, Math.floor((y - by) / bh * 6)))] : o.c;
 // Ears (behind the body), then the body.
 const ears = {unicorn: 'cat', puppy: 'flop', 'rainbow-bear': 'round', bunny: 'cat', kitty: 'cat', teddy: 'round'}[o.id];
 const earCol = o.id === 'rainbow-bear' ? '#8be08b' : o.c;
 if (ears) for (const side of [-1, 1]) {
  const ex = w / 2 + side * bw * .3, ey = by + 6 * s;
  g.fillStyle = earCol; g.beginPath();
  if (ears === 'round') g.arc(ex, ey, 30 * s, 0, 7);
  else if (ears === 'cat') { g.moveTo(ex - 36 * s, ey + 24 * s); g.quadraticCurveTo(ex + side * 10 * s, ey - 112 * s, ex + 36 * s, ey + 24 * s); }
  else { g.ellipse(ex + side * 22 * s, ey + 30 * s, 22 * s, 42 * s, side * .5, 0, 7); }
  g.fill();
  if (ears !== 'flop') { g.fillStyle = shade(o.c === '#f6f2ee' ? '#ffc0d0' : o.c, -.12); g.beginPath(); ears === 'round' ? g.arc(ex, ey, 16 * s, 0, 7) : (g.moveTo(ex - 18 * s, ey + 18 * s), g.quadraticCurveTo(ex + side * 6 * s, ey - 70 * s, ex + 18 * s, ey + 18 * s)); g.fill(); }
 }
 g.save(); body(); g.clip();
 if (o.id === 'rainbow-bear') RAINBOW.forEach((cc, i) => { g.fillStyle = cc; g.fillRect(bx, by + i * bh / 6, bw, bh / 6 + 1); });
 else { g.fillStyle = o.c; g.fillRect(bx, by, bw, bh); }
 g.restore();
 // Fur: thousands of short soft strands, lighter and darker than the cloth, some spilling over the edge.
 g.lineCap = 'round';
 for (let i = 0; i < 5200 * s * s; i++) {
  const x = bx - 6 * s + r() * (bw + 12 * s), y = by - 6 * s + r() * (bh + 12 * s);
  const inside = x > bx + 8 * s && x < bx + bw - 8 * s && y > by + 8 * s && y < by + bh - 8 * s;
  if (!inside && r() < .45) continue;
  const len = (5 + r() * 9) * s, a = Math.PI / 2 + (r() - .5) * 1.6, k = (r() - .5) * .5;
  g.strokeStyle = shade(colourAt(Math.min(by + bh - 1, Math.max(by, y))), k); g.globalAlpha = .28 + r() * .3; g.lineWidth = (1 + r() * 1.6) * s;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
 }
 g.globalAlpha = 1;
 const fx = w / 2, fy = by + bh * .34;
 const eye = (x, y, big) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, y, (big ? 15 : 7) * s, (big ? 17 : 8) * s, 0, 0, 7); g.fill();
  g.fillStyle = big ? '#3d8fe0' : '#1c1c22'; g.beginPath(); g.arc(x, y + 2 * s, (big ? 11 : 6) * s, 0, 7); g.fill();
  g.fillStyle = '#111'; g.beginPath(); g.arc(x, y + 2 * s, (big ? 6 : 4) * s, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 3 * s, y - 2 * s, (big ? 4 : 2) * s, 0, 7); g.fill(); };
 const cheeks = () => { g.fillStyle = '#ff7fa0aa'; for (const d of [-1, 1]) { g.beginPath(); g.ellipse(fx + d * 46 * s, fy + 22 * s, 11 * s, 7 * s, 0, 0, 7); g.fill(); } };
 const muzzle = () => { g.fillStyle = '#fffaf4'; g.beginPath(); g.ellipse(fx, fy + 20 * s, 34 * s, 26 * s, 0, 0, 7); g.fill(); g.fillStyle = '#2a1a1a'; g.beginPath(); g.ellipse(fx, fy + 10 * s, 9 * s, 7 * s, 0, 0, 7); g.fill();
  g.strokeStyle = '#2a1a1a'; g.lineWidth = 2.4 * s; g.beginPath(); g.moveTo(fx, fy + 16 * s); g.lineTo(fx, fy + 24 * s); g.arc(fx - 7 * s, fy + 24 * s, 7 * s, 0, Math.PI * .9); g.moveTo(fx, fy + 24 * s); g.arc(fx + 7 * s, fy + 24 * s, 7 * s, Math.PI, Math.PI * .1, true); g.stroke(); };
 g.lineCap = 'round';
 if (o.id === 'strawberry') {
  // Heart sunglasses and a green leaf crown.
  g.fillStyle = '#58c34a'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(fx + i * 15 * s, by + 34 * s, 9 * s, 24 * s, i * .35, 0, 7); g.fill(); }
  for (const d of [-1, 1]) { const x = fx + d * 34 * s, y = fy + 4 * s; g.fillStyle = '#7fd3ff'; g.beginPath(); g.moveTo(x, y + 22 * s); g.bezierCurveTo(x - 40 * s, y - 2 * s, x - 18 * s, y - 30 * s, x, y - 10 * s); g.bezierCurveTo(x + 18 * s, y - 30 * s, x + 40 * s, y - 2 * s, x, y + 22 * s); g.fill();
   g.fillStyle = '#1c1c22'; g.beginPath(); g.moveTo(x, y + 16 * s); g.bezierCurveTo(x - 30 * s, y - 2 * s, x - 14 * s, y - 22 * s, x, y - 6 * s); g.bezierCurveTo(x + 14 * s, y - 22 * s, x + 30 * s, y - 2 * s, x, y + 16 * s); g.fill(); }
  g.strokeStyle = '#1c1c22'; g.lineWidth = 3 * s; g.beginPath(); g.arc(fx, fy + 38 * s, 12 * s, .2, Math.PI - .2); g.stroke();
 } else if (o.id === 'unicorn') {
  g.fillStyle = '#d9dde4'; g.beginPath(); g.moveTo(fx - 13 * s, by + 8 * s); g.lineTo(fx, by - 46 * s); g.lineTo(fx + 13 * s, by + 8 * s); g.fill();
  g.strokeStyle = '#ffffffaa'; g.lineWidth = 2 * s; for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(fx - 12 * s + i * 2 * s, by + 4 * s - i * 11 * s); g.lineTo(fx + 12 * s - i * 2 * s, by - 2 * s - i * 11 * s); g.stroke(); }
  ['#ff6b8a', '#ffa45c', '#6cc4ff'].forEach((cc, i) => { g.strokeStyle = cc; g.lineWidth = 9 * s; g.beginPath(); g.arc(fx + 10 * s, by + 24 * s, (26 + i * 9) * s, Math.PI * 1.05, Math.PI * 1.6); g.stroke(); });
  eye(fx - 34 * s, fy, true); eye(fx + 34 * s, fy, true); cheeks();
  g.fillStyle = '#ff5d7a'; g.beginPath(); g.moveTo(fx, fy + 30 * s); g.lineTo(fx - 6 * s, fy + 22 * s); g.lineTo(fx + 6 * s, fy + 22 * s); g.fill();
 } else if (o.id === 'kitty') {
  eye(fx - 34 * s, fy, true); eye(fx + 34 * s, fy, true);
  ['#ff6b8a', '#ffe066', '#6cc4ff'].forEach((cc, i) => { g.fillStyle = cc; g.beginPath(); g.arc(fx + (i - 1) * 14 * s, by + 30 * s, 5 * s, 0, 7); g.fill(); });
  g.fillStyle = '#ff7fa0'; g.beginPath(); g.moveTo(fx, fy + 30 * s); g.lineTo(fx - 6 * s, fy + 23 * s); g.lineTo(fx + 6 * s, fy + 23 * s); g.fill();
  g.strokeStyle = '#2a1a1a'; g.lineWidth = 2 * s; g.beginPath(); g.arc(fx - 6 * s, fy + 32 * s, 6 * s, 0, Math.PI * .9); g.moveTo(fx + 12 * s, fy + 32 * s); g.arc(fx + 6 * s, fy + 32 * s, 6 * s, 0, Math.PI * .9); g.stroke();
 } else if (o.id === 'bunny') {
  // A winking face: one eye open, one a happy arc, the tongue out.
  g.fillStyle = '#fffaf4'; g.beginPath(); g.ellipse(fx, fy + 12 * s, 66 * s, 40 * s, 0, 0, 7); g.fill();
  eye(fx - 26 * s, fy + 4 * s, false); g.strokeStyle = '#1c1c22'; g.lineWidth = 3.4 * s; g.beginPath(); g.arc(fx + 26 * s, fy + 8 * s, 8 * s, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  g.fillStyle = '#ff5d7a'; g.beginPath(); g.arc(fx, fy + 24 * s, 9 * s, 0, Math.PI); g.fill(); cheeks();
 } else {
  // The bears and the puppy: a muzzle, small eyes, cheeks; the puppy has a tongue, the rainbow bear a crown.
  if (o.id !== 'puppy') muzzle(); else { g.fillStyle = '#fffaf4'; g.beginPath(); g.ellipse(fx, fy + 18 * s, 30 * s, 24 * s, 0, 0, 7); g.fill(); g.fillStyle = '#2a1a1a'; g.beginPath(); g.ellipse(fx, fy + 8 * s, 8 * s, 6 * s, 0, 0, 7); g.fill(); g.fillStyle = '#ff6b8a'; g.beginPath(); g.ellipse(fx, fy + 32 * s, 7 * s, 10 * s, 0, 0, 7); g.fill(); }
  eye(fx - 40 * s, fy - 6 * s, false); eye(fx + 40 * s, fy - 6 * s, false); cheeks();
  if (o.id === 'rainbow-bear') { g.fillStyle = '#e8ebf2'; g.strokeStyle = '#b8bfcc'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(fx - 26 * s, by + 18 * s); g.lineTo(fx - 26 * s, by - 6 * s); g.lineTo(fx - 13 * s, by + 6 * s); g.lineTo(fx, by - 14 * s); g.lineTo(fx + 13 * s, by + 6 * s); g.lineTo(fx + 26 * s, by - 6 * s); g.lineTo(fx + 26 * s, by + 18 * s); g.closePath(); g.fill(); g.stroke();
   for (const [x, cc] of [[-13, '#ff6b8a'], [0, '#6cc4ff'], [13, '#ff6b8a']]) { g.fillStyle = cc; g.beginPath(); g.arc(fx + x * s, by + 10 * s, 3.4 * s, 0, 7); g.fill(); } }
  if (o.id === 'teddy') { g.strokeStyle = '#ffffffcc'; g.lineWidth = 1.4 * s; for (let x = bx + 10 * s; x < bx + bw - 10 * s; x += 9 * s) { g.beginPath(); g.arc(x, by + bh - 70 * s, 5 * s, 0, Math.PI); g.stroke(); } }
 }
 // The snap strap: a glittery band round the edge with a button.
 const sy = by + bh * .74, sx = bx + bw * .42;
 g.fillStyle = o.id === 'unicorn' || o.id === 'puppy' ? '#c9ced8' : '#ff86b0'; g.beginPath(); g.roundRect(sx, sy, bx + bw - sx + 4 * s, 34 * s, 8 * s); g.fill();
 for (let i = 0; i < 160 * s; i++) { g.fillStyle = r() < .5 ? '#ffffffcc' : '#ffffff55'; g.fillRect(sx + r() * (bx + bw - sx), sy + r() * 34 * s, 1.6 * s, 1.6 * s); }
 g.fillStyle = shade(o.c, -.25); g.beginPath(); g.arc(sx + 26 * s, sy + 17 * s, 11 * s, 0, 7); g.fill(); g.fillStyle = '#ffffff66'; g.beginPath(); g.arc(sx + 23 * s, sy + 14 * s, 4 * s, 0, 7); g.fill();
 return c;
}

// ---------- the notebook in main focus ----------
let nb = null;
export function isNotebookOpen() { return !!nb && !nb.hidden; }
export function closeNotebook() { if (!nb || nb.hidden) return; nb.classList.remove('in'); document.documentElement.classList.remove('aw-nb-out'); setTimeout(() => { if (nb && !nb.classList.contains('in')) nb.hidden = true; }, 260); }
export function openNotebook() {
 css();
 if (!nb) {
  nb = Object.assign(document.createElement('div'), {className: 'aw-nb'}); nb.setAttribute('role', 'dialog'); nb.setAttribute('aria-label', "Abbie's notebook");
  nb.innerHTML = '<div class="aw-nb-cover"></div><div class="aw-nb-page"></div>';
  document.body.append(nb);
  addEventListener('aw-quests-change', () => isNotebookOpen() && draw());
  addEventListener('aw-backpack-change', () => isNotebookOpen() && draw());
  addEventListener('aw-inventory-change', () => isNotebookOpen() && draw());
  addEventListener('pointerdown', e => { if (isNotebookOpen() && !e.target.closest?.('.aw-nb,.aw-left-nb')) closeNotebook(); }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape') closeNotebook(); });
 }
 draw(); nb.hidden = false; void nb.offsetWidth; nb.classList.add('in'); document.documentElement.classList.add('aw-nb-out');
}
// The quest book (Evan, 2026-10-24: the one long checklist was "sprawling and disorganized"). Four short groups, open things
// first: Favours (townsfolk asks, next step first), Adventures (charms still to earn), Gifts (what people have given her,
// read from the same backpack so the book and the bag always agree), and Done folded away under a count. The header shows
// how far she is. Pure so it can be tested: draw() only puts the html on the page.
export function bookModel({favours = [], charms = [], have = new Set(), gifts = []} = {}) {
 const adventures = charms.filter(c => c.quest).map(c => ({t: c.quest, icon: c.icon, done: have.has(c.id)}));
 const openFavours = favours.filter(q => q.status !== 'done'), doneFavours = favours.filter(q => q.status === 'done');
 const doneAdv = adventures.filter(c => c.done), openAdv = adventures.filter(c => !c.done);
 const total = favours.length + adventures.length, done = doneFavours.length + doneAdv.length;
 return {total, done, openFavours, doneFavours, openAdv, doneAdv, gifts: gifts.filter(g => g.from)};
}
function draw() {
 const cover = nb.querySelector('.aw-nb-cover'); cover.innerHTML = ''; cover.append(coverCanvas(look().notebook, 300, 380));
 let favours = [], gifts = []; try { favours = questList(); } catch {}
 try { gifts = (window.AbbieInventory?.list?.() ?? JSON.parse(localStorage.getItem('aw-inventory') || '[]')) || []; } catch {}
 const m = bookModel({favours, charms: CHARMS, have: new Set(earnedCharms()), gifts});
 const who = n => esc(n.replace(/^The /, 'the ').replace(/^A /, 'a '));
 const li = (t, done, sub = '') => `<li class="${done ? 'done' : ''}"><i>${done ? '✓' : ''}</i><span>${esc(t)}${sub}</span></li>`;
 const group = (title, rows, extra = '') => rows.length ? `<h3>${title}</h3><ul${extra}>${rows.join('')}</ul>` : '';
 const favourRows = m.openFavours.map(q => { const next = q.steps.find(st => !st.done), n = q.steps.filter(st => st.done).length;
  return li(next?.say || q.ask, false, ` <small>for ${who(q.giverName)}${q.steps.length > 1 ? ` · ${n} of ${q.steps.length}` : ''}${q.item?.carrying ? ` · carrying ${esc(q.item.icon)} ${esc(q.item.name.toLowerCase())}` : ''}</small>`); });
 const giftRows = m.gifts.slice().reverse().map(g => `<li class="gift"><i>${esc(g.icon && !/^(\/|https?:|data:|\.)/.test(g.icon) ? g.icon : '✦')}</i><span>${esc(g.name)} <small>from ${who(g.from)}</small></span></li>`);
 const doneRows = [...m.doneFavours.map(q => li(`Helped ${who(q.giverName)}`, true)), ...m.doneAdv.map(c => li(c.t, true))];
 nb.querySelector('.aw-nb-page').innerHTML = `<h2>My quests</h2>${m.total ? `<div class="prog" aria-label="${m.done} of ${m.total} done"><b style="width:${Math.round(m.done / m.total * 100)}%"></b><em>${m.done} / ${m.total}</em></div>` : ''}` +
  group('Favours', favourRows) + group('Adventures', m.openAdv.map(c => li(c.t, false))) + group('Gifts', giftRows) +
  (doneRows.length ? `<details class="fin"><summary>Done <small>${doneRows.length}</small></summary><ul>${doneRows.join('')}</ul></details>` : '') +
  (!favourRows.length && !m.openAdv.length && !giftRows.length && !doneRows.length ? '<p class="none">Nothing yet. Say hello to someone in town.</p>' : '');
}

function css() {
 if (document.getElementById('aw-nb-css')) return;
 const s = document.createElement('style'); s.id = 'aw-nb-css';
 const font = new URL('../fonts/patrick-hand-latin.woff2', import.meta.url).href;
 s.textContent = `
 @font-face{font-family:"AW Pencil";src:url(${font}) format("woff2");font-display:swap}
 .aw-nb{position:fixed;z-index:72;left:50%;top:50%;width:min(560px,94vw);height:min(560px,80vh);display:grid;grid-template-columns:minmax(0,38%) 1fr;transform:translate(-50%,-46%) scale(.92) rotate(-1deg);opacity:0;transition:.28s cubic-bezier(.2,1.3,.4,1);filter:drop-shadow(0 24px 30px #2a103055)}
 .aw-nb.in{opacity:1;transform:translate(-50%,-50%) rotate(-1deg)}
 .aw-nb[hidden]{display:none}
 .aw-nb-cover{position:relative;align-self:center}.aw-nb-cover canvas{width:100%;height:auto;display:block}
 .aw-nb-page{position:relative;margin-left:-6%;padding:32px 20px 32px 46px;overflow:auto;border-radius:4px 14px 14px 4px;color:#4a4a55;
  font-family:"AW Pencil","Bradley Hand","Segoe Print",cursive;background:linear-gradient(90deg,transparent 34px,#ef8f8f 34px 36px,transparent 36px),repeating-linear-gradient(#fff3a6 0 31px,#9fc3e8 31px 32px);
  box-shadow:inset 10px 0 16px -8px #0003,0 2px 0 #e8d98a}
 .aw-nb-page::before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(#0000000a 1px,transparent 1.4px) 0 0/5px 5px;mix-blend-mode:multiply}
 .aw-nb-page h2{margin:0 0 0;font:400 30px/32px "AW Pencil",cursive;letter-spacing:.02em;color:#3d3d48}
 .aw-nb-page ul{list-style:none;margin:0;padding:0}
 .aw-nb-page li{display:flex;gap:10px;align-items:flex-start;min-height:32px;font-size:21px;line-height:32px;text-shadow:0 0 .6px #4a4a55}
 .aw-nb-page li i{flex:none;width:18px;height:18px;margin-top:7px;border:2px solid #5a5a66;border-radius:3px 5px 3px 4px;transform:rotate(-3deg);font:400 22px/14px "AW Pencil",cursive;color:#3c8f4e;text-indent:1px}
 .aw-nb-page li.done span{text-decoration:line-through;text-decoration-thickness:1.5px;opacity:.6}
 .aw-nb-page h3{margin:14px 0 0;font:400 22px/30px "AW Pencil",cursive;color:#7a5a8a;text-decoration:underline wavy #b48cff88;text-underline-offset:5px}
 .aw-nb-page .prog{position:relative;height:14px;margin:6px 0 2px;border:2px solid #5a5a66;border-radius:8px 6px 8px 5px;background:#fff8}.aw-nb-page .prog b{position:absolute;inset:0 auto 0 0;background:#8be08b;border-radius:5px}.aw-nb-page .prog em{position:absolute;right:6px;top:-3px;font:400 15px/18px "AW Pencil",cursive;font-style:normal}
 .aw-nb-page li.gift i{border:0;transform:none;font:400 20px/26px system-ui,sans-serif;margin-top:3px}
 .aw-nb-page details.fin summary{cursor:pointer;margin-top:14px;font-size:21px;line-height:32px;list-style:none}.aw-nb-page details.fin summary::before{content:"▸ "}.aw-nb-page details.fin[open] summary::before{content:"▾ "}
 .aw-nb-page .none{font-size:21px;line-height:32px;opacity:.7}
 .aw-nb-page small{font-size:16px;opacity:.75}
 .aw-nb-page li.step{padding-left:28px;font-size:18px}.aw-nb-page li.step i{width:14px;height:14px;margin-top:9px;font-size:18px}
 @media (max-width:520px){.aw-nb{grid-template-columns:1fr;grid-template-rows:auto 1fr;height:min(640px,84vh)}.aw-nb-cover{width:34%;justify-self:center;margin-bottom:-8%;z-index:1;transform:rotate(-4deg)}.aw-nb-page{margin-left:0}}
 @media (prefers-reduced-motion: reduce){.aw-nb{transition:none}}`;
 document.head.append(s);
}
