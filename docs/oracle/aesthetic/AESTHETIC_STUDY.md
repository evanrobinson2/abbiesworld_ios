# What makes a game's motif, aesthetic and palette great

Oracle study, 2026-10-23. Requested by Evan ("can you also do a study on motif, aesthetic, palette?"), after the card
study in `../cards/` and the HUD study in `../hud/`. Games Evan loves (Tiny Glade, Bricktales, Dorfromantik, 9 Kings,
Besiege) and the ones from the HUD study (Don't Starve, This War of Mine, SteamWorld Dig), plus six others that
each prove one rule, applied to Abbie's World, a toy-world builder for young children in the Ranch Atelier.

Files in this folder:

- `AESTHETIC_STUDY.md` (this file): the four layers (motif, shape language, aesthetic, palette), how a palette is
  structured, how it carries information on the 2x2, what the games do, what every coherent world shares, the
  Abbie's World palette and motifs, a measured audit of today's `/sandbox`, and the rubric in prose.
- `aesthetic-rubric.json`: the rubric as data. Gates must pass; the rest scores out of 100. Every check has an id,
  a method and a `source` from the identity schema's enum. Thresholds are in `targets`, explained in `targets_doc`.
- `aesthetic-signatures.json`: per-game palettes in the identity schema's `layers.art.palette` shape, and
  signatures in its `signature` shape, each marked `style` (we may learn from it) or `expression` (we never copy it).
- `aesthetic-ranch-proposed.json` and `aesthetic-ranch-today.json`: palette manifests for the proposed Ranch and for
  the live `/sandbox`, so the checker has a pass and a fail.
- `captures/`: the images the checker measures: six in-game captures of the live Ranch (day, night, midnight, summer,
  autumn, frost) and eight of the Midjourney concept paintings Evan picked for the Ranch rebuild.
- `tools/aesthetic-rubric/check_aesthetic.py`: the reference checker. `--measure` turns any capture into an
  identity-schema palette (k-means in OKLab, value bands, warmth, accent share, engine colours); given a manifest it
  runs the gates and prints a provisional score.

Visual page with the real palettes, diagrams and the day-to-night demo: https://claude.ai/artifact/77csfxoAD3xKh4um313Px7 (source:
`aesthetic-study.html` in this folder).

**Confidence.** Every number about Abbie's World is measured by the checker from captures in `captures/`
(`source: footage_cv`). Game palettes are not: this environment could not reach Steam or any image host, so each
game's hex values are hand-estimated from knowledge of the game (`source: estimate`, each with a `confidence`), and
should be replaced by `--measure` runs over captures from the PC's "Game library assimilation" thread when they
land. Quoted design intent comes from developer interviews (listed in Sources). Nothing here copies any game's
art, palette as a whole, motifs or characters; the ledger says what is style and what is expression.

## The core rule: one signal, one palette

The HUD study's rule is "the whole game adapts": one game-state signal (time, threat, mood, a storm coming) drives
light, music, people, animals and sound together. **Colour is the biggest of those channels.** A palette is not a
theme you pick once; it is a function of the world's state:

    palette = f(place, time, season, weather, mood)

- **Place** sets the dialect: the Ranch is wood, bells and painted signs under warm cream light; the Moonbase is
  lights, radio and holograms under deep blue.
