# AW-STUDY-0031 - Moon Base Kit

Evan, 2026-10-23 10:03Z: "spawn a thread for 'intensely upgraded' low poly FPS assets for moon base", then 10:04Z:
"propose 200 assets and draw 20". His bar for "low poly" (08:02Z): parts that perfectly build the system, hero level
for iso and first person, real materials with normal and bump maps, density and mass.

Page: app.abbies.world/studies/moon-base-kit/ (source `prototypes/ranch-atelier/dist/studies/moon-base-kit/`, built by
`tools/moon-base-kit/build_page.py`). Kit and recipes: `tools/moon-base-kit/`.

## What this study covers

The Moon base low-gravity shooter needs a world to walk through. The Moon Heroes study (AW-STUDY-0029) makes the
characters, the buggy and the lander with Meshy. This study makes everything else as engineered Blender recipes:
outside structures, the modular interior, furniture, terrain, props, pickups, the diegetic signals that replace a HUD,
low-gravity toys and support machines. On 2026-10-23 the Moon Heroes study also handed over the dome, tower and
antenna, habitat and hangar, airlock door and supply crate, so its Meshy credits go to heroes.

It builds on AW-STUDY-0007 (Moon remaster wave 1: MR-002 dome, MR-003 buggy, MR-004 meteorite, the regolith grammar)
and closes that study's open "landing pad beacon ring" item with MK-003.

## The 200

`tools/moon-base-kit/catalogue.json`, nine groups, ids MK-001 to MK-200:

| Group | Count | Note |
|---|---|---|
| Exterior structures and infrastructure | 30 | includes the five handed-over buildings |
| Interior architecture kit | 35 | snaps to a 2 m grid with doorway sockets |
| Interior furniture and fixtures | 30 | sized for Abbie (4.5 heads) and Daddy (7.5 heads) |
| Terrain kit | 20 | matches the regolith grammar |
| Props: tools, cargo, science | 30 | each with mass and a grab point for low-g throwing |
| Pickups and collectibles | 15 | gold only for memory coins |
| Diegetic signals | 20 | "how would Abbie know?" before any overlay |
| Low-gravity toys and interactables | 10 | arcs, slow falls, dust that hangs |
| Support machines | 10 | charcoal with role lights, never cyan |

## Round 1: the 20 drawn and built (2026-10-23)

Solar array, landing pad with beacon ring, comms dish, ore processor, oxygen tank farm, corridor segment, bulkhead
hatch, command console, bunk pods, galley table, hydroponics rack, suit rack, patch-up station, crater rim arc,
boulder set, oxygen canister, battery cell, status lamp post, pressure gauge panel and jump pad.

Evan's Mac was offline, so Midjourney could not run: the 20 were drawn as Blender renders from the Moon Mission pack's
style and the Faceted Hero rules, and the 20 Midjourney proofs are queued in `tools/moon-base-kit/mj_queue.json`.
Round 2 rebuilds each recipe against Evan's pick, shown pick | round 1 | round 2 from the same camera.

### How a piece is made

1. A recipe of named parts (`Hatch`, `LockWheel`, `StateRing`), low poly with a one-segment chamfer so edges catch
   light, flat-shaded planes.
2. Role materials. Each has a colour, roughness, metalness, a procedural surface (panel seams by triplanar brick,
   brushed streaks, rock pits, weave, solar cells, hazard stripes, dial arcs) and a real density.
3. One UV atlas per asset; Cycles bakes base colour, roughness and a tangent-space normal map (512 px for pickups,
   1024 px for the rest). The materials are rewired to the baked maps, so the GLB carries plain glTF PBR that three.js
   reads directly.
4. Mass: each part's closed volume times its role density times a fill factor for hollow parts (tanks, shells), in
   the part's glTF extras (`mass_kg`, `density`, `material_role`). The page shows Earth mass and Moon weight.
