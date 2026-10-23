// World event cards in the game (AW-STUDY world events). When something happens to the whole world (paint rain, a storm,
// a meteorite, nightfall) the game shows its Card Forge event card, instead of a side panel. The card is the overlay
// (presentation layer): it slides in from the right edge, tilts a little, and goes away on tap or after a few seconds.
//   import {showEventCard} from '/cards/event-card.mjs';
//   showEventCard('thunderstorm');            // ids are in /cards/events.json
//   showEventCard('paint-rain', {ms: 8000});
// The card art is rendered once per event and cached; nothing here is in the world, so no character perceives it.
import {loadSet, renderCard} from './forge.mjs';

let setPromise = null;
const faces = new Map();
const css = '.ev-card{position:fixed;right:12px;top:50%;z-index:20;width:min(38vw,190px);transform:translate(130%,-50%) rotate(6deg);transition:transform .45s cubic-bezier(.2,1.3,.4,1);filter:drop-shadow(0 8px 14px rgba(8,10,30,.5));cursor:pointer;touch-action:manipulation}.ev-card.in{transform:translate(0,-50%) rotate(-2deg)}.ev-card img{width:100%;display:block;pointer-events:none}@media (prefers-reduced-motion:reduce){.ev-card{transition:none}}';

export const eventSet = () => (setPromise ||= loadSet(new URL('./events.json', import.meta.url).href));

// A data URL of the event's card face (hand-size render, cached).
export function eventFace(id, dpi = 200) {
  const key = id + '@' + dpi;
  if (!faces.has(key)) faces.set(key, (async () => {
    const spec = (await eventSet()).cards.find(c => c.id === id);
    if (!spec) throw new Error('no event card: ' + id);
    return (await renderCard(spec, {dpi, lod: 'inspect', preview: false})).canvas.toDataURL('image/png');
  })());
  return faces.get(key);
}

export async function showEventCard(id, {ms = 6500, onClose} = {}) {
  if (!document.getElementById('ev-card-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'ev-card-css', textContent: css}));
  const spec = (await eventSet()).cards.find(c => c.id === id);
  const el = document.createElement('div');
  el.className = 'ev-card'; el.setAttribute('role', 'status'); el.dataset.layer = 'presentation';
  const img = new Image(); img.draggable = false; img.alt = spec ? `World event: ${spec.name}. ${spec.rules.replace(/[{}]/g, '')}` : 'World event';
  img.src = await eventFace(id); el.append(img); document.body.append(el);
  let done = false;
  const close = () => { if (done) return; done = true; el.classList.remove('in'); setTimeout(() => { el.remove(); onClose?.(); }, 500); };
  el.addEventListener('pointerdown', close);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  setTimeout(close, ms);
  return {el, close};
}
