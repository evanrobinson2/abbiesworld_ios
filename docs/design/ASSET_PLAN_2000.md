# Plan: 2,000 models, 1,000 charming and 1,000 upgrade (drafted)

Evan, 2026-10-24: "if you had done a whole 1000 charming like that and 1000 of the other, then we'd have enough for all of
Abbie's World ... we can still do it with ChatGPT, it was really good at modeling." Nothing is generated or spent yet.

**Reading chosen:** 1,000 concepts, each built in both looks (charming and upgrade) = 2,000 models. That matches the earlier
"normal and charming" switch and gives every concept a style toggle. If Evan meant 2,000 different concepts, the same pipeline
runs with a second concept list.

## What the earlier sets were
- **Charming** is the model challenge's "whimsical" style B (`tools/model-challenge/BRIEF.md`): storybook toy art, exaggerated soft
  proportions, a bit of tilt and lean. Added 2026-10-22 as the Ranch tile's second set (`ranch-*-charming`, 35 assets,
  `tools/ranch-rebuild/BRIEF.md`). The farmer with the straw hat is that look.
- **Upgrade** is style A: the same asset built better, keeping the Ranch's ink-and-sunshine look with bevels, plank and shingle
  rhythm, joinery and a hero detail (`mc-barn-upgrade`, `mc-seller-upgrade`, and the 153 Ranch rebuild models).
- **ChatGPT's "Scene Generator" sets** (pack `original-7000`) are the ones that burned the credits: batches of catalogue-coded GLBs
  with a JSON sidecar and PNG preview each (`BA-xxxx` Home and market, 144 in the library; `WW-xxx` Working woodland, 107; `GF-xxx`
  garden). Each came out of Blender from a recipe, in metres, grounded origin, named anchors, a `schema 1.1.0` sidecar, reviewed
  against a delivery manifest (`dist/woodland-assets/delivery-manifest.json`). The 2,000-name civilisation catalog from 2026-10-18
  (`prototypes/ranch-atelier/asset-catalog/`) was a breadth-first, soft-toy planning draft, not game needs, so it is not reused.
- Not found in this repo: an "asset-factory" tool. If it lives on Evan's PC, its recipes should be pointed at in the first batch issue.

## The list
`tools/asset-batches/slots.json` and `slots.csv` (AW-0001 to AW-1000), built by `build_list.py` from `candidates.py`.
- 29 packs from real needs: Main Street, kit pieces, homes and yards, trees and plants (replacing the procedural trees, fences,
  hedges, mailboxes and flowers that `decorate.block.js` draws as boxes), parks, institutions, vehicles, food, farm and wild
  animals, townsfolk in role, hats and held things, toys, charms and pickups, school and basement, Moon base outside and inside,
  Moon creatures, space, Halloween, seasons, market, kitchen, workshop, world-effect props, coast, carnival, music and art.
- 47 candidates were already in the library (name match against 1,453 library, sidecar and kit names) and were dropped; the rest
  were trimmed evenly to 1,000. Mix: 629 props, 105 buildings, 97 animals, 61 vehicles, 36 each of kit pieces, plants, characters.
- Not yet used: the library-swap audit's per-asset gap list (it lives in its own thread; fold it in as a second pass). The name
  match is rough, so expect some near-duplicates to be caught in review.

## Brief
`tools/asset-batches/CHATGPT_BRIEF.md`: two style guides, format spec (GLB, metres, +Y up, base at origin, triangle budgets per
class, named parts, material roles the game reads, sidecar, preview), five acceptance checks, delivery steps.

## Handoff
20 batches of 50 concepts (100 models each). Batch 1 is the pilot.
1. ChatGPT opens one issue per batch ("Model batch 01") with the slot ids and its delivery link. `chatgpt-issue-intake` posts the
   handshake and fires the routine as it does today.
2. The routine checks the acceptance list, lands passing models in `prototypes/ranch-atelier/dist/asset-batches/NN/`, rebuilds
   `library.json`, publishes a review page with each charming and upgrade pair beside each other in 3D, and comments pass or fail
   per slot on the issue. It never deploys; merged work ships in the next batch.
3. Failed slots are re-requested in the next issue.

**One open point:** issues carry text, not GLBs. Today there is no Blender in CI. The batch must reach the repo as a zip attached
to the issue comment (GitHub accepts zips) or through a repo-write action. Pick one before batch 1; recommended is the zip on the
issue, with the routine unpacking it.

## First batch (recommended)
Batch 1 in `slots.json`: 50 concepts spread evenly over every class (a shopfront, wall pieces, trees, a station wagon, a horse,
a dolphin, a baker, a Polaroid camera, a Moon cow, a menorah, a screwdriver...), so quality is tested on the hard cases. 100 models.
Go/no-go on that batch decides whether the other 19 run.
