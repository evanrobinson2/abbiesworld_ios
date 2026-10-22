# Ranch tile rebuild: art direction brief

Requested by Evan, 2026-10-22, after the model challenge: "redo all the assets in the ranch tile now ... use the pipeline".
Same pipeline as `tools/model-challenge`: Claude art-directs, Midjourney illustrates (Evan's Mac), modelers build in
Blender Python, the art director revises and scores, then the models replace the live ones in the Ranch tile.

Style: **Upgrade** only (style A of the challenge; the produce seller is the reference Evan liked). Keep the ranch's look,
"a little world in ink and sunshine": warm low-poly diorama, chunky readable silhouettes, flat colours with soft light,
plus real craft: bevels, plank and shingle rhythm, layered parts, believable joinery, a hero detail or two.

## Inventory (what the Ranch tile renders today)
Found by loading `/sandbox` (Ranch tile, Medium, Simple) headless and logging every model file, then reading
`ranch-spaces.mjs`, `ranch-regional.mjs`, `ranch-life.mjs` and `garden-facets.mjs`. `current.py` renders each one into
`current/` (sheet: `current/sheet.jpg`, sizes and triangles: `current/stats.jsonl`).

35 file-based assets, in `prompts.json` with the file each one replaces:
- 7 buildings: family home, feed store, water point, horse shelter, goat shelter, chicken coop, barn/work shelter
- 4 animals: horse, cow, goat, chicken (each needs idle, feeding and rest poses)
- 6 trees and shrubs: shade tree, birch, maple, apple, hazel, elder
- 4 garden props: compost bay, potting bench, watering pot, bench
- 4 supplies: hay rack, ration jar, water bucket, water trough (each needs full, partial, empty, and carried where it exists)
- 10 plants: stone edging, borage, marigold, sunflower, hollyhock, coneflower, clover, fern, bramble, goldenrod

Built in code, not from files (second wave): the sugar shack, the playground, fences and gates, lamp posts, garden beds
and the residents.

## Midjourney
Each asset gets a hero (`hero` in prompts.json, `--ar 1:1`). Buildings, animals, trees, the bigger props and supplies
also get a turnaround sheet (`turnaround_prompt`, `--ar 16:9`). Small plants and props are hero only. 57 jobs in total.
Order: buildings, animals, trees, props, supplies, plants (longest builds first).

## Game formats (the modeler must hit these)
- Buildings, animals, the shade tree and supplies are loaded from `.json` mesh lists, one entry per part:
  `{name, positions, normals, color, role, defaultColor, materialName, surfaceName, roleSource}`. The game recolours parts
  by `role` (timber, plaster, roof, bark, foliage, fur, hair, hay...). `tools/ranch-rebuild/to_game.py` converts a GLB to
  that format, taking the role from each object's `role` custom property.
- Buildings also have construction stages (`planned`, `foundation`, `frame`, `roof`, `complete`). Tag every object with
  a `stage` custom property and the converter writes all five.
- Regional plants and trees and garden props are plain GLBs, scaled in game to a set height.

## Charming style (added 2026-10-22)
Evan: "I LOVE THAT YOU ARE DOING NORMAL AND CHARMING MODE." Every asset also gets a charming version (the challenge's
whimsical style B: storybook toy art, exaggerated soft proportions, a bit of tilt and lean, still clearly the same
object and still a working game piece, no faces pasted on objects except the animals'). Prompts are in
`prompts-charming.json`, named `<asset>-charming`, run after the normal set. The tile will get a style switch between
the two sets.
