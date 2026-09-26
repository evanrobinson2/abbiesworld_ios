# Asset generation service (first-class)

Status: active contract — 2026-09-24.

Plate and POI art for Abbie's World is a **server job**, not a local script ritual and not a dump into `prototypes/studio-mock/plates/`.

## North star

> Use the Game Asset API v1 for assets introduced by a new game.
> — `docs/current-state/GAME_ASSET_REGISTRY_ADOPTION.md`

> Asset bootstrap should be treated as a first-class system.
> — `docs/ABBIES_WORLD_2_PRD.md`

Studio / Zeus / Media Drop all call the same job API. The iPad only **reads** registry (or bundled fallback). Admin keys never ship to the browser, MCP client, or iOS app.

## Job lifecycle

```text
queued → prompting → awaiting_image → ingesting → registered → bound
```

| State | Meaning |
| --- | --- |
| `queued` | Job accepted |
| `prompting` | Style-safe prompt written (OpenAI) |
| `awaiting_image` | Waiting for author to paste a temporary https image URL |
| `ingesting` | MCP downloading staging bytes and `PUT`ting hosted file to Game Asset API |
| `registered` | Bytes live under slash key on `abbies-world-2`; semantic ID is durable |
| `bound` | World scene/place references **semantic ID only** |
| `failed` | Terminal; `error` set |

**Hard rule:** world documents and `asset_bind` / `place_upsert` / `scene_set_background_*` must never store Midjourney or other third-party CDN URLs. Staging URLs are intake-only for `asset_job_complete`.


## Semantic IDs → registry keys

| Play ID | Registry key |
| --- | --- |
| `map.peglin.crashLand` | `maps/peglin/crash-land` |
| `poi.peglin.pegMonastery.exterior` | `pois/peglin/peg-monastery/exterior` |
| `poi.peglin.pegMonastery.interior` | `pois/peglin/peg-monastery/interior` |

Rule: dotted play IDs in world docs; slash keys in the registry. Never invent a third store.

## HTTP API (Studio)

Base: Studio deploy (`/api/asset-jobs`).

| Method | Path | Who |
| --- | --- | --- |
| `POST` | `/api/asset-jobs` | Auth0 household (author) |
| `GET` | `/api/asset-jobs/:id` | Auth0 household |
| `POST` | `/api/asset-jobs` body `{ complete, id, stagingUrl }` | Auth0 household — **downloads + registers hosted file** on Game Asset API |

### Create body

```json
{
  "semanticId": "poi.peglin.pegMonastery.exterior",
  "kind": "poi.exterior",
  "brief": "floating white monastery with blue roofs and waterfalls",
  "stylePin": "abbies-world-storybook"
}
```

### Create response

```json
{
  "id": "job_…",
  "status": "prompting",
  "semanticId": "poi.peglin.pegMonastery.exterior",
  "registryKey": "pois/peglin/peg-monastery/exterior",
  "midjourneyPrompt": "…"
}
```

## MCP surface

Same Streamable HTTP endpoint as world tools: `/api/mcp` (ChatGPT install: `docs/CHATGPT_MCP_INSTALL.md`).

| Tool | Maps to |
| --- | --- |
| `asset_project_create` | In-memory project + library intent + suggested semantic IDs |
| `asset_library_describe` | Refresh library intent / suggestions |
| `asset_project_status` | Read project or list projects |
| `asset_job_create` | `POST /api/asset-jobs` — returns `midjourneyPrompt` + `proofBrief` |
| `asset_job_list` | `GET /api/asset-jobs` |
| `asset_job_status` | `GET /api/asset-jobs?id=` |
| `asset_job_complete` | Download staging https → multipart `PUT` Game Asset API (`ASSET_REGISTRY_ADMIN_API_KEY`) → status `registered` |
| `asset_bind` | World mutate: set scene/place to **semantic ID only** (CDN rejected) |

Steel-rail `author_beat` may emit `asset.job_create` + `asset.bind` only — never freeform bytes.

Smoke: `./scripts/smoke_asset_mcp.sh` (unit store always; HTTP against `MCP_URL`).

## What stays local (scripts)

`scripts/world2_assets/` remains the **qualification / parent-gate / bundle integrate** path for locked production representatives. The service does not delete that rail; it wraps generation + registry publish for Studio tempo.

## Build order

1. Job create + prompt + status (in-memory / creative store) — **this slice**
2. Images API or MJ-complete → staging URL
3. Register via admin key on server
4. Parent gate for character likenesses
5. Media Drop → create job by semantic ID
6. Durable job store (Supabase drafts per STUDIO_PRD)
