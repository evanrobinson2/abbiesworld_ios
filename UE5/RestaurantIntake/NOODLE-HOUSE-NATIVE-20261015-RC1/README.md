# Abby and Ani’s Noodle House

A packaged Windows native technical proof using original artist-made restaurant assets. It is not yet the finished integrated online encounter.

## Play

Run **Play Noodle House.cmd** for three local family chefs. WASD/stick moves, E/A picks up or places, hold F/X works, Q/right shoulder passes, Space/B dashes, P pauses, R restarts. The watch-demo button runs a full automated service. Keyboard controls the first local chef; physical controllers remain unverified.

For a development direct-IP session, run **Host development co-op.cmd**, then run **Join development co-op.cmd** in a second instance or on another machine containing the build. Same-computer address is 127.0.0.1, UDP port 7795. Two separate processes were verified on this computer; another device/LAN/internet/NAT traversal was not. Each connection owns one server-assigned chef slot. This development host explicitly bypasses account admission. Normal remote admission fails closed until the universe session broker is integrated.

## Verified

- Unreal 5.4.4 editor and Windows game builds, cook/package.
- Separate packaged host/client: remote client issued movement, pickup/place, work and serve RPCs; both observed 2 served / 156 points; client received 1,360 snapshots. Server-side demo was disabled for this test.
- Full packaged automated service: 12 served / 1,088 points / zero missed orders.
- 39 native landing/placement gate checks: four-hex region, universe/world/player scoping, duplicates, stale/forged acceptance, decline, move-away, water/out-of-board, reserved entry, overlap, rotation and revisions.
- Four native facing/carry/contact checks; plate/worktop gap 0.6 cm. Actual artist model orientation was inspected in source renders; human appearance review remains pending.
- Admission rejection without the development/proof bypass.
- Final materials recooked with correct linear roughness/metallic samplers. No material shader fallback may pass the final verification script.

## Art and presentation

Three actual Meshy family characters and woodland counter from frozen FOREST-FAIRY-ARTIST-20261015-B01. Noodle bowl, broth pot, garnish group and exterior from frozen NOODLE-HOUSE-20261015-B02. Original raw GLBs and artist provenance remain immutable. Derived FBXs/textures were imported locally; the broth has a small explicitly documented surface cap covering generated triangular artifacts. Neutral ambient cubemap is bundled Unreal engine content. Other kitchen/floor/food stand-ins and feedback sounds are original local technical assets; they are not all final artist production art.

Tickets arrive on the left with deadlines and assembled ingredient states. One bowl contributes to only one ticket’s displayed progress. Pot/chopping/washing, serving, dirty plate returns, pause/restart and local family demo remain functional. Cast models are static; no skeletal rigs/animation, bonk/drop meter, projectile throwing or profile-specific figurine selection is claimed. Some ingredient groups remain illustrative rather than fully separated ingredient meshes. The modular counter includes a baked griddle and needs an art pass for specialized stations.

## Integration pending

The four-hex gate is tested in isolation. `OverlandAdapter/landing-hook.patch` is a concrete review-only hook against recorded source hashes, not applied to the shared AmberVale project. It preserves ordered RouteKeys and emits a candidate only after completed movement. Placement must come from authoritative universe state, not existing coffee coordinates or actor bounds. A dialogue and authorized session broker must follow acceptance.

Shared HTTPS API activation, Supabase migration/connection, authoritative placement registry, server-validated movement receipt/admission, deployed host/relay, profile-to-figurine binding, reconnect/leave lifecycle, durable results/rewards and exact return-to-universe restoration are not integrated. The universe save API is not used as live synchronization. See encounter-session-contract.md. No production online, canonical art promotion or iPad validation is claimed.

## Source

Isolated project: work/RestaurantProof/AbbiesWorld.uproject in the restaurant study. Gameplay is server-owned AAWRestaurantArena; AAWRestaurantMode bootstraps it. Source export is under Source. Module dependencies add Json and JsonUtilities to existing Engine/Slate modules. Source uses ABBIESWORLD_API and /Script/AbbiesWorld paths; another module needs a deliberate migration of export macros and class paths. Do not overwrite shared project config or other owners’ source.
