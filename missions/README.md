# Missions

Durable creative **intent** for Abbie’s World (Mission OS).

- **SoT (POC):** household world document → `creative.missionOs.missions`
- **Schema:** [`schema.json`](./schema.json)
- **Plan:** [`docs/architecture/MISSION_OS.md`](../docs/architecture/MISSION_OS.md)
- **iPad review:** open [`review.html`](./review.html) (full-bleed gesture deck)

## Gesture review (iPad)

Serve the repo root (or `missions/`) over HTTP, then open on iPad:

```bash
python3 -m http.server 8765
# → http://<lan-ip>:8765/missions/review.html
```

| Gesture | Action |
|---|---|
| ← / → | previous / next candidate |
| ↑ | **Put on Board** (approve) |
| ↓ | **Dump** |

Overlay chrome only — image is the composition. Decisions land in `localStorage` tonight; Mission MCP `mission_approve_proof` / `mission_reject_proof` take them when auth is live.

## MCP tools

| Tool | Purpose |
|---|---|
| `mission_create` | Narrative → Mission + inferred plan (no art spend) |
| `mission_get` / `mission_list` | Read Mission(s) |
| `mission_describe` | One-screen status for ChatGPT / Cursor |
| `mission_attach_proof` | Stub/fake proof gallery (vet POC) |
| `mission_approve_proof` | Put on Board — approve by 1-based index |
| `mission_reject_proof` | Dump — reject / reopen requirement |

Playable attestation and `mission_advance` come later. Do **not** mark playable from workers.
