// The Ranch's information manifest (docs/design/INFO_MANIFEST.md): what the sandbox knows, who it is for, and how
// each item could be shown. It draws nothing itself; the HUD, the grown-up workbench and the voice read it from
// window.RanchInfo and choose. Dialect: wood, bells and painted signs.
import {volunteer} from './presentation-layer.mjs';

const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>';

export function installRanchInfo({getClock, getActive}) {
  const life = () => getActive()?.life;
  const animals = () => (life()?.state.pens || []).reduce((n, p) => n + p.animals.length, 0);
  return volunteer('ranch', {place: 'ranch', dialect: 'wood, bells and painted signs', items: [
    {id: 'time-of-day', says: 'what time of day it is', kind: 'state', who: 'characters', for: ['player', 'director'],
      read: () => ({hour: getClock()?.hour ?? null, day: getClock()?.day ?? null}),
      prefer: ['none', 'diegetic', 'overlay'],
      ways: {diegetic: 'the sun and long shadows; the farm bell at dawn and supper; lamps lit in windows at dusk',
        overlay: 'the sun dial at top centre (quick glance only)'}, glyph: SUN},
    {id: 'weather', says: 'the weather', kind: 'state', who: 'characters', for: ['player', 'director'],
      read: () => life()?.state.weather ?? null,
      prefer: ['none', 'diegetic', 'meta'],
      ways: {diegetic: 'rain on the roofs, people heading for the barn, animals huddling', meta: 'a soft patter in the mix, the light dims'}},
    {id: 'season', says: 'the season', kind: 'state', who: 'characters', for: ['player', 'director'],
      read: () => life()?.state.season ?? null,
      prefer: ['none', 'diegetic'], ways: {diegetic: 'leaf colour, frost on the fences, the harvest piled by the barn'}},
    {id: 'animals', says: 'how the animals are', kind: 'count', who: 'characters', for: ['player', 'director'],
      read: () => ({count: animals()}),
      prefer: ['diegetic', 'spatial'],
      ways: {diegetic: 'animals at the trough, calling at the gate when hungry', spatial: 'a small need bubble over one animal'}},
    {id: 'ranch-ledger', says: 'the ranch ledger', kind: 'ledger', who: 'player', for: ['grown-up'],
      read: () => ({year: getClock()?.year ?? life()?.state.generations?.year ?? 0, people: life()?.workers?.length ?? 0,
        animals: animals(), chores: life()?.state.household || {}}),
      prefer: ['overlay'], ways: {overlay: 'a ledger page in the grown-up workbench: year, people, animals, chores done'}},
  ]});
}
