# Treehouse loop

More places for Abbie to put her stuff, and a door to go get more stuff.

```
treehouse ── drawer (decorations only) ── [ More… ] ──► decorator machine
    ▲                                                          │
    └────────────── back to the room she left ─────────────────┘
```

```bash
npm install
npm run prove     # walks the whole journey as text, then checks the properties
npm test          # 31 unit tests
```

No Phaser scene yet: this prototype is about the shape of the loop rather than
a game to play, so the core and the proof are the deliverable. Ported to Swift
it becomes room hardpoints in the treehouse, a filtered drawer, and a
Decorator Machine POI.

## Rooms are hardpoints

The treehouse has five room hardpoints — Downstairs, Upstairs, Kitchen, Attic,
Treetop Porch. Downstairs is built to begin with; the rest are open. A Room Kit
is spent on an open hardpoint to build a room, exactly the way a World Seed is
planted on a map hardpoint, so this reuses the pattern World 2 already has
instead of inventing a second one. Each room carries its own decoration slots,
which are hardpoints by another name. Fully built: 5 rooms, 19 spots.

## What the proof actually guarantees

These are the properties that make it safe to hand to a six year old, and each
is checked by `npm run prove` as well as the tests:

- **The drawer only ever shows things she can place.** Cards, Room Kits,
  ingredients, and World Seeds stay out of it.
- **MORE is always there,** including when the drawer is empty — it is a row in
  the list rather than a special case in the view, so it cannot go missing.
- **No dead ends.** The proof explores 400 reachable states and asserts every
  one of them has at least one exit.
- **MORE then back always returns to the room she left,** checked for every
  room in a fully built treehouse.
- **One inventory.** Something made in the machine is in the drawer the moment
  she gets home, wearing a `new` badge, which retires when she places it.

## Forgiving by construction

- Three ingredients max, and a fourth tap swaps the oldest out rather than
  refusing her.
- Tapping an ingredient twice unpicks it.
- Pulling the lever with an empty hopper still makes something.
- Placing into a full room, or trying to place a card, changes nothing and
  loses nothing.
- Building with no Room Kit fails softly rather than half-building.
- Accepting the same asset pack twice does not duplicate it.

## What it makes

Mixing is deliberately zany — the fun is the collision:

```
Whiskery Rainbow-striped Couch
Rainbow-striped Bubbly Dinosaur
Glowing Whiskery Dinosaur
Wobbly Sparkly Dinosaur
```

and each carries the prompt that would go to image gen:

```
a single piece of furniture that is wobbly jelly and sparkly star and stompy
dinosaur, storybook illustration, soft rounded shapes, thick clean outlines,
centered on a plain background, no text
```

## Porting notes

- Room hardpoints should be real `World2SceneHardpoint`s so the scene editor
  can move and rename them, and `acceptedSizeClasses` can keep a wardrobe out
  of a shelf slot.
- The drawer filter belongs next to `unplacedFurnitureInventory` in
  `PlayerStateService` rather than in the view, so every caller gets it.
- The Decorator Machine wants to be a World 2 POI archetype with a contract
  granting decorations, not a World 1 full-screen game — that is what makes the
  single shared inventory fall out for free.
- `returnTo` is the only new navigation state needed, and it is what lets the
  machine send her back to the exact room she came from.
