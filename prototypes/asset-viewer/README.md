# Abbie's World asset browser

A Next.js browser over **every image in the repo** — 1192 assets across 8 kinds.
83 were generated for the Decorator Machine and carved to transparency; the rest
were already here and are classified from their path.

**Live:** https://asset-viewer-phi.vercel.app

## Two levels: kind, then family

A **kind** is the bucket an asset lives in for browsing. A **family** is the
specific job it does.

| Kind | Generated | In repo | What it holds |
| --- | --- | --- | --- |
| Ingredient | 33 | – | Essences and enchantments. Abstract inputs. |
| Raw material | 14 | 37 | Materials, plus the furniture shop's existing ingredient art. |
| Crafting item | 26 | 5 | Forms, trims, tools, plus existing furniture fittings. |
| Decoration | 10 | 188 | Machine output, plus the shipped Cozy Room set. |
| Scene art | – | 513 | Maps, scene backdrops, POI exteriors and interiors. |
| Character art | – | 57 | Creature Builder parts, actors, media pack characters. |
| Interface art | – | 99 | Icons, buttons, app icons, mascots. |
| Reference | – | 210 | Concept sheets and pipeline working files. |

## Recipe families

Five families are **recipe slots** — the ones the machine actually consumes.
Each answers one plain question, so a recipe reads back as a sentence:

> A **Little Chair** made of **Gingerbread**, with **Cozy Nap Energy**, that
> **purrs when you sit**, finished with **Pompom Fringe**.

| Family | Question | Job |
| --- | --- | --- |
| Form | What is it? | The undecorated blank. Decides what is being built. |
| Material | What is it made of? | Raw stuff, shown as a bare sample. |
| Essence | How does it feel? | Bottled mood. Changes the feeling, never the thing. |
| Enchantment | What does it do? | The trick it performs. |
| Trim | What is the finishing touch? | Haberdashery. Cheap variety. |

Only a form is strictly required. Two families are deliberately **not** slots:
**tools** gate what the workshop can do at all rather than being consumed, and
**decorations** are what comes out the other end.

## The decorations prove the pipeline

Each of the ten generated decorations was produced by feeding image generation
the exact prompt that its own recipe composes through `app/recipe.js`. The
recipe and the resulting prompt are both stored in the catalogue, and
`npm run check` recomposes every recipe and asserts it reproduces the stored
prompt character for character. If the composer ever drifts from the art, the
check fails.

So the chain is inspectable end to end: ingredients → recipe → prompt → art.

## What the browser does

- **Metadata filters.** Kind, then family, then category and tag rows, each
  narrowing to the level above so no combination returns nothing. Plus a source
  filter (generated vs already in repo) and free-text search across name, id,
  repo path, tags, and prompt text.
- **Background plates.** Checkerboard, magenta halo test, white, dark, treehouse.
  A halo invisible on white is obvious on magenta.
- **Stage toggle.** Carved RGBA against the raw generated card, where both exist.
- **Prompt display.** Every generated asset records the prompt that made it.
- **Recipe mix.** Click ingredients to fill the five slots and see both the
  child's readback and the prompt the machine would send.
- **Sort** by catalogue order, name, carve coverage, or largest file — coverage
  first surfaces a bad carve, largest first surfaces bloat.
- Results page at 120 at a time, because 1192 cards at once is not a review.

## Run it

```bash
npm install
npm run dev     # http://localhost:5174
npm run check   # recipe wording, prompt drift, catalogue integrity
```

`npm run check` uses the built-in node test runner, no extra dependencies.

## Rebuilding after new art

```bash
# 1. carve raw generations to trimmed RGBA sprites
python3 tools/carve-assets/carve.py \
  --in AssetSources/IngredientKit/raw \
  --out AssetSources/IngredientKit/carved \
  --size 512 --manifest AssetSources/IngredientKit/carve-report.json

# 2. re-index everything already in the repo
python3 tools/carve-assets/index_repo_assets.py

# 3. merge both into the viewer's catalogue and previews
python3 tools/carve-assets/build_viewer_assets.py
```

| Stage | Location | Notes |
| --- | --- | --- |
| Raw | `AssetSources/IngredientKit/raw/*.png` | 1024px, as generated, flat grey plate |
| Carved | `AssetSources/IngredientKit/carved/*.png` | 512px RGBA, trimmed and padded |
| Report | `AssetSources/IngredientKit/carve-report.json` | per-file carve stats |
| Previews | `public/assets/{carved,raw}/*.webp` | 384px, generated art |
| Thumbnails | `public/assets/repo/*.webp` | 144px, everything else |

Step 3 fails loudly on a catalogue entry with no art, a generated asset with no
recorded prompt, or a carved file with no catalogue entry. Step 2 reports
anything it could not classify, which is the signal to add a rule rather than a
thing to ignore.
