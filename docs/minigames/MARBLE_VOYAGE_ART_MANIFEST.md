# Marble Voyage — Art Manifest

Voyage does **not** invent new Midjourney plates. It reuses Peglin Edition bundled art.

## Wiring (`MarbleVoyageArt.swift`)

| Use | Semantic ID | Bundle catalog |
| --- | --- | --- |
| Title + chart backdrop | `map.peglin.crashLand` | `world2_map_peglin_crashLand` |
| Bramble Spirit fights | `map.peglin.bramble` | `world2_map_peglin_bramble` |
| Fox Spirit fights | `map.peglin.foxLand` | `world2_map_peglin_foxLand` |
| Stag / boss fights | `map.peglin.stagLand` | `world2_map_peglin_stagLand` |
| Event nodes | SF Symbols only | — |
| Player portrait | Abbie happy | `world2_peglin_abbie_happy` |
| Enemy portraits | `*.happy` sheets | `world2_peglin_{bramble,fox,stag}_happy` |
| Deck marbles | `orb.peglin.*` | `world2_orb_peglin_*` |
| SFX | Kenney CC0 | `Resources/SFX/Plink` |

**In set but not voyage nodes yet:** `map.peglin.forgottenRealm`.

## Review app

**Live gallery:** https://marble-voyage-art.vercel.app  
Source: `prototypes/marble-voyage-art/` · JSON: `manifest.json`

Style lock (from Peglin manifest): hand-built fantasy diorama · three-quarter isometric · cel-shaded · painterly · miniature/tilt-shift · kid-safe warmth.
