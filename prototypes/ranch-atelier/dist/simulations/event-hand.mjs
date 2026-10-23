// The event deck (Evan, 2026-10-23): cards are how you act on the world as a god. It opens from the toy box and docks on
// the far right, a narrow column of the Card Forge event cards (night-blue, rays, WORLD EVENT banner), so it never covers
// the tile and never looks like the tile cards. Playing one tells lab.mjs (ranch:play-event) and the card is shown large.
// Presentation layer only: nothing here is in the world. Buttons stay simulation control; hexes are placed with tiles.
import {eventSet, eventFace, showEventCard} from '../cards/event-card.mjs';

// Which events the game can play today; the rest sit in the deck dimmed, as cards waiting for their effect.
export const PLAYABLE = new Set(['paint-rain', 'rain-shower', 'thunderstorm', 'snowfall', 'rainbow', 'golden-dawn', 'starry-night', 'morning-fog', 'fireball', 'waterball', 'cats-dogs', 'tie-dye']);
const css = `#v2-events{position:fixed;right:6px;top:50%;transform:translate(120%,-50%);z-index:19;width:min(26vw,118px);max-height:78vh;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:8px 6px;border-radius:18px;background:linear-gradient(160deg,rgba(40,52,110,.55),rgba(14,18,48,.62));box-shadow:0 10px 28px rgba(6,8,30,.5),inset 0 0 0 1.5px rgba(255,214,102,.55);transition:transform .35s cubic-bezier(.2,1.2,.4,1);scrollbar-width:none;overscroll-behavior:contain}#v2-events::-webkit-scrollbar{display:none}#v2-events.open{transform:translate(0,-50%)}#v2-events button{all:unset;display:block;cursor:pointer;border-radius:8px;touch-action:manipulation;transition:transform .15s}#v2-events button:active{transform:scale(.95)}#v2-events button img{width:100%;display:block;filter:drop-shadow(0 4px 6px rgba(0,0,0,.45));pointer-events:none}#v2-events button[data-wait]{opacity:.45;filter:saturate(.5)}#v2-events button:focus-visible{outline:2px solid #ffd666;outline-offset:2px}@media(prefers-reduced-motion:reduce){#v2-events{transition:none}}`;

export function mountEventHand() {
  document.head.append(Object.assign(document.createElement('style'), {textContent: css}));
  const deck = document.createElement('div');
  deck.id = 'v2-events'; deck.dataset.layer = 'presentation'; deck.setAttribute('aria-label', 'World events'); deck.setAttribute('role', 'menu');
  document.body.append(deck);
  let built = false;
  const build = async () => {
    built = true;
    const set = await eventSet();
    for (const c of set.cards) {
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.setAttribute('aria-label', `${c.name}. ${c.rules.replace(/[{}]/g, '')}`);
      if (!PLAYABLE.has(c.id)) b.dataset.wait = '1';
      const img = new Image(); img.draggable = false; img.alt = ''; eventFace(c.id, 90).then(u => { img.src = u; }); b.append(img);
      b.onclick = () => { close(); if (PLAYABLE.has(c.id)) dispatchEvent(new CustomEvent('ranch:play-event', {detail: {id: c.id}})); showEventCard(c.id, {ms: PLAYABLE.has(c.id) ? 5000 : 3500}); };
      deck.append(b);
    }
  };
  const open = () => { if (!built) build(); deck.classList.add('open'); };
  const close = () => deck.classList.remove('open');
  addEventListener('pointerdown', e => { if (deck.classList.contains('open') && !e.target.closest?.('#v2-events,#v2-shelf,#v2-box')) close(); }, true);
  return {open, close, toggle: () => (deck.classList.contains('open') ? close() : open())};
}
