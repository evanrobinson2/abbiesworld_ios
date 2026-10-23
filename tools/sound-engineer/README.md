# Sound engineer

Picks, cuts, levels and stores the sounds for Abbie's World, from the Sonniss GDC Game Audio bundles
(about 200 GB across 2015 to 2024, royalty-free for games; see LICENSE.md). The role and standards are in
SOUND_ENGINEER.md. The browser is `/sounds` on the Ranch Atelier site (prototypes/ranch-atelier/dist/sounds).

```
Sonniss bundle zips (downloads.sonniss.com, mirrors)
   │  index.mjs   reads each zip's directory with HTTP range requests (a few MB, not 200 GB)
   ▼
index/<bundle>.json        every sound file: path, size, offset, publisher, UCS category        (committed)
   │  pick.mjs    library.mjs slots -> best takes (names, WAV headers, silence detection)
   ▼
picks.json                 takes, trims, the shortlist and why                                   (committed)
   │  build.mjs   pulls only the seconds needed, cuts, loops, levels, MP3, waveform
   ▼
out/*.mp3, out/rows.json   (on the runner only)
   │  store.mjs
   ├─► R2  sounds/blobs/<sha256>/<id>.mp3, sounds/catalog.json   ─► /api/sounds ─► /sounds, the game
   ├─► Postgres sound_assets (schema.sql)
   └─► prototypes/ranch-atelier/dist/sounds/manifest.json        (committed; no audio)
```

All of it runs in the GitHub Action `sound-store` (`.github/workflows/sound-store.yml`): the cloud box can't
reach the bundle hosts or R2. It uses the model store's secrets (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL, optional POSTGRES_URL; see tools/model-store/README.md).
Without them it still indexes, picks and builds, and the manifest lists every sound as "not stored yet".

Local use, from a machine that can reach the hosts:

```
npm install
node index.mjs gdc2024/1           # index one part
node search.mjs rooster crow       # look through the index
node pick.mjs --only rooster,hen   # pick slots
node build.mjs --only rooster,hen  # build them into out/
node store.mjs --manifest-only     # write the site manifest without R2
```

Models and sounds share a record shape (id, name, kind, group, urls, provenance, plus `media`), content-hashed R2
keys (`models/blobs`, `sounds/blobs`) and parallel tables (`model_assets`, `sound_assets`), so one asset browser
and one catalogue can later serve both.
