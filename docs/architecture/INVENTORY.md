# Infrastructure inventory (2026-10-22)

Tags as in [README.md](README.md). This page lists where secrets live, never their values.

## Providers

| Provider | Used for | Status |
| --- | --- | --- |
| GitHub `evanrobinson2/abbiesworld_ios` (public) | All code; Actions; dispatch return channel (issues) | [verified] |
| Vercel team `team_oyQ4CUAshGOCQbr5KHu1jYec` (user evanr2-2946) | studio-mock, abbies-ranch-atelier, story-forge, ~40 prototypes | [verified] |
| Cloudflare R2 | Model and asset storage; public URL `pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev` | [verified] exists; not yet populated |
| Supabase Postgres (via story-forge integration `store_v2sIG1qQk4iRK9Hu`) | `model_assets` catalogue | [verified] env present; table [inferred] |
| Upstash KV/Redis (story-forge, `store_L80PKMZaqeinNCIo`) | StoryBoard | [verified] env present; use [unknown] |
| Vercel Blob | Ranch app data (`store_yIaLCGshOyX7IToH`), dispatch records (`abbies-dispatch`, `store_eq5nkks60S1HhDgw`), story-forge (`store_HxHi8WuQCBH0XuQB`) | [verified] |
| Auth0 tenant `dev-33h7qd4ytudlk0ls.us.auth0.com` | iOS app (audience `https://api.abbies.world`), MCP OAuth (audience `…/mcp`), StoryBoard | [verified] |
| AWS EC2 + SSM (`/abbiesworld/`) | Game server `abbies.world:8000` | [verified from docs] |
| OpenAI API | studio-mock image generation, vision sanity checks | [verified env] |
| Anthropic Claude Code (cloud sessions, scheduled tasks) | Dispatch workers, all Claude threads | [verified]; dispatch task not yet created |
| Midjourney (Evan's account, in Chrome on his Mac) | Concept art | [verified from docs] |
| Vercel AI Gateway | Ranch `ai-compose` | [inferred] |

## Vercel projects that matter

| Project | URL | Source | Notes |
| --- | --- | --- | --- |
| `studio-mock` (`prj_pzwVcsM9ail2RkYhQpnRj6Uexqkp`) | studio-mock-iota.vercel.app | main `prototypes/studio-mock` | ChatGPT MCP, dispatch bridge |
| `abbies-ranch-atelier` (`prj_BVnIsSnrYu2TkFgLpWiJrLW6NfzI`) | abbies-ranch-atelier.vercel.app (ranch.abbies.world pending DNS) | `main` `prototypes/ranch-atelier/dist` (not Git-linked; deployed from a main sha) | The game Evan plays |
| `story-forge` (`prj_sAE2FKZKaCl1u41RgV5y2Ly6lvuA`) | **[unknown]** | **[unknown]** repo | Owns the R2 keys, Postgres, KV |
| `abbies-holodeck-preview`, `ranch-atelier-cloud-preview` | *.vercel.app | snapshots | Previews |
| `asset-viewer` | | main `prototypes/asset-viewer` | |
| `abbies-champions` | abbies-champions.vercel.app | main `prototypes/champions` | 9 Kings tribute game (static three.js, `/r2` rewrite to the model store) |
| 35+ others | | | One-off prototypes and games (peggle, sprout-lab, marble-voyage-art, …) |

**Git builds switched off (2026-10-23).** Every push to this repo used to build about 15 Git-linked prototype
projects, which pushed the team over Vercel's 450 deploys/hour cap and blocked Ranch fixes. These 15 now have the
ignored build step set to `exit 0` (always skip) and branch previews disabled; none was deleted and none serves a
live domain: asset-viewer, media-drop, peggle, abbie-assets-lab, marble-voyage-art, finger-lemmings, sprout-lab,
lab-page, abbies-world-plink, abbies-creature-workshop, creature-creator, starship-rooms, workspace,
voyage-opening-review, experiment-01-animation. To revive one, clear its Ignored Build Step and re-enable preview
deployments in its Vercel settings. A new Git-linked project adds a build per push, so link only what will ship.

## Secrets: where they live

| Name | Location | Purpose |
| --- | --- | --- |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` | Vercel story-forge (sensitive); **missing** from GitHub repo secrets | R2 access |
| `POSTGRES_URL` (+ Supabase vars) | Vercel story-forge (integration); **missing** from GitHub repo secrets | model_assets |
| `BLOB_READ_WRITE_TOKEN` | Vercel studio-mock, abbies-ranch-atelier, story-forge (each its own store) | Blob |
| `CLAUDE_DISPATCH_ROUTINE_ID`, `CLAUDE_DISPATCH_ROUTINE_TOKEN` | Vercel studio-mock, **not yet set** | Fire the Claude task |
| `DISPATCH_FEED_KEY` | Vercel studio-mock and abbies-ranch-atelier (sensitive) | Ranch → dispatch feed |
| `DISPATCH_ALLOWED_SUBS` | Vercel studio-mock, optional, not set | Pin dispatch to Evan's login |
| `ABBIES_WORLD_TOKEN`, `ABBIES_WORLD_API_KEY` | Vercel studio-mock | Game server calls |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Vercel studio-mock (and story-forge) | Web Push |
| `OPENAI_API_KEY` | Vercel studio-mock | Images and vision |
| `ASSET_REGISTRY_ADMIN_API_KEY` | Vercel studio-mock | Game Asset API ingest |
| `AUTH0_CLIENT_ID` | Vercel studio-mock | MCP OAuth metadata |
| `CLAUDE_SANDBOX_TOKEN`, `RANCH_VIEW_READ_KEY`, `RANCH_VIEW_WRITE_KEY`, `STORY_*` | Vercel abbies-ranch-atelier | Ranch app APIs |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | AWS SSM `/abbiesworld/` | Game server |
| Dispatch relay and e2e | none: GitHub OIDC tokens | |

## MCP tools (studio-mock 0.7.0, verified live)

- **Dispatch:** `build`, `status`, `revise`, `inbox`, `briefing`, `ask`
- **World:** `read_primer`, `poi_capabilities`, `world_get_current`, `world_describe`, `world_list`, `world_create`, `world_set_current`,
  `world_lint`, `scene_upsert`, `scene_delete`, `scene_connect`, `scene_set_background_url`, `place_upsert`, `place_remove`,
  `place_delete`, `prompt_inspire_scene`, `session_get`, `session_patch`, `vars_get`, `vars_apply`, `author_beat`
- **Assets:** `asset_ingest`, `asset_project_create`, `asset_library_describe`, `asset_project_status`, `asset_job_create`, `asset_job_list`,
  `asset_job_status`, `asset_job_generate`, `asset_job_complete`, `asset_bind`
- **Midjourney queue:** `execution_capacity_status`, `mj_workers_alive`, `midjourney_fill`
- **Missions:** `mission_create`, `mission_get`, `mission_list`, `mission_describe`, `mission_attach_proof`, `mission_approve_proof`,
  `mission_reject_proof`, `mission_feedback`, `mission_request_minigame`
- **Feedback and tickets:** `feedback_report`, `bug_report`, `trouble_ticket_create`, `trouble_ticket_get`, `trouble_ticket_list`,
  `trouble_ticket_comment`, `trouble_ticket_resolve`

Other MCP: the Ranch app's `/api/claude-mcp` (Claude sandbox board, token `CLAUDE_SANDBOX_TOKEN`) **[inferred]**.

## Background jobs

| Job | Schedule | Does |
| --- | --- | --- |
| `dispatch-relay.yml` | issue events, every 10 min | Relays Claude's markers, verifies commits and PRs, runs the watchdog, posts steering |
| `dispatch-e2e.yml` | manual | Live acceptance test of the dispatch loop |
| `model-store.yml` | model changes on main or live, manual | Syncs models to R2 and Postgres. **Failing: secrets missing** |
| `feedback-inbox.yml` | every 5 min | Copies app feedback into the `feedback-inbox` branch and PR |
| `surge-loadtest.yml` | manual | Launch-day load test of the live site: GETs only, no paid AI (docs/launch/SURGE.md) |
| Midjourney workers on Evan's Mac | poll | Claim jobs from the world-doc queue **[inferred]** |

## Operational dependencies

- Evan's Mac must be online for Midjourney; otherwise use another image source (CLAUDE.md).
- Cloud Claude sessions can't reach `*.vercel.app`. They talk to GitHub, and Actions talk to Vercel.
- The game server is a single EC2 host on plain HTTP :8000.
