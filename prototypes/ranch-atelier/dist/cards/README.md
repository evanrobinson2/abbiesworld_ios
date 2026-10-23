# Card Forge

Collection-grade game cards from the Ranch models and concept art. One renderer (`forge.mjs`, Canvas 2D in
millimetres) makes the in-game hand cards, the inspect view and the 600 ppi print masters, so they always match.

- Page: `/cards` (pack opening, inspect with tilt and foil, binder, studio zip, home print sheet).
  `?card=abbie` opens one card, `?view=binder` opens the binder, `?set=/cards/other.json` loads another set.
- Headless: `/cards/render.html?ids=a,b&dpi=300&bleed=1&guides=1`.
- Batch: `node tools/card-forge/forge.mjs --out out/cards` writes the print files and runs the Oracle rubric checker
  (`tools/card-rubric/check_card.py`, rubric in `docs/oracle/cards/`).
- New concept-art cut-outs: `python3 tools/card-forge/cutout.py in.jpg out.png` (needs `pip install "rembg[cpu]"`).

## Print spec

63 × 88 mm poker size, 3 mm bleed, 3 mm safe zone, 3 mm corner radius. Masters are 600 ppi sRGB
(1630 × 2221 px with bleed). Finish masks (white = apply) are written per card: `spot_uv`, `cold_foil`, `holofoil`,
`etched_foil`, depending on tier and finish. Each card also gets a rubric manifest (`NNN-id.json`).

## Card spec (`cards.json`)

```json
{ "set": { "id": "ranch", "name": "Ranch · First Harvest", "biome": "ranch" },
  "cards": [{
    "id": "buttercup", "number": 1, "name": "Buttercup",
    "type": "animal",               // animal | building | crop | weather | helper (sets the art-window shape)
    "subtype": "Dairy cow",
    "rarity": "seed",               // seed | sprout | bloom | harvest | sun (growth-stage rarity)
    "cost": 2,
    "stats": [{ "icon": "milk", "value": 2 }],   // at most two, bottom corners
    "rules": "Makes {milk}{milk} each morning.\nNear water: +{heart}",   // {icon} renders an enamel icon
    "flavour": "Shown in the inspect caption, never on the face.",
    "finish": "standard",           // optional: standard | shimmer | golden_hour | frost (defaults by tier)
    "artMode": "model",             // optional: force the 3D model when the card has both
    "biome": "orchard",             // optional backdrop
    "art": { "image": "/cards/art/cow-cut.png", "source": "/cards/art/cow.jpg",
             "model": "/simulation-assets/organics/cow-idle.glb",
             "view": { "yaw": -28, "pitch": 16, "fill": 0.8, "lift": 0.46 } }
  }]
}
```

Icons: coin, milk, heart, egg, wheat, wood, star, apple, paw, sun, water, wool, hammer, bolt.

## Rarity, art style and frame

| Tier | Frame | Art style (rubric art mode) | Default finish |
| --- | --- | --- | --- |
| Seed | painted pine | specimen: subject on paper | standard |
| Sprout | pine with green trim and brass caps | portal: painted ranch world | standard |
| Bloom | lacquer with brass | portal | standard |
| Harvest | gilded with filigree | shadowbox: world, subject, foreground grass | golden hour |
| Sun | borderless, gold window | overlay + pop-out: the subject steps out of the window | shimmer |

## Quality check

Every render returns a grade: **collection** (all checks pass), **playable** (warnings only) or **blocked**.
Checks: name and rules fit at 8 pt or larger, 15 words or fewer on the face, reading level (warning only), PG word
list, known icons, name length, two stats or fewer, everything inside the safe zone, art resolution at the output
ppi, subject centred and sized for the art style, nothing clipped, and pop-out height (5–15% of the card).

Picture sources and the cut-out method are in `provenance.json`. Fonts are Fredoka and Nunito (SIL OFL, in `fonts/`).
