// The Paint the World card (AW-STUDY-0049). A Cards v3 die-cut card (cards/v3/face.mjs), the same 63 x 88 mm face the boost
// cards use, so it sits in the hand beside the tile cards and prints like them. Only the art and palette are new.
//   await paintFace(colourId)    a data URL of the card face, rendered once and cached
//   mountPaintHand(el, onPlay)   one card in a small hand; tap or press P to play it (the hand is the one overlay)
import {renderFace} from '../../cards/v3/face.mjs';
import {PAINT_COLOURS, SPECIES} from './alien-plants.mjs';

const svg = body => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">${body}</svg>`);
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

// A hex of meadow with a splat on it and the colour's sprout rising, a paint can tipping from above.
function art(id) {
 const c = PAINT_COLOURS[id], ink = '#2b2a26', light = mix(c.paint, '#ffffff', .45);
 const splat = `<path d="M200 262c-34-6-70 6-92-12-18-18-4-44 12-54-22-12-10-40 14-42 4-26 36-28 52-14 18-20 52-8 52 16 28-4 46 22 30 44 22 16 12 42-14 48-16 22-36 24-54 14z" fill="${c.paint}" stroke="${ink}" stroke-width="7" stroke-linejoin="round"/>
 <path d="M158 196c20-26 56-30 78-12" stroke="${light}" stroke-width="14" fill="none" stroke-linecap="round" opacity=".8"/>
 <circle cx="94" cy="232" r="11" fill="${c.paint}" stroke="${ink}" stroke-width="5"/><circle cx="318" cy="190" r="9" fill="${c.paint}" stroke="${ink}" stroke-width="5"/><circle cx="288" cy="276" r="7" fill="${c.paint}" stroke="${ink}" stroke-width="4"/>`;
 const sprout = `<path d="M200 230v-70" stroke="#2f8f4a" stroke-width="12" stroke-linecap="round"/><path d="M200 168c-34-4-52-26-50-48 30-2 50 14 50 48z" fill="#59c26a" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/><path d="M200 150c30-6 50-26 46-50-30 0-48 18-46 50z" fill="#7fe08a" stroke="${ink}" stroke-width="6" stroke-linejoin="round"/><circle cx="200" cy="106" r="16" fill="#fff6a8" stroke="${ink}" stroke-width="5"/>`;
 const can = `<g transform="rotate(-38 270 70)"><rect x="228" y="40" width="86" height="76" rx="14" fill="#f4f0e6" stroke="${ink}" stroke-width="7"/><rect x="228" y="62" width="86" height="26" fill="${c.paint}" stroke="${ink}" stroke-width="5"/><path d="M236 40q34-30 70 0" fill="none" stroke="${ink}" stroke-width="6"/></g>
 <path d="M212 70c-8 22 6 44-4 70" stroke="${c.paint}" stroke-width="14" fill="none" stroke-linecap="round"/>`;
 return svg(`${splat}${sprout}${can}`);
}
export const PAINT_CARD = {name: 'Paint the World', blurb: 'Paint falls from the sky, stays a day, and strange plants grow from it.'};
const faces = new Map();
export function paintFace(id = 'pink') {
 if (!faces.has(id)) faces.set(id, (async () => {
  const c = PAINT_COLOURS[id];
  const {canvas} = await renderFace({id: 'paint-' + id, name: PAINT_CARD.name, art: art(id), edition: 1, set: 1,
   palette: {name: PAINT_CARD.name, air: '#e6d2bb', body: c.deep, deep: mix(c.deep, '#000000', .3), earth: c.paint, grass: mix(c.paint, '#ffffff', .6)}}, {style: 'diecut', dpi: 150});
  return canvas.toDataURL('image/png');
 })().catch(() => art(id)));
 return faces.get(id);
}
export function mountPaintHand(el, onPlay, colour = 'pink') {
 const css = '.pw-hand{position:fixed;right:8px;bottom:104px;z-index:5;pointer-events:none}.pw-hand img{width:var(--pw-w,58px);display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35));pointer-events:auto;cursor:pointer;transition:transform .25s cubic-bezier(.2,1.4,.4,1)}.pw-hand img:hover,.pw-hand img.cool{transform:translateY(-8px) rotate(-3deg) scale(1.1)}.pw-hand img.used{animation:pw-play .5s ease-out}@keyframes pw-play{50%{transform:translateY(-34px) rotate(8deg) scale(1.2)}}';
 if (!document.getElementById('pw-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'pw-css', textContent: css}));
 el.classList.add('pw-hand'); el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Card: ' + PAINT_CARD.name);
 const img = new Image(); img.alt = ''; img.setAttribute('aria-label', PAINT_CARD.name + '. ' + PAINT_CARD.blurb); img.draggable = false; img.tabIndex = 0;
 const play = () => { img.classList.remove('used'); void img.offsetWidth; img.classList.add('used'); onPlay(); };
 img.addEventListener('pointerdown', e => { e.stopPropagation(); play(); }); img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') play(); });
 const show = u => { img.src = u; if (!img.isConnected) el.append(img); };
 paintFace(colour).then(show);
 return {el, play, set(id) { paintFace(id).then(show); }};
}
