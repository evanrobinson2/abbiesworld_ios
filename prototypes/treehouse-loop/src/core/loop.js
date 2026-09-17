// The whole treehouse loop as a pure reducer.
//
//   treehouse -> drawer (decorations only) -> MORE -> decorator machine
//        ^                                                  |
//        +------------------ back to the room she left ------+
//
// The properties this file exists to guarantee:
//   1. The drawer never shows anything she cannot place.
//   2. The drawer always offers MORE, even when it is empty.
//   3. There is never a dead end: every screen has a way back to a room.
//   4. One inventory. Something made in the machine is in the drawer the
//      moment she returns, with a badge on it.

import {
  ASSET_PACKS,
  INGREDIENTS,
  PLACEABLE_KINDS,
  ROOM_HARDPOINTS,
  assetPack,
  ingredient,
  roomHardpoint,
} from './catalog.js';
import { hashSeed, rngAt } from './rng.js';

export const MAX_MIX = 3;

let autoId = 0;
function nextId(prefix, state) {
  autoId += 1;
  return `${prefix}.${state.seed}.${autoId}`;
}

// A room is a free canvas. Decorations land wherever she taps and can be
// nudged afterwards; nothing snaps and there is no capacity.
function buildRoom(hardpointID, name) {
  return {
    id: `room.${hardpointID}`,
    hardpointID,
    name,
    placements: [],
  };
}

export function createHome({ seed = 1, startingDecorations = 3, roomKits = 1 } = {}) {
  const rooms = [];
  for (const hardpoint of ROOM_HARDPOINTS) {
    if (hardpoint.startsBuilt) {
      rooms.push(buildRoom(hardpoint.id, hardpoint.name));
    }
  }

  const inventory = [];
  const starters = ['Acorn Stool', 'Leaf Rug', 'Twig Lamp', 'Bark Shelf'];
  for (let i = 0; i < startingDecorations; i += 1) {
    inventory.push({
      id: `dec.starter.${i}`,
      name: starters[i % starters.length],
      kind: 'decoration',
      placed: false,
      badges: ['starter'],
    });
  }
  for (let i = 0; i < roomKits; i += 1) {
    inventory.push({
      id: `kit.starter.${i}`,
      name: 'Room Kit',
      kind: 'roomKit',
      placed: false,
      badges: ['starter'],
    });
  }
  // Deliberate clutter: these must never appear in the decoration drawer.
  inventory.push(
    { id: 'card.1', name: 'Ninja Bunny Card', kind: 'card', placed: false, badges: [] },
    { id: 'ing.1', name: 'Glitter Jar', kind: 'ingredient', placed: false, badges: [] },
    { id: 'place.1', name: 'World Seed', kind: 'place', placed: false, badges: [] }
  );

  return {
    seed: hashSeed(seed),
    screen: 'treehouse',
    currentRoomID: rooms[0]?.id ?? null,
    returnTo: null,
    rooms,
    inventory,
    mixing: [],
    lastMade: null,
    rngCursor: 0,
    log: ['enter treehouse'],
  };
}

// ---------------------------------------------------------------- selectors

export function currentRoom(state) {
  return state.rooms.find((room) => room.id === state.currentRoomID) ?? null;
}

export function openRoomHardpoints(state) {
  const taken = new Set(state.rooms.map((room) => room.hardpointID));
  return ROOM_HARDPOINTS.filter((hardpoint) => !taken.has(hardpoint.id));
}

/// The drawer contents. Pre-filtered: decorations she has not placed yet.
export function drawerDecorations(state) {
  return state.inventory.filter(
    (item) => PLACEABLE_KINDS.includes(item.kind) && !item.placed
  );
}

/// What the drawer actually renders, MORE included. The button is a row in the
/// list rather than a special case in the view, so it cannot go missing.
export function drawerRows(state) {
  return [
    ...drawerDecorations(state).map((item) => ({ type: 'decoration', item })),
    { type: 'more', label: 'More…', destination: 'decorator' },
  ];
}

export function roomKits(state) {
  return state.inventory.filter((item) => item.kind === 'roomKit' && !item.placed);
}

export function unseenCount(state) {
  return drawerDecorations(state).filter((item) => item.badges.includes('new')).length;
}

/// Every route out of the current screen. Used to prove there are no dead ends.
export function exits(state) {
  if (state.screen === 'treehouse') {
    const routes = state.rooms
      .filter((room) => room.id !== state.currentRoomID)
      .map((room) => ({ kind: 'room', to: room.id, label: room.name }));
    routes.push({ kind: 'drawer', to: 'decorator', label: 'More…' });
    return routes;
  }
  if (state.screen === 'decorator') {
    return [{ kind: 'back', to: state.returnTo?.roomID ?? null, label: 'Back to my treehouse' }];
  }
  return [];
}

/// Placeable if it is an unplaced decoration and she is standing in a room.
/// There is no capacity check: a room never fills up.
export function canPlace(state, itemID) {
  const item = state.inventory.find((entry) => entry.id === itemID);
  if (!item || item.placed) return false;
  if (!PLACEABLE_KINDS.includes(item.kind)) return false;
  return Boolean(currentRoom(state));
}

