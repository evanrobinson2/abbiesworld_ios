# /sounds

The landing page (`/sounds`) and the sound page (`/sounds/<id>`) are static shells, like `/models`. `sounds.js`
fills them from catalogues it fetches at load, so a stored sound shows up with no rebuild.

## Where the list comes from

The page merges, in this order (a later record replaces an earlier one with the same id):

1. `/sounds/manifest.json`: every sound in the starter library, written by `tools/sound-engineer/store.mjs`
   (measurements and waveform, plus the R2 URL once stored), and the sounds the site ships itself (`status: "bundled"`).
2. `/music/catalog.json`: the composer's music, in the same shape.
3. `window.SOUNDS_CATALOG_URL` or `/api/sounds`: the R2 catalogue (`sounds/catalog.json`) the sound-store Action publishes.

## Shape

Same envelope as the model catalogue (`{ "sounds": [ ... ] }`), and the same core fields (`id`, `name`, `kind`,
`group`, `urls`, provenance), with `media: "sound"` so models and sounds can later share one browser.

```json
{
  "id": "hen-1", "media": "sound", "slot": "hen", "name": "Hen clucking 1",
  "kind": "animal",                  // ambience | animal | effect | ui | music
  "group": "Farm animals",           // landing page section
  "subject": "Hen Clucking Close · Publisher",
  "tags": ["Birds"], "uses": ["Near the chickens"], "loop": false,
  "status": "stored",                // stored | picked (not stored yet) | bundled (served by the site)
  "urls": { "audio": "/r2/sounds/blobs/…/hen-1.mp3" },
  "duration": 1.4, "loudness": -18, "peak": -3.2, "channels": 1, "peaks": [0.1, 0.8, …],
  "source": { "library": "Sonniss GDC Game Audio Bundle", "part": "gdc2024/3", "path": "…/BIRDChkn_Hen Clucking….wav" },
  "recipe": { "trim": [0.2, 1.6], "fade": 0.01, "target": -18, "mono": true, "format": "mp3" },
  "license": "sonniss-gdc", "candidates": [ … ], "notes": [ … ]
}
```

Only `id`, `name` and `urls.audio` are needed to play. Sonniss sounds have no download link: their licence allows
them in the game but not passed on as sound effects.
