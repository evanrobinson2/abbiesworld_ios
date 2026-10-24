// Mounts the ranch chronograph on a page that has no ranch sandbox (AbbieTown, and the demo that frames it): the world
// clock (world-clock.mjs) stands in for the sandbox's controls, the chronograph (chrono.mjs) shows it, and Abbie's
// backpack docks on it (inventory.mjs). The dock sits top left like the sandbox's. Drafted 2026-10-23.
import {startWorldClock} from './world-clock.mjs?v=1';
import {ICONS} from './chrono-icons.mjs?v=1';
import {mountChrono} from './chrono.mjs?v=3';
import {inventory} from './inventory.mjs?v=13';

export function mountWorldChrono({hour} = {}) {
  if (document.getElementById('v2-chrono')) return null;
  document.documentElement.classList.add('ui-v2');
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/simulations/ui-v2.css?v=7'; document.head.append(css);
  startWorldClock({hour});
  const press = sel => { const el = document.querySelector(sel); el?.click(); return !!el; };
  const chrono = mountChrono({press, icons: ICONS});
  inventory();
  chrono.sync(); setInterval(() => chrono.sync(), 500);
  return chrono;
}
