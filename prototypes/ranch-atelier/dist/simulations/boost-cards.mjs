// Boost cards for the cell brawl (AW-STUDY-0047). Evan, 2026-10-23: "cards for boosts". They are Cards v3 cards
// (cards/v3/face.mjs, the die-cut style): the same 63 x 88 mm face, Roboto name, "AW" edition line and flat colour,
// with the boost's own art breaking out of the top edge. Only the art and the palette are new; the face is not forked.
// A hand of cards is the one place the HUD grammar wants an overlay (precise, chosen, held), so each player's hand sits
// in their own corner, small, and plays with one tap, one key or one button.
//   BOOSTS                          id -> {name, seconds, palette, art}
//   await boostFace(id)             a data URL of the card face (rendered once, cached)
//   hand(el, {colour}) -> H         H.set(cards[], focus), H.onPlay = i => ...
import {renderFace} from '../cards/v3/face.mjs';

const cell = (body = '#ff8fd0', ink = '#43123c', extra = '', under = '') => `${under}<circle cx="200" cy="230" r="120" fill="${body}" fill-opacity=".9" stroke="${ink}" stroke-width="8"/><ellipse cx="160" cy="180" rx="34" ry="18" fill="#fff" fill-opacity=".65" transform="rotate(-35 160 180)"/><circle cx="240" cy="205" r="22" fill="#fff" stroke="${ink}" stroke-width="5"/><circle cx="246" cy="208" r="11" fill="#2a0f2a"/><circle cx="240" cy="265" r="22" fill="#fff" stroke="${ink}" stroke-width="5"/><circle cx="246" cy="266" r="11" fill="#2a0f2a"/>${extra}`;
const svg = body => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">${body}</svg>`);

export const BOOSTS = {
 zoom: {name: 'Zoom', seconds: 4, palette: {body: '#e8508f', deep: '#a3245f', earth: '#ff9acb', grass: '#ffd1e6'},
  art: svg(cell('#ff8fd0', '#43123c', '', '<path d="M20 170h90M0 230h80M30 290h90" stroke="#fff" stroke-width="16" stroke-linecap="round"/><path d="M80 230c-40-30-60 30-90 0" stroke="#c93c95" stroke-width="14" fill="none" stroke-linecap="round"/>'))},
 bubble: {name: 'Bubble', seconds: 5, palette: {body: '#2f8fc9', deep: '#1c5f8a', earth: '#7fd3ff', grass: '#d4f2ff'},
  art: svg(cell() + '<circle cx="200" cy="230" r="165" fill="#bff3ff" fill-opacity=".25" stroke="#e8fbff" stroke-width="12"/><path d="M100 120a150 150 0 0 1 90-40" stroke="#fff" stroke-width="14" fill="none" stroke-linecap="round"/>')},
 chomp: {name: 'Mega Chomp', seconds: 6, palette: {body: '#d0601c', deep: '#8a3a0c', earth: '#ffb070', grass: '#ffe1bd'},
  art: svg(cell('#ff8fd0', '#43123c', '<path d="M300 190q90-60 95 25q-40-15-70 5Z" fill="#fff6e8" stroke="#43123c" stroke-width="7"/><path d="M300 270q90 60 95-25q-40 15-70-5Z" fill="#fff6e8" stroke="#43123c" stroke-width="7"/>'))},
 magnet: {name: 'Magnet', seconds: 6, palette: {body: '#4fa83c', deep: '#2f6a22', earth: '#a6ff7a', grass: '#e2ffd0'},
  art: svg(cell() + [0, 1, 2, 3, 4].map(i => { const a = i * 1.26 + .4, x = 200 + Math.cos(a) * 175, y = 230 + Math.sin(a) * 160; return `<circle cx="${x}" cy="${y}" r="20" fill="#7be86a" stroke="#1d5a22" stroke-width="5"/><path d="M${x} ${y}L${200 + Math.cos(a) * 135} ${230 + Math.sin(a) * 125}" stroke="#a6ff7a" stroke-width="6" stroke-dasharray="10 10"/>`; }).join(''))},
 splash: {name: 'Splash', seconds: 0, palette: {body: '#6a3fd6', deep: '#3d2090', earth: '#b89cff', grass: '#ece2ff'},
  art: svg('<circle cx="200" cy="230" r="180" fill="none" stroke="#e2d6ff" stroke-width="12"/><circle cx="200" cy="230" r="150" fill="none" stroke="#b89cff" stroke-width="8"/>' + cell())},
 snack: {name: 'Big Snack', seconds: 0, palette: {body: '#86a81c', deep: '#526a0c', earth: '#d8f06a', grass: '#f7ffd2'},
  art: svg(cell() + '<g transform="translate(300 120) scale(2.2)">' + [0, 1, 2, 3, 4].map(i => `<ellipse cx="${Math.cos(i * 1.26) * 14}" cy="${Math.sin(i * 1.26) * 14}" rx="14" ry="10" transform="rotate(${i * 72} ${Math.cos(i * 1.26) * 14} ${Math.sin(i * 1.26) * 14})" fill="${i % 2 ? '#7be86a' : '#4fc95a'}" stroke="#1d5a22" stroke-width="2"/>`).join('') + '<circle r="8" fill="#d9ff9c"/></g>')},
};
export const BOOST_IDS = Object.keys(BOOSTS);

