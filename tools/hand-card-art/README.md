# Hand-card art: each tile's cartoon

The Sandbox v2 hand cards (`simulations/hand-cards.mjs`) show each tile's cartoon: the comic-mode landmark the game
draws for that tile type (`cartoonLandmark()` in `simulations/developer-mode.mjs`) with its seeded storybook dressing,
on a cartoon hex. Evan, 2026-10-23: "I wanted the CARTOON on the card and the facets mean nothing". Two earlier tries
were rejected: comic illustrations (a house, a tree, a horse read as one object, not the place) and close-ups of the
tile tray's realistic render. The cards carry no ability icons.

- Ranch: barn and silo. Garden (crop): the kitchen garden beds. Meadow: wildflower drifts, a straw bee skep and
  butterflies around its storybook pond. Moonbase: the moon dome. The meadow and moon landmarks were added to
  `cartoonLandmark` for these cards, so comic mode in the game draws the same thing.
- Render pass (Evan: "do a full render pass"): toon materials on a three-step ramp in place of the game's flat-shaded
  standard materials, soft sun shadows, ink lines from a normal and depth pass (creases, contact edges, silhouette),
  rendered at 2048 px and downsampled.
- To re-render: serve `prototypes/ranch-atelier/dist` on :8787, run `node render-cartoon.cjs <out-dir>` (it loads
  `cartoon.html` against the served modules and writes transparent `cartoon-<id>.png` at 1024x1024), then crop each
  to its alpha bounds, fit it inside 640 px and save it as `simulations/assets/tile-cards/<id>.webp`.
- Card Forge sees the transparent image as a cut-out and stands it on the painted backdrop of the card's biome.
  `renderCard(spec, {lod: 'hand', plate: false})` keeps the name and gives the plate's room to the art.
