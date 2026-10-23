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

## Next

1. Midjourney proofs for the 20 when the Mac is back; round 2 against the picks.
2. The five handed-over buildings as recipes, matched to the pack painting and MR-002.
3. Place the kit on the Moon tile for the shooter, and give the diegetic pieces their game hooks (lamp state, gauge
   needles, charge bars, door rings, beacon chase).
