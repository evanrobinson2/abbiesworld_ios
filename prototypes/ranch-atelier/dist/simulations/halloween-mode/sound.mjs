// Halloween mode sound, from the sound catalogue (INVARIANTS.md: no synthesis). Spooky-cute, never a horror stinger. On the
// grid: the knock and the creak are diegetic (the people at the door hear them too); the music is meta (the mood, felt by the
// player). The finished score ("Halloween After Dark", docs/oracle/score) replaces the loop when its file is in the music
// catalogue; until then the box music is the catalogue's music box. Honors the same mute as the backpack jingle
// (window.AWLook.state.prefs.mute) and starts only after a tap.
import {sfx} from '../catalog-sfx.mjs';

let loop = null;
const muted = () => !!window.AWLook?.state?.prefs?.mute;
export const knock = () => { if (muted()) return; [0, .17, .34].forEach((d, i) => sfx('knock', {gain: .6, rate: i === 2 ? .85 : 1, delay: d})); }; // three knocks
export const creak = () => { if (muted()) return; sfx('door-creak', {gain: .4}); }; // a friendly squeaky hinge
export const treat = () => { if (muted()) return; sfx('xylophone', {gain: .5}); }; // celesta-ish
export const charm = () => { if (muted()) return; sfx('magic-chime', {gain: .6}); };

// A slow music-box loop under the town: the catalogue's music box, every few seconds.
export function startMusic() {
  if (loop || muted()) return;
  const play = () => { if (!muted()) sfx('music-box', {gain: .25}); };
  play(); loop = setInterval(play, 6000);
}
export const stopMusic = () => { clearInterval(loop); loop = null; };
