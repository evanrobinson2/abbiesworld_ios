# AW-118 - Original spaceship interior: Exploration study (drafted)

Status: **Exploration, drafted. Not implemented, not live.** Issue #642, 2026-10-24. Research only: no scene production,
no paid generation, no deployment, no game assets copied or used as generation input.

## 1. What was and was not viewed (provenance)

| Source | Result |
|---|---|
| ArtStation, Tom Lesky "Dormitory Module" (`tomlesky.artstation.com/projects/2B3Xbx`) | **Not viewed.** WebFetch from the cloud sandbox failed: `getaddrinfo ENOTFOUND` (2026-10-24). |
| 80.lv, "Behind creating concept art for The Alters using Blender" (Robert Rejmak, 11 bit studios, dated 2025-08-06) | **Not read.** Same DNS failure. A web search returned only the title and a one-line summary: he builds the game's modules in Blender. Nothing beyond that is claimed here. |
| Search for Tom Lesky + Dormitory Module | No result confirming the artist or the piece. Do not cite him as the author until the page is opened. |
| Wikipedia (search snippet) | The Alters is built on Unreal Engine 5. Search-snippet level only. |
| The chat reference image (arch, bunks, kitchen, three round windows) | **Not uploaded to the issue; not examined.** |
| Actual gameplay captures | None available. |

**Fresh assimilation therefore remains pending.** Nothing in section 2 is an observation of The Alters.

## 2. Analysis of The Alters interiors: evidence status

Requested analysis (composition, camera distances, modular architecture, bevels, material roles, lighting hierarchy,
clutter versus quiet surfaces, cutaway versus close detail) is **blocked on evidence**. What exists today:

- Direct observations: none.
- Developer-reported facts: only "modules are built in Blender" and "Unreal Engine 5", both from search snippets.
- Existing record `docs/oracle/games/the-alters.json`: public knowledge only, rendering confidence 0.15, derived from an art note.

### Capture checklist to close the gap (run on Evan's PC or Mac, where the sites resolve)
1. Open the ArtStation project; save the page URL, time viewed and each image's caption/text into `evidence.json`. Record only what is stated on the page.
2. Read the 80.lv article in full; list every statement about modules, scale, materials, lighting as developer-reported.
3. For each viewed image note: camera distance class (cutaway / room / prop close-up), what is quiet vs dense, the brightest warm source, the cool source, edge highlights (bevel read), and which material families are distinguishable. Mark each `observed`.
4. Anything about polygon counts, texture sizes or shader code stays `unknown` unless a developer states it.
5. Screenshots stay out of the repo; keep links and notes only.

## 3. Original recipe for AW-118 (our own design; not derived from the game)

The composition brief (from Evan's description of his own reference, still to be seen): a curved structural arch framing
layered bunks, a compact galley, three round windows, dense personal objects, warm practical light inside against cool
space outside.

**Structural kit (Blender, `build.py` recipe, parts named by what they are)**
- Metre-scale: arch ribs (one parametric rib repeated with a spacing parameter), floor deck panels, bulkhead frames, three window rings with inset glass, bunk frames.
- Decimetre-scale: handrails, cable trays, panel seams, vents, hinge and latch plates.
- Centimetre/inch-scale: screws, labels, switches, trim. Prefer normal-map or decal detail over geometry here.
- Bevel everything structural with one shared bevel width (about 1 to 2 cm) so edges catch light consistently; this is the single biggest readability win per hour.

**Material family (names are shading roles, per `tools/ranch-rebuild/MODELER.md`)**
`hull_painted`, `hull_bare_metal`, `panel_insulation_quilt`, `rubber_trim`, `glass_window`, `fabric_bedding`, `wood_veneer`, `ceramic_galley`, `emissive_practical`, `emissive_screen`. Five to eight tileable materials with trim-sheet UVs; props use a shared atlas.

**Lighting hierarchy:** one hero warm practical per zone (bunk lamp, galley pendant), a low-intensity fill, cool window light as the contrast colour, a small number of baked or probe-lit bounces. Keep one quiet wall per view so the dense props read.

**Props (selective Meshy trials, own prompts only):** mugs, books, bedding bundles, plants, kitchen tools, toys. Trial five props, score each against the Faceted-hero cleanup checklist (`tools/meshy-heroes`), keep or rebuild in Blender. Hard-surface structure stays Blender-authored; Meshy is not used for the arch, bunks or windows.

**Rule:** no Alters mesh, texture or screenshot is ever an input to Meshy, ComfyUI or any generator.

## 4. Local M5 / ComfyUI: no throughput claim

Not evaluated. Needed before any claim: the M5's actual unified-memory size, the exact 3D model (for example Hunyuan3D or TRELLIS variant), its node pack and macOS/MPS compatibility, plus a timed run on one prop. Until then ComfyUI 3D is "unverified on M5". Repo notes already say Meshy output needs cleanup and its auto-weights were unreliable (`docs/research/character-modeling-2026.md`); that concerns characters, not static props.

## 5. Target-renderer / iPad validation (to do)
Build a one-room test in the real Ranch Atelier renderer first, then measure on Evan's iPad: frame rate, draw calls, texture memory, and lit/unlit look of the emissive and glass materials. Budget guesses to test, not facts: under 150k triangles visible, under 8 materials in view, 1 to 2 dynamic lights.

## 6. Estimates (planning estimates, not measured)
Issue figures are kept as alternative total scopes. No time/token logs were mined in this run, so none are refined.

| Scope | Active hours | Agent tokens | Notes |
|---|---|---|---|
| Composition and shader proof | 8-16 | 50k-150k | one arch bay, 5 materials, 3 lights |
| Polished limited-camera cutaway | 30-60 | 200k-600k | full kit, 5 trial props |
| Explorable optimized room | 70-140 | 500k-1.5M | LODs, collision, iPad pass |

Not yet separated: generation/render waits, Meshy credits (need Evan's plan price), and kit reuse savings. To refine: pull per-task hours and token counts from the Moon Mission and Moon Base kit threads.

## 7. Recommended first experiment
Build **one arch bay**: three rib instances, a bunk, a round window ring, a galley counter, five materials, one warm lamp and one cool window light, viewed from a fixed cutaway camera in the Ranch renderer. Success: it reads as composed on the iPad at 60 fps before any Meshy credit is spent.

## 8. Evidence gaps
Fresh Alters evidence (all of section 2), the reference image, M5 specs, historical effort logs, Meshy credit price.
