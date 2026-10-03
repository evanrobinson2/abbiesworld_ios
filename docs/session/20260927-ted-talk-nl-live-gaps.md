# TED talk — NL → live world creation (2026-09-27)

**Callsign:** TED talk · Thrust 2  
**Evidence time:** ~2026-09-27T14:45–14:48Z  
**Auth path:** HTTP JSON-RPC to `https://studio-mock-iota.vercel.app/api/mcp` with refreshed `ABBIES_WORLD_TOKEN` (Cursor `user-abbies-world` discovery still broken / OAuth dialog stuck).

## Demo wedge (done)

**NL intent:** On Fern Gully only, add “TED Talk Lantern” (`rooms`) + generate/bind exterior art.  
**Do not touch Home** — Abbie's demo owns Home reset.

| Step | Result |
| --- | --- |
| Token refresh | OK (`exp` ~2026-09-28T14:45:30Z) |
| `world_describe` | rev 151 → **153**; `activeSceneID=scene.home` unchanged |
| `author_beat` dryRun | OK — closed ops: `asset.job_create` → `asset.bind` → `place.upsert` |
| `author_beat` confirm | **Partial** — job created `job_mujxn0qw_7x5hdx` (`awaiting_image`), then failed at `asset.bind` (`place_missing` — planner omitted `placeId`/`slot` and ordered bind before place) |
| Manual `place_upsert` | OK — `poi.tedTalk.lantern` on `scene.studio12` @ 0.5/0.55 |
| `asset_job_complete` | OK → `registered` (stand-in staging `picsum.photos` — see MJ gap) |
| `asset_bind` | OK — exterior → `poi.tedTalk.lantern.exterior` |
| Home | Untouched (5 places, `map.home`) |
| `world_lint` | Pre-existing `cdn_plate_forbidden` on Fern Gully / studio scenes / Plink Pavilion; no new orphan for lantern |

**iPad check:** Accept world rev ≥153 → Fern Gully → **TED Talk Lantern** (semantic `poi.tedTalk.lantern.exterior`; art is picsum stand-in until MJ).

## Gap fill (same session, later)

**Product path is ChatGPT MCP → world**, not Cursor MCP. Cursor discovery noise is out of scope.

| Fix | Evidence |
| --- | --- |
| OpenAI `gpt-image-2` auto-generate on `asset_job_create` (default when `OPENAI_API_KEY` set) | Studio MCP `0.4.0` prod deploy |
| `asset_job_generate` + HTTP `POST /api/asset-jobs` `{generate,id}` | tools/list + store |
| Prompt writer targets gpt-image (no MJ flags); `imagePrompt` primary, `midjourneyPrompt` alias | create response |
| `author_beat` bind-before-place hard fail | reorder + skip bind without `placeId` |
| E2E ChatGPT MCP HTTP | `job_muk0b59v_qbb496` → `registered` (`provider=openai`, `imageModel=gpt-image-2`) → Fern Gully POI `poi.tedTalk.gptImageLantern` · world rev **159** · Home not authored by TED |

Note: OpenAI’s current Images model id is **`gpt-image-2`** (there is no `gpt-image-2.5` API id).

## Gap list (remaining)

### P0 — still open

1. ~~No remote Midjourney worker~~ → **bypassed** with gpt-image-2 default. MJ paste still optional (`generate:false`).
2. ~~Cursor MCP~~ → **not required** for the ChatGPT MCP proof.
3. ~~`author_beat` bind order~~ → **fixed** in 0.4.0 (needs ChatGPT confirm re-smoke).

### P1 — product / multi-world

4. **Multi-world create:** MCP `world_create` description claims new docs + focus; mission stretch still needs honest device proof. Prefer new world id over `confirmReplace` on Home. Not exercised this wedge (Home protected).
5. **Confirm + asset awaiting_image:** confirm cannot finish art in one shot; needs worker or second turn with `stagingUrl`. NL skill should pause at `awaiting_image` with prompt + jobId, not claim “live art” until `registered`+`bound`.
6. **Fern Gully / studio plates still CDN `https://cdn.midjourney.com/...`.** Lint `cdn_plate_forbidden`. NL path that lands POIs on CDN scenes is playable on iPad today but violates steel-rail SoT; migrate plates via asset jobs.
7. **Registry `deliveryURL`** is LAN `http://abbies.world:8000/...` — fine if iPad resolves via household Game Asset API by semantic id; bad if anything treats deliveryURL as public CDN.

### P2 — autonomy polish

8. Wire `:8766` helper (or a real remote worker) → auto `asset_job_complete` after Imagine finishes.
9. Agent skill: NL utterance → `author_beat` dryRun → human/agent confirm → poll job → complete → bind → `world_lint` (with Home-safe scene allowlist).
10. Smoke: `tools/list` requires Authorization (Asset maker already flagged).

## Smallest next API/MCP wedges

1. Fix `author_beat` executor: reorder to `place.upsert` before `asset.bind`; require `sceneId`+`placeId`+`slot` on bind; continue plan after job_create even if bind waits on image.
2. Add MCP tool or job field `awaitingHuman: midjourney` with stable `midjourneyPrompt` handoff; optional webhook from worker.
3. Durable job store (Asset maker P0) so HTTP `/api/asset-jobs` and `/api/mcp` share memory — TED talk must stay same-route until then.
4. Prove `world_create` (no `confirmReplace`) → focus switch → NL author into empty world → iPad World Switcher (coordinate with Abbie's demo).

## Coordination

- **Asset maker** owns service truth (create→registered). Share job ids; don’t double-fix store/auth.
- **Abbie's demo** owns Home. TED talk sandbox = `scene.studio12` / future non-Home scenes only until “world stable” ping.
