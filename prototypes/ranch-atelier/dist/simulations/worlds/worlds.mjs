// AW-STUDY-0048 Changing worlds: the headless model of how a player (or a whole crew on the family TV) moves between
// worlds. Pure data and rules, no drawing, so the study page, the game and the director read the same thing.
// Rule of the study: rooms are DOORS, worlds are RIDES. A door joins two places in one world's story and always works
// the same way. A ride crosses between worlds and is the thing the three options (doorways, tiles, map) decide.
// Shared state follows the player: the backpack (coins, items) and the list of places already visited.
import {REGIONS} from '../abbietown/regions.mjs';

export const WORLDS = {
 town: {name: "Abbie's Town", dialect: 'town', arrive: "Main Street, and the church bell is just finishing."},
 ranch: {name: 'The Ranch', dialect: 'ranch', arrive: 'The gate squeaks. The sheep look up.'},
 launch: {name: 'Launch', dialect: 'moon', arrive: 'The pink rocket stands in the floodlights.'},
 moon: {name: 'Moon base', dialect: 'moon', arrive: 'Dark mode. The dome lights come on for you.'},
 nova: {name: 'New Nova', dialect: 'nova', arrive: 'A glass city on its own island, bright as a bell.'},
 basement: {name: "Grace's basement", dialect: 'room', arrive: 'It smells like old cardboard. Something glints.'},
 school: {name: 'Muraco school', dialect: 'town', arrive: 'The flagpole rope pings in the wind.'},
 cell: {name: 'The science lab', dialect: 'room', arrive: 'The beaker bubbles. It is green. It is looking at you.'},
};

// The ways between places. kind 'door' = a room (diegetic, always the same); 'ride' = crosses worlds.
// to = the gate you step out of on the other side, so every way there is the same way back.
export const GATES = {
 'town:cafe-cellar': {world: 'town', kind: 'door', name: 'Cellar bulkhead', to: 'basement:stairs', needs: {item: 'cafe-key'}, region: 'downtown'},
 'basement:stairs': {world: 'basement', kind: 'door', name: 'Cellar stairs', to: 'town:cafe-cellar'},
 'town:school-door': {world: 'town', kind: 'door', name: 'Muraco front door', to: 'school:door', region: 'abbie-daddy-side'},
 'school:door': {world: 'school', kind: 'door', name: 'Front door', to: 'town:school-door'},
 'town:lab-door': {world: 'town', kind: 'door', name: 'Lab door', to: 'cell:door', region: 'downtown'},
 'cell:door': {world: 'cell', kind: 'door', name: 'Lab door', to: 'town:lab-door'},
 'town:truck': {world: 'town', kind: 'ride', name: 'The black truck', to: 'launch:truck', needs: {crew: true}, region: 'downtown'},
 'launch:truck': {world: 'launch', kind: 'ride', name: 'The black truck', to: 'town:truck'},
 'launch:rocket': {world: 'launch', kind: 'ride', name: 'The pink rocket', to: 'moon:rocket', needs: {crew: true, item: 'rocket-tile'}},
 'moon:rocket': {world: 'moon', kind: 'ride', name: 'The pink rocket', to: 'launch:rocket', needs: {crew: true}},
 'town:train': {world: 'town', kind: 'ride', name: 'The train', to: 'nova:train', region: 'downtown'},
 'nova:train': {world: 'nova', kind: 'ride', name: 'The train', to: 'town:train'},
 'town:ranch-gate': {world: 'town', kind: 'ride', name: 'The ranch gate', to: 'ranch:gate', region: 'abbie-daddy-side'},
 'ranch:gate': {world: 'ranch', kind: 'ride', name: 'The ranch gate', to: 'town:ranch-gate'},
};

// What the first arrival in a place gives. Gold coins are Daddy's core memories; they live in the one shared backpack.
export const FIRST_ARRIVAL = {
 basement: {coins: 10, say: 'Ten gold coins, Daddy\'s core memories.'},
 school: {coins: 1, say: 'A coin glints on the roof.'},
 moon: {items: ['moon-key'], say: "Daddy's memory key, waiting on the pad."},
 launch: {items: ['rocket-tile'], say: 'The pink rocket tile, dropped from the sky.'},
};

// The crew and its jobs (Moon Mission: jobs, not turns). A ride that needs the crew waits until all three press.
export const CREW = [
 {id: 'abbie', name: 'Abbie', job: 'Oxygen Officer', colour: '#e0529a'},
 {id: 'ani', name: 'Ani', job: 'Lights and Radio', colour: '#8a5ad6'},
 {id: 'daddy', name: 'Daddy', job: 'Commander', colour: '#3a78c8'},
];

