# Abbie's World: current architecture (2026-10-22)

Tags: **[verified]** checked against code, the Vercel API, GitHub or a live request on 2026-10-22; **[inferred]**
from code or docs; **[planned]** not built; **[unknown]** needs the owner to confirm. The full list of resources is
in [INVENTORY.md](INVENTORY.md).

## 1. The big picture

```
                         ┌──────────────────────────── GitHub: evanrobinson2/abbiesworld_ios (public) ───────────────────────────┐
                         │  main: docs, iOS app, studio-mock, workflows, Ranch Atelier site (prototypes/ranch-atelier/dist)       │
                         │  Actions: dispatch-relay, dispatch-e2e, model-store, feedback-inbox                                    │
                         └───────▲───────────────────────────────┬───────────────────────────────────────────▲───────────────────┘
                                 │ issues/commits/PRs            │ Vercel builds (Git or API deploy)          │ commits/PRs
                                 │                               ▼                                           │
 Evan ─ ChatGPT (+Voice) ─OAuth─▶ studio-mock (Vercel) ── MCP /mcp ── fires ──▶ Claude scheduled task ──▶ Claude cloud sessions
                                 │  dispatch records: Vercel Blob "abbies-dispatch"                         │ (repo work, Blender, etc.)
                                 │  missions/tickets/MJ queue/push subs: household world doc ──┐            │
                                 ▼                                                              ▼            │
                     Abbie's World game server (EC2, http://abbies.world:8000, Auth0 audience https://api.abbies.world)
                                 ▲                                                                           │
 Evan's iPhone/iPad ─ iOS app ───┘                                                                           │
 Evan's iPhone ─ Ranch Atelier home-screen web app (abbies-ranch-atelier on Vercel) ◀── /r2/* ── Cloudflare R2 (models)
                                                              │  /api/activity → studio-mock /api/dispatch-feed
 Evan's Mac ─ Midjourney in Chrome (Claude in Chrome over Remote Control), MJ workers poll studio-mock's queue
```

## 2. Components

### 2.1 iOS app (`abbies.world.ios/`, main)
- SwiftUI app. Base URL `http://abbies.world:8000` (`Services/ServerConfig.swift`) **[verified]**.
- Auth0 native app with PKCE, audience `https://api.abbies.world` (`docs/current-state/AUTH0_HOUSEHOLD.md`) **[verified from docs]**.
- Game assets come through the Game Asset API v1 (`docs/current-state/GAME_ASSET_REGISTRY_ADOPTION.md`) **[inferred]**.

### 2.2 Game server (`abbies.world:8000`, EC2)
- Holds the household **world document**, which studio-mock uses as durable storage for missions
  (`creative.missionOs`), trouble tickets (`creative.troubleQueue`), the Midjourney execution queue
  (`creative.executionCapacity`) and push subscriptions **[verified from studio-mock code]**.
- The Auth0 config lives in SSM Parameter Store under `/abbiesworld/` **[verified from docs]**.
- **[unknown]** Where its source lives. It is not in this repo. HTTP only on :8000; plain `abbies.world` stays on it.

### 2.3 studio-mock: the Abbie's World MCP (`prototypes/studio-mock/`, main)
- Vercel project `studio-mock`, production at `https://studio-mock-iota.vercel.app`. It is the MCP that ChatGPT connects to
  (`/mcp`, Streamable HTTP, protocol 2025-03-26, version 0.7.0) **[verified live]**.
- Auth: OAuth through Auth0 tenant `dev-33h7qd4ytudlk0ls.us.auth0.com`, audience `https://studio-mock-iota.vercel.app/mcp` **[verified live]**.
- Tool groups: world/scene/place editing, assets (OpenAI images, registry ingest), Midjourney queue, missions,
  trouble tickets, and the dispatch bridge (build/status/revise/inbox/briefing/ask) **[verified live]**.
- Other endpoints: `/api/dispatch-relay` (GitHub OIDC only), `/api/dispatch-feed` (Auth0 or feed key), push, review inbox **[verified from code]**.
- Deploys: it was CLI-deployed until 2026-10-22. It is now deployed from GitHub main with root `prototypes/studio-mock`
  (deployment `dpl_9gV63FQutFdiswxc3wj9BoUhP6VJ`, commit 3cbf14cc) **[verified]**.
- Known issue: `tokenFrom()` in `api/mcp.js` falls back to the `ABBIES_WORLD_TOKEN` env var, so the older tools act
  without a caller token. The dispatch tools don't fall back **[verified from code, not fixed]**.

### 2.4 Ranch Atelier (`prototypes/ranch-atelier/` on `main`)
- Vercel project `abbies-ranch-atelier`, at `https://abbies-ranch-atelier.vercel.app` (`/sandbox`). A three.js browser game,
  installed as a home-screen app on Evan's iPhone **[verified]**.
- Functions in `dist/api/` **[verified from code]**:
  - `models`: reads the model catalogue from R2.
  - `activity`: proxies the studio-mock dispatch feed using `DISPATCH_FEED_KEY`.
  - `feedback`, `app-actions`, `claude-board`, `claude-mcp`, `model-calibrations`, `view-context`: these store data in the project's own Vercel Blob store.
  - `holodeck`: a WebSocket relay.
  - `ai-compose`: calls the Vercel AI Gateway.
- `dist/vercel.json` rewrites `/r2/*` to the R2 public bucket URL, so GLBs load same-origin **[verified]**.
- Production deploys from a commit on `main` (Vercel `create_deployment` with a `gitSource` of `main`; the project is not Git-linked), root `prototypes/ranch-atelier/dist`. Ranch work merges into `main`; the old `claude/live-snapshot-2026-10-22` branch is an archive (merged 2026-10-23).

