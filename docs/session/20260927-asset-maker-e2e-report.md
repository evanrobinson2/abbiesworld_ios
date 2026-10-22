# Asset maker arbitrage — E2E report (2026-09-27)

**Deploy:** `https://studio-mock-iota.vercel.app` · MCP meta version `0.3.0`  
**Contract:** `docs/current-state/ASSET_GENERATION_SERVICE.md`  
**Evidence time:** ~2026-09-27T13:43–13:45Z

## Verdict

Job pipe **create → awaiting_image → ingesting → registered** works when:
1. create and complete hit the **same** Vercel function isolate (`/api/asset-jobs`↔`/api/asset-jobs` or `/api/mcp`↔`/api/mcp`), and
2. `stagingUrl` is an https image the Studio function can download (httpbin / GitHub raw / picsum OK; Wikimedia returned 400).

It does **not** yet deliver a world-bound, iPad-usable plate end-to-end. First hard breaks below.

## Step matrix

| Step | Path | Result | Evidence |
| --- | --- | --- | --- |
| Unit store | local `asset-jobs-store.test.js` | OK | smoke |
| MCP meta GET | unauth | OK — lists asset tools | version 0.3.0 |
| `tools/list` | unauth | **FAIL** `invalid_token` | breaks `./scripts/smoke_asset_mcp.sh` |
| `tools/list` | Bearer | OK — 26 tools incl. all `asset_*` | |
| Cursor MCP catalog | Cursor `user-abbies-world` | **FAIL** discovery error; catalog omits `asset_*` | agent cannot call tools natively |
| `POST /api/asset-jobs` create | Bearer (≥16 chars; **not** validating Auth0) | OK → `awaiting_image` + OpenAI prompt | `job_mujvcjw4_1c5p32` |
| Complete + Wikimedia PNG | HTTP | **FAIL** `staging_download_failed` status 400 | host-blocked |
| Complete + httpbin/GitHub/picsum | HTTP | OK → `registered` | e.g. `poi.assetMaker.e2eProbe3.exterior` rev 1–3 |
| MCP create → MCP complete | MCP | OK → `registered` | `job_mujveqf9_eez9fr` / `poi.assetMaker.mcpE2E.exterior` |
| HTTP create → MCP status | cross-route | **FAIL** `job_missing` | separate in-memory Maps per function |
| MCP create → HTTP get | cross-route | **FAIL** `job_missing` | same |
| `asset_project_create` | MCP | OK + peg monastery suggestions | `proj_mujvervz_0u6ksd` |
| `asset_bind` / `world_describe` | MCP | **FAIL** world 401 | `ABBIES_WORLD_TOKEN` expired (~2.5h) |
| Registry `deliveryURL` | returned on register | `http://abbies.world:8000/api/v1/asset-content/…` | LAN HTTP; GET → 401 without read key; public `https://abbies.world` timed out from probe host |

## First hard break (operator order)

1. **P0 — Auth for world bind:** `ABBIES_WORLD_TOKEN` expired (`exp` 2026-09-27T11:09:41Z). Asset-job HTTP accepts any Bearer ≥16 chars, so create/register can succeed while `asset_bind` / world tools return 401. Refresh Studio “Copy MCP token”.
2. **P0 — Split job memory:** `/api/mcp` and `/api/asset-jobs` do not share the in-memory job Map. Cross-route complete/status → `job_missing`. Durable store (Supabase) or shared KV is required; until then operators must stay on one surface.
3. **P0 — Cursor MCP surface:** live tool discovery for `abbies-world` is broken/stale in this agent (no `asset_job_*`). Workaround: raw HTTP/JSON-RPC with curl as in this report. TED talk NL path will hit the same gap unless Cursor reconnects after auth refresh.
4. **P1 — Smoke script false negative:** `smoke_asset_mcp.sh` calls `tools/list` without `Authorization`, then expects complete status `staging` (code now returns `registered`).
5. **P1 — Staging host variance:** some CDNs (Wikimedia) → `staging_download_failed`; MJ CDN still untested this session.
6. **P1 — deliveryURL shape:** registered assets point at `http://abbies.world:8000/...` (household origin). Fine if iPad resolves semantic IDs via the household Game Asset API; bad if anything treats `deliveryURL` as a public CDN SoT.
7. **P2 — Autonomy:** still manual MJ paste into `asset_job_complete`; no Images API / remote worker hook exercised here (TED talk owns NL→worker).

## Minimal repros

### Cross-route job_missing
```bash
# create on HTTP
ID=$(curl -sS -X POST https://studio-mock-iota.vercel.app/api/asset-jobs \
  -H "Authorization: Bearer $ABBIES_WORLD_TOKEN" -H "Content-Type: application/json" \
  -d '{"semanticId":"poi.assetMaker.crossRoute.exterior","brief":"x","kind":"poi.exterior"}' | jq -r .id)
# status on MCP → job_missing
curl -sS -X POST https://studio-mock-iota.vercel.app/api/mcp \
  -H "Authorization: Bearer $ABBIES_WORLD_TOKEN" -H "Content-Type: application/json" -H "Accept: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"asset_job_status\",\"arguments\":{\"jobId\":\"$ID\"}}}"
```

### Happy path (same route → registered)
```bash
# MCP create + complete with fetchable PNG → status registered
# (see session shell evidence: job_mujveqf9_eez9fr)
```

## Registered probe assets (do not bind to Home)

- `poi.assetMaker.e2eProbe3.exterior` → `pois/asset-maker/e2e-probe3/exterior` (rev ≥3)
- `poi.assetMaker.mcpE2E.exterior` → `pois/asset-maker/mcp-e2-e/exterior` (rev 1)

## Fix list (prioritized)

| Pri | Fix |
| --- | --- |
| P0 | Refresh Auth0 MCP token; confirm `world_describe` before bind demos |
| P0 | Durable job store shared by MCP + HTTP (or route HTTP through same module/instance sticky — durable is the contract) |
| P0 | Fix Cursor MCP discovery / reconnect so `asset_job_*` appear to agents |
| P1 | Patch `smoke_asset_mcp.sh`: send Bearer on `tools/list`; expect `registered` (or `failed` with intentional bad URL) |
| P1 | Document allowed staging hosts; optionally add User-Agent for picky CDNs |
| P1 | Ensure registry delivery / iPad resolve path does not require public `deliveryURL` |
| P2 | Wire remote MJ worker → `asset_job_complete` (TED talk) |
| P2 | Library carve beyond `suggestSemanticIds` heuristics |

## Library room (same session)

Shipped minimal Studio Library front door:

- **URL:** https://studio-mock-iota.vercel.app/library.html
- **API:** `GET/POST /api/asset-library` (list registry, thumbs, draft portfolios)
- Nav: Studio top bar **Library** · Asset jobs ↔ Library links
- Verified: list returns live `abbies-world-2` rows (maps/home, lego, e2e probes…); portfolio create returns peg monastery suggestions; thumbs proxied with Bearer

Honest limits unchanged: portfolios still in-memory; dad-review / DAG carve / sellable catalog not in this room yet.

## Handoff

> Asset maker: E2E pass through **registered** (same-route MCP or HTTP + fetchable staging). Fail at **bind** (expired Auth0) and **cross-route job_missing** (split in-memory store). **Library room live:** https://studio-mock-iota.vercel.app/library.html — browse shelf + draft portfolios. P0: refresh token + durable jobs + Cursor MCP asset tool discovery. Next autonomy wedge: MJ worker → `asset_job_complete` (TED talk). Jobs: `job_mujveqf9_eez9fr`, semantic `poi.assetMaker.mcpE2E.exterior`.
