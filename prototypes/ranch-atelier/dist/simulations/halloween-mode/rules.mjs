// Halloween mode for Winchester: the rules, with no drawing in them so a headless test can run every one (Evan, 2026-10-24
// 01:09Z: "add a halloween mode ... the world needs you to be able to interact with it"). Drafted behind an experimental flag.
//
//   mode({date, search, stored})  -> {on, why}     whether the town is in Halloween mode right now
//   pickDoors(houses, {seed})     -> doors         which houses hand out treats (the same ones every night)
//   knock(night, door)            -> {kind, ...}   what happens when she knocks: a treat, a charm, or "already got one"
//
// Tone: PG and cute, never scary. Rewards are backpack items and one charm, never coins (Evan, 2026-10-23 20:51Z).

export const SEASON = {from: [10, 24], to: [11, 1]}; // Oct 24 to Nov 1: the world is always today and now, so it comes on by itself
export const CHARM_AT = 5; // doors in one night for the pumpkin charm
export const MAX_DOORS_PER_HEX = 7, MIN_GAP = 22; // metres between two doors on one hex, so each house is its own stop

const flagOn = (stored, name) => String(stored?.experimental || '').split(',').includes(name);

// Order of say: the dev toggle (?halloween=on|off|auto, remembered) beats the date. The date only counts once the
// experiment is switched on (?experimental=halloween, remembered), so nothing changes for players until it has been tested live.
export function mode({date = new Date(), search = '', stored = {}} = {}) {
  const q = new URLSearchParams(search), force = (q.get('halloween') || stored.halloween || 'auto').toLowerCase();
  if (['off', '0', 'false'].includes(force)) return {on: false, why: 'switched off'};
  if (['on', '1', 'true'].includes(force)) return {on: true, why: 'switched on'};
  const m = date.getMonth() + 1, d = date.getDate(), [fm, fd] = SEASON.from, [tm, td] = SEASON.to;
  const inSeason = (m === fm && d >= fd) || (m === tm && d <= td);
  if (!inSeason) return {on: false, why: 'not the season'};
  if (!flagOn({experimental: q.get('experimental') || q.get('exp') || stored.experimental}, 'halloween')) return {on: false, why: 'experiment not switched on'};
  return {on: true, why: 'the season'};
}
// The rule that makes the flag stick: ?experimental=halloween joins the stored list, ?experimental=off clears it.
export function nextStored(search = '', stored = {}) {
  const q = new URLSearchParams(search), out = {...stored}, e = q.get('experimental') || q.get('exp'), h = q.get('halloween'); // ?exp=name is the games' shorthand
  if (e === 'off') out.experimental = ''; else if (e) out.experimental = [...new Set([...String(stored.experimental || '').split(',').filter(Boolean), ...e.split(',')])].join(',');
  if (h) out.halloween = h === 'auto' ? '' : h;
  return out;
}
export const nightKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// houses: {x, z, yaw, tier} in a hex's own frame (house front is +z, as in the town's decorator). Returns doors with a porch point in front.
export function pickDoors(houses = [], {seed = 1, max = MAX_DOORS_PER_HEX, gap = MIN_GAP, porch = 5.8} = {}) {
  const order = houses.map((h, i) => ({h, i, r: hash(seed * 31 + i * 7 + h.x * .13 + h.z * .17)})).sort((a, b) => a.r - b.r);
  const out = [];
  for (const {h, i} of order) {
    if (out.length >= max) break;
    if (out.some(o => Math.hypot(o.house.x - h.x, o.house.z - h.z) < gap)) continue;
    out.push({id: `${seed}:${i}`, house: h, x: h.x + Math.sin(h.yaw) * porch, z: h.z + Math.cos(h.yaw) * porch, yaw: h.yaw, tier: h.tier || 0});
  }
  return out;
}

export const TREATS = [
  {kind: 'candy-corn', name: 'Candy corn', icon: '🍬', thought: 'Candy corn! Orange, yellow and white.'},
  {kind: 'lollipop', name: 'Swirly lollipop', icon: '🍭', thought: 'A swirly lollipop. I will save it.'},
  {kind: 'caramel-apple', name: 'Caramel apple', icon: '🍎', thought: 'A caramel apple, still a bit warm.'},
  {kind: 'choc-bar', name: 'Mini chocolate bar', icon: '🍫', thought: 'A tiny chocolate bar. Perfect.'},
  {kind: 'gummy-worm', name: 'Gummy worm', icon: '🪱', thought: 'A gummy worm. Wiggly!'},
  {kind: 'popcorn-ball', name: 'Popcorn ball', icon: '🍿', thought: 'A popcorn ball, sticky and sweet.'},
  {kind: 'ghost-cookie', name: 'Ghost cookie', icon: '👻', thought: 'A ghost cookie! Boo, yum.'}
];
// What the person at the door says: kind and silly, every line fine for a five year old.
export const GREETINGS = ['Oh my, a visitor! Happy Halloween!', 'Boo! ...Did I scare you? I did not mean to.', 'What a splendid costume! Come in, come in.', 'The pumpkins told me you were coming.', 'A very happy Halloween to you!', 'Welcome, welcome! The porch light was on for you.'];
export const AGAIN = ['You already have one from me. Try the next house!', 'My bowl is empty now. The neighbours still have some!', 'Sweets all gone, but happy Halloween again!'];

// night: {date, answered: [doorId], treats: n}. One treat per door per night, so every sweet is accounted for.
export const freshNight = date => ({date, answered: [], treats: 0});
export function knock(night, door, {rand = Math.random} = {}) {
  if (night.answered.includes(door.id)) return {kind: 'again', say: AGAIN[Math.floor(rand() * AGAIN.length)]};
  const treat = TREATS[Math.floor(hash(door.x * 3.1 + door.z * 1.7) * TREATS.length) % TREATS.length];
  const say = GREETINGS[Math.floor(rand() * GREETINGS.length)];
  return {kind: 'treat', say, treat: {id: `hw-${nightKey(new Date(night.date))}-${door.id}`, name: treat.name, icon: treat.icon, from: 'Trick-or-treating', thought: treat.thought}, door};
}
// Called once the treat is really in the backpack. Returns the new night, and whether the pumpkin charm has just been earned.
export function answered(night, door) {
  if (night.answered.includes(door.id)) return {night, charm: false};
  const next = {...night, answered: [...night.answered, door.id], treats: night.treats + 1};
  return {night: next, charm: next.treats === CHARM_AT};
}

// The spooky-cute grade the town takes on: dusk purples and warm amber, weighted by how dark it is (hour 0-24).
export function grade(hour) {
  const dark = 1 - Math.max(0, Math.sin(Math.PI * (hour - 6) / 12)); // 0 at noon, 1 at night
  return {w: 0.55 + 0.4 * dark, dark, bg: '#2a1d3f', sky: '#8f7bd0', gnd: '#5a3a3a', sun: '#ffb26b', sunI: 0.9 + 0.5 * (1 - dark), hemiI: 0.75 + 0.2 * (1 - dark)};
}
