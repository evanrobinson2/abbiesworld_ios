// The carwash and the Moon Buggy, started from the town page: registers the buggy with the hunt, builds the carwash on Main Street,
// and gives her buggy a button on the left bar once it is hers. One import in the town template; everything else is in this folder.
import {registerBuggy} from './buggy.mjs';
import {place} from './carwash.mjs';
import {mountGarage} from './garage.mjs';
export function start(AT = window.AbbieTown) {
 if (!AT?.stage || !AT?.board || window.__carwash) return window.__carwash || null;
 registerBuggy(); const carwash = place(AT), garage = mountGarage(AT, carwash);
 return window.__carwash = {carwash, garage};
}
