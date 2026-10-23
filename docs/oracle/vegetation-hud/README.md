# AW-STUDY-0019 - Trees, Vegetation and HUD (paused 2026-10-23 05:44Z)

Evan paused this study to focus on the coffee shop and modeling. State when paused:

- **Vegetation.** `prototypes/ranch-atelier/dist/simulations/basin/basin-flora.mjs`, behind `?trees=v2` (`&season=autumn`
  for grove colour) on `/sandbox?world=basin` and `simulations/basin/preview.html`. Stands and clearings from a clump field,
  forest edges as an ecotone (small young trees, shrubs), clonal aspen groves that turn together, per-tree and per-stand
  colour at mid values, top-lit crowns, a darker forest floor, wind with gust fronts, near/far trees per 80 m chunk.
  About 1.2M triangles against v1's 2.0M in the default view. Not yet checked inside the full sandbox.
- **Same-camera shots.** `node tools/basin-shots/shots.mjs <outdir> [query]`; images in `img/before-*`, `img/after-*`,
  `img/autumn-*`.
- **Top bar.** `mock/hud-mock.html` (rendered by `mock/render.mjs` to `img/hud-*.jpg`): today, A "The Watch" (toy box as
  the crown, beads for dials), B "The Island" (mark, dial, time; live lobes for world things, timers and the chosen tile),
  C "The Dial" (sun dial only; hold for a watch face with pause, speed, stopwatch, Now, pin). Leaning B.
- **Cursor.** `img/hud-K.jpg`: the cursor becomes what it is over; right-click or long-press a place for a glass tag from
  the scene's manifest. Share with AW-STUDY-0018 (camera and controls).
- **Not done.** The write-up of how stylised games draw forests, Midjourney proofs (queued on the PC). (The review inbox was killed; link Evan straight to a page.)
