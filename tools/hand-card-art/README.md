# Hand-card art from the game itself

The Sandbox v2 hand cards (`simulations/hand-cards.mjs`) show each tile as the game generates it, so a card and the
place it makes always match (Evan, 2026-10-23: "that should jive in-game too"). The comic illustrations tried first
read as a single object (a house, a tree, a horse) rather than the place.

1. Serve `prototypes/ranch-atelier/dist` locally and run `node render.cjs ranch,garden,meadow,moon` (K=0.4 sets the
   camera to 40% of the tray's default distance). It opens /sandbox/v2, picks each generator, waits for the tile tray's
   live preview (`live-tray-preview.mjs`, patched in the request to render 1024x1024) and saves `tray-<id>.png`.
2. `python3 crop.py <render folder> prototypes/ranch-atelier/dist/simulations/assets/tile-cards` crops each to the
   card's art window around the tile's heart (the tray renders grass blades see-through, so those pixels are filled from the ground around them).
