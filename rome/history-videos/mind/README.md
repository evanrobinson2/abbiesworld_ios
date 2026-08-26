# Mind meld

Hivemind memory for every connected agent. **Start at [`../AGENTS.md`](../AGENTS.md).**

One identity. Git stores the memory.

| File | Role |
| --- | --- |
| `IDENTITY.md` | Who we are |
| `STATE.md` | What is true right now |
| `transcript.ndjson` | Append-only hook log (union-merged) |
| `sessions/` | Full Cursor transcripts when a hook can snapshot them |

## Sync

- **Milliseconds:** hooks append one JSON line to `transcript.ndjson` and return.
  That write is local and should stay well under 50 ms.
- **Seconds:** `mind-sync.sh` commits and pushes `mind/` in the background.
  The other body sees it on the next `git pull` (session start, or whenever
  they pull `main`).
- Git over the network is not a millisecond bus. The wild part is the local
  append; the push is honest about being a background hop.

Cloud agents do not get every IDE hook (`sessionStart`, `afterAgentResponse`).
They still have `IDENTITY.md` + `STATE.md` via the always-on rule, and
`afterFileEdit` will push if we touch `mind/`.