// The three regions of the Winchester mega-hex (stable ids from abbietown/regions.mjs).
export const REGION_IDS = REGIONS.map(r => r.id);

export const newState = (over = {}) => ({world: 'town', at: 'town:truck', backpack: {coins: 0, items: []}, visited: ['town'], ready: [], hat: 'daddy', ...over});

const has = (st, item) => st.backpack.items.includes(item);
export const pickUp = (st, item) => has(st, item) ? st : {...st, backpack: {...st.backpack, items: [...st.backpack.items, item]}};

// Can this gate be used now? couch = whole crew on the TV, so crew gates wait for every job to be pressed.
export function canUse(st, id, {couch = false} = {}) {
 const g = GATES[id]; if (!g) return {ok: false, why: 'unknown'};
 if (g.needs?.item && !has(st, g.needs.item)) return {ok: false, why: 'item:' + g.needs.item};
 if (couch && g.needs?.crew && CREW.some(c => !st.ready.includes(c.id))) return {ok: false, why: 'crew', waiting: CREW.filter(c => !st.ready.includes(c.id)).map(c => c.id)};
 return {ok: true};
}

// Step through a gate (or, from the map, land at a world's arrival gate). Returns the new state and what happened,
// each event tagged with the information mode it should use (the 2x2 plus none).
export function travel(st, id, o = {}) {
 const g = GATES[id], c = canUse(st, id, o), ev = [];
 if (!c.ok) return {state: st, ok: false, why: c.why, events: [{mode: 'none', text: c.why.startsWith('item') ? 'The way stays shut and rattles: it knows what you do not have yet.' : 'The ride waits: not everyone has pressed their job.'}]};
 return arrive(st, g.to, ev, g.kind === 'ride' ? 'ride' : 'door', o);
}
export function viaMap(st, worldId, o = {}) {
 const to = Object.keys(GATES).find(k => GATES[k].world === worldId && GATES[GATES[k].to].world === st.world && GATES[k].kind === 'ride')
  || Object.keys(GATES).find(k => GATES[k].world === worldId && GATES[k].kind === 'ride');
 return arrive(st, to, [{mode: 'overlay', text: 'The map lifts the camera; only places you have been are pinned.'}], 'map', o);
}
function arrive(st, to, ev, how, o) {
 const w = GATES[to].world, first = !st.visited.includes(w);
 let s = {...st, world: w, at: to, ready: [], visited: first ? [...st.visited, w] : st.visited};
 ev.push({mode: 'diegetic', text: WORLDS[w].arrive});
 const f = first && FIRST_ARRIVAL[w];
 if (f) {
  if (f.coins) s = {...s, backpack: {...s.backpack, coins: s.backpack.coins + f.coins}};
  for (const it of f.items || []) s = pickUp(s, it);
  ev.push({mode: 'meta', text: f.say + ' (the backpack counted it)'});
 }
 ev.push({mode: 'spatial', text: 'A pin settles over the way back: ' + GATES[to].name + '.'});
 if (o.couch) { const i = CREW.findIndex(c => c.id === s.hat); s = {...s, hat: CREW[(i + 1) % CREW.length].id}; ev.push({mode: 'overlay', text: "The Captain's Hat moves to " + CREW[(i + 1) % CREW.length].name + '.'}); }
 return {state: s, ok: true, how, first, events: ev};
}

// The vote on the family TV: a majority wins; a tie goes to whoever holds the Captain's Hat.
export function tally(votes, hat) {
 const yes = Object.values(votes).filter(v => v === 'go').length, no = Object.values(votes).filter(v => v === 'stay').length;
 return yes === no ? {go: votes[hat] === 'go', by: 'hat'} : {go: yes > no, by: 'majority'};
}

// Core-memory places: the family can go back to a place that holds a coin, once they have been there (never before).
export const MEMORY_PLACES = ['basement', 'school', 'moon'];
export const memoryTrips = st => MEMORY_PLACES.filter(w => st.visited.includes(w));
// Hold a gold coin up and remember: the coin hums, the place builds itself round the family. Only places already visited.
export function viaMemory(st, worldId, o = {}) {
 if (!memoryTrips(st).includes(worldId)) return {state: st, ok: false, why: 'never-been', events: [{mode: 'none', text: 'The coin stays quiet. You have not made that memory yet.'}]};
 const to = Object.keys(GATES).find(k => GATES[k].world === worldId);
 return arrive(st, to, [{mode: 'meta', text: 'The coin warms in your hand and hums. Everyone feels it.'}], 'memory', o);
}
