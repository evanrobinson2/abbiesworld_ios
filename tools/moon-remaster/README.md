# Moon remaster models (AW-STUDY-0007, Moon wave 1)

The Moon tile rebuilt toward the Moon Mission pack (`/mnt/project-files/trek.zip`): see the Moon section of
`docs/oracle/remaster/REMASTER_STUDY.md`. Palette from the pack; cyan `#00ffd1` only on the meteorite (and later the
Star Child).

| Item | Asset | Game id | Replaces | Concept |
|---|---|---|---|---|
| MB2 | `dome/` | MR-002 | ME-072 torus habitat (Moon only) | pack moonbase painting |
| MB3 | `buggy/` | MR-003 | ME-007 survey robot (Moon only) | pack 4-view sheet |
| MB4 | `meteorite/` | MR-004 | new, in a fresh crater by the geology field | pack 4-view sheet |

MB1 (crater field) and MB11 (buried cables) are grammar, not models: they live in
`prototypes/ranch-atelier/dist/simulations/moon/moon-regolith.mjs` (crater colour bands, ejecta boulders, the dust
memory for tracks, footprints and cables) and `moon-terrain.mjs` (the meteorite's crater).

Each folder holds `build.py` (the recipe; `python build.py --render` rebuilds the GLB and `r/hero.png`),
`concept.jpg`, `provenance.json` and `notes.json` (what was built, what is good and off, rounds). Shared helpers are in
`mkit.py`. Needs Blender's Python module (`pip install bpy`). Copy a rebuilt GLB to
`prototypes/ranch-atelier/dist/simulations/moon/assets/<game id>.glb`.
