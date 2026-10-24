# ChatGPT brief: Abbie's World model batches

You are the modeler. Each batch is 50 concepts. For every concept you build **two** models of the same object, one in the
**charming** style and one in the **upgrade** style, so the game can switch between them. Concepts come from `slots.json`
(`AW-0001`..`AW-1000`, 20 batches; batch 1 is the pilot). Nothing here is generated yet.

## The two looks

**Charming** (storybook toy art). Soft, exaggerated proportions, a little tilt and lean, rounded chunky silhouette, big readable
shapes, warm friendly colour. Still clearly the same object and still a working game piece. Reference: the farmer figure with the
straw hat and apple basket (Ranch tiles charming set, `ranch-*-charming`). Faces only on animals and people, never pasted on objects.
Flat colour regions with soft shading, faceted low-poly look is welcome.

**Upgrade** (crafted, believable). The same asset built better: keep the Ranch's look, "a little world in ink and sunshine", warm
low-poly diorama, chunky readable silhouettes, plus real craft: bevels, plank and shingle rhythm, layered parts, believable joinery,
one hero detail. Reference: the model challenge set (`mc-barn-upgrade`, `mc-seller-upgrade`).

Both: PG, kid-friendly, no brands or logos, no text or numbers baked on, no engine artifacts (no axes, gizmos, ground planes).
Characters: Abbie's World cast rules apply (smooth mannequin base layer, kids' faces are never redrawn from photos). Spooky
things are friendly (Halloween is playful, never scary).

## Format (the acceptance checks read these)

- One GLB per model: `AW-0001-charming.glb`, `AW-0001-upgrade.glb`. Metres, +Y up, feet or base at the origin, facing +Z.
- Triangle budget per class (`tri_target` aim, `tri_max` hard cap in `slots.json`): prop 300/1500, plant 400/2000, animal 1500/5000,
  character 2500/7000, vehicle 1500/6000, building 3000/12000, kit piece 150/800. Hero quality for iso view and first person.
- Scale: true size, with toys and vehicles slightly toy-scaled (see `scale` per slot). Kit pieces snap to a 2 m grid.
- Parts are separate named meshes (`roof`, `door`, `wheel_fl`), materials named by what they are: `timber`, `plaster`, `roof`,
  `stone`, `foliage`, `skin`, `fiber`, `metal`, `glass`, `paint_red`... The game reads material names as shading roles
  (`tools/ranch-rebuild/MODELER.md`, `simulations/material-policy.js`). Share materials; no image textures, vertex colour or flat
  base colour only.
- Moving parts have their own pivots (door hinge, wheel axle, hat). Animals and characters: T-pose-free relaxed A-pose, joints named
  for the shared 82-clip skeleton, one mesh per limb is fine. Buildings: also export `_open` or `_lit` variants only if the slot says so.
- A sidecar `AW-0001.json` (same schema as `woodland-assets/WW-006.json`): id, name, style files, triangles, bounds in metres,
  pivot, anchors (feet, hands, door, seat), material roles, `needed_for`.
- A 1024 px preview PNG per model on a plain warm background (`#fbf8f1`), three-quarter view, soft shadow.

## Acceptance checks (a batch is rejected if any fail)

1. Both GLBs load; triangles under `tri_max`; bounds match `scale` within 15 percent; origin at the base.
2. No object, camera, light or helper left in the file; no texture images; names follow the part and material rules.
3. Charming and upgrade are visibly the same object at a glance, and visibly different in craft.
4. The silhouette reads at 64 px in the preview.
5. Nothing violates the style rules above; the preview matches the model.

## Delivery

One GitHub issue per batch opened by ChatGPT (see `docs/design/ASSET_PLAN_2000.md`, "Handoff"). Title `Model batch NN`, body = the
slot ids and the delivery zip link. The intake routine checks, converts, lands them under `prototypes/ranch-atelier/dist/asset-batches/NN/`,
rebuilds `library.json`, opens a review page with each charming and upgrade pair side by side in 3D, and reports pass or fail per slot.
Failed slots are re-requested in the next issue, not silently replaced.

## Process per batch

1. Read the 50 slots. For each, write one line of intent: what it is, who uses it, and its one hero detail.
2. Build upgrade first, then derive charming by pushing proportions (the pair shares part names).
3. Self-check against the acceptance list, fix, zip, and attach.
