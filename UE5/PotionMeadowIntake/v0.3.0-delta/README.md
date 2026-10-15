# Potion Meadow v0.3.0 source delta

Apply to a new copy of the frozen v0.2.0 intake (coordinator-reported UE5 commit 7484b58). Do not overwrite that frozen intake. Replace only `PMRules.h`, `PMAdventureModel.h`, and `SPMAdventure.h` in the AbbiesWorld module. Build and recook. Bump the host's relevant product version under coordinator control; no shared config or native Content is replaced by this delta.

All 41 native assets are byte-identical to v0.2.0. All asset paths, AWPotionMode entry/return hooks and Blueprint completion events are unchanged. The delta introduces genuine fog-of-war discovery with reciprocal recovery, adjacent-only movement, smaller encounter footprints, bold grid/frontier highlights and a glass-look floor glaze beneath the fog.

Read `Gameplay.md` for the rebalanced rules and `Evidence/verification.json` for the packaged playthrough checks. Seeds are reproducible within v0.3.0; the safe camp reservation changes layouts relative to v0.2.0. Original generated media and audio provenance is inherited from the frozen base. New work is original C++/Slate code only. No proprietary extracts, credentials or build output are in this source delta.

Copy to a working checkout before compiling. The provided snapshot and ZIP are frozen review artifacts. Public integration, human visual approval, parent portal/reward wiring, shared style/tilt-shift and device validation remain coordinator-owned.
