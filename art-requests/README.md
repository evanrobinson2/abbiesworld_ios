# Art request queue

Builders ship with placeholders. Art direction fulfills from this inbox.

**Remote art directors (ChatGPT / GitHub-only):** start at
[`ART_DIRECTOR_AGENT.md`](ART_DIRECTOR_AGENT.md), then inspect
[`queue.json`](queue.json) and `open/*.json`. Do not require Evan’s local disk
or `~/.codex/skills/…`.

## Layout

| Folder | Meaning |
| --- | --- |
| `open/` | Needs art (or a keep-stock decision) |
| `in_review/` | Art director actively working |
| `fulfilled/` | Integrated or ready for builder bind; `fulfillment` filled |
| `wont_fix/` | Explicit keep-stock / abandon |

One request = one JSON file. Filename = `id` + `.json`. Schema: [`schema.json`](schema.json).

Machine-readable index (regenerate after moves):

```bash
python3 scripts/rebuild_art_request_queue.py
```

→ writes [`queue.json`](queue.json). Individual request files remain source of truth.

## Builder habit (Cursor / coding agents)

When you introduce or leave any of:

- `Image(systemName:)` / SF Symbol as **content art** (not chrome)
- `World2PlaceholderPack` / missing catalog image
- Provisional reuse of another character’s art
- Temp prototype scrap as stand-in

…**silently** write or update `art-requests/open/<id>.json` in the same change set.

**Do emit** for characters, plates, portraits, fight FX, map tokens, music beds.

**Usually skip** (or set `keepStockIcon: true` + `priority: optional`) for chevrons, close, speaker, lock, music.note, list chrome.

`semanticId` is the join key — never invent a second registry. Prefer existing conventions (`token.plink.gang.<id>.<pose>`, `map.*`, `poi.*.exterior`).

**`relatedPaths` must be repo-relative** and point at committed files a remote reviewer can open on GitHub (`AssetSources/…`, `prototypes/…`). Never `/Users/…`.

Quiet by default when **filing**. Loud on **build check** (below).

## Before / during every major build

Builders **always** inspect the queue and confirm with Evan:

1. `fulfilled/` — unbound art ready to wire?
2. `open/` + `in_review/` — what’s still placeholder on this surface?
3. Handoff must say whether to **bind fulfilled now** or ship placeholders knowingly.

Do not block compile on open requests unless `blocker` and Evan said wait. Rule text: `.cursor/rules/art-request-queue.mdc`.

## Art director habit

**Authoritative contract:** [`ART_DIRECTOR_AGENT.md`](ART_DIRECTOR_AGENT.md).  
Paste-friendly summary: [`ART_DIRECTOR_INTAKE.md`](ART_DIRECTOR_INTAKE.md).

Short path:

1. Read `ART_DIRECTOR_AGENT.md` + `queue.json`
2. Inspect `open/*.json` and every image in `relatedPaths`
3. Move pick → `in_review/` (when you have write access)
4. Prep existing concept first; Midjourney only when needed (Evan’s pacing)
5. Land files under `AssetSources/…` with `provenance.json`
6. Fill `fulfillment`, move → `fulfilled/`, rebuild `queue.json`
7. Hand builder bind + runtime verify when needed

## Seeded starters (2026-09-26)

Four unnamed henchmen concepts already live in `AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/` — requests track **production cutouts + semantic bind**, not greenfield concepts. Porcupine is the style lock + runtime reference. Climb / shop / event plates and tokens also seeded; visual style refs point at trail-scrap mock assets and the porcupine pack.
