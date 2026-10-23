// Hand-card faces for Sandbox v2 (Evan, 2026-10-23: "you need the comic icon and names"; then "I wanted the CARTOON on
// the card and the facets mean nothing"). Each tile card in the hand gets a Card Forge face (cards/forge.mjs, "hand" LOD
// with no plate): a wooden frame by tier, the tile's comic-mode cartoon (developer-mode.mjs cartoonLandmark and its
// storybook dressing, rendered by tools/hand-card-art) standing in a window shaped by its type, the name on the
// ribbon, and the generator's comic icon in the top-left enamel token. No ability icons: they told the player nothing.
import {uiIcon} from './ui-icons.mjs?v=4';

const SPECS = {
 ranch:  {name: 'Ranch',    type: 'building', rarity: 'sprout', enamel: '#9a4b35'},
 garden: {name: 'Garden',   type: 'crop',     rarity: 'sprout', enamel: '#a8792a', biome: 'garden'},
 meadow: {name: 'Meadow',   type: 'animal',   rarity: 'sprout', enamel: '#5b7a3a', biome: 'meadow'},
 moon:   {name: 'Moonbase', type: 'helper',   rarity: 'bloom',  enamel: '#3b4f86', biome: 'moon'}
};
let forge = null;
const loadForge = () => forge ??= import('../cards/forge.mjs?v=4');

const ART_KEY = 'hand-card-art';
export const cardArt = () => { try { return localStorage.getItem(ART_KEY) === 'concept' ? 'concept' : 'ingame'; } catch { return 'ingame'; } };
// Switches every card in the hand between the in-game close-up and the concept cartoon, and redraws them.
export function setCardArt(mode) {
 try { localStorage.setItem(ART_KEY, mode); } catch {}
 for (const hero of document.querySelectorAll('.generator-hero.v2-faced')) { hero.querySelector('.v2-face')?.remove(); hero.classList.remove('v2-faced'); cardFace(hero); }
}

export async function cardFace(hero) {
 try {
  const canvas = await drawFace(hero, 240);
  canvas.className = 'v2-face'; canvas.setAttribute('aria-hidden', 'true');
  hero.prepend(canvas); hero.classList.add('v2-faced');
 } catch (error) { console.warn('Hand card face could not be drawn', hero.dataset.generator, error); }
}

// One card face at a given CSS width, drawn at the screen's full pixel density so it stays sharp at that size.
async function drawFace(hero, cssWidth) {
 const id = hero.dataset.generator, base = SPECS[id] || {name: hero.querySelector('.generator-hero-name')?.textContent || id, type: 'helper', rarity: 'seed', enamel: '#4f5864'};
 const {renderCard, CARD, L} = await loadForge();
 // Two kinds of art (Evan, 2026-10-23: "the IN GAME close up OR the rendered concept, default is in game, it's more
 // truthful"): a close-up of the place staged from the game's own tile tray (tools/hand-card-art, 1440 px, so the held
 // card stays sharp), or its cel-rendered comic-mode cartoon. Any other generator's thumbnail stays PRELIMINARY.
 const folder = !SPECS[id] ? './assets/tile-thumbs/' : cardArt() === 'concept' ? './assets/tile-cards/' : './assets/tile-cards-ingame/';
 const thumb = new URL(folder + id + '.webp?v=3', import.meta.url).href;
 const dpr = Math.min(3, Math.max(1, devicePixelRatio || 1)), dpi = cssWidth * dpr / (CARD.w / 25.4);
 // cost 0 reserves the token on the ribbon's left; the icon is painted over it below.
 const {canvas} = await renderCard({id: 'tile-' + id, name: base.name, type: base.type, rarity: base.rarity, cost: 0, biome: base.biome, art: {image: thumb, outline: false, status: SPECS[id] ? 'final' : 'draft'}}, {dpi, lod: 'hand', plate: false});
 await paintIcon(canvas, dpi, L.cost, base.enamel, uiIcon(id));
 return canvas;
}

// Holding a card (Evan, 2026-10-23: "cards should be 4x and SHARP when they are seen close up when user holds them",
// "they should want to hold them"). The card lifts out of the hand to four times the old tray size, redrawn at full
// pixel density, and tilts toward the finger or pointer with a moving sheen. Tap anywhere to put it back.
let held = null;
export async function holdCard(hero) {
 putBack();
 const W = Math.round(Math.min(480, innerWidth * .86, innerHeight * .84 * 63 / 88));
 const stage = document.createElement('div'); stage.id = 'v2-held'; stage.setAttribute('role', 'dialog'); stage.setAttribute('aria-label', (hero.querySelector('.generator-hero-name')?.textContent || 'Card') + ', held up close');
 const card = document.createElement('div'); card.className = 'v2-held-card'; card.style.width = W + 'px'; card.style.height = Math.round(W * 88 / 63) + 'px';
 const from = hero.getBoundingClientRect(); card.style.setProperty('--from-x', (from.left + from.width / 2 - innerWidth / 2) + 'px'); card.style.setProperty('--from-y', (from.top + from.height / 2 - innerHeight / 2) + 'px'); card.style.setProperty('--from-s', (from.width / W).toFixed(3));
 const quick = hero.querySelector('.v2-face'); if (quick) { const c = document.createElement('canvas'); c.width = quick.width; c.height = quick.height; c.getContext('2d').drawImage(quick, 0, 0); c.className = 'v2-held-face'; card.append(c); }
 const sheen = document.createElement('i'); sheen.className = 'v2-held-sheen'; card.append(sheen);
 stage.append(card); document.body.append(stage); held = stage;
 void card.offsetWidth; stage.classList.add('up'); // a forced layout, so the lift animates from the hand
 const tilt = e => { const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5, k = Math.min(1, Math.hypot(x, y) * 1.4);
  card.style.setProperty('--rx', (-y * 16 * k).toFixed(2) + 'deg'); card.style.setProperty('--ry', (x * 20 * k).toFixed(2) + 'deg');
  card.style.setProperty('--sx', ((x + .5) * 100).toFixed(1) + '%'); card.style.setProperty('--sy', ((y + .5) * 100).toFixed(1) + '%'); };
 addEventListener('pointermove', tilt);
 const close = e => { if (e.type === 'keydown' && e.key !== 'Escape') return; putBack(); };
 setTimeout(() => { stage.addEventListener('click', close); addEventListener('keydown', close); }, 250);
 stage.cleanup = () => { removeEventListener('pointermove', tilt); removeEventListener('keydown', close); };
 try { const sharp = await drawFace(hero, W); if (held !== stage) return; sharp.className = 'v2-held-face'; card.querySelector('.v2-held-face')?.remove(); card.prepend(sharp); } catch (error) { console.warn('Held card could not be drawn', error); }
}
export function putBack() { const s = held; held = null; if (!s) return; s.cleanup?.(); s.classList.remove('up'); s.classList.add('down'); setTimeout(() => s.remove(), 220); }
export const isHolding = () => !!held;

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
