# What makes a great game card

Oracle study, 2026-10-22. Requested by Evan ("launch a deep independent study" on what makes a great visual card)
for the Collectible card generator: AAA, collection-grade cards that work printed and in game, for kids in Abbie's
World.

Files in this folder:

- `CARD_STUDY.md` (this file): what the best card games do, what we take, the Abbie's World card spec, and the
  rubric in prose.
- `card-rubric.json`: the rubric as data. Every check has an id, a threshold, a weight, a measuring method and a
  `source` from the identity schema's enum. Gates must pass; the rest scores out of 100.
- `card-signatures.json`: per-game card signatures in the identity schema's `signature` shape, each sorted into
  `style` (we may learn from it) or `expression` (we never copy it).
- `tools/card-rubric/check_card.py`: a reference checker for the automatable checks (geometry, resolution, safe
  zone, text size, contrast, numeral height, art share, saliency, frame material, collector line, rarity colours under
  colour blindness). VLM and in-game checks are listed for the generator to run.
- `tools/card-rubric/sample_card.py`: renders a reference card plus manifest to exercise the checker.

Visual page with drawn, interactive examples: https://claude.ai/artifact/8tbjVFmMrY4B2RCM3SWLXW (source:
`card-study.html` in this folder).

**Confidence.** Print numbers (63 x 88 mm, 3 mm bleed, 300/600 ppi, CMYK) are industry standard and checked against
printer specs. Game observations are from the public record (wikis, developer notes) and prior knowledge; the
millisecond timings for "juice" are estimates from footage memory, marked `estimate` in the JSON, and the generator
thread should measure them on capture before treating them as fact. Nothing here copies any game's art, frames,
fonts or text; the ledger in `card-signatures.json` says what is style and what is expression.

## The short version

1. **A great card is an object first and a layout second.** The cards people keep (Hearthstone golden, Snap
   splits, Pokémon special illustration rares, Magic borderless foils) all feel like a thing with thickness,
   material and light. Flat UI rectangles read as a website, which Evan hates.
2. **The art is the card; the frame is a stage.** Every modern game moved toward more art and less frame: Magic
   added borderless and extended art, Pokémon added full-art and illustration rares, Snap and Gwent are 85 to 100
   per cent art. For kids, art should be 50 to 65 per cent of a standard card face and 100 per cent of a top-tier one.
3. **Cards have levels of detail.** Every digital card game shows a different card at each size: inspect (all text),
   hand (art, name, cost, stats), board (art, cost, one stat, rarity). Rules text only has to be readable at inspect
   size. This is the single biggest readability lesson, and the one most generators get wrong.
4. **A cost and at most two stats on the face.** Snap shows just cost and power; Hearthstone cost, attack and
   health; Pokémon HP and damage. Numbers are big, chunky, outlined and live in fixed corners. Everything else is an icon or lives on inspect.
5. **Rarity is triple-coded and told before it is shown.** Colour plus shape plus finish, so it survives colour
   blindness and a 64 px thumbnail. Hearthstone's pack glow and Pokémon's pack-tear both let you know rarity before
   the flip; the anticipation is half the joy.
6. **Top tiers change the frame, not just the colour.** Frame breaks, borderless, full art, animated art,
   foil. A legendary should be recognisable from across the room by its silhouette and light.
7. **Juice is physics and sound, timed in hundreds of milliseconds.** Draw in about 300 ms with a small overshoot,
   tilt toward the finger, a specular highlight that moves, a reveal whose wait scales with rarity, a sound for
   every motion.
8. **Collectibility is metadata too.** A set symbol, a number out of a total, an artist or maker line, a variant
   name. Kids collect complete sets; give them something to complete.

## The games

Each entry: what the card face does, what we take (style), and what we leave (expression).

### Magic: The Gathering (Wizards of the Coast, 1993 to now)

- **Layout.** Top to bottom: name bar with mana cost at top right, art window (about 43 per cent of the face), type
  line with set symbol at right, rules text box, power/toughness box at bottom right, collector line (number,
  rarity letter, set code, language, artist) at bottom left on black. The 2014 (M15) frame thinned the border by
  almost a millimetre all round and added a holofoil authenticity stamp at bottom centre of rares and mythics.
- **Hierarchy.** Name, then cost, then art, then type, then rules. Rules text is dense (often 40 to 80 words) and
  is the weak point for kids.
