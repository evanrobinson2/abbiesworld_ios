// The town's entrance registry: where each door, ride and beaker in Abbie's Town leads, and how a game finds its way back.
// Keys are the gate ids of simulations/worlds/worlds.mjs (the changing-worlds model). No real addresses anywhere.
// A game opened from the town is given ?from=<encoded back URL>; it returns the player with location.href = from.
// Back URL shape: /town?at=<gate id>. The town then flies to that gate's scene (see AbbieTown.scenes).
export const TOWN_PATH = '/town';
export const backUrl = gate => `${TOWN_PATH}?at=${encodeURIComponent(gate)}`;

// kind: 'door' = leaves for a page, 'ride' = leaves for a page, 'stage' = plays inside the town (a module mounts on AbbieTown.stage).
// scene: the AbbieTown scene id the player stands in when they use it. needs: {item} a backpack item (see worlds.mjs canUse).
export const ENTRANCES = {
  'town:cafe-door': {name: 'The café', kind: 'door', region: 'downtown', scene: 'cafe-curb', url: '/studies/cafe/diorama.html?from=town', owner: 'AW-STUDY-0013',
    note: 'Also the door back: the café diorama sends the player to /town?at=town:cafe-door.'},
  'town:cafe-cellar': {name: 'Cellar bulkhead', kind: 'door', region: 'downtown', scene: 'cafe-curb', via: 'town:cafe-door', url: '/studies/basement/play.html?from=cafe', needs: {item: 'cafe-key'}, owner: 'AW-STUDY-0024',
    unlock: "localStorage 'aw-basement-unlocked' (simulations/cafe-key.mjs)", back: '/studies/cafe/diorama.html?from=basement',
    note: 'Reached from inside the café. The basement returns to the café diorama, and the café front door returns to the town.'},
  // 'town:lab-door' (the science lab beaker) is parked: Evan took the cell game off the town on 2026-10-23 ("it's not ready"; the science adventure becomes the high school game after Moon Base). The game's code stays; to bring it back, restore the 'lab' hero in dioramas.block.js and this entrance.
  'town:truck': {name: 'The black truck', kind: 'stage', region: 'downtown', scene: 'bakery-curb', needs: {crew: true}, module: 'moon-mission', owner: 'AW-STUDY-0036',
    note: 'The mission mounts on AbbieTown.stage at the café curb; its scenes are registered with AbbieTown.registerScene.'},
  'town:launch': {name: 'Launch', kind: 'stage', region: 'abbie-daddy-side', scene: 'launch-pad', module: 'moon-mission', owner: 'AW-STUDY-0036',
    note: 'The rocket port on the road north of the home hex. Walk here from Downtown (AbbieTown.walk).'},
  'town:school-door': {name: 'Muraco front door', kind: 'door', region: 'abbie-daddy-side', scene: 'school-door', url: `/studies/school/play.html?from=${encodeURIComponent(backUrl('town:school-door'))}`, owner: 'AW-STUDY-0032'},
  // AW-STUDY-0054: the toy-car coaster built in the skate park by the high school. Scene 'skate-park' is the hex city thread's pad
  // (AbbieTown.stage.tiles.downtown.spots.skatepark); AbbieTown.enterScene('skate-park') flies there, the ride opens from it.
  'town:skate-park': {name: 'The toy-car coaster', kind: 'ride', region: 'downtown', scene: 'skate-park', url: `/studies/coaster/play.html?from=${encodeURIComponent(backUrl('town:skate-park'))}`, owner: 'AW-STUDY-0054',
    grants: ['toy-car charm'], note: 'A 30 second first-person ride. The page flows down from the tile view to the track by itself; from the town, open it with ?skip=tile to start already zoomed in.'},
  'town:ranch-gate': {name: 'The ranch gate', kind: 'ride', region: 'abbie-daddy-side', scene: 'dio-abbie-daddy-side', url: '/?from=town', owner: 'ranch'},
};

// Where a page should send the player to come back: its own ?from, else the registry's back URL for its gate.
export const returnTo = (gate, from) => from || ENTRANCES[gate]?.back || backUrl(gate);
export const available = (gate, st = {}) => { const e = ENTRANCES[gate]; if (!e) return false; return !e.needs || (e.needs.item ? (st.items || []).includes(e.needs.item) : !!st[Object.keys(e.needs)[0]]); };
