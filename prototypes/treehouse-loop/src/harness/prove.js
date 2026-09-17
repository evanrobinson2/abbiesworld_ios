// Headless proof of the treehouse loop.
//
// Walks the whole journey as text — decorate a room, run out of stuff, take
// the MORE door, mix something, accept a pack, come back, place what she made
// — and then checks the properties that make it safe to hand to a six year
// old: no dead ends, no clutter in the drawer, and one shared inventory.

import {
  acceptAssetPack,
  backToTreehouse,
  createHome,
  currentRoom,
  drawerDecorations,
  drawerRows,
  enterRoom,
  exits,
  makeRoom,
  mix,
  moveDecoration,
  openDecorator,
  openRoomHardpoints,
  placeDecoration,
  renderText,
  roomKits,
  takeBackDecoration,
  toggleIngredient,
  unseenCount,
} from '../core/loop.js';
import { ASSET_PACKS, INGREDIENTS, PLACEABLE_KINDS, ROOM_HARDPOINTS } from '../core/catalog.js';

const failures = [];
const check = (label, ok) => {
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}`);
  if (!ok) failures.push(label);
};
const heading = (text) =>
  console.log(`\n${'='.repeat(72)}\n${text}\n${'='.repeat(72)}`);
const screen = (state, note) => {
  console.log(`\n-- ${note} --`);
  console.log(renderText(state));
};

heading('THE TREEHOUSE LOOP — headless proof');
console.log('More places to put her stuff, and a door to go get more stuff.');

let state = createHome({ seed: 7 });
screen(state, 'she arrives downstairs');

// Fill the room she starts in.
for (const item of [...drawerDecorations(state)]) {
  state = placeDecoration(state, item.id);
}
screen(state, 'she places everything she owns');
check('drawer is now empty of decorations', drawerDecorations(state).length === 0);
check(
  'the MORE door is still there with an empty drawer',
  drawerRows(state).length === 1 && drawerRows(state)[0].type === 'more'
);

// Make a new room: more places to put her stuff.
const firstOpen = openRoomHardpoints(state)[0];
state = makeRoom(state, firstOpen.id);
screen(state, `she builds the ${firstOpen.name}`);
check('a new room exists', state.rooms.length === 2);
check('she is standing in the room she just made', currentRoom(state).hardpointID === firstOpen.id);
check('the room kit was spent', roomKits(state).length === 0);

// Out of kits: building again must fail softly, not crash or half-build.
const beforeRooms = state.rooms.length;
state = makeRoom(state, openRoomHardpoints(state)[0].id);
check('building with no kit changes nothing', state.rooms.length === beforeRooms);

// Take the MORE door.
state = openDecorator(state);
screen(state, 'she taps MORE and arrives at the machine');
check('she is at the decorator machine', state.screen === 'decorator');
check('the machine remembers the room she left', state.returnTo.roomID !== null);
check('the machine offers a way back', exits(state).some((exit) => exit.kind === 'back'));

// Mix something zany.
state = toggleIngredient(state, 'ing.kitty');
state = toggleIngredient(state, 'ing.rainbow');
state = toggleIngredient(state, 'ing.couch');
screen(state, 'she loads the hopper');
state = mix(state);
screen(state, 'she pulls the lever');
check('the machine made something', Boolean(state.lastMade));
check('it went into the one shared inventory', drawerDecorations(state).some((i) => i.id === state.lastMade.id));
check('it is badged so she can find it', state.lastMade.badges.includes('new'));
console.log(`  (it made: "${state.lastMade.name}")`);

// A fourth ingredient should swap the oldest out rather than refuse her tap.
state = toggleIngredient(state, 'ing.star');
state = toggleIngredient(state, 'ing.dino');
state = toggleIngredient(state, 'ing.cake');
state = toggleIngredient(state, 'ing.jelly');
check('a fourth pick swaps instead of refusing', state.mixing.length === 3);
check('the newest pick is in the hopper', state.mixing.includes('ing.jelly'));

// An empty hopper must still produce something.
state = { ...state, mixing: [] };
state = mix(state);
check('pulling the lever with an empty hopper still makes something', Boolean(state.lastMade));

// Accept a whole pack.
state = acceptAssetPack(state, ASSET_PACKS[0].id);
screen(state, 'she accepts the Cozy Night Pack');
check('the pack added its items', drawerDecorations(state).length >= ASSET_PACKS[0].items.length);

const countAfterPack = drawerDecorations(state).length;
state = acceptAssetPack(state, ASSET_PACKS[0].id);
check('accepting the same pack twice does not duplicate', drawerDecorations(state).length === countAfterPack);

// Go home and use what she made.
const waiting = unseenCount(state);
state = backToTreehouse(state);
screen(state, 'she goes back to her treehouse');
check('she lands back in the room she left', currentRoom(state).hardpointID === firstOpen.id);
check('what she made is waiting in the drawer', unseenCount(state) === waiting);

const made = drawerDecorations(state).find((item) => item.badges.includes('handmade'));
state = placeDecoration(state, made.id, { x: 0.22, y: 0.64 });
state = moveDecoration(state, made.id, { x: 0.28, scale: 1.4, rotation: 8 });
screen(state, 'she drops the thing she invented and nudges it');
check('the handmade piece is in the room', currentRoom(state).placements.some((p) => p.decorationID === made.id));
check('placing it cleared its NEW badge', !state.inventory.find((i) => i.id === made.id).badges.includes('new'));

// And she can change her mind.
state = takeBackDecoration(state, made.id);
check('she can take it back out again', drawerDecorations(state).some((i) => i.id === made.id));

heading('PROPERTIES THAT MAKE IT SAFE TO HAND HER');

// 1. The drawer is never polluted with things she cannot place.
let drawerAlwaysClean = true;
for (const row of drawerRows(state)) {
  if (row.type === 'decoration' && !PLACEABLE_KINDS.includes(row.item.kind)) {
    drawerAlwaysClean = false;
  }
}
const clutter = state.inventory.filter((item) => !PLACEABLE_KINDS.includes(item.kind));
check('the drawer shows only placeable decorations', drawerAlwaysClean);
check(`${clutter.length} cards/kits/ingredients stay out of the drawer`, clutter.length > 0);

// 2. No dead ends, from any reachable state.
let deadEnd = null;
const seen = new Set();
const frontier = [createHome({ seed: 3 })];
let visited = 0;
while (frontier.length && visited < 400) {
  const node = frontier.pop();
  visited += 1;
  const key = `${node.screen}|${node.currentRoomID}|${node.rooms.length}|${drawerDecorations(node).length}`;
  if (seen.has(key)) continue;
  seen.add(key);

  if (exits(node).length === 0) {
    deadEnd = node;
    break;
  }
  // Explore: every room, the MORE door, and back again.
  if (node.screen === 'treehouse') {
    frontier.push(openDecorator(node));
    for (const room of node.rooms) frontier.push(enterRoom(node, room.id));
    const open = openRoomHardpoints(node);
    if (open.length && roomKits(node).length) frontier.push(makeRoom(node, open[0].id));
    const placeable = drawerDecorations(node);
    if (placeable.length) frontier.push(placeDecoration(node, placeable[0].id));
  } else {
    frontier.push(backToTreehouse(node));
    frontier.push(mix(node));
    frontier.push(acceptAssetPack(node, ASSET_PACKS[0].id));
  }
}
check(`no dead end in ${visited} reachable states`, deadEnd === null);

// 3. The machine always sends her back to a real room.
let alwaysLands = true;
for (const room of state.rooms) {
  const trip = backToTreehouse(openDecorator(enterRoom(state, room.id)));
  if (trip.currentRoomID !== room.id || trip.screen !== 'treehouse') alwaysLands = false;
}
check('MORE then back always returns to the same room', alwaysLands);

// 4. Every room hardpoint can actually be built on.
let allBuildable = true;
let big = createHome({ seed: 5, roomKits: ROOM_HARDPOINTS.length });
for (const hardpoint of ROOM_HARDPOINTS) {
  if (big.rooms.some((room) => room.hardpointID === hardpoint.id)) continue;
  big = makeRoom(big, hardpoint.id);
  if (!big.rooms.some((room) => room.hardpointID === hardpoint.id)) allBuildable = false;
}
check(`all ${ROOM_HARDPOINTS.length} room hardpoints can be built`, allBuildable);
check('every room hardpoint is now used', openRoomHardpoints(big).length === 0);
console.log(`  (fully built: ${big.rooms.length} rooms, each an open canvas)`);

// Decorations are free-placed, so a room never fills up.
let crowded = createHome({ seed: 11, startingDecorations: 30 });
while (drawerDecorations(crowded).length) {
  crowded = placeDecoration(crowded, drawerDecorations(crowded)[0].id, {
    x: Math.random(),
    y: Math.random(),
  });
}
check('a room accepts 30 decorations with no capacity limit', currentRoom(crowded).placements.length === 30);
check('nothing was dropped on the floor', drawerDecorations(crowded).length === 0);

// 5. Never a room she cannot get out of.
check(
  'every built room offers at least the MORE door',
  big.rooms.every((room) => exits(enterRoom(big, room.id)).length >= 1)
);

// 6. Mixing is deterministic for a seed.
const a = mix(openDecorator(createHome({ seed: 21 })));
const b = mix(openDecorator(createHome({ seed: 21 })));
check('same seed mixes the same surprise', a.lastMade.name === b.lastMade.name);

heading('WHAT THE MACHINE CAN MAKE');
let sampler = openDecorator(createHome({ seed: 1 }));
for (let i = 0; i < 6; i += 1) {
  const picks = [
    INGREDIENTS[i % INGREDIENTS.length].id,
    INGREDIENTS[(i * 3 + 1) % INGREDIENTS.length].id,
    INGREDIENTS[(i * 5 + 2) % INGREDIENTS.length].id,
  ];
  sampler = { ...sampler, mixing: [] };
  for (const pick of picks) sampler = toggleIngredient(sampler, pick);
  sampler = mix(sampler);
  console.log(`  ${sampler.lastMade.name}`);
}
console.log('\n  example prompt handed to image gen:');
console.log(`    ${sampler.lastMade.prompt}`);

heading(failures.length ? `FAILED (${failures.length})` : 'ALL PROPERTIES HELD');
for (const failure of failures) console.log(`  - ${failure}`);
process.exit(failures.length ? 1 : 0);
