# Friendly fair marble entrance

New artwork generated with the built-in image generator for Evan's request to build the cooperative fair unlock puzzle. Exact prompts and SHA-256 hashes are in `provenance.json`. Original files are retained here, with identical copies in the app asset catalogs. The toy retains transparency. These are agent-selected new pictures, not a claim of separate human art approval.

- `fair-puzzle.png` → `fair_marble_backdrop`: warm fair tabletop and rabbit buddy.
- `fair-toy.png` → `fair_toy_portal`: transparent miniature fair entrance in Abbie's playroom.
- `fair_destination` uses the previously approved destination from `../carnival-approved-2026-09-27/destination-approved.jpeg`.
- Marbles reuse Marble Voyage's sparkle, bounceberry, puff, pebble and zipbolt pictures, with color rings. All added icon overlays were removed at Evan’s request.

## Play

Abbie's treehouse → Playroom → Toy Fair. A stable 6×6 board begins with no matches and at least one legal move. Tap a marble, then an adjacent neighbor. Matching three or more clears the pieces; surviving pieces fall and the board refills. Cascades clear automatically. One successful matching turn earns one team star, regardless of cascade size. Child and Pip alternate turns; Pip previews its swap. Ten team stars unlock the fair permanently for the active player via the existing saved progression milestones. One help token per attempt highlights a valid pair without taking the player's turn. Invalid swaps return, cost nothing, and leave it the player's turn. No timer or move limit. Dead boards or giving up end the attempt, and retry creates a fresh board with zero stars and one help token.

The destination displays the approved panoramic fair with normal and six-color marble replay booths. Other carnival attractions from the art queue are not implemented in this change. The modal visit returns to the same playroom; it does not change the global/server world selection. `-launchFairMarbles` is a DEBUG-only direct puzzle preview, without player progression writes.
