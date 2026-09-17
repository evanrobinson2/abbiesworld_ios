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

## Studio: make something new

The **Studio** tab generates art from a topic and a style. Type what you want,
choose whose job it is, pick a look, and it gets made.

A prompt is three parts in a fixed order:

1. **the topic, cast into a family's role** — what to draw. The same topic
   becomes a different prompt per family: `mushroom` as a *form* is a plain
   unpainted blank, as a *material* it is a bare sample, as an *essence* it is a
   bottled mood.
2. **the style's look** — how to draw it.
3. **the plate** — how to frame and isolate it.

The plate is **not configurable**, by anyone, ever. Carving finds the background
by flooding inward from the image border, so a prompt that admits scenery, a
gradient or a drop shadow produces art that cannot become a sprite. A style may
change how a thing looks; it may not change that. `npm run check` asserts every
prompt still ends with the plate for every style, every family, a style someone
wrote themselves, and a topic that explicitly asks for a sunlit forest and a
long dramatic shadow.

Prompts are composed **server-side** and returned with the image, so the prompt
shown is provably the prompt sent.

### Styles

Eight ship: house (what the existing 83 assets were generated in), watercolour,
felt and stitch, claymation, paper cut, wax crayon, stained glass, gingerbread.
Each says when to use it and how well it carves.

Styles are data. Add one permanently by adding an entry to `data/styles.json`
with a `look` clause. A style written in the browser is kept in local storage
and the panel says so rather than implying it persisted.

### Keeping a generation

The deployment is read-only, so nothing is saved server-side. The studio gives
you the WebP to download and a ready-made catalogue entry to paste, and says
exactly what to do with them. Committing is a deliberate act.

## Configuring generation

Two environment variables, both set for you on Vercel already. Copy
`.env.example` to `.env.local` for local work.

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | Pays for and produces the images. Needs `gpt-image-2`. |
| `AI_GATEWAY_API_KEY` | no | Routes through Vercel AI Gateway for spend tracking, budgets and logs. |

Generation prefers **Vercel AI Gateway in BYOK mode**: the gateway
authenticates the Vercel team but calls OpenAI with `OPENAI_API_KEY`, so OpenAI
bills directly and Vercel adds no markup, while you still get per-key budgets,
tagging and request logs. Create a key with a cap:

```bash
vercel ai-gateway api-keys create --name asset-studio --limit 25 --refresh-period monthly
```

**The gateway currently answers `403 customer_verification_required`** until the
team has a card on file, even in BYOK mode where Vercel is not charging for
tokens. Rather than ship a dead button, an unusable gateway falls back to
calling OpenAI directly; the response names the route that served it and lists
every attempt, and the studio shows both. Add the card and the gateway takes
over with no code change.

Quality is **quick** (~10s) or **good** (~30s). A `high` tier is deliberately
not offered, because the function ceiling is 60s on every Vercel plan and high
can exceed it.

### Access

The deployment is behind **Vercel Authentication on all domains**, because
`/api/generate` spends real money and an open endpoint on a guessable URL does
not. Sign in with the Vercel account that owns the project and it behaves
normally. To open it up again:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' \
  -d '{"ssoProtection":null}'
```

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:5174
npm run check                # prompt invariants, recipe wording, catalogue integrity
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
