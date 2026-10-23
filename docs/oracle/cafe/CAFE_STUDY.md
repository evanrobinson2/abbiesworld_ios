# AW-STUDY-0013 - The Coffee Shop

Oracle study, 2026-10-23. Requested by Evan: "now I think we can revisit the coffee shop.. make a study .. I want to
see proofs". Then, after picking the zany interior: "study for the coffee shop long before assets please", and "I want
to focus on the coffee shop and modeling and nothing else."

This is a study, not a build. Nothing is modelled until Evan picks from it. It sets out what the café is, how it looks
at every distance (the map hex, the town, the front door, the room), how it tells the player things, the three style
directions with their proofs, and how it would be modelled once he picks.

Files:

- `CAFE_STUDY.md` (this file).
- Page: the Studies site, `prototypes/ranch-atelier/dist/studies/cafe/` (app.abbies.world/#cafe for the proof grid,
  #cafe-study for the study page).
- Prompts and palettes: `tools/midjourney/prompts/coffee-shop-0013.json`. Images and Midjourney job ids:
  `tools/midjourney/outputs/coffee-shop-0013/` (`provenance.json`).

## The short version

1. **The café is Abbie's own business, and it is a hex.** Evan: "if it's a hex, it automatically wins." One café hex,
   the same size as the Ranch hex, that sits on the board like any other tile and earns from its neighbours.
2. **Four distances, one building.** Map hex, town corner, front door, inside. Each is a closer look at the same
   thing, joined by one continuous camera move. The camera never cuts and the screen never fades.
3. **Evan's pick is the dance-party room** (the giant cup DJ booth, the light-up checker floor, the teal milkshake
   bar, beanbags, neon stars, disco balls). We recommend the dance-party direction for the whole café, so the hex, the
   front and the room all speak one dialect.
4. **The score lives on the sign.** Stars on the café's painted sign are the score (HUD study, T1). Earnings fly from
   the tiles that made them to the sign. There is no score counter on the HUD.
5. **One "party" signal drives everything.** How busy and happy the café is moves the floor lights, the neon, the
   music (one step up the Music Bible's intensity), the queue at the door and the customers' dancing together.
6. **The café can be a café by day and a dance party by night.** This is an option for Evan, not a decision. The same
   room, with the floor, neon and music asleep in the morning and awake at dusk. Time already drives the light
   everywhere else.
7. **Faceted mini icons on the hex** (Evan) show what the café has today: a milkshake, a cup, a record. They are small
   low-poly props that sit on the tile, not floating UI, so you can read them from the map.
8. **The glow is faked, so it runs on a phone.** The floor is one shader-lit plane, the neon is bright unlit paint
   with a soft halo card, and the disco balls throw a few moving sparkle spots. Real lights are kept to three or four.

## What exists today

- **A café is already in the game, in a different style.** `simulations/coffee-room.mjs` builds "Level 1, a
  contemporary mountain café": a 12 × 10 m room with a 3.4 m wall, a cutaway shell, a walnut bar, four tables and
  routes for arrival, seating and staff (`coffee-room-plan.mjs`). Its floor carries a grid of 1 m "human hexes", each
  one person's standing space.
- **The way in already exists.** `mini-world-1.mjs` has three levels: overland, town square and coffee shop interior
  (`RanchView` registers `worldPlaces`). Tapping the café in the square opens it.
- **A drink recipe already exists.** `coffee-recipe.mjs` + `coffee-station.mjs`: a six-step latte or cappuccino
  (cup, coffee, milk, foam, pour, serve) with spoken hints.
- **What it lacks.** No customers or economy ("Customer economy and autonomous service are not implemented"). The
  station's panel uses worded buttons, a side drawer and segmented view buttons ("Whole shop", "Coffee counter",
  "Human hexes"). Those break the HUD rules (zero words, no web layouts) and are debt for the rebuild.
- **The plan it belongs to.** The "Morning Café" direction (project plan): the café at the centre, with neighbouring
  tiles supplying ingredients (Ranch: milk and eggs, Garden: berries and cocoa, Meadow: honey and wheat, Moonbase:
  space treats). Menu items unlock by adjacency, in a seven-day season.