- **Time** walks the sky and sun through dawn, day, dusk and night, and lights the windows.
- **Season** recolours the foliage and ground.
- **Weather** lowers the sky to slate and lifts the wind.
- **Mood** (the music bible's mood for the beat) tilts warmth and saturation a little.

The UI never gets its own theme. When night falls, the world goes dark and warm windows come on; the liquid glass
takes on the night because it refracts the world behind it. **Today's `/sandbox` does the opposite**: its night
switch turns the panel dark and leaves the world as bright as day (measured: night is 0.015 *lighter* than day in
OKLab lightness). That is the single biggest finding of this study.

## The short version

1. **Value before hue.** A world reads in greyscale first. Figures separate from the ground in lightness, not only
   in hue. Squint test: if the barn disappears in greyscale, no hue will save it.
2. **A palette is roles, not swatches.** Ground, figure, accent, backdrop, light and shadow. Each role has a job, a
   lightness band and a saturation band.
3. **The saturation ladder.** The things you touch are the most saturated; the ground they stand on is quieter; the
   backdrop is quietest. Today the Ranch ground is the most saturated thing in the world.
4. **Accents are scarce and reserved.** About a tenth of the image at most, and each signal hue means one thing
   only (Journey's red, A Short Hike's gold feather). Scarcity is what makes them loud.
5. **Warm light, cool shadow.** Shadows take the sky's colour; nothing goes neutral grey. This is the cheapest way to
   make a world feel alive and the most common way a 3D toy world goes dead.
6. **Coherence is a constraint everything obeys**: a parts list (Bricktales' bricks), a small material set (Tiny
   Glade), two colours (Obra Dinn), a grammar (Townscaper). Not taste applied asset by asset.
7. **A motif is a shape with a meaning that recurs.** The stud, the bell, the teal roof cap. Three or more things
   share it, and it means something in play.
8. **Shape language is a promise.** Round is friendly, square is steady, triangle is alert. Don't Starve is spiky on
   purpose; a kids' game keeps triangles for roofs and the occasional storm cloud.
9. **The palette carries state diegetically.** A thirsty crop goes brown, ripe fruit glows gold, windows light at
   dusk, the sky drops to slate before a storm. Never colour alone: every colour meaning also has a shape, motion or
   sound.
10. **The UI speaks the world's palette.** The liquid glass, the ink and the active colour come from the world's own
    roles. No web blue, no grey panels.

## The four layers

| Layer | What it is | What great looks like | Measured by |
|---|---|---|---|
| **Motif** | A recurring shape, object or pattern that carries identity and usually meaning | Bricktales' stud at every scale; Journey's red cloth; A Short Hike's golden feather | Manifest `motifs`, each in 3 or more things; human check that it means something |
| **Shape language** | Which primitive each family of things is built from | Animals and homes round, fences and barns square, roofs triangle | Manifest `shape_language`; VLM silhouette test at 48 px |
| **Aesthetic** | Rendering, material, proportion, detail density, motion and light working as one hand | Tiny Glade's few materials under one golden light; Besiege's wood, iron and canvas | In-gamut share; VLM pairwise "does this asset belong" |
| **Palette** | The structured colour set and how it moves with the world's state | Dorfromantik's hue-per-tile-type; Firewatch's colour script; Don't Starve's seasons | Value bands, roles, ladder, accents, CVD, state shifts (all automated) |

The identity schema already holds the measurable half: `layers.art.palette` (dominant_hex, mean_saturation,
mean_lightness, value_key, contrast_rms, warmth), `layers.art.shape_language` (round, square, triangle,
silhouette_readability) and `layers.assets.materials`. `check_aesthetic.py --measure` fills the palette block
directly from a capture.

## How a palette is structured

### Value first: the notan

Lightness does the heavy lifting; hue decorates. The checker splits world pixels into three OKLab lightness bands
(dark under 0.50, mid, light over 0.78) and asks for at least two bands to hold 10% or more, and for RMS lightness
contrast of at least 0.06. Every figure role must sit at least 0.08 away from every ground role in lightness.

Today's Ranch day capture is 70% mid-tones with only 3% darks: a flat, foggy read. The Atelier summer capture (with
real shadows) has 18% darks and reads much better; light, not paint, is what is missing.

### Roles

| Role | Job | Ranch proposal | OKLab L / chroma |
|---|---|---|---|
| Ground | Where things stand. Quiet, large | Meadow `#a6b087`, path `#d4b48a` | 0.74 / 0.058 |
| Figure | The things you touch | Foliage `#6e9440`, roof cap `#3b8f8b`, wall paint `#c9694f`, timber `#8a6444`, plaster `#f1dcb8`, water `#4a92a6` | 0.54 to 0.90 / 0.05 to 0.13 |
| Accent | Rare, reserved, means "something to know" | Brass `#e3ab35` (bells) | 0.79 / 0.14 |
| Backdrop | The sky and the edge of the world. Quietest | Paper sky `#efe5cf` | 0.92 / 0.03 |
| Light | The key light's colour | Sun `#ffd9a0` (warm, 77 degrees) | |
| Shadow | What shadows fill with | Sky-blue `#5a6a8c` (265 degrees) | |

Five or six hue families at most (the proposal has green, teal, terracotta, cream and brown). Share targets follow
the painter's 60-30-10: ground and backdrop about 60%, figures about 30%, accents under 10%.

### The saturation ladder

