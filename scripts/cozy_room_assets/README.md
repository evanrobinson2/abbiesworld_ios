# Cozy Room asset extraction DAG

This local pipeline turns the five supplied 1024×1024 atlases into 88 individually
labeled transparent PNGs and integrates the exact bytes into the iOS asset catalog.
The manifest distinguishes 66 `placeable-room-prop` assets from 22
`furniture-store-ingredient` assets.

## Run

The first run imports the original atlases immutably:

```sh
python3 scripts/cozy_room_assets/extract.py \
  --source /path/to/atlas-1.jpg \
  --source /path/to/atlas-2.jpg \
  --source /path/to/atlas-3.jpg \
  --source /path/to/atlas-4.jpg \
  --source /path/to/furniture-ingredients-atlas.jpg
```

Later deterministic runs need no arguments:

```sh
python3 scripts/cozy_room_assets/extract.py
```

Python requires Pillow, NumPy, and OpenCV. The pipeline writes one structured JSON
event per completed node so an AI assistant or test runner can inspect progress
without interpreting images.

## DAG

`verify sources → detect edges → extract alpha → {integrate Xcode assets, write
catalog, render review} → validate`

Edge detection estimates each sheet's pale background from its border, creates a
foreground-distance mask, closes small gaps, and finds connected components. Room
prop sheets lock their expected component count so changed art cannot silently shift
labels. The ingredient atlas uses labeled semantic regions because several separate
ingredients touch in the generated source. GrabCut still finds the real edge inside
each region instead of exporting rectangular crops.

Outputs:

- `AssetSources/CozyRoomKit/sources/`: immutable supplied atlases.
- `AssetSources/CozyRoomKit/extracted/`: canonical transparent PNGs.
- `AssetSources/CozyRoomKit/manifest.json`: searchable labels, categories,
  descriptions, tags, bounds, dimensions, and SHA-256 provenance.
- `AssetSources/CozyRoomKit/evidence/dag-run.json`: node inputs, outputs, graph edges,
  and textual validation status.
- `AssetSources/CozyRoomKit/evidence/edge-labels/`: numbered edge-bound overlays.
- `AssetSources/CozyRoomKit/review/contact-sheet.png`: checkerboard alpha review.
- `Assets.xcassets/cozy_room_*.imageset`: game-ready room props.
- `Assets.xcassets/furniture_ingredient_*.imageset`: game-ready store ingredients.
- `Assets.xcassets/cozy_room_asset_manifest.dataset`: bundled runtime manifest.

The source cluster labeled **Rainbow Craft Nook** stays one asset because its table,
cabinet, and stools are edge-connected in the supplied atlas. Splitting through that
cluster would destroy shared pixels.
