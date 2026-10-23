// AW-STUDY-0025 Tile pull and print (docs/oracle/tile-print/TILE_PRINT_STUDY.md). Evan, 2026-10-23: "pull the MODEL
// from the CARD and drop the model onto the board ... the card's blank! ... drop here to customize ... the model will
// shrink then expand into a proper interface for customizing the tile", and a customized tile "print[s] the tile in a
// slow animation window that actually finishes with a print animation".
// Everything here is presentation layer: the card, its blank, the customizer and the print window are drawn for the
// player and are invisible to every perception. Only the landed tile enters the world (tile-chooser.mjs, lab.mjs).
import {uiIcon} from './ui-icons.mjs?v=4';
import {PLACES} from '../cards/v3/face.mjs';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const tri = x => { const f = x - Math.floor(x); return 4 * Math.abs(f - .5) - 1; };
const beamX = (head, t, k) => head.style.setProperty('--bx', (50 + 42 * tri(t * 2.6 + k * .37)).toFixed(1) + '%');
const make = (tag, cls, html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const PRINT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></svg>';

// The blank card: the same die line as the face, plain stock, and one facet that means "drop here to customize".
// Drawn from the face canvas's own alpha, so a die-cut card stays die-cut and the card art is never touched.
export function blankCard(hero, on) {
 hero.classList.toggle('tp-pulled', on);
 if (!on) { hero.querySelector('.tp-blank')?.remove(); return; }
 const face = hero.querySelector('.v2-face'); if (!face || hero.querySelector('.tp-blank')) return;
 const c = document.createElement('canvas'); c.width = face.width; c.height = face.height; c.className = 'tp-blank'; c.setAttribute('aria-hidden', 'true');
 const x = c.getContext('2d'), w = c.width, h = c.height;
 x.drawImage(face, 0, 0); x.globalCompositeOperation = 'source-in';
 const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#fbf7ee'); g.addColorStop(1, '#ece4d3'); x.fillStyle = g; x.fillRect(0, 0, w, h);
 x.globalCompositeOperation = 'source-over';
 const r = w * .2, cx = w / 2, cy = h * .46, s = w / 240;
 x.setLineDash([9 * s, 7 * s]); x.lineWidth = 4 * s; x.strokeStyle = '#a69a83'; x.beginPath();
 for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
 x.closePath(); x.stroke(); x.setLineDash([]); x.lineWidth = 6 * s; x.lineCap = 'round';
 x.beginPath(); x.moveTo(cx - r * .38, cy); x.lineTo(cx + r * .38, cy); x.moveTo(cx, cy - r * .38); x.lineTo(cx, cy + r * .38); x.stroke();
 hero.append(c);
}
export function aimAtCard(hero, on) { hero?.classList.toggle('tp-aim', !!on); }
// The card fills again after its tile has landed: the art rises back into the stock.
export function refillCard(hero) { blankCard(hero, false); if (reduced()) return; hero.classList.remove('tp-refill'); void hero.offsetWidth; hero.classList.add('tp-refill'); setTimeout(() => hero.classList.remove('tp-refill'), 700); }

// Where a card-sized panel sits: above the hand, centred, the shape of a card grown up.
function cardFrame() {
 const w = Math.min(340, innerWidth - 32), h = Math.min(Math.round(w * 88 / 63), innerHeight - 190);
 return {w, h, left: Math.round((innerWidth - w) / 2), top: Math.max(12, Math.round(innerHeight - h - 170))};
}
function fly(el, from, to, frames) {
 if (reduced() || !from) return Promise.resolve();
 const dx = from.left + from.width / 2 - (to.left + to.w / 2), dy = from.top + from.height / 2 - (to.top + to.h / 2), s = Math.max(.12, from.width / to.w);
 const start = `translate(${dx}px,${dy}px) scale(${s.toFixed(3)})`;
 return el.animate(frames === 'in' ? [{transform: start, opacity: .4}, {transform: 'none', opacity: 1}] : [{transform: 'none', opacity: 1}, {transform: start, opacity: 0}],
  {duration: frames === 'in' ? 380 : 320, easing: frames === 'in' ? 'cubic-bezier(.2,1.25,.4,1)' : 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards'}).finished.catch(() => {});
}

// The tile's own customizer, grown out of its card. Settings are a draft until Print: nothing re-simulates before then.
// facets: [{value,label}] (the kinds this card can be), axes: placementAxes(type) for the current kind.
// Evan, 08:45Z: customize "needs to FLIP THE CARD and show the custom mechanics at play on a simulated tile that is
// constantly 'printing'". The card turns over; its back holds the live tile, swept by a print head over and over.
export function openCustomizer({hero, place, name, preview, canvas, facets, facet, axesFor, values, onPrint, onClose}) {
 let draft = {facet, values: {...values}}, closed = false;
 const frame = cardFrame(), from = hero?.getBoundingClientRect();
 const root = make('section', 'tp-card tp-custom'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', name + ': make it yours');
 // The card's own stock (cards/v3 face.mjs): its body colour behind the live hex, its earth band under the name.
 const P = PLACES[place] || PLACES.ranch; root.style.setProperty('--body', P.body); root.style.setProperty('--earth', P.earth); root.style.setProperty('--deep', P.deep); root.style.setProperty('--grass', P.grass);
 Object.assign(root.style, {left: frame.left + 'px', top: frame.top + 'px', width: frame.w + 'px', height: frame.h + 'px'});
 const plate = make('div', 'tp-plate'), sweep = make('div', 'tp-head tp-loop', '<i></i>'); if (canvas) plate.append(canvas); plate.append(sweep);
 const title = make('h2', 'tp-name'); title.textContent = name; const band = make('div', 'tp-band'); band.append(title); const no = make('span', 'tp-no'); no.textContent = String(P.no || 1).padStart(2, '0') + ' / 04'; band.append(no, make('b', 'tp-mark', 'AW'));
 const close = make('button', 'tp-close', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>'); close.type = 'button'; close.setAttribute('aria-label', 'Put it back');
 const kinds = make('div', 'tp-kinds'), dials = make('div', 'tp-dials');
 const print = make('button', 'tp-print', PRINT_ICON + '<span>Accept</span>'); print.type = 'button';
 const desk = make('div', 'tp-desk'); desk.append(kinds, dials, print); root.append(plate, close, band, desk); document.body.append(root);

 function renderKinds() {
  kinds.replaceChildren(); kinds.hidden = facets.length < 2;
  for (const f of facets) {
   const b = make('button', 'tp-kind'); b.type = 'button'; b.textContent = f.label; b.setAttribute('aria-pressed', String(f.value === draft.facet));
   b.onclick = () => { draft.facet = f.value; renderKinds(); renderDials(); };
   kinds.append(b);
  }
 }
 function renderDials() {
  dials.replaceChildren();
  for (const a of axesFor(draft.facet)) {
   const row = make('div', 'tp-dial'); row.setAttribute('role', 'group'); row.setAttribute('aria-label', a.label); row.title = a.label;
   row.append(make('span', 'tp-end', uiIcon(a.icons[0])));
   const pips = make('div', 'tp-pips'), v = Number(draft.values[a.key] ?? a.min);
   for (let n = a.min; n <= a.max; n++) {
    const p = make('button', 'tp-pip'); p.type = 'button'; p.setAttribute('aria-label', a.label + ' ' + n); p.setAttribute('aria-pressed', String(n === v)); p.dataset.on = String(n <= v);
    p.onclick = () => { draft.values[a.key] = n; renderDials(); };
    pips.append(p);
   }
   row.append(pips, make('span', 'tp-end', uiIcon(a.icons[1]))); dials.append(row);
  }
 }
 renderKinds(); renderDials();
 requestAnimationFrame(() => root.classList.add('in'));
 if (!reduced() && from) { const dx = from.left + from.width / 2 - (frame.left + frame.w / 2), dy = from.top + from.height / 2 - (frame.top + frame.h / 2), k = Math.max(.12, from.width / frame.w);
  root.animate([{transform: `perspective(900px) translate(${dx}px,${dy}px) scale(${k.toFixed(3)}) rotateY(180deg)`, opacity: .6}, {transform: 'perspective(900px) translate(0,0) scale(1) rotateY(0)', opacity: 1}], {duration: 560, easing: 'cubic-bezier(.2,1.1,.35,1)'}); }
 // The tile on the card's back keeps printing: the cut line climbs, the head rides it, and it starts again.
 const t0 = performance.now(); let loop = 0;
 const run = now => { if (closed) return; const t = ((now - t0) / 2600) % 1, u = Math.min(1, t / .82); if (canvas) preview?.reveal?.(t < .82 ? u : 1); sweep.style.setProperty('--y', ((1 - u) * 100).toFixed(1) + '%'); sweep.style.opacity = t < .82 ? 1 : 0; loop = requestAnimationFrame(run); };
 if (!reduced()) loop = requestAnimationFrame(run);

 async function finish(printing) {
  if (closed) return; closed = true; cancelAnimationFrame(loop); preview?.reveal?.(1); removeEventListener('pointerdown', outside, true); removeEventListener('keydown', key);
  if (printing) { root.remove(); return; }
  await fly(root, hero?.getBoundingClientRect(), frame, 'out'); root.remove(); onClose?.();
 }
 const outside = e => { if (!root.contains(e.target)) finish(false); };
 const key = e => { if (e.key === 'Escape') finish(false); };
 setTimeout(() => { if (!closed) { addEventListener('pointerdown', outside, true); addEventListener('keydown', key); } }, 300);
 close.onclick = () => finish(false);
 print.onclick = () => { let still = null; try { if (canvas) { still = document.createElement('canvas'); still.width = canvas.width; still.height = canvas.height; still.getContext('2d').drawImage(canvas, 0, 0); } } catch { still = null; }
  const d = {facet: draft.facet, values: {...draft.values}, frame: root.getBoundingClientRect(), still}; finish(true); onPrint(d); };
 return {get open() { return !closed; }, close: () => finish(false), plate};
}

// The print window: the same card, now a little printer. While the tile is really being made the head sweeps an
// empty bed; when it is ready, the head lays it down layer by layer (a clipping plane on the live preview), and the
// card is stamped. Slow on purpose (Evan: "a slow animation window"), never shorter than about four seconds.
export function openPrintWindow({name, at, still}) {
 const frame = cardFrame(), root = make('section', 'tp-card tp-printer'); root.setAttribute('role', 'status'); root.setAttribute('aria-label', 'Printing ' + name);
 Object.assign(root.style, {left: frame.left + 'px', top: frame.top + 'px', width: frame.w + 'px', height: frame.h + 'px'});
 if (at) Object.assign(root.style, {left: at.left + 'px', top: at.top + 'px', width: at.width + 'px', height: at.height + 'px'});
 const bed = make('div', 'tp-bed'), head = make('div', 'tp-head', '<b class="tp-hot"></b><i></i><u class="tp-beam"></u><u class="tp-spot"></u><s></s><s></s><s></s><s></s>'), stamp = make('div', 'tp-stamp', '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" pathLength="1" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M21 33l7 7 15-16" pathLength="1" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>');
 const title = make('h2', 'tp-name'); title.textContent = name;
 bed.append(head); root.append(bed, title, stamp); document.body.append(root);
 // While the new tile is really being made, the old one keeps printing in the bed (Evan: "constantly 'printing' once
 // accept is selected, then the final touches are made"); the new tile replaces it only once it is ready to play.
 let ghostLoop = 0; if (still) { still.className = 'tp-still'; bed.prepend(still); const s0 = performance.now();
  const run = now => { const t = ((now - s0) / 1800) % 1; still.style.clipPath = `inset(${((1 - t) * 100).toFixed(1)}% 0 0 0)`; head.style.setProperty('--y', ((1 - t) * 100).toFixed(1) + '%'); beamX(head, now / 1000, 0); ghostLoop = requestAnimationFrame(run); };
  if (!reduced()) ghostLoop = requestAnimationFrame(run); }
 requestAnimationFrame(() => root.classList.add('in', 'warming'));
 const sound = printSound();
 return {
  root,
  // Lay the tile down: t from 0 to 1 over `ms`, the head riding the cut line.
  async reveal(preview, canvas, ms = 900) {
   cancelAnimationFrame(ghostLoop); bed.querySelector('.tp-still')?.remove(); root.classList.remove('warming'); bed.prepend(canvas);
   const t0 = performance.now(), dur = reduced() ? 0 : ms; let lastLayer = -1;
   await new Promise(resolve => {
    const step = now => {
     const t = dur ? Math.min(1, (now - t0) / dur) : 1, eased = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
     preview.reveal?.(eased); head.style.setProperty('--y', (1 - eased) * 100 + '%'); beamX(head, now / 1000, Math.floor(eased * 40));
     const layer = Math.floor(eased * 14); if (layer !== lastLayer) { lastLayer = layer; sound.layer(layer); }
     if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
   });
   preview.reveal?.(1);
  },
  async stamp() {
   root.classList.add('done'); sound.stamp();
   await new Promise(r => setTimeout(r, reduced() ? 0 : 640));
  },
  async close(hero) {
   await fly(root, hero?.getBoundingClientRect(), frame, 'out'); root.remove(); sound.dispose();
  },
  fail(message) { cancelAnimationFrame(ghostLoop); root.classList.remove('warming'); root.classList.add('failed'); title.textContent = message; setTimeout(() => { root.remove(); sound.dispose(); }, 2600); }
 };
}

// The printer's voice: a short paper-feed tick per layer and an ink-stamp thump. Synthesised, so it works offline; it
// only ever starts from the Print press (a user gesture).
function printSound() {
 let ctx = null;
 try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
 const noise = (dur, freq, gain) => {
  if (!ctx) return; const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2.5; g.gain.value = gain;
  src.connect(f).connect(g).connect(ctx.destination); src.start();
 };
 return {
  layer(i) { noise(.05, 1800 + (i % 3) * 400, .12); },
  stamp() {
   if (!ctx) return; const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
   o.type = 'triangle'; o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(1320, t + .12); g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + .3);
   o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + .32); noise(.05, 3200, .08);
  },
  dispose() { setTimeout(() => ctx?.close().catch(() => {}), 600); }
 };
}

export function installTilePullStyle() {
 if (document.getElementById('tile-pull-style')) return;
 const s = document.createElement('style'); s.id = 'tile-pull-style'; s.textContent = `
html.ui-v2:not(#v2a):not(#v2b):not(#v2c) body #v2-hand .generator-hero.v2-faced>.tp-blank.tp-blank{display:block!important;position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}
#v2-hand .generator-hero.tp-pulled .v2-face{visibility:hidden}
/* Evan, 08:50Z: "first one should not be selected by default. none are." The chooser still remembers the last card it
   prepared, but no card in the hand looks picked. */
html.ui-v2:not(#v2a):not(#v2b):not(#v2c) body #v2-hand .generator-hero.v2-faced[aria-pressed=true]:not(:hover):not(.tp-aim){--lift:0px;box-shadow:none!important;filter:drop-shadow(0 10px 12px #2b1d0e40)!important}
/* Evan, 08:54Z, "this shouldn't happen": a focus ring drawn round the card's whole box (headroom included), doubled by
   the pressed glow, framed the Ranch card. A card in the hand shows focus by lifting, never with a frame. */
html.ui-v2:not(#v2a):not(#v2b):not(#v2c) body.simulation-workspace #v2-hand .generator-hero.generator-hero:focus{outline:none!important}
html.ui-v2:not(#v2a):not(#v2b):not(#v2c) body.simulation-workspace #v2-hand .generator-hero.generator-hero:focus-visible{--lift:-14px}
#v2-hand .generator-hero.tp-aim{--lift:-24px;z-index:4}
#v2-hand .generator-hero.tp-aim .tp-blank{filter:drop-shadow(0 0 10px #ffd36b) brightness(1.04)}
#v2-hand .generator-hero.tp-refill .v2-face{animation:tp-refill .6s cubic-bezier(.2,1.3,.4,1)}
@keyframes tp-refill{from{transform:translateY(40%) scale(.9);opacity:0}to{transform:none;opacity:1}}
#scene-drag-ghost.tp-home{filter:drop-shadow(0 0 14px #ffd36bcc) drop-shadow(0 12px 10px #30251644)}
#scene-drag-ghost .tp-proxy{display:block;width:46%;margin:0 auto;border-radius:6px;box-shadow:0 10px 20px #30251640}
.tp-card{position:fixed;z-index:10001;box-sizing:border-box;display:grid;grid-template-rows:minmax(0,1fr) auto auto auto auto;gap:12px;padding:14px 16px 16px;border-radius:22px;color:var(--app-ink,#2b1d0e);
 background:linear-gradient(160deg,#fffffff0,#fff8ead8 46%,#f3e9d4e6);box-shadow:inset 0 1px 0 #fff,inset 0 -3px 6px #0b1a2a1c,inset 0 0 0 .5px #ffffffaa,0 2px 3px #0000001f,0 24px 44px -12px #0c20305c;
 font:600 13px var(--app-font,system-ui,sans-serif);transform-origin:50% 100%}
.tp-plate,.tp-bed{position:relative;min-height:0;width:100%;aspect-ratio:16/9;align-self:center;border-radius:14px;overflow:hidden;background:radial-gradient(120% 90% at 50% 30%,#fdfaf2,#e9e0cc);box-shadow:inset 0 2px 6px #3a2a1426}
.tp-plate canvas,.tp-bed canvas{position:absolute;inset:0;width:100%!important;height:100%!important;border-radius:0!important}
.tp-custom{backface-visibility:hidden}
.tp-name{margin:0;font:800 20px/1.1 var(--app-display,var(--app-font,system-ui));text-align:center;letter-spacing:.01em}
.tp-close{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:50%;border:0;display:grid;place-items:center;color:inherit;background:linear-gradient(160deg,#ffffffe6,#ffffff80);box-shadow:inset 0 1px 0 #fff,0 2px 6px #2a201426;z-index:2}
.tp-close svg{width:16px;height:16px}
.tp-kinds{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
.tp-kind{border:0;border-radius:10px;padding:8px 11px;font:inherit;color:inherit;background:linear-gradient(160deg,#ffffffd0,#ffffff60);box-shadow:inset 0 1px 0 #fff,0 2px 5px #2a201418}
.tp-kind[aria-pressed=true]{color:#fff;background:linear-gradient(160deg,#ffffff50,transparent),var(--v2-accent,#b64932);box-shadow:inset 0 1px 0 #ffffff90,0 3px 8px #b6493255}
.tp-dials{display:grid;gap:8px}
.tp-dial{display:grid;grid-template-columns:22px 1fr 22px;align-items:center;gap:8px}
.tp-end svg{width:20px;height:20px;opacity:.75}
.tp-pips{display:flex;justify-content:space-between;gap:4px}
.tp-pip{flex:1;height:26px;border:0;padding:0;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);background:#d9cfbb;transition:background .15s,transform .15s}
.tp-pip[data-on=true]{background:color-mix(in srgb,var(--v2-accent,#b64932) 75%,#e2a72e)}
.tp-pip[aria-pressed=true]{transform:scale(1.12)}
.tp-print{display:flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:16px;padding:12px 16px;font:800 16px var(--app-font,system-ui);color:#fff;background:linear-gradient(160deg,#ffffff55,transparent 60%),#2f6fb0;box-shadow:inset 0 1px 0 #ffffffa0,inset 0 -3px 5px #0b1a2a40,0 6px 14px #2f6fb055}
.tp-print svg{width:22px;height:22px}
.tp-card button:focus-visible{outline:3px solid #2f6fb0;outline-offset:2px}
.tp-custom{grid-template-rows:minmax(0,1fr) auto auto;gap:0;padding:0;overflow:hidden;border-radius:16px;background:var(--body);box-shadow:0 0 0 3px #fffdf6,0 2px 3px #0000002a,0 26px 46px -12px #0c20306b}
.tp-custom .tp-plate{aspect-ratio:auto;height:100%;border-radius:0;background:radial-gradient(90% 70% at 50% 60%,color-mix(in srgb,var(--body) 80%,#fff),var(--body));box-shadow:inset 0 -10px 0 color-mix(in srgb,var(--grass) 80%,transparent)}
.tp-custom .tp-plate canvas{object-fit:contain}
.tp-band{display:grid;grid-template-columns:1fr auto;align-items:end;gap:2px 8px;padding:10px 16px 12px;color:#fffaf0;background:linear-gradient(180deg,var(--earth),var(--deep));box-shadow:inset 0 3px 0 color-mix(in srgb,var(--grass) 70%,#000 0%)}
.tp-band .tp-name{grid-column:1;text-align:left;font-size:26px;color:#fffaf0;text-shadow:0 1px 0 #0003}
.tp-no{grid-column:1;font:700 11px var(--app-font,system-ui);letter-spacing:.12em;opacity:.85}
.tp-mark{grid-column:2;grid-row:1/3;align-self:end;font:800 12px var(--app-font,system-ui);letter-spacing:.1em;opacity:.9}
.tp-desk{display:grid;gap:10px;padding:12px 14px 14px;background:linear-gradient(180deg,#fbf6ea,#efe5d0);box-shadow:inset 0 2px 4px #3a2a1420}
.tp-printer{grid-template-rows:auto auto;height:auto!important;padding-top:18px}
.tp-head{position:absolute;left:0;right:0;top:var(--y,100%);height:0;z-index:3;pointer-events:none}
/* Evan, 2026-10-23: the print is a laser: no arm, no carriage. A beam from above traces the cut line; the layers it has just
   made glow hot and cool; nothing else moves. */
.tp-head i{position:absolute;left:0;right:0;top:-1.5px;height:3px;background:linear-gradient(90deg,transparent,#ff7b1c 12%,#ffd9a0 50%,#ff7b1c 88%,transparent);box-shadow:0 0 12px 3px #ff5a2a99}
.tp-head .tp-hot{position:absolute;left:0;right:0;top:0;height:54px;background:linear-gradient(#ff7b1c8c,#ff7b1c28 55%,transparent);mix-blend-mode:screen}
.tp-head .tp-beam{position:absolute;left:var(--bx,50%);bottom:0;width:3px;height:420px;margin-left:-1.5px;background:linear-gradient(to top,#fff6dc,#ff4a24 35%,#ff4a2400);box-shadow:0 0 8px 1px #ff4a2477;text-decoration:none}
.tp-head .tp-spot{position:absolute;left:var(--bx,50%);top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:radial-gradient(#fff,#ffd27a 40%,#ff5a2a 70%,transparent 72%);text-decoration:none}
.tp-head s{position:absolute;left:var(--bx,50%);top:0;width:2px;height:7px;background:#ffd27a;text-decoration:none;opacity:0;animation:tp-spark .32s linear infinite}
.tp-head s:nth-of-type(2){animation-delay:.08s;--sx:14px}.tp-head s:nth-of-type(3){animation-delay:.16s;--sx:-12px}.tp-head s:nth-of-type(4){animation-delay:.24s;--sx:6px}.tp-head s:nth-of-type(1){--sx:-6px}
@keyframes tp-spark{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--sx,8px),-26px) rotate(35deg)}}
.tp-printer.warming:not(:has(.tp-still)) .tp-head{--y:92%}
.tp-loop{transition:opacity .2s}
.tp-bed .tp-still{position:absolute;inset:0;width:100%;height:100%;opacity:.55;filter:saturate(.6)}
.tp-printer.done .tp-head{opacity:0;transition:opacity .2s}
.tp-stamp{position:absolute;right:18px;top:18px;width:74px;height:74px;color:#ff7b1c;opacity:0;transform:rotate(-10deg);z-index:4;pointer-events:none;filter:drop-shadow(0 0 7px #ff7b1caa)}
.tp-stamp circle,.tp-stamp path{stroke-dasharray:1;stroke-dashoffset:1}
.tp-printer.done .tp-stamp{opacity:1;animation:tp-cool .55s ease-out .24s forwards}
.tp-printer.done .tp-stamp circle{animation:tp-draw .26s linear forwards}
.tp-printer.done .tp-stamp path{animation:tp-draw .14s linear .26s forwards}
@keyframes tp-draw{to{stroke-dashoffset:0}}
@keyframes tp-cool{from{color:#ff7b1c;filter:drop-shadow(0 0 7px #ff7b1caa)}to{color:#c8553d;filter:drop-shadow(0 0 0 #0000)}}
.tp-printer.failed .tp-name{font-size:14px;font-weight:600}
@media(prefers-reduced-motion:reduce){#v2-hand .generator-hero.tp-refill .v2-face,.tp-head s,.tp-printer.done .tp-stamp,.tp-printer.done .tp-stamp circle,.tp-printer.done .tp-stamp path{animation:none!important}.tp-printer.done .tp-stamp{opacity:1;color:#c8553d}.tp-printer.done .tp-stamp circle,.tp-printer.done .tp-stamp path{stroke-dashoffset:0}}
`;
 document.head.append(s);
}