- **Where it sits in town.** AW-STUDY-0006 The City Tile names "the café (the Morning Café's home)" as one of the
  town's hero buildings.

## 1. What the café is, from first principles

A child who wants to run a coffee shop wants three things: **people come**, **I make them something**, and **they
love it**. Everything else serves those three.

- **People come.** Customers walk in from the neighbouring tiles at their own times: ranch hands at dawn, families
  after the Meadow picnic, a rocket crew from the Moonbase. Where a person is comes from their day plan, the same
  rule as the City study ("schedule is the truth").
- **I make them something.** The six-step recipe stays, but it is done with the hands on the machine (tap the cup,
  hold the steam knob), not with buttons in a drawer. Menu items come from what the neighbours grow.
- **They love it.** A served customer reacts in the world: a happy hop, a dance step on the floor, a heart over the
  head (spatial). Their happiness feeds the party signal and the stars on the sign.

## 2. Four distances, one building

| Distance | What you see | What you read at a glance | How you get closer |
|---|---|---|---|
| **The map hex** | The café alone on its hex: the curvy pink building, the cup on the roof, a terrace, roads leaving from the edges, 2 to 4 faceted mini icons | Where it is; what it has today (mini icons); how it's going (the roof floor pulses; a little crowd at the door) | Pinch in, or tap the café |
| **The town corner** | The café on the corner of the town square, among the bell tower, shops and fountain | It's the loudest, brightest building in town; music spills into the square at night | Pinch in, or tap the door |
| **The front door** | The street front at eye level: porthole windows, the neon cup, the painted sign with its stars, the steps | The score (stars on the sign); the queue | Tap the door |
| **Inside** | The room, with the roof and front wall cut away (the Sims and Animal Crossing rule from the shoulder study) | Who's here, who's waiting, what they want (picture bubbles), how the party is going | Pinch out to leave |

Rules for the move: one continuous dolly from the map to the door (about 1.2 s, as in the shoulder study), then the
cutaway opens the room. The front wall and roof fade only for the player (presentation layer). Characters and Suzy's
`look` still see a closed room.

**Granularity by distance** (the hover-distance rubric from AW-STUDY-0005): on the map, the café is 3 to 5 big
shapes (body, roof cup, terrace, sign, the mini icons). At the town corner, add the stripes, windows and door. At the
front, add the bulbs, the speakers and the stars on the sign. Inside is full detail. Each distance gets its own LOD,
built from the same parts.

## 3. The hex

- **Same size as the Ranch hex** (160 m across in world units, rendered as a board-game piece), so it slots into the
  board without special cases. Roads leave from the edges toward the neighbours that supply it.
