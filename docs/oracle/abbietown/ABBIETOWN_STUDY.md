# AW-STUDY-0042 - Abbie's Town

Evan, 2026-10-23 (local time, UTC-4):
- 9:54 AM: "what if you weren't constrained by hexes? and what would it look like to show .. a town the size of
  winchester represented at caricatured proportions?"
- 9:58 AM: "when I say - what it it look like -> I'm asking for an asset manifest, down to anything the size of a
  soccer ball. and imagine a new england suburban town ... give us typical highlights -> Launch, "New Nova" -> off
  the map, muraco, leonard field, frozen hoagies, the coffee shop (that will become abbies after she logs into the
  game and we'll transform it into her coffee shop) ... building her coffee shop game with the basement, putting the
  school game into muraco.. letting her see my childhood through a modern lens -> her own town/life but with stories
  of daddy's life enmeshed."
- 10:03 AM: "but a compressed charming version .. not a map of winchester just inspired by ... with the same spots
  ... and comella's pizza ... and the train park (ginn field) and the horn pond park.. leonard field ... it should
  loosely follow the geographic orientation and it should 100% follow the topology to scale."

Reading taken (said in the thread): the land itself (hills, lakes, brooks) is real at true scale, the places sit
where they really are, and the town on top is the charming, grown part.

- Study page: `/studies/abbietown/`. Preview: the claude.ai artifact built from `abbietown-artifact.html`.
- Code (shared kit, headless, deterministic): `prototypes/ranch-atelier/dist/simulations/abbietown/`
  - `land.json`: the real land and the town's character, made by `tools/extract_land.py` from MassGIS.
  - `town.mjs`: `makeLand`, `growTown(land, {charm})`, `summary`, the places (`SPOTS`, `BEYOND`), `ASSUMPTIONS`.
  - `manifest.mjs`: the asset manifest rules (`ROWS`), `manifest()`, `manifestCSV()`.
- Page: `build_page.py` inlines the modules, the land and the context engineering card into the template.
  Test: `simulations/tests/abbietown.test.mjs`.

## The land: real, true scale

From MassGIS public layers (downloaded from the state's S3 bucket; OpenStreetMap was not reachable):
- 1:5,000 contours of Winchester and its neighbours (Woburn, Stoneham, Medford, Arlington, Lexington) interpolated
  to a 20 m grid, 6.8 by 4.8 km, 1.5 m to 111 m. Vertical scale 1:1.
- Hydrography 1:25,000: Upper Mystic Lake, Wedge Pond, Mill Pond, Horn Pond, the Fells reservoirs, each flat at its
  own shore level; brooks (Aberjona River, Horn Pond Brook, Sucker Brook...).
- MassDOT roads: only arterial and collector roads (68 km) are kept. Local streets (197 km) are a number.
- The commuter rail line through the centre.
- Structures (8,156 footprints) joined to tax parcels and the assessor's style, use code and year built, reduced to a
  count and a style mix per hectare. No owners, addresses or parcel ids leave the extract script.

## The town: grown on top

- Lanes are cut from the main roads where the real hectare behind has 7 or more buildings, run 70 to 230 m, stop at
  water, a steep bank (20%) or another street, and end in a turning circle.
- Houses line the main roads and lanes where a hectare has 4 or more real buildings, drawn from that hectare's real
  style mix: colonial (51%), cape, Victorian, ranch, triple-decker or condo, and shops where shops are 18% or more.
- The charm slider runs from the real density (24 m of frontage, true size: about 3,400 houses) to Abbie's town
  (42 m, 1.45 times bigger: about 1,600 houses). The real town has 7,248 buildings.
- Trees: yard trees, street trees every 26 m, woods where nobody built, October colours.

## The places

| Place | Where it comes from | In the world |
| --- | --- | --- |
| The coffee shop | placed on the main street by the common (to confirm) | turns pink and becomes Abbie's when she signs in; cellar bulkhead to the basement; the register key floats over it; ten coins wait in the basement |
| Comella's | placed by the common (to confirm) | red, white and green awning, a giant pizza on the roof |
| Frozen Hoagies | placed by the common (to confirm); a real Winchester shop (NBC Boston) | a giant sub on the roof |
| Muraco | MassGIS schools | the long brick school, the drainpipe, the flagpole, a coin on the roof: the school jump goes here |
| Leonard Field | MassGIS open space ("Leonard Field and Beach") | the field laid over the real slope, goals, backstop, bleachers, by the water |
| Ginn Field | MassGIS open space | the train park: a little engine and coaches |
| Horn Pond | MassGIS hydrography | a dock out over the pond, a rowboat, benches, and a splash pad on the shore with a mushroom shower |
| The science lab | new in Abbie's town (2026-10-23, for AW-STUDY-0047) | a lab with a little dome; the beaker of strange green goo by its door opens the cell game (`/studies/cell/play.html`) |
| Abbie's house | in the neighbourhood, deliberately not at the real address (a public repo) | a pink-trimmed house, the pink treehouse in the backyard, and a round steel door in the grass: Daddy's hideaway under the yard |
| Ani's house | the same | a lilac house and a wooden treehouse in her backyard |
| The town common | MassGIS open space | white church with steeple, flagpole, bandstand |
| Launch | off the map, up the road north | the pink rocket on its own island past the edge |
| New Nova | off the map, south past the lakes (where Boston would be) | a bright glass city on its own island |

## Asset manifest

142 kinds of thing, from the land tile (6.8 km) to the soccer ball (22 cm), in 18 groups. Each row is counted by a
rule from what the town has (houses, street km, junctions, shops, shoreline, trees) for Abbie's town (about 212,000
pieces) and for a real town of Winchester's size (about 717,000). 17 kinds are already in our kits (café models,
ranch trees and bench, black lab, coin reward, café key, figure kit, climb kit, school study, the Moon Mission
rocket). The page downloads it as CSV or JSON.

