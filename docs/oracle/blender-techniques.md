# Blender game-art techniques for the imagination machine

Oracle digest, 2026-10-22. I read 30 articles, talks and docs by game artists and graphics programmers, then boiled them down into techniques our scripted pipeline can automate. The pipeline is cloud Blender driven from Python (`pip install bpy`, Cycles on CPU), with `tools/paper-warrior` and `tools/paper-helmet` as the current code, glTF out to three.js.

Each technique is scored 0 to 3 on two axes:

- **IM**: impact on the imagination machine (Midjourney image to 3D with a loss loop).
- **PG**: impact on the papercraft construction grammar (the "style compiler").

## The short version

1. **The loss should see parts, not pixels.** Render a flat ID pass (one colour per plate or part) next to the beauty render. It gives per-part loss, crisp fold lines and outlines for free. (Shehata, Heckel)
2. **Make "real paper" a hard rule, not a texture.** Every plate must unfold flat without stretching. Unfold distortion becomes a style-loss term that replaces the crumple-noise term, and the same unfolder can print the model for a kid to build. (Tachi, Paper Model add-on, Paper Mario, Tearaway)
3. **Render in the target's style before comparing.** Midjourney draws a lit illustration; we compare it to a Cycles render. Use a fixed per-asset light vector and a 2 to 3 band ramp in the Blender material, plus the same ramp in three.js (`MeshToonMaterial` gradient map). (Guilty Gear Xrd, three.js docs)
4. **Treat props as a kit with sockets and footprints.** Standard units, pivots, names and snap points let the fitter choose pieces and fit a handful of numbers per piece. (Skyrim kits, Townscaper)
5. **LOD by dropping rules, not triangles.** Paper assets are already low-poly; far LODs should drop hems, thickness and small blades, then let a planar decimate and `gltf-transform simplify` finish. (Blender Decimate, gltf-transform, three.js LOD)

## Ranked techniques

| # | Technique | IM | PG | Effort | Sources |
|---|---|---|---|---|---|
| 1 | Part-ID render pass for loss and outlines | 3 | 3 | S | 8, 9 |
| 2 | Paper-honesty rule: developable plates, unfold-distortion loss | 2 | 3 | M | 17, 18, 19, 20, 21 |
| 3 | Style-matched rendering (fixed light vector, banded ramp) | 3 | 2 | S | 2, 13 |
| 4 | Kit sockets, footprints, pivots and naming | 2 | 3 | M | 1, 3 |
| 5 | Paper material model: thickness groups, edge vs face material, seeded irregularity | 1 | 3 | M | 20, 7 |
| 6 | Generate, validate, roll back (multi-start with hard checks) | 3 | 1 | S | 3 |
| 7 | Fold lines as sharp edges, weighted normals elsewhere | 1 | 2 | S | 10, 11 |
| 8 | Rule-aware LODs plus planar decimate and simplify | 1 | 2 | S | 14, 15, 16, 30 |
| 9 | Vertex-colour masks and baked AO, one material, no textures | 1 | 2 | S | 23, 24, 29 |
| 10 | Corner-based modules deformed to irregular cells | 1 | 2 | L | 3, 4 |
| 11 | Geometry Nodes as the grammar runtime | 1 | 2 | L | 25, 26 |
| 12 | Paper edge trim sheet (torn, fibre, crease strips) | 0 | 2 | M | 5 |
| 13 | Baking detail and light for static scenes (normal, AO, lightmap) | 1 | 1 | M | 12, 27, 31 |
| 14 | Inverted-hull outlines with per-vertex width | 1 | 1 | S | 2, 22 |
| 15 | Distance-to-feature attribute for wear around openings | 0 | 1 | S | 6, 7 |
| 16 | Stepped (stop-motion) animation for paper characters | 0 | 1 | S | 2 |
| 17 | Storybook post: hatching, wobble lines | 0 | 1 | S | 8 |

Effort: S is under a day, M is a few days, L is a week or more.

## The techniques

### 1. Part-ID render pass (IM 3, PG 3)

Omar Shehata shows that depth and normal edges miss outlines whenever two surfaces happen to line up, and fixes it by giving each connected surface an ID and rendering that ID to a buffer. Maxime Heckel's Moebius post does the same kind of buffer trick with depth and normals and a Sobel filter.

