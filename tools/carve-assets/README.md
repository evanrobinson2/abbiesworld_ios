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
  --in  AssetSources/EssenceKit/raw \
  --out AssetSources/EssenceKit/carved \
  --size 512 \
  --manifest AssetSources/EssenceKit/carve-report.json
```

Per file it prints the detected background colour, the trimmed bounding box,
and what fraction of the output is opaque. It exits non-zero if any file fails
or if coverage lands outside 5–95%, which is how a carve that ate the subject
or kept the whole plate shows up.

## Rebuild the viewer's data

```bash
python3 tools/carve-assets/build_viewer_assets.py
```

Re-reads the essence list from `DecoratorModels.swift`, joins it with the carve
report, and writes `prototypes/essence-viewer/data/essences.json` plus 384px
WebP previews. See `prototypes/essence-viewer/README.md`.

## Generating art that carves well

The carve only works if the plate is genuinely flat, so the generation prompt
has to ask for it:

> …Centered composition, the subject fills most of the frame. Completely flat
> solid light gray background, absolutely no gradient, no drop shadow, no
> scenery, no text, no letters, no numbers.

Without "no gradient" and "no drop shadow" the border median is meaningless and
the carve leaves a grey fringe.
