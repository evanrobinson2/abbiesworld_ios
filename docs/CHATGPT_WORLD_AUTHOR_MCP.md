# ChatGPT: Abbie’s World steel-rail authorship

Use ChatGPT developer mode as the dungeon master for the **live household world**. The MCP is the steel rail: natural language may propose; only closed ops land. Full contract: [`current-state/STEEL_RAIL_AUTHORSHIP.md`](./current-state/STEEL_RAIL_AUTHORSHIP.md). Connector install basics: [`CHATGPT_MCP_INSTALL.md`](./CHATGPT_MCP_INSTALL.md).

**URL:** `https://studio-mock-iota.vercel.app/api/mcp`  
**Auth on connector:** OAuth (Auth0). See [`CHATGPT_MCP_INSTALL.md`](./CHATGPT_MCP_INSTALL.md).

---

## Install (once)

1. ChatGPT → **Settings → Apps → Advanced settings → Developer mode**.
2. **Settings → Apps → Create**.
3. Name: `Abbie's World`.
4. MCP server URL: `https://studio-mock-iota.vercel.app/api/mcp`.
5. Authentication: **None**.
6. **Scan tools**. You should see at least:
   - Orient: `read_primer`, `poi_capabilities`
   - Ground: `world_describe`, `world_lint`, `world_get_current`
   - Steel rail: **`author_beat`**, `asset_job_create`, `asset_job_status`, `asset_job_complete`, `asset_bind`
   - Low-level: `scene_upsert`, `place_upsert`, `scene_connect`, `vars_apply`, …

Scan does not need a token. Writes do.

---

## Token for writes

1. Sign in at [Studio](https://studio-mock-iota.vercel.app).
2. Tap **Copy MCP token**.
3. Pass that string as `accessToken` on tools (or paste it in the first message below).
4. Tokens expire. If a call returns `auth_required`, copy a fresh one.

`read_primer` and `poi_capabilities` work with no token.

---

## Habit (non-negotiable)

```text
read_primer → world_describe → author_beat (dryRun) → show plan → confirm → world_lint
```

| Step | Tool | Notes |
| --- | --- | --- |
| Orient | `read_primer` | Then `poi_capabilities` if placing POIs |
| Ground | `world_describe` | Always before edits |
| Plan | `author_beat` with `dryRun: true` (default) | Closed ops only; never invent screens |
| Confirm | `author_beat` same intent with `confirm: true` | Only after you OK the plan |
| Check | `world_lint` | No orphan instances / dangling travel |

Prefer **`author_beat`** + `asset_job_*` / `asset_bind` over freeform `scene_upsert` / `place_upsert`. Low-level tools stay for precise patches you already know.

### `author_beat` flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `dryRun` | `true` | Return `plan.ops[]` + rails; do not mutate |
| `confirm` | `false` | Set `true` only to execute a validated plan |
| `activeSceneHint` | optional | Prefer this scene id for new places |

Never set `confirm: true` on the first call. Never call `world_create` with `confirmReplace` unless Evan explicitly asks to wipe (players are still kept).

---

## First message to paste

```
You are the dungeon master for Abbie's World (gentle kids iPad game).

Habit: read_primer → world_describe → author_beat with dryRun true → show me the plan → only then author_beat with confirm true → world_lint.

Rules:
- Prefer author_beat over freeform scene/place edits.
- POIs are a picture + an existing behavior (or travel:<sceneId>). Do not invent new screens, dialogue, or puzzles.
- Durable art uses semantic ids (map.*, poi.*.exterior|interior). Midjourney https URLs are staging only — create an asset job, paste the URL via asset_job_complete, then asset_bind.
- Place x,y between 0 and 1 (roughly 0.12–0.88). One scene plate at a time on the iPad.
- Use vars_apply for counters; do not do the math yourself.
- Never drop players. Do not world_create with confirmReplace unless I say so.

My access token is: <paste from Studio → Copy MCP token>
```

---

## Example prompts

**Dry-run a landmark**

```
Call world_describe, then author_beat dryRun with intent:
"Add Peg Monastery on the crash land scene as pegMonastery behavior, with exterior art job."
Show me plan.ops and warnings. Do not confirm yet.
```

**Confirm after review**

```
Looks good. author_beat the same intent with confirm true, then world_lint.
```

**Art-only job (no world mutate yet)**

```
asset_job_create semanticId poi.peglin.pegMonastery.exterior, kind poi.exterior,
brief "floating white monastery with blue roofs and waterfalls".
Show midjourneyPrompt and job id.
```

**After Midjourney**

```
asset_job_complete jobId <id> stagingUrl <https://cdn.midjourney.com/…>
Then asset_bind that semanticId onto the place exterior (or scene background).
```

**Travel exit**

```
Dry-run: connect crash land to a new cozy interior scene with travel both ways.
Prefer author_beat; show ops before confirm.
```

---

## What ChatGPT can and cannot do

| Can | Cannot |
| --- | --- |
| Plan + execute closed ops via `author_beat` | Invent new `World2POIRoute` screens |
| Place POIs, travel links, session/vars | Dialogue trees, quest scripts, puzzles |
| Start asset jobs + bind semantic ids | Register durable CDN without Game Asset API / admin path |
| Lint and describe the live world | Wipe players or replace the world casually |

Honest POI limit: name + picture + existing behavior. Story flavor lives in those and the session HUD — not inside a new custom UI.

---

## Related

- Install + Cursor: [`CHATGPT_MCP_INSTALL.md`](./CHATGPT_MCP_INSTALL.md)
- Rails: [`current-state/STEEL_RAIL_AUTHORSHIP.md`](./current-state/STEEL_RAIL_AUTHORSHIP.md)
- Asset jobs: [`current-state/ASSET_GENERATION_SERVICE.md`](./current-state/ASSET_GENERATION_SERVICE.md)
- Studio asset job UI: `/assets.html` on the Studio deploy (or local `server.py` → same path; API needs Bearer against the deploy)
