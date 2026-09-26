# Steel-rail 2D world authorship

Status: active contract — 2026-09-24.

Natural language may **propose** world changes. Only a closed set of ops may **land**.
The child iPad never runs raw model text. Studio MCP and Zeus share this rail.

## North star

> A new world is a document plus registry files. It does not need a new app build.
> — `docs/STUDIO_PRD.md`

NL authorship is the product surface. The MCP tools below it are the steel rail.

## Rails (non-negotiable)

| Rail | Rule |
| --- | --- |
| Behaviors | Place `behavior` must resolve to an existing `World2POIRoute` (whitelist). No invented screens. |
| Players | Never drop or replace `players`. `world_create` wipe needs explicit `confirmReplace`. |
| Revision | Every write sends `expectedRevision`; on 409 reload and retry once. |
| Assets | Durable plates bind by **semantic ID** only. Midjourney/CDN `https://` is intake for `asset_job_complete` (server re-hosts on Game Asset API). `asset_bind` / place / scene tools reject raw CDN URLs. |
| Lint | After mutations, `world_lint` must be clean enough to play (no orphan instances, no dangling travel). |
| Layout | POI `x,y` in 0–1; keep roughly 0.12–0.88. One scene plate at a time on the iPad. |
| Confirm | `author_beat` defaults to `dryRun: true`. Execute only with `confirm: true`. |

## Closed op set

NL planners may emit **only** these ops (names match MCP / author_beat):

```text
scene.upsert
scene.set_background_semantic
# scene.set_background_url — rejected for https; use asset_job_complete + bind
place.upsert
scene.connect
asset.job_create
asset.bind                        # semantic ID only; CDN forbidden
vars.apply
session.patch
```

Anything else is `rail_rejected`.

## MCP tools (authorship layer)

| Tool | Role |
| --- | --- |
| `read_primer` / `poi_capabilities` | Orient before authoring |
| `world_describe` / `world_lint` | Ground truth |
| `author_beat` | NL → validated plan → optional execute |
| `asset_job_create` / `asset_job_status` | First-class plate generation jobs |
| `asset_bind` | Bind semantic (or staging URL) onto scene/place |
| Low-level `scene_*` / `place_*` / `vars_*` | Direct edits when the plan is already known |

## `author_beat` contract

```json
{
  "intent": "Add a cozy bell monastery on Crash World that opens pegMonastery",
  "dryRun": true,
  "confirm": false,
  "activeSceneHint": "scene.peglin.crashLand"
}
```

Response always includes:

- `plan.ops[]` — only closed ops
- `rails[]` — which checks ran
- `warnings[]` — e.g. staging URL, missing plate
- `executed` — false unless `confirm: true` and all rails passed

## Related

- ChatGPT install (authorship): `docs/CHATGPT_WORLD_AUTHOR_MCP.md`
- Asset jobs: `docs/current-state/ASSET_GENERATION_SERVICE.md`
- Registry keys: `docs/current-state/GAME_ASSET_REGISTRY_ADOPTION.md`
- Zeus primer: `docs/GPT_DUNGEON_MASTER_PRIMER.md`
- Studio UI: `/assets.html` (job list + create + MJ complete)
- Impl: `prototypes/studio-mock/api/lib/steel-rail.js`, `api/mcp.js`