## How it shows (the 2x2)

- Diegetic: the steeple, the train, the café turning pink, coins over the places, October trees.
- Spatial: a glass pin over each place; a bubble on the place when you arrive.
- Meta (next): the school bell at three, the train horn, the centre's music.
- Overlay: one glass bar, no words (home, previous, next, the charm slider, Abbie signs in), about 5% of the stage.

## Context engineering

On the page's right side, from `studies/context.json` (`abbietown`).
- **Oracle consultation:** Townscaper, Tiny Glade and Cities: Skylines profiles; the Anno 117 identity record.
- **Game dev blogs:** Oskar Stålberg, "How Townscaper works"; watabou, Medieval Fantasy City Generator devlog.
- **Game design blogs:** GTA BOOM on how GTA V compresses Los Angeles; Tael's map-making guide (Stardew Valley).
- **Tutorials:** Red Blob Games on hex grids; three.js InstancedMesh.
- **Research:** MassGIS data layers; NBC Boston on Frozen Hoagies in Winchester.
- **Canon:** HUD study, memory coins, the café study, the hex city study.

## Decisions taken

- Not a map: real streets, lots and buildings are reduced to numbers; only the land, the water, the main roads and the
  railway keep their real shape. The real places keep their real names on this page; fictional names are one
  switch away if Evan wants them for public pages.
- The places are bigger than life (a sub on the roof, a pizza on the sign) but stand where they really are.
- Tour: `"tour": false`. A study, not yet part of the play loop.

## Round 2 (Evan, 2026-10-23 1:03 PM): the plan and the first two pieces
Plan: the Claude Doc "Abbie's Town: round 2 plan". Evan then named the zones that get hi-fi: downtown with the coffee
shop, Ginn Field, the family homes with treehouses and the bunker, Launch, and the Horn Pond splash pad. The rest of
the town stays the charming grown version.
- **Time lapse** (`tools/extract_overlay.py` writes `history.json`): the assessor's year built for the buildings in each
  hectare. Each grown house takes the year of a real building near it; a lane appears with the houses along it; the
  railway appears in 1835. A clock button opens a year slider (1700 to 2026) with a play button; marks for the railway
  (1835) and the town's birth (1850).
- **Real map overlay** (`overlay.png`, 4 m a pixel): every real street, every building footprint and the water as
  shapes only, laid over the land in a second skin that follows every hill. The map button steps off, faint, strong.
- Privacy: homes are placed loosely on their real streets, with no house numbers or street names in the code.

