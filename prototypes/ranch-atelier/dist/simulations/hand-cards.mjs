// Hand-card faces for Sandbox v2 (Evan, 2026-10-23: "you need the comic icon and names"; then "I wanted the CARTOON on
// the card and the facets mean nothing"). Each tile card in the hand gets a Card Forge face (cards/forge.mjs, "hand" LOD
// with no plate): a wooden frame by tier, the tile's comic-mode cartoon (developer-mode.mjs cartoonLandmark and its
// storybook dressing, rendered by tools/hand-card-art) standing in a window shaped by its type, the name on the
// ribbon, and the generator's comic icon in the top-left enamel token. No ability icons: they told the player nothing.
import {uiIcon} from './ui-icons.mjs?v=4';

const SPECS = {
 ranch:  {name: 'Ranch',    type: 'building', rarity: 'sprout', enamel: '#9a4b35'},
 garden: {name: 'Garden',   type: 'crop',     rarity: 'sprout', enamel: '#a8792a'},
 meadow: {name: 'Meadow',   type: 'animal',   rarity: 'sprout', enamel: '#5b7a3a'},
 moon:   {name: 'Moonbase', type: 'helper',   rarity: 'bloom',  enamel: '#3b4f86', biome: 'moon'}
};
let forge = null;
const loadForge = () => forge ??= import('../cards/forge.mjs?v=2');

export async function cardFace(hero) {
 const id = hero.dataset.generator, base = SPECS[id] || {name: hero.querySelector('.generator-hero-name')?.textContent || id, type: 'helper', rarity: 'seed', enamel: '#4f5864'};
 try {
  const {renderCard, CARD, L} = await loadForge();
  // The tile's cartoon, as comic mode draws it in the game (tools/hand-card-art), so the card matches the place it makes.
  const thumb = new URL((SPECS[id] ? './assets/tile-cards/' : './assets/tile-thumbs/') + id + '.webp?v=2', import.meta.url).href;
  const cssWidth = 120, dpr = Math.min(3, Math.max(1, devicePixelRatio || 1)), dpi = cssWidth * dpr / (CARD.w / 25.4);
  // cost 0 reserves the token on the ribbon's left; the icon is painted over it below.
  const {canvas} = await renderCard({id: 'tile-' + id, name: base.name, type: base.type, rarity: base.rarity, cost: 0, biome: base.biome, art: {image: thumb}}, {dpi, lod: 'hand', plate: false});
  await paintIcon(canvas, dpi, L.cost, base.enamel, uiIcon(id));
  canvas.className = 'v2-face'; canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas); hero.classList.add('v2-faced');
 } catch (error) { console.warn('Hand card face could not be drawn', id, error); }
}

// The comic icon on an enamel disc, inside the brass ring of the token.
async function paintIcon(canvas, dpi, C, enamel, svg) {
 const ctx = canvas.getContext('2d'), px = dpi / 25.4, cx = C.cx * px, cy = C.cy * px, r = (C.r - 0.75) * px;
 const g = ctx.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
 g.addColorStop(0, shade(enamel, .35)); g.addColorStop(1, shade(enamel, -.25));
 ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
 const markup = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"').replace(/currentColor/g, '#fff8e8').replace('stroke-width="1.6"', 'stroke-width="2.2"');
 const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
 await img.decode();
 const s = r * 1.55; ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s);
}
function shade(hex, t) {
 const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)));
 return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