5. Two renders: three-quarter, and Abbie's first-person eye at 1.1 m, under a hard white sun with blue Earthlight.

### Rules learned in round 1

- Brick texture `Fac` is the mortar mask (1 = seam). Triplanar must weight projections by `|normal|^4`; taking the
  minimum of three projections leaves only dots where the seams cross.
- Bake the base colour through the emission pass: a diffuse-colour bake loses the colour of metallic roles.
- Keep the bake margin smaller than the island margin in pixels, or emissive lamp colours bleed into neighbours.
- `bpy` must be imported before `bmesh` when running Blender as a Python module.
- The Artifact preview refuses `.glb`; the page serves the GLBs as `.wasm`.

## Round 2: rebuilt against the Midjourney picks (2026-10-23)

The Mac came back and Midjourney ran all 20 prompts (`tools/moon-base-kit/mj/<id>/0-3.jpg`, job ids in
`mj/jobs.jsonl`, contact sheet `mj/contact_sheet.jpg`). Each pick is saved as `assets/<slug>/concept.jpg` with its
job id and grid index in `provenance.json`; round 1's recipe and renders are archived in `assets/<slug>/round1/`.

The picks agreed on a look that round 1 had missed: a "cozy module" style. Every machine is a chunky off-white box
with big chamfers held in a dark gunmetal bumper frame (corner posts, top and base rims), with warm orange windows
set into it. Round 2 adds two kit pieces for it, `bkit.module()` and `bkit.window()` (with `yaw=` for windows round
a curved wall), darkens the ground under the renders, and rebuilds 18 of the 20 toward their picks. The study page
shows each card as pick, model (spin it), Abbie's eye and round 1.

The crater rim and boulder set stay at round 1. Their proofs ran with the shared style line ("warm orange window
light, hull panels"), and Midjourney put buildings into the rock. They need a rerun with a terrain-only style line.

### Rules learned in round 2

- One shared style line for a whole kit is wrong for terrain. Give terrain its own line with no buildings, windows or
  panels in it, or Midjourney turns the rocks into houses.
- Get the concept proofs before the first build, even when it means waiting for the Mac: round 1's look (thin
  panels, few lights) was rebuilt almost entirely once the picks arrived.
- A shared building block (`module`, `window`) is what makes 18 rebuilds fast and keeps the kit consistent.

## Round 3: terrain rerun, the dome and the tower (2026-10-23)

`mj_queue_r3.json` ran on Evan's Windows PC (the Mac had gone to sleep): the crater rim and boulders with a
terrain-only style line ("bare natural lunar terrain only, no buildings, no windows, no lights, no machines, no
panels"), and the five handed-over buildings with a style line that names the round-2 look. Midjourney's Fast hours
ran out after four of the seven (they refill on Oct 28), so the habitat and hangar, airlock door and supply crate are
still waiting. Picks: crater rim 1, boulders 2, dome 0, tower 0 (`mj/<id>/`, job ids in `mj/jobs_r3.jsonl`).

- Crater rim (MK-096) is now a half crater 12 m across: a pale bowl floor rising to a crown of dark basalt crags in
  two rows. Boulders (MK-098) are a six-rock cluster in a dust drift, with more facets (icosphere level 2).
  `Stone_BasaltDark` is a new role for both.
- The dome (MK-029) upgrades MR-002 as a geodesic shell: a frequency-2 icosphere cut to a hemisphere, its triangles
  sorted into hull, dark glass and warm living-room panes, each set thickened into its own part, plus a wireframe
  strut frame over every edge. It sits on a ring foundation of framed segments and has a round entrance tunnel.
- The tower (MK-028) is two framed storeys, a porch with a glowing door, a roof dish and a lattice mast with a work
  platform and a red beacon.

### Rules learned in round 3

- A rerun with its own style line fixed the terrain in one go. Keep a style line per family (machines, buildings,
  terrain) in the queue, not one for the whole kit.
- Check the Midjourney Fast hours before queueing a batch, and put the most needed prompts first.
- Taper rules on a height field must only lift the rim, never the floor. Tapering negative heights pinched the
  bowl's front edge, and so did noise near the fan centre.

## Research pass: what the Oracle and the craft say (2026-10-23)

I ran this pass after round 3, because the context card showed the study had used only our own canon. Each source
below either changed the kit or confirms a choice, and it says which.

**Oracle** (`/api/knowledge`, identity records in `docs/oracle/games/`)
- *Astroneer*: bases built from modules, bright pastel low poly, very low HUD (about 4%); the backpack and the oxygen
  tether show state in the world. System Era's Unreal spotlight adds that one master material drives emissive
  "lights" that turn on and off and change colour on panels, crates and landing pads. **Kit:** every state light
  stays its own named part on a `Lamp_*` / `LampOff_*` role, so the game swaps one material to change state. This is
  already true for all 22 pieces, and it is now a written rule.
- *Deliver Us The Moon*: a lone astronaut, diegetic holograms and a wrist display; the developers place story
  "organically and inorganically" as a breadcrumb trail, because there are no other people to tell it.
  **Kit:** the catalogue's story props (family photo frame, Abbie's drawing board, the map tablet, module signs) are
  the breadcrumbs, and the next draw batch should include them. They are not filler.
