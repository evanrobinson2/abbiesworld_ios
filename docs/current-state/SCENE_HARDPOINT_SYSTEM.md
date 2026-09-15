# Scene hardpoint system (World 2)

How places get onto maps in Abbie's World 2, and how to inspect the whole thing
as text instead of by eye.

## The four nouns

| Noun | Type | What it is |
| --- | --- | --- |
| Archetype | `World2POIArchetype` | A registered *kind* of place, with a contract |
| Instance | `World2POIInstance` | One placement of an archetype in one scene |
| Hardpoint | `World2SceneHardpoint` | A named pad in a scene where a place belongs |
| Scene | `World2SceneDefinition` | A backdrop, its pads, and the places on them |

An archetype is registered once in `World2POIRegistry`. Its `World2POIContract`
declares the screen it opens (`route`) and every inventory transaction it may
perform (`grants`, `costs`). Nothing outside the registry needs to know what a
Furniture Store is: the map routes by contract, so adding a place means adding
one archetype plus one `case` in the route switch, and the compiler names every
site that has to change.

An instance is a placement. Scenes ship in `World2SceneCatalog`; player and
developer edits live in `World2SceneGraphStore`, keyed per player, autosaved, and
exportable as JSON to be baked back into the catalog.

## Snapping

`World2HardpointSnapEngine` is pure Foundation and fully unit tested. The rules:

- A drag within a pad's `snapRadius` pins to the nearest *compatible* open pad.
  Distance is aspect-corrected, so the pull radius is a circle on screen rather
  than an ellipse on a 4:3 map.
- Breaking away is harder than snapping on (`breakawayMultiplier`, 1.75×). Without
  the hysteresis a snapped place chatters on and off its pad during one slow drag.
- A pad accepts only the size classes it lists, and only one instance at a time.
  Refusals come back as named reasons, which the editor shows rather than
  silently ignoring the drag.
- Unsnapping is allowed and preserved: pinning is the default, not a cage.

## Who sees what

- **Players** see pads that are open, and only in scenes with
  `showsOpenHardpointsToPlayers`. They shimmer; they are not interactive.
- **Developers** (Settings → Grown-Up Controls → age gate → Scene Editor
  Developer Mode) see every pad plus the editor. There is no player path into
  the editor.

## Editing

The scene editor has two layers, and only one takes a drag at a time — the
convention RTS and ship-builder editors use so a single gesture is never
ambiguous.

- **Places layer**: move (with snapping), unsnap, snap to nearest pad, scale,
  rotate, swap for any registered archetype, add, remove. Shipped instances can
  be moved and swapped but not deleted.
- **Hardpoint layer**: tap bare map to add a pad, drag to move it (pinned places
  follow), rename, set accepted size classes, tune the pull radius, lock. Locked
  pads hold shipped art in place. Deleting a pad never deletes what stood on it;
  that place simply becomes freehand.

`Save Locally` writes to `UserDefaults`, `Export JSON` shares a catalog-shaped
payload, and `Reset Scene` drops back to the shipped catalog.

## Textual inspection

Every launch prints, via `World2Diagnostics`:

- `poi_registry_report` — one line per archetype with its contract audit line.
- `scene_catalog_report` — per scene: instances, pads, which place stands on
  which pad, and every open pad with the sizes it accepts.
- `scene_catalog_issue` — any instance referencing an unknown archetype, a
  missing pad, a pad that rejects its size, or a double-booked pad. In debug this
  also trips an assertion, so a bad placement is loud rather than invisible.

In the editor, `Log Rigging` prints the same shape for the live (edited) scene.

Launch arguments for jumping straight to a scene or game:

```
-world2SkipIntro            # skip the intro video and audio wait
-launchWorld2ThreeBears     # Three Bears Woods map
-launchWorld2JustRight      # straight into the tasting game
-launchWorld2WorkLand       # Work Land map
-launchWorld2FarmLand       # Farm Land map
-inspectWorld2POI <id>      # open a map with that place's drawer up
-world2PlayerAni            # play as Ani instead of Abbie
```

## Tests

- `abbies.world.iosTests/World2HardpointSnapEngineTests.swift` — snap, breakaway,
  size-class, and occupancy rules.
- `abbies.world.iosTests/World2SceneGraphTests.swift` — registry and catalog
  validation, save migration, badge ordering, and the Just Right state machine.
- `abbies.world.iosUITests/World2SceneGraphUITests.swift` — open pads visible on
  shipped maps, Three Bears reachable and rigged, and the porridge reward landing
  in the player's drawer.

## Adding a place

1. Register an archetype in `World2POIRegistry` with its contract. Give it a
   `drawnArtStyle` if its painted exterior does not exist yet, so it renders as
   artwork rather than a missing-asset card.
2. Add the route case to `World2ViewModel.enterPOI` and a screen in
   `World2RootView`.
3. Either add an instance to a scene in `World2SceneCatalog`, or drop it onto a
   pad from the scene editor and export the JSON.
4. Launch and read `poi_registry_report` and `scene_catalog_report`.
