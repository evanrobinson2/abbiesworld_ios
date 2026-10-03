# Execution capacity (Napster for execution)

**Status:** local Mac or Windows worker + **cloud pull queue** (no tunnel).

## Model

```text
ChatGPT / Studio MCP  --enqueue-->  household world (creative.executionCapacity)
                                              ^
    Mac or Windows worker  --claim/complete--┘   (outbound HTTPS only)
         |
         v
   Chrome Midjourney (Apple Events on Mac · CDP on Windows)
```

- Credentials and browser sessions stay on the worker machine.
- ChatGPT / Studio are **requesters**, not the runtime.
- **No `MJ_WORKER_URL` tunnel.** The worker reaches out.
- Both machines can pull the same queue. Worker ids are `mac.<hostname>` / `win.<hostname>`.
- **Lockstep:** a Mac worker change is incomplete until the Windows worker (`browser_cdp.py`, `execution_capacity.ps1`, `tray_app_win.py`) matches. Shared JS lives in `prototypes/execution-capacity/js/`.

## Always-on

```bash
# Mac
/Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh install-login

# Windows (PowerShell)
.\scripts\execution_capacity.ps1 install-login

# Windows installer (no git checkout)
.\scripts\build_execution_capacity_windows_installer.ps1
# or on Mac:
./scripts/build_execution_capacity_windows_installer.sh
# → artifacts/execution-capacity-windows/latest/AbbiesWorldExecutionCapacity.zip
# On the PC: extract → Run with PowerShell: Install.ps1
# Optional Setup.exe: compile `prototypes/execution-capacity/windows/AbbiesWorldExecutionCapacity.iss` with Inno Setup.
```

| Tray | Meaning |
| --- | --- |
| Sailboat + **green** | Available (local + cloud pull) |
| Sailboat + **blue** | Job in progress |
| Sailboat + **red** | Can’t connect / paused / worker dead |

## Cloud API (Studio)

```http
POST /api/execution-capacity
Authorization: Bearer <household-token>
{"op":"enqueue","capability":"midjourney.imagine","payload":{"prompt":"…"}}

POST /api/execution-capacity
{"op":"claim","workerId":"mac.hostname","capabilities":["midjourney.imagine"]}

POST /api/execution-capacity
{"op":"complete","jobId":"…","workerId":"…","result":{"candidateUrls":["https://…"]}}

GET  /api/execution-capacity?jobId=…
GET  /api/execution-capacity   → summary + recent jobs
```

MCP tool `midjourney_fill` = enqueue (pull model).

## Local API (:8780)

```http
POST /v1/jobs   {"payload":{"prompt":"…"}}   # local-only queue
GET  /v1/status
POST /v1/stop | /v1/resume
```

Env:

| Var | Default |
| --- | --- |
| `EXECUTION_CAPACITY_CLOUD_PULL` | `1` (set `0` to disable outbound claim) |
| `EXECUTION_CAPACITY_CLOUD_URL` | `https://studio-mock-iota.vercel.app` |
| `EXECUTION_CAPACITY_HUMANIZE` | `1` |
| `EXECUTION_CAPACITY_BROWSER` | Mac: Apple Events. Windows: `cdp`. Set `cdp` on Mac to force DevTools. |
| `EXECUTION_CAPACITY_CDP_PORT` | `9222` (Windows dedicated Chrome). Do not pick another port if busy. |
| `EXECUTION_CAPACITY_CHROME_PROFILE` | Windows default `%LOCALAPPDATA%\AbbiesWorld\execution-capacity-chrome` |

## ChatGPT habit

1. `midjourney_fill` with prompt (or Studio enqueue)
2. Mac or Windows worker claims + runs when Create is attached
3. Poll `GET /api/execution-capacity?jobId=…` until `completed`
4. `mission_attach_proof` / `asset_job_complete` with `candidateUrls`

Local Mac shortcut: `/Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh submit "…"`

Windows shortcut: `.\scripts\execution_capacity.ps1 submit "…"`

## Chrome

**Mac:** `midjourney.com/imagine` + View → Developer → Allow JavaScript from Apple Events.
The worker may open a background Create window for a job. When the job finishes (success or fail) it **closes only windows it opened** — your daily Chrome tabs stay. Do not Dock-minimize a Create window while a job is in flight (AppleScript can’t see it).

**Windows:** a dedicated Chrome/Edge profile on CDP port **9222** (daily Chrome can stay running). First run: sign into Midjourney in that worker window. Extra Create tabs the worker opened via CDP are closed after the job; the dedicated profile Chrome is not quit. Create-only (`/imagine`) — Personalize is ignored.
