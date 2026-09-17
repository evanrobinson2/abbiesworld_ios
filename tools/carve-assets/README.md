# carve-assets

Offline art pipeline for generated game art: take an image generated on a flat
background, cut it to a trimmed RGBA sprite, and report on the result as text
so a batch can be reviewed without opening every file.

This is the offline twin of `DevAssetCarvingService` in the iOS app. That
service decides transparency purely by colour distance from the background,
which is fine for an opaque object but eats holes out of anything pale or
translucent — a glass bottle against a light grey card loses its glass. So
`carve.py` finds the background by flooding inward from the border instead:
only background-coloured pixels *connected to the edge* are removed, and a pale
highlight in the middle of the subject survives.

## Requirements

```bash
pip3 install Pillow numpy scipy
```

## Carve a directory

```bash
python3 tools/carve-assets/carve.py \
  --in  AssetSources/IngredientKit/raw \
  --out AssetSources/IngredientKit/carved \
  --size 512 \
  --manifest AssetSources/IngredientKit/carve-report.json
```

Per file it prints the detected background colour, the trimmed bounding box,
and what fraction of the output is opaque. It exits non-zero if any file fails
or if coverage lands outside 5–95%, which is how a carve that ate the subject
or kept the whole plate shows up.

## Rebuild the viewer's data

```bash
python3 tools/carve-assets/build_viewer_assets.py
```

Builds the viewer's catalogue from two sources — essences from
`DecoratorModels.swift` and every other ingredient family from
`catalog/ingredients.json` — joins both with the carve report, and writes
`prototypes/asset-viewer/data/assets.json` plus 384px WebP previews. It exits
non-zero on a catalogue entry with no art, an asset with no recorded prompt, or
a carved file with no catalogue entry. See `prototypes/asset-viewer/README.md`.

## The ingredient catalogue

`catalog/ingredients.json` is the source of truth for every non-essence
ingredient. Each family declares a `promptTemplate`; each ingredient supplies
the `subject` that fills it, plus its category, tags and emoji. That means the
prompt behind any piece of art is recorded next to the art itself, and a whole
family can be restyled by editing one template.

The recorded prompts are normalised to their family template rather than being
byte-identical to the first generation, so regenerating gives equivalent art
rather than a pixel-for-pixel repeat.

## Generating art that carves well

The carve only works if the plate is genuinely flat, so the generation prompt
has to ask for it:

> …Centered composition, the subject fills most of the frame. Completely flat
> solid light gray background, absolutely no gradient, no drop shadow, no
> scenery, no text, no letters, no numbers.

Without "no gradient" and "no drop shadow" the border median is meaningless and
the carve leaves a grey fringe.
