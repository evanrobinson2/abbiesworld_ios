# Ranch core and FPS evidence

Baseline: `c7fbe3db2ece25dab84a14933eab34d35f347a2e`, on branch `codex/ranch-simulation-core`. This incorporates the production backup and concurrent grounded-character fix.

## Implemented scope

- `ranch-core.mjs` owns needs, household schedules, care jobs, animal decisions/motion, demographic changes, life histories and ecological resource updates using numeric actor records. The Three.js adapter projects poses and animation intents. Physics ownership explicitly suspends simulation pose writes.
- `ranch-headless.mjs` exports and restores an actual generated ranch, including obstacles and the established terrain. It runs the same tick without DOM, WebGL or Three.js. Mixed Moon/City terrain is explicitly unsupported by this export helper; the browser's mixed scenes retain their adapters.
- Offscreen pens use a conservative frustum sphere and a 1.2-activity-second movement cadence (0.2 real seconds at the normal 6x activity pace). Needs and resource ledgers still advance every fixed tick. Loose and held animals retain their special handling. Reappearance flushes pending motion. No speculative occlusion test classifies a visible animal as hidden. Residents already inside homes retain their existing offsite behavior.
- A 35 KB C/WebAssembly kernel evaluates pen steering and swept collision candidates. Oversized buffers, unavailable WASM, and numerically ambiguous sampling subdivisions fall back to the JS reference. `build-wasm.py` records compiler/flags/source/binary hashes; the app build rejects stale compiled evidence.
- No worker thread or desktop package is introduced.

## Checks

Run from this directory's parent:

```
node --test engine-work/navigation.test.mjs engine-work/headless.test.mjs
FIXTURE=expanded-1000 node --test engine-work/headless.test.mjs
node engine-work/check-core.cjs
CASES=single-1000,expanded-520,expanded-1000 node engine-work/check-core.cjs
cd dist && npm ci && npm run build
```

Browser checks use Playwright from the installed Codex runtime. They load real production fixtures and route the pinned source files locally, never simplified scenes. Full-detail JS browser state matched the committed baseline exactly at 100, 395, 520 and 1000 animals, including day/night, save/replay, presentation isolation and held animal ownership.

The randomized C/JS test covers 20,000 crowded/boundary cases, plus an actual ranch regression at an almost-integral collision subdivision. Compiled and JS whole-world state matches within 1e-10 in the same Node runtime. Resource checks compare balance drift to the fixture's starting balance: some pre-existing expanded fixtures have an inherited nonzero water discrepancy.

**Determinism boundary:** save/replay is exact within a runtime. Chrome/Node have different floating-point trig results; at 1000 animals, 15 near-contact trajectories differed after 20 ticks (maximum 0.6081 m) while tested domain state matched. Cross-platform lockstep is not promised. A fully specified deterministic math/navigation model is future work.

## FPS method

`benchmark.cjs` runs the actual browser and real saved generator output at 1280x720, DPR1. Both variants use the optimized renderer. Each measured sample restores the identical starting checkpoint after warmup. Both paired scenes remain allocated; only the measured page renders. Absolute FPS applies to this harness/device. Repeated samples alternate before/after order. It records FPS, p95 frame time, actual animals/people, camera, WASM/LOD diagnostics, simulation-clock progress, backlog, resource balance drift, host load and module hashes. Profiling is disabled during timing.

```
SECONDS=10 node engine-work/benchmark.cjs
```

The main curve is asset count vs FPS. Overview covers all seven actual counts through1000; close and camera-away stress cases cover100,520,1000. Camera-away measures hidden simulation work, not visible scene performance. Older renderer/neighbor-reuse curves were measured in different sessions (including a30 FPS ceiling and contention), so they are historical context, not a controlled speedup comparison.

Interrupted timing evidence is retained as `fps-rejected-lifecycle.json`: it exposed delayed identity initialization in the first offscreen tick after restoring an older save. Those samples are excluded from the published comparison. Lifecycle now advances every tick independently of movement detail, with a saved-record regression test. Other `fps-smoke*` runs are harness checks, not chart data.

`fps-pre-root-fix.json` retains the complete diagnostic run before correcting a redundant full scene-graph update in frustum classification. It is not published as the final result. The final run uses10-second samples, three alternating repeats per cell, with the same five-second warmup.

The measured candidate source is commit7be0ce2. To reproduce that exact application envelope after later shared-app releases, set SOURCE_ROOT to its dist directory in a separate checkout; the benchmark driver and fixtures may remain in the final branch. PLAYWRIGHT_MODULE can point to another installed Playwright package.