- **Rarity.** Set-symbol colour: black (common), silver (uncommon), gold (rare), orange-red (mythic). Small and
  colour-only; the holo stamp adds a second cue on rare and up.
- **Premium.** Traditional rainbow foil, etched foil, galaxy, surge, textured foil; borderless (art to the edges),
  extended art (art to the left and right edges), showcase frames themed to a set, full art (text sits over a large
  illustration). Same rules, different treatment: the variant is the collectible.
- **Take.** Variants of the same card as the collectible layer; collector line as a real data block; an
  authenticity stamp; one text box with a clear type line.
- **Leave.** The frame art, mana symbols, set symbols, the card back, the Beleren and Plantin type, all text.

### Pokémon TCG (The Pokémon Company, 1996 to now)

- **Layout.** Name and HP across the top with a type icon, art window, then attacks with energy-cost icons at left
  and damage at right, weakness/resistance/retreat strip, then the set and rarity line. Scarlet & Violet (2023)
  moved international cards from yellow to silver borders.
- **Readability.** Damage numbers are huge; energy costs are icons, not words. Kids read it before they can read
  the text.
- **Rarity.** Shape symbol by the collector number (circle, diamond, star, then multi-star and gold stars for
  illustration and hyper rares). Shape, not only colour: survives grey and colour blindness.
- **Premium.** Illustration rares and special illustration rares let the art run behind the whole card with the
  text floating on it; textured (embossed) foil you can feel; gold hyper rares.