## The seven-hex region (Evan, 2026-10-23 1:30 and 1:34 PM, first version)
"The final Winchester region should be a mega structure of 7 hexes in a greater hex ... carve the 3 regions roughly 33%
each." Then: "ani has her side, abbie and I have ours ... then there's a downtown area", with the church park at the centre.
- `simulations/abbietown/regions.mjs`: `HEX` (side 760 m, flat-top, centred on the common and its church park; seven of
  them cover about 10.5 km2 of the real town's 16.5), `REGIONS`, `hexOf`, `regionOf`, `placeRegions`. The hex button on
  the page draws the outlines on the land.
- The cut: the centre hex is split into three 120 degree wedges; each region takes two outer hexes and one wedge, so
  each is about a third of the area (tested: 32.5%, 32.6%, 34.9%) and of the houses (437, 385 and 409 of 1,635, with
  the rest outside the greater hex). Boundaries run out from the common at 330, 90 and 210 degrees (clockwise from north).
- **Downtown** (south and south-east, plus the streets round the church park at the middle): the church park and
  common, Main Street and the coffee shop, Comella's, Frozen Hoagies, the lab, Ginn Field and the train park, the lakes.
  Sub-area: Lake Country.
- **Ani's side** (west and north-west): Ani's house and treehouse, Horn Pond with the splash pad. Sub-area: Pond Side.
- **Abbie and Daddy's side** (north and north-east): Abbie's house and treehouse, Daddy's hideaway, Muraco, Leonard
  Field, the road to Launch. Sub-area: School Hill.
- Region ids (stable, for the changing-worlds study AW-STUDY-0048): `downtown`, `anis-side`, `abbie-daddy-side`.

## The three dioramas (Evan, 2026-10-23 2:43 and 2:44 PM)
"Actually model three distinct dioramas that are indicative of the actual regions, but diorama and cartoon scale ... and
each zone should have its own opinion about zoomed out overland view." Built into the page (`dioramas.block.js`, inlined
by `build_page.py`); /town opens on them, the three-hex button switches between them and the real town.
- Each is a pointy hex tile of the real land: the real heights squeezed to a fifth of a mile across and exaggerated
  (2.4 to 3.4 times), the real lakes, the real main roads, the real mix of houses thinned and set along the streets, and
  the real places pushed together and built big. The three tiles sit as a honeycomb trio, in the same compass directions
  as the regions of the seven-hex structure (Downtown south, Ani's side north-west, Abbie and Daddy's side north-east).
- **Downtown:** the church park and common, Main Street with brick pavements, the coffee shop, Comella's, Frozen Hoagies
  and the lab lined up along it, with lamps, yellow trees in pits, a red call box, a blue mailbox, a bench, a crosswalk
  and parked cars (from Evan's photograph of Main Street, never shown or stored); Ginn Field and the train park; the lake.
  Look: late-afternoon brass, a tight 32 degree lens, low tilt.
- **Ani's side:** her house and treehouse, Horn Pond with the dock and splash pad, and the hill beside the pond (the
  highest ground of the tile) with a cairn, a flag and a bench. Look: cool bright morning, a wide 48 degree lens, high tilt.
- **Abbie and Daddy's side:** her house, treehouse and Daddy's hideaway door, Muraco, Leonard Field, and a small rocket
  and signpost on the road north to Launch. Look: a sunset hill, 40 degree lens, almost top-down.
- Each region's pulled-back view is its own: palette, sun colour and direction, sky, lens, distance, azimuth and tilt.
  The pitch-by-zoom curve is the open-land camera's (`land-camera.mjs`, AW-STUDY-0018), tuned per region.
- Still to do: a tilt-shift blur pass, cobbles on Main Street, hi-fi building types in three wealth tiers, the decorator,
  and moving the coffee shop to its exact Main Street spot.

## Anchors for other studies
`anchors(land, town)` in `simulations/abbietown/town.mjs` (also `window.AbbieTown.anchors` on the page) returns the coffee
shop's `door`, `curb`, `street` (middle line, direction `along`, width) and `rocketPort` (a clear spot in the street),
all in local metres (x east, y north, z up; three.js world X = x - W/2, Z = -(y - D/2)), and the event name. Tapping
the shop dispatches `abbietown:cafe-door` on `window`. The anchors follow the shop, so they stay valid if it moves.

## Still to do

- Where the coffee shop, Comella's and Frozen Hoagies really are on Main Street.
- Dress houses from the manifest; open the coffee shop into the café study's room and basement; put the school jump
  in Muraco; a first-person walk at street level.
- The meta layer: the school bell, the train horn, music by the centre.

