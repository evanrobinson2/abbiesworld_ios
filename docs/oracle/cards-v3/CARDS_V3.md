# AW-STUDY-0014 - Cards v3: Print-Ready Beautiful Artifacts

Oracle study, 2026-10-23. Requested by Evan: "do a beautification study on the cards. right now they read as.. chinese
asset farm. I'd like them to read as bespoke works of art", "and they are also out of place with the scene itself", and
then "propose new card study called v3: print ready beautiful artifacts". Builds on AW-STUDY-0002 (`docs/oracle/cards/`,
`CARD_STUDY.md` and `CARD_ART.md`) and the Card Forge (`prototypes/ranch-atelier/dist/cards/forge.mjs`).

Review page with picks and notes for every card: https://claude.ai/artifact/DXMqNPNe2399VBwqCKS8x3

## Why today's cards read as an asset farm

Measured on the live `/sandbox` hand (same camera, `tools/card-beauty/capture.mjs`):

1. **Stock parts, not a made object.** The face is assembled from generic kit pieces every mobile card game ships: a
   tiered frame, a ribbon banner across the top, an enamel token in the corner, a gem on the window's lower edge. None
   of them is about the Ranch. Kit parts are what an asset farm sells, so the eye reads "kit".
2. **The frame argues with the picture.** About a third of the face is frame (rubric `frame_share` 34%). The tile's
   cartoon, which is the only bespoke thing on the card, is shrunk into a window.
3. **It is not made of the world.** The scene is a warm diorama: sand-coloured air (`#e2cbb0` at 7 am), an olive and
   green tile top, a cut of orange earth at its edge (`#c36704`). The cards are sky-blue windows in a pale frame,
   lit by nothing. They sit on the screen, not in the place.
4. **Nothing says one of a kind.** No number, no edition, no maker's mark. Collectibles feel precious because they are
   counted and signed.

## What makes a card feel hand-made and precious

From the Game Oracle (card signatures, style only, never expression) and the best physical and digital cards:

| Source | What they do | What we take (style) |
| --- | --- | --- |
| Wingspan (Natalia Rojas, Ana María Martínez Jaramillo) | Hand-drawn birds on a quiet cream ground; the art is research, 7 to 20 hours a bird | The subject alone on a calm ground. Restraint is the luxury |
| Pokémon special illustration rares (Komayama, Kagemaru Himeno and others) | The creature in its own place, full art, a moment of daily life | The card shows the place, not a token for it |
| Magic: The Gathering showcase and borderless treatments | One card, several treatments; the treatment is the collectible | Treatments as an axis, separate from rarity |
| Marvel Snap frame breaks and 3D variants | The subject steps out of the card; parallax under the finger | The die-cut: the tile stands above its card |
| Balatro | Cards are never still: idle sway, tilt toward the cursor, lift on hover, spring on deal | The held card always breathes |
| Inscryption | Cards are props in a room, lit by the room | The card is lit by the world it lives in |
| Art prints and letterpress | Edition numbers, a signature, a paper margin | `No. 1 of 4`, the AW mark, a cream sheet |
| Premium print (card study `premium-physical`) | Matte stock, spot gloss only on the art, a visible core edge | Paper shader: matte paper, varnished picture, core edge |

The common thread: a precious card is **one picture, one place, counted, on real paper**. Everything else is quiet.

## Three directions

All three keep Evan's rules: no fake materials printed on the face (no wood grain, brass, parchment, bevels, gradients
or grain), the tile's in-game cartoon as the art, no meaningless icons, Roboto and "AW" (design canon). They drop the
ribbon, the token and the gem. Renderer: `dist/cards/v3/face.mjs`, in millimetres like Card Forge, so the hand card,
the 4x held card and the 600 ppi print master are the same drawing.

- **Slice.** The card is cut from the board. The cartoon stands in the world's own air, over the same orange earth
  band the diorama shows at its edge, with a grass lip and one deeper stratum. The name is set into the earth.
  In the game the air is the scene's live air colour, so the hand turns gold at dusk and dark at night with the world.
- **Artist's proof.** A cream sheet, a printed window in the place's colours, one hairline, the name, and an edition
  line: `No. 1 of 4 · First Light`, the AW mark in the place's colour. Precious through restraint, like a gallery
  print.
- **Die-cut.** The card's top edge is cut around the place: the tile stands on its card and breaks out of it, the
  body is the place's own colour (barn red, garden green, pond teal, moon navy), the earth band below. Each card has
  its own silhouette, so you know the Ranch from across the table.

## The held card (tap)

`dist/cards/v3/paper.mjs`. Tap a card and it flies from the hand to about 4x, centred, sharp (the face is drawn at the
pixels it is seen at, at least 600 ppi). Nothing dims, blurs or masks the world behind it. The paper is in the shader,
never on the face:

- card stock about 0.4 mm thick, with a cream core edge that follows the die line;
- matte paper with a fine tooth (a bump map only visible up close) and a soft fibre sheen;
- spot gloss: a clear varnish over the art only, so a window-shaped highlight slides across the picture, not the
  paper, as you tilt;
- tilt toward the finger or the phone's attitude, an idle sway when untouched, a spring settle on open.

One obvious button under it turns the card over. Its back holds the tile's settings as card facets
(`facets.mjs`): Size, Layout, Make it yours, Backdrop, each a small card of the same stock that opens that section of
the tile options.

## The hand (hold, drag, drop)

Hold and drag picks the card up; dropping it over a hex places the tile. This is the tile chooser's existing carry,
unchanged. A plain tap, which used to arm the carry, now opens the held card instead.

## Print-ready

Same drawing, any size: `renderFace(spec, {style, dpi: 600, bleed: true})` gives a 63 x 88 mm master with 3 mm bleed;
the gloss regions are the spot UV mask. The die-cut style's silhouette is its alpha, which is the die line.

**Art resolution.** The v2 tile cartoons (`simulations/assets/tile-cards/*.webp`) are 720 px wide, about 2x
upscaled at 4x on a phone. Cards v3 re-renders them with `tools/hand-card-art` at 4096 px (`node render-cartoon.cjs
<out> 4096`), crops to the drawing and fits 1600 px: `simulations/assets/tile-cards-hd/`. The hand keeps the light 720 px
art; the held card and print masters use the 1600 px art (about 650 ppi across the card's width).

## Trying it

Local only until Evan picks: `/sandbox?cards=slice` (or `print`, `diecut`) turns Cards v3 on for that device,
`?cards=v2` turns it off. `/cards/v3/` is a lab page with the hand over a still of the scene.

Tools: `tools/card-beauty/` (`capture.mjs` today's hand and the bare scene, `faces.mjs` every face, `inplace.mjs` each
direction in the live sandbox at the same camera and hour plus held and turned-over shots, `lab-shot.mjs`,
`build_review.py` the review page). Midjourney search and proofs: `tools/midjourney/outputs/card-beauty-0014/`.

## Sources

- Wingspan's artists and process: https://www.greenhookgames.com/wingspan-artists/
- Balatro card feel (hover lift, tilt, foil sweep, constant micro-motion): https://blakecrosley.com/guides/design/balatro
- AW-STUDY-0002 card signatures and rubric: `docs/oracle/cards/card-signatures.json`, `card-rubric.json`