- **Take.** Shape-coded rarity; icon costs; the big-number stat; art behind text for top tiers; texture as a print
  finish (embossing works for kids' fingers).
- **Leave.** Creatures, energy symbols, the ball iconography, card back, frame graphics, all text.

### Hearthstone (Blizzard, 2014 to now)

- **Layout.** A card is a physical-looking object: stone and metal frame, mana gem at top left, oval portrait for
  minions (rectangular for spells, shield-like for weapons), name on a curved banner across the art, rarity gem at
  bottom centre of the art, attack bottom left, health bottom right, short rules text.
- **Shape by type.** The art window's shape tells you the card type before you read it. That is a style idea worth
  taking.
- **Rarity.** Gem colour (white, blue, purple, orange) plus a dragon ornament on legendary: shape and colour.
- **Juice.** Packs: you hover a face-down card and it glows its rarity colour before you flip it; legendaries get
  an explosion and a sting. Cards in hand lift and enlarge on hover; played minions slam onto the board with dust and
  a voice line. Golden cards animate their art; Diamond cards are fully animated; Signature cards are art-forward
  with a minimal frame.
- **Take.** Shape-coded art windows by card type; rarity glow before the flip; golden/animated art as a variant
  ladder; "everything slams, nothing teleports".
- **Leave.** Frame art, gem art, dragon, typefaces, card back, characters, text.

### Gwent (CD Projekt Red, 2018 to 2024 live)

- **Layout.** Almost all art. Power number top left on a small shield, provision cost and faction marker at the
  bottom, the name and ability only on inspect. Border metal (bronze, gold) signals the card's class of strength.
- **Premium.** Animated "premium" cards, with layered and particle animation that was one of the most admired
  digital-card presentations; premiums keep the same face so they stay readable.
- **Take.** Art-as-face with one number on it; text on inspect; animated variants that keep the layout fixed.
- **Leave.** All art, frames, faction iconography, names.

### Legends of Runeterra (Riot, 2020 to now as Path of Champions)

- **Layout.** Cost top left, art, name, keyword icons with short text, attack bottom left, health bottom right.
  Riot moved the region icon from a watermark behind the text to the top-right corner (patch 2.2) because text
  and interactive keywords sat on top of it; they rejected region-tinted frames because frame colour already meant
  follower versus champion and colour cues can fail for colour-blind players.
- **Juice.** Champions level up mid-game with a full-screen moment and a new card face; keyword hyperlinks expand
  in place.
- **Take.** Keep the text box clear of watermarks; one meaning per colour channel; colour never the only cue; keyword
  icons that expand on inspect; a "level up" second face for a card as a reward moment.
- **Leave.** Champions, regions, frames, icons, text.

### Marvel Snap (Second Dinner, 2022 to now)

- **Layout.** Cost top left, power top right, logo-style name, and nearly all the rest is art. Ability text appears
  on inspect. Two numbers and a picture: the most kid-legible card face in this study.
- **Variants and splits.** Upgrading a card walks it up a visual ladder (border colours, then frame break where the
  character steps out of the frame, 3D parallax, animated background, a logo name), and "splits" add finishes
  (foil, prism, ink, gold) and flares (particle effects around the card). A collection becomes a ladder of the same
  card getting more alive.
- **Juice.** Cards are thick with a visible edge; play is a slam with screen shake scaled by power.
- **Take.** Two-number face; text on inspect; frame break and parallax as top tiers; an upgrade ladder of the same
  card; finishes and flares as separate axes.
- **Leave.** Characters, art, logos, the exact tier names and colour sequence, frames.

### Slay the Spire (Mega Crit, 2019)

- **Layout.** Energy cost orb at top left, name banner, art window whose outline shows the card type (attack:
  bottom edge tapers to a point; skill: rectangle; power: oval), type label, short text.
- **Rarity.** Banner and frame colour (grey common, blue uncommon, gold rare). Upgraded cards add a plus and
  green numbers. Character colour tints the card body.
- **Readability.** Text is short and keyword-led; numbers inside text change colour when modified.
- **Take.** Art-window shape by type (again: two games independently landed on it); a plus and colour change for
  upgraded cards; numbers that change colour when buffed.
- **Leave.** Art, frames, card names and text, character designs.

### Inscryption (Daniel Mullins, 2021)

- **Layout.** Cards are physical props on a table seen by a first-person camera. Woodcut-like creature art, cost as
  blood drops or bones at top right, sigils (ability icons) at the bottom, attack and health in the bottom corners.
- **Juice.** Everything is diegetic: cards are slapped down, picked up, nailed, painted, and the camera leans in.
  The card is a prop in a world, never a menu.
- **Take.** The card as a prop on a table in the world: for Abbie's World, cards live on the Ranch table, not in a
  menu overlay. Ability icons (sigils) instead of sentences.
- **Leave.** Art, sigil designs, the horror tone, the table, text.

### 9 Kings (Sad Socket, 2025 early access)

- **Layout.** Small, chunky pixel cards that you drag onto a plot grid; one card per year. Few words; the card is a
  picture and a role.
- **Juice.** The card's payoff is in the world: place it, the building appears, then the battle plays out. The card
  hands off to the world quickly.
- **Take.** The card's job is to become a thing in the world. For the Ranch, a played card should land as its 3D
  model on the tile with the same settle animation the world uses.
- **Leave.** Pixel art, kings, cards' specific content. (Low confidence on visual specifics until captured on the PC.)

### Balatro (LocalThunk, 2024)

- **Layout.** Standard playing cards plus jokers, pixel art, a CRT post-process over the whole game.
- **Juice.** Cards are never still: they sway idly, tilt in 3D toward the cursor, bounce on select, and scoring cards
  pop one by one with rising pitch so a five-card hand climbs a scale. Editions are shaders over the same art (foil,
  holographic, polychrome, negative), so a finish is a material, not a repaint.
- **Take.** Idle sway; tilt toward the pointer; per-card rising-pitch scoring; editions as shaders over the same art.
- **Leave.** Art, jokers, the CRT look as a whole, all text.

### Premium physical collectibles

- **Trim.** 63 x 88 mm is the standard trading-card size (Magic and Pokémon; 2.5 x 3.5 in nominal), fits standard
  sleeves (66 x 91 mm). Japanese small size is 59 x 86 mm (Yu-Gi-Oh!, many Japanese games).
- **Bleed and safe area.** 3 mm (1/8 in) bleed beyond trim on every side; keep critical content 3 mm inside trim.
  Corners are die-cut at about 3 mm radius; nothing important within the corner arcs.
- **Resolution.** 300 ppi at final size is the minimum; 600 ppi masters keep foil masks, fine type and halftone
  clean. At 600 ppi, trim is 1488 x 2079 px and the bleed canvas is 1630 x 2221 px.
- **Colour.** Print in CMYK from a PDF/X-4 with a coated profile (FOGRA39 or GRACoL 2013). Total ink 300 per cent or
  less. Big blacks as rich black (60/40/40/100); small text in 100 per cent K only, so registration can't blur it.
  Lines no thinner than 0.25 pt.
- **Stock.** 300 to 330 gsm card with a black or blue core (opaque, so cards can't be read from behind), about
  0.30 mm thick, smooth or linen finish.
- **Finishes.** Rainbow holofoil laminate (whole-card foil); cold foil or hot-stamp foil on selected areas; spot UV
  gloss on the art or the name; etched foil (matte foil with a fine pattern); embossing or textured varnish; gilded
  edges for a top-tier box; a small holographic authenticity stamp. Each finish needs its own spot-colour mask layer
  in the print file.
- **Take.** All of it is industry practice, not anyone's expression.

## What every great card shares

| Principle | Evidence | Measure in the rubric |
|---|---|---|
| Art leads the eye | Snap, Gwent, illustration rares, borderless Magic | Art holds at least its share of saliency; art share of face |
| Fixed corners for numbers | All ten | Numbers at fixed anchors, cap height at least 6 per cent of card height |
| LODs by size | Hearthstone, Snap, LoR, Gwent | L0/L1/L2 layouts; thumbnail test at 72 px |
| Type told by shape | Hearthstone portraits, Slay the Spire windows | Distinct art-window outline per card type |
| Rarity triple-coded | Hearthstone gems, Pokémon symbols, Magic stamp | Colour, shape and finish differ per tier; CVD-safe |
| Rarity before reveal | Hearthstone pack glow, Pokémon pack tear, Snap reveal | Back glow and hold time scale with rarity |
| Variant ladders | Magic treatments, Snap splits, Hearthstone golden/diamond | Same card id, several finishes |
| Physical object | Hearthstone, Inscryption, Snap card edge | Edge thickness, specular, shadow; "object not UI" judge |
| Short text, icons first | Snap, Pokémon costs, Inscryption sigils | At most 15 words on L0 for kids, grade 3 or below |
| Payoff in the world | 9 Kings, Hearthstone board slam | Played card lands as its 3D model in under 600 ms |

## The Abbie's World card

The house style, from the identity work: the world is a toy diorama (Tiny Glade, Bricktales), interfaces hide, the
world rewards placement. A card must look like something a craftsperson made on the Ranch, not a web panel.

### Size, LODs and grid

- Print: 63 x 88 mm trim, 3 mm bleed, 3 mm safe, 3 mm corner radius. Master 600 ppi (1630 x 2221 px with bleed).
- Digital master: the same pixels; the game uses the trim area (1488 x 2079) and downsamples per LOD.
- The face sits on an 8-column, 11-row grid inside the safe area (each cell about 7.1 x 7.5 mm), so every element
  snaps to the same anchors on every card.
- **L0 inspect** (print, full-screen inspect): everything.
- **L1 hand** (about 120 to 200 pt tall on iPhone): art, name, cost, the stat(s), rarity gem, type shape. Rules
  text replaced by up to three ability icons.
- **L2 board/thumbnail** (about 48 to 96 pt tall): art, cost, one stat, rarity gem. No words.

### Anatomy (L0, standard frame)

| Element | Position (grid) | Rule |
|---|---|---|
| Cost | Top-left corner token, 1.5 x 1.5 cells | One numeral; chunky, outlined, at least 18 pt print |
| Name | Ribbon across the top of the art, columns 2 to 8 | Display face, at least 10 pt print, at most 18 characters for kids |
| Art window | Rows 1 to 7, full width inside frame | Shape by card type (below); 50 to 65 per cent of face |
| Rarity gem | Where art meets text plate, centred | Growth-stage shape and colour (below) |
| Type line | Small caps strip under the gem | One word or two: "Animal", "Building", "Crop", "Weather", "Helper" |
| Text plate | Rows 8 to 10 | At most 15 words or up to three ability icons with one short line each; 8 pt or more |
| Stats | Bottom-left and bottom-right corner tokens | At most two stats; L2 keeps one |
| Collector line | Inside safe area, bottom edge | Set mark, number/total, maker line (Midjourney job or artist), variant code |

### Card types told by the art-window shape

Our own shapes, chosen from Ranch materials so they don't echo any game's frames:

- **Animal**: rounded "barn door" arch top.
- **Building**: gabled roof top (a pointed pitch).
- **Crop / plant**: scalloped "seed packet" top.
- **Weather / season**: full circle "window" with sky behind it.
- **Helper / tool**: square with chamfered corners like a crate.

### Rarity: growth stages

Kids already know growth. Five tiers, triple-coded (gem shape, colour with different lightness, frame treatment),
plus a finish axis that is independent of rarity.

| Tier | Gem shape | Gem colour (OKLCH L) | Frame | Reveal hold |
|---|---|---|---|---|
| Seed (common) | Round seed | Walnut brown (L 0.40) | Plain pine wood, painted edge | 0 ms |
| Sprout (uncommon) | Two-leaf sprout | Leaf green (L 0.62) | Wood with green-painted trim and brass corner caps | 200 ms |
| Bloom (rare) | Five-petal flower | Sky blue (L 0.70) | Lacquered wood, brass trim, spot-gloss name | 450 ms |
| Harvest (epic) | Wheat sheaf | Plum (L 0.52) on gold | Gilded frame, living art loop (wind, light) | 800 ms |
| Sun (legendary) | Sunburst | Gold (L 0.85) | Borderless or frame-break art, full foil, parallax | 1200 ms with a build |

Finishes (any tier): Standard, Shimmer (rainbow foil shader), Golden Hour (warm gold foil over the art), Frost
(seasonal: frosted etched texture), and later seasonal ones. Print maps: Shimmer to holofoil laminate, Golden Hour
to cold foil, Frost to etched foil with spot UV.

### Typography

- Two families at most: a characterful rounded display face for names and numerals (open-licence, e.g. Fredoka,
  Baloo 2, Lilita One) and a humanist sans for text (e.g. Nunito; Atkinson Hyperlegible where legibility matters most, though its slashed zero reads oddly to kids). Never a
  game's own font.
- Numerals: display face, heavy weight, light fill with a dark outline at least 8 per cent of the glyph height and a
  soft drop shadow; readable on any art.
- Text on a plate, never on raw art. On full-art cards the plate becomes a translucent paper panel with blur.

### Art crop

- One subject, centred on the art window's vertical axis within 10 per cent, occupying 35 to 65 per cent of the
  window height, with headroom; the subject's face or focal point in the upper half.
- The background behind the name ribbon and text plate is calm (low edge density).
- Silhouette test: the subject is nameable from a black silhouette at 64 px.
- Frame break (Sun tier): the subject is rendered on its own layer and crosses the frame edge by 5 to 15 per cent of
  card height, never over the cost or stats.
- Our art comes from our pipeline: Midjourney or another source per CLAUDE.md, or a turntable render of the asset's
  own 3D model, with the prompt and job id in `provenance.json`. Never another game's art as a reference image.

### Juice (in game, three.js)

| Moment | Spec |
|---|---|
| Idle in hand | Sway plus or minus 1.5 degrees, period 3 to 5 s, phase offset per card |
| Draw | Deck to hand in 280 to 380 ms, ease-out-back with 4 to 8 per cent overshoot; land squash 1.04 x 0.97 for 80 ms; soft slide sound |
| Hover / touch-hold | Lift 10 per cent of card height, scale 1.10 to 1.15, tilt toward the finger up to 12 degrees with a spring (stiffness 300, damping 25); specular highlight moves opposite the tilt; parallax: background 0.3, subject 1.0 |
| Inspect | Grows to L0 in 220 ms; rules text fades in after the scale finishes |
| Reveal (pack) | Back glows the rarity colour first; hold per the rarity table; flip 380 to 480 ms on Y with a scale bump to 1.08 at 90 degrees; Sun tier dims the scene 30 per cent, bursts petals/hay and plays a sting |
| Play | Card flies to the tile in 200 to 260 ms, turns into its 3D model, which settles with the world's placement animation; one sound per motion; camera nudge 2 to 4 px |
| Finish shaders | Foil and gloss respond to tilt (pointer on desktop, device orientation where permitted, a slow idle sweep otherwise) |
| Reduced motion | Crossfades of 150 ms, no tilt, no shake |
| Budget | 60 fps on an iPhone 12-class device with 10 cards in hand; one draw call per card face plus one for effects |

Note: iOS Safari has no web vibration API, so haptics are not available to a home-screen web app; sound carries the
"feel" there.

## The rubric

Full detail and thresholds are in `card-rubric.json`. In short:

**Gates** (any failure rejects the card):

1. Print geometry: canvas 1630 x 2221 px (600 ppi) or 814 x 1109 px (300 ppi minimum) with bleed.
2. Safe area: every text and number box inside the 3 mm safe area and outside the corner arcs.
3. Minimum text size at L0 print: text 8 pt, name 10 pt, numbers 18 pt (cap heights checked in pixels).
4. Contrast: every text box at least 4.5:1 against its plate; numbers at least 3:1 against the pixels around them.
5. Art resolution: the art's source pixels at least the art window's pixel size at 300 ppi, no visible upscaling.
6. Expression ledger: no source game's art, frame, font, icon or text; provenance recorded.
7. Kid-safe: PG content, reading level grade 3 or below.

**Scored** (100 points):

| Dimension | Weight | Main measures |
|---|---|---|
| Thumbnail readability (L2/L1) | 15 | A VLM names cost, stat, rarity and type at 72 px; 4 of 4 |
| Hierarchy | 12 | Saliency peak in art; reading-order judge; words on face |
| Art crop and subject | 12 | Centring, subject height share, silhouette test, calm text zones |
| Rarity signalling | 10 | Gem colour distance (OKLab deltaE at least 15 between neighbours, also under deuteranopia), distinct shapes, finish present for Bloom and up |
| Frame and material | 10 | "Crafted object, not web UI" pairwise judge; frame share 15 to 30 per cent; bevel/texture value range |
| Typography | 8 | Two families or fewer, numeral outline, no text on raw art |
| Collectibility metadata | 8 | Set mark, number/total, maker line, variant code, stable card id |
| Juice | 12 | Draw, hover, reveal and play timings within the table above; sound per motion; reduced-motion path |
| Print readiness | 8 | CMYK conversion within gamut, total ink 300 per cent or less, small text 100 per cent K, finish masks present |
| House style | 5 | Closer to the Abbie's World identity vector than to any single source game |

A card ships at 80 or more with all gates passed. A set ships when every card passes and the rarity ladder is
distinguishable side by side.

## How this fits the identity schema

- Each game's card findings are recorded as `signature` objects (layer `interface`, `art`, `interaction` or
  `assets`) with `class` set to `style` or `expression` in `card-signatures.json`, so the Oracle can fold them into
  the games' identity records later without new fields.
- Rubric measures use the schema's `source` enum: `footage_cv` for computer vision over our own renders, `llm_judge`
  for VLM judgments (pairwise, both orders, as `llm-3d-modeling.md` requires), `human` for Evan's picks, `estimate`
  for unmeasured timings.
- The legal line is the same as `GAME_IDENTITY.md`: conventions that are scènes à faire for card games (cost in a
  corner, attack and health in the bottom corners, foil, rarity tiers) are free; the particular frames, gems, icons,
  fonts, card backs and the overall look of one game are never copied, and no other game's card image is used as a
  model or Midjourney reference.

## Sources

- Magic frames and treatments: [MTG Wiki, Card frame](https://mtg.wiki/page/Frame).
- Hearthstone rarity gems and legendary frame: [Hearthstone Wiki, Rarity](https://hearthstone.wiki.gg/wiki/Rarity);
  [Signature card](https://hearthstone.wiki.gg/wiki/Signature_card).
- Marvel Snap splits, finishes and flares: [snap.fan, Infinity splits and frame breaks](https://snap.fan/guides/infinity-splits-and-frame-breaks-guide/);
  [Marvel Snap Zone rarity guide](https://marvelsnapzone.com/marvel-snap-card-rarity-guide/).
- Legends of Runeterra region icon change and colour-blind rationale: [Out of Games](https://outof.games/news/2659-riot-comments-on-the-recent-changes-to-runeterras-card-frames/).
- Slay the Spire card types and rarity colours: [Slay the Spire Wiki, Cards](https://slaythespire.wiki.gg/wiki/Cards).
- Pokémon rarity symbols: [PokeGuardian, Scarlet & Violet rarities](https://www.pokeguardian.com/guides/1258277_international-scarlet-violet-pokemon-card-rarities-list);
  [Pokémon, Scarlet & Violet card aesthetic](https://www.pokemon.com/us/pokemon-news/pokemon-tcg-scarlet-and-violet-revamps-pokemon-tcg-card-aesthetic).
- 9 Kings: [Wikipedia](https://en.wikipedia.org/wiki/9_Kings).
- Balatro feedback layers (a secondary write-up; timings to verify on capture): [Blake Crosley, Balatro](https://blakecrosley.com/zh-Hans/guides/design/balatro).
- Print specs: [4over4 trading card guide](https://v2.4over4.com/guide/trading-card-sizes-the-complete-guide).
- Game feel: Swink, *Game Feel* (2008); Jonasson and Purho, "Juice it or lose it" (2012), as in `GAME_IDENTITY.md`.
