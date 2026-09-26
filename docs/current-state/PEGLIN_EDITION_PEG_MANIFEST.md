# Peglin Edition — Peg Asset Manifest (parameterized)

First-class board tokens, not placeholder circles.

**Doctrine:** `PEG = base form + material + functional emblem + shading package + state overlays`

**Shared render brief (append to every prompt):**

> premium fantasy game asset, polished board token, front-facing or slight three-quarter view, centered isolated object, strong silhouette, beautifully shaded, soft cel-shaded rendering with painterly highlights, crisp outline control, subtle inner glow, magical children’s adventure aesthetic, tactile material definition, readable at small size, cute but premium, no text, transparent background

**Not:** flat icons · mobile buttons · raw SVG placeholders · muddy blobs · color-swapped circles only.

---

## Construction layers

| # | Layer | Purpose |
|---|---|---|
| 1 | Outer silhouette | Shape family (seed / flower-disc / berry / puffball / crystal / shell) |
| 2 | Body material | seed-stone · berry skin · crystal · dew-glass · shell mineral · bomb-pod husk |
| 3 | Inner core / emblem | Mechanic read (star / swirl / coin / fuse / shield / sleepy) |
| 4 | Edge rim | Collision readability on varied boards |
| 5 | Highlight + shadow | Top-left light, underside shadow, specular |
| 6 | Functional FX | Tiny accent (spark / dew / crackle / bubble) |
| 7 | State overlay | activated · spent · durable · upgraded · shielded · slimed · corrupted · temporary |

---

## Parameter model (`PegSpec`)

```
base_family:     seed-stone | flower-disc | berry-medallion | bomb-pod | crystal-shell
function:        standard | crit | refresh | coin | bomb | shield | dull | hazard
material:        stone | glossy-organic | crystal | dew-glass | metallic-organic | matte-husk
silhouette_accent: none | star | spiral | coin-disc | fuse | shell | fracture
primary_palette: [c1, c2, c3]
inner_core_glow: low | medium | high
rim_style:       dark-rim | light-rim | shell-rim | glow-rim
overlay:         none | durable | upgraded | shielded | slimed | rubber | poison | healing | lightning | corruption
state:           idle | active | hit | spent | primed
```

**Master template:**

> single premium fantasy peg asset for a children’s adventure game, a {function} peg designed as a {base_family}, with {material} materials, a {silhouette_accent} motif, {primary_palette} palette, softly glowing magical core, strong clean silhouette, front-facing isolated board token, richly shaded first-class game asset, soft cel-shaded painterly rendering, subtle outline, beautiful highlights and shadows, readable at small size, transparent background, no text

---

## Canonical families → semantic IDs

Map to runtime `PegKind` now (`blue` / `orange` / `crit` / `refresh`) and extend later.

| Family | Role | Semantic ID | Plink map (today) | Shape | Material | Emblem | Palette |
|---|---|---|---|---|---|---|---|
| Meadow Peg | standard | `peg.peglin.meadow` | → `blue` | organic round seed | seed-mineral | pale green core | mint · cream · soft green |
| Crit Peg | critical | `peg.peglin.crit` | → `crit` | flower-disc + star | flower-stone | golden star | coral · rose · magenta · gold |
| Refresh Peg | restore | `peg.peglin.refresh` | → `refresh` | dew blossom | dew-glass | spiral water-drop | cyan · aqua · mint · white |
| Coin Peg | gold | `peg.peglin.coin` | future | berry medallion | metallic-organic | embossed coin | gold · amber · honey |
| Bomb Peg | explosive | `peg.peglin.bomb` | future | puffball pod + fuse | matte husk | ember core | charcoal · plum · ember · cream |
| Shield Peg | protected | `peg.peglin.shield` | future | seed in shell bubble | crystal shell | pale blue core | ice cyan · blue-white · violet |
| Dull Peg | drag / sleepy | `peg.peglin.dull` | future | heavier seed | matte stone | dim center | gray · sage · beige |
| Hazard Peg | corruption | `peg.peglin.hazard` | future | fractured seed | corrupted crystal | cracks / thorns | teal-violet · toxic cyan |

**Orange clear-target** (Peggle loop we still use): treat as meadow family with warm orange body → `peg.peglin.orange` (same construction, coral-amber palette).

---

## States & overlays (parameterized — do not redraw whole species)

