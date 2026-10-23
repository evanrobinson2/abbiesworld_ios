# AW-STUDY-0033 - Founding City on Hexes

Evan, 2026-10-23 12:17Z: "propose a new founding location for abbies world on a new topography? I'd like to also
imagine a version of this game that is more sim city like - so the big tile could be split into smaller hexes, and
in that way you could build a zoned city? .. help me to imagine this? I want intricate (deeply) city systems. draw
inspiration from anno (roma) did game oracle finish installing that one yet?"
12:19Z: "use our voice production capabilities to do video games and voice acting for characters." 12:20Z: "think
about how to generate things to say that they say dynamically based on response to user input or world events, it
would be great to be able to ask your advisor for an update and it's gpt generated".

- Preview: https://claude.ai/artifact/BraRA3T1j4dNcKzXjHGDVw. Study page: `/studies/hexcity/` on the Ranch site.
- Code (shared kit, headless, deterministic): `prototypes/ranch-atelier/dist/simulations/hexcity/`
  - `headland.mjs`: the land and the founding choice.
  - `hexcity.mjs`: the tile split into 217 hex blocks and the town's yearly simulation.
  - `advisor.mjs`: fact sheets, the steward's offline line, townspeople's event lines, the AI prompt.
  - `api/advisor.js`: live AI lines (gpt-6-luna through the AI Gateway) and ElevenLabs voices, charged per call.
- Pages: `build_page.py` inlines the three modules into `hexcity.template.html`, so the study page and the preview run
  the same code as the game. Tests: `simulations/tests/hexcity.test.mjs`, `tests/advisor.test.cjs`.
- Anno: `docs/oracle/identity/examples/anno-117-pax-romana.json`, a full identity record (new in this study).

## Did the Oracle have Anno?

Yes, but only lightly. Anno 117: Pax Romana is in the installed list and has an Oracle profile
(`docs/oracle/games/anno-117-pax-romana.json`): core loop, information mix, Game DNA, from public knowledge with no
play session. There was no identity record and no anatomy teardown. This study adds the identity record (signatures,
the style/expression ledger, what we take). A play-session capture is still to do.

## Part one: the founding place, from process

