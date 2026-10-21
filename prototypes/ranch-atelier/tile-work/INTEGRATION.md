# Tile pickup and fitting

Canonical target: https://abbies-ranch-atelier.vercel.app/simulations/

Changes are limited to tile-chooser.mjs, live-tray-preview.mjs, new tile-placement-feedback.mjs, the manual placement handoff in lab.mjs, and one regression test. Preserve the compactWorkspace import/init and existing runtime, AI, City and Moon hooks. The publish script overlays five files onto a fresh complete production manifest, guards every touched source hash and the canonical alias, and preserves the existing AI gateway setting.

Pointerdown immediately lifts the actual generated live canvas into an oversized transparent cursor follower. A short click leaves the piece in hand; the next canvas click places it. Press/drag/release remains supported. Window-level tracking maintains ownership after the canvas leaves the tray. Empty frontier sockets receive gold fill/outline; release shrinks the held piece toward the socket and the actual world group settles before generation replaces it. The landing pulse uses the socket perimeter, not triangulation edges. There is no substitute scene or fabricated simulation.

Invalid drops, Escape, pointer cancellation and window blur return the tile. Modified mouse gestures cancel placement and retain the shared camera bindings; a second touch cancels placement. Needs and runtime logic are unchanged. Presentation transforms restore exactly, including reduced-motion and interrupted animations. Cursor hit testing updates socket transforms only, not the entire world.

Validation: local Chrome tests exercise real desktop click and drag placement, immediate pickup visibility, invalid drops, Escape, modified camera gestures, touch placement and multitouch cancellation. The 320px/reduced-motion and canonical verification receipts are recorded separately. The existing full build passed 360 tests; the added exact-transform/reduced-motion regression also passes. Screenshots are captured from actual generated scenes.

Production dpl_EWD3qNQbWLYj28Kgb39ccpK2iqxx is READY. Canonical hashes match and all 3541 unowned source files are unchanged. Deployed desktop click/drag, immediate pickup, invalid/Escape, modified gesture, touch placement, multitouch cancellation and 320px reduced-motion checks passed with no page errors. Desktop and phone screenshots inspected. See release.json and production-check.json.
