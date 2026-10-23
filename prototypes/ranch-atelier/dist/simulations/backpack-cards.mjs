// AW-STUDY-0046: decorating the backpack is a card game (Evan, 2026-10-23 16:34Z: "use the card system though instead?
// ... maybe the card system can be used as a decoration mini game ?? you can just click the part of the backpack to
// change then the cards show and you drop into the facet?").
// The cards are Cards v3 faces (cards/v3/face.mjs, the "print" artist's proof: a cream sheet, a printed window, the
// name and an edition line), the same stock as the tile hand, so nothing about the card is forked here. Each card's
// window shows the backpack wearing that choice. Tap a part of the backpack and its hand is dealt; drag a card onto
// the backpack (or tap it) and the choice goes on with a little burst.
//
//   const deck = cardDeck(el, {look: () => currentLook, onDrop(facet, value, x, y) -> true if it landed});
//   deck.show('style' | 'colour' | 'pocket' | 'trim' | 'lining');  deck.dispose();
// Presentation layer: the hand is drawn for the player and is invisible to every perception.
import {renderFace} from '../cards/v3/face.mjs?v=2';
import {STYLES, FACETS, option, styleOf, patternCanvas, accentFor, pocketPath} from './backpack.mjs?v=3';

const styleArt = id => new URL(`./assets/backpack/style-${id}.png`, import.meta.url).href;
const faces = new Map();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// The backpack drawn flat in the card's window, wearing one choice: body, pocket, straps, and (for the lining) open.
function bagArt(l, {open = false} = {}) {
 const W = 360, H = 400, c = Object.assign(document.createElement('canvas'), {width: W, height: H}), g = c.getContext('2d');
 const col = option('colour', l.colour).c, trim = option('trim', l.trim), lin = option('lining', l.lining);
 const cloth = g.createPattern(patternCanvas(col, l.pattern, accentFor(l), styleOf(l.style).cloth), 'repeat');
 const body = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, [r, r, 26, 26]); };
 g.lineJoin = 'round'; g.lineCap = 'round';
 if (open) {
  for (const [y, flip] of [[24, false], [206, true]]) {
   body(60, y, 240, 170, flip ? 26 : 90); g.fillStyle = cloth; g.fill(); g.lineWidth = 6; g.strokeStyle = trim.strap; g.stroke();
   g.save(); g.beginPath(); g.roundRect(84, y + 22, 192, 126, flip ? 16 : 64); g.clip();
   if (lin.rainbow) ['#ff6b6b', '#ffb347', '#ffe066', '#7bd389', '#5fb7ff', '#a98bff'].forEach((cc, i) => { g.fillStyle = cc; g.fillRect(84, y + 22 + i * 21, 192, 22); });
   else { g.fillStyle = lin.c; g.fillRect(84, y + 22, 192, 126); if (lin.stars) { g.fillStyle = '#ffe9a8'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(96 + (i * 47) % 170, y + 34 + (i * 31) % 100, 3, 0, 7); g.fill(); } } }
   g.restore();
  }
  return c.toDataURL();
 }
 g.lineWidth = 16; g.strokeStyle = trim.strap; g.beginPath(); g.arc(180, 70, 46, Math.PI, 0); g.stroke();
 body(60, 66, 240, 310, 110); g.fillStyle = cloth; g.fill();
 g.lineWidth = 5; g.strokeStyle = '#00000030'; g.stroke();
 g.lineWidth = 7; g.strokeStyle = trim.strap; g.beginPath(); g.roundRect(70, 78, 220, 288, [100, 100, 20, 20]); g.stroke();
 for (const x of [92, 268]) { g.fillStyle = trim.strap; g.fillRect(x - 12, 150, 24, 200); g.fillStyle = trim.metal; g.fillRect(x - 16, 270, 32, 22); }
 if (l.pocket !== 'none') { g.save(); g.translate(180, 262); g.scale(4.2, 4.2); g.translate(-12, -12); const p = new Path2D(pocketPath(l.pocket)); g.fillStyle = '#00000022'; g.translate(.6, .8); g.fill(p); g.translate(-.6, -.8); g.fillStyle = cloth; g.fill(p); g.fill(p); g.fillStyle = '#ffffff22'; g.fill(p); g.lineWidth = .9; g.strokeStyle = trim.strap; g.stroke(p); g.restore(); }
 g.fillStyle = trim.metal; g.beginPath(); g.arc(150, 92, 8, 0, 7); g.arc(210, 92, 8, 0, 7); g.fill();
 return c.toDataURL();
}

