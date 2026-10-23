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
const CSS = new URL('./callout.css?v=1', import.meta.url).href;
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

export function openCallout({name, kind = '', description = '', art = '', glb = '', hero = null, focal = [], anchor = null, onClose = null} = {}) {
  closeCallout({silent: true});
  ensureStyle();
  if (glb) ensureViewer();
  current = {anchor, onClose};
  focal = focal.map((f, i) => ({n: f.n ?? i + 1, name: f.label ?? f.name ?? '', fair: f.verdict ?? f.fair ?? '', img: f.img, note: f.note}));
  const dots = focal.map(f => `<button class="awfp ${esc(f.fair)}" data-n="${f.n}" style="left:${f.img?.[0]}%;top:${f.img?.[1]}%" aria-label="${esc(f.name)}">${f.n}</button>`).join('');
  card = document.createElement('aside');
  card.className = 'awcall' + (art ? ' two' : '');
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', name || 'Callout');
  card.innerHTML = `
    <header><h2>${esc(name)}</h2>${kind ? `<span>${esc(kind)}</span>` : ''}<button class="x" aria-label="Close">×</button></header>
    <div class="pair">
      ${art ? `<figure><div class="sq"><img src="${esc(art)}" alt="">${dots}</div><figcaption>Inspiration</figcaption></figure>` : ''}
      <figure><div class="sq model">${glb ? `<model-viewer src="${esc(glb)}" camera-controls auto-rotate auto-rotate-delay="0" rotation-per-second="18deg" exposure="0.8" shadow-intensity="0.6" interaction-prompt="none"></model-viewer>` : ''}</div>${art ? '<figcaption>Model</figcaption>' : ''}</figure>
    </div>
    ${description ? `<p>${esc(description)}</p>` : ''}
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

// Stand beside the tapped thing, on whichever side has room; the tail points at it. Phones get a bottom sheet.
function place() {
  if (!card) return;
  const vw = innerWidth, vh = innerHeight, phone = vw < 560;
  card.classList.toggle('sheet', phone);
  const p = current?.anchor?.();
  if (phone || !p) {
    card.style.left = card.style.top = '';
  } else {
    const w = card.offsetWidth, h = card.offsetHeight, gap = 22;
    const right = p.x + gap + w < vw - 12;
    const x = right ? p.x + gap : Math.max(12, p.x - gap - w);
    const y = Math.min(Math.max(12, p.y - h * 0.35), vh - h - 12);
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.classList.toggle('left', !right);
    card.style.setProperty('--ty', Math.min(Math.max(18, p.y - y), h - 18) + 'px');
  }
  raf = requestAnimationFrame(place);
}
