# Model audit, 2026-10-24

What 3D models exist, against what `/models` showed. Rebuild with `tools/model-library/` (see its README).

| | Count |
| --- | --- |
| GLB/glTF files on `main` | 2,111 |
| Distinct models on `main` (same content counted once) | 1,233 |
| Of those, on the review desk (`models/manifest.json`) | 176 |
| Distinct models only on unmerged branches | 256 |
| **Distinct models in total** | **1,489** |
| Of the 1,489, whole models (the rest are build stages and animation clips) | 1,198 |
| OBJ/STL/FBX files, not listed | 50 |

Where the missing ones were (main, not on the desk): Moon heroes from Meshy (192, mostly in `tools/meshy-heroes`), Ranch rebuild
and variants (153), Home and market sets (144, `sets-media`, `domestic-assets`), Coast and estuary (62), Tile game kit (59),
Ranch buildings and workers (57), Zombie survival gear (50), Moon base kit and Moon (92), Starship and Aurora (50), Town and city (30),
Gateway art lab (31), Bruiser study (37) and more. 771 of the 1,489 are source files that the site does not serve (they show as pictures).

Only on branches (not in `main`): `UE5` 113 (enemy and scenery intake: papercraft, Halloween candyland, Christmas, terrain, moon base),
`claude/live-oracle` 79 (older garden, cattle and shelter sets), `claude/moon-kit-mj` and `-r3` 27, `cafe-world-integration` 5 (rooftop experiments),
a few mannequins, paper bodies and Roman figure parts. `UE5` also holds 351 `.uasset` files, which are Unreal-only and not listed.

Not checked: the R2 bucket `storyboard-media` (1,171 models on 2026-10-22). Cloud sessions cannot reach `*.r2.dev`. It is filled from `main` and the
live snapshot branch, so it should be a subset of the above. Compare `models/catalog-all.json` from a GitHub runner if exactness matters.
