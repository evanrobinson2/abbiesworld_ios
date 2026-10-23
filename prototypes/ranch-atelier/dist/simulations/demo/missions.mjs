// The mission board's missions (Evan, 2026-10-23 20:19Z). Four, in the order he gave them. Whether one is done is read
// from the charms in the backpack (simulations/backpack.mjs), so each mission game only has to earn its charm, as it
// already does. `needs: 'moon'` hides nothing: the card is shown, sealed, until a moon tile is on the board.
import {earnedCharms, charmCount, CHARMS} from '../backpack.mjs';

export const MISSIONS = [
 {id: 'basement', title: 'The coffee shop basement', line: 'The register key opens a door under the stairs.', icon: '🗝️', charm: 'basement', page: '/studies/basement/play.html', at: 'cafe', tint: '#ffb86b'},
 {id: 'lab', title: 'The science lab', line: 'Shrink down into the green goo and win a tardigrade.', icon: '🔬', charm: 'tardigrade', page: '/studies/cell/play.html', at: 'lab', tint: '#7dff9a'},
 {id: 'mining', title: 'Moon base mining', line: 'Swing a pickaxe. One rock in three hides moon cheese.', icon: '🧀', charm: 'moon-cheese', page: '/studies/moon-mission/play.html?beat=outpost', at: 'moon', needs: 'moon', tint: '#ffd95a'},
 {id: 'moon', title: 'The Moon Mission', line: 'The whole trip, from the driveway to the far side. Finishing it unlocks the Moon tile.', icon: '🚀', charm: 'rocket', page: '/studies/moon-mission/play.html', at: 'cafe', tint: '#ff7eb6', finale: true}
];

// Other threads add their missions here (the Effect hunt and jet cart thread, for one):
//   window.AbbieDemo.registerMission({id, title, line, icon, charm, at: 'cafe' | 'lab' | 'moon' | (stage) => Object3D,
//     page: '/path' (the mission game, opened over the board), drive: (mission, stage) => {...} (optional: play it by driving there),
//     needs: 'moon' (optional), tint, beacon: true (a laser beam into the sky while selected)})
export const registerMission = x => { const i = MISSIONS.findIndex(y => y.id === x.id); if (i >= 0) MISSIONS[i] = {...MISSIONS[i], ...x}; else MISSIONS.splice(MISSIONS.findIndex(y => y.finale), 0, {tint: '#ffd95a', icon: '⭐', ...x}); };
export const isDone = m => charmCount(m.charm) > 0;
export const state = () => { try { return JSON.parse(localStorage.getItem('aw-demo') || '{}') || {}; } catch { return {}; } };
export const save = patch => { try { localStorage.setItem('aw-demo', JSON.stringify({...state(), ...patch})); } catch {} };
// In the demo every tile is on the shelf. In real play (?play) the Moon tile is earned by finishing the Moon Mission.
export const moonUnlocked = demo => demo || charmCount('rocket') > 0 || !!state().moonUnlocked;
export const chest = () => { const have = new Set(earnedCharms()); return CHARMS.filter(c => !c.repeat).map(c => ({...c, have: have.has(c.id)})); };