| Overlay / state | Visual add |
|---|---|
| durable | segmented outer ring, 2–3 shell pips, thicker rim |
| upgraded | brighter core, stronger halo, tiny sparkles |
| spent / hit | dimmed core, hollowed center, cracked shell |
| primed (bomb) | brighter fuse, ember bloom |
| slimed | translucent jelly shell + drips + tint |
| rubber | elastic bulge rim |
| poison | bubble accents |
| healing | soft green glimmer |
| lightning | tiny crackle |
| corruption | vines / fractures |
| temporary | shimmer ring |

Bomb needs at least: `idle` · `primed` · `spent`.

---

## Sheet generation order

1. **Base 8 + orange** — one sheet, solid muted teal or transparent-capable dark plate, 3×3 or 3×4 grid, isolated, no overlap  
2. **State overlays sheet** — durable / upgraded / spent / slimed / primed on a meadow + crit sample  
3. Carve → pick → SVG (silhouette path matches collider: circle / capsule / rounded disc)  
4. Bind `PegNode` skins by `PegKind` + future kinds

---

## Copy-paste prompt pack

### Shared style lock (prepend or append)

> Cohesive asset pack for a whimsical modern family adventure game. Stylized 3D-inspired art, chunky readable forms, soft cel shading, bright cheerful palette, toy-like polish, clean silhouettes, simplified detail for game production. Child-friendly, polished, readable at small size, isolated assets, transparent or solid muted teal background, no characters, no text, no UI.

### Sheet brief (all families)

> {style lock}. Sheet of 9 premium fantasy peg board tokens in a tidy grid: meadow seed-stone, orange clear-target seed, crit starflower, refresh dew blossom, coin golden berry medallion, bomb puffball pod with fuse, shield crystal-shell seed, dull sleepy stone seed, corruption hazard seed. Each is a front-facing isolated micro-collectible peg, richly shaded, strong silhouette, soft cel-shaded painterly rendering, readable at ~48–64px.

### Per-family singles

**Meadow / standard**

> single premium fantasy peg asset, standard meadow peg, a polished magical seed-stone bead with a softly glowing pale green core, rounded organic silhouette, mint and cream coloration, subtle magical sheen, front-facing isolated board token, richly shaded, crisp outline, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Orange (clear target)**

> single premium fantasy peg asset, orange clear-target peg, a polished magical seed-stone bead with a warm coral-amber body and glowing honey core, rounded organic silhouette, front-facing isolated board token, richly shaded, crisp outline, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Crit**

> single premium fantasy peg asset, critical peg, a magical rounded board token styled like a starflower, with a bright coral-magenta body and a glowing golden star-shaped floral core, polished and richly shaded, elegant fantasy material, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Refresh**

> single premium fantasy peg asset, refresh peg, a magical rounded board token styled like a dew blossom, with a translucent aqua-cyan body and a luminous spiral water-drop floral core, polished and beautifully shaded, fresh and restorative, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Coin**

> single premium fantasy peg asset, coin peg, a magical rounded board token styled like a golden berry medallion, rich amber-gold body with an embossed luminous coin-like core, polished metallic-organic surface, premium shading, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Bomb (idle)**

> single premium fantasy peg asset, bomb peg idle, a magical rounded puffball bomb-pod with a small fuse stem, dark husk body, glowing ember-orange ignition core, premium fantasy board token, richly shaded, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Shield**

> single premium fantasy peg asset, shield peg, a magical seed-like board token enclosed in a translucent crystal shell, glowing pale blue core, elegant protective outer casing, premium shading, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Dull**

> single premium fantasy peg asset, dull peg, a rounded magical seed-stone token with a muted dusty gray-sage body and a dim sleepy center, matte material, low-energy appearance, still beautifully rendered and premium, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

**Hazard / corruption**

> single premium fantasy peg asset, corruption peg, a magical rounded seed-like board token corrupted by glowing cracks and thorny crystal overgrowth, teal-violet and toxic cyan palette, fractured but beautiful, premium fantasy shading, crisp silhouette, front-facing isolated asset, soft cel-shaded painterly rendering, readable at small size, transparent background, no text

---

## Runtime note

Today `PegNode` uses circular colliders for `blue` / `orange` / `crit` / `refresh`. Skins swap first; shape-matched physics (capsule / disc) comes after carved silhouettes prove readable in-flight.

**Mental shift:** micro collectibles that happen to be gameplay pegs.
