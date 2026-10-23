# AW-STUDY-0007: Ranch and Moon remaster

Requested by Evan, 2026-10-23 02:20Z: "for example: redo the crop bed grass, goat thing looks weird out of place. lamps
need upgrades. dispatch a moon remastering. no holds barred given all our improvements. suggest in a new study."

This is a proposal, not a build. It audits every asset and effect in the live Ranch tile, ranks them by how much they
hurt the look, and plans a Moonbase remaster from the "Abbie and Daddy's Moon Mission" pack. Every item names its tier,
its concept-art need and its owner thread. Page: https://claude.ai/artifact/QRZqj7Um4FCaGWRG1NsGmA (source `remaster-study.html`, captures in `captures/`).

## What "no holds barred" means here

Everything we have built and learned since the tile was made gets applied at once:

- **The aesthetic study** (`../aesthetic/`): one signal, one palette; value before hue; the saturation ladder (figures
  louder than ground, ground louder than backdrop); warm light, cool shadow; the Ranch palette (paper sky `#efe5cf`,
  meadow `#a6b087`, teal roof cap `#3b8f8b`, terracotta `#c9694f`, timber `#8a6444`, brass `#e3ab35` reserved for bells,
  shadow `#5a6a8c`). Ships at 80/100 on `tools/aesthetic-rubric/check_aesthetic.py`; today scores 36.
- **The HUD study** (`../hud/`): show it in the world first. Lamps, windows, smoke, bells and animals carry time and state.
- **The card study** (`../cards/`): the tile must look like its card. The Moonbase card promises a glass dome and a
  radio tower; the tile does not have them.
- **Granularity tiers** (from the image-to-scene study, as used in `../city/`): **hero** (part-modelled from a concept
  sheet, scored), **kit** (modular pieces, instanced), **grammar** (generator rules, no new models), **impostor**
  (baked stand-ins at board-game hover distance, the card, the overland icon).
- **Smooth shading** (the Model challenge finding: faceting was only flat shading) and the **parts-first rule**
  (`docs/MODELER_STATUS.md`: model and fit each part on its own, then fit the assembly).
- **The Midjourney-to-model pipeline** (`tools/ranch-rebuild/`, `tools/model-challenge/`) with the **Review Desk**
  (Evan accepts, adjusts or rejects each model) and the **footprint rule** (new models keep the old footprint in file units).
- **The game-feel check**: no engine artifacts, nothing masks the world.

## The headline finding

Every thing Evan flagged comes from the same place. The Ranch rebuild replaced the 35 file-based assets (buildings,
animals, trees, plants, props) but its brief lists a **second wave that was never done**: "built in code, not from files:
the sugar shack, the playground, fences and gates, lamp posts, garden beds and the residents" (`tools/ranch-rebuild/BRIEF.md`).
The crop bed, the grass, the lamps and the fences are that second wave. They are code primitives (boxes, cones and
cylinders) sitting next to rebuilt models, so they look like placeholders, because they are.

