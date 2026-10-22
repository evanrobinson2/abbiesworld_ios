# Model normalization handoff — 2026-10-18

Changed model-calibration.js, model-normalizer.js/html, tile-editor.js, tests/model-calibration.test.cjs. Family defaults cover 98 catalog records; defaults never set approvedAt. Per-model browser overrides retain priority. Removed per-placement width normalization from tile assets. modelDimensions supplies planner footprints from the same factor as rendering. Storage events and clear/save events rebuild scene dimensions/placement; updates during rebuild are queued.

Verified save house factor2.1 -> live tile footprint6.11688m, clear -> default factor2 and5.8256m. Browser test override was removed; no approvals were changed. Model Normalizer and Scene Generator MCP checks passed, current build d01d468f0f09632f, deployment dpl_DuD6z12bpqava3APamVnry63Lhuh. All53tests passed. House reference render and tile image inspected. Proof outside repo: ~/.codex/ranch-view/normalization-house.jpg and normalization-scene.jpg.

Defaults are artistic size proposals. All98have defaults, but individual visual acceptance remains Evan's. Existing consumers of calibratedScale now receive defaults too; other scenes apply changed browser overrides on reload. The tile editor updates across tabs without reload. Scene composition/100m tile density remains a separate issue from normalization.