Figures more saturated than ground, ground more than backdrop. It is how a child's eye finds the toys. Measured
today: figure median chroma 0.076, ground 0.091. The meadow out-shouts the buildings. Proposed: figures 0.079,
ground 0.067, backdrop 0.031.

### Warm light, cool shadow

Every painterly game in the list does it: Tiny Glade's shadows fill blue from the sky, Firewatch layers warm
foreground against cool distance. The checker requires a warm key light (hue 350 to 110 degrees) and a cool shadow
(hue 180 to 300) or a near-neutral one; at night it may invert (cool moonlight, warm windows).

### Rich, not muddy, not neon

Evan likes rich colours. "Rich" measured: world mean OKLCH chroma between 0.04 (below is muddy) and 0.13 (above is
neon). The Ranch sits at 0.05 to 0.08, the concept paintings at 0.045 to 0.068. Rich comes from figure and accent
chroma plus warm light, not from turning up global saturation.

### Time of day, season, weather, mood

| Signal | Palette shift | Other channels on the same signal |
|---|---|---|
| Time | Dawn peach sky `#f6d7b8`, day paper `#efe5cf`, dusk apricot `#e9a77f`, night ink-blue `#2f3a5a`; windows `#ffc56b` come on at dusk | Animals head home, residents go inside, music thins, the bell |
| Season | Summer green, autumn amber (measured: warmth 0.12 to 0.36), frost silver-blue (chroma drops) | Music arrangement, animal coats, crops |
| Weather | Sky drops to slate `#6b7a90`, saturation falls, fog rises | Wind in trees, animals shelter, bell rings faster |
| Mood | Small tilts of warmth and saturation, following the music bible's mood for the beat | Music layers |

The checker requires each signal to drive at least three world channels, night to be at least 0.12 darker than day,
and other states to differ by palette distance or warmth.

### Accessibility

- **Never colour alone.** Every colour meaning carries a shape, motion or sound too (gate G2).
- **Colour-blind safe.** Every meaning against its ground, and meanings that share a ground, stay at least 0.08
  apart in OKLab under protanopia, deuteranopia and tritanopia (Machado 2009 matrices). One real result: a pale
  straw "thirsty" colour collapsed into the meadow under protanopia (0.067); the fix was to make thirsty crops go
  *brown*, darker than the meadow (`#968241`, worst case now 0.116), which is also what a dry crop does.
- **Survives greyscale.** Each meaning differs from its ground in lightness by 0.05 or more.
- **No glare.** Sky, ground and UI stay between L 0.12 and 0.96.
- **Kid safe.** No alarm red for failure, nothing flashing above 3 Hz, no draining the world of colour as a
  punishment.

## How palette carries information

The 2x2 from the HUD study applies to colour directly.

| | In the world | On the screen |
|---|---|---|
| **Characters know** | **Diegetic**: the world's own colour changes. Crop browns when thirsty, fruit glows gold when ripe, windows light at dusk, sky drops to slate | **Meta**: a gentle grade on the lens for a feeling. A warm vignette at bedtime, cool desaturation when sleepy |
| **Only you know** | **Spatial**: colour on a cue attached to a thing. The cream need bubble over a goat | **Overlay**: a precise colour key on screen. The hand of cards' suit colours |

**None**: the palette just shifts (autumn arrives) and the child feels it.

Rules for Abbie's World:

- **Diegetic first.** A state the world can show by its own colour should be shown that way. The rubric asks for at
  least three (`palette_carries_state`). The proposal has four: ripe, thirsty, lamp-lit home, storm coming.
- **Reserved hues.** Brass means "something to know" and appears only on bells. Lamp glow means "someone is home".
  Storm slate means weather. One colour, one meaning (`one_meaning_per_colour`).
- **Colour on the presentation layer is for the player only.** The need bubble's cream belongs to the presentation
  layer (`layer: spatial` in the manifest) and is invisible to every perception; the crop's brown is world colour
  that characters see and react to.
- **Overlay colour is precise and small**: suits on cards, the sun dial's face. It borrows hues from the world.

## The games

Palettes are estimates (see Confidence); each has its swatches in `aesthetic-signatures.json` and on the page.

### Tiny Glade (Pounce Light, 2024)
Warm golden light, soft global illumination and deep soft occlusion; a handful of materials (stone, plaster,
terracotta, grass, water) reused everywhere. Ivy and flowers creep onto what you build: the world answers the
builder in colour. Almost no UI colour. **Lesson:** coherence from a tiny material set under one light; the world is
the only saturated thing on screen.