const tint = (hex, t) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255, m = v => Math.round(v + (243 - v) * t).toString(16).padStart(2, '0'); return '#' + m(r) + m(gg) + m(b); };
function cardsFor(facet, l) {
 if (facet === 'style') return STYLES.map(s => ({facet: 'style', value: s.id, name: s.name, art: styleArt(s.id), colour: option('colour', s.look.colour).c}));
 const fs = facet === 'colour' ? ['colour', 'pattern'] : [facet];
 return fs.flatMap(f => FACETS.find(x => x.id === f).options.map(o => {
  const ll = {...l, [f]: o.id}; return {facet: f, value: o.id, name: o.name, art: bagArt(ll, {open: f === 'lining'}), colour: f === 'lining' ? (o.rainbow ? '#ffb347' : o.c) : option('colour', ll.colour).c, key: JSON.stringify(ll) + f};
 }));
}
async function face(card, n, i) {
 const key = card.facet + '|' + card.value + '|' + (card.key || '');
 if (!faces.has(key)) faces.set(key, renderFace({id: 'backpack', name: card.name, art: card.art, edition: i + 1,
  palette: {air: tint(card.colour, .62), grass: card.colour, earth: card.colour, body: card.colour}}, {style: 'print', dpi: 150}).then(r => r.canvas));
 return faces.get(key);
}

export function cardDeck(el, {look, onDrop}) {
 css();
 const hand = document.createElement('div'); hand.className = 'aw-bp-hand';
 hand.innerHTML = '<span class="aw-bp-hand-name"></span><div class="aw-bp-cards" role="listbox"></div>';
 el.append(hand);
 const row = hand.querySelector('.aw-bp-cards'), label = hand.querySelector('.aw-bp-hand-name');
 let current = null, gen = 0;
 async function show(facet) {
  current = facet; const my = ++gen, l = look(), cards = cardsFor(facet, l);
  label.textContent = {style: 'Styles', colour: 'Colour and pattern', pocket: 'Pockets', trim: 'Straps', lining: 'Lining'}[facet] || '';
  row.innerHTML = '';
  cards.forEach((cd, i) => {
   const b = document.createElement('button'); b.type = 'button'; b.className = 'aw-bp-card'; b.style.setProperty('--i', i); b.setAttribute('aria-label', cd.name);
   const on = cd.facet === 'style' ? l.style === cd.value : l[cd.facet] === cd.value; b.classList.toggle('on', on);
   if (i && cd.facet !== cards[i - 1].facet) b.classList.add('gap');
   row.append(b); wireCard(b, cd);
   face(cd, cards.length, i).then(cv => { if (my !== gen) return; const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; c2.getContext('2d').drawImage(cv, 0, 0); b.append(c2); });
  });
  if (!reduced()) row.animate([{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 320, easing: 'cubic-bezier(.2,1.3,.4,1)'});
 }
 function wireCard(b, cd) {
  let start = null, ghost = null;
  b.addEventListener('pointerdown', e => { start = {x: e.clientX, y: e.clientY, id: e.pointerId}; });
  b.addEventListener('pointermove', e => {
   if (!start || e.pointerId !== start.id) return;
   if (!ghost && Math.abs(e.clientY - start.y) > 10 && Math.abs(e.clientY - start.y) > Math.abs(e.clientX - start.x)) {
    b.setPointerCapture?.(e.pointerId); const r = b.getBoundingClientRect(), cv = b.querySelector('canvas');
    ghost = document.createElement('div'); ghost.className = 'aw-bp-ghost';
    if (cv) { const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; c2.getContext('2d').drawImage(cv, 0, 0); ghost.append(c2); }
    Object.assign(ghost.style, {width: r.width + 'px', height: r.height + 'px'}); ghost._dx = start.x - r.left; ghost._dy = start.y - r.top;
    document.body.append(ghost); b.classList.add('lifted');
   }
   if (ghost) { e.preventDefault(); ghost.style.transform = `translate(${e.clientX - ghost._dx}px,${e.clientY - ghost._dy}px) rotate(${Math.max(-12, Math.min(12, (e.clientX - start.x) / 12))}deg) scale(1.12)`; }
  });
  const end = e => {
   if (!start) return; const s = start; start = null;
   if (!ghost) { if (e.type === 'pointerup' && Math.hypot(e.clientX - s.x, e.clientY - s.y) < 10) land(onDrop(cd.facet, cd.value)); return; }
   const g = ghost; ghost = null; b.classList.remove('lifted');
   const ok = e.type === 'pointerup' && onDrop(cd.facet, cd.value, e.clientX, e.clientY);
   const anim = g.animate(ok ? [{opacity: 1}, {transform: g.style.transform.replace(/scale\([^)]*\)/, 'scale(.15)'), opacity: 0}]
    : [{opacity: 1}, {transform: `translate(${b.getBoundingClientRect().left}px,${b.getBoundingClientRect().top}px)`, opacity: .6}], {duration: ok ? 260 : 300, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'forwards'});
   anim.onfinish = () => g.remove(); land(ok);
  };
  const land = ok => { if (!ok) return; setTimeout(() => show(current), 60); };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
 }
 return {show, get facet() { return current; }, dispose() { gen++; hand.remove(); }};
}

