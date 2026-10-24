// The hunt's voice, from the sound catalogue (INVARIANTS.md): a chime when you find something, a boing from a mushroom, a
// pip-pip when the tow critter arrives.
import {sfx} from '../catalog-sfx.mjs';

export const chime = n => { sfx('magic-chime', {gain: .7, rate: 2 ** ((n % 5) / 12 * 2)}); };
export const boing = () => { sfx('boing', {gain: .8}); };
export const pop = () => { sfx('pop-1', {gain: .5}); };
export const pipPip = () => { sfx('beep-2', {gain: .5}); sfx('beep-2', {gain: .5, rate: 1.3, delay: .13}); };
export const bonk = k => { sfx('bonk', {gain: .5 + k * .3, rate: 1 - k * .1}); };
