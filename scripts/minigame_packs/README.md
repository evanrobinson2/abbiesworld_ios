# Minigame pack asset pipeline

Authoring only. Battle runtime never calls these scripts.

```sh
python3 scripts/minigame_packs/generate.py --pack peg-battle
python3 scripts/minigame_packs/sync.py --pack peg-battle
```

`generate.py` reads `AssetSources/World2/minigames/<pack>/assets/generation.json`,
writes raw + carved rasters, and updates `assets/manifest.json`.

`sync.py` copies JSON + carved PNGs into:

- `prototypes/peggle/data/<pack>/` and `public/assets/<pack>/`
- `abbies.world.ios/.../Resources/World2/minigames/<pack>/`
- `Assets.xcassets/world2_peg_battle_*.imageset`
