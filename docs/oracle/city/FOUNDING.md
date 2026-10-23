# How the City is founded: a simulation, from first principles

Evan, 2026-10-23, on the first City study: "no it should be procedurally generated. start with topology, a founding
story, put it near 2 rivers and an ocean. and simulated. simulate its founding." And: "in this game we follow process
and we do things from first principles." So the town's plan, its story and its landmarks are not drawn or written.
They are what a simulation produces.

- Code: `prototypes/ranch-atelier/dist/simulations/city/founding.mjs` (no three.js, no DOM; runs in node, the page
  and later the game). Test: `prototypes/ranch-atelier/dist/simulations/tests/city-founding.test.mjs`.
- Page: https://claude.ai/artifact/2dV9NZvL5piemoHvRLwiKg, built by `build_founding_page.py` from
  `founding.template.html` with the module inlined, so the page runs the same code.

## The process

1. **Land.** A 3.2 km region on a 20 m grid. Height comes from fractal noise, a slope down to the sea, hills between
   two valleys, and the valleys funnelling toward one estuary. Two rivers enter from hills beyond the map (their
   catchments are given in `ASSUMPTIONS.upland`).
2. **Water.** A priority flood from the sea fills pits so every cell drains; flow follows the steepest descent; flow
   accumulation gives each cell its catchment and discharge. One pass of stream-power erosion cuts channels in
   proportion to the water they carry, then the land drains again. Width and depth follow hydraulic geometry
   (Leopold and Maddock). The reach within 600 m of the sea and under 2 m above it is brackish.
3. **The brief.** The world is accepted only if two rivers, each carrying at least a third of a cubic metre a second,
   meet between 200 m and 1.6 km above the sea. Otherwise the next seed is tried, and the page says how many tries.
4. **What the land offers.** Height above the nearest channel (for floods), slope, cover (forest, wet meadow, rock,
   shore), soil (alluvial near the rivers, poorer upland), and sheltered water (sea cells next to land where land
   blocks most of 16 rays of 1 km).
5. **Arrival.** A party of 30 comes by boat and lands on the beach behind the most sheltered water.
6. **Choosing the site.** Every place within an hour's walk is costed in daily walking per household: six water
   trips, one to the fields, firewood every other day, the boats for half the households. Walking time uses Tobler's
   hiking function on the real slopes, slower in forest, a wade at a ford. A place is rejected if it sits below the
   drift line of floods the founders can see (the largest of about twenty years), below the storm line on the beach,
   on steep ground, or without enough good soil within 600 m. The cheapest safe place wins, and the log records what
   it beat and why.
7. **Each year.** Grain from fields (yield, need and fallow from `ASSUMPTIONS`), fish from boats, food from
   neighbours once a market and roads out exist. Births and deaths follow food; newcomers follow surplus and what the
   town offers. New households build where effort is lowest, pulled toward neighbours and worn paths; once the town
   is large they build on fields beside it. Families claim fields within a 12-minute walk, clearing forest with their
   own labour; families short of land take to the boats while the sheltered water has room.
8. **Paths.** A sample of each year's real trips is routed over the land; every footstep adds wear; worn ground is
   faster to walk; wear fades if unused. Roads are where feet went (the active walker model, Helbing and others, 1997).
9. **Works, when the need is measured.** A well when the water walk passes three minutes; a bridge when people wade
   the river about 5,000 times a year, at the narrowest point near the busiest crossing; a quay when six families
   fish; a mill where the river has the most power near town (P = rho g Q h, 60% efficient); a market where the most
   paths cross; a bell tower on the highest ground near the market; a school when there are enough children. The
   population thresholds for market, bell tower and school are assumptions to replace with a specialisation model.
10. **Floods and storms.** Each year has a biggest flood and a worst storm (Gumbel distributed). One that tops what the
    town has seen floods the houses below it; those families rebuild higher, and the new line becomes the rule.
11. **The story** is the event log. Each line is filled from the run's numbers; nothing is invented.

## What world 2 did

World 2 is the page's default. In 157 years: two rivers (1.0 and 0.7 m³/s) meet 300 m above the sea. The party lands
in a cove sheltered on all sides and settles 60 m from the meeting, 2.4 m above the channel, passing over the cheaper
meadow (below the 1.7 m drift line) and the beach (below the storm line). In year 17 a 2.4 m flood takes 8 low houses
and in year 46 a 3.9 m flood takes 14; each time the families rebuild higher. Land runs short, so families take to the
boats (year 20) and build a quay (82). A bridge goes in at the narrowest point after people wade the river about
5,400 times a year (99), then a 33 kW mill (101), a market where the paths cross (107), roads worn out to three edges
by traders (110 to 119), a bell tower on the high ground (112), a school (122), and 1,005 people in 201 houses (157).

## What it does not do yet

- The town's footprint (about 70 occupied cells) still has to be fitted to the three-hex tile and dressed with the
  kit; the tile edges where roads leave the map are where neighbouring tiles connect.
- Markets, bells and schools appear at population thresholds, not from a model of specialisation and trade.
- People are households, not individuals with schedules; the study's crowd tiers take over after founding.
- Floods are river stage only; there is no levee, no silting and no change of course.
