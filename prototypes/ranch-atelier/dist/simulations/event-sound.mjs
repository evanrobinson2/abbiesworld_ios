// Sounds for world events, from the sound catalogue (INVARIANTS.md: no synthesis, no stand-ins).
// sitarStrum: the catalogue's plucked harp under Abbie's World music. cartoonScream: a silly falling wobble and a low spooky
// swell for the big sky events; nobody is hurt.
import {sfx} from './catalog-sfx.mjs';

export function sitarStrum(volume = 0.7) { sfx('harp', {gain: volume}); }

export function cartoonScream(volume = 0.5) { sfx('wobble', {gain: volume}); sfx('ghost', {gain: volume * .8, delay: .2}); }
