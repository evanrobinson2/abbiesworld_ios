# Simulation engine work

Baseline: commit 6aba8759c6e2ed0dce7d2bf946e6b90370406415, pushed to origin/codex/ranch-simulation-core; production dpl_2MnrQZuZYjXSZWFGLtH5BUNXHPwt.

Requested scope: (1) render-independent authoritative simulation state and tick; (3) reduced-detail hidden activity with needs/resources still advancing; (4) compiled computational core; repeated FPS benchmarks through 1,000 animals. Worker-thread execution and desktop packaging were not requested in this pass.

Implementation boundaries:
- Plain actor poses/state and animation intent belong to the core. Three.js objects are adapter-owned projections; physics ownership remains explicit.
- Headless tests use the same tick and seeded input as the visible app. View callbacks may not mutate authoritative state.
- Hidden-detail policy must never hide visible pen occupants; motion can use a slower bounded cadence offscreen while needs and resource accounting run on every fixed tick. Reappearance, save/restore and held actors require regression tests.
- Compiled code must have a JavaScript reference, deterministic randomized comparisons, a reproducible build, and a fallback. Measure its effect; no assumed speedup.
- Benchmark overview, close view, and hidden-content scenarios with identical seeds, camera, population, graphics and clock. Alternate baseline/candidate order and repeat. FPS vs actual animal count stays the main chart. Also inspect simulation progression so a higher FPS cannot mask slower simulated time.
- Preserve concurrent release changes by fresh full manifest, touched-file hashes and alias guard. Pending animation-grounding fix overlaps ranch-life; reconcile before deployment.
