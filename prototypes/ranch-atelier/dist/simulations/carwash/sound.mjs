// The carwash's voice, from the sound catalogue (INVARIANTS.md): water spray, the dryers and the brushes as looping beds that
// follow how close the player is, soap bubbles popping, a big bucket splash, and a little win sound when the buggy becomes
// hers. Diegetic: the building makes these sounds and the characters hear them.
import {sfx, preload} from '../catalog-sfx.mjs';

let bed = null;
// ambient bed: spray, dryers, brushes. setLevels({spray, dryer, brush}) each 0..1
export function startBed() {
 if (bed) return bed; preload(['washing', 'fan', 'broom', 'splash-big', 'pop-1', 'success-1', 'gears']);
 bed = {spray: sfx('washing', {gain: 0, loop: true}), dryer: sfx('fan', {gain: 0, loop: true}), brush: sfx('broom', {gain: 0, loop: true})};
 return bed;
}
export function setLevels({spray = 0, dryer = 0, brush = 0, master = 1} = {}) {
 if (!bed) return; bed.spray.set(.5 * master * spray); bed.dryer.set(.4 * master * dryer); bed.brush.set(.3 * master * brush);
}
export function stopBed() { if (!bed) return; setLevels({master: 0}); const b = bed; bed = null; setTimeout(() => { b.spray(); b.dryer(); b.brush(); }, 600); }
export const pop = () => { sfx('pop-1', {gain: .5, rate: .8 + Math.random() * .6}); };
export const splash = (big = 1) => { sfx('splash-big', {gain: Math.min(1, .6 * big)}); };
export const jingle = () => { sfx('success-1', {gain: .8}); };
export const brr = () => { sfx('gears', {gain: .5}); };
