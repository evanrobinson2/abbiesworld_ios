// Cards v3 in the Sandbox v2 hand (AW-STUDY-0014). On by default with the die-cut look (Evan, 2026-10-23: "release them
// to main ... presume we're gonna use 'em"); /sandbox?cards=slice|print|diecut picks another look and ?cards=v2 goes back
// to the v2 faces, remembered on this device. Evan's interaction (2026-10-23):
//   tap            opens the card large and beautiful (paper.mjs), sharp at 4x;
//   hold and drag  picks it up into your hand; drop over a hex places it (the tile chooser's carry, unchanged);
//   the button     on the held card turns it over to the tile's settings as card facets (facets.mjs).
// The card's sky is the world's air (lab.mjs writes it on the world canvas as data-air), so the hand changes with the
// hour and the weather like everything else in the scene: one signal, one palette.
import {renderFace, PLACES, STYLES} from './face.mjs?v=2';

const KEY = 'aw-cards', DEFAULT = 'diecut';
export function cardsStyle() {
 try {
  const q = new URLSearchParams(location.search).get('cards');
  if (q === 'v2' || q === 'off') localStorage.setItem(KEY, 'off');
  else if (q) localStorage.setItem(KEY, STYLES.includes(q) ? q : DEFAULT);
  const v = localStorage.getItem(KEY); return v === 'off' ? null : STYLES.includes(v) ? v : DEFAULT;
 } catch { return DEFAULT; }
}

const art = id => new URL(`../../simulations/assets/tile-cards/${id}.webp?v=2`, import.meta.url).href;
// The held card and print use the 1600 px renders (tools/hand-card-art at 4096), sharp at 4x on a phone.
const artHd = id => new URL(`../../simulations/assets/tile-cards-hd/${id}.webp?v=1`, import.meta.url).href;
const world = () => [...document.querySelectorAll('canvas')].find(c => c.dataset.sun);
const faces = new Set();
let air = null, wired = false;

export async function cardFace(hero, style = cardsStyle()) {
 const id = hero.dataset.generator; if (!PLACES[id]) return false;
 ensureCss(); wire();
 air ??= world()?.dataset.air || null; // take the world's air now, so the first hand already matches it
 const old = hero.querySelector('.v2-face');
 const cssW = 120, dpr = Math.min(3, Math.max(1, devicePixelRatio || 1)), dpi = Math.ceil(cssW * dpr * 1.25 / (63 / 25.4));
 const {canvas} = await renderFace({id, art: art(id), palette: airFor(id)}, {style, dpi});
 canvas.className = 'v2-face cv3-face'; canvas.setAttribute('aria-hidden', 'true');
 if (old) old.replaceWith(canvas); else hero.prepend(canvas);
 hero.classList.remove(...STYLES.map(s => 'cv3-' + s)); hero.classList.add('v2-faced', 'cv3', 'cv3-' + style); hero.dataset.cv3 = style;
 faces.add(hero); return true;
}

function airFor(id) { return air && !PLACES[id].night ? {air} : {}; }

// Redraw the hand when the world's air moves enough to see (dawn, dusk, a storm), at most every few seconds.
function wire() {
 if (wired) return; wired = true;
 let last = 0, timer = 0;
 const check = () => {
  const c = world(); if (!c) return;
  const next = c.dataset.air; if (!next || next === air) return;
  if (air && dist(air, next) < 10) return;
  clearTimeout(timer); timer = setTimeout(() => { air = next; last = performance.now(); for (const h of faces) if (h.isConnected) cardFace(h, h.dataset.cv3); }, Math.max(0, 3000 - (performance.now() - last)));
 };
 setInterval(check, 1500);
 // A plain tap on a card arms the tile chooser's carry without moving; in v3 a tap opens the card instead.
 const watch = new MutationObserver(() => {
  const c = world(); if (c?.dataset.tileCarry !== 'carrying') return;
  const hero = document.querySelector('#v2-hand .generator-hero.cv3[aria-pressed=true]'); if (!hero) return;
  dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
  openHeld(hero);
 });
 const attach = () => { const c = world(); if (c) watch.observe(c, {attributes: true, attributeFilter: ['data-tile-carry']}); else setTimeout(attach, 800); };
 attach();
}

export async function openHeld(hero) {
 const id = hero.dataset.generator, [{openCard}, {facetCards}] = await Promise.all([import('./paper.mjs'), import('./facets.mjs')]);
 const from = hero.getBoundingClientRect();
 hero.style.visibility = 'hidden';
 openCard({id, art: artHd(id), palette: airFor(id), style: hero.dataset.cv3, from, facets: facetCards, onClose: () => { hero.style.visibility = ''; }});
}

function dist(a, b) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); }
function ensureCss() {
 if (document.querySelector('link[data-cv3]')) return;
 const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./cards-v3.css', import.meta.url).href; l.dataset.cv3 = '1'; document.head.append(l);
}
