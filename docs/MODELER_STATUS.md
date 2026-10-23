# Modeler status against the vision

What the modeling pipeline does today, measured against `docs/MODELER_VISION.md`. This is the "what is built"
document; the vision stays the "what and why". Update this file when a gap closes. Status as of 2026-10-22.

The pipeline lives on `main` (`tools/model-challenge`, `tools/ranch-rebuild`, `tools/model-store`), together with the
live Ranch Atelier site; the old `claude/live-snapshot-2026-10-22` line was merged into `main` on 2026-10-23.

## Pipeline stages

| Vision stage | What we have | What is missing |
|---|---|---|
| 1. Concept / reference | Midjourney V8 driven in Evan's signed-in Chrome from a Claude session on his Mac (`tools/midjourney/`, `mj.js`). Hero plus orthographic turnaround per asset, split into views by `tools/model-challenge/split.py`. User uploads worked for the paper warrior. | No automatic fallback when the Mac is offline (this stalled the Ranch rebuild on 2026-10-22). No pluggable input for existing meshes. |
| 2. Construct | Procedural Blender Python per asset (`build.py`, shape numbers in a dict, rebuilds from nothing). Named parts and role-named materials. A papercraft construction grammar and hybrid fitting (`tools/paper-helmet`, `tools/paper-warrior`). | No UVs, textures or normal maps (flat colours only). No shared library of reusable parts across assets. |
| 3. Validate, optimize | `harness.py`: multi-view silhouette IoU against the turnaround, hero overlap, triangle counts, dimensions. Paper-helmet loss adds landmarks, part crops and a style term. An art director reviews renders and sends revision rounds. Triangle budgets per asset type. | No automated checks for normals, manifoldness, UVs, transforms, or runtime performance in the engine. Fidelity scoring is outline-only. |
| 3. Export | GLB for runtime. `tools/ranch-rebuild/to_game.py` writes the Ranch tile's mesh-list JSON, construction stages, animal poses and supply fill levels. | No `.blend` source export, no OBJ or STL. The manifest does not travel with the exports. |
| Storage | `tools/model-store`: blobs in Cloudflare R2 keyed by sha256, catalogue in Postgres `model_assets`, `/models` pages in Ranch Atelier from `models/manifest.json`. | The upload Action waits on the R2 GitHub secrets. |

## Must-haves

| # | Must-have | Status |
|---|---|---|
| 1 | One user-facing modeler, pluggable tools | Partly. Evan talks to one thread; it orchestrates Midjourney, modeler agents, Blender and scoring. Tools are scripts, not a pluggable interface. |
| 2 | Faithful, clean, editable, structured outputs | Partly. Editable recipes and named parts; fidelity is measured; topology and UV quality are not. |
| 3 | Source-controlled manifests, recipes, prompts, decisions | Partly. Prompts (`prompts.json`, `BRIEF.md`), Midjourney provenance, recipes and revision rounds (`notes.json`) are committed. There is no single versioned manifest per asset. |
| 4 | Provenance, purpose, context bundled with every asset | Partly. Spread across `provenance.json`, `notes.json`, the brief and the game catalogue (`simulationMapping`). Purpose ("why it exists here") is one line in `prompts.json`. |
| 5 | Component composition and reuse, stable IDs | Early. Part names and construction stages exist; the paper warrior snaps props onto a body. No sockets, pivots or part IDs in a manifest. |
| 6 | Midjourney fallback and upload path | Upload path works by hand; no automatic fallback. |
| 7 | Change-order workflow | Informal. Revision rounds are recorded in `notes.json` and git; no request, modify, validate, new-version flow with version numbers. |
| 8 | Regeneration independent of tools and formats | Partly. Recipes and prompts can regenerate an asset today; intent is not yet captured in a tool-neutral form. |

## Next steps, in order
1. **Asset manifest v1**: one `asset.json` per asset folder (stable ID, purpose and placement, part hierarchy, coordinate
   system and units, inputs and jobs, tools and versions, recipe, validation results, budgets, exports, lineage), written
   by the publishing scripts and stored with the files in R2. Start with the Ranch tile rebuild.
2. **Concept fallback**: when the Mac session is unavailable, generate the concept with another image model or ask for
   an upload, and record the source in the manifest.
3. **Validation stage**: normals, manifoldness, scale and origin, triangle budgets and an in-engine load test, written
   into the manifest.
4. **Source exports**: save the `.blend` beside every GLB.
5. **Change orders**: a request file per change, a new asset version, the old version kept.
6. **Part library and sockets**: reusable parts (shingle roof, plank wall, animal legs) shared across recipes.