### LEGO Bricktales (ClockStone, 2022)
Every colour is a real brick colour, so anything you build is in gamut by construction. The stud repeats at every
scale and binds the world; each scene is a diorama on a base. **Lesson:** enforce coherence through the parts list.
For us: the modeler's material roles are our parts list (`tools/ranch-rebuild` reads material names as shading
roles), so a role table is how the whole kit stays one world.

### Dorfromantik (Toukana Interactive, 2022)
Each tile type owns a hue family: wheat gold, forest green, water blue, red-roofed villages. You read the scoring
rules from colour and shape at a glance. The developers aimed for "an ideal and harmonic interpretation of the
real-world landscapes", painted, with a board-game feel. Its board fades into a pale void, which our house rule
forbids. **Lesson:** the palette can *be* the rules.

### 9 Kings (Sad Socket, 2025 early access)
Each king owns a colour, so whose plot and whose army it is reads from hue; a dark surround makes the small bright
kingdom pop. Low confidence on exact hues. **Lesson:** faction equals hue; the backdrop is the quietest value.

### Besiege (Spiderling Studios, 2015/2020)
Wood, iron, canvas and brass parts give every contraption a medieval-engineer look; levels are muted and low in
detail so the player's machine is the most readable thing. **Lesson:** the player's creation gets the top of the
saturation ladder. In Abbie's World, what the child builds should out-colour the meadow.

### Don't Starve (Klei, 2013)
Ink outlines on paper-cutout figures, a "sketchy newspaper cartoon style" (Klei). Night drains the world to black
and only firelight keeps warm colour, so light is survival; low sanity desaturates the screen (meta) and wakes
shadow creatures (diegetic); each season recolours the world. Spiky, triangle-heavy shapes signal threat.
**Lesson:** the seasonal recolour and light-as-safety are style we use, gently; the spiky shape language and horror
palette are not for us.

### This War of Mine (11 bit studios, 2014)
Near-monochrome charcoal and sepia, aiming for "old sepia photography" (80.lv). Because colour is almost absent, a
stove's glow or a candle carries huge weight. Unexplored rooms are dark and hatched. **Lesson:** accents are
precious because they are scarce. We take the scarcity rule, not the grey.

### SteamWorld Dig (Image & Form, 2013)
Underground layers shift hue with depth, ore colour and sparkle say value, and the lamp radius is the palette (lit
warm, unlit near-black). **Lesson:** colour as a diegetic gauge: you know your depth from the rock's colour.

### Firewatch (Campo Santo, 2016)
Bold colours in distinct layers separated by fog, flat shapes with strong silhouettes, and a colour script aligned
to story beats; the sky drives the palette. Jane Ng (GDC 2015): "You probably don't want that crazy parade,
birthday party colour scheme when you're trying to be spooky." **Lesson:** a colour script per beat; the sky leads.

### Journey (thatgamecompany, 2012)
The palette walks the story (gold sand, pink sunset, blue depths, white snow, gold again). Red cloth is the only
red, reserved for flight and companionship. **Lesson:** a palette arc, and one reserved hue.

### Townscaper (Oskar Stalberg, 2021)
The player picks house colours from a swatch row tuned to similar value and chroma, so any choice harmonises.
**Lesson:** the exact rule a child's colour picker needs. When Abbie paints a barn, every swatch she can pick sits
in the Ranch's figure band, so nothing she chooses can break the world.

### Monument Valley (ustwo, 2014)
Each chapter has its own pastel palette over the same isometric grammar, and faces are lit by flat value steps so
form reads without texture. **Lesson:** place dialects; value steps do the modelling.

### A Short Hike (adamgryu, 2019)
3D rendered at low resolution with a warm grade; golden feathers are the most saturated gold in the world and
always mean "climb further". **Lesson:** a reserved accent with one meaning; detail density held down.

### Return of the Obra Dinn (Lucas Pope, 2018)
Two colours and dithering. **Lesson:** the extreme proof that coherence is a constraint everything obeys.

## What every coherent world shares

1. One light that everything sits under.
2. A small set of materials or parts, named by role, reused everywhere.
3. A value plan that works in greyscale.
4. A saturation ladder pointing at what you can touch.
5. Accents that are scarce and mean one thing each.
6. Motifs that recur at more than one scale.
7. A palette that moves with the world's state, all channels together.
8. A UI that is a dialect of the world's palette, or nearly absent.

