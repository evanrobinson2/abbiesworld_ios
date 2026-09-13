# Cozy Room asset extraction DAG

This local pipeline turns the four supplied 1024×1024 prop atlases into 66
individually labeled transparent PNGs and integrates the exact bytes into the iOS
asset catalog.

## Run

The first run imports the original atlases immutably:

```sh
python3 scripts/cozy_room_assets/extract.py \
  --source /path/to/atlas-1.jpg \
  --source /path/to/atlas-2.jpg \
  --source /path/to/atlas-3.jpg \
  --source /path/to/atlas-4.jpg
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
foreground-distance mask, closes small gaps, and finds connected components. The
expected component count is locked per source sheet so changed art cannot silently
shift labels. GrabCut uses each selected edge component as foreground and neighboring
components as background, which prevents overlapping bounding boxes from leaking
into one another.

Outputs:

- `AssetSources/CozyRoomKit/sources/`: immutable supplied atlases.
- `AssetSources/CozyRoomKit/extracted/`: canonical transparent PNGs.
- `AssetSources/CozyRoomKit/manifest.json`: searchable labels, categories,
  descriptions, tags, bounds, dimensions, and SHA-256 provenance.
- `AssetSources/CozyRoomKit/evidence/dag-run.json`: node inputs, outputs, graph edges,
  and textual validation status.
- `AssetSources/CozyRoomKit/evidence/edge-labels/`: numbered edge-bound overlays.
- `AssetSources/CozyRoomKit/review/contact-sheet.png`: checkerboard alpha review.
- `Assets.xcassets/cozy_room_*.imageset`: game-ready catalog entries.
- `Assets.xcassets/cozy_room_asset_manifest.dataset`: bundled runtime manifest.

The source cluster labeled **Rainbow Craft Nook** stays one asset because its table,
cabinet, and stools are edge-connected in the supplied atlas. Splitting through that
cluster would destroy shared pixels.
