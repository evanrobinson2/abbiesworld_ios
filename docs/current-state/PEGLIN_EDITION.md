# Peglin Edition — integration notes

## Asset manifest (autogen)

See [`PEGLIN_EDITION_ASSET_MANIFEST.md`](./PEGLIN_EDITION_ASSET_MANIFEST.md).

## Lands (V1)

```
Crash World  →  Bramble  →  Fox Land  →  Stag Land  →  Forgotten Realm
 (hub)         (plink)      (plink)       (plink)        (free power-up)
```

Plates bundled for Bramble / Fox / Stag / Forgotten Realm.  
**Crash World plate still pending upload** (`map.peglin.crashLand`).

## Modular PlinkCore

Physics lives under `Views/World2/Plink/Core/` (copied from `prototypes/PlinkCore`).
Keep the prototype app for tuning; ship battles via `PlinkBattleHostView` (disposable session).

## Default routing

`PeglinEdition.isDefaultDestination` (default **on**).  
Override: `-peglinEditionOff` / `-peglinEditionOn`.

Login → Crash World (`scene.peglin.crashLand` / `WorldId.peglinEdition`).  
Prior worlds remain in catalog + household document.

## Seed household document (when MCP token is fresh)

```bash
export ABBIES_WORLD_TOKEN=…   # Studio Copy MCP token
python3 scripts/peglin_edition/seed_crash_land_mcp.py
```

Do **not** `world_create` with replace — that would wipe other scenes. Seed is additive upserts.

## Definition of done (code)

- [x] Loading: ABBIE'S WORLD + MARBLE VOYAGE
- [x] Standalone product title: Abbie's World · Marble Voyage (not Peglin Edition)
- [x] Five-land chain + Crash POI shells
- [x] Battle host with reset/leave lifecycle + logs
- [x] Prior worlds intact
- [ ] Crash World plate when Evan uploads
- [ ] MCP seed when token refreshed
- [ ] Registry publish for bundled land plates
