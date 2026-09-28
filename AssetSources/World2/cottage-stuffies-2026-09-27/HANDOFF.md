# Approved cottage stuffies — builder handoff

Evan approved candidates 2 and 4 of Midjourney job 897e3259-3878-40c6-bcf0-ba2dad75a636 for game integration. Exact original JPEGs are preserved with hashes in provenance.json. Both inspected at 1024 × 1024.

Sheet 2 has nine toys, row-major: lavender dragon, strawberry frog, golden round creature, teal winged bunny creature, moth, pajama bear, seated rainbow dog, long rainbow dog, shaggy unicorn puppy. Sheet 4 has six: lavender dragon, strawberry frog, sleepy moth, pajama bear, rainbow dog, unicorn puppy. Preserve both approved sets as distinct variants.

## Builder work
- Extract all 15 individual silhouettes; preserve ears, wings, fluff and tails. Remove cream background AND all ground/contact shadows. No overlap or background rectangles in game.
- Inspect edges against light and dark backgrounds. Use transparent PNGs with consistent padding and bottom-center anchors.
- Extend the existing CozyRoomKit placeable-room-prop pipeline and cozy_room_asset_manifest, not a parallel catalog. See AssetSources/CozyRoomKit/HANDOFF.md. Add individual canonical IDs to the request as assets are carved.
- Make toys available through the cottage decoration tray; keep the source sheet out of the full-screen room plate mapping.
- Verify placement, scaling, persistence and reload in the actual cottage; attach an in-game screenshot before closing integration.

Source delivery complete. Extraction, imagesets, runtime binding and in-game verification remain builder work. No generated replacement artwork is authorized or necessary.