## The Abbie's World aesthetic

### Where the Ranch's palette comes from

The concept paintings Evan picked for the Ranch rebuild already agree on a palette, measured by the checker over
eight of them: **warm cream paper light** (warmth 0.75 to 1.00, the paper fills 54% to 79% of each painting),
**teal roof caps** (`#5f8f8a`, `#598582`, `#4a8b84`, `#52767c` across the home, goat shelter, coop and barn),
**terracotta and coral walls** (`#c97a65`, `#a4644a`), and timber browns. The live game measures warmth 0.03 to 0.05:
a cold yellow-green world on a grey void. **The rebuild's art and the game's light disagree, and the light is what
has to change.** The proposal keeps the game's greens but warms the light, the sky and the shadows toward the
paintings.

### Proposed Ranch palette (`aesthetic-ranch-proposed.json`)

The roles table above. Checked: all six gates pass and the automated checks score 100 of 100 (manual checks still
pending). Ground calmed to chroma 0.058; walls and roofs lifted; sky to warm paper; shadows to sky-blue.

### Motifs

| Motif | Appears in | Meaning |
|---|---|---|
| Teal roof cap | Family home, chicken coop, goat shelter, barn, water point | "Someone lives here" |
| Brass bell | Gate, cafe, barn | "Something to know"; brass appears nowhere else. Also the sound motif (diegetic bell) |
| Soil slab | Ranch, Garden, Meadow tiles | The world is a toy you hold. Already in the game |
| Puff canopy | Maple, apple, hazel, birch | Trees are round puffs; species differ by colour and puff count, not detail |

### Shape language

Homes, animals and trees round; fences and barns square; roofs triangle; storms the only other triangles.

### Meanings carried by colour

| State | Colour | Against | Also |
|---|---|---|---|
| Ripe | Brass-gold `#e3ab35` | Foliage | Fruit swells, bees circle, soft chime |
| Thirsty crop | Dry brown `#968241` | Meadow | Leaves droop, cracked soil |
| Someone home | Lamp glow `#ffc56b` | Night wall | Chimney smoke, music warms |
| Storm coming | Slate sky `#6b7a90` | Paper sky | Wind, animals head home, bell rings faster |
| Wants something (spatial) | Cream bubble `#fff4dc` | Meadow | Bubble shape, bob |

### The UI is a dialect of the world

Glass tint `#f3e3c4` (cream paper), rim `#ffd9a0` (the sun), ink `#5a3f28` (dark timber), active `#3b8f8b` (the roof
cap), warm accent `#c9694f` (wall paint). The glass refracts the world behind it, so at night it goes night-blue
by itself; it never switches theme. No system blue, no grey panels.

### Kids pick colours safely

Follow Townscaper: every swatch a child can paint with sits in the figure band (L 0.55 to 0.80, chroma 0.06 to
0.13), so nothing she picks can break the saturation ladder or the value plan.

### Other places

Each place speaks the same grammar in its own materials. Moonbase sketch: regolith `#b9b3a8` ground, deep sky
`#1d2440` backdrop, habitat white `#eef0f2` and earthlight blue `#6fa8dc` figures, hologram cyan `#5fd3d9` spatial
cues, signal amber `#f2a93b` as the reserved accent (the Moonbase's brass bell is its amber beacon).

## Audit of today's `/sandbox` (live branch, measured 2026-10-23)

Captures from project files (`live-a`, `night-a`, `midnight-a` from 2026-10-21; `atelier-pack` summer, autumn and
frost from 2026-10-22), world crop only. `check_aesthetic.py docs/oracle/aesthetic/aesthetic-ranch-today.json`:

| Check | Result |
|---|---|
| G1 value readable | **Fail.** Grass on meadow 0.031 to 0.064 apart in lightness; day capture 70% mid-tones, 3% darks |
| G4 light follows signal | **Fail.** Night is 0.015 *lighter* than day; midnight only 0.03 darker. The time switch re-themes the panel only. Seasons do work (autumn warmth 0.12 to 0.36) |
| Saturation ladder | Fail. Meadow chroma 0.091 beats the figures (0.076) |
| Warmth | 0.03 to 0.05 against 0.75 to 1.00 in the concept art |
| UI speaks world | Fail. Pause red `#c0412f`, near-white buttons `#fbf8ea`, a grey-green night panel `#2d3330` |
| Palette carries state | Fail. No state is shown by world colour |
| Motifs, shape language | Not declared |
| Engine colours | Pass in these crops. But the "0 to 50 m" scale bar under the tile is a developer artifact in the player's view (the HUD study's no-gizmo rule) |
| Provisional score | 36 / 100 on the automatable checks; two gates fail |

