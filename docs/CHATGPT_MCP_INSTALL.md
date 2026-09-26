# Install Abbie’s World MCP (ChatGPT + Cursor)

Remote MCP (Streamable HTTP). Same server for ChatGPT developer mode and Cursor agents.

## ChatGPT Plugins — real OAuth (Auth0)

1. ChatGPT → **Settings → Security and login** → **Developer mode** ON  
2. Open [Plugins](https://developers.openai.com/plugins) → **+**  
3. Fill:

| Field | Put this |
| --- | --- |
| Name | `AbbiesWorld` |
| Connection | **`https://studio-mock-iota.vercel.app/mcp`** |
| Authentication | **OAuth** |
| OAuth Client ID | `7AAx3t0fgolUT125oBNGICidhAW0rVY9` |
| OAuth Client Secret | Auth0 app **ChatGPT MCP Abbie's World** → Credentials (or ask Cursor to reveal) |
| Authorization server | `https://dev-33h7qd4ytudlk0ls.us.auth0.com` (auto-discovered via well-known) |
| Continue checkbox | check it |

4. Create → ChatGPT runs `oauth_config` against our MCP, then Auth0 login.  
5. After connect, tools use the OAuth Bearer automatically (audience = MCP URL). No paste-token needed for normal use.

### What must be live for create to succeed

ChatGPT’s probe fails with `does not implement OAuth` unless all of these return 200:

- `GET https://studio-mock-iota.vercel.app/.well-known/oauth-protected-resource`
- `GET https://studio-mock-iota.vercel.app/.well-known/oauth-protected-resource/mcp`
- Unauthenticated `POST /mcp` → **401** with `WWW-Authenticate: Bearer resource_metadata="…"`

Auth0 side (already provisioned):

- API identifier / audience: `https://studio-mock-iota.vercel.app/mcp`
- App: **ChatGPT MCP Abbie's World** (`7AAx3t0fgolUT125oBNGICidhAW0rVY9`)
- Callbacks include `https://chatgpt.com/connector_platform_oauth_redirect` and `https://chatgpt.com/connector/oauth/*` (ChatGPT’s per-connector callback IDs)

Cursor still uses `/api/mcp` via `.cursor/mcp.json` (same server) with `ABBIES_WORLD_TOKEN` or OAuth Bearer.

## Cursor (this repo)

Project config is already at [`.cursor/mcp.json`](../.cursor/mcp.json). Cursor Settings → **Tools & MCP** → enable **abbies-world**. Reload the window if tools do not appear.

Set a shell env token so Cursor can send it on every call:

```bash
export ABBIES_WORLD_TOKEN="$(pbpaste)"   # after Studio → Copy MCP token
```

`.cursor/mcp.json` interpolates `${env:ABBIES_WORLD_TOKEN}` into `Authorization`. You can also pass `accessToken` on each tool call.

Agents in this repo should prefer MCP (`world_describe`, `scene_upsert`, `asset_job_create`, …) over raw `/api/v1/worlds/current` or sqlite — see `.cursor/rules/world2-studio-mcp.mdc`.

---

## ChatGPT — dungeon master habit

After the plugin is connected with OAuth:

```
You are the dungeon master for Abbie's World. Call read_primer, then poi_capabilities.
The iPad shows one scene plate at a time. Place POIs at x/y between 0 and 1.
POIs are a picture plus an existing behavior or travel:<sceneId> — do not invent new screens or puzzles.
pegMonastery is an allowed behavior for the peg monastery POI.
Call world_describe before edits. Prefer author_beat (dryRun) then confirm for steel-rail edits.
For new plates use asset_job_create → Midjourney → asset_job_complete → asset_bind (semantic IDs).
Use vars_apply for counters; do not do the math yourself.
Never drop players. world_create must not replace the world unless I say confirmReplace.
```

Browse/submit jobs in Studio: [/assets.html](https://studio-mock-iota.vercel.app/assets.html).  
Steel-rail contract: [`current-state/STEEL_RAIL_AUTHORSHIP.md`](./current-state/STEEL_RAIL_AUTHORSHIP.md).

---

## Asset Gen (same MCP URL)

Same OAuth connector. Flow:

`asset_project_create` → `asset_job_create` → Midjourney → `asset_job_complete` → `asset_bind`

---

## Local / preview

```bash
# From prototypes/studio-mock
vercel dev   # or deploy a preview and point ChatGPT at https://<preview>/mcp
```

Auth0 callbacks stay production chatgpt.com URLs; preview MCP URLs need their own Auth0 API identifier if you want a separate audience.
