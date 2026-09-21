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

Then register a new POI + route + view. Do not copy the battle engine into that game.