The goat shelter is the other kind of break: a good rebuilt model (pink walls, teal roof, from Evan's concept pick) that
the open-shed pass strips to posts, so in the tile it is a floating teal roof on salmon sticks with grey slabs under it.
Pink appears nowhere else in the Ranch palette, so it reads as out of place.

## Method

`tools/remaster-shots/` serves `main`'s site locally, builds the default Ranch tile (seed 41, Homestead) and the Moon
Science Base in headless Chromium, hides every overlay, and captures fixed cameras at noon, golden hour and night. The
same script and shot lists make the after shots, so before and after are the exact same camera. The cloud container
cannot reach ranch.abbies.world, and production also reads cloud model calibrations, so building scale may differ a
little from the phone. Evan's three crops from the phone are on the page beside the matching shots.

## Ranch audit, ranked by how much it hurts the look

Hurt = how much of the screen it covers x how wrong it reads (5 is worst). Owner: **Model challenge** for Ranch models
and code-built props; **Weather and clouds** for sky, sun, fog, night and lamp light.

| # | Item | What is wrong today | Proposal | Tier | Concept art | Owner | Hurt |
|---|---|---|---|---|---|---|---|
| R1 | **Grass and ground cover** | Hundreds of hard green cones and pyramids on a flat saturated green; the largest share of the tile; flat-shaded spikes read as a bed of nails. The meadow is the most saturated thing in the world (aesthetic study) | A tuft kit of 6 soft clump shapes (round-tipped blades, smooth normals, colour drift from meadow `#a6b087` to foliage), instanced, wind sway from the weather signal, thinned near paths and buildings; clover and flower patches as grammar; ground drops one step in chroma | Kit + grammar | One ground-cover sheet (tufts, clover, wildflower clumps, path edges) | Model challenge; wind from Weather and clouds | 5 |
| R2 | **Crop bed** | A 5x5 grid of flat green cubes on a brown slab beside the home: the most toy-like spot on the tile is a placeholder | A raised timber bed (the GF-002 planter already in the tile is the right language) with mounded soil rows, a stake and twine, a scarecrow or watering can; crops from a crop kit in growth stages (sprout, leafy, ripe). Ripe shows gold, thirsty goes brown `#968241` with drooping leaves (diegetic, colour-blind safe) | Kit (bed hero piece + crop kit) | Kitchen-garden sheet: bed, 4 crops x 3 stages | Model challenge | 5 |
| R3 | **Open shelters (goat, cow, horse)** | The open-shed pass leaves a teal roof floating on salmon or orange posts; the goat yard's ramp and platform become grey slabs; pink is off-palette; the roofs are oversized for the animals | Goat house as its concept (walls, ramp, climbing deck) with one open side instead of no walls; recolour walls to terracotta `#c9694f` or timber, keep the teal cap motif; scale to the animals; shelters get straw floors, a hay rack and a bell on the gate | Hero (goat house), kit (shelter frame for cow and horse) | Goat house exists (Evan's pick); needs a recolour pass and a 3-wall variant sheet | Model challenge | 5 |
| R4 | **Lamps** | One black tack (6-sided cylinder, cone cap, cube bulb) repeated everywhere; at night each throws the same flat additive disc; reads as an engine marker | A lamp kit in the Ranch dialect: shepherd's-crook post with a hanging lantern, lantern on a fence post, porch lamp on the home, string lights over the playground. Warm glass `#ffc56b`, iron, a little brass only on the gate bell. Light comes on at dusk because someone lights it (a resident walks the round, diegetic); the glow pool follows the ground and fades softly; at most 4 real lights, the rest emissive | Kit (4 pieces) | Lamp sheet (4 lamps, day and lit) | Model: Model challenge. Light, timing, pools: Weather and clouds | 4 |
| R5 | **Sky, backdrop and night** | By day the tile floats in a flat grey void; at night it sinks into a black void and the whole tile goes murky green-black; shadows are neutral grey | Paper sky with a horizon glow by day, apricot dusk, ink-blue night `#2f3a5a` with moonlight rim and warm windows (aesthetic study states); shadows filled with sky blue `#5a6a8c`; contact shadows under props | Grammar (lighting) | None (the aesthetic study's states are the target) | Weather and clouds | 4 |
| R6 | **Fences and gates** | Chunky beige post-and-rail, identical everywhere, as tall as a cow; dominates every close-up | Post-and-rail kit at true scale: weathered timber, a lean and gap here and there, gate with a latch and the brass bell, stone corner posts at the yard entrances | Kit | Fence and gate sheet | Model challenge | 3 |
| R7 | **Faceted fruit and foliage** | Apples are red icosahedra; shade-tree and apple leaves are flat-shaded cards, so trees sparkle like glass | Smooth normals on every canopy and fruit; fruit as soft spheres with a highlight; canopies as puff clusters (the `puff_canopy` motif) | Kit (re-export) | None | Model challenge | 3 |
| R8 | **Paths** | Soft orange decals with blurred edges; no edges, ruts or wear | Path grammar: packed dirt with grass edge, wheel ruts to the feed store, stepping stones to the home, puddles after rain (weather signal) | Grammar | None | Model challenge (path grammar) | 3 |
| R9 | **Tile slab edge** | A flat orange-brown wall | The soil-slab motif: topsoil band, strata, a few stones and roots, a grass lip that overhangs; the slab reads as a toy you hold | Grammar | Optional slab sheet | Model challenge | 2 |
| R10 | **Water** | Troughs hold a flat cyan box (`#5eacb5`), the water point's water too | Water material with depth tint, a meniscus and a ripple when an animal drinks; level drops as the trough empties (already simulated) | Grammar (material) | None | Weather and clouds (water shading), Model challenge (trough) | 2 |
| R11 | **Yard ground patches** | Lime polygons and brown slabs mark each shelter's floor like debug areas | Trampled earth and straw that fades into the grass; no hard polygon edges | Grammar | None | Model challenge | 2 |
| R12 | **Sugar shack** | A plain box with a teal lid and a dark band; nothing says maple | Sugar-shack hero: steam vent on the ridge, woodpile, buckets on the maples; steam rises when sugaring (diegetic) | Hero | Sugar-shack sheet | Model challenge | 2 |
| R13 | **Playground** | Thin orange sticks on a sand square; small and spindly | Playground kit: swing, slide, seesaw, sandbox with chunky toy proportions | Kit | Playground sheet | Model challenge | 2 |
| R14 | **Animals** | Fine silhouettes; the horses are boxy and flat orange | Smooth-shaded re-export; idle, feed and rest poses as the brief asked; a mane and tail with some motion | Hero (re-pass) | None (rebuild art exists) | Model challenge | 1 |

**Keep as they are:** the family home, feed store, water point, chicken coop, cows, goats, chickens, the GF-002
planter, the potting bench and compost bay. They are the rebuilt models and they set the bar the rest must reach.

## Moon remaster plan

The Moon tile (Moon Science Base) is a believable NASA-style colony: white inflatable torus and three-lobe habitats,
a VTOL ferry port, solar, radiators, robots and white-suited astronauts on beige regolith with dark dodecahedron rocks.
The Moon Mission pack (`/mnt/project-files/trek.zip`) is a different and better world: Abbie in a grey suit with
orange accents, Daddy in grey power armour, a glass-ribbed dome with an orange band, a lattice radio tower, Quonset
hangars with warm orange windows, crater fields under a hanging Earth, the charcoal-and-cyan moon buggy, Daddy's
midnight-blue light cycle, and the glowing meteorite that opens into the Star Child. The Moonbase card already uses the
pack's moonbase painting, so today the card promises a place the tile does not show.

### What hurts today

| # | Item | What is wrong | Hurt |
|---|---|---|---|
| M1 | Identity | The tile does not match its card or its story: no dome, no tower, no Abbie, Daddy, buggy, meteorite or Star Child | 5 |
| M2 | Regolith | Beige sand-plaster, flat with crease lines; no craters, though crater fields are the pack's defining landscape | 5 |
| M3 | Rocks | A uniform confetti of dark faceted dodecahedra over the whole tile | 4 |
| M4 | Light | The dialect is lights, radio and holograms, but there are no lit windows, beacons or glow; measured at 22:00 the tile is exactly as bright as at noon (mean lightness 139 of 255 in both) | 4 |
| M5 | Gold bars | Utility-trench markers read as floating gold bricks in dashed lines, like a developer path overlay | 3 |
| M6 | People | Generic white astronauts | 3 |
| M7 | Landing pad | A big grey concrete U with stairs, the heaviest shape on the tile | 2 |
| M8 | Slab edge | Black void sides | 2 |

### The plan

Palette from the pack: regolith cool grey-blue (`#c4c9d4` light, `#8d93a3` mid, `#4a5468` shadow), night sky `#0b1020`,
Earth blue, suit and window orange `#ff9a3c` (the Moon's "home" warmth, like the Ranch's windows), charcoal `#3a4a5a`
for machines, and **cyan `#00ffd1` reserved for the meteorite and the Star Child**: on the Moon, cyan means "something
alien to know", the way brass means "something to know" on the Ranch.

| # | Item | Proposal | Tier | Concept art | Source in the pack |
|---|---|---|---|---|---|
| MB1 | **Crater-field terrain** | Craters with rims and ejecta rays, value bands in grey-blue, rocks scattered by crater ejecta (dense near rims, sparse elsewhere), smooth boulders; buggy tracks and footprints that persist | Grammar | None | moonbase.png, cinematic_01, cinematic_16 |
| MB2 | **The dome** | Glass-ribbed main dome with the orange band, airlock and ramp; interior glow at night | Hero (parts: ribs, glass, band, airlock) | Turnaround sheet in house style | moonbase.png, cinematic_01, cinematic_20 |
| MB3 | **Moon buggy** | Charcoal quad, balloon tyres with tread blocks, cyan headlights; drives to the crater | Hero (parts: tyres, chassis, seat, lights) | **None needed**: 4-view sheet exists | moon_buggy_reference.png, entities/moon_buggy_description.md |
| MB4 | **Meteorite and crater** | Craggy dark sphere with cyan crystals, 60% buried in a fresh crater; pulses once every 2 s; opens like origami | Hero (states: buried, glowing, opening, open) | **None needed**: 4 views exist | mysterious_meteorite_reference.png, entities/mysterious_meteorite_description.md |
| MB5 | **Star Child** | 30 to 40 cm crystal child; core glow changes colour with feeling (cyan, violet thoughtful, gold joyful, deep blue sad) | Hero (parts: head, eyes, core, petals, limbs) | Sheet exists; add a turnaround | alien-a.png, entities/star_child_description.md |
| MB6 | **Abbie and Daddy** | Abbie's grey suit with orange accents; Daddy's power armour | Hero | Daddy turnaround exists; Abbie needs one | abbie.png, daddy_explorer.png |
| MB7 | **Habitat kit** | Quonset hab, hangar with orange windows, connector tubes, lattice radio tower with blinking beacon, solar array, dish; the ME kit restyled to the palette | Kit (about 10 pieces) | One kit sheet | moonbase.png, cinematic_01, cinematic_15 |
| MB8 | **Light cycle** | Midnight-blue low bike, hubless glowing wheels | Hero | Needs a turnaround | daddy_light_cycle_rescue.png, entities/light_cycle_description.md |
| MB9 | **Moon light** | One signal: Earthshine night, warm windows on at dusk, tower beacon, meteorite pulse lights the crater, sunrise terminator sweep | Grammar | None | cinematic_02, cinematic_20 |
| MB10 | **Horizon and backdrop** | Distant crater rims as an impostor ring, Earth, starfield; basalt strata on the slab | Impostor + grammar | None | cinematic_02 |
| MB11 | **Cleanup** | Trench markers become a buried cable with a faint line in the dust; landing pad becomes a lit ring of beacons | Grammar | None | |

Ideas only (not edicts, noted): the pack's four minigames (relay fix, gem bugs, signal lock, waypoints) could become
in-world activities on the base; its music (`moon_base_return.ogg` and three game tracks) is for the composer thread.

Owner: a new **Moon remaster build** thread, started through the coordinator once this plan is merged. It uses the
Model challenge pipeline and Review Desk; light and sky items go to Weather and clouds.

## Priority order

1. **Ranch wave 1 (what Evan sees first):** R1 grass, R2 crop bed, R3 shelters, R4 lamps (models now; light with R5).
2. **Light, both tiles:** R5 and MB9 in one pass by Weather and clouds (one signal, one palette; night darker than day).
3. **Moon wave 1:** MB1 crater terrain, MB3 buggy and MB4 meteorite (art already exists, so modelling can start at
   once), MB2 dome.
4. **Ranch wave 2:** R6 fences, R7 smooth foliage, R8 paths, R9 slab, R10 water, R11 yards.
5. **Moon wave 2:** MB5 Star Child, MB6 Abbie and Daddy, MB7 habitat kit, MB10 horizon, MB11 cleanup.
6. **Wave 3:** R12 sugar shack, R13 playground, R14 animals, MB8 light cycle.

## Done means

- After shots from `tools/remaster-shots/` with the same shot lists, side by side with these before shots.
- Each model goes through the Review Desk; concept art goes to Evan as soon as it lands.
- `check_aesthetic.py` at 80 or more on the noon, dusk and night captures; night measurably darker than day.
- The game-feel check passes; no new engine artifacts.
- New models keep their predecessor's footprint (`tools/ranch-rebuild/to_game.py`).
