# New henchmen — production idle sprites

Evan authorized Codex to prepare the four existing concepts. This supersedes the older handoff assigning all cutout preparation to Cursor. The builder still owns roster registration, encounter placement, catalog/semantic wiring and runtime validation.

Use the fulfilled request JSON as the delivery record for each character. Original Midjourney masters remain in `../henchmen-concepts-2026-09-26/`; per-character provenance links source job, candidate, original hash and generated derivative hash. These are generated preparation edits, not pixel-identical extractions.

Expected bindings:

- Crab Pincher: `token.plink.gang.crabPincher.idle` → `world2_plink_gang_crabPincher_idle`
- Grasshopper Kickboxer: `token.plink.gang.grasshopperKickboxer.idle` → `world2_plink_gang_grasshopperKickboxer_idle`
- Armadillo Blocker: `token.plink.gang.armadilloBlocker.idle` → `world2_plink_gang_armadilloBlocker_idle`
- Bat Divekicker: `token.plink.gang.batDivekicker.idle` → `world2_plink_gang_batDivekicker_idle`

Check these names against current runtime loaders before import. The inspected loader may prefer a portrait for idle/attack when one exists; do not assume adding an idle imageset changes every displayed pose. No attack/defeated art is supplied. Document any fallback as provisional.

Grounded sprites: align the recorded image-space ground-contact anchor to Porcupine’s foot baseline rather than aligning PNG canvas bottoms. Match optical body scale, preserving Crab’s wide squat shape and Grasshopper’s tall angular shape. Bat uses a hover pivot rather than a foot baseline; maintain transparent gaps around wings and feet. Anchors are delivery recommendations and need actual UI tuning.

Verify all four on the climb chart and fight card at 148–260pt, against light and dark backgrounds. Check edges, full-body fit, facing, portrait/idle routing, and pose fallback. Static file/alpha checks do not establish runtime verification.

Keep Porcupine as the first enemy of the first level. Do not infer new encounter placements or replace named bosses from this handoff. No game code, build, catalog replacement, commit or push was performed by this art pass.

The first three delivered canvases are 1086 × 1448. Their visible bounds differ; avoid cropping antennae, ears, claw tips or tail when preparing runtime derivatives. Ground-contact values are image-space coordinates with top-left origin, not SpriteKit anchorPoint coordinates; convert coordinate conventions explicitly.
