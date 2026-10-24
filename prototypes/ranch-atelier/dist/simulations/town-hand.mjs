// The tile hand in the town (Evan, 2026-10-23 23:39Z: "put back the cards on the bottom"). One Cards v3 card for each hex of
// the Winchester board, dealt along the bottom in the HUD's hand (town-hud.mjs, #aw-hand), beside the Paint the World card.
// Tiles create the world, so these are the board's tiles as cards. Tap one and the camera flies to that hex. The Tile pull
// thread owns what a tap grows into (the pulled blank, the 3D hex customizer): this file fires a cancelable
// 'aw-tile-card' {id, hex} first; if a listener calls preventDefault() it takes over, else the tap visits the hex.
//   mountTownHand({board: AbbieTown.board, visit: id => AbbieTown.visit('dio-' + id)})
// Presentation layer only: the cards are drawn for the player and are invisible to every perception.
import {renderFace} from '../cards/v3/face.mjs';

export const ZONES = {
  'downtown': {body: '#a8603a', deep: '#7c3f22', earth: '#c4680f', grass: '#86a14f', air: '#ecd9bf'},
  'anis-side': {body: '#3d8f93', deep: '#2b6568', earth: '#5d6b4a', grass: '#8bb86a', air: '#dcebf0'},
  'abbie-daddy-side': {body: '#c0609a', deep: '#8e3d70', earth: '#7a4a3a', grass: '#d98a45', air: '#f6d9c8'}};
const INK = '#2b2a26';
const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// A hex of that zone from above: grass, a lane, a few houses and trees. Drawn from the hex's number, so each card is its own.
function art(h, k) {
  const z = ZONES[h.zone] || ZONES.downtown, r = rnd(k * 977 + 13), cx = 200, cy = 232, R = 132;
  const pts = Array.from({length: 6}, (_, i) => [cx + Math.cos(i * Math.PI / 3 + Math.PI / 6) * R, cy + Math.sin(i * Math.PI / 3 + Math.PI / 6) * R * .72]);
  const hex = 'M' + pts.map(p => p.map(v => v.toFixed(1)).join(' ')).join('L') + 'Z';
  let body = `<path d="${hex}" fill="${z.earth}" transform="translate(0 16)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="${hex}" fill="${z.grass}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`;
  body += `<path d="M${cx - 110} ${cy + 30}Q${cx - 30} ${cy - 40} ${cx + 20} ${cy + 6}T${cx + 118} ${cy - 22}" fill="none" stroke="#f3eee2" stroke-width="16" stroke-linecap="round"/><path d="M${cx - 110} ${cy + 30}Q${cx - 30} ${cy - 40} ${cx + 20} ${cy + 6}T${cx + 118} ${cy - 22}" fill="none" stroke="${INK}" stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round"/>`;
  for (let i = 0; i < 5; i++) {
    const x = cx - 80 + r() * 160, y = cy - 40 + r() * 90, w = 26 + r() * 14, roof = ['#b9533a', '#6f8f3c', '#3d8f93', '#e0a63c'][Math.floor(r() * 4)];
    body += i % 2 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(12 + r() * 8).toFixed(0)}" fill="#3f8a4a" stroke="${INK}" stroke-width="5"/>`
      : `<rect x="${x.toFixed(0)}" y="${(y - w * .5).toFixed(0)}" width="${w.toFixed(0)}" height="${(w * .7).toFixed(0)}" fill="#f3eee2" stroke="${INK}" stroke-width="5"/><path d="M${(x - 4).toFixed(0)} ${(y - w * .5).toFixed(0)}l${(w / 2 + 4).toFixed(0)} -${(w * .45).toFixed(0)} ${(w / 2 + 4).toFixed(0)} ${(w * .45).toFixed(0)}z" fill="${roof}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  }
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">${body}</svg>`);
}

const CSS = `#aw-hand .aw-tile-card{all:unset;box-sizing:border-box;cursor:pointer;flex:none;width:var(--tc-w,70px);margin:0 calc(var(--tc-w,70px) * -.08);transform:translateY(0) rotate(var(--fan,0deg));transform-origin:50% 120%;transition:transform .18s cubic-bezier(.2,1.4,.4,1);-webkit-tap-highlight-color:transparent;filter:drop-shadow(0 4px 7px #0004)}
#aw-hand .aw-tile-card img{display:block;width:100%;pointer-events:none}
#aw-hand .aw-tile-card:hover,#aw-hand .aw-tile-card:focus-visible{transform:translateY(-14px) rotate(0) scale(1.12);z-index:3;outline:none}
#aw-hand .aw-tile-card:focus-visible{filter:drop-shadow(0 0 0 #fff) drop-shadow(0 0 6px #ffd23f)}
#aw-hand .aw-tile-cards{display:flex;align-items:flex-end;justify-content:center;pointer-events:none}
#aw-hand .aw-tile-cards>*{pointer-events:auto}
@media(max-width:520px){#aw-hand{--tc-w:46px}}
@media(prefers-reduced-motion:reduce){#aw-hand .aw-tile-card{transition:none}}`;

export function mountTownHand({board, visit, faceArt} = {}) {
  const hexes = board?.hexes || [];
  if (!hexes.length || document.getElementById('aw-tile-cards')) return null;
  document.head.append(Object.assign(document.createElement('style'), {textContent: CSS}));
  const row = document.createElement('div'); row.id = 'aw-tile-cards'; row.className = 'aw-tile-cards'; row.dataset.layer = 'presentation'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Tiles');
  const hand = window.AWHud?.hand || document.body; hand.prepend(row);
  const n = hexes.length;
  hexes.forEach((h, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'aw-tile-card'; b.dataset.hex = h.id; b.setAttribute('aria-label', 'Tile: ' + h.name);
    b.style.setProperty('--fan', ((k - (n - 1) / 2) * 2).toFixed(1) + 'deg'); b.title = h.name;
    b.onclick = () => { if (dispatchEvent(new CustomEvent('aw-tile-card', {cancelable: true, detail: {id: h.id, hex: h}}))) visit?.(h.id); };
    row.append(b);
    const deal = art => renderFace({id: 'town-' + h.id, name: h.name, art, edition: k + 1, set: n, palette: ZONES[h.zone]}, {style: 'diecut', dpi: 110})
      .then(({canvas}) => { b.querySelector('img')?.remove(); const img = new Image(); img.alt = ''; img.draggable = false; img.src = canvas.toDataURL('image/png'); b.append(img); }).catch(() => { if (!b.firstChild) b.textContent = h.n; });
    deal(art(h, k + 1)).then(() => faceArt && setTimeout(() => { const real = faceArt(h); if (real) deal(real); }, 400 * k + 1200));   // the drawn stand-in first; the hex's own face once the town can be photographed
  });
  return {row};
}