For us, every plate the grammar emits is already a separate object or face group. Give each one an emission-only material with a unique flat colour and render a second, cheap pass (Cycles at 1 sample, or the raster silhouette we already have).

- **Loss**: segment the Midjourney image into the same parts (SAM or the existing rembg plus part crops) and score IoU per part. The loss stops being blind to small parts such as the crest, face plate and shield boss, because each one has its own term. That is the exact failure in the paper warrior and helmet studies.
- **Critic**: the Opus critic can be handed the ID image and the target side by side and talk about parts by name.
- **Lines**: an ID-difference edge pass gives the clean fold lines paper needs, in Blender for review images and in three.js as a post pass.

Automate: `helmet.build()` tags each plate with `ob["part"]`; a `render_ids()` helper swaps materials, renders, and restores. Merge coincident verts before export so one plate keeps one ID.

### 2. Paper-honesty rule (IM 2, PG 3)

Tomohiro Tachi's Origamizer folds any polyhedral mesh from a single uncut sheet by laying the faces out flat and hiding the gaps in tucks. The lesson for us is simpler than the full algorithm: paper has zero stretch, so a believable plate is one that unfolds flat with no distortion. Paper Mario's artists built real paper mockups to find what reads as origami, then wrote rules from them. Tearaway's team said that keeping everything to what paper can do kept the design focused, and they built tools so the world could be printed and refolded.

- Add a `paper_honesty(plate)` check: unfold each plate's faces into the plane (a breadth-first unfold across shared edges, as the Export Paper Model add-on does) and measure edge-length and angle distortion. Plates that fail are crumpled, not folded.
- Use it as a style-loss term in place of the crumple and edge terms that rewarded clay-like noise.
- Use it as a grammar invariant in `fit.RULES`: the optimiser may not accept a step that makes a plate non-developable.
- Bonus for kids: the Export Paper Model add-on (bundled with Blender) writes SVG or PDF nets with glue tabs, so any asset can become a printable papercraft kit.

### 3. Style-matched rendering (IM 3, PG 2)

Guilty Gear Xrd gives each character its own light vector, tuned for the idle pose, and decides lit or shaded with a hard threshold. A vertex-colour channel biases the threshold so artists can force areas into shade. Shading colour comes from two flat swatches, lit and shaded, with no painted detail. three.js has the runtime half built in: `MeshToonMaterial` with a 2 to 3 texel gradient map on nearest filtering.

Midjourney paper art is lit like an illustration: one key light, flat bands, a darker fold side. Comparing that to a soft Cycles render wastes loss on lighting.

