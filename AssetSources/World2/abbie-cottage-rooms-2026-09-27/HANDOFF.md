# Abbie cottage rooms

Approved living room: `living-room-approved.jpeg`, Midjourney upscale ccc49e98-8737-4e99-8acc-55bf4b63abe9 index 0. Bind through existing `poi.abbieTreehouse.interior` after inspecting current loader/catalog; preserve prior image for rollback. Source delivery only, not runtime-bound here.

Keep the large central tabletop clear for the separately approved Marble Voyage book. Place that book as an interactive overlay with coordinates validated against this exact plate and the runtime image transform. Existing baked furnishings remain part of the source; do not pretend they can be moved independently.

Bedroom and playroom: new concepts to match this exact living-room style, pending user approval. No implicit approval from generation or director recommendation. Keep usable empty floors, shelf slots and tabletops for separate decoration assets.

Three later decoration packs: living-room decorations, bedroom decorations, playroom decorations. WAIT until Evan approves the rooms. Then design room-specific items with shared style, consistent perspective, clean separable silhouettes, intended anchors and relative scale. Preserve original plates and derive transparencies separately. No packs generated yet.

## Builder status (2026-09-27)

Runtime bound:
- Catalog: `world2_1005_poi_abbieTreehouse_interior` (full 2464×1856 PNG)
- Semantic: `poi.abbieTreehouse.interior` (Cozy Nook room switcher uses this)
- Prior plates preserved under `rollback/`
- Voyage book overlay seated on the clear coffee table; SF clutter removed
- Bundled plate pinned in `AssetBootstrapService` so stale registry/proxy cannot overwrite

Bedroom / playroom / decoration packs still waiting on Evan approval.

## Approved bedroom — 2026-09-27

`bedroom-approved.jpeg` is the exact rainbow/stars/unicorns upscale afdf50cd-18df-444d-9327-5ea75e94053d index 0. It is approved; this supersedes earlier bedroom pending-approval notes. Use semantic `poi.abbieTreehouse.interior.bedroom`, following the existing interior.<room> convention. Current TreehouseRoomModels only exposes cozyNook/rooftopLookout/fitnessCenter; add a distinct bedroom mapping rather than overwriting those unrelated rooms. Preserve the living-room mapping and builder runtime metadata. Verify camera fit, decoration coordinates and room switching on device. Art source delivered; runtime binding remains pending. Earlier pink/blue bedroom concepts are not approved alternatives. Playroom approval remains separate.

## Approved playroom — 2026-09-27

`playroom-approved.jpeg` is the exact turquoise/tangerine/yellow upscale ff837ebc-71a4-4717-9fac-6b6106ce7328 index 0. It is approved; this supersedes earlier playroom pending-approval notes. Use semantic `poi.abbieTreehouse.interior.playroom`, following the existing interior.<room> convention. Current TreehouseRoomModels only exposes cozyNook/rooftopLookout/fitnessCenter; add a distinct playroom mapping rather than overwriting those unrelated rooms. Preserve the living-room mapping and builder runtime metadata. Verify camera fit, decoration coordinates and room switching on device. Art source delivered; runtime binding remains pending. Living room, bedroom and playroom source plates are now all approved. Decoration packs remain separate assets; no sheet is approved by this room approval.
