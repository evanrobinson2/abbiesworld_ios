# Decorator Machine asset viewer

A Next.js browser for reviewing the Decorator Machine's ingredient art, and for
checking that the ingredient taxonomy actually composes into something a child
could understand.

**Live:** https://asset-viewer-phi.vercel.app

## Why five families

Each family answers one plain question, so a recipe reads back as a sentence:

> A **Little Chair** made of **Gingerbread**, with **Cozy Nap Energy**, that
> **purrs when you sit**, finished with **Pompom Fringe**.

| Family | Question | Job |
| --- | --- | --- |
| Form | What is it? | The undecorated blank. Decides what is being built. |
| Material | What is it made of? | Raw stuff, shown as a bare sample. Carries look and feel. |
| Essence | How does it feel? | Bottled mood. Changes the feeling, never the thing. |
| Enchantment | What does it do? | The trick it performs. A couch that burps rainbows. |
| Trim | What is the finishing touch? | Haberdashery. Cheap variety on otherwise identical pieces. |

Only a form is strictly required — everything else adds to a thing that already
exists. That asymmetry is why forms are their own family rather than just
another kind of ingredient, and it is why essences alone cannot drive the
machine.

## What the viewer does

- **Metadata filters.** Family, then category and tag rows that narrow to
  whichever family is selected, so no combination of filters returns nothing.
  Plus free-text search across name, id, category, tags, and prompt text.
- **Stage toggle.** Carved RGBA against the raw generated card.
- **Background plates.** Checkerboard, magenta halo test, white, dark, and a
  treehouse gradient. A halo that is invisible on white is obvious on magenta,
  and a sprite that reads on white can vanish against the treehouse interior.
- **Prompt display.** Every asset records the prompt that produced it; toggle
  them on to read them inline.
- **Recipe mix.** Click ingredients to fill one slot per family and see both the
  kid-facing readback and the image-generation prompt the machine would send.
  "Surprise me" fills all five at random.
- **Sort** by catalogue order, name, or carve coverage — coverage first is the
  fastest way to spot a carve that went wrong.

## Run it

```bash
npm install
npm run dev     # http://localhost:5174
npm run check   # recipe wording and catalogue integrity
```

`npm run check` uses the built-in node test runner, no extra dependencies. It
asserts that every catalogued asset has art and a recorded prompt, that recipes
read as sentences, and that ingredient tags reach the composed prompt.

## Where the art comes from

| Stage | Location | Notes |
| --- | --- | --- |
| Raw | `AssetSources/IngredientKit/raw/*.png` | 1024px, as generated, on a flat grey plate |
| Carved | `AssetSources/IngredientKit/carved/*.png` | 512px RGBA, trimmed and padded |
| Report | `AssetSources/IngredientKit/carve-report.json` | per-file carve stats |
| Previews | `public/assets/{carved,raw}/*.webp` | 384px, served by this app |

Two sources feed the catalogue. Essences come from `DecoratorModels.swift`, so
the game's own list stays authoritative and nothing here can invent an essence
the app does not have. Every other family comes from
`tools/carve-assets/catalog/ingredients.json`, which also carries the prompt for
each piece.

To regenerate after adding or recarving art:

```bash
python3 tools/carve-assets/carve.py \
  --in AssetSources/IngredientKit/raw \
  --out AssetSources/IngredientKit/carved \
  --size 512 --manifest AssetSources/IngredientKit/carve-report.json

python3 tools/carve-assets/build_viewer_assets.py
```

The second script fails loudly on a catalogue entry with no art, an asset with
no recorded prompt, or a carved file with no catalogue entry.