- In Blender, build the paper material as `ramp(dot(N, L_fixed))` with Constant interpolation, where `L_fixed` is a per-asset vector the fitter can tune (two numbers instead of today's 14 light parameters).
- Use the exact same ramp in three.js so what the loss saw is what the game shows.
- Expose a `shade_bias` colour attribute so the grammar can mark the inside of folds as always-shaded.

### 4. Kit sockets, footprints, pivots and naming (IM 2, PG 3)

Joel Burgess's Skyrim kit rules: every piece has a footprint that is a multiple of the others; geometry stays inside the footprint; pivots go at a standard spot on the ground plane and are settled during greybox; pieces are named so a newcomer can read them (`Cor`, `Mid`, `L/R`, `01/02` variants); finish one piece before making variants; vary props before architecture to hide repetition. Two kit artists fed eight designers 400 dungeon cells.

For the composed paper warrior:

- Give the slim mannequin named sockets (`head`, `neck`, `chest`, `waist`, `shoulder_L/R`, `shin_L/R`, `foot_L/R`, `hand_L/R`) as empties with a fixed frame.
- Each prop declares its socket, its footprint (a bounding volume relative to the socket) and its pivot. `compose.py` becomes a snap, not a fit.
- The fitter then searches over piece choice plus a few numbers per piece, which is a much smaller search than free geometry.
- Use one unit standard everywhere (character 1.8 m, door and step sizes) so story scenes and characters mix.

### 5. Paper material model (IM 1, PG 3)

The Make It Cardboard add-on is a good spec for a paper "material" that lives in geometry and nodes:

- Thickness is set per group (walls, roof, plates), and changing it updates every sheet in the group.
- Cut edges get their own material and their own texture coordinates, so the edge reads as paper (flutes, fibres, a torn lip) whatever its orientation.
- Handmade irregularity is explicit and seeded: rounded folds, slight warp, scuffed edges.
- Optional parts use exact-odds tables (70/20/10 over ten buildings gives exactly 7, 2 and 1), and the same seed always rebuilds the same model.
- Box projection in object space means no UV unwrap for the paper grain.

Our `grammar.paper_t` is already a thickness. Split face and edge materials in `thicken()`, move jitter to a seeded per-plate warp, and add the exact-odds table to the builder's random choices.

### 6. Generate, validate, roll back (IM 3, PG 1)

Bad North generates islands, checks them against level requirements (walkable edges, reachability) and rolls back to a saved state to retry when a check fails. Townscaper puts hard rules first and decoration second. Our biggest single win so far was a multi-hypothesis restart (the body yaw flip), so make that systematic: start N hypotheses (front, back, mirrored, three camera heights), run a cheap silhouette fit on each, kill any that break a hard check (landmarks on the wrong side, a non-developable plate, a prop outside its footprint), and only then spend renders and critic calls.

### 7. Fold lines as sharp edges, weighted normals elsewhere (IM 1, PG 2)

The mid-poly workflow (Malte Resenberger-Loosmann at Angelic) skips the high-to-low bake: model real bevels, then fix shading with face-weighted normals so big flat faces keep their true normal. The Polycount thread on face-weighted normals explains why it works and where it fails (small faces at steep angles).

For paper: mark every fold edge sharp (by dihedral angle, or straight from the grammar, which knows where it folded) and export split normals so three.js shows crisp creases. Use Blender's Weighted Normal modifier with Keep Sharp on curved plates so wide panels stay flat. This is cheap and makes the game render look folded rather than smoothed.

### 8. Rule-aware LODs (IM 1, PG 2)

- three.js `LOD.addLevel(object, distance, hysteresis)`; use hysteresis around 0.1 to stop popping.
- `gltf-transform simplify` (meshoptimizer) needs a weld first and takes a ratio plus an error cap.
- Blender's Decimate modifier has a Planar mode that merges near-coplanar faces, which keeps a faceted look where Collapse would melt it.
- The grammar should own LODs: LOD1 drops hems and paper thickness, LOD2 merges crest blades into one blade and removes bosses, then the decimator finishes. Building LODs from rules keeps the silhouette, which is what reads at a distance.

### 9. Vertex-colour masks, one material (IM 1, PG 2)

Store tint variation, fold shade, edge darkening and baked AO as colour attributes and export them as glTF `COLOR_0`. A whole kit can share one material and need no textures, which suits three.js draw-call budgets. Cycles can bake to colour attributes. Low-poly artists use palette textures for the same purpose (UVs collapsed onto swatches). Per sheet, pick a palette index and a small seeded tint jitter so overlapping plates separate visually.

### 10. Corner-based modules deformed to irregular cells (IM 1, PG 2)

Townscaper starts from a hex of triangles, merges random pairs into quads, subdivides and relaxes into an organic quad grid, then places modules by corner occupancy (marching-cubes style) and deforms each module to its cell. About 500 tiles cover everything. Boris the Brave's Sylves tutorial gives the grid recipe step by step. For a London street or a Roman camp in paper, author a small set of unit-cube paper modules (wall, corner, roof ridge, window bay) and deform them into cells. This is the scalable route to whole paper towns.

### 11. Geometry Nodes as the grammar runtime (IM 1, PG 2)

Blender Studio (Simon Thommes on Sprite Fright) keeps assets procedural so they can be revised on feedback, and automates the rest with short Python scripts. Procedural-modelling courses (Erindale) lean on splines, reusable node groups, and the Bake node to freeze expensive steps. A node group's inputs are settable from Python (`mod["Socket_2"] = 0.3`), so the fitter could drive it. This is a real option, but our builders already work as Python and bmesh. Worth it later, if we want artists to tweak rules live in Blender.

### 12. Paper edge trim sheet (IM 0, PG 2)

Insomniac's Ultimate Trim (Sunset Overdrive) packs horizontal strips with built-in 45 degree bevels into one sheet, and a free Blender add-on snaps a UV island onto a chosen strip. For paper, one small trim sheet (clean cut, torn, fibre, crease, glue tab) gives every edge strip a convincing finish. The UV snap is a few lines of Python.

### 13. Baking for static scenes (IM 1, PG 1)

Blender's bake supports selected-to-active with a cage, ray distance and margin, and bakes normal, AO, diffuse and combined passes. For three.js, a second UV set carries a baked lightmap or AO map into `MeshStandardMaterial.lightMap` or `aoMap`. Use it for story sets (the Fritigern wagon scene) where lighting is fixed. Bake paper-fibre detail into a small tiling normal map rather than per asset.

### 14. Inverted-hull outlines (IM 1, PG 1)

Duplicate the shell, push it out along normals, flip it and cull front faces. Blender does this with Solidify (Flip, material offset 1) plus a backface-culled emission material. Guilty Gear Xrd drives the width from a vertex colour so lines can thin or vanish. A cheap way to get the storybook ink line in three.js without a post pass.

### 15. Distance-to-feature attribute (IM 0, PG 1)

Tiny Glade stores signed distance to the nearest window in one float vertex attribute and uses it to grow plaster damage around openings. For paper: distance to cut-outs drives a little torn-edge wear or darkening around eye slots and windows.

### 16. Stepped animation (IM 0, PG 1)

Guilty Gear Xrd turns off interpolation and poses every frame, like stop-motion. Paper characters animated on twos or threes (12 or 8 fps poses) read as handmade.

### 17. Storybook post (IM 0, PG 1)

Heckel's Moebius pass adds luma-banded hatching and a low-frequency wobble to the Sobel line samples. A presentation option for "storybook mode", not a pipeline need.

## What to build next (in order)

1. `render_ids()` plus per-part IoU in `hloss.py` (technique 1). Small, and it attacks the "loss is the bottleneck" problem head-on.
2. Fixed light vector plus constant ramp material in Blender and the same ramp in three.js (technique 3).
3. `paper_honesty()` as a loss term and a RULES invariant (technique 2).
4. Socket, footprint and pivot schema for the mannequin and props (technique 4), then the multi-start-and-validate loop (technique 6).
5. Fold-edge sharp marking, split normals and rule-aware LODs on export (techniques 7 and 8).

## Sources

Rated by how much I got out of each: **solid** (concrete, used directly), **useful** (some specifics), **light** (thin page, cited for one idea).

1. Joel Burgess, [Skyrim's Modular Approach to Level Design](https://gamedeveloper.com/design/skyrim-s-modular-approach-to-level-design) (GDC 2013 write-up). Solid.
2. Junya C. Motomura, [Guilty Gear Xrd's Art Style: The X Factor Between 2D and 3D](https://www.ggxrd.com/Motomura_Junya_GuiltyGearXrd.pdf) (GDC 2015 slides; [GDC Vault](https://gdcvault.com/play/1022031/GuiltyGearXrd-s-Art-Style-The)). Solid.
3. Oskar Stålberg, [How Townscaper Works: A Story Four Games in the Making](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making). Solid.
4. Boris the Brave, [Townscaper grid tutorial (Sylves)](https://boristhebrave.com/docs/sylves/1/articles/tutorials/townscaper.html). Solid.
5. Insomniac Games, [The Ultimate Trim: Texturing Techniques of Sunset Overdrive](https://gdcvault.com/play/1022323/The-Ultimate-Trim-Texturing-Techniques) (GDC 2015) and [Justen Lazarro's free Ultimate Trim tools](https://www.cgchannel.com/2019/07/download-justen-lazarros-free-ultimate-trim-texturing-tools). Solid.
6. 80.lv, [Tiny Glade developers on Bevy, proceduralism and cozy games](https://80.lv/articles/exclusive-tiny-glade-developers-discuss-bevy-proceduralism-publishers-cozy-games/). Useful.
7. 80.lv, [Procedural windows in Tiny Glade get an upgrade](https://80.lv/articles/procedural-windows-in-pounce-light-s-tiny-glade-get-an-upgrade). Useful.
8. Maxime Heckel, [Moebius-style post-processing and other stylized shaders](https://blog.maximeheckel.com/posts/moebius-style-post-processing). Solid.
9. Omar Shehata, [Better outline rendering using surface IDs with WebGL](https://omar-shehata.medium.com/better-outline-rendering-using-surface-ids-with-webgl-e13cdab1fd94). Solid.
10. Malte Resenberger-Loosmann, [Creating assets within the mid-poly workflow in UE5](https://80.lv/articles/creating-assets-within-the-mid-poly-workflow-in-ue5/). Solid.
11. Polycount, [Discuss face weighted normals](https://polycount.com/discussion/comment/1688746). Solid.
12. Blender Manual, [Render Baking (Cycles)](https://docs.blender.org/manual/en/2.81/render/cycles/baking.html). Solid.
13. three.js docs, [MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html). Solid.
14. three.js docs, [LOD](https://threejs.org/docs/pages/LOD.html). Solid.
15. glTF Transform, [simplify()](https://gltf-transform.dev/modules/functions/functions/simplify). Solid.
16. three.js forum, [Mesh simplification using meshoptimizer](https://discourse.threejs.org/t/mesh-simplification-using-meshoptimizer/63002). Useful.
17. Tomohiro Tachi, [Origamizing Polyhedral Surfaces](https://origami.c.u-tokyo.ac.jp/~tachi/cg/OrigamizingPolyhedralSurfaces_tachi_IEEETVCG.pdf) (IEEE TVCG). Solid.
18. VGC, [Paper Mario: The Origami King developer interview](https://videogameschronicle.com/features/interviews/paper-mario-origami-king). Useful.
19. Game Informer, [Media Molecule talks about crafting the world of Tearaway](https://www.gameinformer.com/b/news/archive/2013/03/28/media-molecule-talks-about-crafting-the-world-of-tearaway.aspx) and Rex Crowle's GDC 2013 talk, [Building the touchy-feely world of Tearaway](https://gamedeveloper.com/design/video-building-the-touchy-feely-world-of-i-tearaway-i-). Light.
20. Superhive, [Make It Cardboard: cardboard city generator and papercraft look](https://superhivemarket.com/products/make-it-cardboard). Solid.
21. Adam Dominec, [Export Paper Model from Blender](https://github.com/addam/export-paper-model-from-blender) (bundled add-on). Useful.
22. BNPR handbook, [Inverse hull method](https://bnpr.gitbook.io/bnpr/outline/inverse-hull-method). Solid.
23. StraySpark, [Blender vertex colors for game engine workflows](https://www.strayspark.studio/blog/blender-vertex-colors-game-engine-workflows). Solid.
24. Blender devtalk, [Bake to vertex colors using Cycles](https://devtalk.blender.org/t/bake-to-vertex-colors-using-cycles/7110). Useful.
25. Blender Studio, [One thing I've learned from Sprite Fright: shading edition](https://studio.blender.org/blog/one-thing-ive-learned-from-sprite-fright-shading-edition) (Simon Thommes). Useful.
26. BlenderNation, [Master procedural modelling with Geometry Nodes](https://www.blendernation.com/2024/06/26/master-procedural-modelling-with-geometry-nodes/) (Erindale). Useful.
27. C.R. Cherry, [How I make stylized assets](https://crcherry.itch.io/searchlight-hotel/devlog/548271/how-i-make-stylized-assets). Useful.
28. Jasmin Habezai-Fekri via 80.lv, [Low poly scenes with Blender](https://80.lv/articles/low-poly-scenes-with-blender/). Useful.
29. HeatPhoenix, [Low poly texture painting: a treatise](https://www.patreon.com/posts/50369227). Useful.
30. Blender Manual, [Decimate modifier](https://docs.blender.org/manual/en/4.3/modeling/modifiers/generate/decimate.html). Light (modes from my own knowledge of Blender; the fetched page was navigation only).
31. Svilenkovic, [How to bake lighting for web](https://www.svilenkovic.com/3d/how-to-bake-lighting-for-web). Light.

Also skimmed, little to take: 80.lv on [Hi-Fi Rush's toon rendering](https://80.lv/articles/the-making-of-hi-fi-rush-s-3d-toon-rendering-style) (a summary of the GDC 2024 talk, no specifics) and BlenderNation on [texturing low poly art with colour palettes](https://www.blendernation.com/2020/05/21/texturing-low-poly-art-with-color-palettes/).
