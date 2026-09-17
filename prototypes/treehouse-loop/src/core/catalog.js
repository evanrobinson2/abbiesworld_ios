// The treehouse loop: rooms to put stuff in, and a machine that makes stuff.
//
// Room slots are hardpoints by another name. A room kit is planted on a room
// hardpoint the same way the World Seed is planted on a map hardpoint, so this
// reuses the pattern already in World 2 rather than inventing a second one.

export const ROOM_HARDPOINTS = [
  { id: 'hp.home.downstairs', name: 'Downstairs', slots: 5, startsBuilt: true },
  { id: 'hp.home.upstairs', name: 'Upstairs', slots: 4, startsBuilt: false },
  { id: 'hp.home.kitchen', name: 'Kitchen', slots: 4, startsBuilt: false },
  { id: 'hp.home.attic', name: 'Attic', slots: 3, startsBuilt: false },
  { id: 'hp.home.porch', name: 'Treetop Porch', slots: 3, startsBuilt: false },
];

// What an inventory item is. Only `decoration` may be placed in a room, which
// is the whole point of pre-filtering the drawer.
export const ITEM_KINDS = ['decoration', 'roomKit', 'card', 'ingredient', 'place'];

export const PLACEABLE_KINDS = ['decoration'];

export const BADGES = ['new', 'handmade', 'oneOfAKind', 'fromPack', 'starter'];

// Decorator Machine ingredients. Deliberately zany: the fun is in the collision.
export const INGREDIENTS = [
  { id: 'ing.kitty', name: 'Kitty', noun: 'kitty', adjective: 'whiskery' },
  { id: 'ing.rainbow', name: 'Rainbow', noun: 'rainbow', adjective: 'rainbow-striped' },
  { id: 'ing.couch', name: 'Couch', noun: 'couch', adjective: 'squishy' },
  { id: 'ing.lamp', name: 'Lamp', noun: 'lamp', adjective: 'glowing' },
  { id: 'ing.bubble', name: 'Bubbles', noun: 'bubble', adjective: 'bubbly' },
  { id: 'ing.jelly', name: 'Jelly', noun: 'jelly', adjective: 'wobbly' },
  { id: 'ing.star', name: 'Stars', noun: 'star', adjective: 'sparkly' },
  { id: 'ing.dino', name: 'Dino', noun: 'dinosaur', adjective: 'stompy' },
  { id: 'ing.cloud', name: 'Cloud', noun: 'cloud', adjective: 'fluffy' },
  { id: 'ing.cake', name: 'Cake', noun: 'cake', adjective: 'frosted' },
];

// Asset packs she can accept wholesale instead of mixing one at a time.
export const ASSET_PACKS = [
  {
    id: 'pack.cozyNight',
    name: 'Cozy Night Pack',
    items: ['Moon Lamp', 'Star Rug', 'Sleepy Cloud Pillow'],
  },
  {
    id: 'pack.jungle',
    name: 'Jungle Pack',
    items: ['Vine Swing', 'Parrot Perch', 'Leafy Beanbag'],
  },
  {
    id: 'pack.bakery',
    name: 'Bakery Pack',
    items: ['Cupcake Stool', 'Donut Clock', 'Sprinkle Lamp'],
  },
];

export function ingredient(id) {
  return INGREDIENTS.find((entry) => entry.id === id) ?? null;
}

export function assetPack(id) {
  return ASSET_PACKS.find((entry) => entry.id === id) ?? null;
}

export function roomHardpoint(id) {
  return ROOM_HARDPOINTS.find((entry) => entry.id === id) ?? null;
}
