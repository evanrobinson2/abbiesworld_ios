# App mirror (paused, not yet published)

A Claude page (artifact) that mirrors the Ranch Atelier app from `main`, with a mark tool: freeze the frame,
draw on it, write a note, and "Send fix" stores the picture, camera, the object under the mark and the scene
context in the artifact's database (`marks` collection) for threads to pick up.

- `serve.mjs` local stand-in for the Vercel site (rewrites from dist/vercel.json); records what it serves.
- `crawl.mjs` opens each screen in `screens.mjs` headless and records the files it loads (`out/crawl.json`).
- `build.mjs` writes `out/site/`: pages and code stay loose with root paths made relative; models, pictures and
  data go into content-named packs (`.glb` isn't publishable and a page holds ~500 files).
- `runtime/shim.js` lets the unmodified app run from an unknown folder (fetch, src, workers, links, import map,
  /api stubs, capture). `runtime/shell.html` is the page: the app in a frame, a glass dock, the mark tool.

Still to do: test `out/site` served from a sub-folder with no rewrites, a publish plan that splits files into
batches of 255 / 60 MB and removes stale paths, the first publish, a trigger that republishes when main moves and
routes new marks to the feedback inbox, and an inbox item.

    node tools/app-mirror/crawl.mjs && node tools/app-mirror/build.mjs