### 2.5 Model store (Cloudflare R2 + Postgres)
- **R2 exists [verified]**. The Vercel project `story-forge` has `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_BUCKET` and `R2_PUBLIC_BASE_URL` for production, preview and development. The public bucket URL
  `https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev` answers requests. The bucket name is stored as a sensitive value and can't be read back **[unknown name]**.
- Writer: `tools/model-store/sync.mjs`, run by `.github/workflows/model-store.yml`. It uploads GLBs, reference images and
  provenance to `models/blobs/<sha256>/<file>` and writes `models/catalog.json`, `catalog-all.json` and `paths.json` **[inferred from code]**.
- Catalogue table: `model_assets` in story-forge's Supabase Postgres (`POSTGRES_URL`), schema in `tools/model-store/schema.sql` **[inferred]**.
- **State today [verified]**: all 5 model-store runs failed, because the R2 and Postgres secrets are not yet set on the GitHub repo.
  `GET abbies-ranch-atelier.vercel.app/api/models?paths=1` returns 503 "R2 answered 404" (the catalogue was never written).
  The game falls back to the models bundled with the site.

### 2.6 StoryBoard (`story-forge` Vercel project)
- The owner of the shared R2 keys, Supabase Postgres, Upstash KV/Redis, a Vercel Blob store and Auth0 config **[verified env names]**.
- **[unknown]** Its source repo. It is not this repo.

### 2.7 Dispatch bridge (ChatGPT → Claude)
- See [DISPATCH_LIFECYCLE.md](DISPATCH_LIFECYCLE.md) and `docs/dispatch/`.
- Records: a **private Vercel Blob store `abbies-dispatch`** (`store_eq5nkks60S1HhDgw`) on studio-mock **[verified]**.
  This was added on 2026-10-22 without checking R2 first. It holds small JSON state records that use etag
  compare-and-swap, not assets. See §5 for the recommendation.
- Return channel: GitHub issues labelled `dispatch`, relayed by `dispatch-relay.yml` with GitHub OIDC **[verified from code]**.
- **Not operational yet [verified]**: the Claude scheduled task and its token (`CLAUDE_DISPATCH_ROUTINE_ID`/`_TOKEN`) are not set,
  so `build()` stores the request but cannot start Claude.

### 2.8 Midjourney
- Driven in Evan's Chrome on his Mac, by Claude in Chrome over Remote Control (`tools/midjourney/`) **[verified from docs]**.
- A cloud queue on the world doc (`execution_capacity_status`, `mj_workers_alive`, `midjourney_fill`). Mac workers poll it, with no inbound tunnel **[inferred from code]**.

### 2.9 Feedback loop (phone → repo)
- The Ranch app's feedback button saves to Ranch's Blob store. `feedback-inbox.yml` (every 5 minutes) copies new items into branch
  `feedback-inbox` and comments on the "Feedback inbox" PR **[verified from code]**.

## 3. Deployment topology and environments

| Thing | Where | How it deploys | Envs |
| --- | --- | --- | --- |
| studio-mock (MCP) | Vercel team `team_oyQ4CUAshGOCQbr5KHu1jYec`, iad1 | GitHub main, root `prototypes/studio-mock` (API-triggered) | production only in practice |
| abbies-ranch-atelier | same team | `main` `prototypes/ranch-atelier/dist` (production branch) | production, preview |
| Game server | AWS EC2 (`abbies.world`) | **[unknown]** | production |
| iOS app | Xcode, Evan's devices | manual | n/a |
| GitHub Actions | github.com | on push, schedule, issue events | n/a |
| story-forge | Vercel, same team | **[unknown]** repo | prod, preview, dev |

The team has 43 Vercel projects. Most are one-off prototypes; see [INVENTORY.md](INVENTORY.md).

## 4. Data flows

1. **Assets.** Blender/Midjourney → repo (`provenance.json`, `build.py`, GLB) → `model-store` Action → R2 (+ Postgres) →
   `/r2/*` on Ranch → three.js. *Blocked today on the GitHub secrets.*
2. **Dispatch.** ChatGPT → studio-mock `build` → Blob record → fires the Claude task → Claude posts markers on a GitHub issue →
   `dispatch-relay` → studio-mock → `status`/`inbox` in ChatGPT, the feed in the Ranch app, and Web Push.
3. **World edits.** ChatGPT → studio-mock world/scene tools → game server world doc → iOS app.
4. **Feedback.** Ranch app → Ranch Blob → `feedback-inbox` Action → repo branch and PR → Claude thread.

## 5. Gaps and recommendations

- **R2 not populated.** The bucket exists, but the repo secrets `R2_*` and `POSTGRES_URL` are missing, so nothing has synced.
  This needs Evan: add the secrets at github.com/evanrobinson2/abbiesworld_ios/settings/secrets/actions.
- **Dispatch attachments belong in R2.** Concept art, GLBs and reference photos produced by or sent to a dispatch should go to R2
  (same `models/blobs/<sha256>/` layout), not to Blob or git. Today a dispatch passes https URLs only.
- **Dispatch records in Vercel Blob.** These are small, mutable JSON records with optimistic locking. R2 supports the same via
  S3 conditional writes (If-Match). Moving them would put all durable storage on R2, but it needs R2 keys on studio-mock.
  It's Evan's call. Until then this is a documented exception, not a second asset store.
- **Several Blob stores already exist** (Ranch, story-forge, studio-mock). None of them holds 3D assets.
- **[unknown]** The game server's source repo and deploy method, story-forge's repo, and the R2 bucket name.
