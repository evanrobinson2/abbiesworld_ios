# Model store

Every model lives in Cloudflare R2, catalogued in Postgres. The game and `/models` read from there; the copies
in the repo are the source the store is filled from and the fallback when the store can't be reached.

```
repo (main)                              
   │  GitHub Action "model-store" (on model changes, or Run workflow)
   ▼
tools/model-store/sync.mjs ──► R2  models/blobs/<sha256>/<file>       GLB, reference image, render, provenance
                           ├─► Postgres  model_assets (schema.sql)     one row per model
                           └─► R2  models/catalog.json                 curated /models list
                                   models/catalog-all.json             every model and reference image
                                   models/paths.json                   site path -> R2 URL
   ▼
abbies-ranch-atelier  /api/models (?all=1, ?paths=1)  and  /r2/* -> the bucket's public URL (vercel.json)
   ├─► /models pages (models/models.js reads /api/models first)
   └─► the Sandbox: /model-store.mjs points three.js's loaders at R2 for every stored file
```

Files are keyed by content hash, so a re-run only uploads what changed and an R2 URL never changes meaning.
Each row keeps: id, name, kind, group, match score (outline overlap), status, source path, site path,
sha256, bytes, GLB/ref/render/overlay/provenance URLs, source image, the parsed provenance and the full `/models` record.

## Credentials (one-time)

The bucket and database are the ones the StoryBoard Vercel project (`story-forge`) already uses. Its R2 keys are
stored as Vercel "sensitive" values, which nobody can read back, so the Action needs its own copy as
repository secrets at https://github.com/evanrobinson2/abbiesworld_ios/settings/secrets/actions:

| Secret | Where to get it |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare dashboard > R2 > right-hand panel "Account ID" |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | R2 > Manage API tokens > Create API token, "Object Read & Write" (or "Admin Read & Write" so the sync can also set CORS) |
| `R2_BUCKET` | R2 > the bucket's name |
| `R2_PUBLIC_BASE_URL` | the bucket > Settings > Public access, e.g. `https://pub-….r2.dev` |
| `POSTGRES_URL` (optional) | Vercel > story-forge > Storage, or Supabase > Connect > URI |

Then Actions > model-store > Run workflow. Without `POSTGRES_URL` everything still lands in R2 and the
catalogue JSON; the table is filled on the next run after it is added.

The site proxies `/r2/*` to `https://pub-07c8c8a2d9aa40db9fa739b28c65b3e2.r2.dev` (`vercel.json`, and the default
`MODELS_R2_BASE` in `api/models.js`). The Action warns if `R2_PUBLIC_BASE_URL` is a different bucket.

## Local use

```
cd tools/model-store && npm install
node sync.mjs --tree main=<checkout of main> --tree live=<checkout of the live branch> --dry-run
```

`?bundled` on any game URL ignores the store and loads the files shipped with the site.
