# Cottage decoration ingest — scheduled builder work

Evan explicitly requested carving, DAG processing, OpenAI multimodal ingest, deep metadata stamping, and availability in EVERY scene in Abbie’s cottage. Three approved sheets, candidate 4/index 3 each. Source pack is saved locally in `AssetSources/World2/cottage-decor-2026-09-27`; these files are not committed/pushed yet. CDN retrieval details and complete prompts below allow remote retrieval.

## Required DAG

- verify_sources ← start
- openai_multimodal_inventory ← verify_sources
- carve_transparent_sprites ← openai_multimodal_inventory
- openai_multimodal_cutout_review ← carve_transparent_sprites
- deep_metadata_stamp ← openai_multimodal_cutout_review
- ingest_registry_and_catalog ← deep_metadata_stamp
- bind_all_cottage_scenes ← ingest_registry_and_catalog
- runtime_verify_every_scene ← bind_all_cottage_scenes

Extend the existing scripts/cozy_room_assets/extract.py DAG and CozyRoomKit registry/catalog pipeline; do not run its fixed six-sheet defaults against these new sheets. The current carving DAG has no OpenAI metadata stage: implementing and wiring that stage is part of this task, not already completed. Persist resumable node evidence and fail closed before ingest when segmentation or metadata review fails. Use actual OpenAI multimodal responses, with model ID, prompt, response, timestamp and confidence recorded; never substitute guessed labels and call them model analysis.

## Deep metadata per individual asset

Canonical semantic ID, label, detailed visual description, category/subcategory, placeable-room-prop role, materials/textures, visible colors, motifs, style, intended use and interaction affordances, floor/wall/table placement, facing/viewpoint, scale, anchor/pivot, alpha bounds, source crop bounds/mask, original and derivative SHA-256, job/candidate and prompt provenance, eligible cottage scenes, model/evaluator evidence, review status and schema version. Distinguish visual inference from implemented interactions. Do not invent physics/collision or interactive behavior from artwork.

## Acceptance

- Carve every visually present object: lamps 6, rugs/cushions 9, toys 6 (21 expected; validate with multimodal inventory). Prompt says six rugs but actual sheet has nine; pixels win.
- Preserve white fabric/highlights, fine stems and interior openings. Remove all exterior background and ground shadows. Toys have visible shadows; the train is one assembly. Walnut object is visibly closed: do not label it an open furnished dollhouse without evidence. Do not split the chest contents into unsupported separate sprites.
- Ingest into the existing Game Asset registry/catalog using its revision-safe publication flow; retain original sources and prompts. Bundle/runtime manifest fallback must expose the same semantic IDs.
- All items selectable and placeable in EVERY cottage scene, without category-specific room restrictions. Enumerate actual runtime scenes belonging to poi.abbieTreehouse plus approved bedroom/playroom; current TreehouseRoomID contains cozyNook, rooftopLookout, fitnessCenter. Add missing bedroom/playroom mappings as needed and include future cottage rooms by shared eligibility.
- Existing approved stuffies and furniture remain in scope for the same all-cottage availability policy; reference their two open integration requests instead of duplicating them.
- Verify each room: tray lists all items, placement/scale/layering works, switching rooms preserves independent arrangements, save/reload persists, no opaque rectangles or shadows. Include scene-ID coverage evidence and in-game screenshots. Every room must offer these assets; avoid auto-filling or overwriting the user's existing layouts.
- Keep task open until runtime evidence passes; queued work is not ingested or verified work.

## Sources and complete prompts

### pack.abbieCottage.lamps
Requested: https://cdn.midjourney.com/4107f91e-5d37-4154-a62c-35b0189c84c0/0_3.png
Retrieved: https://cdn.midjourney.com/4107f91e-5d37-4154-a62c-35b0189c84c0/0_3.jpeg
SHA-256: f8e754f6a32171d6cec757549b1929082ab044ec0d5c388ee5c364b5113361ca

```text
Six child's magical bedroom lamps: sleepy dragon hugging amber globe; tall curved bluebell floor lamp with leaf base; mushroom cottage bedside lamp with glowing windows; crescent moon holding dangling star lantern; round strawberry frog nightlight with luminous belly; stacked storybooks supporting scalloped patchwork lampshade. Handmade, rounded shapes, joyful colors, painted wood and ceramic details. Light contained inside each lamp only. Hand painted 2D storybook game art, delicate ink contours, warm gouache textures, gentle front three quarter view. Strict two row three column asset sheet on pure white, one complete lamp per cell. Wide margins and gutters. Every lamp fully contained, completely separate silhouettes, no touching, no overlap, no cropping. Flat even illumination. No cast shadows, no ground shadows, no ambient occlusion, no background gradients, no floor, no room, no people, no text, no labels, no borders.
```

### pack.abbieCottage.rugscushions
Requested: https://cdn.midjourney.com/d8e66186-0125-418b-a3fb-71f61dd63b81/0_3.png
Retrieved: https://cdn.midjourney.com/d8e66186-0125-418b-a3fb-71f61dd63b81/0_3.jpeg
SHA-256: 1c9c485ba49f8ad8e4141206b503dc93a8661ab2d4d6eadfc0e52bf104c7fa06

```text
Six tactile bedroom decorations for a child's enchanted cottage: a tufted rainbow rug with fluffy cloud ends; a lily pad rug with a woven pink flower; a sprawling sleepy orange cat rug with curled tail; an oversized flower floor cushion with squashy petal edges; a round patchwork turtle floor cushion; a crescent moon cushion embroidered with tiny stars. Soft wool, velvet, corduroy, stitched fabric as painted textures, playful colors, charming handmade irregularities. Hand painted 2D storybook game art, delicate ink contours, warm gouache brushwork. Rugs viewed from directly above, cushions slightly from above. Strict two row three column asset sheet on pure white, one complete object per cell. Wide white margins and gutters. Fully separate silhouettes, no touching, no overlap, no cropping. Flat even illumination. No shadows, no occlusion, no floor, no background, no people, no text, no labels, no borders.
```

### pack.abbieCottage.toys
Requested: https://cdn.midjourney.com/fc9e02ac-89bd-4564-ab9a-e61c73cfde48/0_3.png
Retrieved: https://cdn.midjourney.com/fc9e02ac-89bd-4564-ab9a-e61c73cfde48/0_3.jpeg
SHA-256: 244dc865229f6985d3f253bc6a4059a54ed52794cb72ce65a2f65ee575b376e6

```text
make. thebackground white and refine the shape and details of the toys
```

Edit image reference: https://s.mj.run/UJx0Azhu-gk
Original creative brief (distinct from exact edit prompt):
```text
Six enchanting handmade toys for a child's magical playroom: a miniature puppet theater with scalloped wooden trim and colorful curtains; a walnut shell dollhouse with tiny furnished rooms; a rocking unicorn with rainbow yarn mane; a wooden woodland train with three animal shaped carriages; a toy castle with rounded turrets and working drawbridge; a dress up chest with crown, fairy wings, and star wand inside. Sturdy, cheerful, expressive handmade details, painted wood and stitched fabric. Hand painted 2D storybook artwork, delicate ink contours, warm gouache textures, gentle front three quarter view. Strict two row three column asset sheet on pure white, one complete toy per cell. Wide margins and gutters. All components contained within their cell. Completely separate silhouettes, no touching or overlap, no cropping. Flat even illumination. No shadows, no floor, no background, no scenery, no people, no text, no labels, no borders.
```
