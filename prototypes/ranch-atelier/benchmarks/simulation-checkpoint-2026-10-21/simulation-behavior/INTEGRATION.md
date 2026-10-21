# Conservative neighbor reuse — 2026-10-21

Production overlays: `simulations/ranch-life.mjs`, `simulations/ranch-navigation.mjs`, `simulation-behavior-performance.html`, `simulation-behavior-results.json`.

Animal movement builds one ordered conservative peer list spanning both steering reach and final movement distance. It reuses that list for steering and swept clearance; narrow-phase logic and ordering remain unchanged. Existing navigation and createRanchLife APIs remain available. Hidden bodies skip unused previous-pose storage and presentation interpolation. No new off-camera simulation policy or occlusion detector was added. Indoor workers already use offsite coarse behavior.

Validation: 10,000 randomized exact steering/swept-clearance comparisons; full scene snapshot equality against baseline at 100, 395, 520, 1,000 animals; day/night-rain, deterministic replay, presentation restoration, held-entity ownership. Six interleaved CPU sample pairs of 40 fixed ticks per scene, Chrome CDP threadTicks TaskDuration, rendering suspended. Median CPU ms/tick before→after: 8.61→8.37; 69.71→69.86; 28.71→29.74; 56.19→55.57. Differences are small and mixed: no consistent speedup or FPS gain established. Nearby-list reuse reduces final movement candidates by 63–81%. Shared hardware and layout changes limit cross-population inference.

The spatial-grid experiment was rejected because maintenance/sorting did not show reliable benefit. Its source and raw measurements remain internal. Large fixture care/resource and terrain/access limitations remain.

Deployment scripts copy the latest full production manifest, verify life/navigation source baseline hashes, overlay only these four files, and guard the production alias immediately before submission. Preserve future concurrent work by rebasing the manifest, never redeploying this saved manifest blindly.