Following the first-principles rule (the City study, PR #151): the land is made by process and the founders choose.

1. **Land.** A 3.2 km region on a 25 m grid. A limestone ridge is raised and runs out into the sea as a headland; a
   river valley lies west of it; hills to the west. Priority-flood drainage, one pass of stream-power erosion.
2. **Spring.** Rain soaks into the limestone (0.3 m a year) and runs along the base of the limestone to where it meets
   the clay. The biggest such exit is the spring. World 3 (seed 3, 14th try): 47 m above the sea, 4.5 L/s.
3. **Brief.** A world is accepted only with a spring of at least 4 L/s more than 25 m up, a river, and water sheltered
   on more than half its sides.
4. **The founders' choice.** A party of 40 lands behind the calmest water and costs every place in daily walking
   (six water trips, the fields, the boats for half the households, Tobler's hiking function on the real slopes). A
   place is turned down if it is steep, under the drift line of floods, below the storm line, too far from 24 ha of
   good soil, or out of sight of the bay. World 3: they pass over a cheaper spot below the storm line and settle the
   valley side 5 m above the sea, 2.9 m above the river, 10 minutes of walking a day; the spring is 42 m above them.

## Part two: the hex city

Today's big tile becomes a hexagon of 217 small hexes (8 rings, 20 m hexes, about 590 m across). Each is a city
block of a tenth of a hectare and samples the land under it. The countryside tiles around it are the town's fields,
groves, flocks, vines, woods, clay and fishing water. Systems, each a rule about the physical world:

| System | Rule | How it shows |
| --- | --- | --- |
| Water by gravity | Wells where water lies under 10 m (12 m³/day each). Then a channel from the spring at 3 m per km: arches over dips, tunnels through rises (no cut over 45 m), 20% leaks. Fountains only below the level it arrives at. World 3: 3.2 km, 165 arches, 700 m of tunnel, arrives at 37 m. | diegetic: fountains run or stand dry; the arches |
| Food | Grain on alluvium (900 kg/ha, a third fallow, 8 ha a household), boats on sheltered water (a household feeds 10). Field hands walk out; land past about an hour's walk is not worth working. | diegetic: farmers stream out; boats |
| Goods chains | Olives (terra rossa) to the press, flocks to the weaver, clay to the kiln, timber to the carpenter, grain to the mill (6 kW from the river) to the bakery. | diegetic: smoke, tiles, cloth |
| Four kinds of household | Settlers, townsfolk, artisans, patrons, with cumulative needs. A block with everything the next kind needs grows into it (thatch to tile). Each kind does its own work; the council holds blocks back when work would go undone. | diegetic: houses grow; walkers' colours |
| Streets | Every household walks to water, market and the fields each day; wear makes path, then gravel, then paving (once there are artisans). | none: the streets appear |
| Services | Market, fountain, bath, school, temple, theatre and fire watch reach as far as people walk (2 to 10 minutes) on real streets. Out of reach, another opens among the unreached homes. | diegetic: crowds |
| Pull | Height, sea view, gardens and temples raise it; smoke and noise lower it, worse downwind (the sea wind blows north). | none: the best houses gather upwind |
| Fire and flood | Thatch burns and spreads; a fire watch after the first fire; tiles end the risk. Gumbel floods; families rebuild higher. | diegetic: bell, smoke, river at the doors |
| Trade | With a landing and a market, ships take spare oil, wine, cloth and tiles and bring grain and cloth. | diegetic: sails |

The council builds a work only when the need is measured (the `want` tally: households ready for the next kind,
by the need they lack), and writes why into the log. World 3: a well in year 1, a press and a weaver in year 2 for
households ready to live better, boats in year 4, a market where the most feet cross in year 10, the channel in
year 22, the first patrons by year 60, about 2,000 people by year 70 to 100.

The player can zone blocks (homes, workshops, gardens, clear) at any year; the run replays from the start with the
edits, so the town answers.

## Part three: the town speaks

Evan asked for voice acting and lines generated from player input and world events.

- **The steward** answers questions. `facts(st, year)` turns one year into a fact sheet (people, kinds, food, water,
  goods, works, the channel, what holds households back, the last five events). `api/advisor.js` sends the facts and
  the child's question to gpt-6-luna with a prompt that allows only those facts, in 1 to 3 short PG sentences, then
  ElevenLabs speaks it. The child's question goes through the PG screen and the live guard first (fails closed).
  Each call is charged to the player's cap first (`PRICES.advisorCall` $0.002, the guard $0.001, voice per
  character). Offline (the preview), `stewardLine()` builds the answer from the same facts.
- **Townspeople** speak up about events near them, as bubbles on the place (spatial, the social layer): a water
  carrier at the first fountain, a baker when the oven is lit, a fisher when a ship trades. `bark()` maps each event
  to a speaker and a line; with the API on, the same call writes a fresh line from the event (`event` instead of
  `question`).
- **Voices:** five designed adult voices added to the cast (`tools/voice-cast/cast.json`, group "town"): city-steward,
  city-baker, city-fisher, city-mason, city-water. Design them with the voice-cast workflow (mode design, only those
  five), pick on the Family Cast page, save; `api/advisor.js` reads the saved ids from the cast and uses premade
  voices until then. Designed voices only, never clones.

## How it shows (the 2x2)

- Diegetic: fountains, smoke, roofs, streets, sails, crowds, the arches.
- Spatial: the townspeople's and the steward's bubbles on the place they are about.
- Meta: music fills as the town grows a kind richer (next; from the music bible).
- Overlay, summoned: the water lens (which blocks a fountain can ever reach), the zoning tint. One glass bar at the
  bottom, no words (about 4% of the stage). The grown-up view is the assumptions table and the log.

## Design card

- What the player needs to feel or know: "my town is growing, and I can see what it needs."
- How would the character know? Dry fountains, empty market stalls, a neighbour grumbling, smoke over the oven.
- Mode: diegetic first; spatial for townspeople talking; overlay only for the summoned water lens.
- Who it's for: the child (town), the grown-up (assumptions, log), the director (fact sheet).
- The whole game adapts: one state (wealth by kind, water, food) drives houses, people in the streets, smoke,
  ships and, next, the music.

## Tour

`"tour": false`. It is a study page, not a feature of the Ranch play loop yet.

## Decisions taken

- New topography: a limestone headland, so water has to be engineered (the gravity channel) and the land offers a
  real mix (alluvium, terra rossa, clay, pasture, woods, the bay). It reads as a Mediterranean town without copying
  Anno's Rome.
- Small hexes are 20 m city blocks, so one tile is a town of a few thousand. Fields are the countryside tiles around.
- The council places works by measured need; the child zones. Placing works by hand (Anno's way) is next.

## Still to do

- Dress the blocks with the kit's low-poly models; put the headland on the world map as a region.
- Design and pick the town cast's voices; render the bark lines with `cast.py lines`.
- Music per kind of household; seasons (harvests, pressing, winter storms closing the bay).
- A second culture (Anno 117's Celtic choice) deserves its own study first.
- A play session of Anno 117 to measure its HUD and loop instead of estimating.