- **What's on it:** the building toward the back third, a terrace or pool toward the front, the path to the door,
  and 2 to 4 **faceted mini icons** (Evan) that sit on the turf: a milkshake glass, a cup, a record, a speaker. They
  are low-poly, flat-shaded props in the world, about chest height to a person, so they read from the map without a
  label. Each one means "the café has this today", fed by a neighbour (the milkshake needs the Ranch's milk).
- **The proofs** show the hex in all three styles (row 1 of the grid). The dance-party hex proofs came out octagonal
  or round, so the shape is ours to fix: hex, always.

## 4. Inside: the room's zones

Evan's pick, read as zones (left to right as in the picture):

| Zone | In the pick | What it's for in play |
|---|---|---|
| **The stage** | The giant cup DJ booth on a round stage | The heart of the room. Where the music comes from, and where the party level shows first |
| **The floor** | The light-up checker dance floor | Happy customers dance here. The floor's glow is the party signal |
| **The doors** | Arched doors with bulb frames at the back | Where customers arrive and leave (the arrival route) |
| **The bar** | The curved teal milkshake bar with stools and giant sundaes | Where Abbie makes and serves. The recipe happens here |
| **The lounge** | Beanbags in orange, lime and pink | Where customers wait and rest. A full lounge means a rush |
| **The walls** | Neon stars, a window to the outside, posters | The stars echo the sign's stars: the score is felt inside too |

The existing room plan (12 × 10 m, 1 m human hexes, arrival, seating and staff routes) carries over. Only the
dressing changes.

## 5. How the café tells you things

Follows `CLAUDE.md` ("How Abbie's World shows information") and the scene manifest (`docs/design/INFO_MANIFEST.md`,
whose own example is the coffee shop). The café's dialect is **playful-tense**: a little more meta stress in a rush,
never scary.

| What | Who knows | How it shows (best first) |
|---|---|---|
| **Score** | Characters (it's on a sign) | Diegetic: stars on the painted sign and echoed by the neon stars inside; earnings fly from tiles to the sign |
| **The rush** | Characters | Diegetic: a queue out the door; the door bell rings faster; beanbags fill. Meta: the music lifts a step |
| **The party** | Characters | Diegetic: the floor, the neon and the disco balls brighten; customers dance. Meta: a bounce on the beat |
| **What a customer wants** | Characters | Spatial: a picture bubble over them (a milkshake, a cup), never words |
| **A happy customer** | Characters | Spatial: a heart or a hop. None: they stay and dance longer |
| **Running low** | Characters | Diegetic: an empty jar on the shelf; the mini icon on the hex dims |
| **What's on the menu** | Characters | Diegetic: the mini icons on the hex; a painted menu board with pictures |
| **Income statement** | Only the grown-up | Overlay in the grown-up workbench only. Abbie feels the rush; Evan sees she bought a new espresso machine |

No engine artifacts and nothing that masks the world: the cutaway fades walls only, there's no edge haze, and the
play HUD stays the sun dial, the hand of cards and the toy box.

## 6. The three styles

| | Elegant contemporary | Dance party | Typical 3D game |
|---|---|---|---|
| Evan's words | "something a parent would be proud for their kid to own, but Abbie themed" | "zany like a cartoonish Planet Zoo kind of game... still pink but not fairies or princesses: cool kids dance party hideout hangout spot" | "probably what you could expect from a normal 3D game these days" |
| Eiseman moods | Elegant, Romantic | Energetic, Playful | Whimsical, Tranquil |
| Palette | blush rose, dusty mauve, aubergine, warm taupe, champagne gold, ivory | hot magenta pink, electric violet, tangerine, lime, turquoise, sunshine yellow | bubblegum pink, mint, sky blue, butter yellow, coral, cream |
| Reads on the map | Quietly: glass and a mauve awning | Loudly: the roof cup and the pulsing floor | Clearly: a cosy cottage shape |
| Fits the Ranch's wood, bells and signs | Least (steel and glass) | Well, if the sign stays painted wood and the door keeps a bell | Most |
| Cost on a phone | Low geometry, but glass and soft light are hard to fake | Medium: emissives and halos are cheap; many props | Low: simple shapes, hand-painted textures |
| Kid appeal | Grown-up pride | Highest | Safe |

**Recommendation: the dance party** for the room (Evan's pick), the front and the hex, keeping two Ranch threads so
it belongs to the same world: a **painted wooden sign** with the stars and a **bell over the door**.

**Option for Evan: café by day, party by night.** The room opens in the morning as a bright, calm café (the floor
asleep, the neon off, the bar busy). As the day goes on and the party signal rises, the floor wakes, the neon comes
on and the music lifts, until it's a dance party at dusk. One building with one signal, and the daily loop shows in
the room itself.

## 7. How it would be modelled (after the pick)

Parts first (the rule in `MODELER_STATUS.md`): each part is modelled and scored on its own against its crop of the
pick, then assembled for layout and proportion against the full pick, from the same camera.

- **Parts:** room shell (walls, ceiling, window), cup DJ booth (cup, handle, window, decks, stage), dance floor,
  milkshake bar (counter, top, rail, stools, giant sundaes), beanbags (3 shapes), neon stars, disco ball, arched
  doors with bulbs, the painted sign, and the hex's mini icons (milkshake, cup, record, speaker).
- **Recipe:** Blender Python (`build.py`) per part, materials named by shading role (`neon_*` unlit and bright,
  `dance_floor_leds` shader-lit), GLB through `to_game.py`. Provenance, notes and scores in each asset folder.
- **Faking the glow:** the floor is one plane with an LED-dot shader that pulses on the beat. The neon is unlit paint
  plus an additive halo card (no bloom pass). The disco ball has faceted colour and throws a few moving sparkle spots
  on the walls. There are 3 or 4 real lights at most, coloured pink and teal.
- **Budget on Evan's iPhone:** the room under 40k triangles and 40 draw calls (merged by material through
  `render-pool.mjs`); the hex LOD under 6k triangles. 30 fps floor.
- **Proof of match:** each part and the room are shown with an interactive 3D viewer beside the pick, and a
  same-camera render beside it for the before/after.

## 8. What Evan decides

1. **The style:** dance party for everything (recommended), or a mix (for example, an elegant front with a party
   room behind it).
2. **Café by day, party by night:** yes or no.
3. **The hex picture:** which of the dance-party tile proofs to build the hex from (we make it a true hex either way).

## Palette source

Leatrice Eiseman, *Color: Messages & Meanings, A Pantone Color Resource* (Hand Books Press, Gloucester MA, 2006;
distributed by North Light Books, Cincinnati, Ohio). It is not her earlier *Pantone Guide to Communicating with
Color* (Grafix Press, 2000). The palettes take their mood families from the book. The hex values are our reading of
those moods, not the book's chip numbers, which we could not check from here. Swap in the exact Pantone chips from
Evan's copy when we fix a direction.

## Round 1 proofs (2026-10-23)

12 Midjourney grids (48 options), made on Evan's PC; none were refused. Job ids are in `provenance.json`. Two
"typical 3D game" options (outside #2, inside #2) letter "Abbie's Cafe" on the sign despite `--no text`. Midjourney's
Draft Mode was on in the account for the first try and was switched off; the draft batch was not used. Evan picked
`interior-party_0` (the cup DJ booth room) on 2026-10-23 at 05:41Z.

## Round 2 (Evan, 2026-10-23 07:05Z and 07:16Z)

- **Café by day, party by night: yes.**
- **The map hex in nano view is the whimsical bubbly café** (`tile-party_0`), made a true hex.
- **Manifest:** every item in the locked reference, the floors and the outer walls: `room-manifest.json` in this
  folder (53 entries, each with where it is, its shading-role materials and a tier: hero, support or dressing). Page:
  Studies site, `studies/cafe/manifest.html`.
- **Back bar:** designed next, locked to the reference (Midjourney `--sref` of the pick): a smoothie machine, an
  espresso maker, the coffee house counter behind the bar, and star decorations.
- **Style mock-ups before any model:** five pieces (cup DJ booth, espresso maker, smoothie machine, bar stool,
  beanbag) in three distinct styles: generic toy bricks (not LEGO), a soft vinyl toy, and charming styled low poly.
  Prompts: `tools/midjourney/prompts/coffee-shop-0013-r2.json`. Page: `studies/cafe/round2.html`.

### The café's roadmap, in Evan's order

1. Ultra-finely modelled coffee maker and espresso maker (hero props, close-up quality). Evan: "ultra fine does not
   mean high poly": fine means every real part is there and named (portafilter, group head, steam wand, drip tray,
   knobs, gauge), in clean low-count geometry with bevels and good shading, not dense meshes.
2. Two maker games (making coffee and making a smoothie or milkshake; the existing six-step recipe in
   `coffee-recipe.mjs` is the start, done with the hands on the machine).
3. A mini game for dance-party mode.
4. Decorating the café.
5. Stylus painting on the walls (Abbie asked for it).
6. An art auction game (her wall paintings sold to customers).

## 9. Play: three games, a meta and a meta-meta (Evan, 2026-10-23 07:17Z)

Evan: "do a coffee maker, juice maker, and mini game study .. 3 games, and a meta is decorating and building out the
shop however she wants and decorating it", "and meta meta - it fits into my simulation and I can run the business."

| Layer | Who plays | What it is |
|---|---|---|
| **Games** | Abbie | Three hands-on mini games: the espresso machine (a mechatronics puzzle), the smoothie machine (a timing game), the dance party (a memory game: follow my lead) |
| **Meta** | Abbie | Building out and decorating the shop however she wants (with wall painting and the art auction) |
| **Meta-meta** | Evan | The café is a business inside the town simulation, and he runs it from the grown-up workbench |

All three share one rule: **the machine is the controller.** No buttons in a drawer: you touch the real part (the
grinder, the portafilter, the steam knob, the blender jar), and the world answers with sight and sound.

### The main loop: run the shop for the day (Evan, 07:23Z)

Evan: "of course the main loop is you run the shop for the day." Everything above hangs off one day:

1. **Morning: open up.** The café is calm (day mode). Deliveries arrive from the neighbouring tiles; empty jars fill.
   Deal the day's decoration cards and place a few.
2. **The day: customers come.** They arrive from the town's schedules, with picture bubbles for what they want. An
   espresso order may need the machine fixed first (Game 1); a smoothie order is Game 2. Happy customers raise the
   party signal and add stars to the sign.
3. **Dusk: party mode.** The floor, the neon and the music wake. Dance party (Game 3) for the crowd that stays.
4. **Close: count the day.** Stars fly to the sign, a card is dealt (pick one of three), and an auction evening
   sometimes sells her paintings. Evan's business view (meta-meta) has the day's ledger.

The day runs on the game's clock and the sun dial; one signal (time, rush, party) drives light, music, people and
the room.

### Game 1: the espresso machine, a mechatronics puzzle (Evan, 07:23Z)

Evan: "the espresso game is a mechatronics puzzle". The ultra-fine machine is built from low-poly parts that work
together ("low poly parts that perfectly build the system"), and the game is getting that system to work: the
Besiege and Bricktales kind of puzzle Evan likes, sized for a child.

- **The parts are real:** water tank, pump, boiler with heating element, pressure valve, pipes and elbows, a
  three-way valve, the group head, portafilter, pressure gauge, steam wand and knob, drip tray, grinder and hopper.
- **Each puzzle is a broken or half-built machine.** Open the side panel and fix it: route the pipes from the tank
  through the pump and the boiler to the group head, set the valve, swap in the right-sized part, tighten the gasket.
- **The machine shows you why it fails, in the world:** no water (the tank's empty, the pump whirs dry), cold
  (the boiler light stays dark, the shot steams weakly), no pressure (the gauge needle sags, the shot gushes pale),
  a leak (a drip and a hiss at the bad joint). No error text.
- **When it works, you pull a shot:** grind, tamp, lock the portafilter in with a quarter-turn click, hold the
  button, and the stream turns golden while the gauge needle sits in the green. A customer is served with it.
- **Levels grow the machine:** first the water path, then heat, then pressure, then steam for milk, then two group
  heads for the rush. Later machines (a lever espresso, a moka pot, a cold-brew tower) reuse the same parts.
- **Fair for a six-year-old:** parts only snap where they fit, a wrong part wobbles and pops out, and the hint is the
  machine itself (the joint that's leaking glows softly for the player only, on the presentation layer).

The existing six steps in `coffee-recipe.mjs` (cup, coffee, milk, foam, pour, serve) become the final "pull a shot"
part, done with the parts instead of worded buttons.

### Game 2: the smoothie machine, a timing game (Evan, 07:23Z)

Evan: "smoothie is timing game". The giant bubbly smoothie machine, on the café's beat.

- **Fruit flies by on a little conveyor** (or drops from the jars on the shelf) in time with the music. Tap to drop
  each piece into the jar on the beat; a perfect drop splashes and sparkles, a late one bonks off the rim.
- **The order is in the customer's bubble** (a strawberry, a banana, milk), and the order of the drops matters:
  the layers show in the glass jar.
- **Blend on the beat:** hold for the right number of beats. Too short leaves chunks; too long and it foams over
  the top (a funny overflow, never a fail).
- **Top it in time:** cream swirl, cherry and sprinkles, each on the beat, then slide it down the bar to the
  customer (the slide is the last timing tap).
- **Ingredients come from the neighbours** (Garden berries, Ranch milk, Meadow honey, Moonbase space treats); an
  empty jar means a neighbour hasn't delivered. Speed rises in the rush and with the party signal at dusk.

### Game 3: the dance party, a memory game (Evan, 07:23Z)

Evan: "dance party is a memory game.. follow my lead". Simon-says on the light-up floor, at dusk.

- **The DJ leads:** the DJ in the cup booth (or a dancer) does a short move sequence, and the matching floor tiles
  light up with a sound each (the Music Bible's notes, so a correct sequence is a melody).
- **Follow my lead:** Abbie repeats it by tapping the tiles in order (or stepping on them with the shoulder camera).
  Each round adds one move. The crowd joins in behind her as the streak grows, and the party signal rises.
- **Take the lead:** after a good streak Abbie leads, makes up a sequence, and the customers follow it (and sometimes
  get it charmingly wrong).
- **Kind to small memories:** a miss replays the sequence slower, with no losing. Two can play: a parent leads, the
  child follows, then swap.

### The meta: building out and decorating

- **Place anything** from the manifest catalogue (beanbags, stools, stars, disco balls, rugs, plants) on the room's
  1 m human hex grid. Snap, rotate, and drop it in. A valid spot glows (presentation layer).
- **Recolour** with swatches from the café palette (figure-band only, the Townscaper rule from the aesthetic study),
  so whatever she picks still looks good.
- **Paint the walls** with the stylus: the wall becomes a canvas (a painted mural is a world thing, so customers
  look at it and react).
- **The art auction:** she paints canvases and hangs them; customers come to look, and in an auction evening they
  bid stars or coins (playful, no real money). What sells buys new decorations.
- **Decor matters to customers:** kids head for the beanbags, grown-ups for the window seats, and dancers want floor
  space. The room she builds changes who comes and what they do (the "none" mode: the world just behaves).

### Decoration cards and unlocks (Evan, 2026-10-23 07:19Z)

Evan: "some kind of card game for the decorations. and unlocks can be custom skins / paint jobs, decorations, and
reskins."

- **Decorations come as cards.** They use the same hand of cards as the rest of the game (the HUD study's T2 hand,
  and Card Forge's art at ranch.abbies.world/cards). Each card is one decoration (a beanbag, a star sign, a disco ball,
  a rug) or a **set** (a party set, a calm-morning set).
- **Playing a card is placing it.** Lift a card from the hand and drop it into the room; it becomes the thing, on the
  hex grid. **Combos**: cards of the same set placed near each other light up together (three neon stars in a row,
  or beanbags round a rug) and draw more customers, like adjacency on the board.
- **Earning cards:** served customers, dance streaks, art auction sales and a happy end of day each deal a card.
  One pick of three, as in the season loop.
- **Unlocks are looks, never power:** custom skins and paint jobs for anything in the room (the cup booth in
  chrome, the bar in candy stripes), new decorations, and reskins of the whole café (the elegant and typical-3D
  directions from round 1 become unlockable reskins of the same building). Because every model's materials are named
  by shading role, a reskin is a palette and material swap, not a new model.
- **Grown-up side:** the business view (meta-meta) can see which sets draw which customers, but money never buys
  cards.

### The meta-meta: Evan runs the business

- The café is a business in the town simulation (AW-STUDY-0006). Customers come from the town's schedules; supplies
  come from neighbouring tiles through the shared resource loop (`simulations/simulation/resource-loop.mjs`).
- **The grown-up workbench** (T4) shows what Abbie never sees: the income statement, prices, opening hours, staff,
  the menu, and what equipment costs (the $5K espresso machine example from `INFO_MANIFEST.md`). Evan sets them;
  the simulation runs; Abbie feels the result as a busier or calmer room.
- Every number the business has is volunteered in the café's information manifest with audiences `player`,
  `grown-up` and `director`, so the voice controller and AI directors read it without scraping the screen.

### Build order (after the style pick)

1. Ultra-fine espresso machine and juice machine, as working low-poly part assemblies.
2. Game 1 (espresso mechatronics puzzle), ending in the existing recipe as the shot.
3. Game 2 (smoothie timing game).
4. Game 3 (dance party memory game), using the dance floor and the Music Bible.
5. Decorating, then wall painting, then the art auction.
6. The business view in the grown-up workbench, wired to the town simulation.

**Reference models.** Evan suggested finding an STL online. Public 3D-print sites have espresso accessories (group
head caps, portafilters, tampers) but we have not found a complete, openly licensed espresso machine yet. We build the
part list from real machine anatomy (an E61-style group head, a 58 mm portafilter, a 2 L boiler body), take sizes from
open accessory models only where their licence allows, and record each source and licence in the asset's
`provenance.json`. The geometry is our own Blender recipe either way.
