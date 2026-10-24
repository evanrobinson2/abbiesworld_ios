// Starts the town's play HUD: the glowing-grid and effects top row, the left edge's neighbours, and the hand of tile cards
// (town-hud.mjs, town-hand.mjs). It lives in its own file, loaded by its own tag at the end of studies/abbietown/index.html,
// because the inline module there is edited by many threads and twice a merge dropped these lines, bringing the old bottom
// bar back (Evan, 2026-10-24 01:00Z). Do not move this back inline. Runs after the inline module has mounted the chronograph.
import {mountTownHud} from './town-hud.mjs?v=1';

// The inline module awaits the experimental registry before it builds the board, and a module script does not wait for an
// earlier one's top-level await, so this file waits for the board itself.
const ready = () => new Promise(done => { const t = setInterval(() => { if (window.AbbieTown?.stage) { clearInterval(t); done(); } }, 50); });
await ready();

const town = window.AbbieTown, stage = town?.stage;
if (document.body.classList.contains('play') && stage) {
  mountTownHud({stage, board: town.board});
  Promise.all([import('./town-hand.mjs?v=5'), import('./town-tiles.mjs?v=6')]).then(([m, t]) => { t.mountTownTiles(); m.mountTownHand({board: town.board, stage, visit: id => town.visit('dio-' + id)}); }).catch(e => console.warn('Town hand', e));
}
// The world answers taps (houses, trees, places, ducks, bub, the car): its own file, started here so it also survives a regenerated page.
if (document.body.classList.contains('play') && stage) import('./abbietown/interactions.mjs?v=1').then(m => m.mountInteractions(town)).catch(e => console.warn('Town interactions', e));
