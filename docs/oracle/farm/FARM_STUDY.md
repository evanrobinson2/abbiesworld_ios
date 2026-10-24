# AW-STUDY-0055 The Seed Beds (farm tile) — proposal

Evan, 2026-10-23: a farm tile where cards plant seeds in seed beds and you watch them grow; thoughtful, with soul and
identity. Preview: https://app.abbies.world/r2/previews/farm-tile/index.html (source `preview/farm-tile/`).

Core idea: colour you throw, and a garden that answers. Seed packets are Cards v3 die-cuts whose rarity ladder
(Seed, Sprout, Bloom, Harvest, Sun) is the plant's own growth. Play = drag a card onto one of seven hex beds; it lands with
the Paint the World recipe (teardrop, squash, damped overshoot). Growth is derived from the one day clock. Touching
complementary colours draw bees and leave a mixed seed in the bed between (discovery of new cards). Harvest rings a bell and
yields a harvest card, café ingredients. See the preview for the rules, the information table and the assumptions table.

Open decisions for Evan: (1) a farm charm (sunflower) would be an eleventh charm; the set is ten today. (2) Pick this or the
riding school (0056) first. Tour: yes (farm), no (riding school).

## Midjourney prompts (queued; PC Chrome was not reachable from this thread yet)
1. Hi-fi low poly diorama, a single hex farm tile, seven raised wooden seed beds in a hex, painted wooden markers, a bell on a
   post, scarecrow, warm early-morning light, tilt-shift, Tiny Glade and Dorfromantik calm, flat colour, no text --ar 4:3
2. A die-cut collectible seed packet card, a raised bed standing out of the card, sunflower, flat colour, ink line, cream
   paper margin, no text --ar 5:7
3. Two flower beds side by side, yellow and blue blooms, bees carrying a tiny green seed between them, low poly, soft light --ar 4:3
Record picks and job IDs in `provenance.json` beside the study when run.

## Context used
Oracle records: Animal Crossing New Horizons, Dorfromantik, Tiny Glade, LEGO Bricktales, Unpacking; our studies 0014, 0025, 0049,
0053. Public sources: Stardew Valley design analyses (kokutech, deeprootdepths, TechRaptor ConcernedApe interview). Gap: no Oracle
record for Stardew Valley yet.

---

# AW-STUDY-0059 The Farm (explorable, inspired by Wright-Locke Farm)

Evan, 2026-10-24: "you need to make a wright-locke farm (but with more animals) for the kids to explore." Note: 0055 above
was also claimed by another thread's study; this one takes 0059.

**What it is.** A hex-sized farm in the Winchester board's open slot `slot-300-0`, north-north-west, touching Ani's side and
Abbie and Daddy's side. Module `simulations/farm/` (layout data, critters, builder), mounted from the /town template before
the townsfolk, so the farmer exists. Preview: https://app.abbies.world/r2/previews/wright-farm/index.html.
Inspired by, not a copy: a farmhouse, red barn, stand, well and bell, pasture, goat yard, pig pen, pond, orchard,
pumpkin patch, kitchen garden, hives. Real-farm animals (cows, horses, goats, sheep, pigs, hens, ducks, alpacas, rabbits)
plus more of each, a dog (bub-sized) and a cat.

**Reuse.** Barn, farmhouse, stand, well, tractor, hay, pumpkins, apple trees, sheep, dog and cat come from the models
library. Missing and built procedurally: pig, alpaca, rabbit, duck, fences and gates, pond, raised beds. Cow, horse,
goat and chicken reuse `rigLivestock`.

**Alive.** Each animal has a home, wanders inside its pen (blocked by buildings, other pens, the pond), looks up when
you or the buggy come near, and shows a heart over its head when tapped. Hens go in at night. Eggs, apples and pumpkins
glint; tap or drive near to pick up. The Moon Buggy collects pickups it drives past.

**Hooks.** Quest giver `farmer` at the farm (find three eggs; bring a pumpkin to the baker). Rewards are backpack items.
Tile card 'The Farm' flies the camera to it. The farm is a registered scene (`dio-farm`).

**Tour:** yes (a farm that answers when you tap it is a good first minute).

| Assumption | Why | Check |
|---|---|---|
| Slot 300/0 is free and sized for a hex | board slots list, agreed with the hex city thread | mounted in /town, tiles.farm present |
| Kids want to pet before they collect | Animal Crossing and Stardew record | play test with Abbie |
| Pen area = count x room x 1.5 | keeps pens roomy without empty fields | looked at the top view |
| No coins | canon: rewards are backpack items | quest rewards only items |
| Procedural pig/alpaca are acceptable stand-ins | library has none | replace if Meshy cap lifts |

Known rough edges: the kitchen-garden beds model reads as cages; animals are a little small from the whole-farm view.