const faces = new Map();
// The card's cell wears the player's own colour: the art is pink by default, so tinting is swapping its two colours.
const tinted = (art, L) => !L ? art : 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(decodeURIComponent(art.slice(art.indexOf(',') + 1)).replaceAll('#ff8fd0', L.body).replaceAll('#43123c', L.ink));
export function boostFace(id, L) {
 const key = id + (L ? L.body : '');
 if (!faces.has(key)) faces.set(key, (async () => {
  const B = BOOSTS[id];
  const {canvas} = await renderFace({id: 'boost-' + id + (L ? L.body : ''), name: B.name, art: tinted(B.art, L), edition: BOOST_IDS.indexOf(id) + 1, set: BOOST_IDS.length,
   palette: {name: B.name, air: '#1c3a33', ...B.palette}}, {style: 'diecut', dpi: 150});
  return canvas.toDataURL('image/png');
 })().catch(() => B_FALLBACK(id)));
 return faces.get(key);
}
// if the card fonts or canvas fail, the art alone still reads as the card
const B_FALLBACK = id => BOOSTS[id].art;

const CSS = `.bc-hand{position:fixed;display:flex;gap:4px;z-index:5;pointer-events:none}
.bc-hand img{width:var(--bc-w,58px);height:auto;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,.35));transform-origin:50% 100%;transition:transform .25s cubic-bezier(.2,1.4,.4,1);pointer-events:auto;cursor:pointer}
.bc-hand img.focus{transform:translateY(-8px) scale(1.12)}
.bc-hand img.new{animation:bc-deal .5s cubic-bezier(.2,1.4,.4,1)}
@keyframes bc-deal{from{transform:translateY(40px) rotate(-12deg) scale(.6);opacity:0}}`;
export function hand(el, L) {
 if (!document.getElementById('bc-css')) document.head.append(Object.assign(document.createElement('style'), {id: 'bc-css', textContent: CSS}));
 el.classList.add('bc-hand');
 const H = {onPlay: () => {}, ids: [], look: L,
  async set(ids, focus = 0) {
   const prev = H.ids; H.ids = [...ids];
   const urls = await Promise.all(ids.map(i => boostFace(i, H.look)));
   el.replaceChildren(...urls.map((u, i) => {
    const img = new Image(); img.src = u; img.alt = BOOSTS[ids[i]].name; img.draggable = false;
    if (i === focus && ids.length > 1) img.classList.add('focus');
    if (i >= prev.length || prev[i] !== ids[i]) img.classList.add('new');
    img.addEventListener('pointerdown', e => { e.stopPropagation(); H.onPlay(i); });
    return img;
   }));
  }};
 return H;
}
