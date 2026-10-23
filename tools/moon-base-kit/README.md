# Moon base kit (AW-STUDY-0031)

"Intensely upgraded" low-poly environment and prop assets for the Moon base low-gravity shooter (Evan, 2026-10-23
10:03Z: "propose 200 assets and draw 20"). The study page is `prototypes/ranch-atelier/dist/studies/moon-base-kit/`
(app.abbies.world/studies/moon-base-kit/); the study doc is `docs/oracle/moon-base-kit/MOON_BASE_KIT_STUDY.md`.

Split with the Moon Heroes study (AW-STUDY-0029, the Bruiser thread): it keeps the characters, helmets, Star Child,
buggy, light cycle, gem bug, zapper, crystal pickup and the lander (Meshy route). This kit is everything else, and it
took over the dome, tower, habitat and hangar, airlock and supply crate (as engineered recipes, round 2).

## Files

- `catalogue_src.py` writes `catalogue.json`: the 200 proposed assets in nine groups, ids `MK-001` to `MK-200`, with
  the 20 drawn in round 1 flagged.
- `bkit.py`: the shared kit. Role materials (name = game role, with a real density), primitives that make named parts,
  the bake (one UV atlas per asset; base colour, roughness and tangent normal maps baked from procedural surfaces:
  panel seams, brushed metal, rock pits, weave), mass per part into glTF extras (`mass_kg`, `density`,
  `material_role`), GLB export and two renders (three-quarter `r/hero.png`, Abbie's 1.1 m eye `r/fps.png`).
- `assets/<slug>/build.py`: one recipe per asset. Its docstring is the brief (what it is, and how it tells the player
  something without a HUD). Outputs beside it: `<slug>.glb`, `maps/`, `r/`, `stats.json`, `notes.json`,
  `provenance.json`.
- `run_all.sh [slug ...]` rebuilds everything (about 2 minutes per asset on 4 CPU cores).
- `build_page.py` rebuilds the study page from the catalogue, the stats, the docstrings and the renders.
- `mj_queue.json`: the Midjourney proofs for the 20, queued because the Mac was offline on 2026-10-23. Run them with
  `tools/midjourney/`, save picks as `assets/<slug>/concept.jpg`, record job ids in `provenance.json`, then rebuild
  each recipe against its pick (round 2) and show pick | round 1 | round 2 from the same camera.

Needs Blender's Python module: `pip install bpy` (tested with bpy 5.2.3).

## Conventions

Z up, metres, origin at the footprint centre on the ground, front faces -Y (glTF turns it into +Z). Material names
start with the role word the game reads (`Metal_`, `Glass_`, `Stone_`, `Cloth_`, `Leaf_`, `Soil_`, `Fruit_`) or a
Moon role it already knows (`OrangeBand` and `DomeGlass` glow as windows, `HeadlightGlass` as a lamp). New lamp roles:
`Lamp_Green|Amber|Red|Grow` (lit) and `LampOff_Amber|Red` (the game swaps them to show state). Palette from the Moon
Mission pack and the Faceted Hero direction; cyan `#00ffd1` is reserved for the meteorite and the Star Child, gold for
Daddy's memory coins.
