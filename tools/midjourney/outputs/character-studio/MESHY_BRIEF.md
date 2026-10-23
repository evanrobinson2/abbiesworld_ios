# Character Studio next characters: Meshy brief

Evan, 2026-10-23 16:53Z: "if you meshy these and use even the meshy anims - we can just get ALL meshy anims available..
we only need 1 high fi set of anims covering the gamut". The four Midjourney picks go through Meshy (image to 3D,
textured, rigged), and Meshy's animation library becomes the Character Studio's master motion set, retargeted onto
every body (the studio skeleton is the brute fight's 20 bones, `studies/character-studio/rig.mjs`).

The views are crops of each pick's Subtle upscale (`upscale.png`), one figure each, for multi-image to 3D:

| Character | Folder | Front | Side | Back | Height |
| --- | --- | --- | --- | --- | --- |
| Clay adventurer | 1-claymation-adventurer/views | view0 | view1 (three-quarter) | view2 | 1.15 m |
| Plasticine inventor | 2-plasticine-inventor/views | view0, view2 | — | view1, view3 | 1.85 m |
| Stick man | 3-stick-man/views | view2 (no cape, no sword) | view1 | — | 1.7 m |
| 80s action hero | 4-80s-action-hero/views | view0 | view1 | view2, view3 | 1.95 m |

Notes: all PG. The stick man is a line drawing, so Meshy may need the plain front (view2) and a "thin ink-line figure,
round paper head" prompt; if it can't make a usable body, skip it and say so. Write each result (GLB, Meshy task ids,
rig and animation list) into the same folder's `provenance.json`, never a new copy.
