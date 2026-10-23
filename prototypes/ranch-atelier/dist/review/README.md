# Review inbox

`app.abbies.world/review` (also `ranch.abbies.world/review`, `/inbox`) is Evan's one place to see everything waiting on him, newest first.

## Adding an item (every thread)

When something needs Evan's eyes, append one item to `feed.json` in your PR, then tell Evan only: "it's in your inbox".

```json
{
  "id": "unique-slug",
  "at": "2026-10-23T04:30:00Z",
  "title": "Paper man #1",
  "ask": "One plain line: what Evan decides.",
  "thread": "Your thread title",
  "before": "img/your-pick.jpg",
  "after": "img/your-result.jpg",
  "glb": "3d/your-model.glb",
  "link": "https://the-page-where-he-acts",
  "linkLabel": "Short name",
  "status": "waiting"
}
```

- `before`/`after`: his pick, then our result, from the same camera. Use `image` instead when there is no pair.
- `glb`: optional; shows a spinnable 3D viewer under the pair. Keep it under ~2 MB.
- Images go in `img/` (jpg, about 600-900 px wide), models in `3d/`.
- `status`: `waiting` (needs Evan), `coming` (on the way, no action), `done` (hidden).
- When Evan answers, set your item to `done` or replace it with the next round (new `id`, keep the old one as `done`).
- Evan's own "Done" taps are stored on his phone only.

## Model studies

Add `"models": ["id-1", "id-2"]` (catalogue ids from `models/manifest.json`; `"moon-*"` matches a prefix) to make the
item a study set. Tapping it opens `/models/?set=<item id>`: the models review desk showing only that set, concept on the
left, 3D in the middle, keep / talk / reject on the right. Verdicts go to `/api/model-reviews` and, for owned groups,
to the owning thread's feedback inbox (`OWNER` in `models/models.js`). Put each model in `models/manifest.json` first.

**Retired (Evan, 2026-10-23 05:38Z: "kill this").** /review, /review/ and /inbox now redirect to /studies/. The images and models under review/img and review/3d stay, because /models still shows them. Threads no longer post items here.
