# /explore

The library: models, cards, HUDs and the reports behind them in one grid, one viewer and one set of shelves. It is served at
`/explore` on every host and at the root of `explore.abbies.world` (a host redirect in `vercel.json`). The game links to it
with the chest button on the left edge (`/explore-door.js`, loaded by `view-context.js`).

Every collection is read when the page opens, so new work appears without a rebuild.

| Collection | Source | Fallback |
|---|---|---|
| Models | `/api/models` (R2 `models/catalog.json`, see `/models/README.md`) | `/models/manifest.json` |
| Cards | `/api/library?c=cards` (R2 `library/cards/catalog.json`) | `collections/cards.json` |
| HUDs | `/api/library?c=huds` (R2 `library/huds/catalog.json`) | `collections/huds.json` |
| Reports | `/api/library?c=reports` (every `.md` / `.html` under `docs/oracle` on `main`) | `collections/reports.json` |

## Publishing cards or HUDs

Write `library/cards/catalog.json` (or `library/huds/catalog.json`) to the models R2 bucket. R2 URLs are rewritten to the
same-origin `/r2` proxy.

```json
{ "updated": "2026-10-23T00:00:00Z", "items": [
  { "id": "red-barn", "name": "Red Barn", "image": "https://…r2.dev/library/cards/red-barn/front.png",
    "thumb": "…/thumb.jpg", "back": "…/back.png", "group": "Ranch set", "subject": "one line",
    "date": "2026-10-23", "score": 0.91, "status": "good", "url": "/cards/red-barn" } ] }
```

Only `id`, `name` and `image` are required. `back` shows on hover in the grid; `url` adds an Open button in the viewer.

## Reports

A study merged under `docs/oracle/<topic>/` appears in Reports and also above the collection it informs
(`cards/` beside Cards, `huds/` beside HUDs, `models/` beside Models). `CARD_STUDY.md` and `card-study.html` with the same
name are one report: the page opens first and the Markdown is its Text tab.

## Shelves

Shelves and picks live in the viewer's browser (localStorage `explore.*`). Nothing on this page writes to the server.
