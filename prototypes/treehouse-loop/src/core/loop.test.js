import { describe, expect, it } from 'vitest';

import {
  MAX_MIX,
  acceptAssetPack,
  backToTreehouse,
  canPlace,
  createHome,
  currentRoom,
  drawerDecorations,
  drawerRows,
  enterRoom,
  exits,
  makeRoom,
  mix,
  openDecorator,
  openRoomHardpoints,
  placeDecoration,
  roomKits,
  takeBackDecoration,
  toggleIngredient,
  unseenCount,
} from './loop.js';
import { ASSET_PACKS, PLACEABLE_KINDS, ROOM_HARDPOINTS } from './catalog.js';

const home = (overrides) => createHome({ seed: 1, ...overrides });

describe('the drawer is pre-filtered', () => {
  it('shows decorations she has not placed', () => {
    const state = home();
    expect(drawerDecorations(state).length).toBeGreaterThan(0);
    expect(drawerDecorations(state).every((item) => item.kind === 'decoration')).toBe(true);
  });

  it('hides cards, room kits, ingredients, and places', () => {
    const state = home();
    const shown = new Set(drawerDecorations(state).map((item) => item.kind));
    expect(shown).toEqual(new Set(PLACEABLE_KINDS));
    expect(state.inventory.some((item) => item.kind === 'card')).toBe(true);
    expect(drawerDecorations(state).some((item) => item.kind === 'card')).toBe(false);
  });

  it('drops an item from the drawer once it is placed', () => {
    let state = home();
    const first = drawerDecorations(state)[0];
    state = placeDecoration(state, first.id);
    expect(drawerDecorations(state).some((item) => item.id === first.id)).toBe(false);
  });

  it('puts it back when she changes her mind', () => {
    let state = home();
    const first = drawerDecorations(state)[0];
    state = takeBackDecoration(placeDecoration(state, first.id), first.id);
    expect(drawerDecorations(state).some((item) => item.id === first.id)).toBe(true);
  });
});

describe('the MORE button', () => {
  it('is the last row of the drawer', () => {
    const rows = drawerRows(home());
    expect(rows[rows.length - 1]).toMatchObject({ type: 'more', destination: 'decorator' });
  });

  it('is still there when the drawer is empty', () => {
    let state = home();
    for (const item of [...drawerDecorations(state)]) state = placeDecoration(state, item.id);
    expect(drawerDecorations(state)).toHaveLength(0);
    expect(drawerRows(state)).toHaveLength(1);
    expect(drawerRows(state)[0].type).toBe('more');
  });

  it('opens the decorator machine and remembers the room', () => {
    const state = openDecorator(home());
    expect(state.screen).toBe('decorator');
    expect(state.returnTo.roomID).toBe(home().currentRoomID);
  });
});

describe('getting back', () => {
  it('always offers a way out of the machine', () => {
    expect(exits(openDecorator(home())).some((exit) => exit.kind === 'back')).toBe(true);
  });

  it('lands in the same room she left, for every room', () => {
    let state = home({ roomKits: ROOM_HARDPOINTS.length });
    for (const hardpoint of openRoomHardpoints(state)) state = makeRoom(state, hardpoint.id);
    for (const room of state.rooms) {
      const trip = backToTreehouse(openDecorator(enterRoom(state, room.id)));
      expect(trip.screen).toBe('treehouse');
      expect(trip.currentRoomID).toBe(room.id);
    }
  });

  it('never leaves her anywhere with no exits', () => {
    const treehouse = home();
    expect(exits(treehouse).length).toBeGreaterThan(0);
    expect(exits(openDecorator(treehouse)).length).toBeGreaterThan(0);
  });
});

describe('making rooms', () => {
  it('starts with one room and open spots for more', () => {
    const state = home();
    expect(state.rooms).toHaveLength(1);
    expect(openRoomHardpoints(state).length).toBe(ROOM_HARDPOINTS.length - 1);
  });

  it('spends a kit and moves her into the new room', () => {
    let state = home();
    const target = openRoomHardpoints(state)[0];
    state = makeRoom(state, target.id);
    expect(state.rooms).toHaveLength(2);
    expect(currentRoom(state).hardpointID).toBe(target.id);
    expect(roomKits(state)).toHaveLength(0);
  });

  it('refuses softly with no kit rather than half-building', () => {
    let state = home({ roomKits: 0 });
    const before = state.rooms.length;
    state = makeRoom(state, openRoomHardpoints(state)[0].id);
    expect(state.rooms).toHaveLength(before);
  });

  it('will not build two rooms on one hardpoint', () => {
    let state = home({ roomKits: 3 });
    const target = openRoomHardpoints(state)[0];
    state = makeRoom(state, target.id);
    const after = state.rooms.length;
    state = makeRoom(state, target.id);
    expect(state.rooms).toHaveLength(after);
  });

  it('gives a fully built treehouse plenty of spots', () => {
    let state = home({ roomKits: ROOM_HARDPOINTS.length });
    for (const hardpoint of openRoomHardpoints(state)) state = makeRoom(state, hardpoint.id);
    const spots = state.rooms.reduce((sum, room) => sum + room.slots.length, 0);
    expect(state.rooms).toHaveLength(ROOM_HARDPOINTS.length);
    expect(spots).toBeGreaterThanOrEqual(15);
  });
});