// ------------------------------------------------------------------ actions

export function enterRoom(state, roomID) {
  if (!state.rooms.some((room) => room.id === roomID)) return state;
  return {
    ...state,
    screen: 'treehouse',
    currentRoomID: roomID,
    log: [...state.log, `enter room ${roomID}`],
  };
}

/// Spend a Room Kit on an open room hardpoint. This is "make a new room".
export function makeRoom(state, hardpointID) {
  const hardpoint = roomHardpoint(hardpointID);
  if (!hardpoint) return state;
  if (state.rooms.some((room) => room.hardpointID === hardpointID)) {
    return { ...state, log: [...state.log, `room exists at ${hardpointID}`] };
  }
  const kit = roomKits(state)[0];
  if (!kit) return { ...state, log: [...state.log, 'no room kit'] };

  const room = buildRoom(hardpoint.id, hardpoint.name);
  return {
    ...state,
    rooms: [...state.rooms, room],
    inventory: state.inventory.map((item) =>
      item.id === kit.id ? { ...item, placed: true } : item
    ),
    currentRoomID: room.id,
    screen: 'treehouse',
    log: [...state.log, `made room ${room.id}`],
  };
}

/// Drop a decoration anywhere in the room. Position is free and optional: a
/// tap with no coordinates lands it in the middle for her to nudge later.
export function placeDecoration(state, itemID, at = {}) {
  if (!canPlace(state, itemID)) {
    return { ...state, log: [...state.log, `cannot place ${itemID}`] };
  }
  const room = currentRoom(state);
  const placement = {
    decorationID: itemID,
    x: clamp01(at.x ?? 0.5),
    y: clamp01(at.y ?? 0.5),
    scale: at.scale ?? 1,
    rotation: at.rotation ?? 0,
  };
  return {
    ...state,
    rooms: state.rooms.map((entry) =>
      entry.id !== room.id ? entry : { ...entry, placements: [...entry.placements, placement] }
    ),
    inventory: state.inventory.map((item) =>
      // Placing also clears the NEW badge: she has plainly seen it now.
      item.id === itemID
        ? { ...item, placed: true, badges: item.badges.filter((b) => b !== 'new') }
        : item
    ),
    log: [...state.log, `place ${itemID} in ${room.id} at ${placement.x},${placement.y}`],
  };
}

/// Nudge something she already placed. Free transform, no snapping.
export function moveDecoration(state, itemID, change = {}) {
  const room = currentRoom(state);
  if (!room) return state;
  if (!room.placements.some((entry) => entry.decorationID === itemID)) return state;
  return {
    ...state,
    rooms: state.rooms.map((entry) =>
      entry.id !== room.id
        ? entry
        : {
            ...entry,
            placements: entry.placements.map((placement) =>
              placement.decorationID !== itemID
                ? placement
                : {
                    ...placement,
                    x: clamp01(change.x ?? placement.x),
                    y: clamp01(change.y ?? placement.y),
                    scale: change.scale ?? placement.scale,
                    rotation: change.rotation ?? placement.rotation,
                  }
            ),
          }
    ),
    log: [...state.log, `move ${itemID}`],
  };
}

