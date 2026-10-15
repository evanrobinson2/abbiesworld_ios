# UE5 integration status

UE5 contains frozen, hash-verified workstream intakes. These are staging releases, not yet a single shared playable game. No canonical host project has been assembled or independently packaged by the coordinator.

| Workstream | Current intake | Validation scope | Next integration gate |
| --- | --- | --- | --- |
| Scenery | UE5/SceneryIntake/SCENERY-20261014-RC4 | Producer 109 browser GLB round trips; coordinator payload hashes | Native Moon/Christmas import and visual review; cliff quarantine and reindeer warning |
| Overland | UE5/OverlandIntake/R2 | Sanitized native editor preview, dependency closure, two rendered styles | Runtime controls/UI/progression, material warnings, appearance review and packaged performance |
| Map signals | UE5/SignalsIntake/OVERLAND-SIGNALS-20261015-RC1 | Catalogs/browser reference and payload hashes | Real state/turn events, native renderer and POI interactions |
| Restaurant | UE5/RestaurantIntake/RC2 | Original source intake; producer private calibration proof | Original Forest Fairy Burger Joint art, clean-project compile/runtime; ticket/bonk work deferred |
| Potion Meadow | UE5/PotionMeadowIntake/v0.2.0 plus v0.3.0-delta | Producer Windows packaged tests and 3000 board checks; coordinator payload hashes | Apply three headers to fresh base, host portal/return/reward binding and shared-style review |

All workstreams still need actual iOS/Metal/touch validation. Human visual approval is separate from technical checks. Native Windows success and browser frame rates do not establish iPad readiness.

## Host assembly contract

Retain the AbbiesWorld runtime module for existing Potion Meadow class references. Preserve /Game/PotionMeadow, /Game/AbbiesRestaurant and /Game/AbbiesWorld package paths on initial assembly. Review shared Build.cs, startup map, menu and cook changes together. Never overwrite parent configuration with standalone test settings. Keep static native Overland scenes and browser-only features labeled by actual implementation status.

See COOPERATION.md and each intake's integration contract/INTAKE.md for ownership, dependencies and warnings. Earlier releases are immutable historical evidence; changes belong in a working project or new release.

## Restaurant art correction

Evan rejected the procedural family figures. Do not promote outputs/forest-fairy-originals or FOREST-FAIRY-20261015-RC1 as production art; they are rejected technical stand-ins with no appearance approval. They have not been intaken into this branch. The 3D Artist owns the actual production/handoff for unicorn Abbie, fox Daddy, rainbow-glitter snail Mommy and the woodland burger counter. Wait for the artist-owned handoff and review before asset release. Restaurant RC1/RC2 gameplay source remains accepted for source intake only; no final art approval is implied.

## Noodle House staging dependencies

Restaurant owner reports the current direction as Abby and Ani's Noodle House, a cooperative encounter entered after a completed landing within a placed four-hex mega tile. This is reported steering from a separate voice chat; no canonical promotion or appearance approval is established here.

Reported isolated proof: replicated server-owned encounter state, per-controller input, separate packaged host/client cooking test (two dishes, 156 points), 1360 client snapshots and 39 landing/placement checks. These are producer reports, not independently replayed coordinator tests. Final visual recook and a frozen handoff remain pending.

Required before production integration:
- Shared API/Supabase session broker and authenticated encounter admission. Current PreLogin fails closed unless a development/proof flag is set.
- Authoritative placed-mega-tile registry and completed-landing callback from Overland; preserve the four-hex boundary and prevent premature entry.
- Reviewed encounter lifecycle adapter, return path and ownership of replicated state, session cleanup and rewards.
- Final native visual QA, original asset/provenance audit and human appearance review. Exterior exact four-hex fit and broth artifact review remain tracked until resolved.

Adapter proposal is local restaurant output noodle-house-multiplayer/encounter-session-contract.md, awaiting frozen handoff. Existing artist B01 and Noodle House B02 assets are staging candidates. Rejected procedural family assets remain excluded. No production online or iOS readiness claim follows from the isolated host/client proof.

## Accepted Noodle House technical archive

UE5/RestaurantIntake/NOODLE-HOUSE-NATIVE-20261015-RC1 now holds the frozen technical review source, 120 native assets, artist provenance, contract, evidence and unapplied adapter. All 210 producer payload hashes were verified against staged Git blobs. This is not an approved canonical runtime or final art release. Earlier Restaurant RC1/RC2 and the rejected procedural family decision remain preserved. Production online dependencies above remain open; review the new INTAKE.md before integration.

Latest Potion Meadow archive is v0.4.0-delta (apply after earlier deltas); human visual and parent/device approval remain pending. The earlier table names historical bases and must not be interpreted as final gameplay acceptance.
