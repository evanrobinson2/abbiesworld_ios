# ChatGPT → Claude dispatch bridge

Lets Evan direct Abbie's World development from ChatGPT (including Voice) without his laptop.
ChatGPT submits work; Claude does it in a cloud session, commits to GitHub and reports back;
ChatGPT collects the verified result.

```
Evan → ChatGPT ──build()──▶ Abbie's World MCP (studio-mock-iota.vercel.app/mcp)
                               │  1. stores the dispatch (private Vercel Blob "abbies-dispatch")
                               │  2. fires the "Abbie's World dispatch" Claude scheduled task (API trigger)
                               ▼
                         Claude cloud session ── acks, progress, questions, completion ──▶ GitHub issue [D-…]
                                                    commits / PR / merge / deploy ──────▶ GitHub
                                                                                            │
                         dispatch-relay workflow (issue events + every 10 min) ◀────────────┘
                               │  forwards marked messages, verifies reported commits/PRs on GitHub,
                               ▼  runs the watchdog (retry / resume / give up)
                         Abbie's World MCP ──status()/inbox()──▶ ChatGPT → Evan
```

There is no second MCP server and no new service: the four tools live in the existing Abbie's World
MCP (`prototypes/studio-mock/api/mcp.js`), storage is a Blob store on the same Vercel project, and
GitHub is the return channel because Claude's cloud sessions cannot reach `*.vercel.app`.

## Tools (on the existing MCP)

| Tool | What it does |
| --- | --- |
| `build(request, context?, idempotency_key?, mode?, references?)` | `mode` defaults to `auto` (Claude picks quick, standard or bespoke); `references` are photo URLs for bespoke replicas. Stores the request, fires Claude, returns `dispatch_id` at once. Same request within 15 min (or same key, ever) returns the existing dispatch. |
| `status(dispatch_id?)` | One dispatch, or all active ones: status, verified, delivery, last progress, last activity, branch, commits, PRs, links, errors, the question waiting for Evan. |
| `revise(dispatch_id, instructions)` | Change order or answer. Idle dispatch: fires a new Claude run on the same branch/issue. Running: queued and sent when that run reports in. History is kept. |
| `inbox(since?, unread_only?, acknowledge?, dispatch_id?)` | Claude's new messages; marks them read by default so ChatGPT doesn't repeat news. |
| `briefing(refresh?)` | Project-wide status: one item per workstream (W1, W2, …) with done / in progress / waiting on Evan, plus live builds and open questions. Instant from the last briefing; refreshes in the background when over an hour old. |
| `ask(question, about?, thread_id?)` | Threaded question about any dispatch (done or running), a briefing item, or anything. Answered by a separate read-only session; `thread_id` continues the thread. |

## Factory feed for the phone app

`GET /api/dispatch-feed?since=ISO` (Bearer: household or MCP Auth0 token) gives the phone app
everything it needs to show the factory at work without Claude or ChatGPT on the phone:

- `parcels`: each dispatch as a work parcel: `mode` (auto/quick/standard/bespoke), current `stage`
  and stages passed, partial `progress` (`done/total`, `fraction`), the latest concept art and models
  (`artifacts`: images and GLB URLs), what it needs from Evan, and its `machine` (the Claude session:
  working / quiet / waiting_for_evan / idle).
- `machines`: Claude sessions working on parcels plus the Midjourney workers (the Mac).
- `events`: every message as it arrives (ack, progress, checkpoints with images/models, questions,
  completion), with `next_since` as the cursor.

`POST /api/dispatch-feed {dispatch_id, instructions}` steers a parcel from the app (same as `revise`).
A running session gets it on its issue at the next relay sweep and folds it in before its next stage.
Checkpoints with images or models, questions, completions and failures also send a Web Push to the
app's existing subscribers (`api/lib/dispatch-notify.js`). How the app presents all this is owned by
the iPhone app work; this endpoint is the contract.

## Lifecycle and what each state proves

| ChatGPT sees | Proof |
| --- | --- |
| `status: submitted`, `delivery.state: pending` | Stored durably. Claude not started yet (fire failed; watchdog retries 0s, 1m, 5m, 15m, 30m). |
| `status: submitted`, `delivery.state: fired` | Claude's scheduled-task API created a session (`claude_session_url`). Not proof Claude read it. |
| `status: acknowledged` | Claude itself posted an ack on the GitHub issue. Receipt is proven. |
| `status: running` | Claude reported progress. |
| `status: blocked` | Claude asked a question (`needs_input`); answer with `revise()`. |
| `status: completed`, `verified: false` | Claude says done, but the reported commits/PRs weren't confirmed. |
| `status: completed`, `verified: true` | The relay found every reported commit and PR on GitHub. |
| `status: failed` | Claude reported failure, or Claude never acknowledged / went quiet after retries. |

Duplicates are prevented three ways: idempotent `build()`, a conditional write that claims each watchdog
re-fire, and Claude's own duplicate check on the issue before it starts (`CLAUDE_PROTOCOL.md`).
An interrupted run (acknowledged or running, then silent for 90 min) is re-fired once with
`reason: resume`; a second stall marks it failed.

## Security

- Dispatch tools verify the bearer token's signature: Auth0 access tokens for this MCP (ChatGPT's
  OAuth connection) or a GitHub Actions OIDC token from `dispatch-e2e.yml` on main. Optional
  `DISPATCH_ALLOWED_SUBS` (comma-separated Auth0 `sub`s) pins it to Evan's login; each dispatch
  records its requester's `sub`.
- The relay endpoint accepts only GitHub OIDC tokens from this repo's `dispatch-relay.yml` /
  `dispatch-e2e.yml` on `refs/heads/main`, and only messages by the repo owner/collaborators or `claude[bot]`.
- The routine token lives only in the Vercel env var `CLAUDE_DISPATCH_ROUTINE_TOKEN` (sensitive).
  It can only start that one scheduled task. Dispatch records live in a private Blob store.

## Configuration (Vercel project `studio-mock`)

| Variable | Set by |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Blob store `abbies-dispatch` (connected). |
| `CLAUDE_DISPATCH_ROUTINE_ID` | The scheduled task's `trig_…` id. |
| `CLAUDE_DISPATCH_ROUTINE_TOKEN` | Generated once at claude.ai/code/routines (API trigger). |
| `DISPATCH_ALLOWED_SUBS` | Optional. |

The scheduled task's saved prompt is in `ROUTINE_PROMPT.md`; Claude's working rules are in
`CLAUDE_PROTOCOL.md` (read from the repo on every run, so they change by PR).

## Testing

- Unit: `node prototypes/studio-mock/api/lib/dispatch.test.js` (lifecycle, idempotency, relay replay,
  revisions while running, fire failure backoff, unacknowledged and interrupted runs, auth).
- Live acceptance: Actions → `dispatch-e2e` → Run workflow. It plays ChatGPT against the live MCP and
  passes only when Claude completes and the relay verified the commits.
