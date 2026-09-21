# Minigame packs

A minigame in Abbie's World is a **content pack** plus a **thin world hook**.
The next minigame should not fork World 2, physics, or the map editor.

```
AssetSources/World2/minigames/<pack-id>/
  pack.json                 # id, POI, land, content paths
  content/                  # enemies, cards, boards, levels, fx — data only
  prompts/                  # constrained prompt specs (authoring)
  assets/
    generation.json         # what to fabricate
    raw/                    # immutable generator output
    carved/                 # production PNG/WebP the game reads
    manifest.json           # semantic lookup, never scattered filenames
```

## World hook (keep this small)

1. Register a POI archetype in `World2POIRegistry` (name, art, contract).
2. Place one instance on a scene hardpoint in `World2SceneCatalog`.
3. Connect the scene with an N/S/E/W tunnel in `World2WorldGraphStore`.
4. Handle the contract route in `World2RootView` by opening the pack's view.

Peg Battle uses the existing Plink Pavilion on **Peggle Land**, tunneled **west of Work Land** (Home → west → Work → west → Peggle). Do not invent extra hardpoints.

The custom POI is only the door. Battle state lives in a disposable `BattleSession`.

## Runtime vs authoring

- **Authoring / build:** constrained prompt → generate raster → carve → manifest.
- **Runtime:** `getEnemyState("bad-doggo", "hurt")` reads the carved file. No image-model calls during a shot.
- Missing art must not crash: named silhouette + log, keep playing.

## Raster vs SVG

- Raster through this pack pipeline: characters, states, arena, card art.
- SVG / programmatic: pegs, aim, hearts, shockwaves, meters, comic FX geometry.

## Adding a different minigame later

Copy `peg-battle/` to a new pack id, replace JSON + prompts, run:

```sh
python3 scripts/minigame_packs/generate.py --pack <pack-id>
python3 scripts/minigame_packs/sync.py --pack <pack-id>
```

Then register a new POI + route + view. Do **not** copy `PegBattleSession`.

World 2 door checklist (keep this small):

1. `pack.json` names the existing land / POI, or a new `poi.*` id.
2. `World2POIRegistry` gets one archetype (name, art keys, contract route).
3. Place it on an existing scene hardpoint in `World2SceneCatalog` — Evan places land; do not invent extra pads.
4. One `World2POIRoute` case + one `World2RootView` switch arm that opens **your** view.
5. iOS loads JSON through `World2MinigamePackLoader` so the next pack does not hard-code bundle paths.

Peg Battle reuses `poi.pegglePavilion` on Peggle Land, tunneled **west of Work Land** (Home → west → Work → west → Peggle), route `.plink`.

The custom view is only the door. Live combat stays inside a disposable session.