function css() {
 if (document.getElementById('aw-bp-cards-css')) return;
 const s = document.createElement('style'); s.id = 'aw-bp-cards-css';
 s.textContent = `
 .aw-bp-hand{position:absolute;left:0;right:0;bottom:0;z-index:3;display:grid;gap:4px;padding:0 0 calc(6px + env(safe-area-inset-bottom,0px));pointer-events:none}
 .aw-bp-hand-name{justify-self:center;font:700 11px/1 var(--app-font,system-ui);letter-spacing:.08em;text-transform:uppercase;color:#3a2a4a;background:#ffffffc8;padding:5px 10px;border-radius:999px;box-shadow:0 2px 8px #2a103022}
 .aw-bp-cards{display:flex;gap:0;overflow-x:auto;padding:16px 18px 6px;scroll-snap-type:x proximity;pointer-events:auto;scrollbar-width:none;touch-action:pan-x}
 .aw-bp-cards::-webkit-scrollbar{display:none}
 .aw-bp-card{flex:none;width:76px;aspect-ratio:63/88;margin-left:-14px;padding:0;border:0;border-radius:6px;background:#f3eee2;cursor:grab;scroll-snap-align:center;touch-action:none;
  transform:rotate(calc((var(--i) - 2) * .6deg));box-shadow:0 1px 0 #fff8 inset,0 8px 16px -8px #2a103088,0 1px 3px #0003;transition:transform .18s,opacity .18s}
 .aw-bp-card:first-child{margin-left:0}.aw-bp-card.gap{margin-left:10px}
 .aw-bp-card canvas{width:100%;height:100%;display:block;border-radius:6px}
 .aw-bp-card:hover,.aw-bp-card:focus-visible{transform:translateY(-10px);z-index:2}
 .aw-bp-card.on{transform:translateY(-8px);box-shadow:0 0 0 2.5px #f2b632,0 10px 18px -8px #2a103088}
 .aw-bp-card.lifted{opacity:.25}
 .aw-bp-ghost{position:fixed;left:0;top:0;z-index:90;pointer-events:none;border-radius:6px;overflow:hidden;box-shadow:0 22px 34px -12px #2a1030aa}
 .aw-bp-ghost canvas{width:100%;height:100%;display:block}
 @media (prefers-reduced-motion: reduce){.aw-bp-card{transition:none}}`;
 document.head.append(s);
}
