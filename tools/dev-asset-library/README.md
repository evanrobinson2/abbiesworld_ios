# Dev Asset Library

Repo-local registry for development art. **Identity and provenance live here**;
bytes may also sit on R2/CDN (`cdnUrl` / `cdnKey`) or in `Assets.xcassets`.

## Files

| Path | Role |
|------|------|
| `data/dev-asset-library/library.json` | The database |
| `data/dev-asset-library/schema.json` | Shape of each record |
| `tools/dev-asset-library/import_repo.mjs` | Seed from asset-viewer + Kit plates |
| `tools/dev-asset-library/mint_card.mjs` | DAG-vetted **card** asset mint |

## Import existing art

```sh
node tools/dev-asset-library/import_repo.mjs
```

## Mint a DAG-vetted card

```sh
node tools/dev-asset-library/mint_card.mjs --topic "rainbow unicorn" --style house
```

DAG nodes (in order):

1. `compose_prompt` — topic + style + plate lock  
2. `generate_image` — OpenAI if `OPENAI_API_KEY` set; else placeholder SVG→PNG skip with `skipped`  
3. `carve_check` — asserts transparent-friendly plate language still present  
4. `hash_sha256` — content address  
5. `register_library` — write/update `library.json` as `dag_pending` / `vetted`  
6. `parent_gate` — stays `dag_pending` until marked vetted (`--mark-vetted`)

Card files land in `AssetSources/DevAssetLibrary/cards/`.

## Pull Media Drop inbox (Suno / Midjourney)

After using the Media Drop app (`prototypes/media-drop`):

```sh
ABBIES_WORLD_SERVER_URL=http://abbies.world:8000 \
ABBIES_WORLD_SERVER_API_KEY=... \
node tools/dev-asset-library/pull_inbox.mjs
```
