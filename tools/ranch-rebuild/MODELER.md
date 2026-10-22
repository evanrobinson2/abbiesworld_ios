# Modeler brief (Ranch tile rebuild)

You are the 3D modeler for one asset of the live Ranch tile. Read `../model-challenge/MODELER.md` first: the
conventions, harness and loop there all apply (Blender Python via `pip` bpy 5.2.3, Cycles CPU only, Z up, metres,
origin at the footprint centre on the ground, front facing -Y, `build.py` with shape numbers in a dict at the top,
`notes.json`, at least 3 scored rounds, the hero wins over the views). This file adds what the game needs.

## Inputs for job `<name>`
- `mj/<name>/hero.png` (the look to hit) and, for most assets, `mj/<name>/view_front.png`, `view_side.png`,
  `view_back.png` (split from `turnaround.png`; check the labels as before).
- `current/<name>.png` and `current/stats.jsonl`: today's model in the game, for proportions and triangle count.
- `prompts.json`: the asset's entry says what it does in the game (`role`) and which files it replaces.
- `../model-challenge/models/seller-upgrade/` and `barn-upgrade/`: Evan liked these. Match their level of craft.

## Output in `models/<name>/`
- `build.py`, `<name>.glb`, `notes.json`, `r/` exactly as in the challenge. No animation is needed (the game poses
  models itself), so export with `export_animations=False`.
- `variants/<state>.glb` for every state below. Build them from the same `build.py` (a `STATE` switch), so they
  share one design.

| Group | States to export in `variants/` | What each state is |
|---|---|---|
| building | `planned`, `foundation`, `frame`, `roof`, `complete` | planned: string lines and corner stakes on the ground. foundation: only the stone footing and floor. frame: footing plus the bare timber posts and beams. roof: the frame plus the roof, walls still open. complete: the finished model (same as `<name>.glb`). |
| animal | `idle`, `feeding`, `rest` | idle: standing, head up. feeding: standing, head down to the grass. rest: lying down, legs folded. |
| supply | `full`, `partial`, `empty`, `carried` | the contents at the brim, about half, none; carried is the object as a person holds it (for the hay rack, an armful of hay; for the bucket and jar, the full object). The trough has no carried state. |
| tree-standing | `standing`, `stump` | the tree, and a cut stump with a few chips. |
| tree, prop, plant | none | just `<name>.glb` |

## Game rules (they decide whether the model works in the tile)
- **Material names carry the game's shading role.** The game picks a shading profile from the material name, and
  seasons recolour anything whose material name contains leaf, needle, grass, stem or flower. So name materials with
  one of these words first: `Timber`, `Plank`, `Roof`/`Shingle`, `Plaster`, `Stone`/`Brick`, `Metal`/`Iron`, `Glass`,
  `Water`, `Clay`/`Terracotta`, `Rope`/`Hay`/`Straw`, `Cloth`, `Fur`/`Hair`/`Feather`/`Horn`, `Bark`, `Leaf`, `Stem`,
  `Flower`, `Fruit`, `Soil`. For example `Roof_Teal`, `Plank_Rose`, `Leaf_Light`, `Flower_Blue`, `Fur_Chestnut`.
- **One material per object at most where you can**, and flat base colours only (no textures, no vertex colours).
- **It is seen small.** The tile shows a whole ranch on one screen, so a building is about 100 px tall and a flower a few
  pixels. Chunky silhouettes and bold colour blocks read; details under about 3 % of the object's size don't. Spend
  triangles on silhouette first.
- **The tile draws many copies**, so keep triangles at or below these budgets: building 9k, horse or cow 4k, goat 3k,
  chicken 1.5k, shade tree 4k, other trees and shrubs 3k, garden prop or supply 2k, flower or ground plant 1k.
  Fewer is better if it still reads. Today's bramble (9.8k) and goldenrod (13k) are far too heavy.
- Real-world scale (the game rescales to its own sizes, so proportions matter more than absolute size): buildings
  as built for people, horse about 2.4 m long, cow 2.2 m, goat 1.3 m, chicken 0.45 m tall.

## Finish
Run the final render and score from the challenge brief (768 px, 48 samples). Then check the game version:
`python ../../to_game.py <name>` must run without errors (it writes into the game folder; that is expected). Don't
commit or push; the art director does that. Don't touch files outside `models/<name>/`, except what `to_game.py` writes.
