// The model card as an in-game callout (docs/design/look/LOOK.md, "Callout"). Tap a thing in the simple view and its
// card stands beside it: name, the inspiration and the live model as equal squares, numbered focal points.
// Presentation layer only: plain DOM over the canvas, never added to the scene, so no character or director sees it.
//
//   import {openCallout, closeCallout} from '/look/callout.mjs';
//   openCallout({name, kind, description, art, glb, hero, focal, anchor, onClose});
//     art    image url of the inspiration (optional; without it the card shows the model alone)
//     glb    model url for a live, turnable model-viewer; or
//     hero   (el) => void, draws a live preview into el (e.g. the game's own renderer canvas)
//     focal  [{n, label, img:[x%,y%], verdict:'fair'|'close'|'off', note}], as in models/manifest.json (optional)
//     anchor () => ({x, y}) screen point of the tapped thing, followed every frame while open
//     lead   bold lead-in before the one sentence (default: kind, e.g. "New England point of interest")
//     clear  (dx) => void, asked to slide the view dx px left when the docked card would cover the tapped thing
// In play the card docks to the far right edge, clear of the hand of cards, and never covers what was tapped
// (Evan, 2026-10-23: "can go to far right side", "it should not block the tile"). The words are one sentence at most,
// after a short bold lead-in ("use 1 sentence at most, and use a bold header before the text sentence").
const CSS = new URL('./callout.css?v=2', import.meta.url).href;
const FAIR = {fair: 'Fair', close: 'Close', off: 'Off'};
let card = null, raf = 0, current = null;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

function ensureStyle() {
  if (document.querySelector(`link[data-awcall]`)) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = CSS; l.dataset.awcall = '';
  document.head.append(l);
}

function ensureViewer() {
  if (customElements.get('model-viewer') || document.querySelector('script[data-awcall-mv]')) return;
  const s = document.createElement('script');
  s.type = 'module'; s.src = '/vendor/model-viewer.min.js'; s.dataset.awcallMv = '';
  document.head.append(s);
}

// One sentence at most: the first sentence, and a long one stops at its first clause.
export function oneSentence(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(t); if (m) t = m[1];
  if (t.length > 110) { const c = t.slice(0, 110).search(/[;,:—–](?=[^;,:—–]*$)/); t = (c > 40 ? t.slice(0, c) : t.slice(0, 106).replace(/\s+\S*$/, '')).replace(/[;,:—–\s]+$/, '') + '.'; }
  return t;
}

export function openCallout({name, kind = '', description = '', art = '', glb = '', hero = null, focal = [], anchor = null, onClose = null, lead = null, clear = null} = {}) {
  closeCallout({silent: true});
  ensureStyle();
  if (glb) ensureViewer();
  current = {anchor, onClose, clear, cleared: 0};
  lead = lead ?? String(kind || '').split(/\s*[\/·|]\s*/).filter(Boolean).join(', ');
  const sentence = oneSentence(description);
  focal = focal.map((f, i) => ({n: f.n ?? i + 1, name: f.label ?? f.name ?? '', fair: f.verdict ?? f.fair ?? '', img: f.img, note: f.note}));
  const dots = focal.map(f => `<button class="awfp ${esc(f.fair)}" data-n="${f.n}" style="left:${f.img?.[0]}%;top:${f.img?.[1]}%" aria-label="${esc(f.name)}">${f.n}</button>`).join('');
  card = document.createElement('aside');
  card.className = 'awcall' + (art ? ' two' : '');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', name || 'Callout');
  card.innerHTML = `
    <div class="hd"><div class="t"><h2>${esc(name)}</h2></div><button class="x" aria-label="Close">×</button></div>
    ${art || glb || typeof hero === 'function' ? `<div class="pair">
      ${art ? `<figure><div class="sq"><img src="${esc(art)}" alt="">${dots}</div><figcaption>Inspiration</figcaption></figure>` : ''}
      <figure><div class="sq model">${glb ? `<model-viewer src="${esc(glb)}" camera-controls auto-rotate auto-rotate-delay="0" rotation-per-second="18deg" exposure="0.8" shadow-intensity="0.6" interaction-prompt="none"></model-viewer>` : ''}</div>${art ? '<figcaption>Model</figcaption>' : ''}</figure>
    </div>` : ''}
    ${sentence || lead ? `<p>${lead ? `<b>${esc(lead.replace(/^./, c => c.toUpperCase()).replace(/[.:]?$/, '.'))}</b> ` : ''}${esc(sentence)}</p>` : ''}
    ${focal.length ? `<ol>${focal.map(f => `<li data-n="${f.n}"><i class="awfp ${esc(f.fair)}">${f.n}</i><b>${esc(f.name)}</b><em class="${esc(f.fair)}">${FAIR[f.fair] || ''}</em>${f.note ? `<span>${esc(f.note)}</span>` : ''}</li>`).join('')}</ol>` : ''}
    <i class="tail" aria-hidden="true"></i>`;
  document.body.append(card);
  if (!glb && typeof hero === 'function') hero(card.querySelector('.sq.model'));
  card.querySelector('.x').onclick = () => closeCallout();
  card.addEventListener('click', e => {
    const n = e.target.closest('[data-n]')?.dataset.n;
    if (!n) return;
    card.querySelectorAll('[data-n]').forEach(el => el.classList.toggle('lit', el.dataset.n === n));
  });
  card.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('keydown', onKey);
  place();
  requestAnimationFrame(() => card?.classList.add('in'));
  return card;
}

export function closeCallout({silent = false} = {}) {
  cancelAnimationFrame(raf);
  removeEventListener('keydown', onKey);
  if (card) card.remove();
  const done = current?.onClose;
  card = null; current = null;
  if (!silent && done) done();
}

export const calloutOpen = () => !!card;

function onKey(e) { if (e.key === 'Escape') closeCallout(); }

// Dock to the far right edge, from the top down to just above the hand of cards; the tail points toward the tapped
// thing. If the card would still cover it, ask the game to slide the view left (once per open, at most half the screen). Phones get a bottom sheet.
function place() {
  if (!card) return;
  // Until callout.css has loaded the card has no size or place yet; wait for it rather than measure a full-width block.
  if (getComputedStyle(card).position !== 'fixed') { raf = requestAnimationFrame(place); return; }
  const vw = innerWidth, vh = innerHeight, phone = vw < 560;
  card.classList.toggle('sheet', phone);
  const p = current?.anchor?.();
  if (phone) {
    card.style.left = card.style.top = card.style.maxHeight = '';
  } else {
    const w = card.offsetWidth, x = vw - w - 12, top = 12;
    // Keep above the hand (and its options button) when the hand is up beside the card.
    const hand = document.getElementById('v2-hand')?.getBoundingClientRect();
    const floor = hand && hand.height && hand.right > x && !document.getElementById('v2-hand').classList.contains('tucked') ? hand.top - 12 : vh - 12;
    card.style.left = x + 'px';
    card.style.top = top + 'px';
    card.style.maxHeight = Math.max(220, floor - top) + 'px';
    card.classList.remove('left');
    const h = card.offsetHeight;
    if (p) {
      card.style.setProperty('--ty', Math.min(Math.max(22, p.y - top), h - 22) + 'px');
      card.classList.toggle('far', p.x < x - 220);
      const over = p.x - (x - 28);
      if (over > 0 && current.clear && !current.cleared) { current.cleared = 1; current.clear(Math.min(over + 40, vw * 0.5)); }
    }
  }
  raf = requestAnimationFrame(place);
}
