# The City: a tile for about 1,000 people

Oracle study and proposal, 2026-10-23. Requested by Evan: "make a 'the city' tile ... population 1000 or so, start
from first principles. propose it in a study." This is a proposal, not a build. Page: https://claude.ai/artifact/LNS5ejS2UX7cVJVX2iHpKd
(source `city-study.html` in this folder). Data: `city-proposed.json` in this folder.

Fourth Oracle study after cards, HUD and aesthetic. It follows the rules in `CLAUDE.md` ("How Abbie's World shows
information"), `GAME_FEEL.md`, the aesthetic study's palette, and the scene information manifest
(`docs/design/INFO_MANIFEST.md`).

## Revision, 2026-10-23: the town is founded by simulation

Evan rejected the hand-drawn plan below: "it should be procedurally generated. start with topology, a founding story,
put it near 2 rivers and an ocean. and simulated." The plan, the street layout, the quarters and the landmarks are
now produced by the founding simulation in `FOUNDING.md` (live page https://claude.ai/artifact/2dV9NZvL5piemoHvRLwiKg).
Where this study names a high street, quarters or a clock tower, read them as things the generated town is checked
for, not things we draw. The rest of the study (crowd tiers, budget, information grammar, assets, fit) stands.

## The short version

- **The City is a market town of 1,000 people on three hexes**, not a skyline. Three Ranch-sized hexes (160 m across)
  hold about 5 hectares, which puts 1,000 people at about 200 per hectare: the density of a historic walled town.
  So the number is honest. We don't need to fake the population with a few walkers and a counter.
- **It is founded, not drawn.** The land is computed first (hills, two rivers that meet, the sea); a founding party
  picks the safe place that costs the least walking; the town grows year by year, and its paths, bridge, mill, market
  and bell tower appear where and when the simulation measures the need (`FOUNDING.md`). Lynch's paths, edges,
  districts, nodes and landmarks are the test the result must pass, not a layout.
- **Schedule is the truth; motion is a view.** Every one of the 1,000 people has a home, a job or school, and a day
  plan. Where a person is at any moment is computed from their plan, so it costs nothing to know where everyone is.
  Only the people near the camera walk as full agents. The rest are an instanced crowd, and far away the town shows
  its population as lit windows, chimney smoke and busy streets.
- **The town tells you everything through the world.** The clock tower is the chronograph. Bells mark the day.
  Windows light up as people come home. A "Help wanted" card in a shop window says a job is open. Bunting means market
  day. Numbers live only in the grown-up workbench.
- **It is the Ranch's big sister.** Same dialect family (wood, bells, painted signs), same palette, and 27 of
  the 36 rebuilt Ranch models are reused as street trees, window boxes, wells, troughs, benches and edge cottages.
- **It needs the other tiles.** Roads leave the city from each edge. A Ranch next door sends a milk cart, a Garden
  fills market stalls, a Meadow is where families picnic on Saturday, a Moonbase is the rocket you watch from the
  square. Seventy townsfolk commute out to work on those tiles.
- **Recommendation:** approve the "market town" direction and start with the riskiest part, a crowd proof:
  1,000 scheduled people on the existing three-hex city footprint, measured on Evan's iPhone, gated at 30 fps and
  1.5 ms of simulation per frame. Midjourney concept sheets run in parallel.

## What exists today

- **Futurama diorama** (`prototypes/ranch-atelier/dist/simulations/city/`). The tray already offers a city tile,
  described honestly as "configurable retro-future scenery; traffic is decorative, not a city economy". It has 30
  registered kit pieces (`RC-001`…`RC-030`, observatory, towers up to 41 m, diner, cars, airships), a one- or
  three-hex footprint (`city-footprint.mjs`), ring roads per district, palette recolouring by material name, three
  parcel couriers on the shared resource loop and 16 walking residents. Total population: 19.
- **Town life** (`town-life/`): 12 households, 12 businesses, an hour-by-hour economy (`economy.mjs`), and a people
  core (`town-life/people/core.mjs`) whose roles give each job a silhouette: a hat and a prop (cap and satchel for
  the post, helmet and tool for the fire crew).
- **Shared simulation** (`simulations/simulation/`): `resource-loop.mjs` (reserve, carry, deliver, with audited
  balances), `runtime-scheduling.mjs` (a fixed clock that never drops time), `life-story.mjs` and
  `life-fidelity.mjs` (story budgets), `ranch-people-core.mjs`.
- **Rendering**: `render-pool.mjs` merges still scenery per tile and material; `simulation-profiler.mjs` measures
  CPU with `?profile`.
- **Holodeck** (`simulations/holodeck/protocol.mjs`): one vocabulary for the stage, the Creator MCP and the voice
  (`state`, `spawn`, `time`, `people`, `weather`, `narrate`).
- **Chronograph and hand** (`chrono.mjs`, `hand-cards.mjs`): Sandbox v2's glass chronograph with pinnable
  complications from any scene's manifest, and comic hand cards for Ranch, Garden, Meadow and Moonbase.

The City builds on all of this. It replaces the Futurama tray entry once it is better, and Futurama stays as a
style variant (a retro-future dialect) that shares the plan, footprint and routing code.

## 1. First principles: what makes a place read as a city

### How big is 1,000 people?

| | Count | Notes |
| --- | --- | --- |
| People | 1,000 | |
| Households | 420 | about 2.4 people each |
| Children 0–15 | 200 | 150 at school, 50 little ones at home or nursery |
| Adults 16–64 | 620 | about 470 work, 150 care for family, study or are between jobs |
| Elders 65+ | 180 | they keep the square alive in the daytime |
| Jobs | 470 | 400 in town, 70 commuting to neighbouring tiles |
| Buildings | about 150 | 120 townhouses (most three storeys, shops below on the high street), 6 landmarks, 24 workshops and civic buildings |
| Footprint | about 5 ha | three hexes of 160 m; about 200 people per hectare |

Real places of about this size, for scale and mood (populations are approximate): Tobermory on Mull (about 1,000;
a painted harbour front, one street deep, the Townscaper look in real life), Hallstatt (about 750; houses stacked on a
slope between lake and mountain), Bibury (about 600; one stream, one row of cottages), Ogimachi in Shirakawa-go
(about 600; farmhouses as a village), and the Cinque Terre villages (a few hundred to about 1,500; colour, stairs,
and a harbour square). Every one of them is small enough that most people know each other by sight. Dunbar's number
(about 150) means a town of 1,000 is about seven overlapping circles of friends: a child can know a dozen people
well and recognise everyone else as "from town".

Historic walled towns commonly ran at 100 to 300 people per hectare. At 200 per hectare, three hexes are the honest
size. One hex would need 600 per hectare (a tower block), which is the wrong picture for Abbie's World.

### The five things a mind uses to read a city

Kevin Lynch, *The Image of the City* (1960), found that people hold a city in their head as five elements. These are
the checks a founded town must pass at tile scale (first draft below; the founding simulation produces the actual
streets, river edge, market node and bell tower):

| Lynch | The City | Why it reads at board-game hover |
| --- | --- | --- |
| **Path** | One high street that bends through all three hexes, with lanes off it | A single strong line the eye follows across the tile |
| **Edge** | A river or canal on one side, an old wall stub or hedge on the others | The town ends crisply, like a Dorfromantik tile |
| **District** | Three quarters, one per hex: Market, Mill, Hill | Each has its own roof colour family and its own sound |
| **Node** | The square, where the high street widens | Where people gather; the busiest place at noon |
| **Landmark** | The clock tower on the square | Seen from every camera angle; it tells the time |

Christopher Alexander's *A Pattern Language* (1977) adds the human scale: small public squares, activity nodes,
a promenade, a four-storey limit, main gateways, and lit windows as a sign of life. The City uses those patterns as
generator rules (see the grammar tier in section 4).

### Rhythm: a city is a schedule everyone shares

A farm has chores; a town has a clock. The day is the most "city" thing about a city:

| Time | What the town does | How you know |
| --- | --- | --- |
| 05:00 | The bakery lights its oven | One warm window and chimney smoke in the dark |
| 06:00 | First bell; the milk cart rolls in from the Ranch | A bell; a cart on the road |
| 07:30 | Everyone heads out | Streets fill; doors open |
| 08:30 | School bell | Children run to the school; the playground empties |
| 10:00 | Shops open; on market day, stalls and bunting go up | Awnings unroll; bunting |
| 12:00 | Noon bell; lunch in the square | The square is at its fullest |
| 15:00 | School's out | Children in the park and the square |
| 17:30 | Shops close; commuters come home from other tiles | Carts and walkers on the edge roads |
| Dusk | The lamplighter walks the high street | Lamps come on one by one, behind a person |
| 21:00 | Windows go dark house by house | The town falls asleep in front of you |
| Night | The night watch walks the wall | One lantern moving |

Saturday is market day. Some days are festivals (harvest, lantern night, a rocket launch from the Moonbase next door).

### What we take from the city builders Evan likes (style yes, expression never)

| Game | What we take | What we leave |
| --- | --- | --- |
| Townscaper | Stacking rules that make arches, stairs and roof gardens by themselves; colour as the player's choice; no failure | Its grid, its look, its sea |
| Tiny Glade | No visible grid; the town details itself (moss, windows, chimneys) as it grows | Its castles and painterly look |
| Dorfromantik | A tile is a stamp of meaning with clear edges; edges must make sense next to the neighbour; quests sit on the tile | Its hex art and its scoring |
| LEGO Bricktales | The whole town as a diorama you can hold; build puzzles in a real place | LEGO itself |
| 9 Kings | A kingdom built from cards; buildings grow stronger when placed next to the right neighbours | Battles and its art |

## 2. Simulation: 1,000 people in the browser

Performance is initiative 1, so the design starts from the budget and works backwards.

### Schedule is the truth, motion is a view

Each person is one row in typed arrays (about 64 bytes, so 64 KB for the town): home, workplace or school, role,
age band, schedule template, a few minutes of personal jitter, one temperament trait and three friends. Twelve
schedule templates cover everyone: early baker, shopkeeper, office, carrier, builder, carer, commuter, school child,
little one, elder, student and night watch.

Where a person is at time *t* is a closed-form lookup: their template says which place and activity, and if they
are between places, which pre-computed street route and how far along it. Routes are cached per (home, work) pair,
about 500 of them, computed once when the town is generated. So asking "where is everyone?" costs nothing per frame,
and a person who walks off-screen and back is exactly where they should be. Saves store only the seed, the clock and
what has changed (hero stories, the player's edits).

### Four tiers of people

| Tier | Who | How many | What they get | Cost |
| --- | --- | --- | --- | --- |
| **T0 Heroes** | The named townsfolk a child gets to know: baker, teacher, mayor, lamplighter, post carrier and others | 12 | Full logic all the time, life stories (`life-story.mjs`), Suzy and the holodeck can see them; rendered as T1 when near | tiny |
| **T1 Agents** | Anyone within about 35 m of the camera at close zoom, or tapped | up to 40 | The existing person model (hat and prop silhouette), real navigation, avoidance, emotes, chats, perception | about 0.6 ms CPU |
| **T2 Crowd** | People on visible streets | up to 300 | Instanced bodies (four body shapes × role hats), walk cycle in the vertex shader, positions from the closed form, interpolated | 4 to 8 draw calls, 0.3 ms CPU |
| **T3 Ledger** | All 1,000, always | 1,000 | Counted per building and street once a second: who is home, at work, at school, in the square | 0.1 ms per second |

Promotion and demotion are invisible: a T2 walker becomes a T1 agent at the same spot on the same route, and a T1
agent demotes by handing their position back to their schedule. At board-game hover, people smaller than about 6
pixels stop being drawn as bodies. The town's busy-ness then shows as moving specks on the busiest streets (one draw
call), and as lit windows and smoke.

### Jobs and goods

The 400 jobs in town, by sector (sum 400): shops and market 70, café, bakery, inn and food 55, builders and
workshops 60, offices and other 48, crafts and studios 40, public works (streets, water, lamps, parks) 30, carriers
25, clinic and care home 25, school 20, town hall, post and library 15, fire crew 12. Seventy more commute out to
the Ranch, Garden, Meadow and Moonbase tiles.

Goods use the shared resource loop exactly as the Ranch and the Futurama couriers do: reserve, carry, deliver, with
audited balances. The first three chains are bread (wheat from the Garden to the mill to the bakery), milk (Ranch to
café) and parcels (depot to homes, already working in Futurama). No crime, police chases or punishments: the PG line
from the supply-chains proposal holds, and town-life's incident cases stay out of the kid tile. The fire crew rescues
cats and the night watch lights lanterns.

### Performance budget (the City's share of a frame)

| | iPhone (30 fps floor) | Desktop (60 fps) |
| --- | --- | --- |
| Simulation CPU | 1.5 ms | 1.0 ms |
| Draw calls | 150 | 250 |
| Triangles, close zoom | 350k | 800k |
| Triangles, board hover | 120k | 250k |
| Texture memory | 48 MB | 96 MB |
| First download | 6 MB | 6 MB |
| People data | 64 KB | 64 KB |

How the buildings stay inside it: about 28 kit modules drawn as one `InstancedMesh` per module and material; still
pieces merged per quarter by `render-pool.mjs`; at board hover each quarter swaps to one low-poly shell (about 5k
triangles with baked shading); off the main board (in the hand, the overland map) the city is its card art or an
impostor. Lit windows are an instance colour, not lights: at most four real lights in the town (the square at night).

The existing Futurama router runs a full Dijkstra over every node for each trip. That is fine for 19 people and too
slow for 1,000, so routes are cached at generation time.

### The holodeck and Suzy

The holodeck's `state` reports heroes, nearby agents and the town's tallies (not 1,000 rows). `time` drives the
town's clock, `people` scales the crowd's walking speed, `weather` sends everyone under umbrellas. Suzy perceives the
world layer only: the people, bells, signs and windows, never the overlay.

## 3. Information grammar

### The City's dialect: bells, clocks, windows and banners

The Ranch speaks in wood, bells and painted signs. The City is its big sister: the same family, plus a public clock,
shop windows, chalkboards, lamps and bunting. The rule is the house one: how would a townsperson know this?

| Information | Mode | How it shows |
| --- | --- | --- |
| Time of day | Diegetic | The clock tower's face, the sun, shadows; the bells on the hour |
| Next event | Diegetic sound | The bell pattern: one bell for school, three for market, a peal for a festival |
| Busy or quiet | None / diegetic | How full the streets and the square are |
| Who is home | Diegetic | Windows light up as people arrive; chimney smoke |
| A job is open | Diegetic | A "Help wanted" card in the shop window; tap it to hire a neighbour |
| A home is free | Diegetic | Shutters closed and a "To let" board |
| Market day | Diegetic | Bunting along the high street; stalls in the square |
| Food is short | None / diegetic | Empty market stalls; a queue at the bakery |
| A delivery is coming | Diegetic | The milk cart on the road from the Ranch |
| How a person feels | Spatial | A small emote bubble over the person (the social layer), only near the camera |
| Who someone is | Spatial | Tap them: they wave and say "Hi, I'm Rosa, I bake the bread!" in a speech bubble |
| Weather coming | Diegetic + meta | Umbrellas, awnings rolled in, shutters closing; music shifts |
| Festival tension | Meta | Music lifts, a little sparkle at the screen edges; playful, never scary |
| Exact population, jobs, ledger | Overlay, grown-up | The workbench census page, away from play |

Never: floating labels over buildings, district names painted on the ground, raw ids, a population counter in the
play HUD.

### The city's information manifest (proposed)

`volunteer('city', {place: 'town', dialect: 'bells, clocks, windows and banners', items: [...]})`, with these items
(full list in `city-proposed.json`):

| id | says | who | for | prefer |
| --- | --- | --- | --- | --- |
| `time-of-day` | what time it is | characters | player, director | none, diegetic, overlay |
| `next-bell` | what the next bell is for | characters | player, director | diegetic |
| `market-day` | whether it's market day | characters | player, director | diegetic |
| `school` | whether school is in | characters | player, director | diegetic |
| `bustle` | how busy the town is | characters | player, director | none, diegetic |
| `homes-lit` | who is home | characters | player, director | diegetic |
| `help-wanted` | jobs that need someone | characters | player, director | diegetic, spatial |
| `festival` | the next festival | characters | player, director | diegetic, meta |
| `deliveries` | carts coming from other tiles | characters | player, director | diegetic |
| `mood` | how the town feels | characters | player, director | spatial, meta |
| `census` | how many people, by age and job | player | grown-up, director | overlay |
| `ledger` | the town's coins in and out | player | grown-up | overlay |

### Chronograph complications

The clock tower is the town's own chronograph, so the City's complications are the things a townsperson glances at
the tower for: **the bell** (next event), **market day** (a little awning), **school in or out** (a bell), **festival
countdown** (a lantern), and **deliveries** (a cart). The world suggests one when it matters (the festival dial shows
the day before; the cart dial when a Ranch delivery is late). The census and ledger never become complications.

## 4. Asset plan

The tiers follow the granularity rubric from the image-to-scene study: hero part-modeled, kit, grammar, impostor.

| Tier | What | Count | How |
| --- | --- | --- | --- |
| **Hero** | Town hall with clock tower, market hall, the café (the Morning Café's home), bakery, school, fountain and well | 6 | Part-modeled from concept sheets, Blender recipes, scored like the Ranch rebuild |
| **Kit** | Townhouse ground floors (door, three shopfronts, arch), upper floors (two window types, balcony, bay), roofs (gable, hip, dormer), chimney, corner, stair; awnings, sign bracket, lamp post, bollard, market stall, cart, bunting, laundry line, gate, wall, bridge | about 28 | Modular, to a 3 m storey and a 4.5 m bay; instanced |
| **Grammar** | Streets, curbs and cobbles from the street graph; Townscaper-style stacking (arches over gaps, stairs on slopes, roof gardens); window lights; bunting on market day; tree rows; house colours from the figure band | rules | No new models; generator code |
| **Impostor** | Quarter shells for board hover, crowd specks, the card art, the overland icon | 4 | Baked from the kit |
| **People** | One body in four shapes and three ages; twelve role silhouettes (hat and prop from the people core) | 1 base, 12 kits | LOD0 about 1.5k triangles, LOD1 300, LOD2 a speck |

### Reusing the 36 rebuilt Ranch models

Twenty-seven come straight across: apple tree, birch, maple, hazel, elder and the standing tree as street and park
trees; sunflower, hollyhock, marigold, coneflower, goldenrod, clover, fern and borage for window boxes and the park;
bench; water point as the town pump; water trough as the horse trough in the square; stone edging as kerbs and
planters; the horse to pull the kit's cart; chicken in back yards; feed store and hay rack at the town edge; family home
(normal and charming) as the edge-of-town cottages; potting bench, watering pot and compost bay for the allotments.
They keep their footprints (see the Ranch model scale rule) and their shading roles.

### Midjourney concept sheets

1. The establishing shot: the three-hex town on a table at board-game hover, golden hour.
2. The square at noon and at dusk, same camera (the before/after rule).
3. The townhouse kit, orthographic facades and roofs.
4. The six landmarks, turnaround sheet.
5. Twelve townsfolk by role, silhouettes first (hat and prop).
6. The dialect sheet: shop signs, chalkboards, bunting, lamps, bells.

Palette from the aesthetic study: warm paper sky, the teal roof cap as the motif, terracotta, brass reserved for
bells and things to know, cool blue shadows. If Evan's Mac is offline, use another image source and record it in the
asset's provenance.

## 5. How the City fits the other tiles

- **It is a three-hex card.** In the hand it is a "bloom" tier card (like the Moonbase): name *The City*, rules line
  "A town of a thousand neighbours", ability icons coin, heart and hammer (all three exist in the Card Forge), art
  from concept sheet 1. Dragging it shows the three-hex ghost from the existing `cityFootprint`, which already tries
  all six rotations to fit.
- **Edges are roads.** Each outer edge has a road stub. A neighbour turns a stub into a working route, and goods move
  on it through the resource loop, with a real cart you can watch.

| Neighbour | It gives the City | The City gives it |
| --- | --- | --- |
| Ranch | Milk, eggs and wool by cart at dawn | Ranch hands, a market for its goods |
| Garden | Wheat, apples and vegetables fill market stalls | Gardeners, compost from the town |
| Meadow | Honey; the place families go on Saturday | Picnickers, a footpath |
| Moonbase | The rocket launch everyone watches; a few technicians | Its staff live in town |

- **Adjacency is visible, not scored.** Each neighbouring food tile fills a row of market stalls. A city with no
  neighbours still works (the shops import), but its square looks emptier. Nobody fails.
- **One signal drives everything.** The City listens to the same time, season, weather and mood signal as the Ranch,
  so the whole board goes to dusk together and the town's lamps come on while the Ranch's windows do.

## 6. Phases and recommendation

| Phase | What | Done when |
| --- | --- | --- |
| P1 Crowd proof | Headless population, 12 schedule templates, closed-form `where(person, t)`, cached routes; 1,000 instanced people on the existing three-hex Futurama footprint | 30 fps on Evan's iPhone with 1,000 people, sim under 1.5 ms; a headless test that the census always sums to 1,000 |
| P2 Concept and kit | Midjourney sheets 1 to 6; Evan picks; kit modules as Blender recipes with provenance and scores | Kit viewer page with every module next to its concept |
| P3 Town generator | Lynch-structured plan (high street, square, three quarters, edge), kit composer with stacking rules, heroes as placeholders, day and night rhythm | The establishing shot matches concept sheet 1 from the same camera |
| P4 Information | `volunteer('city')`, clock tower, bells, windows, banners, help-wanted cards, complications | The `game-feel` check and `check_hud.py` pass |
| P5 Card and neighbours | City card in the hand, three-hex placement, edge roads, milk, bread and produce chains | A Ranch next to the City sends a cart at dawn |
| P6 Heroes and stories | Twelve named townsfolk, festivals, Suzy and holodeck integration | A child can name five townsfolk after one play session |

**Recommendation:** approve the market town, three hexes, 1,000 real people, with schedule as truth. Start P1 now,
because it is the riskiest part and it is initiative 1; run P2's concept sheets alongside it. When P3 lands, the
City replaces "Futurama · Diorama" in the tray, and Futurama lives on as a retro-future style variant.

Alternatives considered: a one-hex city (needs 600 people per hectare, which means towers, and looks like a
different game); a symbolic city (a few dozen walkers and a population number; cheaper, but the number would be a
lie and the windows would have nobody behind them); a full agent simulation of all 1,000 (beautiful in theory,
about ten times the CPU budget on a phone).
