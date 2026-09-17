# Essence Kit viewer

A small Next.js gallery for reviewing the Decorator Machine's ingredient art. It
exists because judging a carved sprite needs a background: a leftover halo that
is invisible on white is obvious on magenta, and a sprite that reads fine on
white can disappear against the treehouse interior.

## What it shows

All 25 essences from `DecoratorModels.swift`, each with:

- the **carved** RGBA sprite or the **raw** generated card, toggled
- a switchable background — checkerboard, magenta halo test, white, dark, and a
  treehouse-ish gradient
- category filter, and the carve stats for that file (detected background
  colour, trimmed size, output size, percent coverage)

## Run it

```bash
npm install
npm run dev     # http://localhost:5174
```

The dev server uses port 5174 to stay clear of the other prototypes.

## Where the art comes from

`DecoratorModels.swift` named an `imageName` for every essence (for example
`essence_cozy_nap`), but no such images existed, so the app fell back to
rendering the emoji. These fill that gap.

| Stage | Location | Notes |
| --- | --- | --- |
| Raw | `AssetSources/EssenceKit/raw/*.png` | 1024px, as generated, on a flat grey plate |
| Carved | `AssetSources/EssenceKit/carved/*.png` | 512px RGBA, trimmed and padded |
| Report | `AssetSources/EssenceKit/carve-report.json` | per-file carve stats |
| Previews | `public/essences/{carved,raw}/*.webp` | 384px, served by this app |

To regenerate after adding or recarving art:

```bash
python3 tools/carve-assets/carve.py \
  --in AssetSources/EssenceKit/raw \
  --out AssetSources/EssenceKit/carved \
  --size 512 --manifest AssetSources/EssenceKit/carve-report.json

python3 tools/carve-assets/build_viewer_assets.py
```

The second script re-reads the Swift catalogue, so an essence added to the game
shows up here as "no art yet" until a file exists for it.