- *Subnautica 2*: a base you build out of the habitat's own pieces. This confirms that the dome, the corridor and the
  airlock must snap together (below).

**Dev blogs and design talks**
- Joel Burgess, *Skyrim's Modular Approach to Level Design* (GDC 2013, on Game Developer), plus the 80 Level article
  on modularity and art fatigue. The rules: put the pivot at the centre of the ground plane, and decide pivots early,
  because changing them later means fixing hundreds of placed pieces. Snap at half the footprint. Make sub-kit
  footprints multiples of each other. Keep all geometry inside the footprint. Use one standard doorway for every kit
  that connects. Players notice repeated clutter before repeated architecture, so give clutter 01/02/03 variants on
  identical footprints. Don't make patch pieces; fix the core piece.
  **Kit:**
  - `bkit` now has `KIT_SNAP_M = 2` (half of a 4 m footprint) and `KIT_DOOR_M = 1.4 x 2.2`. The airlock, the
    habitat and hangar, and every future door use that opening.
  - `build()` checks the pivot and records `kit` metrics in each `stats.json` (structural or not, snap cells, pivot
    offset, ground height). A piece whose footprint centre is off its pivot is moved onto it automatically. That
    moved four pieces (command console, ore processor, patch-up station, solar array), which were rebuilt.
  - Deliberate exceptions must say why in `spec['pivot']`: the crater rim pivots on the crater centre so two halves
    make a whole, the dome on its dome centre, the corridor on its walkable floor, and the boulders sink on purpose.

**Tutorials and craft**
- The Polycount thread on face-weighted normals: FWN keeps big flat faces flat on low-poly chamfered models without
  a normal map, but it hurts small faces at steep angles, and you should not use it with a baked normal map.
  **Kit:** we chamfer and bake a tangent normal map, so we keep plain normals and no FWN. This confirms the choice.
- The 80 Level hard-surface tools guide (chamfer to fillet and back, trim sheets, decals). **Kit:** no change yet.
  A shared trim sheet for panel seams and hazard stripes is a candidate once the kit has more than about 40
  pieces, because it would replace the per-asset bake of the same seams.

## Next

1. Draw the habitat and hangar, airlock door and supply crate once Midjourney can run, then build them on the kit door
   (1.4 x 2.2 m) and the 2 m snap. Add the story props (photo frame, drawing board, map tablet, signs) to the next batch.
2. The five handed-over buildings as recipes, matched to the pack painting and MR-002.
3. Place the kit on the Moon tile for the shooter, and give the diegetic pieces their game hooks (lamp state, gauge
   needles, charge bars, door rings, beacon chase).