**What would move it most, in order:** make time drive the sky, sun and fog (night really dark, windows warm); warm
the key light and tint shadows sky-blue; calm the meadow and lift the buildings; draw the glass's tint from the
world; then declare the motifs and meanings so the checker can hold the line.

## The rubric

Gates (all must pass): G1 value readable, G2 colour never alone, G3 colour-blind safe, G4 the light follows the
signal, G5 no engine colours in the world, G6 kid safe, G7 expression ledger (manual).

Scored out of 100, ships at 80:

| Dimension | Weight | Checks |
|---|---|---|
| D1 Motif and shape language | 14 | motif_recurs, shape_language_declared, silhouette_squint (VLM), motif_meaning (human) |
| D2 Aesthetic coherence | 16 | in_gamut, one_world_pairwise (VLM), one_hand (VLM), dialect_judge (VLM) |
| D3 Palette structure | 18 | role_count, accent_scarcity, saturation_ladder, warm_light_cool_shadow, rich_not_neon |
| D4 Palette carries information | 20 | palette_carries_state, one_meaning_per_colour, reserved_hues (VLM), survives_greyscale |
| D5 Light, time and mood | 12 | time_states, season_states, mood_script (human, with the music bible) |
| D6 Accessibility | 10 | cvd_margin, glare |
| D7 Evan's taste | 10 | ui_speaks_world, no_dead_grey, glass_reads_as_object (VLM), previews_live (human) |

Run it:

    python3 tools/aesthetic-rubric/check_aesthetic.py docs/oracle/aesthetic/aesthetic-ranch-proposed.json   # passes
    python3 tools/aesthetic-rubric/check_aesthetic.py docs/oracle/aesthetic/aesthetic-ranch-today.json      # fails G1, G4
    python3 tools/aesthetic-rubric/check_aesthetic.py --measure capture.png --crop 725,300,245,300          # palette JSON

## How this fits the identity schema

- `--measure` prints exactly the schema's `layers.art.palette` fields (dominant_hex, mean_saturation,
  mean_lightness, value_key, contrast_rms, warmth) with `source: footage_cv`, so the Steam indexer can fill every
  game's palette from captures without new fields.
- Game findings are `signature` objects (layers `aesthetics`, `art`, `information_grammar`) with `class` `style` or
  `expression`, in `aesthetic-signatures.json`.
- The legal line is the same as `GAME_IDENTITY.md`: principles (value plans, saturation ladders, reserved accents,
  hue-per-type, seasonal recolours) are style and free; a game's particular palette as a whole, its characters,
  motifs, textures and look are expression and never copied. Our Ranch palette is derived from our own concept art,
  not from any game.

## Sources

- Firewatch: Jane Ng, "The Art of Firewatch", GDC 2015, write-up at [Thumbsticks](https://www.thumbsticks.com/gdc-2015-the-art-of-firewatch).
- Don't Starve: [Game Developer, "Don't Starve: a Tim Burton take on Minecraft"](https://gamedeveloper.com/design/-i-don-t-starve-i-a-tim-burton-take-on-i-minecraft-i-).
- This War of Mine: [80.lv, "This War of Mine: a game about civilians in war"](https://80.lv/articles/this-war-of-mine-a-game-about-civilians-in-war).
- Dorfromantik: [Game Developer, "Sparking joy through tile placement in Dorfromantik"](https://www.gamedeveloper.com/disciplines/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-).
- Colour-vision simulation: Machado, Oliveira and Fernandes, "A Physiologically-based Model for Simulation of Color
  Vision Deficiency", IEEE TVCG 2009 ([paper page](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)).
- OKLab: Björn Ottosson, "A perceptual color space for image processing" (2020).
- Painting practice (value before hue, warm light and cool shadow, colour scripts): James Gurney, *Color and Light*
  (2010); Bruce Block, *The Visual Story* (2nd ed. 2008).
- House rules: `CLAUDE.md` ("How Abbie's World shows information"), `GAME_FEEL.md`, `../hud/HUD_STUDY.md`,
  the music bible (`docs/music/MUSIC_BIBLE.md`, from the composer thread).
