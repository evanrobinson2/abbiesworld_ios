// The ten collectible world effects (AW-STUDY-0057 Effect Hunt). Each is hidden on the Winchester board, found by driving
// to its laser beacon, and then usable forever with a 15 second real-time cooldown. The paint splat is the first one
// (Paint the World, AW-STUDY-0049); the rest are new. `built` says which ones have working art in this build.
// Hide spots are board-relative: a hex id from AbbieTown.board.hexes plus metres east (dx) and north (dy) of that hex's
// middle. The hex city thread owns Winchester and may move any spot; the hunt only reads them.
export const COOLDOWN_MS = 15000;

export const EFFECTS = [
 {id: 'paint', name: 'Paint splat', line: 'Paint drops from the sky and strange plants grow from it.', colour: '#ff4fa3', icon: '🎨', tile: 'downtown', dx: -38, dy: -24, hint: 'Café curb', built: 'paint-world', exists: true},
 {id: 'confetti', name: 'Confetti cannon', line: 'A burst of streamers. Everybody cheers.', colour: '#ffd95a', icon: '🎉', tile: 'downtown', dx: 42, dy: 30, hint: 'The common', built: 'fx'},
 {id: 'bubbles', name: 'Bubble burst', line: 'Soap bubbles lift the little things, and you, a little.', colour: '#7fe4ff', icon: '🫧', tile: 'depot-river', dx: -20, dy: 18, hint: 'By the river', built: 'fx'},
 {id: 'shrooms', name: 'Bounce mushrooms', line: 'Springy caps pop up. Drive over one and boing.', colour: '#ff7a59', icon: '🍄', tile: 'reservoir-hills', dx: 30, dy: -10, hint: 'The lookout slope', built: 'fx'},
 {id: 'fireflies', name: 'Firefly swarm', line: 'A glowing cloud that lights the way and follows you.', colour: '#c8ff5a', icon: '✨', tile: 'anis-side', dx: -34, dy: 26, hint: 'Horn Pond', built: 'fx'},
 {id: 'snow', name: 'Snow globe', line: 'Snow falls and the ground goes slippery. Drift!', colour: '#d8ecff', icon: '❄️', tile: 'neighbourhood', dx: 14, dy: -36, hint: 'A quiet cul de sac', built: 'fx'},
 {id: 'grow', name: 'Grow spray', line: 'Whatever you spray gets big for a while.', colour: '#7dff9a', icon: '🌱', tile: 'abbie-daddy-side', dx: -26, dy: -14, hint: "Abbie's garden", built: 'demo', exists: true},
 {id: 'rainbow', name: 'Rainbow arc', line: 'A rainbow bridge you can drive up and slide down.', colour: '#ff9be0', icon: '🌈', tile: 'gingerbread-hill', dx: 20, dy: 22, hint: 'The gingerbread hill', built: 'study'},
 {id: 'disco', name: 'Disco floor', line: 'The ground flashes in colours and everyone dances.', colour: '#b57bff', icon: '🪩', tile: 'downtown', dx: 8, dy: -58, hint: 'The skate park', built: 'study'},
 {id: 'moonhop', name: 'Moon hop', line: 'A pocket of low gravity. Jump very high.', colour: '#e8e4ff', icon: '🌙', tile: 'anis-side', dx: 40, dy: -20, hint: 'The launch pad', built: 'study'}
];
export const byId = Object.fromEntries(EFFECTS.map(e => [e.id, e]));

// ---- what the player has found (kept in this browser) and the cooldowns (real time, not game time)
const KEY = 'aw-effects';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };
const write = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch {} };
export const found = () => new Set(read().found || []);
export const isFound = id => found().has(id);
export const collect = id => { const s = read(), f = new Set(s.found || []); f.add(id); write({...s, found: [...f]}); return f.size; };
export const forget = () => write({});
export const allFound = () => found().size >= EFFECTS.length;
// Cooldown lives in memory: reloading the page is not a way round the 15 seconds, so also stamp it in storage.
const readyAt = {};
export const cooldownLeft = (id, now = Date.now()) => Math.max(0, (readyAt[id] ?? (read().cd || {})[id] ?? 0) - now);
export const startCooldown = (id, now = Date.now()) => { readyAt[id] = now + COOLDOWN_MS; const s = read(); write({...s, cd: {...(s.cd || {}), [id]: readyAt[id]}}); };
export const canCast = id => isFound(id) && cooldownLeft(id) === 0;

// ---- where each spot is on the board. `board` is window.AbbieTown.board (hexes, tileAt, heightAt) or the stand-in.
// `centreOf(hexId)` returns that hex's middle in board metres; the real board can offer it, else we use the ring layout.
const R3 = Math.sqrt(3), DIO_R = 105;
const BEARING = {'depot-river': 180, 'reservoir-hills': 120, neighbourhood: 240, 'anis-side': 300, 'abbie-daddy-side': 0, 'gingerbread-hill': 60};
export const hexCentre = id => id === 'downtown' ? {x: 0, y: 0} : {x: Math.sin(BEARING[id] * Math.PI / 180) * DIO_R * R3, y: Math.cos(BEARING[id] * Math.PI / 180) * DIO_R * R3};
export const spotOf = (e, board) => { const c = (board?.centreOf || hexCentre)(e.tile); return {x: c.x + e.dx, y: c.y + e.dy}; }; // board metres, east and north

// Beacons are earned in the car (Evan, 21:47Z): overhead and the notebook do not show them unless the developer cheat is on
// (localStorage aw-dev-beacons = 1, or ?cheat=beacons).
export const beaconCheat = () => { try { return localStorage.getItem('aw-dev-beacons') === '1' || /[?&]cheat=beacons/.test(location.search + (window.parent !== window ? window.parent.location.search : '')); } catch { return false; } };
