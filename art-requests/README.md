# Art request queue

Builders ship with placeholders. Art direction fulfills from this inbox.

## Layout

| Folder | Meaning |
| --- | --- |
| `open/` | Needs art (or a keep-stock decision) |
| `in_review/` | Art director actively working in Chrome / Midjourney |
| `fulfilled/` | Integrated or ready for builder bind; `fulfillment` filled |
| `wont_fix/` | Explicit keep-stock / abandon |

One request = one JSON file. Filename = `id` + `.json`. Schema: [`schema.json`](schema.json).

## Builder habit (Cursor / coding agents)

When you introduce or leave any of:

- `Image(systemName:)` / SF Symbol as **content art** (not chrome)
- `World2PlaceholderPack` / missing catalog image
- Provisional reuse of another character’s art
- Temp prototype scrap as stand-in

…**silently** write or update `art-requests/open/<id>.json` in the same change set.

**Do emit** for characters, plates, portraits, fight FX, map tokens, music beds.

**Usually skip** (or set `keepStockIcon: true` + `priority: optional`) for chevrons, close, speaker, lock, music.note, list chrome.

Semantic ID is the join key — never invent a second registry. Prefer existing conventions (`token.plink.gang.<id>.<pose>`, `map.*`, `poi.*.exterior`).

Quiet by default when **filing**. Loud on **build check** (below).

## Before / during every major build

Builders **always** inspect the queue and confirm with Evan:

1. `fulfilled/` — unbound art ready to wire?
2. `open/` + `in_review/` — what’s still placeholder on this surface?
3. Handoff must say whether to **bind fulfilled now** or ship placeholders knowingly.

Do not block compile on open requests unless `blocker` and Evan said wait. Rule text: `.cursor/rules/art-request-queue.mdc`.

## Art director habit

See [`ART_DIRECTOR_INTAKE.md`](ART_DIRECTOR_INTAKE.md) (paste into ChatGPT / skill). Short path:

1. Open [`index.html`](index.html) or list `open/`
2. Move pick → `in_review/`
3. Generate / select / provenance under `AssetSources/…`
4. Fill `fulfillment`, move → `fulfilled/`
5. Hand builder bind + runtime verify when needed

## Seeded starters (2026-09-26)

Four unnamed henchmen concepts already live in `AssetSources/MarbleVoyage/henchmen-concepts-2026-09-26/` — requests track **production cutouts + semantic bind**, not greenfield concepts. Plus one climb non-fight token decision (Treasure / `?`).
