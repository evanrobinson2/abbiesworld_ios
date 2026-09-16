# Imagination Atelier — Asset Carve Pipeline

Carvable / dragable ingredient + UI tiles for the Character Studio / Imagination Atelier minigame.

## Layout

```
sheets/           labeled source Midjourney sheets (P1.x, P3.x)
sheet_manifest.json
scripts/carve_atelier_assets.py
output/           carved transparent PNGs + catalog.json + previews
```

## Run

```bash
cd experiments/imagination_atelier
python3 scripts/carve_atelier_assets.py            # carve all → output/
python3 scripts/carve_atelier_assets.py --install  # also write Assets.xcassets
python3 scripts/carve_atelier_assets.py --sheet P3.1_baseCreatures_vA
```

Canonical tiles install as `world2_atelier_<name>` imagesets.

## Categories in this drop

| Prompt | Category | Status |
|--------|----------|--------|
| P1.1 | `ui.categoryButton` | carved |
| P1.2 | `ui.slotState` | carved |
| P1.3 | `ui.actionControl` | carved |
| P3.1 | `ingredient.creature` | carved |
| P3.3 | `ingredient.headwear` | carved |
| P3.4 | `ingredient.handheld.adventure` | carved |
| P3.6 | `ingredient.handheld.fantasy` | carved (ignore baked sparkles) |
| P3.7 | runtime particles | `World2AtelierParticleField` — not Midjourney plates |
| P0.1–P0.3, P1.4, P3.2, P3.5, P3.8 | — | still needed as sheets |

## Particles (P3.7)

Creation effects are generated in SwiftUI (`Views/World2/ArtGarden/World2AtelierParticleField.swift`).
Open Character Studio → **Effects** to scrub presets (spirals, smoke, ribbons, stars, rings, bubbles, confetti, reveal aura, creation chamber).
Handheld icons can take `.itemAura` at runtime instead of baked Midjourney sparkles.