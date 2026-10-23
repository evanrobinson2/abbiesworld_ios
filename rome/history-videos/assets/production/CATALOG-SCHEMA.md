# Catalog schema 2.0 — versioned frames

Each item in `viewer/public/data/manifest.json` (and Blob `catalog/frames.json`):

| Block | Purpose |
| --- | --- |
| Identity | `id`, `filename`, `category`, `tags` |
| Narrative | `storyPart`, `storyBeat`, `mood`, `stanza` |
| **version / versions[]** | Current label (`v1`/`v2`) + history with paths/URLs + reject notes |
| **physical** | PNG size, aspect, bytes, content hash, medium, palette |
| **context** | Era, year, location, setting, characters, factions, emotion, light, withheld… |
| Prompt / review | Generation prompt + agent QA |

## Version rules

- First pass kept as-is → `version: "v1"`
- Regenerated after reject → current `v2`, archived `v1` in `versions[]` / `assets/rejected/v1/`
- Flagged for eye → `versions[0].status: "flagged"` (possible v3)
- Blob paths: `frames/{id}/{version}.png`

## Add a frame

```bash
npm run blob:add -- ./frame.png --id ID --part "…" --beat "…" --version v1 \
  --location "…" --characters FRI-001 --mood "1 Dread" --prompt "…"
```