## The town as a hub (entrances and the stage)
The town is the in-game hub the café, basement, science lab and Moon Mission plug into.
- `simulations/abbietown/entrances.mjs`: `ENTRANCES`, keyed by the gate ids of `simulations/worlds/worlds.mjs` (`town:cafe-door`, `town:cafe-cellar`, `town:lab-door`, `town:truck`, `town:launch`, `town:school-door`, `town:ranch-gate`). Each has a kind (`door`, `ride`, or `stage`, which plays inside the town), a region, a scene, a url, what it needs, and its owner.
- Coming back: a game opened from the town gets `?from=<url>`; the url is `/town?at=<gate id>`, and the town flies to that gate's scene. The older `?from=cafe` also lands Downtown.
- `window.AbbieTown`: `entrances`, `go(gate, state)`, `scenes`, `enterScene(id, {look, fov, dist, azimuth, pitch, lock})`, `exitScene()`, `registerScene({id, region, anchor, facing, bounds, look})` (region null parks it off-map), `mount(id, {onFrame, onExit})` returning `{group, setMood, dispose}`, and `stage` (THREE, scene, camera, controls, renderer, clock, dioGroup, farGroup, tiles with spots, `frame(fn)`, `flyTo`, `setLook`, `hideChrome`). Events: `abbietown:scene-enter`, `abbietown:scene-exit`, `abbietown:enter`, `abbietown:cafe-door`.
- Scenes on the tiles: `cafe-curb`, `lab-door`, `abbie-kitchen`, `treehouse`, `anis-kitchen`, `launch-pad`, `school-door`, and `dio-<region>`.

## The Moon Mission starts at the café curb (Evan, 2026-10-23 3:33 PM)
"This needs to be fully integrated into the winchester diorama." The town side of the `town:truck` entrance is
`mission.block.js` (inlined after `dioramas.block.js`): a black truck parked in Main Street outside the café. Tapping it
calls `AbbieTown.go('town:truck')`; the `abbietown:enter` listener for module `moon-mission` loads
`simulations/moonmission/town-mount.mjs` (the mission side, AW-STUDY-0036) and starts it on the stage. `/town?mission`
opens straight on it (`?beat=<id>` jumps ahead). While a stage module runs, `stage.hideChrome` now hides every town bar
(the toolbar and the year bar); the truck comes back to the curb when the mission ends.


## Winchester, MA: the seven-hex board (Evan, 2026-10-23 4:31 PM: "I approve")
One board, seven flat-top hexes in three zones, named Winchester, MA (`AbbieTown.board.name`). Built on `/town` from the real
land at one shared squeeze (`BOARD` in `dioramas.block.js`), so heights meet across every hex edge. Blueprint:
`docs/oracle/abbietown/BLUEPRINT.html` (live at /studies/abbietown/blueprint.html).
- Downtown (3): `downtown` (The Square: the high school at the middle where the three zones meet, church park, café, Frozen
  Hoagies, Comella's, lab, noticeboard), `depot-river` (depot, rail yard, mill), `reservoir-hills` (the big water, dock, trail, lookout).
- Ani's side (2): `neighbourhood` (the nine house types in three tiers), `anis-side` (cul de sac, Horn Pond, hill, Launch).
- Abbie and Daddy's side (2): `abbie-daddy-side` (home, yard, Muraco door, Leonard Field), `gingerbread-hill` (the Gingerbread
  House, Daddy's sealed bunker door behind it, a pond).
- The Launch Road runs from Launch across the north of Abbie's hex to Gingerbread Hill.
- Minimap logos: the three zones have one (church, duck, house); the high school has none.
- Code: `places.block.js` (the new models), `decorate.block.js` (the procedural decorator: fences, hedges, beds, mailboxes,
  reeds, lily pads, stone walls, rocks, meadow flowers, groves), `dioramas.block.js` (the board).
- For the tiles that come next (Moon, Ranch): `AbbieTown.board = {name, hexSide, hexes, slots (the 12 open hexes touching the
  seven, board metres east/north of the middle), heightAt(x, y) (the squeezed real ground, defined beyond the seven hexes too),
  tileAt(x, y)}`. A new tile takes its edge from `heightAt`, so it conforms to Winchester's topography.
- Spots (tile-local, `AbbieTown.stage.tiles[id].spots`): downtown `cafe`, `cafeRoof`, `lab`, `school`/`highschool`, `noticeboard`,
  `common`; anis-side `ani`, `culdesac`, `launch`; abbie-daddy-side `home`, `muraco`, `leonard` (plus `gingerbread`, `bunker`,
  `launch` translated from the hexes that really hold them, so the Moon Mission's lookups keep working); gingerbread-hill
  `gingerbread`, `bunker`.
- Fixed on the way: the old lattice dropped one row of triangles along one side of every tile (a serrated edge).
- Not done yet: Main Street granite setts, a tilt-shift pass for the opening tour, the hand-modelled tree houses.
