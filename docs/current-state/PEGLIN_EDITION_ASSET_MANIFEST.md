# Peglin Edition — 2D Asset Manifest (autogen)

Feed this to the Game Asset / Media Drop pipeline. Semantic IDs are the source of truth.

**Game key:** `peglin-edition`  
**Style lock:** hand-built fantasy diorama · three-quarter isometric · cel-shaded · painterly · miniature/tilt-shift · scenery-is-the-machine · kid-safe Abbie's World warmth

**Progression:** Crash World → Bramble → Fox Land → Stag Land → Forgotten Realm (free power-up)

---

## Scene plates (raster · full-bleed iPad)

| Semantic ID | Status | Notes |
|---|---|---|
| `map.peglin.crashLand` | **bundled v1** | Crash crater hub — wrecked craft, mushrooms, crystal pool |
| `map.peglin.bramble` | **bundled v1** | Rabbit-fawn clover bowl + burrow pockets |
| `map.peglin.foxLand` | **bundled v1** | Kitsune grove, pink trees, lanterns |
| `map.peglin.stagLand` | **bundled v1** | Crystal-antler stag, ley stones |
| `map.peglin.forgottenRealm` | **bundled v1** | Ruins + pedestal orb (power-up) |

Local drop: `AssetSources/World2/user-supplied/peglin/v1/`  
Bundle names: `world2_map_peglin_<land>`

## Crash World POI shells (still need plates)

| Semantic ID | Purpose |
|---|---|
| `poi.peglin.wreck.exterior` / `.interior` | Half-buried craft |
| `poi.peglin.battleClearing.exterior` | Arena mouth |
| `poi.peglin.salvageWorkshop.exterior` / `.interior` | Lean-to workshop |
| `poi.peglin.brokenPath.exterior` | Path marker (also reused on later lands) |

## Landmark tokens (SVG · map markers)

Runtime draws SwiftUI vector pins; pipeline SVGs live under `AssetSources/World2/user-supplied/peglin/v1/tokens/`.

| Semantic ID | Use |
|---|---|
| `token.peglin.wreck` | Crash World wreck |
| `token.peglin.battle` | Crash battle clearing |
| `token.peglin.workshop` | Salvage workshop |
| `token.peglin.path` / `travel` | Path markers |
| `token.peglin.challenge` | Before Bramble / Fox / Stag guardians |
| `token.peglin.orb` | Forgotten Realm power-up |

Tokens sit **in front of** baked-in creatures (`y ≈ 0.64`). Creatures stay in the plate art.

## Abbie (shipped)

| Use | Catalog |
|---|---|
| Map + fight body | `world2_peglin_abbie_map` |
| Portrait happy | `world2_peglin_abbie_happy` |
| Portrait sneaky_wink | `world2_peglin_abbie_sneaky_wink` |
| Portrait hurt | `world2_peglin_abbie_hurt` |
| Portrait hurt_grim / hurt_angry | extras for beats |

## Enemy sheets (5 states each)

Canonical states: `idle` · `happy` · `sneaky_wink` (winking) · `hurt` · `defeated`

| Kind | Status |
|---|---|
| `brambleSpirit` (rabbit / hare) | **shipped** — `world2_peglin_bramble_*` |
| `foxSpirit` (fox) | **shipped** — `world2_peglin_fox_*` |
| `stagSpirit` (stag) | **shipped** — `world2_peglin_stag_*` |

```
enemy.peglin.<kind>.idle
enemy.peglin.<kind>.happy
enemy.peglin.<kind>.sneaky_wink
enemy.peglin.<kind>.hurt
enemy.peglin.<kind>.defeated
```

## Landmark tokens (SVG · map markers)

| Semantic ID | Kind |
|---|---|
| `peg.peglin.meadow` / `orange` / `crit` / `refresh` (+ coin · bomb · shield · dull · hazard) | **specced** — see `PEGLIN_EDITION_PEG_MANIFEST.md` |
| `orb.peglin.sparkle` / `bounceberry` / `pebble` / `zipbolt` / `puff` | **shipped** — carved sheet + SVG skins; physics = circle |
| `fx.peglin.aimDash` / `impactStar` / `critFlash` | SVG accents |

## Autogen batch order

1. Crash POI exteriors / interiors (wreck, battle, workshop, path)
2. Register bundled land plates to Game Asset API under same semantic IDs
3. SVG peg/orb set

When Evan drops images, register under these IDs then bind via Studio MCP — do not leave CDN URLs as source of truth.
