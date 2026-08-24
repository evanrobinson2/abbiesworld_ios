# Frame Review Viewer

Mobile preview surface for story stills. Keep / discard / reroll. Not the product.

## Day-to-day: add a frame (no redeploy)

Once Blob is set up (below):

```bash
cd viewer
export BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…
export NEXT_PUBLIC_CATALOG_URL=https://….public.blob.vercel-storage.com/catalog/frames.json

npm run blob:add -- ../assets/scenes/STZ01-05.png \
  --id STZ01-05-RIDGELINE \
  --part "1. The North" \
  --beat "Horse-shadows on the ridge" \
  --mood "1 Dread" \
  --prompt "your generation prompt…" \
  --tag stanza1
```

Refresh the browser. Done.

## Organize by metadata

Facets on each frame (filter chips in the UI):

| Field | Example | Filter |
| --- | --- | --- |
| `storyPart` | `D. Marcianople banquet` | Part |
| `mood` | `10 Betrayal` | Mood |
| `category` | `scene` / `character` / `turnaround` | Type |
| `version` | `v1` / `v2` | Ver |
| `storyBeat` | beat text | Story tab |
| `context` | era, location, characters, light, withheld… | Context tab |
| `physical` | px size, hash, medium, palette | Physical tab |
| `versions[]` | v1 rejected archive + v2 current | Details tab |

See `assets/production/CATALOG-SCHEMA.md`.

## One-time Vercel Blob setup

1. Vercel → Project → **Storage** → Create **Blob** store → connect to this project  
2. Copy **`BLOB_READ_WRITE_TOKEN`**
3. Seed existing frames:

```bash
cd viewer
export BLOB_READ_WRITE_TOKEN=…
npm run manifest
npm run blob:seed
```

4. Seed prints `NEXT_PUBLIC_CATALOG_URL=…` — add that env in  
   Project → Settings → Environment Variables (Production + Preview)
5. Redeploy **once**
6. After that, new images = `blob:add` only (no rebuild)

Optional but recommended: set **Root Directory** to `viewer` in project settings.

## Local without Blob

```bash
cd viewer
npm install
npm run dev
```

Uses repo PNGs + local `public/data/manifest.json`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run manifest` | Rebuild local catalog from markdown / batch prompts |
| `npm run blob:seed` | Upload all current frames + catalog to Blob |
| `npm run blob:add -- <png> --id …` | Add/update one frame in Blob |

## Feedback

Keep / discard / reroll stays in **browser localStorage**. Use **⋯ → Export JSON** to pull decisions out.
