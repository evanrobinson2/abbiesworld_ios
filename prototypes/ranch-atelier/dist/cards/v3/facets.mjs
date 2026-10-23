// The back of a held card: the tile's own settings as card facets (Evan, 2026-10-23: "obvious button goes to custom
// settings which are designed to be card-style facets"). Each facet is a small card of the same stock as the face:
// a name, the current value large, and a flat drawing. Picking one opens that section of the tile options (the v1
// controls stay the source of truth, as everywhere in Sandbox v2), so nothing about the settings is duplicated here.
import {PLACES} from './face.mjs';

const $ = s => document.querySelector(s);
const FACETS = [
 {id: 'size', name: 'Size', value: () => $('#size-value')?.textContent || '', draw: '<path d="M4 18 12 4l8 14z"/><path d="M8 18l4-7 4 7"/>'},
 {id: 'layout', name: 'Layout', value: () => $('#shape-open')?.getAttribute('aria-label')?.replace(/^.*?:\s*/, '') || '', draw: '<path d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9z"/>'},
 {id: 'configure', name: 'Make it yours', value: () => '', draw: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="16" r="3"/><path d="M11 8h9M4 16h9"/>'},
 {id: 'backdrop', name: 'Backdrop', value: () => '', draw: '<path d="M3 17c3-4 6-4 9 0s6 4 9 0"/><circle cx="17" cy="7" r="2.5"/>'}
];

export function facetCards({id, width, height, close}) {
 const P = PLACES[id] || PLACES.ranch, host = document.createElement('div'); host.className = 'cv3-facets';
 host.style.setProperty('--w', Math.round(width * 0.36) + 'px'); host.style.setProperty('--body', P.body); host.style.setProperty('--earth', P.earth);
 FACETS.forEach((f, i) => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'cv3-facet'; b.style.setProperty('--i', i);
  const v = f.value();
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${f.draw}</svg><b></b><small></small>`;
  b.querySelector('b').textContent = f.name; b.querySelector('small').textContent = v;
  b.onclick = e => { e.stopPropagation(); openSection(f.id); close?.(); };
  host.append(b);
 });
 return host;
}

// Open the Sandbox v2 tile sheet on one section.
function openSection(name) {
 const root = document.documentElement;
 if (document.body.classList.contains('scene-dropper-hidden')) $('#scene-dropper-toggle')?.click();
 root.classList.add('v2-sheet');
 const d = document.querySelector(`#scene-tools-drawer details[data-section="${name}"]`); if (d) { d.open = true; d.scrollIntoView({block: 'nearest'}); }
}