export function takeBackDecoration(state, itemID) {
  const room = currentRoom(state);
  if (!room) return state;
  return {
    ...state,
    rooms: state.rooms.map((entry) =>
      entry.id !== room.id
        ? entry
        : {
            ...entry,
            placements: entry.placements.filter((entry2) => entry2.decorationID !== itemID),
          }
    ),
    inventory: state.inventory.map((item) =>
      item.id === itemID ? { ...item, placed: false } : item
    ),
    log: [...state.log, `take back ${itemID}`],
  };
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

/// The MORE button. Remembers where she was so the machine can send her back.
export function openDecorator(state) {
  return {
    ...state,
    screen: 'decorator',
    returnTo: { screen: 'treehouse', roomID: state.currentRoomID },
    mixing: [],
    lastMade: null,
    log: [...state.log, 'open decorator machine'],
  };
}

export function backToTreehouse(state) {
  const roomID = state.returnTo?.roomID ?? state.rooms[0]?.id ?? null;
  return {
    ...state,
    screen: 'treehouse',
    currentRoomID: roomID,
    returnTo: null,
    mixing: [],
    log: [...state.log, `back to treehouse (${roomID})`],
  };
}

export function toggleIngredient(state, ingredientID) {
  if (state.screen !== 'decorator') return state;
  if (!ingredient(ingredientID)) return state;
  if (state.mixing.includes(ingredientID)) {
    return {
      ...state,
      mixing: state.mixing.filter((id) => id !== ingredientID),
      log: [...state.log, `unpick ${ingredientID}`],
    };
  }
  if (state.mixing.length >= MAX_MIX) {
    // Oldest falls out rather than refusing her tap.
    return {
      ...state,
      mixing: [...state.mixing.slice(1), ingredientID],
      log: [...state.log, `pick ${ingredientID} (swapped oldest out)`],
    };
  }
  return { ...state, mixing: [...state.mixing, ingredientID], log: [...state.log, `pick ${ingredientID}`] };
}

/// Mix whatever is picked into a new decoration. Forgiving: one ingredient is
/// enough, and an empty hopper gets a seeded surprise rather than an error.
export function mix(state) {
  if (state.screen !== 'decorator') return state;

  let picks = state.mixing.map(ingredient).filter(Boolean);
  let rngCursor = state.rngCursor;
  if (picks.length === 0) {
    const roll = rngAt(state.seed, rngCursor);
    rngCursor += 1;
    picks = [INGREDIENTS[Math.floor(roll * INGREDIENTS.length) % INGREDIENTS.length]];
  }

  const name = nameFor(picks);
  const item = {
    id: nextId('dec.made', state),
    name,
    kind: 'decoration',
    placed: false,
    badges: ['new', 'handmade', 'oneOfAKind'],
    recipe: picks.map((entry) => entry.id),
    prompt: promptFor(picks),
  };

  return {
    ...state,
    rngCursor,
    inventory: [...state.inventory, item],
    mixing: [],
    lastMade: item,
    log: [...state.log, `made ${item.name}`],
  };
}

export function acceptAssetPack(state, packID) {
  const pack = assetPack(packID);
  if (!pack || state.screen !== 'decorator') return state;
  const items = pack.items.map((itemName, index) => ({
    id: `dec.pack.${pack.id}.${index}`,
    name: itemName,
    kind: 'decoration',
    placed: false,
    badges: ['new', 'fromPack'],
    pack: pack.id,
  }));
  const existing = new Set(state.inventory.map((item) => item.id));
  const fresh = items.filter((item) => !existing.has(item.id));
  return {
    ...state,
    inventory: [...state.inventory, ...fresh],
    lastMade: fresh[0] ?? state.lastMade,
    log: [...state.log, `accept pack ${pack.id} (+${fresh.length})`],
  };
}

// ------------------------------------------------------------------ naming

function nameFor(picks) {
  if (picks.length === 1) return `${capitalize(picks[0].adjective)} ${capitalize(picks[0].noun)}`;
  const base = picks[picks.length - 1];
  const modifiers = picks.slice(0, -1).map((entry) => entry.adjective);
  return `${modifiers.map(capitalize).join(' ')} ${capitalize(base.noun)}`;
}

function promptFor(picks) {
  const parts = picks.map((entry) => `${entry.adjective} ${entry.noun}`);
  return (
    `a single piece of furniture that is ${parts.join(' and ')}, ` +
    'storybook illustration, soft rounded shapes, thick clean outlines, ' +
    'centered on a plain background, no text'
  );
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ------------------------------------------------------------------ display

export function renderText(state) {
  const lines = [];
  if (state.screen === 'treehouse') {
    const room = currentRoom(state);
    lines.push(`TREEHOUSE — ${room ? room.name : 'no room'}   (${state.rooms.length} room(s) built)`);
    if (room) {
      lines.push(`  ${room.placements.length} thing(s) in here, placed freely (no hardpoints):`);
      for (const placement of room.placements) {
        const item = state.inventory.find((entry) => entry.id === placement.decorationID);
        const where = `x=${placement.x.toFixed(2)} y=${placement.y.toFixed(2)}`;
        const how = `scale=${placement.scale.toFixed(2)} rot=${placement.rotation}`;
        lines.push(`    ${(item?.name ?? placement.decorationID).padEnd(32)} ${where}  ${how}`);
      }
      if (!room.placements.length) lines.push('    (empty — she can drop things anywhere)');
    }
    const open = openRoomHardpoints(state);
    lines.push(
      `  new rooms available: ${open.length ? open.map((h) => h.name).join(', ') : 'none'}` +
        `   room kits: ${roomKits(state).length}`
    );
    lines.push('  DRAWER (decorations only):');
    for (const row of drawerRows(state)) {
      if (row.type === 'more') {
        lines.push(`    [ ${row.label} ] -> ${row.destination}`);
      } else {
        const badges = row.item.badges.length ? ` (${row.item.badges.join(',')})` : '';
        lines.push(`    - ${row.item.name}${badges}`);
      }
    }
    const hidden = state.inventory.filter(
      (item) => !PLACEABLE_KINDS.includes(item.kind)
    ).length;
    lines.push(`  (${hidden} non-decoration item(s) correctly hidden from the drawer)`);
  } else {
    lines.push('DECORATOR MACHINE');
    lines.push(
      `  hopper: ${state.mixing.length ? state.mixing.map((id) => ingredient(id).name).join(' + ') : 'empty'}` +
        `   (max ${MAX_MIX})`
    );
    if (state.lastMade) {
      lines.push(`  just made: ${state.lastMade.name} (${state.lastMade.badges.join(',')})`);
      if (state.lastMade.prompt) lines.push(`    prompt: ${state.lastMade.prompt}`);
    }
    lines.push(`  packs: ${ASSET_PACKS.map((pack) => pack.name).join(', ')}`);
    for (const exit of exits(state)) {
      lines.push(`    [ ${exit.label} ]`);
    }
  }
  lines.push(`  exits: ${exits(state).length}   new items waiting: ${unseenCount(state)}`);
  return lines.join('\n');
}
