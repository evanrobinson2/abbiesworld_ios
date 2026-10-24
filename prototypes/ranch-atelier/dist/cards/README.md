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
    "biome": "orchard",             // optional backdrop: ranch | orchard | garden | meadow | dusk | moon
    "pattern": "barn-boards",       // optional frame pattern (see The look)
    "art": { "image": "/cards/art/cow-cut.png", "source": "/cards/art/cow.jpg",
             "status": "final",     // an image ships only when someone approved it; otherwise PRELIMINARY
             "outline": true,       // ink silhouette line round a cut-out or model (default on)
             "model": "/simulation-assets/organics/cow-idle.glb",
             "view": { "yaw": -28, "pitch": 16, "fill": 0.8, "lift": 0.46 } }
  }]
}
```

Icons: coin, milk, heart, egg, wheat, wood, star, apple, paw, sun, water, wool, hammer, bolt.

## Rarity, art style and frame

| Tier | Frame colour | Art style (rubric art mode) | Default finish |
| --- | --- | --- | --- |
| Seed | wheat | specimen: subject on a flat plate | standard |
| Sprout | leaf green | portal: flat cel world | standard |
| Bloom | sky blue | portal | standard |
| Harvest | gold with plum line | shadowbox: world, subject, foreground grass | golden hour |
| Sun | borderless, gold window | overlay + pop-out: the subject steps out of the window | shimmer |

## The look

Cel-shaded, never fake materials (Evan, 2026-10-23): flat colour, ink lines, one hard highlight on discs, no wood
grain, metal, parchment, bevels, filigree, gradients, blur or grain. The frame carries one quiet pattern that says
where the card lives: `barn-boards` (ranch), `sprout-rows` (garden, crops), `meadow-flowers` (meadow), `stars`
(moon), `waves`, `cobbles` or `plain`. Order: `spec.pattern`, then `spec.tile` (or an id like `tile-meadow`), then
crop cards get sprout rows, then the biome, then barn boards.

Model art gets a cel render pass: toon materials with a three-step ramp, flat ambient plus one key light, ink lines
where two parts meet, an ink silhouette and a crisp contact shadow. Cut-outs get the same ink silhouette.

## The ship bar

A card ships only when no check fails, the art is sharp enough for that output (300 ppi in print, the output's ppi
in game), and the art is ours to ship: a game model rendered here, or an image with `art.status: "final"`. Anything
else renders with a **PRELIMINARY · idea only** label across the art, `qc.ship` is false and `qc.preliminary` says
why. Pass `allowPreliminary: false` to `renderCard` to throw instead.

## Quality check

Every render returns a grade and `qc.ship` (see The ship bar): **collection** (all checks pass), **playable** (warnings only) or **blocked**.
Checks: name and rules fit at 8 pt or larger, 15 words or fewer on the face, reading level (warning only), PG word
list, known icons, name length, two stats or fewer, everything inside the safe zone, art resolution at the output
ppi, subject centred and sized for the art style, nothing clipped, and pop-out height (5–15% of the card).

`library/` holds web previews listed in /explore (Cards). Picture sources and the cut-out method are in `provenance.json`. Fonts are Fredoka and Nunito (SIL OFL, in `fonts/`).

## World event cards

`type: "event"` (set `events.json`, page `/cards/?set=/cards/events.json`) is for things that happen to the whole world:
weather, time of day, sky and space. They are told apart from tile cards at a glance: a night-blue frame with rays
(pattern `rays`), a burst-edged art window, and a **WORLD EVENT** banner in the event's own `color`. Events carry no
cost; the bottom-left stat is what the event gives. Art is `artMode: "scene"`: the forge paints the sky, ground and
weather in flat cel colour from `spec.scene` (`paint-rain`, `meteorite`, `rain`, `storm`, `snow`, `rainbow`, `dawn`,
`night`, `fog`, `aurora`), and an optional `art.model` (the meteorite uses the in-game GLB) stands in it. Scene art is
ours by construction, so it needs no `art.status`.

In the game, `showEventCard(id)` from `event-card.mjs` slides the card in from the right edge instead of a side panel.