describe('placing things', () => {
  it('refuses a non-decoration', () => {
    const state = home();
    const card = state.inventory.find((item) => item.kind === 'card');
    expect(canPlace(state, card.id)).toBe(false);
    expect(placeDecoration(state, card.id).rooms).toEqual(state.rooms);
  });

  it('refuses once the room is full without losing the item', () => {
    let state = home({ startingDecorations: 8 });
    const room = currentRoom(state);
    for (let i = 0; i < room.slots.length; i += 1) {
      state = placeDecoration(state, drawerDecorations(state)[0].id);
    }
    const leftover = drawerDecorations(state)[0];
    expect(canPlace(state, leftover.id)).toBe(false);
    state = placeDecoration(state, leftover.id);
    expect(drawerDecorations(state).some((item) => item.id === leftover.id)).toBe(true);
  });

  it('clears the NEW badge when she places something', () => {
    let state = mix(openDecorator(home()));
    const madeID = state.lastMade.id;
    state = placeDecoration(backToTreehouse(state), madeID);
    expect(state.inventory.find((item) => item.id === madeID).badges).not.toContain('new');
  });
});

describe('the decorator machine', () => {
  it('puts what it makes into the one shared inventory', () => {
    const state = mix(openDecorator(home()));
    expect(drawerDecorations(state).some((item) => item.id === state.lastMade.id)).toBe(true);
  });

  it('badges what it makes so she can find it', () => {
    const state = mix(openDecorator(home()));
    expect(state.lastMade.badges).toContain('new');
    expect(state.lastMade.badges).toContain('handmade');
  });

  it('carries the made item home through the drawer', () => {
    const state = backToTreehouse(mix(openDecorator(home())));
    expect(unseenCount(state)).toBeGreaterThan(0);
  });

  it('swaps the oldest pick instead of refusing a fourth tap', () => {
    let state = openDecorator(home());
    for (const id of ['ing.kitty', 'ing.rainbow', 'ing.couch', 'ing.star']) {
      state = toggleIngredient(state, id);
    }
    expect(state.mixing).toHaveLength(MAX_MIX);
    expect(state.mixing).toContain('ing.star');
    expect(state.mixing).not.toContain('ing.kitty');
  });

  it('unpicks an ingredient she taps twice', () => {
    let state = toggleIngredient(openDecorator(home()), 'ing.kitty');
    state = toggleIngredient(state, 'ing.kitty');
    expect(state.mixing).toHaveLength(0);
  });

  it('still makes something from an empty hopper', () => {
    const state = mix(openDecorator(home()));
    expect(state.lastMade).toBeTruthy();
    expect(state.lastMade.name.length).toBeGreaterThan(0);
  });

  it('names a mix after its ingredients', () => {
    let state = openDecorator(home());
    state = toggleIngredient(state, 'ing.kitty');
    state = toggleIngredient(state, 'ing.rainbow');
    state = toggleIngredient(state, 'ing.couch');
    state = mix(state);
    expect(state.lastMade.name).toBe('Whiskery Rainbow-striped Couch');
  });

  it('emits an image prompt for what she invented', () => {
    let state = toggleIngredient(openDecorator(home()), 'ing.jelly');
    state = mix(state);
    expect(state.lastMade.prompt).toContain('wobbly jelly');
    expect(state.lastMade.prompt).toContain('no text');
  });

  it('is deterministic for a seed', () => {
    const first = mix(openDecorator(createHome({ seed: 99 })));
    const second = mix(openDecorator(createHome({ seed: 99 })));
    expect(first.lastMade.name).toBe(second.lastMade.name);
  });
});

describe('asset packs', () => {
  it('adds every item in the pack', () => {
    const pack = ASSET_PACKS[0];
    const before = drawerDecorations(openDecorator(home())).length;
    const state = acceptAssetPack(openDecorator(home()), pack.id);
    expect(drawerDecorations(state)).toHaveLength(before + pack.items.length);
  });

  it('does not duplicate when accepted twice', () => {
    let state = acceptAssetPack(openDecorator(home()), ASSET_PACKS[0].id);
    const after = drawerDecorations(state).length;
    state = acceptAssetPack(state, ASSET_PACKS[0].id);
    expect(drawerDecorations(state)).toHaveLength(after);
  });

  it('badges pack items as new', () => {
    const state = acceptAssetPack(openDecorator(home()), ASSET_PACKS[0].id);
    const packItems = drawerDecorations(state).filter((item) => item.pack === ASSET_PACKS[0].id);
    expect(packItems.every((item) => item.badges.includes('new'))).toBe(true);
  });

  it('ignores an unknown pack', () => {
    const state = openDecorator(home());
    expect(acceptAssetPack(state, 'pack.nope').inventory).toEqual(state.inventory);
  });
});
