# Ranch core and FPS chart release

Canonical pages: `/simulations/` and `/simulation-performance.html#capacity-benchmarks` on `abbies-ranch-atelier.vercel.app`.

The saved production baseline is on `codex/ranch-simulation-core`: checkpoint 6aba8759, concurrent character fix c7fbe3d, core implementation 7be0ce2. The final branch also carries the compatible AI composition/City/Claude/Aurora/Jukebox sources used by the merged lab. Publication preserves the entire newer production manifest, including the unrelated Gateway art-lab release.

Preserve the new numeric core modules under `simulations/simulation/`, compiled navigation source/binary/build metadata, and the one `active.life.setView?.(camera)` hook before the ranch fixed-clock advance in `lab.mjs`. The Three.js adapter projects state and handles physics ownership explicitly; full-detail JS behavior retains baseline parity. Frustum classification updates only the root world transform, never the full scene graph. Loose animals stay at full detail. Needs and lifecycle updates continue on every tick; offscreen motion has a bounded cadence. This is a browser/headless core and C/WASM steering, not a worker thread or desktop package.

Keep both build gates: terrain-safe character animation and compiled navigation provenance. The normal npm test suite now runs the headless/replay/lifecycle and randomized navigation tests through `tests/ranch-engine.test.cjs`. Its fixtures are build inputs and are excluded from public-build.

The chart uses asset count on X and FPS on Y. It contains 78 current samples (3 alternating before/after repeats per cell, 10-second samples after 5-second warmup), all seven actual populations through 1,000, plus close/camera-away cases at 100/520/1,000. Whiskers are observed min–max, not confidence intervals. At 1,000, medians are 16.6→26.5 overview, 22.7→32.2 close, 24.7→35.6 away. Smaller results are mixed, including noisy 520 overview. Historical three-attempt data is separate because it came from different sessions and a 30 FPS ceiling. The report refuses incomplete cells, changed cameras, errors or resource-balance drift.

The chart keeps one 56px toolbar. Its connection badge lives in the bounded details panel so shared music/appearance buttons stay usable on phones. Preserve the shared appearance loader and settings.

Local verification: 360/360 build tests; 7 engine/navigation cases; 5 additional 1,000-animal headless cases. Canonical hashes, desktop/phone chart modes, WASM and failure fallback, grounded people, pause, held-pose restore, wheel/pan/touch controls and detail re-entry are checked by `verify-live.cjs`. Final deployment and verification receipts are in `release.json` and `live-verification.json`.

Cross-runtime limitation: Chrome/Node may diverge in near-contact motion because of floating-point math; within-runtime replay is exact. The 1,000 case preserved tested domain state but had a 0.61 m maximum trajectory difference after 20 ticks across those runtimes. Do not promise cross-platform lockstep.
