// The café's own sounds (AW-STUDY-0013): the jukebox, footsteps on the planks, the espresso steam, the cash register, the old
// door. Diegetic: a jukebox tune and a door are things the characters hear too. Every sound comes from the catalogue
// (INVARIANTS.md): effects from sounds/manifest.json through catalog-sfx.mjs, the jukebox plays the produced Abbie's World
// theme. No oscillators.
//
//   const snd = cafeSound();   snd.unlock() on the first tap;   snd.music(true|false);   snd.sfx.thunk() ...
//   snd.onBeat(step => ...) fires on every sixteenth while the music plays; snd.beatPhase() is 0..1 across a beat.
import {sfx as play, preload, sfxContext} from './catalog-sfx.mjs';

const ONE = (...ids) => () => ids[Math.floor(Math.random() * ids.length)];
const FX = {
  step: [ONE('step-wood-1', 'step-wood-2', 'step-wood-3', 'step-wood-4'), {gain: .5}],
  thunk: [ONE('place-wood-1', 'place-wood-2'), {gain: .8}],
  rattle: [ONE('keys'), {gain: .7}],
  unlock: [ONE('unlock'), {gain: .8}],
  creak: [ONE('wood-creak', 'door-creak'), {gain: .7}],
  drawer: [ONE('drawer'), {gain: .8}],
  cash: [ONE('coins-1', 'coins-2'), {gain: .8}],
  key: [ONE('keys'), {gain: .6}],
  steam: [ONE('steam'), {gain: .6}],
  ding: [ONE('magic-chime'), {gain: .6}],
  bell: [ONE('doorbell'), {gain: .7}]            // the café's door bell
};
const TRACK = 'abbies-world-reimagined';

export function cafeSound() {
  let ac = null, playing = false, step = 0, timer = 0, startAt = 0, stopTrack = null;
  const BPM = 118, S = 60 / BPM / 4, beatFns = new Set();
  const unlock = () => { ac = ac || sfxContext(); if (ac) preload([TRACK, ...new Set(Object.values(FX).flatMap(([f]) => [f()]))]); return !!ac; };
  // the beat clock the café dances to; the sound is the track itself
  function tick() { if (!playing || !ac) return; while (startAt + step * S < ac.currentTime + .12) { const i = step, t = startAt + i * S; step++; beatFns.forEach(f => { try { f(i, t); } catch {} }); } }
  function music(on) {
    if (!unlock()) return false;
    if (on && !playing) { playing = true; step = 0; startAt = ac.currentTime + .05; stopTrack = play(TRACK, {gain: .8, loop: true}); timer = setInterval(tick, 25); }
    else if (!on && playing) { playing = false; clearInterval(timer); stopTrack?.(); stopTrack = null; }
    return playing;
  }
  const sfx = Object.fromEntries(Object.entries(FX).map(([name, [pick, opts]]) => [name, () => { if (ac) play(pick(), opts); }]));
  return {unlock, music, sfx, isOn: () => playing, onBeat: fn => (beatFns.add(fn), () => beatFns.delete(fn)),
    beatPhase: () => ac && playing ? (((ac.currentTime - startAt) / (S * 4)) % 1 + 1) % 1 : 0, ctx: () => ac};
}
