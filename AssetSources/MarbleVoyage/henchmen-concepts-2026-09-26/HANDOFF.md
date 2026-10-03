# Cursor handoff — make the five henchmen game ready

26 September 2026. Evan has assigned Codex the art director role and Cursor the builder role. This pack contains the selected concept masters and art direction. **Cursor owns preparation of usable game assets, integration, and runtime verification.** Copying these JPEGs into an asset catalog does not complete that work.

## Start here

Read the repository's applicable instructions and `AGENT_COORDINATION.md`, then inspect the current working tree. Preserve the existing local porcupine work. The repository is currently on `review/marble-voyage-plink`; the art pass has not committed or pushed anything.

This folder is self-contained: five full-resolution 928 × 1232 JPEG originals, source URLs and candidate indices in `sources.json`, exact new-character prompts in `prompts.json`, selections and SHA-256 hashes in `review-manifest.json`, the full `art-direction-plan.md`, and the interactive `art-review.html`. The earlier porcupine prompt and derivative provenance are in `../porcupine-boxer/provenance.json`.

| Character | Source selection | Current status | Preparation focus |
| --- | --- | --- | --- |
| Porcupine Boxer | Candidate 4 | User-approved concept; earlier transparent derivative exists | Preserve quill tips, glove separation, round body and small-size readability |
| Crab Pincher | Candidate 2 | Art-director selection for preparation | Clear left-facing combat silhouette; giant/tiny claw contrast; cobalt/orange palette is a proposal, not an automatic recolor |
| Grasshopper Kickboxer | Candidate 4 | Art-director selection for preparation | Resolve six-limb anatomy, hind-leg connections and antenna tips; keep insect proportions |
| Armadillo Blocker | Candidate 4 | Art-director selection for preparation | Preserve four limbs; expose shell clearly; costume reduction is a proposed refinement |
| Bat Divekicker | Candidate 4 | Art-director selection for preparation | Clear left-facing airborne silhouette, attached far wing, separate feet and wing/body gap |

The four new selections are not recorded as user-approved final production art. Evan has authorized the Cursor preparation handoff. Keep concept-selection status separate from technical readiness; record substantial design changes explicitly.

## Cursor's production work

1. **Prepare transparent derivatives.** Remove white backgrounds and baked ground shadows without erasing pale highlights, quill tips, antennae, wing membranes, or gaps between limbs. Preserve the source files and identities. Inspect edges over both light and dark backgrounds at full resolution and at the actual game display size. Eliminate white halos and stray opaque pixels. Save production cutouts as RGBA PNGs in the repository's established pipeline.
2. **Normalize presentation.** Inspect existing runtime image sizing before choosing export dimensions. Give the grounded cast a consistent foot baseline and deliberate visual scale; define a separate hover anchor for the bat. Record canvas size, visible bounds, anchor/pivot, facing direction and scale for each derivative. Keep enough padding for quills, claws and wings. The target combat direction is left; use deliberate edits where profile or anatomy needs correction rather than assuming a flip solves it.
3. **Handle poses honestly.** These are single concept images, not animation sheets. Produce or arrange consistent idle, attack and defeated states as the game requires. If the initial implementation reuses idle through the existing fallback, label that as provisional and document it. Do not describe static fallback images as completed pose sets. Preserve costume, proportions, palette and limb count across any new states.
4. **Separate full-body and portrait uses.** Make a portrait crop only when its actual UI use requires one. `PlinkAttackerKind.catalogImage(for:)` currently prefers a bundled portrait for both idle and attack. Verify what each view actually displays so that a portrait does not accidentally mask the intended full-body combat artwork.
5. **Import and wire the results.** Follow existing asset-catalog, semantic library, review gallery and attacker roster conventions. Update provenance for every derived asset with its parent source hash, preparation method, output hash and intended use. Keep source masters outside runtime bundles when they are only production references.
6. **Verify the shipped presentation.** Check alpha, clipping, baseline, apparent size, legibility, pose transitions and missing-image fallbacks in the real game. Capture the first fight and a review of the remaining prepared cast. Complete relevant build/tests when the environment is available, and distinguish static checks from executed runtime verification in the handoff back to Evan.

## Existing implementation to inspect

The earlier local pass added `porcupineBoxer` in `PlinkAttackerKind.swift` and `MarbleVoyageGangRun.swift`. `MarbleVoyageModels.swift` pins the first campaign fight, `land0_poi1`, to `.porcupineBoxer`; the rescue roster uses the wave attacker first. The debug fight entry points at the opening fight. Preserve the user's request: **the porcupine is the first enemy on the first level**.

Existing porcupine files:

- `AssetSources/MarbleVoyage/porcupine-boxer/`: original, transparent derivative and provenance. The derivative used image generation for extraction and still needs visual identity/edge QA.
- `abbies.world.ios/abbies.world.ios/Assets.xcassets/world2_plink_gang_porcupineBoxer_idle.imageset/`: bundled idle image.
- `data/dev-asset-library/library.json` and `prototypes/marble-voyage-art/manifest.json`: local registrations.
- `prototypes/marble-voyage-art/portraits/porcupine-boxer.png`: review asset; its folder name is not proof of runtime portrait routing.
- `abbies.world.ios/abbies.world.iosTests/MarbleVoyageTests.swift`: added seed/roster and pose-loading checks, not yet executed.

Current idle semantic ID is `token.plink.gang.porcupineBoxer.idle`. Suggested identifiers for the other four are `crabPincher`, `grasshopperKickboxer`, `armadilloBlocker` and `batDivekicker`, using the existing `world2_plink_gang_<id>_<pose>` / `token.plink.gang.<id>.<pose>` convention after checking for conflicts. These suggestions are not implemented identities.

Placement of the other four has not been fixed by the art pass. Implement their preparation and integration within the game's existing encounter structure; do not infer a request to replace named bosses or rescue targets.

Earlier Swift syntax, asset/provenance checks, design preflight and diff checks passed. **Build, XCTest and simulator appearance remain unverified.** A prior build attempt triggered a macOS warning for `auth0.swift-manifest`; the attempt was stopped. No security settings were changed. Treat resolution of that build environment as a separate builder responsibility, not an art-preparation step. No builds were run during this handoff.

## Story and art direction to carry forward

The full plan proposes that every rescue visibly reconnects part of the world. Prioritize one coherent opening → climb → porcupine fight → rescue → shop → changed-map sequence. Use shared material, palette and silhouette rules across characters, scene dressing, UI and effects. Follow with reusable regional kits and portable boss dressing. This is the production roadmap; these wider changes have not been implemented.

## Retrieval and generation constraints

All five originals are already here; no further download is needed for this pack. For future source retrieval, Evan requires observed URLs and automatic fetching without user Download clicks. The signed-in browser page-asset inventory/bundle workflow successfully retrieved all five originals. A bare CDN fetch can return 403; use the authorized browser asset workflow rather than treating that as permission to bypass access controls.

Evan's Midjourney limit is one image every 30 seconds. For the four-candidate interface, the accepted conservative cadence is at least 120 seconds between submissions. Keep submissions serial and do not run automatic reroll loops.

## Completion report

Update `AGENT_COORDINATION.md` with the prepared derivative paths, actual catalog/semantic IDs, source and output hashes, pose coverage, encounter placement, verified screenshots and executed checks. Explicitly list any remaining anatomy cleanup, provisional pose fallback or blocked runtime verification. The next handoff should make it clear which assets are game ready and which are still concepts.
