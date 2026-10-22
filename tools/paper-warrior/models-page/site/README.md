# /models

The landing page (`/models`) and the model page (`/models/<id>`) are static shells. `models.js` fills them from a catalogue it fetches when the page loads. A model added to the catalogue shows up with no rebuild.

## Where the catalogue comes from

The page tries these sources in order and uses the first one that answers with JSON and a non-empty list:

1. `window.MODELS_CATALOG_URL`, if a page sets it.
2. `/api/models`, which will be the database catalogue once it exists.
3. `/models/manifest.json`, the bundled fallback. `tools/paper-warrior/models-page/gen_models.py` writes it.

## Shape

The catalogue is either `{ "models": [ ... ] }` or a bare array. Each model looks like this:

```json
{
  "id": "cuirass",                       // URL slug: /models/cuirass
  "name": "Cuirass",
  "group": "Paper warrior · props",      // landing page section
  "subject": "Segmented chest armour",   // one line on what the reference shows
  "status": "good",                      // good | partial | weak (derived from outline if absent)
  "outline": 0.915,                      // silhouette overlap 0..1, the headline number
  "orbit": [-8, 65],                     // 3D camera turn and tilt in degrees, matching the reference
  "urls": {                              // absolute (R2) or site-relative
    "ref": "…/ref.jpg", "render": "…/render.jpg", "overlay": "…/overlay.png", "glb": "…/model.glb"
  },
  "scores": [{ "label": "Outline overlap", "value": 0.915, "help": "tooltip" }],
  "loss": { "before": 0.292, "after": 0.277, "note": "after two fits (lower is better)" },
  "good": ["…"], "off": ["…"],
  "steps": [["Short heading.", "Sentence or two."]],
  "details": [["Triangles", "2,768"], ["Size", "0.44 × 0.27 × 0.57 m"]],
  "date": "2026-10-22"
}
```

Only `id`, `name`, `outline`, `urls.ref` and `urls.glb` are required. The page leaves out any section whose data is missing.

GLBs served from another origin, such as R2, need CORS that allows GET from the Ranch Atelier domains.
