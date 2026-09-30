# Peglin knowledge map (for PlinkCore)

Interactive map: [peglin-knowledge-map.canvas.tsx](/Users/evanrobinson/.cursor/projects/Users-evanrobinson-abbies-world-ios/canvases/peglin-knowledge-map.canvas.tsx)

Official wiki: https://peglin.wiki.gg/ (v2.0.12)

## What PlinkCore 2.0 borrowed structurally

| Peglin idea | Abbie Plink |
|---|---|
| Orb physics knobs | `fireForce · gravityScale · bounciness · mass · radius` on `OrbKind` |
| World vs orb | World: G, tilt, wall e, drag; orb multiplies/overrides |
| Bounce `v' = v − (1+e)(v·n)n` | Shared `bounceResponse` (laser ≡ live) |
| Crit peg | Yellow — retroactive plink ×2 + powered hits |
| Refresh peg | Green — restores lit blues mid-shot |
| Deck inject into physics | Orb picker (Sparkle / Bounceberry / Pebble / Zipbolt / Puff) |
| Clear objective | Still Peggle oranges (not Peglin HP combat yet) |

Not copied: Peglin content, assets, relics/classes/run map, game binaries.

## Learn order (wiki)

1 Peg board → 2 Orbs → 3 Relics → 4 Status → 5 Classes → 6 Map/shop → 7 Enemies → 8 Events → 9 Core → 10 Cruciball

## Marble Voyage charms (relic *roles* only)

Kid permanent stacks map to Peglin relic categories — not Peglin names/art.
See `docs/minigames/MARBLE_VOYAGE_CHARMS.md` and evidence under `docs/minigames/evidence/`.
